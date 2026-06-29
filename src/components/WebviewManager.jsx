import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, ShieldCheck, Loader } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';
import { STORAGE_KEYS } from '../constants/storageKeys';

export default function WebviewManager() {
  const tabs = useBrowserStore(state => state.tabs);
  const activeTabId = useBrowserStore(state => state.activeTabId);
  const updateTab = useBrowserStore(state => state.updateTab);
  const setSearchQuery = useBrowserStore(state => state.setSearchQuery);
  const setActiveTabId = useBrowserStore(state => state.setActiveTabId);
  const suspendedTabs = useBrowserStore(state => state.suspendedTabs);
  const aiApiKey = useBrowserStore(state => state.aiApiKey);
  const aiProvider = useBrowserStore(state => state.aiProvider);
  const forceDarkWebsites = useBrowserStore(state => state.forceDarkWebsites);
  const createTab = useBrowserStore(state => state.createTab);
  const markTabActive = useBrowserStore(state => state.markTabActive);
  const autoDiscardStale = useBrowserStore(state => state.autoDiscardStale);
  const splitScreenTabId = useBrowserStore(state => state.splitScreenTabId);
  const setSplitScreenTabId = useBrowserStore(state => state.setSplitScreenTabId);
  
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const isDashboard = activeTab?.url === '';

  // #18: Track tab activity and auto-discard stale tabs
  useEffect(() => {
    if (activeTabId) markTabActive(activeTabId);
  }, [activeTabId, markTabActive]);

  useEffect(() => {
    const timer = setInterval(() => autoDiscardStale(), 60000);
    return () => clearInterval(timer);
  }, [autoDiscardStale]);
  const isIncognitoMode = new URLSearchParams(window.location.search).get('incognito') === 'true';

  const webviewRefs = useRef({});
  const listenerRefs = useRef({});
  
  // Security warning state
  const [securityWarning, setSecurityWarning] = useState(null);
  // Text selection summarize state
  const [selectionSummary, setSelectionSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // AutoFill state
  const [autoFillPrompt, setAutoFillPrompt] = useState(null);
  // Loading progress bar
  const [loadingProgress, setLoadingProgress] = useState({});
  // #33: Context menu
  const [contextMenu, setContextMenu] = useState(null);
  // #24: Reader mode
  const [readerContent, setReaderContent] = useState(null);
  // Translation engine
  const [translatePrompt, setTranslatePrompt] = useState(null); // { lang, tabId }
  const [isTranslating, setIsTranslating] = useState(false);
  // #18: Tab activity tracking for auto-discard
  const tabActivityRef = useRef({});
  // P2 FIX: Use ref map for loading simulation intervals instead of DOM properties
  const loadingSimRef = useRef({});
  // Full-page interstitial state for dangerous sites
  const [blockedSite, setBlockedSite] = useState(null);

  // Check security via Google Safe Browsing API when tab URL changes
  useEffect(() => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || !tab.url || tab.url === '') {
      setSecurityWarning(null);
      return;
    }
    const url = tab.internalUrl || tab.url;

    // Skip internal/data URLs
    if (url.startsWith('data:') || url.startsWith('about:') || url.startsWith('chrome:')) {
      setSecurityWarning(null);
      return;
    }

    // Call Safe Browsing API via IPC
    if (window.electronAPI?.checkSiteSafety) {
      window.electronAPI.checkSiteSafety(url).then(result => {
        if (!result.safe) {
          setBlockedSite({
            url,
            hostname: result.hostname,
            threats: result.threats || ['UNKNOWN'],
            source: result.source || 'unknown',
          });
          setSecurityWarning({ type: 'dangerous', message: '\ud83d\udea8 ' + result.hostname + ' is flagged as dangerous' });
        } else if (result.insecure) {
          setBlockedSite(null);
          setSecurityWarning({ type: 'insecure', message: '\u26a0\ufe0f This connection is not secure. Information you submit could be viewed by others.' });
        } else {
          setBlockedSite(null);
          setSecurityWarning(null);
        }
      }).catch(() => {
        setSecurityWarning(null);
        setBlockedSite(null);
      });
    } else {
      if (url.startsWith('http://') && !url.includes('localhost')) {
        setSecurityWarning({ type: 'insecure', message: '\u26a0\ufe0f This connection is not secure.' });
      } else {
        setSecurityWarning(null);
      }
    }

    // AutoFill Engine Mock
    if (/(login|signup|checkout|payment|register|cart|otp)/i.test(url)) {
      const timer = setTimeout(() => {
          if (useBrowserStore.getState().activeTabId === tab.id) {
             setAutoFillPrompt({ type: url.includes('otp') ? 'OTP' : /(checkout|payment|cart)/i.test(url) ? 'Payment' : 'Form' });
          }
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setAutoFillPrompt(null);
    }

  }, [activeTabId, tabs]);

  // Summarize selected text using AI
  const summarizeText = async (text) => {
    if (!aiApiKey || !text || text.length < 10) return;
    setIsSummarizing(true);
    setSelectionSummary(null);
    try {
      let summary = '';
      if (aiProvider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${aiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Summarize this text in 2-3 concise sentences. Be direct and informative:\n\n"${text.substring(0, 2000)}"` }] }]
          })
        });
        const data = await res.json();
        summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not summarize.';
      } else {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiApiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a concise summarizer. Summarize in 2-3 sentences.' },
              { role: 'user', content: `Summarize this text:\n\n"${text.substring(0, 2000)}"` }
            ]
          })
        });
        const data = await res.json();
        summary = data?.choices?.[0]?.message?.content || 'Could not summarize.';
      }
      setSelectionSummary({ text: text.substring(0, 100) + (text.length > 100 ? '...' : ''), summary });
    } catch (err) {
      setSelectionSummary({ text: text.substring(0, 100), summary: 'Failed to summarize: ' + err.message });
    }
    setIsSummarizing(false);
  };

  // Listen for text selection messages from webview content scripts
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'apex-text-selected') {
        summarizeText(event.data.text);
      }
      if (event.data?.type === 'apex-foreign-lang') {
        const LANG_NAMES = { zh: 'Chinese', es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese', ko: 'Korean', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic', hi: 'Hindi', it: 'Italian', nl: 'Dutch', tr: 'Turkish', vi: 'Vietnamese', th: 'Thai', pl: 'Polish', sv: 'Swedish' };
        const langName = LANG_NAMES[event.data.lang] || event.data.lang.toUpperCase();
        setTranslatePrompt({ lang: event.data.lang, langName, tabId: useBrowserStore.getState().activeTabId });
      }
    };
    window.addEventListener('message', handler);

    // Listen for popup redirect from main process
    const recentlyOpenedUrls = new Set();
    if (window.electronAPI?.onForceUrlInTab) {
      window.electronAPI.onForceUrlInTab((url) => {
        if (!url || url === 'about:blank' || url.startsWith('data:')) return;
        
        // Rate-limit: ignore same URL opened within 2 seconds (prevents tab flooding)
        if (recentlyOpenedUrls.has(url)) return;
        recentlyOpenedUrls.add(url);
        setTimeout(() => recentlyOpenedUrls.delete(url), 2000);

        // Only open real navigation URLs, not ad network popups blocked by main process
        const store = useBrowserStore.getState();
        store.createTab(url, 'New Tab', false);
      });
    }

    return () => {
      window.removeEventListener('message', handler);
      // E1 FIX: Clean up IPC listener on unmount
      window.electronAPI?.offForceUrlInTab?.();
    };
  }, [aiApiKey, aiProvider]);

  // Clean up detached webviews
  useEffect(() => {
    const currentTabIds = tabs.map(t => t.id);
    Object.keys(webviewRefs.current).forEach(id => {
      const numId = parseInt(id, 10);
      if (!currentTabIds.includes(numId)) {
        const wv = webviewRefs.current[numId];
        const listeners = listenerRefs.current[numId];
        if (wv && listeners) {
          wv.removeEventListener('did-navigate', listeners.onNavigate);
          if (listeners.onWillNavigate) wv.removeEventListener('will-navigate', listeners.onWillNavigate);
          wv.removeEventListener('did-navigate-in-page', listeners.onNavigateInPage);
          wv.removeEventListener('page-title-updated', listeners.onPageTitleUpdated);
          wv.removeEventListener('did-fail-load', listeners.onDidFailLoad);
          wv.removeEventListener('crashed', listeners.onCrashed);
          if (listeners.onDomReady) wv.removeEventListener('dom-ready', listeners.onDomReady);
          if (listeners.onLoadStart) wv.removeEventListener('did-start-loading', listeners.onLoadStart);
          if (listeners.onLoadStop) wv.removeEventListener('did-stop-loading', listeners.onLoadStop);
        }
        // Clean up loading progress timers for closed tabs
        if (loadingSimRef.current[numId]) {
          clearInterval(loadingSimRef.current[numId]);
          delete loadingSimRef.current[numId];
        }
        if (loadingSimRef.current['hide_' + numId]) {
          clearTimeout(loadingSimRef.current['hide_' + numId]);
          delete loadingSimRef.current['hide_' + numId];
        }
        delete webviewRefs.current[numId];
        delete listenerRefs.current[numId];
      }
    });
  }, [tabs]);

  const saveToHistory = async (url, title = 'New Web Page') => {
    try {
      if (isIncognitoMode) return;
      if (!url || url === '' || url.startsWith('data:')) return;
      
      const entry = {
        url,
        title,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };

      if (window.electronAPI?.addToHistory) {
        await window.electronAPI.addToHistory(entry);
      } else {
        // Fallback to localStorage if not running in Electron
        const currentHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
        const updatedHistory = [{ id: entry.timestamp, ...entry }, ...currentHistory].slice(0, 200);
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
      }

      // Sync history to cloud (we still sync the latest, but we might just pull from local db)
      import('../services/SyncService').then(({ pushData, isSyncReady, isSyncingFromRemote }) => {
        if (isSyncReady() && !isSyncingFromRemote()) {
           if (window.electronAPI?.getHistory) {
               window.electronAPI.getHistory(200).then(res => {
                   if (res.success) pushData('history', res.history);
               });
           } else {
               const currentHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
               pushData('history', currentHistory.slice(0, 200));
           }
        }
      });
    } catch(e) { console.error('History Save Error:', e); }
  };

  const handleWebviewRef = (tabId, el) => {
    if (el && !el.dataset.listenersAttached) {
      el.dataset.listenersAttached = 'true';
      
      const onNavigate = (e) => {
        if (!e.url || e.url === 'about:blank' || e.url.startsWith('data:')) return;
        updateTab(tabId, { internalUrl: e.url });
        if (useBrowserStore.getState().activeTabId === tabId) setSearchQuery(e.url);
        try {
          saveToHistory(e.url, el.getTitle?.() || new URL(e.url).hostname);
        } catch { saveToHistory(e.url, e.url); }
      };
      // Also catch will-navigate so the URL bar updates during redirects (e.g. download links)
      const onWillNavigate = (e) => {
        if (!e.url || e.url === 'about:blank' || e.url.startsWith('data:')) return;
        updateTab(tabId, { internalUrl: e.url });
        if (useBrowserStore.getState().activeTabId === tabId) setSearchQuery(e.url);
      };
      const onNavigateInPage = (e) => { if(e.isMainFrame) onNavigate(e); };
      const onPageTitleUpdated = (e) => { updateTab(tabId, { title: e.title }); };
      const onDidFailLoad = (e) => {
        // -3 = ABORTED (normal redirect/click navigation), -105 = NAME_NOT_RESOLVED
        // Only show error page for real, unexpected failures on the main frame
        const ignoredCodes = new Set([-3, -102, -21]);
        if (!ignoredCodes.has(e.errorCode) && e.isMainFrame) {
          el.loadURL(`data:text/html;charset=utf-8,<div style="font-family:sans-serif;text-align:center;padding:50px;color:%23333;"><h2>Failed to Load</h2><p>Error: ${e.errorCode} - ${e.errorDescription}</p><button onclick="history.back()" style="margin-top:12px;padding:8px 20px;cursor:pointer">Go Back</button></div>`);
        }
      };
      const onCrashed = () => {
        // Auto-reload on crash instead of showing error page
        console.warn('[Apex] Tab crashed, auto-reloading:', tabId);
        try {
          const currentUrl = el.getURL && el.getURL();
          if (currentUrl && currentUrl !== 'about:blank' && !currentUrl.startsWith('data:')) {
            setTimeout(() => {
              try { el.loadURL(currentUrl); } catch(e) {
                el.loadURL(`data:text/html;charset=utf-8,<div style="font-family:sans-serif;text-align:center;padding:50px;color:%23333;"><h2>Tab Crashed</h2><p>Click reload to try again.</p></div>`);
              }
            }, 500);
          } else {
            el.loadURL(`data:text/html;charset=utf-8,<div style="font-family:sans-serif;text-align:center;padding:50px;color:%23333;"><h2>Tab Crashed</h2><p>Click reload to try again.</p></div>`);
          }
        } catch(e) {
          el.loadURL(`data:text/html;charset=utf-8,<div style="font-family:sans-serif;text-align:center;padding:50px;color:%23333;"><h2>Tab Crashed</h2><p>Click reload to try again.</p></div>`);
        }
      };

      // Inject text selection listener + dark mode + context menu bridge
      const onDomReady = () => {
        // === APEX AD BLOCKER CONTENT SCRIPT ===
        // Monkey-patch window.open, remove overlays, inject cosmetic CSS
        el.executeJavaScript(`
          (function() {
            if (window.__apexAdBlockInjected) return;
            window.__apexAdBlockInjected = true;

            // 1. MONKEY-PATCH window.open — return a fake window so page JS doesn't break
            //    This is critical for HubCloud/HDHub4u "Generate Link" buttons that
            //    call window.open(adURL) first, then generate the link only if it succeeds.
            var _origOpen = window.open;
            window.open = function(url, target, features) {
              // Allow same-origin popups (actual site functionality)
              try {
                if (url && new URL(url, location.href).hostname === location.hostname) {
                  return _origOpen.apply(window, arguments);
                }
              } catch(e) {}
              // Block everything else — return a fake window object
              console.log('[Apex AdBlock] Blocked popup: ' + (url || 'about:blank'));
              var fakeWin = {
                closed: false, close: function() { this.closed = true; },
                focus: function() {}, blur: function() {},
                location: { href: url || '', assign: function(){}, replace: function(){} },
                document: { write: function(){}, writeln: function(){}, close: function(){}, body: {} },
                postMessage: function() {},
                opener: window,
                name: target || ''
              };
              // Auto-close after 100ms so scripts checking .closed see it
              setTimeout(function() { fakeWin.closed = true; }, 100);
              return fakeWin;
            };

            // 2. COSMETIC CSS — hide only confirmed ad elements (conservative to avoid hiding download buttons)
            var style = document.createElement('style');
            style.id = '__apex_adblock_css';
            style.textContent = [
              // Hide Google Ads (these are always ads, never legitimate content)
              'ins.adsbygoogle, .adsbygoogle { display: none !important; height: 0 !important; }',
              // Hide known popup/popunder containers
              '[class*="popunder"], [class*="popup-ad"], [class*="pop-up-ad"] { display: none !important; }',
              // Hide floating/sticky ad elements (specific patterns only)
              '[class*="float-ad"], [id*="float-ad"], [class*="sticky-ad"], [id*="sticky-ad"] { display: none !important; }',
            ].join('\\n');
            document.head.appendChild(style);

            // 3. REMOVE AD OVERLAYS — only remove truly invisible click-jacking layers
            function removeOverlays() {
              document.querySelectorAll('div, ins').forEach(function(el) {
                try {
                  var s = window.getComputedStyle(el);
                  var z = parseInt(s.zIndex) || 0;
                  // Only remove overlays that are: high z-index, fixed/absolute, AND nearly invisible (opacity < 0.05)
                  // This is very conservative to avoid removing legitimate site elements
                  if (z > 99999 && s.position === 'fixed' && parseFloat(s.opacity) < 0.05) {
                    el.remove();
                  }
                } catch(e) {}
              });
            }
            removeOverlays();
            setTimeout(removeOverlays, 2000);
            setTimeout(removeOverlays, 5000);

            // 4. MUTATION OBSERVER — catch dynamically injected ads
            new MutationObserver(function(mutations) {
              for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                  var node = added[j];
                  if (node.nodeType !== 1) continue;
                  // Block ad scripts
                  if (node.tagName === 'SCRIPT' && node.src) {
                    var src = node.src.toLowerCase();
                    var adKeywords = ['popads','adsterra','propeller','exoclick','juicyads','adcash','admaven','clickadu','hilltopads','popunder','popcash','trafficjunky','onclkds','onclickads','syndication','bidvertiser','tiranagam','monetizer','yllix','adbull','adcolony','revcontent','mgid','taboola','outbrain','adform','smartadserver','adnxs','doubleclick','googlesyndication','googleadservices','opera-api','operacdn','opassets','linkvertise','ouo.io','shrinkme','bc.vc'];
                    if (adKeywords.some(function(k) { return src.includes(k); })) {
                      node.remove();
                      continue;
                    }
                  }
                  // Block ad iframes — only from known ad networks
                  if (node.tagName === 'IFRAME') {
                    var iSrc = (node.src || '').toLowerCase();
                    var adDomains = ['popads','adsterra','propeller','exoclick','juicyads','adcash','admaven','clickadu','hilltopads','doubleclick','googlesyndication','googleadservices'];
                    if (adDomains.some(function(d) { return iSrc.includes(d); })) {
                      node.remove();
                      continue;
                    }
                  }
                }
              }
              // Re-run overlay removal
              setTimeout(removeOverlays, 200);
            }).observe(document.documentElement, { childList: true, subtree: true });

            // 5. NEUTRALIZE document-level click hijackers
            // Some ad scripts add onclick to document.body to open popups on any click
            document.addEventListener('click', function(e) {
              // Don't interfere with actual links/buttons
              if (e.target.closest('a[href]') || e.target.closest('button') || e.target.closest('input')) return;
              // If clicking on body/document fires window.open via propagation, it's already caught by our patch above
            }, true);
          })();
        `).catch(() => {});

        // Text selection handler
        el.executeJavaScript(`
          (function() {
            if (window.__apexSelectionHandler) return;
            window.__apexSelectionHandler = true;
            let timeout;
            document.addEventListener('mouseup', function() {
              clearTimeout(timeout);
              timeout = setTimeout(function() {
                var sel = window.getSelection();
                var text = sel ? sel.toString().trim() : '';
                if (text.length > 20) {
                  window.postMessage({ type: 'apex-text-selected', text: text }, '*');
                }
              }, 300);
            });
          })();
        `).catch(() => {});

        // === FINGERPRINT PROTECTION ===
        // Randomize canvas, WebGL, and AudioContext fingerprints (like Brave Shields)
        el.executeJavaScript(`
          (function() {
            if (window.__apexFingerprintProtection) return;
            window.__apexFingerprintProtection = true;

            // 1. Canvas fingerprint noise — add subtle random pixel noise
            var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
              try {
                var ctx = this.getContext('2d');
                if (ctx && this.width > 0 && this.height > 0) {
                  var w = Math.min(this.width, 16), h = Math.min(this.height, 16);
                  var img = ctx.getImageData(0, 0, w, h);
                  for (var i = 0; i < img.data.length; i += 4) {
                    img.data[i] ^= (Math.random() * 2) | 0;
                    img.data[i+1] ^= (Math.random() * 2) | 0;
                  }
                  ctx.putImageData(img, 0, 0);
                }
              } catch(e) {}
              return origToDataURL.apply(this, arguments);
            };

            var origToBlob = HTMLCanvasElement.prototype.toBlob;
            HTMLCanvasElement.prototype.toBlob = function(cb, type, quality) {
              try {
                var ctx = this.getContext('2d');
                if (ctx && this.width > 0 && this.height > 0) {
                  var w = Math.min(this.width, 16), h = Math.min(this.height, 16);
                  var img = ctx.getImageData(0, 0, w, h);
                  for (var i = 0; i < img.data.length; i += 4) {
                    img.data[i] ^= (Math.random() * 2) | 0;
                  }
                  ctx.putImageData(img, 0, 0);
                }
              } catch(e) {}
              return origToBlob.apply(this, arguments);
            };

            // 2. WebGL fingerprint noise — spoof renderer/vendor strings
            var getParam = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(p) {
              if (p === 37446) return 'ANGLE (Intel, Mesa Intel(R) UHD Graphics, OpenGL 4.6)';
              if (p === 37445) return 'Google Inc. (Intel)';
              return getParam.apply(this, arguments);
            };
            if (typeof WebGL2RenderingContext !== 'undefined') {
              var getParam2 = WebGL2RenderingContext.prototype.getParameter;
              WebGL2RenderingContext.prototype.getParameter = function(p) {
                if (p === 37446) return 'ANGLE (Intel, Mesa Intel(R) UHD Graphics, OpenGL 4.6)';
                if (p === 37445) return 'Google Inc. (Intel)';
                return getParam2.apply(this, arguments);
              };
            }

            // 3. AudioContext fingerprint noise
            if (typeof AnalyserNode !== 'undefined') {
              var origGetFloat = AnalyserNode.prototype.getFloatFrequencyData;
              AnalyserNode.prototype.getFloatFrequencyData = function(arr) {
                origGetFloat.call(this, arr);
                for (var i = 0; i < arr.length; i++) arr[i] += (Math.random() - 0.5) * 0.0001;
              };
            }

            // 4. Navigator property noise
            try {
              Object.defineProperty(navigator, 'hardwareConcurrency', { get: function() { return 4; } });
              Object.defineProperty(navigator, 'deviceMemory', { get: function() { return 8; } });
            } catch(e) {}
          })();
        `).catch(() => {});

        // #39: Force dark mode on websites
        if (useBrowserStore.getState().forceDarkWebsites) {
          el.executeJavaScript(`
            (function() {
              if (document.getElementById('__apex_dark_css')) return;
              var s = document.createElement('style');
              s.id = '__apex_dark_css';
              s.textContent = 'html{filter:invert(0.88) hue-rotate(180deg)!important}img,video,canvas,svg image,[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important}';
              document.head.appendChild(s);
            })();
          `).catch(() => {});
        }

        // === TRANSLATION ENGINE: Detect foreign language pages ===
        el.executeJavaScript(`
          (function() {
            var lang = document.documentElement.lang || document.querySelector('meta[http-equiv="content-language"]')?.content || '';
            lang = lang.split('-')[0].toLowerCase();
            if (lang && lang !== 'en' && lang.length === 2) {
              window.postMessage({ type: 'apex-foreign-lang', lang: lang }, '*');
            }
          })();
        `).catch(() => {});
      };

      // Loading progress (#35) - P2 FIX: Use ref map instead of DOM property
      const onLoadStart = () => {
        setLoadingProgress(prev => ({ ...prev, [tabId]: 0 }));
        let p = 0;
        if (loadingSimRef.current[tabId]) clearInterval(loadingSimRef.current[tabId]);
        const sim = setInterval(() => {
          p = Math.min(p + (90 - p) * 0.15 + Math.random() * 8, 90);
          setLoadingProgress(prev => ({ ...prev, [tabId]: p }));
        }, 500);
        loadingSimRef.current[tabId] = sim;
      };
      const onLoadStop = () => {
        if (loadingSimRef.current[tabId]) {
          clearInterval(loadingSimRef.current[tabId]);
          delete loadingSimRef.current[tabId];
        }
        setLoadingProgress(prev => ({ ...prev, [tabId]: 100 }));
        // Track this timeout so it can be cleaned up if the tab is closed
        const hideTimeout = setTimeout(() => setLoadingProgress(prev => ({ ...prev, [tabId]: 0 })), 400);
        loadingSimRef.current['hide_' + tabId] = hideTimeout;
      };

      el.addEventListener('did-navigate', onNavigate);
      el.addEventListener('will-navigate', onWillNavigate);
      el.addEventListener('did-navigate-in-page', onNavigateInPage);
      el.addEventListener('page-title-updated', onPageTitleUpdated);
      el.addEventListener('did-fail-load', onDidFailLoad);
      el.addEventListener('crashed', onCrashed);
      el.addEventListener('dom-ready', onDomReady);
      el.addEventListener('did-start-loading', onLoadStart);
      el.addEventListener('did-stop-loading', onLoadStop);

      listenerRefs.current[tabId] = { onNavigate, onWillNavigate, onNavigateInPage, onPageTitleUpdated, onDidFailLoad, onCrashed, onDomReady, onLoadStart, onLoadStop };
    }
    if (el) webviewRefs.current[tabId] = el;
  };

  // Expose global methods for controls
  useEffect(() => {
    window.apexBrowserControls = {
      goBack: () => { const wv = webviewRefs.current[activeTabId]; if (wv?.goBack) wv.goBack(); },
      goForward: () => { const wv = webviewRefs.current[activeTabId]; if (wv?.goForward) wv.goForward(); },
      reload: () => { if (isDashboard) return; const wv = webviewRefs.current[activeTabId]; if (wv?.reload) wv.reload(); },
      zoom: (direction) => {
        const wv = webviewRefs.current[activeTabId];
        if (!wv) return;
        if (direction === 'reset') { wv.setZoomLevel(0); return; }
        const result = wv.getZoomLevel();
        if (result && typeof result.then === 'function') {
          result.then(level => wv.setZoomLevel(direction === 'in' ? level + 0.5 : level - 0.5));
        } else if (typeof result === 'number') {
          wv.setZoomLevel(direction === 'in' ? result + 0.5 : result - 0.5);
        } else {
          wv.getZoomLevel((level) => wv.setZoomLevel(direction === 'in' ? level + 0.5 : level - 0.5));
        }
      },
      print: () => { const wv = webviewRefs.current[activeTabId]; if (wv?.print) wv.print(); else window.print(); },
      findInPage: (text) => { const wv = webviewRefs.current[activeTabId]; if (wv && text) wv.findInPage(text); },
      stopFindInPage: () => { const wv = webviewRefs.current[activeTabId]; if (wv) wv.stopFindInPage('clearSelection'); },
      captureScreen: async () => {
        const wv = webviewRefs.current[activeTabId];
        if (!wv || typeof wv.capturePage !== 'function') return null;
        try {
          const img = await wv.capturePage();
          if (img && typeof img.resize === 'function') {
             const size = img.getSize();
             if (size.width > 800) {
                 return img.resize({ width: 800 }).toDataURL();
             }
          }
          return img.toDataURL();
        } catch (e) { return null; }
      },
      extractText: async () => {
        const wv = webviewRefs.current[activeTabId];
        if (!wv) return '';
        try {
          return await Promise.race([
            wv.executeJavaScript(`document.body.innerText.substring(0, 15000)`),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
        } catch (e) { return ''; }
      },
      executeJS: async (code) => {
        const wv = webviewRefs.current[activeTabId];
        if (!wv) return;
        try { return await wv.executeJavaScript(code); } catch (e) { console.error("Agent Execution Error:", e); throw e; }
      },
      // #22: DevTools access via F12
      openDevTools: () => {
        const wv = webviewRefs.current[activeTabId];
        if (wv && wv.isDevToolsOpened) {
          if (wv.isDevToolsOpened()) wv.closeDevTools();
          else wv.openDevTools();
        }
      },
      // #24: Reader Mode — extract and display clean article content
      toggleReaderMode: async () => {
        if (readerContent) { setReaderContent(null); return; }
        const wv = webviewRefs.current[activeTabId];
        if (!wv) return;
        try {
          const data = await wv.executeJavaScript(`
            (function() {
              var article = document.querySelector('article') || document.querySelector('[role=main]') || document.querySelector('main') || document.body;
              var title = document.querySelector('h1')?.innerText || document.title;
              var content = article.innerText.substring(0, 30000);
              var siteName = document.querySelector('meta[property="og:site_name"]')?.content || window.location.hostname;
              return JSON.stringify({ title: title, content: content, site: siteName, url: window.location.href });
            })();
          `);
          const parsed = JSON.parse(data);
          setReaderContent(parsed);
        } catch(e) { console.error('Reader mode error:', e); }
      },
      // #25: Picture-in-Picture — find first video and toggle PiP
      togglePiP: async () => {
        const wv = webviewRefs.current[activeTabId];
        if (!wv) return;
        try {
          await wv.executeJavaScript(`
            (function() {
              var video = document.querySelector('video');
              if (!video) { console.log('[Apex] No video found on this page.'); return; }
              if (document.pictureInPictureElement) {
                document.exitPictureInPicture();
              } else {
                video.requestPictureInPicture();
              }
            })();
          `);
        } catch(e) { console.error('PiP error:', e); }
      }
    };
  }, [activeTabId, isDashboard, readerContent]);

  return (
    <>
      {/* Loading Progress Bar (#35) */}
      {!isDashboard && (() => {
        const prog = loadingProgress[activeTabId] || 0;
        if (prog <= 0) return null;
        return (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px', zIndex: 200, background: 'rgba(0,0,0,0.1)',
          }}>
            <div style={{
              height: '100%', width: `${prog}%`,
              background: 'linear-gradient(90deg, #00d4ff, #bf00ff)',
              borderRadius: '0 2px 2px 0',
              transition: prog >= 100 ? 'width 0.2s, opacity 0.3s' : 'width 0.3s',
              opacity: prog >= 100 ? 0 : 1
            }} />
          </div>
        );
      })()}
      {/* #24: Reader Mode Overlay */}
      {readerContent && !isDashboard && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 150,
          background: 'rgba(15,15,20,0.97)', backdropFilter: 'blur(20px)',
          overflowY: 'auto', display: 'flex', justifyContent: 'center',
        }}>
          <div style={{ maxWidth: 700, width: '100%', padding: '60px 40px', color: '#e0e0e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 }}>
                📖 Reader Mode • {readerContent.site}
              </div>
              <button onClick={() => setReaderContent(null)} style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
                fontSize: 12, fontWeight: 600
              }}>✕ Close Reader</button>
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 24 }}>
              {readerContent.title}
            </h1>
            <div style={{
              fontSize: 18, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)',
              fontFamily: 'Georgia, "Times New Roman", serif',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {readerContent.content}
            </div>
          </div>
        </div>
      )}

      {/* FULL-PAGE INTERSTITIAL for dangerous sites */}
      {blockedSite && !isDashboard && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: 'linear-gradient(180deg, #c62828 0%, #b71c1c 30%, #1a1a2e 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#fff', padding: '40px', textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 32, border: '3px solid rgba(255,255,255,0.25)',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
            Dangerous site ahead
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', maxWidth: 520, lineHeight: 1.7, margin: '0 0 8px 0' }}>
            Attackers on <strong style={{ color: '#fff' }}>{blockedSite.hostname}</strong> may
            trick you into doing something dangerous like installing software or revealing your
            personal information (passwords, phone numbers, or credit cards).
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0 32px' }}>
            {blockedSite.threats.map((t, i) => (
              <span key={i} style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: 1,
              }}>
                {t.replace(/_/g, ' ')}
              </span>
            ))}
            {blockedSite.source === 'google-safe-browsing' && (
              <span style={{
                background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)',
                padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: '#8ab4f8',
              }}>
                Verified by Google Safe Browsing
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button onClick={() => {
              window.apexBrowserControls?.goBack?.();
              setBlockedSite(null);
              setSecurityWarning(null);
            }} style={{
              background: '#fff', color: '#c62828', border: 'none',
              padding: '14px 36px', borderRadius: 8, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
              Go back to safety
            </button>
            <button onClick={() => {
              setBlockedSite(null);
              setSecurityWarning({ type: 'dangerous', message: 'You chose to proceed to a dangerous site' });
            }} style={{
              background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.2)',
              padding: '12px 24px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              Proceed anyway (unsafe)
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 40, maxWidth: 400 }}>
            This warning is provided by Apex Shields using Google Safe Browsing.
          </p>
        </div>
      )}

      {/* Insecure connection banner (non-blocking, dismissible) */}
      {securityWarning && !blockedSite && !isDashboard && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '8px 16px',
          background: securityWarning.type === 'dangerous' ? 'rgba(255, 59, 48, 0.92)' : 'rgba(255, 149, 0, 0.92)',
          color: '#fff', fontSize: '13px', fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 100, backdropFilter: 'blur(10px)',
        }}>
          <span>{securityWarning.message}</span>
          <button onClick={() => setSecurityWarning(null)} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
          }}>Dismiss</button>
        </div>
      )}

      {/* Translation Prompt Banner */}
      {translatePrompt && !isDashboard && (
        <div style={{
          position: 'absolute', top: securityWarning ? 40 : 0, left: 0, right: 0,
          padding: '8px 16px',
          background: 'rgba(66, 133, 244, 0.92)',
          color: '#fff', fontSize: '13px', fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 99, backdropFilter: 'blur(10px)',
        }}>
          <span>🌐 This page appears to be in <strong>{translatePrompt.langName}</strong>. Translate to English?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={isTranslating}
              onClick={async () => {
                setIsTranslating(true);
                try {
                  const wv = webviewRefs.current[translatePrompt.tabId];
                  if (!wv) return;
                  // Extract visible text from the page
                  const pageText = await wv.executeJavaScript(`
                    (function() {
                      var els = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, a, label, button');
                      var texts = [];
                      els.forEach(function(el) {
                        var t = el.innerText?.trim();
                        if (t && t.length > 2 && t.length < 500) texts.push({ tag: el.tagName, text: t, idx: texts.length });
                      });
                      return JSON.stringify(texts.slice(0, 80));
                    })();
                  `);
                  const items = JSON.parse(pageText);
                  if (items.length === 0) { setTranslatePrompt(null); return; }

                  // Use AI to translate
                  const batch = items.map(i => i.text).join('\n---\n');
                  const prompt = `Translate each text block below from ${translatePrompt.langName} to English. Keep the same number of blocks separated by ---. Only output translations, no explanations.\n\n${batch}`;

                  let translated = '';
                  const key = aiApiKey;
                  if (aiProvider === 'gemini' && key) {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });
                    const data = await res.json();
                    translated = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  } else if (key) {
                    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] })
                    });
                    const data = await res.json();
                    translated = data?.choices?.[0]?.message?.content || '';
                  }

                  if (translated) {
                    const translatedBlocks = translated.split(/\n-{2,}\n/);
                    // Inject translations back into page
                    const script = items.map((item, i) => {
                      const newText = (translatedBlocks[i] || item.text).replace(/'/g, "\\'").replace(/\n/g, ' ');
                      return `
                        (function() {
                          var els = document.querySelectorAll('${item.tag.toLowerCase()}');
                          for (var e of els) {
                            if (e.innerText && e.innerText.trim().substring(0, 30) === '${item.text.substring(0, 30).replace(/'/g, "\\'")}') {
                              e.innerText = '${newText}';
                              break;
                            }
                          }
                        })();
                      `;
                    }).join('');
                    await wv.executeJavaScript(script);
                  }
                } catch (err) {
                  console.error('[Translation]', err);
                } finally {
                  setIsTranslating(false);
                  setTranslatePrompt(null);
                }
              }}
              style={{
                background: '#fff', color: '#1a73e8', border: 'none',
                padding: '4px 16px', borderRadius: '4px', cursor: isTranslating ? 'wait' : 'pointer',
                fontSize: '12px', fontWeight: 600, opacity: isTranslating ? 0.7 : 1,
              }}
            >
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>
            <button onClick={() => setTranslatePrompt(null)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
            }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* AI AutoFill Prompt Overflow */}
      {autoFillPrompt && !isDashboard && (
         <div className="autofill-popup" style={{
              position: 'absolute', top: 60, right: 30, width: 320,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(30px)',
              border: '1px solid rgba(0, 255, 204, 0.3)', borderRadius: '24px',
              padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
              zIndex: 1000, animation: 'store-nav-slide 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex', flexDirection: 'column', gap: '16px'
         }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(0, 255, 204, 0.1)', padding: '12px', borderRadius: '50%', color: '#00ffcc' }}>
                   <Sparkles size={20} />
                </div>
                <div>
                   <h4 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>Apex AI AutoFill</h4>
                   <span style={{ fontSize: '12px', color: '#00ffcc' }}>{autoFillPrompt.type} Detected</span>
                </div>
            </div>
            
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                We found a {autoFillPrompt.type.toLowerCase()} field. Would you like Apex AI to securely fill in your default details?
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setAutoFillPrompt(null)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}>Dismiss</button>
                <button onClick={() => {
                      const wv = webviewRefs.current[activeTabId];
                      if (wv) {
                        const tabUrl = tabs.find(t => t.id === activeTabId)?.url || 'http://localhost';
                        const currentDomain = tabUrl.startsWith('http') ? new URL(tabUrl).hostname : tabUrl;
                        const matchingPwd = useBrowserStore.getState().savedPasswords.find(p => currentDomain.includes(p.domain));
                        const email = matchingPwd ? matchingPwd.username : 'user@example.com';
                        const pwd = matchingPwd ? matchingPwd.password : '••••••••';

                        wv.executeJavaScript(`
                          (function() {
                            const inputs = document.querySelectorAll('input[type=email], input[type=text][name*=email], input[type=text][name*=user]');
                            inputs.forEach(i => { if(!i.value) i.value = ${JSON.stringify(email)}; i.dispatchEvent(new Event('input', {bubbles:true})); });
                            const pwds = document.querySelectorAll('input[type=password]');
                            pwds.forEach(i => { if(!i.value) i.value = ${JSON.stringify(pwd)}; i.dispatchEvent(new Event('input', {bubbles:true})); });
                            return 'Filled ' + inputs.length + ' text + ' + pwds.length + ' password fields';
                          })();
                        `).then(r => console.log('AutoFill result:', r)).catch(() => {});
                      }
                      setAutoFillPrompt(null);
                }} style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg, #00ffcc, #00d2ff)', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: '0.2s', boxShadow: '0 8px 16px rgba(0,255,204,0.3)' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}><ShieldCheck size={16} /> Fill Now</button>
            </div>
         </div>
      )}

      {/* Text Selection AI Summary Popup (Liquid Glass) */}
      {(selectionSummary || isSummarizing) && !isDashboard && (
        <div style={{
          position: 'absolute', bottom: 20, right: 20, width: 340, maxHeight: 300,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 50%, transparent 100%), rgba(255,255,255,0.08)',
          backdropFilter: 'blur(32px) saturate(200%) brightness(1.15)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(1.15)',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 18, padding: 16, zIndex: 200,
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25), 0 20px 60px rgba(0,0,0,0.3)',
          color: '#fff', animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#00d4ff' }}>\u2728 AI Summary</span>
            <button onClick={() => { setSelectionSummary(null); setIsSummarizing(false); }} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, padding: 0
            }}>\u2715</button>
          </div>
          {isSummarizing ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 12 }}>
              \u23f3 Summarizing selected text...
            </div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.9)' }}>
              {selectionSummary?.summary}
            </div>
          )}
        </div>
      )}

      {/* Click-away to close context menu — MUST be rendered BEFORE context menu so menu is on top */}
      {contextMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 100001 }} onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />}

      {/* #33: Context Menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y,
          background: 'rgba(25,25,30,0.96)', backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
          padding: '6px 0', minWidth: 200, zIndex: 100002,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.06)',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          {contextMenu.hasSelection && (
            <>
              <div className="ctx-item" onClick={() => { navigator.clipboard.writeText(contextMenu.selectedText); setContextMenu(null); }}
                style={ctxStyle}>📋 Copy</div>
              <div className="ctx-item" onClick={() => { summarizeText(contextMenu.selectedText); setContextMenu(null); }}
                style={ctxStyle}>✨ AI Summarize</div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 8px' }} />
            </>
          )}
          <div className="ctx-item" onClick={() => { window.apexBrowserControls?.goBack(); setContextMenu(null); }}
            style={ctxStyle}>◀ Back</div>
          <div className="ctx-item" onClick={() => { window.apexBrowserControls?.goForward(); setContextMenu(null); }}
            style={ctxStyle}>▶ Forward</div>
          <div className="ctx-item" onClick={() => { window.apexBrowserControls?.reload(); setContextMenu(null); }}
            style={ctxStyle}>🔄 Reload</div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 8px' }} />
          {contextMenu.linkUrl && (
            <div className="ctx-item" onClick={() => { createTab(contextMenu.linkUrl, contextMenu.linkUrl); setContextMenu(null); }}
              style={ctxStyle}>🔗 Open Link in New Tab</div>
          )}
          {contextMenu.imgSrc && (
            <div className="ctx-item" onClick={() => {
              const a = document.createElement('a'); a.href = contextMenu.imgSrc; a.download = ''; a.click();
              setContextMenu(null);
            }} style={ctxStyle}>💾 Save Image</div>
          )}
          <div className="ctx-item" onClick={() => {
            const url = activeTab?.internalUrl || activeTab?.url;
            if (url) navigator.clipboard.writeText(url);
            setContextMenu(null);
          }} style={ctxStyle}>🔗 Copy Page URL</div>
          <div className="ctx-item" onClick={() => { 
                window.apexBrowserControls?.executeJS?.(`
                    if (!document.getElementById('google-translate-script')) {
                        var s = document.createElement('script');
                        s.id = 'google-translate-script';
                        s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
                        document.body.appendChild(s);
                        var d = document.createElement('div');
                        d.id = 'google_translate_element';
                        d.style.position = 'fixed'; d.style.top = '0'; d.style.right = '0'; d.style.zIndex='999999';
                        document.body.prepend(d);
                        window.googleTranslateElementInit = function() {
                            new google.translate.TranslateElement({pageLanguage: 'auto'}, 'google_translate_element');
                        };
                    }
                `);
                setContextMenu(null); 
          }} style={ctxStyle}>🌐 Translate Page</div>
          <div className="ctx-item" onClick={() => { window.apexBrowserControls?.openDevTools?.(); setContextMenu(null); }}
            style={ctxStyle}>🔧 Inspect Element</div>
        </div>
      )}

      {/* #28 Split Screen Banner */}
      {splitScreenTabId && (
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 150, background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '4px 12px', borderRadius: '0 0 8px 8px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,0.2)', borderTop: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
           <span style={{color: '#00ffcc', display: 'flex', alignItems: 'center', gap: 6}}>Split View Active</span>
           <button onClick={() => setSplitScreenTabId(null)} style={{ background: 'rgba(255,100,100,0.2)', border: 'none', color: '#ff4757', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>✕ Exit</button>
        </div>
      )}

      <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: splitScreenTabId ? 'row' : 'column' }}>
      {tabs.map((tab) => {
        if (tab.url === '') return null;
        
        const isActive = !isDashboard && activeTabId === tab.id;
        const isSplit = !isDashboard && splitScreenTabId === tab.id;
        const isVisible = isActive || isSplit;
        const isSuspended = suspendedTabs.includes(tab.id);

        return (
          <div key={tab.id} className="webview-container" style={{
            display: isVisible ? 'flex' : 'none', flex: 1, width: splitScreenTabId ? '50%' : '100%', height: '100%',
            overflow: 'hidden', background: '#fff', position: 'relative',
            borderRight: (isActive && splitScreenTabId && tab.id === activeTabId) ? '2px solid #000' : 'none'
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            const wv = webviewRefs.current[tab.id];
            if (!wv) return;
            // Get context info from webview
            wv.executeJavaScript(`
              (function() {
                var el = document.elementFromPoint(${e.clientX}, ${e.clientY - 80});
                var sel = window.getSelection()?.toString()?.trim() || '';
                var link = el?.closest('a')?.href || '';
                var img = (el?.tagName === 'IMG') ? el.src : '';
                return JSON.stringify({ selectedText: sel, linkUrl: link, imgSrc: img });
              })();
            `).then(raw => {
              try {
                const data = JSON.parse(raw);
                setContextMenu({
                  x: Math.min(e.clientX, window.innerWidth - 220),
                  y: Math.min(e.clientY, window.innerHeight - 300),
                  hasSelection: data.selectedText.length > 0,
                  selectedText: data.selectedText,
                  linkUrl: data.linkUrl,
                  imgSrc: data.imgSrc
                });
              } catch {
                setContextMenu({
                  x: e.clientX, y: e.clientY,
                  hasSelection: false, selectedText: '', linkUrl: '', imgSrc: ''
                });
              }
            }).catch(() => {
              setContextMenu({
                x: e.clientX, y: e.clientY,
                hasSelection: false, selectedText: '', linkUrl: '', imgSrc: ''
              });
            });
          }}>
            {isSuspended ? (
              <div style={{ color: '#666', fontFamily: 'sans-serif', textAlign: 'center', display: isActive ? 'block' : 'none' }}>
                <h3 style={{fontSize: '24px', marginBottom: '8px'}}>Tab Suspended by Apex Turbo</h3>
                <p>Click anywhere to reload page.</p>
                <button onClick={() => setActiveTabId(tab.id)} style={{marginTop: '16px', padding: '8px 16px', background: '#00d2ff', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Wake Up</button>
              </div>
            ) : (
              <webview
                ref={(el) => handleWebviewRef(tab.id, el)}
                src={tab.url}
                className="active-webview"
                allowpopups="true"
                partition="persist:webview"
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
              ></webview>
            )}
          </div>
        );
      })}
      </div>
    </>
  );
}

// Context menu item style
const ctxStyle = {
  padding: '8px 16px', color: '#fff', fontSize: 13, cursor: 'pointer',
  transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 8
};

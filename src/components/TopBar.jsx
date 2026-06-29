import React, { useRef, useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, X, Plus, Globe, Layout, Puzzle, MoreHorizontal, Ghost, Zap, Bot, Minus, Square, Star, StarOff, Pin, RefreshCw, Image as ImageIcon, Gamepad2, BrainCircuit, BookOpen, Monitor, Power } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';
import useTranslation from '../hooks/useTranslation';
import '../styles/TopBar.css';
import ApexLogo from './ApexLogo';

const SEARCH_ENGINES = {
  google: { url: 'https://www.google.com/search?q=', icon: 'G', name: 'Google' },
  bing: { url: 'https://www.bing.com/search?q=', icon: 'B', name: 'Bing' },
  duckduckgo: { url: 'https://duckduckgo.com/?q=', icon: 'D', name: 'DuckDuckGo' },
  yahoo: { url: 'https://search.yahoo.com/search?p=', icon: 'Y', name: 'Yahoo' }
};

export default function TopBar() {
  const tabs = useBrowserStore(state => state.tabs);
  const activeTabId = useBrowserStore(state => state.activeTabId);
  const createTab = useBrowserStore(state => state.createTab);
  const closeTab = useBrowserStore(state => state.closeTab);
  const setActiveTabId = useBrowserStore(state => state.setActiveTabId);
  const searchQuery = useBrowserStore(state => state.searchQuery);
  const setSearchQuery = useBrowserStore(state => state.setSearchQuery);
  const isExtensionsOpen = useBrowserStore(state => state.isExtensionsOpen);
  const setIsExtensionsOpen = useBrowserStore(state => state.setIsExtensionsOpen);
  const isWallpaperStoreOpen = useBrowserStore(state => state.isWallpaperStoreOpen);
  const setIsWallpaperStoreOpen = useBrowserStore(state => state.setIsWallpaperStoreOpen);
  const isWidgetStoreOpen = useBrowserStore(state => state.isWidgetStoreOpen);
  const setIsWidgetStoreOpen = useBrowserStore(state => state.setIsWidgetStoreOpen);
  const isBrowserMenuOpen = useBrowserStore(state => state.isBrowserMenuOpen);
  const setIsBrowserMenuOpen = useBrowserStore(state => state.setIsBrowserMenuOpen);
  const isDownloadsOpen = useBrowserStore(state => state.isDownloadsOpen);
  const setIsDownloadsOpen = useBrowserStore(state => state.setIsDownloadsOpen);
  const isHistoryOpen = useBrowserStore(state => state.isHistoryOpen);
  const setIsHistoryOpen = useBrowserStore(state => state.setIsHistoryOpen);
  const isSettingsOpen = useBrowserStore(state => state.isSettingsOpen);
  const setIsSettingsOpen = useBrowserStore(state => state.setIsSettingsOpen);
  const isLoggedIn = useBrowserStore(state => state.isLoggedIn);
  const userData = useBrowserStore(state => state.userData);
  const showBookmarksBar = useBrowserStore(state => state.showBookmarksBar);
  const setShowBookmarksBar = useBrowserStore(state => state.setShowBookmarksBar);
  const isTurboActive = useBrowserStore(state => state.isTurboActive);
  const setIsTurboActive = useBrowserStore(state => state.setIsTurboActive);
  const suspendBackgroundTabs = useBrowserStore(state => state.suspendBackgroundTabs);
  const isCopilotOpen = useBrowserStore(state => state.isCopilotOpen);
  const setIsCopilotOpen = useBrowserStore(state => state.setIsCopilotOpen);
  const syncStatus = useBrowserStore(state => state.syncStatus);
  const bookmarks = useBrowserStore(state => state.bookmarks);
  const bookmarkFolders = useBrowserStore(state => state.bookmarkFolders);
  const addBookmark = useBrowserStore(state => state.addBookmark);
  const removeBookmark = useBrowserStore(state => state.removeBookmark);
  const createBookmarkFolder = useBrowserStore(state => state.createBookmarkFolder);
  const deleteBookmarkFolder = useBrowserStore(state => state.deleteBookmarkFolder);
  const searchEngine = useBrowserStore(state => state.searchEngine);
  const togglePinTab = useBrowserStore(state => state.togglePinTab);
  const reorderTabs = useBrowserStore(state => state.reorderTabs);
  const isFindOpen = useBrowserStore(state => state.isFindOpen);
  const setIsFindOpen = useBrowserStore(state => state.setIsFindOpen);
  const findQuery = useBrowserStore(state => state.findQuery);
  const setFindQuery = useBrowserStore(state => state.setFindQuery);
  const isGamingMode = useBrowserStore(state => state.isGamingMode);
  const setIsGamingMode = useBrowserStore(state => state.setIsGamingMode);
  const isFocusMode = useBrowserStore(state => state.isFocusMode);
  const setIsFocusMode = useBrowserStore(state => state.setIsFocusMode);
  const setActionEngineTask = useBrowserStore(state => state.setActionEngineTask);

  const undoToast = useBrowserStore(state => state.undoToast);
  const reopenLastClosed = useBrowserStore(state => state.reopenLastClosed);
  const dismissUndoToast = useBrowserStore(state => state.dismissUndoToast);
  const isPasswordsOpen = useBrowserStore(state => state.isPasswordsOpen);
  const setIsPasswordsOpen = useBrowserStore(state => state.setIsPasswordsOpen);
  const splitScreenTabId = useBrowserStore(state => state.splitScreenTabId);
  const setSplitScreenTabId = useBrowserStore(state => state.setSplitScreenTabId);

  const t = useTranslation();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const searchInputRef = useRef(null);
  const findInputRef = useRef(null);
  const tabsContainerRef = useRef(null);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [tabContextMenu, setTabContextMenu] = useState(null);
  const [openFolderId, setOpenFolderId] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getWindowState) {
        window.electronAPI.getWindowState().then(setIsMaximized);
        window.electronAPI.onWindowState((isMax) => setIsMaximized(isMax));
    }
  }, []);
  
  const handleTabsScroll = (e) => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // #31: Track scroll position for fade indicators
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: false });
  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const updateScroll = () => {
      setScrollState({
        canLeft: el.scrollLeft > 5,
        canRight: el.scrollLeft < el.scrollWidth - el.clientWidth - 5
      });
    };
    updateScroll();
    el.addEventListener('scroll', updateScroll);
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScroll); ro.disconnect(); };
  }, [tabs.length]);
  
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const isDashboard = activeTab?.url === '';
  const isIncognitoMode = new URLSearchParams(window.location.search).get('incognito') === 'true';

  const engine = SEARCH_ENGINES[searchEngine] || SEARCH_ENGINES.google;

  const mockSuggestions = [
    `search for ${searchQuery} near me`,
    `search for ${searchQuery} news trends`,
    `search for wikipedia ${searchQuery}`,
  ];

  const ACTION_VERBS = ['pay', 'order', 'buy', 'apply', 'book', 'find', 'cancel', 'schedule', 'send', 'get'];
  const firstWord = searchQuery.trim().split(' ')[0].toLowerCase();
  const isActionIntent = ACTION_VERBS.includes(firstWord);

  const triggerActionEngine = () => {
      setShowSuggestions(false);
      setActionEngineTask(searchQuery.trim());
      setIsCopilotOpen(true);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      if (isActionIntent && !searchQuery.includes('.')) {
          triggerActionEngine();
          return;
      }
      let finalUrl = searchQuery.trim();
      let newTitle = searchQuery.trim();
      const isLocalhost = finalUrl.startsWith('localhost:') || finalUrl === 'localhost';

      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        if (isLocalhost || (finalUrl.includes('.') && !finalUrl.includes(' '))) {
          finalUrl = (isLocalhost ? 'http://' : 'https://') + finalUrl;
          try { newTitle = new URL(finalUrl).hostname; } catch (e) { }
        } else {
          finalUrl = engine.url + encodeURIComponent(finalUrl);
          newTitle = `${searchQuery} - ${engine.name} Search`;
        }
      } else {
        try { newTitle = new URL(finalUrl).hostname; } catch (e) { }
      }

      useBrowserStore.getState().updateTab(activeTabId, { url: finalUrl, title: newTitle });
      setShowSuggestions(false);
    }
  };

  const handleFindInput = (e) => {
    setFindQuery(e.target.value);
    if (e.target.value) {
      window.apexBrowserControls?.findInPage(e.target.value);
    } else {
      window.apexBrowserControls?.stopFindInPage();
    }
  };

  const isBookmarked = activeTab?.url && bookmarks.some(b => b.url === activeTab.url);

  const toggleBookmark = () => {
    if (!activeTab?.url) return;
    const existing = bookmarks.find(b => b.url === activeTab.url);
    if (existing) {
      removeBookmark(existing.id);
    } else {
      addBookmark({ url: activeTab.url, title: activeTab.title || activeTab.url });
    }
  };

  // Tab drag-to-reorder handlers — use tab IDs not array indices (#10 fix)
  const handleDragStart = (e, tabId) => { setDraggedIndex(tabId); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e, dropTabId) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropTabId) {
      // Map IDs back to real indices in the original tabs array
      const fromIdx = tabs.findIndex(t => t.id === draggedIndex);
      const toIdx = tabs.findIndex(t => t.id === dropTabId);
      if (fromIdx !== -1 && toIdx !== -1) reorderTabs(fromIdx, toIdx);
    }
    setDraggedIndex(null);
  };

  const getAvatarUrl = () => {
    if (!isLoggedIn || !userData?.picture) return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffffff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
    return userData.picture;
  };



  return (
    <div className="os-header drag-region">
      {/* Row 1: Titlebar / Tabs */}
      <div className="os-titlebar" style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }}>

        {isIncognitoMode && (
          <div className="incognito-header-group no-drag" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px', WebkitAppRegion: 'no-drag' }}>
            <div className="incognito-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffb86c', fontSize: '12px', fontWeight: 'bold' }}>
              <Ghost size={14} /> Incognito
            </div>
            <button 
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s' }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onClick={() => window.electronAPI && window.electronAPI.close()}
              title={t.topbar.exit}
            >
              <X size={12} /> {t.topbar.exit}
            </button>
          </div>
        )}

        <div style={{ position: 'relative', minWidth: 0, flex: 1 }}>
          {/* #31: Left scroll fade */}
          {scrollState.canLeft && (
            <div onClick={() => tabsContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' })} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 32, background: 'linear-gradient(90deg, rgba(30,30,30,0.95), transparent)', zIndex: 'var(--z-header)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} color="rgba(255,255,255,0.6)" />
            </div>
          )}
          <div className="tabs-container no-drag" ref={tabsContainerRef} onWheel={handleTabsScroll} style={{ minWidth: 0, paddingRight: '16px' }}>
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                className={`browser-tab ${activeTabId === tab.id ? 'active' : ''} ${tab.isPinned ? 'pinned' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tab.id)}
                onContextMenu={(e) => { e.preventDefault(); setTabContextMenu({ tabId: tab.id, x: e.clientX, y: e.clientY }); }}
                title={tab.title}
                style={{
                  ...(tab.isPinned ? { maxWidth: '40px', minWidth: '40px', padding: '0 8px' } : {}),
                  borderTop: tab.groupColor ? `3px solid ${tab.groupColor}` : 'none'
                }}
              >
                <div className="tab-icon-wrapper">
                  {tab.url === '' ? <Globe size={14} className="dash-icon-sm" style={{ color: '#666' }} /> : <img src={`https://www.google.com/s2/favicons?domain=${tab.url || 'google.com'}&sz=32`} width="14" alt="Site" loading="lazy" />}
                </div>
                {!tab.isPinned && <span>{tab.title}</span>}
                {!tab.isPinned && <X size={12} className="tab-close" onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} />}
              </div>
            ))}
            <div className="tab-add" onClick={() => { createTab(); setTimeout(() => searchInputRef.current?.focus(), 50); }}>
              <Plus size={16} />
            </div>
          </div>
          {/* #31: Right scroll fade */}
          {scrollState.canRight && (
            <div onClick={() => tabsContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' })} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 32, background: 'linear-gradient(-90deg, rgba(30,30,30,0.95), transparent)', zIndex: 'var(--z-header)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} color="rgba(255,255,255,0.6)" />
            </div>
          )}
        </div>
        
        <div className="windows-controls no-drag" style={{ display: 'flex', alignItems: 'stretch', marginLeft: 'auto', marginRight: '-16px', height: '100%', flexShrink: 0, position: 'relative', zIndex: 'var(--z-max)' }}>

          <button className="win-btn" onClick={() => window.electronAPI && window.electronAPI.minimize()} title="Minimize">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="2" y1="7.5" x2="12" y2="7.5" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </button>
          <button className="win-btn" onClick={() => window.electronAPI && window.electronAPI.maximize()} title={isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 3.5C4 2.67157 4.67157 2 5.5 2H11.5C12.3284 2 13 2.67157 13 3.5V9.5C13 10.3284 12.3284 11 11.5 11H10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                <rect x="2.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1"/>
              </svg>
            )}
          </button>
          <button className="win-btn close" onClick={() => window.electronAPI && window.electronAPI.close()} title="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 2.5L11.5 11.5M11.5 2.5L2.5 11.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Row 2: Navbar & Search */}
      <div className="os-navbar no-drag">
        <div className="os-navigation">
          <button className="nav-btn" onClick={() => window.apexBrowserControls?.goBack()}><ChevronLeft size={16} /></button>
          <button className="nav-btn" onClick={() => window.apexBrowserControls?.goForward()}><ChevronRight size={16} /></button>
          <button className="nav-btn" onClick={(e) => { const icon = e.currentTarget.querySelector('.refresh-icon'); if (icon) { icon.classList.remove('spinning'); void icon.offsetWidth; icon.classList.add('spinning'); setTimeout(() => icon.classList.remove('spinning'), 800); } window.apexBrowserControls?.reload(); }} title="Reload"><RefreshCw size={14} className="refresh-icon" /></button>
        </div>

          <div className="os-omnibox">
          <div className="omnibox-icon" title="Apex Browser" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', color: '#FFFFFF' }}>
            <ApexLogo width="28" height="28" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.4))' }} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t.topbar.searchPlaceholder}
            value={searchQuery}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchSubmit}
          />
          {/* Bookmark star */}
          {activeTab?.url && (
            <button onClick={toggleBookmark} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }} title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}>
              {isBookmarked ? <Star size={16} fill="#ffd700" color="#ffd700" /> : <Star size={16} color="rgba(255,255,255,0.4)" />}
            </button>
          )}

          {showSuggestions && searchQuery.length > 0 && (
            <div className="search-dropdown">
              {isActionIntent && (
                 <div className="sug-item action-engine-sug" onClick={triggerActionEngine} style={{ background: 'rgba(0, 255, 204, 0.1)', border: '1px solid rgba(0, 255, 204, 0.3)', color: '#fff', fontWeight: 'bold' }}>
                    <Bot size={14} color="#00ffcc" />
                    <span><span style={{color: '#00ffcc'}}>✨ Action Engine:</span> Execute "{searchQuery}" autonomously</span>
                 </div>
              )}
              {mockSuggestions.map((sug, i) => (
                <div key={i} className="sug-item" onClick={() => { setSearchQuery(sug.replace('search for ', '')); setShowSuggestions(false); }}>
                  <Search size={14} /> {sug}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="os-topbar-right" style={{ position: 'relative' }}>
          {isDashboard && (
            <div className="ext-icon" title="Customize Widgets" onClick={() => setIsWidgetStoreOpen(true)} style={{ color: isWidgetStoreOpen ? '#00d2ff' : 'inherit' }}>
                <Layout size={14} />
            </div>
          )}
          <div className="ext-icon" title="Focus Mode (Distraction Free)" onClick={() => setIsFocusMode(!isFocusMode)} style={{ color: isFocusMode ? '#00ffcc' : 'inherit', background: isFocusMode ? 'rgba(0,255,204,0.1)' : 'transparent', borderRadius: '4px' }}>
            <BrainCircuit size={14} />
          </div>
          <div className="ext-icon" title="Apex AI Processor" onClick={() => setIsCopilotOpen(!isCopilotOpen)} style={{ color: isCopilotOpen ? '#bf00ff' : 'inherit' }}><Bot size={14} /></div>
          
          <div className="ext-icon" title="Gaming Mode (FPS Boost & RAM Saver)" onClick={() => { setIsGamingMode(!isGamingMode); if(!isGamingMode) { setIsTurboActive(true); suspendBackgroundTabs(); } }} style={{ color: isGamingMode ? '#ff0055' : 'inherit', background: isGamingMode ? 'rgba(255,0,85,0.1)' : 'transparent', borderRadius: '4px' }}>
            <Gamepad2 size={14} />
          </div>
          


          <div className="ext-icon purple"><Search size={12} /></div>
          <div className="ext-icon" title="Wallpaper Store" onClick={() => setIsWallpaperStoreOpen(true)}><ImageIcon size={14} /></div>
          <div className="ext-icon" onClick={() => { setIsExtensionsOpen(!isExtensionsOpen); setIsBrowserMenuOpen(false); }} title="Extensions"><Puzzle size={14} /></div>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <img src={getAvatarUrl()} className="profile-pic" alt="Profile" onClick={() => setIsSettingsOpen(true)} style={{ cursor: 'pointer', background: isLoggedIn ? 'transparent' : '#333' }} />
            {isLoggedIn && syncStatus !== 'idle' && (
              <div title={`Sync: ${syncStatus}`} style={{
                position: 'absolute', bottom: '-2px', right: '-2px',
                width: '10px', height: '10px', borderRadius: '50%',
                background: syncStatus === 'synced' ? '#00d4ff' : syncStatus === 'syncing' ? '#ffb300' : syncStatus === 'error' ? '#ff4757' : 'transparent',
                border: '2px solid rgba(0,0,0,0.8)',
                animation: syncStatus === 'syncing' ? 'pulse 1.5s infinite' : 'none',
              }} />
            )}
          </div>
          <MoreHorizontal size={16} className="menu-dots" onClick={() => { setIsBrowserMenuOpen(!isBrowserMenuOpen); setIsExtensionsOpen(false); }} />
          
          {/* Extensions now open fullscreen ExtensionsManager component via App.jsx */}

          {/* Browser 3-Dot Menu */}
          {isBrowserMenuOpen && (
            <div className="dropdown-popup browser-menu-popup">
               <div className="menu-banner">
                  <Globe size={16} />
                  {t.topbar.setAsDefault}
               </div>
               <div className="popup-divider"></div>
               
               <div className="popup-item" onClick={() => { createTab(); setIsBrowserMenuOpen(false); }}>{t.topbar.newTab} <span className="shortcut">Ctrl+T</span></div>
               <div className="popup-item" onClick={() => { window.electronAPI && window.electronAPI.maximize ? window.electronAPI.maximize() : null; setIsBrowserMenuOpen(false); }}>{t.topbar.toggleWindow} <span className="shortcut">Ctrl+N</span></div>
               <div className="popup-item" onClick={() => { 
                   if (window.electronAPI && window.electronAPI.openIncognito) {
                       window.electronAPI.openIncognito();
                   }
                   setIsBrowserMenuOpen(false); 
               }}>{t.topbar.newIncognito} <span className="shortcut">Ctrl+Shift+N</span></div>
               
               <div className="popup-divider"></div>
               <div className="popup-item profile-row" onClick={() => { setIsSettingsOpen(true); setIsBrowserMenuOpen(false); }}>
                  <div className="profile-circle" style={{ overflow: 'hidden' }}>{isLoggedIn && userData?.picture ? <img src={userData.picture} width="24" height="24" alt="user" /> : 'U'}</div>
                  <span className="profile-name">{isLoggedIn ? userData?.name || 'User' : t.topbar.signIn}</span>
                  {isLoggedIn && <span className="signed-in-badge">{t.topbar.signedIn}</span>}
               </div>
               
               <div className="popup-divider"></div>
               <div className="popup-item" onClick={() => { setIsPasswordsOpen(true); setIsBrowserMenuOpen(false); }}>{t.topbar.passwords}</div>
               <div className="popup-item" onClick={() => { setIsHistoryOpen(true); setIsBrowserMenuOpen(false); }}>{t.topbar.history}</div>
               <div className="popup-item" onClick={() => { setIsDownloadsOpen(true); setIsBrowserMenuOpen(false); }}>{t.topbar.downloads} <span className="shortcut">Ctrl+J</span></div>
               <div className="popup-item" onClick={() => { setShowBookmarksBar(b => !b); setIsBrowserMenuOpen(false); }}>{t.topbar.bookmarks} <span className="shortcut">Ctrl+D</span></div>
               <div className="popup-item" onClick={() => { setIsExtensionsOpen(true); setIsBrowserMenuOpen(false); }}>{t.topbar.extensions}</div>
               <div className="popup-item" onClick={() => { setIsSettingsOpen(true); setIsBrowserMenuOpen(false); }}>{t.topbar.deleteData} <span className="shortcut">Ctrl+Shift+Del</span></div>
               {isLoggedIn && (
                   <div className="popup-item" style={{ color: '#ff4757' }} onClick={() => {
                       useBrowserStore.getState().setUserData(null);
                       useBrowserStore.getState().setIsLoggedIn(false);
                       useBrowserStore.getState().showToast('Signed out successfully', 'success');
                       setIsBrowserMenuOpen(false);
                   }}>
                       <Power size={14} style={{ marginRight: '8px' }} /> Sign Out
                   </div>
               )}
               
               <div className="popup-divider"></div>
               <div className="popup-item">
                 {t.topbar.zoom} 
                 <span className="zoom-controls">
                   <span style={{cursor:'pointer'}} onClick={() => window.apexBrowserControls?.zoom('out')}>-</span> 
                   <span style={{cursor:'pointer'}} onClick={() => window.apexBrowserControls?.zoom('reset')}>100%</span> 
                   <span style={{cursor:'pointer'}} onClick={() => window.apexBrowserControls?.zoom('in')}>+</span>
                 </span>
               </div>
               <div className="popup-item" onClick={() => { 
                  window.apexBrowserControls?.print();
                  setIsBrowserMenuOpen(false); 
                }}>{t.topbar.print} <span className="shortcut">Ctrl+P</span></div>
               <div className="popup-item" onClick={() => { setIsFindOpen(true); setIsBrowserMenuOpen(false); setTimeout(() => findInputRef.current?.focus(), 100); }}>{t.topbar.findInPage} <span className="shortcut">Ctrl+F</span></div>
               <div className="popup-divider"></div>
               <div className="popup-item" onClick={() => { 
                  window.apexBrowserControls?.executeJS?.(`
                    if (!document.getElementById('google-translate-script')) {
                        var s = document.createElement('script');
                        s.id = 'google-translate-script';
                        s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
                        document.body.appendChild(s);
                        var d = document.createElement('div');
                        d.id = 'google_translate_element';
                        d.style.position = 'fixed'; d.style.top = '0'; d.style.right = '0'; d.style.zIndex='var(--z-max)';
                        document.body.prepend(d);
                        window.googleTranslateElementInit = function() {
                            new google.translate.TranslateElement({pageLanguage: 'auto'}, 'google_translate_element');
                        };
                    }
                  `);
                  setIsBrowserMenuOpen(false); 
                }}>
                 <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>🌐 Translate Page</span>
               </div>
               <div className="popup-item" onClick={() => { window.apexBrowserControls?.toggleReaderMode?.(); setIsBrowserMenuOpen(false); }}>
                 <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={14} /> Reader Mode</span>
               </div>
               <div className="popup-item" onClick={() => { window.apexBrowserControls?.togglePiP?.(); setIsBrowserMenuOpen(false); }}>
                 <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Monitor size={14} /> Picture-in-Picture</span>
               </div>
               <div className="popup-divider"></div>
               <div className="popup-item" onClick={() => { setIsSettingsOpen(true); setIsBrowserMenuOpen(false); }}>{t.topbar.settings}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Context Menu */}
      {tabContextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)' }} onClick={() => setTabContextMenu(null)} onContextMenu={e => { e.preventDefault(); setTabContextMenu(null); }} />
          <div style={{
            position: 'fixed', left: Math.min(tabContextMenu.x, window.innerWidth - 200), top: tabContextMenu.y,
            background: 'rgba(25,25,30,0.96)', backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
            padding: '6px 0', minWidth: 200, zIndex: 'calc(var(--z-modal) + 1)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.15s ease-out'
          }}>
            {tabs.find(t => t.id === tabContextMenu.tabId)?.isPinned ? (
               <div className="popup-item" onClick={() => { togglePinTab(tabContextMenu.tabId); setTabContextMenu(null); }}>Unpin Tab</div>
            ) : (
               <div className="popup-item" onClick={() => { togglePinTab(tabContextMenu.tabId); setTabContextMenu(null); }}>Pin Tab</div>
            )}
            
            <div className="popup-item" onClick={() => { setSplitScreenTabId(tabContextMenu.tabId); setTabContextMenu(null); }}>
               <span style={{ color: '#00ffcc' }}>Split View with Active</span>
            </div>

            <div className="popup-divider"></div>
            <div style={{ padding: '4px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Group Color</div>
            <div style={{ display: 'flex', gap: 8, padding: '8px 16px' }}>
                {['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#bf00ff'].map(color => (
                    <button key={color} onClick={() => { 
                       useBrowserStore.getState().updateTab(tabContextMenu.tabId, { groupColor: color });
                       setTabContextMenu(null);
                    }} style={{ width: 20, height: 20, borderRadius: '50%', background: color, border: 'none', cursor: 'pointer' }} />
                ))}
                <button onClick={() => { 
                   useBrowserStore.getState().updateTab(tabContextMenu.tabId, { groupColor: null });
                   setTabContextMenu(null);
                }} style={{ width: 20, height: 20, borderRadius: '50%', background: 'transparent', border: '1px dashed rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                   <X size={12} color="#fff" style={{margin:'auto'}} />
                </button>
            </div>

            <div className="popup-divider"></div>
            <div className="popup-item" onClick={() => { closeTab(tabContextMenu.tabId); setTabContextMenu(null); }} style={{ color: '#ff4757' }}>Close Tab</div>
          </div>
        </>
      )}

      {/* Row 3: Bookmarks Bar (#32: right-click to delete, toggle visible) */}
      {showBookmarksBar && (bookmarks.length > 0 || bookmarkFolders.length > 0) && (
        <div className="bookmarks-bar no-drag" onContextMenu={(e) => {
            e.preventDefault();
            setShowFolderInput(true);
        }} title="Right-click empty space to add a Bookmark Folder">
          
          {/* Inline folder creation input */}
          {showFolderInput && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginRight: '8px', flexShrink: 0 }}>
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: '4px', color: '#fff', padding: '2px 8px', fontSize: '12px', outline: 'none', width: '120px' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newFolderName.trim()) { createBookmarkFolder(newFolderName.trim()); setNewFolderName(''); setShowFolderInput(false); }
                  if (e.key === 'Escape') { setNewFolderName(''); setShowFolderInput(false); }
                }}
              />
              <button onClick={() => { if (newFolderName.trim()) createBookmarkFolder(newFolderName.trim()); setNewFolderName(''); setShowFolderInput(false); }} style={{ background: '#00d4ff', border: 'none', borderRadius: '4px', color: '#000', padding: '2px 8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
              <button onClick={() => { setNewFolderName(''); setShowFolderInput(false); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '2px', display: 'flex' }}><X size={12} /></button>
            </div>
          )}

          {/* Render Folders First */}
          {bookmarkFolders.map(folder => {
             const folderBookmarks = bookmarks.filter(b => b.folderId === folder.id);
             return (
               <div key={folder.id} className="bookmark-item bookmark-folder" 
                 onMouseEnter={() => setOpenFolderId(folder.id)}
                 onMouseLeave={() => setOpenFolderId(null)}
                 onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); deleteBookmarkFolder(folder.id); }}
                 title="Right-click to delete folder"
               >
                 <BookOpen size={14} color="#00d4ff" />
                 <span>{folder.name}</span>
                 {openFolderId === folder.id && (
                    <div className="bookmark-folder-dropdown">
                        {folderBookmarks.length === 0 && <div className="dropdown-empty">Empty</div>}
                        {folderBookmarks.map(bm => (
                            <div key={bm.id} className="folder-bookmark-item"
                               onClick={() => useBrowserStore.getState().updateTab(activeTabId, { url: bm.url, title: bm.title })}
                               onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); removeBookmark(bm.id); }}
                               title={`${bm.title}\nRight-click to remove`}
                            >
                                <img src={`https://www.google.com/s2/favicons?domain=${bm.url}&sz=16`} width="14" alt="" loading="lazy" />
                                <span>{bm.title.length > 25 ? bm.title.substring(0, 25) + '…' : bm.title}</span>
                            </div>
                        ))}
                    </div>
                 )}
               </div>
             );
          })}

          {/* Render Un-foldered Bookmarks */}
          {bookmarks.filter(b => !b.folderId).map(bm => (
            <div key={bm.id} className="bookmark-item"
              onClick={() => useBrowserStore.getState().updateTab(activeTabId, { url: bm.url, title: bm.title })}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); removeBookmark(bm.id); }}
              title={`${bm.title}\nRight-click to remove`}
            >
              <img src={`https://www.google.com/s2/favicons?domain=${bm.url}&sz=16`} width="14" alt="" loading="lazy" />
              <span>{bm.title.length > 20 ? bm.title.substring(0, 20) + '…' : bm.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Find in Page Bar */}
      {isFindOpen && (
        <div className="find-bar no-drag">
          <input
            ref={findInputRef}
            type="text"
            placeholder="Find in page..."
            value={findQuery}
            onChange={handleFindInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') window.apexBrowserControls?.findInPage(findQuery);
              if (e.key === 'Escape') { setIsFindOpen(false); setFindQuery(''); window.apexBrowserControls?.stopFindInPage(); }
            }}
            autoFocus
          />
          <X size={14} style={{ cursor: 'pointer', color: '#fff', opacity: 0.6 }} onClick={() => { setIsFindOpen(false); setFindQuery(''); window.apexBrowserControls?.stopFindInPage(); }} />
        </div>
      )}

      {/* #34: Undo Close Tab Toast */}
      {undoToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14,
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16,
          zIndex: 'var(--z-toast)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)'
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
            Tab closed — <span style={{ color: 'rgba(255,255,255,0.5)' }}>{undoToast.tab.title?.substring(0, 30) || 'Untitled'}</span>
          </span>
          <button onClick={() => { reopenLastClosed(); dismissUndoToast(); }} style={{
            background: 'linear-gradient(135deg, #00d4ff, #bf00ff)', border: 'none',
            color: '#fff', padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
            fontWeight: 700, fontSize: 12, transition: '0.2s'
          }}>Undo</button>
          <X size={14} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }} onClick={dismissUndoToast} />
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { X, Bot, Send, Loader2, KeyRound, Settings as SettingsIcon, Mic, MicOff, Moon, Sun, Clock, FileText, Network, Edit3, Cloud, Cpu, Eraser, Volume2 } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';
import DOMPurify from 'dompurify';

// S6 FIX: Restrict DOMPurify to safe tags only — block script, iframe, form, object, embed
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'sup', 'sub', 'del', 'ins', 'mark'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'src', 'alt', 'width', 'height'],
  ALLOW_DATA_ATTR: false,
};

import '../styles/AICopilot.css';
import OneClickAI from './OneClickAI';
import { callGroqAPI, callGeminiAPI, callAnthropicAPI, callOpenAIAPI, callOllamaAPI, callOpenRouterAPI, readStream } from '../services/AiService';

// Simple markdown renderer (bold, italic, code, links, lists, headers)
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="md-code-block"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="md-h">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="md-h">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="md-h">$1</h2>')
    // Unordered lists
    .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#00d4ff;text-decoration:underline">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br/>');
  
  // Wrap consecutive <li> tags in <ul>
  html = html.replace(/((<li>.*?<\/li><br\/>?)+)/g, '<ul class="md-list">$1</ul>');
  html = html.replace(/<ul class="md-list">(.*?)<\/ul>/g, (match, inner) => {
    return '<ul class="md-list">' + inner.replace(/<br\/>/g, '') + '</ul>';
  });
  
  return html;
}

const MAX_CONTEXT_MESSAGES = 20; // Sliding window for context

export default function AICopilot() {
  const isCopilotOpen = useBrowserStore(state => state.isCopilotOpen);
  const setIsCopilotOpen = useBrowserStore(state => state.setIsCopilotOpen);
  const tabs = useBrowserStore(state => state.tabs);
  const activeTabId = useBrowserStore(state => state.activeTabId);
  const aiApiKey = useBrowserStore(state => state.aiApiKey);
  const aiProvider = useBrowserStore(state => state.aiProvider);
  const aiCustomEndpoint = useBrowserStore(state => state.aiCustomEndpoint);
  const setIsSettingsOpen = useBrowserStore(state => state.setIsSettingsOpen);
  const aiChatHistory = useBrowserStore(state => state.aiChatHistory);
  const setAiChatHistory = useBrowserStore(state => state.setAiChatHistory);
  const aiPastSessions = useBrowserStore(state => state.aiPastSessions);
  const setAiPastSessions = useBrowserStore(state => state.setAiPastSessions);
  const darkMode = useBrowserStore(state => state.darkMode);
  const setDarkMode = useBrowserStore(state => state.setDarkMode);
  const actionEngineTask = useBrowserStore(state => state.actionEngineTask);
  const setActionEngineTask = useBrowserStore(state => state.setActionEngineTask);
  const ollamaEndpoint = useBrowserStore(state => state.ollamaEndpoint);
  const ollamaModel = useBrowserStore(state => state.ollamaModel);
  const openrouterModel = useBrowserStore(state => state.openrouterModel);
  const localAIReady = useBrowserStore(state => state.localAIReady);
  const setAiProvider = useBrowserStore(state => state.setAiProvider);
  const showToast = useBrowserStore(state => state.showToast);
  const showConfirmModal = useBrowserStore(state => state.showConfirmModal);
  const [isHistoryView, setIsHistoryView] = useState(false);
  
  const SYSTEM_PROMPT = `You are Apex AI, the browser's native intelligence. You actually SEE the user's active screen and read their active tab natively. 

CRITICAL INSTRUCTION: If the user asks a question about a problem, image, or quiz visible on their screen, YOU MUST SOLVE THE PROBLEM AND PROVIDE THE DIRECT FINAL ANSWER. Do NOT just read or recite the question to them. You exist to answer and solve whatever is on the screen!

You answer questions CONCISELY and accurately. Do not use verbose preambles or robotic greetings. 

You ALSO have power to control the browser via JSON commands wrapped exactly in <CMD>...</CMD>.
Supported actions:
1. {"action":"NAVIGATE", "url":"https://..."}
2. {"action":"NEW_TAB", "url":"https://..."}
3. {"action":"SEARCH", "query":"..."}
4. {"action":"CLOSE_TAB"}
5. {"action":"OPEN_SETTINGS"}
6. {"action":"TAKE_NOTE", "note":"..."}
7. {"action":"SPEAK", "text":"..."}
8. {"action":"EXECUTE_JS", "code":"..."} - runs raw Javascript to click elements, fill forms, check boxes, or extract info.
9. {"action":"CONTINUE_AUTOMATION", "delay": 2000} - Auto-triggers you again after 'delay' ms. Use this to chain complex tasks safely.

When in AUTO-PILOT / AGENT MODE, you MUST output EXACTLY ONE JSON block wrapped in \`\`\`json ... \`\`\` that contains your thought process and action. DO NOT output any other text!
Format:
\`\`\`json
{
  "thought": "I need to find the cheapest laptop under 50k",
  "status": "Searching Google for laptops...",
  "action": {"action":"EXECUTE_JS", "code":"..."}
}
\`\`\`

- Execute exactly ONE step per turn.
- After each step, you will be auto-triggered again with the updated screen.
- When the task is fully done, output action: "STOP"

For EXECUTE_JS, write robust selectors. Prefer: document.querySelector('[data-testid=...]'), visible text content matching, or aria-labels. Always add null checks before .click() or .value assignments.`;

  const getInitialMessages = () => {
    if (aiChatHistory && aiChatHistory.length > 0) {
      return aiChatHistory;
    }
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'assistant', content: '**Connection established!** 🚀\n\nI\'m Apex AI — your intelligent browser companion. I can:\n\n- 🔍 **Search** the web for you\n- 📖 **Read & analyze** page content\n- 🖱️ **Control** the browser autonomously\n- 💬 **Answer** any question\n\nWhat would you like to do?' }
    ];
  };

  const [messages, setMessages] = useState(getInitialMessages);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [isContinuousVoice, setIsContinuousVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [agentState, setAgentState] = useState({ status: 'idle', thought: '', actionStatus: '' });
  const [automationQueue, setAutomationQueue] = useState(null);

  const chatBodyRef = useRef(null);
  const inputRef = useRef(input);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const vadIntervalRef = useRef(null);
  const isContinuousRef = useRef(false);
  const isAutoPilotRef = useRef(false);
  const agentStepCountRef = useRef(0);
  const loopFailCountRef = useRef(0);

  // Keep inputRef in sync
  useEffect(() => { inputRef.current = input; }, [input]);

  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 1) {
      setAiChatHistory(messages);
    }
  }, [messages, setAiChatHistory]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isListening, streamingText]);

  const toggleVoice = async (autoStart = false) => {
    if (!autoStart && isListening) {
      setIsContinuousVoice(false);
      isContinuousRef.current = false;
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      
      // Stop current recognition
      if (mediaRecorderRef.current?.type === 'speech') {
        mediaRecorderRef.current.recognition.stop();
      } else {
        mediaRecorderRef.current?.stop();
      }
      setIsListening(false);
      return;
    }

    if (!autoStart) {
       setIsContinuousVoice(true);
       isContinuousRef.current = true;
       window.speechSynthesis.cancel();
    }

    if (!aiApiKey) {
       showToast('Voice input requires an API key. Set one in Settings → Apex AI.', 'warning');
       setIsContinuousVoice(false); isContinuousRef.current = false;
       return;
    }

    if (!useBrowserStore.getState().micEnabled) {
      showToast('Please enable Microphone Access in Settings → Privacy first.', 'warning');
      setIsContinuousVoice(false); isContinuousRef.current = false;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      // Voice Activity Detection
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.1;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let silenceStart = Date.now();
      let hasSpoken = false;

      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;

        if (average > 25) { // Threshold for speech
           hasSpoken = true;
           silenceStart = Date.now();
        } else if (hasSpoken && (Date.now() - silenceStart > 1500)) { 
           // 1.5s of silence after having spoken
           clearInterval(vadIntervalRef.current);
           if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
               mediaRecorderRef.current.stop();
               setIsListening(false);
           }
        }
      }, 100);

      mediaRecorder.onstop = async () => {
        if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
        stream.getTracks().forEach(t => t.stop());
        if (audioContext.state !== 'closed') audioContext.close();
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 100) return;

        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          formData.append('model', 'whisper-large-v3');
          formData.append('language', 'en');

          const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${aiApiKey}` },
            body: formData
          });

          if (!res.ok) return;
          const data = await res.json();
          if (data.text?.trim()) {
            const finalSpokenText = data.text.trim();
            const combinedText = inputRef.current ? inputRef.current + ' ' + finalSpokenText : finalSpokenText;
            setInput('');
            handleSend(combinedText, false, true);
          }
        } catch (err) {
          console.error('Transcription failed:', err);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error('Mic access denied:', err);
      showToast('Microphone access denied. Please allow mic access in system settings.', 'error');
    }
  };



  const handleSend = async (autoPrompt = null, isAuto = false, isVoice = false) => {
    const textToSend = typeof autoPrompt === 'string' ? autoPrompt : input;
    if (!textToSend.trim() || isGenerating) return;
    
    if (isListening && !isAuto) {
       if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
       if (mediaRecorderRef.current && mediaRecorderRef.current.type === 'speech') {
           mediaRecorderRef.current.recognition.stop();
       } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
           mediaRecorderRef.current.stop();
       }
       setIsListening(false);
    }

    const userMsg = { role: 'user', content: textToSend };
    // Only show user messages in chat for real user input, not internal agent re-triggers
    if (!isAuto) {
      setMessages(prev => [...prev, userMsg]);
      setInput('');
    }
    setIsGenerating(true);
    setStreamingText('');

    try {
      const store = useBrowserStore.getState();
      const activeTab = store.tabs.find(t => t.id === store.activeTabId);
      
      // Build context with tab awareness
      let contextStr = '';
      const allTabs = store.tabs.map(t => `[${t.id === store.activeTabId ? 'ACTIVE' : 'bg'}] ${t.title} - ${t.url || 'Dashboard'}`).join('\n');
      contextStr += `\n(Open Tabs:\n${allTabs})`;

      let screenImage = null;

      if (activeTab && activeTab.url) {
         let pageText = '';
         try {
           if (window.apexBrowserControls && window.apexBrowserControls.extractText) {
               pageText = await window.apexBrowserControls.extractText();
           }
         } catch (e) {
           console.warn('Text extraction failed:', e);
         }
         
         try {
           if (window.apexBrowserControls && window.apexBrowserControls.captureScreen) {
               screenImage = await window.apexBrowserControls.captureScreen();
           }
         } catch (e) {
           console.warn('Screen capture failed, continuing with text-only context:', e);
         }

         contextStr += `\n(Context: Currently viewing: ${activeTab.url} - ${activeTab.title})`;
         if (pageText) {
             contextStr += `\n\n[PAGE TEXT CONTENT:]\n"${pageText.substring(0, 12000)}"`;
         }
         if (!pageText && !screenImage) {
             contextStr += `\n\n[NOTE: Could not extract page text or capture screen. Try reading the page content by executing JS: document.body.innerText]`;
         }
      }

      // Sliding window: keep system prompt + last N messages
      const autoPilotInstruction = isAutoPilot ? "\n\n[CRITICAL: AUTO-PILOT MODE ACTIVE! Output exactly ONE JSON block in ```json format with 'thought', 'status', and 'action' keys. DO NOT output any markdown. You will be auto-triggered to solve the next question automatically.]" : "";
      
      const voiceInstruction = isVoice ? "\n\n[SYSTEM: The user spoke this to you using a microphone. You MUST act conversationally and you MUST include <CMD>{\"action\":\"SPEAK\", \"text\":\"your concise response here\"}</CMD> in your reply so they can hear you talk back!]" : "";
      
      const tailoredUserMsg = { role: 'user', content: userMsg.content + contextStr + autoPilotInstruction + voiceInstruction };
      if (screenImage) tailoredUserMsg.image = screenImage;
      
      const allMessages = [...messages, tailoredUserMsg];
      const systemMsg = allMessages.find(m => m.role === 'system');
      const nonSystemMsgs = allMessages.filter(m => m.role !== 'system');
      const windowedMsgs = nonSystemMsgs.slice(-MAX_CONTEXT_MESSAGES);
      const conversation = systemMsg ? [systemMsg, ...windowedMsgs] : windowedMsgs;
      
      let replyContent = '';
      if (aiProvider === 'groq') {
          const response = await callGroqAPI(conversation, aiApiKey);
          replyContent = await readStream(response, 'groq', setStreamingText);
      } else if (aiProvider === 'gemini') {
          const response = await callGeminiAPI(conversation, aiApiKey);
          replyContent = await readStream(response, 'gemini', setStreamingText);
      } else if (aiProvider === 'anthropic') {
          const response = await callAnthropicAPI(conversation, aiApiKey);
          replyContent = await readStream(response, 'anthropic', setStreamingText);
      } else if (aiProvider === 'ollama') {
          const response = await callOllamaAPI(conversation, ollamaEndpoint, ollamaModel);
          replyContent = await readStream(response, 'openai', setStreamingText);
      } else if (aiProvider === 'openrouter') {
          const response = await callOpenRouterAPI(conversation, aiApiKey, openrouterModel);
          replyContent = await readStream(response, 'openai', setStreamingText);
      } else {
          // openai or custom
          const response = await callOpenAIAPI(conversation, aiApiKey, aiCustomEndpoint, aiProvider);
          replyContent = await readStream(response, 'openai', setStreamingText);
      }
      
      // Parse for Agentic Commands
      const actions = [];
      let parsedAgentThought = '';
      let parsedAgentStatus = '';
      
      const tagRegex = /<CMD>([\s\S]*?)<\/CMD>/g;
      
      // Parse structured JSON block for Auto-Pilot
      const mdJsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
      let mdMatch;
      while ((mdMatch = mdJsonRegex.exec(replyContent)) !== null) {
          try { 
              const parsed = JSON.parse(mdMatch[1].trim());
              if (parsed.thought) parsedAgentThought = parsed.thought;
              if (parsed.status) parsedAgentStatus = parsed.status;
              if (parsed.action) {
                  // The action might be a nested object or a string with <CMD>
                  if (typeof parsed.action === 'object' && parsed.action.action) {
                      actions.push(parsed.action);
                  } else if (typeof parsed.action === 'string') {
                      if (parsed.action === 'STOP') {
                          actions.push({ action: 'STOP' });
                      } else {
                          const innerMatch = tagRegex.exec(parsed.action);
                          if (innerMatch) {
                              actions.push(JSON.parse(innerMatch[1].trim()));
                          } else {
                              try { actions.push(JSON.parse(parsed.action)); } catch(e) {}
                          }
                      }
                  }
              }
          } catch(e) {}
      }

      // Legacy fallback check for wrapped commands if the JSON parser missed it
      let match;
      while ((match = tagRegex.exec(replyContent)) !== null) {
          try { 
              const parsed = JSON.parse(match[1].trim());
              if (!actions.find(a => JSON.stringify(a) === JSON.stringify(parsed))) {
                  actions.push(parsed);
              }
          } catch(e) {}
      }
      
      // Secondary fallback: Just find the first `{` and last `}`
      if (actions.length === 0) {
          const firstBrace = replyContent.indexOf('{');
          const lastBrace = replyContent.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
              try {
                  const parsed = JSON.parse(replyContent.substring(firstBrace, lastBrace + 1));
                  if (parsed.thought) parsedAgentThought = parsed.thought;
                  if (parsed.status) parsedAgentStatus = parsed.status;
                  if (parsed.action && typeof parsed.action === 'object') {
                      actions.push(parsed.action);
                  } else if (parsed.action && typeof parsed.action === 'string') {
                      if (parsed.action === 'STOP') {
                          actions.push({ action: 'STOP' });
                      } else {
                          const innerMatch = tagRegex.exec(parsed.action);
                          if (innerMatch) actions.push(JSON.parse(innerMatch[1].trim()));
                      }
                  } else if (parsed.action) {
                      actions.push(parsed);
                  }
              } catch(e) {}
          }
      }

      if (isAutoPilot) {
         setAgentState(prev => ({
            ...prev,
            status: 'executing',
            thought: parsedAgentThought || prev.thought || 'Analyzing the current screen and figuring out the next step...',
            actionStatus: parsedAgentStatus || 'Executing interaction...'
         }));
      }

      // ── Chat display cleanup ──────────────────────────────────────────────
      // Strip ALL JSON-looking blocks (fenced or bare) so they never appear in chat
      replyContent = replyContent
          .replace(/```(?:json|javascript|js)?\s*[\s\S]*?```/gi, '')  // any code fence
          .replace(/\{[\s\S]*?"(?:thought|action|status)"[\s\S]*?\}/g, '') // bare JSON objects
          .replace(/<CMD>[\s\S]*?<\/CMD>/g, '')   // legacy CMD tags
          .replace(/^\s*[\r\n]+/gm, '\n')         // collapse blank lines
          .trim();

      // In agent mode: if we parsed real actions, suppress the message entirely.
      // The agentState overlay already shows thought / status / progress to the user.
      // Only show a chat bubble when the AI responded in plain English (no actions found).
      if (isAuto && actions.length > 0) {
          // silence — agentState UI handles display
      } else if (replyContent) {
          setMessages(prev => [...prev, { role: 'assistant', content: replyContent }]);
      } else if (!isAuto) {
          setMessages(prev => [...prev, { role: 'assistant', content: '✅ Command executed autonomously.' }]);
      }
      setStreamingText('');

      let shouldContinue = false;
      let continueDelay = 2000;

      // Autonomous Execution Engine
      let executionFeedback = '';
      
      // Autonomous Execution Engine
      for (const action of actions) {
         if (action.action === 'NEW_TAB') {
             store.createTab(action.url, 'Loading...');
         } else if (action.action === 'NAVIGATE') {
             store.updateTab(store.activeTabId, { url: action.url });
         } else if (action.action === 'SEARCH') {
             store.createTab('https://www.google.com/search?q=' + encodeURIComponent(action.query), 'Search: ' + action.query);
         } else if (action.action === 'CLOSE_TAB') {
             store.closeTab(store.activeTabId);
         } else if (action.action === 'OPEN_SETTINGS') {
             store.setIsSettingsOpen(true);
         } else if (action.action === 'TAKE_NOTE') {
             store.setQuickNote(action.note);
             if (store.activeSidebarItem !== 'Home') store.createTab('', 'Dashboard');
         } else if (action.action === 'SPEAK') {
             setIsSpeaking(true);
             const utterance = new SpeechSynthesisUtterance(action.text);
             utterance.rate = 1.05;
             utterance.pitch = 1.0;
             utterance.onend = () => {
                 setIsSpeaking(false);
                 if (isContinuousRef.current) {
                     setTimeout(() => { toggleVoice(true); }, 400);
                 }
             };
             utterance.onerror = () => { setIsSpeaking(false); };
             window.speechSynthesis.speak(utterance);
         } else if (action.action === 'EXECUTE_JS') {
               if (window.apexBrowserControls && window.apexBrowserControls.executeJS) {
                   if (isAutoPilot) {
                       // Agent Mode: auto-execute without confirmation — user opted in
                       try {
                           await window.apexBrowserControls.executeJS(action.code);
                           executionFeedback += `\n[SUCCESS: EXECUTE_JS completed successfully]`;
                       } catch (err) {
                           executionFeedback += `\n[ERROR: EXECUTE_JS failed with error: ${err.message}. Fix your Javascript code!]`;
                       }
                   } else {
                       // S2 FIX: Require user confirmation in normal chat mode
                       const codePreview = (action.code || '').substring(0, 300);
                       showConfirmModal(
                         'Apex AI wants to execute JavaScript',
                         codePreview + (action.code?.length > 300 ? '\n...(truncated)' : ''),
                         () => window.apexBrowserControls.executeJS(action.code)
                       );
                   }
               }
         } else if (action.action === 'STOP') {
             shouldContinue = false;
             setIsAutoPilot(false);
             isAutoPilotRef.current = false;
             agentStepCountRef.current = 0;
             loopFailCountRef.current = 0;
         } else if (action.action === 'CONTINUE_AUTOMATION') {
             shouldContinue = true;
             continueDelay = action.delay || 2000;
         }
      }

      // B8 FIX: If user spoke (isVoice) but no SPEAK action was found, auto-speak the reply
      if (isVoice && !actions.find(a => a.action === 'SPEAK') && replyContent && isContinuousRef.current) {
          setIsSpeaking(true);
          const fallbackText = replyContent.replace(/[*#_`~>]/g, '').substring(0, 500);
          const utterance = new SpeechSynthesisUtterance(fallbackText);
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          utterance.onend = () => {
              setIsSpeaking(false);
              if (isContinuousRef.current) {
                  setTimeout(() => { toggleVoice(true); }, 400);
              }
          };
          utterance.onerror = () => { setIsSpeaking(false); };
          window.speechSynthesis.speak(utterance);
      }

      if (shouldContinue || (isAutoPilotRef.current && !actions.find(a => a.action === 'STOP'))) {
         // Increment step counter
         agentStepCountRef.current += 1;
         
         // Hard max-step guard — prevents infinite loops even if AI never outputs STOP
         if (agentStepCountRef.current >= 20) {
             setMessages(prev => [...prev, { role: 'assistant', content: '✅ **Auto-Pilot Complete:** Reached the 20-step safety limit. Task concluded.' }]);
             setIsAutoPilot(false);
             isAutoPilotRef.current = false;
             setAutomationQueue(null);
             agentStepCountRef.current = 0;
             loopFailCountRef.current = 0;
         } else {
             let nextPrompt = "";
             if (actions.length === 0) {
                 loopFailCountRef.current += 1;
                 nextPrompt = `[AGENT] No JSON block found. Reply with ONLY this format — no extra text:\n\`\`\`json\n{"thought":"...","status":"...","action":{"action":"NAVIGATE","url":"https://..."}}\n\`\`\`\nIf task is done: {"thought":"done","status":"complete","action":"STOP"}`;
             } else if (executionFeedback.includes('[ERROR')) {
                 loopFailCountRef.current += 1;
                 nextPrompt = `[AGENT ERROR]${executionFeedback}\nFix your JS (add null checks, try simpler selectors). Output ONE corrected JSON block, or STOP if the task cannot continue.`;
             } else {
                 loopFailCountRef.current = 0;
                 nextPrompt = `[AGENT STEP ${agentStepCountRef.current}] Action succeeded.${executionFeedback ? '\n' + executionFeedback : ''}\nCheck updated screen. If task is FULLY DONE → output STOP. Otherwise → output the next single JSON step.`;
             }

             if (loopFailCountRef.current >= 2) {
                 setMessages(prev => [...prev, { role: 'assistant', content: '🚨 **Auto-Pilot Aborted:** Failed to produce valid JSON commands 2 times in a row. Please try again with a clearer task.' }]);
                 setIsAutoPilot(false);
                 isAutoPilotRef.current = false;
                 setAutomationQueue(null);
                 agentStepCountRef.current = 0;
                 loopFailCountRef.current = 0;
             } else {
                 setAutomationQueue({
                     prompt: nextPrompt,
                     delay: continueDelay
                 });
             }
         }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `🚨 **Error:** ${err.message}` }]);
      setStreamingText('');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearChat = () => {
    if (messages.length > 2) {
       const userQuestion = messages.find(m => m.role === 'user')?.content.replace(/\[PAGE TEXT CONTENT:\][\s\S]*|.*Context: Currently viewing.*/g, '');
       const sessionName = (userQuestion && userQuestion.substring(0, 40)) || 'Chat Session';
       setAiPastSessions([{ id: Date.now(), name: sessionName + '...', messages: [...messages] }, ...(aiPastSessions || [])]);
    }
    
    const fresh = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'assistant', content: '**Chat cleared!** 🧹 Your previous session was saved to History. How can I help you next?' }
    ];
    setMessages(fresh);
    setAiChatHistory(fresh);
  };

  // Returns UI directly, conditional rendering handled by parent App.jsx
  return (
    <div className={`copilot-sidebar ${darkMode ? 'dark-mode' : ''}`}>
      <div className="copilot-header">
        <Bot size={22} color="#00d4ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.4))' }} />
        <h3 style={{ fontSize: '18px', letterSpacing: '0.5px', whiteSpace: 'nowrap', margin: 0 }}>Apex AI</h3>
        
        {/* Premium Animated Local / Cloud Toggle */}
        <div style={{ position: 'relative', display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '24px', padding: '4px', marginLeft: 'auto', marginRight: '14px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)', width: '124px', flexShrink: 0 }}>
           {/* Animated Background Pill */}
           <div style={{ position: 'absolute', top: '4px', bottom: '4px', left: '4px', width: 'calc(50% - 4px)', transform: aiProvider !== 'ollama' ? 'translateX(0)' : 'translateX(100%)', background: aiProvider !== 'ollama' ? 'linear-gradient(135deg, #00d4ff, #007aff)' : 'linear-gradient(135deg, #bf00ff, #7a00ff)', borderRadius: '20px', transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.4, 1), background 0.4s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', pointerEvents: 'none' }} />
           
           <button onClick={() => setAiProvider('gemini')} style={{ position: 'relative', zIndex: 1, flex: 1, border: 'none', background: 'transparent', color: aiProvider !== 'ollama' ? '#fff' : '#777', padding: '4px 0', borderRadius: '20px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'color 0.3s ease', textShadow: aiProvider !== 'ollama' ? '0 1px 3px rgba(0,0,0,0.6)' : 'none' }}>
              <Cloud size={12} strokeWidth={2.5} /> Cloud
           </button>
           <button onClick={() => setAiProvider('ollama')} style={{ position: 'relative', zIndex: 1, flex: 1, border: 'none', background: 'transparent', color: aiProvider === 'ollama' ? '#fff' : '#777', padding: '4px 0', borderRadius: '20px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'color 0.3s ease', textShadow: aiProvider === 'ollama' ? '0 1px 3px rgba(0,0,0,0.6)' : 'none' }}>
              <Cpu size={12} strokeWidth={2.5} /> Local
           </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
           <button className="dark-mode-toggle no-drag" onClick={() => setIsHistoryView(!isHistoryView)} title="View Chat History" style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}>
             <Clock size={14} />
           </button>
           <button className="dark-mode-toggle no-drag" onClick={() => setDarkMode(!darkMode)} title="Toggle Dark Mode" style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}>
             {darkMode ? <Sun size={14} /> : <Moon size={14} />}
           </button>
           <button className="clear-chat-btn no-drag" onClick={clearChat} title="Clear Context" style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', marginRight: '8px' }}>
             <Eraser size={14} />
           </button>
           <X size={18} className="close-btn no-drag" onClick={() => setIsCopilotOpen(false)} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      {isHistoryView ? (
        <div className="copilot-body" style={{ padding: '16px' }}>
            <h4 style={{ color: '#00d4ff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={18} /> Chat History</h4>
            {(!aiPastSessions || aiPastSessions.length === 0) ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>No past sessions found.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {aiPastSessions.map(session => (
                        <div key={session.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <h5 style={{ margin: 0, color: '#fff', fontSize: '14px', wordBreak: 'break-all' }}>{session.name}</h5>
                                <button onClick={() => setAiPastSessions(aiPastSessions.filter(s => s.id !== session.id))} style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', opacity: 0.7 }} title="Delete Session"><X size={14}/></button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <span style={{ color: '#a0a0b0', fontSize: '11px' }}>{new Date(session.id).toLocaleString()}</span>
                               <button onClick={() => { setMessages(session.messages); setIsHistoryView(false); }} style={{ background: '#00d4ff', color: '#000', border: 'none', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Resume Chat</button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => setAiPastSessions([])} style={{ background: '#ff4757', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', marginTop: '16px', cursor: 'pointer', fontWeight: 'bold' }}>Clear All History</button>
                </div>
            )}
        </div>
      ) : (
        <div className="copilot-body" ref={chatBodyRef}>
        {/* Agent Mode Banner / Commet UI */}
        {isAutoPilot && (
          <div style={{
            margin: '0 8px 12px 8px',
            background: 'linear-gradient(135deg, rgba(30,30,40,0.8), rgba(20,20,30,0.9))',
            border: '1px solid rgba(0,212,255,0.3)', borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: agentState.status === 'executing' ? '#00ffcc' : agentState.status === 'error' ? '#ff0055' : '#00d4ff', boxShadow: `0 0 8px ${agentState.status === 'executing' ? '#00ffcc' : agentState.status === 'error' ? '#ff0055' : '#00d4ff'}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                 <span style={{ color: '#fff', fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>AGENT ACTIVITY</span>
               </div>
               <button onClick={() => { setIsAutoPilot(false); isAutoPilotRef.current = false; setAutomationQueue(null); }} style={{ background: 'rgba(255,0,85,0.15)', border: '1px solid rgba(255,0,85,0.4)', color: '#ff0055', fontSize: '10px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer' }}>ABORT</button>
            </div>
            
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                 <div style={{ marginTop: '2px', color: '#a0a0b0' }}>🧠</div>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#a0a0b0', textTransform: 'uppercase' }}>Thinking</div>
                   <div style={{ fontSize: '13px', color: '#e0e0e0', lineHeight: '1.4' }}>{agentState.thought || 'Analyzing screen context...'}</div>
                 </div>
               </div>
               
               <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                 <div style={{ marginTop: '2px', color: '#00d4ff' }}>⚡</div>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#00d4ff', textTransform: 'uppercase' }}>Executing</div>
                   <div style={{ fontSize: '13px', color: '#fff', lineHeight: '1.4' }}>{agentState.actionStatus || 'Processing next command...'}</div>
                 </div>
               </div>
               
               {isGenerating && (
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                   <Loader2 size={14} className="spin-icon" color="#00ffcc" />
                   <span style={{ fontSize: '12px', color: '#00ffcc' }}>📸 Observing updated screen...</span>
                 </div>
               )}
            </div>
          </div>
        )}

        {messages.filter(m => m.role !== 'system').map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'assistant' && <Bot size={14} className="bot-icon" />}
            <div className="msg-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(msg.content), PURIFY_CONFIG) }} />
          </div>
        ))}
        
        {isGenerating && streamingText && (
          <div className="chat-bubble assistant">
             <Bot size={14} className="bot-icon" />
             <div className="msg-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(streamingText), PURIFY_CONFIG) }} />
          </div>
        )}

        {isGenerating && !streamingText && (
          <div className="chat-bubble assistant">
             <Loader2 size={14} className="spin-icon" /> <span style={{opacity:0.6, fontSize:'12px'}}>Thinking...</span>
          </div>
        )}

        {isListening && (
          <div className="siri-wave-container">
             <div className="siri-orb"></div>
             <div className="siri-wave"></div>
             <span style={{ fontSize: '11px', color: '#00d4ff', position: 'absolute', bottom: '0' }}>Listening...</span>
          </div>
        )}

        {isSpeaking && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', margin: '8px 12px', background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(191,0,255,0.08))', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.2)' }}>
             <Volume2 size={16} color="#00d4ff" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
             <span style={{ fontSize: '12px', color: '#00d4ff', fontWeight: '600' }}>Speaking...</span>
          </div>
        )}
      </div>
      )}

      {!aiApiKey && aiProvider !== 'custom' && aiProvider !== 'ollama' ? (
        <div className="copilot-init-area" style={{ overflowY: 'auto' }}>
          <KeyRound size={32} color="rgba(255,255,255,0.2)" style={{marginBottom: '12px'}} />
          <h4 style={{color:'#fff', margin:'0 0 8px 0'}}>API Key Required</h4>
          <p className="subtext" style={{marginTop:0}}>Power Apex AI with Gemini or Groq.</p>
          <button className="init-btn" onClick={() => setIsSettingsOpen(true)}>
             <SettingsIcon size={16} /> Open Settings
          </button>
          
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '24px 0 8px 0' }} />
          
          <OneClickAI />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Context Actions Container */}
          <div style={{ display: 'flex', gap: '8px', padding: '0 12px 12px 12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
             <button onClick={() => handleSend("Summarize the current page content briefly.", false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 212, 255, 0.2))', border: '1px solid rgba(0, 212, 255, 0.3)', color: '#00d4ff', padding: '8px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', boxShadow: '0 4px 12px rgba(0, 212, 255, 0.1)' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
                <FileText size={14} /> Summarize Page
             </button>
             <button onClick={() => handleSend("Generate a detailed markdown Mind Map of this page's concepts using bullet points.", false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(191, 0, 255, 0.1), rgba(191, 0, 255, 0.2))', border: '1px solid rgba(191, 0, 255, 0.3)', color: '#d466ff', padding: '8px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', boxShadow: '0 4px 12px rgba(191, 0, 255, 0.1)' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
                <Network size={14} /> Mind Map
             </button>
             <button onClick={() => handleSend("Extract the key study notes, dates, concepts, and formulas from this page.", false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(0, 255, 204, 0.1), rgba(0, 255, 204, 0.2))', border: '1px solid rgba(0, 255, 204, 0.3)', color: '#00ffcc', padding: '8px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', boxShadow: '0 4px 12px rgba(0, 255, 204, 0.1)' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
                <Edit3 size={14} /> Extract Notes
             </button>
          </div>

          {isContinuousVoice && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '6px 12px', background: 'linear-gradient(135deg, rgba(255,0,85,0.06), rgba(255,0,85,0.12))', borderTop: '1px solid rgba(255,0,85,0.2)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff0055', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '11px', color: '#ff0055', fontWeight: '600', letterSpacing: '0.5px' }}>
                {isSpeaking ? '🔊 AI Speaking...' : isListening ? '🎤 Listening...' : isGenerating ? '🧠 Thinking...' : '⏳ Waiting...'}
              </span>
              <button onClick={() => { setIsContinuousVoice(false); isContinuousRef.current = false; window.speechSynthesis.cancel(); }} style={{ marginLeft: 'auto', background: 'rgba(255,0,85,0.15)', border: '1px solid rgba(255,0,85,0.3)', color: '#ff0055', fontSize: '10px', fontWeight: '700', padding: '2px 10px', borderRadius: '100px', cursor: 'pointer' }}>END</button>
            </div>
          )}
          <div className="copilot-input-area" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderRadius: '0' }}>
            <button onClick={() => toggleVoice(false)} className={`voice-btn no-drag ${(isListening || isContinuousVoice) ? 'listening' : ''}`} style={{ boxShadow: isContinuousVoice ? '0 0 15px rgba(255, 0, 85, 0.4)' : 'none', border: isContinuousVoice ? '1px solid #ff0055' : 'none' }}>
               {(isListening || isContinuousVoice) ? <Mic size={16} color="#ff0055" /> : <MicOff size={16} />}
            </button>
            <input 
              className="no-drag"
              type="text" 
              placeholder={`Ask Apex anything... (${aiProvider.toUpperCase()})`} 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(null, false)}
              disabled={isGenerating}
            />
            <button onClick={() => handleSend(null, false)} disabled={!input.trim() || isGenerating} className="send-btn no-drag">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}


    </div>
  );
}

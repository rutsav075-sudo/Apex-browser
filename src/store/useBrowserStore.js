import { create } from 'zustand';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { pushData, pushPasswords, isSyncingFromRemote } from '../services/SyncService';

// ============================================================
// Slice: Tab Management
// ============================================================
// #40 FIX: Restore session tabs on startup
const savedSession = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION_TABS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return null;
})();

const createTabSlice = (set, get) => ({
  tabs: savedSession || [{ id: 1, url: '', title: 'New Tab', isPinned: false }],
  activeTabId: savedSession ? savedSession[savedSession.length - 1].id : 1,
  recentlyClosed: JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENTLY_CLOSED) || '[]'),
  undoToast: null, // { tab, timeoutId } for undo close tab toast (#34)

  // Tab Groups (Chrome-style)
  tabGroups: JSON.parse(localStorage.getItem('apex_tab_groups') || '[]'),
  // { id, name, color, collapsed, tabIds: [] }
  createTabGroup: (name, color, tabIds = []) => set(state => {
    const group = { id: Date.now(), name, color: color || '#4285f4', collapsed: false, tabIds };
    const updated = [...state.tabGroups, group];
    localStorage.setItem('apex_tab_groups', JSON.stringify(updated));
    return { tabGroups: updated };
  }),
  addTabToGroup: (groupId, tabId) => set(state => {
    const updated = state.tabGroups.map(g =>
      g.id === groupId ? { ...g, tabIds: [...new Set([...g.tabIds, tabId])] } : g
    );
    localStorage.setItem('apex_tab_groups', JSON.stringify(updated));
    return { tabGroups: updated };
  }),
  removeTabFromGroup: (tabId) => set(state => {
    const updated = state.tabGroups.map(g => ({
      ...g, tabIds: g.tabIds.filter(id => id !== tabId)
    })).filter(g => g.tabIds.length > 0); // Auto-delete empty groups
    localStorage.setItem('apex_tab_groups', JSON.stringify(updated));
    return { tabGroups: updated };
  }),
  toggleGroupCollapse: (groupId) => set(state => {
    const updated = state.tabGroups.map(g =>
      g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
    );
    localStorage.setItem('apex_tab_groups', JSON.stringify(updated));
    return { tabGroups: updated };
  }),
  deleteTabGroup: (groupId) => set(state => {
    const updated = state.tabGroups.filter(g => g.id !== groupId);
    localStorage.setItem('apex_tab_groups', JSON.stringify(updated));
    return { tabGroups: updated };
  }),

  createTab: (presetUrl = '', presetTitle = 'New Tab', inBackground = false) => {
    const newId = Date.now();
    set((state) => {
      const newTabs = [...state.tabs, { id: newId, url: presetUrl, title: presetTitle, isPinned: false }];
      localStorage.setItem(STORAGE_KEYS.SESSION_TABS, JSON.stringify(newTabs)); // #40
      return {
        tabs: newTabs,
        activeTabId: inBackground ? state.activeTabId : newId,
        searchQuery: inBackground ? state.searchQuery : presetUrl,
        suspendedTabs: state.suspendedTabs.filter(id => id !== newId)
      };
    });
    // Sync open tabs to cloud
    import('../services/SyncService').then(({ pushOpenTabs, isSyncReady }) => {
      if (isSyncReady()) pushOpenTabs(useBrowserStore.getState().tabs);
    });
  },

  closeTab: (idToClose) => {
    set((state) => {
      if (state.tabs.length === 1) return state;
      const closedTab = state.tabs.find(t => t.id === idToClose);
      const newTabs = state.tabs.filter(t => t.id !== idToClose);
      const isClosingActive = state.activeTabId === idToClose;
      const newActiveId = isClosingActive ? newTabs[newTabs.length - 1].id : state.activeTabId;
      const newSearchQuery = isClosingActive ? newTabs[newTabs.length - 1].url : state.searchQuery;

      const updated = closedTab && closedTab.url ?
        [{ url: closedTab.url, title: closedTab.title, closedAt: Date.now() }, ...state.recentlyClosed].slice(0, 10) :
        state.recentlyClosed;
      localStorage.setItem(STORAGE_KEYS.RECENTLY_CLOSED, JSON.stringify(updated));

      // #40: Persist session
      localStorage.setItem(STORAGE_KEYS.SESSION_TABS, JSON.stringify(newTabs));

      // #34: Undo toast — clear previous timeout
      if (state.undoToast?.timeoutId) clearTimeout(state.undoToast.timeoutId);
      const toastTimeout = closedTab?.url ? setTimeout(() => {
        useBrowserStore.setState({ undoToast: null });
      }, 5000) : null;

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
        searchQuery: newSearchQuery,
        suspendedTabs: state.suspendedTabs.filter(id => id !== idToClose),
        recentlyClosed: updated,
        undoToast: closedTab?.url ? { tab: closedTab, timeoutId: toastTimeout } : null
      };
    });
    // Sync open tabs to cloud after close
    import('../services/SyncService').then(({ pushOpenTabs, isSyncReady }) => {
      if (isSyncReady()) pushOpenTabs(useBrowserStore.getState().tabs);
    });
  },
  dismissUndoToast: () => set((state) => {
    if (state.undoToast?.timeoutId) clearTimeout(state.undoToast.timeoutId);
    return { undoToast: null };
  }),

  reopenLastClosed: () => {
    set((state) => {
      if (state.recentlyClosed.length === 0) return state;
      const [last, ...rest] = state.recentlyClosed;
      const newId = Date.now();
      localStorage.setItem(STORAGE_KEYS.RECENTLY_CLOSED, JSON.stringify(rest));
      return {
        tabs: [...state.tabs, { id: newId, url: last.url, title: last.title, isPinned: false }],
        activeTabId: newId,
        searchQuery: last.url,
        recentlyClosed: rest
      };
    });
  },

  // Task Manager (Shift+Esc)
  showTaskManager: false,
  setShowTaskManager: (v) => set({ showTaskManager: v }),

  updateTab: (id, updates) => {
    set((state) => {
      const newTabs = state.tabs.map(t => t.id === id ? { ...t, ...updates } : t);
      localStorage.setItem(STORAGE_KEYS.SESSION_TABS, JSON.stringify(newTabs)); // #40
      return { tabs: newTabs };
    });
    // Sync open tabs if URL changed
    if (updates.url !== undefined) {
      import('../services/SyncService').then(({ pushOpenTabs, isSyncReady }) => {
        if (isSyncReady()) pushOpenTabs(useBrowserStore.getState().tabs);
      });
    }
  },

  togglePinTab: (id) => {
    set((state) => {
      const toggled = state.tabs.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t);
      // Ensure pinned tabs are grouped securely at the start so drag-and-drop indices always match (#10)
      const newTabs = [...toggled].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
      localStorage.setItem(STORAGE_KEYS.SESSION_TABS, JSON.stringify(newTabs));
      return { tabs: newTabs };
    });
  },

  reorderTabs: (fromIndex, toIndex) => {
    set((state) => {
      const newTabs = [...state.tabs];
      const movedTab = newTabs[fromIndex];
      const targetTab = newTabs[toIndex];
      
      // Prevent mixing pinned and unpinned tabs
      if (movedTab.isPinned !== targetTab.isPinned) return state;

      newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);
      localStorage.setItem(STORAGE_KEYS.SESSION_TABS, JSON.stringify(newTabs));
      return { tabs: newTabs };
    });
  },

  setActiveTabId: (id) => {
    set((state) => {
      const tab = state.tabs.find(t => t.id === id);
      return {
        activeTabId: id,
        searchQuery: tab ? (tab.internalUrl || tab.url) : state.searchQuery,
        suspendedTabs: state.suspendedTabs.filter(sId => sId !== id)
      };
    });
  },
  
  splitScreenTabId: null,
  setSplitScreenTabId: (id) => set({ splitScreenTabId: id }),
});

// ============================================================
// Slice: Performance & Memory (Turbo Mode)
// ============================================================
const createPerformanceSlice = (set) => ({
  isTurboActive: false,
  setIsTurboActive: (val) => set({ isTurboActive: val }),
  suspendedTabs: [],
  suspendBackgroundTabs: () => {
    set((state) => {
      const backgroundIds = state.tabs
        .filter(t => t.id !== state.activeTabId && t.url !== '')
        .map(t => t.id);
      return { suspendedTabs: Array.from(new Set([...state.suspendedTabs, ...backgroundIds])) };
    });
  },
  
  // #18: Auto-discard tabs after inactivity
  autoDiscardEnabled: localStorage.getItem(STORAGE_KEYS.AUTO_DISCARD) !== 'false',
  setAutoDiscardEnabled: (val) => {
    localStorage.setItem(STORAGE_KEYS.AUTO_DISCARD, val ? 'true' : 'false');
    set({ autoDiscardEnabled: val });
  },
  tabLastActive: {},  // { [tabId]: timestamp }
  markTabActive: (tabId) => set((state) => ({
    tabLastActive: { ...state.tabLastActive, [tabId]: Date.now() }
  })),
  autoDiscardStale: (maxAgeMs = 5 * 60 * 1000) => {
    set((state) => {
      if (!state.autoDiscardEnabled) return state;
      const now = Date.now();
      const staleIds = state.tabs
        .filter(t => t.id !== state.activeTabId && t.url !== '' && !t.isPinned)
        .filter(t => {
          const lastActive = state.tabLastActive[t.id] || 0;
          return lastActive > 0 && (now - lastActive) > maxAgeMs;
        })
        .map(t => t.id);
      if (staleIds.length === 0) return state;
      return { suspendedTabs: Array.from(new Set([...state.suspendedTabs, ...staleIds])) };
    });
  },
  
  isGamingMode: localStorage.getItem(STORAGE_KEYS.GAMING_MODE) === 'true',
  setIsGamingMode: (val) => {
    localStorage.setItem(STORAGE_KEYS.GAMING_MODE, val);
    set({ isGamingMode: val });
  },

  isFocusMode: localStorage.getItem(STORAGE_KEYS.FOCUS_MODE) === 'true',
  setIsFocusMode: (val) => {
    localStorage.setItem(STORAGE_KEYS.FOCUS_MODE, val);
    set({ isFocusMode: val });
  },
});

// ============================================================
// Slice: AI Copilot
// ============================================================
const createAISlice = (set) => ({
  isCopilotOpen: false,
  setIsCopilotOpen: (val) => set((state) => ({ isCopilotOpen: typeof val === 'function' ? val(state.isCopilotOpen) : val })),
  actionEngineTask: null,
  setActionEngineTask: (val) => set({ actionEngineTask: val }),
  aiApiKey: '',
  setAiApiKey: async (val) => {
    // S4 FIX: Only persist via OS keychain, fallback to plain localStorage for web
    if (window.electronAPI?.safeStoreKey) {
       const encrypted = await window.electronAPI.safeStoreKey(val);
       if (encrypted) {
           localStorage.setItem(STORAGE_KEYS.AI_API_KEY_SECURE, encrypted);
           // Remove plaintext key if we successfully saved it securely
           localStorage.removeItem(STORAGE_KEYS.AI_API_KEY);
        }
    } else {
       // Fallback for standard web environment
       localStorage.setItem(STORAGE_KEYS.AI_API_KEY, val);
    }
    set({ aiApiKey: val });
  },
  loadAiApiKey: async () => {
    // S4 FIX: Only load from secure storage; migrate legacy keys
    if (window.electronAPI?.safeReadKey) {
       const encrypted = localStorage.getItem(STORAGE_KEYS.AI_API_KEY_SECURE);
       if (encrypted) {
           const decrypted = await window.electronAPI.safeReadKey(encrypted);
           if (decrypted) { set({ aiApiKey: decrypted }); return; }
       }
    }
    // Migrate legacy plaintext key to secure storage then delete it, or use it as fallback
    const fallback = localStorage.getItem(STORAGE_KEYS.AI_API_KEY);
    if (fallback) {
       set({ aiApiKey: fallback });
       if (window.electronAPI?.safeStoreKey) {
           const encrypted = await window.electronAPI.safeStoreKey(fallback);
           if (encrypted) {
               localStorage.setItem(STORAGE_KEYS.AI_API_KEY_SECURE, encrypted);
               localStorage.removeItem(STORAGE_KEYS.AI_API_KEY);
           }
       }
    }
  },
  aiProvider: localStorage.getItem(STORAGE_KEYS.AI_PROVIDER) || 'gemini',
  setAiProvider: (val) => {
    localStorage.setItem(STORAGE_KEYS.AI_PROVIDER, val);
    set({ aiProvider: val });
  },
  aiCustomEndpoint: localStorage.getItem(STORAGE_KEYS.AI_CUSTOM_URL) || '',
  setAiCustomEndpoint: (val) => {
    localStorage.setItem(STORAGE_KEYS.AI_CUSTOM_URL, val);
    set({ aiCustomEndpoint: val });
  },
  micEnabled: localStorage.getItem(STORAGE_KEYS.MIC_ENABLED) === 'true',
  setMicEnabled: (val) => {
    localStorage.setItem(STORAGE_KEYS.MIC_ENABLED, val);
    set({ micEnabled: val });
  },
  ollamaEndpoint: localStorage.getItem(STORAGE_KEYS.OLLAMA_URL) || 'http://localhost:11434',
  setOllamaEndpoint: (val) => {
    localStorage.setItem(STORAGE_KEYS.OLLAMA_URL, val);
    set({ ollamaEndpoint: val });
  },
  ollamaModel: localStorage.getItem(STORAGE_KEYS.OLLAMA_MODEL) || 'llama3',
  setOllamaModel: (val) => {
    localStorage.setItem(STORAGE_KEYS.OLLAMA_MODEL, val);
    set({ ollamaModel: val });
  },
  openrouterModel: localStorage.getItem('apex_openrouter_model') || 'meta-llama/llama-3.2-3b-instruct:free',
  setOpenrouterModel: (val) => {
    localStorage.setItem('apex_openrouter_model', val);
    set({ openrouterModel: val });
  },
  aiChatHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.AI_CHAT) || 'null'),
  setAiChatHistory: (messages) => {
    localStorage.setItem(STORAGE_KEYS.AI_CHAT, JSON.stringify(messages));
    set({ aiChatHistory: messages });
  },
  aiPastSessions: JSON.parse(localStorage.getItem(STORAGE_KEYS.AI_SESSIONS) || '[]'),
  setAiPastSessions: (sessions) => {
    localStorage.setItem(STORAGE_KEYS.AI_SESSIONS, JSON.stringify(sessions));
    set({ aiPastSessions: sessions });
  },
  localAIReady: false,
  setLocalAIReady: (val) => set({ localAIReady: val }),
});

// ============================================================
// Slice: Bookmarks & Search
// ============================================================
const createBookmarkSlice = (set) => ({
  bookmarks: [], // Init empty, will load from SQLite
  bookmarkFolders: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARK_FOLDERS) || '[]'),
  
  loadBookmarks: async () => {
    if (window.electronAPI?.getBookmarks) {
       const res = await window.electronAPI.getBookmarks();
       if (res.success) {
          set({ bookmarks: res.bookmarks });
       }
    } else {
       set({ bookmarks: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]') });
    }
  },

  createBookmarkFolder: (name) => {
    set((state) => {
      const updated = [...state.bookmarkFolders, { id: Date.now(), name }];
      localStorage.setItem(STORAGE_KEYS.BOOKMARK_FOLDERS, JSON.stringify(updated));
      if (!isSyncingFromRemote()) pushData('bookmarkFolders', updated);
      return { bookmarkFolders: updated };
    });
  },
  deleteBookmarkFolder: (id) => {
    set((state) => {
      const updatedFolders = state.bookmarkFolders.filter(f => f.id !== id);
      const updatedBookmarks = state.bookmarks.filter(b => b.folderId !== id);
      localStorage.setItem(STORAGE_KEYS.BOOKMARK_FOLDERS, JSON.stringify(updatedFolders));
      
      if (window.electronAPI?.setBookmarks) {
         window.electronAPI.setBookmarks(updatedBookmarks);
      } else {
         localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updatedBookmarks));
      }
      
      if (!isSyncingFromRemote()) {
        pushData('bookmarkFolders', updatedFolders);
        pushData('bookmarks', updatedBookmarks);
      }
      return { bookmarkFolders: updatedFolders, bookmarks: updatedBookmarks };
    });
  },
  
  addBookmark: (bookmark) => {
    set((state) => {
      const newBookmark = { id: Date.now(), folderId: bookmark.folderId || null, ...bookmark };
      const updated = [...state.bookmarks, newBookmark];
      
      if (window.electronAPI?.addBookmark) {
         window.electronAPI.addBookmark(newBookmark);
      } else {
         localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
      }
      
      // Sync to cloud
      if (!isSyncingFromRemote()) pushData('bookmarks', updated);
      return { bookmarks: updated };
    });
  },
  removeBookmark: (id) => {
    set((state) => {
      const updated = state.bookmarks.filter(b => b.id !== id);
      
      if (window.electronAPI?.removeBookmark) {
         window.electronAPI.removeBookmark(id);
      } else {
         localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
      }
      
      if (!isSyncingFromRemote()) pushData('bookmarks', updated);
      return { bookmarks: updated };
    });
  },

  searchEngine: localStorage.getItem(STORAGE_KEYS.SEARCH_ENGINE) || 'google',
  setSearchEngine: (val) => {
    localStorage.setItem(STORAGE_KEYS.SEARCH_ENGINE, val);
    set({ searchEngine: val });
    // Sync settings to cloud
    setTimeout(() => useBrowserStore.getState().pushSettingsToCloud(), 0);
  },

  isFindOpen: false,
  setIsFindOpen: (val) => set({ isFindOpen: val }),
  findQuery: '',
  setFindQuery: (val) => set({ findQuery: val }),
});

// ============================================================
// Slice: Dashboard Widgets
// ============================================================
const createDashboardSlice = (set, get) => ({
  weatherData: null,
  setWeatherData: (val) => set({ weatherData: val }),

  weatherLocation: JSON.parse(localStorage.getItem(STORAGE_KEYS.WEATHER_LOC) || '{"lat":40.71,"lon":-74.01,"name":"New York"}'),
  setWeatherLocation: (loc) => {
    localStorage.setItem(STORAGE_KEYS.WEATHER_LOC, JSON.stringify(loc));
    set({ weatherLocation: loc });
  },

  stockData: [],
  setStockData: (val) => set({ stockData: val }),

  newsData: [],
  setNewsData: (val) => set({ newsData: val }),

  downloads: [],
  setDownloads: (val) => set({ downloads: typeof val === 'function' ? val(get().downloads) : val }),

  quickNote: localStorage.getItem(STORAGE_KEYS.QUICK_NOTE) || '',
  setQuickNote: (val) => {
    localStorage.setItem(STORAGE_KEYS.QUICK_NOTE, val);
    set({ quickNote: val });
  },

  weatherOffset: 0,
  setWeatherOffset: (val) => set({ weatherOffset: val }),

  calendarOffset: 0,
  setCalendarOffset: (val) => set({ calendarOffset: val }),

  isEditingDashboard: false,
  setIsEditingDashboard: (val) => set({ isEditingDashboard: val }),

  isDashboardBlur: localStorage.getItem(STORAGE_KEYS.DASH_BLUR) === 'true',
  setIsDashboardBlur: (val) => {
    localStorage.setItem(STORAGE_KEYS.DASH_BLUR, val ? 'true' : 'false');
    set({ isDashboardBlur: val });
  },

  dashboardLayout: (() => {
    const defaultLayout = {
      news: { v: true, x: 40, y: 40 },
      weather: { v: true, x: 460, y: 40 },
      calendar: { v: true, x: 800, y: 40 },
      notes: { v: true, x: 800, y: 340 },
      stock: { v: true, x: 460, y: 260 },
      music: { v: true, x: 40, y: 680 },
      clock: { v: true, x: 460, y: 540 }
    };
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.DASH_LAYOUT) || '{}');
    const finalLayout = { ...defaultLayout };
    for (let key in saved) {
      if (finalLayout[key]) {
        finalLayout[key] = { ...finalLayout[key], ...saved[key] };
        if (saved[key].x === undefined) {
          finalLayout[key].x = defaultLayout[key].x;
          finalLayout[key].y = defaultLayout[key].y;
        }
      } else {
        finalLayout[key] = saved[key];
      }
    }
    return finalLayout;
  })(),
  updateDashboardLayout: (layout) => {
    localStorage.setItem(STORAGE_KEYS.DASH_LAYOUT, JSON.stringify(layout));
    set({ dashboardLayout: layout });
  },

  adsBlocked: 0,
  setAdsBlocked: (val) => set({ adsBlocked: val }),
});

// ============================================================
// Slice: UI State
// ============================================================
const createUISlice = (set, get) => ({
  urlInput: '',
  setUrlInput: (val) => set({ urlInput: val }),

  searchQuery: '',
  setSearchQuery: (val) => set({ searchQuery: val }),

  activeSidebarItem: 'Home',
  setActiveSidebarItem: (val) => set({ activeSidebarItem: val }),

  isSidebarCollapsed: false,
  setIsSidebarCollapsed: (val) => set({ isSidebarCollapsed: val }),

  isSettingsOpen: false,
  setIsSettingsOpen: (val) => set({ isSettingsOpen: val }),

  isAddShortcutModalOpen: false,
  setIsAddShortcutModalOpen: (val) => set({ isAddShortcutModalOpen: val }),

  bgImage: (() => {
    let saved = localStorage.getItem(STORAGE_KEYS.BG_IMAGE);
    const DEFAULT_STATIC = 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80&auto=format&fit=crop';
    
    // Override the old 3D default with the new static default for existing users
    // Also auto-repair broken youtube:: URLs from the removed YouTube feature
    if (!saved || saved === 'spline::glass-orbs' || saved.startsWith('youtube::')) {
      saved = DEFAULT_STATIC;
      localStorage.setItem(STORAGE_KEYS.BG_IMAGE, saved);
    }
    // Auto-repair broken file:// URLs from previous builds (Windows backslashes, missing third slash)
    if (saved.includes('file://') && (saved.includes('\\') || !saved.includes('file:///'))) {
      saved = saved.replace(/\\/g, '/').replace('file://', 'file:///').replace('file:////', 'file:///');
      localStorage.setItem(STORAGE_KEYS.BG_IMAGE, saved);
    }
    return saved;
  })(),
  setBgImage: (val) => {
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE, val);
    set({ bgImage: val });
  },

  isLoggedIn: localStorage.getItem('apex_logged_in') === 'true',
  setIsLoggedIn: (val) => {
    localStorage.setItem('apex_logged_in', val ? 'true' : 'false');
    set({ isLoggedIn: val });
  },

  userData: JSON.parse(localStorage.getItem('apex_user_data') || 'null'),
  setUserData: (val) => {
    if (val) {
      localStorage.setItem('apex_user_data', JSON.stringify(val));
    } else {
      localStorage.removeItem('apex_user_data');
    }
    set({ userData: val });
  },

  customShortcuts: JSON.parse(localStorage.getItem(STORAGE_KEYS.SHORTCUTS) || '[]'),
  setCustomShortcuts: (val) => {
    const resolved = typeof val === 'function' ? val(get().customShortcuts) : val;
    localStorage.setItem(STORAGE_KEYS.SHORTCUTS, JSON.stringify(resolved));
    set({ customShortcuts: resolved });
  },

  isExtensionsOpen: false,
  setIsExtensionsOpen: (val) => set({ isExtensionsOpen: val }),

  isBrowserMenuOpen: false,
  setIsBrowserMenuOpen: (val) => set({ isBrowserMenuOpen: val }),

  isWallpaperStoreOpen: false,
  setIsWallpaperStoreOpen: (val) => set({ isWallpaperStoreOpen: val }),

  isWidgetStoreOpen: false,
  setIsWidgetStoreOpen: (val) => set({ isWidgetStoreOpen: val }),

  isRgbOn: localStorage.getItem(STORAGE_KEYS.RGB_ON) !== 'false',
  setIsRgbOn: (val) => {
    localStorage.setItem(STORAGE_KEYS.RGB_ON, val ? 'true' : 'false');
    set({ isRgbOn: val });
  },

  rgbMode: localStorage.getItem(STORAGE_KEYS.RGB_MODE) || 'breathing',
  setRgbMode: (val) => {
    localStorage.setItem(STORAGE_KEYS.RGB_MODE, val);
    set({ rgbMode: val });
  },

  rgbColor: localStorage.getItem(STORAGE_KEYS.RGB_COLOR) || '#00d4ff',
  setRgbColor: (val) => {
    localStorage.setItem(STORAGE_KEYS.RGB_COLOR, val);
    set({ rgbColor: val });
  },

  rgbSpeed: parseInt(localStorage.getItem(STORAGE_KEYS.RGB_SPEED) || '5', 10),
  setRgbSpeed: (val) => {
    localStorage.setItem(STORAGE_KEYS.RGB_SPEED, val.toString());
    set({ rgbSpeed: val });
  },

  isDownloadsOpen: false,
  setIsDownloadsOpen: (val) => set({ isDownloadsOpen: val }),

  isHistoryOpen: false,
  setIsHistoryOpen: (val) => set({ isHistoryOpen: val }),

  darkMode: localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true',
  setDarkMode: (val) => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, val ? 'true' : 'false');
    set({ darkMode: val });
  },

  // #39: Force dark mode on all websites
  forceDarkWebsites: localStorage.getItem(STORAGE_KEYS.FORCE_DARK_WEBSITES) === 'true',
  setForceDarkWebsites: (val) => {
    localStorage.setItem(STORAGE_KEYS.FORCE_DARK_WEBSITES, val ? 'true' : 'false');
    set({ forceDarkWebsites: val });
  },

  language: localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en-US',
  setLanguage: (val) => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, val);
    set({ language: val });
  },

  activeWidgets: JSON.parse(localStorage.getItem(STORAGE_KEYS.WIDGETS) || '["news", "calendar", "weather", "stocks", "notes", "music", "clock"]'),
  setActiveWidgets: (widgetsArr) => {
    localStorage.setItem(STORAGE_KEYS.WIDGETS, JSON.stringify(widgetsArr));
    set({ activeWidgets: widgetsArr });
  },

  extensions: JSON.parse(localStorage.getItem(STORAGE_KEYS.EXTENSIONS) || '{"adblock":true,"vpn":false,"turbo":false,"ai":true}'),
  setExtensions: (extObj) => {
    localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(extObj));
    set({ extensions: extObj });
    if (window.electronAPI?.setAdblock) {
      window.electronAPI.setAdblock(extObj.adblock);
    }
  },

  isPasswordsOpen: false,
  setIsPasswordsOpen: (val) => set({ isPasswordsOpen: val }),
  savedPasswords: [],
  loadPasswords: async () => {
    // S5 FIX: Only load from secure storage
    if (window.electronAPI?.safeReadKey) {
       const enc = localStorage.getItem(STORAGE_KEYS.PASSWORDS_SECURE);
       if (enc) {
           const dec = await window.electronAPI.safeReadKey(enc);
           if (dec) { set({ savedPasswords: JSON.parse(dec) }); return; }
       }
    }
    // Migrate legacy plaintext passwords then delete, or use them as fallback in web
    const fb = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
    if (fb) {
       const parsed = JSON.parse(fb);
       set({ savedPasswords: parsed });
       if (window.electronAPI?.safeStoreKey) {
           const enc = await window.electronAPI.safeStoreKey(fb);
           if (enc) {
               localStorage.setItem(STORAGE_KEYS.PASSWORDS_SECURE, enc);
               localStorage.removeItem(STORAGE_KEYS.PASSWORDS);
           }
       }
    }
  },
  savePasswords: async (pwdArray) => {
    set({ savedPasswords: pwdArray });
    const str = JSON.stringify(pwdArray);
    // S5 FIX: Only persist via OS keychain, fallback to plain localStorage otherwise
    if (window.electronAPI?.safeStoreKey) {
       const enc = await window.electronAPI.safeStoreKey(str);
       if (enc) {
           localStorage.setItem(STORAGE_KEYS.PASSWORDS_SECURE, enc);
           localStorage.removeItem(STORAGE_KEYS.PASSWORDS);
       }
    } else {
       localStorage.setItem(STORAGE_KEYS.PASSWORDS, str);
    }
    // Sync passwords to cloud (encrypted)
    if (!isSyncingFromRemote()) pushPasswords(pwdArray);
  },

  // ============================================================
  // Settings Preferences (persist to localStorage)
  // ============================================================
  showHomeButton: localStorage.getItem(STORAGE_KEYS.SHOW_HOME_BUTTON) !== 'false',
  setShowHomeButton: (val) => { localStorage.setItem(STORAGE_KEYS.SHOW_HOME_BUTTON, val ? 'true' : 'false'); set({ showHomeButton: val }); },

  showBookmarksBar: localStorage.getItem(STORAGE_KEYS.SHOW_BOOKMARKS_BAR) !== 'false',
  setShowBookmarksBar: (val) => { localStorage.setItem(STORAGE_KEYS.SHOW_BOOKMARKS_BAR, val ? 'true' : 'false'); set({ showBookmarksBar: val }); },

  fontSize: localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'medium',
  setFontSize: (val) => { localStorage.setItem(STORAGE_KEYS.FONT_SIZE, val); set({ fontSize: val }); },

  pageZoom: parseInt(localStorage.getItem(STORAGE_KEYS.PAGE_ZOOM) || '100', 10),
  setPageZoom: (val) => { localStorage.setItem(STORAGE_KEYS.PAGE_ZOOM, val.toString()); set({ pageZoom: val }); },

  startupMode: localStorage.getItem(STORAGE_KEYS.STARTUP_MODE) || 'newtab',
  setStartupMode: (val) => { localStorage.setItem(STORAGE_KEYS.STARTUP_MODE, val); set({ startupMode: val }); },

  useTranslate: localStorage.getItem(STORAGE_KEYS.USE_TRANSLATE) !== 'false',
  setUseTranslate: (val) => { localStorage.setItem(STORAGE_KEYS.USE_TRANSLATE, val ? 'true' : 'false'); set({ useTranslate: val }); },

  spellCheck: localStorage.getItem(STORAGE_KEYS.SPELL_CHECK) !== 'false',
  setSpellCheck: (val) => { localStorage.setItem(STORAGE_KEYS.SPELL_CHECK, val ? 'true' : 'false'); set({ spellCheck: val }); },

  askDownloadLocation: localStorage.getItem(STORAGE_KEYS.ASK_DOWNLOAD_LOCATION) === 'true',
  setAskDownloadLocation: (val) => { localStorage.setItem(STORAGE_KEYS.ASK_DOWNLOAD_LOCATION, val ? 'true' : 'false'); set({ askDownloadLocation: val }); },

  downloadsPath: localStorage.getItem(STORAGE_KEYS.DOWNLOADS_PATH) || 'C:\\Users\\Downloads',
  setDownloadsPath: (val) => { localStorage.setItem(STORAGE_KEYS.DOWNLOADS_PATH, val); set({ downloadsPath: val }); },

  askBeforeDownload: localStorage.getItem(STORAGE_KEYS.ASK_DOWNLOAD_LOCATION) === 'true',
  setAskBeforeDownload: (val) => { localStorage.setItem(STORAGE_KEYS.ASK_DOWNLOAD_LOCATION, val ? 'true' : 'false'); set({ askBeforeDownload: val, askDownloadLocation: val }); },

  memorySaver: localStorage.getItem(STORAGE_KEYS.MEMORY_SAVER) !== 'false',
  setMemorySaver: (val) => { localStorage.setItem(STORAGE_KEYS.MEMORY_SAVER, val ? 'true' : 'false'); set({ memorySaver: val }); },

  energySaver: localStorage.getItem(STORAGE_KEYS.ENERGY_SAVER) !== 'false',
  setEnergySaver: (val) => { localStorage.setItem(STORAGE_KEYS.ENERGY_SAVER, val ? 'true' : 'false'); set({ energySaver: val }); },

  preloadPages: localStorage.getItem(STORAGE_KEYS.PRELOAD_PAGES) || 'standard',
  setPreloadPages: (val) => { localStorage.setItem(STORAGE_KEYS.PRELOAD_PAGES, val); set({ preloadPages: val }); },

  bgAppsOnClose: localStorage.getItem(STORAGE_KEYS.BG_APPS_ON_CLOSE) !== 'false',
  setBgAppsOnClose: (val) => { localStorage.setItem(STORAGE_KEYS.BG_APPS_ON_CLOSE, val ? 'true' : 'false'); set({ bgAppsOnClose: val }); },

  hwAcceleration: localStorage.getItem(STORAGE_KEYS.HW_ACCELERATION) !== 'false',
  setHwAcceleration: (val) => { localStorage.setItem(STORAGE_KEYS.HW_ACCELERATION, val ? 'true' : 'false'); set({ hwAcceleration: val }); },

  adBlocker: localStorage.getItem(STORAGE_KEYS.AD_BLOCKER) !== 'false',
  setAdBlocker: (val) => {
    localStorage.setItem(STORAGE_KEYS.AD_BLOCKER, val ? 'true' : 'false');
    set({ adBlocker: val });
    // Sync to main process so Ghostery engine actually toggles
    if (window.electronAPI?.setAdblock) {
      window.electronAPI.setAdblock(val);
    }
  },

  unsafeSiteDetection: localStorage.getItem(STORAGE_KEYS.UNSAFE_SITE_DETECTION) !== 'false',
  setUnsafeSiteDetection: (val) => { localStorage.setItem(STORAGE_KEYS.UNSAFE_SITE_DETECTION, val ? 'true' : 'false'); set({ unsafeSiteDetection: val }); },

  cookiePolicy: localStorage.getItem(STORAGE_KEYS.COOKIE_POLICY) || 'incognito',
  setCookiePolicy: (val) => { localStorage.setItem(STORAGE_KEYS.COOKIE_POLICY, val); set({ cookiePolicy: val }); },

  securityLevel: localStorage.getItem(STORAGE_KEYS.SECURITY_LEVEL) || 'standard',
  setSecurityLevel: (val) => { localStorage.setItem(STORAGE_KEYS.SECURITY_LEVEL, val); set({ securityLevel: val }); },

  // Reset all settings to defaults

  resetAllSettings: () => {
    // Clear all apex_ localStorage keys
    Object.values(STORAGE_KEYS).forEach(key => {
      try { localStorage.removeItem(key); } catch {}
    });
    // Reload the page to reset all state
    window.location.reload();
  },

  // ============================================================
  // Sync State
  // ============================================================
  syncEnabled: localStorage.getItem('apex_sync_enabled') !== 'false',
  setSyncEnabled: (val) => {
    localStorage.setItem('apex_sync_enabled', val ? 'true' : 'false');
    set({ syncEnabled: val });
  },
  syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
  setSyncStatus: (val) => set({ syncStatus: val }),
  lastSyncedAt: null,
  setLastSyncedAt: (val) => set({ lastSyncedAt: val }),

  // Open tabs from other devices
  remoteOpenTabs: null, // { tabs: [], device: '', updatedAt: 0 }
  applySyncedOpenTabs: (data) => {
    // data comes as the raw sync payload — could be {tabs, device, updatedAt} or array
    if (Array.isArray(data)) {
      set({ remoteOpenTabs: { tabs: data, device: 'Other device', updatedAt: Date.now() } });
    } else if (data?.tabs) {
      set({ remoteOpenTabs: data });
    }
  },

  // Apply synced data from remote (prevents re-push loops)
  applySyncedBookmarks: (bookmarks) => {
    if (window.electronAPI?.setBookmarks) {
       window.electronAPI.setBookmarks(bookmarks);
    } else {
       localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    }
    set({ bookmarks });
  },
  applySyncedBookmarkFolders: (folders) => {
    localStorage.setItem(STORAGE_KEYS.BOOKMARK_FOLDERS, JSON.stringify(folders));
    set({ bookmarkFolders: folders });
  },
  applySyncedPasswords: (passwords) => {
    set({ savedPasswords: passwords });
    // Also save to local secure storage
    const str = JSON.stringify(passwords);
    if (window.electronAPI?.safeStoreKey) {
      window.electronAPI.safeStoreKey(str).then(enc => {
        if (enc) localStorage.setItem(STORAGE_KEYS.PASSWORDS_SECURE, enc);
      });
    } else {
      localStorage.setItem(STORAGE_KEYS.PASSWORDS, str);
    }
  },
  applySyncedSettings: (settings) => {
    if (!settings) return;
    const updates = {};
    if (settings.searchEngine) { localStorage.setItem(STORAGE_KEYS.SEARCH_ENGINE, settings.searchEngine); updates.searchEngine = settings.searchEngine; }
    if (settings.darkMode !== undefined) { localStorage.setItem(STORAGE_KEYS.DARK_MODE, settings.darkMode ? 'true' : 'false'); updates.darkMode = settings.darkMode; }
    if (settings.language) { localStorage.setItem(STORAGE_KEYS.LANGUAGE, settings.language); updates.language = settings.language; }
    if (settings.weatherLocation) { localStorage.setItem(STORAGE_KEYS.WEATHER_LOC, JSON.stringify(settings.weatherLocation)); updates.weatherLocation = settings.weatherLocation; }
    set(updates);
  },
  applySyncedHistory: async (history) => {
    if (!history || !Array.isArray(history)) return;
    if (window.electronAPI?.addToHistory) {
      // Add each item to the SQLite database
      for (const entry of history) {
        await window.electronAPI.addToHistory(entry);
      }
    } else {
      // Merge remote history with local — deduplicate by URL+time
      const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
      const merged = [...history, ...local];
      const seen = new Set();
      const deduped = merged.filter(entry => {
        const key = entry.url + entry.time;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 200);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(deduped));
    }
  },

  // Push current settings snapshot to cloud
  pushSettingsToCloud: () => {
    if (isSyncingFromRemote()) return;
    const state = useBrowserStore.getState();
    pushData('settings', {
      searchEngine: state.searchEngine,
      darkMode: state.darkMode,
      language: state.language,
      weatherLocation: state.weatherLocation,
    });
  },

  // Toast notification state (Q3 FIX: replaces alert() calls)
  toast: null, // { message, type, visible, duration }
  showToast: (message, type = 'info', duration = 3500) => set({ toast: { message, type, visible: true, duration } }),
  dismissToast: () => set({ toast: null }),

  // Confirm modal state (S2 UPGRADE: replaces confirm() for EXECUTE_JS)
  confirmModal: null, // { title, message, onConfirm, onCancel }
  showConfirmModal: (title, message, onConfirm) => set({ confirmModal: { title, message, onConfirm, onCancel: () => set({ confirmModal: null }) } }),
  dismissConfirmModal: () => set({ confirmModal: null }),
});

// ============================================================
// Combined Store — same API surface, no consumer changes needed
// ============================================================
const useBrowserStore = create((set, get) => ({
  ...createTabSlice(set, get),
  ...createPerformanceSlice(set, get),
  ...createAISlice(set, get),
  ...createBookmarkSlice(set, get),
  ...createDashboardSlice(set, get),
  ...createUISlice(set, get),
}));

// Initialize secure keys on boot
useBrowserStore.getState().loadAiApiKey();
useBrowserStore.getState().loadPasswords();

// Initialize adblock state on boot
if (window.electronAPI?.setAdblock) {
  window.electronAPI.setAdblock(useBrowserStore.getState().extensions.adblock);
}

export default useBrowserStore;

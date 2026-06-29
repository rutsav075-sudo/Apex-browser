import { useEffect } from 'react';
import useBrowserStore from '../store/useBrowserStore';

export default function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();

      // --- Ctrl+Shift combos MUST be checked FIRST (before Ctrl-only) ---
      if (e.ctrlKey && e.shiftKey) {
        if (key === 't') {
          e.preventDefault();
          useBrowserStore.getState().reopenLastClosed();
          return;
        }
        if (key === 'n') {
          e.preventDefault();
          window.electronAPI?.openIncognito();
          return;
        }
        return; // Don't fall through to Ctrl-only handlers
      }

      // --- Ctrl-only combos ---
      if (e.ctrlKey && !e.shiftKey) {
        if (key === 't') {
          e.preventDefault();
          useBrowserStore.getState().createTab();
          return;
        }
        if (key === 'w') {
          e.preventDefault();
          const activeTabId = useBrowserStore.getState().activeTabId;
          useBrowserStore.getState().closeTab(activeTabId);
          return;
        }
        if (key === 'n') {
          e.preventDefault();
          window.electronAPI?.maximize();
          return;
        }
        if (key === 'f') {
          e.preventDefault();
          const state = useBrowserStore.getState();
          useBrowserStore.setState({ isFindOpen: !state.isFindOpen });
          if (state.isFindOpen) window.apexBrowserControls?.stopFindInPage();
          return;
        }
        if (key === 'p') {
          e.preventDefault();
          window.apexBrowserControls?.print();
          return;
        }
        if (key === 'd') {
          e.preventDefault();
          const state = useBrowserStore.getState();
          const activeTab = state.tabs.find(t => t.id === state.activeTabId);
          if (activeTab && activeTab.url) {
            const exists = state.bookmarks.find(b => b.url === activeTab.url);
            if (!exists) state.addBookmark({ url: activeTab.url, title: activeTab.title || activeTab.url });
          }
          return;
        }
        if (key === '=' || key === '+') { e.preventDefault(); window.apexBrowserControls?.zoom('in'); return; }
        if (key === '-') { e.preventDefault(); window.apexBrowserControls?.zoom('out'); return; }
        if (key === '0') { e.preventDefault(); window.apexBrowserControls?.zoom('reset'); return; }
        return;
      }

      // --- Non-modifier keys ---
      if (e.key === 'Escape') {
        const state = useBrowserStore.getState();
        if (state.isFindOpen) {
          useBrowserStore.setState({ isFindOpen: false, findQuery: '' });
          window.apexBrowserControls?.stopFindInPage();
        }
        return;
      }

      // F11 — Fullscreen toggle (#38)
      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        return;
      }

      // F12 — DevTools for active webview (#22)
      if (e.key === 'F12') {
        e.preventDefault();
        window.apexBrowserControls?.openDevTools?.();
        return;
      }

      // Shift+Esc — Task Manager (like Chrome)
      if (e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        const store = useBrowserStore.getState();
        store.setShowTaskManager(!store.showTaskManager);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

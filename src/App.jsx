import React, { useEffect, useState, Suspense } from 'react';
import useBrowserStore from './store/useBrowserStore';
import TopBar from './components/TopBar';
import AppSidebar from './components/AppSidebar';
import Dashboard from './components/Dashboard';
import WebviewManager from './components/WebviewManager';
import HistoryModal from './components/HistoryModal';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import ApexTurbo from './components/ApexTurbo';
import DownloadManager from './components/DownloadManager';
import ErrorBoundary from './components/ErrorBoundary';
import SplineWallpaper from './components/SplineWallpaper';
import RGBOverlay from './components/RGBOverlay';
import Toast from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import TaskManager from './components/TaskManager';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { X, Ghost } from 'lucide-react';
import './styles/LiquidGlass.css';
import './styles/App.css';

// #20 FIX: Lazy-load heavy components for faster initial render
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const AICopilot = React.lazy(() => import('./components/AICopilot'));
const PasswordsModal = React.lazy(() => import('./components/PasswordsModal'));
const ExtensionsManager = React.lazy(() => import('./components/ExtensionsManager'));
const WallpaperStore = React.lazy(() => import('./components/WallpaperStore'));
const WidgetStore = React.lazy(() => import('./components/WidgetStore'));
const GameMode = React.lazy(() => import('./components/GameMode'));
const FocusMode = React.lazy(() => import('./components/FocusMode'));


export default function App() {
  const bgImage = useBrowserStore(state => state.bgImage);
  const setBgImage = useBrowserStore(state => state.setBgImage);
  const isSettingsOpen = useBrowserStore(state => state.isSettingsOpen);
  const setIsSettingsOpen = useBrowserStore(state => state.setIsSettingsOpen);
  const isHistoryOpen = useBrowserStore(state => state.isHistoryOpen);
  const setIsHistoryOpen = useBrowserStore(state => state.setIsHistoryOpen);
  const isAddShortcutModalOpen = useBrowserStore(state => state.isAddShortcutModalOpen);
  const setIsAddShortcutModalOpen = useBrowserStore(state => state.setIsAddShortcutModalOpen);
  const setCustomShortcuts = useBrowserStore(state => state.setCustomShortcuts);
  const customShortcuts = useBrowserStore(state => state.customShortcuts);
  const setUserData = useBrowserStore(state => state.setUserData);
  const setIsLoggedIn = useBrowserStore(state => state.setIsLoggedIn);
  const tabs = useBrowserStore(state => state.tabs);
  const activeTabId = useBrowserStore(state => state.activeTabId);
  const activeSidebarItem = useBrowserStore(state => state.activeSidebarItem);
  const isTurboActive = useBrowserStore(state => state.isTurboActive);
  const setIsTurboActive = useBrowserStore(state => state.setIsTurboActive);
  const activeWidgets = useBrowserStore(state => state.activeWidgets);
  const isDashboardBlur = useBrowserStore(state => state.isDashboardBlur);
  const isCopilotOpen = useBrowserStore(state => state.isCopilotOpen);
  const setIsCopilotOpen = useBrowserStore(state => state.setIsCopilotOpen);


  useKeyboardShortcuts();

  const [localShortcutName, setLocalShortcutName] = useState('');
  const [localShortcutUrl, setLocalShortcutUrl] = useState('');
  const [showLocalAINotif, setShowLocalAINotif] = useState(false);

  // Restore imported Chrome theme on startup
  useEffect(() => {
    import('./services/ThemeImporter').then(({ restoreImportedTheme }) => restoreImportedTheme());
    useBrowserStore.getState().loadBookmarks();
  }, []);

  useEffect(() => {
    // Auto-reconnect sync for returning logged-in users
    const state = useBrowserStore.getState();
    if (state.isLoggedIn && state.syncEnabled && state.userData) {
      const googleUid = localStorage.getItem('apex_google_uid');
      if (googleUid) {
        import('./services/SyncService').then(({ initSync }) => {
          state.setSyncStatus('syncing');
          initSync(googleUid, {
            onBookmarks: (data) => useBrowserStore.getState().applySyncedBookmarks(data),
            onBookmarkFolders: (data) => useBrowserStore.getState().applySyncedBookmarkFolders(data),
            onPasswords: (data) => useBrowserStore.getState().applySyncedPasswords(data),
            onSettings: (data) => useBrowserStore.getState().applySyncedSettings(data),
            onHistory: (data) => useBrowserStore.getState().applySyncedHistory(data),
            onOpenTabs: (data) => useBrowserStore.getState().applySyncedOpenTabs(data),
          }).then((ok) => {
            if (ok) {
              state.setSyncStatus('synced');
              state.setLastSyncedAt(Date.now());
            }
          }).catch(() => state.setSyncStatus('error'));
        });
      }
    }

    // Listen for auto-update ready notification
    if (window.electronAPI?.onUpdateReady) {
      window.electronAPI.onUpdateReady((data) => {
        useBrowserStore.getState().showToast(
          `Update v${data?.version || 'new'} ready — restart to install`,
          'info', 10000
        );
      });
    }

    // Listen for permission requests from main process
    if (window.electronAPI?.onPermissionRequest) {
      window.electronAPI.onPermissionRequest((data) => {
        const origin = data?.origin ? new URL(data.origin).hostname : 'unknown site';
        useBrowserStore.getState().showToast(
          `${origin} requested ${data?.permission} — blocked by Apex Shields`,
          'warning', 5000
        );
      });
    }

    return () => {
      window.electronAPI?.offUpdateReady?.();
      window.electronAPI?.offPermissionRequest?.();
    };
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const isDashboard = activeTab?.url === '';
  const isIncognitoMode = new URLSearchParams(window.location.search).get('incognito') === 'true';

  const handleLoginSuccess = (user) => {
    if (user === null) {
      setUserData(null);
      setIsLoggedIn(false);
    } else {
      setUserData(user);
      setIsLoggedIn(true);
    }
  };

  const handleConfirmAddShortcut = () => {
    if (!localShortcutName || !localShortcutUrl) return;
    let finalUrl = localShortcutUrl;
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
    setCustomShortcuts([...customShortcuts, { id: Date.now(), title: localShortcutName, url: finalUrl }]);
    setIsAddShortcutModalOpen(false);
    setLocalShortcutName('');
    setLocalShortcutUrl('');
  };

  return (
    <div className="os-container">
      {/* Background Wallpaper */}
      {bgImage && bgImage.startsWith('video::') ? (
        <video 
           className="os-wallpaper" 
           src={bgImage.replace('video::', '')} 
           autoPlay loop muted 
           style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} 
        />
      ) : bgImage && bgImage.startsWith('spline::') ? (
        <SplineWallpaper sceneUrl={bgImage.replace('spline::', '')} />
      ) : (
        <div className="os-wallpaper" style={{ backgroundImage: `url(${bgImage})` }}></div>
      )}

      {/* Main OS Window */}
      <div className={`os-window ${isIncognitoMode ? 'incognito-theme' : ''}`} style={{ position: 'relative', backdropFilter: (isDashboard && activeSidebarItem === 'Home' && (!isDashboardBlur || activeWidgets.length === 0)) ? 'none' : '' }}>
        
        {/* Extracted TopBar */}
        <TopBar />

        <div className="os-body">
          {/* Extracted Sidebar */}
          <AppSidebar />

          {/* Main Content Area OR Webview */}
          <div className="os-content-area">
            {isDashboard && activeSidebarItem === 'Home' && (
              <>
                {isIncognitoMode ? (
                  <div className="incognito-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#202124', width: '100%', height: '100%', borderRadius: '12px' }}>
                    <Ghost size={80} color="#9aa0a6" style={{ marginBottom: '24px' }} />
                    <h1 style={{ color: '#e8eaed', fontSize: '32px', fontWeight: '400', marginBottom: '16px' }}>You've gone incognito</h1>
                    <p style={{ color: '#9aa0a6', maxWidth: '600px', textAlign: 'center', fontSize: '15px', lineHeight: '1.5', marginBottom: '40px' }}>
                      Now you can browse privately, and other people who use this device won't see your activity.
                      However, downloads, bookmarks and reading list items will be saved.
                    </p>
                    <div style={{ display: 'flex', gap: '40px', textAlign: 'left', color: '#9aa0a6', fontSize: '14px', lineHeight: '1.6' }}>
                      <div>
                        <strong style={{ color: '#e8eaed', display: 'block', marginBottom: '12px', fontWeight: '500' }}>Apex won't save the following information:</strong>
                        <ul style={{ paddingLeft: '24px', margin: 0 }}>
                          <li>Your browsing history</li>
                          <li>Cookies and site data</li>
                          <li>Information entered in forms</li>
                        </ul>
                      </div>
                      <div>
                        <strong style={{ color: '#e8eaed', display: 'block', marginBottom: '12px', fontWeight: '500' }}>Your activity might still be visible to:</strong>
                        <ul style={{ paddingLeft: '24px', margin: 0 }}>
                          <li>Websites you visit</li>
                          <li>Your employer or school</li>
                          <li>Your internet service provider</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Dashboard />
                )}
              </>
            )}

            {isDashboard && activeSidebarItem !== 'Home' && (
              <div className="mock-view-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <h2>{activeSidebarItem} View</h2>
                <p>Placeholder content for the {activeSidebarItem} module. Select <b>Home</b> to return to the dashboard.</p>
              </div>
            )}

            {/* Extracted WebviewManager */}
            <WebviewManager />
          </div>
        </div>

        {/* AI Copilot Sidebar - OUTSIDE os-body to prevent flex layout interference */}
        <Suspense fallback={null}>
            {isCopilotOpen && <AICopilot />}
        </Suspense>
      </div>

      {/* Add Shortcut Modal */}
      {isAddShortcutModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddShortcutModalOpen(false)}>
          <div className="shortcut-modal" onClick={(e) => e.stopPropagation()}>
             <h3>Add Shortcut</h3>
             <input type="text" placeholder="App Name (e.g. YouTube)" value={localShortcutName} onChange={(e) => setLocalShortcutName(e.target.value)} />
             <input type="text" placeholder="URL (e.g. youtube.com)" value={localShortcutUrl} onChange={(e) => setLocalShortcutUrl(e.target.value)} />
             <div className="modal-actions">
                <button onClick={() => setIsAddShortcutModalOpen(false)}>Cancel</button>
                <button className="primary" onClick={handleConfirmAddShortcut}>Add</button>
             </div>
          </div>
        </div>
      )}

      {/* RGB Light Sense Visualizer Overlay */}
      <RGBOverlay />

      {/* Startup Notification */}
      {showLocalAINotif && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 'var(--z-toast)', background: 'rgba(0, 255, 136, 0.1)', border: '1px solid #00ff88', padding: '12px 20px', borderRadius: '12px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideUp 0.3s ease-out', boxShadow: '0 4px 20px rgba(0, 255, 136, 0.2)' }}>
           <div style={{ background: '#00ff88', width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 10px #00ff88' }}></div>
           <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>Local AI Connected</span>
        </div>
      )}

      {/* Legacy Modals */}
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <DownloadManager />
      <ApexTurbo active={isTurboActive} onComplete={() => setIsTurboActive(false)} />
      {/* Q5 FIX: Each lazy component gets its own ErrorBoundary */}
      <Suspense fallback={null}>
        <ErrorBoundary>{isSettingsOpen && <SettingsModal isOpen={true} onClose={() => setIsSettingsOpen(false)} onBackgroundChange={setBgImage} onLoginSuccess={handleLoginSuccess} />}</ErrorBoundary>
        <ErrorBoundary><PasswordsModal /></ErrorBoundary>
        <ErrorBoundary><ExtensionsManager /></ErrorBoundary>
        <ErrorBoundary><WallpaperStore /></ErrorBoundary>
        <ErrorBoundary><WidgetStore /></ErrorBoundary>
        <ErrorBoundary><GameMode /></ErrorBoundary>
        <ErrorBoundary><FocusMode /></ErrorBoundary>

      </Suspense>
      <Toast />
      <ConfirmModal />
      <TaskManager />
      <PWAInstallPrompt />

    </div>
  );
}

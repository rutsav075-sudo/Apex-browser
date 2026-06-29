import React, { useState } from 'react';
import { User, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import useBrowserStore from '../../store/useBrowserStore';
import { initSync, pullAllData, disconnectSync, pushData, pushPasswords } from '../../services/SyncService';

const GOOGLE_CLIENT_ID = '17493730112-oeauopqk34qqh5onlc2i7cbn7p2jase5.apps.googleusercontent.com';

export default function AccountSettings({ onLoginSuccess }) {
    const { isLoggedIn, userData } = useBrowserStore();
    const showToast = useBrowserStore(state => state.showToast);
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            // Use Electron-native OAuth popup (reliable, no web popup blocker issues)
            if (window.electronAPI?.googleAuthPopup) {
                const result = await window.electronAPI.googleAuthPopup({ clientId: GOOGLE_CLIENT_ID });

                if (!result.success) {
                    if (result.error !== 'cancelled') {
                        showToast('Sign-in failed: ' + result.error, 'error');
                    }
                    return;
                }

                // Use user info fetched by main process (CORS-safe), fall back to renderer fetch
                let userInfo = result.userInfo;
                if (!userInfo || !userInfo.sub) {
                    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${result.accessToken}` }
                    });
                    userInfo = await res.json();
                }

                const loginResult = await window.electronAPI.googleLogin({
                    sub: userInfo.sub,
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture
                });

                if (loginResult?.success && onLoginSuccess) {
                    onLoginSuccess(loginResult.user);
                    // Persist UID for sync auto-reconnect
                    localStorage.setItem('apex_google_uid', userInfo.sub);
                    showToast(`Welcome, ${loginResult.user.name}! 👋`, 'success');

                    // Initialize cross-device sync
                    const store = useBrowserStore.getState();
                    if (store.syncEnabled) {
                        store.setSyncStatus('syncing');
                        try {
                            const syncOk = await initSync(userInfo.sub, {
                                onBookmarks: (data) => store.applySyncedBookmarks(data),
                                onBookmarkFolders: (data) => store.applySyncedBookmarkFolders(data),
                                onPasswords: (data) => store.applySyncedPasswords(data),
                                onSettings: (data) => store.applySyncedSettings(data),
                                onHistory: (data) => store.applySyncedHistory(data),
                                onOpenTabs: (data) => store.applySyncedOpenTabs(data),
                            });

                            if (syncOk) {
                                // Pull existing data from cloud (merge: cloud wins for first sync)
                                const remoteData = await pullAllData();
                                if (remoteData) {
                                    if (remoteData.bookmarks) store.applySyncedBookmarks(remoteData.bookmarks);
                                    if (remoteData.bookmarkFolders) store.applySyncedBookmarkFolders(remoteData.bookmarkFolders);
                                    if (remoteData.passwords) store.applySyncedPasswords(remoteData.passwords);
                                    if (remoteData.settings) store.applySyncedSettings(remoteData.settings);
                                    if (remoteData.history) store.applySyncedHistory(remoteData.history);
                                    showToast('Data synced from cloud ☁️', 'success');
                                } else {
                                    // First device — push local data to cloud
                                    pushData('bookmarks', store.bookmarks);
                                    pushData('bookmarkFolders', store.bookmarkFolders);
                                    pushPasswords(store.savedPasswords);
                                    store.pushSettingsToCloud();
                                    showToast('Local data pushed to cloud ☁️', 'success');
                                }
                                store.setSyncStatus('synced');
                                store.setLastSyncedAt(Date.now());
                            }
                        } catch (syncErr) {
                            console.error('[Sync] Init error:', syncErr);
                            store.setSyncStatus('error');
                            showToast('Sync setup failed — data saved locally', 'warning');
                        }
                    }
                } else {
                    showToast('Sign-in failed. Please try again.', 'error');
                }
            } else {
                showToast('Google sign-in requires the Apex desktop app.', 'warning');
            }
        } catch (err) {
            console.error('Sign-in error:', err);
            showToast('Sign-in error: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="settings-section">
            <h3>You and Apex</h3>
            {!isLoggedIn ? (
                <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>
                    <div className="setting-info">
                        <label>Sync and Google services</label>
                        <p>Sign in to sync your bookmarks, history, passwords, and settings across all your devices.</p>
                    </div>

                    {/* Native Google Sign-in Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            background: isLoading ? '#f5f5f5' : '#ffffff',
                            color: '#3c4043', border: '1px solid #dadce0', borderRadius: '4px',
                            padding: '0 24px', height: '44px', fontSize: '15px', fontWeight: '500',
                            fontFamily: 'Google Sans, Roboto, Arial, sans-serif',
                            cursor: isLoading ? 'wait' : 'pointer',
                            opacity: isLoading ? 0.8 : 1,
                            transition: 'box-shadow 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            whiteSpace: 'nowrap', outline: 'none', minWidth: '220px'
                        }}
                        onMouseOver={e => !isLoading && (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)')}
                        onMouseOut={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)')}
                    >
                        {isLoading ? (
                            <div style={{ width: '18px', height: '18px', border: '2px solid #4285f4', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                            </svg>
                        )}
                        {isLoading ? 'Opening Google...' : 'Sign in with Google'}
                    </button>
                </div>
            ) : (
                <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                            <img
                                src={userData?.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
                                alt="Profile"
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
                            />
                            <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#00d4ff', borderRadius: '50%', padding: '4px', cursor: 'pointer', display: 'flex' }} title="Change Picture">
                                <User size={12} color="#000" />
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            if (onLoginSuccess) onLoginSuccess({ ...userData, picture: reader.result });
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                            </label>
                        </div>
                        <div>
                            <h4 style={{ color: '#fff', fontSize: '18px', margin: '0 0 4px 0' }}>{userData?.name || 'User'}</h4>
                            <p style={{ color: '#a0a0b0', margin: 0, fontSize: '13px' }}>{userData?.email || ''}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="action-btn" onClick={() => showToast('Account management coming soon', 'info')}>Manage Google Account</button>
                        <button className="action-btn" style={{ background: 'rgba(255,71,87,0.15)', color: '#ff4757', border: '1px solid rgba(255,71,87,0.3)' }} onClick={() => {
                            disconnectSync();
                            localStorage.removeItem('apex_google_uid');
                            if (onLoginSuccess) onLoginSuccess(null);
                            useBrowserStore.getState().setSyncStatus('idle');
                            showToast('Signed out successfully', 'success');
                        }}>Sign Out</button>
                    </div>

                    {/* Sync Status */}
                    <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Cloud size={16} color="#00d4ff" />
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>Cross-Device Sync</span>
                            </div>
                            <label className="toggle-switch" style={{ transform: 'scale(0.8)' }}>
                                <input type="checkbox" checked={useBrowserStore.getState().syncEnabled} onChange={(e) => {
                                    useBrowserStore.getState().setSyncEnabled(e.target.checked);
                                    if (!e.target.checked) {
                                        disconnectSync();
                                        useBrowserStore.getState().setSyncStatus('idle');
                                        showToast('Sync disabled', 'info');
                                    } else {
                                        showToast('Sync enabled — sign in again to start', 'info');
                                    }
                                }} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>
                            Syncs bookmarks, passwords (encrypted), and settings across all devices signed into this Google account.
                        </p>
                    </div>
                </div>
            )}
            <div className="setting-item" style={{ marginTop: '24px' }}>
                <label>Manage your Apex Account</label>
                <button className="action-btn" style={{background: 'rgba(255,255,255,0.1)', color: '#fff'}} onClick={() => showToast('Account management coming soon', 'info')}>Manage</button>
            </div>
            <div className="setting-item">
                <label>Import bookmarks and settings</label>
                <button className="action-btn" onClick={() => showToast('Import feature coming soon', 'info')}>Import</button>
            </div>
        </div>
    );
}

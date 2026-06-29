import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Monitor, Moon, Bell, Lock, User, Key, Zap, Palette, Search, Globe, Power, GraduationCap, Download, Accessibility, Cpu, RotateCcw, Puzzle, Info, Bot, Sparkles } from 'lucide-react';

import useBrowserStore from '../store/useBrowserStore';
import { STORAGE_KEYS } from '../constants/storageKeys';
import useTranslation from '../hooks/useTranslation';
import AccountSettings from './settings/AccountSettings';
import RgbSettings from './settings/RgbSettings';
import AiSettings from './settings/AiSettings';
import PrivacySettings from './settings/PrivacySettings';
import PerformanceSettings from './settings/PerformanceSettings';
import ReportIssueModal from './ReportIssueModal';
import { THEME_PRESETS, applyTheme, removeImportedTheme, importFromManifestText, restoreImportedTheme } from '../services/ThemeImporter';
import '../styles/AetherTheme.css';
import '../styles/SettingsModal.css';

const COMING_SOON_STYLE = { opacity: 0.45, cursor: 'default', pointerEvents: 'none' };
const COMING_BADGE = <span style={{ fontSize: '9px', background: 'rgba(255,165,2,0.15)', color: '#ffa502', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, letterSpacing: '0.5px', marginLeft: '8px' }}>COMING SOON</span>;

const SettingsModal = ({ isOpen, onClose, onBackgroundChange, onLoginSuccess }) => {
    const [activeTab, setActiveTab] = useState('you');
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [weatherCityInput, setWeatherCityInput] = useState('');
    const [weatherSearching, setWeatherSearching] = useState(false);
    
    // VPN state (managed locally, passed as props to PrivacySettings)
    const [proxyUrl, setProxyUrl] = useState(localStorage.getItem('apex_proxy_url') || '');
    const [proxyStatus, setProxyStatus] = useState(localStorage.getItem('apex_proxy_active') === 'true' ? 'Connected' : 'Disconnected');
    const [currentIp, setCurrentIp] = useState('');
    
    // Store values
    const isLoggedIn = useBrowserStore(state => state.isLoggedIn);
    const userData = useBrowserStore(state => state.userData);
    const darkMode = useBrowserStore(state => state.darkMode);
    const setDarkMode = useBrowserStore(state => state.setDarkMode);
    const searchEngine = useBrowserStore(state => state.searchEngine);
    const setSearchEngine = useBrowserStore(state => state.setSearchEngine);
    const weatherLocation = useBrowserStore(state => state.weatherLocation);
    const setWeatherLocation = useBrowserStore(state => state.setWeatherLocation);
    const language = useBrowserStore(state => state.language);
    const setLanguage = useBrowserStore(state => state.setLanguage);
    const startupMode = useBrowserStore(state => state.startupMode);
    const setStartupMode = useBrowserStore(state => state.setStartupMode);
    const downloadsPath = useBrowserStore(state => state.downloadsPath);
    const setDownloadsPath = useBrowserStore(state => state.setDownloadsPath);
    const askBeforeDownload = useBrowserStore(state => state.askBeforeDownload);
    const setAskBeforeDownload = useBrowserStore(state => state.setAskBeforeDownload);
    const showHomeButton = useBrowserStore(state => state.showHomeButton);
    const setShowHomeButton = useBrowserStore(state => state.setShowHomeButton);
    const showBookmarksBar = useBrowserStore(state => state.showBookmarksBar);
    const setShowBookmarksBar = useBrowserStore(state => state.setShowBookmarksBar);
    const fontSize = useBrowserStore(state => state.fontSize);
    const setFontSize = useBrowserStore(state => state.setFontSize);
    const pageZoom = useBrowserStore(state => state.pageZoom);
    const setPageZoom = useBrowserStore(state => state.setPageZoom);
    const useTranslateFlag = useBrowserStore(state => state.useTranslate);
    const setUseTranslate = useBrowserStore(state => state.setUseTranslate);
    const spellCheck = useBrowserStore(state => state.spellCheck);
    const setSpellCheck = useBrowserStore(state => state.setSpellCheck);
    const bgAppsOnClose = useBrowserStore(state => state.bgAppsOnClose);
    const setBgAppsOnClose = useBrowserStore(state => state.setBgAppsOnClose);
    const hwAcceleration = useBrowserStore(state => state.hwAcceleration);
    const setHwAcceleration = useBrowserStore(state => state.setHwAcceleration);
    const resetAllSettings = useBrowserStore(state => state.resetAllSettings);
    const showToast = useBrowserStore(state => state.showToast);
    
    const t = useTranslation();
    const tabsContainerRef = useRef(null);
    
    // Weather city search handler
    const handleWeatherUpdate = async () => {
        const city = weatherCityInput.trim();
        if (!city) { showToast('Please enter a city name', 'warning'); return; }
        setWeatherSearching(true);
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const loc = data.results[0];
                const newLoc = { lat: loc.latitude, lon: loc.longitude, name: loc.name };
                setWeatherLocation(newLoc);
                setWeatherCityInput('');
                showToast(`Weather location updated to ${loc.name}`, 'success');
            } else {
                showToast('City not found. Try a different name.', 'warning');
            }
        } catch (e) {
            showToast('Failed to search location. Check your connection.', 'error');
        }
        setWeatherSearching(false);
    };
    
    // Downloads location change handler
    const handleChangeDownloadsPath = () => {
        if (window.electronAPI?.selectDirectory) {
            window.electronAPI.selectDirectory().then(path => {
                if (path) setDownloadsPath(path);
            });
        } else {
            const path = prompt('Enter downloads folder path:', downloadsPath);
            if (path && path.trim()) setDownloadsPath(path.trim());
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'you', label: t.settings.tabs.you, icon: <User size={18} /> },
        { id: 'ai', label: t.settings.tabs.ai, icon: <Bot size={18} /> },
        { id: 'autofill', label: t.settings.tabs.autofill, icon: <Key size={18} /> },
        { id: 'privacy', label: t.settings.tabs.privacy, icon: <Shield size={18} /> },
        { id: 'performance', label: t.settings.tabs.performance, icon: <Zap size={18} /> },
        { id: 'appearance', label: t.settings.tabs.appearance, icon: <Palette size={18} /> },
        { id: 'search', label: t.settings.tabs.search, icon: <Search size={18} /> },
        { id: 'default', label: t.settings.tabs.default, icon: <Globe size={18} /> },
        { id: 'startup', label: t.settings.tabs.startup, icon: <Power size={18} /> },
        { id: 'languages', label: t.settings.tabs.languages, icon: <Globe size={18} /> },
        { id: 'downloads', label: t.settings.tabs.downloads, icon: <Download size={18} /> },
        { id: 'rgb', label: 'RGB Light Sense', icon: <Sparkles size={18} /> },
        { id: 'themes', label: 'Themes', icon: <Palette size={18} /> },
        { id: 'accessibility', label: t.settings.tabs.accessibility, icon: <Accessibility size={18} /> },
        { id: 'system', label: t.settings.tabs.system, icon: <Cpu size={18} /> },
        { id: 'reset', label: t.settings.tabs.reset, icon: <RotateCcw size={18} /> },
        { id: 'extensions', label: t.settings.tabs.extensions, icon: <Puzzle size={18} /> },
        { id: 'about', label: t.settings.tabs.about, icon: <Info size={18} /> }
    ];

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-sidebar" style={{ overflowY: 'auto' }}>
                    <div className="settings-header">
                        <h2>{t.settings.title}</h2>
                    </div>
                    <div className="settings-nav">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-content">
                    <button className="close-settings" onClick={onClose}>
                        <X size={24} />
                    </button>

                    {activeTab === 'you' && <AccountSettings onLoginSuccess={onLoginSuccess} />}
                    {activeTab === 'rgb' && <RgbSettings />}
                    {activeTab === 'ai' && <AiSettings />}
                    {activeTab === 'privacy' && <PrivacySettings proxyUrl={proxyUrl} setProxyUrl={setProxyUrl} proxyStatus={proxyStatus} setProxyStatus={setProxyStatus} currentIp={currentIp} setCurrentIp={setCurrentIp} />}
                    {activeTab === 'performance' && <PerformanceSettings onClose={onClose} />}

                    {activeTab === 'autofill' && (
                        <div className="settings-section">
                            <h3>Autofill and passwords</h3>
                            <div className="setting-item" style={{cursor: 'pointer'}} onClick={() => { useBrowserStore.getState().setIsPasswordsOpen(true); onClose(); }}>
                                <label style={{cursor: 'pointer'}}>Apex Password Manager</label>
                                <span>&gt;</span>
                            </div>
                            <div className="setting-item" style={COMING_SOON_STYLE}>
                                <label>Payment methods{COMING_BADGE}</label>
                            </div>
                            <div className="setting-item" style={COMING_SOON_STYLE}>
                                <label>Addresses and more{COMING_BADGE}</label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="settings-section">
                            <h3>Appearance</h3>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Dark Mode (AI Copilot)</label>
                                    <p>Switch Apex AI chat to a solid dark background for better readability. When off, the glass effect is used.</p>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Show Home button</label>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={showHomeButton} onChange={(e) => setShowHomeButton(e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Show bookmarks bar</label>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={showBookmarksBar} onChange={(e) => setShowBookmarksBar(e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <label>Font size</label>
                                <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} style={{ background: '#2a2a3e', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: 6, outline: 'none' }}>
                                    <option value="small">Small</option>
                                    <option value="medium">Medium (Recommended)</option>
                                    <option value="large">Large</option>
                                </select>
                            </div>
                            <div className="setting-item">
                                <label>Page zoom</label>
                                <select value={pageZoom} onChange={(e) => setPageZoom(parseInt(e.target.value))} style={{ background: '#2a2a3e', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: 6, outline: 'none' }}>
                                    <option value="80">80%</option>
                                    <option value="90">90%</option>
                                    <option value="100">100%</option>
                                    <option value="110">110%</option>
                                    <option value="125">125%</option>
                                    <option value="150">150%</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="settings-section">
                            <h3>Search engine</h3>
                            <div className="setting-item">
                                <label>Search engine used in the address bar</label>
                                <select value={searchEngine} onChange={(e) => setSearchEngine(e.target.value)} style={{ background: '#2a2a3e', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: 6, outline: 'none', width: '200px' }}>
                                    <option value="google">Google</option>
                                    <option value="bing">Bing</option>
                                    <option value="duckduckgo">DuckDuckGo</option>
                                </select>
                            </div>
                            <div className="setting-item" style={COMING_SOON_STYLE}>
                                <label>Manage search engines and site search{COMING_BADGE}</label>
                            </div>
                            <h3 style={{ marginTop: 24 }}>Weather Location</h3>
                            <div className="setting-item" style={{ borderBottom: 'none' }}>
                                <div className="setting-info">
                                    <label>Current Location</label>
                                    <p style={{ color: '#00d4ff', fontSize: 13, margin: '4px 0 0 0', fontWeight: 600 }}>{weatherLocation?.name || 'Not set'} <span style={{ color: '#aaa', fontWeight: 400 }}>({weatherLocation?.lat?.toFixed(2)}, {weatherLocation?.lon?.toFixed(2)})</span></p>
                                </div>
                                <div style={{display: 'flex', gap: 8}}>
                                    <input type="text" placeholder="Search city..." value={weatherCityInput} onChange={(e) => setWeatherCityInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleWeatherUpdate(); }} style={{background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 6, color: 'white'}} />
                                    <button onClick={handleWeatherUpdate} disabled={weatherSearching} className="setting-button" style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#00d4ff', color: 'black', cursor: weatherSearching ? 'wait' : 'pointer', fontWeight: 600 }}>{weatherSearching ? 'Searching...' : 'Update Location'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'startup' && (
                        <div className="settings-section">
                            <h3>On startup</h3>
                            <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', width: '100%' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, display: 'block' }}>Startup Behavior</label>
                                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Choose what Apex does when you launch it.</p>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input type="radio" name="startup" checked={startupMode === 'newtab'} onChange={() => setStartupMode && setStartupMode('newtab')} style={{ accentColor: '#00d4ff' }} />
                                            Open the New Tab page
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input type="radio" name="startup" checked={startupMode === 'continue'} onChange={() => setStartupMode && setStartupMode('continue')} style={{ accentColor: '#00d4ff' }} />
                                            Continue where you left off
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input type="radio" name="startup" checked={startupMode === 'specific'} onChange={() => setStartupMode && setStartupMode('specific')} style={{ accentColor: '#00d4ff' }} />
                                            Open a specific page or set of pages
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'downloads' && (
                        <div className="settings-section">
                            <h3>Downloads</h3>
                            <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 4 }}>Location</label>
                                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace' }}>{downloadsPath || 'C:\\Users\\Downloads'}</p>
                                    </div>
                                    <button onClick={handleChangeDownloadsPath} className="setting-button" style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}>Change</button>
                                </div>
                            </div>
                            <div className="setting-item">
                                <label>Ask where to save each file before downloading</label>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={askBeforeDownload} onChange={(e) => setAskBeforeDownload && setAskBeforeDownload(e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'languages' && (
                        <div className="settings-section">
                            <h3>Languages</h3>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Preferred display language</label>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Select your default interface language.</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <select value={language} onChange={(e) => setLanguage && setLanguage(e.target.value)} style={{ background: '#2a2a3e', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: 6, outline: 'none' }}>
                                        <option value="en">English (US)</option>
                                        <option value="es">Español</option>
                                        <option value="hi">हिंदी</option>
                                        <option value="fr">Français</option>
                                    </select>
                                    <button className="setting-button" style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: 'rgba(0,212,255,0.2)', color: '#00d4ff', cursor: 'pointer', fontWeight: 600 }}>Apply</button>
                                </div>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Use Apex Translate</label>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={useTranslateFlag} onChange={(e) => setUseTranslate(e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Spell check</label>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={spellCheck} onChange={(e) => setSpellCheck(e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'default' && (
                        <div className="settings-section">
                            <h3>Default browser</h3>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label style={{ fontSize: 15 }}>Make Apex your default browser</label>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 13 }}>Open your system settings to set Apex as your default browser.</p>
                                </div>
                                <button className="setting-button" style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#00d4ff', color: 'black', cursor: 'pointer', fontWeight: 600 }}>Make default</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'themes' && (
                        <div className="settings-section">
                            <h3>Browser Themes</h3>
                            <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', paddingBottom: 0 }}>
                                <label style={{ marginBottom: 16 }}>Choose a preset or import a Chrome theme manifest</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, width: '100%' }}>
                                    {THEME_PRESETS.map((preset, i) => (
                                        <div key={i} onClick={() => applyTheme(preset)} style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <div style={{ height: 50, background: `linear-gradient(135deg, ${preset.css['--apex-frame-bg']}, ${preset.css['--apex-toolbar-bg'] || preset.css['--apex-sidebar-bg']})` }} />
                                            <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.3)', fontSize: 11, fontWeight: 600, color: '#ddd' }}>{preset.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 24 }}>
                                <label style={{ marginBottom: 8 }}>Import Chrome Theme</label>
                                <p style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>Paste the contents of a Chrome theme's manifest.json below:</p>
                                <textarea id="chrome-theme-import" placeholder='{"name": "My Theme", "theme": {"colors": {"frame": [30, 30, 60]}}}' style={{ width: '100%', height: 80, borderRadius: 8, padding: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
                                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                    <button onClick={() => { const el = document.getElementById('chrome-theme-import'); if (el?.value) { try { importFromManifestText(el.value); el.value = ''; } catch(e) { alert('Invalid manifest: ' + e.message); } } }} className="setting-button" style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'rgba(66,133,244,0.2)', color: '#8ab4f8', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Apply Theme</button>
                                    <button onClick={() => { removeImportedTheme(); }} className="setting-button" style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Reset to Default</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'accessibility' && (
                        <div className="settings-section">
                            <h3>Accessibility</h3>
                            <div className="setting-item" style={{ ...COMING_SOON_STYLE, borderBottom: 'none' }}>
                                <div className="setting-info">
                                    <label>Live Caption {COMING_BADGE}</label>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: 13 }}>Automatically creates captions for English audio and video</p>
                                </div>
                            </div>
                            <div className="setting-item" style={{ ...COMING_SOON_STYLE, borderBottom: 'none' }}>
                                <div className="setting-info">
                                    <label>Navigate pages with a text cursor {COMING_BADGE}</label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="settings-section">
                            <h3>System</h3>
                            <div className="setting-item">
                                <label>Continue running background apps when Apex is closed</label>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={bgAppsOnClose} onChange={(e) => setBgAppsOnClose(e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <label>Use hardware acceleration when available</label>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={hwAcceleration} onChange={(e) => setHwAcceleration(e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Open your computer's proxy settings</label>
                                </div>
                                <span style={{ fontSize: 14, cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>↗</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reset' && (
                        <div className="settings-section">
                            <h3>Reset settings</h3>
                            <div className="setting-item" style={{cursor: 'pointer'}} onClick={() => { if(window.confirm('Are you sure you want to reset all settings? This action cannot be undone.')) { resetAllSettings(); } }}>
                                <div className="setting-info">
                                    <label style={{cursor: 'pointer', fontWeight: 600, fontSize: 15, display: 'block', marginBottom: 4}}>Restore settings to their original defaults</label>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 13 }}>This will reset your startup page, new tab page, search engine, and pinned tabs. It will also disable all extensions and clear temporary data.</p>
                                </div>
                                <button className="setting-button" style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(255,60,60,0.3)', background: 'rgba(255,60,60,0.1)', color: '#ff4757', cursor: 'pointer', fontWeight: 600 }}>Reset settings</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'extensions' && (
                        <div className="settings-section">
                            <h3>Extensions</h3>
                            <div className="setting-item" style={{cursor: 'pointer'}} onClick={() => { useBrowserStore.getState().setIsExtensionsOpen && useBrowserStore.getState().setIsExtensionsOpen(true); onClose(); }}>
                                <div className="setting-info">
                                    <label style={{cursor: 'pointer', fontWeight: 600, fontSize: 15, display: 'block', marginBottom: 4}}>Manage Extensions</label>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 13 }}>Open details or remove installed extensions.</p>
                                </div>
                                <button className="setting-button" style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Open Store</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="settings-section">
                            <h3>About Apex Browser</h3>
                            <div className="setting-item" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <div>
                                        <h2 style={{ color: '#00d4ff', margin: '0 0 8px 0', fontSize: 18 }}>Apex Browser</h2>
                                        <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 4px 0' }}>Version 1.0.0 (Official Build) (64-bit)</p>
                                        <p style={{ color: '#00ff88', fontSize: 13, margin: 0, fontWeight: 600 }}>✓ Apex is up to date.</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'linear-gradient(135deg, #00d4ff, #bf00ff)', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,212,255,0.3)' }}>
                                        <Monitor size={32} color="white" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="setting-item" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '16px', marginTop: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', margin: 0 }}>
                                    Get help with Apex
                                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>↗</span>
                                </label>
                            </div>
                            
                            <div className="setting-item" style={{ cursor: 'pointer', background: 'rgba(255,60,60,0.05)', borderRadius: 12, padding: '16px', marginTop: 16, border: '1px solid rgba(255,60,60,0.2)' }} onClick={() => { setIsReportOpen(true); }}>
                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', margin: 0, color: '#ff4757', fontWeight: 600 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>🐛 Report an issue</span>
                                    <span>&gt;</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <ReportIssueModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
        </div>
    );
};

export default SettingsModal;

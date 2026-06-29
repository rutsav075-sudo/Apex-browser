import React, { useState, useEffect } from 'react';
import { X, Shield, Zap, Bot, ShieldAlert, Puzzle, Download, Check, Search, Star, FolderOpen, Globe, Trash2, Power, Loader2, AlertTriangle, Chrome, ExternalLink } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';
import '../styles/StoreAnimations.css';

// Simple local toast helper (no store dependency)
let _toastTimeout = null;

// Built-in Apex feature toggles (not real Chrome extensions)
const BUILTIN_FEATURES = [
    { id: 'adblock', name: 'Apex Shields', desc: 'Block ads, pop-ups, and trackers via Ghostery engine.', icon: <Shield size={22} color="#00d4ff" />, category: 'Core' },
    { id: 'vpn', name: 'Ghost VPN', desc: 'Secure your connection via encrypted proxy tunnels.', icon: <ShieldAlert size={22} color="#bf00ff" />, category: 'Core' },
    { id: 'turbo', name: 'RAM Turbo', desc: 'Suspend inactive tabs to save memory.', icon: <Zap size={22} color="#00ffcc" />, category: 'Core' },
    { id: 'ai', name: 'Apex AI', desc: 'Built-in intelligent copilot assistant.', icon: <Bot size={22} color="#ff00cc" />, category: 'Core' },
];

// Curated popular extensions for quick install — with rich metadata like Chrome Web Store
const POPULAR_EXTENSIONS = [
    { id: 'eimadpbcbfnmbkopoojfekhnkhdbieeh', name: 'Dark Reader', desc: 'Dark mode for every website. Reduce eye strain by enabling dark theme on all websites. Adjust brightness, contrast, sepia filter, and font settings.', category: 'Accessibility', color: '#141e24', initial: '🌙', users: '5M+', rating: '4.7', compat: 'full' },
    { id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm', name: 'uBlock Origin', desc: 'An efficient wide-spectrum content blocker. CPU and memory friendly. Blocks ads, trackers, malware domains using multiple filter lists.', category: 'Privacy', color: '#800000', initial: '🛡️', users: '10M+', rating: '4.9', compat: 'partial' },
    { id: 'nkbihfbeogaeaoehlefnkodbefgpgknn', name: 'MetaMask', desc: 'A crypto wallet & gateway to blockchain apps. Manage Ethereum accounts, sign transactions, and connect to decentralized applications.', category: 'Crypto', color: '#f5841f', initial: '🦊', users: '10M+', rating: '4.4', compat: 'limited' },
    { id: 'nngceckbapebfimnlniiiahkandclblb', name: 'Bitwarden', desc: 'A secure and free password manager for all of your devices. Store unlimited passwords and sync across all your devices.', category: 'Security', color: '#175ddc', initial: '🔐', users: '3M+', rating: '4.7', compat: 'partial' },
    { id: 'fmkadmapgofadopljbjfkapdkoienihi', name: 'React Developer Tools', desc: 'Adds React debugging tools to Chrome DevTools. Inspect the React component tree, props, state, and hooks in real time.', category: 'Developer', color: '#61dafb', initial: '⚛️', users: '3M+', rating: '4.8', compat: 'full' },
    { id: 'gighmmpiobklfepjocnamgkkbiglidom', name: 'AdBlock', desc: 'The most popular ad blocker. Block pop-ups, annoying ads, and video ads on YouTube, Facebook, Twitch, and your favorite websites.', category: 'Privacy', color: '#f40d12', initial: '✋', users: '60M+', rating: '4.5', compat: 'partial' },
    { id: 'bgnkhhnnamicmpeenaelnjfhikgbkllg', name: 'AdGuard AdBlocker', desc: 'Unmatched ad blocking. Blocks all types of ads including video ads, pop-ups, and banners. Protects privacy by blocking trackers and spyware.', category: 'Privacy', color: '#68bc71', initial: '🛡️', users: '7M+', rating: '4.6', compat: 'partial' },
    { id: 'gcbommkclmhbdoafkemhhpedfoecoeno', name: 'HTTPS Everywhere', desc: 'Automatically uses HTTPS security on many sites. Encrypts your communications with websites, making your browsing more secure.', category: 'Security', color: '#0a8a00', initial: '🔒', users: '2M+', rating: '4.5', compat: 'full' },
];

const COMPAT_LABELS = {
    full: { text: '✓ Full Support', color: '#00ff88', bg: 'rgba(0,255,136,0.1)' },
    partial: { text: '◐ Partial', color: '#ffa502', bg: 'rgba(255,165,2,0.1)' },
    limited: { text: '⚠ Limited', color: '#ff4757', bg: 'rgba(255,71,87,0.1)' },
};

export default function ExtensionsManager() {
    const extensions = useBrowserStore(state => state.extensions);
    const setExtensions = useBrowserStore(state => state.setExtensions);
    const isExtensionsOpen = useBrowserStore(state => state.isExtensionsOpen);
    const setIsExtensionsOpen = useBrowserStore(state => state.setIsExtensionsOpen);

    const [activeTab, setActiveTab] = useState('installed');
    const [searchTerm, setSearchTerm] = useState('');
    const [webstoreUrl, setWebstoreUrl] = useState('');
    const [isInstalling, setIsInstalling] = useState(false);
    const [installError, setInstallError] = useState('');
    const [realExtensions, setRealExtensions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toastMsg, setToastMsg] = useState('');

    const showToast = (msg) => {
        setToastMsg(msg);
        clearTimeout(_toastTimeout);
        _toastTimeout = setTimeout(() => setToastMsg(''), 3000);
    };

    // Load real extensions on open
    useEffect(() => {
        if (isExtensionsOpen) loadRealExtensions();
    }, [isExtensionsOpen]);

    const loadRealExtensions = async () => {
        if (!window.electronAPI?.getLoadedExtensions) return;
        setIsLoading(true);
        try {
            const exts = await window.electronAPI.getLoadedExtensions();
            setRealExtensions(exts || []);
        } catch (e) { console.error('Failed to load extensions:', e); }
        setIsLoading(false);
    };

    const handleLoadFromDisk = async () => {
        if (!window.electronAPI?.loadExtensionFromDisk) {
            showToast('Extension loading requires the Electron desktop app', 'error');
            return;
        }
        setIsInstalling(true);
        setInstallError('');
        try {
            const result = await window.electronAPI.loadExtensionFromDisk();
            if (result.success) {
                showToast(`✅ "${result.extension.name}" loaded successfully!`);
                await loadRealExtensions();
                setActiveTab('installed');
            } else if (result.error !== 'Cancelled') {
                setInstallError(result.error);
            }
        } catch (e) { setInstallError(e.message); }
        setIsInstalling(false);
    };

    const handleInstallFromWebstore = async (idOrUrl) => {
        const input = idOrUrl || webstoreUrl;
        if (!input.trim()) return;
        if (!window.electronAPI?.installExtensionFromWebstore) {
            showToast('Extension installation requires the Electron desktop app', 'error');
            return;
        }
        setIsInstalling(true);
        setInstallError('');
        try {
            const result = await window.electronAPI.installExtensionFromWebstore(input.trim());
            if (result.success) {
                showToast(`✅ "${result.extension.name}" installed successfully!`);
                setWebstoreUrl('');
                await loadRealExtensions();
                setActiveTab('installed');
            } else {
                setInstallError(result.error);
            }
        } catch (e) { setInstallError(e.message); }
        setIsInstalling(false);
    };

    const handleUninstall = async (extId) => {
        if (!window.electronAPI?.unloadExtension) return;
        try {
            await window.electronAPI.unloadExtension(extId);
            showToast('Extension uninstalled', 'info');
            await loadRealExtensions();
        } catch (e) { showToast('Failed to uninstall: ' + e.message, 'error'); }
    };

    const handleToggle = async (extId, enabled) => {
        if (!window.electronAPI?.toggleExtension) return;
        try {
            await window.electronAPI.toggleExtension(extId, enabled);
            await loadRealExtensions();
        } catch (e) { showToast('Failed to toggle: ' + e.message, 'error'); }
    };

    const handlePopup = async (ext) => {
        if (!ext.hasPopup || !ext.popupUrl) return;
        if (!window.electronAPI?.openExtensionPopup) return;
        await window.electronAPI.openExtensionPopup(ext.id, ext.popupUrl, { x: 200, y: 80 });
    };

    const toggleBuiltin = (key) => setExtensions({ ...extensions, [key]: !extensions[key] });

    if (!isExtensionsOpen) return null;

    const filteredReal = realExtensions.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Show ALL popular extensions (don't hide installed ones — show badge instead)
    const filteredPopular = POPULAR_EXTENSIONS.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const installedIds = new Set(realExtensions.map(r => r.id));

    // Styles
    const tabBtn = (active) => ({
        padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
        background: active ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255,255,255,0.04)',
        color: active ? '#00d4ff' : 'rgba(255,255,255,0.6)', transition: 'all 0.2s',
        border: active ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
    });

    const cardStyle = {
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px',
        transition: 'all 0.2s',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(30px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            animation: 'store-fade-in 0.3s ease',
        }}>
            <div style={{
                width: '95%', maxWidth: 900, maxHeight: '90vh',
                background: 'rgba(18,18,24,0.98)', borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                animation: 'store-fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* Header */}
                <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ padding: '12px', background: 'rgba(0,212,255,0.1)', borderRadius: '14px' }}>
                            <Puzzle size={26} color="#00d4ff" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#fff' }}>Extensions</h2>
                            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                                Chrome extensions + Apex built-in features
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setIsExtensionsOpen(false)} style={{
                        width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s',
                    }}><X size={20} /></button>
                </div>

                {/* Tabs + Search */}
                <div style={{ padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveTab('installed')} style={tabBtn(activeTab === 'installed')}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} /> Installed ({realExtensions.length})</span>
                    </button>
                    <button onClick={() => setActiveTab('webstore')} style={tabBtn(activeTab === 'webstore')}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Chrome size={14} /> Web Store</span>
                    </button>
                    <button onClick={() => setActiveTab('builtin')} style={tabBtn(activeTab === 'builtin')}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={14} /> Built-in</span>
                    </button>
                    <div style={{ flex: 1 }} />
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search extensions..."
                            style={{ padding: '8px 12px 8px 30px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '13px', width: 200, outline: 'none' }} />
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* === INSTALLED TAB === */}
                    {activeTab === 'installed' && (
                        <>
                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                                <button onClick={handleLoadFromDisk} disabled={isInstalling} style={{
                                    padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                                    background: 'rgba(0,255,204,0.1)', color: '#00ffcc', border: '1px solid rgba(0,255,204,0.3)',
                                    display: 'flex', alignItems: 'center', gap: 8, transition: '0.2s', opacity: isInstalling ? 0.5 : 1,
                                }}><FolderOpen size={16} /> Load Unpacked</button>
                            </div>

                            {isLoading && (
                                <div style={{ textAlign: 'center', padding: 30, color: 'rgba(255,255,255,0.5)' }}>
                                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                                    <p>Loading extensions...</p>
                                </div>
                            )}

                            {!isLoading && filteredReal.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
                                    <Puzzle size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                                    <p style={{ fontSize: 15 }}>No Chrome extensions installed yet.</p>
                                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                                        Go to <strong style={{ color: '#00d4ff', cursor: 'pointer' }} onClick={() => setActiveTab('webstore')}>Web Store</strong> to install extensions, or <strong style={{ color: '#00ffcc', cursor: 'pointer' }} onClick={handleLoadFromDisk}>Load Unpacked</strong> from disk.
                                    </p>
                                </div>
                            )}

                            {filteredReal.map(ext => (
                                <div key={ext.id} style={{ ...cardStyle, ...(ext.enabled ? {} : { opacity: 0.5 }) }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                                    {/* Icon */}
                                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {ext.icon ? <img src={ext.icon} width={28} height={28} style={{ borderRadius: 6 }} alt="" /> : <Puzzle size={22} color="#00d4ff" />}
                                    </div>
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{ext.name}</span>
                                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>v{ext.version}</span>
                                            {ext.source === 'webstore' && <span style={{ fontSize: 10, color: '#00d4ff', background: 'rgba(0,212,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>Web Store</span>}
                                            {ext.manifestVersion === 3 && <span style={{ fontSize: 10, color: '#ffa502', background: 'rgba(255,165,2,0.1)', padding: '2px 6px', borderRadius: 4 }}>MV3</span>}
                                        </div>
                                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ext.description}</p>
                                    </div>
                                    {/* Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        {ext.hasPopup && (
                                            <button onClick={() => handlePopup(ext)} title="Open popup" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ExternalLink size={14} />
                                            </button>
                                        )}
                                        <button onClick={() => handleToggle(ext.id, !ext.enabled)} title={ext.enabled ? 'Disable' : 'Enable'} style={{
                                            background: ext.enabled ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${ext.enabled ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                            color: ext.enabled ? '#00ff88' : 'rgba(255,255,255,0.4)',
                                            width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}><Power size={14} /></button>
                                        <button onClick={() => handleUninstall(ext.id)} title="Uninstall" style={{
                                            background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)',
                                            color: '#ff4757', width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* === WEB STORE TAB === */}
                    {activeTab === 'webstore' && (
                        <>
                            {/* Install from URL/ID */}
                            <div style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '16px', padding: '20px', marginBottom: '8px' }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Globe size={18} color="#00d4ff" /> Install from Chrome Web Store
                                </h3>
                                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                    Paste a Chrome Web Store URL or extension ID. We'll download, extract, and load it automatically.
                                </p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input value={webstoreUrl} onChange={e => { setWebstoreUrl(e.target.value); setInstallError(''); }}
                                        placeholder="chrome.google.com/webstore/detail/.../abcdefgh... or extension ID"
                                        onKeyDown={e => { if (e.key === 'Enter') handleInstallFromWebstore(); }}
                                        style={{ flex: 1, padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none' }} />
                                    <button onClick={() => handleInstallFromWebstore()} disabled={isInstalling || !webstoreUrl.trim()} style={{
                                        padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700,
                                        background: isInstalling ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #00d4ff, #00ffcc)',
                                        color: isInstalling ? 'rgba(255,255,255,0.4)' : '#000', fontSize: '13px',
                                        display: 'flex', alignItems: 'center', gap: 6, transition: '0.2s',
                                        opacity: (!webstoreUrl.trim() || isInstalling) ? 0.5 : 1,
                                    }}>
                                        {isInstalling ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Installing...</> : <><Download size={14} /> Install</>}
                                    </button>
                                </div>
                                {installError && (
                                    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 8, color: '#ff6b7a', fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                        <span>{installError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Popular Extensions */}
                            <h3 style={{ margin: '8px 0 4px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Star size={14} /> Popular Extensions
                            </h3>
                            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                                One-click install. Not all extensions are fully compatible — content scripts work best.
                            </p>

                            {filteredPopular.map(ext => {
                                const compat = COMPAT_LABELS[ext.compat] || COMPAT_LABELS.partial;
                                return (
                                <div key={ext.id} style={{ ...cardStyle, alignItems: 'flex-start', padding: '18px' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                                    {/* Icon */}
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '14px', flexShrink: 0,
                                        background: ext.color || 'rgba(0,212,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '24px', border: '1px solid rgba(255,255,255,0.06)',
                                    }}>{ext.initial}</div>
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{ext.name}</span>
                                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>{ext.category}</span>
                                            <span style={{ fontSize: 11, color: compat.color, background: compat.bg, padding: '2px 8px', borderRadius: 6 }}>{compat.text}</span>
                                        </div>
                                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>{ext.desc}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>⭐ {ext.rating}</span>
                                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>👥 {ext.users} users</span>
                                        </div>
                                    </div>
                                    {/* Install Button or Installed Badge */}
                                    {installedIds.has(ext.id) ? (
                                        <div style={{
                                            padding: '10px 18px', borderRadius: '12px',
                                            background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
                                            color: '#00ff88', fontWeight: 700, fontSize: '12px',
                                            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 4,
                                        }}><Check size={13} /> Installed</div>
                                    ) : (
                                        <button onClick={() => handleInstallFromWebstore(ext.id)} disabled={isInstalling} style={{
                                            padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.3)',
                                            background: 'rgba(0,212,255,0.1)', color: '#00d4ff', cursor: 'pointer',
                                            fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6,
                                            opacity: isInstalling ? 0.5 : 1, transition: '0.2s', flexShrink: 0, marginTop: 4,
                                        }}><Download size={13} /> Install</button>
                                    )}
                                </div>
                                );
                            })}

                            {filteredPopular.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 20 }}>
                                    All popular extensions are already installed! Use the URL field above for more.
                                </p>
                            )}
                        </>
                    )}

                    {/* === BUILT-IN TAB === */}
                    {activeTab === 'builtin' && (
                        <>
                            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                                Core Apex features. These are not Chrome extensions — they're built into the browser engine.
                            </p>
                            {BUILTIN_FEATURES.map(feat => (
                                <div key={feat.id} style={cardStyle}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(0,212,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {feat.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{feat.name}</span>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{feat.desc}</p>
                                    </div>
                                    <button onClick={() => toggleBuiltin(feat.id)} style={{
                                        padding: '8px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                                        background: extensions[feat.id] ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                                        color: extensions[feat.id] ? '#00ff88' : 'rgba(255,255,255,0.4)',
                                        border: `1px solid ${extensions[feat.id] ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                        transition: '0.2s',
                                    }}>{extensions[feat.id] ? '✓ Enabled' : 'Disabled'}</button>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
            {/* Toast */}
            {toastMsg && (
                <div style={{
                    position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(0,212,255,0.3)',
                    color: '#fff', padding: '12px 24px', borderRadius: '14px', fontSize: '13px',
                    fontWeight: 600, zIndex: 200000, backdropFilter: 'blur(20px)',
                    animation: 'store-fade-in-up 0.3s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>{toastMsg}</div>
            )}
        </div>
    );
}

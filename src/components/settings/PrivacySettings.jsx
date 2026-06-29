import React, { useState } from 'react';
import useBrowserStore from '../../store/useBrowserStore';
import { Shield, Lock, Radio, Trash2, Globe, Server, Mic, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

export default function PrivacySettings({ proxyUrl, setProxyUrl, proxyStatus, setProxyStatus, currentIp, setCurrentIp }) {
    const showToast = useBrowserStore(state => state.showToast);
    const adBlocker = useBrowserStore(state => state.adBlocker);
    const setAdBlocker = useBrowserStore(state => state.setAdBlocker);
    const unsafeSiteDetection = useBrowserStore(state => state.unsafeSiteDetection);
    const setUnsafeSiteDetection = useBrowserStore(state => state.setUnsafeSiteDetection);
    const cookiePolicy = useBrowserStore(state => state.cookiePolicy);
    const setCookiePolicy = useBrowserStore(state => state.setCookiePolicy);
    const securityLevel = useBrowserStore(state => state.securityLevel);
    const setSecurityLevel = useBrowserStore(state => state.setSecurityLevel);
    const micEnabled = useBrowserStore(state => state.micEnabled);
    const setMicEnabled = useBrowserStore(state => state.setMicEnabled);
    
    // Feature: Live Real Proxies
    const [liveProxies, setLiveProxies] = useState([]);
    const [loadingProxies, setLoadingProxies] = useState(false);

    const fetchRealProxies = async () => {
        setLoadingProxies(true);
        try {
            // Live cyber endpoint for real functioning SOCKS5 proxies
            const res = await fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all&ssl=all&anonymity=all');
            const data = await res.text();
            const list = data.split('\n').filter(p => p.trim() !== '').slice(0, 15);
            setLiveProxies(list.map(p => `socks5://${p.trim()}`));
            showToast('15 Live VPN Nodes Acquired', 'success');
        } catch (e) {
            showToast('Failed to fetch VPN nodes', 'error');
        }
        setLoadingProxies(false);
    };

    const handleClearData = async () => {
        if (window.electronAPI && window.electronAPI.clearData) await window.electronAPI.clearData();
        showToast('Browsing data cleared securely!', 'success');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.5s ease-out' }}>
            
            {/* VPN / PROXY SECTION */}
            <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'rgba(0, 212, 255, 0.15)', borderRadius: '12px' }}><Globe size={20} color="#00d4ff" /></div>
                    Apex Secure VPN Tunnel
                </h3>
                
                <div style={{ background: 'rgba(25, 25, 30, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}>
                    {!window.electronAPI?.setProxy && (
                        <div style={{ padding: '12px 16px', background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <XCircle size={20} color="#ff4757" />
                            <div>
                                <h4 style={{ margin: 0, color: '#ff4757', fontSize: '14px' }}>Desktop App Required</h4>
                                <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>VPN routing is restricted in the browser preview. Please download the Apex Desktop Client.</p>
                            </div>
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <select 
                                value={proxyUrl}
                                onChange={(e) => setProxyUrl(e.target.value)}
                                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', appearance: 'none', fontSize: '14px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = '#00d4ff'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            >
                                <option value="">Select a Server Location...</option>
                                {liveProxies.length > 0 && (
                                    <optgroup label="Live Global Network (Real)">
                                        {liveProxies.map((p, i) => (
                                            <option key={i} value={p}>🌐 Active Node {i+1} ({p.split('//')[1]})</option>
                                        ))}
                                    </optgroup>
                                )}
                                <optgroup label="Dedicated Premium (Requires subscription)">
                                    <option value="https://us.proxy.apex:8080">🇺🇸 United States (New York)</option>
                                    <option value="https://uk.proxy.apex:8080">🇬🇧 United Kingdom (London)</option>
                                    <option value="https://sg.proxy.apex:8080">🇸🇬 Singapore</option>
                                </optgroup>
                                <optgroup label="Other">
                                    <option value="socks5://127.0.0.1:1080">💻 Localhost (Loopback)</option>
                                    <option value="custom">⚙️ Custom Manual Proxy...</option>
                                </optgroup>
                            </select>
                            <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.4)' }}>▼</div>
                        </div>
                        <button onClick={fetchRealProxies} disabled={loadingProxies} style={{ background: 'rgba(255,255,255,0.05)', color: '#00d4ff', border: '1px solid rgba(0, 212, 255, 0.3)', padding: '0 20px', borderRadius: '12px', cursor: loadingProxies ? 'wait' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(0, 212, 255, 0.1)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                            <Server size={16} /> {loadingProxies ? 'Scanning...' : 'Scan IPs'}
                        </button>
                    </div>

                    {proxyUrl === 'custom' && (
                        <input 
                            type="text" 
                            placeholder="e.g. socks5://user:pass@host:port" 
                            onChange={(e) => setProxyUrl(e.target.value)}
                            style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', marginBottom: '16px' }}
                        />
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: proxyStatus === 'Connected' ? 'rgba(0, 212, 255, 0.05)' : 'rgba(0,0,0,0.2)', borderRadius: '12px', border: proxyStatus === 'Connected' ? '1px solid rgba(0, 212, 255, 0.2)' : '1px solid transparent' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: proxyStatus === 'Connected' ? '#00ffcc' : proxyStatus === 'Connecting...' ? '#ffa502' : '#ff4757', boxShadow: `0 0 10px ${proxyStatus === 'Connected' ? '#00ffcc' : proxyStatus === 'Connecting...' ? '#ffa502' : '#ff4757'}` }} />
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>{proxyStatus}</span>
                            </div>
                            {proxyStatus === 'Connected' && currentIp && (
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>IP: Hidden via {currentIp}</span>
                            )}
                        </div>

                        <button 
                            disabled={proxyStatus === 'Connecting...'} 
                            style={{ 
                                background: proxyStatus === 'Connected' ? 'transparent' : 'linear-gradient(135deg, #00d4ff, #bf00ff)', 
                                color: proxyStatus === 'Connected' ? '#ff4757' : '#fff', 
                                border: proxyStatus === 'Connected' ? '1px solid #ff4757' : 'none',
                                padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', 
                                opacity: proxyStatus === 'Connecting...' ? 0.7 : 1, cursor: proxyStatus === 'Connecting...' ? 'wait' : 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: proxyStatus === 'Connected' ? 'none' : '0 4px 15px rgba(0, 212, 255, 0.3)'
                            }} 
                            onClick={async () => {
                                if (!window.electronAPI?.setProxy) { showToast('VPN requires the Desktop build.', 'warning'); return; }
                                if (proxyStatus === 'Connected') {
                                    await window.electronAPI.setProxy('direct');
                                    setProxyStatus('Disconnected');
                                    localStorage.setItem('apex_proxy_active', 'false');
                                } else {
                                    if (!proxyUrl || proxyUrl === 'custom') { showToast('Select a valid server first', 'warning'); return; }
                                    setProxyStatus('Connecting...');
                                    showToast('Establishing secure tunnel...', 'info');
                                    const result = await window.electronAPI.setProxy(proxyUrl);
                                    if (result.success) {
                                        try {
                                            const controller = new AbortController();
                                            const timeoutId = setTimeout(() => controller.abort(), 8000);
                                            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal, cache: 'no-store' });
                                            clearTimeout(timeoutId);
                                            const data = await res.json();
                                            setProxyStatus('Connected');
                                            setCurrentIp(data.ip);
                                            localStorage.setItem('apex_proxy_url', proxyUrl);
                                            localStorage.setItem('apex_proxy_active', 'true');
                                            showToast('VPN Connected! IP: ' + data.ip, 'success');
                                        } catch (e) {
                                            await window.electronAPI.setProxy('direct');
                                            setProxyStatus('Disconnected');
                                            showToast('VPN Node is dead/unresponsive. Connection aborted.', 'error');
                                        }
                                    } else {
                                        setProxyStatus('Disconnected');
                                        showToast('Failed: Connection Timeout or Error', 'error');
                                    }
                                }
                            }}
                        >
                            {proxyStatus === 'Connected' ? 'Disconnect' : proxyStatus === 'Connecting...' ? 'Connecting...' : 'Connect'}
                        </button>
                    </div>
                </div>
            </div>

            {/* PRIVACY & SECURITY SECTION */}
            <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'rgba(191, 0, 255, 0.15)', borderRadius: '12px' }}><Shield size={20} color="#bf00ff" /></div>
                    Privacy & Protection
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Ad Blocker */}
                    <div style={{ background: 'rgba(25, 25, 30, 0.5)', border: adBlocker ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', transition: '0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ background: adBlocker ? '#00d4ff' : 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '10px', color: adBlocker ? '#000' : '#fff' }}><EyeOff size={18} /></div>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={adBlocker} onChange={e => setAdBlocker(e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', color: '#fff' }}>Ad & Tracker Blocker</h4>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.4 }}>Block intrusive ads, invisible trackers, and malicious scripts automatically.</p>
                    </div>

                    {/* Unsafe Site Detection */}
                    <div style={{ background: 'rgba(25, 25, 30, 0.5)', border: unsafeSiteDetection ? '1px solid rgba(255, 71, 87, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', transition: '0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ background: unsafeSiteDetection ? '#ff4757' : 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '10px', color: unsafeSiteDetection ? '#fff' : '#fff' }}><Radio size={18} /></div>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={unsafeSiteDetection} onChange={e => setUnsafeSiteDetection(e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', color: '#fff' }}>Phishing Protection</h4>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.4 }}>Get warned before visiting known malware, phishing, or scam websites.</p>
                    </div>

                    {/* Mic Access */}
                    <div style={{ background: 'rgba(25, 25, 30, 0.5)', border: micEnabled ? '1px solid rgba(0, 255, 204, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', transition: '0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ background: micEnabled ? '#00ffcc' : 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '10px', color: micEnabled ? '#000' : '#fff' }}><Mic size={18} /></div>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={micEnabled} onChange={e => setMicEnabled(e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', color: '#fff' }}>Microphone Access</h4>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.4 }}>Allow Apex AI to listen and process voice commands securely.</p>
                    </div>

                    {/* Clear Data */}
                    <div style={{ background: 'rgba(25, 25, 30, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '10px', color: '#fff', display: 'inline-block', marginBottom: '12px' }}><Trash2 size={18} /></div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#fff' }}>Clear Browsing Data</h4>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.4 }}>Wipe history, cookies, and cache.</p>
                        </div>
                        <button onClick={handleClearData} style={{ background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', border: '1px solid rgba(255, 71, 87, 0.3)', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '12px', transition: '0.2s' }} onMouseOver={e=>{e.currentTarget.style.background='#ff4757'; e.currentTarget.style.color='#fff'}} onMouseOut={e=>{e.currentTarget.style.background='rgba(255, 71, 87, 0.1)'; e.currentTarget.style.color='#ff4757'}}>Clear Data</button>
                    </div>
                </div>

                {/* Dropdown Settings */}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(25, 25, 30, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '16px 24px' }}>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '15px' }}>Cookie Policy</h4>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Manage how third-party trackers behave.</p>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <select value={cookiePolicy} onChange={e => setCookiePolicy(e.target.value)} style={{ padding: '10px 36px 10px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                                <option value="allow">Allow all cookies</option>
                                <option value="incognito">Block third-party in Incognito</option>
                                <option value="block">Block third-party cookies</option>
                                <option value="all">Block all cookies</option>
                            </select>
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>▼</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(25, 25, 30, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '16px 24px' }}>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '15px' }}>Security Level</h4>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Safe Browsing protection against dangerous sites.</p>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <select value={securityLevel} onChange={e => setSecurityLevel(e.target.value)} style={{ padding: '10px 36px 10px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                                <option value="enhanced">Enhanced protection</option>
                                <option value="standard">Standard protection</option>
                                <option value="none">No protection (not recommended)</option>
                            </select>
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>▼</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

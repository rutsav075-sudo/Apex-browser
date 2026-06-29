import React from 'react';
import { Zap, Monitor } from 'lucide-react';
import useBrowserStore from '../../store/useBrowserStore';

export default function PerformanceSettings({ onClose }) {
    const setIsGamingMode = useBrowserStore(state => state.setIsGamingMode);
    const setIsFocusMode = useBrowserStore(state => state.setIsFocusMode);
    const memorySaver = useBrowserStore(state => state.memorySaver);
    const setMemorySaver = useBrowserStore(state => state.setMemorySaver);
    const energySaver = useBrowserStore(state => state.energySaver);
    const setEnergySaver = useBrowserStore(state => state.setEnergySaver);
    const preloadPages = useBrowserStore(state => state.preloadPages);
    const setPreloadPages = useBrowserStore(state => state.setPreloadPages);

    return (
        <div className="settings-section">
            <h3>Performance</h3>
            <div className="setting-item">
                <div className="setting-info">
                    <label>Memory Saver</label>
                    <p>When on, Apex frees up memory from inactive tabs.</p>
                </div>
                <label className="toggle-switch">
                    <input type="checkbox" checked={memorySaver} onChange={(e) => setMemorySaver(e.target.checked)} />
                    <span className="toggle-slider"></span>
                </label>
            </div>
            <div className="setting-item">
                <div className="setting-info">
                    <label>Energy Saver</label>
                    <p>Turn on when your computer's battery is low.</p>
                </div>
                <label className="toggle-switch">
                    <input type="checkbox" checked={energySaver} onChange={(e) => setEnergySaver(e.target.checked)} />
                    <span className="toggle-slider"></span>
                </label>
            </div>
            <div className="setting-item">
                <div className="setting-info">
                    <label>Preload pages</label>
                    <p>For faster browsing and searching</p>
                </div>
                <select value={preloadPages} onChange={(e) => setPreloadPages(e.target.value)}>
                    <option value="extended">Extended preloading</option>
                    <option value="standard">Standard preloading</option>
                    <option value="none">No preloading</option>
                </select>
            </div>

            <div style={{ marginTop: '32px', padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(255,0,85,0.06), rgba(255,165,2,0.06))', border: '1px solid rgba(255,0,85,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ padding: '10px', background: 'rgba(255,0,85,0.15)', borderRadius: '12px' }}>
                            <Zap size={22} color="#ff0055" />
                        </div>
                        <div>
                            <label style={{ fontSize: '16px', fontWeight: '700', color: '#fff', display: 'block', marginBottom: '4px' }}>🎮 Game Mode</label>
                            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Suspends tabs, boosts performance, shows FPS/RAM HUD overlay.</p>
                        </div>
                    </div>
                    <button onClick={() => { setIsGamingMode(true); onClose(); }} style={{ background: 'linear-gradient(135deg, #ff0055, #ff4757)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 6px 16px rgba(255,0,85,0.3)', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
                        Activate
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '16px', padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(0,100,255,0.06), rgba(0,212,255,0.06))', border: '1px solid rgba(0,212,255,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ padding: '10px', background: 'rgba(0,212,255,0.15)', borderRadius: '12px' }}>
                            <Monitor size={22} color="#00d4ff" />
                        </div>
                        <div>
                            <label style={{ fontSize: '16px', fontWeight: '700', color: '#fff', display: 'block', marginBottom: '4px' }}>🎯 Focus Mode</label>
                            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Pomodoro timer, site blocker, ambient sounds, productivity tracking.</p>
                        </div>
                    </div>
                    <button onClick={() => { setIsFocusMode(true); onClose(); }} style={{ background: 'linear-gradient(135deg, #00d4ff, #0064ff)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 6px 16px rgba(0,212,255,0.3)', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
                        Activate
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import '../styles/AetherTheme.css';

const ApexControl = ({ isOpen, onClose }) => {
    const [hotTabs, setHotTabs] = useState([
        { id: 1, name: 'duckduckgo.com', cpu: 12, ram: 200 },
        { id: 2, name: 'youtube.com', cpu: 45, ram: 800 },
        { id: 3, name: 'discord.com', cpu: 5, ram: 400 },
    ]);

    const [limiters, setLimiters] = useState({
        network: { enabled: false, value: 50 }, // Mb/s
        ram: { enabled: false, value: 8 }, // GB
        cpu: { enabled: true, value: 25 }, // %
    });

    const toggleLimiter = (type) => {
        setLimiters(prev => ({
            ...prev,
            [type]: { ...prev[type], enabled: !prev[type].enabled }
        }));
    };

    const killTab = (id) => {
        setHotTabs(prev => prev.filter(tab => tab.id !== id));
    };

    if (!isOpen) return null;

    return (
        <div className="apex-panel panel-slide-in">
            <div className="panel-header">
                <h2>GX CONTROL</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="panel-section">
                <h3>HOT TABS KILLER</h3>
                <div className="hot-tabs-list">
                    {hotTabs.map(tab => (
                        <div key={tab.id} className="hot-tab-row">
                            <span className="tab-name">{tab.name}</span>
                            <span className="tab-stats">CPU: {tab.cpu}% | RAM: {tab.ram}MB</span>
                            <button className="kill-btn" onClick={() => killTab(tab.id)}>×</button>
                        </div>
                    ))}
                    {hotTabs.length === 0 && <div className="empty-state">System Optimal. No heavy tabs.</div>}
                </div>
            </div>

            <div className={`panel-section limiter-section ${limiters.network.enabled ? 'active' : ''}`}>
                <div className="section-header">
                    <h3>NETWORK LIMITER</h3>
                    <div className="toggle-switch" onClick={() => toggleLimiter('network')}>
                        <div className={`switch-knob ${limiters.network.enabled ? 'on' : 'off'}`}></div>
                    </div>
                </div>
                <div className="limiter-controls">
                    <input
                        type="range"
                        min="1" max="100"
                        value={limiters.network.value}
                        onChange={(e) => setLimiters(prev => ({ ...prev, network: { ...prev.network, value: e.target.value } }))}
                        disabled={!limiters.network.enabled}
                    />
                    <span>{limiters.network.value} mb/s</span>
                </div>
            </div>

            <div className={`panel-section limiter-section ${limiters.ram.enabled ? 'active' : ''}`}>
                <div className="section-header">
                    <h3>RAM LIMITER</h3>
                    <div className="toggle-switch" onClick={() => toggleLimiter('ram')}>
                        <div className={`switch-knob ${limiters.ram.enabled ? 'on' : 'off'}`}></div>
                    </div>
                </div>
                <div className="limiter-controls">
                    <input
                        type="range"
                        min="1" max="64"
                        value={limiters.ram.value}
                        onChange={(e) => setLimiters(prev => ({ ...prev, ram: { ...prev.ram, value: e.target.value } }))}
                        disabled={!limiters.ram.enabled}
                    />
                    <span>{limiters.ram.value} GB</span>
                </div>
            </div>

            <div className={`panel-section limiter-section ${limiters.cpu.enabled ? 'active' : ''}`}>
                <div className="section-header">
                    <h3>CPU LIMITER</h3>
                    <div className="toggle-switch" onClick={() => toggleLimiter('cpu')}>
                        <div className={`switch-knob ${limiters.cpu.enabled ? 'on' : 'off'}`}></div>
                    </div>
                </div>
                <div className="limiter-controls">
                    <input
                        type="range"
                        min="1" max="100"
                        value={limiters.cpu.value}
                        onChange={(e) => setLimiters(prev => ({ ...prev, cpu: { ...prev.cpu, value: e.target.value } }))}
                        disabled={!limiters.cpu.enabled}
                    />
                    <span>{limiters.cpu.value}%</span>
                </div>
            </div>

            <style jsx>{`
                .apex-panel {
                    position: fixed;
                    left: 50px; /* Sidebar width */
                    top: 0;
                    bottom: 0;
                    width: 320px;
                    background: rgba(10, 10, 10, 0.95);
                    border-right: 1px solid var(--apex-red);
                    backdrop-filter: blur(20px);
                    z-index: 1900;
                    padding: 20px;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    overflow-y: auto;
                    box-shadow: 10px 0 30px rgba(0,0,0,0.5);
                }

                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 10px;
                }

                .panel-header h2 {
                    margin: 0;
                    color: var(--apex-red);
                    font-size: 18px;
                    letter-spacing: 2px;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 24px;
                    cursor: pointer;
                }
                .close-btn:hover { color: white; }

                .panel-section {
                    background: rgba(255,255,255,0.03);
                    padding: 15px;
                    border-radius: 8px;
                }

                .panel-section h3 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .hot-tab-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 12px;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }

                .tab-name { color: white; }
                .tab-stats { color: var(--text-muted); font-size: 10px; }
                
                .kill-btn {
                    background: none;
                    border: none;
                    color: var(--apex-red);
                    cursor: pointer;
                    font-weight: bold;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .toggle-switch {
                    width: 40px;
                    height: 20px;
                    background: #333;
                    border-radius: 20px;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .switch-knob {
                    width: 16px;
                    height: 16px;
                    background: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    transition: all 0.3s;
                }

                .switch-knob.on {
                    left: 22px;
                    background: var(--apex-red);
                }

                .limiter-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                input[type=range] {
                    width: 100%;
                    accent-color: var(--apex-red);
                }

                .panel-slide-in {
                    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideIn {
                    from { transform: translateX(-100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ApexControl;

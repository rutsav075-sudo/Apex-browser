import React from 'react';
import { Settings, History, Puzzle, Radio, Zap, Trash2, Twitch } from 'lucide-react';
import '../styles/AetherTheme.css';

const Sidebar = ({ activePanel, setActivePanel }) => {

    // Helper to toggle panels
    const togglePanel = (panelName) => {
        if (activePanel === panelName) {
            setActivePanel(null); // Close if already open
        } else {
            setActivePanel(panelName);
        }
    };

    return (
        <div className="apex-sidebar">
            <div className="sidebar-top">
                {/* Opera GX Logo Placehoder / Apex Logo */}
                <div className="sidebar-icon logo-icon">
                    <span style={{ color: 'var(--apex-red)', fontWeight: 'bold' }}>A</span>
                </div>

                {/* GX Control -> Apex Control */}
                <div
                    className={`sidebar-icon ${activePanel === 'control' ? 'active' : ''}`}
                    onClick={() => togglePanel('control')}
                    title="Apex Control"
                >
                    <Radio size={24} />
                </div>

                {/* GX Cleaner -> Apex Cleaner */}
                <div
                    className={`sidebar-icon ${activePanel === 'cleaner' ? 'active' : ''}`}
                    onClick={() => togglePanel('cleaner')}
                    title="Apex Cleaner"
                >
                    <Trash2 size={24} />
                </div>

                {/* Twist / TURBO MODE */}
                <div
                    className={`sidebar-icon ${activePanel === 'turbo' ? 'active' : ''}`}
                    onClick={() => setActivePanel('turbo')}
                    title="APEX TURBO"
                    style={{ color: activePanel === 'turbo' ? 'var(--hologram-cyan)' : '' }}
                >
                    <Zap size={24} />
                </div>
            </div>

            <div className="sidebar-bottom">
                <div className="sidebar-icon" title="History" onClick={() => togglePanel('history')}>
                    <History size={24} />
                </div>
                <div className="sidebar-icon" title="Extensions">
                    <Puzzle size={24} />
                </div>
                <div className="sidebar-icon" title="Settings" onClick={() => togglePanel('settings')}>
                    <Settings size={24} />
                </div>
            </div>

            <style>{`
                .apex-sidebar {
                    width: 50px;
                    height: 100vh;
                    background: var(--sidebar-bg);
                    border-right: 1px solid var(--glass-border);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 0;
                    position: fixed;
                    left: 0;
                    top: 0;
                    z-index: 2000;
                }
                
                .sidebar-top, .sidebar-bottom {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    align-items: center;
                }

                .sidebar-icon {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-radius: 8px;
                }

                .sidebar-icon:hover {
                    color: var(--starlight);
                    background: rgba(255, 255, 255, 0.1);
                    box-shadow: 0 0 10px rgba(250, 30, 78, 0.2);
                }

                .sidebar-icon.active {
                    color: var(--apex-red);
                    border-left: 2px solid var(--apex-red);
                    background: rgba(250, 30, 78, 0.1);
                }

                .logo-icon {
                    margin-bottom: 20px;
                    font-size: 24px;
                    color: var(--apex-red);
                }
            `}</style>
        </div>
    );
};

export default Sidebar;

import React from 'react';
import { Home, Compass, MessageSquare, Layers, Settings, History } from 'lucide-react';
import ThreeLogo from './ThreeLogo';

const FantasySidebar = ({ activePanel, setActivePanel }) => {

    const menuItems = [
        { id: 'start', icon: Home, label: 'Home' },
        { id: 'control', icon: Compass, label: 'Control Center' },
        { id: 'turbo', icon: Layers, label: 'GX Turbo' },
        { id: 'history', icon: History, label: 'History' },
    ];

    return (
        <div className="fantasy-sidebar">
            <div className="logo-container">
                <ThreeLogo />
            </div>

            <div className="menu-group">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar-btn ${activePanel === item.id ? 'active' : ''}`}
                        onClick={() => setActivePanel(activePanel === item.id ? null : item.id)}
                        title={item.label}
                    >
                        <item.icon size={24} />
                    </button>
                ))}
            </div>

            <div className="bottom-group">
                <button
                    className={`sidebar-btn ${activePanel === 'cleaner' ? 'active' : ''}`}
                    onClick={() => setActivePanel(activePanel === 'cleaner' ? null : 'cleaner')}
                    title="Cleaner"
                >
                    <MessageSquare size={24} />
                </button>
                <button
                    className={`sidebar-btn ${activePanel === 'settings' ? 'active' : ''}`}
                    onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
                    title="Settings"
                >
                    <Settings size={24} />
                </button>
            </div>

            <style jsx>{`
                .fantasy-sidebar {
                    height: 100vh;
                    width: 100%;
                    background: rgba(10, 10, 10, 0.95);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 20px 0;
                    backdrop-filter: blur(20px);
                    border-right: 1px solid var(--glass-border);
                }

                .logo-container {
                    margin-bottom: 40px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    filter: drop-shadow(0 0 10px var(--accent-glow));
                }

                .menu-group {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    width: 100%;
                    align-items: center;
                }

                .bottom-group {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    width: 100%;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .sidebar-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    padding: 12px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }

                .sidebar-btn:hover {
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.05);
                    transform: translateX(4px);
                }

                .sidebar-btn.active {
                    color: var(--accent-primary);
                    background: rgba(255, 0, 60, 0.1);
                    box-shadow: 0 0 15px rgba(255, 0, 60, 0.2) inset;
                }

                .sidebar-btn.active::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    height: 20px;
                    width: 3px;
                    background: var(--accent-primary);
                    border-radius: 0 2px 2px 0;
                    box-shadow: 0 0 10px var(--accent-primary);
                }
            `}</style>
        </div>
    );
};

export default FantasySidebar;

import React, { useState } from 'react';
import { Menu, EyeOff, X, Grip } from 'lucide-react';
import '../styles/AetherTheme.css';

const TopMenu = ({ onIncognito, onCloseAllTabs, onSelectTabsMode }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="top-menu-container">
            <button className="menu-btn" onClick={() => setIsOpen(!isOpen)}>
                <Menu size={20} />
            </button>

            {isOpen && (
                <>
                    <div className="menu-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="menu-dropdown glass-panel">
                        <div className="menu-item" onClick={() => { onIncognito(); setIsOpen(false); }}>
                            <EyeOff size={16} />
                            <span>New Incognito Window</span>
                        </div>
                        <div className="menu-item" onClick={() => { onCloseAllTabs(); setIsOpen(false); }}>
                            <X size={16} />
                            <span>Close All Tabs</span>
                        </div>
                        <div className="menu-item" onClick={() => { onSelectTabsMode(); setIsOpen(false); }}>
                            <Grip size={16} />
                            <span>Select Tabs</span>
                        </div>
                    </div>
                </>
            )}

            <style jsx>{`
                .top-menu-container {
                    position: relative;
                    -webkit-app-region: no-drag;
                }

                .menu-btn {
                    background: transparent;
                    border: none;
                    color: #888;
                    padding: 5px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }
                .menu-btn:hover { color: white; }

                .menu-backdrop {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 2500;
                }

                .menu-dropdown {
                    position: absolute;
                    top: 35px;
                    right: 0;
                    width: 200px;
                    background: #111;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 5px;
                    z-index: 2600;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }

                .menu-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px;
                    color: #ccc;
                    cursor: pointer;
                    border-radius: 4px;
                    font-size: 13px;
                }
                .menu-item:hover {
                    background: var(--apex-red);
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default TopMenu;

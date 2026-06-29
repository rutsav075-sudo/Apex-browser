import React from 'react';
import { Mail, Camera, Globe, Briefcase, Send, MessageCircle, Settings, Plus } from 'lucide-react';
import '../styles/AetherTheme.css';

const SocialSidebar = ({ activePanel, setActivePanel }) => {

    // Social Apps Mock Data (Generic Icons for Stability)
    const socialApps = [
        { id: 'mail', icon: Mail, color: '#EA4335' },
        { id: 'instagram', icon: Camera, color: '#E1306C' }, // Replaced missing brand icon
        { id: 'discord', icon: MessageCircle, color: '#5865F2' },
        { id: 'telegram', icon: Send, color: '#0088cc' },     // Replaced missing brand icon
        { id: 'facebook', icon: Globe, color: '#1877F2' },    // Replaced missing brand icon
        { id: 'linkedin', icon: Briefcase, color: '#0A66C2' }, // Replaced missing brand icon
    ];

    return (
        <div className="social-sidebar">
            <div className="window-controls-spacer"></div>

            <div className="apps-list">
                {socialApps.map((app) => (
                    <div key={app.id} className="app-icon-container">
                        <button
                            className="app-btn"
                            title={app.id}
                        >
                            <app.icon size={22} />
                        </button>
                    </div>
                ))}
                <div className="app-icon-container">
                    <button className="app-btn add-btn">
                        <Plus size={22} />
                    </button>
                </div>
            </div>

            <div className="bottom-settings">
                <button
                    className="app-btn settings-btn"
                    onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
                >
                    <Settings size={22} />
                </button>
            </div>

            <style jsx>{`
                .social-sidebar {
                    height: 100%;
                    width: 100%;
                    background: var(--bg-deep);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding-top: 20px;
                    padding-bottom: 20px;
                    border-right: 1px solid rgba(255,255,255,0.02);
                }

                .window-controls-spacer {
                    height: 20px; /* Space for traffic lights if needed */
                }

                .apps-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    flex: 1;
                    justify-content: center;
                }

                .app-icon-container {
                    display: flex;
                    justify-content: center;
                    position: relative;
                }

                .app-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .app-btn:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    transform: scale(1.05);
                }

                .settings-btn {
                    background: rgba(255, 71, 87, 0.1);
                    color: var(--accent-red);
                }
                
                .settings-btn:hover {
                    background: var(--accent-red);
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default SocialSidebar;

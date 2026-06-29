import React, { useState } from 'react';
import ThreeLogo from './ThreeLogo';
import { Shield, Lock, Eye, Mic, Camera, Search, Plus, MessageCircle } from 'lucide-react';
import '../styles/AetherTheme.css';

const StartPage = ({ onNavigate }) => {
    const [query, setQuery] = useState('');

    const shortcuts = [
        { id: 'behance', name: 'Behance | LEDO', color: '#1769ff', icon: 'Be' },
        { id: 'dribbble', name: 'Dribbble | LEDO', color: '#ea4c89', icon: 'Dr' },
        { id: 'figma', name: 'Figma | LEDO', color: '#f24e1e', icon: 'Fi' },
        { id: 'instagram', name: 'Instagram', color: '#E1306C', icon: 'In' },
        { id: 'pinterest', name: 'Pinterest', color: '#bd081c', icon: 'Pi' },
        { id: 'snapchat', name: 'Snapchat', color: '#fffc00', icon: 'Sn' },
        { id: 'tiktok', name: 'TikTok', color: '#000000', icon: 'Ti' },
        { id: 'add', name: 'Add', color: '#333', icon: '+' },
    ];

    const newsFilters = ['All', 'Top Stories', 'Health', 'Weather', 'Dining', 'Entertainment', 'Travel', 'Sports'];

    const handleSearch = (e) => {
        if (e.key === 'Enter' && query.trim()) onNavigate(query);
    };

    return (
        <div className="start-page-container">
            {/* Header / Hero */}
            <div className="hero-section">
                {/* 3D Logo (or Static Placeholder) */}
                <div className="logo-wrapper">
                    <ThreeLogo />
                </div>

                {/* Security Badges */}
                <div className="security-badges">
                    <div className="badge"><Eye size={14} /> Confidential Search</div>
                    <div className="badge"><Shield size={14} /> Tracker Blocking</div>
                    <div className="badge"><Lock size={14} /> Web site encryption</div>
                </div>
            </div>

            {/* Search Section */}
            <div className="search-container">
                <Search className="search-icon-left" size={20} />
                <input
                    className="search-input"
                    placeholder="What are you looking for today?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleSearch}
                />
                <div className="search-actions">
                    <Mic className="action-icon" size={20} />
                    <Camera className="action-icon" size={20} />
                    <button className="search-btn" onClick={() => onNavigate(query)}>
                        "Ho-ho-ho" Search
                    </button>
                </div>
            </div>

            {/* Shortcuts Grid */}
            <div className="shortcuts-grid">
                {shortcuts.map(item => (
                    <div key={item.id} className="shortcut-card">
                        <div className="shortcut-icon" style={{ background: item.id === 'add' ? 'transparent' : item.color }}>
                            {item.id === 'add' ? <Plus size={24} /> : item.icon}
                        </div>
                        <span className="shortcut-name">{item.name}</span>
                    </div>
                ))}
            </div>

            {/* News Footer */}
            <div className="news-footer">
                <h3>Top Stories</h3>
                <div className="news-filters">
                    {newsFilters.map((filter, idx) => (
                        <button key={filter} className={`filter-pill ${idx === 0 ? 'active' : ''}`}>
                            {idx !== 0 && <span className="dot" style={{ background: getCategoryColor(filter) }}></span>}
                            {filter}
                        </button>
                    ))}
                </div>

                <div className="news-grid-placeholder">
                    {/* Placeholders for news cards visible in screenshot */}
                    <div className="news-card"></div>
                    <div className="news-card"></div>
                    <div className="news-card"></div>
                </div>
            </div>

            <button className="settings-fab"><Settings size={20} /></button>
            <div className="chat-fab-group">
                <button className="chat-fab"><MessageCircle size={20} /></button>
                <button className="chat-fab"><Eye size={20} /></button>
            </div>

            <style jsx>{`
                .start-page-container {
                    width: 100%;
                    height: 100%;
                    background: var(--bg-main);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding-top: 40px;
                    overflow-y: auto;
                    position: relative;
                }

                .hero-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 30px;
                }

                .logo-wrapper {
                    margin-bottom: 20px;
                    transform: scale(1.5);
                }

                .security-badges {
                    display: flex;
                    gap: 20px;
                    color: var(--text-secondary);
                    font-size: 12px;
                }

                .badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .search-container {
                    width: 700px;
                    height: 60px;
                    background: var(--bg-card);
                    border-radius: 30px;
                    display: flex;
                    align-items: center;
                    padding: 0 10px 0 25px;
                    margin-bottom: 60px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                }

                .search-icon-left {
                    color: var(--text-secondary);
                    margin-right: 15px;
                }

                .search-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 16px;
                    outline: none;
                }

                .search-actions {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .action-icon {
                    color: var(--text-secondary);
                    cursor: pointer;
                }

                .search-btn {
                    background: var(--accent-red);
                    color: white;
                    border: none;
                    height: 44px;
                    padding: 0 25px;
                    border-radius: 22px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.1s;
                }

                .search-btn:active { transform: scale(0.95); }

                .shortcuts-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    width: 900px;
                    margin-bottom: 60px;
                }

                .shortcut-card {
                    background: var(--bg-card);
                    border-radius: 20px;
                    height: 120px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .shortcut-card:hover {
                    background: #333;
                }

                .shortcut-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: white;
                    font-size: 18px;
                }
                
                .shortcut-card:last-child .shortcut-icon {
                    border: 1px dashed #666;
                }

                .shortcut-name {
                    font-size: 13px;
                    color: var(--text-secondary);
                }

                .news-footer {
                    width: 100%;
                    max-width: 1000px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .news-footer h3 {
                    margin-bottom: 20px;
                    font-weight: 500;
                }

                .news-filters {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 30px;
                }

                .filter-pill {
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    padding: 8px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 14px;
                }

                .filter-pill.active {
                    background: #a4b0be; /* Light blue-grey from screenshot */
                    color: black;
                    font-weight: 600;
                }

                .dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                }

                .news-grid-placeholder {
                    display: flex;
                    gap: 20px;
                    width: 100%;
                    height: 150px;
                    overflow: hidden;
                }

                .news-card {
                    flex: 1;
                    background: #333;
                    border-radius: 16px;
                    opacity: 0.5;
                }

                /* FABs */
                .settings-fab {
                    position: absolute;
                    bottom: 30px;
                    left: 30px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #ff4757;
                    border: none;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .chat-fab-group {
                    position: absolute;
                    bottom: 30px;
                    right: 30px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .chat-fab {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #2f3542;
                    border: none;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

function getCategoryColor(category) {
    const colors = { Health: '#ff4757', Weather: '#ffa502', Dining: '#ffffff', Entertainment: '#a4b0be', Travel: '#1e90ff', Sports: '#7bed9f' };
    return colors[category] || '#ccc';
}

export default StartPage;

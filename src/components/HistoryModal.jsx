import React, { useState, useEffect } from 'react';
import useBrowserStore from '../store/useBrowserStore';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { Clock, Trash2, History, X, Globe, MoreVertical } from 'lucide-react';

const HistoryModal = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const createTab = useBrowserStore(state => state.createTab);
    const showConfirmModal = useBrowserStore(state => state.showConfirmModal);

    useEffect(() => {
        if (isOpen) {
            if (window.electronAPI?.getHistory) {
                window.electronAPI.getHistory(1000).then(res => {
                    if (res.success) setHistory(res.history);
                });
            } else {
                const savedHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
                setHistory(savedHistory);
            }
        }
    }, [isOpen]);

    const handleClearHistory = () => {
        showConfirmModal(
            'Are you sure you want to clear all your browsing history?',
            async () => {
                if (window.electronAPI?.clearHistory) {
                    await window.electronAPI.clearHistory();
                } else {
                    localStorage.removeItem(STORAGE_KEYS.HISTORY);
                }
                setHistory([]);
            }
        );
    };

    const handleItemClick = (url, title) => {
        createTab(url, title);
        onClose();
    };

    const deleteSingleItem = async (id, e) => {
        e.stopPropagation();
        if (window.electronAPI?.deleteHistoryItem) {
            await window.electronAPI.deleteHistoryItem(id);
        } else {
            const newHist = history.filter(h => h.id !== id);
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHist));
        }
        setHistory(prev => prev.filter(h => h.id !== id));
    }

    if (!isOpen) return null;

    const filteredHistory = history.filter(item => 
        (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.url || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupByDate = (historyArray) => {
        const groups = {};
        historyArray.forEach(item => {
            const d = item.timestamp ? new Date(item.timestamp) : new Date(item.id);
            const dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            
            let finalStr = dateStr;
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (d.toDateString() === today.toDateString()) {
                finalStr = `Today - ${dateStr}`;
            } else if (d.toDateString() === yesterday.toDateString()) {
                finalStr = `Yesterday - ${dateStr}`;
            }
            
            if (!groups[finalStr]) groups[finalStr] = [];
            groups[finalStr].push(item);
        });
        return groups;
    };

    const groupedHistory = groupByDate(filteredHistory);

    return (
        <div className="history-overlay" onClick={onClose}>
            <div className="history-glass-panel" onClick={e => e.stopPropagation()}>
                
                <div className="history-sidebar">
                    <div className="history-sidebar-header">
                        <History size={24} style={{ color: '#00d2ff' }} />
                        <h2>History</h2>
                    </div>
                    
                    <div className="history-nav-item active">
                        <Clock size={16} /> By Date
                    </div>
                    
                    <div className="history-sidebar-bottom">
                         <button className="clear-data-btn" onClick={handleClearHistory}>
                             <Trash2 size={16} /> Clear browsing data
                         </button>
                    </div>
                </div>

                <div className="history-main-content">
                    <div className="history-top-bar">
                        <input 
                            type="text" 
                            className="history-search" 
                            placeholder="Search history..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="close-corner" onClick={onClose}><X size={24} /></button>
                    </div>

                    <div className="history-list-area">
                        {Object.keys(groupedHistory).length > 0 ? (
                            Object.keys(groupedHistory).map(dateKey => (
                                <div key={dateKey} className="history-date-group">
                                    <h3 className="history-date-header">{dateKey}</h3>
                                    <div className="history-group-card">
                                        {groupedHistory[dateKey].map(item => (
                                            <div key={item.id} className="history-item-row" onClick={() => handleItemClick(item.url, item.title)}>
                                                <div className="history-time-col">{item.time}</div>
                                                <div className="history-icon-col">
                                                    <img src={`https://www.google.com/s2/favicons?domain=${item.url}&sz=32`} alt="" onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'; }} />
                                                </div>
                                                <div className="history-details-col">
                                                    <span className="history-title-text">{item.title}</span>
                                                    <span className="history-url-text">{(() => { try { return new URL(item.url).hostname.replace('www.', ''); } catch { return item.url; } })()}</span>
                                                </div>
                                                <div className="history-actions-col">
                                                    <button onClick={(e) => deleteSingleItem(item.id, e)} title="Remove from history"><MoreVertical size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <History size={48} opacity={0.2} style={{marginBottom: '16px'}} />
                                <p>Your browsing history appears here</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <style>{`
                .history-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: var(--z-modal);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    animation: fadeIn 0.2s ease-out;
                }
                
                .history-glass-panel {
                    width: 90vw;
                    height: 85vh;
                    max-width: 1200px;
                    background: rgba(30, 30, 35, 0.7);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05);
                    display: flex;
                    overflow: hidden;
                }
                
                .history-sidebar {
                    width: 260px;
                    background: rgba(20, 20, 24, 0.6);
                    border-right: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    flex-direction: column;
                    padding: 24px 16px;
                }
                
                .history-sidebar-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 32px;
                    padding-left: 8px;
                }
                
                .history-sidebar-header h2 {
                    margin: 0;
                    color: white;
                    font-size: 22px;
                    font-weight: 500;
                }
                
                .history-nav-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    color: rgba(255,255,255,0.7);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .history-nav-item:hover {
                    background: rgba(255,255,255,0.05);
                    color: white;
                }
                
                .history-nav-item.active {
                    background: rgba(0, 210, 255, 0.15);
                    color: #00d2ff;
                }
                
                .history-sidebar-bottom {
                    margin-top: auto;
                }
                
                .clear-data-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 12px;
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.8);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                }
                
                .clear-data-btn:hover {
                    background: rgba(255, 50, 50, 0.1);
                    border-color: rgba(255, 50, 50, 0.3);
                    color: #ff4d4d;
                }
                
                .history-main-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: rgba(255,255,255,0.02);
                }
                
                .history-top-bar {
                    height: 80px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 40px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                
                .history-search {
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 12px 20px;
                    border-radius: 20px;
                    width: 100%;
                    max-width: 500px;
                    color: white;
                    font-size: 15px;
                    outline: none;
                    transition: all 0.2s;
                }
                
                .history-search:focus {
                    background: rgba(0,0,0,0.5);
                    border-color: #00d2ff;
                    box-shadow: 0 0 0 2px rgba(0, 210, 255, 0.2);
                }
                
                .close-corner {
                    background: rgba(255,255,255,0.05);
                    border: none;
                    color: rgba(255,255,255,0.6);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .close-corner:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    transform: scale(1.05);
                }
                
                .history-list-area {
                    flex: 1;
                    padding: 30px 40px;
                    overflow-y: auto;
                }
                
                .history-list-area::-webkit-scrollbar {
                    width: 8px;
                }
                .history-list-area::-webkit-scrollbar-track {
                    background: transparent;
                }
                .history-list-area::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 4px;
                }
                
                .history-date-group {
                    margin-bottom: 40px;
                }
                
                .history-date-header {
                    color: white;
                    font-size: 16px;
                    font-weight: 500;
                    margin-top: 0;
                    margin-bottom: 16px;
                    padding-left: 4px;
                }
                
                .history-group-card {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .history-item-row {
                    display: flex;
                    align-items: center;
                    padding: 14px 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .history-item-row:last-child {
                    border-bottom: none;
                }
                
                .history-item-row:hover {
                    background: rgba(255,255,255,0.05);
                }
                
                .history-time-col {
                    width: 70px;
                    color: rgba(255,255,255,0.5);
                    font-size: 13px;
                }
                
                .history-icon-col {
                    width: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .history-icon-col img {
                    width: 16px;
                    height: 16px;
                    border-radius: 2px;
                }
                
                .history-details-col {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    overflow: hidden;
                }
                
                .history-title-text {
                    color: rgba(255,255,255,0.9);
                    font-size: 14px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 60%;
                }
                
                .history-url-text {
                    color: rgba(255,255,255,0.4);
                    font-size: 13px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .history-actions-col {
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                
                .history-item-row:hover .history-actions-col {
                    opacity: 1;
                }
                
                .history-actions-col button {
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.5);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                }
                
                .history-actions-col button:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                }
                
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: rgba(255,255,255,0.4);
                    font-size: 16px;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default HistoryModal;

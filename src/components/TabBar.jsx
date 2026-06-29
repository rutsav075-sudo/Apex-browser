import React, { useState, useRef } from 'react';
import { X, Plus, ChevronDown, FolderOpen } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';
import '../styles/AetherTheme.css';

const GROUP_COLORS = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d01', '#46bdc6', '#9334e6', '#e91e63'];

const TabBar = ({ tabs, activeTabId, onSwitchTab, onCloseTab, onNewTab }) => {
    const tabGroups = useBrowserStore(state => state.tabGroups);
    const createTabGroup = useBrowserStore(state => state.createTabGroup);
    const addTabToGroup = useBrowserStore(state => state.addTabToGroup);
    const removeTabFromGroup = useBrowserStore(state => state.removeTabFromGroup);
    const toggleGroupCollapse = useBrowserStore(state => state.toggleGroupCollapse);
    const deleteTabGroup = useBrowserStore(state => state.deleteTabGroup);
    const suspendedTabs = useBrowserStore(state => state.suspendedTabs);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, tabId }
    const [groupModal, setGroupModal] = useState(null); // { tabId }
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupColor, setNewGroupColor] = useState('#4285f4');

    // Find which group a tab belongs to
    const getTabGroup = (tabId) => tabGroups.find(g => g.tabIds.includes(tabId));

    // Get tabs in render order: grouped tabs together, ungrouped tabs at end
    const getOrderedTabs = () => {
        const grouped = new Set();
        const result = [];

        // First, render grouped tabs (by group)
        for (const group of tabGroups) {
            const groupTabs = tabs.filter(t => group.tabIds.includes(t.id));
            if (groupTabs.length > 0) {
                result.push({ type: 'group-header', group });
                if (!group.collapsed) {
                    groupTabs.forEach(t => {
                        result.push({ type: 'tab', tab: t, group });
                        grouped.add(t.id);
                    });
                } else {
                    groupTabs.forEach(t => grouped.add(t.id));
                }
            }
        }

        // Then, ungrouped tabs
        tabs.forEach(t => {
            if (!grouped.has(t.id)) {
                result.push({ type: 'tab', tab: t, group: null });
            }
        });

        return result;
    };

    const handleTabContextMenu = (e, tabId) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, tabId });
    };

    const handleCreateGroup = () => {
        if (!groupModal) return;
        const name = newGroupName.trim() || 'Group';
        createTabGroup(name, newGroupColor, [groupModal.tabId]);
        setGroupModal(null);
        setNewGroupName('');
    };

    const ordered = getOrderedTabs();

    return (
        <div className="tab-bar-container" onClick={() => setContextMenu(null)}>
            <div className="tabs-scroll-area">
                {ordered.map((item, idx) => {
                    if (item.type === 'group-header') {
                        const g = item.group;
                        return (
                            <div key={`group-${g.id}`} className="tab-group-header"
                                style={{ '--group-color': g.color }}
                                onClick={() => toggleGroupCollapse(g.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    deleteTabGroup(g.id);
                                }}
                                title={g.collapsed ? 'Click to expand' : 'Click to collapse • Right-click to ungroup'}
                            >
                                <span className="tab-group-dot" style={{ background: g.color }} />
                                <span className="tab-group-name">{g.name}</span>
                                <ChevronDown size={10} style={{
                                    transform: g.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                    opacity: 0.6,
                                }} />
                            </div>
                        );
                    }

                    const tab = item.tab;
                    const group = item.group;
                    const isSuspended = suspendedTabs?.includes(tab.id);

                    return (
                        <div
                            key={tab.id}
                            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
                            onClick={() => onSwitchTab(tab.id)}
                            onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                            style={group ? { borderTop: `2px solid ${group.color}` } : {}}
                        >
                            <span className="tab-title" style={{ opacity: isSuspended ? 0.5 : 1 }}>
                                {isSuspended ? '💤 ' : ''}{tab.title || 'New Tab'}
                            </span>
                            <div
                                className="tab-close-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTabFromGroup(tab.id);
                                    onCloseTab(tab.id);
                                }}
                            >
                                <X size={14} />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="new-tab-btn" onClick={onNewTab}>
                <Plus size={20} />
            </div>

            {/* Tab Context Menu */}
            {contextMenu && (
                <div className="tab-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}>
                    {/* Existing groups */}
                    {tabGroups.map(g => (
                        <div key={g.id} className="tab-context-item"
                            onClick={() => { addTabToGroup(g.id, contextMenu.tabId); setContextMenu(null); }}>
                            <span className="tab-group-dot" style={{ background: g.color, width: 8, height: 8 }} />
                            Add to "{g.name}"
                        </div>
                    ))}
                    {tabGroups.length > 0 && <div className="tab-context-divider" />}
                    {/* Create new group */}
                    <div className="tab-context-item"
                        onClick={() => { setGroupModal({ tabId: contextMenu.tabId }); setContextMenu(null); }}>
                        <FolderOpen size={12} /> New group...
                    </div>
                    {/* Remove from group */}
                    {getTabGroup(contextMenu.tabId) && (
                        <div className="tab-context-item danger"
                            onClick={() => { removeTabFromGroup(contextMenu.tabId); setContextMenu(null); }}>
                            Remove from group
                        </div>
                    )}
                </div>
            )}

            {/* New Group Modal */}
            {groupModal && (
                <div className="tab-group-modal-overlay" onClick={() => setGroupModal(null)}>
                    <div className="tab-group-modal" onClick={e => e.stopPropagation()}>
                        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Create Tab Group</h4>
                        <input
                            type="text" placeholder="Group name" value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                            autoFocus
                            style={{
                                width: '100%', padding: '8px 12px', borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                                color: '#fff', fontSize: 13, outline: 'none', marginBottom: 10,
                                boxSizing: 'border-box',
                            }}
                        />
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                            {GROUP_COLORS.map(c => (
                                <div key={c} onClick={() => setNewGroupColor(c)} style={{
                                    width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                                    border: c === newGroupColor ? '2px solid #fff' : '2px solid transparent',
                                    transition: 'border 0.15s',
                                }} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setGroupModal(null)} style={{
                                padding: '6px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
                                background: 'transparent', color: '#aaa', fontSize: 12, cursor: 'pointer',
                            }}>Cancel</button>
                            <button onClick={handleCreateGroup} style={{
                                padding: '6px 16px', borderRadius: 6, border: 'none',
                                background: newGroupColor, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .tab-bar-container {
                    height: 40px;
                    display: flex;
                    align-items: center;
                    padding-left: 10px;
                    overflow: hidden;
                    background: transparent;
                    -webkit-app-region: no-drag;
                }
                .tabs-scroll-area {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    overflow-x: auto;
                    height: 100%;
                    padding-right: 10px;
                }
                .tabs-scroll-area::-webkit-scrollbar { height: 4px; }
                .tabs-scroll-area::-webkit-scrollbar-thumb { background: var(--apex-red); }
                .tab-group-header {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    border-radius: 8px 8px 0 0;
                    background: color-mix(in srgb, var(--group-color) 15%, transparent);
                    cursor: pointer;
                    user-select: none;
                    height: 28px;
                    transition: background 0.2s;
                }
                .tab-group-header:hover { background: color-mix(in srgb, var(--group-color) 25%, transparent); }
                .tab-group-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
                .tab-group-name { font-size: 11px; color: #ddd; font-weight: 600; white-space: nowrap; }
                .tab-item {
                    min-width: 140px;
                    max-width: 200px;
                    height: 32px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px 8px 0 0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-bottom: 2px solid transparent;
                    user-select: none;
                }
                .tab-item:hover { background: rgba(255,255,255,0.1); }
                .tab-item.active {
                    background: var(--active-tab-bg, #1a1a1a);
                    border-bottom: 2px solid var(--apex-red);
                    color: white;
                }
                .tab-title {
                    font-size: 12px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 80%;
                    color: #ccc;
                }
                .tab-item.active .tab-title { color: white; }
                .tab-close-btn {
                    width: 20px; height: 20px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    color: #666;
                }
                .tab-close-btn:hover { background: rgba(255,0,0,0.2); color: red; }
                .new-tab-btn {
                    width: 32px; height: 32px;
                    display: flex; align-items: center; justify-content: center;
                    color: #888; cursor: pointer; margin-left: 5px;
                }
                .new-tab-btn:hover { color: white; background: rgba(255,255,255,0.1); border-radius: 4px; }
                .tab-context-menu {
                    position: fixed; z-index: 10000;
                    background: rgba(20,20,25,0.95); backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;
                    padding: 6px 0; min-width: 180px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                }
                .tab-context-item {
                    padding: 8px 16px; font-size: 12px; color: #ddd;
                    cursor: pointer; display: flex; align-items: center; gap: 8px;
                }
                .tab-context-item:hover { background: rgba(255,255,255,0.08); }
                .tab-context-item.danger { color: #ff4757; }
                .tab-context-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0; }
                .tab-group-modal-overlay {
                    position: fixed; inset: 0; z-index: 10001;
                    background: rgba(0,0,0,0.5); display: flex;
                    align-items: center; justify-content: center;
                }
                .tab-group-modal {
                    background: rgba(25,25,30,0.98); backdrop-filter: blur(30px);
                    border: 1px solid rgba(255,255,255,0.12); border-radius: 16px;
                    padding: 20px; width: 280px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
                }
            `}</style>
        </div>
    );
};

export default TabBar;

import React, { useState } from 'react';
import { Mail, Home, CheckSquare, Folder, MessageCircle, Settings, ChevronLeft, Plus } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';

export default function AppSidebar() {
  const activeSidebarItem = useBrowserStore(state => state.activeSidebarItem);
  const setActiveSidebarItem = useBrowserStore(state => state.setActiveSidebarItem);
  const isSidebarCollapsed = useBrowserStore(state => state.isSidebarCollapsed);
  const setIsSidebarCollapsed = useBrowserStore(state => state.setIsSidebarCollapsed);
  const setIsSettingsOpen = useBrowserStore(state => state.setIsSettingsOpen);
  const createTab = useBrowserStore(state => state.createTab);
  const setActiveTabId = useBrowserStore(state => state.setActiveTabId);
  const tabs = useBrowserStore(state => state.tabs);
  const setSearchQuery = useBrowserStore(state => state.setSearchQuery);
  const customShortcuts = useBrowserStore(state => state.customShortcuts);
  const setIsAddShortcutModalOpen = useBrowserStore(state => state.setIsAddShortcutModalOpen);

  const activeTab = tabs.find(t => t.id === useBrowserStore.getState().activeTabId) || tabs[0];
  const isDashboard = activeTab?.url === '';

  const sidebarItems = [
    { id: 'Mail', icon: <Mail size={20} />, label: 'Mail', action: () => createTab('https://mail.google.com', 'Gmail') },
    { id: 'Home', icon: <Home size={20} />, label: 'Home' },
  ];

  const handleSidebarClick = (item) => {
    if (item.action) {
      item.action();
    } else {
      setActiveSidebarItem(item.id);
    }
  };

  const handleHomeClick = () => {
    setActiveSidebarItem('Home');
    if (!isDashboard) {
      const dashboardTab = tabs.find(t => t.url === '');
      if (dashboardTab) {
        setActiveTabId(dashboardTab.id);
      } else {
        createTab();
      }
    }
  };

  return (
    <div className={`os-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <button className="hamburger-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
          <div className="bar"></div><div className="bar"></div><div className="bar"></div>
        </button>
      </div>

      <div className="sidebar-icons">
        {sidebarItems.map(item => (
          <div
            key={item.id}
            className={`sidebar-item ${activeSidebarItem === item.id ? 'active' : ''}`}
            onClick={() => handleSidebarClick(item)}
            title={item.label}
          >
            <div className="s-icon">{item.icon}</div>
            {!isSidebarCollapsed && <span className="s-label">{item.label}</span>}
          </div>
        ))}

        {customShortcuts.map(shortcut => (
          <div
            key={shortcut.id}
            className="sidebar-item"
            title={shortcut.title}
            onClick={() => createTab(shortcut.url, shortcut.title)}
          >
            <div className="s-icon" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '25%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', overflow: 'hidden' }}>
              <img src={`https://www.google.com/s2/favicons?domain=${shortcut.url}&sz=32`} width="16" alt="Icon" />
            </div>
            {!isSidebarCollapsed && <span className="s-label" style={{ fontSize: '9px', textAlign: 'center' }}>{shortcut.title.substring(0, 8)}</span>}
          </div>
        ))}
        
        <div className="sidebar-item" title="Add Shortcut" style={{ marginTop: '16px', opacity: 0.8 }} onClick={() => setIsAddShortcutModalOpen(true)}>
           <div className="s-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}>
              <Plus size={16} />
           </div>
           {!isSidebarCollapsed && <span className="s-label">Add App</span>}
        </div>
      </div>

      <div className="sidebar-bottom">
        <button className="collapse-btn" onClick={handleHomeClick} title="Home"><ChevronLeft size={16} /><ChevronLeft size={16} style={{ marginLeft: '-8px' }} /></button>
        <div className="sidebar-item" onClick={() => setIsSettingsOpen(true)} title="Settings">
          <div className="s-icon"><Settings size={20} /></div>
          {!isSidebarCollapsed && <span className="s-label">Settings</span>}
        </div>
      </div>
    </div>
  );
}

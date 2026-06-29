import React, { useState, useEffect, useRef } from 'react';
import { X, Cpu, HardDrive, Wifi, Zap } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';

export default function TaskManager() {
  const show = useBrowserStore(s => s.showTaskManager);
  const setShow = useBrowserStore(s => s.setShowTaskManager);
  const tabs = useBrowserStore(s => s.tabs);
  const closeTab = useBrowserStore(s => s.closeTab);
  const suspendedTabs = useBrowserStore(s => s.suspendedTabs);
  const [stats, setStats] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!show) return;

    const collectStats = () => {
      const tabStats = tabs.map(tab => {
        const isSuspended = suspendedTabs?.includes(tab.id);
        // Estimate memory — real stats require main process access
        const estimatedMem = isSuspended ? 0.5 : (5 + Math.random() * 40);
        return {
          id: tab.id,
          title: tab.title || 'New Tab',
          url: tab.url || 'Dashboard',
          memory: estimatedMem.toFixed(1),
          status: isSuspended ? 'Suspended' : tab.url === '' ? 'Dashboard' : 'Active',
          type: tab.url === '' ? 'browser' : 'tab',
        };
      });

      // Add browser process
      const perf = performance?.memory;
      const browserMem = perf ? (perf.usedJSHeapSize / 1048576).toFixed(1) : '~50';
      tabStats.unshift({
        id: 'browser',
        title: 'Apex Browser',
        url: 'Main Process',
        memory: browserMem,
        status: 'Running',
        type: 'browser',
      });

      setStats(tabStats);
    };

    collectStats();
    intervalRef.current = setInterval(collectStats, 2000);
    return () => clearInterval(intervalRef.current);
  }, [show, tabs, suspendedTabs]);

  if (!show) return null;

  const totalMem = stats.reduce((sum, s) => sum + parseFloat(s.memory || 0), 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={() => setShow(false)}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 640, maxHeight: '75vh', background: 'rgba(18,18,22,0.98)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={18} color="#00ffcc" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Task Manager</span>
            <span style={{ fontSize: 11, color: '#666', fontWeight: 400 }}>Shift+Esc</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: '#888' }}>
              <HardDrive size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Total: {totalMem.toFixed(0)} MB
            </span>
            <div onClick={() => setShow(false)} style={{
              cursor: 'pointer', color: '#666', borderRadius: 6,
              padding: 4, transition: 'color 0.2s',
            }}>
              <X size={16} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#888', fontWeight: 600, fontSize: 11 }}>Process</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', color: '#888', fontWeight: 600, fontSize: 11, width: 80 }}>Memory</th>
                <th style={{ textAlign: 'center', padding: '10px 16px', color: '#888', fontWeight: 600, fontSize: 11, width: 80 }}>Status</th>
                <th style={{ textAlign: 'center', padding: '10px 16px', color: '#888', fontWeight: 600, fontSize: 11, width: 90 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.id} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ color: '#fff', fontWeight: 500 }}>
                      {s.type === 'browser' ? <Zap size={12} style={{ marginRight: 6, color: '#00ffcc', verticalAlign: 'middle' }} /> : null}
                      {s.title}
                    </div>
                    <div style={{ color: '#555', fontSize: 10, marginTop: 2, maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.url}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 16px', fontFamily: 'monospace', color: parseFloat(s.memory) > 30 ? '#ff6b6b' : '#8ab4f8' }}>
                    {s.memory} MB
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                      background: s.status === 'Active' ? 'rgba(52,168,83,0.15)' : s.status === 'Suspended' ? 'rgba(251,188,4,0.15)' : 'rgba(66,133,244,0.15)',
                      color: s.status === 'Active' ? '#34a853' : s.status === 'Suspended' ? '#fbbc04' : '#4285f4',
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                    {s.type !== 'browser' && s.url !== '' && (
                      <button onClick={() => closeTab(s.id)} style={{
                        background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)',
                        color: '#ff3b30', padding: '3px 12px', borderRadius: 6, cursor: 'pointer',
                        fontSize: 10, fontWeight: 600, transition: 'background 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,59,48,0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,59,48,0.1)'}
                      >
                        End process
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

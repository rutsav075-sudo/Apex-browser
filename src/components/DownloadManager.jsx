import React, { useEffect, useState } from 'react';
import { X, Download, CheckCircle, AlertCircle, Folder, FileText, Image as ImageIcon, Film, Music, Archive, ExternalLink, ChevronUp, Pause, Play, XCircle } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';

const FILE_ICONS = {
  pdf: <FileText size={18} color="#ff4444" />,
  doc: <FileText size={18} color="#4285f4" />, docx: <FileText size={18} color="#4285f4" />,
  jpg: <ImageIcon size={18} color="#00d4ff" />, jpeg: <ImageIcon size={18} color="#00d4ff" />, png: <ImageIcon size={18} color="#00d4ff" />, gif: <ImageIcon size={18} color="#00d4ff" />, webp: <ImageIcon size={18} color="#00d4ff" />,
  mp4: <Film size={18} color="#bf00ff" />, mkv: <Film size={18} color="#bf00ff" />, avi: <Film size={18} color="#bf00ff" />, mov: <Film size={18} color="#bf00ff" />,
  mp3: <Music size={18} color="#00ffcc" />, wav: <Music size={18} color="#00ffcc" />, flac: <Music size={18} color="#00ffcc" />,
  zip: <Archive size={18} color="#ffd700" />, rar: <Archive size={18} color="#ffd700" />, '7z': <Archive size={18} color="#ffd700" />,
  exe: <ExternalLink size={18} color="#ff9500" />, msi: <ExternalLink size={18} color="#ff9500" />,
};

function getFileIcon(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || <Download size={18} color="#888" />;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '';
  return formatBytes(bytesPerSec) + '/s';
}

export default function DownloadManager() {
  const isDownloadsOpen = useBrowserStore(state => state.isDownloadsOpen);
  const setIsDownloadsOpen = useBrowserStore(state => state.setIsDownloadsOpen);
  const [downloads, setDownloads] = useState([]);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.onDownloadProgress) return;
    
    const handleProgress = (item) => {
      setDownloads(prev => {
        const existing = prev.findIndex(d => d.filename === item.filename);
        if (existing !== -1) {
          const updated = [...prev];
          const prevItem = updated[existing];
          const now = Date.now();
          const timeDiff = (now - (prevItem._lastUpdate || now)) / 1000;
          const bytesDiff = (item.received || 0) - (prevItem.received || 0);
          const speed = timeDiff > 0.1 ? bytesDiff / timeDiff : (prevItem.speed || 0);
          updated[existing] = { ...updated[existing], ...item, speed, _lastUpdate: now };
          return updated;
        }
        return [{ ...item, id: Date.now(), startedAt: new Date().toLocaleTimeString(), _lastUpdate: Date.now(), speed: 0 }, ...prev];
      });
      if (item.state === 'started' || item.state === 'progressing') setShowBar(true);
    };

    window.electronAPI.onDownloadProgress(handleProgress);
  }, []);

  const pauseDownload = (filename) => window.electronAPI?.downloadPause?.(filename);
  const resumeDownload = (filename) => window.electronAPI?.downloadResume?.(filename);
  const cancelDownload = (filename) => {
    window.electronAPI?.downloadCancel?.(filename);
    setDownloads(prev => prev.map(d => d.filename === filename ? { ...d, state: 'cancelled' } : d));
  };
  const openFile = (path) => window.electronAPI?.openFile?.(path);
  const showInFolder = (path) => window.electronAPI?.showInFolder?.(path);

  const activeDownloads = downloads.filter(d => d.state === 'progressing' || d.state === 'started');
  const completedDownloads = downloads.filter(d => d.state === 'completed');
  const failedDownloads = downloads.filter(d => d.state === 'interrupted' || d.state === 'cancelled');

  const barItem = activeDownloads[0] || completedDownloads[0];
  const barPercent = barItem?.total ? Math.round((barItem.received / barItem.total) * 100) : 0;

  const btnStyle = (bg, color, border) => ({
    background: bg, border: border || 'none', color: color,
    padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
    transition: '0.15s', lineHeight: 1,
  });

  return (
    <>
      {/* Bottom Download Bar */}
      {showBar && barItem && !isDownloadsOpen && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 48,
          background: 'rgba(20,20,28,0.97)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
          zIndex: 99999,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            {getFileIcon(barItem.filename)}
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>
              {barItem.filename}
            </span>
            {(barItem.state === 'progressing' || barItem.state === 'started') && (
              <span style={{ color: barItem.isPaused ? '#ffd700' : '#00d4ff', fontSize: 12, whiteSpace: 'nowrap' }}>
                {barItem.isPaused ? '⏸ Paused' : `${barPercent}% • ${formatBytes(barItem.received)}/${formatBytes(barItem.total)}`}
                {!barItem.isPaused && barItem.speed > 0 && ` • ${formatSpeed(barItem.speed)}`}
              </span>
            )}
            {barItem.state === 'completed' && <span style={{ color: '#00ffcc', fontSize: 12 }}>✓ Complete</span>}
          </div>

          {(barItem.state === 'progressing' || barItem.state === 'started') && (
            <>
              <div style={{ width: 100, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barPercent}%`, borderRadius: 2, background: barItem.isPaused ? '#ffd700' : 'linear-gradient(90deg, #00d4ff, #bf00ff)', transition: 'width 0.3s' }} />
              </div>
              {barItem.isPaused ? (
                <button onClick={() => resumeDownload(barItem.filename)} style={btnStyle('rgba(0,212,255,0.15)', '#00d4ff', '1px solid rgba(0,212,255,0.3)')} title="Resume">
                  <Play size={12} /> Resume
                </button>
              ) : (
                <button onClick={() => pauseDownload(barItem.filename)} style={btnStyle('rgba(255,215,0,0.15)', '#ffd700', '1px solid rgba(255,215,0,0.3)')} title="Pause">
                  <Pause size={12} /> Pause
                </button>
              )}
              <button onClick={() => cancelDownload(barItem.filename)} style={btnStyle('rgba(255,59,48,0.15)', '#ff3b30', '1px solid rgba(255,59,48,0.3)')} title="Cancel">
                <XCircle size={12} />
              </button>
            </>
          )}
          {barItem.state === 'completed' && barItem.savePath && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => openFile(barItem.savePath)} style={btnStyle('linear-gradient(135deg, #00d4ff, #00ffcc)', '#000')}>Open</button>
              <button onClick={() => showInFolder(barItem.savePath)} style={btnStyle('rgba(255,255,255,0.08)', '#fff', '1px solid rgba(255,255,255,0.15)')}>
                <Folder size={12} /> Show
              </button>
            </div>
          )}
          <button onClick={() => { setIsDownloadsOpen(true); setShowBar(false); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }} title="All downloads">
            <ChevronUp size={16} />
          </button>
          <button onClick={() => setShowBar(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Full Downloads Modal */}
      {isDownloadsOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setIsDownloadsOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 560, maxHeight: '80vh', background: 'rgba(25,25,30,0.95)',
            backdropFilter: 'blur(40px)', borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'rgba(0,212,255,0.1)', padding: 10, borderRadius: 12 }}><Download size={20} color="#00d4ff" /></div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700 }}>Downloads</h3>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {downloads.length === 0 ? 'No downloads yet' : `${downloads.length} file${downloads.length > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {downloads.length > 0 && (
                  <button onClick={() => setDownloads([])} style={btnStyle('rgba(255,255,255,0.05)', 'rgba(255,255,255,0.5)', '1px solid rgba(255,255,255,0.1)')}>Clear All</button>
                )}
                <button onClick={() => setIsDownloadsOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
              </div>
            </div>

            {/* Download List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
              {downloads.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'rgba(255,255,255,0.3)' }}>
                  <Download size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>Downloads will appear here</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.6 }}>Files you download from websites will be listed in this panel</p>
                </div>
              )}

              {/* Active Downloads */}
              {activeDownloads.map(dl => {
                const percent = dl.total ? Math.round((dl.received / dl.total) * 100) : 0;
                return (
                  <div key={dl.filename} style={{
                    padding: '14px 16px', margin: '6px 0', borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,212,255,0.15)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {getFileIcon(dl.filename)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dl.filename}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                          {dl.isPaused ? '⏸ Paused — ' : ''}{formatBytes(dl.received)} / {formatBytes(dl.total)} • {percent}%
                          {!dl.isPaused && dl.speed > 0 && ` • ${formatSpeed(dl.speed)}`}
                        </div>
                      </div>
                      {/* Controls */}
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {dl.isPaused ? (
                          <button onClick={() => resumeDownload(dl.filename)} style={btnStyle('rgba(0,212,255,0.15)', '#00d4ff', '1px solid rgba(0,212,255,0.3)')} title="Resume">
                            <Play size={13} />
                          </button>
                        ) : (
                          <button onClick={() => pauseDownload(dl.filename)} style={btnStyle('rgba(255,215,0,0.15)', '#ffd700', '1px solid rgba(255,215,0,0.3)')} title="Pause">
                            <Pause size={13} />
                          </button>
                        )}
                        <button onClick={() => cancelDownload(dl.filename)} style={btnStyle('rgba(255,59,48,0.15)', '#ff3b30', '1px solid rgba(255,59,48,0.3)')} title="Cancel">
                          <XCircle size={13} />
                        </button>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 10, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${percent}%`, borderRadius: 2,
                        background: dl.isPaused ? '#ffd700' : 'linear-gradient(90deg, #00d4ff, #bf00ff)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}

              {/* Completed Downloads */}
              {completedDownloads.map(dl => (
                <div key={dl.filename + dl.id} style={{
                  padding: '14px 16px', margin: '6px 0', borderRadius: 14, background: 'rgba(255,255,255,0.03)',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {getFileIcon(dl.filename)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dl.filename}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{formatBytes(dl.total)} • {dl.startedAt || 'Completed'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {dl.savePath && (
                        <>
                          <button onClick={() => openFile(dl.savePath)} style={btnStyle('linear-gradient(135deg, #00d4ff, #00ffcc)', '#000')}>Open</button>
                          <button onClick={() => showInFolder(dl.savePath)} title="Show in folder" style={btnStyle('rgba(255,255,255,0.06)', 'rgba(255,255,255,0.6)', '1px solid rgba(255,255,255,0.1)')}>
                            <Folder size={14} />
                          </button>
                        </>
                      )}
                      <CheckCircle size={16} color="#00ffcc" />
                    </div>
                  </div>
                </div>
              ))}

              {/* Failed Downloads */}
              {failedDownloads.map(dl => (
                <div key={dl.filename + dl.id} style={{
                  padding: '14px 16px', margin: '6px 0', borderRadius: 14,
                  background: 'rgba(255,59,48,0.05)', border: '1px solid rgba(255,59,48,0.15)',
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  {getFileIcon(dl.filename)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dl.filename}</div>
                    <div style={{ fontSize: 11, color: '#ff5f56', marginTop: 2 }}>{dl.state === 'cancelled' ? 'Cancelled' : 'Download failed'}</div>
                  </div>
                  <AlertCircle size={16} color="#ff5f56" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

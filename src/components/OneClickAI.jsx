import React, { useEffect } from 'react';
import { Download, CheckCircle, RefreshCcw, Cpu, Loader2 } from 'lucide-react';
import useLocalAI from '../hooks/useLocalAI';
import useBrowserStore from '../store/useBrowserStore';

export default function OneClickAI() {
  const { status, progress, errorMsg, checkOllama, openInstallPage, setStatus } = useLocalAI();
  const setAiProvider = useBrowserStore(state => state.setAiProvider);
  const setLocalAIReady = useBrowserStore(state => state.setLocalAIReady);
  const localAIReady = useBrowserStore(state => state.localAIReady);

  useEffect(() => {
    if (localAIReady) setStatus('connected');
  }, [localAIReady]);

  const handleStart = async () => {
    setStatus('checking');
    await checkOllama();
  };

  const handleConnect = () => {
    setAiProvider('ollama');
    setLocalAIReady(true);
  };

  if (status === 'connected') {
    return (
      <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0, 255, 136, 0.2)', textAlign: 'center', marginTop: '16px' }}>
        <CheckCircle size={32} color="#00ff88" style={{ marginBottom: '8px' }} />
        <h4 style={{ margin: '0 0 4px', color: '#fff' }}>Local AI Ready ✅</h4>
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Running 100% privately on your machine.</p>
        <button className="action-btn" onClick={handleConnect} style={{ background: '#00ff88', color: '#000', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}>
          Use Local AI Now
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Cpu size={24} color="#00d4ff" />
        <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>1-Click Local AI</h3>
      </div>
      
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', maxWidth: '80%' }}>
        Run AI completely offline and free. We'll set everything up for you.
      </p>

      {status === 'idle' && (
        <button className="action-btn" onClick={handleStart} style={{ background: 'linear-gradient(135deg, #00d4ff, #bf00ff)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '24px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)', transition: 'transform 0.2s', width: '100%', justifyContent: 'center' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
          <Sparkles /> Enable Free AI (1 Click)
        </button>
      )}

      {status === 'checking' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00d4ff', fontSize: '13px' }}>
          <Loader2 size={16} className="spin-icon" /> Checking local environment...
        </div>
      )}

      {status === 'install' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <div style={{ background: 'rgba(255,165,2,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,165,2,0.2)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#ffa502' }}>Ollama was not detected.</p>
            <button className="action-btn" onClick={openInstallPage} style={{ background: '#ffa502', color: '#000', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Download size={14} /> Download & Install Ollama
            </button>
          </div>
          <button className="action-btn" onClick={handleStart} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <RefreshCcw size={14} /> I've Installed It, Retry
          </button>
        </div>
      )}

      {status === 'downloading' && (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#00d4ff' }}>
            <span>Downloading Llama 3 Model...</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #00d4ff, #bf00ff)', transition: 'width 0.3s' }}></div>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>This may take a while depending on your internet connection.</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center', color: '#ff4757', fontSize: '12px' }}>
          <p style={{ margin: '0 0 8px' }}>{errorMsg}</p>
          <button className="action-btn" onClick={handleStart} style={{ background: '#ff4757', color: '#fff', padding: '6px 12px', borderRadius: '6px' }}>Retry</button>
        </div>
      )}
    </div>
  );
}

const Sparkles = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>;

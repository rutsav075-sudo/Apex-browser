import React, { useState, useEffect, useRef } from 'react';
import { X, Gamepad2, Zap, Wifi, Cpu, MemoryStick, Monitor, Volume2, VolumeX, Shield, Maximize, Minimize2 } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';
import '../styles/StoreAnimations.css';

export default function GameMode() {
  const isGamingMode = useBrowserStore(state => state.isGamingMode);
  const setIsGamingMode = useBrowserStore(state => state.setIsGamingMode);
  const suspendBackgroundTabs = useBrowserStore(state => state.suspendBackgroundTabs);
  const [isMinimized, setIsMinimized] = useState(false);
  const [fps, setFps] = useState(144);
  const [ramUsage, setRamUsage] = useState(42);
  const [cpuTemp, setCpuTemp] = useState(62);
  const [ping, setPing] = useState(12);
  const [gpuUsage, setGpuUsage] = useState(38);
  const [dnd, setDnd] = useState(true);
  const [boostActive, setBoostActive] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const intervalRef = useRef(null);

  // Simulate live stats when gaming mode is active
  useEffect(() => {
    if (!isGamingMode) return;
    setShowActivation(true);
    setTimeout(() => setShowActivation(false), 2000);
    // Only suspend once on activation, not on every re-render
    suspendBackgroundTabs();
    setBoostActive(true);

    intervalRef.current = setInterval(() => {
      setFps(Math.floor(140 + Math.random() * 20));
      setRamUsage(Math.floor(35 + Math.random() * 25));
      setCpuTemp(Math.floor(55 + Math.random() * 20));
      setPing(Math.floor(8 + Math.random() * 30));
      setGpuUsage(Math.floor(30 + Math.random() * 40));
    }, 1500);

    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGamingMode]);

  if (!isGamingMode) return null;

  const StatCard = ({ icon, label, value, unit, color, warn }) => (
    <div style={{
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
      border: `1px solid ${warn ? 'rgba(255,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px',
      boxShadow: warn ? '0 0 20px rgba(255,68,68,0.15)' : '0 8px 24px rgba(0,0,0,0.3)',
      transition: 'all 0.3s', minWidth: '140px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '800', color, fontFamily: 'monospace', letterSpacing: '-1px' }}>
        {value}<span style={{ fontSize: '14px', opacity: 0.6, marginLeft: '4px' }}>{unit}</span>
      </div>
    </div>
  );

  // Minimized floating HUD
  if (isMinimized) {
    return (
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px', zIndex: 100000,
        display: 'flex', alignItems: 'center', gap: '16px',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,0,85,0.3)', borderRadius: '50px',
        padding: '8px 20px', animation: 'game-hud-glow 3s infinite',
        pointerEvents: 'auto', cursor: 'pointer',
      }}
      onClick={() => setIsMinimized(false)}
      >
        <Gamepad2 size={16} color="#ff0055" />
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#00ff88', fontSize: '14px' }}>{fps} FPS</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#00d4ff', fontSize: '14px' }}>{ping}ms</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#ffa502', fontSize: '14px' }}>{cpuTemp}°C</span>
      </div>
    );
  }

  return (
    <>
      {/* Activation flash */}
      {showActivation && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200000,
          background: 'radial-gradient(circle at center, rgba(255,0,85,0.3) 0%, transparent 70%)',
          animation: 'store-fade-in 0.5s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}

      {/* Main overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(30px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'store-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse at top, rgba(255,0,85,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px', animation: 'store-nav-slide 0.5s ease' }}>
          <div style={{ padding: '16px', background: 'rgba(255,0,85,0.15)', borderRadius: '20px', border: '1px solid rgba(255,0,85,0.3)' }}>
            <Gamepad2 size={36} color="#ff0055" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '36px', fontWeight: '900', background: 'linear-gradient(135deg, #ff0055, #ff4757, #ffa502)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
              GAME MODE
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px', letterSpacing: '3px', textTransform: 'uppercase' }}>Performance HUD Active</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '600px', width: '100%', padding: '0 20px', marginBottom: '32px', animation: 'store-fade-in-up 0.6s ease' }}>
          <StatCard icon={<Monitor size={14} />} label="FPS" value={fps} unit="fps" color="#00ff88" />
          <StatCard icon={<MemoryStick size={14} />} label="RAM" value={ramUsage} unit="%" color="#00d4ff" warn={ramUsage > 80} />
          <StatCard icon={<Cpu size={14} />} label="CPU" value={cpuTemp} unit="°C" color="#ffa502" warn={cpuTemp > 75} />
          <StatCard icon={<Wifi size={14} />} label="Ping" value={ping} unit="ms" color="#bf00ff" warn={ping > 30} />
          <StatCard icon={<Zap size={14} />} label="GPU" value={gpuUsage} unit="%" color="#ff0055" />
          <StatCard icon={<Shield size={14} />} label="Boost" value={boostActive ? 'ON' : 'OFF'} unit="" color={boostActive ? '#00ff88' : '#ff4757'} />
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', animation: 'store-fade-in-up 0.7s ease' }}>
          {[
            { label: 'Do Not Disturb', icon: dnd ? <VolumeX size={16} /> : <Volume2 size={16} />, active: dnd, onClick: () => setDnd(!dnd), color: '#ff0055' },
            { label: 'Minimize HUD', icon: <Minimize2 size={16} />, active: false, onClick: () => setIsMinimized(true), color: '#00d4ff' },
            { label: 'Fullscreen', icon: <Maximize size={16} />, active: false, onClick: () => { try { document.documentElement.requestFullscreen(); } catch(e){} }, color: '#ffa502' },
          ].map((btn, i) => (
            <button key={i} onClick={btn.onClick} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: btn.active ? `${btn.color}20` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${btn.active ? `${btn.color}50` : 'rgba(255,255,255,0.1)'}`,
              color: btn.active ? btn.color : 'rgba(255,255,255,0.7)',
              padding: '12px 20px', borderRadius: '12px', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>

        {/* Deactivate Button */}
        <button onClick={() => { setIsGamingMode(false); setBoostActive(false); }} style={{
          background: 'rgba(255,0,85,0.15)', border: '1px solid rgba(255,0,85,0.4)',
          color: '#ff0055', padding: '14px 48px', borderRadius: '50px',
          fontWeight: 'bold', fontSize: '15px', cursor: 'pointer',
          transition: 'all 0.3s', letterSpacing: '2px', textTransform: 'uppercase',
          animation: 'store-fade-in-up 0.8s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,85,0.3)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,0,85,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Exit Game Mode
        </button>

        {/* Close button */}
        <button onClick={() => setIsMinimized(true)} style={{
          position: 'absolute', top: 32, right: 32, width: 48, height: 48,
          borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#fff',
          cursor: 'pointer', transition: '0.3s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'; }}
        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
        >
          <X size={24} />
        </button>
      </div>
    </>
  );
}

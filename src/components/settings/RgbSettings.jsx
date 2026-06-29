import React from 'react';
import { Sparkles } from 'lucide-react';
import useBrowserStore from '../../store/useBrowserStore';

export default function RgbSettings() {
    const { isRgbOn, setIsRgbOn, rgbMode, setRgbMode, rgbColor, setRgbColor, rgbSpeed, setRgbSpeed } = useBrowserStore();

    return (
        <div className="settings-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', letterSpacing: '1px' }}>
                    <Sparkles color="#00d4ff" /> RGB Light Sense
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold' }}>Device Light</span>
                    <label className="toggle-switch">
                        <input type="checkbox" checked={isRgbOn} onChange={(e) => setIsRgbOn(e.target.checked)} />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div style={{ 
                width: '100%', height: '60px', borderRadius: '16px', marginBottom: '24px', 
                background: 'rgba(0,0,0,0.6)', position: 'relative', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.4)',
                opacity: isRgbOn ? 1 : 0.3, transition: '0.3s'
            }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', zIndex: 2 }}>
                    ● Live Preview — {rgbMode.charAt(0).toUpperCase() + rgbMode.slice(1)}
                </div>
                {rgbMode === 'rainbow' ? (
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #ff0055, #ffa502, #2ed573, #00d4ff, #bf00ff, #ff006e)', opacity: 0.4, animation: 'rgb-preview-slide 3s linear infinite' }} />
                ) : (
                    <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 40px ${rgbColor}, inset 0 0 80px ${rgbColor}40`, animation: rgbMode === 'breathing' || rgbMode === 'pulse' ? 'rgb-preview-pulse 2s infinite alternate ease-in-out' : 'none' }} />
                )}
            </div>
            
            <div style={{ display: 'flex', gap: '24px', opacity: isRgbOn ? 1 : 0.4, pointerEvents: isRgbOn ? 'auto' : 'none', transition: '0.3s ease' }}>
                <div style={{ width: '220px', flexShrink: 0 }}>
                    <label style={{ fontSize: '11px', color: '#a0a0b0', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Static</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '16px' }}>
                        {[{ id: 'basic', label: '💡 Static Glow', desc: 'Constant edge glow' }].map(m => (
                            <button key={m.id} className={`settings-tab ${rgbMode === m.id ? 'active' : ''}`} onClick={() => setRgbMode(m.id)} style={{ justifyContent: 'flex-start', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }} title={m.desc}>{m.label}</button>
                        ))}
                    </div>

                    <label style={{ fontSize: '11px', color: '#a0a0b0', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Dynamic</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '16px' }}>
                        {[
                            { id: 'breathing', label: '🫧 Breathing', desc: 'Smooth fade in/out' },
                            { id: 'pulse', label: '💓 Heartbeat', desc: 'Double-beat pulse' },
                            { id: 'neon', label: '⚡ Neon Border', desc: 'Travelling light border' },
                            { id: 'rainbow', label: '🌈 Rainbow', desc: 'Rotating hue cycle' },
                            { id: 'strobe', label: '🔦 Strobe', desc: 'Fast flash effect' }
                        ].map(m => (
                            <button key={m.id} className={`settings-tab ${rgbMode === m.id ? 'active' : ''}`} onClick={() => setRgbMode(m.id)} style={{ justifyContent: 'flex-start', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }} title={m.desc}>{m.label}</button>
                        ))}
                    </div>

                    <label style={{ fontSize: '11px', color: '#a0a0b0', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Advanced FX</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {[
                            { id: 'wave', label: '🌊 Wave', desc: 'Animated edge waves' },
                            { id: 'aurora', label: '🌌 Aurora', desc: 'Northern lights effect' },
                            { id: 'particles', label: '✨ Particles', desc: 'Floating particle network' },
                            { id: 'matrix', label: '🖥️ Matrix Rain', desc: 'Digital rain effect' },
                        ].map(m => (
                            <button key={m.id} className={`settings-tab ${rgbMode === m.id ? 'active' : ''}`} onClick={() => setRgbMode(m.id)} style={{ justifyContent: 'flex-start', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }} title={m.desc}>{m.label}</button>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.2)' }}>
                    <label style={{ fontSize: '11px', color: '#a0a0b0', marginBottom: '16px', display: 'block', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Color</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {['#ff0055', '#ff4757', '#ffa502', '#2ed573', '#00d4ff', '#bf00ff', '#ff006e', '#ffffff', '#ff8c00', '#00ffcc'].map(c => (
                            <div key={c} onClick={() => setRgbColor(c)} style={{ width: '32px', height: '32px', background: c, border: rgbColor === c ? '3px solid #fff' : '3px solid transparent', borderRadius: '8px', cursor: 'pointer', boxShadow: rgbColor === c ? `0 0 20px ${c}, 0 4px 12px rgba(0,0,0,0.4)` : '0 4px 10px rgba(0,0,0,0.5)', transition: 'all 0.2s', transform: rgbColor === c ? 'scale(1.15)' : 'scale(1)' }} />
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '28px' }}>
                        <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', border: `2px solid ${rgbColor}`, boxShadow: `0 0 12px ${rgbColor}60` }}>
                            <input type="color" value={rgbColor} onChange={(e) => setRgbColor(e.target.value)} style={{ position: 'absolute', inset: '-8px', width: 'calc(100% + 16px)', height: 'calc(100% + 16px)', border: 'none', cursor: 'pointer' }} />
                        </div>
                        <span style={{ fontSize: '13px', color: '#a0a0b0', fontFamily: 'monospace', letterSpacing: '1px' }}>{rgbColor.toUpperCase()}</span>
                    </div>
                    
                    <label style={{ fontSize: '11px', color: '#a0a0b0', marginBottom: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Speed</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <span style={{ fontSize: '12px', color: '#a0a0b0' }}>Slow</span>
                        <input type="range" min="1" max="10" value={rgbSpeed} onChange={(e) => setRgbSpeed(parseInt(e.target.value))} style={{ flex: 1, cursor: 'pointer', accentColor: rgbColor, height: '6px' }} />
                        <span style={{ fontSize: '12px', color: '#a0a0b0' }}>Fast</span>
                        <span style={{ fontSize: '14px', color: rgbColor, fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>{rgbSpeed}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

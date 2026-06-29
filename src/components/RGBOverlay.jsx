import React, { useEffect, useRef } from 'react';
import useBrowserStore from '../store/useBrowserStore';

/**
 * RGBOverlay — Apex RGB Light Sense Engine
 * 8 stunning visual modes rendered via CSS + Canvas
 */
export default function RGBOverlay() {
  const isRgbOn = useBrowserStore(state => state.isRgbOn);
  const rgbMode = useBrowserStore(state => state.rgbMode);
  const rgbColor = useBrowserStore(state => state.rgbColor);
  const rgbSpeed = useBrowserStore(state => state.rgbSpeed);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  // Parse hex color to RGB components
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 212, b: 255 };
  };

  // Canvas-based effects for wave, aurora, particles
  useEffect(() => {
    if (!isRgbOn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const needsCanvas = ['wave', 'aurora', 'particles', 'matrix'].includes(rgbMode);
    if (!needsCanvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext('2d');
    const rgb = hexToRgb(rgbColor);
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const speedMultiplier = rgbSpeed / 5;

    const drawWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Top edge wave
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let x = 0; x <= w; x += 2) {
          const y = Math.sin((x * 0.005) + time * (1 + i * 0.3)) * (25 + i * 15) + 40;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, 0);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.4 - i * 0.1})`);
        grad.addColorStop(0.5, `rgba(${rgb.r + 40}, ${rgb.g + 20}, ${rgb.b}, ${0.6 - i * 0.15})`);
        grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.3 - i * 0.08})`);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Bottom edge wave
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 2) {
          const y = h - Math.sin((x * 0.004) + time * (0.8 + i * 0.2) + Math.PI) * (20 + i * 12) - 35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, h, w, h);
        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.35 - i * 0.08})`);
        grad.addColorStop(1, `rgba(${rgb.r + 30}, ${rgb.g}, ${rgb.b + 30}, ${0.4 - i * 0.1})`);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Left edge glow
      const leftGrad = ctx.createLinearGradient(0, 0, 80, 0);
      leftGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.3 + Math.sin(time) * 0.15})`);
      leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(0, 0, 80, h);

      // Right edge glow
      const rightGrad = ctx.createLinearGradient(w, 0, w - 80, 0);
      rightGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.3 + Math.cos(time) * 0.15})`);
      rightGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(w - 80, 0, 80, h);
    };

    const drawAurora = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const offset = i * 0.8;
        for (let x = 0; x <= w; x += 3) {
          const wave1 = Math.sin(x * 0.003 + time * 0.5 + offset) * 60;
          const wave2 = Math.cos(x * 0.005 + time * 0.3 + offset * 2) * 40;
          const wave3 = Math.sin(x * 0.002 + time * 0.7 + offset * 0.5) * 30;
          const y = h * 0.3 + wave1 + wave2 + wave3 + i * 30;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();

        const hueShift = (i * 40 + time * 20) % 360;
        const grad = ctx.createLinearGradient(0, 0, w, h * 0.5);
        grad.addColorStop(0, `hsla(${hueShift}, 100%, 60%, ${0.08 - i * 0.012})`);
        grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.12 - i * 0.02})`);
        grad.addColorStop(1, `hsla(${(hueShift + 60) % 360}, 100%, 50%, ${0.06 - i * 0.01})`);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Subtle shimmer particles
      for (let i = 0; i < 15; i++) {
        const px = (Math.sin(time * 0.3 + i * 1.7) * 0.5 + 0.5) * w;
        const py = (Math.cos(time * 0.2 + i * 2.3) * 0.3 + 0.2) * h;
        const size = 1 + Math.sin(time + i) * 0.5;
        const alpha = 0.3 + Math.sin(time * 2 + i) * 0.2;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    };

    const particles = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * (canvas.width || 1920),
        y: Math.random() * (canvas.height || 1080),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      particles.forEach((p, i) => {
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;
        p.pulse += 0.02 * speedMultiplier;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const currentAlpha = p.alpha * (0.5 + Math.sin(p.pulse) * 0.5);
        const currentSize = p.size * (0.8 + Math.sin(p.pulse * 0.5) * 0.3);

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 8);
        glow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentAlpha * 0.4})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - currentSize * 8, p.y - currentSize * 8, currentSize * 16, currentSize * 16);

        // Core particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentAlpha})`;
        ctx.fill();

        // Draw connections to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(1 - dist / 150) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      // Edge glow
      const edgeSize = 40;
      const edgeAlpha = 0.15 + Math.sin(time * 0.5) * 0.05;
      [
        ctx.createLinearGradient(0, 0, edgeSize, 0), // left
        ctx.createLinearGradient(w, 0, w - edgeSize, 0), // right
        ctx.createLinearGradient(0, 0, 0, edgeSize), // top
        ctx.createLinearGradient(0, h, 0, h - edgeSize), // bottom
      ].forEach((grad, idx) => {
        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${edgeAlpha})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        if (idx === 0) ctx.fillRect(0, 0, edgeSize, h);
        else if (idx === 1) ctx.fillRect(w - edgeSize, 0, edgeSize, h);
        else if (idx === 2) ctx.fillRect(0, 0, w, edgeSize);
        else ctx.fillRect(0, h - edgeSize, w, edgeSize);
      });
    };

    const drawMatrix = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      const fontSize = 14;
      const cols = Math.floor(w / fontSize);
      if (!drawMatrix.drops) {
        drawMatrix.drops = Array(cols).fill(0).map(() => Math.random() * -50);
        // Mark which columns are active (only ~30% for sparseness)
        drawMatrix.active = Array(cols).fill(false).map((_, i) => {
          // Concentrate more on edges
          const edgeDist = Math.min(i, cols - i) / cols;
          return Math.random() < (edgeDist < 0.15 ? 0.6 : 0.15);
        });
      }

      ctx.font = `${fontSize}px monospace`;
      const chars = 'APEX01アイウエオカキクケコ▲▼◆●■';
      const trailLen = 12;

      for (let i = 0; i < cols; i++) {
        if (!drawMatrix.active[i]) continue;

        const x = i * fontSize;
        const headY = drawMatrix.drops[i];

        // Draw trail of fading characters behind the head
        for (let t = 0; t < trailLen; t++) {
          const yPos = (headY - t) * fontSize;
          if (yPos < 0 || yPos > h) continue;

          const char = chars[Math.floor(Math.random() * chars.length)];
          const fade = 1 - (t / trailLen);

          if (t === 0) {
            // Bright head character
            ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.6})`;
            ctx.fillText(char, x, yPos);
          }
          // Colored trail
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fade * 0.35})`;
          ctx.fillText(char, x, yPos);
        }

        if (headY * fontSize > h + trailLen * fontSize) {
          if (Math.random() > 0.95) {
            drawMatrix.drops[i] = Math.random() * -20;
            // Occasionally toggle column activity
            drawMatrix.active[i] = Math.random() < 0.4;
            // Activate a random inactive column
            const randCol = Math.floor(Math.random() * cols);
            drawMatrix.active[randCol] = true;
          }
        }
        drawMatrix.drops[i] += speedMultiplier * 0.4;
      }

      // Subtle edge glow
      const edgeW = 60;
      const edgeAlpha = 0.12 + Math.sin(time) * 0.05;
      const lg = ctx.createLinearGradient(0, 0, edgeW, 0);
      lg.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${edgeAlpha})`);
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, edgeW, h);
      const rg = ctx.createLinearGradient(w, 0, w - edgeW, 0);
      rg.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${edgeAlpha})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(w - edgeW, 0, edgeW, h);
    };

    const animate = () => {
      time += 0.02 * speedMultiplier;
      if (rgbMode === 'wave') drawWave();
      else if (rgbMode === 'aurora') drawAurora();
      else if (rgbMode === 'particles') drawParticles();
      else if (rgbMode === 'matrix') drawMatrix();
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isRgbOn, rgbMode, rgbColor, rgbSpeed]);

  if (!isRgbOn) return null;

  const rgb = hexToRgb(rgbColor);
  const speedDuration = 12 / rgbSpeed;
  const pulseDuration = 1.5 / rgbSpeed;
  const needsCanvas = ['wave', 'aurora', 'particles', 'matrix'].includes(rgbMode);

  return (
    <>
      {/* Canvas layer for advanced effects */}
      <canvas 
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 99998,
          opacity: needsCanvas ? 1 : 0,
        }}
      />

      {/* CSS-based overlay for simpler effects */}
      <div 
        className="rgb-overlay no-drag"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 99999,
        }}
      >
        {/* Basic — static glow around edges */}
        {rgbMode === 'basic' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            boxShadow: `inset 0 0 ${20 + (rgbSpeed * 8)}px ${rgbColor}, inset 0 0 ${40 + (rgbSpeed * 12)}px ${rgbColor}40`,
            transition: 'box-shadow 0.5s ease',
          }} />
        )}

        {/* Breathing — smooth fade in/out glow */}
        {rgbMode === 'breathing' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            animation: `rgb-breathe-v2 ${speedDuration}s infinite alternate ease-in-out`,
          }} />
        )}

        {/* Pulse — rapid heartbeat effect */}
        {rgbMode === 'pulse' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            animation: `rgb-pulse-v2 ${pulseDuration}s infinite cubic-bezier(0.22, 1, 0.36, 1)`,
          }} />
        )}

        {/* Neon Border — glowing border lines that travel */}
        {rgbMode === 'neon' && (
          <>
            <div className="rgb-neon-top" style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: `linear-gradient(90deg, transparent, ${rgbColor}, transparent)`,
              animation: `rgb-neon-scan-h ${3 / rgbSpeed * 5}s linear infinite`,
              boxShadow: `0 0 15px ${rgbColor}, 0 0 30px ${rgbColor}60, 0 0 60px ${rgbColor}30`,
            }} />
            <div className="rgb-neon-bottom" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
              background: `linear-gradient(90deg, transparent, ${rgbColor}, transparent)`,
              animation: `rgb-neon-scan-h ${3 / rgbSpeed * 5}s linear infinite reverse`,
              boxShadow: `0 0 15px ${rgbColor}, 0 0 30px ${rgbColor}60, 0 0 60px ${rgbColor}30`,
            }} />
            <div className="rgb-neon-left" style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px',
              background: `linear-gradient(180deg, transparent, ${rgbColor}, transparent)`,
              animation: `rgb-neon-scan-v ${3 / rgbSpeed * 5}s linear infinite`,
              boxShadow: `0 0 15px ${rgbColor}, 0 0 30px ${rgbColor}60, 0 0 60px ${rgbColor}30`,
            }} />
            <div className="rgb-neon-right" style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: '3px',
              background: `linear-gradient(180deg, transparent, ${rgbColor}, transparent)`,
              animation: `rgb-neon-scan-v ${3 / rgbSpeed * 5}s linear infinite reverse`,
              boxShadow: `0 0 15px ${rgbColor}, 0 0 30px ${rgbColor}60, 0 0 60px ${rgbColor}30`,
            }} />
            {/* Corner hot spots */}
            {[[0,0],[100,0],[0,100],[100,100]].map(([x,y], i) => (
              <div key={i} style={{
                position: 'absolute',
                [y === 0 ? 'top' : 'bottom']: '-10px',
                [x === 0 ? 'left' : 'right']: '-10px',
                width: '60px', height: '60px',
                background: `radial-gradient(circle, ${rgbColor}50 0%, transparent 70%)`,
                animation: `rgb-corner-pulse ${2 / rgbSpeed * 5}s infinite alternate ease-in-out ${i * 0.3}s`,
              }} />
            ))}
          </>
        )}

        {/* Rainbow — rotating hue border glow */}
        {rgbMode === 'rainbow' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            animation: `rgb-rainbow-rotate ${6 / rgbSpeed * 5}s linear infinite`,
          }} />
        )}

        {/* Strobe — fast flashing effect */}
        {rgbMode === 'strobe' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            animation: `rgb-strobe ${0.3 / (rgbSpeed / 5)}s steps(2) infinite`,
            background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`,
          }} />
        )}
      </div>

      {/* Dynamic keyframe styles injected based on current color */}
      <style>{`
        @keyframes rgb-breathe-v2 {
          0% { 
            box-shadow: inset 0 0 10px ${rgbColor}20, inset 0 0 40px ${rgbColor}10; 
            opacity: 0.4; 
          }
          50% { 
            box-shadow: inset 0 0 60px ${rgbColor}80, inset 0 0 120px ${rgbColor}30, inset 0 0 180px ${rgbColor}15; 
            opacity: 0.85; 
          }
          100% { 
            box-shadow: inset 0 0 100px ${rgbColor}, inset 0 0 200px ${rgbColor}50, inset 0 0 300px ${rgbColor}20; 
            opacity: 1; 
          }
        }

        @keyframes rgb-pulse-v2 {
          0%   { box-shadow: inset 0 0 5px ${rgbColor}30; opacity: 0.3; }
          15%  { box-shadow: inset 0 0 120px ${rgbColor}, inset 0 0 60px rgba(255,255,255,0.15); opacity: 1; }
          30%  { box-shadow: inset 0 0 20px ${rgbColor}50; opacity: 0.4; }
          45%  { box-shadow: inset 0 0 80px ${rgbColor}cc; opacity: 0.85; }
          60%  { box-shadow: inset 0 0 10px ${rgbColor}30; opacity: 0.3; }
          100% { box-shadow: inset 0 0 5px ${rgbColor}20; opacity: 0.2; }
        }

        @keyframes rgb-neon-scan-h {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes rgb-neon-scan-v {
          0%   { background-position: 0 -200%; }
          100% { background-position: 0 200%; }
        }

        @keyframes rgb-corner-pulse {
          0%   { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.5); }
        }

        @keyframes rgb-rainbow-rotate {
          0%   { box-shadow: inset 0 0 80px #ff0055, inset 0 0 160px #ff005530; }
          16%  { box-shadow: inset 0 0 80px #ffa502, inset 0 0 160px #ffa50230; }
          33%  { box-shadow: inset 0 0 80px #2ed573, inset 0 0 160px #2ed57330; }
          50%  { box-shadow: inset 0 0 80px #00d4ff, inset 0 0 160px #00d4ff30; }
          66%  { box-shadow: inset 0 0 80px #bf00ff, inset 0 0 160px #bf00ff30; }
          83%  { box-shadow: inset 0 0 80px #ff006e, inset 0 0 160px #ff006e30; }
          100% { box-shadow: inset 0 0 80px #ff0055, inset 0 0 160px #ff005530; }
        }

        @keyframes rgb-strobe {
          0%   { opacity: 0; }
          50%  { opacity: 0.5; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Focus, Play, Pause, RotateCcw, Coffee, CloudRain, Music, Timer, Ban, CheckCircle, Minimize2, Maximize, Upload, Trash2, SkipForward, Volume2 } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';
import '../styles/StoreAnimations.css';

const BLOCKED_SITES = [
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com',
  'reddit.com', 'youtube.com', 'twitch.tv', 'discord.com', 'snapchat.com',
];

export default function FocusMode() {
  const isFocusMode = useBrowserStore(state => state.isFocusMode);
  const setIsFocusMode = useBrowserStore(state => state.setIsFocusMode);
  const [isMinimized, setIsMinimized] = useState(false);
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessions] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(parseInt(localStorage.getItem('apex_focus_total') || '0'));
  const [ambientSound, setAmbientSound] = useState(null);
  const [blockedSites, setBlockedSites] = useState(BLOCKED_SITES);
  const [customBlock, setCustomBlock] = useState('');
  const [ambientVolume, setAmbientVolume] = useState(0.35);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);

  // --- Custom Music Library ---
  const [myTracks, setMyTracks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('apex_focus_tracks') || '[]'); } catch { return []; }
  });
  const [activeTrackIdx, setActiveTrackIdx] = useState(-1);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  const trackAudioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Persist tracks
  const saveTracks = (tracks) => {
    setMyTracks(tracks);
    // Store metadata only (not base64 data) to avoid localStorage quota issues
    // We store the full data for small files, metadata-only for large ones
    try {
      localStorage.setItem('apex_focus_tracks', JSON.stringify(tracks));
    } catch (e) {
      // If quota exceeded, keep only names
      console.warn('Storage quota exceeded, clearing old tracks');
      const trimmed = tracks.slice(-3); // keep last 3
      localStorage.setItem('apex_focus_tracks', JSON.stringify(trimmed));
      setMyTracks(trimmed);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (!file.type.startsWith('audio/')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const newTrack = {
          id: Date.now() + Math.random(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          data: reader.result,
          size: file.size,
          duration: null //  will be computed on play
        };
        const updated = [...myTracks, newTrack];
        saveTracks(updated);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeTrack = (id) => {
    if (activeTrackIdx >= 0 && myTracks[activeTrackIdx]?.id === id) {
      stopCustomTrack();
    }
    const updated = myTracks.filter(t => t.id !== id);
    saveTracks(updated);
    setActiveTrackIdx(-1);
  };

  const playCustomTrack = (idx) => {
    // Stop ambient if playing
    setAmbientSound(null);
    // Stop prev track
    if (trackAudioRef.current) {
      trackAudioRef.current.pause();
      trackAudioRef.current = null;
    }
    const track = myTracks[idx];
    if (!track) return;
    const audio = new Audio(track.data);
    audio.loop = false;
    audio.volume = ambientVolume;
    audio.onended = () => {
      // Auto-play next track
      const nextIdx = (idx + 1) % myTracks.length;
      playCustomTrack(nextIdx);
    };
    audio.play().catch(err => console.warn('Playback error:', err));
    trackAudioRef.current = audio;
    setActiveTrackIdx(idx);
    setIsTrackPlaying(true);
  };

  const toggleCustomTrack = () => {
    if (!trackAudioRef.current) {
      if (myTracks.length > 0) playCustomTrack(0);
      return;
    }
    if (isTrackPlaying) {
      trackAudioRef.current.pause();
      setIsTrackPlaying(false);
    } else {
      trackAudioRef.current.play().catch(() => {});
      setIsTrackPlaying(true);
    }
  };

  const skipTrack = () => {
    if (myTracks.length === 0) return;
    const nextIdx = (activeTrackIdx + 1) % myTracks.length;
    playCustomTrack(nextIdx);
  };

  const stopCustomTrack = () => {
    if (trackAudioRef.current) {
      trackAudioRef.current.pause();
      trackAudioRef.current = null;
    }
    setActiveTrackIdx(-1);
    setIsTrackPlaying(false);
  };

  // Update volume on custom track when slider changes
  useEffect(() => {
    if (trackAudioRef.current) trackAudioRef.current.volume = ambientVolume;
    if (masterGainRef.current) masterGainRef.current.gain.value = ambientVolume;
  }, [ambientVolume]);

  // --- Procedural ambient sound generator ---
  const createAmbientSound = (type) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.gain.value = ambientVolume;
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    if (type === 'rain') {
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 1200;
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 200;
      noise.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(masterGain);
      noise.start();
      const dripInterval = setInterval(() => {
        if (ctx.state === 'closed') { clearInterval(dripInterval); return; }
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800 + Math.random() * 2000;
        g.gain.setValueAtTime(0.02, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }, 100 + Math.random() * 300);
      ctx._cleanup = () => { clearInterval(dripInterval); };

    } else if (type === 'cafe') {
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 600;
      bandpass.Q.value = 0.5;
      noise.connect(bandpass);
      bandpass.connect(masterGain);
      noise.start();
      const clinkInterval = setInterval(() => {
        if (ctx.state === 'closed') { clearInterval(clinkInterval); return; }
        if (Math.random() > 0.6) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = 2000 + Math.random() * 3000;
          g.gain.setValueAtTime(0.008, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
      }, 800 + Math.random() * 1500);
      ctx._cleanup = () => { clearInterval(clinkInterval); };

    } else if (type === 'lofi') {
      // Lo-Fi: chord progression with rhythmic pulse + vinyl crackle + pink noise bed
      const chords = [
        [261.63, 329.63, 392.00], // Cmaj
        [220.00, 277.18, 329.63], // Am
        [349.23, 440.00, 523.25], // Fmaj
        [392.00, 493.88, 587.33], // Gmaj
      ];
      let chordIdx = 0;

      // Pink noise bed (vinyl texture)
      const pinkBufSize = 2 * ctx.sampleRate;
      const pinkBuf = ctx.createBuffer(1, pinkBufSize, ctx.sampleRate);
      const pinkData = pinkBuf.getChannelData(0);
      let pb0=0, pb1=0, pb2=0, pb3=0, pb4=0, pb5=0, pb6=0;
      for (let i = 0; i < pinkBufSize; i++) {
        const w = Math.random() * 2 - 1;
        pb0 = 0.99886*pb0 + w*0.0555179;
        pb1 = 0.99332*pb1 + w*0.0750759;
        pb2 = 0.96900*pb2 + w*0.1538520;
        pb3 = 0.86650*pb3 + w*0.3104856;
        pb4 = 0.55000*pb4 + w*0.5329522;
        pb5 = -0.7616*pb5 - w*0.0168980;
        pinkData[i] = (pb0+pb1+pb2+pb3+pb4+pb5+pb6+w*0.5362)*0.03;
        pb6 = w * 0.115926;
      }
      const pinkSrc = ctx.createBufferSource();
      pinkSrc.buffer = pinkBuf;
      pinkSrc.loop = true;
      const pinkGain = ctx.createGain();
      pinkGain.gain.value = 0.08;
      pinkSrc.connect(pinkGain);
      pinkGain.connect(masterGain);
      pinkSrc.start();

      // Vinyl crackle (random clicks)
      const crackleInterval = setInterval(() => {
        if (ctx.state === 'closed') { clearInterval(crackleInterval); return; }
        for (let k = 0; k < 3; k++) {
          const clickOsc = ctx.createOscillator();
          const clickGain = ctx.createGain();
          clickOsc.type = 'square';
          clickOsc.frequency.value = 4000 + Math.random() * 6000;
          const t0 = ctx.currentTime + Math.random() * 0.1;
          clickGain.gain.setValueAtTime(0.003 + Math.random() * 0.005, t0);
          clickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.01);
          clickOsc.connect(clickGain);
          clickGain.connect(masterGain);
          clickOsc.start(t0);
          clickOsc.stop(t0 + 0.015);
        }
      }, 200);

      // Play chords in progression with smooth attack/release
      const playChord = () => {
        if (ctx.state === 'closed') return;
        const chord = chords[chordIdx % chords.length];
        chordIdx++;
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = i === 0 ? 'sine' : 'triangle';
          osc.frequency.value = freq * 0.5; // one octave down for warmth
          
          // Warm muffled filter
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 300 + Math.random() * 200;
          lp.Q.value = 1;

          // Gentle envelope
          const now = ctx.currentTime;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.06, now + 0.3);
          gain.gain.setValueAtTime(0.06, now + 2.0);
          gain.gain.linearRampToValueAtTime(0, now + 3.5);

          osc.connect(lp);
          lp.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 3.6);
        });

        // Subtle bass note
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.type = 'sine';
        bass.frequency.value = chord[0] * 0.25;
        const now = ctx.currentTime;
        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(0.1, now + 0.2);
        bassGain.gain.setValueAtTime(0.1, now + 2.5);
        bassGain.gain.linearRampToValueAtTime(0, now + 3.5);
        bass.connect(bassGain);
        bassGain.connect(masterGain);
        bass.start(now);
        bass.stop(now + 3.6);
      };

      playChord();
      const chordInterval = setInterval(playChord, 3500);
      ctx._cleanup = () => { clearInterval(chordInterval); clearInterval(crackleInterval); };
    }

    return ctx;
  };

  // Ambient sound playback
  useEffect(() => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current._cleanup) audioCtxRef.current._cleanup();
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      masterGainRef.current = null;
    }

    if (ambientSound) {
      // Stop custom music if ambient is selected
      stopCustomTrack();
      audioCtxRef.current = createAmbientSound(ambientSound);
    }

    return () => {
      if (audioCtxRef.current) {
        if (audioCtxRef.current._cleanup) audioCtxRef.current._cleanup();
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        masterGainRef.current = null;
      }
    };
  }, [ambientSound]);

  // Cleanup all audio when focus mode is closed
  useEffect(() => {
    if (!isFocusMode) {
      if (audioCtxRef.current) {
        if (audioCtxRef.current._cleanup) audioCtxRef.current._cleanup();
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        masterGainRef.current = null;
      }
      setAmbientSound(null);
      stopCustomTrack();
    }
  }, [isFocusMode]);

  // Timer logic
  useEffect(() => {
    if (!isRunning || !isFocusMode) {
      clearInterval(timerRef.current);
      return;
    };

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!isBreak) {
            setSessions(s => s + 1);
            setTotalFocusTime(t => {
              const newT = t + workMin;
              localStorage.setItem('apex_focus_total', newT.toString());
              return newT;
            });
            setIsBreak(true);
            return breakMin * 60;
          } else {
            setIsBreak(false);
            return workMin * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isRunning, isBreak, workMin, breakMin, isFocusMode]);

  useEffect(() => {
    if (isFocusMode) {
      setTimeLeft(workMin * 60);
      setIsBreak(false);
      setIsRunning(false);
    }
  }, [isFocusMode]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(workMin * 60);
  }, [workMin]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = isBreak
    ? 1 - (timeLeft / (breakMin * 60))
    : 1 - (timeLeft / (workMin * 60));

  const circumference = 2 * Math.PI * 120;

  if (!isFocusMode) return null;

  // Minimized floating timer pill
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100000, display: 'flex', alignItems: 'center', gap: '12px',
          background: isBreak ? 'rgba(0,255,136,0.1)' : 'rgba(0,212,255,0.1)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isBreak ? 'rgba(0,255,136,0.3)' : 'rgba(0,212,255,0.3)'}`,
          borderRadius: '50px', padding: '10px 24px', cursor: 'pointer',
          animation: 'focus-breathe 4s infinite ease-in-out',
          pointerEvents: 'auto',
        }}
      >
        <Focus size={16} color={isBreak ? '#00ff88' : '#00d4ff'} />
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: isBreak ? '#00ff88' : '#00d4ff', fontSize: '18px' }}>
          {formatTime(timeLeft)}
        </span>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {isBreak ? 'Break' : 'Focus'}
        </span>
        {!isRunning && (
          <button onClick={(e) => { e.stopPropagation(); setIsRunning(true); }} style={{
            background: '#00d4ff', border: 'none', borderRadius: '50%',
            width: '28px', height: '28px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#000',
          }}><Play size={14} /></button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(40px)',
      animation: 'store-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      overflowY: 'auto',
    }}>
      {/* Close / Minimize */}
      <div style={{ position: 'fixed', top: 32, right: 32, display: 'flex', gap: '12px', zIndex: 10 }}>
        <button onClick={() => setIsMinimized(true)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
          <Minimize2 size={18} />
        </button>
        <button onClick={() => { setIsFocusMode(false); setIsRunning(false); }} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{
        minHeight: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 0', position: 'relative'
      }}>
        {/* Calming ambient gradient */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '1000px', height: '500px', background: isBreak ? 'radial-gradient(ellipse at top, rgba(0,255,136,0.1) 0%, transparent 70%)' : 'radial-gradient(ellipse at top, rgba(0,100,255,0.1) 0%, transparent 70%)', pointerEvents: 'none', transition: 'background 1s' }} />

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', animation: 'store-nav-slide 0.5s ease', position: 'relative', zIndex: 1 }}>
          <Focus size={28} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
            {isBreak ? '☕ Break Time' : '🎯 Focus Mode'}
          </h2>
        </div>

      {/* Circular Timer */}
      <div style={{ position: 'relative', width: '280px', height: '280px', marginBottom: '32px', animation: 'store-fade-in-up 0.5s ease' }}>
        <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="140" cy="140" r="120" fill="none"
            stroke={isBreak ? '#00ff88' : '#00d4ff'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '56px', fontWeight: '900', fontFamily: 'monospace', color: isBreak ? '#00ff88' : '#00d4ff', letterSpacing: '-2px', animation: isRunning ? 'timer-pulse 2s infinite' : 'none' }}>
            {formatTime(timeLeft)}
          </span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '3px', marginTop: '4px' }}>
            {isBreak ? 'Break' : 'Focus Session'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '36px', animation: 'store-fade-in-up 0.6s ease' }}>
        <button onClick={() => setIsRunning(!isRunning)} style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: isRunning ? 'rgba(255,68,68,0.2)' : 'rgba(0,212,255,0.2)',
          border: `2px solid ${isRunning ? 'rgba(255,68,68,0.5)' : 'rgba(0,212,255,0.5)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isRunning ? '#ff4444' : '#00d4ff', cursor: 'pointer',
          transition: 'all 0.3s', fontSize: '20px',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={resetTimer} style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.3s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Bottom panels */}
      <div style={{ display: 'flex', gap: '20px', maxWidth: '1000px', width: '100%', padding: '0 20px', animation: 'store-fade-in-up 0.7s ease', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Timer Settings */}
        <div style={{ flex: '1 1 240px', minWidth: '240px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px' }}>
            <Timer size={12} style={{ marginRight: '6px' }} />Timer
          </h4>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }}>Work</label>
              <select value={workMin} onChange={e => { setWorkMin(+e.target.value); if (!isRunning) setTimeLeft(+e.target.value * 60); }} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', outline: 'none' }}>
                {[15,20,25,30,45,60,90].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }}>Break</label>
              <select value={breakMin} onChange={e => setBreakMin(+e.target.value)} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', outline: 'none' }}>
                {[3,5,10,15,20].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Ambient Sounds */}
        <div style={{ flex: '1 1 240px', minWidth: '240px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px' }}>
            <Music size={12} style={{ marginRight: '6px' }} />Ambient Sound
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {[
              { id: null, label: 'None', icon: null },
              { id: 'rain', label: 'Rain', icon: <CloudRain size={14} /> },
              { id: 'cafe', label: 'Café', icon: <Coffee size={14} /> },
              { id: 'lofi', label: 'Lo-Fi', icon: <Music size={14} /> },
            ].map(s => (
              <button key={s.label} onClick={() => { stopCustomTrack(); setAmbientSound(s.id); }} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '20px', fontSize: '12px',
                background: ambientSound === s.id ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${ambientSound === s.id ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: ambientSound === s.id ? '#00d4ff' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', transition: '0.2s', fontWeight: ambientSound === s.id ? 'bold' : 'normal',
              }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
          {/* Volume slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Volume2 size={12} color="rgba(255,255,255,0.4)" />
            <input type="range" min="0" max="1" step="0.05" value={ambientVolume} onChange={e => setAmbientVolume(parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#00d4ff', height: '4px' }} />
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', minWidth: '28px' }}>{Math.round(ambientVolume * 100)}%</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ flex: '1 1 200px', minWidth: '200px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px' }}>
            <CheckCircle size={12} style={{ marginRight: '6px' }} />Stats
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Sessions Today</span>
              <span style={{ color: '#00d4ff', fontWeight: 'bold', fontSize: '15px' }}>{sessionsCompleted}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Total Focus</span>
              <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '15px' }}>{Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Sites Blocked</span>
              <span style={{ color: '#ff4757', fontWeight: 'bold', fontSize: '15px' }}>{blockedSites.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* MY MUSIC - Upload & Playlist Section       */}
      {/* ═══════════════════════════════════════════ */}
      <div style={{ maxWidth: '1000px', width: '100%', padding: '0 20px', marginTop: '20px', animation: 'store-fade-in-up 0.8s ease' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Music size={12} /> My Focus Playlist
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {myTracks.length > 0 && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={toggleCustomTrack} style={{
                    background: isTrackPlaying ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,136,0.15)',
                    border: `1px solid ${isTrackPlaying ? 'rgba(255,68,68,0.3)' : 'rgba(0,255,136,0.3)'}`,
                    color: isTrackPlaying ? '#ff4444' : '#00ff88',
                    padding: '6px 12px', borderRadius: '16px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s',
                  }}>
                    {isTrackPlaying ? <Pause size={12} /> : <Play size={12} />}
                    {isTrackPlaying ? 'Pause' : 'Play All'}
                  </button>
                  <button onClick={skipTrack} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)', padding: '6px 10px', borderRadius: '16px', fontSize: '11px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s',
                  }}>
                    <SkipForward size={12} /> Skip
                  </button>
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} style={{
                background: 'linear-gradient(135deg, rgba(191,0,255,0.2), rgba(0,212,255,0.2))',
                border: '1px solid rgba(191,0,255,0.3)',
                color: '#bf00ff', padding: '6px 14px', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s',
              }}>
                <Upload size={12} /> Upload Music
              </button>
              <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Now Playing Bar */}
          {activeTrackIdx >= 0 && myTracks[activeTrackIdx] && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(191,0,255,0.08))',
              border: '1px solid rgba(0,212,255,0.2)', borderRadius: '12px', padding: '12px 16px',
              marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 10px #00d4ff', animation: isTrackPlaying ? 'timer-pulse 1s infinite' : 'none' }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>♪ Now Playing</div>
                <div style={{ color: '#00d4ff', fontSize: '11px', marginTop: '2px' }}>{myTracks[activeTrackIdx].name}</div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                {activeTrackIdx + 1}/{myTracks.length}
              </span>
            </div>
          )}

          {/* Tracks List */}
          {myTracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
              <Music size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>No tracks yet. Upload MP3, WAV, or OGG files to build your focus playlist.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {myTracks.map((track, idx) => (
                <div key={track.id} onClick={() => playCustomTrack(idx)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                  borderRadius: '10px', cursor: 'pointer', transition: '0.2s',
                  background: activeTrackIdx === idx ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${activeTrackIdx === idx ? 'rgba(0,212,255,0.25)' : 'transparent'}`,
                }}
                onMouseEnter={e => { if (activeTrackIdx !== idx) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (activeTrackIdx !== idx) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: activeTrackIdx === idx ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {activeTrackIdx === idx && isTrackPlaying ? (
                      <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '16px' }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: '3px', background: '#00d4ff', borderRadius: '2px', animation: `equalizer ${0.4 + i*0.15}s infinite alternate ease-in-out` }} />)}
                      </div>
                    ) : (
                      <Play size={14} color={activeTrackIdx === idx ? '#00d4ff' : 'rgba(255,255,255,0.4)'} />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ color: activeTrackIdx === idx ? '#00d4ff' : '#fff', fontSize: '13px', fontWeight: activeTrackIdx === idx ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {track.name}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                      {(track.size / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }} style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)',
                    cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: '0.2s', opacity: 0.5,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ff4757'; e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.opacity = '0.5'; }}
                  title="Remove track">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Equalizer animation keyframes */}
      <style>{`
        @keyframes equalizer {
          0% { height: 4px; }
          100% { height: 16px; }
        }
      `}</style>
      </div>
    </div>
  );
}
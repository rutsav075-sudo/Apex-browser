import React, { useState, useEffect, useRef } from 'react';
import { Download, X, Smartphone, Monitor, Sparkles } from 'lucide-react';

/**
 * PWA Install Prompt — Premium install banner with animated UI.
 * Captures the `beforeinstallprompt` event and shows a beautiful
 * branded install button. Auto-dismisses if user installs or dismisses.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const promptRef = useRef(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Don't show in Electron
    if (window.electronAPI) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after a short delay so it doesn't flash on load
      setTimeout(() => setIsVisible(true), 2000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    handleDismiss();
  };

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimatingOut(false);
    }, 350);
  };

  // Don't render if already installed, no prompt, or dismissed
  if (isInstalled || !isVisible || !deferredPrompt) return null;

  return (
    <div
      ref={promptRef}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 99999,
        width: '360px',
        borderRadius: '20px',
        overflow: 'hidden',
        animation: isAnimatingOut
          ? 'pwaSlideOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards'
          : 'pwaSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 212, 255, 0.1)',
      }}
    >
      {/* Glassmorphism card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 20, 35, 0.95), rgba(10, 15, 30, 0.98))',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        borderRadius: '20px',
        padding: '24px',
        position: 'relative',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          top: '-30%',
          right: '-20%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(191, 0, 255, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 2,
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'; }}
        >
          <X size={14} />
        </button>

        {/* Header with icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(191, 0, 255, 0.15))',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pwaIconFloat 3s ease-in-out infinite',
          }}>
            <Download size={22} color="#00d4ff" />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #00d4ff, #bf00ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.3px',
            }}>
              Install Apex Browser
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
              Get the full app experience
            </p>
          </div>
        </div>

        {/* Features list */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
          {[
            { icon: <Monitor size={12} />, text: 'Desktop App' },
            { icon: <Smartphone size={12} />, text: 'Works Offline' },
            { icon: <Sparkles size={12} />, text: 'Native Feel' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontWeight: 500,
            }}>
              <span style={{ color: '#00d4ff', display: 'flex' }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00d4ff, #0088cc)',
            color: '#000',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: '0 8px 24px rgba(0, 212, 255, 0.25)',
            position: 'relative',
            zIndex: 1,
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 212, 255, 0.35)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 212, 255, 0.25)'; }}
        >
          <Download size={16} />
          Install App
        </button>
      </div>

      <style>{`
        @keyframes pwaSlideIn {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pwaSlideOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(30px) scale(0.95); }
        }
        @keyframes pwaIconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

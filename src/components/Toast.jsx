import React, { useEffect, useRef } from 'react';
import useBrowserStore from '../store/useBrowserStore';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ICON_MAP = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const COLOR_MAP = {
  success: { bg: 'rgba(0, 255, 136, 0.12)', border: 'rgba(0, 255, 136, 0.35)', icon: '#00ff88', text: '#b8ffdd', glow: 'rgba(0, 255, 136, 0.15)' },
  error: { bg: 'rgba(255, 68, 68, 0.12)', border: 'rgba(255, 68, 68, 0.35)', icon: '#ff4444', text: '#ffbaba', glow: 'rgba(255, 68, 68, 0.15)' },
  warning: { bg: 'rgba(255, 193, 7, 0.12)', border: 'rgba(255, 193, 7, 0.35)', icon: '#ffc107', text: '#fff3cd', glow: 'rgba(255, 193, 7, 0.15)' },
  info: { bg: 'rgba(0, 212, 255, 0.12)', border: 'rgba(0, 212, 255, 0.35)', icon: '#00d4ff', text: '#b8f0ff', glow: 'rgba(0, 212, 255, 0.15)' },
};

export default function Toast() {
  const toast = useBrowserStore(state => state.toast);
  const dismissToast = useBrowserStore(state => state.dismissToast);
  const timerRef = useRef(null);

  useEffect(() => {
    if (toast?.visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        dismissToast();
      }, toast.duration || 3500);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast, dismissToast]);

  if (!toast?.visible) return null;

  const type = toast.type || 'info';
  const colors = COLOR_MAP[type] || COLOR_MAP.info;
  const duration = toast.duration || 3500;

  return (
    <div
      id="apex-toast"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 'var(--z-toast)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '14px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${colors.glow}`,
        animation: 'toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: '480px',
        minWidth: '260px',
        overflow: 'hidden',
      }}
    >
      {/* Progress bar at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '2px',
        background: `linear-gradient(90deg, ${colors.icon}, transparent)`,
        animation: `toastProgress ${duration}ms linear forwards`,
        borderRadius: '0 0 14px 14px',
      }} />

      <div style={{
        color: colors.icon,
        flexShrink: 0,
        display: 'flex',
        animation: type === 'success' ? 'toastIconPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both' : 'none',
      }}>
        {ICON_MAP[type]}
      </div>
      <span style={{
        color: colors.text,
        fontSize: '13.5px',
        fontWeight: 500,
        lineHeight: '1.4',
        flex: 1,
        wordBreak: 'break-word',
      }}>
        {toast.message}
      </span>
      <button
        onClick={dismissToast}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          flexShrink: 0,
          transition: 'color 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.color = '#fff'}
        onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastIconPop {
          from { opacity: 0; transform: scale(0) rotate(-45deg); }
          50% { transform: scale(1.3) rotate(5deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

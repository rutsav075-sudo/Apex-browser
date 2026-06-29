import React from 'react';
import useBrowserStore from '../store/useBrowserStore';
import { ShieldAlert, X } from 'lucide-react';

/**
 * S2 UPGRADE: Custom confirmation modal for AI EXECUTE_JS actions.
 * Replaces native confirm() with a non-blocking, styled modal.
 */
export default function ConfirmModal() {
  const confirmModal = useBrowserStore(state => state.confirmModal);
  const dismissConfirmModal = useBrowserStore(state => state.dismissConfirmModal);

  if (!confirmModal) return null;

  const handleConfirm = () => {
    confirmModal.onConfirm?.();
    dismissConfirmModal();
  };

  const handleCancel = () => {
    confirmModal.onCancel?.();
    dismissConfirmModal();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={handleCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(20, 20, 28, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          padding: '28px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255,255,255,0.06)',
          animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            background: 'rgba(255, 193, 7, 0.15)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            border: '1px solid rgba(255, 193, 7, 0.3)',
          }}>
            <ShieldAlert size={22} color="#ffc107" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 700 }}>
              {confirmModal.title || 'Confirm Action'}
            </h3>
          </div>
          <button
            onClick={handleCancel}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Message */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          maxHeight: '240px',
          overflowY: 'auto',
        }}>
          <pre style={{
            margin: 0,
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '12.5px',
            lineHeight: '1.5',
            fontFamily: '"Fira Code", "Cascadia Code", monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {confirmModal.message}
          </pre>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
          >
            Deny
          </button>
          <button
            onClick={handleConfirm}
            style={{
              background: 'linear-gradient(135deg, #ffc107, #ff9800)',
              border: 'none',
              color: '#000',
              padding: '10px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: '0 4px 16px rgba(255, 193, 7, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Allow Execution
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

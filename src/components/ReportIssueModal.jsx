import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Bug, Sparkles, Zap, Palette, HelpCircle, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { sendBugReport, isEmailConfigured } from '../services/EmailService';
import useBrowserStore from '../store/useBrowserStore';

const CATEGORIES = [
  { id: 'bug', label: 'Bug Report', icon: <Bug size={16} />, color: '#ff4757' },
  { id: 'feature', label: 'Feature Request', icon: <Sparkles size={16} />, color: '#bf00ff' },
  { id: 'performance', label: 'Performance', icon: <Zap size={16} />, color: '#ffa502' },
  { id: 'ui', label: 'UI / UX', icon: <Palette size={16} />, color: '#00d4ff' },
  { id: 'other', label: 'Other', icon: <HelpCircle size={16} />, color: '#2ed573' },
];

export default function ReportIssueModal({ isOpen, onClose }) {
  const showToast = useBrowserStore(state => state.showToast);
  const [category, setCategory] = useState('bug');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!description.trim()) {
      showToast('Please describe the issue before submitting.', 'warning');
      return;
    }
    if (description.trim().length < 10) {
      showToast('Please provide more detail (at least 10 characters).', 'warning');
      return;
    }

    setStatus('sending');
    const selectedCat = CATEGORIES.find(c => c.id === category);
    const result = await sendBugReport({
      category: selectedCat?.label || category,
      description: description.trim(),
      userEmail: email.trim(),
    });

    if (result.success) {
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setDescription('');
        setEmail('');
        setCategory('bug');
        showToast('Thank you! Your feedback helps us improve Apex.', 'success');
      }, 2000);
    } else {
      setStatus('error');
      showToast("EmailJS failed. Opening default mail client...", 'warning');
      
      // Fallback: Open mailto link automatically
      const subject = encodeURIComponent(`Apex Browser ${selectedCat?.label || category}`);
      const body = encodeURIComponent(`Description:\n${description.trim()}\n\nUser Email: ${email.trim() || 'Not provided'}`);
      window.open(`mailto:apex.org.91@gmail.com?subject=${subject}&body=${body}`, '_blank');
      
      setTimeout(() => {
          setStatus('idle');
          onClose();
      }, 3000);
    }
  };

  const activeCategoryColor = CATEGORIES.find(c => c.id === category)?.color || '#bf00ff';

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(20, 20, 28, 0.85)',
          border: `1px solid ${activeCategoryColor}50`,
          borderRadius: '32px', padding: '0', maxWidth: '600px', width: '92%', maxHeight: '90vh',
          boxShadow: `0 32px 100px rgba(0, 0, 0, 0.8), inset 0 2px 2px rgba(255,255,255,0.05), 0 0 60px ${activeCategoryColor}20`,
          animation: 'toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Glowing Header */}
        <div style={{
          background: `linear-gradient(135deg, ${activeCategoryColor}15, transparent)`,
          padding: '32px 36px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          position: 'relative'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${activeCategoryColor}, transparent)` }}></div>
          
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '24px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: `${activeCategoryColor}30`, padding: '10px', borderRadius: '16px', display: 'flex' }}>
                <Bug size={24} color={activeCategoryColor} />
              </div>
              Submit Feedback
            </h3>
            <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Help us build the perfect browser. What's on your mind?
            </p>
          </div>
          
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '50%', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: '0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,71,87,0.1)'; e.currentTarget.style.color = '#ff4757'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body content */}
        <div className="custom-scrollbar" style={{ padding: '0 36px 36px 36px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
          
          {/* Category Selection */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
              What type of feedback?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '16px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 700,
                    background: category === cat.id ? `${cat.color}15` : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${category === cat.id ? `${cat.color}60` : 'rgba(255,255,255,0.05)'}`,
                    color: category === cat.id ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: category === cat.id ? `0 8px 24px ${cat.color}15` : 'none'
                  }}
                  onMouseOver={e => { if (category !== cat.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseOut={e => { if (category !== cat.id) e.currentTarget.style.background = 'rgba(0,0,0,0.3)' }}
                >
                  <div style={{ color: cat.color }}>{cat.icon}</div>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder="Explain the issue or your idea in detail..."
              rows={4}
              style={{
                width: '100%', padding: '20px', borderRadius: '20px', resize: 'vertical',
                background: 'rgba(0, 0, 0, 0.4)', color: '#fff', fontSize: '15px', lineHeight: 1.6,
                border: '1px solid rgba(255, 255, 255, 0.08)', outline: 'none',
                fontFamily: 'inherit', transition: 'border-color 0.25s', boxSizing: 'border-box',
                minHeight: '140px', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.3)'
              }}
              onFocus={e => e.target.style.borderColor = activeCategoryColor}
              onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px', fontWeight: 600 }}>
              {description.length} / 2000
            </div>
          </div>

          {/* Bottom Row: Email + Submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                placeholder="Email address (optional)"
                style={{
                  width: '100%', padding: '16px 20px', borderRadius: '16px',
                  background: 'rgba(0, 0, 0, 0.4)', color: '#fff', fontSize: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)', outline: 'none',
                  fontFamily: 'inherit', transition: 'border-color 0.25s', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = activeCategoryColor}
                onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
              />
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={status === 'sending' || status === 'success'}
              style={{
                background: status === 'success' ? '#00ff88' : status === 'error' ? '#ff4757' : activeCategoryColor,
                color: status === 'success' || status === 'error' ? '#000' : '#fff',
                border: 'none', padding: '16px 36px', borderRadius: '16px',
                fontWeight: 800, fontSize: '15px', cursor: status === 'sending' ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: `0 12px 32px ${status === 'success' ? 'rgba(0,255,136,0.3)' : status === 'error' ? 'rgba(255,71,87,0.3)' : activeCategoryColor + '40'}`,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', minWidth: '160px',
              }}
              onMouseOver={e => { if (status === 'idle') e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {status === 'sending' && <><Loader2 size={18} className="spin-icon" /> Working...</>}
              {status === 'success' && <><CheckCircle size={18} /> Done</>}
              {status === 'error' && <><AlertTriangle size={18} /> Failed</>}
              {status === 'idle' && <><Send size={18} /> Send</>}
            </button>
          </div>

          {!isEmailConfigured() && (
            <div style={{ fontSize: '12px', color: 'rgba(255,165,2,0.8)', background: 'rgba(255,165,2,0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,165,2,0.1)', textAlign: 'center' }}>
              ⚠ Email configuration is missing. Your report will be opened in your mail client instead.
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}

import React, { useState, useEffect } from 'react';
import { X, Lock, Plus, Trash2, Eye, EyeOff, Save, KeyRound } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';

export default function PasswordsModal() {
  const isPasswordsOpen = useBrowserStore(state => state.isPasswordsOpen);
  const setIsPasswordsOpen = useBrowserStore(state => state.setIsPasswordsOpen);
  const savedPasswords = useBrowserStore(state => state.savedPasswords);
  const savePasswords = useBrowserStore(state => state.savePasswords);
  const [passwordsList, setPasswordsList] = useState([]);
  const [showPwd, setShowPwd] = useState({});

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ id: Date.now(), domain: '', username: '', password: '' });

  useEffect(() => {
    setPasswordsList([...(savedPasswords || [])]);
  }, [savedPasswords, isPasswordsOpen]);

  if (!isPasswordsOpen) return null;

  const handleSave = () => {
    let updated;
    if (passwordsList.find(p => p.id === editForm.id)) {
      updated = passwordsList.map(p => p.id === editForm.id ? editForm : p);
    } else {
      updated = [...passwordsList, editForm];
    }
    setPasswordsList(updated);
    savePasswords(updated);
    setIsEditing(false);
  };

  const handleDelete = (id) => {
    const updated = passwordsList.filter(p => p.id !== id);
    setPasswordsList(updated);
    savePasswords(updated);
  };

  return (
    <div className="modal-overlay" onClick={() => setIsPasswordsOpen(false)} style={{ zIndex: 999999 }}>
      <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="settings-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <KeyRound color="#00ffcc" /> Password Manager
          </h2>
          <button onClick={() => setIsPasswordsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X /></button>
        </div>

        <div className="settings-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>These credentials are encrypted using OS-level secure storage.</span>
            <button 
               onClick={() => { setEditForm({ id: Date.now(), domain: '', username: '', password: '' }); setIsEditing(true); }}
               style={{ background: 'rgba(0, 255, 204, 0.1)', color: '#00ffcc', border: '1px solid currentColor', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
               <Plus size={14} /> Add Password
            </button>
          </div>

          {isEditing && (
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
               <h4>{passwordsList.find(p => p.id === editForm.id) ? 'Edit' : 'New'} Credential</h4>
               <input autoFocus placeholder="Domain (e.g. github.com)" value={editForm.domain} onChange={e => setEditForm({...editForm, domain: e.target.value.toLowerCase()})} style={{ padding: 10, background: 'rgba(255,255,255,0.05)', color:'#fff', border:'none', borderRadius: 6 }} />
               <input placeholder="Username / Email" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} style={{ padding: 10, background: 'rgba(255,255,255,0.05)', color:'#fff', border:'none', borderRadius: 6 }} />
               <input type="password" placeholder="Password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} style={{ padding: 10, background: 'rgba(255,255,255,0.05)', color:'#fff', border:'none', borderRadius: 6 }} />
               <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                 <button onClick={handleSave} style={{ flex: 1, padding: 8, background: '#00ffcc', color: '#000', border: 'none', borderRadius: 6, fontWeight:'bold', cursor:'pointer' }}>Save</button>
                 <button onClick={() => setIsEditing(false)} style={{ padding: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 6, cursor:'pointer' }}>Cancel</button>
               </div>
            </div>
          )}

          {passwordsList.length === 0 && !isEditing && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.5)' }}>
              <Lock size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p>No passwords securely saved yet.</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {passwordsList.map(pwd => (
              <div key={pwd.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, gap: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                 <img src={`https://www.google.com/s2/favicons?domain=${pwd.domain}&sz=32`} width="24" height="24" style={{ borderRadius: 4 }} alt="" />
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                     <span style={{ fontWeight: 600, fontSize: 14 }}>{pwd.domain}</span>
                     <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{pwd.username}</span>
                 </div>
                 <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 6 }}>
                     <span style={{ flex: 1, fontFamily: showPwd[pwd.id] ? 'monospace' : 'unset', letterSpacing: showPwd[pwd.id] ? 'unset' : 4, fontSize: 13 }}>
                        {showPwd[pwd.id] ? pwd.password : '••••••••'}
                     </span>
                     <button onClick={() => setShowPwd(prev => ({...prev, [pwd.id]: !prev[pwd.id]}))} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>
                        {showPwd[pwd.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                     </button>
                 </div>
                 <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditForm(pwd); setIsEditing(true); }} style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer' }}><Plus size={16} style={{transform:'rotate(45deg)'}} /></button>
                    <button onClick={() => handleDelete(pwd.id)} style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer' }}><Trash2 size={16} /></button>
                 </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

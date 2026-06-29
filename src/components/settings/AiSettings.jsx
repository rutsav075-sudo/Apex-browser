import React, { useState } from 'react';
import useBrowserStore from '../../store/useBrowserStore';
import { Loader2, Sparkles, Cpu, Key, Globe, Zap, CheckCircle, AlertTriangle, Gift, Trash2 } from 'lucide-react';

// Helper: open URL in Apex browser tab (not external browser)
const openInApexTab = (url) => {
    const store = useBrowserStore.getState();
    store.createTab(url, url, false);
    // Close the settings modal so user sees the new tab
    store.setIsSettingsOpen(false);
};

// Advanced fetch helper to bypass CORS for local Ollama setup
const fetchOllama = async (endpoint, method = 'GET', body = null) => {
    const ep = useBrowserStore.getState().ollamaEndpoint || 'http://localhost:11434';
    
    // Electron IPC bypass
    if (window.electronAPI && window.electronAPI.ollamaRequest) {
        const res = await window.electronAPI.ollamaRequest({ endpoint: endpoint, method, body });
        if (!res.success) throw new Error(res.error);
        if (res.status >= 400) throw new Error('HTTP ' + res.status);
        return res.data; // already JSON parsed
    }
    
    // Web mode proxy fallback
    const baseUrl = ep === 'http://localhost:11434' ? '/api/ollama' : ep;
    const res = await fetch(baseUrl + endpoint, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
};

const detectProviderFromKey = (key) => {
    if (!key || key.length < 5) return null;
    if (key.startsWith('sk-or-')) return 'openrouter';
    if (key.startsWith('gsk_')) return 'groq';
    if (key.startsWith('AIza')) return 'gemini';
    if (key.startsWith('sk-ant-')) return 'anthropic';
    if (key.startsWith('sk-')) return 'openai';
    return null;
};

const PROVIDERS = [
    { id: 'openrouter', label: 'OpenRouter', icon: <Gift size={16} />, color: '#00ff88', desc: '100+ Free Models 🎁' },
    { id: 'gemini', label: 'Gemini', icon: <Sparkles size={16} />, color: '#00d4ff', desc: 'Google (Recommended)' },
    { id: 'groq', label: 'Groq', icon: <Zap size={16} />, color: '#ff7f50', desc: 'Llama 3 Ultra-Fast' },
    { id: 'openai', label: 'OpenAI', icon: <Globe size={16} />, color: '#2ed573', desc: 'GPT-4 / GPT-3.5' },
    { id: 'anthropic', label: 'Anthropic', icon: <Sparkles size={16} />, color: '#bf00ff', desc: 'Claude 3.5' },
    { id: 'ollama', label: 'Ollama', icon: <Cpu size={16} />, color: '#ff4757', desc: 'Local AI (Private)' },
    { id: 'custom', label: 'Custom', icon: <Key size={16} />, color: '#a0a0b0', desc: 'Advanced Endpoint' },
];

export default function AiSettings() {
    const { aiProvider, setAiProvider, aiCustomEndpoint, setAiCustomEndpoint, aiApiKey, setAiApiKey, openrouterModel, setOpenrouterModel } = useBrowserStore();
    const showToast = useBrowserStore(state => state.showToast);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const handleKeyChange = (e) => {
        const key = e.target.value;
        setAiApiKey(key);
        setTestResult(null);

        const detected = detectProviderFromKey(key);
        if (detected && detected !== aiProvider) {
            setAiProvider(detected);
            const label = PROVIDERS.find(p => p.id === detected)?.label;
            showToast(`Auto-detected ${label} key! Provider switched.`, 'success');
        }
    };

    const testApiKey = async () => {
        if (!aiApiKey) { showToast('Please enter an API key first.', 'warning'); return; }
        setIsTesting(true);
        setTestResult(null);

        try {
            if (aiProvider === 'gemini') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${aiApiKey}`);
                if (res.ok) { setTestResult('success'); showToast('✅ Gemini API key is valid!', 'success'); }
                else { setTestResult('error'); const d = await res.json().catch(() => ({})); showToast(`❌ Gemini key error: ${d.error?.message || res.status}`, 'error'); }
            } else if (aiProvider === 'groq') {
                const res = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': `Bearer ${aiApiKey}` }
                });
                if (res.ok) { setTestResult('success'); showToast('✅ Groq API key is valid!', 'success'); }
                else { setTestResult('error'); showToast(`❌ Groq key error: HTTP ${res.status}`, 'error'); }
            } else if (aiProvider === 'openai') {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${aiApiKey}` }
                });
                if (res.ok) { setTestResult('success'); showToast('✅ OpenAI API key is valid!', 'success'); }
                else { setTestResult('error'); showToast(`❌ OpenAI key error: HTTP ${res.status}`, 'error'); }
            } else if (aiProvider === 'anthropic') {
                if (aiApiKey.startsWith('sk-ant-')) { setTestResult('success'); showToast('✅ Anthropic key format looks valid!', 'success'); }
                else { setTestResult('error'); showToast('❌ Anthropic keys should start with sk-ant-', 'error'); }
            } else if (aiProvider === 'openrouter') {
                const res = await fetch('https://openrouter.ai/api/v1/models', {
                    headers: { 'Authorization': `Bearer ${aiApiKey}` }
                });
                if (res.ok) { setTestResult('success'); showToast('✅ OpenRouter key is valid! 100+ models unlocked 🎁', 'success'); }
                else { setTestResult('error'); showToast(`❌ OpenRouter key error: HTTP ${res.status}`, 'error'); }
            } else {
                showToast('Test not available for this provider.', 'warning');
            }
        } catch (err) {
            setTestResult('error');
            showToast(`❌ Connection failed: ${err.message}`, 'error');
        } finally {
            setIsTesting(false);
        }
    };

    const activeProviderDetails = PROVIDERS.find(p => p.id === aiProvider);

    return (
        <div className="settings-section" style={{ padding: '0 0 20px 0' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, background: 'linear-gradient(90deg, #00d4ff, #bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Apex AI Engine
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: '13px' }}>
                    Select and configure the neural engine powering your Copilot.
                </p>
            </div>

            {/* Provider Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
                {PROVIDERS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setAiProvider(p.id)}
                        style={{
                            background: aiProvider === p.id ? `${p.color}15` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${aiProvider === p.id ? `${p.color}50` : 'rgba(255,255,255,0.05)'}`,
                            padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                            cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: aiProvider === p.id ? `0 8px 24px ${p.color}15, inset 0 2px 4px ${p.color}20` : 'none',
                            position: 'relative', overflow: 'hidden'
                        }}
                        onMouseOver={(e) => { if (aiProvider !== p.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                        onMouseOut={(e) => { if (aiProvider !== p.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    >
                        {aiProvider === p.id && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40%', height: '2px', background: p.color, boxShadow: `0 0 10px ${p.color}` }} />}
                        <div style={{ color: aiProvider === p.id ? p.color : 'rgba(255,255,255,0.6)' }}>{p.icon}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: aiProvider === p.id ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '14px' }}>{p.label}</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '2px', textAlign: 'center' }}>{p.desc}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Ollama Section */}
            {aiProvider === 'ollama' && (
                <div style={{ 
                    padding: '24px', borderRadius: '24px', 
                    background: 'linear-gradient(145deg, rgba(255,71,87,0.05), rgba(0,0,0,0.4))', 
                    border: '1px solid rgba(255,71,87,0.15)',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '120%', height: '100%', background: 'radial-gradient(ellipse at top, rgba(255,71,87,0.1), transparent 70%)', pointerEvents: 'none' }}></div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', position: 'relative' }}>
                        <div style={{ background: '#ff475720', border: '1px solid #ff475740', padding: '12px', borderRadius: '16px' }}>
                            <Cpu size={28} color="#ff4757" />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '800' }}>Local AI Setup</h4>
                            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>100% Private. Runs completely on your hardware.</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <span style={{ background: '#ff4757', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#000', fontSize: '12px' }}>1</span>
                                        <label style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>Download Ollama</label>
                                    </div>
                                    <p style={{ margin: '0 0 0 34px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Install the background app first.</p>
                                </div>
                                <button className="action-btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer' }} onClick={() => openInApexTab('https://ollama.com/download')}>Download App</button>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,71,87,0.2)', boxShadow: 'inset 0 0 20px rgba(255,71,87,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <span style={{ background: 'linear-gradient(135deg, #ff4757, #ff7f50)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff', fontSize: '12px', boxShadow: '0 0 10px rgba(255,71,87,0.4)' }}>2</span>
                                <label style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>1-Click Connect</label>
                            </div>
                            <p style={{ margin: '0 0 16px 34px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.5 }}>Automatically link the browser to your Local AI and download the powerful <b>Llama 3</b> neural network.</p>
                            
                            <div style={{ marginLeft: '34px' }}>
                                <button disabled={isTesting} style={{ 
                                    background: 'linear-gradient(135deg, #ff4757, #ff7f50)', color: '#fff', 
                                    padding: '14px 24px', borderRadius: '14px', fontWeight: '800', fontSize: '14px', 
                                    cursor: isTesting ? 'wait' : 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '10px',
                                    boxShadow: '0 8px 24px rgba(255,71,87,0.3)', transition: 'transform 0.2s'
                                }}
                                onMouseOver={e => { if(!isTesting) e.currentTarget.style.transform = 'translateY(-2px)' }}
                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                onClick={async () => {
                                    setIsTesting(true);
                                    try {
                                        const mdl = useBrowserStore.getState().ollamaModel || 'llama3';
                                        
                                        // 1. Verify connection
                                        try { await fetchOllama('/api/tags'); } 
                                        catch(err) { throw new Error('Cannot reach Ollama. Is the app running in your system tray?'); }
                                        showToast('Ollama detected! Downloading model...', 'info');
                                        
                                        // 2. Pull model (Wait for completion)
                                        await fetchOllama('/api/pull', 'POST', { name: mdl });
                                        showToast('Model ready! Testing...', 'success');
                                        
                                        // 3. Test generation
                                        const data = await fetchOllama('/api/generate', 'POST', { model: mdl, prompt: 'hello', stream: false });
                                        if(!data.response) throw new Error('Model failed to respond.');
                                        
                                        useBrowserStore.getState().setAiProvider('ollama');
                                        showToast('✨ Local AI Setup Complete!', 'success', 5000);
                                    } catch(err) {
                                        showToast(err.message, 'error', 6000);
                                    } finally {
                                        setIsTesting(false);
                                    }
                                }}>
                                    {isTesting ? <><Loader2 size={18} className="spin-icon" /> Initializing Neural Net...</> : <><Zap size={18} /> Download & Connect</>}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', marginLeft: '4px' }}>Endpoint</label>
                                <input type="text" defaultValue={useBrowserStore.getState().ollamaEndpoint || 'http://localhost:11434'} onBlur={(e) => useBrowserStore.getState().setOllamaEndpoint(e.target.value)} style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', outline: 'none', fontSize: '13px', fontFamily: 'monospace' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', marginLeft: '4px' }}>Model</label>
                                <input type="text" defaultValue={useBrowserStore.getState().ollamaModel || 'llama3'} onBlur={(e) => useBrowserStore.getState().setOllamaModel(e.target.value)} placeholder="e.g. llama3, mistral" style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', outline: 'none', fontSize: '13px', fontFamily: 'monospace' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* OpenRouter Model Selector */}
            {aiProvider === 'openrouter' && (
                <div style={{ background: 'linear-gradient(145deg, rgba(0,255,136,0.05), rgba(0,0,0,0.4))', padding: '20px', borderRadius: '20px', border: '1px solid rgba(0,255,136,0.2)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <Gift size={18} color="#00ff88" />
                        <div>
                            <label style={{ color: '#fff', fontWeight: 700, fontSize: '15px', display: 'block' }}>Select Free Model</label>
                            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '12px' }}>Models marked :free cost $0. No credit card needed.</p>
                        </div>
                    </div>
                    <select
                        value={openrouterModel}
                        onChange={e => setOpenrouterModel(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '12px', outline: 'none', fontSize: '13px', fontFamily: 'monospace', cursor: 'pointer' }}
                    >
                        <optgroup label="🆓 Free Models">
                            <option value="meta-llama/llama-3.2-3b-instruct:free">Llama 3.2 3B (Fast, Free)</option>
                            <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Free)</option>
                            <option value="google/gemma-2-9b-it:free">Google Gemma 2 9B (Free)</option>
                            <option value="deepseek/deepseek-r1:free">DeepSeek R1 — Reasoning (Free)</option>
                            <option value="deepseek/deepseek-chat-v3-0324:free">DeepSeek V3 Chat (Free)</option>
                            <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
                            <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B (Free)</option>
                            <option value="microsoft/phi-3-mini-128k-instruct:free">Microsoft Phi-3 Mini (Free)</option>
                            <option value="openchat/openchat-7b:free">OpenChat 7B (Free)</option>
                        </optgroup>
                        <optgroup label="⚡ Premium Models (Paid)">
                            <option value="openai/gpt-4o">GPT-4o</option>
                            <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                            <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                            <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</option>
                        </optgroup>
                    </select>
                </div>
            )}

            {/* Custom Endpoint Section */}
            {aiProvider === 'custom' && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '8px' }}>Custom Base URL</label>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 12px 0', fontSize: '12px' }}>For OpenAI-compatible reverse proxies or enterprise endpoints.</p>
                    <input 
                      type="text" 
                      placeholder="https://your-domain.com/v1" 
                      value={aiCustomEndpoint}
                      onChange={(e) => setAiCustomEndpoint(e.target.value)}
                      style={{ padding: '14px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', width: '100%', outline: 'none', fontSize: '14px', fontFamily: 'monospace' }}
                    />
                </div>
            )}

            {/* API Key Section (For cloud providers) */}
            {aiProvider !== 'ollama' && (
                <div style={{ 
                    background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '24px', 
                    border: `1px solid ${activeProviderDetails?.color}30`,
                    boxShadow: `inset 0 0 30px ${activeProviderDetails?.color}05`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div>
                            <label style={{ fontSize: '16px', fontWeight: 800, color: '#fff', display: 'block', marginBottom: '4px' }}>API Key Auth</label>
                            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0', fontSize: '13px' }}>Your key is securely encrypted via the OS keychain.</p>
                        </div>
                        {aiApiKey && detectProviderFromKey(aiApiKey) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: `${activeProviderDetails?.color}15`, border: `1px solid ${activeProviderDetails?.color}30`, borderRadius: '10px', fontSize: '11px', color: activeProviderDetails?.color, fontWeight: '700' }}>
                                ✨ Valid Format
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <input 
                          type="password" 
                          placeholder={`Paste your ${activeProviderDetails?.label} API Key here...`} 
                          value={aiApiKey}
                          onChange={handleKeyChange}
                          onKeyDown={e => e.stopPropagation()}
                          style={{ 
                              width: '100%', padding: '16px 20px', borderRadius: '14px', background: 'rgba(0,0,0,0.4)', color: '#fff', 
                              border: `1px solid ${testResult === 'success' ? '#00ff8850' : testResult === 'error' ? '#ff444450' : 'rgba(255,255,255,0.1)'}`, 
                              outline: 'none', transition: 'all 0.3s', fontSize: '14px', fontFamily: 'monospace', letterSpacing: '2px',
                              boxSizing: 'border-box'
                          }}
                          onFocus={e => e.target.style.borderColor = activeProviderDetails?.color}
                          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={testApiKey} 
                            disabled={isTesting || !aiApiKey}
                            style={{ 
                              background: testResult === 'success' ? '#00ff8820' : testResult === 'error' ? '#ff444420' : `${activeProviderDetails?.color}20`, 
                              color: testResult === 'success' ? '#00ff88' : testResult === 'error' ? '#ff4444' : activeProviderDetails?.color, 
                              border: `1px solid ${testResult === 'success' ? '#00ff8850' : testResult === 'error' ? '#ff444450' : `${activeProviderDetails?.color}50`}`, 
                              padding: '10px 24px', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: isTesting ? 'wait' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s'
                            }}
                          >
                            {isTesting ? <><Loader2 size={16} className="spin-icon" /> Testing...</> : testResult === 'success' ? <><CheckCircle size={16} /> Valid</> : testResult === 'error' ? <><AlertTriangle size={16} /> Failed</> : <><Key size={16} /> Validate</>}
                          </button>
                          {aiApiKey && (
                            <button 
                              onClick={() => { setAiApiKey(''); setTestResult(null); showToast('API key cleared.', 'info'); }}
                              title="Clear API Key"
                              style={{ 
                                background: 'rgba(255,68,68,0.1)', color: '#ff4444', 
                                border: '1px solid rgba(255,68,68,0.3)', 
                                padding: '10px 16px', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.3s'
                              }}
                              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,68,68,0.2)'}
                              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,68,68,0.1)'}
                            >
                              <Trash2 size={14} /> Clear
                            </button>
                          )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                        <button className="action-btn" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,255,136,0.05))', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)', fontSize: '12px', padding: '8px 14px', borderRadius: '10px' }} onClick={() => openInApexTab('https://openrouter.ai/keys')}>🎁 Get Free OpenRouter Key</button>
                        <button className="action-btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '12px', padding: '8px 14px', borderRadius: '10px' }} onClick={() => openInApexTab('https://aistudio.google.com/app/apikey')}>Get Gemini Key</button>
                        <button className="action-btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '12px', padding: '8px 14px', borderRadius: '10px' }} onClick={() => openInApexTab('https://console.groq.com/keys')}>Get Groq Key</button>
                        <button className="action-btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '12px', padding: '8px 14px', borderRadius: '10px' }} onClick={() => openInApexTab('https://platform.openai.com/api-keys')}>Get OpenAI Key</button>
                        <button className="action-btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '12px', padding: '8px 14px', borderRadius: '10px' }} onClick={() => openInApexTab('https://console.anthropic.com/settings/keys')}>Get Claude Key</button>
                    </div>
                </div>
            )}
        </div>
    );
}

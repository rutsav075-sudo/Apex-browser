import React, { useState } from 'react';
import { X, Grid, LayoutTemplate, Music, CheckCircle, Plus, Upload, Link as LinkIcon, Download } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';
import '../styles/SettingsModal.css';

const MOCK_COMMUNITY_WIDGETS = [
    { id: 'calculator', name: 'Neon Calculator', author: '@MathWhiz', downloads: '1.2M' },
    { id: 'crypto', name: 'Crypto Ticker Pro', author: '@Satoshi', downloads: '840K' }
];

export default function WidgetStore() {
    const isWidgetStoreOpen = useBrowserStore(state => state.isWidgetStoreOpen);
    const setIsWidgetStoreOpen = useBrowserStore(state => state.setIsWidgetStoreOpen);
    const activeWidgets = useBrowserStore(state => state.activeWidgets);
    const setActiveWidgets = useBrowserStore(state => state.setActiveWidgets);
    const isDashboardBlur = useBrowserStore(state => state.isDashboardBlur);
    const setIsDashboardBlur = useBrowserStore(state => state.setIsDashboardBlur);
    const showToast = useBrowserStore(state => state.showToast);
    
    const [activeTab, setActiveTab] = useState('browse');

    if (!isWidgetStoreOpen) return null;

    const isInstalled = (id) => activeWidgets.includes(id);

    const toggleWidget = (id) => {
        if (isInstalled(id)) {
            setActiveWidgets(activeWidgets.filter(w => w !== id));
        } else {
            setActiveWidgets([...activeWidgets, id]);
        }
    };



    const renderWidgetCard = (widget, isCommunity = false) => {
        const installed = isInstalled(widget.id);
        return (
            <div 
                key={widget.id} 
                style={{ 
                    background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', 
                    padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1)',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'default',
                    position: 'relative', overflow: 'hidden'
                }}
                onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.1)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
            >
                {/* Ambient glow inside card */}
                {installed && <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'radial-gradient(circle, rgba(0,210,255,0.2) 0%, transparent 70%)', pointerEvents: 'none' }}></div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(0, 210, 255, 0.2)', padding: '12px', borderRadius: '12px' }}>
                        <Grid size={24} color="#00d2ff" />
                    </div>
                    {isCommunity && <span style={{ fontSize: '12px', background: 'rgba(191,0,255,0.2)', color: '#bf00ff', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Community</span>}
                </div>
                
                <div>
                    <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '20px', fontWeight: 700, letterSpacing: '0.5px' }}>{widget.name}</h3>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.4 }}>
                        {isCommunity ? `Created by ${widget.author} • ${widget.downloads} Downloads` : 'Official Apex Browser Built-in Module'}
                    </p>
                </div>

                <div style={{ flex: 1, minHeight: '20px' }} />

                <button 
                    onClick={() => toggleWidget(widget.id)}
                    style={{ 
                        width: '100%', padding: '14px', borderRadius: '12px', border: 'none', 
                        background: installed ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
                        color: installed ? '#fff' : '#000', fontWeight: 'bold', fontSize: '15px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: installed ? 'none' : '0 8px 16px rgba(0,210,255,0.3)'
                    }}
                    onMouseOver={e => { if (!installed) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,210,255,0.5)'; } else { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; } }}
                    onMouseOut={e => { if (!installed) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,210,255,0.3)'; } else { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; } }}
                >
                    {installed ? <><CheckCircle size={16} /> Added to Dashboard</> : <><Plus size={16} /> Add to Dashboard</>}
                </button>
            </div>
        );
    };

    return (
        <div 
            className="store-overlay" 
            style={{ 
                zIndex: 1000000, position: 'fixed', inset: 0, 
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(40px)', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', 
                animation: 'store-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
            }}
        >
            {/* Massive Close Button */}
            <button 
                onClick={() => setIsWidgetStoreOpen(false)}
                style={{ position: 'absolute', top: 32, right: 32, width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 50, transition: '0.3s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
            >
                <X size={24} />
            </button>

            {/* Glowing Brand Accent */}
            <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse at top, rgba(0,212,255,0.2) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

            {/* Floating Tab Navigation Pill */}
            <div 
                style={{ 
                    marginTop: '60px', display: 'flex', gap: '8px', padding: '8px', 
                    background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(30px)', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)',
                    zIndex: 10, animation: 'store-nav-slide 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {[
                    { id: 'browse', icon: <LayoutTemplate size={18} />, label: 'Official Widgets' },
                    { id: 'community', icon: <Download size={18} />, label: 'Community' },
                    { id: 'upload', icon: <Upload size={18} />, label: 'Developer Hub' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', 
                            borderRadius: '100px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
                            background: activeTab === tab.id ? 'linear-gradient(135deg, #00d2ff, #3a7bd5)' : 'transparent',
                            color: activeTab === tab.id ? '#000' : 'rgba(255,255,255,0.6)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: activeTab === tab.id ? '0 8px 20px rgba(0,210,255,0.3)' : 'none'
                        }}
                        onMouseOver={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={e => { if (activeTab !== tab.id) e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                        <div style={{ transition: 'transform 0.3s', transform: activeTab === tab.id ? 'scale(1.1)' : 'scale(1)' }}>{tab.icon}</div>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Container with Liquid Glass Sub-backdrop */}
            <div style={{ 
                flex: 1, width: '100%', maxWidth: '1200px', padding: '40px 20px', 
                overflowY: 'auto', display: 'flex', flexDirection: 'column',
                animation: 'store-fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                
                {/* Global Settings Ribbon */}
                {activeTab === 'browse' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '10px 20px', borderRadius: '100px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}>
                            <span style={{ opacity: 0.7 }}>Dashboard Glass Blur</span>
                            <div className="toggle-switch" style={{ margin: 0 }}>
                                <input type="checkbox" checked={isDashboardBlur} onChange={(e) => setIsDashboardBlur(e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </div>
                        </label>
                    </div>
                )}

                {activeTab === 'browse' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {renderWidgetCard({ id: 'news', name: 'Global News Feed' })}
                        {renderWidgetCard({ id: 'weather', name: 'Live Weather 3D' })}
                        {renderWidgetCard({ id: 'calendar', name: 'Work Week Calendar' })}
                        {renderWidgetCard({ id: 'notes', name: 'Quick Note Scratchpad' })}
                        {renderWidgetCard({ id: 'stocks', name: 'Live Market Tickers' })}
                        {renderWidgetCard({ id: 'clock', name: 'Minimalist Digital Clock' })}
                    </div>
                )}

                {activeTab === 'community' && (
                    <div>
                        <div style={{ background: 'linear-gradient(90deg, rgba(191,0,255,0.1), transparent)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(191,0,255,0.2)', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <Download size={48} color="#bf00ff" />
                            <div>
                                <h3 style={{ margin: 0, fontSize: '24px', color: '#fff' }}>Community Highlights</h3>
                                <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>Discover extreme widgets compiled by top developers in the Apex ecosystem.</p>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                            {MOCK_COMMUNITY_WIDGETS.map(w => renderWidgetCard(w, true))}
                        </div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'store-fade-in 0.4s ease' }}>
                        <div style={{ width: '120px', height: '120px', background: 'rgba(191,0,255,0.1)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(191,0,255,0.3)', marginBottom: '32px', boxShadow: '0 20px 40px rgba(191,0,255,0.2)', transform: 'rotate(-5deg)' }}>
                            <Upload size={48} color="#bf00ff" />
                        </div>
                        <h2 style={{ margin: '0 0 16px 0', fontSize: '32px', color: '#fff', fontWeight: 800, background: 'linear-gradient(90deg, #bf00ff, #00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Developer Hub</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '480px', textAlign: 'center', marginBottom: '40px', fontSize: '16px', lineHeight: 1.6 }}>
                            Submit your compiled React `.zip` widget artifact to the global Apex Store. Once verified, it will instantly deploy to thousands of users.
                        </p>
                        
                        <label style={{ 
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))', 
                            color: '#fff', padding: '16px 48px', borderRadius: '100px', fontWeight: 'bold', fontSize: '16px',
                            cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
                            display: 'flex', alignItems: 'center', gap: '12px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2)'
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 30px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))'; }}
                        >
                            Select .ZIP Artifact
                            <input type="file" accept=".zip" style={{ display: 'none' }} onChange={() => showToast('Widget package submitted for secure sandbox compilation!', 'success')} />
                        </label>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes store-fade-in { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(40px); } }
                @keyframes store-fade-in-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes store-nav-slide { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Sparkles, Upload, Users, Heart, Search, Star, Crown, Check, Loader2, Trash2 } from 'lucide-react';
import useBrowserStore from '../store/useBrowserStore';
import { isFirebaseReady, uploadCommunityWallpaper, uploadCommunityFile, subscribeToCommunityWallpapers, incrementDownloads, toggleLike } from '../services/FirebaseService';
import '../styles/StoreAnimations.css';

const staticWallpapers = [
    { id: '1', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80&auto=format&fit=crop', name: 'Nebula Space', tag: '4K', cat: 'Space' },
    { id: '2', url: 'https://images.unsplash.com/photo-1514790193030-c89d266d5a9d?w=1920&q=80&auto=format&fit=crop', name: 'Cyber City', tag: '4K', cat: 'City' },
    { id: '3', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&q=80&auto=format&fit=crop', name: 'Abstract Fluid', tag: 'HD', cat: 'Abstract' },
    { id: '4', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&q=80&auto=format&fit=crop', name: 'Abstract Swirl', tag: 'HD', cat: 'Abstract' },
    { id: '5', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1920&q=80&auto=format&fit=crop', name: 'Purple Gradient', tag: '4K', cat: 'Gradient' },
    { id: '6', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80&auto=format&fit=crop', name: 'Soft Rainbow', tag: 'HD', cat: 'Gradient' },
    { id: '7', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80&auto=format&fit=crop', name: 'Earth From Space', tag: '4K', cat: 'Space' },
    { id: '8', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80&auto=format&fit=crop', name: 'Galaxy Deep', tag: '4K', cat: 'Space' },
    { id: '9', url: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1920&q=80&auto=format&fit=crop', name: 'Mountain Sunset', tag: '4K', cat: 'Nature' },
    { id: '10', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80&auto=format&fit=crop', name: 'Vibrant Gradient', tag: 'HD', cat: 'Gradient' },
    { id: '11', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80&auto=format&fit=crop', name: 'Starry Night Sky', tag: '4K', cat: 'Space' },
    { id: '12', url: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=1920&q=80&auto=format&fit=crop', name: 'Neon Lights', tag: 'HD', cat: 'Abstract' },
];

const liveWallpapers = [
    // True 3D Interactive Wallpapers (rendered locally via Three.js — no external URLs needed!)
    { id: 'sp1', type: 'spline', url: 'glass-orbs', preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80&auto=format&fit=crop', name: 'Glass Orbs', cat: '3D Interactive' },
    { id: 'sp2', type: 'spline', url: 'neon-grid', preview: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800&q=80&auto=format&fit=crop', name: 'Neon Grid', cat: '3D Interactive' },
    { id: 'sp3', type: 'spline', url: 'particle-galaxy', preview: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80&auto=format&fit=crop', name: 'Particle Galaxy', cat: '3D Interactive' },
    { id: 'sp4', type: 'spline', url: 'morph-icosa', preview: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80&auto=format&fit=crop', name: 'Morphing Crystal', cat: '3D Interactive' },
    { id: 'sp5', type: 'spline', url: 'cosmic-waves', preview: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80&auto=format&fit=crop', name: 'Cosmic Waves', cat: '3D Interactive' },
    { id: 'sp5', type: 'spline', url: 'cosmic-waves', preview: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80&auto=format&fit=crop', name: 'Cosmic Waves', cat: '3D Interactive' },
];

const mockCommunity = [
    { id: 'c1', type: 'static', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1920&q=80&auto=format&fit=crop', name: 'Purple Gradient', author: '@NeonDemon', likes: 2453, downloads: 12400 },
    { id: 'c2', type: 'static', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80&auto=format&fit=crop', name: 'Soft Fluid', author: '@ApexFan', likes: 1832, downloads: 8900 },
    { id: 'c4', type: 'static', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80&auto=format&fit=crop', name: 'Deep Galaxy', author: '@SpaceX_Fan', likes: 5200, downloads: 21000 },
];

export default function WallpaperStore() {
    const isWallpaperStoreOpen = useBrowserStore(state => state.isWallpaperStoreOpen);
    const setIsWallpaperStoreOpen = useBrowserStore(state => state.setIsWallpaperStoreOpen);
    const setBgImage = useBrowserStore(state => state.setBgImage);
    const bgImage = useBrowserStore(state => state.bgImage);
    const [activeTab, setActiveTab] = useState('static');
    const [promptText, setPromptText] = useState("Hyper realistic 8k liquid glass abstract futuristic cityscape");
    const [aiImageUrl, setAiImageUrl] = useState('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const [uploadSuccessData, setUploadSuccessData] = useState(null);
    const [communityPosts, setCommunityPosts] = useState([]);
    const [localLiveWallpapers, setLocalLiveWallpapers] = useState(liveWallpapers);
    const [localStaticWallpapers, setLocalStaticWallpapers] = useState(staticWallpapers);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCat, setActiveCat] = useState('All');
    const [brokenImages, setBrokenImages] = useState(new Set());
    const showToast = useBrowserStore(state => state.showToast);

    // Subscribe to Firebase real-time updates for community wallpapers
    useEffect(() => {
        if (!isWallpaperStoreOpen) return;
        
        // If Firebase is completely offline/unconfigured, load mocks initially
        if (!isFirebaseReady()) {
            setCommunityPosts(mockCommunity);
            return;
        }

        const unsubscribe = subscribeToCommunityWallpapers((wallpapers) => {
            // Always sync with the real database, even if it's empty!
            setCommunityPosts(wallpapers);
        });
        return () => unsubscribe();
    }, [isWallpaperStoreOpen]);

    // Load previously saved custom wallpapers on store open
    useEffect(() => {
        if (!isWallpaperStoreOpen) return;
        if (!window.electronAPI?.getSavedWallpapers) return;
        window.electronAPI.getSavedWallpapers().then((saved) => {
            if (saved && saved.length > 0) {
                const customStatic = saved.filter(w => w.type === 'static').map(w => ({ ...w, url: w.fileUrl }));
                const customLive = saved.filter(w => w.type === 'video').map(w => ({ ...w, url: w.fileUrl }));
                if (customStatic.length > 0) {
                    setLocalStaticWallpapers(prev => {
                        // Avoid duplicates by checking IDs
                        const existingIds = new Set(prev.map(w => w.id));
                        const newOnes = customStatic.filter(w => !existingIds.has(w.id));
                        return [...newOnes, ...prev];
                    });
                }
                if (customLive.length > 0) {
                    setLocalLiveWallpapers(prev => {
                        const existingIds = new Set(prev.map(w => w.id));
                        const newOnes = customLive.filter(w => !existingIds.has(w.id));
                        return [...newOnes, ...prev];
                    });
                }
            }
        });
    }, [isWallpaperStoreOpen]);

    if (!isWallpaperStoreOpen) return null;

    const applyWallpaper = async (url, type = 'static', wallpaperId = null) => {
        let finalUrl = url;
        if (type === 'video') finalUrl = `video::${url}`;
        if (type === 'spline') finalUrl = `spline::${url}`;
        setBgImage(finalUrl);
        
        // If it's a community wallpaper, increment download count
        if (wallpaperId) {
            await incrementDownloads(wallpaperId);
        }
    };

    const handleLike = async (e, wallpaperId) => {
        e.stopPropagation();
        await toggleLike(wallpaperId);
        // Optimistic UI update for immediate feedback
        setCommunityPosts(prev => prev.map(wp => wp.id === wallpaperId ? { ...wp, likes: wp.likes + 1 } : wp));
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const isVideo = file.type.startsWith('video/');
        const type = isVideo ? 'video' : 'static';
        const fileSizeKB = (file.size / 1024).toFixed(1);
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const sizeLabel = file.size > 1024 * 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
        
        // Electron: Save to persistent storage so wallpaper survives app restarts
        if (window.electronAPI?.saveWallpaper) {
            try {
                // Read file as base64 to send via IPC
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = reader.result.split(',')[1]; // Strip data:xxx;base64, prefix
                    const result = await window.electronAPI.saveWallpaper({
                        name: file.name,
                        data: base64,
                        mimeType: file.type,
                    });
                    if (result.success) {
                        const persistentUrl = result.fileUrl;
                        
                        // Dev Mode Fix: local 'file://' URLs are blocked in http://localhost.
                        // Create a temporary blob URL for the current session's UI preview.
                        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                        const displayUrl = isDev ? URL.createObjectURL(file) : persistentUrl;

                        applyWallpaper(persistentUrl, type);
                        
                        // Force the temporary blob URL into the UI state so it bypasses dev restrictions
                        if (isDev) {
                            useBrowserStore.setState({ bgImage: type === 'video' ? `video::${displayUrl}` : displayUrl });
                        }

                        if (isVideo) {
                            setLocalLiveWallpapers(prev => [{ id: `custom_${result.fileName}`, type: 'video', url: displayUrl, name: file.name, cat: 'Custom' }, ...prev]);
                        } else {
                            setLocalStaticWallpapers(prev => [{ id: `custom_${result.fileName}`, type: 'static', url: displayUrl, name: file.name, tag: 'Custom', cat: 'Custom' }, ...prev]);
                        }
                        setUploadSuccessData({ url: displayUrl, type, name: file.name, size: sizeLabel });
                    } else {
                        showToast('Failed to save wallpaper: ' + result.error, 'error');
                    }
                };
                reader.readAsDataURL(file);
            } catch (err) {
                showToast('Failed to save wallpaper', 'error');
            }
        } else {
            // Web fallback: use blob URL (won't persist, but works for browser preview)
            const fileUrl = URL.createObjectURL(file);
            applyWallpaper(fileUrl, type);
            if (isVideo) {
                setLocalLiveWallpapers(prev => [{ id: `custom_${Date.now()}`, type: 'video', url: fileUrl, name: file.name, cat: 'Custom' }, ...prev]);
            } else {
                setLocalStaticWallpapers(prev => [{ id: `custom_${Date.now()}`, type: 'static', url: fileUrl, name: file.name, tag: 'Custom', cat: 'Custom' }, ...prev]);
            }
            setUploadSuccessData({ url: fileUrl, type, name: file.name, size: sizeLabel });
        }
    };

    const handleDeleteWallpaper = async (wpId, e) => {
        e.stopPropagation();
        setLocalStaticWallpapers(prev => prev.filter(w => w.id !== wpId));
        setLocalLiveWallpapers(prev => prev.filter(w => w.id !== wpId));
        
        const DEFAULT_STATIC = 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80&auto=format&fit=crop';
        
        if (window.electronAPI?.deleteWallpaper) {
            const fileName = wpId.replace('custom_', '');
            await window.electronAPI.deleteWallpaper(fileName);
            
            // Revert background if the active one was deleted
            if (bgImage && bgImage.includes(fileName)) {
                applyWallpaper(DEFAULT_STATIC, 'static');
            }
        } else {
            // Fallback for dev mode blob testing
            if (bgImage && bgImage.includes('blob:')) {
                applyWallpaper(DEFAULT_STATIC, 'static');
            }
        }
        showToast('Wallpaper deleted from library', 'success');
    };

    const handleCommunityUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsUploading(true);
        const type = file.type.startsWith('video/') ? 'video' : 'static';
        const randomId = Math.floor(Math.random() * 100);
        // We use a mock URL for the community preview to avoid massive base64 strings in DB
        const mockUrl = type === 'video' ? liveWallpapers[0].url : `https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1080&q=80&auto=format&fit=crop&sig=${randomId}`;

        if (!isFirebaseReady()) {
            // Simulate a successful upload for local testing
            setTimeout(() => {
                setCommunityPosts(prev => [{
                    id: `mock_${Date.now()}`,
                    type: type,
                    url: mockUrl,
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    author: '@You (Local Mock)',
                    likes: 0,
                    downloads: 0
                }, ...prev]);
                setIsUploading(false);
                showToast('Mock upload successful! Setup Firebase to share with the world.', 'success');
            }, 1500);
            return;
        }

        try {
            const uploadPromise = uploadCommunityFile({
                file,
                name: file.name.replace(/\.[^/.]+$/, ""), // Strip extension
                type: type,
                author: '@ApexUser',
                category: activeCat !== 'All' ? activeCat : 'General'
            });

            // Firebase queues offline writes indefinitely. Force a timeout to prevent hanging UI.
            await Promise.race([
                uploadPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout connecting to community server')), 8000))
            ]);

            showToast('Wallpaper shared with community!', 'success');
        } catch (error) {
            console.error('Upload failed:', error);
            showToast(error.message || 'Failed to share wallpaper', 'error');
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };


    const generateAiImage = () => {
        if (!promptText.trim()) return;
        setIsLoadingAi(true);
        setAiImageUrl('');
        const encoded = encodeURIComponent(promptText);
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=1920&height=1080&seed=${Math.floor(Math.random()*10000)}`;
        setAiImageUrl(url);
    };

    const isCurrent = (url, type) => {
        let checkUrl = url;
        if (type === 'video') checkUrl = `video::${url}`;
        if (type === 'spline') checkUrl = `spline::${url}`;
        return bgImage === checkUrl;
    };

    const filterItems = (items) => items.filter(w => 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (activeCat === 'All' || w.cat === activeCat)
    );

    const getCats = (items) => ['All', ...new Set(items.map(w => w.cat).filter(Boolean))];

    const handleImageError = (wpId) => {
        setBrokenImages(prev => new Set([...prev, wpId]));
    };

    const renderCard = (wp, index) => (
        <div key={`${wp.id}-${index}`}
            onClick={() => applyWallpaper(wp.url, wp.type || 'static')}
            style={{
                borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', position: 'relative',
                border: isCurrent(wp.url, wp.type || 'static') ? '2px solid #00d4ff' : '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', height: '200px',
                boxShadow: isCurrent(wp.url, wp.type || 'static') ? '0 0 30px rgba(0,212,255,0.3)' : '0 8px 24px rgba(0,0,0,0.3)',
                animation: `store-card-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.06}s both`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04) translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; e.currentTarget.style.boxShadow = isCurrent(wp.url, wp.type || 'static') ? '0 0 30px rgba(0,212,255,0.3)' : '0 8px 24px rgba(0,0,0,0.3)'; }}
        >
            {brokenImages.has(wp.id) ? (
                /* Fallback gradient for broken images */
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', flexDirection: 'column', gap: '8px' }}>
                    <ImageIcon size={28} />
                    <span>Image unavailable</span>
                </div>
            ) : wp.type === 'youtube' ? (
                <img src={`https://img.youtube.com/vi/${wp.url}/hqdefault.jpg`} alt={wp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" onError={() => handleImageError(wp.id)} />
            ) : wp.type === 'video' ? (
                <video src={wp.url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#050510' }} onError={() => handleImageError(wp.id)} />
            ) : wp.type === 'spline' ? (
                <img src={wp.preview || wp.url} alt={wp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" onError={() => handleImageError(wp.id)} />
            ) : (
                <img src={wp.url} alt={wp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" onError={() => handleImageError(wp.id)} />
            )}

            {/* Delete Option for Custom Wallpapers */}
            {wp.id.toString().startsWith('custom_') && (
                <button 
                    onClick={(e) => handleDeleteWallpaper(wp.id, e)}
                    style={{ position: 'absolute', top: '10px', right: isCurrent(wp.url, wp.type || 'static') ? '44px' : '10px', background: 'rgba(255,50,50,0.85)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)', color: '#fff', transition: '0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                    onMouseOver={e=>e.currentTarget.style.transform='scale(1.15)'}
                    onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}
                    title="Delete wallpaper"
                >
                    <Trash2 size={13} strokeWidth={2.5} />
                </button>
            )}

            {/* Badge */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                {wp.tag && (
                    <span style={{ background: wp.tag === '4K' ? 'linear-gradient(135deg, #ffa502, #ff6348)' : 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', color: '#fff', letterSpacing: '0.5px' }}>{wp.tag}</span>
                )}
                {(wp.type === 'youtube' || wp.type === 'video') && (
                    <span style={{ background: 'rgba(191,0,255,0.7)', backdropFilter: 'blur(10px)', padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}><Video size={10} /> VIDEO</span>
                )}
                {wp.type === 'spline' && (
                    <span style={{ background: 'linear-gradient(135deg, #00d4ff, #0055ff)', backdropFilter: 'blur(10px)', padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>✨ TRUE 3D</span>
                )}
            </div>

            {/* Currently applied */}
            {isCurrent(wp.url, wp.type || 'static') && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#00d4ff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#000" strokeWidth={3} />
                </div>
            )}

            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 14px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700', display: 'block' }}>{wp.name}</span>
                {wp.author && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ color: '#00d4ff', fontSize: '11px' }}>{wp.author}</span>
                        <span style={{ color: '#ff4444', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}><Heart size={10} fill="#ff4444" /> {wp.likes?.toLocaleString()}</span>
                    </div>
                )}
            </div>
        </div>
    );

    const tabData = [
        { id: 'static', icon: <ImageIcon size={16} />, label: 'Static HD' },
        { id: 'live', icon: <Video size={16} />, label: '3D Live' },
        { id: 'community', icon: <Users size={16} />, label: 'Community' },
        { id: 'upload', icon: <Upload size={16} />, label: 'Upload' },
    ];

    const currentItems = activeTab === 'static' ? localStaticWallpapers : activeTab === 'live' ? localLiveWallpapers : [];
    const cats = getCats(currentItems);

    return (
        <div style={{
            zIndex: 1000000, position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(40px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            animation: 'store-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
            {/* Close button */}
            <button onClick={() => setIsWallpaperStoreOpen(false)} style={{ position: 'absolute', top: 28, right: 28, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 50, transition: '0.3s' }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                <X size={22} />
            </button>

            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '450px', background: 'radial-gradient(ellipse at top, rgba(191,0,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Hero Heading */}
            <div style={{ marginTop: '32px', textAlign: 'center', animation: 'store-nav-slide 0.5s ease', marginBottom: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '900', background: 'linear-gradient(135deg, #00d4ff, #bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                    Wallpaper Engine
                </h1>
                <p style={{ margin: '6px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px', letterSpacing: '2px' }}>Curated visuals for your browser canvas</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '4px', padding: '5px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', boxShadow: '0 12px 30px rgba(0,0,0,0.4)', zIndex: 10 }}>
                {tabData.map(tab => (
                    <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setActiveCat('All'); }} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px',
                        borderRadius: '100px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px',
                        background: activeTab === tab.id ? 'linear-gradient(135deg, #00d2ff, #bf00ff)' : 'transparent',
                        color: activeTab === tab.id ? '#000' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: activeTab === tab.id ? '0 6px 16px rgba(191,0,255,0.25)' : 'none',
                    }}
                    onMouseOver={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={e => { if (activeTab !== tab.id) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Search & Category Filter — for static/live tabs */}
            {(activeTab === 'static' || activeTab === 'live') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', maxWidth: '1200px', width: '100%', padding: '0 20px', animation: 'store-fade-in-up 0.4s ease' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '350px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search wallpapers..." onKeyDown={e => e.stopPropagation()} style={{ width: '100%', padding: '10px 14px 10px 38px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: '13px', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {cats.map(c => (
                            <button key={c} onClick={() => setActiveCat(c)} style={{
                                padding: '8px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: '600',
                                background: activeCat === c ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                                color: activeCat === c ? '#00d4ff' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer', transition: '0.2s',
                            }}>{c}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, width: '100%', maxWidth: '1200px', padding: '24px 20px', overflowY: 'auto', animation: 'store-fade-in-up 0.5s ease' }}>

                {activeTab === 'static' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                        {filterItems(localStaticWallpapers).map((wp, i) => renderCard(wp, i))}
                    </div>
                )}

                {activeTab === 'live' && (
                    <>
                        {/* Featured banner */}
                        <div style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(191,0,255,0.08))', padding: '24px 28px', borderRadius: '20px', border: '1px solid rgba(0,212,255,0.15)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ padding: '14px', background: 'rgba(0,212,255,0.12)', borderRadius: '16px' }}><Video size={32} color="#00d4ff" /></div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', color: '#fff', fontWeight: '800' }}>3D Interactive & Video Wallpapers</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Real-time 3D environments (Spline) and looping high-fidelity videos.</p>
                            </div>
                            <div style={{ marginLeft: 'auto', padding: '6px 14px', background: 'rgba(191,0,255,0.2)', borderRadius: '8px', fontSize: '12px', color: '#bf00ff', fontWeight: '700' }}>{localLiveWallpapers.length} Available</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                            {filterItems(localLiveWallpapers).map((wp, i) => renderCard(wp, i))}
                        </div>
                    </>
                )}

                {activeTab === 'community' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center', animation: 'store-fade-in-up 0.5s ease' }}>
                        <div style={{ width: '100px', height: '100px', background: 'rgba(255,165,2,0.1)', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,165,2,0.25)', marginBottom: '28px', animation: 'store-float 3s infinite ease-in-out' }}>
                            <Users size={40} color="#ffa502" />
                        </div>
                        <h2 style={{ margin: '0 0 12px 0', fontSize: '28px', color: '#fff', fontWeight: '800', background: 'linear-gradient(90deg, #ffa502, #ff4757)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Server Upgrade in Progress</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '480px', marginBottom: '24px', fontSize: '15px', lineHeight: 1.6 }}>
                            The Community Gallery is currently offline for a massive infrastructure upgrade! We are migrating to dedicated servers to support lightning-fast 4K video sharing for the entire community.
                        </p>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Loader2 size={18} color="#00d4ff" className="spin-icon" />
                            <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>Coming back online in the next major update. Sorry for the wait!</span>
                        </div>
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '40px', backdropFilter: 'blur(20px)' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '28px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '800' }}>
                            <div style={{ padding: '10px', background: 'rgba(191,0,255,0.15)', borderRadius: '14px' }}><Sparkles size={24} color="#bf00ff" /></div>
                            AI Studio
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '28px', fontSize: '14px' }}>Generate breathtaking wallpapers with Apex Diffusion Engine.</p>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                            <input type="text" value={promptText} onChange={(e) => setPromptText(e.target.value)} placeholder="Describe your dream wallpaper..." onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') generateAiImage(); }} style={{ flex: 1, padding: '16px 18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '14px', outline: 'none' }} />
                            <button onClick={generateAiImage} style={{ background: 'linear-gradient(45deg, #bf00ff, #00d4ff)', color: '#fff', border: 'none', padding: '0 32px', borderRadius: '14px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(191,0,255,0.25)', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
                                Generate
                            </button>
                        </div>

                        <div style={{ width: '100%', height: '360px', background: 'rgba(0,0,0,0.4)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {isLoadingAi && (
                                <div style={{ color: '#00d4ff', fontSize: '14px', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <Sparkles size={28} style={{ animation: 'spin 2s linear infinite' }} />
                                    Synthesizing...
                                </div>
                            )}
                            {aiImageUrl && (
                                <>
                                    <img src={aiImageUrl} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, opacity: isLoadingAi ? 0 : 1, transition: 'opacity 0.6s' }} onLoad={() => setIsLoadingAi(false)} onError={() => { setIsLoadingAi(false); setAiImageUrl(''); showToast('Generation failed, network error.', 'error'); }} />
                                    {!isLoadingAi && (
                                        <button onClick={() => applyWallpaper(aiImageUrl, 'static')} style={{ position: 'absolute', bottom: '24px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 28px', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
                                            <Check size={16} /> Apply Wallpaper
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}



                {activeTab === 'upload' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                        <div style={{ width: '100px', height: '100px', background: 'rgba(0,212,255,0.1)', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,212,255,0.25)', marginBottom: '28px', animation: 'store-float 3s infinite ease-in-out' }}>
                            <Upload size={40} color="#00d4ff" />
                        </div>
                        <h2 style={{ margin: '0 0 12px 0', fontSize: '28px', color: '#fff', fontWeight: '800', background: 'linear-gradient(90deg, #00d4ff, #bf00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Upload Custom</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '400px', textAlign: 'center', marginBottom: '32px', fontSize: '14px', lineHeight: 1.6 }}>
                            Bring your own wallpaper. Supports .JPG/.PNG and 60fps .MP4 videos.
                        </p>
                        <label style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))', color: '#fff', padding: '14px 40px', borderRadius: '50px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.3s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            Select Media File
                            <input type="file" accept="image/*,video/mp4" style={{ display: 'none' }} onChange={handleUpload} />
                        </label>
                    </div>
                )}
            </div>

            {/* Premium Upload Success Popup */}
            {uploadSuccessData && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', animation: 'store-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <div style={{ width: '400px', background: 'linear-gradient(135deg, rgba(20,20,30,0.95), rgba(10,10,15,0.95))', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '24px', padding: '32px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,212,255,0.15), inset 0 0 40px rgba(0,212,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #00d4ff, #bf00ff)' }} />
                        
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '2px solid rgba(0,212,255,0.3)', animation: 'toastIconPop 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            <Check size={40} color="#00d4ff" />
                        </div>
                        
                        <h2 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '24px', fontWeight: '800' }}>Wallpaper Applied</h2>
                        <p style={{ margin: '0 0 24px 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.5' }}>
                            Your custom wallpaper <strong style={{ color: '#fff' }}>{uploadSuccessData.name}</strong> ({uploadSuccessData.size}) is now active.
                        </p>
                        
                        <div style={{ width: '100%', height: '160px', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                            {uploadSuccessData.type === 'video' ? (
                                <video src={uploadSuccessData.url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <img src={uploadSuccessData.url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                        </div>

                        <button onClick={() => setUploadSuccessData(null)} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #00d4ff, #bf00ff)', color: '#fff', fontWeight: '800', fontSize: '15px', cursor: 'pointer', transition: '0.2s', boxShadow: '0 8px 24px rgba(0,212,255,0.3)' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
                            Awesome!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

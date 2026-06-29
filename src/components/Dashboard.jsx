import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, CloudRain, Sun, TrendingUp, Edit3, Settings, EyeOff, Eye, ArrowUp, ArrowDown, Play, SkipBack, SkipForward, Music, Clock, ShoppingBag, X } from 'lucide-react';
import { motion } from 'framer-motion';
import useBrowserStore from '../store/useBrowserStore';
import '../styles/Dashboard.css';

// S7 FIX: Safe math expression evaluator (no eval/Function)
function safeMathEval(expr) {
  // Only allow digits, operators, dots, parens, and whitespace
  if (/[^0-9+\-*/.() ]/.test(expr)) throw new Error('Invalid characters');
  if (expr.length > 100) throw new Error('Expression too long');
  // Tokenize and evaluate using precedence
  const tokens = expr.match(/(\d+\.?\d*|[+\-*/()])/g);
  if (!tokens) throw new Error('Empty expression');
  let pos = 0;
  function parseExpr() {
    let result = parseTerm();
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++];
      const right = parseTerm();
      result = op === '+' ? result + right : result - right;
    }
    return result;
  }
  function parseTerm() {
    let result = parseFactor();
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos++];
      const right = parseFactor();
      if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        result = result / right;
      } else {
        result = result * right;
      }
    }
    return result;
  }
  function parseFactor() {
    if (tokens[pos] === '(') {
      pos++;
      const result = parseExpr();
      pos++; // skip ')'
      return result;
    }
    if (tokens[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    return parseFloat(tokens[pos++]);
  }
  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Unexpected tokens');
  return result;
}
// --- FREEFORM WIDGET LOGIC ---
const DraggableWidget = ({ widgetKey, children }) => {
  const activeWidgets = useBrowserStore(state => state.activeWidgets);
  const setActiveWidgets = useBrowserStore(state => state.setActiveWidgets);
  const dashboardLayout = useBrowserStore(state => state.dashboardLayout);
  const updateDashboardLayout = useBrowserStore(state => state.updateDashboardLayout);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef(null);
  const layout = dashboardLayout[widgetKey] || { x: 50, y: 50, w: 300, h: 200, v: true };
  
  if (!activeWidgets.includes(widgetKey)) return null;
  
  const handleResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = ref.current.offsetWidth;
    const startH = ref.current.offsetHeight;

    const onMove = (moveEvent) => {
      const newW = Math.max(200, startW + (moveEvent.clientX - startX));
      const newH = Math.max(160, startH + (moveEvent.clientY - startY));
      ref.current.style.width = newW + 'px';
      ref.current.style.height = newH + 'px';
    };

    const onUp = (upEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const newW = Math.max(200, startW + (upEvent.clientX - startX));
      const newH = Math.max(160, startH + (upEvent.clientY - startY));
      const currentLayout = useBrowserStore.getState().dashboardLayout;
      const currW = currentLayout[widgetKey] || layout;
      updateDashboardLayout({
          ...currentLayout,
          [widgetKey]: { ...currW, w: newW, h: newH }
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setActiveWidgets(activeWidgets.filter(w => w !== widgetKey));
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      initial={{ x: layout.x, y: layout.y }}
      onDragEnd={(e, info) => {
        if (info.offset.x === 0 && info.offset.y === 0) return;
        const currentLayout = useBrowserStore.getState().dashboardLayout;
        const currW = currentLayout[widgetKey] || layout;
        updateDashboardLayout({
          ...currentLayout,
          [widgetKey]: { ...currW, x: currW.x + info.offset.x, y: currW.y + info.offset.y }
        });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'absolute', left: 0, top: 0, zIndex: isHovered ? 50 : 10, willChange: 'transform' }}
    >
      <div className="widget-resize-wrapper" ref={ref} style={{ width: Math.max(layout.w, 200), height: Math.max(layout.h, 160), minWidth: '200px', minHeight: '160px', overflow: 'hidden', padding: '0px', borderRadius: '24px', boxSizing: 'border-box', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}></div>
        {children}
      </div>
      
      {isHovered && (
        <React.Fragment>
          <button 
            onClick={handleRemove}
            title="Remove Widget"
            style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <X size={16} />
          </button>
          
          {/* Custom Pure JS Resize Handle */}
          <div 
            title="Drag to resize"
            onPointerDown={(e) => {
               e.stopPropagation();
               if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                  e.nativeEvent.stopImmediatePropagation();
               }
               handleResizeStart(e);
            }}
            style={{ position: 'absolute', bottom: '0px', right: '0px', width: '36px', height: '36px', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '10px', background: 'radial-gradient(ellipse at bottom right, rgba(0, 212, 255, 0.7), transparent 70%)', borderBottomRightRadius: '24px', cursor: 'nwse-resize', pointerEvents: 'auto', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
          >
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <path d="M10 0L0 10H10V0Z" fill="rgba(255, 255, 255, 1)"/>
              <path d="M10 5L5 10H10V5Z" fill="rgba(0, 212, 255, 1)"/>
            </svg>
          </div>
        </React.Fragment>
      )}
    </motion.div>
  );
};

// --- CALCULATOR WIDGET (fully functional #1 fix) ---
function CalculatorWidget() {
  const [display, setDisplay] = useState('0');
  const [formula, setFormula] = useState('');
  const [hasResult, setHasResult] = useState(false);

  const handleCalcBtn = useCallback((btn) => {
    if (btn === 'C') {
      setDisplay('0'); setFormula(''); setHasResult(false);
      return;
    }
    if (btn === '±') {
      setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
      return;
    }
    if (btn === '%') {
      setDisplay(prev => (parseFloat(prev) / 100).toString());
      return;
    }
    if (btn === '=') {
      try {
        const expr = (formula + display).replace(/×/g, '*').replace(/÷/g, '/');
        // S7 FIX: Safe math evaluation without Function constructor
        const result = safeMathEval(expr);
        setDisplay(Number.isFinite(result) ? parseFloat(result.toPrecision(12)).toString() : 'Error');
        setFormula('');
        setHasResult(true);
      } catch { setDisplay('Error'); setFormula(''); setHasResult(false); }
      return;
    }
    if (['+', '-', '*', '/'].includes(btn)) {
      setFormula(prev => prev + display + btn);
      setDisplay('0');
      setHasResult(false);
      return;
    }
    if (btn === '.') {
      if (display.includes('.')) return;
      setDisplay(prev => prev + '.');
      return;
    }
    // Digit
    if (hasResult) {
      setDisplay(btn); setHasResult(false);
    } else {
      setDisplay(prev => prev === '0' ? btn : prev + btn);
    }
  }, [display, formula, hasResult]);

  return (
    <div className="dash-widget widget-module" style={{ width: '100%', height: '100%', margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '16px', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(30px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 20, color: '#fff', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
        {formula && <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{formula}</div>}
        <div style={{ fontSize: display.length > 10 ? 28 : 'clamp(36px, 10vw, 48px)', fontWeight: 300, wordBreak: 'break-all' }}>{display}</div>
      </div>
      <div onPointerDownCapture={(e) => e.stopPropagation()} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, flex: 4 }}>
         {['C','±','%','/','7','8','9','*','4','5','6','-','1','2','3','+','0','.','='].map(btn => (
            <div key={btn}
               onClick={() => handleCalcBtn(btn)}
               style={{ 
                  background: ['/','*','-','+','='].includes(btn) ? 'linear-gradient(135deg, #bf00ff, #00d4ff)' : ['C','±','%'].includes(btn) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', 
                  borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 500, cursor: 'pointer', transition: 'all 0.1s', gridColumn: btn === '0' ? 'span 2' : 'span 1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)', userSelect: 'none'
               }}
               onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
               onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
               onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >{btn}</div>
         ))}
      </div>
    </div>
  );
}

// --- CLOCK WIDGET (Performance fix #3) ---
function ClockWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  return (
    <div className="dash-widget clock-widget widget-module" style={{ width: '100%', height: '100%', margin: 0, minWidth: 0, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(30px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
        <div style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: '900', color: '#fff', textShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(0,212,255,0.3)', letterSpacing: '4px', fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
            {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
        <div style={{ fontSize: 'clamp(14px, 2vw, 22px)', color: '#00d4ff', fontWeight: 600, marginTop: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {currentTime.toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}
        </div>
    </div>
  );
}

export default function Dashboard() {
  const weatherData = useBrowserStore(state => state.weatherData);
  const setWeatherData = useBrowserStore(state => state.setWeatherData);
  const stockData = useBrowserStore(state => state.stockData);
  const setStockData = useBrowserStore(state => state.setStockData);
  const newsData = useBrowserStore(state => state.newsData);
  const setNewsData = useBrowserStore(state => state.setNewsData);
  const quickNote = useBrowserStore(state => state.quickNote);
  const setQuickNote = useBrowserStore(state => state.setQuickNote);
  const isEditingDashboard = useBrowserStore(state => state.isEditingDashboard);
  const setIsEditingDashboard = useBrowserStore(state => state.setIsEditingDashboard);
  const weatherLocation = useBrowserStore(state => state.weatherLocation);
  const adsBlocked = useBrowserStore(state => state.adsBlocked);
  const setAdsBlocked = useBrowserStore(state => state.setAdsBlocked);
  const activeWidgets = useBrowserStore(state => state.activeWidgets);
  const setActiveWidgets = useBrowserStore(state => state.setActiveWidgets);
  const isDashboardBlur = useBrowserStore(state => state.isDashboardBlur);
  const setIsDashboardBlur = useBrowserStore(state => state.setIsDashboardBlur);
  const setIsWidgetStoreOpen = useBrowserStore(state => state.setIsWidgetStoreOpen);
  const dashboardLayout = useBrowserStore(state => state.dashboardLayout);
  const updateDashboardLayout = useBrowserStore(state => state.updateDashboardLayout);
  const isFocusMode = useBrowserStore(state => state.isFocusMode);
  const [showWidgetMenu, setShowWidgetMenu] = React.useState(false);
  
  // #2: Live Crypto state
  const [cryptoData, setCryptoData] = useState({ price: null, change: null, loading: true });

  const noteRef = useRef(null);

  useEffect(() => {
    // Track all intervals for proper cleanup (#4 fix)
    const intervals = [];

    if (!useBrowserStore.getState().weatherData) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${weatherLocation.lat}&longitude=${weatherLocation.lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`)
        .then(res => res.json())
        .then(data => setWeatherData(data.daily))
        .catch(err => console.error('Weather fetch error:', err));
    }


    // Fetch ad blocker stats — #4 FIX: properly cleanup adsInterval
    if (window.electronAPI && window.electronAPI.getAdsBlocked) {
      const fetchAds = () => window.electronAPI.getAdsBlocked().then(count => setAdsBlocked(count));
      fetchAds();
      const adsInterval = setInterval(fetchAds, 10000);
      intervals.push(adsInterval);
    }

    if (useBrowserStore.getState().newsData.length === 0) {
      fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.npr.org/1001/rss.xml')
        .then(res => res.json())
        .then(data => {
            if (data && data.items) {
                setNewsData(data.items.slice(0, 5).map((item, i) => ({
                    id: i,
                    source: 'NPR NEWS',
                    title: item.title,
                    time: item.pubDate.split(' ')[1] + ' ' + item.pubDate.split(' ')[2],
                    img: item.enclosure?.link || item.thumbnail || `https://picsum.photos/seed/news${i}/500/300`,
                    text: item.description.replace(/<[^>]*>?/gm, '').substring(0, 80) + '...'
                })));
            }
        })
        .catch(err => console.error('News fetch error:', err));
    }

    if (window.electronAPI && window.electronAPI.fetchStocks) {
      if (useBrowserStore.getState().stockData.length === 0) {
        window.electronAPI.fetchStocks().then(data => {
          if (data && data.length > 0) setStockData(data);
        });
      }
      const stockInterval = setInterval(() => {
        window.electronAPI.fetchStocks().then(data => {
           if (data && data.length > 0) setStockData(data);
        });
      }, 60000);
      intervals.push(stockInterval);
    }

    // #2: Fetch live crypto from CoinGecko
    const fetchCrypto = () => {
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
        .then(r => r.json())
        .then(data => {
          if (data?.bitcoin) {
            setCryptoData({
              price: data.bitcoin.usd,
              change: data.bitcoin.usd_24h_change,
              loading: false
            });
          }
        })
        .catch(() => setCryptoData(prev => ({ ...prev, loading: false })));
    };
    fetchCrypto();
    const cryptoInterval = setInterval(fetchCrypto, 60000);
    intervals.push(cryptoInterval);

    // Single cleanup function clears ALL intervals (#4 fix)
    return () => intervals.forEach(id => clearInterval(id));
  }, [setWeatherData, setNewsData, setStockData]);

  const handleNoteChange = (e) => setQuickNote(e.target.value);

  const getDaysArray = (offsetWeeks = 0) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let rolling = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + (offsetWeeks * 7));
    for (let i = -2; i <= 4; i++) {
      let d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      rolling.push({ name: (i === 0 && offsetWeeks === 0) ? 'Today' : dayNames[d.getDay()], date: d.getDate(), isToday: (i === 0 && offsetWeeks === 0), offset: i });
    }
    return rolling;
  };
  const weekDays = useMemo(() => getDaysArray(0), []);

  const getWorkWeekDates = (offsetWeeks = 0) => {
    let dates = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + (offsetWeeks * 7));
    for (let i = -2; i <= 2; i++) {
      let d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      dates.push({ d: d.getDate(), isToday: (i === 0 && offsetWeeks === 0) });
    }
    return dates;
  };
  const workWeek = useMemo(() => getWorkWeekDates(0), []);

  if (isFocusMode) {
     return (
        <div style={{ width: '100%', height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(60px)', zIndex: 1000, position: 'relative' }}>
            <h1 style={{ fontSize: '80px', color: '#fff', margin: '0 0 20px 0', textShadow: '0 10px 40px rgba(0,255,204,0.5)', fontWeight: 800 }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h1>
            <h2 style={{ fontSize: '20px', color: '#00ffcc', margin: '0 0 40px 0', letterSpacing: '6px', textTransform: 'uppercase', fontWeight: 700 }}>Deep Focus Active</h2>
            
            <div style={{ width: '800px', height: '500px', background: 'rgba(255,255,255,0.03)', borderRadius: '32px', padding: '40px', border: '1px solid rgba(0,255,204,0.2)', boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ background: 'rgba(0,255,204,0.1)', padding: '12px', borderRadius: '12px' }}>
                         <Edit3 color="#00ffcc" size={24} />
                      </div>
                      <h3 style={{ margin: 0, color: '#fff', fontSize: '24px' }}>Study Notes Sandbox</h3>
                  </div>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '100px' }}>Auto-saving</span>
               </div>
               <textarea 
                   ref={noteRef}
                   value={quickNote}
                   onChange={handleNoteChange}
                   placeholder="Start typing your research or study notes here. Distractions (News, Stocks, Social) are hidden."
                   style={{ flex: 1, width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', resize: 'none', outline: 'none', lineHeight: '1.8', fontFamily: 'monospace' }}
               />
            </div>
            
            <button onClick={() => useBrowserStore.getState().setIsFocusMode(false)} style={{ marginTop: '40px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 48px', borderRadius: '100px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', fontWeight: 'bold', fontSize: '16px', letterSpacing: '1px' }} onMouseOver={e=>{e.currentTarget.style.background='rgba(255,68,68,0.2)'; e.currentTarget.style.border='1px solid #ff4444'; e.currentTarget.style.color='#ff4444'}} onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.border='1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.color='#fff'}}>End Session</button>
        </div>
     );
  }

  // Format crypto price nicely
  const formatPrice = (p) => {
    if (!p) return '---';
    return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <>
      <div className="custom-dashboard-container">
         <div className="dashboard-freeform-canvas" style={{ position: 'relative', width: '100%', height: 'calc(100vh - 100px)' }}>
            
            <DraggableWidget widgetKey="news">
              <div className="news-column" style={{ width: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(30px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)', overflowY: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px' }}>
                <div className="feed-header"><h2>News</h2></div>
                <div className="masonry-grid" onPointerDownCapture={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                  {newsData.length > 0 ? newsData.map((item, idx) => (
                  <div key={item.id} className="news-card" style={{ gridColumn: idx === 0 ? 'span 2' : 'span 1' }}>
                    {item.img ? (
                       <div className="news-img-container" style={{ background: 'linear-gradient(45deg, #1e3c72, #2a5298, #bf00ff)' }}>
                          <img src={item.img} alt={item.title} onError={(e) => { e.target.style.display = 'none'; }} />
                       </div>
                    ) : <div className="news-gradient-container" />}
                    <div className="news-content">
                      <span className="news-source">{item.source}</span>
                      <h3 className="news-title">{item.title}</h3>
                      {item.text && <p className="news-excerpt">{item.text}</p>}
                      <div className="news-footer"><span className="news-time">{item.time}</span></div>
                    </div>
                  </div>
                )) : <div style={{color: 'rgba(255,255,255,0.5)', padding: '20px'}}>Fetching latest stories...</div>}
                </div>
              </div>
            </DraggableWidget>

            <DraggableWidget widgetKey="weather">
              <div className="dash-widget weather-widget widget-module" style={{ width: '100%', height: '100%', margin: 0, minWidth: 0, paddingBottom: '30px', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(30px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
                <div className="widget-top">
                  <h3>Weather</h3>
                  <span className="widget-action">New York</span>
                </div>
                <div className="weather-forecast">
                          {weekDays.map((dayObj, i) => {
                            let maxT = weatherData ? Math.round(weatherData.temperature_2m_max[i]) : [32, 31, 32, 37, 23, 32, 32][i];
                            let minT = weatherData ? Math.round(weatherData.temperature_2m_min[i]) : [10, 10, 13, 12, 16, 12, 15][i];
                            let icon = (maxT < 20 || (i % 3 === 0)) ? <CloudRain size={16} /> : <Sun size={16} color={dayObj.isToday ? '#fff' : '#ffd700'} />;
                            let graphHeight = Math.max(0, Math.min(30, (minT - 5) * 2));
                            return (
                              <div key={i} className={`weather-day ${dayObj.isToday ? 'active' : ''}`}>
                                <span className="w-day">{dayObj.name}</span>{icon}<span className="w-temp">{maxT}°</span>
                                <div className="w-graph-point" style={{ bottom: `${graphHeight}px` }}></div>
                                <span className="w-temp-low">{minT}°</span>
                              </div>
                            );
                          })}
                      </div>
                      <svg className="weather-curve" viewBox="0 0 100 20" preserveAspectRatio="none">
                        <path d="M 0,10 Q 20,5 50,15 T 100,10" fill="none" stroke="url(#tempGradient)" strokeWidth="1" />
                        <defs>
                          <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00d2ff" /><stop offset="50%" stopColor="#ff0055" /><stop offset="100%" stopColor="#ff8c00" /></linearGradient>
                        </defs>
                      </svg>
              </div>
            </DraggableWidget>

            <DraggableWidget widgetKey="calendar">
              <div className="dash-widget calendar-widget widget-module" style={{ width: '100%', height: '100%', margin: 0, minWidth: 0, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(30px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
                <div className="widget-top">
                  <h3>Calendar</h3>
                </div>
                <div className="cal-days">
                        {['M', 'T', 'W', 'T', 'F'].map((d, i) => <span key={i} className="c-head">{d}</span>)}
                        {workWeek.map((day, i) => <span key={i} className={`c-date ${day.isToday ? 'active' : ''}`}>{day.d}</span>)}
                      </div>
                      <div className="events-list">
                        <div className="event-item"><div className="event-color purple"></div><div className="event-details"><span className="e-title">No events today</span><span className="e-time">Your day is free ✨</span></div></div>
                        <div className="event-item"><div className="event-color green"></div><div className="event-details"><span className="e-title">Quick Reminder</span><span className="e-time">Connect Google Calendar in Settings</span></div></div>
                      </div>
              </div>
            </DraggableWidget>

            <DraggableWidget widgetKey="notes">
              <div className="dash-widget notes-widget widget-module" style={{ width: '100%', height: '100%', margin: 0, minWidth: 0, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(30px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
                <div className="widget-top"><h3>Quick Notes</h3></div>
                <textarea ref={noteRef} className="notes-input" onPointerDownCapture={(e) => e.stopPropagation()} placeholder="Write your notes here..." value={quickNote} onChange={handleNoteChange} style={{ height: 'calc(100% - 40px)' }} onKeyDown={e => e.stopPropagation()}></textarea>
                <Edit3 size={14} className="notes-edit-icon" onClick={() => noteRef.current?.focus()} style={{ cursor: 'pointer', position: 'absolute', bottom: 16, right: 16 }} />
              </div>
            </DraggableWidget>

            <DraggableWidget widgetKey="stock">
              <div className="dash-widget stock-widget widget-module" style={{ width: '100%', height: '100%', margin: 0, minWidth: 0, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(30px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
                <div className="widget-top">
                        <h3>Stock Market</h3>
                        <div className="stock-nav"><TrendingUp size={14} /></div>
                      </div>
                      <div className="stock-body">
                        <div className="stock-main-graph">
                          <div className="stock-main-val">{((stockData[0]?.p || 100) * 94.2).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                          <div className={`stock-main-change ${stockData[0]?.up ? 'positive' : 'negative'}`}>
                            <span className="arrow">{stockData[0]?.up ? '▲' : '▼'}</span> {stockData[0]?.c || '0.00'}<br />
                            {stockData[0]?.up ? '▲' : '▼'} {Math.abs((stockData[0]?.c || 0) / 2).toFixed(2)}%
                          </div>
                          <svg className="stock-svg-graph" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <path d="M 0,25 Q 10,20 20,28 T 40,15 T 60,25 T 80,10 T 100,5 L 100,30 L 0,30 Z" fill="url(#graphFade)" />
                            <defs><linearGradient id="graphFade" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="rgba(0, 255, 204, 0.2)" /><stop offset="100%" stopColor="rgba(0, 255, 204, 0)" /></linearGradient></defs>
                          </svg>
                          <div className="graph-x-axis"><span>12m</span><span>10h</span><span>6m</span><span>5m</span><span>30s</span></div>
                        </div>
                        <div className="stock-list" onPointerDownCapture={(e) => e.stopPropagation()} style={{ overflowY: 'auto' }}>
                          <div className="s-list-head"><span>Market</span><span>Price</span><span>Change</span></div>
                          {stockData.map((st) => (
                            <div key={st.sym} className="s-list-row">
                              <span className="s-sym"><span className="s-dot" style={{ background: st.col }}></span>{st.sym}</span>
                              <span className="s-price">{st.p.toFixed(2)}</span>
                              <span className={`s-change ${st.up ? 'positive' : 'negative'}`}>{st.c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
              </div>
            </DraggableWidget>




            <DraggableWidget widgetKey="clock">
               <ClockWidget />
            </DraggableWidget>

            {/* #2 FIX: Live Crypto Widget with CoinGecko API */}
            <DraggableWidget widgetKey="crypto">
               <div className="dash-widget widget-module" style={{ width: '100%', height: '100%', margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column', padding: 24, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(30px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.15)', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
                  <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(0,255,204,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,255,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,255,204,0.3)' }}>
                          <TrendingUp size={22} color="#00ffcc" />
                      </div>
                      <h3 style={{ color: '#fff', fontSize: 20, margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>Bitcoin <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 14, marginLeft: 6 }}>BTC</span></h3>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 12 }}>
                      <div style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: '900', color: '#fff', letterSpacing: '-1px', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        {cryptoData.loading ? '...' : formatPrice(cryptoData.price)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: cryptoData.change >= 0 ? '#00ffcc' : '#ff5f56', fontSize: 16, fontWeight: 600, marginTop: 8 }}>
                          <div style={{ background: cryptoData.change >= 0 ? 'rgba(0,255,204,0.15)' : 'rgba(255,95,86,0.15)', padding: '4px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                             {cryptoData.change >= 0 ? <ArrowUp size={16} strokeWidth={3} /> : <ArrowDown size={16} strokeWidth={3} />}
                             {cryptoData.change !== null ? Math.abs(cryptoData.change).toFixed(2) + '% (24h)' : '—'}
                          </div>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>Live • CoinGecko</span>
                      </div>
                  </div>
              </div>
            </DraggableWidget>

            {/* #1 FIX: Calculator now has real math logic */}
            <DraggableWidget widgetKey="calculator">
               <CalculatorWidget />
            </DraggableWidget>

         </div>
      </div>
    </>
  );
}

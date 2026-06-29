import React, { useState } from 'react';
import '../styles/AetherTheme.css';

const FloatingBar = ({ onGo }) => {
    const [val, setVal] = useState('');

    const handleKey = (e) => {
        if (e.key === 'Enter') onGo(val);
    };

    return (
        <div className="floating-dock anim-entry">
            <div className="glass-panel pill-container">
                <span className="ai-status">APEX // SYSTEM READY</span>
                <input
                    className="hologram-input"
                    placeholder="Enter Coordinates..."
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    onKeyDown={handleKey}
                />
            </div>
            <style jsx>{`
                .floating-dock {
                    position: fixed;
                    bottom: 32px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 600px;
                    z-index: 1000;
                }
                .pill-container {
                    height: 64px;
                    border-radius: 100px;
                    display: flex;
                    align-items: center;
                    padding: 0 30px;
                    gap: 20px;
                    transition: all 0.3s ease;
                }
                .pill-container:focus-within {
                    border-color: var(--hologram-cyan);
                    box-shadow: 0 0 40px rgba(0, 243, 255, 0.2);
                }
                .ai-status {
                    font-size: 10px;
                    color: var(--hologram-cyan);
                    letter-spacing: 2px;
                    font-weight: bold;
                    white-space: nowrap;
                    opacity: 0.8;
                }
                .hologram-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 18px;
                    outline: none;
                    font-weight: 300;
                    letter-spacing: 0.5px;
                }
                .hologram-input::placeholder {
                    color: rgba(255,255,255,0.3);
                }
            `}</style>
        </div>
    );
};

export default FloatingBar;

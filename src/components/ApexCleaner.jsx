import React, { useState } from 'react';
import '../styles/AetherTheme.css';

const ApexCleaner = ({ isOpen, onClose }) => {
    const [cleaning, setCleaning] = useState(false);
    const [cleaned, setCleaned] = useState(false);
    const [mode, setMode] = useState('MIN'); // MIN, MED, MAX

    const startCleaning = () => {
        setCleaning(true);
        setCleaned(false);
        setTimeout(() => {
            setCleaning(false);
            setCleaned(true);
        }, 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="apex-panel panel-slide-in">
            <div className="panel-header">
                <h2>GX CLEANER</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="cleaner-hero">
                {!cleaning && !cleaned && (
                    <>
                        <div className="status-circle">
                            <span className="file-size">258<small>MB</small></span>
                            <span className="status-label">Browser Files</span>
                        </div>
                        <button className="clean-btn" onClick={startCleaning}>Start Cleaning</button>
                    </>
                )}

                {cleaning && (
                    <div className="status-circle cleaning">
                        <div className="spinner"></div>
                        <span className="status-label">Purging...</span>
                    </div>
                )}

                {cleaned && (
                    <div className="status-circle cleaned">
                        <span className="file-size">0<small>MB</small></span>
                        <span className="status-label">Cleaned!</span>
                        <button className="reset-btn" onClick={() => setCleaned(false)}>Done</button>
                    </div>
                )}
            </div>

            <div className="mode-selector">
                <button className={mode === 'MIN' ? 'active' : ''} onClick={() => setMode('MIN')}>MIN</button>
                <button className={mode === 'MED' ? 'active' : ''} onClick={() => setMode('MED')}>MED</button>
                <button className={mode === 'MAX' ? 'active' : ''} onClick={() => setMode('MAX')}>MAX</button>
            </div>

            <div className="options-list">
                <h3>Advanced Setup</h3>
                <label className="checkbox-row">
                    <input type="checkbox" defaultChecked />
                    <span>Cache</span>
                </label>
                <label className="checkbox-row">
                    <input type="checkbox" defaultChecked />
                    <span>Cookies</span>
                </label>
                <label className="checkbox-row">
                    <input type="checkbox" />
                    <span>Tabs</span>
                </label>
                <label className="checkbox-row">
                    <input type="checkbox" />
                    <span>Browsing History</span>
                </label>
            </div>

            <style jsx>{`
                .apex-panel {
                    position: fixed;
                    left: 50px; 
                    top: 0;
                    bottom: 0;
                    width: 320px;
                    background: rgba(10, 10, 10, 0.95);
                    border-right: 1px solid var(--apex-red);
                    backdrop-filter: blur(20px);
                    z-index: 1900;
                    padding: 20px;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 10px;
                }

                .panel-header h2 { margin: 0; color: var(--apex-red); font-size: 18px; letter-spacing: 2px; }
                .close-btn { background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }

                .cleaner-hero {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                    padding: 20px 0;
                }

                .status-circle {
                    width: 150px;
                    height: 150px;
                    border-radius: 50%;
                    border: 2px solid var(--apex-red);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    box-shadow: 0 0 20px rgba(250, 30, 78, 0.2);
                    position: relative;
                }

                .file-size { font-size: 32px; font-weight: bold; }
                .file-size small { font-size: 14px; margin-left: 2px; }
                .status-label { font-size: 12px; color: #888; text-transform: uppercase; margin-top: 5px; }

                .clean-btn {
                    background: var(--apex-red);
                    color: white;
                    border: none;
                    padding: 10px 30px;
                    border-radius: 4px;
                    font-weight: bold;
                    cursor: pointer;
                    width: 100%;
                    transition: background 0.2s;
                }
                .clean-btn:hover { background: #d01840; }

                .mode-selector {
                    display: flex;
                    justify-content: space-between;
                    background: rgba(255,255,255,0.05);
                    padding: 5px;
                    border-radius: 8px;
                }

                .mode-selector button {
                    flex: 1;
                    background: none;
                    border: none;
                    color: #888;
                    padding: 10px;
                    cursor: pointer;
                    border-radius: 6px;
                    font-weight: bold;
                }

                .mode-selector button.active {
                    background: rgba(250, 30, 78, 0.2);
                    color: var(--apex-red);
                    border: 1px solid var(--apex-red);
                }

                .options-list {
                    flex: 1;
                    overflow-y: auto;
                }

                .checkbox-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    cursor: pointer;
                }
                
                input[type="checkbox"] { accent-color: var(--apex-red); }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(250, 30, 78, 0.3);
                    border-top-color: var(--apex-red);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin { to { transform: rotate(360deg); } }
                
                .panel-slide-in {
                    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideIn {
                    from { transform: translateX(-100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ApexCleaner;

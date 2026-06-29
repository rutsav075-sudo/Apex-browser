import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import '../styles/AetherTheme.css';

const ApexTurbo = ({ active, onComplete }) => {
    const [phase, setPhase] = useState('idle'); // idle, spooling, purging, done

    useEffect(() => {
        if (active) {
            setPhase('spooling');
            setTimeout(() => setPhase('purging'), 1000);
            setTimeout(() => setPhase('done'), 3500);
            setTimeout(() => {
                setPhase('idle');
                onComplete();
            }, 4500);
        }
    }, [active, onComplete]);

    if (!active) return null;

    return (
        <div className="turbo-overlay">
            <div className={`turbo-content ${phase}`}>
                <Zap size={120} className="turbo-icon" />
                <h1 className="turbo-text">APEX TURBO</h1>

                {phase === 'spooling' && <div className="status">ALLOCATING RESOURCES...</div>}
                {phase === 'purging' && <div className="status">PURGING BACKGROUND TASKS...</div>}
                {phase === 'done' && <div className="status complete">SYSTEM OPTIMIZED</div>}

                <div className="progress-bar">
                    <div className={`progress-fill ${phase}`}></div>
                </div>
            </div>

            <style jsx>{`
                .turbo-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(10, 11, 22, 0.4);
                    z-index: 5000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    backdrop-filter: blur(40px);
                    -webkit-backdrop-filter: blur(40px);
                }

                .turbo-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 30px;
                    color: white;
                    background: rgba(255, 255, 255, 0.03);
                    padding: 60px 100px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 40px;
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2);
                    position: relative;
                }
                
                .turbo-content::before {
                    content: '';
                    position: absolute;
                    top: -1px;
                    left: -1px;
                    right: -1px;
                    bottom: -1px;
                    background: radial-gradient(circle at 50% 0%, rgba(138, 180, 248, 0.4), transparent 60%);
                    border-radius: 40px;
                    z-index: -1;
                    opacity: 0.5;
                    animation: softPulse 3s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
                }

                .turbo-icon {
                    color: rgba(255, 255, 255, 0.9);
                    filter: drop-shadow(0 0 20px rgba(138, 180, 248, 0.6));
                    animation: float 4s ease-in-out infinite;
                }

                .turbo-text {
                    font-size: 50px;
                    font-weight: 300;
                    letter-spacing: 8px;
                    margin: 0;
                    color: rgba(255, 255, 255, 0.95);
                    text-transform: none;
                }

                .status {
                    font-family: 'Inter', sans-serif;
                    font-size: 20px;
                    font-weight: 300;
                    color: rgba(255, 255, 255, 0.7);
                    letter-spacing: 1px;
                }

                .status.complete {
                    color: #8ab4f8;
                    text-shadow: 0 0 20px rgba(138, 180, 248, 0.5);
                }

                .progress-bar {
                    width: 400px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    margin-top: 30px;
                    position: relative;
                    overflow: hidden;
                    clip-path: none;
                    border: none;
                }

                .progress-fill {
                    height: 100%;
                    background: #8ab4f8;
                    width: 0%;
                    box-shadow: 0 0 15px rgba(138, 180, 248, 0.8);
                    position: relative;
                    border-radius: 4px;
                }
                
                .progress-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
                    animation: flow 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }

                .progress-fill.spooling {
                    width: 20%;
                    transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .progress-fill.purging {
                    width: 80%;
                    transition: width 3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .progress-fill.done {
                    width: 100%;
                    background: #8ab4f8;
                    box-shadow: 0 0 20px rgba(138, 180, 248, 0.8);
                    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes softPulse {
                    from { transform: scale(1); opacity: 0.3; }
                    to { transform: scale(1.02); opacity: 0.6; }
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                
                @keyframes flow {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default ApexTurbo;

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

import ErrorBoundary from './components/ErrorBoundary';

// OAuth Client ID loaded from environment variable (see .env.example)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
if (!GOOGLE_CLIENT_ID) console.warn('[Apex] VITE_GOOGLE_CLIENT_ID is not set. Google login will not work.');

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <App />
            </GoogleOAuthProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)

// ============================================================
// PWA Service Worker Registration
// Only registers in web context (not Electron) for installability
// ============================================================
if ('serviceWorker' in navigator && !window.electronAPI) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('[Apex PWA] Service Worker registered, scope:', registration.scope);
                // Check for updates periodically
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'activated') {
                                console.log('[Apex PWA] New version available — refresh to update');
                            }
                        });
                    }
                });
            })
            .catch((err) => {
                console.warn('[Apex PWA] Service Worker registration failed:', err);
            });
    });
}

import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    background: 'rgba(15,15,20,0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,68,68,0.3)',
                    color: '#fff',
                    textAlign: 'center',
                    margin: '20px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>Something went wrong</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '20px' }}>
                        A component crashed. You can try again or check the console for details.
                    </p>
                    <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px', maxHeight: '120px', overflow: 'auto' }}>
                        <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Error Details</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={this.handleRetry}
                        style={{
                            background: 'linear-gradient(135deg, #00d4ff, #bf00ff)',
                            border: 'none',
                            color: '#fff',
                            padding: '10px 32px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '14px',
                            boxShadow: '0 4px 16px rgba(0,212,255,0.3)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

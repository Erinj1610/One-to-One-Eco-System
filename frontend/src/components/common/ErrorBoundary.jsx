import React, { Component } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught rendering error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 0%, #151a3a 0%, #070913 70%)',
          color: '#f3f4f6',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(17, 22, 43, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px rgba(239, 68, 68, 0.05)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', marginBottom: '18px' }}>
              <AlertOctagon size={36} color="#ef4444" />
            </div>

            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 700, margin: '0 0 10px 0', color: '#f87171' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px', lineHeight: '1.5' }}>
              An unexpected rendering error has occurred in the application. Your workspace progress remains safe in memory/local storage.
            </p>

            {this.state.error && (
              <pre style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11px',
                color: '#f87171',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '24px',
                maxHeight: '150px',
                fontFamily: 'monospace'
              }}>
                {this.state.error.toString()}
              </pre>
            )}

            <button 
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                color: '#070913',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0, 242, 254, 0.2)'
              }}
            >
              <RefreshCw size={14} /> Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

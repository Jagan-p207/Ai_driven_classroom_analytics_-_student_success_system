import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('EduPulseAI ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-dark, #070a12)',
          color: '#fff',
          padding: 24
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
            borderRadius: 12,
            padding: '36px 32px',
            maxWidth: 520,
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <AlertTriangle size={28} color="#f87171" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Application Render Notice
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted, #94a3b8)', marginBottom: 20, lineHeight: 1.5 }}>
              EduPulseAI encountered an unexpected component issue:
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: '0.78rem',
              color: '#fca5a5',
              fontFamily: 'monospace',
              marginBottom: 24,
              textAlign: 'left',
              wordBreak: 'break-word',
              maxHeight: 120,
              overflowY: 'auto'
            }}>
              {this.state.error?.message || 'Unknown render exception'}
            </div>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                fontSize: '0.88rem'
              }}
            >
              <RotateCcw size={15} /> Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

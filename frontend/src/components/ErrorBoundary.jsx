import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

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
          background: 'var(--bg-canvas, #f8fafc)',
          color: 'var(--text-primary, #0f172a)',
          padding: 24
        }}>
          <div style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '36px 32px',
            maxWidth: 500,
            textAlign: 'center',
            boxShadow: 'var(--shadow-modal)'
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--risk-high-bg, #fef2f2)',
              border: '1px solid var(--risk-high-border, #fecaca)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--risk-high-solid, #dc2626)'
            }}>
              <AlertCircle size={24} strokeWidth={2} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>
              Application Render Notice
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted, #64748b)', marginBottom: 16, lineHeight: 1.5 }}>
              EduPulse AI encountered an unexpected interface issue:
            </p>
            <div style={{
              background: 'var(--bg-subtle, #f1f5f9)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm, 6px)',
              fontSize: '0.78rem',
              color: 'var(--risk-high-text, #991b1b)',
              fontFamily: 'var(--font-mono, monospace)',
              marginBottom: 20,
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
                gap: 6,
                padding: '8px 20px',
                fontSize: '0.84rem'
              }}
            >
              <RotateCcw size={14} strokeWidth={2} /> Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

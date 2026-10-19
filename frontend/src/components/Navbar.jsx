import React from 'react';
import { GraduationCap, RefreshCw, Upload, Brain, Download, Database } from 'lucide-react';
import { getDownloadReportUrl } from '../services/api';

export default function Navbar({
  activeView = 'overview',
  onSelectView,
  onTriggerRecompute,
  recomputing,
  onOpenIngest,
  onOpenModelInfo,
  onSeedData,
  lastRecomputeTime
}) {
  const navItems = [
    { id: 'overview', label: 'Class Overview' },
    { id: 'roster', label: 'Student Registry' },
    { id: 'ml-models', label: 'ML Intelligence' },
    { id: 'data-ingest', label: 'Data Ingestion' }
  ];

  const handleNavClick = (id) => {
    if (onSelectView) {
      onSelectView(id);
    }
    if (id === 'data-ingest' && onOpenIngest) {
      onOpenIngest();
    } else if (id === 'ml-models' && onOpenModelInfo) {
      onOpenModelInfo();
    }
  };

  return (
    <header style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
    }}>
      {/* Top Institutional Context Bar */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand & Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-subtle)',
            border: '1px solid var(--color-primary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)'
          }}>
            <GraduationCap size={22} strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: '1.18rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '-0.02em'
              }}>
                EduPulse AI
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                letterSpacing: '0.04em'
              }}>
                EARLY-WARNING ANALYTICS
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 1, margin: 0 }}>
              Class CS101 • Computer Science • Fall Semester
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {lastRecomputeTime && (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginRight: 4 }}>
              Scored: {new Date(lastRecomputeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button
            onClick={onTriggerRecompute}
            disabled={recomputing}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', padding: '7px 13px' }}
            title="Batch inference pipeline recomputes risk scores across all students"
          >
            <RefreshCw size={14} className={recomputing ? 'spin-anim' : ''} strokeWidth={2} />
            {recomputing ? 'Scoring Batch...' : 'Batch Recompute'}
          </button>

          <button
            onClick={onOpenIngest}
            className="btn btn-outline"
            style={{ fontSize: '0.82rem', padding: '7px 12px' }}
            title="Upload CSV records for attendance, assessment marks, or LMS activity"
          >
            <Upload size={14} strokeWidth={2} />
            Ingest CSV
          </button>

          <button
            onClick={onOpenModelInfo}
            className="btn btn-outline"
            style={{ fontSize: '0.82rem', padding: '7px 12px' }}
            title="Inspect machine learning benchmark comparison and SHAP feature attributions"
          >
            <Brain size={14} strokeWidth={2} />
            ML Intelligence
          </button>

          <a
            href={getDownloadReportUrl('CS101')}
            download="EduPulseAI_CS101_Institutional_Risk_Report.csv"
            className="btn btn-outline"
            title="Export institution-grade student risk CSV report"
            style={{ textDecoration: 'none', fontSize: '0.82rem', padding: '7px 12px' }}
          >
            <Download size={14} strokeWidth={2} />
            Export CSV
          </a>

          <button
            onClick={onSeedData}
            className="btn btn-outline"
            style={{ fontSize: '0.78rem', padding: '7px 10px', color: 'var(--text-muted)' }}
            title="Reset synthetic baseline pilot cohort dataset (130 students)"
          >
            <Database size={13} strokeWidth={2} />
            Reset Data
          </button>
        </div>
      </div>

      {/* Navigation View Switcher Tabs */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 28px',
        display: 'flex',
        gap: 4,
        borderTop: '1px solid var(--border-subtle)'
      }}>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.82rem',
                padding: '10px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

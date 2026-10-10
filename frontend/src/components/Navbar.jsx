import React from 'react';
import { Activity, RefreshCw, UploadCloud, BrainCircuit, Sparkles, Download } from 'lucide-react';
import { getDownloadReportUrl } from '../services/api';

export default function Navbar({
  onTriggerRecompute,
  recomputing,
  onOpenIngest,
  onOpenModelInfo,
  onSeedData,
  lastRecomputeTime
}) {
  return (
    <header style={{
      background: 'rgba(10, 14, 26, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-glass)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '14px 28px'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Activity size={24} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                EduPulse AI
              </h1>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 99,
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.4)'
              }}>
                EARLY-WARNING SYSTEM
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Classroom Analytics & Student Success • Class CS101
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {lastRecomputeTime && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 4 }}>
              Scored: {new Date(lastRecomputeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button
            onClick={onTriggerRecompute}
            disabled={recomputing}
            className="btn btn-primary"
            style={{ opacity: recomputing ? 0.7 : 1 }}
            title="Batch inference job calculates latest risk scores & SHAP contributions"
          >
            <RefreshCw size={16} className={recomputing ? 'spin-anim' : ''} style={{
              animation: recomputing ? 'spin 1s linear infinite' : 'none'
            }} />
            {recomputing ? 'Scoring Batch...' : 'Batch Recompute'}
          </button>

          <button
            onClick={onOpenIngest}
            className="btn btn-outline"
            title="Upload CSV records for attendance, marks, or LMS logs"
          >
            <UploadCloud size={16} color="#38bdf8" />
            Ingest CSV
          </button>

          <button
            onClick={onOpenModelInfo}
            className="btn btn-outline"
            title="View trained ML models, SHAP explainability, and feature importances"
          >
            <BrainCircuit size={16} color="#a78bfa" />
            ML Intelligence
          </button>

          <a
            href={getDownloadReportUrl('CS101')}
            download="EduPulseAI_CS101_Institutional_Risk_Report.csv"
            className="btn btn-outline"
            title="Export institution-grade student risk & intervention CSV report"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={15} color="#38bdf8" />
            Export CSV
          </a>

          <button
            onClick={onSeedData}
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '10px 14px' }}
            title="Reload synthetic pilot dataset (130 students)"
          >
            <Sparkles size={15} color="#34d399" />
            Sample Data
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}

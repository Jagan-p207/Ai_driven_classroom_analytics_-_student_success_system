import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, BellRing, ArrowRight } from 'lucide-react';

export default function AlertBanner({ alerts = [], onSelectStudent }) {
  const [expanded, setExpanded] = useState(false);

  if (!alerts || alerts.length === 0) {
    return null;
  }

  const highRiskAlerts = alerts.filter(a => a.risk_level === 'High');
  const mediumRiskAlerts = alerts.filter(a => a.risk_level === 'Medium');

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 20px',
      marginBottom: 24,
      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(239, 68, 68, 0.4)'
          }}>
            <BellRing size={20} color="#ef4444" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="alert-pulse-dot" />
              <strong style={{ fontSize: '0.95rem', color: '#fecaca' }}>
                Early-Warning Active: {alerts.length} Students Require Intervention
              </strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: 2 }}>
              <span style={{ color: '#f87171', fontWeight: 600 }}>{highRiskAlerts.length} High Risk</span> critical flags • <span style={{ color: '#fbbf24', fontWeight: 600 }}>{mediumRiskAlerts.length} Medium Risk</span> warning flags
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-outline"
          style={{
            fontSize: '0.8rem',
            padding: '6px 14px',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#fca5a5'
          }}
        >
          {expanded ? 'Hide Alert Queue' : 'Review At-Risk Queue'}
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {expanded && (
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 12,
          maxHeight: 280,
          overflowY: 'auto'
        }}>
          {alerts.map((item) => (
            <div
              key={item.student_id}
              onClick={() => onSelectStudent(item.student_id)}
              style={{
                background: item.risk_level === 'High' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.10)',
                border: `1px solid ${item.risk_level === 'High' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className={`badge-risk ${item.risk_level.toLowerCase()}`}>
                    {item.risk_level}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    ({item.student_id})
                  </span>
                  {item.intervention_status ? (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: item.is_overdue ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.2)',
                      color: item.is_overdue ? '#fca5a5' : '#7dd3fc'
                    }}>
                      {item.is_overdue ? '⚠ Overdue' : `✓ ${item.intervention_status}`}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24'
                    }}>
                      Needs Intervention
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
                  <strong style={{ color: '#e2e8f0' }}>Driver:</strong> {item.primary_driver}
                </p>
                <p style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: 2, fontStyle: 'italic' }}>
                  → {item.recommendation}
                </p>
              </div>
              <ArrowRight size={16} color="#94a3b8" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

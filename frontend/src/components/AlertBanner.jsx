import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, ArrowRight, UserCheck } from 'lucide-react';

export default function AlertBanner({ alerts = [], onSelectStudent }) {
  const [expanded, setExpanded] = useState(false);

  if (!alerts || alerts.length === 0) {
    return null;
  }

  const highRiskAlerts = alerts.filter(a => (a.risk_level || '').toUpperCase() === 'HIGH');
  const mediumRiskAlerts = alerts.filter(a => (a.risk_level || '').toUpperCase() === 'MEDIUM');

  return (
    <section
      aria-label="Early Warning Intervention Alert Queue"
      style={{
        background: 'var(--risk-high-bg)',
        border: '1px solid var(--risk-high-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        marginBottom: 24
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-sm)',
            background: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--risk-high-solid)'
          }}>
            <AlertCircle size={18} strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: '0.92rem', color: 'var(--risk-high-text)', fontWeight: 600 }}>
                Early-Warning Advisory: {alerts.length} Students Require Follow-Up
              </strong>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2, margin: 0 }}>
              <span style={{ color: 'var(--risk-high-text)', fontWeight: 600 }}>{highRiskAlerts.length} High Risk</span> critical signals • <span style={{ color: 'var(--risk-med-text)', fontWeight: 600 }}>{mediumRiskAlerts.length} Medium Risk</span> warning signals
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-outline"
          style={{
            fontSize: '0.78rem',
            padding: '6px 12px',
            background: '#ffffff',
            borderColor: 'var(--risk-high-border)',
            color: 'var(--risk-high-text)'
          }}
        >
          {expanded ? 'Hide Alert Queue' : `Review Queue (${alerts.length})`}
          {expanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
        </button>
      </div>

      {expanded && (
        <div style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: '1px solid var(--risk-high-border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: 10,
          maxHeight: 280,
          overflowY: 'auto'
        }}>
          {alerts.map((item) => (
            <div
              key={item.student_id}
              onClick={() => onSelectStudent(item.student_id)}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '11px 13px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'var(--shadow-xs)',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className={`badge-risk ${(item.risk_level || 'low').toLowerCase()}`}>
                    {item.risk_level}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    ({item.student_id})
                  </span>
                  {item.intervention_status ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 500,
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)',
                      background: item.is_overdue ? 'var(--risk-high-bg)' : 'var(--color-primary-subtle)',
                      color: item.is_overdue ? 'var(--risk-high-text)' : 'var(--color-primary)',
                      border: `1px solid ${item.is_overdue ? 'var(--risk-high-border)' : 'var(--color-primary-border)'}`
                    }}>
                      {item.is_overdue ? 'Overdue' : item.intervention_status}
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Primary factor:</span> {item.primary_driver}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginTop: 2 }}>
                  Recommended: {item.recommendation}
                </div>
              </div>
              <ArrowRight size={14} color="var(--text-light)" strokeWidth={2} style={{ flexShrink: 0, marginLeft: 8 }} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

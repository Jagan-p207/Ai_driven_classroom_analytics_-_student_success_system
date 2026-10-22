import React, { useState, useEffect } from 'react';
import {
  Users, Layers, Award, Calendar, Clock,
  ChevronDown, ChevronUp, ShieldCheck, TrendingUp, BarChart2
} from 'lucide-react';
import { fetchCohortAnalytics } from '../services/api';

export default function CohortAnalyticsSection({ classId = 'CS101', refreshTrigger }) {
  const [cohortData, setCohortData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('program'); // 'program' | 'year' | 'time'
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCohortAnalytics(classId)
      .then((data) => {
        if (data) setCohortData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load cohort analytics:', err);
        setLoading(false);
      });
  }, [classId, refreshTrigger]);

  if (!cohortData && !loading) return null;

  const currentGroups = activeTab === 'program'
    ? cohortData?.by_program || []
    : activeTab === 'year'
    ? cohortData?.by_year_level || []
    : cohortData?.by_class_time || [];

  return (
    <section aria-label="Institutional Cohort Analytics" className="editorial-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
      {/* Header with Collapse Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-primary-subtle)',
            border: '1px solid var(--color-primary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)'
          }}>
            <Layers size={17} strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.08rem', color: 'var(--text-primary)', margin: 0 }}>
                Academic Cohort Breakdown & Demographic Trends
              </h2>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--risk-low-bg)',
                color: 'var(--risk-low-text)',
                border: '1px solid var(--risk-low-border)'
              }}>
                192 Institutional Records
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>
              Comparative grade predictions, risk distributions, and engagement across degree programs and year standings
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {cohortData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem' }}>
              <span style={{
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary-border)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 600
              }}>
                Cohort Avg Pred: {cohortData.overall_avg_predicted}%
              </span>
              {cohortData.overall_avg_observed !== null && (
                <span style={{
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: 600
                }}>
                  Actual Avg: {cohortData.overall_avg_observed}%
                </span>
              )}
            </div>
          )}
          <button
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4
            }}
            aria-label={expanded ? 'Collapse cohort analytics' : 'Expand cohort analytics'}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 18, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Aggregating demographic cohorts and regression predictions...
            </div>
          ) : !cohortData ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No cohort aggregation data available.
            </div>
          ) : (
            <div>
              {/* Filter Tabs & Data Leakage Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 16
              }}>
                <div style={{
                  display: 'inline-flex',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 2,
                  border: '1px solid var(--border-subtle)'
                }}>
                  <button
                    onClick={() => setActiveTab('program')}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.76rem',
                      fontWeight: activeTab === 'program' ? 600 : 500,
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      background: activeTab === 'program' ? 'var(--bg-surface)' : 'transparent',
                      color: activeTab === 'program' ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: activeTab === 'program' ? 'var(--shadow-xs)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Degree Program ({cohortData.by_program?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('year')}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.76rem',
                      fontWeight: activeTab === 'year' ? 600 : 500,
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      background: activeTab === 'year' ? 'var(--bg-surface)' : 'transparent',
                      color: activeTab === 'year' ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: activeTab === 'year' ? 'var(--shadow-xs)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Year Level ({cohortData.by_year_level?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('time')}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.76rem',
                      fontWeight: activeTab === 'time' ? 600 : 500,
                      borderRadius: 'var(--radius-xs)',
                      border: 'none',
                      background: activeTab === 'time' ? 'var(--bg-surface)' : 'transparent',
                      color: activeTab === 'time' ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: activeTab === 'time' ? 'var(--shadow-xs)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Schedule Section ({cohortData.by_class_time?.length || 0})
                  </button>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.72rem'
                }}>
                  <ShieldCheck size={13} color="var(--color-primary)" />
                  <span>Leakage Safeguard: Final exam excluded from features</span>
                </div>
              </div>

              {/* Cohort Grid Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 14
              }}>
                {currentGroups.map((grp) => {
                  const total = grp.student_count || 1;
                  const lowPct = ((grp.risk_counts.Low || 0) / total) * 100;
                  const medPct = ((grp.risk_counts.Medium || 0) / total) * 100;
                  const highPct = ((grp.risk_counts.High || 0) / total) * 100;

                  return (
                    <div
                      key={grp.group_name}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                            {grp.group_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {grp.student_count} Students ({((grp.student_count / cohortData.total_students) * 100).toFixed(1)}% of cohort)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '0.96rem',
                            fontWeight: 700,
                            color: 'var(--color-primary)'
                          }}>
                            {grp.avg_predicted_grade}%
                          </span>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {grp.avg_observed_grade !== null ? `Observed: ${grp.avg_observed_grade}%` : 'Predicted Final'}
                          </div>
                        </div>
                      </div>

                      {/* Stacked Risk Proportion Bar */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{
                          display: 'flex',
                          height: 7,
                          width: '100%',
                          borderRadius: 3,
                          overflow: 'hidden',
                          background: 'var(--border-subtle)',
                          marginBottom: 4
                        }}>
                          <div style={{ width: `${lowPct}%`, background: 'var(--risk-low-solid)' }} title={`Low Risk: ${grp.risk_counts.Low} (${lowPct.toFixed(0)}%)`} />
                          <div style={{ width: `${medPct}%`, background: 'var(--risk-med-solid)' }} title={`Medium Risk: ${grp.risk_counts.Medium} (${medPct.toFixed(0)}%)`} />
                          <div style={{ width: `${highPct}%`, background: 'var(--risk-high-solid)' }} title={`High Risk: ${grp.risk_counts.High} (${highPct.toFixed(0)}%)`} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--risk-low-text)' }}>Low: {grp.risk_counts.Low}</span>
                          <span style={{ color: 'var(--risk-med-text)' }}>Med: {grp.risk_counts.Medium}</span>
                          <span style={{ color: 'var(--risk-high-text)' }}>High: {grp.risk_counts.High}</span>
                        </div>
                      </div>

                      {/* Supporting Aggregates */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 6,
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: 8,
                        fontSize: '0.72rem'
                      }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block' }}>Attendance</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{grp.avg_attendance}/10</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block' }}>Midterm Avg</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{grp.avg_midterm}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block' }}>LMS Views</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{grp.avg_page_views}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

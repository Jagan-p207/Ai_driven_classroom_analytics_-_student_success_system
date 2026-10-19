import React, { useState, useEffect } from 'react';
import {
  History, TrendingUp, TrendingDown, Users,
  Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { fetchHistoricalAnalytics } from '../services/api';

export default function HistoricalAnalyticsSection({ classId = 'CS101', refreshTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchHistoricalAnalytics(classId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load historical analytics:', err);
        setLoading(false);
      });
  }, [classId, refreshTrigger]);

  if (!data && !loading) return null;

  const milestones = data?.milestones || [];
  const attendanceTrend = data?.attendance_trend_overall || [];
  const shifts = data?.risk_tier_shifts || { improved: 0, stable: 0, declined: 0 };
  const interventions = data?.intervention_metrics || { total: 0, planned: 0, in_progress: 0, completed: 0, resolved: 0, overdue: 0 };

  return (
    <section aria-label="Historical Cohort Analytics" className="editorial-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
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
            <History size={17} strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.08rem', color: 'var(--text-primary)', margin: 0 }}>
                Historical Milestone Analytics & Trajectory
              </h2>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)'
              }}>
                5 Milestones
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>
              Assessment milestones, attendance progression, and risk mobility tracking
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Quick Metrics Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem' }}>
            <span style={{
              background: 'var(--risk-low-bg)',
              color: 'var(--risk-low-text)',
              border: '1px solid var(--risk-low-border)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <TrendingUp size={12} strokeWidth={2} /> {shifts.improved} Improved
            </span>
            <span style={{
              background: 'var(--risk-high-bg)',
              color: 'var(--risk-high-text)',
              border: '1px solid var(--risk-high-border)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <TrendingDown size={12} strokeWidth={2} /> {shifts.declined} Flagged
            </span>
            {interventions.overdue > 0 && (
              <span style={{
                background: 'var(--risk-med-bg)',
                color: 'var(--risk-med-text)',
                border: '1px solid var(--risk-med-border)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Clock size={12} strokeWidth={2} /> {interventions.overdue} Overdue
              </span>
            )}
          </div>

          <button
            className="btn btn-outline"
            style={{ padding: '5px 8px', fontSize: '0.76rem' }}
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
              Loading semester trajectory metrics...
            </div>
          ) : (
            <div>
              {/* Charts Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                gap: 16,
                marginBottom: 16
              }}>
                {/* Milestone Risk Tier Distribution */}
                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14
                }}>
                  <div style={{ marginBottom: 10 }}>
                    <h3 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0 }}>
                      Risk Tier Distribution Across Assessment Milestones
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      Progression from Quiz 1 through Midterms and Final Milestones
                    </p>
                  </div>

                  <div style={{ height: 190, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={milestones} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis
                          dataKey="assessment_name"
                          stroke="var(--text-light)"
                          fontSize={10}
                          tickFormatter={(v) => v ? v.split(' - ')[0] : ''}
                        />
                        <YAxis stroke="var(--text-light)" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: 'var(--border-medium)',
                            borderRadius: 6,
                            fontSize: 11,
                            color: 'var(--text-primary)',
                            boxShadow: 'var(--shadow-md)'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                        <Bar dataKey="low_risk_count" name="Low Risk" stackId="a" fill="var(--risk-low-solid)" />
                        <Bar dataKey="medium_risk_count" name="Medium Risk" stackId="a" fill="var(--risk-med-solid)" />
                        <Bar dataKey="high_risk_count" name="High Risk" stackId="a" fill="var(--risk-high-solid)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cohort Attendance Trajectory */}
                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14
                }}>
                  <div style={{ marginBottom: 10 }}>
                    <h3 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0 }}>
                      Cohort Attendance & Performance Trajectory
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      Weekly attendance rate (%) tracked alongside milestones
                    </p>
                  </div>

                  <div style={{ height: 190, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={attendanceTrend} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis
                          dataKey="date"
                          stroke="var(--text-light)"
                          fontSize={10}
                          tickFormatter={(v) => v ? v.slice(5) : ''}
                        />
                        <YAxis stroke="var(--text-light)" domain={[50, 100]} fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: 'var(--border-medium)',
                            borderRadius: 6,
                            fontSize: 11,
                            color: 'var(--text-primary)',
                            boxShadow: 'var(--shadow-md)'
                          }}
                          formatter={(v) => [`${v}%`, 'Attendance Rate']}
                        />
                        <Line
                          type="monotone"
                          dataKey="attendance_rate"
                          name="Attendance %"
                          stroke="var(--color-primary)"
                          strokeWidth={2}
                          dot={{ r: 2.5, fill: 'var(--color-primary)' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Mobility Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12
              }}>
                <div style={{
                  background: 'var(--risk-low-bg)',
                  border: '1px solid var(--risk-low-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--risk-low-text)', fontWeight: 600 }}>Risk Improved</span>
                    <TrendingUp size={15} color="var(--risk-low-solid)" strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--risk-low-text)', marginTop: 2 }}>
                    {shifts.improved}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Shifted to lower risk tier
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Performance Stable</span>
                    <Users size={15} color="var(--color-primary)" strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                    {shifts.stable}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Consistent performance trajectory
                  </div>
                </div>

                <div style={{
                  background: 'var(--risk-high-bg)',
                  border: '1px solid var(--risk-high-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--risk-high-text)', fontWeight: 600 }}>Flagged for Review</span>
                    <TrendingDown size={15} color="var(--risk-high-solid)" strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--risk-high-text)', marginTop: 2 }}>
                    {shifts.declined}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Elevated risk during recent checks
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Interventions</span>
                    <Clock size={15} color="var(--color-accent)" strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                    {interventions.total}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {interventions.resolved} resolved • {interventions.in_progress} in progress
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

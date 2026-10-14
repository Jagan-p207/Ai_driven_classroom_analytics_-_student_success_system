import React, { useState, useEffect } from 'react';
import {
  History, TrendingUp, TrendingDown, Users, CheckCircle2,
  AlertTriangle, Clock, ChevronDown, ChevronUp, Sparkles, BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
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
    <div className="glass-card" style={{ padding: '22px 24px', marginBottom: 24 }}>
      {/* Header with Collapse Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        cursor: 'pointer'
      }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <History size={18} color="#818cf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.15rem', color: '#fff', margin: 0 }}>
                Historical Cohort Analytics & Risk Trajectory
              </h2>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 99,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                5 Milestones Tracked
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Period-over-period risk mobility, assessment milestones, and intervention resolution tracking
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Quick Stats Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              padding: '4px 10px',
              borderRadius: 6,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <TrendingUp size={13} /> {shifts.improved} Improved
            </span>
            <span style={{
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              padding: '4px 10px',
              borderRadius: 6,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <TrendingDown size={13} /> {shifts.declined} Flagged
            </span>
            {interventions.overdue > 0 && (
              <span style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                padding: '4px 10px',
                borderRadius: 6,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Clock size={13} /> {interventions.overdue} Overdue
              </span>
            )}
          </div>

          <button
            className="btn btn-outline"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-glass)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Loading semester trajectory metrics...
            </div>
          ) : (
            <div>
              {/* Top Row: Milestone Risk Distribution & Attendance Progression */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
                gap: 20,
                marginBottom: 20
              }}>
                {/* 1. Milestone Risk Classification Progression */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: '0.92rem', color: '#fff', margin: 0 }}>
                        Risk Tier Counts Across Assessment Milestones
                      </h3>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Cohort distribution at Quiz 1, Quiz 2, Midterm, Quiz 3, and Final Milestone
                      </p>
                    </div>
                  </div>

                  <div style={{ height: 210, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={milestones} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="assessment_name"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickFormatter={(v) => v.split(' - ')[0]}
                        />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: 'rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            fontSize: 12,
                            color: '#fff'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                        <Bar dataKey="low_risk_count" name="Low Risk" stackId="a" fill="#10b981" />
                        <Bar dataKey="medium_risk_count" name="Medium Risk" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="high_risk_count" name="High Risk" stackId="a" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Attendance Trend Overall */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: '0.92rem', color: '#fff', margin: 0 }}>
                        Cohort Attendance & Assessment Averages
                      </h3>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Weekly attendance rate (%) tracked alongside major exam pass rates
                      </p>
                    </div>
                  </div>

                  <div style={{ height: 210, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickFormatter={(v) => v.slice(5)} // MM-DD
                        />
                        <YAxis stroke="#94a3b8" domain={[50, 100]} fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: 'rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            fontSize: 12,
                            color: '#fff'
                          }}
                          formatter={(v) => [`${v}%`, 'Attendance Rate']}
                        />
                        <Line
                          type="monotone"
                          dataKey="attendance_rate"
                          name="Attendance %"
                          stroke="#06b6d4"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#06b6d4' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Risk Mobility Cards & Intervention Status */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 14
              }}>
                {/* Mobility - Improved */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 10,
                  padding: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.76rem', color: '#a7f3d0', fontWeight: 600 }}>Risk Improved</span>
                    <TrendingUp size={16} color="#34d399" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: 4 }}>
                    {shifts.improved}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Students moved to lower risk tier post-intervention
                  </div>
                </div>

                {/* Mobility - Stable */}
                <div style={{
                  background: 'rgba(99, 102, 241, 0.06)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 10,
                  padding: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.76rem', color: '#c7d2fe', fontWeight: 600 }}>Risk Stable</span>
                    <Users size={16} color="#818cf8" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#818cf8', marginTop: 4 }}>
                    {shifts.stable}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Consistent performance trajectory
                  </div>
                </div>

                {/* Mobility - Flagged / Declined */}
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 10,
                  padding: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.76rem', color: '#fca5a5', fontWeight: 600 }}>Newly Flagged</span>
                    <TrendingDown size={16} color="#f87171" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171', marginTop: 4 }}>
                    {shifts.declined}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Students showing negative slope since Midterm
                  </div>
                </div>

                {/* Intervention Progress Overview */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.76rem', color: '#e2e8f0', fontWeight: 600 }}>Active Interventions</span>
                    <CheckCircle2 size={16} color="#38bdf8" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: 4 }}>
                    {interventions.in_progress + interventions.planned}
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
                      / {interventions.total} logged
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                    {interventions.resolved} resolved • <strong style={{ color: interventions.overdue > 0 ? '#fbbf24' : '#10b981' }}>{interventions.overdue} overdue</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

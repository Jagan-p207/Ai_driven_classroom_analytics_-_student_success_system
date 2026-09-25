import React, { useState, useEffect } from 'react';
import {
  X, AlertTriangle, TrendingDown, TrendingUp,
  Brain, ShieldCheck, CheckCircle2, Clock, FileText, Calendar
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { fetchStudentRisk } from '../services/api';

export default function StudentDetailModal({ studentId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    fetchStudentRisk(studentId)
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [studentId]);

  if (!studentId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Student Risk Intelligence Profile
            </span>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', marginTop: 2 }}>
              {loading ? 'Loading Student Profile...' : profile?.student?.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)',
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 28px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Fetching multi-factor assessment and SHAP explainability records...
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: 16,
              color: '#fca5a5'
            }}>
              Failed to load student details: {error}
            </div>
          )}

          {profile && !loading && (
            <div>
              {/* Profile Summary Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
                marginBottom: 20
              }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Student ID</span>
                  <div style={{ fontWeight: 600, color: '#fff', marginTop: 2 }}>{profile.student.student_id}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Department & Class</span>
                  <div style={{ fontWeight: 600, color: '#fff', marginTop: 2 }}>{profile.student.class_id} • {profile.student.department}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Risk Tier</span>
                  <div style={{ marginTop: 2 }}>
                    <span className={`badge-risk ${profile.current_risk.risk_level.toLowerCase()}`}>
                      {profile.current_risk.risk_level} Risk ({(profile.current_risk.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Engagement Index</span>
                  <div style={{ fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                    {profile.current_risk.composite_engagement} / 100
                  </div>
                </div>
              </div>

              {/* Alert Notification & Recommended Interventions */}
              {profile.current_risk.alert_flag && (
                <div style={{
                  background: profile.current_risk.risk_level === 'High' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.10)',
                  border: `1px solid ${profile.current_risk.risk_level === 'High' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <AlertTriangle size={18} color={profile.current_risk.risk_level === 'High' ? '#ef4444' : '#f59e0b'} />
                    <strong style={{ color: '#fff', fontSize: '0.92rem' }}>
                      Early-Warning Action Plan Required ({profile.current_risk.risk_level} Risk)
                    </strong>
                  </div>

                  <ul style={{ paddingLeft: 24, fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                    {profile.current_risk.recommendations.map((rec, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SHAP & Feature Contributing Factors */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: 12,
                padding: 18,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Brain size={18} color="#a78bfa" />
                  <h3 style={{ fontSize: '1rem', color: '#fff' }}>
                    Explainability: Contributing Risk Factors (SHAP Local Contributions)
                  </h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                  Feature impact scores quantify how individual behavioral signals pushed this student's risk assessment higher or lower relative to cohort norms.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                  {profile.current_risk.contributing_factors.map((factor, i) => {
                    const isRiskDriver = factor.impact > 0;
                    return (
                      <div
                        key={i}
                        style={{
                          background: isRiskDriver ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                          border: `1px solid ${isRiskDriver ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                          borderRadius: 8,
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                            {factor.label}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            Observed Value: <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{factor.value}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: isRiskDriver ? '#f87171' : '#34d399'
                          }}>
                            {factor.impact > 0 ? `+${factor.impact}` : factor.impact}
                          </span>
                          <div style={{ fontSize: '0.68rem', color: isRiskDriver ? '#fca5a5' : '#a7f3d0' }}>
                            {isRiskDriver ? 'Risk Driver' : 'Mitigating'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assessment Trend Chart */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: 12,
                padding: 18,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', color: '#fff' }}>
                      Assessment Performance Trajectory
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Chronological marks over the semester (Slope: <strong style={{ color: profile.current_risk.score_trend < 0 ? '#ef4444' : '#10b981' }}>{profile.current_risk.score_trend}</strong> %/exam)
                    </p>
                  </div>
                </div>

                <div style={{ height: 230, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profile.assessment_history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickFormatter={(v) => v.split(' - ')[0]}
                      />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: 'rgba(255,255,255,0.15)',
                          borderRadius: 8,
                          color: '#fff',
                          fontSize: 12
                        }}
                        formatter={(val) => [`${val}%`, 'Score']}
                      />
                      <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Passing Threshold (60%)', fill: '#ef4444', fontSize: 10 }} />
                      <Area
                        type="monotone"
                        dataKey="percentage"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#scoreGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Attendance & LMS Submission Logs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: 18
              }}>
                {/* Attendance Summary */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 12,
                  padding: 18
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Calendar size={16} color="#06b6d4" />
                    <h4 style={{ fontSize: '0.92rem', color: '#fff' }}>Attendance Record</h4>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Overall Attendance: <strong style={{ color: '#fff' }}>{profile.current_risk.attendance_pct}%</strong> across 45 sessions
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.76rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.attendance_history.slice(-10).map((att, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '6px 8px' }}>{att.date}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                              <span style={{
                                color: att.status === 'Present' ? '#34d399' : att.status === 'Late' ? '#fbbf24' : '#f87171',
                                fontWeight: 600
                              }}>
                                {att.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* LMS Coursework Timeliness */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 12,
                  padding: 18
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Clock size={16} color="#f59e0b" />
                    <h4 style={{ fontSize: '0.92rem', color: '#fff' }}>LMS Assignment Timeliness</h4>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Avg Delay: <strong style={{ color: '#fff' }}>{profile.current_risk.avg_submission_delay} days</strong>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.76rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Assignment</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Delay</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.recent_lms_activities.map((lms, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '6px 8px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lms.activity_type}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              {lms.delay_days > 0 ? `+${lms.delay_days}d` : lms.delay_days === 0 ? 'On time' : `${lms.delay_days}d early`}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                              <span style={{
                                color: lms.completion_status === 'Completed' ? '#34d399' : lms.completion_status === 'Late' ? '#fbbf24' : '#f87171',
                                fontWeight: 600
                              }}>
                                {lms.completion_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

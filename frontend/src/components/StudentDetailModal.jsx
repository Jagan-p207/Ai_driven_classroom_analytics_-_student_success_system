import React, { useState, useEffect } from 'react';
import {
  X, AlertTriangle, TrendingDown, TrendingUp,
  Brain, ShieldCheck, CheckCircle2, Clock, FileText, Calendar,
  UserCheck, PlusCircle, History, Sparkles, Send, AlertOctagon
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { fetchStudentRisk, createIntervention, updateIntervention } from '../services/api';

export default function StudentDetailModal({ studentId, onClose, onInterventionUpdated }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Intervention form state
  const [showInterventionForm, setShowInterventionForm] = useState(false);
  const [assignedStaff, setAssignedStaff] = useState('Dr. Elena Vance (Academic Counselor)');
  const [interventionStatus, setInterventionStatus] = useState('In Progress');
  const [followUpDate, setFollowUpDate] = useState('');
  const [interventionNotes, setInterventionNotes] = useState('');
  const [savingIntervention, setSavingIntervention] = useState(false);
  const [interventionMsg, setInterventionMsg] = useState(null);

  // Load student profile
  const loadProfile = (sid) => {
    setLoading(true);
    fetchStudentRisk(sid)
      .then((data) => {
        setProfile(data);
        setLoading(false);
        // Default follow-up date to 14 days from today
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setFollowUpDate(d.toISOString().slice(0, 10));
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!studentId) return;
    loadProfile(studentId);
  }, [studentId]);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!studentId) return null;

  const handleSaveIntervention = async (e) => {
    e.preventDefault();
    if (!followUpDate) {
      setInterventionMsg({ type: 'error', text: 'Please specify a follow-up date.' });
      return;
    }

    try {
      setSavingIntervention(true);
      setInterventionMsg(null);

      await createIntervention(studentId, {
        assigned_staff: assignedStaff,
        status: interventionStatus,
        follow_up_date: followUpDate,
        notes: interventionNotes
      });

      setInterventionMsg({ type: 'success', text: 'Intervention plan recorded and persisted successfully.' });
      setShowInterventionForm(false);
      setInterventionNotes('');

      // Reload student data
      loadProfile(studentId);
      if (onInterventionUpdated) onInterventionUpdated();
    } catch (err) {
      setInterventionMsg({ type: 'error', text: err.message || 'Failed to save intervention.' });
    } finally {
      setSavingIntervention(false);
    }
  };

  const handleQuickStatusChange = async (invId, newStatus) => {
    try {
      await updateIntervention(invId, { status: newStatus });
      loadProfile(studentId);
      if (onInterventionUpdated) onInterventionUpdated();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const latestIntervention = profile?.interventions?.[0];
  const historicalScores = profile?.historical_risk_scores || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Student Risk Intelligence & Case Management
              </span>
              {latestIntervention?.is_overdue && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <AlertOctagon size={11} /> Overdue Follow-Up
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', marginTop: 2 }}>
              {loading ? 'Loading Student Profile...' : profile?.student?.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Profile Modal"
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
        <div style={{ padding: '24px 28px', maxHeight: 'calc(88vh - 80px)', overflowY: 'auto' }}>
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 12,
                marginBottom: 20
              }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Student ID</span>
                  <div style={{ fontWeight: 600, color: '#fff', marginTop: 2 }}>{profile.student.student_id}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{profile.student.email}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Department & Class</span>
                  <div style={{ fontWeight: 600, color: '#fff', marginTop: 2 }}>{profile.student.class_id} • {profile.student.department}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Enrolled: {profile.student.enrollment_date}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Risk Classification</span>
                  <div style={{ marginTop: 2 }}>
                    <span className={`badge-risk ${profile.current_risk.risk_level.toLowerCase()}`}>
                      {profile.current_risk.risk_level} Risk ({(profile.current_risk.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                  {profile.current_risk.confidence && (
                    <div style={{ fontSize: '0.72rem', color: '#a5b4fc', marginTop: 3 }}>
                      Model Confidence: {(profile.current_risk.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Engagement Index</span>
                  <div style={{ fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                    {profile.current_risk.composite_engagement} / 100
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Weighted Academic Index
                  </div>
                </div>
              </div>

              {/* Class Probability Distribution & Confidence Pill */}
              {profile.current_risk.risk_probabilities && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: '10px 16px',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <Brain size={14} color="#a78bfa" />
                    <span>ML Risk Probabilities:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.78rem' }}>
                    <span style={{ color: '#34d399' }}>
                      P(Low): <strong>{((profile.current_risk.risk_probabilities.Low || 0) * 100).toFixed(1)}%</strong>
                    </span>
                    <span style={{ color: '#fbbf24' }}>
                      P(Medium): <strong>{((profile.current_risk.risk_probabilities.Medium || 0) * 100).toFixed(1)}%</strong>
                    </span>
                    <span style={{ color: '#f87171' }}>
                      P(High): <strong>{((profile.current_risk.risk_probabilities.High || 0) * 100).toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION: Actionable Academic Intervention & Case Management */}
              <div style={{
                background: latestIntervention?.is_overdue
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${latestIntervention?.is_overdue ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-glass)'}`,
                borderRadius: 12,
                padding: 18,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserCheck size={18} color="#38bdf8" />
                    <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>
                      Academic Intervention & Case Management
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowInterventionForm(!showInterventionForm)}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                  >
                    <PlusCircle size={14} />
                    {showInterventionForm ? 'Cancel Form' : 'Log / Update Intervention'}
                  </button>
                </div>

                {interventionMsg && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    marginBottom: 12,
                    background: interventionMsg.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: interventionMsg.type === 'error' ? '#fca5a5' : '#a7f3d0'
                  }}>
                    {interventionMsg.text}
                  </div>
                )}

                {/* New Intervention Form */}
                {showInterventionForm && (
                  <form onSubmit={handleSaveIntervention} style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 16,
                    border: '1px solid var(--border-glass)'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                          ASSIGNED STAFF MEMBER
                        </label>
                        <select
                          value={assignedStaff}
                          onChange={(e) => setAssignedStaff(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#0f172a',
                            border: '1px solid var(--border-glass)',
                            borderRadius: 6,
                            padding: '8px 10px',
                            color: '#fff',
                            fontSize: '0.82rem'
                          }}
                        >
                          <option value="Dr. Elena Vance (Academic Counselor)">Dr. Elena Vance (Academic Counselor)</option>
                          <option value="Prof. Marcus Davis (Lead Instructor)">Prof. Marcus Davis (Lead Instructor)</option>
                          <option value="Sarah Jenkins (Peer Tutor Lead)">Sarah Jenkins (Peer Tutor Lead)</option>
                          <option value="Academic Support Center">Academic Support Center</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                          INTERVENTION STATUS
                        </label>
                        <select
                          value={interventionStatus}
                          onChange={(e) => setInterventionStatus(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#0f172a',
                            border: '1px solid var(--border-glass)',
                            borderRadius: 6,
                            padding: '8px 10px',
                            color: '#fff',
                            fontSize: '0.82rem'
                          }}
                        >
                          <option value="Planned">Planned</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                          FOLLOW-UP DATE
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#0f172a',
                            border: '1px solid var(--border-glass)',
                            borderRadius: 6,
                            padding: '8px 10px',
                            color: '#fff',
                            fontSize: '0.82rem'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        ACTION NOTES & RECOMMENDATIONS
                      </label>
                      <textarea
                        rows={2}
                        value={interventionNotes}
                        onChange={(e) => setInterventionNotes(e.target.value)}
                        placeholder="e.g., Scheduled weekly 1-on-1 tutoring sessions, resolved attendance barrier..."
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid var(--border-glass)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          color: '#fff',
                          fontSize: '0.82rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setShowInterventionForm(false)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingIntervention}
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        {savingIntervention ? 'Saving...' : 'Save Intervention Record'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Active Intervention Summary Card */}
                {profile.interventions && profile.interventions.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {profile.interventions.map((inv) => (
                      <div
                        key={inv.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${inv.is_overdue ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-glass)'}`,
                          borderRadius: 8,
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: inv.status === 'Resolved' || inv.status === 'Completed'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : inv.status === 'In Progress'
                                ? 'rgba(56, 189, 248, 0.2)'
                                : 'rgba(245, 158, 11, 0.2)',
                              color: inv.status === 'Resolved' || inv.status === 'Completed'
                                ? '#34d399'
                                : inv.status === 'In Progress'
                                ? '#38bdf8'
                                : '#fbbf24'
                            }}>
                              {inv.status}
                            </span>
                            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#fff' }}>
                              {inv.assigned_staff}
                            </span>
                            {inv.is_overdue && (
                              <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={12} /> Overdue ({inv.follow_up_date})
                              </span>
                            )}
                          </div>
                          {inv.notes && (
                            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: 4, fontStyle: 'italic' }}>
                              "{inv.notes}"
                            </p>
                          )}
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            Follow-up: <strong>{inv.follow_up_date}</strong> • Logged: {inv.created_at.slice(0, 10)}
                          </div>
                        </div>

                        {/* Quick Status Toggles */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {inv.status !== 'Resolved' && (
                            <button
                              onClick={() => handleQuickStatusChange(inv.id, 'Resolved')}
                              className="btn btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                              title="Mark as resolved"
                            >
                              <CheckCircle2 size={12} /> Mark Resolved
                            </button>
                          )}
                          {inv.status !== 'Completed' && inv.status !== 'Resolved' && (
                            <button
                              onClick={() => handleQuickStatusChange(inv.id, 'Completed')}
                              className="btn btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No intervention currently assigned for this student. Click "Log / Update Intervention" to assign a staff member.
                  </div>
                )}
              </div>

              {/* Historical Risk Trajectory Changes (Requirement B) */}
              {historicalScores.length > 0 && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <History size={16} color="#38bdf8" />
                    <h3 style={{ fontSize: '0.94rem', color: '#fff', margin: 0 }}>
                      Historical Risk Level Progression & Shifts
                    </h3>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    overflowX: 'auto',
                    paddingBottom: 6
                  }}>
                    {historicalScores.map((h, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          minWidth: 140,
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {h.computed_at ? h.computed_at.slice(0, 10) : `Snapshot #${i + 1}`}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <span className={`badge-risk ${h.risk_level.toLowerCase()}`} style={{ fontSize: '0.72rem' }}>
                            {h.risk_level} ({(h.risk_score * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 4 }}>
                          Engagement: {h.composite_engagement}
                        </div>
                      </div>
                    ))}
                  </div>
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
                  <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>
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
                    <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>
                      Assessment Performance Trajectory
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Chronological marks over the semester (Slope: <strong style={{ color: profile.current_risk.score_trend < 0 ? '#ef4444' : '#10b981' }}>{profile.current_risk.score_trend}</strong> %/exam)
                    </p>
                  </div>
                </div>

                <div style={{ height: 210, width: '100%' }}>
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
                      <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Passing (60%)', fill: '#ef4444', fontSize: 10 }} />
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

              {/* Attendance & LMS Timeliness Logs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
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
                    <h4 style={{ fontSize: '0.92rem', color: '#fff', margin: 0 }}>Attendance Log (Recent Sessions)</h4>
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
                        {profile.attendance_history.slice(-8).map((att, i) => (
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

                {/* LMS Timeliness */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 12,
                  padding: 18
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Clock size={16} color="#f59e0b" />
                    <h4 style={{ fontSize: '0.92rem', color: '#fff', margin: 0 }}>LMS Assignment Timeliness</h4>
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
                        {profile.recent_lms_activities.slice(-8).map((lms, i) => (
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

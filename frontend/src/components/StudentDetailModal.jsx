import React, { useState, useEffect } from 'react';
import {
  X, AlertTriangle, TrendingDown, TrendingUp,
  Brain, CheckCircle2, Clock, Calendar,
  UserCheck, PlusCircle, History, AlertOctagon, HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area,
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

  const loadProfile = (sid) => {
    setLoading(true);
    fetchStudentRisk(sid)
      .then((data) => {
        setProfile(data);
        setLoading(false);
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

      setInterventionMsg({ type: 'success', text: 'Intervention action recorded successfully.' });
      setShowInterventionForm(false);
      setInterventionNotes('');
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
  const riskLevel = (profile?.current_risk?.risk_level || 'low').toLowerCase();

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Student Dossier Modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 880 }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-subtle)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Student Diagnostic Dossier
              </span>
              {latestIntervention?.is_overdue && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--risk-high-bg)',
                  color: 'var(--risk-high-text)',
                  border: '1px solid var(--risk-high-border)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <AlertOctagon size={11} strokeWidth={2} /> Overdue Follow-Up
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: 2, margin: 0 }}>
              {profile?.student?.name || 'Loading Student Profile...'}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="btn btn-outline"
            style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '22px 24px', maxHeight: 'calc(88vh - 75px)', overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 600 }}>Loading Student Record...</div>
              <p style={{ fontSize: '0.78rem', marginTop: 4 }}>Retrieving attendance logs, examination scores, and ML explainability attributions.</p>
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--risk-high-bg)',
              border: '1px solid var(--risk-high-border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              color: 'var(--risk-high-text)',
              fontSize: '0.84rem'
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
                gap: 10,
                marginBottom: 18
              }}>
                <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>STUDENT IDENTIFIER</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{profile.student.student_id}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{profile.student.email}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>DEPARTMENT & COHORT</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{profile.student.class_id} • {profile.student.department}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Enrolled: {profile.student.enrollment_date || 'Fall 2026'}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>RISK CLASSIFICATION</span>
                  <div style={{ marginTop: 3 }}>
                    <span className={`badge-risk ${riskLevel}`}>
                      {profile.current_risk.risk_level} Risk ({(profile.current_risk.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                  {profile.current_risk.confidence && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Confidence: {(profile.current_risk.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMPOSITE ENGAGEMENT</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginTop: 2, fontSize: '1.05rem' }}>
                    {profile.current_risk.composite_engagement} <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Multivariate weighted index
                  </div>
                </div>
              </div>

              {/* Class Probability Distribution */}
              {profile.current_risk.risk_probabilities && (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 14px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <Brain size={14} color="var(--color-primary)" strokeWidth={2} />
                    <span>Model Class Probabilities:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.76rem' }}>
                    <span style={{ color: 'var(--risk-low-text)' }}>
                      P(Low): <strong>{((profile.current_risk.risk_probabilities.Low || 0) * 100).toFixed(1)}%</strong>
                    </span>
                    <span style={{ color: 'var(--risk-med-text)' }}>
                      P(Medium): <strong>{((profile.current_risk.risk_probabilities.Medium || 0) * 100).toFixed(1)}%</strong>
                    </span>
                    <span style={{ color: 'var(--risk-high-text)' }}>
                      P(High): <strong>{((profile.current_risk.risk_probabilities.High || 0) * 100).toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION: Academic Intervention & Case Management */}
              <div style={{
                background: latestIntervention?.is_overdue ? 'var(--risk-high-bg)' : 'var(--bg-subtle)',
                border: `1px solid ${latestIntervention?.is_overdue ? 'var(--risk-high-border)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <UserCheck size={16} color="var(--color-primary)" strokeWidth={2} />
                    <h3 style={{ fontSize: '0.94rem', color: 'var(--text-primary)', margin: 0 }}>
                      Academic Intervention & Case Management
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowInterventionForm(!showInterventionForm)}
                    className="btn btn-primary"
                    style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                  >
                    <PlusCircle size={13} strokeWidth={2} />
                    {showInterventionForm ? 'Cancel Form' : 'Log / Update Intervention'}
                  </button>
                </div>

                {interventionMsg && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 12,
                    fontSize: '0.78rem',
                    background: interventionMsg.type === 'error' ? 'var(--risk-high-bg)' : 'var(--risk-low-bg)',
                    color: interventionMsg.type === 'error' ? 'var(--risk-high-text)' : 'var(--risk-low-text)',
                    border: `1px solid ${interventionMsg.type === 'error' ? 'var(--risk-high-border)' : 'var(--risk-low-border)'}`
                  }}>
                    {interventionMsg.text}
                  </div>
                )}

                {/* Intervention Form */}
                {showInterventionForm && (
                  <form onSubmit={handleSaveIntervention} style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 14,
                    marginBottom: 14
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                          ASSIGNED STAFF MEMBER
                        </label>
                        <input
                          type="text"
                          value={assignedStaff}
                          onChange={(e) => setAssignedStaff(e.target.value)}
                          className="form-input"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                          INTERVENTION STATUS
                        </label>
                        <select
                          value={interventionStatus}
                          onChange={(e) => setInterventionStatus(e.target.value)}
                          className="form-select"
                          style={{ width: '100%' }}
                        >
                          <option value="Planned">Planned</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                          FOLLOW-UP DEADLINE
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="form-input"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                        ACTION NOTES & RECOMMENDATIONS
                      </label>
                      <textarea
                        rows={2}
                        value={interventionNotes}
                        onChange={(e) => setInterventionNotes(e.target.value)}
                        placeholder="e.g., Scheduled bi-weekly TA tutoring sessions; discussed coursework delay..."
                        className="form-input"
                        style={{ width: '100%', resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setShowInterventionForm(false)}
                        className="btn btn-outline"
                        style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingIntervention}
                        className="btn btn-primary"
                        style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                      >
                        {savingIntervention ? 'Saving...' : 'Save Intervention'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Active Intervention Summary Card */}
                {profile.interventions && profile.interventions.length > 0 ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {profile.interventions.map((inv) => (
                      <div
                        key={inv.id}
                        style={{
                          background: '#ffffff',
                          border: `1px solid ${inv.is_overdue ? 'var(--risk-high-border)' : 'var(--border-subtle)'}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-xs)',
                              background: inv.status === 'Resolved' || inv.status === 'Completed'
                                ? 'var(--risk-low-bg)'
                                : inv.status === 'In Progress'
                                ? 'var(--color-primary-subtle)'
                                : 'var(--risk-med-bg)',
                              color: inv.status === 'Resolved' || inv.status === 'Completed'
                                ? 'var(--risk-low-text)'
                                : inv.status === 'In Progress'
                                ? 'var(--color-primary)'
                                : 'var(--risk-med-text)',
                              border: '1px solid currentColor'
                            }}>
                              {inv.status}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {inv.assigned_staff}
                            </span>
                            {inv.is_overdue && (
                              <span style={{ color: 'var(--risk-high-text)', fontSize: '0.68rem', fontWeight: 600 }}>
                                ⚠ Overdue
                              </span>
                            )}
                          </div>
                          {inv.notes && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4, margin: '4px 0 0' }}>
                              "{inv.notes}"
                            </p>
                          )}
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                            Follow-up: <strong>{inv.follow_up_date}</strong> • Logged: {inv.created_at ? inv.created_at.slice(0, 10) : '—'}
                          </div>
                        </div>

                        {/* Quick Status Toggles */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {inv.status !== 'Resolved' && (
                            <button
                              onClick={() => handleQuickStatusChange(inv.id, 'Resolved')}
                              className="btn btn-outline"
                              style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'var(--risk-low-text)' }}
                              title="Mark as resolved"
                            >
                              <CheckCircle2 size={11} strokeWidth={2} /> Resolve
                            </button>
                          )}
                          {inv.status !== 'Completed' && inv.status !== 'Resolved' && (
                            <button
                              onClick={() => handleQuickStatusChange(inv.id, 'Completed')}
                              className="btn btn-outline"
                              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    No intervention currently assigned for this student. Click "Log / Update Intervention" to assign support staff.
                  </div>
                )}
              </div>

              {/* Historical Risk Trajectory Shifts */}
              {historicalScores.length > 0 && (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 14,
                  marginBottom: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <History size={15} color="var(--color-primary)" strokeWidth={2} />
                    <h3 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0 }}>
                      Historical Milestone Risk Shifts
                    </h3>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    overflowX: 'auto',
                    paddingBottom: 4
                  }}>
                    {historicalScores.map((h, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 10px',
                          minWidth: 120,
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {h.computed_at ? h.computed_at.slice(0, 10) : `Snapshot #${i + 1}`}
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <span className={`badge-risk ${(h.risk_level || 'low').toLowerCase()}`} style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                            {h.risk_level} ({(h.risk_score * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Eng: {h.composite_engagement}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SHAP & Feature Contributing Factors — Transparent Attribution */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Brain size={16} color="var(--color-primary)" strokeWidth={2} />
                    <h3 style={{ fontSize: '0.94rem', color: 'var(--text-primary)', margin: 0 }}>
                      Diagnostic Explainability: Contributing Risk Factors
                    </h3>
                  </div>

                  {/* SHAP vs Heuristic Transparent Attribution Badge */}
                  {(() => {
                    const hasShapMethod = profile.current_risk.contributing_factors?.some(f => f.method === 'SHAP' || f.is_shap === true);
                    return (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        background: hasShapMethod ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                        color: hasShapMethod ? 'var(--color-primary)' : 'var(--text-muted)',
                        border: `1px solid ${hasShapMethod ? 'var(--color-primary-border)' : 'var(--border-subtle)'}`
                      }}>
                        {hasShapMethod ? 'TreeSHAP Marginal Attribution' : 'Heuristic Cohort Deviation Baseline'}
                      </span>
                    );
                  })()}
                </div>

                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 12, margin: '0 0 12px' }}>
                  Relative feature impact scores push risk score higher (+) or lower (-) relative to cohort average baseline.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                  {profile.current_risk.contributing_factors?.map((factor, i) => {
                    const isRiskDriver = factor.impact > 0;
                    return (
                      <div
                        key={i}
                        style={{
                          background: isRiskDriver ? 'var(--risk-high-bg)' : 'var(--risk-low-bg)',
                          border: `1px solid ${isRiskDriver ? 'var(--risk-high-border)' : 'var(--risk-low-border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {factor.label}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Observed: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{factor.value}</span>
                            {factor.method && (
                              <span style={{ marginLeft: 6, opacity: 0.75, fontSize: '0.66rem' }}>
                                ({factor.method})
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: isRiskDriver ? 'var(--risk-high-text)' : 'var(--risk-low-text)'
                          }}>
                            {factor.impact > 0 ? `+${factor.impact}` : factor.impact}
                          </span>
                          <div style={{ fontSize: '0.66rem', color: isRiskDriver ? 'var(--risk-high-text)' : 'var(--risk-low-text)' }}>
                            {isRiskDriver ? 'Risk Driver' : 'Mitigating'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assessment Performance Trajectory */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '0.94rem', color: 'var(--text-primary)', margin: 0 }}>
                      Assessment Score Trajectory
                    </h3>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      Milestone marks (Slope: <strong style={{ color: profile.current_risk.score_trend < 0 ? 'var(--risk-high-text)' : 'var(--risk-low-text)' }}>
                        {profile.current_risk.score_trend > 0 ? '+' : ''}{profile.current_risk.score_trend}
                      </strong> %/exam)
                    </p>
                  </div>
                </div>

                <div style={{ height: 180, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profile.assessment_history} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis
                        dataKey="name"
                        stroke="var(--text-light)"
                        fontSize={10}
                        tickFormatter={(v) => v ? v.split(' - ')[0] : ''}
                      />
                      <YAxis stroke="var(--text-light)" domain={[0, 100]} fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: 'var(--border-medium)',
                          borderRadius: 6,
                          color: 'var(--text-primary)',
                          fontSize: 11,
                          boxShadow: 'var(--shadow-md)'
                        }}
                        formatter={(val) => [`${val}%`, 'Score']}
                      />
                      <ReferenceLine y={60} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'Passing (60%)', fill: '#dc2626', fontSize: 9 }} />
                      <Area
                        type="monotone"
                        dataKey="percentage"
                        stroke="#0284c7"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#scoreGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Attendance and LMS Timeliness Tables */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 14
              }}>
                {/* Attendance Summary */}
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Calendar size={15} color="var(--color-primary)" strokeWidth={2} />
                    <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0 }}>Attendance Log (Recent)</h4>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Overall Attendance: <strong style={{ color: 'var(--text-primary)' }}>{profile.current_risk.attendance_pct}%</strong>
                  </div>
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '4px 6px', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.attendance_history?.slice(-6).map((att, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '5px 6px', color: 'var(--text-secondary)' }}>{att.date}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'right' }}>
                              <span style={{
                                color: att.status === 'Present' ? 'var(--risk-low-text)' : att.status === 'Late' ? 'var(--risk-med-text)' : 'var(--risk-high-text)',
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
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Clock size={15} color="var(--color-accent)" strokeWidth={2} />
                    <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0 }}>LMS Activity Log</h4>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Avg Delay: <strong style={{ color: 'var(--text-primary)' }}>{profile.current_risk.avg_submission_delay} days</strong>
                  </div>
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '4px 6px', textAlign: 'left' }}>Activity</th>
                          <th style={{ padding: '4px 6px', textAlign: 'center' }}>Delay</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.recent_lms_activities?.slice(-6).map((lms, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '5px 6px', color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lms.activity_type}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              {lms.delay_days > 0 ? `+${lms.delay_days}d` : lms.delay_days === 0 ? 'On time' : `${lms.delay_days}d early`}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'right' }}>
                              <span style={{
                                color: lms.completion_status === 'Completed' ? 'var(--risk-low-text)' : lms.completion_status === 'Late' ? 'var(--risk-med-text)' : 'var(--risk-high-text)',
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

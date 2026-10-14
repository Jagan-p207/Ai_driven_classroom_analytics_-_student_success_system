import React, { useState } from 'react';
import {
  Search, TrendingDown, TrendingUp, AlertTriangle, ArrowUpDown,
  ChevronRight, X, Clock, CheckCircle2, RotateCcw
} from 'lucide-react';

export default function StudentRiskTable({
  students = [],
  onSelectStudent,
  riskFilter = 'ALL',
  onRiskFilterChange,
  onFilterChange
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [interventionFilter, setInterventionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortAsc, setSortAsc] = useState(false);

  const handleRiskFilterChange = (lvl) => {
    if (onRiskFilterChange) onRiskFilterChange(lvl);
    if (onFilterChange) onFilterChange(lvl);
  };

  const normalizedFilter = (riskFilter || 'ALL').toUpperCase();

  const riskCounts = {
    ALL: students.length,
    HIGH: students.filter(s => (s.risk_level || '').toUpperCase() === 'HIGH').length,
    MEDIUM: students.filter(s => (s.risk_level || '').toUpperCase() === 'MEDIUM').length,
    LOW: students.filter(s => (s.risk_level || '').toUpperCase() === 'LOW').length
  };

  // Filter students
  const filtered = students.filter(s => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.student_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    const sRisk = (s.risk_level || '').toUpperCase();
    const matchesRisk = normalizedFilter === 'ALL' || sRisk === normalizedFilter;

    let matchesIntervention = true;
    if (interventionFilter === 'OVERDUE') {
      matchesIntervention = s.is_intervention_overdue === true;
    } else if (interventionFilter === 'NEEDS_ACTION') {
      matchesIntervention = (sRisk === 'HIGH' || sRisk === 'MEDIUM') && (!s.latest_intervention_status || s.is_intervention_overdue);
    } else if (interventionFilter === 'ACTIVE') {
      matchesIntervention = s.latest_intervention_status === 'Planned' || s.latest_intervention_status === 'In Progress';
    } else if (interventionFilter === 'RESOLVED') {
      matchesIntervention = s.latest_intervention_status === 'Resolved' || s.latest_intervention_status === 'Completed';
    }

    return matchesSearch && matchesRisk && matchesIntervention;
  });

  // Sort students
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? ((valA ?? 0) - (valB ?? 0)) : ((valB ?? 0) - (valA ?? 0));
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false); // default descending for risk/scores
    }
  };

  const hasActiveFilters = searchTerm !== '' || riskFilter !== 'ALL' || interventionFilter !== 'ALL';

  const clearAllFilters = () => {
    setSearchTerm('');
    setInterventionFilter('ALL');
    if (onRiskFilterChange) onRiskFilterChange('ALL');
  };

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
      {/* Table Header & Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>
              Student Roster & Risk Registry
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({sorted.length} of {students.length} students)
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Multi-factor assessment rankings, active interventions, and performance trends
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            gap: 8,
            minWidth: 200
          }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search name, ID, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.84rem',
                width: '100%'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Intervention Filter Select */}
          <select
            value={interventionFilter}
            onChange={(e) => setInterventionFilter(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '0.78rem',
              color: '#fff',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Interventions: All</option>
            <option value="NEEDS_ACTION">Needs Action / Unassigned</option>
            <option value="OVERDUE">Overdue Follow-Ups</option>
            <option value="ACTIVE">Active (Planned/In Progress)</option>
            <option value="RESOLVED">Resolved / Completed</option>
          </select>

          {/* Risk Level Filter Chips */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-sm)',
            padding: 3,
            border: '1px solid var(--border-glass)'
          }}>
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleRiskFilterChange(lvl)}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: normalizedFilter === lvl ? '#6366f1' : 'transparent',
                  color: normalizedFilter === lvl ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span>{lvl}</span>
                <span style={{
                  fontSize: '0.68rem',
                  opacity: 0.85,
                  background: normalizedFilter === lvl ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                  padding: '1px 5px',
                  borderRadius: 4
                }}>
                  {riskCounts[lvl] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="btn btn-outline"
              style={{
                padding: '6px 10px',
                fontSize: '0.76rem',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Reset search and filters"
            >
              <RotateCcw size={12} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.86rem'
        }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-glass)',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                Student <ArrowUpDown size={12} style={{ verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => handleSort('risk_score')}>
                Risk Classification <ArrowUpDown size={12} style={{ verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '12px 14px' }}>
                Intervention
              </th>
              <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => handleSort('attendance_pct')}>
                Attendance <ArrowUpDown size={12} style={{ verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => handleSort('avg_score')}>
                Assessment Avg <ArrowUpDown size={12} style={{ verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => handleSort('score_trend')}>
                Score Trend <ArrowUpDown size={12} style={{ verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => handleSort('composite_engagement')}>
                Engagement <ArrowUpDown size={12} style={{ verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '12px 14px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No students found matching current filters.
                  {hasActiveFilters && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={clearAllFilters} className="btn btn-outline" style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
                        Clear Filters
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              sorted.map((s) => {
                const isHigh = s.risk_level === 'High';
                const isMed = s.risk_level === 'Medium';
                const slopeColor = s.score_trend < 0 ? '#ef4444' : '#10b981';

                return (
                  <tr
                    key={s.student_id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onSelectStudent(s.student_id)}
                  >
                    {/* Student Info */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {s.student_id} • {s.department}
                      </div>
                    </td>

                    {/* Risk Level & Meter */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={`badge-risk ${s.risk_level.toLowerCase()}`}>
                          {s.risk_level}
                        </span>
                        {s.alert_flag && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: '#f87171' }}>
                            <AlertTriangle size={12} /> Alert
                          </span>
                        )}
                      </div>
                      <div style={{
                        width: 90,
                        height: 5,
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(100, (s.risk_score || 0) * 100)}%`,
                          height: '100%',
                          background: isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981'
                        }} />
                      </div>
                    </td>

                    {/* Intervention Status Column */}
                    <td style={{ padding: '14px' }}>
                      {s.latest_intervention_status ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: s.latest_intervention_status === 'Resolved' || s.latest_intervention_status === 'Completed'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : s.latest_intervention_status === 'In Progress'
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                              color: s.latest_intervention_status === 'Resolved' || s.latest_intervention_status === 'Completed'
                                ? '#34d399'
                                : s.latest_intervention_status === 'In Progress'
                                ? '#38bdf8'
                                : '#fbbf24'
                            }}>
                              {s.latest_intervention_status}
                            </span>
                            {s.is_intervention_overdue && (
                              <span style={{ color: '#f87171', fontSize: '0.68rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }} title="Follow-up date passed">
                                <Clock size={11} /> Overdue
                              </span>
                            )}
                          </div>
                          {s.latest_intervention_staff && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.latest_intervention_staff.split(' (')[0]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: (isHigh || isMed) ? '#f87171' : 'var(--text-muted)' }}>
                          {(isHigh || isMed) ? 'Needs Assignment' : '—'}
                        </span>
                      )}
                    </td>

                    {/* Attendance */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 600, color: s.attendance_pct < 75 ? '#f87171' : '#e2e8f0' }}>
                        {s.attendance_pct}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        45 sessions
                      </div>
                    </td>

                    {/* Assessment Avg */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 600, color: s.avg_score < 60 ? '#f87171' : '#e2e8f0' }}>
                        {s.avg_score}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        5 assessments
                      </div>
                    </td>

                    {/* Score Trend Slope */}
                    <td style={{ padding: '14px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: s.score_trend < 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: slopeColor
                      }}>
                        {s.score_trend < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                        {s.score_trend > 0 ? '+' : ''}{s.score_trend} / exam
                      </div>
                    </td>

                    {/* Composite Engagement */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                        {s.composite_engagement} / 100
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '14px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(s.student_id);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                      >
                        Inspect <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

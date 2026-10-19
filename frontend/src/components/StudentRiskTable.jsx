import React, { useState } from 'react';
import {
  Search, TrendingDown, TrendingUp, AlertTriangle, ArrowUpDown,
  ChevronRight, X, Clock, RotateCcw, ChevronLeft
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const handleRiskFilterChange = (lvl) => {
    setCurrentPage(1);
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
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (s.name || '').toLowerCase().includes(term) ||
      (s.student_id || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term);

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

  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginatedStudents = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false); // Default descending for scores/risk
    }
  };

  const hasActiveFilters = searchTerm !== '' || normalizedFilter !== 'ALL' || interventionFilter !== 'ALL';

  const clearAllFilters = () => {
    setSearchTerm('');
    setInterventionFilter('ALL');
    setCurrentPage(1);
    if (onRiskFilterChange) onRiskFilterChange('ALL');
  };

  return (
    <div className="editorial-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 18
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: '1.08rem', color: 'var(--text-primary)', margin: 0 }}>
              Student Risk Registry & Roster
            </h2>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              ({sorted.length} of {students.length} students)
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>
            Ranked student performance metrics, intervention assignments, and score trajectories
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 10px',
            gap: 6,
            minWidth: 200
          }}>
            <Search size={14} color="var(--text-muted)" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search student or ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                width: '100%',
                fontFamily: 'var(--font-body)'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                aria-label="Clear search"
              >
                <X size={13} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Intervention Status Filter */}
          <select
            value={interventionFilter}
            onChange={(e) => {
              setInterventionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="form-select"
            style={{ fontSize: '0.76rem', padding: '5px 8px' }}
          >
            <option value="ALL">Intervention: All</option>
            <option value="NEEDS_ACTION">Needs Action / Unassigned</option>
            <option value="OVERDUE">Overdue Follow-Ups</option>
            <option value="ACTIVE">Active (Planned/In Progress)</option>
            <option value="RESOLVED">Resolved / Completed</option>
          </select>

          {/* Risk Level Filter Chips */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 2,
            border: '1px solid var(--border-subtle)'
          }}>
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => {
              const isSelected = normalizedFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => handleRiskFilterChange(lvl)}
                  style={{
                    padding: '4px 9px',
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? 600 : 500,
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    cursor: 'pointer',
                    background: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                    boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.12s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{lvl}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '0 4px',
                    borderRadius: 3,
                    background: isSelected ? 'var(--color-primary-subtle)' : 'rgba(0,0,0,0.05)',
                    color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)'
                  }}>
                    {riskCounts[lvl] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clear Filters Reset */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="btn btn-outline"
              style={{
                padding: '4px 8px',
                fontSize: '0.74rem',
                color: 'var(--risk-high-text)',
                borderColor: 'var(--risk-high-border)'
              }}
              title="Reset search and filters"
            >
              <RotateCcw size={12} strokeWidth={2} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
        <table className="editorial-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer', minWidth: 170 }} onClick={() => handleSort('name')}>
                Student <ArrowUpDown size={11} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
              </th>
              <th style={{ cursor: 'pointer', minWidth: 140 }} onClick={() => handleSort('risk_score')}>
                Risk Tier <ArrowUpDown size={11} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
              </th>
              <th style={{ minWidth: 150 }}>
                Intervention
              </th>
              <th style={{ cursor: 'pointer', minWidth: 110 }} onClick={() => handleSort('attendance_pct')}>
                Attendance <ArrowUpDown size={11} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
              </th>
              <th style={{ cursor: 'pointer', minWidth: 120 }} onClick={() => handleSort('avg_score')}>
                Assessment Avg <ArrowUpDown size={11} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
              </th>
              <th style={{ cursor: 'pointer', minWidth: 120 }} onClick={() => handleSort('score_trend')}>
                Trajectory <ArrowUpDown size={11} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
              </th>
              <th style={{ cursor: 'pointer', minWidth: 110 }} onClick={() => handleSort('composite_engagement')}>
                Engagement <ArrowUpDown size={11} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
              </th>
              <th style={{ width: 80, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length === 0 ? (
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
              paginatedStudents.map((s) => {
                const sLevel = (s.risk_level || 'low').toLowerCase();
                const isSlopeNegative = (s.score_trend || 0) < 0;

                return (
                  <tr
                    key={s.student_id}
                    onClick={() => onSelectStudent(s.student_id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Student Identity */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {s.student_id} • {s.department || 'CS'}
                      </div>
                    </td>

                    {/* Risk Tier Badge & Probability Score */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`badge-risk ${sLevel}`}>
                          {s.risk_level}
                        </span>
                        {s.alert_flag && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--risk-high-text)', fontWeight: 600 }} title="Urgent early warning alert flag">
                            Alert
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Score: {((s.risk_score || 0) * 100).toFixed(0)}%
                      </div>
                    </td>

                    {/* Intervention Status */}
                    <td>
                      {s.latest_intervention_status ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-xs)',
                              background: s.latest_intervention_status === 'Resolved' || s.latest_intervention_status === 'Completed'
                                ? 'var(--risk-low-bg)'
                                : s.latest_intervention_status === 'In Progress'
                                ? 'var(--color-primary-subtle)'
                                : 'var(--risk-med-bg)',
                              color: s.latest_intervention_status === 'Resolved' || s.latest_intervention_status === 'Completed'
                                ? 'var(--risk-low-text)'
                                : s.latest_intervention_status === 'In Progress'
                                ? 'var(--color-primary)'
                                : 'var(--risk-med-text)',
                              border: '1px solid currentColor'
                            }}>
                              {s.latest_intervention_status}
                            </span>
                            {s.is_intervention_overdue && (
                              <span style={{ color: 'var(--risk-high-text)', fontSize: '0.68rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }} title="Follow-up deadline exceeded">
                                <Clock size={10} strokeWidth={2} /> Overdue
                              </span>
                            )}
                          </div>
                          {s.latest_intervention_staff && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {s.latest_intervention_staff.split(' (')[0]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          fontSize: '0.72rem',
                          color: (sLevel === 'high' || sLevel === 'medium') ? 'var(--risk-high-text)' : 'var(--text-muted)'
                        }}>
                          {(sLevel === 'high' || sLevel === 'medium') ? 'Needs Assignment' : '—'}
                        </span>
                      )}
                    </td>

                    {/* Attendance */}
                    <td>
                      <div style={{
                        fontWeight: 600,
                        color: s.attendance_pct < 75 ? 'var(--risk-high-text)' : 'var(--text-primary)',
                        fontSize: '0.84rem'
                      }}>
                        {s.attendance_pct}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        45 sessions
                      </div>
                    </td>

                    {/* Marks Average */}
                    <td>
                      <div style={{
                        fontWeight: 600,
                        color: s.avg_score < 60 ? 'var(--risk-high-text)' : 'var(--text-primary)',
                        fontSize: '0.84rem'
                      }}>
                        {s.avg_score}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        5 assessments
                      </div>
                    </td>

                    {/* Score Trajectory (Slope) */}
                    <td>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '0.76rem',
                        fontWeight: 500,
                        background: isSlopeNegative ? 'var(--risk-high-bg)' : 'var(--risk-low-bg)',
                        color: isSlopeNegative ? 'var(--risk-high-text)' : 'var(--risk-low-text)',
                        border: `1px solid ${isSlopeNegative ? 'var(--risk-high-border)' : 'var(--risk-low-border)'}`
                      }}>
                        {isSlopeNegative ? <TrendingDown size={12} strokeWidth={2} /> : <TrendingUp size={12} strokeWidth={2} />}
                        {s.score_trend > 0 ? '+' : ''}{s.score_trend} / exam
                      </div>
                    </td>

                    {/* Composite Engagement */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                        {s.composite_engagement} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 100</span>
                      </div>
                    </td>

                    {/* Inspect Link */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(s.student_id);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                        aria-label={`View dossier for ${s.name}`}
                      >
                        Inspect <ChevronRight size={12} strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {sorted.length > pageSize && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
          fontSize: '0.78rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} students
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-outline"
              style={{ padding: '4px 8px', fontSize: '0.74rem' }}
              aria-label="Previous page"
            >
              <ChevronLeft size={13} strokeWidth={2} /> Prev
            </button>
            <span style={{ padding: '0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-outline"
              style={{ padding: '4px 8px', fontSize: '0.74rem' }}
              aria-label="Next page"
            >
              Next <ChevronRight size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

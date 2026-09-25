import React, { useState } from 'react';
import { Search, TrendingDown, TrendingUp, AlertTriangle, ArrowUpDown, ChevronRight } from 'lucide-react';

export default function StudentRiskTable({ students = [], onSelectStudent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter students
  const filtered = students.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = riskFilter === 'ALL' || s.risk_level.toUpperCase() === riskFilter;
    return matchesSearch && matchesFilter;
  });

  // Sort students
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? (valA - valB) : (valB - valA);
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false); // default descending for metrics
    }
  };

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
      {/* Table Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: '#fff' }}>
            Student Roster & Risk Registry
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Multi-factor assessment rankings and performance trends
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            gap: 8,
            minWidth: 220
          }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search name or ID..."
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
          </div>

          {/* Filter Tabs */}
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
                onClick={() => setRiskFilter(lvl)}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: riskFilter === lvl ? '#6366f1' : 'transparent',
                  color: riskFilter === lvl ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
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
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No students found matching current search/filters.
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
                        {s.student_id} • {s.email}
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
                      {/* Risk score progress bar */}
                      <div style={{
                        width: 100,
                        height: 5,
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(100, s.risk_score * 100)}%`,
                          height: '100%',
                          background: isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981'
                        }} />
                      </div>
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

import React, { useState } from 'react';
import { LayoutGrid, AlertCircle, Info } from 'lucide-react';

export default function ClassHeatmap({
  heatmapData = [],
  onSelectStudent,
  selectedStudentId,
  riskFilter = 'ALL',
  onRiskFilterChange,
  onFilterChange
}) {
  const [hoveredStudent, setHoveredStudent] = useState(null);

  const handleFilterClick = (lvl) => {
    if (onRiskFilterChange) onRiskFilterChange(lvl);
    if (onFilterChange) onFilterChange(lvl);
  };

  const currentFilter = (riskFilter || 'ALL').toUpperCase();

  // Strict case-insensitive category counts matching student records exactly
  const counts = {
    ALL: heatmapData.length,
    HIGH: heatmapData.filter(s => (s.risk_level || '').toUpperCase() === 'HIGH').length,
    MEDIUM: heatmapData.filter(s => (s.risk_level || '').toUpperCase() === 'MEDIUM').length,
    LOW: heatmapData.filter(s => (s.risk_level || '').toUpperCase() === 'LOW').length
  };

  const filtered = heatmapData.filter(s => {
    if (currentFilter === 'ALL') return true;
    return (s.risk_level || '').toUpperCase() === currentFilter;
  });

  const getTileStyles = (riskLevel) => {
    const level = (riskLevel || '').toUpperCase();
    if (level === 'HIGH') {
      return {
        background: 'var(--risk-high-bg)',
        color: 'var(--risk-high-text)',
        borderColor: 'var(--risk-high-border)'
      };
    }
    if (level === 'MEDIUM') {
      return {
        background: 'var(--risk-med-bg)',
        color: 'var(--risk-med-text)',
        borderColor: 'var(--risk-med-border)'
      };
    }
    if (level === 'LOW') {
      return {
        background: 'var(--risk-low-bg)',
        color: 'var(--risk-low-text)',
        borderColor: 'var(--risk-low-border)'
      };
    }
    return {
      background: 'var(--bg-subtle)',
      color: 'var(--text-muted)',
      borderColor: 'var(--border-subtle)'
    };
  };

  return (
    <div className="editorial-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
      {/* Section Header */}
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
            <LayoutGrid size={18} color="var(--color-primary)" strokeWidth={2} />
            <h2 style={{ fontSize: '1.08rem', color: 'var(--text-primary)', margin: 0 }}>
              Class Cohort Risk Matrix
            </h2>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>
            Visual map of {heatmapData.length} students classified by early-warning model. Select any student to view detailed dossier.
          </p>
        </div>

        {/* Legend & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.74rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--risk-high-text)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--risk-high-solid)' }} />
              High
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--risk-med-text)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--risk-med-solid)' }} />
              Medium
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--risk-low-text)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--risk-low-solid)' }} />
              Low
            </span>
          </div>

          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 2,
            border: '1px solid var(--border-subtle)'
          }}>
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => {
              const isSelected = currentFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => handleFilterClick(lvl)}
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
                    gap: 5
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
                    {counts[lvl] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Canvas */}
      <div style={{ position: 'relative' }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '36px 16px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-medium)',
            color: 'var(--text-muted)'
          }}>
            <AlertCircle size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.8 }} strokeWidth={1.75} />
            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              No students currently in the {currentFilter} Risk tier
            </div>
            <p style={{ fontSize: '0.76rem', marginTop: 4 }}>
              Select another risk tier filter or switch to ALL to view the full cohort of {heatmapData.length} students.
            </p>
          </div>
        ) : (
          <div className="heatmap-grid">
            {filtered.map((student) => {
              const isHovered = hoveredStudent?.student_id === student.student_id;
              const isSelected = selectedStudentId === student.student_id;
              const tileStyle = getTileStyles(student.risk_level);

              return (
                <div
                  key={student.student_id}
                  className={`heatmap-tile ${isSelected ? 'selected-tile' : ''}`}
                  style={{
                    background: tileStyle.background,
                    color: tileStyle.color,
                    border: isSelected
                      ? '2px solid var(--color-primary)'
                      : isHovered
                      ? '1px solid var(--text-primary)'
                      : `1px solid ${tileStyle.borderColor}`,
                    boxShadow: isSelected
                      ? '0 0 0 2px var(--color-primary-border), var(--shadow-sm)'
                      : 'var(--shadow-xs)'
                  }}
                  onMouseEnter={() => setHoveredStudent(student)}
                  onMouseLeave={() => setHoveredStudent(null)}
                  onClick={() => onSelectStudent(student.student_id)}
                  title={`${student.name} (${student.student_id}) — ${student.risk_level} Risk`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${student.name}, ${student.student_id}, ${student.risk_level} Risk`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectStudent(student.student_id);
                    }
                  }}
                >
                  <span>{student.student_id.replace(/^STU-?/i, '') || student.student_id}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Hover Tooltip Card */}
        {hoveredStudent && (
          <div style={{
            position: 'absolute',
            bottom: -6,
            right: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            boxShadow: 'var(--shadow-lg)',
            pointerEvents: 'none',
            zIndex: 50,
            minWidth: 240
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                {hoveredStudent.name}
              </strong>
              <span className={`badge-risk ${(hoveredStudent.risk_level || 'low').toLowerCase()}`}>
                {hoveredStudent.risk_level}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              {hoveredStudent.student_id} • Prog {hoveredStudent.program ?? 1} • Yr {hoveredStudent.year_level ?? 3} • Risk Score: {(hoveredStudent.risk_score * 100).toFixed(0)}%
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.74rem' }}>
              <div>Pred Grade: <strong style={{ color: 'var(--color-primary)' }}>
                {hoveredStudent.predicted_grade !== null && hoveredStudent.predicted_grade !== undefined
                  ? `${Number(hoveredStudent.predicted_grade).toFixed(1)}%`
                  : `${hoveredStudent.avg_score}%`}
              </strong></div>
              <div>Attendance: <strong style={{ color: 'var(--text-primary)' }}>{hoveredStudent.attendance_pct}%</strong></div>
              <div>Avg Marks: <strong style={{ color: 'var(--text-primary)' }}>{hoveredStudent.avg_score}%</strong></div>
              <div>Engagement: <strong style={{ color: 'var(--color-primary)' }}>{hoveredStudent.composite_engagement}/100</strong></div>
              <div>Trend: <strong style={{ color: hoveredStudent.score_trend < 0 ? 'var(--risk-high-text)' : 'var(--risk-low-text)' }}>
                {hoveredStudent.score_trend > 0 ? '+' : ''}{hoveredStudent.score_trend}
              </strong></div>
              {hoveredStudent.observed_grade !== null && hoveredStudent.observed_grade !== undefined && (
                <div>Actual Grade: <strong style={{ color: 'var(--text-secondary)' }}>{Number(hoveredStudent.observed_grade).toFixed(1)}%</strong></div>
              )}
            </div>
            {hoveredStudent.intervention_status && (
              <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--color-primary)' }}>
                Intervention: <strong>{hoveredStudent.intervention_status}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

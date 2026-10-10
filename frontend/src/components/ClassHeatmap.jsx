import React, { useState } from 'react';
import { Grid, Eye, AlertCircle, Clock, CheckCircle2, UserCheck } from 'lucide-react';

export default function ClassHeatmap({
  heatmapData = [],
  onSelectStudent,
  selectedStudentId,
  riskFilter = 'ALL',
  onRiskFilterChange
}) {
  const [hoveredStudent, setHoveredStudent] = useState(null);

  const filtered = heatmapData.filter(s => {
    if (!riskFilter || riskFilter === 'ALL') return true;
    return s.risk_level.toUpperCase() === riskFilter.toUpperCase();
  });

  const getTileColor = (riskLevel, riskScore) => {
    if (riskLevel === 'High') {
      const alpha = 0.55 + Math.min(0.45, riskScore * 0.45);
      return `rgba(239, 68, 68, ${alpha})`;
    }
    if (riskLevel === 'Medium') {
      const alpha = 0.55 + Math.min(0.35, riskScore * 0.35);
      return `rgba(245, 158, 11, ${alpha})`;
    }
    return 'rgba(16, 185, 129, 0.7)';
  };

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: 24 }}>
      {/* Heatmap Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Grid size={20} color="#6366f1" />
            <h2 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>
              Class Cohort Risk Heat-Map
            </h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Interactive matrix visualizing early risk signals across {heatmapData.length} students. Click any tile to inspect student profile.
          </p>
        </div>

        {/* Legend & Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', marginRight: 6 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-high-risk)' }} />
              High
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-med-risk)' }} />
              Medium
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-low-risk)' }} />
              Low
            </span>
          </div>

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
                onClick={() => onRiskFilterChange && onRiskFilterChange(lvl)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: riskFilter.toUpperCase() === lvl ? '#6366f1' : 'transparent',
                  color: riskFilter.toUpperCase() === lvl ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div style={{ position: 'relative' }}>
        <div className="heatmap-grid">
          {filtered.map((student) => {
            const isHovered = hoveredStudent?.student_id === student.student_id;
            const isSelected = selectedStudentId === student.student_id;
            const bg = getTileColor(student.risk_level, student.risk_score);

            return (
              <div
                key={student.student_id}
                className={`heatmap-tile ${isSelected ? 'selected-tile' : ''}`}
                style={{
                  background: bg,
                  color: '#fff',
                  border: isSelected
                    ? '2px solid #38bdf8'
                    : isHovered
                    ? '2px solid #fff'
                    : student.alert_flag
                    ? '1px solid rgba(255, 255, 255, 0.4)'
                    : '1px solid rgba(0,0,0,0.2)',
                  boxShadow: isSelected
                    ? '0 0 14px rgba(56, 189, 248, 0.9), inset 0 0 6px rgba(255,255,255,0.4)'
                    : student.alert_flag && student.risk_level === 'High'
                    ? '0 0 8px rgba(239, 68, 68, 0.6)'
                    : 'none',
                  transform: isSelected ? 'scale(1.12)' : 'none',
                  zIndex: isSelected ? 5 : 1
                }}
                onMouseEnter={() => setHoveredStudent(student)}
                onMouseLeave={() => setHoveredStudent(null)}
                onClick={() => onSelectStudent(student.student_id)}
                title={`${student.name} (${student.student_id}) - ${student.risk_level} Risk`}
              >
                <span>{student.student_id.replace('STU', '')}</span>
              </div>
            );
          })}
        </div>

        {/* Floating Tooltip Card */}
        {hoveredStudent && (
          <div style={{
            position: 'absolute',
            bottom: -10,
            right: 0,
            background: 'rgba(15, 23, 42, 0.96)',
            border: '1px solid var(--border-glass-bright)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 50,
            minWidth: 260,
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ color: '#fff', fontSize: '0.88rem' }}>{hoveredStudent.name}</strong>
              <span className={`badge-risk ${hoveredStudent.risk_level.toLowerCase()}`} style={{ fontSize: '0.72rem' }}>
                {hoveredStudent.risk_level}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              ID: {hoveredStudent.student_id} • Score: {(hoveredStudent.risk_score * 100).toFixed(0)}%
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.74rem' }}>
              <div>Attendance: <strong style={{ color: '#e2e8f0' }}>{hoveredStudent.attendance_pct}%</strong></div>
              <div>Avg Marks: <strong style={{ color: '#e2e8f0' }}>{hoveredStudent.avg_score}%</strong></div>
              <div>Engagement: <strong style={{ color: '#38bdf8' }}>{hoveredStudent.composite_engagement}/100</strong></div>
              <div>Trend: <strong style={{ color: hoveredStudent.score_trend < 0 ? '#ef4444' : '#10b981' }}>{hoveredStudent.score_trend > 0 ? '+' : ''}{hoveredStudent.score_trend}</strong></div>
            </div>
            {hoveredStudent.intervention_status && (
              <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-glass)', fontSize: '0.72rem', color: '#a5b4fc' }}>
                Intervention: <strong>{hoveredStudent.intervention_status}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

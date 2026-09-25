import React, { useState } from 'react';
import { Grid, Filter, Eye, AlertCircle } from 'lucide-react';

export default function ClassHeatmap({ heatmapData = [], onSelectStudent }) {
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [hoveredStudent, setHoveredStudent] = useState(null);

  const filtered = heatmapData.filter(s => {
    if (filterLevel === 'ALL') return true;
    return s.risk_level.toUpperCase() === filterLevel;
  });

  const getTileColor = (riskLevel, riskScore) => {
    if (riskLevel === 'High') {
      const alpha = 0.5 + Math.min(0.5, riskScore * 0.5);
      return `rgba(239, 68, 68, ${alpha})`;
    }
    if (riskLevel === 'Medium') {
      const alpha = 0.5 + Math.min(0.4, riskScore * 0.4);
      return `rgba(245, 158, 11, ${alpha})`;
    }
    // Low
    return 'rgba(16, 185, 129, 0.65)';
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
            <h2 style={{ fontSize: '1.2rem', color: '#fff' }}>
              Class Cohort Risk Heat-Map
            </h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Interactive matrix visualizing early risk signals across {heatmapData.length} students. Click any tile to inspect student trajectory.
          </p>
        </div>

        {/* Filter Chips & Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', marginRight: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-high-risk)' }} />
              High Risk
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-med-risk)' }} />
              Medium Risk
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-low-risk)' }} />
              Low Risk
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
                onClick={() => setFilterLevel(lvl)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterLevel === lvl ? '#6366f1' : 'transparent',
                  color: filterLevel === lvl ? '#fff' : 'var(--text-secondary)',
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
          {filtered.map((student, idx) => {
            const isHovered = hoveredStudent?.student_id === student.student_id;
            const bg = getTileColor(student.risk_level, student.risk_score);

            return (
              <div
                key={student.student_id}
                className="heatmap-tile"
                style={{
                  background: bg,
                  color: '#fff',
                  border: isHovered ? '2px solid #fff' : (student.alert_flag ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(0,0,0,0.2)'),
                  boxShadow: student.alert_flag && student.risk_level === 'High' ? '0 0 10px rgba(239, 68, 68, 0.6)' : 'none'
                }}
                onMouseEnter={() => setHoveredStudent(student)}
                onMouseLeave={() => setHoveredStudent(null)}
                onClick={() => onSelectStudent(student.student_id)}
                title={`${student.name} (${student.student_id}) - ${student.risk_level} Risk`}
              >
                {/* Short ID index */}
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
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--border-glass-bright)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 50,
            minWidth: 260,
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{hoveredStudent.name}</strong>
              <span className={`badge-risk ${hoveredStudent.risk_level.toLowerCase()}`}>
                {hoveredStudent.risk_level}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              {hoveredStudent.student_id}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.78rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Risk Score:</span>{' '}
                <strong style={{ color: hoveredStudent.risk_level === 'High' ? '#ef4444' : hoveredStudent.risk_level === 'Medium' ? '#f59e0b' : '#10b981' }}>
                  {(hoveredStudent.risk_score * 100).toFixed(0)}%
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Attendance:</span>{' '}
                <strong style={{ color: '#fff' }}>{hoveredStudent.attendance_pct}%</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Avg Score:</span>{' '}
                <strong style={{ color: '#fff' }}>{hoveredStudent.avg_score}%</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Score Slope:</span>{' '}
                <strong style={{ color: hoveredStudent.score_trend < 0 ? '#f87171' : '#34d399' }}>
                  {hoveredStudent.score_trend > 0 ? '+' : ''}{hoveredStudent.score_trend}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-glass)', fontSize: '0.72rem', color: '#38bdf8' }}>
              Click tile for full trajectory & SHAP analysis →
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

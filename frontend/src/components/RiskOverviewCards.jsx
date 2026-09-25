import React from 'react';
import { Users, AlertOctagon, AlertTriangle, CheckCircle2, CalendarCheck, Award, Zap } from 'lucide-react';

export default function RiskOverviewCards({ summary }) {
  if (!summary) return null;

  const total = summary.total_students || 1;
  const highCount = summary.risk_counts?.High || 0;
  const medCount = summary.risk_counts?.Medium || 0;
  const lowCount = summary.risk_counts?.Low || 0;

  const highPct = ((highCount / total) * 100).toFixed(1);
  const medPct = ((medCount / total) * 100).toFixed(1);
  const lowPct = ((lowCount / total) * 100).toFixed(1);

  const cards = [
    {
      title: 'Class Roster',
      value: summary.total_students,
      subtitle: 'Computer Science CS101',
      icon: Users,
      color: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.2)'
    },
    {
      title: 'High Risk (Critical)',
      value: highCount,
      subtitle: `${highPct}% of cohort`,
      badge: 'Immediate Action',
      icon: AlertOctagon,
      color: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.25)',
      isCritical: highCount > 0
    },
    {
      title: 'Medium Risk (Warning)',
      value: medCount,
      subtitle: `${medPct}% of cohort`,
      badge: 'Needs Support',
      icon: AlertTriangle,
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.2)'
    },
    {
      title: 'Low Risk (On Track)',
      value: lowCount,
      subtitle: `${lowPct}% of cohort`,
      badge: 'Stable / High Achievers',
      icon: CheckCircle2,
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.2)'
    },
    {
      title: 'Avg Attendance',
      value: `${summary.avg_attendance || 0}%`,
      subtitle: 'Across 45 sessions',
      icon: CalendarCheck,
      color: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.2)'
    },
    {
      title: 'Avg Assessment',
      value: `${summary.avg_score || 0}%`,
      subtitle: '5 Major Assessments',
      icon: Award,
      color: '#ec4899',
      glow: 'rgba(236, 72, 153, 0.2)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 16,
      marginBottom: 24
    }}>
      {cards.map((c, i) => {
        const IconComponent = c.icon;
        return (
          <div
            key={i}
            className="glass-card"
            style={{
              padding: '18px 20px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 4px 20px ${c.glow}`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {c.title}
                </span>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', marginTop: 4, lineHeight: 1.1 }}>
                  {c.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: c.color, marginTop: 4, fontWeight: 500 }}>
                  {c.subtitle}
                </div>
              </div>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `rgba(${c.color === '#ef4444' ? '239, 68, 68' : c.color === '#f59e0b' ? '245, 158, 11' : c.color === '#10b981' ? '16, 185, 129' : '99, 102, 241'}, 0.15)`,
                border: `1px solid ${c.color}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconComponent size={20} color={c.color} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

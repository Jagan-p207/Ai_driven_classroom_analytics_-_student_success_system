import React from 'react';
import { Users, AlertTriangle, AlertOctagon, CheckCircle2, CalendarCheck, Award } from 'lucide-react';

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
      title: 'Total Enrolled',
      value: summary.total_students,
      subtitle: 'Active Cohort Roster',
      badge: 'CS101 Roster',
      badgeClass: '',
      icon: Users,
      iconColor: 'var(--color-primary)',
      iconBg: 'var(--color-primary-subtle)',
      borderColor: 'var(--border-subtle)'
    },
    {
      title: 'High Risk (Tier 3)',
      value: highCount,
      subtitle: `${highPct}% of cohort`,
      badge: 'Immediate Action',
      badgeClass: 'badge-risk high',
      icon: AlertOctagon,
      iconColor: 'var(--risk-high-solid)',
      iconBg: 'var(--risk-high-bg)',
      borderColor: highCount > 0 ? 'var(--risk-high-border)' : 'var(--border-subtle)'
    },
    {
      title: 'Medium Risk (Tier 2)',
      value: medCount,
      subtitle: `${medPct}% of cohort`,
      badge: 'Support Queue',
      badgeClass: 'badge-risk medium',
      icon: AlertTriangle,
      iconColor: 'var(--risk-med-solid)',
      iconBg: 'var(--risk-med-bg)',
      borderColor: 'var(--border-subtle)'
    },
    {
      title: 'Low Risk (Tier 1)',
      value: lowCount,
      subtitle: `${lowPct}% of cohort`,
      badge: 'On Track',
      badgeClass: 'badge-risk low',
      icon: CheckCircle2,
      iconColor: 'var(--risk-low-solid)',
      iconBg: 'var(--risk-low-bg)',
      borderColor: 'var(--border-subtle)'
    },
    {
      title: 'Cohort Attendance',
      value: `${summary.avg_attendance || 0}%`,
      subtitle: 'Session aggregate',
      badge: 'Across 45 sessions',
      badgeClass: '',
      icon: CalendarCheck,
      iconColor: 'var(--color-accent)',
      iconBg: 'var(--color-accent-subtle)',
      borderColor: 'var(--border-subtle)'
    },
    {
      title: 'Average Marks',
      value: `${summary.avg_score || 0}%`,
      subtitle: 'Course assessments',
      badge: '5 milestones',
      badgeClass: '',
      icon: Award,
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
      borderColor: 'var(--border-subtle)'
    }
  ];

  return (
    <section aria-label="Classroom Key Performance Indicators" style={{ marginBottom: 24 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 14
      }}>
        {cards.map((c, i) => {
          const IconComponent = c.icon;
          return (
            <div
              key={i}
              className="editorial-card"
              style={{
                padding: '16px 18px',
                background: 'var(--bg-surface)',
                border: `1px solid ${c.borderColor}`,
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {c.title}
                </span>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: c.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: c.iconColor
                }}>
                  <IconComponent size={17} strokeWidth={2} />
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.1,
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '-0.02em'
                }}>
                  {c.value}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 6
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {c.subtitle}
                  </span>
                  {c.badgeClass ? (
                    <span className={c.badgeClass} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {c.badge}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

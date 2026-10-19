/**
 * EduPulse AI — Academic Formatting Utilities
 * Standardized numerical, date, and risk formatting helpers.
 */

export function formatRiskScore(score) {
  if (score === null || score === undefined) return '0%';
  return `${Math.round(score * 100)}%`;
}

export function formatPercentage(val) {
  if (val === null || val === undefined) return '0%';
  return `${Number(val).toFixed(1)}%`;
}

export function formatStudentId(rawId) {
  if (!rawId) return '';
  return String(rawId).trim();
}

export function getRiskTierBadgeClass(riskLevel) {
  const level = (riskLevel || '').toUpperCase();
  if (level === 'HIGH') return 'badge-risk high';
  if (level === 'MEDIUM') return 'badge-risk medium';
  return 'badge-risk low';
}

/**
 * API Client for AI-Driven Classroom Analytics and Student Success System (EduPulseAI).
 * Supports live backend API with automatic fallback to embedded synthetic dataset
 * for standalone static deployments (e.g. Netlify, Vercel).
 */

import {
  getDemoClassRiskSummary,
  getDemoStudents,
  getDemoStudentRisk,
  getDemoModelInfo,
  getDemoHistoricalAnalytics
} from './demoData';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function fetchClassRiskSummary(classId = 'CS101') {
  try {
    const res = await fetch(`${BASE_URL}/api/class/${classId}/risk-summary`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable. Returning demo fallback data.", err);
  }
  return getDemoClassRiskSummary(classId);
}

export async function fetchHistoricalAnalytics(classId = 'CS101') {
  try {
    const res = await fetch(`${BASE_URL}/api/class/${classId}/historical-analytics`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable. Returning demo fallback historical analytics.", err);
  }
  return getDemoHistoricalAnalytics();
}

export async function fetchStudents(filters = {}) {
  try {
    const query = new URLSearchParams();
    if (filters.risk_level && filters.risk_level !== 'ALL') query.append('risk_level', filters.risk_level);
    if (filters.search) query.append('search', filters.search);
    if (filters.class_id) query.append('class_id', filters.class_id);
    if (filters.intervention_status && filters.intervention_status !== 'ALL') {
      query.append('intervention_status', filters.intervention_status);
    }

    const res = await fetch(`${BASE_URL}/api/students?${query.toString()}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable. Returning demo fallback students.", err);
  }

  let list = getDemoStudents();
  if (filters.risk_level && filters.risk_level !== 'ALL') {
    list = list.filter(s => s.risk_level === filters.risk_level);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(s => (s.name && s.name.toLowerCase().includes(q)) || (s.student_id && s.student_id.toLowerCase().includes(q)));
  }
  return list;
}

export async function fetchStudentRisk(studentId) {
  try {
    const res = await fetch(`${BASE_URL}/api/students/${studentId}/risk`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable. Returning demo fallback student detail.", err);
  }
  return getDemoStudentRisk(studentId);
}

export async function createIntervention(studentId, payload) {
  const res = await fetch(`${BASE_URL}/api/students/${studentId}/interventions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create intervention: ${res.statusText}`);
  }
  return res.json();
}

export async function updateIntervention(interventionId, payload) {
  const res = await fetch(`${BASE_URL}/api/interventions/${interventionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update intervention: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStudentInterventions(studentId) {
  const res = await fetch(`${BASE_URL}/api/students/${studentId}/interventions`);
  if (!res.ok) throw new Error(`Failed to load student interventions: ${res.statusText}`);
  return res.json();
}

export async function fetchInterventionsOverview(classId = 'CS101') {
  const res = await fetch(`${BASE_URL}/api/interventions/overview?class_id=${classId}`);
  if (!res.ok) throw new Error(`Failed to load interventions overview: ${res.statusText}`);
  return res.json();
}

export async function triggerRecompute() {
  const res = await fetch(`${BASE_URL}/api/recompute`, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Recomputation failed (${res.status}: ${res.statusText})`);
  }
  return await res.json();
}

export async function previewCSV(sourceType, file) {
  const formData = new FormData();
  formData.append('source_type', sourceType);
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/ingest/preview`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Preview failed: ${res.statusText}`);
  }
  return res.json();
}

export async function ingestCSV(sourceType, file, autoRecompute = true) {
  const formData = new FormData();
  formData.append('source_type', sourceType);
  formData.append('file', file);
  formData.append('auto_recompute', autoRecompute ? 'true' : 'false');

  const res = await fetch(`${BASE_URL}/api/ingest`, { method: 'POST', body: formData });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Ingestion failed (${res.status}: ${res.statusText})`);
  }
  return await res.json();
}

export async function seedSampleData() {
  const res = await fetch(`${BASE_URL}/api/seed`, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Seed failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchModelInfo() {
  try {
    const res = await fetch(`${BASE_URL}/api/model/info`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch model info (${res.status})`);
  } catch (err) {
    console.warn("Backend API unavailable or error fetching model info. Falling back to demo data.", err);
    return getDemoModelInfo();
  }
}

export function getDownloadReportUrl(classId = 'CS101') {
  return `${BASE_URL}/api/reports/csv?class_id=${classId}`;
}

export async function fetchReportSummary(classId = 'CS101') {
  const res = await fetch(`${BASE_URL}/api/reports/summary?class_id=${classId}`);
  if (!res.ok) throw new Error(`Failed to fetch report summary: ${res.statusText}`);
  return res.json();
}

export async function retrainModel() {
  const res = await fetch(`${BASE_URL}/api/model/retrain`, {
    method: 'POST'
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Model retraining failed (${res.status}: ${res.statusText})`);
  }
  return res.json();
}

export async function fetchCohortAnalytics(classId = 'CS101') {
  try {
    const res = await fetch(`${BASE_URL}/api/class/${classId}/cohort-analytics`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable for cohort analytics. Falling back.", err);
  }
  return null;
}

export async function predictStudent(studentPayload) {
  const res = await fetch(`${BASE_URL}/api/predict/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentPayload)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Prediction failed: ${res.statusText}`);
  }
  return res.json();
}

export async function predictBatch(studentsList) {
  const res = await fetch(`${BASE_URL}/api/predict/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students: studentsList })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Batch prediction failed: ${res.statusText}`);
  }
  return res.json();
}


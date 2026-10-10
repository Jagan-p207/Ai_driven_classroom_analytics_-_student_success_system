/**
 * API Client for AI-Driven Classroom Analytics and Student Success System.
 * Supports live backend API with automatic fallback to embedded synthetic dataset
 * for standalone static deployments (e.g. Netlify).
 */

import {
  getDemoClassRiskSummary,
  getDemoStudents,
  getDemoStudentRisk,
  getDemoModelInfo
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

export async function fetchStudents(filters = {}) {
  try {
    const query = new URLSearchParams();
    if (filters.risk_level) query.append('risk_level', filters.risk_level);
    if (filters.search) query.append('search', filters.search);
    if (filters.class_id) query.append('class_id', filters.class_id);

    const res = await fetch(`${BASE_URL}/api/students?${query.toString()}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable. Returning demo fallback students.", err);
  }

  let list = getDemoStudents();
  if (filters.risk_level) {
    list = list.filter(s => s.risk_level === filters.risk_level);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(s => s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q));
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

export async function triggerRecompute() {
  try {
    const res = await fetch(`${BASE_URL}/api/recompute`, { method: 'POST' });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable for recompute.", err);
  }
  return {
    status: "success",
    students_scored: 130,
    execution_time_seconds: 0.14,
    timestamp: new Date().toISOString(),
    risk_distribution: { Low: 82, Medium: 28, High: 20 }
  };
}

export async function ingestCSV(sourceType, file, autoRecompute = true) {
  try {
    const formData = new FormData();
    formData.append('source_type', sourceType);
    formData.append('file', file);
    formData.append('auto_recompute', autoRecompute ? 'true' : 'false');

    const res = await fetch(`${BASE_URL}/api/ingest`, { method: 'POST', body: formData });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable for ingestion.", err);
  }
  return {
    status: "success",
    message: `Ingested ${sourceType} CSV (Demo Mode)`,
    records_processed: 45
  };
}

export async function seedSampleData() {
  try {
    const res = await fetch(`${BASE_URL}/api/seed`, { method: 'POST' });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable for seed.", err);
  }
  return {
    status: "success",
    message: "Pilot dataset (130 students) reset in demo mode."
  };
}

export async function fetchModelInfo() {
  try {
    const res = await fetch(`${BASE_URL}/api/model/info`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable. Returning demo model info.", err);
  }
  return getDemoModelInfo();
}

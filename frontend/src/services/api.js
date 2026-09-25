/**
 * API Client for AI-Driven Classroom Analytics and Student Success System.
 */

const BASE_URL = ''; // Relative path leverages Vite dev server proxy

export async function fetchClassRiskSummary(classId = 'CS101') {
  const res = await fetch(`${BASE_URL}/api/class/${classId}/risk-summary`);
  if (!res.ok) throw new Error(`Failed to load class risk summary: ${res.statusText}`);
  return res.json();
}

export async function fetchStudents(filters = {}) {
  const query = new URLSearchParams();
  if (filters.risk_level) query.append('risk_level', filters.risk_level);
  if (filters.search) query.append('search', filters.search);
  if (filters.class_id) query.append('class_id', filters.class_id);

  const res = await fetch(`${BASE_URL}/api/students?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to load students: ${res.statusText}`);
  return res.json();
}

export async function fetchStudentRisk(studentId) {
  const res = await fetch(`${BASE_URL}/api/students/${studentId}/risk`);
  if (!res.ok) throw new Error(`Failed to load student risk detail: ${res.statusText}`);
  return res.json();
}

export async function triggerRecompute() {
  const res = await fetch(`${BASE_URL}/api/recompute`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to trigger recompute: ${res.statusText}`);
  return res.json();
}

export async function ingestCSV(sourceType, file, autoRecompute = true) {
  const formData = new FormData();
  formData.append('source_type', sourceType);
  formData.append('file', file);
  formData.append('auto_recompute', autoRecompute ? 'true' : 'false');

  const res = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Ingestion failed: ${res.statusText}`);
  }
  return res.json();
}

export async function seedSampleData() {
  const res = await fetch(`${BASE_URL}/api/seed`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to seed data: ${res.statusText}`);
  return res.json();
}

export async function fetchModelInfo() {
  const res = await fetch(`${BASE_URL}/api/model/info`);
  if (!res.ok) throw new Error(`Failed to fetch model info: ${res.statusText}`);
  return res.json();
}

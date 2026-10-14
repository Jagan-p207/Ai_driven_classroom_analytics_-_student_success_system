import React, { useState } from 'react';
import {
  X, UploadCloud, AlertCircle, FileText, Database,
  ArrowRight, RefreshCw, AlertTriangle, Check, RotateCcw
} from 'lucide-react';
import { previewCSV, ingestCSV, seedSampleData } from '../services/api';

export default function IngestionModal({ isOpen, onClose, onIngestionComplete }) {
  const [sourceType, setSourceType] = useState('attendance');
  const [selectedFile, setSelectedFile] = useState(null);
  const [autoRecompute, setAutoRecompute] = useState(true);

  // Workflow steps: 'upload' -> 'preview' -> 'result'
  const [step, setStep] = useState('upload');
  const [previewData, setPreviewData] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const resetState = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setStep('upload');
    setError(null);
    setResult(null);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV (.csv) files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds maximum size limit of 10MB.');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleGeneratePreview = async (e) => {
    e?.preventDefault();
    if (!selectedFile) {
      setError('Please select a CSV file first.');
      return;
    }

    try {
      setPreviewing(true);
      setError(null);
      const res = await previewCSV(sourceType, selectedFile);
      setPreviewData(res);
      setStep('preview');
    } catch (err) {
      setError(err.message || 'Failed to analyze CSV.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommitIngest = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      const res = await ingestCSV(sourceType, selectedFile, autoRecompute);
      setResult(res);
      setStep('result');
      if (onIngestionComplete) onIngestionComplete();
    } catch (err) {
      setError(err.message || 'Ingestion commit failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSeed = async () => {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await seedSampleData();
      setResult({ message: res.message });
      setStep('result');
      if (onIngestionComplete) onIngestionComplete();
    } catch (err) {
      setError(err.message || 'Failed to seed sample dataset.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: step === 'preview' ? 760 : 580 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UploadCloud size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.15rem', color: '#fff', margin: 0 }}>
              Institutional Data Ingestion & Validation Pipeline
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '12px 14px',
              color: '#fca5a5',
              fontSize: '0.84rem',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD & CONFIGURATION */}
          {step === 'upload' && (
            <div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Bulk upload normalized CSV institutional records. The system validates schema completeness, flags missing values, checks for duplicates, and provides an import preview before database commit.
              </p>

              <form onSubmit={handleGeneratePreview}>
                {/* Source Type Selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                    DATA SOURCE TYPE
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  >
                    <option value="attendance" style={{ background: '#0f172a' }}>Attendance Records (Sessions)</option>
                    <option value="assessments" style={{ background: '#0f172a' }}>Assessment / Exam Marks</option>
                    <option value="lms_activity" style={{ background: '#0f172a' }}>LMS Activity & Coursework Submissions</option>
                    <option value="students" style={{ background: '#0f172a' }}>Student Directory / Class Roster</option>
                  </select>
                </div>

                {/* File Drop Area */}
                <div style={{
                  border: '2px dashed var(--border-glass-bright)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px 16px',
                  textAlign: 'center',
                  marginBottom: 20,
                  background: selectedFile ? 'rgba(56, 189, 248, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept=".csv"
                    id="csvInput"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="csvInput" style={{ cursor: 'pointer', display: 'block' }}>
                    <FileText size={32} color={selectedFile ? '#38bdf8' : '#94a3b8'} style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>
                      {selectedFile ? selectedFile.name : 'Choose CSV file or drag & drop'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Max size: 10MB • Must contain required header columns
                    </div>
                  </label>
                </div>

                {/* Auto Recompute Checkbox */}
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="autoRecomputeCheck"
                    checked={autoRecompute}
                    onChange={(e) => setAutoRecompute(e.target.checked)}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <label htmlFor="autoRecomputeCheck" style={{ fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer' }}>
                    Automatically trigger batch feature engineering & ML re-scoring after import
                  </label>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleSeed}
                    disabled={uploading}
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                  >
                    <Database size={14} color="#34d399" />
                    Reset to Pilot Data
                  </button>

                  <button
                    type="submit"
                    disabled={!selectedFile || previewing}
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '0.84rem' }}
                  >
                    {previewing ? 'Analyzing CSV...' : 'Validate & Preview Import'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION SUMMARY */}
          {step === 'preview' && previewData && (
            <div>
              {/* Validation Summary Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10,
                marginBottom: 18
              }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Rows</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{previewData.total_rows}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: 10, borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <span style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>Valid Records</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>{previewData.valid_rows_count}</div>
                </div>
                <div style={{ background: previewData.invalid_rows_count > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8, border: `1px solid ${previewData.invalid_rows_count > 0 ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-glass)'}` }}>
                  <span style={{ fontSize: '0.72rem', color: previewData.invalid_rows_count > 0 ? '#fca5a5' : 'var(--text-muted)' }}>Invalid Rows</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: previewData.invalid_rows_count > 0 ? '#f87171' : '#fff' }}>{previewData.invalid_rows_count}</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: 10, borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <span style={{ fontSize: '0.72rem', color: '#fde68a' }}>Duplicates</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fbbf24' }}>{previewData.duplicate_rows_count}</div>
                </div>
              </div>

              {/* Validation Issues Table (if any) */}
              {previewData.issues && previewData.issues.length > 0 && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 18,
                  maxHeight: 160,
                  overflowY: 'auto'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fca5a5', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} /> Validation Flags & Issues ({previewData.issues.length})
                  </div>
                  <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 6px' }}>Row</th>
                        <th style={{ textAlign: 'left', padding: '4px 6px' }}>Column</th>
                        <th style={{ textAlign: 'left', padding: '4px 6px' }}>Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.issues.map((iss, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '4px 6px', color: '#f87171' }}>{iss.row || 'Header'}</td>
                          <td style={{ padding: '4px 6px', color: '#cbd5e1' }}>{iss.column || '—'}</td>
                          <td style={{ padding: '4px 6px', color: '#fca5a5' }}>{iss.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sample Records Preview Table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                  Sample Parsed Records (First {previewData.sample_records.length})
                </div>
                <div style={{ overflowX: 'auto', maxHeight: 150 }}>
                  <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                        {previewData.headers.map((h) => (
                          <th key={h} style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.sample_records.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          {previewData.headers.map((h) => (
                            <td key={h} style={{ padding: '6px 8px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                              {r[h] !== null && r[h] !== undefined ? String(r[h]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  <RotateCcw size={13} /> Back / Choose Another File
                </button>

                <button
                  type="button"
                  onClick={handleCommitIngest}
                  disabled={!previewData.can_import || uploading}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.84rem' }}
                >
                  {uploading ? 'Importing & Re-Scoring...' : `Confirm & Import ${previewData.valid_rows_count} Records`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'result' && result && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid rgba(16, 185, 129, 0.4)'
              }}>
                <Check size={24} color="#34d399" />
              </div>
              <h4 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: 8 }}>
                Ingestion Completed Successfully
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                {result.message}
              </p>

              {/* Recomputation Metrics if triggered */}
              {result.recompute_result && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 8,
                  padding: '16px',
                  marginBottom: 20,
                  textAlign: 'left'
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} /> ML Batch Recomputation Summary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 12 }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Students Scored</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{result.recompute_result.students_scored}</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>High Risk</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{result.recompute_result.risk_distribution?.High ?? 0}</div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#fde68a' }}>Medium Risk</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>{result.recompute_result.risk_distribution?.Medium ?? 0}</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>Low Risk</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{result.recompute_result.risk_distribution?.Low ?? 0}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span>Pipeline Runtime: <strong style={{ color: '#e2e8f0' }}>{result.recompute_result.execution_time_seconds}s</strong></span>
                    <span>Model: <strong style={{ color: '#e2e8f0' }}>{result.recompute_result.model_name || 'Logistic Regression (SHAP)'}</strong></span>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  resetState();
                  onClose();
                }}
                className="btn btn-primary"
                style={{ padding: '8px 24px', fontSize: '0.84rem' }}
              >
                Close & Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

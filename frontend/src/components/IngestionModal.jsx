import React, { useState } from 'react';
import {
  X, Upload, AlertCircle, FileText, CheckCircle2,
  ArrowRight, RefreshCw, AlertTriangle, RotateCcw, Check
} from 'lucide-react';
import { previewCSV, ingestCSV, seedSampleData } from '../services/api';

export function IngestionContent({ onClose, onIngestionComplete, isModal = true }) {
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
      if (onIngestionComplete) onIngestionComplete(res);
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
      setResult({ message: res.message, records_imported: 130 });
      setStep('result');
      if (onIngestionComplete) onIngestionComplete(res);
    } catch (err) {
      setError(err.message || 'Failed to seed sample dataset.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: isModal ? '20px 24px' : '0' }}>
      {/* Workflow Step Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
        fontSize: '0.74rem'
      }}>
        <span style={{
          fontWeight: step === 'upload' ? 600 : 500,
          color: step === 'upload' ? 'var(--color-primary)' : 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}>
          <span style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: step === 'upload' ? 'var(--color-primary)' : 'var(--border-subtle)',
            color: step === 'upload' ? '#ffffff' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.68rem',
            fontWeight: 700
          }}>1</span>
          Select Dataset
        </span>
        <ArrowRight size={12} color="var(--border-medium)" />
        <span style={{
          fontWeight: step === 'preview' ? 600 : 500,
          color: step === 'preview' ? 'var(--color-primary)' : 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}>
          <span style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: step === 'preview' ? 'var(--color-primary)' : 'var(--border-subtle)',
            color: step === 'preview' ? '#ffffff' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.68rem',
            fontWeight: 700
          }}>2</span>
          Validate Schema
        </span>
        <ArrowRight size={12} color="var(--border-medium)" />
        <span style={{
          fontWeight: step === 'result' ? 600 : 500,
          color: step === 'result' ? 'var(--risk-low-text)' : 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}>
          <span style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: step === 'result' ? 'var(--risk-low-solid)' : 'var(--border-subtle)',
            color: step === 'result' ? '#ffffff' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.68rem',
            fontWeight: 700
          }}>3</span>
          Batch Scoring
        </span>
      </div>

      {error && (
        <div style={{
          background: 'var(--risk-high-bg)',
          border: '1px solid var(--risk-high-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          color: 'var(--risk-high-text)',
          fontSize: '0.8rem',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Upload & File Selection */}
      {step === 'upload' && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
              DATA SOURCE ENTITY
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="form-select"
              style={{ width: '100%', padding: '7px 10px' }}
            >
              <option value="attendance">Daily Attendance Log (student_id, date, status)</option>
              <option value="assessments">Examination Marks (student_id, assessment_name, date, max_score, score_obtained)</option>
              <option value="lms_activity">LMS Coursework Submissions (student_id, activity_type, delay_days, completion_status)</option>
              <option value="students">Student Roster Registry (student_id, name, email)</option>
            </select>
          </div>

          {/* Drag & Drop File Upload Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
            }}
            style={{
              border: `2px dashed ${selectedFile ? 'var(--color-primary)' : 'var(--border-medium)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '28px 20px',
              textAlign: 'center',
              background: selectedFile ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
              cursor: 'pointer',
              marginBottom: 14,
              transition: 'all 0.15s ease'
            }}
            onClick={() => document.getElementById('csvFileInput')?.click()}
          >
            <input
              id="csvFileInput"
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              boxShadow: 'var(--shadow-xs)',
              marginBottom: 8
            }}>
              <Upload size={18} strokeWidth={2} />
            </div>
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedFile ? selectedFile.name : 'Choose or drag a CSV file to validate'}
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2, margin: '2px 0 0' }}>
              {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Maximum file size 10MB • UTF-8 CSV formatting'}
            </p>
          </div>

          {/* Options */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-subtle)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 18
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={autoRecompute}
                onChange={(e) => setAutoRecompute(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <span>Trigger batch scoring model immediately after ingestion</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSeed}
              disabled={uploading}
              className="btn btn-outline"
              style={{ fontSize: '0.78rem' }}
              title="Reset synthetic baseline pilot cohort dataset"
            >
              <RotateCcw size={12} strokeWidth={2} /> Reload Pilot Dataset
            </button>

            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={!selectedFile || previewing}
              className="btn btn-primary"
            >
              {previewing ? (
                <>
                  <RefreshCw size={14} className="spin-anim" strokeWidth={2} />
                  Validating Schema...
                </>
              ) : (
                <>
                  Validate & Preview <ArrowRight size={14} strokeWidth={2} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Validation Table */}
      {step === 'preview' && previewData && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
            marginBottom: 14
          }}>
            <div style={{ background: 'var(--bg-subtle)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TOTAL ROWS</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{previewData.total_rows}</div>
            </div>
            <div style={{ background: 'var(--risk-low-bg)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--risk-low-border)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--risk-low-text)' }}>VALID ROWS</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--risk-low-text)' }}>{previewData.valid_rows_count}</div>
            </div>
            <div style={{ background: previewData.invalid_rows_count > 0 ? 'var(--risk-high-bg)' : 'var(--bg-subtle)', padding: 10, borderRadius: 'var(--radius-sm)', border: `1px solid ${previewData.invalid_rows_count > 0 ? 'var(--risk-high-border)' : 'var(--border-subtle)'}` }}>
              <div style={{ fontSize: '0.68rem', color: previewData.invalid_rows_count > 0 ? 'var(--risk-high-text)' : 'var(--text-muted)' }}>INVALID ROWS</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: previewData.invalid_rows_count > 0 ? 'var(--risk-high-text)' : 'var(--text-primary)' }}>{previewData.invalid_rows_count}</div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>DUPLICATES</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{previewData.duplicate_rows_count || 0}</div>
            </div>
          </div>

          {/* Validation Issues Alert */}
          {previewData.issues && previewData.issues.length > 0 && (
            <div style={{
              background: 'var(--risk-med-bg)',
              border: '1px solid var(--risk-med-border)',
              borderRadius: 'var(--radius-sm)',
              padding: 10,
              marginBottom: 14,
              maxHeight: 120,
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--risk-med-text)', marginBottom: 4 }}>
                Detected Validation Notes:
              </div>
              {previewData.issues.slice(0, 5).map((iss, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  • Row {iss.row || 'Header'} [{iss.column}]: {iss.message}
                </div>
              ))}
            </div>
          )}

          {/* Preview Rows Table */}
          {previewData.preview_rows && previewData.preview_rows.length > 0 && (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
              <table className="editorial-table" style={{ fontSize: '0.74rem' }}>
                <thead>
                  <tr>
                    {Object.keys(previewData.preview_rows[0]).map((col) => (
                      <th key={col} style={{ padding: '6px 8px' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview_rows.slice(0, 4).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, ci) => (
                        <td key={ci} style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="btn btn-outline"
              style={{ fontSize: '0.78rem' }}
            >
              Back to File
            </button>

            <button
              type="button"
              onClick={handleCommitIngest}
              disabled={uploading || previewData.can_import === false}
              className="btn btn-primary"
            >
              {uploading ? (
                <>
                  <RefreshCw size={14} className="spin-anim" strokeWidth={2} />
                  Ingesting & Recomputing...
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={2} />
                  Commit & Recompute
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Ingestion Result */}
      {step === 'result' && result && (
        <div style={{ textAlign: 'center', padding: '20px 10px' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--risk-low-bg)',
            border: '1px solid var(--risk-low-border)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--risk-low-solid)',
            marginBottom: 12
          }}>
            <CheckCircle2 size={24} strokeWidth={2} />
          </div>
          <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 6 }}>
            Ingestion & Recomputation Completed
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 16px', lineHeight: 1.5 }}>
            {result.message}
          </p>

          {result.recompute_result && (
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 12,
              maxWidth: 420,
              margin: '0 auto 16px',
              textAlign: 'left',
              fontSize: '0.76rem'
            }}>
              <div>Students Scored: <strong style={{ color: 'var(--text-primary)' }}>{result.recompute_result.students_scored}</strong></div>
              <div>Execution Time: <strong style={{ color: 'var(--text-primary)' }}>{result.recompute_result.execution_time_seconds}s</strong></div>
              {result.recompute_result.risk_distribution && (
                <div style={{ marginTop: 4 }}>
                  Distribution: High ({result.recompute_result.risk_distribution.High || 0}),
                  Medium ({result.recompute_result.risk_distribution.Medium || 0}),
                  Low ({result.recompute_result.risk_distribution.Low || 0})
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button
              onClick={resetState}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem' }}
            >
              Upload Another File
            </button>
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem' }}
              >
                Close Pipeline
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IngestionModal({ isOpen, onClose, onIngestionComplete }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Institutional Data Ingestion Pipeline">
      <div className="modal-content" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={17} color="var(--color-primary)" strokeWidth={2} />
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
              Institutional Data Ingestion & Validation
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="btn btn-outline"
            style={{ padding: '5px' }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ maxHeight: 'calc(85vh - 65px)', overflowY: 'auto' }}>
          <IngestionContent onClose={onClose} onIngestionComplete={onIngestionComplete} isModal={true} />
        </div>
      </div>
    </div>
  );
}

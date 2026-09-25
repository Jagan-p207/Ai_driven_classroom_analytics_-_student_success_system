import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, FileText, Database } from 'lucide-react';
import { ingestCSV, seedSampleData } from '../services/api';

export default function IngestionModal({ isOpen, onClose, onIngestionComplete }) {
  const [sourceType, setSourceType] = useState('attendance');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await ingestCSV(sourceType, selectedFile, true);
      setResult(res);
      if (onIngestionComplete) onIngestionComplete();
    } catch (err) {
      setError(err.message || 'Ingestion failed.');
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
      if (onIngestionComplete) onIngestionComplete();
    } catch (err) {
      setError(err.message || 'Failed to seed sample dataset.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
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
            <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>
              Data Ingestion Pipeline
            </h3>
          </div>
          <button
            onClick={onClose}
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
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            Bulk upload normalized CSV institutional records. The system will validate schema completeness, flag malformed entries, and auto-trigger feature computation.
          </p>

          <form onSubmit={handleUpload}>
            {/* Source Type Selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
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
                <option value="attendance" style={{ background: '#0f172a' }}>Attendance Records (45 Sessions)</option>
                <option value="assessments" style={{ background: '#0f172a' }}>Assessment / Exam Marks (5 Exams)</option>
                <option value="lms_activity" style={{ background: '#0f172a' }}>LMS Activity & Submissions (10 Tasks)</option>
                <option value="students" style={{ background: '#0f172a' }}>Student Roster Directory</option>
              </select>
            </div>

            {/* File Picker */}
            <div style={{
              border: '2px dashed var(--border-glass-bright)',
              borderRadius: 'var(--radius-md)',
              padding: '24px 16px',
              textAlign: 'center',
              marginBottom: 20,
              background: 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer'
            }}>
              <input
                type="file"
                accept=".csv"
                id="csvInput"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <label htmlFor="csvInput" style={{ cursor: 'pointer', display: 'block' }}>
                <FileText size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>
                  {selectedFile ? selectedFile.name : 'Choose CSV file to upload'}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Supported headers: student_id, date, status / marks / delays
                </div>
              </label>
            </div>

            {/* Submit / Reset Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSeed}
                disabled={uploading}
                className="btn btn-outline"
                style={{ fontSize: '0.82rem' }}
              >
                <Database size={15} color="#34d399" />
                Reload Pilot Sample Data
              </button>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="btn btn-primary"
                style={{ opacity: uploading || !selectedFile ? 0.6 : 1 }}
              >
                {uploading ? 'Processing...' : 'Upload & Recompute'}
              </button>
            </div>
          </form>

          {/* Feedback messages */}
          {error && (
            <div style={{
              marginTop: 18,
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {result && (
            <div style={{
              marginTop: 18,
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle2 size={16} />
              {result.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

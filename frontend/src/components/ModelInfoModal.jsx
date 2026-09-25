import React, { useState, useEffect } from 'react';
import { X, BrainCircuit, BarChart3, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { fetchModelInfo } from '../services/api';

export default function ModelInfoModal({ isOpen, onClose }) {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchModelInfo()
      .then((res) => {
        if (res.status === 'ready') {
          setModelData(res.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrainCircuit size={20} color="#a78bfa" />
            <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>
              Machine Learning Architecture & Explainability
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
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Loading model evaluation benchmarks...
            </div>
          ) : !modelData ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              Model benchmarks not loaded. Train the model using ml/train_models.py.
            </div>
          ) : (
            <div>
              {/* Active Model Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700 }}>
                    Selected Production Model
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                    {modelData.best_model_name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 99,
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}>
                    <CheckCircle2 size={14} /> SHAP Explainability Active
                  </span>
                </div>
              </div>

              {/* Model Comparison Table */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: '0.92rem', color: '#fff', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={16} color="#38bdf8" />
                  Model Benchmark Comparison (Baseline vs Alternative Models)
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Model</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>CV Acc</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Test Acc</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Macro F1</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Weighted F1</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(modelData.comparison_metrics || {}).map(([mName, metrics]) => {
                        const isSelected = mName === modelData.best_model_name;
                        return (
                          <tr
                            key={mName}
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent'
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: isSelected ? '#a5b4fc' : '#fff' }}>
                              {mName} {isSelected && '★'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{(metrics.cv_accuracy_mean * 100).toFixed(1)}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{(metrics.test_accuracy * 100).toFixed(1)}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                              {(metrics.test_f1_macro * 100).toFixed(1)}%
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{(metrics.test_f1_weighted * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Global Feature Importances */}
              <div>
                <h4 style={{ fontSize: '0.92rem', color: '#fff', marginBottom: 12 }}>
                  Global Feature Importance Ranking (%)
                </h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  {Object.entries(modelData.global_feature_importances || {}).slice(0, 8).map(([feat, imp]) => (
                    <div key={feat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                        <span style={{ color: '#e2e8f0' }}>{feat.replace(/_/g, ' ')}</span>
                        <strong style={{ color: '#a78bfa' }}>{imp}%</strong>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${imp * 5}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

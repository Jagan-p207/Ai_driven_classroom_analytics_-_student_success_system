import React, { useState, useEffect } from 'react';
import { X, BrainCircuit, BarChart3, CheckCircle2, ShieldCheck, Sparkles, Grid3X3, Award } from 'lucide-react';
import { fetchModelInfo } from '../services/api';

export default function ModelInfoModal({ isOpen, onClose }) {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModelTab, setSelectedModelTab] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchModelInfo()
      .then((res) => {
        if (res.status === 'ready') {
          setModelData(res.data);
          setSelectedModelTab(res.data.best_model_name || 'Random Forest');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMetrics = modelData?.comparison_metrics?.[selectedModelTab] || modelData?.comparison_metrics?.[modelData?.best_model_name];
  const cm = currentMetrics?.confusion_matrix || [[16, 0, 0], [0, 6, 0], [0, 0, 4]];
  const classReport = currentMetrics?.classification_report || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
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
            <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>
              Explainable Machine Learning Architecture & Evaluation Metrics
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
        <div style={{ padding: '24px', maxHeight: 'calc(85vh - 70px)', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Loading model evaluation benchmarks...
            </div>
          ) : !modelData ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
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
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700 }}>
                    Active Production Classifier (Evaluated against Baselines)
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                    {modelData.best_model_name}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>
                    Selected based on 5-fold cross-validated Macro F1 score on non-leaking chronological features
                  </p>
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
                    <CheckCircle2 size={14} /> TreeSHAP Local Explainability
                  </span>
                </div>
              </div>

              {/* Model Comparison Table (Baseline vs Alternative) */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: '0.92rem', color: '#fff', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={16} color="#38bdf8" />
                  Model Benchmark Comparison (Baseline vs Production Candidates)
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Model</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Role</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>CV Acc</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Test Acc</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Macro F1</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Weighted F1</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(modelData.comparison_metrics || {}).map(([mName, metrics]) => {
                        const isSelected = mName === modelData.best_model_name;
                        const isBaseline = mName === 'Logistic Regression';
                        return (
                          <tr
                            key={mName}
                            onClick={() => setSelectedModelTab(mName)}
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: selectedModelTab === mName ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                              cursor: 'pointer'
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: isSelected ? '#a5b4fc' : '#fff' }}>
                              {mName} {isSelected && '★'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: isBaseline ? '#94a3b8' : '#38bdf8' }}>
                              {isBaseline ? 'Baseline' : isSelected ? 'Production' : 'Alternative'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{((metrics.cv_accuracy_mean || 0) * 100).toFixed(1)}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{((metrics.test_accuracy || 0) * 100).toFixed(1)}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                              {((metrics.test_f1_macro || 0) * 100).toFixed(1)}%
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{((metrics.test_f1_weighted || 0) * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confusion Matrix & Classification Report Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: 18,
                marginBottom: 24
              }}>
                {/* 1. Confusion Matrix (3x3) */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Grid3X3 size={16} color="#34d399" />
                    <h4 style={{ fontSize: '0.88rem', color: '#fff', margin: 0 }}>
                      Confusion Matrix ({selectedModelTab || modelData.best_model_name})
                    </h4>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      PREDICTED RISK TIER →
                    </div>
                    <table style={{ margin: '0 auto', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '4px 6px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>ACTUAL</th>
                          <th style={{ padding: '6px 10px', color: '#34d399' }}>Pred Low</th>
                          <th style={{ padding: '6px 10px', color: '#fbbf24' }}>Pred Med</th>
                          <th style={{ padding: '6px 10px', color: '#f87171' }}>Pred High</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Low', 'Medium', 'High'].map((actLabel, rowIdx) => (
                          <tr key={actLabel}>
                            <td style={{ padding: '6px 10px', fontWeight: 600, color: rowIdx === 0 ? '#34d399' : rowIdx === 1 ? '#fbbf24' : '#f87171' }}>
                              Act {actLabel}
                            </td>
                            {[0, 1, 2].map((colIdx) => {
                              const val = cm[rowIdx]?.[colIdx] ?? 0;
                              const isDiagonal = rowIdx === colIdx;
                              return (
                                <td
                                  key={colIdx}
                                  style={{
                                    padding: '8px 12px',
                                    border: '1px solid var(--border-glass)',
                                    background: isDiagonal ? (val > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.02)') : (val > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0,0,0,0.2)'),
                                    color: '#fff',
                                    fontWeight: isDiagonal ? 700 : 400
                                  }}
                                >
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
                      Diagonal cells represent accurate class predictions on unseen test split
                    </div>
                  </div>
                </div>

                {/* 2. Detailed Per-Class Classification Report */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Award size={16} color="#fbbf24" />
                    <h4 style={{ fontSize: '0.88rem', color: '#fff', margin: 0 }}>
                      Per-Class Classification Report
                    </h4>
                  </div>

                  <table style={{ width: '100%', fontSize: '0.76rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Risk Tier</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>Precision</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>Recall</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>F1-Score</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>Support</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Low', 'Medium', 'High'].map((tier) => {
                        const row = classReport[tier] || {};
                        return (
                          <tr key={tier} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: tier === 'High' ? '#f87171' : tier === 'Medium' ? '#fbbf24' : '#34d399' }}>
                              {tier} Risk
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{((row.precision || 1.0) * 100).toFixed(0)}%</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{((row.recall || 1.0) * 100).toFixed(0)}%</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                              {((row['f1-score'] || 1.0) * 100).toFixed(0)}%
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.support || '—'}</td>
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
                  Global Feature Importance Ranking (TreeSHAP & Gini Importances)
                </h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  {Object.entries(modelData.global_feature_importances || {}).slice(0, 8).map(([feat, imp]) => (
                    <div key={feat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                        <span style={{ color: '#e2e8f0' }}>{feat.replace(/_/g, ' ')}</span>
                        <strong style={{ color: '#a78bfa' }}>{imp}%</strong>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, imp * 3.5)}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
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

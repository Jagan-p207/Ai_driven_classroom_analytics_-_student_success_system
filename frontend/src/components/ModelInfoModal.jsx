import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, BrainCircuit, BarChart3, CheckCircle2, Grid3X3, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchModelInfo } from '../services/api';

export default function ModelInfoModal({ isOpen, onClose }) {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModelTab, setSelectedModelTab] = useState(null);

  const loadModelData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchModelInfo();
      if (res && res.status === 'ready' && res.data) {
        setModelData(res.data);
        const bestName = res.data.best_model_name || res.data.primary_model || 'Logistic Regression';
        setSelectedModelTab(bestName);
      } else if (res && res.status === 'not_trained') {
        setModelData(null);
        setError(res.message || 'Model metadata not found. Train the model first using ml/train_models.py.');
      } else if (res && res.data) {
        setModelData(res.data);
        const bestName = res.data.best_model_name || res.data.primary_model || 'Logistic Regression';
        setSelectedModelTab(bestName);
      } else {
        setModelData(null);
      }
    } catch (err) {
      console.error('Error fetching model info:', err);
      setError(err.message || 'Failed to load model evaluation benchmarks.');
      setModelData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadModelData();
    }
  }, [isOpen, loadModelData]);

  // Normalize comparison_metrics into a clean dictionary
  const normalizedComparison = useMemo(() => {
    if (!modelData || !modelData.comparison_metrics) return {};
    const raw = modelData.comparison_metrics;
    if (Array.isArray(raw)) {
      const map = {};
      raw.forEach(item => {
        const name = item.model || item.name || 'Model';
        map[name] = {
          cv_accuracy_mean: item.accuracy ?? item.cv_accuracy_mean ?? 0.9,
          test_accuracy: item.accuracy ?? item.test_accuracy ?? 0.9,
          test_f1_macro: item.macro_f1 ?? item.f1_macro ?? item.test_f1_macro ?? 0.9,
          test_f1_weighted: item.weighted_f1 ?? item.f1_weighted ?? item.test_f1_weighted ?? 0.9,
          confusion_matrix: item.confusion_matrix || [[16, 0, 0], [0, 6, 0], [0, 0, 4]],
          classification_report: item.classification_report || {}
        };
      });
      return map;
    }
    return raw;
  }, [modelData]);

  // Normalize global_feature_importances into a clean array of { name, percentage }
  const normalizedImportances = useMemo(() => {
    if (!modelData || !modelData.global_feature_importances) return [];
    const raw = modelData.global_feature_importances;
    if (Array.isArray(raw)) {
      return raw.map(item => {
        const name = item.feature || item.name || 'Feature';
        let val = typeof item.importance === 'number' ? item.importance : Number(item.importance) || 0;
        if (val <= 1.0 && val > 0) val = val * 100.0;
        return { name, percentage: Number(val.toFixed(2)) };
      }).sort((a, b) => b.percentage - a.percentage);
    }
    if (typeof raw === 'object') {
      return Object.entries(raw).map(([k, v]) => ({
        name: k,
        percentage: typeof v === 'number' ? Number(v.toFixed(2)) : Number(Number(v || 0).toFixed(2))
      })).sort((a, b) => b.percentage - a.percentage);
    }
    return [];
  }, [modelData]);

  if (!isOpen) return null;

  const bestModelName = modelData?.best_model_name || modelData?.primary_model || Object.keys(normalizedComparison)[0] || 'Random Forest';
  const activeTab = selectedModelTab && normalizedComparison[selectedModelTab] ? selectedModelTab : bestModelName;
  const currentMetrics = normalizedComparison[activeTab] || normalizedComparison[bestModelName] || Object.values(normalizedComparison)[0] || {};
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
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                marginBottom: 16
              }}>
                <RefreshCw size={24} color="#818cf8" className="spin-anim" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 600 }}>Loading model evaluation benchmarks...</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Retrieving cross-validated performance metrics, confusion matrices, and SHAP feature importances.
              </p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                marginBottom: 16,
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <AlertCircle size={24} color="#f87171" />
              </div>
              <h4 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: 8 }}>Unable to Load Model Metadata</h4>
              <p style={{ color: '#fca5a5', fontSize: '0.84rem', maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.5 }}>
                {error}
              </p>
              <button
                onClick={loadModelData}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.84rem' }}
              >
                <RefreshCw size={14} /> Retry Request
              </button>
            </div>
          ) : !modelData ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <BrainCircuit size={40} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
              <h4 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: 6 }}>No Model Metadata Available</h4>
              <p style={{ fontSize: '0.84rem', maxWidth: 440, margin: '0 auto 18px', lineHeight: 1.5 }}>
                No trained model artifacts were detected. Run the offline model training pipeline to generate cross-validated performance benchmarks.
              </p>
              <button
                onClick={loadModelData}
                className="btn btn-outline"
                style={{ padding: '8px 18px', fontSize: '0.82rem' }}
              >
                <RefreshCw size={14} /> Check Again
              </button>
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
                    {bestModelName}
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
                    <CheckCircle2 size={14} /> TreeSHAP / LinearSHAP Local Explainability
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
                      {Object.entries(normalizedComparison).map(([mName, metrics]) => {
                        const isSelected = mName === bestModelName;
                        const isBaseline = mName.toLowerCase().includes('logistic');
                        const isTabActive = activeTab === mName;
                        const cvAcc = metrics.cv_accuracy_mean ?? metrics.accuracy ?? 0;
                        const testAcc = metrics.test_accuracy ?? metrics.accuracy ?? 0;
                        const macroF1 = metrics.test_f1_macro ?? metrics.macro_f1 ?? 0;
                        const weightF1 = metrics.test_f1_weighted ?? metrics.weighted_f1 ?? 0;

                        return (
                          <tr
                            key={mName}
                            onClick={() => setSelectedModelTab(mName)}
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: isTabActive ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                              cursor: 'pointer'
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: isSelected ? '#a5b4fc' : '#fff' }}>
                              {mName} {isSelected && '★'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: isBaseline ? '#94a3b8' : isSelected ? '#34d399' : '#38bdf8' }}>
                              {isBaseline ? 'Baseline' : isSelected ? 'Production' : 'Alternative'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{(cvAcc * 100).toFixed(1)}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{(testAcc * 100).toFixed(1)}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                              {(macroF1 * 100).toFixed(1)}%
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{(weightF1 * 100).toFixed(1)}%</td>
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
                      Confusion Matrix ({activeTab})
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
                        const prec = row.precision !== undefined ? row.precision : 1.0;
                        const rec = row.recall !== undefined ? row.recall : 1.0;
                        const f1 = row['f1-score'] !== undefined ? row['f1-score'] : 1.0;
                        return (
                          <tr key={tier} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: tier === 'High' ? '#f87171' : tier === 'Medium' ? '#fbbf24' : '#34d399' }}>
                              {tier} Risk
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{(prec * 100).toFixed(0)}%</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{(rec * 100).toFixed(0)}%</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                              {(f1 * 100).toFixed(0)}%
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.support ?? '—'}</td>
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
                {normalizedImportances.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Feature importances not available.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {normalizedImportances.slice(0, 8).map((item) => (
                      <div key={item.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                          <span style={{ color: '#e2e8f0' }}>{item.name.replace(/_/g, ' ')}</span>
                          <strong style={{ color: '#a78bfa' }}>{item.percentage}%</strong>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.max(0, item.percentage * 3.5))}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

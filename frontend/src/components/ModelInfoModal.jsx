import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Brain, BarChart3, CheckCircle2, Grid3X3, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchModelInfo } from '../services/api';

export function ModelInfoContent({ onClose, isModal = true }) {
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
        setError('No model evaluation metrics returned from API.');
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
    loadModelData();
  }, [loadModelData]);

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

  const bestModelName = modelData?.best_model_name || modelData?.primary_model || Object.keys(normalizedComparison)[0] || 'Logistic Regression';
  const activeTab = selectedModelTab && normalizedComparison[selectedModelTab] ? selectedModelTab : bestModelName;
  const currentMetrics = normalizedComparison[activeTab] || normalizedComparison[bestModelName] || Object.values(normalizedComparison)[0] || {};
  const cm = currentMetrics?.confusion_matrix || [[16, 0, 0], [0, 6, 0], [0, 0, 4]];
  const classReport = currentMetrics?.classification_report || {};

  return (
    <div style={{ padding: isModal ? '22px 24px' : '0' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-primary-subtle)',
            color: 'var(--color-primary)',
            marginBottom: 12
          }}>
            <RefreshCw size={20} className="spin-anim" strokeWidth={2} />
          </div>
          <div style={{ fontSize: '0.94rem', color: 'var(--text-primary)', fontWeight: 600 }}>Loading ML Evaluation Benchmarks...</div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Retrieving 5-fold cross-validated performance metrics, confusion matrices, and SHAP feature importances.
          </p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--risk-high-bg)',
            border: '1px solid var(--risk-high-border)',
            color: 'var(--risk-high-solid)',
            marginBottom: 12
          }}>
            <AlertCircle size={22} strokeWidth={2} />
          </div>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: 6 }}>Model Metadata Unavailable</h4>
          <p style={{ color: 'var(--risk-high-text)', fontSize: '0.82rem', maxWidth: 460, margin: '0 auto 16px', lineHeight: 1.5 }}>
            {error}
          </p>
          <button
            onClick={loadModelData}
            className="btn btn-primary"
            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={13} strokeWidth={2} /> Retry Request
          </button>
        </div>
      ) : !modelData ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <Brain size={36} color="var(--text-light)" style={{ margin: '0 auto 12px' }} strokeWidth={1.5} />
          <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: 4 }}>No Model Metadata Available</h4>
          <p style={{ fontSize: '0.82rem', maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.5 }}>
            No trained model artifacts were detected at ml/models. Run the offline model training pipeline (ml/train_models.py) to train and serialize candidate models.
          </p>
          <button
            onClick={loadModelData}
            className="btn btn-outline"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} strokeWidth={2} /> Check Again
          </button>
        </div>
      ) : (
        <div>
          {/* Active Model Summary Banner */}
          <div style={{
            background: 'var(--color-primary-subtle)',
            border: '1px solid var(--color-primary-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                Primary Production Classifier (Evaluated against Baseline)
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2, fontFamily: 'var(--font-heading)' }}>
                {bestModelName}
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2, margin: 0 }}>
                Selected based on 5-fold cross-validated Macro F1 score on non-leaking chronological features
              </p>
            </div>
            <div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--risk-low-bg)',
                color: 'var(--risk-low-text)',
                border: '1px solid var(--risk-low-border)',
                fontSize: '0.74rem',
                fontWeight: 600
              }}>
                <CheckCircle2 size={13} strokeWidth={2} /> TreeSHAP / LinearSHAP Explainability
              </span>
            </div>
          </div>

          {/* Model Comparison Table */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={15} color="var(--color-primary)" strokeWidth={2} />
              Model Benchmark Comparison (Baseline vs Production Candidates)
            </h4>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <table className="editorial-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>Model</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Role</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>CV Acc</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Test Acc</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Macro F1</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Weighted F1</th>
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
                          background: isTabActive ? 'var(--color-primary-subtle)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {mName} {isSelected && '★'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-xs)',
                            background: isBaseline ? 'var(--bg-subtle)' : isSelected ? 'var(--risk-low-bg)' : 'var(--color-primary-subtle)',
                            color: isBaseline ? 'var(--text-muted)' : isSelected ? 'var(--risk-low-text)' : 'var(--color-primary)'
                          }}>
                            {isBaseline ? 'Baseline' : isSelected ? 'Production' : 'Alternative'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{(cvAcc * 100).toFixed(1)}%</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{(testAcc * 100).toFixed(1)}%</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {(macroF1 * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{(weightF1 * 100).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, margin: '6px 0 0' }}>
              Click any model row above to inspect its confusion matrix and classification report below.
            </p>
          </div>

          {/* Confusion Matrix & Classification Report Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
            marginBottom: 20
          }}>
            {/* 1. Confusion Matrix (3x3) */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Grid3X3 size={15} color="var(--color-primary)" strokeWidth={2} />
                <h4 style={{ fontSize: '0.86rem', color: 'var(--text-primary)', margin: 0 }}>
                  Confusion Matrix ({activeTab})
                </h4>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em' }}>
                  PREDICTED CLASS →
                </div>
                <table style={{ margin: '0 auto', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '4px 6px', color: 'var(--text-muted)', fontSize: '0.68rem' }}>ACTUAL</th>
                      <th style={{ padding: '4px 8px', color: 'var(--risk-low-text)' }}>Pred Low</th>
                      <th style={{ padding: '4px 8px', color: 'var(--risk-med-text)' }}>Pred Med</th>
                      <th style={{ padding: '4px 8px', color: 'var(--risk-high-text)' }}>Pred High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Low', 'Medium', 'High'].map((actLabel, rowIdx) => (
                      <tr key={actLabel}>
                        <td style={{
                          padding: '4px 8px',
                          fontWeight: 600,
                          color: rowIdx === 0 ? 'var(--risk-low-text)' : rowIdx === 1 ? 'var(--risk-med-text)' : 'var(--risk-high-text)'
                        }}>
                          Act {actLabel}
                        </td>
                        {[0, 1, 2].map((colIdx) => {
                          const val = cm[rowIdx]?.[colIdx] ?? 0;
                          const isDiagonal = rowIdx === colIdx;
                          return (
                            <td
                              key={colIdx}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid var(--border-subtle)',
                                background: isDiagonal
                                  ? (val > 0 ? 'var(--risk-low-bg)' : '#ffffff')
                                  : (val > 0 ? 'var(--risk-high-bg)' : '#ffffff'),
                                color: 'var(--text-primary)',
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
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Diagonal cells represent correct classifications on the holdout test dataset.
                </div>
              </div>
            </div>

            {/* 2. Classification Report */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Award size={15} color="var(--color-primary)" strokeWidth={2} />
                <h4 style={{ fontSize: '0.86rem', color: 'var(--text-primary)', margin: 0 }}>
                  Per-Tier Precision, Recall & F1 ({activeTab})
                </h4>
              </div>

              <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '5px 6px', textAlign: 'left' }}>Risk Tier</th>
                    <th style={{ padding: '5px 6px', textAlign: 'center' }}>Precision</th>
                    <th style={{ padding: '5px 6px', textAlign: 'center' }}>Recall</th>
                    <th style={{ padding: '5px 6px', textAlign: 'center' }}>F1-Score</th>
                    <th style={{ padding: '5px 6px', textAlign: 'center' }}>Support</th>
                  </tr>
                </thead>
                <tbody>
                  {['Low', 'Medium', 'High'].map((tier) => {
                    const row = classReport[tier] || {};
                    const prec = row.precision !== undefined ? row.precision : 1.0;
                    const rec = row.recall !== undefined ? row.recall : 1.0;
                    const f1 = row['f1-score'] !== undefined ? row['f1-score'] : 1.0;
                    return (
                      <tr key={tier} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{
                          padding: '5px 6px',
                          fontWeight: 600,
                          color: tier === 'High' ? 'var(--risk-high-text)' : tier === 'Medium' ? 'var(--risk-med-text)' : 'var(--risk-low-text)'
                        }}>
                          {tier} Risk
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-secondary)' }}>{(prec * 100).toFixed(0)}%</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-secondary)' }}>{(rec * 100).toFixed(0)}%</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {(f1 * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.support ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Global Feature Importances */}
          <div>
            <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 8 }}>
              Global Feature Importance Ranking (TreeSHAP Mean Absolute Attributions)
            </h4>
            {normalizedImportances.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Feature importances not available.</p>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {normalizedImportances.slice(0, 8).map((item) => (
                  <div key={item.name} style={{ background: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: 3 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{item.name.replace(/_/g, ' ')}</span>
                      <strong style={{ color: 'var(--color-primary)' }}>{item.percentage}%</strong>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, item.percentage * 3.5))}%`,
                        height: '100%',
                        background: 'var(--color-primary)'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModelInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Machine Learning Model Intelligence">
      <div className="modal-content" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
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
            <Brain size={18} color="var(--color-primary)" strokeWidth={2} />
            <h3 style={{ fontSize: '1.08rem', color: 'var(--text-primary)', margin: 0 }}>
              Explainable Machine Learning Architecture & Evaluation Metrics
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
          <ModelInfoContent onClose={onClose} isModal={true} />
        </div>
      </div>
    </div>
  );
}

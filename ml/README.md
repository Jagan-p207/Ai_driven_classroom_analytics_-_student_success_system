# EduPulse AI — Machine Learning & Explainability Pipeline

The **EduPulse AI** machine-learning subsystem predicts student academic risk early in the semester by fusing **attendance records**, **chronological assessment scores**, and **LMS activity logs**.

---

## 🏛️ Directory Structure

```
ml/
├── data_generation/
│   ├── __init__.py
│   └── synthetic_data_generator.py # Generates 130 realistic student profiles with 3 archetypes
├── models/
│   ├── best_model.joblib           # Trained, serialized scikit-learn/XGBoost classifier
│   ├── model_metadata.json         # Evaluation benchmarks, confusion matrix & feature importances
│   └── shap_explainer.joblib       # Serialized TreeSHAP / LinearSHAP explainer
├── batch_scorer.py                 # Batch inference & local SHAP feature attribution
├── feature_engineering.py          # Multivariate feature calculation & rolling trends
├── synthetic_data_generator.py     # Backward-compatible CLI entry point
├── train_models.py                 # 5-fold cross-validation & model selection pipeline
└── README.md                       # Machine learning documentation
```

---

## 📊 Feature Space (12 Non-Leaking Predictors)

1. `attendance_pct`: Overall session attendance percentage.
2. `attendance_trend`: First-half vs second-half semester attendance delta.
3. `avg_score`: Mean percentage score across all submitted assessments.
4. `recent_score`: Mark obtained on the most recent assessment.
5. `score_std`: Assessment score standard deviation (volatility).
6. `score_trend`: Ordinary least-squares regression slope (% change per examination).
7. `avg_submission_delay`: Average days late across all coursework submissions.
8. `max_submission_delay`: Maximum delay observed on any single assignment.
9. `submission_delay_trend`: Trajectory of submission timeliness over the semester.
10. `missing_submissions_count`: Total count of overdue or missing assignments.
11. `completion_rate`: Percentage of required LMS assignments completed.
12. `composite_engagement`: Normalized composite index (0–100) combining attendance, score, and punctuality.

---

## 🧠 Explainable AI: SHAP Attribution vs Heuristic Baseline

- **TreeSHAP / LinearSHAP**: When the SHAP explainer artifact is loaded, marginal game-theoretic feature attributions are computed for each student, labeled with `"method": "SHAP"`.
- **Heuristic Baseline Fallback**: If SHAP is uncalibrated or unavailable, the system safely computes cohort deviation scores, explicitly marked as `"method": "heuristic"` and displayed transparently in the user interface.

---

## 🚀 Training & Batch Scoring

### 1. Generate Synthetic Data
```bash
python ml/synthetic_data_generator.py
```

### 2. Run Model Training
```bash
python ml/train_models.py
```
Trains baseline Logistic Regression, Random Forest, and XGBoost models; performs 5-fold cross-validation; fits the SHAP explainer; and writes `ml/models/best_model.joblib`, `shap_explainer.joblib`, and `model_metadata.json`.

### 3. Run Batch Scoring Manually
```bash
python ml/batch_scorer.py
```
Scores `data/processed/features.csv` and outputs `data/processed/risk_scores.csv`.

# EduPulse AI — Machine Learning Pipeline & Leakage Audit

The **EduPulse AI** machine-learning subsystem predicts student academic risk early in the semester by fusing **attendance records**, **internal assessment scores**, **LMS resource interactions**, and **academic cohort attributes**.

---

## 🏛️ Directory Structure & Artifacts

```
ml/
├── models/
│   ├── best_classifier.joblib     # Production Random Forest Classifier (87.2% test accuracy)
│   ├── best_regressor.joblib      # Production Linear Regression Regressor (R² = 0.921, MAE = 2.19)
│   ├── best_model.joblib          # Primary production model alias
│   ├── preprocessor.joblib        # StandardScaler fitted strictly on the 80% training split
│   ├── shap_explainer.joblib      # Serialized TreeSHAP explainer artifact
│   └── model_metadata.json        # Comprehensive evaluation benchmarks, confusion matrix & metrics
├── train_models.py                # 5-fold cross-validation & dual benchmark training suite
├── batch_scorer.py                # Dual inference engine (continuous grade, risk tier & TreeSHAP attributions)
├── synthetic_data_generator.py    # Fallback synthetic cohort generator utility
├── feature_engineering.py         # Rolling trend and composite score engineering pipeline
└── README.md                      # Machine learning documentation
```

---

## 🔒 Data Leakage Audit & Target Formulation

### 1. Mathematical Ground Truth Discovery
Exploratory data analysis of `data/student_dataset.csv` uncovered the institutional grading formula:
$$\text{FinalGrade} = \text{QuizTotal} + \text{Project} + \text{Midterm} + \text{Final} + \text{Attendance} \ (+ 5.0\text{ bonus for 8 students})$$

### 2. The Data Leakage Trap
- The end-of-term examination mark (`Final`, scaled to 35 points) constitutes $\approx 25\text{--}30\%$ of the course total and is only determined **at the very end of the semester**.
- Including `Final` in predictive features causes artificial post-hoc target leakage ($R^2 > 0.99$), rendering the early-warning system **useless** for mid-semester intervention.

### 3. Safeguards Enforced
- **Strictly Excluded**: `Final`, `FinalGrade`, and arbitrary database key `StudentID`.
- **11 Chronological Predictors Retained**:
  1. `Gender` (0 = Male, 1 = Female)
  2. `Program` (1 = Major Stream, 2 = Specialized Track, 3 = Interdisciplinary, 4 = Dual Degree)
  3. `YearLevel` (1 = Freshman, 2 = Sophomore, 3 = Junior, 4 = Senior)
  4. `ClassTime` (0 = Morning Slot, 1 = Afternoon/Evening Slot)
  5. `QuizTotal` (Continuous cumulative quiz score, 0–30)
  6. `Project` (Coursework project mark, 0–20)
  7. `Midterm` (Midterm examination mark, 0–35)
  8. `Attendance` (Class attendance score out of 10)
  9. `Participation` (Interactive classroom participation count)
  10. `Assignment on time percent` (LMS submission punctuality ratio, 0–100%)
  11. `Page Views` (Course LMS resource interaction count)
- **Train/Test Isolation**: `StandardScaler` is fitted **strictly on the 80% training split** and persisted as `preprocessor.joblib`. Test data is transformed with zero parameter updates.

---

## 📊 Dual-Model Evaluation Benchmarks

Evaluated on held-out test split ($20\%$, $N=39$ students) across all 192 institutional records:

### 1. Academic Risk Tier Classification (Production: Random Forest)
- **High Tier / Low Risk** ($\ge 85.0$): Dean's list / honors
- **Medium Tier / Satisfactory** ($70.0\text{--}84.9$): Good academic standing
- **At-Risk Tier / High Risk** ($< 70.0$): Warning tier requiring counselor intervention

| Candidate Model | 5-Fold CV Acc | Test Acc | Test Macro F1 | Test Weighted F1 |
| :--- | :---: | :---: | :---: | :---: |
| **Random Forest Classifier** ★ | **86.3%** | **87.2%** | **0.841** | **0.854** |
| **Logistic Regression (Baseline)** | 84.9% | 84.6% | 0.822 | 0.840 |
| **Extra Trees Classifier** | 85.6% | 84.6% | 0.814 | 0.829 |
| **Gradient Boosting Classifier** | 82.4% | 82.1% | 0.793 | 0.808 |
| **Decision Tree (max_depth=4)** | 77.2% | 79.5% | 0.741 | 0.778 |

### 2. Continuous FinalGrade Prediction (Production: Linear Regression)

| Candidate Model | 5-Fold CV $R^2$ | Test $R^2$ | Test MAE (Points) | Test RMSE |
| :--- | :---: | :---: | :---: | :---: |
| **Linear Regression (Baseline)** ★ | **0.903** | **0.921** | **2.19** | **2.97** |
| **Ridge Regression ($\alpha=1.0$)** | 0.903 | 0.920 | 2.18 | 2.99 |
| **Gradient Boosting Regressor** | 0.887 | 0.894 | 2.73 | 3.44 |
| **Random Forest Regressor** | 0.881 | 0.887 | 2.89 | 3.55 |

---

## 🧠 Explainable AI: TreeSHAP Attributions

EduPulse AI computes game-theoretic Shapley values using `shap.TreeExplainer` fitted on the production Random Forest classifier:

```
Midterm Exam Mark          ██████████████████████████████  30.6%
Quiz Cumulative Total      ████████████████████████        24.8%
Course Project Score       █████████████████               17.6%
Session Attendance         █████████                        9.5%
Assignment On-Time Pct     ██████                           6.4%
LMS Page Views             ████                             4.2%
Participation Index        ███                              2.9%
Academic Program           ██                               1.8%
Year Level                 █                                1.2%
Class Schedule Slot                                         0.6%
Gender Identifier                                           0.4%
```

Every flagged student receives:
1. **Top Contributing Features**: Positive and negative drivers of their risk score.
2. **Confidence Metric**: Highest class probability ($P_{\max}$).
3. **Multiclass Probabilities**: Complete distribution across $\{P(\text{Low}), P(\text{Medium}), P(\text{High})\}$.
4. **Pedagogical Recommendations**: Rule-based prescriptive interventions generated from dominant negative SHAP drivers.

---

## 🚀 Execution & Retraining

### 1. Train Models from Dataset
```bash
python ml/train_models.py
```
Preprocesses `data/student_dataset.csv`, conducts 5-fold cross-validation, trains regression and classification models, fits the TreeSHAP explainer, and exports serialized artifacts to `ml/models/`.

### 2. Batch Scoring & Inference
```bash
python ml/batch_scorer.py
```
Runs batch inference over all students, generating predicted grades, risk tiers, and local SHAP factor JSONs.

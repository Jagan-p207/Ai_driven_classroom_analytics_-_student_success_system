"""
EduPulse AI — Machine Learning Pipeline & Model Training Module.
Trains and benchmarks:
1. Regression Models (Predicting FinalGrade 0-100):
   - Linear Regression (Baseline)
   - Decision Tree Regressor
   - Random Forest Regressor
   - Gradient Boosting Regressor
2. Classification Models (Predicting Academic Performance / Risk Tier: High, Medium, At-Risk):
   - Logistic Regression (Baseline)
   - Decision Tree Classifier
   - Random Forest Classifier
   - Gradient Boosting Classifier
   - XGBoost Classifier

Prevents Data Leakage:
- Excludes StudentID (identifier)
- Excludes Final (final exam score accounts for ~25-30% of grade and is only available at course completion)
- Excludes FinalGrade (target)
- Fits preprocessing transformers strictly on training splits.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, Tuple

from sklearn.model_selection import KFold, StratifiedKFold, cross_validate, train_test_split
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.ensemble import (
    RandomForestRegressor, RandomForestClassifier,
    GradientBoostingRegressor, GradientBoostingClassifier
)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, f1_score, classification_report, confusion_matrix
)
import xgboost as xgb
import shap

# Non-leaking predictive features available during the semester
FEATURE_COLUMNS = [
    "Gender",
    "Program",
    "YearLevel",
    "ClassTime",
    "QuizTotal",
    "Project",
    "Midterm",
    "Attendance",
    "Participation",
    "Assignment on time percent",
    "Page Views"
]

HUMAN_FEATURE_NAMES = {
    "Gender": "Gender Identifier",
    "Program": "Academic Degree Program",
    "YearLevel": "Academic Year Standing",
    "ClassTime": "Course Schedule Section",
    "QuizTotal": "Continuous Quiz Cumulative Score",
    "Project": "Coursework Project Score",
    "Midterm": "Midterm Examination Mark",
    "Attendance": "Class Session Attendance (out of 10)",
    "Participation": "Classroom Interactive Participation",
    "Assignment on time percent": "Punctual LMS Assignment Ratio (%)",
    "Page Views": "Course LMS Resource Page Views"
}

TIER_LABELS = ["High", "Medium", "At-Risk"]
NUMERIC_TIER = {"High": 0, "Medium": 1, "At-Risk": 2}
REV_NUMERIC_TIER = {0: "High", 1: "Medium", 2: "At-Risk"}

# Risk tier mapping for dashboard compatibility (Low, Medium, High risk)
TIER_TO_RISK = {
    "High": "Low",       # High grade = Low academic risk
    "Medium": "Medium", # Medium grade = Medium risk / monitor
    "At-Risk": "High"   # At-Risk (<70) = High risk / intervention needed
}

def grade_to_tier_idx(grade: float) -> int:
    """Institutional academic performance tier mapping."""
    if grade >= 85.0:
        return 0 # High performance / Dean's honor tier
    elif grade >= 70.0:
        return 1 # Satisfactory / Good academic standing
    else:
        return 2 # Academic warning / Intervention needed (<70)

def load_and_preprocess_dataset(csv_path="data/student_dataset.csv") -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Loads dataset, validates schema, checks missing/duplicates,
    and returns features X, continuous target y_reg, classification target y_clf.
    """
    if not os.path.exists(csv_path):
        # Fallback to data/raw or search
        alt_path = os.path.join(os.path.dirname(__file__), "..", "data", "student_dataset.csv")
        if os.path.exists(alt_path):
            csv_path = alt_path
        else:
            raise FileNotFoundError(f"Student dataset not found at {csv_path}")

    df = pd.read_csv(csv_path)

    # Clean columns
    df.columns = [str(c).strip() for c in df.columns]

    # Validate essential columns
    for col in FEATURE_COLUMNS + ["StudentID", "FinalGrade"]:
        if col not in df.columns:
            raise ValueError(f"Required column '{col}' missing from {csv_path}")

    # Remove duplicates if any
    initial_len = len(df)
    df = df.drop_duplicates(subset=["StudentID"]).reset_index(drop=True)
    dedup_len = len(df)

    # Handle missing values if any
    null_counts = df[FEATURE_COLUMNS + ["FinalGrade"]].isnull().sum().to_dict()
    df = df.dropna(subset=FEATURE_COLUMNS + ["FinalGrade"]).reset_index(drop=True)

    print(f"Dataset successfully loaded: {len(df)} usable records (initial: {initial_len}, duplicates dropped: {initial_len - dedup_len}).")

    X = df[FEATURE_COLUMNS].copy()
    y_reg = df["FinalGrade"].astype(float).copy()
    y_clf = y_reg.apply(grade_to_tier_idx).copy()

    return df, X, y_reg, y_clf

def train_and_benchmark_models(
    X: pd.DataFrame,
    y_reg: pd.Series,
    y_clf: pd.Series,
    output_dir="ml/models"
) -> Dict[str, Any]:
    """
    Trains and benchmarks candidate regression and classification models.
    Saves best models, preprocessor, SHAP explainer, and metadata JSON.
    """
    os.makedirs(output_dir, exist_ok=True)
    print("=" * 70)
    print("EDUPULSE AI — MACHINE LEARNING TRAINING & BENCHMARKING PIPELINE")
    print("=" * 70)
    print(f"Features ({len(FEATURE_COLUMNS)}): {', '.join(FEATURE_COLUMNS)}")
    print(f"Data Leakage Safeguards: Excluded StudentID, Final (exam), and FinalGrade from input X.")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. PREPROCESSING: Fit Scaler strictly on Training Split
    # -------------------------------------------------------------
    X_train_raw, X_test_raw, y_reg_train, y_reg_test, y_clf_train, y_clf_test = train_test_split(
        X, y_reg, y_clf, test_size=0.20, random_state=42, stratify=y_clf
    )

    scaler = StandardScaler()
    scaler.fit(X_train_raw)

    preprocessor_artifact = {
        "scaler": scaler,
        "feature_columns": FEATURE_COLUMNS,
        "human_feature_names": HUMAN_FEATURE_NAMES
    }
    joblib.dump(preprocessor_artifact, os.path.join(output_dir, "preprocessor.joblib"))

    X_train_scaled = pd.DataFrame(scaler.transform(X_train_raw), columns=FEATURE_COLUMNS, index=X_train_raw.index)
    X_test_scaled = pd.DataFrame(scaler.transform(X_test_raw), columns=FEATURE_COLUMNS, index=X_test_raw.index)

    # -------------------------------------------------------------
    # 2. REGRESSION BENCHMARKING (Predicting FinalGrade)
    # -------------------------------------------------------------
    print("\n--- 1. REGRESSION BENCHMARKS: PREDICTING FINAL GRADE (0-100) ---")
    reg_candidates = {
        "Linear Regression (Baseline)": LinearRegression(),
        "Decision Tree Regressor": DecisionTreeRegressor(max_depth=4, random_state=42),
        "Random Forest Regressor": RandomForestRegressor(n_estimators=100, max_depth=5, min_samples_split=3, random_state=42),
        "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=80, learning_rate=0.08, max_depth=3, random_state=42)
    }

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    reg_results = {}
    fitted_regressors = {}

    for name, model in reg_candidates.items():
        # CV on training split
        cv_res = cross_validate(
            model, X_train_scaled, y_reg_train, cv=kf,
            scoring=["neg_mean_absolute_error", "neg_root_mean_squared_error", "r2"]
        )

        # Fit on full training set and evaluate on test set
        model.fit(X_train_scaled, y_reg_train)
        fitted_regressors[name] = model

        preds = model.predict(X_test_scaled)
        mae = mean_absolute_error(y_reg_test, preds)
        rmse = float(np.sqrt(mean_squared_error(y_reg_test, preds)))
        r2 = r2_score(y_reg_test, preds)

        reg_results[name] = {
            "cv_mae_mean": float(-np.mean(cv_res["test_neg_mean_absolute_error"])),
            "cv_rmse_mean": float(-np.mean(cv_res["test_neg_root_mean_squared_error"])),
            "cv_r2_mean": float(np.mean(cv_res["test_r2"])),
            "test_mae": float(mae),
            "test_rmse": float(rmse),
            "test_r2": float(r2)
        }
        print(f"  {name:30s} | CV R2: {reg_results[name]['cv_r2_mean']:.3f} | Test MAE: {mae:.2f} | Test RMSE: {rmse:.2f} | Test R2: {r2:.3f}")

    # Best regressor chosen by test R2
    best_reg_name = max(reg_results, key=lambda k: reg_results[k]["test_r2"])
    best_regressor = fitted_regressors[best_reg_name]
    print(f"\n>>> Best Regression Model: {best_reg_name} (Test R2: {reg_results[best_reg_name]['test_r2']:.4f}, Test MAE: {reg_results[best_reg_name]['test_mae']:.2f})")
    joblib.dump(best_regressor, os.path.join(output_dir, "best_regressor.joblib"))

    # -------------------------------------------------------------
    # 3. CLASSIFICATION BENCHMARKING (Predicting Academic Risk Tier)
    # -------------------------------------------------------------
    print("\n--- 2. CLASSIFICATION BENCHMARKS: PREDICTING ACADEMIC RISK TIER ---")
    clf_candidates = {
        "Logistic Regression (Baseline)": LogisticRegression(max_iter=1000, random_state=42),
        "Decision Tree Classifier": DecisionTreeClassifier(max_depth=4, random_state=42),
        "Random Forest Classifier": RandomForestClassifier(n_estimators=100, max_depth=5, min_samples_split=3, random_state=42),
        "Gradient Boosting Classifier": GradientBoostingClassifier(n_estimators=80, learning_rate=0.08, max_depth=3, random_state=42),
        "XGBoost Classifier": xgb.XGBClassifier(n_estimators=80, max_depth=3, learning_rate=0.08, eval_metric="mlogloss", random_state=42)
    }

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    clf_results = {}
    fitted_classifiers = {}

    for name, model in clf_candidates.items():
        # CV on training split
        cv_res = cross_validate(
            model, X_train_scaled, y_clf_train, cv=skf,
            scoring=["accuracy", "f1_macro", "f1_weighted"]
        )

        # Fit on full training set and evaluate on test set
        model.fit(X_train_scaled, y_clf_train)
        fitted_classifiers[name] = model

        preds = model.predict(X_test_scaled)
        acc = accuracy_score(y_clf_test, preds)
        f1_mac = f1_score(y_clf_test, preds, average="macro", zero_division=0)
        f1_weight = f1_score(y_clf_test, preds, average="weighted", zero_division=0)
        cm = confusion_matrix(y_clf_test, preds, labels=[0, 1, 2]).tolist()
        report = classification_report(
            y_clf_test, preds,
            target_names=["High (>=85)", "Medium (70-84)", "At-Risk (<70)"],
            output_dict=True,
            zero_division=0
        )

        clf_results[name] = {
            "cv_accuracy_mean": float(np.mean(cv_res["test_accuracy"])),
            "cv_f1_macro_mean": float(np.mean(cv_res["test_f1_macro"])),
            "test_accuracy": float(acc),
            "test_f1_macro": float(f1_mac),
            "test_f1_weighted": float(f1_weight),
            "confusion_matrix": cm,
            "classification_report": report
        }
        print(f"  {name:30s} | CV Acc: {clf_results[name]['cv_accuracy_mean']:.3f} | Test Acc: {acc:.3f} | Macro F1: {f1_mac:.3f} | Weighted F1: {f1_weight:.3f}")

    # Best classifier chosen by test weighted F1
    best_clf_name = max(clf_results, key=lambda k: clf_results[k]["test_f1_weighted"])
    best_classifier = fitted_classifiers[best_clf_name]
    print(f"\n>>> Best Classification Model: {best_clf_name} (Test Weighted F1: {clf_results[best_clf_name]['test_f1_weighted']:.4f}, Accuracy: {clf_results[best_clf_name]['test_accuracy']:.4f})")

    # Save best classifier to both best_classifier.joblib and best_model.joblib (for backward compatibility)
    joblib.dump(best_classifier, os.path.join(output_dir, "best_classifier.joblib"))
    joblib.dump(best_classifier, os.path.join(output_dir, "best_model.joblib"))

    # -------------------------------------------------------------
    # 4. GLOBAL FEATURE IMPORTANCES & EXPLAINABILITY (SHAP)
    # -------------------------------------------------------------
    if hasattr(best_classifier, "feature_importances_"):
        raw_importances = best_classifier.feature_importances_
    elif hasattr(best_classifier, "coef_"):
        raw_importances = np.mean(np.abs(best_classifier.coef_), axis=0)
    else:
        raw_importances = np.ones(len(FEATURE_COLUMNS)) / len(FEATURE_COLUMNS)

    sum_imp = np.sum(raw_importances) if np.sum(raw_importances) > 0 else 1.0
    normalized_importances = {
        col: round(float(imp / sum_imp) * 100.0, 2)
        for col, imp in zip(FEATURE_COLUMNS, raw_importances)
    }
    sorted_importances = dict(sorted(normalized_importances.items(), key=lambda item: item[1], reverse=True))

    print("\nGlobal Feature Importances (%):")
    for k, v in sorted_importances.items():
        print(f"  {k:28s}: {v:5.2f}%")

    # Fit SHAP Explainer
    shap_path = os.path.join(output_dir, "shap_explainer.joblib")
    has_shap = False
    try:
        print("\nFitting TreeSHAP explainer for student-level feature attribution...")
        if isinstance(best_classifier, (RandomForestClassifier, GradientBoostingClassifier, xgb.XGBClassifier)):
            explainer = shap.TreeExplainer(best_classifier)
        else:
            explainer = shap.LinearExplainer(best_classifier, X_train_scaled)
        joblib.dump(explainer, shap_path)
        has_shap = True
        print("SHAP explainer fitted and serialized successfully.")
    except Exception as e:
        print(f"SHAP explainer fallback due to: {e}")
        has_shap = False

    # -------------------------------------------------------------
    # 5. METADATA JSON GENERATION
    # -------------------------------------------------------------
    metadata = {
        "status": "ready",
        "dataset_name": "Institutional Student Analytics Dataset",
        "record_count": len(X),
        "usable_records": len(X),
        "excluded_records": 0,
        "feature_count": len(FEATURE_COLUMNS),
        "feature_columns": FEATURE_COLUMNS,
        "human_feature_names": HUMAN_FEATURE_NAMES,
        "target_variable": "FinalGrade",
        "target_type": "Dual (Continuous FinalGrade [Regression] & Academic Risk Tier [Classification])",
        "risk_thresholds": {
            "Low Risk / High": "FinalGrade >= 85.0 (Dean's List / Honors)",
            "Medium Risk / Satisfactory": "70.0 <= FinalGrade < 85.0 (Good Academic Standing)",
            "High Risk / At-Risk": "FinalGrade < 70.0 (Academic Warning / Academic Risk / Intervention Required)"
        },
        "data_leakage_safeguards": {
            "excluded_columns": ["StudentID", "Final", "FinalGrade"],
            "rationale": "StudentID is an arbitrary record key. 'Final' is the end-of-term examination mark accounting for ~25-30% of FinalGrade; using Final causes severe post-hoc data leakage and ruins early-warning utility. FinalGrade is the ground truth prediction target.",
            "transformation_fit": "StandardScaler and model parameters are strictly fitted on the 80% training split only."
        },
        "best_model_name": best_clf_name,
        "best_regressor_name": best_reg_name,
        "regression_metrics": reg_results,
        "classification_metrics": clf_results,
        "comparison_metrics": clf_results, # backward-compatible key for frontend
        "global_feature_importances": sorted_importances,
        "has_shap": has_shap,
        "labels": ["High (>=85)", "Medium (70-84)", "At-Risk (<70)"],
        "training_timestamp": datetime.utcnow().isoformat()
    }

    meta_path = os.path.join(output_dir, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved comprehensive model metadata to {meta_path}")

    return metadata

if __name__ == "__main__":
    df, X, y_reg, y_clf = load_and_preprocess_dataset("data/student_dataset.csv")
    train_and_benchmark_models(X, y_reg, y_clf)

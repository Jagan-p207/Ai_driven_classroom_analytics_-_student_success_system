"""
Model Training & Benchmarking Module.
Trains and compares:
1. Logistic Regression (Baseline)
2. Random Forest (Primary)
3. XGBoost (Evaluated Alternative)

Evaluates Accuracy, Precision, Recall, Macro/Weighted F1, and selects best model.
Saves model to joblib and computes SHAP explainer for per-student explainability.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, f1_score, accuracy_score, confusion_matrix
import xgboost as xgb
import shap

FEATURE_COLUMNS = [
    "attendance_pct",
    "attendance_trend",
    "avg_score",
    "recent_score",
    "score_std",
    "score_trend",
    "avg_submission_delay",
    "max_submission_delay",
    "submission_delay_trend",
    "missing_submissions_count",
    "completion_rate",
    "composite_engagement"
]

LABEL_MAPPING = {
    "low_risk": "Low",
    "medium_risk": "Medium",
    "high_risk": "High"
}

NUMERIC_LABEL = {
    "Low": 0,
    "Medium": 1,
    "High": 2
}
REV_NUMERIC_LABEL = {v: k for k, v in NUMERIC_LABEL.items()}

def load_training_data(data_dir="data"):
    """Load features and labels."""
    features_path = os.path.join(data_dir, "processed", "features.csv")
    labels_path = os.path.join(data_dir, "raw", "ground_truth_labels.csv")

    df_feats = pd.read_csv(features_path)
    df_labels = pd.read_csv(labels_path)

    merged = df_feats.merge(df_labels, on="student_id", how="inner")
    merged["risk_level"] = merged["archetype"].map(LABEL_MAPPING)
    merged["target"] = merged["risk_level"].map(NUMERIC_LABEL)

    X = merged[FEATURE_COLUMNS].copy()
    y = merged["target"].copy()
    return X, y, merged

def train_and_evaluate_models(X: pd.DataFrame, y: pd.Series, output_dir="ml/models"):
    """
    Trains Logistic Regression, Random Forest, and XGBoost.
    Performs 5-fold cross-validation and independent test split evaluation.
    """
    os.makedirs(output_dir, exist_ok=True)
    print("=" * 60)
    print("TRAINING & BENCHMARKING EARLY-WARNING RISK CLASSIFIERS")
    print("=" * 60)

    # 80/20 Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    models = {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, random_state=42))
        ]),
        "Random Forest": RandomForestClassifier(
            n_estimators=100, max_depth=5, min_samples_split=3, random_state=42
        ),
        "XGBoost": xgb.XGBClassifier(
            n_estimators=80, max_depth=4, learning_rate=0.08, eval_metric="mlogloss", random_state=42
        )
    }

    comparison_results = {}
    fitted_models = {}

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    for name, model in models.items():
        print(f"\nEvaluating {name}...")
        # Cross-validation
        cv_scores = cross_validate(
            model, X_train, y_train, cv=cv, scoring=["accuracy", "f1_macro", "f1_weighted"]
        )

        # Fit on full training set and evaluate on test set
        model.fit(X_train, y_train)
        fitted_models[name] = model

        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        f1_mac = f1_score(y_test, y_pred, average="macro")
        f1_weight = f1_score(y_test, y_pred, average="weighted")
        cm = confusion_matrix(y_test, y_pred).tolist()
        report = classification_report(y_test, y_pred, target_names=["Low", "Medium", "High"], output_dict=True)

        comparison_results[name] = {
            "cv_accuracy_mean": float(np.mean(cv_scores["test_accuracy"])),
            "cv_f1_macro_mean": float(np.mean(cv_scores["test_f1_macro"])),
            "test_accuracy": float(acc),
            "test_f1_macro": float(f1_mac),
            "test_f1_weighted": float(f1_weight),
            "confusion_matrix": cm,
            "classification_report": report
        }

        print(f"  Test Accuracy:     {acc:.4f}")
        print(f"  Test Macro F1:     {f1_mac:.4f}")
        print(f"  Test Weighted F1:  {f1_weight:.4f}")

    # Pick the best model based on test Macro F1
    best_model_name = max(comparison_results, key=lambda k: comparison_results[k]["test_f1_macro"])
    print(f"\n>>> Best Performing Model: {best_model_name} (Macro F1: {comparison_results[best_model_name]['test_f1_macro']:.4f})")

    best_model = fitted_models[best_model_name]

    # Global feature importances
    if hasattr(best_model, "feature_importances_"):
        raw_importances = best_model.feature_importances_
    elif hasattr(best_model.named_steps["clf"], "coef_"):
        raw_importances = np.mean(np.abs(best_model.named_steps["clf"].coef_), axis=0)
    else:
        raw_importances = np.ones(len(FEATURE_COLUMNS)) / len(FEATURE_COLUMNS)

    # Normalize to percentages
    sum_imp = np.sum(raw_importances) if np.sum(raw_importances) > 0 else 1.0
    normalized_importances = {
        col: round(float(imp / sum_imp) * 100.0, 2)
        for col, imp in zip(FEATURE_COLUMNS, raw_importances)
    }
    # Sort descending
    sorted_importances = dict(sorted(normalized_importances.items(), key=lambda item: item[1], reverse=True))

    print("\nGlobal Feature Importances (%):")
    for k, v in sorted_importances.items():
        print(f"  {k:28s}: {v:5.2f}%")

    # Fit SHAP Explainer for Explainability
    shap_explainer_path = os.path.join(output_dir, "shap_explainer.joblib")
    try:
        print("\nBuilding SHAP explainer for explainability...")
        if best_model_name in ["Random Forest", "XGBoost"]:
            explainer = shap.TreeExplainer(best_model)
        else:
            explainer = shap.Explainer(best_model.predict_proba, X_train)
        joblib.dump(explainer, shap_explainer_path)
        has_shap = True
        print("SHAP explainer saved successfully.")
    except Exception as e:
        print(f"SHAP explainer fallback due to: {e}")
        has_shap = False

    # Save Best Model via joblib
    best_model_path = os.path.join(output_dir, "best_model.joblib")
    joblib.dump(best_model, best_model_path)
    print(f"Saved best model to {best_model_path}")

    # Also save metadata & comparison report
    metadata = {
        "best_model_name": best_model_name,
        "feature_columns": FEATURE_COLUMNS,
        "labels": ["Low", "Medium", "High"],
        "comparison_metrics": comparison_results,
        "global_feature_importances": sorted_importances,
        "has_shap": has_shap
    }
    meta_path = os.path.join(output_dir, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {meta_path}")

    return best_model, metadata

if __name__ == "__main__":
    X, y, df = load_training_data()
    train_and_evaluate_models(X, y)

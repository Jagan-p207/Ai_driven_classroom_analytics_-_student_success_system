"""
Batch Scorer & Explainability Module.
Loads joblib-persisted model and SHAP explainer.
Computes risk classification (Low/Medium/High), continuous risk score (0.0-1.0),
alerts, and top contributing factors per student.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List

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

LABELS = ["Low", "Medium", "High"]

HUMAN_FACTOR_NAMES = {
    "attendance_pct": "Overall Attendance Rate",
    "attendance_trend": "Attendance Trend",
    "avg_score": "Average Assessment Score",
    "recent_score": "Recent Assessment Score",
    "score_std": "Score Volatility",
    "score_trend": "Assessment Score Trajectory (Slope)",
    "avg_submission_delay": "Average Assignment Delay (Days)",
    "max_submission_delay": "Maximum Assignment Delay",
    "submission_delay_trend": "Submission Delay Trend",
    "missing_submissions_count": "Missing Assignments Count",
    "completion_rate": "LMS Coursework Completion Rate",
    "composite_engagement": "Composite Engagement Index"
}

def load_model_artifacts(model_dir="ml/models"):
    """Loads persisted model, metadata, and SHAP explainer."""
    best_model_path = os.path.join(model_dir, "best_model.joblib")
    explainer_path = os.path.join(model_dir, "shap_explainer.joblib")
    metadata_path = os.path.join(model_dir, "model_metadata.json")

    if not os.path.exists(best_model_path):
        raise FileNotFoundError(f"Model file not found at {best_model_path}. Train the model first.")

    model = joblib.load(best_model_path)
    
    explainer = None
    if os.path.exists(explainer_path):
        try:
            explainer = joblib.load(explainer_path)
        except Exception as e:
            print(f"Warning: could not load SHAP explainer ({e}), falling back to heuristic contributions.")

    metadata = {}
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            metadata = json.load(f)

    return model, explainer, metadata

def generate_recommendations(risk_level: str, factors: List[Dict[str, Any]]) -> List[str]:
    """Generates targeted institutional intervention recommendations."""
    recs = []
    if risk_level == "Low":
        recs.append("Maintain current progress. Eligible for peer tutoring leadership.")
        return recs

    factor_keys = [f["feature"] for f in factors]

    if "attendance_pct" in factor_keys or "attendance_trend" in factor_keys:
        recs.append("Trigger automated attendance check-in and notify academic counselor.")
    if "score_trend" in factor_keys or "recent_score" in factor_keys or "avg_score" in factor_keys:
        recs.append("Offer 1-on-1 TA office hours and targeted study materials for upcoming exam.")
    if "missing_submissions_count" in factor_keys or "avg_submission_delay" in factor_keys:
        recs.append("Open LMS homework grace-period request and check for technical/personal barriers.")
    if "composite_engagement" in factor_keys:
        recs.append("Schedule 15-minute proactive check-in with course instructor.")

    if not recs:
        recs.append("Monitor student activity closely over the next 2 academic weeks.")

    return recs[:3]

def compute_contributions_for_student(
    student_feats: pd.Series,
    model,
    explainer,
    predicted_class_idx: int
) -> List[Dict[str, Any]]:
    """
    Computes top contributing factors for a single student using SHAP or fallback.
    """
    X_single = pd.DataFrame([student_feats[FEATURE_COLUMNS]])
    contributions = []

    # Attempt SHAP computation
    shap_calculated = False
    if explainer is not None:
        try:
            shap_values = explainer(X_single)
            # Depending on explainer type, values could be shape (1, features, classes) or (1, features)
            values = shap_values.values
            if len(values.shape) == 3: # multi-class
                # Focus on predicted risk class or risk increment (High risk class = idx 2)
                target_idx = max(1, predicted_class_idx)
                student_shap = values[0, :, target_idx]
            elif len(values.shape) == 2:
                student_shap = values[0, :]
            else:
                student_shap = values.flatten()

            for feat, val, s_val in zip(FEATURE_COLUMNS, student_feats[FEATURE_COLUMNS], student_shap):
                contributions.append({
                    "feature": feat,
                    "label": HUMAN_FACTOR_NAMES.get(feat, feat),
                    "value": round(float(val), 2),
                    "impact": round(float(s_val), 4),
                    "is_risk_driver": bool(s_val > 0)
                })
            shap_calculated = True
        except Exception:
            shap_calculated = False

    if not shap_calculated:
        # Fallback to feature deviation from healthy cohort baseline
        # High attendance is good (>85), low delay is good (<1), high score is good (>75)
        heuristics = {
            "attendance_pct": (85.0 - student_feats["attendance_pct"]) * 0.02,
            "score_trend": (-student_feats["score_trend"]) * 0.05,
            "avg_score": (75.0 - student_feats["avg_score"]) * 0.015,
            "avg_submission_delay": (student_feats["avg_submission_delay"] - 0.5) * 0.04,
            "missing_submissions_count": student_feats["missing_submissions_count"] * 0.10,
            "completion_rate": (90.0 - student_feats["completion_rate"]) * 0.02,
            "composite_engagement": (75.0 - student_feats["composite_engagement"]) * 0.02
        }
        for feat, impact in heuristics.items():
            contributions.append({
                "feature": feat,
                "label": HUMAN_FACTOR_NAMES.get(feat, feat),
                "value": round(float(student_feats[feat]), 2),
                "impact": round(float(impact), 4),
                "is_risk_driver": bool(impact > 0)
            })

    # Sort factors by impact magnitude (drivers of risk on top)
    contributions.sort(key=lambda x: x["impact"], reverse=True)
    return contributions[:5]

def batch_score_students(
    df_features: pd.DataFrame,
    model_dir="ml/models"
) -> pd.DataFrame:
    """
    Runs batch inference on a feature DataFrame and constructs Risk_Score records.
    """
    model, explainer, metadata = load_model_artifacts(model_dir=model_dir)

    X = df_features[FEATURE_COLUMNS].copy()

    # Predict probabilities & classes
    has_proba = hasattr(model, "predict_proba")
    if has_proba:
        probs = model.predict_proba(X)
        preds = np.argmax(probs, axis=1)
        # Continuous risk score: weighted combination: Low=0.0, Medium=0.5, High=1.0
        # or P(Medium)*0.4 + P(High)*1.0
        if probs.shape[1] == 3:
            risk_scores = probs[:, 1] * 0.45 + probs[:, 2] * 1.0
        else:
            risk_scores = probs[:, -1]
    else:
        preds = model.predict(X)
        risk_scores = np.where(preds == 2, 0.9, np.where(preds == 1, 0.5, 0.1))
        probs = None

    scored_records = []
    now_iso = datetime.utcnow().isoformat()

    for i in range(len(df_features)):
        row = df_features.iloc[i]
        pred_idx = int(preds[i])
        pred_label = LABELS[pred_idx]
        r_score = float(np.clip(risk_scores[i], 0.0, 1.0))

        # Class probabilities and model confidence
        if probs is not None and probs.shape[1] == 3:
            p_low = round(float(probs[i, 0]), 3)
            p_med = round(float(probs[i, 1]), 3)
            p_high = round(float(probs[i, 2]), 3)
            prob_dict = {"Low": p_low, "Medium": p_med, "High": p_high}
            confidence = round(float(np.max(probs[i])), 3)
        else:
            prob_dict = {"Low": 0.1, "Medium": 0.2, "High": 0.7} if pred_label == "High" else {"Low": 0.8, "Medium": 0.15, "High": 0.05}
            confidence = 0.85

        # Alert flag: triggered if Medium or High risk, or score >= 0.35
        alert_flag = bool(pred_label in ["Medium", "High"] or r_score >= 0.35)

        # Contributing factors for explainability
        top_factors = compute_contributions_for_student(row, model, explainer, pred_idx)
        recommendations = generate_recommendations(pred_label, top_factors)

        scored_records.append({
            "student_id": row["student_id"],
            "name": row.get("name", ""),
            "class_id": row.get("class_id", "CS101"),
            "risk_level": pred_label,
            "risk_score": round(r_score, 4),
            "attendance_pct": round(float(row["attendance_pct"]), 2),
            "avg_score": round(float(row["avg_score"]), 2),
            "score_trend": round(float(row["score_trend"]), 4),
            "avg_submission_delay": round(float(row["avg_submission_delay"]), 2),
            "composite_engagement": round(float(row["composite_engagement"]), 2),
            "alert_flag": alert_flag,
            "contributing_factors": json.dumps(top_factors),
            "recommendations": json.dumps(recommendations),
            "confidence": confidence,
            "risk_probabilities": json.dumps(prob_dict),
            "computed_at": now_iso
        })

    return pd.DataFrame(scored_records)

if __name__ == "__main__":
    import os
    feats_file = "data/processed/features.csv"
    if not os.path.exists(feats_file):
        raise FileNotFoundError("Features file not found. Run feature_engineering.py first.")

    df_feats = pd.read_csv(feats_file)
    print(f"Scoring {len(df_feats)} students in batch...")
    df_scored = batch_score_students(df_feats)

    out_file = "data/processed/risk_scores.csv"
    df_scored.to_csv(out_file, index=False)
    print(f"Batch scoring complete. Saved to {out_file}")

    print("\nRisk Level Distribution:")
    print(df_scored["risk_level"].value_counts())
    print("\nAlert Counts:")
    print(df_scored["alert_flag"].value_counts())

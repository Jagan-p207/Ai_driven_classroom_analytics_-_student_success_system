"""
EduPulse AI — Batch Scorer & Student Risk Prediction Service.
Loads persisted models (Classifier, Regressor, Scaler Preprocessor, SHAP Explainer).
Computes:
1. Predicted Final Grade (continuous regression 0.0 - 100.0)
2. Academic Risk Classification (Low, Medium, High)
3. Confidence & Class Probabilities
4. Local SHAP Attribution & Contributing Factors per student
5. Pedagogical Action Recommendations
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

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

HUMAN_FACTOR_NAMES = {
    "Midterm": "Midterm Exam Score",
    "QuizTotal": "Continuous Quiz Total",
    "Project": "Project Coursework Score",
    "Attendance": "Session Attendance (out of 10)",
    "Participation": "Classroom Participation",
    "Assignment on time percent": "LMS Assignment Punctuality (%)",
    "Page Views": "Course LMS Resource Views",
    "YearLevel": "Academic Year Standing",
    "Program": "Academic Degree Program",
    "Gender": "Gender Identifier",
    "ClassTime": "Class Schedule Slot"
}

# 3 Model Classes: 0: High Performance (>=85), 1: Medium (70-84), 2: At-Risk (<70)
# Mapped to EduPulse Institutional Risk Categories:
INDEX_TO_RISK = {
    0: "Low",       # High grade >=85 -> Low risk
    1: "Medium",    # Medium grade 70-84 -> Medium risk
    2: "High"       # Grade <70 -> High risk / intervention needed
}

def load_model_artifacts(model_dir="ml/models"):
    """Loads persisted model artifacts from disk."""
    best_model_path = os.path.join(model_dir, "best_model.joblib")
    regressor_path = os.path.join(model_dir, "best_regressor.joblib")
    preprocessor_path = os.path.join(model_dir, "preprocessor.joblib")
    explainer_path = os.path.join(model_dir, "shap_explainer.joblib")
    metadata_path = os.path.join(model_dir, "model_metadata.json")

    if not os.path.exists(best_model_path):
        raise FileNotFoundError(f"Model file not found at {best_model_path}. Train the model first using ml/train_models.py.")

    classifier = joblib.load(best_model_path)

    regressor = None
    if os.path.exists(regressor_path):
        try:
            regressor = joblib.load(regressor_path)
        except Exception as e:
            print(f"Warning: could not load regressor: {e}")

    preprocessor = None
    if os.path.exists(preprocessor_path):
        try:
            preprocessor = joblib.load(preprocessor_path)
        except Exception as e:
            print(f"Warning: could not load preprocessor: {e}")

    explainer = None
    if os.path.exists(explainer_path):
        try:
            explainer = joblib.load(explainer_path)
        except Exception as e:
            print(f"Warning: could not load SHAP explainer ({e}), falling back to heuristic contributions.")

    metadata = {}
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
        except Exception as e:
            print(f"Warning: could not load metadata: {e}")

    return classifier, regressor, preprocessor, explainer, metadata

def generate_recommendations(risk_level: str, predicted_grade: float, factors: List[Dict[str, Any]]) -> List[str]:
    """Generates targeted institutional intervention recommendations."""
    recs = []
    if risk_level == "Low" and predicted_grade >= 85.0:
        recs.append("Demonstrating high academic mastery. Eligible for peer tutoring leadership or advanced research projects.")
        return recs

    factor_keys = [f["feature"] for f in factors if f.get("is_risk_driver")]

    if "Midterm" in factor_keys or "QuizTotal" in factor_keys:
        recs.append("Offer 1-on-1 TA office hours and exam error review before upcoming assessments.")
    if "Attendance" in factor_keys:
        recs.append("Trigger automated attendance check-in and notify academic counselor.")
    if "Project" in factor_keys:
        recs.append("Schedule project milestone progress check and clarify grading rubric expectations.")
    if "Assignment on time percent" in factor_keys or "Page Views" in factor_keys:
        recs.append("Open LMS homework grace-period support and review course digital resource engagement.")
    if "Participation" in factor_keys:
        recs.append("Encourage active classroom discussion participation and group study sessions.")

    if not recs:
        if risk_level == "High":
            recs.append("Schedule immediate 15-minute academic advising check-in with course instructor.")
        else:
            recs.append("Monitor student activity closely over the next 2 academic weeks.")

    return recs[:3]

def compute_contributions_for_student(
    student_feats: pd.Series,
    classifier,
    explainer,
    predicted_class_idx: int,
    precomputed_shap: Any = None,
    scaler = None
) -> List[Dict[str, Any]]:
    """
    Computes top contributing factors for a single student using TreeSHAP or feature deviation.
    """
    contributions = []
    shap_calculated = False

    # 1. Use precomputed SHAP values if available
    if precomputed_shap is not None:
        try:
            values = precomputed_shap
            if hasattr(values, "shape") and len(values.shape) == 2:  # (features, classes)
                target_idx = max(1, predicted_class_idx)
                if target_idx < values.shape[1]:
                    student_shap = values[:, target_idx]
                else:
                    student_shap = values[:, -1]
            elif hasattr(values, "shape") and len(values.shape) == 1:
                student_shap = values
            else:
                student_shap = np.array(values).flatten()

            for feat, val, s_val in zip(FEATURE_COLUMNS, student_feats[FEATURE_COLUMNS], student_shap):
                contributions.append({
                    "feature": feat,
                    "label": HUMAN_FACTOR_NAMES.get(feat, feat),
                    "value": round(float(val), 2),
                    "impact": round(float(s_val), 4),
                    "is_risk_driver": bool(s_val > 0),
                    "method": "SHAP",
                    "is_shap": True
                })
            shap_calculated = True
        except Exception:
            shap_calculated = False

    # 2. Attempt single-row SHAP computation
    if not shap_calculated and explainer is not None:
        try:
            X_single = pd.DataFrame([student_feats[FEATURE_COLUMNS]])
            if scaler is not None:
                X_single_trans = scaler.transform(X_single)
            else:
                X_single_trans = X_single
            shap_values = explainer(X_single_trans)
            values = shap_values.values
            if len(values.shape) == 3: # (1, features, classes)
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
                    "is_risk_driver": bool(s_val > 0),
                    "method": "SHAP",
                    "is_shap": True
                })
            shap_calculated = True
        except Exception:
            shap_calculated = False

    if not shap_calculated:
        # Fallback to feature deviation
        for feat in FEATURE_COLUMNS:
            val = float(student_feats.get(feat, 0))
            is_driver = False
            impact = 0.0
            if feat == "Midterm":
                impact = (18.0 - val) * 0.05
                is_driver = val < 15.0
            elif feat == "QuizTotal":
                impact = (20.0 - val) * 0.04
                is_driver = val < 18.0
            elif feat == "Attendance":
                impact = (9.0 - val) * 0.06
                is_driver = val < 7.5
            elif feat == "Project":
                impact = (14.0 - val) * 0.03
                is_driver = val < 12.0
            elif feat == "Assignment on time percent":
                impact = (85.0 - val) * 0.01
                is_driver = val < 70.0
            elif feat == "Page Views":
                impact = (800.0 - val) * 0.0005
                is_driver = val < 400.0
            else:
                impact = 0.01

            contributions.append({
                "feature": feat,
                "label": HUMAN_FACTOR_NAMES.get(feat, feat),
                "value": round(float(val), 2),
                "impact": round(float(impact), 4),
                "is_risk_driver": bool(is_driver),
                "method": "heuristic",
                "is_shap": False
            })

    # Sort drivers on top
    contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
    return contributions[:5]

def batch_score_students(
    df_input: pd.DataFrame,
    model_dir="ml/models"
) -> pd.DataFrame:
    """
    Runs batch inference on student data DataFrame using trained models.
    Supports both full 14-column student dataset and 11-column feature matrix.
    """
    classifier, regressor, preprocessor, explainer, metadata = load_model_artifacts(model_dir=model_dir)

    # Ensure all required features exist in df_input (with reasonable fallbacks if missing)
    df_proc = df_input.copy()
    for col in FEATURE_COLUMNS:
        if col not in df_proc.columns:
            # Check lowercase or stripped variations
            match = None
            for c in df_proc.columns:
                if c.lower().replace(" ", "_") == col.lower().replace(" ", "_"):
                    match = c
                    break
            if match:
                df_proc[col] = df_proc[match]
            else:
                df_proc[col] = 0.0

    X_raw = df_proc[FEATURE_COLUMNS].astype(float)

    # Scale with fitted preprocessor scaler
    scaler = preprocessor["scaler"] if (preprocessor and "scaler" in preprocessor) else None
    if scaler is not None:
        X_scaled = pd.DataFrame(scaler.transform(X_raw), columns=FEATURE_COLUMNS, index=X_raw.index)
    else:
        X_scaled = X_raw

    # 1. Classification (Academic Risk Tier: 0: High/Low-risk, 1: Medium, 2: At-Risk/High-risk)
    has_proba = hasattr(classifier, "predict_proba")
    if has_proba:
        probs = classifier.predict_proba(X_scaled)
        preds_clf = np.argmax(probs, axis=1)
        # Class probabilities: map index 0 (High Perf) -> Low Risk, 1 -> Med Risk, 2 -> High Risk
        p_low = probs[:, 0]
        p_med = probs[:, 1]
        p_high = probs[:, 2] if probs.shape[1] > 2 else np.zeros(len(df_input))
        confidences = np.max(probs, axis=1)
        # Continuous risk score derived from model probabilities
        # Risk score = P(Med)*0.4 + P(High)*1.0
        risk_scores = p_med * 0.40 + p_high * 1.0
    else:
        preds_clf = classifier.predict(X_scaled)
        confidences = np.full(len(df_input), 0.88)
        probs = None
        risk_scores = np.where(preds_clf == 2, 0.90, np.where(preds_clf == 1, 0.50, 0.15))

    # 2. Regression (Predicted FinalGrade)
    if regressor is not None:
        predicted_grades = regressor.predict(X_scaled)
        predicted_grades = np.clip(predicted_grades, 0.0, 100.0)
    else:
        # Fallback to linear combination of components
        predicted_grades = np.clip(
            X_raw["QuizTotal"] + X_raw["Project"] + X_raw["Midterm"] + X_raw["Attendance"] + 18.0,
            0.0, 100.0
        )

    # 3. Precompute SHAP values across batch if explainer exists
    all_shap_values = None
    if explainer is not None:
        try:
            computed = explainer(X_scaled)
            all_shap_values = computed.values
        except Exception as e:
            all_shap_values = None

    now_iso = datetime.utcnow().isoformat()
    scored_records = []

    for i in range(len(df_input)):
        row = df_proc.iloc[i]
        sid = str(row.get("StudentID", row.get("student_id", f"STU{1001 + i}")))
        pred_idx = int(preds_clf[i])
        risk_lvl = INDEX_TO_RISK.get(pred_idx, "Medium")
        pred_grade = round(float(predicted_grades[i]), 2)
        r_score = round(float(np.clip(risk_scores[i], 0.02, 0.98)), 4)
        conf_val = round(float(confidences[i]), 3)

        observed_grade = None
        if "FinalGrade" in row and not pd.isna(row["FinalGrade"]):
            observed_grade = round(float(row["FinalGrade"]), 2)
        elif "final_grade" in row and not pd.isna(row["final_grade"]):
            observed_grade = round(float(row["final_grade"]), 2)

        # Risk probabilities dictionary
        if probs is not None:
            risk_probs = {
                "Low": round(float(p_low[i]), 3),
                "Medium": round(float(p_med[i]), 3),
                "High": round(float(p_high[i]), 3)
            }
        else:
            risk_probs = {
                "Low": 0.85 if risk_lvl == "Low" else (0.10 if risk_lvl == "High" else 0.25),
                "Medium": 0.55 if risk_lvl == "Medium" else 0.20,
                "High": 0.85 if risk_lvl == "High" else 0.05
            }

        # Contributing SHAP factors
        student_shap = all_shap_values[i] if (all_shap_values is not None and i < len(all_shap_values)) else None
        factors = compute_contributions_for_student(
            student_feats=row,
            classifier=classifier,
            explainer=explainer,
            predicted_class_idx=pred_idx,
            precomputed_shap=student_shap,
            scaler=scaler
        )

        # Recommendations
        recs = generate_recommendations(risk_level=risk_lvl, predicted_grade=pred_grade, factors=factors)

        # Engagement and summary metrics for UI display
        raw_att = float(row.get("Attendance", row.get("attendance", 9.0)))
        attendance_pct = round(min(100.0, raw_att * 10.0), 1)

        raw_mid = float(row.get("Midterm", 18.0))
        raw_quiz = float(row.get("QuizTotal", 20.0))
        raw_proj = float(row.get("Project", 14.0))
        # Normalized average percentage across course assessments
        avg_score_pct = round(((raw_mid / 26.0) * 0.4 + (raw_quiz / 24.0) * 0.4 + (raw_proj / 15.5) * 0.2) * 100.0, 1)

        # Score trend: relative difference between Midterm and Quiz
        score_trend = round((raw_mid / 26.0) - (raw_quiz / 24.0), 3)

        # LMS delays
        on_time_pct = float(row.get("Assignment on time percent", 88.0))
        avg_delay = round(max(0.0, (100.0 - on_time_pct) * 0.05), 2)

        # Composite engagement: combines attendance, participation, on-time submissions, and page views
        page_views = float(row.get("Page Views", 800.0))
        partic = float(row.get("Participation", 0.35))
        norm_views = min(100.0, (page_views / 1500.0) * 100.0)
        norm_partic = min(100.0, partic * 100.0)
        composite_eng = round(attendance_pct * 0.40 + on_time_pct * 0.30 + norm_views * 0.20 + norm_partic * 0.10, 1)

        alert_flag = bool(risk_lvl == "High" or pred_grade < 70.0 or raw_att < 6.5)

        scored_records.append({
            "student_id": sid,
            "computed_at": now_iso,
            "risk_level": risk_lvl,
            "risk_score": r_score,
            "predicted_grade": pred_grade,
            "observed_grade": observed_grade,
            "attendance_pct": attendance_pct,
            "avg_score": avg_score_pct,
            "score_trend": score_trend,
            "avg_submission_delay": avg_delay,
            "composite_engagement": composite_eng,
            "alert_flag": alert_flag,
            "confidence": conf_val,
            "risk_probabilities": json.dumps(risk_probs),
            "contributing_factors": json.dumps(factors),
            "recommendations": json.dumps(recs),
            "gender": int(row.get("Gender", 0)),
            "program": int(row.get("Program", 1)),
            "year_level": int(row.get("YearLevel", 3)),
            "class_time": int(row.get("ClassTime", 0))
        })

    return pd.DataFrame(scored_records)

def predict_single_student(student_data: Dict[str, Any], model_dir="ml/models") -> Dict[str, Any]:
    """
    Predicts academic performance and risk for an individual student record dictionary.
    """
    df_single = pd.DataFrame([student_data])
    df_scored = batch_score_students(df_single, model_dir=model_dir)
    row = df_scored.iloc[0].to_dict()
    row["contributing_factors"] = json.loads(row["contributing_factors"])
    row["recommendations"] = json.loads(row["recommendations"])
    row["risk_probabilities"] = json.loads(row["risk_probabilities"])
    return row

if __name__ == "__main__":
    df_raw = pd.read_csv("data/student_dataset.csv")
    scored = batch_score_students(df_raw)
    print(f"Batch scoring complete: {len(scored)} students scored.")
    print("\nRisk distribution:")
    print(scored["risk_level"].value_counts())
    print("\nSample predictions (first 5):")
    print(scored[["student_id", "risk_level", "risk_score", "predicted_grade", "observed_grade", "confidence"]].head())

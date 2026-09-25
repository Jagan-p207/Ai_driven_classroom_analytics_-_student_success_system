"""
Feature Engineering Module for Classroom Analytics and Student Success System.
Computes:
- Attendance percentage & attendance slope/trend
- Average assessment score & score trend (linear slope over recent assessments)
- Submission delay (average days late & delay trend slope)
- Missing submissions count
- Composite engagement score (0-100 fused index)
"""

import numpy as np
import pandas as pd
from typing import Dict, Tuple, List, Optional

def compute_linear_slope(y_values: np.ndarray) -> float:
    """
    Computes ordinary least squares linear regression slope for sequential points.
    If fewer than 2 points or constant, returns 0.0.
    """
    n = len(y_values)
    if n < 2:
        return 0.0
    x = np.arange(n, dtype=float)
    x_mean = np.mean(x)
    y_mean = np.mean(y_values)
    numerator = np.sum((x - x_mean) * (y_values - y_mean))
    denominator = np.sum((x - x_mean) ** 2)
    if denominator == 0:
        return 0.0
    return float(numerator / denominator)

def validate_raw_data(
    df_students: pd.DataFrame,
    df_attendance: pd.DataFrame,
    df_assessments: pd.DataFrame,
    df_lms: pd.DataFrame
) -> Dict[str, List[str]]:
    """
    Validates data completeness, schema, and flags missing/malformed records.
    Returns dictionary of warnings/issues found.
    """
    issues = {
        "students": [],
        "attendance": [],
        "assessments": [],
        "lms": []
    }

    # Students validation
    if "student_id" not in df_students.columns:
        issues["students"].append("Missing required column: student_id")
    else:
        duplicates = df_students["student_id"].duplicated().sum()
        if duplicates > 0:
            issues["students"].append(f"Found {duplicates} duplicate student_ids")
        null_ids = df_students["student_id"].isnull().sum()
        if null_ids > 0:
            issues["students"].append(f"Found {null_ids} null student_ids")

    # Attendance validation
    req_att = ["student_id", "date", "status"]
    for col in req_att:
        if col not in df_attendance.columns:
            issues["attendance"].append(f"Missing column: {col}")
    valid_statuses = {"Present", "Late", "Absent"}
    if "status" in df_attendance.columns:
        invalid_statuses = set(df_attendance["status"].unique()) - valid_statuses
        if invalid_statuses:
            issues["attendance"].append(f"Unrecognized attendance statuses: {invalid_statuses}")

    # Assessments validation
    req_ass = ["student_id", "assessment_name", "date", "max_score", "score_obtained"]
    for col in req_ass:
        if col not in df_assessments.columns:
            issues["assessments"].append(f"Missing column: {col}")
    if "score_obtained" in df_assessments.columns and "max_score" in df_assessments.columns:
        invalid_scores = (df_assessments["score_obtained"] < 0) | (df_assessments["score_obtained"] > df_assessments["max_score"] * 1.05)
        if invalid_scores.sum() > 0:
            issues["assessments"].append(f"Found {invalid_scores.sum()} scores out of valid range")

    # LMS validation
    req_lms = ["student_id", "activity_type", "delay_days", "completion_status"]
    for col in req_lms:
        if col not in df_lms.columns:
            issues["lms"].append(f"Missing column: {col}")

    return issues

def engineer_features(
    df_students: pd.DataFrame,
    df_attendance: pd.DataFrame,
    df_assessments: pd.DataFrame,
    df_lms: pd.DataFrame
) -> pd.DataFrame:
    """
    Transforms raw normalized tables into student-level ML feature vectors.
    """
    features = []

    # Map student metadata
    student_ids = df_students["student_id"].unique()

    # Pre-sort to guarantee chronological order for slope calculations
    if "date" in df_attendance.columns:
        df_attendance = df_attendance.sort_values(by=["student_id", "date"])
    if "date" in df_assessments.columns:
        df_assessments = df_assessments.sort_values(by=["student_id", "date"])
    if "timestamp" in df_lms.columns:
        df_lms = df_lms.sort_values(by=["student_id", "timestamp"])

    # Grouped data
    att_grouped = df_attendance.groupby("student_id")
    ass_grouped = df_assessments.groupby("student_id")
    lms_grouped = df_lms.groupby("student_id")

    for sid in student_ids:
        # 1. Attendance Features
        if sid in att_grouped.groups:
            s_att = att_grouped.get_group(sid)
            total_sessions = len(s_att)
            p_count = (s_att["status"] == "Present").sum()
            l_count = (s_att["status"] == "Late").sum()
            a_count = (s_att["status"] == "Absent").sum()

            att_pct = ((p_count + 0.5 * l_count) / max(1, total_sessions)) * 100.0

            # Trend: Map Present=1.0, Late=0.5, Absent=0.0
            status_numeric = s_att["status"].map({"Present": 1.0, "Late": 0.5, "Absent": 0.0}).fillna(0.0).values
            att_trend = compute_linear_slope(status_numeric) * 10.0 # scale for interpretability
        else:
            total_sessions, p_count, l_count, a_count = 0, 0, 0, 0
            att_pct = 0.0
            att_trend = 0.0

        # 2. Assessment Features
        if sid in ass_grouped.groups:
            s_ass = ass_grouped.get_group(sid)
            # percentage scores
            pct_scores = (s_ass["score_obtained"] / s_ass["max_score"].replace(0, 1)) * 100.0
            pct_scores = pct_scores.clip(lower=0.0, upper=100.0).values

            avg_score = float(np.mean(pct_scores))
            score_std = float(np.std(pct_scores)) if len(pct_scores) > 1 else 0.0
            min_score = float(np.min(pct_scores))
            max_score = float(np.max(pct_scores))
            recent_score = float(pct_scores[-1])
            # Slope across assessments
            score_trend = compute_linear_slope(pct_scores)
        else:
            avg_score, score_std, min_score, max_score, recent_score, score_trend = 0.0, 0.0, 0.0, 0.0, 0.0, 0.0

        # 3. LMS & Submission Features
        if sid in lms_grouped.groups:
            s_lms = lms_grouped.get_group(sid)
            delays = s_lms["delay_days"].fillna(0).astype(float).values
            # Effective delays (delays >= 0)
            non_neg_delays = np.maximum(0.0, delays)
            avg_delay = float(np.mean(non_neg_delays))
            max_delay = float(np.max(non_neg_delays))
            delay_trend = compute_linear_slope(delays)

            missing_count = int((s_lms["completion_status"] == "Missing").sum())
            completed_count = int((s_lms["completion_status"] == "Completed").sum())
            completion_rate = (completed_count / max(1, len(s_lms))) * 100.0
            avg_views = float(s_lms["score_or_views"].mean()) if "score_or_views" in s_lms.columns else 10.0
        else:
            avg_delay, max_delay, delay_trend, missing_count, completion_rate, avg_views = 0.0, 0.0, 0.0, 0, 0.0, 0.0

        # 4. Composite Engagement Score (0 - 100 index)
        # Weights: Attendance (35%), Assessment (30%), Timeliness (20%), LMS (15%)
        att_component = np.clip(att_pct, 0.0, 100.0) * 0.35
        acad_component = np.clip(avg_score, 0.0, 100.0) * 0.30
        timeliness_score = max(0.0, 100.0 - (avg_delay * 12.0) - (missing_count * 15.0))
        time_component = timeliness_score * 0.20
        lms_component = min(100.0, (completion_rate * 0.7) + (min(30.0, avg_views) * 1.0)) * 0.15

        composite_engagement = round(float(att_component + acad_component + time_component + lms_component), 2)
        composite_engagement = max(0.0, min(100.0, composite_engagement))

        features.append({
            "student_id": sid,
            "attendance_pct": round(float(att_pct), 2),
            "attendance_trend": round(float(att_trend), 4),
            "avg_score": round(float(avg_score), 2),
            "recent_score": round(float(recent_score), 2),
            "score_std": round(float(score_std), 2),
            "score_trend": round(float(score_trend), 4),
            "avg_submission_delay": round(float(avg_delay), 2),
            "max_submission_delay": round(float(max_delay), 2),
            "submission_delay_trend": round(float(delay_trend), 4),
            "missing_submissions_count": missing_count,
            "completion_rate": round(float(completion_rate), 2),
            "composite_engagement": composite_engagement
        })

    df_features = pd.DataFrame(features)
    # Merge basic student metadata (name, email, class_id)
    df_merged = df_students[["student_id", "name", "email", "class_id", "department"]].merge(
        df_features, on="student_id", how="inner"
    )
    return df_merged

if __name__ == "__main__":
    import os
    print("Testing feature engineering...")
    raw_dir = "data/raw"
    proc_dir = "data/processed"
    os.makedirs(proc_dir, exist_ok=True)

    df_stu = pd.read_csv(os.path.join(raw_dir, "students.csv"))
    df_att = pd.read_csv(os.path.join(raw_dir, "attendance.csv"))
    df_ass = pd.read_csv(os.path.join(raw_dir, "assessments.csv"))
    df_lms = pd.read_csv(os.path.join(raw_dir, "lms_activity.csv"))

    issues = validate_raw_data(df_stu, df_att, df_ass, df_lms)
    print("Validation check issues:", issues)

    df_feats = engineer_features(df_stu, df_att, df_ass, df_lms)
    out_path = os.path.join(proc_dir, "features.csv")
    df_feats.to_csv(out_path, index=False)
    print(f"Features computed for {len(df_feats)} students. Saved to {out_path}.")
    print("Sample feature record:")
    print(df_feats[["student_id", "attendance_pct", "avg_score", "score_trend", "avg_submission_delay", "composite_engagement"]].head())

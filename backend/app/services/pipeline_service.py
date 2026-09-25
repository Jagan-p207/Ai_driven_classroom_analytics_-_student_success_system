"""
Pipeline Service: Coordinates Data Ingestion, Feature Computation, and Risk Recomputation.
Connects SQLite/PostgreSQL tables with Feature Engineering and ML Batch Scorer.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.schema import Student, Attendance, Assessment, LMSActivity, RiskScore
from backend.app.core.config import settings
from ml.feature_engineering import engineer_features, validate_raw_data
from ml.batch_scorer import batch_score_students

def init_db():
    """Create all tables in the database."""
    Base.metadata.create_all(bind=engine)

def seed_database_from_csv(data_dir="data/raw"):
    """
    Seeds database from generated raw CSV files if tables are empty.
    """
    init_db()
    db: Session = SessionLocal()
    try:
        student_count = db.query(Student).count()
        if student_count > 0:
            print(f"Database already populated ({student_count} students). Skipping seed.")
            return

        students_csv = os.path.join(data_dir, "students.csv")
        attendance_csv = os.path.join(data_dir, "attendance.csv")
        assessments_csv = os.path.join(data_dir, "assessments.csv")
        lms_csv = os.path.join(data_dir, "lms_activity.csv")

        if not os.path.exists(students_csv):
            print(f"Seed files not found in {data_dir}. Run synthetic_data_generator first.")
            return

        print("Populating database from raw CSVs...")
        df_students = pd.read_csv(students_csv)
        df_attendance = pd.read_csv(attendance_csv)
        df_assessments = pd.read_csv(assessments_csv)
        df_lms = pd.read_csv(lms_csv)

        # 1. Insert Students
        for _, row in df_students.iterrows():
            db.add(Student(
                student_id=str(row["student_id"]),
                name=str(row["name"]),
                email=str(row["email"]),
                class_id=str(row.get("class_id", "CS101")),
                department=str(row.get("department", "Computer Science")),
                enrollment_date=str(row.get("enrollment_date", "2026-01-15"))
            ))
        db.commit()

        # 2. Insert Attendance
        att_objs = [
            Attendance(
                student_id=str(r["student_id"]),
                date=str(r["date"]),
                status=str(r["status"]),
                course_id=str(r.get("course_id", "CS101"))
            )
            for _, r in df_attendance.iterrows()
        ]
        db.bulk_save_objects(att_objs)
        db.commit()

        # 3. Insert Assessments
        ass_objs = [
            Assessment(
                student_id=str(r["student_id"]),
                assessment_name=str(r["assessment_name"]),
                date=str(r["date"]),
                max_score=float(r["max_score"]),
                score_obtained=float(r["score_obtained"]),
                course_id=str(r.get("course_id", "CS101"))
            )
            for _, r in df_assessments.iterrows()
        ]
        db.bulk_save_objects(ass_objs)
        db.commit()

        # 4. Insert LMS Activity
        lms_objs = [
            LMSActivity(
                student_id=str(r["student_id"]),
                activity_type=str(r["activity_type"]),
                timestamp=str(r["timestamp"]),
                delay_days=float(r.get("delay_days", 0.0)),
                completion_status=str(r.get("completion_status", "Completed")),
                score_or_views=float(r.get("score_or_views", 0.0))
            )
            for _, r in df_lms.iterrows()
        ]
        db.bulk_save_objects(lms_objs)
        db.commit()

        print("Database seeded successfully! Now computing features & initial risk scores...")
        run_full_batch_pipeline(db)

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

def run_full_batch_pipeline(db: Session) -> Dict[str, Any]:
    """
    1. Reads normalized tables from DB into Pandas DataFrames.
    2. Runs feature engineering.
    3. Runs batch scoring model.
    4. Updates/Inserts Risk_Score table.
    """
    t0 = time.time()
    
    # Extract from DB
    students = db.query(Student).all()
    attendance = db.query(Attendance).all()
    assessments = db.query(Assessment).all()
    lms = db.query(LMSActivity).all()

    if not students:
        return {"status": "no_students", "students_scored": 0, "elapsed": 0.0}

    df_students = pd.DataFrame([{
        "student_id": s.student_id,
        "name": s.name,
        "email": s.email,
        "class_id": s.class_id,
        "department": s.department
    } for s in students])

    df_attendance = pd.DataFrame([{
        "student_id": a.student_id,
        "date": a.date,
        "status": a.status,
        "course_id": a.course_id
    } for a in attendance])

    df_assessments = pd.DataFrame([{
        "student_id": m.student_id,
        "assessment_name": m.assessment_name,
        "date": m.date,
        "max_score": m.max_score,
        "score_obtained": m.score_obtained,
        "course_id": m.course_id
    } for m in assessments])

    df_lms = pd.DataFrame([{
        "student_id": l.student_id,
        "activity_type": l.activity_type,
        "timestamp": l.timestamp,
        "delay_days": l.delay_days,
        "completion_status": l.completion_status,
        "score_or_views": l.score_or_views
    } for l in lms])

    # Feature Engineering
    df_features = engineer_features(df_students, df_attendance, df_assessments, df_lms)

    # Save to processed CSV
    os.makedirs(settings.DATA_PROCESSED_DIR, exist_ok=True)
    df_features.to_csv(os.path.join(settings.DATA_PROCESSED_DIR, "features.csv"), index=False)

    # Batch Scoring
    df_scored = batch_score_students(df_features, model_dir=settings.MODEL_DIR)

    # Clear old risk scores or record new snapshot
    # For a clean dashboard, we update or add latest risk score per student
    risk_dist = {"Low": 0, "Medium": 0, "High": 0}

    for _, row in df_scored.iterrows():
        sid = row["student_id"]
        r_level = row["risk_level"]
        risk_dist[r_level] = risk_dist.get(r_level, 0) + 1

        # Check existing latest score
        existing = db.query(RiskScore).filter(RiskScore.student_id == sid).order_by(desc(RiskScore.id)).first()

        if existing:
            existing.computed_at = row["computed_at"]
            existing.risk_level = r_level
            existing.risk_score = float(row["risk_score"])
            existing.attendance_pct = float(row["attendance_pct"])
            existing.avg_score = float(row["avg_score"])
            existing.score_trend = float(row["score_trend"])
            existing.avg_submission_delay = float(row["avg_submission_delay"])
            existing.composite_engagement = float(row["composite_engagement"])
            existing.alert_flag = bool(row["alert_flag"])
            existing.contributing_factors = row["contributing_factors"]
            existing.recommendations = row["recommendations"]
        else:
            new_score = RiskScore(
                student_id=sid,
                computed_at=row["computed_at"],
                risk_level=r_level,
                risk_score=float(row["risk_score"]),
                attendance_pct=float(row["attendance_pct"]),
                avg_score=float(row["avg_score"]),
                score_trend=float(row["score_trend"]),
                avg_submission_delay=float(row["avg_submission_delay"]),
                composite_engagement=float(row["composite_engagement"]),
                alert_flag=bool(row["alert_flag"]),
                contributing_factors=row["contributing_factors"],
                recommendations=row["recommendations"]
            )
            db.add(new_score)

    db.commit()
    elapsed = round(time.time() - t0, 3)

    return {
        "status": "success",
        "students_scored": len(df_scored),
        "execution_time_seconds": elapsed,
        "timestamp": datetime.utcnow().isoformat(),
        "risk_distribution": risk_dist
    }

def get_class_risk_summary(db: Session, class_id: str = "CS101") -> Dict[str, Any]:
    """
    Constructs class heat-map data, risk level counts, and high-risk alerts.
    """
    students = db.query(Student).filter(Student.class_id == class_id).all()
    if not students:
        # Fallback to all students if class_id is generic
        students = db.query(Student).all()

    total = len(students)
    if total == 0:
        return {
            "class_id": class_id,
            "total_students": 0,
            "risk_counts": {"Low": 0, "Medium": 0, "High": 0},
            "alert_count": 0,
            "avg_attendance": 0.0,
            "avg_score": 0.0,
            "avg_engagement": 0.0,
            "heatmap_data": [],
            "high_risk_alerts": []
        }

    heatmap_data = []
    high_risk_alerts = []
    risk_counts = {"Low": 0, "Medium": 0, "High": 0}
    total_att = 0.0
    total_score = 0.0
    total_eng = 0.0
    alert_count = 0

    for s in students:
        # Latest risk score
        rs = db.query(RiskScore).filter(RiskScore.student_id == s.student_id).order_by(desc(RiskScore.id)).first()
        if rs:
            r_level = rs.risk_level
            r_score = rs.risk_score
            att = rs.attendance_pct
            score = rs.avg_score
            trend = rs.score_trend
            eng = rs.composite_engagement
            is_alert = rs.alert_flag
            factors = json.loads(rs.contributing_factors or "[]")
            recs = json.loads(rs.recommendations or "[]")
        else:
            r_level = "Low"
            r_score = 0.1
            att, score, trend, eng, is_alert = 90.0, 80.0, 0.0, 85.0, False
            factors, recs = [], []

        risk_counts[r_level] = risk_counts.get(r_level, 0) + 1
        total_att += att
        total_score += score
        total_eng += eng
        if is_alert:
            alert_count += 1

        item = {
            "student_id": s.student_id,
            "name": s.name,
            "risk_level": r_level,
            "risk_score": r_score,
            "attendance_pct": att,
            "avg_score": score,
            "score_trend": trend,
            "composite_engagement": eng,
            "alert_flag": is_alert
        }
        heatmap_data.append(item)

        if r_level in ["Medium", "High"]:
            high_risk_alerts.append({
                "student_id": s.student_id,
                "name": s.name,
                "email": s.email,
                "risk_level": r_level,
                "risk_score": r_score,
                "primary_driver": factors[0]["label"] if factors else "General Decline",
                "recommendation": recs[0] if recs else "Monitor progress",
                "attendance_pct": att,
                "avg_score": score
            })

    # Sort heatmap by risk_score descending so high-risk are prominent
    heatmap_data.sort(key=lambda x: x["risk_score"], reverse=True)
    high_risk_alerts.sort(key=lambda x: x["risk_score"], reverse=True)

    return {
        "class_id": class_id,
        "total_students": total,
        "risk_counts": risk_counts,
        "alert_count": alert_count,
        "avg_attendance": round(total_att / max(1, total), 2),
        "avg_score": round(total_score / max(1, total), 2),
        "avg_engagement": round(total_eng / max(1, total), 2),
        "heatmap_data": heatmap_data,
        "high_risk_alerts": high_risk_alerts
    }

def get_student_risk_profile(db: Session, student_id: str) -> Optional[Dict[str, Any]]:
    """
    Returns student details, current risk assessment, contributing factors,
    recommendations, and historical trend series for attendance and marks.
    """
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return None

    # Latest risk score
    rs = db.query(RiskScore).filter(RiskScore.student_id == student_id).order_by(desc(RiskScore.id)).first()
    if not rs:
        # Generate default score if not computed yet
        rs_dict = {
            "id": 0,
            "student_id": student_id,
            "computed_at": datetime.utcnow().isoformat(),
            "risk_level": "Low",
            "risk_score": 0.1,
            "attendance_pct": 90.0,
            "avg_score": 85.0,
            "score_trend": 0.0,
            "avg_submission_delay": 0.0,
            "composite_engagement": 85.0,
            "alert_flag": False,
            "contributing_factors": [],
            "recommendations": ["No urgent intervention needed."]
        }
    else:
        rs_dict = {
            "id": rs.id,
            "student_id": rs.student_id,
            "computed_at": rs.computed_at,
            "risk_level": rs.risk_level,
            "risk_score": rs.risk_score,
            "attendance_pct": rs.attendance_pct,
            "avg_score": rs.avg_score,
            "score_trend": rs.score_trend,
            "avg_submission_delay": rs.avg_submission_delay,
            "composite_engagement": rs.composite_engagement,
            "alert_flag": rs.alert_flag,
            "contributing_factors": json.loads(rs.contributing_factors or "[]"),
            "recommendations": json.loads(rs.recommendations or "[]")
        }

    # Assessment history
    assessments = db.query(Assessment).filter(Assessment.student_id == student_id).order_by(Assessment.date).all()
    ass_history = [{
        "name": a.assessment_name,
        "date": a.date,
        "score_obtained": a.score_obtained,
        "max_score": a.max_score,
        "percentage": round((a.score_obtained / max(1.0, a.max_score)) * 100.0, 1)
    } for a in assessments]

    # Attendance history (aggregate by week or chronologically)
    attendance = db.query(Attendance).filter(Attendance.student_id == student_id).order_by(Attendance.date).all()
    att_history = [{
        "date": a.date,
        "status": a.status,
        "numeric_value": 1.0 if a.status == "Present" else (0.5 if a.status == "Late" else 0.0)
    } for a in attendance]

    # LMS activity
    lms_records = db.query(LMSActivity).filter(LMSActivity.student_id == student_id).order_by(LMSActivity.timestamp).all()
    lms_history = [{
        "activity_type": l.activity_type,
        "timestamp": l.timestamp,
        "delay_days": l.delay_days,
        "completion_status": l.completion_status,
        "score_or_views": l.score_or_views
    } for l in lms_records]

    return {
        "student": {
            "student_id": student.student_id,
            "name": student.name,
            "email": student.email,
            "class_id": student.class_id,
            "department": student.department,
            "enrollment_date": student.enrollment_date
        },
        "current_risk": rs_dict,
        "assessment_history": ass_history,
        "attendance_history": att_history,
        "recent_lms_activities": lms_history
    }

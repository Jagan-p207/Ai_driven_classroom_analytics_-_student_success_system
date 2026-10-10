"""
Pipeline Service: Coordinates Data Ingestion, Feature Computation, and Risk Recomputation.
Connects SQLite/PostgreSQL tables with Feature Engineering and ML Batch Scorer.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text

from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.schema import Student, Attendance, Assessment, LMSActivity, RiskScore, Intervention
from backend.app.core.config import settings
from ml.feature_engineering import engineer_features, validate_raw_data
from ml.batch_scorer import batch_score_students

def init_db():
    """Create all tables in the database and ensure column compatibility."""
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(risk_scores)"))
            cols = [row[1] for row in result.fetchall()]
            if cols:
                if "confidence" not in cols:
                    conn.execute(text("ALTER TABLE risk_scores ADD COLUMN confidence FLOAT DEFAULT 0.9"))
                if "risk_probabilities" not in cols:
                    conn.execute(text("ALTER TABLE risk_scores ADD COLUMN risk_probabilities TEXT"))
                conn.commit()
    except Exception:
        pass

def seed_initial_interventions_and_history(db: Session):
    """
    Ensures realistic sample interventions and milestone risk score snapshots
    exist for demo / pilot verification.
    """
    students = db.query(Student).all()
    if not students:
        return

    # 1. Seed interventions if empty
    if db.query(Intervention).count() == 0:
        sample_interventions = [
            ("STU1005", "Planned", "Dr. Elena Vance (Academic Counselor)", "2026-05-20", "Scheduled academic advising after sharp midterm score drop."),
            ("STU1012", "In Progress", "Prof. Marcus Davis (Lead Instructor)", "2026-04-15", "Student missing weekly quizzes; follow-up needed on homework submissions."), # Overdue
            ("STU1018", "In Progress", "Sarah Jenkins (Peer Tutoring)", "2026-05-18", "Enrolled in peer mentoring group for Algorithms."),
            ("STU1024", "In Progress", "Dr. Elena Vance (Academic Counselor)", "2026-04-20", "Attendance dropped below 75%; parental contact advised."), # Overdue
            ("STU1033", "Planned", "Academic Support Center", "2026-05-22", "Provided workshop registration for study skills and exam review."),
            ("STU1041", "Completed", "Prof. Marcus Davis (Lead Instructor)", "2026-05-02", "Conducted 1-on-1 office hour review of exam 2 errors."),
            ("STU1055", "Resolved", "Dr. Elena Vance (Academic Counselor)", "2026-05-05", "Attendance and scores restored to target range (>80%). Case resolved."),
            ("STU1067", "In Progress", "Sarah Jenkins (Peer Tutoring)", "2026-05-25", "Ongoing bi-weekly practice assignments for coursework recovery.")
        ]
        now_iso = datetime.utcnow().isoformat()
        for sid, status, staff, f_date, notes in sample_interventions:
            # Check student exists
            s = db.query(Student).filter(Student.student_id == sid).first()
            if s:
                db.add(Intervention(
                    student_id=sid,
                    status=status,
                    assigned_staff=staff,
                    follow_up_date=f_date,
                    notes=notes,
                    created_at="2026-04-02T10:00:00",
                    updated_at=now_iso
                ))
        db.commit()

    # 2. Seed milestone historical risk snapshots if students only have 1 risk record
    first_sid = students[0].student_id
    if db.query(RiskScore).filter(RiskScore.student_id == first_sid).count() <= 1:
        # Create historical snapshots for Quiz 1 (Feb 2026) and Midterm (Apr 2026)
        milestone_dates = [
            ("2026-02-25T14:00:00", 0.85, 0.90, "Quiz 1 Milestone"),
            ("2026-04-05T14:00:00", 0.95, 1.05, "Midterm Exam Milestone")
        ]
        new_hist_scores = []
        for s in students:
            latest_rs = db.query(RiskScore).filter(RiskScore.student_id == s.student_id).order_by(desc(RiskScore.id)).first()
            base_score = latest_rs.risk_score if latest_rs else 0.2
            base_eng = latest_rs.composite_engagement if latest_rs else 80.0

            for m_date, factor_score, factor_eng, m_name in milestone_dates:
                # Early semester risk is usually lower or slightly different
                m_score = float(np.clip(base_score * factor_score + (0.05 if factor_score < 1.0 else -0.05), 0.05, 0.98))
                m_level = "High" if m_score >= 0.70 else ("Medium" if m_score >= 0.35 else "Low")
                m_eng = float(np.clip(base_eng * factor_eng, 20.0, 98.0))

                new_hist_scores.append(RiskScore(
                    student_id=s.student_id,
                    computed_at=m_date,
                    risk_level=m_level,
                    risk_score=round(m_score, 4),
                    attendance_pct=round(latest_rs.attendance_pct if latest_rs else 85.0, 2),
                    avg_score=round(latest_rs.avg_score if latest_rs else 80.0, 2),
                    score_trend=round(latest_rs.score_trend if latest_rs else 0.0, 4),
                    avg_submission_delay=round(latest_rs.avg_submission_delay if latest_rs else 0.5, 2),
                    composite_engagement=round(m_eng, 2),
                    alert_flag=bool(m_level in ["Medium", "High"]),
                    contributing_factors=latest_rs.contributing_factors if latest_rs else "[]",
                    recommendations=latest_rs.recommendations if latest_rs else "[]",
                    confidence=0.88,
                    risk_probabilities=json.dumps({"Low": 0.2, "Medium": 0.3, "High": 0.5}) if m_level == "High" else json.dumps({"Low": 0.8, "Medium": 0.15, "High": 0.05})
                ))
        if new_hist_scores:
            db.bulk_save_objects(new_hist_scores)
            db.commit()

def seed_database_from_csv(data_dir="data/raw"):
    """
    Seeds database from generated raw CSV files if tables are empty.
    """
    init_db()
    db: Session = SessionLocal()
    try:
        student_count = db.query(Student).count()
        if student_count > 0:
            print(f"Database already populated ({student_count} students). Ensuring interventions & history are initialized.")
            seed_initial_interventions_and_history(db)
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
        conf_val = float(row.get("confidence", 0.90))
        prob_val = str(row.get("risk_probabilities", "{}"))

        # If computed today, update existing; otherwise insert a new snapshot to preserve history
        if existing and existing.computed_at and existing.computed_at[:10] == row["computed_at"][:10]:
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
            existing.confidence = conf_val
            existing.risk_probabilities = prob_val
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
                recommendations=row["recommendations"],
                confidence=conf_val,
                risk_probabilities=prob_val
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
    Constructs class heat-map data, risk level counts, high-risk alerts,
    and attached intervention status.
    """
    students = db.query(Student).filter(Student.class_id == class_id).all()
    if not students:
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
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

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

        # Latest intervention
        latest_inv = db.query(Intervention).filter(Intervention.student_id == s.student_id).order_by(desc(Intervention.id)).first()
        inv_status = latest_inv.status if latest_inv else None
        is_overdue = bool(latest_inv and latest_inv.status in ["Planned", "In Progress"] and latest_inv.follow_up_date and latest_inv.follow_up_date < today_str)

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
            "alert_flag": is_alert,
            "intervention_status": inv_status
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
                "avg_score": score,
                "intervention_status": inv_status,
                "is_overdue": is_overdue,
                "assigned_staff": latest_inv.assigned_staff if latest_inv else None
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
    recommendations, historical risk trajectory, interventions, and trend series.
    """
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return None

    # Latest risk score
    rs = db.query(RiskScore).filter(RiskScore.student_id == student_id).order_by(desc(RiskScore.id)).first()
    if not rs:
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
            "recommendations": ["No urgent intervention needed."],
            "confidence": 0.90,
            "risk_probabilities": {"Low": 0.85, "Medium": 0.12, "High": 0.03}
        }
    else:
        # Parse probabilities
        probs = None
        if hasattr(rs, "risk_probabilities") and rs.risk_probabilities:
            try:
                probs = json.loads(rs.risk_probabilities)
            except Exception:
                probs = None
        if not probs:
            if rs.risk_level == "High":
                probs = {"Low": 0.05, "Medium": 0.20, "High": 0.75}
            elif rs.risk_level == "Medium":
                probs = {"Low": 0.20, "Medium": 0.65, "High": 0.15}
            else:
                probs = {"Low": 0.85, "Medium": 0.12, "High": 0.03}

        conf = getattr(rs, "confidence", None)
        if conf is None:
            conf = 0.92 if rs.risk_level == "High" else 0.88

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
            "recommendations": json.loads(rs.recommendations or "[]"),
            "confidence": conf,
            "risk_probabilities": probs
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

    # Attendance history
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

    # Historical risk scores
    hist_records = db.query(RiskScore).filter(RiskScore.student_id == student_id).order_by(RiskScore.id).all()
    historical_risk_scores = [{
        "id": h.id,
        "computed_at": h.computed_at,
        "risk_level": h.risk_level,
        "risk_score": h.risk_score,
        "composite_engagement": h.composite_engagement
    } for h in hist_records]

    # Student Interventions with overdue detection
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    interventions_records = db.query(Intervention).filter(Intervention.student_id == student_id).order_by(desc(Intervention.id)).all()
    interventions = [{
        "id": inv.id,
        "student_id": inv.student_id,
        "status": inv.status,
        "assigned_staff": inv.assigned_staff,
        "follow_up_date": inv.follow_up_date,
        "notes": inv.notes,
        "created_at": inv.created_at,
        "updated_at": inv.updated_at,
        "is_overdue": bool(inv.status in ["Planned", "In Progress"] and inv.follow_up_date and inv.follow_up_date < today_str)
    } for inv in interventions_records]

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
        "recent_lms_activities": lms_history,
        "historical_risk_scores": historical_risk_scores,
        "interventions": interventions
    }

def get_historical_analytics(db: Session, class_id: str = "CS101") -> Dict[str, Any]:
    """
    Computes class-level historical milestone trends, attendance progression,
    risk shifts, and intervention management status.
    """
    students = db.query(Student).filter(Student.class_id == class_id).all()
    if not students:
        students = db.query(Student).all()
    student_ids = [s.student_id for s in students]

    if not student_ids:
        return {
            "class_id": class_id,
            "milestones": [],
            "attendance_trend_overall": [],
            "risk_tier_shifts": {"improved": 0, "stable": 0, "declined": 0},
            "intervention_metrics": {"total": 0, "planned": 0, "in_progress": 0, "completed": 0, "resolved": 0, "overdue": 0}
        }

    # 1. Chronological assessment milestones
    distinct_assessments = (
        db.query(Assessment.assessment_name, Assessment.date)
        .filter(Assessment.student_id.in_(student_ids))
        .distinct()
        .order_by(Assessment.date)
        .all()
    )

    milestones = []
    for ass_name, ass_date in distinct_assessments:
        records = db.query(Assessment).filter(
            Assessment.student_id.in_(student_ids),
            Assessment.assessment_name == ass_name
        ).all()
        if not records:
            continue
        scores_pct = [(r.score_obtained / max(1.0, r.max_score)) * 100.0 for r in records]
        avg_score_pct = round(float(np.mean(scores_pct)), 1)
        passing_rate = round(float(np.mean([1.0 if sp >= 60.0 else 0.0 for sp in scores_pct])) * 100.0, 1)

        high_cnt = sum(1 for sp in scores_pct if sp < 60.0)
        med_cnt = sum(1 for sp in scores_pct if 60.0 <= sp < 75.0)
        low_cnt = len(scores_pct) - high_cnt - med_cnt

        milestones.append({
            "assessment_name": ass_name,
            "date": ass_date,
            "avg_score_pct": avg_score_pct,
            "passing_rate_pct": passing_rate,
            "high_risk_count": high_cnt,
            "medium_risk_count": med_cnt,
            "low_risk_count": low_cnt
        })

    # 2. Overall attendance trend by weekly / session points
    attendance_records = (
        db.query(Attendance)
        .filter(Attendance.student_id.in_(student_ids))
        .order_by(Attendance.date)
        .all()
    )
    att_by_date = {}
    for att in attendance_records:
        val = 1.0 if att.status == "Present" else (0.5 if att.status == "Late" else 0.0)
        att_by_date.setdefault(att.date, []).append(val)

    attendance_trend_overall = []
    sorted_dates = sorted(att_by_date.keys())
    # Subsample ~12 evenly-spaced points for clean visualization
    step = max(1, len(sorted_dates) // 12)
    for i in range(0, len(sorted_dates), step):
        d = sorted_dates[i]
        vals = att_by_date[d]
        rate = round(float(np.mean(vals)) * 100.0, 1)
        attendance_trend_overall.append({
            "date": d,
            "attendance_rate": rate
        })

    # 3. Risk tier shifts
    improved_cnt = 0
    stable_cnt = 0
    declined_cnt = 0
    tier_rank = {"Low": 0, "Medium": 1, "High": 2}

    for sid in student_ids:
        all_rs = db.query(RiskScore).filter(RiskScore.student_id == sid).order_by(RiskScore.id).all()
        if len(all_rs) >= 2:
            first_tier = tier_rank.get(all_rs[0].risk_level, 0)
            latest_tier = tier_rank.get(all_rs[-1].risk_level, 0)
            if latest_tier < first_tier:
                improved_cnt += 1
            elif latest_tier > first_tier:
                declined_cnt += 1
            else:
                stable_cnt += 1
        elif len(all_rs) == 1:
            trend = all_rs[0].score_trend
            if trend > 0.5:
                improved_cnt += 1
            elif trend < -0.5:
                declined_cnt += 1
            else:
                stable_cnt += 1

    risk_tier_shifts = {
        "improved": improved_cnt,
        "stable": stable_cnt,
        "declined": declined_cnt
    }

    # 4. Intervention metrics
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    all_invs = db.query(Intervention).filter(Intervention.student_id.in_(student_ids)).all()
    planned_cnt = sum(1 for inv in all_invs if inv.status == "Planned")
    in_progress_cnt = sum(1 for inv in all_invs if inv.status == "In Progress")
    completed_cnt = sum(1 for inv in all_invs if inv.status == "Completed")
    resolved_cnt = sum(1 for inv in all_invs if inv.status == "Resolved")
    overdue_cnt = sum(1 for inv in all_invs if inv.status in ["Planned", "In Progress"] and inv.follow_up_date < today_str)

    intervention_metrics = {
        "total": len(all_invs),
        "planned": planned_cnt,
        "in_progress": in_progress_cnt,
        "completed": completed_cnt,
        "resolved": resolved_cnt,
        "overdue": overdue_cnt
    }

    return {
        "class_id": class_id,
        "milestones": milestones,
        "attendance_trend_overall": attendance_trend_overall,
        "risk_tier_shifts": risk_tier_shifts,
        "intervention_metrics": intervention_metrics
    }

"""
Pipeline Service: Coordinates Data Ingestion, Feature Computation, Model Training, and Risk Scoring.
Connects SQLite/PostgreSQL tables with Machine Learning models and batch prediction services.
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
from ml.batch_scorer import batch_score_students, predict_single_student, FEATURE_COLUMNS
from ml.train_models import train_and_benchmark_models, load_and_preprocess_dataset

def init_db():
    """Create all tables in the database and ensure column compatibility via migrations."""
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            # 1. Ensure risk_scores has all required columns
            res_rs = conn.execute(text("PRAGMA table_info(risk_scores)"))
            cols_rs = [row[1] for row in res_rs.fetchall()]
            if cols_rs:
                if "confidence" not in cols_rs:
                    conn.execute(text("ALTER TABLE risk_scores ADD COLUMN confidence FLOAT DEFAULT 0.9"))
                if "risk_probabilities" not in cols_rs:
                    conn.execute(text("ALTER TABLE risk_scores ADD COLUMN risk_probabilities TEXT"))
                if "predicted_grade" not in cols_rs:
                    conn.execute(text("ALTER TABLE risk_scores ADD COLUMN predicted_grade FLOAT"))
                if "observed_grade" not in cols_rs:
                    conn.execute(text("ALTER TABLE risk_scores ADD COLUMN observed_grade FLOAT"))

            # 2. Ensure students table has cohort fields
            res_st = conn.execute(text("PRAGMA table_info(students)"))
            cols_st = [row[1] for row in res_st.fetchall()]
            if cols_st:
                if "gender" not in cols_st:
                    conn.execute(text("ALTER TABLE students ADD COLUMN gender INTEGER DEFAULT 0"))
                if "program" not in cols_st:
                    conn.execute(text("ALTER TABLE students ADD COLUMN program INTEGER DEFAULT 1"))
                if "year_level" not in cols_st:
                    conn.execute(text("ALTER TABLE students ADD COLUMN year_level INTEGER DEFAULT 3"))
                if "class_time" not in cols_st:
                    conn.execute(text("ALTER TABLE students ADD COLUMN class_time INTEGER DEFAULT 0"))

            conn.commit()
    except Exception as e:
        print(f"init_db column migration notice: {e}")

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
            ("F23", "Planned", "Dr. Elena Vance (Academic Counselor)", "2026-05-20", "Scheduled academic advising after sharp midterm score drop (<50)."),
            ("F25", "In Progress", "Prof. Marcus Davis (Lead Instructor)", "2026-04-15", "Student missing weekly quizzes; follow-up needed on homework submissions."),
            ("F33", "In Progress", "Sarah Jenkins (Peer Tutoring)", "2026-05-18", "Enrolled in peer mentoring group for core coursework recovery."),
            ("F66", "In Progress", "Dr. Elena Vance (Academic Counselor)", "2026-04-20", "Attendance dropped below 60%; parental contact and study advisor assigned."),
            ("F74", "Planned", "Academic Support Center", "2026-05-22", "Provided workshop registration for study skills and exam review."),
            ("F76", "Completed", "Prof. Marcus Davis (Lead Instructor)", "2026-05-02", "Conducted 1-on-1 office hour review of exam errors."),
            ("F126", "Resolved", "Dr. Elena Vance (Academic Counselor)", "2026-05-05", "Attendance and scores restored to target range (>75%). Case resolved."),
            ("F158", "In Progress", "Sarah Jenkins (Peer Tutoring)", "2026-05-25", "Ongoing bi-weekly practice assignments for coursework recovery.")
        ]
        now_iso = datetime.utcnow().isoformat()
        for sid, status, staff, f_date, notes in sample_interventions:
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
        milestone_dates = [
            ("2026-02-25T14:00:00", 0.88, "Quiz 1 Milestone"),
            ("2026-04-05T14:00:00", 0.95, "Midterm Exam Milestone")
        ]
        new_hist_scores = []
        for s in students:
            latest_rs = db.query(RiskScore).filter(RiskScore.student_id == s.student_id).order_by(desc(RiskScore.id)).first()
            base_score = latest_rs.risk_score if latest_rs else 0.2
            base_eng = latest_rs.composite_engagement if latest_rs else 80.0
            base_grade = latest_rs.predicted_grade if (latest_rs and latest_rs.predicted_grade) else 80.0

            for m_date, factor_score, m_name in milestone_dates:
                m_score = float(np.clip(base_score * factor_score + (0.04 if factor_score < 1.0 else -0.04), 0.05, 0.98))
                m_level = "High" if m_score >= 0.70 else ("Medium" if m_score >= 0.35 else "Low")
                m_eng = float(np.clip(base_eng * (1.1 - factor_score * 0.1), 20.0, 98.0))

                new_hist_scores.append(RiskScore(
                    student_id=s.student_id,
                    computed_at=m_date,
                    risk_level=m_level,
                    risk_score=round(m_score, 4),
                    predicted_grade=round(base_grade * factor_score, 2),
                    observed_grade=latest_rs.observed_grade if latest_rs else None,
                    attendance_pct=round(latest_rs.attendance_pct if latest_rs else 85.0, 2),
                    avg_score=round(latest_rs.avg_score if latest_rs else 80.0, 2),
                    score_trend=round(latest_rs.score_trend if latest_rs else 0.0, 4),
                    avg_submission_delay=round(latest_rs.avg_submission_delay if latest_rs else 0.5, 2),
                    composite_engagement=round(m_eng, 2),
                    alert_flag=bool(m_level == "High"),
                    contributing_factors=latest_rs.contributing_factors if latest_rs else "[]",
                    recommendations=latest_rs.recommendations if latest_rs else "[]",
                    confidence=0.88,
                    risk_probabilities=json.dumps({"Low": 0.8, "Medium": 0.15, "High": 0.05}) if m_level == "Low" else json.dumps({"Low": 0.1, "Medium": 0.3, "High": 0.6})
                ))
        if new_hist_scores:
            db.bulk_save_objects(new_hist_scores)
            db.commit()

def seed_database_from_csv(data_dir=None, force=False):
    """
    Seeds database from full student dataset (data/student_dataset.csv) or fallback raw CSVs.
    """
    init_db()
    db: Session = SessionLocal()
    try:
        student_count = db.query(Student).count()
        # If already populated with 192 students and not forced, return
        if student_count >= 192 and not force:
            print(f"Database already populated ({student_count} students). Initializing history & interventions if needed.")
            seed_initial_interventions_and_history(db)
            return

        # Find full student dataset CSV
        full_csv = "data/student_dataset.csv"
        if not os.path.exists(full_csv):
            alt = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "student_dataset.csv")
            if os.path.exists(alt):
                full_csv = alt

        if os.path.exists(full_csv):
            print(f"Populating database from full institutional dataset: {full_csv}...")
            df = pd.read_csv(full_csv)

            # Clear existing data if re-seeding full dataset
            if student_count > 0:
                print(f"Replacing previous {student_count} records with full 192-student dataset...")
                db.query(Intervention).delete()
                db.query(RiskScore).delete()
                db.query(LMSActivity).delete()
                db.query(Assessment).delete()
                db.query(Attendance).delete()
                db.query(Student).delete()
                db.commit()

            # 1. Add Student records
            student_objs = []
            for _, r in df.iterrows():
                sid = str(r["StudentID"])
                prog = int(r.get("Program", 1))
                yr = int(r.get("YearLevel", 3))
                ctime = int(r.get("ClassTime", 0))
                gen = int(r.get("Gender", 0))

                student_objs.append(Student(
                    student_id=sid,
                    name=f"Student {sid}",
                    email=f"{sid.lower()}@university.edu",
                    class_id="CS101",
                    department="Computer Science & Engineering",
                    enrollment_date="2024-09-01",
                    gender=gen,
                    program=prog,
                    year_level=yr,
                    class_time=ctime
                ))
            db.bulk_save_objects(student_objs)
            db.commit()

            # 2. Add Assessment records matching actual Quiz, Project, Midterm, and Final
            ass_objs = []
            for _, r in df.iterrows():
                sid = str(r["StudentID"])
                # Quiz Total
                ass_objs.append(Assessment(
                    student_id=sid,
                    assessment_name="Continuous Quizzes Total",
                    date="2026-03-05",
                    max_score=24.0,
                    score_obtained=float(r["QuizTotal"]),
                    course_id="CS101"
                ))
                # Project Coursework
                ass_objs.append(Assessment(
                    student_id=sid,
                    assessment_name="Coursework Project",
                    date="2026-03-22",
                    max_score=15.5,
                    score_obtained=float(r["Project"]),
                    course_id="CS101"
                ))
                # Midterm Exam
                ass_objs.append(Assessment(
                    student_id=sid,
                    assessment_name="Midterm Examination",
                    date="2026-04-02",
                    max_score=26.0,
                    score_obtained=float(r["Midterm"]),
                    course_id="CS101"
                ))
                # Final Exam
                ass_objs.append(Assessment(
                    student_id=sid,
                    assessment_name="Final Examination",
                    date="2026-05-10",
                    max_score=28.0,
                    score_obtained=float(r["Final"]),
                    course_id="CS101"
                ))
            db.bulk_save_objects(ass_objs)
            db.commit()

            # 3. Add Attendance session records matching Attendance (out of 10)
            att_objs = []
            session_dates = [
                "2026-01-20", "2026-01-27", "2026-02-03", "2026-02-10", "2026-02-17",
                "2026-02-24", "2026-03-03", "2026-03-17", "2026-03-24", "2026-04-07"
            ]
            for _, r in df.iterrows():
                sid = str(r["StudentID"])
                att_score = float(r["Attendance"])
                present_count = min(10, int(np.floor(att_score)))
                has_late = bool((att_score - present_count) >= 0.4)

                for idx, s_date in enumerate(session_dates):
                    if idx < present_count:
                        status = "Present"
                    elif idx == present_count and has_late:
                        status = "Late"
                    else:
                        status = "Absent"

                    att_objs.append(Attendance(
                        student_id=sid,
                        date=s_date,
                        status=status,
                        course_id="CS101"
                    ))
            db.bulk_save_objects(att_objs)
            db.commit()

            # 4. Add LMS Activity records matching Page Views and on-time percent
            lms_objs = []
            for _, r in df.iterrows():
                sid = str(r["StudentID"])
                views = float(r["Page Views"])
                on_time_pct = float(r["Assignment on time percent"])

                # Page views record
                lms_objs.append(LMSActivity(
                    student_id=sid,
                    activity_type="Course Content Page Views",
                    timestamp="2026-04-10T12:00:00",
                    delay_days=0.0,
                    completion_status="Completed",
                    score_or_views=views
                ))

                # Assignment submission punctuality
                late_days = round(max(0.0, (100.0 - on_time_pct) * 0.05), 1)
                comp_status = "Completed" if on_time_pct >= 90 else ("Late" if on_time_pct >= 50 else "Missing")
                lms_objs.append(LMSActivity(
                    student_id=sid,
                    activity_type="Coursework Submissions",
                    timestamp="2026-03-28T18:00:00",
                    delay_days=late_days,
                    completion_status=comp_status,
                    score_or_views=on_time_pct
                ))
            db.bulk_save_objects(lms_objs)
            db.commit()

            # 5. Run Batch Scoring using fitted models
            print("Database populated with 192 students! Now running batch scoring pipeline...")
            df_scored = batch_score_students(df, model_dir=settings.MODEL_DIR)

            risk_objs = []
            for _, row in df_scored.iterrows():
                risk_objs.append(RiskScore(
                    student_id=row["student_id"],
                    computed_at=row["computed_at"],
                    risk_level=row["risk_level"],
                    risk_score=float(row["risk_score"]),
                    predicted_grade=float(row["predicted_grade"]),
                    observed_grade=float(row["observed_grade"]) if row["observed_grade"] is not None else None,
                    attendance_pct=float(row["attendance_pct"]),
                    avg_score=float(row["avg_score"]),
                    score_trend=float(row["score_trend"]),
                    avg_submission_delay=float(row["avg_submission_delay"]),
                    composite_engagement=float(row["composite_engagement"]),
                    alert_flag=bool(row["alert_flag"]),
                    contributing_factors=row["contributing_factors"],
                    recommendations=row["recommendations"],
                    confidence=float(row["confidence"]),
                    risk_probabilities=row["risk_probabilities"]
                ))
            db.bulk_save_objects(risk_objs)
            db.commit()

            # 6. Seed interventions and milestone history
            seed_initial_interventions_and_history(db)
            print("Full dataset seeded and scored successfully!")
            return

        # Fallback to data_dir/students.csv if full dataset not found
        fallback_dir = data_dir or settings.DATA_RAW_DIR
        students_csv = os.path.join(fallback_dir, "students.csv")
        if os.path.exists(students_csv):
            print(f"Fallback: Populating database from synthetic CSVs in {fallback_dir}...")
            # Load synthetic data
            df_students = pd.read_csv(students_csv)
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
            run_full_batch_pipeline(db)

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

def run_full_batch_pipeline(db: Session) -> Dict[str, Any]:
    """
    1. Reads students from DB and joins their assessment marks, attendance, and LMS metrics.
    2. Runs batch scoring model.
    3. Updates or inserts latest Risk_Score records.
    """
    t0 = time.time()
    students = db.query(Student).all()
    if not students:
        return {"status": "no_students", "students_scored": 0, "execution_time_seconds": 0.0, "timestamp": datetime.utcnow().isoformat(), "risk_distribution": {"Low": 0, "Medium": 0, "High": 0}}

    student_records = []
    for s in students:
        # Get assessments
        quizzes = db.query(Assessment).filter(Assessment.student_id == s.student_id, Assessment.assessment_name.ilike("%quiz%")).all()
        quiz_total = sum(q.score_obtained for q in quizzes) if quizzes else 20.0

        project = db.query(Assessment).filter(Assessment.student_id == s.student_id, Assessment.assessment_name.ilike("%project%")).first()
        proj_score = project.score_obtained if project else 14.0

        midterm = db.query(Assessment).filter(Assessment.student_id == s.student_id, Assessment.assessment_name.ilike("%midterm%")).first()
        mid_score = midterm.score_obtained if midterm else 18.0

        # Attendance out of 10
        att_all = db.query(Attendance).filter(Attendance.student_id == s.student_id).all()
        if att_all:
            present_val = sum(1.0 if a.status == "Present" else (0.5 if a.status == "Late" else 0.0) for a in att_all)
            att_rate = (present_val / len(att_all)) * 10.0
        else:
            att_rate = 9.0

        # LMS
        lms_views = db.query(LMSActivity).filter(LMSActivity.student_id == s.student_id, LMSActivity.activity_type.ilike("%view%")).first()
        views = lms_views.score_or_views if lms_views else 800.0

        lms_subs = db.query(LMSActivity).filter(LMSActivity.student_id == s.student_id, LMSActivity.activity_type.ilike("%submission%")).first()
        on_time = lms_subs.score_or_views if lms_subs else 88.0

        # Observed grade if exists in current risk record
        prev_rs = db.query(RiskScore).filter(RiskScore.student_id == s.student_id).order_by(desc(RiskScore.id)).first()
        obs_grade = prev_rs.observed_grade if prev_rs else None

        student_records.append({
            "StudentID": s.student_id,
            "Gender": s.gender if s.gender is not None else 0,
            "Program": s.program if s.program is not None else 1,
            "YearLevel": s.year_level if s.year_level is not None else 3,
            "ClassTime": s.class_time if s.class_time is not None else 0,
            "QuizTotal": quiz_total,
            "Project": proj_score,
            "Midterm": mid_score,
            "Attendance": att_rate,
            "Participation": 0.35,
            "Assignment on time percent": int(on_time),
            "Page Views": int(views),
            "FinalGrade": obs_grade
        })

    df_input = pd.DataFrame(student_records)
    df_scored = batch_score_students(df_input, model_dir=settings.MODEL_DIR)

    risk_dist = {"Low": 0, "Medium": 0, "High": 0}
    today_iso = datetime.utcnow().strftime("%Y-%m-%d")

    for _, row in df_scored.iterrows():
        sid = row["student_id"]
        r_level = row["risk_level"]
        risk_dist[r_level] = risk_dist.get(r_level, 0) + 1

        existing = db.query(RiskScore).filter(RiskScore.student_id == sid).order_by(desc(RiskScore.id)).first()

        # Update if scored today to maintain clean daily snapshot
        if existing and existing.computed_at and existing.computed_at[:10] == today_iso:
            existing.computed_at = row["computed_at"]
            existing.risk_level = r_level
            existing.risk_score = float(row["risk_score"])
            existing.predicted_grade = float(row["predicted_grade"])
            if row["observed_grade"] is not None:
                existing.observed_grade = float(row["observed_grade"])
            existing.attendance_pct = float(row["attendance_pct"])
            existing.avg_score = float(row["avg_score"])
            existing.score_trend = float(row["score_trend"])
            existing.avg_submission_delay = float(row["avg_submission_delay"])
            existing.composite_engagement = float(row["composite_engagement"])
            existing.alert_flag = bool(row["alert_flag"])
            existing.contributing_factors = row["contributing_factors"]
            existing.recommendations = row["recommendations"]
            existing.confidence = float(row["confidence"])
            existing.risk_probabilities = row["risk_probabilities"]
        else:
            db.add(RiskScore(
                student_id=sid,
                computed_at=row["computed_at"],
                risk_level=r_level,
                risk_score=float(row["risk_score"]),
                predicted_grade=float(row["predicted_grade"]),
                observed_grade=float(row["observed_grade"]) if row["observed_grade"] is not None else None,
                attendance_pct=float(row["attendance_pct"]),
                avg_score=float(row["avg_score"]),
                score_trend=float(row["score_trend"]),
                avg_submission_delay=float(row["avg_submission_delay"]),
                composite_engagement=float(row["composite_engagement"]),
                alert_flag=bool(row["alert_flag"]),
                contributing_factors=row["contributing_factors"],
                recommendations=row["recommendations"],
                confidence=float(row["confidence"]),
                risk_probabilities=row["risk_probabilities"]
            ))

    db.commit()
    elapsed = round(time.time() - t0, 3)

    return {
        "status": "success",
        "students_scored": len(df_scored),
        "execution_time_seconds": elapsed,
        "timestamp": datetime.utcnow().isoformat(),
        "risk_distribution": risk_dist
    }

def retrain_model_pipeline(db: Session, csv_path="data/student_dataset.csv") -> Dict[str, Any]:
    """
    Retrains ML pipeline using the dataset and recomputes all student risk predictions.
    """
    df, X, y_reg, y_clf = load_and_preprocess_dataset(csv_path)
    metadata = train_and_benchmark_models(X, y_reg, y_clf, output_dir=settings.MODEL_DIR)

    # Re-score all students with updated model
    run_full_batch_pipeline(db)

    best_clf = metadata["best_model_name"]
    best_reg = metadata["best_regressor_name"]
    clf_m = metadata["classification_metrics"].get(best_clf, {})
    reg_m = metadata["regression_metrics"].get(best_reg, {})

    return {
        "status": "success",
        "message": f"Successfully retrained models on {len(df)} records. Best classifier: {best_clf}, Best regressor: {best_reg}.",
        "record_count": len(df),
        "best_classifier": best_clf,
        "best_regressor": best_reg,
        "test_accuracy": round(clf_m.get("test_accuracy", 0.0), 4),
        "test_weighted_f1": round(clf_m.get("test_f1_weighted", 0.0), 4),
        "test_r2": round(reg_m.get("test_r2", 0.0), 4),
        "test_mae": round(reg_m.get("test_mae", 0.0), 4),
        "timestamp": datetime.utcnow().isoformat()
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
        rs = db.query(RiskScore).filter(RiskScore.student_id == s.student_id).order_by(desc(RiskScore.id)).first()
        if rs:
            r_level = rs.risk_level
            r_score = rs.risk_score
            pred_grade = rs.predicted_grade
            obs_grade = rs.observed_grade
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
            pred_grade, obs_grade = 82.0, None
            att, score, trend, eng, is_alert = 90.0, 80.0, 0.0, 85.0, False
            factors, recs = [], []

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
            "predicted_grade": pred_grade,
            "observed_grade": obs_grade,
            "attendance_pct": att,
            "avg_score": score,
            "score_trend": trend,
            "composite_engagement": eng,
            "alert_flag": is_alert,
            "intervention_status": inv_status,
            "program": s.program,
            "year_level": s.year_level,
            "class_time": s.class_time
        }
        heatmap_data.append(item)

        if r_level in ["Medium", "High"]:
            high_risk_alerts.append({
                "student_id": s.student_id,
                "name": s.name,
                "email": s.email,
                "risk_level": r_level,
                "risk_score": r_score,
                "predicted_grade": pred_grade,
                "observed_grade": obs_grade,
                "primary_driver": factors[0]["label"] if factors else "Coursework Score Volatility",
                "recommendation": recs[0] if recs else "Monitor academic progress",
                "attendance_pct": att,
                "avg_score": score,
                "intervention_status": inv_status,
                "is_overdue": is_overdue,
                "assigned_staff": latest_inv.assigned_staff if latest_inv else None
            })

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

def get_cohort_analytics(db: Session, class_id: str = "CS101") -> Dict[str, Any]:
    """
    Computes cohort aggregation by Program, YearLevel, and ClassTime.
    Compares observed and predicted outcomes, average attendance, and risk groups.
    """
    students = db.query(Student).all()
    if not students:
        return {
            "total_students": 0,
            "by_program": [],
            "by_year_level": [],
            "by_class_time": [],
            "overall_avg_predicted": 0.0,
            "overall_avg_observed": None
        }

    cohort_records = []
    for s in students:
        rs = db.query(RiskScore).filter(RiskScore.student_id == s.student_id).order_by(desc(RiskScore.id)).first()
        pred_g = rs.predicted_grade if rs else 80.0
        obs_g = rs.observed_grade if rs else None
        r_level = rs.risk_level if rs else "Low"
        att = rs.attendance_pct if rs else 90.0

        # Get assessments
        quiz = db.query(Assessment).filter(Assessment.student_id == s.student_id, Assessment.assessment_name.ilike("%quiz%")).first()
        mid = db.query(Assessment).filter(Assessment.student_id == s.student_id, Assessment.assessment_name.ilike("%midterm%")).first()
        lms = db.query(LMSActivity).filter(LMSActivity.student_id == s.student_id, LMSActivity.activity_type.ilike("%view%")).first()

        cohort_records.append({
            "student_id": s.student_id,
            "program": s.program if s.program is not None else 1,
            "year_level": s.year_level if s.year_level is not None else 3,
            "class_time": s.class_time if s.class_time is not None else 0,
            "risk_level": r_level,
            "predicted_grade": pred_g,
            "observed_grade": obs_g,
            "attendance": att,
            "quiz": quiz.score_obtained if quiz else 20.0,
            "midterm": mid.score_obtained if mid else 18.0,
            "page_views": lms.score_or_views if lms else 800.0
        })

    df_c = pd.DataFrame(cohort_records)

    def aggregate_by(col_name: str, label_map: Dict[Any, str]) -> List[Dict[str, Any]]:
        items = []
        for val, group in df_c.groupby(col_name):
            cnt = len(group)
            r_counts = {
                "Low": int((group["risk_level"] == "Low").sum()),
                "Medium": int((group["risk_level"] == "Medium").sum()),
                "High": int((group["risk_level"] == "High").sum())
            }
            obs_valid = group["observed_grade"].dropna()
            avg_obs = round(float(obs_valid.mean()), 2) if len(obs_valid) > 0 else None

            items.append({
                "group_name": label_map.get(val, f"Group {val}"),
                "group_value": int(val),
                "student_count": cnt,
                "risk_counts": r_counts,
                "avg_predicted_grade": round(float(group["predicted_grade"].mean()), 2),
                "avg_observed_grade": avg_obs,
                "avg_attendance": round(float(group["attendance"].mean()), 1),
                "avg_quiz": round(float(group["quiz"].mean()), 2),
                "avg_midterm": round(float(group["midterm"].mean()), 2),
                "avg_page_views": round(float(group["page_views"].mean()), 0)
            })
        return sorted(items, key=lambda x: x["student_count"], reverse=True)

    program_map = {1: "Program 1 (Major Stream)", 2: "Program 2 (Specialized Track)", 3: "Program 3 (Interdisciplinary)", 4: "Program 4 (Dual Degree)"}
    year_map = {1: "Year 1 (Freshman)", 2: "Year 2 (Sophomore)", 3: "Year 3 (Junior)", 4: "Year 4 (Senior)"}
    time_map = {0: "Section 0 (Morning / Day Slot)", 1: "Section 1 (Afternoon / Evening Slot)"}

    obs_all = df_c["observed_grade"].dropna()
    avg_obs_overall = round(float(obs_all.mean()), 2) if len(obs_all) > 0 else None

    return {
        "class_id": class_id,
        "total_students": len(df_c),
        "by_program": aggregate_by("program", program_map),
        "by_year_level": aggregate_by("year_level", year_map),
        "by_class_time": aggregate_by("class_time", time_map),
        "overall_avg_predicted": round(float(df_c["predicted_grade"].mean()), 2),
        "overall_avg_observed": avg_obs_overall,
        "leakage_audit": {
            "leakage_warning": "Final exam mark ('Final') is strictly excluded from predictive features to prevent target leakage.",
            "mathematical_relationship": "FinalGrade = QuizTotal + Project + Midterm + Final + Attendance"
        }
    }

def get_student_risk_profile(db: Session, student_id: str) -> Optional[Dict[str, Any]]:
    """
    Returns student details, current risk assessment, contributing factors,
    recommendations, historical risk trajectory, interventions, and trend series.
    """
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return None

    rs = db.query(RiskScore).filter(RiskScore.student_id == student_id).order_by(desc(RiskScore.id)).first()
    if not rs:
        rs_dict = {
            "id": 0,
            "student_id": student_id,
            "computed_at": datetime.utcnow().isoformat(),
            "risk_level": "Low",
            "risk_score": 0.1,
            "predicted_grade": 85.0,
            "observed_grade": None,
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
            "predicted_grade": rs.predicted_grade,
            "observed_grade": rs.observed_grade,
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
            "enrollment_date": student.enrollment_date,
            "gender": student.gender,
            "program": student.program,
            "year_level": student.year_level,
            "class_time": student.class_time
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
    step = max(1, len(sorted_dates) // 10)
    for i in range(0, len(sorted_dates), step):
        d = sorted_dates[i]
        vals = att_by_date[d]
        rate = round(float(np.mean(vals)) * 100.0, 1)
        attendance_trend_overall.append({
            "date": d,
            "attendance_rate": rate
        })

    # Risk tier shifts
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
            if trend > 0.05:
                improved_cnt += 1
            elif trend < -0.05:
                declined_cnt += 1
            else:
                stable_cnt += 1

    risk_tier_shifts = {
        "improved": improved_cnt,
        "stable": stable_cnt,
        "declined": declined_cnt
    }

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

import io
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List

from backend.app.core.database import get_db
from backend.app.models.schema import Student, Attendance, Assessment, LMSActivity
from backend.app.schemas.pydantic_models import IngestResponse, IngestionResult
from backend.app.services.pipeline_service import run_full_batch_pipeline
from ml.feature_engineering import validate_raw_data

router = APIRouter()

@router.post("/ingest", response_model=IngestResponse)
async def ingest_csv_data(
    source_type: str = Form(..., description="One of: 'students', 'attendance', 'assessments', 'lms_activity'"),
    file: UploadFile = File(...),
    auto_recompute: bool = Form(True, description="Automatically recompute risk scores after ingestion"),
    db: Session = Depends(get_db)
):
    """
    Data Ingestion Module Endpoint:
    Imports CSV records for students, attendance, internal assessment marks, or LMS submission logs.
    Validates completeness, flags missing/malformed records, and updates the database.
    """
    valid_sources = ["students", "attendance", "assessments", "lms_activity"]
    if source_type not in valid_sources:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_type '{source_type}'. Must be one of {valid_sources}"
        )

    content = await file.read()
    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

    issues = []
    records_added = 0

    if source_type == "students":
        req = ["student_id", "name", "email"]
        for col in req:
            if col not in df.columns:
                issues.append(f"Missing required column: {col}")
        if not issues:
            for _, row in df.iterrows():
                sid = str(row["student_id"])
                existing = db.query(Student).filter(Student.student_id == sid).first()
                if existing:
                    existing.name = str(row["name"])
                    existing.email = str(row["email"])
                    existing.class_id = str(row.get("class_id", existing.class_id))
                    existing.department = str(row.get("department", existing.department))
                else:
                    db.add(Student(
                        student_id=sid,
                        name=str(row["name"]),
                        email=str(row["email"]),
                        class_id=str(row.get("class_id", "CS101")),
                        department=str(row.get("department", "Computer Science")),
                        enrollment_date=str(row.get("enrollment_date", "2026-01-15"))
                    ))
                records_added += 1
            db.commit()

    elif source_type == "attendance":
        req = ["student_id", "date", "status"]
        for col in req:
            if col not in df.columns:
                issues.append(f"Missing required column: {col}")
        if not issues:
            for _, row in df.iterrows():
                db.add(Attendance(
                    student_id=str(row["student_id"]),
                    date=str(row["date"]),
                    status=str(row["status"]),
                    course_id=str(row.get("course_id", "CS101"))
                ))
                records_added += 1
            db.commit()

    elif source_type == "assessments":
        req = ["student_id", "assessment_name", "date", "max_score", "score_obtained"]
        for col in req:
            if col not in df.columns:
                issues.append(f"Missing required column: {col}")
        if not issues:
            for _, row in df.iterrows():
                db.add(Assessment(
                    student_id=str(row["student_id"]),
                    assessment_name=str(row["assessment_name"]),
                    date=str(row["date"]),
                    max_score=float(row["max_score"]),
                    score_obtained=float(row["score_obtained"]),
                    course_id=str(row.get("course_id", "CS101"))
                ))
                records_added += 1
            db.commit()

    elif source_type == "lms_activity":
        req = ["student_id", "activity_type", "delay_days", "completion_status"]
        for col in req:
            if col not in df.columns:
                issues.append(f"Missing required column: {col}")
        if not issues:
            for _, row in df.iterrows():
                db.add(LMSActivity(
                    student_id=str(row["student_id"]),
                    activity_type=str(row["activity_type"]),
                    timestamp=str(row.get("timestamp", "2026-04-01 12:00:00")),
                    delay_days=float(row.get("delay_days", 0.0)),
                    completion_status=str(row.get("completion_status", "Completed")),
                    score_or_views=float(row.get("score_or_views", 10.0))
                ))
                records_added += 1
            db.commit()

    pipeline_triggered = False
    if auto_recompute and not issues and records_added > 0:
        run_full_batch_pipeline(db)
        pipeline_triggered = True

    status_str = "SUCCESS" if not issues else "VALIDATION_FAILED"

    return IngestResponse(
        message=f"Ingestion completed for source '{source_type}'. {records_added} records processed.",
        results=[IngestionResult(
            source=source_type,
            records_processed=records_added,
            validation_status=status_str,
            issues_found=issues
        )],
        pipeline_triggered=pipeline_triggered
    )

import io
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from backend.app.core.database import get_db
from backend.app.models.schema import Student, Attendance, Assessment, LMSActivity
from backend.app.schemas.pydantic_models import (
    IngestResponse,
    IngestionResult,
    CSVPreviewResponse,
    CSVValidationIssue
)
from backend.app.services.pipeline_service import run_full_batch_pipeline

router = APIRouter()

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 # 10MB limit
VALID_SOURCES = ["students", "attendance", "assessments", "lms_activity"]

REQUIRED_COLUMNS = {
    "students": ["student_id", "name", "email"],
    "attendance": ["student_id", "date", "status"],
    "assessments": ["student_id", "assessment_name", "date", "max_score", "score_obtained"],
    "lms_activity": ["student_id", "activity_type", "delay_days", "completion_status"]
}

VALID_ATTENDANCE_STATUSES = {"present", "late", "absent"}
VALID_LMS_STATUSES = {"completed", "late", "missing"}

def validate_csv_dataframe(source_type: str, df: pd.DataFrame, db: Session):
    """
    Validates CSV schema, data types, missing values, foreign keys, and duplicates.
    Returns (valid_rows, invalid_rows, duplicate_rows, issues).
    """
    issues: List[CSVValidationIssue] = []
    req_cols = REQUIRED_COLUMNS.get(source_type, [])

    # 1. Header validation
    missing_headers = [col for col in req_cols if col not in df.columns]
    if missing_headers:
        for mh in missing_headers:
            issues.append(CSVValidationIssue(
                row=None,
                column=mh,
                message=f"Missing required header column: '{mh}'"
            ))
        return 0, len(df), 0, issues

    # Cache existing student IDs for foreign key validation
    existing_student_ids = {s[0] for s in db.query(Student.student_id).all()}

    valid_indices = []
    invalid_indices = []
    duplicate_indices = []
    seen_file_keys = set()

    for idx, row in df.iterrows():
        row_num = idx + 2 # 1-indexed header + 1
        row_has_error = False

        # Missing required values check
        for col in req_cols:
            val = row[col]
            if pd.isna(val) or str(val).strip() == "":
                issues.append(CSVValidationIssue(
                    row=row_num,
                    column=col,
                    message=f"Required value is missing or empty."
                ))
                row_has_error = True

        if row_has_error:
            invalid_indices.append(idx)
            continue

        sid = str(row["student_id"]).strip()

        # Foreign key check for non-students imports
        if source_type != "students" and sid not in existing_student_ids:
            issues.append(CSVValidationIssue(
                row=row_num,
                column="student_id",
                message=f"Student ID '{sid}' does not exist in roster. Import student profile first."
            ))
            row_has_error = True

        # Type and domain value checks per source
        if source_type == "attendance":
            st = str(row["status"]).strip().lower()
            if st not in VALID_ATTENDANCE_STATUSES:
                issues.append(CSVValidationIssue(
                    row=row_num,
                    column="status",
                    message=f"Invalid status '{row['status']}'. Must be one of: Present, Late, Absent."
                ))
                row_has_error = True

            # Duplicate check within file
            key = (sid, str(row["date"]).strip(), str(row.get("course_id", "CS101")).strip())
            if key in seen_file_keys:
                duplicate_indices.append(idx)
                issues.append(CSVValidationIssue(
                    row=row_num,
                    column="date",
                    message=f"Duplicate attendance entry for student {sid} on date {row['date']}."
                ))
                continue
            seen_file_keys.add(key)

        elif source_type == "assessments":
            try:
                max_s = float(row["max_score"])
                obt_s = float(row["score_obtained"])
                if max_s <= 0:
                    issues.append(CSVValidationIssue(
                        row=row_num,
                        column="max_score",
                        message="max_score must be strictly greater than 0."
                    ))
                    row_has_error = True
                if obt_s < 0:
                    issues.append(CSVValidationIssue(
                        row=row_num,
                        column="score_obtained",
                        message="score_obtained cannot be negative."
                    ))
                    row_has_error = True
                if obt_s > max_s * 1.5:
                    issues.append(CSVValidationIssue(
                        row=row_num,
                        column="score_obtained",
                        message=f"score_obtained ({obt_s}) substantially exceeds max_score ({max_s})."
                    ))
                    row_has_error = True
            except (ValueError, TypeError):
                issues.append(CSVValidationIssue(
                    row=row_num,
                    column="scores",
                    message="Assessment marks must be numeric values."
                ))
                row_has_error = True

            key = (sid, str(row["assessment_name"]).strip(), str(row.get("course_id", "CS101")).strip())
            if key in seen_file_keys:
                duplicate_indices.append(idx)
                issues.append(CSVValidationIssue(
                    row=row_num,
                    column="assessment_name",
                    message=f"Duplicate assessment entry for {sid} ({row['assessment_name']})."
                ))
                continue
            seen_file_keys.add(key)

        elif source_type == "lms_activity":
            st = str(row["completion_status"]).strip().lower()
            if st not in VALID_LMS_STATUSES:
                issues.append(CSVValidationIssue(
                    row=row_num,
                    column="completion_status",
                    message=f"Invalid completion_status '{row['completion_status']}'. Must be Completed, Late, or Missing."
                ))
                row_has_error = True
            try:
                float(row["delay_days"])
            except (ValueError, TypeError):
                issues.append(CSVValidationIssue(
                    row=row_num,
                    column="delay_days",
                    message="delay_days must be a valid number."
                ))
                row_has_error = True

        elif source_type == "students":
            if "@" not in str(row["email"]):
                issues.append(CSVValidationIssue(
                    row=row_num,
                    column="email",
                    message=f"Invalid email format: '{row['email']}'"
                ))
                row_has_error = True
            if sid in seen_file_keys:
                duplicate_indices.append(idx)
                issues.append(CSVValidationIssue(
                    row=row_num,
                    column="student_id",
                    message=f"Duplicate student_id '{sid}' in file."
                ))
                continue
            seen_file_keys.add(sid)

        if row_has_error:
            invalid_indices.append(idx)
        else:
            valid_indices.append(idx)

    return len(valid_indices), len(invalid_indices), len(duplicate_indices), issues

@router.post("/ingest/preview", response_model=CSVPreviewResponse)
async def preview_csv_data(
    source_type: str = Form(..., description="One of: 'students', 'attendance', 'assessments', 'lms_activity'"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Validates CSV file size, type, headers, rows, and returns an import preview
    with row-level issues before committing changes to the database.
    """
    if source_type not in VALID_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_type '{source_type}'. Must be one of {VALID_SOURCES}"
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type for '{file.filename}'. Only .csv files are supported."
        )

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB."
        )

    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV file contains no records.")

    valid_cnt, invalid_cnt, dup_cnt, issues = validate_csv_dataframe(source_type, df, db)

    # Sample parsed records (up to 5 records)
    sample_recs = []
    for _, r in df.head(5).iterrows():
        sample_recs.append({k: (None if pd.isna(v) else v) for k, v in r.to_dict().items()})

    can_import = valid_cnt > 0

    return CSVPreviewResponse(
        source_type=source_type,
        filename=file.filename,
        file_size_bytes=file_size,
        total_rows=len(df),
        valid_rows_count=valid_cnt,
        invalid_rows_count=invalid_cnt,
        duplicate_rows_count=dup_cnt,
        headers=list(df.columns),
        sample_records=sample_recs,
        issues=issues[:25], # Cap display at 25 issues for performance
        can_import=can_import
    )

@router.post("/ingest", response_model=IngestResponse)
async def ingest_csv_data(
    source_type: str = Form(..., description="One of: 'students', 'attendance', 'assessments', 'lms_activity'"),
    file: UploadFile = File(...),
    auto_recompute: bool = Form(True, description="Automatically recompute risk scores after ingestion"),
    db: Session = Depends(get_db)
):
    """
    Imports and safely persists valid CSV records.
    Validates completeness, flags invalid rows, and triggers feature recalculation.
    """
    if source_type not in VALID_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_type '{source_type}'. Must be one of {VALID_SOURCES}"
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type for '{file.filename}'. Only .csv files are supported."
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB."
        )

    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

    valid_cnt, invalid_cnt, dup_cnt, issues = validate_csv_dataframe(source_type, df, db)
    issue_messages = [f"Row {i.row or 'Header'}: {i.message}" for i in issues[:10]]

    if valid_cnt == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Validation failed. No valid rows could be imported. Issues: {'; '.join(issue_messages)}"
        )

    records_added = 0
    req_cols = REQUIRED_COLUMNS[source_type]

    try:
        if source_type == "students":
            for _, row in df.iterrows():
                sid = str(row["student_id"]).strip()
                if not sid or pd.isna(row.get("email")):
                    continue
                existing = db.query(Student).filter(Student.student_id == sid).first()
                if existing:
                    existing.name = str(row["name"]).strip()
                    existing.email = str(row["email"]).strip()
                    existing.class_id = str(row.get("class_id", existing.class_id)).strip()
                    existing.department = str(row.get("department", existing.department)).strip()
                else:
                    db.add(Student(
                        student_id=sid,
                        name=str(row["name"]).strip(),
                        email=str(row["email"]).strip(),
                        class_id=str(row.get("class_id", "CS101")).strip(),
                        department=str(row.get("department", "Computer Science")).strip(),
                        enrollment_date=str(row.get("enrollment_date", "2026-01-15")).strip()
                    ))
                records_added += 1
            db.commit()

        elif source_type == "attendance":
            for _, row in df.iterrows():
                sid = str(row["student_id"]).strip()
                st = str(row["status"]).strip().capitalize()
                if st.lower() not in VALID_ATTENDANCE_STATUSES:
                    continue
                db.add(Attendance(
                    student_id=sid,
                    date=str(row["date"]).strip(),
                    status=st,
                    course_id=str(row.get("course_id", "CS101")).strip()
                ))
                records_added += 1
            db.commit()

        elif source_type == "assessments":
            for _, row in df.iterrows():
                sid = str(row["student_id"]).strip()
                try:
                    max_s = float(row["max_score"])
                    obt_s = float(row["score_obtained"])
                except (ValueError, TypeError):
                    continue
                db.add(Assessment(
                    student_id=sid,
                    assessment_name=str(row["assessment_name"]).strip(),
                    date=str(row["date"]).strip(),
                    max_score=max_s,
                    score_obtained=obt_s,
                    course_id=str(row.get("course_id", "CS101")).strip()
                ))
                records_added += 1
            db.commit()

        elif source_type == "lms_activity":
            for _, row in df.iterrows():
                sid = str(row["student_id"]).strip()
                c_status = str(row["completion_status"]).strip().capitalize()
                try:
                    del_days = float(row.get("delay_days", 0.0))
                    sc_views = float(row.get("score_or_views", 10.0))
                except (ValueError, TypeError):
                    continue
                db.add(LMSActivity(
                    student_id=sid,
                    activity_type=str(row["activity_type"]).strip(),
                    timestamp=str(row.get("timestamp", "2026-04-01 12:00:00")).strip(),
                    delay_days=del_days,
                    completion_status=c_status,
                    score_or_views=sc_views
                ))
                records_added += 1
            db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit error during ingestion: {str(e)}")

    pipeline_triggered = False
    if auto_recompute and records_added > 0:
        run_full_batch_pipeline(db)
        pipeline_triggered = True

    status_str = "SUCCESS" if invalid_cnt == 0 else "PARTIAL_SUCCESS"

    return IngestResponse(
        message=f"Ingestion completed for '{source_type}'. {records_added} records imported ({invalid_cnt} invalid, {dup_cnt} duplicates skipped).",
        results=[IngestionResult(
            source=source_type,
            records_processed=records_added,
            validation_status=status_str,
            issues_found=issue_messages
        )],
        pipeline_triggered=pipeline_triggered
    )

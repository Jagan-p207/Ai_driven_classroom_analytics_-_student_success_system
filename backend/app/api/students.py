from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.models.schema import Student, RiskScore
from backend.app.schemas.pydantic_models import (
    StudentSummary,
    StudentRiskFullProfile
)
from backend.app.services.pipeline_service import get_student_risk_profile

router = APIRouter()

@router.get("/students", response_model=List[StudentSummary])
def list_students(
    risk_level: Optional[str] = Query(None, description="Filter by: Low, Medium, High"),
    search: Optional[str] = Query(None, description="Search by name or student ID"),
    class_id: Optional[str] = Query(None, description="Filter by class ID"),
    db: Session = Depends(get_db)
):
    """
    List all students with their latest risk classification, attendance, and scores.
    """
    query = db.query(Student)

    if class_id:
        query = query.filter(Student.class_id == class_id)

    students = query.all()
    summaries = []

    for s in students:
        # Latest risk score
        rs = db.query(RiskScore).filter(RiskScore.student_id == s.student_id).order_by(desc(RiskScore.id)).first()

        item_level = rs.risk_level if rs else "Low"
        item_score = rs.risk_score if rs else 0.1
        item_att = rs.attendance_pct if rs else 90.0
        item_avg = rs.avg_score if rs else 80.0
        item_trend = rs.score_trend if rs else 0.0
        item_eng = rs.composite_engagement if rs else 85.0
        item_alert = rs.alert_flag if rs else False

        # Filter by risk level
        if risk_level and item_level.lower() != risk_level.lower():
            continue

        # Filter by search
        if search:
            q = search.lower()
            if q not in s.name.lower() and q not in s.student_id.lower() and q not in s.email.lower():
                continue

        summaries.append(StudentSummary(
            student_id=s.student_id,
            name=s.name,
            email=s.email,
            class_id=s.class_id,
            department=s.department,
            risk_level=item_level,
            risk_score=item_score,
            attendance_pct=item_att,
            avg_score=item_avg,
            score_trend=item_trend,
            composite_engagement=item_eng,
            alert_flag=item_alert
        ))

    # Sort descending by risk_score
    summaries.sort(key=lambda x: x.risk_score or 0.0, reverse=True)
    return summaries

@router.get("/students/{student_id}/risk", response_model=StudentRiskFullProfile)
def get_student_risk(student_id: str, db: Session = Depends(get_db)):
    """
    Core Module 3 & 4 Endpoint:
    Returns student-level view:
    - Current risk classification & continuous score
    - SHAP / Feature contributing factors
    - Actionable intervention recommendations
    - Historical trend lines for attendance and assessment marks over time
    - LMS submission activity logs
    """
    profile = get_student_risk_profile(db, student_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Student with ID '{student_id}' not found."
        )
    return profile

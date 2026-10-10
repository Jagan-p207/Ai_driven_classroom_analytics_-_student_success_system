from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Dict, Any
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.models.schema import Student, RiskScore, Intervention
from backend.app.schemas.pydantic_models import (
    StudentSummary,
    StudentRiskFullProfile,
    InterventionCreate,
    InterventionUpdate,
    InterventionResponse
)
from backend.app.services.pipeline_service import get_student_risk_profile

router = APIRouter()

@router.get("/students", response_model=List[StudentSummary])
def list_students(
    risk_level: Optional[str] = Query(None, description="Filter by: Low, Medium, High"),
    search: Optional[str] = Query(None, description="Search by name or student ID"),
    class_id: Optional[str] = Query(None, description="Filter by class ID"),
    intervention_status: Optional[str] = Query(None, description="Filter by: all, overdue, needs_action, planned, in_progress, completed, resolved"),
    db: Session = Depends(get_db)
):
    """
    List all students with their latest risk classification, attendance, scores,
    and attached intervention status.
    """
    query = db.query(Student)

    if class_id:
        query = query.filter(Student.class_id == class_id)

    students = query.all()
    summaries = []
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

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
        if risk_level and risk_level.upper() != "ALL" and item_level.lower() != risk_level.lower():
            continue

        # Filter by search
        if search:
            q = search.lower()
            if q not in s.name.lower() and q not in s.student_id.lower() and q not in s.email.lower():
                continue

        # Latest intervention
        latest_inv = db.query(Intervention).filter(Intervention.student_id == s.student_id).order_by(desc(Intervention.id)).first()
        inv_status = latest_inv.status if latest_inv else None
        inv_staff = latest_inv.assigned_staff if latest_inv else None
        inv_follow_up = latest_inv.follow_up_date if latest_inv else None
        is_overdue = bool(latest_inv and latest_inv.status in ["Planned", "In Progress"] and latest_inv.follow_up_date and latest_inv.follow_up_date < today_str)

        # Filter by intervention status
        if intervention_status and intervention_status.lower() != "all":
            inv_filter = intervention_status.lower()
            if inv_filter == "overdue":
                if not is_overdue:
                    continue
            elif inv_filter == "needs_action":
                # High or Medium risk without active intervention or with overdue
                if not (item_level in ["Medium", "High"] and (inv_status is None or is_overdue or inv_status == "Planned")):
                    continue
            elif inv_filter == "none":
                if inv_status is not None:
                    continue
            else:
                if not inv_status or inv_status.lower() != inv_filter:
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
            alert_flag=item_alert,
            latest_intervention_status=inv_status,
            latest_intervention_staff=inv_staff,
            latest_follow_up_date=inv_follow_up,
            is_intervention_overdue=is_overdue
        ))

    # Sort descending by risk_score
    summaries.sort(key=lambda x: x.risk_score or 0.0, reverse=True)
    return summaries

@router.get("/students/{student_id}/risk", response_model=StudentRiskFullProfile)
def get_student_risk(student_id: str, db: Session = Depends(get_db)):
    """
    Returns student-level view:
    - Current risk classification, confidence & class probabilities
    - SHAP / Feature contributing factors
    - Actionable intervention recommendations
    - Historical risk trajectory over the semester
    - Interventions and follow-up case notes
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

@router.post("/students/{student_id}/interventions", response_model=InterventionResponse)
def create_intervention(
    student_id: str,
    payload: InterventionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new actionable academic intervention for a student.
    Assigns staff, sets a follow-up date, status, and case notes.
    """
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{student_id}' not found.")

    valid_statuses = ["Planned", "In Progress", "Completed", "Resolved"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'. Must be one of {valid_statuses}")

    now_iso = datetime.utcnow().isoformat()
    new_inv = Intervention(
        student_id=student_id,
        status=payload.status,
        assigned_staff=payload.assigned_staff,
        follow_up_date=payload.follow_up_date,
        notes=payload.notes or "",
        created_at=now_iso,
        updated_at=now_iso
    )
    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    is_overdue = bool(new_inv.status in ["Planned", "In Progress"] and new_inv.follow_up_date and new_inv.follow_up_date < today_str)

    return InterventionResponse(
        id=new_inv.id,
        student_id=new_inv.student_id,
        status=new_inv.status,
        assigned_staff=new_inv.assigned_staff,
        follow_up_date=new_inv.follow_up_date,
        notes=new_inv.notes,
        created_at=new_inv.created_at,
        updated_at=new_inv.updated_at,
        is_overdue=is_overdue
    )

@router.get("/students/{student_id}/interventions", response_model=List[InterventionResponse])
def get_student_interventions(student_id: str, db: Session = Depends(get_db)):
    """
    Retrieve all intervention history records for a student.
    """
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    invs = db.query(Intervention).filter(Intervention.student_id == student_id).order_by(desc(Intervention.id)).all()
    results = []
    for inv in invs:
        is_overdue = bool(inv.status in ["Planned", "In Progress"] and inv.follow_up_date and inv.follow_up_date < today_str)
        results.append(InterventionResponse(
            id=inv.id,
            student_id=inv.student_id,
            status=inv.status,
            assigned_staff=inv.assigned_staff,
            follow_up_date=inv.follow_up_date,
            notes=inv.notes,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
            is_overdue=is_overdue
        ))
    return results

@router.put("/interventions/{intervention_id}", response_model=InterventionResponse)
def update_intervention(
    intervention_id: int,
    payload: InterventionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing intervention's status, assignee, follow-up date, or notes.
    """
    inv = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"Intervention with ID {intervention_id} not found.")

    if payload.status:
        valid_statuses = ["Planned", "In Progress", "Completed", "Resolved"]
        if payload.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'. Must be one of {valid_statuses}")
        inv.status = payload.status

    if payload.assigned_staff is not None:
        inv.assigned_staff = payload.assigned_staff
    if payload.follow_up_date is not None:
        inv.follow_up_date = payload.follow_up_date
    if payload.notes is not None:
        inv.notes = payload.notes

    inv.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(inv)

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    is_overdue = bool(inv.status in ["Planned", "In Progress"] and inv.follow_up_date and inv.follow_up_date < today_str)

    return InterventionResponse(
        id=inv.id,
        student_id=inv.student_id,
        status=inv.status,
        assigned_staff=inv.assigned_staff,
        follow_up_date=inv.follow_up_date,
        notes=inv.notes,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
        is_overdue=is_overdue
    )

@router.delete("/interventions/{intervention_id}")
def delete_intervention(intervention_id: int, db: Session = Depends(get_db)):
    """
    Remove an intervention record.
    """
    inv = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"Intervention with ID {intervention_id} not found.")
    db.delete(inv)
    db.commit()
    return {"message": f"Intervention {intervention_id} deleted successfully."}

@router.get("/interventions/overview")
def get_interventions_overview(class_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns high-level statistics across all student interventions.
    """
    query = db.query(Intervention)
    if class_id:
        query = query.join(Student, Student.student_id == Intervention.student_id).filter(Student.class_id == class_id)

    all_invs = query.all()
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    planned = sum(1 for i in all_invs if i.status == "Planned")
    in_progress = sum(1 for i in all_invs if i.status == "In Progress")
    completed = sum(1 for i in all_invs if i.status == "Completed")
    resolved = sum(1 for i in all_invs if i.status == "Resolved")
    overdue = sum(1 for i in all_invs if i.status in ["Planned", "In Progress"] and i.follow_up_date and i.follow_up_date < today_str)

    return {
        "total_interventions": len(all_invs),
        "planned": planned,
        "in_progress": in_progress,
        "completed": completed,
        "resolved": resolved,
        "overdue": overdue
    }

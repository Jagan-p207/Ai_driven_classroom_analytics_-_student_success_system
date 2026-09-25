from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.pydantic_models import ClassRiskSummary
from backend.app.services.pipeline_service import get_class_risk_summary

router = APIRouter()

@router.get("/class/{class_id}/risk-summary", response_model=ClassRiskSummary)
def get_class_summary(class_id: str, db: Session = Depends(get_db)):
    """
    Class-level view endpoint:
    Returns heat-map data across all students in the class,
    risk distribution (Low, Medium, High), aggregate averages,
    and high-risk alert triggers.
    """
    summary = get_class_risk_summary(db, class_id=class_id)
    return summary

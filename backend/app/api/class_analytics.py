from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.pydantic_models import ClassRiskSummary, HistoricalAnalyticsResponse, CohortAnalyticsResponse
from backend.app.services.pipeline_service import get_class_risk_summary, get_historical_analytics, get_cohort_analytics

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

@router.get("/class/{class_id}/historical-analytics", response_model=HistoricalAnalyticsResponse)
def get_historical_trends(class_id: str, db: Session = Depends(get_db)):
    """
    Returns historical analytics across assessment milestones,
    attendance progression, risk-tier transitions, and intervention progress.
    """
    trends = get_historical_analytics(db, class_id=class_id)
    return trends

@router.get("/class/{class_id}/cohort-analytics", response_model=CohortAnalyticsResponse)
@router.get("/cohort/analytics", response_model=CohortAnalyticsResponse)
def get_cohort_breakdown(class_id: str = "CS101", db: Session = Depends(get_db)):
    """
    Cohort-level analytics:
    Aggregates student records by Program (1, 2, 3, 4), YearLevel (1, 2, 3, 4), and ClassTime (0, 1),
    comparing observed and predicted grades and risk categories across academic cohorts.
    """
    return get_cohort_analytics(db, class_id=class_id)

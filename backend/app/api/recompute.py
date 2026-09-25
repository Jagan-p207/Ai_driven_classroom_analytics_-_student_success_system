from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.pydantic_models import RecomputeResponse
from backend.app.services.pipeline_service import run_full_batch_pipeline

router = APIRouter()

@router.post("/recompute", response_model=RecomputeResponse)
def trigger_recompute(db: Session = Depends(get_db)):
    """
    Trigger the batch scoring job manually for demo or on-demand update purposes.
    Re-runs feature engineering and models across all students and writes new Risk_Score records.
    """
    result = run_full_batch_pipeline(db)
    return RecomputeResponse(
        message="Batch scoring pipeline recomputed successfully.",
        students_scored=result["students_scored"],
        execution_time_seconds=result["execution_time_seconds"],
        timestamp=result["timestamp"],
        risk_distribution=result["risk_distribution"]
    )

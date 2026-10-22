from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.core.database import get_db
from backend.app.schemas.pydantic_models import RecomputeResponse
from backend.app.services.pipeline_service import run_full_batch_pipeline, retrain_model_pipeline

router = APIRouter()

@router.post("/recompute", response_model=RecomputeResponse)
def trigger_recompute(
    retrain: bool = Query(False, description="If true, retrains ML models on full dataset before scoring"),
    db: Session = Depends(get_db)
):
    """
    Trigger the batch scoring job manually for demo or on-demand update purposes.
    Re-runs models across all students and writes new Risk_Score records.
    Optionally retrains the models on the full dataset first if retrain=true.
    """
    msg = "Batch scoring pipeline recomputed successfully."
    if retrain:
        retrain_res = retrain_model_pipeline(db)
        msg = f"Retrained model ({retrain_res['best_classifier']}) and recomputed batch predictions."

    result = run_full_batch_pipeline(db)
    return RecomputeResponse(
        message=msg,
        students_scored=result["students_scored"],
        execution_time_seconds=result["execution_time_seconds"],
        timestamp=result["timestamp"],
        risk_distribution=result["risk_distribution"]
    )

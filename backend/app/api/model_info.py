import os
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.schemas.pydantic_models import ModelRetrainResponse
from backend.app.services.pipeline_service import retrain_model_pipeline, seed_database_from_csv

router = APIRouter()

@router.get("/model/info")
def get_model_info():
    """
    Returns metadata about the active ML models (Regression + Classification),
    evaluation metrics (MAE, RMSE, R2, Accuracy, F1, Confusion Matrix),
    data leakage safeguards, and global feature importances.
    """
    meta_path = os.path.join(settings.MODEL_DIR, "model_metadata.json")
    if not os.path.exists(meta_path):
        return {
            "status": "not_trained",
            "message": "Model metadata not found. Train the model first using ml/train_models.py."
        }
    try:
        with open(meta_path, "r") as f:
            meta = json.load(f)
        return {
            "status": "ready",
            "data": meta
        }
    except Exception as e:
        return {
            "status": "not_trained",
            "message": f"Model metadata could not be loaded: {str(e)}"
        }

@router.post("/model/retrain", response_model=ModelRetrainResponse)
def retrain_model(db: Session = Depends(get_db)):
    """
    Triggers complete offline training pipeline on the institutional dataset,
    benchmarks all regression and classification models, fits SHAP explainers,
    updates serialized artifacts, and recomputes batch predictions.
    """
    try:
        result = retrain_model_pipeline(db)
        return ModelRetrainResponse(
            status=result["status"],
            message=result["message"],
            record_count=result["record_count"],
            best_classifier=result["best_classifier"],
            best_regressor=result["best_regressor"],
            test_accuracy=result["test_accuracy"],
            test_weighted_f1=result["test_weighted_f1"],
            test_r2=result["test_r2"],
            test_mae=result["test_mae"],
            timestamp=result["timestamp"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {str(e)}")

@router.post("/seed")
def seed_sample_data(db: Session = Depends(get_db)):
    """
    Seeds database from full student dataset and executes batch scoring.
    """
    seed_database_from_csv(force=True)
    return {"message": "Full student dataset (192 students) seeded and scored successfully."}

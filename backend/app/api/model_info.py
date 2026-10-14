import os
import json
from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()

@router.get("/model/info")
def get_model_info():
    """
    Returns metadata about the active ML model, evaluation comparison
    (Logistic Regression, Random Forest, XGBoost), and global feature importances.
    """
    meta_path = os.path.join(settings.MODEL_DIR, "model_metadata.json")
    if not os.path.exists(meta_path):
        return {
            "status": "not_trained",
            "message": "Model metadata not found. Train the model first."
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

@router.post("/seed")
def seed_sample_data():
    """
    Seeds database from synthetic data files and recomputes risk scores.
    """
    from backend.app.services.pipeline_service import seed_database_from_csv
    seed_database_from_csv(settings.DATA_RAW_DIR)
    return {"message": "Sample data seeded and batch scoring executed successfully."}

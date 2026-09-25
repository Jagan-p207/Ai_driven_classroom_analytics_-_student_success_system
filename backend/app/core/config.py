import os
from dataclasses import dataclass

@dataclass
class Settings:
    PROJECT_NAME: str = "AI-Driven Classroom Analytics and Student Success System"
    API_V1_STR: str = "/api"
    
    # Database config: PostgreSQL in Docker, fallback to SQLite for local standalone demo
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./classroom_analytics.db"
    )
    
    # ML Models directory
    MODEL_DIR: str = os.getenv("MODEL_DIR", "ml/models")
    DATA_RAW_DIR: str = os.getenv("DATA_RAW_DIR", "data/raw")
    DATA_PROCESSED_DIR: str = os.getenv("DATA_PROCESSED_DIR", "data/processed")

    # Batch scoring interval (seconds) if background daemon is active
    RECOMPUTE_INTERVAL_SECONDS: int = int(os.getenv("RECOMPUTE_INTERVAL_SECONDS", "3600"))

settings = Settings()

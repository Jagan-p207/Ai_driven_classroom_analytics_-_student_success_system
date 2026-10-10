import os
from dataclasses import dataclass, field

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

    # CORS origins
    CORS_ORIGINS: list = field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,*"
            ).split(",")
            if origin.strip()
        ]
    )

settings = Settings()

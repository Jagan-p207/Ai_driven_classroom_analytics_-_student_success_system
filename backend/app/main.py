import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.services.pipeline_service import init_db, seed_database_from_csv
from backend.app.services.scheduler_service import scheduler

from backend.app.api.ingest import router as ingest_router
from backend.app.api.students import router as students_router
from backend.app.api.class_analytics import router as class_router
from backend.app.api.recompute import router as recompute_router
from backend.app.api.model_info import router as model_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize tables and seed if empty
    logger.info("Starting up Classroom Analytics System...")
    init_db()
    seed_database_from_csv(settings.DATA_RAW_DIR)
    scheduler.start()
    yield
    # Shutdown: Stop scheduler
    logger.info("Shutting down Classroom Analytics System...")
    scheduler.stop()

app = FastAPI(
    title="AI-Driven Classroom Analytics and Student Success System",
    description="Early-warning classroom dashboard that flags at-risk students by fusing attendance, assessment marks, and LMS activity.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers under both /api and root paths for maximum compatibility with requested spec
app.include_router(ingest_router, prefix="/api", tags=["Data Ingestion"])
app.include_router(students_router, prefix="/api", tags=["Students & Risk"])
app.include_router(class_router, prefix="/api", tags=["Class Analytics"])
app.include_router(recompute_router, prefix="/api", tags=["Model Scoring"])
app.include_router(model_router, prefix="/api", tags=["Model Transparency"])

# Direct routes without /api prefix as specified in prompt
app.include_router(ingest_router, prefix="", tags=["Data Ingestion (Direct)"])
app.include_router(students_router, prefix="", tags=["Students & Risk (Direct)"])
app.include_router(class_router, prefix="", tags=["Class Analytics (Direct)"])
app.include_router(recompute_router, prefix="", tags=["Model Scoring (Direct)"])

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Classroom Analytics & Student Success API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=True)

"""
Database package for EduPulse AI.
Exposes database session factory, engine, and dependency for FastAPI routes.
"""

from backend.app.core.database import SessionLocal, engine, Base, get_db

__all__ = ["SessionLocal", "engine", "Base", "get_db"]

"""
Scheduler Service: Manages scheduled periodic batch risk score recomputations.
Executes in a background thread without blocking the FastAPI event loop.
"""

import threading
import time
import logging
from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.services.pipeline_service import run_full_batch_pipeline

logger = logging.getLogger("scheduler")

class BatchScorerScheduler:
    def __init__(self, interval_seconds: int = 3600):
        self.interval = interval_seconds
        self._stop_event = threading.Event()
        self._thread = None
        self.last_run_time = None
        self.last_result = None

    def start(self):
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info(f"Background Batch Scorer started (interval: {self.interval}s)")

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=3)
        logger.info("Background Batch Scorer stopped")

    def _run_loop(self):
        while not self._stop_event.is_set():
            # Wait for interval or stop event
            if self._stop_event.wait(timeout=self.interval):
                break
            try:
                self.trigger_manual_recompute()
            except Exception as e:
                logger.error(f"Error during scheduled batch scoring: {e}")

    def trigger_manual_recompute(self):
        logger.info("Executing batch scoring run...")
        db = SessionLocal()
        try:
            result = run_full_batch_pipeline(db)
            self.last_run_time = result.get("timestamp")
            self.last_result = result
            logger.info(f"Batch scoring completed: {result.get('students_scored')} students scored.")
            return result
        finally:
            db.close()

scheduler = BatchScorerScheduler(interval_seconds=settings.RECOMPUTE_INTERVAL_SECONDS)

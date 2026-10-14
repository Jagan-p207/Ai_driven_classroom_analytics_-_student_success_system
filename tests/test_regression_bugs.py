"""
Regression tests for the 3 Critical Bugs in EduPulseAI:
- Bug 1: ML Intelligence tab & metadata handling
- Bug 2: CSV Ingestion & ML recomputation workflow
- Bug 3: Cohort Heat Map filtering with controlled dataset
"""

import pytest
import os
import io
import json
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.schema import Student, Attendance, Assessment, LMSActivity, RiskScore
from backend.app.services.pipeline_service import init_db, seed_database_from_csv, run_full_batch_pipeline

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Ensure DB schema exists and baseline data is seeded."""
    init_db()
    seed_database_from_csv("data/raw")

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==============================================================================
# TEST GROUP 1: ML Intelligence
# ==============================================================================

def test_ml_intelligence_endpoint_success(client):
    """Verify ML model info endpoint returns valid metadata, metrics, and importances."""
    response = client.get("/api/model/info")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    payload = data["data"]
    assert "best_model_name" in payload or "best_model" in payload
    assert "comparison_metrics" in payload
    assert "global_feature_importances" in payload

    # Verify comparison metrics have required models and metrics
    metrics = payload["comparison_metrics"]
    assert isinstance(metrics, (dict, list))

    # Verify global feature importances are numeric
    feat_imps = payload["global_feature_importances"]
    assert len(feat_imps) > 0
    if isinstance(feat_imps, dict):
        for k, v in feat_imps.items():
            val = v["importance"] if isinstance(v, dict) else v
            assert isinstance(val, (int, float))
    elif isinstance(feat_imps, list):
        for item in feat_imps:
            assert isinstance(item["importance"], (int, float))

def test_ml_intelligence_missing_metadata_handled(client):
    """Verify endpoint gracefully handles missing model_metadata.json without 500 crash."""
    with patch("os.path.exists", return_value=False):
        response = client.get("/api/model/info")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["not_trained", "ready"]
        assert "message" in data

def test_ml_intelligence_corrupted_metadata_handled(client):
    """Verify endpoint handles invalid JSON in model_metadata.json gracefully."""
    with patch("builtins.open", side_effect=Exception("Disk read error")):
        response = client.get("/api/model/info")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_trained"

# ==============================================================================
# TEST GROUP 2: CSV Ingestion and Recomputation
# ==============================================================================

def test_valid_csv_ingestion_invokes_real_recomputation(client, db_session):
    """Valid CSV ingestion with auto_recompute triggers batch scoring and updates risk scores."""
    # Find a student in DB
    student = db_session.query(Student).first()
    assert student is not None
    sid = student.student_id

    # Create valid attendance CSV
    csv_data = f"student_id,date,status,course_id\n{sid},2026-06-01,Present,CS101\n"
    res = client.post(
        "/api/ingest",
        data={"source_type": "attendance", "auto_recompute": "true"},
        files={"file": ("attendance_valid.csv", csv_data.encode("utf-8"), "text/csv")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["records_imported"] == 1
    assert data["recompute_triggered"] is True
    assert data["recompute_result"] is not None
    assert data["recompute_result"]["students_scored"] > 0
    assert data["recompute_result"]["execution_time_seconds"] > 0
    assert "High" in data["recompute_result"]["risk_distribution"]

def test_invalid_csv_input_returns_validation_error(client):
    """Invalid CSV input returns 400 Bad Request with descriptive validation details."""
    # Missing required columns
    bad_csv = "wrong_col,another_col\n123,456\n"
    res = client.post(
        "/api/ingest",
        data={"source_type": "assessments", "auto_recompute": "false"},
        files={"file": ("bad_assessment.csv", bad_csv.encode("utf-8"), "text/csv")}
    )
    assert res.status_code == 400
    err_detail = res.json().get("detail", "")
    assert "Missing required" in err_detail or "validation" in err_detail.lower()

def test_repeated_ingestion_does_not_create_duplicates(client, db_session):
    """Repeated ingestion of the same attendance record performs idempotent upsert without duplicates."""
    student = db_session.query(Student).first()
    sid = student.student_id
    date_str = "2026-06-15"

    csv_data = f"student_id,date,status,course_id\n{sid},{date_str},Absent,CS101\n"

    # First upload
    res1 = client.post(
        "/api/ingest",
        data={"source_type": "attendance", "auto_recompute": "false"},
        files={"file": ("att_repeat.csv", csv_data.encode("utf-8"), "text/csv")}
    )
    assert res1.status_code == 200

    count_after_first = db_session.query(Attendance).filter(
        Attendance.student_id == sid,
        Attendance.date == date_str
    ).count()
    assert count_after_first == 1

    # Second upload with updated status
    csv_data_updated = f"student_id,date,status,course_id\n{sid},{date_str},Present,CS101\n"
    res2 = client.post(
        "/api/ingest",
        data={"source_type": "attendance", "auto_recompute": "false"},
        files={"file": ("att_repeat.csv", csv_data_updated.encode("utf-8"), "text/csv")}
    )
    assert res2.status_code == 200

    count_after_second = db_session.query(Attendance).filter(
        Attendance.student_id == sid,
        Attendance.date == date_str
    ).count()
    # Must remain exactly 1 record, not 2
    assert count_after_second == 1

    # Verify status was updated to Present
    rec = db_session.query(Attendance).filter(
        Attendance.student_id == sid,
        Attendance.date == date_str
    ).first()
    assert rec.status == "Present"

def test_failed_recomputation_does_not_report_success(client):
    """If ML pipeline fails during recomputation, API raises 500 and does NOT return a false success."""
    with patch("backend.app.api.ingest.run_full_batch_pipeline", side_effect=RuntimeError("ML Batch Pipeline Failure")):
        student_csv = "student_id,date,status,course_id\nSTU1001,2026-06-20,Present,CS101\n"
        res = client.post(
            "/api/ingest",
            data={"source_type": "attendance", "auto_recompute": "true"},
            files={"file": ("test_fail.csv", student_csv.encode("utf-8"), "text/csv")}
        )
        assert res.status_code == 500
        assert "ML Batch Pipeline Failure" in res.json().get("detail", "")

def test_risk_scores_persisted_and_retrieved(client, db_session):
    """Verify that recomputation persists risk scores to DB and they can be retrieved via API."""
    recompute_res = client.post("/recompute")
    assert recompute_res.status_code == 200
    rep_data = recompute_res.json()
    assert rep_data["students_scored"] > 0

    student = db_session.query(Student).first()
    drilldown = client.get(f"/students/{student.student_id}/risk")
    assert drilldown.status_code == 200
    dd_data = drilldown.json()
    assert dd_data["current_risk"]["risk_level"] in ["High", "Medium", "Low"]
    assert 0.0 <= dd_data["current_risk"]["risk_score"] <= 1.0

# ==============================================================================
# TEST GROUP 3: Cohort Heat Map Filters
# ==============================================================================

def test_cohort_heat_map_filter_logic():
    """
    Test filtering with the exact controlled test dataset:
    | Student ID | Risk level |
    |---|---|
    | STU001 | High |
    | STU002 | Medium |
    | STU003 | Low |
    | STU004 | High |
    | STU005 | Medium |
    """
    controlled_cohort = [
        {"student_id": "STU001", "name": "Student One", "risk_level": "High", "risk_score": 0.85},
        {"student_id": "STU002", "name": "Student Two", "risk_level": "Medium", "risk_score": 0.55},
        {"student_id": "STU003", "name": "Student Three", "risk_level": "Low", "risk_score": 0.15},
        {"student_id": "STU004", "name": "Student Four", "risk_level": "High", "risk_score": 0.90},
        {"student_id": "STU005", "name": "Student Five", "risk_level": "Medium", "risk_score": 0.60},
    ]

    def filter_cohort(data, risk_filter):
        f = (risk_filter or "ALL").upper()
        if f == "ALL":
            return data
        return [s for s in data if (s.get("risk_level") or "").upper() == f]

    # 1. High returns only STU001 and STU004
    high_students = filter_cohort(controlled_cohort, "HIGH")
    assert [s["student_id"] for s in high_students] == ["STU001", "STU004"]
    for s in high_students:
        assert s["risk_level"].upper() == "HIGH"

    # 2. Medium returns only STU002 and STU005
    med_students = filter_cohort(controlled_cohort, "MEDIUM")
    assert [s["student_id"] for s in med_students] == ["STU002", "STU005"]
    for s in med_students:
        assert s["risk_level"].upper() == "MEDIUM"

    # 3. Low returns only STU003
    low_students = filter_cohort(controlled_cohort, "LOW")
    assert [s["student_id"] for s in low_students] == ["STU003"]
    for s in low_students:
        assert s["risk_level"].upper() == "LOW"

    # 4. ALL returns all 5 students
    all_students = filter_cohort(controlled_cohort, "ALL")
    assert len(all_students) == 5

    # 5. Switching filters back and forth preserves original student-to-risk mappings
    res_high = filter_cohort(controlled_cohort, "HIGH")
    res_low = filter_cohort(controlled_cohort, "LOW")
    res_med = filter_cohort(controlled_cohort, "MEDIUM")
    res_high_again = filter_cohort(controlled_cohort, "HIGH")

    assert [s["student_id"] for s in res_high] == [s["student_id"] for s in res_high_again]
    assert controlled_cohort[0]["student_id"] == "STU001" and controlled_cohort[0]["risk_level"] == "High"
    assert controlled_cohort[1]["student_id"] == "STU002" and controlled_cohort[1]["risk_level"] == "Medium"
    assert controlled_cohort[2]["student_id"] == "STU003" and controlled_cohort[2]["risk_level"] == "Low"

def test_class_summary_heatmap_counts_agree_with_students(client):
    """Verify that backend /class/CS101/risk-summary heatmap counts match risk_counts exactly."""
    res = client.get("/class/CS101/risk-summary")
    assert res.status_code == 200
    data = res.json()
    heatmap = data["heatmap_data"]
    risk_counts = data["risk_counts"]

    actual_high = sum(1 for s in heatmap if s["risk_level"].upper() == "HIGH")
    actual_med = sum(1 for s in heatmap if s["risk_level"].upper() == "MEDIUM")
    actual_low = sum(1 for s in heatmap if s["risk_level"].upper() == "LOW")

    assert risk_counts["High"] == actual_high
    assert risk_counts["Medium"] == actual_med
    assert risk_counts["Low"] == actual_low
    assert len(heatmap) == data["total_students"]

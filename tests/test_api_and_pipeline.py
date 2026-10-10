"""
End-to-end integration and API tests for the Classroom Analytics System.
"""

import pytest
import os
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.services.pipeline_service import init_db, seed_database_from_csv

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure database schema is created and seeded before running tests."""
    init_db()
    seed_database_from_csv("data/raw")

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_class_risk_summary_endpoint(client):
    response = client.get("/class/CS101/risk-summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_students" in data
    assert data["total_students"] > 0
    assert "risk_counts" in data
    assert "heatmap_data" in data
    assert len(data["heatmap_data"]) > 0

def test_list_students_endpoint(client):
    response = client.get("/students")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    first_student = data[0]
    assert "student_id" in first_student
    assert "risk_level" in first_student
    assert "risk_score" in first_student

def test_student_risk_drilldown_endpoint(client):
    # Fetch first student from list
    list_res = client.get("/students")
    assert list_res.status_code == 200
    students = list_res.json()
    assert len(students) > 0
    test_id = students[0]["student_id"]

    # Test drill-down
    detail_res = client.get(f"/students/{test_id}/risk")
    assert detail_res.status_code == 200
    data = detail_res.json()
    assert data["student"]["student_id"] == test_id
    assert "current_risk" in data
    assert "contributing_factors" in data["current_risk"]
    assert "recommendations" in data["current_risk"]
    assert "assessment_history" in data
    assert "attendance_history" in data

def test_recompute_endpoint(client):
    response = client.post("/recompute")
    assert response.status_code == 200
    data = response.json()
    assert data["students_scored"] > 0
    assert "risk_distribution" in data

def test_model_info_endpoint(client):
    response = client.get("/api/model/info")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "comparison_metrics" in data["data"]

def test_interventions_crud_workflow(client):
    # 1. Fetch a student ID
    students = client.get("/students").json()
    assert len(students) > 0
    sid = students[0]["student_id"]

    # 2. Create intervention
    create_payload = {
        "status": "In Progress",
        "assigned_staff": "Dr. Elena Vance (Academic Counselor)",
        "follow_up_date": "2026-05-30",
        "notes": "Student struggling with quiz marks; scheduled bi-weekly TA sessions."
    }
    create_res = client.post(f"/api/students/{sid}/interventions", json=create_payload)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["student_id"] == sid
    assert created["status"] == "In Progress"
    assert created["assigned_staff"] == "Dr. Elena Vance (Academic Counselor)"
    inv_id = created["id"]

    # 3. List interventions for this student
    list_res = client.get(f"/api/students/{sid}/interventions")
    assert list_res.status_code == 200
    inv_list = list_res.json()
    assert len(inv_list) > 0
    assert any(i["id"] == inv_id for i in inv_list)

    # 4. Update intervention
    update_payload = {
        "status": "Resolved",
        "notes": "Attendance and quiz scores normalized. Case closed."
    }
    update_res = client.put(f"/api/interventions/{inv_id}", json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "Resolved"
    assert updated["notes"] == "Attendance and quiz scores normalized. Case closed."

    # 5. Check interventions overview
    overview_res = client.get("/api/interventions/overview")
    assert overview_res.status_code == 200
    overview_data = overview_res.json()
    assert "total_interventions" in overview_data
    assert overview_data["total_interventions"] > 0

    # 6. Verify student drilldown returns interventions and historical scores
    drilldown = client.get(f"/students/{sid}/risk").json()
    assert "interventions" in drilldown
    assert "historical_risk_scores" in drilldown

def test_historical_analytics_endpoint(client):
    response = client.get("/class/CS101/historical-analytics")
    assert response.status_code == 200
    data = response.json()
    assert "class_id" in data
    assert "milestones" in data
    assert len(data["milestones"]) > 0
    assert "attendance_trend_overall" in data
    assert "risk_tier_shifts" in data
    assert "intervention_metrics" in data

def test_csv_preview_and_validation(client):
    # 1. Test preview with valid CSV
    valid_csv = "student_id,date,status,course_id\nSTU1001,2026-05-18,Present,CS101\nSTU1002,2026-05-18,Late,CS101\n"
    preview_res = client.post(
        "/api/ingest/preview",
        data={"source_type": "attendance"},
        files={"file": ("test_att.csv", valid_csv.encode("utf-8"), "text/csv")}
    )
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert preview_data["can_import"] is True
    assert preview_data["valid_rows_count"] == 2
    assert preview_data["invalid_rows_count"] == 0

    # 2. Test preview with missing columns
    invalid_header_csv = "student_id,score\nSTU1001,90\n"
    inv_header_res = client.post(
        "/api/ingest/preview",
        data={"source_type": "assessments"},
        files={"file": ("bad_header.csv", invalid_header_csv.encode("utf-8"), "text/csv")}
    )
    assert inv_header_res.status_code == 200
    assert inv_header_res.json()["can_import"] is False
    assert len(inv_header_res.json()["issues"]) > 0

    # 3. Test preview with row-level error (invalid status)
    bad_row_csv = "student_id,date,status\nSTU1001,2026-05-19,InvalidStatus\n"
    bad_row_res = client.post(
        "/api/ingest/preview",
        data={"source_type": "attendance"},
        files={"file": ("bad_row.csv", bad_row_csv.encode("utf-8"), "text/csv")}
    )
    assert bad_row_res.status_code == 200
    assert bad_row_res.json()["invalid_rows_count"] == 1

def test_csv_reports_export(client):
    # Test CSV report download
    csv_res = client.get("/api/reports/csv?class_id=CS101")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    content = csv_res.text
    assert "Student ID,Student Name" in content
    assert "Risk Classification" in content

    # Test summary report
    summary_res = client.get("/api/reports/summary?class_id=CS101")
    assert summary_res.status_code == 200
    s_data = summary_res.json()
    assert "total_students" in s_data
    assert "risk_distribution" in s_data


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

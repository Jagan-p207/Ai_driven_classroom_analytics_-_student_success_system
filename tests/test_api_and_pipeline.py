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

def test_predict_single_student_endpoint(client):
    payload = {
        "StudentID": "TEST_STUDENT_01",
        "Gender": 0,
        "Program": 1,
        "YearLevel": 2,
        "ClassTime": 1,
        "QuizTotal": 24.5,
        "Project": 17.0,
        "Midterm": 28.0,
        "Attendance": 8.5,
        "Participation": 1.0,
        "Assignment on time percent": 95,
        "Page Views": 650
    }
    res = client.post("/api/predict/student", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == "TEST_STUDENT_01"
    assert "predicted_grade" in data
    assert 0 <= data["predicted_grade"] <= 100
    assert data["risk_level"] in ["Low", "Medium", "High"]
    assert "risk_probabilities" in data
    assert "contributing_factors" in data
    assert len(data["contributing_factors"]) > 0
    assert "recommendations" in data

def test_predict_batch_endpoint(client):
    payload = {
        "students": [
            {
                "StudentID": "BATCH_01",
                "Gender": 0,
                "Program": 1,
                "YearLevel": 3,
                "ClassTime": 0,
                "QuizTotal": 20.0,
                "Project": 15.0,
                "Midterm": 22.0,
                "Attendance": 7.0,
                "Participation": 0.0,
                "Assignment on time percent": 85,
                "Page Views": 400
            },
            {
                "StudentID": "BATCH_02",
                "Gender": 1,
                "Program": 2,
                "YearLevel": 1,
                "ClassTime": 1,
                "QuizTotal": 28.0,
                "Project": 19.0,
                "Midterm": 32.0,
                "Attendance": 9.5,
                "Participation": 1.0,
                "Assignment on time percent": 100,
                "Page Views": 900
            }
        ]
    }
    res = client.post("/api/predict/batch", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 2
    assert len(data["predictions"]) == 2
    assert data["predictions"][0]["student_id"] == "BATCH_01"
    assert "predicted_grade" in data["predictions"][0]

def test_cohort_analytics_endpoint(client):
    res = client.get("/api/class/CS101/cohort-analytics")
    assert res.status_code == 200
    data = res.json()
    assert data["class_id"] == "CS101"
    assert "by_program" in data
    assert len(data["by_program"]) > 0
    assert "by_year_level" in data
    assert len(data["by_year_level"]) > 0
    assert "by_class_time" in data
    assert "leakage_audit" in data
    assert "leakage_warning" in data["leakage_audit"]

def test_model_info_and_retrain(client):
    info_res = client.get("/api/model/info")
    assert info_res.status_code == 200
    info_data = info_res.json()
    m_data = info_data.get("data", info_data)
    assert "best_model_name" in m_data
    assert "regression_metrics" in m_data
    assert "comparison_metrics" in m_data
    assert "data_leakage_safeguards" in m_data

    # Test retraining pipeline
    retrain_res = client.post("/api/model/retrain")
    assert retrain_res.status_code == 200
    retrain_data = retrain_res.json()
    assert retrain_data["status"] == "success"
    assert retrain_data["record_count"] > 0
    assert "best_classifier" in retrain_data
    assert "best_regressor" in retrain_data



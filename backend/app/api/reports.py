import io
import csv
from datetime import datetime
from fastapi import APIRouter, Depends, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, Dict, Any

from backend.app.core.database import get_db
from backend.app.models.schema import Student, RiskScore, Intervention
from backend.app.services.pipeline_service import get_class_risk_summary, get_historical_analytics
import json

router = APIRouter()

@router.get("/reports/csv")
def download_class_risk_csv(
    class_id: str = Query("CS101", description="Class ID to generate report for"),
    db: Session = Depends(get_db)
):
    """
    Generates and streams a downloadable institutional CSV risk report containing:
    - Student ID, Name, Email, Department
    - Risk classification & continuous risk score
    - Attendance percentage and assessment average
    - Score trajectory slope and composite engagement index
    - Early-warning alert flag & primary risk driver explanation
    - Intervention status, assigned staff, follow-up date, and overdue flag
    """
    students = db.query(Student).filter(Student.class_id == class_id).all()
    if not students:
        students = db.query(Student).all()

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    output = io.StringIO()
    writer = csv.writer(output)

    # Write Metadata Headers
    writer.writerow(["# EduPulseAI Institutional Classroom Analytics & Student Success Report"])
    writer.writerow([f"# Generated At: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"])
    writer.writerow([f"# Class Identifier: {class_id}"])
    writer.writerow([])

    # Table Column Headers
    writer.writerow([
        "Student ID",
        "Student Name",
        "Email",
        "Department",
        "Risk Classification",
        "Continuous Risk Score",
        "Attendance Rate (%)",
        "Assessment Average (%)",
        "Score Trajectory (Slope)",
        "Composite Engagement (0-100)",
        "Alert Triggered",
        "Primary Risk Driver",
        "Recommended Intervention",
        "Intervention Status",
        "Assigned Staff",
        "Follow-Up Date",
        "Follow-Up Overdue"
    ])

    for s in students:
        rs = db.query(RiskScore).filter(RiskScore.student_id == s.student_id).order_by(desc(RiskScore.id)).first()
        inv = db.query(Intervention).filter(Intervention.student_id == s.student_id).order_by(desc(Intervention.id)).first()

        r_level = rs.risk_level if rs else "Low"
        r_score = f"{(rs.risk_score * 100):.1f}%" if rs else "10.0%"
        att = f"{rs.attendance_pct:.1f}%" if rs else "90.0%"
        avg_score = f"{rs.avg_score:.1f}%" if rs else "80.0%"
        trend = f"{rs.score_trend:+.2f}" if rs else "+0.00"
        eng = f"{rs.composite_engagement:.1f}" if rs else "85.0"
        alert = "YES" if (rs and rs.alert_flag) else "NO"

        factors = json.loads(rs.contributing_factors) if (rs and rs.contributing_factors) else []
        recs = json.loads(rs.recommendations) if (rs and rs.recommendations) else []

        driver = factors[0]["label"] if factors else "Healthy Cohort Standing"
        rec = recs[0] if recs else "Monitor normal progress"

        inv_status = inv.status if inv else "None"
        inv_staff = inv.assigned_staff if inv else "Unassigned"
        inv_date = inv.follow_up_date if inv else "N/A"
        is_overdue = "YES" if (inv and inv.status in ["Planned", "In Progress"] and inv.follow_up_date and inv.follow_up_date < today_str) else "NO"

        writer.writerow([
            s.student_id,
            s.name,
            s.email,
            s.department,
            r_level,
            r_score,
            att,
            avg_score,
            trend,
            eng,
            alert,
            driver,
            rec,
            inv_status,
            inv_staff,
            inv_date,
            is_overdue
        ])

    csv_data = output.getvalue()
    filename = f"edupulse_{class_id.lower()}_risk_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/reports/summary")
def get_executive_report_summary(
    class_id: str = Query("CS101"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns structured executive summary for institutional leadership and print briefing.
    """
    class_summary = get_class_risk_summary(db, class_id=class_id)
    history = get_historical_analytics(db, class_id=class_id)

    return {
        "report_title": f"EduPulse AI Executive Risk Summary — Class {class_id}",
        "generated_at": datetime.utcnow().isoformat(),
        "total_students": class_summary["total_students"],
        "risk_distribution": class_summary["risk_counts"],
        "cohort_kpis": {
            "avg_attendance": class_summary["avg_attendance"],
            "avg_score": class_summary["avg_score"],
            "avg_engagement": class_summary["avg_engagement"],
            "active_alerts": class_summary["alert_count"]
        },
        "critical_alerts": class_summary["high_risk_alerts"][:5],
        "risk_shifts": history["risk_tier_shifts"],
        "interventions_summary": history["intervention_metrics"]
    }

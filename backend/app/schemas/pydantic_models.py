from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class StudentBase(BaseModel):
    student_id: str
    name: str
    email: str
    class_id: str = "CS101"
    department: str = "Computer Science"
    enrollment_date: str

class StudentSummary(BaseModel):
    student_id: str
    name: str
    email: str
    class_id: str
    department: str
    risk_level: Optional[str] = "Low"
    risk_score: Optional[float] = 0.0
    attendance_pct: Optional[float] = 0.0
    avg_score: Optional[float] = 0.0
    score_trend: Optional[float] = 0.0
    composite_engagement: Optional[float] = 0.0
    alert_flag: Optional[bool] = False

class ContributingFactor(BaseModel):
    feature: str
    label: str
    value: float
    impact: float
    is_risk_driver: bool

class AssessmentTrendItem(BaseModel):
    name: str
    date: str
    score_obtained: float
    max_score: float
    percentage: float

class AttendanceTrendItem(BaseModel):
    date: str
    status: str
    numeric_value: float

class RiskScoreDetail(BaseModel):
    id: int
    student_id: str
    computed_at: str
    risk_level: str
    risk_score: float
    attendance_pct: float
    avg_score: float
    score_trend: float
    avg_submission_delay: float
    composite_engagement: float
    alert_flag: bool
    contributing_factors: List[ContributingFactor] = []
    recommendations: List[str] = []

class StudentRiskFullProfile(BaseModel):
    student: StudentBase
    current_risk: RiskScoreDetail
    assessment_history: List[AssessmentTrendItem] = []
    attendance_history: List[AttendanceTrendItem] = []
    recent_lms_activities: List[Dict[str, Any]] = []

class HeatmapStudentItem(BaseModel):
    student_id: str
    name: str
    risk_level: str # "Low", "Medium", "High"
    risk_score: float # 0.0 - 1.0
    attendance_pct: float
    avg_score: float
    score_trend: float
    composite_engagement: float
    alert_flag: bool

class ClassRiskSummary(BaseModel):
    class_id: str
    total_students: int
    risk_counts: Dict[str, int] # {"Low": 78, "Medium": 32, "High": 20}
    alert_count: int
    avg_attendance: float
    avg_score: float
    avg_engagement: float
    heatmap_data: List[HeatmapStudentItem]
    high_risk_alerts: List[Dict[str, Any]]

class IngestionResult(BaseModel):
    source: str
    records_processed: int
    validation_status: str
    issues_found: List[str] = []

class IngestResponse(BaseModel):
    message: str
    results: List[IngestionResult]
    pipeline_triggered: bool

class RecomputeResponse(BaseModel):
    message: str
    students_scored: int
    execution_time_seconds: float
    timestamp: str
    risk_distribution: Dict[str, int]

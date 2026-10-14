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
    latest_intervention_status: Optional[str] = None
    latest_intervention_staff: Optional[str] = None
    latest_follow_up_date: Optional[str] = None
    is_intervention_overdue: Optional[bool] = False

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
    confidence: Optional[float] = None
    risk_probabilities: Optional[Dict[str, float]] = None

class HistoricalRiskItem(BaseModel):
    id: int
    computed_at: str
    risk_level: str
    risk_score: float
    composite_engagement: float

class InterventionBase(BaseModel):
    assigned_staff: str
    follow_up_date: str # YYYY-MM-DD
    notes: Optional[str] = None
    status: str = "Planned" # 'Planned', 'In Progress', 'Completed', 'Resolved'

class InterventionCreate(InterventionBase):
    pass

class InterventionUpdate(BaseModel):
    status: Optional[str] = None
    assigned_staff: Optional[str] = None
    follow_up_date: Optional[str] = None
    notes: Optional[str] = None

class InterventionResponse(InterventionBase):
    id: int
    student_id: str
    created_at: str
    updated_at: str
    is_overdue: bool = False

class StudentRiskFullProfile(BaseModel):
    student: StudentBase
    current_risk: RiskScoreDetail
    assessment_history: List[AssessmentTrendItem] = []
    attendance_history: List[AttendanceTrendItem] = []
    recent_lms_activities: List[Dict[str, Any]] = []
    historical_risk_scores: List[HistoricalRiskItem] = []
    interventions: List[InterventionResponse] = []

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
    intervention_status: Optional[str] = None

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
    status: str = "success"
    message: str
    records_imported: int = 0
    duplicates_skipped: int = 0
    results: List[IngestionResult] = []
    pipeline_triggered: bool = False
    recompute_triggered: bool = False
    recompute_result: Optional['RecomputeResponse'] = None

class CSVValidationIssue(BaseModel):
    row: Optional[int] = None
    column: Optional[str] = None
    message: str

class CSVPreviewResponse(BaseModel):
    source_type: str
    filename: str
    file_size_bytes: int
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    duplicate_rows_count: int
    headers: List[str]
    sample_records: List[Dict[str, Any]] = []
    issues: List[CSVValidationIssue] = []
    can_import: bool

class AssessmentMilestone(BaseModel):
    assessment_name: str
    date: str
    avg_score_pct: float
    passing_rate_pct: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int

class HistoricalAnalyticsResponse(BaseModel):
    class_id: str
    milestones: List[AssessmentMilestone]
    attendance_trend_overall: List[Dict[str, Any]]
    risk_tier_shifts: Dict[str, int] # {"improved": X, "stable": Y, "declined": Z}
    intervention_metrics: Dict[str, Any] # {"total": X, "planned": Y, "in_progress": Z, "resolved": W, "overdue": V}

class RecomputeResponse(BaseModel):
    message: str
    students_scored: int
    execution_time_seconds: float
    timestamp: str
    risk_distribution: Dict[str, int]

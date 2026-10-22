from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.core.database import Base

class Student(Base):
    __tablename__ = "students"

    student_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    class_id = Column(String(50), index=True, nullable=False, default="CS101")
    department = Column(String(100), nullable=False, default="Computer Science")
    enrollment_date = Column(String(50), nullable=False)
    gender = Column(Integer, nullable=True, default=0)
    program = Column(Integer, nullable=True, default=1)
    year_level = Column(Integer, nullable=True, default=3)
    class_time = Column(Integer, nullable=True, default=0)

    # Relationships
    attendance_records = relationship(
        "Attendance",
        back_populates="student",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    assessments = relationship(
        "Assessment",
        back_populates="student",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    lms_activities = relationship(
        "LMSActivity",
        back_populates="student",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    risk_scores = relationship(
        "RiskScore",
        back_populates="student",
        cascade="all, delete-orphan",
        order_by="desc(RiskScore.id)",
        lazy="selectin"
    )
    interventions = relationship(
        "Intervention",
        back_populates="student",
        cascade="all, delete-orphan",
        order_by="desc(Intervention.id)",
        lazy="selectin"
    )

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False) # 'Present', 'Late', 'Absent'
    course_id = Column(String(50), nullable=False, default="CS101")

    student = relationship("Student", back_populates="attendance_records")

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_name = Column(String(100), nullable=False)
    date = Column(String(50), nullable=False)
    max_score = Column(Float, nullable=False)
    score_obtained = Column(Float, nullable=False)
    course_id = Column(String(50), nullable=False, default="CS101")

    student = relationship("Student", back_populates="assessments")

class LMSActivity(Base):
    __tablename__ = "lms_activity"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String(100), nullable=False)
    timestamp = Column(String(50), nullable=False)
    delay_days = Column(Float, nullable=False, default=0.0)
    completion_status = Column(String(30), nullable=False) # 'Completed', 'Late', 'Missing'
    score_or_views = Column(Float, nullable=False, default=0.0)

    student = relationship("Student", back_populates="lms_activities")

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True)
    computed_at = Column(String(50), nullable=False, default=lambda: datetime.utcnow().isoformat())
    risk_level = Column(String(20), nullable=False) # 'Low', 'Medium', 'High'
    risk_score = Column(Float, nullable=False) # 0.0 to 1.0
    predicted_grade = Column(Float, nullable=True) # Model predicted FinalGrade
    observed_grade = Column(Float, nullable=True) # Actual institutional FinalGrade
    attendance_pct = Column(Float, nullable=False)
    avg_score = Column(Float, nullable=False)
    score_trend = Column(Float, nullable=False) # linear slope
    avg_submission_delay = Column(Float, nullable=False)
    composite_engagement = Column(Float, nullable=False)
    alert_flag = Column(Boolean, nullable=False, default=False)
    contributing_factors = Column(Text, nullable=True) # JSON array of top SHAP / feature factors
    recommendations = Column(Text, nullable=True) # JSON array of actionable recommendations
    confidence = Column(Float, nullable=True, default=0.9)
    risk_probabilities = Column(Text, nullable=True) # JSON dict {"Low": p, "Medium": p, "High": p}

    student = relationship("Student", back_populates="risk_scores")
 
class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="Planned")  # 'Planned', 'In Progress', 'Completed', 'Resolved'
    assigned_staff = Column(String(100), nullable=False)
    follow_up_date = Column(String(50), nullable=False)  # 'YYYY-MM-DD'
    notes = Column(Text, nullable=True)
    created_at = Column(String(50), nullable=False, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String(50), nullable=False, default=lambda: datetime.utcnow().isoformat())

    student = relationship("Student", back_populates="interventions")

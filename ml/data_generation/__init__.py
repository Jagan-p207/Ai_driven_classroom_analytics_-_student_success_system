"""
Data generation module for EduPulse AI.
Contains synthetic cohort generation utilities for realistic classroom simulation.
"""

from ml.data_generation.synthetic_data_generator import (
    generate_student_profiles,
    generate_attendance_logs,
    generate_assessments,
    generate_lms_activity,
    generate_and_save_all
)

__all__ = [
    "generate_student_profiles",
    "generate_attendance_logs",
    "generate_assessments",
    "generate_lms_activity",
    "generate_and_save_all"
]

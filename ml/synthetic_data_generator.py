"""
Synthetic Data Generator proxy for backward compatibility.
Delegates to ml.data_generation.synthetic_data_generator.
"""

from ml.data_generation.synthetic_data_generator import (
    generate_student_profiles,
    generate_attendance_logs,
    generate_assessments,
    generate_lms_activity,
    generate_and_save_all
)

if __name__ == "__main__":
    generate_and_save_all()

"""
Synthetic Data Generator for AI-Driven Classroom Analytics and Student Success System.
Generates realistic institutional data for ~130 students across a semester:
- Students
- Attendance logs (45 class sessions)
- Assessment marks (5 major assessments)
- LMS Activity / Assignment logs (10 assignments/activities)
"""

import os
import random
import datetime
import numpy as np
import pandas as pd

# Set reproducible random seed
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

FIRST_NAMES = [
    "Aarav", "Aditi", "Alexander", "Amara", "Carlos", "Chloe", "David", "Elena",
    "Fatima", "Gabriel", "Grace", "Hannah", "Hassan", "Ishaan", "Jack", "Jasmine",
    "Liam", "Maya", "Noah", "Olivia", "Priya", "Rahul", "Sophia", "Tariq",
    "Vikram", "Zoe", "Benjamin", "Charlotte", "Daniel", "Emily", "Ethan", "Freya",
    "George", "Harper", "Ian", "Jessica", "Kai", "Layla", "Mason", "Nadia",
    "Oliver", "Penelope", "Quinn", "Rohan", "Samantha", "Thomas", "Uma", "Victor",
    "William", "Zara"
]

LAST_NAMES = [
    "Sharma", "Patel", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
    "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
    "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis",
    "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres",
    "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
    "Campbell", "Mitchell", "Carter", "Roberts"
]

def generate_student_profiles(num_students=130, class_id="CS101", department="Computer Science"):
    """
    Generate student roster with 3 distinct behavioral archetypes:
    - High Achievers / Stable (Low Risk, ~60%): 78 students
    - Moderate / Inconsistent (Medium Risk, ~25%): 33 students
    - Declining / Disengaged (High Risk, ~15%): 19 students
    """
    students = []
    used_names = set()
    
    num_low = int(num_students * 0.60)
    num_med = int(num_students * 0.25)
    num_high = num_students - num_low - num_med

    archetypes = (
        ["low_risk"] * num_low +
        ["medium_risk"] * num_med +
        ["high_risk"] * num_high
    )
    random.shuffle(archetypes)

    enrollment_start = datetime.date(2026, 1, 15)

    for i in range(num_students):
        student_id = f"STU{1001 + i}"
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        full_name = f"{fn} {ln}"
        while full_name in used_names:
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            full_name = f"{fn} {ln}"
        used_names.add(full_name)

        email = f"{fn.lower()}.{ln.lower()}{random.randint(10, 99)}@university.edu"
        archetype = archetypes[i]

        students.append({
            "student_id": student_id,
            "name": full_name,
            "email": email,
            "class_id": class_id,
            "department": department,
            "enrollment_date": enrollment_start.strftime("%Y-%m-%d"),
            "archetype": archetype  # internal ground truth generator flag (not in public DB)
        })

    return students

def generate_attendance_logs(students, class_id="CS101"):
    """
    45 sessions across 15 weeks (Monday, Wednesday, Friday)
    Feb 2, 2026 through May 15, 2026
    """
    attendance_records = []
    rec_id = 1

    # Generate dates: 15 weeks x 3 days
    start_date = datetime.date(2026, 2, 2) # Monday
    session_dates = []
    current_date = start_date
    while len(session_dates) < 45:
        if current_date.weekday() in [0, 2, 4]: # Mon, Wed, Fri
            session_dates.append(current_date)
        current_date += datetime.timedelta(days=1)

    for s in students:
        sid = s["student_id"]
        arch = s["archetype"]

        for session_idx, sdate in enumerate(session_dates):
            # progression ratio (0.0 to 1.0 through the semester)
            prog = session_idx / 44.0

            if arch == "low_risk":
                # Consistently 90-98% present
                present_prob = 0.94 - 0.03 * prog
                late_prob = 0.04
            elif arch == "medium_risk":
                # Starts 85%, drops to 70% in second half
                present_prob = 0.85 - 0.20 * prog
                late_prob = 0.10
            else: # high_risk
                # Starts 65%, plunges to 25% in later weeks
                present_prob = max(0.20, 0.65 - 0.45 * prog)
                late_prob = 0.15

            absent_prob = max(0.0, 1.0 - present_prob - late_prob)
            status = np.random.choice(
                ["Present", "Late", "Absent"],
                p=[present_prob, late_prob, absent_prob]
            )

            attendance_records.append({
                "id": rec_id,
                "student_id": sid,
                "date": sdate.strftime("%Y-%m-%d"),
                "status": status,
                "course_id": class_id
            })
            rec_id += 1

    return attendance_records

def generate_assessments(students, class_id="CS101"):
    """
    5 assessments:
    1. Quiz 1 (Week 3, max 20)
    2. Quiz 2 (Week 6, max 20)
    3. Midterm Exam (Week 9, max 100)
    4. Quiz 3 (Week 12, max 20)
    5. Final Project Milestone (Week 14, max 50)
    """
    assessments_meta = [
        {"name": "Quiz 1 - Foundations", "date": "2026-02-20", "max_score": 20},
        {"name": "Quiz 2 - Data Structures", "date": "2026-03-13", "max_score": 20},
        {"name": "Midterm Exam", "date": "2026-04-03", "max_score": 100},
        {"name": "Quiz 3 - Algorithms", "date": "2026-04-24", "max_score": 20},
        {"name": "Project Milestone - Architecture", "date": "2026-05-08", "max_score": 50}
    ]

    records = []
    rec_id = 1

    for s in students:
        sid = s["student_id"]
        arch = s["archetype"]

        # Base ability (as a percentage 0-100)
        if arch == "low_risk":
            base_score_pct = random.uniform(82, 95)
            trend_slope = random.uniform(-0.5, 1.5) # stable or improving
        elif arch == "medium_risk":
            base_score_pct = random.uniform(62, 78)
            trend_slope = random.uniform(-3.5, 0.5) # slight dip
        else: # high_risk
            base_score_pct = random.uniform(50, 68)
            trend_slope = random.uniform(-8.0, -3.0) # severe declining trend

        for idx, meta in enumerate(assessments_meta):
            max_s = meta["max_score"]
            # score pct at this index
            pct = base_score_pct + trend_slope * idx + random.gauss(0, 3.5)
            pct = max(15.0, min(100.0, pct))
            score = round((pct / 100.0) * max_s, 1)

            records.append({
                "id": rec_id,
                "student_id": sid,
                "assessment_name": meta["name"],
                "date": meta["date"],
                "max_score": max_s,
                "score_obtained": score,
                "course_id": class_id
            })
            rec_id += 1

    return records

def generate_lms_activity(students, class_id="CS101"):
    """
    10 LMS assignments and activity checkpoints throughout the semester.
    Logs delay_days (negative = early, 0 = on time, positive = late, 10+ or missing)
    """
    assignments = [
        {"name": "Assignment 1 - Setup & Hello World", "due": datetime.date(2026, 2, 8)},
        {"name": "Assignment 2 - Memory Management", "due": datetime.date(2026, 2, 18)},
        {"name": "Lab 1 - Linked List Implementation", "due": datetime.date(2026, 2, 28)},
        {"name": "Assignment 3 - Trees & Recursion", "due": datetime.date(2026, 3, 10)},
        {"name": "Lab 2 - Binary Search Trees", "due": datetime.date(2026, 3, 22)},
        {"name": "Assignment 4 - Graph Algorithms", "due": datetime.date(2026, 4, 5)},
        {"name": "Lab 3 - Shortest Path Solver", "due": datetime.date(2026, 4, 15)},
        {"name": "Assignment 5 - Dynamic Programming", "due": datetime.date(2026, 4, 26)},
        {"name": "Lab 4 - Concurrency & Threads", "due": datetime.date(2026, 5, 4)},
        {"name": "Project Final Submission", "due": datetime.date(2026, 5, 12)}
    ]

    records = []
    rec_id = 1

    for s in students:
        sid = s["student_id"]
        arch = s["archetype"]

        for idx, assign in enumerate(assignments):
            due = assign["due"]
            prog = idx / 9.0

            if arch == "low_risk":
                # Submits on time or early, rarely late
                delay = int(np.random.choice([-1, 0, 1], p=[0.4, 0.55, 0.05]))
                status = "Completed" if delay <= 0 else "Late"
                views = random.randint(12, 35)
            elif arch == "medium_risk":
                # Average 1-3 days late, occasional missing in late semester
                delay = int(np.random.choice([0, 1, 2, 3, 5], p=[0.25, 0.35, 0.20, 0.15, 0.05]))
                status = "Completed" if delay == 0 else "Late"
                views = random.randint(5, 18)
            else: # high_risk
                # Progressively gets later, misses several assignments
                delay_choice = np.random.choice([0, 2, 4, 7, 12, -99], p=[0.1, 0.15, 0.25, 0.2, 0.15, 0.15])
                if delay_choice == -99:
                    delay = 14 # counted as missed / overdue
                    status = "Missing"
                else:
                    delay = int(delay_choice + int(3 * prog))
                    status = "Late" if delay > 0 else "Completed"
                views = random.randint(1, 8)

            sub_date = due + datetime.timedelta(days=delay) if status != "Missing" else due + datetime.timedelta(days=14)
            timestamp = f"{sub_date.strftime('%Y-%m-%d')} {random.randint(10, 23)}:{random.randint(10, 59)}:00"

            records.append({
                "id": rec_id,
                "student_id": sid,
                "activity_type": assign["name"],
                "timestamp": timestamp,
                "delay_days": delay,
                "completion_status": status,
                "score_or_views": views
            })
            rec_id += 1

    return records

def generate_and_save_all(output_dir="data/raw", num_students=130):
    """Generate all datasets and save to CSVs."""
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Generating synthetic classroom data for {num_students} students...")
    students = generate_student_profiles(num_students=num_students)
    attendance = generate_attendance_logs(students)
    assessments = generate_assessments(students)
    lms_activity = generate_lms_activity(students)

    # Save to data/raw
    df_students = pd.DataFrame(students)
    # remove archetype from raw exported csv to reflect real institutional database table
    df_students_export = df_students.drop(columns=["archetype"])
    df_students_export.to_csv(os.path.join(output_dir, "students.csv"), index=False)

    df_attendance = pd.DataFrame(attendance)
    df_attendance.to_csv(os.path.join(output_dir, "attendance.csv"), index=False)

    df_assessments = pd.DataFrame(assessments)
    df_assessments.to_csv(os.path.join(output_dir, "assessments.csv"), index=False)

    df_lms = pd.DataFrame(lms_activity)
    df_lms.to_csv(os.path.join(output_dir, "lms_activity.csv"), index=False)

    # Also save metadata/archetype ground truth for evaluation
    df_students[["student_id", "archetype"]].to_csv(os.path.join(output_dir, "ground_truth_labels.csv"), index=False)

    print(f"Data generation complete!")
    print(f"  - students.csv: {len(df_students_export)} rows")
    print(f"  - attendance.csv: {len(df_attendance)} rows")
    print(f"  - assessments.csv: {len(df_assessments)} rows")
    print(f"  - lms_activity.csv: {len(df_lms)} rows")
    print(f"Files saved in: {output_dir}")

    return {
        "students": df_students_export,
        "attendance": df_attendance,
        "assessments": df_assessments,
        "lms": df_lms,
        "ground_truth": df_students[["student_id", "archetype"]]
    }

if __name__ == "__main__":
    generate_and_save_all()

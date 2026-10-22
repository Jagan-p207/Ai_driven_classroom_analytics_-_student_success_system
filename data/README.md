# EduPulse AI — Data Architecture & Storage Layers

This directory organizes the raw institutional dataset and registrar records for the EduPulse AI classroom analytics platform.

---

## 🏛️ Directory Structure

```
data/
├── student_dataset.csv           # Full institutional dataset (192 records, 14 columns)
├── raw/                          # Fallback CSV templates for modular ingestion
│   ├── assessments.csv           # Student marks across semester assessments
│   ├── attendance.csv            # Individual session attendance records (Present/Late/Absent)
│   ├── ground_truth_labels.csv   # Evaluation labels (archetype assignment for benchmarking)
│   ├── lms_activity.csv          # Coursework submission records & delay metrics
│   └── students.csv              # Student directory and demographic attributes
├── processed/                    # Scored batch outputs & cached feature tables
└── README.md                     # Data documentation
```

---

## 📋 Full Institutional Dataset Schema (`student_dataset.csv`)

| Column Name | Data Type | Range / Values | Description | Role in ML Pipeline |
| :--- | :---: | :---: | :--- | :--- |
| `StudentID` | String | `F01` – `F192` | Unique student record key | **Excluded** (Record Identifier) |
| `Gender` | Integer | `0`, `1` | Student gender indicator | **Predictive Feature** |
| `Program` | Integer | `1`, `2`, `3`, `4` | Degree Program Track | **Predictive Feature** |
| `YearLevel` | Integer | `1`, `2`, `3`, `4` | Academic Standing (Freshman–Senior) | **Predictive Feature** |
| `ClassTime` | Integer | `0`, `1` | Course Schedule Section (Morning / Afternoon) | **Predictive Feature** |
| `QuizTotal` | Float | `0.0` – `30.0` | Continuous quiz cumulative score | **Predictive Feature** |
| `Project` | Float | `0.0` – `20.0` | Coursework project score | **Predictive Feature** |
| `Midterm` | Float | `0.0` – `35.0` | Midterm examination mark | **Predictive Feature** |
| `Final` | Float | `0.0` – `35.0` | End-of-term examination mark | **Excluded** (Data Leakage Safeguard) |
| `FinalGrade` | Float | `7.48` – `99.73` | Total course cumulative grade | **Target Variable** (Regression & Tier Classification) |
| `Attendance` | Float | `0.0` – `10.0` | Class session attendance score | **Predictive Feature** |
| `Participation` | Float | `0.0` – `4.0` | Interactive participation tally | **Predictive Feature** |
| `Assignment on time percent`| Integer | `0` – `100` | Punctual LMS assignment ratio (%) | **Predictive Feature** |
| `Page Views` | Integer | `15` – `1730` | Course LMS resource page view count | **Predictive Feature** |

---

## 🔒 Data Leakage Prevention Notice

The institutional grading policy computes:
$$\text{FinalGrade} = \text{QuizTotal} + \text{Project} + \text{Midterm} + \text{Final} + \text{Attendance}$$

Because `Final` is the end-of-semester exam accounting for $\approx 25\text{--}30\%$ of the grade, it is only known after the course has finished. Including `Final` in feature extraction would artificially inflate accuracy to $>0.99$ while rendering the early-warning system incapable of identifying struggling students mid-semester.

Therefore, `Final`, `FinalGrade`, and `StudentID` are strictly excluded from predictive features $X$.

---

## 🔄 Retraining & Database Seeding

To seed the SQLite database from `student_dataset.csv`:
```bash
python -c "from backend.app.services.pipeline_service import seed_database_from_csv; seed_database_from_csv(force=True)"
```
Or send a `POST` request to `/api/seed` or `/api/ingest` with `source_type="student_dataset"`.

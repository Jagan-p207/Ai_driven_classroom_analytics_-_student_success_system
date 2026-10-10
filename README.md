# AI-Driven Classroom Analytics and Student Success System (EduPulse)

An early-warning institutional analytics dashboard that flags at-risk students by fusing attendance, internal assessment marks, and LMS/assignment activity into a unified, explainable risk score.

> 📖 **Developer Onboarding**: For a complete overview of features, stack, and onboarding steps for new contributors, see the [Developer Onboarding & Project Handover Guide](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/DEVELOPER_GUIDE.md).

---

## 🏛️ System Architecture (Three-Tier)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│   React.js 19 + Recharts + Glassmorphism UI (Vite / Nginx Port 3000)   │
│   - Class Cohort Risk Heat-Map Matrix (Interactive Tiles & Tooltips)   │
│   - Student Risk Roster & Sortable Registry                            │
│   - Student Drill-Down Modal with Assessment Trajectory & Attendance   │
│   - SHAP Explainability & Risk Driver Attribution Cards                │
│   - Early-Warning Alert Banner with Actionable AI Interventions        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                    PROCESSING & ML SCORING LAYER                       │
│                   FastAPI (Python 3.11, Port 8000)                     │
│   - Feature Engineering Module (Slopes, Delays, Composite Engagement)  │
│   - Model Serving: Joblib Model + TreeSHAP / SHAP Explainer            │
│   - Background Scheduler: Periodic Batch Recomputation Worker         │
│   - Benchmark Suite: Logistic Regression, Random Forest, XGBoost       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│                             DATA LAYER                                 │
│             PostgreSQL 16 (or SQLite fallback for dev)                 │
│   - Student: Central student directory                                 │
│   - Attendance: Session attendance records (Present / Late / Absent)   │
│   - Assessment: Chronological exam & quiz scores                       │
│   - LMS_Activity: Submission timeliness, delay days, and views         │
│   - Risk_Score: Classification, continuous score, SHAP factors, alert  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

1. **Synthetic Data Generator (`ml/synthetic_data_generator.py`)**:
   - Fabricates realistic semester data for 130 students across Class `CS101` with 3 behavioral archetypes (High Achievers/Stable, Moderate/Inconsistent, and Declining/Disengaged).
   - Generates 45 attendance sessions, 5 major assessments (Quiz 1, Quiz 2, Midterm, Quiz 3, Project Milestone), and 10 LMS coursework submissions.
2. **Feature Engineering Module (`ml/feature_engineering.py`)**:
   - Attendance percentage (`attendance_pct`) and linear attendance trajectory slope (`attendance_trend`).
   - Average assessment score (`avg_score`) and chronological performance slope (`score_trend`).
   - Average submission delay (`avg_submission_delay`), delay trajectory slope, and missing coursework count.
   - 0–100 fused `composite_engagement` score combining attendance (35%), academics (30%), timeliness (20%), and LMS participation (15%).
3. **Machine Learning & SHAP Explainability (`ml/train_models.py`, `ml/batch_scorer.py`)**:
   - Trains and compares Logistic Regression (Baseline), Random Forest (Primary), and XGBoost (Alternative).
   - Computes 5-fold cross-validation and independent test set Accuracy, Macro F1, and Weighted F1.
   - Evaluates local SHAP values per student to highlight top drivers of risk (e.g. negative exam score slope, persistent delays) and provide targeted interventions.
4. **Interactive Dashboard (`frontend/`)**:
   - Class cohort heat-map matrix with live risk color gradation and hover tooltips.
   - Drill-down modal with historical assessment trajectory area chart, attendance history, and LMS logs.
   - Batch recomputation trigger with live progress notifications.
   - Ingestion modal for bulk CSV record uploads.
   - ML model transparency modal showing benchmarks and global feature importance rankings.

---

## 📊 Database Schema

All entities maintain foreign key constraints against `students.student_id`:

- **`students`**: `student_id` (PK), `name`, `email`, `class_id`, `department`, `enrollment_date`
- **`attendance`**: `id` (PK), `student_id` (FK), `date`, `status` (Present/Late/Absent), `course_id`
- **`assessments`**: `id` (PK), `student_id` (FK), `assessment_name`, `date`, `max_score`, `score_obtained`, `course_id`
- **`lms_activity`**: `id` (PK), `student_id` (FK), `activity_type`, `timestamp`, `delay_days`, `completion_status`, `score_or_views`
- **`risk_scores`**: `id` (PK), `student_id` (FK), `computed_at`, `risk_level` (Low/Medium/High), `risk_score` (0.0–1.0), `attendance_pct`, `avg_score`, `score_trend`, `avg_submission_delay`, `composite_engagement`, `alert_flag`, `contributing_factors` (JSON), `recommendations` (JSON)

---

## ⚡ Quick Start: Running with Docker Compose

To launch PostgreSQL, FastAPI Backend, and React Frontend in containers:

```bash
docker-compose up --build
```

- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 💻 Running Standalone (Without Docker)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+

### 2. Launch Everything Concurrently
Run the provided launcher:
```bash
python start_local.py
```
This automatically verifies synthetic data generation, model training, and starts both the FastAPI backend (`http://127.0.0.1:8000`) and the Vite React frontend (`http://127.0.0.1:5173`).

### 3. Or Run Individual Services
**Generate Data & Train Model:**
```bash
python ml/synthetic_data_generator.py
python ml/feature_engineering.py
python ml/train_models.py
```

**Start Backend:**
```bash
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Start Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/class/{class_id}/risk-summary` | Class-level summary, heat-map student matrix, and at-risk alerts |
| `GET` | `/class/{class_id}/historical-analytics` | Milestone progression, attendance trajectory, risk mobility & intervention statistics |
| `GET` | `/students` | Roster list with risk tiers, filters (`risk_level`, `search`), and metrics |
| `GET` | `/students/{student_id}/risk` | Student drill-down profile, score trend lines, probabilities & SHAP factors |
| `POST` | `/students/{student_id}/interventions` | Assign counselor intervention with follow-up dates & action notes |
| `GET` | `/students/{student_id}/interventions` | Retrieve student intervention history |
| `PUT` | `/interventions/{intervention_id}` | Update status (`IN_PROGRESS`, `RESOLVED`, `ESCALATED`) |
| `POST` | `/ingest/preview` | Dry-run validation of uploaded CSV (checks schema, FKs, types & preview) |
| `POST` | `/ingest` | Bulk CSV commit for attendance, marks, LMS logs, or students |
| `GET` | `/reports/csv` | Download institution-grade risk & intervention roster as CSV |
| `GET` | `/reports/summary` | Executive high-level risk overview metrics |
| `POST` | `/recompute` | Manually triggers the batch scoring job across all students |
| `GET` | `/api/model/info` | Returns model benchmark comparison table, 3x3 confusion matrix & global importances |
| `POST` | `/api/seed` | Resets/reloads pilot demo dataset (130 students) |
| `GET` | `/health` | Health check endpoint |

---

## 🌐 Production Cloud Deployment

### 1. Deploy Frontend to Vercel
EduPulseAI includes ready-to-use `vercel.json` configurations for both root and subfolder deployments.
1. Connect your repository on [vercel.com](https://vercel.com).
2. Set **Root Directory** to `frontend` (or leave as root `/`).
3. Set Build Command: `npm run build`
4. Set Output Directory: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: Your deployed FastAPI backend URL (e.g., `https://edupulse-backend.onrender.com`).
6. Click **Deploy**.

### 2. Deploy Frontend to Netlify
The repository includes a ready-to-use `netlify.toml` and SPA redirect rules.
1. Connect your GitHub repository on [netlify.com](https://app.netlify.com).
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. In **Environment Variables**, add:
   - `VITE_API_URL`: Your deployed FastAPI backend URL.
6. Click **Deploy Site**.

### 3. Deploy Backend to Render (or Railway / VPS)
The repository includes `render.yaml` for 1-click infrastructure deployment:
1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), select **Blueprints** -> New Blueprint Instance -> connect this repository.
3. Render automatically provisions:
   - FastAPI Backend with Uvicorn on Python 3.11 (`pip install -r backend/requirements.txt`).
   - React Vite static frontend linked to the backend service.

---

## 🧪 Automated Testing

Execute the comprehensive 10-suite test pipeline:

```bash
python -m pytest tests/test_api_and_pipeline.py -v
```
All 10 test suites validate:
- SQLite schema & automatic migration
- Batch scoring pipeline & SHAP local explainability
- Model confidence & continuous multiclass probability calculation
- Synthetic pilot data seeding
- Class analytics & heat-map matrix contracts
- Student risk profiles with trend history
- Counselor interventions CRUD & overdue status calculation
- Historical analytics & milestone risk shifts
- CSV ingestion schema validation & error preview
- Executive report metrics & institutional CSV roster download

---

## 🔒 Constraints & Ethics
- **Strictly No Surveillance**: Facial recognition, webcam monitoring, and proctoring surveillance are strictly out of scope.
- **Explainability by Design**: Every classification includes transparent, human-auditable contributing factors and targeted pedagogical interventions.

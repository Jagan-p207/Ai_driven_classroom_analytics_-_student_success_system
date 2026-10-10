# 🎓 EduPulse: AI-Driven Classroom Analytics and Student Success System
## Developer Onboarding & Project Handover Guide

> **System Overview**: An institutional early-warning analytics dashboard that identifies at-risk students by fusing attendance, internal assessment marks, and LMS/coursework activity into an explainable risk prediction with targeted pedagogical interventions.
>
> **Core Ethics & Privacy**: Strictly surveillance-free (no facial recognition, webcams, or proctoring surveillance). All predictive signals are transparent, explainable, and pedagogical.

---

## 🏛️ System Architecture (Three-Tier)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│   React 19 + Recharts 3 + Vite 8 + Glassmorphism UI (Port 5173 / 3000) │
│   - Class Cohort Risk Heat-Map Matrix (Interactive Tiles & Tooltips)   │
│   - Student Risk Roster & Sortable Registry                            │
│   - Student Drill-Down Modal with Assessment Trajectory & Attendance   │
│   - SHAP Explainability & Risk Driver Attribution Cards                │
│   - Early-Warning Alert Banner with Actionable AI Interventions        │
│   - Bulk CSV Ingestion Modal & ML Model Transparency Explorer          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API (JSON / Multipart CSV)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    PROCESSING & ML SCORING LAYER                       │
│                   FastAPI (Python 3.11+, Port 8000)                    │
│   - Feature Engineering Module (Slopes, Delays, Composite Engagement)  │
│   - Model Serving: Joblib Model + TreeSHAP Explainer                   │
│   - Background Scheduler: Periodic Batch Recomputation Worker         │
│   - Benchmark Suite: Logistic Regression, Random Forest, XGBoost       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│                             DATA LAYER                                 │
│             PostgreSQL 16 (Docker) / SQLite 3 (Local Fallback)         │
│   - Student: Central student directory                                 │
│   - Attendance: Session records (Present / Late / Absent)              │
│   - Assessment: Chronological exam, quiz & project scores              │
│   - LMS_Activity: Submission timeliness, delay days, and views         │
│   - Risk_Score: Classification tier, continuous score, SHAP factors    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Complete Technology Stack

| Layer | Technologies & Libraries | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend UI** | **React 19**, **Vite 8**, **Vanilla CSS**, **Recharts 3**, **Lucide React** | Dark-mode glassmorphic dashboard, responsive heat-map matrix, trajectory area charts, real-time filters and modals |
| **Backend API** | **FastAPI (0.110+)**, **Pydantic v2**, **Uvicorn**, **HTTPX**, **python-multipart** | High-throughput asynchronous REST API, request validation, CSV stream parsing, daemon task scheduling |
| **Database & ORM** | **SQLAlchemy 2.0**, **PostgreSQL 16** (production), **SQLite 3** (local dev fallback) | Entity modeling, relational constraints, foreign keys, transaction rollbacks, bulk insert operations |
| **Machine Learning & Data Science** | **Scikit-learn (1.4+)**, **XGBoost (2.0+)**, **SHAP (0.44+)**, **Pandas (2.2+)**, **NumPy**, **SciPy**, **Joblib** | Longitudinal slope calculations, multi-model cross-validation, TreeSHAP local attributions, batch inferencing |
| **Containerization & DevOps** | **Docker**, **Docker Compose**, **Nginx** | Multi-service orchestration (`db`, `backend`, `frontend`), production reverse proxy |
| **Testing & Quality** | **Pytest**, **FastAPI TestClient**, **Oxlint** | Automated end-to-end integration test suites for DB seeding, batch computation, and REST endpoints |

---

## 🚀 Key Features & System Capabilities

### 1. Multi-Stream Data Ingestion & Quality Validation
- **Ingestion Sources Supported**:
  - `students`: Central student directory (`student_id`, `name`, `email`, `class_id`, `department`).
  - `attendance`: Session records (`student_id`, `date`, `status` [Present/Late/Absent], `course_id`).
  - `assessments`: Chronological marks (`student_id`, `assessment_name`, `date`, `max_score`, `score_obtained`).
  - `lms_activity`: Submission timeliness (`student_id`, `activity_type`, `timestamp`, `delay_days`, `completion_status`).
- **Data Quality & Validation**:
  - Validates CSV schemas and detects missing required columns.
  - Flags invalid score ranges ($> 100\%$ or negative values).
  - Flags unrecognized attendance statuses or duplicate student records.
- **Dynamic Scoring Pipeline**: Supports an `auto_recompute=True` option that immediately runs feature extraction and scoring upon CSV upload.

### 2. Longitudinal Feature Engineering & Trend Slopes
Located in [`ml/feature_engineering.py`](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/ml/feature_engineering.py):
- **Linear Trend Slope ($m$)**: Uses Ordinary Least Squares (OLS) regression over sequential chronological timestamps to model direction and velocity of student engagement:
  $$m = \frac{\sum (x - \bar{x})(y - \bar{y})}{\sum (x - \bar{x})^2}$$
- **Features Extracted**:
  - `attendance_pct`: Weighted attendance rate ($\text{Present} = 1.0$, $\text{Late} = 0.5$, $\text{Absent} = 0.0$).
  - `attendance_trend`: OLS slope over attendance history (detects early disengagement).
  - `avg_score`: Average assessment percentage score.
  - `score_trend`: OLS slope across chronological quizzes and exams (flags continuous drops).
  - `score_std`, `min_score`, `max_score`, `recent_score`: Volatility and recent performance.
  - `avg_submission_delay`: Mean submission delay (in days) across LMS assignments.
  - `delay_trend`: Longitudinal slope of assignment delays (detects compounding procrastination).
  - `missing_count` & `completion_rate`: Unsubmitted coursework tracking.
- **Composite Engagement Index (0–100 Fused Metric)**:
  $$\text{Engagement} = (\text{Attendance}\times 35\%) + (\text{Academics}\times 30\%) + (\text{Timeliness}\times 20\%) + (\text{LMS Activity}\times 15\%)$$

### 3. Machine Learning & TreeSHAP Explainability
Located in [`ml/train_models.py`](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/ml/train_models.py) and [`ml/batch_scorer.py`](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/ml/batch_scorer.py):
- **Model Suite Benchmark**: Compares 3 algorithms with 5-Fold Stratified Cross-Validation:
  1. *Logistic Regression* (Interpretable linear baseline)
  2. *Random Forest Classifier* (Primary champion; handles non-linear behavioral boundaries)
  3. *XGBoost Classifier* (High-capacity gradient boosted decision trees)
- **Three-Tier Risk Classification**:
  - 🟢 **Low Risk** ($< 0.35$ probability of distress)
  - 🟡 **Medium Risk** ($0.35 - 0.65$ probability of distress)
  - 🔴 **High Risk** ($\ge 0.65$ probability of distress; flags urgent intervention alert)
- **Local SHAP Attribution**: Computes exact game-theoretic SHAP values per student to quantify how much each specific behavior shifted the risk score up or down.
- **Automated Pedagogical Action Recommendations**: Maps top negative SHAP factors to specific, helpful interventions:
  - Persistent negative score slope $\to$ *"Schedule 1-on-1 subject tutoring and foundational revision."*
  - Escalating submission delays $\to$ *"Provide time-management guidance and assignment milestone checkpoints."*
  - Poor attendance trend $\to$ *"Conduct academic advising check-in to identify potential personal hurdles."*

### 4. Interactive Teacher Dashboard (UI Features)
Located in [`frontend/src/components/`](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/frontend/src/components/):
- **Overview Stat Cards (`RiskOverviewCards.jsx`)**: Total student count, High/Medium/Low counts, class average attendance, and engagement index.
- **Class Heat-Map Matrix (`ClassHeatmap.jsx`)**:
  - Interactive grid representing all students with smooth color gradation based on risk.
  - Hover tooltips displaying quick metrics; click to open full drill-down.
- **High-Risk Alert Banner (`AlertBanner.jsx`)**:
  - Prominent banner summarizing flagged students, primary risk drivers, and direct drill-down links.
- **Sortable Student Registry (`StudentRiskTable.jsx`)**:
  - Full roster with search by name, student ID, or email.
  - Filter pills for `All`, `High`, `Medium`, `Low`.
  - Sortable by Risk Score, Attendance %, Assessment Average, and Engagement Index.
- **Student Deep Drill-Down Modal (`StudentDetailModal.jsx`)**:
  - Historical chronological assessment trajectory chart (Recharts Line/Area).
  - Attendance breakdown metrics.
  - SHAP Contributing Factors cards with positive/negative attribution badges.
  - Targeted pedagogical intervention checklist.
  - Complete historical transaction logs (Attendance, Assessments, LMS Activity).
- **Model Transparency Modal (`ModelInfoModal.jsx`)**:
  - Model benchmark comparison table (Accuracy, Macro F1, Weighted F1).
  - Global feature importance ranking bar chart.
- **Bulk CSV Ingestion Modal (`IngestionModal.jsx`)**:
  - Upload interface supporting all 4 CSV types with schema validation feedback.
- **One-Click Pilot Seeding**: Quick reset/reseed button generating a 130-student cohort with balanced behavioral archetypes (`Stable`, `Inconsistent`, `Declining`).

---

## 📊 Database Schema & Relationships

```
                     ┌───────────────────────┐
                     │       students        │
                     ├───────────────────────┤
                     │ PK student_id (TEXT)  │
                     │    name (TEXT)        │
                     │    email (TEXT)       │
                     │    class_id (TEXT)    │
                     │    department (TEXT)  │
                     │    enrollment_date    │
                     └───────────┬───────────┘
                                 │ 1:N
        ┌────────────────────────┼────────────────────────┬──────────────────────┐
        │                        │                        │                      │
┌───────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐    ┌────────▼────────┐
│   attendance   │      │   assessments   │      │  lms_activity   │    │   risk_scores   │
├────────────────┤      ├─────────────────┤      ├─────────────────┤    ├─────────────────┤
│ PK id          │      │ PK id           │      │ PK id           │    │ PK id           │
│ FK student_id  │      │ FK student_id   │      │ FK student_id   │    │ FK student_id   │
│    date        │      │    assessment_  │      │    activity_    │    │    computed_at  │
│    status      │      │    name         │      │    type         │    │    risk_level   │
│    course_id   │      │    date         │      │    timestamp    │    │    risk_score   │
└────────────────┘      │    max_score    │      │    delay_days   │    │    attendance_  │
                        │    score_       │      │    completion_  │    │    pct          │
                        │    obtained     │      │    status       │    │    avg_score    │
                        │    course_id    │      │    score_or_    │    │    score_trend  │
                        └─────────────────┘      │    views        │    │    composite_   │
                                                 └─────────────────┘    │    engagement   │
                                                                        │    alert_flag   │
                                                                        │    contributing_│
                                                                        │    factors(JSON)│
                                                                        │    recommen-    │
                                                                        │    dations(JSON)│
                                                                        └─────────────────┘
```

---

## 📂 Repository Layout

```text
AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── class_analytics.py    # Class-level summary and heat-map API
│   │   │   ├── ingest.py             # CSV file upload and DB ingestion
│   │   │   ├── model_info.py         # ML benchmark metrics and global weights
│   │   │   ├── recompute.py          # Manual batch scoring trigger
│   │   │   └── students.py           # Student list, filters, and drill-down
│   │   ├── core/
│   │   │   ├── config.py             # App settings and environment variables
│   │   │   └── database.py           # SQLAlchemy engine & session factory
│   │   ├── models/
│   │   │   └── schema.py             # Relational ORM models
│   │   ├── schemas/
│   │   │   └── pydantic_models.py    # Pydantic schemas for request/response serialization
│   │   ├── services/
│   │   │   ├── pipeline_service.py   # DB queries, feature extraction & scoring coordinator
│   │   │   └── scheduler_service.py  # Background periodic scoring worker daemon
│   │   └── main.py                   # FastAPI initialization, CORS, and lifespans
│   ├── requirements.txt              # Backend & ML Python dependencies
│   └── Dockerfile                    # Container configuration for FastAPI
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertBanner.jsx       # High-risk alert notification banner
│   │   │   ├── ClassHeatmap.jsx      # Class matrix heat-map with live tooltips
│   │   │   ├── IngestionModal.jsx    # Drag-and-drop CSV upload modal
│   │   │   ├── ModelInfoModal.jsx    # Model benchmark & SHAP transparency card
│   │   │   ├── Navbar.jsx            # Header bar with navigation and action triggers
│   │   │   ├── RiskOverviewCards.jsx # Class summary metric cards
│   │   │   ├── StudentDetailModal.jsx# Deep drill-down trajectory and SHAP cards
│   │   │   └── StudentRiskTable.jsx  # Sortable and searchable student roster
│   │   ├── services/
│   │   │   └── api.js                # Frontend API client
│   │   ├── App.jsx & App.css         # Main application container
│   │   └── index.css                 # Dark-mode glassmorphism styling
│   ├── package.json                  # React 19, Recharts, Lucide, Vite
│   ├── vite.config.js                # Vite development server with proxy rules
│   └── nginx.conf & Dockerfile       # Nginx production container build
│
├── ml/
│   ├── synthetic_data_generator.py   # Generates 130 realistic student records across 3 archetypes
│   ├── feature_engineering.py        # Trend slope calculation, validation & engagement formula
│   ├── train_models.py               # Trains LR, RF, XGBoost + exports TreeSHAP explainer
│   ├── batch_scorer.py               # Batch evaluation and student risk attribution
│   └── models/
│       ├── best_model.joblib         # Trained Random Forest classifier
│       ├── shap_explainer.joblib     # Pre-computed TreeSHAP explainer
│       └── model_metadata.json       # Feature names, benchmarks, and performance metrics
│
├── data/
│   ├── raw/                          # Raw CSV files (students, attendance, assessments, lms)
│   └── processed/                    # Extracted features CSV
│
├── tests/
│   └── test_api_and_pipeline.py      # Pytest automated API and pipeline integration tests
│
├── classroom_analytics.db            # SQLite zero-config local development database
├── docker-compose.yml                # Multi-container orchestration (DB, API, Frontend)
├── start_local.py                    # One-command dual-server launcher
└── README.md                         # Main repository readme
```

---

## 📡 REST API Reference

All endpoints are accessible with or without the `/api` prefix:

| Method | Endpoint | Query / Body Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Service health status and version |
| `GET` | `/class/{class_id}/risk-summary` | `class_id` path param | Class stats, cohort heat-map tiles, and active high-risk alerts |
| `GET` | `/students` | `risk_level`, `search`, `class_id` | Student list with risk scores, filters, and metric summaries |
| `GET` | `/students/{student_id}/risk` | `student_id` path param | Detailed student risk profile, trajectory series, and SHAP factors |
| `POST` | `/recompute` | None | Triggers immediate batch feature engineering and ML re-scoring |
| `POST` | `/ingest` | `source_type` (form), `file` (CSV), `auto_recompute` (bool) | Ingests CSV data for students, attendance, marks, or LMS logs |
| `GET` | `/api/model/info` | None | Benchmark comparison table & global feature importances |
| `POST` | `/api/seed` | None | Resets and re-populates the 130-student pilot demo dataset |

Interactive Swagger UI documentation is available at **`http://localhost:8000/docs`**.

---

## 💻 How to Run & Continue Development in Your IDE

### Method 1: Standalone Local Setup (Recommended)

#### 1. Prerequisites
- **Python 3.11+** installed and available in terminal.
- **Node.js 18+** & **npm** installed.

#### 2. Setup Python Virtual Environment
Open a terminal in the project root directory:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# Install backend and ML dependencies
pip install -r backend/requirements.txt
```

#### 3. Setup Frontend
```bash
cd frontend
npm install
cd ..
```

#### 4. Launch the Complete System
Run the unified launcher:
```bash
python start_local.py
```
This script will:
- Auto-generate synthetic raw data if missing (`data/raw/`).
- Train and persist the ML models if missing (`ml/models/`).
- Launch FastAPI on **`http://127.0.0.1:8000`** with auto-reload.
- Launch the Vite React development server on **`http://localhost:5173`**.

---

### Method 2: Running with Docker Compose
If you prefer running in Docker with a dedicated PostgreSQL database:
```bash
docker-compose up --build
```
- **Frontend Dashboard**: `http://localhost:3000`
- **FastAPI Documentation**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432` (`postgres` / `postgres`)

---

### Method 3: Running the Automated Test Suite
To verify that database seeding, feature computation, and API endpoints are functioning properly:
```bash
pytest tests/test_api_and_pipeline.py -v
```

---

## 🎯 Next Steps & Future Extension Ideas

Here are great ideas for features your friend can add to this project:
1. **Role-Based Authentication (RBAC)**:
   - Add OAuth2 / JWT login with distinct roles: `Faculty` (view assigned classes and trigger interventions) vs. `Academic Dean / Admin` (system-wide analytics, ingestion, and model retraining).
2. **Automated Notification Dispatcher**:
   - Integrate an email or webhook service (e.g., SendGrid, Slack, Microsoft Teams) to notify academic advisors when a student is newly flagged as "High Risk".
3. **Live LMS Connectors**:
   - Build direct API connectors for Canvas LMS, Moodle, or Google Classroom to pull grades and submissions automatically without manual CSV uploads.
4. **Cohort Comparison Analytics**:
   - Add a comparative multi-class view (e.g., comparing CS101 Section A vs. Section B) to help faculty identify systemic course bottlenecks.

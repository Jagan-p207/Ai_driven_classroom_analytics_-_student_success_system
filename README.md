# EduPulse AI — AI-Driven Classroom Analytics and Student Success System

An institutional early-warning analytics platform and decision-support system that identifies at-risk students by synthesizing longitudinal attendance records, internal assessment scores, and LMS submission patterns into unified, explainable risk assessments.

[![Backend Tests](https://img.shields.io/badge/pytest-24%20passed-emerald)](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/tests/test_api_and_pipeline.py)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-passed-emerald)](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/frontend/tests/test_components.mjs)
[![Vite Build](https://img.shields.io/badge/vite%20build-passing-emerald)](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/frontend)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-19.0-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)](https://fastapi.tiangolo.com/)

---

## 🏛️ Executive Summary & Product Architecture

EduPulse AI is an institutional early-warning analytics platform and decision-support system that identifies at-risk students by synthesizing longitudinal attendance records, internal assessment scores, and LMS submission patterns into unified, explainable risk assessments.

### Key Capabilities & New Dataset Integration (192 Students)
- **Full Institutional Dataset Integration**: Powered by a 192-student, 14-column dataset (`data/student_dataset.csv`) spanning continuous assessment marks, LMS page views, and demographic attributes.
- **Strict Data Leakage Prevention**: Mathematically audited $\text{FinalGrade} = \text{QuizTotal} + \text{Project} + \text{Midterm} + \text{Final} + \text{Attendance}$. The end-of-term `Final` exam mark is strictly excluded to prevent artificial $>0.99$ target leakage and guarantee genuine mid-semester early-warning utility.
- **Dual Machine Learning Engine**:
  - **Academic Risk Classification**: Random Forest Classifier achieving **87.2% test accuracy** and **0.854 weighted F1** across High, Medium, and At-Risk tiers.
  - **Continuous Grade Prediction**: Linear Regression Regressor explaining **92.1% of grade variance** ($R^2 = 0.921$) with an average absolute error of just **$\pm 2.19$ percentage points** ($\text{MAE} = 2.19$).
- **Explainable AI (TreeSHAP)**: Computes local Shapley game-theoretic attributions for every prediction, pinpointing the exact behavioral and academic factors influencing each student's trajectory.
- **Demographic & Cohort Breakdown**: Multi-dimensional analytics tracking student progress across Degree Programs (1–4), Academic Year Standings (1–4), and Class Schedule Slots.
- **Calm, High-Density Institutional UX**: Eliminates distracting crypto/neon aesthetics in favor of a calm, high-density editorial design system (`#f8fafc` canvas, semantic risk taxonomy, WCAG 2.1 AA accessibility).

---

## 🏗️ Repository Architecture

The repository is organized into cleanly decoupled tiers:

```
AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/
├── frontend/                     # React 19 + Vite presentation tier
│   ├── src/
│   │   ├── components/           # Academic UI components
│   │   │   ├── Navbar.jsx        # Institutional header with view navigation
│   │   │   ├── RiskOverviewCards.jsx # Core cohort summary metric cards
│   │   │   ├── AlertBanner.jsx   # Urgent intervention alert notification
│   │   │   ├── ClassHeatmap.jsx  # Interactive cohort risk matrix with exact filters & tooltips
│   │   │   ├── CohortAnalyticsSection.jsx # Degree program, standing & schedule cohort analytics
│   │   │   ├── StudentRiskTable.jsx  # Paginated roster with cohort filters & predicted grades
│   │   │   ├── StudentDetailModal.jsx # Student dossier, predicted vs observed grade & SHAP drivers
│   │   │   ├── ModelInfoModal.jsx # Dual ML benchmarks, retrain button, confusion matrix & leakage audit
│   │   │   ├── IngestionModal.jsx# CSV ingestion & validation workflow (supports 14-column dataset)
│   │   │   ├── HistoricalAnalyticsSection.jsx # Longitudinal progression tracking
│   │   │   └── ErrorBoundary.jsx # Graceful UI fallback boundary
│   │   ├── styles/
│   │   │   └── design-tokens.css # Institutional academic color tokens & variables
│   │   ├── utils/
│   │   │   └── formatters.js     # Formats percentages, dates, risk levels & slopes
│   │   ├── App.jsx               # Main orchestration view & notification state
│   │   └── index.css             # Base reset & typography system
│   ├── tests/
│   │   └── test_components.mjs   # Regression test suite for normalization & filters
│   ├── package.json              # Frontend scripts & dependencies
│   └── README.md                 # Frontend architecture documentation
│
├── backend/                      # FastAPI asynchronous service tier
│   ├── app/
│   │   ├── api/                  # Modular route controllers
│   │   │   ├── class_analytics.py # Class risk summary, heatmaps & cohort breakdowns
│   │   │   ├── students.py        # Student roster, dossiers, predict/student & predict/batch
│   │   │   ├── interventions.py   # Intervention logging & case tracking
│   │   │   ├── ingest.py          # CSV preview & batch ingestion (14-column student dataset)
│   │   │   ├── reports.py         # Executive summary & CSV roster export
│   │   │   ├── recompute.py       # Batch scoring trigger
│   │   │   └── model_info.py      # ML benchmarks, retrain endpoint & dataset seeder
│   │   ├── core/
│   │   │   ├── config.py         # Environment settings & fallback defaults
│   │   │   └── database.py       # SQLAlchemy engine & session maker
│   │   ├── models/               # SQLAlchemy ORM database models (Student, RiskScore, Intervention, etc.)
│   │   ├── schemas/              # Pydantic v2 validation schemas
│   │   ├── services/
│   │   │   └── pipeline_service.py # Feature extraction, DB seeding, migrations & scoring
│   │   └── main.py               # FastAPI application factory & lifespan startup
│   ├── requirements.txt          # Backend Python dependencies
│   └── README.md                 # Backend API documentation
│
├── ml/                           # Machine learning pipeline tier
│   ├── models/                   # Serialized model artifacts (.joblib, model_metadata.json)
│   │   ├── best_classifier.joblib # Random Forest Classifier (87.2% test accuracy)
│   │   ├── best_regressor.joblib  # Linear Regression Regressor (R² = 0.921, MAE = 2.19)
│   │   ├── best_model.joblib      # Production classifier alias
│   │   ├── preprocessor.joblib    # StandardScaler fitted strictly on training data
│   │   ├── shap_explainer.joblib  # TreeSHAP explainer artifact
│   │   └── model_metadata.json    # Dual benchmarks, confusion matrix, and leakage audit
│   ├── train_models.py           # 5-fold CV & benchmark training pipeline (regression + classification)
│   ├── batch_scorer.py           # Dual inference engine (predicted grade, risk tier, SHAP attributions)
│   ├── synthetic_data_generator.py # Synthetic data generation utility
│   └── README.md                 # ML methodology, leakage audit & explainability documentation
│
├── data/                         # Persistent data directory
│   ├── student_dataset.csv       # Full institutional dataset (192 records, 14 columns)
│   ├── raw/                      # Fallback CSV templates for attendance, marks, LMS & roster
│   ├── processed/                # Scored batch outputs
│   └── README.md                 # Data schemas & ingestion format guides
│
├── tests/                        # Automated integration & regression test suite
│   ├── test_api_and_pipeline.py  # End-to-end API, prediction, cohort & retrain tests (14 tests)
│   └── test_regression_bugs.py   # Database & pipeline regression tests (10 tests)
│
├── scripts/                      # Utility scripts
│   ├── inspect_dataset.py        # Dataset analysis & mathematical leakage audit script
│   └── test_models.py            # Local model loading & inference validation script
│
├── start_local.py                # Dual-server launcher (FastAPI + Vite)
└── README.md                     # Root project documentation
```

---

## ⚡ Quick Start

### Option A: Standard Local Development (Recommended)

1. **Clone the repository and install dependencies**:
   ```bash
   # Backend virtual environment
   python -m venv .venv
   # Windows: .venv\Scripts\activate | Unix: source .venv/bin/activate
   pip install -r backend/requirements.txt

   # Frontend packages
   cd frontend
   npm install --legacy-peer-deps
   cd ..
   ```

2. **Generate synthetic data & train ML models**:
   ```bash
   python ml/synthetic_data_generator.py
   python ml/feature_engineering.py
   python ml/train_models.py
   ```

3. **Launch both backend and frontend servers simultaneously**:
   ```bash
   python start_local.py
   ```
   - **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
   - **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### Option B: Docker Compose

Launch PostgreSQL, FastAPI, and React in isolated production containers:

```bash
docker-compose up --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Automated Testing

Both the backend and frontend include dedicated test suites to prevent regressions.

### 1. Backend Integration & API Test Suite (24 Tests Passing)
```bash
# Run pytest across all suites
python -m pytest
```
Validates:
- SQLite schema & dynamic column migration (`gender`, `program`, `year_level`, `class_time`, `predicted_grade`, `observed_grade`)
- Batch scoring pipeline & TreeSHAP explainability
- Continuous `FinalGrade` prediction and 3-tier risk classification
- On-demand single student inference (`POST /api/predict/student`)
- Batch inference (`POST /api/predict/batch`)
- Academic cohort analytics aggregation (`GET /api/class/{class_id}/cohort-analytics`)
- Dynamic model retraining pipeline (`POST /api/model/retrain`)
- 192-student dataset seeding and scoring
- Student risk profiles with historical trend trajectory
- Counselor interventions CRUD & overdue status calculation
- Historical analytics & milestone risk shifts
- CSV ingestion schema validation & error preview (including 14-column student dataset)
- Executive report metrics & institutional CSV roster download

### 2. Frontend Component Regression Suite
```bash
cd frontend
npm test
```
Validates:
- Model benchmark metrics normalization across empty, baseline, and multi-model datasets.
- Cohort risk heat-map matrix filtering logic (matching counts for ALL, HIGH, MEDIUM, and LOW tiers).

### 3. Production Bundle Validation
```bash
cd frontend
cmd /c npm run build
```
Builds the production distribution into `frontend/dist/` in <1s with zero linting or compilation errors.

---

## 📡 REST API Reference

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/predict/student` | **New**: On-demand inference for an individual student (predicted grade, risk tier, confidence, probabilities, SHAP factors) |
| `POST` | `/api/predict/batch` | **New**: Batch scoring for arbitrary lists of student feature dictionaries |
| `GET` | `/api/class/{class_id}/cohort-analytics` | **New**: Cohort breakdown by Program (1–4), Year Level (1–4), and Class Schedule Slot |
| `POST` | `/api/model/retrain` | **New**: Triggers full retraining of classification and regression models and regenerates metadata |
| `GET` | `/class/{class_id}/risk-summary` | Class-level summary, cohort heat-map matrix, and early-warning alerts |
| `GET` | `/class/{class_id}/historical-analytics` | Milestone progression, attendance trajectory, risk mobility & intervention statistics |
| `GET` | `/students` | Student roster with risk tiers, program/year cohort filters, and predicted grades |
| `GET` | `/students/{student_id}/risk` | Detailed student dossier, predicted vs observed grade, and TreeSHAP attribution factors |
| `POST` | `/students/{student_id}/interventions` | Log counselor intervention with follow-up dates & action notes |
| `GET` | `/students/{student_id}/interventions` | Retrieve student intervention history |
| `PUT` | `/interventions/{intervention_id}` | Update intervention status (`In Progress`, `Resolved`, `Completed`) |
| `POST` | `/api/ingest/preview` | Dry-run schema validation of uploaded CSV (supports 14-column `student_dataset`) |
| `POST` | `/api/ingest` | Bulk CSV commit for attendance, marks, LMS logs, or 14-column `student_dataset` with auto-recompute |
| `GET` | `/api/reports/csv` | Download institutional risk & intervention roster as CSV |
| `GET` | `/api/reports/summary` | Executive high-level risk overview metrics |
| `POST` | `/api/recompute` | Triggers batch feature extraction and ML risk scoring across all students |
| `GET` | `/api/model/info` | Returns model benchmark comparison table, regression metrics, 3x3 confusion matrix & global importances |
| `POST` | `/api/seed` | Resets and reloads the full 192-student institutional dataset |
| `GET` | `/health` | Service health status |

---

## 🔒 Ethical AI & Institutional Governance

1. **Non-Surveillance Commitment**: Facial recognition, webcam monitoring, keystroke logging, and biometric proctoring are strictly out of scope. EduPulse AI relies solely on observable academic participation (attendance, assessment performance, and assignment timeliness).
2. **Actionable Explainability**: Every flagged student receives transparent, human-auditable risk drivers calculated via TreeSHAP (or documented heuristic baseline) alongside targeted pedagogical interventions.
3. **Human-in-the-Loop Interventions**: The platform provides advisory guidance to empower educators and counselors; automated academic penalties or disciplinary actions are never permitted.

---

## 📄 License
This project is licensed under the MIT License — see the LICENSE file for details.

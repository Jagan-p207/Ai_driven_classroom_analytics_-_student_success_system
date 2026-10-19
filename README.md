# EduPulse AI — AI-Driven Classroom Analytics and Student Success System

An institutional early-warning analytics platform and decision-support system that identifies at-risk students by synthesizing longitudinal attendance records, internal assessment scores, and LMS submission patterns into unified, explainable risk assessments.

[![Backend Tests](https://img.shields.io/badge/pytest-20%20passed-emerald)](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/tests/test_api_and_pipeline.py)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-passed-emerald)](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/frontend/tests/test_components.mjs)
[![Vite Build](https://img.shields.io/badge/vite%20build-passing-emerald)](file:///d:/AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/frontend)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-19.0-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)](https://fastapi.tiangolo.com/)

---

## 🏛️ Executive Summary & Product Redesign

EduPulse AI has been redesigned from the ground up to eliminate AI-generated "crypto dashboard" aesthetics (excessive dark glassmorphism, fluorescent neon glows, emoji headers, and arbitrary gradient borders) in favor of a **calm, high-density, accessible institutional design system** designed for educators, academic advisors, and departmental committees.

### Design System Highlights (`frontend/src/styles/design-tokens.css`)
- **Restrained Academic Palette**: Off-white/slate canvas (`#f8fafc`), crisp white card panels (`#ffffff`), and subtle slate structural dividers (`#e2e8f0`).
- **Semantic Risk Taxonomy**:
  - 🔴 **High Risk**: Crimson text (`#991b1b`) on soft rose surface (`#fef2f2`) with solid indicator border (`#fca5a5`).
  - 🟡 **Medium Risk**: Deep amber text (`#92400e`) on warm cream surface (`#fffbeb`) with amber indicator border (`#fcd34d`).
  - 🟢 **Low Risk**: Deep forest emerald text (`#065f46`) on mint surface (`#ecfdf5`) with emerald indicator border (`#6ee7b7`).
- **Explainability Transparency**: Explicitly distinguishes between **Real TreeSHAP Feature Attributions** (when ML TreeExplainer is active) and **Heuristic Baseline Fallbacks** (when baseline models are active).
- **Accessible & High Density**: Full WCAG 2.1 AA compliant contrast ratios, compact tabular data density, clear visual hierarchy, and standardized Lucide React iconography.

---

## 🏗️ Repository Architecture

The repository is organized into cleanly decoupled tiers:

```
AI_DRIVEN_CLASSROOM_ANALYTICS_AND_STUDENT_SUCCESS_SYSTEM/
├── frontend/                     # React 19 + Vite presentation tier
│   ├── src/
│   │   ├── components/           # Redesigned academic UI components
│   │   │   ├── Navbar.jsx        # Institutional header with view navigation
│   │   │   ├── RiskOverviewCards.jsx # Core cohort summary metric cards
│   │   │   ├── AlertBanner.jsx   # Urgent intervention alert notification
│   │   │   ├── ClassHeatmap.jsx  # Interactive cohort risk matrix with exact filters
│   │   │   ├── StudentRiskTable.jsx  # Paginated roster with trajectory slopes
│   │   │   ├── StudentDetailModal.jsx # Comprehensive student dossier & SHAP drivers
│   │   │   ├── ModelInfoModal.jsx # ML benchmarks, confusion matrix & global importances
│   │   │   ├── IngestionModal.jsx# CSV ingestion & validation workflow
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
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   └── endpoints/    # Modular route controllers
│   │   │   │       ├── class_analytics.py # Class risk summary & cohort heatmap
│   │   │   │       ├── students.py        # Student roster & drilldown dossiers
│   │   │   │       ├── interventions.py   # Intervention logging & case tracking
│   │   │   │       ├── ingest.py          # CSV preview & batch ingestion
│   │   │   │       ├── reports.py         # Executive summary & CSV roster export
│   │   │   │       ├── recompute.py       # Batch scoring trigger
│   │   │   │       ├── ml_models.py       # ML benchmarks & feature importances
│   │   │   │       └── historical_analytics.py # Milestone trend comparisons
│   │   │   └── deps.py           # Dependency injection providers
│   │   ├── core/
│   │   │   ├── config.py         # Environment settings & fallback defaults
│   │   │   └── database.py       # SQLAlchemy engine & session maker
│   │   ├── database/
│   │   │   └── __init__.py       # Standard database module exports
│   │   ├── models/               # SQLAlchemy ORM database models
│   │   ├── schemas/              # Pydantic validation schemas
│   │   └── main.py               # FastAPI application factory & middleware
│   ├── requirements.txt          # Backend Python dependencies
│   └── README.md                 # Backend API documentation
│
├── ml/                           # Machine learning pipeline tier
│   ├── data_generation/          # Synthetic student population generators
│   │   ├── __init__.py           # Package exports
│   │   └── synthetic_data_generator.py # Core cohort generator (130 students, 3 archetypes)
│   ├── models/                   # Serialized model artifacts (.joblib, benchmarks.json)
│   ├── synthetic_data_generator.py # Backward-compatible CLI entry point
│   ├── feature_engineering.py    # 12-feature extraction pipeline (slopes, composite scores)
│   ├── train_models.py           # Model training & 5-fold cross-validation suite
│   ├── batch_scorer.py           # Inference engine with TreeSHAP attribution & fallback
│   └── README.md                 # ML methodology & explainability documentation
│
├── data/                         # Persistent data directory
│   ├── raw/                      # CSV templates for attendance, marks, LMS & roster
│   ├── processed/                # Computed feature datasets & student profiles
│   └── README.md                 # Data schemas & ingestion format guides
│
├── tests/                        # Full-stack automated integration test suite
│   └── test_api_and_pipeline.py  # 20 Pytest suites validating end-to-end functionality
│
├── scripts/                      # Developer utility scripts
│   └── start_local.py            # Local dual-server launcher
│
├── docker-compose.yml            # Multi-container orchestration (Postgres, Backend, Frontend)
├── Dockerfile.backend            # Container specification for FastAPI
├── Dockerfile.frontend           # Container specification for React Nginx static build
├── vercel.json                   # Cloud deployment configuration for Vercel
├── netlify.toml                  # Cloud deployment configuration for Netlify
├── render.yaml                   # 1-Click deployment blueprint for Render
├── start_local.py                # Root launcher wrapper
└── .env.example                  # Environment variable template
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

### 1. Backend Integration & API Test Suite (20 Tests)
```bash
# Run pytest with root in PYTHONPATH
python -m pytest tests/test_api_and_pipeline.py -v
```
Validates:
- SQLite schema & automatic migration
- Batch scoring pipeline & SHAP local explainability
- Model confidence & continuous multiclass probability calculation
- Synthetic pilot data seeding
- Class analytics & cohort heat-map matrix contracts
- Student risk profiles with historical trend trajectory
- Counselor interventions CRUD & overdue status calculation
- Historical analytics & milestone risk shifts
- CSV ingestion schema validation & error preview
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
npm run build
```
Builds the production distribution into `frontend/dist/` with zero linting or compilation errors.

---

## 📡 REST API Reference

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/class/{class_id}/risk-summary` | Class-level summary, cohort heat-map matrix, and early-warning alerts |
| `GET` | `/class/{class_id}/historical-analytics` | Milestone progression, attendance trajectory, risk mobility & intervention statistics |
| `GET` | `/students` | Student roster with risk tiers, multi-factor filters, and engagement metrics |
| `GET` | `/students/{student_id}/risk` | Detailed student dossier, score trajectory, and TreeSHAP attribution factors |
| `POST` | `/students/{student_id}/interventions` | Log counselor intervention with follow-up dates & action notes |
| `GET` | `/students/{student_id}/interventions` | Retrieve student intervention history |
| `PUT` | `/interventions/{intervention_id}` | Update intervention status (`IN_PROGRESS`, `RESOLVED`, `ESCALATED`) |
| `POST` | `/ingest/preview` | Dry-run schema validation of uploaded CSV |
| `POST` | `/ingest` | Bulk CSV commit for attendance, marks, LMS logs, or students with automatic recomputation |
| `GET` | `/reports/csv` | Download institutional risk & intervention roster as CSV |
| `GET` | `/reports/summary` | Executive high-level risk overview metrics |
| `POST` | `/recompute` | Triggers batch feature extraction and ML risk scoring across all students |
| `GET` | `/api/model/info` | Returns model benchmark comparison table, 3x3 confusion matrix & global importances |
| `POST` | `/api/seed` | Resets and reloads pilot demo dataset (130 students across 3 behavioral archetypes) |
| `GET` | `/health` | Service health status |

---

## 🔒 Ethical AI & Institutional Governance

1. **Non-Surveillance Commitment**: Facial recognition, webcam monitoring, keystroke logging, and biometric proctoring are strictly out of scope. EduPulse AI relies solely on observable academic participation (attendance, assessment performance, and assignment timeliness).
2. **Actionable Explainability**: Every flagged student receives transparent, human-auditable risk drivers calculated via TreeSHAP (or documented heuristic baseline) alongside targeted pedagogical interventions.
3. **Human-in-the-Loop Interventions**: The platform provides advisory guidance to empower educators and counselors; automated academic penalties or disciplinary actions are never permitted.

---

## 📄 License
This project is licensed under the MIT License — see the LICENSE file for details.

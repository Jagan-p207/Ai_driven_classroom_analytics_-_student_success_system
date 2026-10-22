# EduPulse AI — Backend Service Architecture

The **EduPulse AI** backend is built on **FastAPI** and **SQLAlchemy**, providing high-performance REST endpoints for classroom analytics, registrar data ingestion, automated batch scoring, on-demand student predictions, and explainable AI metrics.

---

## 🏛️ Directory Structure

```
backend/
├── app/
│   ├── api/                     # REST API route handlers
│   │   ├── class_analytics.py   # Cohort aggregates, heatmaps & cohort-analytics breakdowns
│   │   ├── ingest.py            # CSV schema preview, validation & upsert (supports 14-column student dataset)
│   │   ├── model_info.py        # ML benchmarks, retrain endpoint & dataset seeder
│   │   ├── recompute.py         # On-demand batch inference triggering
│   │   ├── reports.py           # Institutional CSV export & summary
│   │   └── students.py          # Student roster, dossiers, predict/student & predict/batch
│   ├── core/
│   │   ├── config.py            # Pydantic BaseSettings environment configuration
│   │   └── database.py          # SQLAlchemy engine, sessionmaker & Base
│   ├── database/
│   │   └── __init__.py          # Exposed database session & dependency layer
│   ├── models/
│   │   └── schema.py            # SQLAlchemy ORM models (Student, Attendance, Assessment, LMSActivity, RiskScore, Intervention)
│   ├── schemas/
│   │   └── pydantic_models.py   # Pydantic v2 validation models
│   ├── services/
│   │   ├── pipeline_service.py  # Data extraction, feature generation, DB migrations, seeding & scoring
│   │   └── scheduler_service.py # Background periodic recomputation scheduler
│   └── main.py                  # Application entry point, lifespan, CORS & routing
├── tests/                       # Backend test fixtures
├── Dockerfile                   # Container build definition
├── requirements.txt             # Python dependencies
└── README.md                    # Backend documentation
```

---

## 🚀 Key Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/predict/student` | **New**: On-demand single student inference (predicted grade, risk tier, confidence, probabilities, SHAP factors) |
| `POST` | `/api/predict/batch` | **New**: High-throughput scoring for arbitrary student feature lists |
| `GET` | `/api/class/{class_id}/cohort-analytics` | **New**: Demographic cohort breakdowns by Degree Program (1–4), Year Level (1–4), and Class Schedule Slot |
| `POST` | `/api/model/retrain` | **New**: Triggers full retraining of classification and regression models and regenerates metadata |
| `GET` | `/api/class/{class_id}/risk-summary` | Class-level summary, cohort heat-map matrix, and early-warning alerts |
| `GET` | `/api/class/{class_id}/historical-analytics` | Milestone progression, attendance trajectory, risk mobility & intervention statistics |
| `GET` | `/api/students` | Student roster with risk tiers, program/year cohort filters, and predicted grades |
| `GET` | `/api/students/{student_id}/risk` | Detailed student dossier, predicted vs observed grade, and TreeSHAP attribution factors |
| `POST` | `/api/students/{student_id}/interventions` | Log counselor intervention with follow-up dates & action notes |
| `POST` | `/api/ingest/preview` | Dry-run schema validation of uploaded CSV (supports 14-column `student_dataset`) |
| `POST` | `/api/ingest` | Bulk CSV commit for attendance, marks, LMS logs, or 14-column `student_dataset` with auto-recompute |
| `GET` | `/api/reports/csv` | Download institutional risk & intervention roster as CSV |
| `POST` | `/api/recompute` | Triggers batch feature extraction and ML risk scoring across all students |
| `GET` | `/api/model/info` | Returns model benchmark comparison table, regression metrics, 3x3 confusion matrix & global importances |
| `POST` | `/api/seed` | Resets and reloads the full 192-student institutional dataset |
| `GET` | `/health` | Service health status |

---

## 🚀 Running Locally

### Prerequisites
- Python 3.11+
- Virtual environment activated (`venv` or system Python)

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Start Uvicorn Server
From the project root:
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Interactive API Docs (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative Docs (ReDoc)**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 🧪 Testing

Run pytest across all 24 backend integration, pipeline, regression, and prediction tests:
```bash
python -m pytest
```

All 24 test suites execute and validate:
- SQLite dynamic column migrations (`gender`, `program`, `year_level`, `class_time`, `predicted_grade`, `observed_grade`).
- On-demand inference and batch prediction schemas.
- Demographic cohort analytics aggregation and leakage audits.
- Full model retraining execution.
- Student dossier retrieval and intervention workflows.

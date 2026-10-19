# EduPulse AI — Backend Service Architecture

The **EduPulse AI** backend is built on **FastAPI** and **SQLAlchemy**, providing high-performance REST endpoints for classroom analytics, registrar data ingestion, automated batch scoring, and explainable AI metrics.

---

## 🏛️ Directory Structure

```
backend/
├── app/
│   ├── api/                     # REST API route handlers
│   │   ├── class_analytics.py   # Cohort aggregates, heatmaps & milestones
│   │   ├── ingest.py            # CSV schema preview, validation & upsert
│   │   ├── model_info.py        # ML benchmarks, confusion matrix & feature importances
│   │   ├── recompute.py         # On-demand batch inference triggering
│   │   ├── reports.py           # Institutional CSV export & summary
│   │   └── students.py          # Student roster, risk drill-downs & interventions
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
│   │   ├── pipeline_service.py  # Data extraction, feature generation & DB synchronization
│   │   └── scheduler_service.py # Background periodic recomputation scheduler
│   └── main.py                  # Application entry point, lifespan, CORS & routing
├── tests/                       # Backend test fixtures
├── Dockerfile                   # Container build definition
├── requirements.txt             # Python dependencies
└── README.md                    # Backend documentation
```

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

Run pytest with `PYTHONPATH=.` set:
```powershell
$env:PYTHONPATH="."; python -m pytest tests/
```

All integration, pipeline, regression, and validation tests will execute.

---

## 🔒 Configuration & Database

By default, EduPulse AI runs with an embedded SQLite database (`classroom_analytics.db`) for lightweight development and local deployment.

To connect to a managed PostgreSQL cluster:
```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/classroom_analytics"
```
The application automatically reads the `DATABASE_URL` environment variable via `backend/app/core/config.py`.

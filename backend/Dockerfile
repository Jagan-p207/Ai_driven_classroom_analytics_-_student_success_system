# Multi-stage lightweight Python backend for Classroom Analytics
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2 and compiling
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend, ML modules, and data
COPY backend/ ./backend/
COPY ml/ ./ml/
COPY data/ ./data/

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/classroom_analytics

EXPOSE 8000

# Run FastAPI via Uvicorn
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

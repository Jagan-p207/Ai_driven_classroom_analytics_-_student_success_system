"""
EduPulse Quick Start Launcher.
Runs the FastAPI Backend and Vite Frontend concurrently for local testing.
"""

import subprocess
import sys
import time
import os

def main():
    print("=" * 65)
    print("AI-Driven Classroom Analytics and Student Success System (EduPulse)")
    print("=" * 65)
    print("1. Initializing synthetic data & feature models if needed...")
    
    # Check if raw data exists
    if not os.path.exists("data/raw/students.csv"):
        print("Running synthetic data generator...")
        subprocess.run([sys.executable, "ml/synthetic_data_generator.py"], check=True)

    # Check if models exist
    if not os.path.exists("ml/models/best_model.joblib"):
        print("Training baseline and primary ML models...")
        subprocess.run([sys.executable, "ml/train_models.py"], check=True)

    print("\n2. Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=os.getcwd()
    )

    time.sleep(2)

    print("\n3. Starting React Vite Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["cmd", "/c", "npm run dev"],
        cwd=os.path.join(os.getcwd(), "frontend")
    )

    print("\n" + "=" * 65)
    print("EduPulse Dashboard is running!")
    print("  - Frontend UI:  http://localhost:5173")
    print("  - Backend API:  http://127.0.0.1:8000/docs (Swagger UI)")
    print("  - Health Check: http://127.0.0.1:8000/health")
    print("Press Ctrl+C to terminate both servers.")
    print("=" * 65 + "\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("All services stopped.")

if __name__ == "__main__":
    main()

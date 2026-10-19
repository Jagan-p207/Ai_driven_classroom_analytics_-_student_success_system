"""
EduPulse Quick Start Launcher.
Runs the FastAPI Backend and Vite Frontend concurrently for local testing.
"""

import subprocess
import sys
import time
import os

def get_project_root():
    # If run from scripts/, root is parent directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(script_dir) == "scripts":
        return os.path.dirname(script_dir)
    return script_dir

def get_python_exe():
    return sys.executable

def main():
    root_dir = get_project_root()
    py_exe = get_python_exe()
    print("=" * 65)
    print("AI-Driven Classroom Analytics and Student Success System (EduPulse)")
    print("=" * 65)
    print("1. Initializing synthetic data & feature models if needed...")
    
    # Check if raw data exists
    raw_students = os.path.join(root_dir, "data", "raw", "students.csv")
    if not os.path.exists(raw_students):
        print("Running synthetic data generator...")
        subprocess.run([py_exe, os.path.join(root_dir, "ml", "synthetic_data_generator.py")], check=True, cwd=root_dir)

    # Check if models exist
    best_model = os.path.join(root_dir, "ml", "models", "best_model.joblib")
    if not os.path.exists(best_model):
        print("Training baseline and primary ML models...")
        subprocess.run([py_exe, os.path.join(root_dir, "ml", "train_models.py")], check=True, cwd=root_dir)

    print("\n2. Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [py_exe, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=root_dir
    )

    time.sleep(2)

    print("\n3. Starting React Vite Frontend on http://localhost:5173 ...")
    frontend_dir = os.path.join(root_dir, "frontend")
    frontend_proc = subprocess.Popen(
        ["cmd", "/c", "npm run dev"],
        cwd=frontend_dir
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

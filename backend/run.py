import os
import subprocess
import sys
import time


def load_local_env(env_path: str) -> None:
    """Load simple KEY=VALUE pairs from a local .env file if present."""
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")

            if key and key not in os.environ:
                os.environ[key] = value

def start_backend():
    print("--- Starting Dignova AI (Consolidated Mode) ---")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    load_local_env(os.path.join(script_dir, ".env"))

    # Path to the virtual environment python (Windows/Linux/macOS)
    venv_python = os.path.join(script_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = os.path.join(script_dir, "venv", "bin", "python")
    if not os.path.exists(venv_python):
        # Fallback to active interpreter if venv doesn't exist
        venv_python = sys.executable
    
    # Run uvicorn on port 8000. Frontend is served from /
    return subprocess.Popen(
        [venv_python, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=script_dir
    )

if __name__ == "__main__":
    backend_proc = None

    try:
        backend_proc = start_backend()
        time.sleep(1)
        if backend_proc.poll() is not None:
            print("Failed to start backend. Ensure dependencies are installed (e.g., uvicorn).")
            sys.exit(1)

        print("\n" + "="*40)
        print("DIGNOVA AI IS RUNNING".center(40))
        print("="*40)
        print(f"System URL:    http://localhost:8000")
        print("Architecture:   Single Port (Consolidated)")
        print("="*40)
        print("Press Ctrl+C to terminate the service.\n")

        # Keep the main process alive
        while True:
            if backend_proc.poll() is not None:
                print("Process terminated unexpectedly.")
                break
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n--- Shutting down Dignova AI ---")

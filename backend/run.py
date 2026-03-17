import os
import subprocess
import sys
import time
import signal
from dotenv import load_dotenv

# Load environment variables from root .env
load_dotenv()

def start_backend():
    print("--- Starting Dignova AI (Consolidated Mode) ---")
    # Path to the virtual environment python
    venv_python = os.path.join(os.getcwd(), "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        # Fallback to system python if venv doesn't exist
        venv_python = sys.executable
    
    # Run uvicorn on port 8000. Frontend is served from /
    return subprocess.Popen(
        [venv_python, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=os.getcwd()
    )

if __name__ == "__main__":
    backend_proc = None

    try:
        backend_proc = start_backend()

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

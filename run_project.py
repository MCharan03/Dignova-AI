import os
import shutil
import signal
import subprocess
import sys
import time


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")


def _prefixed_stream(pipe, prefix):
    for line in iter(pipe.readline, ""):
        if not line:
            break
        print(f"[{prefix}] {line.rstrip()}")


def _start_backend():
    cmd = [sys.executable, "run.py"]
    return subprocess.Popen(
        cmd,
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )


def _start_frontend():
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    if shutil.which(npm_cmd) is None:
        raise RuntimeError("npm is not installed or not in PATH.")

    return subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )


def _terminate(proc, name):
    if not proc or proc.poll() is not None:
        return
    print(f"\nStopping {name}...")
    proc.terminate()
    try:
        proc.wait(timeout=8)
    except subprocess.TimeoutExpired:
        proc.kill()


def main():
    if not os.path.isdir(BACKEND_DIR) or not os.path.isdir(FRONTEND_DIR):
        print("backend/ or frontend/ folder not found. Run this from project root.")
        sys.exit(1)

    backend_proc = None
    frontend_proc = None

    try:
        print("Starting backend and frontend...")
        backend_proc = _start_backend()
        time.sleep(1)
        if backend_proc.poll() is not None:
            print("Backend failed to start. Check backend logs above.")
            sys.exit(1)

        frontend_proc = _start_frontend()
        time.sleep(1)
        if frontend_proc.poll() is not None:
            print("Frontend failed to start. Check frontend logs above.")
            _terminate(backend_proc, "backend")
            sys.exit(1)

        print("\nDignova is running:")
        print("- Backend:  http://localhost:8000")
        print("- Frontend: http://localhost:3000")
        print("Press Ctrl+C to stop both.\n")

        import threading

        threading.Thread(
            target=_prefixed_stream, args=(backend_proc.stdout, "backend"), daemon=True
        ).start()
        threading.Thread(
            target=_prefixed_stream, args=(frontend_proc.stdout, "frontend"), daemon=True
        ).start()

        while True:
            if backend_proc.poll() is not None:
                print("\nBackend process exited.")
                break
            if frontend_proc.poll() is not None:
                print("\nFrontend process exited.")
                break
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nReceived Ctrl+C. Shutting down...")
    finally:
        _terminate(frontend_proc, "frontend")
        _terminate(backend_proc, "backend")
        print("Shutdown complete.")


if __name__ == "__main__":
    if os.name == "nt":
        signal.signal(signal.SIGINT, signal.default_int_handler)
    main()

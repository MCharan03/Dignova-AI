import os
import shutil
import subprocess
import sys
import threading
import time


def read_stream(stream, prefix, color):
    reset = "\033[0m"
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(errors="replace")
        except Exception:
            pass

    while True:
        line = stream.readline()
        if not line:
            break
        safe_line = line.rstrip().encode(
            sys.stdout.encoding or "utf-8", errors="replace"
        ).decode(sys.stdout.encoding or "utf-8", errors="replace")
        print(f"{color}[{prefix}]{reset} {safe_line}", flush=True)


def terminate_process(proc):
    if not proc:
        return
    if proc.poll() is not None:
        return

    if os.name == "nt":
        subprocess.call(
            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        proc.terminate()


def run_all():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    print("\033[96m=== Starting Dignova Pipeline ===\033[0m")

    kwargs = {}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"

    backend_proc = None
    frontend_proc = None

    try:
        print("\033[94m[SYSTEM] Starting Backend...\033[0m")
        backend_proc = subprocess.Popen(
            [sys.executable, "-u", "run.py"],
            cwd="backend",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            env=env,
            **kwargs,
        )
        threading.Thread(
            target=read_stream,
            args=(backend_proc.stdout, "BACKEND", "\033[94m"),
            daemon=True,
        ).start()

        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        if shutil.which(npm_cmd) is None:
            raise RuntimeError("npm not found in PATH.")

        print("\033[92m[SYSTEM] Starting Frontend...\033[0m")
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd="frontend",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            env=env,
            **kwargs,
        )
        threading.Thread(
            target=read_stream,
            args=(frontend_proc.stdout, "FRONTEND", "\033[92m"),
            daemon=True,
        ).start()

        print("\n\033[96m=== Dignova Running ===\033[0m")
        print("FRONTEND: http://localhost:3000")
        print("BACKEND : http://localhost:8000")
        print("Press Ctrl+C to stop both.\n")

        while True:
            if backend_proc.poll() is not None:
                print("\n\033[91m[SYSTEM] Backend exited.\033[0m")
                break
            if frontend_proc.poll() is not None:
                print("\n\033[91m[SYSTEM] Frontend exited.\033[0m")
                break
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\033[91m[SYSTEM] Shutting down...\033[0m")
    finally:
        terminate_process(frontend_proc)
        terminate_process(backend_proc)
        print("\033[96m=== Dignova Pipeline Stopped ===\033[0m")
        sys.exit(0)


if __name__ == "__main__":
    run_all()

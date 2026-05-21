import os
import shutil
import subprocess
import sys
import threading
import time
import re
from queue import Queue, Empty


def read_stream(stream, prefix, color, url_queue=None):
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
        
        # Decode and handle potential errors
        try:
            safe_line = line.rstrip().encode(
                sys.stdout.encoding or "utf-8", errors="replace"
            ).decode(sys.stdout.encoding or "utf-8", errors="replace")
        except:
            safe_line = line.rstrip()

        # Print to console
        print(f"{color}[{prefix}]{reset} {safe_line}", flush=True)

        # Look for tunnel URL if requested
        if url_queue and "your url is:" in safe_line.lower():
            match = re.search(r"https://[a-zA-Z0-9-]+\.loca\.lt", safe_line)
            if match:
                url_queue.put(match.group(0))


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

    print("\033[96m=== Dignova Sentient Master Orchestrator ===\033[0m")
    print("\033[90mInitiating zero-touch startup sequence...\033[0m\n")

    kwargs = {}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"

    # Path to the virtual environment python (Windows/Linux/macOS)
    venv_python = os.path.join("backend", "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = os.path.join("backend", "venv", "bin", "python")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    procs = []
    
    try:
        # 1. Start n8n
        print("\033[95m[SYSTEM] Booting n8n Engine...\033[0m")
        n8n_proc = subprocess.Popen(
            ["npx.cmd" if os.name == "nt" else "npx", "n8n"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            **kwargs
        )
        procs.append((n8n_proc, "N8N"))
        threading.Thread(target=read_stream, args=(n8n_proc.stdout, "N8N", "\033[95m"), daemon=True).start()

        # 2. Start Tunnels
        print("\033[93m[SYSTEM] Opening Sentient Tunnels...\033[0m")
        n8n_url_q = Queue()
        backend_url_q = Queue()

        n8n_lt = subprocess.Popen(
            ["npx.cmd" if os.name == "nt" else "npx", "localtunnel", "--port", "5678"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            **kwargs
        )
        procs.append((n8n_lt, "LT-N8N"))
        threading.Thread(target=read_stream, args=(n8n_lt.stdout, "LT-N8N", "\033[93m", n8n_url_q), daemon=True).start()

        backend_lt = subprocess.Popen(
            ["npx.cmd" if os.name == "nt" else "npx", "localtunnel", "--port", "8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            **kwargs
        )
        procs.append((backend_lt, "LT-BACK"))
        threading.Thread(target=read_stream, args=(backend_lt.stdout, "LT-BACK", "\033[93m", backend_url_q), daemon=True).start()

        # Wait for URLs
        print("\033[90mWaiting for tunnel handshake...\033[0m")
        n8n_url = None
        backend_url = None
        
        for _ in range(30): # 30 second timeout
            try:
                if not n8n_url: n8n_url = n8n_url_q.get_nowait()
                if not backend_url: backend_url = backend_url_q.get_nowait()
                if n8n_url and backend_url: break
            except Empty:
                time.sleep(1)

        if not n8n_url or not backend_url:
            print("\033[91m[ERROR] Tunnel handshake timed out. Check localtunnel status.\033[0m")
        else:
            print(f"\033[92m[SYSTEM] Handshake Success!\033[0m")
            print(f"         n8n Tunnel: {n8n_url}")
            print(f"         API Tunnel: {backend_url}")

            # 3. Patch System
            print("\033[94m[SYSTEM] Syncing Nervous System...\033[0m")
            subprocess.run([venv_python, "backend/sentient_patcher.py", n8n_url, backend_url])

        # 4. Start Backend
        print("\033[94m[SYSTEM] Starting Backend Core...\033[0m")
        backend_proc = subprocess.Popen(
            [venv_python, "-u", "run.py"],
            cwd="backend",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            env=env,
            **kwargs,
        )
        procs.append((backend_proc, "BACKEND"))
        threading.Thread(target=read_stream, args=(backend_proc.stdout, "BACKEND", "\033[94m"), daemon=True).start()

        # 5. Start Frontend
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        print("\033[92m[SYSTEM] Starting Frontend Layer...\033[0m")
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
        procs.append((frontend_proc, "FRONTEND"))
        threading.Thread(target=read_stream, args=(frontend_proc.stdout, "FRONTEND", "\033[92m"), daemon=True).start()

        print("\n\033[96m" + "="*40)
        print("DIGNOVA SENTIENT OS IS LIVE".center(40))
        print("="*40 + "\033[0m")
        print(f"LOCAL FRONTEND: http://localhost:3000")
        print(f"LOCAL BACKEND : http://localhost:8000")
        print(f"LOCAL N8N     : http://localhost:5678")
        if n8n_url: print(f"PUBLIC BOT    : {n8n_url}")
        print("\033[96m" + "="*40 + "\033[0m")
        print("Press Ctrl+C to stop all components.\n")

        while True:
            for proc, name in procs:
                if proc.poll() is not None:
                    print(f"\n\033[91m[SYSTEM] {name} exited unexpectedly.\033[0m")
                    return
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\033[91m[SYSTEM] Manual shutdown initiated...\033[0m")
    finally:
        for proc, name in reversed(procs):
            print(f"\033[90mTerminating {name}...\033[0m")
            terminate_process(proc)
        print("\033[96m=== All Components Offline ===\033[0m")
        sys.exit(0)


if __name__ == "__main__":
    run_all()

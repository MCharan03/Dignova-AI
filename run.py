import subprocess
import time
import sys
import os

def run_all():
    print("🧠 --- DIGNONA AI: MASTER INITIALIZATION ---")
    
    # 1. Start Backend
    print("📡 Starting Backend Brain (Port 8000)...")
    backend = subprocess.Popen(
        [sys.executable, "backend/run.py"],
        stdout=None,
        stderr=None
    )

    # 2. Start Localtunnel for n8n
    print("🌐 Starting n8n Neural Tunnel (jolly-puma-33)...")
    tunnel = subprocess.Popen(
        "npx localtunnel --port 5678 --subdomain jolly-puma-33",
        shell=True
    )

    # 3. Start Frontend
    print("🖥️ Starting Frontend Interface (Port 3000)...")
    frontend = subprocess.Popen(
        "npm run dev",
        cwd="frontend",
        shell=True
    )

    print("\n✅ ALL SYSTEMS INITIALIZED")
    print("------------------------------------------")
    print("• FRONTEND: http://localhost:3000")
    print("• BACKEND:  http://localhost:8000")
    print("• TUNNEL:   https://jolly-puma-33.loca.lt")
    print("------------------------------------------")
    print("Press Ctrl+C to terminate all systems.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 SHUTTING DOWN SYSTEMS...")
        backend.terminate()
        frontend.terminate()
        tunnel.terminate()
        print("Done.")

if __name__ == "__main__":
    run_all()

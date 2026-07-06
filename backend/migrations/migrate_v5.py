import sqlite3
import os

db_path = os.path.join("backend", "app", "app.db")
if not os.path.exists(db_path):
    db_path = os.path.join("app", "app.db")

print(f"[*] Migrating database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create telemetry_sessions table
try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        wpm REAL DEFAULT 0.0,
        avg_hold_time REAL DEFAULT 0.0,
        avg_flight_time REAL DEFAULT 0.0,
        backspace_ratio REAL DEFAULT 0.0,
        stress_score REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    print("[+] Created table telemetry_sessions")
except Exception as e:
    print(f"[x] Error creating table telemetry_sessions: {e}")

conn.commit()
conn.close()
print("[*] Migration complete.")

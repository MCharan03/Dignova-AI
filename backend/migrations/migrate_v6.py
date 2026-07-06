import sqlite3
import os

db_path = os.path.join("backend", "app", "app.db")
if not os.path.exists(db_path):
    db_path = os.path.join("app", "app.db")

print(f"[*] Migrating database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create agency_tasks table
try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agency_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR NOT NULL,
        description VARCHAR,
        status VARCHAR DEFAULT 'pending',
        result_summary TEXT,
        progress INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
    )
    """)
    print("[+] Created table agency_tasks")
except Exception as e:
    print(f"[x] Error creating table agency_tasks: {e}")

conn.commit()
conn.close()
print("[*] Migration complete.")

import sqlite3
import os

db_path = os.path.join("backend", "app", "app.db")
if not os.path.exists(db_path):
    db_path = os.path.join("app", "app.db")

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("ALTER TABLE calls ADD COLUMN severity VARCHAR DEFAULT 'UNKNOWN'")
        conn.commit()
        print("[+] Successfully added severity column.")
    except Exception as e:
        print("[i] Column severity already exists or error:", e)
    finally:
        conn.close()

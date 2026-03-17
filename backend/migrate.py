import sqlite3
import os

db_path = "d:/Gemini/4th sem/Dignova-AI/app/app.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("ALTER TABLE calls ADD COLUMN severity VARCHAR DEFAULT 'UNKNOWN'")
        conn.commit()
        print("Successfully added severity column.")
    except Exception as e:
        print("Error or already exists:", e)
    finally:
        conn.close()

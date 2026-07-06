import sqlite3
import os
from datetime import datetime

db_path = os.path.join("app", "app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Find and terminate active sessions
cursor.execute("SELECT call_id FROM calls WHERE state IN ('active', 'evaluation')")
active_calls = cursor.fetchall()

if active_calls:
    for (call_id,) in active_calls:
        cursor.execute(
            "UPDATE calls SET state = 'completed', end_time = ? WHERE call_id = ?", 
            (datetime.utcnow().isoformat(), call_id)
        )
        print(f"Terminated Session #{call_id}")
    conn.commit()
else:
    print("No active sessions found in the database.")

conn.close()

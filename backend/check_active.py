import sqlite3
import os

db_path = os.path.join("app", "app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = 'mallelacharankumar@gmail.com'
cursor.execute("""
    SELECT calls.call_id, calls.state 
    FROM calls 
    JOIN users ON calls.user_id = users.id 
    WHERE users.email = ? AND calls.state IN ('active', 'evaluation')
""", (email,))

active_calls = cursor.fetchall()
if active_calls:
    print(f"Found {len(active_calls)} active calls for {email}:")
    for call_id, state in active_calls:
        print(f"  ID: {call_id}, State: {state}")
else:
    print(f"No active calls found for {email}.")

conn.close()

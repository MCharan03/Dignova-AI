import sqlite3
import os

db_path = os.path.join("backend", "app", "app.db")
if not os.path.exists(db_path):
    db_path = os.path.join("app", "app.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = "mallelacharankumar@gmail.com"
cursor.execute("UPDATE users SET role = 'doctor', is_online = 1 WHERE email = ?", (email,))
conn.commit()

if cursor.rowcount > 0:
    print(f"✅ Successfully promoted {email} to Doctor and set to Online.")
else:
    print(f"❌ User {email} not found.")

conn.close()

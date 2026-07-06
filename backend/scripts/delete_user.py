import sqlite3
import os

db_path = os.path.join("backend", "app", "app.db")
if not os.path.exists(db_path):
    db_path = os.path.join("app", "app.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = "mcharan.aids24@cmrit.ac.in"
cursor.execute("DELETE FROM users WHERE email = ?", (email,))
conn.commit()

if cursor.rowcount > 0:
    print(f"✅ Successfully deleted user: {email}")
else:
    print(f"ℹ️ No user found with email: {email}")

conn.close()

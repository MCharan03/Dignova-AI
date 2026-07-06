import sqlite3
import os

db_path = os.path.join("backend", "app", "app.db")
if not os.path.exists(db_path):
    db_path = os.path.join("app", "app.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = "mallelacharankumar@gmail.com"
cursor.execute("SELECT name, role, is_online, telegram_chat_id FROM users WHERE email = ?", (email,))
user = cursor.fetchone()

if user:
    print(f"User Found: {user}")
else:
    print(f"❌ User {email} not found.")

conn.close()

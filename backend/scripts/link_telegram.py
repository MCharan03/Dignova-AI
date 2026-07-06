import sqlite3
import os

db_path = os.path.join("app", "app.db")
if not os.path.exists(db_path):
    # Try root relative path if backend/ is not the CWD
    db_path = os.path.join("backend", "app", "app.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

telegram_id = "6019617155"
email = "mallelacharankumar@gmail.com"

cursor.execute("UPDATE users SET telegram_chat_id = ? WHERE email = ?", (telegram_id, email))
conn.commit()

if cursor.rowcount > 0:
    print(f"✅ Successfully linked Telegram ID {telegram_id} to {email}")
else:
    print(f"❌ User {email} not found.")

conn.close()

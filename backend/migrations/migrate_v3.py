import sqlite3
import os

db_path = os.path.join("backend", "app", "app.db")
if not os.path.exists(db_path):
    db_path = os.path.join("app", "app.db")

print(f"[*] Migrating database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE calls ADD COLUMN is_recovered BOOLEAN")
    print("[+] Added column: is_recovered to calls table")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("[i] Column already exists: is_recovered")
    else:
        print(f"[x] Error: {e}")

conn.commit()
conn.close()
print("[*] Migration complete.")

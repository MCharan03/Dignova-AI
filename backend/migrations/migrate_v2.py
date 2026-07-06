import sqlite3
import os

db_path = os.path.join("backend", "app", "app.db")
if not os.path.exists(db_path):
    db_path = os.path.join("app", "app.db")

print(f"[*] Migrating database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# List of columns to add
columns_to_add = [
    ("telegram_username", "VARCHAR"),
    ("last_checkup_date", "DATETIME"),
    ("last_blood_test_date", "DATETIME"),
    ("address", "VARCHAR")
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
        print(f"[+] Added column: {col_name}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"[i] Column already exists: {col_name}")
        else:
            print(f"[x] Error adding {col_name}: {e}")

conn.commit()
conn.close()
print("[*] Migration complete.")

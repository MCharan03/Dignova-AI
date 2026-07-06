import sqlite3
import os

db_path = os.path.join("backend", "app", "app.db")
if not os.path.exists(db_path):
    db_path = os.path.join("app", "app.db")

print(f"[*] Migrating database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get existing columns in calls table
cursor.execute("PRAGMA table_info(calls)")
existing_cols = [row[1] for row in cursor.fetchall()]

columns_to_add = [
    ("twilio_call_sid", "VARCHAR"),
    ("network_acuity", "VARCHAR DEFAULT 'high'"),
    ("language_mode", "VARCHAR DEFAULT 'auto'")
]

for col_name, col_def in columns_to_add:
    if col_name not in existing_cols:
        try:
            cursor.execute(f"ALTER TABLE calls ADD COLUMN {col_name} {col_def}")
            print(f"[+] Added column: {col_name}")
        except sqlite3.OperationalError as e:
            print(f"[x] Error adding {col_name}: {e}")
    else:
        print(f"[i] Column already exists: {col_name}")

conn.commit()
conn.close()
print("[*] Migration complete.")

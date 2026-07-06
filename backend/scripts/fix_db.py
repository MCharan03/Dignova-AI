import sqlite3
import os

db_path = os.path.join("app", "app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Update user role to admin
email = 'mallelacharankumar@gmail.com'
cursor.execute("UPDATE users SET role = 'admin' WHERE email = ?", (email,))
if cursor.rowcount > 0:
    print(f"User {email} promoted to admin.")
else:
    print(f"User {email} not found.")

# 2. Add missing settings
default_settings = {
    "session_timeout": "1h",
    "encryption_algorithm": "aes-256",
    "audit_logging": "true",
    "dynamic_scaling": "false",
    "allocation_strategy": "latency",
    "primary_region": "Global",
    "holographic_effects": "true",
    "animation_speed": "standard",
    "font_override": "",
    "webhook_retry": "3",
    "sandbox_mode": "true",
    "api_verbosity": "standard"
}

for key, value in default_settings.items():
    cursor.execute("SELECT 1 FROM system_settings WHERE key = ?", (key,))
    if not cursor.fetchone():
        cursor.execute("INSERT INTO system_settings (key, value) VALUES (?, ?)", (key, value))
        print(f"Added setting: {key} = {value}")

conn.commit()
conn.close()

import asyncio
import os
import sys
from passlib.hash import pbkdf2_sha256

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

import sqlite3

def create_admin():
    print("🚀 Bootstrapping Admin Account...")
    db_path = os.path.join("backend", "app", "app.db")
    if not os.path.exists(db_path):
        db_path = os.path.join("app", "app.db")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    email = "cherrycostech@gmail.com"
    password = "admin123"
    hashed_password = pbkdf2_sha256.hash(password)
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if user:
        print(f"ℹ️ User {email} already exists. Updating to Admin.")
        cursor.execute("UPDATE users SET role = 'admin', hashed_password = ? WHERE email = ?", (hashed_password, email))
    else:
        print(f"🆕 Creating fresh Admin user: {email}")
        cursor.execute("""
            INSERT INTO users (name, email, hashed_password, role, is_verified, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        """, ("Cherry Admin", email, hashed_password, "admin", 1))

    conn.commit()
    conn.close()
    print(f"✅ Admin Bootstrap Complete.\nEmail: {email}\nPassword: {password}")

if __name__ == "__main__":
    create_admin()

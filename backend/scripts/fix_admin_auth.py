import os
import sys
import asyncio
import sqlite3

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Import from the app itself to ensure exact hashing match
from app.utils.auth import get_password_hash
from app.models import UserRole

def fix_admin():
    print("🛠️ Synchronizing Admin Account...")
    db_path = os.path.join("backend", "app", "app.db")
    if not os.path.exists(db_path):
        db_path = os.path.join("app", "app.db")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    email = "cherrycostech@gmail.com"
    password = "admin123"
    
    # Use the official backend hasher
    hashed_password = get_password_hash(password)
    
    # Force verification and role
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if user:
        print(f"🔄 Updating existing user {email}...")
        cursor.execute("""
            UPDATE users 
            SET role = ?, hashed_password = ?, is_verified = 1, verified_at = datetime('now')
            WHERE email = ?
        """, ("super_admin", hashed_password, email))
    else:
        print(f"🆕 Creating fresh Admin: {email}...")
        cursor.execute("""
            INSERT INTO users (name, email, hashed_password, role, is_verified, verified_at, created_at)
            VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        """, ("Master Admin", email, hashed_password, "super_admin"))

    conn.commit()
    conn.close()
    print(f"✅ Admin Account Aligned.\nEmail: {email}\nPassword: {password}\nRole: super_admin")

if __name__ == "__main__":
    fix_admin()

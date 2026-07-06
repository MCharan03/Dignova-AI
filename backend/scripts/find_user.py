import sqlite3
import os

db_path = os.path.join("app", "app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = 'mallelacharankumar@gmail.com'
cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
user = cursor.fetchone()

if user:
    # Get column names
    column_names = [description[0] for description in cursor.description]
    user_data = dict(zip(column_names, user))
    print("User found:")
    for key, value in user_data.items():
        if 'password' not in key:
            print(f"  {key}: {value}")
else:
    print(f"No user found with email: {email}")

conn.close()

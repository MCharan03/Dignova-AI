import sqlite3
conn = sqlite3.connect("app/app.db")
c = conn.cursor()
c.execute("PRAGMA table_info(users)")
cols = [r[1] for r in c.fetchall()]
print("Users columns:", cols)
c.execute("PRAGMA table_info(calls)")
cols2 = [r[1] for r in c.fetchall()]
print("Calls columns:", cols2)
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("All tables:", tables)
conn.close()

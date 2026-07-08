import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT 1;")
    print("Connection successful!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")

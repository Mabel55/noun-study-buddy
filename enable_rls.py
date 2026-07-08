import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
    tables = cur.fetchall()
    
    for table in tables:
        table_name = table[0]
        cur.execute(f'ALTER TABLE "{table_name}" ENABLE ROW LEVEL SECURITY;')
        print(f'Enabled RLS on {table_name}')
        
    print("Done enabling RLS on all public tables.")
    conn.close()
except Exception as e:
    print(f"Error: {e}")

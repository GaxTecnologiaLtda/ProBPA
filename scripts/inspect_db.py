
import psycopg2
import os
from dotenv import load_dotenv

# Load .env from scripts/pacote_transferencia_windows/.env (if exists) or manual
# Actually, I'll essentially hardcode the logic to read .env or params if provided, 
# but for now I'll assume the user is running this in the same env where .env exists.
# I will use the values from the previous pec_connector context if I can, OR just ask the script to use .env

DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "esus"
DB_USER = "postgres" 
DB_PASS = "postgres" # Default, or read from env

def inspect():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor()
        
        # 1. List Tables matching 'odonto'
        print("\n--- Tables Matching 'odonto' ---")
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%odonto%'
        """)
        for row in cur.fetchall():
            print(row[0])

        # 2. Check tb_fat_proced_atend_proced for dentist records
        print("\n--- Dentists in tb_fat_proced_atend_proced ---")
        # Dentist CBOs usually start with 2232
        cur.execute("""
            SELECT count(*)
            FROM tb_fat_proced_atend_proced pap
            JOIN tb_dim_cbo cbo ON pap.co_dim_cbo = cbo.co_seq_dim_cbo
            WHERE cbo.nu_cbo LIKE '2232%'
        """)
        print(f"Count: {cur.fetchone()[0]}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()

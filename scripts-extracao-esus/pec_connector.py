import os
import sys
import json
import psycopg2
import requests
import argparse
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Load environment variables
load_dotenv()

# --- CONFIGURATION ---
MUNICIPALITY_ID = os.getenv('MUNICIPALITY_ID')
API_KEY = os.getenv('API_KEY')
API_URL = os.getenv('API_URL', 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/ingestPecData') 
# NOTE: The installer will need to set the correct Project ID in the URL or we harder code it if known.
# For now I will assume the user updates .env or I default to likely project ID if known.
# Based on deployment logs: probpa-025 or probpa-admin? Deployment said: 
# "Project Console: https://console.firebase.google.com/project/probpa-025/overview"
# So project ID is 'probpa-025'.

DEFAULT_API_URL = 'https://southamerica-east1-probpa-025.cloudfunctions.net/ingestPecData'

# Local Postgres Config (Should also be in .env or args, but for now we keep the logic 
# where IT SAVES the DB config in .env? 
# WAIT. The previous logic fetched DB config FROM FIRESTORE. 
# Now we don't have Firestore access.
# The DB config MUST be local.
# The user (Installer) must input the Postgres credentials to be stored in the .env OR 
# the script asks for them.
# Storing DB credentials in .env is standard for this type of agent.

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'esus')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASS', '')


# Helper to get columns for adaptive schema
def get_table_columns(cur, table_name):
    try:
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = %s
        """, (table_name,))
        return {row[0] for row in cur.fetchall()}
    except Exception as e:
        print(f"      [WARNING] Could not verify schema for {table_name}: {e}")
        return set()

def extract_and_send(start_date: datetime):
    if not MUNICIPALITY_ID or not API_KEY:
        print("CRITICAL: MUNICIPALITY_ID and API_KEY are required in .env")
        return

    actual_api_url = os.getenv('API_URL', DEFAULT_API_URL)

    print(f"Starting extraction from {start_date}...")
    print(f"Target API: {actual_api_url}")

    try:
        # 1. Connect to Postgres
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor()

        # --- DIAGNOSTICS (DEBUGGING) ---
        print("\n   [DIAGNOSTIC] Checking Database Health...")
        
        # Check 1: Latest Data Available
        cur.execute("""
            SELECT MAX(t.dt_registro) 
            FROM tb_dim_tempo t
            JOIN tb_fat_atendimento_individual fai ON fai.co_dim_tempo = t.co_seq_dim_tempo
        """)
        latest_date = cur.fetchone()[0]
        print(f"      -> Last recorded Consultation date: {latest_date}")

        # Check 2: Row Counts
        cur.execute("SELECT count(*) FROM tb_fat_atendimento_individual")
        count_fai = cur.fetchone()[0]
        print(f"      -> Total Consultations in DB: {count_fai}")

        if latest_date:
            print(f"      -> NOTE: Your filter starts from {start_date.date()}.")
            if latest_date < start_date.date():
                print("      [WARNING] The database data is OLDER than your filter.")
                print("                Try running with --days 100 to catch older data.")
        
        print("   [DIAGNOSTIC] Complete.\n")

        # =================================================================================
        # QUERY 1: PROCEDIMENTOS REALIZADOS (tb_fat_proced_atend_proced)
        # =================================================================================
        print("   [1/6] Querying Procedures (tb_fat_proced_atend_proced)...")
        sql_proc = """
            SELECT 
                pap.nu_uuid_ficha as id,
                prof.no_profissional as profissional_nome,
                prof.nu_cns as profissional_cns,
                cbo.nu_cbo as cbo,
                cid.no_cidadao as paciente_nome,
                cid.nu_cns as paciente_cns,
                sex.ds_sexo as sexo,
                cid.nu_cpf_cidadao as paciente_cpf, 
                pap.dt_nascimento as data_nascimento,
                unid.nu_cnes as cnes_unidade,
                proc.co_proced as proc_codigo,
                proc.ds_proced as proc_nome,
                tempo.dt_registro as data_producao,
                'PROCEDURE' as type,
                NULL as cid_codigo,
                NULL as ciap_codigo
            FROM tb_fat_proced_atend_proced pap
            LEFT JOIN tb_dim_profissional prof ON pap.co_dim_profissional = prof.co_seq_dim_profissional
            LEFT JOIN tb_dim_cbo cbo ON pap.co_dim_cbo = cbo.co_seq_dim_cbo
            LEFT JOIN tb_fat_cidadao_pec cid ON pap.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
            LEFT JOIN tb_dim_unidade_saude unid ON pap.co_dim_unidade_saude = unid.co_seq_dim_unidade_saude
            LEFT JOIN tb_dim_procedimento proc ON pap.co_dim_procedimento = proc.co_seq_dim_procedimento
            LEFT JOIN tb_dim_tempo tempo ON pap.co_dim_tempo = tempo.co_seq_dim_tempo
            LEFT JOIN tb_dim_sexo sex ON pap.co_dim_sexo = sex.co_seq_dim_sexo
            WHERE tempo.dt_registro >= %s
        """
        cur.execute(sql_proc, (start_date.date(),))
        rows_proc = cur.fetchall()
        print(f"      -> Found {len(rows_proc)} procedures.")

        # =================================================================================
        # QUERY 2: ATENDIMENTOS INDIVIDUAIS + DIAGNÓSTICOS (tb_fat_atd_ind_problemas)
        # =================================================================================
        print("   [2/6] Querying Consultations & Diagnoses (tb_fat_atd_ind_problemas)...")
        # EXPLICAÇÃO: Em vez de buscar colunas no header, fazemos JOIN na tabela de problemas.
        # Isso garante que se o paciente tem CID ou CIAP, vamos pegar.
        # Se o atendimento NÃO tem problema registrado, ele não vai aparecer aqui? 
        # CUIDADO: Precisamos de LEFT JOIN partindo do atendimento se quisermos contabilizar "Consultas sem doença".
        # MAS, o usuário quer "Join Visual e Preciso".
        # Vamos fazer UNION:
        # 1. Atendimentos com Problemas (JOIN tb_fat_atd_ind_problemas)
        # 2. Atendimentos SEM Problemas (Para não perder produção de quem só foi "se pesar" ou "renovar receita" sem CID)

        # Estratégia Híbrida: Pegar a tabela PRINCIPAL e fazer LEFT JOIN com problemas.
        sql_consult = """
            SELECT 
                fai.nu_uuid_ficha as id,
                prof.no_profissional as profissional_nome,
                prof.nu_cns as profissional_cns,
                cbo.nu_cbo as cbo,
                cid.no_cidadao as paciente_nome,
                cid.nu_cns as paciente_cns,
                sex.ds_sexo as sexo,
                cid.nu_cpf_cidadao as paciente_cpf, 
                fai.dt_nascimento as data_nascimento,
                unid.nu_cnes as cnes_unidade,
                'CONSULTA' as proc_codigo,
                'ATENDIMENTO INDIVIDUAL' as proc_nome,
                tempo.dt_registro as data_producao,
                'CONSULTATION' as type,
                dim_cid.nu_cid as cid_codigo,
                dim_ciap.nu_ciap as ciap_codigo
            FROM tb_fat_atendimento_individual fai
            -- Joins Básicos
            LEFT JOIN tb_dim_profissional prof ON fai.co_dim_profissional_1 = prof.co_seq_dim_profissional
            LEFT JOIN tb_dim_cbo cbo ON fai.co_dim_cbo_1 = cbo.co_seq_dim_cbo
            LEFT JOIN tb_fat_cidadao_pec cid ON fai.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
            LEFT JOIN tb_dim_unidade_saude unid ON fai.co_dim_unidade_saude_1 = unid.co_seq_dim_unidade_saude
            LEFT JOIN tb_dim_tempo tempo ON fai.co_dim_tempo = tempo.co_seq_dim_tempo
            LEFT JOIN tb_dim_sexo sex ON fai.co_dim_sexo = sex.co_seq_dim_sexo
            
            -- DEEP MAP JOIN (Diagnósticos)
            -- A tabela tb_fat_atd_ind_problemas conecta N:1 com tb_fat_atendimento_individual
            LEFT JOIN tb_fat_atd_ind_problemas prob ON fai.co_seq_fat_atd_ind = prob.co_fat_atd_ind
            LEFT JOIN tb_dim_cid dim_cid ON prob.co_dim_cid = dim_cid.co_seq_dim_cid
            LEFT JOIN tb_dim_ciap dim_ciap ON prob.co_dim_ciap = dim_ciap.co_seq_dim_ciap
            
            WHERE tempo.dt_registro >= %s
        """
        cur.execute(sql_consult, (start_date.date(),))
        rows_consult = cur.fetchall()
        print(f"      -> Found {len(rows_consult)} consultation records (including diagnoses).")

        # =================================================================================
        # QUERY 3: ODONTOLOGIA (tb_fat_atendimento_odonto)
        # =================================================================================
        print("   [3/6] Querying Odontology (tb_fat_atendimento_odonto)...")
        sql_odonto = """
            SELECT 
                fao.nu_uuid_ficha as id,
                prof.no_profissional as profissional_nome,
                prof.nu_cns as profissional_cns,
                cbo.nu_cbo as cbo,
                cid.no_cidadao as paciente_nome,
                cid.nu_cns as paciente_cns,
                sex.ds_sexo as sexo,
                cid.nu_cpf_cidadao as paciente_cpf, 
                fao.dt_nascimento as data_nascimento,
                unid.nu_cnes as cnes_unidade,
                'ODONTO' as proc_codigo,
                'ATENDIMENTO ODONTOLOGICO' as proc_nome,
                tempo.dt_registro as data_producao,
                'ODONTOLOGY' as type,
                NULL as cid_codigo, 
                NULL as ciap_codigo 
            FROM tb_fat_atendimento_odonto fao
            LEFT JOIN tb_dim_profissional prof ON fao.co_dim_profissional_1 = prof.co_seq_dim_profissional
            LEFT JOIN tb_dim_cbo cbo ON fao.co_dim_cbo_1 = cbo.co_seq_dim_cbo
            LEFT JOIN tb_fat_cidadao_pec cid ON fao.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
            LEFT JOIN tb_dim_unidade_saude unid ON fao.co_dim_unidade_saude_1 = unid.co_seq_dim_unidade_saude
            LEFT JOIN tb_dim_tempo tempo ON fao.co_dim_tempo = tempo.co_seq_dim_tempo
            LEFT JOIN tb_dim_sexo sex ON fao.co_dim_sexo = sex.co_seq_dim_sexo
            WHERE tempo.dt_registro >= %s
        """
        cur.execute(sql_odonto, (start_date.date(),))
        rows_odonto = cur.fetchall()
        print(f"      -> Found {len(rows_odonto)} dental records.")

        # =================================================================================
        # QUERY 4: VACINAÇÃO (tb_fat_vacinacao)
        # =================================================================================
        print("   [4/6] Querying Vaccination (tb_fat_vacinacao)...")
        sql_vac = """
            SELECT 
                vac.nu_uuid_ficha as id,
                prof.no_profissional as profissional_nome,
                prof.nu_cns as profissional_cns,
                cbo.nu_cbo as cbo,
                cid.no_cidadao as paciente_nome,
                cid.nu_cns as paciente_cns,
                sex.ds_sexo as sexo,
                cid.nu_cpf_cidadao as paciente_cpf, 
                vac.dt_nascimento as data_nascimento,
                unid.nu_cnes as cnes_unidade,
                'VACINA' as proc_codigo,
                'VACINACAO' as proc_nome,
                tempo.dt_registro as data_producao,
                'VACCINATION' as type,
                NULL as cid_codigo,
                NULL as ciap_codigo
            FROM tb_fat_vacinacao vac
            LEFT JOIN tb_dim_profissional prof ON vac.co_dim_profissional = prof.co_seq_dim_profissional
            LEFT JOIN tb_dim_cbo cbo ON vac.co_dim_cbo = cbo.co_seq_dim_cbo
            LEFT JOIN tb_fat_cidadao_pec cid ON vac.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
            LEFT JOIN tb_dim_unidade_saude unid ON vac.co_dim_unidade_saude = unid.co_seq_dim_unidade_saude
            LEFT JOIN tb_dim_tempo tempo ON vac.co_dim_tempo = tempo.co_seq_dim_tempo
            LEFT JOIN tb_dim_sexo sex ON vac.co_dim_sexo = sex.co_seq_dim_sexo
            WHERE tempo.dt_registro >= %s
        """
        cur.execute(sql_vac, (start_date.date(),))
        rows_vac = cur.fetchall()
        print(f"      -> Found {len(rows_vac)} vaccination records.")

        # =================================================================================
        # QUERY 5: PROCEDIMENTOS ODONTO (tb_fat_atend_odonto_proced)
        # =================================================================================
        print("   [5/6] Querying Odonto Procedures (tb_fat_atend_odonto_proced)...")
        # Aqui fazemos JOIN com a tabela de procedimentos odontológicos
        sql_odonto_proc = """
            SELECT 
                fao.nu_uuid_ficha as id,
                prof.no_profissional as profissional_nome,
                prof.nu_cns as profissional_cns,
                cbo.nu_cbo as cbo,
                cid.no_cidadao as paciente_nome,
                cid.nu_cns as paciente_cns,
                sex.ds_sexo as sexo,
                cid.nu_cpf_cidadao as paciente_cpf, 
                fao.dt_nascimento as data_nascimento,
                unid.nu_cnes as cnes_unidade,
                proc.co_proced as proc_codigo,
                proc.ds_proced as proc_nome,
                tempo.dt_registro as data_producao,
                'ODONTO_PROCEDURE' as type,
                NULL as cid_codigo,
                NULL as ciap_codigo
            FROM tb_fat_atend_odonto_proced faop
            -- Parent connection (FIXED COLUMN NAME)
            JOIN tb_fat_atendimento_odonto fao ON faop.co_fat_atd_odnt = fao.co_seq_fat_atd_odnt
            -- Procedure details
            LEFT JOIN tb_dim_procedimento proc ON faop.co_dim_procedimento = proc.co_seq_dim_procedimento
            -- Context from parent
            LEFT JOIN tb_dim_profissional prof ON fao.co_dim_profissional_1 = prof.co_seq_dim_profissional
            LEFT JOIN tb_dim_cbo cbo ON fao.co_dim_cbo_1 = cbo.co_seq_dim_cbo
            LEFT JOIN tb_fat_cidadao_pec cid ON fao.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
            LEFT JOIN tb_dim_unidade_saude unid ON fao.co_dim_unidade_saude_1 = unid.co_seq_dim_unidade_saude
            LEFT JOIN tb_dim_tempo tempo ON fao.co_dim_tempo = tempo.co_seq_dim_tempo
            LEFT JOIN tb_dim_sexo sex ON fao.co_dim_sexo = sex.co_seq_dim_sexo
            WHERE tempo.dt_registro >= %s
        """
        try:
            cur.execute(sql_odonto_proc, (start_date.date(),))
            rows_odonto_proc = cur.fetchall()
            print(f"      -> Found {len(rows_odonto_proc)} odonto procedures.")
        except Exception as e:
            print(f"      [WARNING] Could not query tb_fat_atend_odonto_proced: {e}")
            conn.rollback() # CRITICAL FIX: Rollback transaction on error
            rows_odonto_proc = []

        # =================================================================================
        # QUERY 6: ATENDIMENTO DOMICILIAR + DIAGNÓSTICOS (tb_fat_atend_dom_prob_cond)
        # =================================================================================
        print("   [6/6] Querying Home Visits with Diagnoses (tb_fat_atend_dom_prob_cond)...")
        # Estratégia: LEFT JOIN do Pai (atend_domiciliar) com o Filho (prob_cond)
        
        sql_domiciliar = """
            SELECT 
                fad.nu_uuid_ficha as id,
                prof.no_profissional as profissional_nome,
                prof.nu_cns as profissional_cns,
                cbo.nu_cbo as cbo,
                cid.no_cidadao as paciente_nome,
                cid.nu_cns as paciente_cns,
                sex.ds_sexo as sexo,
                cid.nu_cpf_cidadao as paciente_cpf, 
                fad.dt_nascimento as data_nascimento,
                unid.nu_cnes as cnes_unidade,
                'DOMICILIAR' as proc_codigo,
                'VISITA/ATENDIMENTO DOMICILIAR' as proc_nome,
                tempo.dt_registro as data_producao,
                'HOME_VISIT' as type,
                dim_cid.nu_cid as cid_codigo,
                dim_ciap.nu_ciap as ciap_codigo
            FROM tb_fat_atendimento_domiciliar fad
            LEFT JOIN tb_dim_profissional prof ON fad.co_dim_profissional_1 = prof.co_seq_dim_profissional
            LEFT JOIN tb_dim_cbo cbo ON fad.co_dim_cbo_1 = cbo.co_seq_dim_cbo
            LEFT JOIN tb_fat_cidadao_pec cid ON fad.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
            LEFT JOIN tb_dim_unidade_saude unid ON fad.co_dim_unidade_saude_1 = unid.co_seq_dim_unidade_saude
            LEFT JOIN tb_dim_tempo tempo ON fad.co_dim_tempo = tempo.co_seq_dim_tempo
            LEFT JOIN tb_dim_sexo sex ON fad.co_dim_sexo = sex.co_seq_dim_sexo
            
            -- DEEP MAP JOIN (Diagnósticos Domiciliares)
            -- Assuming co_seq_fat_atd_dom based on pattern; if fails, rollback handles it.
            LEFT JOIN tb_fat_atend_dom_prob_cond adpc ON fad.co_seq_fat_atd_dom = adpc.co_fat_atd_dom
            LEFT JOIN tb_dim_cid dim_cid ON adpc.co_dim_cid = dim_cid.co_seq_dim_cid
            LEFT JOIN tb_dim_ciap dim_ciap ON adpc.co_dim_ciap = dim_ciap.co_seq_dim_ciap
            
            WHERE tempo.dt_registro >= %s
        """
        try:
            cur.execute(sql_domiciliar, (start_date.date(),))
            rows_domiciliar = cur.fetchall()
            print(f"      -> Found {len(rows_domiciliar)} home visits (with diagnoses).")
        except Exception as e:
            print(f"      [WARNING] Could not query tb_fat_atendimento_domiciliar: {e}")
            conn.rollback() # CRITICAL FIX: Rollback transaction on error
            rows_domiciliar = []

        # =================================================================================
        # QUERY 7: ATIVIDADE COLETIVA (tb_fat_atividade_coletiva) - SMART JOIN
        # =================================================================================
        print("   [7/7] Querying Collective Activity (tb_fat_atividade_coletiva)...")
        # Estratégia: Detectar colunas dinamicamente, pois os nomes variam (atvdd vs atividade)
        try:
            fac_cols = get_table_columns(cur, 'tb_fat_atividade_coletiva')
            part_cols = get_table_columns(cur, 'tb_fat_atvdd_coletiva_part')

            if not fac_cols or not part_cols:
                print("      [INFO] Collective Activity tables not found or empty schema. Skipping.")
                rows_collective = []
            else:
                # 1. Detect PK of Parent
                fac_pk = 'co_seq_fat_atividade_coletiva'
                if 'co_seq_fat_atvdd_coletiva' in fac_cols: fac_pk = 'co_seq_fat_atvdd_coletiva'
                
                # 2. Detect FK in Child
                part_fk = 'co_fat_atividade_coletiva'
                if 'co_fat_atvdd_coletiva' in part_cols: part_fk = 'co_fat_atvdd_coletiva'

                # 3. Detect Professional Column in Parent (Responsible)
                prof_col = 'co_dim_profissional_1' # Default
                if 'co_dim_profissional_responsavel' in fac_cols: prof_col = 'co_dim_profissional_responsavel'
                elif 'co_dim_profissional' in fac_cols: prof_col = 'co_dim_profissional'

                sql_collective = f"""
                    SELECT 
                        fac.nu_uuid_ficha as id,
                        prof.no_profissional as profissional_nome,
                        prof.nu_cns as profissional_cns,
                        NULL as cbo, -- Catch in join if needed
                        cid.no_cidadao as paciente_nome,
                        cid.nu_cns as paciente_cns,
                        sex.ds_sexo as sexo,
                        cid.nu_cpf_cidadao as paciente_cpf, 
                        part.dt_nascimento as data_nascimento,
                        NULL as cnes_unidade, -- Often null in collective
                        'ATIV_COLETIVA' as proc_codigo,
                        'ATIVIDADE COLETIVA' as proc_nome,
                        tempo.dt_registro as data_producao,
                        'COLLECTIVE_ACTIVITY' as type,
                        NULL as cid_codigo,
                        NULL as ciap_codigo
                    FROM tb_fat_atividade_coletiva fac
                    JOIN tb_fat_atvdd_coletiva_part part ON fac.{fac_pk} = part.{part_fk}
                    LEFT JOIN tb_dim_profissional prof ON fac.{prof_col} = prof.co_seq_dim_profissional
                    LEFT JOIN tb_fat_cidadao_pec cid ON part.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
                    LEFT JOIN tb_dim_tempo tempo ON fac.co_dim_tempo = tempo.co_seq_dim_tempo
                    LEFT JOIN tb_dim_sexo sex ON part.co_dim_sexo = sex.co_seq_dim_sexo
                    WHERE tempo.dt_registro >= %s
                """
                cur.execute(sql_collective, (start_date.date(),))
                rows_collective = cur.fetchall()
                print(f"      -> Found {len(rows_collective)} collective activity participants.")

        except Exception as e:
            print(f"      [WARNING] Could not query Collective Activity: {e}")
            conn.rollback()
            rows_collective = []

        # Combine Rows
        all_rows = rows_proc + rows_consult + rows_odonto + rows_vac + rows_odonto_proc + rows_domiciliar + rows_collective

        print(f"   [TOTAL] Processing {len(all_rows)} records to send.")

        # 2. Transform Data
        payload_batch = []
        BATCH_SIZE = 100 
        
        for row in all_rows:
            # Row mapping verify
            row_id = row[0]
            proc_code = row[10]
            row_type = row[13]
            cid_val = row[14]
            ciap_val = row[15]

            # COMPOSITE ID LOGIC:
            # If it is a PROCEDURE or ODONTO_PROCEDURE, append the code to the ID
            # to ensure uniqueness when multiple procedures exist in the same sheet.
            final_id = row_id
            if row_type in ['PROCEDURE', 'ODONTO_PROCEDURE'] and proc_code:
                 final_id = f"{row_id}_{proc_code}"

            record = {
                "externalId": final_id,
                "professional": {
                    "name": row[1],
                    "cns": row[2],
                    "cbo": row[3]
                },
                "patient": {
                    "name": row[4],
                    "cns": row[5],
                    "sex": row[6],
                    "cpf": row[7],
                    "birthDate": str(row[8]) if row[8] else None
                },
                "unit": {
                    "cnes": row[9]
                },
                "procedure": {
                    "code": proc_code,
                    "name": row[11],
                    "type": row_type,
                    "cid": cid_val,
                    "ciap": ciap_val
                },
                "productionDate": str(row[12])
            }
            
            payload_batch.append(record)

            # Send Batch
            if len(payload_batch) >= BATCH_SIZE:
                send_batch(actual_api_url, payload_batch)
                payload_batch = [] 

        # Send remaining
        if payload_batch:
            send_batch(actual_api_url, payload_batch)
        
        cur.close()
        conn.close()
        print("Extraction and Sync Completed Successfully.")

    except Exception as e:
        print(f"Error: {e}")

def send_batch(url: str, data: List[Dict]):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY.strip() if API_KEY else ""}',
        'X-Municipality-Id': MUNICIPALITY_ID.strip() if MUNICIPALITY_ID else ""
    }
    
    try:
        response = requests.post(url, json={'records': data}, headers=headers)
        if response.status_code == 200:
            print(f"Batch of {len(data)} sent successfully.")
        else:
            print(f"Failed to send batch: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Network Error sending batch: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='PEC Connector for ProBPA')
    parser.add_argument('--days', type=int, default=30, help='Number of days to look back')
    parser.add_argument('--test', action='store_true', help='Run connection test only')
    
    args = parser.parse_args()
    
    # Validation Mode
    if args.test:
        check_connection()
        sys.exit(0)

    if not MUNICIPALITY_ID or not API_KEY:
        print("ERROR: Missing config in .env. Run installer.")
        sys.exit(1)

    last_run = datetime.now() - timedelta(days=args.days)
    extract_and_send(last_run)

def check_connection():
    print("\n--- VALIDATING CONNECTIONS ---")
    
    # 1. API KEY Check
    if not MUNICIPALITY_ID or not API_KEY:
        print("[FAIL] .env file missing or incomplete (API_KEY/MUNICIPALITY_ID).")
        return

    # 2. Database Check
    print(f"1. Testing Local Database ({DB_HOST}:{DB_PORT})...", end=" ")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            connect_timeout=3
        )
        conn.close()
        print("OK! [Connected]")
    except Exception as e:
        print("FAIL!")
        print(f"   Error: {e}")
        return

    # 3. API Check (Ping)
    # We send an empty batch or specific ping payload if API supports it.
    # For now, we trust the database connection is the hardest part.
    # We can try to send 0 records just to check auth.
    print(f"2. Testing Cloud API Auth...", end=" ")
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY.strip() if API_KEY else ""}',
        'X-Municipality-Id': MUNICIPALITY_ID.strip() if MUNICIPALITY_ID else ""
    }
    actual_api_url = os.getenv('API_URL', DEFAULT_API_URL)
    try:
        # Send empty array
        response = requests.post(actual_api_url, json={'records': []}, headers=headers)
        if response.status_code in [200, 201]:
             print("OK! [Authenticated]")
        else:
             print("FAIL!")
             print(f"   Status: {response.status_code} - {response.text}")
             return
    except Exception as e:
        print("FAIL!")
        print(f"   Network Error: {e}")
        return

    print("\n[SUCCESS] All systems go! You are ready to run.")

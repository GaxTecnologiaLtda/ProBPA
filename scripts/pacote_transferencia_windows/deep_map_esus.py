import os
import json
import psycopg2
import sys
import getpass
import datetime
import decimal
import uuid

# --- CONFIGURAÇÃO MANUAL (HARDCODED) ---
def get_credentials_hardcoded():
    # Credenciais injetadas diretamente conforme solicitação
    host = 'localhost'
    port = '5433'
    name = 'esus'
    user = 'postgres'
    password = 'D8Dc_vG*ma]{j4IlLWn4ikM-kO+ph-'
    return host, port, name, user, password

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)

def log(msg):
    try:
        print(msg, file=sys.stderr)
    except:
        pass

def scan_database():
    output = {
        "meta": {
            "timestamp": datetime.datetime.now().isoformat(),
        },
        "structure": {},
        "active_tables": [],
        "samples": {}
    }

    # 1. Obter Credenciais (HARDCODED)
    host, port, dbname, user, password = get_credentials_hardcoded()
    output["meta"]["target"] = f"{host}:{port}/{dbname}"

    # 2. Conectar
    log(f"\n[INFO] Conectando automaticamente em {host}:{port} com senha injetada...")
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=password
        )
        log("✅ CONEXÃO BEM SUCEDIDA!")
    except Exception as e:
        log(f"\n❌ ERRO FATAL DE CONEXÃO: {e}")
        log("Verifique se a senha ou porta estão corretas e tente novamente.")
        return

    cur = conn.cursor()
    
    # 3. Mapear Tabelas
    log("\n[1/3] Mapeando tabelas...")
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tables = [r[0] for r in cur.fetchall()]
    output["structure"]["total_tables"] = len(tables)
    output["structure"]["all_tables"] = tables

    # 4. Verificar Densidade (DE TODAS AS TABELAS)
    log("[2/3] Verificando densidade de dados em TODAS as tabelas...")
    
    # Tables to sample (content preview) will still be filtered to keep JSON size sane
    keywords_sample = ['atend', 'proced', 'odont', 'vacin', 'cds', 'ficha']

    for i, table in enumerate(tables):
        # Progress log every 50 tables
        if i % 50 == 0:
            log(f"      ... processando tabela {i}/{len(tables)}")

        try:
            # Check if table has ANY data
            cur.execute(f"SELECT 1 FROM {table} LIMIT 1")
            has_data = cur.fetchone()
            
            if has_data:
                # Get exact count (or estimate if you prefer speed, but let's do count for accuracy)
                # For massive tables, count(*) can be slow. Let's stick to count(*) but be aware.
                cur.execute(f"SELECT count(*) FROM {table}")
                count = cur.fetchone()[0]

                # Get Columns
                cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
                cols = [r[0] for r in cur.fetchall()]
                
                output["active_tables"].append({
                    "name": table,
                    "count": count,
                    "columns": cols
                })
        except Exception:
            pass 

    # 5. Amostras Profundas
    log("[3/3] Coletando amostras de dados (apenas tabelas chave)...")
    sample_targets = [t['name'] for t in output["active_tables"] 
                     if any(k in t['name'] for k in keywords_sample)]
    
    for table in sample_targets:
        try:
            cur.execute(f"SELECT * FROM {table} LIMIT 5")
            if cur.description:
                cols = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                
                table_samples = []
                for r in rows:
                    row_dict = dict(zip(cols, r))
                    clean_row = {k:v for k,v in row_dict.items() if v is not None}
                    table_samples.append(clean_row)
                
                output["samples"][table] = table_samples
        except Exception:
            pass

    conn.close()
    
    # Salvar output
    filename = "scan.json"
    log(f"\n[FIM] Salvando resultado em '{filename}'...")
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, cls=CustomEncoder)
    
    log("✅ ARQUIVO GERADO COM SUCESSO! Envie 'scan.json' para o suporte.")

if __name__ == '__main__':
    scan_database()

import os
import sys
import psycopg2
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Callable, Optional, Generator

# Constants
DEFAULT_API_URL = 'https://southamerica-east1-probpa-025.cloudfunctions.net/ingestPecData'

class PecConnectorEngine:
    def __init__(self, config_manager):
        """
        Initialize the connector engine using ConfigManager.
        """
        self.config = config_manager
        self.aborted = False

        # Hydrate internal config for easy access
        self.db = {
            'host': self.config.get('db_host', 'localhost'),
            'port': self.config.get('db_port', '5432'),
            'name': self.config.get('db_name', 'esus'),
            'user': self.config.get('db_user', 'postgres'),
            'password': self.config.get('db_pass', 'postgres')
        }
        self.api = {
            'url': DEFAULT_API_URL, 
            'key': self.config.get('api_key'),
            'municipality_id': self.config.get('municipality_id')
        }

    def abort(self):
        """Signal to abort the process safely."""
        self.aborted = True

    def check_connection(self) -> Dict[str, bool]:
        """Verify DB and API connections."""
        status = {'db': False, 'api': False, 'details': ''}
        
        # 1. DB Check
        try:
            conn = psycopg2.connect(
                host=self.db['host'],
                port=self.db['port'],
                dbname=self.db['name'],
                user=self.db['user'],
                password=self.db['password'],
                connect_timeout=5
            )
            conn.close()
            status['db'] = True
        except Exception as e:
            status['details'] = f"DB Error: {str(e)}"
            return status

        # 2. API Check
        try:
            headers = {
                'Authorization': f"Bearer {self.api['key']}",
                'X-Municipality-Id': self.api['municipality_id']
            }
            # Sending empty list to check auth
            res = requests.post(self.api['url'], json={'records': []}, headers=headers, timeout=5)
            if res.status_code in [200, 201]:
                status['api'] = True
            else:
                status['details'] = f"API Error: {res.status_code}"
        except Exception as e:
            status['details'] = f"API Network Error: {str(e)}"
            
        return status

    def get_table_columns(self, cur, table_name):
        try:
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = %s
            """, (table_name,))
            return {row[0] for row in cur.fetchall()}
        except Exception:
            return set()

    def extract_and_send(self, days_back: int = 30) -> Generator[tuple, None, None]:
        """Run the full ETL process yielding (status_type, message)."""
        self.aborted = False
        has_error = False
        
        # --- INCREMENTAL LOGIC ---
        interval_setting = self.config.get("scheduler_interval", "15")
        last_run = self.config.get_last_run_success()
        
        start_date = datetime.now() - timedelta(days=days_back)
        is_incremental = False
        
        if interval_setting in ["12 hours", "24 hours"] and last_run:
            try:
                # If we have a successful last run, start from there!
                # We subtract a small buffer (e.g. 1 hour) just to be safe against long transactions?
                # Or exact time? Let's use exact time but ensure >= logic handles it.
                last_run_dt = datetime.fromisoformat(last_run)
                start_date = last_run_dt
                is_incremental = True
                yield ('INFO', f"Incremental Mode: Starting from last success ({start_date})")
            except:
                yield ('WARNING', "Failed to parse last run time. Defaulting to full days back.")
        else:
            yield ('INFO', f"Full Load Mode: Starting from {days_back} days ago ({start_date.date()})")

        
        conn = None
        try:
            if self.aborted: return
            yield ('INFO', f"Connecting to DB {self.db['host']}...")
            conn = psycopg2.connect(
                host=self.db.get('host'),
                port=self.db.get('port'),
                dbname=self.db.get('name'),
                user=self.db.get('user'),
                password=self.db.get('password'),
                connect_timeout=10
            )
            cur = conn.cursor()
            
            # --- EXTRACTION ---
            all_rows = []
            
            # =================================================================================
            # QUERY 1: PROCEDIMENTOS REALIZADOS (tb_fat_proced_atend_proced)
            # =================================================================================
            if self.aborted: return
            yield ('INFO', "[1/7] Querying Procedures...")
            sql_proc = """
                SELECT pap.nu_uuid_ficha as id, prof.no_profissional, prof.nu_cns, cbo.nu_cbo,
                       cid.no_cidadao, cid.nu_cns, sex.ds_sexo, cid.nu_cpf_cidadao, 
                       pap.dt_nascimento, unid.nu_cnes, proc.co_proced, proc.ds_proced,
                       tempo.dt_registro, 'PROCEDURE' as type, NULL, NULL
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
            rows = cur.fetchall()
            yield ('INFO', f"   -> Found {len(rows)} procedures.")
            all_rows.extend(rows)

            # =================================================================================
            # QUERY 2: CONSULTAS + DIAGNOSTICOS
            # =================================================================================
            if self.aborted: return
            yield ('INFO', "[2/7] Querying Consultations...")
            sql_consult = """
                SELECT fai.nu_uuid_ficha, prof.no_profissional, prof.nu_cns, cbo.nu_cbo,
                       cid.no_cidadao, cid.nu_cns, sex.ds_sexo, cid.nu_cpf_cidadao, 
                       fai.dt_nascimento, unid.nu_cnes, 'CONSULTA', 'ATENDIMENTO INDIVIDUAL',
                       tempo.dt_registro, 'CONSULTATION', dim_cid.nu_cid, dim_ciap.nu_ciap
                FROM tb_fat_atendimento_individual fai
                LEFT JOIN tb_dim_profissional prof ON fai.co_dim_profissional_1 = prof.co_seq_dim_profissional
                LEFT JOIN tb_dim_cbo cbo ON fai.co_dim_cbo_1 = cbo.co_seq_dim_cbo
                LEFT JOIN tb_fat_cidadao_pec cid ON fai.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
                LEFT JOIN tb_dim_unidade_saude unid ON fai.co_dim_unidade_saude_1 = unid.co_seq_dim_unidade_saude
                LEFT JOIN tb_dim_tempo tempo ON fai.co_dim_tempo = tempo.co_seq_dim_tempo
                LEFT JOIN tb_dim_sexo sex ON fai.co_dim_sexo = sex.co_seq_dim_sexo
                LEFT JOIN tb_fat_atd_ind_problemas prob ON fai.co_seq_fat_atd_ind = prob.co_fat_atd_ind
                LEFT JOIN tb_dim_cid dim_cid ON prob.co_dim_cid = dim_cid.co_seq_dim_cid
                LEFT JOIN tb_dim_ciap dim_ciap ON prob.co_dim_ciap = dim_ciap.co_seq_dim_ciap
                WHERE tempo.dt_registro >= %s
            """
            cur.execute(sql_consult, (start_date.date(),))
            rows = cur.fetchall()
            yield ('INFO', f"   -> Found {len(rows)} consultations.")
            all_rows.extend(rows)

            # =================================================================================
            # QUERY 3: ODONTOLOGIA
            # =================================================================================
            if self.aborted: return
            yield ('INFO', "[3/7] Querying Odontology (Attendance)...")
            sql_odonto = """
                SELECT fao.nu_uuid_ficha, prof.no_profissional, prof.nu_cns, cbo.nu_cbo,
                       cid.no_cidadao, cid.nu_cns, sex.ds_sexo, cid.nu_cpf_cidadao, 
                       fao.dt_nascimento, unid.nu_cnes, 'ODONTO', 'ATENDIMENTO ODONTOLOGICO',
                       tempo.dt_registro, 'ODONTOLOGY', NULL, NULL
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
            rows = cur.fetchall()
            yield ('INFO', f"   -> Found {len(rows)} dental attendances.")
            all_rows.extend(rows)

            # =================================================================================
            # QUERY 4: VACINAÇÃO (ENHANCED - DYNAMIC SCHEMA)
            # =================================================================================
            if self.aborted: return
            yield ('INFO', "[4/7] Querying Vaccination (Detailed)...")
            
            # 1. Detect optional columns dynamically
            vac_cols = self.get_table_columns(cur, 'tb_fat_vacinacao_vacina')
            
            # Default: No extra details
            via_join = ""
            local_join = ""
            details_concat = ""
            
            # Check for Administration Route
            # Common names: co_dim_via_adm_vacina OR co_dim_via_administracao
            has_via = False
            if 'co_dim_via_adm_vacina' in vac_cols:
                via_join = "LEFT JOIN tb_dim_via_administracao via ON vac_item.co_dim_via_adm_vacina = via.co_seq_dim_via_administracao"
                has_via = True
            elif 'co_dim_via_administracao' in vac_cols:
                via_join = "LEFT JOIN tb_dim_via_administracao via ON vac_item.co_dim_via_administracao = via.co_seq_dim_via_administracao"
                has_via = True
                
            # Check for Application Site
            has_local = False
            if 'co_dim_local_apl_vacina' in vac_cols:
                local_join = "LEFT JOIN tb_dim_local_apl_vacina local ON vac_item.co_dim_local_apl_vacina = local.co_seq_dim_local_apl_vacina"
                has_local = True

            # Build Concat String
            # CONCAT(imuno... , ' - ', dose... [ , ' (', via, ' / ', local, ')' ])
            if has_via and has_local:
                details_concat = ", ' (', COALESCE(via.no_via_administracao, '?'), ' / ', COALESCE(local.ds_local_apl_vacina, '?'), ')'"
            elif has_via:
                details_concat = ", ' (', COALESCE(via.no_via_administracao, '?'), ')'"
            elif has_local:
                 details_concat = ", ' (', COALESCE(local.ds_local_apl_vacina, '?'), ')'"

            sql_vac = f"""
                SELECT vac.nu_uuid_ficha, prof.no_profissional, prof.nu_cns, cbo.nu_cbo,
                       cid.no_cidadao, cid.nu_cns, sex.ds_sexo, cid.nu_cpf_cidadao, 
                       vac.dt_nascimento, unid.nu_cnes, 
                       imuno.nu_identificador, 
                       CONCAT(imuno.no_imunobiologico, ' - ', dose.no_dose_imunobiologico {details_concat}),
                       tempo.dt_registro, 'VACCINATION', NULL, NULL
                FROM tb_fat_vacinacao vac
                -- JOINS BASICOS
                LEFT JOIN tb_dim_profissional prof ON vac.co_dim_profissional = prof.co_seq_dim_profissional
                LEFT JOIN tb_dim_cbo cbo ON vac.co_dim_cbo = cbo.co_seq_dim_cbo
                LEFT JOIN tb_fat_cidadao_pec cid ON vac.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
                LEFT JOIN tb_dim_unidade_saude unid ON vac.co_dim_unidade_saude = unid.co_seq_dim_unidade_saude
                LEFT JOIN tb_dim_tempo tempo ON vac.co_dim_tempo = tempo.co_seq_dim_tempo
                LEFT JOIN tb_dim_sexo sex ON vac.co_dim_sexo = sex.co_seq_dim_sexo
                
                -- JOIN CHILD TABLE (Vacinas Aplicadas)
                JOIN tb_fat_vacinacao_vacina vac_item ON vac.co_seq_fat_vacinacao = vac_item.co_fat_vacinacao
                
                -- JOIN DIMENSIONS via Child Table
                LEFT JOIN tb_dim_imunobiologico imuno ON vac_item.co_dim_imunobiologico = imuno.co_seq_dim_imunobiologico
                LEFT JOIN tb_dim_dose_imunobiologico dose ON vac_item.co_dim_dose_imunobiologico = dose.co_seq_dim_dose_imunobiologico
                {via_join}
                {local_join}
                
                WHERE tempo.dt_registro >= %s
            """
            cur.execute(sql_vac, (start_date.date(),))
            rows = cur.fetchall()
            yield ('INFO', f"   -> Found {len(rows)} vaccinations.")
            all_rows.extend(rows)

            # =================================================================================
            # QUERY 5: ODONTO PROCEDURES
            # =================================================================================
            if self.aborted: return
            yield ('INFO', "[5/7] Querying Odonto Procedures...")
            try:
                sql_odonto_proc = """
                    SELECT fao.nu_uuid_ficha, prof.no_profissional, prof.nu_cns, cbo.nu_cbo,
                           cid.no_cidadao, cid.nu_cns, sex.ds_sexo, cid.nu_cpf_cidadao, 
                           fao.dt_nascimento, unid.nu_cnes, proc.co_proced, proc.ds_proced,
                           tempo.dt_registro, 'ODONTO_PROCEDURE', NULL, NULL
                    FROM tb_fat_atend_odonto_proced faop
                    JOIN tb_fat_atendimento_odonto fao ON faop.co_fat_atd_odnt = fao.co_seq_fat_atd_odnt
                    LEFT JOIN tb_dim_procedimento proc ON faop.co_dim_procedimento = proc.co_seq_dim_procedimento
                    LEFT JOIN tb_dim_profissional prof ON fao.co_dim_profissional_1 = prof.co_seq_dim_profissional
                    LEFT JOIN tb_dim_cbo cbo ON fao.co_dim_cbo_1 = cbo.co_seq_dim_cbo
                    LEFT JOIN tb_fat_cidadao_pec cid ON fao.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
                    LEFT JOIN tb_dim_unidade_saude unid ON fao.co_dim_unidade_saude_1 = unid.co_seq_dim_unidade_saude
                    LEFT JOIN tb_dim_tempo tempo ON fao.co_dim_tempo = tempo.co_seq_dim_tempo
                    LEFT JOIN tb_dim_sexo sex ON fao.co_dim_sexo = sex.co_seq_dim_sexo
                    WHERE tempo.dt_registro >= %s
                """
                cur.execute(sql_odonto_proc, (start_date.date(),))
                rows = cur.fetchall()
                yield ('INFO', f"   -> Found {len(rows)} dental procedures.")
                all_rows.extend(rows)
            except Exception as e:
                conn.rollback()
                yield ('WARNING', f"Skipping Odonto Procedures (Error): {e}")

            # =================================================================================
            # QUERY 6: ATENDIMENTO DOMICILIAR
            # =================================================================================
            if self.aborted: return
            yield ('INFO', "[6/7] Querying Home Visits...")
            try:
                # FIX: Dynamically find PK to avoid "column does not exist"
                dom_cols = self.get_table_columns(cur, 'tb_fat_atendimento_domiciliar')
                dom_pk = next((c for c in dom_cols if c.startswith('co_seq_')), 'co_seq_fat_atendimento_domiciliar')
                
                # Dynamic Deep Map Join
                adpc_join = ""
                adpc_selects = "dim_cid.nu_cid, dim_ciap.nu_ciap" # Default selects
                adpc_cols = self.get_table_columns(cur, 'tb_fat_atend_dom_prob_cond')
                
                if adpc_cols:
                    # Try to find the FK in adpc that points to parent
                    fk_candidates = ['co_fat_atendimento_domiciliar', 'co_fat_atd_dom', 'co_fat_atd_domiciliar']
                    adpc_fk = next((c for c in fk_candidates if c in adpc_cols), None)
                    
                    # Fallback: Fuzzy Match (any column with 'fat' and ('dom' or 'atd') that is not PK)
                    if not adpc_fk:
                         adpc_pk_guess = next((c for c in adpc_cols if c.startswith('co_seq_')), None)
                         adpc_fk = next((c for c in adpc_cols if 'fat' in c and ('dom' in c or 'atd' in c) and c != adpc_pk_guess), None)

                    if adpc_fk:
                        adpc_join = f"""
                            LEFT JOIN tb_fat_atend_dom_prob_cond adpc ON fad.{dom_pk} = adpc.{adpc_fk}
                            LEFT JOIN tb_dim_cid dim_cid ON adpc.co_dim_cid = dim_cid.co_seq_dim_cid
                            LEFT JOIN tb_dim_ciap dim_ciap ON adpc.co_dim_ciap = dim_ciap.co_seq_dim_ciap
                        """
                    else:
                         yield ('WARNING', f"Skipping Home Visit Details: FK not found. Avail: {str(list(adpc_cols))}")
                         adpc_selects = "NULL as nu_cid, NULL as nu_ciap"
                else:
                    adpc_selects = "NULL as nu_cid, NULL as nu_ciap"

                sql_domiciliar = f"""
                    SELECT fad.nu_uuid_ficha, prof.no_profissional, prof.nu_cns, cbo.nu_cbo,
                           cid.no_cidadao, cid.nu_cns, sex.ds_sexo, cid.nu_cpf_cidadao, 
                           fad.dt_nascimento, unid.nu_cnes, 'DOMICILIAR', 'VISITA DOMICILIAR',
                           tempo.dt_registro, 'HOME_VISIT', {adpc_selects}
                    FROM tb_fat_atendimento_domiciliar fad
                    LEFT JOIN tb_dim_profissional prof ON fad.co_dim_profissional_1 = prof.co_seq_dim_profissional
                    LEFT JOIN tb_dim_cbo cbo ON fad.co_dim_cbo_1 = cbo.co_seq_dim_cbo
                    LEFT JOIN tb_fat_cidadao_pec cid ON fad.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
                    LEFT JOIN tb_dim_unidade_saude unid ON fad.co_dim_unidade_saude_1 = unid.co_seq_dim_unidade_saude
                    LEFT JOIN tb_dim_tempo tempo ON fad.co_dim_tempo = tempo.co_seq_dim_tempo
                    LEFT JOIN tb_dim_sexo sex ON fad.co_dim_sexo = sex.co_seq_dim_sexo
                    
                    -- DEEP MAP JOIN (Diagnósticos Domiciliares)
                    {adpc_join}
                    
                    WHERE tempo.dt_registro >= %s
                """
                cur.execute(sql_domiciliar, (start_date.date(),))
                rows = cur.fetchall()
                yield ('INFO', f"   -> Found {len(rows)} home visits.")
                all_rows.extend(rows)
            except Exception as e:
                conn.rollback()
                yield ('WARNING', f"Skipping Home Visits (Error): {e}")

            # =================================================================================
            # QUERY 7: ATIVIDADE COLETIVA
            # =================================================================================
            if self.aborted: return
            yield ('INFO', "[7/7] Querying Collective Activity...")
            try:
                fac_cols = self.get_table_columns(cur, 'tb_fat_atividade_coletiva')
                part_cols = self.get_table_columns(cur, 'tb_fat_atvdd_coletiva_part')

                if fac_cols and part_cols:
                    fac_pk = 'co_seq_fat_atvdd_coletiva' if 'co_seq_fat_atvdd_coletiva' in fac_cols else 'co_seq_fat_atividade_coletiva'
                    part_fk = 'co_fat_atvdd_coletiva' if 'co_fat_atvdd_coletiva' in part_cols else 'co_fat_atividade_coletiva'
                    
                    # Robust Professional Column Detection
                    possible_prof_cols = ['co_dim_profissional_responsavel', 'co_dim_profissional_1', 'co_dim_profissional']
                    prof_col = next((c for c in possible_prof_cols if c in fac_cols), None)
                    
                    # Robust Procedure Column Detection
                    proc_col = 'co_dim_procedimento' if 'co_dim_procedimento' in fac_cols else None
                    proc_join = ""
                    proc_select_code = "'ATIV_COLETIVA'"
                    proc_select_name = "'ATIVIDADE COLETIVA'"
                    
                    if proc_col:
                        proc_join = f"LEFT JOIN tb_dim_procedimento proc ON fac.{proc_col} = proc.co_seq_dim_procedimento"
                        proc_select_code = "COALESCE(proc.co_proced, 'ATIV_COLETIVA')"
                        proc_select_name = "COALESCE(proc.ds_proced, 'ATIVIDADE COLETIVA')"
                    
                    if not prof_col:
                         yield ('WARNING', "Skipping Collective: Could not find professional column.")
                    else:
                        sql_collective = f"""
                            SELECT fac.nu_uuid_ficha, prof.no_profissional, prof.nu_cns, NULL,
                                   cid.no_cidadao, cid.nu_cns, sex.ds_sexo, cid.nu_cpf_cidadao, 
                                   tempo_nasc.dt_registro, NULL, {proc_select_code}, {proc_select_name},
                                   tempo.dt_registro, 'COLLECTIVE_ACTIVITY', NULL, NULL
                            FROM tb_fat_atividade_coletiva fac
                            JOIN tb_fat_atvdd_coletiva_part part ON fac.{fac_pk} = part.{part_fk}
                            LEFT JOIN tb_dim_profissional prof ON fac.{prof_col} = prof.co_seq_dim_profissional
                            LEFT JOIN tb_fat_cidadao_pec cid ON part.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
                            LEFT JOIN tb_dim_tempo tempo ON fac.co_dim_tempo = tempo.co_seq_dim_tempo
                            LEFT JOIN tb_dim_sexo sex ON cid.co_dim_sexo = sex.co_seq_dim_sexo
                            
                            -- Fix Birth Date via dim_tempo
                            LEFT JOIN tb_dim_tempo tempo_nasc ON cid.co_dim_tempo_nascimento = tempo_nasc.co_seq_dim_tempo
                            
                            {proc_join}
                            
                            WHERE tempo.dt_registro >= %s
                        """
                        cur.execute(sql_collective, (start_date.date(),))
                        rows = cur.fetchall()
                        yield ('INFO', f"   -> Found {len(rows)} collective participants.")
                        all_rows.extend(rows)
            except Exception as e:
                conn.rollback()
                yield ('WARNING', f"Skipping Collective Activity (Error/Schema): {e}")

            # --- SENDING ---
            if self.aborted: return
            yield ('INFO', f"[TOTAL] Processing {len(all_rows)} records...")
            
            # We need to yield from _send_batch
            for msg in self._send_batch(all_rows):
                if msg[0] == 'ERROR': has_error = True
                yield msg
            
        except Exception as e:
            has_error = True
            yield ('ERROR', f"Process Error: {e}")
            if conn: conn.rollback()
        finally:
            if conn: conn.close()
            
            if not self.aborted and not has_error: 
                # Ideally we track success status better
                # But for now, let's assume if we reached here without exception catch
                # Wait, exception catch sets ERROR.
                pass

            yield ('SUCCESS', "Cycle Complete.")
            if not self.aborted and not has_error:
                 # Update Last Run success for incremental
                 self.config.set_last_run_success(datetime.now().isoformat())

    def _send_batch(self, rows):
        payload = []
        BATCH_SIZE = 100
        for row in rows:
            # Row mapping verify
            row_id = row[0]
            # Mapping: 1=ProfName, 2=ProfCNS, 3=CBO
            # 4=PatName, 5=PatCNS, 6=Sex, 7=CPF, 8=Birth
            # 9=CNES, 10=Code, 11=Name/Desc, 12=Date, 13=Type
            # 14=CID, 15=CIAP
            
            proc_code = row[10]
            row_type = row[13]
            
            final_id = row_id
            
            # UNIQUE ID LOGIC TO PREVENT OVERWRITES
            # 1. Procedures / Odonto: UUID + Code
            if row_type in ['PROCEDURE', 'ODONTO_PROCEDURE'] and proc_code:
                 final_id = f"{row_id}_{proc_code}"
            
            # 2. Collective Activity: UUID + Patient CNS (since multiple participants per sheet)
            elif row_type == 'COLLECTIVE_ACTIVITY':
                 pat_cns = row[5] or 'NOCNS'
                 final_id = f"{row_id}_{pat_cns}"
            
            # 3. Home Visit: UUID + CID + CIAP (if multiple conditions joined)
            elif row_type == 'HOME_VISIT':
                 # Use CID/CIAP suffix if present to distinguish multiple conditions
                 cid = row[14] if len(row) > 14 else None
                 ciap = row[15] if len(row) > 15 else None
                 suffix = ""
                 if cid: suffix += f"_{cid}"
                 if ciap: suffix += f"_{ciap}"
                 if suffix: final_id = f"{row_id}{suffix}"

            record = {
                "externalId": final_id,
                "professional": {"name": row[1], "cns": row[2], "cbo": row[3]},
                "patient": {
                    "name": row[4], "cns": row[5], "sex": row[6], 
                    "cpf": row[7], "birthDate": str(row[8]) if row[8] else None
                },
                "unit": {"cnes": row[9]},
                "procedure": {
                    "code": proc_code, "name": row[11], "type": row_type,
                    "cid": row[14], "ciap": row[15]
                },
                "productionDate": str(row[12])
            }
            payload.append(record)
            
            if len(payload) >= BATCH_SIZE:
                if self._post_to_api(payload):
                    yield ('INFO', f"   -> Batch of {len(payload)} sent.")
                else:
                    yield ('ERROR', "   -> Upload Failed.")
                payload = []
        
        if payload:
            if self._post_to_api(payload):
                yield ('INFO', f"   -> Final batch of {len(payload)} sent.")
            else:
                 yield ('ERROR', "   -> Final Upload Failed.")

    def _post_to_api(self, data):
        url = self.api.get('url')
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {self.api.get('key')}",
            'X-Municipality-Id': self.api.get('municipality_id')
        }
        try:
            res = requests.post(url, json={'records': data}, headers=headers, timeout=10)
            return res.status_code in [200, 201]
        except Exception:
            return False

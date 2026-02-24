import os
import sys
import psycopg2
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Callable, Optional, Generator

DEFAULT_API_URL = 'https://southamerica-east1-probpa-025.cloudfunctions.net/ingestPecData'

class PecConnectorEngine:
    def __init__(self, config_manager):
        self.config = config_manager
        self.aborted = False

    def abort(self):
        self.aborted = True

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

    def extract_and_send(self) -> Generator[tuple, None, None]:
        self.aborted = False
        has_error = False
        
        municipalities = self.config.get_municipalities()
        if not municipalities:
            yield ('ERROR', "Nenhum município configurado. Processo encerrado.", None)
            return

        for mun in municipalities:
            if self.aborted: return
            
            mun_name = mun.get('municipality_name', 'Desconhecido')
            mun_id = mun.get('municipality_id', '???')
            days_back = mun.get('days_back', 30)
            yield ('HIGHLIGHT', f"\n=== Iniciando Cliente Extração: {mun_name} ({mun_id}) ===", mun_id)
            
            # --- CONTEXTUAL INCREMENTAL LOGIC FOR THIS MUNICIPALITY ---
            interval_setting = self.config.get_global("scheduler_interval", "15")
            last_run = mun.get("last_run_success")
            
            start_date = datetime.now() - timedelta(days=days_back)
            is_incremental = False
            
            if interval_setting in ["12 hours", "24 hours"] and last_run:
                try:
                    last_run_dt = datetime.fromisoformat(last_run)
                    start_date = last_run_dt
                    is_incremental = True
                    yield ('INFO', f"Incremental Mode: Starting from last success ({start_date})", mun_id)
                except:
                    yield ('WARNING', "Failed to parse last run time. Defaulting to full days back.", mun_id)
            else:
                yield ('INFO', f"Full Load Mode: Starting from {days_back} days ago ({start_date.date()})", mun_id)

            conn = None
            try:
                db_host = mun.get('db_host')
                db_port = str(mun.get('db_port', '5432'))
                db_name = mun.get('db_name', 'esus')
                db_user = mun.get('db_user', 'postgres')
                db_pass = mun.get('db_pass', 'postgres')
                
                yield ('INFO', f"Connecting to DB {db_host}:{db_port}...", mun_id)
                conn = psycopg2.connect(
                    host=db_host,
                    port=db_port,
                    dbname=db_name,
                    user=db_user,
                    password=db_pass,
                    connect_timeout=10
                )
                cur = conn.cursor()
                
                # --- EXTRACTION ---
                all_rows = []
                
                # QUERY 1: PROCEDIMENTOS REALIZADOS
                if self.aborted: return
                yield ('INFO', "[1/7] Querying Procedures...", mun_id)
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
                yield ('INFO', f"   -> Found {len(rows)} procedures.", mun_id)
                all_rows.extend(rows)

                # QUERY 2: CONSULTAS + DIAGNOSTICOS
                if self.aborted: return
                yield ('INFO', "[2/7] Querying Consultations...", mun_id)
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
                yield ('INFO', f"   -> Found {len(rows)} consultations.", mun_id)
                all_rows.extend(rows)

                # QUERY 3: ODONTOLOGIA
                if self.aborted: return
                yield ('INFO', "[3/7] Querying Odontology (Attendance)...", mun_id)
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
                yield ('INFO', f"   -> Found {len(rows)} dental attendances.", mun_id)
                all_rows.extend(rows)

                # QUERY 4: VACINAÇÃO
                if self.aborted: return
                yield ('INFO', "[4/7] Querying Vaccination (Detailed)...", mun_id)
                vac_cols = self.get_table_columns(cur, 'tb_fat_vacinacao_vacina')
                via_join = ""
                local_join = ""
                details_concat = ""
                has_via = False
                if 'co_dim_via_adm_vacina' in vac_cols:
                    via_join = "LEFT JOIN tb_dim_via_administracao via ON vac_item.co_dim_via_adm_vacina = via.co_seq_dim_via_administracao"
                    has_via = True
                elif 'co_dim_via_administracao' in vac_cols:
                    via_join = "LEFT JOIN tb_dim_via_administracao via ON vac_item.co_dim_via_administracao = via.co_seq_dim_via_administracao"
                    has_via = True
                    
                has_local = False
                if 'co_dim_local_apl_vacina' in vac_cols:
                    local_join = "LEFT JOIN tb_dim_local_apl_vacina local ON vac_item.co_dim_local_apl_vacina = local.co_seq_dim_local_apl_vacina"
                    has_local = True

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
                    LEFT JOIN tb_dim_profissional prof ON vac.co_dim_profissional = prof.co_seq_dim_profissional
                    LEFT JOIN tb_dim_cbo cbo ON vac.co_dim_cbo = cbo.co_seq_dim_cbo
                    LEFT JOIN tb_fat_cidadao_pec cid ON vac.co_fat_cidadao_pec = cid.co_seq_fat_cidadao_pec
                    LEFT JOIN tb_dim_unidade_saude unid ON vac.co_dim_unidade_saude = unid.co_seq_dim_unidade_saude
                    LEFT JOIN tb_dim_tempo tempo ON vac.co_dim_tempo = tempo.co_seq_dim_tempo
                    LEFT JOIN tb_dim_sexo sex ON vac.co_dim_sexo = sex.co_seq_dim_sexo
                    JOIN tb_fat_vacinacao_vacina vac_item ON vac.co_seq_fat_vacinacao = vac_item.co_fat_vacinacao
                    LEFT JOIN tb_dim_imunobiologico imuno ON vac_item.co_dim_imunobiologico = imuno.co_seq_dim_imunobiologico
                    LEFT JOIN tb_dim_dose_imunobiologico dose ON vac_item.co_dim_dose_imunobiologico = dose.co_seq_dim_dose_imunobiologico
                    {via_join}
                    {local_join}
                    WHERE tempo.dt_registro >= %s
                """
                cur.execute(sql_vac, (start_date.date(),))
                rows = cur.fetchall()
                yield ('INFO', f"   -> Found {len(rows)} vaccinations.", mun_id)
                all_rows.extend(rows)

                # QUERY 5: ODONTO PROCEDURES
                if self.aborted: return
                yield ('INFO', "[5/7] Querying Odonto Procedures...", mun_id)
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
                    yield ('INFO', f"   -> Found {len(rows)} dental procedures.", mun_id)
                    all_rows.extend(rows)
                except Exception as e:
                    conn.rollback()
                    yield ('WARNING', f"Skipping Odonto Procedures (Error): {e}", mun_id)

                # QUERY 6: ATENDIMENTO DOMICILIAR
                if self.aborted: return
                yield ('INFO', "[6/7] Querying Home Visits...", mun_id)
                try:
                    dom_cols = self.get_table_columns(cur, 'tb_fat_atendimento_domiciliar')
                    dom_pk = next((c for c in dom_cols if c.startswith('co_seq_')), 'co_seq_fat_atendimento_domiciliar')
                    
                    adpc_join = ""
                    adpc_selects = "dim_cid.nu_cid, dim_ciap.nu_ciap"
                    adpc_cols = self.get_table_columns(cur, 'tb_fat_atend_dom_prob_cond')
                    
                    if adpc_cols:
                        fk_candidates = ['co_fat_atendimento_domiciliar', 'co_fat_atd_dom', 'co_fat_atd_domiciliar']
                        adpc_fk = next((c for c in fk_candidates if c in adpc_cols), None)
                        
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
                             yield ('WARNING', f"Skipping Home Visit Details: FK not found. Avail: {str(list(adpc_cols))}", mun_id)
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
                        {adpc_join}
                        WHERE tempo.dt_registro >= %s
                    """
                    cur.execute(sql_domiciliar, (start_date.date(),))
                    rows = cur.fetchall()
                    yield ('INFO', f"   -> Found {len(rows)} home visits.", mun_id)
                    all_rows.extend(rows)
                except Exception as e:
                    conn.rollback()
                    yield ('WARNING', f"Skipping Home Visits (Error): {e}", mun_id)

                # QUERY 7: ATIVIDADE COLETIVA
                if self.aborted: return
                yield ('INFO', "[7/7] Querying Collective Activity...", mun_id)
                try:
                    fac_cols = self.get_table_columns(cur, 'tb_fat_atividade_coletiva')
                    part_cols = self.get_table_columns(cur, 'tb_fat_atvdd_coletiva_part')

                    if fac_cols and part_cols:
                        fac_pk = 'co_seq_fat_atvdd_coletiva' if 'co_seq_fat_atvdd_coletiva' in fac_cols else 'co_seq_fat_atividade_coletiva'
                        part_fk = 'co_fat_atvdd_coletiva' if 'co_fat_atvdd_coletiva' in part_cols else 'co_fat_atividade_coletiva'
                        
                        possible_prof_cols = ['co_dim_profissional_responsavel', 'co_dim_profissional_1', 'co_dim_profissional']
                        prof_col = next((c for c in possible_prof_cols if c in fac_cols), None)
                        
                        proc_col = 'co_dim_procedimento' if 'co_dim_procedimento' in fac_cols else None
                        proc_join = ""
                        proc_select_code = "'ATIV_COLETIVA'"
                        proc_select_name = "'ATIVIDADE COLETIVA'"
                        
                        if proc_col:
                            proc_join = f"LEFT JOIN tb_dim_procedimento proc ON fac.{proc_col} = proc.co_seq_dim_procedimento"
                            proc_select_code = "COALESCE(proc.co_proced, 'ATIV_COLETIVA')"
                            proc_select_name = "COALESCE(proc.ds_proced, 'ATIVIDADE COLETIVA')"
                        
                        if not prof_col:
                             yield ('WARNING', "Skipping Collective: Could not find professional column.", mun_id)
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
                                LEFT JOIN tb_dim_tempo tempo_nasc ON cid.co_dim_tempo_nascimento = tempo_nasc.co_seq_dim_tempo
                                {proc_join}
                                WHERE tempo.dt_registro >= %s
                            """
                            cur.execute(sql_collective, (start_date.date(),))
                            rows = cur.fetchall()
                            yield ('INFO', f"   -> Found {len(rows)} collective participants.", mun_id)
                            all_rows.extend(rows)
                except Exception as e:
                    conn.rollback()
                    yield ('WARNING', f"Skipping Collective Activity (Error/Schema): {e}", mun_id)

                # --- SENDING ---
                if self.aborted: return
                yield ('INFO', f"[TOTAL] Processing {len(all_rows)} records for {mun_name}...", mun_id)
                
                for msg in self._send_batch(all_rows, mun):
                    if msg[0] == 'ERROR': has_error = True
                    yield msg
                
                if not self.aborted and not has_error:
                    self.config.set_municipality_last_run(mun_id, datetime.now().isoformat())
                    yield ('INFO', f"=== Extração Finalizada com Sucesso para {mun_name} ===", mun_id)

            except Exception as e:
                has_error = True
                yield ('ERROR', f"Erro de extração em {mun_name}: {e}", mun_id)
                if conn: conn.rollback()
            finally:
                if conn: conn.close()
                if self.aborted:
                    yield ('WARNING', "Processo abortado pelo usuário durante a iteração.", mun_id)
                    break

        if not self.aborted:
            yield ('SUCCESS', "Ciclo de Extração Centralizada Completo.", None)


    def _send_batch(self, rows, mun_config):
        mun_id = mun_config.get('municipality_id')
        payload = []
        BATCH_SIZE = 100
        for row in rows:
            row_id = row[0]
            proc_code = row[10]
            row_type = row[13]
            
            final_id = row_id
            if row_type in ['PROCEDURE', 'ODONTO_PROCEDURE'] and proc_code:
                 final_id = f"{row_id}_{proc_code}"
            elif row_type == 'COLLECTIVE_ACTIVITY':
                 pat_cns = row[5] or 'NOCNS'
                 final_id = f"{row_id}_{pat_cns}"
            elif row_type == 'HOME_VISIT':
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
                if self._post_to_api(payload, mun_config):
                    yield ('INFO', f"   -> Batch of {len(payload)} sent.", mun_id)
                else:
                    yield ('ERROR', "   -> Upload Failed.", mun_id)
                payload = []
        
        if payload:
            if self._post_to_api(payload, mun_config):
                yield ('INFO', f"   -> Final batch of {len(payload)} sent.", mun_id)
            else:
                 yield ('ERROR', "   -> Final Upload Failed.", mun_id)

    def _post_to_api(self, data, mun_config):
        url = DEFAULT_API_URL
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {mun_config.get('api_key')}",
            'X-Municipality-Id': mun_config.get('municipality_id')
        }
        try:
            res = requests.post(url, json={'records': data}, headers=headers, timeout=10)
            return res.status_code in [200, 201]
        except Exception:
            return False

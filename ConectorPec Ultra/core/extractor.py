import json
import requests
import datetime
import math
from database.connection import DatabaseConnection
from config.settings import config_manager

from queries.queries_atendimentos import QUERY_ATENDIMENTO_INDIVIDUAL
from queries.queries_atividade_coletiva import QUERY_ATIVIDADE_COLETIVA
from queries.queries_cadastros import QUERY_CIDADANIA_BASE, QUERY_CADASTRO_DOMICILIAR
from queries.queries_condicoes import QUERY_CONDICOES_CLINICAS, QUERY_ANTECEDENTES_OBSTETRICOS
from queries.queries_imunizacao import QUERY_VACINAS_APLICADAS
from queries.queries_odontologia import QUERY_ATENDIMENTO_ODONTO
from queries.queries_procedimentos import QUERY_PROCEDIMENTOS_FATURADOS

class MunicipalityExtractor:
    def __init__(self, db_config):
        self.config = db_config
        self.municipality_id = self.config.get('municipio_id') or self.config.get('id')
        self.api_token = self.config.get('api_token')
        # API dedicada solicitada pelo usuário
        self.api_url = "https://southamerica-east1-probpa-025.cloudfunctions.net/ingestPecUltraData"
        self.db = DatabaseConnection(db_config)
        
        # Define queries a serem executadas
        self.queries_map = {
            "cidadania_base": QUERY_CIDADANIA_BASE,
            "cadastro_domiciliar": QUERY_CADASTRO_DOMICILIAR,
            "atendimento_individual": QUERY_ATENDIMENTO_INDIVIDUAL,
            "atividade_coletiva": QUERY_ATIVIDADE_COLETIVA,
            "condicoes_clinicas": QUERY_CONDICOES_CLINICAS,
            "antecedentes_obstetricos": QUERY_ANTECEDENTES_OBSTETRICOS,
            "vacinas_aplicadas": QUERY_VACINAS_APLICADAS,
            "atendimento_odonto": QUERY_ATENDIMENTO_ODONTO,
            "procedimentos_faturados": QUERY_PROCEDIMENTOS_FATURADOS
        }

    def _get_date_range(self):
        """
        Determina o data_inicio e data_fim com base nas configurações da conexão
        e da última sincronização bem-sucedida.
        """
        data_fim_dt = datetime.datetime.now()
        data_fim = int(data_fim_dt.strftime("%Y%m%d"))  # Formato do co_dim_tempo no PEC
        
        # Pega a última execução
        last_run_str = config_manager.get_municipality_last_run(self.config.get('id'))
        
        if last_run_str:
            # Incremental (desde a última execução)
            last_run_dt = datetime.datetime.fromisoformat(last_run_str)
            data_inicio = int(last_run_dt.strftime("%Y%m%d"))
            print(f"[EXTRACTOR] Extração Incremental: desde {last_run_dt.strftime('%d/%m/%Y %H:%M')}")
        else:
            # Carga Inicial
            tipo = self.config.get("extracao_tipo", "dias")
            if tipo == "dias":
                dias = int(self.config.get("extracao_dias", "30"))
                data_inicio_dt = data_fim_dt - datetime.timedelta(days=dias)
                data_inicio = int(data_inicio_dt.strftime("%Y%m%d"))
                print(f"[EXTRACTOR] Carga Inicial: Retroagindo {dias} dias ({data_inicio_dt.strftime('%d/%m/%Y')})")
            elif tipo == "quad":
                ano = self.config.get("extracao_ano", "2024")
                quad = self.config.get("extracao_quad", "Q1")
                # Q1: 01/01 a 30/04, Q2: 01/05 a 31/08, Q3: 01/09 a 31/12
                mes_inicio = "01" if quad == "Q1" else ("05" if quad == "Q2" else "09")
                data_inicio = int(f"{ano}{mes_inicio}01")
                print(f"[EXTRACTOR] Carga Inicial: Quadrimestre {quad}/{ano}")
            elif tipo == "custom":
                dt_ini_str = self.config.get("dt_ini", data_fim_dt.strftime("%Y-%m-%d"))
                data_inicio = int(dt_ini_str.replace("-", ""))
                
                # Respeitar dt_fim se definido, senão usa now()
                dt_fim_str = self.config.get("dt_fim", "")
                if dt_fim_str:
                    data_fim = int(dt_fim_str.replace("-", ""))
                print(f"[EXTRACTOR] Carga Inicial: Período personalizado de {dt_ini_str} até {dt_fim_str or 'hoje'}")

        return data_inicio, data_fim

    def _chunk_list(self, lst, chunk_size):
        for i in range(0, len(lst), chunk_size):
            yield lst[i:i + chunk_size]

    def run_extraction(self):
        """
        Executa o fluxo de extração principal para este município.
        """
        print(f"\\n[EXTRACTOR] >>> Iniciando sincronização do banco: {self.config.get('db_name')} ({self.config.get('db_host')})")
        
        try:
            data_inicio, data_fim = self._get_date_range()
            params = {
                "data_inicio": data_inicio,
                "data_fim": data_fim
            }
            
            headers = {
                "X-Api-Key": self.api_token,
                "X-Municipality-Id": self.municipality_id,
                "Content-Type": "application/json"
            }
            
            sucesso_total = True

            for nome_query, sql in self.queries_map.items():
                print(f"[EXTRACTOR] Executando extração: {nome_query}...")
                
                try:
                    if hasattr(self, 'cancel_event') and self.cancel_event and self.cancel_event.is_set():
                        print("[EXTRACTOR] Execução interrompida, pulando restante...")
                        sucesso_total = False
                        break
                        
                    # Somente passa os parâmetros se a query os contiver
                    query_params = params if "%(data_inicio)s" in sql else None
                    df = self.db.execute_query_df(sql, params=query_params)
                    
                    if df is None or df.empty:
                        print(f"[EXTRACTOR] -> {nome_query}: 0 registros encontrados.")
                        continue
                        
                    # Converter tudo que é data/datetime/timestamp para string (ISO)
                    for col in df.select_dtypes(include=['datetime64', 'datetimetz']).columns:
                        df[col] = df[col].astype(str)
                        
                    # Opecional: lidar com NaN, NaT, None substituindo por string vazia ou None pythonic
                    # Mas o Pandas fillna com string vazia resolve a maior parte para JSON
                    df = df.fillna(value="")
                    
                    # Garantir que NaN floats que não foram pegos pelo fillna não quebrem o JSON
                    df = df.replace({math.nan: None})

                    payload_data = df.to_dict(orient='records')
                    print(f"[EXTRACTOR] -> {nome_query}: {len(payload_data)} registros extraídos. Enviando para a nuvem...")
                    
                    # Envio em lotes (batch) para não estourar payload da API
                    BATCH_SIZE = 500
                    total_batches = math.ceil(len(payload_data) / BATCH_SIZE)
                    for idx, chunk in enumerate(self._chunk_list(payload_data, BATCH_SIZE), 1):
                        if hasattr(self, 'cancel_event') and self.cancel_event and self.cancel_event.is_set():
                            print("[EXTRACTOR] Extração interrompida pelo usuário.")
                            sucesso_total = False
                            break
                            
                        print(f"[EXTRACTOR]    -> Enviando lote {idx}/{total_batches} ({len(chunk)} registros)...", flush=True)
                        payload = {
                            "collection": nome_query,
                            "data": chunk,
                            "municipio_id": self.municipality_id
                        }
                        
                        try:
                            payload_str = json.dumps(payload, default=str)
                            response = requests.post(self.api_url, data=payload_str, headers=headers, timeout=60)
                            if response.status_code not in [200, 201]:
                                print(f"[EXTRACTOR] -> Erro na API ({response.status_code}): {response.text}")
                                sucesso_total = False
                        except Exception as req_e:
                            print(f"[EXTRACTOR] -> Falha na requisição web: {req_e}")
                            sucesso_total = False

                except Exception as q_err:
                    print(f"[EXTRACTOR] Erro ao executar query {nome_query}: {q_err}")
                    sucesso_total = False
            
            if sucesso_total:
                # Atualiza a data da última execução com sucesso
                agora = datetime.datetime.now().isoformat()
                config_manager.set_municipality_last_run(self.config.get('id'), agora)
                print(f"[EXTRACTOR] <<< Sincronização concluída com sucesso para {self.municipality_id}!")
            else:
                print(f"[EXTRACTOR] <<< Sincronização finalizada com avisos/erros para {self.municipality_id}.")
                
            return sucesso_total

        except Exception as e:
            print(f"[EXTRACTOR] Falha grave na extração: {e}")
            return False
        finally:
            self.db.close()

import json
import requests
from database.connection import DatabaseConnection
from queries.queries_cadastros import QUERY_CIDADANIA_BASE

class MunicipalityExtractor:
    def __init__(self, db_config):
        self.config = db_config
        self.municipality_id = self.config.get('id')
        self.api_token = self.config.get('api_token')
        # Placeholder for the actual API URL. You can make this configurable later.
        self.api_url = "https://probpa.com.br/api/v1/sync"
        self.db = DatabaseConnection(db_config)

    def run_extraction(self):
        """
        Executa o fluxo de extração principal para este município.
        """
        print(f"[EXTRACTOR] Iniciando extração para o banco: {self.config.get('db_host')}:{self.config.get('db_name')}")
        try:
            # 1. Executa uma query de teste (Cadastro Base) com LIMIT para validar o fluxo
            query_teste = QUERY_CIDADANIA_BASE + " LIMIT 100"
            df_cidadania = self.db.execute_query_df(query_teste)
            
            # Formata datas, se existirem (para serialização JSON)
            if 'data_nascimento' in df_cidadania.columns:
                df_cidadania['data_nascimento'] = df_cidadania['data_nascimento'].astype(str)

            # 2. Converte para lista de dicionários
            payload_data = df_cidadania.to_dict(orient='records')
            print(f"[EXTRACTOR] [{self.config.get('db_host')}] {len(payload_data)} registros extraídos. Preparando envio...")
            
            # 3. Prepara o Payload da requisição
            payload = {
                "tipo_dado": "cidadania_base",
                "registros": payload_data
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }
            
            # 4. Envia via POST (Simulado com try-except para não quebrar caso a API não exista)
            try:
                # endpoint = f"{self.api_url}/cidadania"
                # response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
                # print(f"[EXTRACTOR] [{self.config.get('db_host')}] Resposta da API: {response.status_code}")
                print(f"[EXTRACTOR] [{self.config.get('db_host')}] [MOCK] Envio para a API concluído com sucesso (Payload com {len(payload_data)} itens).")
            except Exception as req_e:
                print(f"[EXTRACTOR] [{self.config.get('db_host')}] Erro na requisição web: {req_e}")
                
            return True
        except Exception as e:
            print(f"[EXTRACTOR] [{self.config.get('db_host')}] Falha grave na extração: {e}")
            return False
        finally:
            self.db.close()

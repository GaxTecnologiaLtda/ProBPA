import psycopg2
import pandas as pd
import time
from config.settings import config_manager

class DatabaseConnection:
    def __init__(self):
        self.config = config_manager.load_config()
        self.connection = None

    def get_connection(self, retries=3, delay=2):
        for attempt in range(retries):
            try:
                if self.connection and not self.connection.closed:
                    return self.connection
                    
                self.connection = psycopg2.connect(
                    host=self.config.get("db_host", "localhost"),
                    port=self.config.get("db_port", "5432"),
                    dbname=self.config.get("db_name", "esus"),
                    user=self.config.get("db_user", "postgres"),
                    password=self.config.get("db_password", "")
                )
                return self.connection
            except Exception as e:
                print(f"Erro ao conectar ao PostgreSQL (Tentativa {attempt+1}/{retries}): {e}")
                if attempt < retries - 1:
                    time.sleep(delay)
                else:
                    raise Exception("Falha na conexão com o banco local do e-SUS PEC após várias tentativas.")

    def execute_query_df(self, query, params=None):
        """
        Executa uma query no banco de dados local e retorna um Pandas DataFrame.
        Ideal para as consultas pesadas de consolidação de faturamento.
        """
        conn = self.get_connection()
        try:
            df = pd.read_sql_query(query, conn, params=params)
            return df
        except Exception as e:
            print(f"Erro ao executar query: {e}")
            # Em caso de erro de conexão quebrada, tenta re-estabelecer e tentar novamente
            if conn.closed:
                conn = self.get_connection()
                return pd.read_sql_query(query, conn, params=params)
            raise

    def close(self):
        if self.connection and not self.connection.closed:
            self.connection.close()

db = DatabaseConnection()

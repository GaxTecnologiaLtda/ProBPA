import psycopg2
import pandas as pd
import time

class DatabaseConnection:
    def __init__(self, db_config):
        """
        Recebe um dicionário com a configuração do banco de dados de um município.
        Ex: {'db_host': '...', 'db_port': '5432', 'db_name': 'esus', 'db_user': '...', 'db_password': '...'}
        """
        self.config = db_config
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
                print(f"Erro ao conectar ao PostgreSQL {self.config.get('db_host')} (Tentativa {attempt+1}/{retries}): {e}")
                if attempt < retries - 1:
                    time.sleep(delay)
                else:
                    raise Exception(f"Falha na conexão com o banco local do e-SUS PEC ({self.config.get('db_host')}) após várias tentativas.")

    def execute_query_df(self, query, params=None):
        """
        Executa uma query no banco de dados local e retorna um Pandas DataFrame.
        """
        conn = self.get_connection()
        try:
            df = pd.read_sql_query(query, conn, params=params)
            return df
        except Exception as e:
            print(f"Erro ao executar query no host {self.config.get('db_host')}: {e}")
            if conn.closed:
                conn = self.get_connection()
                return pd.read_sql_query(query, conn, params=params)
            raise

    def close(self):
        if self.connection and not self.connection.closed:
            self.connection.close()

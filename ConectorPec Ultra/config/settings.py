import os
import json
import uuid
from pathlib import Path
from cryptography.fernet import Fernet

class ConfigManager:
    def __init__(self, app_name="ProBPA_Conector_Ultra"):
        self.config_dir = Path.home() / f".{app_name}"
        self.config_file = self.config_dir / "settings.json"
        self.key_file = self.config_dir / ".key"
        self._ensure_dir()
        self._load_key()
        self.config_cache = None

    def _ensure_dir(self):
        if not self.config_dir.exists():
            self.config_dir.mkdir(parents=True)

    def _load_key(self):
        if self.key_file.exists():
            with open(self.key_file, "rb") as f:
                self.cipher_key = f.read()
        else:
            self.cipher_key = Fernet.generate_key()
            with open(self.key_file, "wb") as f:
                f.write(self.cipher_key)
        self.cipher = Fernet(self.cipher_key)

    def save_connections(self, connections_list):
        """
        Recebe uma lista de dicionários, cada um representando uma conexão/município.
        Encripta os dados sensíveis e salva.
        """
        secure_connections = []
        for conn in connections_list:
            secure_conn = conn.copy()
            # Garante um ID único se não tiver
            if 'id' not in secure_conn or not secure_conn['id']:
                secure_conn['id'] = str(uuid.uuid4())
                
            for field in ['db_password', 'api_token']:
                if field in secure_conn and secure_conn[field]:
                    secure_conn[field] = self.cipher.encrypt(secure_conn[field].encode()).decode()
            secure_connections.append(secure_conn)
            
        data_to_save = {
            "connections": secure_connections
        }
        
        with open(self.config_file, "w") as f:
            json.dump(data_to_save, f, indent=4)
        
        self.config_cache = connections_list

    def load_connections(self):
        """
        Carrega as conexões do arquivo e descriptografa as senhas/tokens.
        Retorna uma lista de dicionários.
        """
        if self.config_cache is not None:
            return self.config_cache
            
        if not self.config_file.exists():
            return []
            
        try:
            with open(self.config_file, "r") as f:
                data = json.load(f)
                
            # Tratamento caso o arquivo seja do modelo antigo (1 município solto)
            if "connections" not in data:
                # Opcional: ignorar formato antigo em fase de testes (retornar lista vazia)
                # Como conversado, para testes não precisamos converter
                self.config_cache = []
                return []
                
            connections = data.get("connections", [])
            
            # Descriptografa campos sensíveis
            for conn in connections:
                # Garante que tenha ID
                if 'id' not in conn:
                    conn['id'] = str(uuid.uuid4())
                    
                for field in ['db_password', 'api_token']:
                    if field in conn and conn[field]:
                        try:
                            conn[field] = self.cipher.decrypt(conn[field].encode()).decode()
                        except:
                            pass # Falha ao descriptografar
            
            self.config_cache = connections
            return connections
        except Exception as e:
            print(f"Erro ao carregar configurações: {e}")
            return []

# Singleton instance
config_manager = ConfigManager()

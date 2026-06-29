import os
import json
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

    def save_config(self, config_dict):
        # Criptografa campos sensíveis
        secure_config = config_dict.copy()
        for field in ['db_password', 'api_token']:
            if field in secure_config and secure_config[field]:
                secure_config[field] = self.cipher.encrypt(secure_config[field].encode()).decode()
        
        with open(self.config_file, "w") as f:
            json.dump(secure_config, f, indent=4)
        self.config_cache = config_dict

    def load_config(self):
        if self.config_cache:
            return self.config_cache
            
        if not self.config_file.exists():
            return {}
            
        try:
            with open(self.config_file, "r") as f:
                config = json.load(f)
                
            # Descriptografa campos sensíveis
            for field in ['db_password', 'api_token']:
                if field in config and config[field]:
                    try:
                        config[field] = self.cipher.decrypt(config[field].encode()).decode()
                    except:
                        pass # Falha ao descriptografar
            
            self.config_cache = config
            return config
        except Exception as e:
            print(f"Erro ao carregar configurações: {e}")
            return {}

# Singleton instance
config_manager = ConfigManager()

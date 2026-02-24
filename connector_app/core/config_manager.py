import os
import json
from pathlib import Path
from cryptography.fernet import Fernet

class ConfigManager:
    def __init__(self, app_name="ProBPA_Connector"):
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

    def is_configured(self):
        """Check if valid configuration exists."""
        if not self.config_file.exists():
            return False
        config = self._load_config_internal()
        return config is not None

    def toggle_autostart(self, enable: bool):
        """Add or remove app from Windows Startup (Registry)."""
        import sys
        import winreg
        
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        app_name = "ProBPA_Connector"
        exe_path = sys.executable 

        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_ALL_ACCESS)
            if enable:
                winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, f'"{exe_path}" --minimized')
            else:
                try:
                    winreg.DeleteValue(key, app_name)
                except FileNotFoundError:
                    pass
            winreg.CloseKey(key)
            return True
        except Exception as e:
            print(f"Registry Error: {e}")
            return False

    def get_global(self, key, default=None):
        if self.config_cache is None:
            self.config_cache = self._load_config_internal()
            
        if not self.config_cache:
            return default
            
        return self.config_cache.get("global_settings", {}).get(key, default)

    def get_municipalities(self):
        if self.config_cache is None:
            self.config_cache = self._load_config_internal()
            
        if not self.config_cache:
            return []
            
        return self.config_cache.get("municipalities", [])

    def save_global_config(self, admin_password="", scheduler_interval="15"):
        try:
            if self.config_cache is None:
                self.config_cache = self._load_config_internal()
                
            if self.config_cache is None:
                self.config_cache = {"global_settings": {}, "municipalities": []}
                
            self.config_cache["global_settings"]["admin_password"] = admin_password
            self.config_cache["global_settings"]["scheduler_interval"] = scheduler_interval
            
            self._save_cache_to_disk()
            self.toggle_autostart(True)
            return True
        except Exception as e:
            print(f"Error saving global config: {e}")
            return False

    def add_municipality(self, municipality_id, api_key, db_host, db_port, db_name, db_user, db_pass, municipality_name, **kwargs):
        try:
            if self.config_cache is None:
                self.config_cache = self._load_config_internal()
                
            if self.config_cache is None:
                self.config_cache = {"global_settings": {}, "municipalities": []}
                
            # Remove exact existing by ID if adding (overwrite behavior)
            muns = [m for m in self.config_cache.get("municipalities", []) if m.get("municipality_id") != municipality_id]
            
            new_mun = {
                "municipality_id": municipality_id,
                "municipality_name": municipality_name,
                "api_key": api_key,
                "db_host": db_host,
                "db_port": db_port,
                "db_name": db_name,
                "db_user": db_user,
                "db_pass": db_pass,
                "days_back": kwargs.get("days_back", 30),
                "scheduler_interval": kwargs.get("scheduler_interval", "1 hora"),
                "last_run_success": None
            }
            muns.append(new_mun)
            self.config_cache["municipalities"] = muns
            
            self._save_cache_to_disk()
            return True
        except Exception as e:
            print(f"Error saving municipality: {e}")
            return False

    def remove_municipality(self, municipality_id):
        try:
            if self.config_cache is None:
                self.config_cache = self._load_config_internal()
            if not self.config_cache: return False
            
            muns = self.config_cache.get("municipalities", [])
            muns = [m for m in muns if m.get("municipality_id") != municipality_id]
            self.config_cache["municipalities"] = muns
            self._save_cache_to_disk()
            return True
        except Exception as e:
            print(f"Error removing municipality: {e}")
            return False

    def set_municipality_last_run(self, municipality_id: str, timestamp_iso: str):
        if self.config_cache is None:
            self.config_cache = self._load_config_internal()
        if not self.config_cache: return
        
        muns = self.config_cache.get("municipalities", [])
        for m in muns:
            if m.get("municipality_id") == municipality_id:
                m["last_run_success"] = timestamp_iso
                break
                
        self.config_cache["municipalities"] = muns
        self._save_cache_to_disk()

    def _save_cache_to_disk(self):
        json_str = json.dumps(self.config_cache)
        encrypted_data = self.cipher.encrypt(json_str.encode())
        with open(self.config_file, "wb") as f:
            f.write(encrypted_data)

    def _load_config_internal(self):
        if not self.config_file.exists():
            return None
        try:
            with open(self.config_file, "rb") as f:
                encrypted_data = f.read()
            decrypted_data = self.cipher.decrypt(encrypted_data)
            data = json.loads(decrypted_data.decode())
            
            # --- SILENT MIGRATION TO CENTRALIZED MODEL ---
            if "municipalities" not in data:
                print("Running silent migration to Centralized Model...")
                migrated = {
                    "global_settings": {
                        "admin_password": data.get("admin_password", ""),
                        "scheduler_interval": data.get("scheduler_interval", "15")
                    },
                    "municipalities": []
                }
                if data.get("municipality_id"):
                    mun = {
                        "municipality_id": data.get("municipality_id"),
                        "municipality_name": data.get("municipality_name"),
                        "api_key": data.get("api_key"),
                        "db_host": data.get("db_host", "localhost"),
                        "db_port": data.get("db_port", "5432"),
                        "db_name": data.get("db_name", "esus"),
                        "db_user": data.get("db_user", "postgres"),
                        "db_pass": data.get("db_pass", "postgres"),
                        "days_back": data.get("days_back", 30),
                        "scheduler_interval": data.get("scheduler_interval", "1 hora"),
                        "last_run_success": data.get("last_run_success", None)
                    }
                    migrated["municipalities"].append(mun)
                
                self.config_cache = migrated
                self._save_cache_to_disk()
                return migrated
                
            return data
        except Exception as e:
            print(f"Error loading config: {e}")
            return None

    def clear_config(self):
        if self.config_file.exists():
            os.remove(self.config_file)
        self.config_cache = None

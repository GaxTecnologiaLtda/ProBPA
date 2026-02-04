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
        # Try loading to ensure it's not corrupted
        return self._load_config_internal() is not None

    
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
                # If running as python script, this might point to python.exe. 
                # In frozen mode (PyInstaller), sys.executable is the app exe.
                # Use quotes to handle spaces in path
                winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, f'"{exe_path}" --minimized')
            else:
                try:
                    winreg.DeleteValue(key, app_name)
                except FileNotFoundError:
                    pass # Already deleted
            winreg.CloseKey(key)
            return True
        except Exception as e:
            print(f"Registry Error: {e}")
            return False

    def save_config(self, municipality_id, api_key, 
                    db_host="localhost", db_port="5432", 
                    db_name="esus", db_user="postgres", db_pass="postgres",
                    municipality_name="", admin_password="", scheduler_interval="15"):
        """Save credentials encrypted."""
        try:
            data = {
                "municipality_id": municipality_id,
                "api_key": api_key,
                "db_host": db_host,
                "db_port": db_port,
                "db_name": db_name,
                "db_user": db_user,
                "db_pass": db_pass,
                "municipality_name": municipality_name,
                "admin_password": admin_password,
                "scheduler_interval": scheduler_interval
            }
            json_str = json.dumps(data)
            encrypted_data = self.cipher.encrypt(json_str.encode())
            
            with open(self.config_file, "wb") as f:
                f.write(encrypted_data)
            
            self.config_cache = data # Update cache
            
            # Auto-enable autostart on save for convenience
            self.toggle_autostart(True)
            
            return True
        except Exception as e:
            print(f"Error saving config: {e}")
            return False

    def get(self, key, default=None):
        """Retrieve a specific config value."""
        if self.config_cache is None:
            self.config_cache = self._load_config_internal()
        
        if self.config_cache is None:
            self._load_config_internal()
        return self.config_cache.get(key, default)

    def set_last_run_success(self, timestamp_iso: str):
        """Update the last successful run timestamp."""
        if self.config_cache is None:
            self._load_config_internal()
            if self.config_cache is None: self.config_cache = {}
            
        self.config_cache["last_run_success"] = timestamp_iso
        
        # Save back to file (encrypted)
        # We need to preserve all other keys, so we just re-encrypt the cache
        try:
            json_str = json.dumps(self.config_cache)
            encrypted_data = self.cipher.encrypt(json_str.encode())
            with open(self.config_file, "wb") as f:
                f.write(encrypted_data)
        except Exception as e:
            print(f"Error saving last run: {e}")

    def get_last_run_success(self) -> str:
        return self.get("last_run_success")

    def _load_config_internal(self):
        if not self.config_file.exists():
            return None
        try:
            with open(self.config_file, "rb") as f:
                encrypted_data = f.read()
            decrypted_data = self.cipher.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode())
        except Exception as e:
            print(f"Error loading config: {e}")
            return None

    def clear_config(self):
        """Delete configuration file."""
        if self.config_file.exists():
            os.remove(self.config_file)
        self.config_cache = None
        
    def load_config(self):
         # Legacy compatibility if needed, but 'get' is preferred
         return self._load_config_internal()

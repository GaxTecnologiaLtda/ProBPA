import json
import os
from datetime import datetime
from pathlib import Path

class HistoryManager:
    def __init__(self, app_name="ProBPA_Connector"):
        self.history_dir = Path.home() / f".{app_name}"
        self.history_file = self.history_dir / "history.json"
        
        if not self.history_dir.exists():
            self.history_dir.mkdir(parents=True)
            
        self._ensure_file()

    def _ensure_file(self):
        if not self.history_file.exists():
            with open(self.history_file, "w") as f:
                json.dump({}, f)

    def add_entry(self, municipality_id: str, status: str, message: str, records_count: int = 0):
        try:
            data = self._load_data()
            if municipality_id not in data:
                data[municipality_id] = []
                
            entries = data[municipality_id]
            
            new_entry = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": status, # "SUCCESS", "ERROR", "WARNING"
                "message": message,
                "records": records_count
            }
            
            # Prepend (newest first)
            entries.insert(0, new_entry)
            
            # Keep last 50 per municipality
            data[municipality_id] = entries[:50]
            
            with open(self.history_file, "w") as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            print(f"Failed to save history: {e}")

    def _load_data(self):
        if not self.history_file.exists():
            return {}
        try:
            with open(self.history_file, "r") as f:
                # Handle old format (list) migration implicitly if needed?
                data = json.load(f)
                if isinstance(data, list):
                    # Migration from single-tenant: assign all past history to a generic key and start fresh
                    return {"migrated_legacy": data}
                return data
        except:
            return {}

    def get_entries(self, municipality_id: str):
        data = self._load_data()
        return data.get(municipality_id, [])

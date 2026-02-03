import os
import sys
import json
import requests
import subprocess
import tempfile
import threading
from packaging import version
from version import __version__

# URL to the version.json file on Firebase Hosting
# TODO: Update with the actual deployed URL
VERSION_JSON_URL = "https://website-probpa.web.app/connector_version.json"

class Updater:
    def __init__(self):
        self.current_version = __version__
        self.latest_version_info = None

    def check_for_updates(self):
        """
        Checks if a newer version is available.
        Returns: (bool available, dict version_info)
        """
        try:
            print(f"[Updater] Checking for updates... Current: {self.current_version}")
            response = requests.get(VERSION_JSON_URL, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            remote_ver_str = data.get("version", "0.0.0")
            
            local_ver = version.parse(self.current_version)
            remote_ver = version.parse(remote_ver_str)
            
            if remote_ver > local_ver:
                print(f"[Updater] Update found: {remote_ver_str}")
                self.latest_version_info = data
                return True, data
            
            print("[Updater] No updates available.")
            return False, None
            
        except Exception as e:
            print(f"[Updater] Check failed: {e}")
            return False, None

    def download_and_install(self, url, progress_callback=None):
        """
        Downloads the installer and runs it silently.
        This runs in the MAIN THREAD usually, but should be called from a worker if UI update is needed.
        """
        try:
            print(f"[Updater] Downloading from {url}...")
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            # Create a temporary file for the installer
            fd, temp_path = tempfile.mkstemp(suffix=".exe")
            os.close(fd)
            
            with open(temp_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        # Optional: Callback for progress bar
                        if progress_callback and total_size > 0:
                            progress_callback(downloaded / total_size)
                            
            print(f"[Updater] Download complete: {temp_path}")
            print("[Updater] Launching installer and exiting...")

            # Launch Setup.exe
            # /VERYSILENT: No windows
            # /SUPPRESSMSGBOXES: No prompts
            # /NORESTART: Prevent auto-reboot
            subprocess.Popen([temp_path, "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART"])
            
            # Kill current app to allow overwrite
            sys.exit(0)
            
        except Exception as e:
            print(f"[Updater] Update failed: {e}")
            raise e

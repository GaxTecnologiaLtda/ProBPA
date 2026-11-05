import os
import sys
import json
import requests
import subprocess
import tempfile
import threading
from packaging import version
from version import __version__

# Primary SQL API manifest + Website Hosting fallback
VERSION_JSON_URLS = [
    "https://sql.probpa.com.br/connector/version",
    "https://website-probpa.web.app/connector_version.json"
]

class Updater:
    def __init__(self):
        self.current_version = __version__
        self.latest_version_info = None

    def check_for_updates(self):
        """
        Checks if a newer version is available across primary and fallback manifests.
        Returns: (bool available, dict version_info)
        """
        last_error = None
        for manifest_url in VERSION_JSON_URLS:
            try:
                print(f"[Updater] Checking {manifest_url}... Current: {self.current_version}")
                response = requests.get(manifest_url, timeout=10)
                response.raise_for_status()

                data = response.json()
                remote_ver_str = str(data.get("version", "0.0.0")).strip()
                download_url = data.get("url") or data.get("download_url")
                if download_url and not data.get("url"):
                    data["url"] = download_url

                local_ver = version.parse(self.current_version)
                remote_ver = version.parse(remote_ver_str)

                if remote_ver > local_ver and download_url:
                    print(f"[Updater] Update found: {remote_ver_str}")
                    self.latest_version_info = data
                    return True, data

                print("[Updater] No updates available.")
                return False, None
            except Exception as e:
                last_error = e
                print(f"[Updater] Manifest check failed on {manifest_url}: {e}")

        if last_error:
            print(f"[Updater] All manifest checks failed: {last_error}")
        return False, None

    def download_and_install(self, url, progress_callback=None):
        """
        Downloads the installer and runs it silently, preserving ~/.ProBPA_Connector/settings.json.
        """
        try:
            print(f"[Updater] Downloading from {url}...")
            response = requests.get(url, stream=True, timeout=60)
            response.raise_for_status()

            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0

            fd, temp_path = tempfile.mkstemp(suffix=".exe")
            os.close(fd)

            with open(temp_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if progress_callback and total_size > 0:
                            progress_callback(downloaded / total_size)

            print(f"[Updater] Download complete: {temp_path}")
            print("[Updater] Launching installer and exiting...")

            subprocess.Popen([temp_path, "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART"])
            os._exit(0)

        except Exception as e:
            print(f"[Updater] Update failed: {e}")
            raise e

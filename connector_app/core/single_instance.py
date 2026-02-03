import socket
import threading
import sys
import os

# Port for Single Instance Lock
# Using a high port number to avoid conflicts
LOCK_PORT = 65432
LOCK_HOST = '127.0.0.1'

class SingleInstance:
    def __init__(self, on_show_request=None):
        self.on_show_request = on_show_request
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.is_running = False

    def check(self):
        """
        Tries to bind to the lock port.
        Returns True if successful (we are the first instance).
        Returns False if port is in use (another instance is running).
        """
        try:
            self.sock.bind((LOCK_HOST, LOCK_PORT))
            self.sock.listen(1)
            self.is_running = True
            
            # Start listener thread for "SHOW" commands
            threading.Thread(target=self._listener_loop, daemon=True).start()
            return True
        except socket.error:
            return False

    def notify_existing(self):
        """
        Connects to the existing instance and sends a SHOW command.
        """
        try:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect((LOCK_HOST, LOCK_PORT))
            client.send(b'SHOW')
            client.close()
            print("Notified existing instance to show window.")
        except Exception as e:
            print(f"Failed to notify existing instance: {e}")

    def _listener_loop(self):
        while self.is_running:
            try:
                conn, addr = self.sock.accept()
                data = conn.recv(1024)
                if data == b'SHOW':
                    if self.on_show_request:
                        self.on_show_request()
                conn.close()
            except Exception as e:
                # Socket closed or error
                pass

    def cleanup(self):
        self.is_running = False
        try:
            self.sock.close()
        except:
            pass

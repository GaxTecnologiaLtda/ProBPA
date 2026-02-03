import customtkinter as ctk
import sys
import threading
from PIL import Image
import pystray
from pystray import MenuItem as item
from core.config_manager import ConfigManager
from core.single_instance import SingleInstance
from ui.screens.activation import ActivationScreen
from ui.screens.dashboard import DashboardScreen
from ui.screens.welcome import WelcomeScreen

import os

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("green")

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)

class MainWindow(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # --- SINGLE INSTANCE CHECK ---
        self.single_instance = SingleInstance(on_show_request=self.show_window_from_tray)
        if not self.single_instance.check():
            print("Another instance is running. Notifying and exiting.")
            self.single_instance.notify_existing()
            sys.exit(0)
            
        self.title("Conector ProBPA v3.2 (Background Service)")
        self.geometry("900x700")
        
        # Load Icon
        try:
            icon_path = resource_path("assets/icon.ico")
            self.iconbitmap(icon_path)
        except Exception as e:
            print(f"Window Icon Error: {e}")

        self.config_manager = ConfigManager()
        self.tray_icon = None

        # Check if minimized start requested
        self.start_minimized = "--minimized" in sys.argv

        # Setup Protocol
        self.protocol("WM_DELETE_WINDOW", self.hide_window)

        # Container
        self.container = ctk.CTkFrame(self)
        self.container.pack(fill="both", expand=True)

        if self.start_minimized:
            # If starting minimized (e.g. auto-start), skip welcome screen?
            # Or just show welcome screen but window is hidden?
            # Better to skip welcome screen logic if hidden, just go straight to dashboard
            self.check_initial_state(skip_welcome=True)
            self.withdraw()
        else:
            # Normal start -> Show Welcome
            self.check_initial_state(skip_welcome=False)
        
        # Start Tray in separate thread
        threading.Thread(target=self.setup_tray, daemon=True).start()

    def show_window_from_tray(self, icon=None, item=None):
        # Called by Tray click OR Single Instance Socket
        self.after(0, self.deiconify)
        self.after(0, self.lift)
        self.after(0, self.focus_force)

    def show_notification(self, title, message):
        if self.tray_icon:
            try:
                self.tray_icon.notify(message, title)
            except Exception as e:
                print(f"Notification Error: {e}")

        self.after(0, self.deiconify)
        self.after(0, self.lift)

    def hide_window(self):
        self.withdraw()
        # Ensure tray is running? It runs in background thread.

    def quit_app(self, icon, item):
        self.tray_icon.stop()
        self.quit()
        sys.exit()

    def check_initial_state(self):
        # Clear container
        for widget in self.container.winfo_children():
            widget.destroy()

        if self.config_manager.is_configured():
            DashboardScreen(self.container, self.check_initial_state, self.show_notification).pack(fill="both", expand=True)
        else:
            ActivationScreen(self.container, self.check_initial_state).pack(fill="both", expand=True)

def main():
    app = MainWindow()
    app.mainloop()

if __name__ == "__main__":
    main()

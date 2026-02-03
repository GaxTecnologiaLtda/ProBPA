import customtkinter as ctk
import time
import threading
from version import __version__

class WelcomeScreen(ctk.CTkFrame):
    def __init__(self, master, on_complete):
        super().__init__(master, fg_color="#0F172A") # Deep nice background
        self.on_complete = on_complete
        
        # Center Content
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self.grid_rowconfigure(4, weight=1)
        
        self.content_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.content_frame.grid(row=1, column=0, pady=20)
        
        # Logo / Title
        self.lbl_logo = ctk.CTkLabel(self.content_frame, text="Conector ProBPA", font=("Roboto", 40, "bold"), text_color="white")
        self.lbl_logo.pack(pady=(0, 10))
        
        self.lbl_version = ctk.CTkLabel(self.content_frame, text=f"v{__version__}", font=("Roboto", 16), text_color="gray")
        self.lbl_version.pack(pady=(0, 40))
        
        # Fake Loading Bar
        self.progress = ctk.CTkProgressBar(self.content_frame, width=400, height=8, progress_color="#10B981")
        self.progress.set(0)
        self.progress.pack(pady=20)
        
        self.lbl_status = ctk.CTkLabel(self.content_frame, text="Carregando módulos...", font=("Roboto", 12), text_color="gray")
        self.lbl_status.pack(pady=5)
        
        # Start Animation
        self.after(500, self.start_animation)

    def start_animation(self):
        threading.Thread(target=self._animate_loading, daemon=True).start()

    def _animate_loading(self):
        steps = [
            ("Inicializando core...", 0.2),
            ("Verificando banco de dados...", 0.45),
            ("Carregando configurações...", 0.7),
            ("Pronto!", 1.0)
        ]
        
        for text, val in steps:
            time.sleep(0.6) # Simulate work
            self.after(0, lambda t=text, v=val: self._update_ui(t, v))
            
        time.sleep(0.5)
        self.after(0, self.on_complete)

    def _update_ui(self, text, val):
        self.lbl_status.configure(text=text)
        self.progress.set(val)

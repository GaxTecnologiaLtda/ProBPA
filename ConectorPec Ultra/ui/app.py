import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox
import threading
from config.settings import config_manager
from core.updater import Updater
from core.version import __version__

# Configuração de Aparência
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class ProBPAConnectorApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.updater = Updater()
        self.title(f"ProBPA Conector Ultra v{__version__}")
        self.geometry("800x600")
        self.resizable(False, False)

        # Configurando Grid Principal
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # TabView Principal
        self.tab_view = ctk.CTkTabview(self)
        self.tab_view.grid(row=0, column=0, padx=20, pady=20, sticky="nsew")

        self.tab_config = self.tab_view.add("Configuração BD")
        self.tab_extracao = self.tab_view.add("Extração e Filtros")
        self.tab_logs = self.tab_view.add("Sincronização e Logs")

        self._build_config_tab()
        self._build_extracao_tab()
        self._build_logs_tab()
        
        self.load_settings()
        
        # Check for updates in background
        threading.Thread(target=self.check_for_updates, daemon=True).start()

    def check_for_updates(self):
        self.log_message(f"Verificando atualizações (Versão atual: {__version__})...")
        available, info = self.updater.check_for_updates()
        if available:
            self.log_message(f"Nova atualização disponível: {info.get('version')}")
            # Em uma implementação completa, você mostraria um popup aqui para o usuário decidir atualizar.
            # messagebox.showinfo("Atualização", f"Nova versão {info.get('version')} disponível!")
        else:
            self.log_message("Sistema atualizado.")

    def _build_config_tab(self):
        # Frame de credenciais do Banco
        frame = ctk.CTkFrame(self.tab_config)
        frame.pack(padx=20, pady=20, fill="both", expand=True)

        ctk.CTkLabel(frame, text="Configurações do Banco de Dados (e-SUS PEC)", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(20, 10))

        # Host e Porta
        row1 = ctk.CTkFrame(frame, fg_color="transparent")
        row1.pack(fill="x", padx=20, pady=5)
        self.entry_host = ctk.CTkEntry(row1, placeholder_text="Host (ex: localhost)", width=200)
        self.entry_host.pack(side="left", padx=(0, 10))
        self.entry_port = ctk.CTkEntry(row1, placeholder_text="Porta (ex: 5432)", width=100)
        self.entry_port.pack(side="left")

        # Database Name
        self.entry_db = ctk.CTkEntry(frame, placeholder_text="Nome do Banco (ex: esus)", width=310)
        self.entry_db.pack(padx=20, pady=5, anchor="w")

        # Usuário e Senha
        row2 = ctk.CTkFrame(frame, fg_color="transparent")
        row2.pack(fill="x", padx=20, pady=5)
        self.entry_user = ctk.CTkEntry(row2, placeholder_text="Usuário (ex: postgres)", width=150)
        self.entry_user.pack(side="left", padx=(0, 10))
        self.entry_pwd = ctk.CTkEntry(row2, placeholder_text="Senha", show="*", width=150)
        self.entry_pwd.pack(side="left")

        # Configurações de API Gax
        ctk.CTkLabel(frame, text="Credenciais da Nuvem (ProBPA API)", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(30, 10))
        self.entry_mun = ctk.CTkEntry(frame, placeholder_text="ID do Município (ex: aracaju_se)", width=310)
        self.entry_mun.pack(padx=20, pady=5, anchor="w")
        self.entry_token = ctk.CTkEntry(frame, placeholder_text="Token de Autenticação", show="*", width=310)
        self.entry_token.pack(padx=20, pady=5, anchor="w")

        btn_save = ctk.CTkButton(frame, text="Salvar Configurações", command=self.save_settings)
        btn_save.pack(pady=30)

    def _build_extracao_tab(self):
        frame = ctk.CTkFrame(self.tab_extracao)
        frame.pack(padx=20, pady=20, fill="both", expand=True)

        ctk.CTkLabel(frame, text="Período de Extração de Dados", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(20, 10))

        # Radio Buttons para Modo de Seleção
        self.radio_var = tk.IntVar(value=1)
        
        row_radios = ctk.CTkFrame(frame, fg_color="transparent")
        row_radios.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkRadioButton(row_radios, text="Por Quadrimestre (Recomendado)", variable=self.radio_var, value=1, command=self._toggle_extracao_mode).pack(side="left", padx=(0, 20))
        ctk.CTkRadioButton(row_radios, text="Período Personalizado", variable=self.radio_var, value=2, command=self._toggle_extracao_mode).pack(side="left")

        # Frame Quadrimestre
        self.frame_quad = ctk.CTkFrame(frame, fg_color="transparent")
        self.frame_quad.pack(fill="x", padx=20, pady=10)
        
        self.combo_ano = ctk.CTkComboBox(self.frame_quad, values=["2024", "2025", "2026", "2027"], width=100)
        self.combo_ano.pack(side="left", padx=(0, 10))
        
        self.combo_quad = ctk.CTkComboBox(self.frame_quad, values=["Q1 (Jan-Abr)", "Q2 (Mai-Ago)", "Q3 (Set-Dez)"], width=150)
        self.combo_quad.pack(side="left")

        # Frame Personalizado (Escondido inicialmente)
        self.frame_custom = ctk.CTkFrame(frame, fg_color="transparent")
        
        ctk.CTkLabel(self.frame_custom, text="Data Início (YYYY-MM-DD):").pack(side="left")
        self.entry_dt_ini = ctk.CTkEntry(self.frame_custom, width=120)
        self.entry_dt_ini.pack(side="left", padx=(5, 15))
        
        ctk.CTkLabel(self.frame_custom, text="Data Fim (YYYY-MM-DD):").pack(side="left")
        self.entry_dt_fim = ctk.CTkEntry(self.frame_custom, width=120)
        self.entry_dt_fim.pack(side="left", padx=(5, 0))

        # Agendamento
        ctk.CTkLabel(frame, text="Agendamento Automático", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(30, 10))
        row_sync = ctk.CTkFrame(frame, fg_color="transparent")
        row_sync.pack(fill="x", padx=20, pady=5)
        
        ctk.CTkLabel(row_sync, text="Sincronizar a cada:").pack(side="left", padx=(0,10))
        self.combo_sync = ctk.CTkComboBox(row_sync, values=["Desativado", "1 hora", "3 horas", "12 horas", "24 horas"], width=150)
        self.combo_sync.pack(side="left")

        # Start Button
        btn_start = ctk.CTkButton(frame, text="Iniciar Sincronização Agora", fg_color="green", hover_color="darkgreen", command=self.start_sync)
        btn_start.pack(pady=40)

    def _build_logs_tab(self):
        frame = ctk.CTkFrame(self.tab_logs)
        frame.pack(padx=20, pady=20, fill="both", expand=True)

        self.log_textbox = ctk.CTkTextbox(frame, width=700, height=400, state="disabled")
        self.log_textbox.pack(pady=10)
        
        self.log_message("Sistema Inicializado. Aguardando comandos...")

    def _toggle_extracao_mode(self):
        if self.radio_var.get() == 1:
            self.frame_custom.pack_forget()
            self.frame_quad.pack(fill="x", padx=20, pady=10)
        else:
            self.frame_quad.pack_forget()
            self.frame_custom.pack(fill="x", padx=20, pady=10)

    def log_message(self, message):
        self.log_textbox.configure(state="normal")
        self.log_textbox.insert("end", message + "\n")
        self.log_textbox.see("end")
        self.log_textbox.configure(state="disabled")

    def load_settings(self):
        config = config_manager.load_config()
        if not config:
            return
            
        self.entry_host.insert(0, config.get("db_host", ""))
        self.entry_port.insert(0, config.get("db_port", "5432"))
        self.entry_db.insert(0, config.get("db_name", "esus"))
        self.entry_user.insert(0, config.get("db_user", "postgres"))
        self.entry_pwd.insert(0, config.get("db_password", ""))
        self.entry_mun.insert(0, config.get("municipio_id", ""))
        self.entry_token.insert(0, config.get("api_token", ""))

    def save_settings(self):
        config = {
            "db_host": self.entry_host.get(),
            "db_port": self.entry_port.get(),
            "db_name": self.entry_db.get(),
            "db_user": self.entry_user.get(),
            "db_password": self.entry_pwd.get(),
            "municipio_id": self.entry_mun.get(),
            "api_token": self.entry_token.get()
        }
        config_manager.save_config(config)
        messagebox.showinfo("Sucesso", "Configurações salvas com sucesso!")
        self.log_message("Configurações atualizadas.")

    def start_sync(self):
        self.tab_view.set("Sincronização e Logs")
        self.log_message("Iniciando processo de sincronização...")
        
        if self.radio_var.get() == 1:
            ano = self.combo_ano.get()
            quad = self.combo_quad.get()
            self.log_message(f"Modo: Quadrimestral - {quad} de {ano}")
        else:
            dt_ini = self.entry_dt_ini.get()
            dt_fim = self.entry_dt_fim.get()
            self.log_message(f"Modo: Personalizado - De {dt_ini} a {dt_fim}")
            
        self.log_message("Conectando ao banco de dados e-SUS PEC local...")
        # TODO: Chamar rotina do engine_extractor.py em uma thread separada
        
if __name__ == "__main__":
    app = ProBPAConnectorApp()
    app.mainloop()

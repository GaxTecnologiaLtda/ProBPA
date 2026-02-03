import customtkinter as ctk
import threading
import time
from datetime import datetime
from core.config_manager import ConfigManager
from core.engine import PecConnectorEngine
from core.history_manager import HistoryManager

class DashboardScreen(ctk.CTkFrame):
    def __init__(self, master, on_reset, notify_callback=None):
        super().__init__(master)
        self.on_reset = on_reset
        self.notify_callback = notify_callback
        self.config_manager = ConfigManager()
        self.history_manager = HistoryManager()
        self.engine = PecConnectorEngine(self.config_manager)
        
        self.is_running = False
        self.next_run_time = None
        self.last_run_time = None

        # --- LAYOUT ---
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Header
        self.header_frame = ctk.CTkFrame(self, height=60, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, sticky="ew", padx=20, pady=10)
        
        self.lbl_title = ctk.CTkLabel(self.header_frame, text="Conector ProBPA v3.2", font=("Roboto", 20, "bold"))
        self.lbl_title.pack(side="left")
        
        mun_name = self.config_manager.get("municipality_name", "Desconhecido")
        self.lbl_mun = ctk.CTkLabel(self.header_frame, text=f"{mun_name} ({self.config_manager.get('municipality_id')})", font=("Roboto", 16), text_color="gray")
        self.lbl_mun.pack(side="left", padx=10)

        # Tabs
        self.tabview = ctk.CTkTabview(self)
        self.tabview.grid(row=1, column=0, sticky="nsew", padx=20, pady=10)
        
        self.tab_status = self.tabview.add("Status & Execução")
        self.tab_history = self.tabview.add("Histórico")
        self.tab_config = self.tabview.add("Configuração (Admin)")

        self._setup_status_tab()
        self._setup_history_tab()
        self._setup_config_tab()

        # SCHEDULER
        self.stop_event = threading.Event()
        threading.Thread(target=self.scheduler_loop, daemon=True).start()

    def _setup_status_tab(self):
        self.tab_status.grid_columnconfigure(0, weight=1)
        
        # Big Status Badge
        self.lbl_big_status = ctk.CTkLabel(self.tab_status, text="AGUARDANDO", font=("Roboto", 32, "bold"), text_color="gray")
        self.lbl_big_status.pack(pady=40)

        self.lbl_timer = ctk.CTkLabel(self.tab_status, text="Próxima execução em: --:--")
        self.lbl_timer.pack(pady=10)

        self.btn_run_now = ctk.CTkButton(self.tab_status, text="EXECUTAR AGORA", command=self.start_extraction_thread, width=200, height=50, fg_color="#2962FF")
        self.btn_run_now.pack(pady=20)
        
        # Live Log Box
        self.log_box = ctk.CTkTextbox(self.tab_status, height=200, state="disabled")
        self.log_box.pack(fill="both", expand=True, padx=10, pady=10)

    def _setup_history_tab(self):
        self.tab_history.grid_columnconfigure(0, weight=1)
        self.tab_history.grid_rowconfigure(1, weight=1)
        
        btn_refresh = ctk.CTkButton(self.tab_history, text="Atualizar Lista", command=self.refresh_history, height=30)
        btn_refresh.grid(row=0, column=0, pady=10, sticky="e", padx=10)

        self.history_text = ctk.CTkTextbox(self.tab_history, state="disabled")
        self.history_text.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        self.refresh_history()

    def _setup_config_tab(self):
        # Locked UI
        self.tab_config.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(self.tab_config, text="Área Restrita", font=("Roboto", 20, "bold")).pack(pady=30)
        ctk.CTkLabel(self.tab_config, text="Ações de configuração exigem senha de administrador.", text_color="gray").pack()

        self.btn_change_db = ctk.CTkButton(self.tab_config, text="Configurações de Banco", command=lambda: self.request_admin_action("edit_db"), fg_color="gray")
        self.btn_change_db.pack(pady=10)

        self.btn_check_update = ctk.CTkButton(self.tab_config, text="Verificar Atualizações", command=self.check_for_updates, fg_color="#00897B")
        self.btn_check_update.pack(pady=10)

        self.btn_reset = ctk.CTkButton(self.tab_config, text="Desvincular (Reset Completo)", command=lambda: self.request_admin_action("reset"), fg_color="red")
        self.btn_reset.pack(pady=20)

    # --- LOGIC ---
    
    def log(self, message):
        self.log_box.configure(state="normal")
        ts = datetime.now().strftime("%H:%M:%S")
        self.log_box.insert("end", f"[{ts}] {message}\n")
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def scheduler_loop(self):
        while not self.stop_event.is_set():
            try:
                interval_str = self.config_manager.get("scheduler_interval", "15")
                
                if interval_str == "Manual Only" or not interval_str.isdigit():
                    self.lbl_timer.configure(text="Agendamento: Manual")
                    time.sleep(10)
                    continue

                interval_min = int(interval_str)
                now = datetime.now()

                if self.last_run_time:
                    delta = now - self.last_run_time
                    minutes_since = delta.total_seconds() / 60
                    remaining = interval_min - minutes_since
                    
                    if remaining <= 0 and not self.is_running:
                        self.start_extraction_thread()
                    elif remaining > 0:
                        self.lbl_timer.configure(text=f"Próxima execução em: {int(remaining)} min")
                else:
                    # First run? Maybe wait or run immediately? Let's run immediately on startup if configured
                    if not self.is_running: 
                         # Delay slightly to let UI render
                         time.sleep(5)
                         self.start_extraction_thread()

            except Exception as e:
                print(f"Scheduler Error: {e}")
            
            time.sleep(60) # Check every minute

    def start_extraction_thread(self):
        if self.is_running: return
        self.is_running = True
        self.btn_run_now.configure(state="disabled")
        self.lbl_big_status.configure(text="EXECUTANDO...", text_color="yellow")
        
        threading.Thread(target=self.run_process, daemon=True).start()

    def run_process(self):
        records_processed = 0
        final_status = "ERROR"
        
        try:
            self.log(">>> Iniciando Ciclo de Extração <<<")
            success = True
            
            for status_type, message in self.engine.extract_and_send():
                self.after(0, self.log, f"[{status_type}] {message}")
                if "Found" in message and "records" in message:
                     # Attempt to parse simple count logic if needed, or Engine yields it
                     pass
                if status_type == 'ERROR':
                    success = False
            
            final_status = "SUCCESS" if success else "ERROR" # Simplified logic
            if success:
                 self.after(0, lambda: self.lbl_big_status.configure(text="ONLINE (AGUARDANDO)", text_color="green"))
                 if self.notify_callback:
                    self.notify_callback("Conector ProBPA", "Extração realizada com sucesso!")
            else:
                 self.after(0, lambda: self.lbl_big_status.configure(text="ERRO NA EXTRAÇÃO", text_color="red"))
                 if self.notify_callback:
                    self.notify_callback("Conector ProBPA", "Erro durante a extração. Verifique o app.")

        except Exception as e:
            self.after(0, self.log, f"CRITICAL: {e}")
            self.after(0, lambda: self.lbl_big_status.configure(text="FALHA CRÍTICA", text_color="red"))
        finally:
            self.is_running = False
            self.last_run_time = datetime.now()
            self.history_manager.add_entry(final_status, "Ciclo finalizado", records_processed)
            self.after(0, lambda: self.btn_run_now.configure(state="normal"))
            self.after(0, self.refresh_history)

    def refresh_history(self):
        entries = self.history_manager.get_entries()
        self.history_text.configure(state="normal")
        self.history_text.delete("1.0", "end")
        
        header = f"{'DATA':<20} | {'STATUS':<10} | {'MSG'}\n"
        self.history_text.insert("end", header)
        self.history_text.insert("end", "-"*60 + "\n")
        
        for e in entries:
            # Simple text table
            line = f"{e['timestamp']:<20} | {e['status']:<10} | {e['message']}\n"
            self.history_text.insert("end", line)
            
        self.history_text.configure(state="disabled")

    def request_admin_action(self, action_type):
        dialog = ctk.CTkInputDialog(text="Digite a Senha de Administrador:", title="Autenticação")
        pwd = dialog.get_input()
        
        real_pass = self.config_manager.get("admin_password")
        
        if pwd == real_pass:
            if action_type == "reset":
                self.config_manager.clear_config()
                self.on_reset()
            elif action_type == "edit_db":
                # Ideal would be to open a settings dialog.
                # For MVP v3.1, let's just say "Reset to edit" or maybe simple popup
                # Actually, simplest is to Reset logic to allow full reconfig on Activation Screen
                self.config_manager.clear_config()
                self.on_reset() 
        else:
            self.log("Tentativa de acesso não autorizado nas configs.")

    # --- UPDATE LOGIC ---
    def check_for_updates(self):
        self.btn_check_update.configure(state="disabled", text="Verificando...")
        self.log("Verificando atualizações online...")
        
        # Run check in background to avoid freezing UI
        threading.Thread(target=self._run_update_check, daemon=True).start()

    def _run_update_check(self):
        try:
            from core.updater import Updater
            updater = Updater()
            available, info = updater.check_for_updates()
            
            if available:
                version = info.get("version")
                notes = info.get("notes", "")
                url = info.get("url")
                
                self.after(0, self.log, f"Nova versão encontrada: {version}")
                self.after(0, lambda: self._prompt_update(version, notes, url, updater))
            else:
                self.after(0, self.log, "Você já está na versão mais recente.")
                self.after(0, lambda: self.btn_check_update.configure(state="normal", text="Verificar Atualizações"))
                if self.notify_callback:
                    self.notify_callback("Atualização", "Sistema atualizado!")
                    
        except Exception as e:
            self.after(0, self.log, f"Erro ao verificar updates: {e}")
            self.after(0, lambda: self.btn_check_update.configure(state="normal", text="Verificar Atualizações"))

    def _prompt_update(self, version, notes, url, updater):
        # Create a simple top-level dialog since CTk doesn't have a native Yes/No MsgBox easily accessible without external libs sometimes
        # Or better, just use a Toplevel window
        
        dialog = ctk.CTkToplevel(self)
        dialog.title("Atualização Disponível")
        dialog.geometry("400x250")
        dialog.attributes("-topmost", True)
        
        ctk.CTkLabel(dialog, text=f"Nova Versão Disponível: v{version}", font=("Roboto", 16, "bold")).pack(pady=20)
        ctk.CTkLabel(dialog, text=f"Notas: {notes}", wraplength=350).pack(pady=10)
        
        def on_yes():
            dialog.destroy()
            self._start_download(url, updater)
            
        def on_no():
            dialog.destroy()
            self.btn_check_update.configure(state="normal", text="Verificar Atualizações")

        btn_frame = ctk.CTkFrame(dialog, fg_color="transparent")
        btn_frame.pack(pady=20)
        
        ctk.CTkButton(btn_frame, text="Atualizar Agora", command=on_yes, fg_color="green").pack(side="left", padx=10)
        ctk.CTkButton(btn_frame, text="Cancelar", command=on_no, fg_color="red").pack(side="left", padx=10)

    def _start_download(self, url, updater):
        self.log("Iniciando download da atualização...")
        self.btn_check_update.configure(text="Baixando...")
        
        def download_task():
            try:
                # Progress callback could be added here
                updater.download_and_install(url)
                # The app will exit inside download_and_install
            except Exception as e:
                self.after(0, self.log, f"Erro no download: {e}")
                self.after(0, lambda: self.btn_check_update.configure(state="normal", text="Verificar Atualizações"))

        threading.Thread(target=download_task, daemon=True).start()


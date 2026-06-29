import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox
import threading
import uuid
from config.settings import config_manager
from core.updater import Updater
from core.version import __version__

# Configuração de Aparência
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue") # Tom azul do ícone

class ProBPAConnectorApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.updater = Updater()
        self.title(f"ProBPA Conector Ultra v{__version__}")
        
        # Maximiza a tela por padrão
        self.after(0, lambda: self.state('zoomed'))
        
        try:
            self.iconbitmap("assets/icon.ico")
        except:
            pass

        # Configurando Grid Principal (2 colunas: Sidebar 0 e MainFrame 1)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        # Dados em memória
        self.connections = config_manager.load_connections()
        self.current_editing_id = None

        # --- SIDEBAR ---
        self.sidebar_frame = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(4, weight=1)

        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="Conector Ultra", font=ctk.CTkFont(size=20, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 30))

        self.btn_nav_home = ctk.CTkButton(self.sidebar_frame, corner_radius=0, height=40, border_spacing=10, text="Início",
                                           fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                           anchor="w", command=lambda: self.select_frame("home"))
        self.btn_nav_home.grid(row=1, column=0, sticky="ew")

        self.btn_nav_conns = ctk.CTkButton(self.sidebar_frame, corner_radius=0, height=40, border_spacing=10, text="Conexões",
                                            fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                            anchor="w", command=lambda: self.select_frame("conns"))
        self.btn_nav_conns.grid(row=2, column=0, sticky="ew")

        self.btn_nav_settings = ctk.CTkButton(self.sidebar_frame, corner_radius=0, height=40, border_spacing=10, text="Configurações",
                                               fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                               anchor="w", command=lambda: self.select_frame("settings"))
        self.btn_nav_settings.grid(row=3, column=0, sticky="ew")


        # --- MAIN FRAME ---
        self.main_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew")
        self.main_frame.grid_rowconfigure(0, weight=1)
        self.main_frame.grid_columnconfigure(0, weight=1)

        # Inicializando Telas (Frames Filhos)
        self.frames = {}
        self._build_home_frame()
        self._build_conns_frame()
        self._build_edit_conn_frame()
        self._build_settings_frame()

        # Seleciona Início por padrão
        self.select_frame("home")
        
        # Iniciar thread do updater
        threading.Thread(target=self.check_for_updates, daemon=True).start()

    def select_frame(self, name):
        # Destaca o botão selecionado na sidebar
        self.btn_nav_home.configure(fg_color=("gray75", "gray25") if name == "home" else "transparent")
        self.btn_nav_conns.configure(fg_color=("gray75", "gray25") if name in ["conns", "edit_conn"] else "transparent")
        self.btn_nav_settings.configure(fg_color=("gray75", "gray25") if name == "settings" else "transparent")

        # Mostra o frame correto
        for frame_name, frame in self.frames.items():
            if frame_name == name:
                frame.grid(row=0, column=0, sticky="nsew")
            else:
                frame.grid_forget()

        # Atualizações dinâmicas na mudança de tela
        if name == "conns":
            self._refresh_conns_list()

    def check_for_updates(self):
        self.log_message(f"Verificando atualizações (Versão atual: {__version__})...")
        available, info = self.updater.check_for_updates()
        if available:
            self.log_message(f"Nova atualização disponível: {info.get('version')}")
        else:
            self.log_message("Sistema atualizado. (Auto-Updater online)")

    def log_message(self, message):
        self.log_textbox.configure(state="normal")
        self.log_textbox.insert("end", message + "\n")
        self.log_textbox.see("end")
        self.log_textbox.configure(state="disabled")

    # ==========================================
    # TELA 1: INÍCIO (Logs e Sinc Global)
    # ==========================================
    def _build_home_frame(self):
        self.frames["home"] = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.frames["home"].grid_rowconfigure(1, weight=1)
        self.frames["home"].grid_columnconfigure(0, weight=1)

        header = ctk.CTkFrame(self.frames["home"], fg_color="transparent")
        header.grid(row=0, column=0, padx=20, pady=20, sticky="ew")
        
        ctk.CTkLabel(header, text="Painel Global de Sincronização", font=ctk.CTkFont(size=24, weight="bold")).pack(side="left")
        
        btn_sync_all = ctk.CTkButton(header, text="▶ Executar Todos", fg_color="green", hover_color="darkgreen", 
                                     command=lambda: self.start_sync("all"))
        btn_sync_all.pack(side="right")

        self.log_textbox = ctk.CTkTextbox(self.frames["home"], state="disabled", font=ctk.CTkFont(family="Consolas", size=13))
        self.log_textbox.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="nsew")

    # ==========================================
    # TELA 2: LISTAGEM DE CONEXÕES
    # ==========================================
    def _build_conns_frame(self):
        self.frames["conns"] = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.frames["conns"].grid_rowconfigure(1, weight=1)
        self.frames["conns"].grid_columnconfigure(0, weight=1)

        header = ctk.CTkFrame(self.frames["conns"], fg_color="transparent")
        header.grid(row=0, column=0, padx=20, pady=20, sticky="ew")

        ctk.CTkLabel(header, text="Municípios Configurados", font=ctk.CTkFont(size=24, weight="bold")).pack(side="left")

        btn_add = ctk.CTkButton(header, text="+ Adicionar Município", command=self._open_new_conn_form)
        btn_add.pack(side="right")

        self.scrollable_conns = ctk.CTkScrollableFrame(self.frames["conns"], fg_color="transparent")
        self.scrollable_conns.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="nsew")

    def _refresh_conns_list(self):
        # Limpa widgets atuais
        for widget in self.scrollable_conns.winfo_children():
            widget.destroy()

        if not self.connections:
            ctk.CTkLabel(self.scrollable_conns, text="Nenhum município cadastrado. Clique em Adicionar.").pack(pady=50)
            return

        for conn in self.connections:
            row = ctk.CTkFrame(self.scrollable_conns, fg_color=("gray85", "gray15"), corner_radius=8)
            row.pack(fill="x", pady=5, padx=5)

            mun_name = conn.get("municipio_id", "Sem ID")
            db_name = conn.get("db_name", "?")

            info_label = ctk.CTkLabel(row, text=f"📍 {mun_name} (BD: {db_name})", font=ctk.CTkFont(size=14, weight="bold"))
            info_label.pack(side="left", padx=20, pady=15)

            btn_sync = ctk.CTkButton(row, text="▶ Executar", width=80, fg_color="green", hover_color="darkgreen",
                                     command=lambda c=conn: self.start_sync(c["id"]))
            btn_sync.pack(side="right", padx=(10, 20), pady=15)

            btn_edit = ctk.CTkButton(row, text="✏️ Editar", width=80, fg_color="transparent", border_width=1,
                                     command=lambda c=conn: self._open_edit_conn_form(c))
            btn_edit.pack(side="right", padx=10, pady=15)

    # ==========================================
    # TELA 3: FORMULÁRIO DE CONEXÃO
    # ==========================================
    def _build_edit_conn_frame(self):
        self.frames["edit_conn"] = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        
        # Precisamos de um header com botão de voltar
        header = ctk.CTkFrame(self.frames["edit_conn"], fg_color="transparent")
        header.pack(fill="x", padx=20, pady=20)
        
        ctk.CTkButton(header, text="⬅ Voltar", width=60, fg_color="transparent", border_width=1,
                      command=lambda: self.select_frame("conns")).pack(side="left")
        self.lbl_form_title = ctk.CTkLabel(header, text="Editar Município", font=ctk.CTkFont(size=24, weight="bold"))
        self.lbl_form_title.pack(side="left", padx=20)

        # Form content
        form = ctk.CTkScrollableFrame(self.frames["edit_conn"], fg_color="transparent")
        form.pack(fill="both", expand=True, padx=20, pady=(0, 20))

        # DB
        ctk.CTkLabel(form, text="Banco de Dados (e-SUS PEC)", font=ctk.CTkFont(size=16, weight="bold")).pack(pady=(10, 5), anchor="w")
        self.e_host = ctk.CTkEntry(form, placeholder_text="Host", width=200); self.e_host.pack(pady=5, anchor="w")
        self.e_port = ctk.CTkEntry(form, placeholder_text="Porta", width=200); self.e_port.pack(pady=5, anchor="w")
        self.e_db = ctk.CTkEntry(form, placeholder_text="Database", width=200); self.e_db.pack(pady=5, anchor="w")
        self.e_user = ctk.CTkEntry(form, placeholder_text="User", width=200); self.e_user.pack(pady=5, anchor="w")
        self.e_pwd = ctk.CTkEntry(form, placeholder_text="Password", show="*", width=200); self.e_pwd.pack(pady=5, anchor="w")

        # API
        ctk.CTkLabel(form, text="Credenciais Nuvem (ProBPA)", font=ctk.CTkFont(size=16, weight="bold")).pack(pady=(20, 5), anchor="w")
        self.e_mun = ctk.CTkEntry(form, placeholder_text="ID do Município", width=300); self.e_mun.pack(pady=5, anchor="w")
        self.e_token = ctk.CTkEntry(form, placeholder_text="Token de Autenticação", show="*", width=300); self.e_token.pack(pady=5, anchor="w")

        # Filtros Extração
        ctk.CTkLabel(form, text="Filtros de Extração", font=ctk.CTkFont(size=16, weight="bold")).pack(pady=(20, 5), anchor="w")
        self.radio_var = tk.StringVar(value="quad")
        ctk.CTkRadioButton(form, text="Por Quadrimestre", variable=self.radio_var, value="quad").pack(pady=5, anchor="w")
        
        quad_frame = ctk.CTkFrame(form, fg_color="transparent")
        quad_frame.pack(fill="x", pady=5)
        self.e_ano = ctk.CTkComboBox(quad_frame, values=["2024", "2025", "2026", "2027"], width=100); self.e_ano.pack(side="left", padx=(0,10))
        self.e_quad = ctk.CTkComboBox(quad_frame, values=["Q1", "Q2", "Q3"], width=80); self.e_quad.pack(side="left")

        ctk.CTkRadioButton(form, text="Período Personalizado", variable=self.radio_var, value="custom").pack(pady=(10,5), anchor="w")
        custom_frame = ctk.CTkFrame(form, fg_color="transparent")
        custom_frame.pack(fill="x", pady=5)
        self.e_dtini = ctk.CTkEntry(custom_frame, placeholder_text="YYYY-MM-DD", width=120); self.e_dtini.pack(side="left", padx=(0,10))
        self.e_dtfim = ctk.CTkEntry(custom_frame, placeholder_text="YYYY-MM-DD", width=120); self.e_dtfim.pack(side="left")

        btn_save = ctk.CTkButton(form, text="Salvar Conexão", command=self._save_connection)
        btn_save.pack(pady=30, anchor="w")

    def _clear_form(self):
        for entry in [self.e_host, self.e_port, self.e_db, self.e_user, self.e_pwd, self.e_mun, self.e_token, self.e_dtini, self.e_dtfim]:
            entry.delete(0, 'end')

    def _open_new_conn_form(self):
        self.current_editing_id = None
        self.lbl_form_title.configure(text="Nova Conexão")
        self._clear_form()
        
        # Padrões
        self.e_host.insert(0, "localhost")
        self.e_port.insert(0, "5432")
        self.e_db.insert(0, "esus")
        self.e_user.insert(0, "postgres")
        
        self.select_frame("edit_conn")

    def _open_edit_conn_form(self, conn_dict):
        self.current_editing_id = conn_dict["id"]
        self.lbl_form_title.configure(text=f"Editar {conn_dict.get('municipio_id')}")
        self._clear_form()

        self.e_host.insert(0, conn_dict.get("db_host", ""))
        self.e_port.insert(0, conn_dict.get("db_port", ""))
        self.e_db.insert(0, conn_dict.get("db_name", ""))
        self.e_user.insert(0, conn_dict.get("db_user", ""))
        self.e_pwd.insert(0, conn_dict.get("db_password", ""))
        self.e_mun.insert(0, conn_dict.get("municipio_id", ""))
        self.e_token.insert(0, conn_dict.get("api_token", ""))
        
        tipo = conn_dict.get("extracao_tipo", "quad")
        self.radio_var.set(tipo)
        if tipo == "quad":
            self.e_ano.set(conn_dict.get("extracao_ano", "2024"))
            self.e_quad.set(conn_dict.get("extracao_quad", "Q1"))
        else:
            self.e_dtini.insert(0, conn_dict.get("dt_ini", ""))
            self.e_dtfim.insert(0, conn_dict.get("dt_fim", ""))

        self.select_frame("edit_conn")

    def _save_connection(self):
        conn_data = {
            "id": self.current_editing_id or str(uuid.uuid4()),
            "db_host": self.e_host.get(),
            "db_port": self.e_port.get(),
            "db_name": self.e_db.get(),
            "db_user": self.e_user.get(),
            "db_password": self.e_pwd.get(),
            "municipio_id": self.e_mun.get(),
            "api_token": self.e_token.get(),
            "extracao_tipo": self.radio_var.get(),
            "extracao_ano": self.e_ano.get(),
            "extracao_quad": self.e_quad.get(),
            "dt_ini": self.e_dtini.get(),
            "dt_fim": self.e_dtfim.get()
        }

        # Atualiza lista em memória
        if self.current_editing_id:
            for i, c in enumerate(self.connections):
                if c["id"] == self.current_editing_id:
                    self.connections[i] = conn_data
                    break
        else:
            self.connections.append(conn_data)

        # Salva no disco via Manager
        config_manager.save_connections(self.connections)
        messagebox.showinfo("Sucesso", "Município salvo com sucesso!")
        self.select_frame("conns")

    # ==========================================
    # TELA 4: CONFIGURAÇÕES
    # ==========================================
    def _build_settings_frame(self):
        self.frames["settings"] = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        
        header = ctk.CTkFrame(self.frames["settings"], fg_color="transparent")
        header.grid(row=0, column=0, padx=20, pady=20, sticky="ew")
        ctk.CTkLabel(header, text="Configurações do Sistema", font=ctk.CTkFont(size=24, weight="bold")).pack(side="left")

        ctk.CTkLabel(self.frames["settings"], text=f"Versão Instalada: v{__version__}", font=ctk.CTkFont(size=14)).grid(row=1, column=0, padx=20, pady=10, sticky="w")
        
        btn_update = ctk.CTkButton(self.frames["settings"], text="Verificar Atualizações Agora", 
                                   command=self._manual_update_check)
        btn_update.grid(row=2, column=0, padx=20, pady=20, sticky="w")

    def _manual_update_check(self):
        available, info = self.updater.check_for_updates()
        if available:
            messagebox.showinfo("Atualização", f"Nova versão {info.get('version')} disponível. O Updater será acionado.")
        else:
            messagebox.showinfo("Atualização", "O sistema já está na versão mais recente.")

    # ==========================================
    # EXECUÇÃO (Mocks provisórios para o Engine)
    # ==========================================
    def start_sync(self, target_id):
        self.select_frame("home")
        
        if target_id == "all":
            self.log_message(f"\n[SISTEMA] Iniciando extração de TODOS os {len(self.connections)} municípios configurados.")
            for c in self.connections:
                self.log_message(f" >> Na fila: {c.get('municipio_id')}")
        else:
            target = next((c for c in self.connections if c["id"] == target_id), None)
            if target:
                self.log_message(f"\n[SISTEMA] Iniciando extração EXCLUSIVA: {target.get('municipio_id')}")
        
        self.log_message("[MOTOR] Em breve o engine será acoplado aqui.")

if __name__ == "__main__":
    app = ProBPAConnectorApp()
    app.mainloop()

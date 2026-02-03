import customtkinter as ctk
from core.config_manager import ConfigManager

class ActivationScreen(ctk.CTkScrollableFrame):
    def __init__(self, master, on_success):
        super().__init__(master, width=700, height=500)
        self.on_success = on_success
        self.config_manager = ConfigManager()

        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        # Title
        self.label_title = ctk.CTkLabel(self, text="Configuração Inicial", font=("Roboto", 24, "bold"))
        self.label_title.grid(row=0, column=0, columnspan=2, pady=(20, 20))

        # --- SECTION 1: IDENTITY ---
        self.lbl_sec1 = ctk.CTkLabel(self, text="1. Identidade do Município", font=("Roboto", 16, "bold"), text_color="#00E676")
        self.lbl_sec1.grid(row=1, column=0, columnspan=2, sticky="w", padx=20, pady=(10, 5))

        self.entry_name = ctk.CTkEntry(self, placeholder_text="Nome do Município (Ex: Salvador)", width=300)
        self.entry_name.grid(row=2, column=0, padx=20, pady=5)

        self.entry_municipality_id = ctk.CTkEntry(self, placeholder_text="ID do Município (ProBPA)", width=300)
        self.entry_municipality_id.grid(row=2, column=1, padx=20, pady=5)

        # --- SECTION 2: AUTH & SECURITY ---
        self.lbl_sec2 = ctk.CTkLabel(self, text="2. Credenciais de Acesso", font=("Roboto", 16, "bold"), text_color="#00E676")
        self.lbl_sec2.grid(row=3, column=0, columnspan=2, sticky="w", padx=20, pady=(20, 5))

        self.entry_apikey = ctk.CTkEntry(self, placeholder_text="API Key (Fornecida no Painel)", width=300, show="*")
        self.entry_apikey.grid(row=4, column=0, padx=20, pady=5)

        self.entry_admin_pass = ctk.CTkEntry(self, placeholder_text="Senha de Admin (Para edições futuras)", width=300, show="*")
        self.entry_admin_pass.grid(row=4, column=1, padx=20, pady=5)
        
        # --- SECTION 3: AUTOMATION ---
        self.lbl_sec3 = ctk.CTkLabel(self, text="3. Automação", font=("Roboto", 16, "bold"), text_color="#00E676")
        self.lbl_sec3.grid(row=5, column=0, columnspan=2, sticky="w", padx=20, pady=(20, 5))

        self.lbl_interval = ctk.CTkLabel(self, text="Intervalo de Extração (Minutos):")
        self.lbl_interval.grid(row=6, column=0, padx=20, sticky="w")
        
        self.combo_interval = ctk.CTkComboBox(self, values=["15", "30", "60", "120", "Manual Only"], width=300)
        self.combo_interval.grid(row=7, column=0, padx=20, pady=5)
        self.combo_interval.set("15")

        # --- SECTION 4: DATABASE ---
        self.lbl_sec4 = ctk.CTkLabel(self, text="4. Banco de Dados Local (e-SUS)", font=("Roboto", 16, "bold"), text_color="#00E676")
        self.lbl_sec4.grid(row=8, column=0, columnspan=2, sticky="w", padx=20, pady=(20, 5))

        self.entry_host = ctk.CTkEntry(self, placeholder_text="Host (localhost)", width=300)
        self.entry_host.grid(row=9, column=0, padx=20, pady=5)
        self.entry_host.insert(0, "localhost")

        self.entry_port = ctk.CTkEntry(self, placeholder_text="Porta (5432 / 5433)", width=300)
        self.entry_port.grid(row=9, column=1, padx=20, pady=5)
        self.entry_port.insert(0, "5432")

        self.entry_dbname = ctk.CTkEntry(self, placeholder_text="Banco (esus)", width=300)
        self.entry_dbname.grid(row=10, column=0, padx=20, pady=5)
        self.entry_dbname.insert(0, "esus")

        self.entry_user = ctk.CTkEntry(self, placeholder_text="Usuário (postgres)", width=300)
        self.entry_user.grid(row=10, column=1, padx=20, pady=5)
        self.entry_user.insert(0, "postgres")

        self.entry_pass = ctk.CTkEntry(self, placeholder_text="Senha do Banco", width=300, show="*")
        self.entry_pass.grid(row=11, column=0, padx=20, pady=5)
        self.entry_pass.insert(0, "postgres")

        # --- ACTIONS ---
        self.label_status = ctk.CTkLabel(self, text="", text_color="yellow")
        self.label_status.grid(row=12, column=0, columnspan=2, pady=10)

        self.btn_activate = ctk.CTkButton(self, text="SALVAR E INICIAR 🚀", command=self.handle_activation, width=300, height=50, fg_color="#00C853", font=("Roboto", 16, "bold"))
        self.btn_activate.grid(row=13, column=0, columnspan=2, pady=30)

    def handle_activation(self):
        m_name = self.entry_name.get()
        m_id = self.entry_municipality_id.get()
        api_key = self.entry_apikey.get()
        admin_pass = self.entry_admin_pass.get()
        interval = self.combo_interval.get()
        
        # DB
        host = self.entry_host.get()
        port = self.entry_port.get()
        dbname = self.entry_dbname.get()
        user = self.entry_user.get()
        pwd = self.entry_pass.get()

        if not m_id or not api_key or not admin_pass or not m_name:
            self.label_status.configure(text="Preencha todos os campos obrigatórios (Nome, ID, API, Senha Admin)!", text_color="red")
            return

        self.label_status.configure(text="Validando e Salvando...", text_color="yellow")
        self.update()

        success = self.config_manager.save_config(
            municipality_id=m_id,
            api_key=api_key,
            db_host=host, db_port=port, db_name=dbname, db_user=user, db_pass=pwd,
            municipality_name=m_name,
            admin_password=admin_pass,
            scheduler_interval=interval
        )

        if success:
             self.label_status.configure(text="Configurado com Sucesso! Iniciando...", text_color="green")
             self.after(1500, self.on_success)
        else:
             self.label_status.configure(text="Erro ao salvar configurações", text_color="red")

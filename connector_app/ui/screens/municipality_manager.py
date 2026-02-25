import customtkinter as ctk

class MunicipalityManager(ctk.CTkToplevel):
    def __init__(self, master, config_manager, on_close=None):
        super().__init__(master)
        self.config_manager = config_manager
        self.on_close = on_close
        
        self.title("Gerenciamento de Municípios - Modo Centralizado")
        self.geometry("950x700")
        
        self.update_idletasks()
        x = (self.winfo_screenwidth() // 2) - (475)
        y = (self.winfo_screenheight() // 2) - (350)
        self.geometry(f"+{x}+{y}")
        self.attributes("-topmost", True)
        
        self.protocol("WM_DELETE_WINDOW", self._on_closing)

        # Main Layout: Left (Form) | Right (List)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        # --- LEFT: Form Frame ---
        self.frame_form = ctk.CTkFrame(self)
        self.frame_form.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        
        ctk.CTkLabel(self.frame_form, text="Adicionar / Editar Município", font=("Roboto", 20, "bold")).pack(pady=20)

        # Fields
        self.entry_name = ctk.CTkEntry(self.frame_form, placeholder_text="Nome (Ex: Salvador)", width=300)
        self.entry_name.pack(pady=10)

        self.entry_id = ctk.CTkEntry(self.frame_form, placeholder_text="ID do Município (ProBPA)", width=300)
        self.entry_id.pack(pady=10)

        self.entry_api = ctk.CTkEntry(self.frame_form, placeholder_text="API Key (Tokens de Acesso)", width=300, show="*")
        self.entry_api.pack(pady=10)

        ctk.CTkLabel(self.frame_form, text="Banco do Cliente (Tailscale/VPN)", font=("Roboto", 14, "bold"), text_color="#00E676").pack(pady=(20, 5))

        self.entry_host = ctk.CTkEntry(self.frame_form, placeholder_text="Host IP (Ex: 100.80.x.x)", width=300)
        self.entry_host.pack(pady=5)
        
        # Row for Port / DB Name
        row1_frame = ctk.CTkFrame(self.frame_form, fg_color="transparent")
        row1_frame.pack(pady=5)
        self.entry_port = ctk.CTkEntry(row1_frame, placeholder_text="Porta (5432)", width=145)
        self.entry_port.pack(side="left", padx=(0, 10))
        self.entry_port.insert(0, "5432")
        self.entry_dbname = ctk.CTkEntry(row1_frame, placeholder_text="Banco (esus)", width=145)
        self.entry_dbname.pack(side="left")
        self.entry_dbname.insert(0, "esus")

        # Row for User / Pass
        row2_frame = ctk.CTkFrame(self.frame_form, fg_color="transparent")
        row2_frame.pack(pady=5)
        self.entry_user = ctk.CTkEntry(row2_frame, placeholder_text="Usuário (postgres)", width=145)
        self.entry_user.pack(side="left", padx=(0, 10))
        self.entry_user.insert(0, "postgres")
        self.entry_pass = ctk.CTkEntry(row2_frame, placeholder_text="Senha", width=145, show="*")
        self.entry_pass.pack(side="left")
        
        # Row for Initial Extraction and Schedule
        ctk.CTkLabel(self.frame_form, text="Configurações de Extração", font=("Roboto", 14, "bold"), text_color="#00E676").pack(pady=(20, 5))
        
        row3_frame = ctk.CTkFrame(self.frame_form, fg_color="transparent")
        row3_frame.pack(pady=5)
        
        ctk.CTkLabel(row3_frame, text="1ª Carga:").pack(side="left", padx=(0, 5))
        self.combo_days = ctk.CTkComboBox(row3_frame, values=["1", "5", "30", "60", "90", "180", "365", "730"], width=80)
        self.combo_days.pack(side="left", padx=(0, 10))
        self.combo_days.set("30")

        ctk.CTkLabel(row3_frame, text="Intervalo:").pack(side="left", padx=(0, 5))
        self.combo_interval = ctk.CTkComboBox(row3_frame, values=["15 minutos", "30 minutos", "1 hora", "6 horas", "12 horas", "24 horas", "Manual"], width=110)
        self.combo_interval.pack(side="left")
        self.combo_interval.set("1 hora")

        self.lbl_status = ctk.CTkLabel(self.frame_form, text="")
        self.lbl_status.pack(pady=10)

        self.btn_save = ctk.CTkButton(self.frame_form, text="SALVAR MUNICÍPIO", command=self._save_municipality, fg_color="#00897B", height=40)
        self.btn_save.pack(pady=20, fill="x", padx=40)

        # --- RIGHT: List Frame ---
        self.frame_list = ctk.CTkScrollableFrame(self)
        self.frame_list.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        ctk.CTkLabel(self.frame_list, text="Municípios Ativos", font=("Roboto", 20, "bold")).pack(pady=20)
        
        self.list_container = ctk.CTkFrame(self.frame_list, fg_color="transparent")
        self.list_container.pack(fill="both", expand=True)

        self._refresh_list()

    def _refresh_list(self):
        for widget in self.list_container.winfo_children():
            widget.destroy()
            
        muns = self.config_manager.get_municipalities()
        if not muns:
            ctk.CTkLabel(self.list_container, text="Nenhum município cadastrado ainda.", text_color="gray").pack(pady=20)
            return

        for m in muns:
            card = ctk.CTkFrame(self.list_container, fg_color="#37474F", corner_radius=10)
            card.pack(fill="x", pady=5, padx=5)
            
            # Left content
            info_frame = ctk.CTkFrame(card, fg_color="transparent")
            info_frame.pack(side="left", padx=10, pady=10, fill="both", expand=True)
            
            ctk.CTkLabel(info_frame, text=m.get('municipality_name', 'Sem Nome'), font=("Roboto", 16, "bold")).pack(anchor="w")
            ctk.CTkLabel(info_frame, text=f"ID: {m.get('municipality_id')} | Host: {m.get('db_host')} | {m.get('scheduler_interval', '1 hora')} ({m.get('days_back', 30)}d 1ª Carga)", text_color="gray", font=("Roboto", 12)).pack(anchor="w")
            
            last_run = m.get('last_run_success')
            if last_run:
                try:
                     # basic format
                     last_run = last_run[:16].replace("T", " ")
                except:
                     pass
            else:
                last_run = "Nunca executado"
                
            ctk.CTkLabel(info_frame, text=f"Último Sucesso: {last_run}", text_color="#00E676", font=("Roboto", 10)).pack(anchor="w")

            # Actions
            btn_del = ctk.CTkButton(card, text="Remover", width=80, fg_color="#C62828", hover_color="#B71C1C", 
                                    command=lambda mid=m.get('municipality_id'): self._remove_municipality(mid))
            btn_del.pack(side="right", padx=10, pady=10)

            btn_edit = ctk.CTkButton(card, text="Editar", width=80, fg_color="#0277BD", 
                                    command=lambda m_data=m: self._load_to_form(m_data))
            btn_edit.pack(side="right", pady=10)

    def _load_to_form(self, m_data):
        self.entry_name.delete(0, 'end')
        self.entry_name.insert(0, m_data.get('municipality_name', ''))
        
        self.entry_id.delete(0, 'end')
        self.entry_id.insert(0, m_data.get('municipality_id', ''))
        
        self.entry_api.delete(0, 'end')
        self.entry_api.insert(0, m_data.get('api_key', ''))
        
        self.entry_host.delete(0, 'end')
        self.entry_host.insert(0, m_data.get('db_host', ''))
        
        self.entry_port.delete(0, 'end')
        self.entry_port.insert(0, str(m_data.get('db_port', '5432')))
        
        self.entry_dbname.delete(0, 'end')
        self.entry_dbname.insert(0, m_data.get('db_name', 'esus'))
        
        self.entry_user.delete(0, 'end')
        self.entry_user.insert(0, m_data.get('db_user', 'postgres'))
        
        # Leave password empty by default or prefill? 
        # Safer to force re-type or prefill if available
        self.entry_pass.delete(0, 'end')
        if m_data.get('db_pass'):
            self.entry_pass.insert(0, m_data.get('db_pass'))
            
        self.combo_days.set(str(m_data.get('days_back', 30)))
        self.combo_interval.set(m_data.get('scheduler_interval', '1 hora'))

        self.lbl_status.configure(text="Modo Edição Carregado", text_color="#0277BD")

    def _save_municipality(self):
        m_name = self.entry_name.get()
        m_id = self.entry_id.get()
        api_key = self.entry_api.get()
        host = self.entry_host.get()
        port = self.entry_port.get()
        dbname = self.entry_dbname.get()
        user = self.entry_user.get()
        pwd = self.entry_pass.get()

        try:
            days_back = int(self.combo_days.get())
        except ValueError:
            days_back = 30
            
        interval = self.combo_interval.get()

        if not m_name or not m_id or not api_key or not host:
            self.lbl_status.configure(text="Preencha pelo menos Nome, ID, API e Host.", text_color="red")
            return

        success = self.config_manager.add_municipality(
            municipality_id=m_id, api_key=api_key, 
            db_host=host, db_port=port, db_name=dbname, db_user=user, db_pass=pwd, 
            municipality_name=m_name, days_back=days_back, scheduler_interval=interval
        )
        
        if success:
            self.lbl_status.configure(text=f"{m_name} salvo com sucesso!", text_color="green")
            # Clear form
            self.entry_name.delete(0, 'end')
            self.entry_id.delete(0, 'end')
            self.entry_api.delete(0, 'end')
            self.entry_host.delete(0, 'end')
            self.entry_pass.delete(0, 'end')
            self._refresh_list()
        else:
            self.lbl_status.configure(text="Erro ao salvar configurações", text_color="red")

    def _remove_municipality(self, mid):
        self.config_manager.remove_municipality(mid)
        self.lbl_status.configure(text="Município removido.", text_color="orange")
        self._refresh_list()

    def _on_closing(self):
        if self.on_close:
            self.on_close()
        self.destroy()

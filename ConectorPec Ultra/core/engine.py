import threading
import time
import schedule
from config.settings import config_manager
from core.extractor import MunicipalityExtractor

class ExtractionEngine:
    def __init__(self):
        self._stop_event = threading.Event()
        self.engine_thread = None
        # Por padrão, agendamento de 24 em 24 horas
        self.schedule_frequency_hours = 24
        self._setup_schedule()

    def _setup_schedule(self):
        schedule.clear()
        # Agenda para rodar o job
        schedule.every(self.schedule_frequency_hours).hours.do(self._run_all_scheduled_extractions)

    def _run_all_scheduled_extractions(self):
        print(f"[ENGINE] Iniciando varredura agendada para todos os municípios...")
        connections = config_manager.load_connections()
        for conn_config in connections:
            # Em modo agendado, poderíamos usar um thread pool para paralelizar,
            # mas para iniciar, rodamos de forma sequencial, município por município.
            print(f"[ENGINE] [AGENDAMENTO] Iniciando extração do município ID: {conn_config.get('id')} / Host: {conn_config.get('db_host')}")
            extractor = MunicipalityExtractor(conn_config)
            extractor.run_extraction()
        print(f"[ENGINE] Varredura agendada finalizada.")

    def trigger_manual_extraction(self, connection_id):
        """
        Dispara a extração manualmente apenas para a conexão com o ID especificado.
        Roda em uma thread separada para não travar a interface gráfica.
        """
        connections = config_manager.load_connections()
        target_config = next((c for c in connections if c.get("id") == connection_id), None)
        
        if not target_config:
            print(f"[ENGINE] Erro: Conexão com ID {connection_id} não encontrada.")
            return

        cancel_event = threading.Event()
        if not hasattr(self, 'active_manual_extractions'):
            self.active_manual_extractions = {}
            
        self.active_manual_extractions[connection_id] = cancel_event

        def _run_manual():
            print(f"[ENGINE] [MANUAL] Iniciando extração sob demanda do município ID: {connection_id} / Host: {target_config.get('db_host')}")
            extractor = MunicipalityExtractor(target_config)
            extractor.cancel_event = cancel_event
            success = extractor.run_extraction()
            if success:
                print(f"[ENGINE] [MANUAL] Extração concluída com sucesso para o ID: {connection_id}.")
            elif cancel_event.is_set():
                print(f"[ENGINE] [MANUAL] Extração cancelada para o ID: {connection_id}.")
            else:
                print(f"[ENGINE] [MANUAL] Falha na extração para o ID: {connection_id}.")
            self.active_manual_extractions.pop(connection_id, None)

        thread = threading.Thread(target=_run_manual, daemon=True)
        thread.start()

    def cancel_manual_extraction(self, connection_id):
        if hasattr(self, 'active_manual_extractions') and connection_id in self.active_manual_extractions:
            print(f"[ENGINE] Solicitando cancelamento da extração para o ID {connection_id}...")
            self.active_manual_extractions[connection_id].set()

    def _engine_loop(self):
        print("[ENGINE] Motor em segundo plano iniciado.")
        while not self._stop_event.is_set():
            schedule.run_pending()
            time.sleep(1)
        print("[ENGINE] Motor desligado.")

    def start(self):
        if self.engine_thread is None or not self.engine_thread.is_alive():
            self._stop_event.clear()
            self.engine_thread = threading.Thread(target=self._engine_loop, daemon=True)
            self.engine_thread.start()

    def stop(self):
        if self.engine_thread and self.engine_thread.is_alive():
            self._stop_event.set()
            self.engine_thread.join(timeout=3)

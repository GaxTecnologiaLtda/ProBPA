from abc import ABC, abstractmethod
from typing import Generator, Tuple, Any

class BaseExtractor(ABC):
    def __init__(self, config_manager):
        self.config = config_manager
        self.aborted = False

    @abstractmethod
    def extract(self, last_run_date=None) -> Generator[Tuple[str, str, Any], None, None]:
        """
        Yields (status, message, payload_chunk)
        payload_chunk is optional and can be a list of records to be batched.
        If the extractor handles sending internally, it might yield only status messages.
        """
        pass

    def abort(self):
        self.aborted = True

import os
import sys

# Adiciona o diretório atual ao sys.path para importações locais
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ui.app import ProBPAConnectorApp

def main():
    print("Iniciando ConectorPec Ultra...")
    app = ProBPAConnectorApp()
    app.mainloop()
    
if __name__ == "__main__":
    main()

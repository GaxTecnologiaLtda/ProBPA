@echo off
REM Navigate to script directory
cd /d "%~dp0"

REM Activate Venv and Run
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate
    python pec_connector.py %*
) else (
    echo Erro: Ambiente virtual nao encontrado. Execute setup_connector.bat primeiro.
    pause
)

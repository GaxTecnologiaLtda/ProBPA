@echo off
REM Secure Runner
cd /d "%~dp0"

if exist "dist\pec_connector.exe" (
    dist\pec_connector.exe %*
) else (
    if exist "pec_connector.exe" (
        pec_connector.exe %*
    ) else (
        echo [ERRO] Executavel pec_connector.exe nao encontrado.
        echo Certifique-se de que o arquivo esteja na pasta ou em 'dist/'.
        pause
    )
)
pause

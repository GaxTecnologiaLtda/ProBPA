@echo off
cd /d "%~dp0"
echo ===========================================
echo    Builder do Conector (Windows)
echo ===========================================
echo Este script cria o executavel (.exe) para protecao do codigo.
echo.

REM Check PyInstaller
pyinstaller --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller nao encontrado.
    echo Instalando PyInstaller...
    pip install pyinstaller
)

echo [1/2] Compilando pec_connector.py...
REM --onefile: Single .exe
REM --noconsole: Optional, but we usually want console for server logs. Removed for now to keep logs visible.
pyinstaller --onefile --name pec_connector --distpath dist --workpath build --clean pec_connector.py

if %errorlevel% equ 0 (
    echo.
    echo [2/2] SUCESSO!
    echo O executavel foi criado em: dist\pec_connector.exe
    echo.
    echo Agora voce pode distribuir apenas o .exe e os scripts de setup/run.
    echo Nao distribua os arquivos .py originais.
) else (
    echo [ERROR] Falha na compilacao.
    exit /b 1
)

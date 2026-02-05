@echo off
setlocal
cd /d "%~dp0"
title Configuracao do Ambiente de Build (Fabrica)

echo ===========================================
echo    Preparando Ambiente de Build (Windows)
echo ===========================================

REM 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Python nao encontrado.
    echo Tentando instalar Python 3.11 via Winget...
    winget install -e --id Python.Python.3.11 --scope machine --accept-package-agreements --accept-source-agreements
    
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar Python automaticamente.
        echo Por favor, instale manualmente em python.org e marque "Add to PATH".
        pause
        exit /b 1
    )
    
    echo [OK] Python instalado. Reiniciando variaveis de ambiente...
    call RefreshEnv.cmd >nul 2>&1
)

REM 2. Install Dependencies
echo.
echo [INFO] Instalando PyInstaller e dependencias...
pip install pyinstaller requests python-dotenv psycopg2-binary
if %errorlevel% neq 0 (
    echo [ERRO] Falha no PIP Install. Verifique conexao.
    pause
    exit /b 1
)

REM 3. Run Build
echo.
echo [INFO] Iniciando compilacao...
call build_exe.bat

REM 4. Organize Final Package
if exist "dist\pec_connector.exe" (
    echo.
    echo [INFO] Organizando pacote final...
    if exist "entrega_cliente" rmdir /s /q "entrega_cliente"
    mkdir "entrega_cliente"
    
    echo Copiando arquivos...
    copy "dist\pec_connector.exe" "entrega_cliente\" >nul
    copy "setup_secure.bat" "entrega_cliente\" >nul
    copy "run_secure.bat" "entrega_cliente\" >nul
    copy "agendar_tarefa.bat" "entrega_cliente\" >nul
    copy "README_CLIENTE.txt" "entrega_cliente\" >nul
    
    if exist "entrega_cliente\pec_connector.exe" (
        echo.
        echo ==================================================
        echo    SUCESSO! PACOTE PRONTO EM: 'entrega_cliente'
        echo ==================================================
        echo Copie a pasta 'entrega_cliente' para o computador do municipio.
        explorer "entrega_cliente"
    ) else (
        echo [ERRO] Falha ao mover arquivo .exe. Verifique a pasta dist.
    )
) else (
    echo [ERRO] O arquivo dist\pec_connector.exe nao foi encontrado apos o build.
)

pause

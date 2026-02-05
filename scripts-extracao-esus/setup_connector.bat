@echo off
setlocal
cd /d "%~dp0"
title Instalador do Conector PEC - ProBPA

echo ===========================================
echo    Instalador do Conector PEC (Windows)
echo ===========================================

REM 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Python nao encontrado.
    echo Por favor, instale o Python 3 e marque a opcao "Add Python to PATH" durante a instalacao.
    pause
    exit /b 1
)

REM 2. Setup Venv
if not exist "venv" (
    echo [1/4] Criando ambiente virtual...
    python -m venv venv
) else (
    echo [1/4] Ambiente virtual ja existe.
)

REM 3. Install Dependencies
echo [2/4] Instalando dependencias...
call venv\Scripts\activate
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERRO ao instalar dependencias. Verifique sua conexao.
    pause
    exit /b 1
)

REM 4. Configure .env
echo.
echo [3/4] Configuracao de Seguranca
echo Digite o ID do Municipio:
set /p mun_id=
echo Digite a API KEY:
set /p api_key=

echo.
echo [4/4] Configuracao do Banco de Dados (e-SUS Local)
echo Host (Padrao: localhost):
set /p db_host=
if "%db_host%"=="" set db_host=localhost

echo Porta (Padrao: 5432):
set /p db_port=
if "%db_port%"=="" set db_port=5432

echo Nome do Banco (Padrao: esus):
set /p db_name=
if "%db_name%"=="" set db_name=esus

echo Usuario (Padrao: postgres):
set /p db_user=
if "%db_user%"=="" set db_user=postgres

echo Senha do Banco:
set /p db_pass=

REM Write .env
(
echo MUNICIPALITY_ID=%mun_id%
echo API_KEY=%api_key%
echo DB_HOST=%db_host%
echo DB_PORT=%db_port%
echo DB_NAME=%db_name%
echo DB_USER=%db_user%
echo DB_PASS=%db_pass%
) > .env

echo.
echo ===========================================
echo    Instalacao Concluida!
echo ===========================================
echo.
echo Para testar agora:
echo   run_connector.bat --days 15
echo.
pause

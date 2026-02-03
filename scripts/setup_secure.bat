@echo off
setlocal
cd /d "%~dp0"
title Instalador Seguro - Conector PEC

echo ===========================================
echo    Conector PEC - Instalacao Segura
echo ===========================================

REM 1. Configure .env
if exist ".env" (
    echo [AVISO] Arquivo .env ja existe. 
    echo Pressione CTRL+C para cancelar ou ENTER para sobrescrever.
    pause
)

echo.
echo --- Credenciais de Acesso ---
echo.
echo Digite o ID do Municipio:
set /p mun_id=
echo Digite a API KEY (Chave Secreta):
set /p api_key=

echo.
echo --- Banco de Dados Local (PostgreSQL) ---
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
echo [SEGURANCA] Aplicando bloqueio de permissoes no arquivo .env...

REM ICACLS:
REM /inheritance:r -> Remove inherited permissions
REM /grant:r "%USERNAME%":(F) -> Grant full control ONLY to current user
icacls ".env" /inheritance:r /grant:r "%USERNAME%":(F)

if %errorlevel% equ 0 (
    echo [OK] O arquivo .env agora esta protegido (Acesso exclusivo).
) else (
    echo [AVISO] Nao foi possivel aplicar as permissoes restritas. Verifique se e Admin.
)

echo.
echo ===========================================
echo    Validando Conexao...
echo ===========================================
echo.

if exist "pec_connector.exe" (
    pec_connector.exe --test
) else (
    if exist "dist\pec_connector.exe" (
        dist\pec_connector.exe --test
    ) else (
        echo [AVISO] Executavel nao encontrado para teste automatico.
    )
)

echo.
echo ===========================================
echo    Instalacao Finalizada!
echo ===========================================
echo.
echo Se o teste acima deu OK, o sistema esta pronto.
echo Para executar manualmente: run_secure.bat --days 15
echo.
pause

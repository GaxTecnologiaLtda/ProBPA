@echo off
cd /d "%~dp0"
echo ========================================================
echo      PROBPA CONECTOR - FABRICA DE COMPILACAO
echo ========================================================
echo.
echo Este script ira transformar o codigo Python em Aplicativo (.exe).
echo Requisitos: Python 3.10+ instalado e no PATH.
echo.
pause

echo.
echo [1/3] Instalando dependencias...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b
)

echo.
echo [1.5/4] Preparando Icone...
python -c "from PIL import Image; Image.open('assets/icon.png').save('assets/icon.ico', format='ICO', sizes=[(256, 256)])" 2>nul
if exist assets\icon.ico echo Icone gerado com sucesso.

echo [2/4] Compilando "ProBPA_Connector.exe" (Via PyInstaller Native)...
:: Executing PyInstaller directly. CustomTkinter is native, so no special hooks needed usually.
python -m PyInstaller --clean --noconfirm packaging/windows.spec
if %errorlevel% neq 0 (
    echo [ERRO] Falha na compilacao PyInstaller.
    pause
    exit /b
)

echo.
echo [3/4] Organizando Saida (Portable)...
if exist release rmdir /s /q release
mkdir release
xcopy /E /I /Y dist\ProBPA_Connector release\ProBPA_Connector
:: copy dist\ProBPA_Connector.exe "%USERPROFILE%\Downloads\" -> Disabled for OneDir

echo.
echo [4/4] Gerando Instalador (Inno Setup)...
:: Tentativa de auto-detectar o Inno Setup Compiler (ISCC)
set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist %ISCC% (
    %ISCC% packaging\setup_script.iss
    if %errorlevel% neq 0 (
        echo [AVISO] Falha ao gerar instalador. Verifique o script .iss
    ) else (
        echo [SUCESSO] Instalador gerado em: installer\
        copy installer\*.exe "%USERPROFILE%\Downloads\"
        
        echo.
        echo [EXTRA] Preparando Arquivos para o Site...
        if not exist website_assets mkdir website_assets
        copy installer\*.exe website_assets\
        copy assets\icon.png website_assets\icon_website.png
        copy assets\icon.ico website_assets\favicon.ico
        echo Arquivos copiados para folder 'website_assets'
    )
) else (
    echo [INFO] Inno Setup nao encontrado automaticamente.
    echo        Gere o instalador manualmente clicando em 'packaging/setup_script.iss'
)

echo.
echo ========================================================
echo      PROCESSO FINALIZADO
echo      Excecutavel em: release\ProBPA_Connector.exe
echo      Instalador em: installer\ (Se InnoSetup estiver instalado)
echo ========================================================
echo.
pause

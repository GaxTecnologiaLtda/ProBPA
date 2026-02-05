@echo off
cd /d "%~dp0"
echo ========================================================
echo      AGENDAMENTO AUTOMATICO - PROBPA CONECTOR
echo ========================================================
echo.
echo Este script ira criar uma Tarefa do Windows para rodar
echo o conector todos os dias as 23:00.
echo.
echo [!] Execute este script como ADMINISTRADOR.
echo.
pause

set TASK_NAME=ProBPA_Conector
set SCRIPT_PATH=%~dp0run_secure.bat

echo.
echo Criando tarefa '%TASK_NAME%'...
echo Caminho do Script: %SCRIPT_PATH%
echo Horario: 09:00 (Diariamente)
echo.

schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc minute /mo 15 /ru System /rl HIGHEST /f

echo.
echo [CONF] Configurando para rodar "Logo que possivel" se perder o horario...
powershell -Command "$s=New-Object -ComObject Schedule.Service;$s.Connect();$t=$s.GetFolder('\').GetTask('%TASK_NAME%');$d=$t.Definition;$d.Settings.StartWhenAvailable=$true;$d.Triggers.Item(1).StartBoundary = [DateTime]::Now.ToString('yyyy-MM-ddTHH:mm:ss');$s.GetFolder('\').RegisterTaskDefinition('%TASK_NAME%',$d,4,'System',$null,5)"

if %errorlevel% equ 0 (
    echo.
    echo [SUCESSO] Tarefa agendada com sucesso!
    echo O conector rodara automaticamente hoje as 09:00.
    echo.
    echo Abrindo Agendador de Tarefas para conferencia...
    start taskschd.msc
) else (
    echo.
    echo [ERRO] Nao foi possivel criar a tarefa.
    echo Verifique se voce executou como ADMINISTRADOR.
    echo Ou tente criar manualmente pelo "Agendador de Tarefas".
)

echo.
pause

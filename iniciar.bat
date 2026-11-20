@echo off
setlocal
pushd "%~dp0" || exit /b 1

node -e "process.exit(Number(process.versions.node.split('.')[0]) < 22 ? 1 : 0)" >nul 2>&1
if errorlevel 1 (
  echo Instale o Node.js 22 ou mais recente em https://nodejs.org e abra este arquivo de novo.
  popd
  pause
  exit /b 1
)

if not exist node_modules\three\package.json goto instalar
if not exist node_modules\ws\package.json goto instalar
goto pronto

:instalar
echo Instalando dependencias ^(so na primeira vez^)...
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 (
  echo Falha ao instalar as dependencias. Veja a mensagem acima.
  popd
  pause
  exit /b 1
)

:pronto
if /i "%~1"=="offline" set VJ_TUNNEL=0
if not defined VJ_OPEN set VJ_OPEN=1
node tools\launch.js
set "VJ_LAUNCH_EXIT=%errorlevel%"
popd
if not "%VJ_LAUNCH_EXIT%"=="0" pause
exit /b %VJ_LAUNCH_EXIT%

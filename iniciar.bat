@echo off
rem Inicia o virtualJRPG a partir dos arquivos do projeto (sem .exe).
rem Duplo clique neste arquivo. Precisa do Node.js 22 ou mais novo.
rem Instala as dependencias na primeira vez, cria a chave do mestre em data\gm-key.txt
rem e sobe o servidor, que ja abre o tunel do Cloudflare e mostra o codigo da sessao.
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao 22 LTS em https://nodejs.org e abra este arquivo de novo.
  pause
  exit /b 1
)

if not exist node_modules\three\package.json goto instalar
if not exist node_modules\ws\package.json goto instalar
goto pronto

:instalar
echo Instalando dependencias ^(so na primeira vez^)...
call npm ci --no-audit --no-fund
if errorlevel 1 (
  echo Falha ao instalar as dependencias. Veja a mensagem acima.
  pause
  exit /b 1
)

:pronto
if not exist data mkdir data
if not "%GM_KEY%"=="" goto subir
if not exist data\gm-key.txt node -e "console.log(require('crypto').randomBytes(5).toString('hex'))" > data\gm-key.txt
set /p GM_KEY=<data\gm-key.txt

:subir
rem "iniciar.bat offline" (ou o arquivo iniciar-sem-internet.bat) nao abre o tunel: so este computador e a rede Wi-Fi entram.
if /i "%~1"=="offline" set VJ_TUNNEL=0
node server.js
pause

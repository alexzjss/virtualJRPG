#!/usr/bin/env sh
# Inicia o virtualJRPG a partir dos arquivos do projeto (sem .exe).
# Uso: ./iniciar.sh     (Linux / macOS; precisa do Node.js 22 ou mais novo)
# Instala as dependências na primeira vez, cria a chave do mestre em data/gm-key.txt
# e sobe o servidor, que já abre o túnel do Cloudflare e mostra o código da sessão.
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale a versão 22 (LTS) em https://nodejs.org e rode de novo."
  exit 1
fi

if [ ! -d node_modules/three ] || [ ! -d node_modules/ws ]; then
  echo "Instalando dependências (só na primeira vez)..."
  npm ci --no-audit --no-fund
fi

mkdir -p data
if [ -z "$GM_KEY" ]; then
  if [ ! -s data/gm-key.txt ]; then
    node -e "console.log(require('crypto').randomBytes(5).toString('hex'))" > data/gm-key.txt
  fi
  GM_KEY=$(tr -d '\r\n' < data/gm-key.txt)
  export GM_KEY
fi

# ./iniciar.sh offline: sem túnel, só este computador e a rede Wi-Fi
[ "$1" = "offline" ] && export VJ_TUNNEL=0

exec node server.js

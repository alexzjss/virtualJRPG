# Como rodar o virtualJRPG de graça

O jogo é um servidor Node que fica ligado (WebSocket + estado em arquivo). Por isso **não roda na Vercel**; ela só serve para páginas estáticas e funções curtas.
O caminho mais simples e realmente gratuito é **rodar no computador do mestre** e abrir um túnel para os jogadores.

> Planos gratuitos mudam com frequência. Os nomes e limites abaixo são os que eu conheço; confira na página de cada serviço antes de contar com eles.

## Opção 0 (mais fácil): baixar o programa pronto

A cada versão publicada, o GitHub gera um executável que não precisa de Node nem de instalação.
1. No GitHub do projeto, abra **Releases** e baixe o `.zip` do seu sistema: `windows-x64`, `linux-x64`, `macos-arm64` (Macs com chip M) ou `macos-x64` (Macs Intel).
2. Extraia e dê dois cliques em `virtualJRPG`. A janela mostra os endereços e a chave do mestre (também guardada em `data/gm-key.txt`).
3. Para os jogadores de fora da sua rede, abra um túnel (passo 3 da Opção A).

No Windows, se aparecer "PC protegido", clique em **Mais informações → Executar assim mesmo** (o programa não é assinado). No macOS, na primeira vez use botão direito → **Abrir**.
Para atualizar, troque só o programa e mantenha a pasta `data`.

**Como gerar uma versão (para quem mantém o projeto):** `git tag v0.2.0 && git push origin v0.2.0`. O GitHub Actions roda os testes, compila nas quatro plataformas e publica a Release sozinho. Para gerar localmente: `npm install && node tools/build-exe.mjs` (sai em `dist/`).

## Opção A: no seu PC com Node + túnel gratuito

Serve para uma mesa de amigos durante a sessão. Custa zero, o estado fica no seu disco e não há hibernação.

### 1. Preparar (uma vez)
1. Instale o **Node.js 20 ou mais novo** (nodejs.org, versão LTS).
2. Baixe o projeto e instale as dependências:
   ```
   git clone https://github.com/alexzjss/virtualJRPG
   cd virtualJRPG
   npm install
   ```

### 2. Ligar o servidor (toda sessão)
```
# Linux / macOS
GM_KEY=suachavesecreta PORT=3000 npm start

# Windows (PowerShell)
$env:GM_KEY="suachavesecreta"; $env:PORT=3000; npm start
```
- `GM_KEY` é a senha do mestre. **Troque a padrão (`mestre`)**, senão qualquer um que achar o link entra como mestre.
- Teste em `http://localhost:3000`.

### 3. Abrir para os jogadores (escolha um túnel)

**Cloudflare Tunnel (sem conta, mais simples)**
1. Instale o `cloudflared` (developers.cloudflare.com → Cloudflare Tunnel → Downloads).
2. Em outro terminal: `cloudflared tunnel --url http://localhost:3000`
3. Ele imprime um endereço `https://alguma-coisa.trycloudflare.com`. Esse é o link da mesa. Muda a cada vez que você reinicia.

**Alternativas**
- **ngrok**: conta gratuita, um domínio fixo por conta. `ngrok http 3000`.
- **Tailscale**: todos instalam o app (gratuito) e entram na mesma rede privada; use o IP do seu PC (`http://100.x.x.x:3000`). Não precisa de HTTPS nem de link público.
- **Mesma rede Wi-Fi**: use o IP local do PC (`http://192.168.x.x:3000`). Libere a porta 3000 no firewall.

### 4. Quem abre o quê
| Quem | Endereço | O que faz |
|---|---|---|
| Mestre | `…/gm` | pede a chave do mestre na primeira vez |
| Jogadores | `…/player` | nome e senha (a senha é criada no primeiro acesso) |
| TV / segundo monitor | `…/table` | só leitura, tela cheia (F11) |

Mande aos jogadores o link `…/player`. A conexão usa `wss://` sozinha quando o link é HTTPS.

### 5. Seus dados
- Tudo fica em `data/` (`state.json`, `uploads/`, `backups/`). A cada início o servidor guarda cópia das 10 últimas em `data/backups/`.
- Para outro lugar: variável `VJ_DATA=/caminho/dados`.
- Faça backup da pasta `data/` entre sessões (copie para um pendrive ou nuvem pessoal).
- Para atualizar o jogo: `git pull && npm install`, reinicie o servidor.

## Opção B: servidor ligado 24 horas, de graça (mais trabalho)

Útil se o mestre não quiser deixar o PC ligado. Todas têm limites e pegadinhas:

| Serviço | Como é | Cuidado |
|---|---|---|
| **Oracle Cloud "Always Free"** | uma máquina virtual Linux de verdade, sempre ligada | exige cartão para cadastro, criar a conta pode ser burocrático; é a que melhor serve ao jogo |
| **Render (plano gratuito)** | publica direto do GitHub, dá HTTPS | hiberna sem uso (primeiro acesso demora) e **o disco apaga** quando reinicia: perde campanha e uploads |
| **Fly.io / Railway / Koyeb** | publicam de GitHub ou Docker | os planos gratuitos mudam; muitos pedem cartão ou só dão crédito de teste |

Se for por esse caminho, o importante é: comando de início `npm start`, porta pela variável `PORT`, `GM_KEY` definida nas variáveis do serviço, e uma **pasta persistente** para `VJ_DATA`. Sem disco persistente, a campanha some a cada reinício; nesse caso exporte o `data/state.json` ao fim da sessão.

## Problemas comuns
- **Fica em "Conectando…"**: o túnel caiu ou o link mudou; pegue o novo endereço. Se o servidor não está rodando, nada abre.
- **Jogadores não conseguem entrar pela rede local**: firewall bloqueando a porta 3000.
- **Esqueci a senha de um jogador**: apague a entrada em `users` dentro de `data/state.json` (com o servidor parado); ele cria outra no próximo acesso.
- **Imagens do mapa não aparecem**: o limite de envio é 5 MB por imagem (PNG, JPG, WEBP ou GIF).
- **Fontes diferentes**: as fontes vêm do Google Fonts; sem internet o visual cai para fontes do sistema.

## Segurança em poucas linhas
- Troque `GM_KEY`. Não compartilhe o link `/gm`.
- Quem tiver o link da mesa consegue tentar entrar. Dê o endereço só a quem vai jogar e desligue o túnel ao fim da sessão.
- As senhas dos jogadores ficam guardadas com hash (scrypt), mas não há limite de tentativas; por isso não reutilize senhas importantes.

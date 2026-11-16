# Como rodar o virtualJRPG de graça

O jogo roda **no computador do mestre**. Lá ficam a campanha, os mapas, as contas e as cópias de segurança.
Os jogadores não instalam nada: recebem um link, digitam login e senha e jogam pelo navegador (celular ou PC).
Tudo o que um faz aparece na hora para os outros e para o mestre.

```
Jogador ──link──▶ página de entrada (GitHub Pages, fixa)
                    │ código da sessão
                    ▼
          https://<código>.trycloudflare.com  ◀── túnel gratuito ── programa do mestre (seu PC, pasta data/)
```

> O túnel gratuito do Cloudflare (`trycloudflare.com`) não tem conta, nem garantia de funcionamento, e muda de endereço a cada vez. Por isso existe o código da sessão.

## Mestre: preparar uma vez

1. **Baixe o programa.** No GitHub do projeto, abra **Releases** e baixe o `.zip` do seu sistema (`windows-x64`, `linux-x64` ou `macos-arm64`). Extraia numa pasta sua.
   - Windows: se aparecer "PC protegido", clique em **Mais informações → Executar assim mesmo** (o programa não é assinado).
   - macOS: na primeira vez, botão direito → **Abrir**. Macs com processador Intel não têm programa pronto: use `npm start` (abaixo).
2. **Ative a página de entrada** (só quem mantém o repositório, uma vez): no GitHub, **Settings → Pages → Build and deployment → Deploy from a branch**, escolha `main` e a pasta `/docs`, e salve. Em alguns minutos a página fica em `https://alexzjss.github.io/virtualJRPG/`.
   Se usar outro endereço (um fork, por exemplo), defina a variável `VJ_PORTAL` com ele ao abrir o programa.
3. **Abra o programa** (dois cliques em `virtualJRPG`). A janela mostra a **chave do mestre** (também em `data/gm-key.txt`). Na primeira vez ele baixa o `cloudflared` (cerca de 30 MB) para a pasta `data/`.
4. Abra `http://localhost:3000/gm` e entre com a chave.
5. Na janela **Sessão**, crie **uma conta para cada jogador**: login (sem espaços), senha (vazia = o jogo sorteia uma) e o personagem dela. Clique em **Copiar acesso** e mande **só para aquele jogador**, em particular.
   - Um jogador pode ter mais de um personagem: **+ Personagem** na linha da conta.
   - Apagar a conta deixa os personagens dela sem dono, mas não os apaga.

## Mestre: em cada sessão

1. Abra o programa. Espere a janela **Sessão** mostrar **Internet: Aberta** e o **código da sessão** (ex.: `lago-verde-mesa-norte`). A janela preta do programa também mostra o código.
2. Clique em **Copiar convite** e cole no grupo. O convite já leva o código no link.
3. TV ou segundo monitor: `http://localhost:3000/table`, login `mestre` e a sua chave (ou a conta de um jogador).
4. Ao terminar, **feche a janela do programa**. O link para de funcionar e tudo fica salvo em `data/`.

**Se a internet não abrir**, a janela Sessão mostra o motivo e o programa tenta de novo a cada minuto. Enquanto isso, quem está na mesma rede Wi-Fi entra pelo endereço local que aparece lá (`http://192.168.x.x:3000/player`). Libere a porta 3000 no firewall se for preciso.

## Jogadores

1. Abra o link que o mestre mandou no grupo.
2. Digite o login e a senha que o mestre te passou e clique em **Entrar**. Marque "Lembrar" para não digitar de novo.
3. Para trocar a senha: botão **Senha**, no alto da tela do jogo. Na próxima sessão, use a senha nova na página de entrada.

A própria página de entrada tem esta ajuda e as soluções para "não conecta".

## Seus dados (mestre)

- Tudo fica em `data/`: `state.json` (campanha e contas), `uploads/` (imagens), `backups/` (as 10 últimas cópias, uma por início), `gm-key.txt` e o `cloudflared`.
- Faça cópia da pasta `data/` de vez em quando (pendrive ou nuvem pessoal).
- Para atualizar o jogo: troque só o programa e mantenha a pasta `data/`.
- As contas antigas (criadas pelo próprio jogador no primeiro acesso, na versão anterior) foram apagadas na atualização: recrie-as na janela Sessão.

## Com Node, sem o programa pronto

```
git clone https://github.com/alexzjss/virtualJRPG
cd virtualJRPG
npm install
GM_KEY=suachavesecreta npm start
```
No Windows (PowerShell): `$env:GM_KEY="suachavesecreta"; npm start`. Variáveis: `PORT` (porta, padrão 3000), `VJ_DATA` (pasta dos dados), `VJ_TUNNEL=0` (não abrir o túnel), `VJ_PORTAL` (endereço da página de entrada).

**Gerar uma versão (quem mantém o projeto):** `git tag v0.3.0 && git push origin v0.3.0`. O GitHub Actions testa, compila e publica a Release. Localmente: `node tools/build-exe.mjs` (sai em `dist/`).

## Problemas comuns

- **Internet: Com problema** o tempo todo: antivírus ou firewall bloqueando o `cloudflared`, ou rede que bloqueia o Cloudflare. Teste em outra rede; em último caso use a rede local.
- **Jogador vê "Não achei a mesa"**: o programa está fechado, o túnel ainda está abrindo, ou ele usou o link de uma sessão antiga.
- **Jogador esqueceu a senha**: **Nova senha** na janela Sessão. Quem estiver conectado com a senha antiga é desconectado.
- **Imagens do mapa não aparecem**: o limite é 5 MB por imagem (PNG, JPG, WEBP ou GIF).

## Segurança em poucas linhas

- Só entra quem tem conta: jogador, mesa e mestre pedem login. Não compartilhe a chave do mestre.
- O login e a senha passam da página de entrada para o jogo depois do `#` do link, que o navegador não envia pela rede; o jogo apaga isso da barra de endereço.
- As senhas ficam guardadas com hash (scrypt). Não há limite de tentativas: use senhas que não sejam reaproveitadas de outros sites.
- O envio de imagens (`/upload`) não pede login: quem souber o endereço da sessão consegue mandar imagens até 5 MB para a pasta `data/uploads`.

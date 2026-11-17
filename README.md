# virtualJRPG
Mesa virtual de RPG com regras próprias (d100, CTB, Aura/Sanidade/Limite).

    npm install && npm start        # GM_KEY=suachave PORT=3000 VJ_TUNNEL=0 opcionais

**Jeito rápido, sem executável:** dê dois cliques em `iniciar.bat` (Windows) ou rode `./iniciar.sh` (Linux/macOS). Os scripts instalam as dependências na primeira vez, criam a chave do mestre em `data/gm-key.txt` e sobem o servidor com o túnel do Cloudflare. Precisam do Node.js 22 ou mais novo.

- `/gm` — painel do mestre (a chave é sorteada na primeira vez e fica em `data/gm-key.txt`; para usar a sua, defina `GM_KEY`). A janela **Sessão** cria as contas e copia o convite.
- `/player` — fichas do jogador (login e senha criados pelo mestre)
- `/table` — mesa compartilhada (mapa 2D + batalha JRPG), somente leitura; entra com a conta de um jogador ou login `mestre` + chave
- `docs/index.html` — página de entrada opcional (GitHub Pages). Só é usada se você definir `VJ_PORTAL`; sem isso o convite já leva direto ao link do túnel e nada precisa ser publicado

Ao iniciar, o servidor abre sozinho um túnel gratuito do Cloudflare (baixa o `cloudflared` na primeira vez) e mostra o **código da sessão**. Veja `GUIA-RODAR.md`.

Chat: texto livre, `/r 2d6+1` para rolar (aceita somas como `/r 2d6+1d4+3` e `/r d20-1`), `/w nome mensagem` (ou `/w mestre …`) para sussurrar.
Estado e uploads ficam em `data/`.

## Uso pessoal, direto do seu computador
Nada precisa ser publicado no GitHub: baixe (ou clone) a pasta e rode dela.
- **Com internet para os jogadores:** dois cliques em `iniciar.bat` (ou `./iniciar.sh`). O painel do mestre abre sozinho no navegador, já com a chave. Na janela **Sessão**, "Copiar convite" entrega o link direto do túnel.
- **Só neste computador e na rede Wi-Fi:** dois cliques em `iniciar-sem-internet.bat` (ou `./iniciar.sh offline`, ou `npm run offline`). Não baixa nem abre túnel.
- `VJ_OPEN=0` não abre o navegador sozinho. `npm run exe` gera o executável único em `dist/`, se quiser um.

## Campanhas, diário e cópias de segurança
Janela **Campanha** do mestre:
- **Guardar**, **Nova campanha** e **Abrir** trocam de campanha sem fechar o programa (ficam em `data/campanhas/`). As contas dos jogadores valem para todas.
- **Exportar / Importar arquivo** leva uma campanha inteira para outro computador (as senhas não vão no arquivo).
- **Diário**: tudo o que é público no histórico fica em `data/diario/`, sem o limite de linhas do chat. "Marcar início de sessão" separa as sessões.
- **Pacote de conteúdo**: skills, itens, bestiário e encontros num arquivo. Ao importar, o que tem o mesmo nome é atualizado e o resto é somado.
- **Cópias de segurança**: ao iniciar, a cada 10 minutos (se algo mudou), antes de trocar de campanha e no botão "Copiar agora". Guarda as 30 mais recentes; "Restaurar" volta a qualquer uma.

## Mapa e som
- Janela **Cena**: névoa com "Revelar tudo" / "Esconder tudo" e pincel de 1×1 a 7×7, grade visível ou oculta, metros por casa.
- Régua: Alt+arrastar; com Shift mede área. Marcador: Ctrl+clique no mapa (Ctrl+Shift+clique cria um que só o mestre vê).
- Janela **Som**: trilha por link ou arquivo enviado (MP3, OGG, WAV, M4A até 40 MB), lista de faixas, trilha própria por cena, ambiências e efeitos prontos (sintetizados, sem arquivos). Todos ouvem em sincronia; cada pessoa ajusta ou silencia o próprio volume no canto da tela. Golpes, críticos, erros e curas também têm som.

## Mostrar a todos
Na janela **Cena**, "Mostrar a todos" abre um texto e/ou uma imagem (carta, retrato, pista) na tela de cada jogador e na mesa. O jogador fecha quando quiser e pode rever; "Recolher" tira de todas as telas.

## Interface
- Perguntas e confirmações aparecem em janelas do próprio jogo (nada de caixas do navegador); exclusões pedem confirmação.
- Barra de ferramentas no mapa: zoom, enquadrar, régua, área, sinal e, para o mestre, marcador e névoa. Funciona no toque.
- **Ctrl+K** (mestre): busca rápida de janelas, cenas, fichas, ações, sons e inimigos. Tecla **?**: lista de atalhos.
- Histórico com filtro (tudo, conversa, rolagens) e hora de cada linha ao passar o mouse.
- O jogador é avisado quando chega a vez dele (aviso, som, vibração e título da aba); o mestre vê na aba quantos pedidos esperam.
- Mudança de cena mostra o nome da cena em destaque para jogadores e mesa.
- Mestre: duplo clique no título recolhe a janela; arrastar uma imagem para a tela troca o mapa (ou o retrato, se soltar sobre uma ficha) e um áudio vira trilha.

## Organização do código
- `server.js` é só a entrada. `src/config.js` (caminhos, chave), `consts.js` (tabelas de regras), `state.js` (estado, migrações, gravação), `rules.js` (combate, inimigos, fila), `handlers.js` (ações dos clientes), `net.js` (HTTP e WebSocket), `auth.js`, `seed.js`, `campaign.js` (campanhas, cópias, diário, pacotes) e `media.js` (som e extras do mapa).
- `public/js/`: `nucleo.js` (constantes, login, conexão), `sessao.js`, `palco.js` (batalha e mapa), `mestre.js` (janelas do mestre), `paginas.js` (telas do jogador), `tela.js` (desenho e efeitos), `extras.js` (Campanha, Som, marcadores), `ux.js` (diálogos, ferramentas do mapa, busca rápida, ajuda) e `eventos.js`. São scripts comuns carregados nessa ordem.

## Pedidos e aprovação do mestre
Rolagem de atributo, ação de combate (ataque, skill, item), aprender skill, itens fora de combate (usar, equipar, comprar, vender, forjar, descartar) e ações de acampamento do jogador viram **pedidos**. Mover o token e passar a vez não pedem aprovação.
- O mestre vê os pedidos numa faixa fixa no alto: **Aprovar** (Enter), **Negar** (Delete), negar com motivo, bônus ou penalidade (−20 a +20) e, nas rolagens, **Secreta**.
- "Aprovar sozinho" liga ou desliga a aprovação por tipo (rolagens, combate, skills, itens, acampamento).
- Cada jogador tem um pedido por vez e pode cancelar. Pedido de combate some se a vez passar.
- HP, Aura, Sanidade e Limite só o mestre altera.

## Ferramentas do mestre
- Na janela **Fichas**, clique em qualquer número para editar (aceita `+5` ou `-12`). Clique nas fichas para selecionar e aplique dano, cura, Aura, Sanidade, XP, ouro, condição ou item a todas de uma vez.
- Na ficha aberta: clique no número do atributo para editar e na sigla para rolar; busca por nome para entregar itens e dar ou tirar skills sem custo.
- **Ver como** abre a tela de um jogador em outra aba, só para olhar.

## Batalha: fundo, intensidade e efeitos
- Na janela **Cena**, "Fundo da batalha" escolhe um tema pronto (Rubro, Noite, Floresta, Brasa, Gelo, Vazio, Santuário, Tempestade), o mapa da cena ou uma imagem própria (link ou envio). Vale por cena.
- O palco muda com o estado do combate: grupo ferido deixa o fundo mais vermelho e rápido ("tensão"); grupo no limite, herói caído ou chefe de pé vira "perigo".
- Cada ação mostra os dados num painel (o que era preciso tirar e o veredito) e só então o palco aproxima em quem age e nos alvos, com o golpe, o número e o carimbo de crítico ou fraqueza.
- Na vez do jogador, o primeiro inimigo de pé já vem escolhido como alvo. Ninguém gasta o turno golpeando quem já caiu.
- Quando o último inimigo cai, o mestre recebe um aviso e o botão **Vitória** pisca. A mensagem de vitória aponta o destaque da batalha (quem causou mais dano e quantos críticos).
- Passe o mouse sobre uma condição (Queimadura, Medo, ATQ↑…) para ver o que ela faz.
- **Assumir** (janelas Fichas e Sessão) abre a tela de um jogador para o mestre jogar por ele, sem fila de pedidos. Personagens sem dono o mestre controla pela janela Batalha e pela ficha.

## Atalhos no PC
- Mapa: roda do mouse = zoom, botão do meio ou Espaço+arrastar = mover, `0` = recentrar
- Alt+arrastar = régua em casas; duplo clique no mapa = ping para todos
- Clique direito no token = menu; duplo clique no token = abrir a ficha
- Batalha: `1`–`9` = comandos, Tab = trocar alvo, Enter = chat, Esc = fechar/cancelar
- Mestre: Shift+clique em Exploração/Batalha/Preparo salva o arranjo de janelas atual

## Balanceamento
Os números ficam em `R` no topo de `src/consts.js`. `node tools/sim.js 500` simula batalhas 4x4 com as regras reais;
`VJ_RULES='{"enemyAttr":45}' node tools/sim.js` testa uma variação sem editar o código.

## Testes e segurança dos dados
- `npm test` roda os testes de regras e permissões; `npm run sim` roda o simulador de balanceamento.
- `npm run dev` sobe uma cópia de desenvolvimento em `http://localhost:3210/gm` (chave `dev`), com dados separados em `data-dev/`, sem túnel: dá para testar à vontade sem tocar na campanha de verdade.
- A cada início o servidor copia `data/state.json` para `data/backups/` (guarda as 30 últimas, somando as automáticas e as manuais).
- Fechar a janela do programa ou apertar Ctrl+C grava o que ainda estava pendente antes de sair.
- Abrir, importar ou restaurar uma campanha é tudo-ou-nada: se o arquivo não puder ser aberto, a campanha em uso continua exatamente como estava e o mestre vê o motivo. Um arquivo editado à mão, com campos faltando ou de tipo errado, é consertado ao abrir.
- Campanha importada de fora é limpa antes de entrar: só passam chaves simples, skills e itens no formato do editor, links válidos e um histórico sem marcação.
- O mestre tem o botão **Desfazer** (até 20 ações) na janela Cena.

## Rede e segurança
- O estado enviado a cada mudança ficou ~85% menor: as definições de skills e itens (a maior parte) só vão quando mudam. Páginas, scripts e o three.js vão comprimidos e o navegador só baixa de novo o que mudou.
- As páginas só executam scripts do próprio servidor (Content-Security-Policy), não abrem dentro de outros sites e não vazam o endereço da sessão para links externos.
- Chave do mestre e senhas são comparadas em tempo constante. Conexões que não fazem login em 30 s, ou que param de responder, são encerradas.
- Uma mensagem malformada ou um erro numa ação não derruba o servidor: o erro vai para o console e a mesa continua.

## Conteúdo padrão
`content.js` gera a grade de skills (128 nós), o catálogo de itens (66, com materiais de forja), o bestiário (22 inimigos + 9 chefes), 4 cenas de exemplo com mapa e loja própria, e os veículos de perseguição.
Campanhas já salvas mantêm o conteúdo antigo: use **Restaurar padrão** nas janelas Skills, Itens e loja ou Cena (bestiário) para carregar o novo.

## Vínculos e personagens base
Cada caçador tem um ou mais **Vínculos** (Kagutsuchi, Susanoo, Atlas, Indra, Fuhaku, Amaterasu, Tsukuyomi, Shukketsu, Hiruko). Ele só aprende o tronco Marcial e as skills dos próprios Vínculos, e resiste ao elemento deles. O mestre concede Vínculos na aba **Mestre** da ficha.
A árvore (581 nós: 60 por Vínculo em 6 ramos + 41 marciais; veja `REVISAO-ARVORE.md`) fica em `tree.js`; `content.js` só a distribui na grade.
Campanha nova começa com Shinkai (Indra), Mikhail (Fuhaku) e Thomas (Hiruko), sem dono: o mestre liga cada um a uma conta na janela **Sessão**.

## Mapas
Na janela **Cena** o mestre cola um link ou envia uma imagem, usa **Recortar área** para escolher o trecho exibido, ajusta **Casas na largura** e o deslocamento da grade para casar com a arte, e pode **Fixar minha vista para todos**.

## Bestiário e migração
A janela **Bestiário** do mestre tem cartões com busca e filtros, criação em quantidade e por nível, encontros salvos, contratos e edição de modelos (abre a ficha do modelo).
Quando `tree.js` muda, o servidor troca a grade ao iniciar: skills aprendidas ficam se o nome ainda existir; as que sumiram devolvem o XP. Edições feitas na janela Skills são substituídas nessa troca.

## Dificuldade e criação de inimigos
Na janela **Bestiário**, "Criar sob medida" gera um inimigo pelo elemento, papel (bruto, ágil, conjurador, suporte) e patente (lacaio, comum, elite, chefe); os números saem do poder do grupo que está na cena. "Encontro automático" monta um grupo inteiro por dificuldade.
Os parâmetros ficam em `R.rank`, `R.diff` e `R.grow` no topo de `server.js`. Para medir: `node tools/sim.js 200 enc` (encontros) e `node tools/sim.js 200 boss` (chefes).

## Requisitos e bifurcações da árvore
Em cada ramo de 10 nós, os quatro primeiros são o tronco; do nó 4 saem o caminho A (atributo principal do Vínculo) e o caminho B (atributo secundário). As entradas dos caminhos e o nó final têm requisito de atributo (`rq` em `tree.js`).
Sanidade em 0 é Colapso: o personagem ataca os próprios aliados até recuperar Sanidade. Quem perde um turno por controle fica imune a novo controle por dois turnos.

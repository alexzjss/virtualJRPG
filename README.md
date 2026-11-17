# virtualJRPG
Mesa virtual de RPG com regras próprias (d100, CTB, Aura/Sanidade/Limite).

    npm install && npm start        # GM_KEY=suachave PORT=3000 VJ_TUNNEL=0 opcionais

**Jeito rápido, sem executável:** dê dois cliques em `iniciar.bat` (Windows) ou rode `./iniciar.sh` (Linux/macOS). Os scripts instalam as dependências na primeira vez, criam a chave do mestre em `data/gm-key.txt` e sobem o servidor com o túnel do Cloudflare. Precisam do Node.js 22 ou mais novo.

- `/gm` — painel do mestre (a chave é sorteada na primeira vez e fica em `data/gm-key.txt`; para usar a sua, defina `GM_KEY`). A janela **Sessão** cria as contas e copia o convite.
- `/player` — fichas do jogador (login e senha criados pelo mestre)
- `/table` — mesa compartilhada (mapa 2D + batalha JRPG), somente leitura; entra com a conta de um jogador ou login `mestre` + chave
- `docs/index.html` — página de entrada opcional (GitHub Pages). Só é usada se você definir `VJ_PORTAL`; sem isso o convite já leva direto ao link do túnel e nada precisa ser publicado
- `/painel` — as três telas lado a lado (mestre, jogador e mesa) para acompanhar e mexer em tudo ao mesmo tempo; cada quadro é a tela real, então o que muda em um aparece nos outros na hora. Pede a chave do mestre, o nome e a senha do jogador uma vez e usa `⤢` para ver uma tela inteira

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
- **Ctrl+K** (mestre): busca rápida de painéis, cenas, fichas, ações, sons e inimigos; "Restaurar os painéis" volta ao arranjo padrão. Tecla **?**: lista de atalhos.
- Histórico com filtro (tudo, conversa, rolagens) e hora de cada linha ao passar o mouse.
- O jogador é avisado quando chega a vez dele (aviso, som, vibração e título da aba); o mestre vê na aba quantos pedidos esperam.
- Mudança de cena mostra o nome da cena em destaque para jogadores e mesa.
- **Mestre em painéis fixos:** as janelas viraram abas em quatro docas (duas à esquerda, duas à direita). Arraste uma aba para outra doca; arraste a borda de uma lateral para mudar a largura. O arranjo fica salvo no navegador. Bestiário, Skills, Itens, Catálogo, Forja e as fichas abertas se abrem por cima do centro (⇤ encolhe para a doca; Esc fecha a ficha). Em batalha o centro mostra o palco em cima, a barra de ações do turno (mesma lista do jogador, teclas 1–9) e o mapa embaixo, com divisor arrastável.
- **Menos botões:** a Cena deixa à mostra a batalha (botão principal), personagens, descanso, cenas, clima e névoa; mapa, grade, recursos e fundo da batalha ficam em seções **Mais…** (a que estiver aberta é lembrada). Nos cartões de Fichas, **⋯** (ou botão direito) abre Ver como, Assumir, Tirar do mapa, Salvar no bestiário e condições; as ações em lote só aparecem com fichas selecionadas.
- **Combate encenado** (cerca de 1,5 s por ação, igual para mestre, jogadores e mesa): o dado vira um número que gira; Crítico e Fraqueza ganham um corte com o retrato; Limite e Expansão de Domínio, uma cena curta com o retrato (ou a letra e o kanji do Vínculo); Quebra estilhaça, o nocaute derruba o cartão; o turno inimigo escurece o palco com a faixa vermelha; a batalha abre com uma entrada e termina numa tela de resultado (XP, ouro, espólios, dano, críticos e nocautes de cada herói). Condições viram ícones animados e a ordem de turnos traz mini retratos.
- **Comando do jogador** em lista inclinada: `1`–`9` escolhem o comando, ↑/↓ andam na lista de skills ou itens, ←/→ trocam o alvo (seta sobre o cartão no palco) e Enter age. Fora do combate, XP, ouro, skill e item ganhos aparecem num selo animado.
- Mestre: arrastar uma imagem para a tela troca o mapa (ou o retrato, se soltar sobre uma ficha) e um áudio vira trilha.

## Organização do código
- `server.js` é só a entrada. `src/config.js` (caminhos, chave), `consts.js` (tabelas de regras), `state.js` (estado, migrações, gravação), `rules.js` (combate, inimigos, fila), `handlers.js` (ações dos clientes), `net.js` (HTTP e WebSocket), `auth.js`, `seed.js`, `campaign.js` (campanhas, cópias, diário, pacotes) e `media.js` (som e extras do mapa).
- `public/js/`: `nucleo.js` (constantes, login, conexão), `sessao.js`, `palco.js` (batalha e mapa), `mestre.js` (painéis do mestre), `paginas.js` (telas do jogador), `tela.js` (desenho), `coreo.js` (coreografia do combate: dados, cortes, cutscenes, resultado), `docas.js` (painéis fixos do mestre, só em `gm.html`), `extras.js` (Campanha, Som, marcadores), `ux.js` (diálogos, ferramentas do mapa, busca rápida, ajuda) e `eventos.js`. São scripts comuns carregados nessa ordem.

## Pedidos e aprovação do mestre
Rolagem de atributo, ação de combate (ataque, skill, item), aprender skill, itens fora de combate (usar, equipar, comprar, vender, forjar, descartar) e ações de acampamento do jogador viram **pedidos**. Mover o token e passar a vez não pedem aprovação.
- O mestre vê os pedidos numa faixa fixa no alto: **Aprovar** (Enter), **Negar** (Delete), negar com motivo, bônus ou penalidade (−20 a +20) e, nas rolagens, **Secreta**.
- "Aprovar sozinho" liga ou desliga a aprovação por tipo (rolagens, combate, skills, itens, acampamento).
- Cada jogador tem um pedido por vez e pode cancelar. Pedido de combate some se a vez passar.
- HP, Aura, Sanidade e Limite só o mestre altera.

## Ferramentas do mestre
- No painel **Fichas**, clique em qualquer número para editar (aceita `+5` ou `-12`). Clique nas fichas para selecionar e aplique dano, cura, Aura, Sanidade, XP, ouro, condição ou item a todas de uma vez.
- Na ficha aberta: clique no número do atributo para editar e na sigla para rolar; busca por nome para entregar itens e dar ou tirar skills sem custo.
- **Ver como** abre a tela de um jogador em outra aba, só para olhar.

## Batalha: fundo, intensidade e efeitos
- Na janela **Cena**, "Fundo da batalha" escolhe um tema pronto (Rubro, Noite, Floresta, Brasa, Gelo, Vazio, Santuário, Tempestade), o mapa da cena ou uma imagem própria (link ou envio). Vale por cena.
- O palco muda com o estado do combate: grupo ferido deixa o fundo mais vermelho e rápido ("tensão"); grupo no limite, herói caído ou chefe de pé vira "perigo".
- Cada ação mostra os dados num painel (o que era preciso tirar e o veredito) e só então o palco aproxima em quem age e nos alvos, com o golpe, o número e o carimbo de crítico ou fraqueza.
- Na vez do jogador, o primeiro inimigo de pé já vem escolhido como alvo. Ninguém gasta o turno golpeando quem já caiu.
- Quando o último inimigo cai, o mestre recebe um aviso e o botão **Vitória** pisca. A mensagem de vitória aponta o destaque da batalha (quem causou mais dano e quantos críticos).
- Passe o mouse sobre uma condição (Queimadura, Medo, ATQ↑…) para ver o que ela faz.
- **Assumir** (janelas Fichas e Sessão) abre a tela de um jogador para o mestre jogar por ele, sem fila de pedidos. Personagens sem dono o mestre controla pela barra de ações sob o palco e pela ficha.

## Atalhos no PC
- Mapa: roda do mouse = zoom, botão do meio ou Espaço+arrastar = mover, `0` = recentrar
- Alt+arrastar = régua em casas; duplo clique no mapa = ping para todos
- Clique direito no token = menu; duplo clique no token = abrir a ficha
- Batalha: `1`–`9` = comandos, Tab = trocar alvo, Enter = chat, Esc = fechar/cancelar
- Mestre: arrastar as abas entre as docas monta o arranjo, salvo no navegador

## Balanceamento
Os números ficam em `R` no topo de `src/consts.js`. `node tools/sim.js 500` simula batalhas 4x4 com as regras reais;
`VJ_RULES='{"enemyAttr":45}' node tools/sim.js` testa uma variação sem editar o código.

## Testes e segurança dos dados
- `npm test` roda os testes de regras e permissões; `npm run sim` roda o simulador de balanceamento; `npm run ui` abre o jogo no Chromium (Playwright) com mestre, jogadores e mesa e confere batalha, pedidos, acampamento, Ofícios e celular.
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
`content.js` gera a grade de skills (1727 nós, numa grade de 111×111), o catálogo de itens (189, com 108 armas, flechas e materiais de forja), o bestiário (22 inimigos + 9 chefes + o trio da Tempestade Ígnea), 4 cenas de exemplo com mapa e loja própria, e os veículos de perseguição.
Campanhas já salvas mantêm o conteúdo antigo: use **Restaurar padrão** nas janelas Skills, Itens e loja ou Cena (bestiário) para carregar o novo.

## Vínculos e personagens base
Cada caçador tem um ou mais **Vínculos** (Kagutsuchi, Susanoo, Atlas, Indra, Fuhaku, Amaterasu, Tsukuyomi, Shukketsu, Hiruko). Ele só aprende o tronco Marcial e as skills dos próprios Vínculos, e resiste ao elemento deles. O mestre concede Vínculos na aba **Mestre** da ficha.
A árvore (1727 nós, contando as cartas do Canva e a leva 2; veja `REVISAO-ARVORE.md` e `ARVORE-SISTEMAS.md`) fica em `tree.js` e na pasta `arvore/`; `content.js` só a distribui na grade.

## Árvore expandida: transformações, rituais, votos e mais
**Comandos de ação:** na batalha, alguns golpes pedem a mão do jogador. Contra golpes anunciados (⚠) e golpes físicos de alvo único, um anel fecha na tela do alvo: apertar no fim exato **apara** (gasta Aura, devolve recurso e deixa o inimigo Exposto), um pouco antes **esquiva** de graça. Golpes de várias batidas pedem um aperto por batida, e aparar todas devolve um contra-ataque; a tecla C abre o **Choque de poderes**. No ataque, técnicas marcadas abrem minigames (golpe no tempo, martelar, segurar e soltar, sequência de setas, ritmo, mira e desenhar runa) que rendem bônus; ignorar nunca tira dano. Detalhes em `ARVORE-SISTEMAS.md`; `node tools/dev-cmd.js` sobe uma luta de demonstração da defesa.

Além de dano, cura e condições, os nós agora têm efeitos compostos e sistemas próprios: transformações (uma por vez, com dreno por turno e efeito colateral), golpes concentrados, multi-golpe e ricochete, roubo de vida, detonar condições, execução, escudo, regeneração, purificar, reerguer caídos, contra-ataque, reflexo, esquiva, provocar, guarda-costas, selos que explodem depois, invocações que agem sozinhas, técnicas em dupla, votos e restrições, rituais em círculos com versões Discente e Verdadeiro, e passivas com gatilho. A descrição mecânica de cada nó aparece na grade.
- Todos aprendem o tronco **Aura** (seis categorias em hexágono: a primeira aprendida vira a natureza do personagem; as outras rendem menos e custam mais XP).
- O tronco **Ocultismo** e os nós mais fortes pedem um **Despertar**, que o mestre concede na aba Mestre da ficha (lá também dá para trocar a natureza de Aura).
- Rituais gastam Aura e Sanidade; um **Componente Ritualístico** no inventário corta a Sanidade pela metade.
- Referência completa das mecânicas e da notação dos nós: `ARVORE-SISTEMAS.md`.
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

## Sistemas de batalha e de mesa novos
Veja `ARVORE-SISTEMAS.md` (mecânicas) e `DECISOES-SISTEMAS.md` (o que foi decidido).
- **Batalha:** barra de Quebra (chefes e elites), Cadeia, Ataque Total, Passar a Vez, Coragem, Tensão, clima por cena, 8 reações elementais, Expansão de Domínio (nó final de cada Vínculo) e técnicas em trio.
- **Mesa:** Aflição e Virtude quando a Sanidade zera, Vantagem e Desvantagem (o mestre escolhe ao aprovar a rolagem), laços entre personagens que sobem no "conversar" do acampamento.
- **Árvore:** slots de passivas (4, mais 1 a cada 100 XP gasto; troca no acampamento), fusões entre Vínculos vizinhos, nós-chave, sinergias Aura × Vínculo, ponte Aura ↔ Ocultismo, busca por efeito e função, caminho até o nó, plano e builds salvas.
- `npm run audit` confere a árvore (nomes repetidos, XP, poder fora da curva, nomes que não cumprem o efeito).

## Armas
Cada personagem empunha uma arma, e ela define o **ataque básico** (atributo, tempo, golpes, área, condição com chance, perfuração, efeitos e bônus enquanto empunhada) e traz **técnicas próprias**, que aparecem na aba **Arma** do menu de batalha só enquanto ela está equipada. Onze tipos (lâmina, haste, arma de fogo, punhos, arma pesada, foco místico, corrente, arremesso, arco, **escudo** e **instrumento**), o traço **em par**, o **bloqueio** dos escudos, cinco categorias (básica, especial, elemental, lendária, maldita) e quatro níveis. Armas de distância não sofrem contra-ataque; arcos usam flechas. Cada tipo tem trilha na árvore Marcial. Todo modelo (85) tem uma **arma básica pronta** no catálogo e à venda em lojas temáticas. O mestre monta armas novas na janela **Forja de armas** a partir de um modelo, **duplicando** uma arma pronta, aplicando **pacotes de traços** (até 3: sangrante, veloz, de um elemento, qualidade…), criando **variantes elementais** com 1 clique ou **importando e exportando** `.json`, sempre com prévia e régua de orçamento. Detalhes em `ARMAS.md`; `node tools/sim.js 300 armas` mede o ataque de cada arma no motor.

## Forja (aba Forja do inventário)
Duas formas de forjar, ambas fora de batalha e com aprovação do mestre:
- **Forja elemental (aba Forja):** gasta **essências** do elemento da peça mais metade do preço em ouro. Arma = 3 essências, relíquia = 5. Com o Ofício **Forja** (nó de **Economia de Essência**) a arma passa a custar **2** essências. A aba lista só o que a ficha pode forjar e mostra `essências possuídas/necessárias` e o ouro.
- **Forja dos Ofícios (aba Ofícios → Forja):** receitas com materiais da coleta e das cenas, Têmpera (+3 no máximo), até 3 engastes com runas, Liga de duas essências, Assinatura do Ferreiro e Arma Viva. Falha comum perde 1 material; desastre perde metade. Detalhes em `PERICIAS.md`.

## Inimigos com IA opcional
Cada entrada do bestiário pode trazer o campo `ia` (desligado por padrão): `dom` (Expansão de Domínio, 1 vez por combate), `defend` e `focus` (chance de Defender com vida baixa e de Concentrar Tensão com vida alta) e `trio` (técnicas em trio). Hoje: Domínio em Leviatã do Porto, Condessa Escarlate e Filho de Hiruko (só para grupos veteranos); Concentrar/Defender em alguns chefes; trio no Oni de Brasa, Tengu do Vendaval e Raijū. `iaExtra: false` em `R` (ou `VJ_RULES='{"iaExtra":false}'`) desliga tudo. A Cadeia continua só dos heróis. Números e medições em `DECISOES-SISTEMAS.md`.

## Ofícios (perícias)
Aba própria na ficha, separada da árvore de combate. O mestre concede a **Iniciação** em cada uma das 15 perícias (Forja, Alquimia, Culinária, Medicina, Caça, Investigação, Lábia, Pilotagem, Engenharia, Ladinagem, Sobrevivência, Talismãs, Adestramento, Música, Jogos de Azar). Os nós custam **Pontos de Ofício**, ganhos em sucessos nas rolagens da perícia ou dados pelo mestre. Cada perícia tem 3 graus (Aprendiz, Oficial, Mestre) e a rolagem é d100 contra o melhor atributo dela, mais 10/20/30 pelo grau. Detalhes em `PERICIAS.md`.
Na janela Cena o mestre marca os **recursos da cena** (o que a coleta acha) e o clima.
O mestre edita receitas, perícias e nós na janela **Catálogo de ofícios** (sem mexer no código; as edições ficam salvas na campanha). Testes narrativos (Arrombar, Intimidar…) vão para o **diário de testes** da ficha, e o mestre narra o resultado ao aprovar ou depois. A loja vende ingredientes básicos e munição; as runas são receitas da Forja.

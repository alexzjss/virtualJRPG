# UI Pincelada (mestre e jogador) e mira no palco — Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam caixas (`- [ ]`) para acompanhar.

**Objetivo:** trocar a UI do mestre e do jogador (dentro e fora do combate) pelo estilo Pincelada, fazer os recortes do palco 3D mirarem nos inimigos e remover o chat e a TV.

**Arquitetura:** o servidor ganha só o mínimo: chave `S.ui`, semente da batalha, reordenar a fila, medida da parte opaca do PNG, escudo pelo mestre e a remoção do chat e da TV. A lógica pura de mira vive em `public/js/mira.js`, testada no Node como o `PFX`. Todo o visual fica em `public/pincel.css` e `public/js/pincel*.js` e é ligado por `body.ui-pincel` quando `S.ui === 'pincel'`. A UI antiga continua funcionando enquanto a chave estiver desligada.

**Stack:** Node (ESM, sem dependências novas, só `zlib` nativo), HTML/CSS/JS sem build, `node --test`, Playwright no `tools/ui-smoke.js`.

**Referências:**
- Decisões: memória `reformulacao-ui-mira.md`, seção "Estilo escolhido".
- Protótipo aprovado: `.claude/mockups/estilos/pincel.{html,css,js}`, `comum.js`, `palco.js` e `base.css`. Servir com a config `mockup-estilos` (porta 3296).

## Divisão do trabalho

| Trilha | Quem | Tarefas | Arquivos que pode tocar |
|---|---|---|---|
| **B (backend e lógica pura)** | outro agente | B1–B7 | `src/*`, `server.js`, `tools/test*.js`, `public/js/mira.js` (novo), `public/table.html` (apagar), `GUIA-RODAR.md`, `README.md`; em `tools/ui-smoke.js`, só tirar a TV |
| **F (front, design e visual)** | esta sessão | F0–F9 | `public/**` exceto `public/js/mira.js`; `tools/ui-smoke.js` depois de B6 |

**Ordem e dependências:**
- B1 → F0.
- B2 e B7 → F1.
- B4 → F1, na parte de tamanho e direção.
- B3 → F5, para reordenar.
- B5 e B6 → F8.

Enquanto B1 não chega, o front testa com `localStorage.vj_ui = 'pincel'`. A trilha B pode rodar inteira em paralelo com F0–F4.

## Restrições globais

- **Nunca** usar `git stash`, `git checkout -- <arq>` nem `git restore`. Outras sessões editam o mesmo checkout.
- Commitar só os próprios arquivos (`git add <arquivos>`). Em arquivo misto, pegar só o próprio trecho com `git diff <arq> > p.patch`, editar o patch e rodar `git apply --cached p.patch`.
- Um commit por tarefa, em `main`, mensagem em português no estilo do repo (por exemplo `Pincelada: …` ou `Servidor: …`).
- Sem dependências novas no `package.json`.
- Textos de interface em português, frases curtas, sem caixa alta em rótulos.
- Palco: planos grandes a 1/4 com `scale(4)` e nenhum `filter` em camada 3D (memória `palco-camera-perf`).
- Fontes da Pincelada: Cormorant Garamond em nomes e comandos; uma sem serifa estreita só nos números (vida, custo, dano). A sem serifa estreita é a Barlow Condensed, que o jogo já carrega.
- `npm test` precisa passar ao fim de cada tarefa B. `npm run ui` precisa passar ao fim de F9.

## Foco de revisão

1. **Batalha de várias cenas ao mesmo tempo:** a semente, a mira e o reordenar valem por cena, e uma cena nunca muda a fila da outra. Teste em B2 e B3.
2. **PNG fora do comum** (paletado com tRNS, 16 bits, entrelaçado, sem alpha, JPEG ou WEBP): nunca derruba o servidor. Se não sabe medir, devolve `null` e o palco usa o tamanho antigo. Teste em B4.
3. **Alvo que cai no meio da mira:** quem mirava nele troca para o próximo vivo, e quem mira em outro não muda. Teste em B7.
4. **Chave ligada no meio da batalha:** a troca não recria o palco 3D nem perde a escolha em andamento no leque. Verificação em F0.
5. **Campanha salva antiga** com `S.tv`, linhas de chat no log e fichas sem `box`: carrega sem erro, o chat antigo some da vista e as fichas ganham `box` ao carregar. Teste em B4, B5 e B6.

---

## Trilha B — backend e lógica pura (outro agente)

### Tarefa B1: chave da UI para a mesa toda

**Arquivos:**
- Modificar: `src/state.js` (valor padrão), `src/handlers.js` (handler e `NOUNDO`)
- Teste: `tools/test.js`

**Interfaces:**
- Produz:
  - `S.ui: '' | 'pincel'`, presente na vista do mestre e dos jogadores;
  - handler `uiSet(c, { v })`, só para o mestre, que aceita apenas esses dois valores.

- [ ] **Passo 1: teste que falha**
  ```js
  test('uiSet: só o mestre troca a UI e todos veem', () => {
    H.uiSet(ana, { v: 'pincel' }); assert.equal(S.ui, '');
    H.uiSet(gm, { v: 'pincel' }); assert.equal(S.ui, 'pincel'); assert.equal(view(ana).ui, 'pincel');
    H.uiSet(gm, { v: 'xyz' }); assert.equal(S.ui, 'pincel');
    H.uiSet(gm, { v: '' }); assert.equal(S.ui, '');
  });
  ```
- [ ] **Passo 2:** `node --test tools/test.js` falha com "H.uiSet is not a function".
- [ ] **Passo 3:** implementar.
  - Em `state.js`, ao carregar: `S.ui ??= ''`.
  - O handler troca `S.ui` só quando `v` está em `['', 'pincel']`.
  - Pôr `'uiSet'` no `NOUNDO`.
- [ ] **Passo 4:** `npm test` passa.
- [ ] **Passo 5:** commit `Servidor: chave da UI Pincelada para a mesa`.

### Tarefa B2: semente da batalha

**Arquivos:**
- Modificar: `src/handlers.js` (`battle`, onde `S.battle` é criado, por volta da linha 269)
- Teste: `tools/test.js`

**Interfaces:**
- Produz: `S.battle.seed`, um inteiro de 1 a 2³¹−1 sorteado ao começar a batalha. Ele não muda até a batalha acabar e aparece na vista de todos.

- [ ] **Passo 1: teste**
  ```js
  test('batalha nasce com semente fixa e visível', () => {
    reset(); /* liga a batalha como os testes vizinhos fazem */
    const s = S.battle.seed; assert.ok(Number.isInteger(s) && s > 0);
    /* age uma vez */
    assert.equal(S.battle.seed, s); assert.equal(view(ana).battle.seed, s);
  });
  ```
  Também testar que outra cena com batalha própria tem a sua semente (ver `inScene` em `src/net.js`).
- [ ] **Passo 2:** o teste falha.
- [ ] **Passo 3:** implementar com `crypto.randomInt(1, 2 ** 31)` no objeto criado por `battle()`.
- [ ] **Passo 4:** `npm test` passa.
- [ ] **Passo 5:** commit `Servidor: semente da batalha para a mira`.

### Tarefa B3: mestre reordena a fila

**Arquivos:**
- Modificar: `src/handlers.js` (novo handler); usar `order`, `nextOf` e `delay` de `src/rules.js` (linhas 48–103)
- Teste: `tools/test.js`

**Interfaces:**
- Produz: `ordMove(c, { id, to })`, só para o mestre.
  - `to` é o índice desejado em `order()`, de 0 a 7.
  - Ajusta só `S.battle.ticks[id]`, para um valor entre os ticks dos vizinhos na posição `to`. Quando a pessoa age, o `delay` normal volta a decidir: vale só até ela agir.
  - Entra no histórico de desfazer (não vai no `NOUNDO`).

- [ ] **Passo 1: testes**
  - `ordMove leva o personagem ao índice pedido`: com 4 combatentes, `H.ordMove(gm, { id: X, to: 0 })` faz `order()[0] === X`. Com `to: 2`, faz `order()[2] === X`.
  - `jogador não reordena`: `H.ordMove(ana, …)` não muda `ticks`.
  - `depois de agir volta ao normal`: X agiu, então `ticks[X]` aumenta exatamente `delay(X)` em relação ao valor que tinha.
  - `não aceita morto, id fora da batalha nem to fora de 0..7`.
- [ ] **Passo 2:** os testes falham.
- [ ] **Passo 3:** implementar.
  - Calcular `o = order()` sem X.
  - Novo tick = média entre o tick de `o[to-1]` e o de `o[to]`.
  - Nas pontas, tick do primeiro − 1 ou do último + 1.
  - Ticks são números; podem ficar fracionários.
- [ ] **Passo 4:** `npm test` passa.
- [ ] **Passo 5:** commit `Servidor: mestre reordena a fila da batalha`.

### Tarefa B4: medida da parte opaca do PNG, direção da imagem e escudo pelo mestre

**Arquivos:**
- Criar: `src/png-box.js`
- Modificar:
  - `src/handlers.js` (`set`: campos `img`, `imgF`, `imgP`, `imgB`, `imgL` e `shield`);
  - `src/state.js` (migração ao carregar).
- Teste: `tools/test.js`. O teste gera os PNGs em memória com um mini codificador feito com `zlib.deflateSync`.

**Interfaces:**
- Produz:
  - `opaqueBox(buf: Buffer) -> { x, y, w, h, W, H } | null`
    - Considera opaco o pixel com alpha ≥ 16.
    - Suporta profundidade 8 e 16 nos tipos de cor 0, 2, 3 (com tRNS), 4 e 6.
    - Sem canal alpha, devolve o quadro inteiro.
    - Devolve `null` para entrelaçado, buffer que não é PNG, `W*H > 16e6` ou qualquer erro. Nunca lança exceção.
  - `boxOfUrl(url) -> box | null`: lê `/uploads/…` da pasta de dados e `/personagens/…` ou outros de `public/`. Ignora URL externa, devolvendo `null`.
  - `ch.box = { img?, imgF?, imgP?, imgB? }`, preenchido no `set` desses campos. Imagem vazia apaga a chave.
  - `ch.imgL: boolean`, "minha imagem olha para a esquerda", que o dono ou o mestre podem mudar.
  - `set` com `f: 'shield'`, só do mestre: inteiro de 0 a `hpMax`.
  - Migração ao carregar: fichas com imagem e sem `box` são medidas uma vez.

- [ ] **Passo 1: testes**
  ```js
  test('opaqueBox: acha a caixa opaca', () => {
    const png = mkPng(10, 20, (x, y) => (x >= 2 && x < 7 && y >= 5 && y < 19) ? 255 : 0); // RGBA 8 bits
    assert.deepEqual(opaqueBox(png), { x: 2, y: 5, w: 5, h: 14, W: 10, H: 20 });
  });
  ```
  Outros casos:
  - paletado com tRNS;
  - 16 bits;
  - RGB sem alpha, que devolve o quadro todo;
  - entrelaçado, que devolve `null`;
  - `Buffer.from('lixo')`, que devolve `null`;
  - imagem toda transparente, que devolve `null`;
  - os 5 filtros (0–4) numa mesma imagem, um por linha.

  Testes de `set`:
  - `set imgF` com um PNG gravado em `VJ_DATA/uploads` preenche `ch.box.imgF`;
  - `set imgF ''` apaga a chave;
  - `set imgL true` vale para o dono e é ignorado vindo de outro jogador;
  - `set shield 30` só vale do mestre e corta em `hpMax`.
- [ ] **Passo 2:** os testes falham.
- [ ] **Passo 3:** implementar `opaqueBox`.
  - Ler os chunks IHDR, PLTE, tRNS e IDAT.
  - `zlib.inflateSync` nos IDAT concatenados.
  - Desfazer o filtro linha a linha (Paeth no 4) e varrer o alpha.
  - Depois ligar `boxOfUrl` no `set` e a migração no `state.js`.
- [ ] **Passo 4:** `npm test` passa.
- [ ] **Passo 5:** commit `Servidor: mede a parte opaca das imagens de batalha`.

### Tarefa B5: fim do chat no servidor

**Arquivos:**
- Modificar:
  - `src/handlers.js` (apagar `chat` nas linhas 598–608 e tirar `'chat'` do `NOUNDO`);
  - `src/net.js` (apagar `NOSCENE` na linha 229 e o `flood` de chat na linha 316; na vista, filtrar `kind === 'chat'` do log);
  - `src/campaign.js` (`KINDS_LOG`).
- Teste: `tools/test.js`. Ajustar ou apagar os testes antigos de chat e sussurro.

**Interfaces:**
- Produz: a mensagem `t: 'chat'` passa a ser ignorada. Rolagens continuam pelo handler `roll`. O log sem chat é o que o ícone de registro mostra.

- [ ] **Passo 1: testes**
  - `chat não existe mais`: `handle(ana, { t: 'chat', text: 'oi' })` não acrescenta nada ao log.
  - `log antigo com chat some da vista`: pôr à mão `{ kind: 'chat', … }` em `S.log` faz `view(ana).log` e `view(gm).log` virem sem ele.
- [ ] **Passo 2:** os testes falham.
- [ ] **Passo 3:** implementar.
  - Conferir com `grep` se a expressão do `/r` em `rules.js:846` ainda tem uso. Se não tiver, apagar.
- [ ] **Passo 4:** `npm test` passa.
- [ ] **Passo 5:** commit `Servidor: remove o chat; fica só o registro`.

### Tarefa B6: fim da TV no servidor

**Arquivos:**
- Modificar:
  - `src/handlers.js` (`tvSet`, `S.tv` nas linhas 34, 47 e 204–206, e o `NOUNDO`);
  - `src/net.js` (papel `table` nas linhas 122, 168, 175, 303–318 e 334; rota `/table`);
  - `src/state.js` (linha 123);
  - `tools/ui-smoke.js` (tirar o bloco da mesa/TV);
  - `GUIA-RODAR.md` e `README.md` (tirar a TV).
- Apagar: `public/table.html`.
- Teste: `tools/test.js` e `tools/test-cenas.js`.

**Interfaces:**
- Produz: só existem os papéis `gm` e `player`. Um login com `role: 'table'` recebe a mesma mensagem de papel inválido. `S.tv` não existe mais: a migração apaga o campo.

- [ ] **Passo 1: testes**
  - `login como table é recusado`, no estilo dos testes de rede em `tools/test-rede.js`.
  - `campanha antiga com S.tv carrega e perde o campo`.
- [ ] **Passo 2:** os testes falham.
- [ ] **Passo 3:** remover. `grep -rn "table\|\.tv\b\|tvSet" src server.js tools` não pode sobrar nada que fale da TV.
- [ ] **Passo 4:** `npm test` passa; `npm run ui` passa, sem o bloco da TV.
- [ ] **Passo 5:** commit `Servidor: remove a TV (table.html)`.

### Tarefa B7: lógica pura da mira

**Arquivos:**
- Criar: `public/js/mira.js` (IIFE como `palco-fx.js`, que exporta `globalThis.MIRA_R`)
- Teste: `tools/test.js` (`await import('../public/js/mira.js')`)

**Interfaces:**
- Produz:
  - `MIRA_R.targets(chars, { seed, locks = {} }) -> { [id]: targetId | null }`
    - `chars` é a lista de combatentes com `{ id, enemy, hp, dead }`.
    - Herói mira inimigo e inimigo mira herói; só miram e são mirados os vivos (`hp > 0 && !dead`).
    - Se `locks[id]` é um oponente vivo, ele é o alvo.
    - Senão, o alvo é o oponente vivo com o menor `hash(seed, id, opId)` (FNV-1a de 32 bits sobre `` `${seed}|${id}|${opId}` ``). Assim o alvo fica fixo até cair, e a morte de outro oponente não o muda.
    - Sem oponente vivo, o alvo é `null`.
  - `MIRA_R.faceLeft(selfX, targetX, imgL) -> boolean | null`
    - Diz se o recorte deve aparecer espelhado. A imagem padrão olha para a direita; `imgL` inverte.
    - `targetX < selfX` precisa olhar para a esquerda, então espelha se `!imgL`.
    - `targetX > selfX` espelha se `imgL`.
    - Diferença absoluta menor que 1 devolve `null` (mantém o que estava).

- [ ] **Passo 1: testes**
  - `mesmo alvo para a mesma semente`.
  - `trava vence o sorteio`.
  - `trava em aliado ou morto é ignorada`.
  - `alvo cai e só quem mirava nele troca`: com a semente 7, os heróis a e b e os inimigos x, y e z, tirar o alvo de a muda o alvo de a. Se o alvo de b era outro, b não muda.
  - `faceLeft`:
    - `faceLeft(100, 50, false) === true`;
    - `faceLeft(100, 50, true) === false`;
    - `faceLeft(50, 100, false) === false`;
    - `faceLeft(50, 50.5, false) === null`.
- [ ] **Passo 2:** os testes falham.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** `npm test` passa.
- [ ] **Passo 5:** commit `Palco: regra pura de mira (MIRA_R)`.

---

## Trilha F — front, design e visual (esta sessão)

Verificação de cada tarefa F:
1. Abrir `/gm` e `/player` no navegador do app, com a chave ligada.
2. Fazer capturas a 1600×900 e no celular.
3. Console sem erros.
4. `npm test` passando, porque não pode quebrar os testes puros.

O protótipo é a referência visual. Medidas e cores saem de `pincel.css`.

### Tarefa F0: base Pincelada e chave

**Arquivos:**
- Criar:
  - `public/pincel.css` (tokens, `.pc-traco`, `.pc-los`, `.pc-k`, máscara de pincel em SVG, folha de ouro, animação de pintar);
  - `public/js/pincel.js` (helpers `PC.traco(txt, o)`, `PC.losango(n, cls)` e `PC.pintar(root)`).
- Modificar:
  - `public/gm.html` e `public/player.html` (fonte Cormorant Garamond, css e js);
  - `public/js/tela.js` (aplica `body.classList.toggle('ui-pincel', S.ui === 'pincel' || localStorage.vj_ui === 'pincel')` a cada estado);
  - `public/js/docas.js` (opção do mestre "Interface Pincelada", que manda `uiSet`).

**Interfaces:**
- Consome: `S.ui`, de B1.
- Produz: `PC.traco(txt, { x, y, w, rot, k, cls, esq, extra }) -> string` e `PC.pintar(el)`.
  - `PC.pintar(el)` aplica a cascata de 120 ms por pincelada.
  - Com `prefers-reduced-motion`, aparece sem animação.

- [ ] Implementar.
- [ ] Ligar e desligar a chave no meio de uma batalha: o palco não pisca e a escolha no leque não se perde.
- [ ] Commit `Pincelada: base visual e chave da mesa`.

### Tarefa F1: recortes que miram e se integram

**Arquivos:**
- Modificar:
  - `public/js/palco3d.js` (`units`, `imgFit` e `formation`, só a reserva);
  - `public/js/palco-vida.js`;
  - `public/js/luz-corpo.js` (`facing` passa a usar a mira; tinta, luz de borda e sombra no shader);
  - `public/style.css` (classe `.esp` e o pulinho `passo`).

**Interfaces:**
- Consome:
  - `MIRA_R.targets` e `MIRA_R.faceLeft`, de B7;
  - `S.battle.seed`, de B2;
  - `ch.box` e `ch.imgL`, de B4.
- Produz:
  - `P3D.aimLocks()`, que devolve `{ [id]: tgtId }` a partir do `tgt` do leque, só do herói da vez e só nesta tela, e do alvo da última ação de cada um;
  - o recorte espelhado e o pulinho ao trocar de lado;
  - altura normalizada por `box.h / box.H` e pés em `(box.y + box.h) / box.H`, com `imgS` por cima;
  - a reserva em arco virado para o grupo oposto.

- [ ] Implementar.
- [ ] Verificar:
  - todos miram alguém;
  - travar a mira num inimigo vira o herói da vez;
  - matar um alvo faz quem mirava nele trocar;
  - os tamanhos de Shinkai e Mikhail ficam coerentes.
- [ ] Commit `Palco: recortes miram, tamanho pela parte opaca e reserva em arco`.

### Tarefa F2: HUD de combate do jogador

**Arquivos:**
- Criar: `public/js/pincel-hud.js`
- Modificar: `public/js/hud.js` (quando `ui-pincel` está ligado, delega ao `pincel-hud`)

**Interfaces:**
- Produz:
  - ordem com quem age agora e os 3 próximos (`timeline(4)`);
  - barra do chefe no topo com nome, vida, escudo e losangos de quebra; fraquezas e condições aparecem ao sobrevoar o chefe;
  - inimigo comum: nome e vida só com `:hover`, `.tgt` ou `.mirado`;
  - grupo completo no canto inferior direito;
  - ícone ☰ do registro no topo direito, que abre o log por cima;
  - fora da vez, Tab abre a própria ficha só para leitura.

- [ ] Implementar.
- [ ] Verificar com chefe e sem chefe (sem chefe, nada no topo).
- [ ] Commit `Pincelada: HUD de combate do jogador`.

### Tarefa F3: leque Pincelada

**Arquivos:**
- Modificar:
  - `public/js/leque.js` (desenho; o estado do leque não muda);
  - `public/js/cmd-skills.js` (grupos viram abas; cada skill vira pincelada com elemento, custo e afinidade; descrição ao lado).

**Interfaces:**
- Produz:
  - no menu do leque: Atacar, Skills, Itens e Limite, mais "Mais", que abre Defender, Concentrar, Coragem e Passar;
  - as teclas atuais continuam valendo.

- [ ] Implementar.
- [ ] Fazer uma batalha inteira só pelo teclado e outra só pelo mouse.
- [ ] Commit `Pincelada: leque de comandos e skills`.

### Tarefa F4: reações repintadas

**Arquivos:**
- Modificar: `public/js/palco-cmd.js`, `public/js/comandos.js` (só classes) e `public/pincel.css`

- [ ] Trocar o visual das faixas, anéis e letreiros para tinta e ouro, sem mexer no tempo das janelas.
- [ ] Verificar esquiva, aparar e um minigame de ataque.
- [ ] Commit `Pincelada: palco das reações em tinta e ouro`.

### Tarefa F5: cockpit do mestre no modo Combate

**Arquivos:**
- Criar: `public/js/pincel-mestre.js`
- Modificar: `public/js/mestre.js` (delegar com a chave) e `public/js/docas.js`

**Interfaces:**
- Consome: `ordMove`, de B3; `set` com `shield`, de B4; `set` com `hp`; `st`; `delChar`; `place`; `reqOk` e `reqNo`; `undo`; `weather`; `battle`.
- Produz:
  - barra de modos (Mesa, Mundo, Combate, Catálogo), faixa de heróis e selo de pedidos com contador;
  - leque do inimigo da vez no ombro dele;
  - ordem com 4 e "+N", que abre a lista inteira para arrastar e manda `ordMove`;
  - fila de pedidos fixa;
  - barra de ferramentas: inimigo novo, desfazer, clima, câmera, encerrar;
  - anel ao clicar num recorte (−10/+10 vida, condição, escudo, mover, remover, ficha);
  - painel de fichas deslizante com abas.

- [ ] Implementar.
- [ ] Verificar uma rodada inteira conduzida só pelo cockpit.
- [ ] Commit `Pincelada: cockpit do mestre em combate`.

### Tarefa F6: mestre nos modos Mesa, Mundo e Catálogo

**Arquivos:**
- Modificar: `public/js/mesa.js`, `public/js/docas.js`, `public/js/pincel-mestre.js` e `public/mesa.css`

- [ ] Fazer cada modo.
  - Mesa: cenas em cartões, arrastar heróis e "ver como".
  - Mundo: só moldura e estilo sobre o editor atual.
  - Catálogo: abas e busca, com a lista à esquerda e o editor à direita.
- [ ] Commit `Pincelada: mestre fora do combate`.

### Tarefa F7: menu de pausa do jogador

**Arquivos:**
- Criar: `public/js/pincel-menu.js`
- Modificar: `public/js/paginas.js` (delegar com a chave), `public/js/mundo-hud.js` (HUD do mundo só com retratos, vida e Aura) e `public/js/mandala.js` (mais leve)

**Interfaces:**
- Produz:
  - Tab ou Esc abrem o menu, com o mundo borrado atrás e a arte grande do herói;
  - abas Ficha, Skills, Itens, Ofícios e Diário, como no protótipo;
  - Skills com fixar (★), encaixes de passivas e próximos passos;
  - Itens e Ofícios com filtros e receita visual.

- [ ] Implementar.
- [ ] Verificar as 5 abas com dados reais.
- [ ] Commit `Pincelada: menu de pausa do jogador`.

### Tarefa F8: tirar o chat e a TV do cliente

**Arquivos:**
- Modificar os que o `grep -ln chat public/js` aponta: `anim-engine`, `docas`, `eventos`, `guia`, `hud`, `luz-perfis`, `luz`, `mundo-hud` (balões), `mundo3d-pecas`, `nucleo`, `paginas`, `palco3d`, `tela` e `ux`. Também os que o `grep` de TV aponta: `mesa.js`, `mundo-visao.js` e `paginas.js`.

**Interfaces:**
- Consome: B5 e B6.

- [ ] Remover a caixa de chat, os sussurros, os balões no mundo e os botões ou opções de TV.
- [ ] Commit `Remove o chat e a TV das telas`.

### Tarefa F9: fumaça e fechamento

**Arquivos:**
- Modificar: `tools/ui-smoke.js` (bloco "pincel": liga a chave e passa por combate, cockpit e menu)

- [ ] `npm test` e `npm run ui` passam.
- [ ] Fazer capturas finais.
- [ ] Commit `Pincelada: teste de fumaça`.
- [ ] Ligar a Pincelada como padrão só quando o usuário pedir.

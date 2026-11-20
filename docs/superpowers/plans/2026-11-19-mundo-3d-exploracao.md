# Mundo 3D explorável — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o mapa 2D por um mundo 3D isométrico em three.js. Os jogadores andam nele com WASD, e o mestre o constrói num grid 2D com o 3D ao vivo ao lado, incluindo objetos interativos, névoa automática, inimigos que patrulham e entrada na batalha atual.

**Architecture:** A lógica pura (pisos, colisão, visão) fica em scripts IIFE compartilhados (`globalThis.X`), lidos pelo navegador e pelo servidor (o servidor importa pelo efeito, como já faz com `public/rules.js`). O servidor guarda `sc.world` e `sc.draft`, valida o `walk` e transmite posições num canal `pos` próprio, que não passa pelo `push`. O cliente desenha num módulo ES three.js fora do `#app`, atualizado por diferença como o palco 3D. O palco CSS 3D do combate não muda.

**Tech Stack:** Node 22 (ESM, `node:test`), `ws`, three.js de `/vendor/three.module.js` (já servido), canvas 2D no editor e WebAudio por `som.js`.

**Spec:** `docs/superpowers/specs/2026-11-19-mundo-3d-exploracao-design.md`. Leia o spec antes de cada etapa; os números e as regras abaixo vêm dele.

## Global Constraints

- **Checkout compartilhado.** Outra sessão edita o mesmo checkout. Nunca use `git stash`, `checkout` ou `restore`. Commite só os seus arquivos; em arquivo misto, use `git add -p` ou `git apply --cached` só com o seu hunk.
- **Commits.** Vão direto no `main`, com ao menos um por etapa. A mensagem é em português e termina com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Chave de desenvolvimento.** Até a Task 9.1, o mundo só aparece com `VJ_MUNDO=1` no servidor ou `?mundo=1` na URL. Sem a chave, o jogo se comporta exatamente como hoje, e o `npm test` atual segue verde em toda etapa.
- **Plataforma.** Só PC. Celular (largura ≤ 700 ou toque sem teclado) não carrega o three.js.
- **Desempenho.** A meta é 60 fps na GTX 1650 e 30 no vídeo integrado (qualidade Baixa, `pixelRatio` 0,75), num mapa 64×64 de floresta `denso` à noite com 6 heróis, 10 inimigos e chuva.
- **GPU.** Nenhum plano 3D gigante e nenhum `filter` CSS sobre o canvas. Na batalha, o mundo para o loop e libera a GPU (Task 2.5).
- **Visual.** Contorno `INK #1c3038`. As cores vêm de terreno3d.js, e céu, lava e cristais não gradam (regra `!#hex`).
- **Vazamento.** Jogador e TV nunca recebem `draft`, objetos com `vis:'oculto'` sem `rev`, armadilhas sem `rev`, nem inimigos e NPCs fora da visão do grupo.
- **Rede.** `walk` nunca chama `push`. O `pos` agregado sai a cada 100 ms. Cada cliente envia no máximo 10 `walk` por segundo.
- **Contexto.** Todo código de servidor que lê `S.scene` ou `S.battle` fora de uma ação ou do `push` (temporizador, laço da IA, agregador) roda dentro de `inScene(sid, …)`.
- **Valores do spec:**
  - mapas novos têm até 64×64 por andar (padrão 40×30); migrados vão até 80;
  - interação a até 1,5 casa; percepção de armadilha a até 2 casas; diálogo visível num raio de 3; entrada na batalha a até 8 casas;
  - visão de 8, 6 e 4 casas, mais 2 da tocha (noite e caverna);
  - contato a menos de 0,8 casa;
  - IA a 5 Hz, alerta de 1 s e desistência depois de 6 s;
  - cutaway num raio de 4 casas, com toco de 25%;
  - giro da câmera em 250 ms;
  - estilhaço de cerca de 40 triângulos em 700 ms;
  - luzes: Alta 8 e Baixa 2;
  - `pixelRatio` de 0,75 a 1,5;
  - Auto começa em Média e desce se ficar abaixo de 50 fps por 3 s;
  - balão de 5 s;
  - desfazer do editor com 50 passos;
  - pincel de 1 a 7.
- **Teclas:**
  - WASD anda, relativo à câmera;
  - Shift corre (1,8×, detecção ×2); Ctrl agacha (0,5×, cone ×0,5); Espaço pula;
  - F dá o golpe no mapa; E interage;
  - **Q/R giram a câmera**;
  - Tab ou Esc abrem o menu de pausa;
  - 1–4 trocam de herói;
  - duplo clique faz ping.

## Review Focus

1. **Lag e teleporte.** Um cliente com 300 ms de lag manda vários `walk` de uma vez. Um saldo de velocidade com 20% de folga, somado pelo tempo real do servidor, aceita esse lote sem tranco, e um salto de 5 casas é recusado com `pos` de correção. Teste em Task 1.3.
2. **Herói dentro de algo.** Uma parede publicada ou uma porta fechada pode cair sobre a casa onde o herói está. Ele não pode ficar preso: o servidor o empurra para a casa livre mais próxima. Teste em Task 3.4.
3. **Troca de cena ou andar em movimento.** Um `walk` atrasado, com andar ou cena antigos, é ignorado e não move o herói de volta. Teste em Task 1.3.
4. **Cena migrada com linhas fracionárias e tokens fora da grade.** `rows` igual a 11,3, ou um token em `x = cols`, migra para dentro do mapa e não cai no abismo. Teste em Task 1.2.
5. **Rascunho apagado por edição concorrente.** O mestre publica enquanto uma porta do mundo publicado foi aberta por um jogador. A porta continua aberta, porque o estado dos objetos de condução vem do publicado. Teste em Task 3.4.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `public/js/mundo-pecas.js` (novo, IIFE → `globalThis.MPECAS`) | Tabela de pisos e arestas, codificação base64 e consultas de casa e aresta |
| `public/js/mundo-colisao.js` (novo, `MCOL`) | Velocidades, movimento com deslize, pulo e validação de segmento |
| `public/js/mundo-visao.js` (novo, `MVIS`) | Shadowcasting nas arestas, raios, bitsets |
| `public/js/mundo-modelos.js` (novo, `MMODELOS`) | Pacote padrão de trechos por tema |
| `src/mundo.js` (novo) | Migração, `world` e `draft`, handlers do mestre e de movimento, registro em `H` |
| `src/mundo-rede.js` (novo) | Agregador `pos`, filtro por cliente, canal `draft` |
| `src/mundo-obj.js` (novo) | `interact`, portas, baús, diálogo, gatilhos, armadilhas, escadas, portais |
| `src/mundo-ia.js` (novo) | Laço 5 Hz, A*, detecção, encontros, `abre` |
| `src/mundo-gerar.js` (novo) | Os quatro geradores com semente |
| `public/js/mundo3d.js` (novo, módulo ES → `window.MUNDO`) | Renderer, câmera, loop, `sync`, qualidade, liberar GPU |
| `public/js/mundo3d-pecas.js` (novo, ES) | Geometria por tema e tipo, instâncias, blocos de 16×16, material toon, contorno, cutaway |
| `public/js/mundo3d-atores.js` (novo, ES) | Recortes 2D (billboards), sombra, balanço, ícones dos pontos de interesse |
| `public/js/mundo3d-fx.js` (novo, ES) | Luzes, clima, textura de névoa, estilhaço |
| `public/js/mundo-input.js` (novo, script comum) | Teclado, previsão local, envio de `walk`, interpolação |
| `public/js/mundo-hud.js` (novo, script comum) | HUD, minimapa, prompt, objetivo, nomes e balões, diálogo, menu de pausa |
| `public/js/mundo-editor.js` (novo, script comum) | Grid 2D do mestre, ferramentas, inspetor, Publicar |
| `public/mundo.css` (novo) | Estilos da HUD, do menu e do editor (fora do `style.css`, que a outra sessão edita) |
| `tools/test-mundo.js` (novo) | Testes puros e de servidor do mundo |
| `src/state.js`, `src/net.js`, `src/handlers.js`, `src/config.js`, `server.js` | Ganchos mínimos (migração, `view`, `battle`, import) |
| `public/js/nucleo.js`, `tela.js`, `docas.js`, `mesa.js`, `terreno3d.js`, `*.html` | Mensagens novas, montagem, vista Mundo, export da paleta, tags `<script>` |

Rode `npm test` ao fim de cada task; ele precisa continuar verde. Adicione `tools/test-mundo.js` ao script `test` do `package.json` na Task 1.1.

---

## Etapa 1 — Dados e rede

### Task 1.1: Pisos e arestas compartilhados

**Files:**
- Create: `public/js/mundo-pecas.js`
- Modify: `src/config.js:1-3` (adicionar `import '../public/js/mundo-pecas.js';`), `package.json` (script `test`)
- Test: `tools/test-mundo.js`

**Interfaces:**
- Produces `globalThis.MPECAS`:
  - `TEMAS`: o mesmo array e a mesma ordem de `BBTEMAS` em `src/consts.js`;
  - `TIPOS = ['chao','trilha','denso','baixo','agua','fundo','perigo','vazio']`;
  - `code(tema, tipo) → 1 + TEMAS.indexOf(tema)*8 + TIPOS.indexOf(tipo)`;
  - `decode(code) → {tema, tipo} | null`, em que 0 é null (abismo);
  - `ARESTA = {nada:0, parede:1, porta:2, barreira:3, grade:4, cerca:5}`;
  - `pack(Uint8Array) → string base64` e `unpack(str, len) → Uint8Array`, iguais no Node e no navegador;
  - `newFloor(id, name, w, h, tema) → {id,name,w,h,cell,wallH,wallV,img:null}`, preenchido com `chao` do tema;
  - `cell(f, x, y) → code` (0 fora do mapa);
  - `edgeH(f, x, y)`: a aresta acima da casa (x, y), em `wallH[y*w + x]`, com y de 0 a h;
  - `edgeV(f, x, y)`: a aresta à esquerda, em `wallV[y*(w+1) + x]`, com x de 0 a w;
  - `blocksWalk(code)`: verdadeiro para `denso`, `baixo`, `fundo`, `vazio` e 0;
  - `jumpable(code)`: verdadeiro para `baixo`;
  - `edgeBlocksWalk(e)`: verdadeiro para 1, 3, 4, 5 e para 2 quando a porta está fechada;
  - `edgeBlocksSight(e, open)`: verdadeiro para 1, 3 e para 2 fechada (4 e 5 não bloqueiam);
  - `edgeJumpable(e)`: verdadeiro só para `e === 5`.
- Os arrays decodificados ficam em cache por andar (`f._c`, `f._h`, `f._v`), propriedades não enumeráveis que não vão para o JSON.

- [ ] **Step 1: Escrever o teste com falha.** Crie `tools/test-mundo.js` no estilo de `tools/test-cenas.js` (VJ_DATA temporário, import de `../server.js`) e escreva `test('pecas: código, decodificação e base64 ida e volta')`:
  - `code('floresta','chao') === 1`;
  - `decode(code('campo','vazio'))` é igual a `{tema:'campo', tipo:'vazio'}`;
  - `decode(0) === null`;
  - `unpack(pack(u), u.length)` é igual a `u` para um `Uint8Array` aleatório de 4096;
  - `newFloor('f0','T',40,30,'castelo')` tem `wallH` de 40×31 e `wallV` de 41×30;
  - `blocksWalk(code('praia','agua')) === false`;
  - `edgeJumpable(4) === false` e `edgeJumpable(5) === true`.
- [ ] **Step 2: Rodar e ver falhar.** `node --test tools/test-mundo.js` deve falhar com `MPECAS is undefined`.
- [ ] **Step 3: Implementar** `public/js/mundo-pecas.js` como IIFE `(g => { … g.MPECAS = {…}; })(globalThis)`. Use base64 com `btoa` e `atob` (existem nos dois ambientes desde o Node 16).
- [ ] **Step 4: Rodar e ver passar.** `npm test` passa.
- [ ] **Step 5: Commit** `Mundo: tabela de pisos e arestas compartilhada`.

### Task 1.2: `world` na cena e migração

**Files:**
- Create: `src/mundo.js`
- Modify:
  - `src/state.js`, no laço de cenas da migração (linhas ~128-147): chamar `fixWorld(sc, sid)` depois de `sc.exits`;
  - `src/campaign.js` (onde `fixMedia` é chamado): também chamar `fixMundo()`;
  - `server.js`: `import './src/mundo.js'`.
- Test: `tools/test-mundo.js`

**Interfaces:**
- Produces, em `src/mundo.js`:
  - `fixWorld(sc, sid)`: cria ou conserta `sc.world` e `sc.seenW`, e conserta `sc.draft`.
  - `worldFromLegacy(sc) → world`: um andar `f0` com `w = Math.ceil(sc.cols)` e `h = Math.ceil(sc.rows)`, cortado em no máximo 80; tema `sc.bbg.split('-')[0]` se for um dos `TEMAS`, senão `'campo'`; `hora` igual a `sc.bbg.split('-')[1]` ou `'dia'`; `img = sc.bg ? {url: sc.bg, crop: sc.crop} : null`; `objs` com um `portal` por `sc.exits` (`{k:'portal', f:'f0', x, y, rot:0, vis:'visivel', auto:null, cfg:{to: e.to}}`, com id igual a `e.id`); `goal: ''`; `v: 1`; e `legacy: true`, que significa que ainda é refeito a partir do 2D.
  - `sc.seenW = { f0: base64 }`, com um bitset de `w*h` bits convertido de `sc.seen['x,y']`.
  - `posFromCell(ch)`: põe `ch.pos = {f:'f0', x: ch.x + .5, z: ch.y + .5, d: 0}`, limitado a `[0, w-.01]` e `[0, h-.01]`, e ajusta `ch.x` e `ch.y` para dentro do mapa.
  - `fixMundo()`: chama `posFromCell` em cada personagem que tem `x != null` e não tem `pos` válido. Garante `S.worldTpl ??= {}` e `S.auto.inter ??= false`.
  - `refreshLegacy(sid)`: se `world.legacy`, reconstrói o mundo a partir do 2D, preservando `v + 1`. É chamada pelos ganchos de `H.map`, `H.exitAdd` e `H.exitDel` (encapsule os originais como o `media.js` faz com `map0`).
  - `cellOf(pos) → [Math.floor(pos.x), Math.floor(pos.z)]`.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('migração: cena 2D vira world com piso de imagem, portais e névoa')`: cena com `cols: 20, rows: 11.3, bg: 'x.png', exits: [{x:3, y:4, to:B}], seen: {'2,2':1}`, depois `adopt` de um save com essa cena e um herói em `x: 20, y: 11`. Confira:
    - `world.floors[0].w === 20` e `.h === 12`;
    - `world.floors[0].img.url === 'x.png'`;
    - existe um objeto com `k: 'portal'` em (3, 4);
    - o bit (2, 2) de `seenW.f0` está ligado;
    - `ch.pos.x < 20` e `ch.x === 19`.
  - `test('migração: cena com 80 colunas fica com 80')`.
  - `test('migração: 2D muda enquanto legacy, world acompanha; depois de editar no 3D, não')`: `handle(gm, {t:'map', f:'bg', v:'y.png'})` faz `img.url === 'y.png'`; com `world.legacy = false`, outra troca não muda o `img`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** `src/mundo.js` e os ganchos.
- [ ] **Step 4: Rodar e ver passar** (`npm test`).
- [ ] **Step 5: Commit** `Mundo: world por cena e migração do mapa 2D`.

### Task 1.3: Colisão e `walk` validado

**Files:**
- Create: `public/js/mundo-colisao.js`
- Modify: `src/config.js` (import), `src/mundo.js` (handler `walk`), `src/handlers.js:21` (incluir `walk` em `NOUNDO`), `src/net.js:220` (incluir `walk` em `OFFSTAGE`)
- Test: `tools/test-mundo.js`

**Interfaces:**
- Produces `globalThis.MCOL`:
  - `SPEED = {a: 3.5, c: 6.3, g: 1.75}` em casas por segundo. A base 3,5 é escolha do plano; `c = 1.8×` e `g = 0.5×` vêm do spec.
  - `R = 0.3`: o raio do corpo, em casas.
  - `slide(f, objs, p, dx, dz) → {x, z}`: move o círculo, desliza nas arestas e nas casas bloqueantes, e não sai do mapa.
  - `segOk(f, objs, a, b, jump) → boolean`: verdadeiro se o segmento não cruza uma aresta que bloqueia o andar nem entra numa casa bloqueante. Com `jump`, permite cruzar uma única aresta `cerca` ou casa `baixo` de até 1 casa.
  - `doorOpen(objs, f, kind, x, y) → boolean`: consulta o `cfg.estado` da porta dona da aresta.
- `H.walk(c, m)` com `m = {id, sc, f, x, z, d, m, s, j}`. Ele **ignora** a mensagem quando:
  - `!can(c, ch)`;
  - `S.battle.active`;
  - `ch.frozen`;
  - `m.sc !== ch.scene` ou `m.f !== ch.pos.f`;
  - `m.s <= ch._s` (fora de ordem).
- Saldo de velocidade: `ch._t` guarda o último `Date.now()`, e a distância permitida é `SPEED[m.m] * 1.2 * min(dt, 1 s) + 0.25`.
- Se `segOk` falhar ou a distância passar do permitido, o servidor envia `{t:'pos', fix:[id, f, x, z]}` só para `c` e não move.
- Se aceitar: atualiza `ch.pos`. Quando `cellOf(pos)` muda, atualiza `ch.x` e `ch.y` e chama `onCell(ch)` (um gancho vazio por enquanto, que as Tasks 4 a 6 preenchem). Depois chama `markPos(ch)`.
- O modo tático limita os passos: com `sc.tatico`, a soma de casas por rodada vai em `ch.tatUse` e é recusada acima de `sc.tatico.n`.
- Mensagens do mestre:
  - `walkGm {id, sc, f, x, z}` teleporta sem validar (usada por Mover herói e Chamar todos);
  - `freeze {ids, on}`;
  - `tatico {n | null}`;
  - `tatNext`.
- `markPos(ch)` é exportada por `src/mundo-rede.js` (Task 1.4); até lá, use um stub que não faz nada.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('colisão: parede de aresta bloqueia, cerca só pulando, baixo só pulando, fundo nunca')`.
  - `test('colisão: slide desliza ao longo da parede em vez de parar')`: andar na diagonal contra uma parede vertical faz o z avançar.
  - `test('walk: aceita passo normal e lote atrasado de 300 ms; recusa salto de 5 casas com fix')`: use um cliente falso `{role:'player', name:'Ana', readyState:1, send: s => sent.push(JSON.parse(s))}`.
  - `test('walk: ignora mensagem de andar ou cena antigos e sequência repetida')`.
  - `test('walk: congelado não anda; tático recusa acima de n casas até tatNext')`.
  - `test('walk: troca de casa atualiza ch.x/ch.y')`.
  - `test('walk: não chama push')`: `src/net.js` passa a exportar `pushes()`, um contador que o `push` incrementa. A contagem não muda depois de 20 `walk`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** `mundo-colisao.js` e os handlers.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: colisão compartilhada e walk validado no servidor`.

### Task 1.4: Canal `pos`, projeção e chave de desenvolvimento

**Files:**
- Create: `src/mundo-rede.js`
- Modify: `src/net.js` (`view`: tirar `draft` de quem não é mestre e filtrar `world.objs` e personagens com `visFilter`; exportar um gancho `hooks.view`, se preferir); `src/config.js` (constante `MUNDO = process.env.VJ_MUNDO === '1'`)
- Test: `tools/test-mundo.js`

**Interfaces:**
- `markPos(ch)` põe o id num `Set` sujo por cena.
- `startPosLoop()` usa um `setInterval` de 100 ms. Para cada cena com ids sujos, dentro de `inScene(sid)`, monta `[[id, f, x, z, d, m], …]` (números com 2 casas) e envia `{t:'pos', sc, l}` a cada cliente cuja `sceneOfClient(c) === sid`. O mestre recebe todas as cenas. Antes de enviar, filtra com `canSee(c, ch)`.
- `canSee(c, ch) → boolean`:
  - o mestre vê sempre;
  - heróis aparecem sempre para o grupo;
  - inimigos e NPCs só se a casa deles estiver em `visNow(sid)` (Task 4.2). Até a Task 4.2, `visNow` devolve todas as casas.
- `visFilter(c, sc) → world` devolve uma cópia rasa sem os objetos `vis:'oculto'` que não têm `rev`, sem `armadilha` sem `rev` e sem `inimigo` fora de `canSee`. Também devolve `seenW`. Para quem não é mestre, `draft` vem `undefined`.
- `S.mundo` (booleano projetado, não salvo) vale `MUNDO`. O cliente liga o mundo se `S.mundo || /[?&]mundo=1/.test(location.search)`.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('pos: 10 clientes a 10 Hz geram um pos por cena a cada ~100 ms e nenhum push')`: use timers reais e `await new Promise(r => setTimeout(r, 350))`; confira entre 3 e 4 mensagens `pos` por cliente.
  - `test('pos: cliente de outra cena não recebe')`.
  - `test('view: jogador não recebe draft nem objeto oculto sem rev; mestre recebe')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** `startPosLoop` é chamado em `start()` do `net.js` ou no import de `src/mundo.js`, com `unref()` no intervalo para não segurar o processo dos testes.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: canal pos agregado e projeção sem rascunho`.

---

## Etapa 2 — Motor 3D

### Task 2.1: Esqueleto three.js, câmera e montagem

**Files:**
- Create: `public/js/mundo3d.js`, `public/mundo.css`
- Modify:
  - `public/player.html`, `gm.html`, `table.html`: adicionar `<link rel="stylesheet" href="/mundo.css">`, mais os scripts comuns `mundo-pecas.js` e `mundo-colisao.js` antes de `tela.js`, e `<script type="module" src="/js/mundo3d.js"></script>` no fim;
  - `public/js/tela.js`: quando o mundo está ligado, fora de batalha e no PC, o `#app` desenha um `<section class="mundo-slot" data-mundo>` no lugar de `map()`, e `render()` chama `window.MUNDO?.sync(S, {role, me})`;
  - `public/js/terreno3d.js`: só acrescentar no objeto exportado `paleta: {SKY, SKYT, CEIL, INK, SUN, COPAS_CEL, CRIST, grade: gradeAll}`, numa linha. Os nomes exatos estão no topo do arquivo; não mude mais nada nele.

**Interfaces:**
- `window.MUNDO`:
  - `sync(S, ctx)`;
  - `rot(+1 | -1)`;
  - `zoom(dir)`;
  - `pan(dx, dy)` e `panEnd()`;
  - `follow(id)`;
  - `screen(id) → {x, y, vis}`, para a HUD;
  - `pick(clientX, clientY) → {f, x, z}`, a casa clicada;
  - `pause()` e `resume()`;
  - `el`: o canvas.
- Câmera: `OrthographicCamera`, inclinação de 35°, guinada `45° + k·90°` com interpolação de 250 ms, e três zooms (`perto` 8 casas na altura da tela, `medio` 14, `andar` igual à maior dimensão + 2).
- O canvas é `position: fixed` no body, atrás do `#app`, e acompanha o retângulo do `[data-mundo]` por `getBoundingClientRect` a cada `sync`.

- [ ] **Step 1: Implementar** com um chão plano por andar (uma `PlaneGeometry` texturizada por `img` ou com uma cor), cubos de teste nas casas `blocksWalk` e a câmera.
- [ ] **Step 2: Verificar no navegador.** Rode `npm run dev` com `VJ_MUNDO=1` e abra `http://localhost:3210/player?mundo=1` no painel de navegador. Confira no console `window.MUNDO` definido e nenhum erro. No screenshot, o chão de uma cena migrada aparece com a imagem dela. Q e R giram em 90° e a roda alterna os três zooms.
- [ ] **Step 3: Rodar `npm test` e `npm run ui`**, que devem seguir verdes (sem a chave, nada muda).
- [ ] **Step 4: Commit** `Mundo 3D: esqueleto three.js, câmera isométrica e montagem fora do #app`.

### Task 2.2: Peças por tema com cel shading, blocos e cutaway

**Files:**
- Create: `public/js/mundo3d-pecas.js`
- Modify: `public/js/mundo3d.js`

**Interfaces:**
- `buildFloor(floor, tema0, hora, pal) → THREE.Group`, dividido em blocos `Group` de 16×16, cada um com `InstancedMesh` por (tema, tipo, variante).
- `setCutaway(group, heroWorldPos, camDir)` liga, no material, os uniformes `uCut` (posição) e `uCutR = 4.0` (casas). Vértices acima de 25% da altura, dentro do raio e entre a câmera e o herói, são achatados no shader de vértice (`onBeforeCompile`).
- **Material.** `MeshToonMaterial` com `gradientMap` de 3 tons (`DataTexture` 3×1, `NearestFilter`). O contorno é um casco invertido (`BackSide`, escala 1,04, cor `INK`) só em `denso`, `baixo`, paredes e portas.
- **Peças por tipo** (geometria low-poly em código, de 3 a 4 variantes cada):
  - floresta: árvore de copa em tufos (`COPAS_CEL`);
  - castelo: coluna e estante;
  - praia: palmeira e rocha;
  - neve: pinheiro nevado;
  - deserto: cacto e rocha;
  - caverna: estalagmite e `CRIST`;
  - ruínas: coluna quebrada;
  - pântano: árvore torta;
  - vulcão: rocha de basalto;
  - campo: arbusto.
  - Para todos: `baixo` é tronco, cerca ou caixa, conforme o tema; `agua` e `fundo` são planos com ondulação no shader; `perigo` é plano emissivo; as paredes de aresta são caixas finas de 0,2 casa com a textura do tema.
- A transição entre temas vizinhos é uma cor por vértice que mistura as duas cores do chão nas bordas.
- Use `pal.grade(hex, hora)` para tingir, e não grade as cores marcadas com `!`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador.** Abra um mapa de teste com os 10 temas lado a lado (gerado à mão em `data-dev` por um script temporário no scratchpad que chama `MPECAS`) e tire um screenshot de cada horário. O contorno e as cores precisam bater com os cenários do palco: compare abrindo o palco do mesmo tema.
- [ ] **Step 3: Medir.** Num mapa 64×64 com `denso` de floresta à noite, leia `renderer.info.render.calls` (alvo abaixo de 150) e o fps pelo contador interno (`MUNDO.fps()`, que deve ser exposto). Anote os números no commit.
- [ ] **Step 4: Commit** `Mundo 3D: peças dos 10 temas em cel shading, blocos instanciados e cutaway`.

### Task 2.3: Personagens em recorte 2D

**Files:**
- Create: `public/js/mundo3d-atores.js`
- Modify: `public/js/mundo3d.js`

**Interfaces:**
- `actor(ch) → THREE.Object3D`: um plano com a textura `imgF` ou `imgB` (enquadre `imgK.f` e `imgK.b`, escala `ch.imgS`). Sem imagem, usa a mesma ordem do palco: a função `imgSrc` de `palco3d.js` está exposta em `globalThis.PALCO3D?.imgSrc`; se não estiver, use `c.img` e depois uma silhueta.
- `updateActor(o, ch, dir, moving, mode, dt, camYaw)`:
  - costas se o cosseno entre a direção e o eixo da câmera passa de 0,3, e frente no resto;
  - espelha quando anda para a esquerda da tela;
  - balança 4% ao andar e poeira ao correr (8 partículas por segundo);
  - arco de 0,6 casa no pulo, em 400 ms;
  - sombra: um disco preto a 35%.
- `iconFor(obj) → THREE.Sprite`: ícone flutuante por tipo de objeto (veja a tabela da seção 6 do spec), sempre virado para a câmera, com oscilação de 0,1 casa.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador** com dois heróis (com e sem imagem) andando pelo `walkGm` do console do mestre. No screenshot, costas e frente trocam com a direção, e há sombra.
- [ ] **Step 3: Commit** `Mundo 3D: personagens em recorte 2D com frente e costas, sombra e balanço`.

### Task 2.4: Luz, clima e névoa no shader

**Files:**
- Create: `public/js/mundo3d-fx.js`
- Modify: `public/js/mundo3d.js`

**Interfaces:**
- `lights(scene, hora, tema, pal)`: uma direcional na direção `SUN` (convertida do eixo CSS, em que y negativo é para cima) e uma hemisférica, ambas tingidas pelo horário.
- `pointLights(floor, quality)`: luzes pontuais nas casas `perigo` de lava, nos cristais e nos braseiros (o castelo e as ruínas recebem um braseiro a cada 6 arestas de parede). Ficam reais as 8 mais próximas na Alta, 4 na Média e 2 na Baixa; as outras viram só um sprite emissivo.
- `torch(actor, on)`: ligada à noite e na caverna, com raio de 3 casas.
- `weather(kind)`: um `Points` que segue a câmera, para `chuva`, `neve`, `neblina`, `cinzas` e `brasas`, com 600, 300 e 120 partículas por qualidade.
- `fogTex(floor) → DataTexture` (w×h, R8), com 0 para escuro, 128 para lembrado e 255 para visível. O shader do chão e das peças lê essa textura: lembrado é dessaturado a 35% e escurecido a 55%; escuro é `#05070c`.
- `setFog(tex, seenBits, visBits)`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador** dia, tarde, noite e caverna, e chuva com 64×64. Screenshot de cada um.
- [ ] **Step 3: Commit** `Mundo 3D: luz por horário, luzes do tema, tocha, clima e névoa no shader`.

### Task 2.5: Qualidade e liberação da GPU na batalha

**Files:**
- Modify: `public/js/mundo3d.js`

**Interfaces:**
- `quality()` lê `document.documentElement.dataset.q` (`auto`, `alta`, `media` ou `baixa`) e ouve `vj-quality`.
  - Alta: `pixelRatio` 1,5, sombras ligadas, contorno ligado.
  - Média: 1,0, sem sombras, com contorno.
  - Baixa: 0,75, sem sombras e sem contorno nas peças `baixo`.
  - Auto: começa em Média e desce um nível se a média de 3 s ficar abaixo de 50 fps (e sobe se passar de 58 por 10 s).
- `pause()` roda `setAnimationLoop(null)` e libera as `WebGLRenderTarget`. Na Média e na Baixa, também chama `renderer.forceContextLoss()` e marca `lost = true`.
- `resume()` recria o renderer se `lost` estiver marcado e reconstrói a partir do último `S`.
- O `sync` chama `pause()` quando `S.battle.active` e `resume()` quando a batalha acaba.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar.** Entre numa batalha pelo mestre: o canvas do mundo some, e `luz.js` segue funcionando (golpe com bloom sem tela preta). Ao encerrar, o mundo volta na mesma posição.
- [ ] **Step 3: Medir FPS** na Alta e na Baixa, no mapa de referência (veja Global Constraints), e anote no commit.
- [ ] **Step 4: Commit** `Mundo 3D: qualidade Auto/Alta/Média/Baixa e GPU liberada durante a batalha`.

### Task 2.6: Entrada do jogador e interpolação

**Files:**
- Create: `public/js/mundo-input.js` (script comum, carregado depois de `mundo-colisao.js`)
- Modify: `public/js/nucleo.js:141-150` (tratar `m.t === 'pos'`: `window.MINPUT?.onPos(m)`)

**Interfaces:**
- `globalThis.MINPUT`:
  - `start()`, `stop()`;
  - `onPos(m)`: aplica `fix` e guarda as amostras dos outros;
  - `sel`: o herói selecionado, trocado por 1 a 4 entre os `can`;
  - `poseOf(id, now)`: interpola com 100 ms de atraso.
- O WASD é girado pela guinada da câmera. Shift e Ctrl definem o modo; Espaço liga `j:true` por 400 ms.
- A previsão local usa `MCOL.slide` a cada quadro. O envio de `walk` acontece a cada 100 ms enquanto há movimento e uma vez ao parar.
- O foco de texto (input, textarea ou contenteditable) desliga as teclas.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador** com dois jogadores no `/painel`: um anda e o outro vê o movimento liso. Bater numa parede desliza, e `fix` não aparece no console em movimento normal.
- [ ] **Step 3: Commit** `Mundo: WASD com previsão local, correr, agachar, pular e interpolação dos outros`.

---

## Etapa 3 — Editor do mestre

### Task 3.1: Operações de rascunho no servidor

**Files:**
- Modify: `src/mundo.js`, `src/mundo-rede.js`, `src/handlers.js:21` (incluir `wDraft`, `wPub`, `wDiscard`, `walkGm`, `freeze`, `tatico` e `tatNext` em `NOUNDO`; o editor tem desfazer próprio)
- Test: `tools/test-mundo.js`

**Interfaces:**
- `wDraft {sc, ops: Op[]}`, só do mestre. Na primeira operação, cria `sc.draft = structuredClone(sc.world)`. Os tipos de `Op`:
  - `{o:'cells', f, l:[[x, y, code], …]}`;
  - `{o:'edge', f, k:'h' | 'v', l:[[x, y, e], …]}`;
  - `{o:'obj', id, v: obj | null}`;
  - `{o:'floor', v: {id, name, w, h} | {id, del: true}}`;
  - `{o:'goal', v}`;
  - `{o:'tema', v}`.
- Toda operação valida os limites: `w` e `h` até 64 (o andar migrado mantém o tamanho dele), `code` válido, `e` de 0 a 5, `obj.k` na lista do spec, `cfg` limpo pelo mesmo `scrub` da importação de pacote, textos até 800 e diálogo até 60 nós.
- O mestre recebe o rascunho por `{t:'draft', sc, d}`, por `sendDraft(sid)`, só para clientes mestre e sem `push`. Isso vale tanto para `wDraft` quanto para a conexão nova do mestre.
- `wPub {sc}` faz `sc.world = draft`, `v++` e `legacy = false`. Mantém do mundo publicado o `cfg.estado` de portas, barreiras e alavancas, os baús abertos (`cfg.aberto`) e o `rev` dos objetos com o mesmo id. Por fim, apaga o rascunho e chama `push()`.
- `wDiscard {sc}` apaga o rascunho.
- `unstuck(sc)` roda depois do `wPub` e de uma porta que fecha: o herói cuja posição ficou bloqueada vai para a casa livre mais próxima (BFS), e esse herói recebe `fix`.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('rascunho: jogador não recebe; publicar aplica, sobe v e tira legacy')`;
  - `test('rascunho: limites recusam andar 65×65, código 99 e objeto de tipo desconhecido')`;
  - `test('publicar mantém porta aberta por jogador no publicado')` (Review Focus 5);
  - `test('publicar com parede sobre herói o empurra para casa livre')` (Review Focus 2).
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: rascunho do mestre, publicar e desencalhar heróis`.

### Task 3.2: Vista Mundo e grid 2D do editor

**Files:**
- Create: `public/js/mundo-editor.js` (carregado só em `gm.html`, depois de `docas.js`)
- Modify:
  - `public/js/docas.js:61` (a vista `mapa` passa a se chamar "Mundo" quando o mundo está ligado; mantenha o id `mapa` e a tecla M);
  - `public/js/docas.js:76` (o centro da vista `mapa` passa a ser `MEDIT.html()`, um `div` com dois slots e o divisor);
  - `public/js/tela.js:75` (com o mundo ligado, passa `MEDIT.html()` no lugar de `map()`);
  - `public/mundo.css`.

**Interfaces:**
- `globalThis.MEDIT`:
  - `html()`;
  - `mount()`: liga o canvas 2D;
  - `tool`, `floor`, `brush` (1–7), `tema`, `tipo`;
  - `ops(list)`: aplica localmente, envia `wDraft` e empilha o desfazer;
  - `undo()`, `redo()`: a pilha local tem 50 passos e guarda o inverso de cada operação.
- O grid 2D desenha a partir de `S.draft?.[sc]`, ou de `world` se não houver rascunho, sempre no canvas 2D: as casas com a cor do tipo e do tema, as arestas como linhas grossas, os objetos como ícones, os heróis como pontos e a névoa sombreada.
- A largura dos dois lados fica em `gui.medW` (padrão 50%).
- O 3D da direita é `MUNDO` no modo `ctx.edit = true`: desenha o rascunho e usa a câmera livre (botão direito arrasta, roda dá zoom, Q/R giram).
- `nucleo.js` trata `m.t === 'draft'` com `(S.draft ??= {})[m.sc] = m.d; render()`. Esse `S.draft` não vem do servidor no `state`; ele mora no cliente.

- [ ] **Step 1: Implementar** a vista, o divisor e o desenho do grid, ainda sem ferramentas.
- [ ] **Step 2: Verificar no navegador** em `/gm?mundo=1`: a tecla M abre o Mundo, com o grid à esquerda e o 3D à direita, o divisor arrasta e a largura se mantém depois de recarregar.
- [ ] **Step 3: Commit** `Editor: vista Mundo com grid 2D e 3D ao vivo lado a lado`.

### Task 3.3: Ferramentas de pintura, paredes, andares e Publicar

**Files:**
- Modify: `public/js/mundo-editor.js`, `public/mundo.css`

**Interfaces:**
- **Barra de ferramentas** (`data-mt`):
  - `sel`;
  - `pincel` (tema + tipo, de 1×1 a 7×7);
  - `balde` (preenchimento por inundação de 4 vizinhos no mesmo código);
  - `ret`;
  - `parede`, `porta`, `barreira`, `grade` e `cerca`: arrastar pela aresta mais próxima do cursor (distância menor que 0,25 casa até a linha); Shift apaga;
  - `objeto` (paleta de `k`);
  - `nevoa` (revelar ou esconder, com o tamanho do pincel); vai direto ao publicado por `fog` (Task 4.3);
  - `mover`: arrastar um herói manda `walkGm`, direto ao publicado;
  - `rota` e `zona` (Tasks 6.1 e 5.2);
  - `copiar` (seleção retangular para modelo, Task 8.2).
- Uma pincelada vira uma única `Op` `cells` no `pointerup`, enviada com throttle de 100 ms durante o arrasto.
- **Abas de andar:** `+`, renomear, tamanho e apagar. A escada que liga dois andares é criada pelo objeto `escada` (Task 5.3).
- **Botões:** Publicar (mostra a contagem de operações desde o último publicar, guardada no cliente) e Descartar (com confirmação, pelo diálogo do jogo `ux.js`).
- **Teclas do editor:** Ctrl+Z e Ctrl+Y, B pincel, G balde, W parede (só enquanto a vista Mundo tem o foco) e Esc volta a `sel`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador.** Pinte uma sala de castelo com paredes e porta, crie o andar 2 e publique. No `/player?mundo=1` aberto no `/painel`, a sala aparece só depois de Publicar.
- [ ] **Step 3: Commit** `Editor: pincel, balde, retângulo, paredes nas bordas, andares e publicar`.

### Task 3.4: Inspetor e controles de condução

**Files:**
- Modify: `public/js/mundo-editor.js`, `public/js/docas.js` (o inspetor ocupa a doca direita enquanto `gui.view === 'mapa'` e o mundo está ligado), `public/js/mesa.js` (os botões Congelar todos e Chamar todos no cartão da cena)

**Interfaces:**
- `MEDIT.inspect(sel)` desenha o formulário do objeto selecionado com os campos de `cfg` da tabela da seção 6 do spec. O editor de diálogo (nós, falas e escolhas com destino) fica na Task 5.2. Cada mudança vira `{o:'obj', id, v}`.
- **Barra do 3D do mestre:**
  - Seguir herói (lista);
  - Ver como (aplica `visFilter` do herói no cliente: o mestre pede `{t:'asView', id}` e recebe `{t:'asView', w, vis}`);
  - Névoa (ligar ou desligar);
  - Assumir NPC (com um NPC ou inimigo selecionado, `MINPUT.sel = id` e o WASD do mestre move por `walk`, que o servidor aceita porque `can` dá verdadeiro para o mestre);
  - Congelar (`freeze`);
  - Tático (`tatico n` e Próxima rodada);
  - Chamar todos (clique numa casa manda `walkGm` para cada herói da cena, em espiral).

- [ ] **Step 1: Escrever o teste com falha** `test('mestre move NPC com walk validado e herói congelado com walkGm')`.
- [ ] **Step 2: Implementar.**
- [ ] **Step 3: Rodar `npm test` e verificar no navegador** Congelar (cadeado sobre o herói; WASD não anda) e o modo tático (o anel de alcance aparece no chão).
- [ ] **Step 4: Commit** `Editor: inspetor de objetos, ver como, assumir NPC, congelar, tático e chamar todos`.

---

## Etapa 4 — Névoa e visão

### Task 4.1: Shadowcasting nas arestas

**Files:**
- Create: `public/js/mundo-visao.js`
- Modify: `src/config.js` (import)
- Test: `tools/test-mundo.js`

**Interfaces:**
- `globalThis.MVIS`:
  - `radius(hora, tema, torch) → 8 | 6 | 4 + (torch ? 2 : 0)`; a caverna usa sempre o raio da noite;
  - `fov(f, objs, cx, cy, r) → Uint8Array(w*h)` com 1 nas casas visíveis. É shadowcasting simétrico por octantes. Uma casa só é visível se a linha do centro de origem até ela não cruza aresta com `edgeBlocksSight` nem passa por casa `denso` (a casa `denso` em si é visível; a de trás não). A origem é sempre visível;
  - `orBits(a, b)` e `toB64(bits)` / `fromB64(s, n)`.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('visão: parede corta, porta fechada corta, porta aberta e grade não, denso corta atrás')`;
  - `test('visão: raio 8 de dia, 4+2 à noite com tocha, caverna sempre noite')`;
  - `test('visão: simetria — se A vê B, B vê A')`, com 200 pares aleatórios num mapa gerado.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: linha de visão por shadowcasting nas arestas`.

### Task 4.2: Revelar ao andar e filtrar a projeção

**Files:**
- Modify: `src/mundo.js` (`onCell`), `src/mundo-rede.js` (`visNow`, `canSee`)
- Test: `tools/test-mundo.js`

**Interfaces:**
- `visNow(sid) → Map<floorId, Uint8Array>`: a união dos `fov` de todos os heróis da cena, em cache, recalculada em `onCell` e quando uma porta muda.
- O `onCell(ch)` de um herói faz o OU entre o `fov` dele e `sc.seenW[f]`. Se algum bit novo ligar, chama `push(false)`.
- Para o jogador, `state.vis` (projetado) é `{[f]: b64}` da visão atual do grupo. Inimigos e NPCs fora de `visNow` não entram em `chars` nem em `pos`.
- Com `sc.fogOn` falso, tudo fica visível, como hoje.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('névoa: andar revela e lembra; inimigo atrás da parede não chega ao jogador nem ao pos')`;
  - `test('névoa: abrir porta revela a sala vista pela porta')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: névoa automática lembrada pelo grupo e filtro de visão na projeção`.

### Task 4.3: Pincel de névoa do mestre e três estados no cliente

**Files:**
- Modify: `src/media.js:37` (`H.fog` passa a ler e escrever em `seenW[m.f]` quando a cena tem `world`, e `fogAll` também), `public/js/mundo3d.js` (`setFog` com `S.scenes[sc].seenW` e `S.vis`), `public/js/mundo-editor.js` (ferramenta `nevoa`)

- [ ] **Step 1: Escrever o teste com falha** `test('fog do mestre liga e desliga bits de seenW no andar certo')`.
- [ ] **Step 2: Implementar.**
- [ ] **Step 3: Verificar no navegador:** escuro, lembrado (dessaturado) e visível, e o pincel do mestre revelando em tempo real.
- [ ] **Step 4: Commit** `Mundo: pincel de névoa do mestre e névoa em três estados no 3D`.

---

## Etapa 5 — Interações

### Task 5.1: `interact`, portas, barreiras, baús, itens e placas

**Files:**
- Create: `src/mundo-obj.js` (importado por `src/mundo.js`)
- Modify: `src/net.js` (`GATE`/`gateOf`: categoria `inter` para `interact` quando `obj.auto === false`, ou quando é `null` e `!S.auto.inter`); `public/js/mestre.js` (rótulo "Interações" na seção Aprovação automática, junto das outras chaves `S.auto`)
- Test: `tools/test-mundo.js`

**Interfaces:**
- `H.interact(c, {id, obj, opt})` vale só para a cena do herói. Recusa se:
  - a distância for maior que 1,5;
  - o andar for diferente;
  - a casa do objeto não estiver em `visNow`;
  - o objeto for oculto sem `rev`.
- `objActs[k](c, ch, o, opt)`, por tipo:
  - `porta`: alterna `cfg.estado` entre aberta e fechada. Se estiver trancada: com `cfg.chave` no inventário, abre e consome a chave se `cfg.gasta`; com `cfg.teste {attr, dif}`, rola pelo mesmo caminho de `H.roll` (o resultado vai para o log) e abre se passar. Depois chama `unstuck` e recalcula a visão.
  - `bau`: entrega `cfg.itens` e `cfg.ouro` com o mesmo selo de ganho de hoje (procure o envio do selo de XP e ouro em `handlers.js`). Com `uma`, marca `cfg.aberto = true`; com `cada`, marca `cfg.por[ch.id] = 1`. Respeita `cfg.teste` como a porta.
  - `item`: entrega e apaga o objeto.
  - `placa`: manda `{t:'placa', text, img}` só para o cliente `c` (e para o mestre no log).
- Quando a mensagem vira pedido, o texto (`reqText`) é "abrir a porta", "abrir o baú", e assim por diante.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('interact: longe demais ou atrás da parede é recusado')`;
  - `test('porta trancada: chave abre e consome; teste falho não abre')`;
  - `test('baú uma vez para o grupo e uma por herói')`;
  - `test('interact vira pedido com auto=false e passa com S.auto.inter')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: interagir com portas, barreiras, baús, itens e placas`.

### Task 5.2: NPC com diálogo, alavancas e gatilhos

**Files:**
- Modify: `src/mundo-obj.js`, `src/mundo.js` (`onCell` chama `zoneEnter`), `public/js/mundo-editor.js` (editor de diálogo e ferramenta `zona`)
- Test: `tools/test-mundo.js`

**Interfaces:**
- `npc`: abre `S.dlg[sid] = {obj, by: ch.id, no: cfg.dialogo.ini}` e manda `{t:'dlg', …}` para o dono e para quem tem herói a até 3 casas, em só leitura. `interact` com `opt = índice da escolha` avança o diálogo. Os valores de `faz`:
  - `loja`: abre a loja da cena para aquele jogador;
  - `item:<id>`: entrega um item;
  - `gatilho:<id>`: dispara o gatilho;
  - `objetivo:<texto>`: muda o objetivo;
  - `fim`: encerra.

  O mestre manda `{t:'dlgSay', sc, text}` para pôr uma fala extra na caixa.
- `alavanca`: para cada id em `cfg.alvos`, aplica `cfg.acao` (`alternar`, `abrir` ou `fechar`) a portas e barreiras, e `mostrar` ou `ocultar` a objetos (`vis`).
- `gatilho`: `zoneEnter(ch)` dispara quando a casa nova está em `cfg.casas`. Com `quem: 'todos'`, só quando todos os heróis da cena estão dentro. Com `vezes: 'uma'`, marca `cfg.usado`. As `acoes` são `{a:'abrir' | 'fechar' | 'revelar' | 'texto' | 'som' | 'objetivo' | 'batalha', …}`, e `batalha` chama `ambush(sid, cfg.enc, casas)` (Task 6.2).

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('diálogo: escolha leva ao nó certo, faz item entrega, fim fecha; quem está a 4 casas não recebe')`;
  - `test('alavanca alterna porta e mostra objeto oculto')`;
  - `test('gatilho uma vez; quem=todos só com todos dentro')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: NPCs com diálogo de escolhas, alavancas e gatilhos de área`.

### Task 5.3: Armadilhas, perigos, escadas e portais

**Files:**
- Modify: `src/mundo-obj.js`, `src/mundo.js`
- Test: `tools/test-mundo.js`

**Interfaces:**
- **Armadilha.** `perceive(ch)`, em `onCell`: para cada armadilha sem `rev` a até 2 casas que ainda não está em `cfg.tent[ch.id]`, rola em segredo SAB contra `cfg.perc` (use o `d100` e `at` de `rules.js`, como uma rolagem de atributo). Se passar, marca `rev = true` e chama `push`.
- `trap(ch)`, quando a casa nova é a da armadilha (revelada ou não): AGI contra `cfg.esq`. Sucesso causa `hurt(ch, dano/2)` sem condição; falha causa `hurt(ch, dano)` e aplica `cfg.cond` com `applySt`. Com `cfg.rearma` falso, a armadilha some depois de disparar.
- **Perigo.** Fica num `setInterval` de 1 s dentro de `inScene`: o herói em casa `perigo` perde 3% de `hpMax`, no mínimo 1. O dano por segundo é escolha do plano.
- **Escada.** `interact` leva `ch.pos` para `cfg.para`, com `walkGm` interno.
- **Portal.** `interact` chama o `passReq` atual, generalizado: hoje ele procura `scene().exits` (handlers.js:27). Faça-o aceitar um destino `to` explícito e mantenha a chamada antiga funcionando. A chegada usa o objeto `cfg.destino`, ou o `surgir` da cena de destino, ou o centro.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('armadilha: percepção revela para o grupo uma vez por herói; pisar sem ver rola esquiva e aplica condição')`;
  - `test('perigo: lava tira 3% por segundo')`;
  - `test('escada troca de andar; portal vira pedido de passagem e chega no destino')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: armadilhas com percepção passiva, perigos, escadas e portais`.

### Task 5.4: Interação no cliente

**Files:**
- Modify: `public/js/mundo-input.js` (tecla E), `public/js/mundo3d.js` (ícones via `iconFor`); criar a caixa de diálogo e a placa em `public/js/mundo-hud.js`, que já é usado na Task 7.1 (crie-o aqui só com essas duas partes)

**Interfaces:**
- O alvo do E é o objeto interativo visível mais próximo a até 1,5 casa à frente (até 60° do rumo) ou ao lado.
- `MHUD.prompt(obj)` mostra "E · Abrir baú", "E · Falar com <nome>", e assim por diante.
- `MHUD.dlg(m)`: caixa no estilo Persona com retrato, fala e escolhas (1–4 ou clique). Quem só lê vê a caixa sem as escolhas.
- `MHUD.placa(m)`: reaproveita o visual do "Mostrar a todos".

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador:** abrir uma porta, abrir um baú (selo de item), falar com um NPC de duas escolhas e ler uma placa.
- [ ] **Step 3: Commit** `Mundo: tecla E, prompt, caixa de diálogo e placas no cliente`.

---

## Etapa 6 — Inimigos e encontros

### Task 6.1: IA de patrulha, visão e perseguição

**Files:**
- Create: `src/mundo-ia.js`
- Modify: `public/js/mundo-editor.js` (ferramenta `rota`: clique adiciona casa à `cfg.rota` do `inimigo` selecionado), `public/js/mundo3d-fx.js` (cone no chão: branco a 18% na patrulha e vermelho a 35% no alerta, e "!" sobre a cabeça)
- Test: `tools/test-mundo.js`

**Interfaces:**
- `startIA()` roda num `setInterval` de 200 ms. Para cada cena sem `battle.active`, com algum herói em cena e algum objeto `inimigo`, e dentro de `inScene`, chama `tickIA(sid, 0.2)`.
- `tickIA(sid, dt)`: os estados ficam em `obj.ia = {s, t, alvo, i}`:
  - `parado` | `patrulha` | `vagar` → `alerta`, quando `sees(o, hero)`;
  - `alerta` dura 1 s e passa a `persegue`;
  - `persegue` passa a `volta` depois de 6 s sem ver;
  - `volta` retorna a `patrulha` pelo A* até a casa mais próxima da rota.
- O inimigo anda a `SPEED.a` (patrulha) ou `SPEED.c` (perseguição) e usa `MCOL.slide`. Atualiza `ch.pos`, `ch.x` e `ch.y` do personagem `cfg.ch` e chama `markPos`.
- `sees(o, hero) → boolean`: a distância é de até `cfg.visao.raio × (hero.modo === 'c' ? 2 : hero.modo === 'g' ? .5 : 1)`; o ângulo é de até `cfg.visao.angulo / 2` do rumo; e a casa do herói está no `fov` do inimigo. O padrão é `raio: 6, angulo: 90`.
- `astar(f, objs, from, to) → [[x, y], …] | null`: 4 vizinhos e custo 1, ou 2 em `agua`.
- O modo do herói vem do último `walk` (`ch._m`).

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('IA: patrulha segue a rota em vaivém')`;
  - `test('IA: vê herói andando a 5 casas no cone; não vê agachado a 5; vê correndo a 10')`;
  - `test('IA: perde de vista 6 s e volta à rota')`;
  - `test('IA: não roda com batalha ativa')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: inimigos com patrulha, cone de visão, perseguição e volta`.

### Task 6.2: Começo da batalha, surpresa e emboscada

**Files:**
- Modify:
  - `src/handlers.js:268-279` (`H.battle`): aceitar `m.ids` (os combatentes; sem ele, o comportamento atual), `m.abre` (`'surpresa'`, `'emboscada'` ou nada) e `m.at` (`{f, x, y}` do contato);
  - `src/mundo-ia.js`: `engage`, `ambush`, golpe F;
  - `public/js/mundo-input.js`: F manda `{t:'strike', id}`.
- Test: `tools/test-mundo.js`

**Interfaces:**
- `engage(sid, hero, enemyObj, kind)`, em que `kind` é `'toque'`, `'golpe'`, `'alcance'` ou `'gatilho'`:
  - **Heróis:** todos os heróis vivos da cena.
  - **Inimigos:** o tocado, os de mesmo `cfg.bando` e os que estão a até 8 casas com `sees` sobre algum combatente.
  - **`abre`:**
    - `'surpresa'` se `kind === 'golpe'`, ou se é `toque` e o herói está fora do cone do inimigo ou agachado sem ter sido visto;
    - `'emboscada'` se `kind === 'alcance'` e o inimigo está fora do cone de visão do herói (a 180° do rumo dele), ou se `kind === 'gatilho'`.
  - Chama `H.battle({role:'gm'}, {on: true, ids, abre, at})`.
- **No `H.battle`:**
  - com `ids`, só esses entram em `ticks`;
  - **surpresa:** `shift = max(ticks dos heróis) − min(ticks dos inimigos) + 1`, somado a cada inimigo, e `st.exposed = 1` em cada inimigo;
  - **emboscada:** o mesmo `shift`, somado aos heróis;
  - **`at`:** arena `sc.bbg = tema da casa + '-' + world.hora`, a menos que `sc.bbgFixo` esteja ligado (marcado quando o mestre escolhe o fundo à mão em `H.map f:'bbg'`);
  - **clima,** só se `sc.clima` estiver vazio: `agua` dá `chuva`, `perigo` de vulcão dá `brasas`, o tema `neve` dá `neve` e o tema `pantano` dá `neblina`. Guarde `sc.climaAuto = true` para desfazer no fim da batalha.
- **Compressão da formação.** Antes de `RU.axisOf`, se a maior distância entre combatentes passar de 10 casas, a cópia `x, y` usada só para o eixo e a formação é comprimida em direção ao contato por `10 / distância`. Não grave isso em `ch.x`.
- **Fim da batalha:** inimigos com `hp <= 0` e `cfg.ch` apagam o objeto `inimigo`; os sobreviventes vão para `ia.s = 'volta'`; e `sc.clima` volta a vazio se `climaAuto` estiver ligado.
- **Entrada tardia.** Um inimigo em `persegue` que chega a menos de 0,8 casa de um combatente durante a batalha entra pelo caminho atual de quem chega no meio da luta (`handlers.js:224`, `moveTo`).
- **`strike`:** arco de 1,2 casa e 90° à frente; o primeiro `inimigo` atingido chama `engage(…, 'golpe')`. Sem alvo, não acontece nada (só a animação local).
- **`ambush(sid, encId, casas)`:** cria os inimigos do encontro salvo nas casas marcadas (o `spawn` atual com x e y definidos) e chama `engage` com `'gatilho'`.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('batalha por toque: entram todos os heróis, o bando e quem vê a até 8; o resto não')`;
  - `test('surpresa: todos os heróis antes do primeiro inimigo e inimigos Expostos')`;
  - `test('emboscada: inimigos antes')`;
  - `test('arena e clima vêm da casa do contato; mestre com fundo fixo mantém o dele')`;
  - `test('H.battle sem ids continua igual ao de hoje')`, que roda o caminho atual e compara `ticks`;
  - `test('vitória apaga inimigos derrotados do mapa e devolve sobreviventes à rota')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.** Rode também `npm run sim` e confira que o resultado não mudou (o combate não foi tocado).
- [ ] **Step 5: Commit** `Mundo: batalha por toque, golpe, alcance e emboscada, com surpresa, arena e clima do lugar`.

### Task 6.3: Transição em estilhaço

**Files:**
- Modify: `public/js/mundo3d-fx.js` (`shatter(renderer, done)`), `public/js/mundo3d.js` (no `sync`, quando `battle.active` liga, roda `shatter` e então `pause`)

**Interfaces:**
- `shatter`:
  1. copia o quadro atual para uma `CanvasTexture`;
  2. cria cerca de 40 triângulos (malha triangulada de 8×5 com o centro deslocado em ±30%) num `OrthographicCamera` de tela cheia;
  3. por 700 ms, cada triângulo gira 90–270°, cai com aceleração e some a partir dos 450 ms;
  4. o fundo vai ficando transparente, e o palco entra por baixo, porque o `#app` já desenhou o palco.
- Na qualidade Baixa, são 12 triângulos.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador** encostando num inimigo: o estilhaço roda e o palco abre com o tema do lugar, sem quadro preto no meio (screenshot logo depois do fim).
- [ ] **Step 3: Commit** `Mundo: transição em estilhaço para o palco`.

---

## Etapa 7 — HUD, menu, TV e som

### Task 7.1: HUD de exploração

**Files:**
- Modify: `public/js/mundo-hud.js`, `public/mundo.css`, `public/js/hud.js` (uma variante `HUD.html({mini: true})` com as fichas P5 a 70% e sem a barra de ordem), `public/js/tela.js` (a HUD vai dentro do `[data-mundo]`)

**Interfaces:**
- `MHUD.html(S, me)`:
  - fichas `HUD.html({mini: true})` no canto inferior direito;
  - minimapa: um `<canvas class="mmap">` de 180×180 no canto superior direito, redesenhado a 5 Hz a partir de `seenW`, `vis`, aliados, objetos vistos e portais; a câmera aparece como um losango;
  - faixa de objetivo com `world.goal` no topo, que pulsa por 2 s quando muda;
  - chat recolhível no canto inferior esquerdo (o histórico atual numa caixa, Enter para escrever).
- `MHUD.tick()`, por quadro:
  - nomes e mini barra de HP sobre os atores, por `MUNDO.screen(id)`, num único `div` com transform;
  - balões de 5 s sobre quem falou: no chat, `log` com `from` igual ao nome do herói faz aparecer o balão;
  - prompt de E;
  - setas de borda para pings fora da tela;
  - aviso de borda vermelha em casa `perigo`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador** `/player?mundo=1`: minimapa com névoa, nomes acompanhando os heróis, balão no chat e mudança de objetivo pelo editor. Screenshot.
- [ ] **Step 3: Commit** `Mundo: HUD com fichas, minimapa, objetivo, nomes, balões e chat`.

### Task 7.2: Menu de pausa

**Files:**
- Modify: `public/js/mundo-hud.js`, `public/js/paginas.js` (expor `pageHtml(pg)` se ainda não houver uma função que devolve o HTML de uma página sem o layout), `public/mundo.css`

**Interfaces:**
- Tab ou Esc alterna `MHUD.menu`. Ele é uma camada de tela cheia estilizada (faixa diagonal vermelha e preta, no tom do HUD P5) com as abas Ficha, Itens, Skills, Forja, Ofícios, Acampamento e Diário. Cada aba desenha `pageHtml(k)`.
- Com o menu aberto, o WASD é ignorado, mas o mundo continua rodando.
- Esc fecha primeiro o que estiver por cima (diálogo, placa), depois o menu.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador:** usar um item e equipar uma arma pelo menu; o pedido aparece para o mestre.
- [ ] **Step 3: Commit** `Mundo: menu de pausa com as páginas do jogador`.

### Task 7.3: TV e som

**Files:**
- Modify: `public/js/mundo3d.js` (modo `ctx.role === 'table'`: enquadra a caixa dos heróis de `S.tv` com 2 casas de margem, interpolando em 600 ms; sem heróis, mostra o andar inteiro), `public/js/som.js` (`MSOM.passo(tipo, dist)`, `MSOM.amb(tema)`, `MSOM.fx(k)`), `public/js/som-catalogo.js` (efeitos `bau`, `alavanca`, `pegar`, `armadilha`, `alerta`)

**Interfaces:**
- **Passos:** um a cada 0,45 s andando e 0,28 s correndo, com o som do tipo de piso (grama para `chao` de floresta, campo ou pântano; pedra para castelo, caverna e ruínas; areia para praia e deserto; neve; água em `agua`). O volume dos aliados é `1 − dist/12`.
- **Ambiência:** a do tema da casa do herói selecionado, com fade de 1,5 s. O mapa é floresta → `floresta`, caverna → `caverna`, neve → `vento`, vulcão → `caldeira`, pântano → `pantano`, praia → `mar`, e os demais → `vento`.
- **Efeitos:** os novos são sintetizados no WebAudio quando não há arquivo, seguindo o padrão dos efeitos de combate já sintetizados em `som.js`. Se entrar algum arquivo, ele precisa de crédito em `public/audio/CREDITOS.md`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar no navegador:** a TV enquadra três heróis espalhados; ao andar de floresta para caverna, a ambiência troca.
- [ ] **Step 3: Commit** `Mundo: TV enquadra o grupo, passos por piso, ambiência por tema e sons de interação`.

---

## Etapa 8 — Gerador e modelos

### Task 8.1: Os quatro geradores

**Files:**
- Create: `src/mundo-gerar.js`
- Modify: `src/mundo.js` (`H.wGen {sc, f, tipo, tema, w, h, seed}` escreve no rascunho), `public/js/mundo-editor.js` (janela Gerar com prévia, "outra semente" e Aplicar)
- Test: `tools/test-mundo.js`

**Interfaces:**
- `gerar(tipo, tema, w, h, seed) → {floor, objs}`, com PRNG `mulberry32(seed)`.
  - **`masmorra`:** BSP com profundidade 4, salas de 4–10 casas, corredores em L, porta onde o corredor encontra a sala, de 1 a 3 baús e de 1 a 3 armadilhas, `surgir` na primeira sala e a sala mais distante (BFS) marcada com um `bau` maior.
  - **`aberto`:** ruído de valor em 2 oitavas, com limiar 0,58 para `denso`; de 3 a 5 clareiras conectadas por trilhas no A*; rio opcional (50%) com `fundo` e uma faixa de `agua`, e pontes de `chao`; e `baixo` em 3% das casas `chao`.
  - **`vila`:** ruas em grade de 8–12 casas com desvio de ±2; casas de 4×4 a 7×6 com paredes de aresta e porta voltada à rua; praça central; um `npc` placeholder com `faz: 'loja'`; e `cerca` nas bordas dos quintais.
  - **`caverna`:** 45% de parede, 5 passos de autômato celular (B5678/S45678), só a maior componente conectada, lagos de `agua` em 3 câmaras e cristais (`denso` de caverna variante cristal).
- **Invariante:** toda casa andável alcança o `surgir` (BFS que respeita as arestas).

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('gerador: mesma semente, mesmo mapa')`;
  - `test('gerador: todo andável é alcançável do surgir, nos 4 tipos, 50 sementes cada')`;
  - `test('gerador: masmorra tem portas nas junções e ao menos 1 baú')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: gerador de masmorra, área aberta, vila e caverna`.

### Task 8.2: Modelos, exportação e pacote padrão

**Files:**
- Create: `public/js/mundo-modelos.js`
- Modify: `src/mundo.js` (`H.wTpl {add: {name, k, data} | del: id | import: json}`), `src/campaign.js` (o Pacote de conteúdo inclui e lê `worldTpl`, passando por `scrub`), `public/js/mundo-editor.js` (ferramenta `copiar`, biblioteca com prévia em miniatura no canvas, carimbo com R gira 90°, exportar e importar `.json`)
- Test: `tools/test-mundo.js`

**Interfaces:**
- `tplFromRect(world, f, x0, y0, x1, y1) → {w, h, cell, wallH, wallV, objs}`, com os objetos em coordenadas relativas e ids novos ao carimbar.
- `stamp(draftFloor, tpl, x, y, rot) → Op[]`: gira em 90°, e as arestas giram junto (h ↔ v com o índice transposto).
- `globalThis.MMODELOS = {[tema]: [{name, data}]}`, com de 3 a 5 trechos por tema (floresta: clareira e ponte; castelo: taverna, cela e salão; caverna: câmara e altar; e assim por diante), gerados por um script temporário que usa o `gerar`. O resultado vai para o arquivo como dado, e o script não fica no repositório.

- [ ] **Step 1: Escrever os testes com falha:**
  - `test('modelo: copiar e carimbar girado preserva paredes e objetos')`;
  - `test('pacote: worldTpl vai e volta pela exportação e importação, sem campos estranhos')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** `Mundo: modelos de trecho, objeto e mapa, exportação e pacote padrão por tema`.

---

## Etapa 9 — Troca final

### Task 9.1: Remover o 2D e ligar o mundo para todos

**Files:**
- Modify:
  - `public/js/palco.js` (apagar `map()`, `setBg` e o `cropper`);
  - `public/js/tela.js:55-75,84,94` (sem `map()`; seções Mapa e grade da janela Cena saem);
  - `public/js/ux.js` (régua, área e a barra do mapa saem; o ping no duplo clique vai para `MUNDO.pick`);
  - `src/media.js` (`pinAdd` e `pinDel` saem);
  - `src/config.js` e `src/mundo-rede.js` (fim do `VJ_MUNDO` e do `?mundo`);
  - `src/mundo.js` (`fixWorld` apaga `bg`, `crop`, `ox`, `oy`, `ar`, `grid`, `pins`, `seen` e `exits` depois de migrar, e `legacy` deixa de existir);
  - `public/js/docas.js` (o rótulo é sempre "Mundo");
  - `public/style.css`: só com `git add -p`, removendo as regras `.map`, `.tok`, `.fog`, `.gridl`, `.cropper` e `.mexit`;
  - `README.md` (seções Mapa e som, Mapas, Interface e Atalhos no PC);
  - `tools/ui-smoke.js`.
- **Celular** (`innerWidth <= 700`): fora de batalha, o jogador vê `<section class="mundo-pc"><b>Explore pelo computador</b><p>…</p></section>` seguido das páginas atuais. A batalha no celular continua como hoje.

- [ ] **Step 1: Atualizar `tools/ui-smoke.js`.** Troque as checagens do mapa 2D pelas novas: o jogador anda com WASD (posição muda pelo `pos`), interage com um baú, abre o menu (Tab), o mestre edita e publica, e um encostar num inimigo abre o palco. O teste de celular confere `.mundo-pc`.
- [ ] **Step 2: Rodar `npm run ui` e ver falhar** no 2D removido.
- [ ] **Step 3: Remover o 2D e a chave.**
- [ ] **Step 4: Rodar `npm test`, `npm run ui` e `npm run sim`.** Os três passam.
- [ ] **Step 5: Medir FPS** no mapa de referência (Alta e Baixa) e abrir uma campanha real de `data/` copiada para `data-dev/`. Tudo abre, e as cenas antigas aparecem com o piso de imagem.
- [ ] **Step 6: Commit** `Mundo 3D no lugar do mapa 2D: remoção do grid, régua e marcadores; README e testes de interface`.

---

## Self-review (feito)

- **Cobertura do spec:**
  - seção 1 → Tasks 1.1 e 1.2;
  - seção 2 → 1.3 e 1.4;
  - seção 3 → 2.1 a 2.5;
  - seção 4 → 2.6, 5.4, 7.1 e 7.2;
  - seção 5 → 4.1 a 4.3;
  - seção 6 → 5.1 a 5.4;
  - seção 7 → 6.1 a 6.3;
  - seção 8 → 3.1 a 3.4;
  - seção 9 → 8.1 e 8.2;
  - seção 10 → 7.3, 3.2 (Mesa) e 3.4;
  - seção 11 → 9.1.
- **Decisões que o plano toma** (o spec deixou para quem constrói):
  - velocidade base de 3,5 casas/s;
  - dano do perigo de 3%/s;
  - paleta exportada por `TERRENO3D.paleta`, em vez de um arquivo novo, para mexer o mínimo no terreno3d.js que a outra sessão edita;
  - o id da vista continua `mapa` e só o rótulo vira "Mundo";
  - o padrão do cone de visão é `raio 6, ângulo 90`.

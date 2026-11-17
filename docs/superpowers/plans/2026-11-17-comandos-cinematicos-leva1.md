# Comandos cinemáticos — Leva 1 (palco, dificuldade, defesa com fintas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar os 8 comandos atuais (7 de ataque + defesa/Choque) para um palco cinemático de tela cheia, com retorno forte a cada toque, nota Ótimo, erro ×0,85, dificuldade por requisito do nó e fintas na defesa.

**Architecture:** As regras puras (graus, nível de dificuldade, janelas, nota → efeito, linhas de resultado) ficam em `RULES.CMD` (`public/rules.js`), compartilhadas por servidor, navegador e `node --test`. O tempo da defesa continua medido no servidor; as fintas só mudam o desenho e duas regras no handler `def`. Um módulo novo, `public/js/palco-cmd.js`, abre o palco (camadas, canvas de efeitos, sons, vibração, resultado), e `comandos.js` / `cmd-ataque.js` passam a desenhar dentro dele.

**Tech Stack:** Node (ESM), `ws`, JS puro no navegador, `node:test`, Playwright em `tools/ui-smoke.js`, WebAudio sintetizado (`SFXC` em `coreo.js`), sem biblioteca nova.

**Spec:** `docs/superpowers/specs/2026-11-17-comandos-cinematicos-design.md` (§§ 3–6, 8 e 12; ler junto). Base: `docs/superpowers/specs/2026-11-17-comandos-de-acao-design.md`.

## Global Constraints

- **Pular nunca pune.** Esc, botão Pular ou 6 s sem interação mandam `g: ''` = resultado normal. Só **tentar e errar feio** (`g: 'erro'`) custa ×0,85.
- Graus: `'' | 'erro' | 'bom' | 'otimo' | 'perf'`. Multiplicadores: Tempo bom ×1,2 / ótimo ×1,3 / perf ×1,4 (nível difícil ×1,5); Segurar bom ×1,3 / ótimo ×1,45 / perf ×1,6 (difícil ×1,7); Runa de dano bom ×1,2 / ótimo ×1,3 / perf ×1,4 (difícil ×1,5); erro ×0,85 em qualquer um. Ótimo não dá `pf`.
- Mecânicas de contagem (Martelar, Sequência, Ritmo): fração acertada ≥ 100% perf, ≥ 75% ótimo, ≥ 35% bom, > 0 e < 35% erro, 0 tentando = erro, sem tentar = normal. O servidor recalcula o teto do grau a partir de `n`.
- Nível do nó = maior valor de `rq` (0 se não tiver): **fácil** < 20, **médio** 20–49, **difícil** ≥ 50 (`RULES.CMD.tier(s)` → 0, 1, 2). Campos da técnica (`s.cw`, `s.cp`, `s.mt`, `s.cz`, `s.ma`) e `mod` de passivas, quando presentes, sobrepõem/somam à tabela por nível.
- Tabela por nível (fácil / médio / difícil): Tempo Bom/Ótimo/Perfeito ms = 140/80/50 · 120/65/40 · 100/55/32; Martelar meta em 2 s = 16 · 20 · 24; Segurar faixas Perfeito/Ótimo/Bom em % da barra = 7/8/20 · 6/7/18 · 5/6/15; Sequência tolerância = ±120 · ±100 · ±80 ms; Ritmo tolerância = ±150 · ±120 · ±100 ms e notas = `nt` · `nt`+1 · `nt`+2; Mira ponto = 18 · 15 · 12 % do retrato; Runa Bom/Ótimo/Perfeito = 60/75/85 · 65/78/88 · 70/82/90. Black Flash: `cp = (30 + 8 × (bf + mod bf)) × [1, .85, .7][nível]`.
- Defesa: batida 1100 ms; zona de Esquiva 450 ms; folga 200 ms; o servidor manda no tempo. Fintas só em elite (30% das batidas, batida atrasada **ou** anel falso) e chefe (todas; combos irregulares e direção em golpe anunciado). Inimigo comum: nenhuma.
- Tudo em português. `prefers-reduced-motion`: sem tremor, zoom e linhas de velocidade; flash suave. Celular (largura < 600): minigame usa a largura toda menos 16 px; alvos de toque ≥ 56 px.
- A API `runCmd(key, hero, tgt, done)` e o payload `{ g, n, acc }` de `act` não mudam de forma (só ganham os valores `'erro'` e `'otimo'` em `g`).

## Review Focus

- Cliente manda lixo em `cmd` (`g: 'perf'` em técnica sem `cmd`, `n` negativo/NaN/enorme, `acc` fora de 0..1, `g` desconhecido): o servidor limita e nunca dá mais que o teto da técnica. (Task 1)
- Esc, Pular e prazo de 6 s resultam em golpe normal sem ×0,85, em todos os 7 comandos. (Tasks 2, 5, 6)
- Palco no celular retrato 390×844: cabe sem rolagem horizontal, retratos encolhem, alvos de toque ≥ 56 px. (Tasks 4, 8)
- Janela de defesa que fecha, ou turno que muda, com o palco aberto: o palco some sozinho e não deixa o jogo travado nem teclas capturadas. (Task 7)
- Dois comandos disparados em sequência rápida (ou `runCmd` chamado com palco já aberto): devolve `false`, nada duplica, listeners de teclado são removidos. (Tasks 4, 5)

---

### Task 1: Regras puras — graus, nível, janelas e efeitos

**Files:**
- Modify: `public/rules.js` (bloco `CMD`, linhas ~263–312: `KINDS`, `tempoWin`, `clampCmd`, `cmdEffect`; `cmdText` ~203–212)
- Test: `tools/test.js` (novos testes; ajustar os existentes de `tempoWin`/Black Flash/`clampCmd` que quebrarem com as janelas novas)

**Interfaces:**
- Produces (todas em `RULES.CMD`):
  - `GRADES: ['', 'erro', 'bom', 'otimo', 'perf']`, `GRADE_NAME: { erro:'ERROU', bom:'BOM', otimo:'ÓTIMO', perf:'PERFEITO' }`
  - `tier(s: Skill) -> 0|1|2`
  - `gradeFrac(frac: number, tried: boolean) -> Grade` (regra de contagem das Global Constraints)
  - `tune(s: Skill, mods?: object) -> { tempo:{bom,otimo,perf}, martelarMeta, segurar:{perf,otimo,bom}, seqTol, ritmoTol, ritmoNotas, mira, runa:{bom,otimo,perf} }` (já aplicando campos da técnica e `mod`)
  - `tempoWin(s, mods) -> { cw, co, cp }` (mesmo nome de hoje, ganha `co`; `cw`=Bom, `co`=Ótimo, `cp`=Perfeito)
  - `clampCmd(s, cmd, mods) -> { g, n, acc }` (aceita os 5 graus)
  - `cmdEffect(s, c) -> Effect` (mesmos campos de hoje; `mult` passa a refletir erro/ótimo/nível)
  - `resultLines(s: Skill, c: {g,n,acc}, e: Effect) -> { title: string, lines: string[] }` — `title` = `GRADE_NAME[g]` (ou `''`); `lines` = o que rendeu (`×1,4 de dano`, `+3 golpes`, `+2 turnos`, `crítico · −2 Quebra`, `Black Flash!`, `a carga estourou`) e a proximidade do Perfeito (`faltaram 18 ms`, `14/16 apertos`, `semelhança 78%`), em português.

- [ ] **Step 1: Escrever os testes que falham** (em `tools/test.js`, bloco novo `// ---- comandos cinemáticos: regras puras ----`)
  - `tier`: `{rq:{FOR:10}}`→0, `{rq:{FOR:20}}`→1, `{rq:{FOR:49,DES:12}}`→1, `{rq:{FOR:50}}`→2, `{}`→0.
  - `gradeFrac`: `(1,true)`='perf', `(.75,true)`='otimo', `(.74,true)`='bom', `(.35,true)`='bom', `(.34,true)`='erro', `(0,true)`='erro', `(0,false)`=''.
  - `tempoWin`: com `s={cmd:'tempo',rq:{}}` → `{cw:140,co:80,cp:50}`; com `rq:{FOR:50}` → `{cw:100,co:55,cp:32}`; com `bf:3` e `rq:{}` → `cp===54`; com `bf:3` e `rq:{FOR:50}` → `cp===Math.round(54*.7)`.
  - `clampCmd` (técnica `tempo`): `{g:'perf'}` passa; `{g:'xyz'}`→`''`; sem `cmd` na técnica → `{g:'',n:0,acc:0}`; `{g:'otimo',n:-5,acc:9}`→`n:0, acc:1`. Para `martelar` com `mx:4`: `{g:'perf',n:2}` → `'bom'` (2/4=.5), `{g:'perf',n:3}` → `'otimo'`, `{g:'perf',n:4}` → `'perf'`, `{g:'erro',n:0}` → `'erro'`.
  - `cmdEffect` tempo: erro → `mult` .85; bom 1.2; otimo 1.3 e `pf` false; perf 1.4, `pf` true; perf em nível difícil (`rq:{FOR:50}`) → 1.5. Segurar: otimo 1.45; erro com `acc` ≥ 0 → .85; `acc:-1` → `estouro` true e `mult` 1. Martelar erro → `extra` 0 e `mult` .85; otimo → `extra === n` e `pf` false.
  - `resultLines`: tempo perf difícil contém `'×1,5 de dano'`; martelar bom `n:3` contém `'+3 golpes'`; ritmo em técnica sem dano `n:2` contém `'+2 turnos'`.
  - Rodar: `node --test --test-name-pattern="cinemáticos" tools/test.js` → FAIL (funções inexistentes).

- [ ] **Step 2: Implementar** as funções acima em `public/rules.js`; `KINDS` ganha nada (as 4 mecânicas novas vêm na Leva 2). `clampCmd` mantém o limite de `cnt` por mecânica e, nas de contagem, faz `g = pior(g, gradeFrac(n/cnt, true))` pela ordem de `GRADES`; sem `cmd` na técnica devolve o zero. Atualizar `cmdText` (linhas 203–212) para citar Ótimo/Erro de forma curta e a janela do nível (ex.: Tempo: `janela de ${w.cp} ms no Perfeito`).

- [ ] **Step 3: Rodar** `npm test` → tudo verde (corrija os testes antigos de Black Flash/`tempoWin` só no que mudou por causa das janelas por nível; não afrouxe asserções de outras regras).

- [ ] **Step 4: Commit**
```bash
git add public/rules.js tools/test.js && git commit -m "Comandos: graus (erro/ótimo), nível por requisito, janelas e linhas de resultado"
```

### Task 2: Servidor aplica os graus no ataque

**Files:**
- Modify: `src/rules.js` (`doAct`, linha ~594 `cx`, linha ~611 log `PERFEITO/BOM`, e o `fx` com `cg` do log do golpe em `strike`, linha ~498)
- Modify: `public/js/coreo.js` (`comandoFx`, linhas 92–99; só o mapeamento de selos, estilo no Task 8)
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `RU.CMD.clampCmd`, `RU.CMD.cmdEffect`, `RU.CMD.GRADE_NAME` (Task 1).
- Produces: log `"<técnica>: ÓTIMO!"` / `"ERROU!"` e `fx.cg ∈ {'erro','bom','otimo','perf'}` nos eventos de ataque, para o `coreo.js` e a mesa.

- [ ] **Step 1: Testes** (usar o helper `fixR(.3, …)` e `H.act` como em `tools/test.js:964-966`): técnica `tempo` com `cmd:{g:'erro',n:0,acc:0}` causa ≈ 0,85× o dano de `cmd` ausente (mesma semente de dado; compare dano do log, tolerância de 1 ponto); `g:'otimo'` ≈ 1,3×; `g:''` e `cmd` ausente causam exatamente o mesmo dano; `g:'perf'` em técnica **sem** `cmd` causa o dano normal. `S.log` contém `ÓTIMO!` e `ERROU!` nos casos certos.
- [ ] **Step 2: Rodar** o padrão do teste → FAIL.
- [ ] **Step 3: Implementar** o log com `RU.CMD.GRADE_NAME[cx.g]` no lugar do ternário fixo e propagar o grau em `fx.cg` para todos os cinco valores. Em `coreo.js` `comandoFx`, `seal(grade.fx.cg, RULES.CMD.GRADE_NAME[grade.fx.cg] + '!')` e `seal` aceita `'otimo'`/`'erro'` (som: `perfect` para ótimo, `weak` para erro).
- [ ] **Step 4: Rodar** `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -am "Comandos: servidor aplica Ótimo e Erro e anuncia a nota"`

### Task 3: Fintas na janela de defesa (servidor)

**Files:**
- Modify: `src/rules.js` (`defWindow`, linhas ~519–529), `src/handlers.js` (`def`, linhas 236–244)
- Test: `tools/test.js` (junto de `dfx`/`openAt`, ~linha 980)

**Interfaces:**
- Produces: `C.fin: Array<{ ease?: 1, fake?: number, dir?: '←'|'→' }>` paralelo a `C.beats` (decisão do plano: `beats` continua `number[]` para não quebrar `parryCheck`, `comandos.js` e os testes; o spec §8.2 pede só que as fintas existam). `fake` = ms a partir de `C.at`. Nova função exportada para teste: `finPlan(a: Char, hits: number, tel: boolean, beat: number) -> { beats: number[], fin: Fin[] }` em `src/rules.js` (e em `export`/`H` como os helpers já testados — siga o padrão de `defWindow`).
- Handler: `def` aceita `m.dir` opcional (`'←'|'→'`).

- [ ] **Step 1: Testes**: (a) inimigo comum (`!boss`, `rank` ≠ elite): `fin` todo `{}` e `beats` espaçadas em 700 ms; (b) chefe com golpe de 3 golpes: espaçamentos `[1100, +450, +900]` ou outra sequência **não uniforme** (assert `new Set(gaps).size > 1`) e todo `beat` mantém o último ≤ `C.w`; (c) chefe com golpe anunciado: toda batida tem `dir` ∈ `←/→`; (d) elite: ao longo de 200 chamadas ~30% ± 12% das batidas têm `ease` ou `fake`; (e) `def` com `fin[0].dir='→'` e aperto na zona de Esquiva **sem** `dir` ou com `dir:'←'` → nota `'cedo'`; com `dir:'→'` → `'esq'`; aperto na zona de Aparar sem `dir` continua `'par'`; (f) `fin[0].fake=400` e aperto em `C.at+400+60` → `'cedo'` mesmo que a zona normal desse `'esq'`; (g) aperto fora de `±120` do fake segue a zona normal.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar.** `finPlan`: comum → `{}` e gap 700; elite → por batida, 30% de chance de `ease:1` ou de `fake` (o fake só se o espaço até a batida anterior, ou `beat` para a primeira, for ≥ 900 ms; posição `beats[i] − 700`); chefe → gaps cíclicos `[450, 450, 900]` em golpe de vários golpes, `ease` ou `fake` em 50% das batidas (mesma restrição) e `dir` sorteado em toda batida de golpe anunciado. Em `defWindow`, usar `finPlan` e guardar `C.fin`. Em `def`: após calcular `g`, se `C.fin[i]?.fake != null && Math.abs(now − (C.at + fake)) ≤ 120` → `g='cedo'`; se `g==='esq' && C.fin[i]?.dir && m.dir !== C.fin[i].dir` → `g='cedo'`.
- [ ] **Step 4: Rodar** `npm test` → PASS (os testes de defesa existentes seguem verdes: comum não muda).
- [ ] **Step 5: Commit** `git commit -am "Defesa: fintas (batida atrasada, anel falso, combo irregular, direção da esquiva)"`

### Task 4: Palco de comando comum

**Files:**
- Create: `public/js/palco-cmd.js`
- Modify: `public/js/coreo.js` (`SFXC`/`sfxc`, linhas ~20–32), `public/player.html` (incluir `<script src="/js/palco-cmd.js">` **antes** de `comandos.js`)
- Test: `tools/ui-smoke.js` (bloco `palco`)

**Interfaces:**
- Produces: `window.openStage(opts) -> Stage | null` (`null` se já houver palco aberto).
  - `opts: { title: string, tone: 'atk'|'def'|'chq', el?: string, hero?: Char, foe?: Char, onClose?: () => void }`
  - `Stage: { ui: HTMLElement, fx: { burst(x, y, n, color?), flash(color?, ms?), shake(amp, ms), hitstop(ms), word(text, {x?, y?, color?}), speed(on: boolean) }, sfx(k: string, v?: number), buzz(pattern: number|number[]), setHint(text: string), result(g: Grade, r: { title: string, lines: string[] }, ms?: number) -> Promise<void>, close(ms?: number) }`
  - `ui` é o contêiner central do minigame (`width: min(70vmin, 560px)`; no celular, largura − 16 px). `x, y` em px relativos ao palco.
- `sfxc(k, v)` ganha o 2º argumento e chaves novas em `SFXC`: `tick`, `hit`, `miss`, `whoosh`, `charge` (`v` = 0..1 sobe o tom), `boom`.
- Camadas (de baixo para cima): fundo escurecido com `backdrop-filter: blur(6px)` (queda: só escurecer), faixas pretas de cima e de baixo, retratos do herói (esquerda) e do alvo (direita) entrando de lado, canvas de efeitos em tela cheia, `ui`, letreiro inclinado com `title`, dica. Abertura ~350 ms; `close` ~700 ms depois do resultado.
- Regras: `hitstop` congela só animações visuais (`animation-play-state: paused` e o loop do canvas), **nunca** os timers/medições dos minigames; `prefers-reduced-motion` desliga `shake`, zoom e linhas de velocidade e deixa `flash` suave; `buzz` usa `navigator.vibrate` se existir; Esc é tratado por quem chama (o palco não captura teclas).

- [ ] **Step 1: Teste (ui-smoke).** Na página da Ana: `openStage({title:'Teste',tone:'atk'})` devolve objeto; `.stage-cmd` ocupa ≥ 95% de `innerWidth` e `innerHeight`; um segundo `openStage` devolve `null`; `stage.result('perf', {title:'PERFEITO', lines:['×1,4 de dano']}, 200)` resolve e `.stage-cmd` some após `close()`; no viewport de celular 390×844 `document.documentElement.scrollWidth <= 390`. Rodar `UI_ONLY=palco npm run ui` → FAIL.
- [ ] **Step 2: Implementar** `palco-cmd.js` conforme a interface: um `<style>` injetado como em `comandos.js`; canvas 2D com partículas (`burst`), linhas de velocidade radiais, palavras grandes (`word`) em letreiro itálico peso 900 com contorno preto; paleta por `opts.el` (fogo laranja, raio amarelo-azulado, água azul, sombra roxa, demais branco/vermelho). Tipografia: Barlow já carregada.
- [ ] **Step 3: Implementar** os sons novos em `SFXC` (osciladores curtos como os existentes: `tick` triangle 1800 Hz 30 ms; `hit` thud + square; `miss` tom descendente grave; `whoosh` ruído passa-alta com varredura; `charge(v)` sawtooth de 180 a 900 Hz por `v`; `boom` thud grave).
- [ ] **Step 4: Rodar** `UI_ONLY=palco npm run ui` → PASS.
- [ ] **Step 5: Commit** `git add public/js/palco-cmd.js public/js/coreo.js public/player.html tools/ui-smoke.js && git commit -m "Comandos: palco cinemático comum (camadas, efeitos, sons, vibração, resultado)"`

### Task 5: Ataque no palco — infraestrutura, Tempo, Martelar, Segurar

**Files:**
- Modify: `public/js/cmd-ataque.js` (reescrita do corpo de `runCmd`; manter `window.runCmd`, `busy`, `finish`, prazo de 6 s, Esc)
- Test: `tools/ui-smoke.js` (bloco `cmd-ataque`)

**Interfaces:**
- Consumes: `openStage`/`Stage` (Task 4); `RULES.CMD.tune`, `tempoWin`, `gradeFrac`, `resultLines`, `cmdEffect`, `tier` (Task 1).
- Produces: `runCmd(key, hero, tgt, done) -> boolean` com o mesmo contrato; `done({ g, n, acc })` chamado uma vez. Ao fechar, mostra `stage.result(g, RULES.CMD.resultLines(s, c, RULES.CMD.cmdEffect(s, c)))`.
- Cada minigame descreve só o que desenha e como pontua; abertura do palco antes de o tempo começar (`T0` marcado depois da abertura de ~350 ms).

- [ ] **Step 1: Teste (ui-smoke).** Para `tempo`, `martelar`, `segurar` (chaves de nós existentes; achar com `Object.keys(S.skills).find(k=>S.skills[k].cmd===…)`): `runCmd` devolve `true`; `.stage-cmd` existe e é tela cheia; Esc fecha e `done` recebe `{g:''}`; sem tocar nada por 6,5 s `done` recebe `g:''` (use um relógio acelerado ou `page.clock` do Playwright); chamar `runCmd` de novo com o palco aberto devolve `false`. Rodar `UI_ONLY=cmd-ataque npm run ui` → FAIL.
- [ ] **Step 2: Implementar Tempo.** Anel grande fechando sobre o retrato do alvo; faixas Bom/Ótimo/Perfeito desenhadas segundo `tempoWin`; tique acelerando (`sfx('tick')`); **velocidade variável** nos níveis médio e difícil: o progresso do anel segue `ease(f)` (acelera, quase para, acelera) sem mudar o instante do impacto `T0 + dur`; **anel falso** (nível difícil): um segundo anel roxo fecha antes (em ~55% de `dur`) e apertar a ±120 ms dele dá `g:'erro'`. Nota: `|d| ≤ cp` perf, `≤ co` ótimo, `≤ cw` bom, senão `'erro'` (apertou) — não apertou = `''`. Acerto: corte diagonal + palavra `ZAN!` + `hitstop(90)` + `shake`.
- [ ] **Step 3: Implementar Martelar.** Meta e janela por `tune`; cada aperto: `sfx('hit')`, `burst`, `buzz(10)`, contador gigante; a barra treme mais quando enche; `n = round(f·mx)`, `g = gradeFrac(f, taps>0)`; cheio → `word('DON!')` e encerra.
- [ ] **Step 4: Implementar Segurar.** Orbe que cresce com `sfx('charge', v)`; faixas Perfeito/Ótimo/Bom pelo `tune` num medidor curvo; nível médio: a barra acelera no fim; difícil: oscila a velocidade (`v` é sempre função monótona do tempo para a nota ser justa); soltar antes de 30% = `'erro'`; passar do topo = `acc:-1`, `g:''` e explosão em vermelho.
- [ ] **Step 5: Rodar** `UI_ONLY=cmd-ataque npm run ui` e `npm test` → PASS.
- [ ] **Step 6: Commit** `git commit -am "Comandos de ataque: Tempo, Martelar e Segurar no palco, com nível e fintas"`

### Task 6: Ataque no palco — Sequência, Ritmo, Mira, Runa

**Files:**
- Modify: `public/js/cmd-ataque.js`
- Test: `tools/ui-smoke.js`

**Interfaces:** as mesmas da Task 5. Cada mecânica usa `tune(s, mods)`.

- [ ] **Step 1: Teste (ui-smoke):** estender o bloco `cmd-ataque` para `seq`, `ritmo`, `mira`, `runa`: abre tela cheia, Esc → `g:''`, prazo de 6 s → `g:''`; em `seq` apertar as setas certas nos instantes certos (ler `S.skills[key].seq`, cronometrar com `page.clock`) → `done.g === 'perf'`; em `mira` clicar longe do ponto → `g:'erro'`; em `runa` soltar o traço com 2 pontos → `g:''` (traço curto demais, tratado como não tentou).
- [ ] **Step 2: Implementar Sequência:** setas vêm voando de fora e travam numa trilha; tolerância `seqTol`; nível difícil usa batidas irregulares (gap 400/600/400/700 ms); acerto = corte na direção da seta; nota por `gradeFrac(acertos/total, tentou)`.
- [ ] **Step 3: Implementar Ritmo:** pista larga; `ritmoNotas` por nível; **notas duplas** no difícil (duas colunas, A/L ou toque na coluna); linha de acerto pulsa na batida; nota por `gradeFrac`.
- [ ] **Step 4: Implementar Mira:** retrato do alvo grande, luneta com zoom; ponto do `weakPart` (como hoje, `PART_POS`) com raio `tune.mira`; nível médio: a mira muda de direção; difícil: o ponto fraco também se move; limiares: Perfeito ≤ 40% do raio, Ótimo ≤ 70%, Bom ≤ 100%, fora = `'erro'`.
- [ ] **Step 5: Implementar Runa:** canvas grande com o símbolo-guia em traço fantasma, traço do jogador brilhante soltando partículas; limiares de `tune.runa`; semelhança < 35% = `'erro'`; traço com < 4 pontos = `''`; ao soltar o símbolo "acende" proporcional à semelhança.
- [ ] **Step 6: Rodar** `UI_ONLY=cmd-ataque npm run ui` e `npm test` → PASS.
- [ ] **Step 7: Commit** `git commit -am "Comandos de ataque: Sequência, Ritmo, Mira e Runa no palco"`

### Task 7: Defesa e Choque no palco

**Files:**
- Modify: `public/js/comandos.js` (reescrita do desenho; manter `heroes()`, `sync`, `render` encadeado, mensagens `def`/`chq`)
- Test: `tools/ui-smoke.js` (bloco `defesa`)

**Interfaces:**
- Consumes: `openStage` (Task 4), `S.battle.cmd` com `C.beats`, `C.fin`, `C.z`, `C.tel`, `C.perf`, `C.chq` (Task 3 e atuais).
- Produces: mensagem `{ t:'def', id, dir? }` — setas ←/→ (ou A/D) mandam `dir`; Espaço/toque mandam sem `dir`. O palco fecha sozinho quando `S.battle.cmd` some ou muda (`foe:at`).

- [ ] **Step 1: Teste (ui-smoke):** com uma janela aberta para a Ana (usar `tools/dev-cmd.js` como referência de como forçar `S.battle.cmd`): aparece `.stage-cmd` com o aviso `!`; apertar Espaço no momento certo manda `def` e a nota aparece como chip; seta `→` manda `dir:'→'`; ao fazer `S.battle.cmd = null` + `push()`, o palco some em ≤ 1 s e Espaço volta a rolar a página (listeners removidos).
- [ ] **Step 2: Implementar.** Abertura de 250 ms **dentro** do tempo do anel (o anel já está fechando atrás dela, sem atrasar o servidor); aviso `!` vermelho enorme com tremor; inimigo avançando da direita e herói à esquerda; anel central `min(60vmin, 440px)` com as zonas de Esquiva (azul) e Aparar (vermelho); desenhar as fintas: `ease` desacelera o anel e acelera de novo sem mudar o impacto, `fake` mostra o anel roxo, `dir` mostra uma seta grande indicando o lado da esquiva. Feedback por nota: `par` → faíscas + `KIN!` + `hitstop`; `esq` → borrão lateral + `whoosh`; `cedo`/levar → flash vermelho + `miss`. Choque: cabo de guerra em tela cheia, herói e inimigo nas pontas, energia no meio, a linha de encontro acompanha `ch.n / ch.meta`; martelar Espaço/C com faísca e `buzz(10)` a cada aperto.
- [ ] **Step 3: Rodar** `UI_ONLY=defesa npm run ui` e `npm test` → PASS.
- [ ] **Step 4: Commit** `git commit -am "Defesa e Choque no palco cinemático, com fintas desenhadas"`

### Task 8: Mesa, estilos dos selos, documentação e verificação final

**Files:**
- Modify: `public/js/coreo.js` / `public/style.css` (estilo dos selos `.seal.otimo`, `.seal.erro`; selo de Perfeito mais forte), `ARVORE-SISTEMAS.md` e `DECISOES-SISTEMAS.md` (graus, nível por requisito, erro ×0,85, fintas), `docs/demo-comandos.html` não muda (fora do escopo).
- Test: `npm test`, `npm run ui`

- [ ] **Step 1:** Selos `otimo` (verde-água) e `erro` (cinza avermelhado, pequeno) com respeito a `prefers-reduced-motion`; selo `perf` ganha flash e tremor curtos.
- [ ] **Step 2:** Documentar em `DECISOES-SISTEMAS.md` as decisões deste plano (graus e ×0,85 só ao tentar, nível por `rq`, `C.fin` paralelo a `C.beats`, fintas por tipo de inimigo) e em `ARVORE-SISTEMAS.md` a tabela por nível.
- [ ] **Step 3:** `npm test` e `npm run ui` completos → verdes (inclusive o bloco `celular`).
- [ ] **Step 4: Verificação manual no navegador** (`preview_start` com a configuração `dev`; criar uma batalha com um chefe e um herói com técnicas `tempo`, `martelar`, `segurar`, `seq`, `ritmo`, `mira`, `runa`; jogar cada uma e uma defesa com golpe anunciado de chefe): conferir tela cheia, retorno a cada toque, resultado com "o que rendeu", fintas visíveis; repetir em 390×844 e com `prefers-reduced-motion` (resize_window `colorScheme`/emulação). Anotar o que sobrar no `PROXIMOS-PASSOS.md`.
- [ ] **Step 5: Commit** `git commit -am "Comandos: selos Ótimo/Erro, documentação e verificação da Leva 1"`

---

## Self-Review

- **Cobertura do spec (Leva 1):** §4 palco → Task 4; §4.3 retorno e §4.4 resultado → Tasks 4–7; §5.1 graus → Tasks 1–2; §5.2 nível → Task 1; §5.3 tabela → Tasks 1, 5, 6; §6 mecânicas no palco → Tasks 5–7; §8 defesa e fintas → Tasks 3 e 7; §12 itens 15 (confiança na nota) → Global Constraints. Fora desta leva (Leva 2 e 3): QTE, Girar, Corte, Limite em fases, série de Perfeitos, `autoCmd`, filtro/ícone/destaque, Praticar, painel da mesa.
- **Decisão que diverge do texto do spec:** `C.beats` continua `number[]` com `C.fin` paralelo (spec §8.2 dizia objetos); motivo: não quebrar `parryCheck`, handlers e testes; a função das fintas é a mesma.
- **Tipos:** `Grade`, `tempoWin → {cw,co,cp}`, `Stage`, `C.fin` usados com os mesmos nomes em todas as tasks.

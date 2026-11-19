# Encaixe de grandes, zoom e luz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Câmera, zoom e seletor de comandos que respeitam o tamanho real das figuras, mais luz anime luminoso que reage ao turno.

**Architecture:** `cameraFor` (puro, testado no Node) passa a receber a altura `h` de cada ponto e uma faixa lateral `lane` reservada à coluna de comandos; `view()` em `palco3d.js` alimenta esses dados a partir das figuras montadas. `leque.js` escolhe o lado pela largura reservada e ancora pelo ombro proporcional. A luz usa véus e sombras CSS baratas, sem `filter` em camada 3D.

**Tech Stack:** JS puro no navegador, CSS 3D, testes `node tools/test.js`.

**Spec:** `docs/superpowers/specs/2026-11-19-encaixe-grandes-zoom-luz-design.md`

## Global Constraints

- Desempenho primeiro: sem `filter` em camadas 3D; planos grandes a 1/4 com `scale(4)` (`PK`); escurecer com véu `::after`.
- Qualidade Baixa (`.p3d[data-q=low]`): só sombra simples e holofote; sem tinta de elemento nova e sem sombra viva animada.
- UI do combate a 75% (`--hk`); coluna reserva ~560 px × `--hk` com a lista aberta.
- Sem `git stash`; outra sessão edita o mesmo checkout: `git add` só dos arquivos tocados; um commit por tarefa; terminar commit com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Figura: `h = (inimigo 380 | herói 300) × min(2.5, (chefe 1.6) × imgS)` (palco3d.js:300); `ptOf` já devolve `h` (padrão 330).

## Review Focus

- Chefe de 1200 px com os dois lados sem espaço: coluna reduzida por último, nunca fora da tela.
- Um único combatente (pts de 1 ponto) com `h` grande: câmera finita, `tz > -9000`.
- `h` ausente em algum ponto (batalha sem recortes montados): cai em 330, sem NaN.
- Janela estreita (< 900 px): `lane` zero ou menor, sem deslocar o recorte para fora.
- `prefers-reduced-motion` e qualidade Baixa: luz nova não anima.

---

### Task 1: Câmera com altura real, faixa lateral e zoom proporcional

**Files:**
- Modify: `public/js/palco3d.js` (`fitCam` l.50, `cameraFor` l.69-100, `view` l.245-253, `ptOf` l.348, `hw` l.349)
- Test: `tools/test.js` (junto aos testes de câmera, perto da l.1690)

**Interfaces:**
- Produces: `cameraFor({ kind:'table', ..., lane?: { w: number, side: 1|-1 } })`; pontos `{x, z, h?}` em todos os `kind` com `pts`; `cameraFor({ kind:'zoom', to:{x,z,h?}, ry })` usa `to.h`; `P.laneOf: () => { w, side }` (o leque informa via `PALCO3D.lane = { w, side }`, lido por `view`).

- [ ] **Step 1: Testes que falham** em `tools/test.js`:
  - `zoom proporcional`: `cameraFor({kind:'zoom', to:{x:0,z:-1500,h:1200}, ry:0}).tz` é menor (mais longe) que com `h:300`, e ambos finitos com `tz > -9000`.
  - `zoom piso/teto`: `h:50` e `h:5000` ficam entre `-2600` e `-300` de distância extra (constantes `ZMIN`, `ZMAX` definidas na etapa 3).
  - `table com chefe`: pts `[{x:-430,z:0,h:300},{x:0,z:-1500,h:1200}]`, `w:1440`: `tz` é menor que com `h:380` no mesmo ponto (recua para caber a figura alta).
  - `lane`: `cameraFor({kind:'table', ..., lane:{w:560*.75, side:1}}).tx` difere do sem `lane` e o ator fica deslocado para o lado oposto (`side:1` coluna à direita ⇒ ator para a esquerda); `lane.w` 0 ou ausente ⇒ resultado idêntico ao de hoje (teste existente da l.1500 continua verde).
  - `h` ausente ⇒ resultado finito (sem NaN) em `table`, `select` e `two`.
- [ ] **Step 2: Rodar** `node tools/test.js` e ver os novos asserts falharem.
- [ ] **Step 3: Implementar.**
  - `fitCam`: já usa `p.h || up`; manter. Em `cameraFor` os `pts` de `select` e `table` passam a considerar `h` (no `table` o laço de recuo `b` soma a altura: usar `Math.max(q.z..., ...)` com a cabeça `-(p.h||330)` projetada, i.e. fazer o teste de cabimento também para a cabeça).
  - `table`: aceitar `lane`; deslocar `SX` para o lado oposto à coluna: `SX = -200` vira `SX = -(200 + lane.side * lane.w * .5)` limitado a `±(w/2 * .45)`; `lane.w` ≤ 0 ou `w < 900` ⇒ sem efeito.
  - `zoom`: distância `-T.z - clamp(Math.round(380 + (to.h || 330) * 1.1), ZMIN, ZMAX)` com `ZMIN = 420`, `ZMAX = 1700`; `ty` sobe com a altura: `ty = -clamp((to.h||330) * .12, 40, 140)`.
  - `view()`: montar `pts` com `h` (função `withH(F)`: `[...F].map(([id,p]) => ({x:p.x, z:p.z, h: parseFloat(els.get(id)?.h) || 330}))`), passar `lane: P.lane` em `tbl()` e `to` com `h` em `zoom`. `P.lane = { w: 0, side: 1 }` exposto para o leque escrever.
- [ ] **Step 4: Rodar** `node tools/test.js`; esperado: tudo verde.
- [ ] **Step 5: Verificar no navegador** (`preview_start`): cena com chefe `imgS` 2.5, vistas V e zoom pela roda sobre o chefe mostram corpo inteiro; capturar.
- [ ] **Step 6: Commit**
```bash
git add public/js/palco3d.js tools/test.js
git commit -m "Palco: câmera usa a altura real, reserva faixa da coluna e zoom proporcional"
```

### Task 2: Seletor encaixado ao lado, sem cobrir, com 2ª coluna

**Files:**
- Modify: `public/js/leque.js` (`step`, l.58-89), `public/style.css` (regras `.lq`, `.lqm`, `.lqt`)
- Test: `tools/test.js` (extrair a decisão de lado para função pura)

**Interfaces:**
- Consumes: `PALCO3D.lane` e `PALCO3D.rectOf(id)` da Task 1.
- Produces: `pickSide(rect:{left,right,top,height}, L:{width,height}, w:number, wr:number, gap:number) -> { side: 1|-1, x: number, scale: number }` em `leque.js` exportada em `PALCO3D` ou objeto do leque para teste; `scale` ≤ 1 quando nenhum lado cabe.

- [ ] **Step 1: Testes que falham:** `pickSide` com recorte pequeno à esquerda ⇒ `side 1`, `scale 1`; recorte largo (1200 px de altura, largura ~600) centralizado em tela de 1440 ⇒ lado com mais folga, `x` sem sobrepor `[rect.left, rect.right]`; nenhum lado cabe ⇒ `scale < 1` e `scale ≥ .6`, coluna dentro de `[8, L.width-8]`; recorte nulo ⇒ meio, `side 1`.
- [ ] **Step 2: Rodar** e ver falhar.
- [ ] **Step 3: Implementar `pickSide`** e usar em `step`: `GAP = 22 + rect.height * .04` (proporcional), largura reservada `wr = max(w, 560 * hk)` (já existe, manter para a 2ª coluna não trocar o lado), âncora vertical `y = rt + rh * .22` mantida mas limitada a `rt + rh * .45` para chefe alto não empurrar a coluna ao pé; aplicar `scale` via `transform: translate(...) scale(s)` com `transform-origin` na borda voltada ao herói. Escrever `PALCO3D.lane = { w: wr, side }` ao fim de `step`; zerar quando o leque sai (`off()`/`reset()`), e chamar `render` da câmera só quando `side` ou `w` mudar (evitar loop).
- [ ] **Step 4: Rodar** `node tools/test.js`; verde.
- [ ] **Step 5: Navegador:** chefe grande, abrir Skills/Itens: a coluna não troca de lado, não cobre o corpo, não sai da tela em 1280×720 e 1920×1080; capturar.
- [ ] **Step 6: Commit**
```bash
git add public/js/leque.js public/style.css tools/test.js
git commit -m "Leque: encaixe lateral proporcional ao recorte, 2ª coluna reservada e escala se não couber"
```

### Task 3: Luz anime luminoso: holofote, tinta, sombra viva, hora do dia

**Files:**
- Modify: `public/js/palco3d.js` (`sync`, `P.light` l.408, classes por unidade), `public/js/terreno3d.js` (paleta por cena), `public/style.css` (regras `.p3d .bb .shadow` l.1525-1527/1698, véus)
- Test: `tools/test.js` (função pura `mood(scene) -> 'dia'|'tarde'|'noite'`)

**Interfaces:**
- Produces: `PALCO3D.mood(sc: object) -> 'dia'|'tarde'|'noite'` (usa `sc.mood`/`sc.hora` se existir; senão por tema do cenário: bosque→dia, pátio→tarde, praia→dia; padrão `dia`); atributo `data-mood` no `.p3d`; classe `.spot` na unidade da vez e `.dim` nas demais (só quando `data-q` ≠ `low` para o dim).

- [ ] **Step 1: Testes que falham:** `mood({mood:'noite'}) === 'noite'`; cena sem campo ⇒ por tema; valor inválido ⇒ `'dia'`.
- [ ] **Step 2: Rodar** e ver falhar.
- [ ] **Step 3: Implementar.**
  - `mood()` e `root.dataset.mood = mood(S.scenes[S.scene])` em `sync`.
  - CSS por `data-mood`: véu `::after` do cenário com cor/opacidade (dia: quente leve; tarde: laranja suave; noite: azul) e variável `--sun` usada pelo `terreno3d` já existente (cor da sombra `#1d4a7a`); nada de `filter`.
  - Holofote: `.bb.cur` ganha brilho por `box-shadow`/gradiente radial no chão (`ring` existente) e `.bb:not(.cur).dim` reduz `opacity` em ~.85 só quando `data-q` ≠ `low` (sem transição em `prefers-reduced-motion`).
  - Tinta do elemento: `P.light` também escreve `--tint` no `.p3d` por 500 ms e um véu `::after` com `mix-blend-mode: normal` (sem `filter`); não executar quando `data-q=low` ou `reducedM()`.
  - Sombra viva: `.shadow` de largura proporcional a `--h` (`width: calc(var(--h) * .75)`) em vez de 230 px fixos, mantendo `--lift`; já escala com salto/investida.
- [ ] **Step 4: Rodar** `node tools/test.js`; verde.
- [ ] **Step 5: Navegador:** conferir bosque, pátio e praia em qualidade Alta e Baixa; sem tela preta nos golpes; capturar. Rodar `read_console_messages` sem erros.
- [ ] **Step 6: Commit**
```bash
git add public/js/palco3d.js public/js/terreno3d.js public/style.css tools/test.js
git commit -m "Palco: luz anime luminoso com holofote, tinta do elemento, sombra proporcional e hora do dia"
```

## Autocheck

- Cobertura: câmera/zoom (T1), seletor e 2ª coluna (T2), luz e hora do dia (T3), Baixa e desempenho (restrições), validação (etapas 5).
- Contratos: `lane {w,side}`, `P.lane`, `pickSide`, `mood` usados com os mesmos nomes entre tarefas.
- Fora de escopo: responsividade geral, controle de hora do dia na mesa.

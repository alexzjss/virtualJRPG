# Palco 3D segue o grid — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A posição de cada combatente no palco 3D vem da posição do token no grid da cena (lado, distância, vizinhança), comprimida num palco legível.

**Architecture:** o eixo da batalha (`S.battle.ax`) é calculado por uma função pura compartilhada (`RULES.axisOf`, em `public/rules.js`). O servidor grava esse eixo ao ligar a batalha e quando o mestre reenquadra. O cliente projeta grid → mundo com funções puras em `palco3d.js` (testadas no Node) e desenha o chão, os anéis, a linha de alcance e o minimapa por cima do que já existe.

**Tech Stack:** JS puro (script global no navegador, ESM no servidor), CSS 3D, `node --test` (`npm test`), smoke de UI com Chromium (`npm run ui`).

**Spec:** `docs/superpowers/specs/2026-11-18-palco-grid-design.md` (ler antes de começar).

## Global Constraints

- Só visual: `src/rules.js`, o motor de combate e o simulador **não mudam**.
- Só PC (> 700 px, onde existe `[data-p3d]`). O celular fica intacto.
- A profundidade entre os centros dos grupos fica entre **900 e 2600 px**. A lateral é limitada ao campo da câmera (|x| ≤ 1000).
- O eixo é fixado ao ligar a batalha e muda só no "Reenquadrar" do mestre. Mover tokens nunca gira o palco.
- O recorte desliza ~0,6 s. Com `prefers-reduced-motion`, o movimento é instantâneo (a regra que já existe em `style.css:1205`).
- Facing como hoje: o herói usa `imgB` (costas) e o inimigo `imgF`.
- A distância mostrada vem em casas pela métrica de Chebyshev (`max(|dx|,|dy|)`, a mesma de `RULES` em `public/rules.js:90`) e em metros quando `sc.unit > 0`.
- Textos em português do Brasil, no tom dos comentários atuais. Um commit por tarefa, direto no `main`, com o rodapé `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `localStorage`, só com try/catch.

## Review Focus

1. **Centros coincidentes** (heróis e inimigos com o mesmo centro, ou um lado sem ninguém posicionado): o eixo cai no padrão `a = 0` (heróis à esquerda olhando para a direita) e a profundidade fica em 900. Nada de `NaN`. → teste na Tarefa 1.
2. **Save antigo sem `S.battle.ax`** (batalha já ligada antes da atualização): o cliente calcula o eixo na hora com `RULES.axisOf` e não quebra. → teste na Tarefa 2.
3. **Token tirado do mapa no meio da luta** (`x = null`): o recorte vai para um slot de reserva do seu lado, sem sobrepor ninguém. → teste na Tarefa 2.
4. **Mapa enorme** (80 casas, inimigo no canto oposto): a profundidade satura em 2600 e a lateral em ±1000. → teste na Tarefa 2.
5. **Jogador arrastando o token de outro no minimapa**: a UI não deixa arrastar e o servidor (`H.move` → `can`) recusa. Na tela da mesa, nada arrasta. → teste na Tarefa 5.

---

### Task 1: Eixo da batalha (servidor + regra compartilhada)

**Files:**
- Modify: `public/rules.js` (nova função e export em `g.RULES`)
- Modify: `src/handlers.js:231-270` (`battle`) e um handler novo `battleReframe`
- Modify: `src/handlers.js:21` (`NOUNDO`, não adicionar: reenquadrar entra no desfazer normal)
- Test: `tools/test.js`

**Interfaces:**
- Produces: `RULES.axisOf(chars: Array<{x,y,enemy}>) -> { a: number /* radianos; direção heróis→inimigos no grid */, cx: number, cy: number /* centro dos heróis, em casas */, d: number /* distância entre os centros, em casas */ }`. Ignora quem tem `x == null`. Sem heróis posicionados, `cx, cy` = centro dos inimigos − (3, 0). Sem inimigos posicionados, ou com `d < 0.5`: `a = 0`, `d = 0`. `a` é arredondado a 1e-4 (evitar -0).
- Produces: `S.battle.ax` com esse objeto, gravado em `battle(c, {on:true})` depois de preencher `ticks` (usa só os chars em `S.battle.ticks`).
- Produces: handler `battleReframe(c)`, só do mestre e só com a batalha ativa, que recalcula `S.battle.ax` e loga `Mestre: palco reenquadrado.`.

- [ ] **Step 1: Escrever os testes**

```js
test('axisOf: eixo heróis→inimigos, padrão sem inimigos e centros iguais', () => {
  const A = RULES.axisOf;
  const r = A([{ x: 1, y: 2 }, { x: 1, y: 4 }, { x: 9, y: 3, enemy: true }]);
  assert.equal(r.a, 0); assert.equal(r.cx, 1); assert.equal(r.cy, 3); assert.equal(r.d, 8);
  assert.ok(Math.abs(A([{ x: 5, y: 9 }, { x: 5, y: 1, enemy: true }]).a + Math.PI / 2) < 1e-3); // inimigos acima
  assert.deepEqual(A([{ x: 2, y: 2 }, { x: null, y: null, enemy: true }]), { a: 0, cx: 2, cy: 2, d: 0 });
  assert.equal(A([{ x: 3, y: 3 }, { x: 3, y: 3, enemy: true }]).d, 0);
});
test('battle: grava o eixo ao ligar; reenquadrar só o mestre', () => {
  reset(); const h = mk(gm, { name: 'H' }), e = mk(gm, { name: 'E', enemy: true });
  for (const o of [h, e]) H.place(gm, { id: o.id }); H.move(gm, { id: h.id, x: 1, y: 5 }); H.move(gm, { id: e.id, x: 6, y: 5 });
  H.battle(gm, { on: true }); assert.equal(S.battle.ax.a, 0);
  H.move(gm, { id: e.id, x: 1, y: 0 }); assert.equal(S.battle.ax.a, 0); // mover não gira
  H.battleReframe(ana); assert.equal(S.battle.ax.a, 0);
  H.battleReframe(gm); assert.ok(S.battle.ax.a < 0);
});
```

- [ ] **Step 2:** `npm test` → falha (`axisOf` não existe).
- [ ] **Step 3:** Implementar `axisOf` em `public/rules.js`, gravar `ax` em `battle` e criar `battleReframe`.
- [ ] **Step 4:** `npm test` → passa (todos, não só os novos).
- [ ] **Step 5:** Commit `Palco grid: eixo da batalha fixado ao ligar e reenquadrar do mestre`.

### Task 2: Formação a partir do grid (função pura)

**Files:**
- Modify: `public/js/palco3d.js:5-15` (`formation`) e `units()` em `palco3d.js:139-158`
- Test: `tools/test.js:1463-1475` (reescrever o teste de formação)

**Interfaces:**
- Consumes: `RULES.axisOf`, `S.battle.ax`.
- Produces: `PALCO3D.frame(ax, cols, rows) -> { a, cx, cy, k /* px por casa */, D /* profundidade px */ }`, com `D = clamp(ax.d * 260, 900, 2600)` e `k = ax.d > 0 ? D / ax.d : 260`.
- Produces: `PALCO3D.toWorld(gx, gy, fr) -> { x, z }`. Leva o grid para o mundo: a origem é o centro dos heróis (casa + 0,5), a profundidade é `z = -along * k` e a lateral `x = perp * k`. `along` é a projeção no eixo `a`; `perp` é a projeção na perpendicular, com a direita do eixo indo para `+x`. Limites: `x ∈ [-1000, 1000]`, `z ∈ [-D-900, 400]`.
- Produces: `PALCO3D.formation(chars: Array<{id,x,y,enemy}>, fr) -> Map<id,{x,z}>`. Faz em ordem: `toWorld` para quem tem posição → slots de reserva para quem não tem (heróis: `POS_H` atuais, relativos a (0,0); inimigos: o arco atual com o centro em `z = -D`) → separação. Duas unidades a menos de `MIN_SEP = 230` px (distância em x,z) se empurram em x, metade para cada lado, em até 8 passadas, na ordem do array (resultado determinístico). Valores inteiros, sem -0.
- Produces: `PALCO3D.lastFrame()` → o `fr` usado no último desenho (para as Tarefas 3 e 4).
- `units()` monta `fr` com `S.battle.ax || RULES.axisOf(inB)` e a cena `S.scenes[S.scene]`. O avanço do inimigo na vez dele deixa de ser `+900` e vira `p + (0 - p) / 2` em x e z (anda metade do caminho até o centro dos heróis).

- [ ] **Step 1: Reescrever o teste de formação**

```js
test('palco 3D: formação vem do grid', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D;
  const fr = P.frame({ a: 0, cx: 1, cy: 3, d: 8 }, 20, 10);
  assert.equal(fr.D, 2080);
  const F = P.formation([{ id: 'h', x: 1, y: 3 }, { id: 'e', x: 9, y: 3, enemy: true }, { id: 'f', x: 9, y: 0, enemy: true }], fr);
  assert.deepEqual(F.get('h'), { x: 0, z: 0 }); assert.equal(F.get('e').z, -2080);
  assert.ok(F.get('f').x < F.get('e').x);                                            // y menor = esquerda do eixo
  const far = P.formation([{ id: 'h', x: 0, y: 0 }, { id: 'e', x: 79, y: 40, enemy: true }], P.frame({ a: .47, cx: .5, cy: .5, d: 88 }, 80, 45));
  assert.ok(far.get('e').z >= -3500 && Math.abs(far.get('e').x) <= 1000);            // mapa enorme: satura
  const same = P.formation([{ id: 'a', x: 2, y: 2 }, { id: 'b', x: 2, y: 2 }], P.frame({ a: 0, cx: 2, cy: 2, d: 0 }, 10, 10));
  assert.ok(Math.abs(same.get('a').x - same.get('b').x) >= 230);                       // colisão separa
  const off = P.formation([{ id: 'h', x: 1, y: 3 }, { id: 'n', x: null, y: null }], fr);
  assert.ok(Math.hypot(off.get('n').x - off.get('h').x, off.get('n').z - off.get('h').z) >= 230); // sem posição: slot livre
  assert.ok(!Object.is(F.get('h').x, -0));
});
```

Manter as asserções atuais de `cameraFor` e `imgSrc` do teste antigo.

- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar `frame`, `toWorld`, `formation` e `lastFrame`, e trocar a chamada em `units()`, com o fallback para batalha sem `ax`.
- [ ] **Step 4:** `npm test` → passa. Depois, `npm run ui` → passa (o smoke já abre a batalha 3D).
- [ ] **Step 5:** Verificar no navegador (`preview_start` com o servidor do projeto, ver `GUIA-RODAR.md`): ligar uma batalha com tokens espalhados e conferir que lados e distâncias batem com o mapa. Mover um token pelo painel do mestre e ver o recorte mudar sem o palco girar. Tirar screenshot.
- [ ] **Step 6:** Commit `Palco grid: formação 3D vem da posição no grid`.

### Task 3: Deslizar, investida proporcional e reenquadrar na UI

**Files:**
- Modify: `public/style.css:1197` (transição do `.p3d .bb`)
- Modify: `public/js/palco3d.js:180-190` (`lunge`)
- Modify: `public/js/paginas.js:191` (`fieldBar`, botão do mestre)

**Interfaces:**
- Consumes: `lastF` (Map da Tarefa 2), handler `battleReframe` (Tarefa 1).
- Produces: `PALCO3D.lungeMs(dist: number /* px */) -> number`, igual a `clamp(Math.round(250 + dist * 0.12), 300, 700)`. A ida e a volta da investida usam esse valor no lugar de `LG_MS`, e o `.lunging` recebe `--lg: <ms>ms` para a transição do CSS.

- [ ] **Step 1:** Teste em `tools/test.js`: `lungeMs(0) === 300`, `lungeMs(1000) === 370`, `lungeMs(9000) === 700`.
- [ ] **Step 2:** `npm test` → falha. Implementar `lungeMs` e usar no `lunge`. Passar a transição do `transform` em `.p3d .bb` para `.6s` (a investida segue com `var(--lg)` via `.lunging`). `npm test` → passa.
- [ ] **Step 3:** No `fieldBar()`, só com `gm` e batalha 3D ativa, criar o botão `<button data-a="reframe" title="Recalcula a direção do palco a partir das posições atuais">Reenquadrar</button>`, que envia `{ t: 'battleReframe' }`. Seguir o padrão de `data-a` em `eventos.js`.
- [ ] **Step 4:** No navegador: mover um token durante a batalha e ver o recorte deslizar. Investida contra inimigo perto e longe (a duração muda). O mestre clica em Reenquadrar e o palco gira uma vez. `npm run ui` → passa.
- [ ] **Step 5:** Commit `Palco grid: recortes deslizam, investida pela distância e botão Reenquadrar`.

### Task 4: Chão — grade, anel no pé e linha de alcance

**Files:**
- Modify: `public/js/palco3d.js` (`ensure`/`scene`/`units`/`camera`: elementos novos no mundo)
- Modify: `public/style.css` (bloco `.p3d`, perto da linha 1197)

**Interfaces:**
- Consumes: `PALCO3D.toWorld`, `lastFrame()`, `local.aim`, a cena (`cols`, `rows`, `grid`, `unit`).
- Produces: `PALCO3D.rangeOf(a: {x,y}, b: {x,y}, unit: number) -> { casas: number, m: number | null }`, com `casas` em Chebyshev e `m = unit > 0 ? casas * unit : null`. Se algum dos dois não tiver posição, devolve `null`.

- [ ] **Step 1:** Teste: `rangeOf({x:1,y:1},{x:4,y:3},1.5)` → `{casas:3, m:4.5}`; com `unit 0` → `m: null`; com `x: null` → `null`.
- [ ] **Step 2:** `npm test` → falha. Implementar → passa.
- [ ] **Step 3: Grade.** Um plano `.floorgrid` dentro do mundo, deitado (`rotateX(90deg)`), com o tamanho `cols*k × rows*k` e `background-size: k k` em linhas finas (opacidade ~0,12). Posicionado e girado para que `toWorld(0,0)` caia no canto da casa (0,0) e as linhas sigam o eixo. Só aparece quando `sc.grid !== false`. Refeito só quando `fr` ou a cena mudarem (chave em string, como `scnKey`).
- [ ] **Step 4: Anel.** `<i class="ring">` em cada `.bb`, no chão, com a cor `--c` do personagem (a cor de inimigo padrão é `#e60012`). Fica no lugar da sombra, que continua embaixo.
- [ ] **Step 5: Linha de alcance.** Quando `local.aim` existe e o ator da vez e o alvo têm posição: uma faixa `.rangeln` no chão, do ator ao alvo, e um rótulo `.rangelb` no meio com `"3 casas · 4,5 m"` (ou só `"3 casas"`), com o número no formato `pt-BR`. Some ao tirar a mira.
- [ ] **Step 6:** No navegador: conferir a grade alinhada aos tokens (um token na casa (2,3) cai no meio da célula desenhada), o anel em cada um e a linha + o rótulo ao mirar. Screenshot. `npm run ui` → passa.
- [ ] **Step 7:** Commit `Palco grid: grade no chão, anel no pé e linha de alcance na mira`.

### Task 5: Minimapa na HUD

**Files:**
- Modify: `public/js/hud.js:86` (montagem da HUD) e uma função nova `miniMapa()` no mesmo módulo
- Modify: `public/js/eventos.js` (arrastar: reusar o envio `{t:'move', id, x, y}` de `eventos.js:250`)
- Modify: `public/style.css` (estilo `.hud-mini`)
- Test: `tools/test.js` (servidor) e `tools/ui-smoke.js`

**Interfaces:**
- Consumes: `S.scenes[S.scene]` (`cols`, `rows`, `ar`, `bg`, `fogOn`, `seen`), `mine(c)` (`nucleo.js:57`), o handler `move`.
- Produces: `.hud-mini[data-mini]`, logo abaixo de `.hud-order`, com ~180 px de largura e a proporção `sc.ar`. Fundo com a imagem do mapa, a grade e um ponto por token (`.mk` com `--c`, a borda do ator da vez destacada). Esconde tokens em casa com névoa para quem não é mestre e não é dono (a mesma regra do `hid` de `palco.js:45`). Recolhe e expande com um clique no título "Mapa" e com a tecla `M` (antes, confirmar em `eventos.js` e `leque.js` que `M` está livre; se não estiver, usar outra e anotar no commit). O estado fica em `localStorage['p3d.mini']`, com try/catch.
- Arrastar: só pontos com `mine(c)` (o mestre arrasta todos). Na tela da mesa (`o.table`), nada arrasta. Ao soltar, envia `move` com a casa sob o ponteiro.

- [ ] **Step 1:** Teste de servidor (Review Focus 5): o jogador `ana` tenta `H.move` no herói de `bia` durante a batalha → a posição não muda. No herói dela mesma → muda.
- [ ] **Step 2:** `npm test` → já deve passar (o `can` existe). Se falhar, o bug está no servidor: corrigir.
- [ ] **Step 3:** Implementar `miniMapa()`, o CSS, recolher e arrastar.
- [ ] **Step 4:** Em `tools/ui-smoke.js`, na batalha 3D do jogador: `.hud-mini` existe, tem um `.mk` por token visível, recolher alterna uma classe e a versão da mesa não tem ponto arrastável.
- [ ] **Step 5:** `npm run ui` → passa. No navegador: arrastar o próprio token, ver o recorte deslizar no 3D e confirmar que o token alheio não se mexe. Screenshot.
- [ ] **Step 6:** Commit `Palco grid: minimapa na HUD para mover o token sem sair do 3D`.

### Task 6: Documentação

- [ ] **Step 1:** Em `PROXIMOS-PASSOS.md`, na seção do palco 3D (linha ~89), acrescentar o parágrafo "Palco segue o grid": o que existe, as decisões do dono (as linhas de "Decisões do dono" do spec) e o que falta ver com gente de verdade (conforto da grade no chão; se o eixo fixo incomoda em lutas que mudam de lado).
- [ ] **Step 2:** Mudar o status do spec para `implementado`. `npm test` e `npm run ui` → passam.
- [ ] **Step 3:** Commit `Palco grid: documentação`.

# Polimento do palco de combate: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar peso, vida e leitura à cena de combate do palco 3D com as 30 melhorias que o dono escolheu em 2026-11-18.

**Architecture:** Há duas bases novas. A primeira é um relógio de cena (`CENA`, em `cena-tempo.js`) que congela ou desacelera as animações CSS, via `playbackRate` da Web Animations API, e o canvas do `anim-engine`, via tempo virtual. A segunda é um módulo puro (`PFX`, em `palco-fx.js`) com toda a matemática testável no Node: hitstop, tremida, trajetórias, partículas, auras e grupos de golpes. A parte do DOM fica assim: o que é câmera ou posição continua no `palco3d.js`, o que vive em cada recorte (pose, aura, escudo, setas, fantasmas, anel do QTE, tinta) vai para um arquivo novo, `palco-vida.js`, e a orquestração continua no `coreo.js`.

**Tech Stack:** JS puro no navegador (IIFE + `globalThis`), CSS 3D, Canvas 2D, Web Animations API e `node --test`. Nenhuma dependência nova.

**Spec:** não há spec separado (o dono pediu para ir direto ao plano). O escopo fechado está na seção **Escopo** abaixo e na memória `palco-polimento`. A base é `docs/superpowers/specs/2026-11-18-palco-3d-design.md`.

## Escopo (decisões do dono; não reperguntar)

- **Entra:** recuo direcional, poses por estado, sombra de contato viva; hitstop, tremida de câmera escalonada, slow-mo no golpe final, multi-hit encadeado; números com física, barra com rastro; deriva idle, arco cinematográfico, contracampo inimigo; parallax em camadas, partículas de clima 3D, luz do elemento; chefe em destaque, investida em arco; auras de condição, escudo visível, setas de buff/debuff, transformação com flash; corte de turno; entrada individual, KO em pinceladas, pose de vitória, derrota e fuga; parry com faísca, esquiva com fantasma, contra-ataque virado, QTE no recorte; replay local do golpe.
- **Fica de fora:** respiração idle, etiquetas de afinidade, contador de Cadeia, profundidade de campo, cicatrizes no chão, andar entre casas, formação por papel, telegrafar golpe, próximo da fila, fecho de rodada, todo o áudio novo, FX manuais do mestre, pular animações, modo cinema.

## Global Constraints

- **Pré-condição:** antes da Tarefa 1, a árvore precisa estar limpa. Hoje há 21 arquivos modificados e 2 não rastreados (`public/js/anim-engine.js`, `public/js/anim-profiles.js`) de trabalho anterior, e este plano mexe neles. Pergunte ao dono se esse trabalho deve ser commitado como está antes de começar.
- O palco 3D é só para PC (`.p3d` visível). O caminho 2D/celular (`.stage`, `.unit`, `.tok`) não muda de comportamento.
- Tudo vale igual para jogador, mesa e mestre (`player.html`, `table.html`, `gm.html`). Os efeitos são locais e nunca enviam nada ao servidor. As únicas exceções são o campo de cena `bbL` (Tarefa 7) e o campo `end` do log de fim de batalha (Tarefa 11).
- `prefers-reduced-motion: reduce`: hitstop, slow, tremida, deriva, órbitas e partículas viram no-op (resolvem na hora). Os números aparecem sem arco.
- Respeite `ANIMFX.settings`: `flashes: false` corta os flashes brancos (forma, parry), e `quality` define a contagem de partículas.
- Uma volta de hitstop nunca passa de 160 ms, e o `playbackRate` nunca pode ficar preso em 0 (há um teste para isso).
- Comentários em português, no estilo dos arquivos vizinhos (uma linha, o porquê).
- Scripts novos entram nas três páginas: `cena-tempo.js` e `palco-fx.js` antes de `palco3d.js`, e `palco-vida.js` logo depois de `palco3d.js`.
- `npm test` passa ao fim de cada tarefa. Um commit por tarefa, no `main`, com a mensagem `Palco polimento: <tema>`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Redesenho no meio do golpe.** O `render()` roda a cada estado e chama `PALCO3D.sync`, e isso não pode apagar classes nem elementos transitórios (aura, bolha, setas, fantasmas, tinta). O `PVIDA.unit` trabalha por diferença, guardando o último valor em `u`. O teste vai na Tarefa 8: chamar `PVIDA.unit` duas vezes com o mesmo `c` não recria o nó `.aura`.
2. **Batalha que acaba durante hitstop ou slow.** O teardown do palco chama `CENA.reset()`, e `factor()` volta a 1. O teste vai na Tarefa 1.
3. **Hitstops sobrepostos num multi-hit.** Segmentos sobrepostos usam o menor fator e o relógio virtual nunca anda para trás. O teste vai na Tarefa 1 (`virtualAt` monotônico).
4. **Chefe sem posição no grid, dois chefes, ou chefe junto de lacaios no grid.** Nenhum recorte pode ficar colado: a separação mínima (`MIN_SEP`) continua valendo depois do slot de chefe. O teste vai na Tarefa 6.
5. **Replay enquanto um golpe real ainda anima, ou fora da batalha.** O replay é recusado com um toast e não toca no KO nem nas barras. O teste de `actsAround` com log misto vai na Tarefa 12, e a recusa fica no smoke da Tarefa 13.

---

### Tarefa 1: Relógio de cena (`CENA`)

**Files:**
- Create: `public/js/cena-tempo.js`
- Modify: `public/js/anim-engine.js` (`frame`, `play`: tempo virtual)
- Modify: `public/player.html`, `public/gm.html`, `public/table.html` (script antes de `palco3d.js`)
- Test: `tools/test.js`

**Interfaces:**
- Produces (`globalThis.CENA`):
  - `virtualAt(real: number, segs: {t0,t1,f}[]) -> number` (puro)
  - `now() -> number`, `factor() -> number`
  - `hitstop(ms) -> Promise`, `slow(f, ms) -> Promise`, `wait(ms) -> Promise` (espera em tempo virtual)
  - `reset()`

- [ ] **Step 1: Escrever os testes que falham**

```js
test('CENA: tempo virtual com congelamento e câmera lenta', async () => {
  await import('../public/js/cena-tempo.js'); const C = globalThis.CENA;
  assert.equal(C.virtualAt(150, []), 150);
  assert.equal(C.virtualAt(150, [{ t0: 0, t1: 100, f: 0 }]), 50);
  assert.equal(C.virtualAt(200, [{ t0: 0, t1: 100, f: .5 }, { t0: 50, t1: 150, f: 0 }]), 75); // sobreposição: vale o menor fator
  let prev = -1; for (let r = 0; r <= 300; r += 7) { const v = C.virtualAt(r, [{ t0: 20, t1: 90, f: 0 }, { t0: 60, t1: 200, f: .3 }]); assert.ok(v >= prev); prev = v; }
  C.reset(); assert.equal(C.factor(), 1);
});
```

- [ ] **Step 2: Rodar `npm test` e confirmar a falha** (o módulo não existe).

- [ ] **Step 3: Implementar `cena-tempo.js`**

O `virtualAt` faz uma varredura: junta todos os `t0`/`t1` menores que `real`, ordena, e em cada intervalo `[p, q)` desconta `(q − p)·(1 − min f ativo)`. Não usa DOM no topo do arquivo; o que mexe em `document` fica sob `typeof document !== 'undefined'`.

O `apply()` define `a.playbackRate = factor()` para todo `document.getAnimations()` cujo `effect.target` esteja dentro de `.p3d, .fxl, .qte3d`. Ele roda em cada mudança de segmento e num ouvinte de captura de `animationstart`/`transitionrun` no `document`, para que as animações que começam durante o slow também desacelerem. Quando o último segmento expira (num `setTimeout` em tempo real), tudo volta a 1. `hitstop` limita `ms` a 160. Com movimento reduzido, `hitstop` e `slow` resolvem na hora. O `wait` resolve quando `now()` ≥ alvo, verificando a cada `requestAnimationFrame`, com reserva em `setTimeout(…, 50)` quando não há `rAF`.

- [ ] **Step 4: Ligar o motor ao tempo virtual**

Em `anim-engine.js`, troque `performance.now()` de `frame` e `play` por `clockNow()` (`typeof CENA !== 'undefined' ? CENA.now() : performance.now()`). As promessas `impact` e `done` do `play` passam a usar `CENA.wait(ms)` quando ele existe, e `setTimeout` quando não existe.

- [ ] **Step 5: Adicionar `<script src="/js/cena-tempo.js"></script>` nas três páginas, antes de `/js/palco3d.js`**

- [ ] **Step 6: Rodar `npm test` e confirmar que passa**

- [ ] **Step 7: Commit** `Palco polimento: relógio de cena`

---

### Tarefa 2: Peso do golpe (hitstop, tremida, slow-mo final, multi-hit)

**Files:**
- Create: `public/js/palco-fx.js` (as funções puras desta tarefa; as outras tarefas acrescentam as suas)
- Modify: `public/js/palco3d.js` (wrapper `.shk` entre `.cam` e `.world`; `P.quake`)
- Modify: `public/js/coreo.js` (`fx()`: queda de HP por alvo; `strikeFx` → `hits`)
- Modify: `public/style.css`, as três páginas (script `palco-fx.js` antes de `palco3d.js`)
- Test: `tools/test.js`

**Interfaces:**
- Produces (`globalThis.PFX`):
  - `hitstopMs(pct, crit, ko) -> ms`
  - `shakeAmp(pct, crit) -> px`
  - `shakeKeys(amp, dir) -> Keyframe[]` (7 quadros)
  - `slowFor({ ko, lastFoe, reduced }) -> {f, ms, zoom} | null`
  - `groupHits(acts) -> {id, a, s, parts: act[], total}[]`
- Produces (`PALCO3D`): `quake(amp, dir)` (WAAPI em `.shk`, 320 ms), `vignette(ms)` (classe `.p3d.vinheta`)
- Consumes: `CENA.hitstop`, `CENA.slow`

- [ ] **Step 1: Escrever os testes**

```js
test('PFX: hitstop, tremida, slow e grupos de golpes', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  assert.equal(F.hitstopMs(0, false, false), 0); assert.equal(F.hitstopMs(.05, false, false), 70); assert.equal(F.hitstopMs(.4, false, false), 140);
  assert.equal(F.hitstopMs(.1, true, false), 110); assert.equal(F.hitstopMs(.4, true, false), 160); assert.equal(F.hitstopMs(.01, false, true), 160);
  assert.equal(F.shakeAmp(0, false), 0); assert.equal(F.shakeAmp(.1, false), 8); assert.equal(F.shakeAmp(.2, true), 20); assert.equal(F.shakeAmp(.5, true), 28);
  const k = F.shakeKeys(10, -1); assert.equal(k.length, 7); assert.equal(k[0].transform, 'translate(0px,0px)'); assert.equal(k[6].transform, 'translate(0px,0px)'); assert.match(k[1].transform, /^translate\(-10px,/);
  assert.deepEqual(F.slowFor({ ko: true, lastFoe: true }), { f: .3, ms: 1000, zoom: true }); assert.deepEqual(F.slowFor({ ko: true, lastFoe: false }), { f: .5, ms: 400, zoom: false });
  assert.equal(F.slowFor({ ko: false }), null); assert.equal(F.slowFor({ ko: true, lastFoe: true, reduced: true }), null);
  const g = F.groupHits([{ fx: { id: 'e', a: 'h', s: 'X', dmg: 3 } }, { fx: { id: 'e', a: 'h', s: 'X', dmg: 4 } }, { fx: { id: 'f', a: 'h', s: 'X', dmg: 2 } }, { fx: { id: 'e', a: 'h', s: 'X', miss: 1 } }]);
  assert.deepEqual(g.map(x => [x.id, x.parts.length, x.total]), [['e', 2, 7], ['f', 1, 2], ['e', 1, 0]]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

- [ ] **Step 3: Implementar as funções em `palco-fx.js`** (IIFE que exporta `globalThis.PFX`, sem DOM)

- `hitstopMs`: 0 se `pct ≤ 0` e não houver `ko`. Com `ko`, é 160. Senão é `60 + 80·min(1, pct·2,5)`, mais 30 em crítico, limitado a 160 e arredondado.
- `shakeAmp`: `round(min(28, 4 + 40·pct + (crit ? 8 : 0)))`, e 0 quando `pct ≤ 0`.
- `shakeKeys`: x = `dir·amp·[0, 1, −.7, .5, −.3, .15, 0]` e y = `amp·.35·[0, −.6, .5, −.35, .2, −.1, 0]`, arredondados e com `−0` normalizado.
- `groupHits`: agrupa atos consecutivos com o mesmo `fx.id`, `fx.a` e `fx.s` que tenham `fx.dmg > 0`. Os demais atos viram grupos de um, com `total = dmg || 0`.

- [ ] **Step 4: Rodar e ver passar**

- [ ] **Step 5: Ligar no navegador**

`palco3d.js` `ensure()`: crie `shk = el('div','shk',cam)` e ponha `world` dentro dele. `P.quake(amp, dir)` chama `shk.animate(PFX.shakeKeys(amp, dir), { duration: 320, easing: 'ease-out' })`, e é no-op com movimento reduzido ou `amp = 0`.

Em `coreo.js` `fx()`: antes de gravar `hpPrev`, guarde em `dropPct: Map<id, fração>` a queda `(was − c.hp)/c.hpMax` deste lote. Em `hits()`, passe a iterar `PFX.groupHits(acts)`:
- cada parte cai a `140 ms` da anterior (era 90);
- `pct` da parte = `dropPct(id) · dmg / total` do alvo no lote;
- no palco 3D, cada parte dispara `CENA.hitstop(PFX.hitstopMs(pct, crit, ko))` e `PALCO3D.quake(PFX.shakeAmp(pct, crit), dir)`, com `dir` igual a `sign(x do alvo − x de quem age)` em `PALCO3D.lastFrame`, ou 1;
- um grupo com mais de 1 parte solta, 200 ms depois da última, o número total `= −N` com a classe `float total`;
- no 3D, o tremor antigo de `stage.classList.add('shake')` no crítico sai (o quake o substitui); no 2D ele continua.

KO (alvo em `koHold`): calcule `PFX.slowFor({ ko: true, lastFoe: <inimigo e nenhum outro inimigo vivo em ticks>, reduced })`. Se vier resultado, chame `CENA.slow(f, ms)`; com `zoom`, chame também `PALCO3D.focus(id, [])` e `PALCO3D.vignette(ms)`.

- [ ] **Step 6: CSS**

`.p3d .shk{transform-style:preserve-3d}` e a vinheta (`.p3d.vinheta::after`, radial escura 0→.55, transição de 200 ms).

- [ ] **Step 7: Adicionar `<script src="/js/palco-fx.js"></script>` nas três páginas, antes de `palco3d.js`. Rodar `npm test`.**

- [ ] **Step 8: Commit** `Palco polimento: hitstop, tremida, slow-mo e multi-hit`

---

### Tarefa 3: Números com física e barra com rastro

**Files:**
- Modify: `public/js/palco-fx.js`, `public/js/coreo.js` (números em `hits`; barras `[data-bid]` em `fx()`), `public/js/palco3d.js` (rastro na mini barra `.mini .hp`), `public/style.css`
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `PFX.numberPath(t: s, {vx, vy=-520, g=1500, floor=70, e=.35}) -> {x, y, a}`
  - `PFX.numberSeed(i, crit) -> {vx, vy}`
  - `PFX.trailPlan(oldPct, newPct) -> {heal, bar:{to, delay}, trail:{from, to, delay}} | null`

- [ ] **Step 1: Testes**

```js
test('PFX: arco dos números e plano do rastro da barra', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX, P = { vx: 50 };
  assert.deepEqual(F.numberPath(0, P), { x: 0, y: 0, a: 1 });
  for (let t = 0; t <= 1.3; t += .02) assert.ok(F.numberPath(t, P).y <= 70.001);
  assert.equal(F.numberPath(1.2, P).a, 0); assert.equal(F.numberPath(.5, P).a, 1);
  assert.equal(F.numberSeed(0, false).vx, -40); assert.equal(F.numberSeed(1, false).vx, 77); assert.equal(F.numberSeed(0, true).vy, -680);
  assert.deepEqual(F.trailPlan(80, 50), { heal: false, bar: { to: 50, delay: 0 }, trail: { from: 80, to: 50, delay: 450 } });
  assert.deepEqual(F.trailPlan(50, 80), { heal: true, bar: { to: 80, delay: 450 }, trail: { from: 50, to: 80, delay: 0 } });
  assert.equal(F.trailPlan(50, 50), null);
});
```

- [ ] **Step 2: Rodar e ver falhar**

- [ ] **Step 3: Implementar**

`numberPath`:

```js
// balístico até o chão (y = floor, para baixo é +), um quique com restituição e, depois disso, parado; some de .75 s a 1,2 s
const tf = (-vy + Math.sqrt(vy * vy + 2 * g * floor)) / g;           // instante em que toca o chão
let y; if (t <= tf) y = vy * t + g * t * t / 2;
else { const v2 = -e * (vy + g * tf), u = t - tf, y2 = floor + v2 * u + g * u * u / 2; y = Math.min(floor, y2); }
const x = vx * Math.min(t, tf * 1.6), a = t <= .75 ? 1 : Math.max(0, 1 - (t - .75) / .45);
return { x: +x.toFixed(1) + 0, y: +y.toFixed(1) + 0, a: +a.toFixed(3) }; // + 0 tira o −0 (o deepStrictEqual distingue) e toFixed evita 1e-16 no fim
```

`numberSeed(i, crit)`: `vx = (i % 2 ? 1 : -1) · (40 + (i·37) % 60)` e `vy = crit ? −680 : −520`.

- [ ] **Step 4: Rodar e ver passar**

- [ ] **Step 5: Números no navegador**

Em `coreo.js`, a criação do `float` passa por `floatNum(el, text, cls, i, elem)`. A função cria o `fxAdd('float …')` como hoje e, no 3D sem movimento reduzido, chama `d.animate(keys, { duration: 1200, fill: 'forwards' })`. `keys` tem 13 amostras de `numberPath(k·.1, numberSeed(i, crit))` em `translate(x px, y px) scale(s)`, com `s` de 1,25 no crítico (1 nos demais) e `opacity` igual a `a`. A cor `--fx` vem de `ANIM_PROFILES.PALETTES[elem]?.[1]` (cura e erro mantêm as cores atuais). O crítico ganha a classe `crit`, que faz o número tremer em CSS.

- [ ] **Step 6: Rastro das barras**

Nas barras `[data-bid]` de `fx()`, aplique `trailPlan(old, p)`: a barra recebe `transitionDelay = wait + bar.delay`. Um irmão `.trail` (crie-o uma vez dentro do mesmo trilho, se não existir) vai de `trail.from` a `trail.to` com `transitionDelay = wait + trail.delay` e ganha a classe `heal` quando `heal`. Na mini barra do inimigo no 3D (`palco3d.js` `units()`), crie `u.hpt` ao lado de `u.hpi` com a mesma regra (rastro em 450 ms quando cai, barra atrasada quando sobe).

- [ ] **Step 7: CSS**

`.trail` fica atrás da barra: claro (`#fff8`) quando cai e verde (`#3ddc84`) quando é cura, com `transition: width .5s ease-out`.

- [ ] **Step 8: `npm test` e commit** `Palco polimento: números com física e barra com rastro`

---

### Tarefa 4: Recuo direcional, sombra viva e investida em arco

**Files:**
- Modify: `public/js/palco-fx.js`, `public/js/palco3d.js` (`P.recoil`, `P.lunge(from, to, family)`, vars `--rx`/`--rz`/`--lift`), `public/js/coreo.js` (chamadas), `public/style.css`
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `PFX.recoilVec(from:{x,z}, to:{x,z}, pct, crit) -> {dx, dz, tilt, kneel}`
  - `PFX.lungeArc(family) -> {h, crouch, ease}`
  - `PALCO3D.recoil(id, fromId, pct, crit)`
  - `PALCO3D.lunge(fromId, toId, family?)` (o terceiro parâmetro é novo)
- Consumes: `ANIM_PROFILES.familyOf`

- [ ] **Step 1: Testes**

```js
test('PFX: recuo e arco da investida', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  assert.deepEqual(F.recoilVec({ x: 0, z: 0 }, { x: 0, z: -1000 }, .1, false), { dx: 0, dz: -48, tilt: 6, kneel: false });
  assert.deepEqual(F.recoilVec({ x: 0, z: 0 }, { x: 300, z: 0 }, .5, true), { dx: 120, dz: 0, tilt: 14, kneel: true });
  assert.equal(F.recoilVec({ x: 5, z: 5 }, { x: 5, z: 5 }, .3, false).dz, 84);      // mesmo ponto: empurra para a câmera (+z)
  assert.equal(F.recoilVec({ x: 0, z: 0 }, { x: 0, z: -10 }, .25, false).kneel, true);
  assert.deepEqual(F.lungeArc('smash'), { h: 220, crouch: .1, ease: 'cubic-bezier(.3,0,.4,1)' });
  assert.deepEqual(F.lungeArc('dash'), { h: 0, crouch: .06, ease: 'cubic-bezier(.2,.9,.3,1)' });
  assert.deepEqual(F.lungeArc('pierce'), { h: 0, crouch: 0, ease: 'linear' });
  assert.deepEqual(F.lungeArc('slash'), { h: 80, crouch: .04, ease: 'cubic-bezier(.4,0,.2,1)' });
  assert.deepEqual(F.lungeArc('beam'), { h: 60, crouch: .04, ease: 'cubic-bezier(.4,0,.2,1)' });
});
```

- [ ] **Step 2: Ver falhar.** **Step 3: Implementar.**

`recoilVec`: direção unitária `to − from`, que é `(0, 1)` quando a distância é menor que 1. `dist = round(30 + 90·min(1, pct·2))`, `tilt = sign(ux || 1)·round(4 + 10·min(1, pct·2))` e `kneel = crit || pct ≥ .25`. Normalize `−0`.

- [ ] **Step 4: Ver passar**

- [ ] **Step 5: DOM**

`.bb` passa a somar `--rx`/`--rz` (padrão 0) no `translate3d` do CSS existente. `P.recoil` lê `lastF`, aplica `--rx`/`--rz` e `--tilt` na hora, sem transição, e os zera depois de 140 ms com `transition .3s`. Com `kneel`, a classe `kneel` fica 400 ms no `.bb` e aplica `scaleY(.86)` no `.bbi`.

Em `coreo.js` `hits()`, no 3D, `PALCO3D.shake(f.id)` vira `PALCO3D.recoil(f.id, f0.a, pct, f.crit)`. O `P.shake` continua existindo para o `comandos.js`.

`P.lunge(fromId, toId, family)`: aplique `lungeArc(family)` como vars `--arc-h` (px), `--crouch` e `--lg-ease` no `.bb`, com a classe `arc`. A animação `bbarc` do `.bbi` agacha em 0–15%, sobe até `translateY(calc(var(--arc-h) * -1px))` em 50% e pousa em 100%, com duração `--lg`.

**Sombra viva:** a `.shadow` usa `--lift` (0–1): `transform: scale(calc(1 - var(--lift) * .5))` e `opacity: calc(1 - var(--lift) * .6)`. `bbarc` também anima `--lift` (registre-a com `@property --lift { syntax: '<number>'; inherits: true; initial-value: 0 }`). Some no `.bb.foe.ko`.

No `coreo.js`, quem chama `PALCO3D.lunge` passa `ANIM_PROFILES.familyOf(sk, f0)`.

- [ ] **Step 6: `npm test`. Commit** `Palco polimento: recuo, sombra viva e investida em arco`

---

### Tarefa 5: Câmera (deriva idle, arco cinematográfico, contracampo inimigo)

**Files:**
- Modify: `public/js/palco3d.js` (`cameraFor` ganha `kind: 'orbit'`; wrapper `.drift`; `P.orbitShot`, `P.orbitGroup`; `P.lunge` e `P.focus` com câmera de contracampo), `public/js/coreo.js` (`impact`: arco no Limite e no Domínio), `public/style.css`
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `cameraFor({ kind: 'orbit', at:{x,z}, ry0, deg })` → `{tx, ty, tz, ry}`
  - `PALCO3D.orbitShot(id, deg = 45, ms = 1000) -> Promise`
  - `PALCO3D.orbitGroup(ids, deg, ms) -> Promise`
  - `PALCO3D.focus(fromId, toIds, ms = 420)` (o terceiro parâmetro é novo)

- [ ] **Step 1: Testes**

```js
test('palco 3D: órbita e contracampo do inimigo', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D, at = { x: 200, z: -300 };
  const o = P.cameraFor({ kind: 'orbit', at, ry0: 10, deg: 45 }), A = P.rotP(at, 55);
  assert.equal(o.ry, 55); assert.equal(o.tx, -Math.round(A.x)); assert.equal(o.tz, Math.round(-A.z - 620)); assert.equal(o.ty, -60);
  const foe = { x: 0, z: -2000 }, hero = { x: 0, z: 0 }, c = P.cameraFor({ kind: 'table', at: foe, pts: [foe, hero], w: 1440, foe: true });
  assert.equal(P.unitKind({}, c.ry), 'f'); // do ombro do inimigo o herói aparece de frente
});
```

- [ ] **Step 2: Ver falhar** (`orbit` ainda não existe). **Step 3: Implementar**

`orbit`: `ry = ry0 + deg`, `A = rotP(at, ry)` e `{tx: −A.x, ty: −60, tz: −A.z − 620, ry}`.

`P.orbitShot`: põe `camLock` em `orbit` a partir do `ry` atual, com transição `ms`, e resolve em `ms`. `P.orbitGroup` faz o mesmo no centroide de `ids`, com `tz` recuado em mais 400.

**Contracampo:** em `P.lunge`, quando quem age é inimigo, `camLock = cameraFor({ kind: 'table', at: from, pts: [from, to], w, foe: true })`, no lugar do enquadre atual no ombro do alvo. Em `P.focus`, quando quem age é inimigo, `pts` são só quem age e os alvos (já é assim) e vale `foe: true`.

**Deriva:** um novo wrapper `.drift` entre `.shk` e `.world` (`cam > shk > drift > world`), com `transform-origin: 50% 50% -600px` e a animação `p3drift 16s ease-in-out infinite alternate` (`rotateY(-2deg) translateY(-4px)` ↔ `rotateY(2deg) translateY(4px)`). Ela fica pausada (`animation-play-state: paused`) quando `.p3d.locked` (aplique `locked` enquanto `camLock` existir), em `.p3d.selecting` e com movimento reduzido.

No `coreo.js` `impact()`, com `lim` ou `dom` no 3D, `PALCO3D.orbitShot(a.id, 45, 1000)` corre junto com a `cutscene`.

- [ ] **Step 4: `npm test`. Commit** `Palco polimento: deriva, arco cinematográfico e contracampo`

---

### Tarefa 6: Chefe em destaque

**Files:**
- Modify: `public/js/palco3d.js` (`formation`, altura em `units()`), `public/js/coreo.js` (`intro`: faixa do chefe), `public/style.css`
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `c.boss` (já enviado pelo `scrub` em `src/net.js`)
- Produces: `formation` com o slot de chefe; `.bossband` no `fxl`

- [ ] **Step 1: Testes**

```js
test('palco 3D: chefe no centro ao fundo, lacaios abrindo o arco, ninguém colado', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D, fr = P.frame({ a: 0, cx: 0, cy: 0, d: 8 }, 20, 10);
  const F = P.formation([{ id: 'h' }, { id: 'b', enemy: true, boss: true }, { id: 'm1', enemy: true }, { id: 'm2', enemy: true }, { id: 'm3', enemy: true }], fr);
  assert.deepEqual(F.get('b'), { x: 0, z: -fr.D - 250 });
  assert.deepEqual(F.get('m1'), { x: -420, z: -fr.D }); assert.deepEqual(F.get('m2'), { x: 420, z: -fr.D }); assert.deepEqual(F.get('m3'), { x: -760, z: -fr.D + 120 });
  const G = P.formation([{ id: 'b1', enemy: true, boss: true }, { id: 'b2', enemy: true, boss: true }, { id: 'g', enemy: true, boss: true, x: 0, y: 0 }], fr), v = [...G.values()];
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) assert.ok(Math.hypot(v[i].x - v[j].x, v[i].z - v[j].z) >= 229);
});
```

- [ ] **Step 2: Ver falhar.** **Step 3: Implementar**

Sem posição no grid, o primeiro chefe vai a `{0, −D − 250}` e os chefes seguintes entram como lacaios. Quando existe chefe, os lacaios sem posição (`i` conta só os lacaios, a partir de 0) ficam em `x = (i % 2 ? 1 : −1)·(420 + 340·⌊i/2⌋)` e `z = −D + 120·⌊i/2⌋`. Sem chefe, a fórmula antiga continua. A separação final (`MIN_SEP`) roda como hoje.

Altura em `units()`: o chefe multiplica a base por 1,6 antes do `imgS`, e o fator total fica limitado a 2,5.

- [ ] **Step 4: Faixa do chefe**

Em `intro()`, se algum inimigo em `ticks` tem `boss`, 900 ms depois entra `fxAdd('bossband', '<small>Chefe</small><b>NOME</b>', 1600)`, com o retrato de `PALCO3D.imgSrc(c, 'p')`. O CSS é uma faixa vermelha larga na diagonal, na paleta do leque.

- [ ] **Step 5: `npm test`. Commit** `Palco polimento: chefe em destaque`

---

### Tarefa 7: Cenário (parallax, partículas de clima, luz do elemento)

**Files:**
- Modify: `src/handlers.js:166-171` (novo `m.f === 'bbL'`), `public/js/eventos.js:15` (envio das camadas no editor de fundo da batalha) e a interface do mestre que hoje envia `f: 'bbg'` (dois campos de imagem, "Céu" e "Frente", ao lado do fundo)
- Modify: `public/js/palco-fx.js`, `public/js/palco3d.js` (`scene()`: camadas e partículas; `P.light`), `public/js/coreo.js` (chama `P.light` no impacto), `public/style.css`
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `sc.bbL = { ceu?: url, frente?: url }`
  - `PFX.layerPlanes(sc) -> {key, url, z, k}[]`
  - `PFX.particleCount(quality, reduced) -> n`
  - `PFX.particlesFor(clima, n, seed) -> {x, z, y0, dur, delay, s, kind}[]`
  - `PFX.litUnits(F: Map, c:{x,z}, R = 600) -> {id, k}[]`
  - `PALCO3D.light(id, color)`

- [ ] **Step 1: Testes**

```js
test('cena: camadas do parallax vêm do mestre e só aceitam URL válida', () => {
  reset(); H.map(gm, { f: 'bbL', v: { ceu: '/uploads/c.png', frente: 'javascript:x' } }); // H.map trata os campos de cena (linhas 159-171)
  assert.deepEqual(S.scenes[S.scene].bbL, { ceu: '/uploads/c.png' });
});
test('PFX: camadas, partículas e luz', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  assert.deepEqual(F.layerPlanes({ bbL: { ceu: '/a.png', frente: '/b.png' } }), [{ key: 'ceu', url: '/a.png', z: -4200, k: 1.444 }, { key: 'frente', url: '/b.png', z: -700, k: .472 }]);
  assert.deepEqual(F.layerPlanes({}), []);
  assert.equal(F.particleCount('high', false), 80); assert.equal(F.particleCount('auto', false), 80); assert.equal(F.particleCount('medium', false), 48); assert.equal(F.particleCount('low', false), 24); assert.equal(F.particleCount('high', true), 0);
  const ps = F.particlesFor('neve', 30, 7); assert.equal(ps.length, 30); assert.ok(ps.every(p => p.kind === 'floco' && p.x >= -1400 && p.x <= 1400 && p.z >= -3200 && p.z <= 400 && p.dur >= 6 && p.dur <= 10));
  assert.deepEqual(F.particlesFor('neve', 30, 7), ps); // determinístico
  assert.equal(F.particlesFor('', 30, 7).length, 0);
  const L = F.litUnits(new Map([['a', { x: 0, z: 0 }], ['b', { x: 300, z: 0 }], ['c', { x: 900, z: 0 }]]), { x: 0, z: 0 });
  assert.deepEqual(L, [{ id: 'a', k: 1 }, { id: 'b', k: .5 }]);
});
```

- [ ] **Step 2: Ver falhar.** **Step 3: Implementar**

**Servidor:** `bbL` só guarda as chaves `ceu`/`frente` cujos valores passam em `okUrl`; um valor vazio apaga a chave, e quando nenhuma sobra o campo fica `undefined`.

**`layerPlanes`:** usa `k = round((1000 − z)/3600, 3)`, que mantém o tamanho aparente igual ao do plano de fundo atual (z −2600).

**`particlesFor`:** gerador próprio, determinístico pela `seed`. `kind` e `dur` dependem do clima:
- `chuva`: `gota`, de .7 a 1,1 s
- `neve`: `floco`, de 6 a 10 s
- `cinzas`: `cinza`, de 7 a 12 s
- `brasas`: `brasa`, de 3 a 5 s, sobem
- `neblina`: `nevoa`, de 14 a 22 s

Os demais valores: `y0` entre −900 e −100, `delay` entre 0 e `dur` e `s` entre .6 e 1,4. Um clima desconhecido gera `[]`.

**`litUnits`:** para cada id a menos de `R`, devolve `k = round2(1 − d/R)`, em ordem decrescente de `k`.

**`scene()` em `palco3d.js`:** acrescente à chave do cache `JSON.stringify(sc.bbL)` e a qualidade. Cada camada vira um `.bbplane.layer` com `translateZ(z) scale(k)`; a `frente` fica na metade de baixo, com `pointer-events: none`. As partículas vão para um `.pcl` dentro de `atw`, uma `<i>` por partícula em `translate3d(x, y0, z)`, com a animação CSS do `kind` (queda, deriva, subida ou névoa rasteira). O `.clima` plano antigo sai quando existem partículas.

**`P.light(id, color)`:** aplica, por 500 ms, `--lit: color` e `--litk: k` nos recortes de `litUnits(lastF, pos(id))`, com a classe `lit` (`filter: drop-shadow(0 0 calc(var(--litk) * 40px) var(--lit)) brightness(calc(1 + var(--litk) * .25))`). Também põe um disco radial `.flare` no chão em `pos(id)`, com `rotateX(90deg)`, que some em 500 ms. O `coreo.js` chama a função em cada parte de dano com `ELC[f.el]`.

- [ ] **Step 4: Editor do mestre**

Os campos "Céu (camada de trás)" e "Frente (PNG com transparência)" usam o mesmo upload do fundo e enviam `{ t: <mesma mensagem do bbg>, f: 'bbL', v: {...} }`.

- [ ] **Step 5: `npm test`. Commit** `Palco polimento: parallax, partículas e luz do elemento`

---

### Tarefa 8: Estados no recorte (poses, auras, escudo, setas, transformação)

**Files:**
- Create: `public/js/palco-vida.js` (`globalThis.PVIDA`, DOM)
- Modify: `public/js/palco-fx.js` (funções puras), `public/js/palco3d.js` (`units()` chama `PVIDA.unit(u, c)`), `public/js/anim-engine.js` (sai o anel de escudo de `drawPersistent`), `src/net.js:105` (`scrub` manda `shield` e `form` se ainda não manda), `public/style.css`, as três páginas (script depois de `palco3d.js`)
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `PFX.poseOf(c) -> string[]`
  - `PFX.auraOf(st) -> string[]` (≤ 3)
  - `PFX.buffsOf(st) -> {k, dir, col}[]`
  - `PFX.buffDiff(prevSt, st) -> {k, dir, col}[]`
  - `PFX.shieldCracks(cur, max) -> {on, cracks}`
  - `PVIDA.unit(u, c)` (por diferença; guarda `u.pose`, `u.auraK`, `u.shK`, `u.stPrev`, `u.formPrev`)

- [ ] **Step 1: Testes**

```js
test('PFX: poses, auras, buffs e escudo', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  assert.deepEqual(F.poseOf({ hp: 0, hpMax: 10, limit: 100 }), ['ko']);
  assert.deepEqual(F.poseOf({ hp: 2, hpMax: 10, limit: 100 }), ['ferido', 'limite']);
  assert.deepEqual(F.poseOf({ hp: 9, hpMax: 10, limit: 40 }), []);
  assert.deepEqual(F.auraOf({ poison: 2, frozen: 1, fear: 1, dread: 1, wet: 1 }), ['gelo', 'bolhas', 'tremor']);
  assert.deepEqual(F.auraOf({ atkUp: 1 }), []);
  assert.deepEqual(F.buffsOf({ atkUp: 1, agiDn: 2 }), [{ k: 'atk', dir: 1, col: '#ff493d' }, { k: 'agi', dir: -1, col: '#45e6b3' }]);
  assert.deepEqual(F.buffDiff({ atkUp: 1 }, { atkUp: 1, defDn: 1 }), [{ k: 'def', dir: -1, col: '#e39b46' }]);
  assert.deepEqual(F.shieldCracks(0, 30), { on: false, cracks: 0 }); assert.deepEqual(F.shieldCracks(30, 30), { on: true, cracks: 0 });
  assert.deepEqual(F.shieldCracks(15, 30), { on: true, cracks: 1 }); assert.deepEqual(F.shieldCracks(5, 30), { on: true, cracks: 2 });
});
test('scrub manda escudo e forma do inimigo', async () => {
  const { scrub } = await import('../src/net.js'); reset(); const e = mk(gm, { enemy: true, name: 'Y' }); e.shield = 10; e.form = 'k';
  const p = scrub(e); assert.ok(p.shield > 0); assert.equal(p.form, 'k');
});
```

- [ ] **Step 2: Ver falhar.** **Step 3: Implementar as funções puras**

**`poseOf`:** devolve `['ko']` se `hp ≤ 0`. Senão, `ferido` se `hp/hpMax ≤ .25` e `limite` se `limit ≥ 100`, nessa ordem.

**`auraOf`:** segue esta prioridade, sem repetir aura e com no máximo 3:

| Condição | Aura |
|---|---|
| frozen | gelo |
| burn | brasas |
| poison | bolhas |
| stun | estrelas |
| sleep | zzz |
| para | faiscas |
| fear | tremor |
| dread | tremor |
| bleed | gotas |
| curse | nevoa |
| possess | nevoa |
| confuse | espiral |
| rad | radiacao |
| wet | molhado |
| blind | venda |

**`buffsOf`:** segue a ordem atk, def, agi, e dentro de cada uma Up antes de Dn. As cores são as de `ANIM_PROFILES.ATTRS`: atk usa FOR `#ff493d`, def usa CON `#e39b46` e agi usa AGI `#45e6b3`.

**`shieldCracks`:** `r = cur/max`; `r > .66` dá 0 rachaduras, `r > .33` dá 1, e o resto dá 2.

- [ ] **Step 4: `PVIDA.unit`**

Teste do Review Focus 1 (smoke da Tarefa 13): duas chamadas seguidas com o mesmo `c` mantêm o mesmo nó `.aura`. Tudo o que segue é feito por diferença:
- poses viram classes `pose-ferido`/`pose-limite`/`pose-ko` no `.bb`. O herói em `pose-ko` deita: `.bbi{transform: rotateX(-78deg)}`, girando pela base. O inimigo KO é tratado na Tarefa 11;
- a aura é um `<i class="aura" data-a="gelo bolhas">` dentro de `.bbi`, com filhos `<b class="a-<nome>">`. As partículas são em CSS (bolhas sobem, brasas tremulam, estrelas giram sobre a cabeça). `gelo` tinge o recorte (`filter: hue-rotate + saturate`), e `tremor` aplica um tremor pequeno contínuo;
- a bolha de escudo é um `<i class="bolha" data-k="0|1|2">`, hexágono translúcido com rachaduras por `data-k`. O máximo fica em `u.shMax = max(u.shMax, c.shield)` e zera quando `c.shield` volta a 0. Na passagem de ligada para desligada, a classe `estoura` fica 500 ms antes de o nó sair;
- as setas de `buffDiff(u.stPrev, c.st)` viram `<b class="seta up|dn">` com o texto `ATQ↑` (os nomes saem de `RULES.ST`) na cor `col`, que sobem ou descem e somem em 900 ms. Um ícone pequeno fica no pé enquanto o buff durar (`buffsOf`);
- quando `c.form` passa de vazio para preenchido, a classe `formfx` fica 700 ms: flash branco (só com `ANIMFX.settings.flashes`), aumento rápido e aura contínua `a-forma` na cor do elemento da forma. Não há troca de imagem, porque o sistema não tem arte de forma; fica como pendência no doc.

No `anim-engine.js` `drawPersistent`, apague a linha `if (p.shield) ringAt(...)`.

- [ ] **Step 5: Adicionar `<script src="/js/palco-vida.js"></script>` nas três páginas, logo depois de `palco3d.js`. `npm test`. Commit** `Palco polimento: poses, auras, escudo, setas e forma`

---

### Tarefa 9: Corte de turno e entrada individual

**Files:**
- Modify: `public/js/coreo.js` (`fx()` banner → corte; `threat` com retrato; `intro` → `PVIDA.enter`), `public/js/palco-vida.js` (`enter`), `public/style.css`

**Interfaces:**
- Produces: `PVIDA.enter(heroIds: string[], foeIds: string[])`
- Consumes: `PALCO3D.imgSrc(c, 'p')`, `PALCO3D.imgFit(c, 'p', src)`

- [ ] **Step 1: Corte de turno**

No 3D, o `fxAdd('banner …')` do herói vira `fxAdd('turncut …', …, 900)`: uma faixa diagonal (`clip-path`) entra da esquerda em 120 ms, segura e sai pela direita aos 400 ms do total. Ela leva o retrato (`imgSrc(c,'p')` com `imgFit`) e o nome. O texto continua "Seu turno" ou "Turno de NOME", na cor `--c`. O `threat` do inimigo ganha o mesmo retrato dentro da faixa vermelha existente. O 2D mantém o banner.

- [ ] **Step 2: Entrada individual**

`PVIDA.enter`: cada herói recebe a classe `in-h` com `--i` igual ao seu índice (atraso de 120 ms·i). A animação no `.bbi` vem de `translateX(-120%)`, dá um salto curto (−8%) e assenta com um leve agachamento. Cada inimigo recebe `in-f`: sobe do chão (`translateY(30%)`, `opacity 0`), com uma nuvem de tinta no pé (`<i class="puff">` que some em 700 ms). O `intro()` chama `PVIDA.enter` no 3D, antes da faixa "Batalha!". Com movimento reduzido, nada disso roda.

- [ ] **Step 3: Verificação manual pelo smoke da Tarefa 13. `npm test`. Commit** `Palco polimento: corte de turno e entrada individual`

---

### Tarefa 10: Reações (parry, esquiva, contra virado, QTE no recorte)

**Files:**
- Modify: `public/js/palco-fx.js` (`segments`), `public/js/coreo.js` (`impact` em sequência; `strikeFx` devolve uma Promise), `public/js/anim-engine.js` (`ANIMFX.sparks`), `public/js/palco-vida.js` (`ghosts`, `qteRing`), `public/js/comandos.js` (`openQte3d` chama `qteRing`), `public/style.css`
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `PFX.segments(acts) -> act[][]`
  - `strikeFx(acts, f0, a) -> Promise` (resolve quando o último número nasce, ou em `run.done`)
  - `ANIMFX.sparks(x, y, color, n = 14)`
  - `PVIDA.ghosts(id, dir)`
  - `PVIDA.qteRing(id, closeAt: ms em performance.now) -> { grade(g: 'perf'|'otimo'|'bom'|'erro'), close() }`

- [ ] **Step 1: Teste**

```js
test('PFX: segmentos por quem age (o contra vira cena própria)', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  const s = F.segments([{ fx: { a: 'e', id: 'h' } }, { fx: { a: 'e', id: 'h' } }, { fx: { id: 'h' } }, { fx: { a: 'h', id: 'e', ctr: 1 } }]);
  assert.deepEqual(s.map(x => x.length), [3, 1]); assert.equal(s[1][0].fx.ctr, 1);
});
```

- [ ] **Step 2: Ver falhar. Implementar `segments`** (atos sem `fx.a` entram no segmento anterior). **Ver passar.**

- [ ] **Step 3: Sequência no `impact`**

`impact(acts)` percorre `PFX.segments(acts)` com `await`, e cada segmento passa por `strikeFx`. Num segmento com `fx.ctr` no 3D, antes do golpe vem `await PALCO3D.focus(seg[0].fx.a, [seg[0].fx.id], 260)`; essa virada rápida para o ombro de quem defende é o contra-ataque virado. Depois vem a investida normal.

- [ ] **Step 4: Parry e esquiva**

Em `hits()`, `f.par` no 3D gera:
- `ANIMFX.sparks` no ponto médio entre os retângulos de quem age e do alvo, na cor `#ffd36a`;
- `CENA.slow(.4, 350)`;
- `PALCO3D.recoil(f0.a, f.id, .3, false)` em quem atacou, com a classe `stagger` por 600 ms.

`f.esq` gera `PVIDA.ghosts(f.id, dir)`: 3 cópias da `<img>` em `.ghost` dentro do `.bbi`, com `opacity` .45/.3/.15, que ficam para trás enquanto o `.bbi` desliza 18% para o lado `dir` e somem em 500 ms.

`sparks` é um efeito do motor: 14 traços curtos e brilhantes que se abrem do centro em 260 ms, desenhados com o `ribbon` existente.

- [ ] **Step 5: QTE no recorte**

`qteRing(id, closeAt)` cria um `.qring` dentro do `.bb` do herói, deitado no chão como o `.ring` (`rotateX(90deg)`). Um anel externo encolhe de `scale(2.2)` até `scale(1)` em `closeAt − now`, com WAAPI, e um anel-alvo fica fixo em 1. `grade(g)` pinta o anel (`perf` dourado, `otimo` azul, `bom` branco, `erro` vermelho), dá um pulso e chama `close()` depois de 400 ms. Em `comandos.js`, a cada anel aberto por `openQte3d` (onde o tempo de fechamento é `impact(C, i)`), chame `PVIDA.qteRing(h.id, impact(C, i))` e repasse a nota que o `word()` já recebe. A interface plana `.qte3d` continua (botões e texto) e fica menor: `--rs` vezes .8.

- [ ] **Step 6: `npm test`. Commit** `Palco polimento: parry, esquiva, contra virado e QTE no recorte`

---

### Tarefa 11: Fim de batalha (KO em pinceladas, vitória, derrota e fuga)

**Files:**
- Modify: `src/handlers.js:232-273` (`end` no log de encerramento), `public/js/palco3d.js` (`P.linger`; teardown adiado; `CENA.reset`), `public/js/palco-vida.js` (`inkOut`, `pose`), `public/js/anim-engine.js` (`ANIMFX.ink`), `public/js/coreo.js` (`knockout`, `fx()` final), `public/style.css`
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - log `'Batalha encerrada.'` com `{ end: 'win' | 'lose' | 'flee' }`
  - `PALCO3D.linger(ms)`
  - `PVIDA.inkOut(id, color)`
  - `PVIDA.pose(ids, cls: 'vit'|'cai'|'foge', stagger)`
  - `ANIMFX.ink(rect, color, ms = 900)`

- [ ] **Step 1: Teste do servidor**

```js
test('fim de batalha marca vitória, derrota ou fuga no log', () => {
  const end = () => S.log.filter(e => /Batalha encerrada/.test(e.text)).at(-1)?.end;
  reset(); let h = mk(ana, {}), e = mk(gm, { enemy: true }); H.battle(gm, { on: true }); e.hp = 0; H.battle(gm, { on: false, win: true }); assert.equal(end(), 'win');
  reset(); h = mk(ana, {}); e = mk(gm, { enemy: true }); H.battle(gm, { on: true }); h.hp = 0; H.battle(gm, { on: false }); assert.equal(end(), 'lose');
  reset(); h = mk(ana, {}); e = mk(gm, { enemy: true }); H.battle(gm, { on: true }); H.battle(gm, { on: false }); assert.equal(end(), 'flee');
});
```

(Mesmo padrão dos testes de batalha das linhas 80-87: `mk(ana, {})` cria o herói e `H.battle(gm, { on: true })` põe os dois em `ticks`.)

- [ ] **Step 2: Ver falhar. Implementar**

Calcule `end` antes de `S.battle` ser refeito: `m.win ? 'win' : pcs.length && pcs.every(p => p.hp <= 0) ? 'lose' : 'flee'`. Ele só entra no log quando `!m.on` e a batalha estava ativa. **Ver passar.**

- [ ] **Step 3: Teardown adiado**

`P.sync(null)` deixa de remover na hora: agenda `teardown` em `max(120, lingerUntil − now)`, e o `teardown` confere `lingerUntil` de novo antes de remover. Enquanto o palco estiver adiado, `units()` não roda, porque `ticks` está vazio. O `teardown` chama `CENA.reset()` (Review Focus 2). `P.linger(ms)` define `lingerUntil = now + ms`. Uma batalha nova antes do fim do adiamento cancela o teardown.

- [ ] **Step 4: KO em pinceladas**

No 3D, o `knockout(id)` do inimigo chama `PVIDA.inkOut(id, ELC[el do golpe que matou])` no lugar do `kofx`. Guarde o `el` do último dano por alvo dentro de `hits()`. O `inkOut` chama `ANIMFX.ink(rect, color)`, que desenha de 10 a 14 pinceladas que saem do recorte e se espalham em 900 ms (`ribbon` com `jag`). O recorte recebe a classe `inked`, com `opacity → 0` em 600 ms e `pointer-events: none`. O herói em KO usa a pose deitada da Tarefa 8, sem tinta.

- [ ] **Step 5: Vitória, derrota e fuga** (em `fx()`, a partir do log `end`)

| `end` | Adiamento | O que acontece |
|---|---|---|
| `win` | `PALCO3D.linger(2600)` | `PVIDA.pose(heróis vivos, 'vit', 150)` (pulo e brilho na cor `--c`) e `PALCO3D.orbitGroup(heróis, 60, 1800)`. `results()` passa a entrar aos 2000 ms (antes eram 400). |
| `lose` | `linger(3000)` | Classe `.p3d.derrota` (grayscale com transição de 1 s), `PVIDA.pose(heróis, 'cai', 250)` (deitam um a um) e `fxAdd('endband lose', '<b>Derrota</b>', 2800)`. |
| `flee` | `linger(2200)` | `PVIDA.pose(heróis, 'foge', 120)`: os recortes correm para `+z 900` com o rastro de poeira `.puff`. Mais `fxAdd('endband flee', '<b>Retirada</b>', 2000)`. |

- [ ] **Step 6: `npm test`. Commit** `Palco polimento: KO em pinceladas, vitória, derrota e fuga`

---

### Tarefa 12: Replay local do golpe

**Files:**
- Modify: `public/js/palco-fx.js` (`actsAround`), `public/js/coreo.js` (`replayAct`; `impact(acts, { replay })`), `public/js/paginas.js:240` (botão no log), `public/js/eventos.js` (ação `replay`, junto de `logClear` na linha 159), `public/style.css`
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `PFX.actsAround(log, n) -> entry[]`
  - `replayAct(n)` (global no `coreo.js`)
  - `impact(acts, { replay: true })`: não mexe em `koHold`, `knockout`, barras, `hpPrev` nem no corte de turno

- [ ] **Step 1: Teste** (log misto: Review Focus 5)

```js
test('PFX: actsAround junta o golpe inteiro e para no resto do log', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  const L = [{ n: 1, text: 'oi' }, { n: 2, fx: { a: 'h', s: 'X', id: 'e' } }, { n: 3, fx: { a: 'h', s: 'X', id: 'f' } }, { n: 4, fx: { a: 'e', s: 'Y', id: 'h' } }, { n: 5, fx: { a: 'h', s: 'X', id: 'e' } }];
  assert.deepEqual(F.actsAround(L, 3).map(e => e.n), [2, 3]); assert.deepEqual(F.actsAround(L, 5).map(e => e.n), [5]); assert.deepEqual(F.actsAround(L, 1), []);
});
```

- [ ] **Step 2: Ver falhar. Implementar** (a partir da entrada `n`, expande para os vizinhos contíguos, com `n` a ±1, que têm `fx` com o mesmo `a` e `s`). **Ver passar.**

- [ ] **Step 3: Botão e ação**

No `logHtml`, toda entrada com `l.fx?.a` ganha `<button class="rpl" data-a="replay" data-n="${l.n}" title="Rever o golpe (só nesta tela)" aria-label="Rever o golpe">▶</button>` enquanto `S.battle.active`.

O `replayAct(n)` recusa com `toast('Só dá para rever durante a batalha.')` fora da batalha ou sem `.p3d` visível. Com uma cena em andamento (`busyUntil > now`; o `strikeFx` atualiza `busyUntil` ao começar e ao terminar), recusa com `toast('Espere o golpe atual terminar.')`. Nos outros casos, chama `impact(PFX.actsAround(S.log, n).map(e => ({ ...e })), { replay: true })`. Os números do replay ganham a classe `replay`, com a etiqueta "Replay" no topo do `fxl` durante a cena.

- [ ] **Step 4: `npm test`. Commit** `Palco polimento: replay do golpe`

---

### Tarefa 13: Smoke da interface e documentação

**Files:**
- Modify: `tools/ui-smoke.js` (bloco do palco 3D), `PROXIMOS-PASSOS.md` (nova seção)

- [ ] **Step 1: Checagens no smoke**

Junte-as ao bloco existente que ataca no palco 3D (perto da linha 117) e use `until` em tudo o que é assíncrono. O Chromium sem GPU desenha poucos quadros por segundo, por isso as checagens medem pedidos e classes, não posição visual.
- depois de um golpe de herói: existe `.p3d .shk` e aparece um `.fxl .float` com `getAnimations().length > 0`;
- até 3 s depois do golpe, `CENA.factor() === 1` (o relógio não ficou preso);
- um herói com `st.poison` (definido pelo mestre via `handle`) tem `.p3d .bb[data-tgt=id] .aura[data-a~="bolhas"]`, e o nó continua o mesmo depois de outro `render()` (Review Focus 1);
- `replayAct` fora da batalha mostra o toast e não cria `.float`;
- no fim de batalha com `win`, o `.p3d` continua visível por pelo menos 1 s, e depois some.

- [ ] **Step 2: Rodar `npm run ui` e confirmar `0 falhas`** (se o Playwright não estiver instalado, o script avisa e sai com 0: diga isso no relatório).

- [ ] **Step 3: Documentação**

Seção `### Polimento do palco` em `PROXIMOS-PASSOS.md`, no formato das vizinhas. Ela aponta para este plano e diz o que existe (uma linha por tema) e as decisões do dono (a lista do que ficou de fora). Em "Falta ver com gente de verdade" entram:
- o conforto do hitstop e do slow em lutas longas;
- a contagem de partículas em PCs fracos;
- a legibilidade das auras empilhadas;
- a arte de forma, que não existe (a transformação só faz o flash e a aura).

- [ ] **Step 4: Commit** `Palco polimento: smoke e documentação`

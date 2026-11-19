# Combate luminoso — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o motor pintado de combate (`anim-engine.js`) por um motor WebGL2 luminoso (estilo Genshin/Star Rail) que desenha efeitos, recortes em malha e pós de tela, mantendo a API `ANIMFX` para `coreo.js` e `palco-vida.js`.

**Architecture:** As regras puras (orçamentos, curvas da malha, materiais, escolha de assinatura) ficam em `public/js/luz-perfis.js` (`globalThis.LUZP`, sem DOM, testado no Node). O navegador ganha `luz.js` (contexto, atlas, partículas, fachada `ANIMFX`), `luz-corpo.js` (malha dos recortes), `luz-pos.js` (bloom, choque, flash, aberração, linhas), `luz-fx.js` (famílias × materiais) e `luz-cenas.js` (assinaturas). O motor antigo continua carregado e responde quando a chave está em "Clássico", a qualidade é Baixa ou não há WebGL2.

**Tech Stack:** JavaScript puro em scripts clássicos (sem bundler), WebGL2 sem biblioteca, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-19-combate-luminoso-design.md`

## Global Constraints

- Um único contexto WebGL2. Nenhum `filter` CSS e nenhum plano grande novo nas camadas 3D do palco (memória palco-camera-perf).
- Ação comum ~2,5 s. Limite e Domínio duram 4–6 s no total. A velocidade vem só de `ANIMFX.settings.speed` (0,5–2×).
- Meta: 60 fps no PC médio e 30 no fraco. A Auto desce para Média e depois para o fallback 2D. Em repouso, o canvas não desenha.
- Partículas por nível: Alta 6000, Média 2500, Baixa = fallback 2D.
- Bloom: 1/2 da resolução na Alta, 1/4 na Média, desligado na Baixa.
- Todo efeito respeita `prefers-reduced-motion` (sem pós, sem tremida, duração curta) e `ANIMFX.settings.flashes` (sem flash invertido).
- Chave: `localStorage.vj_fx_style` = `'luz'` (padrão) ou `'classico'`, com rótulo na caixa de som "Efeitos: Luminoso / Clássico".
- Relógio: `CENA.now()` e `CENA.wait()`, porque hitstop e câmera lenta valem para o motor novo.
- Commits: um por tarefa no `main`, adicionando só os arquivos da tarefa (`git add <arquivos>`; sem stash, sem `git add -A`, porque outra sessão edita o mesmo checkout).
- Mensagens de commit em português, como no histórico, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Cada novo `<script>` entra em `public/player.html`, `public/table.html` e `public/gm.html`, logo depois de `/js/anim-engine.js` e antes de `/js/coreo.js`, nesta ordem: `luz-perfis.js`, `luz.js`, `luz-pos.js`, `luz-corpo.js`, `luz-fx.js`, `luz-cenas.js`.

## Review Focus

1. **Perda do contexto WebGL** (driver reinicia, aba em segundo plano no PC fraco): o combate continua no fallback 2D sem erro no console e volta ao WebGL quando o contexto é restaurado. Teste: `LUZP.engineFor` na Task 1.
2. **Recorte sem imagem ou com imagem de outra origem** (silhueta, URL externa sem CORS): a malha não pode sumir com o personagem. Esse recorte continua visível no DOM. Teste: `LUZP.meshable` na Task 2.
3. **Muitos alvos e multi-hit** (área com 8 alvos × 5 hits): o pool não estoura e corta partículas por emissor, sem cortar o impacto. Teste: `LUZP.share` na Task 3.
4. **Troca de qualidade ou de chave no meio de um golpe:** o efeito em curso termina ou some sem travar as promessas `impact`/`done` de que a `coreo.js` depende. Teste: `LUZP.promiseTimes` na Task 1.
5. **Chefe sem preset ou com preset inválido** (fichas antigas, bestiário salvo): usa a cena do elemento e o servidor saneia o campo. Teste: o caso `bossFx` inválido na Task 8.

---

### Task 1: Motor `luz` — contexto, atlas, partículas, fachada e chave

**Files:**
- Create: `public/js/luz-perfis.js`, `public/js/luz.js`
- Modify: `public/player.html`, `public/table.html`, `public/gm.html` (scripts); `public/js/extras.js` (`drawSnd` e o listener `change` da `sndBox`); `public/style.css` (`.luz-canvas`, com a mesma camada e o mesmo `pointer-events:none` de `.animfx-canvas`)
- Test: `tools/test.js`

**Interfaces:**
- Produces (`globalThis.LUZP`, puro):
  - `budget(level: 'high'|'medium'|'low') -> { particles: number, bloom: 0|0.25|0.5, post: boolean }`, com os valores das Global Constraints.
  - `engineFor({ style: 'luz'|'classico', webgl2: boolean, level, lost: boolean }) -> 'luz'|'classico'`. Devolve `'classico'` se `style === 'classico'`, se não houver WebGL2, se `level === 'low'` ou se o contexto estiver perdido.
  - `duration(profile, { speed, reduced, sig: 'none'|'line'|'ult' }) -> number` (ms). Base 2500 ms; `'line'` 3000; `'ult'` 5000 (o Limite/Domínio inteiro); dividido por `speed`; `reduced` → 400.
  - `promiseTimes(profile, durMs) -> { impact: number, done: number }`, com `impact = round(durMs * profile.impact)` e `done = durMs`.
- Produces (`globalThis.LUZ`, navegador): `LUZ.gl`, `LUZ.atlas` (mapa nome → retângulo UV: `glow`, `spark`, `smoke`, `star4`, `star8`, `ring`, e `glyph-<el>` para os 12 elementos de `ANIM_PROFILES.PALETTES`), `LUZ.emit(spec)` (partícula instanciada `{ x, y, vx, vy, life, size, color, tex, add: boolean, grav, drag }`), `LUZ.onFrame(fn(now, dt))`, `LUZ.active()`.
- Produces: `ANIMFX` continua com a mesma assinatura. `luz.js` guarda o antigo em `globalThis.ANIMFX_CLASSICO` e instala uma fachada que encaminha cada chamada ao motor escolhido por `engineFor`. Acrescenta `ANIMFX.setStyle(v)` e `ANIMFX.settings.style`.

- [ ] **Step 1: Escrever o teste que falha**

```js
test('LUZP: orçamento, motor, duração e promessas', async () => {
  await import('../public/js/anim-profiles.js'); await import('../public/js/luz-perfis.js'); const L = globalThis.LUZP;
  assert.deepEqual(L.budget('high'), { particles: 6000, bloom: .5, post: true });
  assert.deepEqual(L.budget('medium'), { particles: 2500, bloom: .25, post: true });
  assert.deepEqual(L.budget('low'), { particles: 0, bloom: 0, post: false });
  assert.equal(L.engineFor({ style: 'luz', webgl2: true, level: 'high', lost: false }), 'luz');
  for (const o of [{ style: 'classico' }, { webgl2: false }, { level: 'low' }, { lost: true }]) assert.equal(L.engineFor({ style: 'luz', webgl2: true, level: 'medium', lost: false, ...o }), 'classico');
  const P = globalThis.ANIM_PROFILES.profile({ name: 'Bola de Fogo', el: 'kagutsuchi', kind: 'dmg' });
  assert.equal(L.duration(P, { speed: 1, sig: 'none' }), 2500); assert.equal(L.duration(P, { speed: 2, sig: 'none' }), 1250);
  assert.equal(L.duration(P, { speed: 1, sig: 'line' }), 3000); assert.equal(L.duration(P, { speed: 1, sig: 'ult' }), 5000);
  assert.equal(L.duration(P, { speed: 1, reduced: true, sig: 'ult' }), 400);
  assert.deepEqual(L.promiseTimes(P, 2500), { impact: Math.round(2500 * P.impact), done: 2500 });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="LUZP: orçamento" tools/test.js`
Expected: FAIL (`LUZP` undefined / módulo inexistente)

- [ ] **Step 3: Implementar `luz-perfis.js`**

IIFE `(g => { ... g.LUZP = {...} })(globalThis)` no mesmo formato de `palco-fx.js`, sem DOM.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test --test-name-pattern="LUZP" tools/test.js`
Expected: PASS

- [ ] **Step 5: Implementar `luz.js`**

- Canvas WebGL2 `{ alpha: true, premultipliedAlpha: true, antialias: false }` fora do `#app`, com resolução de CSS × `min(devicePixelRatio, 1.5)`.
- O atlas é desenhado uma vez num canvas 2D 1024² e enviado como textura. Os glifos são desenhados com path a partir das formas-assinatura de cada elemento (ver o `MOTIF` de `anim-engine.js`, simplificado como contorno luminoso).
- As partículas ficam num buffer instanciado de tamanho `budget(level).particles`, com dois programas: alpha normal e aditivo (`gl.blendFunc(ONE, ONE)`).
- O loop roda só enquanto houver partículas ou `onFrame` ativo. Senão, para o `requestAnimationFrame`.
- Em `webglcontextlost`: `preventDefault`, marca `lost` e a fachada passa ao clássico. Em `webglcontextrestored`: recria os recursos.
- A Auto mede o fps como `anim-engine.js` (abaixo de 43 desce de nível, acima de 56 sobe) e a fachada respeita `ANIMFX.level()`.
- `ANIMFX.play` no motor novo devolve `{ profile, impact, done }` com tempos de `promiseTimes`/`duration`, usando `CENA.wait`. Nesta tarefa o desenho do golpe é só um placeholder: um brilho no alvo. As famílias vêm na Task 3.

- [ ] **Step 6: Ligar a chave na caixa de som**

Em `drawSnd`, um `<select data-s="style">` com `luz` "Efeitos: Luminoso" e `classico` "Efeitos: Clássico". O listener `change` chama `ANIMFX.setStyle(e.target.value)`.

- [ ] **Step 7: Verificar no navegador**

Suba o servidor pelo preview, abra o jogador numa batalha e use uma skill.
- Esperado: nenhum erro no console e um brilho no alvo.
- Trocar para Clássico volta ao motor pintado sem recarregar.
- Em `javascript_tool`, `ANIMFX.settings.style` deve refletir a escolha.

- [ ] **Step 8: Commit**

```bash
git add public/js/luz-perfis.js public/js/luz.js public/player.html public/table.html public/gm.html public/js/extras.js public/style.css tools/test.js
git commit -m "Luz: motor WebGL2 com atlas, partículas, fachada ANIMFX e chave Luminoso/Clássico"
```

---

### Task 2: Corpo dos recortes em malha

**Files:**
- Create: `public/js/luz-corpo.js`
- Modify: `public/js/luz-perfis.js` (curvas), `public/js/palco-vida.js` (`action`, `ghosts`, `pose` delegam à malha quando ativa), `public/js/palco3d.js` (`P.recoil`, `P.shake`, `P.light` delegam quando ativa), `public/mesa.css` (`.p3d.luz .bb.malha img { opacity:0 }`), três HTMLs
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `LUZ.gl`, `LUZ.onFrame`, `PALCO3D.unitOf(id) -> { el, img, inner }`, `PFX.recoilVec`.
- Produces (`LUZP`, puro):
  - `meshable({ src: string, sameOrigin: boolean, loaded: boolean }) -> boolean`. Falso sem `src`, para imagem de outra origem sem CORS ou imagem não carregada.
  - `bodyCurve(kind: string, t: number, opts?: { tier, seed, dir }) -> { bend, squash, twist, dx, dy, shake }`. `kind` é uma das 15 famílias ou uma das reações `hit|dodge|parry|hurt|limit|ko|vit|cai|foge`. Em t=0 e t=1 tudo é 0 (volta ao repouso), exceto em `ko` e `cai`, que terminam deitados (`bend` = ±1,4 rad).
  - `idleSway(t: number, wind: number, row: number /*0 pé … 1 topo*/) -> number` (deslocamento em px). Fica em 0 para `row` ≤ 2/3 e só ondula o terço de cima, com amplitude ≤ 3 px × `wind`.
- Produces (`LUZ.corpo`, navegador): `LUZ.corpo.play(id, kind, opts)`, `LUZ.corpo.tint(id, color, k, ms)`, `LUZ.corpo.ghosts(id, dir)`, `LUZ.corpo.has(id) -> boolean`.

- [ ] **Step 1: Escrever o teste que falha**

```js
test('LUZP: malha só com imagem utilizável; curvas voltam ao repouso; idle só no topo', async () => {
  await import('../public/js/luz-perfis.js'); const L = globalThis.LUZP;
  assert.equal(L.meshable({ src: '/img/a.png', sameOrigin: true, loaded: true }), true);
  for (const o of [{ src: '' }, { sameOrigin: false }, { loaded: false }]) assert.equal(L.meshable({ src: '/img/a.png', sameOrigin: true, loaded: true, ...o }), false);
  for (const k of ['projectile', 'beam', 'slash', 'smash', 'pierce', 'dash', 'area', 'rain', 'ritual', 'summon', 'psychic', 'musical', 'heal', 'barrier', 'form', 'hit', 'dodge', 'parry', 'hurt', 'limit', 'vit', 'foge'])
    for (const t of [0, 1]) assert.deepEqual(L.bodyCurve(k, t), { bend: 0, squash: 0, twist: 0, dx: 0, dy: 0, shake: 0 }, k + '@' + t);
  assert.ok(Math.abs(L.bodyCurve('ko', 1).bend) >= 1.3);
  assert.ok(L.bodyCurve('smash', .3).squash !== 0, 'smash tem antecipação');
  assert.equal(L.idleSway(1.2, 1, .5), 0); assert.ok(Math.abs(L.idleSway(1.2, 1, 1)) <= 3); assert.equal(L.idleSway(1.2, 0, 1), 0);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="LUZP: malha" tools/test.js`
Expected: FAIL (`meshable` não é função)

- [ ] **Step 3: Implementar `meshable`, `bodyCurve` e `idleSway` em `luz-perfis.js`**

`bodyCurve`: cada família tem três tempos (antecipação 0–.3, golpe .3–.55, recuperação .55–1) com easing. A curva é multiplicada por `.8 + .2 * tier` e o sinal vem de `seed % 2`, como `--act-seed` no CSS atual.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test --test-name-pattern="LUZP" tools/test.js`
Expected: PASS

- [ ] **Step 5: Implementar `luz-corpo.js`**

- Uma malha de 8×12 vértices por recorte cujo `meshable` seja verdadeiro, com textura da `img.currentSrc` (cache por URL).
- O quad é posicionado a cada quadro pelo `getBoundingClientRect()` da `img` (já inclui enquadre e escala).
- O vertex shader aplica `bend` em torno do pé, `squash` (estica y e comprime x, mantendo a área), `twist`, `dx/dy`, `shake` e `idleSway` por linha. O vento vem do clima do cenário (`chuva`/`neve`/`cinzas`/`brasas`/`neblina` → 0,6; sem clima → 0,3).
- O fragment shader faz o rim light com `tint(color, k)`, que substitui a classe `lit`.
- A ordem de desenho é por `PALCO3D.posOf(id).z` (do fundo para a frente). Os efeitos marcados `behind` são desenhados antes dos recortes.
- Os recortes desenhados recebem a classe `malha` (a `img` some) e os outros ficam como estão.
- Quando o motor muda para o clássico, a classe `malha` é tirada de todos.

- [ ] **Step 6: Delegar**

- `PVIDA.action` chama `LUZ.corpo.play(id, family, { tier, seed })`.
- `PVIDA.ghosts` chama `LUZ.corpo.ghosts`.
- `PVIDA.pose` chama `play(id, 'vit'|'cai'|'foge')`.
- `PALCO3D.recoil` chama `play(id, 'hit', { dir })`, mantendo o deslocamento no mundo atual.
- `PALCO3D.light` chama `tint`.

Cada um só delega quando `LUZ.corpo?.has(id)`. Senão, o caminho atual.

- [ ] **Step 7: Verificar no navegador**

Numa batalha com heróis e inimigos com PNG:
- o topo ondula em repouso;
- o corpo antecipa e golpeia em cada família;
- o recuo dobra o tronco;
- a esquiva deixa fantasmas;
- um recorte sem imagem continua aparecendo.

Tire um screenshot como prova.

- [ ] **Step 8: Commit**

```bash
git add public/js/luz-corpo.js public/js/luz-perfis.js public/js/palco-vida.js public/js/palco3d.js public/mesa.css public/player.html public/table.html public/gm.html tools/test.js
git commit -m "Luz: recortes em malha deformável com curvas por família, reações, rim light e ondulação do topo"
```

---

### Task 3: As 15 famílias × 12 materiais de luz

**Files:**
- Create: `public/js/luz-fx.js`
- Modify: `public/js/luz-perfis.js`, `public/js/luz.js` (`play` usa `LUZFX`), três HTMLs
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `LUZ.emit`, `LUZ.atlas`, `LUZ.onFrame`, `ANIM_PROFILES.profile`, `LUZP.duration`.
- Produces (`LUZP`, puro):
  - `material(el: string) -> { glyph: string, core: string, rim: string, motion: 'rise'|'bubble'|'arc'|'spiral'|'burst'|'drift'|'drip'|'shard'|'acid'|'hex'|'smoke'|'streak', residue: 'embers'|'frost'|'puddle'|'none'|... }` para os 12 elementos (kagutsuchi→rise/embers, susanoo→bubble/puddle, indra→arc, fuhaku→spiral, amaterasu→burst, tsukuyomi→drift, shukketsu→drip, atlas→shard, hiruko→acid, aura→hex, oculto→smoke, fis→streak). Elemento desconhecido → o de `fis`.
  - `phases(family, durMs) -> { charge: [a, b], fire: [a, b], travel: [a, b], impact: [a, b] }` em ms, contíguas, terminando em `durMs`. O início de `impact` é igual a `promiseTimes(...).impact`.
  - `share(budget: number, emitters: number, hitsPerEmitter: number) -> { perHit: number, impactFloor: number }`, com `impactFloor` = `min(60, floor(budget / max(1, emitters)))` (todo impacto ganha ao menos isso) e `perHit * emitters * hitsPerEmitter ≤ budget`.
- Produces (`globalThis.LUZFX`): `LUZFX.run(e /* { profile, from, to, footA, footB, sa, sb, start, dur, aid, tid } */)`, que registra um efeito desenhado a cada quadro, relendo as posições como `anim-engine.js` faz hoje.

- [ ] **Step 1: Escrever o teste que falha**

```js
test('LUZP: materiais, fases e partilha do orçamento', async () => {
  await import('../public/js/anim-profiles.js'); await import('../public/js/luz-perfis.js'); const L = globalThis.LUZP, AP = globalThis.ANIM_PROFILES;
  for (const el of Object.keys(AP.PALETTES)) { const m = L.material(el); assert.ok(m.glyph && m.motion && m.residue, el); }
  assert.equal(L.material('kagutsuchi').motion, 'rise'); assert.equal(L.material('indra').motion, 'arc'); assert.deepEqual(L.material('???'), L.material('fis'));
  for (const fam of AP.FAMILIES) { const ph = L.phases(fam, 2500); assert.equal(ph.impact[0], Math.round(2500 * AP.IMPACT[fam]), fam);
    assert.equal(ph.charge[0], 0); assert.equal(ph.charge[1], ph.fire[0]); assert.equal(ph.fire[1], ph.travel[0]); assert.equal(ph.travel[1], ph.impact[0]); assert.equal(ph.impact[1], 2500, fam); }
  const s = L.share(2500, 8, 5); assert.ok(s.perHit * 8 * 5 <= 2500); assert.equal(s.impactFloor, 60);
  assert.equal(L.share(2500, 100, 1).impactFloor, 25);
});
```

Nota: `phases` não depende do `profile`, e `impact[0]` precisa bater com `promiseTimes`. Por isso `phases(family, dur)` usa a mesma fração `impact` de `ANIM_PROFILES.profile` (rain .62, ritual/summon .7, resto .58), lida de uma tabela compartilhada que `anim-profiles.js` passa a exportar como `ANIM_PROFILES.IMPACT`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="LUZP: materiais" tools/test.js`
Expected: FAIL

- [ ] **Step 3: Implementar `material`, `phases` e `share`; exportar `IMPACT` em `anim-profiles.js` e fazer `profile()` usá-lo**

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS (os testes antigos de `ANIM_PROFILES` continuam verdes)

- [ ] **Step 5: Implementar `luz-fx.js`**

Uma função de desenho por família, com as quatro fases e o material do elemento:
- **Carga:** círculo mágico deitado nos pés de quem age (anel + glifo girando), e a luz converge na origem do perfil.
- **Disparo:** clarão na boca.
- **Trajeto:** projétil ou feixe com núcleo aditivo branco, corpo na cor `core`, rastro em partículas do `motion`.
- **Impacto:** flash, anel, estilhaços de luz e decalque luminoso no chão que some em ~600 ms, deixando o `residue` por ~1,2 s.

As famílias de apoio (`heal`/`barrier`/`form`) usam o alvo ou o próprio personagem, como hoje. Os efeitos de chão (círculo, decalque, resíduo) são marcados `behind`.

- [ ] **Step 6: Verificar no navegador**

Numa batalha de teste, use uma skill de cada família e pelo menos 4 elementos.
- Os 12 materiais são distinguíveis mesmo com cor parecida.
- Os números caem no início do impacto.
- O fps aparece em `javascript_tool` (`ANIMFX.level()` continua `medium`/`high` num PC médio).

Tire screenshots de carga, trajeto e impacto.

- [ ] **Step 7: Commit**

```bash
git add public/js/luz-fx.js public/js/luz-perfis.js public/js/luz.js public/js/anim-profiles.js public/player.html public/table.html public/gm.html tools/test.js
git commit -m "Luz: 15 famílias em quatro fases com material, glifo e resíduo por elemento"
```

---

### Task 4: Pós de tela — bloom, onda de choque, flash invertido, aberração e linhas de velocidade

**Files:**
- Create: `public/js/luz-pos.js`
- Modify: `public/js/luz.js` (renderiza em framebuffer e compõe), `public/js/luz-fx.js` (dispara os pulsos), `public/js/coreo.js` (crítico e investida pedem aberração e linhas), três HTMLs
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `LUZP.budget(level).bloom/post`, `ANIMFX.settings.flashes`.
- Produces (`LUZP`, puro): `pulse(kind: 'bloom'|'shock'|'invert'|'chroma'|'speed', t: number /*ms desde o início*/, strength: number) -> number`, a intensidade de 0 a 1. Durações: bloom 220, shock 450, invert 2 quadros (34 ms), chroma 260, speed 400. Fora da janela → 0.
- Produces (`LUZ.pos`): `LUZ.pos.fire(kind, { x, y, strength, dir })`. Ignora os pedidos quando `budget(level).post` é falso ou o movimento é reduzido, e ignora `invert` quando `flashes` está desligado.
- Em `coreo.js`, `strikeFx` chama `LUZ.pos?.fire('chroma', …)` no crítico, `fire('speed', { dir })` quando há `PALCO3D.lunge`, e `fire('invert')` no Black Flash e nos golpes finais de KO.

- [ ] **Step 1: Escrever o teste que falha**

```js
test('LUZP: pulsos de pós nascem e somem na janela', async () => {
  await import('../public/js/luz-perfis.js'); const L = globalThis.LUZP;
  for (const [k, ms] of [['bloom', 220], ['shock', 450], ['invert', 34], ['chroma', 260], ['speed', 400]]) {
    assert.ok(L.pulse(k, 0, 1) > 0, k); assert.equal(L.pulse(k, ms + 1, 1), 0, k); assert.equal(L.pulse(k, -1, 1), 0, k); assert.ok(L.pulse(k, ms / 2, .5) <= .5, k); }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="LUZP: pulsos" tools/test.js`
Expected: FAIL

- [ ] **Step 3: Implementar `pulse`**

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test --test-name-pattern="LUZP" tools/test.js`
Expected: PASS

- [ ] **Step 5: Implementar `luz-pos.js`**

- A cena do WebGL vai para um framebuffer.
- Bloom: limiar → downsample na fração de `budget.bloom` → dois passes de blur separável → soma.
- Choque: distorção radial do próprio framebuffer, mais um anel refrativo desenhado (borda clara e escura).
- Flash invertido: `1 - cor`.
- Aberração: desloca R e B pela distância ao centro.
- Linhas de velocidade: radiais desenhadas a partir de `dir`.

Tudo num único passe final quando há pulsos ativos. Sem pulso, compõe direto, sem custo extra.

- [ ] **Step 6: Verificar no navegador**

- Um crítico mostra bloom e aberração.
- Uma investida mostra as linhas de velocidade.
- Na qualidade Média o bloom fica mais barato, e o fps continua acima de 43 durante o golpe.
- Com flashes desligados não há inversão.

- [ ] **Step 7: Commit**

```bash
git add public/js/luz-pos.js public/js/luz.js public/js/luz-fx.js public/js/coreo.js public/player.html public/table.html public/gm.html tools/test.js
git commit -m "Luz: bloom, onda de choque, flash invertido, aberração cromática e linhas de velocidade"
```

---

### Task 5: Números, selos, crítico/fraqueza no mundo e KO em fagulhas

**Files:**
- Modify: `public/js/coreo.js` (`floatNum`, `seal`, `cutIn`, `knockout`), `public/js/palco-vida.js` (`inkOut`), `public/js/luz-fx.js` (`dissolve`), `public/mesa.css` e `public/style.css` (estilos `.float`, `.seal`, `.turncut` no modo `html.luz`)
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `LUZ.corpo` (para esconder o recorte durante a dissolução), `LUZP.material(el)`.
- Produces (`LUZP`, puro): `numberStyle({ crit: boolean, weak: boolean, total: boolean, heal: boolean, miss: boolean }) -> { scale: number, star: boolean, tag: ''|'Fraqueza', lifeMs: number }`. Comum: 1, sem estrela, 900 ms. Crítico: 1,45 com estrela, 1100 ms. Total: 1,6, 1200 ms. Fraqueza: tag `'Fraqueza'`. Erro: 0,85, 700 ms. Cura: 1, 900 ms.
- Produces (`LUZFX.dissolve(id: string, color: string) -> Promise<void>`): o recorte trinca em linhas de luz (~250 ms) e se desfaz em fagulhas que sobem (~900 ms). A malha some, e a classe `inked` fica ao fim, como hoje.
- No modo luz (`html.luz`, classe que `luz.js` coloca e tira), `cutIn` não abre tela de corte: chama `LUZ.pos.fire('bloom')` e o número leva a tag. `knockout` de inimigo usa `LUZFX.dissolve` no lugar de `PVIDA.inkOut`.

- [ ] **Step 1: Escrever o teste que falha**

```js
test('LUZP: estilo dos números', async () => {
  await import('../public/js/luz-perfis.js'); const L = globalThis.LUZP, n = o => L.numberStyle({ crit: false, weak: false, total: false, heal: false, miss: false, ...o });
  assert.deepEqual(n({}), { scale: 1, star: false, tag: '', lifeMs: 900 });
  assert.deepEqual(n({ crit: true }), { scale: 1.45, star: true, tag: '', lifeMs: 1100 });
  assert.equal(n({ weak: true }).tag, 'Fraqueza'); assert.equal(n({ total: true }).scale, 1.6); assert.equal(n({ miss: true }).lifeMs, 700);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="LUZP: estilo dos números" tools/test.js`
Expected: FAIL

- [ ] **Step 3: Implementar `numberStyle`**

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test --test-name-pattern="LUZP" tools/test.js`
Expected: PASS

- [ ] **Step 5: Implementar o visual**

- **Números:** DOM com fonte larga e fina, contorno escuro de 1 px e `text-shadow` na cor do elemento. Sobem e somem sem o quique de `PFX.numberPath`. O crítico leva uma estrela ✦ à esquerda.
- **Selos e corte de turno:** letras finas e largas com espaçamento, gradiente claro e uma linha de luz que corre (pseudo-elemento animado em `transform`). O BLACK FLASH mantém o `.seal.bf`, em preto e vermelho, mais `LUZ.pos.fire('invert')`.
- **KO:** `LUZFX.dissolve`.

O estilo antigo fica intacto fora de `html.luz`.

- [ ] **Step 6: Verificar no navegador**

- Crítico, fraqueza, multi-hit com total, cura e erro.
- Um selo PERFEITO, um BLACK FLASH e o corte de turno.
- Um inimigo nocauteado se desfaz em fagulhas da cor do golpe.
- Trocar para Clássico devolve o visual antigo.

- [ ] **Step 7: Commit**

```bash
git add public/js/coreo.js public/js/palco-vida.js public/js/luz-fx.js public/js/luz-perfis.js public/mesa.css public/style.css tools/test.js
git commit -m "Luz: números estilo Genshin, selos luminosos, crítico e fraqueza no mundo, KO em fagulhas"
```

---

### Task 6: Limite e Domínio — splash estilo Star Rail

**Files:**
- Create: `public/js/luz-cenas.js`
- Modify: `public/js/coreo.js` (`impact`: no modo luz o `cutscene` dá lugar a `LUZCENAS.ult`), `public/js/luz-perfis.js`, `public/mesa.css` (`.ultsplash`), três HTMLs
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `portrait(c)`/`PALCO3D.imgSrc(c, 'f')` (arte de frente do herói), `LUZ.emit`, `LUZ.pos.fire`, `PALCO3D.orbitShot`.
- Produces (`LUZP`, puro): `ultTimeline(totalMs: number) -> [{ k: 'dim'|'bg'|'art'|'name'|'back'|'strike', at: number, ms: number }]`, em ordem, sem sobreposição entre `back` e `strike`, terminando em `totalMs`. Para 5000: dim 0/300, bg 200/1600, art 300/1500, name 700/1100, back 1800/400, strike 2200/2800.
- Produces (`globalThis.LUZCENAS`): `LUZCENAS.ult(a /*char*/, f /*fx*/) -> Promise<void>`, que resolve no início de `strike`. Depois disso, `coreo.js` chama `strikeFx` com `sig: 'ult'`.

- [ ] **Step 1: Escrever o teste que falha**

```js
test('LUZP: linha do tempo do Limite', async () => {
  await import('../public/js/luz-perfis.js'); const T = globalThis.LUZP.ultTimeline(5000);
  assert.deepEqual(T.map(x => x.k), ['dim', 'bg', 'art', 'name', 'back', 'strike']);
  const end = T.at(-1); assert.equal(end.at + end.ms, 5000); const back = T.find(x => x.k === 'back'); assert.equal(back.at + back.ms, end.at);
  const T2 = globalThis.LUZP.ultTimeline(2500); assert.equal(T2.at(-1).at + T2.at(-1).ms, 2500); // velocidade 2×: tudo escala
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="LUZP: linha do tempo" tools/test.js`
Expected: FAIL

- [ ] **Step 3: Implementar `ultTimeline`**

Os valores de 5000 ms escalam linearmente para outros totais.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test --test-name-pattern="LUZP" tools/test.js`
Expected: PASS

- [ ] **Step 5: Implementar `LUZCENAS.ult`**

Uma camada DOM `.ultsplash` em `.fxl`:
- véu escuro;
- fundo abstrato do elemento, feito com partículas do material em `LUZ.emit` e gradiente CSS sem `filter`;
- arte grande do herói (`imgSrc(c, 'f')`, ou o retrato) com zoom lento em `transform`;
- nome da skill em letras finas, com o rótulo "Limite" ou "Domínio".

Depois a câmera volta ao palco com `orbitShot` durante `back`, e a promessa resolve. No Domínio, o fundo usa o glifo do elemento girando em tela cheia. O duração total sai de `LUZP.duration(P, { speed, sig: 'ult' })`.

- [ ] **Step 6: Verificar no navegador**

- Use um Limite e um Domínio: a splash entra, volta ao palco e o golpe sai.
- A HUD continua utilizável depois.
- Com velocidade 2× o tempo cai pela metade.

- [ ] **Step 7: Commit**

```bash
git add public/js/luz-cenas.js public/js/coreo.js public/js/luz-perfis.js public/mesa.css public/player.html public/table.html public/gm.html tools/test.js
git commit -m "Luz: splash estilo Star Rail para Limite e Domínio"
```

---

### Task 7: Assinaturas das camadas 8–10 por tema × grupo de família

**Files:**
- Modify: `content.js` (`node()` grava `tm`), `src/consts.js` (o esquema de `skills` aceita `tm: 'n'` e `cam: 'n'`, se ainda não aceitar), `public/js/luz-perfis.js`, `public/js/luz-cenas.js`, `public/js/luz.js` (`play` consulta `LUZP.sigOf`)
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `temaNo` de `arvore/ordem.js` (0 ofensiva, 1 controle, 2 defesa, 3 maestria, 4 especial).
- Produces: cada skill da árvore em `S.skills` tem `tm` (0–4) e `cam` (1–10).
- Produces (`LUZP`, puro):
  - `famGroup(family) -> 'dist'|'corpo'|'area'|'rito'|'apoio'`: dist = projectile, beam, psychic, musical; corpo = slash, smash, pierce, dash; area = area, rain; rito = ritual, summon; apoio = heal, barrier, form.
  - `sigOf(skill) -> { kind: 'none' } | { kind: 'line', key: '<tm>-<grupo>', intensity: number }`. Dá `line` quando `skill.cam >= 8` e a skill não é Limite nem Domínio. `intensity` = `(cam - 7) / 3`, com `key` = `${tm}-${famGroup(familyOf(skill))}` (até 25 chaves).
- Produces (`LUZCENAS.line(key, e)`): uma coreografia escrita à mão por chave, que recebe o mesmo `e` de `LUZFX.run` e pode chamar as funções de família como blocos.

- [ ] **Step 1: Escrever o teste que falha**

```js
test('Assinaturas: skills da árvore têm tm e cam; sigOf escolhe por tema × grupo', async () => {
  await import('../public/js/anim-profiles.js'); await import('../public/js/luz-perfis.js'); const L = globalThis.LUZP;
  const ns = Object.values(S.skills).filter(s => s.cam); assert.ok(ns.length > 1000);
  assert.ok(ns.every(s => Number.isInteger(s.tm) && s.tm >= 0 && s.tm <= 4), 'tm');
  assert.deepEqual(L.sigOf({ name: 'A', el: 'fis', kind: 'dmg', cam: 7 }), { kind: 'none' });
  const s10 = ns.find(s => s.cam === 10 && !s.limit && !s.dom), r = L.sigOf(s10);
  assert.equal(r.kind, 'line'); assert.equal(r.intensity, 1); assert.match(r.key, /^[0-4]-(dist|corpo|area|rito|apoio)$/);
  assert.deepEqual(L.sigOf({ ...s10, limit: true }), { kind: 'none' });
  const keys = new Set(ns.filter(s => s.cam >= 8).map(s => L.sigOf(s).key).filter(Boolean)); assert.ok(keys.size <= 25 && keys.size >= 10);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="Assinaturas" tools/test.js`
Expected: FAIL (`tm` ausente)

- [ ] **Step 3: Gravar `tm` em `content.js`**

Em `node()`, acrescentar `tm: temaNo(expand(o))`, importando `temaNo` de `./arvore/ordem.js`. Conferir que o saneamento de `src/consts.js`/`src/state.js` não descarta `tm` nem `cam` ao carregar uma campanha salva.

- [ ] **Step 4: Implementar `famGroup` e `sigOf`**

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Escrever as cenas em `luz-cenas.js`**

As chaves que existem no conteúdo vêm do teste. Cada cena é uma coreografia distinta, que dura 3000 ms em `sig: 'line'`, sobre os blocos das famílias. Por exemplo:
- `0-dist`: salva em leque de três projéteis que convergem;
- `1-rito`: correntes de luz que prendem o alvo;
- `2-apoio`: domo hexagonal que se fecha;
- `3-corpo`: três cortes em estrela com pausa;
- `4-area`: céu do elemento abrindo.

A cor, a semente e a intensidade vêm da skill.

- [ ] **Step 7: Verificar no navegador**

Dê a um herói de teste skills de camada 8–10 de temas diferentes. Cada uma toca a cena da sua chave, e skills da mesma linha variam entre si.

- [ ] **Step 8: Commit**

```bash
git add content.js src/consts.js public/js/luz-perfis.js public/js/luz-cenas.js public/js/luz.js tools/test.js
git commit -m "Luz: assinaturas das camadas 8–10 por tema e grupo de família"
```

---

### Task 8: Chefes por preset e comandos especiais

**Files:**
- Modify: `src/handlers.js` (campo `bossFx` ao lado de `boss`, linha ~66), `src/state.js` ou `src/campaign.js` (saneamento ao carregar), `public/js/mestre.js` (selects na ficha do chefe, perto do checkbox `boss`, linha ~97), `public/js/luz-perfis.js`, `public/js/luz-cenas.js`, `public/js/coreo.js` (`intro` e `strikeFx` do chefe; `comandoFx`)
- Test: `tools/test.js`

**Interfaces:**
- Produces: `ch.bossFx = { in: Preset, hit: Preset, col: '#rrggbb' } | null`, com `Preset ∈ ['ascensao','eclipse','tempestade','mare','erupcao','julgamento','enxame','fenda']`. O handler recebe `{ id, f: 'bossFx', v }` só do mestre e só para `ch.enemy`. Valores fora da lista viram `null`, e a cor inválida vira `''`.
- Produces (`LUZP`, puro): `BOSS_PRESETS` (a lista acima) e `bossScene(ch, which: 'in'|'hit') -> { preset: Preset, col: string }`. Sem `bossFx` válido, usa o preset do elemento: kagutsuchi→erupcao, susanoo→mare, indra→tempestade, tsukuyomi→eclipse, amaterasu→julgamento, hiruko→enxame, oculto→fenda, e o resto→ascensao. A cor fica `ELC[mainEl]`.
- Produces (`LUZCENAS`): `LUZCENAS.boss(preset, which, ch, e)` e `LUZCENAS.cmd(kind: 'bf'|'chq'|'ctr'|'perf', e)`.
- `coreo.js`: `intro()` toca `LUZCENAS.boss(..., 'in', ...)` para o chefe no lugar da `bossband` simples (a faixa continua no clássico). O golpe do chefe com a skill de maior `power` dele usa `'hit'`. `comandoFx` chama `LUZCENAS.cmd`.

- [ ] **Step 1: Escrever o teste que falha**

```js
test('Chefes: bossFx saneado e cena padrão pelo elemento', async () => {
  reset(); const e = mk(gm, { name: 'Dragão', enemy: true }); H.setChar?.(gm, { id: e.id, f: 'boss', v: true });
  handle(gm, { t: 'setChar', id: e.id, f: 'bossFx', v: { in: 'eclipse', hit: 'xyz', col: 'vermelho' } });
  assert.deepEqual(S.chars[e.id].bossFx, { in: 'eclipse', hit: null, col: '' });
  handle(ana, { t: 'setChar', id: e.id, f: 'bossFx', v: { in: 'fenda' } }); assert.equal(S.chars[e.id].bossFx.in, 'eclipse', 'jogador não muda');
  await import('../public/js/luz-perfis.js'); const L = globalThis.LUZP;
  assert.equal(L.bossScene({ el: 'kagutsuchi' }, 'in').preset, 'erupcao');
  assert.equal(L.bossScene({ el: 'fis', bossFx: { in: 'eclipse', hit: null, col: '' } }, 'hit').preset, 'ascensao');
  assert.equal(L.bossScene({ el: 'fis', bossFx: { in: 'eclipse', hit: null, col: '#ff0000' } }, 'in').preset, 'eclipse');
});
```

Antes de rodar, ajustar o nome da mensagem (`t: 'setChar'`) e a forma de marcar `boss` ao que o handler da linha ~66 de `src/handlers.js` usa de fato. O teste segue o handler, não o contrário. `bossScene` recebe o elemento já resolvido em `el` (no navegador, `mainEl(ch)`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="Chefes" tools/test.js`
Expected: FAIL

- [ ] **Step 3: Implementar handler, saneamento ao carregar e `bossScene`**

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Interface do mestre**

Na ficha do inimigo com `boss` marcado, dois `<select>` ("Entrada" e "Golpe") com os 8 presets e a opção "Pelo elemento", mais um `<input type="color">`. Enviam o campo `bossFx`.

- [ ] **Step 6: Escrever as cenas**

- **Os 8 presets de chefe**, cada um em versão de entrada (~2,5 s, durante a `intro`) e de golpe (`sig: 'line'`):
  - ascensão: coluna de luz;
  - eclipse: disco escuro com coroa;
  - tempestade: nuvem com raios;
  - maré: onda que quebra;
  - erupção: chão que racha e explode;
  - julgamento: espadas de luz que descem;
  - enxame: nuvem de partículas que se fecha;
  - fenda: rasgo no ar com olhos.
- **Os 4 comandos:**
  - Black Flash: inversão, faíscas negras com borda vermelha e choque;
  - Choque: duas ondas que colidem;
  - Contra: corte rápido com linhas de velocidade;
  - Perfeito: anel dourado que fecha com estrela.

- [ ] **Step 7: Verificar no navegador**

- Como mestre, marque um chefe, escolha "Eclipse"/"Fenda" e inicie a batalha: a entrada toca e o golpe forte usa a fenda.
- Com "Pelo elemento", usa o padrão do elemento.
- Os comandos especiais disparam as cenas no QTE.

- [ ] **Step 8: Commit**

```bash
git add src/handlers.js src/state.js src/campaign.js public/js/mestre.js public/js/luz-perfis.js public/js/luz-cenas.js public/js/coreo.js tools/test.js
git commit -m "Luz: cenas de chefe por preset na ficha e comandos especiais"
```

(Adicione só os arquivos de `src/` que mudaram de fato.)

---

### Task 9: Remover o motor clássico (só depois da aprovação do usuário jogando)

**Files:**
- Delete: o desenho de `public/js/anim-engine.js`. As funções que o motor novo reusa (`ANIMFX.level` e as configurações) migram para `luz.js`, e o fallback 2D vira um desenho mínimo dentro de `luz.js`: brilho no alvo e número.
- Modify: três HTMLs, `public/js/extras.js` (o select "Efeitos" sai), `public/js/coreo.js` e `public/js/palco-vida.js` (sem os ramos `html.luz`/clássico), `public/js/luz-perfis.js` (`engineFor` devolve `'luz'|'minimo'`), CSS antigo de `.animfx-*`/`.cutin`/`.kofx`
- Test: `tools/test.js`

**Interfaces:**
- Produces: `LUZP.engineFor(...) -> 'luz'|'minimo'`, sem `style`.

- [ ] **Step 1: Confirmar com o usuário que o motor novo foi aprovado jogando**

Pare aqui se não houver aprovação explícita.

- [ ] **Step 2: Atualizar o teste de `engineFor`**

Sem `style`, `webgl2: false` ou `lost: true` → `'minimo'`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test --test-name-pattern="LUZP: orçamento" tools/test.js`
Expected: FAIL

- [ ] **Step 4: Remover o clássico e implementar o mínimo**

- [ ] **Step 5: Rodar a suíte e verificar no navegador**

- Run: `npm test`, com PASS esperado.
- No navegador, uma batalha completa sem erros.
- Com WebGL desligado (`javascript_tool`: força `lost`), o combate continua legível.

- [ ] **Step 6: Commit**

```bash
git add public/js/anim-engine.js public/js/luz.js public/js/luz-perfis.js public/js/extras.js public/js/coreo.js public/js/palco-vida.js public/player.html public/table.html public/gm.html public/style.css public/mesa.css tools/test.js
git commit -m "Luz: remove o motor clássico, com fallback mínimo sem WebGL"
```

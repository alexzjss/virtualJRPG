# Refino do combate (escudo, status por golpe, dano no impacto) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir as contas do escudo e do status em multi-hit, mostrar o escudo como trecho sobre a barra de HP e fazer as barras descerem no impacto do golpe.

**Architecture:** Servidor (`src/rules.js`) ganha soma com teto e não-vazamento do escudo e uma flag `mid` para batidas intermediárias. Cliente: regra pura `PFX.shieldSeg` em `public/js/palco-fx.js`; `bar()`/HUD desenham o trecho; `public/js/coreo.js` segura as barras (`data-bid`) até o `hit1` do alvo.

**Tech Stack:** Node ESM, `node:test` (`npm test`), JS de navegador sem build.

**Spec:** `docs/superpowers/specs/2026-11-19-refino-combate-escudo-design.md`

## Global Constraints
- Teto do escudo: `Math.ceil(t.hpMax * .5)`; escudo que já passa do teto (passiva) não é reduzido.
- Duração do escudo: 3 turnos; +1 se lançado em si mesmo no próprio turno (mesma regra do `st` em `fx1`).
- Dano mental ignora o escudo (como hoje).
- Textos de jogo em português; sem áudio novo.
- Outra sessão pode editar o mesmo checkout: `git add` só dos arquivos da tarefa, nunca `stash`.

## Review Focus
- Golpe que zera o escudo e passa o resto ao HP: o corpo fere só pelo resto (teste na Tarefa 1).
- Escudo com `reflect` no alvo: atacante não sofre reflexo do que o escudo segurou (Tarefa 1).
- Multi-hit que mata na 1ª batida: status não some nem aplica em alvo caído (Tarefa 2, golpe sai do laço — conferir `s.st` não aplica em hp 0, já protegido por `t.hp > 0`).
- Barra presa sem impacto (aba em segundo plano, animação desligada): a trava solta a barra (Tarefa 4).
- Cura e Aura (sem golpe): barras seguem o comportamento antigo, sem esperar impacto (Tarefa 4).

---

### Task 1: Escudo no servidor — soma com teto, duração igual, sem vazamento

**Files:**
- Modify: `src/rules.js:289` (`fx1` case `shield`), `src/rules.js:342-344` (`hurt`), `src/rules.js:489-515` (`strike`)
- Test: `tools/test.js` (junto ao teste "roubo de vida, detonar condição e escudo", ~linha 259)

**Interfaces:**
- Produces: `t.shield` nunca passa de `max(atual, ceil(hpMax*.5))`; em `strike`, `dh` = dano que chega ao HP (`d - absorvido`, `d` se mental).

- [ ] **Step 1: testes que falham** — novo `test('escudo: soma até metade do HP, dura 3 turnos e não vaza dano', …)`:
  - `[a,e]=duel(); use(a,'Escudo de Areia',a); const v=a.shield; assert.equal(a.st.shield, 3); use(a,'Escudo de Areia',a); assert.equal(a.shield, Math.min(2*v, Math.ceil(a.hpMax*.5)));`
  - aliado: `const b=mk(ana,{}); derive(b); b.hp=b.hpMax; S.battle.ticks[b.id]=900; use(a,'Escudo de Areia',b); assert.equal(b.st.shield, 3);`
  - não vaza: `[a,e]=duel(); a.shield=999; a.st.shield=3; a.st.reflect=3; const h0=a.hp, he=e.hp; turn(e); fixR(.3,()=>H.act(gm,{id:e.id,skill:'atk',target:a.id})); assert.equal(a.hp,h0); assert.equal(Object.values(a.body).reduce((x,y)=>x+y,0),0); assert.equal(e.hp,he); assert.equal(S.battle.stats?.[e.id]?.dmg||0,0);`
  - parcial: `[a,e]=duel(); a.shield=1; a.st.shield=3; e.arma=40; turn(e); fixR(.3,()=>H.act(gm,{id:e.id,skill:'atk',target:a.id})); assert.equal(Object.values(a.body).reduce((x,y)=>x+y,0), a.hpMax-a.hp);`
- [ ] **Step 2:** `node --test --test-name-pattern="escudo: soma" tools/test.js` → FAIL.
- [ ] **Step 3:** implementar. `fx1 shield`: `t.shield = Math.max(t.shield||0, Math.min(Math.ceil(t.hpMax*.5), (t.shield||0)+v)); t.st.shield = Math.max(t.st.shield||0, 3 + (t===a && current()===a.id ? 1 : 0));`. Em `strike`, antes de ferir o corpo: `const ab = mental ? 0 : Math.min(t.shield||0, d), dh = d - ab;` e usar `dh` em `t.body[part] +=`, no `tally` (`Math.min(dh, t.hp)`), no `hitFx` (`{ d: dh, … }`) e no reflexo (`if (dh > 0 && …)`, `rd` de `dh`). `hurt` continua absorvendo com o mesmo `d`.
- [ ] **Step 4:** `npm test` → PASS (inclui o teste antigo de escudo).
- [ ] **Step 5:** `git add src/rules.js tools/test.js && git commit -m "Escudo: soma até metade do HP, dura 3 turnos e não vaza para corpo, placar, dreno e reflexo"`

### Task 2: Status uma vez por golpe de várias batidas

**Files:**
- Modify: `src/rules.js:318` (`hitFx`), `src/rules.js:507` (`s.st` em `strike`), `src/rules.js:668` (laço do `doAct`)
- Test: `tools/test.js`

**Interfaces:**
- Produces: opção `o.mid` de `strike` (true = batida intermediária); `hitFx` recebe `c.mid` e pula `f.t === 'st'`.

- [ ] **Step 1: teste** `test('golpe de várias batidas aplica o status uma vez', …)`: `[a,e]=duel(); S.skills.tmpMulti={ name:'Teste Multi', kind:'dmg', attr:'FOR', el:'fis', power:5, cost:0, res:'aura', hits:3, fx:[{t:'st',k:'burn',n:2}] }; a.skills.push('tmpMulti'); turn(a); fixR(.3,()=>H.act(gm,{id:a.id,skill:'tmpMulti',target:e.id})); assert.equal(e.st.burn, 2); delete S.skills.tmpMulti;`
- [ ] **Step 2:** rodar → FAIL (burn 6).
- [ ] **Step 3:** no laço: passar `mid: h < total-1 || !!cx?.fin` ao `strike`; em `strike`, `hitFx(a,s,t,{ d: dh, stat, blk, mid: o.mid })`, `hitFx` filtra `!(c.mid && f.t==='st')`, e `if (s.st && !o.mid) applySt(t, s.st)`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** commit `"Combate: status de golpe de várias batidas aplicado só na última"`.

### Task 3: Trecho do escudo sobre a barra de HP e "Quebra" no HUD

**Files:**
- Modify: `public/js/palco-fx.js` (nova `shieldSeg`, exportar em `g.PFX`), `public/js/palco.js:2-5` (`bar`), `public/js/hud.js:90,126,134`, `public/style.css` (perto da linha 1531)
- Test: `tools/test.js` (bloco do PFX, ~linha 1653)

**Interfaces:**
- Produces: `PFX.shieldSeg(hpPct:number, shPct:number) -> { l:number, w:number }` (porcentagens; trecho começa no fim do HP e, se passar de 100, encosta à direita); elemento `<b class="shbar" data-bid="<id>:sh" data-p="<w>" style="left:<l>%;width:<w>%">` dentro da barra de HP.

- [ ] **Step 1: teste** `assert.deepEqual(F.shieldSeg(60,20),{l:60,w:20}); assert.deepEqual(F.shieldSeg(90,30),{l:70,w:30}); assert.deepEqual(F.shieldSeg(50,0),{l:50,w:0}); assert.deepEqual(F.shieldSeg(10,150),{l:0,w:100});`
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar `shieldSeg` (w = clamp 0..100, l = min(hp, 100-w)); `bar('hp', c)` e as três `.hpbar` do HUD acrescentam o `<b class="shbar">` quando `c.shield > 0` (shPct = `100*c.shield/c.hpMax`); CSS `.shbar{position:absolute;top:0;bottom:0;background:linear-gradient(#bff1ff,#70d8ff);box-shadow:0 0 6px #70d8ffaa;transition:left .7s,width .7s;z-index:2;pointer-events:none}` e `.hpbar{position:relative}`; título `"Escudo (Quebra)"` → `"Quebra"`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** commit `"Palco e HUD: trecho de escudo sobre o HP; barra de Quebra com o nome certo"`.

### Task 4: Barras presas até o impacto

**Files:**
- Modify: `public/js/coreo.js:263-271` (`fx()`, laço `[data-bid]`), `public/js/coreo.js` (`hit1`, ~linha 170)
- Modify: `public/js/palco-fx.js` (nova `stepPct`)
- Test: `tools/test.js` (bloco do PFX)

**Interfaces:**
- Consumes: `data-bid` `"<id>:hp"`, `"<id>:sh"`, `"<id>:san"` (Tarefa 3).
- Produces: `PFX.stepPct(old:number, nw:number, frac:number) -> number` (arredondado, `frac` 0..1); em `coreo.js`, mapa `held: Map<bid, { el, old, p, done:number, total:number }>`, `releaseBars(id, frac)`.

- [ ] **Step 1: teste** `assert.equal(F.stepPct(80,20,.5),50); assert.equal(F.stepPct(80,20,1),20); assert.equal(F.stepPct(80,20,0),80);`
- [ ] **Step 2:** rodar → FAIL; **Step 3:** implementar `stepPct`.
- [ ] **Step 4:** em `fx()`: se a barra pertence a um alvo de `acts` com `fx.dmg || fx.miss` (id = `bid.split(':')[0]`) e o valor caiu, fixa a largura em `old`, guarda em `held` e não aplica `transitionDelay`; demais barras seguem o código atual. Trava: `setTimeout(() => releaseBars(id, 1), wait + 6000)`.
- [ ] **Step 5:** em `hit1`, depois do número: `releaseBars(f.id, frac)` com `frac` = dano acumulado deste alvo até esta batida ÷ `sumD[f.id]` (1 na última batida ou em `miss`); `releaseBars` põe `width = stepPct(old,p,frac)%` (no `.shbar` também ajusta `left` pela `shieldSeg` do HP atual) e, para HP, move o `.trail` 450 ms depois; com `frac === 1` apaga do `held`.
- [ ] **Step 6:** `npm test` → PASS; abrir o palco (`preview_start`) com um inimigo de multi-hit contra herói com escudo: barra e trecho de escudo descem junto com os números, em degraus; sem erros no console.
- [ ] **Step 7:** commit `"Palco: barras de HP e escudo descem no impacto de cada batida"`.

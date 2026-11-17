# Comandos de ação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o Aparar de hoje por um motor de comandos de ação: Aparar e Esquiva numa tecla só, golpes de várias
batidas, golpe anunciado, Choque, 7 comandos de ataque, 45 nós novos e a marcação dos nós existentes.

**Architecture:** Motor híbrido.
- **Defesa:** a janela `S.battle.cmd` é medida no servidor, que segura a vez do inimigo até ela fechar.
- **Ataque:** o navegador roda o minigame e manda a nota dentro do `act`. O servidor limita a nota e aplica.
- **Regras puras compartilhadas** (zonas, limites, nota → efeito, reconhecedor de runa) ficam em `public/rules.js` como
  `RULES.CMD`, carregado pelo servidor e pelo navegador. Assim os testes de `node --test` cobrem essas regras.

**Tech Stack:** Node (ESM), `ws`, JS puro no navegador, `node:test`, Playwright em `tools/ui-smoke.js`.

**Spec:** `docs/superpowers/specs/2026-11-17-comandos-de-acao-design.md` (ler junto; as §§ abaixo citam ele).

## Global Constraints

- Ignorar um comando de ataque nunca dá menos que o resultado normal. As únicas exceções são o estouro do Segurar
  (sai normal + Exposto) e o Aparar, que já é aposta.
- Anel de defesa: batida de 1100 ms; zona de Esquiva de 450 ms; zona de Aparar = `par` do melhor nó (250–600) +200 ms de folga.
  Batidas de golpe multi-golpe espaçadas em 700 ms.
- Prazo do comando de ataque: 6 s; sem nota, o resultado é normal.
- Black Flash só no Perfeito do `tempo`: `cp = 30 + 8 × (bf + mod bf)` ms; ×2,5 e devolve 25% da Aura máxima. O d100 não dispara mais.
- Chefe: 20% de Perfeito em golpe anunciado, com dano ×1,25 e batida 20% mais curta. Aparar por chance de chefes e elites segue em 15%/10%.
- Choque: só em golpe anunciado de alvo único; 3 s; `meta = clamp(10, 40, round(18 × poderInimigo / poderChoque))`, com +20% em chefe;
  no máximo 20 apertos por segundo; venceu = ×1,3 no inimigo e inimigo Exposto; perdeu = leva ×1,3.
- Notas e textos de tela em português, no tom dos nós existentes. Sem biblioteca nova.
- `prefers-reduced-motion`: sem tremer a tela e com flash suave.
- Não editar à mão os arquivos de árvore existentes para marcar nós. A marcação fica numa tabela em `arvore/leva4.js` (Task 10).

## Review Focus

1. **Servidor reiniciado ou mestre sai no meio de uma janela.** `S.battle.cmd` velho (mais de `w + 3000` ms) é descartado e o
   inimigo pode agir de novo, como já acontece com `parry`. Teste na Task 2.
2. **Jogador manda nota de ataque absurda** (`n: 999`, `g: 'perf'` numa técnica sem `cmd`, `acc: -5`). O servidor limita ou
   ignora, e nunca passa de `mx`/tamanho de `seq`/`nt`. Teste na Task 6.
3. **O alvo cai ou sai da batalha durante a janela** (aliado cura, mestre tira da fila). Quando a janela fecha, `aiRun`
   replaneja o alvo se o planejado não for mais válido, e as notas do alvo antigo não valem. Teste na Task 2.
4. **Herói sem Aura apertando na zona de Aparar.** Conta como Esquiva em golpe anunciado; em golpe não anunciado, o anel nem
   aparece. Não fica com Aura negativa. Teste na Task 3.
5. **Segundo `act` ou tecla repetida chegando durante o minigame** (duplo clique, Enter). Só um `act` vale por turno, e o
   overlay ignora teclas depois de mandar a nota. Teste na Task 6 (servidor) e na Task 9 (ui-smoke).

---

## Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `public/rules.js` | + `RULES.CMD`: constantes, `gradeDef`, `clampCmd`, `cmdEffect`, `runeScore`, modelos de runa, textos de descrição |
| `content.js` | `expand`: valida e converte os campos novos (`cmd`, `pf`, `seq`, `rn`…) |
| `src/rules.js` | `aiPlan`/`aiRun`, `defCheck` (troca `parryCheck`), contra-ataque, aplicação da nota no `doAct`/`strike`, `telOf`, Perfeito de chefe, Choque |
| `src/handlers.js` | `ai` abre `S.battle.cmd`; `def` (troca `parry`), `chq`, `cmdOn`, `tel` (mestre); `act` repassa `m.cmd` |
| `public/js/comandos.js` | troca `aparar.js`: anel de defesa com zonas, batidas e Choque |
| `public/js/cmd-ataque.js` | os 7 minigames de ataque + gancho antes do `send({t:'act'})` em `eventos.js` |
| `public/js/coreo.js` | selos PERFEITO/BOM/CONTRA, Black Flash, tremor do Choque, sons |
| `public/js/mestre.js` | interruptor ⚠ por técnica no editor de inimigo |
| `arvore/leva4.js` | 45 nós novos + tabela `MARCA` de nós existentes + regras automáticas (bf, circ) |
| `tree.js` | importa e aplica a Leva 4 |
| `tools/test.js` | testes novos; o teste da Leva 3 de Aparar é reescrito |
| `ARVORE-SISTEMAS.md`, `DECISOES-SISTEMAS.md`, `README.md` | notação e decisões |

---

### Task 1: Campos novos dos nós e regras puras (`RULES.CMD`)

**Files:**
- Modify: `public/rules.js` (novo bloco `CMD` exportado em `globalThis.RULES`)
- Modify: `content.js:27-40` (`expand`)
- Modify: `src/rules.js:84` (`modsOf`: chaves iniciais)
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `RU.CMD.KINDS = ['tempo','martelar','segurar','seq','ritmo','mira','runa','choque']`
  - `RU.CMD.RUNES = ['circulo','triangulo','raio','espiral','estrela','onda']`
  - `RU.CMD.DEF = { beat: 1100, esq: 450, grace: 200, gap: 700 }`
  - `RU.CMD.gradeDef(left, par, esq, canParry) → 'par'|'esq'|'cedo'|'late'`. `left` = ms até o impacto (negativo = depois).
    `left ≤ par && left ≥ -200` → `'par'` se `canParry`, senão `'esq'` quando `esq > 0`; `par < left ≤ par + esq` → `'esq'`;
    `left > par + esq` → `'cedo'`; `left < -200` → `'late'`. Com `esq = 0` (golpe não anunciado), a zona de esquiva não existe.
  - Campos de nó aceitos por `expand`: `cmd` (um de KINDS), `pf` (string fx → parseada como `fx`), `seq` (só `↑↓←→`, 3–7),
    `fin`, `mx`, `mt`, `cw`, `cp`, `cz`, `ma`, `nt` (4–8), `rn` (um de RUNES), `tel` (0/1).
  - `modsOf` passa a iniciar `cw, cp, mx, cz, ma, esq, par, chq, rit, ctr, rn` em 0.

- [ ] **Step 1: Testes que falham**

```js
test('comandos: expand valida campos e gradeDef decide a zona', async () => {
  const { expand } = await import('../content.js');
  assert.throws(() => expand({ n: 'X', k: 'dmg', cmd: 'dança' }), /cmd/);
  assert.throws(() => expand({ n: 'X', k: 'dmg', cmd: 'seq', seq: '↑x' }), /seq/);
  assert.throws(() => expand({ n: 'X', k: 'dmg', cmd: 'runa', rn: 'quadrado' }), /rn/);
  assert.equal(expand({ n: 'X', k: 'dmg', cmd: 'tempo', pf: 'st bleed 2' }).pf[0].t, 'st');
  const g = RU.CMD.gradeDef;
  assert.equal(g(100, 300, 450, true), 'par'); assert.equal(g(100, 300, 450, false), 'esq');
  assert.equal(g(500, 300, 450, true), 'esq'); assert.equal(g(800, 300, 450, true), 'cedo');
  assert.equal(g(-150, 300, 450, true), 'par'); assert.equal(g(-250, 300, 450, true), 'late');
  assert.equal(g(500, 300, 0, true), 'cedo', 'sem golpe anunciado não há esquiva');
});
```

- [ ] **Step 2:** `npm test` → falha (`RU.CMD` indefinido / `expand` não lança).
- [ ] **Step 3:** Implementar `RU.CMD` (constantes + `gradeDef`) em `public/rules.js`; em `expand`, validar e lançar `Error` com
  o nome do campo e o nó, como `kv` já faz; `pf` via `parseFx`. Iniciar as chaves novas em `modsOf`.
- [ ] **Step 4:** `npm test` → passa (inclusive o teste da grade: nenhum nó existente usa os campos ainda).
- [ ] **Step 5:** Commit `Comandos: campos de nó e regras puras da janela de defesa`.

---

### Task 2: IA em duas fases (`aiPlan` / `aiRun`)

**Files:**
- Modify: `src/rules.js:633` (`aiAct`)
- Modify: `src/handlers.js:209-215` (`ai`)
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `aiPlan(a) → { skill, target, area, tgs: [ids] } | null`. É a decisão que `aiAct` toma hoje, sem efeito nenhum.
    `null` = só passa a vez.
  - `aiRun(a, plan)`: executa o plano. Se `plan.target` caiu ou saiu de `S.battle.ticks`, chama `aiPlan` de novo.
  - `aiAct(a)` continua existindo como `aiRun(a, aiPlan(a))`, para os chamadores atuais e para `tools/sim.js`.
  - Exportar `aiPlan` em `server.js` junto com os outros (para os testes).

- [ ] **Step 1: Testes que falham**
  - `'IA: aiPlan não muda o estado e aiRun executa o plano'`: num inimigo com 1 técnica e 1 herói, `aiPlan` devolve aquela
    técnica e aquele alvo. `S.log.length`, os HPs e os ticks ficam iguais depois do `aiPlan`. `aiRun` tira HP do herói.
  - `'IA: alvo planejado que caiu é replanejado'`: com 2 heróis, planejar, zerar o HP do alvo e chamar `aiRun`. O outro
    herói leva o golpe.
  - `'IA: janela velha é descartada'`: `S.battle.cmd = { foe, at: Date.now() - 10000, w: 1100 }`; `H.ai(gm)` age normalmente.
- [ ] **Step 2:** `npm test` → falha (`aiPlan` não existe).
- [ ] **Step 3:** Separar `aiAct` em `aiPlan` + `aiRun` sem mudar as escolhas (a aleatoriedade fica no `aiPlan`).
- [ ] **Step 4:** `npm test` → passa; `node tools/sim.js 50` roda sem erro.
- [ ] **Step 5:** Commit `IA: separa planejar e agir`.

---

### Task 3: Janela de defesa — uma tecla, só no alvo, Exposto no inimigo

**Files:**
- Modify: `src/rules.js:510-525` (`parryable`, `parNode`, `parriers`, `parryCheck` → `defCheck`)
- Modify: `src/handlers.js:9, 209-221` (`PARRY_W` → `RU.CMD.DEF.beat`; `ai`; `parry` → `def`)
- Test: `tools/test.js:975-986` (reescrever o teste da Leva 3)

**Interfaces:**
- Consumes: `aiPlan` (Task 2), `RU.CMD.gradeDef` (Task 1).
- Produces:
  - `telOf(a, skillKey) → boolean`: `S.skills[k].tel === 1 || (a.telK || []).includes(k)`. A Task 5 preenche `telK`.
  - `S.battle.cmd = { foe, at, w, beats: [ms desde at], tel: bool, tgs: [ids], plan, p: { [heroId]: ['par'|'esq'|'cedo'|'late'|null, ...] }, paid: { [heroId]: true }, perf: bool }`.
  - Handler `def(c, { id })`: grava a nota da **próxima batida ainda sem nota** do herói. Só vale se `id ∈ tgs`.
    Paga a Aura do melhor nó `par` na primeira batida com nota `'par'` (`paid`), e marca `parT`.
  - `defCheck(a, s, t, o, sure, beat) → '' | 'par' | 'esq' | 'bad'`, chamado em `strike` no lugar de `parryCheck`.

Regras (spec §4.1–4.3):
- **Quando abre** (`H.ai`, depois de `aiPlan`): técnica planejada anunciada (`telOf`) e de dano ou mental → janela com
  esquiva (`tel: true`) para todo alvo. Senão, `parryable` e o alvo tem nó `par` com Aura e pode agir → janela só de Aparar
  (`tel: false`). Senão, `aiRun` direto.
- `w = beats.at(-1) + 0`. O golpe sai em `setTimeout(w + grace)`.
- **Nota:** `'par'` anula o golpe, devolve `power` do nó em Aura, +10 de Limite, `brkHit(a,1,t)` **e `applySt(a,'exposed',1)`**.
  `'esq'` anula o golpe, sem nada a mais. `'cedo'` → `applySt(t,'exposed',1)`; se `!tel` (tentativa de Aparar), o golpe
  sai ×1,5. Sem nota ou `'late'` → golpe normal.
- O ganho de Aura e o Limite do Aparar valem uma vez por golpe, não por batida.
- Golpe mental não tem Aparar, só Esquiva quando anunciado. Zona de esquiva com `+ mods.esq`; zona de Aparar com `+ mods.par`.
- O Aparar por chance de chefes e elites (`parryCheck` linhas 522-524) continua igual.

- [ ] **Step 1: Testes que falham** (substituem o teste das linhas 975-986)
  - `'defesa: golpe não anunciado abre só Aparar e só para o alvo'`: 2 heróis com nó `Aparar`, 1 inimigo com técnica
    não anunciada. Depois de `H.ai(gm)`: `S.battle.cmd.tgs` tem só o alvo planejado e `tel === false`. `H.def` do outro
    herói não grava nada e não cobra Aura.
  - `'defesa: Aparar certo anula, dá Aura e expõe o inimigo'`: ajustar `S.battle.cmd.at` para `left = 100`; `H.def`; esperar
    `w + 300`. HP igual, `e.st.exposed` > 0, `h.aura` = antes − `c` + `p`.
  - `'defesa: cedo demais em Aparar → Exposto e ×1,5'`: `left = 1000`, `tel:false`. O HP cai mais que o golpe base
    (comparar com `Math.random` fixo), e `h.st.exposed`.
  - `'defesa: golpe anunciado — esquiva sem nó, de graça'`: herói sem nó e técnica com `tel: 1` (usar `Golpe Pesado`
    depois da Task 10, ou `S.skills[k].tel = 1` no teste). `left = 500` → nota `'esq'`, HP igual, Aura igual.
  - `'defesa: sem Aura na zona de Aparar vira esquiva (anunciado) e não abre janela (não anunciado)'` (Review Focus 4).
  - `'defesa: sem nó, sem golpe anunciado → sem janela'` (mantém a linha 985).
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar no servidor. `S.battle.parry` deixa de existir (renomear também em `view`/`push`, se for
  enviado ao cliente; procurar com `grep -n "battle.parry"`).
- [ ] **Step 4:** `npm test` → passa.
- [ ] **Step 5:** Commit `Defesa: uma tecla, janela só no alvo e Exposto no inimigo`.

---

### Task 4: Várias batidas e contra-ataque

**Files:**
- Modify: `src/rules.js` (`defCheck`, laço de `hits` em `doAct` ~586, nova `counterAll`)
- Modify: `src/handlers.js` (`ai`: montar `beats`)
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `S.battle.cmd` (Task 3).
- Produces:
  - `beats = [beat, beat+gap, beat+2·gap, …]` (uma por golpe de `hits`, com `beat = 1100` e `gap = 700`).
  - Em `strike`, o índice da batida chega por `o.beat` (o laço de `hits` passa `h`).
  - `counterAll(t, a)`: depois do laço, se todas as batidas do herói tiveram `'par'`, ele ataca com
    `basicOf(t)` ×(1,5 + `mods.ctr`/100), com `{ counter: true, nochain: true }`. Log `CONTRA!` com `fx.ctr = 1`.

- [ ] **Step 1: Testes que falham**
  - `'batidas: golpe de 3 golpes abre 3 batidas'`: `S.battle.cmd.beats` = `[1100, 1800, 2500]`.
  - `'batidas: aparar todas → contra-ataque e Aura cobrada uma vez'`: gravar `'par'` nas 3 (chamar `H.def` 3× com `at`
    ajustado antes de cada uma); HP do herói igual; inimigo perdeu HP; `h.aura` = antes − `c` + `p`.
  - `'batidas: aparar 2 de 3 → só a batida sem nota acerta, sem contra'`.
  - `'batidas: Leitura de Combo sobe o contra para ×2'` (depois da Task 10; enquanto isso, `mod: { ctr: 50 }` no teste).
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` → passa.
- [ ] **Step 5:** Commit `Defesa: batidas por golpe e contra-ataque ao aparar todas`.

---

### Task 5: Golpe anunciado automático, interruptor do mestre e Perfeito de chefe

**Files:**
- Modify: `src/rules.js` (`makeFoe`/criação de inimigo do bestiário ~668; início de batalha; `strike` para o ×1,25)
- Modify: `src/handlers.js` (handler `tel`; `ai`: chance de Perfeito)
- Modify: `public/js/mestre.js` (botão ⚠ na lista de técnicas do editor de inimigo)
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `autoTel(ch) → [skillKeys]`: chefe = as 2 técnicas de dano/mental com maior `pw` (a mesma conta de `aiAct`: power × hits ×
    1,5 se área); elite = 1; comum = []. Grava em `ch.telK` na criação a partir do bestiário. Na abertura de batalha, só
    grava se `ch.telK === undefined`.
  - Handler `tel(c, { id, skill, on })`: só o mestre; liga ou desliga `skill` em `S.chars[id].telK`. Ao salvar no
    bestiário, `telK` vai junto, como os outros campos.
  - `S.battle.cmd.perf = true` com chance de 20% quando o atacante é chefe e `tel`. Nesse caso `beat` vira `round(1100 × 0,8)`,
    o dano sai ×1,25 em `strike` (`o.perf`) e o log leva `fx.perf = 1` e o texto `PERFEITO`.

- [ ] **Step 1: Testes que falham**
  - `'tel: chefe nasce com 2 técnicas anunciadas, elite com 1, comum com 0'` (usar `H.spawn`/o caminho de bestiário que
    os testes já usam; procurar `bestiary` em `tools/test.js`).
  - `'tel: inimigo salvo sem telK recebe na primeira batalha; o que o mestre desliga fica desligado'`.
  - `'tel: jogador não pode mexer'` (`H.tel(ana, …)` não muda nada).
  - `'chefe: golpe anunciado Perfeito sai ×1,25'` (fixar `Math.random` com um stub que devolve 0 na chance e 0,5 no resto;
    comparar o dano com e sem `perf`).
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar; no editor, ⚠ ao lado de cada técnica de inimigo manda `{ t: 'tel', id, skill, on }`.
- [ ] **Step 4:** `npm test` → passa.
- [ ] **Step 5:** Commit `Golpe anunciado: automático nos chefes, interruptor do mestre e Perfeito de chefe`.

---

### Task 6: Comandos de ataque no servidor

**Files:**
- Modify: `public/rules.js` (`RU.CMD.clampCmd`, `RU.CMD.cmdEffect`)
- Modify: `src/rules.js` (`doAct` ~552-600, `strike` ~427-490: Black Flash, multiplicador, extras, `pf`, estouro, mira, ritmo, runa em ritual)
- Modify: `src/handlers.js:232` (`act` repassa `m.cmd`)
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - Nota enviada pelo cliente: `m.cmd = { g: ''|'bom'|'perf', n: int, acc: 0..1 }`.
  - `RU.CMD.clampCmd(s, cmd, mods) → { g, n, acc }`: sem `s.cmd`, devolve `{ g:'', n:0, acc:0 }`. Limita `n` a
    `mx + mods.mx` (martelar), `seq.length` (seq) ou `nt` (ritmo). `acc` vai para 0..1 e `g` precisa ser um dos 3.
  - `RU.CMD.cmdEffect(s, c) → { mult, extra, seqHits, fin, pf, bf, crit, brk, estouro, turns, healMult, noSan, noteMult }`.
    É a tabela do spec §5.3:
    - `tempo`: Bom ×1,2; Perfeito ×1,4 + `pf`; com `s.bf`, só o Perfeito liga `bf`.
    - `martelar`: `extra = n`; `g='perf'` exige `n = mx` e liga `pf`.
    - `segurar`: Bom ×1,3; Perfeito ×1,6 + `pf`. O estouro chega como `{ g:'', acc:-1 }` → `estouro = true`
      (por isso `clampCmd` aceita `acc = -1` só em `segurar`).
    - `seq`: nó **novo** (sem `hits`): `extra = n` a 50% de poder; perfeito (`n = seq.length`) → `fin` + `pf`.
      Nó **antigo** (com `hits`): `seqHits = max(hits, n)` e só o perfeito dá `fin` + `pf`.
    - `ritmo`: `turns = n` (buff) ou `healMult = 1 + 0,1·n`, ou `noteMult = 1 + 0,1·n` em `mental`; todas as notas → `pf`.
    - `mira`: `g≠''` → `crit = true`, `brk = 2`; Perfeito + `pf`.
    - `runa`: Bom ×1,2 / Perfeito ×1,4 + `pf` em dano. Em ritual (`s.circ`) que não causa dano: `turns = 1`,
      `healMult = 1,2`; o Perfeito soma `noSan = true`.
    - `choque`: não vale no ataque (devolve neutro).
  - `doAct` lê a nota de `m.cmd` (passando por `clampCmd`) antes do laço de golpes e passa o efeito para `strike` em `o.cx`.
- Regras de integração:
  - **Black Flash:** em `strike` (~462), `bf` passa a ser `o.cx?.bf === true`. Tirar a faixa do d100.
  - Estouro: `applySt(a,'exposed',1)` depois do golpe, com o dano normal.
  - Mira: `crit` força o crítico; `brk` chama `brkHit(t, 2, a)`. Com `t.weakPart` e sem `aim`, acertar a Mira vale como
    `aim = t.weakPart`.
  - `pf` aplica pelo mesmo caminho de `hitFx` uma vez, no último golpe.
  - `turns` soma +N ao tempo das condições boas que a técnica aplica (procurar como `st` define a duração em `fx1`).
  - `noSan` pula o `pay.san` do ritual.

- [ ] **Step 1: Testes que falham** (unidade em `RU.CMD` + integração com `H.act`)
  - `'cmd: clamp limita nota absurda'` (Review Focus 2): `clampCmd({cmd:'martelar',mx:4}, {g:'perf',n:999,acc:9}, {mx:1})`
    → `{ g:'perf', n:5, acc:1 }`; técnica sem `cmd` → neutro; `g:'x'` → `''`.
  - `'cmd: tempo Perfeito ×1,4 e pf; sem nota = normal'`: comparar o dano de `H.act` com `cmd` vazio, Bom e Perfeito
    (fixar `Math.random`). A razão fica entre 1,35 e 1,45.
  - `'cmd: Black Flash só no Perfeito'`: substitui o teste da linha 962. Com `Tempestade Negra`, 200 ações sem `cmd` →
    nenhum `BLACK FLASH`; 1 ação com `g:'perf'` → `BLACK FLASH` e devolve Aura.
  - `'cmd: martelar soma golpes extras'`: técnica `hits 2, mx 4`, `n:3` → 5 golpes no log.
  - `'cmd: seq antiga nunca fica abaixo dos hits'`: `Estilo Três Espadas`, `n:1` → 3 golpes; `n:3` → 3 golpes + golpe final.
  - `'cmd: segurar estourado sai normal e expõe'`.
  - `'cmd: mira acerta = crítico e −2 na Quebra'` (inimigo elite com `brk`).
  - `'cmd: ritual com runa Perfeita não cobra Sanidade'` (um ritual com `pay.san`; procurar um em `arvore/oculto.js`).
  - `'cmd: segundo act no mesmo turno é recusado'` (Review Focus 5): dois `H.act` seguidos; o segundo não muda nada.
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar `clampCmd`/`cmdEffect` puros e depois a integração.
- [ ] **Step 4:** `npm test` → passa; `node tools/sim.js 100` sem erro.
- [ ] **Step 5:** Commit `Comandos de ataque: nota do jogador vira dano, golpes e efeitos; Black Flash no Perfeito`.

---

### Task 7: Choque de poderes (servidor)

**Files:**
- Modify: `src/handlers.js` (handler `chq`; `ai`: oferecer Choque)
- Modify: `src/rules.js` (`chqResolve`)
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `S.battle.cmd` (Task 3), `aiPlan` (Task 2).
- Produces:
  - `S.battle.cmd.chq = { id: heroId, skill, at, w: 3000, meta, n: 0, last: at } | undefined`. Só é oferecido quando
    `tel && tgs.length === 1` e o alvo tem uma técnica `cmd:'choque'` usável (`!cantUse`). A oferta vai como
    `S.battle.cmd.chqOk = [heroId]`.
  - `chq(c, { id, skill, n })`: o primeiro envio (com `skill`) inicia o Choque. Paga a Aura da técnica, marca `chqT`
    (1 por rodada) e estende o `setTimeout` do golpe até `at + 3000 + grace`. Os envios seguintes somam `n`, limitado a
    `20 × (now - last)/1000` arredondado para cima.
  - `chqResolve(a, plan, cmd)`, chamado no lugar de `aiRun` quando há `chq`:
    `n ≥ meta` → anula o golpe; `strike(hero, choqueSkill, a, null, 0, { mult: 1.3 })` e `applySt(a,'exposed',1)`.
    Senão, `aiRun` com o golpe ×1,3 no herói (`o.mult`). Log `CHOQUE!` com `fx.chq = 1` e o resultado.
  - `meta` conforme as Global Constraints, menos `mods.chq`%.

- [ ] **Step 1: Testes que falham**
  - `'choque: só em golpe anunciado de alvo único e para quem tem a técnica'`.
  - `'choque: martelar acima da meta devolve o golpe e expõe o inimigo'`.
  - `'choque: abaixo da meta leva ×1,3'`.
  - `'choque: apertos acima de 20/s são cortados'`.
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` → passa.
- [ ] **Step 5:** Commit `Choque de poderes: cabo de guerra contra golpe anunciado`.

---

### Task 8: Overlay de defesa no navegador (`comandos.js`)

**Files:**
- Create: `public/js/comandos.js` (no lugar de `public/js/aparar.js`, que é apagado)
- Modify: `public/player.html` (troca o `<script>`); `public/painel.html`, se carregar `aparar.js`
- Test: `tools/ui-smoke.js`

**Interfaces:**
- Consumes: `S.battle.cmd` (Tasks 3, 4, 5, 7); mensagens `def`, `chq`.
- Comportamento:
  - Mostra o overlay só quando um herói do jogador está em `cmd.tgs`. Um anel por batida, em sequência, com as duas faixas
    desenhadas: esquiva clara (só se `tel`) e Aparar forte (largura `par` + mods). Os tempos vêm de `RU.CMD.DEF`.
  - Espaço, o botão ou um toque manda `{ t:'def', id }`. A partir de `cmd.at`, o relógio é local: no momento em que o
    estado chega, `t0 = performance.now() - (Date.now() - cmd.at)`.
  - Se `cmd.chqOk` inclui o herói: botão **CHOQUE (C)**. Ao apertar, manda `{t:'chq', id, skill}` e o anel vira a barra de
    cabo de guerra (a força do inimigo desenhada como meta). Espaço ou C somam; a cada 250 ms manda `{t:'chq', id, n}`.
  - Texto: `"<Inimigo> vai atacar!"`, depois `"Espaço no fim: aparar · um pouco antes: esquivar"` (com `tel`) ou
    `"Espaço no fim: aparar"`. Com `cmd.perf`, o anel fica vermelho e o texto leva `"PERFEITO!"`.
  - O overlay ignora teclas depois de gravar a nota da batida atual.
- [ ] **Step 1:** No `ui-smoke.js`, adicionar um bloco `defesa`: abrir uma batalha com herói e inimigo de técnica
  anunciada; `H.ai`; conferir que o overlay aparece **só** na tela do jogador alvo; apertar Espaço; conferir que ele some
  quando a janela fecha e que não houve erro de console.
- [ ] **Step 2:** `UI_ONLY=defesa npm run ui` → falha (o overlay novo não existe).
- [ ] **Step 3:** Implementar `comandos.js` seguindo o padrão de `aparar.js` (CSS injetado e `render` embrulhado).
- [ ] **Step 4:** `UI_ONLY=defesa npm run ui` → passa; `npm test` → passa.
- [ ] **Step 5:** Commit `Tela do jogador: anel de defesa com esquiva, batidas e Choque`.

---

### Task 9: Minigames de ataque no navegador (`cmd-ataque.js`)

**Files:**
- Create: `public/js/cmd-ataque.js`
- Modify: `public/rules.js` (`RU.CMD.runeScore`, `RU.CMD.RUNE_T` = modelos)
- Modify: `public/js/eventos.js:105` (gancho antes do `send({ t:'act', … })`)
- Modify: `public/player.html`, `src/handlers.js` (handler `cmdOn` só de repasse visual)
- Test: `tools/test.js` (runeScore), `tools/ui-smoke.js`

**Interfaces:**
- Produces:
  - `window.runCmd(skill, done)`: abre o minigame de `skill.cmd` e chama `done({ g, n, acc })` uma única vez. Sem `cmd`,
    chama `done(null)` na hora. Prazo de 6 s → `done({ g:'', n:0, acc:0 })`.
  - Em `eventos.js`, `send({ t:'act', … })` vira `runCmd(s0, cmd => send({ t:'act', …, cmd }))`. Também manda antes
    `{ t:'cmdOn', id }`, e o servidor marca `ch.cmdOn = Date.now()`. O `palco.js` mostra "⚡ se prepara…" sobre a ficha
    enquanto `Date.now() - ch.cmdOn < 6000`.
  - `RU.CMD.runeScore(points: [[x,y]...], rune) → 0..100`: reamostra em 32 pontos, normaliza a escala e o centro, testa
    rotações de −30° a +30° de 10 em 10, e devolve `100 × (1 − distânciaMédia / 0,5)` limitado a 0..100.
    Modelos em `RUNE_T` como listas de pontos no quadrado unitário: círculo, triângulo, raio (zigue-zague), espiral,
    estrela de 5 pontas e onda. Mais `mods.rn` (Traço Firme).
- Minigames (tempos e graus no spec §5.3):
  - `tempo`: anel de 900 ms; Bom/Perfeito por `cw`/`cp` (+mods).
  - `martelar`: 2 s; barra = apertos/`mt`; `n = floor(barra × mx)`; barra cheia → `'perf'`.
  - `segurar`: keydown inicia, keyup solta; a barra sobe em 1,6 s; faixa Perfeito de `cz`% abaixo do topo; passou do topo
    → `{ g:'', acc:-1 }`.
  - `seq`: mostra as setas da técnica; batida de 500 ms; aceita setas e WASD; tolerância ±120 ms + `rit`.
  - `ritmo`: `nt` notas numa pista em ~4 s; tolerância ±120 ms + `rit`.
  - `mira`: a mira oscila sobre o retrato do alvo por 2,5 s; o ponto fraco tem `ma`% do retrato e fica sobre `weakPart`
    quando houver (procurar no `palco.js` onde as partes do corpo são desenhadas); clique.
  - `runa`: área de desenho de 4 s; score ≥ 60 → Bom, ≥ 85 → Perfeito.
- [ ] **Step 1: Testes que falham**
  - `'runa: o próprio modelo pontua ≥ 95; uma linha reta pontua < 60 contra o círculo; o triângulo girado 20° pontua ≥ 85'`.
  - `ui-smoke` bloco `ataque`: herói com `Corte no Compasso` (ou um nó `cmd:'tempo'` criado no teste); clicar na técnica,
    apertar Espaço, conferir que o `act` chega com `cmd` e que o log tem o golpe. Repetir com o prazo estourado
    (não apertar) → golpe normal. Apertar Enter duas vezes → um `act` só (Review Focus 5).
- [ ] **Step 2:** `npm test` e `UI_ONLY=ataque npm run ui` → falham.
- [ ] **Step 3:** Implementar os 7 minigames num arquivo, com uma função por comando, e o `runeScore`.
- [ ] **Step 4:** Os dois passam.
- [ ] **Step 5:** Commit `Tela do jogador: minigames de ataque e reconhecedor de runa`.

---

### Task 10: Nós novos e marcação dos existentes (`arvore/leva4.js`)

**Files:**
- Create: `arvore/leva4.js`
- Modify: `tree.js:10, 754` (importar e aplicar)
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `export const LEVA4 = [{ el, after: 'Nome do último nó do ramo', nodes: [...] }, …]`. `tree.js` acha o ramo de `el`
    que contém `after` e põe `nodes` no **fim** desse ramo. Cada técnica nova recebe `pre: after`. Cada passiva recebe
    `pre` = a primeira técnica do mesmo `cmd` no mesmo grupo, ou `after` se não houver (spec §8).
  - `export const MARCA = { 'Nome do nó': { cmd, …campos } }`: aplicado sobre os nós existentes antes de `buildSkills`.
    `tree.js` lança erro se um nome não existir.
  - Regras automáticas aplicadas no mesmo passo: todo nó com `bf` → `cmd:'tempo'`; todo nó com `circ` → `cmd:'runa'` e
    `rn` = `['circulo','triangulo','estrela','espiral'][circ-1]`, a não ser que `MARCA` diga outra coisa.
  - `tel: 1` em Golpe Pesado, Estilhaço, Golpe Giratório, Terremoto, Mar de Chamas e Maré Alta.
- Conteúdo: os 45 nós das tabelas do spec §8 e a lista do spec §9, com os valores de lá. Os nomes de ramo ("Marcial · lâmina")
  viram o `after` do último nó real daquele ramo (`arvore/marcial.js`, `tree.js`, `arvore/aura.js`, `arvore/oculto.js` e os
  Vínculos em `arvore/vinculos.js`/`arvore/leva3.js`). "Marcial · Aparar" = depois de `Muralha de Aço`.
  - O símbolo da runa usa as chaves sem acento: `triangulo`, `circulo`.
  - A sintaxe é a de `ARVORE-SISTEMAS.md`, como `{ n, k, d, xp, a, p, c, req?, cmd, pf?, … }`. Os textos `d` são novos e
    curtos, no tom dos nós vizinhos.
- [ ] **Step 1: Testes que falham**
  - `'leva 4: 45 nós novos com cmd, ligados ao ramo do tema'`: contar os nós com `cmd` que não estão em `MARCA` nem nas
    regras automáticas = 45; cada um tem `pre` existente e `ln` com o nó de `pre`.
  - `'leva 4: todo bf é tempo, todo circ é runa com o símbolo do círculo, MARCA aplicada'`: `Cem Socos.cmd === 'martelar'`
    e `mx === 5`; `Estilo Três Espadas.seq === '↑↑↓'`; um ritual de `circ:3` tem `rn === 'estrela'`.
  - Ajustar o total do teste da grade (`TOTAL >= 1330`) para o novo número, se for preciso.
  - Os testes de grade, ligações e mandala que já existem continuam passando.
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Escrever `leva4.js` e a aplicação em `tree.js`.
- [ ] **Step 4:** `npm test` → passa; `node tools/revisao-uso.js` → 0 erros, 0 recusas, 0 nós sem efeito. Rodar de novo os
  testes das Tasks 3-6 que usavam nós criados no teste e trocar pelos nós reais (`Leitura de Combo`, `Golpe Pesado`).
- [ ] **Step 5:** Commit `Árvore: leva 4 com 45 nós de comandos e marcação dos nós existentes`.

---

### Task 11: Show, descrições e documentação

**Files:**
- Modify: `public/js/coreo.js` (`SFXC`, selos)
- Modify: `public/rules.js:193-214` (descrição dos campos novos na grade e na ficha)
- Modify: `ARVORE-SISTEMAS.md`, `DECISOES-SISTEMAS.md`, `README.md`
- Test: `tools/test.js`, `tools/ui-smoke.js`

**Interfaces:**
- Consumes: as flags de log `fx.par`, `fx.perf`, `fx.ctr`, `fx.chq`, `fx.bf` e a nota `g` (que o log do golpe passa como
  `fx.cg = 'bom'|'perf'`; acrescentar no `strike`).
- Produces:
  - Selo "PERFEITO!" grande com flash e som `perfect`; selo "BOM" pequeno; "CONTRA!" com corte; Black Flash com raios pretos
    e vermelhos e o som `cut`; Choque com tremor de 400 ms. Sons novos em `SFXC`, com WebAudio como os que já existem.
  - Com `prefers-reduced-motion`: sem tremor e flash de opacidade baixa.
  - Descrição na grade (`public/rules.js`): uma linha por comando, como já existe para `par`/`bf`. A Sequência mostra as
    setas. O ⚠ do `tel` aparece no nome do nó. A linha de `bf` passa a dizer "Black Flash no Perfeito do golpe no tempo
    (janela de X ms)", com X = `30 + 8 × bf`.
  - Docs: em `ARVORE-SISTEMAS.md`, seção "Comandos de ação" com os campos e as chaves de `mod`. Em `DECISOES-SISTEMAS.md`,
    "Leva 4 (questionário de 2026-11-17)" com as decisões do spec §11. Em `README.md`, um parágrafo na parte de batalha.
- [ ] **Step 1: Teste que falha** — `'descrição: nó com cmd mostra a linha do comando; bf mostra a janela em ms'`
  (chamar a função de descrição de `public/rules.js` que gera a linha de `par` hoje).
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar os selos, os sons, as descrições e os documentos.
- [ ] **Step 4:** `npm test`, `npm run ui` (tudo) e `node tools/sim.js 300` → passam, sem erro de console.
- [ ] **Step 5:** Commit `Comandos: show na mesa, descrições na grade e documentação`.

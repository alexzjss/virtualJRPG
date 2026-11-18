# Seletor de skills em batalha — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a grade de cartões do comando de batalha por uma lista com painel, agrupada, com atalhos, afinidade com o alvo e motivos de bloqueio.

**Architecture:**
- **Servidor:** ganha três dados.
  - `c.skPin`: skills fixadas.
  - `c.skUse`: contagem de uso de cada skill.
  - `S.lore`: fraquezas e resistências descobertas por acerto, registradas pelo tipo do inimigo. `scrub` em `net.js` passa a usar esse registro.
- **Cliente:** um módulo novo `public/js/cmd-skills.js`, script clássico com globais, no padrão de `cmd-ataque.js`. Ele monta a lista e o painel e trata ↑↓, o filtro e Shift+F. `command()` em `paginas.js` chama o módulo.

**Tech Stack:** Node (ESM), `node:test`, ws; navegador com JS puro e globais (`S`, `SK`, `blocked`, `blockWhy`, `desc`, `esc`, `send`, `render`).

**Spec:** `docs/superpowers/specs/2026-11-18-seletor-skills-design.md`

## Global Constraints

- Desktop apenas. O layout `@media(max-width:700px)` atual não pode regredir.
- Texto da interface em português, no tom das telas existentes.
- Ordem dos grupos: Atalhos, Arma · <nome da arma>, Dano, Mental, Cura, Formas, Utilidade.
- Atalhos: ★ fixadas (máx. 12 por herói) e depois até 3 mais usadas não fixadas com contagem > 0.
- Dentro do grupo, a ordem é por custo crescente e, no empate, pelo nome (`localeCompare` pt).
- Bloqueadas ficam no lugar, apagadas e selecionáveis. O Agir fica desabilitado com o motivo, como já acontece hoje.
- Afinidade: ▲ fraco, ▼ resiste, `?` desconhecida (só em skill de dano/mental com `power > 0`, alvo inimigo, `known < 2` e elemento fora dos `weak`/`resist` visíveis). Neutro ou sem dano não mostra marca.
- Teclas: ↑↓ percorrem as linhas, letras filtram (sem acento e sem diferenciar maiúsculas), Backspace apaga, Esc limpa o filtro primeiro e Shift+F fixa ou desfixa.
- O commit inclui só os arquivos desta tarefa. A árvore de trabalho tem mudanças alheias em `arvore/`, que não podem ser commitadas.

## Review Focus

1. **Skill desaprendida ou arma trocada com ★ salva:** os ids que não existem mais em `c.skills`/`wSk(c)` são ignorados na tela, sem erro. Teste na Task 1 (`skPin` recusa id que o herói não tem).
2. **Filtro sem resultado:** a lista mostra "Nada com “xyz”." e as setas não fazem nada. A ação selecionada não muda. Verificação na Task 4.
3. **Inimigo sem `tpl`** (criado à mão pelo mestre): `lore` usa `t.tpl || t.name`. Teste na Task 2.
4. **Inimigo atacando herói:** não grava `lore` nem `skUse`. Teste na Task 2 e na Task 1.
5. **Digitar no chat durante a batalha:** o filtro não captura teclas quando o foco está num `input`/`textarea`/`select`. Verificação na Task 4.

---

### Task 1: `skPin` e `skUse` no servidor

**Files:**
- Modify: `src/handlers.js` (handler novo `skPin`, perto de `pslot`)
- Modify: `src/rules.js:613-632` (`doAct`, dentro do `if (!m.release)`, logo depois de `a[s.res] -= s.cost`)
- Modify: `src/state.js:118` (`fixChar`)
- Test: `tools/test.js`

**Interfaces:**
- Produces:
  - `c.skPin: string[]` (ids de `c.skills` ou `w:<item>:<n>`, máx. 12)
  - `c.skUse: { [skillId]: number }`
  - mensagem `{ t: 'skPin', id: charId, sk: skillId, on: boolean }`

- [ ] **Step 1: Escrever os testes que falham**

```js
test('skPin: dono fixa e desfixa; recusa skill que não tem, outro jogador e o 13º', () => {
  reset(); const h = mk(ana, {}); h.skills = [sk('Golpe Pesado'), sk('Vigor')];
  H.skPin(ana, { id: h.id, sk: sk('Golpe Pesado'), on: true }); assert.deepEqual(h.skPin, [sk('Golpe Pesado')]);
  H.skPin(bia, { id: h.id, sk: sk('Vigor'), on: true }); assert.equal(h.skPin.length, 1);
  H.skPin(ana, { id: h.id, sk: 'g999999', on: true }); assert.equal(h.skPin.length, 1);
  H.skPin(ana, { id: h.id, sk: sk('Golpe Pesado'), on: false }); assert.deepEqual(h.skPin, []);
  h.skills = Object.keys(S.skills).slice(0, 14); h.skills.forEach(k => H.skPin(ana, { id: h.id, sk: k, on: true })); assert.equal(h.skPin.length, 12);
});
test('skUse: conta a skill do herói quando resolve; não conta ataque básico, recusa nem inimigo', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.attrs.AGI = 95; e.attrs.AGI = 1;
  h.skills = [sk('Golpe Pesado')]; h.aura = 20; H.battle(gm, { on: true });
  H.act(ana, { id: h.id, skill: sk('Golpe Pesado'), target: e.id }); assert.equal(h.skUse[sk('Golpe Pesado')], 1);
  S.battle.ticks[h.id] = -1; H.act(ana, { id: h.id, skill: 'atk', target: e.id }); assert.equal(Object.keys(h.skUse).length, 1);
  assert.equal(e.skUse, undefined);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="skPin|skUse" tools/test.js`
Expected: FAIL (`H.skPin is not a function` / `h.skUse` undefined)

- [ ] **Step 3: Implementar**
  - **`handlers.skPin(c, m)`:**
    - Usa `getCh`/`can`. Recusa inimigo.
    - Aceita `m.sk` se `ch.skills.includes(m.sk)` ou se for `w:<ch.equip.arma>:<n>` com `S.items[arma].sk[n]` existente.
    - `on` adiciona sem duplicar, até 12. `!on` remove.
  - **`doAct`:** `if (!a.enemy && !a.summon && m.skill !== 'atk') (a.skUse ??= {})[m.skill] = (a.skUse[m.skill] || 0) + 1;`
  - **`fixChar`:**
    - `arr('skPin', str)` cortado em 12.
    - `skUse` como objeto com valores inteiros ≥ 0; os outros são descartados.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test --test-name-pattern="skPin|skUse" tools/test.js`
Expected: PASS

- [ ] **Step 5: Rodar a suíte toda**

Run: `npm test`
Expected: tudo passa (sem regressões)

- [ ] **Step 6: Commit**

```bash
git add src/handlers.js src/rules.js src/state.js tools/test.js
git commit -m "Servidor: skills fixadas (skPin) e contagem de uso (skUse) por herói"
```

---

### Task 2: Fraquezas descobertas por acerto (`S.lore`)

**Files:**
- Modify: `src/rules.js:474-513` (`strike`: depois de calcular `w`/`rs`)
- Modify: `src/net.js:104-105` (`scrub`)
- Test: `tools/test.js`

**Interfaces:**
- Produces: `S.lore: { [tplOuNome]: { w: string[], r: string[] } }`. Inimigo visto pelo jogador:
  - `weak` = todos se `known ≥ 1`, senão `weak ∩ lore.w`;
  - `resist` = todos se `known ≥ 2`, senão `resist ∩ lore.r`.

- [ ] **Step 1: Escrever o teste que falha**

```js
test('lore: acerto em fraqueza/resistência revela só aquele elemento, para todo inimigo do mesmo tipo', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true, name: 'Golem' }), e2 = mk(gm, { enemy: true, name: 'Golem' });
  e.weak = e2.weak = ['fuhaku', 'indra']; e.resist = e2.resist = ['fis']; delete S.lore;
  assert.deepEqual(view(ana).chars[e2.id].weak, []);
  h.attrs.AGI = 95; e.attrs.AGI = 1; e2.attrs.AGI = 1; h.attrs.DES = 100; h.skills = [sk('Lâmina de Vento')]; h.aura = 50; H.battle(gm, { on: true });
  H.act(ana, { id: h.id, skill: sk('Lâmina de Vento'), target: e.id });
  assert.deepEqual(S.lore.Golem.w, ['fuhaku']);
  const v = view(ana).chars[e2.id]; assert.deepEqual(v.weak, ['fuhaku']); assert.deepEqual(v.resist, []);
  e2.known = 2; assert.deepEqual(view(ana).chars[e2.id].resist, ['fis']);
});
test('lore: golpe de inimigo em herói não grava nada', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.weak = ['fis']; e.attrs.AGI = 95; h.attrs.AGI = 1; delete S.lore;
  H.battle(gm, { on: true }); H.act(gm, { id: e.id, skill: 'atk', target: h.id }); assert.equal(Object.keys(S.lore || {}).length, 0);
});
```

(Se `Lâmina de Vento` puder errar, force o acerto como os testes vizinhos fazem, por exemplo com `Math.random` fixo ou atributo 100. Siga o padrão já usado em `tools/test.js`.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test --test-name-pattern="lore" tools/test.js`
Expected: FAIL (`S.lore` undefined)

- [ ] **Step 3: Implementar**
  - **Em `strike`:** se `!a.enemy && t.enemy && (w || rs)`, faz `const L = (S.lore ??= {})[t.tpl || t.name] ??= { w: [], r: [] }` e acrescenta `s.el` a `w` ou a `r`, sem repetir.
  - **Em `scrub`:** troca `weak`/`resist` pelas regras de Interfaces. `weakPart` continua exigindo `known ≥ 3`.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test --test-name-pattern="lore" tools/test.js`
Expected: PASS

- [ ] **Step 5: Rodar a suíte toda**

Run: `npm test`
Expected: tudo passa

- [ ] **Step 6: Commit**

```bash
git add src/rules.js src/net.js tools/test.js
git commit -m "Fraquezas e resistências descobertas no acerto valem para o tipo de inimigo"
```

---

### Task 3: Módulo `public/js/cmd-skills.js`

**Files:**
- Create: `public/js/cmd-skills.js`
- Modify: `public/player.html`, `public/gm.html`, `public/table.html` (script depois de `paginas.js` e antes de `eventos.js`)

**Interfaces:**
- Consumes (globais já existentes): `S`, `SK(id)`, `blocked(c,s,k)`, `blockWhy(c,s,k)`, `desc(s)`, `esc`, `RES`, `KIND`, `ELC`/`EL` (cores e nomes dos elementos), `wSk(c)`, `eq(c,'arma')`, `pick`, `send`, `render`.
- Produces (globais):
  - `skGroups(c, tgt, q) -> [{ k, label, items: [{ id, s, pin, used, off, why, aff }] }]`. `aff` ∈ `'w'|'r'|'?'|''`. Função pura, sem DOM.
  - `skPane(c, tgt) -> string`. HTML com `.skl` (lista) e `.skp` (painel). As linhas são `button.opt[data-a="pick"][data-k="sk"][data-v=id]`, como hoje, e as bloqueadas levam `aria-disabled="true"` (sem `disabled`).
  - `skKey(e, c) -> boolean` (`true` se tratou a tecla).
  - Estado do filtro em `skQ` (string).

- [ ] **Step 1: Implementar `skGroups`**

Aplica as regras de grupos, Atalhos, ordem e afinidade da seção Global Constraints.
- Os grupos vêm de `s.wpn ? 'wp' : s.kind`, com `mental`/`heal` mapeados para Mental e Cura.
- Atalhos: `c.skPin` filtrado pelo que existe em `sks ∪ wsks`, ordenado por custo; depois até 3 de `c.skUse`, por contagem decrescente.
- Com `q`, filtra cada grupo pelo nome normalizado (`normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()`).

- [ ] **Step 2: Implementar `skPane`**
  - **Linha:** grade `14px 8px 1fr auto auto`, com marca ★/↺, ponto na cor do elemento, nome, afinidade, `P n` e custo (`n AU`/`n SAN`/`Limite`). Bloqueada: `opacity:.42` e motivo curto no lugar do poder.
  - **Cabeçalho do grupo:** título e contagem.
  - **Painel (≈230px, `--e` = cor do elemento):** nome, tipo · elemento · afinidade em texto ("fraco"/"resiste"/"desconhecido"), `desc(s)`, grade Custo/Poder/Alcance/Usos, motivo do bloqueio e botão `data-a="skPinT"` (☆ Fixar · Shift+F / ★ Desfixar).
  - **Filtro ativo:** mostra uma linha "Filtro: q ✕" (`data-a="skQx"`). Sem resultado, mostra `<p class="none">Nada com “q”.</p>`.
  - **CSS:** injetado num `<style>` próprio, no tom `.p5` (fundo `--ink2`, seleção `--red`, fontes `--cond`/`--body`).

- [ ] **Step 3: Implementar `skKey(e, c)`**
  - Ignora quando o foco está em `input,textarea,select` e quando há Ctrl/Alt/Meta.
  - **↑↓:** percorre `.cmd .skl .opt`, incluindo `aria-disabled`, e clica na próxima.
  - **Shift+F:** `send({ t:'skPin', id:c.id, sk:pick.id, on:!pinned })`.
  - **Letra (`/^\p{L}$/u`) ou espaço com filtro ativo:** `skQ += key`. Backspace apaga um caractere e Esc com `skQ` limpa. Depois chama `render()` e devolve `true`.
  - **Resto:** devolve `false`.

- [ ] **Step 4: Incluir o script nas três páginas**

Adicionar `<script src="/js/cmd-skills.js"></script>` logo depois de `paginas.js`.

- [ ] **Step 5: Commit**

```bash
git add public/js/cmd-skills.js public/player.html public/gm.html public/table.html
git commit -m "Módulo do seletor de skills: grupos, atalhos, afinidade, painel e teclado"
```

---

### Task 4: Integrar em `command()` e no teclado

**Files:**
- Modify: `public/js/paginas.js:179-221` (`command`)
- Modify: `public/js/eventos.js:248-268` (keydown) e o clique `data-a` (`skPinT`, `skQx`)
- Modify: `public/style.css:437,553,867,894` (alturas de `.alist` e faixa de alvos)

**Interfaces:**
- Consumes: `skPane(c, tgt)`, `skKey(e, c)`, `skQ` (Task 3); mensagem `skPin` (Task 1).

- [ ] **Step 1: `command()`**
  - **Menu:** remover `['wp','Arma']`. `tab === 'wp'` vira `'sk'`, e `pick.k==='sk'` continua aceitando ids `w:` (já aceita). O contador de Skills passa a somar `sks + wsks`.
  - **Skills:** a lista vira `skPane(c, t)`.
  - **Atacar e Itens:** usar o mesmo visual de linha. Sem painel, ou com um painel simples com `desc`/`idesc`.
  - **Alvos (`.tgs`):** viram faixa fina acima da lista, num chip de uma linha com nome, barrinha e `%`/HP. O `.p5t` sobe para antes de `.alist`.
- [ ] **Step 2: Teclado (`eventos.js`)**
  - Antes do bloco de ↑↓ atual, se `!gm && S.battle.active && sub==='sk'`, `if (skKey(e, me)) { e.preventDefault(); return; }`.
  - O ↑↓ antigo fica para Atacar/Itens.
  - No Esc, limpar `skQ` antes de `aim`.
  - **Cliques:** `skPinT` envia `skPin` e `skQx` zera `skQ`.
- [ ] **Step 3: CSS**
  - Tirar o `max-height` de 232px/150px da lista de Skills. A lista ocupa o espaço até o rodapé `.cmd-go`, com rolagem só dentro de `.skl`, se faltar espaço. Calibrar na Mesa (`.pl.pg-mesa`) e na tela de batalha.
  - O `@media(max-width:700px)` fica intocado.
- [ ] **Step 4: Verificar no navegador** (`preview_start`, batalha com Mikhail, que tem 23 skills e a arma Rifle de Ferrolho)
  - Os grupos aparecem na ordem certa e cada grupo vem ordenado por custo.
  - Arma aparece como grupo e não há entrada "Arma" no menu.
  - Com Aura 9, Wakaze, Canhão de Aura e o Gélido aparecem apagadas com o motivo, e o Agir fica desabilitado nelas.
  - ↑↓ passa pelas bloqueadas; "can" filtra para os dois Canhões; Esc limpa o filtro; um filtro sem resultado mostra a mensagem.
  - Shift+F fixa: a skill vai para Atalhos e continua fixada depois de recarregar a página.
  - Digitar no chat não filtra a lista.
  - Acertar uma fraqueza faz aparecer ▲ no próximo inimigo do mesmo tipo.
  - Página Mesa e janela de 1280×720 sem rolagem horizontal; layout de ≤700px igual ao de antes.
  - Console sem erros.
- [ ] **Step 5: `npm test` e `npm run ui`** (o smoke de UI existente)

Expected: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add public/js/paginas.js public/js/eventos.js public/style.css
git commit -m "Comando de batalha usa o novo seletor de skills; Arma vira grupo e alvos viram faixa"
```

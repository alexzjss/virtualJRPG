# Árvore em mandala de esferas: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o mapa SVG em grade da árvore por uma mandala de esferas em Canvas, com ligações explícitas entre nós decidindo o que dá para aprender.

**Architecture:** `buildSkills` (content.js) passa a gravar em cada nó `ln` (ids ligados, simétrico) e `wx, wy` (posição na mandala, derivada da grade por uma deformação polar). `RULES.linked` substitui `near` na regra de aprender, no segredo e na rota. Um script novo `public/js/mandala.js` (global `MANDALA`, como `RULES`) desenha o mapa em Canvas 2D com câmera própria; `skillPage` passa a ter mapa em tela cheia e gaveta com abas.

**Tech Stack:** Node (ESM no servidor), scripts clássicos no navegador com globais compartilhados, Canvas 2D, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-17-arvore-mandala-design.md`

## Global Constraints

- Nenhuma dependência nova; nada de imagens externas.
- Skills já aprendidas são preservadas pelo nome (migração existente em `src/state.js:29-40`); nada nesta mudança pode tirar skill de personagem.
- Toda linha desenhada é uma ligação `RULES.linked` verdadeira, e toda ligação entre nós visíveis é desenhada.
- Ligações nunca unem dois setores diferentes, a não ser com o Marcial (`el === 'fis'`).
- Mestre: nenhuma ferramenta nova além do campo "Liga a" no editor.
- Textos da interface em português, no tom dos existentes.
- Rodar a suíte com `npm test` (= `node --test tools/test.js tools/test-rede.js`).

## Review Focus

1. Save antigo carregado depois da troca: personagens mantêm todas as skills e nenhuma vira "inalcançável" de forma que trave o progresso (o jogador sempre tem pelo menos um nó aprendível se tiver XP). → teste na Task 3.
2. Skill criada à mão pelo mestre (sem `ln`) encostada na grade: continua aprendível a partir do vizinho de grade e aparece desenhada. → testes nas Tasks 3 e 5.
3. Jogador com nós secretos: a silhueta chega com `ln`, `wx`, `wy`, e o mapa desenha a forma sem vazar nome. → teste na Task 3.
4. `render()` disparado a cada mensagem do servidor durante o arrasto/zoom: a câmera não pode pular nem resetar. → verificação manual na Task 6.
5. Importar pacote de conteúdo com uma skill de mesmo nome de uma oficial: `ln`, `wx`, `wy` da oficial continuam. → teste na Task 3.

---

### Task 1: Ligações explícitas (`ln`) no `buildSkills`

**Files:**
- Modify: `content.js:46-99` (`buildSkills`, `chain`, `forked`, núcleo Marcial, treinos)
- Test: `tools/test.js`

**Interfaces:**
- Produces: todo nó de `buildSkills(sk)` tem `ln: string[]` com ids (`'g' + n`) dos nós ligados. Simétrico. Nó isolado não existe.

- [ ] **Step 1: Testes que falham** (em `tools/test.js`, perto do teste "grade: sem sobreposição")

```js
test('ligações: simétricas, nunca entre setores diferentes (só com o Marcial), sem repetição', () => {
  for (const [id, s] of Object.entries(S.skills)) {
    assert.ok(Array.isArray(s.ln) && s.ln.length, 'sem ligação: ' + s.name);
    assert.equal(new Set(s.ln).size, s.ln.length, s.name);
    for (const j of s.ln) { const o = S.skills[j]; assert.ok(o.ln.includes(id), `${s.name} → ${o.name} não volta`);
      assert.ok(o.el === s.el || o.el === 'fis' || s.el === 'fis', `${s.name} liga a ${o.name}`); }
  }
});
test('ligações: cada setor alcança todos os seus nós andando só por ln, por ele e pelo Marcial', () => {
  // mesma estrutura do teste de grade, trocando a vizinhança de casa por s.ln
});
test('ligações: ramo de 10 nós segue tronco 1-4, A 5-7, B 8-9 e final', () => {
  const br = Object.entries(S.skills).filter(([, s]) => s.br === 'kagutsuchi-0'); // ordem de criação = ordem do ramo
  const id = i => br[i][0], L = i => br[i][1].ln;
  assert.ok(L(1).includes(id(0)) && L(2).includes(id(1)) && L(3).includes(id(2)));
  assert.ok(L(4).includes(id(3)) && L(7).includes(id(3)));   // A e B saem do nó 4
  assert.ok(L(5).includes(id(4)) && L(6).includes(id(5)) && L(8).includes(id(7)));
  assert.ok(L(9).includes(id(6)));                            // ramo 0: final na ponta de A (capB = false)
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test --test-name-pattern="ligações" tools/test.js` → FAIL (`s.ln` indefinido).

- [ ] **Step 3: Implementar**
  - `put(x, y, s, parent)` ganha o id do pai e grava a ligação nos dois nós. Mantenha um `idAt = new Map()` de `"x,y" → id`.
  - Em `chain`, o pai é a casa de onde o candidato escolhido saiu: `prev` quando existe; senão a casa usada (âncora ou fallback) vizinha ao candidato escolhido — escolha a mais próxima entre as que o geraram.
  - Núcleo: os 8 nós do anel ligam a `g0`. Treinos: ligam à casa `fis` vizinha que os permitiu (a primeira encontrada por `around`).
  - Raiz de cada setor: a âncora `fis` real usada pelo `chain` já resolve (é um nó Marcial).
  - Nada muda em `gx, gy`.

- [ ] **Step 4: Rodar** — `npm test` → todos passam (inclusive o teste de grade antigo).

- [ ] **Step 5: Commit** — `git add content.js tools/test.js && git commit -m "Árvore: ligações explícitas entre nós (ln) no buildSkills"`

---

### Task 2: Posições da mandala (`wx, wy`)

**Files:**
- Modify: `content.js` (fim de `buildSkills`)
- Test: `tools/test.js`

**Interfaces:**
- Consumes: `gx, gy, el` de cada nó; `ORDER` e `C = 55` de `content.js`.
- Produces: todo nó tem `wx, wy` (números, unidades de mundo; esfera tem raio 16). Exporta `MANDALA_U = 48` (unidades por casa).

Deformação (a fórmula exata é ajustável; o teste de distância é o critério):

```
θ = atan2(gy − C, gx − C), ρ = hypot(gx − C, gy − C)
Marcial:  θ' = θ
Setor i:  eixo = i·360/11 (o mesmo do `chain`); θ' = eixo + (θ − eixo)·0.8   // abre vão entre pétalas
wx = cos θ' · ρ · U,  wy = sin θ' · ρ · U   (arredondar a 1 casa decimal)
```

- [ ] **Step 1: Testes que falham**

```js
test('mandala: todo nó tem posição e nenhum par de esferas se sobrepõe', () => {
  const ns = Object.values(S.skills); assert.ok(ns.every(s => Number.isFinite(s.wx) && Number.isFinite(s.wy)));
  // grade espacial com células de 34 unidades para não ser O(n²)
  // para cada par na mesma célula ou vizinha: assert.ok(Math.hypot(a.wx-b.wx, a.wy-b.wy) >= 30, a.name + ' × ' + b.name)
});
test('mandala: os setores ficam na ordem da roda (ângulo médio crescente)', () => {
  // ângulo médio (atan2 da soma de vetores) de cada el de ORDER, normalizado ao eixo do primeiro: estritamente crescente
});
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** a deformação acima depois do último ramo; exportar `MANDALA_U`.
- [ ] **Step 4: Rodar** `npm test` → passa. Se a distância mínima falhar, reduza a compressão (0.8 → 0.85) antes de mexer em outra coisa.
- [ ] **Step 5: Commit** — `git commit -m "Árvore: posições da mandala (wx, wy) derivadas da grade"`

---

### Task 3: Regras usam ligações (aprender, segredo, importação)

**Files:**
- Modify: `public/rules.js:87` (exportar `linked` junto de `near`), `public/rules.js` `whyNot` (linha "Precisa de um nó vizinho")
- Modify: `src/net.js:118-137` (`reachable`, `silhouette`)
- Modify: `src/campaign.js:94` (import preserva `ln`, `wx`, `wy`, além de `gx`, `gy`)
- Test: `tools/test.js`

**Interfaces:**
- Produces: `RULES.linked(a, b, ida, idb) → boolean`: `true` se `a.ln?.includes(idb) || b.ln?.includes(ida)`; e, se `!a.ln || !b.ln`, também `true` quando `RULES.near(a, b)`. Os ids são necessários porque `ln` guarda ids; quem chama tem os ids.
- `whyNot` passa a precisar dos ids dos nós aprendidos: troque `own.some(o => near(o, s))` por uma checagem sobre `ch.skills` (ids) com `linked(sk[k], s, k, id)`. Quando `id` é `null` (chamada "soft" do mapa), o mapa passa o id — confira as chamadas em `paginas.js` (`whyF(s, id, soft)`) e em `src/`.

- [ ] **Step 1: Testes que falham**

```js
test('regras: vizinho de grade sem ligação não basta; ligação basta', () => {
  // ache dois nós do mesmo setor com near() verdadeiro e sem ln entre eles (existe: ramos vizinhos);
  // personagem com o Vínculo, XP 999, só o primeiro aprendido → whyNot(segundo) === 'Precisa de um nó vizinho já aprendido.'
  // aprenda um nó de s2.ln → whyNot(segundo) === ''
});
test('regras: skill do mestre sem ln encostada na grade continua aprendível', () => {
  // crie via H.edNew/edSet uma skill fis com gx/gy vizinhos de g0; personagem com g0 → whyNot === ''
});
test('segredo: silhueta leva ln, wx, wy e esconde nome', () => {
  // jogador com um herói só com a raiz Marcial; defs recebidas: nó distante tem name '???', ln igual ao original, wx/wy iguais
});
test('segredo: vizinho de grade sem ligação continua escondido', () => { /* reachable falso para o caso do 1º teste */ });
test('save antigo: skills mantidas e há sempre algo aprendível', () => {
  // herói com 6 skills de ramos diferentes do mesmo setor, xp 999: depois de rodar a migração, ch.skills igual,
  // e existe ao menos um nó com whyNot === ''
});
test('importar pacote com skill de mesmo nome mantém ln e posição', () => { /* importPack com { name: <oficial>, power: 99 } */ });
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** `linked`; `whyNot`; `reachable` (troque `RUL.near(o, s)` por `RUL.linked(o, s, k, id)` — mude a assinatura para `reachable(ch, s, id)` e ajuste a chamada em `hiddenSkills`); `silhouette` inclui `ln, wx, wy`; `importPack` copia `ln, wx, wy` da existente.
- [ ] **Step 4: Rodar** `npm test` → passa. Ajuste testes antigos que montavam vizinhança por grade (`tools/test.js:261-272`) para usar `ln`.
- [ ] **Step 5: Commit** — `git commit -m "Regras da árvore usam ligações explícitas (aprender, segredo, importação)"`

---

### Task 4: Campo "Liga a" no editor do mestre

**Files:**
- Modify: `src/consts.js:33` (`SCH.skills.lk: 't'`), `src/campaign.js:132-135` (`edSet`)
- Modify: `public/js/nucleo.js:31` (coluna `['Liga a', 'lk']` no editor de skills)
- Test: `tools/test.js`

**Interfaces:**
- `lk`: texto com nomes separados por `|`. Ao gravar `lk`, o servidor resolve os nomes para ids e regrava `ln` do nó **e** dos alvos (tira o nó dos `ln` antigos que saíram, põe nos novos). Nome que não existe é ignorado. `lk` vazio → `delete o.ln` (volta à vizinhança de grade) e remove o nó dos `ln` dos antigos alvos.
- Nós oficiais exibem `lk` vazio; editar o `lk` de um oficial substitui as ligações dele (é o mestre quem manda).

- [ ] **Step 1: Teste** — `edSet` com `lk: 'Golpe Pesado|Inexistente'` numa skill nova → `ln` tem só o id de Golpe Pesado e Golpe Pesado.ln contém o novo id; depois `lk: ''` → sem `ln` e Golpe Pesado não aponta mais para ela.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** o caso `m.f === 'lk'` em `edSet`, depois do `coerce`.
- [ ] **Step 4: Rodar** `npm test` → passa.
- [ ] **Step 5: Commit** — `git commit -m "Editor: campo 'Liga a' para ligar skills do mestre na árvore"`

---

### Task 5: Renderizador `public/js/mandala.js`

**Files:**
- Create: `public/js/mandala.js` (script clássico; define `globalThis.MANDALA`)
- Modify: `public/player.html`, `public/gm.html`, `public/table.html` (carregar `/js/mandala.js` antes de `/js/paginas.js`)
- Test: `tools/test.js` (importa `../public/js/mandala.js` como faz com `rules.js`, só as funções puras)

**Interfaces:**
- Produces (puras, testáveis em Node):
  - `MANDALA.place(skills) → Map<id, [x, y]>` — `wx, wy` quando existem; skill sem posição vai para perto do primeiro vizinho de grade com posição (+20, +20 por colisão) ou, sem vizinho, para um anel externo do seu setor.
  - `MANDALA.edges(skills, visible) → [ida, idb][]` — cada par uma vez, só entre ids visíveis, usando `RULES.linked` (inclui vizinhança de grade para nós sem `ln`).
  - `MANDALA.LOD = 0.32` — abaixo disso (zoom em px por unidade de mundo × 16) o mapa mostra só selos.
- Produces (navegador):
  - `MANDALA.mount(host: HTMLElement, opts)` — reaproveita o mesmo `<canvas>` entre renderizações (guarda em variável do módulo e reencaixa em `host`); `opts = { skills, state(id) → 'own'|'av'|'lock'|'out'|'secret', marks(id) → { sel, plan, hit, poor, rq, gate }, onPick(id), onHover(id, x, y) }`.
  - `MANDALA.focus(id | 'mine' | 'core' | 'all')`, `MANDALA.zoom(f)`, `MANDALA.learned(id)` (dispara a animação de acender).
  - Câmera `{ x, y, z }` vive no módulo e sobrevive a `mount` repetido.
- Desenho, do mockup (`.claude/mockups/arvore/index.html`, visão A), com as regras do spec §3: fundo com gradiente e estrelas, halo + kanji por setor no centróide, anéis guia, trilhas quadráticas (cor cheia + partícula se as duas pontas aprendidas), portão no meio da trilha que chega a nó com `rq` não cumprido, `aw` ausente ou `ex` trancado, esferas por estado, névoa nos secretos, ícone do tipo (`⚔ ✚ ◆` e as marcas `変 儀 双 誓 召 禁 極`, `鎖` com requisito faltando), nome e XP abaixo, anel pulsante em `av`, minimapa 170×170 no canto (clique move a câmera), rota tracejada animada do selecionado.
- Desempenho: desenha só o que cai na tela; `requestAnimationFrame` só roda com o canvas no documento e `!document.hidden`; sem nó `av`, rota ou animação ativa, cai para 10 fps.

- [ ] **Step 1: Testes que falham** — `place`: nó oficial usa `wx, wy`; skill sem posição com vizinho de grade fica a < 60 unidades dele; `edges`: nenhum par repetido, nenhum par com id fora de `visible`, contém `[g0, g1]` ou `[g1, g0]`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** `place`, `edges`, `LOD`; depois o desenho e a câmera (`mount`, `focus`, `zoom`, `learned`, arrasto, roda com zoom no cursor, pinça, hover, clique).
- [ ] **Step 4: Rodar** `npm test` → passa.
- [ ] **Step 5: Commit** — `git commit -m "Mandala: renderizador em canvas da árvore de habilidades"`

---

### Task 6: Página de habilidades em tela cheia com gaveta

**Files:**
- Modify: `public/js/paginas.js:4-80` (`near`, `skPath`, `skillPage`; tira `gv`, `lab2`, linhas/nós/halos SVG)
- Modify: `public/js/eventos.js:85-88,123,178-213` (tira `gv`, `applyGv`, `zoomGv`, arrasto/pinça da `.skmap`; botões chamam `MANDALA.focus/zoom`; `[data-node]` nas listas chama também `MANDALA.focus(id)`)
- Modify: `public/js/tela.js` (depois de montar o HTML, `MANDALA.mount` no `.skmap` quando a página de skills estiver aberta; modal `gridFull` também)
- Modify: `public/style.css:274-332` (`.skp` tela cheia, gaveta `.skside` com abas, recolhível)
- Modify: `ARVORE-SISTEMAS.md` (seção nova "Ligações e mandala": `ln`, `wx/wy`, `lk`, regra `linked`)

**Interfaces:**
- Consumes: `MANDALA.mount/focus/zoom/learned` (Task 5), `RULES.linked` (Task 3).
- `skPath` anda por `ln` (via `RULES.linked` para nós sem `ln`), mesma assinatura.
- Abas da gaveta: Nó · Plano · Procurar · Alcance · Passivas · Aprendidas; aba ativa fica em `localStorage` (`vj.skTab`) com try/catch como `lsGet`. Selecionar um nó no mapa abre a aba Nó.
- Tooltip: `onHover` mostra um `<div class="sktip">` posicionado no cursor com a carta resumida (o mesmo conteúdo do topo da aba Nó: setor, tipo, nome, XP, estado; "???" para secreto).
- Ao receber do servidor que o personagem aprendeu um nó (diferença em `c.skills` entre renders), chamar `MANDALA.learned(id)`.

- [ ] **Step 1: Implementar** a página e os eventos; manter os botões Minha árvore, Marcial, Ver tudo, Só o que posso aprender, `+ −`.
- [ ] **Step 2: Rodar** `npm test` → passa.
- [ ] **Step 3: Verificar no navegador** — `preview_start` com `dev`; como jogador e como mestre:
  - afastado mostra 12 selos; clicar num selo leva ao setor;
  - perto: estados certos para um herói com Vínculo Kagutsuchi; rota tracejada até um nó escolhido; portão antes de nó com `rq`; névoa em secretos (jogador);
  - aprender um nó: esfera acende sem a câmera pular;
  - arrastar e dar zoom enquanto outro cliente manda mudanças: a câmera não reseta (Review Focus 4);
  - modal "Habilidades" do mestre e página de inimigo funcionam;
  - console sem erros.
- [ ] **Step 4: Commit** — `git commit -m "Habilidades: mandala em tela cheia com gaveta em abas"`

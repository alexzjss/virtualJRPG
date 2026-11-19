# Cenários novos e horário do dia: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** criar 7 cenários 3D novos e dar a todos os 10 cenários os horários dia, tarde e noite, escolhidos pelo mestre.

**Architecture:** o horário entra no id do fundo (`tema-hora`). Todo o markup que `terreno3d.js` gera passa por `grade(hex, hora)` antes de ir para o DOM. O céu tem degradê próprio para cada horário. Uma função pura `construir(tema, Q, hora)` devolve o HTML sem tocar no DOM, e assim os testes rodam no Node. Os personagens são tingidos por CSS conforme o `data-biome` do palco.

**Tech Stack:** JS puro no navegador (IIFE em `globalThis`), CSS 3D, SVG em data URL, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-19-cenarios-novos-horario-design.md`

## Global Constraints

- Temas: `floresta, castelo, praia, neve, deserto, caverna, ruinas, pantano, vulcao, campo`. Horários: `dia, tarde, noite`.
- Sem clip-path e sem máscara em elementos 3D. Animações só em poucas camadas (nuvens, partículas, água).
- Não editar `public/js/palco3d.js` nem `tools/test.js`, que estão com outra sessão. Sem stash, e cada commit leva só os arquivos desta tarefa.
- Semente fixa por tema: todos veem o mesmo cenário.
- O que é luminoso (lava, cristal, brasa) usa a cor marcada `!` e escapa da gradação.

## Review Focus

- Campanha salva com `floresta-dia` ou com um id antigo (`floresta-noite` do catálogo 2D, `praia-por-do-sol`) precisa abrir sem erro. A migração mantém ids válidos e põe `-dia` nos demais.
- O mestre clica em "Noite" com o fundo "Mapa da cena": nada quebra, e a próxima miniatura clicada já vem como noite.
- Noite com qualidade low: o cenário continua legível, ou seja, a gradação nunca escurece abaixo do piso de luminância.
- Uma cor em `rgba()`, com 8 dígitos ou nomeada (`#0000`, `#fff`) dentro do markup precisa sobreviver à gradação. Ela grada a parte RGB e mantém o alfa.
- Trocar só o horário precisa remontar o cenário. A chave de `scene()` em `palco3d.js` já inclui `sc.bbg`, então isso funciona sem tocar nele.

---

### Task 1: gradação e horário no terreno

**Files:**
- Modify: `public/js/terreno3d.js`
- Create: `tools/test-terreno.js`
- Modify: `package.json` (incluir `tools/test-terreno.js` em `test`)

**Interfaces:**
- Produces: `TERRENO3D.TEMAS` (array dos 10), `TERRENO3D.HORAS` (`['dia','tarde','noite']`), `TERRENO3D.horaDe(id) -> 'dia'|'tarde'|'noite'` (sufixo válido ou `'dia'`), `TERRENO3D.grade(hex, hora) -> hex` (mesmo formato de entrada, com 3, 4, 6 ou 8 dígitos), `TERRENO3D.gradeAll(str, hora) -> str` (troca todo `#hex` não precedido de `!`; o `!#hex` perde o `!` e fica como está), `TERRENO3D.construir(tema, Q, hora) -> { html, gnd, faces: {face: url}, groups: [{c, r}], n }`, onde `n` é o total de elementos `.tf/.tb/.tc` e o `html` já vem gradado. `montar(parent, tema, q, hora?)` passa a usar `construir`. Sem `hora`, lê `parent.closest('[data-biome]')?.dataset.biome`.

- [ ] Teste `grade`: `grade('#ffffff','dia') === '#ffffff'`; luminância de `grade(c,'noite')` está entre 0,12 e 0,55 da original para `#5fbd3c` e `#3994f4`; em `grade('#3994f4','tarde')` o canal R sobe e o B desce; `grade('#0000','noite')` termina com alfa `0`; `gradeAll('a #fff !#ff3000 b','noite')` contém `#ff3000` sem `!` e não contém `#fff `.
- [ ] Teste `horaDe`: `'vulcao-noite'→'noite'`, `'praia-por-do-sol'→'dia'`, `''→'dia'`.
- [ ] Teste `construir`: para cada um dos 3 temas atuais × `Q∈{0,1,2}` × 3 horários, não lança erro, `n > 0` e `faces` tem `env-back`.
- [ ] Rodar `node --test tools/test-terreno.js`: deve falhar (funções ausentes).
- [ ] Implementar. A gradação vai em HSL: na tarde, misturar 22% de `#ff9a4a` nas luzes, puxar as sombras para o magenta e saturar 1,1×; na noite, luminância × 0,42 + 0,04, misturar 35% de `#2a3a8a` e saturação × 0,7. O céu (`skyDefs`, teto, sol) recebe uma paleta própria por horário: tarde `#3a2a7a→#c0508a→#ff9a5a→#ffd89a` com sol `#ffb060` de r=70; noite `#060a26→#121e4a→#24366e→#3a4a80` com lua `#eef2ff` e cerca de 40 estrelas pintadas no céu e no teto. O degradê do céu entra em `!` para escapar da gradação geral. O fundo `.cam` cobre as frestas: `TERRENO3D` grava `parent.style.setProperty('--frest', cor)`, e o CSS (Task 4) usa essa variável.
- [ ] Rodar os testes: devem passar. Commit "Terreno: gradação dia/tarde/noite e construir() puro".

### Task 2: ids, migração e seletor do mestre

**Files:**
- Modify: `src/consts.js:25` (BBG = TEMAS × HORAS, 30 ids)
- Modify: `src/state.js:68-72` (exportar `migrateBackdrop`; família conhecida e hora válida ficam; família conhecida com hora inválida vira `-dia`; desconhecida vira `floresta-dia`)
- Modify: `public/js/palco.js:32-33` (BBG com nomes "Vulcão · Noite"; BBGRP com um grupo por horário)
- Modify: `public/js/tela.js:52-55` (fileira Dia/Tarde/Noite com `data-a="bbhora"`; só as miniaturas do horário atual)
- Modify: handler de cliques do cliente onde vivem os `data-a` (procurar `'map'` em `public/js/eventos.js`): `bbhora` troca o sufixo do `sc.bbg` atual se ele for um tema; senão guarda em `localStorage` (`vj-bbhora`, com try/catch) para a próxima miniatura
- Modify: `public/js/terreno3d.js` `thumbs()` (30 classes `.bb-tema-hora`, céu e cores pela gradação)
- Test: `tools/test-terreno.js`

- [ ] Teste: `BBG.length === 30` e inclui `'vulcao-noite'`; `migrateBackdrop` aplicado a `{bbg:'praia-noite'}` mantém, `{bbg:'praia-por-do-sol'}` vira `'praia-dia'`, `{bbg:'cemiterio-luar'}` vira `'floresta-dia'`, `{bbg:'https://x/a.png'}` fica intacto.
- [ ] Rodar: falha. Implementar. Rodar `npm test`: passa (inclui os testes antigos). Commit.

### Task 3: cenários novos

**Files:**
- Modify: `public/js/terreno3d.js` (uma função por tema, no mesmo padrão de `floresta/castelo/praia`; ramos de `horizonte()` por tema; materiais novos em `M`; partículas novas em `ceuVivo`: `neve`, `poeira`, `brilho`, `bolha`, `brasa`, `petala`)
- Modify: `public/style.css` (keyframes das partículas novas, ao lado de `.tp-folha`)
- Test: `tools/test-terreno.js`

Composição de cada tema (elementos em 360°, centro `inArena` livre, peças grandes em `B.group`):
- `neve`: cordilheira branca e lilás no horizonte; pinheiros (recorte SVG de 3 andares com neve nas pontas); pedras com topo de neve; chão branco-azulado com trilha pisada; partícula `neve`.
- `deserto`: dunas em `ridge` douradas; oásis (lagoa pintada no chão, gradada como a água da praia) com coqueiros (`palmSvg`) de um lado; arcos e colunas de arenito (`box` + recortes); partícula `poeira`.
- `caverna`: as faces do skybox viram rocha escura com estalactites pintadas; teto escuro; pilares de rocha (`card`); cristais (recorte SVG em `!` ciano, magenta e violeta); poças; partícula `brilho`. O horário só muda o tom da boca de luz pintada em `env-back`.
- `ruinas`: colunas quebradas (`tube` de 8 lados e tambores caídos), arcos com hera (recorte), escadaria (`box` em degraus) ao fundo, grama alta (`tufts`); partícula `poeira`.
- `pantano`: chão verde-oliva com grandes poças escuras; árvores retorcidas (recorte) com copas caídas (`blob` escuros); vitórias-régias (`disc`); névoa baixa (2 planos `twa` com degradê); partícula `bolha`.
- `vulcao`: rocha preta e roxa; rios de lava no chão em `!`; cone do vulcão no horizonte com brilho `!`; rochas pontudas; partícula `brasa`.
- `campo`: colinas verde-claras; manchas de flores no chão; moinho (recorte) ao longe; cerca de madeira (`box` finos); árvores isoladas (`blob`); partícula `petala`.

- [ ] Teste: para os 10 temas × Q × hora, `construir` não lança erro; `n` em high é no máximo 1,25 × o `n` da floresta em high; em low, no máximo 0,7 × o high do mesmo tema; nenhum grupo tem `c` dentro de `inArena(x, z, -100)`.
- [ ] Rodar: falha (temas ausentes). Implementar um tema por vez, rodando o teste a cada um. Commit por par de temas.

### Task 4: personagens tingidos, frestas e verificação

**Files:**
- Modify: `public/style.css` (perto da linha 1692)

- [ ] CSS: `.p3d[data-biome$="-tarde"] .bb.unit img{filter:sepia(.25) saturate(1.15) hue-rotate(-12deg) brightness(.97)}` e `.p3d[data-biome$="-noite"] .bb.unit img{filter:brightness(.72) saturate(.75) hue-rotate(12deg)}`. Na noite, `.cur img` fica com brightness .9. As regras cobrem `.p3d:not([data-q=low]) .bb.unit:not(.cur) img`, combinando os filtros. `.p3d:not([data-biome=custom]) .cam{background:var(--frest,#2a7be8)}`. Na caverna, o tom dos personagens não muda.
- [ ] Verificar no navegador (`preview_start`): os 10 temas × 3 horários sem erro no console; capturas de vulcão-noite, campo-tarde e caverna-dia.
- [ ] Medir os quadros por segundo com o Playwright (`tools/ui-smoke.js` ou script no scratchpad) em high, com a câmera girando, na floresta-noite e nos 3 temas mais pesados: o alvo é ≥ 55.
- [ ] Commit. Atualizar a memória `cenarios-3d-anime.md`.

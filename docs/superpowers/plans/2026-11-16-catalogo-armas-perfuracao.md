# Catálogo de armas e perfuração — Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam caixas `- [ ]`.

**Objetivo:** Limpar o catálogo de armas (ficam só Florete e Perfuradora de Montanhas) e criar o efeito de perfuração (`pierce`) em armas e habilidades, com uma habilidade especial concedida pela Perfuradora equipada.

**Arquitetura:** Itens e habilidades ganham o campo `pierce` (0 a 1), que multiplica a armadura do alvo por `(1 − pierce)` em `server.js:244`. Itens ganham `reqFor` (FOR mínima para equipar) e `grant` (nome da habilidade concedida enquanto equipado). Uma versão de catálogo (`S.itemsV`) migra saves antigos.

**Stack:** Node (ESM), `server.js`, `content.js`, `tree.js`, `public/app.js`, testes em `tools/test.js`.

**Spec:** design aprovado na conversa de 2026-11-16 (sem arquivo separado). Resumo nas restrições abaixo.

## Restrições globais

- Florete: tipo `lamina`, power 12, preço 60, `pierce` 0.25, sem requisito. É a arma inicial de todos.
- Perfuradora de Montanhas: tipo `lanca`, power 24, preço 400, `pierce` 0.5, `reqFor` 70 para equipar. Fora de qualquer loja (o mestre entrega).
- Habilidade "Perfurar Montanha": `pierce` 1, `rq: { FOR: 85 }`, custo de aura alto (use 20), `req: 'lanca'`, `attr: 'FOR'`, power 36. Só aparece como usável com a Perfuradora equipada. Não entra na árvore de aprendizado nem no sorteio de habilidades de inimigos.
- As 12 armas comuns e as 9 elementais saem do catálogo. Os 4 tipos de arma (`WT`) e a forja continuam no sistema.
- `pierce` vale 0 por padrão (armas e habilidades antigas não mudam). Dano mental ignora armadura e não usa `pierce`.
- Textos de interface em português, como o resto do app.

## Foco da revisão

- Save antigo com armas antigas equipadas ou no inventário: tudo vira Florete, sem item órfão nem `equip.arma` apontando para chave inexistente.
- Personagem com FOR 69 tenta equipar a Perfuradora: nada acontece e o jogador vê o motivo.
- Perfuradora equipada e depois trocada ou descartada: "Perfurar Montanha" some da lista e não pode ser usada.
- `pierce` 1 contra alvo com armadura alta: o dano nunca fica abaixo de 1.
- Loja da cena "Beco do Mercado Negro" listava armas removidas: o estoque não pode ficar com nomes inexistentes.

---

### Tarefa 1: Campo `pierce` no cálculo de dano

**Arquivos:**
- Modificar: `server.js:52` (fábrica `it`), `server.js:51` (fábrica `sk`), `server.js:244` (dano), `server.js:522` (ataque básico)
- Teste: `tools/test.js`

**Interfaces:**
- Produz: `it(...)` e `sk(...)` passam a ter `pierce: 0`; a skill do ataque básico recebe `pierce: wp?.pierce || 0`.

- [ ] **Passo 1: teste que falha.** Em `tools/test.js`, `testa pierce`: dois combates idênticos contra alvo com `armor` 10; uma skill com `pierce: 0` e outra com `pierce: 1`. Asserte `danoPierce1 === danoPierce0 + 10` (com rolagem fixa, no estilo dos testes vizinhos), e que alvo com `armor` 99 e `pierce` 1 causa no mínimo 1.
- [ ] **Passo 2: rodar e ver falhar.** `node tools/test.js` → falha na asserção nova.
- [ ] **Passo 3: implementar.** Em `server.js:244` troque `t.armor + (eq(t,'armadura')?.power || 0)` por esse total multiplicado por `(1 - (s.pierce || 0))`, arredondado. Adicione `pierce: 0` às duas fábricas e `pierce: wp?.pierce || 0` ao objeto `s` básico de `server.js:522`. Teste adicional: ataque básico com arma `pierce` 0.5 ignora metade da armadura.
- [ ] **Passo 4: rodar e ver passar.** `node tools/test.js` → todos passam.
- [ ] **Passo 5: commit.** `git commit -m "feat: campo pierce ignora parte da armadura"`

### Tarefa 2: Requisito de FOR ao equipar e habilidade concedida pela arma

**Arquivos:**
- Modificar: `server.js:52` (campos `reqFor: 0`, `grant: ''`), `server.js:56` (esquema editável do mestre), `server.js:555-559` (`equip`), `server.js:494` e `server.js:523` (lista/uso de skills), `tree.js` ou `content.js` (`buildSkills`, nova skill concedida)
- Teste: `tools/test.js`

**Interfaces:**
- Consumes: `at0(ch, a)` (leitura do atributo, usada em `server.js:542`).
- Produz: `skillsOf(ch): string[]` em `server.js`, retorna `ch.skills` mais `eq(ch,'arma')?.grant` quando existir. O uso em batalha e a UI usam esta função.

- [ ] **Passo 1: testes que falham.** (a) Personagem FOR 69 com a Perfuradora no inventário: `H.equip` deixa `equip.arma` vazio; com FOR 70 equipa. (b) Com ela equipada e FOR 85, `H.act` com "Perfurar Montanha" funciona e gasta 20 de aura; com FOR 84 não funciona. (c) Ao desequipar, `skillsOf(ch)` não contém a skill e `H.act` com ela é recusado.
- [ ] **Passo 2: rodar e ver falhar.**
- [ ] **Passo 3: implementar.** `equip` recusa quando `i.reqFor` e `at0(ch,'FOR') < i.reqFor`. Defina a skill "Perfurar Montanha" com as restrições globais e a marca `grant: true` (nova propriedade em `sk`, padrão `false`) para: ficar fora da árvore de aprendizado, do pool de inimigos (`server.js:309`) e do aprendizado normal. `H.act` exige `skillsOf(a).includes(m.skill)` em vez de `a.skills.includes`, e checa `s.rq` ao usar. Troque `a.skills.filter` em `server.js:494` por `skillsOf(a).filter`.
- [ ] **Passo 4: rodar e ver passar.**
- [ ] **Passo 5: commit.** `git commit -m "feat: requisito de FOR ao equipar e habilidade concedida pela arma"`

### Tarefa 3: Novo catálogo de armas e migração de saves

**Arquivos:**
- Modificar: `content.js:67-72` (armas), `content.js:122` (estoque da loja), `server.js:77-79` (migração), `server.js:289-296` (arma inicial dos heróis)
- Teste: `tools/test.js:26` e `tools/test.js:50`

**Interfaces:**
- Consumes: campos `pierce`, `reqFor`, `grant` da Tarefa 1 e 2.
- Produz: itens `Florete` e `Perfuradora de Montanhas` em `S.items`; `S.itemsV = 2`.

- [ ] **Passo 1: testes que falham.** (a) `buildItems(it)` não contém nenhum item `arma` além de Florete e Perfuradora, e eles têm os valores das restrições globais. (b) Migração: estado com `equip.arma` = nome de arma antiga e `inv` com armas antigas, após carregar: `inv` tem `Florete` no lugar (somando quantidades) e `equip.arma` aponta para ele. (c) Heróis iniciais começam com Florete equipado. (d) Nenhum `shop.stock` de cena referencia item inexistente.
- [ ] **Passo 2: rodar e ver falhar.**
- [ ] **Passo 3: implementar.** Substitua `content.js:67-72` por duas chamadas `add` dos itens novos. Remova armas do estoque em `content.js:122`. Em `server.js:77`, se `S.itemsV !== 2`: reconstrua `S.items` preservando os itens não-arma já existentes, remapeie `inv`, `equip` e estoques de loja de armas removidas para o Florete (inventário) ou removendo do estoque, e grave `S.itemsV = 2`. Em `server.js:289-292` use `'Florete'` como arma inicial.
- [ ] **Passo 4: atualizar testes antigos.** `tools/test.js:26` usava `Revólver .38` e `tools/test.js:50` usava `Sabre Flamejante` para forja: reescreva usando itens existentes (forja: crie um item de teste elemental com `it(...)` dentro do teste, sem tocar o catálogo).
- [ ] **Passo 5: rodar tudo.** `node tools/test.js` → todos passam.
- [ ] **Passo 6: commit.** `git commit -m "feat: catálogo reduzido a Florete e Perfuradora, com migração de saves"`

### Tarefa 4: Interface (jogador e mestre)

**Arquivos:**
- Modificar: `public/app.js:11` (descrição do item), `public/app.js:32` (campos do editor de itens), `public/app.js` (editor de skills perto de `app.js:346` e `app.js:70`), `public/app.js:420` (rótulo do ataque)
- Modificar: `server.js:55-56` (esquema `items`/`skills` aceita `pierce` e `reqFor`)

**Interfaces:**
- Consumes: `skillsOf` só no servidor; o cliente recebe a lista de skills já resolvida, ou repete a regra `eq(c,'arma')?.grant` no mesmo estilo de `wtype` (`public/app.js:71`).

- [ ] **Passo 1:** Mostrar na descrição da arma "perfura X%" e "exige FOR N" quando existirem; mostrar `pierce` como tag "Perfuração" nas skills (junto de "Exige" em `app.js:346` e `app.js:70`).
- [ ] **Passo 2:** Editor do mestre: campos "Perfuração (0 a 1)" e "FOR mínima" para itens, "Perfuração" para skills, com os tipos numéricos já usados no esquema (`'n'`).
- [ ] **Passo 3:** No inventário, ao tentar equipar sem a FOR, mostrar "Exige FOR N" (mesmo estilo de `blockWhy`, `app.js:408`). Skill concedida aparece na lista de combate só com a arma equipada.
- [ ] **Passo 4: verificação manual.** `node server.js`, abrir como mestre e como jogador: equipar Florete; conceder a Perfuradora com FOR baixa (bloqueia) e alta (equipa, mostra "Perfurar Montanha"); atacar um inimigo com armadura e conferir o log.
- [ ] **Passo 5: commit.** `git commit -m "feat: interface de perfuração e requisito de FOR"`

---

## Autorrevisão

- Cobertura: Florete e Perfuradora (T3), `pierce` em armas e skills (T1), FOR para equipar e para a skill (T2), habilidade só com a arma equipada (T2), limpa completa e migração (T3), edição pelo mestre (T4).
- Nomes consistentes: `pierce`, `reqFor`, `grant`, `skillsOf`, `S.itemsV`.

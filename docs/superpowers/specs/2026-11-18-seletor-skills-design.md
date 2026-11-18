# Seletor de skills em batalha — design

Data: 2026-11-18 · Status: aguardando aprovação

## Por quê

Os heróis já passam de 20 skills ativas (Mikhail 23, Thomas 21, fora as técnicas da arma). O seletor atual (`command()` em `public/js/paginas.js`) mostra uma grade de cartões de 220px com altura máxima de 232px (150px na página Mesa). Por isso cabem uns 6 a 8 cartões, e o resto fica na rolagem. Hoje:
- é preciso rolar demais;
- é difícil achar a skill;
- falta informação para comparar uma skill com outra.

## Objetivos

- Ver muito mais skills de uma vez e achar a desejada rápido.
- Comparar poder e custo de relance.
- Saber se o alvo é fraco ou resiste ao elemento, quando o grupo já sabe disso.
- Entender por que uma skill não pode ser usada.

**Não-objetivos:** celular e tablet (o layout atual de ≤700px continua como está, sem regressão); a página de Habilidades/árvore; o menu do mestre (`.gcmd`).

**Anti-objetivos:** a lista "pular" quando a Aura muda; mostrar fraquezas que o grupo ainda não descobriu.

## Abordagens consideradas

1. **Módulo novo `public/js/cmd-skills.js` (escolhida).** A lista, o painel, o filtro e o teclado ficam num arquivo próprio, com o CSS dele, no padrão de `comandos.js` e `cmd-ataque.js`. `command()` apenas chama esse módulo.
2. Reescrever dentro de `command()`, com o CSS em `style.css` e o teclado em `eventos.js`. Foi descartada porque deixa a função ainda mais densa e espalha a lógica do seletor em três arquivos.

As duas mudam o servidor do mesmo jeito.

Formatos de tela comparados em prévia: (A) grade de chips, (B) lista + painel e (C) híbrido. **Escolhido: B.**

## A tela (desktop)

```
┌ menu ─────┐ ┌ alvos (faixa fina): [Golem 80%] [Lobo 100%] ←→ ───────────────┐
│ 1 Atacar  │ │ filtro: "can"▏                                                  │
│ 2 Skills ◀│ │ ATALHOS                         ┌ painel ─────────────────────┐ │
│ 3 Itens   │ │ ★ ● Wakaze          ▲ P31 10AU  │ Wakaze                      │ │
│ 4 Defender│ │ ★ ● Canhão de Aura  ? P34 13AU  │ Dano · Fuhaku · ▲ fraco     │ │
│ 5 Concent.│ │ ↺ ● Lâmina de Vento ▲ P12  4AU  │ Esfera de vento puro que…   │ │
│ …         │ │ ARMA · RIFLE DE FERROLHO        │ Custo 10 · Poder 31         │ │
└───────────┘ │   ● Tiro de Precisão  P24  6AU  │ Alcance único · 14× usada   │ │
              │ DANO                            │ (motivo do bloqueio)        │ │
              │   ● Selo de Fuhaku    P6   2AU  │ ☆ Fixar  (Shift+F)          │ │
              │   …                             └─────────────────────────────┘ │
              └─ Sua ação: Wakaze → Golem                          [Agir ⏎] ────┘
```

- **Menu:** a entrada "Arma" sai. Fica: Atacar, Skills, Itens, Defender, Concentrar, Coragem, (Ataque Total), Passar, com as teclas 1–9 renumeradas.
- **Lista de Skills:** uma linha por skill com marca (★ fixada / ↺ mais usada), ponto na cor do elemento, nome, afinidade com o alvo (▲ fraco, ▼ resiste, `?` desconhecida, nada se for neutro ou sem dano), poder (`P n`, vazio se for 0) e custo (`n AU`/`SAN`, ou "Limite").
- **Grupos, nesta ordem:** Atalhos, Arma · nome da arma, Dano, Mental, Cura, Formas, Utilidade. Grupos vazios não aparecem. Cada grupo mostra o título e a contagem.
- **Atalhos:** as ★ fixadas (sem limite) e depois até 3 das mais usadas que não estejam fixadas (ignora as de contagem 0). Uma skill que está em Atalhos não se repete no grupo dela.
- **Ordem dentro de cada grupo:** por custo crescente, com empate pelo nome. Dentro de Atalhos: fixadas por custo, depois as mais usadas por contagem.
- **Bloqueadas** (falta recurso, silenciado, fúria, exige arma ou item, `cant`): ficam no lugar, apagadas, com o motivo curto na linha e completo no painel (o texto atual de `blockWhy`). Podem ser selecionadas para ver o painel, mas Agir fica desabilitado com o motivo, como já acontece hoje.
- **Painel fixo:** nome, tipo · elemento · afinidade, descrição (`desc(x)` atual), grade com Custo / Poder / Alcance (Área ou Único) / Usos (vezes usada; e `uses` por batalha, se a skill tiver), o motivo do bloqueio e o botão ☆/★.
- **Alvos:** passam a ser uma faixa fina de chips (nome, % ou HP, barrinha) logo acima da lista. Mira e "Fraqueza passa a vez" continuam abaixo.
- **Altura:** a lista ocupa a altura disponível. O limite de 150px da Mesa sobe para algo próximo do espaço livre (o valor exato fica a cargo de quem implementa, testando na Mesa e na tela de batalha).
- **Atacar e Itens** continuam com a mesma lista, no novo visual de linhas (Itens: nome, ×quantidade).

## Teclado (desktop)

- **↑↓:** percorre as linhas visíveis, incluindo as bloqueadas, sem passar pelos títulos de grupo. Hoje o código pula os `:disabled`; isso muda.
- **Letras:** com Skills aberto e o foco fora de qualquer campo, digitar filtra pelo nome (sem acento e sem diferenciar maiúsculas). Backspace apaga e Esc limpa o filtro antes de fechar qualquer outra coisa. Com o filtro ativo, os grupos mostram só o que casa e Atalhos continua no topo.
- **Shift+F:** fixa ou desfixa a skill selecionada. (Decisão minha: F sozinho seria digitado no filtro.)
- **←→ / Tab, 1–9 e Enter:** como hoje.

## Servidor

- **`c.skPin`** (array de ids de skill, máx. 12): mensagem nova `skPin {id, sk, on}`, permitida ao dono do herói e ao mestre. Aceita ids de skills do herói e técnicas da arma (`w:<item>:<n>`).
- **`c.skUse`** (`{id: n}`): incrementado em `handlers.act` quando a skill de fato resolve (não quando o pedido é negado). Vale para jogadores; não conta para inimigos.
- **Descoberta por acerto:** quando uma skill de dano acerta com elemento `el` e o alvo é fraco (`w`) ou resiste (`rs`) em `rules.js:474`, grava `S.lore[t.tpl || t.name] = { w: [...], r: [...] }` com aquele elemento.
- **`scrub` em `net.js`:** para os jogadores, `weak` = todos se `known ≥ 1`, senão a interseção com `lore.w`; `resist` = todos se `known ≥ 2`, senão a interseção com `lore.r`.
  - A perícia Identificar e o gancho "arquivo" continuam como estão: revelam tudo, inclusive elementos ainda não testados e o ponto fraco.
  - O acerto revela só o elemento usado, mas vale para todo inimigo do mesmo tipo.
- **"Desconhecida" (`?`):** aparece em skill de dano cujo elemento não está nem em `weak` nem em `resist` visíveis, enquanto o alvo não tem `known ≥ 2`. Com `known ≥ 2`, o que não aparece é neutro e não mostra marca.
- **Mestre:** vê tudo, como hoje.

## Arquivos

- **Novo:** `public/js/cmd-skills.js`. Exporta algo como `skillPane(c, ctx)`, que devolve o HTML da lista e do painel, e cuida do próprio estado (filtro) e das teclas ↑↓, letras e Shift+F. Injeta o próprio `<style>`.
- `public/player.html` (e as outras páginas que montam `command`): incluir o script.
- `public/js/paginas.js`: `command()` sem a entrada Arma, com a faixa de alvos e delegando a lista ao módulo.
- `public/js/eventos.js`: as setas ↑↓ passam para o módulo (ou passam a respeitar as linhas bloqueadas).
- `src/handlers.js` (`skPin`, `skUse`), `src/rules.js` (`lore`), `src/net.js` (`scrub`), `src/state.js` (padrões e saneamento de `skPin`/`skUse`/`lore`).
- `tools/test.js`: testes de `skPin`, `skUse`, `lore` e `scrub`.

## Decisões minhas (confirme)

1. Shift+F para fixar, em vez de F.
2. Descoberta por acerto revela só o elemento testado. Identificar e "arquivo" continuam valendo mais, porque revelam tudo.
3. A ordem dos grupos (Atalhos, Arma, Dano, Mental, Cura, Formas, Utilidade) e o limite de 12 fixadas.
4. Celular fica como está hoje.

## Fica para quem implementa

A altura exata da lista em cada página, o texto curto dos motivos de bloqueio na linha, os detalhes do CSS dentro do tom Persona já usado (`.p5`) e a forma de expor o módulo para `command()`.

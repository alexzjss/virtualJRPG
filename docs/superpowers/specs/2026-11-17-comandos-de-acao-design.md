# Comandos de ação (Aparar, Esquiva e 8 comandos novos) — design

Data: 2026-11-17. Origem: questionário com o dono do projeto (27 respostas) sobre a mecânica de Aparar.
Inspirações citadas: Mario RPG (golpes no tempo), Dragon Ball Legends (carregar, choque, desaparecer), Clair Obscur: Expedition 33
(aparar/esquivar, golpes de várias batidas, mira livre), Okami (desenhar), jogos de ritmo.

## 1. Intenção

Hoje a luta é toda de menu, e o único momento em que a mão do jogador conta é o Aparar (um anel que fecha). A ideia é trazer
mais desses momentos de habilidade, no ataque e na defesa, sem deixar a luta lenta e sem punir quem não quer jogar o comando.
Cada tipo de arma e cada ramo ganha um jeito próprio de jogar.

**Metas**
- 10 mecânicas: Aparar (corrigido) e Esquiva na defesa; Golpe no tempo, Martelar, Segurar e soltar e Sequência no ataque;
  Choque de poderes, Ritmo do instrumento, Mira em ponto fraco e Desenhar runa como extras.
- Cerca de 45 nós novos espalhados por tema e a marcação de cerca de 130 nós que já existem.
- Tudo entra de uma vez, numa leva só (pedido do dono).

**Fora do escopo**
- Modo assistido (janelas maiores para quem tem dificuldade): o dono recusou.
- Comandos feitos pelo mestre ou por aliados: cada jogador faz só os comandos do próprio herói.
- Inimigos não jogam comandos de ataque. Têm só chance (ver §6).
- Partes do corpo que quebram e tiram técnicas.

**O que faria isso dar errado mesmo funcionando**
- A luta ficar lenta: janela em todo golpe, ou jogadores esperando o minigame dos outros.
- Quem ignora o comando sair perdendo. Ignorar sempre dá o resultado normal; o comando só soma bônus.
  As únicas exceções são o Aparar, que já é aposta, e o estouro do Segurar.
- O atraso da rede (celular, túnel) estragar comandos rápidos.

## 2. Abordagens consideradas

| | Abordagem | Troca |
|---|---|---|
| **A (escolhida)** | **Motor híbrido.** A defesa (Aparar, Esquiva, várias batidas, Choque) tem o tempo medido no servidor, como hoje, porque a janela segura a vez do inimigo. O ataque é medido no navegador, que manda só a nota; o servidor limita os valores e aplica. | Confia na nota que o jogador manda. Numa mesa de amigos isso não pesa, e o atraso da rede não atrapalha. |
| B | Tudo medido no servidor (cada tecla com horário). | À prova de trapaça, mas o atraso quebra o Martelar, a Sequência e o Ritmo. |
| C | Tudo medido no navegador. | A defesa precisa travar a vez do inimigo de qualquer jeito, então o ganho é pequeno. |

## 3. Estado atual (o que muda)

- `S.battle.parry = { foe, at, w: 1600, p: {} }` abre quando o mestre aperta IA e algum herói tem nó `par` com Aura
  (`src/handlers.js` `ai`/`parry`). O golpe sai quando a janela fecha (`aiAct` depois de `PARRY_W + 200`).
- **Todo** herói do jogador com nó de Aparar vê o anel (`public/js/aparar.js` `mine()`), porque o alvo só é escolhido
  depois, dentro de `aiAct`. Quem não era o alvo paga a Aura à toa. Isso é corrigido em §4.1.
- Aparada certa: anula o golpe, devolve `p` de Aura, dá +10 de Limite e tira um ponto da Quebra. **Não** deixa o inimigo
  Exposto, então os revides (`vs exposed`) não ganham com ela. Isso é corrigido.
- Black Flash: `bf: N` = faixa 01..N no d100, ×2,5 e devolve 25% da Aura máxima (`src/rules.js` ~462).
- Mira em parte do corpo já existe: `aim` no `act` e `t.weakPart` do chefe dobram o dano.

## 4. Defesa

### 4.1 Base: janela de defesa (servidor)
- `S.battle.parry` vira `S.battle.cmd = { foe, at, kind: 'def', beats: [ms...], tg: [ids], p: {id: [notas]} , perf? }`.
- **O alvo é escolhido antes de abrir a janela.** `aiAct` se divide em `aiPlan(a)` (escolhe a técnica e o alvo, sem
  executar) e `aiRun(a, plan)`. Assim a janela aparece **só para o(s) herói(s) alvo** (golpe em área: todos os alvos).
- **Quando abre:**
  1. a técnica planejada está marcada como **golpe anunciado** (§4.4): janela com Esquiva para todo alvo e Aparar para
     quem tem o nó;
  2. ou a técnica não é anunciada, mas é golpe físico de alvo único e o alvo tem nó de Aparar com Aura: janela só de
     Aparar, como hoje (o dono escolheu "Aparar abre sempre").
  3. Fora isso, o inimigo age direto.

### 4.2 Uma tecla, o tempo decide
Um anel fecha até o impacto (duração da batida: 1100 ms; antes eram 1600). Espaço, o botão ou um toque:

```
|------- cedo demais -------|---- esquiva (450 ms) ----|-- aparar (par ms) --|impacto|+200 folga
```
- **Zona de Aparar** (os últimos `par` ms, de 250 a 600 conforme o nó, mais 200 ms de folga): se o herói tem nó de
  Aparar e Aura, **apara** e paga o custo naquela hora. Sem nó ou sem Aura, conta como esquiva.
- **Zona de Esquiva** (os 450 ms antes da zona de Aparar): **esquiva**. O golpe passa em branco, de graça e sem limite,
  e não dá nada além disso (escolha do dono). Só existe em golpe anunciado.
- **Cedo demais:** errou. O herói **fica Exposto**. Se tinha nó de Aparar e estava tentando aparar (golpe não anunciado,
  onde não há zona de esquiva), o golpe sai com +50%, como hoje.
- **Não apertou:** leva o golpe normal.
- Aparar continua 1 vez por rodada (`parT`); a Esquiva não tem limite.
- O desenho do anel mostra as duas zonas (faixa clara = esquiva, faixa forte = aparar).

### 4.3 Aparada certa e golpes de várias batidas
- **Aparada certa:** tudo o que já dava hoje, **mais o inimigo fica Exposto 1 turno.**
- **Golpe de várias batidas** (`hits` > 1, quando anunciado ou aparável): **uma janela por batida**, com as batidas
  espaçadas em 700 ms dentro da mesma janela (`beats`). Cada batida aparada ou esquivada anula aquela batida.
  O Aparar cobra a Aura **uma vez** pelo golpe inteiro, na primeira aparada (decisão minha).
- **Todas as batidas aparadas** → **contra-ataque automático**: ataque básico da arma ×1,5, com o inimigo Exposto.
  É o grande momento de Clair Obscur.

### 4.4 Golpe anunciado (`tel`)
- Campo `tel: 1` na técnica. O nó marcado aparece com um selo ⚠ na ficha e na grade.
- **Regras automáticas** (decisão minha, para o bestiário já vir pronto):
  - chefes: as 2 técnicas de dano mais fortes;
  - elites: a mais forte;
  - inimigos comuns: só as técnicas com `tel: 1` no nó.
  Marco `tel: 1` em: Golpe Pesado, Estilhaço, Golpe Giratório, Terremoto, Mar de Chamas e Maré Alta.
- **A regra automática é calculada uma vez** e gravada na ficha do inimigo (`telK: [chaves]`) quando ele é criado do
  bestiário. Inimigos já salvos sem `telK` recebem o cálculo ao entrar na primeira batalha. Na luta vale só `telK`
  (mais o `tel: 1` dos nós). Assim, o que o mestre desliga no editor fica desligado.
- O mestre liga ou desliga cada técnica no editor de inimigo, mexendo no `telK`, que vai junto no bestiário salvo.

### 4.5 Choque de poderes (defesa)
- Na janela de um **golpe anunciado de dano**, o alvo que tem uma técnica com `cmd: 'choque'` disponível (Aura,
  sem recarga) vê um segundo botão: **CHOQUE (C)**. Apertar C a qualquer momento antes do impacto troca a janela
  por um cabo de guerra.
- **Só em golpe anunciado de alvo único.** Em golpe de área não há Choque, só Aparar ou Esquiva por alvo.
- **Cabo de guerra (3 s, servidor):** o jogador martela Espaço ou C. O navegador manda a contagem a cada 250 ms; o
  servidor limita a 20 por segundo. A força do inimigo é uma meta de apertos:
  `meta = 18 × (poder do golpe inimigo / poder da técnica de Choque)`, entre 10 e 40. Chefe soma +20%.
- **Venceu:** o golpe do inimigo é anulado e a técnica de Choque acerta ele ×1,3. O inimigo fica Exposto.
- **Perdeu:** leva o golpe ×1,3. A Aura da técnica é gasta do mesmo jeito.
- 1 Choque por rodada por herói. A mesa mostra a barra do cabo de guerra, com a tela tremendo (§7).

## 5. Ataque (medido no navegador)

### 5.1 Fluxo
1. O jogador escolhe uma técnica com `cmd` e o alvo.
2. Antes de mandar `act`, o navegador roda o minigame em sobreposição (no padrão de `aparar.js`) e manda
   `{ t:'act', ..., cmd: { g: ''|'bom'|'perf', n, acc } }`.
3. Enquanto isso, ele manda `{ t:'cmdOn', id }` para a mesa mostrar "⚡ Fulano se prepara…" sobre a ficha.
   Isso é visual e não trava nada.
4. O servidor limita `n` e `acc` pelos campos da técnica e aplica. Sem `cmd`, sai o resultado normal.
5. Prazo: se ninguém mexer em 6 s, sai normal. **Ignorar nunca tira dano.**

### 5.2 Graus
Bom e Perfeito (escolha do dono). O Perfeito tem janela menor e soma o efeito extra da técnica (`pf: '<fx>'`, mesma
notação de `fx`), além dos bônus abaixo.

### 5.3 Os comandos
| Comando | `cmd` | Como joga | Bom | Perfeito | Campos |
|---|---|---|---|---|---|
| **Golpe no tempo** | `tempo` | Um anel fecha (900 ms); aperte no impacto. | ×1,2 | ×1,4 + `pf` | `cw` (janela do Bom, padrão 160 ms), `cp` (Perfeito, padrão 60 ms) |
| **Martelar** | `martelar` | 2 s para apertar Espaço o máximo de vezes; enche uma barra. | soma golpes extras proporcionais à barra (até `mx`) | barra cheia: `mx` extras + `pf` | `mx` (extras, 2–6), `mt` (meta de apertos, padrão 16) |
| **Segurar e soltar** | `segurar` | Segura Espaço; a barra sobe em 1,6 s; solte na faixa. | ×1,3 | ×1,6 + `pf` | `cz` (largura da faixa Perfeito, padrão 8% da barra) |
| **Sequência** | `seq` | 3–6 setas fixas da técnica, cada uma na sua batida (500 ms). | cada seta certa = +1 golpe de 50% do poder | todas certas: golpe final `fin` + `pf` | `seq: '↑→↓'`, `fin` (poder do golpe final) |
| **Ritmo** | `ritmo` | 4–8 notas descem numa pista (~4 s); aperte Espaço em cada uma. | cada nota: +1 turno no buff ou +10% na cura | todas: `pf` | `nt` (notas) |
| **Mira** | `mira` | Uma mira oscila sobre o retrato do alvo por 2,5 s; clique no ponto fraco. | acertou: conta como crítico e tira 2 pontos da Quebra | no centro do ponto: + `pf` | `ma` (tamanho do ponto, padrão 18% do retrato) |
| **Runa** | `runa` | Desenha o símbolo com o mouse em 4 s. A nota vem da semelhança. | ≥ 60%: ×1,2 | ≥ 85%: ×1,4 + `pf` | `rn` (círculo, triângulo, raio, espiral, estrela, onda) |

Detalhes:
- **Golpe no tempo e Black Flash:** técnica com `bf` passa a usar `tempo`, e **só o Perfeito dispara o Black Flash**
  (×2,5 e devolve 25% da Aura). A janela do Perfeito vira `cp = 30 + 8 × bf` ms (bf 3 = 54 ms, bf 7 = 86 ms).
  `mod: 'bf N'` alarga na mesma conta. O d100 deixa de disparar o Black Flash.
- **Martelar** soma golpes **acima** dos `hits` da técnica (escolha do dono). Cada extra tem o poder de um golpe normal.
- **Segurar:** passar do topo = **estouro**: o golpe sai normal e o herói fica Exposto (escolha do dono). Técnicas com
  `chg` (concentrar turnos) mantêm o `chg`; o Segurar acontece na hora de soltar.
- **Sequência:** as setas são fixas por técnica e aparecem na ficha (escolha do dono). Aceita setas e WASD.
- **Ritmo:** vale para buffs e curas em área do Instrumento. A nota dá o efeito do Perfeito no grupo todo.
- **Mira:** num chefe com `weakPart`, o ponto fraco fica sobre a parte do corpo dele no retrato. Acertar soma o dobro
  de dano que já existe para `aim` na parte fraca. Em inimigo comum, o ponto fica em lugar sorteado.
- **Runa:** a semelhança é medida no navegador com um reconhecedor simples de traço (reamostrar 32 pontos, normalizar
  escala e rotação e comparar com o modelo). Vale para feitiços marcados de Foco e Oculto **e para todo ritual com
  `circ`** (142 nós: 38 de 1º círculo, 60 de 2º, 27 de 3º e 17 de 4º).
  - **Símbolo do ritual pelo círculo:** 1º = círculo, 2º = triângulo, 3º = estrela, 4º = espiral. As passivas
    Discente/Verdadeiro (`amp`) não mudam o símbolo.
  - **Bônus em ritual que não causa dano** (`util`/`heal`): Bom = +1 turno nas condições que ele aplica e ×1,2 em cura e
    escudo; Perfeito = isso e o ritual **não cobra o `pay` de Sanidade**. Em ritual de dano, vale o ×1,2/×1,4 da tabela.
    Rituais não ganham `pf`.

### 5.4 Passivas que mexem nos comandos
`mod` ganha as chaves: `cw N` (+ms no Bom de `tempo`), `cp N` (+ms no Perfeito), `mx N` (+golpes no Martelar),
`cz N` (+% na faixa do Segurar), `ma N` (+% no ponto da Mira), `esq N` (+ms na zona de Esquiva), `par N`
(+ms na zona de Aparar), `chq N` (−% na meta do Choque), `rit N` (+ms de tolerância nas notas e nas setas).

## 6. Inimigos

- Chefes e elites continuam aparando golpes de alvo único dos heróis por chance (15% e 10%), como hoje.
- **Perfeito de chefe:** quando um chefe usa um golpe anunciado, há 20% de chance de ele sair **Perfeito**
  (escolha do dono): dano ×1,25, o anel fecha 20% mais rápido e aparece o selo "PERFEITO" vermelho na mesa.

## 7. Show

No Perfeito, a mesa mostra o selo **"PERFEITO!"** grande no palco, um flash curto e um som (pelo `sfxc` de `coreo.js`).
O Bom mostra um selo menor. Efeitos próprios:
- **Black Flash:** raios pretos e vermelhos e um estalo.
- **Choque:** a barra de cabo de guerra entre os dois, com a tela tremendo.
- **Contra-ataque de várias batidas:** "CONTRA!" com um corte.

Respeita `prefers-reduced-motion`: sem tremer e flash suave.

## 8. Nós novos (45)

Notação de árvore como em `ARVORE-SISTEMAS.md`. Os números são o ponto de partida; o balanço fino fica para o `tools/sim.js`.

**Onde cada nó se liga na mandala:**
- A técnica de cada comando entra no fim do ramo indicado, com `pre` no último nó daquele ramo.
- A passiva do comando liga (`pre`) na primeira técnica do mesmo comando no mesmo bloco. Quando não há técnica ao lado,
  liga no último nó do ramo.
- Técnicas de requisito 50 ou mais seguem o `rq` do ramo.
- Os nomes de ramo aqui são temas. Quem implementa usa o ramo real mais próximo: "Marcial · Aparar" = trilha de Aparar
  da Leva 3; "Aura · Fundamentos" e "Aura · Emissão" = os ramos de mesmo tema em `arvore/aura.js`.

### Golpe no tempo (6)
| Nó | Ramo | Resumo |
|---|---|---|
| Corte no Compasso | Marcial · lâmina | dmg DES p16 c4 `cmd tempo`; `pf: 'st bleed 2'` |
| Malho no Tempo | Marcial · pesada | dmg FOR p22 c6 `tempo`; `pf: 'st down 1; brk 1'` |
| Jab Cronometrado | Marcial · punho | dmg FOR p12 c3 `tempo`; `pf: 'turn'` (age de novo) |
| Golpe Divino | Aura · Fundamentos | dmg INT p20 c8 `tempo` `bf: 5` (porta de entrada do Black Flash para todos) |
| Olho do Impacto | Marcial · Duelo | passiva `mod: 'cw 60; cp 15'` |
| Instinto Negro | Aura · Avançadas | passiva `mod: 'bf 2'` (no novo cálculo, +16 ms no Perfeito do Black Flash) |

### Martelar (6)
| Nó | Ramo | Resumo |
|---|---|---|
| Mil Punhos | Marcial · punho | dmg FOR p6 c7 hits 2 `martelar mx 6`; `pf: 'st defDn 2'` |
| Chicote Frenético | Marcial · corrente | dmg DES p7 c6 hits 1 `martelar mx 4`; `pf: 'st para 1'` |
| Saraivada | Marcial · arremesso | dmg DES p6 c6 hits 2 `martelar mx 4` |
| Metralhadora de Aura | Aura · Emissão | dmg DES p5 c8 hits 2 `martelar mx 6`; `pf: 'strip'` |
| Trovão em Rajada | Indra | dmg DES p7 c8 hits 2 `martelar mx 5`; `pf: 'stack carga 3 self'` |
| Punhos Incansáveis | Marcial · Vontade | passiva `mod: 'mx 1'` |

### Segurar e soltar (6)
| Nó | Ramo | Resumo |
|---|---|---|
| Disparo Tenso | Marcial · arco | dmg DES p20 c6 `segurar`; `pf: 'pierce 60'` |
| Tiro Carregado | Marcial · fogo | dmg DES p22 c7 `segurar`; `pf: 'st down 1'` |
| Golpe do Titã Carregado | Marcial · pesada | dmg FOR p26 c9 `segurar`; `pf: 'brk 2'` |
| Esfera Concentrada | Aura · Emissão | dmg INT p28 c10 `segurar`; `pf: 'gain aura 6'` |
| Sol em Miniatura | Kagutsuchi | dmg INT p30 c12 area `segurar`; `pf: 'st burn 3'` |
| Fôlego Longo | Marcial · Respirações | passiva `mod: 'cz 4'` |

### Sequência (6)
| Nó | Ramo | Resumo |
|---|---|---|
| Kata das Cinco Formas | Marcial · lâmina | dmg DES p10 c8 `seq: '↑→↓←↑'` `fin 20` |
| Dança da Lança Serpente | Marcial · lança | dmg DES p10 c7 `seq: '→→↓→'` `fin 16`; `pf: 'push 30'` |
| Combo do Duelista | Marcial · Duelo | dmg DES p9 c6 `seq: '←→←↑'` `fin 18`; `pf: 'vs exposed 1.5'` |
| Forma Contínua | Marcial · Respirações | dmg FOR p10 c8 `seq: '↓↓→↑↑'` `fin 22` |
| Sete Rastros | Fuhaku | dmg AGI p8 c10 `seq: '→↑→↓→↑→'` (7) `fin 24`; `pf: 'st evade 1 self'` |
| Memória Muscular | Marcial · Duelo | passiva `mod: 'rit 80'` |

### Ritmo (5, todos `req: 'instrumento'`)
| Nó | Resumo |
|---|---|
| Balada de Coragem | heal CAR p0 c6 area `ritmo nt 6`; fx `st atkUp 1` (+1 turno por nota); `pf: 'st focus 2'` |
| Marcha do Batalhão | heal CAR p0 c7 area `ritmo nt 6`; fx `st defUp 1; haste 10`; `pf: 'haste 30'` |
| Réquiem Sereno | heal CAR p12 c8 area `ritmo nt 8`; `pf: 'cleanse'` |
| Solo Virtuoso | mental CAR p14 c7 `ritmo nt 8` (cada nota +10% de dano); `pf: 'st silence 1'` |
| Metrônomo Interno | passiva `mod: 'rit 80'`, `sc: 'wt:instrumento'` |

### Mira (5)
| Nó | Ramo | Resumo |
|---|---|---|
| Flecha no Ponto Fraco | Marcial · arco | dmg DES p18 c6 `mira`; `pf: 'st bleed 2'` |
| Tiro de Precisão | Marcial · fogo | dmg DES p20 c6 `mira`; `pf: 'pierce 100'` |
| Lâmina no Olho | Marcial · arremesso | dmg DES p14 c5 `mira`; `pf: 'st blind 2'` |
| Raio Focalizado | Amaterasu | dmg SAB p22 c8 `mira`; `pf: 'st blind 1; strip'` |
| Olhar de Atirador | Marcial · Tática | passiva `mod: 'ma 6'` |

### Runa (5)
| Nó | Ramo | Resumo |
|---|---|---|
| Runa da Chama | Marcial · foco | dmg INT p18 c6 `runa: triângulo` el fogo; `pf: 'st burn 2'` |
| Selo Espiral | Marcial · foco | util INT c6 `runa: espiral`; fx `st silence 1`; `pf: 'st silence 2'` |
| Sigilo de Banimento | Ocultismo · Exorcismo | dmg SAB p20 c8 `runa: estrela`; `vs demon 1.3`; `pf: 'strip'` |
| Glifo do Pavor | Ocultismo · Medo | mental INT p14 c7 `runa: raio`; `pf: 'st fear 2'` |
| Traço Firme | Ocultismo · Iniciação | passiva: semelhança +8 pontos em toda runa (`mod: 'rn 8'`) |

### Choque (4)
| Nó | Ramo | Resumo |
|---|---|---|
| Onda Contra Onda | Aura · Emissão | dmg INT p26 c10 `choque` |
| Chama Contra Chama | Kagutsuchi | dmg INT p28 c10 `choque`; ao vencer, `st burn 2` |
| Raio Contra Raio | Indra | dmg DES p28 c10 `choque`; ao vencer, `st para 1` |
| Vontade Inabalável | Marcial · Vontade | passiva `mod: 'chq 15'` |

### Defesa (2)
| Nó | Ramo | Resumo |
|---|---|---|
| Passo Leve | Marcial · Sobrevivência | passiva `mod: 'esq 150'` |
| Leitura de Combo | Marcial · Aparar | passiva: o contra-ataque das várias batidas sobe de ×1,5 para ×2 (`mod: 'ctr 50'`) |

## 9. Nós que já existem e ganham comando

- **Black Flash → `tempo`** (15): todos os nós com `bf` (Fagulha Negra, Golpe Divergente, Faísca Escura, Raio Negro,
  Lampejo Duplo, Faísca Concentrada, Tempestade Negra, Punho de Brasa Negra, Lampejo Ígneo, Onda Negra,
  Punho Sísmico Negro, Faísca Negra de Indra, Trovão Negro, Clarão Negro, Coágulo Negro).
- **Martelar** (8): Cem Socos (mx 5), Sequência de Boxe (mx 3), Rajada de Aura (mx 3), Nuvem de Lâminas (mx 3),
  Tempestade de Elos (mx 3), Vento Que Não Para (mx 3), Rajada de Mil Cortes (mx 4), Leque de Aço (mx 3).
- **Sequência** (8): Estilo Três Espadas (`↑↑↓`), Dança do Dragão (`→↓←`), Respiração: Terceira Forma (`↓→↓`),
  Kagura do Deus-Fogo (`↑→↓`), Dança dos Rastros (`→↑→`), Rastro Cortante (`←→↑`), Tempestade de Lâminas Infinitas
  (6 setas), Dança do Sol Poente (Limite, 6 setas, `fin` 30).
  Aqui o número de setas é igual ao de `hits`, e **os `hits` originais são o piso**: errar setas nunca dá menos golpes do
  que ignorar. Nesses nós só a sequência inteira certa vale alguma coisa: golpe final `fin` (≈ 1,5× o poder de um golpe)
  mais `pf`.
- **Segurar** (3): Onda do Eremita, Flecha Atravessadora, Golpe do Carrasco.
- **Ritmo** (3): Refrão Curativo, Hino de Guerra, Cantiga de Ninar (cada nota +10% de chance de Sono).
- **Mira** (4): Tiro na Cabeça, Flecha no Joelho, Bala Perfurante, Ponto Cego.
- **Runa** (2 de foco + os 142 rituais com `circ`): Faísca Canalizada (raio), Selo Rápido (círculo).
- **Golpe anunciado `tel`** (6): Golpe Pesado, Estilhaço, Golpe Giratório, Terremoto, Mar de Chamas, Maré Alta.
- **Aparar** (todos os `PAR` da Leva 3): sem mudar o nó. A regra nova (Exposto no inimigo, uma tecla, várias batidas)
  vale para todos.

## 10. Onde mexe

- `src/handlers.js`: `ai` (plano antes da janela), `parry` → `cmd` (notas por batida, Choque), `act` (aceita e limita `cmd`), `cmdOn`.
- `src/rules.js`: `aiAct` → `aiPlan` + `aiRun`; `parryCheck` (zonas, Exposto no inimigo, batidas, contra);
  `strike` (aplicar nota: multiplicador, extras, `pf`, Black Flash pelo Perfeito); chance de Perfeito do chefe.
- `public/rules.js`: descrição dos campos novos na grade e na ficha (sequência visível, selo ⚠ do `tel`).
- `public/js/aparar.js` → `public/js/comandos.js` (base da sobreposição) + um arquivo por comando de ataque
  (`cmd-tempo.js`, `cmd-martelar.js`…), ou um só arquivo se ficar pequeno; decisão de quem implementa.
- `public/js/coreo.js` / `palco.js`: selos PERFEITO/BOM/CONTRA, Black Flash e cabo de guerra.
- `arvore/leva4.js` (nós novos) + marcação nos arquivos de árvore existentes; `content.js` (`tel` automático nos chefes).
- Editor do mestre: interruptor `tel` por técnica do inimigo.
- `ARVORE-SISTEMAS.md` e `DECISOES-SISTEMAS.md`: notação nova e decisões deste questionário.
- Testes: `tools/test.js` (zonas, Exposto, batidas e contra, limites de `cmd`, Black Flash só no Perfeito, estouro),
  `tools/revisao-uso.js` (todos os nós novos usados em batalha real) e `tools/ui-smoke.js` (sobreposições abrem e fecham).

## 11. Decisões minhas (para conferir)

1. O alvo do inimigo é decidido antes da janela, para só o alvo ver o anel. Hoje todo herói com Aparar vê o anel.
2. O anel dura 1100 ms (antes 1600 ms); a zona de Esquiva tem 450 ms.
3. Apertar cedo demais deixa Exposto todo herói; o +50% fica só para tentativa de Aparar fora de golpe anunciado.
4. Em golpe de várias batidas, a Aura do Aparar é cobrada uma vez.
5. O Choque usa a tecla C e só aparece para o alvo de golpe anunciado.
6. Black Flash: só pelo Perfeito, `cp = 30 + 8 × bf` ms; o d100 deixa de disparar.
7. Na Sequência dos nós antigos de multi-golpe, as setas substituem os `hits`. Nos nós novos, cada seta é golpe extra.
8. `tel` automático: 2 técnicas para chefes, 1 para elites e 6 nós marcados para inimigos comuns.
9. Prazo de 6 s para o comando de ataque; passou disso, sai normal.
10. Runa avaliada por um reconhecedor de traço simples, sem biblioteca externa.
11. Nos nós antigos com Sequência, os `hits` originais são o piso; só a sequência perfeita soma algo.
12. Símbolo do ritual pelo círculo (1º círculo, 2º triângulo, 3º estrela, 4º espiral). Em ritual que não causa dano,
    o Bom dá +1 turno e ×1,2 em cura e escudo, e o Perfeito não cobra a Sanidade.
13. Choque só em golpe anunciado de alvo único.
14. `tel` automático calculado uma vez e gravado em `telK`; o mestre edita a lista.
15. Nós novos ligados no fim do ramo do tema; as passivas ligam na técnica do mesmo comando.

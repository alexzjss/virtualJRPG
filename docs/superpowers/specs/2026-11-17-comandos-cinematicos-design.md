# Comandos cinemáticos (visual QTE, dificuldade, mecânicas novas e alcance na árvore) — design

Data: 2026-11-17. Origem: questionário com o dono do projeto (6 rodadas). Continua
`2026-11-17-comandos-de-acao-design.md` (as 10 mecânicas atuais); o que não for dito aqui segue valendo de lá.
Inspirações citadas: QTEs de jogos (Naruto Storm, mas não só), anime shonen.

## 1. Intenção

Os comandos de ação já existem, mas são caixinhas de 150–240 px, com pouca animação e fáceis. O dono quer que eles
sejam **o momento mais vistoso da luta**: tomando a tela, com cara de QTE de anime, respondendo a cada toque, um pouco
mais difíceis, presentes em muito mais técnicas, e fáceis de achar na árvore.

**Metas**
- Todo comando (ataque **e** defesa) vira uma **cena de tela cheia cinemática**.
- Retorno forte: a cada toque, câmera/impacto, sons sintetizados, vibração no celular e uma tela de resultado clara.
- Dificuldade maior: janelas menores, fintas e variação, mais etapas, escala pelo requisito do nó.
- Nova nota **Ótimo** (entre Bom e Perfeito), **erro feio custa ×0,85** e **série de Perfeitos** (combo) com bônus.
- 4 mecânicas novas: **QTE de botões**, **Girar**, **Corte** (deslizar) e **Limite em 3 fases**.
- Comandos em centenas de técnicas a mais (golpes fortes, armas, ramos vazios, curas/suportes, Limites e Formas).
- Achar: filtro **Comando** na busca, **mini-ícone** e **modo destaque** na mandala, botão **Praticar** na ficha.
- Defesa cinemática com **fintas**. A mesa (TV) mostra um **painel resumido ao vivo** do comando em andamento.

**Fora do escopo** (perguntado e não escolhido)
- Opção de "sempre pular" por técnica, encurtar comandos ou cortar a abertura: o dono disse que lentidão não preocupa.
- Chefes deixarem os comandos de ataque mais difíceis; Limite sempre no nível difícil (a escala é só pelo requisito).
- Errar uma fase cortar a cutscene de Limite; o chefe contra-atacar no meio do Limite.
- Selo no menu de luta; sala de treino com placar; praticar técnicas não aprendidas; atualizar `docs/demo-comandos.html`.
- Arquivos de áudio, voz/grito, controle de volume separado. Torcida/emoji de outros jogadores.
- Defesa contar na série de Perfeitos.

**O que faria isso dar errado mesmo funcionando**
- Ficar bonito no PC e quebrar no celular (toque, desempenho, tela pequena). O celular é jogável em tudo.
- O atraso da rede estragar a defesa (as fintas mexem só no desenho; o tempo continua o do servidor).
- **Pular** passar a punir. Pular (Esc/botão) ou não mexer até o prazo continua dando o resultado normal; só
  **tentar e errar feio** custa ×0,85.

## 2. Abordagens consideradas (escolhida: A)

| | Abordagem | Troca |
|---|---|---|
| **A (escolhida)** | **Palco de comando comum.** Uma camada de tela cheia com um canvas de efeitos (partículas, linhas de velocidade, flash, tremor) e a interface do minigame em DOM por cima. Ataque, defesa, treino e Limite usam o mesmo palco; cada mecânica só descreve o que desenha e como pontua. | Reescreve `comandos.js` e `cmd-ataque.js`, mas uniformiza visual, som e tremor, e o Limite em fases e o treino saem quase de graça. |
| B | Reestilizar as caixas atuais só com CSS. | Rápido, mas inconsistente; Limite em fases, treino e fintas viram remendo. |
| C | Tudo desenhado em canvas. | Máximo controle visual; pior para texto, toque, acessibilidade e mais código. |

## 3. Entrega em 3 levas

1. **Leva 1 — Palco e as 10 atuais:** palco cinemático, sons, vibração, retorno a cada toque, tela de resultado,
   dificuldade (janelas, fintas, etapas, escala por requisito), nota Ótimo e erro ×0,85, defesa cinemática com fintas.
2. **Leva 2 — Mecânicas novas:** QTE, Girar, Corte, Limite em 3 fases, série de Perfeitos.
3. **Leva 3 — Alcance e achar:** atribuição automática de comandos em centenas de nós, filtro Comando, ícone e modo
   destaque na mandala, Praticar na ficha, painel resumido ao vivo na mesa, documentação.

Cada leva fecha com testes verdes e pode ser jogada.

## 4. O palco de comando (Leva 1)

### 4.1 Estrutura
- Novo `public/js/palco-cmd.js` exporta `openStage(opts)` → objeto com `fx` (efeitos), `ui` (contêiner DOM do
  minigame), `sfx(k)`, `buzz(ms)`, `result(nota, linhas)`, `close()`. `comandos.js` (defesa) e `cmd-ataque.js`
  (ataque) passam a montar seus minigames dentro dele. A API pública `runCmd(key, hero, tgt, done)` continua igual
  (ganha um 5º parâmetro opcional `{ practice: true }`, §9.3).
- Camadas, de baixo para cima: fundo escurecido e desfocado do jogo (`backdrop-filter`, com queda para só escurecer);
  **faixas pretas** de cinema em cima e embaixo; **retratos** do herói (esquerda) e do alvo/inimigo (direita), grandes,
  entrando de lado; canvas de efeitos em tela cheia; o minigame no centro; nome da técnica num letreiro inclinado;
  dica em baixo.
- Tamanho: o minigame ocupa `min(70vmin, 560px)`; no celular (largura < 600) os retratos encolhem para o topo e o
  minigame usa a largura toda menos 16 px de margem. Alvos de toque ≥ 56 px.
- **Abertura** ~350 ms: faixas entram, linhas de velocidade convergem, retratos deslizam, letreiro bate com tremor curto.
  O tempo do minigame começa **depois** da abertura (no ataque) — na defesa a abertura cabe dentro do anel (§8.1).
- **Fecho** ~700 ms: tela de resultado (§4.4) e as camadas saem.

### 4.2 Estilo
QTE de anime shonen: linhas de velocidade radiais, onomatopeias grandes (`BAM!`, `ZAN!`, `DON!`), cortes diagonais,
contorno grosso preto em letreiros, paleta por mecânica com acento pelo **elemento** da técnica (fogo laranja, raio
amarelo-azulado, água azul, sombra roxa, físico branco/vermelho). Tipografia: a Barlow já usada, em pesos 800–900 e
itálico para letreiros.

### 4.3 Retorno
- **Cada toque:** o alvo do minigame pulsa, faíscas saem do ponto do toque, número/flecha de progresso sobe; erro pisca
  vermelho e treme o elemento.
- **Câmera e impacto:** tremor da camada (amplitude pela nota), **hit-stop** de 60–120 ms no acerto (congela a animação),
  flash branco no Perfeito, zoom leve (1,04) no impacto.
- **Som** (WebAudio sintetizado, estendendo o `SFXC` de `coreo.js`, respeitando o mudo atual): tique do anel que acelera,
  batida do ritmo, estalo de acerto, whoosh de corte, zumbido do Segurar que sobe de tom, nota ascendente no combo.
- **Vibração** (`navigator.vibrate`, se houver): toque 10 ms, acerto 25 ms, Perfeito `[30,40,60]`, erro 80 ms.
- `prefers-reduced-motion`: sem tremor, zoom e linhas de velocidade; flash suave; o minigame funciona igual.

### 4.4 Tela de resultado
Por ~700 ms (toque/tecla pula): a nota grande (`PERFEITO!`, `ÓTIMO!`, `BOM!`, `ERROU`), **o que rendeu** em linguagem
direta (`×1,4 de dano`, `+3 golpes`, `+2 turnos`, `crítico · −2 Quebra`) e **quão perto do Perfeito** (ex.: "faltaram
18 ms", "14/16 apertos", "semelhança 78%"). Com série ativa: `COMBO ×3`.

## 5. Notas, erro e dificuldade (Leva 1)

### 5.1 Graus
`g` ∈ `''` (normal: pulou ou não mexeu), `'erro'` (tentou e errou feio), `'bom'`, `'otimo'`, `'perf'`.
O servidor (`RULES.CMD.clampCmd`) aceita os 5 e aplica:

| Grau | Multiplicadores (onde a técnica usa ×) | Outros |
|---|---|---|
| normal | ×1 | — |
| erro | **×0,85** | contagens (`n`) zeram; Segurar estourado continua deixando Exposto |
| bom | ×1,2 (Segurar ×1,3) | como hoje |
| ótimo | ×1,3 (Segurar ×1,45) | contagens como no Bom; sem `pf` |
| perfeito | ×1,4 (Segurar ×1,6) — nível difícil: ×1,5 (Segurar ×1,7) | `pf`, Black Flash, como hoje |

Em mecânicas de contagem (Martelar, Sequência, Ritmo, QTE), o grau sai da fração acertada: ≥100% Perfeito,
≥75% Ótimo, ≥35% Bom, >0 e <35% Erro (tentou), 0 sem tentar = normal. Nos `hits` originais das técnicas antigas com
Sequência, o piso continua: Erro tira ×0,85 do dano, mas não tira golpes.

**O que é "errar feio" por mecânica:** Tempo/Aparar-de-ataque: apertou fora da janela do Bom; Segurar: soltou antes
de 30% ou estourou; Mira: clicou fora do ponto; Runa: soltou com semelhança < 35%; Corte: direção errada em todas;
Girar: < 35% da meta. Esc/Pular e o prazo de 6 s sem interação = normal.

### 5.2 Escala pelo requisito
Nível do nó pelo maior valor de `rq` (ou 0): **fácil** < 20, **médio** 20–49, **difícil** ≥ 50. Calculado em
`RULES.CMD.tier(s)` (o servidor usa o mesmo para o ×1,5 do difícil). Passivas de `mod` (`cw`, `cp`, `rit`, …)
continuam somando por cima.

### 5.3 Janelas e etapas por nível (ponto de partida; ajuste fino depois)

| Mecânica | Fácil | Médio | Difícil |
|---|---|---|---|
| Tempo: Bom / Ótimo / Perfeito (ms) | 140 / 80 / 50 | 120 / 65 / 40 | 100 / 55 / 32 |
| Tempo: fintas | — | velocidade variável | velocidade variável + anel falso |
| Martelar: meta em 2 s | 16 | 20 | 24 |
| Segurar: faixa Perfeito / Ótimo / Bom (% da barra) | 7 / 8 / 20 | 6 / 7 / 18 | 5 / 6 / 15 |
| Segurar: fintas | — | barra acelera no fim | barra oscila de velocidade |
| Sequência: tolerância por seta | ±120 ms | ±100 ms | ±80 ms, batidas irregulares |
| Ritmo: tolerância / notas | ±150 / `nt` | ±120 / `nt`+1 | ±100 / `nt`+2, com notas duplas |
| Mira: ponto / movimento | 18% fixo | 15%, mira muda de direção | 12%, o ponto fraco também se move |
| Runa: Bom / Ótimo / Perfeito | 60 / 75 / 85 | 65 / 78 / 88 | 70 / 82 / 90 |

Black Flash: `cp = 30 + 8 × bf` continua, mas multiplicado pelo fator do nível (1 / 0,85 / 0,7).

## 6. Mecânicas atuais no palco (Leva 1)

- **Tempo:** anel grande que fecha sobre o retrato do alvo; faixas de Bom/Ótimo/Perfeito visíveis; tique acelerando;
  no acerto, corte diagonal + onomatopeia. **Velocidade variável:** o anel segue uma curva (acelera, quase para,
  acelera) sem mudar o instante do impacto. **Anel falso:** um anel de outra cor (roxo) fecha antes num instante falso;
  apertar nele = erro.
- **Martelar:** barra enorme em diagonal + contador gigante; cada aperto dá impacto e faísca; a barra treme mais
  conforme enche; ao encher, `DON!`.
- **Segurar:** orbe de energia que cresce no centro com zumbido subindo de tom; a faixa certa aparece num medidor
  curvo; estourar = explosão e vermelho.
- **Sequência:** as setas vêm voando de fora e travam numa trilha horizontal; cada uma acende na batida; acerto = corte
  na direção da seta.
- **Ritmo:** pista vertical larga com 1 ou 2 colunas (notas duplas no difícil); linha de acerto pulsando na batida.
- **Mira:** retrato do alvo grande; luneta com zoom; o ponto fraco brilha na parte do corpo (`weakPart`).
- **Runa:** canvas grande com o símbolo-guia em traço fantasma; o traço do jogador brilha e solta partículas; ao soltar,
  o símbolo "acende" com a semelhança.
- **Choque:** cabo de guerra em tela cheia: herói de um lado, inimigo do outro, energia batendo no meio, a linha de
  encontro se move com a contagem.

## 7. Mecânicas novas (Leva 2)

Todas medidas no navegador, como os comandos de ataque atuais; o servidor limita `n`/`acc`/`g` por `clampCmd`.

### 7.1 QTE de botões (`cmd: 'qte'`)
- `qn` prompts (padrão fácil 4, médio 5, difícil 6) aparecem **um após o outro em posições sorteadas da tela**, cada
  um com um círculo que encolhe (fácil 800 ms, médio 650, difícil 520).
- Teclas: fácil só setas/WASD; médio + Q e E; difícil + R, F e Espaço (escolha do dono: setas e letras variadas).
- Tecla errada ou tempo esgotado = aquele prompt falha (vermelho, segue para o próximo).
- **Toque (celular):** o prompt é um botão; tocar nele vale como a tecla certa, mas o círculo é 15% mais curto
  (decisão minha, para o celular ser jogável).
- Rende: `n` acertos → ×(1 + 0,1·n) no dano (ou +1 turno por 2 acertos em técnica sem dano); todos = Perfeito + `pf`.

### 7.2 Girar (`cmd: 'girar'`)
- Girar o mouse/dedo em volta do centro do palco; um vórtice cresce com a rotação acumulada. Meta em 2 s: fácil 4
  voltas, médio 5, difícil 6. Teclado: setas na ordem ↑→↓← (ou ao contrário) contam ¼ de volta cada.
- Rende como Segurar (multiplicador pelo grau). Em cura/buff: Bom +1 turno e ×1,2; Perfeito +2 turnos, ×1,3 e `pf`.

### 7.3 Corte (`cmd: 'corte'`)
- `cn` cortes (1–3; fácil 1, médio 2, difícil 3) aparecem como uma seta/linha cruzando o retrato do alvo; arraste na
  direção dentro de 700/600/500 ms. Teclado: a seta correspondente (diagonais aceitam qualquer uma das duas setas).
- Pontua pela direção (≤ 25° Perfeito, ≤ 40° Ótimo, ≤ 60° Bom) e por ser rápido. Rende multiplicador pelo grau; cada
  corte certo é uma lâmina na animação.

### 7.4 Limite em 3 fases (`cmd: 'limite'`)
- Toda técnica de Limite sem `cmd` explícito ganha `limite`. Fases **fixas**:
  1. **QTE** (4 prompts no nível da técnica);
  2. **Martelar** — ou **Girar** se a técnica for de Aura/emissão (`el` não físico) — 2 s;
  3. **Golpe final no Tempo** (janelas do nível).
- Errar uma fase **não** corta: as três sempre acontecem (o dono não escolheu cortar).
- Rende: fase 1 soma +0,1× por acerto (até +0,4), fase 2 soma golpes extras de 50% do poder (até 4), fase 3 dá o
  multiplicador do Tempo pelo grau. Nota final da tela de resultado = média das três; Perfeito só com as 3 em Perfeito
  (e aí `pf` e, se a técnica tiver `bf`, Black Flash).
- No envio: `cmd: { g, n, acc, ph: [g1, g2, g3], n1, n2 }`; `clampCmd` limita cada campo.

### 7.5 Série de Perfeitos (combo)
- `S.battle.combo[heroId]`: conta comandos de **ataque** seguidos em Perfeito daquele herói. **Qualquer nota abaixo
  de Perfeito, inclusive pular, zera.** A defesa não conta. A batalha nova começa zerada.
- Bônus no Perfeito de número k da série (k ≥ 2): **+5×(k−1) de Limite** (teto +25) e **+5%×(k−1) de dano** (teto
  +25%) naquele golpe. Aparece `COMBO ×k` no resultado e na mesa.

## 8. Defesa cinemática e fintas (Leva 1)

### 8.1 Tela
- Ao abrir a janela (`S.battle.cmd`), o alvo vê o palco em tela cheia: aviso `!` vermelho enorme com tremor, inimigo
  avançando da direita, herói à esquerda, anel grande central (`min(60vmin, 440px)`) com as zonas de Esquiva e Aparar.
- Abertura de 250 ms **dentro** do tempo do anel (o anel já está fechando atrás dela); duração da batida continua a
  do servidor (1100 ms; chefe Perfeito 20% mais rápido).
- Aparou: faíscas, corte, `KIN!`, hit-stop; esquivou: borrão para o lado, `WHOOSH`; levou: flash vermelho.
- Choque e o contra-ataque das várias batidas ganham cena própria no mesmo palco.

### 8.2 Fintas (servidor decide, navegador desenha)
O tempo de impacto continua o do servidor; as fintas são só formas de esconder esse tempo, e o servidor manda nos
`beats` o que o desenho precisa.
- **Batida atrasada:** o anel desacelera ou para por um instante e acelera de novo (`beats[i].ease`); o impacto não muda.
- **Anel falso:** um anel roxo fecha num instante falso antes do verdadeiro (`beats[i].fake = ms`); apertar ali =
  `cedo` (como hoje).
- **Combo irregular:** em golpes de várias batidas, o espaço entre batidas varia (ex.: 450 / 450 / 900 ms) em vez dos
  700 ms fixos.
- **Direção da esquiva:** em golpe anunciado forte, a batida pode exigir uma direção (`beats[i].dir` ∈ `←`/`→`);
  na zona de Esquiva só a seta indicada (ou deslizar para o lado no celular) esquiva; Espaço fora da zona de Aparar
  conta como `cedo`. Aparar continua sendo Espaço/toque na zona de Aparar.
- **Quem usa (decisão minha):** inimigo comum: nenhuma finta; elite: batida atrasada ou anel falso em 30% das batidas;
  chefe: as quatro, com combos irregulares em todo golpe de várias batidas e direção em golpes anunciados. O mestre
  não precisa configurar nada.
- `beats` passa de `[ms]` para `[{ at, ease?, fake?, dir? }]`; quem lê `beats` (servidor e testes) se adapta.

## 9. Alcance e achar (Leva 3)

### 9.1 Atribuição automática (`content.js`, em `buildSkills`)
Uma função `autoCmd(s)` dá comando a nós **ativos** sem `cmd`. Ordem de prioridade; o primeiro que casar vence:
1. Limite → `limite`. Forma → `girar` (Bom/Ótimo/Perfeito: +1/+1/+2 turnos de forma).
2. Técnica de arma, pelo tipo (escolhas do dono):
   - lâmina: `hits` > 1 → `seq` (setas derivadas do nome, uma por golpe, 3–6) · senão `corte`;
   - pesada: poder alto (≥ 20) → `segurar` · senão `tempo`;
   - distância (arco, fogo, arremesso): alvo único → `mira` · área/perfurar → `segurar`;
   - punho: `hits` > 1 → `martelar` (`mx` = 3 + nível) · senão `tempo`;
   - aura/emissão: `hits` > 1 → `martelar` · senão `girar`.
3. Golpe forte sem arma (dano/mental, nível médio ou difícil): pelo elemento — físico `tempo`, aura `girar`,
   fogo/raio `qte`, oculto/mental `runa`, os demais `corte`.
4. Cura → `ritmo` curto (`nt` 3, médio 4); escudo/guarda → `runa` (círculo); buff/utilidade → `girar`.
5. **Ramos sem nenhum:** depois das regras, todo ramo com menos de 2 nós com comando ganha comando nos 2 ativos mais
   fortes, pela regra 3.
- `cmd` escrito no nó sempre vence; `cmd: 0` no nó desliga a atribuição.
- Golpe fraco sem arma de nível fácil fica sem comando (de propósito: não é golpe forte).
- Os campos auxiliares (`mx`, `seq`, `nt`, `qn`, `cn`, `rn`) são derivados quando faltam.

### 9.2 Filtro e mandala
- `FUNC` (`public/js/paginas.js`) ganha **Comando**; ligado, aparece uma fileira de chips por mecânica (Tempo,
  Martelar, Segurar, Sequência, Ritmo, Mira, Runa, Choque, QTE, Girar, Corte, Limite) com a contagem de cada.
  A busca por texto também acha o nome da mecânica.
- **Mini-ícone** no canto do nó na mandala (`mandala.js`), um glifo por mecânica (ex.: ⏱ Tempo, ✊ Martelar,
  ◎ Segurar, ⇶ Sequência, ♪ Ritmo, ⌖ Mira, ✦ Runa, ⚡ Choque, ▣ QTE, ⟳ Girar, ⟋ Corte, ★ Limite), desenhado no zoom em
  que o nó já mostra detalhe.
- **Modo destaque:** com o filtro Comando ligado, a mandala escurece os outros nós (opacidade ~0,2) e os com comando
  (ou só os da mecânica do chip) brilham.

### 9.3 Praticar
Na ficha da técnica (gaveta da árvore e lista de skills), **técnicas aprendidas** com `cmd` mostram **Praticar**: abre
o mesmo palco com `runCmd(key, hero, alvoFicticio, done, { practice: true })`, mostra o resultado e não manda nada ao
servidor. Funciona fora e dentro da batalha (dentro, só fora do próprio turno não importa: não gasta nada).

### 9.4 Mesa: painel resumido ao vivo
- Durante o comando, o navegador do jogador manda `{ t: 'cmdLive', id, k, p, g? }` no máximo 4 vezes por segundo
  (`p` = progresso 0–1, `k` = mecânica). O servidor repassa **sem gravar** no estado salvo.
- A mesa mostra sobre a ficha do herói um painel animado: "**Ana** — Martelando! 12/16", barra de progresso, ícone da
  mecânica, e no fim a nota com `COMBO ×k`. O selo grande atual (PERFEITO!/BOM!) continua e fica mais forte (usa o
  mesmo kit de efeitos do palco).
- Defesa na mesa: "**Bruno** vai defender!" e o resultado (APAROU/ESQUIVOU/LEVOU).

## 10. Onde mexe

- `public/js/palco-cmd.js` (novo): palco, efeitos em canvas, sons, vibração, resultado.
- `public/js/cmd-ataque.js`: as 7 atuais no palco + QTE, Girar, Corte, Limite; níveis e fintas; modo prática.
- `public/js/comandos.js`: defesa e Choque no palco; fintas pelos `beats`.
- `public/js/coreo.js`: novos `SFXC`; selos mais fortes; painel ao vivo da mesa.
- `public/rules.js`: `CMD.tier`, janelas por nível, `clampCmd`/`cmdEffect` com Ótimo, Erro, mecânicas novas, combo;
  `cmdText` para as novas.
- `src/rules.js`: aplicar Ótimo/Erro/Limite em fases/combo em `strike`; fintas nos `beats` de `parry`/janela.
- `src/handlers.js`: `cmdLive` (repasse), combo no `act`.
- `content.js`: `autoCmd`. `public/js/paginas.js`, `public/js/mandala.js`: filtro, chips, ícone, destaque, Praticar.
- `ARVORE-SISTEMAS.md` (notação: `qte`, `girar`, `corte`, `limite`, `qn`, `cn`, `cmd: 0`), `DECISOES-SISTEMAS.md`.
- Testes: `tools/test.js` (graus, ×0,85 só com tentativa, Ótimo, nível difícil ×1,5, combo zera e soma com teto,
  Limite limita fases, `beats` com fintas, `cmdLive` não grava), `tools/ui-smoke.js` (palco abre/fecha em cada
  mecânica, prática não envia `act`), e um teste de `autoCmd` (contagem por mecânica, todo ramo com ≥ 2,
  `cmd: 0` respeitado).

## 11. Decisões minhas (para conferir)

1. Mesa com **painel resumido** (o dono não escolheu); espelhar o minigame quadro a quadro pela rede ficaria travado.
2. Tabelas de janela/etapas/multiplicadores de §5 e §7 são ponto de partida.
3. "Errar feio" definido por mecânica em §5.1; Esc e prazo sem toque = normal.
4. No celular o QTE vira botões tocáveis com círculo 15% mais curto.
5. Fintas da defesa só em elites (30%) e chefes (todas); comuns sem finta.
6. Direção da esquiva só em golpe anunciado forte de chefe; Aparar continua sendo Espaço.
7. Limite: fase 2 é Girar quando a técnica não é física.
8. Formas ganham Girar e o bônus é duração.
9. A defesa abre com a abertura cinemática dentro do tempo do anel (não atrasa o servidor).
10. Praticar só para técnicas aprendidas e sem custo.
11. Combo soma +5 Limite e +5% de dano por Perfeito seguido além do primeiro, teto +25 / +25%.

## 12. Respostas à revisão do documento (minhas decisões, para conferir)

12. **Armas sem regra (§9.1).** Ramos de armas que a regra 2 não cobria passam a ter: corrente → `martelar` (golpes
    múltiplos) ou `tempo`; escudo → `tempo` (golpes de contra-ataque) ou `girar` (técnicas de guarda); foco → `runa`;
    instrumento → `ritmo` (já é o caso); lança → `seq` (várias estocadas) ou `tempo`. "Aura/emissão" é tratado como
    elemento `aura` do nó, não como tipo de arma. **As técnicas que vêm da própria arma (`ARMAS.skill()`, lendárias
    `ULT`) ficam fora desta entrega**: não passam por `buildSkills` e não têm `rq`; o nível de dificuldade delas seria
    inventado. Podem entrar depois como pedido à parte.
13. **Limite que não é dano físico de alvo único.** Fase 2 e fase 3 usam a recompensa de cada tipo: em Limite de dano em
    área, os golpes extras da fase 2 atingem todos os alvos (cada um leva um golpe de 50% do poder dividido igualmente
    entre alvos, mínimo 1); em cura/escudo, a fase 2 soma +10% de cura/escudo por acerto (até +40%) e a fase 3 dá o
    multiplicador de cura do Perfeito (×1,3); em mental, vale como dano. Black Flash só se a técnica tiver `bf`.
14. **Série de Perfeitos.** Para não confundir com o `combo` que já existe nas técnicas (×1,4, "COMBO!"), a série
    se chama **SÉRIE ×k** na tela e no código (`streak`). Reseta com qualquer **ação do herói** que não seja
    comando de ataque em Perfeito: ataque básico, item, técnica sem comando e comando abaixo de Perfeito
    (inclusive pular). Defender e esperar o turno dos outros não reseta nem soma. Se o mesmo golpe tem o `combo` antigo e
    a série, os dois multiplicam.
15. **Confiança na nota (já decidida na abordagem A do design anterior, §2).** O navegador manda o grau e o servidor só
    limita. Portanto o ×0,85 do Erro e o ×1,5 do difícil são honestos por combinação: quem quiser pode mandar "normal"
    e fugir do ×0,85. Aceito numa mesa de amigos cooperativa; não vamos mandar medidas brutas ao servidor.
16. Detalhes que o implementador decide: limiares do Ótimo da Mira (ponto: Perfeito ≤ 40% do raio, Ótimo ≤ 70%,
    Bom ≤ 100%), cores por elemento e o prazo de 6 s por fase do Limite.

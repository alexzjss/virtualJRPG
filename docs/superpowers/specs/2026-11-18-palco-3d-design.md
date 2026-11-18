# Palco 3D de batalha (estilo Expedition 33) — design

Data: 2026-11-18 · Status: aguardando aprovação · Protótipo aprovado: `.claude/mockups/batalha/e33.html`

## Por quê

A tela de batalha atual empilha um palco 2D (cartões) e um painel de comando que muda de altura conforme o menu. Trocar de Atacar para Skills empurra o palco para fora da vista. Os inimigos só mostram uma barra de HP, a ordem dos turnos aparece duas vezes e o resultado de uma ação é difícil de acompanhar. O dono testou layouts 2D (palco com painel fixo, coluna lateral, mão de cartas, roda, botões estilo Star Rail) e recusou todos. Escolheu um palco com profundidade, como em Expedition 33. A câmera vai para o ombro de quem age e recua quando o inimigo ataca, e a HUD fica nos cantos.

## Objetivos

- Uma tela de batalha que não rola nem "pula": o palco ocupa a tela, e a HUD fica fixa nos cantos.
- Ver de onde vem e para onde vai cada ação: a câmera acompanha o turno e o golpe.
- Ler os inimigos sem poluir a tela: mini barra sempre visível, ficha ao mirar, ficha completa no zoom.
- Saber a consequência da escolha: prévia ao vivo na ordem de turnos e efeito previsto na ficha do alvo.
- Personagens com cara própria: imagens de frente e costas por herói e de frente por inimigo, com uma figura padrão quando faltar.

**Não-objetivos:** celular e tablet (≤ 700 px seguem com o palco e o comando atuais, sem regressão); o mapa tático; páginas fora da batalha (Ficha, Skills, Ofícios), exceto os campos novos de imagem na Ficha e no bestiário.

**Anti-objetivos:** perder legibilidade das regras (afinidade, custo e bloqueio continuam visíveis); câmera que enjoa ou demora (cada movimento ≤ 1,1 s, investida ≤ 0,5 s por perna); quebrar a coreografia atual (~1,5 s por ação, decisão anterior); mostrar fraquezas que o grupo ainda não descobriu.

## Abordagens consideradas

1. **CSS 3D numa camada própria (escolhida pelo dono).** Um contêiner com `perspective` e um "mundo" com `transform-style: preserve-3d`. O cenário fica ao fundo, o chão é um plano girado e os combatentes são imagens posicionadas com `translate3d`. A câmera é uma transição de `transform` no mundo. Não precisa de biblioteca, convive com o DOM e com o `coreo.js` atuais, e o protótipo mostrou que funciona.
2. Three.js com sprites e câmera real. Dá mais liberdade de câmera, mas traz uma biblioteca e obriga a reescrever efeitos, números e QTE para o canvas.
3. 2D com escala e parallax. É mais simples, mas sem a profundidade pedida.
4. Canvas próprio com projeção falsa. Dá controle total, mas a HUD e os efeitos teriam de ser refeitos.

Antes chegaram a ser comparados os layouts 2D A–D, as variações D1–D3 e os conceitos Corte, Star Rail, Cartas e Roda (em `.claude/mockups/batalha/`). Todos foram descartados.

## A tela

```
┌[S]agora─────────────────────────────────────── ☰ 💬3 ? ┐
│[武]                     ━━━━━━ ◆4 GOLEM ━━━━━━  CADEIA ▮▮  CLIMA│
│[M]                                             log: Thomas defendeu│
│[S]VOCÊ (prévia)        ◆4▬▬  ◆2▬▬  ◆6▬▬        log: Lobo → Mikhail 18│
│[武]                    [Golem][Lobo][Oni]  ┌ficha do alvo┐          │
│[T]          ╲ Mirar parte                  └─────────────┘          │
│        ███  (herói da vez,   ╲ 3 Itens                              │
│        ███   de costas,       ╲ 2 Skills ◀                          │
│        ███   grande)           ╲ 1 Atacar          [M]  [T]          │
│ (4)Defender (5)Concentrar (6)Coragem (7)Passar   [S]  72/90 140/140  │
└──────────────────────────────────────────────── grupo ──────────┘
```

### Camadas

- **Mundo 3D** (atrás de tudo):
  - **Cenário:** a imagem da cena de batalha (`sc.bbg` quando é URL; senão `sc.bg`). Se `sc.bbg` for um dos 20 fundos prontos, o fundo animado atual vira a camada de cenário. O clima (`sc.clima`) fica por cima do cenário.
  - **Chão gerado:** plano em perspectiva com névoa e uma grade sutil em ouro. Existe sempre.
  - **Combatentes:** heróis vistos pela imagem de costas e inimigos pela de frente, em recortes com sombra no chão. Inimigos ganham uma **mini barra** sobre a cabeça, com o escudo de Quebra (◆n) e o HP.
- **HUD plana** (por cima, nunca se move com a câmera):
  - **Canto superior esquerdo · ordem de turnos:** coluna de retratos. O atual é maior e tem o selo "AGORA". Mostra os próximos 8 (`timeline()`).
    - **Prévia ao vivo:** ao passar por uma skill ou ação, um retrato tracejado "VOCÊ" entra na posição em que você cai, e abaixo da coluna aparece uma linha com o motivo (ex.: "Wakaze: você volta em 3º").
    - Passar o mouse num retrato destaca o combatente no palco, e vice-versa.
  - **Canto superior direito:** ícones ☰ (navegação de páginas recolhida), chat com contador de não lidas e ajuda. Abaixo ficam a faixa de Cadeia, clima e Domínio (`fieldBar`) e o log com as 3 últimas ações (quem → em quem · golpe · FRACO/RESISTE · valor), que somem aos poucos.
  - **Canto inferior direito · grupo:** um retrato por herói. O herói da vez fica maior e ao centro. Cada retrato mostra:
    - HP em número grande e barra vermelha;
    - Aura com o número num losango e barra segmentada;
    - Sanidade em barra fina;
    - Limite em barra dourada vertical, que pisca com "LIMITE!" quando está cheia;
    - condições, forma, Defendendo, Tensão e Coragem em texto ao lado.

    O herói alvo de um golpe inimigo pisca. Fora da vez dos heróis, a HUD do grupo e a ordem escurecem levemente.
  - **Canto inferior esquerdo:** dicas de ação, com Defender (4), Concentrar (5), Coragem (6) e Passar (7), e Ataque Total quando estiver disponível. Mostra também Esc Voltar quando há submenu e o selo **"Aguardando o mestre · ação → alvo (Esc cancela)"** quando o pedido espera aprovação.
  - **Topo central:** barra do alvo mirado ou com zoom (nome, escudo e HP), no estilo da barra de chefe.

### Câmera (compartilhada)

Todos (jogador, mesa e mestre) veem a mesma câmera, derivada do estado do servidor:

- **Vez de um herói:** a câmera fica atrás do ombro dele, como no Expedition 33. O herói aparece grande, de costas, no primeiro plano à esquerda, com um colega cortado na borda direita e os inimigos ao fundo no centro. Inclinação leve (±6°).
- **Vez de um inimigo:** a câmera recua até mostrar o grupo de costas na frente, e o inimigo da vez avança na direção dele.
- **Ação:** quando o golpe resolve, a câmera e o recorte de quem age avançam até o alvo (≤ 0,5 s), acontece o impacto (número saindo do recorte do alvo e tremor) e os dois voltam. Os números, os cortes de Crítico e Fraqueza, a cutscene de Limite e Domínio e o estilhaço de Quebra vêm do `coreo.js` atual, ancorados nos recortes em vez dos cartões.
- **Local, só para quem age:** ao mirar, a câmera chega um pouco mais perto do alvo. O zoom (Z ou roda do mouse sobre um inimigo) aproxima e abre a ficha completa; Esc, ou a troca de turno, volta à câmera compartilhada.

### Formação

- **Heróis:** um à esquerda e os outros à direita, em profundidades um pouco diferentes. Com 5 ou 6, eles formam uma segunda fileira atrás.
- **Inimigos:** em arco ao fundo. Com mais de 5, formam duas fileiras.
- **Escala:** cada recorte usa a escala do personagem (campo novo), para que um chefe grande pareça grande.

### Leque de comandos (vez do jogador)

Pinceladas diagonais de tinta, na paleta atual: preto com borda e risco em ouro, a opção escolhida em vermelho, fonte Anton, número da tecla num círculo. O leque fica à direita do herói, e "Mirar parte" fica à esquerda dele.

- **1 Atacar:** vai direto para a mira com o golpe da arma (sem lista).
- **2 Skills:** abre a tela de skills.
- **3 Itens:** pinceladas com nome, quantidade e efeito curto.
- **Q Mirar parte:** a mira em parte do corpo que hoje é um botão separado (`aimBox`). Abre a escolha de parte sobre o alvo.
- No rodapé esquerdo ficam Defender, Concentrar, Coragem e Passar (e Ataque Total).

### Tela de Skills

- Mostra **6 skills** em duas colunas de pinceladas:
  - **Esquerda:** 3 compactas (elemento, nome, afinidade, custo).
  - **Direita:** 3 maiores com tipo, elemento, poder, afinidade e descrição curta.
- **De onde vêm as 6:** primeiro as ★ fixadas, depois as mais usadas (`skUse`), completando as 6. **O limite de fixadas cai de 12 para 6.** Saves com mais de 6 ficam com as 6 primeiras.
- **"Todas as skills… (T)":** abre a lista completa com grupos, filtro por digitação, ↑↓ e Shift+F para fixar. É o seletor atual (`cmd-skills.js`), restilizado com pinceladas, sem o painel lateral; a descrição vai para a ficha do alvo.
- **Bloqueadas:** continuam visíveis, apagadas e com o motivo (`blockWhy`).

### Fluxo

1. Menu do leque → Skills → escolhe a skill (Enter ou clique).
2. Entra em **Mira**: a câmera chega perto do alvo atual, que ganha seta ▼ e moldura. Aparecem a barra do topo e a **ficha do alvo** ao lado do recorte, com nome, tipo, HP, escudo, fraquezas descobertas (vermelho fraco, azul resiste, ? não testado), condições e a linha de **efeito previsto** (ex.: "Wakaze · P31 · ▲ FRACO · −1 escudo").
3. ←→ ou clique trocam o alvo; um clique no alvo já mirado, ou Enter, confirma. Esc volta ao passo anterior.
4. Se a ação precisa da aprovação do mestre, aparece o selo "Aguardando o mestre" e o leque some. Esc cancela o pedido. A barra "Sua ação" deixa de existir.
5. Skills de aliado ou de área: a mira passa a valer para heróis (recortes do grupo) ou marca todos os alvos.

### Vez do inimigo

1. Câmera recuada, HUD escurecida e o inimigo da vez avança.
2. **Faixa com o nome do golpe e o alvo** ("LOBO · MORDIDA DUPLA — alvo: Mikhail").
3. O **QTE de defesa** (anel que fecha, Esquiva, Aparar, fintas, várias batidas, Choque) passa a abrir **sobre o recorte do herói alvo, no próprio palco**, em vez da tela cheia de `palco-cmd.js`. As regras e os tempos de `comandos.js` não mudam.
4. **Mestre:** o leque aparece na vez de **qualquer** combatente: inimigo, herói de jogador ausente ou invocação. Ele substitui a barra `.gcmd` e cobre tudo o que ela faz hoje (IA decide, Atacar, skills, itens, Passar). Na vez de um herói cujo jogador está conectado, o leque fica recolhido num botão "Agir por …". Por isso o `leque.js` recebe o **ator** como parâmetro, separado do usuário logado.

### Inimigos: ficha e zoom

- **Sempre:** mini barra com o escudo (◆) e o HP.
- **Ao mirar:** barra no topo e ficha ao lado.
- **Zoom** (Z, ou roda sobre um inimigo; também um clique fora da mira): a câmera aproxima e a ficha completa aparece, com ataques conhecidos e o efeito da Quebra, quando o grupo já os descobriu. Valem as mesmas regras de descoberta de hoje (`scrub`, `lore`, `known`). O mestre vê tudo.

## Imagens

### Campos novos (por personagem)

- `imgF` (frente), `imgB` (costas) e `imgP` (retrato, opcional). Nos inimigos, só `imgF` e `imgP`.
- `imgK`, com o enquadre de cada imagem: deslocamento e zoom (`{f:{x,y,z}, b:{x,y,z}, p:{x,y,z}}`), para assentar os pés no chão e o rosto no retrato.
- `imgS`, a escala na cena (0,5–2,5; padrão 1).

### Quem envia

O mestre e o dono do herói, na Ficha (seção "Imagens de batalha"), pelo envio que já existe (`/upload`, `okUrl`). Inimigos: o mestre, no bestiário. `spawn` copia os campos para o inimigo criado.

### Reserva quando falta imagem

| Uso | 1ª opção | 2ª opção | Última opção |
|---|---|---|---|
| Frente | `imgF` | `c.img` | silhueta na cor do personagem com a letra (herói) ou o glifo do elemento (inimigo) |
| Costas | `imgB` | — | silhueta escura com contorno na cor e a letra (sem escurecer a frente) |
| Retrato | `imgP` | recorte do topo da frente | — |

### Recomendação na interface

PNG com fundo transparente. Aceita qualquer imagem.

### Editor de enquadre

Prévia do recorte sobre o chão e do retrato. Arrastar move a imagem, a roda muda o zoom, e um controle deslizante ajusta a escala na cena.

## Quem vê o quê

- **Jogador (PC, > 700 px):** palco 3D com HUD e leque na vez dele.
- **Mesa (`/table`):** o mesmo palco e a mesma HUD, sem leque.
- **Mestre:** o mesmo palco no centro (o arranjo de `docas.js` não muda: Palco ou Mapa, painéis laterais). Tem o leque de quem estiver na vez (ver "Vez do inimigo", item 4) e o selo de pedidos. Vê todos os números dos inimigos.
- **Celular (≤ 700 px):** continua com `battle()` + `command()` atuais.

## Arquitetura (decisões minhas, confirme)

1. **A camada 3D vive fora do `#app`**, como `.fxl` do `coreo.js`. `render()` redesenha o `#app` inteiro a cada estado, o que reiniciaria as transições de câmera. O módulo novo **atualiza o mundo por diferença**: cria e remove recortes por id, e muda `transform` e atributos sem recriar nada. A HUD pode continuar sendo HTML redesenhado pelo `render()`, por ser plana.
2. **Módulo novo `public/js/palco3d.js`** (mundo, câmera, formação, recortes, ficha, zoom), **`public/js/hud.js`** (ordem, grupo, cantos, log) e **`public/js/leque.js`** (leque, tela de 6 skills, itens, mira e teclado). Cada um injeta o próprio `<style>`, no padrão de `cmd-ataque.js`. `cmd-skills.js` passa a desenhar só a lista "Todas", no estilo novo.
3. **Ganchos do `coreo.js`:** `unitEl(id)` passa a achar o recorte (`.bb[data-tgt]`), mantendo a classe `unit` no recorte para os seletores existentes (`ko`, `kofall`, `.sti`). Investida e impacto chamam `palco3d.lunge(from, to)` e `palco3d.shake(id)`.
4. **QTE de defesa no palco:** `comandos.js` ganha um modo "no palco", que desenha o anel posicionado sobre o recorte (coordenadas de tela do recorte). O Choque e as fintas continuam iguais. Os minigames de **ataque** (`cmd-ataque.js`) continuam no palco de tela cheia (`palco-cmd.js`), como overlay, porque são mais longos e precisam da tela.
5. **Câmera compartilhada:** é derivada de `timeline()[0]` e dos eventos de ação já transmitidos. Não há campo novo no servidor. Mira e zoom são estado local do cliente.
6. **Servidor:**
   - `set` aceita `imgF`, `imgB`, `imgP`, `imgK` e `imgS` do dono e do mestre, com saneamento: URL por `okUrl`, números com limite.
   - O bestiário guarda `imgF`, `imgP`, `imgK` e `imgS`, e `spawn` copia esses campos.
   - `skPin` passa a limitar em 6, com migração em `state.js`.
   - `scrub` repassa os campos novos.
7. **Palco do mestre dentro das docas:** o `palco3d` monta num retângulo, o da região central de `docas.js`, e acompanha o tamanho dela (`ResizeObserver`). Ele não assume a tela cheia. A HUD fica presa aos cantos desse retângulo. Com a aba Mapa aberta, o palco fica oculto (a câmera continua seguindo o estado). Em região central estreita, o palco 3D continua: a regra ≤ 700 px vale só para a largura da janela do jogador e da mesa.
8. **Prévia da ordem:** é calculada no cliente a partir de `ct` e haste da skill escolhida, e do bônus de fraqueza **só quando a fraqueza já é conhecida** pelo grupo. Assim não revela nada novo. Ela se atualiza ao trocar o alvo. A posição do retrato "VOCÊ" é aproximada (a linha diz "≈ 3º" quando houver incerteza). O cálculo de atraso **não** passa a ser compartilhado com o servidor.
9. **Desempenho:** no máximo ~14 recortes e um cenário. Sem filtros pesados em tempo real além de `drop-shadow`. A câmera usa só `transform`.

## Arquivos

- **Novos:** `public/js/palco3d.js`, `public/js/hud.js`, `public/js/leque.js`.
- `public/player.html`, `public/table.html`, `public/gm.html`: incluir os scripts (na ordem usada por `gm.html`).
- `public/js/tela.js`: em batalha e com largura > 700 px, montar a HUD e chamar `palco3d.sync()` no lugar de `battle()` + `command()`. O mestre usa o mesmo palco na área central.
- `public/js/palco.js`: `battle()` continua para o celular; `timeline`, `stIcons`, `KANJI` e afins são reaproveitados.
- `public/js/paginas.js`: a Ficha ganha a seção "Imagens de batalha" com o editor de enquadre. `command()` fica só para o celular.
- `public/js/mestre.js` (bestiário): campos de imagem do inimigo.
- `public/js/coreo.js`, `public/js/comandos.js`, `public/js/cmd-skills.js`: ganchos descritos acima.
- `public/js/eventos.js`: teclas 1–7, Q, T, Z, ←→, Enter e Esc encaminhadas ao `leque.js` em batalha.
- `src/handlers.js` (`set`, `skPin`), `src/rules.js` (`spawn`), `src/state.js` (padrões e migração), `src/net.js` (`scrub`).
- `tools/test.js`: campos de imagem (saneamento e permissão), cópia no `spawn`, `skPin` com limite 6 e migração.
- `tools/ui-smoke.js`: seletores do palco novo (`.bb[data-tgt]`, leque, mira, selo de pedido, QTE no palco).

## Fica para quem implementa

- Os números exatos da câmera e da formação: o protótipo dá a base (perspectiva 1000 px, herói da vez com z ≈ +560, inimigos com z ≈ −1500).
- O desenho exato das pinceladas e das silhuetas padrão.
- A ordem de commits e etapas, decidida no plano. O dono quer **um commit por etapa direto no `main`**.

## Transição (decisão do dono)

**Fatia jogável primeiro.** O primeiro commit do palco já o torna o padrão no PC, com o mínimo jogável:
- mundo 3D com cenário e chão;
- recortes com a figura padrão;
- câmera por turno;
- leque com Atacar, Skills (lista "Todas" provisória) e Itens;
- mira com Enter;
- HUD simples: ordem, grupo e cantos.

Cada commit seguinte enriquece: imagens e editor de enquadre, as 6 skills, ficha e zoom, prévia da ordem, investida e efeitos, QTE no palco, leque do mestre. Todo commit deixa a batalha jogável no PC, e o celular nunca muda.

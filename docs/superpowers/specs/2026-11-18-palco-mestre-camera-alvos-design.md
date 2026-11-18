# Palco: mestre igual ao jogador, câmera virada para a mesa e alvo livre — design

Data: 2026-11-18 · Status: aguardando aprovação

## Por quê

- O mestre vê o palco 3D com uma HUD parcial: barra do alvo, minimapa e, com o leque aberto, a lista de alvos e os comandos. Ele não tem a coluna de ordem, o grupo, o log nem o topo como o jogador.
- No ombro de quem age, a câmera gira só ±6° e olha sempre na direção do eixo da batalha. Com a formação vinda do grid, quem está de lado ou atrás sai do quadro.
- A mira (`cands()` em `leque.js`) filtra pelo tipo de skill: dano mira o lado oposto, cura e item miram o próprio lado. O dono quer poder mirar qualquer um da mesa.

## Decisões do dono

**Mestre**
- O mestre ganha a HUD completa do jogador dentro da vista Palco. As abas Mesa/Palco/Mapa e os painéis laterais continuam como estão. A HUD tem a ordem com a prévia, o topo direito com Cadeia/clima e log, o grupo, a fileira de comandos, a lista de alvos e a faixa do golpe inimigo.
- O que o mestre tem a mais que o jogador:
  - HP numérico e a ficha completa dos inimigos.
  - O leque para qualquer combatente da vez, com "IA decide" para inimigos e "Agir por X" quando o dono do herói está conectado.
  - A fila de pedidos dos jogadores no próprio palco, para aprovar ou recusar.
  - Um minimapa que move todos os tokens.

**Câmera**
- Fica no ombro de quem age, seja herói ou inimigo, e gira livremente (yaw) para o centro de todos os combatentes. Também recua o necessário para caber todos no quadro.
- Na mira, a câmera **não anda** ao trocar de alvo: o alvo aparece com a mão ☞, o anel e a linha de alcance. O zoom (Z ou roda) continua indo até o inimigo.
- A janela de defesa continua no herói que é alvo, e a investida continua indo até o alvo.
- Vale para todas as telas que mostram o palco: jogador, mestre e TV.

**Alvo**
- Qualquer ação pode mirar qualquer um que esteja na batalha:
  - vivos dos dois lados e o próprio ator;
  - aliados caídos;
  - inimigos caídos ou abatidos;
  - invocações.
- O mestre vê os ocultos ou furtivos. O jogador não os vê, seguindo a mesma regra do mapa.
- A mira abre no lado natural da skill.
- Quando a mira sai do lado natural (dano em aliado, cura em inimigo), a ação pede **confirmação extra**: um segundo Enter ou o clique em "Confirmar mesmo assim".
- Formas de escolher o alvo:
  - ←/→ percorrem todos em ordem de tela;
  - Tab alterna entre os lados;
  - clicar ou passar o mouse em qualquer recorte do palco;
  - clicar no ponto do minimapa.

**Entrega:** direto no main, um commit por etapa, ajustando pelos prints (sem protótipo).

## Não-objetivos e anti-objetivos

- **Não-objetivos:** celular, mudanças nas regras de dano e cura, e o layout de painéis do mestre fora do palco.
- **Anti-objetivos:**
  - a câmera balançar ou trocar de enquadramento a cada passada do mouse;
  - o mestre perder alguma ferramenta que tem hoje (Reenquadrar, Desfazer, fichas);
  - fogo amigo sem querer.

## Abordagens

1. **Reaproveitar `HUD.html` com uma opção `gm` (escolhida).** O mestre passa a usar o mesmo desenho do jogador. A opção `gm` liga os extras (números, pedidos, minimapa livre) e o ator vem do leque do mestre. Fica uma HUD só, e ajustes futuros valem para todos.
2. Expandir `HUD.gm()` peça por peça: duplicaria `ordem`, `grupo` e `topo`, e a HUD do mestre e a do jogador se afastariam com o tempo.
3. Uma câmera de mesa à parte, sem ombro: foi descartada pelo dono.

**Câmera:** `cameraFor` continua pura e recebe a lista de posições de todos. Ela calcula o centro e o raio da mesa, põe o olho atrás e acima do ombro de quem age (na direção oposta ao centro), aplica o yaw para o centro e define o recuo pelo raio. A transformação do mundo passa a ser `rotateY` em torno do olho (hoje é só translação mais ±6°). A função é testada no Node.

**Frente e costas dos recortes:** com o giro livre, um recorte pode ser visto de frente ou de costas. `unitKind` deixa de ser "herói de costas, inimigo de frente" e passa a comparar a direção da câmera com o lado de cada um: quem olha para a câmera mostra a frente. Os recortes giram para encarar a câmera (billboard).

## Forma (para o plano)

- **`palco3d.js`:**
  - `cameraFor(v, F)` com o enquadramento da mesa e o yaw;
  - a mira não move a câmera;
  - billboard com `--ry` nos `.bb`;
  - `unitKind` dependente da câmera.
- **`leque.js`:**
  - `cands()` devolve todos os candidatos (o jogador não recebe os ocultos);
  - a mira abre no lado natural;
  - Tab alterna os lados;
  - confirmação dupla fora do lado natural;
  - `hover`/`clickTgt` aceitam aliados.
- **`eventos.js` (`goAct`):** libera mirar quem caiu. O servidor já resolve área pelo lado do alvo, mas o plano precisa conferir se `rules.js` lida bem com inimigo abatido como alvo.
- **`hud.js`:**
  - `HUD.html({ gm: true })` no lugar de `HUD.gm()`;
  - os pedidos ficam numa faixa do palco;
  - minimapa com `drag` para tudo quando for o mestre e clique no ponto escolhendo o alvo.
- **`tela.js`:** o mestre monta `battle(true, HUD.html({gm:true}) + LEQUE.html(...))`, e o CSS ajusta `.hudw` dentro de `.gstage`.
- **Testes:** `tools/test.js` para `cameraFor` (todos no quadro, yaw para o centro) e para a lista de candidatos.

## Deixado para quem constrói

Fica para quem constrói:
- as constantes do recuo, da altura e da margem do quadro;
- a tecla e o botão exatos da confirmação dupla;
- onde fica a faixa de pedidos no palco do mestre;
- o tempo da transição da câmera entre turnos.

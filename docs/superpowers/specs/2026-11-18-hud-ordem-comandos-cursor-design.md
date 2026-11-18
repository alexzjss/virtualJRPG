# HUD do palco 3D: ordem estilo FFX, comandos no canto do grupo e mão de mira — design

Data: 2026-11-18 · Status: aguardando aprovação · Tamanho: mudança pequena (só cliente, sem servidor)

## Por quê

No palco 3D, a ordem de turnos é uma coluna de retratos sem nome e não se lê como um JRPG. Defender, Concentrar, Coragem e Passar viraram dicas soltas no rodapé esquerdo, e a lista de alvos com HP do painel antigo sumiu. Ao passar o mouse, o inimigo ganha o mesmo brilho dourado de quem está na mira, e por isso não dá para saber qual alvo está sendo escolhido.

## Objetivos

- Ordem de turnos legível, no estilo FFX, no canto superior esquerdo.
- Todos os comandos de turno no canto inferior direito, junto do status do grupo.
- Um único marcador inequívoco de alvo: a mão ☞ com o nome.

**Não-objetivos:** celular (≤ 700 px, segue com `battle()` + `command()`), servidor, câmera, leque de pinceladas (Atacar/Skills/Itens/Mirar parte continuam onde estão).
**Anti-objetivos:** dois marcadores de alvo ao mesmo tempo; revelar o HP numérico de inimigo ao jogador.

## Abordagens

1. **Mexer na HUD e no leque existentes (escolhida).** `hud.js` redesenha a ordem e o canto inferior direito; `leque.js` passa a trocar o alvo no hover; a mão é um elemento da HUD posicionado pelo `PALCO3D.rectOf`, como a ficha do alvo.
2. Mão como cursor CSS (`cursor: url(...)`). Descartada porque não mostra nome, não marca o alvo mirado pelo teclado e não funciona na mesa.
3. Mão dentro do mundo 3D (filho do `.bb`). Descartada porque escala com a profundidade e balança com a câmera, além de exigir mudanças no `palco3d.js`.

## Decisões do dono

### Ordem de turnos (canto superior esquerdo)
- Lista estilo FFX: uma plaqueta por combatente, só com o **retrato pequeno e o nome**. Vale a cor do lado (ouro para herói, vermelho para inimigo).
- O atual fica no topo, numa plaqueta maior com o selo **AGORA**. Depois vêm os próximos (os mesmos 8 de `timeline(8)`).
- Mantém (minha proposta): a prévia ao vivo, com a plaqueta tracejada "VOCÊ" e a linha de motivo; o realce cruzado ao passar o mouse (plaqueta ↔ recorte); e o escurecimento fora da vez.

### Canto inferior direito (de baixo para cima)
1. **Grupo** (já existe, sem mudança).
2. **Fileira de comandos** logo acima do grupo: (4) Defender, (5) Concentrar, (6) Coragem, (8) Ataque Total quando houver e (7) Passar, mais **Esc Voltar** no fim quando há submenu. Ficam no estilo de pinceladas e botões clicáveis com a tecla no círculo.
   - Quando o pedido aguarda o mestre, o selo "Aguardando o mestre · ação → alvo" com **Esc Cancelar** **substitui** a fileira.
   - Na vez de outro, a fileira mostra só "Vez de {nome}", apagada.
3. **Lista de alvos**, só durante a mira, acima da fileira: `◀ [Golem 80%] [☞ Lobo 45%] [Oni 100%] ▶`. Os candidatos são os de `cands()` do leque (inimigos, ou heróis nas skills de aliado). O HP do inimigo aparece em %, e o mestre vê os números. O alvo atual leva a ☞, e clicar num item troca o alvo.
- O rodapé esquerdo fica vazio.

### Mão ☞ no palco
- **Uma mão só = o alvo atual.** Durante a mira, ela fica ao lado do recorte do alvo, pulsando, com uma etiqueta de nome acima.
  - **Passar o mouse num candidato troca o alvo na hora** (a ficha, a prévia e a barra do topo acompanham).
  - Um clique confirma, igual ao Enter. ←→ também move a mão.
  - O brilho dourado atual da mira (`.bb.tgt`) sai, porque a mão o substitui.
- **Fora da mira** (no menu ou na vez de outro): passar o mouse sobre um inimigo mostra a mão e o nome, sem trocar nada. O clique continua abrindo o zoom.
- Em cima de um recorte, o cursor do sistema some (`cursor: none`) e a mão fica no lugar dele.
- Vale também para heróis quando eles são candidatos (skills de aliado).

### Mestre
- Quando o leque do mestre está aberto (vez de inimigo, de herói ausente ou de invocação), ele ganha a mesma fileira de comandos e a mesma lista de alvos no canto inferior direito, agindo pelo ator do leque.

## Fica para quem implementa (minhas decisões)

- **Mão:** desenho em SVG inline, branca com contorno preto, apontando para a direita, na paleta atual. A etiqueta de nome usa a fonte Anton. Ela fica à esquerda do recorte; à direita se não couber.
- **Posição da mão:** reposicionada no mesmo gancho de `HUD.place()`, que é chamado de novo depois da câmera (~1,1 s).
- **Mesa (`/table`):** recebe a nova ordem e a mão em modo só leitura, sem fileira e sem lista.
- **Hover:** para não trocar de alvo sem querer ao cruzar o palco, a troca no hover só vale sobre o recorte (`.bb[data-tgt]`), não sobre a sombra nem a mini barra.
- **Testes:** `tools/ui-smoke.js` ganha seletores para a ordem nova, a fileira no canto inferior direito, a lista de alvos na mira e a mão.

## Arquivos

- `public/js/hud.js`: `ordem()` (plaquetas FFX), `dicas()` vira a fileira do canto inferior direito, lista de alvos, mão e etiqueta, `place()` posiciona a mão, `gm()` ganha fileira e lista.
- `public/js/leque.js`: troca do alvo no hover durante a mira e clique que confirma; exporta `cands()` para a lista.
- `public/style.css`: estilos de `.hud-order`, `.ot`, da fileira e da lista em `.hud-br`, da mão `.hand`, e remoção do brilho de `.bb.tgt`.
- `tools/ui-smoke.js`.

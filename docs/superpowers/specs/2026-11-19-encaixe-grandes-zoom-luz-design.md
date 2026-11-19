# Encaixe do seletor, zoom e luz com personagens grandes — design

## Intenção
Com chefes e heróis de `imgS` alto (figura até 2,5× e chefe ×1,6, ou seja até ~1200 px), a coluna de comandos cobre o corpo ou fica solta, a 2ª coluna (Skills/Itens) não cabe, e a câmera não enquadra o corpo inteiro. Também melhorar a luz do cenário e fazê-la reagir ao turno.

## Objetivos
- Coluna de comandos sempre ao lado do recorte, sem cobri-lo, colada ao corpo, com a 2ª coluna cabendo.
- Câmera do turno e zoom proporcionais à altura real da figura (corpo inteiro com folga); câmera recua e desloca o recorte para abrir a faixa da coluna.
- Luz "anime luminoso": holofote em quem age, tinta do elemento no cenário, sombra viva sob cada figura, hora do dia por cena.

## Não objetivos
Responsividade geral da UI (sem prioridade do usuário), controle novo de hora do dia na mesa do mestre, mudança das vistas V além de usar a altura real.

## Restrições
- Desempenho primeiro: só véus, gradientes e sombras baratas; nada de `filter` em camadas 3D; planos grandes a 1/4 com `scale(4)` ([[palco-camera-perf]]).
- Qualidade Baixa: só sombra simples e holofote, sem tinta e sem sombra viva animada.
- Sem stash; outra sessão edita o mesmo checkout. Commit só dos arquivos/trechos alterados aqui.
- Testes: `tools/test.js` e captura no navegador com chefe grande em várias larguras.

## Abordagens
A (escolhida): medir a figura de verdade e reservar faixa lateral na câmera. B: só folga maior no `leque.js` (coluna sai da tela com chefe grande). C: módulo central de layout (reescrita grande, risco nas vistas).

## Como (decidido)
1. **Altura real nos pontos da câmera.** Hoje `view()` passa `F.values()` (só x,z) e `fitCam` assume 330 px. Passar `h` de cada figura (`--h` via `ptOf`) em `pts` para `table`, vistas de fora, `two`, `wide`, `select`.
2. **Faixa da coluna.** `table` recebe `lane` (largura em px da coluna a 75% × `--hk`, ~560 reservada com a lista aberta) e a lado oposto ao recorte desloca o quadro; recua (`tz`) até caber a figura mais alta. O mesmo `lane` entra em `fitCam` como margem lateral.
3. **Zoom proporcional.** `kind:'zoom'` troca `tz: -T.z - 420` por distância derivada da altura da figura-alvo (corpo inteiro com folga), com piso e teto para não atravessar nem ficar minúsculo.
4. **Leque.** `leque.js` escolhe o lado em que coluna cabe sem tocar o recorte (usa a largura reservada com a lista aberta); `GAP` proporcional à altura do recorte; âncora vertical pelo ombro (proporção da altura) em vez de fixa; se nenhum lado cabe, reduz a coluna por último.
5. **Luz.** Véu de holofote (escurece levemente os demais), tinta do elemento via véu `::after` (estende `P.light`), `<i class="shadow">` por figura acompanhando salto/investida, e paleta de hora do dia (dia/entardecer/noite) aplicada ao céu e ao véu do cenário.

## Hora do dia (minha escolha)
Campo de cena se já existir; senão automático por cenário (bosque, pátio, praia). Sem controle novo.

## Etapas e commits
1. Câmera: altura real, faixa, zoom proporcional. 2. Leque: encaixe lateral e 2ª coluna. 3. Luz: holofote, tinta, sombra viva, hora do dia.

## Fica para o construtor
Constantes (folgas, piso/teto do zoom, intensidades da luz) e testes em Node para `cameraFor` com `h` grande.

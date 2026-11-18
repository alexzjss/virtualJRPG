# Palco 3D segue o grid — design

Data: 2026-11-18 · Status: aguardando aprovação

## Por quê

Hoje o palco 3D (`public/js/palco3d.js`, `formation()`) põe os heróis em 4 lugares fixos e os inimigos num arco fixo. A posição dos tokens no mapa da cena (`c.x, c.y`, grade `cols × rows`, `sc.unit` metros por casa) não aparece em nada. O dono quer que a posição no grid mude de verdade onde cada um fica no 3D: o lado, a distância, quem está perto de quem.

## Objetivos

- A formação 3D sai do grid: posição relativa, lados e distâncias proporcionais, comprimidos num palco legível.
- O movimento durante a batalha desliza o recorte até o novo lugar.
- Dá para mover o token durante a batalha sem sair do 3D, por um minimapa na HUD.
- O chão mostra a grade, o anel do pé e a linha de alcance na mira.

**Não-objetivos:** efeito nas regras (alcance, flanco, fileira, cobertura). O motor e o simulador não mudam. Celular.

**Anti-objetivos:** o mundo inteiro girar quando alguém anda; inimigos virarem pontinhos no horizonte; recortes tampando uns aos outros.

## Abordagens consideradas

1. **Projeção no cliente com eixo fixado no servidor (escolhida).** O servidor guarda só o eixo (`S.battle.ax`), fixado ao começar a batalha e refeito pelo botão "Reenquadrar" do mestre. O resto (projeção, compressão, afastamento) é uma função pura em `palco3d.js`, testada no Node. Assim todos veem o mesmo enquadramento sem mexer nas regras.
2. Eixo calculado no cliente a cada desenho: dispensa mudar o servidor, mas ou gira ao vivo (anti-objetivo) ou cada cliente pode fixar um eixo diferente, conforme quem entrou quando.
3. Posições 3D calculadas e guardadas no servidor: duplica estado que já vem do grid e acopla o visual ao estado salvo.

## Decisões do dono

- **Fidelidade:** proporcional comprimido. As distâncias relativas e os lados valem, encaixados num palco de tamanho fixo.
- **Eixo:** automático. A linha do centro dos heróis ao centro dos inimigos (no grid) vira a profundidade, e a perpendicular vira a lateral. É calculado **no início da batalha** e o mestre pode **reenquadrar**. Mexer tokens não gira o palco.
- **Escala:** a distância entre os centros dos grupos vira profundidade entre ~900 e ~2600px (com limite mínimo e máximo). A largura é limitada ao campo da câmera.
- **Movimento:** o recorte desliza (~0,6 s) até a nova posição, e a câmera acompanha se for o ator da vez.
- **Sem posição** (`x == null`): usa os slots da formação atual, ancorados no centro do seu lado, sem colidir com os outros.
- **Colisão:** distância mínima entre recortes. Os vizinhos são empurrados para os lados e mantêm o lugar geral.
- **Misturados:** cada um fica onde está, com o eixo dos grupos mantido. A câmera de ombro vai até o ator na vez dele.
- **Facing:** como hoje. Herói de costas, inimigo de frente.
- **Chão:** grade sutil em perspectiva (respeita "Grade visível" da cena), anel colorido sob cada recorte e, ao mirar, linha do atacante ao alvo com a distância em casas e em metros (quando `sc.unit > 0`).
- **Minimapa:** fica sob a coluna de ordem, no canto superior esquerdo, com ~180px, e pode ser recolhido (a escolha fica lembrada). As permissões são as do mapa 2D: o jogador move os próprios tokens e o mestre move todos. A névoa e os ocultos seguem as mesmas regras, e na tela da mesa ele é só leitura. Usa o handler `move` que já existe.
- **Investida:** continua até o alvo, com a duração proporcional à distância. O avanço fixo de +900 do inimigo na vez dele passa a ser "anda metade do caminho até o centro dos heróis".
- **Entrega:** direto no main, um commit por etapa.

## Forma (para o plano)

- Servidor: `S.battle.ax = { a, cx, cy }` (ângulo e centro em casas), gravado ao ligar a batalha e na ação nova do mestre `battleReframe`. Batalha antiga sem `ax` usa o eixo calculado na hora.
- `palco3d.js`: `formation(chars, ax, sc)` pura → `Map(id → {x, z})`. Passos: girar para o eixo → normalizar a profundidade entre os centros para [900, 2600] → limitar a lateral → separar os vizinhos → encaixar os sem-posição. Testes em `tools/test.js`.
- `cameraFor` não muda de forma: já recebe `at/to` em coordenadas do mundo.
- Chão, anel e linha: elementos novos dentro do mundo 3D. Minimapa: módulo pequeno na HUD, reaproveitando o desenho de tokens do `palco.js` quando der.

## Deixado para quem constrói

As constantes exatas (px por casa da lateral, distância mínima, duração), o visual fino do anel e da linha e a tecla de recolher o minimapa, que não pode colidir com as teclas atuais.

# Cenários novos e horário do dia (dia, tarde, noite)

Data: 2026-11-19

## Intenção

Aumentar a variedade dos fundos de batalha 3D, que hoje são Bosque, Pátio do castelo e Praia (`public/js/terreno3d.js`), e dar ao mestre um horário por cena: dia, tarde ou noite. O estilo continua o mesmo, anime vibrante e saturado, com cel shading, recortes que giram para a câmera e horizonte em camadas de silhueta. A regra de desempenho também não muda: nada de clip-path ou máscara em camadas 3D, poucas camadas animadas e 60 quadros por segundo na GTX 1650.

## Metas

- 7 cenários novos, todos com os três horários:
  - **Montanha nevada** (`neve`): picos brancos no horizonte, pinheiros com neve, pedras, chão de neve com trilha pisada.
  - **Deserto com oásis** (`deserto`): dunas, lagoa com coqueiros, ruínas de arenito, céu bem aberto.
  - **Caverna de cristais** (`caverna`): paredes de rocha fechando o palco, cristais coloridos que brilham, teto escuro.
  - **Ruínas antigas** (`ruinas`): colunas quebradas, arcos com hera, escadaria, grama alta entre as pedras.
  - **Pântano** (`pantano`): água parada escura, árvores retorcidas, vitórias-régias, névoa baixa.
  - **Vulcão** (`vulcao`): rocha preta, rios de lava brilhando, céu avermelhado, brasas subindo.
  - **Campo florido** (`campo`): colina aberta, manchas de flores, moinho ao longe, cerca de madeira.
- Os três cenários atuais também ganham tarde e noite.
- O mestre escolhe o horário por cena e todos veem o mesmo.
- À tarde e à noite, heróis e inimigos pegam o tom da luz: laranja à tarde, azulado à noite.

## Fora do escopo

- O sol e a lua não mudam de lugar e as sombras não mudam de direção, porque a luz vem sempre do mesmo lado.
- Nada de estrelas animadas, vaga-lumes nem luzes acesas (janelas, tochas).
- Nada de ciclo automático do horário.
- Nada de áudio.

## O que não pode acontecer

- Perder quadros por segundo por causa do horário. Por exemplo, um `filter` aplicado no grupo 3D achata a profundidade, e um filtro peça por peça custa caro.
- Quebrar campanhas salvas que usam `floresta-dia`, `castelo-dia` ou `praia-dia`.
- Um cenário "noite" tão escuro que não dê para ler a luta.

## Abordagens consideradas

1. **Paleta por horário, pintada ao montar (escolhida).** Toda cor que o terreno gera (materiais, SVG do chão, horizonte, recortes) passa por uma função de gradação do horário. O céu tem degradês próprios para cada horário. Não custa nada durante a luta, porque o cenário já é remontado quando o fundo muda.
2. **Filtro CSS sobre a cena.** Descartada: no grupo `preserve-3d`, o filtro achata o 3D, e por elemento é caro demais.

**Onde guardar o horário (escolhido):** no próprio id do fundo, no formato `tema-hora`, por exemplo `vulcao-noite`. O servidor e o estado já validam `sc.bbg` por lista. A alternativa era um campo `sc.hora` separado, que exigiria mexer no servidor, no estado e na migração.

## Decisões

- **Ids:** `{floresta, castelo, praia, neve, deserto, caverna, ruinas, pantano, vulcao, campo} × {dia, tarde, noite}`, 30 ids no total. Ficam em `BBG` em `src/consts.js` e em `public/js/palco.js`. Os nomes exibidos são o tema mais o horário, por exemplo "Vulcão · Noite".
- **Migração (`src/state.js` `migrateBackdrop`):** um id cuja família é um tema conhecido e cujo horário é válido fica como está. Família conhecida com horário inválido vira `-dia`. Família desconhecida continua indo para `floresta-dia`, como hoje.
- **Seletor do mestre (`public/js/tela.js`):** uma fileira com Dia, Tarde e Noite e, abaixo, as 10 miniaturas no horário escolhido. Clicar num horário troca só o sufixo do fundo atual. Clicar numa miniatura mantém o horário atual. Se o fundo for "Mapa da cena" ou uma imagem, o horário escolhido é guardado só no navegador do mestre e vale para a próxima miniatura clicada.
- **Miniaturas:** 10 temas × 3 horários, geradas em SVG por `thumbs()` com a mesma gradação.
- **Terreno:** `TERRENO3D.montar(parent, tema, q, hora)`. Se `hora` não vier, o terreno lê o `data-biome` do `.p3d` mais próximo, de modo que `palco3d.js` não precisa mudar. A semente continua fixa por tema.
- **Gradação:**
  - Dia: as cores atuais.
  - Tarde: tons quentes e dourados, sombras puxando para o magenta, céu do laranja ao rosa e ao lilás, sol laranja grande perto do horizonte, no mesmo lado (esquerda) de hoje.
  - Noite: tudo escurecido e azulado (cerca de 45% de luminância), sombras azul-marinho, céu do azul-marinho ao índigo, lua clara no lugar do sol e algumas estrelas pintadas no SVG do céu, sem animação.
  - O que emite luz própria não é escurecido (lava, cristais, água do oásis à noite, brasas). Fica marcado como "luminoso" e escapa da gradação. Isso não conta como "luzes acesas": é a cor própria do material.
- **Caverna:** não tem céu. O horário só muda um pouco o tom das paredes e da entrada de luz.
- **Personagens tingidos:** CSS em `style.css` por `.p3d[data-biome$="-tarde"]` e `.p3d[data-biome$="-noite"]`. Uma camada de cor com `mix-blend-mode` sobre a figura (ou um `filter` leve só na imagem da figura, que é uma folha, não um grupo 3D) dá laranja suave à tarde e azul à noite. Vale manter a figura do turno atual (`.cur`) um pouco mais clara à noite, para continuar legível. O desempenho deve ser medido.
- **Partículas por tema:** a lógica atual de `ceuVivo` continua, com tipos novos: neve caindo leve (neve), poeira (deserto, ruínas), brilho (caverna), névoa e bolhas (pântano), brasas (vulcão), pétalas (campo). As quantidades seguem a qualidade e a regra de poucas camadas.
- **Recorte e câmera:** todo cenário respeita `inArena` (o centro da luta fica livre), espalha peças em 360° e põe as peças grandes em `B.group`, para sumirem quando taparem a câmera.

## Restrições

- Não editar `public/js/palco3d.js` nem `tools/test.js`: outra sessão está mexendo neles. Os testes novos vão para `tools/test-terreno.js`.
- Sem stash, e cada commit leva só os arquivos desta tarefa.
- Medir os quadros por segundo com o Playwright em high, nos cenários novos e à noite.

## Fica a cargo de quem constrói

- A composição exata de cada cenário, ou seja, quantas peças e onde, dentro do orçamento de camadas do Bosque atual.
- A curva exata da gradação (hue, saturação, luminância), desde que a luta continue legível à noite.
- A arte das miniaturas.

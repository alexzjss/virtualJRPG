# Refino do combate: escudo, status por golpe e dano no impacto

## Por quê
Auditoria do motor (`src/rules.js`) achou contas erradas no escudo e no status de golpes de várias batidas, e a tela mostra o dano fora de hora: a barra de HP desce num tempo fixo (460 ms) enquanto o número só nasce no impacto da animação.

## Decisões (aprovadas)
- **Escudo soma até um teto:** escudos novos somam ao atual, até 50% do HP máximo do alvo.
- **Duração igual:** 3 turnos de verdade, inclusive lançado em si mesmo no próprio turno (+1 como já faz `st`).
- **Escudo não vaza:** o que o escudo absorve não fere a parte do corpo, não conta no placar de dano, não alimenta dreno nem reflexo. Dano mental segue ignorando o escudo.
- **Status 1× por golpe:** golpe de várias batidas aplica efeitos `st` só na última batida; contra-ataque e cadeia seguem aplicando.
- **Barra de escudo:** trecho azul-claro sobre a barra de HP (palco e HUD), largura = escudo / HP máx.
- **Renomear:** "◆ Escudo (Quebra)" do HUD vira "Quebra".
- **Caminho A, dano no impacto:** a barra (e o rastro) fica presa no valor antigo e desce no `hit1` da coreografia, em degraus no multi-hit; uma trava solta a barra se nenhum impacto chegar.

## Abordagens consideradas
- A (escolhida): barra presa até o impacto — sempre em sincronia, mais código no cliente.
- B: estimar o atraso — simples, mas desalinha quando câmera/animação variam.
- Mover no clique: descartado, o servidor decide o acerto.

## Fora do escopo
Áudio, novas mecânicas de defesa, balanceamento de números.

## Para quem constrói
Testes em `tools/test.js` para soma/teto/duração/vazamento do escudo e status único; verificar no navegador o palco com escudo e multi-hit.

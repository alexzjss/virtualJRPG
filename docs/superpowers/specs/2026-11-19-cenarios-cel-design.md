# Cenários em cel shading de JRPG 3D

Data: 2026-11-19. Aprovado a partir da demo do Bosque (chave `vj_terr_estilo=cel`).

## Intenção

Os cenários pareciam "desenho simples/infantil". O usuário escolheu cel shading de JRPG 3D: contorno escuro, dois tons duros, rim light e mais clima. Ele também apontou quatro incômodos: árvores-bolinha, cores chapadas, céu e horizonte simples e falta de luz e clima. A qualidade alta pode gastar um pouco mais; low e medium continuam leves.

## Abordagens

1. **Contorno e tons pintados na arte (escolhida).** O SVG já sai com contorno, tons duros e rim light. Nenhuma camada 3D a mais, e o custo fica na rasterização, uma vez só.
2. Filtro CSS ou "casca" duplicada para o contorno: descartada, porque achata o 3D ou dobra as camadas.

## Decisões

- **Estilo padrão:** cel vale para todos os 10 temas e todos os horários. `localStorage vj_terr_estilo = simples` volta ao estilo anterior, como saída de emergência.
- **Contorno dos recortes:** os SVG dos recortes (troncos, pedras, palmeiras, torres, chafariz, barris, pinheiros, cristais, pilares, arcos, árvores retorcidas, espinhos, tufos, portão, estandartes) ganham contorno de silhueta por filtro SVG *dentro* da imagem (`feMorphology`), na cor `#1c3038`. Faces retangulares ganham borda interna de 2 px.
- **Bolinhas:** toda copa e todo arbusto feitos de bolas (`blob`) viram tufo de folhagem recortado, com contorno, luz em cima, sombra embaixo e rim light. Os cogumelos continuam redondos. As árvores de copa redonda (Bosque e Campo) usam a árvore cel de um recorte só.
- **Céu:** as nuvens do horizonte, do teto e as que andam viram cúmulos cel. Entra névoa de distância entre as camadas de montanha, as linhas de silhueta próximas ganham contorno e o sol (dia e tarde) solta raios pintados.
- **Cores:** a saturação geral cai 10% (`grade`, também de dia). Cores marcadas com `!` não mudam. As sombras no chão ficam mais firmes e puxadas para o azul.
- **Qualidade alta:** feixes de luz nos temas abertos com árvores (Bosque, Campo, Ruínas, Pântano). Na Caverna, os feixes descem da boca de luz.
- **Fora do escopo:** animação nova, recriar a geometria dos temas, mexer no tom dos personagens.

## Restrições

As mesmas de antes: sem clip-path ou máscara em camadas 3D, número de peças em high no máximo 1,25 × o da floresta, `tools/test-terreno.js` passando. Não tocar em `palco3d.js` nem em `tools/test.js`.

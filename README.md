# virtualJRPG
Mesa virtual de RPG com regras próprias (d100, CTB, Aura/Sanidade/Limite).

    npm install && npm start        # GM_KEY=suachave PORT=3000 opcionais

- `/gm` — painel do mestre (chave padrão `mestre`; troque com `GM_KEY`)
- `/player` — fichas do jogador (nome + senha criada no primeiro acesso)
- `/table` — mesa compartilhada (mapa 2D + batalha JRPG), somente leitura

Chat: texto livre, `/r 2d6+1` para rolar, `/w nome mensagem` (ou `/w mestre …`) para sussurrar.
Estado e uploads ficam em `data/`.

## Atalhos no PC
- Mapa: roda do mouse = zoom, botão do meio ou Espaço+arrastar = mover, `0` = recentrar
- Alt+arrastar = régua em casas; duplo clique no mapa = ping para todos
- Clique direito no token = menu; duplo clique no token = abrir a ficha
- Batalha: `1`–`9` = comandos, Tab = trocar alvo, Enter = chat, Esc = fechar/cancelar
- Mestre: Shift+clique em Exploração/Batalha/Preparo salva o arranjo de janelas atual

## Balanceamento
Os números ficam em `R` no topo de `server.js`. `node tools/sim.js 500` simula batalhas 4x4 com as regras reais;
`VJ_RULES='{"enemyAttr":45}' node tools/sim.js` testa uma variação sem editar o código.

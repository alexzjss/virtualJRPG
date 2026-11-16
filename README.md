# virtualJRPG
Mesa virtual de RPG com regras próprias (d100, CTB, Aura/Sanidade/Limite).

    npm install && npm start        # GM_KEY=suachave PORT=3000 opcionais

- `/gm` — painel do mestre (chave padrão `mestre`; troque com `GM_KEY`)
- `/player` — fichas do jogador (nome + senha criada no primeiro acesso)
- `/table` — mesa compartilhada (mapa 2D + batalha JRPG), somente leitura

Chat: texto livre, `/r 2d6+1` para rolar, `/w nome mensagem` (ou `/w mestre …`) para sussurrar.
Estado e uploads ficam em `data/`.

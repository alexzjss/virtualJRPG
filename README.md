# virtualJRPG
Mesa virtual de RPG com regras próprias (d100, CTB, Aura/Sanidade/Limite).

    npm install && npm start        # GM_KEY=suachave PORT=3000 VJ_TUNNEL=0 opcionais

**Jeito rápido, sem executável:** dê dois cliques em `iniciar.bat` (Windows) ou rode `./iniciar.sh` (Linux/macOS). Os scripts instalam as dependências na primeira vez, criam a chave do mestre em `data/gm-key.txt` e sobem o servidor com o túnel do Cloudflare. Precisam do Node.js 22 ou mais novo.

- `/gm` — painel do mestre (chave padrão `mestre`; troque com `GM_KEY`). A janela **Sessão** cria as contas e copia o convite.
- `/player` — fichas do jogador (login e senha criados pelo mestre)
- `/table` — mesa compartilhada (mapa 2D + batalha JRPG), somente leitura; entra com a conta de um jogador ou login `mestre` + chave
- `docs/index.html` — página fixa de entrada (GitHub Pages): o jogador digita o código da sessão, o login e a senha

Ao iniciar, o servidor abre sozinho um túnel gratuito do Cloudflare (baixa o `cloudflared` na primeira vez) e mostra o **código da sessão**. Veja `GUIA-RODAR.md`.

Chat: texto livre, `/r 2d6+1` para rolar, `/w nome mensagem` (ou `/w mestre …`) para sussurrar.
Estado e uploads ficam em `data/`.

## Pedidos e aprovação do mestre
Rolagem de atributo, ação de combate (ataque, skill, item), aprender skill, itens fora de combate (usar, equipar, comprar, vender, forjar, descartar) e ações de acampamento do jogador viram **pedidos**. Mover o token e passar a vez não pedem aprovação.
- O mestre vê os pedidos numa faixa fixa no alto: **Aprovar** (Enter), **Negar** (Delete), negar com motivo, bônus ou penalidade (−20 a +20) e, nas rolagens, **Secreta**.
- "Aprovar sozinho" liga ou desliga a aprovação por tipo (rolagens, combate, skills, itens, acampamento).
- Cada jogador tem um pedido por vez e pode cancelar. Pedido de combate some se a vez passar.
- HP, Aura, Sanidade e Limite só o mestre altera.

## Ferramentas do mestre
- Na janela **Fichas**, clique em qualquer número para editar (aceita `+5` ou `-12`). Clique nas fichas para selecionar e aplique dano, cura, Aura, Sanidade, XP, ouro, condição ou item a todas de uma vez.
- Na ficha aberta: clique no número do atributo para editar e na sigla para rolar; busca por nome para entregar itens e dar ou tirar skills sem custo.
- **Ver como** abre a tela de um jogador em outra aba, só para olhar.

## Batalha: fundo, intensidade e efeitos
- Na janela **Cena**, "Fundo da batalha" escolhe um tema pronto (Rubro, Noite, Floresta, Brasa, Gelo, Vazio, Santuário, Tempestade), o mapa da cena ou uma imagem própria (link ou envio). Vale por cena.
- O palco muda com o estado do combate: grupo ferido deixa o fundo mais vermelho e rápido ("tensão"); grupo no limite, herói caído ou chefe de pé vira "perigo".
- Cada ação mostra os dados num painel (o que era preciso tirar e o veredito) e só então o palco aproxima em quem age e nos alvos, com o golpe, o número e o carimbo de crítico ou fraqueza.
- **Assumir** (janelas Fichas e Sessão) abre a tela de um jogador para o mestre jogar por ele, sem fila de pedidos. Personagens sem dono o mestre controla pela janela Batalha e pela ficha.

## Atalhos no PC
- Mapa: roda do mouse = zoom, botão do meio ou Espaço+arrastar = mover, `0` = recentrar
- Alt+arrastar = régua em casas; duplo clique no mapa = ping para todos
- Clique direito no token = menu; duplo clique no token = abrir a ficha
- Batalha: `1`–`9` = comandos, Tab = trocar alvo, Enter = chat, Esc = fechar/cancelar
- Mestre: Shift+clique em Exploração/Batalha/Preparo salva o arranjo de janelas atual

## Balanceamento
Os números ficam em `R` no topo de `server.js`. `node tools/sim.js 500` simula batalhas 4x4 com as regras reais;
`VJ_RULES='{"enemyAttr":45}' node tools/sim.js` testa uma variação sem editar o código.

## Testes e segurança dos dados
- `npm test` roda os testes de regras e permissões; `npm run sim` roda o simulador de balanceamento; `npm run ui` abre o jogo no Chromium (Playwright) com mestre, jogadores e mesa e confere batalha, pedidos, acampamento, Ofícios e celular.
- A cada início o servidor copia `data/state.json` para `data/backups/` (guarda as 10 últimas).
- O mestre tem o botão **Desfazer** (até 20 ações) na janela Cena.

## Conteúdo padrão
`content.js` gera a grade de skills (1341 nós), o catálogo de itens (66, com materiais de forja), o bestiário (22 inimigos + 9 chefes + o trio da Tempestade Ígnea), 4 cenas de exemplo com mapa e loja própria, e os veículos de perseguição.
Campanhas já salvas mantêm o conteúdo antigo: use **Restaurar padrão** nas janelas Skills, Itens e loja ou Cena (bestiário) para carregar o novo.

## Vínculos e personagens base
Cada caçador tem um ou mais **Vínculos** (Kagutsuchi, Susanoo, Atlas, Indra, Fuhaku, Amaterasu, Tsukuyomi, Shukketsu, Hiruko). Ele só aprende o tronco Marcial e as skills dos próprios Vínculos, e resiste ao elemento deles. O mestre concede Vínculos na aba **Mestre** da ficha.
A árvore (1341 nós: 90 por Vínculo em 9 ramos, 157 marciais, 110 de Aura e 110 de Ocultismo; veja `REVISAO-ARVORE.md`) fica em `tree.js` e na pasta `arvore/`; `content.js` só a distribui na grade.

## Árvore expandida: transformações, rituais, votos e mais
Além de dano, cura e condições, os nós agora têm efeitos compostos e sistemas próprios: transformações (uma por vez, com dreno por turno e efeito colateral), golpes concentrados, multi-golpe e ricochete, roubo de vida, detonar condições, execução, escudo, regeneração, purificar, reerguer caídos, contra-ataque, reflexo, esquiva, provocar, guarda-costas, selos que explodem depois, invocações que agem sozinhas, técnicas em dupla, votos e restrições, rituais em círculos com versões Discente e Verdadeiro, e passivas com gatilho. A descrição mecânica de cada nó aparece na grade.
- Todos aprendem o tronco **Aura** (seis categorias em hexágono: a primeira aprendida vira a natureza do personagem; as outras rendem menos e custam mais XP).
- O tronco **Ocultismo** e os nós mais fortes pedem um **Despertar**, que o mestre concede na aba Mestre da ficha (lá também dá para trocar a natureza de Aura).
- Rituais gastam Aura e Sanidade; um **Componente Ritualístico** no inventário corta a Sanidade pela metade.
- Referência completa das mecânicas e da notação dos nós: `ARVORE-SISTEMAS.md`.
Campanha nova começa com Shinkai (Indra), Mikhail (Fuhaku) e Thomas (Hiruko), sem dono: o mestre liga cada um a uma conta na janela **Sessão**.

## Mapas
Na janela **Cena** o mestre cola um link ou envia uma imagem, usa **Recortar área** para escolher o trecho exibido, ajusta **Casas na largura** e o deslocamento da grade para casar com a arte, e pode **Fixar minha vista para todos**.

## Bestiário e migração
A janela **Bestiário** do mestre tem cartões com busca e filtros, criação em quantidade e por nível, encontros salvos, contratos e edição de modelos (abre a ficha do modelo).
Quando `tree.js` muda, o servidor troca a grade ao iniciar: skills aprendidas ficam se o nome ainda existir; as que sumiram devolvem o XP. Edições feitas na janela Skills são substituídas nessa troca.

## Dificuldade e criação de inimigos
Na janela **Bestiário**, "Criar sob medida" gera um inimigo pelo elemento, papel (bruto, ágil, conjurador, suporte) e patente (lacaio, comum, elite, chefe); os números saem do poder do grupo que está na cena. "Encontro automático" monta um grupo inteiro por dificuldade.
Os parâmetros ficam em `R.rank`, `R.diff` e `R.grow` no topo de `server.js`. Para medir: `node tools/sim.js 200 enc` (encontros) e `node tools/sim.js 200 boss` (chefes).

## Requisitos e bifurcações da árvore
Em cada ramo de 10 nós, os quatro primeiros são o tronco; do nó 4 saem o caminho A (atributo principal do Vínculo) e o caminho B (atributo secundário). As entradas dos caminhos e o nó final têm requisito de atributo (`rq` em `tree.js`).
Sanidade em 0 é Colapso: o personagem ataca os próprios aliados até recuperar Sanidade. Quem perde um turno por controle fica imune a novo controle por dois turnos.

## Sistemas de batalha e de mesa novos
Veja `ARVORE-SISTEMAS.md` (mecânicas) e `DECISOES-SISTEMAS.md` (o que foi decidido).
- **Batalha:** barra de Quebra (chefes e elites), Cadeia, Ataque Total, Passar a Vez, Coragem, Tensão, clima por cena, 8 reações elementais, Expansão de Domínio (nó final de cada Vínculo) e técnicas em trio.
- **Mesa:** Aflição e Virtude quando a Sanidade zera, Vantagem e Desvantagem (o mestre escolhe ao aprovar a rolagem), laços entre personagens que sobem no "conversar" do acampamento.
- **Árvore:** slots de passivas (4, mais 1 a cada 100 XP gasto; troca no acampamento), fusões entre Vínculos vizinhos, nós-chave, sinergias Aura × Vínculo, ponte Aura ↔ Ocultismo, busca por efeito e função, caminho até o nó, plano e builds salvas.
- `npm run audit` confere a árvore (nomes repetidos, XP, poder fora da curva, nomes que não cumprem o efeito).

## Forja (aba Forja do inventário)
Duas formas de forjar, ambas fora de batalha e com aprovação do mestre:
- **Forja elemental (aba Forja):** gasta **essências** do elemento da peça mais metade do preço em ouro. Arma = 3 essências, relíquia = 5. Com o Ofício **Forja** (nó de **Economia de Essência**) a arma passa a custar **2** essências. A aba lista só o que a ficha pode forjar e mostra `essências possuídas/necessárias` e o ouro.
- **Forja dos Ofícios (aba Ofícios → Forja):** receitas com materiais da coleta e das cenas, Têmpera (+3 no máximo), até 3 engastes com runas, Liga de duas essências, Assinatura do Ferreiro e Arma Viva. Falha comum perde 1 material; desastre perde metade. Detalhes em `PERICIAS.md`.

## Inimigos com IA opcional
Cada entrada do bestiário pode trazer o campo `ia` (desligado por padrão): `dom` (Expansão de Domínio, 1 vez por combate), `defend` e `focus` (chance de Defender com vida baixa e de Concentrar Tensão com vida alta) e `trio` (técnicas em trio). Hoje: Domínio em Leviatã do Porto, Condessa Escarlate e Filho de Hiruko (só para grupos veteranos); Concentrar/Defender em alguns chefes; trio no Oni de Brasa, Tengu do Vendaval e Raijū. `iaExtra: false` em `R` (ou `VJ_RULES='{"iaExtra":false}'`) desliga tudo. A Cadeia continua só dos heróis. Números e medições em `DECISOES-SISTEMAS.md`.

## Ofícios (perícias)
Aba própria na ficha, separada da árvore de combate. O mestre concede a **Iniciação** em cada uma das 15 perícias (Forja, Alquimia, Culinária, Medicina, Caça, Investigação, Lábia, Pilotagem, Engenharia, Ladinagem, Sobrevivência, Talismãs, Adestramento, Música, Jogos de Azar). Os nós custam **Pontos de Ofício**, ganhos em sucessos nas rolagens da perícia ou dados pelo mestre. Cada perícia tem 3 graus (Aprendiz, Oficial, Mestre) e a rolagem é d100 contra o melhor atributo dela, mais 10/20/30 pelo grau. Detalhes em `PERICIAS.md`.
Na janela Cena o mestre marca os **recursos da cena** (o que a coleta acha) e o clima.
O mestre edita receitas, perícias e nós na janela **Catálogo de ofícios** (sem mexer no código; as edições ficam salvas na campanha). Testes narrativos (Arrombar, Intimidar…) vão para o **diário de testes** da ficha, e o mestre narra o resultado ao aprovar ou depois. A loja vende ingredientes básicos e munição; as runas são receitas da Forja.

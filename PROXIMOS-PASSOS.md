# Próximos passos (instruções para o agente que continuar)

Leia primeiro: `README.md`, `ARVORE-SISTEMAS.md` (mecânicas e notação dos nós), `DECISOES-SISTEMAS.md` (o que o usuário decidiu), `PERICIAS.md` (ofícios), `ARMAS.md` (armas, modelos e criador) e `REVISAO-ARVORE.md`.
O usuário escreve em português; responda e comente o código em português, no estilo existente. Decisões já tomadas não se perguntam de novo: use `AskUserQuestion` só para decisões novas.

## Como trabalhar
- `npm install && npm test` (87 testes devem passar) · `npm run audit` (0 erros; 6 avisos conhecidos: 3 de nomes metafóricos, 2 de poder alto nas Pinças do Marcial e 1 na Postura do Falcão) · `npm run ui` (teste de fumaça da interface com Chromium/Playwright; `UI_SHOTS=pasta` guarda capturas, `UI_ONLY=celular` roda só um bloco) · `node tools/sim.js 60 enc` e `node tools/sim.js 80 boss` para equilíbrio; `node tools/sim.js 300 armas` para o ataque básico de cada arma.
- Compare sempre com a base: encontros (nível 0/1/2, fácil→mortal) estavam em ~90/77/93/73/42/23 e chefes entre 46% e 89%. Variação de ±10 pontos é ruído.
- Toda mecânica nova ganha teste em `tools/test.js`; as de combate passam pelo simulador antes de entrar.
- Mudou `tree.js` ou `arvore/`: a grade é refeita ao iniciar (skills ficam pelo nome). Nomes de nós precisam ser únicos (`npm run audit` confere).
- Arquivos: `server.js` é só a entrada; o motor está em `src/` (`rules.js` combate e fila, `handlers.js` ações dos clientes, `oficios.js` Ofícios, `state.js` estado e migrações, `net.js` HTTP/WebSocket, `campaign.js` campanhas e backups, `consts.js` tabelas, `seed.js`, `auth.js`, `media.js`, `config.js`). Compartilhados com o navegador: `public/rules.js`, `public/oficios.js`, `public/armas.js`. Interface: `public/js/*.js` (carregados na ordem de `gm.html`) e `public/painel.js`. `content.js` (grade, itens, bestiário, cenas), `arvore/*.js` (nós).

## Pendências, em ordem sugerida
1. **Revisar os 154 nós novos** (`arvore/sistemas.js`) ramo por ramo com o usuário, como foi feito no Kagutsuchi: poder e XP, efeitos, nomes e descrições. Os nós 🆕 das expansões anteriores também continuam sem revisão nó a nó (`REVISAO-ARVORE.md`).
2. ~~**Testar a interface na mesa de verdade**~~ **Feito** (`tools/ui-smoke.js`, `npm run ui`; ver "Interface testada" abaixo). Falta só olhar com gente de verdade: celular real (o teste usa o viewport de iPhone 13, sem teclado nem seletor nativo), TV em 1920×1080 e o painel do mestre em celular (não foi tratado: é um conjunto de janelas arrastáveis pensado para PC).
3. ✅ **IA dos inimigos** (feito): campo opt-in `ia` no bestiário (`dom`, `defend`, `focus`, `trio`); Domínio em 3 chefes, Defender/Concentrar em 3, trio da Tempestade Ígnea; Coragem **não** foi dada aos inimigos. Ver `DECISOES-SISTEMAS.md`. Pendente: `v2` (fusões) continua fora dos inimigos.
4. ✅ **Domínios e trios no bestiário** (feito); `solo` continua excluindo `dom`, `trio` e `v2` dos chefes comuns e dos gerados, só o campo `ia` os reabilita.
5. **Ofícios a refinar:** (feito na sessão `oficios-refino`, veja `PERICIAS.md`, seção "Refino")
   - [x] Ações `checar`: diário de testes na ficha, narração do mestre ao aprovar ou depois.
   - [x] Receitas: preços e custos equilibrados (teste de economia), runas viraram receitas da Forja, loja vende ingredientes básicos.
   - [x] `itemsPage` mostra têmpera, engastes, liga, assinatura e arma viva (Couraceiro/Ourives incluídos).
   - [x] Slot de munição (`mun`) na área de equipamentos.
   - [x] Dívida de Coragem, Tensão e Cadeia: som e animação feitos (ver "Interface testada").
6. **Itens para o mestre:** [x] janela **Catálogo de ofícios** (receitas, perícias, nós e nós novos, persistido em `S.ofiCfg`). Ideias que sobraram: editar runas e assinaturas, ligar uma receita nova a um nó específico, importar/exportar o catálogo.
7. ✅ **Limpeza** (feito): `README.md` descreve a Forja com Economia de Essência e os Ofícios; `docs/index.html` não menciona forja nem acesso novo, ficou como está.

## Restauração depois da divisão em módulos
A divisão de `app.js`/`server.js` em módulos (`acedabf`) foi feita a partir de um retrato antigo e o merge da branch de segurança com as features (Ofícios, armas com modelo, Cadeia, painel, mesa) manteve só o lado dela nos conflitos. A branch `restaurar-tudo` refez esse merge conflito a conflito e portou tudo para os módulos. Decisões tomadas:
- O catálogo de armas completo (modelos de `public/armas.js`, Forja de armas) voltou; `Florete` e `Perfuradora de Montanhas` continuam como itens (a Perfuradora é lendária, com perfuração 50). Os campos `reqFor` e `grant` do catálogo só-Florete saíram: o requisito de atributo e as técnicas da arma vêm dos modelos.
- Os nomes novos dos consumáveis e equipamentos (`RENAME` em `content.js`, catálogo v5) valem; as receitas de `public/oficios.js` e as lojas usam esses nomes. `migrateItems` renomeia pelo nome e mantém armas forjadas e itens do mestre.
- O id do Vínculo de Hiruko é `hiruko` em todo lugar (saves com `radiacao` são convertidos em `preFix`).
- Os diálogos de `ux.js` substituem `prompt()`/`confirm()`; a mira automática na vez do jogador foi mantida (o teste de interface foi ajustado a isso).
- `public/painel.html` tinha script inline, que o CSP de `src/net.js` bloqueia: o código foi para `public/painel.js`.

## Armadilhas conhecidas
- `strike` e `doAct` em `server.js` concentram quase todos os efeitos; mudanças ali quebram testes de longe. Rode `npm test` a cada passo.
- Testes que usam `reset()` não reiniciam `S.camp` nem `S.known`: defina o que precisar no começo do teste.
- A Cadeia é só dos heróis (`addChain`); dar Cadeia aos inimigos deixou os encontros bem mais difíceis.
- `normSlots` roda a cada `push()`: passivas lidas na hora (mod, gatilho, voto, amplificação) só valem se estiverem nos slots; passivas de atributo e de `bon` valem sempre.
- O id do Vínculo de Hiruko é `hiruko`; estados salvos com `radiacao` são convertidos ao iniciar.

## Revisão da interface (branch `revisao-ui`)
Decisões do dono, para não perguntar de novo: jogo online, cada um no seu PC; combate estilo Persona, ~1,5 s por ação, o mestre vê as mesmas animações; sem opção de reduzir movimento; cartões do palco ficam como estão; dado 3D só fora do combate; menu de comando em lista inclinada com 1–9; ordem de turnos no topo com mini retratos; mestre em painéis laterais fixos com abas arrastáveis (salvas no navegador), palco em cima e mapa embaixo na batalha, faixa de pedidos no topo, barra de ações do inimigo sob o palco; resolução mínima do mestre 1366×768; `/painel` não é usado.
Feito: `coreo.js` (coreografia, sons novos sintetizados, tela de resultado com `res` no log da vitória e `S.battle.stats[id].ko`), menu do jogador, `docas.js` (painéis do mestre), seções Mais… e ⋯ nos cartões, selos de ganho do jogador.
Falta olhar com gente de verdade: a Expansão de Domínio só foi vista no teste de regras; o `npm run ui` precisa do Playwright e não rodou nesta revisão (seletores da Forja já atualizados para as abas).

## Interface testada (sessão `interface-mesa`)
`npm run ui` sobe o jogo no mesmo processo (usa `server`/`push` exportados por `server.js`), abre mestre, Ana (celular), Bia e a mesa no Chromium e confere, com ~60 verificações e zero erro de console: tela de batalha do jogador (Defender, Concentrar, Coragem, Passar a Vez, Ataque Total), faixa de clima/Cadeia/Domínio, barra de Quebra, aprovação de rolagem com Vantagem/Desvantagem e negar com motivo, "Conversar com" no acampamento (até o laço subir no descanso longo), aba Ofícios (Iniciação, aprender nó, usar ação), sons e animações, e uma auditoria de celular (transbordo lateral, botões de toque < 34 px, barra de navegação, fim da página atrás da barra). Não faz parte de `npm test` (precisa de navegador); sem Playwright ele avisa e sai com 0.
Defeitos achados e corrigidos:
- **Ofícios quebrado:** os botões Aprender, Usar, Preparar e `+/−` do mestre nunca chegavam ao servidor. O clique era engolido pelo seletor de nós da grade (`[data-node]`) e a mensagem não levava `node` nem `rec`. Agora o seletor ignora quem tem `data-a` e a mensagem leva os dois campos (o botão de plano da grade, que também tem `data-node`, voltou a funcionar).
- **Barra de Quebra invisível** para jogadores e mesa: `scrub()` em `server.js` não repassava `brk`.
- **Mesa e mestre não mostravam clima/Cadeia/Domínio:** a faixa só existia no painel de comandos do jogador; agora também fica no palco (`.stage>.fbar`).
- **"Conversar com" perdido** se o jogador escolhia o parceiro depois de pedir a ação e o mestre ainda não tinha aprovado: o pedido pendente agora é reenviado com o parceiro.
- **Celular:** a barra de baixo tinha 7 abas em grade de 6 colunas (o Chat quebrava para uma segunda linha de 123 px e cobria o fim da página); o nome "Habilidades" virou "Skills" na navegação; a aba Ofícios ganhou ícone; botões de 30 px viraram 40 px; o aviso de turno saiu de cima do botão Agir; cartões do palco só com barras; barra "Sua ação" mais baixa.
Som e animação dos sistemas de ritmo (decisão: Web Audio sintetizado curto, sem arquivos; animação por estado em CSS, que sobrevive ao redesenho): Tensão sobe de tom a cada nível e o personagem brilha mais (`ten1`–`ten3`); Dívida de Coragem toca um grave que cai e pulsa em vermelho (unidade e botão Coragem); Cadeia faz um tique a cada ganho, um acorde ao encher e a barra pulsa; Domínio abre com um zumbido que sobe, escurece o palco em roxo e fecha com um tom que desce. O som respeita o botão de som, que agora também está no menu do nome do jogador.
Ainda sem tratamento: o jogador não vê Coragem/Tensão dos inimigos (a IA nem usa); sem teste de interface para o mestre em celular; o seletor de "Aprovar sozinho" e as janelas do mestre só foram exercitados no desktop.

## Armas (sessão `weapons-system-review`)
Feito: perfil do ataque básico pela arma, técnicas da arma (`w:<item>:<n>`), tipos pesada e foco, categorias, níveis, 27 modelos, catálogo de 47 armas, janela **Forja de armas** do mestre, migração `S.itemsV = 2`, 4 testes novos e o bloco de interface no `npm run ui`. Ver `ARMAS.md`.
Ideias que sobraram:
- Inimigos do bestiário com arma equipada (hoje só o mestre equipa à mão; os humanos seriam os candidatos). Mexe no equilíbrio: passar no `sim.js` antes.
- ✅ Trilhas da árvore para pesada, foco, corrente, arremesso e arco (10 nós cada). Falta revisá-las nó a nó com o usuário, como as outras.
- Os 44 modelos da expansão estão só na Forja de armas (o usuário pediu para não mexer em catálogo e lojas agora).
- Trocar de arma em batalha não custa tempo hoje; se virar abuso, cobrar meio turno.
- A régua de orçamento não conta as técnicas nem o elemento.

## Armas: escopo maior (sessão `weapons-system-review`, 3ª etapa)
Feito: escudo (com `block`) e instrumento como tipos (85 modelos, 11 tipos), básica Comum de todo modelo no catálogo (108 armas), lojas temáticas nas 4 cenas, 32 pacotes de traços (empilham até 3), duplicar, variantes elementais, exportar/importar `.json` e trilhas de 10 nós para escudo e instrumento. Ver `ARMAS.md`.
Ideias que sobraram:
- Revisar nó a nó com o usuário as trilhas das armas (pesada, foco, corrente, arremesso, arco, escudo, instrumento).
- Inimigos humanos do bestiário com arma equipada (o usuário disse que está fora do escopo por ora; passar no `sim.js` antes).
- `Padrão` não entrou como qualidade (não faria nada); as 5 qualidades são Mal feita, Gasta, De oficina, De artesão e Mestra.
- Campanhas salvas não recebem as lojas novas sozinhas (só o catálogo): usar "+ cenas de exemplo" ou pôr à venda pela janela Itens.

## Comandos de ação (Leva 4, sessão `comandos-de-acao`)
Feito: janela de defesa no servidor (`S.battle.cmd`: Aparar, Esquiva, golpes de várias batidas, contra-ataque, Choque de poderes, Perfeito de chefe), 7 minigames de ataque (`public/js/cmd-ataque.js`), 45 nós novos e 34 marcados em `arvore/leva4.js`, sons e selos na mesa. Spec em `docs/superpowers/specs/2026-11-17-comandos-de-acao-design.md`; mecânicas em `ARVORE-SISTEMAS.md`; demonstração jogável sem servidor em `docs/demo-comandos.html`; `node tools/dev-cmd.js` sobe uma luta de teste (porta 3213).
Pendências:
- Testar com gente de verdade: latência (a janela é medida no servidor, com 200 ms de folga), o anel no celular e a tecla C do Choque sem teclado.
- Revisar nó a nó com o usuário os 45 nós da Leva 4, como os outros ramos.
- A nota dos minigames de ataque vem do navegador (o servidor só limita `g`, `n` e `acc`); numa mesa entre amigos isso basta, mas não é à prova de trapaça.
- Testes instáveis conhecidos (também na base) "leva 3 Marca desperta" e "leva 2 cargas": corrigidos (a vida voltava presa em 1; o combo dependia do dado).

## Tela do mestre, 2ª versão (substitui as docas arrastáveis)
`public/js/docas.js`: trilho de ícones à esquerda (um painel por vez; clicar no ativo recolhe), barra lateral direita com abas Fichas, Iniciativa, Chat e Pedidos (o selo conta os pedidos), centro com Palco ou Mapa (P, M; Tab fora da batalha), barra de ações da batalha sempre acima do centro, fichas em janela por cima de tudo (Esc fecha primeiro). `[` e `]` recolhem as laterais; abaixo de 1100 px só uma lateral fica aberta. Arranjo em `localStorage.vj_gui` (a chave antiga `vj_dock` deixou de ser lida). Na lista de fichas, inimigos ganharam ✕ e os botões "Remover caídos" e "Remover todos".
Falta: rodar `npm run ui` (precisa do Playwright; os seletores já foram atualizados para o layout novo) e olhar a tela com o mestre de verdade.

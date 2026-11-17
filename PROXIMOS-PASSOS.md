# Próximos passos (instruções para o agente que continuar)

Leia primeiro: `README.md`, `ARVORE-SISTEMAS.md` (mecânicas e notação dos nós), `DECISOES-SISTEMAS.md` (o que o usuário decidiu), `PERICIAS.md` (ofícios) e `REVISAO-ARVORE.md`.
O usuário escreve em português; responda e comente o código em português, no estilo existente. Decisões já tomadas não se perguntam de novo: use `AskUserQuestion` só para decisões novas.

## Como trabalhar
- `npm install && npm test` (54 testes devem passar) · `npm run audit` (0 erros; 5 avisos conhecidos de nomes metafóricos) · `npm run ui` (teste de fumaça da interface com Chromium/Playwright; `UI_SHOTS=pasta` guarda capturas, `UI_ONLY=celular` roda só um bloco) · `node tools/sim.js 60 enc` e `node tools/sim.js 80 boss` para equilíbrio.
- Compare sempre com a base: encontros (nível 0/1/2, fácil→mortal) estavam em ~90/77/93/73/42/23 e chefes entre 46% e 89%. Variação de ±10 pontos é ruído.
- Toda mecânica nova ganha teste em `tools/test.js`; as de combate passam pelo simulador antes de entrar.
- Mudou `tree.js` ou `arvore/`: a grade é refeita ao iniciar (skills ficam pelo nome). Nomes de nós precisam ser únicos (`npm run audit` confere).
- Arquivos: `server.js` (motor), `public/rules.js` e `public/oficios.js` (compartilhados com o navegador), `public/app.js` (interface), `content.js` (grade, itens, bestiário, cenas), `arvore/*.js` (nós).

## Pendências, em ordem sugerida
1. **Revisar os 154 nós novos** (`arvore/sistemas.js`) ramo por ramo com o usuário, como foi feito no Kagutsuchi: poder e XP, efeitos, nomes e descrições. Os nós 🆕 das expansões anteriores também continuam sem revisão nó a nó (`REVISAO-ARVORE.md`).
2. ~~**Testar a interface na mesa de verdade**~~ **Feito** (`tools/ui-smoke.js`, `npm run ui`; ver "Interface testada" abaixo). Falta só olhar com gente de verdade: celular real (o teste usa o viewport de iPhone 13, sem teclado nem seletor nativo), TV em 1920×1080 e o painel do mestre em celular (não foi tratado: é um conjunto de janelas arrastáveis pensado para PC).
3. **IA dos inimigos não usa** Defender, Concentrar, Coragem nem Domínio (de propósito: chefes e gerados só levam ataques e transformações). Decidir com o usuário se algum chefe deve ter Domínio.
4. **Domínios e trios no bestiário:** `solo` em `content.js` exclui `dom`, `trio` e `v2` dos inimigos.
5. **Ofícios a refinar:**
   - Ações `checar` (Arrombar, Intimidar, Invenção…) só rolam e pagam ouro; falta uma forma de o mestre registrar o resultado narrado.
   - Receitas de munição: o ouro/preço das munições e runas ainda não está balanceado; loja não vende ingredientes além dos que as cenas dão.
   - `Couraceiro`/`Ourives` temperam armadura/acessório, mas a interface de itens não mostra o bônus de têmpera nem o nome da assinatura; mostrar em `itemsPage`.
   - Slot de munição (`mun`) não aparece na área de equipamentos da ficha.
   - ~~Dívida de Coragem, Tensão e Cadeia sem som nem animação~~ feito (ver abaixo).
6. **Itens para o mestre:** janela de edição de receitas, `gather` por cena já existe (chips em Cena); falta editar o catálogo de ofícios sem mexer no código.
7. **Limpeza:** `README.md` ainda descreve o fluxo antigo de "Forjar" na aba Forja (essências) sem citar Economia de Essência; revisar `docs/index.html` se mudar algo de acesso.

## Armadilhas conhecidas
- `strike` e `doAct` em `server.js` concentram quase todos os efeitos; mudanças ali quebram testes de longe. Rode `npm test` a cada passo.
- Testes que usam `reset()` não reiniciam `S.camp` nem `S.known`: defina o que precisar no começo do teste.
- A Cadeia é só dos heróis (`addChain`); dar Cadeia aos inimigos deixou os encontros bem mais difíceis.
- `normSlots` roda a cada `push()`: passivas lidas na hora (mod, gatilho, voto, amplificação) só valem se estiverem nos slots; passivas de atributo e de `bon` valem sempre.
- O id do Vínculo de Hiruko é `hiruko`; estados salvos com `radiacao` são convertidos ao iniciar.

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

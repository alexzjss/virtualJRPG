# Mesa do mestre: cenas, grupo dividido e batalhas simultâneas

Data: 2026-11-18 · Protótipo aprovado: `.claude/mockups/mestre/index.html` (servidor `mockup-mestre`, porta 3297)

## Intenção

O mestre quer uma tela principal para conduzir a sessão por cenas. Nela ele cria e escolhe cenas, move cada herói para uma cena diferente (o grupo não anda mais sempre junto) e tira heróis de cena por um tempo. Hoje há uma única cena atual (`S.scene`) e uma única batalha (`S.battle`) para a mesa toda, e `sceneGo` arrasta todos os heróis juntos ([handlers.js:156](../../../src/handlers.js)). Grupos separados na história não têm como ser representados.

## Decisões do usuário

- **Visão:** cada jogador vê a cena do próprio herói. A TV (papel `table`) mostra a cena que o mestre escolher para ela.
- **Fora de cena:** o jogador vê só uma tela de espera com um recado do mestre, sem mapa e sem assistir a outra cena.
- **Batalhas:** podem acontecer ao mesmo tempo, uma por cena.
- **Extras desta leva:** saídas no mapa (o jogador pisa numa saída, pede para passar e o mestre aprova) e "ver como jogador" dentro da tela do mestre.
- **Layout:** o do protótipo aprovado (detalhes abaixo).
- Só PC. A entrega vai direto no `main`, com um commit por etapa.

## Objetivos

1. Uma nova vista do mestre, **Mesa**, ao lado de `mapa` e `palco` (`gui.view`). Ela vira a vista inicial quando não há batalha na cena em foco.
2. Cada herói pertence a uma cena ou fica fora de cena, e é movido sozinho ou em grupo.
3. Cada cena pode ter a sua batalha ativa, independente das outras.
4. Cada cliente recebe o estado da cena em que está.

## Não objetivos

- Chat por cena, música por cena, capítulos e relógio de tempo de jogo (ficam para depois).
- Um jogador fora de cena assistir a outra cena.
- Celular.
- Reescrever as regras para receber a cena como argumento (descartado na opção B).

## Antiobjetivos (falha mesmo que "funcione")

- Mexer na sensação do combate: QTE, janela de defesa, câmera do palco 3D e leque precisam se comportar exatamente como hoje dentro de uma batalha.
- Vazar informação entre cenas: um jogador recebe inimigos, log de batalha, pings ou névoa de outra cena.
- Uma ação em uma cena alterar a batalha de outra (por exemplo, o temporizador de defesa de uma luta disparar na outra).
- Perder campanhas salvas: o `state.json` atual precisa migrar sem perda.

## Abordagens consideradas

- **A. Contexto por cena (escolhida).** Cada cena guarda a própria batalha (`sc.battle`). O servidor "entra" na cena de quem agiu antes de rodar qualquer handler, e `S.scene` e `S.battle` passam a apontar para aquela cena. O código de regras atual (cerca de 240 usos) roda sem saber que existem outras cenas. Cada cliente recebe um estado já projetado, em que `S.scene` é a cena dele. É barata e quase não arrisca o motor de combate. O risco está nos pontos que rodam fora de uma ação (temporizadores e `push`), que precisam entrar no contexto certo.
- **B. Passar a cena explicitamente.** Cada função recebe a cena. O resultado é mais limpo, mas toca nos ~240 usos com alto risco de regressão no combate. Descartada.
- **C. Uma batalha avança por vez.** Não entrega batalhas simultâneas. Descartada.

## Design

### Modelo de dados (servidor)

- `S.scenes[id].battle`: o objeto que hoje é `S.battle` (`active`, `ticks`, `n`, `stats`, `chain`, `wx`, `cmd`, `order`, `end`…). Cada cena tem o seu, começando em `{ active: false, ticks: {} }`.
- `S.scenes[id].exits`: lista de `{ id, x, y, to }`. `x` e `y` são casas da grade e `to` é o id da cena de destino.
- `S.focus`: a cena em foco do mestre. É o novo nome persistido do antigo `S.scene` e é onde ações sem herói (pôr inimigo, clima, mapa) acontecem.
- `S.tv`: a cena mostrada na TV, que por padrão é `S.focus`.
- `S.offMsg`: o recado da tela de espera.
- `ch.scene`: id da cena, ou `null` quando o herói está **fora de cena**. Inimigos continuam com a cena deles.
- `S.scene` e `S.battle` deixam de ser dados salvos e viram **ponteiros de contexto**: propriedades não enumeráveis (`Object.defineProperty`) que leem e escrevem `S.scenes[ctx]` e `S.scenes[ctx].battle`. Por não serem enumeráveis, ficam fora do `JSON.stringify`, do save e do desfazer. A escrita `S.battle = {...}` (como em `handlers.js:185`) é redirecionada para `S.scenes[ctx].battle`.

**Migração** (`state.js`): mover `S.battle` para `S.scenes[S.scene].battle`, salvar `S.focus = S.scene`, criar `exits: []` nas cenas, apagar as chaves antigas e só então instalar os ponteiros. A regra da linha 137 (cena inválida volta para a atual) passa a respeitar `null` nos heróis.

### Contexto no servidor

- `inScene(id, fn)`: troca o contexto, roda `fn` e restaura o anterior (no `finally`).
- **Cena de uma mensagem:** é a do herói em `m.id` quando ele existe e tem cena. Senão, é `m.scene`, quando o mestre manda uma (a tela Mesa e o palco de uma batalha enviam a cena do que estão mostrando). Senão, é `S.focus`. Mensagens de herói fora de cena que dependem de cena (andar, agir em batalha, rolar no mapa) são ignoradas. Ficha, inventário e ofícios fora de batalha continuam permitidos, porque não dependem de cena.
- `handle()` em `net.js` envolve `H[m.t]` e o pedido de aprovação em `inScene`. O pedido (`S.reqs`) guarda a cena em que nasceu, e a aprovação roda nela.
- **Temporizadores:** `cmdPlan`, `cmdFor` e `cmdTimer` viram um mapa por cena (`cmdBy[sceneId]`), e os callbacks de `setTimeout` rodam dentro de `inScene` da cena em que foram criados. O mesmo vale para qualquer outro estado de módulo ligado à batalha que a implementação encontrar.
- **`push()`:** um laço simples por cena **não serve**. `prep` recalcula todos os personagens lendo `S.battle` ([rules.js:89-97](../../../src/rules.js)). `usable` apaga `ch.cant` de quem não está na batalha do contexto ([rules.js:21](../../../src/rules.js)). `pruneReqs` percorre todos os `S.reqs` ([net.js:210](../../../src/net.js)). Por isso:
  - `prep`, `usable` e `breakCheck` rodam **por personagem, no contexto da cena do próprio personagem**. Uma opção é dividir essas funções em uma versão de um personagem só, chamada dentro de `inScene(ch.scene)`. Heróis fora de cena rodam sem batalha.
  - `reseat`, `battleWatch` e `order` rodam uma vez por cena com batalha ativa.
  - `pruneReqs` confere cada pedido no contexto da cena gravada nele.
  - `ofiSync` continua global. `battleWatch` avisa o mestre dizendo de qual cena se trata.
- **Desfazer (decisão do usuário): só a cena em foco.**
  - Há uma pilha por cena, `undoBy[sceneId]`. Cada foto guarda a cena (com batalha, mapa e saídas) e os personagens que estão nela.
  - Desfazer restaura apenas isso, para a cena do contexto da ação (normalmente o foco).
  - Ações globais não entram em nenhuma pilha: contas, conteúdo, `moveTo` entre cenas e ficha de herói fora de cena.
  - A pilha global atual ([net.js:179](../../../src/net.js), [handlers.js:26-31](../../../src/handlers.js)) é substituída.

### Estado da mesa: por cena, por herói ou global

Decisões do construtor. Cada item é uma chamada minha, que o usuário pode corrigir:

- **Invocações:** ao fim de uma batalha, só as invocações daquela cena somem ([handlers.js:182](../../../src/handlers.js)).
- **`S.meal` e `sharp`:** são gastos ou limpos só para os heróis que estavam naquela batalha ([handlers.js:184](../../../src/handlers.js)). `S.meal` vira por herói (`ch.meal`), para que uma refeição continue valendo para quem não lutou.
- **`S.marcha`, `S.tenac` e `S.trap`:** continuam globais e são gastos pela primeira batalha que começar. Na implementação, `S.marcha` e `S.tenac` não têm quem os ative, e a armadilha é uma só. Separar por herói não mudaria nada hoje.
- **`S.camp` (acampamento):** continua global.
- **`S.chase` (perseguição):** continua global, uma por vez. Ela só aparece para o mestre, e torná-la por cena exigiria outro ponteiro sem ganho real.
- **`S.meal`:** virou `S.meal.ids` (herói → batalhas restantes). Saves com o formato antigo (`left`) continuam funcionando.

### Carregar, trocar de campanha e restaurar backup

`adopt` faz `Object.assign(S, …)` e depois `S.battle ??= …` ([state.js:176](../../../src/state.js)). `state.js:10` e `BLANK()` também já começam com `battle`. Por isso:

- a migração roda **sobre o objeto cru**, antes de instalar os ponteiros, em todos os caminhos: subir o servidor, trocar de campanha e restaurar backup;
- `BLANK()` passa a não ter `battle` nem `scene`;
- os ponteiros são instalados por uma função única, chamada ao fim de cada caminho.

### Projeção para cada cliente (`net.js` → `view(c)`)

- **Cena do cliente:**
  - Jogador: a cena do herói dele. Com vários heróis em cenas diferentes, vale a do herói escolhido na tela (o cliente manda `m.scene` com o herói ativo). Na falta disso, a do primeiro herói com cena.
  - TV: `S.tv`.
  - Mestre: `S.focus`, ou a cena que a vista atual pediu.
- O estado enviado tem `scene` (a cena do cliente) e `battle` (a batalha dela) como chaves comuns. Assim todo o cliente atual, que lê `S.scene` e `S.battle`, funciona sem mudança. Isso vale **também para o mestre**: o `{ ...S }` de [net.js:115](../../../src/net.js) não copia as propriedades não enumeráveis, então `scene` e `battle` são postos explicitamente nas duas projeções.
- Jogador e TV recebem em `scenes` só a própria cena completa. As outras chegam sem `battle`, `exits`, `seen` nem `chase`, só com o nome, para os cartões e as saídas mostrarem o destino.
- `hiddenFoe`, `pubChars` e o log usam a cena do cliente.
- **Log:** só ganham o campo `sc` as entradas de batalha e de mapa (golpes, turnos, pings, entrar e sair de cena). Chat, narração do mestre e rolagens fora de batalha continuam globais, porque chat por cena é não objetivo. O jogador recebe as entradas sem `sc` ou com a cena dele. Sussurros e o log do mestre continuam como hoje.
- **Herói ativo:** um jogador com vários heróis em cenas diferentes manda `{ t: 'activeHero', id }` quando troca de herói na tela. O servidor guarda isso na conexão (`c.hero`) e usa na projeção. Uma conexão de "Ver como" (peek) não pode mandar mensagens ([net.js:254](../../../src/net.js)), então mostra a cena do primeiro herói com cena. Isso é aceitável, porque é raro.
- **Jogador fora de cena:** recebe `scene: null` e `off: S.offMsg`, sem inimigos e sem dados de cena. O cliente mostra a tela de espera.
- **Mestre:** recebe todas as cenas, com as batalhas, como já acontece com o resto do estado, além de `focus` e `tv`. A tela Mesa resume cada batalha a partir de `S.scenes[id].battle` (rodada, de quem é a vez, se espera o mestre).

### Tela Mesa (cliente do mestre)

Ela segue o protótipo aprovado:

- **Barra do topo:** "+ Nova cena", "Reunir todos no foco", o seletor "Ver como" e o botão da TV (mostra o nome da cena da TV; clicar põe a TV no foco).
- **Quadro:** uma coluna por cena com miniatura (`bg` ou `bbg`), nome e selos de TV, clima e loja. Abaixo:
  - a faixa ⚔ "R{n} · vez de X", com "· espera você" quando a vez é de um inimigo ou há um pedido. Clicar abre o palco daquela batalha, com `gui.view = 'palco'` e o foco na cena;
  - a contagem de heróis, inimigos e saídas;
  - os retratos dos heróis, com barra de HP e ponto de conectado (a partir de `S.online`).
- **Coluna "Fora de cena":** é tracejada e traz um campo de texto para o recado (`offMsg`).
- **Coluna "+":** cria uma nova cena.
- **Arrastar e soltar** entre colunas, com Ctrl+clique para selecionar vários e uma barra flutuante "N selecionados · mover para…". Esc limpa a seleção.
- **Painel lateral** (cena em foco):
  - botões "Editar mapa" (vai para `mapa` com o foco nela), "Abrir palco" ou "Iniciar batalha aqui" e "Mostrar na TV";
  - o mini mapa com os tokens e as saídas: clicar numa casa cria uma saída, e clicar numa saída a remove;
  - os pedidos de passagem, com "Deixar" e "Não";
  - quem está ali, com "Ver como" e "Tirar de cena";
  - as outras cenas, com "Focar".
- **Nova cena:** em branco, a partir das de exemplo (`content: scenes`) ou duplicando o foco, que copia mapa, loja, clima, recursos e saídas (sem batalha nem tokens). A opção "já levar os selecionados" vem incluída.
- Os chips "Cenas:" atuais em [tela.js](../../../public/js/tela.js) saem: a Mesa os substitui. "Excluir cena" fica num menu do cartão e só é permitido sem heróis e sem batalha ativa.

### Movimento entre cenas

- **Nova mensagem `moveTo { ids, scene }`** (só para o mestre), em que `scene` pode ser `null`. Para cada herói:
  - sai da batalha da cena antiga, se estava nela (remove o tick e reorganiza a fila);
  - recebe a nova cena e uma posição: a saída de volta, quando há uma ligando as duas cenas; senão, a primeira casa livre perto do centro;
  - entra na fila da batalha da nova cena, se houver uma ativa (como o "Incluir" atual).
- `sceneGo` deixa de mover heróis e só muda `S.focus`. "Reunir todos" é um `moveTo` com todos os heróis.
- `sceneDel` só funciona com a cena vazia e sem batalha.

### Saídas e pedido de passagem

- **Mensagens novas, só do mestre:** `exitAdd { scene, x, y, to, both }` e `exitDel { scene, id }`. Com `both`, a volta é criada na casa espelhada da outra cena.
- **Quando um herói termina um `move` numa casa com saída:** o servidor cria um pedido na categoria nova `pass` ("passar para {cena}"), usando a fila de pedidos atual (`S.reqs`, um por jogador). Aprovar executa `moveTo`. `S.auto.pass` dispensa a aprovação, como as outras categorias. Durante uma batalha ativa na cena, saídas não geram pedido.
- **Jogador:** a saída aparece no mapa como um marcador com o nome do destino. A névoa esconde a saída como esconde o resto.

### Ver como jogador

O recurso já existe (`player?as=`, `c.peek`, [eventos.js:135](../../../public/js/eventos.js)). Na Mesa, ele abre a mesma URL num **painel sobreposto (iframe)** dentro da tela do mestre, com a faixa "Vendo como X · só você vê isto" e o botão "Voltar à mesa". A projeção por cena faz o iframe mostrar exatamente a cena (ou a tela de espera) daquele jogador. A aba separada atual continua no menu do personagem.

### Tela de espera (jogador)

Quando `scene` é `null`, a tela do jogador mostra só "FORA DE CENA" e o recado do mestre, sem mapa e sem palco. A ficha fica acessível pelo menu, como hoje. O cartão "Nova cena" ([ux.js:94](../../../public/js/ux.js)) passa a disparar quando muda a cena **do jogador**.

### Testes

- `tools/test.js`:
  - migração de um estado antigo, conferindo que batalha, foco e heróis ficam no lugar;
  - duas batalhas ativas ao mesmo tempo em cenas diferentes, com ações e turnos independentes;
  - a janela de defesa de uma cena não disparando na outra;
  - a projeção não vazando inimigos, batalha (`scenes[*].battle`) ou log de outra cena;
  - o fim de uma batalha não removendo invocações nem gastando a refeição de quem está na outra cena;
  - desfazer numa cena não alterando a outra;
  - `adopt` de um save antigo, trocar de campanha e restaurar backup;
  - `moveTo` para dentro e para fora de uma batalha;
  - pedido de passagem por saída;
  - herói fora de cena sem poder agir no mapa.
- `tools/ui-smoke.js`: a vista Mesa abre sem erro de console, arrastar move o herói, dois jogadores em cenas diferentes veem mapas diferentes, a tela de espera aparece e o "Ver como" abre o painel.

## Fica para o construtor

- Onde instalar os ponteiros de contexto (`state.js` é o natural) e o nome final de `inScene`.
- O inventário exato do estado de módulo ligado à batalha além de `cmdPlan`, `cmdFor` e `cmdTimer`.
- A ordem dos commits, com uma etapa por commit, sugerida assim:
  1. modelo e migração;
  2. contexto e temporizadores;
  3. projeção;
  4. `moveTo` e fora de cena;
  5. tela Mesa;
  6. saídas;
  7. ver como;
  8. testes de interface.
- O estilo visual segue a paleta do `style.css` (o protótipo já usa os mesmos tokens).

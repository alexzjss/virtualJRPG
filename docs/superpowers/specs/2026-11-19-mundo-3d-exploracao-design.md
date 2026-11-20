# Mundo 3D explorável e editor de mapa do mestre

Data: 2026-11-19 · Decisões tiradas de 10 rodadas de perguntas (memória `mundo-3d-exploracao`).

## Intenção

Hoje a exploração é um mapa 2D: uma imagem com grade, tokens em casas inteiras, névoa pintada por casa, saídas, marcadores e recorte ([palco.js:49](../../../public/js/palco.js)). O jogador clica para mover o token (`H.move`, [handlers.js:81](../../../src/handlers.js)). Só o combate é 3D: o palco CSS 3D em [palco3d.js](../../../public/js/palco3d.js), com os cenários de [terreno3d.js](../../../public/js/terreno3d.js).

O usuário quer que fora do combate a mesa vire um JRPG de exploração. Cada jogador anda com WASD por um mundo 3D isométrico, com portas, baús, NPCs, armadilhas e inimigos que patrulham. O mestre constrói esse mundo durante a sessão num grid 2D e vê o resultado em 3D ao lado. O grid 2D deixa de existir para jogadores e TV e passa a ser só a ferramenta de edição do mestre.

## Objetivos

1. Mundo 3D isométrico em three.js para jogadores, TV e mestre, com o mesmo cel shading dos cenários do palco.
2. Movimento livre com WASD, colisão e validação no servidor. Correr, agachar, pular obstáculos baixos e golpe no mapa.
3. Editor do mestre: grid 2D com 3D ao vivo, andares, temas pintados por casa, paredes nas bordas, objetos interativos, modelos, gerador, rascunho e Publicar.
4. Interações: portas, baús, itens, NPCs com diálogo de escolhas, placas, alavancas, gatilhos, armadilhas e portais. Cada objeto pode agir sozinho ou virar pedido.
5. Névoa automática por linha de visão, lembrada por cena, e ainda pintável pelo mestre.
6. Inimigos no mapa com patrulha, visão, perseguição e início de batalha por contato, emboscada ou zona, com surpresa e emboscada contando na ordem de turnos.
7. HUD de exploração: fichas P5 menores, minimapa, nomes e balões, faixa de objetivo, prompt de interação e menu de pausa por cima.
8. Migração das cenas antigas sem perda: a imagem vira piso, as saídas viram portais e a névoa revelada se mantém.

## Não objetivos

- Celular. O celular continua com o que tem hoje: o mapa 2D antigo some, e no lugar dele fica uma tela simples de "explore pelo PC" com as páginas atuais.
- Refazer o palco de combate. Ele continua em CSS 3D, sem mudança de sensação.
- Paleta manual de decoração. Árvores, rochas e colunas vêm do tema pintado.
- Régua, medição de área e marcadores no mapa (o usuário manteve só o ping).
- Mapa-múndi entre cenas.
- Escalada entre andares (só há pulo de obstáculo baixo; a troca de andar é por escada ou portal).

## Antiobjetivos (falha mesmo que "funcione")

- **Pesar.** Ficar abaixo de 60 fps num PC médio ou de 30 num PC fraco com um mapa 64×64 no tema mais denso. A tela preta nos golpes também não pode voltar: duas GPUs disputando memória durante a batalha.
- **Vazar informação.** O jogador receber objetos ocultos, armadilhas não percebidas, inimigos fora da visão, o rascunho do mestre, falas de NPC escolhidas por outro jogador fora do alcance, ou qualquer coisa de outra cena.
- **Inundar a rede.** Cada passo virar um `push` completo do estado com gravação em disco. Hoje `push` reprojeta e envia o estado inteiro a todos e chama `save()` ([net.js:208](../../../src/net.js)).
- **Mexer no combate.** QTE, janela de defesa, câmera do palco, leque e CTB devem se comportar como hoje depois que a batalha começa.
- **Perder campanhas.** Um `state.json` atual precisa abrir com tudo o que tinha: mapas, saídas, névoa e posições.
- **Parecer outro jogo.** O mundo destoar do cel shading do palco (contorno INK, saturação, horário), a ponto de a transição para a batalha parecer uma troca de jogo.

## Abordagens consideradas

- **A. three.js só na exploração, com o palco CSS 3D mantido (escolhida pelo usuário).** O three.js já está em `node_modules` e é servido em `/vendor/three.module.js` (os dados usam). Ele aguenta 64×64 com instâncias, luz, névoa por textura e câmera ortográfica. Na batalha, o mundo pausa e libera a GPU, e o palco entra como hoje. Exige um piso de peças 3D próprio, porque o terreno3d é markup CSS/SVG e não serve como geometria. As paletas dele são reaproveitadas.
- **B. three.js em tudo.** Teria transições sem corte e uma arena que é o próprio mapa. Mas reescreve o palco aprovado e o combate luminoso. Descartada.
- **C. CSS 3D estendido.** Coeso com o palco, mas as medições de [palco-camera-perf] e [cenarios-3d-anime] mostram que camadas 3D, recortes e planos grandes derrubam o FPS e causam tela preta. Um mapa 64×64 explorável não cabe. Descartada.

## Design

### 1. Modelo de dados (servidor)

Cada cena ganha `sc.world`, a versão publicada que todos veem, e `sc.draft`, o rascunho que só o mestre recebe. Os dois têm o mesmo formato:

```
world = {
  v: 12,                     // versão; sobe a cada Publicar
  tema: 'floresta', hora: 'dia',
  floors: [{
    id: 'f0', name: 'Térreo', w: 40, h: 30,        // até 64×64
    cell: Uint8 em base64 (w*h): índice na tabela de pisos (tema + tipo), 0 = vazio/abismo
    wallH: Uint8 base64 ((w)*(h+1)): borda horizontal acima de cada casa; 0 nada, 1 parede, 2 porta, 3 barreira, 4 grade (bloqueia passagem, não a visão), 5 cerca (como a grade, mas pulável)
    wallV: Uint8 base64 ((w+1)*(h)): borda vertical à esquerda de cada casa; mesmos códigos
    img: { url, crop } | null      // piso de imagem (cenas migradas); o desenho por casa fica por cima
  }],
  objs: { [id]: { k, f, x, y, rot, vis, auto, cfg } }, // objetos interativos (seção 6)
  goal: ''                         // faixa de objetivo
}
```

- **Tabela de pisos** (`PISOS` em `public/js/mundo-pecas.js`, compartilhada com o servidor como `src/consts.js` faz hoje): cada entrada é `{ tema, tipo }`. Os tipos são `chao` (anda), `trilha` (anda, outra textura), `denso` (bloqueia e vira árvores, rochas ou colunas do tema), `baixo` (bloqueia o andar e é pulável: troncos, cercas, caixas), `agua` (anda devagar e vira clima "molhado" na batalha), `fundo` (água funda, bloqueia), `perigo` (lava, espinhos naturais, veneno: anda, mas causa dano por segundo) e `vazio` (abismo). Com 10 temas × 8 tipos, a tabela cabe num byte. É assim que "obstáculos vêm com o tema": o mestre pinta `denso` de floresta e ganha mata fechada, e no castelo o mesmo `denso` vira colunas e estantes.
- **Paredes nas bordas.** São os vetores `wallH` e `wallV`. A colisão e a linha de visão testam arestas, não casas. Uma porta é uma aresta com código 2 e um objeto `porta` dono dela, que guarda o estado (aberta, fechada, trancada).
- **Andares.** Ficam em `floors[]`. Um objeto `escada` liga a casa (f, x, y) a uma casa de outro andar. Cada andar tem o seu tamanho, o seu grid e a sua névoa.
- **Posição do herói.** `ch.pos = { f, x, z, d }`: andar, coordenadas contínuas em casas (centro da casa 3 = 3.5) e direção em radianos. `ch.x` e `ch.y` continuam existindo como a **casa lógica** (`floor(pos.x)` e `floor(pos.z)`), atualizada pelo servidor sempre que a casa muda. Assim `rangeOf`, a `formation` do palco, as regras de alcance e o bestiário seguem funcionando sem mudança. Inimigos e NPCs usam o mesmo campo.
- **Névoa.** `sc.seen[f]` é um bitset base64 por andar, compartilhado pelo grupo da cena, como o `sc.seen` de hoje. `sc.fogOn` continua valendo.
- **Modelos.** `S.worldTpl[id] = { name, k: 'trecho' | 'obj' | 'mapa', data }` é global, fora das cenas, e entra no Pacote de conteúdo. O pacote padrão por tema fica em `public/js/mundo-modelos.js` e é carregado na primeira vez, como o `content.js` faz.
- **Rascunho.** `sc.draft` só existe enquanto há edição pendente. Publicar copia o rascunho para `sc.world`, sobe `v` e apaga o rascunho. Descartar só apaga. A projeção (`view(c)`) nunca envia `draft` para quem não é mestre.
- **Migração** (`state.js`), feita uma vez por cena:
  - cria `world` com um andar `cols × rows`, todas as casas em `chao` do tema (vindo de `sc.bbg`, ou `campo` como padrão);
  - usa `img = { url: sc.bg, crop: sc.crop }`;
  - converte `sc.seen` para o bitset do andar 0;
  - converte cada `sc.exits` num objeto `portal` na mesma casa;
  - põe `ch.pos` no centro de `ch.x`/`ch.y`.

  Os campos antigos (`bg`, `crop`, `ox`, `oy`, `ar`, `grid`, `pins`) ficam no save durante as etapas e são apagados na troca final (etapa 9). Os marcadores somem da interface, e os dados deles só se perdem nesse momento.

### 2. Rede: movimento sem `push`

- **Mensagem nova** `walk {id, f, x, z, d, m, s}`: `m` é o modo (`a` andar, `c` correr, `g` agachado) e `s` é a sequência. O cliente envia em até **10 por segundo** enquanto o herói se move, e uma última vez ao parar.
- **O servidor valida** com o mesmo módulo de colisão do cliente (`mundo-colisao.js`, UMD testável no Node, como `formation`). A validação confere:
  - a velocidade máxima do modo, com 20% de folga para o lag;
  - que o segmento entre a posição antiga e a nova não cruza aresta bloqueada nem casa bloqueante, a não ser num pulo válido;
  - que o herói está no mesmo andar e não está congelado;
  - o limite do modo tático.

  Se a validação falhar, o servidor devolve `pos` corrigida só para aquele cliente, que ajusta a posição sem tranco.
- **Difusão.** `walk` não chama `push`. O servidor junta as posições que mudaram e, a cada 100 ms, envia um `pos` enxuto (`[[id, f, x, z, d, m], …]`) para os clientes daquela cena (jogadores, a TV se ela mostra a cena, e o mestre). Cada cliente recebe só as posições de quem ele pode ver (seção 5). O estado em memória muda na hora, mas a gravação em disco usa o `save()` com atraso que já existe, sem um `push` por passo.
- **Mudança de casa lógica.** Quando um herói troca de casa, o servidor roda dentro de `inScene()` a revelação de névoa, os gatilhos, as armadilhas e os portais. Só se algo mudar (névoa nova, objeto revelado, gatilho disparado) ele faz um `push` completo, com `dirty = false`.
- **No cliente.** O próprio herói é previsto localmente, sem esperar o servidor. Os outros são interpolados com 100 ms de atraso.
- `walk` entra em `NOUNDO` e em `OFFSTAGE`.
- **Inimigos.** A IA anda no servidor (seção 7) e usa o mesmo canal `pos`.

### 3. Motor 3D no cliente (`public/js/mundo3d.js`)

- É um módulo ES que importa `/vendor/three.module.js` e expõe `window.MUNDO`, como `dice.js`. O canvas mora fora do `#app`, fixo no body e atrás da HUD, como o palco 3D, porque o `render()` reescreve o `#app` por string. O `render()` só chama `MUNDO.sync(S)` e o mundo se atualiza por diferença (andar, versão do `world`, objetos, posições).
- **Câmera.** Ortográfica isométrica (inclinação de ~35°, guinada de 45° + k·90°):
  - Q/E giram 90° com transição de 250 ms;
  - a roda dá zoom em três faixas (perto, médio e o andar inteiro);
  - Espaço+arrastar desloca a câmera, que volta ao herói ao soltar;
  - WASD é relativo à rotação atual da câmera.
- **Paredes transparentes.** Paredes e peças `denso` entre a câmera e o herói, num raio de ~4 casas, descem para um toco de 25% de altura. Usa um uniforme de recorte no shader, e não transparência, para não ordenar camadas.
- **Peças.** Toda a geometria low-poly é gerada em código, sem arquivos de modelo.
  - Tudo é agrupado por tipo em `InstancedMesh` e dividido em blocos de 16×16 casas, para a câmera descartar o que está fora da tela.
  - O material é toon, com rampa de 3 tons e contorno por casco invertido na cor `INK #1c3038`.
  - As cores e os horários vêm de uma tabela de paleta extraída de terreno3d.js, a ser criada em `public/js/terreno-paleta.js` e lida pelos dois. O céu, a lava e os cristais não gradam, como a regra `!#hex`.
  - A transição entre temas vizinhos é feita por mistura de cor por vértice nas bordas das casas.
- **Piso de imagem** (cenas migradas). É um plano texturizado com o recorte, posto embaixo das peças.
- **Personagens.** Recortes 2D (billboard) com `imgF` e `imgB`, o enquadre `imgK` e a escala da cena.
  - Mostra a costas quando o herói anda para longe da câmera e a frente quando vem; espelha nas laterais.
  - Sem imagem, segue a mesma ordem do palco (`c.img`, depois silhueta).
  - Tem sombra redonda no chão, balanço ao andar, poeira ao correr e um arco no pulo.
- **Luz.**
  - Uma luz direcional fixa na direção `SUN` do terreno3d (sem sol que se move) e uma luz hemisférica, ambas tingidas pelo horário da cena.
  - Luzes pontuais nascem do tema: lava, cristais, braseiros que o tema põe junto às paredes do castelo e das ruínas, e fogueiras. Vale o limite por qualidade: Alta 8 reais e Baixa 2, mais brilho emissivo nas demais.
  - A tocha do herói é uma luz pontual que só acende à noite e na caverna.
- **Clima.** Partículas para chuva, neve, neblina, cinzas e brasas (`sc.clima`), em um único `Points` que segue a câmera.
- **Qualidade.** Segue `root.dataset.q`, `ANIMFX.level()` e o evento `vj-quality`: sombras, número de luzes, partículas, resolução de render (`pixelRatio` de 0,75 a 1,5) e contorno.
- **GPU durante a batalha.** Quando a cena do cliente entra em batalha, `MUNDO` para o loop (`setAnimationLoop(null)`), libera os alvos de render e, na qualidade Baixa ou Média, chama `forceContextLoss()`. O palco e o `luz.js` ficam com a GPU. Ao voltar, o mundo é reconstruído a partir do estado.

### 4. Controles e HUD do jogador

- **Teclas:**
  - WASD anda;
  - Shift corre (1,8× e dobra o raio de detecção dos inimigos);
  - Ctrl agacha (0,5×, reduz o cone inimigo à metade e marca "furtivo");
  - Espaço pula: só atravessa uma casa `baixo` ou uma aresta `cerca` que esteja à frente, e no resto só pula no lugar;
  - F dá o golpe no mapa, num arco curto à frente; acertar um inimigo começa a batalha com surpresa;
  - E interage com o objeto mais próximo que tenha prompt;
  - Q/E giram a câmera.

  O conflito entre o E de interagir e o E de girar é resolvido assim: a rotação fica em **Q e R**, e o E fica para interagir. É uma decisão minha que precisa ser conferida com o usuário (veja "Escolhas minhas").
- Duplo clique no chão faz um ping, como hoje.
- **HUD** (DOM por cima do canvas):
  - fichas P5 menores (o `HUD` atual com uma variante de tamanho) no canto inferior direito;
  - minimapa num canvas 2D no canto superior direito, com névoa, aliados, pontos de interesse vistos e portais;
  - faixa de objetivo (`world.goal`) no topo;
  - nomes e mini barra de HP sobre cada herói e NPC, desenhados no espaço da tela a partir da projeção 3D;
  - balão sobre quem falou no chat, por 5 s;
  - prompt "E · Abrir baú" perto do objeto;
  - ícones flutuantes dos pontos de interesse, visíveis de longe.
- **Menu de pausa** (Tab ou Esc). É uma camada estilizada em tela cheia por cima do mundo, com as páginas que já existem em `paginas.js`: Ficha, Itens, Skills, Forja, Ofícios, Acampamento e Diário. O mundo continua rodando atrás, porque o jogo não pausa de verdade (é multijogador).
- **Chat.** Recolhível num canto; Enter abre.
- Os pedidos do jogador continuam no mesmo lugar.

### 5. Névoa e visão

- **Visão do herói** é calculada no servidor (`mundo-visao.js`, puro e testado), por shadowcasting na grade de arestas, com estes raios:
  - 8 casas de dia;
  - 6 à tarde;
  - 4 à noite ou na caverna, mais 2 da tocha.
- Paredes, portas fechadas, barreiras e peças `denso` cortam a visão. Grades e `baixo` não cortam.
- A visão é recalculada quando o herói troca de casa ou quando uma porta muda de estado.
- **Lembrança.** Toda casa vista entra em `sc.seen[f]`, o mapa do grupo. O mestre continua pintando a névoa (revelar ou esconder, pincel de 1 a 7) no editor.
- **Três estados para o cliente:**
  - escuro: casa nunca vista;
  - lembrado: casa vista, mas fora da visão de agora; aparece dessaturada, com objetos fixos e sem inimigos;
  - visível: dentro da visão de agora.

  O cliente recebe uma `DataTexture` por andar com esses três estados, e o shader do chão e das peças aplica cada um.
- **Filtro na projeção.**
  - Inimigos e NPCs só chegam ao jogador se estão em alguma casa visível de algum herói do grupo naquela cena.
  - Objetos `oculto` só chegam depois de revelados.
  - Armadilhas só chegam depois que alguém do grupo as percebe (`obj.rev`), e daí em diante aparecem para todos.
  - A TV segue o mesmo filtro do grupo. O mestre recebe tudo, com um botão para ver como o grupo vê.

### 6. Objetos interativos

Formato: `{ k, f, x, y, rot, vis: 'visivel' | 'oculto', auto: true | false | null, cfg }`. `auto: null` segue a chave nova `S.auto.inter`, que entra na seção Aprovação automática.

A interação é a mensagem `interact {id, obj, opt}`. O servidor confere a distância (≤ 1,5 casa), o andar e a visão. Se `auto` for falso, a interação vira pedido na fila (categoria `inter`), como hoje.

| Tipo | Configuração (`cfg`) | Efeito |
|---|---|---|
| `porta` (dona de uma aresta 2) | `estado` (aberta, fechada, trancada), `chave` (item), `teste` (atributo + dificuldade) | Abre e fecha. Trancada pede a chave do inventário ou um teste de atributo (rolagem atual, com Vantagem/Desvantagem se o mestre aprovar) |
| `barreira` (aresta 3) | `estado`, `aparencia` (grade, magia, entulho) | Só muda por alavanca, gatilho ou mestre |
| `bau` | `itens`, `ouro`, `uma` (uma vez para o grupo) ou `cada` (uma por herói), `teste` | Entrega no inventário de quem abriu e mostra o selo de item ganho que já existe |
| `item` | `item`, `qtd` | Pega e some |
| `npc` | `nome`, `retrato`, `imgF`, `dialogo` | Abre a caixa de diálogo (abaixo). Pode ser um NPC já do bestiário (`ch`) |
| `placa` | `texto`, `imagem` | Abre como um "Mostrar a todos", só para quem leu |
| `alavanca` | `alvos[]` (ids de objeto), `acao` (alternar, abrir, fechar) | Muda portas, barreiras e visibilidade |
| `gatilho` (zona de casas, sem modelo 3D) | `casas[]`, `quem` (qualquer herói, todos), `vezes` (uma, sempre), `acoes[]` | Ao pisar: abrir ou fechar, revelar névoa, texto, som, mudar objetivo, iniciar batalha com encontro salvo (emboscada) |
| `armadilha` | `perc` (dificuldade de SAB), `esq` (dificuldade de AGI), `dano`, `elem`, `cond`, `rearma` | Seção 6.1 |
| `escada` | `para: {f, x, y}` | E sobe ou desce |
| `portal` | `to` (cena), `destino` (objeto de chegada) | E segue a regra atual de pedido de passagem (`passReq`) |
| `inimigo` (aponta para um `ch` inimigo) | `rota[]`, `modo` (parado, patrulha, vagar), `visao` (raio, ângulo), `bando` | Seção 7 |
| `surgir` | — | Onde chegam os heróis que entram na cena sem portal |

- **Diálogo de NPC.**
  - Formato: `{ ini: 'a', nos: { a: { fala, escolhas: [{ txt, vai, faz }] } } }`, em que `faz` pode ser `loja`, `item`, `gatilho:<id>`, `objetivo:<texto>` ou `fim`.
  - Aparece numa caixa no estilo Persona, com retrato, para quem interagiu. Os outros heróis num raio de 3 casas veem a mesma caixa, só leitura.
  - O mestre vê a conversa ao vivo na Mesa e pode entrar falando como o NPC; a fala dele aparece na caixa como uma fala extra.
  - O editor de diálogo fica no inspetor do objeto: lista de nós com fala e escolhas, com um seletor para o destino de cada escolha.
- **Ícones flutuantes.** Todo objeto interativo visível tem um ícone por tipo e um prompt quando o herói chega perto.

#### 6.1 Armadilhas

- Quando um herói entra a até 2 casas de uma armadilha não percebida, o servidor rola em segredo SAB contra `perc`, uma vez por herói por armadilha.
- Se passa, a armadilha é revelada para o grupo todo (`obj.rev`), aparece com ícone e pode ser contornada.
- Se o herói pisa na casa, o servidor rola AGI contra `esq`: sucesso dá metade do dano, sem condição; falha dá dano cheio e a condição.
- O resultado vai para o log, com o mesmo número animado de fora do combate.
- Pisos `perigo` (lava, veneno) causam dano por segundo, sem rolagem, com um aviso na borda da tela.

### 7. Inimigos no mapa e início da batalha

- **Quem age.** Só o inimigo que tem um objeto `inimigo` ligado. Inimigos postos na cena do jeito antigo continuam parados no mapa até o mestre ligá-los a uma rota.
- **IA no servidor.** Roda a 5 Hz, dentro de `inScene()`, só em cenas sem batalha que tenham algum herói presente.
- **Estados:**
  - parado ou patrulha (segue a rota de casas, em vaivém ou em ciclo) ou vagar (sorteia casas num raio);
  - alerta, quando vê um herói no cone; fica 1 s olhando e mostra um "!" sobre a cabeça;
  - persegue, com caminho por A* na grade de arestas;
  - volta à rota depois de 6 s sem ver ninguém.
- **Detecção.** Cone com `raio` e `angulo`. O raio dobra se o herói corre, cai à metade se está agachado e não passa por paredes. Inimigos em "alerta" aparecem para todos com o cone vermelho no chão. Inimigos em patrulha mostram o cone em branco translúcido, para dar jogo de furtividade.
- **Início da batalha** (todos chamam o `H.battle` atual):
  1. o mestre inicia, como hoje;
  2. um herói encosta num inimigo (distância < 0,8 casa);
  3. o golpe no mapa (F) acerta um inimigo;
  4. um inimigo em perseguição alcança um herói;
  5. um herói pisa num gatilho com ação `batalha`, que põe na cena o encontro salvo nas casas marcadas e começa.
- **Quem entra.** Todos os heróis da cena. Dos inimigos, entram o tocado, o bando dele e os que estão a até 8 casas vendo a luta (veja "Para o usuário").
- **Vantagem na ordem.** Existe hoje a fila CTB por `ticks`. A batalha ganha um parâmetro `abre: 'surpresa' | 'emboscada' | null`:
  - **surpresa** acontece com o golpe no mapa que acerta, com o encostar pelas costas (o herói fora do cone do inimigo) ou com o encostar agachado sem ser visto. Os heróis começam com `ticks` adiantados (todos agem antes do primeiro inimigo) e os inimigos começam com a condição Exposto por 1 turno;
  - **emboscada** acontece quando o inimigo alcança o herói pelas costas ou pelo gatilho de emboscada. Os inimigos agem primeiro.
- **Formação.** Sai da casa lógica (`ch.x`, `ch.y`) de cada um, que o palco já converte em `formation()`. Num mapa grande, as distâncias são comprimidas em volta do centro do contato antes de entrar no `frame()`, para que ninguém fique a 40 casas no palco.
- **Terreno vira clima.** A casa do contato decide:
  - `agua` liga o clima "chuva";
  - `perigo` de lava liga "brasas";
  - o tema neve liga "neve";
  - o tema pântano liga "neblina";

  e o modificador de reação elemental que já existe vem junto com o clima. Esse clima só vale se a cena não tiver um clima definido pelo mestre.
- **Arena.** `sc.bbg = <tema da casa do contato>-<hora da cena>`, a menos que o mestre tenha fixado um fundo antes.
- **Transição em estilhaço.** O canvas do mundo é congelado num quadro, cortado em ~40 triângulos que giram e caem (no próprio three.js, antes de liberar a GPU), e o palco entra por baixo. Dura 700 ms. O usuário pediu "estilhaço clássico" (FF e Persona).
- **Depois da batalha.** O mundo volta com as mesmas posições, e os inimigos derrotados somem do mapa. Na derrota, o mestre decide, como hoje.

### 8. Editor do mestre

- Na tela do mestre, a vista **Mapa** (`gui.view = 'mapa'`) vira a vista **Mundo**, e as teclas M, Q e P continuam valendo. Ela fica no centro, dividida em duas partes:
  - à esquerda, o **grid 2D** do andar atual, num canvas 2D (64×64 = 4096 casas, não DOM);
  - à direita, o **3D ao vivo** do rascunho;
  - um divisor arrastável entre as duas, com a largura salva em `gui`.
- **Barra do editor:**
  - abas de andar (+ andar, renomear, tamanho);
  - ferramentas: Selecionar, Pincel de terreno (tema + tipo, tamanho 1–7), Balde, Retângulo, Parede (arrastar pelas arestas; Shift apaga), Porta, Barreira, Grade, Objeto (paleta de tipos da seção 6), Névoa (revelar/esconder), Mover herói (arrastar o token teleporta), Rota (desenhar a patrulha do inimigo selecionado) e Zona (casas de um gatilho);
  - Copiar trecho e Salvar como modelo;
  - Modelos (biblioteca com prévia: os seus e os do pacote padrão);
  - Gerar (seção 9);
  - Desfazer e Refazer, numa pilha local do editor com 50 passos que não usa o desfazer de sessão;
  - Publicar (conta quantas mudanças) e Descartar.
- **Inspetor.** Fica na doca direita enquanto a vista Mundo está aberta e mostra a configuração do objeto ou da aresta selecionada. Inclui o editor de diálogo.
- **3D do mestre.**
  - Câmera livre: arrastar com o botão direito, roda e Q/R;
  - botões Seguir herói e Ver como (a névoa e o filtro daquele herói);
  - Mostrar ou esconder névoa e ocultos;
  - Assumir NPC: com um NPC ou inimigo selecionado, o WASD do mestre move esse NPC no mundo publicado, e o mestre o move como um jogador.
- **Controles de movimento.** São ações do mestre, que ficam na barra do 3D e também na Mesa:
  - **Congelar** todos ou só os heróis selecionados; o herói congelado mostra um cadeado e o servidor recusa `walk`;
  - **Modo tático:** cada herói tem N casas por rodada (anel de alcance no chão); a rodada vira quando todos gastam, ou quando o mestre clica em "Próxima rodada";
  - **Chamar todos:** teleporta os heróis da cena para uma casa.
- **Publicar.** As edições na vista Mundo vão sempre para o rascunho. Quatro coisas mexem no mundo publicado na hora, porque são de condução da mesa e não de construção:
  - mover herói;
  - névoa;
  - congelar;
  - trocar o estado de um objeto, como abrir uma porta.
- **Mensagens novas do mestre:**
  - `wDraft {sc, ops[]}`, operações compactas: pintar casas, arestas, objeto criar/mudar/apagar, andar;
  - `wPub`, `wDiscard`;
  - `wTpl {add | del | import}`.
- O rascunho vai só para o mestre, num canal `draft` próprio, sem passar pelo `push` de todos.

### 9. Gerador e modelos

- O gerador fica em `src/mundo-gerar.js`, puro, com semente e testado no Node. Ele roda no servidor e escreve no rascunho.
- **Entradas:** tipo, tema, tamanho e semente, com o botão "outra semente".
- **Tipos:**
  - **Masmorra de salas:** divisão binária do espaço (BSP), salas ligadas por corredores, portas nas junções, alguns baús e armadilhas, uma sala de chefe no ponto mais distante da entrada e uma `surgir` na entrada;
  - **Área aberta:** ruído de valor para `denso`/`chao`, trilhas por A* entre 3–5 clareiras, rio opcional (`agua` + `fundo`) com pontes, e obstáculos `baixo` espalhados;
  - **Vila:** ruas em grade irregular, casas com paredes de aresta e porta (o interior fica no mesmo andar), praça com NPC placeholder e loja (liga a loja da cena) e cercas `baixo`;
  - **Caverna:** autômato celular, câmaras conectadas pela maior componente, lagos e cristais com luz.
- **Modelos.** Trecho é o retângulo de casas mais as arestas e os objetos dentro dele, e é carimbado com rotação de 90°. Objeto configurado é um objeto com `cfg`. Mapa é um `world` inteiro.
  - Exportar e importar em `.json` passam pela mesma limpeza da importação de campanha.
  - O pacote padrão traz de 3 a 5 trechos por tema (clareira, taverna, cela, ponte, altar…) feitos com o próprio gerador e ajustados à mão em código.

### 10. TV, som e mesa

- **TV** (`/table`). A câmera ortográfica enquadra sozinha a caixa de todos os heróis da cena mostrada, com zoom suave e margem. Sem heróis, mostra o andar inteiro.
- **Som** (por `som.js` e `som-catalogo.js`):
  - passos por tipo de piso: grama, pedra, madeira, água e neve, mais suaves para os aliados conforme a distância;
  - ambiência da área onde o herói está, trocada com fade: floresta, caverna, vento, lava (caldeira), pântano e mar, que já estão no catálogo;
  - efeitos de interação: porta já existe; baú, alavanca, item pego, armadilha e o "!" de alerta são novos.

  Os arquivos novos seguem a regra de créditos de `public/audio/CREDITOS.md`. Quando não houver arquivo adequado, o som é sintetizado pelo WebAudio, como os efeitos do combate fazem hoje.
- **Mesa do mestre** ([mesa.js](../../../public/js/mesa.js)). O botão "Editar" deixa de abrir `gView('mapa')` e passa a abrir `gView('mundo')`. Os cartões de cena ganham a miniatura do andar 0 e um selo "rascunho" quando há edição pendente.

### 11. Troca final

O 2D é removido só na etapa 9, quando todas as outras estiverem prontas e testadas. Até lá, o mundo 3D só aparece com `?mundo=1` na URL (ou com a chave `VJ_MUNDO=1` no servidor). É um recurso de desenvolvimento, não uma chave para o usuário.

Na troca:
- saem `map()`, o `cropper`, a régua, os marcadores, a barra de ferramentas do mapa e os campos antigos da cena;
- a vista Mapa vira Mundo;
- o `/player` no PC abre no mundo e o celular cai na tela simples;
- o README é atualizado (seções Mapa, Mapas e Atalhos).

## Etapas (um commit, ou mais, por etapa, no `main`)

1. **Dados e rede.** `world`, `draft`, `pos`, migração, `walk` e `pos`, colisão e validação, testes Node de migração, colisão e anti-teleporte.
2. **Motor 3D.** Peças por tema, cel shading, câmera, billboards, luz, clima, qualidade, liberação da GPU na batalha e medição de FPS.
3. **Editor do mestre.** Grid 2D, 3D ao vivo, ferramentas, andares, inspetor, rascunho e Publicar, e controles de movimento.
4. **Névoa e visão.** Shadowcasting, os três estados, o filtro na projeção e o pincel do mestre.
5. **Interações.** Os objetos da seção 6, o diálogo, as armadilhas, os portais e as escadas.
6. **Inimigos e encontros.** IA, detecção, os cinco inícios, surpresa e emboscada, terreno virando clima, arena e transição.
7. **HUD e telas.** HUD de exploração, menu de pausa, chat, TV e som.
8. **Gerador e modelos.** Os quatro tipos, os modelos, a importação e exportação e o pacote padrão.
9. **Troca final.** Remoção do 2D, celular, README e `ui-smoke` atualizado.

## Testes e medição

- **Node** (`npm test`): migração de um `state.json` real de `data-dev`, colisão (paredes de aresta, casas bloqueantes, pulo), validação de `walk` (velocidade, teleporte, congelado, tático), visão (shadowcasting com porta aberta e fechada), filtro de projeção (nada oculto vaza para jogador), IA (máquina de estados e detecção com correr e agachar), gerador (determinístico pela semente e sempre conectado), surpresa e emboscada nos `ticks`.
- **Rede** (`test-rede.js`): dez clientes andando a 10 Hz não disparam `push` e os `pos` chegam agregados a cada 100 ms.
- **Interface** (`ui-smoke.js`): andar, interagir com um baú, abrir o menu de pausa, editar e publicar, e entrar em batalha por contato.
- **FPS** com Playwright num mapa 64×64 de floresta densa à noite, com 6 heróis, 10 inimigos e chuva, nas qualidades Alta e Baixa. Se o Playwright repetir o "spawn UNKNOWN", a medição passa a ser feita no navegador embutido, com o contador interno de quadros.

## Escolhas minhas (para o usuário conferir)

- A rotação da câmera passou de Q/E para **Q/R**, porque o E é a interação. A alternativa é manter Q/E na câmera e usar F para interagir, mas o F já é o golpe no mapa.
- O celular fica com uma tela simples de "explore pelo PC" e as páginas atuais, já que o mapa 2D some.
- O menu de pausa não pausa o mundo (é multijogador).
- Raios de visão: 8, 6 e 4 casas, mais 2 da tocha. Na caverna, sempre a visão da noite.
- Correr: 1,8× de velocidade e o dobro do raio de detecção. Agachar: 0,5× de velocidade e metade do cone.
- Na surpresa, os inimigos começam com Exposto por 1 turno.
- O piso `agua` deixa lento, e não é bloqueio. O `fundo` bloqueia.
- O tamanho padrão de um mapa novo é 40×30. O máximo é 64×64.
- Mover herói, névoa, congelar e o estado de um objeto valem na hora; o resto passa pelo Publicar.
- Os marcadores antigos somem da interface, e os dados deles saem só na troca final.

- **Cenas maiores que 64.** Hoje uma cena vai até 80 colunas, e o número de linhas pode ser fracionário. Uma cena migrada mantém o tamanho (até 80), arredondando as linhas para cima, porque o piso dela é só imagem e `chao`, que pesa pouco. O limite de 64×64 vale para andares criados ou gerados no editor.
- **2D durante as etapas.** Até a primeira edição de uma cena no editor novo, o `world` dela é refeito a partir dos campos 2D sempre que o servidor inicia ou o 2D muda. Depois da primeira edição 3D, o 2D daquela cena passa a ser só leitura, e o mestre vê um aviso. O `move` antigo atualiza `ch.pos` (centro da casa), e o `walk` atualiza `ch.x` e `ch.y`, então os dois ficam coerentes.
- **Vários heróis por jogador** (`c.hero` e `c.ctl`). O WASD move o herói selecionado, e os outros ficam parados. A troca é pelos números 1–4 ou clicando na ficha do HUD. A câmera segue o selecionado. O `walk` aceita qualquer `id` que `can(c, ch)` permita. A TV enquadra todos os heróis da cena.
- **Hardware de referência.** O PC médio é a GTX 1650 (a máquina das medições de [cenarios-3d-anime]). O PC fraco é um vídeo integrado Intel UHD 620, emulado na medição com qualidade Baixa e `pixelRatio` 0,75. A qualidade Auto começa em Média e desce se ficar abaixo de 50 fps por 3 s.
- **Grade e cerca.** A aresta `4 grade` bloqueia a passagem, não bloqueia a visão e não pode ser pulada. Entra o código `5 cerca`, que bloqueia o andar, não bloqueia a visão e pode ser pulada com Espaço.

## Para o usuário (respondidas em 2026-11-19, depois da leitura do revisor)

- **Quais inimigos entram na batalha:** o inimigo tocado, os do mesmo `bando` (o mestre agrupa no editor) e qualquer outro a até 8 casas que esteja vendo um dos combatentes. Os demais continuam patrulhando. Quem chegar perto e vir a luta entra depois, pelo caminho de entrada tardia que já existe ([handlers.js:224](../../../src/handlers.js)). Ao terminar, os derrotados somem do mapa e os sobreviventes voltam à rota.
- **Quem vê uma armadilha percebida ou um objeto oculto revelado:** o grupo todo da cena. A marca de revelado fica no próprio objeto (`obj.rev = true`), ao lado de `sc.seen`, e vale para todos os jogadores e para a TV.

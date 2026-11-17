# Árvore de habilidades em mandala de esferas

Data: 2026-11-17 · Status: aguardando aprovação

## Intenção

O mapa da árvore hoje é uma grade 111×111 em SVG: correto, mas feio, difícil de navegar, com caminhos confusos e setores sem forma.
A ideia é trocá-lo por uma **mandala de esferas** inspirada no Sphere Grid: o Marcial como círculo central, os 11 setores (9 Vínculos,
Aura, Ocultismo) como pétalas em volta e os nós como esferas ligadas por trilhas curvas. Público principal: jogadores no PC, explorando
com calma. O mockup de referência está em `.claude/mockups/arvore/index.html` (visão "A · Mandala de esferas").

## Objetivos

- Cada linha desenhada é um caminho que dá para seguir, e todo caminho que dá para seguir está desenhado.
- Setores com identidade: forma de pétala, fundo temático, kanji do patrono grande.
- Navegação em níveis: afastado mostra os setores como selos; perto mostra nós, nomes e custos.
- Leitura rápida do estado: aprendido, dá para aprender, falta caminho, outro Vínculo, segredo.

## Fora do escopo

- Celular/toque como alvo principal (deve continuar funcionando com arrasto e pinça, mas sem design dedicado).
- Ferramentas novas para o mestre (nada além do que existe hoje: ver tudo, dar e tirar skill).
- Mudar custos, efeitos, requisitos ou a lista de nós.

## Anti-objetivos (seria fracasso mesmo funcionando)

- Linhas que cruzam pétalas ou ligam ramos que não se ligam de verdade.
- Uma linha visível que não dá para seguir, ou um nó aprendível sem linha até ele.
- O mapa ficar lento ou travar a página (1727 nós com animação).
- Personagens perderem skills já aprendidas na troca.

## Abordagens consideradas

1. **Ligações explícitas (escolhida).** O `buildSkills` registra em cada nó a lista dos nós a que ele se liga (`ln`), a partir do próprio
   encadeamento que já usa para montar a grade. A regra de aprender e o segredo passam a usar `ln`. As posições na tela ficam livres.
   Troca: somem os atalhos laterais entre ramos vizinhos que a grade criava por acaso.
2. Grade intocada com deformação só no desenho. Sem risco nas regras, mas as ligações laterais continuam e cruzam as pétalas.
3. Espaçar a grade para os ramos não se tocarem. Grade enorme, e mesmo assim sem curvas orgânicas.

Escolha do usuário: 1.

## Decisões do usuário

- Base visual: mandala de esferas (visão A do mockup).
- Ligações explícitas; nós podem ser reposicionados no `content.js`.
- Mapa em tela cheia; os painéis (Nó, Plano, Procurar, Ao seu alcance, Passivas, Aprendidas) viram uma gaveta lateral com abas.
- Escala: visão em níveis + entrar num setor (clicar no selo) + mapa contínuo com zoom e arrasto + minimapa.
- Setores: forma própria, fundo temático e kanji/selo gigante.
- Nó, de perto: nome, custo em XP, ícone do tipo e tooltip rico ao passar o mouse.
- Travas: selo no nó (requisito de atributo, Despertar), portão desenhado na trilha antes do nó travado e névoa nos nós secretos.
- Animação: esfera acende ao aprender, rota até o nó escolhido pulsa, fundo vivo (estrelas/partículas leves).
- Mestre: nada especial.
- Tecnologia: delegada (ver abaixo).

## Desenho

### 1. Dados: ligações e posições (`content.js`)

- `chain`/`forked` já escolhem, para cada nó, a casa onde ele encosta (o nó anterior, o ponto da bifurcação, a âncora do ramo). Passam a
  guardar também **qual nó** é esse pai. No fim, cada nó recebe `ln: [ids]`, simétrico (se A liga a B, B liga a A).
  - Ramo de 10 nós: tronco 1→2→3→4; caminho A 4→5→6→7; caminho B 4→8→9; nó final ligado à ponta de A ou de B (como hoje).
  - Ramos 1-4 de um setor: o primeiro nó liga ao nó âncora do ramo 0 que a grade escolheu. Ramos 5-9: à ponta do ramo de mesma posição.
  - Trilhas por tipo de arma: cada trilha liga à sua âncora.
  - Raiz de cada setor: liga ao nó Marcial mais próximo do seu eixo (só visual; ela continua `open`).
  - Núcleo Marcial: o centro liga a cada nó do anel; raios Marciais ligam ao anel; os Treinos ligam ao nó Marcial onde encostaram.
- Cada nó recebe `wx, wy` (coordenadas da mandala, em unidades de mundo), calculadas pelo mesmo princípio do mockup: setor `i` no ângulo
  `i·360/11`, ramo pela posição no leque (0, −1, +1, −2, +2) e pelo anel (ramos 5-9 continuam para fora), ondulação suave ao longo do
  ramo. Os ramos têm de seguir as ligações reais: o primeiro nó de um ramo nasce perto do nó a que se liga.
- `gx, gy` continuam existindo (o editor e pacotes antigos os usam), mas deixam de decidir quem é vizinho quando o nó tem `ln`.
- A assinatura `skillsSig` muda; a migração existente, que reencontra skills pelo nome, preserva o que cada personagem já aprendeu.

### 2. Regras (`public/rules.js`, `src/net.js`)

- Nova função compartilhada `linked(a, b)`: ligados se um está no `ln` do outro; e, quando **algum dos dois não tem `ln`** (skill
  criada à mão ou importada), também vale a vizinhança de grade de hoje. Assim uma skill nova encostada na grade continua alcançável.
  Ela é desenhada perto do nó oficial a que encosta, com a trilha até ele.
- `whyNot`: "Precisa de um nó vizinho já aprendido" passa a usar `linked`.
- `reachable` (segredo, `src/net.js`): usa `linked`; o caso "sem nada aprendido → só o centro Marcial" continua.
- `silhouette` inclui `ln`, `wx`, `wy` (sem isso o jogador não desenha a forma do que ainda é segredo).
- `skPath` (rota mais barata, `paginas.js`) passa a andar por `ln`.

### 3. Desenho do mapa (novo `public/js/mandala.js`)

- **Canvas 2D** num elemento persistente: o `render()` da página recria o HTML a cada mudança de estado, então o canvas é guardado e
  reencaixado no lugar em vez de recriado, e só redesenha. Câmera própria (x, y, zoom) substitui o `gv` atual e sobrevive às renderizações.
- Camadas, de trás para frente: fundo (gradiente por setor + estrelas), halos e kanji gigante dos setores, anéis guia, trilhas (curvas
  quadráticas), portões, rota, esferas, rótulos.
- **Afastado** (abaixo de um limiar de pixels por nó): só selos dos setores (kanji, nome do patrono, "seu Vínculo") e pontos coloridos.
  Clicar num selo leva a câmera até o setor com animação.
- **Perto**: esferas com gradiente na cor do setor. Estados:
  - aprendida: acesa (miolo branco, cor cheia);
  - dá para aprender: anel pulsante;
  - falta caminho: esfera escura com contorno;
  - outro Vínculo: apagada;
  - segredo: esfera coberta de névoa, rótulo "???".
  Passiva com anel extra; Limite/Proibida maiores. Ícone do tipo no centro (⚔ dano, ✚ cura/apoio, ◆ passiva, e as marcas de hoje 変 儀
  双 誓 召 禁 極). Selo 鎖 quando falta requisito de atributo. Nome embaixo e custo em XP quando ainda não aprendida.
- **Trilhas**: aprendida→aprendida com cor cheia e uma partícula correndo; demais translúcidas; de outro Vínculo quase invisíveis.
  Portão desenhado no meio da trilha que chega a um nó com requisito de atributo, Despertar ou escolha excludente já trancada.
- **Interação**: arrastar, roda/pinça com zoom no cursor, `+ −`; passar o mouse mostra o tooltip (carta resumida); clique fixa o nó na
  gaveta e desenha a rota tracejada animada até ele. Botões: Minha árvore, Marcial, Ver tudo, Só o que posso aprender. Minimapa clicável
  no canto.
- **Brilhos que já existem continuam**: resultado da busca (`hit`), nós no Plano (★), XP insuficiente (`poor`), nó selecionado.
- **Animação ao aprender**: a esfera enche de luz e as trilhas para os vizinhos acendem em sequência (~600 ms).
- **Desempenho**: desenha só o que está na tela; o laço de animação para quando a aba está oculta ou o mapa não está visível, e quando
  nada se mexe redesenha só as partes animadas em ritmo reduzido.

### 4. Página (`paginas.js`, `style.css`)

- `.skp` vira mapa em tela cheia com a gaveta à direita (~340 px), em abas: Nó · Plano · Procurar · Alcance · Passivas · Aprendidas.
  O conteúdo de cada aba é o que existe hoje na coluna lateral. A gaveta pode recolher.
- Legenda dentro da gaveta.
- A modal "Habilidades" do mestre (`gridFull`) e a página do inimigo usam o mesmo componente.

### 5. Acessibilidade

- O canvas tem rótulo e a gaveta continua navegável por teclado. A busca, "Ao seu alcance" e "Aprendidas" já dão acesso por lista a
  qualquer nó; clicar num item centraliza a câmera nele.

## Testes

- O teste de conectividade (`tools/test.js`) passa a percorrer `ln`: cada setor alcança todos os seus nós passando só por ele e pelo Marcial.
- Toda ligação é simétrica e nunca une dois setores diferentes (exceto com o Marcial).
- Nenhum nó sem posição `wx, wy`; nenhum par de esferas mais perto que o diâmetro.
- `whyNot` e `reachable` usam ligações: um nó vizinho de grade mas não ligado não é aprendível.
- Migração: um save antigo com skills aprendidas continua com as mesmas skills (pelo nome) depois da troca.

## Fica para quem implementar

- Fórmulas exatas da ondulação, espaçamento dos anéis e tamanho das pétalas (o mockup é o ponto de partida; o teste de distância mínima
  é o critério).
- Arte do fundo temático por setor (gradiente + partículas no estilo do patrono; sem imagens externas).
- Limiar exato entre "afastado" e "perto" e a velocidade das animações.
- Como o editor do mestre expõe `ln` (minha decisão: campo de texto "Liga a" com nomes separados por `|`, igual ao `pre`; vazio cai na
  vizinhança de grade).

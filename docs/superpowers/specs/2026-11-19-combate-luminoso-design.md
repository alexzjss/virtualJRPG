# Combate luminoso — recriação das animações de combate e skills

Data: 2026-11-19 · Estado: aguardando aprovação

## Intenção

Recriar, do zero e com o sistema atual só como ideia base, tudo o que se vê numa ação de combate no palco 3D (efeitos de skill, corpo dos recortes, telas de corte, números, selos e KO) no estilo **anime luminoso, referência Genshin / Star Rail**: brilho limpo, partículas suaves, geometria de luz (anéis, runas, estrelas), cores saturadas e legíveis. Deve ficar o mais bonito possível sem pesar no sistema.

## Metas, não-metas, anti-metas

- Metas: cada ação ~**2,5 s** (Limite/Domínio mais longos); 12 elementos claramente distintos além da cor; corpo do recorte que se move de verdade; **60 fps em PC médio, 30 fps no fraco**, com a qualidade Auto descendo sozinha e o canvas dormindo em repouso.
- Não-metas: áudio (fica o atual); regiões de cabelo/roupa na malha; editor de efeitos por skill; poses extras enviadas pelo mestre; aceleração por segurar tecla ou versão curta na repetição (o jogador acelera só pela velocidade 0,5–2× que já existe nas configurações).
- Anti-metas: voltar a dar tela preta nos Chromium fracos (segundo contexto de GPU, planos grandes, filtros nas camadas 3D); combate que trava a UI; perder legibilidade (quem bateu em quem, quanto, se acertou).

## Restrições herdadas

- O palco é CSS 3D (`palco3d.js`); planos grandes a 1/4 com `scale(4)`, sem `filter` nas camadas 3D (memória palco-camera-perf).
- Hitstop e câmera lenta usam o relógio virtual `CENA`; o motor novo também.
- A coreografia (`coreo.js`) e a matemática pura (`PFX`, auditada em `tools/test.js`) continuam sendo o roteiro; o que muda é quem desenha.
- Vale para jogador, mesa e mestre; só PC.

## Abordagens consideradas

1. **Canvas 2D turbinado** (sprites em cache + `lighter` no núcleo): leve e seguro, mas bloom, onda de choque com distorção e malha deformável ficam caros ou impossíveis.
2. **WebGL2 próprio substituindo o canvas 2D** (um contexto só) — **escolhida (minha decisão; o usuário delegou a tecnologia)**. Partículas instanciadas e blending aditivo são mais baratos na GPU do que no canvas 2D; permite bloom em meia resolução, distorção por shader e a malha dos recortes. O canvas 2D atual vira o fallback da qualidade Baixa / sem WebGL2.
3. **Three.js / PixiJS**: peso de biblioteca e, no caso do Three, conflito com a câmera CSS 3D. Descartado.

## O desenho

### 1. Motor `luz` (substitui `anim-engine.js` atrás de uma chave)

- Um `<canvas>` WebGL2 fixo fora do `#app` (como hoje), resolução = CSS × min(dpr, nível). Um único contexto; perda de contexto → recria ou cai para o 2D.
- Pipeline por quadro: (a) **recortes** (malha, ver §2) e efeitos na ordem de profundidade da cena; (b) partículas aditivas instanciadas; (c) **pós**: bloom em 1/2 (Alta) ou 1/4 (Média) da resolução, onda de choque (distorção radial amostrando o próprio buffer do efeito e uma captura barata do palco — ver nota), flash invertido, aberração cromática e linhas de velocidade. Todos os efeitos de pós desligam na Baixa.
  - Nota da onda de choque: o cenário é DOM, não textura. A distorção atua sobre o que o WebGL desenha (recortes + efeitos) e é reforçada por um anel refrativo desenhado (borda clara + escura) que dá a leitura de "entortar o ar". Decisão minha para não copiar o DOM para a GPU.
- Atlas único de texturas gerado em tempo de carga (glow radial, faísca, fumaça suave, estrela 4/8 pontas, anel, glifos dos 12 elementos) — nada de imagens novas para baixar.
- Orçamento: pool fixo de partículas por nível (Alta ~6000, Média ~2500, Baixa → fallback 2D); a Auto mede o fps nos golpes como hoje (`ANIMFX.level()` continua existindo para o palco).
- API pública mantida: `ANIMFX.play/profile/sync/flash/sparks/ink/level/setQuality/...`, para `coreo.js` e `palco-vida.js` não saberem qual motor está ativo.

### 2. Corpo dos recortes (malha)

- Cada `.bb` continua no DOM como âncora de posição, de clique e de mira, mas com a imagem invisível; o motor lê o retângulo projetado a cada quadro e desenha o PNG numa malha (~8×12 vértices) no canvas.
- Deformações por parâmetro, sem regiões: inclinação do tronco (dobra em torno do pé), squash/stretch, torção leve, avanço/recuo, tremor, e **ondulação suave do terço de cima com o vento do clima** em repouso (pé fixo). Nada de respiração.
- Cada família ganha uma curva corporal de três tempos (antecipação → golpe → recuperação) escrita como quadros-chave dos parâmetros; as reações (dano direcional, esquiva com fantasmas, parry, ferido curvado, Limite brilhando, KO) também viram curvas da malha.
- A luz do elemento tinge os recortes próximos (rim light no shader), substituindo o `PALCO3D.light` atual.
- Fallback 2D/Baixa: volta aos recortes DOM com as transformações CSS atuais.

### 3. Efeitos das skills

- **Procedural + assinaturas.** Continua `ANIM_PROFILES.profile()` (família, elemento, tier, semente), com mais parâmetros de variação por semente.
- 15 famílias reescritas em quatro fases com duração base ~2,5 s: carga (círculo mágico com o glifo do elemento sob os pés + convergência de luz), disparo, trajeto, impacto (flash, bloom, anel de choque, estilhaços de luz, decalque luminoso no chão que some).
- Cada elemento tem:
  - **material de luz** próprio (fogo: chamas e brasas subindo; água: bolhas e cáusticas; raio: arcos que piscam; vento: fitas espirais; luz: estrelas e cruzes; lua: crescentes e névoa violeta; sangue: gotas e fios; terra: lascas e poeira dourada; veneno/hiruko: bolhas ácidas; aura: hexágonos; oculto: olhos e fumaça negra com borda magenta; físico: faíscas brancas e linhas de velocidade);
  - **glifo geométrico** de assinatura, usado nos círculos e impactos;
  - **reação no cenário**: tinge o chão e os recortes vizinhos e deixa um resíduo curto (brasas, cristais de gelo que derretem, poças de luz…).

### 4. Assinaturas escritas à mão

- **Limite e Domínio**: tela estilo Star Rail. Escurece, fundo abstrato do elemento (luz + partículas), arte do herói grande com zoom lento, nome em letras finas, volta ao palco para o golpe; 4–6 s no total.
- **Camadas 8–10, por tema/linha**: uma coreografia por (tema da árvore × grupo de família), com tema ∈ {ofensiva, controle, defesa, maestria, especial} (`temaNo` de `arvore/ordem.js`) e cinco grupos de família (distância, corpo a corpo, área/chuva, ritual/invocação, apoio). São até 25 cenas, e as skills da linha variam cor, semente e intensidade. Decisão minha para caber nos "20–30" escolhidos.
- **Chefes**: na ficha, o mestre escolhe uma cena de entrada e uma de golpe numa lista de ~8 presets (ascensão, eclipse, tempestade, maré, erupção, julgamento, enxame, fenda) e uma cor. Campo novo no personagem (ex.: `bossFx: { in, hit, col }`), salvo como os demais campos de chefe.
- **Comandos especiais**: Black Flash (flash invertido negro e vermelho, faíscas pretas), Choque, contra-ataque e parry perfeito ganham cena própria.

### 5. Telas, números, selos e KO

- Crítico e Fraqueza **sem tela de corte**: número grande, flash, bloom e um selo pequeno "Fraqueza" no alvo.
- Números estilo **Genshin**: contorno fino, brilho na cor do elemento, crítico maior com estrela, total no fim do multi-hit, somem rápido. Podem ser desenhados no WebGL (texto num atlas dinâmico) ou continuar DOM com o estilo novo. Decisão minha: DOM, mais barato para texto.
- Selos (PERFEITO!, CONTRA!, CHOQUE!, BLACK FLASH!) e o corte de turno: **tipografia fina e larga, luminosa, com uma linha de luz correndo**.
- KO do inimigo: **o recorte trinca em luz na cor do elemento do golpe e se desfaz em fagulhas que sobem**.

### 6. Entrega

- Commit por etapa no `main` (memória sessoes-paralelas-sem-stash: adicionar só os próprios arquivos). O motor novo fica atrás da chave "Efeitos: Luminoso / Clássico" nas configurações. O clássico continua até o usuário aprovar jogando e depois é removido.
- Etapas: (1) motor WebGL + atlas + partículas + fallback; (2) malha dos recortes; (3) 15 famílias × 12 materiais; (4) pós (bloom, choque, flash, aberração, linhas); (5) números, selos, KO; (6) Limite/Domínio; (7) assinaturas por tema; (8) chefes e comandos especiais; (9) remoção do clássico após aprovação.
- Testes: a matemática nova (curvas da malha, orçamento de partículas, escolha de assinatura) entra pura em `PFX` e é testada em `tools/test.js`; o visual é verificado no navegador a cada etapa.

## Fica para quem constrói

- A forma exata de cada material e glifo, as curvas de cada família e o desenho de cada uma das 25 cenas e dos 8 presets, seguindo a referência Genshin/Star Rail.
- Os números finos do orçamento por nível, ajustados medindo.

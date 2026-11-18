# Árvore de habilidades: sistemas e notação

Referência das mecânicas que a árvore usa e de como escrever um nó. As regras ficam em `src/rules.js` (combate), `public/rules.js`
(requisitos, nomes e a descrição mostrada na tela, iguais para servidor e navegador) e `content.js` (montagem da grade).

## Estrutura (1187 nós na base; +82 da Leva 5)

| Bloco | Ramos | Nós | Acesso |
|---|---|---|---|
| Marcial (centro) | núcleo + 4 estilos de arma + treinos + 10 ramos novos | 157 | todos |
| Cada Vínculo (×9) | 1 Ataques · 2 Especiais · 3 Efeitos · 4 Assinatura · 5 Armas · 6 Maestria · **7 Transformação · 8 Rituais · 9 Ramo único** | 90 | quem tem o Vínculo |
| Aura (inspirada no Nen) | Fundamentos, Avançadas, 6 categorias, Votos, Aura em grupo, Aura póstuma | 110 | todos |
| Ocultismo (inspirado em Ordem Paranormal) | Iniciação, Proteção, Maldição, Exorcismo, Adivinhação, Necromancia, Medo, Poderes, Versões, Entidades, Relíquias | 110 | Despertar "Tocado pelo Outro Lado" |

Ramo único de cada Vínculo: Kagutsuchi = selos que detonam · Susanoo = invocações · Atlas = provocar e proteger · Indra = reações ·
Fuhaku = multi-golpe e ricochete · Amaterasu = reviver e purificar · Tsukuyomi = ilusões e selos · Shukketsu = votos de sangue e
roubo de vida · Hiruko = mutações e criações aberrantes.

Ramos novos do Marcial: Tática, Sobrevivência, Posturas, Técnicas em dupla, Explosivos, Respirações, Vontade, Caça a demônios,
Duelo, Medicina de campo. Cada estilo de arma passou de 6 para 10 nós (reações, multi-golpe, postura).

Grade 91×91: Marcial no centro e 11 setores em volta (9 Vínculos, Aura, Ocultismo). Em cada setor os ramos 0-4 abrem em leque na
base; os ramos 5-9 continuam da ponta do ramo de mesma posição; o ramo 10 (só na Aura) vai num terceiro anel.

Marcas na grade: 変 transformação · 儀 ritual · 双 técnica em dupla · 誓 voto · 召 invocação · 禁 proibida · 極 Limite.

## Tipos de nó (`k`)
`dmg` dano · `mental` dano na Sanidade · `heal` cura · `passive` passiva · **`form`** transformação ou postura · **`util`** suporte sem cura (escudo, purificar, invocar).

## Efeitos (`fx`)
Lista separada por `;`. Alvo opcional no fim: `self` (o usuário), `ally` (todos os aliados), `foes` (todos os inimigos); sem nada, vale para o alvo da skill.

| Efeito | Exemplo | O que faz |
|---|---|---|
| `st` | `st burn 3 60%` | aplica condição por N turnos, com chance |
| `det` | `det burn 6` · `det dot` · `det seal` | consome a condição do alvo e causa +M de dano por turno que restava (`seal` explode o selo ×1,5) |
| `drain` | `drain hp 50` | o usuário recupera % do dano (hp, aura ou san) |
| `exec` | `exec 30 1.6` | ×M se o alvo tiver até P% do HP |
| `vs` | `vs bleed 1.4` · `vs neg 1.4` · `vs demon 1.3` | ×M se o alvo tiver a condição (`neg` = qualquer ruim; `demon` = demônios e chefes) |
| `per` | `per burn 12` | +P% de dano por turno da condição no alvo |
| `rage` | `rage 1` | dano cresce com o HP que falta ao usuário |
| `pierce` | `pierce 50` | ignora % da armadura |
| `sure` | `sure` | não pode ser esquivado (acerto 95%) |
| `chain` | `chain 2 .7` | ricocheteia em mais N inimigos (×M a cada salto) |
| `strip` / `steal` | | remove os bônus do alvo / rouba para si |
| `push` / `haste` | `push 40` · `haste 50` | atrasa o alvo / adianta o aliado na fila (`haste … self` reduz o tempo da própria ação) |
| `seal` | `seal 30 3` | selo que explode depois de N turnos do alvo |
| `shield` | `shield 12` | escudo (P + atributo/5), dura 3 turnos |
| `cleanse` | | remove condições ruins |
| `revive` | `revive 40` | reergue caído com P% do HP |
| `res` / `gain` / `lose` | `res san 4` · `gain aura 6` · `lose aura 8` | restaura no alvo / no usuário / tira do alvo |
| `spread` | `spread burn` | espalha a condição do alvo para os aliados dele |
| `guard` | `guard 3` | o usuário vira guarda-costas do alvo |
| `turn` | | o usuário age de novo |

Outros campos: `hits` (número de golpes; o bônus de atributo é dividido entre eles e a armadura conta em cada um), `chg`
(turnos concentrando; dano de 20% do HP ou controle interrompe), `pay: { hp: 8, san: 3 }` (custo extra; hp em % do máximo),
`tg: 'self'`, `nf: 1` (só transformado), `duo: 'Nome'` (técnica em dupla), `summon: 'Nome'` (catálogo `SUMMONS` em content.js),
`circ` (círculo do ritual).

## Transformações (`fm`)
`fm: 'dur 4; atk 30; def 20; agi 15; hit 10; crit 10; atkP 6; heal 20; dr aura 5; end st exaus 3; end lose san 6'`
- Uma por personagem; assumir outra encerra a atual sem colateral.
- `dr` drena a cada turno (hp em %); sem recurso, a forma acaba. Ao acabar pelo tempo ou por falta de recurso, aplica `end`.
- Exausto não pode se transformar. As transformações finais de cada Vínculo exigem o Despertar do patrono.

## Passivas
- `mod: 'atk 10; hit 5'` com escopo opcional `sc`: `atk` (ataque básico), `mental`, `heal`, `area`, `req` (técnicas de arma), `form` (transformado), `circ` (rituais) ou o nome de um elemento.
- `bon: 'INT 4; sanMax -5'`: bônus permanentes. Poderes paranormais e pactos custam Sanidade máxima.
- Gatilho: `on` + `fx` (+ `ch` de chance). Eventos: `start`, `turn`, `low` (30% do HP, 1×), `kill`, `crit`, `weak`, `hurt`, `fall` (golpe fatal: fica com 1 HP, 1× por batalha), `heal`, `miss`, `ally` (aliado cai). Gatilhos não causam dano direto.
- Voto: `vow` (catálogo em rules.js): presa, corpo, pureza, sangue, chama, silêncio, caçador, arma, tempo, preço. Romper o Voto do Corpo Fechado custa 20% da Sanidade máxima e desliga o voto até o fim da luta.
- Amplificação (versões Discente e Verdadeiro dos rituais): `amp: 'Ritual: X', up: { p, c, san, area, hits, fx }`.

## Rituais
`circ` 1-4; custo em Aura + `pay.san`. Um **Componente Ritualístico** no inventário (loja do Santuário Profanado) corta a
Sanidade pela metade e é gasto sozinho. O Voto do Preço troca a Aura dos rituais por +4 de Sanidade.

## Requisitos para aprender
Além de XP, vizinhança, atributo (`rq`), arma (`req`) e escolha excludente (`ex`):
- `pre: 'A|B'`: nós nomeados aprendidos antes;
- `nb: 6`: quantidade de nós do mesmo ramo;
- `aw`: Despertar concedido pelo mestre na ficha (Tocado pelo Outro Lado, Aura Singular, Comunhão Eremita, Despertar de cada patrono);
- `cs`: estado do personagem (`duplo` dois Vínculos, `livre` sem Vínculo, `voto` ter um voto, `marcado` ter perdido 10+ de Sanidade máxima, `forma` conhecer uma transformação);
- `cat`: categoria de Aura. A primeira categoria aprendida vira a natureza do personagem. Vizinhas no hexágono
  (Intensificação, Transformação, Conjuração, Especialização, Manipulação, Emissão) rendem 80%, a duas casas 60% e a oposta 40%;
  o XP sobe ×1,25 / ×1,5 / ×2. Especialização exige o Despertar "Aura Singular". O mestre pode trocar a natureza na ficha.

## Condições novas
Escudo, Regeneração (1/20 do HP por turno; chefes 1/3 disso), Provocando, Protegido, Contra-ataque, Reflexo (devolve 30%), Esquiva (o
próximo golpe erra), Furtivo (não pode ser alvo direto; +25% de acerto e crítico dobrado no próximo ataque), Foco (+15% de acerto,
vê Furtivos), Exposto (armadura não conta), Exausto, Selo, Cego (−25% de acerto), Enraizado (AGI não ajuda a esquivar),
Concentrando, Transformado, Tenacidade (o próximo golpe fatal deixa com 1 HP), Pavor (perde Sanidade por turno, +25% de dano mental).
Desarmado (`st disarm N`): a arma equipada não conta (luta com os punhos, perde as técnicas com `req` de arma); inimigos e invocações causam −20% de dano físico.
Dano contínuo agora acumula duração (até 6 turnos).

## Inimigos
A IA usa Limite, transformação, reerguer (com o mesmo intervalo das curas), cura, purificar, invocar, buffs e dano (prefere os golpes
físicos mais fortes). Chefes e inimigos gerados recebem dos ramos 7-9 só ataques e transformações (sem as que aumentam cura); duplas,
rituais, Despertares e invocações ficam só com os heróis.

## Sistemas de batalha novos
- **Barra de Quebra** (`brk` no personagem): chefes têm 3 pontos e elites 2. Fraqueza elemental e ponto fraco tiram 1 cada; o efeito `brk N` tira N. Zerada, o alvo fica **Quebrado** por 2 turnos: perde o turno e sofre +50%.
- **Cadeia**: fraqueza +15, crítico +10, outro golpe +4. A 100%, cada aliado ataca em seguida (bônus de +25% por posição).
- **Ataque Total**: com todo inimigo vivo **Derrubado ou Quebrado**, o jogador da vez chama o golpe conjunto (×1,5), gastando 150% do tempo.
- **Fraqueza**: derrubar um inimigo dá um turno extra (já era assim); acertar fraqueza em quem já está Derrubado reduz o tempo da ação em 25%. **Passar a Vez** (`pass` na ação): depois de acertar uma fraqueza, o aliado escolhido age em seguida com ATQ↑.
- **Coragem**: Defender guarda 1 ponto (máx. 3) e dá −25% de dano; `brave` gasta 1 ponto para agir de novo. Com 0 pontos é possível ficar devendo até 2: a dívida atrasa na fila em 50% do intervalo por ponto.
- **Tensão**: Concentrar gasta o turno (70% do tempo): o próximo golpe causa ×1,5 / ×2 / ×3.
- **Clima** (`sol`, `chuva`, `neblina`, `tempestade`, `eclipse`): o mestre escolhe na cena; `fx: 'clima chuva 3 self'` troca por N rodadas. Mexe no dano por elemento e no acerto (tabela `CLIMA` em `rules.js`). Na chuva a água sempre molha.
- **Reações elementais** (tabela `REACT`): Eletrocutar (raio em Molhado), Explosão (fogo em Oleado), Vapor (fogo em Molhado), Faíscas (raio em Oleado), Estilhaçar (impacto em Congelado), Vento Gélido (vento em Molhado), Lama (terra em Molhado), Purgar (luz em Veneno/Radiação). Golpes de Susanoo molham com 35%.
- **Expansão de Domínio** (`dom: 'dur 3; ally atk 20; foe def -10; tick burn'`, com `aw`): exige metade da Aura, gasta toda, dura N turnos do usuário e o deixa Exausto ao fim. Dois Domínios disputam `INT/SAB + Aura/2 + d100/2`; o perdedor desmorona.
- **Técnicas em trio** (`trio: 'Nome B|Nome C'`): dois aliados distintos com as skills pares pagam e perdem o próximo turno.
- Requisito `v2: 'indra'`: exige também esse Vínculo (fusões e sinergias de Aura).
- Condições novas: Molhado, Oleado, Quebrado.

## Cartas do Canva (`arvore/cartas.js`)
Dois designs de cartas foram agregados (sem repetir) e viraram ramos novos no fim de cada setor: **Marcial** (cartas básicas: Força, Esquiva,
Bloqueio, Cólera, Kai, Clareza, duplas e trio), **Aura** (Shukoudan, Canhão de Aura, versão gélida com `v2: fuhaku`), **Indra** e **Fuhaku**
(2 ramos cada: ataques, e reforços/reações/forma), **Kagutsuchi** (Forma Carmesim), **Tsukuyomi** (Mundo do Tsukuyomi como Domínio, Verdade) e
**Hiruko** (A Doença). Versões da mesma carta em níveis diferentes viraram um nó base + um nó de evolução (`amp`, ex.: "Wakaze: Nível 2").
Conversão: custo da carta → Aura (`c`); dano da carta × 0,85 → poder (`p`); Reforço e Forma → `fm`. Não portadas: Evolução, Desejo, Nova Carta
(progressão, que já é o XP da árvore) e as cartas só citadas nas Formas sem descrição (Pressão Interna, Kaiser, Sobrecarga).

Mecânicas novas no motor:
- `stack doenca N` (efeito, em si): acumula 1 estágio da **Doença** (máx. N). Cada estágio dá +8% de dano às técnicas que têm o efeito; do 3º em diante
  o corpo perde 1,5% do HP máx. × (estágio − 2) por turno. Zera ao começar a batalha ou ao ser purificado (`cleanse`). Aparece no palco como "Doença ●●".
- `ret N` (campo de `fm`): quem erra um ataque contra o transformado perde N% do tempo do próprio turno (a "Rosa dos Ventos" da Forma Prateada).

## Leva 2 (`arvore/leva2a.js`, `leva2b.js`, `leva2c.js`)
Dois ramos novos em **cada** setor (9 Vínculos, Aura, Ocultismo e Marcial), 240 nós: um **Ofensivo** (técnicas nomeadas, evolução
"Nível 2", combos; os nós 7 e 10 são **Limites**) e um de **Reações e Reforços** (reações automáticas, forma, cargas; o nó 10 é um
**Limite** de suporte). São 3 Limites por setor (36 no total) e mais 5 nós completam o ramo da Doença (com o Limite Pandemia).
Vínculos seguem o estilo das cartas; Ocultismo e Marcial, o tom da campanha (caçadores, trincheira, anos 1910-20).
A grade passou de 91×91 para **111×111** para caber tudo; as fichas são remapeadas pelo nome, como sempre.

### Mecânicas novas
- **Reações** (`rea: 'evade 40'`, `block 35`, `absorb 35`, `counter 15`): o nó continua usável no próprio turno (pela `fx`), e além disso
  dispara **sozinho no turno do inimigo**, uma vez por rodada do personagem, pagando o custo da técnica. Esquivas são testadas antes do
  acerto (não valem contra `sure`); bloqueio, absorção (o dano segurado vira Aura) e revide só quando o golpe acerta. Golpes em área,
  contra-ataques e personagens atordoados/congelados/dormindo/silenciados não disparam reação. Se o personagem tiver várias, usa a
  melhor que puder pagar: esquiva > bloqueio > absorção > revide.
- **Cargas** (`stack K N` em si; `burst K M`): cada Vínculo tem a sua: `brasa`, `mare`, `rocha`, `carga`, `vento`, `luz`, `sombra`,
  `sangue`, `mutacao`; e `ressonancia` (Aura), `pavor` (Ocultismo), `impeto` (Marcial), `doenca` (Hiruko). Técnicas com `stack K` ganham
  +6% de dano por carga (Doença: +8%). `burst K M` consome todas e multiplica o dano por (1 + M × cargas). Zeram no início da batalha.
  Aparecem no palco como "Brasa ●●●".
- **Combos** (`combo: 'A|B'`, `cm: 1.5`, padrão 1,4): se a última técnica usada pelo personagem foi A ou B, o golpe sai ×cm e o log
  avisa "COMBO!".

## Núcleo aberto

O centro Marcial e o anel em volta dele, e a raiz de cada setor (para quem tem o Vínculo, ou o Despertar no caso do Ocultismo), têm `open`: dá para aprender sem ter um nó vizinho. Assim todo personagem chega à linha básica Marcial e à Aura, mesmo começando só com a raiz do Vínculo, longe do centro. No mapa, o botão "Marcial" leva até o núcleo.

## Segredo da árvore
Jogadores (e a mesa) recebem do servidor os nós que ainda não alcançam como **silhueta**: nome "???", sem descrição, poder nem efeito
(`src/net.js`, `hiddenSkills`/`defsFor`). Fica à vista o que algum herói já aprendeu, os vizinhos do que os personagens do jogador já
têm (respeitando Vínculo, Despertar e o Vínculo extra `v2`) e, para quem não aprendeu nada, o centro Marcial. O mestre vê tudo.
As versões com silhueta são cacheadas por conjunto de nós escondidos, então o custo por atualização é pequeno.

## Leva 3 (`arvore/leva3.js`, 116 nós)
Ramos novos: **Marcial** Aparar e Marcas do Caçador · **Aura** Black Flash, Técnica Reversa e Clones de Aura (Conjuração) ·
**Tsukuyomi** Sombras · **Fuhaku** Imagens Residuais · **Hiruko** Brotos de Carne · **Kagutsuchi, Susanoo, Atlas, Indra, Amaterasu, Shukketsu**
um ramo de 7 nós cada (Aparar temático, revide, Marca ou Técnica Reversa e um golpe com Black Flash).

### Mecânicas novas
- **Aparar** (substituído pela janela `S.battle.cmd` da Leva 4, ver abaixo; `pas: 'par'`, `par` = ms da janela boa, `c` = Aura por tentativa, `p` = Aura de volta ao acertar). Quando o mestre manda o
  inimigo agir (botão IA) e algum herói tem um nó de Aparar com Aura, o servidor abre `S.battle.parry` por 1,6 s e o golpe sai quando
  ela fecha. O jogador vê um anel fechando (`public/js/aparar.js`) e aperta o botão ou Espaço. Nos últimos `par` ms (+200 ms de folga),
  o golpe é anulado (sem dano nem condição), dá +`p` Aura, +10 de Limite e tira 1 da Quebra do atacante. Cedo demais: +50% de dano e Exposto.
  Vale só contra golpe de alvo único e não mental (nem área, nem contra-ataque, nem `sure`). Uma tentativa por rodada, paga mesmo errando.
  O nó de maior janela vale. **Chefes (15%) e elites (10%)** aparam golpes de alvo único dos heróis, uma vez por rodada, deixando o atacante Exposto.
  Ações de inimigo lançadas à mão pelo mestre (sem o botão IA) não abrem a janela.
- **Black Flash** (`bf: N` na técnica; `mod: 'bf N'` alarga): desde a Leva 4 só sai no Perfeito do Golpe no tempo (×2,5, devolve 25% da Aura máx.).
- **Cicatriz** (`scar hp|san|aura P`): tira P% do máximo até o **descanso longo**. É o preço da Técnica Reversa e das Marcas.
- **Marca** (condição `mark`): +30% de dano, +20% de velocidade e +10% de crítico. Os nós de Marca são gatilhos `on: 'low'` (30% do HP, 1×/batalha).
- **Clones** (`clone N P`, normalmente `self`): N combatentes reais na fila, cada um com P% do HP atual do dono (que perde esse HP).
  Copiam atributos e até 4 técnicas de dano simples, causam 50% do dano, agem sozinhos, duram 3 turnos e somem ao cair. No máximo 3 por dono.

## Comandos de ação (Leva 4, `arvore/leva4.js`, 45 nós)
Spec: `docs/superpowers/specs/2026-11-17-comandos-de-acao-design.md`. Substitui o Aparar e o Black Flash descritos na Leva 3.

### Defesa (janela `S.battle.cmd`, medida no servidor)
- Quando o inimigo age, pelo botão IA ou com o golpe escolhido à mão pelo mestre (`manualPlan`), o servidor fixa antes a técnica e o alvo e abre a janela **só para o alvo**:
  golpe anunciado (`tel: 1` no nó ou na lista `telK` da ficha) e **ataque básico** abrem Esquiva para todo alvo (`C.esq`); outro golpe físico de alvo único abre só
  Aparar, para quem tem o nó e Aura. Choque, Perfeito de chefe e direção da esquiva continuam só no golpe anunciado (`C.tel`). O golpe sai quando a janela fecha (`aiRun`). O mestre pode pular a espera (`cmdSkip`).
- Uma tecla só. Anel de 1100 ms. Nos últimos `par` ms (+200 de folga) **apara**; nos 450 ms antes disso **esquiva** (grátis, sem limite, só em golpe anunciado);
  mais cedo: errou (herói Exposto; sem golpe anunciado ainda leva +50%). Aparar certo: anula o golpe, +Aura, +10 de Limite, −1 de Quebra e **o inimigo fica Exposto**.
- Golpe de várias batidas: uma batida por golpe (700 ms de intervalo), nota por batida, Aura cobrada uma vez. Todas aparadas: **contra-ataque** (básico ×1,5).
- Chefes: 20% de chance de golpe anunciado Perfeito (×1,25, batida 20% menor). `telK` nasce na primeira consulta: chefe = 2 técnicas mais fortes, elite = 1.
- **Choque de poderes** (`cmd: 'choque'`): só em golpe anunciado de alvo único; tecla C abre um cabo de guerra de 3 s (até 20 apertos/s). Vencer devolve o golpe ×1,3 e expõe o inimigo.

### Ataque (nota medida no navegador, enviada no `act` como `cmd: { g, n, acc }`; o servidor limita)
Campos do nó: `cmd`, `pf` (efeito extra do Perfeito, notação de `fx`), `mx`/`mt` (martelar), `seq` e `fin` (sequência), `nt` (ritmo), `rn` (runa), `cw`/`cp`/`cz`/`ma`.
| `cmd` | Bom | Perfeito |
|---|---|---|
| `tempo` | ×1,2 | ×1,4 + `pf`; com `bf`, só o Perfeito dispara o Black Flash (janela 30 + 8·bf ms) |
| `martelar` | + golpes extras pela barra (até `mx`) | barra cheia: + `pf` |
| `segurar` | ×1,3 | ×1,6 + `pf`; passar do topo estoura (sai normal e Exposto) |
| `seq` | nó novo: +1 golpe de 50% por seta; nó antigo: os `hits` são o piso | tudo certo: golpe final `fin` + `pf` |
| `ritmo` | +1 turno nos buffs, +10% de cura ou dano por nota | todas as notas: `pf` |
| `mira` | crítico e −2 na Quebra | + `pf` |
| `runa` | ×1,2 (≥ 60% de semelhança); ritual sem dano: +1 turno | ×1,4 (≥ 85%); ritual: não cobra Sanidade |
Todo nó com `bf` vira `tempo`; todo ritual com `circ` vira `runa` (1º círculo = círculo, 2º = triângulo, 3º = estrela, 4º = espiral).
Ignorar o comando nunca tira dano. Chaves novas de `mod`: `cw cp mx cz ma esq par chq rit ctr rn`.

## Ligações e mandala

Cada nó tem `ln`: os ids dos nós a que se liga, sempre simétrico. O `buildSkills` grava a ligação com a casa de onde cada nó saiu ao
montar a grade (nó anterior do ramo, ponto da bifurcação A/B, âncora do ramo, o centro Marcial para o anel). Aprender, o segredo
(`src/net.js`) e a rota mais barata usam `RULES.linked(a, b, ida, idb)`: ligados se um está no `ln` do outro; uma skill sem `ln`
(criada pelo mestre ou importada) também liga pela vizinhança de grade de antes. Vizinho de grade sem ligação não basta.

No editor do mestre, "Liga a" recebe nomes separados por `|` e grava as ligações nos dois lados; vazio volta à vizinhança de grade.

A tela desenha a árvore como mandala em canvas (`public/js/mandala.js`): `wx, wy` = grade em escala (`MANDALA_U` = 96 por casa),
cada linha é uma ligação. Afastado, os setores viram selos; de perto, esferas com nome, XP e ícone, selo 鎖 de requisito, portão ⛩
na trilha antes de nó travado e névoa nos secretos.

## Leva 5: Ordo Realitas (`arvore/ordo.js`, 82 nós)
Habilidades de classe e de trilha de *Ordem Paranormal RPG* e de *Sobrevivendo ao Horror*, adaptadas ao combate por turnos (ação extra → `haste`/`turn`;
reação com PE → `rea`; PE → Aura; Sanidade continua Sanidade). O Ocultismo-ritual do livro já existia em `oculto.js`; aqui entra o resto.
- **Marcial (6 ramos):** Aniquilador (arma favorita, Técnica Secreta/Sublime, Limite *Máquina de Matar*) · Comandante de Campo e Operações Especiais (ações extras, Limite *Oficial Comandante*) ·
  Guerreiro e Tropa de Choque (revide, provocar, *Potência Máxima*) · Atirador de Elite e Infiltrador · Médico de Campo, Negociador e Técnico · Sobrevivente.
- **Ocultismo (4 ramos):** Conduíte e Flagelador (`pay: { hp }` troca Aura por vida; Limite *Medo Tangível*) · Graduado, Intuitivo e Lâmina Paranormal ·
  Poderes dos elementos (Sangue, Morte, Conhecimento, Energia) · Possuído e os quatro Presentes.
- **Mecânica nova `mad N` (Loucura):** dano ×(1 + N × fração da Sanidade que falta ao usuário), no mesmo molde de `rage`. Usada nos nós de Medo e de Caos (*Canalizar o Medo*, *Lâmina do Medo*, *Valer-se do Caos*...).
- Não portado: o que depende de perícias, inventário, investigação e perseguição (Carteirada, Eu Conheço um Cara, Preparado para Tudo, Terapia...), por não ter equivalente no combate.

## Árvore de Armas (isolada)

Os ramos de arma saíram do tronco Marcial para `TREE.armas` (ver ARMAS.md, "Árvore de Armas"): bloco à parte na grade, sem ligação com o resto. No Marcial, `branches[0]` é o núcleo, `[1]` os treinos e o resto vem em seguida
(content.js usa `M.slice(2)` para os raios). `TREE.armas.branches` é a lista plana para as ferramentas que percorrem todas as árvores. Campos novos: `reqItem` (item exigido, tag em `kit` do item), `req` com categoria e `sc: 'wc:<cat>'`; `ramo` marca o 1º nó de um ramo (nome desenhado na mandala).

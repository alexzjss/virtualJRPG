# Árvore de habilidades: sistemas e notação

Referência das mecânicas que a árvore usa e de como escrever um nó. As regras ficam em `server.js` (combate), `public/rules.js`
(requisitos, nomes e a descrição mostrada na tela, iguais para servidor e navegador) e `content.js` (montagem da grade).

## Estrutura (1187 nós)

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
Dano contínuo agora acumula duração (até 6 turnos).

## Inimigos
A IA usa Limite, transformação, reerguer (com o mesmo intervalo das curas), cura, purificar, invocar, buffs e dano (prefere os golpes
físicos mais fortes). Chefes e inimigos gerados recebem dos ramos 7-9 só ataques e transformações (sem as que aumentam cura); duplas,
rituais, Despertares e invocações ficam só com os heróis.

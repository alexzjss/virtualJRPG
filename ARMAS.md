# Armas

O personagem empunha **uma arma** (slot `arma`). Ela define duas coisas em batalha:

1. **O ataque básico** (sem custo): atributo usado, tempo da ação, número de golpes, área, condição com chance, perfuração, efeitos extras e bônus enquanto empunhada.
2. **As técnicas da arma**: skills que existem só com ela equipada (aba **Arma** no menu de batalha), sem gastar XP. Trocar de arma troca o repertório.

Sem arma, o personagem luta com os **punhos**: FOR, poder base da ficha (`arma`, padrão 8), sem traços. É exatamente o ataque antigo, então inimigos e fichas sem arma não mudam.

As técnicas de lâmina, lança, tiro e punho da árvore (`req`) continuam pedindo o tipo certo de arma.

## Arquivos
- `public/armas.js` (compartilhado, `globalThis.ARMAS`): tipos, categorias, níveis, **modelos**, perfil do ataque (`prof`), efeitos do básico (`basicFx`), régua de orçamento (`score`/`rel`), montador (`make`), técnicas (`skill`) e limpeza do rascunho do criador (`clean`).
- `content.js` → `WEAPONS`: o catálogo padrão (47 armas), todas montadas a partir dos modelos. Os modelos da expansão (44) ficam só na Forja de armas: o mestre cria as peças quando quiser.
- `src/rules.js` e `src/handlers.js`: `basicOf` (ataque básico pela arma), `SK`/`wSk` (técnicas da arma), `modsOf` (traços, bônus e requisito), `wpnSave` (criador do mestre), migração `S.itemsV = 2`.
- `public/js/*.js` (interface): cartões e ficha com os traços e técnicas, aba **Arma** na batalha, botões ⚔ do mestre e a janela **Forja de armas**.
- `rules.js` ganhou `parseFx`/`parseForm` (antes só em `content.js`) e o caminho inverso `fxSrc`/`formSrc`, para o navegador validar efeitos e copiar técnicas da árvore.

## Tipos
| Tipo | Atributo padrão | Jeito |
|---|---|---|
| Lâmina | FOR | equilibradas; liberam as técnicas de lâmina |
| Haste | FOR | alcance e perfuração; técnicas de lança |
| Arma de fogo | DES | usam a munição equipada; técnicas de tiro |
| Punhos | FOR | rápidas; técnicas de luta |
| Arma pesada | FOR | lentas, derrubam e racham armadura, pedem FOR mínima |
| Foco místico | INT | grimórios, cajados, sinos, espelhos, tambores, bonecas e tarô; podem usar SAB, CAR ou SOR, ou ferir a Sanidade |
| Corrente | DES | kusarigama, chicote, mangual, nunchaku, martelo-meteoro: enroscam, derrubam |
| Arremesso | DES | shuriken, kunai, facas de circo, bumerangue, chakram, boleadeira: rápidos, vários golpes (bumerangue e chakram usam DES/AGI) |
| Arco e besta | DES | arco curto, yumi, besta, besta de repetição, zarabatana: precisão, perfuração, flechas |
| Escudo | FOR (DES ou SAB em alguns) | arma de mão que é ele mesmo: ataque de borda fraco, **bloqueio**, defesa fixa e técnicas de guarda (`guard`) |
| Instrumento | CAR (SAB nos sopros) | ataque mental ou leve; técnicas de cura, ATQ↑/DEF↑ e velocidade para o grupo todo |

**Bloqueio (`block`, escudos):** chance em % por escudo (broquel 10, torre 25). Ao receber um golpe físico único de um inimigo (nem área, nem mental, nem contra-ataque), rola essa chance: se bloquear, o dano cai 60% e o golpe **não aplica condições** (empurrar e roubar vida continuam). Aparece como `[bloqueado]` no registro. Só vale contra inimigos (um aliado não é bloqueado).
**Armas de apoio:** escudos e instrumentos têm a faixa de orçamento do ataque 35 pontos abaixo (limite superior 25 abaixo): o valor deles está no bloqueio, na defesa e nas técnicas. A Forja marca "(arma de apoio)".

**Distância:** fogo, corrente, arremesso e arco não sofrem **contra-ataque** com o ataque básico, as técnicas da arma e as técnicas de arma da árvore.
**Munição:** fogo usa balas e arco usa **flechas** (campo `for: 'arco'` no item). A munição pode dar elemento, condição com chance (`st`, `stc`, `stn`) e perfuração (`pierce`); munição do tipo errado não é gasta.

| Flecha | Efeito (8 disparos por pacote) | Receita (Caça) |
|---|---|---|
| Flecha de Prata | Amaterasu | Flecheiro (Aprendiz) |
| Flecha Incendiária | Kagutsuchi | Flecheiro |
| Flecha Envenenada | 40% de Veneno 3t | Pontas Especiais (Oficial) |
| Flecha de Ponta de Aço | ignora 40% da armadura | Pontas Especiais |
| Flecha de Corda | 30% de Enraizado | Flechas de Caçada (Oficial) |
| Flecha-Sinal | 50% de Marcado | Flechas de Caçada |

Os três nós de Caça entram no fim da lista da perícia, para não mudar os ids dos nós já aprendidos.

## Campos de uma arma
Todos opcionais; o padrão vem do tipo.

| Campo | O que faz |
|---|---|
| `wa`, `wa2` | atributo do ataque; com dois, usa a **média** (katana: FOR/DES) |
| `hit`, `crit` | acerto e chance de crítico **do ataque básico** |
| `ct` | tempo da ação em % (adaga 75, marreta 135) |
| `hits` | golpes por ataque (submetralhadora 3, shuriken 3); o bônus de atributo se divide e a armadura conta em cada golpe |
| `dupla` | **arma em par**: um 2º golpe a 50% no mesmo alvo ("Ataque (2ª mão)"). Só com golpe único e sem área; o criador tira o traço se não couber. Sabres Gêmeos, Tonfas, Sai e Pistolas Gêmeas |
| `area` | o básico acerta todos os inimigos (escopeta, montante) |
| `pierce` | % da armadura ignorada |
| `mental` | o básico fere a Sanidade e ignora armadura (sino) |
| `st`, `stc`, `stn` | condição, chance (%) e turnos |
| `fx` | efeitos extras na notação dos nós: `exec 25 1.3`, `vs bleed 1.5`, `push 30`, `drain hp 20`, `lose san 2 self`… |
| `mod` | bônus enquanto empunhada: modificadores (`atk def agi hit crit atkP heal`) e atributos (`FOR 3`) |
| `rq` | requisito (`FOR 50`); abaixo dele, **−20% de acerto** no básico e nas técnicas da arma |
| `atkN` | nome do ataque básico (aparece no registro) |
| `sk` | técnicas da arma (até 4) |
| `tpl`, `cat`, `lvl`, `d` | modelo de origem, categoria, nível e descrição |

## Técnicas da arma
- O id é `w:<item>:<n>`; o motor resolve pelo item, então valem para heróis e para inimigos que tenham a arma equipada (a IA as usa).
- Somam a **têmpera** e a arma viva no poder (como o ataque básico) e, se forem do elemento Físico, **herdam o elemento** da arma.
- Contam como técnica de arma: Voto da Arma Única, passivas com escopo `req`, runas e liga da Forja, munição.
- `uses`: golpe com **N usos por batalha** (o golpe supremo das lendárias tem 1). Recarrega a cada batalha.
- Podem ser de dano, dano mental, cura, suporte ou **transformação** (Mira Assentada do rifle).

## Categorias e níveis
| Categoria | Efeito no modelo | Faixa de orçamento |
|---|---|---|
| Básica | 1 técnica | 90–115% |
| Especial | 2 técnicas | 95–125% |
| Elemental | elemento no básico e nas técnicas físicas, 15% de chance da condição do elemento; forjada com essências | 90–120% |
| Lendária | +3 de poder, +5% de crítico, 2 técnicas + golpe supremo (1 uso/batalha) | 115–150% |
| Maldita | +5 de poder, +5% de crítico, cada ataque custa 2 de Sanidade e cada técnica 4% do HP | 120–160% |

Níveis: Comum (+0), Refinada (+4), Obra-prima (+9), Mítica (+14). O ganho de poder é ajustado pelo tempo, pelos golpes e pela área, para o dano por tempo subir por igual em todos os modelos; as técnicas ganham 60% dele.
Lendárias e malditas não saem da forja elemental: o mestre as entrega.

## Orçamento (régua do mestre)
`ARMAS.rel(arma)` estima o dano por tempo do ataque básico (atacante com 55, alvo com AGI 70 e armadura 2, condições e efeitos convertidos em pontos) e compara com um **sabre simples do mesmo nível** (= 100%). A Forja de armas mostra a barra e a faixa da categoria. Não conta as técnicas nem o elemento.
`node tools/sim.js 300 armas` mede o mesmo no motor real: as diferenças vêm de sangramento, atordoamento e atraso, que a régua estima e a medição de um golpe não vê.

## Forja de armas (janela do mestre)
1. **Modelo**: 85 modelos em 11 tipos. Escolha nível, categoria e elemento; o rascunho é montado na hora.
2. **Arma**: nome, tipo, categoria, poder, preço, elemento.
3. **Ataque básico**: todos os campos acima, com aviso imediato de efeito ou bônus inválido.
4. **Técnicas**: até 4, novas ou **copiadas da árvore** pela busca; poder, custo, tempo, golpes, usos, % de HP, área, em si, efeitos, forma.
- A prévia mostra a arma como o jogador vai ver, as técnicas descritas e o orçamento.
- **Criar arma** põe no catálogo (entra na janela Itens e loja, pode ser entregue e posta à venda); clicar numa arma da lista abre para editar, e **Salvar alterações** regrava a mesma peça (quem a tem no inventário recebe a versão nova).

## Fichas salvas
Ao iniciar uma campanha antiga (`S.itemsV` < 2), as armas do catálogo antigo ganham os campos novos **pelo nome** (inventários e equipamentos continuam valendo) e as armas novas entram no catálogo. Armas criadas pelo mestre no editor genérico ficam como estavam (sem modelo: punhos neutros no perfil, só poder, tipo e elemento).

## Básicas pré-implementadas e lojas
Todo modelo tem uma arma **básica Comum** no catálogo, com o nome do modelo (Kusarigama, Violino, Broquel…): o catálogo tem 108 armas. Modelos que já tinham básica (Sabre, Revólver, Rifle de Ferrolho…) não duplicam; a Âncora de Corrente, que só tinha a especial, ganhou `Âncora de Corrente comum`.
`content.js` → `WEAPONS_ALL` junta `WEAPONS` com as básicas geradas dos modelos, então um modelo novo em `armas.js` ganha a básica sozinho.
**Lojas por cena** (`WSHOP`): cada modelo é vendido em 1 ou 2 cenas, e a Mansão Ashworth (que não vendia nada) agora vende armas de duelo e instrumentos.
- Beco: armas de rua, de arremesso e de distância curta, broquel.
- Santuário: focos, instrumentos de sopro, escudos de talismã, bastões e arco longo.
- Estação: armas de fogo, arcos e bestas, pesadas, correntes pesadas, escudos grandes.
- Mansão: lâminas de duelo, hastes, instrumentos de salão, escudos elegantes, armas em par.
As lojas valem para campanhas novas ou pelo botão "+ cenas de exemplo"; campanhas salvas recebem as armas no catálogo (migração `S.itemsV = 4`), mas não têm as lojas mudadas.

## Pacotes de traços
Na Forja, cada pacote mexe nos campos de uma arma e acrescenta ao nome (`Sabre de Sangria, Veneno e Mestre`). **Até 3 por arma, uma qualidade e um elemento no máximo.** O poder dos pacotes é por golpe (arma em par e multi-golpe dividem). Desfaz com "Refazer do modelo".
| Grupo | Pacotes |
|---|---|
| Ofensivos | Sangrante, Venenosa, Flamejante (condição, sem elemento), Atordoante, Perfurante, Cruel |
| Precisão e velocidade | Precisa, Veloz, Leve, De Duelo |
| Defensivos | Pesada, Reforçada, De Aparar, De Guarda |
| Místicos | Abençoada, Amaldiçoada, Ressonante, Cobiçada |
| Qualidade | Mal feita, Gasta, De oficina, De artesão, Mestra (mudam poder, crítico e preço) |
| Elemento | um por Vínculo: o elemento, 20% da condição dele e um bônus temático; a arma vira Elemental (forjável com essências) |
Se a condição do pacote já existe na arma, a chance soma; se for outra, entra como efeito extra.

## Biblioteca na Forja (lista lateral)
- **⧉ Duplicar**: abre uma cópia (`… (cópia)`) já no editor, como arma nova.
- **Variantes elementais** (arma salva aberta): um elemento ou as 9 de uma vez; nomes já existentes são pulados.
- **⬇ Exportar** uma arma ou a lista inteira (respeita a busca): `.json` com `{ "formato": "virtualJRPG-armas", "v": 1, "armas": [...] }`.
- **⬆ Importar**: arquivo ou texto colado (aceita o formato acima, uma lista ou uma só arma), com **prévia** (tipo, categoria, orçamento, correções) antes de confirmar. Tudo passa pela mesma limpeza do criador; nome repetido ganha ` (2)`. Vai em lotes de 10 (o limite de uma mensagem é 64 KB; o servidor aceita até 25 por lote).
Os nomes das armas podem ter até 60 caracteres (os sufixos dos pacotes crescem rápido).

## Trilhas da árvore dos tipos novos
No tronco Marcial (`arvore/marcial.js` → `ARMAS_NOVAS`), 10 nós cada para **pesada, foco, corrente, arremesso, arco, escudo e instrumento**, todos com `req` do tipo e XP 10→45:
golpes, uma **reação** (contra-ataque, esquiva ou escudo), uma **postura** (transformação), uma **passiva de maestria** e o **golpe final** com requisito 55 (FOR na pesada, INT no foco, DES nos outros).
A maestria usa o escopo novo `sc: 'wt:<tipo>'`: vale no ataque básico e nas técnicas só com aquele tipo empunhado (ocupa slot de passiva).
Golpes finais: Queda do Titã, Canal Aberto, Dragão de Ferro, Nuvem de Lâminas, Flecha do Céu Partido, Muralha Inabalável (FOR 55) e Grande Final (CAR 55).

## Fichas salvas (expansão)
`S.itemsV = 3`: as Pistolas Gêmeas do catálogo viram arma em par e as flechas entram no catálogo. Skills aprendidas continuam pelo nome (a grade é refeita).

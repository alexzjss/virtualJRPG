# Armas

O personagem empunha **uma arma** (slot `arma`). Ela define duas coisas em batalha:

1. **O ataque básico** (sem custo): atributo usado, tempo da ação, número de golpes, área, condição com chance, perfuração, efeitos extras e bônus enquanto empunhada.
2. **As técnicas da arma**: skills que existem só com ela equipada (aba **Arma** no menu de batalha), sem gastar XP. Trocar de arma troca o repertório.

Sem arma, o personagem luta com os **punhos**: FOR, poder base da ficha (`arma`, padrão 8), sem traços. É exatamente o ataque antigo, então inimigos e fichas sem arma não mudam.

As técnicas de lâmina, lança, tiro e punho da árvore (`req`) continuam pedindo o tipo certo de arma.

## Arquivos
- `public/armas.js` (compartilhado, `globalThis.ARMAS`): tipos, categorias, níveis, **modelos**, perfil do ataque (`prof`), efeitos do básico (`basicFx`), régua de orçamento (`score`/`rel`), montador (`make`), técnicas (`skill`) e limpeza do rascunho do criador (`clean`).
- `content.js` → `WEAPONS`: o catálogo padrão (47 armas), todas montadas a partir dos modelos.
- `server.js`: `basicOf` (ataque básico pela arma), `SK`/`wSk` (técnicas da arma), `modsOf` (traços, bônus e requisito), `wpnSave` (criador do mestre), migração `S.itemsV = 2`.
- `public/app.js`: cartões e ficha com os traços e técnicas, aba **Arma** na batalha, botões ⚔ do mestre e a janela **Forja de armas**.
- `rules.js` ganhou `parseFx`/`parseForm` (antes só em `content.js`) e o caminho inverso `fxSrc`/`formSrc`, para o navegador validar efeitos e copiar técnicas da árvore.

## Tipos
| Tipo | Atributo padrão | Jeito |
|---|---|---|
| Lâmina | FOR | equilibradas; liberam as técnicas de lâmina |
| Haste | FOR | alcance e perfuração; técnicas de lança |
| Arma de fogo | DES | usam a munição equipada; técnicas de tiro |
| Punhos | FOR | rápidas; técnicas de luta |
| Arma pesada (nova) | FOR | lentas, derrubam e racham armadura, pedem FOR mínima |
| Foco místico (novo) | INT | grimórios, cajados, sinos e leques; podem usar SAB ou CAR, ou ferir a Sanidade |

## Campos de uma arma
Todos opcionais; o padrão vem do tipo.

| Campo | O que faz |
|---|---|
| `wa`, `wa2` | atributo do ataque; com dois, usa a **média** (katana: FOR/DES) |
| `hit`, `crit` | acerto e chance de crítico **do ataque básico** |
| `ct` | tempo da ação em % (adaga 75, marreta 135) |
| `hits` | golpes por ataque (pistolas 2, submetralhadora 3); o bônus de atributo se divide e a armadura conta em cada golpe |
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
1. **Modelo**: 27 modelos em 6 tipos. Escolha nível, categoria e elemento; o rascunho é montado na hora.
2. **Arma**: nome, tipo, categoria, poder, preço, elemento.
3. **Ataque básico**: todos os campos acima, com aviso imediato de efeito ou bônus inválido.
4. **Técnicas**: até 4, novas ou **copiadas da árvore** pela busca; poder, custo, tempo, golpes, usos, % de HP, área, em si, efeitos, forma.
- A prévia mostra a arma como o jogador vai ver, as técnicas descritas e o orçamento.
- **Criar arma** põe no catálogo (entra na janela Itens e loja, pode ser entregue e posta à venda); clicar numa arma da lista abre para editar, e **Salvar alterações** regrava a mesma peça (quem a tem no inventário recebe a versão nova).

## Fichas salvas
Ao iniciar uma campanha antiga (`S.itemsV` < 2), as armas do catálogo antigo ganham os campos novos **pelo nome** (inventários e equipamentos continuam valendo) e as armas novas entram no catálogo. Armas criadas pelo mestre no editor genérico ficam como estavam (sem modelo: punhos neutros no perfil, só poder, tipo e elemento).

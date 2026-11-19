# Vagas da árvore (camadas)

Gerado por `node tools/vagas.js --md`. A posição no ramo é a camada (1 = começo, 10 = ponta); a camada define o poder (arvore/camadas.js).
Toda técnica nova precisa respeitar o tema do Vínculo dono (arvore/temas.js): o build falha se não respeitar.

## Curva por camada

| Camada | Dano-base (alvo único, sem efeito) | XP | Requisito de atributo |
|---|---|---|---|
| 1 | 9 | 10 | — |
| 2 | 11 | 15 | — |
| 3 | 13 | 20 | — |
| 4 | 16 | 25 | 50 |
| 5 | 20 | 30 | 51 |
| 6 | 24 | 40 | 52 |
| 7 | 30 | 50 | 54 |
| 8 | 36 | 65 | 56 |
| 9 | 44 | 85 | 58 |
| 10 | 54 | 110 | 60 |

Área custa 40% do dano, cada efeito custa uma fatia do orçamento (controle ~22%, dano contínuo ~12%, debuff ~8%) e recarga lenta devolve orçamento. Limites: 1,8× o dano da camada, nas camadas 4, 7 e 10. Camadas 1–2: um efeito só. Conceitos fortes (clones, invocações, reviver, execução, possessão, domínios plenos, Despertares): camada 7+. Kit atual dos personagens: camadas 1–5.

## Casas livres (ramos com menos de 10 nós)

### Marcial — 8 casas

- ramo 38 (ofensiva, 2 nós): camadas 3, 4, 5, 6, 7, 8, 9, 10

### Susanoo — 2 casas

- ramo 4 (controle, 9 nós): camadas 10
- ramo 16 (controle, 9 nós): camadas 10

### Atlas — 2 casas

- ramo 4 (controle, 9 nós): camadas 10
- ramo 16 (controle, 9 nós): camadas 10

### Fuhaku — 4 casas

- ramo 1 (controle, 9 nós): camadas 10
- ramo 9 (ofensiva, 9 nós): camadas 10
- ramo 17 (especial, 9 nós): camadas 10
- ramo 20 (controle, 9 nós): camadas 10

### Amaterasu — 2 casas

- ramo 1 (defesa, 9 nós): camadas 10
- ramo 12 (defesa, 9 nós): camadas 10

### Tsukuyomi — 8 casas

- ramo 20 (especial, 2 nós): camadas 3, 4, 5, 6, 7, 8, 9, 10

### Shukketsu — 4 casas

- ramo 3 (controle, 9 nós): camadas 10
- ramo 6 (defesa, 9 nós): camadas 10
- ramo 13 (controle, 9 nós): camadas 10
- ramo 15 (ofensiva, 9 nós): camadas 10

### Hiruko — 2 casas

- ramo 12 (controle, 9 nós): camadas 10
- ramo 16 (controle, 9 nós): camadas 10

### Aura — 1 casas

- ramo 27 (ofensiva, 9 nós): camadas 10

### Ocultismo — 8 casas

- ramo 12 (controle, 9 nós): camadas 10
- ramo 13 (especial, 9 nós): camadas 10
- ramo 15 (controle, 9 nós): camadas 10
- ramo 18 (especial, 9 nós): camadas 10
- ramo 20 (controle, 9 nós): camadas 10
- ramo 22 (controle, 8 nós): camadas 9, 10
- ramo 23 (especial, 9 nós): camadas 10

### Armas — 99 casas

- ramo prim-corte (arma: corte, 7 nós): camadas 8, 9, 10
- ramo prim-esmag (arma: esmag, 6 nós): camadas 7, 8, 9, 10
- ramo prim-perf (arma: perf, 6 nós): camadas 7, 8, 9, 10
- ramo prim-dist (arma: dist, 7 nós): camadas 8, 9, 10
- ramo lamina-1 (arma: lamina, 5 nós): camadas 6, 7, 8, 9, 10
- ramo lamina-2 (arma: lamina, 6 nós): camadas 7, 8, 9, 10
- ramo lanca-1 (arma: lanca, 6 nós): camadas 7, 8, 9, 10
- ramo lanca-2 (arma: lanca, 6 nós): camadas 7, 8, 9, 10
- ramo fogo-1 (arma: fogo, 6 nós): camadas 7, 8, 9, 10
- ramo fogo-2 (arma: fogo, 6 nós): camadas 7, 8, 9, 10
- ramo punho-1 (arma: punho, 8 nós): camadas 9, 10
- ramo punho-2 (arma: punho, 8 nós): camadas 9, 10
- ramo pesada-1 (arma: pesada, 6 nós): camadas 7, 8, 9, 10
- ramo pesada-2 (arma: pesada, 6 nós): camadas 7, 8, 9, 10
- ramo foco-1 (arma: foco, 6 nós): camadas 7, 8, 9, 10
- ramo foco-2 (arma: foco, 6 nós): camadas 7, 8, 9, 10
- ramo corrente-1 (arma: corrente, 6 nós): camadas 7, 8, 9, 10
- ramo corrente-2 (arma: corrente, 6 nós): camadas 7, 8, 9, 10
- ramo arremesso-1 (arma: arremesso, 6 nós): camadas 7, 8, 9, 10
- ramo arremesso-2 (arma: arremesso, 6 nós): camadas 7, 8, 9, 10
- ramo arco-1 (arma: arco, 6 nós): camadas 7, 8, 9, 10
- ramo arco-2 (arma: arco, 6 nós): camadas 7, 8, 9, 10
- ramo escudo-1 (arma: escudo, 6 nós): camadas 7, 8, 9, 10
- ramo escudo-2 (arma: escudo, 6 nós): camadas 7, 8, 9, 10
- ramo instrumento-1 (arma: instrumento, 6 nós): camadas 7, 8, 9, 10
- ramo instrumento-2 (arma: instrumento, 6 nós): camadas 7, 8, 9, 10

## Células magras (setor × coluna × camada)

Cada célula conta os nós daquele tema naquela camada; "—" é zero. Em negrito, células abaixo da metade da média do setor.

### Marcial

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 14 | 19 | 9 | 7 | 10 | 6 | 10 | 6 | **4** | 12 |
| controle | 14 | 20 | 20 | 18 | 16 | 15 | 7 | 15 | 12 | 7 |
| defesa | 6 | 8 | 8 | 9 | 8 | 10 | 5 | 9 | 7 | 9 |
| maestria | 18 | 8 | 6 | 5 | **4** | **4** | 8 | 6 | 9 | 5 |
| especial | **3** | 5 | **3** | **2** | **3** | **3** | 6 | **3** | 5 | **3** |

### Kagutsuchi

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 4 | 3 | 6 | 4 | 4 | 4 | 4 | **2** | 4 | **1** |
| controle | 8 | 15 | 10 | 15 | 11 | 11 | 11 | 9 | 6 | 9 |
| defesa | 3 | **2** | **2** | **1** | 4 | 3 | 4 | 6 | **2** | 4 |
| maestria | 3 | 4 | 3 | **2** | **1** | 4 | 3 | **1** | **2** | **1** |
| especial | **2** | **2** | **1** | **1** | **1** | **1** | **2** | 3 | 6 | 5 |

### Susanoo

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 4 | 6 | 4 | 3 | 4 | **—** | 3 | **2** | 5 | **2** |
| controle | 7 | 14 | 12 | 10 | 9 | 7 | 8 | 8 | 5 | 5 |
| defesa | 4 | 4 | 5 | 5 | 4 | 8 | 3 | 4 | 4 | 3 |
| maestria | 4 | 3 | 3 | **2** | **1** | 4 | **2** | **1** | **2** | **2** |
| especial | **1** | **2** | **2** | **1** | **2** | **1** | 4 | 5 | 4 | 6 |

### Atlas

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 4 | 7 | 8 | 5 | 6 | 5 | **1** | **1** | 3 | **1** |
| controle | 5 | 10 | 8 | 9 | 7 | 5 | 8 | 8 | 6 | 6 |
| defesa | 6 | 3 | 5 | 6 | 6 | 6 | 5 | 5 | 4 | 4 |
| maestria | 3 | 4 | 3 | **2** | **—** | 3 | 4 | 3 | 3 | **1** |
| especial | **2** | **2** | **1** | **2** | **2** | **1** | **2** | 3 | 4 | 6 |

### Indra

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 6 | 9 | 12 | 6 | 6 | 7 | 7 | 6 | 5 | 4 |
| controle | 6 | 7 | 9 | 10 | 7 | 4 | 7 | 6 | 7 | 9 |
| defesa | 4 | 3 | 3 | 5 | 4 | 3 | **2** | 5 | 3 | **2** |
| maestria | 4 | 4 | **2** | 3 | 3 | 6 | 3 | **1** | 3 | **1** |
| especial | **2** | **1** | **1** | **2** | 3 | **2** | 3 | 4 | 4 | 6 |

### Fuhaku

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 7 | 8 | 7 | 6 | **2** | 9 | 4 | **2** | 5 | **2** |
| controle | 8 | 11 | 13 | 14 | 18 | 6 | 10 | 12 | 8 | 8 |
| defesa | 3 | 5 | 4 | 3 | 3 | 6 | 3 | 3 | 4 | **2** |
| maestria | **2** | 3 | 3 | **2** | **1** | 3 | 4 | **2** | **2** | **2** |
| especial | **2** | **2** | **2** | **1** | 3 | **2** | 4 | 3 | 3 | 4 |

### Amaterasu

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 3 | **2** | 7 | 4 | 7 | 3 | **2** | **2** | 4 | **1** |
| controle | 5 | 4 | 3 | 8 | 4 | 3 | 7 | 4 | **2** | 4 |
| defesa | 7 | 14 | 9 | 8 | 5 | 9 | 5 | 9 | 7 | 8 |
| maestria | 4 | **2** | 4 | 3 | 3 | 3 | 3 | **2** | 3 | **1** |
| especial | **1** | **1** | **1** | **1** | **2** | **2** | 3 | 3 | 4 | 4 |

### Tsukuyomi

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 4 | 6 | 8 | 5 | 5 | 4 | **2** | 4 | 4 | 5 |
| controle | 7 | 12 | 9 | 12 | 9 | 9 | 9 | 11 | 8 | 6 |
| defesa | 5 | **1** | 4 | 4 | **2** | **2** | 5 | **2** | **2** | 3 |
| maestria | **2** | 3 | **2** | **2** | **2** | **2** | 3 | **2** | 3 | **2** |
| especial | 3 | 3 | **1** | **1** | 3 | 3 | **2** | **1** | 3 | 4 |

### Shukketsu

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 6 | 3 | 5 | 6 | 3 | 4 | 5 | **1** | 4 | 4 |
| controle | 5 | 10 | 11 | 10 | 9 | 6 | 8 | 9 | 3 | 4 |
| defesa | 4 | 3 | 5 | 3 | 3 | 4 | 3 | 4 | 6 | **2** |
| maestria | 3 | 4 | **2** | **2** | 3 | 4 | **2** | **2** | 3 | **2** |
| especial | **2** | 3 | **1** | 3 | 3 | **2** | **2** | 4 | 4 | 4 |

### Hiruko

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | **2** | 6 | 6 | 3 | 3 | 3 | **1** | **1** | 3 | **1** |
| controle | 10 | 11 | 14 | 9 | 11 | 9 | 11 | 10 | 6 | 6 |
| defesa | 4 | 5 | 4 | 5 | 5 | 5 | 5 | 6 | 4 | 3 |
| maestria | 3 | 6 | 4 | 3 | **1** | 4 | 4 | **1** | 3 | **1** |
| especial | **2** | **2** | **1** | **2** | **2** | 3 | **1** | 3 | 5 | 8 |

### Aura

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 6 | 18 | 7 | 9 | 5 | 9 | 8 | 6 | 6 | 8 |
| controle | 10 | 13 | 16 | 14 | 11 | 11 | 12 | 8 | 8 | 6 |
| defesa | **3** | 4 | 7 | 6 | 5 | **3** | **2** | 7 | 6 | 6 |
| maestria | 8 | 5 | **2** | 6 | 5 | 6 | **3** | **2** | 5 | 5 |
| especial | **1** | **3** | **2** | **—** | 4 | **2** | 5 | 5 | **3** | **2** |

### Ocultismo

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | **2** | **1** | **1** | **2** | **2** | 3 | 3 | **1** | **2** | **1** |
| controle | **2** | 3 | 3 | 3 | 3 | **2** | **2** | **2** | **1** | **2** |
| defesa | **1** | **—** | 4 | 3 | **2** | **2** | 3 | 4 | **1** | **—** |
| maestria | 8 | 5 | 4 | 3 | 5 | 4 | **2** | 5 | **2** | 3 |
| especial | 12 | 19 | 17 | 15 | 16 | 15 | 15 | 13 | 18 | 12 |


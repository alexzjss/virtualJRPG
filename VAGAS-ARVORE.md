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
| ofensiva | 14 | 19 | 9 | 7 | 10 | 6 | 11 | 6 | **4** | 13 |
| controle | 14 | 20 | 21 | 19 | 17 | 16 | 7 | 16 | 13 | 8 |
| defesa | 6 | 8 | 8 | 9 | 9 | 11 | 5 | 9 | 7 | 9 |
| maestria | 19 | 9 | 7 | 6 | **4** | **4** | 9 | 7 | 10 | 6 |
| especial | **4** | 6 | **4** | **3** | **4** | **4** | 7 | **4** | 6 | **3** |

### Kagutsuchi

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 4 | 3 | 6 | 4 | 4 | 4 | 4 | **2** | 4 | **1** |
| controle | 9 | 16 | 11 | 16 | 13 | 12 | 13 | 10 | 7 | 9 |
| defesa | 4 | 3 | 3 | **2** | 5 | 4 | 5 | 7 | 4 | 5 |
| maestria | 4 | 5 | 4 | 3 | **1** | 5 | 3 | **2** | 3 | **1** |
| especial | **2** | **2** | **1** | **1** | **1** | **1** | **2** | 3 | 5 | 7 |

### Susanoo

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 5 | 7 | 5 | 3 | 4 | **1** | 4 | **2** | 5 | 3 |
| controle | 8 | 15 | 13 | 12 | 11 | 9 | 8 | 11 | 6 | 8 |
| defesa | 4 | 4 | 5 | 6 | 4 | 8 | **2** | 5 | 4 | 4 |
| maestria | 5 | 4 | 4 | **2** | **2** | 4 | 3 | **2** | 4 | **1** |
| especial | **1** | **2** | **2** | **1** | **2** | **1** | 6 | 3 | 4 | 7 |

### Atlas

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 4 | 7 | 8 | 5 | 6 | 5 | **1** | **1** | 3 | **1** |
| controle | 6 | 11 | 9 | 10 | 8 | 6 | 8 | 9 | 8 | 8 |
| defesa | 6 | 3 | 6 | 6 | 7 | 6 | 5 | 6 | 4 | 5 |
| maestria | 4 | 5 | 3 | 3 | **—** | 4 | 5 | 3 | 4 | **1** |
| especial | 3 | 3 | **2** | 3 | 3 | **2** | 4 | 4 | 4 | 8 |

### Indra

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 6 | 9 | 12 | 6 | 6 | 7 | 7 | 6 | 6 | 3 |
| controle | 7 | 8 | 10 | 11 | 9 | 6 | 7 | 7 | 8 | 10 |
| defesa | 5 | 4 | 4 | 6 | 5 | 3 | 4 | 6 | 5 | 3 |
| maestria | 5 | 5 | 3 | 4 | 3 | 7 | 4 | **2** | **2** | **2** |
| especial | **2** | **1** | **1** | **2** | 3 | **2** | 3 | 4 | 4 | 7 |

### Fuhaku

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 7 | 8 | 7 | 6 | **2** | 9 | 4 | 3 | 6 | **2** |
| controle | 9 | 12 | 14 | 15 | 20 | 7 | 12 | 11 | 8 | 12 |
| defesa | 4 | 6 | 5 | 5 | 4 | 7 | 4 | 4 | 5 | 3 |
| maestria | 3 | 4 | 4 | **2** | **1** | 4 | 5 | 3 | 3 | **2** |
| especial | **2** | **2** | **2** | **1** | 3 | **2** | 3 | 4 | 3 | 6 |

### Amaterasu

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 4 | 3 | 7 | 5 | 7 | 4 | 3 | **2** | 5 | **1** |
| controle | 6 | 5 | 4 | 8 | 5 | 3 | 8 | 5 | 3 | 6 |
| defesa | 7 | 14 | 10 | 9 | 6 | 10 | 6 | 9 | 9 | 9 |
| maestria | 4 | **2** | 4 | 3 | 3 | 3 | 3 | **2** | **2** | **2** |
| especial | **2** | **2** | **2** | **2** | 3 | 3 | 3 | 5 | 4 | 5 |

### Tsukuyomi

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 4 | 6 | 8 | 5 | 5 | 4 | **2** | 3 | 5 | 5 |
| controle | 9 | 13 | 10 | 13 | 11 | 11 | 9 | 12 | 11 | 7 |
| defesa | 5 | **2** | 5 | 6 | 3 | **2** | 6 | 4 | **2** | 4 |
| maestria | 3 | 4 | 3 | **2** | **2** | 3 | 4 | 3 | 4 | **2** |
| especial | 3 | 3 | **2** | **2** | 4 | 4 | 4 | **2** | **2** | 6 |

### Shukketsu

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 6 | 3 | 5 | 6 | 3 | 5 | 4 | **1** | 4 | 5 |
| controle | 6 | 11 | 12 | 11 | 10 | 6 | 8 | 11 | 5 | 6 |
| defesa | 4 | 3 | 5 | 4 | 4 | 4 | 4 | 3 | 7 | 4 |
| maestria | 4 | 5 | 3 | **2** | 3 | 5 | 3 | 3 | 4 | **2** |
| especial | 3 | 4 | **2** | 4 | 4 | 3 | 4 | 5 | 3 | 6 |

### Hiruko

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | **2** | 6 | 7 | 3 | 3 | 3 | **1** | **1** | 3 | **1** |
| controle | 12 | 13 | 15 | 11 | 13 | 12 | 10 | 12 | 10 | 9 |
| defesa | 4 | 5 | 4 | 6 | 6 | 4 | 8 | 5 | 5 | **2** |
| maestria | 4 | 7 | 5 | 3 | **1** | 5 | 5 | **1** | 3 | **2** |
| especial | **2** | **2** | **1** | **2** | **2** | 3 | **1** | 5 | 3 | 10 |

### Aura

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 6 | 18 | 7 | 9 | 5 | 9 | 8 | 6 | 6 | 9 |
| controle | 10 | 13 | 16 | 14 | 11 | 11 | 12 | 8 | 9 | 6 |
| defesa | 4 | 5 | 8 | 7 | 6 | 4 | **3** | 8 | 7 | 7 |
| maestria | 8 | 5 | **2** | 6 | 5 | 6 | **3** | **2** | 5 | 5 |
| especial | **2** | 4 | **3** | **1** | 5 | **3** | 6 | 6 | **3** | **3** |

### Ocultismo

| coluna | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ofensiva | 3 | **2** | **1** | 3 | 3 | 3 | 3 | **1** | **2** | 3 |
| controle | 3 | 4 | 5 | 4 | 4 | 4 | 4 | 5 | 3 | 7 |
| defesa | **2** | **1** | 5 | 4 | 3 | 3 | 4 | 5 | 3 | **1** |
| maestria | 8 | 5 | 4 | 3 | 5 | 4 | **2** | 5 | **2** | 3 |
| especial | 12 | 19 | 17 | 15 | 16 | 15 | 15 | 12 | 18 | 14 |


# Perícias (Ofícios): especificação e estado

Ramo de perícias de exploração e passivas, liberado pelo mestre. Decisões tomadas pelo usuário em questionário; implementar
seguindo `ARVORE-SISTEMAS.md` (notação dos nós) e o motor atual (`server.js`, `public/rules.js`, `content.js`).

## Decisões de estrutura
- **Lugar:** aba própria **Ofícios** na ficha, com uma mini-árvore por perícia. Fica fora da grade 91×91 de combate.
- **Moeda:** **Pontos de Ofício (PO)**, separados do XP. São ganhos em rolagens bem-sucedidas daquela perícia ou dados pelo mestre na ficha.
- **Liberação:** **Iniciação** na ficha, pelo mesmo mecanismo dos Despertares (`aw`, ex.: "Iniciação: Forja"). Ela destrava a raiz;
  o resto segue as regras normais (`pre`, `nb`, `ex`, vizinhança).
- **Tamanho:** ~15 nós por perícia, em 3 graus (Aprendiz → Oficial → Mestre, 5 nós cada, marcados por `nb`). Uma **especialização
  excludente** (`ex`) no grau Oficial.
- **Rolagem de perícia:** d100 contra o atributo, como `roll` hoje, + **10 / 20 / 30** pelo grau (Aprendiz/Oficial/Mestre).
  Crítico e desastre seguem a regra atual. Sucesso marca a perícia (gera PO).
- **Desastre ao criar item:** perde **metade dos materiais**; o ouro volta.
- **Acampamento:** as 5 ações atuais ficam; nós de perícia **adicionam ações novas** (Afiar, Tratar ferida, Preparar armadilha, Cantar…).
- **Coleta de materiais:** **tabela de coleta por cena** (o mestre edita na janela Cena). Rolar a perícia na cena colhe 1-3 itens dela.
- **Testes:** cada mecânica nova ganha teste em `tools/test.js`.

## Perícias (todas entram)
| Perícia | Atributos | Conteúdo principal |
|---|---|---|
| Forja | FOR / DES / INT | ver abaixo |
| Alquimia | INT / SAB | poções, venenos de lâmina, bombas melhores, destilar Componente Ritualístico |
| Culinária | SAB / CAR | receitas de acampamento (bônus do grupo **só na próxima batalha**, estilo FF15); ingredientes de demônio |
| Medicina | INT / DES | **zerar o dano de uma parte do corpo fora de combate**, estabilizar quem está morrendo, diagnóstico |
| Caça | DES / SAB | rastrear, emboscada (grupo começa à frente na fila), armadilhas no início da luta, esfolar (+materiais) |
| Investigação | INT | **Identificar Demônio**: fraquezas e resistências aparecem no cartão para o grupo e ficam no bestiário; decifrar selos |
| Lábia | CAR | desconto/venda melhor na loja, informantes, intimidar, interrogar |
| Pilotagem | DES / AGI | manobras na perseguição (sistema `chase`), veículo próprio, conserto |
| Engenharia | INT / DES | **munição especial como consumível equipado** (prata, incendiária, sal: elemento/efeito por N tiros); autômato companheiro |
| Ladinagem | DES / AGI | fechaduras, desarmar armadilhas, punga, disfarce |
| Sobrevivência | SAB / CON | descanso curto rende mais, coleta extra, clima |
| Talismãs | SAB / INT | selos de uso único com Aura (combina com Conjuração) |
| Adestramento | CAR / SAB | animal companheiro |
| Música | CAR | canção de acampamento que recupera Sanidade; apresentações por ouro |
| Jogos de Azar | SOR | **rolar de novo 1× por sessão** (o mestre reseta); apostas |

**Companheiros (Adestramento e Engenharia):** são **invocações fixas**. Entram sozinhos no começo da luta e agem com a IA das
invocações (`SUMMONS`). Se caírem, voltam no descanso longo.

## Forja (detalhe)
- **Aprendiz:** Reparar, Avaliar (vê o poder, o elemento e o preço real), Reciclar (desmonta um item em materiais), Afiar (ação de acampamento: +poder na próxima batalha).
- **Têmpera +1/+2/+3:** +2 de poder por nível (+6 no máximo). Uma falha não quebra a arma.
- **Engastes:** 1 por grau, até 3. Cada um recebe uma runa ou essência com um efeito pequeno (`st burn 1 20%`, `drain hp 10`…).
- **Economia de Essência:** a forja elemental custa 2 essências em vez de 3. **Ligas:** duas essências dão uma arma de dois elementos.
- **Especialização (`ex`):** Armeiro (armas) · Couraceiro (armaduras, resistências, partes do corpo) · Ourives (acessórios e relíquias).
- **Assinatura do Ferreiro:** item com nome livre e um bônus escolhido de um **catálogo de ~12 bônus raros**.
- **Arma Viva:** evolui com abates. A cada N abates sobe um estágio; no último aprende uma skill que vai junto com a arma.
- **Olho do Ferreiro:** vê a armadura do inimigo; o primeiro golpe ganha `pierce`.
- Desastre na Têmpera ou na criação: perde metade dos materiais.

## Mudanças no motor (resumo)
- Ficha: `ofi` (Iniciações), `po` (Pontos de Ofício), `ofiSkills`, qualidade/engastes/abates nos itens do inventário.
- `roll` com perícia: `{ attr, per }` soma o bônus do grau e gera PO no sucesso.
- Catálogo `RECIPES` (forja, alquimia, culinária, engenharia, talismãs) e tabela `gather` por cena.
- Ações de acampamento dinâmicas a partir dos nós aprendidos; refeição vira bônus da próxima batalha.
- Rerrolagem por sessão (Jogos de Azar) com reset pelo mestre.
- Identificação de demônio salva no bestiário.
- Pedidos de aprovação do mestre (`GATE`) para as ações novas (`craft`, `gather`, rolagem de perícia).

## Estado da implementação (versão original; o refino está no fim do arquivo)
Implementado por inteiro em `public/oficios.js` (catálogo: 15 perícias, 227 nós, 30 receitas, runas e assinaturas), `server.js` (ações `ofiAw`, `ofiLearn`, `ofiGive`, `ofiUse`, `craft`, `reroll`, `newSession`, `gatherSet`) e na aba Ofícios de `public/app.js`.
- **Ficha:** `ofi` (Iniciações), `po`, `pof` (nós aprendidos), `up` (peças modificadas: poder `p`, têmpera `t`, engastes `g`, segundo elemento `el2`, assinatura `sig`, arma viva `living`/`kills`), `rrUsed`.
- **Forja:** Têmpera até +3 (Armeiro +3 de poder por nível, Couraceiro +1 de armadura, Ourives +2 no atributo), até 3 engastes com runas, Liga de duas essências, Assinatura (12 bônus; crítico dá obra-prima +2), Arma Viva (10/25/50 abates: +1 de poder por estágio; no 3º ignora 40% da armadura e ganha +10 de crítico). Falha comum perde 1 material, desastre perde metade (o ouro só é cobrado no sucesso).
- **Interpretações:** "Arma Viva aprende uma skill" virou habilidade da própria arma (o 3º estágio); Reparar virou Reciclar; a Invenção do Engenheiro e os testes narrativos são rolagens que o mestre resolve ao aprovar.
- **Cenas:** `gather` lista o que a coleta acha; o mestre marca na janela Cena.
- **Testes:** 5 testes novos em `tools/test.js`.

## Refino dos Ofícios (sessão "oficios-refino")
Decisões novas, tomadas pelo agente pela opção mais simples e coerente com o que já existia:
- **Testes narrativos (`checar`):** cada rolagem grava um registro no **diário de testes** da ficha (`ch.dia`, até 40: ação, perícia, resultado, ouro e texto). O mestre escreve a narração **ao aprovar** (campo "Narração do resultado" na faixa de pedidos; Enter aprova) ou **depois**, na aba Ofícios da ficha (`ofiNota`; também apaga o registro). O jogador lê o diário na própria aba Ofícios e a narração também vai para o chat. Só o mestre escreve; a narração fica em 200 caracteres.
- **Catálogo editável:** o mestre usa a janela **Catálogo de ofícios** (botão no dock). As edições ficam em `S.ofiCfg` como **diferenças** sobre `public/oficios.js` (`OFI.apply(cfg)` mescla; servidor e navegador aplicam; desfazer também). Dá para: renomear perícia, descrição e atributos; mudar nome, descrição, custo em PO, bônus de rolagem e ouro de cada nó (ou desativá-lo: "off" impede aprender, quem já tem mantém); criar **nós novos** (bônus de rolagem ou teste narrativo com ouro, ocupam o fim da lista e nunca mudam os ids dos outros); editar **receitas** (ingredientes, produto, dificuldade, quantidade, refeições) ou criar **receitas novas** (valem a partir do grau escolhido, sem precisar de nó) e **restaurar** cada coisa ou tudo ao padrão. Receita desativada não pode ser preparada.
- **Economia das receitas** (regra e teste em `tools/test.js`): o preço do produto fica entre 1× e 2× o custo dos ingredientes; assim vender o produto (metade do preço) nunca rende mais que os ingredientes, e preparar sempre compensa. Foram ajustados Calmante, Éter, Coquetel, Ácido, Elixir, Sais, Isca (rende 2), Ofudas de Cura/Fogo/Retorno e as munições (Prata 30, Incendiária 24, Sal 36; 6 tiros cada).
- **Runas:** passam a ser **receitas da Forja** (1 essência do elemento + 2 sucata + um extra nas fortes), liberadas pelos nós Engaste I (Precisão, Força), II (Brasa, Veneno) e III (Trovão, Sangue). Preços das runas: 45/45/55/55/60/60 (~1,7× o custo).
- **Loja:** as três cenas com loja agora vendem os **ingredientes básicos** (`BASICS` em `content.js`: ervas, raiz, ervas de cozinha, carne, sal, pólvora, sucata, papel, frasco e óleo) e as munições. Em campanha antiga, o botão **Estocar ingredientes básicos** (janela Itens e loja) faz o mesmo na cena atual. Carne de Demônio, Garra e Essências continuam só por caça, colheita e forja.
- **Interface:** `itemsPage` e a ficha mostram, nas peças modificadas (`up`), a têmpera e o bônus, as runas e engastes livres, a liga, a assinatura (nome da peça, bônus) e a arma viva (estágio, abates), inclusive armaduras do Couraceiro e acessórios do Ourives. O slot de **munição** (`mun`) aparece na área de equipamentos (itens e ficha) com tiros no pente, pacotes de reserva e aviso se a arma não for de fogo.
- **Bug achado e corrigido:** os botões da aba Ofícios (Aprender, Usar, +/− do mestre) tinham `data-node` e caíam no clique de "selecionar nó da árvore", então **nunca disparavam**; agora esse clique ignora botões com `data-a`.
- Campanhas já salvas mantêm os preços e as lojas antigas: use **Restaurar padrão** em Itens para pegar os novos preços e o botão de básicos para a loja. As receitas novas de runa e os ajustes de ingredientes valem na hora, porque o catálogo vive em `oficios.js`.
- **Testes:** 4 novos em `tools/test.js` (diário e narração, catálogo editável, economia e loja, runas); total 58.

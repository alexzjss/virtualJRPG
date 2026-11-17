# Revisão da árvore de habilidades

Registro da revisão de `tree.js`, um nó por vez. Branch: `arvore-habilidades`.
Ordem: marcial, kagutsuchi, susanoo, atlas, indra, fuhaku, amaterasu, tsukuyomi, shukketsu, radiacao.

Legenda: ✅ aprovado · ✏️ alterado (antes → depois) · ⏭️ pulado · 🆕 novo, ainda não revisado

## Expansão massiva (sistemas novos, +606 nós) — 🆕 entregue de uma vez, aguardando revisão
Decisões do usuário (questionário antes de implementar): motor + árvore; corrigir nós antigos para cumprirem o nome; ~+600 nós;
novos ramos por Vínculo + dois troncos universais; todas as mecânicas ofensivas, defensivas e de sistema; votos como nós passivos
sempre ativos; rituais com círculos e versões; dupla em que o parceiro gasta o próximo turno; 1 transformação por vez com
colateral; requisitos novos (nó anterior, nós do ramo, Despertar, estado); lote de condições novas; efeitos compostos; IA e chefes
usando o sistema; 3 ramos por Vínculo (2 comuns + 1 único); tronco de Aura com hexágono (livre) e de Ocultismo sem elementos
(com Despertar); Marcial bem expandido; nomes mistos (termos japoneses para conceitos de Aura, português no resto); curva de XP
igual, com topos de 80-100; testes atualizados e ampliados. Referência das mecânicas e da notação: `ARVORE-SISTEMAS.md`.

**Contagem:** 581 → **1187 nós**. Marcial 41 → 157; cada Vínculo 60 → 90; Aura 110; Ocultismo 110.
Arquivos novos: `arvore/vinculos.js` (ramos 7-9), `arvore/aura.js`, `arvore/oculto.js`, `arvore/marcial.js`, `public/rules.js`.
Nada foi renomeado nem removido; fichas antigas mantêm as skills pelo nome.

**Nós antigos corrigidos (✏️ 73, nome e lugar mantidos):** a mecânica passou a cumprir a descrição. Exemplos: Vampirismo e
Hemofagia roubam vida; Combustão Súbita, Hemorragia Final e Detonação Controlada detonam a condição; Calor Crescente, Ruptura e
Meia-Vida escalam com a condição; Incêndio Florestal, Epidemia e Cortes em Cadeia espalham; Ressurgir, Milagre do Meio-Dia,
Ressurreição Solar, Abraço das Marés/da Montanha e Renascer das Cinzas reerguem caídos; Água Benta, Purificar, Maré de Socorro e
Metamorfose purificam; Escudo de Seixos, Muralha d'Água, Armadura de Brasas e Graça Absoluta dão escudo; Pele de Pedra e Escudo
Estático refletem; Muro Vivo provoca; Cadeia Elétrica, Bala Tesla e Tiro Ricochete ricocheteiam; Tiro Duplo, Duelo de Sabres,
Trovão Gêmeo, Eco do Trovão, Duelo de Ventos e Combo Furioso viraram multi-golpe (com poder por golpe reduzido); Golpe de
Misericórdia, Guilhotina do Vento e Execução Ritual executam; Carga Acumulada concentra um turno (poder 30 → 42, tempo 150 → 100);
Transfusão, Oferenda de Carne, Elo de Sangue, Sangue por Sangue, Pacto Carmesim e Dádiva do Sangue custam HP do usuário.

**Balanceamento (tools/sim.js, versão anterior → nova):** encontros gerados ficaram iguais dentro do ruído (±10 pontos).
Chefes, 4 heróis níveis 0/2: Ifrit 54/50 → 56/43 · Leviatã 75/71 → 72/71 · Colosso 59/65 → 77/58 · Arconte 69/78 → 71/69 ·
Rainha dos Corvos 73/60 → 61/64 · Senhor dos Pesadelos 51/44 → 41/44 · Condessa 69/83 → 83/89 · Filho de Hiruko 51/64 → 64/59.
Ajustes feitos para chegar aí: IA prefere golpes físicos fortes; Limite e cura da IA vão sempre para o próprio lado; reerguer
divide o intervalo das curas; regeneração 1/20 do HP (chefes 1/3 disso); multi-golpe divide o bônus de atributo; chefes e
gerados não levam o suporte dos ramos novos nem transformações de cura; HP do Senhor dos Pesadelos 0,85 → 0,7.
**Ponto em aberto:** Serafim Caído (HP 0,7 → 0,45, arma 6 → −2) ficou em 41% no nível 0 (era 70%) e 97% no nível 2 (era 88%):
curandeiro que se sustenta; precisa de um ajuste fino próprio (ex.: menos lacaios curandeiros na fúria).

**Testes:** `tools/test.js` agora calcula o total pela árvore, cobre Aura e Ocultismo na conectividade da grade e ganhou 14 testes
das mecânicas novas (35 no total). O teste do chefe que falhava às vezes foi consertado: um crítico no ponto fraco disparava a fúria
durante a medição de dano e o sangramento do torso entrava na conta.

## Decisão de estrutura (nova)
Cada Vínculo passa a ter **6 ramos de 10 nós** (em vez de 3): 1 Ataques diretos · 2 Ataques especiais · 3 Efeitos ·
4 Assinatura do Vínculo · 5 Armas (todos os nós com `req`) · 6 Maestria.
Mudanças de regra (autorizadas pelo usuário): `content.js` → `buildSkills` agora aceita qualquer número de ramos
(grade 41×41; ramo só de armas vira uma trilha por tipo de arma).
Invariantes por Vínculo no formato novo: raiz = 1º nó do ramo 1; 1 passiva `res`; Limite = último do ramo 2;
proibida (`res:'san'` + `back`) = último do ramo 6; 1 par `ex` vizinho no ramo 6; ramo 5 só com `req`.
Defaults assumidos (usuário não escolheu): 6 ramos, 10 nós por ramo, curva de XP 10-10-15-15-20-25-30-40-45-60.

**Estado:** os 9 Vínculos estão no formato novo (60 nós cada, 540 no total) + Marcial (41) = **581 nós**.
Os 8 Vínculos além do Kagutsuchi foram migrados em massa **sem revisão nó a nó**, a pedido do usuário. Todos os nós
novos ou movidos estão como 🆕 (não revisados). Nós antigos foram todos reaproveitados (nenhum sumiu nem foi renomeado);
o XP de todo nó segue a curva 10-10-15-15-20-25-30-40-45-60 (armas: lâmina 10/20/60, lança 10/30, fogo 10/25/60, punho 10/35).

## Migração dos outros 8 Vínculos (🆕 sem revisão)
Conteúdo por Vínculo: 30 nós antigos redistribuídos + 30 novos (10 de armas, 20 distribuídos nos demais ramos).
- Susanoo: assinatura = cura e água (SAB); ✏️ Maré de Socorro p18 → p24 (era fraca para xp 60).
- Atlas: assinatura = proteção do grupo (heals CON, defUp, 2 passivas); 2 passivas novas na Maestria.
- Indra: assinatura = velocidade (ct 50, poucos custos); Maestria ganhou Sangue Elétrico e Faro de Tempestade.
- Fuhaku: assinatura = controle de grupo (fear, confuse, sleep, stun, silence, para, agiDn).
- Amaterasu: ramo 1 virou "luz direta" (cura de um alvo + dano de luz, raiz Luz Curativa mantida); assinatura = cura e ressurreição.
- Tsukuyomi: tudo `mental`, exceto armas; assinatura = sono, medo, possessão e confusão.
- Shukketsu: nós antigos mantêm custo em Sanidade; **os 10 nós de armas e os novos de Efeitos gastam Aura**, para o Vínculo ter opções sem Sanidade.
- Radiação: assinatura = mutação e cura aberrante.
Ramo 5 (armas): trilhas separadas por tipo de arma na grade (lâmina, lança, fogo, punho).

## Kagutsuchi (piloto, 🆕 todos os 60 nós aguardam revisão nó a nó)
Reaproveitados dos 30 antigos (mudanças marcadas):
- ✏️ Chama Votiva: atkUp em área (xp 25) → defUp em área (xp 20), para não duplicar Pira Coletiva.
- ✏️ Mudaram de ramo/XP: Mar de Chamas, Labareda, Fornalha, Cometa Rubro, Sol de Kagutsuchi, Inferno Rubro (→ ramo 2);
  Combustão Súbita, Fogo Fátuo, Renascer das Cinzas (→ ramo 4); Dom de Kagutsuchi, Forja Interior, Fôlego de Brasa (→ ramo 6).
- 30 nós novos: Dardo de Brasa, Lança de Fogo, Raio de Fogo Branco, Toque Incinerador, Lança do Sol Rubro; Muralha de Fogo,
  Bola de Fogo, Chuva de Fagulhas, Rio de Lava; Sopro de Brasa, Escória Ardente, Armadura de Brasas, Névoa Abrasadora;
  Brasa Persistente, Espiral de Brasas, Chama Rastejante, Incêndio Florestal, Calor Crescente, Pira do Caçador,
  Apoteose de Brasas; os 10 do ramo de Armas.

## Marcial
Ramo 1 · nó 1 (Golpe Pesado) apresentado, ainda sem decisão. Demais nós: não revisados.

## Relatório final (nomes referenciados por outros arquivos / testes)
- Nenhuma renomeação.
- `tools/test.js` (não editado, conforme regra) falha em 2 testes por causa de contagens fixas:
  "bestiário inicial e grade são criados" (espera 311 skills, agora 581) e
  "grade: sem sobreposição…" (espera 30 nós por Vínculo, cada Vínculo tem 60). Precisa atualizar os números.
- `buildSkills` (content.js): grade 41×41; a 1ª passada põe o ramo 1 de cada Vínculo e os estilos de arma do Marcial,
  depois vêm os 8 treinos (agora reservados antes dos ramos laterais, senão não achavam casa) e por fim os ramos 2..6.
- `README.md` atualizado para a árvore expandida (1187 nós).

## Sistemas novos (+154 nós) — 🆕 aguardando revisão
Árvore 1187 → **1341 nós**: ramos 10 e 11 de cada Vínculo (clima, Quebra, fusões, nós-chave, Domínio e 4 trios), sinergias da Aura, ponte do Ocultismo e Quebra e laços no Marcial. `npm run audit` não acha erros (5 avisos conhecidos: nomes como "Muralha de Fogo" e "Gelo na Espinha" que são só metáfora).
Chefes depois da Quebra (4 heróis, nível 0/2): Ifrit 46/49 · Leviatã 81/81 · Colosso 70/66 · Arconte 71/70 · Rainha dos Corvos 71/65 · Serafim Caído 65/71 · Senhor dos Pesadelos 53/56 · Condessa 78/89 · Filho de Hiruko 60/63. Serafim Caído resolvido (lacaios da fúria sem suporte, HP 0,6, arma −4).
Id interno `radiacao` renomeado para `hiruko`, com migração do estado salvo.

Serafim Caído (revisto na frente de IA dos inimigos): 76% / 89% no nível 0 / 2 com Defender (.2) e `arma -4 / hp 0,6`. Dentro da faixa de 46-89%. Ponto em aberto encerrado.

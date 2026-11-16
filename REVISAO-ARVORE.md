# Revisão da árvore de habilidades

Registro da revisão de `tree.js`, um nó por vez. Branch: `arvore-habilidades`.
Ordem: marcial, kagutsuchi, susanoo, atlas, indra, fuhaku, amaterasu, tsukuyomi, shukketsu, radiacao.

Legenda: ✅ aprovado · ✏️ alterado (antes → depois) · ⏭️ pulado · 🆕 novo, ainda não revisado

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
- `README.md` cita "311 nós: 30 por Vínculo + 41 marciais": desatualizado.

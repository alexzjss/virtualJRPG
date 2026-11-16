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

**Estado:** só o Kagutsuchi está no formato novo (60 nós). Os outros 8 Vínculos ainda têm 3 ramos (formato antigo) e
serão migrados depois da aprovação do piloto. Marcial inalterado (41 nós). Total atual: 341 nós.

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
  "bestiário inicial e grade são criados" (espera 311 skills, agora 341) e
  "grade: sem sobreposição…" (espera 30 nós por Vínculo, Kagutsuchi tem 60). Precisa atualizar os números.
- `README.md` cita "311 nós: 30 por Vínculo + 41 marciais": desatualizado.

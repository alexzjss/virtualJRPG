// Técnicas aprendidas pelos personagens da campanha em data/state.json em 18/11/2026.
// Este catálogo é a única fonte para o passe de balanceamento e para a posição especial
// na mandala: assim uma técnica atual nunca recebe números novos e fica esquecida no gráfico.
export const ATUAIS = new Set([
  'Faísca', 'Lâmina de Vento', 'Wakaze', 'Selo de Fuhaku', 'Corrente de Vento', 'Passo do Vento',
  'Salto de Ventania', 'Canhão de Aura', 'Cólera', 'Kai', 'Passo do Cão-de-Caça', 'Força de Aura',
  'Pulso de Fuhaku', 'Mundo do Tsukuyomi', 'Empurrão', 'Atirar Vento', 'Tentáculo de Vento',
  'Canhão de Aura Gélido', 'Asa-Branca', 'Dente-de-leão', 'Ten: Envolver', 'Zetsu: Ocultar',
  'Corte Fino', 'Alvo na Mira', 'Fio Afiado', 'Aparar', 'Sopro Cortante', 'Corte de Fuhaku',
  'Lâmina de Vento Dupla', 'Marca do Vento', 'Vento Que Volta', 'Golpe Pesado', 'Chute Doentio',
  'Evolução Forçada', 'Intuição', 'Shukoudan', 'Soco da Dualidade', 'Lâmina da Irmandade', 'Clareza',
  'Esquiva Doentia', 'Suplex', 'Inconsciência', 'Força Doentia', 'Teia de Aura', 'Ren: Intensificar',
  'Carregar', 'Punho Reforçado', 'Corpo Reforçado', 'Punho Meteoro',
  // Shinkai, 18/11/2026 (depois do nivelamento): o ramo de movimento de Indra e os selos
  'Esquiva de Indra', 'Passo Trovejante', 'Absorver Carga', 'Energizar', 'Cintilação', 'Manto da Tempestade', 'Ketsujutsu', 'Selo de Indra', 'Lâmina de Indra',
  // Fichas da campanha: técnicas já aprendidas que faltavam no catálogo de âncoras.
  'Canto do Relâmpago', 'Lança de Trovão', 'Faísca Dupla',
]);

// Nivelamento de 18/11/2026: o kit atual dos personagens desce UM nível na curva da árvore, para ser o começo da progressão
// e não o topo. Curva da árvore: básico XP 10–15 (poder 8–14), intermediário 20–35 (14–25), avançado 40–60 (22–32),
// ápice 70–110 (36+), domínio 150+. Aqui: básicas ficam no piso do básico, intermediárias viram básicas, avançadas viram
// intermediárias, o único ápice vira avançado e os dois domínios viram domínios menores (sem Despertar); as versões fortes
// continuam na árvore como o próximo passo (vizinhas de arvore/posicao.js e variações de arvore/variacoes.js).
// Roda DEPOIS de arvore/nivel.js: os pisos de lá não sobem estes números. `null` apaga o campo.
const BAL = {
  // básicas: piso do básico
  'Faísca': { xp: 10, p: 9, c: 3, ct: 70, fx: 'st para 1 15%' },
  'Lâmina de Vento': { xp: 10, p: 9, c: 3, ct: 70, fx: 'push 10' },
  'Selo de Fuhaku': { xp: 10, p: 6, c: 3, fx: 'seal 10 2' },
  'Corrente de Vento': { xp: 10, p: 10, c: 4, ct: 75, fx: 'push 20' },
  'Salto de Ventania': { xp: 10, c: 2, ct: 45, fx: 'st evade 1 self; haste 20 self' },
  'Passo do Cão-de-Caça': { xp: 10, c: 2, ct: 45, fx: 'st evade 1 self; st stealth 1 self' },
  'Força de Aura': { xp: 10, p: 9, c: 3, fx: 'st atkUp 1 self; push 10' },
  'Pulso de Fuhaku': { xp: 10, p: 5, c: 2, ct: 55, fx: 'push 15' },
  'Empurrão': { xp: 10, p: 6, c: 3, ct: 65, fx: 'push 35' },
  'Ten: Envolver': { xp: 10, on: 'start', fx: 'shield 5' },
  'Zetsu: Ocultar': { xp: 10, c: 0, ct: 70, fx: 'st stealth 2 self; gain aura 3' },
  'Corte Fino': { xp: 10, p: 11, c: 4, st: 'bleed' },
  'Alvo na Mira': { xp: 10, mod: 'hit 4', sc: 'wc:dist' },
  'Fio Afiado': { xp: 10, mod: 'atk 4', sc: 'wc:corte' },
  'Aparar': { xp: 10, c: 3, p: 2 },
  'Sopro Cortante': { xp: 10, p: 12, c: 5, ct: 75 },
  'Corte de Fuhaku': { xp: 15, p: 14, c: 6, ct: 85, st: 'bleed' },
  'Lâmina de Vento Dupla': { xp: 10, p: 5, c: 4, hits: 2, ct: 80 },
  'Marca do Vento': { xp: 10, p: 5, c: 3, fx: 'brand 2' },
  'Golpe Pesado': { xp: 10, p: 9, c: 4, fx: 'st stun 1 20%' },
  'Intuição': { xp: 10, c: 3, ct: 70, fx: 'st focus 2 self; st evade 1 self' },
  'Shukoudan': { xp: 10, p: 8, c: 3, ct: 65 },
  'Suplex': { xp: 10, p: 11, c: 4, fx: 'st down 1 25%; stack doenca 5 self' },
  'Carregar': { xp: 10, c: 0, ct: 100, fx: 'gain aura 6' },
  'Punho Reforçado': { xp: 10, p: 12, c: 4 },
  'Corpo Reforçado': { xp: 10, bon: 'hpMax 8' },
  // intermediárias -> básicas
  'Atirar Vento': { xp: 15, p: 9, c: 4, ct: 65, fx: 'push 15' },
  'Tentáculo de Vento': { xp: 15, p: 4, c: 4, ct: 80, hits: 3, fx: 'st root 1 25%' },
  'Asa-Branca': { xp: 15, c: 3, ct: 60, fx: 'st evade 1 self; st agiUp 2 self' },
  'Vento Que Volta': { xp: 15, p: 8, c: 4, fx: 'echo 40' },
  'Esquiva Doentia': { xp: 15, c: 3, ct: 45, fx: 'st evade 1 self; haste 25 self; stack doenca 5 self' },
  'Teia de Aura': { xp: 15, p: 4, c: 4, fx: 'st root 1; push 10' },
  'Ren: Intensificar': { xp: 15, c: 4, fm: 'dur 3; atk 10; def 8; dr aura 3' },
  'Força Doentia': { xp: 20, p: 17, c: 5, fx: 'stack doenca 5 self', rq: null },
  'Punho Meteoro': { xp: 20, p: 18, c: 7, fx: 'st stun 1 25%' },
  'Passo do Vento': { xp: 20, c: 4, fm: 'dur 3; agi 14; def 6; dr aura 2', rq: null, nb: null },
  'Clareza': { xp: 20, c: 4, fm: 'dur 3; hit 10; crit 6', rq: null, nb: null },
  // avançadas -> intermediárias
  'Canhão de Aura': { xp: 25, p: 20, c: 7, ct: 110, rq: null },
  'Evolução Forçada': { xp: 25, p: 16, c: 7, st: 'agiUp', rq: null },
  'Chute Doentio': { xp: 25, p: 19, c: 6, st: 'poison', fx: 'stack doenca 5 self', rq: null },
  'Wakaze': { xp: 30, p: 21, c: 8, ct: 110, area: null, fx: 'push 25', rq: { DES: 50 } },
  'Cólera': { xp: 30, c: 4, fm: 'dur 3; atk 25; dr hp 8; end st exaus 2', rq: { FOR: 50 }, nb: null },
  'Kai': { xp: 30, c: 4, fm: 'dur 3; atkP 6; dr aura 5; end lose aura 99', rq: { SAB: 50 }, nb: null },
  'Inconsciência': { xp: 30, c: 5, fm: 'dur 4; atk 15; hit 8; crit 5; end st blind 2; end st exaus 2', rq: { FOR: 50 }, nb: null },
  'Lâmina da Irmandade': { xp: 30, p: 22, c: 7, rq: { DES: 50 } },
  'Soco da Dualidade': { xp: 35, p: 25, c: 8, rq: { FOR: 52 } },
  // ápice -> avançada
  'Canhão de Aura Gélido': { xp: 40, p: 17, c: 11, ct: 135, area: true, rq: { SAB: 52 }, nb: 2, fx: 'st frozen 1 25%; st wet 2' },
  // Shinkai: entram pelo mesmo nivelamento. Os números finais vêm da camada (arvore/camadas.js, kit nas camadas 1–5); aqui só
  // tiram o excesso das formas, que somavam como ápice (Manto, Ketsujutsu), para a escala da camada partir de um ponto sensato
  'Esquiva de Indra': { xp: 10 }, 'Passo Trovejante': { xp: 15 }, 'Selo de Indra': { xp: 10 }, 'Lâmina de Indra': { xp: 25 },
  'Absorver Carga': { xp: 20 }, 'Energizar': { xp: 25, fm: 'dur 3; atk 15; agi 12; hit 5' }, 'Cintilação': { xp: 25, fm: 'dur 2; agi 25; def 5' },
  'Manto da Tempestade': { xp: 30, fm: 'dur 2; agi 25; def 10; ret 12', aw: null }, 'Ketsujutsu': { xp: 30, fm: 'dur 4; atkP 6; hit 12', aw: null },
  'Canto do Relâmpago': { xp: 10, p: 8, c: 3, ct: 70 },
  'Lança de Trovão': { xp: 10, p: 9, c: 3, ct: 75 },
  'Faísca Dupla': { xp: 10, p: 8, c: 3, ct: 75 },
  // domínios -> domínios menores: duram menos, pesam menos e não pedem o Despertar (a versão plena é a vizinha deles)
  'Mundo do Tsukuyomi': { xp: 80, c: 0, ct: 150, rq: { INT: 55 }, nb: 3, aw: null, dom: 'dur 3; ally hit 6; foe hit -10; tick fear' },
  'Dente-de-leão': { xp: 80, c: 0, ct: 150, rq: { DES: 55 }, nb: 3, aw: null, dom: 'dur 3; ally agi 12; ally hit 6; foe hit -6' },
};

export function balancearAtuais(TREE) {
  const found = new Map();
  for (const t of Object.values(TREE)) for (const b of t.branches) for (const s of b) {
    if (!ATUAIS.has(s.n)) continue;
    if (found.has(s.n)) throw new Error(`técnica atual duplicada: ${s.n}`);
    found.set(s.n, s);
    for (const [k, v] of Object.entries(BAL[s.n] || {})) if (v === null) delete s[k]; else s[k] = v;
  }
  const missing = [...ATUAIS].filter(n => !found.has(n));
  if (missing.length) throw new Error(`técnicas atuais ausentes da árvore: ${missing.join(', ')}`);
  const unbalanced = [...ATUAIS].filter(n => !BAL[n]);
  if (unbalanced.length) throw new Error(`técnicas atuais sem balanceamento: ${unbalanced.join(', ')}`);
}

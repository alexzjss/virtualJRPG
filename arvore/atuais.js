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
]);

// Curva usada aqui: técnicas básicas ficam em 10–15 XP, intermediárias em 20–35,
// ápices em 50–80 e domínios em 150. Controle troca dano por efeito; área paga em
// custo/tempo; formas fortes sempre têm manutenção e ressaca.
const BAL = {
  'Faísca': { p: 11, c: 4, ct: 70, fx: 'st para 1 20%' },
  'Lâmina de Vento': { p: 11, c: 4, ct: 70, fx: 'push 10' },
  'Wakaze': { xp: 50, p: 32, c: 11, fx: 'push 30', rq: { DES: 50 } },
  'Selo de Fuhaku': { p: 7, c: 3, fx: 'seal 14 2' },
  'Corrente de Vento': { p: 12, c: 4, ct: 75, fx: 'push 25' },
  'Passo do Vento': { xp: 35, c: 4, fm: 'dur 3; agi 20; def 10; dr aura 2', rq: { AGI: 52 } },
  'Salto de Ventania': { c: 2, ct: 45, fx: 'st evade 1 self; haste 25 self' },
  'Canhão de Aura': { xp: 40, p: 32, c: 12, ct: 120, rq: { SAB: 50 } },
  'Cólera': { xp: 55, c: 4, fm: 'dur 3; atk 45; dr hp 12; end st exaus 2', rq: { FOR: 56 } },
  'Kai': { xp: 55, c: 4, fm: 'dur 3; atkP 10; dr aura 5; end lose aura 99', rq: { SAB: 56 } },
  'Passo do Cão-de-Caça': { c: 2, ct: 45, fx: 'st evade 1 self; st stealth 1 self' },
  'Força de Aura': { p: 11, c: 3, fx: 'st atkUp 1 self; push 15' },
  'Pulso de Fuhaku': { p: 6, c: 2, ct: 55, fx: 'push 20' },
  'Mundo do Tsukuyomi': { xp: 150, c: 0, ct: 150, rq: { INT: 62 }, dom: 'dur 4; ally hit 10; ally agi 10; foe hit -15; tick fear' },
  'Empurrão': { p: 8, c: 3, ct: 65, fx: 'push 45' },
  'Atirar Vento': { xp: 20, p: 10, c: 4, ct: 65, fx: 'push 20' },
  'Tentáculo de Vento': { xp: 25, p: 5, c: 5, ct: 80, hits: 3, fx: 'st root 1 35%' },
  'Canhão de Aura Gélido': { xp: 70, p: 27, c: 16, ct: 145, area: true, rq: { SAB: 58 }, fx: 'st frozen 1 40%; st wet 2' },
  'Asa-Branca': { xp: 20, c: 3, ct: 60, fx: 'st evade 2 self; st agiUp 2 self' },
  'Dente-de-leão': { xp: 150, c: 0, ct: 150, rq: { DES: 62 }, dom: 'dur 4; ally agi 20; ally hit 10; foe hit -10' },
  'Ten: Envolver': { xp: 10, on: 'start', fx: 'shield 6' },
  'Zetsu: Ocultar': { xp: 10, c: 0, ct: 70, fx: 'st stealth 2 self; gain aura 4' },
  'Corte Fino': { p: 14, c: 5, st: 'bleed' },
  'Alvo na Mira': { xp: 10, mod: 'hit 5', sc: 'wc:dist' },
  'Fio Afiado': { xp: 10, mod: 'atk 5', sc: 'wc:corte' },
  'Aparar': { xp: 15, c: 4, p: 2 },
  'Sopro Cortante': { p: 16, c: 6, ct: 75 },
  'Corte de Fuhaku': { p: 19, c: 8, ct: 85, st: 'bleed' },
  'Lâmina de Vento Dupla': { xp: 15, p: 7, c: 5, hits: 2, ct: 80 },
  'Marca do Vento': { xp: 15, p: 6, c: 4, fx: 'brand 3' },
  'Vento Que Volta': { xp: 20, p: 9, c: 5, fx: 'echo 50' },
  'Golpe Pesado': { p: 10, c: 5, fx: 'st stun 1 25%' },
  'Chute Doentio': { xp: 50, p: 30, c: 8, st: 'poison', fx: 'stack doenca 5 self', rq: { FOR: 55 } },
  'Evolução Forçada': { xp: 40, p: 24, c: 10, st: 'agiUp', rq: { CON: 50 } },
  'Intuição': { xp: 15, c: 3, ct: 70, fx: 'st focus 3 self; st evade 1 self' },
  'Shukoudan': { p: 9, c: 3, ct: 65 },
  'Soco da Dualidade': { xp: 75, p: 42, c: 12, rq: { FOR: 55 } },
  'Lâmina da Irmandade': { xp: 60, p: 34, c: 10, rq: { DES: 55 } },
  'Clareza': { xp: 35, c: 4, fm: 'dur 3; hit 15; crit 10', rq: { INT: 52 } },
  'Esquiva Doentia': { xp: 20, c: 3, ct: 45, fx: 'st evade 1 self; haste 30 self; stack doenca 5 self' },
  'Suplex': { xp: 15, p: 13, c: 4, fx: 'st down 1 30%; stack doenca 5 self' },
  'Inconsciência': { xp: 60, c: 6, fm: 'dur 5; atk 25; hit 15; crit 10; end st blind 2; end st exaus 2', rq: { FOR: 56 } },
  'Força Doentia': { xp: 30, p: 24, c: 6, fx: 'stack doenca 5 self', rq: { FOR: 50 } },
  'Teia de Aura': { xp: 20, p: 5, c: 4, fx: 'st root 2; push 15' },
  'Ren: Intensificar': { xp: 20, c: 5, fm: 'dur 3; atk 15; def 10; dr aura 3' },
  'Carregar': { xp: 15, c: 0, ct: 100, fx: 'gain aura 7' },
  'Punho Reforçado': { p: 15, c: 5 },
  'Corpo Reforçado': { xp: 15, bon: 'hpMax 10' },
  'Punho Meteoro': { xp: 30, p: 25, c: 9, fx: 'st stun 1 35%' },
};

export function balancearAtuais(TREE) {
  const found = new Map();
  for (const t of Object.values(TREE)) for (const b of t.branches) for (const s of b) {
    if (!ATUAIS.has(s.n)) continue;
    if (found.has(s.n)) throw new Error(`técnica atual duplicada: ${s.n}`);
    found.set(s.n, s); Object.assign(s, BAL[s.n]);
  }
  const missing = [...ATUAIS].filter(n => !found.has(n));
  if (missing.length) throw new Error(`técnicas atuais ausentes da árvore: ${missing.join(', ')}`);
  const unbalanced = [...ATUAIS].filter(n => !BAL[n]);
  if (unbalanced.length) throw new Error(`técnicas atuais sem balanceamento: ${unbalanced.join(', ')}`);
}

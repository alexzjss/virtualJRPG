// Nivelamento da árvore (passa por cima de tudo depois de montada, em tree.js).
// 1) Some com os nós de evolução: "X: Nível 2", "X — Discente/Verdadeiro" (todo nó com `amp`) e as formas "X ++". O ganho deles
//    passa para a técnica base, que fica mais forte e um pouco mais cara; `pre`/`combo` que apontavam para eles passam a apontar para a base.
//    Quem já tinha o nó apagado recebe o XP de volta na migração (src/state.js, remapeia pelo nome).
// 2) Pisos de custo: técnicas fortes custam mais XP, pedem atributo alto e nós do mesmo ramo (`nb`); as maiores pedem o Despertar.
//    Só sobe, nunca baixa. Quem já aprendeu continua com a técnica.
const r5 = v => Math.round(v / 5) * 5;
const verb = f => f.trim().split(' ')[0];
const mergeFx = (a, b) => { // b substitui os efeitos de mesmo verbo de a (ex.: "push 70" no lugar de "push 40")
  if (!a) return b; const nb = b.split(';').map(s => s.trim()).filter(Boolean), vs = new Set(nb.map(verb));
  return [...a.split(';').map(s => s.trim()).filter(f => f && !vs.has(verb(f))), ...nb].join('; ');
};
const raise = (s, a, v) => { if (!a) return; s.rq = { ...(s.rq || {}) }; s.rq[a] = Math.max(s.rq[a] || 0, v); };
const FORMKEY = { atk: 1, agi: 1, def: 1, hit: 1, crit: 1, heal: 1, atkP: 5 };
const formScore = fm => String(fm || '').split(';').reduce((t, p) => { const [k, v] = p.trim().split(/\s+/); return t + (FORMKEY[k] && +v > 0 ? +v * FORMKEY[k] : 0); }, 0);
const VINC = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko'];
// a técnica de materializar armas sai do começo da Conjuração e vai para o fundo do ramo
const CONJ_ORDEM = ['Corrente do Juízo', 'Corrente da Cura', 'Corrente Radiestésica', 'Escudo Conjurado', 'Corrente do Juramento', 'Conjurar Arma', 'Invocar: Fera Conjurada', 'Arsenal', 'Corrente Estendida', 'Prisão Absoluta'];

export function nivelar(TREE) {
  const all = []; for (const [el, t] of Object.entries(TREE)) if (el !== 'armas') t.branches.forEach(b => b.forEach(s => all.push([el, b, s])));
  const byName = n => all.find(([, , s]) => s.n === n && !s.amp)?.[2];
  const ren = {};
  // 1) evoluções somadas na base
  for (const [, b, s] of all) {
    const pp = / \+\+$/.test(s.n) && s.k === 'form' && s.pre;
    if (!(s.amp && s.up) && !pp) continue;
    const base = byName(s.amp || s.pre); if (!base) continue;
    if (pp) { base.fm = s.fm; base.c = Math.max(base.c || 0, s.c || 0); base.xp = Math.max(base.xp, s.xp); }
    else {
      const u = s.up; base.p = (base.p || 0) + (u.p || 0); base.c = (base.c || 0) + (u.c ?? Math.ceil((u.p || 0) / 3));
      if (u.san) base.pay = { ...(base.pay || {}), san: (base.pay?.san || 0) + u.san };
      if (u.area) { base.area = true; base.ct = Math.max(base.ct || 100, 130); }
      if (u.hits) base.hits = u.hits; if (u.fx) base.fx = mergeFx(base.fx, u.fx);
      base.xp = r5(base.xp + s.xp / 2);
    }
    ren[s.n] = base.n; b.splice(b.indexOf(s), 1);
  }
  const fix = v => v && v.split('|').map(n => ren[n] || n).filter((n, i, a) => a.indexOf(n) === i).join('|');
  for (const [, , s] of all) { if (s.pre) s.pre = fix(s.pre); if (s.combo) s.combo = fix(s.combo); }
  // Conjuração: reordena e materializar fica caro
  const conj = TREE.aura.branches.find(b => b.some(s => s.n === 'Conjurar Arma'));
  if (conj) conj.sort((a, b) => CONJ_ORDEM.indexOf(a.n) - CONJ_ORDEM.indexOf(b.n));
  const C = { 'Conjurar Arma': [45, 'INT', 55, 'Escudo Conjurado'], 'Invocar: Fera Conjurada': [55, 'INT', 56, 'Conjurar Arma'], 'Arsenal': [70, 'SAB', 58, 'Conjurar Arma'],
    'Corrente Estendida': [60, 'INT', 56], 'Prisão Absoluta': [110, 'INT', 62], 'Fábrica de Cópias': [40, 'INT', 55], 'Legião de Aura': [70, 'INT', 58], 'Exército de Um Só': [110, 'INT', 62] };
  // 2) pisos
  for (const [el, b, s] of all) {
    if (!b.includes(s)) continue; // apagado no passo 1
    const nbMax = Math.max(0, Math.min(b.indexOf(s), b.length - 1)), nb = n => { if (n && nbMax) s.nb = Math.max(s.nb || 0, Math.min(n, nbMax)); };
    if (C[s.n]) { const [xp, a, v, pre] = C[s.n]; s.xp = Math.max(s.xp, xp); raise(s, a, v); if (pre) s.pre = s.pre ? s.pre + '|' + pre : pre; nb(3); }
    else if (s.cat === 'con' && s.k !== 'passive') s.xp = Math.max(s.xp, r5(s.xp * 1.4));
    if (s.k === 'form') { // formas: quanto mais somam, mais caras
      const sc = formScore(s.fm);
      if (sc >= 75) { s.xp = Math.max(s.xp, 90); raise(s, s.a, 60); nb(6); if (VINC.includes(el) && !s.aw) s.aw = el; }
      else if (sc >= 50) { s.xp = Math.max(s.xp, 55); raise(s, s.a, 56); nb(4); }
      else if (sc >= 30) { s.xp = Math.max(s.xp, 35); raise(s, s.a, 52); nb(2); }
      if (s.aw) s.xp = Math.max(s.xp, 120);
    }
    if (s.dom) { s.xp = Math.max(s.xp, 150); raise(s, s.a, 62); nb(6); if (VINC.includes(el)) s.aw ||= el; }
    if (s.duo) { s.xp = Math.max(s.xp, r5(s.xp * 1.5)); raise(s, s.a, 55); }
    if (s.trio) { s.xp = Math.max(s.xp, 110); raise(s, s.a, 60); s.pre ||= 'Lâmina da Irmandade'; }
    if (s.k === 'dmg' && !s.limit) { const p = (s.p || 0) * (s.hits || 1) * (s.area ? 1.4 : 1); s.xp = Math.max(s.xp, p >= 60 ? 70 : p >= 40 ? 50 : p >= 30 ? 40 : p >= 22 ? 25 : 0); }
  }
}

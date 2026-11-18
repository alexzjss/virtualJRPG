// Simulador de balanceamento com as regras reais do servidor.
//   node tools/sim.js [batalhas] [modo]     modos: base (4x4 contra o inimigo padrão), enc (encontros gerados), boss (chefes), armas (dano do ataque básico por tempo de cada arma)
//   VJ_RULES='{"hit":50}' node tools/sim.js 300 enc   testa uma variação sem editar o código
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjsim-'));
const { H, S, R, current, derive, genFoe, partyRef, fitBoss, spawn } = await import('../server.js');
const gm = { role: 'gm' }, N = +process.argv[2] || 300, MODE = process.argv[3] || 'base', out = s => process.stdout.write(s + '\n');
const byName = n => Object.keys(S.skills).find(k => S.skills[k].name === n), item = n => Object.keys(S.items).find(k => S.items[k].name === n);
const TREE = (await import('../tree.js')).TREE, ids = (el, b, n) => (TREE[el].branches.find(x => !x.de && x[0]?.ob === b) || TREE[el].branches[b]).slice(0, n).map(o => byName(o.n)); // ob: índice do ramo antes da reorganização (arvore/ordem.js)
const L8 = process.env.L8 ? (await import('../arvore/leva8.js')).LEVA8 : null; // L8=1: só técnicas da Leva 8 (Ressonância + Caça) no lugar das do Vínculo · L8=mix: grupo padrão + 2 a 4 técnicas da Leva 8 por herói
console.log = () => {};
// valor esperado da técnica: poder × Ressonância (aliado acabou de acertar o alvo com o Vínculo pedido) × Marca a detonar; escolhe o alvo onde vale mais
const best = (a, s, fs, weak) => { const L = S.battle.lastAct; let v = s.power || 0, t = weak; for (const e of fs) { let m = 1; for (const f of s.fx || []) { if (f.t === 'rs' && L && L.id !== a.id && !L.enemy && (f.k === 'any' || L.el === f.k) && L.t.includes(e.id)) m *= f.m; if (f.t === 'pop' && e.st.brand) m *= f.m; } if ((s.power || 0) * m > v) { v = (s.power || 0) * m; t = e; } } return [v, t]; };
const reset = () => { S.chars = {}; S.log.length = 0; S.battle = { active: false, ticks: {} }; };
// grupo de heróis por nível: 0 = recém-criado, 1 = algumas sessões, 2 = veterano. O 4º herói é curandeiro de Amaterasu.
const VINC = [['indra', 'AGI', 'INT'], ['fuhaku', 'DES', 'INT'], ['hiruko', 'CON', 'FOR'], ['amaterasu', 'SAB', 'CAR']];
function party(size, lvl) {
  return VINC.slice(0, size).map(([el, a1, a2]) => {
    const had = new Set(Object.keys(S.chars)); H.addChar(gm, { owner: 'p' }); const h = S.chars[Object.keys(S.chars).find(k => !had.has(k))], up = lvl * 8;
    for (const a in h.attrs) h.attrs[a] = 40 + up; Object.assign(h.attrs, { [a1]: 62 + up, [a2]: 52 + up, AGI: Math.max(h.attrs.AGI, 50 + up), CON: Math.max(h.attrs.CON, 46 + up) });
    h.vinc = [el]; h.arma = [10, 14, 19][lvl]; h.armor = [0, 2, 4][lvl]; h.bon.hpMax = lvl * 12; h.bon.auraMax = lvl * 6;
    const nv = [1, 6, 11][lvl], mix = process.env.L8 === 'mix', k8 = [0, 1, 2][lvl], l8 = L8 && mix ? [...ids(el, 0, [1, 4, 7][lvl]), ...ids(el, 3, [0, 2, 4][lvl]), ...[...L8[el][0].slice(0, k8), ...L8[el][3].slice(0, k8)].map(o => byName(o.n))] : L8 && [...L8[el][0].slice(0, Math.ceil(nv / 2)), ...L8[el][3].slice(0, Math.floor(nv / 2))].map(o => byName(o.n));
    h.skills = [...(l8 || [...ids(el, 0, [1, 4, 7][lvl]), ...ids(el, 3, [0, 2, 4][lvl])]), byName('Golpe Pesado'), ...(lvl ? [byName('Golpe Giratório')] : [])].filter(Boolean);
    h.inv[item(lvl ? 'Líquido Dourado do Sanatório' : 'Poção')] = 1 + lvl;
    return h;
  });
}
function fight(heroes, foes) {
  [...heroes, ...foes].forEach(c => { derive(c); c.hp = c.hpMax; c.aura = c.auraMax; c.san = c.sanMax; });
  H.battle(gm, { on: true }); const acts = {};
  for (let step = 0; step < 1500; step++) {
    const live = Object.values(S.chars), liveF = live.filter(f => f.enemy && f.hp > 0), liveH = heroes.filter(h => h.hp > 0), a = S.chars[current()];
    if (!liveF.length || !liveH.length || !a) break;
    acts[a.id] = (acts[a.id] || 0) + 1;
    if (a.enemy) { if (process.env.SIMDBG && a.boss) process.stderr.write(`boss hp ${Math.round(100*a.hp/a.hpMax)}% aura ${a.aura}/${a.auraMax} lim ${a.limit} dom ${!!a.skills.find(k=>S.skills[k].dom)}\n`); H.ai(gm); if (S.battle.cmd) H.cmdSkip(gm); continue; } // a janela de esquiva/aparar (Leva 4) espera um jogador: no simulador o golpe sai já
    // heróis: Limite se cheio, cura quem está mal, poção em emergência, senão a skill mais forte que puder pagar no inimigo mais ferido
    const sks = a.skills.map(k => [k, S.skills[k]]).filter(([, s]) => s && s.kind !== 'passive' && a[s.res] >= s.cost && (!s.limit || a.limit >= 100) && !a.st.silence && !a.st.fury);
    const hurt = heroes.filter(h => !h.dead && h.hp < h.hpMax * .45).sort((x, y) => x.hp - y.hp)[0], weak = liveF.sort((x, y) => x.hp - y.hp)[0], pot = Object.keys(a.inv).find(k => S.items[k]?.eff === 'hp');
    const lim = sks.find(([, s]) => s.limit), heal = sks.filter(([, s]) => s.kind === 'heal' && s.power > 0).sort((x, y) => y[1].power - x[1].power)[0], dmg = sks.filter(([, s]) => s.kind !== 'heal' && !s.limit).map(([k, s]) => [k, s, ...best(a, s, liveF, weak)]).sort((x, y) => y[2] - x[2])[0];
    if (lim) H.act(gm, { id: a.id, skill: lim[0], target: weak.id });
    else if (hurt && heal) H.act(gm, { id: a.id, skill: heal[0], target: hurt.id });
    else if (a.hp < a.hpMax * .3 && pot) H.use(gm, { id: a.id, item: pot, target: a.id });
    else H.act(gm, { id: a.id, skill: dmg && Math.random() < .65 ? dmg[0] : 'atk', target: (dmg && dmg[3] || weak).id });
  }
  if (process.env.SIMDOM) globalThis.__dom = (globalThis.__dom || 0) + Object.values(S.chars).filter(c => c.domUsed).length;
  const win = !Object.values(S.chars).some(f => f.enemy && f.hp > 0) && heroes.some(h => h.hp > 0);
  return { win, rounds: Math.max(...heroes.map(h => acts[h.id] || 0)), dead: heroes.filter(h => h.dead).length };
}
const run = (label, setup) => { let w = 0, r = 0, d = 0; for (let i = 0; i < N; i++) { reset(); const [hs, fs] = setup(); const o = fight(hs, fs); w += o.win; r += o.rounds; d += o.dead; }
  out(`${label.padEnd(44)} vitória ${String(Math.round(100 * w / N)).padStart(3)}% · rodadas ${(r / N).toFixed(1).padStart(4)} · mortes ${(d / N).toFixed(2)}`); };
const foesNow = () => Object.values(S.chars).filter(c => c.enemy);
out(`regras ${JSON.stringify({ rank: R.rank, diff: R.diff })}\n${N} batalhas por linha`);
if (MODE === 'base') run('4 heróis nível 0 x 4 inimigos padrão', () => { const hs = party(4, 0); for (let i = 0; i < 4; i++) H.addChar(gm, { enemy: true }); return [hs, foesNow()]; });
if (MODE === 'enc') for (const size of (process.env.SIZES || '3,4').split(',').map(Number)) for (const lvl of (process.env.LVLS || '0,1,2').split(',').map(Number)) for (const diff of Object.keys(R.diff))
  run(`${size} heróis nível ${lvl} · encontro ${diff}`, () => { const hs = party(size, lvl); H.foeEnc(gm, { diff }); return [hs, foesNow()]; });
if (MODE === 'boss') {
  for (const size of [3, 4]) for (const lvl of [0, 2]) run(`${size} heróis nível ${lvl} · chefe gerado`, () => { const hs = party(size, lvl); H.foeGen(gm, { el: ['kagutsuchi', 'atlas', 'tsukuyomi', 'indra'][Math.floor(Math.random() * 4)], role: ['bruto', 'conjurador'][Math.floor(Math.random() * 2)], rank: 'chefe' }); return [hs, foesNow()]; });
  for (const [id, b] of Object.entries(S.bestiary).filter(([, b]) => b.boss)) for (const lvl of [0, 2]) run(`4 heróis nível ${lvl} · ${b.name}`, () => { const hs = party(4, lvl); H.bSpawn(gm, { id }); return [hs, foesNow()]; });
}
if (MODE === 'armas') { // dano do ataque básico por tempo, no motor real: herói com 55 em tudo contra dois alvos de AGI 70 e armadura 2
  const AR = globalThis.ARMAS, refs = AR.NIVEIS.map((n, l) => { const k = 'ref' + l; S.items[k] = { name: 'ref', type: 'arma', wt: 'lamina', power: 10 + n.p, el: '', price: 0 }; return k; });
  const dpt = k => { let d = 0, t = 0;
    for (let i = 0; i < N; i++) {
      reset(); H.addChar(gm, { owner: 'p' }); H.addChar(gm, { enemy: true }); H.addChar(gm, { enemy: true }); const [h, ...fs] = Object.values(S.chars);
      for (const a in h.attrs) h.attrs[a] = 55; h.inv[k] = 1; h.equip.arma = k; fs.forEach(f => { f.attrs.AGI = 70; f.armor = 2; f.bon.hpMax = 9999; f.bon.sanMax = 999; derive(f); f.hp = f.hpMax; f.san = f.sanMax; });
      derive(h); h.hp = h.hpMax; h.san = h.sanMax; H.battle(gm, { on: true }); for (const x in S.battle.ticks) S.battle.ticks[x] = 1e6; S.battle.ticks[h.id] = 0;
      const before = fs.reduce((a, f) => a + f.hp + f.san, 0); H.act(gm, { id: h.id, skill: 'atk', target: fs[0].id });
      d += before - fs.reduce((a, f) => a + f.hp + f.san, 0); t += S.battle.ticks[h.id];
    }
    return d / t; };
  const base = refs.map(dpt);
  out('arma'.padEnd(30) + 'tipo     categoria  nív  poder  motor  régua');
  for (const [k, w] of Object.entries(S.items).filter(([k, i]) => i.type === 'arma' && !k.startsWith('ref')).sort((a, b) => a[1].wt.localeCompare(b[1].wt)))
    out(`${w.name.padEnd(30)}${w.wt.padEnd(9)}${(w.cat || '').padEnd(11)}${String(AR.lvlOf(w)).padStart(3)}${String(w.power).padStart(7)}${String(Math.round(100 * dpt(k) / base[AR.lvlOf(w)])).padStart(6)}%${String(AR.rel(w)).padStart(6)}%`);
}
if (process.env.SIMDOM) out("Domínios abertos: " + (globalThis.__dom || 0));
process.exit(0);

// Mede cada técnica de dano com as regras reais: um herói padrão (atributo da técnica 60, os outros 45) usa a técnica uma vez
// contra 3 bonecos e o dano total é dividido pelo tempo da ação (ct). Compara com as técnicas da mesma faixa de XP.
//   node tools/sim-skills.js [filtro-de-nome] [--novos arquivo-com-nomes]   (sem filtro: lista os fora da curva)
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjsk-'));
const { H, S, derive } = await import('../server.js');
console.log = () => {};
const out = s => process.stdout.write(s + '\n'), gm = { role: 'gm' }, args = process.argv.slice(2);
const novos = args.includes('--novos') ? new Set(fs.readFileSync(args[args.indexOf('--novos') + 1], 'utf8').split('\n').filter(Boolean)) : null;
const filtro = args[0] && !args[0].startsWith('--') ? args[0].toLowerCase() : '';
const mk = enemy => { const had = new Set(Object.keys(S.chars)); H.addChar(gm, enemy ? { enemy: true } : { owner: 'p' }); return S.chars[Object.keys(S.chars).find(k => !had.has(k))]; };
const rnd = Math.random;
function medir(k) {
  const s = S.skills[k], req = s.req, ri = s.reqItem; delete s.req; delete s.reqItem; // a arma exigida não entra na conta
  S.chars = {}; S.log.length = 0; S.battle = { active: false, ticks: {} };
  const h = mk(false), es = [mk(true), mk(true), mk(true)];
  for (const a in h.attrs) h.attrs[a] = 45; h.attrs[s.attr] = 60; h.attrs.AGI = Math.max(h.attrs.AGI, 50);
  h.vinc = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko']; h.aw = ['outro', 'esp', ...h.vinc];
  h.arma = 14; h.skills = [k]; h.inv = {}; derive(h);
  for (const e of es) { for (const a in e.attrs) e.attrs[a] = 45; e.attrs.AGI = 1; e.armor = 3; derive(e); e.hpMax = e.hp = 99999; }
  H.battle(gm, { on: true }); h.hp = h.hpMax; h.aura = 999; h.san = 999; h.limit = 100; S.battle.ticks[h.id] = -1;
  let i = 0; Math.random = () => [.35, .6, .45, .5][i++ % 4]; // acerto quase certo, sem crítico, dano médio
  try { H.act(gm, { id: h.id, skill: k, target: es[0].id }); } finally { Math.random = rnd; if (req) s.req = req; if (ri) s.reqItem = ri; }
  const d = es.reduce((t, e) => t + e.hpMax - e.hp + (s.kind === 'mental' ? (e.sanMax - e.san) * 2 : 0), 0); // Sanidade vale o dobro (a reserva é menor)
  return d / ((s.ct || 100) / 100);
}
const ks = Object.keys(S.skills).filter(k => { const s = S.skills[k]; return ['dmg', 'mental'].includes(s.kind) && !s.dom && !s.duo && !s.trio && !s.chg && (!filtro || s.name.toLowerCase().includes(filtro)); });
const rows = ks.map(k => { const s = S.skills[k]; let v = 0; try { v = medir(k); } catch { v = -1; } return { k, n: s.name, xp: s.xp, lim: !!s.limit, area: !!s.area, m: s.kind === 'mental', cost: s.cost, v, novo: novos ? novos.has(s.name) : false }; }).filter(r => r.v >= 0);
if (filtro) { for (const r of rows) out(`${r.n}: ${r.v.toFixed(0)} de dano/tempo (XP ${r.xp}, custo ${r.cost})`); process.exit(0); }
// curva: mediana do dano por faixa de XP (Limites à parte), calculada só com as técnicas antigas
const faixa = r => (r.m ? 'mental ' : '') + (r.area ? 'área ' : '') + (r.lim ? 'Limite' : 'XP≤' + [10, 15, 25, 35, 50, 70, 999].find(v => r.xp <= v));
const med = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] || 1; }, base = {};
for (const r of rows.filter(r => !r.novo)) (base[faixa(r)] ??= []).push(r.v);
const ref = Object.fromEntries(Object.entries(base).map(([f, a]) => [f, med(a)]));
out('curva (técnicas antigas): ' + Object.entries(ref).map(([f, v]) => `${f} ${v.toFixed(0)}`).join(' · '));
const alvo = novos ? rows.filter(r => r.novo) : rows;
const fora = alvo.map(r => ({ ...r, q: r.v / ref[faixa(r)] })).filter(r => r.q > 1.6 || r.q < .5).sort((a, b) => b.q - a.q);
for (const r of fora) out(`${r.q > 1 ? 'FORTE' : 'fraco'} ×${r.q.toFixed(2)} · ${r.n} (XP ${r.xp}${r.lim ? ', Limite' : ''}): ${r.v.toFixed(0)} vs ${ref[faixa(r)].toFixed(0)}`);
out(`${alvo.length} técnicas medidas · ${fora.length} fora da curva (×0,5 a ×1,6)`);
process.exit(0);

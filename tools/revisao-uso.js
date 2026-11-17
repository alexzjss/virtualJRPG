// Revisão dinâmica: cada skill ativa é usada numa batalha real (herói vs 2 inimigos, aliado caído para reerguer)
// e o estado antes/depois é comparado. Aponta exceções, ações recusadas e skills que não mudaram nada.
//   node tools/revisao-uso.js
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjrev-'));
const { H, S, current, derive } = await import('../server.js');
const gm = { role: 'gm' }, ana = { role: 'player', name: 'Ana' };
const mk = (m) => { const b = new Set(Object.keys(S.chars)); H.addChar(gm, m); const ch = S.chars[Object.keys(S.chars).find(k => !b.has(k))]; derive(ch); ch.hp = ch.hpMax; return ch; };
const snap = cs => JSON.stringify(cs.map(c => [c.hp, c.aura, c.san, c.shield, c.st, c.stk, c.form, c.chg, c.sealD, c.limit, c.guardBy]).concat([S.battle.ticks, S.battle.wx, S.battle.dom]));
const EL = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko'];
const W = { lamina: 'Sabre', lanca: 'Lança', fogo: 'Revólver', punho: 'Soqueira' };
const res = { erro: [], recusa: [], nada: [], efeito: [] }; let ok = 0;
const ids = Object.keys(S.skills).filter(k => S.skills[k].kind !== 'passive');
for (const id of ids) {
  const s = S.skills[id];
  S.chars = {}; S.log.length = 0; S.battle = { active: false, ticks: {} };
  const h = mk({ owner: 'Ana' }), al = mk({ owner: 'Ana' }), al2 = mk({ owner: 'Ana' }), e1 = mk({ enemy: true }), e2 = mk({ enemy: true });
  for (const a in h.attrs) h.attrs[a] = 80; h.attrs.AGI = 99; e1.attrs.AGI = e2.attrs.AGI = 1; al.attrs.AGI = 1;
  h.vinc = [...EL]; h.aw = ['outro', 'esp', 'eremita', ...EL]; h.skills = [id];
  if (s.duo) { const d = Object.keys(S.skills).find(k => S.skills[k].name === s.duo); al.skills = [d]; }
  if (s.trio) { const f = n => Object.keys(S.skills).find(k => S.skills[k].name === n); al.skills = [f(s.trio[0])]; al2.skills = [f(s.trio[1])]; al2.attrs.AGI = 1; }
  if (s.req) { S.items.tw = { name: 'Arma Teste', type: 'arma', power: 10, wt: s.req, el: '', price: 1, attr: s.attr, pierce: 0, reqFor: 0 }; h.inv.tw = 1; }
  if (s.wpn) continue; // técnicas de arma do catálogo de itens: cobertas pelos testes de armas
  derive(h); derive(al); derive(al2); al2.hp = al2.hpMax; H.battle(gm, { on: true });
  if (s.req) H.equip(ana, { id: h.id, item: 'tw' });
  derive(h); h.hp = h.hpMax; h.aura = h.auraMax = 999; h.san = h.sanMax; h.limit = 100;
  const isRev = s.fx?.some(f => f.t === 'revive');
  if (isRev) { al.hp = 0; al.dying = 3; }
  else if (s.kind === 'heal') al.hp = Math.ceil(al.hpMax / 2);
  if (s.nf) { h.form = 'x'; h.st.form = 5; }
  e1.st.burn = 3; e1.st.bleed = 3; e1.st.wet = 2; // dá o que detonar/espalhar
  S.battle.ticks[h.id] = -1;
  const self = s.tg === 'self' || s.kind === 'form', foe = ['dmg', 'mental'].includes(s.kind) || (s.kind === 'util' && s.fx?.some(f => ['st', 'lose', 'push', 'strip', 'steal', 'brk', 'seal', 'det'].includes(f.t) && !f.to && (f.t !== 'st' || globalThis.RULES.NEG.includes(f.k))));
  const tgt = self ? h : foe ? e1 : al;
  const before = snap([h, al, e1, e2]);
  try {
    const r = H.act(ana, { id: h.id, skill: id, target: tgt.id });
    if (s.chg && h.chg) { S.battle.ticks[h.id] = -1; for (let i = 0; i < (s.chg || 1) + 1 && h.chg; i++) { S.battle.ticks[h.id] = -1; H.act(ana, { id: h.id, skill: id, target: tgt.id }); H.next?.(gm); } }
    const after = snap([h, al, e1, e2]);
    const used = S.log.some(l => l.text?.includes(s.name)) || h.aura < 999;
    if (!used) res.recusa.push(`${s.name} [${s.kind}] ${s.br}: ${S.log.at(-1)?.text || 'sem log'}`);
    else if (before === after) res.nada.push(`${s.name} [${s.kind}] ${s.br}`);
    else ok++;
    if (used) { // efeito por efeito (só os determinísticos), no alvo que a notação promete
      const pick = f => f.to === 'self' ? [h] : f.to === 'ally' ? [h, al, al2] : f.to === 'foes' ? [e1, e2] : [tgt];
      const landed = !['dmg', 'mental'].includes(s.kind) || e1.hp < e1.hpMax || S.log.some(l => /CRÍTICO|dano/i.test(l.text || ''));
      for (const f of s.fx || []) {
        const ts = pick(f).filter(t => t.hp > 0); if (!ts.length || (!f.to && !landed)) continue;
        let miss = '';
        if (f.t === 'st' && f.ch >= 100 && !ts.some(t => t.st[f.k] || (f.k === 'shield' && t.shield))) miss = `st ${f.k}`;
        if (f.t === 'shield' && !ts.some(t => t.shield > 0)) miss = 'shield';
        if (f.t === 'stack' && !(h.stk?.[f.k] > 0) && !(s.fx.some(g => g.t === 'burst' && g.k === f.k))) miss = `stack ${f.k}`;
        if (f.t === 'revive' && !(al.hp > 0)) miss = 'revive';
        if (f.t === 'clima' && S.battle.wx?.k !== f.k) miss = 'clima';
        if (f.t === 'seal' && !ts.some(t => t.sealD)) miss = 'seal';
        if (f.t === 'guard' && !ts.some(t => t.guardBy)) miss = 'guard';
        if (miss && !s.chg) res.efeito.push(`${s.name} [${s.kind}${s.tg ? '/' + s.tg : ''}] ${s.br}: ${miss} não aplicado (alvo ${tgt === h ? 'si' : tgt === al ? 'aliado' : 'inimigo'})`);
      }
    }
  } catch (err) { res.erro.push(`${s.name} [${s.kind}] ${s.br}: ${err.stack.split('\n').slice(0, 2).join(' | ')}`); }
}
for (const k of ['erro', 'recusa', 'nada', 'efeito']) { console.log(`\n== ${k} (${res[k].length})`); console.log(res[k].join('\n')); }
console.log(`\n${ids.length} ativas · ${ok} funcionaram`);
process.exit(0);

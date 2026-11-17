import { S, log } from './state.js';
import { OF } from './config.js';
import { applySt, at, d100, derive, endTurn, int, pick, rid, sanPen, scene, summonOf } from './rules.js';
import { PARTS, PL, VN } from './consts.js';

// ---------- ofícios (perícias): rolagem, receitas, forja, coleta e companheiros ----------
const itemId = name => Object.keys(S.items).find(k => S.items[k].name === name);
const nodeOf = (ch, id) => (ch.pof || []).includes(id) ? OF.PER[id.split('.')[0]]?.nodes.find(n => n.id === id) : null;
const hasNode = (ch, pred) => (ch.pof || []).map(id => OF.PER[id.split('.')[0]]?.nodes.find(n => n.id === id)).some(n => n && pred(n));
const takeMats = (ch, mats, how = 'all') => { // ok: tudo; falha: 1 unidade; desastre: metade de cada
  for (const [n, q] of Object.entries(mats)) { const k = itemId(n); if (!k) continue; const v = how === 'all' ? q : how === 'half' ? Math.max(1, Math.floor(q / 2)) : 0; if ((ch.inv[k] -= v) <= 0) delete ch.inv[k]; }
  if (how === 'one') { const k = Object.keys(mats).map(itemId).find(k => k && ch.inv[k] > 0); if (k && --ch.inv[k] <= 0) delete ch.inv[k]; }
};
const haveMats = (ch, mats) => Object.entries(mats).every(([n, q]) => ch.inv[itemId(n)] >= q);
const matsText = mats => Object.entries(mats).map(([n, q]) => `${q}× ${n}`).join(', ');
function ofiRoll(ch, per, mod, label) { // d100 contra o melhor dos dois atributos da perícia + bônus do grau e dos nós; sucesso rende Pontos de Ofício
  const p = OF.PER[per], attr = p.a.reduce((b, k) => at(ch, k) > at(ch, b) ? k : b, p.a[0]);
  const target = int(at(ch, attr) + OF.rollBonus(ch, per) + int(mod, -100, 100) - sanPen(ch), 1, 95), r = d100(), crit = r <= Math.max(1, Math.floor(target / 10)), ok = r <= target;
  const dis = !ok && r >= 96 && !(per === 'jogos' && OF.hook(ch, 'semDesastre')), res = crit ? 'CRÍTICO' : ok ? 'Sucesso' : dis ? 'DESASTRE' : 'Falha';
  if (ok) { ch.po = (ch.po || 0) + (crit ? 2 : 1); ch.marks[attr] = true; }
  log(ch.name, `${label}: ${p.n} (${attr} ${target}%) → ${r}: ${res}${ok ? ` · +${crit ? 2 : 1} PO` : ''}`, ok ? 'ok' : 'bad', { d: r, rr: { l: p.n, t: target, res, c: ch.id } });
  return { r, ok, crit, dis };
}
const narrar = (ch, e, txt) => { e.t = String(txt ?? '').replace(/\s+/g, ' ').trim().slice(0, 200); if (e.t) log('Mestre', `${ch.name} · ${e.a}: ${e.t}`, ''); }; // narração do resultado de um teste narrativo
const upOf = (ch, id) => (ch.up[id] ??= { p: 0, t: 0, g: [] });
function spawnCompanions(h) { // companheiros de ofício entram no começo da batalha
  const nodes = (h.pof || []).map(id => OF.PER[id.split('.')[0]]?.nodes.find(n => n.id === id)).filter(n => n?.comp), cap = 1 + (OF.hook(h, 'matilha') ? 1 : 0);
  for (const n of [...new Map(nodes.map(n => [n.comp, n])).values()].slice(-cap)) {
    summonOf(h, { summon: n.comp, attr: 'CAR', name: n.comp });
    const c = Object.values(S.chars).find(o => o.summon?.by === h.id && o.summon.k === n.comp); if (!c) continue;
    c.summon.ttl = 999; c.summon.rev = !!OF.hook(h, 'compRev'); c.bon.hpMax += OF.hook(h, 'compHp', 'sum'); c.arma += Math.round(OF.hook(h, 'compAtk', 'sum') / 3); derive(c); c.hp = c.hpMax;
  }
}
function trapStart() { // armadilha preparada no acampamento: um inimigo começa a luta preso
  const tr = S.trap; delete S.trap; if (!tr) return;
  const foes = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o?.enemy && o.hp > 0), f = pick(foes); if (!f) return;
  applySt(f, 'root', 2); if (tr.sang) applySt(f, 'bleed', 3); if (tr.stun) applySt(f, 'stun', 1);
  log('Armadilha', `${f.name} cai na armadilha!`, 'ok');
}

// ações de ofício: cada uma recebe (personagem, nó, perícia, mensagem, bônus, em batalha)
const hookP = (ch, per, hk) => OF.learned(ch, per).filter(n => n.hk === hk).reduce((a, n) => a + n.v, 0);
const OFI_ACT = {
  avaliar(ch, n, per, m) {
    const i = S.items[m.item]; if (!i || !(ch.inv[m.item] > 0)) return;
    const u = ch.up[m.item]; log(ch.name, `avalia ${i.name}: poder ${i.power}${u?.p ? ` (+${u.p} de têmpera)` : ''}${i.el ? ` · ${VN[i.el] || i.el}` : ''} · vale ${i.price} de ouro${u?.g?.length ? ` · engastes: ${u.g.join(', ')}` : ''}${u?.el2 ? ` · liga com ${VN[u.el2]}` : ''}${u?.living ? ` · arma viva (${u.kills} abates)` : ''}.`, 'ok');
  },
  reciclar(ch, n, per, m, mod) {
    const i = S.items[m.item], k = m.item; if (!i || !(ch.inv[k] > 0) || !['arma', 'armadura', 'acess', 'cons'].includes(i.type) || ch.equip[i.type] === k) return;
    const R = ofiRoll(ch, per, mod, `Reciclar ${i.name}`); if (!R.ok) return;
    if (--ch.inv[k] <= 0) delete ch.inv[k]; const s = itemId('Sucata de Ferro'), q = Math.max(1, Math.floor(i.price / 20)) + (R.crit ? 2 : 0); ch.inv[s] = (ch.inv[s] || 0) + q; log(ch.name, `desmonta ${i.name}: ${q}× Sucata de Ferro.`, 'ok');
  },
  coletar(ch, n, per, m, mod) {
    const tbl = (scene().gather || []).filter(k => S.items[k] && (!n.tag || S.items[k].tag === n.tag));
    if (!tbl.length) return log(ch.name, 'procura, mas esta cena não tem o que colher aqui.', '');
    const R = ofiRoll(ch, per, mod, `Colher (${n.n})`); if (!R.ok) return;
    const k = pick(tbl), q = 1 + (R.crit ? 1 : 0) + hookP(ch, per, 'yield'); ch.inv[k] = (ch.inv[k] || 0) + q; log(ch.name, `colhe ${q}× ${S.items[k].name}.`, 'ok');
  },
  checar(ch, n, per, m, mod) { // teste narrativo; algumas ações pagam (ou cobram) ouro. O resultado fica no diário da ficha para o mestre narrar
    const R = ofiRoll(ch, per, mod, n.n); let ouro = 0;
    if (n.g && R.ok) { const v = n.g * (R.crit ? 2 : 1); ch.gold += v; ouro = v; log(ch.name, `ganha ${v} de ouro.`, 'ok'); }
    else if (n.g && per === 'jogos' && !R.ok) { const v = Math.min(ch.gold, R.dis ? n.g : Math.floor(n.g / 2)); ch.gold -= v; ouro = -v; if (v) log(ch.name, `perde ${v} de ouro na aposta.`, 'bad'); }
    (ch.dia ??= []).push({ i: rid(), a: n.n, p: per, r: R.crit ? 'CRÍTICO' : R.ok ? 'Sucesso' : R.dis ? 'DESASTRE' : 'Falha', ok: R.ok, g: ouro, t: '', n: S.seq }); if (ch.dia.length > 40) ch.dia.shift();
  },
  tratar(ch, n, per, m, mod) { // cura partes do corpo fora de combate
    const t = S.chars[m.target]; if (!t || t.enemy || S.battle.active || t.dead) return;
    const R = ofiRoll(ch, per, mod, `Tratar ${t.name}`); if (!R.ok) return;
    const parts = n.v >= 3 ? PARTS : [m.part, hookP(ch, per, 'duas') && m.part2].filter(k => PARTS.includes(k)); let txt = '';
    for (const k of parts) { t.body[k] = n.v === 1 ? Math.floor((t.body[k] || 0) / 2) : 0; txt += ` ${PL[k]}`; }
    if (n.v >= 3) { const v = Math.ceil(t.hpMax * (R.crit && hookP(ch, per, 'santo') ? .5 : .3)); t.hp = Math.min(t.hpMax, t.hp + v); }
    const au = hookP(ch, per, 'auraTrat'); if (au) t.aura = Math.min(t.auraMax, t.aura + au);
    log(ch.name, `trata ${t.name}:${txt || ' sem partes'} ${n.v >= 3 ? 'e o corpo todo' : ''} se recupera.`, 'ok');
  },
  estabilizar(ch, n, per, m, mod) {
    const t = S.chars[m.target]; if (!t || t.enemy || t.dead || t.hp > 0 || S.battle.active) return;
    const R = ofiRoll(ch, per, mod, `Estabilizar ${t.name}`); if (!R.ok) return;
    t.hp = 1; delete t.dying; delete t.fell; log(ch.name, `estabiliza ${t.name}.`, 'ok');
  },
  identificar(ch, n, per, m, mod, inB) { // revela fraquezas (grau 1), resistências (2) e o ponto fraco (3) a todo o grupo
    const t = S.chars[m.target]; if (!t || !t.enemy) return;
    const R = ofiRoll(ch, per, mod - (t.boss && !OF.hook(ch, 'chefe') ? 10 : 0), `Identificar ${t.name}`); if (!R.ok) return;
    t.known = Math.max(t.known || 0, n.v); if (hookP(ch, per, 'arquivo')) (S.known ??= {})[t.tpl || t.name] = t.known;
    log(ch.name, `identifica ${t.name}: fraquezas ${t.weak.map(e => VN[e] || e).join(', ') || 'nenhuma'}${t.known >= 2 ? ` · resiste a ${t.resist.map(e => VN[e] || e).join(', ') || 'nada'}` : ''}${t.known >= 3 && t.weakPart ? ` · ponto fraco: ${PL[t.weakPart]}` : ''}.`, 'ok');
    if (inB) { ch.bt ??= {}; if (hookP(ch, per, 'rapida') && !ch.bt.rapida) { ch.bt.rapida = 1; return; } endTurn(ch.id); }
  },
  esfolar(ch, n, per, m, mod) {
    const t = S.chars[m.target]; if (!t || !t.enemy || !t.dead || t.skinned || S.battle.active) return;
    const R = ofiRoll(ch, per, mod, `Esfolar ${t.name}`); if (!R.ok) return; t.skinned = true;
    const a = itemId('Carne de Demônio'), b = itemId('Garra de Demônio'), q = R.crit ? 2 : 1; ch.inv[a] = (ch.inv[a] || 0) + q; ch.inv[b] = (ch.inv[b] || 0) + q; log(ch.name, `esfola ${t.name}: ${q}× Carne de Demônio e ${q}× Garra de Demônio.`, 'ok');
  },
  // ----- forja -----
  temperar(ch, n, per, m, mod) {
    const i = S.items[m.item], k = m.item, esp = OF.esp(ch); if (!i || !(ch.inv[k] > 0) || S.battle.active) return;
    if (!(i.type === 'arma' || (i.type === 'armadura' && esp === 'couraceiro') || (i.type === 'acess' && esp === 'ourives'))) return log(ch.name, `não sabe temperar ${i.name}: armaduras pedem o Couraceiro e acessórios o Ourives.`, 'bad');
    const u = upOf(ch, k), lvl = u.t || 0, cap = OF.temp(ch);
    if (lvl >= cap) return log(ch.name, `${i.name} já está no máximo que o seu grau permite (+${lvl}).`, 'bad');
    const mats = { 'Sucata de Ferro': 2 * (lvl + 1) }, gold = Math.ceil(i.price / 4);
    if (!haveMats(ch, mats) || ch.gold < gold) return log(ch.name, `precisa de ${matsText(mats)} e ${gold} de ouro para temperar ${i.name}.`, 'bad');
    const R = ofiRoll(ch, per, mod - 10 * lvl, `Têmpera de ${i.name}`);
    if (R.ok) { if (!R.crit) takeMats(ch, mats, 'all'); ch.gold -= gold; u.t = lvl + 1; u.p += i.type === 'arma' ? (esp === 'armeiro' ? 3 : 2) : i.type === 'armadura' ? 1 : 2; log(ch.name, `${i.name} agora é +${u.t}.${R.crit ? ' Sem gastar materiais!' : ''}`, 'ok'); }
    else takeMats(ch, mats, R.dis ? 'half' : 'one');
  },
  engastar(ch, n, per, m, mod) {
    const i = S.items[m.item], k = m.item, ru = S.items[m.rune]; if (!i || i.type !== 'arma' || !(ch.inv[k] > 0) || !ru?.rune || !(ch.inv[m.rune] > 0) || S.battle.active) return;
    const u = upOf(ch, k); if (u.g.length >= OF.slots(ch)) return log(ch.name, `${i.name} não tem engaste livre (seu grau abre ${OF.slots(ch)}).`, 'bad');
    const R = ofiRoll(ch, per, mod, `Engastar ${ru.name}`);
    if (R.ok) { u.g.push(ru.name); if (--ch.inv[m.rune] <= 0) delete ch.inv[m.rune]; log(ch.name, `engasta ${ru.name} em ${i.name}: ${OF.RUNAS[ru.name]?.d || ''}.`, 'ok'); }
    else if (R.dis) { if (--ch.inv[m.rune] <= 0) delete ch.inv[m.rune]; log(ch.name, `a ${ru.name} se quebra.`, 'bad'); }
  },
  ligar(ch, n, per, m, mod) {
    const i = S.items[m.item], k = m.item, el2 = m.el2; if (!i || i.type !== 'arma' || !(ch.inv[k] > 0) || !OF.ELST[el2] || el2 === i.el || S.battle.active) return;
    const mats = { ['Essência de ' + VN[el2]]: 2 }; if (!haveMats(ch, mats)) return log(ch.name, `precisa de ${matsText(mats)}.`, 'bad');
    const R = ofiRoll(ch, per, mod - 10, `Liga de ${VN[el2]}`); takeMats(ch, mats, R.ok ? 'all' : R.dis ? 'half' : 'one');
    if (R.ok) { upOf(ch, k).el2 = el2; log(ch.name, `${i.name} ganha o segundo elemento: ${VN[el2]}.`, 'ok'); }
  },
  assinar(ch, n, per, m, mod) {
    const i = S.items[m.item], k = m.item, sg = int(m.sig, 0, OF.SIG.length - 1); if (!i || i.type !== 'arma' || !(ch.inv[k] > 0) || S.battle.active) return;
    const mats = { 'Sucata de Ferro': 5 }, gold = i.price; if (!haveMats(ch, mats) || ch.gold < gold) return log(ch.name, `precisa de ${matsText(mats)} e ${gold} de ouro para assinar ${i.name}.`, 'bad');
    const R = ofiRoll(ch, per, mod - 20, `Assinatura de ${i.name}`); takeMats(ch, mats, R.ok ? 'all' : R.dis ? 'half' : 'one');
    if (R.ok) { const u = upOf(ch, k); ch.gold -= gold; u.sig = sg; u.nm = String(m.nm || '').slice(0, 30); if (R.crit) u.p += 2; log(ch.name, `${i.name}${u.nm ? ' "' + u.nm + '"' : ''} recebe a assinatura ${OF.SIG[sg].n}${R.crit ? ' — OBRA-PRIMA (+2 de poder)' : ''}.`, 'ok'); }
  },
  vivo(ch, n, per, m, mod) {
    const i = S.items[m.item], k = m.item; if (!i || i.type !== 'arma' || !(ch.inv[k] > 0) || S.battle.active || ch.up[k]?.living) return;
    const mats = i.el ? { ['Essência de ' + VN[i.el]]: 3 } : { 'Garra de Demônio': 5 }; if (!haveMats(ch, mats)) return log(ch.name, `precisa de ${matsText(mats)}.`, 'bad');
    const R = ofiRoll(ch, per, mod - 10, `Despertar ${i.name}`); takeMats(ch, mats, R.ok ? 'all' : R.dis ? 'half' : 'one');
    if (R.ok) { const u = upOf(ch, k); u.living = true; u.kills = 0; log(ch.name, `${i.name} desperta como arma viva: evolui a cada 10, 25 e 50 abates.`, 'ok'); }
  },
};

export { OFI_ACT, hasNode, haveMats, itemId, matsText, narrar, nodeOf, ofiRoll, spawnCompanions, takeMats, trapStart };

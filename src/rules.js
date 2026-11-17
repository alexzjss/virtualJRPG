import crypto from 'crypto';
import { buildBestiary, SCENES } from '../content.js';
import { R, ATTRS, DOT, CTRL, VN, STN, BODY, PARTS, PL, EXTRA, TIER, ROLES, ROLE_N, FOIL, ELCOL } from './consts.js';
import { S, newScene, log } from './state.js';

const pick = a => a[Math.floor(Math.random() * a.length)];
const d100 = () => 1 + Math.floor(Math.random() * 100);
const rid = () => crypto.randomBytes(4).toString('hex');
const int = (v, lo = 0, hi = 9999) => Math.min(hi, Math.max(lo, Math.round(+v) || 0));
const okUrl = v => /^(https?:\/\/[^\s'"()<>]+|\/(uploads|maps)\/[\w.-]+)$/.test(v);
const can = (c, ch) => ch && (c.role === 'gm' || (c.role === 'player' && ch.owner === c.name));
const scene = () => S.scenes[S.scene];
const eq = (ch, slot) => S.items[ch.equip[slot]];
const at0 = (ch, a) => ch.attrs[a] + (eq(ch, 'acess')?.attr === a ? eq(ch, 'acess').power : 0);
const lvl = (ch, k) => { const d = ch.body[k] || 0; return d >= ch.hpMax * .3 ? 2 : d >= ch.hpMax * .15 ? 1 : 0; }; // 0 ileso, 1 ferido, 2 crítico
const at = (ch, a) => at0(ch, a) - 10 * PARTS.filter(k => BODY[k][0].includes(a) && lvl(ch, k) === 2).length;
const healBody = (ch, v) => { while (v > 0) { const k = PARTS.filter(p => ch.body[p] > 0).sort((x, y) => ch.body[y] - ch.body[x])[0]; if (!k) break; const d = Math.min(v, ch.body[k]); ch.body[k] -= d; v -= d; } };
// máximos derivados dos atributos (+ bônus de passivas/mestre); valores atuais nunca passam do máximo
const BASE = { hpMax: ch => Math.floor(at0(ch, 'CON') * R.hpCon) + R.hpBase, auraMax: ch => Math.floor((at0(ch, 'INT') + at0(ch, 'SAB')) / 4), sanMax: ch => Math.floor(at0(ch, 'SAB') / 2) + Math.floor(at0(ch, 'CAR') / 4) };
const derive = ch => { for (const k in BASE) { ch[k] = Math.max(1, BASE[k](ch) + (ch.bon[k] || 0)); const c = k.slice(0, -3); ch[c] = Math.min(ch[c], ch[k]); } };
const evolveCh = ch => { const up = Object.keys(ch.marks).filter(a => d100() > ch.attrs[a] && ch.attrs[a] < 100); up.forEach(a => ch.attrs[a]++); ch.marks = {}; return up; };
const sanPen = ch => { const p = ch.san / (ch.sanMax || 1); return p <= 0 ? 30 : p <= .25 ? 20 : p <= .5 ? 10 : 0; };
// CTB: quanto maior a AGI, menor o intervalo entre turnos
const delay = ch => Math.round(1000 / Math.max(1, at(ch, 'AGI') * (ch.st.agiUp ? 1.25 : 1) * (ch.st.agiDn ? .75 : 1) * (ch.boss ? 2 : 1))); // chefes agem com o dobro da frequência
// heróis caídos continuam na fila: o "turno" deles conta para a morte
const nextOf = T => Object.keys(T).filter(k => { const ch = S.chars[k]; return ch && !ch.dead && (ch.hp > 0 || !ch.enemy); }).sort((a, b) => T[a] - T[b] || a.localeCompare(b))[0];
const current = () => nextOf(S.battle.ticks);
const order = () => { const T = { ...S.battle.ticks }, out = []; for (let i = 0; i < 8; i++) { const id = nextOf(T); if (!id) break; out.push(id); T[id] += delay(S.chars[id]); } return out; }; // próximos turnos previstos
const onMap = ch => ch.x != null && ch.scene === S.scene;
// quem acabou de perder um turno fica 2 turnos imune a novo controle (evita ficar travado para sempre)
const applySt = (t, k, n = 3) => { if (CTRL.includes(k) && t.imm > 0) return; t.st[k] = t.boss && CTRL.includes(k) ? 1 : n; };
const tickSt = ch => { for (const k in ch.st) if (--ch.st[k] <= 0) delete ch.st[k]; if (ch.imm > 0) ch.imm--; };
const addLimit = (ch, v) => ch.limit = Math.min(100, ch.limit + v);

// recalcula máximos de personagens e modelos antes de enviar o estado
const prep = () => { Object.values(S.chars).forEach(derive); for (const [k, b] of Object.entries(S.bestiary)) { b.id = k; b.bon ??= { hpMax: 0, auraMax: 0, sanMax: 0 }; b.body ??= {}; b.vinc ??= []; derive(b); b.hp = b.hpMax; } };
// herói que caiu e voltou (cura, item, mestre) é reencaixado na fila logo após o tempo atual, sem tempo velho ou ausente
const reseat = () => {
  const T = S.battle.ticks;
  for (const ch of Object.values(S.chars)) {
    if (!ch.fell || ch.enemy) continue;
    if (ch.hp <= 0) { if (ch.dead) delete T[ch.id]; continue; } // ainda caído: continua na contagem; morto sai
    delete ch.fell; delete ch.dying;
    if (!S.battle.active || ch.dead || !(ch.id in T || onMap(ch))) continue;
    const others = Object.keys(T).filter(k => k !== ch.id && S.chars[k] && !S.chars[k].dead && (S.chars[k].hp > 0 || !S.chars[k].enemy)).map(k => T[k]);
    T[ch.id] = (others.length ? Math.min(...others) : 0) + delay(ch);
  }
};
function hurt(t, d) { // dano em HP: enche Limite, acorda, avisa queda
  const was = t.hp > 0;
  t.hp = Math.max(0, t.hp - d);
  addLimit(t, Math.ceil(100 * d / (t.hpMax || 1)));
  delete t.st.sleep; delete t.st.frozen;
  if (t.boss && !t.rage && t.hp > 0 && t.hp <= t.hpMax / 2) { // fúria: buffs, Limite cheio e dois lacaios do mesmo elemento
    t.rage = true; t.st.atkUp = t.st.agiUp = 99; t.limit = 100;
    const el = t.resist.find(e => e !== 'fis') || 'fis', ref = partyRef();
    if (S.battle.active && t.id in S.battle.ticks) for (let i = 0; i < 2; i++) { const mn = spawn(genFoe(el, pick(Object.keys(ROLES)), 'lacaio', ref), 'normal', t.x ?? 0, t.y ?? 0); derive(mn); mn.hp = mn.hpMax; S.battle.ticks[mn.id] = S.battle.ticks[t.id] + delay(mn); }
    return ` ${t.name} entra em fúria e invoca lacaios!`;
  }
  if (!was || t.hp) return '';
  if (!t.enemy) { t.dying = 3; t.fell = true; }
  Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && o !== t && o.enemy === t.enemy).forEach(o => addLimit(o, 25));
  return ` ${t.name} caiu!`;
}
function endTurn(id, ct = 100) { // ct: custo de tempo da ação em %
  const a = S.chars[id];
  tickSt(a); S.battle.ticks[id] += Math.round(delay(a) * (ct || 100) / 100);
  for (let i = 0; i < 30; i++) { // início do turno do próximo: regen de Aura, dano contínuo, perda de turno
    const n = S.chars[current()];
    if (!n) return;
    if (n.hp <= 0) { // contagem de morte
      n.dying = (n.dying ?? 3) - 1;
      if (n.dying <= 0) { n.dead = true; n.fell = true; delete n.dying; delete S.battle.ticks[n.id]; log(n.name, 'não resistiu e morreu.', 'bad'); }
      else { log(n.name, `está caído: ${n.dying} turno(s) até a morte`, 'bad'); S.battle.ticks[n.id] += delay(n); }
      continue;
    }
    n.aura = Math.min(n.auraMax, n.aura + Math.max(1, Math.round(n.auraMax / 10)));
    const dots = DOT.filter(k => n.st[k]).length;
    if (dots) {
      const d = dots * Math.max(1, Math.round(n.hpMax / 20));
      log(n.name, `sofre ${d} de dano contínuo.${hurt(n, d)}`, 'bad', { fx: { id: n.id, dmg: d } });
      if (!n.hp) { S.battle.ticks[n.id] += delay(n); continue; }
    }
    const skip = n.st.stun ? 'atordoado' : n.st.frozen ? 'congelado' : n.st.sleep ? 'dormindo' : n.st.para && d100() <= 50 ? 'paralisado' : '';
    if (!skip) return;
    log(n.name, `está ${skip} e perde o turno`, 'bad'); n.imm = 3;
    tickSt(n); S.battle.ticks[n.id] += delay(n);
  }
}

function strike(a, s, t, aim, bonus = 0) {
  const stat = at(a, s.attr) - sanPen(a), stTxt = s.st ? ` [${STN[s.st]}]` : '';
  if (s.kind === 'heal') {
    const v = Math.max(1, Math.round((s.power + Math.floor(stat / R.healDiv)) * (t.st.curse ? .5 : 1)));
    t.hp = Math.min(t.hpMax, t.hp + v); delete t.dying; healBody(t, v);
    if (s.st) applySt(t, s.st);
    log(a.name, `${s.name} → ${t.name}: cura ${v} HP${stTxt}`, 'ok', { fx: { id: t.id, heal: v, a: a.id, s: s.name, el: s.el } });
    return false;
  }
  const chance = int(stat + R.hit - Math.floor(at(t, 'AGI') / 2) - (a.st.fear ? 20 : 0) - (a.st.curse ? 10 : 0) + (t.st.marked ? 20 : 0) - (aim ? BODY[aim][2] : 0) + bonus, 5, 95), r = d100();
  if (r > chance) {
    if (r >= 96) addLimit(a, 20);
    log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${r >= 96 ? 'DESASTRE' : 'errou'}`, 'bad', { d: r, rr: { l: s.name, t: chance, res: r >= 96 ? 'DESASTRE' : 'Errou', c: a.id, atk: 1 }, fx: { id: t.id, miss: 1, a: a.id, s: s.name, el: s.el } });
    return false;
  }
  const wk = !!aim && t.weakPart === aim; // ponto fraco do chefe: dano dobrado
  const crit = r <= Math.max(1, Math.floor(chance / 10)), mental = s.kind === 'mental', w = t.weak.includes(s.el), rs = t.resist.includes(s.el) || t.vinc.includes(s.el) || eq(t, 'acess')?.el === s.el, down = w && !t.st.down;
  const mult = (crit ? 2 : 1) * (w ? 1.5 : 1) * (rs ? .5 : 1) * (a.st.atkUp ? 1.25 : 1) * (a.st.atkDn ? .75 : 1) * (a.st.fury ? 1.25 : 1) * (t.st.defUp ? .75 : 1) * (t.st.defDn ? 1.25 : 1) * (t.st.down ? 1.25 : 1) * (t.st.frozen ? 1.25 : 1) * (wk ? 2 : 1);
  const d = Math.max(1, Math.round((s.power + Math.floor(stat / R.dmgDiv) - (mental ? 0 : Math.round((t.armor + (eq(t, 'armadura')?.power || 0)) * (1 - Math.min(1, Math.max(0, s.pierce || 0)))))) * mult));
  a.marks[s.attr] = true;
  let extra = '';
  let part = '';
  if (mental) t.san = Math.max(0, t.san - d);
  else { // localiza o golpe: parte mirada ou sorteio ponderado
    let roll = Math.random() * 100;
    part = aim || PARTS.find(k => (roll -= BODY[k][3]) < 0) || 'torso';
    const was = lvl(t, part);
    t.body[part] = (t.body[part] || 0) + d;
    extra = hurt(t, d);
    if (t.hp > 0 && was < 2 && lvl(t, part) === 2) { applySt(t, BODY[part][1]); extra += ` ${PL[part]} em estado crítico!`; }
  }
  if (wk) extra = ' PONTO FRACO!' + extra;
  if (t.hp > 0) { if (s.st) applySt(t, s.st); if (down) t.st.down = 1; }
  log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${crit ? 'CRÍTICO! ' : ''}${d} de dano${mental ? ' mental' : ` (${PL[part]})`}${w ? ' (fraqueza)' : rs ? ' (resistiu)' : ''}${stTxt}.${extra}`, 'ok', { d: r, rr: { l: s.name, t: chance, res: crit ? 'CRÍTICO' : 'Acertou', c: a.id, atk: 1 }, fx: { id: t.id, dmg: d, crit, el: s.el, a: a.id, s: s.name, w } });
  return down;
}
const newChar = (id, enemy, owner) => ({ id, name: enemy ? 'Inimigo' : 'Herói', owner, enemy, scene: S.scene,
  color: enemy ? '#e60012' : '#00b7ff', img: '', attrs: Object.fromEntries(ATTRS.map(a => [a, enemy ? R.enemyAttr : 40])), marks: {}, hp: 999, aura: 999, san: 999,
  limit: 0, xp: 0, gold: 0, x: 0, y: 0, ...structuredClone(EXTRA), xpR: enemy ? R.enemyXp : 0, goldR: enemy ? 10 : 0, arma: 8, armor: 0, weak: [], resist: [], skills: [], st: {}, inv: {}, equip: {} });
// monta um modelo de inimigo a partir das tabelas de content.js (skills por nome ou por filtro)
const makeFoe = (name, color, attrs, weak, resist, skills, o = {}) => {
  const ids = typeof skills === 'function' ? Object.keys(S.skills).filter(k => skills(S.skills[k])) : skills.map(n => Object.keys(S.skills).find(k => S.skills[k].name === n)).filter(Boolean);
  const ch = { ...newChar('', true, ''), name, color, weak, resist, skills: ids, ...o }; Object.assign(ch.attrs, attrs); return ch;
};
const loadScenes = () => SCENES.forEach(sc => { S.scenes[rid()] = newScene(sc.name, { bg: sc.bg, note: sc.note, shop: { open: false, stock: sc.stock.map(n => Object.keys(S.items).find(k => S.items[k].name === n)).filter(Boolean) } }); });
const loadBestiary = () => { S.bestiary = Object.fromEntries(buildBestiary(makeFoe).map(ch => { const id = rid(); return [id, { ...ch, id }]; })); };
// o mestre também edita os modelos do bestiário com as mesmas ações de ficha
// passivas aplicam o bônus de forma permanente; sg = -1 desfaz (quando o mestre tira a skill)
const passive = (ch, s, sg) => {
  if (s.kind !== 'passive') return;
  if (s.pas === 'res') { if (sg > 0) { if (!ch.resist.includes(s.el)) ch.resist.push(s.el); ch.weak = ch.weak.filter(e => e !== s.el); } else ch.resist = ch.resist.filter(e => e !== s.el); }
  else if (ATTRS.includes(s.pas)) ch.attrs[s.pas] = int(ch.attrs[s.pas] + sg * s.power, 1, 100);
  else { ch.bon[s.pas] += sg * s.power; ch[s.pas.slice(0, -3)] = Math.max(0, ch[s.pas.slice(0, -3)] + sg * s.power); }
};
const getCh = (c, id) => S.chars[id] || (c.role === 'gm' && Object.hasOwn(S.bestiary, id) ? S.bestiary[id] : undefined);
const spot = k => { const sc = scene(), C = Math.ceil(sc.cols), Rw = Math.ceil(sc.rows); return [Math.min(C - 1, Math.floor(C * .7) + k % 3), Math.min(Rw - 1, 1 + Math.floor(k / 3) % Math.max(1, Rw - 1))]; }; // espalha inimigos novos no lado direito
// ----- gerador de inimigos sob medida para o grupo -----
// referência do grupo: quantos heróis estão na cena e o "poder" deles (média dos três maiores atributos de cada um)
const partyRef = () => {
  const pcs = Object.values(S.chars).filter(c => !c.enemy && !c.dead && c.scene === S.scene), top3 = c => ATTRS.map(a => at0(c, a)).sort((x, y) => y - x).slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  return { n: pcs.length || 4, p: pcs.length ? Math.round(pcs.reduce((a, c) => a + top3(c), 0) / pcs.length) : 58 };
};
function genFoe(el, role, rank, ref = partyRef()) {
  const K = R.rank[rank], [m1, m2] = ROLES[role], ch = newChar('', true, ''), up = Math.max(0, ref.p - 58) * (rank === 'chefe' ? R.rank.chefe.g : 1), P = ref.p + up * R.grow.attr, pool = Object.entries(S.skills).filter(([, s]) => s.el === el && s.kind !== 'passive' && !s.req && !s.back && (!s.limit || rank === 'chefe'));
  const use = {}; pool.forEach(([, s]) => use[s.attr] = (use[s.attr] || 0) + 1);
  const elAttr = Object.keys(use).sort((a, b) => use[b] - use[a])[0]; // atributo que as skills do elemento mais usam
  for (const a of ATTRS) ch.attrs[a] = int(P + K.d - (a === m1 ? 0 : a === m2 ? 6 : a === elAttr ? (role === 'bruto' || role === 'agil' ? 10 : 2) : 18), 15, 95);
  ch.bon.hpMax = Math.round(rank === 'chefe' ? (K.hpPer + up * R.grow.hp * .5) * ref.n * (ref.n / 4) : K.hp + up * R.grow.hp);
  ch.arma = int(8 + (ref.p - 45) / 4 + up * R.grow.arma + ({ lacaio: -2, comum: 0, elite: 2, chefe: R.rank.chefe.arma - 8 })[rank] + (role === 'bruto' ? 2 : 0), 4, 40); ch.armor = Math.round((role === 'bruto' ? (rank === 'lacaio' ? 1 : 3) : rank === 'chefe' ? 2 : 0) + up * R.grow.armor);
  // skills conforme o papel: suporte prefere cura e buffs, ágil prefere as rápidas, os demais as de dano; sempre das mais simples para as mais caras
  const pri = ([, s]) => (role === 'suporte' ? (s.kind === 'heal' ? 0 : 2) : role === 'agil' ? ((s.ct || 100) < 100 ? 0 : 1) : s.kind === 'heal' ? 3 : 0) * 1000 + s.xp + (s.limit ? -500 : 0);
  ch.skills = pool.sort((a, b) => pri(a) - pri(b)).slice(0, K.sk).map(([k]) => k);
  if (role === 'bruto' || role === 'agil') { const basic = Object.keys(S.skills).find(k => S.skills[k].name === (role === 'bruto' ? 'Golpe Pesado' : 'Tiro Certeiro')); if (basic && !ch.skills.includes(basic)) ch.skills[Math.max(0, ch.skills.length - 1)] = basic; }
  Object.assign(ch, { name: el === 'fis' ? ({ bruto: 'Capanga', agil: 'Batedor', conjurador: 'Ocultista', suporte: 'Capelão' })[role] : `${ROLE_N[role]} de ${VN[el]}`, color: ELCOL[el], resist: el === 'fis' ? [] : [el], weak: FOIL[el] ? [FOIL[el]] : [],
    cat: rank === 'chefe' ? 'chefe' : el === 'fis' ? 'humano' : 'demonio', xpR: K.xp, goldR: K.xp * 2, rank, role });
  if (rank === 'chefe') Object.assign(ch, { boss: true, weakPart: pick(PARTS), name: `Senhor ${el === 'fis' ? 'da Guerra' : 'de ' + VN[el]}`, gmNote: 'Chefe gerado para o grupo. Age duas vezes por rodada, resiste a controle, invoca lacaios em fúria.' });
  else if (rank !== 'comum') ch.name += ` (${rank})`;
  if (ch.weakPart) ch.gmNote += ` Ponto fraco: ${PL[ch.weakPart]}.`;
  ch.tpl = ch.name;
  return ch;
}
// chefes do bestiário são reescalados para o grupo: atributos proporcionais e HP por herói
const fitBoss = (ch, ref = partyRef()) => { const up = Math.max(0, ref.p - 58) * R.rank.chefe.g, P = ref.p + up * R.grow.attr + R.rank.chefe.tpl, f = (P + R.rank.chefe.d) / Math.max(...ATTRS.map(a => ch.attrs[a])); for (const a of ATTRS) ch.attrs[a] = int(ch.attrs[a] * f, 15, 95); ch.attrs.FOR = Math.max(ch.attrs.FOR, int(P + R.rank.chefe.d - 6, 15, 95)); const T = ch.tune || {}; // ajuste fino por chefe, medido no simulador
  ch.bon.hpMax = Math.round((R.rank.chefe.hpPer + up * R.grow.hp * .5) * ref.n * (ref.n / 4) * (T.hp || 1)); ch.bon.sanMax = 60;
  ch.arma = int(R.rank.chefe.arma + (ref.p - 45) / 4 + up * R.grow.arma + (T.arma || 0), 4, 40); ch.armor = Math.round(2 + up * R.grow.armor);
  const cap = 20 + up * 2.5; ch.skills = ch.skills.filter(k => S.skills[k] && (S.skills[k].limit || S.skills[k].xp <= cap)); }; // só as skills do estágio do grupo
function spawn(tpl, tier = 'normal', x = 0, y = 0) { // cria um inimigo a partir de um modelo, no nível de ameaça pedido
  const id = rid(), ch = S.chars[id] = { ...structuredClone(tpl), id, x, y, scene: S.scene, tpl: tpl.tpl || tpl.name }, [k, rw] = TIER[tier] || TIER.normal;
  if (k !== 1) { for (const a of ATTRS) ch.attrs[a] = int(ch.attrs[a] * k, 1, 100); ch.xpR = Math.round(ch.xpR * rw); ch.goldR = Math.round(ch.goldR * rw); ch.name += ` (${tier})`; }
  ch.hp = ch.aura = ch.san = 999;
  return ch;
}
const wtype = ch => eq(ch, 'arma')?.wt || 'punho'; // sem arma equipada luta com os punhos

export { pick, d100, rid, int, okUrl, can, scene, eq, at0, lvl, at, healBody, BASE, derive, evolveCh, sanPen, delay, nextOf, current, order, onMap, applySt, tickSt, addLimit, prep, reseat, hurt, endTurn, strike, newChar, makeFoe, loadScenes, loadBestiary, passive, getCh, spot, partyRef, genFoe, fitBoss, spawn, wtype };

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { buildSkills, buildItems, buildBestiary } from './content.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(dir, 'public'), DATA = process.env.VJ_DATA || path.join(dir, 'data'), UP = path.join(DATA, 'uploads');
const PORT = process.env.PORT || 3000;
const KEY = process.env.GM_KEY || 'mestre';
const FILE = path.join(DATA, 'state.json'), VEND = path.join(dir, 'node_modules', 'three', 'build');
const GM = '@gm'; // destinatário "mestre" em entradas privadas do log
const IMG = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', ...Object.fromEntries(Object.entries(IMG).map(([m, e]) => [e, m])) };

// ---------- regras ----------
// Números de balanceamento (ajustados com tools/sim.js). VJ_RULES='{"hit":50}' sobrescreve para testar.
const R = { hit: 60, dmgDiv: 10, healDiv: 5, hpCon: 2, hpBase: 10, enemyAttr: 50, enemyXp: 10, aiFocus: .5, ...JSON.parse(process.env.VJ_RULES || '{}') };
const ATTRS = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'];
const EL = ['fis', 'kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'radiacao'];
const KINDS = ['dmg', 'mental', 'heal', 'passive'];
const DOT = ['burn', 'bleed', 'poison', 'rad'];
const STK = [...DOT, 'down', 'stun', 'sleep', 'para', 'silence', 'atkUp', 'atkDn', 'defUp', 'defDn', 'agiUp', 'agiDn', 'fear', 'fury', 'confuse'];
const STN = { down: 'Derrubado', burn: 'Queimadura', bleed: 'Sangramento', poison: 'Veneno', rad: 'Radiação', stun: 'Atordoado', sleep: 'Sono', para: 'Paralisia', silence: 'Silêncio', atkUp: 'ATQ↑', atkDn: 'ATQ↓', defUp: 'DEF↑', defDn: 'DEF↓', agiUp: 'AGI↑', agiDn: 'AGI↓', fear: 'Medo', fury: 'Fúria', confuse: 'Confusão' };
const ITYPES = ['cons', 'arma', 'armadura', 'acess'], WT = ['', 'lamina', 'lanca', 'fogo', 'punho'], EFF = ['hp', 'aura', 'san', 'cure', 'body', 'rev', 'bomb'];
const PER = { Atletismo: ['FOR', 'CON'], Furtividade: ['DES', 'AGI'], Ladinagem: ['DES', 'INT'], Percepção: ['SAB', 'INT'], Sobrevivência: ['SAB', 'CON'], Medicina: ['INT', 'SAB'], Conhecimento: ['INT', 'INT'], Persuasão: ['CAR', 'SAB'], Intimidação: ['CAR', 'FOR'], Sorte: ['SOR', 'SOR'] };
// partes do corpo: atributos penalizados (−10 cada enquanto crítica), status ao ficar crítica, penalidade para mirar, peso no sorteio
const BODY = { head: [['INT', 'SAB'], 'stun', 30, 6], torso: [['CON'], 'bleed', 0, 40], armL: [['FOR', 'DES'], 'atkDn', 15, 15], armR: [['FOR', 'DES'], 'atkDn', 15, 15], legL: [['AGI'], 'agiDn', 15, 12], legR: [['AGI'], 'agiDn', 15, 12] };
const PARTS = Object.keys(BODY), PL = { head: 'cabeça', torso: 'torso', armL: 'braço esq.', armR: 'braço dir.', legL: 'perna esq.', legR: 'perna dir.' };
const CAMP = ['vigiar', 'cozinhar', 'conversar', 'treinar', 'meditar'];
const GMF = new Set(['arma', 'armor', 'gold', 'xpR', 'goldR']); // campos numéricos que só o mestre altera
const EXTRA = { body: {}, bon: { hpMax: 0, auraMax: 0, sanMax: 0 }, per: {}, bio: '', gmNote: '', xpR: 0, goldR: 0 };
const sk = (name, kind, attr, el, power, cost, gx, gy, o = {}) => ({ name, kind, attr, el, power, cost, res: 'aura', st: '', xp: 10, gx, gy, limit: false, area: false, ct: 100, pas: 'hpMax', req: '', back: '', ...o });
const it = (name, type, power, o = {}) => ({ name, type, power, eff: 'hp', attr: 'SOR', wt: '', el: '', price: 10, ...o });
const NEW = { skills: () => sk('Nova skill', 'dmg', 'FOR', 'fis', 10, 5, 0, 0), items: () => it('Novo item', 'cons', 10) };
const SCH = {
  skills: { name: 's', kind: KINDS, attr: ATTRS, el: EL, res: ['aura', 'san'], st: ['', ...STK], power: 'n', cost: 'n', xp: 'n', ct: 'n', gx: 'g', gy: 'g', limit: 'b', area: 'b', pas: ['hpMax', 'auraMax', 'sanMax', 'res', ...ATTRS], req: WT, back: ['', ...STK] },
  items: { name: 's', type: ITYPES, eff: EFF, attr: ATTRS, wt: WT, el: ['', ...EL], power: 'n', price: 'n' },
};
// ---------- estado ----------
let S = { chars: {}, battle: { active: false, ticks: {} }, log: [] }, fresh = true;
try { S = JSON.parse(fs.readFileSync(FILE)); fresh = false; } catch {}
const newScene = (name, o = {}) => ({ name, cols: 20, rows: 12, bg: '', fogOn: false, seen: {}, ...o });
if (!S.scenes) { S.scenes = { a: newScene('Cena 1', S.map) }; S.scene = 'a'; delete S.map; }
S.skills ??= buildSkills(sk);
S.items ??= buildItems(it);
for (const s of Object.values(S.skills)) { s.req ??= ''; s.back ??= ''; }
for (const i of Object.values(S.items)) { i.wt ??= ''; i.el ??= ''; }
Object.assign(S, { camp: { open: false, acts: {} }, seq: 0, users: {}, bestiary: {}, shop: { open: false, stock: [] }, ...S });
for (const ch of Object.values(S.chars)) Object.assign(ch, { scene: S.scene, ...structuredClone(EXTRA), arma: 8, armor: 0, weak: [], resist: [], skills: [], st: {}, inv: {}, equip: {}, gold: 0, img: '', ...ch });

// ---------- http ----------
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    const ext = IMG[req.headers['content-type']], chunks = []; let n = 0;
    if (!ext) return res.writeHead(415).end();
    req.on('data', d => { if ((n += d.length) > 5e6) { res.writeHead(413).end(); req.destroy(); } else chunks.push(d); });
    req.on('end', () => {
      if (res.writableEnded) return;
      const name = crypto.randomBytes(8).toString('hex') + ext;
      fs.mkdirSync(UP, { recursive: true }); fs.writeFileSync(path.join(UP, name), Buffer.concat(chunks));
      res.writeHead(200).end('/uploads/' + name);
    });
    return;
  }
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return res.writeHead(400).end(); }
  if (p === '/') p = '/index.html';
  if (!path.extname(p)) p += '.html';
  let root = p.startsWith('/uploads/') ? DATA : PUB;
  if (p.startsWith('/vendor/')) { root = VEND; p = p.slice(7); }
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(f, (e, d) => {
    if (e) return res.writeHead(404).end('404');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }).end(d);
  });
});
const wss = new WebSocketServer({ server, maxPayload: 65536 });

// ---------- utilidades ----------
let saveT;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(S)); }, 300); };
const strip = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, note: undefined, gmNote: undefined }]));
// cada cliente só recebe o que pode ver (sussurros, rolagens secretas e notas do mestre ficam de fora)
// jogadores e mesa não recebem os números dos inimigos (HP vira %), nem inimigos fora da cena ou sob a névoa
const scrub = ch => { const k = 100 / (ch.hpMax || 1); return { id: ch.id, name: ch.name, enemy: true, owner: '', color: ch.color, img: ch.img, x: ch.x, y: ch.y, scene: ch.scene, st: ch.st, dead: ch.dead, hp: Math.ceil(ch.hp * k), hpMax: 100,
  body: Object.fromEntries(PARTS.map(p => [p, (ch.body[p] || 0) * k])), attrs: Object.fromEntries(ATTRS.map(a => [a, 0])), aura: 0, auraMax: 1, san: 1, sanMax: 1, limit: 0, xp: 0, gold: 0, skills: [], inv: {}, equip: {}, weak: [], resist: [], marks: {}, per: {}, bon: {} }; };
const hiddenFoe = ch => !(ch.id in S.battle.ticks) && (ch.x == null || ch.scene !== S.scene || (scene().fogOn && !scene().seen[ch.x + ',' + ch.y]));
const pubChars = () => Object.fromEntries(Object.values(S.chars).filter(ch => !ch.enemy || !hiddenFoe(ch)).map(ch => [ch.id, ch.enemy ? scrub(ch) : { ...ch, gmNote: undefined }]));
const view = c => c.role === 'gm' ? { ...S, users: undefined } : { ...S, users: undefined, bestiary: undefined, scenes: strip(S.scenes), chars: pubChars(),
  log: S.log.filter(e => !e.to || (c.name && (e.to === c.name || e.from === c.name))) };
const sendState = c => c.readyState === 1 && c.send(JSON.stringify({ t: 'state', s: view(c) }));
const push = () => { Object.values(S.chars).forEach(derive); S.battle.order = S.battle.active ? order() : []; wss.clients.forEach(sendState); save(); };
const log = (who, text, kind = '', x = {}) => { S.log.push({ n: ++S.seq, who, text, kind, ...x }); if (S.log.length > 150) S.log.shift(); };
const hash = (pw, salt = crypto.randomBytes(8).toString('hex')) => salt + ':' + crypto.scryptSync(String(pw), salt, 32).toString('hex');
const pick = a => a[Math.floor(Math.random() * a.length)];
const d100 = () => 1 + Math.floor(Math.random() * 100);
const rid = () => crypto.randomBytes(4).toString('hex');
const int = (v, lo = 0, hi = 9999) => Math.min(hi, Math.max(lo, Math.round(+v) || 0));
const okUrl = v => /^(https?:\/\/[^\s'"()<>]+|\/uploads\/[\w.]+)$/.test(v);
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
const delay = ch => Math.round(1000 / Math.max(1, at(ch, 'AGI') * (ch.st.agiUp ? 1.25 : 1) * (ch.st.agiDn ? .75 : 1)));
// heróis caídos continuam na fila: o "turno" deles conta para a morte
const nextOf = T => Object.keys(T).filter(k => { const ch = S.chars[k]; return ch && !ch.dead && (ch.hp > 0 || !ch.enemy); }).sort((a, b) => T[a] - T[b] || a.localeCompare(b))[0];
const current = () => nextOf(S.battle.ticks);
const order = () => { const T = { ...S.battle.ticks }, out = []; for (let i = 0; i < 8; i++) { const id = nextOf(T); if (!id) break; out.push(id); T[id] += delay(S.chars[id]); } return out; }; // próximos turnos previstos
const onMap = ch => ch.x != null && ch.scene === S.scene;
const tickSt = ch => { for (const k in ch.st) if (--ch.st[k] <= 0) delete ch.st[k]; };
const addLimit = (ch, v) => ch.limit = Math.min(100, ch.limit + v);

function hurt(t, d) { // dano em HP: enche Limite, acorda, avisa queda
  const was = t.hp > 0;
  t.hp = Math.max(0, t.hp - d);
  addLimit(t, Math.ceil(100 * d / (t.hpMax || 1)));
  delete t.st.sleep;
  if (t.boss && !t.rage && t.hp > 0 && t.hp <= t.hpMax / 2) { t.rage = true; t.st.atkUp = t.st.agiUp = 99; t.limit = 100; return ` ${t.name} entra em fúria!`; }
  if (!was || t.hp) return '';
  if (!t.enemy) t.dying = 3;
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
      if (n.dying <= 0) { n.dead = true; delete n.dying; delete S.battle.ticks[n.id]; log(n.name, 'não resistiu e morreu.', 'bad'); }
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
    const skip = n.st.stun ? 'atordoado' : n.st.sleep ? 'dormindo' : n.st.para && d100() <= 50 ? 'paralisado' : '';
    if (!skip) return;
    log(n.name, `está ${skip} e perde o turno`, 'bad');
    tickSt(n); S.battle.ticks[n.id] += delay(n);
  }
}

function strike(a, s, t, aim) {
  const stat = at(a, s.attr) - sanPen(a), stTxt = s.st ? ` [${STN[s.st]}]` : '';
  if (s.kind === 'heal') {
    const v = Math.max(1, s.power + Math.floor(stat / R.healDiv));
    t.hp = Math.min(t.hpMax, t.hp + v); delete t.dying; healBody(t, v);
    if (s.st) t.st[s.st] = 3;
    log(a.name, `${s.name} → ${t.name}: cura ${v} HP${stTxt}`, 'ok', { fx: { id: t.id, heal: v } });
    return false;
  }
  const chance = int(stat + R.hit - Math.floor(at(t, 'AGI') / 2) - (a.st.fear ? 20 : 0) - (aim ? BODY[aim][2] : 0), 5, 95), r = d100();
  if (r > chance) {
    if (r >= 96) addLimit(a, 20);
    log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${r >= 96 ? 'DESASTRE' : 'errou'}`, 'bad', { d: r, fx: { id: t.id, miss: 1 } });
    return false;
  }
  const crit = r <= Math.max(1, Math.floor(chance / 10)), mental = s.kind === 'mental', w = t.weak.includes(s.el), rs = t.resist.includes(s.el) || eq(t, 'acess')?.el === s.el, down = w && !t.st.down;
  const mult = (crit ? 2 : 1) * (w ? 1.5 : 1) * (rs ? .5 : 1) * (a.st.atkUp ? 1.25 : 1) * (a.st.atkDn ? .75 : 1) * (a.st.fury ? 1.25 : 1) * (t.st.defUp ? .75 : 1) * (t.st.defDn ? 1.25 : 1) * (t.st.down ? 1.25 : 1);
  const d = Math.max(1, Math.round((s.power + Math.floor(stat / R.dmgDiv) - (mental ? 0 : t.armor + (eq(t, 'armadura')?.power || 0))) * mult));
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
    if (t.hp > 0 && was < 2 && lvl(t, part) === 2) { t.st[BODY[part][1]] = 3; extra += ` ${PL[part]} em estado crítico!`; }
  }
  if (t.hp > 0) { if (s.st) t.st[s.st] = 3; if (down) t.st.down = 1; }
  log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${crit ? 'CRÍTICO! ' : ''}${d} de dano${mental ? ' mental' : ` (${PL[part]})`}${w ? ' (fraqueza)' : rs ? ' (resistiu)' : ''}${stTxt}.${extra}`, 'ok', { d: r, fx: { id: t.id, dmg: d, crit, el: s.el } });
  return down;
}

const undoStack = [], NOUNDO = new Set(['undo', 'chat', 'fog', 'move', 'roll']);
const newChar = (id, enemy, owner) => ({ id, name: enemy ? 'Inimigo' : 'Herói', owner, enemy, scene: S.scene,
  color: enemy ? '#e60012' : '#00b7ff', img: '', attrs: Object.fromEntries(ATTRS.map(a => [a, enemy ? R.enemyAttr : 40])), marks: {}, hp: 999, aura: 999, san: 999,
  limit: 0, xp: 0, gold: 0, x: 0, y: 0, ...structuredClone(EXTRA), xpR: enemy ? R.enemyXp : 0, goldR: enemy ? 10 : 0, arma: 8, armor: 0, weak: [], resist: [], skills: [], st: {}, inv: {}, equip: {} });
const TIER = { fraco: [.8, .6], normal: [1, 1], elite: [1.25, 1.6] }; // multiplicadores de atributos e de recompensa
// monta um modelo de inimigo a partir das tabelas de content.js (skills por nome ou por filtro)
const makeFoe = (name, color, attrs, weak, resist, skills, o = {}) => {
  const ids = typeof skills === 'function' ? Object.keys(S.skills).filter(k => skills(S.skills[k])) : skills.map(n => Object.keys(S.skills).find(k => S.skills[k].name === n)).filter(Boolean);
  const ch = { ...newChar('', true, ''), name, color, weak, resist, skills: ids, ...o }; Object.assign(ch.attrs, attrs); return ch;
};
const loadBestiary = () => { S.bestiary = Object.fromEntries(buildBestiary(makeFoe).map(ch => [rid(), ch])); };
if (fresh) loadBestiary();
const wtype = ch => eq(ch, 'arma')?.wt || 'punho'; // sem arma equipada luta com os punhos
const NUM = { xpR: 1, goldR: 1, arma: 1, armor: 1, gold: 1, hp: 1, aura: 1, san: 1, x: 1, y: 1 };
const H = {
  addChar(c, m) {
    if (c.role !== 'gm' && c.role !== 'player') return;
    const enemy = c.role === 'gm' && !!m.enemy, id = rid();
    S.chars[id] = newChar(id, enemy, enemy ? '' : (c.role === 'gm' ? String(m.owner || '').trim().slice(0, 30) : c.name));
  },
  undo(c) { // desfaz a última ação do mestre (até 20)
    if (c.role !== 'gm' || !undoStack.length) return;
    const prev = JSON.parse(undoStack.pop()), keep = { log: S.log, users: S.users, seq: S.seq };
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, prev, keep);
    log('Mestre', 'desfez a última ação.');
  },
  delChar(c, m) { if (c.role === 'gm') { delete S.chars[m.id]; delete S.battle.ticks[m.id]; } },
  set(c, m) {
    const ch = S.chars[m.id], f = String(m.f);
    if (!can(c, ch)) return;
    const g = c.role === 'gm';
    if (f.startsWith('attrs.')) { if (g && ATTRS.includes(f.slice(6))) ch.attrs[f.slice(6)] = int(m.v, 1, 100); } // o mestre define os atributos
    else if (f.startsWith('bon.')) { if (g && Object.hasOwn(BASE, f.slice(4))) ch.bon[f.slice(4)] = int(m.v, -999, 999); }
    else if (GMF.has(f) && !g) return;
    else if (f === 'limit') ch.limit = int(m.v, 0, 100);
    else if (NUM[f]) { ch[f] = int(m.v); if (f === 'hp' && ch.hp > 0) { delete ch.dead; delete ch.dying; } }
    else if (f === 'name') ch.name = String(m.v).slice(0, 30) || '?';
    else if (f === 'color' && /^#[0-9a-f]{6}$/i.test(m.v)) ch.color = m.v;
    else if (f === 'img') ch.img = okUrl(m.v) ? m.v : '';
    else if (f === 'xp' && c.role === 'gm') ch.xp = int(m.v);
    else if (f === 'bio') ch.bio = String(m.v).slice(0, 3000);
    else if (f === 'gmNote' && c.role === 'gm') ch.gmNote = String(m.v).slice(0, 3000);
    else if (f.startsWith('per.') && Object.hasOwn(PER, f.slice(4))) ch.per[f.slice(4)] = int(m.v, 0, 60);
  },
  move(c, m) { const ch = S.chars[m.id]; if (can(c, ch)) { ch.x = int(m.x, 0, scene().cols - 1); ch.y = int(m.y, 0, scene().rows - 1); } },
  place(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch) { ch.x = ch.y = onMap(ch) ? null : 0; ch.scene = S.scene; } },
  roll(c, m) {
    const ch = S.chars[m.id];
    const per = Object.hasOwn(PER, m.per) ? PER[m.per] : null;
    if (!can(c, ch) || (!per && !ATTRS.includes(m.attr))) return;
    const base = per ? Math.round((at(ch, per[0]) + at(ch, per[1])) / 2) + (ch.per[m.per] || 0) : at(ch, m.attr);
    const target = int(base + int(m.mod, -100, 100) - sanPen(ch), 1, 95), r = d100();
    const res = r <= Math.max(1, Math.floor(target / 10)) ? 'CRÍTICO' : r <= target ? 'Sucesso' : r >= 96 ? 'DESASTRE' : 'Falha';
    if (r <= target) (per || [m.attr]).forEach(a => ch.marks[a] = true); // atributo usado com sucesso pode evoluir
    log(ch.name, `${per ? m.per : m.attr} ${target}% → ${r}: ${res}`, r <= target ? 'ok' : 'bad', { d: r, ...(c.role === 'gm' && m.secret ? { to: GM } : {}) });
  },
  evolve(c, m) {
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch) return;
    const up = evolveCh(ch);
    log(ch.name, up.length ? `evoluiu ${up.join(', ')} (+1)` : 'não evoluiu desta vez', 'ok');
  },
  horror(c, m) {
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch) return;
    const target = int(at(ch, 'SAB') - sanPen(ch), 1, 95), r = d100(), loss = int(m.loss, 1, 99);
    if (r > target) ch.san = Math.max(0, ch.san - loss);
    log(ch.name, `Teste de horror SAB ${target}% → ${r}: ${r > target ? `perdeu ${loss} de Sanidade` : 'resistiu'}`, r > target ? 'bad' : 'ok', { d: r });
  },
  aff(c, m) { // cicla normal → fraqueza → resistência
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch || !EL.includes(m.el)) return;
    if (ch.weak.includes(m.el)) { ch.weak = ch.weak.filter(e => e !== m.el); ch.resist.push(m.el); }
    else if (ch.resist.includes(m.el)) ch.resist = ch.resist.filter(e => e !== m.el);
    else ch.weak.push(m.el);
  },
  part(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch && PARTS.includes(m.k)) ch.body[m.k] = lvl(ch, m.k) ? 0 : Math.ceil(ch.hpMax * .3); }, // mestre cura ou fere uma parte
  st(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch && STK.includes(m.k)) { if (ch.st[m.k]) delete ch.st[m.k]; else ch.st[m.k] = 3; } },
  // ----- cenas -----
  map(c, m) {
    const sc = scene();
    if (c.role !== 'gm') return;
    if (m.f === 'cols' || m.f === 'rows') sc[m.f] = int(m.v, 4, 60);
    if (m.f === 'bg') sc.bg = okUrl(m.v) ? m.v : '';
    if (m.f === 'name') sc.name = String(m.v).slice(0, 30) || '?';
    if (m.f === 'fogOn') sc.fogOn = !!m.v;
    if (m.f === 'note') sc.note = String(m.v).slice(0, 3000);
  },
  fog(c, m) { // pincel 3x3
    if (c.role !== 'gm') return;
    const sc = scene();
    for (let x = int(m.x) - 1; x <= int(m.x) + 1; x++) for (let y = int(m.y) - 1; y <= int(m.y) + 1; y++)
      if (x >= 0 && y >= 0 && x < sc.cols && y < sc.rows) { if (m.hide) delete sc.seen[x + ',' + y]; else sc.seen[x + ',' + y] = 1; }
  },
  sceneAdd(c) { if (c.role === 'gm') { const id = rid(); S.scenes[id] = newScene('Cena ' + (Object.keys(S.scenes).length + 1)); H.sceneGo(c, { id }); } },
  sceneGo(c, m) { if (c.role === 'gm' && Object.hasOwn(S.scenes, m.id)) { S.scene = m.id; Object.values(S.chars).filter(ch => !ch.enemy).forEach(ch => ch.scene = m.id); } }, // heróis acompanham a cena; inimigos ficam na deles
  sceneDel(c) { if (c.role === 'gm' && Object.keys(S.scenes).length > 1) { delete S.scenes[S.scene]; H.sceneGo(c, { id: Object.keys(S.scenes)[0] }); } },
  // ----- batalha -----
  battle(c, m) {
    if (c.role !== 'gm') return;
    const all = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(Boolean), dead = all.filter(o => o.enemy && o.hp <= 0), pcs = all.filter(o => !o.enemy);
    all.forEach(o => { o.st = {}; delete o.dying; });
    if (!m.on && m.win && pcs.length && dead.length) { // recompensas divididas entre os heróis
      const sum = f => Math.floor(dead.reduce((a, o) => a + o[f], 0) / pcs.length), xp = sum('xpR'), gold = sum('goldR'), drops = [];
      pcs.forEach(p => { p.xp += xp; p.gold += gold; });
      dead.forEach(d => {
        for (const [k, q] of Object.entries(d.inv)) if (S.items[k]) { const p = pick(pcs); p.inv[k] = (p.inv[k] || 0) + q; drops.push(`${S.items[k].name} → ${p.name}`); }
        d.inv = {}; d.equip = {}; d.x = d.y = null;
      });
      log('Mestre', `Vitória! +${xp} XP e +${gold} de ouro para cada herói.${drops.length ? ' Espólios: ' + drops.join(', ') : ''}`, 'ok');
    }
    S.battle = { active: !!m.on, ticks: {} };
    if (m.on) Object.values(S.chars).filter(ch => onMap(ch) && ch.hp > 0 && !ch.dead).forEach(ch => S.battle.ticks[ch.id] = delay(ch));
    log('Mestre', m.on ? 'Batalha iniciada!' : 'Batalha encerrada.');
  },
  ai(c) { // IA simples: 70% usa uma skill disponível; cura o aliado mais ferido, ataca um oponente aleatório
    const a = S.chars[current()];
    if (c.role !== 'gm' || !S.battle.active || !a?.enemy) return;
    const alive = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o?.hp > 0), foes = alive.filter(o => o.enemy !== a.enemy);
    const usable = a.st.silence || a.st.fury ? [] : a.skills.filter(k => { const s = S.skills[k]; return s && s.kind !== 'passive' && (!s.req || s.req === wtype(a)) && a[s.res] >= s.cost && (!s.limit || a.limit >= 100); });
    const lim = usable.find(k => S.skills[k].limit); // Limite carregado tem prioridade
    const skill = lim || (usable.length && Math.random() < .7 ? pick(usable) : 'atk'), heal = S.skills[skill]?.kind === 'heal';
    const t = heal ? alive.filter(o => o.enemy === a.enemy).sort((x, y) => x.hp / x.hpMax - y.hp / y.hpMax)[0] : Math.random() < R.aiFocus ? foes.sort((x, y) => x.hp - y.hp)[0] : pick(foes); // às vezes foca o oponente mais ferido
    if (t) H.act(c, { id: a.id, skill, target: t.id }); else endTurn(a.id);
  },
  ini(c, m) { // mestre ajusta a fila: adiantar, atrasar, tirar ou incluir na batalha
    const ch = S.chars[m.id], T = S.battle.ticks;
    if (c.role !== 'gm' || !S.battle.active || !ch) return;
    if (m.k === 'in') { if (!(ch.id in T) && ch.hp > 0) T[ch.id] = Math.max(0, ...Object.values(T)) + 1; }
    else if (!(ch.id in T)) return;
    else if (m.k === 'out') delete T[ch.id];
    else T[ch.id] = Math.max(0, T[ch.id] + (m.k === 'up' ? -1 : 1) * Math.ceil(delay(ch) / 2));
  },
  next(c) { const id = current(); if (S.battle.active && id && can(c, S.chars[id])) endTurn(id, 50); }, // passar custa metade do tempo
  act(c, m) {
    const a = S.chars[current()], t0 = S.chars[m.target];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || !t0 || !(t0.id in S.battle.ticks)) return;
    const basic = m.skill === 'atk';
    const wp = eq(a, 'arma');
    const s = basic ? { name: 'Ataque', kind: 'dmg', attr: wp?.wt === 'fogo' ? 'DES' : 'FOR', el: wp?.el || 'fis', power: wp?.power ?? a.arma, cost: 0, res: 'aura' } : a.skills.includes(m.skill) && S.skills[m.skill];
    if (!s || s.kind === 'passive' || (s.req && s.req !== wtype(a)) || a[s.res] < s.cost || (s.limit && a.limit < 100) || (!basic && (a.st.silence || a.st.fury))) return;
    a[s.res] -= s.cost;
    if (s.limit) a.limit = 0;
    const inB = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && !o.dead), heal = s.kind === 'heal';
    const ts = s.area ? inB.filter(o => o.enemy === t0.enemy && (o.hp > 0 || heal)) : [a.st.confuse ? pick(inB.filter(o => o.hp > 0)) : t0];
    let more = false;
    const aim = !s.area && !heal && PARTS.includes(m.aim) ? m.aim : null;
    for (const t of ts) if (!t.dead) more = strike(a, s, t, aim) || more;
    if (s.back && a.hp > 0) { a.st[s.back] = 3; log(a.name, `paga o preço do poder proibido [${STN[s.back]}]`, 'bad'); }
    if (more && a.hp > 0) log(a.name, 'acertou a fraqueza — MAIS UM turno!', 'ok'); else endTurn(a.id, s.ct);
  },
  learn(c, m) {
    const ch = S.chars[m.id], s = S.skills[m.skill];
    if (!can(c, ch) || !s || ch.skills.includes(m.skill) || ch.xp < s.xp) return;
    if (ch.skills.length && !ch.skills.some(k => S.skills[k] && Math.max(Math.abs(S.skills[k].gx - s.gx), Math.abs(S.skills[k].gy - s.gy)) <= 1)) return;
    ch.xp -= s.xp; ch.skills.push(m.skill);
    if (s.kind === 'passive') { // passivas aplicam o bônus de forma permanente
      if (s.pas === 'res') { if (!ch.resist.includes(s.el)) ch.resist.push(s.el); ch.weak = ch.weak.filter(e => e !== s.el); }
      else if (ATTRS.includes(s.pas)) ch.attrs[s.pas] = Math.min(100, ch.attrs[s.pas] + s.power);
      else { ch.bon[s.pas] += s.power; ch[s.pas.slice(0, -3)] += s.power; }
    }
    log(ch.name, `aprendeu ${s.name}`, 'ok');
  },
  // ----- itens -----
  give(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch && Object.hasOwn(S.items, m.item)) ch.inv[m.item] = (ch.inv[m.item] || 0) + 1; },
  drop(c, m) {
    const ch = S.chars[m.id];
    if (!can(c, ch) || !(ch.inv[m.item] > 0)) return;
    if (--ch.inv[m.item] <= 0) { delete ch.inv[m.item]; for (const k in ch.equip) if (ch.equip[k] === m.item) delete ch.equip[k]; }
  },
  equip(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || !i || i.type === 'cons' || !(ch.inv[m.item] > 0)) return;
    if (ch.equip[i.type] === m.item) delete ch.equip[i.type]; else ch.equip[i.type] = m.item;
  },
  use(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || i?.type !== 'cons' || !(ch.inv[m.item] > 0)) return;
    const inB = S.battle.active && ch.id in S.battle.ticks;
    if (inB && current() !== ch.id) return;
    const t = inB && S.chars[m.target] && m.target in S.battle.ticks ? S.chars[m.target] : ch;
    if (t.dead || (i.eff === 'bomb' && (!inB || t === ch)) || (i.eff === 'rev' && t.hp > 0) || (t.hp <= 0 && !['rev', 'hp'].includes(i.eff))) return;
    let txt = `+${i.power} ${i.eff.toUpperCase()}`, fx;
    if (i.eff === 'bomb') { // bomba: dano fixo do elemento, sem rolagem
      const d = Math.max(1, Math.round(i.power * (t.weak.includes(i.el) ? 1.5 : 1) * (t.resist.includes(i.el) ? .5 : 1)));
      txt = `${d} de dano${hurt(t, d)}`; fx = { fx: { id: t.id, dmg: d, el: i.el } };
    } else if (i.eff === 'cure') { for (const k of Object.keys(t.st)) if (!k.endsWith('Up')) delete t.st[k]; txt = 'condições removidas'; }
    else if (i.eff === 'body') { healBody(t, i.power); txt = 'ferimentos tratados'; }
    else if (i.eff === 'rev') { t.hp = Math.min(t.hpMax, i.power); delete t.dying; txt = 'de volta à luta'; }
    else { if (i.eff === 'hp') { delete t.dying; healBody(t, i.power); } t[i.eff] = Math.min(t[i.eff + 'Max'], t[i.eff] + i.power); }
    H.drop(c, m);
    log(ch.name, `usou ${i.name}${t === ch ? '' : ' em ' + t.name} (${txt})`, 'ok', fx);
    if (inB) endTurn(ch.id);
  },
  // ----- descanso e acampamento -----
  camp(c, m) { if (c.role === 'gm') S.camp = { open: !!m.on, acts: {} }; },
  campAct(c, m) { const ch = S.chars[m.id]; if (S.camp.open && can(c, ch) && !ch.enemy && CAMP.includes(m.k)) S.camp.acts[m.id] = m.k; },
  rest(c, m) { // Sanidade não volta com descanso: só itens, skills, "conversar" no acampamento ou o mestre
    if (c.role !== 'gm' || S.battle.active) return;
    const pcs = Object.values(S.chars).filter(o => !o.enemy && !o.dead), long = !!m.long, notes = [];
    for (const p of pcs) {
      p.aura = p.auraMax; p.hp = long ? p.hpMax : Math.min(p.hpMax, p.hp + Math.ceil(p.hpMax / 2)); delete p.dying;
      for (const k of PARTS) p.body[k] = long ? 0 : Math.floor((p.body[k] || 0) / 2);
      if (long) { p.st = {}; const up = evolveCh(p); if (up.length) notes.push(`${p.name} evoluiu ${up.join(', ')}`); }
    }
    if (long && S.camp.open) {
      for (const [id, k] of Object.entries(S.camp.acts)) {
        const p = S.chars[id];
        if (!p) continue;
        if (k === 'vigiar') p.st.agiUp = 3; else if (k === 'cozinhar') pcs.forEach(o => o.st.atkUp = 3); else if (k === 'conversar') p.san = Math.min(p.sanMax, p.san + 5);
        else if (k === 'treinar') p.xp += 5; else addLimit(p, 30);
        notes.push(`${p.name}: ${k}`);
      }
      S.camp = { open: false, acts: {} };
    }
    log('Mestre', `${long ? 'Descanso longo: HP e Aura restaurados, condições removidas.' : 'Descanso curto: metade do HP e toda a Aura.'} ${notes.join(' · ')}`, 'ok');
  },
  // ----- loja -----
  shop(c, m) {
    if (c.role !== 'gm') return;
    if (m.f === 'open') S.shop.open = !!m.v;
    else if (Object.hasOwn(S.items, m.item)) S.shop.stock = S.shop.stock.includes(m.item) ? S.shop.stock.filter(k => k !== m.item) : [...S.shop.stock, m.item];
  },
  buy(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || !S.shop.open || !i || !S.shop.stock.includes(m.item) || ch.gold < i.price) return;
    ch.gold -= i.price; ch.inv[m.item] = (ch.inv[m.item] || 0) + 1;
    log(ch.name, `comprou ${i.name} por ${i.price}`, 'ok');
  },
  sell(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || !S.shop.open || !i || !(ch.inv[m.item] > 0)) return;
    ch.gold += Math.floor(i.price / 2); H.drop(c, m);
    log(ch.name, `vendeu ${i.name} por ${Math.floor(i.price / 2)}`, 'ok');
  },
  // ----- bestiário -----
  bSave(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch) S.bestiary[rid()] = structuredClone({ ...ch, st: {}, marks: {} }); },
  bSpawn(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(S.bestiary, m.id)) return;
    const id = rid(), ch = S.chars[id] = { ...structuredClone(S.bestiary[m.id]), id, x: 0, y: 0, scene: S.scene }, [k, rw] = TIER[m.tier] || TIER.normal;
    if (k !== 1) { for (const a of ATTRS) ch.attrs[a] = int(ch.attrs[a] * k, 1, 100); ch.xpR = Math.round(ch.xpR * rw); ch.goldR = Math.round(ch.goldR * rw); ch.name += ` (${m.tier})`; }
    ch.hp = ch.aura = ch.san = 999;
  },
  content(c, m) { // restaura o conteúdo padrão de uma coleção (skills aprendidas e itens dos personagens são limpos se a coleção mudar)
    if (c.role !== 'gm') return;
    if (m.coll === 'skills') { S.skills = buildSkills(sk); Object.values(S.chars).forEach(ch => ch.skills = []); }
    else if (m.coll === 'items') { S.items = buildItems(it); Object.values(S.chars).forEach(ch => { ch.inv = {}; ch.equip = {}; }); S.shop.stock = []; }
    else if (m.coll === 'bestiary') loadBestiary();
    log('Mestre', `restaurou o conteúdo padrão (${m.coll}).`);
  },
  bDel(c, m) { if (c.role === 'gm') delete S.bestiary[m.id]; },
  // ----- chat: texto livre, /r XdY+Z, /w nome mensagem -----
  chat(c, m) {
    if (c.role === 'table') return;
    const who = c.role === 'gm' ? 'Mestre' : c.name, me = c.role === 'gm' ? GM : c.name, text = String(m.text || '').trim().slice(0, 300), priv = c.role === 'gm' && m.secret ? { to: GM } : {};
    let mm;
    if (!text) return;
    if ((mm = text.match(/^\/r\s+(\d{0,2})d(\d{1,3})\s*([+-]\s*\d{1,3})?$/i))) {
      const n = int(mm[1] || 1, 1, 20), f = int(mm[2], 2, 100), b = int((mm[3] || '0').replace(/\s/g, ''), -999, 999), rs = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * f));
      log(who, `rolou ${n}d${f}${b ? (b > 0 ? '+' : '') + b : ''}: [${rs.join(', ')}] = ${rs.reduce((a, x) => a + x, b)}`, 'ok', priv);
    } else if ((mm = text.match(/^\/w\s+(\S+)\s+(.+)/i))) log(who, `(sussurro → ${mm[1]}) ${mm[2]}`, 'chat', { to: /^mestre$/i.test(mm[1]) ? GM : mm[1], from: me });
    else log(who, text, 'chat');
  },
  // ----- editores do mestre (skills / itens) -----
  edAdd(c, m) { if (c.role === 'gm' && Object.hasOwn(NEW, m.coll)) S[m.coll][rid()] = NEW[m.coll](); },
  edDel(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(NEW, m.coll)) return;
    delete S[m.coll][m.id];
    for (const ch of Object.values(S.chars)) {
      if (m.coll === 'skills') ch.skills = ch.skills.filter(k => k !== m.id);
      else { delete ch.inv[m.id]; for (const k in ch.equip) if (ch.equip[k] === m.id) delete ch.equip[k]; }
    }
  },
  edSet(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(SCH, m.coll) || !Object.hasOwn(SCH[m.coll], m.f) || !Object.hasOwn(S[m.coll], m.id)) return;
    const o = S[m.coll][m.id], r = SCH[m.coll][m.f], v = m.v;
    o[m.f] = r === 's' ? String(v).slice(0, 40) || '?' : r === 'n' ? int(v, 0, 999) : r === 'g' ? int(v, 0, 16) : r === 'b' ? !!v : r.includes(v) ? v : o[m.f];
  },
};

wss.on('connection', c => {
  c.role = 'table';
  c.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      if (m.role === 'gm') { if (m.key !== KEY) return c.send(JSON.stringify({ t: 'err', bad: true, msg: 'Chave do mestre incorreta.' })); c.role = 'gm'; }
      else if (m.role === 'player') {
        const name = String(m.name || '').trim().slice(0, 30), u = S.users[name], bad = msg => c.send(JSON.stringify({ t: 'err', bad: true, msg }));
        if (!name || /[@\s]/.test(name)) return bad('Nome inválido (sem espaços ou @).');
        if (String(m.pass || '').length < 3) return bad('Senha precisa de pelo menos 3 caracteres.');
        if (!Object.hasOwn(S.users, name)) { S.users[name] = hash(m.pass); save(); } // primeiro acesso registra a senha
        else if (!crypto.timingSafeEqual(Buffer.from(hash(m.pass, u.split(':')[0])), Buffer.from(u))) return bad('Senha incorreta para este nome.');
        c.role = 'player'; c.name = name;
      }
      return sendState(c);
    }
    if (m.t === 'ping') { // marcação temporária no mapa: só retransmite, não altera o estado
      if (c.role === 'table') return;
      const p = JSON.stringify({ t: 'ping', x: int(m.x, 0, 99), y: int(m.y, 0, 99) });
      return wss.clients.forEach(o => o.readyState === 1 && o.send(p));
    }
    if (c.role === 'gm' && Object.hasOwn(H, m.t) && !NOUNDO.has(m.t)) { undoStack.push(JSON.stringify({ ...S, log: undefined, users: undefined })); if (undoStack.length > 20) undoStack.shift(); }
    if (Object.hasOwn(H, m.t)) { try { H[m.t](c, m); } catch (e) { console.error(e); } push(); }
  });
});
export { H, S, R, current, derive };
export { view, order };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!fresh) { // cópia de segurança do estado a cada início (mantém as 10 mais recentes)
    const bk = path.join(DATA, 'backups'); fs.mkdirSync(bk, { recursive: true });
    fs.copyFileSync(FILE, path.join(bk, `state-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
    fs.readdirSync(bk).sort().slice(0, -10).forEach(f => fs.unlinkSync(path.join(bk, f)));
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(PORT, () => console.log(`virtualJRPG em http://localhost:${PORT}  (chave do mestre: ${KEY})`));

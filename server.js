import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(dir, 'public'), DATA = path.join(dir, 'data'), UP = path.join(DATA, 'uploads');
const PORT = process.env.PORT || 3000;
const KEY = process.env.GM_KEY || 'mestre';
const FILE = path.join(DATA, 'state.json');
const IMG = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', ...Object.fromEntries(Object.entries(IMG).map(([m, e]) => [e, m])) };

// ---------- regras ----------
const ATTRS = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'];
const EL = ['fis', 'kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'radiacao'];
const KINDS = ['dmg', 'mental', 'heal'];
const DOT = ['burn', 'bleed', 'poison', 'rad'];
const STK = [...DOT, 'stun', 'sleep', 'para', 'silence', 'atkUp', 'atkDn', 'defUp', 'defDn', 'agiUp', 'agiDn', 'fear', 'fury', 'confuse'];
const ITYPES = ['cons', 'arma', 'armadura', 'acess'];
const sk = (name, kind, attr, el, power, cost, gx, gy, o = {}) => ({ name, kind, attr, el, power, cost, res: 'aura', st: '', xp: 10, gx, gy, limit: false, ...o });
const it = (name, type, power, o = {}) => ({ name, type, power, eff: 'hp', attr: 'SOR', price: 10, ...o });
const NEW = { skills: () => sk('Nova skill', 'dmg', 'FOR', 'fis', 10, 5, 0, 0), items: () => it('Novo item', 'cons', 10) };
const SCH = {
  skills: { name: 's', kind: KINDS, attr: ATTRS, el: EL, res: ['aura', 'san'], st: ['', ...STK], power: 'n', cost: 'n', xp: 'n', gx: 'g', gy: 'g', limit: 'b' },
  items: { name: 's', type: ITYPES, eff: ['hp', 'aura', 'san'], attr: ATTRS, power: 'n', price: 'n' },
};
const CATALOG = [
  sk('Golpe Pesado', 'dmg', 'FOR', 'fis', 14, 4, 2, 2, { st: 'stun' }), sk('Lâmina de Kagutsuchi', 'dmg', 'FOR', 'kagutsuchi', 14, 6, 3, 2, { st: 'burn' }),
  sk('Chama', 'dmg', 'INT', 'kagutsuchi', 12, 5, 4, 2, { st: 'burn' }), sk('Maré de Susanoo', 'dmg', 'INT', 'susanoo', 12, 5, 4, 1, { st: 'agiDn' }),
  sk('Punho de Atlas', 'dmg', 'FOR', 'atlas', 16, 7, 2, 3, { st: 'defDn' }), sk('Raio de Indra', 'dmg', 'INT', 'indra', 16, 7, 4, 3, { st: 'para' }),
  sk('Corte de Fuhaku', 'dmg', 'DES', 'fuhaku', 12, 5, 1, 2, { st: 'bleed' }), sk('Bênção de Amaterasu', 'heal', 'SAB', 'amaterasu', 15, 6, 2, 1, { st: 'defUp' }),
  sk('Véu de Tsukuyomi', 'mental', 'INT', 'tsukuyomi', 10, 6, 3, 3, { st: 'fear' }), sk('Pacto de Shukketsu', 'dmg', 'INT', 'shukketsu', 24, 8, 3, 4, { res: 'san', xp: 20, st: 'bleed' }),
  sk('Fissão de Hiruko', 'dmg', 'INT', 'radiacao', 22, 10, 5, 2, { xp: 20, st: 'rad' }), sk('Golpe Limite', 'dmg', 'FOR', 'fis', 40, 0, 3, 1, { limit: true, xp: 20 }),
];
const ITEMS = [it('Poção', 'cons', 20), it('Éter de Aura', 'cons', 15, { eff: 'aura' }), it('Calmante', 'cons', 10, { eff: 'san' }),
  it('Espada de Ferro', 'arma', 12, { price: 50 }), it('Cota de Couro', 'armadura', 3, { price: 40 }), it('Amuleto da Sorte', 'acess', 10, { price: 60 })];

// ---------- estado ----------
let S = { chars: {}, battle: { active: false, ticks: {} }, log: [] };
try { S = JSON.parse(fs.readFileSync(FILE)); } catch {}
const newScene = (name, o = {}) => ({ name, cols: 20, rows: 12, bg: '', fogOn: false, seen: {}, ...o });
if (!S.scenes) { S.scenes = { a: newScene('Cena 1', S.map) }; S.scene = 'a'; delete S.map; }
S.skills ??= Object.fromEntries(CATALOG.map((s, i) => ['s' + i, s]));
S.items ??= Object.fromEntries(ITEMS.map((s, i) => ['i' + i, s]));
for (const ch of Object.values(S.chars)) Object.assign(ch, { arma: 8, armor: 0, weak: [], resist: [], skills: [], st: {}, inv: {}, equip: {}, gold: 0, img: '', ...ch });

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
  const root = p.startsWith('/uploads/') ? DATA : PUB, f = path.join(root, path.normalize(p));
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
const push = () => { const m = JSON.stringify({ t: 'state', s: S }); wss.clients.forEach(c => c.readyState === 1 && c.send(m)); save(); };
const log = (who, text, kind = '') => { S.log.push({ who, text, kind, ts: Date.now() }); if (S.log.length > 100) S.log.shift(); };
const d100 = () => 1 + Math.floor(Math.random() * 100);
const rid = () => crypto.randomBytes(4).toString('hex');
const int = (v, lo = 0, hi = 9999) => Math.min(hi, Math.max(lo, Math.round(+v) || 0));
const okUrl = v => /^(https?:\/\/[^\s'"()<>]+|\/uploads\/[\w.]+)$/.test(v);
const can = (c, ch) => ch && (c.role === 'gm' || (c.role === 'player' && ch.owner === c.name));
const scene = () => S.scenes[S.scene];
const eq = (ch, slot) => S.items[ch.equip[slot]];
const at = (ch, a) => ch.attrs[a] + (eq(ch, 'acess')?.attr === a ? eq(ch, 'acess').power : 0);
const sanPen = ch => { const p = ch.san / (ch.sanMax || 1); return p <= 0 ? 30 : p <= .25 ? 20 : p <= .5 ? 10 : 0; };
// CTB: quanto maior a AGI, menor o intervalo entre turnos
const delay = ch => Math.round(1000 / Math.max(1, at(ch, 'AGI') * (ch.st.agiUp ? 1.25 : 1) * (ch.st.agiDn ? .75 : 1)));
const current = () => Object.keys(S.battle.ticks).filter(k => S.chars[k]?.hp > 0).sort((a, b) => S.battle.ticks[a] - S.battle.ticks[b] || a.localeCompare(b))[0];
const tickSt = ch => { for (const k in ch.st) if (--ch.st[k] <= 0) delete ch.st[k]; };
const addLimit = (ch, v) => ch.limit = Math.min(100, ch.limit + v);

function hurt(t, d) { // dano em HP: enche Limite, acorda, avisa queda
  const was = t.hp > 0;
  t.hp = Math.max(0, t.hp - d);
  addLimit(t, Math.ceil(100 * d / (t.hpMax || 1)));
  delete t.st.sleep;
  if (!was || t.hp) return '';
  Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && o !== t && o.enemy === t.enemy).forEach(o => addLimit(o, 25));
  return ` ${t.name} caiu!`;
}
function endTurn(id) {
  const a = S.chars[id];
  tickSt(a); S.battle.ticks[id] += delay(a);
  for (let i = 0; i < 30; i++) { // início do turno do próximo: regen de Aura, dano contínuo, perda de turno
    const n = S.chars[current()];
    if (!n) return;
    n.aura = Math.min(n.auraMax, n.aura + Math.max(1, Math.round(n.auraMax / 10)));
    const dots = DOT.filter(k => n.st[k]).length;
    if (dots) {
      const d = dots * Math.max(1, Math.round(n.hpMax / 20));
      log(n.name, `sofre ${d} de dano contínuo.${hurt(n, d)}`, 'bad');
      if (!n.hp) continue;
    }
    const skip = n.st.stun ? 'atordoado' : n.st.sleep ? 'dormindo' : n.st.para && d100() <= 50 ? 'paralisado' : '';
    if (!skip) return;
    log(n.name, `está ${skip} e perde o turno`, 'bad');
    tickSt(n); S.battle.ticks[n.id] += delay(n);
  }
}

const NUM = { arma: 1, armor: 1, gold: 1, hp: 1, hpMax: 1, aura: 1, auraMax: 1, san: 1, sanMax: 1, x: 1, y: 1 };
const H = {
  addChar(c, m) {
    if (c.role !== 'gm' && c.role !== 'player') return;
    const enemy = c.role === 'gm' && !!m.enemy, id = rid();
    S.chars[id] = { id, name: enemy ? 'Inimigo' : 'Herói', owner: enemy ? '' : (c.role === 'gm' ? String(m.owner || '').slice(0, 30) : c.name), enemy,
      color: enemy ? '#e60012' : '#00b7ff', img: '', attrs: Object.fromEntries(ATTRS.map(a => [a, 40])), marks: {}, hp: 30, hpMax: 30, aura: 20, auraMax: 20, san: 40, sanMax: 40,
      limit: 0, xp: 0, gold: 0, x: 0, y: 0, arma: 8, armor: 0, weak: [], resist: [], skills: [], st: {}, inv: {}, equip: {} };
  },
  delChar(c, m) { if (c.role === 'gm') { delete S.chars[m.id]; delete S.battle.ticks[m.id]; } },
  set(c, m) {
    const ch = S.chars[m.id], f = String(m.f);
    if (!can(c, ch)) return;
    if (f.startsWith('attrs.') && ATTRS.includes(f.slice(6))) ch.attrs[f.slice(6)] = int(m.v, 1, 100);
    else if (f === 'limit') ch.limit = int(m.v, 0, 100);
    else if (NUM[f]) ch[f] = int(m.v);
    else if (f === 'name') ch.name = String(m.v).slice(0, 30) || '?';
    else if (f === 'color' && /^#[0-9a-f]{6}$/i.test(m.v)) ch.color = m.v;
    else if (f === 'img') ch.img = okUrl(m.v) ? m.v : '';
    else if (f === 'xp' && c.role === 'gm') ch.xp = int(m.v);
  },
  move(c, m) { const ch = S.chars[m.id]; if (can(c, ch)) { ch.x = int(m.x, 0, scene().cols - 1); ch.y = int(m.y, 0, scene().rows - 1); } },
  place(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch) ch.x = ch.y = ch.x == null ? 0 : null; },
  roll(c, m) {
    const ch = S.chars[m.id];
    if (!can(c, ch) || !ATTRS.includes(m.attr)) return;
    const target = int(at(ch, m.attr) + int(m.mod, -100, 100) - sanPen(ch), 1, 95), r = d100();
    const res = r <= Math.max(1, Math.floor(target / 10)) ? 'CRÍTICO' : r <= target ? 'Sucesso' : r >= 96 ? 'DESASTRE' : 'Falha';
    if (r <= target) ch.marks[m.attr] = true; // atributo usado com sucesso pode evoluir
    log(ch.name, `${m.attr} ${target}% → ${r}: ${res}`, r <= target ? 'ok' : 'bad');
  },
  evolve(c, m) {
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch) return;
    const up = Object.keys(ch.marks).filter(a => d100() > ch.attrs[a] && ch.attrs[a] < 100);
    up.forEach(a => ch.attrs[a]++);
    ch.marks = {};
    log(ch.name, up.length ? `evoluiu ${up.join(', ')} (+1)` : 'não evoluiu desta vez', 'ok');
  },
  horror(c, m) {
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch) return;
    const target = int(at(ch, 'SAB') - sanPen(ch), 1, 95), r = d100(), loss = int(m.loss, 1, 99);
    if (r > target) ch.san = Math.max(0, ch.san - loss);
    log(ch.name, `Teste de horror SAB ${target}% → ${r}: ${r > target ? `perdeu ${loss} de Sanidade` : 'resistiu'}`, r > target ? 'bad' : 'ok');
  },
  aff(c, m) { // cicla normal → fraqueza → resistência
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch || !EL.includes(m.el)) return;
    if (ch.weak.includes(m.el)) { ch.weak = ch.weak.filter(e => e !== m.el); ch.resist.push(m.el); }
    else if (ch.resist.includes(m.el)) ch.resist = ch.resist.filter(e => e !== m.el);
    else ch.weak.push(m.el);
  },
  st(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch && STK.includes(m.k)) { if (ch.st[m.k]) delete ch.st[m.k]; else ch.st[m.k] = 3; } },
  // ----- cenas -----
  map(c, m) {
    const sc = scene();
    if (c.role !== 'gm') return;
    if (m.f === 'cols' || m.f === 'rows') sc[m.f] = int(m.v, 4, 60);
    if (m.f === 'bg') sc.bg = okUrl(m.v) ? m.v : '';
    if (m.f === 'name') sc.name = String(m.v).slice(0, 30) || '?';
    if (m.f === 'fogOn') sc.fogOn = !!m.v;
  },
  fog(c, m) { // pincel 3x3
    if (c.role !== 'gm') return;
    const sc = scene();
    for (let x = int(m.x) - 1; x <= int(m.x) + 1; x++) for (let y = int(m.y) - 1; y <= int(m.y) + 1; y++)
      if (x >= 0 && y >= 0 && x < sc.cols && y < sc.rows) { if (m.hide) delete sc.seen[x + ',' + y]; else sc.seen[x + ',' + y] = 1; }
  },
  sceneAdd(c) { if (c.role === 'gm') { const id = rid(); S.scenes[id] = newScene('Cena ' + (Object.keys(S.scenes).length + 1)); S.scene = id; } },
  sceneGo(c, m) { if (c.role === 'gm' && Object.hasOwn(S.scenes, m.id)) S.scene = m.id; },
  sceneDel(c) { if (c.role === 'gm' && Object.keys(S.scenes).length > 1) { delete S.scenes[S.scene]; S.scene = Object.keys(S.scenes)[0]; } },
  // ----- batalha -----
  battle(c, m) {
    if (c.role !== 'gm') return;
    S.battle = { active: !!m.on, ticks: {} };
    if (m.on) Object.values(S.chars).filter(ch => ch.x != null).forEach(ch => S.battle.ticks[ch.id] = delay(ch));
    log('Mestre', m.on ? 'Batalha iniciada!' : 'Batalha encerrada.');
  },
  next(c) { const id = current(); if (S.battle.active && id && can(c, S.chars[id])) endTurn(id); },
  act(c, m) {
    const a = S.chars[current()];
    let t = S.chars[m.target];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || !t || !(t.id in S.battle.ticks)) return;
    const basic = m.skill === 'atk';
    const s = basic ? { name: 'Ataque', kind: 'dmg', attr: 'FOR', el: 'fis', power: eq(a, 'arma')?.power ?? a.arma, cost: 0, res: 'aura' } : a.skills.includes(m.skill) && S.skills[m.skill];
    if (!s || a[s.res] < s.cost || (s.limit && a.limit < 100) || (!basic && (a.st.silence || a.st.fury))) return;
    a[s.res] -= s.cost;
    if (s.limit) a.limit = 0;
    if (a.st.confuse) { const all = Object.keys(S.battle.ticks).filter(k => S.chars[k]?.hp > 0); t = S.chars[all[Math.floor(Math.random() * all.length)]]; }
    const stat = at(a, s.attr) - sanPen(a), stTxt = s.st ? ` [${s.st}]` : '';
    if (s.kind === 'heal') {
      const v = Math.max(1, s.power + Math.floor(stat / 5));
      t.hp = Math.min(t.hpMax, t.hp + v);
      if (s.st) t.st[s.st] = 3;
      log(a.name, `${s.name} → ${t.name}: cura ${v} HP${stTxt}`, 'ok');
    } else {
      const chance = int(stat + 30 - Math.floor(at(t, 'AGI') / 2) - (a.st.fear ? 20 : 0), 5, 95), r = d100();
      if (r > chance) {
        if (r >= 96) addLimit(a, 20);
        log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${r >= 96 ? 'DESASTRE' : 'errou'}`, 'bad');
      } else {
        const crit = r <= Math.max(1, Math.floor(chance / 10)), mental = s.kind === 'mental';
        const w = t.weak.includes(s.el), rs = t.resist.includes(s.el);
        const mult = (crit ? 2 : 1) * (w ? 1.5 : 1) * (rs ? .5 : 1) * (a.st.atkUp ? 1.25 : 1) * (a.st.atkDn ? .75 : 1) * (a.st.fury ? 1.25 : 1) * (t.st.defUp ? .75 : 1) * (t.st.defDn ? 1.25 : 1);
        const d = Math.max(1, Math.round((s.power + Math.floor(stat / 5) - (mental ? 0 : t.armor + (eq(t, 'armadura')?.power || 0))) * mult));
        a.marks[s.attr] = true;
        let extra = '';
        if (mental) t.san = Math.max(0, t.san - d); else extra = hurt(t, d);
        if (s.st && t.hp > 0) t.st[s.st] = 3;
        log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${crit ? 'CRÍTICO! ' : ''}${d} de dano${mental ? ' mental' : ''}${w ? ' (fraqueza)' : rs ? ' (resistiu)' : ''}${stTxt}.${extra}`, 'ok');
      }
    }
    endTurn(a.id);
  },
  learn(c, m) {
    const ch = S.chars[m.id], s = S.skills[m.skill];
    if (!can(c, ch) || !s || ch.skills.includes(m.skill) || ch.xp < s.xp) return;
    if (ch.skills.length && !ch.skills.some(k => S.skills[k] && Math.max(Math.abs(S.skills[k].gx - s.gx), Math.abs(S.skills[k].gy - s.gy)) <= 1)) return;
    ch.xp -= s.xp; ch.skills.push(m.skill);
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
    t[i.eff] = Math.min(t[i.eff + 'Max'], t[i.eff] + i.power);
    H.drop(c, m);
    log(ch.name, `usou ${i.name}${t === ch ? '' : ' em ' + t.name} (+${i.power} ${i.eff.toUpperCase()})`, 'ok');
    if (inB) endTurn(ch.id);
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
    o[m.f] = r === 's' ? String(v).slice(0, 40) || '?' : r === 'n' ? int(v, 0, 999) : r === 'g' ? int(v, 0, 11) : r === 'b' ? !!v : r.includes(v) ? v : o[m.f];
  },
};

wss.on('connection', c => {
  c.role = 'table';
  c.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      if (m.role === 'gm') { if (m.key !== KEY) return c.send(JSON.stringify({ t: 'err', badKey: true, msg: 'Chave do mestre incorreta.' })); c.role = 'gm'; }
      else if (m.role === 'player') { c.role = 'player'; c.name = String(m.name || 'Jogador').slice(0, 30); }
      return c.send(JSON.stringify({ t: 'state', s: S }));
    }
    if (Object.hasOwn(H, m.t)) { try { H[m.t](c, m); } catch (e) { console.error(e); } push(); }
  });
});
server.listen(PORT, () => console.log(`virtualJRPG em http://localhost:${PORT}  (chave do mestre: ${KEY})`));

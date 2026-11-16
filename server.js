import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(dir, 'public');
const PORT = process.env.PORT || 3000;
const KEY = process.env.GM_KEY || 'mestre';
const FILE = path.join(dir, 'data', 'state.json');
const ATTRS = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const EL = ['fis', 'kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'radiacao'];
const KINDS = ['dmg', 'mental', 'heal'];
const sk = (name, kind, attr, el, power, cost, gx, gy, o = {}) => ({ name, kind, attr, el, power, cost, res: 'aura', xp: 10, gx, gy, limit: false, ...o });
const CATALOG = [
  sk('Golpe Pesado', 'dmg', 'FOR', 'fis', 14, 4, 2, 2), sk('Lâmina de Kagutsuchi', 'dmg', 'FOR', 'kagutsuchi', 14, 6, 3, 2),
  sk('Chama', 'dmg', 'INT', 'kagutsuchi', 12, 5, 4, 2), sk('Maré de Susanoo', 'dmg', 'INT', 'susanoo', 12, 5, 4, 1),
  sk('Punho de Atlas', 'dmg', 'FOR', 'atlas', 16, 7, 2, 3), sk('Raio de Indra', 'dmg', 'INT', 'indra', 16, 7, 4, 3),
  sk('Corte de Fuhaku', 'dmg', 'DES', 'fuhaku', 12, 5, 1, 2), sk('Bênção de Amaterasu', 'heal', 'SAB', 'amaterasu', 15, 6, 2, 1),
  sk('Véu de Tsukuyomi', 'mental', 'INT', 'tsukuyomi', 10, 6, 3, 3), sk('Pacto de Shukketsu', 'dmg', 'INT', 'shukketsu', 24, 8, 3, 4, { res: 'san', xp: 20 }),
  sk('Fissão', 'dmg', 'INT', 'radiacao', 22, 10, 5, 2, { xp: 20 }), sk('Golpe Limite', 'dmg', 'FOR', 'fis', 40, 0, 3, 1, { limit: true, xp: 20 }),
];
let S = { chars: {}, map: { cols: 20, rows: 12, bg: '' }, battle: { active: false, ticks: {} }, log: [] };
try { S = JSON.parse(fs.readFileSync(FILE)); } catch {}
S.skills ??= Object.fromEntries(CATALOG.map((s, i) => ['s' + i, s]));
for (const ch of Object.values(S.chars)) Object.assign(ch, { arma: 8, armor: 0, weak: [], resist: [], skills: [], ...ch });

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  if (!path.extname(p)) p += '.html';
  const f = path.join(PUB, path.normalize(p));
  if (!f.startsWith(PUB + path.sep)) return res.writeHead(403).end();
  fs.readFile(f, (e, d) => {
    if (e) return res.writeHead(404).end('404');
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(f)] || 'application/octet-stream') + '; charset=utf-8' }).end(d);
  });
});
const wss = new WebSocketServer({ server });

let saveT;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(S)); }, 300); };
const push = () => { const m = JSON.stringify({ t: 'state', s: S }); wss.clients.forEach(c => c.readyState === 1 && c.send(m)); save(); };
const log = (who, text, kind = '') => { S.log.push({ who, text, kind, ts: Date.now() }); if (S.log.length > 100) S.log.shift(); };
const d100 = () => 1 + Math.floor(Math.random() * 100);
const int = (v, lo = 0, hi = 9999) => Math.min(hi, Math.max(lo, Math.round(+v) || 0));
const can = (c, ch) => ch && (c.role === 'gm' || (c.role === 'player' && ch.owner === c.name));
// CTB: quanto maior a AGI, menor o intervalo entre turnos
const delay = ch => Math.round(1000 / Math.max(1, ch.attrs.AGI));
const sanPen = ch => { const p = ch.san / (ch.sanMax || 1); return p <= 0 ? 30 : p <= .25 ? 20 : p <= .5 ? 10 : 0; };
const endTurn = id => {
  S.battle.ticks[id] += delay(S.chars[id]);
  const n = S.chars[current()]; // Aura regenera no início do turno
  if (n) n.aura = Math.min(n.auraMax, n.aura + Math.max(1, Math.round(n.auraMax / 10)));
};
const current = () => Object.keys(S.battle.ticks).filter(k => S.chars[k]?.hp > 0).sort((a, b) => S.battle.ticks[a] - S.battle.ticks[b] || a.localeCompare(b))[0];

const NUM = { arma: 1, armor: 1, hp: 1, hpMax: 1, aura: 1, auraMax: 1, san: 1, sanMax: 1, limit: 1, x: 1, y: 1 };
const H = {
  addChar(c, m) {
    if (c.role !== 'gm' && c.role !== 'player') return;
    const enemy = c.role === 'gm' && !!m.enemy;
    const id = Math.random().toString(36).slice(2, 9);
    const attrs = Object.fromEntries(ATTRS.map(a => [a, 40]));
    S.chars[id] = { id, name: enemy ? 'Inimigo' : 'Herói', owner: enemy ? '' : (c.role === 'gm' ? String(m.owner || '').slice(0, 30) : c.name), enemy,
      color: enemy ? '#e60012' : '#00b7ff', attrs, marks: {}, hp: 30, hpMax: 30, aura: 20, auraMax: 20, san: 40, sanMax: 40, limit: 0, xp: 0, x: 0, y: 0, arma: 8, armor: 0, weak: [], resist: [], skills: [] };
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
    else if (f === 'xp' && c.role === 'gm') ch.xp = int(m.v);
  },
  move(c, m) { const ch = S.chars[m.id]; if (can(c, ch)) { ch.x = int(m.x, 0, S.map.cols - 1); ch.y = int(m.y, 0, S.map.rows - 1); } },
  place(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch) { if (ch.x == null) ch.x = ch.y = 0; else ch.x = ch.y = null; } },
  roll(c, m) {
    const ch = S.chars[m.id];
    if (!can(c, ch) || !ATTRS.includes(m.attr)) return;
    const mod = int(m.mod, -100, 100), target = int(ch.attrs[m.attr] + mod - sanPen(ch), 1, 95), r = d100();
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
  map(c, m) {
    if (c.role !== 'gm') return;
    if (m.f === 'cols') S.map.cols = int(m.v, 4, 60);
    if (m.f === 'rows') S.map.rows = int(m.v, 4, 60);
    if (m.f === 'bg') S.map.bg = /^https?:\/\/[^\s'"()<>]+$/.test(m.v) ? m.v : '';
  },
  battle(c, m) {
    if (c.role !== 'gm') return;
    S.battle = { active: !!m.on, ticks: {} };
    if (m.on) Object.values(S.chars).filter(ch => ch.x != null).forEach(ch => S.battle.ticks[ch.id] = delay(ch));
    log('Mestre', m.on ? 'Batalha iniciada!' : 'Batalha encerrada.');
  },
  next(c) {
    const id = current();
    if (!S.battle.active || !id || !can(c, S.chars[id])) return;
    endTurn(id);
  },
  act(c, m) {
    const a = S.chars[current()], t = S.chars[m.target];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || !t || !(t.id in S.battle.ticks)) return;
    const s = m.skill === 'atk' ? { name: 'Ataque', kind: 'dmg', attr: 'FOR', el: 'fis', power: a.arma, cost: 0, res: 'aura' } : a.skills.includes(m.skill) && S.skills[m.skill];
    if (!s || a[s.res] < s.cost || (s.limit && a.limit < 100)) return;
    a[s.res] -= s.cost;
    if (s.limit) a.limit = 0;
    const stat = a.attrs[s.attr] - sanPen(a);
    if (s.kind === 'heal') {
      const v = Math.max(1, s.power + Math.floor(stat / 5));
      t.hp = Math.min(t.hpMax, t.hp + v);
      log(a.name, `${s.name} → ${t.name}: cura ${v} HP`, 'ok');
    } else {
      const chance = int(stat + 30 - Math.floor(t.attrs.AGI / 2), 5, 95), r = d100();
      if (r > chance) {
        if (r >= 96) a.limit = Math.min(100, a.limit + 20);
        log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${r >= 96 ? 'DESASTRE' : 'errou'}`, 'bad');
      } else {
        const crit = r <= Math.max(1, Math.floor(chance / 10)), mental = s.kind === 'mental';
        const w = t.weak.includes(s.el), rs = t.resist.includes(s.el);
        const d = Math.max(1, Math.round((s.power + Math.floor(stat / 5) - (mental ? 0 : t.armor)) * (crit ? 2 : 1) * (w ? 1.5 : 1) * (rs ? .5 : 1)));
        a.marks[s.attr] = true;
        let extra = '';
        if (mental) t.san = Math.max(0, t.san - d);
        else {
          const was = t.hp > 0;
          t.hp = Math.max(0, t.hp - d);
          t.limit = Math.min(100, t.limit + Math.ceil(100 * d / (t.hpMax || 1)));
          if (was && !t.hp) { // aliado caiu: o lado dele ganha Limite
            extra = ` ${t.name} caiu!`;
            Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && o !== t && o.enemy === t.enemy).forEach(o => o.limit = Math.min(100, o.limit + 25));
          }
        }
        log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${crit ? 'CRÍTICO! ' : ''}${d} de dano${mental ? ' mental' : ''}${w ? ' (fraqueza)' : rs ? ' (resistiu)' : ''}.${extra}`, 'ok');
      }
    }
    endTurn(a.id);
  },
  learn(c, m) {
    const ch = S.chars[m.id], s = S.skills[m.skill];
    if (!can(c, ch) || !s || ch.skills.includes(m.skill) || ch.xp < s.xp) return;
    const adj = !ch.skills.length || ch.skills.some(k => S.skills[k] && Math.max(Math.abs(S.skills[k].gx - s.gx), Math.abs(S.skills[k].gy - s.gy)) <= 1);
    if (!adj) return;
    ch.xp -= s.xp; ch.skills.push(m.skill);
    log(ch.name, `aprendeu ${s.name}`, 'ok');
  },
  aff(c, m) { // cicla normal → fraqueza → resistência
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch || !EL.includes(m.el)) return;
    if (ch.weak.includes(m.el)) { ch.weak = ch.weak.filter(e => e !== m.el); ch.resist.push(m.el); }
    else if (ch.resist.includes(m.el)) ch.resist = ch.resist.filter(e => e !== m.el);
    else ch.weak.push(m.el);
  },
  horror(c, m) {
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch) return;
    const target = int(ch.attrs.SAB - sanPen(ch), 1, 95), r = d100(), loss = int(m.loss, 1, 99);
    if (r > target) ch.san = Math.max(0, ch.san - loss);
    log(ch.name, `Teste de horror SAB ${target}% → ${r}: ${r > target ? `perdeu ${loss} de Sanidade` : 'resistiu'}`, r > target ? 'bad' : 'ok');
  },
  skAdd(c) { if (c.role === 'gm') S.skills['s' + Math.random().toString(36).slice(2, 8)] = sk('Nova skill', 'dmg', 'FOR', 'fis', 10, 5, 0, 0); },
  skDel(c, m) { if (c.role === 'gm') { delete S.skills[m.id]; Object.values(S.chars).forEach(ch => ch.skills = ch.skills.filter(k => k !== m.id)); } },
  skSet(c, m) {
    const s = S.skills[m.id], f = m.f, v = m.v;
    if (c.role !== 'gm' || !s) return;
    if (f === 'name') s.name = String(v).slice(0, 40) || '?';
    else if (f === 'limit') s.limit = !!v;
    else if (['power', 'cost', 'xp'].includes(f)) s[f] = int(v, 0, 999);
    else if (f === 'gx' || f === 'gy') s[f] = int(v, 0, 11);
    else if ({ kind: KINDS, attr: ATTRS, el: EL, res: ['aura', 'san'] }[f]?.includes(v)) s[f] = v;
  },
};

wss.on('connection', c => {
  c.role = 'table';
  c.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'hello') {
      if (m.role === 'gm') { if (m.key !== KEY) return c.send(JSON.stringify({ t: 'err', badKey: true, msg: 'Chave do mestre incorreta.' })); c.role = 'gm'; }
      else if (m.role === 'player') { c.role = 'player'; c.name = String(m.name || 'Jogador').slice(0, 30); }
      return c.send(JSON.stringify({ t: 'state', s: S }));
    }
    if (H[m.t]) { H[m.t](c, m); push(); }
  });
});
server.listen(PORT, () => console.log(`virtualJRPG em http://localhost:${PORT}  (chave do mestre: ${KEY})`));

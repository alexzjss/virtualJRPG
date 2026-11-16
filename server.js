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

let S = { chars: {}, map: { cols: 20, rows: 12, bg: '' }, battle: { active: false, ticks: {} }, log: [] };
try { S = JSON.parse(fs.readFileSync(FILE)); } catch {}

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
const current = () => Object.keys(S.battle.ticks).filter(k => S.chars[k]).sort((a, b) => S.battle.ticks[a] - S.battle.ticks[b] || a.localeCompare(b))[0];

const NUM = { hp: 1, hpMax: 1, aura: 1, auraMax: 1, san: 1, sanMax: 1, limit: 1, x: 1, y: 1 };
const H = {
  addChar(c, m) {
    if (c.role !== 'gm' && c.role !== 'player') return;
    const enemy = c.role === 'gm' && !!m.enemy;
    const id = Math.random().toString(36).slice(2, 9);
    const attrs = Object.fromEntries(ATTRS.map(a => [a, 40]));
    S.chars[id] = { id, name: enemy ? 'Inimigo' : 'Herói', owner: enemy ? '' : (c.role === 'gm' ? String(m.owner || '').slice(0, 30) : c.name), enemy,
      color: enemy ? '#e60012' : '#00b7ff', attrs, marks: {}, hp: 30, hpMax: 30, aura: 20, auraMax: 20, san: 40, sanMax: 40, limit: 0, xp: 0, x: 0, y: 0 };
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
    const mod = int(m.mod, -100, 100), target = int(ch.attrs[m.attr] + mod, 1, 95), r = d100();
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
    S.battle.ticks[id] += delay(S.chars[id]);
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

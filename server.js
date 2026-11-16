import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { buildSkills, buildItems, buildBestiary, SCENES, VEHICLES } from './content.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(dir, 'public'), DATA = process.env.VJ_DATA || path.join(dir, 'data'), UP = path.join(DATA, 'uploads');
const PORT = process.env.PORT || 3000;
const KEY = process.env.GM_KEY || 'mestre';
const FILE = path.join(DATA, 'state.json'), VEND = path.join(dir, 'node_modules', 'three', 'build');
const GM = '@gm'; // destinatário "mestre" em entradas privadas do log
const IMG = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', ...Object.fromEntries(Object.entries(IMG).map(([m, e]) => [e, m])) };

// ---------- regras ----------
// Números de balanceamento (ajustados com tools/sim.js). VJ_RULES='{"hit":50}' sobrescreve para testar.
const R = { hit: 60, dmgDiv: 10, healDiv: 5, hpCon: 2, hpBase: 10, enemyAttr: 50, enemyXp: 10, aiFocus: .5,
  // gerador de inimigos: por patente, d = diferença do atributo principal em relação ao poder do grupo; hp = bônus de HP; sk = nº de skills; cost = peso no orçamento do encontro
  rank: { lacaio: { d: -7, hp: -25, sk: 1, xp: 5, cost: .5 }, comum: { d: 1, hp: 0, sk: 2, xp: 10, cost: 1 }, elite: { d: 7, hp: 40, sk: 4, xp: 25, cost: 2 }, chefe: { d: -8, hpPer: 34, sk: 8, xp: 80, arma: 8, tpl: -5, g: .78 } }, // tpl: desconto extra dos chefes do bestiário (têm atributos altos em tudo); g: quanto do crescimento do grupo o chefe acompanha
  diff: { facil: 1.3, normal: 1.5, dificil: 1.68, mortal: 1.86 },
  grow: { attr: .85, hp: 7, arma: .5, armor: .2 }, // quanto os inimigos gerados acompanham cada ponto de poder do grupo acima de 58 // orçamento do encontro em "inimigos comuns por herói"
  ...JSON.parse(process.env.VJ_RULES || '{}') };
const ATTRS = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'];
const EL = ['fis', 'kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'radiacao'];
const KINDS = ['dmg', 'mental', 'heal', 'passive'];
const DOT = ['burn', 'bleed', 'poison', 'rad'];
const CTRL = ['stun', 'sleep', 'para', 'frozen', 'possess', 'confuse']; // chefes só sofrem controle por 1 turno
const STK = [...DOT, 'possess', 'curse', 'frozen', 'marked', 'down', 'stun', 'sleep', 'para', 'silence', 'atkUp', 'atkDn', 'defUp', 'defDn', 'agiUp', 'agiDn', 'fear', 'fury', 'confuse'];
const VN = { kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', radiacao: 'Hiruko' };
const STN = { possess: 'Possessão', curse: 'Maldição', frozen: 'Congelado', marked: 'Marcado', down: 'Derrubado', burn: 'Queimadura', bleed: 'Sangramento', poison: 'Veneno', rad: 'Radiação', stun: 'Atordoado', sleep: 'Sono', para: 'Paralisia', silence: 'Silêncio', atkUp: 'ATQ↑', atkDn: 'ATQ↓', defUp: 'DEF↑', defDn: 'DEF↓', agiUp: 'AGI↑', agiDn: 'AGI↓', fear: 'Medo', fury: 'Fúria', confuse: 'Confusão' };
const ITYPES = ['cons', 'arma', 'armadura', 'acess', 'mat'], WT = ['', 'lamina', 'lanca', 'fogo', 'punho'], EFF = ['hp', 'aura', 'san', 'cure', 'body', 'rev', 'bomb'];
// partes do corpo: atributos penalizados (−10 cada enquanto crítica), status ao ficar crítica, penalidade para mirar, peso no sorteio
const BODY = { head: [['INT', 'SAB'], 'stun', 30, 6], torso: [['CON'], 'bleed', 0, 40], armL: [['FOR', 'DES'], 'atkDn', 15, 15], armR: [['FOR', 'DES'], 'atkDn', 15, 15], legL: [['AGI'], 'agiDn', 15, 12], legR: [['AGI'], 'agiDn', 15, 12] };
const PARTS = Object.keys(BODY), PL = { head: 'cabeça', torso: 'torso', armL: 'braço esq.', armR: 'braço dir.', legL: 'perna esq.', legR: 'perna dir.' };
const CAMP = ['vigiar', 'cozinhar', 'conversar', 'treinar', 'meditar'];
const GMF = new Set(['arma', 'armor', 'gold', 'xpR', 'goldR']); // campos numéricos que só o mestre altera
const EXTRA = { vinc: [], body: {}, bon: { hpMax: 0, auraMax: 0, sanMax: 0 }, bio: '', gmNote: '', xpR: 0, goldR: 0 };
const sk = (name, kind, attr, el, power, cost, gx, gy, o = {}) => ({ name, kind, attr, el, power, cost, res: 'aura', st: '', xp: 10, gx, gy, limit: false, area: false, ct: 100, pas: 'hpMax', req: '', back: '', ex: '', d: '', rq: null, ...o });
const it = (name, type, power, o = {}) => ({ name, type, power, eff: 'hp', attr: 'SOR', wt: '', el: '', price: 10, ...o });
const NEW = { skills: () => sk('Nova skill', 'dmg', 'FOR', 'fis', 10, 5, 0, 0), items: () => it('Novo item', 'cons', 10) };
const SCH = {
  skills: { name: 's', kind: KINDS, attr: ATTRS, el: EL, res: ['aura', 'san'], st: ['', ...STK], power: 'n', cost: 'n', xp: 'n', ct: 'n', gx: 'g', gy: 'g', limit: 'b', area: 'b', pas: ['hpMax', 'auraMax', 'sanMax', 'res', ...ATTRS], req: WT, back: ['', ...STK], ex: 't', d: 't' },
  items: { name: 's', type: ITYPES, eff: EFF, attr: ATTRS, wt: WT, el: ['', ...EL], power: 'n', price: 'n' },
};
// ---------- estado ----------
let S = { chars: {}, battle: { active: false, ticks: {} }, log: [] }, fresh = true;
try { S = JSON.parse(fs.readFileSync(FILE)); fresh = false; } catch {}
const newScene = (name, o = {}) => ({ name, cols: 20, rows: 12, ar: 20 / 12, crop: { x: 0, y: 0, w: 1, h: 1 }, ox: 0, oy: 0, cam: null, bg: '', fogOn: false, seen: {}, shop: { open: false, stock: [] }, ...o });
if (!S.scenes) { S.scenes = { a: newScene('Cena 1', S.map) }; S.scene = 'a'; delete S.map; }
{
  const built = buildSkills(sk), sig = crypto.createHash('sha1').update(JSON.stringify(built)).digest('hex');
  if (S.skills && S.skillsSig !== sig) {
    const byName = Object.fromEntries(Object.entries(built).map(([k, s]) => [s.name, k])), old = S.skills; let lost = 0;
    for (const ch of [...Object.values(S.chars), ...Object.values(S.bestiary || {})]) {
      const keep = [];
      for (const k of ch.skills || []) { const nk = byName[old[k]?.name]; if (nk) keep.push(nk); else { lost++; if (!ch.enemy) ch.xp = (ch.xp || 0) + (old[k]?.xp || 0); } }
      ch.skills = [...new Set(keep)];
    }
    S.log.push({ n: S.seq = (S.seq || 0) + 1, who: 'Sistema', text: `Árvore de habilidades atualizada. Skills aprendidas foram mantidas pelo nome${lost ? `; ${lost} que deixaram de existir devolveram o XP.` : '.'}`, kind: 'ok' });
    S.skills = built;
  }
  S.skills ??= built; S.skillsSig = sig;
}
S.items ??= buildItems(it);
for (const s of Object.values(S.skills)) { s.req ??= ''; s.back ??= ''; s.ex ??= ''; s.d ??= ''; s.rq ??= null; }
for (const i of Object.values(S.items)) { i.wt ??= ''; i.el ??= ''; }
Object.assign(S, { encounters: {}, camp: { open: false, acts: {} }, seq: 0, users: {}, bestiary: {}, contracts: {}, ...S });
for (const sc of Object.values(S.scenes)) { sc.shop ??= { open: false, stock: [] }; sc.ar ??= sc.cols / sc.rows; sc.crop ??= { x: 0, y: 0, w: 1, h: 1 }; sc.ox ??= 0; sc.oy ??= 0; sc.cam ??= null; }
if (S.shop) { S.scenes[S.scene].shop = S.shop; delete S.shop; } // a loja única antiga vira a loja da cena atual
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
const scrub = ch => { const k = 100 / (ch.hpMax || 1); return { id: ch.id, name: ch.name, enemy: true, owner: '', el: ch.resist.find(e => e !== 'fis') || 'fis', boss: ch.boss, color: ch.color, img: ch.img, x: ch.x, y: ch.y, scene: ch.scene, st: ch.st, dead: ch.dead, hp: Math.ceil(ch.hp * k), hpMax: 100,
  body: Object.fromEntries(PARTS.map(p => [p, (ch.body[p] || 0) * k])), attrs: Object.fromEntries(ATTRS.map(a => [a, 0])), aura: 0, auraMax: 1, san: 1, sanMax: 1, limit: 0, xp: 0, gold: 0, skills: [], inv: {}, equip: {}, weak: [], resist: [], marks: {}, bon: {} }; };
const hiddenFoe = ch => !(ch.id in S.battle.ticks) && (ch.x == null || ch.scene !== S.scene || (scene().fogOn && !scene().seen[ch.x + ',' + ch.y]));
const pubChars = () => Object.fromEntries(Object.values(S.chars).filter(ch => !ch.enemy || !hiddenFoe(ch)).map(ch => [ch.id, ch.enemy ? scrub(ch) : { ...ch, gmNote: undefined }]));
const view = c => c.role === 'gm' ? { ...S, users: undefined } : { ...S, users: undefined, bestiary: undefined, encounters: undefined, scenes: strip(S.scenes), chars: pubChars(),
  log: S.log.filter(e => !e.to || (c.name && (e.to === c.name || e.from === c.name))) };
const sendState = c => c.readyState === 1 && c.send(JSON.stringify({ t: 'state', s: view(c) }));
// recalcula máximos de personagens e modelos antes de enviar o estado
const prep = () => { Object.values(S.chars).forEach(derive); for (const [k, b] of Object.entries(S.bestiary)) { b.id = k; b.bon ??= { hpMax: 0, auraMax: 0, sanMax: 0 }; b.body ??= {}; b.vinc ??= []; derive(b); b.hp = b.hpMax; } };
const push = () => { prep(); S.battle.order = S.battle.active ? order() : []; wss.clients.forEach(sendState); save(); };
const log = (who, text, kind = '', x = {}) => { S.log.push({ n: ++S.seq, who, text, kind, ...x }); if (S.log.length > 150) S.log.shift(); };
const hash = (pw, salt = crypto.randomBytes(8).toString('hex')) => salt + ':' + crypto.scryptSync(String(pw), salt, 32).toString('hex');
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
    const skip = n.st.stun ? 'atordoado' : n.st.frozen ? 'congelado' : n.st.sleep ? 'dormindo' : n.st.para && d100() <= 50 ? 'paralisado' : '';
    if (!skip) return;
    log(n.name, `está ${skip} e perde o turno`, 'bad'); n.imm = 3;
    tickSt(n); S.battle.ticks[n.id] += delay(n);
  }
}

function strike(a, s, t, aim) {
  const stat = at(a, s.attr) - sanPen(a), stTxt = s.st ? ` [${STN[s.st]}]` : '';
  if (s.kind === 'heal') {
    const v = Math.max(1, Math.round((s.power + Math.floor(stat / R.healDiv)) * (t.st.curse ? .5 : 1)));
    t.hp = Math.min(t.hpMax, t.hp + v); delete t.dying; healBody(t, v);
    if (s.st) applySt(t, s.st);
    log(a.name, `${s.name} → ${t.name}: cura ${v} HP${stTxt}`, 'ok', { fx: { id: t.id, heal: v, a: a.id, s: s.name, el: s.el } });
    return false;
  }
  const chance = int(stat + R.hit - Math.floor(at(t, 'AGI') / 2) - (a.st.fear ? 20 : 0) - (a.st.curse ? 10 : 0) + (t.st.marked ? 20 : 0) - (aim ? BODY[aim][2] : 0), 5, 95), r = d100();
  if (r > chance) {
    if (r >= 96) addLimit(a, 20);
    log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${r >= 96 ? 'DESASTRE' : 'errou'}`, 'bad', { d: r, fx: { id: t.id, miss: 1, a: a.id, s: s.name, el: s.el } });
    return false;
  }
  const wk = !!aim && t.weakPart === aim; // ponto fraco do chefe: dano dobrado
  const crit = r <= Math.max(1, Math.floor(chance / 10)), mental = s.kind === 'mental', w = t.weak.includes(s.el), rs = t.resist.includes(s.el) || t.vinc.includes(s.el) || eq(t, 'acess')?.el === s.el, down = w && !t.st.down;
  const mult = (crit ? 2 : 1) * (w ? 1.5 : 1) * (rs ? .5 : 1) * (a.st.atkUp ? 1.25 : 1) * (a.st.atkDn ? .75 : 1) * (a.st.fury ? 1.25 : 1) * (t.st.defUp ? .75 : 1) * (t.st.defDn ? 1.25 : 1) * (t.st.down ? 1.25 : 1) * (t.st.frozen ? 1.25 : 1) * (wk ? 2 : 1);
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
    if (t.hp > 0 && was < 2 && lvl(t, part) === 2) { applySt(t, BODY[part][1]); extra += ` ${PL[part]} em estado crítico!`; }
  }
  if (wk) extra = ' PONTO FRACO!' + extra;
  if (t.hp > 0) { if (s.st) applySt(t, s.st); if (down) t.st.down = 1; }
  log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${crit ? 'CRÍTICO! ' : ''}${d} de dano${mental ? ' mental' : ` (${PL[part]})`}${w ? ' (fraqueza)' : rs ? ' (resistiu)' : ''}${stTxt}.${extra}`, 'ok', { d: r, fx: { id: t.id, dmg: d, crit, el: s.el, a: a.id, s: s.name, w } });
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
const loadScenes = () => SCENES.forEach(sc => { S.scenes[rid()] = newScene(sc.name, { bg: sc.bg, note: sc.note, shop: { open: false, stock: sc.stock.map(n => Object.keys(S.items).find(k => S.items[k].name === n)).filter(Boolean) } }); });
if (fresh) loadScenes();
const loadBestiary = () => { S.bestiary = Object.fromEntries(buildBestiary(makeFoe).map(ch => { const id = rid(); return [id, { ...ch, id }]; })); };
// o mestre também edita os modelos do bestiário com as mesmas ações de ficha
const getCh = (c, id) => S.chars[id] || (c.role === 'gm' && Object.hasOwn(S.bestiary, id) ? S.bestiary[id] : undefined);
const spot = k => { const sc = scene(), C = Math.ceil(sc.cols), Rw = Math.ceil(sc.rows); return [Math.min(C - 1, Math.floor(C * .7) + k % 3), Math.min(Rw - 1, 1 + Math.floor(k / 3) % Math.max(1, Rw - 1))]; }; // espalha inimigos novos no lado direito
if (fresh) loadBestiary();
if (fresh) { // personagens base, sem dono: o mestre atribui ou o jogador assume
  const item = n => Object.keys(S.items).find(k => S.items[k].name === n);
  [['Shinkai', 'indra', '#f5c518', { AGI: 65, DES: 60, FOR: 50, CON: 40, INT: 50, SAB: 35 }, 'Katana de Caçador', 'Veloz e ofensivo: age muitas vezes e pune com lâmina e raio.', [3, 5]],
    ['Mikhail', 'fuhaku', '#3ddc97', { AGI: 60, INT: 60, DES: 55, CAR: 50, FOR: 35, SAB: 45 }, 'Revólver .38', 'Ágil e estrategista: controla o campo e a ordem dos turnos.', [2, 6]],
    ['Thomas', 'radiacao', '#8fd400', { FOR: 65, CON: 65, AGI: 30, SAB: 45, INT: 45, CAR: 35 }, 'Manoplas de Aço', 'Pesado e ofensivo: aguenta o castigo e devolve em dobro.', [3, 7]]]
    .forEach(([name, el, color, attrs, weapon, bio, [x, y]]) => {
      const id = rid(), ch = S.chars[id] = { ...newChar(id, false, ''), name, color, bio, xp: 30, x, y, vinc: [el] };
      Object.assign(ch.attrs, attrs);
      const w = item(weapon), tonic = item('Tônico'), root = Object.keys(S.skills).find(k => S.skills[k].el === el && S.skills[k].root);
      if (w) { ch.inv[w] = 1; ch.equip.arma = w; } if (tonic) ch.inv[tonic] = 2; if (root) ch.skills.push(root);
    });
}
// ----- gerador de inimigos sob medida para o grupo -----
const ROLES = { bruto: ['FOR', 'CON'], agil: ['AGI', 'DES'], conjurador: ['INT', 'SAB'], suporte: ['SAB', 'CAR'] }, ROLE_N = { bruto: 'Bruto', agil: 'Espreitador', conjurador: 'Conjurador', suporte: 'Arauto' };
const FOIL = { kagutsuchi: 'susanoo', susanoo: 'indra', atlas: 'fuhaku', indra: 'atlas', fuhaku: 'kagutsuchi', amaterasu: 'tsukuyomi', tsukuyomi: 'amaterasu', shukketsu: 'amaterasu', radiacao: 'susanoo' };
const ELCOL = { fis: '#8d8478', kagutsuchi: '#c2410c', susanoo: '#1d6fa5', atlas: '#8a6a3a', indra: '#b89400', fuhaku: '#2f8f6b', amaterasu: '#b8a44a', tsukuyomi: '#5b3fb0', shukketsu: '#8f0019', radiacao: '#5a8f00' };
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
    const ch = getCh(c, m.id), f = String(m.f);
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
    else if (f === 'owner' && c.role === 'gm') ch.owner = String(m.v).trim().slice(0, 30);
    else if (f === 'bio') ch.bio = String(m.v).slice(0, 3000);
    else if (f === 'gmNote' && c.role === 'gm') ch.gmNote = String(m.v).slice(0, 3000);

  },
  move(c, m) { const ch = S.chars[m.id]; if (can(c, ch)) { ch.x = int(m.x, 0, Math.ceil(scene().cols) - 1); ch.y = int(m.y, 0, Math.ceil(scene().rows) - 1); } },
  place(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch) { ch.x = ch.y = onMap(ch) ? null : 0; ch.scene = S.scene; } },
  roll(c, m) {
    const ch = S.chars[m.id];
    if (!can(c, ch) || !ATTRS.includes(m.attr)) return;
    const target = int(at(ch, m.attr) + int(m.mod, -100, 100) - sanPen(ch), 1, 95), r = d100();
    const res = r <= Math.max(1, Math.floor(target / 10)) ? 'CRÍTICO' : r <= target ? 'Sucesso' : r >= 96 ? 'DESASTRE' : 'Falha';
    if (r <= target) ch.marks[m.attr] = true; // atributo usado com sucesso pode evoluir
    log(ch.name, `${m.attr} ${target}% → ${r}: ${res}`, r <= target ? 'ok' : 'bad', { d: r, ...(c.role === 'gm' && m.secret ? { to: GM } : {}) });
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
  vinc(c, m) { // mestre concede ou remove um Vínculo; ao ganhar, o personagem já aprende a skill raiz dele
    const ch = getCh(c, m.id);
    if (c.role !== 'gm' || !ch || !EL.includes(m.el) || m.el === 'fis') return;
    if (ch.vinc.includes(m.el)) { ch.vinc = ch.vinc.filter(e => e !== m.el); return; }
    ch.vinc.push(m.el);
    const root = Object.keys(S.skills).find(k => S.skills[k].el === m.el && S.skills[k].root);
    if (root && !ch.skills.includes(root)) ch.skills.push(root);
    log(ch.name, `firmou Vínculo com ${VN[m.el]}.`, 'ok');
  },
  claim(c, m) { const ch = S.chars[m.id]; if (c.role === 'player' && ch && !ch.enemy && !ch.owner) ch.owner = c.name; }, // jogador assume um personagem sem dono
  aff(c, m) { // cicla normal → fraqueza → resistência
    const ch = getCh(c, m.id);
    if (c.role !== 'gm' || !ch || !EL.includes(m.el)) return;
    if (ch.weak.includes(m.el)) { ch.weak = ch.weak.filter(e => e !== m.el); ch.resist.push(m.el); }
    else if (ch.resist.includes(m.el)) ch.resist = ch.resist.filter(e => e !== m.el);
    else ch.weak.push(m.el);
  },
  part(c, m) { const ch = getCh(c, m.id); if (c.role === 'gm' && ch && PARTS.includes(m.k)) ch.body[m.k] = lvl(ch, m.k) ? 0 : Math.ceil(ch.hpMax * .3); }, // mestre cura ou fere uma parte
  st(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch && STK.includes(m.k)) { if (ch.st[m.k]) delete ch.st[m.k]; else applySt(ch, m.k); } },
  // ----- cenas -----
  map(c, m) {
    const sc = scene();
    if (c.role !== 'gm') return;
    const fl = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round((+v || 0) * 1000) / 1000));
    if (m.f === 'cols') sc.cols = fl(m.v, 4, 80); // casas na largura do recorte; as linhas saem da proporção
    if (m.f === 'ar') sc.ar = fl(m.v, .2, 6);
    if (m.f === 'ox' || m.f === 'oy') sc[m.f] = fl(m.v, 0, .95);
    if (m.f === 'crop' && m.v && typeof m.v === 'object') { const x = fl(m.v.x, 0, .98), y = fl(m.v.y, 0, .98); sc.crop = { x, y, w: fl(m.v.w, .02, 1 - x), h: fl(m.v.h, .02, 1 - y) }; }
    if (m.f === 'cam') sc.cam = m.v && typeof m.v === 'object' ? { z: fl(m.v.z, .4, 4), fx: fl(m.v.fx, -5, 5), fy: fl(m.v.fy, -5, 5), n: ++S.seq } : null;
    sc.rows = Math.max(1, Math.round(sc.cols / sc.ar * 1000) / 1000);
    if (m.f === 'bg') sc.bg = okUrl(m.v) ? m.v : '';
    if (m.f === 'name') sc.name = String(m.v).slice(0, 30) || '?';
    if (m.f === 'fogOn') sc.fogOn = !!m.v;
    if (m.f === 'note') sc.note = String(m.v).slice(0, 3000);
  },
  fog(c, m) { // pincel 3x3
    if (c.role !== 'gm') return;
    const sc = scene();
    for (let x = int(m.x) - 1; x <= int(m.x) + 1; x++) for (let y = int(m.y) - 1; y <= int(m.y) + 1; y++)
      if (x >= 0 && y >= 0 && x < Math.ceil(sc.cols) && y < Math.ceil(sc.rows)) { if (m.hide) delete sc.seen[x + ',' + y]; else sc.seen[x + ',' + y] = 1; }
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
      for (const d of dead) { // materiais: 60% de chance de essência do elemento do inimigo (ou garra)
        const el = d.resist.find(e => e !== 'fis') || '', k = Object.keys(S.items).find(i => S.items[i].type === 'mat' && S.items[i].el === el);
        if (k && Math.random() < .6) { const p = pick(pcs); p.inv[k] = (p.inv[k] || 0) + 1; drops.push(`${S.items[k].name} → ${p.name}`); }
      }
      log('Mestre', `Vitória! +${xp} XP e +${gold} de ouro para cada herói.${drops.length ? ' Espólios: ' + drops.join(', ') : ''}`, 'ok');
      for (const ct of Object.values(S.contracts)) if (!ct.done && dead.some(d => (d.tpl || d.name) === ct.target)) { // contratos de caça cumpridos
        ct.done = true; pcs.forEach(p => { p.gold += Math.floor(ct.gold / pcs.length); p.xp += ct.xp; });
        log('Mestre', `Contrato cumprido: ${ct.target}! +${Math.floor(ct.gold / pcs.length)} de ouro e +${ct.xp} XP para cada herói.`, 'ok');
      }
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
    const mates = alive.filter(o => o.enemy === a.enemy), hurt = mates.sort((x, y) => x.hp / x.hpMax - y.hp / y.hpMax)[0], K = k => S.skills[k];
    // só cura quem está abaixo de metade; buffs puros são raros; dano mental não serve contra quem já está sem Sanidade
    const heals = usable.filter(k => K(k).kind === 'heal' && K(k).power > 0), buffs = usable.filter(k => K(k).kind === 'heal' && !K(k).power), hits = usable.filter(k => K(k).kind === 'dmg' && !K(k).limit), mental = usable.filter(k => K(k).kind === 'mental' && !K(k).limit);
    const tgt = Math.random() < R.aiFocus ? foes.sort((x, y) => x.hp - y.hp)[0] : pick(foes), mOk = mental.length && tgt && tgt.san > 0;
    if (a.hcd > 0) a.hcd--; // intervalo entre curas, para ninguém se curar sem parar
    const skill = lim || (heals.length && !a.hcd && hurt.hp < hurt.hpMax * .5 && Math.random() < .6 ? pick(heals) : buffs.length && Math.random() < .12 ? pick(buffs)
      : hits.length && Math.random() < (mOk ? .45 : .7) ? pick(hits) : mOk && Math.random() < .6 ? pick(mental) : 'atk'), heal = S.skills[skill]?.kind === 'heal';
    const t = heal ? (K(skill).power ? hurt : pick(mates)) : tgt;
    if (heal && K(skill).power) a.hcd = 4;
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
    const mates = inB.filter(o => o.hp > 0 && o.enemy === a.enemy && o !== a);
    const ts = !heal && (a.st.possess || a.san <= 0) && mates.length ? [pick(mates)] // possuído, ou em colapso de Sanidade, ataca os próprios aliados
      : s.area ? inB.filter(o => o.enemy === t0.enemy && (o.hp > 0 || heal)) : [a.st.confuse ? pick(inB.filter(o => o.hp > 0)) : t0];
    let more = false;
    const aim = !s.area && !heal && PARTS.includes(m.aim) ? m.aim : null;
    for (const t of ts) if (!t.dead) more = strike(a, s, t, aim) || more;
    if (s.back && a.hp > 0) { a.st[s.back] = 3; log(a.name, `paga o preço do poder proibido [${STN[s.back]}]`, 'bad'); }
    if (more && a.hp > 0) log(a.name, 'acertou a fraqueza — MAIS UM turno!', 'ok'); else endTurn(a.id, s.ct);
  },
  learn(c, m) {
    const ch = S.chars[m.id], s = S.skills[m.skill];
    if (!can(c, ch) || !s || ch.skills.includes(m.skill) || ch.xp < s.xp) return;
    if (s.el !== 'fis' && !ch.vinc.includes(s.el)) return; // só o tronco marcial e os próprios Vínculos
    if (s.ex && ch.skills.some(k => S.skills[k]?.ex === s.ex)) return; // escolha excludente já feita
    if (s.rq && Object.entries(s.rq).some(([a, v]) => at0(ch, a) < v)) return; // requisito de atributo
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
  give(c, m) { const ch = getCh(c, m.id); if (c.role === 'gm' && ch && Object.hasOwn(S.items, m.item)) ch.inv[m.item] = (ch.inv[m.item] || 0) + 1; },
  drop(c, m) {
    const ch = getCh(c, m.id);
    if (!can(c, ch) || !(ch.inv[m.item] > 0)) return;
    if (--ch.inv[m.item] <= 0) { delete ch.inv[m.item]; for (const k in ch.equip) if (ch.equip[k] === m.item) delete ch.equip[k]; }
  },
  equip(c, m) {
    const ch = getCh(c, m.id), i = S.items[m.item];
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
    else { const v = Math.round(i.power * (i.eff === 'hp' && t.st.curse ? .5 : 1)); if (i.eff === 'hp') { delete t.dying; healBody(t, v); } t[i.eff] = Math.min(t[i.eff + 'Max'], t[i.eff] + v); }
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
  // ----- perseguição: fugitivo x perseguidor, cada condutor rola DES + manobra do veículo -----
  chase(c, m) {
    if (c.role !== 'gm') return;
    if (m.k === 'start') { if (S.chars[m.a] && S.chars[m.b] && VEHICLES[m.va] && VEHICLES[m.vb]) { S.chase = { gap: 5, round: 0, a: { id: m.a, veh: m.va }, b: { id: m.b, veh: m.vb } }; log('Mestre', `Perseguição! ${S.chars[m.a].name} (${VEHICLES[m.va][0]}) foge de ${S.chars[m.b].name} (${VEHICLES[m.vb][0]}).`); } return; }
    if (!S.chase) return;
    if (m.k === 'end') { S.chase = null; return log('Mestre', 'Perseguição encerrada.'); }
    const move = side => {
      const ch = S.chars[side.id], [vn, vel, man] = VEHICLES[side.veh];
      if (!ch) return 0;
      const target = int(at(ch, 'DES') + man - sanPen(ch), 1, 95), r = d100(), mv = r <= target ? vel : r >= 96 ? 0 : Math.floor(vel / 2);
      if (r <= target) ch.marks.DES = true;
      log(ch.name, `conduz ${vn}: DES ${target}% → ${r}: ${r <= target ? `avança ${mv}` : r >= 96 ? 'ACIDENTE! Fica parado' : `derrapa, avança ${mv}`}${r >= 96 ? hurt(ch, 10) : ''}`, r <= target ? 'ok' : 'bad', { d: r });
      return mv;
    };
    S.chase.round++; S.chase.gap = Math.max(0, Math.min(10, S.chase.gap + move(S.chase.a) - move(S.chase.b)));
    if (S.chase.gap >= 10 || S.chase.gap <= 0) { log('Mestre', S.chase.gap ? 'O fugitivo escapou!' : 'O perseguidor alcançou o alvo!', 'ok'); S.chase = null; }
  },
  // ----- loja -----
  shop(c, m) {
    if (c.role !== 'gm') return;
    const sh = scene().shop; // cada cena tem a sua loja
    if (m.f === 'open') sh.open = !!m.v;
    else if (Object.hasOwn(S.items, m.item)) sh.stock = sh.stock.includes(m.item) ? sh.stock.filter(k => k !== m.item) : [...sh.stock, m.item];
  },
  buy(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || !scene().shop.open || !i || !scene().shop.stock.includes(m.item) || ch.gold < i.price) return;
    ch.gold -= i.price; ch.inv[m.item] = (ch.inv[m.item] || 0) + 1;
    log(ch.name, `comprou ${i.name} por ${i.price}`, 'ok');
  },
  sell(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || !scene().shop.open || !i || !(ch.inv[m.item] > 0)) return;
    ch.gold += Math.floor(i.price / 2); H.drop(c, m);
    log(ch.name, `vendeu ${i.name} por ${Math.floor(i.price / 2)}`, 'ok');
  },
  forge(c, m) { // forja com essências do elemento: arma = 3, relíquia = 5, mais metade do preço em ouro
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || S.battle.active || !i?.el || !['arma', 'acess'].includes(i.type)) return;
    const ess = Object.keys(S.items).find(k => S.items[k].type === 'mat' && S.items[k].el === i.el), need = i.type === 'arma' ? 3 : 5, cost = Math.round(i.price / 2);
    if (!ess || !(ch.inv[ess] >= need) || ch.gold < cost) return;
    ch.gold -= cost; if ((ch.inv[ess] -= need) <= 0) delete ch.inv[ess];
    ch.inv[m.item] = (ch.inv[m.item] || 0) + 1;
    log(ch.name, `forjou ${i.name}`, 'ok');
  },
  ctAdd(c, m) { const b = S.bestiary[m.id]; if (c.role === 'gm' && b) S.contracts[rid()] = { target: b.tpl || b.name, gold: int(m.gold, 0, 99999), xp: int(m.xp, 0, 999), done: false }; },
  ctDel(c, m) { if (c.role === 'gm') delete S.contracts[m.id]; },
  // ----- bestiário -----
  bSave(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch) S.bestiary[rid()] = structuredClone({ ...ch, st: {}, marks: {}, body: {}, rage: false, tpl: ch.name, cat: ch.cat || (ch.boss ? 'chefe' : 'demonio') }); },
  bSpawn(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(S.bestiary, m.id)) return;
    const base = Object.values(S.chars).filter(ch => ch.enemy && ch.scene === S.scene && ch.x != null).length, ref = partyRef();
    for (let i = 0; i < int(m.n || 1, 1, 12); i++) { const ch = spawn(S.bestiary[m.id], m.tier, ...spot(base + i)); if (ch.boss && m.fit !== false) fitBoss(ch, ref); }
  },
  foeGen(c, m) { // cria (ou salva no bestiário) um inimigo gerado para o grupo atual
    if (c.role !== 'gm' || !EL.includes(m.el) || !Object.hasOwn(ROLES, m.role) || !Object.hasOwn(R.rank, m.rank)) return;
    const ref = partyRef(), base = Object.values(S.chars).filter(ch => ch.enemy && ch.scene === S.scene && ch.x != null).length;
    if (m.save) { const id = rid(); S.bestiary[id] = { ...genFoe(m.el, m.role, m.rank, ref), id }; return; }
    for (let i = 0; i < int(m.n || 1, 1, 12); i++) spawn(genFoe(m.el, m.role, m.rank, ref), 'normal', ...spot(base + i));
  },
  foeEnc(c, m) { // encontro automático: gasta um orçamento proporcional ao grupo e à dificuldade
    if (c.role !== 'gm' || !Object.hasOwn(R.diff, m.diff)) return;
    const ref = partyRef(), el = () => EL.includes(m.el) ? m.el : pick(EL.filter(e => e !== 'fis')), main = el(), made = [];
    let budget = ref.n * R.diff[m.diff] * (4 / ref.n) ** .3; // grupos pequenos aguentam proporcionalmente mais
    while (budget >= .5 && made.length < 9) {
      const rank = budget >= 3 && !made.some(f => f.rank === 'elite') ? 'elite' : budget >= 1 && (made.length < ref.n + 1 || budget < 1.5) ? 'comum' : 'lacaio';
      made.push(genFoe(Math.random() < .75 ? main : el(), pick(Object.keys(ROLES)), rank, ref)); budget -= R.rank[rank].cost;
    }
    const base = Object.values(S.chars).filter(ch => ch.enemy && ch.scene === S.scene && ch.x != null).length;
    made.forEach((f, i) => spawn(f, 'normal', ...spot(base + i)));
    log('Mestre', `Encontro ${({ facil: 'fácil', normal: 'normal', dificil: 'difícil', mortal: 'mortal' })[m.diff]} gerado: ${made.length} inimigos para ${ref.n} heróis (poder ${ref.p}).`, '', { to: GM });
  },
  encSave(c, m) { // encontro: grupo de modelos com nível e quantidade
    if (c.role !== 'gm' || !Array.isArray(m.list)) return;
    const list = m.list.slice(0, 12).filter(e => e && Object.hasOwn(S.bestiary, e.b)).map(e => ({ b: e.b, tier: Object.hasOwn(TIER, e.tier) ? e.tier : 'normal', n: int(e.n || 1, 1, 12) }));
    if (list.length) S.encounters[rid()] = { name: String(m.name || 'Encontro').slice(0, 40), list };
  },
  encDel(c, m) { if (c.role === 'gm') delete S.encounters[m.id]; },
  encSpawn(c, m) { const e = S.encounters[m.id]; if (c.role === 'gm' && e) { for (const x of e.list) H.bSpawn(c, { id: x.b, tier: x.tier, n: x.n }); log('Mestre', `Encontro: ${e.name}.`); } },
  skTog(c, m) { const ch = getCh(c, m.id); if (c.role === 'gm' && ch?.enemy && Object.hasOwn(S.skills, m.skill)) ch.skills = ch.skills.includes(m.skill) ? ch.skills.filter(k => k !== m.skill) : [...ch.skills, m.skill]; }, // inimigos recebem skills livremente
  content(c, m) { // restaura o conteúdo padrão de uma coleção (skills aprendidas e itens dos personagens são limpos se a coleção mudar)
    if (c.role !== 'gm') return;
    if (m.coll === 'skills') { S.skills = buildSkills(sk); Object.values(S.chars).forEach(ch => ch.skills = []); }
    else if (m.coll === 'items') { S.items = buildItems(it); Object.values(S.chars).forEach(ch => { ch.inv = {}; ch.equip = {}; }); Object.values(S.scenes).forEach(sc => sc.shop.stock = []); }
    else if (m.coll === 'bestiary') loadBestiary();
    else if (m.coll === 'scenes') loadScenes();
    else return;
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
    o[m.f] = r === 't' ? String(v).slice(0, 160) : r === 's' ? String(v).slice(0, 40) || '?' : r === 'n' ? int(v, 0, 999) : r === 'g' ? int(v, 0, 16) : r === 'b' ? !!v : r.includes(v) ? v : o[m.f];
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
prep();
export { genFoe, partyRef, fitBoss, spawn };
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

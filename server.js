import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { startTunnel } from './tunnel.js';
import { buildSkills, buildItems, buildBestiary, SCENES, VEHICLES, SUMMONS } from './content.js';
import './public/rules.js'; // regras compartilhadas com o navegador (globalThis.RULES)
import './public/oficios.js'; // catálogo de ofícios (perícias), também usado pelo navegador (globalThis.OFI)
const RU = globalThis.RULES, OF = globalThis.OFI;

// __SEA__ só existe no executável gerado por tools/build-exe.mjs: arquivos do jogo vêm embutidos e os dados ficam ao lado do .exe
const SEA = typeof __SEA__ !== 'undefined', seaMod = SEA ? process.getBuiltinModule('node:sea') : null;
const dir = SEA ? path.dirname(process.execPath) : path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(dir, 'public'), DATA = process.env.VJ_DATA || path.join(dir, 'data'), UP = path.join(DATA, 'uploads');
const PORT = process.env.PORT || 3000;
const PORTAL = (process.env.VJ_PORTAL || 'https://alexzjss.github.io/virtualJRPG/').replace(/\/?$/, '/'); // página fixa onde o jogador digita o código da sessão
const keyFile = path.join(DATA, 'gm-key.txt');
const KEY = process.env.GM_KEY || (SEA ? (() => { // no executável a chave do mestre é sorteada na primeira vez e guardada ao lado dos dados
  try { return fs.readFileSync(keyFile, 'utf8').trim(); } catch {}
  const k = crypto.randomBytes(5).toString('hex'); fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(keyFile, k + '\n'); return k;
})() : 'mestre');
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
const EL = ['fis', 'kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko', 'aura', 'oculto'];
const KINDS = ['dmg', 'mental', 'heal', 'passive', 'form', 'util']; // form = transformação/postura; util = suporte sem cura (escudo, purificar, invocar)
const DOT = RU.DOT;
const CTRL = RU.CTRL; // chefes só sofrem controle por 1 turno
const STK = Object.keys(RU.ST);
const VN = { kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', hiruko: 'Hiruko' };
const STN = RU.ST, RESN = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
const ITYPES = ['cons', 'arma', 'armadura', 'acess', 'mat', 'mun'], WT = ['', 'lamina', 'lanca', 'fogo', 'punho'], EFF = ['hp', 'aura', 'san', 'cure', 'body', 'rev', 'bomb', 'comp', 'oil'];
// partes do corpo: atributos penalizados (−10 cada enquanto crítica), status ao ficar crítica, penalidade para mirar, peso no sorteio
const BODY = { head: [['INT', 'SAB'], 'stun', 30, 6], torso: [['CON'], 'bleed', 0, 40], armL: [['FOR', 'DES'], 'atkDn', 15, 15], armR: [['FOR', 'DES'], 'atkDn', 15, 15], legL: [['AGI'], 'agiDn', 15, 12], legR: [['AGI'], 'agiDn', 15, 12] };
const PARTS = Object.keys(BODY), PL = { head: 'cabeça', torso: 'torso', armL: 'braço esq.', armR: 'braço dir.', legL: 'perna esq.', legR: 'perna dir.' };
const BBG = ['rubro', 'noite', 'floresta', 'brasa', 'gelo', 'vazio', 'santuario', 'tempestade'];
const CAMP = ['vigiar', 'cozinhar', 'conversar', 'treinar', 'meditar'];
const GMF = new Set(['arma', 'armor', 'gold', 'xpR', 'goldR', 'po']); // campos numéricos que só o mestre altera
const EXTRA = { ofi: [], po: 0, pof: [], up: {}, rrUsed: 0, vinc: [], aw: [], nen: '', body: {}, bon: { hpMax: 0, auraMax: 0, sanMax: 0 }, bio: '', gmNote: '', xpR: 0, goldR: 0 };
const sk = (name, kind, attr, el, power, cost, gx, gy, o = {}) => ({ name, kind, attr, el, power, cost, res: 'aura', st: '', xp: 10, gx, gy, limit: false, area: false, ct: 100, pas: 'hpMax', req: '', back: '', ex: '', d: '', rq: null, ...o });
const it = (name, type, power, o = {}) => ({ name, type, power, eff: 'hp', attr: 'SOR', wt: '', el: '', price: 10, ...o });
const NEW = { skills: () => sk('Nova skill', 'dmg', 'FOR', 'fis', 10, 5, 0, 0), items: () => it('Novo item', 'cons', 10) };
const SCH = {
  skills: { name: 's', kind: KINDS, attr: ATTRS, el: EL, res: ['aura', 'san'], st: ['', ...STK], power: 'n', cost: 'n', xp: 'n', ct: 'n', gx: 'g', gy: 'g', limit: 'b', area: 'b', pas: ['hpMax', 'auraMax', 'sanMax', 'res', 'vow', 'trig', 'mod', 'amp', 'bon', ...ATTRS], req: WT, back: ['', ...STK], ex: 't', d: 't' },
  items: { name: 's', type: ITYPES, eff: EFF, attr: ATTRS, wt: WT, el: ['', ...EL], power: 'n', price: 'n' },
};
// ---------- estado ----------
let S = { chars: {}, battle: { active: false, ticks: {} }, log: [] }, fresh = true;
try { S = JSON.parse(fs.readFileSync(FILE)); fresh = false; } catch {}
if (S.skills && JSON.stringify(S).includes('radiacao')) S = JSON.parse(JSON.stringify(S).replace(/radiacao/g, 'hiruko')); // id antigo do Vínculo de Hiruko: converte fichas, itens e a grade salvas
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
S.reqs ??= {}; S.auto = { roll: false, act: false, learn: false, item: false, camp: false, ...S.auto }; // pedidos dos jogadores à espera do mestre e o que ele liberou sem aprovação
if (S.accV !== 2) { S.users = {}; S.accV = 2; } // contas antigas (criadas no primeiro acesso) são apagadas: agora só o mestre cria contas
for (const sc of Object.values(S.scenes)) { sc.shop ??= { open: false, stock: [] }; sc.ar ??= sc.cols / sc.rows; sc.crop ??= { x: 0, y: 0, w: 1, h: 1 }; sc.ox ??= 0; sc.oy ??= 0; sc.cam ??= null; sc.bbg ??= ''; sc.gather ??= []; }
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
  if (req.url === '/api/hi') return res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }).end('{"vj":1}'); // a página de entrada confere se o código leva a uma mesa aberta
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return res.writeHead(400).end(); }
  if (p === '/') p = '/index.html';
  if (!path.extname(p)) p += '.html';
  const done = (d, ext) => res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }).end(d);
  if (SEA && !p.startsWith('/uploads/')) { // arquivos embutidos no executável
    let a = null; try { if (!p.includes('..')) a = seaMod.getAsset(p.startsWith('/vendor/') ? p.slice(1) : 'public' + p); } catch {}
    return a ? done(Buffer.from(a), path.extname(p)) : res.writeHead(404).end('404');
  }
  let root = p.startsWith('/uploads/') ? DATA : PUB;
  if (p.startsWith('/vendor/')) { root = VEND; p = p.slice(7); }
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(f, (e, d) => {
    if (e) return res.writeHead(404).end('404');
    done(d, path.extname(f));
  });
});
const wss = new WebSocketServer({ server, maxPayload: 65536 });
wss.on('error', () => {}); // o erro de porta ocupada é tratado no server.on('error')

// ---------- utilidades ----------
let saveT;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(S)); }, 300); };
const strip = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, note: undefined, gmNote: undefined }]));
// cada cliente só recebe o que pode ver (sussurros, rolagens secretas e notas do mestre ficam de fora)
// jogadores e mesa não recebem os números dos inimigos (HP vira %), nem inimigos fora da cena ou sob a névoa
const scrub = ch => { const k = 100 / (ch.hpMax || 1); return { id: ch.id, name: ch.name, enemy: true, owner: '', el: ch.resist.find(e => e !== 'fis') || 'fis', boss: ch.boss, color: ch.color, img: ch.img, x: ch.x, y: ch.y, scene: ch.scene, st: ch.st, dead: ch.dead, hp: Math.ceil(ch.hp * k), hpMax: 100,
  body: Object.fromEntries(PARTS.map(p => [p, (ch.body[p] || 0) * k])), attrs: Object.fromEntries(ATTRS.map(a => [a, 0])), aura: 0, auraMax: 1, san: 1, sanMax: 1, limit: 0, xp: 0, gold: 0, skills: [], inv: {}, equip: {}, weak: ch.known >= 1 ? ch.weak : [], resist: ch.known >= 2 ? ch.resist : [], weakPart: ch.known >= 3 ? ch.weakPart : undefined, known: ch.known || 0, marks: {}, bon: {} }; };
const hiddenFoe = ch => !(ch.id in S.battle.ticks) && (ch.x == null || ch.scene !== S.scene || (scene().fogOn && !scene().seen[ch.x + ',' + ch.y]));
const pubChars = () => Object.fromEntries(Object.values(S.chars).filter(ch => !ch.enemy || !hiddenFoe(ch)).map(ch => [ch.id, ch.enemy ? scrub(ch) : { ...ch, gmNote: undefined }]));
let net = { status: 'off', url: '', code: '', msg: 'Túnel desligado.' }; // situação do túnel, só para o mestre (não é salva)
const lan = () => Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => `http://${i.address}:${PORT}`);
const view = c => c.role === 'gm' ? { ...S, users: undefined, accounts: Object.keys(S.users).sort(), net: { ...net, portal: PORTAL, lan: lan() } } :
   { ...S, users: undefined, bestiary: undefined, encounters: undefined, scenes: strip(S.scenes), chars: pubChars(), reqs: Object.fromEntries(Object.entries(S.reqs).filter(([, r]) => r.by === c.name)),
  log: S.log.filter(e => !e.to || (c.name && (e.to === c.name || e.from === c.name))) };
const sendState = c => c.role && c.readyState === 1 && c.send(JSON.stringify({ t: 'state', s: view(c) }));
// recalcula máximos de personagens e modelos antes de enviar o estado
const prep = () => { Object.values(S.chars).forEach(derive); Object.values(S.chars).forEach(normSlots); const hs = Object.values(S.chars).filter(c => !c.enemy && !c.summon); for (const c of hs) c.bondMax = Math.max(0, ...hs.filter(o => o !== c).map(o => bondLv(c, o))); for (const [k, b] of Object.entries(S.bestiary)) { b.id = k; b.bon ??= { hpMax: 0, auraMax: 0, sanMax: 0 }; b.body ??= {}; b.vinc ??= []; derive(b); b.hp = b.hpMax; } };
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
const usable = () => { for (const ch of Object.values(S.chars)) { if (S.battle.active && ch.id in S.battle.ticks) ch.cant = Object.fromEntries(ch.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive').map(k => [k, cantUse(ch, effSkill(ch, k))])); else delete ch.cant; } };
const push = () => { Object.values(S.chars).forEach(breakCheck); prep(); reseat(); pruneReqs(); usable(); S.battle.order = S.battle.active ? order() : []; wss.clients.forEach(sendState); save(); };
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
const at0 = (ch, a) => ch.attrs[a] + (eq(ch, 'acess')?.attr === a ? eq(ch, 'acess').power + (ch.up?.[ch.equip.acess]?.p || 0) : 0);
const lvl = (ch, k) => { const d = ch.body[k] || 0; return d >= ch.hpMax * .3 ? 2 : d >= ch.hpMax * .15 ? 1 : 0; }; // 0 ileso, 1 ferido, 2 crítico
const at = (ch, a) => at0(ch, a) - 10 * PARTS.filter(k => BODY[k][0].includes(a) && lvl(ch, k) === 2).length;
const healBody = (ch, v) => { while (v > 0) { const k = PARTS.filter(p => ch.body[p] > 0).sort((x, y) => ch.body[y] - ch.body[x])[0]; if (!k) break; const d = Math.min(v, ch.body[k]); ch.body[k] -= d; v -= d; } };
// máximos derivados dos atributos (+ bônus de passivas/mestre); valores atuais nunca passam do máximo
const BASE = { hpMax: ch => Math.floor(at0(ch, 'CON') * R.hpCon) + R.hpBase, auraMax: ch => Math.floor((at0(ch, 'INT') + at0(ch, 'SAB')) / 4), sanMax: ch => Math.floor(at0(ch, 'SAB') / 2) + Math.floor(at0(ch, 'CAR') / 4) };
const derive = ch => { for (const k in BASE) { ch[k] = Math.max(1, BASE[k](ch) + (ch.bon[k] || 0)); const c = k.slice(0, -3); ch[c] = Math.min(ch[c], ch[k]); } };
const evolveCh = ch => { const up = Object.keys(ch.marks).filter(a => d100() > ch.attrs[a] && ch.attrs[a] < 100); up.forEach(a => ch.attrs[a]++); ch.marks = {}; return up; };
const sanPen = ch => { const p = ch.san / (ch.sanMax || 1); return p <= 0 ? 30 : p <= .25 ? 20 : p <= .5 ? 10 : 0; };
// CTB: quanto maior a AGI, menor o intervalo entre turnos
// heróis caídos continuam na fila: o "turno" deles conta para a morte
const nextOf = T => Object.keys(T).filter(k => { const ch = S.chars[k]; return ch && !ch.dead && (ch.hp > 0 || !ch.enemy); }).sort((a, b) => T[a] - T[b] || a.localeCompare(b))[0];
const current = () => nextOf(S.battle.ticks);
const order = () => { const T = { ...S.battle.ticks }, out = []; for (let i = 0; i < 8; i++) { const id = nextOf(T); if (!id) break; out.push(id); T[id] += delay(S.chars[id]); } return out; }; // próximos turnos previstos
const onMap = ch => ch.x != null && ch.scene === S.scene;
// quem acabou de perder um turno fica 2 turnos imune a novo controle (evita ficar travado para sempre)
const addLimit = (ch, v) => ch.limit = Math.min(100, ch.limit + v);
// ---------- laços, Aflição e Virtude ----------
const bondKey = (a, b) => [a.id, b.id].sort().join('|');
const bondLv = (a, b) => RU.bondLv((S.bonds ??= {})[bondKey(a, b)] || 0);
const bondAdd = (a, b, n = 1) => { S.bonds ??= {}; const k = bondKey(a, b), was = bondLv(a, b); S.bonds[k] = (S.bonds[k] || 0) + n; return bondLv(a, b) > was ? bondLv(a, b) : 0; };
function breakCheck(ch) { // Sanidade em zero: teste de SAB. Falha = Aflição, crítico = Virtude. Volta com 25% da Sanidade.
  if (ch.enemy || ch.dead || ch.summon) return;
  if (ch.san > 0) { ch.collapsed = false; return; }
  if (ch.collapsed) return;
  ch.collapsed = true;
  const target = int(at(ch, 'SAB'), 1, 95), r = d100(), crit = r <= Math.max(1, Math.floor(target / 10)), ok = r <= target;
  ch.san = Math.max(1, Math.ceil(ch.sanMax * .25));
  if (crit) { const k = pick(Object.keys(RU.VIR)); ch.afl = { t: 'v', k }; log(ch.name, `chega ao limite da mente (SAB ${target}% → ${r}): CRÍTICO! Virtude: ${RU.VIR[k][0]}. ${RU.VIR[k][1]}`, 'ok', { d: r, rr: { l: 'SAB', t: target, res: 'CRÍTICO', c: ch.id } }); }
  else if (ok) log(ch.name, `chega ao limite da mente (SAB ${target}% → ${r}) e se segura. Volta com ${ch.san} de Sanidade.`, 'ok', { d: r, rr: { l: 'SAB', t: target, res: 'Sucesso', c: ch.id } });
  else { const k = pick(Object.keys(RU.AFL)); ch.afl = { t: 'a', k }; log(ch.name, `chega ao limite da mente (SAB ${target}% → ${r}): Aflição: ${RU.AFL[k][0]}. ${RU.AFL[k][1]}`, 'bad', { d: r, rr: { l: 'SAB', t: target, res: 'Falha', c: ch.id } }); }
}
// ---------- sistema de skills: passivas, modificadores, votos, transformações ----------
// passivas lidas pelo motor (modificador, gatilho, voto, amplificação) ocupam slots: 4, mais 1 a cada 100 XP gasto em skills; as trocas são feitas no acampamento
const slotted = s => s && s.kind === 'passive' && ['mod', 'trig', 'vow', 'amp'].includes(s.pas);
const spentXp = ch => (ch.skills || []).reduce((a, k) => a + (S.skills[k]?.xp || 0), 0);
const slotMax = ch => 4 + Math.floor(spentXp(ch) / 100);
function normSlots(ch) { // mantém só passivas aprendidas, respeita o limite e ocupa vagas livres na ordem em que foram aprendidas
  if (ch.enemy || ch.summon) return;
  const legacy = !Array.isArray(ch.pslots), max = slotMax(ch), own = (ch.skills || []).filter(k => slotted(S.skills[k]));
  const keep = (ch.pslots || []).filter((k, i, l) => own.includes(k) && l.indexOf(k) === i).slice(0, max);
  ch.pslots = [...keep, ...own.filter(k => !keep.includes(k) && (legacy || !(ch.pslotOff || []).includes(k)))].slice(0, max);
}
const passOf = ch => (ch.skills || []).filter(k => { const s = S.skills[k]; return s && s.kind === 'passive' && (!slotted(s) || ch.enemy || ch.summon || !Array.isArray(ch.pslots) || ch.pslots.includes(k)); }).map(k => S.skills[k]);
const vows = ch => passOf(ch).filter(p => p.vow && !ch.bt?.broken?.[p.vow]).map(p => p.vow);
const inScope = (sc, s, ch) => !sc ? true : sc === 'form' ? !!ch.st?.form : !s ? false : sc === 'circ' ? !!s.circ : sc === 'atk' ? !!s.basic : sc === 'mental' ? s.kind === 'mental' : sc === 'heal' ? s.kind === 'heal' : sc === 'area' ? !!s.area : sc === 'req' ? !!s.req : s.el === sc;
function modsOf(ch, s) { // soma dos modificadores das passivas (no escopo da skill) e da transformação ativa
  const m = { atk: 0, def: 0, agi: 0, hit: 0, crit: 0, atkP: 0, heal: 0 }, add = o => { for (const k in o) m[k] = (m[k] || 0) + o[k]; };
  for (const p of passOf(ch)) if (p.mod && inScope(p.sc, s, ch)) add(p.mod);
  const f = ch.form && ch.st?.form && S.skills[ch.form]; if (f?.form) add(f.form.m);
  if (vows(ch).includes('tempo')) m.hit += 15;
  const D = S.battle?.dom; if (D) add(ch.enemy === D.side ? D.ally : D.foe); // Expansão de Domínio aberta
  const af = ch.afl && (ch.afl.t === 'v' ? RU.VIR : RU.AFL)[ch.afl.k]; if (af) add(af[2]); // Aflição ou Virtude
  const wu = ch.up?.[ch.equip?.arma]; // assinatura, runas e arma viva
  if (wu) { if (wu.sig != null) add(OF.SIG[wu.sig]?.m || {}); for (const rn of wu.g || []) add(OF.RUNAS[rn]?.mod || {}); if (wu.living && stageOf(wu.kills) >= 3 && s?.basic) m.crit += 10; }
  if (S.meal && S.battle?.active && !ch.enemy) add(S.meal.m); // refeição do acampamento
  if (ch.sharp && s?.basic) m.atkP += 3; // arma afiada
  if (S.battle?.active && !ch.enemy && ch.id in S.battle.ticks) for (const o of battlers()) { // laços: aliados queridos por perto fortalecem
    if (o === ch || o.enemy || o.hp <= 0) continue;
    const lv = bondLv(ch, o); if (lv >= 2) m.atk += 3; if (lv >= 3) m.def += 3; if (lv >= 4) m.hit += 5; if (lv >= 5) m.crit += 5;
  }
  return m;
}
const delay = ch => Math.round(1000 / Math.max(1, at(ch, 'AGI') * (ch.st.agiUp ? 1.25 : 1) * (ch.st.agiDn ? .75 : 1) * (ch.boss ? 2 : 1) * Math.max(.5, 1 + modsOf(ch).agi / 100))); // chefes agem com o dobro da frequência
function vowMult(a, s, t) {
  let m = 1;
  for (const v of vows(a)) switch (v) {
    case 'presa': m *= !a.bt?.prey || a.bt.prey === t.id ? 1.5 : .75; break;
    case 'corpo': m *= 1.3; break;
    case 'pureza': m *= (a.vinc || []).includes(s.el) ? 1.3 : s.basic || s.el === 'fis' ? .6 : 1; break;
    case 'sangue': m *= 1.4; break;
    case 'chama': m *= a.hp <= a.hpMax * .4 ? 1.6 : .85; break;
    case 'silencio': m *= s.area ? 1 : 1.35; break;
    case 'cacador': m *= t.enemy && t.cat !== 'humano' ? 1.4 : .5; break;
    case 'arma': m *= s.basic || s.req ? 1.35 : 1; break;
    case 'tempo': m *= 1.25; break;
  }
  return m;
}
const breakVow = (ch, v, why) => { (ch.bt ??= {}).broken ??= {}; if (ch.bt.broken[v]) return; ch.bt.broken[v] = true; const loss = Math.ceil(ch.sanMax * .2); ch.san = Math.max(0, ch.san - loss); log(ch.name, `rompeu o ${RU.VOW[v][0]} (${why}) e perde ${loss} de Sanidade.`, 'bad'); };
const compOf = ch => Object.keys(ch.inv || {}).find(k => S.items[k]?.eff === 'comp' && ch.inv[k] > 0);
// a skill como este personagem a usa: amplificações (versões Discente/Verdadeiro), afinidade de Aura e custos de votos
function effSkill(a, id) {
  const s0 = S.skills[id]; if (!s0) return null;
  const s = { ...s0, id, pay: { ...(s0.pay || {}) }, fx: [...(s0.fx || [])] };
  for (const p of passOf(a)) if (p.amp === s0.name && p.up) { const u = p.up; s.power += u.p || 0; s.cost += u.c || 0; if (u.san) s.pay.san = (s.pay.san || 0) + u.san; if (u.area) s.area = true; if (u.hits) s.hits = u.hits; if (u.fx) s.fx.push(...u.fx); s.amped = (s.amped || 0) + 1; }
  const e = RU.nenEff(a, s0); if (e !== 1) s.power = Math.round(s.power * e); s.eff = e;
  const vs = vows(a);
  if (vs.includes('sangue') && s.kind !== 'passive') s.pay.hp = (s.pay.hp || 0) + 8;
  if (s.circ && vs.includes('preco')) { if (s.res === 'aura') s.cost = 0; s.pay.san = (s.pay.san || 0) + 4; }
  if (s.circ && s.pay.san && compOf(a)) { s.pay.san = Math.ceil(s.pay.san / 2); s.useComp = true; } // componente ritualístico corta o preço em Sanidade
  return s;
}
const stageOf = k => [10, 25, 50].filter(v => (k || 0) >= v).length;
const wpPow = a => { const u = a.up?.[a.equip?.arma]; return u ? (u.p || 0) + (u.living ? stageOf(u.kills) : 0) : 0; };
const basicOf = a => { const wp = eq(a, 'arma'); return { name: 'Ataque', kind: 'dmg', attr: wp?.wt === 'fogo' ? 'DES' : 'FOR', el: wp?.el || 'fis', power: (wp?.power ?? a.arma) + wpPow(a) + modsOf(a, { basic: true }).atkP, cost: 0, res: 'aura', basic: true, ct: 100, fx: [], pay: {} }; };
const battlers = () => Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && !o.dead);
const skipping = o => o.st.stun || o.st.frozen || o.st.sleep || o.chg;
// técnica em dupla (1 nome) ou em trio (2 nomes): aliados de pé e distintos, que conhecem a skill par e podem pagar por ela
const linksOf = s => s.duo ? [s.duo] : s.trio?.length ? s.trio : null;
function partners(a, s) {
  const used = new Set(), out = [];
  for (const nm of linksOf(s) || []) {
    let hit = null;
    for (const p of battlers()) {
      if (p === a || used.has(p) || p.enemy !== a.enemy || p.hp <= 0 || skipping(p) || p.st.silence) continue;
      const k = p.skills.find(k => S.skills[k]?.name === nm), ps = k && S.skills[k];
      if (ps && p[ps.res] >= ps.cost) { hit = { p, ps }; break; }
    }
    if (!hit) return null;
    used.add(hit.p); out.push(hit);
  }
  return out;
}
// motivo para não poder usar agora ('' = pode)
function cantUse(a, s) {
  if (!s || s.kind === 'passive') return 'Passiva';
  if (s.req && s.req !== wtype(a)) return 'Exige ' + s.req;
  if (!s.basic && (a.st.silence || a.st.fury)) return a.st.silence ? 'Silenciado' : 'Em fúria: só ataca';
  if (s.limit && a.limit < 100) return 'Limite incompleto';
  if (a[s.res] < s.cost) return 'Falta ' + RESN[s.res];
  for (const [r, v] of Object.entries(s.pay || {})) if (r === 'hp' ? a.hp <= Math.ceil(a.hpMax * v / 100) : a[r] < v) return 'Falta ' + RESN[r];
  if (s.kind === 'form' && a.st.exaus) return 'Exausto';
  if (s.nf && !a.st.form) return 'Só transformado';
  if (linksOf(s) && !partners(a, s)) return s.trio ? 'Sem os dois parceiros do trio' : 'Sem parceiro para a dupla';
  if (s.dom && (!S.battle.active || a.aura < Math.ceil(a.auraMax / 2))) return S.battle.active ? 'Exige metade da Aura' : 'Só em batalha';
  const vs = vows(a);
  if (vs.includes('silencio') && s.area) return 'Voto do Silêncio';
  if (vs.includes('arma') && !s.basic && !s.req && s.kind !== 'form') return 'Voto da Arma Única';
  return '';
}
const applySt = (t, k, n = 3) => {
  if (CTRL.includes(k) && t.imm > 0) return;
  if (CTRL.includes(k) && t.chg) interrupt(t);
  t.st[k] = t.boss && CTRL.includes(k) ? 1 : DOT.includes(k) ? Math.min(6, (t.st[k] || 0) + n) : n; // dano contínuo acumula até 6 turnos
};
const tickSt = ch => { for (const k in ch.st) if (--ch.st[k] <= 0) { delete ch.st[k]; expire(ch, k); } if (ch.imm > 0) ch.imm--; };
function expire(ch, k) { // condições com efeito ao acabar
  if (k === 'shield') ch.shield = 0;
  if (k === 'form') endForm(ch, true);
  if (k === 'seal') sealBoom(ch, 1);
  if (k === 'guarded') delete ch.guardBy;
}
function endForm(ch, colateral) {
  const f = ch.form && S.skills[ch.form]; delete ch.form; delete ch.st.form;
  if (!f) return;
  let txt = '';
  if (colateral) for (const e of f.form?.end || []) txt += fx1(ch, f, ch, e, { stat: at(ch, f.attr) });
  log(ch.name, `deixa a forma ${f.name}${txt ? ': ' + txt.trim() : ''}.`, colateral && txt ? 'bad' : '');
}
function sealBoom(t, m) {
  const sd = t.sealD; delete t.sealD; delete t.st.seal;
  if (!sd || t.hp <= 0) return '';
  const d = Math.max(1, Math.round(sd.d * m)), txt = `O selo de ${sd.by} explode: ${d} de dano.${hurt(t, d)}`;
  log(t.name, txt, 'bad', { fx: { id: t.id, dmg: d, el: sd.el } });
  return ' [selo detonado]';
}
function livingKill(src, t) { // arma viva: cada abate conta; a cada estágio a arma sobe de poder
  const u = !src.enemy && t.enemy && src.up?.[src.equip?.arma]; if (!u?.living) return;
  const was = stageOf(u.kills); u.kills = (u.kills || 0) + 1;
  if (stageOf(u.kills) > was) log(src.name, `${S.items[src.equip.arma]?.name} desperta: estágio ${stageOf(u.kills)}${stageOf(u.kills) === 3 ? ' (ignora armadura e acerta críticos com mais facilidade)' : ''}!`, 'ok');
}
function interrupt(t) { if (!t.chg) return; const s = S.skills[t.chg.s]; delete t.chg; delete t.st.charge; log(t.name, `perde a concentração${s ? ' de ' + s.name : ''}!`, 'bad'); }
// ---------- sistemas de batalha: Quebra, Cadeia, Ataque Total, Domínio, clima, reações ----------
const sideOf = ch => ch.enemy ? 'e' : 'h', TEN = [1, 1.5, 2, 3];
const climaOf = () => RU.CLIMA[S.battle.wx?.k] || null;
function brkHit(t, n, by) { // barra de Quebra de chefes e elites: fraquezas a esvaziam; Quebrado perde o turno e sofre +50%
  if (!t.brk || t.hp <= 0 || t.st.broken || n <= 0) return '';
  t.brk.cur = Math.max(0, t.brk.cur - n);
  if (t.brk.cur > 0) return ` [Quebra ${t.brk.cur}/${t.brk.max}]`;
  t.st.broken = 2; t.brk.cur = t.brk.max; if (t.chg) interrupt(t);
  if (by) addChain(by, 25);
  return ` ${t.name} QUEBROU!`;
}
function addChain(a, v) { if (!S.battle.active) return; const B = S.battle.chain ??= { h: 0, e: 0 }; B[sideOf(a)] = Math.min(100, B[sideOf(a)] + v); }
function chainBurst(a) { // barra de Cadeia cheia: cada aliado ataca em seguida, com bônus crescente
  const B = S.battle.chain; if (!B || B[sideOf(a)] < 100) return;
  const mates = battlers().filter(o => o.enemy === a.enemy && o.hp > 0 && !skipping(o) && !o.summon);
  if (mates.length < 2) return; // sozinho não há sequência: a barra espera um aliado
  B[sideOf(a)] = 0;
  log(a.name, 'CADEIA! O grupo ataca em sequência.', 'ok');
  mates.forEach((o, i) => { const f = battlers().filter(x => x.enemy !== a.enemy && x.hp > 0); if (f.length) strike(o, basicOf(o), pick(f), null, 0, { mult: 1 + .25 * i, nochain: true }); });
}
const allDown = side => { const f = battlers().filter(o => o.enemy !== side && o.hp > 0); return f.length > 0 && f.every(o => o.st.down || o.st.broken); };
function allOut(a) { // Ataque Total: com todo inimigo Derrubado ou Quebrado, o grupo inteiro cai em cima deles
  log(a.name, 'ATAQUE TOTAL!', 'ok');
  const mates = battlers().filter(o => o.enemy === a.enemy && o.hp > 0 && !skipping(o) && !o.summon);
  for (const o of mates) { const f = battlers().filter(x => x.enemy !== a.enemy && x.hp > 0); if (!f.length) break; strike(o, basicOf(o), pick(f), null, 0, { mult: 1.5, nochain: true }); }
}
function openDomain(a, s) { // Expansão de Domínio: gasta toda a Aura; dois Domínios se chocam numa disputa de Aura
  const B = S.battle, old = B.dom, stat = x => Math.max(at(x, 'INT'), at(x, 'SAB')) + x.aura / 2, mine = stat(a) + d100() / 2;
  a.aura = 0;
  if (old && old.side !== a.enemy) {
    const theirs = old.pow + d100() / 2;
    log(a.name, `${s.name} se choca com ${old.name}! (${Math.round(mine)} contra ${Math.round(theirs)})`, 'ok');
    if (mine <= theirs) { applySt(a, 'exaus', 3); log(a.name, 'perde a disputa: o Domínio desmorona e ele fica Exausto.', 'bad'); return; }
    const ow = S.chars[old.by]; if (ow) applySt(ow, 'exaus', 3);
  }
  B.dom = { by: a.id, side: a.enemy, name: s.name, ttl: s.dom.dur, ally: s.dom.ally, foe: s.dom.foe, tick: s.dom.tick, pow: stat(a) };
  log(a.name, `abre o Domínio ${s.name}!`, 'ok', { fx: { id: a.id, a: a.id, s: s.name, el: s.el, heal: 0 } });
}
function closeDomain(why) { const D = S.battle.dom; if (!D) return; delete S.battle.dom; const o = S.chars[D.by]; if (o && !o.dead) applySt(o, 'exaus', 3); log(o?.name || 'Domínio', `${D.name} se desfaz${why ? ' (' + why + ')' : ''}; o usuário fica Exausto.`, 'bad'); }
// reação elemental do golpe com as condições do alvo
const mental0 = s => s.kind === 'mental';
const reactOf = (s, t) => s.kind === 'mental' ? null : RU.REACT.find(r => r.el.includes(s.el) && r.on.some(k => t.st[k]));
// passivas com gatilho; efeitos que causam dano não disparam por gatilho, para não haver cadeias sem fim
function trig(ch, ev, o) {
  if (!ch || !S.battle.active || !(ch.id in S.battle.ticks) || ch.dead) return;
  for (const p of passOf(ch)) if (p.on === ev && (!p.ch || Math.random() * 100 < p.ch)) {
    let txt = '';
    for (const f of p.fx || []) {
      if (f.t === 'det' || (f.t === 'lose' && f.r === 'hp')) continue;
      const tg = f.to === 'tgt' ? (o && o !== ch ? [o] : []) : f.to === 'ally' ? battlers().filter(x => x.enemy === ch.enemy && x.hp > 0) : f.to === 'foes' ? battlers().filter(x => x.enemy !== ch.enemy && x.hp > 0) : [ch];
      for (const t of tg) txt += fx1(ch, p, t, f, { stat: at(ch, p.attr || 'SAB') });
    }
    if (txt) log(ch.name, `${p.name}:${txt}`, 'ok');
  }
}
// um efeito da lista aplicado em um alvo; c = { d: dano causado, stat, fallen }
function fx1(a, s, t, f, c = {}) {
  if (!t || t.dead) return '';
  const T = S.battle.ticks;
  switch (f.t) {
    case 'st': if ((t.hp > 0 || f.k === 'regen') && Math.random() * 100 < (f.ch ?? 100)) { applySt(t, f.k, f.n + (t === a && current() === a.id ? 1 : 0)); return ` [${STN[f.k]}${t !== a && f.to ? ' em ' + t.name : ''}]`; } return '';
    case 'det': {
      if (t.hp <= 0) return '';
      if (f.k === 'seal') return t.sealD ? sealBoom(t, 1.5) : '';
      const ks = f.k === 'dot' ? DOT : f.k === 'neg' ? RU.NEG.filter(k => k !== 'seal') : [f.k]; let n = 0;
      for (const k of ks) if (t.st[k]) { n += t.st[k]; delete t.st[k]; }
      if (!n) return '';
      const d = Math.max(1, Math.round(f.m * n * (1 + modsOf(a, s).atk / 100)));
      return ` Detonação: +${d} de dano.${hurt(t, d, a)}`;
    }
    case 'drain': { if (!(c.d > 0) || a.hp <= 0) return ''; const v = Math.max(1, Math.round(c.d * f.p / 100)); a[f.r] = Math.min(a[f.r + 'Max'], a[f.r] + v); if (f.r === 'hp') healBody(a, v); return ` (+${v} ${RESN[f.r]} para ${a.name})`; }
    case 'strip': { const had = RU.POS.filter(k => t.st[k]).length + (t.shield > 0); for (const k of RU.POS) delete t.st[k]; t.shield = 0; delete t.st.shield; return had ? ' [bônus removidos]' : ''; }
    case 'steal': { const ks = RU.POS.filter(k => t.st[k]); for (const k of ks) { a.st[k] = Math.max(a.st[k] || 0, t.st[k]); delete t.st[k]; } return ks.length ? ` [roubou ${ks.map(k => STN[k]).join(', ')}]` : ''; }
    case 'push': if (t.id in T && t.hp > 0) { bump(t.id, Math.round(delay(t) * f.v / 100)); return ' [atrasado]'; } return '';
    case 'haste': if (t.id in T && t !== a) { T[t.id] = Math.max(T[a.id] ?? 0, T[t.id] - Math.round(delay(t) * f.v / 100)); return ` [${t.name} adiantado]`; } return '';
    case 'seal': if (t.hp <= 0) return ''; t.sealD = { d: f.p + Math.floor((c.stat || 0) / R.dmgDiv), el: s.el, by: a.name }; t.st.seal = f.n + (t === a ? 1 : 0); return ' [Selo]';
    case 'shield': { const v = Math.max(1, Math.round((f.p + Math.floor((c.stat || 0) / R.healDiv)) * (s.eff || 1))); t.shield = Math.max(t.shield || 0, v); t.st.shield = Math.max(t.st.shield || 0, 3); return ` [Escudo ${v}${t !== a ? ' em ' + t.name : ''}]`; }
    case 'cleanse': { const ks = RU.NEG.filter(k => t.st[k]); for (const k of ks) delete t.st[k]; delete t.sealD; return ks.length ? ' [purificado]' : ''; }
    case 'revive': if (c.fallen || (t.hp <= 0 && !t.dead)) { t.hp = Math.max(t.hp, Math.ceil(t.hpMax * f.p / 100)); delete t.dying; delete t.fell; return ` [${t.name} se reergue]`; } return '';
    case 'res': if (f.r === 'limit') addLimit(t, f.p); else t[f.r] = Math.min(t[f.r + 'Max'], t[f.r] + f.p); return ` [+${f.p} ${RESN[f.r]}${t !== a ? ' em ' + t.name : ''}]`;
    case 'gain': if (f.r === 'limit') addLimit(a, f.p); else a[f.r] = Math.min(a[f.r + 'Max'], a[f.r] + f.p); return ` [+${f.p} ${RESN[f.r]}]`;
    case 'lose': if (f.r === 'hp') return t.hp > 0 ? ` (−${f.p} HP)${hurt(t, f.p, a)}` : ''; if (f.r === 'limit') t.limit = Math.max(0, t.limit - f.p); else t[f.r] = Math.max(0, t[f.r] - f.p); return ` [−${f.p} ${RESN[f.r]}]`;
    case 'spread': if (t.st[f.k]) { const o = battlers().filter(x => x.enemy === t.enemy && x !== t && x.hp > 0); o.forEach(x => applySt(x, f.k, t.st[f.k])); return o.length ? ` [${STN[f.k]} se espalha]` : ''; } return '';
    case 'clima': { const wx = S.battle.wx ??= { k: '', ttl: 0 }; wx.k = f.k; wx.ttl = f.n * Math.max(2, battlers().length); log(a.name, `o clima muda: ${RU.CLIMA[f.k]?.[0] || f.k}.`, 'ok'); return ` [${RU.CLIMA[f.k]?.[0] || f.k}]`; }
    case 'brk': return brkHit(t, f.n, a);
    case 'guard': if (t !== a) { t.st.guarded = f.n; t.guardBy = a.id; return ` [${a.name} protege ${t.name}]`; } return '';
  }
  return '';
}
// efeitos que valem uma vez por uso (em si, nos aliados, nos inimigos)
function onceFx(a, s, stat) {
  let txt = '';
  for (const f of s.fx || []) {
    if (!f.to || f.to === 'tgt' || f.t === 'turn' || f.t === 'chain' || f.t === 'haste' && f.to === 'self') continue;
    const tg = f.to === 'self' ? [a] : battlers().filter(x => x.enemy === (f.to === 'ally' ? a.enemy : !a.enemy) && (x.hp > 0 || f.t === 'revive'));
    for (const t of tg) txt += fx1(a, s, t, f, { stat });
  }
  if (txt) log(a.name, `${s.name}:${txt}`, 'ok');
}
const hitFx = (a, s, t, c) => (s.fx || []).filter(f => !f.to || f.to === 'tgt').map(f => fx1(a, s, t, f, c)).join('');
function fxMult(a, s, t) { // escalonamentos: execução, contra condição, por turno de condição, fúria do ferido
  let m = 1;
  for (const f of s.fx || []) {
    if (f.t === 'exec' && t.hp <= t.hpMax * f.p / 100) m *= f.m;
    if (f.t === 'vs' && (f.k === 'neg' ? RU.NEG.some(k => t.st[k]) : f.k === 'demon' ? t.enemy && t.cat !== 'humano' : t.st[f.k])) m *= f.m;
    if (f.t === 'per' && t.st[f.k]) m *= 1 + f.p / 100 * t.st[f.k];
    if (f.t === 'rage') m *= 1 + f.m * (1 - a.hp / (a.hpMax || 1));
  }
  return m;
}
function hurt(t, d, src) { // dano em HP: escudo, tenacidade, Limite, acorda, quebra concentração, gatilhos, avisa queda
  const was = t.hp > 0; let note = ''; t.bt ??= {};
  if (t.shield > 0 && d > 0) { const ab = Math.min(t.shield, d); t.shield -= ab; d -= ab; note += ` Escudo absorve ${ab}.`; if (!t.shield) delete t.st.shield; }
  if (was && d >= t.hp) {
    const fall = !t.bt.fall && passOf(t).find(p => p.on === 'fall');
    if (t.st.endure || fall) { d = t.hp - 1; if (t.st.endure) delete t.st.endure; else { t.bt.fall = 1; trig(t, 'fall', src); } note += ` ${t.name} resiste com 1 HP!`; }
  }
  t.hp = Math.max(0, t.hp - d);
  addLimit(t, Math.ceil(100 * d / (t.hpMax || 1)));
  if (d > 0) { delete t.st.sleep; delete t.st.frozen; }
  if (t.chg && d >= t.hpMax * .2) interrupt(t);
  if (t.hp > 0 && d > 0) { trig(t, 'hurt', src); if (!t.bt.low && t.hp <= t.hpMax * .3) { t.bt.low = 1; trig(t, 'low', src); } }
  if (t.boss && !t.rage && t.hp > 0 && t.hp <= t.hpMax / 2) { // fúria: buffs, Limite cheio e dois lacaios do mesmo elemento
    t.rage = true; t.st.atkUp = t.st.agiUp = 99; t.limit = 100;
    const el = t.resist.find(e => e !== 'fis') || 'fis', ref = partyRef();
    if (S.battle.active && t.id in S.battle.ticks) for (let i = 0; i < 2; i++) { const mn = spawn(genFoe(el, pick(Object.keys(ROLES).filter(r => !(t.tune?.nosup && r === 'suporte'))), 'lacaio', ref), 'normal', t.x ?? 0, t.y ?? 0); derive(mn); mn.hp = mn.hpMax; S.battle.ticks[mn.id] = S.battle.ticks[t.id] + delay(mn); }
    return note + ` ${t.name} entra em fúria e invoca lacaios!`;
  }
  if (!was || t.hp) return note;
  if (t.summon?.rev && !t.summon.used) { t.summon.used = 1; t.hp = Math.ceil(t.hpMax / 2); return note + ` ${t.name} se levanta de novo!`; }
  if (t.summon) { t.dead = true; delete S.battle.ticks[t.id]; return note + ` ${t.name} se desfaz.`; }
  if (!t.enemy) { t.dying = 3; t.fell = true; }
  interrupt(t); if (t.form) endForm(t, false);
  Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && o !== t && o.enemy === t.enemy).forEach(o => { addLimit(o, 25); trig(o, 'ally', t); });
  if (src && src !== t) { trig(src, 'kill', t); livingKill(src, t); }
  return note + ` ${t.name} caiu!`;
}
const bump = (id, v) => { if (id in S.battle.ticks) S.battle.ticks[id] += v; }; // empurra na fila só quem ainda está nela (invocação morta sai)
function endTurn(id, ct = 100) { // ct: custo de tempo da ação em %
  const a = S.chars[id];
  if (a) { tickSt(a); bump(id, Math.round(delay(a) * (ct || 100) / 100)); if ((a.brv || 0) < 0) { bump(id, Math.round(delay(a) * -a.brv * .5)); a.brv = 0; } } // dívida de Coragem atrasa o personagem
  const B = S.battle, D = B.dom;
  if (D && D.by === id && --D.ttl <= 0) closeDomain('acabou o tempo'); else if (D && (!S.chars[D.by] || S.chars[D.by].hp <= 0)) closeDomain('o usuário caiu');
  if (B.wx?.ttl > 0 && --B.wx.ttl === 0) B.wx.k = scene().wx || '';
  for (let i = 0; i < 30; i++) { // início do turno do próximo: regen de Aura, dano contínuo, drenos, perda de turno, concentração e invocações
    const n = S.chars[current()];
    if (!n) return;
    n.bt ??= {};
    if (n.hp <= 0) { // contagem de morte
      n.dying = (n.dying ?? 3) - 1;
      if (n.dying <= 0) { n.dead = true; n.fell = true; delete n.dying; delete S.battle.ticks[n.id]; log(n.name, 'não resistiu e morreu.', 'bad'); }
      else { log(n.name, `está caído: ${n.dying} turno(s) até a morte`, 'bad'); bump(n.id, delay(n)); }
      continue;
    }
    if (S.battle.dom?.tick && n.enemy !== S.battle.dom.side && !n.summon) applySt(n, S.battle.dom.tick, 1);
    if (n.summon && --n.summon.ttl < 0) { log(n.name, 'se dissipa.', ''); n.dead = true; delete S.battle.ticks[n.id]; continue; }
    n.aura = Math.min(n.auraMax, n.aura + Math.max(1, Math.round(n.auraMax / 10)));
    if (n.st.regen) { const v = Math.max(1, Math.round(n.hpMax / 20 / (n.boss ? 3 : 1))); /* como o dano contínuo; chefes têm HP inflado e agem duas vezes */ n.hp = Math.min(n.hpMax, n.hp + v); healBody(n, v); log(n.name, `regenera ${v} HP.`, 'ok', { fx: { id: n.id, heal: v } }); }
    if (n.st.dread) { const v = Math.max(1, Math.round(n.sanMax / 12)); n.san = Math.max(0, n.san - v); log(n.name, `é corroído pelo pavor: −${v} de Sanidade.`, 'bad'); }
    const f = n.form && S.skills[n.form];
    if (f?.form?.dr && n.st.form) { // transformação drena a cada turno; sem recurso, ela acaba
      const dr = f.form.dr, short = Object.entries(dr).find(([r, v]) => r === 'hp' ? n.hp <= Math.ceil(n.hpMax * v / 100) : n[r] < v);
      if (short) endForm(n, true); else for (const [r, v] of Object.entries(dr)) { if (r === 'hp') n.hp = Math.max(1, n.hp - Math.ceil(n.hpMax * v / 100)); else n[r] -= v; }
    }
    if (vows(n).includes('tempo')) n.hp = Math.max(1, n.hp - Math.ceil(n.hpMax * .04));
    const dots = DOT.filter(k => n.st[k]).length;
    if (dots) {
      const d = dots * Math.max(1, Math.round(n.hpMax / 20));
      log(n.name, `sofre ${d} de dano contínuo.${hurt(n, d)}`, 'bad', { fx: { id: n.id, dmg: d } });
      if (!n.hp) { bump(n.id, delay(n)); continue; }
    }
    trig(n, 'turn');
    const skip = n.st.broken ? 'quebrado' : n.st.stun ? 'atordoado' : n.st.frozen ? 'congelado' : n.st.sleep ? 'dormindo' : n.st.para && d100() <= 50 ? 'paralisado' : '';
    if (!skip) {
      if (n.chg) { // concentração: espera os turnos e solta sozinha
        if (--n.chg.n > 0) { log(n.name, `continua concentrando ${S.skills[n.chg.s]?.name || ''}…`, ''); tickSt(n); bump(n.id, delay(n)); continue; }
        const c = n.chg; delete n.chg; delete n.st.charge;
        let t = S.chars[c.t]; if (!t || t.dead || !(t.id in S.battle.ticks) || (t.hp <= 0 && t.enemy !== n.enemy)) t = pick(battlers().filter(o => o.enemy !== n.enemy && o.hp > 0));
        if (t && doAct(n, { skill: c.s, target: t.id, aim: c.aim, release: true })) return;
        continue;
      }
      if (n.summon) { aiAct(n); return; } // invocações agem sozinhas
      return;
    }
    log(n.name, `está ${skip} e perde o turno`, 'bad'); n.imm = 3;
    tickSt(n); bump(n.id, delay(n));
  }
}

function redirect(a, t) { // provocar, guarda-costas e furtividade mudam o alvo de golpes únicos
  if (t.enemy === a.enemy) return t;
  const side = battlers().filter(o => o.enemy === t.enemy && o.hp > 0);
  const tz = side.filter(o => o.st.taunt); if (tz.length && !tz.includes(t)) t = tz[0];
  if (t.st.stealth && !a.st.focus) { const vis = side.filter(o => !o.st.stealth); if (vis.length) t = pick(vis); }
  const g = t.st.guarded && S.chars[t.guardBy]; if (g && g.hp > 0 && g.id in S.battle.ticks && g.enemy === t.enemy) t = g;
  return t;
}
function ammoFor(a, s) { // munição equipada: dá o elemento por N tiros, só em armas de fogo
  const id = a.equip?.mun, am = S.items[id];
  if (!am || am.type !== 'mun' || wtype(a) !== 'fogo' || !(s.basic || s.req === 'fogo') || s.kind === 'mental') return null;
  a.shots ??= {};
  if (!(a.shots[id] > 0)) { if (!(a.inv[id] > 0)) { delete a.equip.mun; return null; } if (--a.inv[id] <= 0) delete a.inv[id]; a.shots[id] = am.shots + OF.hook(a, 'tiros'); log(a.name, `abre um pacote de ${am.name} (${a.shots[id]} tiros).`, ''); }
  a.shots[id]--; return am;
}
function strike(a, s, t, aim, bonus = 0, o = {}) {
  const am = ammoFor(a, s); if (am) s = { ...s, el: am.el };
  const ma = modsOf(a, s), stat = at(a, s.attr) - sanPen(a), stTxt = s.st ? ` [${STN[s.st]}]` : '';
  if (s.kind === 'heal' || s.kind === 'util') {
    const fallen = t.hp <= 0; let txt = '';
    if (s.kind === 'heal') {
      const v = Math.max(1, Math.round((s.power + Math.floor(stat / R.healDiv)) * (t.st.curse ? .5 : 1) * (1 + ma.heal / 100)));
      t.hp = Math.min(t.hpMax, t.hp + v); delete t.dying; healBody(t, v); txt = `cura ${v} HP`;
      if (t === a && vows(a).includes('corpo')) breakVow(a, 'corpo', 'curou a si mesmo');
    }
    if (s.st) applySt(t, s.st);
    txt += hitFx(a, s, t, { d: 0, stat, fallen });
    log(a.name, `${s.name} → ${t.name}${txt ? ': ' + txt.trim() : ''}${stTxt}`, 'ok', { fx: { id: t.id, heal: s.kind === 'heal' ? 1 : 0, a: a.id, s: s.name, el: s.el } });
    if (s.kind === 'heal' && t !== a) trig(a, 'heal', t);
    return false;
  }
  const sure = s.fx?.some(f => f.t === 'sure');
  if (t.st.evade && !s.area && !sure && !o.counter) { delete t.st.evade; log(a.name, `${s.name} → ${t.name}: esquivou!`, 'bad', { fx: { id: t.id, miss: 1, a: a.id, s: s.name, el: s.el } }); return false; }
  const chance = sure ? 95 : int(stat + R.hit - (t.st.root ? 0 : Math.floor(at(t, 'AGI') / 2)) - (a.st.fear ? 20 : 0) - (a.st.curse ? 10 : 0) - (a.st.blind ? 25 : 0) - (a.st.exaus ? 15 : 0) + (a.st.focus ? 15 : 0) + (a.st.stealth ? 25 : 0) + ma.hit + (climaOf()?.[1].hit || 0) + (t.st.marked ? 20 : 0) - (aim ? BODY[aim][2] : 0) + bonus, 5, 95), r = d100();
  if (r > chance) {
    if (r >= 96) addLimit(a, 20);
    log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${r >= 96 ? 'DESASTRE' : 'errou'}`, 'bad', { d: r, rr: { l: s.name, t: chance, res: r >= 96 ? 'DESASTRE' : 'Errou', c: a.id, atk: 1 }, fx: { id: t.id, miss: 1, a: a.id, s: s.name, el: s.el } });
    trig(a, 'miss', t);
    return false;
  }
  a.bt ??= {}; if (!a.bt.prey && t.enemy !== a.enemy) a.bt.prey = t.id; // Voto da Presa: o primeiro inimigo ferido
  const wk = !!aim && t.weakPart === aim; // ponto fraco do chefe: dano dobrado
  const crit = r <= Math.max(1, Math.floor(chance / 10) * (a.st.stealth ? 2 : 1) + ma.crit), mental = s.kind === 'mental', w = t.weak.includes(s.el), rs = t.resist.includes(s.el) || t.vinc.includes(s.el) || eq(t, 'acess')?.el === s.el, down = w && !t.st.down;
  a.bt ??= {}; const wu = (s.basic || s.req) && a.up?.[a.equip?.arma], olho = !a.bt.olho && OF.hook(a, 'olho') && !mental0(s) ? OF.hook(a, 'olho') : 0;
  const mt = modsOf(t), pierce = Math.min(100, (s.fx?.find(f => f.t === 'pierce')?.p || 0) + (wu?.living && stageOf(wu.kills) >= 3 && s.basic ? 40 : 0) + olho), rx = reactOf(s, t);
  if (olho) a.bt.olho = 1;
  const mult = (crit ? 2 : 1) * (w ? 1.5 : 1) * (rs ? .5 : 1) * (a.st.atkUp ? 1.25 : 1) * (a.st.atkDn ? .75 : 1) * (a.st.fury ? 1.25 : 1) * (t.st.defUp ? .75 : 1) * (t.st.defDn ? 1.25 : 1) * (t.st.down ? 1.25 : 1) * (t.st.frozen ? 1.25 : 1) * (wk ? 2 : 1)
    * (1 + ma.atk / 100) * Math.max(.3, 1 - mt.def / 100) * vowMult(a, s, t) * fxMult(a, s, t) * (o.mult || 1) * (mental && t.st.dread ? 1.25 : 1) * (a.st.exaus ? .85 : 1)
    * (t.st.broken ? 1.5 : 1) * (rx?.m || 1) * (climaOf()?.[1][s.el] || 1) * (o.noten ? 1 : TEN[a.ten || 0]);
  const armor = mental || t.st.exposed ? 0 : (t.armor + (eq(t, 'armadura')?.power || 0) + (t.up?.[t.equip?.armadura]?.p || 0)) * (1 - pierce / 100);
  const d = Math.max(1, Math.round((s.power + Math.floor(stat / R.dmgDiv / (s.hits || 1)) + (o.plus || 0) - armor) * mult)); // multi-golpe divide o bônus do atributo; a armadura conta em cada golpe
  a.marks[s.attr] = true;
  let extra = '', part = '';
  const was = t.hp > 0;
  if (mental) t.san = Math.max(0, t.san - d);
  else { // localiza o golpe: parte mirada ou sorteio ponderado
    let roll = Math.random() * 100;
    part = aim || PARTS.find(k => (roll -= BODY[k][3]) < 0) || 'torso';
    const lv = lvl(t, part);
    t.body[part] = (t.body[part] || 0) + d;
    extra = hurt(t, d, a);
    if (t.hp > 0 && lv < 2 && lvl(t, part) === 2) { applySt(t, BODY[part][1]); extra += ` ${PL[part]} em estado crítico!`; }
  }
  if (wk) extra = ' PONTO FRACO!' + extra;
  if (rx) { rx.on.forEach(k => delete t.st[k]); if (t.hp > 0 && rx.a) applySt(t, rx.a[0], rx.a[1]); extra += ` [Reação: ${rx.n}]`; }
  if (t.hp > 0) { if (s.st) applySt(t, s.st); if (down) t.st.down = 1; }
  if (wu && t.hp > 0 && !mental) { // engastes e segundo elemento da liga
    for (const rn of wu.g || []) { const Ru = OF.RUNAS[rn]; if (Ru?.st && Math.random() * 100 < Ru.st[2]) { applySt(t, Ru.st[0], Ru.st[1]); extra += ` [${STN[Ru.st[0]]}: ${rn}]`; } if (Ru?.drain && a.hp > 0) a.hp = Math.min(a.hpMax, a.hp + Math.max(1, Math.round(d * Ru.drain / 100))); }
    if (wu.el2 && Math.random() < .3) { const e2 = OF.ELST[wu.el2]; if (e2) applySt(t, e2[0], e2[1]); }
  }
  if (s.el === 'susanoo' && t.hp > 0 && !mental && !rx && (S.battle.wx?.k === 'chuva' || Math.random() < .35)) applySt(t, 'wet', 2); // a água molha
  if (t.hp > 0 && t.brk && !o.counter) { const n = (w ? 1 : 0) + (wk ? 1 : 0); if (n) extra += brkHit(t, n, a); }
  extra += hitFx(a, s, t, { d, stat });
  if (!mental && t.st.reflect && t !== a && a.hp > 0) { const rd = Math.max(1, Math.round(d * .3)); extra += ` ${t.name} reflete ${rd}.${hurt(a, rd, t)}`; }
  log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${crit ? 'CRÍTICO! ' : ''}${d} de dano${mental ? ' mental' : ` (${PL[part]})`}${w ? ' (fraqueza)' : rs ? ' (resistiu)' : ''}${stTxt}.${extra}`, 'ok', { d: r, rr: { l: s.name, t: chance, res: crit ? 'CRÍTICO' : 'Acertou', c: a.id, atk: 1 }, fx: { id: t.id, dmg: d, crit, el: s.el, a: a.id, s: s.name, w } });
  if (!o.nochain) addChain(a, w ? 15 : crit ? 10 : 4);
  if (w) a.bt.wkNow = true;
  if (crit) trig(a, 'crit', t);
  if (w) trig(a, 'weak', t);
  if (t.st.counter && t.hp > 0 && !mental && !s.area && !o.counter && a.hp > 0 && t !== a && t.enemy !== a.enemy && !skipping(t)) { log(t.name, 'contra-ataca!', 'ok'); strike(t, basicOf(t), a, null, 0, { counter: true }); }
  return down && was;
}
// ---------- ação de combate (jogador aprovado, mestre, IA, concentração liberada) ----------
function doAct(a, m, bonus = 0) {
  const s = m.skill === 'atk' ? basicOf(a) : a.skills.includes(m.skill) && effSkill(a, m.skill);
  if (!s || (!m.release && cantUse(a, s))) return false;
  let t0 = s.tg === 'self' || s.kind === 'form' ? a : S.chars[m.target];
  if (!t0 || !(t0.id in S.battle.ticks)) return false;
  if (!m.release) {
    a[s.res] -= s.cost;
    if (s.limit) a.limit = 0;
    for (const [r, v] of Object.entries(s.pay || {})) { if (r === 'hp') a.hp = Math.max(1, a.hp - Math.ceil(a.hpMax * v / 100)); else a[r] = Math.max(0, a[r] - v); }
    if (s.useComp) { const k = compOf(a); if (k && --a.inv[k] <= 0) delete a.inv[k]; }
    if (s.dom) { openDomain(a, s); endTurn(a.id, s.ct); return true; }
    if (s.chg) { a.chg = { s: m.skill, t: t0.id, aim: m.aim, n: s.chg }; a.st.charge = 99; log(a.name, `começa a concentrar ${s.name}…`, 'ok'); endTurn(a.id, 100); return true; }
  }
  const stat = at(a, s.attr) - sanPen(a);
  if (s.kind === 'form') {
    if (a.form) endForm(a, false);
    a.form = m.skill; a.st.form = s.form.dur + 1;
    log(a.name, `assume a forma ${s.name}!`, 'ok', { fx: { id: a.id, a: a.id, s: s.name, el: s.el, heal: 0 } });
    const t = hitFx(a, s, a, { stat }); if (t) log(a.name, t.trim(), 'ok');
    onceFx(a, s, stat);
    endTurn(a.id, s.ct); return true;
  }
  const inB = battlers(), heal = s.kind === 'heal', util = s.kind === 'util', off = !heal && !util;
  const mates = inB.filter(o => o.hp > 0 && o.enemy === a.enemy && o !== a);
  const ts = off && (a.st.possess || a.san <= 0) && mates.length ? [pick(mates)] // possuído, ou em colapso de Sanidade, ataca os próprios aliados
    : s.area ? inB.filter(o => o.enemy === t0.enemy && (o.hp > 0 || heal)) : [a.st.confuse ? pick(inB.filter(o => o.hp > 0)) : off ? redirect(a, t0) : t0];
  const prs = linksOf(s) ? partners(a, s) || [] : [], plus = prs.reduce((v, pr) => v + Math.floor(at(pr.p, pr.ps.attr) / R.dmgDiv) + (pr.p.enemy ? 0 : 2 * bondLv(a, pr.p)), 0);
  for (const pr of prs) { pr.p[pr.ps.res] -= pr.ps.cost; bump(pr.p.id, delay(pr.p)); }
  if (prs.length) log(a.name, `e ${prs.map(pr => pr.p.name).join(' e ')} executam juntos ${s.name}!`, 'ok');
  let more = false; a.bt ??= {}; a.bt.wkNow = false;
  const aim = !s.area && off && PARTS.includes(m.aim) ? m.aim : null;
  for (const t of ts) for (let h = 0; h < (s.hits || 1); h++) { if (t.dead || (off && h && t.hp <= 0)) break; more = strike(a, s, t, aim, bonus, { plus }) || more; }
  const ch = s.fx?.find(f => f.t === 'chain');
  if (ch && off && ts.length === 1) inB.filter(o => o.enemy === ts[0].enemy && o !== ts[0] && o.hp > 0).sort(() => Math.random() - .5).slice(0, ch.n).forEach((o, i) => strike(a, s, o, null, bonus, { mult: ch.m ** (i + 1), plus }));
  onceFx(a, s, stat);
  if (s.summon) summonOf(a, s);
  if (s.back && a.hp > 0) { a.st[s.back] = 3; log(a.name, `paga o preço do poder proibido [${STN[s.back]}]`, 'bad'); }
  if (off && a.st.stealth) delete a.st.stealth;
  if (s.fx?.some(f => f.t === 'turn') && a.hp > 0) more = true;
  const haste = s.fx?.find(f => f.t === 'haste' && f.to === 'self'), wkNow = a.bt.wkNow;
  if (off) a.ten = 0; // a Tensão acumulada vai toda neste golpe
  chainBurst(a);
  const al = S.chars[m.pass];
  if (wkNow && al && al.id !== a.id && al.enemy === a.enemy && al.hp > 0 && al.id in S.battle.ticks && !skipping(al) && a.hp > 0) { // Passar a Vez: depois de uma fraqueza, entrega o turno a um aliado com bônus
    S.battle.ticks[al.id] = S.battle.ticks[a.id] - .5; applySt(al, 'atkUp', 2); log(a.name, `passa a vez para ${al.name}!`, 'ok');
    endTurn(a.id, s.ct); return true;
  }
  if (!more && m.brave && a.hp > 0 && (a.brv || 0) > -2) { a.brv = (a.brv || 0) - 1; more = true; log(a.name, `gasta Coragem (${a.brv}) para agir de novo${a.brv < 0 ? ' — fica devendo tempo' : ''}.`, 'ok'); } // Coragem: ação extra, pagando com pontos ou com tempo
  if (more && a.hp > 0) log(a.name, 'MAIS UM turno!', 'ok'); else endTurn(a.id, Math.round((s.ct || 100) * (haste ? 1 - haste.v / 100 : 1) * (wkNow ? .75 : 1)));
  return true;
}
function summonOf(a, s) { // invocação: aliado temporário que age sozinho, com atributos tirados do invocador
  const d = SUMMONS[s.summon]; if (!d) return;
  for (const o of Object.values(S.chars)) if (o.summon?.by === a.id && o.summon.k === s.summon) { o.dead = true; delete S.battle.ticks[o.id]; }
  const id = rid(), base = at(a, s.attr), ch = S.chars[id] = { ...newChar(id, a.enemy, a.owner), name: s.summon, color: d.c, x: a.x, y: a.y, scene: a.scene, summon: { by: a.id, ttl: d.ttl, k: s.summon }, xpR: 0, goldR: 0 };
  for (const k of ATTRS) ch.attrs[k] = int(base * .6, 10, 95);
  for (const k of d.a) ch.attrs[k] = int(base * .9 + 5, 10, 95);
  ch.skills = d.sk.map(n => Object.keys(S.skills).find(k => S.skills[k].name === n)).filter(Boolean);
  Object.assign(ch, { resist: d.el ? [d.el] : [], arma: d.arma ?? 8, armor: d.armor || 0, bt: {} });
  derive(ch); ch.bon.hpMax = Math.round(a.hpMax * d.hp) - ch.hpMax; derive(ch); ch.hp = ch.hpMax; ch.aura = ch.auraMax; ch.san = ch.sanMax;
  S.battle.ticks[id] = S.battle.ticks[a.id] + Math.round(delay(ch) / 2);
  log(a.name, `invoca ${s.summon}!`, 'ok');
}
// IA: Limite, transformação, reerguer caído, curar, purificar, invocar, buffs, dano; serve para inimigos e invocações
function aiAct(a) {
  const all = battlers(), alive = all.filter(o => o.hp > 0), foesAll = alive.filter(o => o.enemy !== a.enemy), mates = alive.filter(o => o.enemy === a.enemy);
  if (!foesAll.length) return endTurn(a.id);
  const foes = foesAll.filter(o => !o.st.stealth || a.st.focus).length ? foesAll.filter(o => !o.st.stealth || a.st.focus) : foesAll;
  const K = k => S.skills[k], has = (k, t) => K(k).fx?.some(f => f.t === t), pw = k => K(k).power * (K(k).hits || 1) * (K(k).area ? 1.5 : 1);
  const strong = l => { const o = [...l].sort((x, y) => pw(y) - pw(x)); return Math.random() < .6 ? pick(o.slice(0, 3)) : pick(o); }; // repertório grande: prefere os golpes mais fortes
  const usable = a.skills.filter(k => K(k) && K(k).kind !== 'passive' && !cantUse(a, effSkill(a, k)));
  const lim = usable.find(k => K(k).limit); // Limite carregado tem prioridade
  const hurt0 = [...mates].sort((x, y) => x.hp / x.hpMax - y.hp / y.hpMax)[0], fallen = all.filter(o => o.enemy === a.enemy && o.hp <= 0 && !o.dead);
  const heals = usable.filter(k => K(k).kind === 'heal' && K(k).power > 0), buffs = usable.filter(k => (K(k).kind === 'heal' && !K(k).power || K(k).kind === 'util') && !K(k).summon && !has(k, 'revive'));
  const hits = usable.filter(k => K(k).kind === 'dmg' && !K(k).limit), mental = usable.filter(k => K(k).kind === 'mental' && !K(k).limit);
  const forms = usable.filter(k => K(k).kind === 'form'), revs = usable.filter(k => has(k, 'revive')), sums = usable.filter(k => K(k).summon), cl = usable.filter(k => has(k, 'cleanse'));
  const sick = mates.find(o => RU.NEG.filter(k => o.st[k]).length >= 2);
  const tgt = Math.random() < R.aiFocus ? [...foes].sort((x, y) => x.hp - y.hp)[0] : pick(foes), mOk = mental.length && tgt && tgt.san > 0;
  if (a.hcd > 0) a.hcd--; // intervalo entre curas, para ninguém se curar sem parar
  let skill = 'atk', t = tgt;
  if (lim) skill = lim;
  else if (forms.length && !a.form && (a.rage || Math.random() < .2)) { skill = pick(forms); t = a; }
  else if (revs.length && fallen.length && !a.hcd && Math.random() < .5) { skill = pick(revs); t = fallen[0]; a.hcd = 4; } // reerguer divide o intervalo das curas, senão dois curandeiros se revezam para sempre
  else if (heals.length && !a.hcd && hurt0.hp < hurt0.hpMax * .5 && Math.random() < .6) { skill = pick(heals); t = hurt0; a.hcd = 4; }
  else if (cl.length && sick && Math.random() < .5) { skill = pick(cl); t = sick; }
  else if (sums.length && !alive.some(o => o.summon?.by === a.id) && Math.random() < .25) { skill = pick(sums); t = a; }
  else if (buffs.length && Math.random() < .12) { skill = pick(buffs); t = pick(mates); }
  else if (hits.length && Math.random() < (mOk ? .45 : .7)) skill = strong(hits);
  else if (mOk && Math.random() < .6) skill = pick(mental); // dano mental continua sorteado: escolher sempre o mais forte leva o grupo ao colapso de Sanidade
  const ks = K(skill);
  if (ks && ['heal', 'util'].includes(ks.kind) && t?.enemy !== a.enemy) t = has(skill, 'revive') && fallen.length ? fallen[0] : ks.power ? hurt0 : pick(mates); // cura e suporte (inclusive o Limite) vão para o próprio lado
  if (ks && (ks.tg === 'self' || ks.kind === 'form')) t = a;
  if (!t || !doAct(a, { skill, target: t.id })) { if (!doAct(a, { skill: 'atk', target: tgt.id })) endTurn(a.id); }
}

const undoStack = [], NOUNDO = new Set(['undo', 'chat', 'fog', 'move', 'roll', 'userAdd', 'userPass', 'userDel', 'reqNo', 'autoSet']);
const newChar = (id, enemy, owner) => ({ id, name: enemy ? 'Inimigo' : 'Herói', owner, enemy, scene: S.scene,
  color: enemy ? '#e60012' : '#00b7ff', img: '', attrs: Object.fromEntries(ATTRS.map(a => [a, enemy ? R.enemyAttr : 40])), marks: {}, hp: 999, aura: 999, san: 999,
  limit: 0, xp: 0, gold: 0, x: 0, y: 0, ...structuredClone(EXTRA), xpR: enemy ? R.enemyXp : 0, goldR: enemy ? 10 : 0, arma: 8, armor: 0, weak: [], resist: [], skills: [], st: {}, inv: {}, equip: {} });
const TIER = { fraco: [.8, .6], normal: [1, 1], elite: [1.25, 1.6] }; // multiplicadores de atributos e de recompensa
// monta um modelo de inimigo a partir das tabelas de content.js (skills por nome ou por filtro)
const makeFoe = (name, color, attrs, weak, resist, skills, o = {}) => {
  const ids = typeof skills === 'function' ? Object.keys(S.skills).filter(k => skills(S.skills[k])) : skills.map(n => Object.keys(S.skills).find(k => S.skills[k].name === n)).filter(Boolean);
  const ch = { ...newChar('', true, ''), name, color, weak, resist, skills: ids, ...o }; Object.assign(ch.attrs, attrs); return ch;
};
const loadScenes = () => SCENES.forEach(sc => { S.scenes[rid()] = newScene(sc.name, { bg: sc.bg, note: sc.note, gather: sc.gather.map(n => Object.keys(S.items).find(k => S.items[k].name === n)).filter(Boolean), shop: { open: false, stock: sc.stock.map(n => Object.keys(S.items).find(k => S.items[k].name === n)).filter(Boolean) } }); });
if (fresh) loadScenes();
const loadBestiary = () => { S.bestiary = Object.fromEntries(buildBestiary(makeFoe).map(ch => { const id = rid(); return [id, { ...ch, id }]; })); };
// o mestre também edita os modelos do bestiário com as mesmas ações de ficha
// passivas aplicam o bônus de forma permanente; sg = -1 desfaz (quando o mestre tira a skill)
const bonus = (ch, k, v) => { if (ATTRS.includes(k)) ch.attrs[k] = int(ch.attrs[k] + v, 1, 100); else if (Object.hasOwn(BASE, k)) { ch.bon[k] += v; ch[k.slice(0, -3)] = Math.max(0, ch[k.slice(0, -3)] + v); } };
const passive = (ch, s, sg) => {
  if (s.kind !== 'passive') return;
  const e = RU.nenEff(ch, s);
  if (s.bon) for (const [k, v] of Object.entries(s.bon)) bonus(ch, k, sg * Math.round(v * e));
  if (!['hpMax', 'auraMax', 'sanMax', 'res', ...ATTRS].includes(s.pas)) return; // voto, gatilho, modificador, amplificação: o motor lê na hora
  if (s.pas === 'res') { if (sg > 0) { if (!ch.resist.includes(s.el)) ch.resist.push(s.el); ch.weak = ch.weak.filter(e => e !== s.el); } else ch.resist = ch.resist.filter(e => e !== s.el); }
  else if (ATTRS.includes(s.pas)) ch.attrs[s.pas] = int(ch.attrs[s.pas] + sg * s.power, 1, 100);
  else { ch.bon[s.pas] += sg * s.power; ch[s.pas.slice(0, -3)] = Math.max(0, ch[s.pas.slice(0, -3)] + sg * s.power); }
};
const getCh = (c, id) => S.chars[id] || (c.role === 'gm' && Object.hasOwn(S.bestiary, id) ? S.bestiary[id] : undefined);
const spot = k => { const sc = scene(), C = Math.ceil(sc.cols), Rw = Math.ceil(sc.rows); return [Math.min(C - 1, Math.floor(C * .7) + k % 3), Math.min(Rw - 1, 1 + Math.floor(k / 3) % Math.max(1, Rw - 1))]; }; // espalha inimigos novos no lado direito
if (fresh) loadBestiary();
if (fresh) { // personagens base, sem dono: o mestre atribui ou o jogador assume
  const item = n => Object.keys(S.items).find(k => S.items[k].name === n);
  [['Shinkai', 'indra', '#f5c518', { AGI: 65, DES: 60, FOR: 50, CON: 40, INT: 50, SAB: 35 }, 'Katana de Caçador', 'Veloz e ofensivo: age muitas vezes e pune com lâmina e raio.', [3, 5]],
    ['Mikhail', 'fuhaku', '#3ddc97', { AGI: 60, INT: 60, DES: 55, CAR: 50, FOR: 35, SAB: 45 }, 'Revólver .38', 'Ágil e estrategista: controla o campo e a ordem dos turnos.', [2, 6]],
    ['Thomas', 'hiruko', '#8fd400', { FOR: 65, CON: 65, AGI: 30, SAB: 45, INT: 45, CAR: 35 }, 'Manoplas de Aço', 'Pesado e ofensivo: aguenta o castigo e devolve em dobro.', [3, 7]]]
    .forEach(([name, el, color, attrs, weapon, bio, [x, y]]) => {
      const id = rid(), ch = S.chars[id] = { ...newChar(id, false, ''), name, color, bio, xp: 30, x, y, vinc: [el] };
      Object.assign(ch.attrs, attrs);
      const w = item(weapon), tonic = item('Tônico'), root = Object.keys(S.skills).find(k => S.skills[k].el === el && S.skills[k].root);
      if (w) { ch.inv[w] = 1; ch.equip.arma = w; } if (tonic) ch.inv[tonic] = 2; if (root) ch.skills.push(root);
    });
}
// ----- gerador de inimigos sob medida para o grupo -----
const ROLES = { bruto: ['FOR', 'CON'], agil: ['AGI', 'DES'], conjurador: ['INT', 'SAB'], suporte: ['SAB', 'CAR'] }, ROLE_N = { bruto: 'Bruto', agil: 'Espreitador', conjurador: 'Conjurador', suporte: 'Arauto' };
const FOIL = { kagutsuchi: 'susanoo', susanoo: 'indra', atlas: 'fuhaku', indra: 'atlas', fuhaku: 'kagutsuchi', amaterasu: 'tsukuyomi', tsukuyomi: 'amaterasu', shukketsu: 'amaterasu', hiruko: 'susanoo' };
const ELCOL = { fis: '#8d8478', kagutsuchi: '#c2410c', susanoo: '#1d6fa5', atlas: '#8a6a3a', indra: '#b89400', fuhaku: '#2f8f6b', amaterasu: '#b8a44a', tsukuyomi: '#5b3fb0', shukketsu: '#8f0019', hiruko: '#5a8f00' };
// referência do grupo: quantos heróis estão na cena e o "poder" deles (média dos três maiores atributos de cada um)
const partyRef = () => {
  const pcs = Object.values(S.chars).filter(c => !c.enemy && !c.dead && c.scene === S.scene), top3 = c => ATTRS.map(a => at0(c, a)).sort((x, y) => y - x).slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  return { n: pcs.length || 4, p: pcs.length ? Math.round(pcs.reduce((a, c) => a + top3(c), 0) / pcs.length) : 58 };
};
function genFoe(el, role, rank, ref = partyRef()) {
  const K = R.rank[rank], [m1, m2] = ROLES[role], ch = newChar('', true, ''), up = Math.max(0, ref.p - 58) * (rank === 'chefe' ? R.rank.chefe.g : 1), P = ref.p + up * R.grow.attr, pool = Object.entries(S.skills).filter(([, s]) => s.el === el && s.kind !== 'passive' && !s.req && !s.back && !s.duo && !s.circ && !s.aw && !s.summon && !s.form?.m?.heal && (+String(s.br).split('-')[1] < 6 || ['dmg', 'mental', 'form'].includes(s.kind)) && (!s.limit || rank === 'chefe'));
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
  const id = rid(), ch = S.chars[id] = { ...structuredClone(tpl), id, x, y, scene: S.scene, tpl: tpl.tpl || tpl.name, known: S.known?.[tpl.tpl || tpl.name] || 0 }, [k, rw] = TIER[tier] || TIER.normal;
  if (k !== 1) { for (const a of ATTRS) ch.attrs[a] = int(ch.attrs[a] * k, 1, 100); ch.xpR = Math.round(ch.xpR * rw); ch.goldR = Math.round(ch.goldR * rw); ch.name += ` (${tier})`; }
  ch.hp = ch.aura = ch.san = 999;
  return ch;
}
const wtype = ch => eq(ch, 'arma')?.wt || 'punho'; // sem arma equipada luta com os punhos
const NUM = { xpR: 1, goldR: 1, arma: 1, armor: 1, gold: 1, po: 1, hp: 1, aura: 1, san: 1, x: 1, y: 1 };
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
  checar(ch, n, per, m, mod) { // teste narrativo; algumas ações pagam (ou cobram) ouro
    const R = ofiRoll(ch, per, mod, n.n);
    if (n.g && R.ok) { const v = n.g * (R.crit ? 2 : 1); ch.gold += v; log(ch.name, `ganha ${v} de ouro.`, 'ok'); }
    else if (n.g && per === 'jogos' && !R.ok) { const v = Math.min(ch.gold, R.dis ? n.g : Math.floor(n.g / 2)); ch.gold -= v; if (v) log(ch.name, `perde ${v} de ouro na aposta.`, 'bad'); }
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

const H = {
  addChar(c, m) {
    if (c.role !== 'gm') return; // personagens novos só pelo mestre; ele escolhe o dono
    const enemy = !!m.enemy, id = rid();
    S.chars[id] = newChar(id, enemy, enemy ? '' : String(m.owner || '').trim().slice(0, 30));
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
    else if ((GMF.has(f) || NUM[f] || f === 'limit') && !g) return; // recursos e posição só pelo mestre (o jogador move o token com 'move')
    else if (f === 'limit') ch.limit = int(m.v, 0, 100);
    else if (NUM[f]) { ch[f] = int(m.v); if (f === 'hp' && ch.hp > 0) { delete ch.dead; delete ch.dying; } }
    else if (f === 'name') ch.name = String(m.v).slice(0, 30) || '?';
    else if (f === 'color' && /^#[0-9a-f]{6}$/i.test(m.v)) ch.color = m.v;
    else if (f === 'img') ch.img = okUrl(m.v) ? m.v : '';
    else if (f === 'xp' && c.role === 'gm') ch.xp = int(m.v);
    else if (f === 'owner' && c.role === 'gm') ch.owner = String(m.v).trim().slice(0, 30);
    else if (f === 'bio') ch.bio = String(m.v).slice(0, 3000);
    else if (f === 'gmNote' && c.role === 'gm') ch.gmNote = String(m.v).slice(0, 3000);
    else if (f === 'nen' && c.role === 'gm') ch.nen = RU.NEN.includes(m.v) ? m.v : '';

  },
  move(c, m) { const ch = S.chars[m.id]; if (can(c, ch)) { ch.x = int(m.x, 0, Math.ceil(scene().cols) - 1); ch.y = int(m.y, 0, Math.ceil(scene().rows) - 1); } },
  place(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch) { ch.x = ch.y = onMap(ch) ? null : 0; ch.scene = S.scene; } },
  roll(c, m) {
    const ch = S.chars[m.id];
    if (!can(c, ch) || !ATTRS.includes(m.attr)) return;
    if (!m.rr) ch.lastRoll = { attr: m.attr, mod: int(m.mod, -100, 100) };
    const target = int(at(ch, m.attr) + int(m.mod, -100, 100) - sanPen(ch), 1, 95), r1 = d100(), r2 = d100();
    const mode = Math.max(-1, Math.min(1, (m.adv === 'adv' ? 1 : m.adv === 'dis' ? -1 : 0) + (ch.st?.focus ? 1 : 0) - (ch.st?.blind || ch.st?.exaus || ch.st?.fear ? 1 : 0))), r = mode > 0 ? Math.min(r1, r2) : mode < 0 ? Math.max(r1, r2) : r1; // vantagem: 2d100, fica o melhor; desvantagem: o pior
    const res = r <= Math.max(1, Math.floor(target / 10)) ? 'CRÍTICO' : r <= target ? 'Sucesso' : r >= 96 ? 'DESASTRE' : 'Falha';
    if (r <= target) ch.marks[m.attr] = true; // atributo usado com sucesso pode evoluir
    log(ch.name, `${m.attr} ${target}% → ${r}: ${res}${mode ? ` (${mode > 0 ? 'vantagem' : 'desvantagem'}: ${r1} e ${r2})` : ''}`, r <= target ? 'ok' : 'bad', { d: r, rr: { l: m.attr, t: target, res, c: ch.id }, ...((c.role === 'gm' || c.appr) && m.secret ? { to: GM } : {}) });
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
    log(ch.name, `Teste de horror SAB ${target}% → ${r}: ${r > target ? `perdeu ${loss} de Sanidade` : 'resistiu'}`, r > target ? 'bad' : 'ok', { d: r, rr: { l: 'Horror · SAB', t: target, res: r > target ? 'Falha' : 'Sucesso', c: ch.id } });
  },
  aw(c, m) { // mestre concede ou retira um Despertar (selo narrativo que libera nós)
    const ch = getCh(c, m.id);
    if (c.role !== 'gm' || !ch || !Object.hasOwn(RU.AW, m.k)) return;
    ch.aw = (ch.aw || []).includes(m.k) ? ch.aw.filter(k => k !== m.k) : [...(ch.aw || []), m.k];
    if (ch.aw.includes(m.k)) log(ch.name, `recebeu o Despertar: ${RU.AW[m.k]}.`, 'ok');
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
  // contas: só o mestre cria, troca a senha e apaga; o jogador pode trocar a própria senha
  userAdd(c, m) {
    if (c.role !== 'gm') return;
    const name = String(m.name || '').trim().slice(0, 30), err = msg => c.send(JSON.stringify({ t: 'err', msg }));
    if (!okName(name)) return err('Login inválido: sem espaços nem @, e não pode ser "mestre".');
    if (Object.hasOwn(S.users, name)) return err('Já existe uma conta com esse login.');
    if (String(m.pass || '').length < 4) return err('A senha precisa de pelo menos 4 caracteres.');
    S.users[name] = hash(m.pass);
    const ch = S.chars[m.char]; if (ch && !ch.enemy) ch.owner = name;
    log('Mestre', `criou a conta ${name}${ch && !ch.enemy ? ' para ' + ch.name : ''}.`, '', { to: GM });
  },
  userPass(c, m) {
    const name = c.role === 'gm' ? String(m.name || '') : c.role === 'player' ? c.name : '';
    if (!name || !Object.hasOwn(S.users, name)) return;
    if (String(m.pass || '').length < 4) return c.send(JSON.stringify({ t: 'err', msg: 'A senha precisa de pelo menos 4 caracteres.' }));
    S.users[name] = hash(m.pass);
    if (c.role === 'gm') kick(name, 'O mestre trocou a sua senha. Entre com a nova.');
    else { c.send(JSON.stringify({ t: 'passOk', pass: String(m.pass) })); kick(name, 'Sua senha foi trocada em outra janela. Entre com a nova.', c); }
  },
  userDel(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(S.users, m.name)) return;
    delete S.users[m.name];
    for (const ch of Object.values(S.chars)) if (ch.owner === m.name) ch.owner = '';
    kick(m.name, 'Sua conta foi removida pelo mestre.');
  },
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
    if (m.f === 'bbg') sc.bbg = BBG.includes(m.v) || okUrl(m.v) ? m.v : ''; // fundo da batalha: tema pronto, imagem própria ou '' (usa o mapa)
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
    all.forEach(o => { o.st = {}; delete o.dying; delete o.form; delete o.chg; delete o.sealD; delete o.guardBy; delete o.bt; delete o.brv; delete o.ten; delete o.brk; o.shield = 0; });
    for (const [k, o] of Object.entries(S.chars)) if (o.summon) delete S.chars[k]; // invocações somem com o fim da luta
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
    if (!m.on && S.battle.active) { if (S.meal && --S.meal.left <= 0) delete S.meal; Object.values(S.chars).forEach(o => { delete o.sharp; }); } // refeição e arma afiada valem por uma batalha
    S.battle = { active: !!m.on, ticks: {}, chain: { h: 0, e: 0 }, wx: { k: scene().wx || '', ttl: 0 } };
    if (m.on) Object.values(S.chars).filter(ch => onMap(ch) && ch.hp > 0 && !ch.dead).forEach(ch => { ch.bt = {}; ch.shield = 0; ch.brk = ch.boss ? { max: 3, cur: 3 } : ch.rank === 'elite' ? { max: 2, cur: 2 } : undefined; if (!ch.brk) delete ch.brk; S.battle.ticks[ch.id] = delay(ch); });
    if (m.on) Object.keys(S.battle.ticks).forEach(k => trig(S.chars[k], 'start'));
    if (m.on) { // ganchos de ofício: emboscada, canção, armadilha e companheiros
      const hs = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && !o.enemy), emb = Math.max(0, ...hs.map(h => OF.hook(h, 'emb'))), T = S.battle.ticks;
      if (emb) hs.forEach(h => { T[h.id] = Math.round(T[h.id] * (1 - emb / 100)); });
      if (S.marcha) { hs.forEach(h => { h.st.focus = 3; }); delete S.marcha; }
      if (S.tenac) { hs.forEach(h => { h.st.endure = 1; }); delete S.tenac; }
      hs.forEach(spawnCompanions); trapStart();
    }
    log('Mestre', m.on ? 'Batalha iniciada!' : 'Batalha encerrada.');
  },
  // comandos de ritmo: Defender (Coragem), Concentrar (Tensão) e Ataque Total
  defend(c, m) {
    const a = S.chars[current()];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || a.hp <= 0) return;
    a.brv = Math.min(3, Math.max(0, a.brv || 0) + 1); applySt(a, 'defUp', 2);
    log(a.name, `se defende e guarda Coragem (${a.brv}/3).`, 'ok'); endTurn(a.id, 70);
  },
  focus(c, m) {
    const a = S.chars[current()];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || a.hp <= 0 || a.chg) return;
    a.ten = Math.min(3, (a.ten || 0) + 1);
    log(a.name, `concentra a Tensão (${a.ten}/3): o próximo golpe causa ×${TEN[a.ten]}.`, 'ok'); endTurn(a.id, 70);
  },
  allOut(c, m) {
    const a = S.chars[current()];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || a.hp <= 0 || skipping(a) || !allDown(a.enemy)) return;
    allOut(a); endTurn(a.id, 150);
  },
  weather(c, m) { // o mestre escolhe o clima da cena (vale já, se há batalha)
    if (c.role !== 'gm') return;
    const k = Object.hasOwn(RU.CLIMA, m.k) ? m.k : '';
    scene().wx = k; if (S.battle.active) S.battle.wx = { k, ttl: 0 };
    log('Mestre', k ? `Clima: ${RU.CLIMA[k][0]}.` : 'O clima volta ao normal.');
  },
  ai(c) { const a = S.chars[current()]; if (c.role === 'gm' && S.battle.active && a?.enemy) aiAct(a); }, // IA do inimigo da vez
  ini(c, m) { // mestre ajusta a fila: adiantar, atrasar, tirar ou incluir na batalha
    const ch = S.chars[m.id], T = S.battle.ticks;
    if (c.role !== 'gm' || !S.battle.active || !ch) return;
    if (m.k === 'in') { if (!(ch.id in T) && ch.hp > 0) { T[ch.id] = Math.max(0, ...Object.values(T)) + 1; ch.bt = {}; } }
    else if (!(ch.id in T)) return;
    else if (m.k === 'out') delete T[ch.id];
    else if (m.k === 'set') T[ch.id] = int(m.v, 0, 999999);
    else T[ch.id] = Math.max(0, T[ch.id] + (m.k === 'up' ? -1 : 1) * Math.ceil(delay(ch) / 2));
  },
  next(c) { const id = current(); if (S.battle.active && id && can(c, S.chars[id])) endTurn(id, 50); }, // passar custa metade do tempo
  act(c, m) {
    const a = S.chars[current()];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a)) return;
    doAct(a, m, c.role === 'gm' || c.appr ? int(m.mod, -100, 100) : 0); // bônus ou penalidade dado pelo mestre ao aprovar
  },
  pslot(c, m) { // liga ou desliga uma passiva ativa (só no acampamento ou pelo mestre, fora de batalha)
    const ch = S.chars[m.id];
    if (!can(c, ch) || ch.enemy || S.battle.active || !(c.role === 'gm' || S.camp.open) || !slotted(S.skills[m.skill]) || !ch.skills.includes(m.skill)) return;
    normSlots(ch); ch.pslotOff ??= [];
    if (ch.pslots.includes(m.skill)) { ch.pslots = ch.pslots.filter(k => k !== m.skill); ch.pslotOff.push(m.skill); log(ch.name, `desativa ${S.skills[m.skill].name}.`, ''); }
    else if (ch.pslots.length < slotMax(ch)) { ch.pslots.push(m.skill); ch.pslotOff = ch.pslotOff.filter(k => k !== m.skill); log(ch.name, `ativa ${S.skills[m.skill].name} (${ch.pslots.length}/${slotMax(ch)}).`, 'ok'); }
    normSlots(ch); // a vaga que sobrou é ocupada pela próxima passiva aprendida (desligue-a também para deixar vaga)
  },
  learn(c, m) {
    const ch = S.chars[m.id], s = S.skills[m.skill];
    if (!can(c, ch) || !s || RU.whyNot(ch, s, S.skills, S.items, m.skill)) return;
    ch.xp -= RU.xpCost(ch, s);
    if (s.cat && !ch.nen) { ch.nen = s.cat; log(ch.name, `descobre sua natureza de Aura: ${RU.NENN[s.cat]}.`, 'ok'); }
    ch.skills.push(m.skill);
    passive(ch, s, 1); normSlots(ch);
    log(ch.name, `aprendeu ${s.name}${slotted(s) && !ch.pslots.includes(m.skill) ? ' (sem slot livre: troque no acampamento)' : ''}`, 'ok');
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
    if (t.dead || (['bomb', 'oil'].includes(i.eff) && (!inB || t === ch)) || (i.eff === 'rev' && t.hp > 0) || (t.hp <= 0 && !['rev', 'hp'].includes(i.eff))) return;
    let txt = `+${i.power} ${i.eff.toUpperCase()}`, fx;
    if (i.eff === 'bomb') { // bomba: dano fixo do elemento, sem rolagem
      const d = Math.max(1, Math.round(i.power * (t.weak.includes(i.el) ? 1.5 : 1) * (t.resist.includes(i.el) ? .5 : 1)));
      txt = `${d} de dano${hurt(t, d)}`; fx = { fx: { id: t.id, dmg: d, el: i.el } };
    } else if (i.eff === 'oil') { applySt(t, 'oil', 3); txt = 'encharcado de óleo'; }
    else if (i.eff === 'cure') { for (const k of RU.NEG) delete t.st[k]; delete t.sealD; txt = 'condições removidas'; }
    else if (i.eff === 'body') { healBody(t, i.power); txt = 'ferimentos tratados'; }
    else if (i.eff === 'rev') { t.hp = Math.min(t.hpMax, i.power); delete t.dying; txt = 'de volta à luta'; }
    else { const v = Math.round(i.power * (i.eff === 'hp' && t.st.curse ? .5 : 1)); if (i.eff === 'hp') { delete t.dying; healBody(t, v); } t[i.eff] = Math.min(t[i.eff + 'Max'], t[i.eff] + v); }
    if (inB && t === ch && ['hp', 'rev'].includes(i.eff) && vows(ch).includes('corpo')) breakVow(ch, 'corpo', 'curou a si mesmo');
    H.drop(c, m);
    log(ch.name, `usou ${i.name}${t === ch ? '' : ' em ' + t.name} (${txt})`, 'ok', fx);
    if (inB) endTurn(ch.id);
  },
  // ----- descanso e acampamento -----
  camp(c, m) { if (c.role === 'gm') S.camp = { open: !!m.on, acts: {} }; },
  campAct(c, m) { const ch = S.chars[m.id]; if (S.camp.open && can(c, ch) && !ch.enemy && (CAMP.includes(m.k) || hasNode(ch, n => n.camp === m.k))) { S.camp.acts[m.id] = m.k; (S.camp.with ??= {})[m.id] = S.chars[m.w] && !S.chars[m.w].enemy && m.w !== m.id ? m.w : ''; } },
  rest(c, m) { // Sanidade não volta com descanso: só itens, skills, "conversar" no acampamento ou o mestre
    if (c.role !== 'gm' || S.battle.active) return;
    const pcs = Object.values(S.chars).filter(o => !o.enemy && !o.dead), long = !!m.long, notes = [], curto = Math.max(0, ...pcs.map(p => OF.hook(p, 'curto')));
    for (const p of pcs) {
      p.aura = p.auraMax; p.hp = long ? p.hpMax : Math.min(p.hpMax, p.hp + Math.ceil(p.hpMax * (.5 + curto / 100))); delete p.dying;
      for (const k of PARTS) p.body[k] = long ? 0 : Math.floor((p.body[k] || 0) / 2);
      if (long) { p.st = {}; delete p.afl; p.san = Math.min(p.sanMax, p.san + OF.hook(p, 'sonoSan')); const up = evolveCh(p); if (up.length) notes.push(`${p.name} evoluiu ${up.join(', ')}`); }
    }
    if (long && S.camp.open) {
      for (const [id, k] of Object.entries(S.camp.acts)) {
        const p = S.chars[id];
        if (!p) continue;
        if (k === 'vigiar') { p.st.agiUp = 3; if (OF.hook(p, 'vigia')) p.st.focus = 3; } else if (k === 'afiar') p.sharp = true;
        else if (k === 'armadilha') S.trap = { sang: !!OF.hook(p, 'trapSang'), stun: !!OF.hook(p, 'trapStun') };
        else if (k === 'cantar') { const v = OF.hook(p, 'cantar'), sf = OF.hook(p, 'sinfonia'); pcs.forEach(o => { o.san = Math.min(o.sanMax, o.san + v); if (sf) o.hp = Math.min(o.hpMax, o.hp + Math.ceil(o.hpMax * sf / 100)); }); if (OF.hook(p, 'marcha')) S.marcha = true; if (OF.hook(p, 'tenac')) S.tenac = true; }
        else if (k === 'cozinhar') pcs.forEach(o => o.st.atkUp = 3); else if (k === 'conversar') { p.san = Math.min(p.sanMax, p.san + 5); const w = S.chars[S.camp.with?.[id]]; if (w && !w.enemy) { const up = bondAdd(p, w, 1); if (up) notes.push(`o laço de ${p.name} e ${w.name} sobe para o nível ${up}`); } }
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
      const target = int(at(ch, 'DES') + man + OF.hook(ch, 'chase') - sanPen(ch), 1, 95), r = OF.hook(ch, 'semAcidente') ? Math.min(d100(), 95) : d100(), mv = r <= target ? vel : r >= 96 ? 0 : Math.floor(vel / 2);
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
    const price = i ? Math.max(1, Math.ceil(i.price * (1 - OF.hook(ch, 'desc') / 100))) : 0; // Lábia: desconto
    if (!can(c, ch) || !scene().shop.open || !i || !scene().shop.stock.includes(m.item) || ch.gold < price) return;
    ch.gold -= price; ch.inv[m.item] = (ch.inv[m.item] || 0) + 1;
    log(ch.name, `comprou ${i.name} por ${price}`, 'ok');
  },
  sell(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || !scene().shop.open || !i || !(ch.inv[m.item] > 0)) return;
    const got = Math.floor(i.price / 2 * (1 + OF.hook(ch, 'desc') / 100)); ch.gold += got; H.drop(c, m);
    log(ch.name, `vendeu ${i.name} por ${got}`, 'ok');
  },
  forge(c, m) { // forja com essências do elemento: arma = 3, relíquia = 5, mais metade do preço em ouro
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || S.battle.active || !i?.el || !['arma', 'acess'].includes(i.type)) return;
    const ess = Object.keys(S.items).find(k => S.items[k].type === 'mat' && S.items[k].el === i.el), need = i.type === 'arma' ? OF.hook(ch, 'essencia') || 3 : 5, cost = Math.round(i.price / 2);
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
  skTog(c, m) { // o mestre dá ou tira qualquer skill, sem custo; passivas aplicam ou desfazem o bônus
    const ch = getCh(c, m.id), s = S.skills[m.skill];
    if (c.role !== 'gm' || !ch || !s) return;
    const has = ch.skills.includes(m.skill);
    ch.skills = has ? ch.skills.filter(k => k !== m.skill) : [...ch.skills, m.skill];
    if (!ch.enemy) passive(ch, s, has ? -1 : 1);
  },
  // ----- pedidos: o jogador pede, o mestre aprova (com bônus, penalidade ou em segredo) ou nega -----
  reqOk(c, m) {
    const r = S.reqs[m.id];
    if (c.role !== 'gm' || !r) return;
    delete S.reqs[m.id];
    const mod = int(m.mod, -100, 100), n = S.seq;
    H[r.t]({ role: 'player', name: r.by, appr: true, send() {} }, { ...r.m, mod: int(r.m.mod, -100, 100) + mod, secret: !!m.secret && r.cat === 'roll', adv: r.cat === 'roll' && ['adv', 'dis'].includes(m.adv) ? m.adv : '' });
    tell(r.by, S.seq === n && r.cat !== 'item' && r.cat !== 'camp' ? { kind: 'no', text: `${r.text}: não foi possível agora.` } : { kind: 'ok', text: `Aprovado: ${r.text}${mod ? ` (${mod > 0 ? '+' : ''}${mod})` : ''}` });
  },
  reqNo(c, m) {
    const r = S.reqs[m.id];
    if (!r || !(c.role === 'gm' || (c.role === 'player' && r.by === c.name))) return;
    delete S.reqs[m.id];
    if (c.role === 'gm') tell(r.by, { kind: 'no', text: `Negado: ${r.text}`, why: String(m.why || '').slice(0, 120) });
  },
  autoSet(c, m) { if (c.role === 'gm' && Object.hasOwn(S.auto, m.k)) S.auto[m.k] = !!m.v; },
  // ----- atalhos do mestre: mexer em um ou vários personagens de uma vez -----
  bulk(c, m) {
    if (c.role !== 'gm' || !Array.isArray(m.ids)) return;
    const v = int(m.v, 0, 9999), done = [];
    for (const ch of m.ids.slice(0, 40).map(id => S.chars[id]).filter(Boolean)) {
      if (m.k === 'dmg') { if (ch.dead || v < 1) continue; hurt(ch, v); }
      else if (m.k === 'heal') { if (ch.dead) continue; ch.hp = Math.min(ch.hpMax, ch.hp + v); delete ch.dying; healBody(ch, v); }
      else if (m.k === 'aura' || m.k === 'san') ch[m.k] = Math.min(ch[m.k + 'Max'], ch[m.k] + v);
      else if (m.k === 'xp' || m.k === 'gold') ch[m.k] += v;
      else if (m.k === 'full') { ch.hp = ch.hpMax; ch.aura = ch.auraMax; ch.san = ch.sanMax; ch.body = {}; ch.st = {}; delete ch.dying; delete ch.dead; }
      else if (m.k === 'st' && STK.includes(m.st)) { if (ch.st[m.st]) delete ch.st[m.st]; else applySt(ch, m.st); }
      else if (m.k === 'item' && Object.hasOwn(S.items, m.item)) ch.inv[m.item] = (ch.inv[m.item] || 0) + 1;
      else continue;
      done.push(ch.name);
    }
    const T = { dmg: `${v} de dano`, heal: `cura de ${v} HP`, aura: `+${v} Aura`, san: `+${v} Sanidade`, xp: `+${v} XP`, gold: `+${v} ouro`, full: 'tudo restaurado', st: STN[m.st], item: S.items[m.item]?.name };
    if (done.length) log('Mestre', `${T[m.k]} → ${done.join(', ')}`, m.k === 'dmg' ? 'bad' : 'ok');
  },
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
  // ----- ofícios (perícias) -----
  ofiAw(c, m) { // o mestre concede ou retira a Iniciação em uma perícia
    const ch = S.chars[m.id]; if (c.role !== 'gm' || !ch || ch.enemy || !OF.PER[m.per]) return;
    const has = ch.ofi.includes(m.per); ch.ofi = has ? ch.ofi.filter(p => p !== m.per) : [...ch.ofi, m.per];
    log('Mestre', `${ch.name} ${has ? 'perde' : 'recebe'} a Iniciação em ${OF.PER[m.per].n}.`, has ? '' : 'ok');
  },
  ofiLearn(c, m) {
    const ch = S.chars[m.id]; if (!can(c, ch) || typeof m.node !== 'string' || OF.whyNot(ch, m.node)) return;
    const [per, i] = m.node.split('.'), n = OF.PER[per].nodes[+i]; ch.po -= n.po; ch.pof.push(n.id);
    log(ch.name, `aprendeu ${n.n} (${OF.PER[per].n} · ${OF.GRAU[n.t]})`, 'ok');
  },
  ofiGive(c, m) { // o mestre dá ou tira um nó sem custo
    const ch = S.chars[m.id]; if (c.role !== 'gm' || !ch || ch.enemy || typeof m.node !== 'string' || !OF.PER[m.node.split('.')[0]]?.nodes[+m.node.split('.')[1]]) return;
    ch.pof = ch.pof.includes(m.node) ? ch.pof.filter(k => k !== m.node) : [...ch.pof, m.node];
  },
  ofiUse(c, m) { // uma ação de ofício (rolagem de perícia): coletar, tratar, identificar, forja...
    const ch = S.chars[m.id], n = ch && nodeOf(ch, m.node);
    if (!can(c, ch) || ch.enemy || !n?.act) return;
    const per = n.id.split('.')[0], mod = c.role === 'gm' || c.appr ? int(m.mod, -100, 100) : 0, inB = S.battle.active && ch.id in S.battle.ticks;
    if (inB && (n.act !== 'identificar' || current() !== ch.id)) return;
    const A = OFI_ACT[n.act]; if (A) A(ch, n, per, m, mod, inB);
  },
  craft(c, m) { // prepara uma receita; refeições viram o bônus da próxima batalha
    const ch = S.chars[m.id], r = OF.REC[m.rec];
    if (!can(c, ch) || !r || ch.enemy || S.battle.active || !hasNode(ch, n => n.id.startsWith(r.per + '.') && (n.rec || []).includes(r.id))) return;
    const mod = c.role === 'gm' || c.appr ? int(m.mod, -100, 100) : 0, mats = Object.fromEntries(Object.entries(r.mats).map(([k, q]) => [k, r.per === 'engenharia' && OF.hook(ch, 'barato') ? Math.max(1, Math.ceil(q / 2)) : q]));
    if (!haveMats(ch, mats)) return log(ch.name, `não tem o que precisa para ${r.n}: ${matsText(mats)}.`, 'bad');
    const R = ofiRoll(ch, r.per, mod + r.dc, `Preparar ${r.n}`);
    takeMats(ch, mats, R.ok ? 'all' : R.dis ? 'half' : 'one');
    if (!R.ok) return;
    if (r.meal) {
      const pcs = Object.values(S.chars).filter(o => !o.enemy && !o.dead), dbl = ['ensopado', 'sopa'].includes(r.id) && OF.hook(ch, 'dobro') ? 2 : 1;
      S.meal = { n: r.n, by: ch.name, left: OF.hook(ch, 'refDupla') ? 2 : 1, m: Object.fromEntries(Object.entries(r.meal).map(([k, v]) => [k, v * dbl])) };
      const sanUp = OF.hook(ch, 'sanRef'); pcs.forEach(o => { if (sanUp) o.san = Math.min(o.sanMax, o.san + sanUp); if (r.san) o.san = Math.max(0, o.san - r.san); });
      return log(ch.name, `serve ${r.n}: ${r.mealD} para o grupo na próxima batalha.`, 'ok');
    }
    const k = itemId(r.out); if (!k) return;
    const qty = r.qty + OF.learned(ch, r.per).filter(n => n.hk === 'rende').reduce((a, n) => Math.max(a, n.v), 0) + (R.crit ? 1 : 0);
    ch.inv[k] = (ch.inv[k] || 0) + qty; log(ch.name, `prepara ${qty}× ${r.out}.`, 'ok');
  },
  reroll(c, m) { // Jogos de Azar: repete a última rolagem de atributo
    const ch = S.chars[m.id], L = ch?.lastRoll; if (!can(c, ch) || !L) return;
    const free = L.attr === 'SOR' && OF.hook(ch, 'rrSor');
    if (!free && (ch.rrUsed || 0) >= OF.hook(ch, 'rr')) return;
    if (!free) ch.rrUsed = (ch.rrUsed || 0) + 1;
    log(ch.name, `rola de novo ${L.attr}!`, 'ok'); H.roll(c, { id: ch.id, attr: L.attr, mod: L.mod, rr: 1 });
  },
  newSession(c) { if (c.role !== 'gm') return; Object.values(S.chars).forEach(o => { o.rrUsed = 0; }); log('Mestre', 'Nova sessão: as rolagens de novo foram renovadas.', 'ok'); },
  gatherSet(c, m) { // o mestre escolhe o que a cena oferece para colher
    if (c.role !== 'gm' || !S.items[m.item] || S.items[m.item].type !== 'mat') return;
    const g = scene().gather ??= []; scene().gather = m.on === false ? g.filter(k => k !== m.item) : g.includes(m.item) ? g : [...g, m.item];
  },
  edSet(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(SCH, m.coll) || !Object.hasOwn(SCH[m.coll], m.f) || !Object.hasOwn(S[m.coll], m.id)) return;
    const o = S[m.coll][m.id], r = SCH[m.coll][m.f], v = m.v;
    o[m.f] = r === 't' ? String(v).slice(0, 160) : r === 's' ? String(v).slice(0, 40) || '?' : r === 'n' ? int(v, 0, 999) : r === 'g' ? int(v, 0, 16) : r === 'b' ? !!v : r.includes(v) ? v : o[m.f];
  },
};

// executa uma mensagem de cliente; pedidos de jogador que exigem aprovação entram na fila em vez de acontecer
function handle(c, m) {
  if (!Object.hasOwn(H, m.t)) return;
  if (c.role === 'gm' && !NOUNDO.has(m.t)) { undoStack.push(JSON.stringify({ ...S, log: undefined, users: undefined })); if (undoStack.length > 20) undoStack.shift(); }
  const cat = c.role === 'player' && !c.ctl ? gateOf(m) : null;
  if (cat && !S.auto[cat]) { // vira um pedido (um por jogador: o novo substitui o anterior)
    const ch = S.chars[m.id];
    if (!can(c, ch) || (cat === 'act' && !(S.battle.active && current() === ch.id))) return;
    for (const [id, r] of Object.entries(S.reqs)) if (r.by === c.name) delete S.reqs[id];
    S.reqs[rid()] = { by: c.name, ch: ch.id, cat, t: m.t, text: reqText(m), n: ++S.seq,
      m: { node: m.node, rec: m.rec, rune: m.rune, el2: m.el2, sig: m.sig, nm: m.nm, part: m.part, part2: m.part2, id: m.id, w: m.w, attr: m.attr, mod: m.mod, skill: m.skill, target: m.target, aim: m.aim, item: m.item, k: m.k, pass: m.pass, brave: m.brave } };
    return push();
  }
  try { H[m.t](c, m); } catch (e) { console.error(e); } push();
}
const okName = n => !!n && !/[@\s]/.test(n) && n.toLowerCase() !== 'mestre';
const checkUser = (name, pass) => { const u = S.users[name]; return Object.hasOwn(S.users, name) && crypto.timingSafeEqual(Buffer.from(hash(pass, u.split(':')[0])), Buffer.from(u)); };
// o que o jogador pede e o mestre precisa aprovar, por tipo (S.auto[tipo] = true dispensa a aprovação)
const GATE = { roll: 'roll', act: 'act', learn: 'learn', use: 'item', equip: 'item', drop: 'item', buy: 'item', sell: 'item', forge: 'item', campAct: 'camp', ofiUse: 'roll', ofiLearn: 'learn', craft: 'item', reroll: 'roll', defend: 'act', focus: 'act', allOut: 'act' };
const gateOf = m => m.t === 'use' && S.battle.active && m.id in S.battle.ticks ? 'act' : GATE[m.t];
const reqText = m => { // frase curta que o mestre lê na fila
  const ch = S.chars[m.id], i = S.items[m.item], tg = S.chars[m.target], sg = v => (v > 0 ? '+' : '') + v;
  if (m.t === 'roll') return `rolar ${m.attr}${int(m.mod, -100, 100) ? ' ' + sg(int(m.mod, -100, 100)) : ''}`;
  if (m.t === 'act') return `${m.skill === 'atk' ? 'Ataque' : S.skills[m.skill]?.name || '?'} → ${tg?.name || '?'}${PARTS.includes(m.aim) ? ` (mira: ${PL[m.aim]})` : ''}`;
  if (m.t === 'learn') return `aprender ${S.skills[m.skill]?.name || '?'} (${S.skills[m.skill]?.xp ?? '?'} XP)`;
  if (m.t === 'campAct') return `acampamento: ${m.k}`;
  if (m.t === 'ofiUse') { const n = nodeOf(ch, m.node); return `ofício: ${n?.n || '?'}${tg ? ' → ' + tg.name : ''}${i ? ' · ' + i.name : ''}`; }
  if (m.t === 'craft') return `preparar ${OF.REC[m.rec]?.n || '?'}`;
  if (m.t === 'ofiLearn') return `aprender ofício ${OF.PER[String(m.node).split('.')[0]]?.nodes[+String(m.node).split('.')[1]]?.n || '?'}`;
  if (m.t === 'reroll') return 'rolar de novo';
  if (m.t === 'defend') return 'defender (Coragem)';
  if (m.t === 'focus') return 'concentrar Tensão';
  if (m.t === 'allOut') return 'ATAQUE TOTAL';
  const V = { use: 'usar', equip: ch?.equip[i?.type] === m.item ? 'tirar' : 'equipar', drop: 'descartar', buy: `comprar (${i?.price} ouro)`, sell: `vender (${Math.floor((i?.price || 0) / 2)} ouro)`, forge: 'forjar' };
  return `${V[m.t]} ${i?.name || '?'}${m.t === 'use' && tg && tg !== ch ? ' em ' + tg.name : ''}`;
};
const pruneReqs = () => { for (const [id, r] of Object.entries(S.reqs)) { const ch = S.chars[r.m.id]; if (!ch || ch.owner !== r.by || (r.cat === 'act' && !(S.battle.active && current() === ch.id))) delete S.reqs[id]; } };
const tell = (name, o) => wss.clients.forEach(x => x.role === 'player' && x.name === name && x.readyState === 1 && x.send(JSON.stringify({ t: 'note', ...o })));
const kick = (name, msg, except) => wss.clients.forEach(o => { if (o !== except && o.acct === name) { o.send(JSON.stringify({ t: 'err', bad: true, msg })); o.role = null; o.close(); } });
wss.on('connection', c => {
  c.role = null; // sem login não recebe nada
  c.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      const bad = msg => c.send(JSON.stringify({ t: 'err', bad: true, msg })), name = String(m.name || '').trim().slice(0, 30), pass = String(m.pass || '');
      // a mesa (TV) entra com a chave do mestre (login "mestre") ou com a conta de um jogador
      if (m.role === 'player' && m.as) { // o mestre confere a tela de um jogador: mesma visão, sem poder agir
        if (String(m.key) !== KEY) return bad('Chave do mestre incorreta.');
        c.role = 'player'; c.name = String(m.as).slice(0, 30); if (m.ctl) c.ctl = c.appr = true; else c.peek = true; // ctl: o mestre joga por esse jogador, sem fila de pedidos
        return sendState(c);
      }
      const asGm = m.role === 'gm' || (m.role === 'table' && name.toLowerCase() === 'mestre');
      if (asGm) { if (String(m.role === 'gm' ? m.key : pass) !== KEY) return bad('Chave do mestre incorreta.'); c.role = m.role === 'gm' ? 'gm' : 'table'; }
      else if (m.role === 'player' || m.role === 'table') {
        if (!checkUser(name, pass)) return bad('Login ou senha incorretos. As contas são criadas pelo mestre: confira com ele.');
        c.role = m.role; c.acct = name; if (m.role === 'player') c.name = name; // a TV não mostra os sussurros do dono da conta
      } else return;
      return sendState(c);
    }
    if (!c.role || c.peek) return;
    if (m.t === 'ping') { // marcação temporária no mapa: só retransmite, não altera o estado
      if (c.role === 'table') return;
      const p = JSON.stringify({ t: 'ping', x: int(m.x, 0, 99), y: int(m.y, 0, 99) });
      return wss.clients.forEach(o => o.role && o.readyState === 1 && o.send(p));
    }
    handle(c, m);
  });
});
prep();
export { genFoe, partyRef, fitBoss, spawn };
export { H, S, R, current, derive, modsOf, slotMax };
export { view, order, handle };
const isMain = SEA || process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  if (!fresh) { // cópia de segurança do estado a cada início (mantém as 10 mais recentes)
    const bk = path.join(DATA, 'backups'); fs.mkdirSync(bk, { recursive: true });
    fs.copyFileSync(FILE, path.join(bk, `state-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
    fs.readdirSync(bk).sort().slice(0, -10).forEach(f => fs.unlinkSync(path.join(bk, f)));
  }
}
if (isMain) {
  server.on('error', e => { // no executável a janela fecha sozinha; segura até o usuário ler a mensagem
    console.error(e.code === 'EADDRINUSE' ? `\nA porta ${PORT} já está em uso (o jogo já está aberto?). Use outra: defina PORT=3001.` : '\nErro: ' + e.message);
    if (SEA) { console.error('Feche esta janela para sair.'); setInterval(() => {}, 1 << 30); } else process.exit(1);
  });
  server.listen(PORT, () => {
    const ips = lan();
    console.log(`\n  virtualJRPG rodando\n\n  Mestre:     http://localhost:${PORT}/gm   (chave: ${KEY})\n  Mesa (TV):  http://localhost:${PORT}/table   (login "mestre" + a chave, ou a conta de um jogador)${ips.length ? `\n  Mesma rede Wi-Fi: ${ips.map(u => u + '/player').join('  ou  ')}` : ''}\n\n  Contas dos jogadores: crie na janela "Sessão" do painel do mestre.\n  Dados salvos em: ${DATA}\n  Feche esta janela para encerrar.\n`);
    if (process.env.VJ_TUNNEL === '0') return console.log('  Túnel desligado (VJ_TUNNEL=0): só a rede local funciona.\n');
    startTunnel({ port: PORT, dir: DATA, onChange: i => {
      net = i; wss.clients.forEach(o => o.role === 'gm' && sendState(o));
      console.log(i.status === 'ok' ? `\n  >>> Internet aberta. CÓDIGO DA SESSÃO: ${i.code}\n      Link para os jogadores: ${PORTAL}?c=${i.code}\n` : '  [túnel] ' + i.msg);
    } });
  });
}

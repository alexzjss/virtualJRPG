import { spawn as runCmd } from 'child_process';
import { Readable } from 'stream';
import { WebSocketServer } from 'ws';
import { startTunnel } from '../tunnel.js';
import zlib from 'zlib';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { AUD, DATA, GM, IMG, KEY, MIME, OF, PORT, PORTAL, PUB, SEA, UP, VEND, seaMod } from './config.js';
import { UPMAX, blocked, checkUser, clean, dirSize, flood, ipOf, magic, penalize, same } from './auth.js';
import { ATTRS, PARTS, PL } from './consts.js';
import { S, inScene, log, newScene, save } from './state.js';
import { SK, modsOf, breakCheck, delay, can, current, int, ofiSync, order, prep, reseat, rid, scene, usable } from './rules.js';
import { H, NOUNDO, undoPush } from './handlers.js';
import { nodeOf } from './oficios.js';


// ---------- http ----------
const hooks = { api: null, store: () => ({ camps: [], backups: [] }), view: (c, v) => v }; // preenchido por campaign.js (rotas /api e listas de campanhas e cópias)
// abre o painel do mestre no navegador já com a chave (ela vai depois do #, que nunca sai do computador)
const openGm = () => { const url = `http://localhost:${PORT}/gm#k=${encodeURIComponent(KEY)}`, [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { runCmd(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true }).on('error', () => {}).unref(); } catch {} };
// cabeçalhos de segurança: nada de adivinhar tipo, nada de abrir a mesa dentro de outro site, e o endereço (com o código da sessão) não vaza para links externos
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'SAMEORIGIN', 'Cross-Origin-Resource-Policy': 'same-origin' };
// as páginas só executam scripts do próprio servidor: mesmo que um nome ou texto malicioso escape da limpeza, não vira código
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: http: https:; media-src 'self' blob: http: https:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'";
const TEXT = new Set(['.html', '.js', '.css', '.svg']), zcache = new Map(); // texto vai comprimido (o three.js cai de 1,2 MB para ~300 KB); guarda o resultado por arquivo e versão
const gz = (key, tag, buf) => { const c = zcache.get(key); if (c && c.tag === tag) return c.gz; const g = zlib.gzipSync(buf, { level: 7 }); zcache.set(key, { tag, gz: g }); return g; };
// envia um arquivo ou recurso embutido: ETag (o navegador só baixa de novo o que mudou), gzip para texto e pedaços (Range) para áudio
function deliver(req, res, key, ext, tag, size, read, stream) {
  const up = key.startsWith('/uploads/'), head = { ...SEC, 'Content-Type': MIME[ext] || 'application/octet-stream', ETag: tag, 'Cache-Control': up ? 'public, max-age=31536000, immutable' : 'no-cache', ...(ext === '.html' ? { 'Content-Security-Policy': CSP } : {}) };
  if (req.headers['if-none-match'] === tag) return res.writeHead(304, head).end();
  const body = req.method !== 'HEAD';
  if (TEXT.has(ext)) return read((e, d) => {
    if (e) return res.writeHead(404, SEC).end('404');
    const z = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && d.length > 1024, out = z ? gz(key, tag, d) : d;
    res.writeHead(200, { ...head, Vary: 'Accept-Encoding', 'Content-Length': out.length, ...(z ? { 'Content-Encoding': 'gzip' } : {}) }).end(body ? out : undefined);
  });
  head['Accept-Ranges'] = 'bytes';
  const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || ''); // pedaços do arquivo: o navegador precisa disso para pular dentro de uma música
  let a = 0, b = size - 1, code = 200;
  if (rg && (rg[1] || rg[2])) {
    a = rg[1] ? +rg[1] : Math.max(0, size - +rg[2]); b = rg[1] && rg[2] ? Math.min(+rg[2], size - 1) : size - 1;
    if (a > b || a >= size) return res.writeHead(416, { ...SEC, 'Content-Range': `bytes */${size}` }).end();
    code = 206; head['Content-Range'] = `bytes ${a}-${b}/${size}`;
  }
  res.writeHead(code, { ...head, 'Content-Length': size ? b - a + 1 : 0 });
  if (!body || !size) return res.end();
  stream(a, b).on('error', () => res.destroy()).pipe(res);
}
const server = http.createServer((req, res) => {
  try { if (hooks.api?.(req, res)) return; } catch { return res.writeHead(400).end(); }
  if (req.method === 'POST' && req.url === '/upload') {
    const ext = IMG[req.headers['content-type']] || AUD[req.headers['content-type']], big = Object.values(AUD).includes(ext), chunks = [], hd = k => { try { return decodeURIComponent(req.headers[k] || ''); } catch { return ''; } }; let n = 0;
    const kIp = 'up:' + ipOf(req);
    if (blocked(kIp)) return res.writeHead(429).end();
    const isGm = !!hd('x-vj-key') && same(hd('x-vj-key'), KEY), ok = hd('x-vj-key') ? isGm : !!hd('x-vj-user') && checkUser(hd('x-vj-user'), hd('x-vj-pass')); // só quem tem a chave do mestre ou uma conta envia imagens
    if (!ok) { penalize(kIp); return res.writeHead(401).end(); }
    if (!ext || (big && !isGm)) return res.writeHead(415).end(); // áudio (trilha) só o mestre envia
    if (dirSize(UP) > UPMAX) return res.writeHead(507).end();
    req.on('data', d => { if ((n += d.length) > (big ? 40e6 : 5e6)) { res.writeHead(413).end(); req.destroy(); } else chunks.push(d); });
    req.on('end', () => {
      if (res.writableEnded) return;
      const buf = Buffer.concat(chunks); if (!magic(buf, ext)) return res.writeHead(415).end();
      const name = crypto.randomBytes(8).toString('hex') + ext;
      try { fs.mkdirSync(UP, { recursive: true }); fs.writeFileSync(path.join(UP, name), buf); } catch (e) { console.error('Falha ao gravar o envio:', e.message); return res.writeHead(507).end(); }
      res.writeHead(200, SEC).end('/uploads/' + name);
    });
    req.on('error', () => {});
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405, { ...SEC, Allow: 'GET, HEAD' }).end();
  if (req.url === '/api/hi') return res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end('{"vj":1}'); // a página de entrada confere se o código leva a uma mesa aberta
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return res.writeHead(400).end(); }
  if (p === '/') p = '/index.html';
  if (!path.extname(p)) p += '.html';
  const key = p; // endereço pedido: chave do cache de compressão
  if (SEA && !p.startsWith('/uploads/')) { // arquivos embutidos no executável (não mudam enquanto o programa roda)
    let a = null; try { if (!p.includes('..')) a = seaMod.getAsset(p.startsWith('/vendor/') ? p.slice(1) : 'public' + p); } catch {}
    if (!a) return res.writeHead(404, SEC).end('404');
    const buf = Buffer.from(a);
    return deliver(req, res, key, path.extname(p), `"sea-${BOOT}-${buf.length.toString(36)}"`, buf.length, cb => cb(null, buf), (x, y) => Readable.from([buf.subarray(x, y + 1)]));
  }
  let root = p.startsWith('/uploads/') ? DATA : PUB;
  if (p.startsWith('/vendor/')) { root = VEND; p = p.slice(7); }
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root + path.sep)) return res.writeHead(403, SEC).end();
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) return res.writeHead(404, SEC).end('404');
    deliver(req, res, key, path.extname(f), `"${st.size.toString(36)}-${Math.round(st.mtimeMs).toString(36)}"`, st.size, cb => fs.readFile(f, cb), (x, y) => fs.createReadStream(f, { start: x, end: y }));
  });
});
const BOOT = Date.now().toString(36);
server.on('clientError', (e, sock) => { if (sock.writable) sock.end('HTTP/1.1 400 Bad Request\r\n\r\n'); else sock.destroy(); });
server.headersTimeout = 20e3; server.requestTimeout = 600e3; // conexões que nunca terminam de pedir não ficam presas
const wss = new WebSocketServer({ server, maxPayload: 65536, perMessageDeflate: { threshold: 1024, concurrencyLimit: 4 } }); // o estado tem ~200 KB de JSON repetitivo: comprimido pesa bem menos pelo túnel
wss.on('error', () => {}); // o erro de porta ocupada é tratado no server.on('error')

const strip = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, battle: undefined, enc: undefined, note: undefined, gmNote: undefined, pins: v.pins && Object.fromEntries(Object.entries(v.pins).filter(([, p]) => !p.gm)) }]));
// cada cliente só recebe o que pode ver (sussurros, rolagens secretas e notas do mestre ficam de fora)
// jogadores e mesa não recebem os números dos inimigos (HP vira %), nem inimigos fora da cena ou sob a névoa
// fraquezas do inimigo para jogadores: Identificar revela tudo; o acerto revela só o elemento usado (S.lore, por tipo)
const scrub = ch => { const k = 100 / (ch.hpMax || 1), L0 = S.lore?.[ch.tpl || ch.name], lr = { w: Array.isArray(L0?.w) ? L0.w : [], r: Array.isArray(L0?.r) ? L0.r : [] }; return { id: ch.id, name: ch.name, enemy: true, owner: '', el: ch.resist.find(e => e !== 'fis') || 'fis', boss: ch.boss, color: ch.color, img: ch.img, imgF: ch.imgF, imgB: ch.imgB, imgP: ch.imgP, imgS: ch.imgS, imgK: ch.imgK, fxK: ch.fxK, x: ch.x, y: ch.y, scene: ch.scene, st: ch.st, dead: ch.dead, brk: ch.brk, shield: Math.ceil((ch.shield || 0) * k), form: ch.form, hp: Math.ceil(ch.hp * k), hpMax: 100,
  body: Object.fromEntries(PARTS.map(p => [p, (ch.body[p] || 0) * k])), attrs: Object.fromEntries(ATTRS.map(a => [a, 0])), aura: 0, auraMax: 1, san: 1, sanMax: 1, limit: 0, xp: 0, gold: 0, skills: [], inv: {}, equip: {}, weak: ch.known >= 1 ? ch.weak : ch.weak.filter(e => lr.w?.includes(e)), resist: ch.known >= 2 ? ch.resist : ch.resist.filter(e => lr.r?.includes(e)), weakPart: ch.known >= 3 ? ch.weakPart : undefined, known: ch.known || 0, marks: {}, bon: {} }; };
const hiddenFoe = ch => !(ch.id in S.battle.ticks) && (ch.x == null || ch.scene !== S.scene || (scene().fogOn && !scene().seen[ch.x + ',' + ch.y]));
// `cm`: os modificadores dos comandos de ataque de cada técnica com comando (janelas, golpes extras…), para a tela desenhar o minigame certo
const cmOf = ch => Object.fromEntries((ch.skills || []).filter(k => S.skills[k]?.cmd).map(k => { const m = modsOf(ch, S.skills[k]); return [k, { cw: m.cw, cp: m.cp, mx: m.mx, cz: m.cz, ma: m.ma, rit: m.rit, rn: m.rn, bf: m.bf }]; }));
// `dly`: o atraso real do herói (delay() com passivas, forma, Marca, Domínio…), para a prévia de onde ele volta na ordem
const heroOut = ch => ({ ...ch, gmNote: undefined, cm: cmOf(ch), dly: delay(ch) });
const pubChars = () => Object.fromEntries(Object.values(S.chars).filter(ch => !ch.enemy || !hiddenFoe(ch)).map(ch => [ch.id, ch.enemy ? scrub(ch) : heroOut(ch)]));
let net = { status: 'off', url: '', code: '', msg: 'Túnel desligado.' }; // situação do túnel, só para o mestre (não é salva)
const lan = () => Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => `http://${i.address}:${PORT}`);
// contas de jogador com a tela aberta agora (em minúsculas), só para o mestre: o leque dele recolhe a vez de quem está presente
const onlineAccts = () => [...new Set([...wss.clients].filter(o => o.role === 'player' && o.acct && o.readyState === 1).map(o => String(o.acct).toLowerCase()))];
// ---------- cenas separadas: cada cliente vê a cena dele ----------
const okSc = id => typeof id === 'string' && Object.hasOwn(S.scenes, id);
// cena de um cliente: mestre = foco; TV = a cena escolhida para ela; jogador = a do herói ativo (null = fora de cena; sem heróis = foco)
const sceneOfClient = c => {
  if (c.role === 'gm') return S.focus;
  if (c.role === 'table') return okSc(S.tv) ? S.tv : S.focus;
  const mine = Object.values(S.chars).filter(ch => !ch.enemy && !ch.summon && ch.owner === c.name), h = mine.find(ch => ch.id === c.hero) || mine.find(ch => okSc(ch.scene)) || mine[0];
  return !h ? S.focus : okSc(h.scene) ? h.scene : null;
};
// cena em que uma mensagem acontece: a do personagem dela; sem personagem, a do cliente
const sceneOfMsg = (c, m) => { const ch = S.chars[m?.id]; if (ch && (c.role === 'gm' || can(c, ch) || ch.enemy)) return okSc(ch.scene) ? ch.scene : ch.enemy ? S.focus : null; return sceneOfClient(c); };
const OFF0 = 'Seu personagem está em outro lugar por enquanto. Aguarde o mestre chamar você de volta.';
const viewIn = c => c.role === 'gm' ? { ...S, chars: Object.fromEntries(Object.entries(S.chars).map(([id, ch]) => [id, ch.enemy ? ch : { ...heroOut(ch), gmNote: ch.gmNote }])), users: undefined, accounts: Object.keys(S.users).sort(), online: onlineAccts(), store: hooks.store(), net: { ...net, portal: PORTAL, lan: lan() } } :
   { ...S, users: undefined, bestiary: undefined, encounters: undefined, scenes: strip(S.scenes), chars: pubChars(), reqs: Object.fromEntries(Object.entries(S.reqs).filter(([, r]) => r.by === c.name)),
  log: S.log.filter(e => (!e.to || (c.name && (e.to === c.name || e.from === c.name))) && (!e.sc || e.sc === S.scene)) };
const view = c => {
  const sid = sceneOfClient(c);
  if (sid === null) { // fora de cena: só a tela de espera (sem mapa, sem inimigos, sem batalha)
    const v = inScene(S.focus, () => viewIn(c)), mine = new Set(Object.values(S.chars).filter(ch => !ch.enemy && ch.owner === c.name).map(ch => ch.id));
    return { ...v, scene: '_off', battle: { active: false, ticks: {}, order: [] }, scenes: { _off: newScene('Fora de cena') }, off: S.offMsg || OFF0,
      chars: Object.fromEntries(Object.entries(v.chars).filter(([id, ch]) => !ch.enemy && (mine.has(id) || ch.scene === null))), log: v.log.filter(e => !e.sc) };
  }
  return inScene(sid, () => {
    const v = viewIn(c);
    v.scene = S.scene; v.battle = S.battle; // ponteiros não enumeráveis: o {...S} não os copia
    if (c.role !== 'gm') v.scenes = Object.fromEntries(Object.entries(v.scenes).map(([k, sc]) => [k, k === S.scene ? sc : { name: sc.name }])); // das outras cenas, só o nome (destino das saídas)
    return hooks.view(c, v); // o mundo 3D filtra o world (sem rascunho nem ocultos)
  });
};
// As definições de skills e itens são ~85% do estado e quase nunca mudam: vão numa mensagem à parte ("defs"), só para quem ainda
// não tem a versão atual. O resto ("state") segue a cada mudança, bem mais leve pelo túnel.
let defs = { v: 0, json: '' }, defsDirty = true;
const curDefs = () => { if (defsDirty) { defsDirty = false; const json = JSON.stringify({ skills: S.skills, items: S.items }); if (json !== defs.json) defs = { v: defs.v + 1, json }; } return defs; };
// Segredo da árvore: jogador e mesa recebem como silhueta "???" os nós que os personagens deles ainda não alcançam (não é vizinho do
// que já aprenderam, ou exige um Vínculo/Despertar que não têm). Nós que algum herói já tem e técnicas fora da grade ficam à vista.
const RUL = globalThis.RULES;
const reachable = (ch, s, id) => {
  if (ch.enemy) return false;
  const vinc = ch.vinc || [], aw = ch.aw || [];
  if (!['fis', 'aura', 'oculto'].includes(s.el) && !vinc.includes(s.el)) return false;
  if (s.el === 'oculto' && !aw.includes('outro')) return false;
  if (s.aw && !aw.includes(s.aw)) return false;
  if (s.v2 && !vinc.includes(s.v2)) return false;
  if (s.open) return true; // núcleo Marcial: sempre à vista
  const own = ch.skills.filter(k => S.skills[k]?.gx != null);
  return own.length ? own.some(k => { const o = S.skills[k]; return RUL.linked(o, s, k, id) && (o.el === s.el || o.el === 'fis' || s.el === 'fis'); }) : s.el === 'fis' && !!S.skills.g0 && Math.max(Math.abs(s.gx - S.skills.g0.gx), Math.abs(s.gy - S.skills.g0.gy)) <= 1; // sem nada aprendido: só o centro Marcial
};
// cache: o cálculo varre as ~3700 técnicas; só muda quando mudam as definições ou o que os heróis sabem/são (skills, Vínculos, Despertares, dono)
const hidCache = new Map();
const hiddenSkills = c => {
  if (c.role === 'gm' || !c.role) return [];
  const sig = defs.v + '|' + c.role + '|' + (c.role === 'table' ? '' : c.name) + '|' + Object.values(S.chars).filter(ch => !ch.enemy).map(ch => [ch.id, ch.owner, (ch.skills || []).join(','), (ch.vinc || []).join(','), (ch.aw || []).join(',')].join(':')).join(';');
  const hit = hidCache.get(sig); if (hit) return hit;
  if (hidCache.size > 64) hidCache.clear();
  const out = hiddenRaw(c); hidCache.set(sig, out); return out;
};
const hiddenRaw = c => {
  const heroes = Object.values(S.chars).filter(ch => !ch.enemy), owned = new Set(heroes.flatMap(ch => ch.skills || []));
  const mine = c.role === 'table' ? heroes : heroes.filter(ch => ch.owner === c.name);
  return Object.keys(S.skills).filter(id => { const s = S.skills[id]; return s.gx != null && !owned.has(id) && !mine.some(ch => reachable(ch, s, id)); });
};
const silhouette = s => ({ name: '???', d: '', kind: s.kind === 'passive' ? 'passive' : s.kind === 'form' ? 'form' : 'dmg', attr: '', el: s.el, power: 0, cost: 0, res: s.res, gx: s.gx, gy: s.gy, wx: s.wx, wy: s.wy, ln: s.ln, br: s.br, root: s.root, xp: s.xp, cam: s.cam, secret: 1 });
let secCache = { v: -1, m: new Map() };
const defsFor = (c, d) => { // versão das definições com os nós secretos trocados pela silhueta; cacheada por conjunto de nós escondidos
  const hid = hiddenSkills(c);
  if (!hid.length) return { v: d.v, json: d.json };
  if (secCache.v !== d.v) secCache = { v: d.v, m: new Map() };
  const key = crypto.createHash('sha1').update(hid.join(',')).digest('hex').slice(0, 12);
  if (!secCache.m.has(key)) {
    if (secCache.m.size > 64) secCache.m.clear();
    const sk = { ...S.skills }; for (const id of hid) sk[id] = silhouette(S.skills[id]);
    secCache.m.set(key, JSON.stringify({ skills: sk, items: S.items }));
  }
  return { v: d.v + '.' + key, json: secCache.m.get(key) };
};
const sendState = c => {
  if (!c.role || c.readyState !== 1) return;
  const d = defsFor(c, curDefs());
  if (c.defsV !== d.v) { c.defsV = d.v; c.send(`{"t":"defs","v":${JSON.stringify(d.v)},"d":${d.json}}`); }
  c.send(JSON.stringify({ t: 'state', dv: d.v, s: { ...view(c), skills: undefined, items: undefined } }));
};
// avisos automáticos de fim de combate, só para o mestre (ele decide quando declarar a vitória)
const battleWatch = () => {
  const B = S.battle; if (!B.active) return;
  const all = Object.keys(B.ticks).map(k => S.chars[k]).filter(Boolean), foes = all.filter(o => o.enemy), pcs = all.filter(o => !o.enemy);
  const end = foes.length && foes.every(o => o.hp <= 0) ? 'won' : pcs.length && pcs.every(o => o.hp <= 0) ? 'lost' : '';
  const where = Object.values(S.scenes).filter(sc => sc.battle?.active).length > 1 ? ` (${scene().name})` : '';
  if (end && B.end !== end) log('Sistema', (end === 'won' ? 'Todos os inimigos caíram. Clique em "Vitória" para distribuir as recompensas.' : 'Todos os heróis estão caídos.') + where, end === 'won' ? 'ok' : 'bad', { to: GM });
  B.end = end;
};
// dirty: as definições (skills/itens) podem ter mudado; só o mestre as edita, então ações de jogador e timers de comando passam false
let nPush = 0; const pushes = () => nPush; // contador para os testes (o mundo 3D garante que andar não dispara push)
const push = (dirty = true) => {
  nPush++;
  try {
    ofiSync(); pruneReqs();
    // cada personagem é preparado dentro da cena dele (fichas, bloqueios e fila leem a batalha daquela cena)
    const groups = new Map(Object.keys(S.scenes).map(k => [k, []])); groups.set(null, []);
    for (const ch of Object.values(S.chars)) groups.get(okSc(ch.scene) ? ch.scene : null).push(ch);
    for (const [sid, list] of groups) inScene(sid, () => { list.forEach(breakCheck); prep(list, false); reseat(list); usable(list); if (sid !== null) { battleWatch(); S.battle.order = S.battle.active ? order() : []; } });
    prep([], true);
  } catch (e) { console.error('Falha ao preparar o estado:', e); }
  if (dirty) defsDirty = true;
  wss.clients.forEach(c => { try { sendState(c); } catch (e) { console.error('Falha ao enviar o estado:', e.message); } });
  save();
};
// executa uma mensagem de cliente; pedidos de jogador que exigem aprovação entram na fila em vez de acontecer
// heróis fora de cena não andam nem agem no mapa ou na batalha (ficha, inventário e ofícios fora de batalha continuam)
const OFFSTAGE = new Set(['move', 'walk', 'act', 'defend', 'focus', 'allOut']);
// ações que mudam o estado em memória sem push completo (o mundo 3D manda as posições pelo canal pos)
const QUIET = new Set(['walk']);
// conversa não pertence a uma cena: roda sem contexto (não ganha a marca de cena no histórico)
const NOSCENE = new Set(['chat']);
function handle(c, m) {
  if (typeof m.t !== 'string' || !Object.hasOwn(H, m.t)) return;
  const ch0 = S.chars[m.id];
  if (ch0 && !ch0.enemy && ch0.scene === null && OFFSTAGE.has(m.t) && c.role !== 'gm') return;
  const sid = NOSCENE.has(m.t) ? null : sceneOfMsg(c, m);
  inScene(sid, () => handleIn(c, m, sid));
}
function handleIn(c, m, sid) {
  if (c.role === 'gm' && !NOUNDO.has(m.t)) undoPush(S.scene);
  const cat = c.role === 'player' && !c.ctl ? gateOf(m) : null;
  if (cat && !S.auto[cat]) { // vira um pedido (um por jogador: o novo substitui o anterior)
    const ch = S.chars[m.id];
    if (!can(c, ch) || (cat === 'act' && !(S.battle.active && current() === ch.id))) return;
    for (const [id, r] of Object.entries(S.reqs)) if (r.by === c.name) delete S.reqs[id];
    S.reqs[rid()] = { by: c.name, ch: ch.id, cat, t: m.t, text: reqText(m), n: ++S.seq, sc: sid,
      m: { node: m.node, rec: m.rec, rune: m.rune, el2: m.el2, sig: m.sig, nm: m.nm, part: m.part, part2: m.part2, id: m.id, w: m.w, attr: m.attr, mod: m.mod, skill: m.skill, target: m.target, aim: m.aim, item: m.item, k: m.k, pass: m.pass, brave: m.brave } };
    return push(false);
  }
  try { H[m.t](c, m); } catch (e) { console.error(e); } if (!QUIET.has(m.t)) push(c.role === 'gm');
}
// o que o jogador pede e o mestre precisa aprovar, por tipo (S.auto[tipo] = true dispensa a aprovação)
const GATE = { roll: 'roll', act: 'act', learn: 'learn', use: 'item', equip: 'item', drop: 'item', buy: 'item', sell: 'item', forge: 'item', campAct: 'camp', ofiUse: 'roll', ofiLearn: 'learn', craft: 'item', reroll: 'roll', defend: 'act', focus: 'act', allOut: 'act' };
const gateOf = m => m.t === 'use' && S.battle.active && m.id in S.battle.ticks ? 'act' : GATE[m.t];
const reqText = m => { // frase curta que o mestre lê na fila
  const ch = S.chars[m.id], i = S.items[m.item], tg = S.chars[m.target], sg = v => (v > 0 ? '+' : '') + v;
  if (m.t === 'roll') return `rolar ${m.attr}${int(m.mod, -100, 100) ? ' ' + sg(int(m.mod, -100, 100)) : ''}`;
  if (m.t === 'act') return `${m.skill === 'atk' ? 'Ataque' : SK(m.skill)?.name || '?'} → ${tg?.name || '?'}${PARTS.includes(m.aim) ? ` (mira: ${PL[m.aim]})` : ''}`;
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
const pruneReqs = () => { for (const [id, r] of Object.entries(S.reqs)) { const ch = S.chars[r.m.id]; if (!ch || ch.owner !== r.by || (r.cat === 'act' && !inScene(okSc(ch.scene) ? ch.scene : null, () => S.battle.active && current() === ch.id))) delete S.reqs[id]; } };
const tell0 = (c, o) => c.readyState === 1 && c.send(JSON.stringify({ t: 'note', ...o })); // aviso só para quem mandou
const tell = (name, o) => wss.clients.forEach(x => x.role === 'player' && x.name === name && x.readyState === 1 && x.send(JSON.stringify({ t: 'note', ...o })));
const kick = (name, msg, except) => wss.clients.forEach(o => { if (o !== except && o.acct === name) { o.send(JSON.stringify({ t: 'err', bad: true, msg })); o.role = null; o.close(); } });
// conexões paradas: quem não responde ao ping em 30 s (aba fechada, celular sem sinal, túnel caído) ou não faz login em 30 s é encerrado
const beat = setInterval(() => { const now = Date.now(); wss.clients.forEach(c => { if (!c.alive || (!c.role && now - c.t0 > 30e3)) return c.terminate(); c.alive = false; try { c.ping(); } catch {} }); }, 30e3); beat.unref();
const gmSync = () => wss.clients.forEach(o => { if (o.role === 'gm' && o.readyState === 1) try { sendState(o); } catch {} });
const MAXIP = 40; // conexões simultâneas de um mesmo endereço
wss.on('connection', (c, req) => {
  c.ip = ipOf(req); c.alive = true; c.t0 = Date.now();
  c.role = null; // sem login não recebe nada
  c.on('pong', () => { c.alive = true; });
  c.on('error', () => {});
  c.on('close', () => { if (c.acct) gmSync(); }); // quem entra ou sai muda o "online" do mestre
  let n = 0; wss.clients.forEach(o => { if (o.ip === c.ip) n++; });
  if (n > MAXIP) return c.close(1013, 'muitas conexões');
  c.on('message', raw => { try { onMsg(c, raw); } catch (e) { console.error('Erro ao tratar mensagem:', e); } });
});
function onMsg(c, raw) {
  {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object' || Array.isArray(m)) return;
    if (m.t === 'hello') {
      const bad = msg => c.send(JSON.stringify({ t: 'err', bad: true, msg })), name = String(m.name || '').trim().slice(0, 30), pass = String(m.pass || '');
      // a mesa (TV) entra com a chave do mestre (login "mestre") ou com a conta de um jogador
      const kIp = 'ip:' + c.ip, kAcc = 'acc:' + name.toLowerCase();
      if (blocked(kIp) || (name && blocked(kAcc))) return bad('Muitas tentativas erradas. Aguarde alguns minutos e tente de novo.');
      const miss = msg => { penalize(kIp); if (name) penalize(kAcc); return bad(msg); };
      if (m.role === 'player' && m.as) { // o mestre confere a tela de um jogador: mesma visão, sem poder agir
        if (!same(m.key, KEY)) return miss('Chave do mestre incorreta.');
        c.role = 'player'; c.name = String(m.as).slice(0, 30); if (m.ctl) c.ctl = c.appr = true; else c.peek = true; // ctl: o mestre joga por esse jogador, sem fila de pedidos
        return sendState(c);
      }
      const asGm = m.role === 'gm' || (m.role === 'table' && name.toLowerCase() === 'mestre');
      if (asGm) { if (!same(m.role === 'gm' ? m.key : pass, KEY)) return miss('Chave do mestre incorreta.'); c.role = m.role === 'gm' ? 'gm' : 'table'; }
      else if (m.role === 'player' || m.role === 'table') {
        if (!checkUser(name, pass)) return miss('Login ou senha incorretos. As contas são criadas pelo mestre: confira com ele.');
        c.role = m.role; c.acct = name; if (m.role === 'player') c.name = name; // a TV não mostra os sussurros do dono da conta
      } else return;
      clean(kAcc); // acertou: zera o contador da conta (o do IP continua)
      c.defsV = -1; // login novo sempre recebe as definições
      sendState(c); if (c.role !== 'gm') gmSync(); return;
    }
    if (m.t === 'sync') { if (c.role) { c.defsV = -1; sendState(c); } return; } // o cliente pede tudo de novo (perdeu as definições)
    if (!c.role || c.peek) return;
    if (m.t === 'activeHero') { const ch = S.chars[m.id]; if (c.role === 'player' && ch && !ch.enemy && ch.owner === c.name && c.hero !== ch.id) { c.hero = ch.id; sendState(c); } return; } // herói escolhido na tela: decide a cena que o jogador vê
    if (c.role !== 'gm' && (flood(c, 'all', 80) || (m.t === 'chat' && flood(c, 'chat', 10)) || (m.t === 'ping' && flood(c, 'ping', 12)))) return;
    if (m.t === 'ping') { // marcação temporária no mapa: só retransmite, não altera o estado
      if (c.role === 'table') return;
      const p = JSON.stringify({ t: 'ping', x: int(m.x, 0, 99), y: int(m.y, 0, 99) }), sid = sceneOfClient(c);
      if (sid === null) return;
      return wss.clients.forEach(o => o.role && o.readyState === 1 && (o.role === 'gm' ? S.focus === sid : sceneOfClient(o) === sid) && o.send(p)); // só quem está na mesma cena
    }
    handle(c, m);
  }
}
function start() {
  server.on('error', e => { // no executável a janela fecha sozinha; segura até o usuário ler a mensagem
    console.error(e.code === 'EADDRINUSE' ? `\nA porta ${PORT} já está em uso (o jogo já está aberto?). Use outra: defina PORT=3001.` : '\nErro: ' + e.message);
    if (SEA) { console.error('Feche esta janela para sair.'); setInterval(() => {}, 1 << 30); } else process.exit(1);
  });
  server.listen(PORT, () => {
    if (process.stdout.isTTY && process.env.VJ_OPEN !== '0') openGm();
    const ips = lan();
    console.log(`\n  virtualJRPG rodando\n\n  Mestre:     http://localhost:${PORT}/gm   (chave: ${KEY})\n  Mesa (TV):  http://localhost:${PORT}/table   (login "mestre" + a chave, ou a conta de um jogador)${ips.length ? `\n  Mesma rede Wi-Fi: ${ips.map(u => u + '/player').join('  ou  ')}` : ''}\n\n  Contas dos jogadores: crie na janela "Sessão" do painel do mestre.\n  Dados salvos em: ${DATA}\n  Feche esta janela para encerrar.\n`);
    if (process.env.VJ_TUNNEL === '0') return console.log('  Túnel desligado (VJ_TUNNEL=0): só a rede local funciona.\n');
    startTunnel({ port: PORT, dir: DATA, onChange: i => {
      net = i; wss.clients.forEach(o => o.role === 'gm' && sendState(o));
      console.log(i.status === 'ok' ? `\n  >>> Internet aberta. CÓDIGO DA SESSÃO: ${i.code}\n      Link para os jogadores: ${PORTAL ? PORTAL + '?c=' + i.code : i.url + '/player'}\n` : '  [túnel] ' + i.msg);
    } });
  });
}

export { QUIET, pushes, sceneOfClient, sceneOfMsg, hiddenSkills, defsFor, curDefs, GATE, gateOf, handle, hiddenFoe, hooks, kick, lan, net, pruneReqs, pubChars, push, reqText, scrub, sendState, server, start, strip, tell, tell0, view, wss };

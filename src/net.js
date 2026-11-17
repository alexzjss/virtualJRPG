import { spawn as runCmd } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { WebSocketServer } from 'ws';
import { startTunnel } from '../tunnel.js';
import { SEA, seaMod, dir, PUB, DATA, UP, PORT, PORTAL, KEY, VEND, IMG, MIME, AUD } from './config.js';
import { ATTRS, PARTS, PL } from './consts.js';
import { S, save, log } from './state.js';
import { UPMAX, dirSize, magic, ipOf, blocked, penalize, clean, flood, checkUser } from './auth.js';
import { rid, int, can, scene, at, current, order, prep, reseat } from './rules.js';
import { undoStack, NOUNDO, H } from './handlers.js';

// ---------- http ----------
const hooks = { api: null, store: () => ({ camps: [], backups: [] }) }; // preenchido por campaign.js (rotas /api e listas de campanhas e cópias)
// abre o painel do mestre no navegador já com a chave (ela vai depois do #, que nunca sai do computador)
const openGm = () => { const url = `http://localhost:${PORT}/gm#k=${encodeURIComponent(KEY)}`, [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { runCmd(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true }).on('error', () => {}).unref(); } catch {} };
const server = http.createServer((req, res) => {
  try { if (hooks.api?.(req, res)) return; } catch { return res.writeHead(400).end(); }
  if (req.method === 'POST' && req.url === '/upload') {
    const ext = IMG[req.headers['content-type']] || AUD[req.headers['content-type']], big = Object.values(AUD).includes(ext), chunks = [], hd = k => { try { return decodeURIComponent(req.headers[k] || ''); } catch { return ''; } }; let n = 0;
    const kIp = 'up:' + ipOf(req);
    if (blocked(kIp)) return res.writeHead(429).end();
    const ok = hd('x-vj-key') ? hd('x-vj-key') === KEY : !!hd('x-vj-user') && checkUser(hd('x-vj-user'), hd('x-vj-pass')); // só quem tem a chave do mestre ou uma conta envia imagens
    if (!ok) { penalize(kIp); return res.writeHead(401).end(); }
    if (!ext || (big && hd('x-vj-key') !== KEY)) return res.writeHead(415).end(); // áudio (trilha) só o mestre envia
    if (dirSize(UP) > UPMAX) return res.writeHead(507).end();
    req.on('data', d => { if ((n += d.length) > (big ? 40e6 : 5e6)) { res.writeHead(413).end(); req.destroy(); } else chunks.push(d); });
    req.on('end', () => {
      if (res.writableEnded) return;
      const buf = Buffer.concat(chunks); if (!magic(buf, ext)) return res.writeHead(415).end();
      const name = crypto.randomBytes(8).toString('hex') + ext;
      fs.mkdirSync(UP, { recursive: true }); fs.writeFileSync(path.join(UP, name), buf);
      res.writeHead(200).end('/uploads/' + name);
    });
    return;
  }
  if (req.url === '/api/hi') return res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }).end('{"vj":1}'); // a página de entrada confere se o código leva a uma mesa aberta
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return res.writeHead(400).end(); }
  if (p === '/') p = '/index.html';
  if (!path.extname(p)) p += '.html';
  const done = (d, ext) => res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' }).end(d);
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
    const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || ''); // pedaços do arquivo: o navegador precisa disso para pular dentro de uma música
    if (rg && (rg[1] || rg[2])) {
      const a = rg[1] ? +rg[1] : Math.max(0, d.length - +rg[2]), b = rg[1] && rg[2] ? Math.min(+rg[2], d.length - 1) : d.length - 1;
      if (a > b || a >= d.length) return res.writeHead(416, { 'Content-Range': `bytes */${d.length}` }).end();
      return res.writeHead(206, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Content-Range': `bytes ${a}-${b}/${d.length}`, 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' }).end(d.subarray(a, b + 1));
    }
    done(d, path.extname(f));
  });
});
const wss = new WebSocketServer({ server, maxPayload: 65536, perMessageDeflate: { threshold: 1024, concurrencyLimit: 4 } }); // o estado tem ~200 KB de JSON repetitivo: comprimido pesa bem menos pelo túnel
wss.on('error', () => {}); // o erro de porta ocupada é tratado no server.on('error')

const strip = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, note: undefined, gmNote: undefined, pins: v.pins && Object.fromEntries(Object.entries(v.pins).filter(([, p]) => !p.gm)) }]));
// cada cliente só recebe o que pode ver (sussurros, rolagens secretas e notas do mestre ficam de fora)
// jogadores e mesa não recebem os números dos inimigos (HP vira %), nem inimigos fora da cena ou sob a névoa
const scrub = ch => { const k = 100 / (ch.hpMax || 1); return { id: ch.id, name: ch.name, enemy: true, owner: '', el: ch.resist.find(e => e !== 'fis') || 'fis', boss: ch.boss, color: ch.color, img: ch.img, x: ch.x, y: ch.y, scene: ch.scene, st: ch.st, dead: ch.dead, hp: Math.ceil(ch.hp * k), hpMax: 100,
  body: Object.fromEntries(PARTS.map(p => [p, (ch.body[p] || 0) * k])), attrs: Object.fromEntries(ATTRS.map(a => [a, 0])), aura: 0, auraMax: 1, san: 1, sanMax: 1, limit: 0, xp: 0, gold: 0, skills: [], inv: {}, equip: {}, weak: [], resist: [], marks: {}, bon: {} }; };
const hiddenFoe = ch => !(ch.id in S.battle.ticks) && (ch.x == null || ch.scene !== S.scene || (scene().fogOn && !scene().seen[ch.x + ',' + ch.y]));
const pubChars = () => Object.fromEntries(Object.values(S.chars).filter(ch => !ch.enemy || !hiddenFoe(ch)).map(ch => [ch.id, ch.enemy ? scrub(ch) : { ...ch, gmNote: undefined }]));
let net = { status: 'off', url: '', code: '', msg: 'Túnel desligado.' }; // situação do túnel, só para o mestre (não é salva)
const lan = () => Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => `http://${i.address}:${PORT}`);
const view = c => c.role === 'gm' ? { ...S, users: undefined, accounts: Object.keys(S.users).sort(), store: hooks.store(), net: { ...net, portal: PORTAL, lan: lan() } } :
   { ...S, users: undefined, bestiary: undefined, encounters: undefined, scenes: strip(S.scenes), chars: pubChars(), reqs: Object.fromEntries(Object.entries(S.reqs).filter(([, r]) => r.by === c.name)),
  log: S.log.filter(e => !e.to || (c.name && (e.to === c.name || e.from === c.name))) };
const sendState = c => c.role && c.readyState === 1 && c.send(JSON.stringify({ t: 'state', s: view(c) }));
const push = () => { prep(); reseat(); pruneReqs(); S.battle.order = S.battle.active ? order() : []; wss.clients.forEach(sendState); save(); };
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
      m: { id: m.id, attr: m.attr, mod: m.mod, skill: m.skill, target: m.target, aim: m.aim, item: m.item, k: m.k } };
    return push();
  }
  try { H[m.t](c, m); } catch (e) { console.error(e); } push();
}
// o que o jogador pede e o mestre precisa aprovar, por tipo (S.auto[tipo] = true dispensa a aprovação)
const GATE = { roll: 'roll', act: 'act', learn: 'learn', use: 'item', equip: 'item', drop: 'item', buy: 'item', sell: 'item', forge: 'item', campAct: 'camp' };
const gateOf = m => m.t === 'use' && S.battle.active && m.id in S.battle.ticks ? 'act' : GATE[m.t];
const reqText = m => { // frase curta que o mestre lê na fila
  const ch = S.chars[m.id], i = S.items[m.item], tg = S.chars[m.target], sg = v => (v > 0 ? '+' : '') + v;
  if (m.t === 'roll') return `rolar ${m.attr}${int(m.mod, -100, 100) ? ' ' + sg(int(m.mod, -100, 100)) : ''}`;
  if (m.t === 'act') return `${m.skill === 'atk' ? 'Ataque' : S.skills[m.skill]?.name || '?'} → ${tg?.name || '?'}${PARTS.includes(m.aim) ? ` (mira: ${PL[m.aim]})` : ''}`;
  if (m.t === 'learn') return `aprender ${S.skills[m.skill]?.name || '?'} (${S.skills[m.skill]?.xp ?? '?'} XP)`;
  if (m.t === 'campAct') return `acampamento: ${m.k}`;
  const V = { use: 'usar', equip: ch?.equip[i?.type] === m.item ? 'tirar' : 'equipar', drop: 'descartar', buy: `comprar (${i?.price} ouro)`, sell: `vender (${Math.floor((i?.price || 0) / 2)} ouro)`, forge: 'forjar' };
  return `${V[m.t]} ${i?.name || '?'}${m.t === 'use' && tg && tg !== ch ? ' em ' + tg.name : ''}`;
};
const pruneReqs = () => { for (const [id, r] of Object.entries(S.reqs)) { const ch = S.chars[r.m.id]; if (!ch || ch.owner !== r.by || (r.cat === 'act' && !(S.battle.active && current() === ch.id))) delete S.reqs[id]; } };
const tell = (name, o) => wss.clients.forEach(x => x.role === 'player' && x.name === name && x.readyState === 1 && x.send(JSON.stringify({ t: 'note', ...o })));
const kick = (name, msg, except) => wss.clients.forEach(o => { if (o !== except && o.acct === name) { o.send(JSON.stringify({ t: 'err', bad: true, msg })); o.role = null; o.close(); } });
wss.on('connection', (c, req) => {
  c.ip = ipOf(req);
  c.role = null; // sem login não recebe nada
  c.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      const bad = msg => c.send(JSON.stringify({ t: 'err', bad: true, msg })), name = String(m.name || '').trim().slice(0, 30), pass = String(m.pass || '');
      // a mesa (TV) entra com a chave do mestre (login "mestre") ou com a conta de um jogador
      const kIp = 'ip:' + c.ip, kAcc = 'acc:' + name.toLowerCase();
      if (blocked(kIp) || (name && blocked(kAcc))) return bad('Muitas tentativas erradas. Aguarde alguns minutos e tente de novo.');
      const miss = msg => { penalize(kIp); if (name) penalize(kAcc); return bad(msg); };
      if (m.role === 'player' && m.as) { // o mestre confere a tela de um jogador: mesma visão, sem poder agir
        if (String(m.key) !== KEY) return miss('Chave do mestre incorreta.');
        c.role = 'player'; c.name = String(m.as).slice(0, 30); if (m.ctl) c.ctl = c.appr = true; else c.peek = true; // ctl: o mestre joga por esse jogador, sem fila de pedidos
        return sendState(c);
      }
      const asGm = m.role === 'gm' || (m.role === 'table' && name.toLowerCase() === 'mestre');
      if (asGm) { if (String(m.role === 'gm' ? m.key : pass) !== KEY) return miss('Chave do mestre incorreta.'); c.role = m.role === 'gm' ? 'gm' : 'table'; }
      else if (m.role === 'player' || m.role === 'table') {
        if (!checkUser(name, pass)) return miss('Login ou senha incorretos. As contas são criadas pelo mestre: confira com ele.');
        c.role = m.role; c.acct = name; if (m.role === 'player') c.name = name; // a TV não mostra os sussurros do dono da conta
      } else return;
      clean(kAcc); // acertou: zera o contador da conta (o do IP continua)
      return sendState(c);
    }
    if (!c.role || c.peek) return;
    if (c.role !== 'gm' && (flood(c, 'all', 80) || (m.t === 'chat' && flood(c, 'chat', 10)) || (m.t === 'ping' && flood(c, 'ping', 12)))) return;
    if (m.t === 'ping') { // marcação temporária no mapa: só retransmite, não altera o estado
      if (c.role === 'table') return;
      const p = JSON.stringify({ t: 'ping', x: int(m.x, 0, 99), y: int(m.y, 0, 99) });
      return wss.clients.forEach(o => o.role && o.readyState === 1 && o.send(p));
    }
    handle(c, m);
  });
});
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

export { server, wss, strip, scrub, hiddenFoe, pubChars, net, lan, view, sendState, push, handle, GATE, gateOf, reqText, pruneReqs, tell, kick, start, hooks };

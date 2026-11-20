// ===== mundo 3D explorável: o mapa de cada cena (sc.world), migração do mapa 2D e handlers =====
// sc.world é o mundo publicado (todos veem); sc.draft é o rascunho do mestre. As cenas antigas viram um andar com a imagem
// do mapa como piso (world.legacy): enquanto o mestre não edita a cena no editor novo, o world é refeito a partir do 2D.
import { MIG, S, isObj } from './state.js';
import { H, NOUNDO } from './handlers.js';
import { can } from './rules.js';
import { QUIET, wss } from './net.js';
import '../public/js/mundo-colisao.js';
import '../public/js/mundo-gerar.js';
const P = globalThis.MPECAS, G = globalThis.MGERAR;

const W_LEG = 80; // cenas migradas mantêm o tamanho (até 80); andares novos vão até 64 (wDraft)
const fin = (v, d = 0) => Number.isFinite(+v) && v !== null && v !== '' ? +v : d;
const bitsLen = n => Math.ceil(n / 8);
const setBit = (u, i) => { u[i >> 3] |= 1 << (i & 7); };
const temaOf = sc => { const [t, h] = String(sc.bbg || '').split('-'); return { tema: P.TEMAS.includes(t) ? t : 'campo', hora: ['dia', 'tarde', 'noite'].includes(h) ? h : 'dia' }; };
const sizeOf = sc => ({ w: Math.min(W_LEG, Math.max(1, Math.ceil(fin(sc.cols, 20)))), h: Math.min(W_LEG, Math.max(1, Math.ceil(fin(sc.rows, 12)))) });
const cellOf = pos => [Math.floor(pos.x), Math.floor(pos.z)];

function worldFromLegacy(sc) {
  const { tema, hora } = temaOf(sc), { w, h } = sizeOf(sc), f = P.newFloor('f0', 'Térreo', w, h, tema);
  if (sc.bg) f.img = { url: sc.bg, crop: { ...(sc.crop || { x: 0, y: 0, w: 1, h: 1 }) } };
  const objs = {};
  for (const e of sc.exits || []) objs[e.id] = { k: 'portal', f: 'f0', x: Math.min(w - 1, e.x), y: Math.min(h - 1, e.y), rot: 0, vis: 'visivel', auto: null, cfg: { to: e.to } };
  return { v: 1, tema, hora, floors: [f], objs, goal: '', legacy: true };
}
const seenFromLegacy = (sc, w, h) => { const u = new Uint8Array(bitsLen(w * h)); for (const k of Object.keys(sc.seen || {})) { const [x, y] = k.split(',').map(Number); if (x >= 0 && y >= 0 && x < w && y < h) setBit(u, y * w + x); } return P.pack(u); };
// assinatura dos campos 2D que alimentam o world migrado: só refaz quando algo deles mudou
const legacySig = sc => JSON.stringify([sc.cols, sc.rows, sc.bg, sc.crop, sc.bbg, sc.exits, Object.keys(sc.seen || {}).length, sc.seen]);
const okFloor = f => isObj(f) && typeof f.id === 'string' && Number.isInteger(f.w) && Number.isInteger(f.h) && f.w > 0 && f.h > 0 && f.w <= W_LEG && f.h <= W_LEG && typeof f.cell === 'string' && typeof f.wallH === 'string' && typeof f.wallV === 'string';

function fixWorld(sc) {
  const sig = legacySig(sc);
  if (!isObj(sc.world) || !Array.isArray(sc.world.floors) || !sc.world.floors.some(okFloor) || (sc.world.legacy && sc.world._sig !== sig)) {
    const v = isObj(sc.world) ? fin(sc.world.v, 0) : 0;
    sc.world = { ...worldFromLegacy(sc), v: v + 1 };
    Object.defineProperty(sc.world, '_sig', { value: sig, configurable: true, enumerable: false, writable: true });
    const f = sc.world.floors[0]; sc.seenW = { f0: seenFromLegacy(sc, f.w, f.h) };
  }
  const W = sc.world;
  W.floors = W.floors.filter(okFloor);
  if (!isObj(W.objs)) W.objs = {};
  W.goal = String(W.goal || '').slice(0, 120);
  if (!P.TEMAS.includes(W.tema)) W.tema = 'campo';
  if (!['dia', 'tarde', 'noite'].includes(W.hora)) W.hora = 'dia';
  if (!isObj(sc.seenW)) sc.seenW = {};
  for (const f of W.floors) if (typeof sc.seenW[f.id] !== 'string') sc.seenW[f.id] = P.pack(new Uint8Array(bitsLen(f.w * f.h)));
  if (sc.draft !== undefined && !(isObj(sc.draft) && Array.isArray(sc.draft.floors))) delete sc.draft;
}
// põe o herói no centro da casa lógica (ch.x/ch.y), dentro do andar
function posFromCell(ch, sc) {
  const f = sc.world.floors.find(o => o.id === ch.pos?.f) || sc.world.floors[0];
  ch.x = Math.min(f.w - 1, Math.max(0, Math.round(fin(ch.x)))); ch.y = Math.min(f.h - 1, Math.max(0, Math.round(fin(ch.y))));
  ch.pos = { f: f.id, x: ch.x + .5, z: ch.y + .5, d: fin(ch.pos?.d) };
}
function fixMundo() {
  if (!isObj(S.scenes)) return;
  for (const sc of Object.values(S.scenes)) fixWorld(sc);
  for (const ch of Object.values(S.chars || {})) {
    const sc = S.scenes[ch.scene];
    if (ch.x == null || !sc) { if (ch.x == null) delete ch.pos; continue; }
    const p = ch.pos, ok = isObj(p) && sc.world.floors.some(f => f.id === p.f) && Number.isFinite(p.x) && Number.isFinite(p.z);
    if (!ok || Math.floor(p.x) !== ch.x || Math.floor(p.z) !== ch.y) posFromCell(ch, sc); // o 2D (move, place, moveTo) mandou: o 3D acompanha
  }
  S.worldTpl = isObj(S.worldTpl) ? S.worldTpl : {};
  if (S.auto) S.auto.inter ??= false;
}
const refreshLegacy = () => fixMundo();

// depois das ações que mexem no mapa 2D ou nas posições, o mundo acompanha
for (const k of ['map', 'exitAdd', 'exitDel', 'fog', 'fogAll', 'sceneAdd', 'move', 'place', 'moveTo', 'addChar']) {
  const f0 = H[k]; if (typeof f0 !== 'function') continue;
  H[k] = function (c, m) { const r = f0.call(this, c, m); fixMundo(); return r; };
}
MIG.push(fixMundo);
fixMundo();

// ----- movimento -----
const C = globalThis.MCOL;
const clock = { now: () => Date.now() }; // os testes trocam o relógio
const MH = { markPos: () => {}, onCell: [], vision: () => {}, visNow: () => null, ambush: null }; // ambush: emboscada do gatilho (Task 6.2) // ganchos: rede (pos agregado), o que acontece ao trocar de casa (névoa, gatilhos…) e recalcular a visão (porta mudou)
const r2 = v => Math.round(v * 100) / 100;
const floorOf = (sc, fid) => sc?.world?.floors.find(f => f.id === fid);
const sendTo = (c, o) => { if (c?.readyState === 1) c.send(JSON.stringify(o)); };
const fixMsg = ch => ({ t: 'pos', fix: [ch.id, ch.pos.f, ch.pos.x, ch.pos.z] });
const fixOwners = ch => wss.clients.forEach(x => x.role === 'player' && x.name === ch.owner && sendTo(x, fixMsg(ch)));
// aplica a posição nova; trocou de casa: atualiza a casa lógica e roda os ganchos
function place(ch, sc, f, x, z, d) {
  const [ox, oy] = [ch.x, ch.y];
  ch.pos = { f: f.id, x: r2(x), z: r2(z), d: Number.isFinite(d) ? r2(d) : ch.pos?.d || 0 };
  [ch.x, ch.y] = cellOf(ch.pos);
  MH.markPos(ch);
  if (ch.x !== ox || ch.y !== oy) MH.onCell.forEach(fn => fn(ch, sc));
}
const BUCKET = s => s * 1.2 * 1 + .5, STEP_MAX = 1.5; // saldo máximo (1 s de movimento com folga) e o maior passo aceito numa mensagem
Object.assign(H, {
  walk(c, m) { // o cliente anda (previsto lá) e o servidor confere: velocidade com folga, paredes, andar, congelado e modo tático
    const ch = S.chars[m.id], sc = S.scenes[ch?.scene];
    if (!ch || !sc || !can(c, ch) || ch.x == null || S.battle.active || m.sc !== ch.scene || m.f !== ch.pos?.f) return;
    const s = Math.floor(+m.s); if (!(s > (ch._s || 0))) return; ch._s = s;
    const f = floorOf(sc, ch.pos.f), x = +m.x, z = +m.z; if (!f || !Number.isFinite(x) || !Number.isFinite(z)) return;
    const mode = ['a', 'c', 'g'].includes(m.m) ? m.m : 'a', sp = C.SPEED[mode], now = clock.now();
    ch._b = Math.min(BUCKET(sp), (ch._b ?? BUCKET(sp)) + sp * 1.2 * Math.max(0, now - (ch._t || now)) / 1000); ch._t = now;
    if (m.j && !ch._jt) ch._jt = now; if (!m.j) ch._jt = 0; const jump = !!m.j && now - ch._jt <= 600; // pulo vale por 600 ms
    const dist = Math.hypot(x - ch.pos.x, z - ch.pos.z), tat = sc.tatico;
    const bad = ch.frozen || dist > STEP_MAX || dist > ch._b || !C.segOk(f, sc.world.objs, ch.pos, { x, z }, jump) || (tat && (ch.tatUse || 0) + dist > tat.n + 1e-6);
    if (bad) return sendTo(c, fixMsg(ch));
    ch._b -= dist; ch._m = mode; if (tat) ch.tatUse = (ch.tatUse || 0) + dist;
    place(ch, sc, f, x, z, +m.d);
  },
  walkGm(c, m) { // mestre teleporta (mover herói, chamar todos): sem validar, só dentro do andar
    const ch = S.chars[m.id], sc = S.scenes[ch?.scene]; if (c.role !== 'gm' || !ch || !sc || ch.x == null) return;
    const f = floorOf(sc, m.f) || floorOf(sc, ch.pos?.f) || sc.world.floors[0];
    place(ch, sc, f, Math.min(f.w - .01, Math.max(0, +m.x || 0)), Math.min(f.h - .01, Math.max(0, +m.z || 0)), ch.pos?.d);
    ch._b = undefined; fixOwners(ch);
  },
  freeze(c, m) { // congela ou solta o movimento (todos os heróis da cena em foco, ou os ids)
    if (c.role !== 'gm') return;
    const ids = Array.isArray(m.ids) && m.ids.length ? m.ids : Object.values(S.chars).filter(o => !o.enemy && o.scene === S.focus).map(o => o.id);
    for (const id of ids) { const ch = S.chars[id]; if (ch) { if (m.on) ch.frozen = true; else delete ch.frozen; } }
  },
  tatico(c, m) { // modo tático: n casas por rodada (null desliga)
    if (c.role !== 'gm') return; const sc = S.scenes[S.focus], n = +m.n;
    if (m.n == null || !(n > 0)) delete sc.tatico; else sc.tatico = { n: Math.min(30, n) };
    Object.values(S.chars).filter(o => o.scene === S.focus).forEach(o => { delete o.tatUse; });
  },
  tatNext(c) { if (c.role === 'gm') Object.values(S.chars).filter(o => o.scene === S.focus).forEach(o => { delete o.tatUse; }); },
});
['walk', 'walkGm', 'freeze', 'tatico', 'tatNext'].forEach(k => NOUNDO.add(k));


// ----- rascunho do mestre: wDraft (operações compactas), wPub, wDiscard -----
// O rascunho vai só para os mestres (canal draft, sem push). Publicar troca o world, mantém o estado de jogo dos objetos
// (portas, barreiras e alavancas, baús abertos, revelados) e tira de dentro das paredes quem ficou preso.
const W_NEW = 64, TXT = 800, NOS = 60, MAX_FLOORS = 10;
const OBJ_K = ['porta', 'barreira', 'bau', 'item', 'npc', 'placa', 'alavanca', 'gatilho', 'armadilha', 'escada', 'portal', 'inimigo', 'surgir'];
const str = (v, n = 40) => String(v ?? '').slice(0, n);
const int = (v, a, b, d = a) => Math.min(b, Math.max(a, Math.round(fin(v, d))));
const one = (v, list, d = list[0]) => list.includes(v) ? v : d;
const okId = v => typeof v === 'string' && /^[\w-]{1,40}$/.test(v);
const xy = (a, n = 400) => (Array.isArray(a) ? a : []).slice(0, n).filter(Array.isArray).map(q => [int(q[0], 0, W_LEG - 1), int(q[1], 0, W_LEG - 1)]);
const teste = t => isObj(t) ? { atr: str(t.atr, 8), dif: int(t.dif, 1, 100, 10) } : undefined;
function cleanDialog(d) {
  if (!isObj(d)) return { ini: '', nos: {} };
  const nos = {};
  for (const [k, n] of Object.entries(isObj(d.nos) ? d.nos : {}).filter(([k, n]) => okId(k) && isObj(n)).slice(0, NOS))
    nos[k] = { fala: str(n.fala, TXT), escolhas: (Array.isArray(n.escolhas) ? n.escolhas : []).filter(isObj).slice(0, 6).map(e => ({ txt: str(e.txt, 160), vai: okId(e.vai) ? e.vai : '', faz: str(e.faz, 120) })) };
  return { ini: okId(d.ini) && nos[d.ini] ? d.ini : Object.keys(nos)[0] || '', nos };
}
// só passam os campos de cada tipo (spec, seção 6), já no tipo certo
const CFG = {
  porta: c => ({ e: one(c.e, ['h', 'v']), estado: one(c.estado, ['fechada', 'aberta', 'trancada']), chave: str(c.chave), gasta: !!c.gasta, teste: teste(c.teste) }),
  barreira: c => ({ e: one(c.e, ['h', 'v']), estado: one(c.estado, ['fechada', 'aberta']), aparencia: one(c.aparencia, ['grade', 'magia', 'entulho']) }),
  bau: c => ({ itens: (Array.isArray(c.itens) ? c.itens : []).filter(isObj).slice(0, 20).map(i => ({ id: str(i.id), n: int(i.n, 1, 99, 1) })), ouro: int(c.ouro, 0, 1e6), modo: one(c.modo, ['uma', 'cada']), teste: teste(c.teste), aberto: c.aberto === true || undefined }),
  item: c => ({ item: str(c.item), qtd: int(c.qtd, 1, 99, 1) }),
  npc: c => ({ nome: str(c.nome), retrato: str(c.retrato, 400), imgF: str(c.imgF, 400), ch: str(c.ch), dialogo: cleanDialog(c.dialogo) }),
  placa: c => ({ texto: str(c.texto, TXT), imagem: str(c.imagem, 400) }),
  alavanca: c => ({ alvos: (Array.isArray(c.alvos) ? c.alvos : []).filter(okId).slice(0, 20), acao: one(c.acao, ['alternar', 'abrir', 'fechar']), estado: one(c.estado, ['desligada', 'ligada']) }),
  gatilho: c => ({ casas: xy(c.casas), quem: one(c.quem, ['qualquer', 'todos']), vezes: one(c.vezes, ['uma', 'sempre']),
    acoes: (Array.isArray(c.acoes) ? c.acoes : []).filter(isObj).slice(0, 10).map(a => ({ k: one(a.k, ['abrir', 'fechar', 'revelar', 'texto', 'som', 'objetivo', 'batalha']), alvo: str(a.alvo), v: str(a.v, TXT) })) }),
  armadilha: c => ({ perc: int(c.perc, 0, 100, 10), esq: int(c.esq, 0, 100, 10), dano: int(c.dano, 0, 9999), elem: str(c.elem, 20), cond: str(c.cond, 20), rearma: !!c.rearma }),
  escada: c => ({ para: isObj(c.para) ? { f: str(c.para.f, 20), x: int(c.para.x, 0, W_LEG - 1), y: int(c.para.y, 0, W_LEG - 1) } : null }),
  portal: c => ({ to: str(c.to), destino: str(c.destino) }),
  inimigo: c => ({ ch: str(c.ch), rota: xy(c.rota, 64), modo: one(c.modo, ['parado', 'patrulha', 'vagar']), visao: isObj(c.visao) ? { r: int(c.visao.r, 1, 20, 6), a: int(c.visao.a, 10, 360, 90) } : { r: 6, a: 90 }, bando: str(c.bando) }),
  surgir: () => ({}),
};
const dropUndef = o => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };
function cleanObj(v, w) {
  if (!isObj(v) || !OBJ_K.includes(v.k)) return null;
  const f = w.floors.find(o => o.id === v.f); if (!f) return null;
  const edge = v.k === 'porta' || v.k === 'barreira', o = { k: v.k, f: f.id, x: int(v.x, 0, f.w - (edge ? 0 : 1)), y: int(v.y, 0, f.h - (edge ? 0 : 1)), rot: int(v.rot, 0, 3), vis: one(v.vis, ['visivel', 'oculto']), auto: v.auto === true ? true : v.auto === false ? false : null, cfg: dropUndef(CFG[v.k](isObj(v.cfg) ? v.cfg : {})) };
  if (v.rev === true) o.rev = true;
  return o;
}
// redimensiona um vetor de bytes (linhas de ow → nw), copiando a parte que cabe
const regrid = (b64, ow, oh, nw, nh) => { const a = P.unpack(b64, ow * oh), b = new Uint8Array(nw * nh); for (let y = 0; y < Math.min(oh, nh); y++) for (let x = 0; x < Math.min(ow, nw); x++) b[y * nw + x] = a[y * ow + x]; return b; };
const okXYK = (e, rw, rh, kOk) => { if (!Array.isArray(e)) return null; const [x, y, k] = e.map(Number); return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < rw && y < rh && Number.isInteger(k) && kOk(k) ? [x, y, k] : null; };
const OPS = {
  cells(w, op) {
    const f = w.floors.find(o => o.id === op.f); if (!f || !Array.isArray(op.l)) return;
    const c = P.unpack(f.cell, f.w * f.h); let n = 0;
    for (const e of op.l.slice(0, f.w * f.h)) { const r = okXYK(e, f.w, f.h, k => !!P.decode(k)); if (r) { c[r[1] * f.w + r[0]] = r[2]; n++; } }
    if (n) f.cell = P.pack(c);
  },
  edge(w, op) {
    const f = w.floors.find(o => o.id === op.f); if (!f || !Array.isArray(op.l) || (op.k !== 'h' && op.k !== 'v')) return;
    const H = op.k === 'h', rw = H ? f.w : f.w + 1, rh = H ? f.h + 1 : f.h, key = H ? 'wallH' : 'wallV', a = P.unpack(f[key], rw * rh); let n = 0;
    for (const e of op.l.slice(0, rw * rh)) { const r = okXYK(e, rw, rh, k => k >= 0 && k <= 5); if (r) { a[r[1] * rw + r[0]] = r[2]; n++; } }
    if (n) f[key] = P.pack(a);
  },
  obj(w, op) { if (!okId(op.id)) return; if (op.v === null) { delete w.objs[op.id]; return; } const o = cleanObj(op.v, w); if (o) w.objs[op.id] = o; },
  floor(w, op) {
    const v = op.v; if (!isObj(v) || !okId(v.id)) return;
    const i = w.floors.findIndex(f => f.id === v.id), old = w.floors[i];
    if (v.del) { if (!old || w.floors.length < 2) return; w.floors.splice(i, 1); for (const [k, o] of Object.entries(w.objs)) if (o.f === v.id) delete w.objs[k]; return; }
    const nw = +v.w, nh = +v.h, mw = old ? Math.max(W_NEW, old.w) : W_NEW, mh = old ? Math.max(W_NEW, old.h) : W_NEW; // o andar migrado mantém o tamanho dele
    if (!Number.isInteger(nw) || !Number.isInteger(nh) || nw < 1 || nh < 1 || nw > mw || nh > mh) return;
    if (!old) { if (w.floors.length < MAX_FLOORS) w.floors.push(P.newFloor(v.id, str(v.name, 30) || 'Andar', nw, nh, w.tema)); return; }
    if (v.name != null) old.name = str(v.name, 30) || old.name;
    if (nw === old.w && nh === old.h) return;
    const cell = regrid(old.cell, old.w, old.h, nw, nh), base = P.code(w.tema, 'chao'); for (let k = 0; k < cell.length; k++) if (!cell[k]) cell[k] = base;
    old.cell = P.pack(cell); old.wallH = P.pack(regrid(old.wallH, old.w, old.h + 1, nw, nh + 1)); old.wallV = P.pack(regrid(old.wallV, old.w + 1, old.h, nw + 1, nh));
    old.w = nw; old.h = nh;
    for (const [k, o] of Object.entries(w.objs)) if (o.f === old.id && (o.x > nw || o.y > nh)) delete w.objs[k];
  },
  goal(w, op) { w.goal = str(op.v, 120); },
  tema(w, op) { if (P.TEMAS.includes(op.v)) w.tema = op.v; },
};
function sendDraft(sid, only) {
  const sc = S.scenes[sid]; if (!sc) return; const msg = JSON.stringify({ t: 'draft', sc: sid, d: sc.draft || null });
  for (const c of only ? [only] : wss.clients) if (c.role === 'gm' && c.readyState === 1) c.send(msg);
}
const KEEP_ESTADO = new Set(['porta', 'barreira', 'alavanca']);
// tira da parede (ou de casa bloqueada) o herói preso: vai para o centro da casa livre mais próxima (BFS) e o dono recebe fix
function unstuck(sc) {
  const W = sc.world;
  for (const ch of Object.values(S.chars)) {
    if (ch.enemy || ch.x == null || !ch.pos || S.scenes[ch.scene] !== sc) continue;
    const f = W.floors.find(o => o.id === ch.pos.f); if (!f || !C.blockedAt(f, W.objs, ch.pos.x, ch.pos.z, false)) continue;
    const seen = new Set(), q = [[Math.min(f.w - 1, Math.max(0, ch.x)), Math.min(f.h - 1, Math.max(0, ch.y))]]; let hit = null;
    for (let i = 0; i < q.length && !hit; i++) {
      const [x, y] = q[i], k = y * f.w + x; if (seen.has(k)) continue; seen.add(k);
      if (!C.blockedAt(f, W.objs, x + .5, y + .5, false)) hit = [x, y];
      else for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < f.w && ny < f.h && !seen.has(ny * f.w + nx)) q.push([nx, ny]); }
    }
    if (!hit) continue;
    place(ch, sc, f, hit[0] + .5, hit[1] + .5, ch.pos.d); ch._b = undefined; fixOwners(ch);
  }
}
Object.assign(H, {
  wDraft(c, m) {
    const sc = S.scenes[m.sc]; if (c.role !== 'gm' || !sc?.world || !Array.isArray(m.ops)) return;
    if (!sc.draft) sc.draft = structuredClone(sc.world);
    for (const op of m.ops.slice(0, 500)) if (isObj(op) && Object.hasOwn(OPS, op.o)) OPS[op.o](sc.draft, op);
    sendDraft(m.sc);
  },
  wPub(c, m) {
    const sc = S.scenes[m.sc], d = sc?.draft; if (c.role !== 'gm' || !d) return;
    const old = sc.world;
    for (const [id, o] of Object.entries(d.objs)) { // o estado de jogo vem do publicado
      const p = old.objs?.[id]; if (!p || p.k !== o.k) continue;
      if (KEEP_ESTADO.has(o.k) && p.cfg?.estado !== undefined) o.cfg.estado = p.cfg.estado;
      if (o.k === 'bau' && p.cfg?.aberto) o.cfg.aberto = p.cfg.aberto;
      if (o.k === 'bau' && p.cfg?.por) o.cfg.por = p.cfg.por;
      if (o.k === 'gatilho' && p.cfg?.usado) o.cfg.usado = true;
      if (o.k === 'armadilha' && p.cfg?.tent) o.cfg.tent = p.cfg.tent;
      if (p.rev) o.rev = true;
    }
    for (const f of d.floors) { const o = old.floors.find(x => x.id === f.id); if (o && (o.w !== f.w || o.h !== f.h)) delete sc.seenW?.[f.id]; } // névoa do tamanho antigo não serve
    for (const id of Object.keys(sc.seenW || {})) if (!d.floors.some(f => f.id === id)) delete sc.seenW[id];
    sc.world = { ...d, v: fin(old.v) + 1, legacy: false }; delete sc.draft;
    fixMundo(); unstuck(sc); sendDraft(m.sc);
  },
  wDiscard(c, m) { const sc = S.scenes[m.sc]; if (c.role !== 'gm' || !sc?.draft) return; delete sc.draft; sendDraft(m.sc); },
  wGen(c, m) { // gerador: o andar inteiro do rascunho vira o mapa da semente; os objetos dele são trocados pelos gerados (ids "andar-gN")
    const sc = S.scenes[m.sc]; if (c.role !== 'gm' || !sc?.world || !G.TIPOS.includes(m.tipo)) return;
    if (!sc.draft) sc.draft = structuredClone(sc.world);
    const d = sc.draft, f = d.floors.find(o => o.id === m.f); if (!f) return;
    const r = G.gerar(m.tipo, P.TEMAS.includes(m.tema) ? m.tema : d.tema, int(m.w, 16, W_NEW, f.w), int(m.h, 16, W_NEW, f.h), int(m.seed, 0, 2 ** 31 - 1));
    Object.assign(f, r.floor);
    for (const [id, o] of Object.entries(d.objs)) if (o.f === f.id) delete d.objs[id];
    for (const [id, o] of Object.entries(r.objs)) { const v = cleanObj({ ...o, f: f.id }, d); if (v) d.objs[f.id + '-' + id] = v; }
    sendDraft(m.sc);
  },
});
['wDraft', 'wPub', 'wDiscard', 'wGen'].forEach(k => NOUNDO.add(k)); // o editor tem desfazer próprio
['wDraft', 'wDiscard', 'wGen'].forEach(k => QUIET.add(k)); // o rascunho não vai no push de todos

import { perigoTick, pisou, zoneEnter } from './mundo-obj.js'; // interagir com objetos (usa MH e unstuck só dentro dos handlers)
MH.onCell.push(pisou, zoneEnter); // armadilhas e gatilhos de área ao trocar de casa
import { ambush } from './mundo-ia.js'; // inimigos com patrulha, visão e perseguição (5 Hz)
MH.ambush = ambush; // emboscada do gatilho
export { perigoTick, MH, OBJ_K, W_LEG, cleanObj, sendDraft, unstuck, cellOf, clock, fixMundo, fixWorld, floorOf, place, posFromCell, refreshLegacy, worldFromLegacy };

// ===== mundo 3D explorável: o mapa de cada cena (sc.world), migração do mapa 2D e handlers =====
// sc.world é o mundo publicado (todos veem); sc.draft é o rascunho do mestre. As cenas antigas viram um andar com a imagem
// do mapa como piso (world.legacy): enquanto o mestre não edita a cena no editor novo, o world é refeito a partir do 2D.
import { MIG, S, isObj } from './state.js';
import { H, NOUNDO } from './handlers.js';
import { can } from './rules.js';
import { wss } from './net.js';
import '../public/js/mundo-colisao.js';
const P = globalThis.MPECAS;

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
const MH = { markPos: () => {}, onCell: [] }; // ganchos: rede (pos agregado) e o que acontece ao trocar de casa (névoa, gatilhos…)
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

export { MH, W_LEG, cellOf, clock, fixMundo, fixWorld, floorOf, place, posFromCell, refreshLegacy, worldFromLegacy };

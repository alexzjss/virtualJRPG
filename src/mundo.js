// ===== mundo 3D explorável: o mapa de cada cena (sc.world), migração do mapa 2D e handlers =====
// sc.world é o mundo publicado (todos veem); sc.draft é o rascunho do mestre. As cenas antigas viram um andar com a imagem
// do mapa como piso (world.legacy): enquanto o mestre não edita a cena no editor novo, o world é refeito a partir do 2D.
import { MIG, S, isObj } from './state.js';
import { H } from './handlers.js';
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

export { W_LEG, cellOf, fixMundo, fixWorld, posFromCell, refreshLegacy, worldFromLegacy };

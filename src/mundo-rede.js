// ===== mundo 3D: rede — posições agregadas (canal pos) e o que cada cliente pode ver do mundo =====
// Andar não passa pelo push: as posições que mudaram vão juntas a cada 100 ms, só para quem está na cena (o mestre recebe todas).
// O state de cada cliente leva o world filtrado: sem rascunho, sem objetos ocultos não revelados e sem armadilhas não percebidas.
import { S, inScene } from './state.js';
import { QUIET, hooks, push, sceneOfClient, wss } from './net.js';
import { H, NOUNDO } from './handlers.js';
import { MUNDO } from './config.js';
import { MH, sendDraft } from './mundo.js';

const dirty = new Map(); // cena → ids com posição nova
const markPos = ch => { if (!ch.scene) return; if (!dirty.has(ch.scene)) dirty.set(ch.scene, new Set()); dirty.get(ch.scene).add(ch.id); };
MH.markPos = markPos;
// ----- névoa: visão atual do grupo (união do campo de visão dos heróis) e lembrança em sc.seenW -----
const V = globalThis.MVIS, P = globalThis.MPECAS;
const use3d = sc => !!sc?.world && (MUNDO || !sc.world.legacy); // cena ainda espelhando o 2D (sem o 3D ligado) usa a névoa antiga
const heroesOf = sid => Object.values(S.chars).filter(ch => ch.scene === sid && !ch.enemy && !ch.npc && !ch.summon && ch.pos && ch.x != null);
const doorsKey = objs => Object.entries(objs || {}).filter(([, o]) => o && (o.k === 'porta' || o.k === 'barreira')).map(([id, o]) => id + (o.cfg?.estado === 'aberta' ? 1 : 0)).join();
const cache = new Map(); // cena → { key, vis: {andar: Uint8Array}, b64 }
// null = sem névoa (tudo visível); a chave muda com o world publicado, a hora, as portas e as casas dos heróis
function visNow(sid) {
  const sc = S.scenes[sid]; if (!sc?.fogOn || !use3d(sc)) return null;
  const w = sc.world, hs = heroesOf(sid), key = [w.v, w.hora, doorsKey(w.objs), ...hs.map(h => h.pos.f + ':' + h.x + ',' + h.y)].join('|'), c = cache.get(sid);
  if (c?.key === key) return c.vis;
  const vis = {};
  for (const h of hs) {
    const f = w.floors.find(x => x.id === h.pos.f); if (!f) continue;
    const tema = P.decode(P.cell(f, h.x, h.y))?.tema || w.tema, b = V.fov(f, w.objs, h.x, h.y, V.radius(w.hora, tema, w.hora === 'noite' || tema === 'caverna')); // a tocha só acende à noite e na caverna
    vis[f.id] = vis[f.id] ? V.orBits(vis[f.id], b) : b;
  }
  cache.set(sid, { key, vis, b64: null }); return vis;
}
// a visão atual em base64 por andar (o que o jogador recebe em state.vis e no pos)
function visB64(sid) { const vis = visNow(sid); if (!vis) return null; const c = cache.get(sid); return c.b64 || (c.b64 = Object.fromEntries(Object.entries(vis).map(([k, b]) => [k, V.toB64(b)]))); }
const VIS = { now: visNow, b64: visB64 };
const cellSeen = (vis, ch) => { if (!vis) return true; const b = vis[ch.pos?.f], f = b && S.scenes[ch.scene]?.world?.floors.find(x => x.id === ch.pos.f); return !!f && b[ch.y * f.w + ch.x] === 1; };
// heróis aparecem sempre para o grupo; inimigos, NPCs e invocações só dentro da visão atual
const canSee = (c, ch, sid) => c.role === 'gm' || (!ch.enemy && !ch.npc) || cellSeen(VIS.now(sid), ch);
const row = ch => [ch.id, ch.pos.f, ch.pos.x, ch.pos.z, ch.pos.d || 0, ch._m || 'a'];
// tudo que entra na visão vira lembrança do grupo; casa nova lembrada ou inimigo que aparece/some pede um push (o resto vai no pos)
const foesSeen = new Map();
function remember(sid) {
  const sc = S.scenes[sid], vis = visNow(sid); let nova = false; if (!vis) return false;
  for (const [fid, b] of Object.entries(vis)) {
    const f = sc.world.floors.find(x => x.id === fid), old = V.fromB64(sc.seenW?.[fid] || '', f.w * f.h); let ch = false;
    for (let i = 0; i < b.length; i++) if (b[i] && !old[i]) { old[i] = 1; ch = true; }
    if (ch) { sc.seenW[fid] = V.toB64(old); nova = true; }
  }
  return nova;
}
let pend = false; const later = () => { if (pend) return; pend = true; queueMicrotask(() => { pend = false; push(false); }); };
function vision(sid) {
  if (!visNow(sid)) return;
  const nova = remember(sid), sig = Object.values(S.chars).filter(ch => ch.scene === sid && (ch.enemy || ch.npc) && ch.pos && hooks.foeSeen(ch)).map(ch => ch.id).sort().join();
  if (nova || sig !== foesSeen.get(sid)) { foesSeen.set(sid, sig); later(); }
}
MH.vision = vision; MH.visNow = visNow;
MH.onCell.push(ch => vision(ch.scene));
hooks.foeSeen = ch => { const sc = S.scenes[ch.scene]; return use3d(sc) ? cellSeen(visNow(ch.scene), ch) : !!sc?.seen?.[ch.x + ',' + ch.y]; };
const visSent = new Map(); // cena → chave da última visão que foi no pos
// pincel de névoa do mestre no editor (casas de um andar) e "revelar/esconder tudo": no 3D valem sobre sc.seenW
H.wFog = (c, m) => {
  const sc = S.scenes[m.sc], f = sc?.world?.floors.find(x => x.id === m.f); if (c.role !== 'gm' || !f || !Array.isArray(m.l)) return;
  const n = f.w * f.h, b = V.fromB64(sc.seenW?.[f.id] || '', n);
  for (const xy of m.l.slice(0, 4000)) { const x = Array.isArray(xy) ? xy[0] : NaN, y = Array.isArray(xy) ? xy[1] : NaN; if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < f.w && y < f.h) b[y * f.w + x] = m.hide ? 0 : 1; }
  sc.seenW = { ...sc.seenW, [f.id]: V.toB64(b) };
};
NOUNDO.add('wFog');
const fogAll0 = H.fogAll;
H.fogAll = (c, m) => {
  fogAll0(c, m); const sc = S.scenes[S.scene]; if (c.role !== 'gm' || !sc?.world || sc.world.legacy) return; // cena legacy: o 2D refaz o seenW sozinho
  sc.seenW = Object.fromEntries(sc.world.floors.map(f => [f.id, V.toB64(new Uint8Array(f.w * f.h).fill(m.v ? 1 : 0))]));
};
function flushPos() {
  if (!dirty.size) return;
  const batch = [...dirty]; dirty.clear();
  for (const [sid, ids] of batch) inScene(sid, () => {
    const list = [...ids].map(id => S.chars[id]).filter(ch => ch && ch.scene === sid && ch.pos);
    if (!list.length) return;
    const vk = cache.get(sid)?.key, vis = visNow(sid) && vk !== visSent.get(sid) ? visB64(sid) : null; if (vis) visSent.set(sid, cache.get(sid).key);
    wss.clients.forEach(c => {
      if (!c.role || c.readyState !== 1 || (c.role !== 'gm' && sceneOfClient(c) !== sid)) return;
      const l = list.filter(ch => canSee(c, ch, sid)).map(row); if (l.length) c.send(JSON.stringify(vis && c.role !== 'gm' ? { t: 'pos', sc: sid, l, vis } : { t: 'pos', sc: sid, l }));
    });
  });
}
const timer = setInterval(() => { try { flushPos(); } catch (e) { console.error('Falha ao enviar posições:', e); } }, 100); timer.unref?.();

// world que o cliente recebe: o mestre vê tudo; jogador e mesa não recebem o oculto nem o que está fora da visão
function visFilter(c, sc, sid) {
  if (!sc?.world) return sc?.world;
  if (c.role === 'gm') return sc.world;
  const objs = {};
  for (const [id, o] of Object.entries(sc.world.objs)) {
    if ((o.vis === 'oculto' || o.k === 'armadilha') && !o.rev) continue;
    if (o.k === 'inimigo' && S.chars[o.cfg?.ch] && !canSee(c, S.chars[o.cfg.ch], sid)) continue;
    objs[id] = o.k === 'armadilha' && o.cfg?.tent ? { ...o, cfg: (({ tent, ...r }) => r)(o.cfg) } : o; // quem já tentou perceber fica com o mestre
  }
  return { ...sc.world, objs };
}
hooks.view = (c, v) => {
  v.scenes = { ...v.scenes }; // no mestre, v.scenes ainda é o próprio S.scenes
  for (const [k, sc] of Object.entries(v.scenes || {})) if (sc && (sc.world || sc.draft)) v.scenes[k] = { ...sc, draft: undefined, world: visFilter(c, S.scenes[k], k) };
  v.mundo = MUNDO;
  for (const [id, ch] of Object.entries(v.chars || {})) if (ch?.enemy && !ch.pos && S.chars[id]?.pos) ch.pos = { ...S.chars[id].pos }; // o scrub tira o pos; inimigo parado e visível precisa aparecer no 3D
  if (c.role !== 'gm') { const b = visB64(S.scene); if (b) v.vis = b; delete v.worldTpl; } // visão atual do grupo (sem ela, a névoa lembrada vale como visível); os modelos do mapa são do mestre
  if (c.role === 'gm' && !c._draftOk && c.send) { c._draftOk = true; queueMicrotask(() => { for (const [k, sc] of Object.entries(S.scenes || {})) if (sc?.draft) sendDraft(k, c); }); } // mestre que acabou de conectar: os rascunhos vão logo depois do primeiro state
  return v;
};

// "Ver como": o mestre pede o world que um herói recebe (mesmo filtro) e a visão atual do grupo; só para ele, sem push
H.asView = (c, m) => {
  const ch = S.chars[m.id], sc = S.scenes[ch?.scene]; if (c.role !== 'gm' || !ch || !sc?.world || typeof c.send !== 'function') return;
  const vis = visB64(ch.scene), as = { role: 'player', name: ch.owner || '', readyState: 1 };
  c.send(JSON.stringify({ t: 'asView', id: ch.id, sc: ch.scene, w: visFilter(as, sc, ch.scene), vis }));
};
QUIET.add('asView'); NOUNDO.add('asView');

export { VIS, canSee, flushPos, markPos, remember, visFilter, vision };

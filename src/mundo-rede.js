// ===== mundo 3D: rede — posições agregadas (canal pos) e o que cada cliente pode ver do mundo =====
// Andar não passa pelo push: as posições que mudaram vão juntas a cada 100 ms, só para quem está na cena (o mestre recebe todas).
// O state de cada cliente leva o world filtrado: sem rascunho, sem objetos ocultos não revelados e sem armadilhas não percebidas.
import { S, inScene } from './state.js';
import { QUIET, hooks, sceneOfClient, wss } from './net.js';
import { H, NOUNDO } from './handlers.js';
import { MUNDO } from './config.js';
import { MH, sendDraft } from './mundo.js';

const dirty = new Map(); // cena → ids com posição nova
const VIS = { now: () => null }; // visão atual do grupo por cena (Task 4.2); null = tudo visível
const markPos = ch => { if (!ch.scene) return; if (!dirty.has(ch.scene)) dirty.set(ch.scene, new Set()); dirty.get(ch.scene).add(ch.id); };
MH.markPos = markPos;
const cellSeen = (vis, ch) => { if (!vis) return true; const b = vis[ch.pos?.f]; return !!b && !!b.has?.(ch.x + ',' + ch.y); };
// heróis aparecem sempre para o grupo; inimigos, NPCs e invocações só dentro da visão atual
const canSee = (c, ch, sid) => c.role === 'gm' || (!ch.enemy && !ch.npc) || cellSeen(VIS.now(sid), ch);
const row = ch => [ch.id, ch.pos.f, ch.pos.x, ch.pos.z, ch.pos.d || 0, ch._m || 'a'];
function flushPos() {
  if (!dirty.size) return;
  const batch = [...dirty]; dirty.clear();
  for (const [sid, ids] of batch) inScene(sid, () => {
    const list = [...ids].map(id => S.chars[id]).filter(ch => ch && ch.scene === sid && ch.pos);
    if (!list.length) return;
    wss.clients.forEach(c => {
      if (!c.role || c.readyState !== 1 || (c.role !== 'gm' && sceneOfClient(c) !== sid)) return;
      const l = list.filter(ch => canSee(c, ch, sid)).map(row); if (l.length) c.send(JSON.stringify({ t: 'pos', sc: sid, l }));
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
    objs[id] = o;
  }
  return { ...sc.world, objs };
}
hooks.view = (c, v) => {
  v.scenes = { ...v.scenes }; // no mestre, v.scenes ainda é o próprio S.scenes
  for (const [k, sc] of Object.entries(v.scenes || {})) if (sc && (sc.world || sc.draft)) v.scenes[k] = { ...sc, draft: undefined, world: visFilter(c, S.scenes[k], k) };
  v.mundo = MUNDO;
  if (c.role === 'gm' && !c._draftOk && c.send) { c._draftOk = true; queueMicrotask(() => { for (const [k, sc] of Object.entries(S.scenes || {})) if (sc?.draft) sendDraft(k, c); }); } // mestre que acabou de conectar: os rascunhos vão logo depois do primeiro state
  return v;
};

// "Ver como": o mestre pede o world que um herói recebe (mesmo filtro) e a visão atual do grupo; só para ele, sem push
H.asView = (c, m) => {
  const ch = S.chars[m.id], sc = S.scenes[ch?.scene]; if (c.role !== 'gm' || !ch || !sc?.world || typeof c.send !== 'function') return;
  const vis = VIS.now(ch.scene), as = { role: 'player', name: ch.owner || '', readyState: 1 };
  c.send(JSON.stringify({ t: 'asView', id: ch.id, sc: ch.scene, w: visFilter(as, sc, ch.scene), vis: vis ? Object.fromEntries(Object.entries(vis).map(([k, v]) => [k, [...v]])) : null }));
};
QUIET.add('asView'); NOUNDO.add('asView');

export { VIS, canSee, flushPos, markPos, visFilter };

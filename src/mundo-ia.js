// ===== mundo 3D: IA dos inimigos no mapa — patrulha, cone de visão, perseguição e volta à rota =====
// Roda no servidor a 5 Hz (startIA), em cenas com algum herói presente, dentro de inScene; com batalha, só quem persegue anda (entrada tardia).
// Só age o inimigo com um objeto `inimigo` ligado (cfg.ch). O estado fica em obj.ia = { s, t, alvo, i, dir, ult }:
//   parado | patrulha | vagar → alerta (viu um herói; 1 s olhando) → persegue (A*, correndo) → 6 s sem ver → volta (A* até a rota).
// O caminho calculado mora fora do state (RUN), para não ir ao save nem às telas.
import { S, inScene, log } from './state.js';
import { push } from './net.js';
import { H } from './handlers.js';
import { can } from './rules.js';
import { RU } from './config.js';
import { BBG } from './consts.js';
import { MH, floorOf, place } from './mundo.js';

const TICK = .2, ALERTA = 1, PERDE = 6, PERTO = .8, VAGA = 4, EPS = 1e-9;
const RUN = new Map(); // id do objeto → { path: [[x, y], …], pk: 'x,y' do destino }
const P = () => globalThis.MPECAS, C = () => globalThis.MCOL;
const base = o => o.cfg?.modo === 'vagar' ? 'vagar' : o.cfg?.modo === 'patrulha' && o.cfg.rota?.length ? 'patrulha' : 'parado';
const heroesOf = sid => Object.values(S.chars).filter(h => h.scene === sid && !h.enemy && !h.npc && !h.summon && h.pos && h.hp > 0);
const noCentro = (ch, x, y) => ch.x === x && ch.y === y && Math.hypot(ch.pos.x - x - .5, ch.pos.z - y - .5) < .06;

// o inimigo vê o herói? raio (dobra correndo, metade agachado), metade do ângulo em volta do rumo e linha de visão sem parede
function sees(o, h) {
  const e = S.chars[o?.cfg?.ch], sc = S.scenes[e?.scene];
  if (!e?.pos || !h?.pos || !sc?.world || h.scene !== e.scene || h.pos.f !== e.pos.f) return false;
  const v = o.cfg.visao || {}, raio = (v.r ?? 6) * (h._m === 'c' ? 2 : h._m === 'g' ? .5 : 1), ang = v.a ?? 90;
  const dx = h.pos.x - e.pos.x, dz = h.pos.z - e.pos.z, L = Math.hypot(dx, dz); if (L > raio + EPS) return false;
  if (L > 1e-6 && ang < 360 && (dx * Math.sin(e.pos.d || 0) + dz * Math.cos(e.pos.d || 0)) / L < Math.cos(ang / 2 * Math.PI / 180) - EPS) return false;
  const f = floorOf(sc, e.pos.f); return !!f && globalThis.MVIS.ray(f, C().openIdx(sc.world.objs, f.id), e.x, e.y, h.x, h.y);
}

// A* na grade: 4 vizinhos, custo 1 (2 na água), sem atravessar casa sólida nem aresta fechada. Devolve as casas depois da origem.
function astar(f, objs, from, to) {
  const Pp = P(), open = C().openIdx(objs, f.id), W = f.w, Hh = f.h, [fx, fy] = from, [tx, ty] = to;
  const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < Hh, livre = (x, y) => !Pp.blocksWalk(Pp.cell(f, x, y));
  if (!dentro(fx, fy) || !dentro(tx, ty) || !livre(tx, ty)) return null;
  if (fx === tx && fy === ty) return [];
  const g = new Float64Array(W * Hh).fill(Infinity), prev = new Int32Array(W * Hh).fill(-1), done = new Uint8Array(W * Hh), heap = [];
  const hp = (k, i) => { heap.push([k, i]); let n = heap.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (heap[p][0] <= heap[n][0]) break; [heap[p], heap[n]] = [heap[n], heap[p]]; n = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === n) break; [heap[m], heap[n]] = [heap[n], heap[m]]; n = m; } } return top; };
  const s = fy * W + fx, goal = ty * W + tx; g[s] = 0; hp(Math.abs(tx - fx) + Math.abs(ty - fy), s);
  // aresta entre a casa (x, y) e a vizinha no rumo (dx, dy): parede, porta ou barreira fechada bloqueiam
  const aresta = (x, y, dx, dy) => dx ? Pp.edgeBlocksWalk(Pp.edgeV(f, dx > 0 ? x + 1 : x, y), open.has('v' + (dx > 0 ? x + 1 : x) + ',' + y))
    : Pp.edgeBlocksWalk(Pp.edgeH(f, x, dy > 0 ? y + 1 : y), open.has('h' + x + ',' + (dy > 0 ? y + 1 : y)));
  while (heap.length) {
    const [, i] = pop(); if (done[i]) continue; done[i] = 1; if (i === goal) break;
    const x = i % W, y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * W + nx; if (!dentro(nx, ny) || done[j] || !livre(nx, ny) || aresta(x, y, dx, dy)) continue;
      const ng = g[i] + (Pp.tipoOf(Pp.cell(f, nx, ny)) === 'agua' ? 2 : 1); if (ng >= g[j]) continue;
      g[j] = ng; prev[j] = i; hp(ng + Math.abs(tx - nx) + Math.abs(ty - ny), j);
    }
  }
  if (!done[goal]) return null;
  const out = []; for (let i = goal; i !== s; i = prev[i]) out.push([i % W, (i - i % W) / W]);
  return out.reverse();
}

// anda pelo caminho até gastar o passo do tick (slide nas paredes); travou: esquece o caminho e recalcula no próximo
function andar(e, sc, f, run, vel, dt) {
  let left = vel * dt, x = e.pos.x, z = e.pos.z, d = e.pos.d || 0;
  while (left > 1e-6 && run.path.length) {
    const [cx, cy] = run.path[0], dx = cx + .5 - x, dz = cy + .5 - z, L = Math.hypot(dx, dz);
    if (L < .05) { run.path.shift(); continue; }
    const st = Math.min(left, L), p = C().slide(f, sc.world.objs, { x, z }, dx / L * st, dz / L * st, false);
    d = Math.atan2(dx, dz); const mv = Math.hypot(p.x - x, p.z - z); x = p.x; z = p.z; left -= st;
    if (mv < 1e-4) { run.path.length = 0; run.pk = ''; break; }
  }
  place(e, sc, f, x, z, d);
}
// devolve false quando não há caminho até a casa (sem passagem ou isolada)
function irPara(e, sc, f, run, x, y, vel, dt) {
  const pk = x + ',' + y;
  if (run.pk !== pk || !run.path.length) { run.pk = pk; run.path = e.x === x && e.y === y ? [[x, y]] : astar(f, sc.world.objs, [e.x, e.y], [x, y]) || []; }
  if (!run.path.length) return false;
  andar(e, sc, f, run, vel, dt); return true;
}
const olha = (e, sc, f, h) => place(e, sc, f, e.pos.x, e.pos.z, Math.atan2(h.pos.x - e.pos.x, h.pos.z - e.pos.z));

function tickIA(sid, dt = TICK) {
  const sc = S.scenes[sid]; if (!sc?.world || sc.battle?.active) return;
  const heroes = heroesOf(sid), SP = C().SPEED; let moveu = false, mudou = false;
  for (const [id, o] of Object.entries(sc.world.objs)) {
    if (o?.k !== 'inimigo') continue; const e = S.chars[o.cfg?.ch];
    if (!e?.enemy || e.scene !== sid || !(e.hp > 0) || e.frozen) continue;
    if (!e.pos) { const f0 = floorOf(sc, o.f); if (!f0) continue; place(e, sc, f0, o.x + .5, o.y + .5, (o.rot || 0) * Math.PI / 2); }
    const f = floorOf(sc, e.pos.f); if (!f) continue;
    const ia = o.ia ||= { s: base(o), t: 0, i: 0, dir: 1 }, s0 = ia.s, cx = e.x, cy = e.y;
    let run = RUN.get(id); if (!run) RUN.set(id, run = { path: [], pk: '' });
    const toque = heroes.find(h => h.pos.f === e.pos.f && Math.hypot(h.pos.x - e.pos.x, h.pos.z - e.pos.z) < PERTO);
    if (toque) { engage(sid, toque, o, ia.s === 'persegue' ? 'alcance' : 'toque'); return; } // encostou (ou foi alcançado): começa a batalha
    const viu = heroes.find(h => h.id === ia.alvo && sees(o, h)) || heroes.find(h => sees(o, h));
    if (viu && ia.s !== 'alerta' && ia.s !== 'persegue') { ia.s = 'alerta'; ia.t = 0; ia.alvo = viu.id; ia.ult = [viu.x, viu.y]; run.pk = ''; }
    if (ia.s === 'alerta') {
      if (viu) { ia.alvo = viu.id; ia.ult = [viu.x, viu.y]; olha(e, sc, f, viu); }
      if ((ia.t += dt) >= ALERTA - EPS) { ia.s = 'persegue'; ia.t = 0; }
    } else if (ia.s === 'persegue') {
      if (viu) { ia.alvo = viu.id; ia.ult = [viu.x, viu.y]; ia.t = 0; irPara(e, sc, f, run, viu.x, viu.y, SP.c, dt); }
      else if ((ia.t += dt) >= PERDE - EPS) { ia.s = 'volta'; ia.t = 0; ia.alvo = null; run.pk = ''; }
      else if (ia.ult) irPara(e, sc, f, run, ia.ult[0], ia.ult[1], SP.c, dt);
    } else if (ia.s === 'volta') {
      const rota = o.cfg.rota?.length ? o.cfg.rota : [[o.x, o.y]], perto = rota.map((p, i) => [Math.hypot(p[0] - e.x, p[1] - e.y), i]).sort((a, b) => a[0] - b[0]);
      let foi = false; // a casa da rota mais perto que tenha caminho; nenhuma: volta ao modo base onde está
      for (const [, k] of perto) { const [tx, ty] = rota[k]; if (noCentro(e, tx, ty)) { ia.s = base(o); ia.i = k; ia.t = 0; run.pk = ''; foi = true; break; } if (irPara(e, sc, f, run, tx, ty, SP.a, dt)) { foi = true; break; } }
      if (!foi) { ia.s = base(o); ia.t = 0; }
    } else if (ia.s === 'patrulha') {
      const rota = o.cfg.rota || []; if (!rota.length) { ia.s = 'parado'; continue; }
      if (ia.i >= rota.length) ia.i = 0;
      const prox = () => { if (ia.i + ia.dir < 0 || ia.i + ia.dir >= rota.length) ia.dir = -ia.dir; ia.i += ia.dir; }; // vaivém: na ponta, inverte
      for (let n = 0; n <= rota.length && rota.length > 1; n++) { // casa alcançada ou sem caminho: segue para a próxima
        const [tx, ty] = rota[ia.i]; if (!noCentro(e, tx, ty) && irPara(e, sc, f, run, tx, ty, SP.a, dt)) break; prox();
      }
      if (rota.length === 1 && !noCentro(e, ...rota[0])) irPara(e, sc, f, run, rota[0][0], rota[0][1], SP.a, dt);
    } else if (ia.s === 'vagar') {
      if (!run.path.length && (ia.t -= dt) <= 0) { // sorteia uma casa livre perto de casa e espera 1,5 s ao chegar
        for (let n = 0; n < 12; n++) {
          const x = o.x + Math.round((Math.random() * 2 - 1) * VAGA), y = o.y + Math.round((Math.random() * 2 - 1) * VAGA), p = astar(f, sc.world.objs, [e.x, e.y], [x, y]);
          if (p?.length) { run.path = p; run.pk = x + ',' + y; break; }
        }
        ia.t = 1.5;
      }
      if (run.path.length) andar(e, sc, f, run, SP.a, dt);
    } else if (!noCentro(e, o.x, o.y)) irPara(e, sc, f, run, o.x, o.y, SP.a, dt); // parado: volta para o seu lugar
    if (ia.s !== s0) mudou = true; if (e.x !== cx || e.y !== cy) moveu = true;
  }
  if (moveu) MH.vision(sid); // inimigo entrou ou saiu da visão do grupo
  if (mudou) push(false); // alerta, perseguição e volta aparecem para todos (cone e "!")
}
function iaAll(dt = TICK) {
  for (const [sid, sc] of Object.entries(S.scenes)) {
    if (!sc?.world || !Object.values(sc.world.objs).some(o => o?.k === 'inimigo') || !heroesOf(sid).length) continue;
    inScene(sid, () => sc.battle?.active ? tardios(sid, dt) : tickIA(sid, dt));
  }
}

// ===== começo da batalha no mundo: toque, golpe (F), alcance e emboscada (Task 6.2) =====
// engage junta todos os heróis vivos da cena, o inimigo tocado, o bando dele e quem está a até 8 casas vendo algum combatente,
// e chama o H.battle com ids, abre (surpresa | emboscada) e at (a casa do contato: arena e clima do lugar).
const cone = (a, b, graus) => { const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, L = Math.hypot(dx, dz); return L < 1e-6 || graus >= 360 || (dx * Math.sin(a.pos.d || 0) + dz * Math.cos(a.pos.d || 0)) / L >= Math.cos(graus / 2 * Math.PI / 180) - EPS; };
const ligados = (sc, sid) => Object.values(sc.world.objs).filter(x => { const xe = x?.k === 'inimigo' && S.chars[x.cfg?.ch]; return xe?.enemy && xe.scene === sid && xe.pos && xe.hp > 0; });
function comecar(sid, ids, abre, at) {
  inScene(sid, () => {
    H.battle({ role: 'gm' }, { on: true, ids, abre, at });
    if (abre && S.battle.active) log('Mestre', abre === 'surpresa' ? 'Ataque surpresa! Os heróis agem primeiro e os inimigos ficam Expostos.' : 'Emboscada! Os inimigos agem primeiro.', abre === 'surpresa' ? 'ok' : 'bad');
  });
  push(); return !!S.scenes[sid]?.battle?.active;
}
function engage(sid, h, o, kind) {
  const sc = S.scenes[sid], e = S.chars[o?.cfg?.ch]; if (!sc?.world || sc.battle?.active || !e?.pos || !h?.pos) return false;
  const heroes = heroesOf(sid), lig = ligados(sc, sid), foes = new Set([e.id]);
  if (o.cfg.bando) for (const x of lig) if (x.cfg.bando === o.cfg.bando) foes.add(x.cfg.ch);
  const comb = [...heroes, ...[...foes].map(id => S.chars[id])];
  for (const x of lig) { const xe = S.chars[x.cfg.ch]; if (!foes.has(xe.id) && comb.some(c => c.pos.f === xe.pos.f && Math.hypot(c.pos.x - xe.pos.x, c.pos.z - xe.pos.z) <= 8 + EPS && sees(x, c))) foes.add(xe.id); }
  const visto = o.ia?.s === 'alerta' || o.ia?.s === 'persegue';
  const abre = kind === 'golpe' || (kind === 'toque' && (!cone(e, h, o.cfg.visao?.a ?? 90) || (h._m === 'g' && !visto))) ? 'surpresa'
    : kind === 'gatilho' || (kind === 'alcance' && !cone(h, e, 180)) ? 'emboscada' : null;
  return comecar(sid, [...heroes.map(x => x.id), ...foes], abre, { f: h.pos.f, x: h.x, y: h.y });
}
// golpe no mapa (F): arco de 1,2 casa e 90° à frente; o inimigo mais perto no arco começa a batalha com surpresa
H.strike = (c, m) => {
  const h = S.chars[m?.id], sid = h?.scene, sc = S.scenes[sid];
  if (!h?.pos || h.enemy || h.frozen || !can(c, h) || !sc?.world || sc.battle?.active) return;
  let alvo = null, best = Infinity;
  for (const o of ligados(sc, sid)) {
    const e = S.chars[o.cfg.ch], L = Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z);
    if (e.pos.f === h.pos.f && L <= 1.2 + EPS && cone(h, e, 90) && L < best) { best = L; alvo = o; }
  }
  if (alvo) engage(sid, h, alvo, 'golpe');
};
// gatilho com ação batalha: o encontro salvo aparece nas casas marcadas e ataca primeiro
const ambush = (sid, encId, casas, fid) => {
  const sc = S.scenes[sid]; if (!sc?.world || sc.battle?.active || !S.encounters?.[encId]) return false;
  const hs = heroesOf(sid); if (!hs.length) return false;
  const f = floorOf(sc, fid) || floorOf(sc, hs[0].pos.f) || sc.world.floors[0]; if (!f) return false;
  const antes = new Set(Object.keys(S.chars)); inScene(sid, () => H.encSpawn({ role: 'gm' }, { id: encId }));
  const novos = Object.keys(S.chars).filter(k => !antes.has(k)).map(k => S.chars[k]).filter(ch => ch.enemy && ch.scene === sid); if (!novos.length) return false;
  const cs = Array.isArray(casas) && casas.length ? casas : [[hs[0].x + 2, hs[0].y]];
  novos.forEach((ch, i) => { const [x, y] = cs[i % cs.length]; place(ch, sc, f, Math.min(f.w - 1, Math.max(0, x)) + .5, Math.min(f.h - 1, Math.max(0, y)) + .5, 0); });
  return comecar(sid, [...hs.map(x => x.id), ...novos.map(x => x.id)], 'emboscada', { f: f.id, x: hs[0].x, y: hs[0].y });
};
// H.battle: com ids, só eles entram (os outros saem do mapa só durante a chamada); abre adianta um lado; at dá arena, clima e eixo
const battle0 = H.battle;
H.battle = (c, m) => {
  if (c?.role !== 'gm') return battle0(c, m);
  const sid = S.scene, sc = S.scenes[sid];
  if (!m?.on) { const was = S.battle.active, part = new Set(Object.keys(S.battle.ticks)); battle0(c, m); if (was && sc?.world) fimMundo(sc, part); return; }
  const ids = Array.isArray(m.ids) ? new Set(m.ids.filter(x => typeof x === 'string')) : null, fora = [];
  if (ids) for (const ch of Object.values(S.chars)) if (ch.scene === sid && ch.x != null && !ids.has(ch.id)) { fora.push([ch, ch.x]); ch.x = null; }
  try { battle0(c, m); } finally { for (const [ch, x] of fora) ch.x = x; }
  if (!S.battle.active || !sc) return;
  const T = S.battle.ticks, ks = Object.keys(T), hs = ks.filter(k => !S.chars[k]?.enemy), es = ks.filter(k => S.chars[k]?.enemy);
  if (hs.length && es.length && (m.abre === 'surpresa' || m.abre === 'emboscada')) {
    const [antes, depois] = m.abre === 'surpresa' ? [hs, es] : [es, hs], shift = Math.max(...antes.map(k => T[k])) - Math.min(...depois.map(k => T[k])) + 1;
    if (shift > 0) for (const k of depois) T[k] += shift;
    if (m.abre === 'surpresa') for (const k of es) S.chars[k].st.exposed = 1;
  }
  const at = m.at && Number.isInteger(m.at.x) && Number.isInteger(m.at.y) ? m.at : null; if (!at || !sc.world) return;
  // num mapa grande, o eixo do palco sai das posições comprimidas em direção ao contato (ch.x/ch.y ficam como estão)
  const list = ks.map(k => S.chars[k]).filter(o => o?.x != null); let far = 0;
  for (const p of list) for (const q of list) far = Math.max(far, Math.hypot(p.x - q.x, p.y - q.y));
  if (far > 10) { const k = 10 / far; S.battle.ax = RU.axisOf(list.map(o => ({ enemy: o.enemy, x: at.x + (o.x - at.x) * k, y: at.y + (o.y - at.y) * k }))); }
  const f = sc.world.floors.find(x => x.id === at.f), d = f && P().decode(P().cell(f, at.x, at.y)); if (!d) return;
  const bb = d.tema + '-' + (sc.world.hora || 'dia'); if (!sc.bbgFixo && BBG.includes(bb)) sc.bbg = bb;
  if (!sc.clima) { const cl = d.tipo === 'agua' ? 'chuva' : d.tipo === 'perigo' && d.tema === 'vulcao' ? 'brasas' : d.tema === 'neve' ? 'neve' : d.tema === 'pantano' ? 'neblina' : ''; if (cl) { sc.clima = cl; sc.climaAuto = true; } }
};
// fim da luta: derrotados com objeto somem do mapa; quem lutou e sobreviveu volta à rota; o clima automático sai
function fimMundo(sc, part) {
  for (const [id, o] of Object.entries(sc.world.objs)) {
    const e = o?.k === 'inimigo' && S.chars[o.cfg?.ch]; if (!e) continue;
    if (e.hp <= 0) { delete sc.world.objs[id]; if (sc.draft?.objs) delete sc.draft.objs[id]; RUN.delete(id); }
    else if (part.has(e.id)) { o.ia = { i: 0, dir: 1, ...o.ia, s: 'volta', t: 0, alvo: null }; RUN.delete(id); }
  }
  if (sc.climaAuto) { sc.clima = ''; delete sc.climaAuto; }
}
// o mestre escolheu o fundo da batalha à mão: o lugar do contato não troca mais
const map0 = H.map;
H.map = (c, m) => { map0(c, m); if (c?.role === 'gm' && m?.f === 'bbg') { const sc = S.scenes[S.scene]; if (sc) sc.bbgFixo = !!sc.bbg; } };
// durante a batalha: quem persegue corre até o combatente mais perto e entra no fim da fila (como quem chega no meio da luta)
function tardios(sid, dt) {
  const sc = S.scenes[sid], T = sc.battle.ticks, SP = C().SPEED; let moveu = false;
  const comb = Object.keys(T).map(k => S.chars[k]).filter(c => c?.pos && !c.enemy && c.scene === sid);
  for (const [id, o] of Object.entries(sc.world.objs)) {
    const e = o?.k === 'inimigo' && o.ia?.s === 'persegue' && S.chars[o.cfg?.ch];
    if (!e?.enemy || e.scene !== sid || !(e.hp > 0) || !e.pos || e.id in T || e.frozen) continue;
    const f = floorOf(sc, e.pos.f), dist = c => Math.hypot(c.pos.x - e.pos.x, c.pos.z - e.pos.z), alvo = comb.filter(c => c.pos.f === e.pos.f).sort((a, b) => dist(a) - dist(b))[0];
    if (!f || !alvo) continue;
    let run = RUN.get(id); if (!run) RUN.set(id, run = { path: [], pk: '' });
    if (dist(alvo) < PERTO) { T[e.id] = Math.max(0, ...Object.values(T)) + 1; e.bt = {}; log('Mestre', `${e.name} chega e entra na luta!`, 'bad'); push(); continue; }
    const x0 = e.x, y0 = e.y; irPara(e, sc, f, run, alvo.x, alvo.y, SP.c, dt); if (e.x !== x0 || e.y !== y0) moveu = true;
  }
  if (moveu) MH.vision(sid);
}
let timer = null;
function startIA() { if (timer) return; timer = setInterval(() => { try { iaAll(TICK); } catch (e) { console.error('Falha na IA do mundo:', e); } }, TICK * 1000); timer.unref?.(); }
startIA();

export { ambush, astar, engage, iaAll, sees, startIA, tickIA };

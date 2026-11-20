// ===== mundo 3D explorável (three.js): renderer, câmera isométrica, montagem e sincronização =====
// O canvas mora fora do #app (fixo no body, atrás da HUD), como o palco 3D: o render() reescreve o #app por string e só chama
// MUNDO.sync(S, ctx). O #app marca o retângulo com [data-mundo]. Unidades: 1 casa = 1; x → X, z → Z, Y para cima.
import * as T from '/vendor/three.module.js';
import { buildFloor, setCutaway, tickPecas, disposeFloor } from './mundo3d-pecas.js';
import { Actors } from './mundo3d-atores.js';
import { Fx, fogData, shatter } from './mundo3d-fx.js';
import './mundo-hud.js'; // prompt do E, diálogo e placa (MHUD)
import './mundo-som.js'; // passos, ambiência e efeitos (MSOM)

const TILT = 35 * Math.PI / 180, ROT_MS = 250;
const ZOOMS = ['perto', 'medio', 'andar'], ZH = { perto: 8, medio: 14 };
let renderer = null, scene = null, cam = null, root = null, floorG = null, actors = null, fx = null, lost = false, paused = false;
let S = null, ctx = {}, key = '', running = false, slot = null;
const view = { yawK: 0, yaw: Math.PI / 4, yaw0: Math.PI / 4, yawT: 0, zoom: 'medio', tx: 0, tz: 0, pan: null, follow: null, free: null };
const fpsBuf = []; let lastT = 0;
// qualidade: Alta (1,5 px, sombras, contorno), Média (1,0, contorno), Baixa (0,75, sem contorno nas peças baixas).
// Auto começa na Média, desce um nível se a média de 3 s ficar abaixo de 50 fps e volta um nível acima de 58 por 10 s (sem passar da Média).
const PR = { alta: 1.5, media: 1, baixa: .75 }, NIV = ['baixa', 'media', 'alta'];
let autoQ = 'media'; const fpsHist = []; let autoT = 0;
const qSet = () => { const q = document.documentElement.dataset.q || globalThis.ANIMFX?.settings?.quality || 'auto'; return q === 'alta' || q === 'high' ? 'alta' : q === 'baixa' || q === 'low' ? 'baixa' : q === 'media' || q === 'medium' ? 'media' : 'auto'; };
const quality = () => { const q = qSet(); return q === 'auto' ? autoQ : q; };
function autoTune(now, dt) {
  if (qSet() !== 'auto' || !(dt > 0)) return;
  fpsHist.push([now, dt]); while (fpsHist.length && now - fpsHist[0][0] > 10000) fpsHist.shift();
  if (now - autoT < 3000) return; // espera 3 s depois de cada troca
  const avg = ms => { const a = fpsHist.filter(x => now - x[0] <= ms); return a.length / Math.max(1e-3, a.reduce((t, x) => t + x[1], 0)); };
  const span = fpsHist.length ? now - fpsHist[0][0] : 0, i = NIV.indexOf(autoQ);
  let nq = autoQ;
  if (avg(3000) < 50 && i > 0) nq = NIV[i - 1];
  else if (span >= 9900 && avg(10000) > 58 && i < 1) nq = NIV[i + 1];
  if (nq !== autoQ) { autoQ = nq; autoT = now; fpsHist.length = 0; applyQ(); }
}
// aplica a qualidade: densidade de pixels e sombras agora; contorno e luzes no rebuild (a chave inclui a qualidade)
function applyQ() {
  if (!renderer) return; const q = quality();
  renderer.setPixelRatio(PR[q]); const el = renderer.domElement; el._w = el._h = 0;
  renderer.shadowMap.enabled = q === 'alta'; if (fx) fx.sol.castShadow = q === 'alta';
  key = ''; if (S && running) sync(S, ctx);
}
addEventListener('vj-quality', () => { if (renderer) applyQ(); });

function ensure() {
  if (renderer || lost === 'dead') return !!renderer;
  try { renderer = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' }); } catch (e) { console.error('Mundo 3D sem WebGL:', e); lost = 'dead'; return false; }
  renderer.setPixelRatio(PR[quality()]);
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.shadowMap.type = T.PCFShadowMap; renderer.shadowMap.enabled = quality() === 'alta';
  const el = renderer.domElement; el.className = 'mw3d'; el.setAttribute('aria-hidden', 'true'); el.style.display = 'none';
  document.body.appendChild(el);
  el.addEventListener('webglcontextlost', ev => { ev.preventDefault(); lost = true; stopLoop(); });
  el.addEventListener('webglcontextrestored', () => { if (!renderer || renderer.domElement !== el) return; lost = false; key = ''; if (S && !paused) sync(S, ctx); });
  scene = new T.Scene(); root = new T.Group(); scene.add(root);
  cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  actors = new Actors(T, root); fx = new Fx(T, scene, renderer);
  const sh = fx.sol.shadow; sh.mapSize.set(2048, 2048); Object.assign(sh.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 }); sh.bias = -.0005; sh.normalBias = .03; fx.sol.castShadow = quality() === 'alta';
  return true;
}
const sceneId = () => S?.scene;
const tema = (f, p) => { const P = globalThis.MPECAS; if (!f || !P) return ""; const d = P.decode(P.cell(f, Math.floor(p?.x ?? f.w / 2), Math.floor(p?.z ?? f.h / 2))); return d?.tema || ""; };
const worldOf = () => { const sc = S?.scenes?.[sceneId()]; if (!sc) return null; if (ctx.asW && ctx.asSc === sceneId()) return ctx.asW; /* "ver como" do mestre */ return ctx.edit ? S.draft?.[sceneId()] || sc.world : sc.world; };
const floorFor = w => { if (!w) return null; const id = ctx.floor || view.follow && S.chars[view.follow]?.pos?.f || w.floors[0]?.id; return w.floors.find(f => f.id === id) || w.floors[0]; };
function resize() {
  if (!slot || !renderer) return;
  const r = slot.getBoundingClientRect(), el = renderer.domElement;
  Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (el._w !== w || el._h !== h) { renderer.setSize(w, h, false); el._w = w; el._h = h; }
}
function camHeight(f) { return view.zoom === 'andar' ? Math.max(f?.w || 20, f?.h || 20) + 2 : ZH[view.zoom]; }
function placeCam(f) {
  const el = renderer.domElement, asp = (el._w || 1) / (el._h || 1), hh = camHeight(f) / 2;
  Object.assign(cam, { left: -hh * asp, right: hh * asp, top: hh, bottom: -hh }); cam.updateProjectionMatrix();
  const D = 60, cx = view.tx + (view.pan?.dx || 0), cz = view.tz + (view.pan?.dz || 0);
  cam.position.set(cx + Math.sin(view.yaw) * Math.cos(TILT) * D, Math.sin(TILT) * D, cz + Math.cos(view.yaw) * Math.cos(TILT) * D);
  cam.lookAt(cx, 0, cz);
}
// alvo da câmera: herói seguido (posição interpolada), câmera livre do mestre, ou o centro do andar
function target(f, now) {
  if (view.free) return view.free;
  const id = view.follow, p = id && (globalThis.MINPUT?.poseOf(id, now) || S.chars[id]?.pos);
  if (p && (!f || p.f === f.id)) return { x: p.x, z: p.z };
  return { x: (f?.w || 0) / 2, z: (f?.h || 0) / 2 };
}
function frame(now) {
  if (!running) return;
  const dt = Math.max(0, Math.min(.1, (now - (lastT || now)) / 1000)); lastT = Math.max(lastT, now); // relógio que volta (quadro manual + rAF) não pode dar dt negativo
  if (dt > 0) { fpsBuf.push(dt); if (fpsBuf.length > 90) fpsBuf.shift(); }
  autoTune(now, dt);
  const w = worldOf(), f = floorFor(w);
  if (view.yawT) { const k = Math.min(1, (now - view.yawT) / ROT_MS), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; view.yaw = view.yaw0 + (Math.PI / 4 + view.yawK * Math.PI / 2 - view.yaw0) * e; if (k >= 1) view.yawT = 0; }
  const t = target(f, now), s = 1 - Math.exp(-dt * 8); view.tx += (t.x - view.tx) * s; view.tz += (t.z - view.tz) * s;
  resize(); placeCam(f);
  actors.update(S, f, now, dt, view.yaw, ctx); fx.inimigos(S, f, w, now);
  setCutaway(floorG, view.follow && (globalThis.MINPUT?.poseOf?.(view.follow, now) || S.chars[view.follow]?.pos), view.yaw, T); tickPecas(now);
  const hp = view.follow && (globalThis.MINPUT?.poseOf?.(view.follow, now) || S.chars[view.follow]?.pos);
  fx.torch(hp && hp.f === f?.id ? hp : null, w?.hora === "noite" || tema(f, hp) === "caverna");
  fx.update(now, dt, cam, f, { x: view.tx, z: view.tz }, ctx);
  globalThis.MHUD?.tick?.(now); globalThis.MSOM?.tick?.(now);
  renderer.render(scene, cam);
}
function startLoop() { if (running || !renderer || lost) return; running = true; lastT = 0; renderer.setAnimationLoop(frame); }
function stopLoop() { running = false; renderer?.setAnimationLoop(null); }
function rebuild(w, f) {
  if (floorG) { root.remove(floorG); disposeFloor(floorG); floorG = null; }
  if (!f) return;
  const pal = globalThis.TERRENO3D?.paleta;
  floorG = buildFloor(T, f, w, pal, { quality: quality() }); root.add(floorG);
  if (quality() === 'alta') floorG.traverse(o => { if (!o.isMesh) return; if (o.name === 'chao') o.receiveShadow = true; else if (o.isInstancedMesh && !o.name.endsWith(':contorno') && o.material?.isMeshToonMaterial) { o.castShadow = true; o.receiveShadow = true; } });
  fx.setWorld(w, f, pal, quality());
  actors.setFloor(f, w);
}

function sync(S0, c = {}) {
  S = S0; ctx = c;
  slot = document.querySelector('[data-mundo]');
  if (S?.battle?.active) { if (!paused) { quebra(); pause(); } return; } // batalha: o mundo quebra em cacos e a GPU fica para o palco e o luz.js
  if (paused) { paused = false; if (lost === true) teardown(); }
  const on = !!slot && S;
  if (!on) { if (renderer) { renderer.domElement.style.display = 'none'; stopLoop(); } globalThis.MHUD?.off?.(); globalThis.MSOM?.off?.(); return; }
  if (!ensure()) return;
  const el = renderer.domElement; el.style.display = '';
  if (!view.follow || !S.chars[view.follow]) view.follow = c.follow || null;
  const w = worldOf(), f = floorFor(w), k = [sceneId(), w?.v, f?.id, ctx.edit ? 'e' : ctx.asW ? 'as' + ctx.follow : 'p', f?.cell?.length, quality(), f ? [...(globalThis.MCOL?.openIdx(w.objs, f.id) || [])].sort().join() : ''].join('|') + (ctx.edit && f ? f.cell + f.wallH + f.wallV : '');
  if (k !== key) { key = k; rebuild(w, f); }
  actors.sync(S, f, w, ctx);
  fx.sync(S, f, w, ctx);
  resize(); startLoop();
}
// ----- controles de câmera -----
const rot = d => { view.yaw0 = view.yaw; view.yawK = (view.yawK + d + 4) % 4; view.yawT = performance.now(); };
const zoom = d => { const i = ZOOMS.indexOf(view.zoom); view.zoom = ZOOMS[Math.max(0, Math.min(2, i + d))]; };
const pan = (dx, dy) => { const h = camHeight(null) / (renderer?.domElement._h || 600), c = Math.cos(view.yaw), s = Math.sin(view.yaw); view.pan = { dx: (view.pan?.dx || 0) + (-dx * c + dy * s / Math.sin(TILT)) * h, dz: (view.pan?.dz || 0) + (dx * s + dy * c / Math.sin(TILT)) * h }; };
const panEnd = () => { view.pan = null; };
const follow = id => { view.follow = id; view.free = null; };
const free = (x, z) => { view.free = x == null ? null : { x, z }; };
// rumo das teclas: W vai para "cima da tela" no chão, girado com a câmera
const axes = () => { const y = view.yaw; return { fwd: { x: -Math.sin(y), z: -Math.cos(y) }, right: { x: Math.cos(y), z: -Math.sin(y) } }; };
const screen = id => { const p = globalThis.MINPUT?.poseOf?.(id) || S?.chars?.[id]?.pos; if (!p || !renderer) return null; return project(p.x, actors.height(id), p.z); }; // a posição desenhada (interpolada), não a última do servidor
function project(x, y, z) { const v = new T.Vector3(x, y, z).project(cam), el = renderer.domElement, r = el.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, vis: v.z > -1 && v.z < 1 }; }
function pick(cx, cy) { if (!renderer) return null; const r = renderer.domElement.getBoundingClientRect(), ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), cam); const hit = new T.Vector3(); if (!ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), hit)) return null; const f = floorFor(worldOf()); return { f: f?.id, x: hit.x, z: hit.z }; }
const fps = () => fpsBuf.length ? Math.round(fpsBuf.length / fpsBuf.reduce((a, b) => a + b, 0)) : 0;
// estilhaço: um último quadro (o buffer do WebGL só vale no mesmo turno do render) copiado para os cacos, se o mundo estava na tela
function quebra() {
  if (!renderer || !running || lost || renderer.domElement.style.display === 'none') return;
  try { renderer.render(scene, cam); shatter(renderer, null, quality()); } catch (e) { console.warn('Mundo: estilhaço falhou', e); }
}
// pausa (batalha): para o laço, libera o mapa de sombra; na Média e na Baixa derruba o contexto para devolver a memória da GPU
function pause() {
  paused = true; stopLoop(); globalThis.MHUD?.off?.(); globalThis.MSOM?.off?.(); if (!renderer) return;
  renderer.domElement.style.display = 'none';
  if (fx?.sol.shadow.map) { fx.sol.shadow.map.dispose(); fx.sol.shadow.map = null; }
  renderer.renderLists.dispose();
  if (quality() !== 'alta' && lost !== 'dead') { lost = true; key = ''; try { renderer.forceContextLoss(); } catch {} }
}
// descarta renderer e cena (contexto perdido); o próximo ensure() recria tudo e o rebuild remonta do último S. A câmera (view) fica.
function teardown() {
  try { renderer?.dispose(); } catch {} renderer?.domElement.remove();
  renderer = scene = cam = root = floorG = actors = fx = null; lost = false; key = '';
}
const resume = () => { if (paused) { paused = false; if (lost === true) teardown(); } key = ''; if (S && !S.battle?.active) sync(S, ctx); };
const info = () => renderer ? { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, fps: fps() } : null;

// teclas e roda da câmera (Q/R giram, a roda troca o zoom); só valem com o mundo na tela e fora de campos de texto
const typing = () => document.activeElement?.matches?.('input,textarea,select,[contenteditable]');
addEventListener('keydown', e => { if (!running || typing() || e.ctrlKey || e.altKey || e.metaKey) return; const k = e.key.toLowerCase(); if (k === 'q') rot(-1); else if (k === 'r') rot(1); });
let wheelT = 0;
addEventListener('wheel', e => { if (!running || !e.target.closest?.('[data-mundo]')) return; e.preventDefault(); const t = performance.now(); if (t - wheelT < 180) return; wheelT = t; zoom(e.deltaY > 0 ? 1 : -1); }, { passive: false });

const cur = () => { const w = renderer && S ? worldOf() : null; return { w, f: floorFor(w) }; }; // o mundo e o andar que estão na tela (HUD, minimapa)
globalThis.MUNDO = { sync, rot, zoom, pan, panEnd, follow, free, axes, screen, project, pick, pause, resume, fps, info, view, quality, cur, fogData, get lost() { return lost; }, get el() { return renderer?.domElement || null; }, get floor() { return floorG; }, draw: (t = performance.now()) => { if (running) frame(t); }, jump: id => actors?.jump(id), T };
if (typeof render === 'function') try { render(); } catch {}

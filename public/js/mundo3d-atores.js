// ===== mundo 3D: atores (heróis, inimigos, NPCs) em recorte 2D e ícones dos objetos =====
// Cada ator é um plano virado para a câmera (giro só em Y) com a imagem de frente (imgF → img → silhueta) ou de costas (imgB),
// a mesma ordem do palco (PALCO3D.imgSrc). Enquadre imgK.f/imgK.b (x, y em fração da altura, z de 0,5 a 3) e escala imgS.
// Costas quando o herói anda para longe da câmera; espelha ao andar para a esquerda da tela; balança ao andar, poeira ao correr,
// arco no pulo e sombra redonda. Objetos interativos visíveis ganham um ícone flutuante por tipo.
import { raster } from './mundo3d-pecas.js';

const H_HEROI = 1.6, H_INIMIGO = 1.9, PULO_MS = 400, PULO_H = .6, POEIRA_S = 8;
const clamp = (v, a, b, d) => { const n = Number.isFinite(+v) && v !== null && v !== '' ? +v : d; return Math.min(b, Math.max(a, n)); };
// fallback local caso o palco não esteja carregado: frente e costas viram silhueta simples
const silhueta = (c, back) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400"><circle cx="100" cy="62" r="42" fill="${back ? '#15151a' : c.enemy ? '#c04040' : '#4aa0e0'}"/><path d="M30 395 L38 160 Q100 110 162 160 L170 395Z" fill="${back ? '#15151a' : c.enemy ? '#c04040' : '#4aa0e0'}"/></svg>`)}`;
export const srcOf = (c, kind) => globalThis.PALCO3D?.imgSrc?.(c, kind) || (kind === 'b' ? (c.imgB ? { url: c.imgB } : { url: silhueta(c, true), fallback: true }) : (c.imgF || c.img ? { url: c.imgF || c.img } : { url: silhueta(c, false), fallback: true }));
// rumo (d, em radianos: 0 = +z) contra a câmera: costas se anda para longe, espelho se anda para a esquerda da tela
export function facing(d, yaw) {
  const dx = Math.sin(d), dz = Math.cos(d), fwd = { x: -Math.sin(yaw), z: -Math.cos(yaw) }, right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  return { back: dx * fwd.x + dz * fwd.z > .3, mirror: dx * right.x + dz * right.z < -.1 };
}

// ----- ícones flutuantes por tipo de objeto (desenhados num canvas, uma textura por tipo) -----
const ICON = { porta: ['▯', '#c89a5a'], bau: ['◆', '#e8c040'], item: ['✦', '#7ae0ff'], npc: ['…', '#ffffff'], placa: ['¶', '#e8e0c8'], alavanca: ['⟂', '#c8c8d0'], armadilha: ['!', '#ff5a4a'], escada: ['⇅', '#a8e07a'], portal: ['◎', '#c07aff'] };
const ICON_TEX = new Map();
function iconTex(T, k) {
  if (ICON_TEX.has(k)) return ICON_TEX.get(k);
  const [g, cor] = ICON[k], cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = '#1c3038'; x.beginPath(); x.arc(32, 30, 24, 0, Math.PI * 2); x.fill(); x.beginPath(); x.moveTo(24, 50); x.lineTo(40, 50); x.lineTo(32, 62); x.fill();
  x.strokeStyle = cor; x.lineWidth = 4; x.beginPath(); x.arc(32, 30, 22, 0, Math.PI * 2); x.stroke();
  x.fillStyle = cor; x.font = 'bold 30px Barlow, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(g, 32, 31);
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; ICON_TEX.set(k, t); return t;
}
export function iconFor(T, obj) {
  if (!ICON[obj.k]) return null;
  const s = new T.Sprite(new T.SpriteMaterial({ map: iconTex(T, obj.k), depthTest: false, transparent: true }));
  s.scale.set(.55, .55, 1); s.renderOrder = 10; s.userData.k = obj.k; return s;
}

export class Actors {
  constructor(T, root) {
    this.T = T; this.g = new T.Group(); this.g.name = 'atores'; root.add(this.g); this.m = new Map(); this.icons = new Map(); this.f = null;
    this.plane = new T.PlaneGeometry(1, 1); this.plane.translate(0, .5, 0);
    this.disc = new T.CircleGeometry(.32, 20); this.disc.rotateX(-Math.PI / 2);
    this.discMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false });
    // poeira: um Points compartilhado com partículas que sobem e somem
    this.dust = { n: 96, i: 0, pos: new Float32Array(96 * 3), life: new Float32Array(96), vel: new Float32Array(96 * 3) };
    const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(this.dust.pos, 3));
    this.dustPts = new T.Points(dg, new T.PointsMaterial({ color: 0xd8c8a8, size: .14, transparent: true, opacity: .7, depthWrite: false })); this.dustPts.frustumCulled = false; this.g.add(this.dustPts);
    this.dust.pos.fill(-999);
  }
  setFloor(f) { this.f = f; }
  // um ator: grupo nos pés (sombra + corpo); o corpo gira para a câmera
  make(id, ch) {
    const T = this.T, o = new T.Group(), body = new T.Mesh(this.plane, new T.MeshBasicMaterial({ transparent: true, alphaTest: .4, side: T.DoubleSide, color: 0xffffff }));
    body.material.visible = false; const sh = new T.Mesh(this.disc, this.discMat); sh.position.y = .012;
    o.add(sh, body); this.g.add(o);
    const a = { o, body, kind: '', url: '', h: 1, asp: .5, last: null, moving: 0, face: { back: false, mirror: false }, jump: 0, dustAcc: 0, npc: !ch };
    this.m.set(id, a); return a;
  }
  setImg(a, c, kind) {
    const s = srcOf(c, kind); if (a.url === s.url && a.kind === kind) return; a.url = s.url; a.kind = kind;
    const want = s.url; raster(want, 512).then(cv => {
      if (a.url !== want || !this.m.has(a.id)) return;
      a.body.material.map?.dispose(); const t = new this.T.CanvasTexture(cv); t.colorSpace = this.T.SRGBColorSpace;
      a.body.material.map = t; a.body.material.visible = true; a.body.material.needsUpdate = true; a.asp = cv.width / cv.height;
    }).catch(() => { if (kind === 'b' && !s.fallback) { a.url = ''; this.setImg(a, { ...c, imgB: null }, 'b'); } });
    const k = s.fallback ? null : c.imgK?.[kind]; a.fit = k && typeof k === 'object' ? { x: clamp(k.x, -1, 1, 0), y: clamp(k.y, -1, 1, 0), z: clamp(k.z, .5, 3, 1) } : { x: 0, y: 0, z: 1 };
  }
  sync(S, f, w) {
    const ids = new Set();
    for (const ch of Object.values(S.chars || {})) {
      if (ch.scene !== S.scene || !ch.pos || ch.pos.f !== f?.id) continue;
      ids.add(ch.id); const a = this.m.get(ch.id) || Object.assign(this.make(ch.id, ch), { id: ch.id });
      a.c = ch; a.h = (ch.enemy ? H_INIMIGO : H_HEROI) * clamp(ch.imgS, .5, 2.5, 1) * (ch.boss ? 1.3 : 1);
    }
    for (const [id, o] of Object.entries(w?.objs || {})) { // NPC de diálogo sem ficha: recorte a partir do cfg
      if (o.k !== 'npc' || o.f !== f?.id || o.cfg?.ch && S.chars[o.cfg.ch]) continue;
      const k = 'obj:' + id; ids.add(k); const a = this.m.get(k) || Object.assign(this.make(k, null), { id: k });
      a.c = { id: k, name: o.cfg?.nome || 'NPC', imgF: o.cfg?.imgF, npc: true }; a.h = H_HEROI; a.fixed = { x: o.x + .5, z: o.y + .5, d: (o.rot || 0) * Math.PI / 2 };
    }
    for (const [id, a] of this.m) if (!ids.has(id)) { this.g.remove(a.o); a.body.material.map?.dispose(); a.body.material.dispose(); this.m.delete(id); }
    // ícones dos objetos visíveis do andar
    const T = this.T, seen = new Set();
    for (const [id, o] of Object.entries(w?.objs || {})) {
      if (o.f !== f?.id || !ICON[o.k] || o.vis === 'oculto' && !o.rev || o.k === 'npc' && o.cfg?.ch) continue;
      seen.add(id); let s = this.icons.get(id);
      if (!s || s.userData.k !== o.k) { if (s) this.g.remove(s); s = iconFor(T, o); this.icons.set(id, s); this.g.add(s); }
      s.userData.base = { x: o.x + .5, z: o.y + .5, y: o.k === 'npc' ? H_HEROI + .55 : 1.1 };
    }
    for (const [id, s] of this.icons) if (!seen.has(id)) { this.g.remove(s); s.material.dispose(); this.icons.delete(id); }
  }
  jump(id, now = performance.now()) { const a = this.m.get(id); if (a) a.jump = now; }
  update(S, f, now, dt, yaw) {
    for (const [id, a] of this.m) {
      const p = a.fixed || globalThis.MINPUT?.poseOf?.(id, now) || S.chars[id]?.pos; if (!p) continue;
      // movimento visto pela própria interpolação: rumo e velocidade de quadro a quadro
      if (a.last && dt > 0) { const dx = p.x - a.last.x, dz = p.z - a.last.z, v = Math.hypot(dx, dz) / dt; a.moving = v > .3 ? v : 0; if (a.moving) a.dir = Math.atan2(dx, dz); }
      a.last = { x: p.x, z: p.z };
      const mode = p.m || a.c?._m || S.chars[id]?._m || 'a', d = a.moving ? a.dir : Number.isFinite(p.d) ? p.d : a.dir ?? 0;
      if (a.moving || a.face.d === undefined) a.face = { ...facing(d, yaw), d };
      this.setImg(a, a.c || S.chars[id], a.face.back && !a.npc ? 'b' : 'f');
      const jt = a.jump ? (now - a.jump) / PULO_MS : 1, jy = jt < 1 ? Math.sin(jt * Math.PI) * PULO_H : 0; if (jt >= 1) a.jump = 0;
      const bob = a.moving ? 1 + .04 * Math.sin(now / 1000 * (mode === 'c' ? 18 : 12)) : 1, crouch = mode === 'g' ? .8 : 1;
      const h = a.h * a.fit.z, wdt = h * a.asp;
      a.o.position.set(p.x, 0, p.z);
      a.body.position.set(Math.cos(yaw) * a.fit.x * a.h, jy - a.fit.y * a.h, -Math.sin(yaw) * a.fit.x * a.h);
      a.body.rotation.y = yaw; a.body.scale.set(wdt * (a.face.mirror ? -1 : 1), h * bob * crouch, 1);
      a.o.children[0].scale.setScalar(jy ? 1 - jy * .5 : 1);
      if (a.moving && mode === 'c') { a.dustAcc += dt * POEIRA_S; while (a.dustAcc >= 1) { a.dustAcc--; this.puff(p.x, p.z); } }
    }
    // poeira: sobe devagar e some em 0,6 s
    const D = this.dust; for (let i = 0; i < D.n; i++) { if (D.life[i] <= 0) continue; D.life[i] -= dt / .6; if (D.life[i] <= 0) { D.pos[i * 3 + 1] = -999; continue; } for (let k = 0; k < 3; k++) D.pos[i * 3 + k] += D.vel[i * 3 + k] * dt; }
    this.dustPts.geometry.attributes.position.needsUpdate = true;
    for (const s of this.icons.values()) { const b = s.userData.base; s.position.set(b.x, b.y + Math.sin(now / 1000 * 2.4 + b.x) * .1, b.z); }
  }
  puff(x, z) { const D = this.dust, i = D.i = (D.i + 1) % D.n; D.pos.set([x + (Math.random() - .5) * .3, .05, z + (Math.random() - .5) * .3], i * 3); D.vel.set([(Math.random() - .5) * .4, .5 + Math.random() * .3, (Math.random() - .5) * .4], i * 3); D.life[i] = 1; }
  height(id) { const a = this.m.get(id); return a ? a.h * (a.fit?.z || 1) : H_HEROI; }
}

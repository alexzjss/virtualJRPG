// ===== mundo 3D: luz, clima e névoa =====
// - lights: direcional fixa na direção SUN do terreno3d (o eixo CSS tem y para baixo) + hemisférica, tingidas pelo horário.
// - pointLights: lava, cristais e braseiros (castelo e ruínas: um a cada 6 arestas de parede). Só as mais próximas do alvo da câmera
//   são luzes reais (Alta 8, Média 4, Baixa 2); todas têm um brilho emissivo (sprite). O número de luzes reais é fixo por qualidade
//   (as sobrando ficam com intensidade 0) para o shader não recompilar.
// - torch: luz pontual no herói seguido, à noite e na caverna (raio de 3 casas).
// - weather: um Points que segue a câmera (chuva, neve, neblina, cinzas, brasas): 600, 300 ou 120 partículas pela qualidade.
// - inimigos: cone de visão no chão (branco 18% parado/patrulha/volta, vermelho 35% em alerta e perseguição) e "!" no alerta.
// - fogTex / setFog: textura R8 w×h (0 escuro, 128 lembrado, 255 visível) que o shader das peças lê (uniformes U de pecas).
import { U } from './mundo3d-pecas.js';

const P = () => globalThis.MPECAS;
const HORA = {
  dia: { sol: 0xfff4e0, si: 1.5, ceu: 0xbfe4ff, chao: 0x6a7a5a, hi: 1.3, bg: 0x86ccff },
  tarde: { sol: 0xffb070, si: 1.3, ceu: 0xc07ab0, chao: 0x5a3a4a, hi: 1.1, bg: 0xff9a5a },
  noite: { sol: 0x8a9ae8, si: .55, ceu: 0x3a4a8a, chao: 0x101828, hi: .75, bg: 0x121e4a },
};
const N_LUZ = { alta: 8, media: 4, baixa: 2 }, N_CLIMA = { alta: 600, media: 300, baixa: 120 };
const SUN_CSS = [-0.68, -0.58, 0.45]; // terreno3d: aponta para o sol, y negativo é para cima
const sunDir = (pal) => { const s = pal?.SUN || SUN_CSS; const v = [s[0], -s[1], s[2]], l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const rnd = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };

// pontos de luz do andar (pura: testável sem GPU)
export function lightPoints(f) {
  const p = P(), out = []; let walls = 0;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const d = p.decode(p.cell(f, x, y)); if (!d) continue;
    if (d.tema === 'vulcao' && (d.tipo === 'perigo' || d.tipo === 'agua' || d.tipo === 'fundo') && (x + y) % 3 === 0) out.push({ x: x + .5, y: .4, z: y + .5, cor: 0xff7a30, k: 'lava' });
    else if (d.tema === 'caverna' && d.tipo === 'denso' && Math.floor(rnd(x, y, 4) * 2) === 1) out.push({ x: x + .5, y: .8, z: y + .5, cor: 0x7ae0ff, k: 'cristal' });
  }
  const temaAt = (x, y) => p.decode(p.cell(f, Math.min(f.w - 1, Math.max(0, x)), Math.min(f.h - 1, Math.max(0, y))))?.tema;
  const brasa = (x, z, tema) => { if ((tema === 'castelo' || tema === 'ruinas') && walls++ % 6 === 0) out.push({ x, y: 1.3, z, cor: 0xffa040, k: 'braseiro' }); };
  for (let Z = 0; Z <= f.h; Z++) for (let x = 0; x < f.w; x++) if (p.edgeH(f, x, Z) === 1) brasa(x + .5, Z, temaAt(x, Z < f.h ? Z : Z - 1));
  for (let z = 0; z < f.h; z++) for (let X = 0; X <= f.w; X++) if (p.edgeV(f, X, z) === 1) brasa(X, z + .5, temaAt(X < f.w ? X : X - 1, z));
  return out;
}
// bits (base64, bit i = y*w+x) → Uint8Array por casa: 0 escuro, 128 lembrado, 255 visível. Sem visão, o visto conta como visível.
// A visão atual vem em base64 do mesmo jeito (servidor) ou como Set de 'x,y'.
export function fogData(w, h, seenB64, visSet) {
  const n = w * h, out = new Uint8Array(n), seen = P().unpack(seenB64 || '', Math.ceil(n / 8)), vb = typeof visSet === 'string' ? P().unpack(visSet, Math.ceil(n / 8)) : null;
  for (let i = 0; i < n; i++) {
    const s = seen[i >> 3] >> (i & 7) & 1, v = vb ? vb[i >> 3] >> (i & 7) & 1 : visSet ? visSet.has((i % w) + ',' + Math.floor(i / w)) : s;
    out[i] = v ? 255 : s ? 128 : 0;
  }
  return out;
}

export class Fx {
  constructor(T, scene, renderer) {
    this.T = T; this.scene = scene; this.renderer = renderer; this.q = 'media';
    this.hemi = new T.HemisphereLight(0xffffff, 0x445544, 1.3); this.sol = new T.DirectionalLight(0xffffff, 1.4);
    scene.add(this.hemi, this.sol, this.sol.target);
    this.g = new T.Group(); this.g.name = 'fx'; scene.add(this.g);
    this.pool = []; this.points = []; this.glows = null; this.braseiros = null;
    this.tocha = new T.PointLight(0xffb060, 0, 4.5, 1.6); this.tocha.position.y = 1.2; scene.add(this.tocha);
    this.clima = null; this.climaK = ''; this.fogT = null; this.fogKey = '';
    U.uFogWH.value = new T.Vector2(1, 1);
  }
  // luz do horário e do tema
  lights(hora, tema, pal) {
    const h = HORA[hora] || HORA.dia, cav = tema === 'caverna', d = sunDir(pal);
    this.sol.color.set(h.sol); this.sol.intensity = h.si * (cav ? .35 : 1); this.dir = d;
    this.hemi.color.set(h.ceu); this.hemi.groundColor.set(h.chao); this.hemi.intensity = h.hi * (cav ? .55 : 1);
    this.renderer.setClearColor(cav ? 0x0a0810 : h.bg);
  }
  pointLights(f, q) {
    const T = this.T, n = N_LUZ[q] || 4;
    if (this.pool.length !== n) { this.pool.forEach(l => this.scene.remove(l)); this.pool = Array.from({ length: n }, () => { const l = new T.PointLight(0xffffff, 0, 5, 1.8); this.scene.add(l); return l; }); }
    this.points = f ? lightPoints(f) : [];
    if (this.glows) { this.g.remove(this.glows); this.glows.geometry.dispose(); this.glows.material.dispose(); this.glows = null; }
    if (this.braseiros) { this.g.remove(this.braseiros); this.braseiros.geometry.dispose(); this.braseiros.material.dispose(); this.braseiros = null; }
    if (!this.points.length) return;
    // brilho emissivo de todas (pontos aditivos), e a bacia dos braseiros
    const pos = new Float32Array(this.points.length * 3), col = new Float32Array(this.points.length * 3), c = new T.Color();
    this.points.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); c.set(p.cor); col.set([c.r, c.g, c.b], i * 3); });
    const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(pos, 3)); gg.setAttribute('color', new T.BufferAttribute(col, 3));
    this.glows = new T.Points(gg, new T.PointsMaterial({ size: .9, vertexColors: true, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, map: glowTex(T) }));
    this.glows.frustumCulled = false; this.g.add(this.glows);
    const br = this.points.filter(p => p.k === 'braseiro');
    if (br.length) {
      const geo = new T.CylinderGeometry(.16, .08, .22, 8); geo.translate(0, -.05, 0);
      this.braseiros = new T.InstancedMesh(geo, new T.MeshBasicMaterial({ color: 0x2a2226 }), br.length); const m = new T.Matrix4();
      br.forEach((p, i) => { m.makeTranslation(p.x, p.y - .15, p.z); this.braseiros.setMatrixAt(i, m); }); this.braseiros.computeBoundingSphere(); this.g.add(this.braseiros);
    }
  }
  torch(pos, on) { this.tocha.intensity = on && pos ? 2.2 : 0; if (pos) this.tocha.position.set(pos.x, 1.2, pos.z); }
  weather(kind, q) {
    const T = this.T, n = kind ? N_CLIMA[q] || 300 : 0, key = kind + '|' + n; if (key === this.climaK) return; this.climaK = key;
    if (this.clima) { this.g.remove(this.clima); this.clima.geometry.dispose(); this.clima.material.dispose(); this.clima = null; }
    if (!n) return;
    const C = { chuva: [0xd0e2ff, 22, .75], neve: [0xffffff, 4, .9], neblina: [0xd8e0e8, 90, .1], cinzas: [0x5a5a5a, 3, .8], brasas: [0xff7a30, 4, .95] }[kind] || [0xffffff, 3, .8]; // tamanho em pixels (a câmera é ortográfica)
    const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([(Math.random() - .5) * 24, Math.random() * 10, (Math.random() - .5) * 24], i * 3);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    this.clima = new T.Points(g, new T.PointsMaterial({ color: C[0], size: C[1], sizeAttenuation: false, transparent: true, opacity: C[2], depthWrite: false, map: kind === 'chuva' ? streakTex(T) : kind === 'neblina' || kind === 'brasas' ? glowTex(T) : null, blending: kind === 'brasas' ? T.AdditiveBlending : T.NormalBlending }));
    this.clima.frustumCulled = false; this.clima.userData.kind = kind; this.g.add(this.clima);
  }
  fogTex(f) {
    const T = this.T; if (this.fogT && this.fogT.image.width === f.w && this.fogT.image.height === f.h) return this.fogT;
    this.fogT?.dispose(); this.fogT = new T.DataTexture(new Uint8Array(f.w * f.h), f.w, f.h, T.RedFormat, T.UnsignedByteType);
    this.fogT.minFilter = this.fogT.magFilter = T.LinearFilter; this.fogT.flipY = false; this.fogT.needsUpdate = true; return this.fogT;
  }
  setFog(tex, seenBits, visSet) { const d = fogData(tex.image.width, tex.image.height, seenBits, visSet); tex.image.data.set(d); tex.needsUpdate = true; }
  setWorld(w, f, pal, q) { this.q = q; this.pal = pal; this.lights(w?.hora, w?.tema, pal); this.pointLights(f, q); this.fogKey = ''; }
  // por estado: névoa e clima da cena (o mestre vê sem névoa)
  sync(S, f, w, ctx) {
    const sc = S?.scenes?.[S.scene]; this.weather(sc?.clima || '', this.q);
    const on = !!(f && sc?.fogOn && ctx?.role !== 'gm'); U.uFogOn.value = on ? 1 : 0; if (!on) return;
    const vis = ctx?.vis?.[f.id] || S.vis?.[f.id], key = f.id + '|' + f.w + 'x' + f.h + '|' + (sc.seenW?.[f.id] || '') + '|' + (typeof vis === 'string' ? vis : vis ? [...vis].join(';') : '');
    if (key === this.fogKey) return; this.fogKey = key;
    const t = this.fogTex(f); this.setFog(t, sc.seenW?.[f.id], typeof vis === 'string' ? vis : vis ? new Set(vis) : null); U.uFog.value = t; U.uFogWH.value.set(f.w, f.h);
  }
  inimigos(S, f, w, now) {
    const T = this.T, seen = new Set(); this.cones ||= new Map();
    for (const [id, o] of Object.entries(w?.objs || {})) {
      const ch = o?.k === 'inimigo' && S?.chars?.[o.cfg?.ch], p = ch && (globalThis.MINPUT?.poseOf?.(ch.id, now) || ch.pos); if (!p || p.f !== f?.id || !(ch.hp > 0)) continue;
      const st = o.ia?.s || '', bravo = st === 'alerta' || st === 'persegue', r = o.cfg?.visao?.r ?? 6, a = Math.min(360, o.cfg?.visao?.a ?? 90) * Math.PI / 180, key = r + '|' + a;
      seen.add(id); let c = this.cones.get(id);
      if (!c || c.cone.userData.key !== key) {
        if (c) this.dropCone(c);
        const geo = new T.CircleGeometry(r, Math.max(8, Math.round(a * 10)), -a / 2, a); geo.rotateX(-Math.PI / 2); // aponta para +X; gira pelo rumo
        const cone = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .18, depthWrite: false })); cone.userData.key = key; cone.renderOrder = 2;
        const bang = new T.Sprite(new T.SpriteMaterial({ map: bangTex(T), depthTest: false, transparent: true })); bang.scale.set(.5, .5, 1); bang.renderOrder = 12;
        this.g.add(cone, bang); this.cones.set(id, c = { cone, bang });
      }
      c.cone.position.set(p.x, .05, p.z); c.cone.rotation.y = (p.d || 0) - Math.PI / 2;
      c.cone.material.color.set(bravo ? 0xff2a2a : 0xffffff); c.cone.material.opacity = bravo ? .35 : .18;
      c.bang.visible = st === 'alerta'; c.bang.position.set(p.x, H_INIM + .45 + Math.abs(Math.sin(now / 1000 * 9)) * .12, p.z);
    }
    for (const [id, c] of this.cones) if (!seen.has(id)) { this.dropCone(c); this.cones.delete(id); }
  }
  dropCone(c) { this.g.remove(c.cone, c.bang); c.cone.geometry.dispose(); c.cone.material.dispose(); c.bang.material.dispose(); }
  update(now, dt, cam, f, target, ctx) {
    const t = target || { x: (f?.w || 0) / 2, z: (f?.h || 0) / 2 }, d = this.dir || sunDir(this.pal);
    this.sol.position.set(t.x + d[0] * 30, d[1] * 30, t.z + d[2] * 30); this.sol.target.position.set(t.x, 0, t.z);
    // luzes reais nas mais próximas do alvo (reavaliado a cada 250 ms)
    if (this.points.length && (!this._lt || now - this._lt > 250)) {
      this._lt = now; const near = this.points.map(p => [p, (p.x - t.x) ** 2 + (p.z - t.z) ** 2]).sort((a, b) => a[1] - b[1]);
      this.pool.forEach((l, i) => { const p = near[i]?.[0]; l.intensity = p ? (p.k === 'lava' ? 2.4 : 1.8) : 0; if (p) { l.color.set(p.cor); l.position.set(p.x, p.y + .3, p.z); } });
    } else if (!this.points.length) this.pool.forEach(l => { l.intensity = 0; });
    if (this.glows) this.glows.material.opacity = .45 + Math.sin(now / 1000 * 6) * .08;
    if (this.clima) { // a nuvem de partículas segue o alvo e cai (ou sobe, nas brasas)
      const k = this.clima.userData.kind, a = this.clima.geometry.attributes.position, v = k === 'chuva' ? -12 : k === 'neve' ? -1.2 : k === 'cinzas' ? -.6 : k === 'brasas' ? .9 : 0;
      this.clima.position.set(t.x, 0, t.z);
      for (let i = 0; i < a.count; i++) { let y = a.getY(i) + v * dt; if (y < 0) y += 10; else if (y > 10) y -= 10; a.setY(i, y); if (k !== 'chuva') a.setX(i, a.getX(i) + Math.sin(now / 900 + i) * dt * .3); }
      a.needsUpdate = true;
    }
  }
}
const H_INIM = 1.9; // altura do inimigo (mundo3d-atores)
let BANG = null;
function bangTex(T) { // "!" vermelho do alerta
  if (BANG) return BANG; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = '#e4002b'; x.strokeStyle = '#fff'; x.lineWidth = 5; x.font = 'bold 56px Anton, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.strokeText('!', 32, 34); x.fillText('!', 32, 34);
  BANG = new T.CanvasTexture(cv); BANG.colorSpace = T.SRGBColorSpace; return BANG;
}
let GLOW = null;
function glowTex(T) {
  if (GLOW) return GLOW; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  GLOW = new T.CanvasTexture(cv); return GLOW;
}
let STREAK = null;
function streakTex(T) { // risco de chuva: linha fina inclinada, transparente em volta
  if (STREAK) return STREAK; const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.strokeStyle = g; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(19, 3); x.lineTo(14, 29); x.stroke();
  STREAK = new T.CanvasTexture(cv); return STREAK;
}

// ----- transição em estilhaço (o mundo quebra e cai, o palco aparece por baixo) -----
// shards: malha de cols×rows células, cada uma em 2 triângulos (Alta/Média 5×4 = 40, Baixa 3×2 = 12). Os vértices de dentro saem
// da grade em até ±24% da célula (assim nenhum triângulo vira do avesso); os da borda andam só ao longo da borda; os cantos ficam.
const GRADE = { alta: [5, 4], media: [5, 4], baixa: [3, 2] };
export function shards(w, h, q = 'media', rand = Math.random) {
  const [cols, rows] = GRADE[q] || GRADE.media, cw = w / cols, chh = h / rows, J = .24, v = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const bx = i === 0 || i === cols, by = j === 0 || j === rows;
    v.push([i * cw + (bx ? 0 : (rand() - .5) * 2 * J * cw), j * chh + (by ? 0 : (rand() - .5) * 2 * J * chh)]);
  }
  const at = (i, j) => v[j * (cols + 1) + i], out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    if ((i + j) % 2) out.push([a, b, c], [a, c, d]); else out.push([a, b, d], [b, c, d]); // diagonais alternadas: cacos menos repetidos
  }
  return out;
}
// shatter: copia o quadro do canvas do mundo (chamar logo depois de um render, no mesmo turno) para uma tela 2D por cima, na mesma
// posição; em 700 ms cada caco gira 90–270°, cai com aceleração e some a partir dos 450 ms. Movimento reduzido: só esmaece (250 ms).
export function shatter(renderer, done, q = 'media') {
  const src = renderer?.domElement || renderer, r = src?.getBoundingClientRect?.();
  if (!r || r.width < 2 || r.height < 2) { done?.(); return null; }
  const k = Math.min(2, globalThis.devicePixelRatio || 1), W = Math.round(r.width * k), Hh = Math.round(r.height * k);
  const img = document.createElement('canvas'); img.width = W; img.height = Hh;
  try { img.getContext('2d').drawImage(src, 0, 0, W, Hh); } catch { done?.(); return null; }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; cv.className = 'mw3d-caco'; cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.appendChild(cv);
  const x = cv.getContext('2d'), calmo = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches, DUR = calmo ? 250 : 700;
  const cx0 = W / 2, cy0 = Hh / 2, ps = shards(W, Hh, q).map(t => {
    const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3, dx = cx - cx0, dy = cy - cy0, L = Math.hypot(dx, dy) || 1;
    return { t, cx, cy, vx: dx / L * (80 + Math.random() * 140) * k, vy: -(40 + Math.random() * 140) * k, rot: (Math.PI / 2 + Math.random() * Math.PI) * (Math.random() < .5 ? -1 : 1), atraso: Math.random() * 60 };
  });
  const G = 2600 * k, t0 = performance.now();
  const passo = now => {
    const e = now - t0; x.clearRect(0, 0, W, Hh);
    if (e >= DUR) { cv.remove(); done?.(); return; }
    if (calmo) { x.globalAlpha = 1 - e / DUR; x.drawImage(img, 0, 0); }
    else for (const p of ps) {
      const s = Math.max(0, e - p.atraso) / 1000, a = e < 450 ? 1 : 1 - (e - 450) / (DUR - 450); if (a <= 0) continue;
      x.save(); x.globalAlpha = a;
      x.translate(p.cx + p.vx * s, p.cy + p.vy * s + G * s * s / 2); x.rotate(p.rot * Math.min(1, s * 1000 / DUR)); x.scale(1 - s * .2, 1 - s * .2); x.translate(-p.cx, -p.cy);
      x.beginPath(); x.moveTo(...p.t[0]); x.lineTo(...p.t[1]); x.lineTo(...p.t[2]); x.closePath();
      x.save(); x.clip(); x.drawImage(img, 0, 0); x.restore();
      x.lineWidth = 2 * k; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke(); // fio branco na quebra
      x.restore();
    }
    requestAnimationFrame(passo);
  };
  passo(t0); // o primeiro quadro já sai agora: o canvas do mundo some logo em seguida
  return cv;
}

// TV: o centro e a altura da câmera (ortográfica, inclinada 35°) que cabem os pontos com 2 casas de margem, no giro yaw e na
// proporção asp; nunca mais perto que 8. Sem pontos, o andar inteiro. Eixos da tela no chão: direita (cos, −sin), frente (−sin, −cos).
export function tvBox(pts, f, yaw, asp = 16 / 9) {
  const M = 2, st = Math.sin(35 * Math.PI / 180), rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const ps = pts.length ? pts : [{ x: 0, z: 0 }, { x: f.w, z: 0 }, { x: 0, z: f.h }, { x: f.w, z: f.h }], m = pts.length ? M : 0;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const p of ps) { const u = p.x * rx + p.z * rz, v = p.x * fx + p.z * fz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const um = (u0 + u1) / 2, vm = (v0 + v1) / 2, rw = u1 - u0 + 2 * m, rh = (v1 - v0 + 2 * m) * st;
  return { x: um * rx + vm * fx, z: um * rz + vm * fz, h: Math.max(rh, rw / asp, 8) };
}

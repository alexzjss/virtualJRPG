// ===== mundo 3D: luz, clima e névoa =====
// - lights: direcional fixa na direção SUN do terreno3d (o eixo CSS tem y para baixo) + hemisférica, tingidas pelo horário.
// - pointLights: lava, cristais e braseiros (castelo e ruínas: um a cada 6 arestas de parede). Só as mais próximas do alvo da câmera
//   são luzes reais (Alta 8, Média 4, Baixa 2); todas têm um brilho emissivo (sprite). O número de luzes reais é fixo por qualidade
//   (as sobrando ficam com intensidade 0) para o shader não recompilar.
// - torch: luz pontual no herói seguido, à noite e na caverna (raio de 3 casas).
// - weather: um Points que segue a câmera (chuva, neve, neblina, cinzas, brasas): 600, 300 ou 120 partículas pela qualidade.
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
// bits (base64, bit i = y*w+x) → Uint8Array por casa: 0 escuro, 128 lembrado, 255 visível. Sem visBits, o visto conta como visível.
export function fogData(w, h, seenB64, visSet) {
  const n = w * h, out = new Uint8Array(n), seen = P().unpack(seenB64 || '', Math.ceil(n / 8));
  for (let i = 0; i < n; i++) {
    const s = seen[i >> 3] >> (i & 7) & 1, v = visSet ? visSet.has((i % w) + ',' + Math.floor(i / w)) : s;
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
    const vis = ctx?.vis?.[f.id] || S.vis?.[f.id], key = f.id + '|' + f.w + 'x' + f.h + '|' + (sc.seenW?.[f.id] || '') + '|' + (vis ? [...vis].join(';') : '');
    if (key === this.fogKey) return; this.fogKey = key;
    const t = this.fogTex(f); this.setFog(t, sc.seenW?.[f.id], vis ? new Set(vis) : null); U.uFog.value = t; U.uFogWH.value.set(f.w, f.h);
  }
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

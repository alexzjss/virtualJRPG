// ===== mundo 3D: peças do andar (chão, peças por tema, paredes de aresta, cutaway) =====
// O andar é dividido em blocos de 16×16 casas. Cada bloco tem o chão (uma malha com cor por vértice: temas vizinhos se misturam
// na borda), a água, o perigo, e um InstancedMesh por (tema, tipo, variante) para as peças e por tipo de aresta para as paredes.
// Material: MeshToonMaterial com 3 tons e contorno por casco invertido (BackSide, ×1,04, cor INK) em denso, baixo, paredes e portas.
// Cutaway: as peças altas entre a câmera e o herói, num raio de 4 casas, achatam no shader (uniformes compartilhados).
const P = () => globalThis.MPECAS, CH = 16, CUT_R = 4.0;

// ----- cores por tema (o "!" marca cor que não grada com o horário) -----
const CHAO = {
  floresta: ['#5f9a48', '#a88a5a'], castelo: ['#8a8478', '#8a3a3a'], praia: ['#e8d49a', '#cbb07a'], neve: ['#e8f0f8', '#b8c8d8'], deserto: ['#e0b870', '#c89858'],
  caverna: ['#4a4250', '#5e5466'], ruinas: ['#8a9a6a', '#a09a88'], pantano: ['#4a5a3a', '#5a5040'], vulcao: ['#3a2a2a', '#5a3a30'], campo: ['#7ab84e', '#b89a62'],
};
const AGUA = { pantano: ['#4a7a50', '#2a4a34'], caverna: ['#3a6aa0', '#1a3060'], vulcao: ['!#ff7a20', '!#c03a10'] }, AGUA0 = ['#3aa0d8', '#1a4a8a'];
const PERIGO = { vulcao: '!#ff6a20', caverna: '!#7af0ff', pantano: '!#9adf40' }, PERIGO0 = '!#c050d0';
const PAREDE = { floresta: '#7a5a3a', castelo: '#9a948a', praia: '#c8a870', neve: '#d8e0e8', deserto: '#c89860', caverna: '#5a5060', ruinas: '#9aa088', pantano: '#5a4a34', vulcao: '#3a3030', campo: '#a8885a' };
const VAZIO = '!#05070c';

// ----- geometria low-poly em código: partes coloridas fundidas numa só malha (cor por vértice) -----
function merge(T, parts) {
  let n = 0; const gs = parts.map(([g, hex, m]) => { const x = g.index ? g.toNonIndexed() : g; if (m) x.applyMatrix4(m); x.computeVertexNormals(); n += x.attributes.position.count; return [x, hex]; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new T.Color(); let o = 0;
  for (const [g, hex] of gs) {
    const k = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    c.set(hex); for (let i = 0; i < k; i++) col.set([c.r, c.g, c.b], (o + i) * 3);
    o += k; g.dispose();
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
  g.computeBoundingSphere(); return g;
}
const M = T => ({
  at: (x, y, z, rx = 0, ry = 0, rz = 0, s = 1, sy = s) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(s, sy, s)),
});
// peças por tema e tipo: cada função recebe (T, cor, variante) e devolve as partes [geometria, hex, matriz]
function pieces(T, g, pal) {
  const m = M(T), cop = i => pal?.COPAS_CEL?.[i % 3] || { lt: '#8fcc4e', sh: '#2f6a4c', ac: '#3e7e4e' }, cr = i => pal?.CRIST?.[i % 3] || ['#9ff8ff', '#3ad0f0', '#1a6ab0'];
  const cyl = (rt, rb, h, s = 6) => new T.CylinderGeometry(rt, rb, h, s), box = (w, h, d) => new T.BoxGeometry(w, h, d), ico = r => new T.IcosahedronGeometry(r, 0), cone = (r, h, s = 6) => new T.ConeGeometry(r, h, s), dod = r => new T.DodecahedronGeometry(r, 0), oct = r => new T.OctahedronGeometry(r, 0);
  const tronco = v => [[cyl(.11, .15, .9), '#6a4a30', m.at(0, .45, 0)]];
  const D = {
    floresta: v => [...tronco(v), [ico(.46), cop(v).lt, m.at(0, 1.15, 0)], [ico(.34), cop(v).ac, m.at(.24, .92, .12)], [ico(.3), cop(v).sh, m.at(-.2, .9, -.14)], [ico(.24), cop(v).lt, m.at(.02, 1.5, .02)]],
    castelo: v => v === 1 ? [[box(.9, 1.8, .38), '#6a4a30', m.at(0, .9, 0)], [box(.8, .06, .4), '#4a3020', m.at(0, .62, .01)], [box(.8, .06, .4), '#4a3020', m.at(0, 1.2, .01)], [box(.7, .3, .3), '#8a3a3a', m.at(0, .8, .05)]]
      : [[box(.62, .2, .62), '#8a847a', m.at(0, .1, 0)], [cyl(.24, .26, 2.0, 8), '#a8a298', m.at(0, 1.1, 0)], [box(.58, .16, .58), '#8a847a', m.at(0, 2.1, 0)]],
    praia: v => v === 1 ? [[dod(.42), '#9a8a70', m.at(0, .3, 0, .3, v, 0, 1, .8)], [dod(.22), '#8a7a62', m.at(.3, .14, .2)]]
      : [[cyl(.07, .1, .7), '#8a6a40', m.at(0, .35, 0, 0, 0, .12)], [cyl(.06, .08, .7), '#8a6a40', m.at(.08, 1.0, 0, 0, 0, .25)], ...[0, 1, 2, 3, 4].map(i => [box(.7, .04, .18), '#4a9a40', m.at(.16 + Math.cos(i * 1.26) * .3, 1.36, Math.sin(i * 1.26) * .3, 0, -i * 1.26, -.35)])],
    neve: v => [[cyl(.08, .1, .4), '#5a4030', m.at(0, .2, 0)], [cone(.55, .8, 7), '#2a5a48', m.at(0, .7, 0)], [cone(.42, .7, 7), '#2f6a50', m.at(0, 1.1, 0)], [cone(.28, .55, 7), '#3a7058', m.at(0, 1.46, 0)], [cone(.16, .24, 7), '#f4f8ff', m.at(0, 1.66, 0)]],
    deserto: v => v === 1 ? [[dod(.4), '#c88a58', m.at(0, .28, 0, .2, .5, 0, 1, .7)]]
      : [[cyl(.15, .17, 1.3, 7), '#4a8a48', m.at(0, .65, 0)], [cyl(.08, .09, .4, 6), '#4a8a48', m.at(.24, .7, 0, 0, 0, 1.4)], [cyl(.08, .09, .36, 6), '#4a8a48', m.at(.34, .95, 0)], [cyl(.07, .08, .3, 6), '#4a8a48', m.at(-.22, .9, 0, 0, 0, -1.4)]],
    caverna: v => v === 1 ? [[oct(.3), '!' + cr(v)[0], m.at(0, .55, 0, 0, 0, 0, 1, 2)], [oct(.18), '!' + cr(v + 1)[1], m.at(.24, .3, .1, 0, 0, .4, 1, 1.8)], [dod(.22), '#4a4250', m.at(0, .1, 0)]]
      : [[cone(.36, 1.5, 6), '#6a6070', m.at(0, .75, 0)], [cone(.2, .8, 6), '#5a5262', m.at(.26, .4, .1)]],
    ruinas: v => [[box(.62, .2, .62), '#8a8a7a', m.at(0, .1, 0)], [cyl(.24, .26, v === 1 ? .7 : 1.3, 8), '#a8a690', m.at(0, v === 1 ? .55 : .85, 0)], [cyl(.24, .24, .4, 8), '#9a9882', m.at(.4, .14, .1, 0, 0, 1.4)]],
    pantano: v => [[cyl(.1, .16, .7), '#4a3a28', m.at(0, .35, 0, 0, 0, .25)], [cyl(.07, .1, .6), '#4a3a28', m.at(.18, .9, 0, 0, 0, -.3)], [ico(.42), '#3a5a34', m.at(.12, 1.25, 0, 0, 0, 0, 1, .6)], [ico(.3), '#4a6a3a', m.at(-.16, 1.1, .1, 0, 0, 0, 1, .6)]],
    vulcao: v => [0, 1, 2].map(i => [cyl(.18, .2, .9 + ((i + v) % 3) * .35, 6), i % 2 ? '#2a2226' : '#3a3034', m.at(Math.cos(i * 2.1) * .2, (.9 + ((i + v) % 3) * .35) / 2, Math.sin(i * 2.1) * .2)]),
    campo: v => [[ico(.36), cop(v).lt, m.at(0, .3, 0, 0, 0, 0, 1, .8)], [ico(.26), cop(v).ac, m.at(.24, .22, .1, 0, 0, 0, 1, .8)], [ico(.24), cop(v).sh, m.at(-.2, .2, -.1, 0, 0, 0, 1, .8)]],
  };
  const B = {
    tronco: v => [[cyl(.18, .18, .9, 7), '#6a4a30', m.at(0, .18, 0, 0, v * .7, Math.PI / 2)], [cyl(.12, .12, .02, 7), '#c8a070', m.at(.45, .18, 0, 0, 0, Math.PI / 2)]],
    caixa: v => [[box(.6, .55, .6), '#9a7044', m.at(0, .275, 0, 0, v * .4, 0)], [box(.62, .08, .62), '#6a4a2a', m.at(0, .3, 0, 0, v * .4, 0)]],
    cerca: v => [[box(.08, .6, .08), '#8a6a40', m.at(-.4, .3, 0)], [box(.08, .6, .08), '#8a6a40', m.at(.4, .3, 0)], [box(.9, .07, .05), '#a07a48', m.at(0, .45, 0)], [box(.9, .07, .05), '#a07a48', m.at(0, .22, 0)]],
    rocha: v => [[dod(.3), '#6a6060', m.at(0, .18, 0, .3, v, 0, 1, .6)], [dod(.16), '#5a5252', m.at(.24, .1, .12)]],
  };
  const BT = { floresta: 'tronco', neve: 'tronco', pantano: 'tronco', castelo: 'caixa', praia: 'caixa', deserto: 'caixa', campo: 'cerca', caverna: 'rocha', ruinas: 'rocha', vulcao: 'rocha' };
  const NV = { floresta: 3, castelo: 2, praia: 2, neve: 3, deserto: 2, caverna: 2, ruinas: 2, pantano: 3, vulcao: 3, campo: 3 };
  const tint = parts => parts.map(([geo, hex, mm]) => [geo, hex.startsWith('!') ? hex.slice(1) : g(hex), mm]);
  return { denso: (tema, v) => merge(T, tint(D[tema](v))), nDenso: tema => NV[tema], baixo: (tema, v) => merge(T, tint(B[BT[tema]](v))), nBaixo: () => 3 };
}
// arestas: parede, porta (batente + folha), barreira (vidro mágico), grade (barras), cerca (baixa)
function edgeGeos(T) {
  const m = M(T), box = (w, h, d) => new T.BoxGeometry(w, h, d), W = '#ffffff';
  return {
    1: merge(T, [[box(1.02, 1.8, .2), W, m.at(.5, .9, 0)]]),
    2: merge(T, [[box(.16, 1.8, .22), W, m.at(.08, .9, 0)], [box(.16, 1.8, .22), W, m.at(.92, .9, 0)], [box(1, .2, .22), W, m.at(.5, 1.7, 0)]]),
    folha: merge(T, [[box(.68, 1.55, .08), '#7a5232', m.at(.34, .78, 0)], [box(.06, .06, .1), '#d8b040', m.at(.58, .8, 0)]]),
    3: merge(T, [[box(1, 1.6, .06), W, m.at(.5, .8, 0)]]),
    4: merge(T, [[box(1, .08, .1), W, m.at(.5, 1.5, 0)], [box(1, .08, .1), W, m.at(.5, .1, 0)], ...[.1, .3, .5, .7, .9].map(x => [new T.CylinderGeometry(.03, .03, 1.5, 5), W, m.at(x, .8, 0)])]),
    5: merge(T, [[box(.08, .6, .08), W, m.at(.05, .3, 0)], [box(.08, .6, .08), W, m.at(.95, .3, 0)], [box(1, .07, .05), W, m.at(.5, .45, 0)], [box(1, .07, .05), W, m.at(.5, .22, 0)]]),
  };
}

// ----- materiais: toon de 3 tons, contorno, água ondulando; uniformes do cutaway compartilhados -----
const U = { uCut: { value: null }, uCutR: { value: CUT_R }, uCutOn: { value: 0 }, uCamDir: { value: null }, uTime: { value: 0 } };
let GRAD = null;
function gradMap(T) { if (GRAD) return GRAD; GRAD = new T.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat); GRAD.minFilter = GRAD.magFilter = T.NearestFilter; GRAD.generateMipmaps = false; GRAD.needsUpdate = true; return GRAD; }
// injeta o cutaway (e a ondulação, na água) no shader de vértice
function cutShader(mat, { cut = false, wave = false, grow = 0 } = {}) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform vec3 uCut; uniform float uCutR; uniform float uCutOn; uniform vec3 uCamDir; uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
${grow ? `transformed *= ${(1 + grow).toFixed(3)};` : ''}
#ifdef USE_INSTANCING
  vec3 cutO = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#else
  vec3 cutO = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
${cut ? `{ vec2 dd = cutO.xz - uCut.xz; if (uCutOn > 0.5 && length(dd) < uCutR && dot(dd, uCamDir.xz) > -0.6) transformed.y *= 0.18; }` : ''}
${wave ? `transformed.y += sin(uTime * 1.6 + (cutO.x + transformed.x) * 2.1) * 0.025 + cos(uTime * 1.2 + (cutO.z + transformed.z) * 1.7) * 0.02;` : ''}`);
  };
  mat.customProgramCacheKey = () => 'mw' + (cut ? 'c' : '') + (wave ? 'w' : '') + grow;
  return mat;
}
function materials(T, pal) {
  const ink = pal?.INK || '#1c3038', toon = o => new T.MeshToonMaterial({ gradientMap: gradMap(T), vertexColors: true, ...o });
  return {
    chao: toon({}), // chão
    peca: cutShader(toon({}), { cut: true }),
    pecaBaixa: toon({}),
    contorno: cutShader(new T.MeshBasicMaterial({ color: ink, side: T.BackSide }), { cut: true, grow: .04 }),
    contornoBaixo: cutShader(new T.MeshBasicMaterial({ color: ink, side: T.BackSide }), { grow: .06 }),
    agua: cutShader(new T.MeshToonMaterial({ gradientMap: gradMap(T), transparent: true, opacity: .86 }), { wave: true }),
    perigo: new T.MeshBasicMaterial({}),
    barreira: new T.MeshBasicMaterial({ color: 0x7ae0ff, transparent: true, opacity: .42, depthWrite: false }),
  };
}

const IMG = new Map(); // url → Promise<canvas>: a imagem rasterizada uma vez (SVG só com viewBox não sobe direto para a GPU)
const MAXPX = 2048;
function raster(url) {
  if (!IMG.has(url)) IMG.set(url, new Promise((ok, no) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => { const k = MAXPX / Math.max(im.naturalWidth || 1, im.naturalHeight || 1), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round((im.naturalWidth || 1) * k)); cv.height = Math.max(1, Math.round((im.naturalHeight || 1) * k)); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ok(cv); };
    im.onerror = no; im.src = url;
  }));
  return IMG.get(url);
}
// o chão começa na cor do tema e ganha a imagem (recortada pelo crop) quando ela chega
function paintImg(T, mat, img) {
  raster(img.url).then(cv => {
    const t = new T.CanvasTexture(cv), c = img.crop || { x: 0, y: 0, w: 1, h: 1 };
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.repeat.set(c.w, c.h); t.offset.set(c.x, 1 - c.y - c.h);
    mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true;
  }).catch(() => console.warn('Mundo 3D: imagem do mapa não carregou', img.url));
}

// ----- montagem -----
const rnd = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
export function buildFloor(T, f, w, pal, opts = {}) {
  const p = P(), hora = w?.hora || 'dia', g0 = hex => (pal?.grade ? pal.grade(hex, hora) : hex);
  const g = hex => hex.startsWith('!') ? hex.slice(1) : g0(hex);
  const root = new T.Group(); root.name = 'andar:' + f.id;
  const mats = materials(T, pal), pz = pieces(T, g, pal), eg = edgeGeos(T), geos = new Map(Object.entries(eg).map(([k, v]) => ["aresta:" + k, v])), qual = opts.quality || "media";
  root.userData.mats = mats; root.userData.geos = geos;
  const geo = (k, mk) => { if (!geos.has(k)) geos.set(k, mk()); return geos.get(k); };
  const col = new T.Color(), lin = hex => col.set(g(hex)).clone();
  const cellInfo = (x, y) => { const c = p.cell(f, x, y), d = c && p.decode(c); return d ? { c, ...d } : null; };
  const groundHex = d => !d ? VAZIO : d.tipo === 'vazio' ? VAZIO : d.tipo === 'trilha' ? CHAO[d.tema][1] : CHAO[d.tema][0];
  const open = globalThis.MCOL?.openIdx(w?.objs, f.id) || new Set();
  for (let cy = 0; cy < f.h; cy += CH) for (let cx = 0; cx < f.w; cx += CH) {
    const blk = new T.Group(); blk.name = `bloco ${cx / CH},${cy / CH}`; root.add(blk);
    const x1 = Math.min(f.w, cx + CH), y1 = Math.min(f.h, cy + CH), bw = x1 - cx, bh = y1 - cy;
    // chão: um quad por casa. Dentro do mesmo tema a cor é nítida (trilha e chão não borram); na borda com outro tema,
    // cada canto mistura a cor da casa com a dos vizinhos de tema diferente daquele canto
    if (!f.img?.url) {
      const n = bw * bh, pos = new Float32Array(n * 12), cols = new Float32Array(n * 12), idx = [], memo = new Map();
      const cc = (x, y) => { const k = x + ',' + y; if (!memo.has(k)) { const d = x < 0 || y < 0 || x >= f.w || y >= f.h ? null : cellInfo(x, y); memo.set(k, d ? { c: lin(groundHex(d)), t: d.tipo === 'vazio' ? 'vazio' : d.tema } : null); } return memo.get(k); };
      let q = 0;
      for (let y = cy; y < y1; y++) for (let x = cx; x < x1; x++, q++) {
        const me = cc(x, y);
        [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([ox, oz], k) => {
          let r = 0, gg = 0, b = 0, m = 0;
          for (const [dx, dz] of [[ox - 1, oz - 1], [ox, oz - 1], [ox - 1, oz], [ox, oz]]) { const o = cc(x + dx, y + dz), c = !o || !me || o.t === me.t || o.t === 'vazio' || me.t === 'vazio' ? me?.c : o.c; if (c) { r += c.r; gg += c.g; b += c.b; m++; } }
          pos.set([x + ox, 0, y + oz], (q * 4 + k) * 3); cols.set(m ? [r / m, gg / m, b / m] : [0, 0, 0], (q * 4 + k) * 3);
        });
        idx.push(q * 4, q * 4 + 3, q * 4 + 1, q * 4 + 1, q * 4 + 3, q * 4 + 2);
      }
      const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3)); pg.setAttribute('color', new T.BufferAttribute(cols, 3));
      pg.setAttribute('normal', new T.BufferAttribute(new Float32Array(n * 12).map((_, i) => i % 3 === 1 ? 1 : 0), 3)); pg.setIndex(idx); pg.computeBoundingSphere();
      const ch = new T.Mesh(pg, mats.chao); ch.name = 'chao'; blk.add(ch);
    }
    // peças, água e perigo por casa
    const inst = new Map(), add = (k, mx, c) => { if (!inst.has(k)) inst.set(k, []); inst.get(k).push([mx, c]); };
    for (let y = cy; y < y1; y++) for (let x = cx; x < x1; x++) {
      const d = cellInfo(x, y); if (!d) continue;
      const r = rnd(x, y), s = .85 + rnd(x, y, 1) * .3, mx = M(T).at(x + .5 + (rnd(x, y, 2) - .5) * .16, 0, y + .5 + (rnd(x, y, 3) - .5) * .16, 0, r * Math.PI * 2, 0, s);
      if (d.tipo === 'denso') add(`d|${d.tema}|${Math.floor(rnd(x, y, 4) * pz.nDenso(d.tema))}`, mx);
      else if (d.tipo === 'baixo') add(`b|${d.tema}|${Math.floor(rnd(x, y, 5) * 3)}`, mx);
      else if (d.tipo === 'agua' || d.tipo === 'fundo') add('agua', M(T).at(x + .5, .07, y + .5), (AGUA[d.tema] || AGUA0)[d.tipo === 'agua' ? 0 : 1]);
      else if (d.tipo === 'perigo') add('perigo', M(T).at(x + .5, .02, y + .5), PERIGO[d.tema] || PERIGO0);
    }
    // arestas do bloco: horizontais (x, Z) e verticais (X, z); portas e barreiras abertas mudam de forma
    const temaAt = (x, y) => cellInfo(Math.min(f.w - 1, Math.max(0, x)), Math.min(f.h - 1, Math.max(0, y)))?.tema || w?.tema || 'campo';
    for (let Z = cy; Z <= y1; Z++) for (let x = cx; x < x1; x++) { if (Z === y1 && y1 < f.h) continue; const e = p.edgeH(f, x, Z); if (e) edge(e, x, Z, 0, open.has('h' + x + ',' + Z), temaAt(x, Z < f.h ? Z : Z - 1)); }
    for (let z = cy; z < y1; z++) for (let X = cx; X <= x1; X++) { if (X === x1 && x1 < f.w) continue; const e = p.edgeV(f, X, z); if (e) edge(e, X, z, 1, open.has('v' + X + ',' + z), temaAt(X < f.w ? X : X - 1, z)); }
    function edge(e, x, z, vert, isOpen, tema) {
      const mx = vert ? M(T).at(x, 0, z, 0, -Math.PI / 2, 0) : M(T).at(x, 0, z), c = PAREDE[tema] || PAREDE.campo;
      if (e === 2) { add('e2', mx, c); add('folha', isOpen ? mx.clone().multiply(M(T).at(.16, 0, 0, 0, Math.PI / 2 * .95, 0)) : mx.clone().multiply(M(T).at(.16, 0, 0)), '#ffffff'); }
      else if (e === 3) { if (!isOpen) add('e3', mx); }
      else add('e' + e, mx, e === 4 ? '#7a7a84' : c);
    }
    for (const [k, list] of inst) {
      const [kind, tema, v] = k.split('|'), outline = kind === 'd' || (kind === 'b' && qual !== 'baixa') || k === 'e1' || k === 'e2' || k === 'folha' || k === 'e4';
      const gm = kind === 'd' ? geo(k, () => pz.denso(tema, +v)) : kind === 'b' ? geo(k, () => pz.baixo(tema, +v)) : k === 'agua' || k === 'perigo' ? geo(k, () => { const q = new T.PlaneGeometry(1, 1); q.rotateX(-Math.PI / 2); return q; }) : k === 'folha' ? eg.folha : eg[k.slice(1)];
      const mat = k === 'agua' ? mats.agua : k === 'perigo' ? mats.perigo : k === 'e3' ? mats.barreira : kind === 'b' ? mats.pecaBaixa : mats.peca;
      const im = new T.InstancedMesh(gm, mat, list.length); im.name = k;
      list.forEach(([mx, c], i) => { im.setMatrixAt(i, mx); if (c) im.setColorAt(i, lin(c)); });
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere(); blk.add(im);
      if (outline) { const ol = new T.InstancedMesh(gm, kind === 'b' ? mats.contornoBaixo : mats.contorno, list.length); ol.instanceMatrix = im.instanceMatrix; ol.boundingSphere = im.boundingSphere; ol.name = k + ':contorno'; blk.add(ol); }
    }
  }
  if (f.img?.url) { const pg = new T.PlaneGeometry(f.w, f.h); pg.rotateX(-Math.PI / 2); pg.translate(f.w / 2, 0, f.h / 2); const mat = new T.MeshBasicMaterial({ color: 0x5a7a4a }); paintImg(T, mat, f.img); const ch = new T.Mesh(pg, mat); ch.name = 'chao'; root.add(ch); }
  return root;
}
// cutaway: liga e posiciona o recorte em volta do herói (camDir = yaw da câmera)
export function setCutaway(group, hero, yaw, T) {
  if (!U.uCut.value && T) { U.uCut.value = new T.Vector3(); U.uCamDir.value = new T.Vector3(); }
  if (!U.uCut.value) return;
  U.uCutOn.value = hero ? 1 : 0; if (hero) U.uCut.value.set(hero.x, 0, hero.z);
  U.uCamDir.value.set(Math.sin(yaw), 0, Math.cos(yaw));
}
export function tickPecas(now) { U.uTime.value = now / 1000; }
export function disposeFloor(root) {
  if (!root) return;
  root.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.name === 'chao') { o.geometry.dispose(); o.material.map?.dispose(); if (!Object.values(root.userData.mats || {}).includes(o.material)) o.material.dispose(); } if (o.isInstancedMesh) o.dispose?.(); });
  for (const gm of root.userData.geos?.values() || []) gm.dispose();
  for (const m of Object.values(root.userData.mats || {})) m.dispose();
}

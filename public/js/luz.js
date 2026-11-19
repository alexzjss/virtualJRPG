// ===== motor luminoso do combate (WebGL2, sem biblioteca) =====
// Um único contexto. Duas fontes de desenho no mesmo programa:
//  · lote de sprites refeito a cada quadro (o que acompanha a câmera: núcleo do projétil, círculo mágico, feixe);
//  · partículas "dispara e esquece" num anel na GPU — a posição sai da fórmula (p0 + v·t + g·t²/2 com arrasto), a CPU não as atualiza.
// O blend pré-multiplicado (ONE, ONE_MINUS_SRC_ALPHA) mistura aditivo (alfa de saída 0) e normal na mesma passada.
// Instala uma fachada ANIMFX: quando LUZP.engineFor diz 'classico' (chave, sem WebGL2, Baixa, contexto perdido), tudo vai ao motor antigo.
(g => {
  if (typeof document === 'undefined' || !g.ANIMFX || !g.LUZP) return;
  const C = g.ANIMFX, LP = g.LUZP, TAU = Math.PI * 2;
  g.ANIMFX_CLASSICO = C;
  const settings = C.settings; settings.style = localStorage.getItem('vj_fx_style') === 'classico' ? 'classico' : 'luz';
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const clockNow = () => typeof g.CENA !== 'undefined' ? g.CENA.now() : performance.now();
  const later = ms => typeof g.CENA !== 'undefined' ? g.CENA.wait(ms) : new Promise(r => setTimeout(r, ms));

  // ----- contexto -----
  const cvs = document.createElement('canvas'); cvs.className = 'luz-canvas'; cvs.setAttribute('aria-hidden', 'true');
  let gl = null, lost = false;
  try { gl = cvs.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' }); } catch {}
  const L = { canvas: cvs, gl, atlas: {}, W: 0, H: 0, dpr: 1 };
  g.LUZ = L;

  // ----- nível (Auto começa em Média e cai para Baixa = motor antigo quando o fps cai nos golpes) -----
  let autoLvl = 'medium', fps = 60, lastT = 0;
  const level = () => settings.quality === 'auto' ? autoLvl : settings.quality;
  const engine = () => LP.engineFor({ style: settings.style, webgl2: !!gl, level: level(), lost });
  L.active = () => engine() === 'luz';
  const mark = () => { const on = L.active(); document.documentElement.classList.toggle('luz', on); };

  // ----- atlas: células de 128 px numa folha 1024², desenhadas em branco (a cor vem do shader) -----
  const CELL = 128, SHEET = 1024, PER = SHEET / CELL;
  const atlasCanvas = () => {
    const a = document.createElement('canvas'); a.width = a.height = SHEET; const x = a.getContext('2d'); let i = 0;
    const cell = (name, draw) => { const cx = (i % PER) * CELL, cy = Math.floor(i / PER) * CELL; x.save(); x.translate(cx + CELL / 2, cy + CELL / 2); x.fillStyle = x.strokeStyle = '#fff'; draw(x, CELL / 2 - 4); x.restore();
      L.atlas[name] = [cx / SHEET, cy / SHEET, (cx + CELL) / SHEET, (cy + CELL) / SHEET]; i++; };
    const radial = (c, r, stops) => { const gr = c.createRadialGradient(0, 0, 0, 0, 0, r); stops.forEach(([o, a]) => gr.addColorStop(o, `rgba(255,255,255,${a})`)); c.fillStyle = gr; c.fillRect(-r, -r, r * 2, r * 2); };
    const glowLine = (c, w) => { c.shadowColor = '#fff'; c.shadowBlur = 10; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
    const path = (c, pts, close = true) => { c.beginPath(); pts.forEach(([px, py], k) => k ? c.lineTo(px, py) : c.moveTo(px, py)); if (close) c.closePath(); };
    const starPts = (n, R, r) => Array.from({ length: n * 2 }, (_, k) => { const an = k * Math.PI / n - Math.PI / 2, d = k % 2 ? r : R; return [Math.cos(an) * d, Math.sin(an) * d]; });
    cell('glow', (c, r) => radial(c, r, [[0, 1], [.18, .75], [.45, .22], [1, 0]]));
    cell('core', (c, r) => radial(c, r, [[0, 1], [.35, 1], [.6, .35], [1, 0]]));
    cell('spark', (c, r) => { const gr = c.createLinearGradient(-r, 0, r, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.beginPath(); c.ellipse(0, 0, r, r * .09, 0, 0, TAU); c.fill(); });
    cell('beam', (c, r) => { const gr = c.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.35, 'rgba(255,255,255,.35)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(.65, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(-r - 4, -r, r * 2 + 8, r * 2); });
    cell('smoke', (c, r) => { for (let k = 0; k < 7; k++) { const an = k * 2.4, d = r * .28; c.save(); c.translate(Math.cos(an) * d, Math.sin(an) * d); radial(c, r * .62, [[0, .35], [.6, .14], [1, 0]]); c.restore(); } });
    cell('star4', (c, r) => { radial(c, r * .5, [[0, 1], [1, 0]]); c.shadowColor = '#fff'; c.shadowBlur = 8; path(c, starPts(4, r, r * .12)); c.fill(); });
    cell('star8', (c, r) => { c.shadowColor = '#fff'; c.shadowBlur = 8; path(c, starPts(8, r, r * .3)); c.fill(); });
    cell('ring', (c, r) => { glowLine(c, 5); c.beginPath(); c.arc(0, 0, r - 8, 0, TAU); c.stroke(); });
    cell('ringThin', (c, r) => { glowLine(c, 2); c.beginPath(); c.arc(0, 0, r - 6, 0, TAU); c.stroke(); });
    cell('shock', (c, r) => radial(c, r, [[0, 0], [.72, 0], [.86, .9], [.93, .4], [1, 0]]));
    cell('flame', (c, r) => { c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(r * .55, -r * .1, r * .42, r * .38); c.arc(0, r * .38, r * .42, 0, Math.PI); c.quadraticCurveTo(-r * .55, -r * .1, 0, -r); c.shadowColor = '#fff'; c.shadowBlur = 14; c.fill(); });
    cell('drop', (c, r) => { c.beginPath(); c.moveTo(0, -r * .9); c.quadraticCurveTo(r * .6, r * .1, r * .5, r * .4); c.arc(0, r * .4, r * .5, 0, Math.PI); c.quadraticCurveTo(-r * .6, r * .1, 0, -r * .9); c.shadowColor = '#fff'; c.shadowBlur = 10; c.fill(); });
    cell('bubble', (c, r) => { glowLine(c, 4); c.beginPath(); c.arc(0, 0, r * .8, 0, TAU); c.stroke(); c.beginPath(); c.arc(-r * .3, -r * .3, r * .16, 0, TAU); c.fill(); });
    cell('shard', (c, r) => { c.shadowColor = '#fff'; c.shadowBlur = 8; path(c, [[r, 0], [-r * .2, -r * .38], [-r * .8, 0], [-r * .2, r * .38]]); c.fill(); });
    cell('hex', (c, r) => { glowLine(c, 4); path(c, Array.from({ length: 6 }, (_, k) => [Math.cos(k * TAU / 6) * r * .85, Math.sin(k * TAU / 6) * r * .85])); c.stroke(); c.globalAlpha = .25; c.fill(); });
    cell('crescent', (c, r) => { c.shadowColor = '#fff'; c.shadowBlur = 10; c.beginPath(); c.arc(0, 0, r * .85, Math.PI * .3, Math.PI * 1.7); c.arc(r * .35, 0, r * .62, Math.PI * 1.6, Math.PI * .4, true); c.closePath(); c.fill(); });
    cell('feather', (c, r) => { glowLine(c, 3); c.beginPath(); c.arc(0, r * .2, r * .8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.beginPath(); c.arc(0, r * .5, r * .5, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); });
    cell('eye', (c, r) => { glowLine(c, 4); c.beginPath(); c.moveTo(-r * .9, 0); c.quadraticCurveTo(0, -r * .7, r * .9, 0); c.quadraticCurveTo(0, r * .7, -r * .9, 0); c.stroke(); c.beginPath(); c.arc(0, 0, r * .26, 0, TAU); c.fill(); });
    cell('note', (c, r) => { c.shadowColor = '#fff'; c.shadowBlur = 8; c.beginPath(); c.ellipse(-r * .2, r * .45, r * .32, r * .24, -.4, 0, TAU); c.fill(); c.fillRect(r * .08, -r * .7, r * .12, r * 1.2); c.beginPath(); c.moveTo(r * .2, -r * .7); c.quadraticCurveTo(r * .7, -r * .45, r * .55, 0); c.lineWidth = r * .1; c.stroke(); });
    cell('plus', (c, r) => { c.shadowColor = '#fff'; c.shadowBlur = 10; const w = r * .26; c.fillRect(-w, -r * .8, w * 2, r * 1.6); c.fillRect(-r * .8, -w, r * 1.6, w * 2); });
    cell('streak', (c, r) => { const gr = c.createLinearGradient(-r, 0, r, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); c.fillStyle = gr; c.fillRect(-r, -3, r * 2, 6); });
    // glifos de assinatura de cada elemento: círculo + desenho próprio em traço luminoso
    const GLY = {
      kagutsuchi: (c, r) => { path(c, starPts(3, r * .62, r * .25)); c.stroke(); },
      susanoo: (c, r) => { for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-r * .55, k * r * .25); c.bezierCurveTo(-r * .2, k * r * .25 - r * .18, r * .2, k * r * .25 + r * .18, r * .55, k * r * .25); c.stroke(); } },
      atlas: (c, r) => { path(c, [[0, -r * .6], [r * .55, r * .42], [-r * .55, r * .42]]); c.stroke(); c.beginPath(); c.moveTo(0, -r * .6); c.lineTo(0, r * .42); c.stroke(); },
      indra: (c, r) => { path(c, [[r * .1, -r * .65], [-r * .25, r * .05], [r * .12, r * .05], [-r * .1, r * .65]], false); c.stroke(); },
      fuhaku: (c, r) => { c.beginPath(); for (let k = 0; k < 40; k++) { const an = k * .32, d = r * .06 + k * r * .014; c.lineTo(Math.cos(an) * d, Math.sin(an) * d); } c.stroke(); },
      amaterasu: (c, r) => { c.beginPath(); c.arc(0, 0, r * .22, 0, TAU); c.stroke(); for (let k = 0; k < 8; k++) { const an = k * TAU / 8; c.beginPath(); c.moveTo(Math.cos(an) * r * .34, Math.sin(an) * r * .34); c.lineTo(Math.cos(an) * r * .62, Math.sin(an) * r * .62); c.stroke(); } },
      tsukuyomi: (c, r) => { c.beginPath(); c.arc(0, 0, r * .55, Math.PI * .3, Math.PI * 1.7); c.arc(r * .25, 0, r * .42, Math.PI * 1.62, Math.PI * .38, true); c.closePath(); c.stroke(); },
      shukketsu: (c, r) => { c.beginPath(); c.moveTo(0, -r * .62); c.quadraticCurveTo(r * .5, r * .05, 0, r * .55); c.quadraticCurveTo(-r * .5, r * .05, 0, -r * .62); c.stroke(); c.beginPath(); c.moveTo(-r * .5, -r * .1); c.lineTo(r * .5, -r * .1); c.stroke(); },
      hiruko: (c, r) => { for (const [px, py, pr] of [[0, -r * .25, .2], [-r * .3, r * .22, .16], [r * .3, r * .22, .16]]) { c.beginPath(); c.arc(px, py, r * pr, 0, TAU); c.stroke(); } },
      aura: (c, r) => { path(c, Array.from({ length: 6 }, (_, k) => [Math.cos(k * TAU / 6 + Math.PI / 6) * r * .55, Math.sin(k * TAU / 6 + Math.PI / 6) * r * .55])); c.stroke(); path(c, Array.from({ length: 6 }, (_, k) => [Math.cos(k * TAU / 6 + Math.PI / 6) * r * .28, Math.sin(k * TAU / 6 + Math.PI / 6) * r * .28])); c.stroke(); },
      oculto: (c, r) => { c.beginPath(); c.moveTo(-r * .6, 0); c.quadraticCurveTo(0, -r * .45, r * .6, 0); c.quadraticCurveTo(0, r * .45, -r * .6, 0); c.stroke(); c.beginPath(); c.arc(0, 0, r * .15, 0, TAU); c.fill(); },
      fis: (c, r) => { path(c, [[0, -r * .6], [r * .6, 0], [0, r * .6], [-r * .6, 0]]); c.stroke(); }
    };
    for (const [el, fn] of Object.entries(GLY)) cell('glyph-' + el, (c, r) => { glowLine(c, 4); c.beginPath(); c.arc(0, 0, r * .92, 0, TAU); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * .8, 0, TAU); c.stroke(); for (let k = 0; k < 12; k++) { const an = k * TAU / 12; c.fillRect(Math.cos(an) * r * .86 - 2, Math.sin(an) * r * .86 - 2, 4, 4); } c.lineWidth = 4; fn(c, r); });
    return a;
  };

  // ----- programa -----
  // por instância: a0 = (x, y, vx, vy) · a1 = (nascimento s, vida s, tam0, tam1) · a2 = (rot, giro, grav, arrasto) · a3 = cor rgba · a4 = uv · a5 = (aditivo, sx, sy, modo)
  // modo 0: sprite do lote (vida 0 = sem tempo; sx/sy esticam); modo 1: partícula com física
  const VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec2 q; layout(location=1) in vec4 a0; layout(location=2) in vec4 a1; layout(location=3) in vec4 a2; layout(location=4) in vec4 a3; layout(location=5) in vec4 a4; layout(location=6) in vec4 a5;
  uniform vec2 uRes; uniform float uNow;
  out vec2 vUv; out vec4 vCol; out float vAdd;
  void main(){
    vec2 p = a0.xy; float rot = a2.x, size = a1.z, alpha = a3.a;
    if (a5.w > .5) {
      float t = uNow - a1.x, u = t / max(a1.y, .001);
      if (t < 0. || u > 1.) { gl_Position = vec4(2., 2., 0., 1.); return; }
      float k = a2.w > 0. ? (1. - exp(-a2.w * t)) / a2.w : t;
      p += a0.zw * k + vec2(0., .5 * a2.z * t * t);
      size = mix(a1.z, a1.w, u); rot += a2.y * t;
      alpha *= min(1., u * 10.) * (1. - u * u);
    }
    vec2 s = vec2(a5.y, a5.z) * size, c = vec2(cos(rot), sin(rot)), o = vec2(q.x * s.x, q.y * s.y);
    o = vec2(o.x * c.x - o.y * c.y, o.x * c.y + o.y * c.x);
    vec2 w = p + o; gl_Position = vec4(w.x / uRes.x * 2. - 1., 1. - w.y / uRes.y * 2., 0., 1.);
    vUv = mix(a4.xy, a4.zw, q * .5 + .5); vCol = vec4(a3.rgb, alpha); vAdd = a5.x;
  }`;
  const FS = `#version 300 es
  precision mediump float;
  in vec2 vUv; in vec4 vCol; in float vAdd; uniform sampler2D uTex; out vec4 o;
  void main(){ float m = texture(uTex, vUv).a * vCol.a; vec3 c = mix(vCol.rgb, vec3(1.), smoothstep(.75, 1., m) * vAdd * .6); o = vec4(c * m, m * (1. - vAdd)); }`;
  const STRIDE = 24; // floats por instância
  let prog, vaoP, bufP, tex, uRes, uNow, uTex;
  let capP = 0, dataP, headP = 0, dirtyA = Infinity, dirtyB = -1, deathP = 0; const capB = 2048, dataB = [new Float32Array(capB * STRIDE), new Float32Array(capB * STRIDE)], nB = [0, 0], layerB = [[], []], bufB = [], vaoB = [];
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const mkVao = buf => { const v = gl.createVertexArray(); gl.bindVertexArray(v);
    const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); for (let k = 0; k < 6; k++) { gl.enableVertexAttribArray(k + 1); gl.vertexAttribPointer(k + 1, 4, gl.FLOAT, false, STRIDE * 4, k * 16); gl.vertexAttribDivisor(k + 1, 1); }
    gl.bindVertexArray(null); return v; };
  function setup() {
    prog = gl.createProgram(); gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    uRes = gl.getUniformLocation(prog, 'uRes'); uNow = gl.getUniformLocation(prog, 'uNow'); uTex = gl.getUniformLocation(prog, 'uTex');
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas()); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    for (const k of [0, 1]) { bufB[k] = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufB[k]); gl.bufferData(gl.ARRAY_BUFFER, dataB[k].byteLength, gl.DYNAMIC_DRAW); vaoB[k] = mkVao(bufB[k]); }
    bufP = gl.createBuffer(); vaoP = mkVao(bufP); capP = 0; sizeParticles();
    L.onSetup.forEach(f => f(gl));
  }
  L.onSetup = []; // luz-pos, luz-corpo: recriam seus recursos depois de perder o contexto
  function sizeParticles() { const n = Math.max(256, LP.budget(level()).particles); if (n === capP) return; capP = n; dataP = new Float32Array(capP * STRIDE); headP = 0; deathP = 0; gl.bindBuffer(gl.ARRAY_BUFFER, bufP); gl.bufferData(gl.ARRAY_BUFFER, dataP.byteLength, gl.DYNAMIC_DRAW); }

  // ----- cores -----
  const rgbCache = new Map();
  const rgb = hex => { let v = rgbCache.get(hex); if (v) return v; const h = String(hex || '#fff').replace('#', ''), f = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, 'f'); v = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255); rgbCache.set(hex, v); return v; };
  L.rgb = rgb;
  const put = (D, o, x, y, vx, vy, born, life, s0, s1, rot, spin, grav, drag, col, a, uv, add, sx, sy, mode) => {
    const c = rgb(col); D[o] = x; D[o + 1] = y; D[o + 2] = vx; D[o + 3] = vy; D[o + 4] = born; D[o + 5] = life; D[o + 6] = s0; D[o + 7] = s1;
    D[o + 8] = rot; D[o + 9] = spin; D[o + 10] = grav; D[o + 11] = drag; D[o + 12] = c[0]; D[o + 13] = c[1]; D[o + 14] = c[2]; D[o + 15] = a;
    D[o + 16] = uv[0]; D[o + 17] = uv[1]; D[o + 18] = uv[2]; D[o + 19] = uv[3]; D[o + 20] = add ? 1 : 0; D[o + 21] = sx; D[o + 22] = sy; D[o + 23] = mode; };
  const UV0 = [0, 0, 0, 0];
  // partícula: { x, y, vx, vy (px/s), life (ms), size, size1, rot, spin, grav (px/s²), drag, color, alpha, tex, add, sx, sy }
  L.emit = p => { if (!gl || lost || !capP) return; const now = clockNow() / 1000, life = (p.life || 600) / 1000, o = headP * STRIDE;
    put(dataP, o, p.x, p.y, p.vx || 0, p.vy || 0, now + (p.delay || 0) / 1000, life, p.size || 12, p.size1 ?? (p.size || 12) * .3, p.rot || 0, p.spin || 0, p.grav || 0, p.drag || 0, p.color || '#fff', p.alpha ?? 1, L.atlas[p.tex || 'glow'] || UV0, p.add !== false, p.sx || 1, p.sy || 1, 1);
    dirtyA = Math.min(dirtyA, headP); dirtyB = Math.max(dirtyB, headP); headP = (headP + 1) % capP; if (headP === 0) { dirtyA = 0; dirtyB = capP - 1; }
    deathP = Math.max(deathP, (now + life + (p.delay || 0) / 1000) * 1000); kick(); };
  // sprite do lote (só neste quadro): { x, y, size, sx, sy, rot, color, alpha, tex, add, layer: 0 atrás dos corpos | 1 na frente }
  L.sprite = s => { if (!gl || lost) return; const lst = layerB[s.layer === 0 ? 0 : 1]; if (lst.length < capB) lst.push(s); };
  // fita entre dois pontos (feixe, rastro): sprite 'beam' esticado
  L.line = (a, b, w, color, alpha = 1, add = true, layer = 1, tex = 'beam') => { const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy); if (len < .5) return; L.sprite({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, size: 1, sx: len / 2 + w * .3, sy: w, rot: Math.atan2(dy, dx), color, alpha, tex, add, layer }); };

  // ----- quadro -----
  const frameFns = new Set(); let raf = 0, bodyDraw = null;
  L.onFrame = fn => { frameFns.add(fn); kick(); return () => frameFns.delete(fn); };
  L.setBodies = fn => { bodyDraw = fn; kick(); }; // luz-corpo: desenha os recortes entre as duas camadas do lote; devolve true para manter o loop vivo
  L.post = null; // luz-pos: { begin() → true se vai compor, end(now) }
  const resize = () => { const d = Math.min(devicePixelRatio || 1, 1.5), w = innerWidth, h = innerHeight; if (w === L.W && h === L.H && d === L.dpr) return; L.W = w; L.H = h; L.dpr = d; cvs.width = Math.round(w * d); cvs.height = Math.round(h * d); cvs.style.width = w + 'px'; cvs.style.height = h + 'px'; };
  const flush = ly => { const lst = layerB[ly]; nB[ly] = 0; if (!lst.length) return; let n = 0;
    for (const s of lst) { const sz = s.size ?? 16; put(dataB[ly], n * STRIDE, s.x, s.y, 0, 0, 0, 0, sz, sz, s.rot || 0, 0, 0, 0, s.color || '#fff', s.alpha ?? 1, L.atlas[s.tex || 'glow'] || UV0, s.add !== false, s.sx || 1, s.sy || 1, 0); n++; }
    nB[ly] = n; lst.length = 0; gl.bindBuffer(gl.ARRAY_BUFFER, bufB[ly]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, dataB[ly], 0, n * STRIDE); };
  const drawB = ly => { if (!nB[ly]) return; gl.bindVertexArray(vaoB[ly]); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nB[ly]); };
  const bindProg = now => { gl.useProgram(prog); gl.uniform2f(uRes, L.W, L.H); gl.uniform1f(uNow, now / 1000); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(uTex, 0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); };
  L.bindSprites = bindProg; let lastNow = 0;
  function frame(t) {
    raf = 0; if (!gl || lost) return;
    if (!L.active()) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); return; }
    const now = clockNow(), dt = Math.min(64, now - (lastNow || now)); lastNow = now;
    if (lastT) { const inst = 1000 / Math.max(1, t - lastT); fps = fps * .94 + inst * .06; } lastT = t;
    let busy = false;
    for (const fn of [...frameFns]) { let keep = false; try { keep = fn(now, dt) !== false; } catch (e) { console.error(e); } if (keep) busy = true; else frameFns.delete(fn); }
    const live = now < deathP; busy = busy || live;
    if (settings.quality === 'auto' && busy) { const was = autoLvl; autoLvl = fps < 43 ? 'low' : fps > 56 && autoLvl === 'low' ? 'medium' : autoLvl; if (was !== autoLvl) { qEvt(); if (!L.active()) { mark(); return; } } }
    resize(); flush(0); flush(1);
    if (dirtyB >= dirtyA) { gl.bindBuffer(gl.ARRAY_BUFFER, bufP); gl.bufferSubData(gl.ARRAY_BUFFER, dirtyA * STRIDE * 4, dataP, dirtyA * STRIDE, (dirtyB - dirtyA + 1) * STRIDE); dirtyA = Infinity; dirtyB = -1; }
    const composing = L.post?.begin?.(now, dt) || false;
    if (!composing) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cvs.width, cvs.height); }
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    bindProg(now); drawB(0);
    if (bodyDraw) { let keep = false; try { keep = bodyDraw(now, dt) === true; } catch (e) { console.error(e); } busy = busy || keep; bindProg(now); }
    drawB(1);
    if (live) { gl.bindVertexArray(vaoP); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, capP); }
    gl.bindVertexArray(null); nB[0] = nB[1] = 0;
    if (composing) busy = L.post.end(now) || busy;
    if (busy) raf = requestAnimationFrame(frame); else { lastT = 0; lastNow = 0; }
  }
  const kick = () => { if (!raf && gl && !lost) raf = requestAnimationFrame(frame); };
  L.kick = kick;
  const qEvt = () => { if (gl && !lost) sizeParticles(); mark(); try { dispatchEvent(new Event('vj-quality')); } catch {} };

  // ----- geometria dos recortes (igual ao motor antigo: âncoras salvas em fxK, pé, núcleo, escala) -----
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const unit = id => document.querySelector(`.p3d .bb[data-tgt="${CSS.escape(id || '')}"]`) || document.querySelector(`.stage .unit[data-tgt="${CSS.escape(id || '')}"]`) || document.querySelector(`.tok[data-id="${CSS.escape(id || '')}"]`);
  const rect = id => { const u = unit(id); if (!u) return null; const im = u.querySelector(':scope > .bbi > img') || u; const r = im.getBoundingClientRect(); return r.width ? r : u.getBoundingClientRect(); };
  const point = (id, r, anchor = 'core') => { if (!r) return { x: L.W / 2, y: L.H / 2 }; const el = unit(id), k = el?.dataset.kind || 'f', saved = g.S?.chars?.[id]?.fxK?.[k]?.[anchor], A = saved ? [saved.x, saved.y] : ({ hand: [.64, .42], weapon: [.72, .46], head: [.5, .18], feet: [.5, .9], core: [.5, .48], eyes: [.5, .24] }[anchor] || [.5, .48]); return { x: r.left + r.width * A[0], y: r.top + r.height * A[1] }; };
  const target = r => r ? { x: r.left + r.width * .5, y: r.top + r.height * .45 } : { x: L.W * .65, y: L.H * .48 };
  const foot = r => r ? { x: r.left + r.width * .5, y: r.bottom - r.height * .04 } : { x: L.W * .65, y: L.H * .62 };
  const scale = r => r ? clamp(r.height / 210, .45, 1.8) : 1;
  L.geo = { unit, rect, point, target, foot, scale };

  // ----- som (o mesmo do motor antigo: o áudio não muda) -----
  const NOTE = { kagutsuchi: 165, susanoo: 294, atlas: 110, indra: 440, fuhaku: 392, amaterasu: 659, tsukuyomi: 139, shukketsu: 196, hiruko: 247, aura: 523, oculto: 104, fis: 147 };
  const sound = (P, dur) => { try { if (typeof tone === 'function') { const f = NOTE[P.el] || 220, beam = P.family === 'beam' || P.family === 'ritual'; tone(f, Math.min(.5, dur / 1000), { type: beam ? 'sawtooth' : P.family === 'heal' ? 'sine' : 'triangle', to: beam ? f * 2 : P.family === 'projectile' ? f * 1.5 : 0, g: .035 + P.tier * .012 }); if (['smash', 'area', 'rain'].includes(P.family) && typeof thud === 'function') thud(.18, 180 + P.tier * 90, .16 + P.tier * .05, 'lowpass', dur * P.impact / 1000); } } catch {} };

  // ----- golpe -----
  const skillByName = n => Object.values(g.S?.skills || {}).find(s => s.name === n);
  const sigFor = (s, fx) => fx.lim || fx.dom || s?.limit || s?.dom ? 'ult' : (LP.sigOf && s ? LP.sigOf(s).kind : 'none');
  // provisório até luz-fx: um brilho no alvo no instante do impacto
  const placeholder = e => L.onFrame(now => { const k = (now - e.start) / e.dur; if (k > 1) return false; const imp = e.profile.impact; if (k < imp) return true; const z = (k - imp) / (1 - imp), b = e.to(); L.sprite({ x: b.x, y: b.y, size: 70 * e.sb() * (1 + z), color: e.profile.palette[1], alpha: 1 - z, tex: 'glow' }); return true; });
  function play({ actorId, targetIds = [], skill, fx = {}, delay = 0, sig } = {}) {
    if (!L.active()) return C.play({ actorId, targetIds, skill, fx, delay });
    const s = skill || skillByName(fx.s), P = C.profile(s, fx), kind = sig || sigFor(s, fx), dur = LP.duration(P, { speed: settings.speed, reduced: reduced(), sig: kind === 'line' ? 'line' : 'none' }), T = LP.promiseTimes(P, dur);
    const aid = actorId || fx.a, ids = [...new Set(targetIds.filter(Boolean))], targets = ids.length ? ids : [fx.id].filter(Boolean), start = clockNow() + delay;
    sound(P, dur);
    (targets.length ? targets : ['']).forEach((tid, i) => {
      const ar = () => rect(aid), tr = () => rect(tid);
      const e = { profile: { ...P, seed: P.seed + i * 997 }, aid, tid, i, n: targets.length, start: start + i * 40, dur, sig: kind, skill: s, fx,
        from: () => point(aid, ar(), P.origin), to: () => target(tr()), footA: () => foot(ar()), footB: () => foot(tr()), sa: () => scale(ar()), sb: () => scale(tr()) };
      (g.LUZFX?.run || placeholder)(e);
    });
    return { profile: { ...P, duration: dur }, impact: later(T.impact + delay), done: later(T.done + delay) };
  }
  // faíscas do parry: explosão curta de partículas aditivas
  function sparks(x, y, color = '#ffd36a', n = 14) { if (!L.active()) return C.sparks(x, y, color, n); if (reduced()) return;
    for (let i = 0; i < n * 2; i++) { const an = Math.random() * TAU, v = 260 + Math.random() * 520; L.emit({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, drag: 5, life: 260 + Math.random() * 260, size: 18, size1: 4, rot: an, tex: 'spark', sx: 2.4, sy: .6, color: i % 3 ? color : '#ffffff' }); }
    L.emit({ x, y, life: 220, size: 60, size1: 140, tex: 'glow', color }); }

  // batalha nova: a Auto volta a tentar o motor novo (sync roda a cada estado, pela coreo)
  let wasOn = false; const battleEdge = () => { const on = !!g.S?.battle?.active; if (on && !wasOn && settings.quality === 'auto' && autoLvl === 'low') { autoLvl = 'medium'; qEvt(); } wasOn = on; };
  // ----- fachada -----
  const F = { ...C, settings, palette: C.palette, familyOf: C.familyOf, profile: C.profile, play, sparks,
    level: () => L.active() ? level() : C.level(),
    sync: () => { battleEdge(); if (!L.active()) C.sync(); },
    ink: (r, color, ms) => C.ink(r, color, ms), // tinta do KO: o motor novo troca por fagulhas (luz-fx)
    flash: (color, ms) => C.flash(color, ms),
    setQuality: v => { C.setQuality(v); if (gl && !lost) sizeParticles(); mark(); kick(); },
    setStyle: v => { if (!['luz', 'classico'].includes(v)) return; settings.style = v; try { localStorage.setItem('vj_fx_style', v); } catch {} mark(); kick(); try { dispatchEvent(new Event('vj-quality')); } catch {} } };
  g.ANIMFX = F;

  // ----- ciclo de vida -----
  if (gl) {
    try { setup(); } catch (e) { console.error('luz: sem WebGL2 utilizável', e); gl = null; L.gl = null; }
    cvs.addEventListener('webglcontextlost', ev => { ev.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; frameFns.clear(); mark(); try { dispatchEvent(new Event('vj-quality')); } catch {} });
    cvs.addEventListener('webglcontextrestored', () => { try { setup(); lost = false; } catch (e) { console.error(e); } mark(); try { dispatchEvent(new Event('vj-quality')); } catch {} });
  }
  document.body.append(cvs); resize(); addEventListener('resize', () => { resize(); kick(); }); mark();
})(globalThis);

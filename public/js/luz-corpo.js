// ===== corpo dos recortes em malha (motor luminoso) =====
// Cada .bb do palco 3D continua no DOM como âncora de posição, clique e mira, com a imagem invisível; aqui o PNG vira uma malha
// 8×12 desenhada no canvas do luz.js entre a camada de trás e a da frente dos efeitos. A deformação vem de LUZP.bodyCurve
// (ações, reações, poses) e do vento do clima (só o terço de cima ondula). Recorte cuja imagem a GPU não lê fica no DOM.
(g => {
  const L = g.LUZ, LP = g.LUZP; if (!L?.gl) return;
  const COLS = 8, ROWS = 12;
  const VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec2 aG;
  uniform vec2 uRes; uniform vec4 uRect; uniform vec4 uD1; uniform vec4 uD2; uniform float uT;
  out vec2 vUv; out float vH;
  void main(){
    float hf = 1. - aG.y, w = uRect.z, h = uRect.w, dir = uD2.z;
    vec2 p = vec2((aG.x - .5) * w, -hf * h);
    float sq = uD1.y; p.y *= 1. + sq; p.x /= sqrt(max(.2, 1. + sq));
    p.x *= mix(1., cos(uD1.z), hf);
    if (hf > .6667) { float k = (hf - .6667) * 3.; p.x += 3. * uD2.w * k * k * sin(uT * 1.6 + hf * 2.); }
    float th = uD1.x * pow(hf, 1.2) * dir, c = cos(th), s = sin(th);
    p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    p += vec2(uD2.x * h * dir, uD2.y * h) + uD1.w * vec2(sin(uT * 90.), .5 * cos(uT * 77.));
    vec2 foot = vec2(uRect.x + w * .5, uRect.y + h), q = foot + p;
    gl_Position = vec4(q.x / uRes.x * 2. - 1., 1. - q.y / uRes.y * 2., 0., 1.);
    vUv = aG; vH = hf;
  }`;
  const FS = `#version 300 es
  precision mediump float;
  in vec2 vUv; in float vH; uniform sampler2D uTex; uniform vec4 uTint; uniform vec4 uLook; uniform vec2 uPx; out vec4 o;
  void main(){
    vec4 c = texture(uTex, vUv); float a = c.a; if (a < .003) discard;
    vec3 rgb = c.rgb / a;
    float gray = dot(rgb, vec3(.299, .587, .114)); rgb = mix(vec3(gray), rgb, uLook.y) * uLook.x;
    float n = min(min(texture(uTex, vUv + vec2(uPx.x, 0.)).a, texture(uTex, vUv - vec2(uPx.x, 0.)).a), min(texture(uTex, vUv + vec2(0., uPx.y)).a, texture(uTex, vUv - vec2(0., uPx.y)).a));
    float rim = clamp((a - n) * 2.5, 0., 1.);
    rgb += uTint.rgb * uTint.a * (rim * 1.4 + .18);
    rgb = mix(rgb, vec3(1.), uLook.w);
    float al = a * uLook.z; o = vec4(rgb * al, al);
  }`;
  let prog, vao, nIdx, U = {};
  const compile = (gl, type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  function setup(gl) {
    prog = gl.createProgram(); gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    for (const k of ['uRes', 'uRect', 'uD1', 'uD2', 'uT', 'uTex', 'uTint', 'uLook', 'uPx']) U[k] = gl.getUniformLocation(prog, k);
    const v = [], idx = [];
    for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) v.push(c / COLS, r / ROWS);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const a = r * (COLS + 1) + c, b = a + 1, d = a + COLS + 1, e = d + 1; idx.push(a, b, d, b, e, d); }
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW); nIdx = idx.length;
    gl.bindVertexArray(null); texs.clear();
  }
  // ----- texturas por URL (carregadas com CORS anônimo; falhou → o recorte fica no DOM) -----
  const texs = new Map();
  const texOf = src => {
    let t = texs.get(src); if (t) return t;
    t = { ok: false, done: false, tex: null, w: 1, h: 1 }; texs.set(src, t);
    const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
    // rasteriza num canvas antes de subir: SVG direto dá INVALID_VALUE em alguns drivers, a silhueta ganha nitidez e o PNG gigante não estoura a GPU
    im.onload = () => { const gl = L.gl; t.done = true; if (!im.naturalWidth || !gl) return;
      try { const nh = im.naturalHeight || im.naturalWidth, svg = /^data:image\/svg|\.svg(\?|$)/i.test(src), H = Math.min(1024, svg ? 768 : nh), Wd = Math.max(1, Math.round(H * im.naturalWidth / nh));
        const cv = document.createElement('canvas'); cv.width = Wd; cv.height = H; cv.getContext('2d').drawImage(im, 0, 0, Wd, H);
        t.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        t.w = Wd; t.h = H; t.ok = gl.getError() === gl.NO_ERROR; L.kick(); } catch { t.ok = false; } };
    im.onerror = () => { t.done = true; };
    im.src = src; return t;
  };
  // ----- estado por recorte -----
  const st = new Map(); // id → { curves: [{ kind, t0, ms, opts }], tint: { col, k, until }, flash: until, ghost: { t0, dir } }
  const S0 = id => { let s = st.get(id); if (!s) { s = { curves: [], tint: null, flash: 0, ghost: null }; st.set(id, s); } return s; };
  const now = () => typeof g.CENA !== 'undefined' ? g.CENA.now() : performance.now();
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const MS = { hit: 420, hurt: 500, dodge: 520, parry: 420, limit: 900, vit: 1100, cai: 900, ko: 900, foge: 1200 };
  const units = () => document.querySelectorAll('.p3d .bb[data-tgt]');
  const elOf = id => document.querySelector(`.p3d .bb[data-tgt="${CSS.escape(id || '')}"]`);
  const has = id => !!(L.active() && elOf(id)?.classList.contains('malha'));
  // frente de quem age: para o lado do grupo oposto na tela
  const facing = id => { const c = g.S?.chars?.[id], me = elOf(id)?.getBoundingClientRect(); if (!c || !me) return 1; let sx = 0, n = 0;
    for (const u of units()) { const o = g.S?.chars?.[u.dataset.tgt]; if (!o || !!o.enemy === !!c.enemy) continue; const r = u.getBoundingClientRect(); sx += r.left + r.width / 2; n++; }
    return n ? Math.sign(sx / n - (me.left + me.width / 2)) || 1 : 1; };
  const play = (id, kind, opts = {}) => { if (reduced() || !has(id)) return; const s = S0(id), ms = (MS[kind] || 860) / Math.max(.5, Math.min(2, g.ANIMFX?.settings?.speed || 1));
    s.curves = s.curves.filter(c => c.kind !== kind); s.curves.push({ kind, t0: now(), ms, opts: { dir: facing(id), ...opts }, hold: kind === 'cai' || kind === 'ko' }); L.kick(); };
  const tint = (id, col, k = 1, ms = 500) => { if (!has(id)) return; S0(id).tint = { col, k, t0: now(), ms }; L.kick(); };
  const fade = (id, ms = 1150, col = '#ffffff') => { if (!has(id)) return false; const s = S0(id); s.fade = { t0: now(), ms }; s.fadeCol = col; L.kick(); return true; }; // KO luminoso: trinca em luz e some
  const flash = (id, ms = 160) => { if (!has(id)) return; S0(id).flash = now() + ms; L.kick(); };
  const ghosts = (id, dir = 1) => { if (reduced() || !has(id)) return; S0(id).ghost = { t0: now(), dir }; play(id, 'dodge', { dir: -dir }); };
  // ----- vento do clima -----
  const wind = () => { const sc = g.S?.scenes?.[g.S?.scene], cl = sc?.clima || g.S?.battle?.clima || ''; return /chuva|neve|cinza|brasa|nebl|vento|tempest/.test(String(cl)) ? .6 : .3; };
  // ----- desenho -----
  const D = { bend: 0, squash: 0, twist: 0, dx: 0, dy: 0, shake: 0 };
  let lastRects = '', still = 0;
  function draw(t) {
    const gl = L.gl, root = document.querySelector('.p3d');
    if (!root || root.style.display === 'none' || !L.active()) return false;
    const list = []; let sig = '', anim = false;
    for (const el of units()) {
      const id = el.dataset.tgt, img = el.querySelector(':scope > .bbi > img'); if (!img) continue;
      const src = img.currentSrc || img.src, tx = src ? texOf(src) : null;
      const ok = !!tx && LP.meshable({ src, sameOrigin: tx.done && tx.ok, loaded: tx.ok });
      el.classList.toggle('malha', ok); if (!ok) continue;
      const r = img.getBoundingClientRect(); if (!r.width || !r.height) continue;
      sig += `${id}:${r.left | 0},${r.top | 0},${r.width | 0};`;
      list.push({ id, el, r, tx });
    }
    if (!list.length) return false;
    list.sort((a, b) => a.r.bottom - b.r.bottom); // do fundo (mais alto na tela) para a frente
    gl.useProgram(prog); gl.bindVertexArray(vao); gl.uniform2f(U.uRes, L.W, L.H); gl.uniform1f(U.uT, t / 1000); gl.uniform1i(U.uTex, 0); gl.activeTexture(gl.TEXTURE0);
    const w = reduced() ? 0 : wind();
    for (const u of list) {
      const s = st.get(u.id), c = g.S?.chars?.[u.id] || {}, d = { ...D };
      // pose contínua (ferido curva, KO deitado) + curvas em curso
      const pose = typeof g.PFX !== 'undefined' ? g.PFX.poseOf(c) : [];
      if (pose.includes('ferido')) { d.bend += .1; d.squash -= .04; }
      let dir = 1;
      if (s) { s.curves = s.curves.filter(cv => { const k = (t - cv.t0) / cv.ms; if (k >= 1 && !cv.hold) return false; const b = LP.bodyCurve(cv.kind, Math.min(1, k), cv.opts); for (const p in d) d[p] += b[p]; dir = cv.opts.dir || dir; if (k < 1) anim = true; return true; }); }
      const ko = pose.includes('ko') && !(s?.curves.some(cv => cv.hold));
      if (ko && !c.enemy) { d.bend -= 1.4; d.dy += .08; d.squash -= .1; }
      const inked = u.el.classList.contains('inked'); let alpha = inked && !s?.fade ? 0 : 1, fk = 0;
      if (s?.fade) { const k = (t - s.fade.t0) / s.fade.ms; if (k >= 1) { s.fade = null; alpha = 0; } else { anim = true; fk = Math.min(1, k / .22); alpha = k < .22 ? 1 : 1 - (k - .22) / .78; } }
      if (!alpha) continue;
      const lim = pose.includes('limite');
      let tr = 0, tg = 0, tb = 0, tk = 0;
      if (fk) { [tr, tg, tb] = L.rgb(s.fadeCol || '#ffffff'); tk = .35 + fk * .65; }
      if (s?.tint) { const k = (t - s.tint.t0) / s.tint.ms; if (k < 1) { [tr, tg, tb] = L.rgb(s.tint.col); tk = s.tint.k * (1 - k); anim = true; } else s.tint = null; }
      if (lim && !tk) { [tr, tg, tb] = L.rgb('#ffd36a'); tk = .35 + .25 * Math.sin(t / 220); anim = true; }
      const fl = s && t < s.flash ? (s.flash - t) / 160 * .7 : 0; if (fl) anim = true;
      gl.bindTexture(gl.TEXTURE_2D, u.tx.tex);
      gl.uniform4f(U.uTint, tr, tg, tb, tk); gl.uniform2f(U.uPx, 2 / u.tx.w, 2 / u.tx.h);
      const look = (k, a) => gl.uniform4f(U.uLook, ko ? .45 : pose.includes('ferido') ? .82 : 1, ko ? 0 : pose.includes('ferido') ? .8 : 1, a, k);
      gl.uniform4f(U.uRect, u.r.left, u.r.top, u.r.width, u.r.height);
      // fantasmas da esquiva: três cópias atrás, mais apagadas
      if (s?.ghost) { const k = (t - s.ghost.t0) / 520; if (k < 1) { anim = true; [.45, .3, .15].forEach((a, i) => { gl.uniform4f(U.uD1, d.bend * .5, d.squash, d.twist, 0); gl.uniform4f(U.uD2, d.dx + (i + 1) * .12 * (1 - k), d.dy, s.ghost.dir, w); look(.3, a * (1 - k)); gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0); }); } else s.ghost = null; }
      gl.uniform4f(U.uD1, d.bend, d.squash, d.twist, d.shake); gl.uniform4f(U.uD2, d.dx, d.dy, dir, w); look(fl, alpha);
      gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0);
    }
    gl.bindVertexArray(null);
    // câmera parada e nada animando: o luz.js pode cair para 30 fps
    const moved = sig !== lastRects; lastRects = sig; still = moved || anim ? 0 : still + 1;
    return true;
  }
  L.onSetup.push(setup); setup(L.gl);
  L.setBodies(draw);
  L.bodiesIdle = () => still > 2;
  // troca para o motor antigo: devolve as imagens ao DOM
  addEventListener('vj-quality', () => { if (!L.active()) document.querySelectorAll('.p3d .bb.malha').forEach(e => e.classList.remove('malha')); else L.kick(); });
  L.corpo = { play, tint, flash, ghosts, fade, has, textures: texs };
  // o palco-vida chama action/ghosts/pose para o corpo; com a malha ativa, quem mexe o corpo é ela
  const V = g.PVIDA; if (V) {
    if (V.action) { const a0 = V.action; V.action = (id, family, tier = 1, seed = 0) => has(id) ? play(id, family, { tier, seed }) : a0(id, family, tier, seed); }
    if (V.ghosts) { const g0 = V.ghosts; V.ghosts = (id, dir = 1) => has(id) ? ghosts(id, dir) : g0(id, dir); }
    if (V.pose) { const p0 = V.pose; V.pose = (ids, cls, step = 150) => { p0(ids, cls, step); ids.forEach((id, i) => setTimeout(() => play(id, cls), reduced() ? 0 : i * step)); }; }
  }
  // o palco aparece/redesenha: acorda o loop
  new MutationObserver(() => L.kick()).observe(document.body, { childList: true });
})(globalThis);

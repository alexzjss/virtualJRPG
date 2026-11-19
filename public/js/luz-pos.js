// ===== pós de tela do motor luminoso: bloom, onda de choque, aberração cromática, linhas de velocidade e flash invertido =====
// A cena do luz.js vai para um framebuffer; o bloom roda em 1/2 (Alta) ou 1/4 (Média) da resolução, com limiar e blur separável;
// a composição final distorce (choque), separa RGB (aberração) e risca linhas radiais. Só compõe enquanto há efeito no ar ou pulso ativo.
// O flash invertido é um véu DOM com mix-blend-mode:difference (inverte a tela toda, inclusive o cenário; sem filter em camada 3D).
(g => {
  const L = g.LUZ, LP = g.LUZP; if (!L?.gl) return;
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const VS = `#version 300 es
  layout(location=0) in vec2 aP; out vec2 vUv; void main(){ vUv = aP * .5 + .5; gl_Position = vec4(aP, 0., 1.); }`;
  const BRIGHT = `#version 300 es
  precision mediump float; in vec2 vUv; uniform sampler2D uT; out vec4 o;
  void main(){ vec4 c = texture(uT, vUv); float l = max(c.r, max(c.g, c.b)); o = c * smoothstep(.55, .95, l); }`;
  const BLUR = `#version 300 es
  precision mediump float; in vec2 vUv; uniform sampler2D uT; uniform vec2 uD; out vec4 o;
  void main(){ vec4 s = texture(uT, vUv) * .227;
    s += (texture(uT, vUv + uD * 1.385) + texture(uT, vUv - uD * 1.385)) * .316;
    s += (texture(uT, vUv + uD * 3.231) + texture(uT, vUv - uD * 3.231)) * .07; o = s; }`;
  const COMP = `#version 300 es
  precision highp float; in vec2 vUv; uniform sampler2D uScene, uBloom; uniform vec4 uShock[4]; uniform float uAsp, uChroma, uBloomK, uSpeed, uTime, uHasBloom; uniform vec2 uSpeedC; out vec4 o;
  float hash(float n){ return fract(sin(n) * 43758.5453); }
  void main(){
    vec2 uv = vUv; float ring = 0.;
    for (int i = 0; i < 4; i++) { vec4 s = uShock[i]; if (s.w <= 0.) continue; vec2 d = uv - s.xy; d.x *= uAsp; float dist = length(d), w = s.w * exp(-pow((dist - s.z) / .035, 2.));
      vec2 n = dist > 0. ? d / dist : vec2(0.); n.x /= uAsp; uv -= n * w * .035; ring += w; }
    vec2 off = (uv - .5) * uChroma * .014;
    vec4 c = texture(uScene, uv), cr = texture(uScene, uv + off), cb = texture(uScene, uv - off);
    vec3 col = vec3(cr.r, c.g, cb.b); float a = max(c.a, max(cr.a, cb.a));
    if (uHasBloom > .5) { vec3 b = texture(uBloom, vUv).rgb * uBloomK; col += b; a = max(a, min(1., max(b.r, max(b.g, b.b)))); }
    col += vec3(ring * .35); a = max(a, ring * .35);
    if (uSpeed > 0.) { vec2 p = vUv - uSpeedC; p.x *= uAsp; float ang = atan(p.y, p.x), r = length(p), id = floor(ang * 70.), ln = step(.93, hash(id + floor(uTime * 18.))) * smoothstep(.22, .75, r) * uSpeed;
      ln *= smoothstep(0., .5, fract(ang * 70.)) * smoothstep(1., .5, fract(ang * 70.)); col += vec3(ln * .9); a = max(a, ln * .9); }
    o = vec4(col, clamp(a, 0., 1.));
  }`;
  let quad, P = {}, fbo, sceneTex, bl = [], W = 0, H = 0, BW = 0, BH = 0, bfrac = 0;
  const compile = (gl, t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const program = (gl, fs, names) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = { p }; for (const n of names) u[n] = gl.getUniformLocation(p, n); return u; };
  const mkTex = (gl, w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f }; };
  const free = gl => { if (sceneTex) { gl.deleteTexture(sceneTex); gl.deleteFramebuffer(fbo); } for (const b of bl) { gl.deleteTexture(b.t); gl.deleteFramebuffer(b.f); } sceneTex = null; bl = []; W = H = 0; };
  function setup(gl) {
    sceneTex = null; bl = []; W = H = 0;
    P.bright = program(gl, BRIGHT, ['uT']); P.blur = program(gl, BLUR, ['uT', 'uD']);
    P.comp = program(gl, COMP, ['uScene', 'uBloom', 'uShock', 'uAsp', 'uChroma', 'uBloomK', 'uSpeed', 'uTime', 'uHasBloom', 'uSpeedC']);
    quad = gl.createVertexArray(); gl.bindVertexArray(quad); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
  }
  function sizeTo(gl) { const cw = L.canvas.width, ch = L.canvas.height, bf = LP.budget(g.ANIMFX.level()).bloom;
    if (cw === W && ch === H && bf === bfrac) return; free(gl); W = cw; H = ch; bfrac = bf;
    const s = mkTex(gl, W, H); sceneTex = s.t; fbo = s.f;
    if (bf > 0) { BW = Math.max(1, Math.round(W * bf)); BH = Math.max(1, Math.round(H * bf)); bl = [mkTex(gl, BW, BH), mkTex(gl, BW, BH)]; } }
  // ----- pulsos -----
  const pulses = []; // { kind, x, y (px CSS), t0, strength, dir }
  const now = () => typeof g.CENA !== 'undefined' ? g.CENA.now() : performance.now();
  let inv = null;
  function invertFlash() { if (L.settings?.flashes === false || reduced()) return; inv?.remove(); inv = document.createElement('i'); inv.className = 'luz-invert'; document.body.append(inv); const el = inv; setTimeout(() => el.remove(), 70); }
  const fire = (kind, o = {}) => { if (!L.active() || reduced() || !LP.budget(g.ANIMFX.level()).post) return;
    if (kind === 'invert') return invertFlash();
    pulses.push({ kind, x: o.x ?? L.W / 2, y: o.y ?? L.H / 2, t0: now(), strength: o.strength ?? 1, dir: o.dir || 0 }); if (pulses.length > 12) pulses.shift(); L.kick(); };
  const live = t => { for (let i = pulses.length - 1; i >= 0; i--) if (t - pulses[i].t0 > LP.PULSE[pulses[i].kind]) pulses.splice(i, 1); return pulses.length > 0; };
  // ----- integração com o quadro do luz.js -----
  let composing = false;
  const begin = (t) => { const gl = L.gl, on = LP.budget(g.ANIMFX.level()).post && !reduced() && (live(t) || L.fxBusy());
    composing = on; if (!on) return false;
    sizeTo(gl); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, W, H); return true; };
  const end = t => { if (!composing) return false; const gl = L.gl; gl.disable(gl.BLEND); gl.bindVertexArray(quad);
    const hasB = bl.length === 2;
    if (hasB) { gl.bindFramebuffer(gl.FRAMEBUFFER, bl[0].f); gl.viewport(0, 0, BW, BH); gl.useProgram(P.bright.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneTex); gl.uniform1i(P.bright.uT, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.useProgram(P.blur.p); gl.uniform1i(P.blur.uT, 0);
      for (let k = 0; k < 2; k++) { gl.bindFramebuffer(gl.FRAMEBUFFER, bl[1].f); gl.bindTexture(gl.TEXTURE_2D, bl[0].t); gl.uniform2f(P.blur.uD, (1 + k) / BW, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bl[0].f); gl.bindTexture(gl.TEXTURE_2D, bl[1].t); gl.uniform2f(P.blur.uD, 0, (1 + k) / BH); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); } }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, L.canvas.width, L.canvas.height);
    gl.useProgram(P.comp.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneTex); gl.uniform1i(P.comp.uScene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, hasB ? bl[0].t : sceneTex); gl.uniform1i(P.comp.uBloom, 1); gl.activeTexture(gl.TEXTURE0);
    const sh = new Float32Array(16); let si = 0, chroma = 0, bloom = 0, speed = 0, sc = [.5, .5];
    for (const p of pulses) { const v = LP.pulse(p.kind, t - p.t0, p.strength); if (!v) continue;
      if (p.kind === 'shock' && si < 4) { const u = (t - p.t0) / LP.PULSE.shock; sh.set([p.x / L.W, 1 - p.y / L.H, .02 + u * .32 * Math.min(1.6, p.strength + .4), v], si * 4); si++; }
      else if (p.kind === 'chroma') chroma = Math.max(chroma, v); else if (p.kind === 'bloom') bloom = Math.max(bloom, v);
      else if (p.kind === 'speed') { speed = Math.max(speed, v); sc = [p.x / L.W, 1 - p.y / L.H]; } }
    gl.uniform4fv(P.comp.uShock, sh); gl.uniform1f(P.comp.uAsp, L.W / Math.max(1, L.H)); gl.uniform1f(P.comp.uChroma, chroma); gl.uniform1f(P.comp.uBloomK, .55 + bloom * 1.4);
    gl.uniform1f(P.comp.uSpeed, speed); gl.uniform2f(P.comp.uSpeedC, sc[0], sc[1]); gl.uniform1f(P.comp.uTime, t / 1000); gl.uniform1f(P.comp.uHasBloom, hasB ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null); gl.enable(gl.BLEND);
    return pulses.length > 0; };
  L.onSetup.push(setup); setup(L.gl);
  L.post = { begin, end };
  L.pos = { fire };
})(globalThis);

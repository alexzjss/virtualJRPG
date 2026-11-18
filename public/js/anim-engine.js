// Motor visual procedural do combate.
// Cada técnica recebe um perfil determinístico: família, paleta, origem, trajetória e impacto.
// Estilo pintado: formas chapadas com contorno de tinta, sem blur nem modo aditivo.
// Cada elemento tem uma forma-assinatura (chama, gota, rocha, raio...) e os efeitos se ancoram no chão sob os personagens.
// O canvas vive fora de #app para sobreviver aos redesenhos de estado, como a camada de coreografia.
(() => {
  const g = globalThis, TAU = Math.PI * 2;
  const cvs = document.createElement('canvas'); cvs.className = 'animfx-canvas'; cvs.setAttribute('aria-hidden', 'true'); document.body.append(cvs);
  const ctx = cvs.getContext('2d', { alpha: true, desynchronized: true });
  const ELS = g.ANIM_PROFILES.PALETTES;
  const defaults = { quality: localStorage.getItem('vj_anim_quality') || 'auto', speed: +(localStorage.getItem('vj_anim_speed') || 1), flashes: localStorage.getItem('vj_anim_flash') !== '0' };
  let dpr = 1, W = 0, H = 0, raf = 0, last = 0, fps = 60, autoLow = false, effects = [], persist = [], seq = 0, mA = 1;
  const clockNow = () => typeof g.CENA !== 'undefined' ? g.CENA.now() : performance.now(); // tempo virtual: hitstop e câmera lenta valem para o canvas
  const later = ms => typeof g.CENA !== 'undefined' ? g.CENA.wait(ms) : new Promise(res => setTimeout(res, ms));
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const rnd = n => { n |= 0; n = Math.imul(n ^ n >>> 16, 0x21f0aaad); n = Math.imul(n ^ n >>> 15, 0x735a2d97); return ((n ^ n >>> 15) >>> 0) / 4294967296; };
  const unit = id => document.querySelector(`.p3d .bb[data-tgt="${CSS.escape(id || '')}"]`) || document.querySelector(`.stage .unit[data-tgt="${CSS.escape(id || '')}"]`) || document.querySelector(`.tok[data-id="${CSS.escape(id || '')}"]`);
  const rect = id => unit(id)?.getBoundingClientRect();
  const point = (id, r, anchor = 'core') => { if (!r) return { x: W / 2, y: H / 2 }; const el = unit(id), k = el?.dataset.kind || 'f', saved = g.S?.chars?.[id]?.fxK?.[k]?.[anchor], A = saved ? [saved.x, saved.y] : ({ hand: [.64, .42], weapon: [.72, .46], head: [.5, .18], feet: [.5, .9], core: [.5, .48], eyes: [.5, .24] }[anchor] || [.5, .48]); return { x: r.left + r.width * A[0], y: r.top + r.height * A[1] }; };
  const targetPoint = r => r ? { x: r.left + r.width * .5, y: r.top + r.height * .43 } : { x: W * .65, y: H * .48 };
  const footPoint = r => r ? { x: r.left + r.width * .5, y: r.bottom - r.height * .04 } : { x: W * .65, y: H * .62 };
  const scaleOf = r => r ? clamp(r.height / 210, .45, 1.6) : 1;
  const skillByName = n => Object.values(g.S?.skills || {}).find(s => s.name === n);
  const qLevel = () => defaults.quality === 'low' || autoLow ? .45 : defaults.quality === 'medium' ? .72 : 1;
  const NOTE = { kagutsuchi: 165, susanoo: 294, atlas: 110, indra: 440, fuhaku: 392, amaterasu: 659, tsukuyomi: 139, shukketsu: 196, hiruko: 247, aura: 523, oculto: 104, fis: 147 };
  const resize = () => { const n = Math.min(qLevel() < .6 ? 1 : 2, devicePixelRatio || 1), w = innerWidth, h = innerHeight; if (w === W && h === H && n === dpr) return; W = w; H = h; dpr = n; cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); cvs.style.width = W + 'px'; cvs.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  addEventListener('resize', resize); resize();

  const familyOf = (s, f = {}) => g.ANIM_PROFILES.familyOf(s, f);
  const profile = (s, f = {}) => g.ANIM_PROFILES.profile(s, f, { speed: defaults.speed, reduced: reduced() });

  const pathPoint = (a, b, t, curve, side = 1) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, cx = mx - dy / L * curve * side, cy = my + dx / L * curve * side, u = 1 - t; return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }; };
  const ang = (p, q) => Math.atan2(q.y - p.y, q.x - p.x);
  const INK = 'rgba(14,8,20,.85)';
  const paint = (fill, a = 1, w = 2) => { ctx.globalAlpha = clamp(a) * mA; ctx.fillStyle = fill; ctx.fill(); if (w > 0) { ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); } ctx.globalAlpha = 1; };
  const stroke = (c, w, a = 1) => { ctx.globalAlpha = clamp(a) * mA; ctx.lineWidth = w; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 1; };
  const poly = pts => { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); };
  const at = (p, an, s, fn) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(an); ctx.scale(s, s); fn(); ctx.restore(); };
  const ell = (p, rx, ry) => { ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(.5, rx), Math.max(.5, ry), 0, 0, TAU); };
  const star = (n, R, r) => { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, d = i % 2 ? r : R; ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); } ctx.closePath(); };

  // Forma-assinatura de cada elemento, em coordenadas locais (~raio 10, apontando para +x).
  const MOTIF = {
    kagutsuchi(c, t) { const w = Math.sin(t * 40) * 1.5; ctx.beginPath(); ctx.moveTo(12, 0); ctx.quadraticCurveTo(0, -10, -14, -3 + w); ctx.quadraticCurveTo(-6, 0, -14, 3 - w); ctx.quadraticCurveTo(0, 10, 12, 0); paint(c[0]); ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(1, -5, -7, 0); ctx.quadraticCurveTo(1, 5, 9, 0); paint(c[1], 1, 0); ctx.beginPath(); ctx.arc(6, 0, 2.5, 0, TAU); paint(c[2], 1, 0); },
    susanoo(c) { ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(0, -9, 8, -7); ctx.arc(8, 0, 7, -Math.PI / 2, Math.PI / 2); ctx.quadraticCurveTo(0, 9, -14, 0); paint(c[0]); ctx.beginPath(); ctx.arc(9, -2.5, 2.5, 0, TAU); paint(c[2], .9, 0); },
    atlas(c, t, sd) { const pts = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6, d = 7 + rnd(sd + i) * 5; pts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d }); } poly(pts); paint(c[0]); poly([pts[0], pts[1], pts[2], { x: 0, y: 0 }]); paint(c[1], .9, 0); },
    indra(c) { poly([{ x: 14, y: -2 }, { x: 2, y: -9 }, { x: 3, y: -2 }, { x: -14, y: 2 }, { x: -2, y: 9 }, { x: -3, y: 2 }]); paint(c[1]); poly([{ x: 9, y: -2 }, { x: 3, y: -5 }, { x: 0, y: 0 }, { x: -9, y: 2 }]); paint(c[2], 1, 0); },
    fuhaku(c) { ctx.beginPath(); ctx.arc(0, 0, 11, -.3, Math.PI * 1.2); ctx.arc(-3, -2, 6, Math.PI * 1.2, -.3, true); ctx.closePath(); paint(c[0]); ctx.beginPath(); ctx.arc(2, 2, 5, 0, Math.PI); stroke(c[2], 2.5); },
    amaterasu(c) { star(4, 14, 4); paint(c[0]); star(4, 8, 2.5); paint(c[2], 1, 0); },
    tsukuyomi(c) { ctx.beginPath(); ctx.arc(0, 0, 11, Math.PI * .35, Math.PI * 1.65); ctx.arc(5, 0, 8, Math.PI * 1.55, Math.PI * .45, true); ctx.closePath(); paint(c[1]); ctx.beginPath(); ctx.arc(-6, 0, 2, 0, TAU); paint(c[2], .9, 0); },
    shukketsu(c) { ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(0, -8, 6, -6); ctx.arc(6, 0, 6, -Math.PI / 2, Math.PI / 2); ctx.quadraticCurveTo(0, 8, -13, 0); paint(c[1]); ctx.beginPath(); ctx.arc(7, -2, 2, 0, TAU); paint(c[2], .8, 0); },
    hiruko(c) { ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); paint(c[0]); ctx.beginPath(); ctx.arc(-6, 6, 4, 0, TAU); paint(c[2]); ctx.beginPath(); ctx.arc(-3, -3, 2.6, 0, TAU); paint(c[1], .95, 0); },
    aura(c) { const h = []; for (let i = 0; i < 6; i++) h.push({ x: Math.cos(i * TAU / 6) * 11, y: Math.sin(i * TAU / 6) * 11 }); poly(h); paint(c[0]); poly([h[5], h[0], h[1], { x: 0, y: 0 }]); paint(c[2], .9, 0); },
    oculto(c) { ctx.beginPath(); ctx.arc(-4, 2, 8, 0, TAU); ctx.arc(5, -2, 7, 0, TAU); paint(c[0]); ctx.beginPath(); ctx.ellipse(1, 0, 6, 3, 0, 0, TAU); paint(c[1], 1, 1.2); ctx.beginPath(); ctx.arc(1, 0, 1.8, 0, TAU); paint('#120818', 1, 0); },
    fis(c) { poly([{ x: 13, y: 0 }, { x: -3, y: -8 }, { x: 1, y: 0 }, { x: -3, y: 8 }]); paint(c[1]); }
  };
  const motif = (P, p, s, an, t, sd = 0, a = 1) => { if (a <= 0 || s <= 0) return; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(an); ctx.scale(s, s); mA = clamp(a); (MOTIF[P.el] || MOTIF.fis)(P.palette, t, P.seed + sd); mA = 1; ctx.restore(); };
  // Fita afinada nas pontas (rastro pintado); jag > 0 serrilha a borda (raio).
  function ribbon(pts, w, fill, a = 1, jag = 0, sd = 0) {
    if (pts.length < 2) return; const L = [], R = [];
    pts.forEach((q, i) => { const n = pts[Math.min(i + 1, pts.length - 1)], pv = pts[Math.max(i - 1, 0)], dx = n.x - pv.x, dy = n.y - pv.y, l = Math.hypot(dx, dy) || 1, k = i / (pts.length - 1), ww = w * Math.sin(Math.PI * Math.min(1, .08 + k * .92)) + .5, j = jag ? (rnd(sd + i) - .5) * jag : 0; L.push({ x: q.x - dy / l * (ww + j), y: q.y + dx / l * (ww + j) }); R.push({ x: q.x + dy / l * (ww - j), y: q.y - dx / l * (ww - j) }); });
    poly([...L, ...R.reverse()]); paint(fill, a, 2);
  }
  const samples = (a, b, t0, t1, curve, side, n = 12) => Array.from({ length: n }, (_, i) => pathPoint(a, b, t0 + (t1 - t0) * i / (n - 1), curve, side));
  // Mancha no chão sob o alvo, achatada em perspectiva: ancora o efeito no palco.
  function decal(P, f, s, k, R = 70) { const a = (1 - k) * .55; if (a <= 0) return; const z = .4 + k * .8; ell(f, R * s * z, R * s * .26 * z); paint(P.palette[0], a, 0); ell(f, R * s * z, R * s * .26 * z); stroke(P.palette[1], 2.5, a); }
  function groundRunes(P, f, s, t, R, a = 1) { const rx = R * s, ry = rx * .3; ell(f, rx, ry); stroke(P.palette[1], 3, a); ell(f, rx * .72, ry * .72); stroke(P.palette[1], 1.5, a); for (let i = 0; i < 8; i++) { const u = i * TAU / 8 + t * 3 * (P.seed % 2 ? 1 : -1); ctx.globalAlpha = a; ctx.fillStyle = P.palette[2]; ctx.fillRect(f.x + Math.cos(u) * rx * .86 - 2.5, f.y + Math.sin(u) * ry * .86 - 2.5, 5, 5); } ctx.globalAlpha = 1; }
  // Impacto: estrela de quadrinho + estilhaços do elemento + detalhe próprio do elemento.
  function impact(P, b, f, s, k, n = 7) {
    if (k <= 0 || k >= 1) return; const sd = P.seed, o = 1 - k;
    decal(P, f, s, k);
    if (k < .4) { const z = k / .4; at(b, rnd(sd) * TAU, s * (.5 + z * .9), () => { star(7 + P.tier, 34, 14); paint(P.palette[1], 1 - z); star(7 + P.tier, 18, 7); paint(P.palette[2], 1 - z, 0); }); }
    const count = Math.round((n + P.tier * 2) * qLevel());
    for (let i = 0; i < count; i++) { const a = rnd(sd + i * 13) * TAU, d = (25 + rnd(sd + i * 31) * 55) * s * Math.sqrt(k); motif(P, { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * .7 + k * k * 45 * s }, s * (.55 + rnd(i + sd) * .4) * (1 - k * .7), a, k, i, o); }
    if (P.el === 'indra') for (let j = 0; j < 3; j++) { ctx.beginPath(); let q = { ...b }; ctx.moveTo(q.x, q.y); const a = rnd(sd + j * 5) * TAU; for (let i = 0; i < 5; i++) { q = { x: q.x + Math.cos(a) * 14 * s + (rnd(sd + i + j * 9) - .5) * 18 * s, y: q.y + Math.sin(a) * 14 * s + (rnd(sd + i * 3 + j) - .5) * 18 * s }; ctx.lineTo(q.x, q.y); } stroke(P.palette[2], 3, o); }
    else if (P.el === 'atlas') for (let j = 0; j < 5; j++) { const a = rnd(sd + j) * TAU; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(a) * 60 * s * k, f.y + Math.sin(a) * 16 * s * k); stroke(INK, 2.5, o); }
    else if (P.el === 'susanoo' || P.el === 'shukketsu') for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.ellipse(f.x + j * 22 * s, f.y - 4 * s, 6 * s, Math.max(.5, 34 * s * Math.sin(k * Math.PI)), 0, Math.PI, TAU); stroke(P.palette[1], 4, o); }
    else if (P.el === 'fuhaku') for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(b.x, b.y, (14 + j * 14) * s * (.5 + k), k * 6 + j, k * 6 + j + 2.4); stroke(P.palette[j % 2 ? 2 : 1], 3, o); }
    else if (P.el === 'kagutsuchi') for (let j = 0; j < 5; j++) motif(P, { x: f.x + (rnd(sd + j) - .5) * 70 * s, y: f.y - k * 50 * s - rnd(j) * 20 * s }, s * .8 * o, -Math.PI / 2, k, j, o);
    else if (P.el === 'amaterasu') for (let j = 0; j < 6; j++) { const a = j * TAU / 6 + rnd(sd) ; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * 20 * s, b.y + Math.sin(a) * 20 * s); ctx.lineTo(b.x + Math.cos(a) * (30 + k * 60) * s, b.y + Math.sin(a) * (30 + k * 60) * s); stroke(P.palette[1], 4, o); }
    else if (P.el === 'hiruko' || P.el === 'oculto' || P.el === 'tsukuyomi') for (let j = 0; j < 4; j++) { ell({ x: b.x + (rnd(sd + j) - .5) * 60 * s, y: b.y - k * 30 * s + (rnd(j + 3) - .5) * 30 * s }, 12 * s * (.6 + k), 9 * s * (.6 + k)); paint(P.palette[j % 2], o * .7, 1.5); }
  }
  function note(p, s, c, a) { at(p, 0, s, () => { mA = clamp(a); ctx.beginPath(); ctx.ellipse(0, 6, 6, 4.5, -.4, 0, TAU); paint(c); ctx.globalAlpha = mA; ctx.fillStyle = INK; ctx.fillRect(4.5, -12, 2.2, 18); ctx.beginPath(); ctx.moveTo(6.7, -12); ctx.quadraticCurveTo(14, -8, 11, 0); stroke(INK, 2.2); mA = 1; }); }
  const plus = [{ x: -2.5, y: -8 }, { x: 2.5, y: -8 }, { x: 2.5, y: -2.5 }, { x: 8, y: -2.5 }, { x: 8, y: 2.5 }, { x: 2.5, y: 2.5 }, { x: 2.5, y: 8 }, { x: -2.5, y: 8 }, { x: -2.5, y: 2.5 }, { x: -8, y: 2.5 }, { x: -8, y: -2.5 }, { x: -2.5, y: -2.5 }];

  // Saída: o elemento se junta na mão de quem usa (espiral que converge + círculo nos pés) e dispara com um estouro na boca.
  const TRAVEL = new Set(['projectile', 'beam', 'pierce', 'dash', 'psychic', 'musical']), CH = .3;
  function charge(P, a, fa, sa, c, t) {
    if (c <= 0 || c >= 1) return; const n = Math.round(5 * qLevel()) + P.tier;
    groundRunes(P, fa, sa, t, 26 + c * 14, .4 + c * .5);
    for (let i = 0; i < n; i++) { const u = i * TAU / n + c * 5 * (P.seed % 2 ? 1 : -1), r = (1 - c) * 55 * sa; motif(P, { x: a.x + Math.cos(u) * r, y: a.y + Math.sin(u) * r * .7 }, sa * (.45 + c * .3), u + Math.PI, t, i, .4 + c * .6); }
    motif(P, a, sa * (.4 + c * 1), -Math.PI / 2 + c * 3, t, 99, c);
  }
  function muzzle(P, a, b, sa, m) {
    if (m <= 0 || m >= 1) return; const an = ang(a, b), o = 1 - m;
    at(a, an, sa * (.6 + m * .8), () => { star(5, 22, 8); paint(P.palette[1], o); star(5, 11, 4); paint(P.palette[2], o, 0); });
    for (let i = -1; i <= 1; i++) { const u = an + Math.PI + i * .5, r0 = 18 * sa, r1 = (24 + m * 50) * sa; ctx.beginPath(); ctx.moveTo(a.x + Math.cos(u) * r0, a.y + Math.sin(u) * r0); ctx.lineTo(a.x + Math.cos(u) * r1, a.y + Math.sin(u) * r1); stroke(P.palette[0], 3 * sa, o); }
  }
  const inOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function drawOne(e, now) {
    const P0 = e.profile, t0 = clamp((now - e.start) / P0.duration), travels = TRAVEL.has(P0.family), z0 = clamp(t0 / P0.impact), trv = travels ? clamp((z0 - CH) / (1 - CH)) : z0;
    if (travels) { ctx.save(); charge(P0, e.from, e.footA, e.sa, clamp(z0 / CH), t0); muzzle(P0, e.from, e.to, e.sa, clamp(trv / .3)); ctx.restore(); if (z0 < CH) return; }
    const P = e.profile, t = t0, ease = travels ? inOut(trv) : 1 - Math.pow(1 - z0, 3), a = e.from, b = e.to, fa = e.footA, fb = e.footB, sa = e.sa, s = e.sb, curve = 30 + rnd(P.seed + 8) * 60, side = P.seed % 2 ? 1 : -1, k = clamp((t - P.impact) / Math.max(.01, 1 - P.impact)), pre = t < P.impact, fam = P.family;
    if (t <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    if (fam === 'projectile') {
      if (pre) { ribbon(samples(a, b, clamp(ease - .3), ease, curve, side), 7 * s * (1 + P.tier * .25), P.palette[0], .9); const q = pathPoint(a, b, ease, curve, side); motif(P, q, s * (1.3 + P.tier * .3), ang(pathPoint(a, b, clamp(ease - .05), curve, side), q), t); }
      impact(P, b, fb, s, k);
    } else if (fam === 'beam') {
      const grow = clamp(trv / .35), fade = t < .7 ? 1 : (1 - t) / .3, end = pathPoint(a, b, grow, 0, 1), jag = P.el === 'indra' ? 12 * s : 0, sd = Math.floor(t * 20);
      ribbon(samples(a, end, 0, 1, 0, 1, 14), (9 + P.tier * 4) * s, P.palette[0], fade, jag, sd); ribbon(samples(a, end, 0, 1, 0, 1, 14), (3.5 + P.tier * 1.5) * s, P.palette[2], fade, jag * .5, sd + 3);
      for (let i = 0; i < Math.round(4 * qLevel()); i++) { const u = (t * 2.2 + i / 4) % 1; if (u < grow) motif(P, pathPoint(a, b, u, 0, 1), s * .8, ang(a, b), t, i, fade); }
      impact(P, b, fb, s, clamp((t - P.impact * (CH + (1 - CH) * .35)) / (1 - P.impact * .55)), 5);
    } else if (fam === 'slash') {
      const hits = Math.max(1, Math.min(3, P.hits)), base = rnd(P.seed) * 1.2 - .6;
      for (let h = 0; h < hits; h++) { const z = clamp((t - (P.impact - .2 + h * .1)) / .22); if (z <= 0 || z >= 1) continue; const R = (55 + P.tier * 10) * s, a0 = base + h * 1.1 + Math.PI * .9, sw = Math.PI * 1.1, a1 = a0 + sw * Math.min(1, z * 1.6), a2 = a0 + sw * Math.max(0, z * 1.6 - .6), m = (a1 + a2) / 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, R, a2, a1); ctx.arc(b.x + Math.cos(m) * 12 * s, b.y + Math.sin(m) * 12 * s, R * .82, a1, a2, true); ctx.closePath(); paint(P.palette[1], 1 - z * .5); ctx.beginPath(); ctx.arc(b.x, b.y, R * .96, a2, a1); stroke(P.palette[2], 2.5 * s, 1 - z); }
      impact(P, b, fb, s, k, 6);
    } else if (fam === 'pierce') {
      if (pre || k < .3) { const tip = pathPoint(a, b, Math.min(1, ease * 1.05), 0, 1), tail = pathPoint(a, b, clamp(ease - .45), 0, 1), an = ang(a, b), w = (5 + P.tier * 2) * s; poly([tip, { x: tail.x - Math.sin(an) * w, y: tail.y + Math.cos(an) * w }, { x: tail.x + Math.sin(an) * w, y: tail.y - Math.cos(an) * w }]); paint(P.palette[1], pre ? 1 : 1 - k / .3); motif(P, tip, s, an, t); }
      impact(P, b, fb, s, k, 5);
    } else if (fam === 'smash' || fam === 'dash') {
      if (pre) { if (fam === 'dash') for (let i = 0; i < 4; i++) motif(P, pathPoint(a, b, clamp(ease - i * .1), 40, side), s * (1.4 - i * .25), ang(a, b), t, i, .9 - i * .2);
        else { const q = { x: b.x, y: b.y - (1 - ease) * 120 * s }; ribbon([{ x: q.x, y: q.y - 60 * s }, { x: q.x, y: q.y - 30 * s }, q], 10 * s, P.palette[0], .85); motif(P, q, s * (1.6 + P.tier * .3), Math.PI / 2, t); } }
      impact(P, b, fb, s, k, 9); if (k > 0 && k < .5) { ell(fb, 90 * s * k * 2, 24 * s * k * 2); stroke(P.palette[2], 4, 1 - k * 2); }
    } else if (fam === 'area' || fam === 'rain') {
      const z = clamp(t / P.impact), fade = t < .8 ? 1 : (1 - t) / .2; groundRunes(P, fb, s, t, 70 + z * 30, fade * .9);
      for (let i = 0; i < Math.round(8 * qLevel()); i++) { const off = (rnd(P.seed + i) - .5) * 150 * s, d = rnd(i * 7 + P.seed) * .3;
        if (fam === 'rain') { const u = clamp((t - d) / P.impact); if (u > 0 && u < 1) motif(P, { x: fb.x + off + (1 - u) * 30 * s, y: fb.y - (1 - u) * 260 * s }, s * 1.1, Math.PI * .58, t, i); }
        else { const u = clamp((t - P.impact * .5 - d * .5) / .4); if (u > 0 && u < 1) motif(P, { x: fb.x + off, y: fb.y - Math.sin(u * Math.PI) * 70 * s }, s * 1.1, -Math.PI / 2, t, i, 1 - u * .5); } }
      impact(P, b, fb, s, k, 6);
    } else if (fam === 'ritual' || fam === 'summon') {
      const z = clamp(t / P.impact), fade = t < .85 ? 1 : (1 - t) / .15; groundRunes(P, fa, sa, t, 40 + z * 25, fade * (pre ? 1 : .5)); if (!pre || z > .6) groundRunes(P, fb, s, t, 60, fade);
      if (fam === 'summon' && z > .5) motif(P, { x: fb.x, y: fb.y - clamp((t - P.impact * .7) / .3) * 90 * s }, s * 2.4, -Math.PI / 2, t, 0, fade);
      impact(P, b, fb, s, k, 6);
    } else if (fam === 'heal' || fam === 'barrier' || fam === 'form') {
      const self = fam === 'form', c = self ? a : b, f = self ? fa : fb, sc = self ? sa : s, z = clamp(t / P.impact), fade = t < .75 ? 1 : (1 - t) / .25, R = 55 * sc * (.5 + z * .5);
      ell(f, R, R * .29); paint(P.palette[0], .35 * fade, 0); ell(f, R, R * .29); stroke(P.palette[1], 3, fade);
      if (fam === 'barrier') for (let i = 0; i < 5; i++) { const u = Math.PI + (i + .5) * Math.PI / 5, q = { x: c.x + Math.cos(u) * 55 * sc, y: c.y + Math.sin(u) * 50 * sc + 20 * sc }, hz = clamp(z * 1.4 - i * .08); if (hz <= 0) continue; const h = []; for (let j = 0; j < 6; j++) h.push({ x: q.x + Math.cos(j * TAU / 6) * 14 * sc * hz, y: q.y + Math.sin(j * TAU / 6) * 14 * sc * hz }); poly(h); paint(P.palette[1], .55 * fade, 2); }
      for (let i = 0; i < Math.round(7 * qLevel()); i++) { const u = (t * 1.4 + rnd(P.seed + i)) % 1, q = { x: f.x + (rnd(P.seed + i * 3) - .5) * 80 * sc, y: f.y - u * 110 * sc };
        if (fam === 'heal') at(q, 0, sc * (1 - u * .5), () => { poly(plus); paint(P.palette[i % 2 ? 2 : 1], (1 - u) * fade, 1.5); }); else motif(P, q, sc * .8 * (1 - u * .4), -Math.PI / 2, t, i, (1 - u) * fade); }
    } else if (fam === 'psychic' || fam === 'musical') {
      const n = fam === 'musical' ? 5 : 3;
      for (let i = 0; i < n; i++) { const u = clamp(trv * 1.25 - i * .1); if (u <= 0 || u >= 1) continue; const q = pathPoint(a, b, u, curve * .5, side);
        if (fam === 'musical') note({ x: q.x, y: q.y + Math.sin(u * 12 + i) * 12 * s }, s * 1.2, P.palette[i % 3], 1 - Math.max(0, u - .85) / .15);
        else at(q, ang(a, b), s * (.6 + u * .8), () => { ctx.beginPath(); ctx.ellipse(0, 0, 8, 22, 0, -Math.PI / 2, Math.PI / 2); stroke(P.palette[i % 2 ? 2 : 1], 4, 1 - u); }); }
      impact(P, b, fb, s, k, 4);
    }
    ctx.restore();
  }
  function drawPersistent(now) {
    if (reduced() || qLevel() < .5) return;
    for (const p of persist) { const r = rect(p.id); if (!r) continue; const f = footPoint(r), sc = scaleOf(r), t = now / 1000, col = ELS[p.el]?.[1] || '#ffffff';
      const ringAt = (R, c, a) => { ell(f, R * sc, R * sc * .28); stroke(c, 2.5, a); };
      if (p.form) ringAt(38 + Math.sin(t * 3) * 3, col, .5);
      p.states.slice(0, 3).forEach((s, j) => { const pc = ELS[p.el] || ELS.fis, a = t * (.9 + j * .2) + j * 2.1; ell({ x: f.x + Math.cos(a) * 34 * sc, y: f.y + Math.sin(a) * 9 * sc }, 3 * sc, 2 * sc); paint(pc[j % 3], .7, 0); });
    }
  }
  function frame(now) {
    raf = 0; resize(); if (last) { const inst = 1000 / Math.max(1, now - last); fps = fps * .94 + inst * .06; if (defaults.quality === 'auto') autoLow = fps < 43 ? true : fps > 56 ? false : autoLow; } last = now;
    const vt = clockNow(); ctx.clearRect(0, 0, W, H); drawPersistent(vt);
    effects = effects.filter(e => { drawOne(e, vt); return vt < e.start + e.profile.duration; });
    extras = extras.filter(x => { const k = clamp((vt - x.start) / x.dur); x.draw(k); return k < 1; });
    if (effects.length || persist.length || extras.length) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function play({ actorId, targetIds = [], skill, fx = {}, delay = 0 } = {}) {
    const aid = actorId || fx.a, P = profile(skill || skillByName(fx.s), fx), ar = rect(aid), a = point(aid, ar, P.origin), ids = [...new Set(targetIds.filter(Boolean))], targets = ids.length ? ids : [fx.id].filter(Boolean), start = clockNow() + delay;
    try { if (typeof tone === 'function') { const f = NOTE[P.el] || 220, beam = P.family === 'beam' || P.family === 'ritual'; tone(f, Math.min(.5, P.duration / 1000), { type: beam ? 'sawtooth' : P.family === 'heal' ? 'sine' : 'triangle', to: beam ? f * 2 : P.family === 'projectile' ? f * 1.5 : 0, g: .035 + P.tier * .012 }); if (['smash', 'area', 'rain'].includes(P.family) && typeof thud === 'function') thud(.18, 180 + P.tier * 90, .16 + P.tier * .05, 'lowpass', P.duration * P.impact / 1000); } } catch {}
    const list = (targets.length ? targets : ['']).map((id, i) => { const tr = rect(id), b = targetPoint(tr), p = { ...P, seed: P.seed + i * 997, duration: P.duration + i * 40 }; return { id: ++seq, start: start + i * 40, from: a, to: b, footA: footPoint(ar), footB: footPoint(tr), sa: scaleOf(ar), sb: scaleOf(tr), profile: p }; });
    effects.push(...list); kick();
    const impactMs = Math.round(P.duration * P.impact + delay), doneMs = Math.round(P.duration + delay);
    return { profile: P, impact: later(impactMs), done: later(doneMs) };
  }
  // efeitos avulsos (faísca do parry, tinta do KO): desenho por fração k de 0 a 1
  let extras = [];
  const extra = (dur, draw) => { extras.push({ start: clockNow(), dur, draw }); kick(); };
  function sparks(x, y, color = '#ffd36a', n = 14) { if (reduced()) return; const sd = ++seq * 13;
    extra(260, k => { for (let i = 0; i < n; i++) { const a = i * TAU / n + rnd(sd + i) * .5, d0 = 8 + k * 70 * (.6 + rnd(sd + i + 50) * .6), d1 = d0 + 18 * (1 - k); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); stroke(i % 3 ? color : '#fff', 3.5 * (1 - k) + .5, 1 - k * .8); } }); }
  function ink(r, color = '#e4002b', ms = 900) { if (!r || !r.width) return; const sd = ++seq * 7, n = 12, cx = r.left + r.width / 2, sc = clamp(r.height / 300, .4, 2);
    extra(reduced() ? 260 : ms, k => { for (let i = 0; i < n; i++) { const y = r.top + r.height * (i + .5) / n - 40 * k * rnd(sd + i + 5), len = r.width * (.4 + rnd(sd + i + 9) * .5) * (.3 + k), x0 = cx + (rnd(sd + i) - .5) * r.width * .4 + (rnd(sd + i + 3) - .5) * 160 * k;
      ribbon([{ x: x0 - len / 2, y }, { x: x0, y: y - 6 }, { x: x0 + len / 2, y: y + 3 }], 10 * (1 - k * .7) * sc, i % 2 ? color : INK, 1 - k, 0, sd + i); } }); }
  function sync() {
    const B = g.S?.battle; if (!B?.active) { persist = []; return; }
    persist = Object.values(g.S.chars || {}).filter(c => c.id in B.ticks && c.hp > 0).map(c => ({ id: c.id, el: typeof g.mainEl === 'function' ? g.mainEl(c) : 'fis', shield: !!c.shield, form: !!c.form, states: Object.keys(c.st || {}) })); kick();
  }
  function flash(color = '#fff', ms = 100) { if (!defaults.flashes || reduced()) return; const e = document.createElement('i'); e.className = 'animfx-flash'; e.style.cssText = `--af:${color};--ad:${ms}ms`; document.body.append(e); setTimeout(() => e.remove(), ms + 80); }
  const setQuality = v => { if (!['auto', 'low', 'medium', 'high'].includes(v)) return; defaults.quality = v; localStorage.setItem('vj_anim_quality', v); resize(); kick(); };
  const setSpeed = v => { defaults.speed = clamp(+v || 1, .5, 2); localStorage.setItem('vj_anim_speed', defaults.speed); };
  const setFlashes = v => { defaults.flashes = !!v; localStorage.setItem('vj_anim_flash', v ? '1' : '0'); };
  g.ANIMFX = { sparks, ink, play, profile, sync, flash, setQuality, setSpeed, setFlashes, settings: defaults, familyOf, palette: ELS };
})();

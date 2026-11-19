// ===== efeitos das skills no motor luminoso: 15 famílias em quatro fases × 12 materiais de luz =====
// carga (círculo mágico com o glifo do elemento nos pés + luz que converge) → disparo (clarão na boca) → trajeto (núcleo branco,
// corpo na cor do elemento, rastro do material) → impacto (clarão, anel de choque deitado, estilhaços de luz, mancha no chão e resíduo).
// Posições relidas a cada quadro (e.from(), e.to()...): a câmera do palco anda durante o golpe e o efeito acompanha.
(g => {
  const L = g.LUZ, LP = g.LUZP; if (!L) return;
  const TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const rnd = n => { n |= 0; n = Math.imul(n ^ n >>> 16, 0x21f0aaad); n = Math.imul(n ^ n >>> 15, 0x735a2d97); return ((n ^ n >>> 15) >>> 0) / 4294967296; };
  const easeOut = x => 1 - Math.pow(1 - x, 3), inOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const q = () => (g.ANIMFX?.level?.() === 'high' ? 1 : .6);
  const bez = (a, b, t, curve, side) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, cx = mx - dy / l * curve * side, cy = my + dx / l * curve * side, u = 1 - t; return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }; };
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  // ----- blocos -----
  const S = o => L.sprite(o);
  const glow = (p, size, color, alpha = 1, layer = 1) => S({ x: p.x, y: p.y, size, color, alpha, tex: 'glow', layer });
  const core = (p, size, alpha = 1) => S({ x: p.x, y: p.y, size, color: '#ffffff', alpha, tex: 'core' });
  // círculo mágico deitado no chão: dois anéis e o glifo girando em sentidos opostos
  function circle(p, R, M, k, t, alpha = 1, dirn = 1) { if (alpha <= 0) return; const a = alpha * clamp(k * 3);
    S({ x: p.x, y: p.y, size: R, flat: .3, rot: t * .9 * dirn, color: M.rim, alpha: a, tex: M.glyph, layer: 0 });
    S({ x: p.x, y: p.y, size: R * 1.18, flat: .3, rot: -t * .5 * dirn, color: M.core, alpha: a * .55, tex: 'ringThin', layer: 0 });
    S({ x: p.x, y: p.y, size: R * 1.1, flat: .3, color: M.rim, alpha: a * .35, tex: 'glow', layer: 0 }); }
  const motionOf = (M, p, s, i, n, spd = 1, o = {}) => { // uma partícula do material (sai de p)
    const an = i / n * TAU + Math.random() * .6, v = (120 + Math.random() * 220) * spd * s, col = i % 3 ? M.rim : M.core;
    switch (M.motion) {
      case 'rise': return { x: p.x + (Math.random() - .5) * 30 * s, y: p.y, vx: Math.cos(an) * v * .4, vy: -v * .8 - 80 * s, grav: -160 * s, drag: 1.6, life: 700 + Math.random() * 500, size: 26 * s, size1: 4, tex: 'flame', color: col, ...o };
      case 'bubble': case 'acid': return { x: p.x, y: p.y, vx: Math.cos(an) * v * .7, vy: Math.sin(an) * v * .5 - 60 * s, grav: M.motion === 'acid' ? -60 * s : -30 * s, drag: 2.2, life: 800 + Math.random() * 500, size: (M.motion === 'acid' ? 9 : 14) * s, size1: 22 * s, tex: 'bubble', color: col, ...o };
      case 'arc': return { x: p.x, y: p.y, vx: Math.cos(an) * v * 3, vy: Math.sin(an) * v * 3, drag: 7, life: 220 + Math.random() * 200, size: 26 * s, size1: 6, rot: an, tex: 'spark', sx: 2.6, sy: .7, color: i % 2 ? '#ffffff' : M.rim, ...o };
      case 'spiral': return { x: p.x + Math.cos(an) * 20 * s, y: p.y + Math.sin(an) * 10 * s, vx: -Math.sin(an) * v * 1.4, vy: Math.cos(an) * v * .6 - 40 * s, drag: 1.8, life: 900 + Math.random() * 400, size: 22 * s, size1: 8, rot: an, spin: 6, tex: 'feather', color: col, ...o };
      case 'burst': return { x: p.x, y: p.y, vx: Math.cos(an) * v * 1.6, vy: Math.sin(an) * v * 1.6, drag: 4, life: 500 + Math.random() * 400, size: 22 * s, size1: 2, rot: an, spin: 3, tex: 'star4', color: col, ...o };
      case 'drift': return { x: p.x, y: p.y, vx: Math.cos(an) * v * .5, vy: Math.sin(an) * v * .35 - 20 * s, drag: 1, life: 1100 + Math.random() * 500, size: 18 * s, size1: 10 * s, rot: an, spin: 1.5, tex: 'crescent', color: col, ...o };
      case 'drip': return { x: p.x, y: p.y, vx: Math.cos(an) * v * 1.1, vy: -Math.abs(Math.sin(an)) * v * 1.2, grav: 1100 * s, drag: .6, life: 600 + Math.random() * 300, size: 14 * s, size1: 6 * s, rot: an, tex: 'drop', color: i % 2 ? M.rim : '#ff8aa0', ...o };
      case 'shard': return { x: p.x, y: p.y, vx: Math.cos(an) * v * 1.4, vy: -Math.abs(Math.sin(an)) * v * 1.6, grav: 1300 * s, drag: .5, life: 600 + Math.random() * 400, size: 16 * s, size1: 10 * s, rot: an, spin: 9, tex: 'shard', color: col, ...o };
      case 'hex': return { x: p.x, y: p.y, vx: Math.cos(an) * v * .8, vy: Math.sin(an) * v * .6, drag: 3, life: 700 + Math.random() * 300, size: 10 * s, size1: 30 * s, rot: an, tex: 'hex', color: col, ...o };
      case 'smoke': return i % 4 ? { x: p.x, y: p.y, vx: Math.cos(an) * v * .5, vy: Math.sin(an) * v * .3 - 50 * s, drag: 1.5, life: 900 + Math.random() * 500, size: 30 * s, size1: 70 * s, rot: an, tex: 'smoke', add: false, alpha: .55, color: '#1a0b25', ...o }
        : { x: p.x, y: p.y, vx: Math.cos(an) * v * .4, vy: -40 * s, drag: 2, life: 800, size: 20 * s, size1: 8 * s, tex: 'eye', color: M.rim, ...o };
      default: return { x: p.x, y: p.y, vx: Math.cos(an) * v * 2, vy: Math.sin(an) * v * 2, drag: 6, life: 260 + Math.random() * 200, size: 24 * s, size1: 5, rot: an, tex: 'spark', sx: 2.4, sy: .6, color: i % 2 ? '#ffffff' : M.rim, ...o };
    } };
  const spray = (M, p, s, n, spd = 1, o) => { n = Math.max(1, Math.round(n)); for (let i = 0; i < n; i++) L.emit(motionOf(M, p, s, i, n, spd, o)); };
  // impacto: clarão, anel deitado, anel vertical, estrela, estilhaços e (raio) arcos
  function impactBurst(e, M, b, f, s, n) {
    L.emit({ x: b.x, y: b.y, life: 180, size: 120 * s, size1: 260 * s, tex: 'glow', color: M.core });
    L.emit({ x: b.x, y: b.y, life: 260, size: 80 * s, size1: 200 * s, tex: 'glow', color: M.rim });
    L.emit({ x: b.x, y: b.y, life: 300, size: 40 * s, size1: 190 * s, tex: 'ring', color: M.core, alpha: .9 });
    L.emit({ x: b.x, y: b.y, life: 360, size: 50 * s, size1: 150 * s, tex: 'star8', rot: rnd(e.profile.seed) * TAU, spin: 2, color: M.rim });
    spray(M, b, s, n, 1.3); spray({ ...M, motion: 'streak' }, b, s, n * .5, 1.6);
    if (g.LUZ.pos) g.LUZ.pos.fire('bloom', { x: b.x, y: b.y, strength: .6 + e.profile.tier * .15 });
    if (g.LUZ.pos && e.profile.tier >= 2) g.LUZ.pos.fire('shock', { x: b.x, y: b.y, strength: .5 + e.profile.tier * .15 });
    e.ground = { t0: e.now, f }; }
  // mancha luminosa no chão + resíduo do elemento (brasas, gelo, poça…) por ~1,2 s
  function groundAfter(e, M, s, t) { const G = e.ground; if (!G) return; const k = (t - G.t0) / 1300; if (k >= 1) return; const f = e.footB();
    S({ x: f.x, y: f.y, size: 90 * s * (1 + k * .4), flat: .3, color: M.rim, alpha: (1 - k) * .55, tex: 'glow', layer: 0 });
    S({ x: f.x, y: f.y, size: 70 * s * (.6 + k), flat: .3, color: M.core, alpha: (1 - k) * .6, tex: 'shock', layer: 0 });
    if (!e.resid && k > .05) { e.resid = true; const R = M.residue, n = Math.round(10 * q());
      for (let i = 0; i < n; i++) { const x = f.x + (Math.random() - .5) * 110 * s, y = f.y + (Math.random() - .5) * 22 * s;
        if (R === 'embers') L.emit({ x, y, vy: -40 - Math.random() * 60, vx: (Math.random() - .5) * 30, grav: -20, life: 1100 + Math.random() * 600, size: 6 * s, size1: 1, tex: 'glow', color: i % 2 ? '#ffb347' : '#ff5a1f' });
        else if (R === 'frost') L.emit({ x, y, life: 1300, size: 14 * s, size1: 10 * s, rot: Math.random() * TAU, tex: 'shard', color: '#c8fff4', alpha: .8, delay: i * 30 });
        else if (R === 'puddle' || R === 'pool') L.emit({ x, y, life: 1200, size: 18 * s, size1: 30 * s, tex: 'glow', color: M.rim, alpha: .6 });
        else if (R === 'mist') L.emit({ x, y, vy: -12, life: 1400, size: 30 * s, size1: 60 * s, tex: 'smoke', add: M.motion !== 'smoke', color: M.motion === 'smoke' ? '#1a0b25' : M.rim, alpha: .4 });
        else if (R === 'dust') L.emit({ x, y, vy: -25, vx: (Math.random() - .5) * 60, drag: 1, life: 1000, size: 22 * s, size1: 46 * s, tex: 'smoke', add: false, color: '#c9a76a', alpha: .35 });
        else if (R === 'light' || R === 'sparks') L.emit({ x, y, vy: -60 - Math.random() * 60, life: 900 + Math.random() * 500, size: 8 * s, size1: 2, tex: 'star4', spin: 4, color: i % 2 ? '#ffffff' : M.rim }); } } }
  // rastro: histórico de pontos da cabeça → fitas que afinam e apagam
  function trail(e, p, w, M, maxN = 10) { const H = e.hist || (e.hist = []); H.push({ x: p.x, y: p.y }); if (H.length > maxN) H.shift();
    for (let i = 1; i < H.length; i++) { const k = i / H.length; L.line(H[i - 1], H[i], w * k, M.rim, k * .9); L.line(H[i - 1], H[i], w * k * .35, '#ffffff', k); } }

  // ----- famílias -----
  const DRAW = {};
  // distância: projétil, perfuração, psíquico e música saem da mão e viajam até o alvo
  DRAW.projectile = (e, M, t, ph, P) => { const a = e.from(), b = e.to(), s = e.sb(), sa = e.sa(), side = P.seed % 2 ? 1 : -1, curve = 40 + rnd(P.seed + 8) * 70;
    chargeAt(e, M, t, ph, a, sa);
    if (t >= ph.travel[0] && t < ph.impact[0]) { const u = inOut((t - ph.travel[0]) / (ph.travel[1] - ph.travel[0])), h = bez(a, b, u, curve, side), sz = (38 + P.tier * 10) * s;
      trail(e, h, sz * .55, M); glow(h, sz * 2.2, M.rim, .8); S({ x: h.x, y: h.y, size: sz * .9, rot: t / 90, color: M.rim, tex: M.tex }); core(h, sz * .7);
      if (Math.random() < .7 * q()) L.emit(motionOf(M, h, s * .6, e.k++, 9, .3)); } };
  DRAW.pierce = (e, M, t, ph, P) => { const a = e.from(), b = e.to(), s = e.sb(), sa = e.sa();
    chargeAt(e, M, t, ph, a, sa);
    if (t >= ph.travel[0] && t < ph.impact[0] + 120) { const u = clamp((t - ph.travel[0]) / (ph.travel[1] - ph.travel[0])), h = lerp(a, b, easeOut(u) * 1.04), tail = lerp(a, b, Math.max(0, easeOut(u) - .4)), an = Math.atan2(b.y - a.y, b.x - a.x), fade = t > ph.impact[0] ? 1 - (t - ph.impact[0]) / 120 : 1;
      L.line(tail, h, (16 + P.tier * 5) * s, M.rim, .9 * fade); L.line(tail, h, (6 + P.tier * 2) * s, '#ffffff', fade); S({ x: h.x, y: h.y, size: 34 * s, rot: an, sx: 1.8, sy: .5, color: '#ffffff', alpha: fade, tex: 'shard' }); glow(h, 60 * s, M.rim, .8 * fade); } };
  DRAW.psychic = (e, M, t, ph, P) => { const a = e.from(), b = e.to(), s = e.sb(), sa = e.sa();
    chargeAt(e, M, t, ph, a, sa);
    for (let i = 0; i < 4; i++) { const u = clamp((t - ph.travel[0] - i * 90) / (ph.travel[1] - ph.travel[0])); if (u <= 0 || u >= 1) continue; const h = lerp(a, b, u), an = Math.atan2(b.y - a.y, b.x - a.x);
      S({ x: h.x, y: h.y, size: (24 + u * 40) * s, sx: .45, sy: 1, rot: an, color: i % 2 ? M.rim : M.core, alpha: 1 - u * .6, tex: 'ring' }); }
    if (t > ph.travel[0]) { const b2 = e.to(), k = clamp((t - ph.travel[0]) / (ph.impact[1] - ph.travel[0])); S({ x: b2.x, y: b2.y - 60 * s, size: 40 * s, color: M.rim, alpha: Math.sin(k * Math.PI), tex: 'eye' }); } };
  DRAW.musical = (e, M, t, ph, P) => { const a = e.from(), b = e.to(), s = e.sb(), sa = e.sa();
    chargeAt(e, M, t, ph, a, sa);
    for (let i = 0; i < 6; i++) { const u = clamp((t - ph.travel[0]) / (ph.travel[1] - ph.travel[0]) * 1.25 - i * .08); if (u <= 0 || u >= 1) continue; const h = bez(a, b, u, 50, i % 2 ? 1 : -1);
      glow({ x: h.x, y: h.y + Math.sin(u * 14 + i) * 14 * s }, 40 * s, M.rim, .7); S({ x: h.x, y: h.y + Math.sin(u * 14 + i) * 14 * s, size: 22 * s, rot: Math.sin(u * 10) * .3, color: i % 3 ? M.rim : '#ffffff', tex: 'note' }); } };
  // feixe: cresce da mão até o alvo, fica, pulsa e some; raio ganha arcos serrilhados
  DRAW.beam = (e, M, t, ph, P) => { const a = e.from(), b = e.to(), s = e.sb(), sa = e.sa();
    chargeAt(e, M, t, ph, a, sa);
    const t0 = ph.travel[0], end = ph.impact[0] + (ph.impact[1] - ph.impact[0]) * .45; if (t < t0 || t > end) return;
    const grow = easeOut(clamp((t - t0) / ((ph.travel[1] - t0) * .7))), fade = t > end - 220 ? (end - t) / 220 : 1, tip = lerp(a, b, grow), w = (26 + P.tier * 10) * s * (1 + Math.sin(t / 30) * .08);
    L.line(a, tip, w * 2, M.rim, .28 * fade); L.line(a, tip, w, M.rim, .6 * fade); L.line(a, tip, w * .22, '#ffffff', .85 * fade);
    glow(a, w * 2.6, M.rim, .7 * fade); core(a, w * .8, .8 * fade); glow(tip, w * 3, M.rim, .7 * fade); core(tip, w, .8 * fade);
    if (P.el === 'indra' || M.motion === 'arc') { const sd = Math.floor(t / 45); for (let j = 0; j < 3; j++) { let p0 = a; for (let i = 1; i <= 7; i++) { const p1 = lerp(a, tip, i / 7), o = (rnd(sd * 31 + j * 7 + i) - .5) * 40 * s, n = { x: p1.x - (tip.y - a.y) / 300 * o, y: p1.y + o }; L.line(p0, n, (j ? 4 : 2.5) * s, j ? M.rim : '#ffffff', fade * .7, true, 1, 'streak'); p0 = n; } } }
    if (Math.random() < .8 * q()) L.emit(motionOf(M, lerp(a, tip, Math.random()), s * .7, e.k++, 9, .4)); };
  // corpo a corpo: o palco leva o recorte até o alvo; aqui os cortes, o golpe de cima, a investida
  DRAW.slash = (e, M, t, ph, P) => { const b = e.to(), s = e.sb(), hits = Math.max(1, Math.min(5, P.hits)), base = rnd(P.seed) * 1.2 - .6;
    for (let h = 0; h < hits; h++) { const t1 = ph.impact[0] - 160 + h * Math.min(130, 420 / hits), z = (t - t1) / 260; if (z <= 0 || z >= 1) continue; const sideH = h % 2 ? -1 : 1, rot = base + sideH * (.5 + h * .35) + (1 - easeOut(z)) * -.9 * sideH, R = (110 + P.tier * 25) * s;
      S({ x: b.x, y: b.y, size: R, sx: 1.1, sy: .55, rot, color: M.rim, alpha: (1 - z) * .9, tex: 'crescent' }); S({ x: b.x, y: b.y, size: R * .92, sx: 1.1, sy: .38, rot, color: '#ffffff', alpha: (1 - z), tex: 'crescent' });
      if (!e['s' + h] && z > .2) { e['s' + h] = 1; spray({ ...M, motion: 'streak' }, b, s, 6 * q(), 1.4); } } };
  DRAW.smash = (e, M, t, ph, P) => { const b = e.to(), f = e.footB(), s = e.sb();
    if (t < ph.impact[0] && t > ph.fire[0]) { const u = easeOut(clamp((t - ph.fire[0]) / (ph.impact[0] - ph.fire[0]))), y = b.y - (1 - u) * 260 * s, h = { x: b.x, y };
      L.line({ x: b.x, y: y - 120 * s }, h, (34 + P.tier * 8) * s, M.rim, .6 * u); glow(h, (90 + P.tier * 20) * s, M.rim, u); core(h, 46 * s, u); S({ x: h.x, y: h.y, size: 60 * s, rot: Math.PI / 2, color: M.rim, tex: M.tex, alpha: u }); }
    const k = (t - ph.impact[0]) / 600; if (k > 0 && k < 1) { S({ x: f.x, y: f.y, size: (90 + 260 * easeOut(k)) * s, flat: .3, color: M.core, alpha: 1 - k, tex: 'shock', layer: 0 });
      if (!e.deb) { e.deb = 1; spray({ ...M, motion: 'shard' }, f, s, 10 * q(), 1.2); L.emit({ x: f.x, y: f.y, life: 900, size: 60 * s, size1: 180 * s, tex: 'smoke', add: false, color: '#8a7a66', alpha: .4 }); } } };
  DRAW.dash = (e, M, t, ph, P) => { const a = e.footA(), b = e.to(), s = e.sb();
    if (t > ph.fire[0] && t < ph.impact[0] + 200) { const fade = t > ph.impact[0] ? 1 - (t - ph.impact[0]) / 200 : 1, an = Math.atan2(b.y - a.y, b.x - a.x);
      for (let i = 0; i < 7; i++) { const y = (rnd(P.seed + i) - .5) * 120 * s, p0 = { x: b.x - Math.cos(an) * 260 * s, y: b.y + y }, p1 = { x: b.x - Math.cos(an) * 40 * s, y: b.y + y * .6 }; L.line(p0, p1, 6 * s, i % 2 ? '#ffffff' : M.rim, fade * .7, true, 1, 'streak'); } }
    if (t > ph.impact[0] - 60 && !e.cut) { e.cut = 1; const R = (130 + P.tier * 25) * s; L.emit({ x: b.x, y: b.y, life: 300, size: R, size1: R * 1.3, sx: 1.6, sy: .18, rot: -.25, color: '#ffffff', tex: 'beam' }); L.emit({ x: b.x, y: b.y, life: 360, size: R, size1: R * 1.4, sx: 1.6, sy: .4, rot: -.25, color: M.rim, tex: 'beam' }); } };
  // área: círculo grande no chão do alvo, colunas de luz e o elemento brotando
  DRAW.area = (e, M, t, ph, P) => { const f = e.footB(), s = e.sb(), z = clamp(t / ph.impact[0]), fade = t > ph.impact[1] - 300 ? (ph.impact[1] - t) / 300 : 1;
    circle(f, (130 + z * 50) * s, M, z, t / 1000, fade, P.seed % 2 ? 1 : -1);
    for (let j = 0; j < 3; j++) { const u = clamp((t - ph.fire[0] - j * 160) / 700); if (u <= 0 || u >= 1) continue; S({ x: f.x, y: f.y, size: (60 + u * (200 + P.tier * 30)) * s, flat: .3, color: j ? M.rim : M.core, alpha: (1 - u) * fade, tex: 'shock', layer: 0 }); }
    if (t > ph.travel[0]) { const cnt = 4 + P.tier; for (let i = 0; i < cnt; i++) { const an = i / cnt * TAU + P.seed, p = { x: f.x + Math.cos(an) * 110 * s, y: f.y + Math.sin(an) * 30 * s }, u = clamp((t - ph.travel[0] - i * 40) / 500); if (u <= 0) continue; const top = { x: p.x, y: p.y - (60 + u * 200) * s };
      L.line(p, top, 18 * s, M.rim, .7 * fade * (1 - Math.max(0, u - .7) / .3)); L.line(p, top, 6 * s, '#ffffff', fade * (1 - Math.max(0, u - .7) / .3)); } } };
  DRAW.rain = (e, M, t, ph, P) => { const f = e.footB(), s = e.sb(), z = clamp(t / ph.impact[0]), fade = t > ph.impact[1] - 300 ? (ph.impact[1] - t) / 300 : 1;
    circle(f, (120 + z * 40) * s, M, z, t / 1000, fade * .8);
    const n = Math.round((7 + P.tier * 2) * q()); for (let i = 0; i < n; i++) { const d = rnd(P.seed + i * 7) * .45, u = clamp((t - ph.fire[0]) / (ph.impact[0] - ph.fire[0]) - d); if (u <= 0) continue; const x = f.x + (rnd(P.seed + i) - .5) * 220 * s, y1 = f.y + (rnd(P.seed + i * 3) - .5) * 40 * s;
      if (u < 1) { const h = { x: x + (1 - u) * 80 * s, y: y1 - (1 - u * u) * 520 * s }, tl = { x: h.x + 50 * s, y: h.y - 140 * s }; L.line(tl, h, 14 * s, M.rim, .8); L.line(tl, h, 5 * s, '#ffffff', 1); glow(h, 50 * s, M.rim, .9); }
      else if (!e['r' + i]) { e['r' + i] = 1; const p = { x, y: y1 }; L.emit({ x, y: y1, life: 260, size: 30 * s, size1: 110 * s, flat: .3, tex: 'shock', color: M.core }); spray(M, p, s * .7, 4 * q(), .8); } } };
  // ritual e invocação: círculo nos pés de quem usa, depois no alvo; ritual sobe pilares e fecha numa coluna de luz; invocação ergue a forma do elemento
  DRAW.ritual = (e, M, t, ph, P) => { const fa = e.footA(), f = e.footB(), s = e.sb(), sa = e.sa(), z = clamp(t / ph.impact[0]), fade = t > ph.impact[1] - 350 ? (ph.impact[1] - t) / 350 : 1;
    circle(fa, (90 + z * 30) * sa, M, z, t / 1000, (1 - clamp((t - ph.impact[0]) / 300)) * .9);
    if (z > .35) circle(f, 150 * s, M, (z - .35) / .65, -t / 1000, fade);
    if (z > .5) { const cnt = 5 + P.tier, u = clamp((z - .5) / .5); for (let i = 0; i < cnt; i++) { const an = i / cnt * TAU + t / 1600, p = { x: f.x + Math.cos(an) * 120 * s, y: f.y + Math.sin(an) * 34 * s }, top = { x: p.x, y: p.y - u * (90 + rnd(P.seed + i) * 120) * s }; L.line(p, top, 10 * s, i % 2 ? M.rim : M.core, fade * .8); glow(top, 26 * s, M.core, fade); } }
    const k = (t - ph.impact[0]) / 700; if (k > 0 && k < 1) { const top = { x: f.x, y: f.y - 700 * s }, w = (60 + P.tier * 20) * s * Math.sin(k * Math.PI); L.line(top, f, w * 1.8, M.rim, .5); L.line(top, f, w, M.rim, .9); L.line(top, f, w * .4, '#ffffff', 1); } };
  DRAW.summon = (e, M, t, ph, P) => { const f = e.footB(), s = e.sb(), z = clamp(t / ph.impact[0]), fade = t > ph.impact[1] - 300 ? (ph.impact[1] - t) / 300 : 1;
    circle(f, 160 * s, M, z, t / 1000, fade);
    if (z > .45) { const u = easeOut(clamp((z - .45) / .55)), p = { x: f.x, y: f.y - u * 170 * s }, sz = (90 + P.tier * 30) * s * u; glow(p, sz * 3, M.rim, .7 * fade); S({ x: p.x, y: p.y, size: sz, rot: Math.sin(t / 300) * .15, color: M.rim, alpha: fade, tex: M.tex }); S({ x: p.x, y: p.y, size: sz * .55, color: '#ffffff', alpha: fade * .9, tex: M.tex }); S({ x: p.x, y: p.y - sz * .3, size: sz * .6, color: '#ffffff', alpha: fade * .8 * u, tex: 'eye' }); } };
  // apoio: cura, barreira e forma no alvo (ou em si)
  DRAW.heal = (e, M, t, ph, P) => { const self = !e.tid || e.tid === e.aid, f = self ? e.footA() : e.footB(), c = self ? e.from() : e.to(), s = self ? e.sa() : e.sb(), z = clamp(t / ph.impact[0]), fade = t > ph.impact[1] - 400 ? (ph.impact[1] - t) / 400 : 1;
    circle(f, 110 * s, { ...M, rim: '#7dffb0', core: '#eafff2' }, z, t / 1000, fade);
    L.line(f, { x: f.x, y: f.y - 260 * s }, 70 * s * z, '#7dffb0', .25 * fade);
    if (t > ph.travel[0] && Math.random() < .5 * q()) L.emit({ x: f.x + (Math.random() - .5) * 90 * s, y: f.y - Math.random() * 30 * s, vy: -120 * s, drag: .8, life: 1000, size: 18 * s, size1: 8 * s, tex: Math.random() < .5 ? 'plus' : 'star4', spin: 1, color: Math.random() < .5 ? '#7dffb0' : M.core });
    if (t > ph.impact[0] && !e.hl) { e.hl = 1; L.emit({ x: c.x, y: c.y, life: 500, size: 80 * s, size1: 220 * s, tex: 'glow', color: '#9dffc4' }); } };
  DRAW.barrier = (e, M, t, ph, P) => { const self = !e.tid || e.tid === e.aid, f = self ? e.footA() : e.footB(), s = self ? e.sa() : e.sb(), z = clamp(t / ph.impact[0]), fade = t > ph.impact[1] - 400 ? (ph.impact[1] - t) / 400 : 1;
    circle(f, 120 * s, M, z, t / 1000, fade);
    const rows = [[6, .25], [5, .55], [3, .85]]; let i = 0; for (const [n, hy] of rows) for (let j = 0; j < n; j++, i++) { const hz = clamp(z * 1.6 - i * .05); if (hz <= 0) continue; const an = (j + .5) / n * Math.PI + Math.PI, r = 95 * s * Math.sqrt(1 - hy * hy * .6);
      S({ x: f.x + Math.cos(an) * r * -1, y: f.y - hy * 210 * s, size: 30 * s * hz, rot: Math.PI / 6, color: M.rim, alpha: .55 * fade, tex: 'hex' }); }
    glow({ x: f.x, y: f.y - 100 * s }, 220 * s * z, M.rim, .25 * fade); };
  DRAW.form = (e, M, t, ph, P) => { const f = e.footA(), c = e.from(), s = e.sa(), z = clamp(t / ph.impact[0]), fade = t > ph.impact[1] - 400 ? (ph.impact[1] - t) / 400 : 1;
    circle(f, 110 * s, M, z, t / 1000, fade);
    if (Math.random() < .9 * q()) L.emit(motionOf({ ...M, motion: M.motion === 'smoke' ? 'smoke' : 'rise' }, { x: f.x + (Math.random() - .5) * 80 * s, y: f.y }, s * .8, e.k++, 9, .6));
    if (t > ph.impact[0] && !e.fl) { e.fl = 1; L.emit({ x: c.x, y: c.y, life: 420, size: 100 * s, size1: 300 * s, tex: 'glow', color: M.rim }); L.emit({ x: f.x, y: f.y, life: 520, size: 60 * s, size1: 260 * s, flat: .3, tex: 'shock', color: M.core }); } };
  // carga comum de quem usa: círculo nos pés e luz que converge na mão
  function chargeAt(e, M, t, ph, a, sa) { const k = clamp(t / ph.charge[1]); if (t > ph.travel[0] + 200) return; const fade = t > ph.travel[0] ? 1 - (t - ph.travel[0]) / 200 : 1, fa = e.footA();
    circle(fa, (70 + k * 30) * sa, M, k, t / 1000, fade);
    if (t < ph.charge[1]) { if (Math.random() < .8 * q()) { const an = Math.random() * TAU, r = 90 * sa; L.emit({ x: a.x + Math.cos(an) * r, y: a.y + Math.sin(an) * r, vx: -Math.cos(an) * r * 2.6, vy: -Math.sin(an) * r * 2.6, drag: 2.5, life: 380, size: 12 * sa, size1: 3, tex: 'glow', color: Math.random() < .5 ? M.rim : M.core }); }
      glow(a, (20 + k * 60) * sa, M.rim, k * fade); core(a, (8 + k * 22) * sa, k * fade); }
    if (t >= ph.fire[0] && !e.muz) { e.muz = 1; L.emit({ x: a.x, y: a.y, life: 200, size: 50 * sa, size1: 150 * sa, tex: 'star8', rot: Math.random(), color: M.core }); L.emit({ x: a.x, y: a.y, life: 260, size: 40 * sa, size1: 130 * sa, tex: 'ring', color: M.rim }); } }
  // família sem desenho específico cai no projétil
  for (const f of ['projectile', 'beam', 'slash', 'smash', 'pierce', 'dash', 'area', 'rain', 'ritual', 'summon', 'psychic', 'musical', 'heal', 'barrier', 'form']) DRAW[f] ||= DRAW.projectile;

  // ----- execução -----
  function run(e) {
    const P = e.profile, M = { ...LP.material(P.el) }; if (P.palette?.[1] && P.el === 'fis') M.rim = P.palette[2] || M.rim;
    const ph = LP.phases(P.family, e.dur), fam = DRAW[P.family], B = LP.budget(g.ANIMFX?.level?.() || 'medium'), sh = LP.share(B.particles, e.n || 1, P.hits || 1), nImp = clamp(Math.min(sh.perHit / 6, 24) * q(), 4, 24) | 0;
    e.k = 0; let hit = false;
    if (reduced()) return L.onFrame(now => { const t = now - e.start; if (t > e.dur) return false; if (t >= 0) { const b = e.to(); glow(b, 90 * e.sb(), M.rim, 1 - t / e.dur); } return true; });
    return L.onFrame(now => { const t = now - e.start; if (t < 0) return true; if (t > e.dur + 1400) return false; e.now = t;
      if (t <= e.dur) fam(e, M, t, ph, P);
      if (!hit && t >= ph.impact[0]) { hit = true; impactBurst(e, M, e.to(), e.footB(), e.sb(), nImp); }
      groundAfter(e, M, e.sb(), t); return true; });
  }
  // KO do inimigo (Tarefa 5 completa): fica aqui o gancho
  g.LUZFX = { run, DRAW, circle, spray, motionOf, impactBurst, glow, core };
})(globalThis);

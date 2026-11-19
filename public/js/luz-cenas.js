// ===== cenas do motor luminoso: splash de Limite/Domínio (estilo Star Rail) =====
// Camada DOM por cima de tudo (o canvas WebGL fica sob a HUD, então o fundo da splash é CSS: gradiente do material, faixas de luz
// em transform e, no Domínio, o glifo do elemento girando em tela cheia). Sem filter; só transform e opacity animados.
// LUZCENAS.ult(a, f) resolve no início do golpe (fase 'strike' de LUZP.ultTimeline); quem chama solta o strikeFx em seguida.
(g => {
  const LP = g.LUZP; if (!LP) return;
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const elOf = (a, f) => f.el || (typeof mainEl === 'function' ? mainEl(a) : 'fis');
  const artOf = a => { try { if (typeof PALCO3D !== 'undefined') { const s = PALCO3D.imgSrc(a, 'f'); if (s && !s.fallback) return s.url; } } catch {} return a.imgF || a.img || ''; };
  const glyphOf = (a, el) => (typeof KANJI !== 'undefined' && (KANJI[!a.enemy && a.vinc?.[0] || el] || KANJI.fis)) || '';
  const anim = (el, kf, at, ms, easing = 'cubic-bezier(.2,.8,.2,1)') => el?.animate?.(kf, { delay: at, duration: Math.max(1, ms), easing, fill: 'both' });

  function ult(a, f = {}) {
    if (!a) return Promise.resolve();
    const speed = g.ANIMFX?.settings?.speed || 1, total = LP.duration(null, { speed, reduced: reduced(), sig: 'ult' });
    const T = Object.fromEntries(LP.ultTimeline(total).map(x => [x.k, x])), el = elOf(a, f), M = LP.material(el), dom = !!f.dom;
    const art = artOf(a), streaks = reduced() ? '' : Array.from({ length: 18 }, (_, i) => `<i style="top:${(i * 37) % 100}%;--w:${30 + (i * 53) % 60}%;--d:${(i * 71) % 400}ms"></i>`).join('');
    const d = document.createElement('div'); d.className = `ultsplash ${dom ? 'dom' : 'lim'} ${a.enemy ? 'foe' : ''}`; d.setAttribute('aria-hidden', 'true');
    d.style.cssText = `--c:${esc(a.color || M.rim)};--rim:${M.rim};--core:${M.core}`;
    d.innerHTML = `<i class="us-dim"></i><div class="us-bg"><i class="us-grad"></i><div class="us-streaks">${streaks}</div>${dom ? `<b class="us-glyph">${esc(glyphOf(a, el))}</b>` : ''}</div>
      <div class="us-art">${art ? `<img src="${esc(art)}" alt="">` : `<span>${esc((a.name || '?').slice(0, 1))}</span>`}</div>
      <div class="us-name"><small>${dom ? 'Domínio' : 'Limite'} · ${esc(a.name || '')}</small><b>${esc(f.s || '')}</b><i class="us-line"></i></div>`;
    document.body.append(d);
    const q = s => d.querySelector(s), out = T.back.at, bm = T.back.ms;
    if (reduced()) { anim(d, [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0 }], 0, T.strike.at, 'linear'); }
    else {
      anim(q('.us-dim'), [{ opacity: 0 }, { opacity: 1 }], T.dim.at, T.dim.ms);
      anim(q('.us-bg'), [{ transform: 'translateX(-110%) skewX(-14deg)' }, { transform: 'translateX(0) skewX(-14deg)' }], T.bg.at, Math.min(360, T.bg.ms * .25));
      anim(q('.us-art'), [{ transform: 'translateX(30%) scale(1.04)', opacity: 0 }, { transform: 'translateX(0) scale(1.08)', opacity: 1, offset: .18 }, { transform: 'translateX(-2%) scale(1.16)', opacity: 1 }], T.art.at, T.art.ms, 'cubic-bezier(.1,.7,.3,1)');
      anim(q('.us-name'), [{ transform: 'translateX(-40px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1, offset: .25 }, { transform: 'translateX(12px)', opacity: 1 }], T.name.at, T.name.ms);
      anim(q('.us-line'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], T.name.at + 120, T.name.ms * .5);
      if (dom) anim(q('.us-glyph'), [{ transform: 'translate(-50%,-50%) rotate(0deg) scale(.8)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(40deg) scale(1)', opacity: .32, offset: .2 }, { transform: 'translate(-50%,-50%) rotate(140deg) scale(1.1)', opacity: .32 }], T.bg.at, T.bg.ms, 'linear');
      // volta ao palco: a splash corre para a esquerda e o véu se desfaz enquanto a câmera orbita quem age
      anim(d, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(-18%)', opacity: 0 }], out, bm, 'cubic-bezier(.6,0,.8,.4)');
    }
    return new Promise(res => {
      setTimeout(() => { try { if (typeof PALCO3D !== 'undefined' && document.querySelector('.p3d')) PALCO3D.orbitShot?.(a.id, 45, bm + 600); } catch {} }, out);
      setTimeout(() => { g.LUZ?.pos?.fire?.('speed', { strength: .7 }); res(); }, T.strike.at);
      setTimeout(() => d.remove(), T.strike.at + 60);
    });
  }
  // ----- assinaturas das camadas 8–10: tema (motivo) × grupo de família (onde e quando o motivo acontece) -----
  // line(key, e) devolve um desenho por quadro (e, M, t, ph, P) que roda por cima da família; a intensidade (camada 8→10) cresce contagem e tamanho.
  const TAU = Math.PI * 2, cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), eo = x => 1 - Math.pow(1 - x, 3);
  const rnd = n => { n |= 0; n = Math.imul(n ^ n >>> 16, 0x21f0aaad); n = Math.imul(n ^ n >>> 15, 0x735a2d97); return ((n ^ n >>> 15) >>> 0) / 4294967296; };
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  // onde: dist sai de quem usa e cruza até o alvo; corpo no alvo no golpe; area larga no chão do alvo; rito céu e chão do alvo; apoio em quem recebe
  const PLACE = {
    dist: (e, ph) => ({ from: e.from(), at: e.to(), foot: e.footB(), s: e.sb(), t0: ph.fire[0], t1: ph.impact[0], wide: 1 }),
    corpo: (e, ph) => ({ from: e.to(), at: e.to(), foot: e.footB(), s: e.sb(), t0: ph.impact[0] - 320, t1: ph.impact[0], wide: .9 }),
    area: (e, ph) => ({ from: e.footB(), at: e.to(), foot: e.footB(), s: e.sb(), t0: ph.charge[0] + 100, t1: ph.impact[0], wide: 1.7 }),
    rito: (e, ph) => ({ from: { x: e.to().x, y: e.to().y - 420 * e.sb() }, at: e.to(), foot: e.footB(), s: e.sb(), t0: ph.charge[1] * .5, t1: ph.impact[0], wide: 1.3 }),
    apoio: (e, ph) => { const self = !e.tid || e.tid === e.aid; return { from: self ? e.from() : e.to(), at: self ? e.from() : e.to(), foot: self ? e.footA() : e.footB(), s: self ? e.sa() : e.sb(), t0: ph.charge[0], t1: ph.impact[0], wide: 1 }; }
  };
  const MOTIF = {
    // 0 ofensiva: salva em leque — várias cabeças de luz saem abertas e convergem no alvo; estrela grande no encontro
    0: (X, L, e, M, t, P, I) => { const n = 3 + Math.round(I * 2), u = cl((t - X.t0) / Math.max(1, X.t1 - X.t0));
      if (u > 0 && u < 1) for (let i = 0; i < n; i++) { const sp = (i - (n - 1) / 2) * (110 + 60 * X.wide) * X.s, a = X.from, b = X.at, m = { x: (a.x + b.x) / 2 - sp * .3, y: (a.y + b.y) / 2 + sp }, w = 1 - u, h = { x: w * w * a.x + 2 * w * u * m.x + u * u * b.x, y: w * w * a.y + 2 * w * u * m.y + u * u * b.y };
        L.sprite({ x: h.x, y: h.y, size: (40 + I * 20) * X.s, color: M.rim, alpha: .8, tex: 'glow' }); L.sprite({ x: h.x, y: h.y, size: (16 + I * 8) * X.s, color: '#fff', tex: 'core' }); }
      if (t >= X.t1 && !e.sg0) { e.sg0 = 1; L.emit({ x: X.at.x, y: X.at.y, life: 420, size: 80 * X.s, size1: (240 + I * 160) * X.s, rot: rnd(P.seed) * TAU, spin: 2, tex: 'star8', color: M.core }); g.LUZ.pos?.fire('shock', { x: X.at.x, y: X.at.y, strength: .6 + I * .4 }); } },
    // 1 controle: correntes de luz brotam do chão em volta do alvo, enrolam e travam num selo com o glifo
    1: (X, L, e, M, t, P, I) => { const u = cl((t - X.t0) / Math.max(1, X.t1 - X.t0 + 500)), n = 3 + Math.round(I * 3); if (u <= 0) return; const lock = cl((t - X.t1) / 400), fade = t > X.t1 + 900 ? Math.max(0, 1 - (t - X.t1 - 900) / 400) : 1; if (!fade) return;
      for (let i = 0; i < n; i++) { const an = i / n * TAU + rnd(P.seed + i), r = 150 * X.s * X.wide, base = { x: X.foot.x + Math.cos(an) * r, y: X.foot.y + Math.sin(an) * r * .3 }, k = eo(cl(u * 1.4 - i * .05)); let p0 = base;
        for (let j = 1; j <= 8; j++) { const v = j / 8 * k, sw = Math.sin(v * 9 + i) * 26 * X.s * (1 - lock), p1 = { x: base.x + (X.at.x - base.x) * v + sw, y: base.y + (X.at.y - base.y) * v }; L.line(p0, p1, 7 * X.s, j % 2 ? M.rim : M.core, .85 * fade); p0 = p1; } }
      if (lock > 0) { L.sprite({ x: X.at.x, y: X.at.y, size: (90 + I * 50) * X.s * eo(lock), rot: t / 700, color: M.rim, alpha: fade, tex: M.glyph }); L.sprite({ x: X.at.x, y: X.at.y, size: (110 + I * 50) * X.s * eo(lock), rot: -t / 900, color: M.core, alpha: .6 * fade, tex: 'ringThin' }); } },
    // 2 defesa: domo hexagonal que se fecha de baixo para cima e brilha ao completar
    2: (X, L, e, M, t, P, I) => { const u = cl((t - X.t0) / Math.max(1, X.t1 - X.t0)), fade = t > X.t1 + 1000 ? Math.max(0, 1 - (t - X.t1 - 1000) / 400) : 1; if (u <= 0 || !fade) return; const R = (110 + I * 30) * X.s * X.wide;
      for (let ring = 0; ring < 5; ring++) { const hy = ring / 5, cnt = 9 - ring, rr = R * Math.cos(hy * Math.PI / 2), z = cl(u * 1.8 - ring * .18); if (z <= 0) continue;
        for (let j = 0; j < cnt; j++) { const an = j / cnt * TAU + ring * .3 + t / 3000; if (Math.sin(an) < -.2) continue; L.sprite({ x: X.foot.x + Math.cos(an) * rr, y: X.foot.y - hy * R * 1.3 + Math.sin(an) * rr * .25, size: 34 * X.s * z, rot: Math.PI / 6, color: ring % 2 ? M.rim : M.core, alpha: .6 * fade, tex: 'hex' }); } }
      if (t >= X.t1 && !e.sg2) { e.sg2 = 1; L.emit({ x: X.foot.x, y: X.foot.y - R * .6, life: 500, size: R * 1.2, size1: R * 2.4, tex: 'glow', color: M.rim, alpha: .7 }); } },
    // 3 maestria: cortes em estrela com uma pausa antes de abrirem (três a cinco riscos que se cruzam no alvo)
    3: (X, L, e, M, t, P, I) => { const n = 3 + Math.round(I * 2), gap = 110; for (let i = 0; i < n; i++) { const ti = X.t1 - 260 + i * gap, z = (t - ti) / 240; if (z <= 0) continue; const an = rnd(P.seed + i * 13) * Math.PI, R = (150 + I * 70) * X.s * X.wide, d = { x: Math.cos(an) * R, y: Math.sin(an) * R * .7 };
        if (z < 1) { const a = { x: X.at.x - d.x, y: X.at.y - d.y }, b = lerp(a, { x: X.at.x + d.x, y: X.at.y + d.y }, eo(z)); L.line(a, b, 10 * X.s, M.rim, .9); L.line(a, b, 3.5 * X.s, '#fff', 1); }
        else if (z < 2.6) { const k = 1 - (z - 1) / 1.6; L.line({ x: X.at.x - d.x, y: X.at.y - d.y }, { x: X.at.x + d.x, y: X.at.y + d.y }, 4 * X.s * k, '#fff', k); } }
      const tb = X.t1 - 260 + n * gap + 260; if (t >= tb && !e.sg3) { e.sg3 = 1; L.emit({ x: X.at.x, y: X.at.y, life: 300, size: 60 * X.s, size1: 260 * X.s, tex: 'ring', color: '#fff' }); g.LUZ.pos?.fire('chroma', { strength: .5 + I * .5 }); if (g.CENA?.hitstop) g.CENA.hitstop(60 + I * 40); } },
    // 4 especial: o céu do elemento abre em cima do alvo — anel no alto, raios descendo e o glifo gigante
    4: (X, L, e, M, t, P, I) => { const u = cl((t - X.t0) / Math.max(1, X.t1 - X.t0)), fade = t > X.t1 + 900 ? Math.max(0, 1 - (t - X.t1 - 900) / 500) : 1; if (u <= 0 || !fade) return; const sky = { x: X.at.x, y: X.at.y - (330 + I * 60) * X.s }, R = (120 + I * 60) * X.s * X.wide;
      L.sprite({ x: sky.x, y: sky.y, size: R * 2 * eo(u), flat: .35, rot: t / 1400, color: M.rim, alpha: .8 * fade, tex: M.glyph, layer: 0 }); L.sprite({ x: sky.x, y: sky.y, size: R * 2.4 * eo(u), flat: .35, color: M.core, alpha: .4 * fade, tex: 'ringThin', layer: 0 });
      L.sprite({ x: sky.x, y: sky.y, size: R * 3 * u, flat: .35, color: M.rim, alpha: .35 * fade, tex: 'glow', layer: 0 });
      const rays = 4 + Math.round(I * 4); for (let i = 0; i < rays; i++) { const v = cl(u * 1.3 - i * .06); if (v <= 0) continue; const ox = (rnd(P.seed + i * 5) - .5) * R * 1.4, top = { x: sky.x + ox * .6, y: sky.y }, bot = { x: X.foot.x + ox, y: X.foot.y }; L.line(top, lerp(top, bot, eo(v)), (8 + I * 6) * X.s, M.rim, .55 * fade); L.line(top, lerp(top, bot, eo(v)), 3 * X.s, '#fff', .8 * fade); } }
  };
  const lineScene = (key, e) => { const [tm, grp] = String(key).split('-'), mf = MOTIF[tm], pl = PLACE[grp]; if (!mf || !pl) return null; const I = cl(e.sigI ?? 1);
    return (ee, M, t, ph, P) => { const L = g.LUZ; if (!L) return; mf(pl(ee, ph), L, ee, M, t, P, I); }; };
  // ----- chefes: 8 presets; 'in' toca sozinho na entrada (~2,5 s, no próprio chefe), 'hit' corre por cima do golpe forte (no alvo) -----
  const geoOf = id => { const L = g.LUZ, r = L?.geo?.rect(id); return { at: L.geo.target(r), foot: L.geo.foot(r), s: L.geo.scale(r) }; };
  const bolt = (L, a, b, s, col, al, seed) => { let p0 = a; for (let i = 1; i <= 8; i++) { const p1 = lerp(a, b, i / 8), o = i < 8 ? (rnd(seed + i) - .5) * 60 * s : 0, n = { x: p1.x + o, y: p1.y }; L.line(p0, n, 9 * s, col, al * .7); L.line(p0, n, 3 * s, '#fff', al); p0 = n; } };
  // X: { at, foot, s }; u: 0..1 do trecho; t: ms desde o início; col: cor do chefe; once: marca de disparo único
  const BOSS = {
    ascensao: (L, X, t, u, col, once) => { const w = (40 + 120 * eo(u)) * X.s, top = { x: X.foot.x, y: X.foot.y - 900 * X.s }, f = u > .85 ? (1 - u) / .15 : 1;
      L.line(X.foot, top, w * 1.8, col, .35 * f); L.line(X.foot, top, w, col, .8 * f); L.line(X.foot, top, w * .35, '#fff', f); L.sprite({ x: X.foot.x, y: X.foot.y, size: w * 4, flat: .3, color: col, alpha: .6 * f, tex: 'shock', layer: 0 });
      if (Math.random() < .8) L.emit({ x: X.foot.x + (Math.random() - .5) * w * 2, y: X.foot.y, vy: -500 * X.s, drag: .4, life: 800, size: 14 * X.s, size1: 3, tex: 'star4', color: Math.random() < .5 ? '#fff' : col });
      once('a', u > .1, () => g.LUZ.pos?.fire('bloom', { strength: 1 })); },
    eclipse: (L, X, t, u, col, once) => { const c = { x: X.at.x, y: X.at.y - 260 * X.s }, R = 120 * X.s * eo(Math.min(1, u * 2)), f = u > .85 ? (1 - u) / .15 : 1;
      L.sprite({ x: c.x, y: c.y, size: R * 2.6, color: col, alpha: .55 * f, tex: 'glow', layer: 0 }); L.sprite({ x: c.x, y: c.y, size: R * 1.45, rot: t / 900, color: '#fff', alpha: .8 * f, tex: 'ringThin', layer: 0 });
      L.sprite({ x: c.x, y: c.y, size: R * 1.5, color: '#07020c', alpha: .95 * f, add: false, tex: 'glow' }); L.sprite({ x: c.x, y: c.y, size: R * 1.1, color: '#000', alpha: f, add: false, tex: 'core' });
      for (let i = 0; i < 10; i++) { const an = i / 10 * TAU + t / 2400, p = { x: c.x + Math.cos(an) * R * .62, y: c.y + Math.sin(an) * R * .62 }; L.line(p, { x: c.x + Math.cos(an) * R * (1 + .3 * Math.sin(t / 200 + i)), y: c.y + Math.sin(an) * R * (1 + .3 * Math.sin(t / 200 + i)) }, 6 * X.s, col, .7 * f); } },
    tempestade: (L, X, t, u, col, once) => { const sky = X.at.y - 380 * X.s, f = u > .85 ? (1 - u) / .15 : 1;
      for (let i = 0; i < 7; i++) L.sprite({ x: X.at.x + (i - 3) * 70 * X.s + Math.sin(t / 700 + i) * 10, y: sky + Math.sin(i * 2.3) * 20 * X.s, size: 170 * X.s, color: '#1c2030', alpha: .75 * f * cl(u * 4), add: false, tex: 'smoke', layer: 0 });
      const k = Math.floor(t / 230); if (u > .2 && u < .9 && t % 230 < 90) bolt(L, { x: X.at.x + (rnd(k) - .5) * 260 * X.s, y: sky }, X.foot, X.s, col, 1, k * 13);
      once('b', u > .2, () => g.LUZ.pos?.fire('shock', { x: X.foot.x, y: X.foot.y, strength: .8 })); },
    mare: (L, X, t, u, col, once) => { const dir = 1, x0 = X.at.x - 520 * X.s * dir, x = x0 + eo(u) * 620 * X.s * dir, h = 260 * X.s * Math.sin(Math.min(1, u * 1.3) * Math.PI) + 40 * X.s, f = u > .85 ? (1 - u) / .15 : 1;
      L.sprite({ x, y: X.foot.y - h * .5, size: h * 1.6, sx: .9, sy: 1, rot: -.6 * dir, color: col, alpha: .8 * f, tex: 'crescent' }); L.sprite({ x, y: X.foot.y - h * .5, size: h * 1.4, sx: .9, sy: .8, rot: -.6 * dir, color: '#e6fbff', alpha: .9 * f, tex: 'crescent' });
      if (Math.random() < .9) L.emit({ x: x + (Math.random() - .5) * 60 * X.s, y: X.foot.y - h, vx: (Math.random() - .3) * 200 * dir, vy: -120 - Math.random() * 120, grav: 600, life: 700, size: 12 * X.s, size1: 22 * X.s, tex: 'bubble', color: col });
      once('c', u > .7, () => { L.emit({ x: X.at.x, y: X.foot.y, life: 600, size: 80 * X.s, size1: 320 * X.s, flat: .3, tex: 'shock', color: '#e6fbff' }); g.LUZ.pos?.fire('shock', { x: X.at.x, y: X.foot.y }); }); },
    erupcao: (L, X, t, u, col, once) => { const f = u > .85 ? (1 - u) / .15 : 1, k = cl(u / .45);
      for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + .3, e2 = { x: X.foot.x + Math.cos(an) * 230 * X.s * eo(k), y: X.foot.y + Math.sin(an) * 60 * X.s * eo(k) }; L.line(X.foot, e2, 8 * X.s, col, .9 * f, true, 0); L.line(X.foot, e2, 3 * X.s, '#fff3c4', f, true, 0); }
      if (u > .45) { if (Math.random() < .95) L.emit({ x: X.foot.x + (Math.random() - .5) * 120 * X.s, y: X.foot.y, vx: (Math.random() - .5) * 160, vy: -500 - Math.random() * 400, grav: 700, drag: .3, life: 900, size: 30 * X.s, size1: 6, tex: 'flame', color: Math.random() < .5 ? col : '#fff3c4' });
        once('d', true, () => { L.emit({ x: X.foot.x, y: X.foot.y - 60 * X.s, life: 500, size: 120 * X.s, size1: 420 * X.s, tex: 'glow', color: col }); g.LUZ.pos?.fire('shock', { x: X.foot.x, y: X.foot.y, strength: 1 }); }); } },
    julgamento: (L, X, t, u, col, once) => { const n = 7, f = u > .88 ? (1 - u) / .12 : 1;
      for (let i = 0; i < n; i++) { const d = i * .07, v = cl((u - d) / .35), an = i / n * TAU, gx = X.foot.x + Math.cos(an) * 170 * X.s, gy = X.foot.y + Math.sin(an) * 45 * X.s, y = gy - (1 - eo(v)) * 700 * X.s - 80 * X.s; if (v <= 0) continue;
        L.sprite({ x: gx, y, size: 150 * X.s, sx: .22, sy: 1, color: col, alpha: .8 * f, tex: 'shard' }); L.sprite({ x: gx, y, size: 140 * X.s, sx: .1, sy: 1, color: '#fff', alpha: f, tex: 'shard' });
        once('j' + i, v >= 1, () => L.emit({ x: gx, y: gy, life: 380, size: 30 * X.s, size1: 150 * X.s, flat: .3, tex: 'shock', color: '#fff' })); } },
    enxame: (L, X, t, u, col, once) => { const f = u > .85 ? (1 - u) / .15 : 1; if (u < .8 && Math.random() < .95) for (let i = 0; i < 3; i++) { const an = Math.random() * TAU, r = 380 * X.s, p = { x: X.at.x + Math.cos(an) * r, y: X.at.y + Math.sin(an) * r * .6 };
        L.emit({ x: p.x, y: p.y, vx: -Math.cos(an) * r * 1.6 - Math.sin(an) * 140, vy: -Math.sin(an) * r * 1.1 + Math.cos(an) * 90, drag: 1.4, life: 700, size: 10 * X.s, size1: 4, tex: i ? 'spark' : 'bubble', color: i % 2 ? col : '#f2ffd0' }); }
      L.sprite({ x: X.at.x, y: X.at.y, size: 260 * X.s * eo(u), color: col, alpha: .35 * f, tex: 'glow' });
      once('e', u > .8, () => L.emit({ x: X.at.x, y: X.at.y, life: 420, size: 60 * X.s, size1: 300 * X.s, tex: 'ring', color: col })); },
    fenda: (L, X, t, u, col, once) => { const c = { x: X.at.x, y: X.at.y - 140 * X.s }, H = 300 * X.s, op = eo(cl(u / .35)) * (u > .85 ? (1 - u) / .15 : 1), f = u > .85 ? (1 - u) / .15 : 1;
      let pl = { x: c.x, y: c.y - H }, pr = pl; for (let i = 1; i <= 10; i++) { const y = c.y - H + i * H / 5, wv = Math.sin(i / 10 * Math.PI) * 60 * X.s * op, jx = (rnd(i * 7) - .5) * 30 * X.s, nl = { x: c.x - wv + jx, y }, nr = { x: c.x + wv + jx, y }; L.line(pl, nl, 6 * X.s, col, f); L.line(pr, nr, 6 * X.s, col, f); if (wv > 2) L.sprite({ x: (nl.x + nr.x) / 2, y: y - H / 10, size: wv * 2.6, sx: 1, sy: 1.4, color: '#0a0010', alpha: .9 * f, add: false, tex: 'glow' }); pl = nl; pr = nr; }
      L.sprite({ x: c.x, y: c.y, size: 200 * X.s * op, sx: .5, sy: 1.6, color: '#12001c', alpha: .9 * f, add: false, tex: 'glow' });
      for (let i = 0; i < 3; i++) L.sprite({ x: c.x + (i - 1) * 16 * X.s, y: c.y + (i - 1) * 70 * X.s, size: 38 * X.s * op, color: '#ff2bd6', alpha: f * (.6 + .4 * Math.sin(t / 150 + i)), tex: 'eye' }); }
  };
  const runBoss = (preset, col, X, ms) => { const L = g.LUZ; if (!L?.active?.() || reduced()) return Promise.resolve(); const fn = BOSS[preset] || BOSS.ascensao, t0 = g.CENA ? g.CENA.now() : performance.now(), fired = new Set(), once = (k, c, f) => { if (c && !fired.has(k)) { fired.add(k); f(); } };
    return new Promise(res => L.onFrame(now => { const t = now - t0; if (t > ms) { res(); return false; } fn(L, X(), t, t / ms, col, once); return true; })); };
  // entrada: no próprio chefe, sozinha; golpe: devolve o desenho por quadro para LUZFX.run, ancorado no alvo, do disparo até depois do impacto
  const boss = (preset, which, ch, e) => { const col = LP.bossScene({ ...ch, el: elOf(ch, {}) }, which).col || (typeof ELC !== 'undefined' && ELC[elOf(ch, {})]) || '#ffffff';
    if (which !== 'hit') return runBoss(preset, col, () => geoOf(ch.id), 2500);
    const fn = BOSS[preset] || BOSS.ascensao, fired = new Set(), once = (k, c, f) => { if (c && !fired.has(k)) { fired.add(k); f(); } };
    return (ee, M, t, ph) => { const L = g.LUZ, a = ph.fire[0], b = ph.impact[0] + 900; if (t < a || t > b) return; fn(L, { at: ee.to(), foot: ee.footB(), s: ee.sb() }, t - a, (t - a) / (b - a), col, once); }; };
  // comandos especiais (QTE): Black Flash, Choque, Contra, Perfeito — no alvo do golpe
  const CMD = {
    bf: (L, X) => { g.LUZ.pos?.fire('shock', { x: X.at.x, y: X.at.y, strength: 1 });
      for (let i = 0; i < 28; i++) { const an = i / 28 * TAU + Math.random() * .3, v = 300 + Math.random() * 500; L.emit({ x: X.at.x, y: X.at.y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, drag: 4, life: 500, size: 30 * X.s, size1: 6, rot: an, sx: 2.6, sy: .6, tex: 'spark', color: '#e4002b' }); L.emit({ x: X.at.x, y: X.at.y, vx: Math.cos(an) * v * .9, vy: Math.sin(an) * v * .9, drag: 4, life: 460, size: 22 * X.s, size1: 4, rot: an, sx: 2.6, sy: .5, tex: 'spark', add: false, color: '#0a0003' }); } },
    chq: (L, X) => { for (const sd of [-1, 1]) L.emit({ x: X.at.x + sd * 260 * X.s, y: X.at.y, vx: -sd * 260 * X.s / .28, life: 280, size: 140 * X.s, size1: 160 * X.s, sx: .35, sy: 1, tex: 'ring', color: '#ffcf6e' });
      L.emit({ x: X.at.x, y: X.at.y, life: 420, size: 40 * X.s, size1: 320 * X.s, tex: 'star8', color: '#fff', delay: 270 }); setTimeout(() => g.LUZ.pos?.fire('shock', { x: X.at.x, y: X.at.y, strength: .9 }), 270); },
    ctr: (L, X) => { g.LUZ.pos?.fire('speed', { x: X.at.x, y: X.at.y, strength: .9 }); L.emit({ x: X.at.x, y: X.at.y, life: 260, size: 240 * X.s, size1: 300 * X.s, sx: 1.8, sy: .12, rot: -.35, tex: 'beam', color: '#fff' }); L.emit({ x: X.at.x, y: X.at.y, life: 320, size: 240 * X.s, size1: 320 * X.s, sx: 1.8, sy: .3, rot: -.35, tex: 'beam', color: '#5fb8ff' }); },
    perf: (L, X) => { L.emit({ x: X.at.x, y: X.at.y, life: 380, size: 340 * X.s, size1: 60 * X.s, tex: 'ring', color: '#ffd24a' }); L.emit({ x: X.at.x, y: X.at.y, life: 360, size: 300 * X.s, size1: 40 * X.s, tex: 'ringThin', color: '#fff' });
      L.emit({ x: X.at.x, y: X.at.y, life: 460, size: 30 * X.s, size1: 260 * X.s, tex: 'star4', spin: 2, color: '#ffd24a', delay: 340 }); setTimeout(() => g.LUZ.pos?.fire('bloom', { strength: 1 }), 340); }
  };
  const cmd = (kind, e = {}) => { const L = g.LUZ; if (!L?.active?.() || reduced() || !CMD[kind]) return; CMD[kind](L, e.at ? e : geoOf(e.tid)); L.kick(); };
  g.LUZCENAS = { ult, line: lineScene, MOTIF, PLACE, boss, cmd, BOSS, CMD };
})(globalThis);

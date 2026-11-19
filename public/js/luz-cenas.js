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
  g.LUZCENAS = { ult, line: lineScene, MOTIF, PLACE };
})(globalThis);

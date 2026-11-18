// ===== matemática pura dos efeitos do palco: peso do golpe, números, recuo, partículas, estados e replay =====
// Sem DOM: auditado no Node (tools/test.js) e usado pelo palco3d.js, palco-vida.js e coreo.js no navegador.
(g => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), z0 = v => v + 0, r2 = v => Math.round(v * 100) / 100;
  // ----- peso do golpe -----
  const hitstopMs = (pct, crit, ko) => ko ? 160 : pct <= 0 ? 0 : Math.round(Math.min(160, 60 + 80 * Math.min(1, pct * 2.5) + (crit ? 30 : 0)));
  const shakeAmp = (pct, crit) => pct <= 0 ? 0 : Math.round(Math.min(28, 4 + 40 * pct + (crit ? 8 : 0)));
  const SX = [0, 1, -.7, .5, -.3, .15, 0], SY = [0, -.6, .5, -.35, .2, -.1, 0];
  const shakeKeys = (amp, dir) => SX.map((x, i) => ({ transform: `translate(${z0(Math.round(dir * amp * x))}px,${z0(Math.round(amp * .35 * SY[i]))}px)` }));
  const slowFor = ({ ko, lastFoe, reduced } = {}) => reduced || !ko ? null : lastFoe ? { f: .3, ms: 1000, zoom: true } : { f: .5, ms: 400, zoom: false };
  // golpes consecutivos no mesmo alvo, de quem age e com a mesma técnica, viram um grupo (multi-hit)
  const groupHits = acts => { const out = []; for (const e of acts) { const f = e.fx || {}, L = out.at(-1), same = L && f.dmg > 0 && L.parts[0].fx.dmg > 0 && L.id === f.id && L.a === f.a && L.s === f.s;
    if (same) { L.parts.push(e); L.total += f.dmg; } else out.push({ id: f.id, a: f.a, s: f.s, parts: [e], total: f.dmg || 0 }); } return out; };
  // cenas em sequência: muda quem age, muda a cena (o contra-ataque ganha a sua); sem `a` (efeito contínuo) fica com a anterior
  const segments = acts => { const out = []; for (const e of acts) { const a = e.fx?.a, L = out.at(-1); if (L && (!a || a === L.a)) L.list.push(e); else out.push({ a, list: [e] }); } return out.map(s => s.list); };
  // ----- números e barras -----
  const numberPath = (t, { vx = 0, vy = -520, g: G = 1500, floor = 70, e = .35 } = {}) => {
    const tf = (-vy + Math.sqrt(vy * vy + 2 * G * floor)) / G; let y; // tf: instante em que toca o chão (para baixo é +)
    if (t <= tf) y = vy * t + G * t * t / 2; else { const v2 = -e * (vy + G * tf), u = t - tf; y = Math.min(floor, floor + v2 * u + G * u * u / 2); }
    const x = vx * Math.min(t, tf * 1.6), a = t <= .75 ? 1 : Math.max(0, 1 - (t - .75) / .45);
    return { x: +x.toFixed(1) + 0, y: +y.toFixed(1) + 0, a: +a.toFixed(3) }; // + 0 tira o −0; toFixed evita 1e-16 no fim
  };
  const numberSeed = (i, crit) => ({ vx: (i % 2 ? 1 : -1) * (40 + (i * 37) % 60), vy: crit ? -680 : -520 });
  // dano: a barra cai já e o rastro claro desce depois; cura: o rastro verde sobe já e a barra vem depois
  const trailPlan = (o, n) => n === o ? null : n < o ? { heal: false, bar: { to: n, delay: 0 }, trail: { from: o, to: n, delay: 450 } } : { heal: true, bar: { to: n, delay: 450 }, trail: { from: o, to: n, delay: 0 } };
  // ----- recuo e investida -----
  const recoilVec = (from, to, pct, crit) => {
    let dx = to.x - from.x, dz = to.z - from.z; const L = Math.hypot(dx, dz); if (L < 1) { dx = 0; dz = 1; } else { dx /= L; dz /= L; } // mesmo ponto: para a câmera
    const k = Math.min(1, pct * 2), d = Math.round(30 + 90 * k);
    return { dx: z0(Math.round(dx * d)), dz: z0(Math.round(dz * d)), tilt: Math.sign(dx || 1) * Math.round(4 + 10 * k), kneel: !!crit || pct >= .25 };
  };
  const ARC = { dash: { h: 0, crouch: .06, ease: 'cubic-bezier(.2,.9,.3,1)' }, smash: { h: 220, crouch: .1, ease: 'cubic-bezier(.3,0,.4,1)' }, pierce: { h: 0, crouch: 0, ease: 'linear' }, slash: { h: 80, crouch: .04, ease: 'cubic-bezier(.4,0,.2,1)' } };
  const lungeArc = f => ({ ...(ARC[f] || { h: 60, crouch: .04, ease: 'cubic-bezier(.4,0,.2,1)' }) });
  // ----- cenário -----
  const layerPlanes = sc => [['ceu', -4200], ['frente', -700]].filter(([k]) => sc?.bbL?.[k]).map(([key, z]) => ({ key, url: sc.bbL[key], z, k: Math.round((1000 - z) / 3600 * 1000) / 1000 }));
  const particleCount = (q, reduced) => reduced ? 0 : q === 'low' ? 24 : q === 'medium' ? 48 : 80;
  const PK = { chuva: ['gota', .7, 1.1], neve: ['floco', 6, 10], cinzas: ['cinza', 7, 12], brasas: ['brasa', 3, 5], neblina: ['nevoa', 14, 22] };
  const rnd = n => { n |= 0; n = Math.imul(n ^ n >>> 16, 0x21f0aaad); n = Math.imul(n ^ n >>> 15, 0x735a2d97); return ((n ^ n >>> 15) >>> 0) / 4294967296; };
  const particlesFor = (clima, n, seed = 1) => { const P = PK[clima]; if (!P) return []; const [kind, d0, d1] = P;
    return Array.from({ length: n }, (_, i) => { const r = j => rnd(seed * 7919 + i * 31 + j), dur = r(3) * (d1 - d0) + d0;
      return { kind, x: Math.round(-1400 + r(1) * 2800), z: Math.round(-3200 + r(2) * 3600), y0: Math.round(-900 + r(4) * 800), dur: r2(dur), delay: r2(r(5) * dur), s: r2(.6 + r(6) * .8) }; }); };
  const litUnits = (F, c, R = 600) => [...F].map(([id, p]) => ({ id, k: r2(1 - Math.hypot(p.x - c.x, p.z - c.z) / R) })).filter(u => u.k > 0).sort((a, b) => b.k - a.k);
  // ----- estados no recorte -----
  const poseOf = c => c.hp <= 0 ? ['ko'] : [c.hp / (c.hpMax || 1) <= .25 && 'ferido', c.limit >= 100 && 'limite'].filter(Boolean);
  const AURA = [['frozen', 'gelo'], ['burn', 'brasas'], ['poison', 'bolhas'], ['stun', 'estrelas'], ['sleep', 'zzz'], ['para', 'faiscas'], ['fear', 'tremor'], ['dread', 'tremor'], ['bleed', 'gotas'], ['curse', 'nevoa'], ['possess', 'nevoa'], ['confuse', 'espiral'], ['rad', 'radiacao'], ['wet', 'molhado'], ['blind', 'venda']];
  const auraOf = st => [...new Set(AURA.filter(([k]) => st?.[k]).map(([, a]) => a))].slice(0, 3);
  const BUF = [['atk', '#ff493d'], ['def', '#e39b46'], ['agi', '#45e6b3']]; // cores de FOR, CON e AGI (ANIM_PROFILES.ATTRS)
  const buffsOf = st => BUF.flatMap(([k, col]) => [['Up', 1], ['Dn', -1]].filter(([s]) => st?.[k + s]).map(([, dir]) => ({ k, dir, col })));
  const buffDiff = (p, st) => { const was = new Set(buffsOf(p).map(b => b.k + b.dir)); return buffsOf(st).filter(b => !was.has(b.k + b.dir)); };
  const shieldCracks = (cur, max) => { if (!(cur > 0)) return { on: false, cracks: 0 }; const r = cur / Math.max(cur, max || cur); return { on: true, cracks: r > .66 ? 0 : r > .33 ? 1 : 2 }; };
  // ----- replay: a entrada n e as vizinhas contíguas do mesmo golpe (quem age e técnica) -----
  const actsAround = (log, n) => { const i = log.findIndex(e => e.n === n); const b = log[i]?.fx; if (!b?.a) return [];
    const same = e => e?.fx && e.fx.a === b.a && e.fx.s === b.s; let lo = i, hi = i;
    while (same(log[lo - 1]) && Math.abs(log[lo - 1].n - log[lo].n) <= 1) lo--; while (same(log[hi + 1]) && Math.abs(log[hi + 1].n - log[hi].n) <= 1) hi++;
    return log.slice(lo, hi + 1); };
  g.PFX = { hitstopMs, shakeAmp, shakeKeys, slowFor, groupHits, segments, numberPath, numberSeed, trailPlan, recoilVec, lungeArc, layerPlanes, particleCount, particlesFor, litUnits, poseOf, auraOf, buffsOf, buffDiff, shieldCracks, actsAround };
})(globalThis);

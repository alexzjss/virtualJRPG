// ===== regras puras do motor luminoso (luz.js): orçamento, escolha de motor, tempos, curvas do corpo, materiais e assinaturas =====
// Sem DOM: testado no Node (tools/test-luz.js) e usado no navegador.
(g => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // ----- orçamento e motor -----
  const BUDGET = { high: { particles: 6000, bloom: .5, post: true }, medium: { particles: 2500, bloom: .25, post: true }, low: { particles: 0, bloom: 0, post: false } };
  const budget = level => ({ ...(BUDGET[level] || BUDGET.medium) });
  const engineFor = ({ style = 'luz', webgl2 = false, level = 'medium', lost = false } = {}) => style === 'classico' || !webgl2 || level === 'low' || lost ? 'classico' : 'luz';
  // ----- tempos -----
  const BASE = { none: 2500, line: 3000, ult: 5000 };
  const duration = (profile, { speed = 1, reduced = false, sig = 'none' } = {}) => reduced ? 400 : Math.round((BASE[sig] || BASE.none) / clamp(+speed || 1, .5, 2));
  const promiseTimes = (profile, durMs) => ({ impact: Math.round(durMs * (profile?.impact ?? .58)), done: durMs });
  // ----- corpo (malha) -----
  // só vira malha a imagem que a GPU pode ler (mesma origem ou CORS) e que já carregou; o resto fica no DOM
  const meshable = ({ src = '', sameOrigin = false, loaded = false } = {}) => !!src && !!sameOrigin && !!loaded;
  // quadros-chave por tipo: bend (rad, inclina em torno do pé; + = para frente), squash (+ estica, − achata), twist (rad),
  // dx/dy (fração da altura do recorte; dx + = para frente), shake (px). Começam e terminam em repouso (menos ko/cai, que terminam deitados).
  const Z = { bend: 0, squash: 0, twist: 0, dx: 0, dy: 0, shake: 0 };
  const CAST = [[.25, { bend: -.12, squash: -.06 }], [.4, { bend: .14, squash: .05, dx: .05 }], [.6, { bend: .06, dx: .02 }]];
  const RISE = [[.3, { bend: -.08, squash: .06, dy: -.04 }], [.5, { squash: .1, dy: -.07, shake: 2 }], [.7, { squash: .02 }]];
  const MEND = [[.3, { squash: .06, dy: -.04 }], [.55, { squash: .08, dy: -.05 }], [.75, { squash: .02 }]];
  const DOWN = [[.2, { bend: -.2, squash: -.1 }], [.6, { bend: -1.2, dy: .05 }], [1, { bend: -1.4, dy: .08, squash: -.1 }]];
  const KEYS = {
    projectile: CAST, beam: CAST, psychic: CAST, musical: CAST, area: RISE, rain: RISE, ritual: RISE, summon: RISE, heal: MEND, barrier: MEND, form: MEND,
    slash: [[.25, { bend: -.18, twist: -.25, squash: -.05 }], [.4, { bend: .22, twist: .3, dx: .12, squash: .04 }], [.6, { bend: .08, twist: .1, dx: .05 }]],
    smash: [[.3, { bend: -.22, squash: -.14, dy: .03 }], [.42, { bend: .28, squash: .12, dy: -.08, dx: .08 }], [.5, { bend: .2, squash: -.1 }], [.7, { bend: .06 }]],
    pierce: [[.25, { bend: -.1, dx: -.06, squash: -.04 }], [.38, { bend: .18, dx: .18, squash: .08 }], [.6, { bend: .05, dx: .05 }]],
    dash: [[.2, { bend: .15, squash: -.08 }], [.35, { bend: .3, dx: .25, squash: .1 }], [.6, { bend: .1, dx: .06 }]],
    hit: [[.12, { bend: -.25, squash: -.08, dx: -.06, shake: 3 }], [.35, { bend: -.12, dx: -.03 }]],
    hurt: [[.2, { bend: .18, squash: -.08 }], [.6, { bend: .1, squash: -.04 }]],
    dodge: [[.25, { dx: -.2, bend: -.15, squash: -.05 }], [.6, { dx: -.08 }]],
    parry: [[.15, { bend: -.1, twist: .2, shake: 2 }], [.5, { twist: .05 }]],
    limit: [[.3, { squash: .1, dy: -.05, shake: 1.5 }], [.7, { squash: .06, shake: 1.5 }]],
    vit: [[.2, { squash: -.12 }], [.4, { squash: .14, dy: -.18 }], [.6, { squash: -.06 }], [.8, { squash: .04 }]],
    foge: [[.2, { bend: -.2, twist: .6 }], [.5, { bend: .3, dx: -.4, twist: 1 }], [.85, { dx: -.6, bend: .2 }]],
    ko: DOWN, cai: DOWN
  };
  const ease = u => u * u * (3 - 2 * u);
  const bodyCurve = (kind, t, { tier = 1, seed = 0, dir = 1 } = {}) => {
    const K = KEYS[kind]; if (!K) return { ...Z };
    const keys = [[0, Z], ...K, ...(K.at(-1)[0] < 1 ? [[1, Z]] : [])], u = clamp(t, 0, 1);
    let i = 0; while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
    const [t0, A] = keys[i], [t1, B] = keys[i + 1], k = ease(clamp((u - t0) / Math.max(1e-6, t1 - t0), 0, 1));
    const m = kind === 'ko' || kind === 'cai' ? 1 : .8 + .2 * clamp(tier, 1, 3), sg = seed % 2 ? -1 : 1, out = {};
    for (const p of Object.keys(Z)) { let v = ((A[p] || 0) + ((B[p] || 0) - (A[p] || 0)) * k) * m; if (p === 'dx') v *= dir; if (p === 'twist') v *= dir * sg; out[p] = Math.round(v * 1e4) / 1e4 + 0; }
    return out;
  };
  // repouso: só o terço de cima ondula com o vento (o pé fica fixo); ≤ 3 px
  const idleSway = (t, wind, row) => { if (row <= 2 / 3 || !wind) return 0; const k = (row - 2 / 3) * 3; return 3 * clamp(wind, 0, 1) * k * k * Math.sin(t * 1.6 + row * 2) + 0; };
  // ----- materiais de luz por elemento: glifo do círculo, núcleo/borda, como as partículas se movem e o resíduo no chão -----
  const MAT = {
    kagutsuchi: { glyph: 'glyph-kagutsuchi', core: '#fff3c4', rim: '#ff5a1f', motion: 'rise', residue: 'embers', tex: 'flame' },
    susanoo: { glyph: 'glyph-susanoo', core: '#e6fbff', rim: '#2a9dff', motion: 'bubble', residue: 'puddle', tex: 'bubble' },
    indra: { glyph: 'glyph-indra', core: '#ffffff', rim: '#8a63ff', motion: 'arc', residue: 'sparks', tex: 'spark' },
    fuhaku: { glyph: 'glyph-fuhaku', core: '#f0fffb', rim: '#47e0bb', motion: 'spiral', residue: 'frost', tex: 'feather' },
    amaterasu: { glyph: 'glyph-amaterasu', core: '#ffffff', rim: '#ffc22e', motion: 'burst', residue: 'light', tex: 'star4' },
    tsukuyomi: { glyph: 'glyph-tsukuyomi', core: '#efe0ff', rim: '#8f4dff', motion: 'drift', residue: 'mist', tex: 'crescent' },
    shukketsu: { glyph: 'glyph-shukketsu', core: '#ffd0d8', rim: '#e8173f', motion: 'drip', residue: 'pool', tex: 'drop' },
    atlas: { glyph: 'glyph-atlas', core: '#fff1c8', rim: '#d8a24a', motion: 'shard', residue: 'dust', tex: 'shard' },
    hiruko: { glyph: 'glyph-hiruko', core: '#f2ffd0', rim: '#7fd61f', motion: 'acid', residue: 'puddle', tex: 'bubble' },
    aura: { glyph: 'glyph-aura', core: '#ffffff', rim: '#2cc8ff', motion: 'hex', residue: 'light', tex: 'hex' },
    oculto: { glyph: 'glyph-oculto', core: '#ffd6ff', rim: '#c22cff', motion: 'smoke', residue: 'mist', tex: 'eye' },
    fis: { glyph: 'glyph-fis', core: '#ffffff', rim: '#ffd36a', motion: 'streak', residue: 'none', tex: 'spark' }
  };
  const material = el => ({ ...(MAT[el] || MAT.fis) });
  // fases do golpe em ms: carga → disparo → trajeto → impacto; o impacto começa no mesmo instante que promiseTimes promete
  const TRAVEL = new Set(['projectile', 'beam', 'pierce', 'dash', 'psychic', 'musical']);
  const phases = (family, durMs) => { const fr = g.ANIM_PROFILES?.IMPACT?.[family] ?? .58, i = Math.round(durMs * fr), [c, f] = TRAVEL.has(family) ? [.3, .38] : [.6, .7], a = Math.round(i * c), b = Math.round(i * f);
    return { charge: [0, a], fire: [a, b], travel: [b, i], impact: [i, durMs] }; };
  // orçamento de partículas entre emissores (alvos) e golpes: todo impacto ganha ao menos impactFloor
  const share = (budget, emitters, hitsPerEmitter) => { const e = Math.max(1, emitters | 0), h = Math.max(1, hitsPerEmitter | 0); return { perHit: Math.floor(budget / (e * h)), impactFloor: Math.min(60, Math.floor(budget / e)) }; };
  // ----- pós de tela: intensidade de cada pulso (0..1) t ms depois de disparar -----
  const PULSE = { bloom: 220, shock: 450, invert: 34, chroma: 260, speed: 400 };
  const pulse = (kind, t, strength = 1) => { const ms = PULSE[kind]; if (!ms || t < 0 || t > ms) return 0; const u = t / ms, k = kind === 'invert' ? 1 : kind === 'shock' ? Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u) + (1 - u) * .25 : 1 - u * u;
    return Math.max(0, Math.min(1, k * clamp(strength, 0, 1))); };
  // ----- números de dano (estilo luminoso): escala, estrela do crítico, etiqueta de fraqueza e quanto tempo ficam -----
  const numberStyle = ({ crit = false, weak = false, total = false, miss = false } = {}) => {
    const [scale, lifeMs] = total ? [1.6, 1200] : crit ? [1.45, 1100] : miss ? [.85, 700] : [1, 900];
    return { scale, star: !!crit && !total, tag: weak ? 'Fraqueza' : '', lifeMs }; };
  // ----- Limite/Domínio: splash (véu → fundo → arte → nome → volta ao palco) e o golpe; 5000 ms escala linear com a velocidade -----
  const ULT = [['dim', 0, 300], ['bg', 200, 1600], ['art', 300, 1500], ['name', 700, 1100], ['back', 1800, 400], ['strike', 2200, 2800]];
  const ultTimeline = totalMs => { const f = Math.max(1, +totalMs || 5000) / 5000; return ULT.map(([k, at, ms]) => ({ k, at: Math.round(at * f), ms: Math.round((at + ms) * f) - Math.round(at * f) })); };
  g.LUZP = { budget, engineFor, duration, promiseTimes, clamp, meshable, bodyCurve, idleSway, material, phases, share, TRAVEL, pulse, PULSE, numberStyle, ultTimeline };
})(globalThis);

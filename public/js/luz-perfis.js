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
  g.LUZP = { budget, engineFor, duration, promiseTimes, clamp, meshable, bodyCurve, idleSway };
})(globalThis);

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
  g.LUZP = { budget, engineFor, duration, promiseTimes, clamp };
})(globalThis);

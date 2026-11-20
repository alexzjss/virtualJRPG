// Leva 10 (19/11/2026): completa as linhas de variação (ramos com `de`) até a camada 10.
// Cada linha nasce na camada da técnica-base + 1 (combinação de Vínculos, + 2) e sobe uma camada por nó; os nós que faltam
// entram no fim da linha, em ordem de poder (arvore/camadas.js numera, escala o poder pela curva e liga cada nó ao anterior).
// Notação dos nós: arvore/l8.js (N). Só o desenho importa aqui: dano, custo, XP e requisito vêm da camada.
// Mecânicas novas: `conv A B` (converte a condição A do alvo em B) e `solo M` (×M se o alvo for o único inimigo de pé).
import { RENOMES } from './temas.js';
import { LEVA10K } from './leva10k.js';
import { LEVA10S } from './leva10s.js';
import { LEVA10A } from './leva10a.js';
import { LEVA10I } from './leva10i.js';
import { LEVA10F } from './leva10f.js';
import { LEVA10AM } from './leva10am.js';
import { LEVA10T } from './leva10t.js';
import { LEVA10SH } from './leva10sh.js';
import { LEVA10H } from './leva10h.js';
import { LEVA10M } from './leva10m.js';
import { LEVA10AU } from './leva10au.js';
import { ESTENDER12 } from './leva12/index.js';

export const LEVA10 = { ...LEVA10K, ...LEVA10S, ...LEVA10A, ...LEVA10I, ...LEVA10F, ...LEVA10AM, ...LEVA10T, ...LEVA10SH, ...LEVA10H, ...LEVA10M, ...LEVA10AU };
for (const [b, ns] of Object.entries(ESTENDER12)) LEVA10[b] = [...(LEVA10[b] || []), ...ns]; // Leva 12: nós novos no fim das linhas que já existem

// base → nós novos. Herdam do primeiro nó da linha o atributo, o tipo de aura (cat) e a arma exigida (req).
const REP = [];
export function completar(TREE) {
  REP.length = 0;
  const feitos = new Set();
  for (const [base, ns] of Object.entries(LEVA10)) {
    const b = Object.values(TREE).flatMap(t => t.branches).find(b => b.de === base || RENOMES[b.de]?.[0] === base);
    if (!b) throw new Error(`Leva 10: não há linha de variação de "${base}"`);
    const ref = b[0], nomes = new Set(Object.values(TREE).flatMap(t => t.branches.flat()).map(s => s.n));
    ns.forEach((o, i) => {
      if (nomes.has(o.n)) { REP.push(o.n); return; } nomes.add(o.n);
      const s = { ...o, xp: 50, ob: ref.ob };
      if (s.k !== 'passive') s.a = o.a || b.find(x => x.a)?.a || 'FOR';
      for (const k of ['cat', 'req']) if (ref[k] && s[k] == null) s[k] = ref[k];
      if (ref.circ && !s.circ) { s.circ = Math.min(4, 1 + Math.floor((b.length + i) / 3)); s.pay = { san: s.circ + 1 }; s.cmd = 'runa'; s.rn = ['circulo', 'triangulo', 'estrela', 'espiral'][s.circ - 1]; }
      b.push(s);
    });
    feitos.add(base);
  }
  if (REP.length) throw new Error(`Leva 10: nomes repetidos: ${REP.join(" | ")}`);
}

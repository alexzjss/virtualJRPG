// Leva 10 (19/11/2026): completa as linhas de variação (ramos com `de`) até a camada 10.
// Cada linha nasce na camada da técnica-base + 1 (combinação de Vínculos, + 2) e sobe uma camada por nó; os nós que faltam
// entram no fim da linha, em ordem de poder (arvore/camadas.js numera, escala o poder pela curva e liga cada nó ao anterior).
// Notação dos nós: arvore/l8.js (N). Só o desenho importa aqui: dano, custo, XP e requisito vêm da camada.
// Mecânicas novas: `conv A B` (converte a condição A do alvo em B) e `solo M` (×M se o alvo for o único inimigo de pé).
import { LEVA10K } from './leva10k.js';
import { LEVA10S } from './leva10s.js';
import { LEVA10A } from './leva10a.js';
import { LEVA10I } from './leva10i.js';

export const LEVA10 = { ...LEVA10K, ...LEVA10S, ...LEVA10A, ...LEVA10I };

// base → nós novos. Herdam do primeiro nó da linha o atributo, o tipo de aura (cat) e a arma exigida (req).
export function completar(TREE) {
  const feitos = new Set();
  for (const [base, ns] of Object.entries(LEVA10)) {
    const b = Object.values(TREE).flatMap(t => t.branches).find(b => b.de === base);
    if (!b) throw new Error(`Leva 10: não há linha de variação de "${base}"`);
    const ref = b[0], nomes = new Set(Object.values(TREE).flatMap(t => t.branches.flat()).map(s => s.n));
    ns.forEach((o, i) => {
      if (nomes.has(o.n)) throw new Error(`Leva 10: nome repetido "${o.n}"`);
      const s = { ...o, xp: 50, ob: ref.ob };
      if (s.k !== 'passive') s.a = o.a || ref.a;
      for (const k of ['cat', 'req']) if (ref[k] && s[k] == null) s[k] = ref[k];
      if (ref.circ && !s.circ) { s.circ = Math.min(4, 1 + Math.floor((b.length + i) / 3)); s.pay = { san: s.circ + 1 }; }
      b.push(s);
    });
    feitos.add(base);
  }
}

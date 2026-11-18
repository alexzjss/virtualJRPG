// Leva 8, reorganização: roda no fim de tree.js. Cada setor dos Vínculos, Aura e Ocultismo vira 5 colunas temáticas na mandala:
// 0 Ofensiva (continua a raiz) · 1 Controle e efeitos · 2 Defesa, reações e suporte · 3 Maestria e passivas · 4 Especiais (formas, rituais, duplas, domínios, invocações).
// Na grade o ramo b continua da ponta do ramo b-5 (content.js), então cada coluna vai do básico (perto do centro) ao avançado (na borda).
// Ramos de até 5 nós (fora as linhas de variação, `de`) são fundidos no ramo do mesmo tema mais curto do setor.
// O Marcial (raios em volta do centro) só é fundido e ordenado por tema. `ob` guarda o índice original (content.js monta os inimigos com ele).
const ESP = s => s.k === 'form' || s.circ || s.dom || s.duo || s.trio || s.summon || s.vow || s.aw;
const CTLFX = /\b(st (stun|sleep|frozen|para|root|silence|confuse|fear|blind|down|atkDn|defDn|agiDn|curse|marked|exposed|wet|oil|brand|poison|burn|bleed|rad)|push|seal|det|spread|strip|steal|brk|brand|lose)\b/;
const DEFFX = /\b(shield|cleanse|revive|guard|res hp|st (evade|counter|reflect|regen|endure|taunt|defUp|guarded))\b/;
export const temaNo = s => {
  if (ESP(s)) return 4;
  if (s.rea || s.k === 'heal' || (s.k === 'util' && DEFFX.test(s.fx || '')) || (s.k === 'passive' && /^(hurt|fall|low)$/.test(s.on || ''))) return 2;
  if (s.k === 'passive') return 3;
  if (s.k === 'util' || CTLFX.test((s.fx || '') + ' st ' + (s.st || ''))) return 1;
  return 0;
};
const temaRamo = b => { const c = [0, 0, 0, 0, 0]; b.forEach(s => c[temaNo(s)]++); c[0] *= .9; return c.indexOf(Math.max(...c)); }; // empate: a ofensiva cede
const nivel = b => b.reduce((t, s) => t + (s.xp || 0), 0) / b.length;
const PREF = [[0, 1, 4, 3, 2], [1, 0, 4, 2, 3], [2, 3, 1, 4, 0], [3, 2, 4, 0, 1], [4, 3, 1, 0, 2]]; // coluna substituta quando a do tema enche
function fundir(bs) {
  const curto = b => !b.de && b.length <= 5;
  for (const f of bs.filter(curto)) {
    const tm = temaRamo(f), alvo = bs.filter(b => b !== f && b !== bs[0] && !b.de && !curto(b) && b.length + f.length <= 15 && temaRamo(b) === tm).sort((x, y) => x.length - y.length)[0]
      || bs.filter(b => b !== f && b !== bs[0] && !b.de && !curto(b) && b.length + f.length <= 15).sort((x, y) => x.length - y.length)[0];
    if (!alvo) continue;
    alvo.push(...f); f.length = 0;
  }
  return bs.filter(b => b.length);
}
// dentro do ramo: do mais barato ao mais caro (estável), o 1º nó fica (raiz ou nome do ramo), os Limites no fim e cada nó depois do próprio `pre`
function ordenar(b) {
  if (b.length < 3) return;
  const head = b[0], nm = new Map(b.map(s => [s.n, s])), cost = s => (s.limit ? 1e4 : 0) + (s.xp || 0);
  const ord = b.slice(1).map((s, i) => [s, i]).sort((x, y) => cost(x[0]) - cost(y[0]) || x[1] - y[1]).map(x => x[0]);
  const out = [head], done = new Set([head]), put = s => { if (done.has(s)) return; done.add(s); for (const p of (s.pre || '').split('|')) if (nm.has(p)) put(nm.get(p)); out.push(s); };
  ord.forEach(put); b.length = 0; b.push(...out);
}
export function reorganizar(TREE) {
  for (const [el, t] of Object.entries(TREE)) {
    if (el === 'armas') continue;
    t.branches = t.branches.map(b => Object.assign([...b], b.de ? { de: b.de } : {})); // cópias: os arrays das levas ficam como foram exportados
    t.branches.forEach((b, i) => b.forEach(s => { s.ob ??= i; }));
    const fixos = el === 'marcial' ? t.branches.slice(0, 2) : t.branches.slice(0, 1);
    const linhas = t.branches.filter(b => b.de), resto = fundir([...fixos.slice(0, 1), ...t.branches.slice(fixos.length).filter(b => !b.de)]).slice(1);
    if (el === 'marcial') { // raios: vizinhos de tema parecido, do mais barato ao mais caro em cada tema
      resto.sort((x, y) => temaRamo(x) - temaRamo(y) || nivel(x) - nivel(y));
      t.branches = [...fixos, ...resto, ...linhas]; continue;
    }
    const n = resto.length + 1, rows = Math.ceil(n / 5), full = n - (rows - 1) * 5; // a última fileira se enche da esquerda para a direita, sem buracos
    const cap = [0, 1, 2, 3, 4].map(c => (c < full ? rows : rows - 1) - (c === 0 ? 1 : 0)), col = [[], [], [], [], []];
    const ord = resto.map(b => { const c = [0, 0, 0, 0, 0]; b.forEach(s => c[temaNo(s)]++); const tm = temaRamo(b); return { b, tm, pur: c[tm] / b.length }; }).sort((x, y) => y.pur - x.pur);
    for (const o of ord) { const c = PREF[o.tm].find(k => col[k].length < cap[k]); col[c].push(o.b); }
    col.forEach(c => c.sort((x, y) => nivel(x) - nivel(y)));
    const out = [t.branches[0]];
    for (let r = 0; r < rows; r++) for (let c = 0; c < 5; c++) { if (r === 0 && c === 0) continue; const b = col[c][r - (c === 0 ? 1 : 0)]; if (b) out.push(b); }
    t.branches = [...out, ...linhas];
  }
  for (const [el, t] of Object.entries(TREE)) if (el !== 'armas') t.branches.forEach((b, i) => { if (!b.de && !(el === 'marcial' && i < 2)) ordenar(b); });
}

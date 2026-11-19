// Conteúdo padrão da campanha: fantasia mística com demônios e caçadores, tecnologia dos anos 1910-1920.
// buildSkills → grade compartilhada; buildItems → catálogo; buildBestiary → modelos de inimigos.
import { TREE } from './tree.js';
import './public/rules.js'; // parseFx e parseForm são compartilhados com o navegador (globalThis.RULES)
import './public/armas.js'; // modelos de arma (globalThis.ARMAS)
export const { parseFx, parseForm } = globalThis.RULES;
const EL9 = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko'];
const PATRON = { kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', hiruko: 'Hiruko' };

// ----- notação compacta dos nós (tree.js e arvore/*.js) -----
// fx: 'st burn 3 60%; drain hp 30; shield 12 self' → lista de efeitos. Alvo opcional: self | ally | foes | tgt (padrão: o alvo da skill).
// fm: 'dur 3; atk 25; def 10; agi 20; hit 10; crit 5; atkP 6; heal 20; dr aura 3; end st exaus 2' → transformação.
// mod / bon: 'atk 10; hit 5' e 'INT 4; sanMax -5' → modificadores e bônus das passivas.
// dom: 'dur 3; ally atk 20; ally hit 10; foe def -20; foe agi -15; tick burn' → Expansão de Domínio
export function parseDom(str, where = '') {
  const d = { dur: 3, ally: {}, foe: {}, tick: '' };
  for (const item of String(str).split(';').map(x => x.trim()).filter(Boolean)) {
    const [k, a, b] = item.split(/\s+/);
    if (k === 'dur') d.dur = +a; else if (k === 'tick') d.tick = a;
    else if ((k === 'ally' || k === 'foe') && ['atk', 'def', 'agi', 'hit', 'crit'].includes(a) && !Number.isNaN(+b)) d[k][a] = +b;
    else throw new Error(`campo de domínio desconhecido "${item}" em ${where}`);
  }
  return d;
}
const kv = (str, where) => Object.fromEntries(String(str).split(';').map(x => x.trim()).filter(Boolean).map(x => { const [k, v] = x.split(/\s+/); if (Number.isNaN(+v)) throw new Error(`valor inválido "${x}" em ${where}`); return [k, +v]; }));
// converte um nó dos dados para os campos que o servidor usa
export function expand(o) {
  const { fx, fm, mod, bon, up, dom, trio, pf, rx, ...rest } = o, w = o.n, C = globalThis.RULES.CMD;
  const out = { ...rest };
  if (fx) out.fx = parseFx(fx, w);
  if (pf) out.pf = parseFx(pf, w);
  if (rx) out.rx = parseFx(rx, w); // efeito extra quando a Ressonância dispara
  if (o.cmd != null && !C.KINDS.includes(o.cmd)) throw new Error(`cmd inválido "${o.cmd}" em ${w}`);
  if (o.seq != null && !/^[↑↓←→]{3,7}$/.test(o.seq)) throw new Error(`seq inválida "${o.seq}" em ${w}`);
  if (o.rn != null && !C.RUNES.includes(o.rn)) throw new Error(`rn inválido "${o.rn}" em ${w}`);
  if (o.nt != null && !(o.nt >= 4 && o.nt <= 8)) throw new Error(`nt inválido "${o.nt}" em ${w}`);
  if (fm) out.form = parseForm(fm, w);
  if (dom) out.dom = parseDom(dom, w);
  if (trio) out.trio = String(trio).split('|');
  if (o.rea) { const [t, v] = String(o.rea).split(/\s+/); if (!globalThis.RULES.REA[t] || Number.isNaN(+v)) throw new Error(`reação inválida "${o.rea}" em ${w}`); out.rea = { t, v: +v }; }
  if (mod) out.mod = kv(mod, w);
  if (bon) out.bon = kv(bon, w);
  if (up) out.up = { ...up, ...(up.fx ? { fx: parseFx(up.fx, w) } : {}) };
  if (o.k === 'passive' && !o.pas) out.pas = o.vow ? 'vow' : o.on ? 'trig' : o.amp ? 'amp' : o.mod ? 'mod' : 'bon';
  return out;
}

// A grade é montada a partir de tree.js: o tronco Marcial no centro (comum a todos) e, em volta, 11 setores: os 9 Vínculos,
// a Aura e o Ocultismo. Cada setor cresce em anéis: o ramo 0 no eixo, os ramos 1-4 em leque na base dele; os ramos 5-9
// continuam da ponta do ramo de mesma posição no anel de dentro, e o ramo 10 (só a Aura tem) no terceiro anel.
// Cada ramo é uma corrente de casas vizinhas, então sempre dá para percorrê-lo.
export const ORDER = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'aura', 'amaterasu', 'tsukuyomi', 'oculto', 'shukketsu', 'hiruko'];
export function buildSkills(sk) {
  const N = 260, C = 55, G = {}, used = new Map(); // casa "x,y" → elemento (na Árvore de Armas, a zona 'armas')
  let CX = C, CY = C, zone = null; // centro da grade em uso e zona dos nós postos agora: a Árvore de Armas é um bloco à parte, com centro próprio
  const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !used.has(x + ',' + y);
  const node = (o, el, extra = {}) => { const { n, k, a, p, c, ...rest } = expand(o); return sk(n, k, a || 'FOR', el, p || 0, c || 0, 0, 0, { ...rest, ...extra }); };
  // put grava o nó na casa e, se houver, a ligação (ln, simétrica) com o nó da casa pai
  const idAt = new Map(), put = (x, y, s, parent) => { const id = 'g' + Object.keys(G).length; used.set(x + ',' + y, zone || s.el); idAt.set(x + ',' + y, id); G[id] = { ...s, gx: x, gy: y, ln: [] };
    const pid = parent && idAt.get(parent.join(',')); if (pid && !G[pid].ln.includes(id)) { G[pid].ln.push(id); G[id].ln.push(pid); } return [x, y]; };
  const around = (x, y) => { const o = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) o.push([x + dx, y + dy]); return o; };
  const at = k => k.split(',').map(Number), dist = k => Math.hypot(...at(k).map(v => v - C));
  // encadeia nós para fora do centro; o primeiro precisa encostar numa casa já usada que sirva de âncora (anchor)
  const chain = (deg, r0, nodes, anchor, start) => {
    let prev = start || null; const placed = [];
    nodes.forEach((s, i) => {
      const a = deg * Math.PI / 180, tx = CX + (r0 + i) * Math.cos(a), ty = CY + (r0 + i) * Math.sin(a);
      // cada candidato lembra a casa de onde saiu (o pai da ligação)
      const from = keys => keys.flatMap(k => around(...at(k)).map(p => [...p, at(k)])).filter(p => free(p[0], p[1]));
      let cand = prev ? around(...prev).map(p => [...p, prev]).filter(p => free(p[0], p[1])) : from([...used.keys()].filter(k => anchor(k)));
      if (!cand.length) cand = from([...used.keys()].filter(k => used.get(k) === (zone || s.el) || (!zone && used.get(k) === 'fis')));
      if (!cand.length) throw new Error('grade sem espaço para ' + s.name);
      const [bx, by, par] = cand.sort((p, q) => (p[0] - tx) ** 2 + (p[1] - ty) ** 2 - (q[0] - tx) ** 2 - (q[1] - ty) ** 2)[0];
      prev = put(bx, by, s, par); placed.push(prev.join(','));
    });
    return placed;
  };
  // ramo de 10 nós bifurcado: tronco (1-4), caminho A (5-7) e caminho B (8-9) saindo do nó 4, e o nó final na ponta de A ou de B
  const forked = (deg, r0, nodes, anchor, capB) => {
    if (nodes.length !== 10) return chain(deg, r0, nodes, anchor);
    const trunk = chain(deg, r0, nodes.slice(0, 4), anchor), fork = at(trunk[3]);
    const A = chain(deg - 4, r0 + 4, nodes.slice(4, 7), null, fork), B = chain(deg + 4, r0 + 4, nodes.slice(7, 9), null, fork);
    return [...trunk, ...A, ...B, ...chain(deg + (capB ? 4 : -4), r0 + (capB ? 6 : 7), [nodes[9]], null, at((capB ? B : A).at(-1)))];
  };
  const M = TREE.marcial.branches, fis = k => used.get(k) === 'fis';
  // linha de variações (ramo com `de`): sai da técnica base, para fora do centro, uma casa atrás da outra. A 1ª casa é a livre mais próxima da base (até 6 casas), ligada a ela mesmo sem encostar.
  const line = (br, el, label) => { const id = Object.keys(G).find(i => G[i].name === br.de); if (!id) throw new Error('grade: linha sem a técnica ' + br.de); const bx = G[id].gx, by = G[id].gy;
    const a = Math.atan2(by - CY, bx - CX), tx = bx + 2 * Math.cos(a), ty = by + 2 * Math.sin(a); let best = null;
    for (const r of [6, 10, 16]) { for (let x = bx - r; x <= bx + r; x++) for (let y = by - r; y <= by + r; y++) if (free(x, y)) { const d = (x - tx) ** 2 + (y - ty) ** 2; if (!best || d < best[2]) best = [x, y, d]; } if (best) break; } // centro lotado: procura mais longe
    if (!best) throw new Error('grade sem espaço para a linha de ' + br.de);
    const mk = o => node(o, el, label ? { br: label } : {}), s0 = put(best[0], best[1], mk(br[0]), [bx, by]);
    return [s0.join(','), ...chain(a * 180 / Math.PI, Math.hypot(bx - CX, by - CY) + 2, br.slice(1).map(mk), null, s0)];
  };
  // tronco Marcial: ramo 0 no centro, estilos de arma e ramos novos em raios, treinos nas casas livres junto ao centro
  // núcleo Marcial (centro e o anel em volta): aberto a todos, sem exigir vizinho aprendido; dele se anda para o resto do tronco
  put(C, C, node(M[0][0], 'fis', { open: 1 }));
  around(C, C).forEach((p, i) => M[0][i + 1] && put(...p, node(M[0][i + 1], 'fis', { open: 1 }), [C, C]));
  const rays = M.slice(2).filter(b => !b.de); // M[1] são os treinos; as armas saíram para TREE.armas
  rays.forEach((br, i) => chain(i * 360 / rays.length + 360 / ORDER.length / 2, 2, br.map(o => node(o, 'fis')), fis));
  const train = M[1].map(o => node(o, 'fis'));
  for (let r = 2; r <= 14 && train.length; r++) for (let x = C - r; x <= C + r; x++) for (let y = C - r; y <= C + r; y++)
    if (train.length && free(x, y) && around(x, y).some(p => used.get(p.join(',')) === 'fis')) put(x, y, train.shift(), around(x, y).find(p => used.get(p.join(',')) === 'fis'));
  M.filter(b => b.de).forEach(b => line(b, 'fis'));
  // setores: o ramo 0 de cada um abre o eixo (a raiz do Vínculo é o primeiro nó, aberta a quem tem o Vínculo, sem exigir vizinho); depois um ramo de cada setor por vez,
  // para nenhum setor cercar o vizinho. Um ramo em que todo nó exige arma vira uma trilha por tipo de arma.
  const SEC = 360 / ORDER.length, R0 = 13, RING = 10, SLOT = [0, -1, 1, -2, 2], W = SEC / 5.2, cells = {};
  ORDER.forEach((el, i) => { cells[el] = [forked(i * SEC, R0, TREE[el].branches[0].map((o, n) => node(o, el, { br: el + '-0', ...(n ? {} : { root: true, open: 1 }) })), fis, false)]; });
  const most = Math.max(...ORDER.map(el => TREE[el].branches.length));
  for (let b = 1; b < most; b++) ORDER.forEach((el, i) => {
    const br = TREE[el].branches[b];
    if (!br) return;
    if (br.de) { cells[el][b] = line(br, el, el + '-' + b); return; }
    const ring = Math.floor(b / 5), deg = i * SEC + SLOT[b % 5] * W, mk = o => node(o, el, { br: el + '-' + b });
    const tip = ring ? new Set(cells[el][b - 5].slice().sort((p, q) => dist(q) - dist(p)).slice(0, 3)) : new Set(cells[el][0].slice(0, 5));
    const anchor = k => tip.has(k), r0 = ring ? R0 + ring * RING : R0 + 2;
    const groups = br.every(o => o.req) ? Object.values(br.reduce((g, o) => ((g[o.req] ||= []).push(o), g), {})) : [br];
    cells[el][b] = groups.flatMap((g, m) => groups.length > 1 ? chain(deg + (m - (groups.length - 1) / 2) * 2.5, r0, g.map(mk), anchor) : forked(deg, r0, g.map(mk), anchor, b % 2 === 0));
  });
  // Árvore de Armas: um bloco isolado (sem ligação com o resto) à direita da mandala, com centro próprio. Os 4 ramos primordiais (corte, esmag, perf, dist) saem do centro em
  // diagonais; os 3 ramos de cada tipo de arma brotam da ponta do(s) primordial(is) da categoria dele (foco e instrumento, sem categoria, saem direto do centro, abertos a todos).
  const AX = C + 92, AY = C, CAT = globalThis.ARMAS.CAT, TA = TREE.armas;
  zone = 'armas'; CX = AX; CY = AY;
  const seed = (deg, r, s) => { // 1º nó sem pai: a casa livre mais perto do ponto (r, deg) em volta do centro
    const tx = AX + r * Math.cos(deg * Math.PI / 180), ty = AY + r * Math.sin(deg * Math.PI / 180); let best = null;
    for (let x = AX - r - 3; x <= AX + r + 3; x++) for (let y = AY - r - 3; y <= AY + r + 3; y++) if (free(x, y) && (!best || (x - tx) ** 2 + (y - ty) ** 2 < best[2])) best = [x, y, (x - tx) ** 2 + (y - ty) ** 2];
    return put(best[0], best[1], s);
  };
  const tip = {}, CATD = { corte: 45, dist: 135, perf: 225, esmag: 315 };
  for (const [cat, br] of Object.entries(TA.prim)) {
    const s0 = seed(CATD[cat], 2, node(br[0], 'fis', { br: 'armas-prim-' + cat, open: 1 }));
    tip[cat] = new Set([s0.join(','), ...chain(CATD[cat], 3, br.slice(1).map(o => node(o, 'fis', { br: 'armas-prim-' + cat })), null, s0)].slice(-4));
  }
  const TD = { pesada: 300, punho: 330, escudo: 0, lamina: 30, corrente: 60, arremesso: 90, fogo: 125, arco: 165, lanca: 205, foco: 255, instrumento: 285 }, OFF = [0, -12, 12];
  for (let b = 0; b < 3; b++) for (const [wt, brs] of Object.entries(TA.tipos)) {
    const cats = Object.keys(CAT).filter(c => CAT[c].includes(wt)), deg = TD[wt] + OFF[b], mk = (o, n) => node(o, 'fis', { br: 'armas-' + wt + '-' + b, ...(!cats.length && !n ? { open: 1 } : {}) });
    if (!cats.length) { const s0 = seed(deg, 2, mk(brs[b][0], 0)); chain(deg, 3, brs[b].slice(1).map((o, n) => mk(o, n + 1)), null, s0); continue; }
    const anchor = k => cats.some(c => tip[c].has(k)), nodes = brs[b].map(mk);
    b ? chain(deg, 10, nodes, anchor) : forked(deg, 10, nodes, anchor, false);
  }
  zone = null; CX = C; CY = C;
  ringLayout(G);
  return G;
}
// Posição na mandala (wx, wy): anéis concêntricos, como um sphere grid. O centro é dividido ao meio: Marcial na metade esquerda, Armas na direita.
// Em volta ficam os 11 setores, cada um numa fatia igual. O anel de um nó é a distância dele (em ligações) à raiz do seu grupo, então cada anel é um nível de
// profundidade. As ligações (ln) não mudam: só o desenho. Dentro do anel, cada nó fica perto do ângulo dos pais, e um varrimento afasta os que se encostam.
function ringLayout(G) {
  const SP = 104, GAP = 112, TAU = Math.PI * 2, SEC = TAU / ORDER.length, HALF = Math.PI * .94, WEDGE = SEC * .9;
  const grp = s => s.br?.startsWith('armas') ? 'armas' : s.el === 'fis' ? 'marcial' : s.el;
  const by = {}, dep = {}, ang = {}, rad = {}, par = {}, kids = {}, ang0 = {}, rootsOf = {};
  for (const [id, s] of Object.entries(G)) (by[grp(s)] ||= []).push(id);
  for (const [g, ids] of Object.entries(by)) { // anel de cada nó = ligações até a raiz (o centro Marcial, a raiz do setor ou as raízes das armas)
    const set = new Set(ids), roots = g === 'marcial' ? ['g0'] : ids.filter(i => G[i].open), q = [...roots];
    roots.forEach(r => dep[r] = 0);
    for (let k = 0; k < q.length; k++) for (const j of G[q[k]].ln || []) if (set.has(j) && dep[j] == null) { dep[j] = dep[q[k]] + 1; par[j] = q[k]; (kids[q[k]] ||= []).push(j); q.push(j); }
    rootsOf[g] = roots;
    for (const i of ids) if (dep[i] == null) dep[i] = 0;
  }
  const ring = id => grp(G[id]) === 'armas' ? dep[id] + 1 : dep[id]; // no centro as armas começam um anel fora do núcleo
  const count = (ids, fn) => { const c = []; for (const i of ids) c[fn(i)] = (c[fn(i)] || 0) + 1; return c; };
  const cm = count(by.marcial, ring), ca = count(by.armas, ring), K = Math.max(cm.length, ca.length), rc = [0];
  for (let k = 1; k < K; k++) rc[k] = Math.max(rc[k - 1] + GAP, Math.max(cm[k] || 0, ca[k] || 0) * SP / HALF);
  const Rc = rc[K - 1], sec = ORDER.filter(el => by[el]), D = Math.max(...sec.flatMap(el => by[el].map(i => dep[i]))) + 1, rs = [];
  for (let d = 0; d < D; d++) rs[d] = Math.max(d ? rs[d - 1] + GAP : Rc + GAP * 1.5, Math.max(...sec.map(el => count(by[el], i => dep[i])[d] || 0)) * SP / WEDGE);
  const place = (ids, r, lo, hi, mid) => { // um anel de um grupo: ângulo ideal = média dos pais; o varrimento respeita o espaço mínimo entre esferas
    const gap = SP / r, want = id => ang0[id] ?? mid;
    const L = ids.map(id => [id, want(id)]).sort((p, q) => p[1] - q[1] || parseInt(p[0].slice(1)) - parseInt(q[0].slice(1))), pos = [];
    L.forEach(([, w], i) => pos[i] = Math.max(Math.min(Math.max(w, lo), hi), i ? pos[i - 1] + gap : lo));
    for (let i = L.length - 1; i >= 0; i--) pos[i] = Math.min(pos[i], i < L.length - 1 ? pos[i + 1] - gap : hi);
    L.forEach(([id], i) => { ang[id] = pos[i]; rad[id] = r; });
  };
  const run = (ids, radius, lo, hi, mid, fn) => { const b = []; ids.forEach(i => (b[fn(i)] ||= []).push(i)); b.forEach((l, k) => l && place(l, radius(k), lo, hi, mid)); };
  const m = .05, wt = {}, weigh = id => wt[id] ??= 1 + (kids[id] || []).reduce((a, k) => a + weigh(k), 0);
  // leque da árvore: cada nó recebe uma fatia do ângulo do pai proporcional ao tamanho do seu ramo, então os ramos se espalham pela fatia sem se cruzar
  const fan = (list, lo, hi) => { const tot = list.reduce((a, k) => a + weigh(k), 0); let x = lo;
    for (const k of list) { const w = (hi - lo) * weigh(k) / tot; ang0[k] = x + w / 2; fan(kids[k] || [], x, x + w); x += w; } };
  const span = { marcial: [Math.PI / 2 + m, Math.PI * 1.5 - m], armas: [-Math.PI / 2 + m, Math.PI / 2 - m] };
  ORDER.forEach((el, i) => span[el] = [i * SEC - WEDGE / 2, i * SEC + WEDGE / 2]);
  for (const g of Object.keys(by)) { const [lo, hi] = span[g], roots = g === 'marcial' ? kids.g0 || [] : rootsOf[g]; fan(roots, lo, hi); }
  rad.g0 = 0; ang.g0 = Math.PI;
  run((by.marcial || []).filter(i => i !== 'g0'), k => rc[k], Math.PI / 2 + m, Math.PI * 1.5 - m, Math.PI, ring);
  run(by.armas || [], k => rc[k], -Math.PI / 2 + m, Math.PI / 2 - m, 0, ring);
  sec.forEach(el => { const c = ORDER.indexOf(el) * SEC; run(by[el], d => rs[d], c - WEDGE / 2, c + WEDGE / 2, c, i => dep[i]); });
  for (const [id, s] of Object.entries(G)) { s.wx = Math.round(rad[id] * Math.cos(ang[id])); s.wy = Math.round(rad[id] * Math.sin(ang[id])); }
}
// unidades de mundo por casa da grade (a esfera tem raio 24; sobra espaço para o nome em duas linhas)
export const MANDALA_U = 96;

// versão do catálogo (5: nomes novos dos consumáveis e equipamentos + catálogo completo de armas com modelo); saves em versão menor passam por migrateItems (state.js)
export const ITEMS_V = 5;
// nomes do catálogo v2 → v3, para a migração manter inventários e lojas (relíquias entram logo abaixo)
export const RENAME = { 'Tônico': 'Poção', 'Tônico Forte': 'Líquido Dourado do Sanatório', 'Elixir Vital': 'Elixir de Flamel', 'Éter de Aura': 'Cubo de Shinkai', 'Éter Concentrado': 'Cristal de Mikhail',
  'Calmante': 'Pedra de Sal Purificado', 'Láudano': 'Remédio do Sanatório', 'Antídoto': 'Antídoto do TN-1', 'Atadura': 'Bálsamo de Hermione', 'Sais Aromáticos': 'Pena de Fênix',
  'Granada': 'Bomba do Feiticeiro', 'Coquetel Incendiário': 'Frasco de Chamas Carmesim', 'Frasco de Ácido': 'Veneno TN-1', 'Bomba de Sal Sagrado': 'Bomba de Sal Purificado',
  'Casaco de Couro': 'Mantos Negros do Esquadrão', 'Colete Reforçado': 'Trajes de Rangers', 'Sobretudo Selado': 'Armadura de Atena', 'Couraça de Trincheira': 'Armadura de Micael',
  'Bracelete do Touro': 'Bracelete de Meteoro Branco', 'Cinto do Urso': 'Runas de Hermione', 'Luvas do Relojoeiro': 'Medalhão dos Kodama', 'Botas do Mensageiro': 'Runa de Viagem', 'Monóculo do Erudito': 'Codex da Antiga Realidade',
  'Rosário Antigo': 'Medalhão do Mentor', 'Broche de Prata': 'Medalhão dos Kodama', 'Amuleto da Sorte': 'Amuleto de EXP' };
const RELIC = { kagutsuchi: ['Dino-Pedra Vermelha', 'FOR'], susanoo: ['Dino-Pedra Azul', 'AGI'], atlas: ['Dino-Pedra Amarela', 'CON'], indra: ['Dino-Pedra Dourada', 'DES'], fuhaku: ['Dino-Pedra Verde', 'AGI'],
  amaterasu: ['Dino-Pedra Branca', 'SAB'], tsukuyomi: ['Dino-Pedra Preta', 'INT'], shukketsu: ['Dino-Pedra Carmesim', 'CON'], hiruko: ['Pedra Filosofal', 'SOR'] };
EL9.forEach(el => { RENAME['Relíquia de ' + PATRON[el]] = RELIC[el][0]; });

// catálogo de armas: [nome, modelo, nível (0 Comum · 1 Refinada · 2 Obra-prima · 3 Mítica), categoria, elemento, campos que sobrescrevem]
// Os 12 nomes das armas antigas e as 9 elementais continuam iguais (lojas, fichas salvas e testes os procuram pelo nome).
export const WEAPONS = [
  // as três linhas de loja antigas, agora com modelo
  ['Sabre de Cavalaria', 'sabre', 0, 'basica'], ['Katana de Caçador', 'katana', 1, 'basica'], ['Lâmina Consagrada', 'katana', 2, 'especial', '', { fx: 'vs demon 1.2', d: 'Katana benzida num templo: corta mais fundo o que é demônio.' }],
  ['Baioneta', 'baioneta', 0, 'basica'], ['Lança de Caça', 'lanca', 1, 'basica'], ['Alabarda Rúnica', 'alabarda', 2, 'especial'],
  ['Revólver .38', 'revolver', 0, 'basica'], ['Rifle de Ferrolho', 'rifle', 1, 'basica'], ['Carabina Selada', 'rifle', 2, 'especial', '', { fx: 'vs demon 1.2', d: 'Cano gravado com selos: as balas ferem o que é profano.' }],
  ['Soqueira', 'soqueira', 0, 'basica'], ['Manoplas de Aço', 'manoplas', 1, 'basica'], ['Punhos de Talismã', 'faixas', 2, 'especial', '', { d: 'Faixas escritas com talismãs: o punho fica leve e certeiro.' }],
  // armas novas de loja: uma por modelo que faltava
  ['Adaga de Trincheira', 'adaga', 0, 'basica'], ['Florete', 'florete', 0, 'basica'], ['Foice de Ceifador', 'foice', 1, 'especial'],
  ['Arpão de Baleeiro', 'arpao', 0, 'basica'], ['Pistolas Gêmeas', 'pistolas', 0, 'basica'], ['Escopeta de Cano Serrado', 'escopeta', 0, 'basica'], ['Submetralhadora de Tambor', 'metralhadora', 1, 'basica'], ['Pistola Sinalizadora', 'sinalizador', 0, 'basica'],
  ['Garras de Ferro', 'garras', 0, 'basica'], ['Faixas de Monge', 'faixas', 0, 'basica'],
  ['Marreta de Ferroviário', 'marreta', 0, 'basica'], ['Machado de Lenhador', 'machado', 0, 'basica'], ['Montante de Guerra', 'montante', 1, 'basica'], ['Âncora de Corrente', 'ancora', 1, 'especial'],
  ['Grimório Gasto', 'grimorio', 0, 'basica'], ['Cajado de Peregrino', 'cajado', 0, 'basica'], ['Sino de Exorcismo', 'sino', 0, 'basica'], ['Leque de Ofudas', 'leque', 0, 'basica'],
  // elementais (forjadas com 3 essências): o ataque básico e as técnicas físicas passam a ter o elemento
  ['Sabre Flamejante', 'sabre', 1, 'elemental', 'kagutsuchi'], ['Arpão da Maré', 'arpao', 1, 'elemental', 'susanoo'], ['Manoplas de Atlas', 'manoplas', 1, 'elemental', 'atlas'], ['Rifle Tesla', 'rifle', 1, 'elemental', 'indra'],
  ['Leque de Lâminas', 'adaga', 1, 'elemental', 'fuhaku'], ['Lança Solar', 'lanca', 1, 'elemental', 'amaterasu'], ['Adaga Lunar', 'adaga', 1, 'elemental', 'tsukuyomi'], ['Bisturi Rubro', 'florete', 1, 'elemental', 'shukketsu'], ['Pistola de Rádio', 'revolver', 1, 'elemental', 'hiruko'],
  ['Martelo de Atlas', 'marreta', 1, 'elemental', 'atlas'], ['Grimório de Tsukuyomi', 'grimorio', 1, 'elemental', 'tsukuyomi'],
  // lendárias e malditas: não estão à venda; o mestre entrega como tesouro ou recompensa de chefe
  ['Aurora do Último Dia', 'katana', 3, 'lendaria', 'amaterasu', { d: 'A katana de um caçador que nunca voltou. Brilha antes do amanhecer.' }],
  ['Marreta do Juízo', 'marreta', 3, 'lendaria', 'atlas', { d: 'Forjada no fundo de uma mina: cada golpe soa como um sino de igreja.' }],
  ['Rifle do Caçador Fantasma', 'rifle', 3, 'lendaria', 'tsukuyomi', { d: 'Ninguém vê quem atira. Só se ouve o ferrolho.' }],
  ['Sino do Abade Cego', 'sino', 3, 'lendaria', 'amaterasu', { d: 'O sino de um mosteiro queimado. Os demônios ainda lembram o som.' }],
  ['Garras da Condessa', 'garras', 2, 'maldita', 'shukketsu', { d: 'Unhas de prata da Condessa Escarlate. Têm sede, e não só do inimigo.' }],
  ['Grimório do Sem-Nome', 'grimorio', 2, 'maldita', 'oculto', { d: 'As páginas se reescrevem sozinhas à noite. Ler custa caro.' }],
  ['Perfuradora de Montanhas', 'lanca', 3, 'lendaria', '', { pierce: 50, d: 'Uma estocada que atravessa rocha e armadura como se não existissem.' }],
];

// básicas pré-implementadas: todo modelo ganha uma arma Comum com o próprio nome, sem duplicar quem já tem básica no catálogo
// (se o nome já estiver em uso por outra peça, vira "<nome> comum")
const WNAMES = new Set(WEAPONS.map(w => w[0])), WHAS = new Set(WEAPONS.filter(w => w[3] === 'basica').map(w => w[1]));
export const WEAPONS_ALL = [...WEAPONS, ...Object.values(globalThis.ARMAS.MOD).filter(m => !WHAS.has(m.id)).map(m => [WNAMES.has(m.n) ? m.n + ' comum' : m.n, m.id, 0, 'basica'])];
const basicName = tpl => WEAPONS_ALL.filter(w => w[1] === tpl && w[3] === 'basica').sort((a, b) => a[2] - b[2])[0]?.[0];
// lojas temáticas: cada modelo é vendido em 1 ou 2 cenas (a básica dele, no menor nível que existir)
export const WSHOP = {
  beco: ['adaga', 'navalha', 'facao', 'tanto', 'derringer', 'revolver', 'escopeta', 'sinalizador', 'soqueira', 'garras', 'boxe', 'chicote', 'kunai', 'facas', 'bumerangue', 'boleadeira', 'zarabatana', 'dardos', 'machado', 'nunchaku', 'broquel', 'shuriken', 'baioneta'],
  santuario: ['cajado', 'sino', 'leque', 'grimorio', 'rosario', 'espelho', 'tambor', 'boneca', 'taro', 'flauta', 'shakuhachi', 'talisma', 'espelhoscudo', 'bo', 'faixas', 'yumi', 'naginata', 'eletricas'],
  estacao: ['rifle', 'pistolas', 'metralhadora', 'canhao', 'lancachamas', 'repeticao', 'besta', 'picareta', 'marreta', 'martelo', 'machado2', 'kanabo', 'meteoro', 'mangual', 'ancora', 'montante', 'lanca', 'torre', 'pavese', 'arcocurto', 'eletricas', 'baioneta'],
  mansao: ['sabre', 'katana', 'florete', 'bengala', 'nodachi', 'sabresg', 'foice', 'tridente', 'naginata', 'alabarda', 'javali', 'revolver', 'violino', 'shamisen', 'taiko', 'tamborguerra', 'cacador', 'escudolamina', 'pregos', 'kusarigama', 'chakram', 'arpao', 'tonfas', 'sai', 'katar', 'manoplas', 'derringer'],
};
const wstock = k => WSHOP[k].map(basicName).filter(Boolean);

// itens que cumprem o `reqItem` das técnicas (tag → nomes do catálogo): o item leva a tag no campo `kit`. Quem já tinha o catálogo salvo recebe a tag pelo nome em migrateB (state.js).
export const KIT_ITENS = {
  explosivo: ['Pólvora', 'Bomba do Feiticeiro', 'Frasco de Chamas Carmesim', 'Bomba de Sal Purificado', 'Frasco Roxo'],
  armadilha: ['Sucata de Ferro'],
  medico: ['Poção', 'Líquido Dourado do Sanatório', 'Elixir de Flamel', 'Antídoto do TN-1', 'Bálsamo de Hermione', 'Erva Medicinal', 'Remédio do Sanatório', 'Pena de Fênix'],
};
export const kitOf = name => Object.keys(KIT_ITENS).filter(k => KIT_ITENS[k].includes(name)).join(' ');
export function buildItems(it) {
  const L = [], add = (...a) => { const x = it(...a), kit = kitOf(x.name); L.push(kit ? { ...x, kit } : x); }, n = PATRON;
  // consumíveis
  add('Poção', 'cons', 20, { price: 10 }); add('Líquido Dourado do Sanatório', 'cons', 45, { price: 30 }); add('Elixir de Flamel', 'cons', 90, { price: 80 });
  add('Cubo de Shinkai', 'cons', 15, { eff: 'aura', price: 20 }); add('Cristal de Mikhail', 'cons', 35, { eff: 'aura', price: 40 });
  add('Pedra de Sal Purificado', 'cons', 10, { eff: 'san', price: 22 }); add('Remédio do Sanatório', 'cons', 25, { eff: 'san', price: 50 });
  add('Antídoto do TN-1', 'cons', 0, { eff: 'cure', price: 15 }); add('Bálsamo de Hermione', 'cons', 30, { eff: 'body', price: 12 }); add('Pena de Fênix', 'cons', 20, { eff: 'rev', price: 60 });
  add('Bomba do Feiticeiro', 'cons', 28, { eff: 'bomb', el: 'fis', price: 35 }); add('Frasco de Chamas Carmesim', 'cons', 25, { eff: 'bomb', el: 'kagutsuchi', price: 26 });
  add('Veneno TN-1', 'cons', 22, { eff: 'bomb', el: 'hiruko', price: 30 }); add('Bomba de Sal Purificado', 'cons', 24, { eff: 'bomb', el: 'amaterasu', price: 35 });
  add('Frasco Roxo', 'cons', 25, { eff: 'bomb', el: 'indra', price: 35 });
  add('Componente Ritualístico', 'mat', 0, { eff: 'comp', price: 25 }); // gasto sozinho por rituais: corta o preço em Sanidade pela metade
  // ingredientes e materiais de ofício (colhidos nas cenas, de demônios abatidos, comprados ou reciclados)
  [['Erva Medicinal', 'erva', 4], ['Raiz Amarga', 'erva', 6], ['Cogumelo Pálido', 'erva', 8], ['Ervas de Cozinha', 'tempero', 3], ['Carne de Caça', 'carne', 5], ['Couro Curtido', 'carne', 6], ['Carne de Demônio', 'carne', 25],
    ['Sal Sagrado', 'mineral', 6], ['Pólvora', 'mineral', 7], ['Sucata de Ferro', 'mineral', 4], ['Papel de Arroz', 'papel', 3], ['Frasco Vazio', 'mineral', 3], ['Óleo de Lamparina', 'mineral', 5]]
    .forEach(([name, tag, price]) => add(name, 'mat', 0, { tag, price }));
  add('Frasco de Óleo', 'cons', 0, { eff: 'oil', price: 8 }); // molha o inimigo: fogo e raio reagem
  // runas: o preço acompanha o custo da receita (~1,7× os ingredientes) e o poder do efeito; veja a economia em PERICIAS.md
  [['Precisão', 45], ['Força', 45], ['Brasa', 55], ['Veneno', 55], ['Trovão', 60], ['Sangue', 60]].forEach(([r, price]) => add('Runa de ' + r, 'mat', 0, { rune: 1, price }));
  add('Munição de Prata', 'mun', 0, { el: 'amaterasu', shots: 6, price: 30 }); add('Munição Incendiária', 'mun', 0, { el: 'kagutsuchi', shots: 6, price: 24 }); add('Munição de Sal', 'mun', 0, { el: 'amaterasu', shots: 6, price: 36, salt: 1 });
  // flechas (slot de munição de arcos e bestas): elemento, condição ou perfuração por 8 disparos; feitas na Caça
  [['Flecha de Prata', { el: 'amaterasu', price: 26 }], ['Flecha Incendiária', { el: 'kagutsuchi', price: 18 }], ['Flecha Envenenada', { st: 'poison', stc: 40, stn: 3, price: 20 }],
    ['Flecha de Ponta de Aço', { pierce: 40, price: 22 }], ['Flecha de Corda', { st: 'root', stc: 30, stn: 1, price: 18 }], ['Flecha-Sinal', { st: 'marked', stc: 50, stn: 2, price: 20 }]]
    .forEach(([name, o]) => add(name, 'mun', 0, { for: 'arco', shots: 8, el: '', ...o }));
  add('Ofuda de Cura', 'cons', 40, { eff: 'hp', price: 30 }); add('Ofuda Purificadora', 'cons', 0, { eff: 'cure', price: 25 }); add('Ofuda de Fogo', 'cons', 30, { eff: 'bomb', el: 'kagutsuchi', price: 30 });
  add('Ofuda de Selo', 'cons', 32, { eff: 'bomb', el: 'amaterasu', price: 32 }); add('Ofuda de Retorno', 'cons', 35, { eff: 'rev', price: 60 }); add('Isca', 'mat', 0, { tag: 'carne', price: 5 });
  // materiais de demônio: caem em batalha e servem para forjar armas elementais (3) e relíquias (5)
  add('Garra de Demônio', 'mat', 0, { price: 8 }); EL9.forEach(el => add('Essência de ' + n[el], 'mat', 0, { el, price: 20 }));
  // armas: todas saem dos modelos de public/armas.js (tipo, traços do ataque básico e técnicas próprias); veja WEAPONS abaixo
  for (const [name, tpl, lvl, cat, el, o] of WEAPONS_ALL) add(name, 'arma', 0, globalThis.ARMAS.make(tpl, { name, lvl, cat, el: el || '', ...o }));
  // armaduras
  [['Mantos Negros do Esquadrão', 2, 40], ['Trajes Negros de Jack', 3, 90], ['Trajes de Rangers', 4, 120], ['Manto Trovejante', 4, 200], ['Asa-Branca', 5, 260], ['Armadura de Atena', 5, 280], ['Armadura de Micael', 6, 320], ['Armadura Castiel', 6, 340]]
    .forEach(([name, p, price]) => add(name, 'armadura', p, { price }));
  // acessórios: talismãs (+10 no atributo) e as pedras dos patronos (+8 no atributo e resistência ao elemento)
  [['SOR', 'Amuleto de EXP'], ['CON', 'Runas de Hermione'], ['SAB', 'Medalhão do Mentor'], ['INT', 'Codex da Antiga Realidade'], ['AGI', 'Runa de Viagem'], ['FOR', 'Bracelete de Meteoro Branco'], ['CAR', 'Medalhão dos Kodama'], ['INT', 'Chave de Salomão']]
    .forEach(([attr, name]) => add(name, 'acess', 10, { attr, price: 60 }));
  EL9.forEach(el => add(RELIC[el][0], 'acess', 8, { attr: RELIC[el][1], el, price: 400 }));
  return Object.fromEntries(L.map((x, i) => ['i' + i, x]));
}

// invocações: cor, elemento, atributos principais (tirados do invocador), skills, HP em fração do HP do invocador, turnos de duração
export const SUMMONS = Object.fromEntries([
  ['Kappa Servo', '#2f8f6b', 'susanoo', ['DES', 'AGI'], ["Jato d'Água", 'Garoa Gélida'], .35, 3],
  ['Carpa-Dragão', '#e0a030', 'susanoo', ['SAB'], ['Gota Restauradora', 'Correnteza'], .3, 4],
  ['Umibōzu', '#1d3f6e', 'susanoo', ['FOR', 'CON'], ['Onda Gigante', 'Maré Alta'], .6, 3, { armor: 3 }],
  ['Serpente da Névoa', '#9fc7e0', 'susanoo', ['INT'], ['Névoa Fria', 'Afogar'], .35, 3],
  ['Ryūjin', '#0b5fa8', 'susanoo', ['INT', 'SAB', 'CON'], ['Dilúvio de Susanoo', 'Maré de Socorro', 'Tsunami Silencioso'], .8, 3, { armor: 4 }],
  ['Golem de Barro', '#8a6a3a', 'atlas', ['CON', 'FOR'], ['Desafio', 'Pedrada'], .6, 4, { armor: 4 }],
  ['Cria Aberrante', '#84cc16', 'hiruko', ['FOR', 'AGI'], ['Isótopo Instável'], .3, 3],
  ['Enxame Mutante', '#a3e635', 'hiruko', ['AGI'], ['Nuvem Tóxica', 'Espora Venenosa'], .3, 3],
  ['Abominação', '#4d7c0f', 'hiruko', ['FOR', 'CON'], ['Explosão Isotópica', 'Garra Crescente'], .7, 3, { armor: 3 }],
  // companheiros de ofício: entram sozinhos no começo da batalha e ficam até caírem
  ['Lobo Adestrado', '#6b7280', '', ['FOR', 'AGI'], ['Golpe Pesado'], .3, 99], ['Falcão de Caça', '#a16207', '', ['DES', 'AGI'], ['Tiro Certeiro'], .22, 99], ['Urso Pardo', '#78350f', '', ['FOR', 'CON'], ['Golpe Giratório'], .5, 99, { armor: 2 }],
  ['Cão Mecânico', '#9ca3af', '', ['AGI', 'DES'], ['Tiro Certeiro'], .28, 99], ['Autômato de Latão', '#b45309', '', ['CON', 'FOR'], ['Golpe Pesado'], .5, 99, { armor: 4 }],
  ['Fera Conjurada', '#40e0d0', '', ['FOR', 'AGI'], ['Punho Reforçado'], .45, 4],
  ['Carniçal', '#6b7280', '', ['FOR'], ['Golpe Pesado'], .35, 3],
  ['Esqueleto de Trincheira', '#d6d3d1', '', ['DES'], ['Tiro Certeiro'], .35, 4, { armor: 2, arma: 12 }],
  ['Legião de Mortos', '#57534e', '', ['FOR', 'CON'], ['Golpe Giratório'], .6, 3],
  ['Ceifador', '#111827', '', ['INT', 'FOR'], ['Ritual: Toque da Morte', 'Ritual: Colher Vida'], .7, 3],
  ['Familiar', '#1f2937', '', ['AGI', 'INT'], ['Ilusão Menor'], .25, 4],
  ['Coisa do Poço', '#334155', '', ['FOR', 'CON'], ['Ritual: Toque da Morte', 'Golpe Pesado'], .5, 3],
  ['O Sem-Nome', '#000000', '', ['INT', 'FOR', 'CON'], ['Ritual: Pavor', 'Ritual: Rosto Sem Face', 'Ritual: Colher Vida'], .9, 3, { armor: 3 }],
].map(([n, c, el, a, sk, hp, ttl, o]) => [n, { c, el, a, sk, hp, ttl, ...o }]));

// modelos: [nome, cor, atributos, fraquezas, resistências, skills, extras]
export function buildBestiary(make) {
  const B = [
    // demônios e yokai comuns
    ['Diabrete de Cinzas', '#ff6a3d', { AGI: 55, CON: 35 }, ['susanoo'], ['kagutsuchi'], ['Centelha']],
    ['Cão do Inferno', '#c2410c', { FOR: 55, AGI: 60 }, ['susanoo'], ['kagutsuchi'], ['Centelha', 'Marca Ardente'], { arma: 11 }],
    ['Kappa', '#2f8f6b', { AGI: 55, DES: 55 }, ['indra'], ['susanoo'], ["Jato d'Água", 'Maré Alta']],
    ['Nure-onna', '#1d6fa5', { INT: 60, CAR: 60 }, ['indra'], ['susanoo'], ["Jato d'Água", 'Afogar', 'Névoa Fria'], { xpR: 15 }],
    ['Oni', '#b3001b', { FOR: 65, CON: 60, AGI: 35 }, ['amaterasu'], ['atlas'], ['Golpe Pesado', 'Estilhaço'], { arma: 12, xpR: 15, goldR: 20 }],
    ['Golem de Sucata', '#7c6f64', { FOR: 60, CON: 70, AGI: 25 }, ['indra'], ['fis'], ['Estilhaço', 'Terremoto'], { armor: 5, xpR: 20 }],
    ['Autômato Possuído', '#d4a017', { DES: 60, CON: 55 }, ['susanoo'], ['indra'], ['Faísca', 'Choque'], { armor: 4, xpR: 15 }],
    ['Tengu', '#3a3f5c', { AGI: 70, DES: 60 }, ['atlas'], ['fuhaku'], ['Lâmina de Vento', 'Vendaval', 'Tiro Certeiro'], { armor: 2, xpR: 20, goldR: 25 }],
    ['Corvo Carniceiro', '#4b5563', { AGI: 65, CON: 30 }, ['indra'], ['fuhaku'], ['Lâmina de Vento', 'Rajada Cortante']],
    ['Kitsune', '#ff7a1a', { INT: 65, AGI: 60, CON: 40 }, ['susanoo'], ['kagutsuchi'], ['Centelha', 'Mar de Chamas', 'Sussurro Sombrio'], { xpR: 15 }],
    ['Yurei', '#9a8cff', { INT: 60, SAB: 60, FOR: 30 }, ['amaterasu'], ['fis', 'tsukuyomi'], ['Sussurro Sombrio', 'Eclipse'], { xpR: 15 }],
    ['Espectro da Trincheira', '#64748b', { INT: 55, FOR: 55 }, ['amaterasu'], ['fis', 'tsukuyomi'], ['Sussurro Sombrio', 'Pesadelo'], { arma: 10, xpR: 15 }],
    ['Súcubo', '#be185d', { CAR: 75, INT: 60, AGI: 55 }, ['amaterasu'], ['tsukuyomi'], ['Sussurro Sombrio', 'Lua Negra', 'Véu de Tsukuyomi'], { xpR: 25, goldR: 30 }],
    ['Sanguessuga Gigante', '#7f1d1d', { CON: 65, FOR: 50, AGI: 30 }, ['kagutsuchi'], ['shukketsu'], ['Sangria', 'Hemorragia']],
    ['Jorogumo', '#6d28d9', { DES: 65, INT: 55 }, ['kagutsuchi'], ['shukketsu'], ['Sangria', 'Maré Vermelha', 'Contaminar'], { xpR: 20 }],
    ['Lodo Radioativo', '#84cc16', { CON: 70, AGI: 20 }, ['kagutsuchi'], ['fis', 'hiruko'], ['Raio Gama', 'Nuvem Tóxica'], { xpR: 15 }],
    // humanos
    ['Bandido', '#78716c', { DES: 50, FOR: 45, SAB: 35 }, [], [], ['Tiro Certeiro'], { arma: 10, goldR: 25 }],
    ['Capanga da Máfia', '#44403c', { FOR: 55, CON: 55 }, [], [], ['Golpe Pesado', 'Tiro Certeiro'], { arma: 11, armor: 2, goldR: 35 }],
    ['Soldado Desertor', '#57534e', { DES: 55, CON: 55, SAB: 30 }, ['tsukuyomi'], [], ['Tiro Certeiro', 'Golpe Giratório'], { arma: 13, armor: 3, xpR: 15, goldR: 20 }],
    ['Cultista', '#581c87', { INT: 55, SAB: 30 }, ['amaterasu'], ['shukketsu'], ['Sangria', 'Sussurro Sombrio'], { goldR: 15 }],
    ['Ocultista', '#3730a3', { INT: 70, SAB: 55, CON: 35 }, [], ['tsukuyomi'], ['Centelha', 'Faísca', 'Pesadelo', 'Manto da Noite'], { xpR: 25, goldR: 40 }],
    ['Caçador Rival', '#0f766e', { FOR: 60, DES: 60, AGI: 55 }, [], [], ['Golpe Pesado', 'Tiro Certeiro', 'Passo Rápido', 'Luz Curativa'], { arma: 14, armor: 3, xpR: 30, goldR: 60 }],
  ];
  // um chefe por patrono: usa o raio inteiro do elemento, tem muito HP e entra em fúria com metade da vida
  const BOSS = [['kagutsuchi', 'Ifrit das Fornalhas', 'susanoo', 'INT', 'torso'], ['susanoo', 'Leviatã do Porto', 'indra', 'INT', 'head', { hp: 1.4 }], ['atlas', 'Colosso de Ferro', 'fuhaku', 'FOR', 'legL', { hp: .7 }], ['indra', 'Arconte da Tempestade', 'atlas', 'INT', 'armR'], ['fuhaku', 'Rainha dos Corvos', 'kagutsuchi', 'DES', 'armL'],
    ['amaterasu', 'Serafim Caído', 'tsukuyomi', 'SAB', 'armR', { arma: -4, hp: .6, nosup: 1 }], ['tsukuyomi', 'Senhor dos Pesadelos', 'amaterasu', 'INT', 'head', { hp: .7 }], ['shukketsu', 'Condessa Escarlate', 'amaterasu', 'INT', 'torso', { hp: 1.2 }], ['hiruko', 'Filho de Hiruko', 'susanoo', 'INT', 'legR']];
  const PN = { head: 'cabeça', torso: 'torso', armL: 'braço esquerdo', armR: 'braço direito', legL: 'perna esquerda', legR: 'perna direita' };
  // chefes não usam dupla, ritual, Despertar nem invocação; dos ramos novos (7-9) só levam ataques e transformações (sem as que aumentam cura), senão o suporte deixa a luta sem fim
  const solo = s => !s.duo && !s.trio && !s.dom && !s.v2 && !s.circ && !s.aw && !s.summon && !s.form?.m?.heal && ((s.ob ?? +String(s.br).split('-')[1]) < 6 || ['dmg', 'mental', 'form'].includes(s.kind));
  const ray = el => s => solo(s) && (s.el === el && s.kind !== 'passive' && s.res !== 'san' || (s.el === el && el === 'shukketsu' && s.kind !== 'passive' && !s.back));
  // IA opcional dos chefes (campo `ia`; ausente = só ataques e transformações): dom = abre a Expansão de Domínio 1× por combate (precisa de metade da Aura);
  // defend / focus = chance por turno de Defender (vida < 40%) e de Concentrar Tensão (vida > 50%). Medido em tools/sim.js; ver DECISOES-SISTEMAS.md.
  const BIA = { susanoo: { dom: 1, focus: .15 }, amaterasu: { defend: .2 }, hiruko: { dom: 1 }, shukketsu: { dom: 1, focus: .15 } };
  // trio de elites (campo `ia.trio`): só funciona com os três no campo, cada um com a sua parte da Tempestade Ígnea
  const TRIO = [['Oni de Brasa', '#d9480f', 'kagutsuchi', { FOR: 60, CON: 55, AGI: 45 }, ['Centelha', 'Marca Ardente']], ['Tengu do Vendaval', '#3b6ea8', 'fuhaku', { AGI: 65, DES: 60 }, ['Lâmina de Vento', 'Vendaval']], ['Raijū', '#e0b400', 'indra', { AGI: 65, INT: 55 }, ['Faísca', 'Choque']]];
  const tn = el => `Tempestade Ígnea: ${{ kagutsuchi: 'Kagutsuchi', fuhaku: 'Fuhaku', indra: 'Indra' }[el]}`;
  return [...B.map(([name, color, attrs, weak, resist, skills, o], i) => make(name, color, attrs, weak, resist, skills, { cat: i < 16 ? 'demonio' : 'humano', ...o })),
    ...BOSS.map(([el, name, weak, attr, wp, tune]) => make(name, '#111111', { [attr]: 75, CON: 70, AGI: 55, SAB: 60, FOR: 60 }, [weak], [el], s => ray(el)(s) || (BIA[el]?.dom && s.dom && s.el === el), { boss: true, cat: 'chefe', ...(BIA[el] ? { ia: BIA[el] } : {}), tune: tune || {}, weakPart: wp, gmNote: `Chefe. Ponto fraco: ${PN[wp]} (mirar ali causa dano dobrado). Age duas vezes por rodada, resiste a controle e invoca lacaios ao entrar em fúria.`, bon: { hpMax: 250, auraMax: 60, sanMax: 0 }, arma: 16, armor: 4, xpR: 80, goldR: 150 })),
    ...TRIO.map(([name, color, el, attrs, sk]) => make(name, color, attrs, [], [], [...sk, tn(el)], { cat: 'demonio', ia: { trio: 1 }, xpR: 15, gmNote: 'Trio: a técnica "Tempestade Ígnea" só sai com os três (Oni, Tengu e Raijū) de pé; use-os juntos.' }))];
}

// cenas de exemplo: mapa esquemático, encontros sugeridos (nota secreta do mestre) e estoque da loja local
// ingredientes básicos que toda loja de cena pode vender (os raros, como Carne de Demônio e Essências, só por colheita, caça ou forja)
export const BASICS = ['Erva Medicinal', 'Raiz Amarga', 'Ervas de Cozinha', 'Carne de Caça', 'Sal Sagrado', 'Pólvora', 'Sucata de Ferro', 'Papel de Arroz', 'Frasco Vazio', 'Óleo de Lamparina'];
export const SCENES = [
  { name: 'Beco do Mercado Negro', gather: ['Sucata de Ferro', 'Frasco Vazio', 'Pólvora', 'Papel de Arroz', 'Carne de Caça'], bg: '/maps/beco.svg', stock: [...wstock('beco'), 'Mantos Negros do Esquadrão', 'Bomba do Feiticeiro', 'Frasco de Chamas Carmesim', 'Poção', 'Antídoto do TN-1', 'Bálsamo de Hermione', 'Munição de Prata', 'Munição Incendiária', ...BASICS],
    note: 'Encontros: 3 Bandidos + 1 Capanga da Máfia (emboscada); à noite, 2 Diabretes de Cinzas nos telhados. Armeiro vende sem perguntas; a botica é fachada de um Cultista.' },
  { name: 'Santuário Profanado', gather: ['Sal Sagrado', 'Papel de Arroz', 'Cogumelo Pálido', 'Erva Medicinal', 'Raiz Amarga'], bg: '/maps/santuario.svg', stock: [...wstock('santuario'), 'Pedra de Sal Purificado', 'Bomba de Sal Purificado', 'Medalhão do Mentor', 'Componente Ritualístico', 'Munição de Sal', ...BASICS],
    note: 'Encontros: 2 Yurei + 1 Espectro da Trincheira; chefe opcional: Serafim Caído no altar. A fonte restaura Sanidade uma vez (mestre concede). Teste de horror ao entrar (perda 5).' },
  { name: 'Estação Central', gather: ['Sucata de Ferro', 'Pólvora', 'Óleo de Lamparina', 'Frasco Vazio'], bg: '/maps/estacao.svg', stock: [...wstock('estacao'), 'Poção', 'Líquido Dourado do Sanatório', 'Cubo de Shinkai', 'Trajes de Rangers', 'Munição de Prata', 'Munição Incendiária', ...BASICS],
    note: 'Encontros: 2 Soldados Desertores + 1 Autômato Possuído no depósito; Golem de Sucata na locomotiva. Boa cena para iniciar uma perseguição (automóvel contra motocicleta).' },
  { name: 'Mansão Ashworth', gather: ['Erva Medicinal', 'Ervas de Cozinha', 'Cogumelo Pálido', 'Papel de Arroz', 'Óleo de Lamparina', 'Carne de Caça', 'Couro Curtido'], bg: '/maps/mansao.svg', stock: [...wstock('mansao'), 'Poção', 'Antídoto do TN-1', 'Bálsamo de Hermione'],
    note: 'Encontros: Cultistas (3) na capela + Ocultista na biblioteca; Súcubo no salão. Chefe: Condessa Escarlate (ponto fraco: torso). Use névoa de guerra e revele cômodo a cômodo.' },
];
export const VEHICLES = { pe: ['A pé', 1, 0], cavalo: ['Cavalo', 3, 10], moto: ['Motocicleta', 5, 0], auto: ['Automóvel', 4, -5], caminhao: ['Caminhão', 3, -15] }; // nome, velocidade, manobra

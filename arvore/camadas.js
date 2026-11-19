// Camadas (18/11/2026): último passe de tree.js. A posição no ramo É a camada (1 = começo, 10 = ponta) e a camada define o poder.
// Âncora: o Canhão de Aura (dano médio-alto) fica no meio da curva. Curva crescente moderada: dano 9 na camada 1 até ~54 na 10.
// Dentro de uma camada tudo é comparado por orçamento: o dano-base da camada paga o dano, a área, os golpes extras e os efeitos
// (tabela FXC); o tempo de recarga (ct) mais lento devolve orçamento. Formas, passivas e utilitários sobem pelos números delas.
// Regras de posição: ramos de até 10 nós; o kit atual dos personagens (ATUAIS) fica nas camadas 1–5; conceitos fortes
// (clones, armas criadas, invocações, reviver, controle absoluto, domínios plenos) ficam da 7 em diante; Limites nas camadas 4, 7 e 10;
// ninguém antes do próprio `pre`. Linhas de variação (ramo com `de`): camada da base + 1 (combinação de Vínculos, + 2).
// Camadas 1–2: um efeito só e texto de uma frase. As casas que faltam para um ramo chegar a 10 são as VAGAS da próxima leva.
import { ATUAIS } from './atuais.js';
import { temaNo } from './ordem.js';

export const CAM = 10;
const R = (54 / 9) ** (1 / 9); // ~1,22 por camada
export const DANO = L => 9 * R ** (L - 1);
export const XP = [0, 10, 15, 20, 25, 30, 40, 50, 65, 85, 110];
export const RQ = [0, 0, 0, 0, 50, 51, 52, 54, 56, 58, 60];
const LIM = [4, 7, 10];
// camada antiga, estimada pelo XP da curva anterior (básico 10–15, intermediário 20–35, avançado 40–60, ápice 70–110, domínio 150)
const OLD = [[10, 1], [15, 2], [20, 3], [25, 3.5], [30, 4], [35, 4.5], [40, 5], [45, 5.5], [50, 6], [55, 6.5], [60, 7], [70, 8], [80, 8.5], [90, 9], [110, 10], [150, 10]];
const oldLayer = xp => { if (xp <= 10) return 1; for (let i = 1; i < OLD.length; i++) if (xp <= OLD[i][0]) { const [x0, l0] = OLD[i - 1], [x1, l1] = OLD[i]; return l0 + (l1 - l0) * (xp - x0) / (x1 - x0); } return 10; };

const CTRL = new Set(['stun', 'sleep', 'para', 'frozen', 'possess', 'confuse', 'fear', 'silence', 'root', 'down', 'disarm']);
const DOT = new Set(['burn', 'bleed', 'poison', 'rad']);
const FXC = { push: .03, haste: .05, pierce: .1, vs: .08, brk: .08, exec: .15, drain: .12, chain: .15, seal: .1, det: .1, burst: .1, pop: .1, every: .1, shield: .1, spread: .1, strip: .08, steal: .15, cleanse: .06, sure: .06 };
const stCost = (k, ch) => (CTRL.has(k) ? .22 : DOT.has(k) ? .12 : .08) * ch / 100;
const items = fx => String(fx || '').split(';').map(x => x.trim()).filter(Boolean);
function fxCost(s) {
  let t = s.st ? stCost(s.st, 100) : 0;
  for (const f of items(s.fx)) { const w = f.split(/\s+/); if (w[0] === 'st') { const ch = w.find(x => x.endsWith('%')); if (!/\bself\b/.test(f)) t += stCost(w[1], ch ? parseInt(ch) : 100); else t += .06; } else t += FXC[w[0]] ?? .05; }
  return Math.min(t, .5);
}
// números de cada efeito que sobem e descem com a camada (o resto, como turnos e tipos, fica)
const NUM = { shield: [1], drain: [2], res: [2], gain: [2], lose: [2], revive: [1], clone: [2], push: [1], haste: [1], seal: [1], echo: [1], pierce: [1], exec: [1] };
const MUL = { vs: 2, det: 2, burst: 2, pop: 1, every: 2, chain: 2 };
const CAP = { echo: 100, pierce: 100, exec: 35, push: 80, haste: 60, drain: 60, revive: 60 };
const r2 = v => Math.round(v * 100) / 100;
function scaleFx(fx, f) {
  if (!fx) return fx;
  return items(fx).map(it => {
    const w = it.split(/\s+/), t = w[0];
    // índices das posições numéricas (alvo e chance ficam fora da contagem, como em RULES.parseFx)
    const pos = w.map((x, i) => [x, i]).filter(([x], i) => i && !['self', 'ally', 'foes', 'tgt'].includes(x) && !x.endsWith('%'));
    if (t === 'st') { const i = w.findIndex(x => x.endsWith('%')); if (i > 0 && !/\bself\b/.test(it)) w[i] = Math.max(10, Math.min(95, Math.round(parseInt(w[i]) * f / 5) * 5)) + '%'; }
    else if (NUM[t]) for (const k of NUM[t]) { const p = pos[k - 1]; if (p && !Number.isNaN(+p[0])) w[p[1]] = String(Math.max(1, Math.min(CAP[t] ?? 1e9, Math.round(+p[0] * f)))); }
    else if (MUL[t]) { const p = pos[MUL[t] - 1]; if (p && !Number.isNaN(+p[0])) { const m = +p[0]; w[p[1]] = String(t === 'chain' ? Math.min(.9, r2(m * Math.sqrt(f))) : r2(1 + (m - 1) * f)); } }
    return w.join(' ');
  }).join('; ');
}
const scaleKV = (str, f, keys) => str && String(str).split(';').map(x => x.trim()).filter(Boolean).map(it => {
  const w = it.split(/\s+/); if (keys && !keys.includes(w[0])) return it;
  const i = w.length - 1; if (!Number.isNaN(+w[i]) && w[0] !== 'dur' && w[0] !== 'dr' && w[0] !== 'end') w[i] = String(Math.round(+w[i] * f) || Math.sign(+w[i]));
  return w.join(' ');
}).join('; ');
const scaleDom = (d, f) => d && d.split(';').map(x => x.trim()).map(it => { const w = it.split(/\s+/); if ((w[0] === 'ally' || w[0] === 'foe') && !Number.isNaN(+w[2])) w[2] = String(Math.round(+w[2] * f) || Math.sign(+w[2])); return w.join(' '); }).join('; ');

// conceitos fortes: só da camada 7 em diante
const FORTE_NOME = /\b(Conjurar|Invoca[rç]|Clone|Clones|Cópia|Copiar|Reviver|Ressurrei|Imortal|Exército|Legião|Arsenal|Fábrica de Cópias|Parar o Tempo|Tempo Parado|Possess)/i;
export const forte = s => !ATUAIS.has(s.n) && (s.summon || (s.dom && !ATUAIS.has(s.n)) || s.aw || /\b(clone|revive|steal|turn|exec)\b/.test(s.fx || '') || /\bst possess\b/.test(s.fx || '') || s.st === 'possess' || FORTE_NOME.test(s.n));
// camadas 1–2: um efeito só (cargas, reações de combinação e ganho de recurso próprio não contam)
const LIVRE = new Set(['stack', 'gain', 'rs']);
// o efeito que o nome promete é o que fica (Muralha → escudo, Sangria → sangramento...)
const PROMETE = [[/quebra|rachar|partir/i, /^(brk|strip)|st defDn/], [/muralha|escudo|barreira|guarda|parede|couraça|proteg/i, /^(shield|guard)|st (defUp|guarded)/], [/sangr|hemorr/i, /st bleed/], [/fogo|chama|brasa|queim|incend/i, /st burn/],
  [/venen|tóxic|peçonh/i, /st poison/], [/trov|raio|relâmp|elétr|choque|paralis/i, /st para/], [/gelo|congel|gélid/i, /st frozen/], [/sono|ninar|dormir/i, /st sleep/], [/medo|terror|pavor/i, /st (fear|dread)/],
  [/cura|curar|sarar|regener/i, /^res |st regen/], [/empurr|repel|sopro|rajada/i, /^push/], [/marca/i, /st (marked|mark)|^brand/], [/atordo|tonto|zonz/i, /st stun/], [/derrub|rasteira|queda/i, /st down/], [/prend|raiz|enraiz|teia/i, /st root/], [/esquiv/i, /st evade/]];
function simplificar(s) {
  const fxs = items(s.fx), pr = PROMETE.find(([nm]) => nm.test(s.n)), alvo = pr && fxs.find(f => !LIVRE.has(f.split(/\s+/)[0]) && pr[1].test(f));
  let used = s.st && !alvo ? 1 : 0; const keep = [];
  if (alvo && s.st && !pr[1].test('st ' + s.st)) delete s.st;
  for (const f of fxs) { if (LIVRE.has(f.split(/\s+/)[0])) { keep.push(f); continue; } if (alvo ? f !== alvo : used) continue; used = 1; keep.push(f); }
  if (s.fx) s.fx = keep.join('; ') || undefined; if (!s.fx) delete s.fx;
  if (s.d) { const m = s.d.match(/^.*?[.!?](\s|$)/); if (m && m[0].length < s.d.length) s.d = m[0].trim(); }
}

function aplicar(s, L, idx) {
  s._xp0 ??= s.xp || 10; const L0 = oldLayer(s._xp0), f = Math.max(.5, Math.min(2, R ** (L - L0))), D = DANO(L);
  s.cam = L;
  if (s.k === 'dmg' || s.k === 'mental' || s.k === 'heal') {
    const h = s.hits || 1, area = s.area ? 1.4 : 1, ctF = Math.max(.8, Math.min(1.25, 1 + ((s.ct || 100) - 100) / 250));
    if (s.limit) s.p = Math.max(1, Math.round(D * 1.8 / (area * h)));
    else if (s.p || s.k !== 'mental') s.p = Math.max(1, Math.round(D * (1 - fxCost(s)) * ctF * (s.k === 'heal' ? .9 : 1) / (h * area)));
    if (!s.limit && s.c != null) s.c = Math.max(s.c ? 2 : 0, Math.round(D / 2.7 * (s.area ? 1.25 : 1) * (h > 1 ? 1.1 : 1)));
  } else if (s.p) s.p = Math.max(1, Math.round(s.p * f));
  if (s.k !== 'dmg' && s.k !== 'mental' && s.k !== 'heal' && s.c) s.c = Math.max(1, Math.round(s.c * Math.sqrt(f)));
  s.fx = scaleFx(s.fx, f); if (!s.fx) delete s.fx;
  if (s.rx) s.rx = scaleFx(s.rx, f);
  if (s.fm) s.fm = scaleKV(s.fm, f, ['atk', 'agi', 'def', 'hit', 'crit', 'heal', 'atkP']);
  if (s.mod) s.mod = scaleKV(s.mod, f, ['atk', 'def', 'hit', 'crit', 'agi', 'atkP', 'heal', 'esq']); if (s.bon) s.bon = scaleKV(s.bon, f, ['hpMax', 'auraMax', 'sanMax']);
  if (s.dom) s.dom = scaleDom(s.dom, f);
  let xp = XP[L]; if (s.duo) xp *= 1.3; if (s.trio) xp *= 1.5; if (s.summon || /\b(clone|revive)\b/.test(s.fx || '')) xp *= 1.2;
  if (s.limit) xp *= 1.5; if (s.aw) xp *= 1.3; if (s.dom && !ATUAIS.has(s.n)) xp = Math.max(xp * 1.3, L >= 8 ? 120 : 0);
  s.xp = Math.round(xp / 5) * 5;
  const rq = RQ[L] + (s.dom && !ATUAIS.has(s.n) ? 2 : 0);
  // requisito de atributo: só onde já havia um (a densidade de requisitos da árvore fica); o valor vem da camada
  if (s.rq) { if (!rq) delete s.rq; else s.rq = Object.fromEntries(Object.keys(s.rq).map(k => [k, rq])); }
  if (L >= 4 && idx) s.nb = Math.min(Math.floor((L - 1) / 2), idx); else delete s.nb;
  if (L <= 2) simplificar(s);
}

// ordena um ramo em casas fixas: a raiz fica; Limites em 4/7/10; o kit atual (com os `pre` dele no ramo) nas casas 1–5, a âncora
// (Canhão de Aura) na 5, domínios do kit na 5; fortes da 7 em diante; o resto preenche pelo nível antigo. Por fim, um `pre` que ficou
// depois de quem o pede troca de casa com ele, se a troca não tirar ninguém da faixa dele.
const ANCORA = { 'Canhão de Aura': 4 };
const LIMT = new Map(); // Limite → camada (4, 7 ou 10) pelo terço de poder dele dentro do setor
const terços = nos => { const ls = nos.filter(s => s.limit).sort((x, y) => (x.xp || 0) - (y.xp || 0)); ls.forEach((s, i) => LIMT.set(s, Math.max(forte(s) ? 7 : 0, LIM[Math.min(2, Math.floor(i * 3 / ls.length))]))); };
function ordenar(b, fixo) {
  const head = fixo ? b[0] : null, key = s => (s.xp || 0) + (s.limit ? .5 : 0), n = b.length, nm = new Map(b.map(s => [s.n, s]));
  const kit = new Set(b.filter(s => ATUAIS.has(s.n) && s !== head));
  for (let k = 0; k < 5; k++) for (const s of [...kit]) for (const p of String(s.pre || '').split('|')) if (nm.has(p) && nm.get(p) !== head) kit.add(nm.get(p));
  const rest = b.filter(s => s !== head).sort((x, y) => key(x) - key(y));
  const slot = new Array(n).fill(null); if (head) slot[0] = head;
  // cada grupo (já em ordem de nível) ocupa as casas livres da faixa dele em ordem crescente: ninguém mais caro fica antes de um mais barato
  const fill = (grp, lo, hi) => { for (const s of grp) { let i = -1; for (let j = Math.max(0, lo); j <= Math.min(n - 1, hi); j++) if (!slot[j]) { i = j; break; } if (i < 0) for (let j = n - 1; j >= 0; j--) if (!slot[j]) { i = j; break; } slot[i] = s; } };
  const faixa = s => s.n in ANCORA ? [ANCORA[s.n], ANCORA[s.n]] : kit.has(s) ? (s.dom ? [4, 4] : [0, 4]) : forte(s) ? [Math.min(6, n - 1), n - 1] : [0, n - 1];
  fill(rest.filter(s => s.n in ANCORA), 4, 4);
  fill(rest.filter(s => kit.has(s) && s.dom && !(s.n in ANCORA)), 4, 4);
  fill(rest.filter(s => kit.has(s) && !s.dom && !(s.n in ANCORA)), 0, 4);
  // Limites depois do kit, na casa do terço deles no setor (4, 7 ou 10); ocupada, vai para a próxima livre
  for (const s of rest.filter(s => s.limit && !kit.has(s))) { const w = Math.min(n, LIMT.get(s) ?? 4) - 1; fill([s], w, n - 1); }
  // fortes da 7 em diante, de trás para frente, para os comuns não ficarem sem casa no fim
  const fo = rest.filter(s => !slot.includes(s) && forte(s));
  { const casas = []; for (let j = n - 1; j >= Math.min(6, n - 1) && casas.length < fo.length; j--) if (!slot[j]) casas.unshift(j); fo.forEach((s, k) => { if (casas[k] != null) slot[casas[k]] = s; else fill([s], 0, n - 1); }); }
  fill(rest.filter(s => !slot.includes(s)), 0, n - 1);
  const ok = (s, i) => { const [lo, hi] = faixa(s); return s === head ? i === 0 : i >= lo && i <= hi; };
  for (let k = 0; k < n * 3; k++) {
    let moved = false;
    slot.forEach((s, i) => { for (const p of String(s.pre || '').split('|')) { const j = slot.findIndex(o => o.n === p); if (j > i && ok(slot[j], i) && ok(s, j)) { [slot[i], slot[j]] = [slot[j], slot[i]]; moved = true; } } });
    if (!moved) break;
  }
  for (const s of [...slot]) if (s.duo && s.duo !== s.n) { const j = slot.findIndex(o => o.n === s.duo), i = slot.indexOf(s); if (j > i + 1 && slot[j] !== head) { const [o] = slot.splice(j, 1); slot.splice(i + 1, 0, o); } }
  b.length = 0; b.push(...slot);
}
// no máximo 5 técnicas do kit atual por ramo (contando os `pre` delas): o excesso troca de lugar com um nó comum de outro ramo do setor
function espalharKit(bs) {
  const kitDe = b => { const nm = new Map(b.map(s => [s.n, s])), set = new Set(b.filter(s => ATUAIS.has(s.n)));
    for (let k = 0; k < 5; k++) for (const s of [...set]) for (const p of String(s.pre || '').split('|')) if (nm.has(p)) set.add(nm.get(p)); return set; };
  for (let guard = 0; guard < 200; guard++) {
    const cheio = bs.find(b => kitDe(b).size > 5); if (!cheio) return;
    const ks = kitDe(cheio), nm = new Set(cheio.map(s => s.pre || '').join('|').split('|'));
    const mover = [...ks].filter(s => ATUAIS.has(s.n) && !nm.has(s.n) && s !== cheio[0]).sort((x, y) => (y.xp || 0) - (x.xp || 0))[0]; if (!mover) return;
    const tm = temaNo(mover), alvo = bs.filter(b => b !== cheio && kitDe(b).size < 5).sort((x, y) => (temaNo(y[1] || y[0]) === tm) - (temaNo(x[1] || x[0]) === tm) || kitDe(x).size - kitDe(y).size)[0]; if (!alvo) return;
    const troca = alvo.filter((s, i) => i && !ATUAIS.has(s.n) && !s.limit && !s.duo && !forte(s) && !kitDe(alvo).has(s)).sort((x, y) => (x.xp || 0) - (y.xp || 0))[0];
    cheio.splice(cheio.indexOf(mover), 1); alvo.push(mover); if (troca) { alvo.splice(alvo.indexOf(troca), 1); cheio.push(troca); }
    for (const p of String(mover.pre || '').split('|')) { const pi = cheio.findIndex(s => s.n === p); if (pi > 0 && ATUAIS.has(p) === false) { /* o pre comum fica: o pedido atravessa ramos */ } }
  }
}

// fortes só cabem da casa 7 em diante (4 por ramo de 10): o excesso troca com o nó comum mais fraco de um ramo do setor com casa sobrando
function espalharFortes(bs, cabeca = new Set()) {
  const cap = b => Math.max(0, b.length - 6), fs = b => b.filter(s => forte(s) && !cabeca.has(s));
  for (let guard = 0; guard < 300; guard++) {
    const cheio = bs.find(b => fs(b).length > cap(b)); if (!cheio) return;
    const mover = fs(cheio).sort((x, y) => (x.xp || 0) - (y.xp || 0))[0];
    const alvo = bs.filter(b => b !== cheio && fs(b).length < cap(b)).sort((x, y) => (cap(y) - fs(y).length) - (cap(x) - fs(x).length))[0]; if (!alvo) return;
    const troca = alvo.filter(s => !cabeca.has(s) && !forte(s) && !ATUAIS.has(s.n) && !s.limit && !s.duo).sort((x, y) => (x.xp || 0) - (y.xp || 0))[0]; if (!troca) return;
    cheio.splice(cheio.indexOf(mover), 1, troca); alvo.splice(alvo.indexOf(troca), 1, mover);
  }
}

// ramos acima de 10: o excesso (os mais fortes) vai para o ramo curto de mesmo tema do setor; sem vaga, abre um ramo novo
function caber(bs, fixos) {
  const tema = b => { const c = [0, 0, 0, 0, 0]; b.forEach(s => c[temaNo(s)]++); return c.indexOf(Math.max(...c)); };
  const sobra = [];
  for (const b of bs) if (b.length > CAM) { const head = fixos.has(b) ? b[0] : null, pode = b.filter(s => s !== head && !ATUAIS.has(s.n)).sort((x, y) => (y.xp || 0) - (x.xp || 0)).slice(0, b.length - CAM); for (const s of pode) b.splice(b.indexOf(s), 1); sobra.push(...pode); }
  const novos = [];
  for (const s of sobra) {
    const tm = temaNo(s), alvo = [...bs, ...novos].filter(b => !fixos.has(b) && b.length < CAM).sort((x, y) => (tema(y) === tm) - (tema(x) === tm) || x.length - y.length)[0];
    if (alvo) alvo.push(s); else novos.push([s]);
  }
  return novos;
}

export const VAGAS = [];
const temaDe = b => { const c = [0, 0, 0, 0, 0]; b.forEach(s => c[temaNo(s)]++); return ['ofensiva', 'controle', 'defesa', 'maestria', 'especial'][c.indexOf(Math.max(...c))]; };
const vaga = (el, ramo, b, tema) => { if (b.length < CAM) VAGAS.push({ el, ramo, tem: b.length, faltam: Array.from({ length: CAM - b.length }, (_, k) => b.length + k + 1), tema: tema || temaDe(b) }); };
export function camadas(TREE, preencher) {
  VAGAS.length = 0;
  const plano = []; // [nó, camada, casa]: primeiro decide tudo, depois aplica (duplas acertam a camada juntas)
  const layerOf = new Map(), marca = (s, L, i) => { plano.push([s, L, i]); layerOf.set(s.n, L); };
  for (const [el, t] of Object.entries(TREE)) {
    if (el === 'armas') continue;
    const fixos = new Set(el === 'marcial' ? t.branches.slice(0, 2) : []), raiz = el === 'marcial' ? null : t.branches[0];
    const comuns = t.branches.filter(b => !b.de && !fixos.has(b)), linhas = t.branches.filter(b => b.de);
    terços(comuns.flat());
    const novos = caber(comuns, new Set(raiz ? [raiz] : []));
    espalharKit([...comuns, ...novos]);
    espalharFortes([...comuns, ...novos], new Set(raiz ? [raiz[0]] : []));
    t.branches = [...t.branches.filter(b => !b.de), ...novos, ...linhas];
    preencher?.(el, t.branches.filter(b => !b.de && !fixos.has(b))); // casas livres (arvore/leva9.js)
    for (const b of fixos) b.forEach(s => marca(s, 1, 0));
    t.branches.forEach((b, bi) => { if (b.de || fixos.has(b)) return; ordenar(b, b === raiz); b.forEach((s, i) => marca(s, i + 1, i)); vaga(el, bi, b); });
  }
  // Árvore de Armas: cada tipo tem 3 ramos (o 1º leva o nome do tipo); o excesso passa para o irmão mais curto; os primordiais só ordenam
  const A = TREE.armas;
  terços([...Object.values(A.prim), ...Object.values(A.tipos).flat()].flat());
  for (const [cat, b] of Object.entries(A.prim)) { ordenar(b, true); b.forEach((s, i) => marca(s, i + 1, i)); vaga('armas', 'prim-' + cat, b, 'arma: ' + cat); }
  for (const [wt, brs] of Object.entries(A.tipos)) {
    for (const b of brs) if (b.length > CAM) { const head = b[0], tail = b.slice(1).sort((x, y) => (x.xp || 0) - (y.xp || 0)); b.length = 0; b.push(head, ...tail); const ex = b.splice(CAM); for (const s of ex) brs.filter(o => o !== b).sort((x, y) => x.length - y.length)[0].push(s); }
    espalharFortes(brs, new Set([brs[0][0]]));
    brs.forEach((b, j) => { ordenar(b, j === 0); b.forEach((s, i) => marca(s, i + 1, i)); vaga('armas', wt + '-' + j, b, 'arma: ' + wt); });
  }
  // linhas de variação: base + 1; combinação de Vínculos (v2), + 2; fortes no mínimo na 7
  for (const t of Object.values(TREE)) for (const b of t.branches) if (b.de) {
    const L0 = layerOf.get(b.de) ?? 1;
    b.forEach(s => { const L = Math.min(CAM, L0 + (s.v2 ? 2 : 1)); marca(s, forte(s) ? Math.max(L, 7) : L, 0); });
  }
  for (const [s, L, i] of plano) aplicar(s, L, i);
  for (const [s] of plano) delete s._xp0;
  return VAGAS;
}

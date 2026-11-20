// Camadas (18/11/2026): último passe de tree.js. A posição no ramo É a camada (1 = começo, 10 = ponta) e a camada define o poder.
// Âncora: o Canhão de Aura (dano médio-alto) fica no meio da curva. Curva crescente moderada: dano 9 na camada 1 até ~54 na 10.
// Dentro de uma camada tudo é comparado por orçamento: o dano-base da camada paga o dano, a área, os golpes extras e os efeitos
// (tabela FXC); o tempo de recarga (ct) mais lento devolve orçamento. Formas, passivas e utilitários sobem pelos números delas.
// Regras de posição: ramos de até 10 nós; o kit atual dos personagens (ATUAIS) fica nas camadas 1–5; conceitos fortes
// (clones, armas criadas, invocações, reviver, controle absoluto, domínios plenos) ficam da 7 em diante; Limites nas camadas 4, 7 e 10;
// ninguém antes do próprio `pre`. Linhas de variação (ramo com `de`): camada da base + 1 (combinação de Vínculos, + 2).
// Camadas 1–2: um efeito só e texto de uma frase. As casas que faltam para um ramo chegar a 10 são as VAGAS da próxima leva.
import { ATUAIS } from './atuais.js';
import { ANCORAS } from './ancoras.js';
import { VINC } from './vinculos.js';
import { MEIO } from './leva11.js';
import { temaNo } from './ordem.js';
import '../public/rules.js';
import '../public/armas.js';

export const CAM = 10;
const R = (54 / 9) ** (1 / 9); // ~1,22 por camada
export const DANO = L => 9 * R ** (L - 1);
export const XP = [0, 10, 15, 20, 25, 30, 40, 50, 65, 85, 110];
function encarecer(s, pai) {
  if (!pai) return;
  s.xp = Math.max(s.xp, pai.xp + 5);
  for (const nen of globalThis.RULES.NEN) {
    const minimo = globalThis.RULES.xpCost({ nen }, pai) + 5;
    if (globalThis.RULES.xpCost({ nen }, s) < minimo) (s.xpMinNen ??= {})[nen] = minimo;
  }
}
export const RQ = [0, 0, 0, 0, 50, 51, 52, 54, 56, 58, 60];
const LIM = [4, 7, 10];
const KIT = new Set([...ATUAIS, ...ANCORAS]);
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
const MUL = { vs: 2, det: 2, burst: 2, pop: 1, every: 2, chain: 2, solo: 1 };
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
export const forte = s => !KIT.has(s.n) && (s.summon || (s.dom && !KIT.has(s.n)) || s.aw || /\b(clone|revive|steal|turn|exec)\b/.test(s.fx || '') || /\bst possess\b/.test(s.fx || '') || s.st === 'possess' || FORTE_NOME.test(s.n));
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
  if (s.limit) xp *= 1.5; if (s.aw) xp *= 1.3; if (s.dom && !KIT.has(s.n)) xp = Math.max(xp * 1.3, L >= 8 ? 120 : 0);
  s.xp = Math.round(xp / 5) * 5;
  const rq = RQ[L] + (s.dom && !KIT.has(s.n) ? 2 : 0);
  // requisito de atributo: só onde já havia um (a densidade de requisitos da árvore fica); o valor vem da camada
  if (s.rq) { if (!rq) delete s.rq; else s.rq = Object.fromEntries(Object.keys(s.rq).map(k => [k, rq])); }
  if (L >= 4 && idx) s.nb = Math.min(Math.floor((L - 1) / 2), idx); else delete s.nb;
  if (L <= 2) simplificar(s);
}

// ordena um ramo em casas fixas: a raiz fica; Limites em 4/7/10; o kit atual (com os `pre` dele no ramo) nas casas 1–5, a âncora
// (Canhão de Aura) na 5, domínios do kit na 5; fortes da 7 em diante; o resto preenche pelo nível antigo. Por fim, um `pre` que ficou
// depois de quem o pede troca de casa com ele, se a troca não tirar ninguém da faixa dele.
const ANCORA = { 'Canhão de Aura': 4, 'Canhão de Aura Gélido': 5, 'Aura de Navalha': 6 }; // o Gélido evolui do Canhão: casa 6 (única exceção à faixa 1–5 do kit)
const LIMT = new Map(); // Limite → camada (4, 7 ou 10) pelo terço de poder dele dentro do setor
const terços = nos => { const ls = nos.filter(s => s.limit).sort((x, y) => (x.xp || 0) - (y.xp || 0)); ls.forEach((s, i) => LIMT.set(s, Math.max(forte(s) ? 7 : 0, LIM[Math.min(2, Math.floor(i * 3 / ls.length))]))); };
// Impressão semântica usada para ordenar técnicas de função próxima dentro do mesmo ramo.
// A camada continua limitada pelo custo e pelas regras de kit, Limite, técnicas fortes e pré-requisitos.
const familia = s => {
  const out = new Set([`k:${s.k}`]);
  for (const f of String(s.fx || '').split(';').map(x => x.trim()).filter(Boolean)) {
    const w = f.split(/\s+/); if (!w[0]) continue;
    out.add(`fx:${w[0]}`); if (w[0] === 'st' && w[1]) out.add(`st:${w[1]}`);
  }
  if (s.st) out.add(`st:${s.st}`);
  if (s.req) out.add(`req:${s.req}`);
  if (s.cat) out.add(`cat:${s.cat}`);
  if (s.rea) out.add(`rea:${s.rea.t || s.rea}`);
  if (s.form || s.fm) out.add('special:form');
  if (s.dom) out.add('special:domain');
  if (s.duo || s.trio) out.add('special:team');
  if (s.summon) out.add('special:summon');
  const words = `${s.n} ${s.d || ''}`.toLocaleLowerCase('pt-BR');
  for (const [tag, re] of [
    ['fire', /fogo|chama|brasa|incend|ígneo|ígnea|calor|fornalha/],
    ['water', /água|maré|mar|onda|chuva|gelo|geada|neve|frio/],
    ['lightning', /raio|trovão|elétr|faísca|choque/],
    ['blood', /sangue|sangr|hemorr|venoso|vida/],
    ['shadow', /sombra|escuro|treva|lua negra|ilusão|medo/],
    ['guard', /guarda|escudo|muralha|barreira|proteg|defesa|aparar|bloque/],
    ['mobility', /passo|corrida|investida|esquiva|veloz|rápido|movimento/],
    ['ritual', /ritual|círculo|sigilo|grimório|relíquia|pacto/],
    ['summon', /invoc|conjur|familiar|clone|cópia|legião/],
    ['support', /cura|curar|restaur|socorro|reerguer|reviver|ressuscit/],
    ['weapon', /lâmina|espada|corte|estocada|lança|tiro|bala|flecha|punho|soco|chute|martelo/],
  ]) if (re.test(words)) out.add(`theme:${tag}`);
  if (s.area) out.add('shape:area');
  if ((s.hits || 1) > 1) out.add('shape:multi');
  return out;
};
const proximidade = (a, b) => {
  if (!a || !b) return 0;
  const A = familia(a), B = familia(b); let same = 0;
  for (const x of A) if (B.has(x)) same++;
  return same / Math.max(1, A.size + B.size - same);
};
function ordenar(b, fixo) {
  const head = fixo ? b[0] : null, key = s => (s.xp || 0) + (s.limit ? .5 : 0), n = b.length, nm = new Map(b.map(s => [s.n, s]));
  const kit = new Set(b.filter(s => KIT.has(s.n) && s !== head));
  for (let k = 0; k < 5; k++) for (const s of [...kit]) for (const p of String(s.pre || '').split('|')) if (nm.has(p) && nm.get(p) !== head) kit.add(nm.get(p));
  const rest = b.filter(s => s !== head).sort((x, y) => key(x) - key(y));
  const slot = new Array(n).fill(null); if (head) slot[0] = head;
  // Cada grupo ocupa sua faixa de camadas. A proximidade temática desempata custos próximos,
  // preservando avanço gradual e formando sequências reconhecíveis de ataque, controle ou suporte.
  const fill = (grp, lo, hi) => {
    const todo = [...grp].sort((x, y) => key(x) - key(y)); let prev = head;
    while (todo.length) {
      const min = key(todo[0]);
      const pool = todo.filter(s => key(s) <= min + 15);
      pool.sort((x, y) => proximidade(prev, y) - proximidade(prev, x) || key(x) - key(y));
      const s = pool[0], at = todo.indexOf(s); todo.splice(at, 1);
      let i = -1; for (let j = Math.max(0, lo); j <= Math.min(n - 1, hi); j++) if (!slot[j]) { i = j; break; }
      if (i < 0) for (let j = n - 1; j >= 0; j--) if (!slot[j]) { i = j; break; }
      slot[i] = s; prev = s;
    }
  };
  // Skills já usadas pelos personagens ocupam as primeiras casas do ramo (após a raiz).
  // A ordem interna é XP crescente, preservando os pré-requisitos explícitos.
  const faixa = s => s.n in ANCORA ? [ANCORA[s.n], ANCORA[s.n]] : kit.has(s) ? [0, Math.min(4, n - 1)] : forte(s) ? [Math.min(6, n - 1), n - 1] : [0, n - 1];
  for (const [nome, casa] of Object.entries(ANCORA)) fill(rest.filter(s => s.n === nome), casa, casa);
  fill(rest.filter(s => kit.has(s) && s.dom && !(s.n in ANCORA)), 0, Math.min(4, n - 1));
  fill(rest.filter(s => kit.has(s) && !s.dom && !(s.n in ANCORA)), 0, Math.min(4, n - 1));
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
  const kitDe = b => { const nm = new Map(b.map(s => [s.n, s])), set = new Set(b.filter(s => KIT.has(s.n)));
    for (let k = 0; k < 5; k++) for (const s of [...set]) for (const p of String(s.pre || '').split('|')) if (nm.has(p)) set.add(nm.get(p)); return set; };
  for (let guard = 0; guard < 200; guard++) {
    const cheio = bs.find(b => kitDe(b).size > 5); if (!cheio) return;
    const ks = kitDe(cheio), nm = new Set(cheio.map(s => s.pre || '').join('|').split('|'));
    const mover = [...ks].filter(s => KIT.has(s.n) && !nm.has(s.n) && s !== cheio[0]).sort((x, y) => (y.xp || 0) - (x.xp || 0))[0]; if (!mover) return;
    const tm = temaNo(mover), alvo = bs.filter(b => b !== cheio && kitDe(b).size < 5).sort((x, y) => (temaNo(y[1] || y[0]) === tm) - (temaNo(x[1] || x[0]) === tm) || kitDe(x).size - kitDe(y).size)[0]; if (!alvo) return;
    const troca = alvo.filter((s, i) => i && !KIT.has(s.n) && !s.limit && !s.duo && !forte(s) && !kitDe(alvo).has(s)).sort((x, y) => (x.xp || 0) - (y.xp || 0))[0];
    cheio.splice(cheio.indexOf(mover), 1); alvo.push(mover); if (troca) { alvo.splice(alvo.indexOf(troca), 1); cheio.push(troca); }
    for (const p of String(mover.pre || '').split('|')) { const pi = cheio.findIndex(s => s.n === p); if (pi > 0 && !KIT.has(p)) { /* o pre comum fica: o pedido atravessa ramos */ } }
  }
}

// fortes só cabem da casa 7 em diante (4 por ramo de 10): o excesso troca com o nó comum mais fraco de um ramo do setor com casa sobrando
function espalharFortes(bs, cabeca = new Set()) {
  const cap = b => Math.max(0, b.length - 6), fs = b => b.filter(s => forte(s) && !cabeca.has(s));
  for (let guard = 0; guard < 300; guard++) {
    const cheio = bs.find(b => fs(b).length > cap(b)); if (!cheio) return;
    const mover = fs(cheio).sort((x, y) => (x.xp || 0) - (y.xp || 0))[0];
    const alvo = bs.filter(b => b !== cheio && fs(b).length < cap(b)).sort((x, y) => (cap(y) - fs(y).length) - (cap(x) - fs(x).length))[0]; if (!alvo) return;
    const troca = alvo.filter(s => !cabeca.has(s) && !forte(s) && !KIT.has(s.n) && !s.limit && !s.duo).sort((x, y) => (x.xp || 0) - (y.xp || 0))[0]; if (!troca) return;
    cheio.splice(cheio.indexOf(mover), 1, troca); alvo.splice(alvo.indexOf(troca), 1, mover);
  }
}

// ramos acima de 10: o excesso (os mais fortes) vai para o ramo curto de mesmo tema do setor; sem vaga, abre um ramo novo
function caber(bs, fixos) {
  const tema = b => { const c = [0, 0, 0, 0, 0]; b.forEach(s => c[temaNo(s)]++); return c.indexOf(Math.max(...c)); };
  const sobra = [];
  for (const b of bs) if (b.length > CAM) { const head = fixos.has(b) ? b[0] : null, pode = b.filter(s => s !== head && !KIT.has(s.n)).sort((x, y) => (y.xp || 0) - (x.xp || 0)).slice(0, b.length - CAM); for (const s of pode) b.splice(b.indexOf(s), 1); sobra.push(...pode); }
  const novos = [];
  for (const s of sobra) {
    const tm = temaNo(s), alvo = [...bs, ...novos].filter(b => !fixos.has(b) && b.length < CAM).sort((x, y) => (tema(y) === tm) - (tema(x) === tm) || x.length - y.length)[0];
    if (alvo) alvo.push(s); else novos.push([s]);
  }
  return novos;
}

export const VAGAS = [];
const FLAT = new Map(); // passivas do 1º ramo do Marcial: mantêm o bônus de sempre
const TREINO = new Set(); // Treinos de atributo: o bônus sobe devagar com a camada, não pela curva de dano
const FINAL = /(Supremo|Suprema|Primordial|Sem Limite|Definitivo|Final)$/;

// Evolução lógica (Leva 12): a técnica-base vem antes das variações do próprio nome (X → X Dupla → X Detonador → X Supremo).
// Se a variação caiu numa camada igual ou menor que a da base (mesmo ramo ou ramos diferentes do setor), as duas trocam de casa.
// Fora da troca ficam a raiz do setor, o kit atual, Limites, fortes, domínios, duplas/trios e invocações. Só vale em ramos sem `de`.
// Pares curados [base, variação] que o sufixo do nome não revela. A variação nunca fica abaixo da base (Leva 12).
export const PARES = [
  ['Halo', 'Halo Purificador'], ['Julgamento', 'Julgamento Solar'], ['Julgamento', 'Julgamento do Sol'],
  ['Carapaça', 'Carapaça Crescida'], ['Carapaça', 'Carapaça Súbita'], ['Carapaça', 'Couraça Quitinosa'],
  ['Mutação Comum', 'Mutação Defensiva'], ['Mutação Comum', 'Mutação Acumulada'], ['Mutação Comum', 'Mutação Hemorrágica'],
  ['Meia-Vida', 'Ritual: Meia-Vida Acelerada'], ['Raio Fraco', 'Raio Gama'], ['Raio Fraco', 'Raio Mutagênico'], ['Raio Fraco', 'Raio Gama Concentrado'],
  ['Regeneração Lenta', 'Regeneração Selvagem'], ['Regeneração Lenta', 'Regenerar Membro'],
  ['Fornalha', 'Grande Fornalha de Kagutsuchi'],
  ['Hemorragia Interna', 'Hemorragia Forçada'], ['Hemorragia Forçada', 'Hemorragia Final'], ['Hemorragia Total', 'Hemorragia Final'],
  ['Maré Rubra: Shukketsu', 'Ritual: Maré Escarlate Eterna'],
  ['Rajada de Estilhaços', 'Chuva de Estilhaços'],
  ['Reflexo Elétrico', 'Reflexo Elétrico Puro'],
  ['Ritual: Condenação', 'Ritual: Condenação Eterna'], ['Exorcismo Sumário', 'Ritual: Grande Exorcismo'],
  ['Sombra Gêmea', 'Lâmina da Sombra Gêmea'], ['Clone de Sombra', 'Clones de Sombra'], ['Sono Reparador', 'Sono Que Refaz'],
  ['Tsunami Contido', 'Tsunami Sem Fim'],
  // Armas
  ['Dança das Seis Lâminas', 'Dança das Doze Lâminas'], ['Cem Socos', 'Cem Socos Largos'], ['Cem Socos Largos', 'Mil Socos'],
  ['Respiração Contada', 'Pulmão Parado'], ['Pulmão Parado', 'Atirador de Elite'], ['Atirador de Elite', 'Tiro do Século'], ['Tiro do Século', 'Tiro de Dois Quilômetros'],
  ['Carga da Falange', 'Carga Final'], ['Superfície Polida', 'Espelho Refletor'], ['Superfície Polida', 'Salão dos Mil Reflexos'],
  ['Chicote de Domador', 'Açoite do Tirano'], ['Chicote de Domador', 'Mil Estalos'], ['Nuvem de Shuriken', 'Mil Lâminas Noturnas'],
  ['Flecha Dupla', 'Flecha Atravessadora'], ['Salva de Flechas', 'Três Flechas na Corda'], ['Manivela e Trava', 'Trava Perfeita'], ['Besta de Cerco', 'Virote de Cerco'],
  ['Lenhador de Homens', 'Fúria do Berserker'], ['Braço de Muralha', 'Muralha de Carne'], ['Braço de Muralha', 'Muralha Que Anda'], ['Braço de Muralha', 'Cidadela Viva'],
  ['Duelo de Sabres', 'Estilo Três Espadas'],
];
export const EVOLUCOES = [];
const SUFIXO = /^(Dupla|Duplo|Tripla|Triplo|Total|Plena|Pleno|Absoluto|Absoluta|Supremo|Suprema|Final|Perfeito|Perfeita|Gigante|Largo|Larga|Detonador|Detonadora|Infinita|Infinito|Em Cadeia|Em Todos|Que .+|Acumulada|Acumulado|Retardada|Dividida|Calcinante|Certeiro|Sangrento|Sangrenta)$/;
// variações de nome que são outra ideia (ou cuja base já está na camada 10 / é do kit): ficam como estão
export const EVOL_EXCECAO = new Set(['Faísca Acumulada', 'Graça Absoluta', 'Ressurreição Plena', 'Praga Total', 'Arsenal Infinito']);
export const baseDe = (nome, nomes) => { let b = null; for (const k of nomes) if (nome.startsWith(k + ' ') && SUFIXO.test(nome.slice(k.length + 1)) && (!b || k.length > b.length)) b = k; return b; };
function evoluir(el, ramos, linhas, raiz, plano, layerOf) {
  const livre = new Map();
  ramos.forEach((b, bi) => { b.forEach((s, i) => livre.set(s.n, { b, bi, i, s, raiz: b === raiz })); });
  const deps = new Map();
  for (const x of livre.values()) for (const p of String(x.s.pre || '').split('|')) if (p && !/^Aperfeiçoamento/.test(p)) (deps.get(p) ?? deps.set(p, []).get(p)).push(x.s.n);
  const linha = new Map(linhas.map(b => [b.de, b.length])); // a linha precisa chegar à camada 10: base mais baixa pede mais nós
  const preso = x => x.i === 0 || x.raiz || KIT.has(x.s.n) || x.s.limit || forte(x.s) || x.s.dom || x.s.duo || x.s.trio || x.s.summon || x.s.aw;
  const bom = (n, L) => { if (linha.has(n) && L + linha.get(n) < CAM) return false; for (const p of String(livre.get(n)?.s.pre || '').split('|')) if (p && layerOf.has(p) && layerOf.get(p) >= L) return false; for (const d of deps.get(n) || []) if (layerOf.has(d) && layerOf.get(d) <= L) return false; return true; };
  const trocar = (x, y) => { // x e y trocam de casa e de camada, se nenhuma regra (pré-requisitos, linha até a 10, kit, fortes) quebrar
    if (preso(x) || preso(y) || x.s === y.s) return false;
    const lx = layerOf.get(x.s.n), ly = layerOf.get(y.s.n);
    layerOf.set(x.s.n, ly); layerOf.set(y.s.n, lx);
    if (!bom(x.s.n, ly) || !bom(y.s.n, lx)) { layerOf.set(x.s.n, lx); layerOf.set(y.s.n, ly); return false; }
    const ex = plano.find(e => e[0] === x.s), ey = plano.find(e => e[0] === y.s);
    [ex[1], ey[1]] = [ey[1], ex[1]]; [ex[2], ey[2]] = [ey[2], ex[2]];
    x.b[x.i] = y.s; y.b[y.i] = x.s; [x.b, y.b] = [y.b, x.b]; [x.i, y.i] = [y.i, x.i]; [x.bi, y.bi] = [y.bi, x.bi];
    return true;
  };
  for (let volta = 0; volta < 4; volta++) {
    let mexeu = false;
    const pares = [...livre.values()].map(v => [v, baseDe(v.s.n, livre.keys())]).filter(([, b]) => b).map(([v, b]) => [v, livre.get(b)]);
    for (const [a, b] of PARES) if (livre.has(a) && livre.has(b)) pares.push([livre.get(b), livre.get(a)]);
    for (const [v, B] of pares) {
      if (!B || v.s === B.s || EVOL_EXCECAO.has(v.s.n)) continue;
      const lv = layerOf.get(v.s.n), lb = layerOf.get(B.s.n); if (lv > lb) continue;
      const nome = `${el}: ${B.s.n} antes de ${v.s.n}`;
      // 1) troca direta; 2) a variação sobe trocando com um nó livre de camada acima da base; 3) a base desce trocando com um nó livre abaixo da variação
      if (lv < lb && trocar(v, B)) { EVOLUCOES.push(nome); mexeu = true; continue; }
      const todos = [...livre.values()].filter(y => y !== v && y !== B);
      const sobe = todos.filter(y => layerOf.get(y.s.n) > lb).sort((x, y) => layerOf.get(x.s.n) - layerOf.get(y.s.n));
      if (sobe.some(y => trocar(v, y))) { EVOLUCOES.push(nome + ' (variação sobe)'); mexeu = true; continue; }
      const desce = todos.filter(y => layerOf.get(y.s.n) < lv).sort((x, y) => layerOf.get(y.s.n) - layerOf.get(x.s.n));
      if (desce.some(y => trocar(B, y))) { EVOLUCOES.push(nome + ' (base desce)'); mexeu = true; }
    }
    if (!mexeu) break;
  }
}
export const LINHAS = []; // linhas de variação que não chegam à camada 10 (a Leva 10 completa todas)
const temaDe = b => { const c = [0, 0, 0, 0, 0]; b.forEach(s => c[temaNo(s)]++); return ['ofensiva', 'controle', 'defesa', 'maestria', 'especial'][c.indexOf(Math.max(...c))]; };
const vaga = (el, ramo, b, tema) => { if (b.length < CAM) VAGAS.push({ el, ramo, tem: b.length, faltam: Array.from({ length: CAM - b.length }, (_, k) => b.length + k + 1), tema: tema || temaDe(b) }); };
export function camadas(TREE, preencher) {
  VAGAS.length = 0; EVOLUCOES.length = 0;
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
    for (const b of fixos) b.forEach((s, i) => { marca(s, i + 1, 0); if (b === t.branches[1]) TREINO.add(s); else if (s.k === 'passive') FLAT.set(s, [s.p, s.xp]); }); // ramos iniciais do Marcial: a posição também é a camada
    t.branches.forEach((b, bi) => { if (b.de || fixos.has(b)) return; ordenar(b, b === raiz); b.forEach((s, i) => marca(s, i + 1, i)); vaga(el, bi, b); });
    evoluir(el, t.branches.filter(b => !b.de && !fixos.has(b)), t.branches.filter(b => b.de), raiz, plano, layerOf);
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
  evoluir('armas', [...Object.values(A.prim), ...Object.values(A.tipos).flat()], [], new Set(), plano, layerOf);
  // linhas de variação: começam na camada da base + 1 (combinação de Vínculos, v2, + 2) e sobem uma camada por nó até a 10.
  // Cada Vínculo secundário abre um caminho próprio a partir do tronco comum.
  LINHAS.length = 0;
  for (const [el, t] of Object.entries(TREE)) for (const [bi, b] of t.branches.entries()) if (b.de) {
    const L0 = layerOf.get(b.de) ?? 1, min = s => Math.max(L0 + (s.v2 ? 2 : 1), forte(s) ? 7 : 0), rest = [...b].sort((x, y) => KIT.has(y.n) - KIT.has(x.n) || FINAL.test(x.n) - FINAL.test(y.n)), ord = []; // o nó final da linha (Supremo, Primordial...) fica por último
    while (rest.length) {
      const c = Math.min(CAM, L0 + 1 + ord.length), i = rest.findIndex(s => min(s) <= c), s = rest.splice(i < 0 ? rest.reduce((m, x, k) => min(x) < min(rest[m]) ? k : m, 0) : i, 1)[0];
      ord.push(s);
    }
    b.length = 0; b.push(...ord);
    let tronco = b.de;
    const pontas = new Map();
    b.forEach((s, i) => {
      marca(s, Math.max(min(s), Math.min(CAM, L0 + 1 + i)), 0);
      s.pre = pontas.get(s.v2) ?? tronco;
      if (s.v2) pontas.set(s.v2, s.n);
      else tronco = s.n;
    });
    if (L0 + b.length < CAM) LINHAS.push({ el, ramo: bi, base: b.de, tem: b.length, faltam: CAM - L0 - b.length });
  }
  for (const [s, L, i] of plano) aplicar(s, L, i);
  for (const [s, [p, xp]] of FLAT) { s.p = p; s.xp = xp; }
  for (const s of TREINO) s.p = s.pas === 'hpMax' ? 10 + 2 * s.cam : s.pas === 'auraMax' ? 8 + s.cam : 5 + Math.floor((s.cam - 1) / 3);
  for (const [s] of plano) delete s._xp0;
  ligarRamos(TREE);
  return VAGAS;
}

// A montagem da grade e o preço usam a mesma árvore de pais.
export const PAIS = new Map();
export const REFINOS = new Map();
function ligarRamos(tree) {
  PAIS.clear();
  REFINOS.clear();
  const porNome = new Map(), centro = tree.marcial.branches[0][0];
  const raizesAbertas = new Set(Object.values(tree).map(t => t.branches[0][0]));
  function ligar(s, pai) {
    porNome.set(s.n, s);
    if (!pai) return;
    PAIS.set(s.n, pai.n);
  }
  function caminho(grupo, entrada, bifurca, pontaB, bases = []) {
    let tronco = entrada;
    const pontas = new Map(), profundidade = new Map();
    const misto = grupo.some(s => s.v2 || s.ex);
    const escolhas = new Map();
    grupo.forEach((s, i) => {
      let pai = tronco;
      if (misto && s.v2) pai = pontas.get(s.v2) ?? tronco;
      if (s.ex && escolhas.has(s.ex)) pai = escolhas.get(s.ex);
      // Uma combinação avançada sem antecessor local parte de uma técnica
      // comum da camada anterior, escolhida pelo efeito e pela ideia do nó.
      if (misto && !escolhas.has(s.ex) && pai === entrada && s.cam > 2) {
        const candidatas = bases.filter(base => base.cam === s.cam - 1);
        candidatas.sort((a, b) => proximidade(s, b) - proximidade(s, a));
        pai = candidatas[0] ?? pai;
      }
      if (!misto && bifurca && grupo.length === 10) {
        if (i === 7) pai = grupo[3];
        if (i === 9 && !pontaB) pai = grupo[6];
      }
      ligar(s, pai);
      const anteriores = pai && profundidade.has(pai) ? profundidade.get(pai) + 1 : 0;
      profundidade.set(s, anteriores);
      if (s.nb > anteriores) {
        if (anteriores) s.nb = anteriores;
        else delete s.nb;
      }
      if (s.ex) escolhas.set(s.ex, pai);
      else if (s.v2) pontas.set(s.v2, s);
      else tronco = s;
    });
  }
  for (const [el, t] of Object.entries(tree)) {
    if (el === 'armas') continue;
    const raiz = t.branches[0][0];
    const bases = t.branches.filter(b => !b.de && b.every(s => !s.v2)).flat()
      .filter(s => !s.pre && !s.req && !s.ex && !s.aw && !s.limit);
    t.branches.forEach((b, i) => {
      if (b.de) return;
      if (el === 'marcial' && !i) {
        caminho(b, null, false);
        return;
      }
      const entrada = i ? raiz : centro;
      const grupos = el !== 'marcial' && b.every(s => s.req)
        ? Object.values(b.reduce((g, s) => { (g[s.req] ??= []).push(s); return g; }, {})) : [b];
      for (const grupo of grupos) caminho(grupo, entrada, el !== 'marcial' && grupos.length === 1, i > 0 && i % 2 === 0, bases);
    });
  }
  for (const b of Object.values(tree.armas.prim)) caminho(b, null, false);
  for (const [tipo, ramos] of Object.entries(tree.armas.tipos)) {
    const categoria = Object.keys(globalThis.ARMAS.CAT).find(k => globalThis.ARMAS.CAT[k].includes(tipo));
    const entrada = tree.armas.prim[categoria]?.[0];
    ramos.forEach((b, i) => caminho(b, entrada, i === 0));
  }
  for (const t of Object.values(tree)) for (const b of t.branches) {
    if (b.de) for (const s of b) ligar(s, porNome.get(s.pre));
  }
  // Uma melhoria por técnica-base, compartilhada pelas saídas que passam pelo mesmo treino.
  // Os refinos publicados vêm primeiro para que os seus IDs continuem estáveis nas fichas.
  const marcos = new Set([...porNome.values()].filter(s => [4, 7, 10].includes(s.cam) && !KIT.has(s.n)));
  const intervalos = Object.keys(VINC).flatMap(el => {
    const tecnicas = tree[el].branches.flat();
    const nomes = new Set(tecnicas.map(s => s.n));
    return tecnicas.filter(s => !marcos.has(s) && nomes.has(PAIS.get(s.n)));
  });
  for (const s of [...marcos, ...intervalos]) {
    const pai = porNome.get(PAIS.get(s.n));
    if (!pai) continue;
    let r = REFINOS.get(pai.n);
    if (!r) {
      r = { n: 'Aperfeiçoamento de ' + pai.n, k: 'passive', refino: true, pre: pai.n,
        cam: pai.cam, xp: XP[pai.cam], a: pai.a, v2: pai.v2, cat: pai.cat };
      if (['dmg', 'mental', 'heal'].includes(pai.k) && pai.p > 0) {
        const poder = pai.hits > 1 || pai.area ? 1 : 2;
        Object.assign(r, { amp: pai.n, up: { p: poder }, d: `Aumenta o poder de ${pai.n} em ${poder}.` });
      } else if (pai.k !== 'passive' && pai.c > 1) {
        Object.assign(r, { amp: pai.n, up: { c: -1 }, d: `Reduz em 1 o custo de usar ${pai.n}.` });
      } else {
        const reserva = pai.res === 'san' || pai.pas === 'sanMax' ? 'sanMax' : pai.pas === 'hpMax' ? 'hpMax' : 'auraMax';
        Object.assign(r, { pas: reserva, p: 2, d: `O treino de ${pai.n} aumenta em 2 a reserva de ${{ hpMax: 'PV', auraMax: 'Aura', sanMax: 'Sanidade' }[reserva]}.` });
      }
      REFINOS.set(pai.n, r);
      ligar(r, pai);
    }
    PAIS.set(s.n, r.n);
    const outros = (s.pre || '').split('|').filter(nome => nome && nome !== pai.n);
    s.pre = [...outros, r.n].join('|');
  }
  // Completa somente as rotas curtas, antes da técnica final. Pontas irmãs
  // que partem do mesmo aperfeiçoamento compartilham os graus de treino.
  const temFilhos = new Set(PAIS.values());
  for (const el of Object.keys(VINC)) {
    const setor = tree[el], raiz = setor.branches[0][0].n;
    for (const ponta of setor.branches.flat()) {
      if (temFilhos.has(ponta.n)) continue;
      let tamanho = 1;
      const visitados = new Set();
      for (let n = ponta.n; n !== raiz; n = PAIS.get(n)) {
        if (!n || visitados.has(n)) throw new Error('Caminho inválido em ' + ponta.n);
        visitados.add(n);
        tamanho++;
      }
      if (tamanho >= 9) continue;
      const entrada = PAIS.get(ponta.n), base = porNome.get(PAIS.get(entrada));
      let anterior = porNome.get(entrada);
      for (let grau = 1; grau <= 9 - tamanho; grau++) {
        let treino = REFINOS.get(anterior.n);
        if (!treino) {
          const cam = Math.min(ponta.cam, anterior.cam + 1);
          treino = { n: `Treino de ${base.n} · ${grau}`, k: 'passive', refino: true, grau,
            pre: anterior.n, cam, xp: XP[cam], a: base.a, cat: base.cat, v2: base.v2 };
          if (grau % 2 && base.p > 0 && ['dmg', 'mental', 'heal'].includes(base.k)) {
            Object.assign(treino, { amp: base.n, up: { p: 1 }, d: `Aumenta em 1 o poder de ${base.n}.` });
          } else {
            const san = base.res === 'san' || base.pas === 'sanMax';
            Object.assign(treino, { pas: san ? 'sanMax' : 'auraMax', p: 2, d: `O treino de ${base.n} aumenta em 2 a reserva de ${san ? 'Sanidade' : 'Aura'}.` });
          }
          // Leva 11: no lugar do treino genérico entra a técnica desenhada para aquele passo da corrente (arvore/leva11.js)
          const dz = MEIO[base.n]?.[grau - 1];
          if (dz) {
            for (const k of ['amp', 'up', 'pas', 'p']) delete treino[k];
            Object.assign(treino, dz, { pre: anterior.n, cam, a: dz.a || base.a, refino: true, grau });
            if (treino.k !== 'passive' && treino.c == null) treino.c = 0;
            aplicar(treino, cam, 0); delete treino._xp0;
          }
          REFINOS.set(anterior.n, treino);
          ligar(treino, anterior);
        }
        anterior = treino;
      }
      PAIS.set(ponta.n, anterior.n);
      ponta.pre = ponta.pre.split('|').map(n => n === entrada ? anterior.n : n).join('|');
    }
  }
  const prontos = new Set(), calculando = new Set();
  function precificar(s) {
    if (prontos.has(s)) return;
    if (calculando.has(s)) throw new Error('Ciclo na progressão de ' + s.n);
    calculando.add(s);
    const requisitos = String(s.pre || '').split('|').filter(Boolean);
    if (!raizesAbertas.has(s) && PAIS.has(s.n)) requisitos.push(PAIS.get(s.n));
    for (const nome of new Set(requisitos)) {
      const pai = porNome.get(nome);
      if (!pai) throw new Error('Pré-requisito ausente: ' + nome);
      precificar(pai);
      encarecer(s, pai);
    }
    calculando.delete(s);
    prontos.add(s);
  }
  for (const s of porNome.values()) precificar(s);
}

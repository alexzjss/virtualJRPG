// Conteúdo padrão da campanha: fantasia mística com demônios e caçadores, tecnologia dos anos 1910-1920.
// buildSkills → grade compartilhada; buildItems → catálogo; buildBestiary → modelos de inimigos.
import { TREE } from './tree.js';
const EL9 = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko'];
const PATRON = { kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', hiruko: 'Hiruko' };

// ----- notação compacta dos nós (tree.js e arvore/*.js) -----
// fx: 'st burn 3 60%; drain hp 30; shield 12 self' → lista de efeitos. Alvo opcional: self | ally | foes | tgt (padrão: o alvo da skill).
// fm: 'dur 3; atk 25; def 10; agi 20; hit 10; crit 5; atkP 6; heal 20; dr aura 3; end st exaus 2' → transformação.
// mod / bon: 'atk 10; hit 5' e 'INT 4; sanMax -5' → modificadores e bônus das passivas.
const TO = new Set(['self', 'ally', 'foes', 'tgt']);
const ARGS = { st: ['k', 'n'], det: ['k', 'm'], drain: ['r', 'p'], res: ['r', 'p'], gain: ['r', 'p'], lose: ['r', 'p'], exec: ['p', 'm'], vs: ['k', 'm'], per: ['k', 'p'], rage: ['m'], pierce: ['p'], chain: ['n', 'm'],
  push: ['v'], haste: ['v'], seal: ['p', 'n'], shield: ['p'], revive: ['p'], spread: ['k'], guard: ['n'], clima: ['k', 'n'], brk: ['n'], sure: [], strip: [], steal: [], cleanse: [], turn: [] };
const DEF = { st: { n: 3 }, det: { m: 6 }, pierce: { p: 100 }, chain: { m: .6 }, seal: { n: 3 }, guard: { n: 3 } };
const TXT = new Set(['k', 'r']);
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
export function parseFx(str, where = '') {
  if (!str) return undefined;
  return String(str).split(';').map(x => x.trim()).filter(Boolean).map(item => {
    const w = item.split(/\s+/), t = w.shift(), keys = ARGS[t];
    if (!keys) throw new Error(`efeito desconhecido "${item}" em ${where}`);
    const o = { t, ...DEF[t] }, pos = w.filter(x => !TO.has(x) && !x.endsWith('%'));
    keys.forEach((k, i) => { if (pos[i] == null) return; o[k] = TXT.has(k) ? pos[i] : +pos[i]; if (!TXT.has(k) && Number.isNaN(o[k])) throw new Error(`número inválido em "${item}" (${where})`); });
    if (keys.some(k => o[k] == null)) throw new Error(`faltam argumentos em "${item}" (${where})`);
    const ch = w.find(x => x.endsWith('%')), to = w.find(x => TO.has(x));
    if (t === 'st') o.ch = ch ? parseInt(ch) : 100;
    if (to) o.to = to;
    return o;
  });
}
const kv = (str, where) => Object.fromEntries(String(str).split(';').map(x => x.trim()).filter(Boolean).map(x => { const [k, v] = x.split(/\s+/); if (Number.isNaN(+v)) throw new Error(`valor inválido "${x}" em ${where}`); return [k, +v]; }));
export function parseForm(str, where = '') {
  const f = { dur: 3, m: {}, dr: {}, end: [] };
  for (const item of String(str).split(';').map(x => x.trim()).filter(Boolean)) {
    const [k, ...r] = item.split(/\s+/);
    if (k === 'end') f.end.push(...parseFx(r.join(' '), where));
    else if (k === 'dr') f.dr[r[0]] = +r[1];
    else if (k === 'dur') f.dur = +r[0];
    else if (['atk', 'def', 'agi', 'hit', 'crit', 'atkP', 'heal'].includes(k)) f.m[k] = +r[0];
    else throw new Error(`campo de forma desconhecido "${item}" em ${where}`);
  }
  return f;
}
// converte um nó dos dados para os campos que o servidor usa
export function expand(o) {
  const { fx, fm, mod, bon, up, dom, trio, ...rest } = o, w = o.n;
  const out = { ...rest };
  if (fx) out.fx = parseFx(fx, w);
  if (fm) out.form = parseForm(fm, w);
  if (dom) out.dom = parseDom(dom, w);
  if (trio) out.trio = String(trio).split('|');
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
  const N = 91, C = 45, G = {}, used = new Map(); // casa "x,y" → elemento
  const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !used.has(x + ',' + y);
  const node = (o, el, extra = {}) => { const { n, k, a, p, c, ...rest } = expand(o); return sk(n, k, a || 'FOR', el, p || 0, c || 0, 0, 0, { ...rest, ...extra }); };
  const put = (x, y, s) => { used.set(x + ',' + y, s.el); G['g' + Object.keys(G).length] = { ...s, gx: x, gy: y }; return [x, y]; };
  const around = (x, y) => { const o = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) o.push([x + dx, y + dy]); return o; };
  const at = k => k.split(',').map(Number), dist = k => Math.hypot(...at(k).map(v => v - C));
  // encadeia nós para fora do centro; o primeiro precisa encostar numa casa já usada que sirva de âncora (anchor)
  const chain = (deg, r0, nodes, anchor, start) => {
    let prev = start || null; const placed = [];
    nodes.forEach((s, i) => {
      const a = deg * Math.PI / 180, tx = C + (r0 + i) * Math.cos(a), ty = C + (r0 + i) * Math.sin(a);
      let cand = prev ? around(...prev).filter(p => free(...p)) : [...used.keys()].filter(k => anchor(k)).flatMap(k => around(...at(k))).filter(p => free(...p));
      if (!cand.length) cand = [...used.keys()].filter(k => used.get(k) === s.el || used.get(k) === 'fis').flatMap(k => around(...at(k))).filter(p => free(...p));
      if (!cand.length) throw new Error('grade sem espaço para ' + s.name);
      prev = put(...cand.sort((p, q) => (p[0] - tx) ** 2 + (p[1] - ty) ** 2 - (q[0] - tx) ** 2 - (q[1] - ty) ** 2)[0], s); placed.push(prev.join(','));
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
  // tronco Marcial: ramo 0 no centro, estilos de arma e ramos novos em raios, treinos nas casas livres junto ao centro
  put(C, C, node(M[0][0], 'fis'));
  around(C, C).forEach((p, i) => M[0][i + 1] && put(...p, node(M[0][i + 1], 'fis')));
  const rays = M.slice(1).filter((_, i) => i !== 4);
  rays.forEach((br, i) => chain(i * 360 / rays.length + 360 / ORDER.length / 2, 2, br.map(o => node(o, 'fis')), fis));
  const train = M[5].map(o => node(o, 'fis'));
  for (let r = 2; r <= 14 && train.length; r++) for (let x = C - r; x <= C + r; x++) for (let y = C - r; y <= C + r; y++)
    if (train.length && free(x, y) && around(x, y).some(p => used.get(p.join(',')) === 'fis')) put(x, y, train.shift());
  // setores: o ramo 0 de cada um abre o eixo (a raiz do Vínculo é o primeiro nó); depois um ramo de cada setor por vez,
  // para nenhum setor cercar o vizinho. Um ramo em que todo nó exige arma vira uma trilha por tipo de arma.
  const SEC = 360 / ORDER.length, R0 = 13, RING = 10, SLOT = [0, -1, 1, -2, 2], W = SEC / 5.2, cells = {};
  ORDER.forEach((el, i) => { cells[el] = [forked(i * SEC, R0, TREE[el].branches[0].map((o, n) => node(o, el, { br: el + '-0', ...(n ? {} : { root: true }) })), fis, false)]; });
  const most = Math.max(...ORDER.map(el => TREE[el].branches.length));
  for (let b = 1; b < most; b++) ORDER.forEach((el, i) => {
    const br = TREE[el].branches[b];
    if (!br) return;
    const ring = Math.floor(b / 5), deg = i * SEC + SLOT[b % 5] * W, mk = o => node(o, el, { br: el + '-' + b });
    const tip = ring ? new Set(cells[el][b - 5].slice().sort((p, q) => dist(q) - dist(p)).slice(0, 3)) : new Set(cells[el][0].slice(0, 5));
    const anchor = k => tip.has(k), r0 = ring ? R0 + ring * RING : R0 + 2;
    const groups = br.every(o => o.req) ? Object.values(br.reduce((g, o) => ((g[o.req] ||= []).push(o), g), {})) : [br];
    cells[el][b] = groups.flatMap((g, m) => groups.length > 1 ? chain(deg + (m - (groups.length - 1) / 2) * 2.5, r0, g.map(mk), anchor) : forked(deg, r0, g.map(mk), anchor, b % 2 === 0));
  });
  return G;
}

export function buildItems(it) {
  const L = [], add = (...a) => L.push(it(...a)), n = PATRON;
  // consumíveis
  add('Tônico', 'cons', 20, { price: 10 }); add('Tônico Forte', 'cons', 45, { price: 30 }); add('Elixir Vital', 'cons', 90, { price: 80 });
  add('Éter de Aura', 'cons', 15, { eff: 'aura', price: 12 }); add('Éter Concentrado', 'cons', 35, { eff: 'aura', price: 40 });
  add('Calmante', 'cons', 10, { eff: 'san', price: 15 }); add('Láudano', 'cons', 25, { eff: 'san', price: 50 });
  add('Antídoto', 'cons', 0, { eff: 'cure', price: 15 }); add('Atadura', 'cons', 30, { eff: 'body', price: 12 }); add('Sais Aromáticos', 'cons', 20, { eff: 'rev', price: 60 });
  add('Componente Ritualístico', 'mat', 0, { eff: 'comp', price: 25 }); // gasto sozinho por rituais: corta o preço em Sanidade pela metade
  add('Granada', 'cons', 28, { eff: 'bomb', el: 'fis', price: 35 }); add('Coquetel Incendiário', 'cons', 25, { eff: 'bomb', el: 'kagutsuchi', price: 35 });
  add('Frasco de Ácido', 'cons', 22, { eff: 'bomb', el: 'hiruko', price: 35 }); add('Bomba de Sal Sagrado', 'cons', 24, { eff: 'bomb', el: 'amaterasu', price: 35 });
  // ingredientes e materiais de ofício (colhidos nas cenas, de demônios abatidos, comprados ou reciclados)
  [['Erva Medicinal', 'erva', 4], ['Raiz Amarga', 'erva', 6], ['Cogumelo Pálido', 'erva', 8], ['Ervas de Cozinha', 'tempero', 3], ['Carne de Caça', 'carne', 5], ['Couro Curtido', 'carne', 6], ['Carne de Demônio', 'carne', 25],
    ['Sal Sagrado', 'mineral', 6], ['Pólvora', 'mineral', 7], ['Sucata de Ferro', 'mineral', 4], ['Papel de Arroz', 'papel', 3], ['Frasco Vazio', 'mineral', 3], ['Óleo de Lamparina', 'mineral', 5]]
    .forEach(([name, tag, price]) => add(name, 'mat', 0, { tag, price }));
  add('Frasco de Óleo', 'cons', 0, { eff: 'oil', price: 8 }); // molha o inimigo: fogo e raio reagem
  ['Brasa', 'Veneno', 'Sangue', 'Trovão', 'Precisão', 'Força'].forEach(r => add('Runa de ' + r, 'mat', 0, { rune: 1, price: 40 }));
  add('Munição de Prata', 'mun', 0, { el: 'amaterasu', shots: 6, price: 30 }); add('Munição Incendiária', 'mun', 0, { el: 'kagutsuchi', shots: 6, price: 30 }); add('Munição de Sal', 'mun', 0, { el: 'amaterasu', shots: 6, price: 30, salt: 1 });
  add('Ofuda de Cura', 'cons', 40, { eff: 'hp', price: 30 }); add('Ofuda Purificadora', 'cons', 0, { eff: 'cure', price: 25 }); add('Ofuda de Fogo', 'cons', 30, { eff: 'bomb', el: 'kagutsuchi', price: 30 });
  add('Ofuda de Selo', 'cons', 32, { eff: 'bomb', el: 'amaterasu', price: 32 }); add('Ofuda de Retorno', 'cons', 35, { eff: 'rev', price: 60 }); add('Isca', 'mat', 0, { tag: 'carne', price: 5 });
  // materiais de demônio: caem em batalha e servem para forjar armas elementais (3) e relíquias (5)
  add('Garra de Demônio', 'mat', 0, { price: 8 }); EL9.forEach(el => add('Essência de ' + n[el], 'mat', 0, { el, price: 20 }));
  // armas em três níveis por tipo
  [['lamina', 'Sabre de Cavalaria', 'Katana de Caçador', 'Lâmina Consagrada'], ['lanca', 'Baioneta', 'Lança de Caça', 'Alabarda Rúnica'], ['fogo', 'Revólver .38', 'Rifle de Ferrolho', 'Carabina Selada'], ['punho', 'Soqueira', 'Manoplas de Aço', 'Punhos de Talismã']]
    .forEach(([wt, ...names]) => names.forEach((name, i) => add(name, 'arma', [10, 14, 19][i] + (wt === 'fogo') - (wt === 'punho'), { wt, price: [40, 120, 320][i] })));
  // armas elementais: o ataque básico passa a ter o elemento
  [['kagutsuchi', 'Sabre Flamejante', 'lamina'], ['susanoo', 'Arpão da Maré', 'lanca'], ['atlas', 'Manoplas de Atlas', 'punho'], ['indra', 'Rifle Tesla', 'fogo'], ['fuhaku', 'Leque de Lâminas', 'lamina'],
    ['amaterasu', 'Lança Solar', 'lanca'], ['tsukuyomi', 'Adaga Lunar', 'lamina'], ['shukketsu', 'Bisturi Rubro', 'lamina'], ['hiruko', 'Pistola de Rádio', 'fogo']].forEach(([el, name, wt]) => add(name, 'arma', 15, { wt, el, price: 250 }));
  // armaduras
  [['Casaco de Couro', 2, 40], ['Colete Reforçado', 4, 120], ['Sobretudo Selado', 5, 260], ['Couraça de Trincheira', 6, 300]].forEach(([name, p, price]) => add(name, 'armadura', p, { price }));
  // acessórios: amuletos (+10 no atributo) e relíquias dos patronos (+8 no atributo e resistência ao elemento)
  [['FOR', 'Bracelete do Touro'], ['CON', 'Cinto do Urso'], ['DES', 'Luvas do Relojoeiro'], ['AGI', 'Botas do Mensageiro'], ['INT', 'Monóculo do Erudito'], ['SAB', 'Rosário Antigo'], ['CAR', 'Broche de Prata'], ['SOR', 'Amuleto da Sorte']]
    .forEach(([attr, name]) => add(name, 'acess', 10, { attr, price: 60 }));
  [['kagutsuchi', 'FOR'], ['susanoo', 'AGI'], ['atlas', 'CON'], ['indra', 'DES'], ['fuhaku', 'AGI'], ['amaterasu', 'SAB'], ['tsukuyomi', 'INT'], ['shukketsu', 'CON'], ['hiruko', 'SOR']]
    .forEach(([el, attr]) => add('Relíquia de ' + n[el], 'acess', 8, { attr, el, price: 400 }));
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
  ['Ceifador', '#111827', '', ['INT', 'FOR'], ['Ritual: Toque Gélido', 'Ritual: Colher Vida'], .7, 3],
  ['Familiar', '#1f2937', '', ['AGI', 'INT'], ['Ilusão Menor'], .25, 4],
  ['Coisa do Poço', '#334155', '', ['FOR', 'CON'], ['Ritual: Toque Gélido', 'Golpe Pesado'], .5, 3],
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
  const solo = s => !s.duo && !s.trio && !s.dom && !s.v2 && !s.circ && !s.aw && !s.summon && !s.form?.m?.heal && (+String(s.br).split('-')[1] < 6 || ['dmg', 'mental', 'form'].includes(s.kind));
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
export const SCENES = [
  { name: 'Beco do Mercado Negro', gather: ['Sucata de Ferro', 'Frasco Vazio', 'Pólvora', 'Papel de Arroz', 'Carne de Caça'], bg: '/maps/beco.svg', stock: ['Sabre de Cavalaria', 'Revólver .38', 'Soqueira', 'Baioneta', 'Casaco de Couro', 'Granada', 'Coquetel Incendiário', 'Tônico', 'Antídoto', 'Atadura'],
    note: 'Encontros: 3 Bandidos + 1 Capanga da Máfia (emboscada); à noite, 2 Diabretes de Cinzas nos telhados. Armeiro vende sem perguntas; a botica é fachada de um Cultista.' },
  { name: 'Santuário Profanado', gather: ['Sal Sagrado', 'Papel de Arroz', 'Cogumelo Pálido', 'Erva Medicinal', 'Raiz Amarga'], bg: '/maps/santuario.svg', stock: ['Calmante', 'Bomba de Sal Sagrado', 'Rosário Antigo', 'Componente Ritualístico'],
    note: 'Encontros: 2 Yurei + 1 Espectro da Trincheira; chefe opcional: Serafim Caído no altar. A fonte restaura Sanidade uma vez (mestre concede). Teste de horror ao entrar (perda 5).' },
  { name: 'Estação Central', gather: ['Sucata de Ferro', 'Pólvora', 'Óleo de Lamparina', 'Frasco Vazio'], bg: '/maps/estacao.svg', stock: ['Tônico', 'Tônico Forte', 'Éter de Aura', 'Rifle de Ferrolho', 'Colete Reforçado'],
    note: 'Encontros: 2 Soldados Desertores + 1 Autômato Possuído no depósito; Golem de Sucata na locomotiva. Boa cena para iniciar uma perseguição (automóvel contra motocicleta).' },
  { name: 'Mansão Ashworth', gather: ['Erva Medicinal', 'Ervas de Cozinha', 'Cogumelo Pálido', 'Papel de Arroz', 'Óleo de Lamparina', 'Carne de Caça', 'Couro Curtido'], bg: '/maps/mansao.svg', stock: [],
    note: 'Encontros: Cultistas (3) na capela + Ocultista na biblioteca; Súcubo no salão. Chefe: Condessa Escarlate (ponto fraco: torso). Use névoa de guerra e revele cômodo a cômodo.' },
];
export const VEHICLES = { pe: ['A pé', 1, 0], cavalo: ['Cavalo', 3, 10], moto: ['Motocicleta', 5, 0], auto: ['Automóvel', 4, -5], caminhao: ['Caminhão', 3, -15] }; // nome, velocidade, manobra

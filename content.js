// Conteúdo padrão da campanha: fantasia mística com demônios e caçadores, tecnologia dos anos 1910-1920.
// buildSkills → grade compartilhada; buildItems → catálogo; buildBestiary → modelos de inimigos.
import { TREE } from './tree.js';
const EL9 = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'radiacao'];
const PATRON = { kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', radiacao: 'Hiruko' };

// A grade é montada a partir de tree.js: o tronco Marcial no centro (comum a todos) e, em volta, um setor por Vínculo
// com quantos ramos o Vínculo tiver (o primeiro no eixo, os demais em leque). Cada ramo é uma corrente de casas vizinhas, então sempre dá para percorrê-lo.
export function buildSkills(sk) {
  const N = 41, C = 20, G = {}, used = new Map(); // casa "x,y" → elemento
  const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !used.has(x + ',' + y);
  const node = (o, el, extra = {}) => { const { n, k, a, p, c, ...rest } = o; return sk(n, k, a || 'FOR', el, p || 0, c || 0, 0, 0, { ...rest, ...extra }); };
  const put = (x, y, s) => { used.set(x + ',' + y, s.el); G['g' + Object.keys(G).length] = { ...s, gx: x, gy: y }; return [x, y]; };
  const around = (x, y) => { const o = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) o.push([x + dx, y + dy]); return o; };
  // encadeia nós para fora do centro; o primeiro precisa encostar numa casa já usada que sirva de âncora (anchor)
  const chain = (deg, r0, nodes, anchor) => {
    let prev = null; const placed = [];
    nodes.forEach((s, i) => {
      const a = deg * Math.PI / 180, tx = C + (r0 + i) * Math.cos(a), ty = C + (r0 + i) * Math.sin(a);
      let cand = prev ? around(...prev).filter(p => free(...p)) : [...used.keys()].filter(k => anchor(k)).flatMap(k => around(...k.split(',').map(Number))).filter(p => free(...p));
      if (!cand.length) cand = [...used.keys()].filter(k => used.get(k) === s.el || used.get(k) === 'fis').flatMap(k => around(...k.split(',').map(Number))).filter(p => free(...p));
      prev = put(...cand.sort((p, q) => (p[0] - tx) ** 2 + (p[1] - ty) ** 2 - (q[0] - tx) ** 2 - (q[1] - ty) ** 2)[0], s); placed.push(prev.join(','));
    });
    return placed;
  };
  const M = TREE.marcial.branches, fis = k => used.get(k) === 'fis';
  put(C, C, node(M[0][0], 'fis'));
  around(C, C).forEach((p, i) => M[0][i + 1] && put(...p, node(M[0][i + 1], 'fis')));
  // 1ª passada: o ramo 0 de cada Vínculo (ataque, com a skill raiz) abre o eixo do setor
  const main = EL9.map((el, i) => chain(i * 40, 3, TREE[el].branches[0].map((o, n) => node(o, el, n ? {} : { root: true })), fis));
  [20, 100, 220, 300].forEach((deg, i) => chain(deg, 2, M[i + 1].map(o => node(o, 'fis')), fis)); // estilos de arma nos vãos entre setores
  const train = M[5].map(o => node(o, 'fis')); // treinos de atributo nas casas livres junto ao centro (reservadas antes dos ramos laterais)
  for (let r = 2; r <= 14 && train.length; r++) for (let x = C - r; x <= C + r; x++) for (let y = C - r; y <= C + r; y++)
    if (train.length && free(x, y) && around(x, y).some(p => used.get(p.join(',')) === 'fis')) put(x, y, train.shift());
  // 2ª passada: os demais ramos se abrem em leque nas laterais, presos à base do ramo 0. Um ramo em que todo nó exige
  // arma é dividido em uma trilha por tipo de arma, para ninguém precisar comprar nó de arma que não usa.
  EL9.forEach((el, i) => {
    const B = TREE[el].branches, deg = i * 40, rest = B.slice(1), base = new Set(main[i].slice(0, B.length > 3 ? 5 : 4)), ext = rest.length > 2 ? 17 : 13, step = ext / Math.ceil(rest.length / 2);
    rest.forEach((br, j) => {
      const off = (j % 2 ? 1 : -1) * Math.ceil((j + 1) / 2) * step, groups = br.every(o => o.req) ? Object.values(br.reduce((g, o) => ((g[o.req] ||= []).push(o), g), {})) : [br];
      groups.forEach((g, m) => chain(deg + off + (m - (groups.length - 1) / 2) * 4, 5, g.map(o => node(o, el)), k => base.has(k)));
    });
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
  add('Granada', 'cons', 28, { eff: 'bomb', el: 'fis', price: 35 }); add('Coquetel Incendiário', 'cons', 25, { eff: 'bomb', el: 'kagutsuchi', price: 35 });
  add('Frasco de Ácido', 'cons', 22, { eff: 'bomb', el: 'radiacao', price: 35 }); add('Bomba de Sal Sagrado', 'cons', 24, { eff: 'bomb', el: 'amaterasu', price: 35 });
  // materiais de demônio: caem em batalha e servem para forjar armas elementais (3) e relíquias (5)
  add('Garra de Demônio', 'mat', 0, { price: 8 }); EL9.forEach(el => add('Essência de ' + n[el], 'mat', 0, { el, price: 20 }));
  // armas em três níveis por tipo
  [['lamina', 'Sabre de Cavalaria', 'Katana de Caçador', 'Lâmina Consagrada'], ['lanca', 'Baioneta', 'Lança de Caça', 'Alabarda Rúnica'], ['fogo', 'Revólver .38', 'Rifle de Ferrolho', 'Carabina Selada'], ['punho', 'Soqueira', 'Manoplas de Aço', 'Punhos de Talismã']]
    .forEach(([wt, ...names]) => names.forEach((name, i) => add(name, 'arma', [10, 14, 19][i] + (wt === 'fogo') - (wt === 'punho'), { wt, price: [40, 120, 320][i] })));
  // armas elementais: o ataque básico passa a ter o elemento
  [['kagutsuchi', 'Sabre Flamejante', 'lamina'], ['susanoo', 'Arpão da Maré', 'lanca'], ['atlas', 'Manoplas de Atlas', 'punho'], ['indra', 'Rifle Tesla', 'fogo'], ['fuhaku', 'Leque de Lâminas', 'lamina'],
    ['amaterasu', 'Lança Solar', 'lanca'], ['tsukuyomi', 'Adaga Lunar', 'lamina'], ['shukketsu', 'Bisturi Rubro', 'lamina'], ['radiacao', 'Pistola de Rádio', 'fogo']].forEach(([el, name, wt]) => add(name, 'arma', 15, { wt, el, price: 250 }));
  // armaduras
  [['Casaco de Couro', 2, 40], ['Colete Reforçado', 4, 120], ['Sobretudo Selado', 5, 260], ['Couraça de Trincheira', 6, 300]].forEach(([name, p, price]) => add(name, 'armadura', p, { price }));
  // acessórios: amuletos (+10 no atributo) e relíquias dos patronos (+8 no atributo e resistência ao elemento)
  [['FOR', 'Bracelete do Touro'], ['CON', 'Cinto do Urso'], ['DES', 'Luvas do Relojoeiro'], ['AGI', 'Botas do Mensageiro'], ['INT', 'Monóculo do Erudito'], ['SAB', 'Rosário Antigo'], ['CAR', 'Broche de Prata'], ['SOR', 'Amuleto da Sorte']]
    .forEach(([attr, name]) => add(name, 'acess', 10, { attr, price: 60 }));
  [['kagutsuchi', 'FOR'], ['susanoo', 'AGI'], ['atlas', 'CON'], ['indra', 'DES'], ['fuhaku', 'AGI'], ['amaterasu', 'SAB'], ['tsukuyomi', 'INT'], ['shukketsu', 'CON'], ['radiacao', 'SOR']]
    .forEach(([el, attr]) => add('Relíquia de ' + n[el], 'acess', 8, { attr, el, price: 400 }));
  return Object.fromEntries(L.map((x, i) => ['i' + i, x]));
}

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
    ['Lodo Radioativo', '#84cc16', { CON: 70, AGI: 20 }, ['kagutsuchi'], ['fis', 'radiacao'], ['Raio Gama', 'Nuvem Tóxica'], { xpR: 15 }],
    // humanos
    ['Bandido', '#78716c', { DES: 50, FOR: 45, SAB: 35 }, [], [], ['Tiro Certeiro'], { arma: 10, goldR: 25 }],
    ['Capanga da Máfia', '#44403c', { FOR: 55, CON: 55 }, [], [], ['Golpe Pesado', 'Tiro Certeiro'], { arma: 11, armor: 2, goldR: 35 }],
    ['Soldado Desertor', '#57534e', { DES: 55, CON: 55, SAB: 30 }, ['tsukuyomi'], [], ['Tiro Certeiro', 'Golpe Giratório'], { arma: 13, armor: 3, xpR: 15, goldR: 20 }],
    ['Cultista', '#581c87', { INT: 55, SAB: 30 }, ['amaterasu'], ['shukketsu'], ['Sangria', 'Sussurro Sombrio'], { goldR: 15 }],
    ['Ocultista', '#3730a3', { INT: 70, SAB: 55, CON: 35 }, [], ['tsukuyomi'], ['Centelha', 'Faísca', 'Pesadelo', 'Manto da Noite'], { xpR: 25, goldR: 40 }],
    ['Caçador Rival', '#0f766e', { FOR: 60, DES: 60, AGI: 55 }, [], [], ['Golpe Pesado', 'Tiro Certeiro', 'Passo Rápido', 'Luz Curativa'], { arma: 14, armor: 3, xpR: 30, goldR: 60 }],
  ];
  // um chefe por patrono: usa o raio inteiro do elemento, tem muito HP e entra em fúria com metade da vida
  const BOSS = [['kagutsuchi', 'Ifrit das Fornalhas', 'susanoo', 'INT', 'torso'], ['susanoo', 'Leviatã do Porto', 'indra', 'INT', 'head'], ['atlas', 'Colosso de Ferro', 'fuhaku', 'FOR', 'legL'], ['indra', 'Arconte da Tempestade', 'atlas', 'INT', 'armR'], ['fuhaku', 'Rainha dos Corvos', 'kagutsuchi', 'DES', 'armL'],
    ['amaterasu', 'Serafim Caído', 'tsukuyomi', 'SAB', 'armR'], ['tsukuyomi', 'Senhor dos Pesadelos', 'amaterasu', 'INT', 'head'], ['shukketsu', 'Condessa Escarlate', 'amaterasu', 'INT', 'torso'], ['radiacao', 'Filho de Hiruko', 'susanoo', 'INT', 'legR']];
  const PN = { head: 'cabeça', torso: 'torso', armL: 'braço esquerdo', armR: 'braço direito', legL: 'perna esquerda', legR: 'perna direita' };
  const ray = el => s => s.el === el && s.kind !== 'passive' && s.res !== 'san' || (s.el === el && el === 'shukketsu' && s.kind !== 'passive' && !s.back);
  return [...B.map(([name, color, attrs, weak, resist, skills, o], i) => make(name, color, attrs, weak, resist, skills, { cat: i < 16 ? 'demonio' : 'humano', ...o })),
    ...BOSS.map(([el, name, weak, attr, wp]) => make(name, '#111111', { [attr]: 75, CON: 70, AGI: 55, SAB: 60, FOR: 60 }, [weak], [el], ray(el), { boss: true, cat: 'chefe', weakPart: wp, gmNote: `Chefe. Ponto fraco: ${PN[wp]} (mirar ali causa dano dobrado). Age duas vezes por rodada, resiste a controle e invoca lacaios ao entrar em fúria.`, bon: { hpMax: 250, auraMax: 60, sanMax: 0 }, arma: 16, armor: 4, xpR: 80, goldR: 150 }))];
}

// cenas de exemplo: mapa esquemático, encontros sugeridos (nota secreta do mestre) e estoque da loja local
export const SCENES = [
  { name: 'Beco do Mercado Negro', bg: '/maps/beco.svg', stock: ['Sabre de Cavalaria', 'Revólver .38', 'Soqueira', 'Baioneta', 'Casaco de Couro', 'Granada', 'Coquetel Incendiário', 'Tônico', 'Antídoto', 'Atadura'],
    note: 'Encontros: 3 Bandidos + 1 Capanga da Máfia (emboscada); à noite, 2 Diabretes de Cinzas nos telhados. Armeiro vende sem perguntas; a botica é fachada de um Cultista.' },
  { name: 'Santuário Profanado', bg: '/maps/santuario.svg', stock: ['Calmante', 'Bomba de Sal Sagrado', 'Rosário Antigo'],
    note: 'Encontros: 2 Yurei + 1 Espectro da Trincheira; chefe opcional: Serafim Caído no altar. A fonte restaura Sanidade uma vez (mestre concede). Teste de horror ao entrar (perda 5).' },
  { name: 'Estação Central', bg: '/maps/estacao.svg', stock: ['Tônico', 'Tônico Forte', 'Éter de Aura', 'Rifle de Ferrolho', 'Colete Reforçado'],
    note: 'Encontros: 2 Soldados Desertores + 1 Autômato Possuído no depósito; Golem de Sucata na locomotiva. Boa cena para iniciar uma perseguição (automóvel contra motocicleta).' },
  { name: 'Mansão Ashworth', bg: '/maps/mansao.svg', stock: [],
    note: 'Encontros: Cultistas (3) na capela + Ocultista na biblioteca; Súcubo no salão. Chefe: Condessa Escarlate (ponto fraco: torso). Use névoa de guerra e revele cômodo a cômodo.' },
];
export const VEHICLES = { pe: ['A pé', 1, 0], cavalo: ['Cavalo', 3, 10], moto: ['Motocicleta', 5, 0], auto: ['Automóvel', 4, -5], caminhao: ['Caminhão', 3, -15] }; // nome, velocidade, manobra

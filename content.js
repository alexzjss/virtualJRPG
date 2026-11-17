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
  const chain = (deg, r0, nodes, anchor, start) => {
    let prev = start || null; const placed = [];
    nodes.forEach((s, i) => {
      const a = deg * Math.PI / 180, tx = C + (r0 + i) * Math.cos(a), ty = C + (r0 + i) * Math.sin(a);
      let cand = prev ? around(...prev).filter(p => free(...p)) : [...used.keys()].filter(k => anchor(k)).flatMap(k => around(...k.split(',').map(Number))).filter(p => free(...p));
      if (!cand.length) cand = [...used.keys()].filter(k => used.get(k) === s.el || used.get(k) === 'fis').flatMap(k => around(...k.split(',').map(Number))).filter(p => free(...p));
      prev = put(...cand.sort((p, q) => (p[0] - tx) ** 2 + (p[1] - ty) ** 2 - (q[0] - tx) ** 2 - (q[1] - ty) ** 2)[0], s); placed.push(prev.join(','));
    });
    return placed;
  };
  // ramo de 10 nós bifurcado: tronco (1-4), caminho A (5-7) e caminho B (8-9) saindo do nó 4, e o nó final na ponta de A ou de B
  const forked = (deg, r0, nodes, anchor, capB) => {
    if (nodes.length !== 10) return chain(deg, r0, nodes, anchor);
    const at = k => k.split(',').map(Number), trunk = chain(deg, r0, nodes.slice(0, 4), anchor), fork = at(trunk[3]);
    const A = chain(deg - 5, r0 + 4, nodes.slice(4, 7), null, fork), B = chain(deg + 5, r0 + 4, nodes.slice(7, 9), null, fork);
    return [...trunk, ...A, ...B, ...chain(deg + (capB ? 5 : -5), r0 + (capB ? 6 : 7), [nodes[9]], null, at((capB ? B : A).at(-1)))];
  };
  const M = TREE.marcial.branches, fis = k => used.get(k) === 'fis';
  put(C, C, node(M[0][0], 'fis'));
  around(C, C).forEach((p, i) => M[0][i + 1] && put(...p, node(M[0][i + 1], 'fis')));
  // 1ª passada: o ramo 0 de cada Vínculo (ataque, com a skill raiz) abre o eixo do setor
  const main = EL9.map((el, i) => forked(i * 40, 3, TREE[el].branches[0].map((o, n) => node(o, el, n ? {} : { root: true })), fis, false));
  [20, 100, 220, 300].forEach((deg, i) => chain(deg, 2, M[i + 1].map(o => node(o, 'fis')), fis)); // estilos de arma nos vãos entre setores
  const train = M[5].map(o => node(o, 'fis')); // treinos de atributo nas casas livres junto ao centro (reservadas antes dos ramos laterais)
  for (let r = 2; r <= 14 && train.length; r++) for (let x = C - r; x <= C + r; x++) for (let y = C - r; y <= C + r; y++)
    if (train.length && free(x, y) && around(x, y).some(p => used.get(p.join(',')) === 'fis')) put(x, y, train.shift());
  // 2ª passada: os demais ramos se abrem em leque nas laterais, presos à base do ramo 0. Um ramo em que todo nó exige
  // arma é dividido em uma trilha por tipo de arma, para ninguém precisar comprar nó de arma que não usa.
  // Um ramo lateral de cada Vínculo por vez (e não um Vínculo inteiro por vez), para nenhum setor cercar o vizinho.
  const most = Math.max(...EL9.map(el => TREE[el].branches.length));
  for (let j = 0; j < most - 1; j++) EL9.forEach((el, i) => {
    const B = TREE[el].branches, br = B[j + 1], deg = i * 40;
    if (!br) return;
    const base = new Set(main[i].slice(0, B.length > 3 ? 5 : 4)), step = (B.length > 3 ? 12 : 13) / Math.ceil((B.length - 1) / 2), off = (j % 2 ? 1 : -1) * Math.ceil((j + 1) / 2) * step;
    const groups = br.every(o => o.req) ? Object.values(br.reduce((g, o) => ((g[o.req] ||= []).push(o), g), {})) : [br];
    groups.forEach((g, m) => groups.length > 1 ? chain(deg + off + (m - (groups.length - 1) / 2) * 3, 5, g.map(o => node(o, el)), k => base.has(k)) : forked(deg + off, 5, g.map(o => node(o, el)), k => base.has(k), j % 2 === 0));
  });
  return G;
}

// versão do catálogo; saves em versão menor passam por migrateItems (state.js)
export const ITEMS_V = 3;
// nomes do catálogo v2 → v3, para a migração manter inventários e lojas (relíquias entram logo abaixo)
export const RENAME = { 'Tônico': 'Poção', 'Tônico Forte': 'Líquido Dourado do Sanatório', 'Elixir Vital': 'Elixir de Flamel', 'Éter de Aura': 'Cubo de Shinkai', 'Éter Concentrado': 'Cristal de Mikhail',
  'Calmante': 'Pedra de Sal Purificado', 'Láudano': 'Remédio do Sanatório', 'Antídoto': 'Antídoto do TN-1', 'Atadura': 'Bálsamo de Hermione', 'Sais Aromáticos': 'Pena de Fênix',
  'Granada': 'Bomba do Feiticeiro', 'Coquetel Incendiário': 'Frasco de Chamas Carmesim', 'Frasco de Ácido': 'Veneno TN-1', 'Bomba de Sal Sagrado': 'Bomba de Sal Purificado',
  'Casaco de Couro': 'Mantos Negros do Esquadrão', 'Colete Reforçado': 'Trajes de Rangers', 'Sobretudo Selado': 'Armadura de Atena', 'Couraça de Trincheira': 'Armadura de Micael',
  'Bracelete do Touro': 'Bracelete de Meteoro Branco', 'Cinto do Urso': 'Runas de Hermione', 'Luvas do Relojoeiro': 'Medalhão dos Kodama', 'Botas do Mensageiro': 'Runa de Viagem', 'Monóculo do Erudito': 'Codex da Antiga Realidade',
  'Rosário Antigo': 'Medalhão do Mentor', 'Broche de Prata': 'Medalhão dos Kodama', 'Amuleto da Sorte': 'Amuleto de EXP' };
const RELIC = { kagutsuchi: ['Dino-Pedra Vermelha', 'FOR'], susanoo: ['Dino-Pedra Azul', 'AGI'], atlas: ['Dino-Pedra Amarela', 'CON'], indra: ['Dino-Pedra Dourada', 'DES'], fuhaku: ['Dino-Pedra Verde', 'AGI'],
  amaterasu: ['Dino-Pedra Branca', 'SAB'], tsukuyomi: ['Dino-Pedra Preta', 'INT'], shukketsu: ['Dino-Pedra Carmesim', 'CON'], radiacao: ['Pedra Filosofal', 'SOR'] };
EL9.forEach(el => { RENAME['Relíquia de ' + PATRON[el]] = RELIC[el][0]; });

export function buildItems(it) {
  const L = [], add = (...a) => L.push(it(...a));
  // consumíveis (um de cada efeito: hp, aura, san, cure, body, rev e bombas por elemento)
  add('Poção', 'cons', 20, { price: 10 }); add('Líquido Dourado do Sanatório', 'cons', 45, { price: 30 }); add('Elixir de Flamel', 'cons', 90, { price: 80 });
  add('Cubo de Shinkai', 'cons', 15, { eff: 'aura', price: 12 }); add('Cristal de Mikhail', 'cons', 35, { eff: 'aura', price: 40 });
  add('Pedra de Sal Purificado', 'cons', 10, { eff: 'san', price: 15 }); add('Remédio do Sanatório', 'cons', 25, { eff: 'san', price: 50 });
  add('Antídoto do TN-1', 'cons', 0, { eff: 'cure', price: 15 }); add('Bálsamo de Hermione', 'cons', 30, { eff: 'body', price: 12 }); add('Pena de Fênix', 'cons', 20, { eff: 'rev', price: 60 });
  add('Bomba do Feiticeiro', 'cons', 28, { eff: 'bomb', el: 'fis', price: 35 }); add('Frasco de Chamas Carmesim', 'cons', 25, { eff: 'bomb', el: 'kagutsuchi', price: 35 });
  add('Veneno TN-1', 'cons', 22, { eff: 'bomb', el: 'radiacao', price: 35 }); add('Bomba de Sal Purificado', 'cons', 24, { eff: 'bomb', el: 'amaterasu', price: 35 });
  add('Frasco Roxo', 'cons', 25, { eff: 'bomb', el: 'indra', price: 35 });
  // materiais de demônio: caem em batalha e servem para forjar armas elementais (3) e relíquias (5)
  add('Garra de Demônio', 'mat', 0, { price: 8 }); EL9.forEach(el => add('Essência de ' + PATRON[el], 'mat', 0, { el, price: 20 }));
  // armas. pierce = fração da armadura do alvo ignorada; reqFor = FOR mínima para equipar; grant = habilidade especial enquanto equipada (usada como skill 'wpn')
  add('Florete', 'arma', 12, { wt: 'lamina', price: 60, pierce: .25 });
  add('Perfuradora de Montanhas', 'arma', 24, { wt: 'lanca', price: 400, pierce: .5, reqFor: 70,
    grant: { name: 'Perfurar Montanha', kind: 'dmg', attr: 'FOR', el: 'fis', power: 36, cost: 20, res: 'aura', st: '', area: false, ct: 150, limit: false, req: 'lanca', pierce: 1, reqFor: 85, d: 'Uma estocada que atravessa rocha e armadura como se não existissem.' } });
  [['lamina', [['Katana de Madeira', 6, 15], ['Faca de Osso', 8, 30], ['Adaga de Osso', 8, 30], ['Adaga dos Black', 9, 40], ['Katana Enferrujada', 10, 50], ['Sai Gêmeos', 12, 90, .15], ['Sabre Verde do Mestre Tolko', 13, 110],
      ['Cortadora de Mares', 14, 120], ['Retalhadora de Nuvens', 14, 120], ['Espada das Rosas', 15, 150], ['Katana de Ekklai', 15, 150], ['Lâmina dos Caídos', 15, 150], ['Martelo', 15, 140], ['Espada Celeste do Trovão', 16, 180],
      ['Katana de Azrael', 16, 180], ['Katana Branca', 16, 180], ['Sabre de Aura', 16, 200], ['Machado', 16, 200], ['Espada Branca do Trovão', 17, 220], ['Lâmina Duo da Tempestade', 17, 220], ['Espada Rubra', 17, 280, .3],
      ['Katana de Musashi', 18, 260], ['Espada de Iffrit', 18, 300], ['Espada do Sangue Negro', 18, 300], ['Espada que Corta as Estrelas', 21, 480], ['Lágrima de Raijin', 22, 500, .25]]],
    ['lanca', [['Alabarda Dourada', 17, 260], ['Lança de Raijin', 19, 380], ['Lança da Criação', 20, 400], ['Lança do Empalador do Abismo', 20, 420, .35]]],
    ['fogo', [['Varinha', 10, 100], ['Web-shooter de Sangue', 9, 120], ['Revólver', 11, 100], ['Cajado Solarie', 12, 150], ['Revólver de Cano Duplo', 13, 160], ['Colt de Samuel Colt', 14, 220], ['Espingarda de Cano Curto', 15, 180],
      ['Rifle de Precisão', 16, 240, .2], ['Arco de Ra', 17, 300], ['Canhão de Vento Gélido', 17, 300], ['Canhão de Aura', 18, 320]]],
    ['punho', [['Luvas de Absorção Elétrica', 11, 120], ['Manopla Melhorada', 12, 120], ['Manoplas de Kagutsuchi', 16, 260]]]]
    .forEach(([wt, ws]) => ws.forEach(([name, p, price, pierce = 0]) => add(name, 'arma', p, { wt, price, pierce })));
  // armaduras
  [['Mantos Negros do Esquadrão', 2, 40], ['Trajes Negros de Jack', 3, 90], ['Trajes de Rangers', 4, 120], ['Manto Trovejante', 4, 200], ['Asa-Branca', 5, 260], ['Armadura de Atena', 5, 280], ['Armadura de Micael', 6, 320], ['Armadura Castiel', 6, 340]]
    .forEach(([name, p, price]) => add(name, 'armadura', p, { price }));
  // acessórios: talismãs (+10 no atributo) e as pedras dos patronos (+8 no atributo e resistência ao elemento)
  [['SOR', 'Amuleto de EXP'], ['CON', 'Runas de Hermione'], ['SAB', 'Medalhão do Mentor'], ['INT', 'Codex da Antiga Realidade'], ['AGI', 'Runa de Viagem'], ['FOR', 'Bracelete de Meteoro Branco'], ['CAR', 'Medalhão dos Kodama'], ['INT', 'Chave de Salomão']]
    .forEach(([attr, name]) => add(name, 'acess', 10, { attr, price: 60 }));
  EL9.forEach(el => add(RELIC[el][0], 'acess', 8, { attr: RELIC[el][1], el, price: 400 }));
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
  const BOSS = [['kagutsuchi', 'Ifrit das Fornalhas', 'susanoo', 'INT', 'torso'], ['susanoo', 'Leviatã do Porto', 'indra', 'INT', 'head'], ['atlas', 'Colosso de Ferro', 'fuhaku', 'FOR', 'legL', { hp: .7 }], ['indra', 'Arconte da Tempestade', 'atlas', 'INT', 'armR'], ['fuhaku', 'Rainha dos Corvos', 'kagutsuchi', 'DES', 'armL'],
    ['amaterasu', 'Serafim Caído', 'tsukuyomi', 'SAB', 'armR', { arma: 6, hp: .7 }], ['tsukuyomi', 'Senhor dos Pesadelos', 'amaterasu', 'INT', 'head', { hp: .85 }], ['shukketsu', 'Condessa Escarlate', 'amaterasu', 'INT', 'torso'], ['radiacao', 'Filho de Hiruko', 'susanoo', 'INT', 'legR']];
  const PN = { head: 'cabeça', torso: 'torso', armL: 'braço esquerdo', armR: 'braço direito', legL: 'perna esquerda', legR: 'perna direita' };
  const ray = el => s => s.el === el && s.kind !== 'passive' && s.res !== 'san' || (s.el === el && el === 'shukketsu' && s.kind !== 'passive' && !s.back);
  return [...B.map(([name, color, attrs, weak, resist, skills, o], i) => make(name, color, attrs, weak, resist, skills, { cat: i < 16 ? 'demonio' : 'humano', ...o })),
    ...BOSS.map(([el, name, weak, attr, wp, tune]) => make(name, '#111111', { [attr]: 75, CON: 70, AGI: 55, SAB: 60, FOR: 60 }, [weak], [el], ray(el), { boss: true, cat: 'chefe', tune: tune || {}, weakPart: wp, gmNote: `Chefe. Ponto fraco: ${PN[wp]} (mirar ali causa dano dobrado). Age duas vezes por rodada, resiste a controle e invoca lacaios ao entrar em fúria.`, bon: { hpMax: 250, auraMax: 60, sanMax: 0 }, arma: 16, armor: 4, xpR: 80, goldR: 150 }))];
}

// cenas de exemplo: mapa esquemático, encontros sugeridos (nota secreta do mestre) e estoque da loja local
export const SCENES = [
  { name: 'Beco do Mercado Negro', bg: '/maps/beco.svg', stock: ['Mantos Negros do Esquadrão', 'Bomba do Feiticeiro', 'Frasco de Chamas Carmesim', 'Poção', 'Antídoto do TN-1', 'Bálsamo de Hermione'],
    note: 'Encontros: 3 Bandidos + 1 Capanga da Máfia (emboscada); à noite, 2 Diabretes de Cinzas nos telhados. Armeiro vende sem perguntas; a botica é fachada de um Cultista.' },
  { name: 'Santuário Profanado', bg: '/maps/santuario.svg', stock: ['Pedra de Sal Purificado', 'Bomba de Sal Purificado', 'Medalhão do Mentor'],
    note: 'Encontros: 2 Yurei + 1 Espectro da Trincheira; chefe opcional: Serafim Caído no altar. A fonte restaura Sanidade uma vez (mestre concede). Teste de horror ao entrar (perda 5).' },
  { name: 'Estação Central', bg: '/maps/estacao.svg', stock: ['Poção', 'Líquido Dourado do Sanatório', 'Cubo de Shinkai', 'Antídoto do TN-1', 'Trajes de Rangers'],
    note: 'Encontros: 2 Soldados Desertores + 1 Autômato Possuído no depósito; Golem de Sucata na locomotiva. Boa cena para iniciar uma perseguição (automóvel contra motocicleta).' },
  { name: 'Mansão Ashworth', bg: '/maps/mansao.svg', stock: [],
    note: 'Encontros: Cultistas (3) na capela + Ocultista na biblioteca; Súcubo no salão. Chefe: Condessa Escarlate (ponto fraco: torso). Use névoa de guerra e revele cômodo a cômodo.' },
];
export const VEHICLES = { pe: ['A pé', 1, 0], cavalo: ['Cavalo', 3, 10], moto: ['Motocicleta', 5, 0], auto: ['Automóvel', 4, -5], caminhao: ['Caminhão', 3, -15] }; // nome, velocidade, manobra

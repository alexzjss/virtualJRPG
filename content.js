// Conteúdo padrão da campanha: fantasia mística com demônios e caçadores, tecnologia dos anos 1910-1920.
// buildSkills → grade compartilhada; buildItems → catálogo; buildBestiary → modelos de inimigos.
const EL9 = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'radiacao'];
const PATRON = { kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', radiacao: 'Hiruko' };

export function buildSkills(sk) {
  const N = 17, C = 8, G = {}, used = new Set();
  const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !used.has(x + ',' + y);
  const put = (x, y, s) => { used.add(x + ',' + y); G['g' + Object.keys(G).length] = { ...s, gx: x, gy: y }; return [x, y]; };
  // encadeia nós para fora do centro num ângulo; cada nó fica colado ao anterior, então o ramo é sempre percorrível
  const chain = (deg, r0, nodes) => {
    let prev = null;
    nodes.forEach((s, i) => {
      const a = deg * Math.PI / 180, tx = C + (r0 + i) * Math.cos(a), ty = C + (r0 + i) * Math.sin(a), cand = [];
      if (prev) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (free(prev[0] + dx, prev[1] + dy)) cand.push([prev[0] + dx, prev[1] + dy]);
      if (!cand.length) for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (free(x, y)) cand.push([x, y]);
      prev = put(...cand.sort((p, q) => (p[0] - tx) ** 2 + (p[1] - ty) ** 2 - (q[0] - tx) ** 2 - (q[1] - ty) ** 2)[0], s);
    });
  };
  const pas = (name, p, power, xp = 10, el = 'fis') => sk(name, 'passive', 'FOR', el, power, 0, 0, 0, { pas: p, xp });
  const buff = (name, attr, el, st, cost, o = {}) => sk(name, 'heal', attr, el, 0, cost, 0, 0, { st, xp: 15, ...o });
  // centro físico
  put(C, C, sk('Golpe Pesado', 'dmg', 'FOR', 'fis', 14, 4, 0, 0, { st: 'stun' }));
  [[0, -1, pas('Vigor', 'hpMax', 10)], [1, -1, sk('Golpe Giratório', 'dmg', 'FOR', 'fis', 10, 6, 0, 0, { area: true })], [1, 0, pas('Foco', 'auraMax', 8)],
    [1, 1, sk('Tiro Certeiro', 'dmg', 'DES', 'fis', 12, 4, 0, 0, { ct: 60 })], [0, 1, pas('Mente Firme', 'sanMax', 10)],
    [-1, 1, sk('Grito de Guerra', 'heal', 'CAR', 'fis', 2, 6, 0, 0, { st: 'atkUp', area: true })], [-1, 0, pas('Treino de FOR', 'FOR', 5)],
    [-1, -1, buff('Passo Rápido', 'AGI', 'fis', 'agiUp', 4, { ct: 50, xp: 10 })]].forEach(([x, y, s]) => put(C + x, C + y, s));
  // raios elementais: [elemento, atributo, tipo, status, [básica, área, forte, suprema, limite], suporte [buff, st, debuff, st, área, st, atributo], proibida?]
  const E = [
    ['kagutsuchi', 'INT', 'dmg', 'burn', ['Centelha', 'Mar de Chamas', 'Lâmina de Kagutsuchi', 'Sol de Kagutsuchi', 'Inferno Rubro'], ['Brasa Interior', 'atkUp', 'Marca Ardente', 'defDn', 'Cinzas Sufocantes', 'silence', 'FOR'], ['Chama Negra', 48, false, 'burn']],
    ['susanoo', 'INT', 'dmg', 'agiDn', ["Jato d'Água", 'Maré Alta', 'Lança de Susanoo', 'Dilúvio de Susanoo', 'Fúria dos Mares'], ['Correnteza', 'agiUp', 'Afogar', 'agiDn', 'Névoa Fria', 'sleep', 'AGI']],
    ['atlas', 'FOR', 'dmg', 'defDn', ['Estilhaço', 'Terremoto', 'Punho de Atlas', 'Peso do Mundo', 'Colapso'], ['Pele de Pedra', 'defUp', 'Fenda', 'stun', 'Tremor', 'agiDn', 'CON']],
    ['indra', 'INT', 'dmg', 'para', ['Faísca', 'Tempestade', 'Raio de Indra', 'Julgamento de Indra', 'Vajra'], ['Reflexo Elétrico', 'agiUp', 'Choque', 'para', 'Campo Estático', 'silence', 'DES'], ['Relâmpago Vazio', 44, true, 'stun']],
    ['fuhaku', 'DES', 'dmg', 'bleed', ['Lâmina de Vento', 'Vendaval', 'Corte de Fuhaku', 'Tufão de Fuhaku', 'Mil Lâminas'], ['Vento a Favor', 'agiUp', 'Rajada Cortante', 'bleed', 'Olho do Furacão', 'confuse', 'AGI']],
    ['amaterasu', 'SAB', 'heal', 'defUp', ['Luz Curativa', 'Aurora', 'Bênção de Amaterasu', 'Alvorada de Amaterasu', 'Sol Nascente'], ['Luz Guardiã', 'defUp', 'Clarão', 'atkDn', 'Julgamento Solar', 'defDn', 'SAB']],
    ['tsukuyomi', 'INT', 'mental', 'fear', ['Sussurro Sombrio', 'Eclipse', 'Véu de Tsukuyomi', 'Noite Eterna', 'Fim do Sonho'], ['Manto da Noite', 'defUp', 'Pesadelo', 'sleep', 'Lua Negra', 'confuse', 'INT'], ['Olhar do Abismo', 40, false, 'fear']],
    ['shukketsu', 'INT', 'dmg', 'bleed', ['Sangria', 'Chuva Rubra', 'Pacto de Shukketsu', 'Hemorragia Final', 'Sacrifício'], ['Frenesi', 'atkUp', 'Hemorragia', 'bleed', 'Maré Vermelha', 'atkDn', 'CON'], ['Rito de Sangue', 50, false, 'bleed']],
    ['radiacao', 'INT', 'dmg', 'rad', ['Raio Gama', 'Chuva Ácida', 'Fissão de Hiruko', 'Meia-Vida', 'Ponto Crítico'], ['Mutação', 'atkUp', 'Contaminar', 'rad', 'Nuvem Tóxica', 'poison', 'SOR'], ['Fusão do Núcleo', 38, true, 'rad']],
  ];
  E.forEach(([el, attr, kind, st, n, , forb], i) => {
    const res = el === 'shukketsu' ? 'san' : 'aura', h = res === 'san' ? .6 : 1, c = v => Math.round(v * h), dk = kind === 'heal' ? 'dmg' : kind;
    chain(i * 40, 2, [sk(n[0], kind, attr, el, 12, c(5), 0, 0, { res }), pas('Proteção de ' + PATRON[el], 'res', 0, 15, el),
      sk(n[1], kind, attr, el, 12, c(9), 0, 0, { res, area: true, ct: 125, xp: 20 }), sk(n[2], kind, attr, el, 20, c(10), 0, 0, { res, st, xp: 25 }),
      sk(n[3], kind, attr, el, 26, c(18), 0, 0, { res, st, area: true, ct: 150, xp: 40 }), sk(n[4], kind, attr, el, 45, 0, 0, 0, { limit: true, area: true, st, ct: 150, xp: 40 }),
      // poderes proibidos: custam Sanidade e deixam uma sequela no próprio usuário
      ...(forb ? [sk(forb[0], dk, attr, el, forb[1], forb[2] ? 14 : 12, 0, 0, { res: 'san', area: forb[2], back: forb[3], st, xp: 50 })] : [])]);
  });
  E.forEach(([el, attr, kind, , , s], i) => {
    const dk = kind === 'heal' ? 'dmg' : kind;
    chain(i * 40 + 20, 3, [buff(s[0], attr, el, s[1], 5), sk(s[2], dk, attr, el, 6, 6, 0, 0, { st: s[3], xp: 15 }), sk(s[4], dk, attr, el, 5, 10, 0, 0, { st: s[5], area: true, ct: 120, xp: 25 }), pas('Dom de ' + PATRON[el], s[6], 5, 20, el)]);
  });
  // técnicas de arma: exigem o tipo de arma equipado (sem arma = punhos)
  const W = (name, req, attr, power, cost, o = {}) => sk(name, 'dmg', attr, 'fis', power, cost, 0, 0, { req, xp: 15, ...o });
  chain(10, 2, [W('Corte Rápido', 'lamina', 'FOR', 10, 3, { ct: 70, xp: 10 }), W('Estocada', 'lamina', 'DES', 16, 5, { st: 'bleed' }), W('Dança de Lâminas', 'lamina', 'DES', 12, 8, { area: true, xp: 20 }), W('Corte do Relâmpago', 'lamina', 'FOR', 28, 9, { ct: 130, xp: 30 })]);
  chain(90, 2, [W('Investida', 'lanca', 'FOR', 16, 4, { xp: 10 }), W('Varredura', 'lanca', 'FOR', 11, 7, { area: true }), W('Perfurar Armadura', 'lanca', 'DES', 14, 6, { st: 'defDn', xp: 20 }), W('Empalar', 'lanca', 'FOR', 26, 9, { st: 'stun', xp: 30 })]);
  chain(170, 2, [W('Tiro Duplo', 'fogo', 'DES', 14, 4, { ct: 80, xp: 10 }), W('Tiro na Perna', 'fogo', 'DES', 12, 5, { st: 'agiDn' }), W('Rajada', 'fogo', 'DES', 12, 8, { area: true, xp: 20 }), W('Tiro Fatal', 'fogo', 'DES', 30, 9, { ct: 140, xp: 30 })]);
  chain(250, 2, [W('Jab', 'punho', 'DES', 8, 2, { ct: 50, xp: 10 }), W('Gancho', 'punho', 'FOR', 14, 5, { st: 'stun' }), W('Chute Giratório', 'punho', 'AGI', 10, 7, { area: true, xp: 20 }), W('Punho de Ferro', 'punho', 'FOR', 24, 8, { st: 'defDn', xp: 30 })]);
  // passivas de atributo e o Limite físico preenchem os vãos perto do centro
  const fill = [sk('Golpe Limite', 'dmg', 'FOR', 'fis', 40, 0, 0, 0, { limit: true, xp: 20 }), ...['CON', 'AGI', 'INT', 'SAB', 'DES', 'SOR', 'CAR'].map(a => pas('Treino de ' + a, a, 5))];
  for (let r = 2; r <= 4 && fill.length; r++) for (let x = C - r; x <= C + r; x++) for (let y = C - r; y <= C + r; y++) if (fill.length && free(x, y)) put(x, y, fill.shift());
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
  const BOSS = [['kagutsuchi', 'Ifrit das Fornalhas', 'susanoo', 'INT'], ['susanoo', 'Leviatã do Porto', 'indra', 'INT'], ['atlas', 'Colosso de Ferro', 'fuhaku', 'FOR'], ['indra', 'Arconte da Tempestade', 'atlas', 'INT'], ['fuhaku', 'Rainha dos Corvos', 'kagutsuchi', 'DES'],
    ['amaterasu', 'Serafim Caído', 'tsukuyomi', 'SAB'], ['tsukuyomi', 'Senhor dos Pesadelos', 'amaterasu', 'INT'], ['shukketsu', 'Condessa Escarlate', 'amaterasu', 'INT'], ['radiacao', 'Filho de Hiruko', 'susanoo', 'INT']];
  const ray = el => s => s.el === el && s.kind !== 'passive' && s.res !== 'san' || (s.el === el && el === 'shukketsu' && s.kind !== 'passive' && !s.back);
  return [...B.map(([name, color, attrs, weak, resist, skills, o]) => make(name, color, attrs, weak, resist, skills, o)),
    ...BOSS.map(([el, name, weak, attr]) => make(name, '#111111', { [attr]: 75, CON: 70, AGI: 55, SAB: 60, FOR: 60 }, [weak], [el], ray(el), { boss: true, bon: { hpMax: 250, auraMax: 60, sanMax: 0 }, arma: 16, armor: 4, xpR: 80, goldR: 150 }))];
}

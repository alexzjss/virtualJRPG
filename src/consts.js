
// ---------- regras ----------
// Números de balanceamento (ajustados com tools/sim.js). VJ_RULES='{"hit":50}' sobrescreve para testar.
const R = { hit: 60, dmgDiv: 10, healDiv: 5, hpCon: 2, hpBase: 10, enemyAttr: 50, enemyXp: 10, aiFocus: .5,
  // gerador de inimigos: por patente, d = diferença do atributo principal em relação ao poder do grupo; hp = bônus de HP; sk = nº de skills; cost = peso no orçamento do encontro
  rank: { lacaio: { d: -7, hp: -25, sk: 1, xp: 5, cost: .5 }, comum: { d: 1, hp: 0, sk: 2, xp: 10, cost: 1 }, elite: { d: 7, hp: 40, sk: 4, xp: 25, cost: 2 }, chefe: { d: -8, hpPer: 34, sk: 8, xp: 80, arma: 8, tpl: -5, g: .78 } }, // tpl: desconto extra dos chefes do bestiário (têm atributos altos em tudo); g: quanto do crescimento do grupo o chefe acompanha
  diff: { facil: 1.3, normal: 1.5, dificil: 1.68, mortal: 1.86 },
  grow: { attr: .85, hp: 7, arma: .5, armor: .2 }, // quanto os inimigos gerados acompanham cada ponto de poder do grupo acima de 58 // orçamento do encontro em "inimigos comuns por herói"
  ...JSON.parse(process.env.VJ_RULES || '{}') };
const ATTRS = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'];
const EL = ['fis', 'kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'radiacao'];
const KINDS = ['dmg', 'mental', 'heal', 'passive'];
const DOT = ['burn', 'bleed', 'poison', 'rad'];
const CTRL = ['stun', 'sleep', 'para', 'frozen', 'possess', 'confuse']; // chefes só sofrem controle por 1 turno
const STK = [...DOT, 'possess', 'curse', 'frozen', 'marked', 'down', 'stun', 'sleep', 'para', 'silence', 'atkUp', 'atkDn', 'defUp', 'defDn', 'agiUp', 'agiDn', 'fear', 'fury', 'confuse'];
const VN = { kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', radiacao: 'Hiruko' };
const STN = { possess: 'Possessão', curse: 'Maldição', frozen: 'Congelado', marked: 'Marcado', down: 'Derrubado', burn: 'Queimadura', bleed: 'Sangramento', poison: 'Veneno', rad: 'Radiação', stun: 'Atordoado', sleep: 'Sono', para: 'Paralisia', silence: 'Silêncio', atkUp: 'ATQ↑', atkDn: 'ATQ↓', defUp: 'DEF↑', defDn: 'DEF↓', agiUp: 'AGI↑', agiDn: 'AGI↓', fear: 'Medo', fury: 'Fúria', confuse: 'Confusão' };
const ITYPES = ['cons', 'arma', 'armadura', 'acess', 'mat'], WT = ['', 'lamina', 'lanca', 'fogo', 'punho'], EFF = ['hp', 'aura', 'san', 'cure', 'body', 'rev', 'bomb'];
// partes do corpo: atributos penalizados (−10 cada enquanto crítica), status ao ficar crítica, penalidade para mirar, peso no sorteio
const BODY = { head: [['INT', 'SAB'], 'stun', 30, 6], torso: [['CON'], 'bleed', 0, 40], armL: [['FOR', 'DES'], 'atkDn', 15, 15], armR: [['FOR', 'DES'], 'atkDn', 15, 15], legL: [['AGI'], 'agiDn', 15, 12], legR: [['AGI'], 'agiDn', 15, 12] };
const PARTS = Object.keys(BODY), PL = { head: 'cabeça', torso: 'torso', armL: 'braço esq.', armR: 'braço dir.', legL: 'perna esq.', legR: 'perna dir.' };
const BBG = ['rubro', 'noite', 'floresta', 'brasa', 'gelo', 'vazio', 'santuario', 'tempestade'];
const CAMP = ['vigiar', 'cozinhar', 'conversar', 'treinar', 'meditar'];
const GMF = new Set(['arma', 'armor', 'gold', 'xpR', 'goldR']); // campos numéricos que só o mestre altera
const EXTRA = { vinc: [], body: {}, bon: { hpMax: 0, auraMax: 0, sanMax: 0 }, bio: '', gmNote: '', xpR: 0, goldR: 0 };
const sk = (name, kind, attr, el, power, cost, gx, gy, o = {}) => ({ name, kind, attr, el, power, cost, res: 'aura', st: '', xp: 10, gx, gy, limit: false, area: false, ct: 100, pas: 'hpMax', req: '', back: '', ex: '', d: '', rq: null, pierce: 0, ...o });
const it = (name, type, power, o = {}) => ({ name, type, power, eff: 'hp', attr: 'SOR', wt: '', el: '', price: 10, pierce: 0, reqFor: 0, grant: null, ...o });
const NEW = { skills: () => sk('Nova skill', 'dmg', 'FOR', 'fis', 10, 5, 0, 0), items: () => it('Novo item', 'cons', 10) };
const SCH = {
  skills: { name: 's', kind: KINDS, attr: ATTRS, el: EL, res: ['aura', 'san'], st: ['', ...STK], power: 'n', cost: 'n', xp: 'n', ct: 'n', gx: 'g', gy: 'g', limit: 'b', area: 'b', pas: ['hpMax', 'auraMax', 'sanMax', 'res', ...ATTRS], req: WT, pierce: 'p', back: ['', ...STK], ex: 't', d: 't' },
  items: { name: 's', type: ITYPES, eff: EFF, attr: ATTRS, wt: WT, el: ['', ...EL], power: 'n', price: 'n', pierce: 'p', reqFor: 'n' },
};
const TIER = { fraco: [.8, .6], normal: [1, 1], elite: [1.25, 1.6] }; // multiplicadores de atributos e de recompensa
const ROLES = { bruto: ['FOR', 'CON'], agil: ['AGI', 'DES'], conjurador: ['INT', 'SAB'], suporte: ['SAB', 'CAR'] }, ROLE_N = { bruto: 'Bruto', agil: 'Espreitador', conjurador: 'Conjurador', suporte: 'Arauto' };
const FOIL = { kagutsuchi: 'susanoo', susanoo: 'indra', atlas: 'fuhaku', indra: 'atlas', fuhaku: 'kagutsuchi', amaterasu: 'tsukuyomi', tsukuyomi: 'amaterasu', shukketsu: 'amaterasu', radiacao: 'susanoo' };
const ELCOL = { fis: '#8d8478', kagutsuchi: '#c2410c', susanoo: '#1d6fa5', atlas: '#8a6a3a', indra: '#b89400', fuhaku: '#2f8f6b', amaterasu: '#b8a44a', tsukuyomi: '#5b3fb0', shukketsu: '#8f0019', radiacao: '#5a8f00' };
const NUM = { xpR: 1, goldR: 1, arma: 1, armor: 1, gold: 1, hp: 1, aura: 1, san: 1, x: 1, y: 1 };

export { R, ATTRS, EL, KINDS, DOT, CTRL, STK, VN, STN, ITYPES, WT, EFF, BODY, PARTS, PL, BBG, CAMP, GMF, EXTRA, sk, it, NEW, SCH, TIER, ROLES, ROLE_N, FOIL, ELCOL, NUM };

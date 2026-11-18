import { AR, RU } from './config.js';


// ---------- regras ----------
// Números de balanceamento (ajustados com tools/sim.js). VJ_RULES='{"hit":50}' sobrescreve para testar.
const R = { hit: 60, dmgDiv: 10, healDiv: 5, hpCon: 2, hpBase: 10, enemyAttr: 50, enemyXp: 10, aiFocus: .5, iaExtra: true, domCap: 35, // iaExtra: false desliga Domínio, Defender, Concentrar e trio dos inimigos (campo `ia` do bestiário)
 
  // gerador de inimigos: por patente, d = diferença do atributo principal em relação ao poder do grupo; hp = bônus de HP; sk = nº de skills; cost = peso no orçamento do encontro
  rank: { lacaio: { d: -7, hp: -25, sk: 1, xp: 5, cost: .5 }, comum: { d: 1, hp: 0, sk: 2, xp: 10, cost: 1 }, elite: { d: 7, hp: 40, sk: 4, xp: 25, cost: 2 }, chefe: { d: -8, hpPer: 34, sk: 8, xp: 80, arma: 8, tpl: -5, g: .78 } }, // tpl: desconto extra dos chefes do bestiário (têm atributos altos em tudo); g: quanto do crescimento do grupo o chefe acompanha
  diff: { facil: 1.3, normal: 1.5, dificil: 1.68, mortal: 1.86 },
  grow: { attr: .85, hp: 7, arma: .5, armor: .2 }, // quanto os inimigos gerados acompanham cada ponto de poder do grupo acima de 58 // orçamento do encontro em "inimigos comuns por herói"
  ...JSON.parse(process.env.VJ_RULES || '{}') };
const ATTRS = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'];
const EL = ['fis', 'kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko', 'aura', 'oculto'];
const KINDS = ['dmg', 'mental', 'heal', 'passive', 'form', 'util']; // form = transformação/postura; util = suporte sem cura (escudo, purificar, invocar)
const DOT = RU.DOT;
const CTRL = RU.CTRL; // chefes só sofrem controle por 1 turno
const STK = Object.keys(RU.ST);
const VN = { kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', hiruko: 'Hiruko' };
const STN = RU.ST, RESN = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
const ITYPES = ['cons', 'arma', 'armadura', 'acess', 'mat', 'mun'], WT = ['', ...Object.keys(AR.TIPOS)], EFF = ['hp', 'aura', 'san', 'cure', 'body', 'rev', 'bomb', 'comp', 'oil'];
// partes do corpo: atributos penalizados (−10 cada enquanto crítica), status ao ficar crítica, penalidade para mirar, peso no sorteio
const BODY = { head: [['INT', 'SAB'], 'stun', 30, 6], torso: [['CON'], 'bleed', 0, 40], armL: [['FOR', 'DES'], 'atkDn', 15, 15], armR: [['FOR', 'DES'], 'atkDn', 15, 15], legL: [['AGI'], 'agiDn', 15, 12], legR: [['AGI'], 'agiDn', 15, 12] };
const PARTS = Object.keys(BODY), PL = { head: 'cabeça', torso: 'torso', armL: 'braço esq.', armR: 'braço dir.', legL: 'perna esq.', legR: 'perna dir.' };
const BBG = ['rubro', 'noite', 'floresta', 'brasa', 'gelo', 'vazio', 'santuario', 'tempestade'];
const CAMP = ['vigiar', 'cozinhar', 'conversar', 'treinar', 'meditar'];
const GMF = new Set(['arma', 'armor', 'gold', 'xpR', 'goldR', 'po']); // campos numéricos que só o mestre altera
const EXTRA = { ofi: [], po: 0, pof: [], up: {}, dia: [], rrUsed: 0, vinc: [], aw: [], nen: '', body: {}, bon: { hpMax: 0, auraMax: 0, sanMax: 0 }, bio: '', gmNote: '', xpR: 0, goldR: 0 };
const sk = (name, kind, attr, el, power, cost, gx, gy, o = {}) => ({ name, kind, attr, el, power, cost, res: 'aura', st: '', xp: 10, gx, gy, limit: false, area: false, ct: 100, pas: 'hpMax', req: '', back: '', ex: '', d: '', rq: null, ...o });
const it = (name, type, power, o = {}) => ({ name, type, power, eff: 'hp', attr: 'SOR', wt: '', el: '', price: 10, ...o });
const NEW = { skills: () => sk('Nova skill', 'dmg', 'FOR', 'fis', 10, 5, 0, 0), items: () => it('Novo item', 'cons', 10) };
const SCH = {
  skills: { name: 's', kind: KINDS, attr: ATTRS, el: EL, res: ['aura', 'san'], st: ['', ...STK], power: 'n', cost: 'n', xp: 'n', ct: 'n', gx: 'g', gy: 'g', lk: 't', limit: 'b', area: 'b', pas: ['hpMax', 'auraMax', 'sanMax', 'res', 'vow', 'trig', 'mod', 'amp', 'bon', ...ATTRS], req: [...WT, ...Object.keys(AR.CAT)], reqItem: 't', back: ['', ...STK], ex: 't', d: 't' },
  items: { name: 's', type: ITYPES, eff: EFF, attr: ATTRS, wt: WT, kit: 't', el: ['', ...EL], power: 'n', price: 'n' },
};
const TIER = { fraco: [.8, .6], normal: [1, 1], elite: [1.25, 1.6] }; // multiplicadores de atributos e de recompensa
// ----- gerador de inimigos sob medida para o grupo -----
const ROLES = { bruto: ['FOR', 'CON'], agil: ['AGI', 'DES'], conjurador: ['INT', 'SAB'], suporte: ['SAB', 'CAR'] }, ROLE_N = { bruto: 'Bruto', agil: 'Espreitador', conjurador: 'Conjurador', suporte: 'Arauto' };
const FOIL = { kagutsuchi: 'susanoo', susanoo: 'indra', atlas: 'fuhaku', indra: 'atlas', fuhaku: 'kagutsuchi', amaterasu: 'tsukuyomi', tsukuyomi: 'amaterasu', shukketsu: 'amaterasu', hiruko: 'susanoo' };
const ELCOL = { fis: '#8d8478', kagutsuchi: '#c2410c', susanoo: '#1d6fa5', atlas: '#8a6a3a', indra: '#b89400', fuhaku: '#2f8f6b', amaterasu: '#b8a44a', tsukuyomi: '#5b3fb0', shukketsu: '#8f0019', hiruko: '#5a8f00' };
const NUM = { xpR: 1, goldR: 1, arma: 1, armor: 1, gold: 1, po: 1, hp: 1, aura: 1, san: 1, x: 1, y: 1 };

export { ATTRS, BBG, BODY, CAMP, CTRL, DOT, EFF, EL, ELCOL, EXTRA, FOIL, GMF, ITYPES, KINDS, NEW, NUM, PARTS, PL, R, RESN, ROLES, ROLE_N, SCH, STK, STN, TIER, VN, WT, it, sk };

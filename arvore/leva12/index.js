// Junta os arquivos por setor da Leva 12 (um por árvore/Vínculo).
import * as marcial from './marcial.js'; import * as kagutsuchi from './kagutsuchi.js'; import * as susanoo from './susanoo.js'; import * as atlas from './atlas.js';
import * as indra from './indra.js'; import * as fuhaku from './fuhaku.js'; import * as amaterasu from './amaterasu.js'; import * as tsukuyomi from './tsukuyomi.js';
import * as shukketsu from './shukketsu.js'; import * as hiruko from './hiruko.js'; import * as aura from './aura.js'; import * as oculto from './oculto.js'; import * as armas from './armas.js';
const TODOS = [marcial, kagutsuchi, susanoo, atlas, indra, fuhaku, amaterasu, tsukuyomi, shukketsu, hiruko, aura, oculto, armas];
const juntar = k => { const o = {}; for (const m of TODOS) for (const [b, ns] of Object.entries(m[k] || {})) { if (o[b]) throw new Error(`Leva 12: base repetida "${b}"`); o[b] = ns; } return o; };
export const ESTENDER12 = juntar('ESTENDER');
export const ABRIR12 = juntar('ABRIR');

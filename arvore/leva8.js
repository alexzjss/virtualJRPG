// Leva 8: ~1000 nós novos (ver ARVORE-SISTEMAS.md, "Leva 8"). Cada arquivo traz { setor: [ramos] }; aqui são juntados num só objeto.
import { LEVA8A } from './leva8a.js';
const PARTES = [LEVA8A];
export const LEVA8 = {};
for (const P of PARTES) for (const [el, brs] of Object.entries(P)) (LEVA8[el] ??= []).push(...brs);

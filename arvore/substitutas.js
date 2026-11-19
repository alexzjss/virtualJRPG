// Substitutas: quando uma técnica some da árvore (renomeada, fundida ou apagada), quem a tinha recebe a que herdou o conceito.
// A migração de src/state.js procura primeiro o nome igual e, se não houver, a substituta daqui; sem substituta, devolve o XP.
import { RENOMES } from './temas.js';
export const FUNDIDAS = {}; // nome apagado → nome que ficou (preenchido pelo passe de duplicadas)
export const SUBST = n => { let x = n; for (let i = 0; i < 5 && x; i++) { const y = RENOMES[x]?.[0] || FUNDIDAS[x]; if (!y) break; x = y; } return x === n ? undefined : x; };

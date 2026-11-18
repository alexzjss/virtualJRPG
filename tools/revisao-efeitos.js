// Revisão semântica dos efeitos: o parser já recusa sintaxe errada; aqui checamos se cada campo aponta para algo que o motor entende
// e se o efeito pode de fato acontecer no tipo de nó em que está.   node tools/revisao-efeitos.js
import { TREE } from '../tree.js';
import { expand, SUMMONS } from '../content.js';
const R = globalThis.RULES, ST = R.ST, out = [];
const nodes = [];
for (const [el, t] of Object.entries(TREE)) t.branches.forEach((br, bi) => br.forEach((n, ni) => {
  try { nodes.push({ ...expand(n), el, id: `${el}-${bi}.${ni}` }); } catch (e) { out.push(`✗ ${el}-${bi}.${ni} ${n.n}: ${e.message}`); }
}));
const byName = new Map(nodes.map(n => [n.n, n]));
const bad = (n, m) => out.push(`${n.id} · ${n.n} [${n.k}${n.tg ? '/' + n.tg : ''}]: ${m}`);
const RES = new Set(['hp', 'aura', 'san', 'limit']), MODK = new Set(['atk', 'def', 'agi', 'hit', 'crit', 'atkP', 'heal', 'bf', 'cw', 'cp', 'mx', 'cz', 'ma', 'esq', 'par', 'chq', 'rit', 'ctr', 'rn']);
const EL = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko'];
const SC = new Set(['atk', 'mental', 'heal', 'area', 'req', 'form', 'circ', 'fis', 'aura', 'oculto', ...EL]);
const BON = new Set(['hpMax', 'auraMax', 'sanMax', 'FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR']);
const OFF = new Set(['dmg', 'mental']);
const HITONLY = ['exec', 'vs', 'per', 'rage', 'pierce', 'sure', 'chain', 'drain', 'burst'];
for (const n of nodes) {
  for (const f of n.fx || []) {
    if (['st', 'spread'].includes(f.t) && !ST[f.k]) bad(n, `${f.t} com condição desconhecida ${f.k}`);
    if (f.t === 'det' && !['dot', 'neg', 'seal'].includes(f.k) && !ST[f.k]) bad(n, `det ${f.k} desconhecido`);
    if (f.t === 'vs' && !['neg', 'demon'].includes(f.k) && !ST[f.k]) bad(n, `vs ${f.k} desconhecido`);
    if (f.t === 'per' && !ST[f.k]) bad(n, `per ${f.k} desconhecido`);
    if (['drain', 'res', 'gain', 'lose'].includes(f.t) && !RES.has(f.r)) bad(n, `${f.t} recurso ${f.r}`);
    if (f.t === 'clima' && !R.CLIMA[f.k]) bad(n, `clima ${f.k}`);
    if (HITONLY.includes(f.t) && !OFF.has(n.k) && n.k !== 'passive' && !n.amp) bad(n, `${f.t} em nó ${n.k} não tem efeito (não há golpe)`);
    if (f.t === 'det' && !OFF.has(n.k) && n.k !== 'util') bad(n, `det em nó ${n.k}`);
    if (n.k === 'passive' && !n.on && !n.amp) bad(n, `passiva com fx mas sem gatilho: nunca dispara`);
    if (n.k === 'passive' && n.on && [...HITONLY, 'det'].includes(f.t)) bad(n, `gatilho com ${f.t}: gatilhos não causam golpe`);
    if (f.t === 'stack' && f.to && f.to !== 'self') bad(n, `stack só vale em si`);
    if (f.t === 'revive' && OFF.has(n.k)) bad(n, `revive em nó de dano`);
    if (f.t === 'st' && R.POS.includes(f.k) && OFF.has(n.k) && (!f.to || f.to === 'tgt')) bad(n, `bônus ${f.k} aplicado no INIMIGO alvo (falta self?)`);
    if (f.t === 'st' && R.NEG.includes(f.k) && !OFF.has(n.k) && (!f.to || f.to === 'tgt') && n.k !== 'passive') bad(n, `condição ruim ${f.k} no alvo de nó ${n.k} (alvo aliado?)`);
    if (f.t === 'st' && R.NEG.includes(f.k) && (f.to === 'ally' || f.to === 'self') && f.k !== 'exaus') bad(n, `condição ruim ${f.k} em ${f.to}`);
    if (f.t === 'st' && R.POS.includes(f.k) && f.to === 'foes') bad(n, `bônus ${f.k} nos inimigos`);
    if (f.t === 'cleanse' && OFF.has(n.k) && (!f.to || f.to === 'tgt')) bad(n, `cleanse no inimigo alvo`);
    if (f.t === 'shield' && OFF.has(n.k) && (!f.to || f.to === 'tgt')) bad(n, `escudo no inimigo alvo`);
    if (f.t === 'res' && OFF.has(n.k) && (!f.to || f.to === 'tgt')) bad(n, `res no inimigo alvo`);
    if (['strip', 'steal', 'push', 'lose', 'brk', 'det', 'spread'].includes(f.t) && !OFF.has(n.k) && (!f.to || f.to === 'tgt') && n.k !== 'passive') bad(n, `${f.t} no alvo de nó ${n.k}`);
    if (f.t === 'haste' && OFF.has(n.k) && (!f.to || f.to === 'tgt')) bad(n, `haste no inimigo alvo`);
    if (f.t === 'guard' && (n.tg === 'self' || OFF.has(n.k))) bad(n, `guard sem aliado alvo`);
    if (f.t === 'revive' && n.k === 'passive' && n.on !== 'fall' && n.on !== 'ally') bad(n, `revive em gatilho ${n.on}`);
  }
  if (n.form) for (const f of n.form.end || []) if (f.to && f.to !== 'self') bad(n, `fim de forma com alvo ${f.to}`);
  if (n.k === 'form' && !n.form) bad(n, 'forma sem fm');
  if (n.form && n.k !== 'form') bad(n, 'fm em nó que não é forma');
  if (n.k === 'heal' && !(n.p > 0) && !n.st && !(n.fx || []).length && !n.summon) bad(n, 'cura vazia');
  if (n.k === 'util' && !(n.fx || []).length && !n.summon && !n.dom && !n.st) bad(n, 'util vazio');
  if (n.k === 'passive' && !n.mod && !n.bon && !n.on && !n.vow && !n.amp && !n.pas && !n.rea) bad(n, 'passiva vazia');
  if (n.mod) for (const k in n.mod) if (!MODK.has(k)) bad(n, `mod ${k} desconhecido`);
  if (n.bon) for (const k in n.bon) if (!BON.has(k)) bad(n, `bon ${k} desconhecido`);
  if (n.sc && !SC.has(n.sc) && !/^w[tc]:/.test(String(n.sc))) bad(n, `escopo ${n.sc}`);
  if (n.on && !R.ON[n.on]) bad(n, `gatilho ${n.on}`);
  if (n.on && !(n.fx || []).length) bad(n, `gatilho sem efeito`);
  if (n.vow && !R.VOW[n.vow]) bad(n, `voto ${n.vow}`);
  if (n.aw && !R.AW[n.aw]) bad(n, `despertar ${n.aw}`);
  if (n.cs && !R.CS[n.cs]) bad(n, `estado ${n.cs}`);
  if (n.cat && !R.NENN[n.cat]) bad(n, `categoria ${n.cat}`);
  if (n.st && !ST[n.st]) bad(n, `st ${n.st}`);
  if (n.st && R.NEG.includes(n.st) && !OFF.has(n.k) && n.k !== 'passive') bad(n, `st ruim ${n.st} em nó ${n.k}`);
  if (n.st && R.POS.includes(n.st) && OFF.has(n.k)) bad(n, `st bom ${n.st} em nó de dano (vai para o inimigo)`);
  if (n.summon && !SUMMONS[n.summon]) bad(n, `invocação ${n.summon} não existe`);
  for (const k of ['pre', 'combo']) for (const p of String(n[k] || '').split('|').filter(Boolean)) if (!byName.has(p)) bad(n, `${k} "${p}" não existe`);
  if (n.duo && !byName.has(n.duo)) bad(n, `duo "${n.duo}" não existe`);
  else if (n.duo && byName.get(n.duo).duo !== n.n) bad(n, `duo não recíproco: ${n.duo} → ${byName.get(n.duo).duo}`);
  for (const p of n.trio || []) if (!byName.has(p)) bad(n, `trio "${p}" não existe`);
  if (n.amp && !byName.has(n.amp)) bad(n, `amp "${n.amp}" não existe`);
  if (n.ex && nodes.filter(o => o.ex === n.ex).length < 2) bad(n, `ex "${n.ex}" sem par`);
  if (n.nf && n.k === 'form') bad(n, 'forma que exige estar transformado');
  if (n.chg && !OFF.has(n.k)) bad(n, 'concentração em nó que não é dano');
  if (n.hits > 1 && !OFF.has(n.k)) bad(n, 'hits em nó que não é dano');
  if (n.area && n.tg === 'self') bad(n, 'área e em si');
  if (n.limit && n.c) bad(n, `Limite com custo ${n.c}`);
  if (n.rea && n.k === 'passive') bad(n, 'reação em passiva');
  if (n.v2 && !EL.includes(n.v2)) bad(n, `v2 ${n.v2}`);
  if (n.dom?.tick && !ST[n.dom.tick]) bad(n, `tick ${n.dom.tick}`);
}
console.log(out.join('\n'));
console.log(`${nodes.length} nós · ${out.length} apontamentos`);

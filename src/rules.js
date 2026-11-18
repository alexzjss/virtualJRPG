import { SCENES, SUMMONS, buildBestiary } from '../content.js';
import crypto from 'crypto';
import { S, log, newScene } from './state.js';
import { AR, OF, RU } from './config.js';
import { ATTRS, BODY, CTRL, DOT, ELCOL, EXTRA, FOIL, PARTS, PL, R, RESN, ROLES, ROLE_N, STN, TIER, VN } from './consts.js';

// recalcula máximos de personagens e modelos antes de enviar o estado
const prep = () => { Object.values(S.chars).forEach(derive); Object.values(S.chars).forEach(normSlots); const hs = Object.values(S.chars).filter(c => !c.enemy && !c.summon); for (const c of hs) c.bondMax = Math.max(0, ...hs.filter(o => o !== c).map(o => bondLv(c, o))); for (const [k, b] of Object.entries(S.bestiary)) { b.id = k; b.bon ??= { hpMax: 0, auraMax: 0, sanMax: 0 }; b.body ??= {}; b.vinc ??= []; derive(b); b.hp = b.hpMax; } };
// herói que caiu e voltou (cura, item, mestre) é reencaixado na fila logo após o tempo atual, sem tempo velho ou ausente
const reseat = () => {
  const T = S.battle.ticks;
  for (const ch of Object.values(S.chars)) {
    if (!ch.fell || ch.enemy) continue;
    if (ch.hp <= 0) { if (ch.dead) delete T[ch.id]; continue; } // ainda caído: continua na contagem; morto sai
    delete ch.fell; delete ch.dying;
    if (!S.battle.active || ch.dead || !(ch.id in T || onMap(ch))) continue;
    const others = Object.keys(T).filter(k => k !== ch.id && S.chars[k] && !S.chars[k].dead && (S.chars[k].hp > 0 || !S.chars[k].enemy)).map(k => T[k]);
    T[ch.id] = (others.length ? Math.min(...others) : 0) + delay(ch);
  }
};
const usable = () => { for (const ch of Object.values(S.chars)) { if (S.battle.active && ch.id in S.battle.ticks) ch.cant = Object.fromEntries([...ch.skills, ...wSk(ch)].filter(k => SK(k) && SK(k).kind !== 'passive').map(k => [k, cantUse(ch, effSkill(ch, k))])); else delete ch.cant; } };
let cfgSig = JSON.stringify(S.ofiCfg);
const ofiSync = force => { const sg = JSON.stringify(S.ofiCfg); if (force || sg !== cfgSig) { cfgSig = sg; OF.apply(S.ofiCfg); } }; // reaplica o catálogo de ofícios do mestre quando ele muda (desfazer pode trocá-lo)
const pick = a => a[Math.floor(Math.random() * a.length)];
const d100 = () => 1 + Math.floor(Math.random() * 100);
const rid = () => crypto.randomBytes(4).toString('hex');
const int = (v, lo = 0, hi = 9999) => Math.min(hi, Math.max(lo, Math.round(+v) || 0));
const okUrl = v => /^(https?:\/\/[^\s'"()<>]+|\/(uploads|maps)\/[\w.-]+)$/.test(v);
const can = (c, ch) => ch && (c.role === 'gm' || (c.role === 'player' && ch.owner === c.name));
const scene = () => S.scenes[S.scene];
const eq = (ch, slot) => slot === 'arma' && ch.st?.disarm ? undefined : S.items[ch.equip[slot]]; // Desarmado: a arma não conta
const at0 = (ch, a) => ch.attrs[a] + (eq(ch, 'acess')?.attr === a ? eq(ch, 'acess').power + (ch.up?.[ch.equip.acess]?.p || 0) : 0) + (eq(ch, 'arma')?.mod ? AR.kv(eq(ch, 'arma').mod).a[a] || 0 : 0); // arma pode dar atributo enquanto empunhada
// técnicas da arma: o id 'w:<item>:<n>' aponta para a lista sk do item; só valem com a arma equipada
const SK = id => { if (typeof id !== 'string' || !id.startsWith('w:')) return S.skills[id]; const [, k, n] = id.split(':'), s = S.items[k]?.sk?.[+n]; return s ? { ...s, wpn: k } : undefined; };
const wSk = ch => { const k = ch.equip?.arma, l = S.items[k]?.type === 'arma' && S.items[k].sk; return Array.isArray(l) ? l.map((_, n) => `w:${k}:${n}`) : []; };
const hasSk = (ch, id) => ch.skills.includes(id) || wSk(ch).includes(id);
const statOf = (a, s) => (s.attr2 ? Math.round((at(a, s.attr) + at(a, s.attr2)) / 2) : at(a, s.attr)) - sanPen(a); // ataque com dois atributos usa a média
const lvl = (ch, k) => { const d = ch.body[k] || 0; return d >= ch.hpMax * .3 ? 2 : d >= ch.hpMax * .15 ? 1 : 0; }; // 0 ileso, 1 ferido, 2 crítico
const at = (ch, a) => at0(ch, a) - 10 * PARTS.filter(k => BODY[k][0].includes(a) && lvl(ch, k) === 2).length;
const healBody = (ch, v) => { while (v > 0) { const k = PARTS.filter(p => ch.body[p] > 0).sort((x, y) => ch.body[y] - ch.body[x])[0]; if (!k) break; const d = Math.min(v, ch.body[k]); ch.body[k] -= d; v -= d; } };
// máximos derivados dos atributos (+ bônus de passivas/mestre); valores atuais nunca passam do máximo
const BASE = { hpMax: ch => Math.floor(at0(ch, 'CON') * R.hpCon) + R.hpBase, auraMax: ch => Math.floor((at0(ch, 'INT') + at0(ch, 'SAB')) / 4), sanMax: ch => Math.floor(at0(ch, 'SAB') / 2) + Math.floor(at0(ch, 'CAR') / 4) };
const derive = ch => { for (const k in BASE) { ch[k] = Math.max(1, BASE[k](ch) + (ch.bon[k] || 0) - (ch.scar?.[k] || 0)); const c = k.slice(0, -3); ch[c] = Math.min(ch[c], ch[k]); } };
const evolveCh = ch => { const up = Object.keys(ch.marks).filter(a => d100() > ch.attrs[a] && ch.attrs[a] < 100); up.forEach(a => ch.attrs[a]++); ch.marks = {}; return up; };
const sanPen = ch => { const p = ch.san / (ch.sanMax || 1); return p <= 0 ? 30 : p <= .25 ? 20 : p <= .5 ? 10 : 0; };
// CTB: quanto maior a AGI, menor o intervalo entre turnos
// heróis caídos continuam na fila: o "turno" deles conta para a morte
const nextOf = T => Object.keys(T).filter(k => { const ch = S.chars[k]; return ch && !ch.dead && (ch.hp > 0 || !ch.enemy); }).sort((a, b) => T[a] - T[b] || a.localeCompare(b))[0];
const current = () => nextOf(S.battle.ticks);
const order = () => { const T = { ...S.battle.ticks }, out = []; for (let i = 0; i < 8; i++) { const id = nextOf(T); if (!id) break; out.push(id); T[id] += delay(S.chars[id]); } return out; }; // próximos turnos previstos
const onMap = ch => ch.x != null && ch.scene === S.scene;
// quem acabou de perder um turno fica 2 turnos imune a novo controle (evita ficar travado para sempre)
const addLimit = (ch, v) => ch.limit = Math.min(100, ch.limit + v);
// ---------- laços, Aflição e Virtude ----------
const bondKey = (a, b) => [a.id, b.id].sort().join('|');
const bondLv = (a, b) => RU.bondLv((S.bonds ??= {})[bondKey(a, b)] || 0);
const bondAdd = (a, b, n = 1) => { S.bonds ??= {}; const k = bondKey(a, b), was = bondLv(a, b); S.bonds[k] = (S.bonds[k] || 0) + n; return bondLv(a, b) > was ? bondLv(a, b) : 0; };
function breakCheck(ch) { // Sanidade em zero: teste de SAB. Falha = Aflição, crítico = Virtude. Volta com 25% da Sanidade.
  if (ch.enemy || ch.dead || ch.summon) return;
  if (ch.san > 0) { ch.collapsed = false; return; }
  if (ch.collapsed) return;
  ch.collapsed = true;
  const target = int(at(ch, 'SAB'), 1, 95), r = d100(), crit = r <= Math.max(1, Math.floor(target / 10)), ok = r <= target;
  ch.san = Math.max(1, Math.ceil(ch.sanMax * .25));
  if (crit) { const k = pick(Object.keys(RU.VIR)); ch.afl = { t: 'v', k }; log(ch.name, `chega ao limite da mente (SAB ${target}% → ${r}): CRÍTICO! Virtude: ${RU.VIR[k][0]}. ${RU.VIR[k][1]}`, 'ok', { d: r, rr: { l: 'SAB', t: target, res: 'CRÍTICO', c: ch.id } }); }
  else if (ok) log(ch.name, `chega ao limite da mente (SAB ${target}% → ${r}) e se segura. Volta com ${ch.san} de Sanidade.`, 'ok', { d: r, rr: { l: 'SAB', t: target, res: 'Sucesso', c: ch.id } });
  else { const k = pick(Object.keys(RU.AFL)); ch.afl = { t: 'a', k }; log(ch.name, `chega ao limite da mente (SAB ${target}% → ${r}): Aflição: ${RU.AFL[k][0]}. ${RU.AFL[k][1]}`, 'bad', { d: r, rr: { l: 'SAB', t: target, res: 'Falha', c: ch.id } }); }
}
// ---------- sistema de skills: passivas, modificadores, votos, transformações ----------
// passivas lidas pelo motor (modificador, gatilho, voto, amplificação) ocupam slots: 4, mais 1 a cada 100 XP gasto em skills; as trocas são feitas no acampamento
const slotted = s => s && s.kind === 'passive' && ['mod', 'trig', 'vow', 'amp'].includes(s.pas);
const spentXp = ch => (ch.skills || []).reduce((a, k) => a + (S.skills[k]?.xp || 0), 0);
const slotMax = ch => 4 + Math.floor(spentXp(ch) / 100);
function normSlots(ch) { // mantém só passivas aprendidas, respeita o limite e ocupa vagas livres na ordem em que foram aprendidas
  if (ch.enemy || ch.summon) return;
  const legacy = !Array.isArray(ch.pslots), max = slotMax(ch), own = (ch.skills || []).filter(k => slotted(S.skills[k]));
  const keep = (ch.pslots || []).filter((k, i, l) => own.includes(k) && l.indexOf(k) === i).slice(0, max);
  ch.pslots = [...keep, ...own.filter(k => !keep.includes(k) && (legacy || !(ch.pslotOff || []).includes(k)))].slice(0, max);
}
const passOf = ch => (ch.skills || []).filter(k => { const s = S.skills[k]; return s && s.kind === 'passive' && (!slotted(s) || ch.enemy || ch.summon || !Array.isArray(ch.pslots) || ch.pslots.includes(k)); }).map(k => S.skills[k]);
const vows = ch => passOf(ch).filter(p => p.vow && !ch.bt?.broken?.[p.vow]).map(p => p.vow);
const inScope = (sc, s, ch) => !sc ? true : sc === 'form' ? !!ch.st?.form : !s ? false : sc === 'circ' ? !!s.circ : sc === 'atk' ? !!s.basic : sc === 'mental' ? s.kind === 'mental' : sc === 'heal' ? s.kind === 'heal' : sc === 'area' ? !!s.area : sc === 'req' ? !!(s.req || s.wpn) : sc.startsWith('wt:') ? !!(s.basic || s.req || s.wpn) && wtype(ch) === sc.slice(3) : sc.startsWith('wc:') ? !!(s.basic || s.req || s.wpn) && !!AR.CAT[sc.slice(3)]?.includes(wtype(ch)) : s.el === sc; // wt:<tipo> = maestria de um tipo de arma
function modsOf(ch, s) { // soma dos modificadores das passivas (no escopo da skill) e da transformação ativa
  const m = { atk: 0, def: 0, agi: 0, hit: 0, crit: 0, atkP: 0, heal: 0, bf: 0, cw: 0, cp: 0, mx: 0, cz: 0, ma: 0, esq: 0, par: 0, chq: 0, rit: 0, ctr: 0, rn: 0 }, add = o => { for (const k in o) m[k] = (m[k] || 0) + o[k]; };
  for (const p of passOf(ch)) if (p.mod && inScope(p.sc, s, ch)) add(p.mod);
  const f = ch.form && ch.st?.form && SK(ch.form); if (f?.form) add(f.form.m);
  if (vows(ch).includes('tempo')) m.hit += 15;
  if (ch.st?.mark) add({ atk: 30, agi: 20, crit: 10 }); // Marca do Caçador
  const D = S.battle?.dom; if (D) add(ch.enemy === D.side ? D.ally : D.foe); // Expansão de Domínio aberta
  const af = ch.afl && (ch.afl.t === 'v' ? RU.VIR : RU.AFL)[ch.afl.k]; if (af) add(af[2]); // Aflição ou Virtude
  const wu = ch.up?.[ch.equip?.arma]; // assinatura, runas e arma viva
  if (wu) { if (wu.sig != null) add(OF.SIG[wu.sig]?.m || {}); for (const rn of wu.g || []) add(OF.RUNAS[rn]?.mod || {}); if (wu.living && stageOf(wu.kills) >= 3 && s?.basic) m.crit += 10; }
  const wp = eq(ch, 'arma'); // traços da arma empunhada: bônus fixos sempre; acerto e crítico só no ataque básico; sem o atributo pedido, −20 de acerto nos golpes com ela
  if (wp?.type === 'arma') { const P = AR.prof(wp); add(P.mod.m); if (s?.basic) { m.hit += P.hit; m.crit += P.crit; } if ((s?.basic || s?.req || s?.wpn) && AR.short(wp, x => at0(ch, x)).length) m.hit -= 20; }
  if (S.meal && S.battle?.active && !ch.enemy) add(S.meal.m); // refeição do acampamento
  if (ch.sharp && s?.basic) m.atkP += 3; // arma afiada
  if (S.battle?.active && !ch.enemy && ch.id in S.battle.ticks) for (const o of battlers()) { // laços: aliados queridos por perto fortalecem
    if (o === ch || o.enemy || o.hp <= 0) continue;
    const lv = bondLv(ch, o); if (lv >= 2) m.atk += 3; if (lv >= 3) m.def += 3; if (lv >= 4) m.hit += 5; if (lv >= 5) m.crit += 5;
  }
  return m;
}
const delay = ch => Math.round(1000 / Math.max(1, at(ch, 'AGI') * (ch.st.agiUp ? 1.25 : 1) * (ch.st.agiDn ? .75 : 1) * (ch.boss ? 2 : 1) * Math.max(.5, 1 + modsOf(ch).agi / 100))); // chefes agem com o dobro da frequência
function vowMult(a, s, t) {
  let m = 1;
  for (const v of vows(a)) switch (v) {
    case 'presa': m *= !a.bt?.prey || a.bt.prey === t.id ? 1.5 : .75; break;
    case 'corpo': m *= 1.3; break;
    case 'pureza': m *= (a.vinc || []).includes(s.el) ? 1.3 : s.basic || s.el === 'fis' ? .6 : 1; break;
    case 'sangue': m *= 1.4; break;
    case 'chama': m *= a.hp <= a.hpMax * .4 ? 1.6 : .85; break;
    case 'silencio': m *= s.area ? 1 : 1.35; break;
    case 'cacador': m *= t.enemy && t.cat !== 'humano' ? 1.4 : .5; break;
    case 'arma': m *= s.basic || s.req || s.wpn ? 1.35 : 1; break;
    case 'tempo': m *= 1.25; break;
  }
  return m;
}
const breakVow = (ch, v, why) => { (ch.bt ??= {}).broken ??= {}; if (ch.bt.broken[v]) return; ch.bt.broken[v] = true; const loss = Math.ceil(ch.sanMax * .2); ch.san = Math.max(0, ch.san - loss); log(ch.name, `rompeu o ${RU.VOW[v][0]} (${why}) e perde ${loss} de Sanidade.`, 'bad'); };
const compOf = ch => Object.keys(ch.inv || {}).find(k => S.items[k]?.eff === 'comp' && ch.inv[k] > 0);
// a skill como este personagem a usa: amplificações (versões Discente/Verdadeiro), afinidade de Aura e custos de votos
function effSkill(a, id) {
  const s0 = SK(id); if (!s0) return null;
  const s = { ...s0, id, pay: { ...(s0.pay || {}) }, fx: [...(s0.fx || [])] };
  if (s.wpn) { const w = S.items[s.wpn]; if (s.power && ['dmg', 'mental', 'heal'].includes(s.kind)) s.power += wpPow(a); if (s.el === 'fis' && w?.el) s.el = w.el; } // técnica da arma: soma a têmpera e herda o elemento
  for (const p of passOf(a)) if (p.amp === s0.name && p.up) { const u = p.up; s.power += u.p || 0; s.cost += u.c || 0; if (u.san) s.pay.san = (s.pay.san || 0) + u.san; if (u.area) s.area = true; if (u.hits) s.hits = u.hits; if (u.fx) s.fx.push(...u.fx); s.amped = (s.amped || 0) + 1; }
  const e = RU.nenEff(a, s0); if (e !== 1) s.power = Math.round(s.power * e); s.eff = e;
  const vs = vows(a);
  if (vs.includes('sangue') && s.kind !== 'passive') s.pay.hp = (s.pay.hp || 0) + 8;
  if (s.circ && vs.includes('preco')) { if (s.res === 'aura') s.cost = 0; s.pay.san = (s.pay.san || 0) + 4; }
  if (s.circ && s.pay.san && compOf(a)) { s.pay.san = Math.ceil(s.pay.san / 2); s.useComp = true; } // componente ritualístico corta o preço em Sanidade
  return s;
}
const stageOf = k => [10, 25, 50].filter(v => (k || 0) >= v).length;
const wpPow = a => { const u = a.up?.[a.equip?.arma]; return u ? (u.p || 0) + (u.living ? stageOf(u.kills) : 0) : 0; };
// ataque básico: vem da arma empunhada (atributo, tempo, golpes, área, condições e efeitos do perfil); sem arma, punhos com FOR e o poder base
const basicOf = a => { const wp = eq(a, 'arma'), P = AR.prof(wp);
  return { name: P.atkN || 'Ataque', kind: P.mental ? 'mental' : 'dmg', attr: P.wa, ...(P.wa2 ? { attr2: P.wa2 } : {}), el: wp?.el || 'fis', power: (wp?.power ?? a.arma) + wpPow(a) + modsOf(a, { basic: true }).atkP, cost: 0, res: 'aura', basic: true,
    ct: P.ct, ...(P.hits > 1 ? { hits: P.hits } : {}), ...(P.dupla ? { dupla: true } : {}), area: P.area, fx: AR.basicFx(wp), pay: {} }; };
const battlers = () => Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && !o.dead);
const skipping = o => o.st.stun || o.st.frozen || o.st.sleep || o.chg;
// técnica em dupla (1 nome) ou em trio (2 nomes): aliados de pé e distintos, que conhecem a skill par e podem pagar por ela
const linksOf = s => s.duo ? [s.duo] : s.trio?.length ? s.trio : null;
function partners(a, s) {
  const used = new Set(), out = [];
  for (const nm of linksOf(s) || []) {
    let hit = null;
    for (const p of battlers()) {
      if (p === a || used.has(p) || p.enemy !== a.enemy || p.hp <= 0 || skipping(p) || p.st.silence) continue;
      const k = p.skills.find(k => S.skills[k]?.name === nm), ps = k && S.skills[k];
      if (ps && p[ps.res] >= ps.cost) { hit = { p, ps }; break; }
    }
    if (!hit) return null;
    used.add(hit.p); out.push(hit);
  }
  return out;
}
// motivo para não poder usar agora ('' = pode)
function cantUse(a, s) {
  if (!s || s.kind === 'passive') return 'Passiva';
  if (s.wpn && a.equip?.arma !== s.wpn) return 'Arma não equipada';
  if (s.uses && (a.bt?.wu?.[s.id] || 0) >= s.uses) return 'Esgotada nesta batalha';
  if (s.req && !AR.reqOk(s.req, wtype(a)) && !((a.enemy || a.summon) && AR.CAT[s.req])) return 'Exige ' + (AR.CAT_N[s.req] || s.req); // req: um tipo de arma ou uma categoria (corte, esmag, perf, dist); inimigos e invocações não têm arma de inventário
  if (s.reqItem && !a.enemy && !a.summon && !RU.hasKit(a, S.items, s.reqItem)) return 'Exige ' + (RU.KIT[s.reqItem] || s.reqItem);
  if (!s.basic && (a.st.silence || a.st.fury)) return a.st.silence ? 'Silenciado' : 'Em fúria: só ataca';
  if (s.limit && a.limit < 100) return 'Limite incompleto';
  if (a[s.res] < s.cost && !(s.res !== 'hp' && s.fx?.some(f => f.t === 'ovr') && a.hp > (s.cost - a[s.res]) * 2)) return 'Falta ' + RESN[s.res]; // Sacrifício: paga com HP
  for (const [r, v] of Object.entries(s.pay || {})) if (r === 'hp' ? a.hp <= Math.ceil(a.hpMax * v / 100) : a[r] < v) return 'Falta ' + RESN[r];
  if (s.kind === 'form' && a.st.exaus) return 'Exausto';
  if (s.nf && !a.st.form) return 'Só transformado';
  if (linksOf(s) && !partners(a, s)) return s.trio ? 'Sem os dois parceiros do trio' : 'Sem parceiro para a dupla';
  if (s.dom && (!S.battle.active || a.aura < Math.ceil(a.auraMax / 2))) return S.battle.active ? 'Exige metade da Aura' : 'Só em batalha';
  const vs = vows(a);
  if (vs.includes('silencio') && s.area) return 'Voto do Silêncio';
  if (vs.includes('arma') && !s.basic && !s.req && !s.wpn && s.kind !== 'form') return 'Voto da Arma Única';
  return '';
}
const applySt = (t, k, n = 3) => {
  if (CTRL.includes(k) && t.imm > 0) return;
  if (CTRL.includes(k) && t.chg) interrupt(t);
  t.st[k] = t.boss && CTRL.includes(k) ? 1 : DOT.includes(k) ? Math.min(6, (t.st[k] || 0) + n) : n; // dano contínuo acumula até 6 turnos
};
const tickSt = ch => { for (const k in ch.st) if (--ch.st[k] <= 0) { delete ch.st[k]; expire(ch, k); } if (ch.imm > 0) ch.imm--; };
function expire(ch, k) { // condições com efeito ao acabar
  if (k === 'shield') ch.shield = 0;
  if (k === 'form') endForm(ch, true);
  if (k === 'seal') sealBoom(ch, 1);
  if (k === 'guarded') delete ch.guardBy;
}
function endForm(ch, colateral) {
  const f = ch.form && SK(ch.form); delete ch.form; delete ch.st.form;
  if (!f) return;
  let txt = '';
  if (colateral) for (const e of f.form?.end || []) txt += fx1(ch, f, ch, e, { stat: at(ch, f.attr) });
  log(ch.name, `deixa a forma ${f.name}${txt ? ': ' + txt.trim() : ''}.`, colateral && txt ? 'bad' : '');
}
function sealBoom(t, m) {
  const sd = t.sealD; delete t.sealD; delete t.st.seal;
  if (!sd || t.hp <= 0) return '';
  const d = Math.max(1, Math.round(sd.d * m)), txt = `O selo de ${sd.by} explode: ${d} de dano.${hurt(t, d)}`;
  log(t.name, txt, 'bad', { fx: { id: t.id, dmg: d, el: sd.el } });
  return ' [selo detonado]';
}
function livingKill(src, t) { // arma viva: cada abate conta; a cada estágio a arma sobe de poder
  const u = !src.enemy && t.enemy && src.up?.[src.equip?.arma]; if (!u?.living) return;
  const was = stageOf(u.kills); u.kills = (u.kills || 0) + 1;
  if (stageOf(u.kills) > was) log(src.name, `${S.items[src.equip.arma]?.name} desperta: estágio ${stageOf(u.kills)}${stageOf(u.kills) === 3 ? ' (ignora armadura e acerta críticos com mais facilidade)' : ''}!`, 'ok');
}
function interrupt(t) { if (!t.chg) return; const s = SK(t.chg.s); delete t.chg; delete t.st.charge; log(t.name, `perde a concentração${s ? ' de ' + s.name : ''}!`, 'bad'); }
// ---------- sistemas de batalha: Quebra, Cadeia, Ataque Total, Domínio, clima, reações ----------
const sideOf = ch => ch.enemy ? 'e' : 'h', TEN = [1, 1.5, 2, 3];
const climaOf = () => RU.CLIMA[S.battle.wx?.k] || null;
function brkHit(t, n, by) { // barra de Quebra de chefes e elites: fraquezas a esvaziam; Quebrado perde o turno e sofre +50%
  if (!t.brk || t.hp <= 0 || t.st.broken || n <= 0) return '';
  t.brk.cur = Math.max(0, t.brk.cur - n);
  if (t.brk.cur > 0) return ` [Quebra ${t.brk.cur}/${t.brk.max}]`;
  t.st.broken = 2; t.brk.cur = t.brk.max; if (t.chg) interrupt(t);
  if (by) addChain(by, 25);
  return ` ${t.name} QUEBROU!`;
}
// a Cadeia é só do grupo de heróis
function addChain(a, v) { if (!S.battle.active || a.enemy) return; const B = S.battle.chain ??= { h: 0, e: 0 }; B[sideOf(a)] = Math.min(100, B[sideOf(a)] + v); }
function chainBurst(a) { // barra de Cadeia cheia: cada aliado ataca em seguida, com bônus crescente
  const B = S.battle.chain; if (!B || B[sideOf(a)] < 100) return;
  const mates = battlers().filter(o => o.enemy === a.enemy && o.hp > 0 && !skipping(o) && !o.summon);
  if (mates.length < 2) return; // sozinho não há sequência: a barra espera um aliado
  B[sideOf(a)] = 0;
  log(a.name, 'CADEIA! O grupo ataca em sequência.', 'ok');
  mates.forEach((o, i) => { const f = battlers().filter(x => x.enemy !== a.enemy && x.hp > 0); if (f.length) strike(o, basicOf(o), pick(f), null, 0, { mult: 1 + .25 * i, nochain: true }); });
}
const allDown = side => { const f = battlers().filter(o => o.enemy !== side && o.hp > 0); return f.length > 0 && f.every(o => o.st.down || o.st.broken); };
function allOut(a) { // Ataque Total: com todo inimigo Derrubado ou Quebrado, o grupo inteiro cai em cima deles
  log(a.name, 'ATAQUE TOTAL!', 'ok');
  const mates = battlers().filter(o => o.enemy === a.enemy && o.hp > 0 && !skipping(o) && !o.summon);
  for (const o of mates) { const f = battlers().filter(x => x.enemy !== a.enemy && x.hp > 0); if (!f.length) break; strike(o, basicOf(o), pick(f), null, 0, { mult: 1.5, nochain: true }); }
}
function doDefend(a) { a.brv = Math.min(3, Math.max(0, a.brv || 0) + 1); applySt(a, 'defUp', 2); log(a.name, `se defende e guarda Coragem (${a.brv}/3).`, 'ok'); endTurn(a.id, 70); }
function doFocus(a) { a.ten = Math.min(3, (a.ten || 0) + 1); log(a.name, `concentra a Tensão (${a.ten}/3): o próximo golpe causa ×${TEN[a.ten]}.`, 'ok'); endTurn(a.id, 70); }
function openDomain(a, s) { // Expansão de Domínio: gasta toda a Aura; dois Domínios se chocam numa disputa de Aura
  const B = S.battle, old = B.dom, stat = x => Math.max(at(x, 'INT'), at(x, 'SAB')) + x.aura / 2, mine = stat(a) + d100() / 2;
  a.aura = 0;
  if (old && old.side !== a.enemy) {
    const theirs = old.pow + d100() / 2;
    log(a.name, `${s.name} se choca com ${old.name}! (${Math.round(mine)} contra ${Math.round(theirs)})`, 'ok');
    if (mine <= theirs) { applySt(a, 'exaus', 3); log(a.name, 'perde a disputa: o Domínio desmorona e ele fica Exausto.', 'bad'); return; }
    const ow = S.chars[old.by]; if (ow) applySt(ow, 'exaus', 3);
  }
  B.dom = { by: a.id, side: a.enemy, name: s.name, ttl: s.dom.dur, ally: s.dom.ally, foe: s.dom.foe, tick: s.dom.tick, pow: stat(a) };
  log(a.name, `abre o Domínio ${s.name}!`, 'ok', { fx: { id: a.id, a: a.id, s: s.name, el: s.el, heal: 0, dom: 1 } });
}
function closeDomain(why) { const D = S.battle.dom; if (!D) return; delete S.battle.dom; const o = S.chars[D.by]; if (o && !o.dead) applySt(o, 'exaus', 3); log(o?.name || 'Domínio', `${D.name} se desfaz${why ? ' (' + why + ')' : ''}; o usuário fica Exausto.`, 'bad'); }
// reação elemental do golpe com as condições do alvo
const mental0 = s => s.kind === 'mental';
const reactOf = (s, t) => s.kind === 'mental' ? null : RU.REACT.find(r => r.el.includes(s.el) && r.on.some(k => t.st[k]));
// passivas com gatilho; efeitos que causam dano não disparam por gatilho, para não haver cadeias sem fim
function trig(ch, ev, o) {
  if (!ch || !S.battle.active || !(ch.id in S.battle.ticks) || ch.dead) return;
  for (const p of passOf(ch)) if (p.on === ev && (!p.ch || Math.random() * 100 < p.ch)) {
    let txt = '';
    for (const f of p.fx || []) {
      if (f.t === 'det' || (f.t === 'lose' && f.r === 'hp')) continue;
      const tg = f.to === 'tgt' ? (o && o !== ch ? [o] : []) : f.to === 'ally' ? battlers().filter(x => x.enemy === ch.enemy && x.hp > 0) : f.to === 'foes' ? battlers().filter(x => x.enemy !== ch.enemy && x.hp > 0) : [ch];
      for (const t of tg) txt += fx1(ch, p, t, f, { stat: at(ch, p.attr || 'SAB') });
    }
    if (txt) log(ch.name, `${p.name}:${txt}`, 'ok');
  }
}
// um efeito da lista aplicado em um alvo; c = { d: dano causado, stat, fallen }
function fx1(a, s, t, f, c = {}) {
  if (!t || t.dead) return '';
  const T = S.battle.ticks;
  switch (f.t) {
    case 'st': if ((t.hp > 0 || f.k === 'regen') && Math.random() * 100 < (f.ch ?? 100)) { applySt(t, f.k, f.n + (t === a && current() === a.id ? 1 : 0)); return ` [${STN[f.k]}${t !== a && f.to ? ' em ' + t.name : ''}]`; } return '';
    case 'det': {
      if (t.hp <= 0) return '';
      if (f.k === 'seal') return t.sealD ? sealBoom(t, 1.5) : '';
      const ks = f.k === 'dot' ? DOT : f.k === 'neg' ? RU.NEG.filter(k => k !== 'seal') : [f.k]; let n = 0;
      for (const k of ks) if (t.st[k]) { n += t.st[k]; delete t.st[k]; }
      if (!n) return '';
      const d = Math.max(1, Math.round(f.m * n * (1 + modsOf(a, s).atk / 100)));
      return ` Detonação: +${d} de dano.${hurt(t, d, a)}`;
    }
    case 'drain': { if (!(c.d > 0) || a.hp <= 0) return ''; const v = Math.max(1, Math.round(c.d * f.p / 100)); a[f.r] = Math.min(a[f.r + 'Max'], a[f.r] + v); if (f.r === 'hp') healBody(a, v); return ` (+${v} ${RESN[f.r]} para ${a.name})`; }
    case 'strip': { const had = RU.POS.filter(k => t.st[k]).length + (t.shield > 0); for (const k of RU.POS) delete t.st[k]; t.shield = 0; delete t.st.shield; return had ? ' [bônus removidos]' : ''; }
    case 'steal': { const ks = RU.POS.filter(k => t.st[k]); for (const k of ks) { a.st[k] = Math.max(a.st[k] || 0, t.st[k]); delete t.st[k]; } return ks.length ? ` [roubou ${ks.map(k => STN[k]).join(', ')}]` : ''; }
    case 'push': if (t.id in T && t.hp > 0) { bump(t.id, Math.round(delay(t) * f.v / 100)); return ' [atrasado]'; } return '';
    case 'haste': if (t.id in T && t !== a) { T[t.id] = Math.max(T[a.id] ?? 0, T[t.id] - Math.round(delay(t) * f.v / 100)); return ` [${t.name} adiantado]`; } return '';
    case 'seal': if (t.hp <= 0) return ''; t.sealD = { d: f.p + Math.floor((c.stat || 0) / R.dmgDiv), el: s.el, by: a.name }; t.st.seal = f.n + (t === a ? 1 : 0); return ' [Selo]';
    case 'shield': { const v = Math.max(1, Math.round((f.p + Math.floor((c.stat || 0) / R.healDiv)) * (s.eff || 1))); t.shield = Math.max(t.shield || 0, v); t.st.shield = Math.max(t.st.shield || 0, 3); return ` [Escudo ${v}${t !== a ? ' em ' + t.name : ''}]`; }
    case 'cleanse': { const ks = RU.NEG.filter(k => t.st[k]); for (const k of ks) delete t.st[k]; delete t.sealD; if (t.stk?.doenca) { t.stk.doenca = 0; return ' [purificado; a Doença recua]'; } return ks.length ? ' [purificado]' : ''; }
    case 'revive': if (c.fallen || (t.hp <= 0 && !t.dead)) { t.hp = Math.max(t.hp, Math.ceil(t.hpMax * f.p / 100)); delete t.dying; delete t.fell; return ` [${t.name} se reergue]`; } return '';
    case 'res': if (f.r === 'limit') addLimit(t, f.p); else t[f.r] = Math.min(t[f.r + 'Max'], t[f.r] + f.p); return ` [+${f.p} ${RESN[f.r]}${t !== a ? ' em ' + t.name : ''}]`;
    case 'gain': if (f.r === 'limit') addLimit(a, f.p); else a[f.r] = Math.min(a[f.r + 'Max'], a[f.r] + f.p); return ` [+${f.p} ${RESN[f.r]}]`;
    case 'lose': if (f.r === 'hp') return t.hp > 0 ? ` (−${f.p} HP)${hurt(t, f.p, a)}` : ''; if (f.r === 'limit') t.limit = Math.max(0, t.limit - f.p); else t[f.r] = Math.max(0, t[f.r] - f.p); return ` [−${f.p} ${RESN[f.r]}]`;
    case 'spread': if (t.st[f.k]) { const o = battlers().filter(x => x.enemy === t.enemy && x !== t && x.hp > 0); o.forEach(x => applySt(x, f.k, t.st[f.k])); return o.length ? ` [${STN[f.k]} se espalha]` : ''; } return '';
    case 'clima': { const wx = S.battle.wx ??= { k: '', ttl: 0 }; wx.k = f.k; wx.ttl = f.n * Math.max(2, battlers().length); log(a.name, `o clima muda: ${RU.CLIMA[f.k]?.[0] || f.k}.`, 'ok'); return ` [${RU.CLIMA[f.k]?.[0] || f.k}]`; }
    case 'stack': { a.stk ??= {}; a.stk[f.k] = Math.min(f.n, (a.stk[f.k] || 0) + 1); return ` [${RU.STK[f.k][0]} ${a.stk[f.k]}]`; }
    case 'burst': { const n = a.stk?.[f.k] || 0; if (!n) return ''; a.stk[f.k] = 0; return ` [${n} ${RU.STK[f.k][0]} consumida${n > 1 ? 's' : ''}]`; }
    case 'brk': return brkHit(t, f.n, a);
    case 'scar': { const k = f.r === 'san' ? 'sanMax' : f.r === 'aura' ? 'auraMax' : 'hpMax', v = Math.max(1, Math.ceil(t[k] * f.p / 100)); (t.scar ??= {})[k] = (t.scar[k] || 0) + v; derive(t); return ` [cicatriz: −${v} ${RESN[k.slice(0, -3)]} máx.]`; }
    case 'clone': return cloneOf(a, s, f);
    case 'brand': if (t.hp > 0) { t.st.brand = Math.max(t.st.brand || 0, f.n); t.brandBy = a.id; return ` [Marca de Caça de ${a.name}]`; } return '';
    case 'guard': if (t !== a) { t.st.guarded = f.n; t.guardBy = a.id; return ` [${a.name} protege ${t.name}]`; } return '';
  }
  return '';
}
// efeitos que valem uma vez por uso (em si, nos aliados, nos inimigos)
function onceFx(a, s, stat) {
  let txt = '';
  for (const f of s.fx || []) {
    if (!f.to || f.to === 'tgt' || f.t === 'turn' || f.t === 'chain' || f.t === 'haste' && f.to === 'self') continue;
    const tg = f.to === 'self' ? [a] : battlers().filter(x => x.enemy === (f.to === 'ally' ? a.enemy : !a.enemy) && (x.hp > 0 || f.t === 'revive'));
    for (const t of tg) txt += fx1(a, s, t, f, { stat });
  }
  if (txt) log(a.name, `${s.name}:${txt}`, 'ok');
}
const hitFx = (a, s, t, c) => (s.fx || []).filter(f => (!f.to || f.to === 'tgt') && !(c.blk && f.t === 'st')).map(f => fx1(a, s, t, f, c)).join('');
// Ressonância: o último a agir foi um aliado (não você) com técnica do Vínculo pedido (ou 'any'), acertando o mesmo alvo
const resOk = (a, f, t) => { const L = S.battle?.lastAct; return !!L && L.id !== a.id && L.enemy === a.enemy && (f.k === 'any' || L.el === f.k) && L.t.includes(t.id); };
function fxMult(a, s, t) { // escalonamentos: execução, contra condição, por turno de condição, fúria do ferido
  let m = 1;
  for (const f of s.fx || []) {
    if (f.t === 'exec' && t.hp <= t.hpMax * f.p / 100) m *= f.m;
    if (f.t === 'vs' && (f.k === 'neg' ? RU.NEG.some(k => t.st[k]) : f.k === 'demon' ? t.enemy && t.cat !== 'humano' : t.st[f.k])) m *= f.m;
    if (f.t === 'per' && t.st[f.k]) m *= 1 + f.p / 100 * t.st[f.k];
    if (f.t === 'rage') m *= 1 + f.m * (1 - a.hp / (a.hpMax || 1));
    if (f.t === 'mad' && a.sanMax) m *= 1 + f.m * (1 - Math.max(0, a.san) / a.sanMax); // Loucura: quanto menos Sanidade, mais forte
    if (f.t === 'stack') m *= 1 + RU.STK[f.k][1] / 100 * (a.stk?.[f.k] || 0);
    if (f.t === 'burst') m *= 1 + f.m * (a.stk?.[f.k] || 0);
  }
  for (const f of s.fx || []) {
    if (f.t === 'every' && a.bt?.evNow === s.name) m *= f.m; // contador: o N-ésimo uso
    if (f.t === 'ovr' && a.bt?.ovrNow) m *= 1.3; // Sacrifício
    if (f.t === 'pop' && t.st.brand) { m *= t.brandBy !== a.id ? f.m : 1 + (f.m - 1) / 2; delete t.st.brand; delete t.brandBy; a.bt ??= {}; a.bt.popNow = 1; }
    if (f.t === 'rs' && resOk(a, f, t)) { m *= f.m; a.bt ??= {}; (a.bt.rsNow ??= new Set()).add(t.id); }
  }
  if (s.combo && a.lastSk && s.combo.split('|').includes(a.lastSk)) { m *= s.cm || 1.4; a.bt ??= {}; a.bt.combo = 1; }
  return m;
}
function hurt(t, d, src) { // dano em HP: escudo, tenacidade, Limite, acorda, quebra concentração, gatilhos, avisa queda
  const was = t.hp > 0; let note = ''; t.bt ??= {};
  if (t.shield > 0 && d > 0) { const ab = Math.min(t.shield, d); t.shield -= ab; d -= ab; note += ` Escudo absorve ${ab}.`; if (!t.shield) delete t.st.shield; }
  if (was && d >= t.hp) {
    const fall = !t.bt.fall && passOf(t).find(p => p.on === 'fall');
    if (t.st.endure || fall) { d = t.hp - 1; if (t.st.endure) delete t.st.endure; else { t.bt.fall = 1; trig(t, 'fall', src); } note += ` ${t.name} resiste com 1 HP!`; }
  }
  t.hp = Math.max(0, t.hp - d);
  addLimit(t, Math.ceil(100 * d / (t.hpMax || 1)));
  if (d > 0) { delete t.st.sleep; delete t.st.frozen; }
  if (t.chg && d >= t.hpMax * .2) interrupt(t);
  if (t.hp > 0 && d > 0) { trig(t, 'hurt', src); if (!t.bt.low && t.hp <= t.hpMax * .3) { t.bt.low = 1; trig(t, 'low', src); } }
  if (t.boss && !t.rage && t.hp > 0 && t.hp <= t.hpMax / 2) { // fúria: buffs, Limite cheio e dois lacaios do mesmo elemento
    t.rage = true; t.st.atkUp = t.st.agiUp = 99; t.limit = 100;
    const el = t.resist.find(e => e !== 'fis') || 'fis', ref = partyRef();
    if (S.battle.active && t.id in S.battle.ticks) for (let i = 0; i < 2; i++) { const mn = spawn(genFoe(el, pick(Object.keys(ROLES).filter(r => !(t.tune?.nosup && r === 'suporte'))), 'lacaio', ref), 'normal', t.x ?? 0, t.y ?? 0); derive(mn); mn.hp = mn.hpMax; S.battle.ticks[mn.id] = S.battle.ticks[t.id] + delay(mn); }
    return note + ` ${t.name} entra em fúria e invoca lacaios!`;
  }
  if (!was || t.hp) return note;
  if (t.summon?.rev && !t.summon.used) { t.summon.used = 1; t.hp = Math.ceil(t.hpMax / 2); return note + ` ${t.name} se levanta de novo!`; }
  if (t.summon) { t.dead = true; delete S.battle.ticks[t.id]; return note + ` ${t.name} se desfaz.`; }
  if (!t.enemy) { t.dying = 3; t.fell = true; }
  interrupt(t); if (t.form) endForm(t, false);
  Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && o !== t && o.enemy === t.enemy).forEach(o => { addLimit(o, 25); trig(o, 'ally', t); });
  if (src && src !== t) { trig(src, 'kill', t); livingKill(src, t); tally(src, 'ko', 1); }
  return note + ` ${t.name} caiu!`;
}
const bump = (id, v) => { if (id in S.battle.ticks) S.battle.ticks[id] += v; }; // empurra na fila só quem ainda está nela (invocação morta sai)
const tally = (ch, k, v) => { if (!S.battle.active) return; const st = (S.battle.stats ??= {})[ch.id] ??= { dmg: 0, heal: 0, crit: 0, ko: 0 }; st[k] = (st[k] || 0) + v; };
function endTurn(id, ct = 100) { // ct: custo de tempo da ação em %
  const a = S.chars[id];
  S.battle.n = (S.battle.n || 0) + 1; // ações já feitas nesta batalha
  if (a) { tickSt(a); bump(id, Math.round(delay(a) * (ct || 100) / 100)); if ((a.brv || 0) < 0) { bump(id, Math.round(delay(a) * -a.brv * .5)); a.brv = 0; } } // dívida de Coragem atrasa o personagem
  const B = S.battle, D = B.dom;
  if (D && D.by === id && --D.ttl <= 0) closeDomain('acabou o tempo'); else if (D && (!S.chars[D.by] || S.chars[D.by].hp <= 0)) closeDomain('o usuário caiu');
  if (B.wx?.ttl > 0 && --B.wx.ttl === 0) B.wx.k = scene().wx || '';
  for (let i = 0; i < 30; i++) { // início do turno do próximo: regen de Aura, dano contínuo, drenos, perda de turno, concentração e invocações
    const n = S.chars[current()];
    if (!n) return;
    n.bt ??= {};
    if (n.hp <= 0) { // contagem de morte
      n.dying = (n.dying ?? 3) - 1;
      if (n.dying <= 0) { n.dead = true; n.fell = true; delete n.dying; delete S.battle.ticks[n.id]; log(n.name, 'não resistiu e morreu.', 'bad'); }
      else { log(n.name, `está caído: ${n.dying} turno(s) até a morte`, 'bad'); bump(n.id, delay(n)); }
      continue;
    }
    if (S.battle.dom?.tick && n.enemy !== S.battle.dom.side && !n.summon) applySt(n, S.battle.dom.tick, 1);
    if (n.summon && --n.summon.ttl < 0) { log(n.name, 'se dissipa.', ''); n.dead = true; delete S.battle.ticks[n.id]; continue; }
    n.aura = Math.min(n.auraMax, n.aura + Math.max(1, Math.round(n.auraMax / 10)));
    if (n.st.regen) { const v = Math.max(1, Math.round(n.hpMax / 20 / (n.boss ? 3 : 1))); /* como o dano contínuo; chefes têm HP inflado e agem duas vezes */ n.hp = Math.min(n.hpMax, n.hp + v); healBody(n, v); log(n.name, `regenera ${v} HP.`, 'ok', { fx: { id: n.id, heal: v } }); }
    if (n.st.dread) { const v = Math.max(1, Math.round(n.sanMax / 12)); n.san = Math.max(0, n.san - v); log(n.name, `é corroído pelo pavor: −${v} de Sanidade.`, 'bad'); }
    const f = n.form && SK(n.form);
    if (f?.form?.dr && n.st.form) { // transformação drena a cada turno; sem recurso, ela acaba
      const dr = f.form.dr, short = Object.entries(dr).find(([r, v]) => r === 'hp' ? n.hp <= Math.ceil(n.hpMax * v / 100) : n[r] < v);
      if (short) endForm(n, true); else for (const [r, v] of Object.entries(dr)) { if (r === 'hp') n.hp = Math.max(1, n.hp - Math.ceil(n.hpMax * v / 100)); else n[r] -= v; }
    }
    n.rxT = 0; n.parT = 0; n.chqT = 0; // reação e aparar disponíveis de novo
    const dz = n.stk?.doenca || 0; if (dz >= 3) { const v = Math.max(1, Math.ceil(n.hpMax * .015 * (dz - 2))); n.hp = Math.max(1, n.hp - v); log(n.name, `a Doença (estágio ${dz}) consome ${v} HP.`, 'bad', { fx: { id: n.id, dmg: v } }); }
    if (vows(n).includes('tempo')) n.hp = Math.max(1, n.hp - Math.ceil(n.hpMax * .04));
    const dots = DOT.filter(k => n.st[k]).length;
    if (dots) {
      const d = dots * Math.max(1, Math.round(n.hpMax / 20));
      log(n.name, `sofre ${d} de dano contínuo.${hurt(n, d)}`, 'bad', { fx: { id: n.id, dmg: d } });
      if (!n.hp) { bump(n.id, delay(n)); continue; }
    }
    trig(n, 'turn');
    const skip = n.st.broken ? 'quebrado' : n.st.stun ? 'atordoado' : n.st.frozen ? 'congelado' : n.st.sleep ? 'dormindo' : n.st.para && d100() <= 50 ? 'paralisado' : '';
    if (!skip) {
      if (n.chg) { // concentração: espera os turnos e solta sozinha
        if (--n.chg.n > 0) { log(n.name, `continua concentrando ${SK(n.chg.s)?.name || ''}…`, ''); tickSt(n); bump(n.id, delay(n)); continue; }
        const c = n.chg; delete n.chg; delete n.st.charge;
        let t = S.chars[c.t]; if (!t || t.dead || !(t.id in S.battle.ticks) || (t.hp <= 0 && t.enemy !== n.enemy)) t = pick(battlers().filter(o => o.enemy !== n.enemy && o.hp > 0));
        if (t && doAct(n, { skill: c.s, target: t.id, aim: c.aim, release: true })) return;
        continue;
      }
      if (n.summon) { aiAct(n); return; } // invocações agem sozinhas
      return;
    }
    log(n.name, `está ${skip} e perde o turno`, 'bad'); n.imm = 3;
    tickSt(n); bump(n.id, delay(n));
  }
}

function redirect(a, t) { // provocar, guarda-costas e furtividade mudam o alvo de golpes únicos
  if (t.enemy === a.enemy) return t;
  const side = battlers().filter(o => o.enemy === t.enemy && o.hp > 0);
  const tz = side.filter(o => o.st.taunt); if (tz.length && !tz.includes(t)) t = tz[0];
  if (t.st.stealth && !a.st.focus) { const vis = side.filter(o => !o.st.stealth); if (vis.length) t = pick(vis); }
  const g = t.st.guarded && S.chars[t.guardBy]; if (g && g.hp > 0 && g.id in S.battle.ticks && g.enemy === t.enemy) t = g;
  return t;
}
function ammoFor(a, s) { // munição equipada: balas (armas de fogo) ou flechas (arcos e bestas), por N tiros: elemento, condição e perfuração
  const id = a.equip?.mun, am = S.items[id], wt = wtype(a);
  if (!am || am.type !== 'mun' || !AR.MUN(wt) || (am.for || 'fogo') !== wt || !(s.basic || (s.req && AR.reqOk(s.req, wt)) || s.wpn) || s.kind === 'mental') return null;
  a.shots ??= {};
  if (!(a.shots[id] > 0)) { if (!(a.inv[id] > 0)) { delete a.equip.mun; return null; } if (--a.inv[id] <= 0) delete a.inv[id]; a.shots[id] = am.shots + OF.hook(a, 'tiros'); log(a.name, `abre um pacote de ${am.name} (${a.shots[id]} tiros).`, ''); }
  a.shots[id]--; return am;
}
function strike(a, s, t, aim, bonus = 0, o = {}) {
  { const CW = S.battle.cmd, mw = CW && o.beat != null && CW.foe === a.id ? (CW.perf ? 1.25 : 1) * (CW.xmult || 1) : 1; if (mw !== 1) o = { ...o, mult: (o.mult || 1) * mw }; } // Perfeito de chefe ×1,25; Choque perdido ×1,3
  const am = ammoFor(a, s); if (am) { const pi = Math.max(am.pierce || 0, s.fx?.find(f => f.t === 'pierce')?.p || 0); s = { ...s, el: am.el || s.el, fx: [...(s.fx || []).filter(f => f.t !== 'pierce'), ...(pi ? [{ t: 'pierce', p: pi }] : []), ...(am.st ? [{ t: 'st', k: am.st, n: am.stn || 2, ch: am.stc ?? 100 }] : [])] }; }
  const ma = modsOf(a, s), stat = statOf(a, s), stTxt = s.st ? ` [${STN[s.st]}]` : '';
  if (s.kind === 'heal' || s.kind === 'util') {
    const fallen = t.hp <= 0; let txt = '';
    if (s.kind === 'heal') {
      const v = Math.max(1, Math.round((s.power + Math.floor(stat / R.healDiv)) * (t.st.curse ? .5 : 1) * (1 + ma.heal / 100) * (o.cx?.healMult || 1)));
      const before = t.hp; t.hp = Math.min(t.hpMax, t.hp + v); delete t.dying; healBody(t, v); tally(a, 'heal', t.hp - before); txt = `cura ${v} HP`;
      if (t === a && vows(a).includes('corpo')) breakVow(a, 'corpo', 'curou a si mesmo');
    }
    if (s.st) applySt(t, s.st);
    txt += hitFx(a, s, t, { d: 0, stat, fallen });
    log(a.name, `${s.name} → ${t.name}${txt ? ': ' + txt.trim() : ''}${stTxt}`, 'ok', { fx: { id: t.id, heal: s.kind === 'heal' ? 1 : 0, a: a.id, s: s.name, el: s.el, ...(s.limit ? { lim: 1 } : {}) } });
    if (s.kind === 'heal' && t !== a) trig(a, 'heal', t);
    return false;
  }
  const sure = s.fx?.some(f => f.t === 'sure');
  const pr = parryCheck(a, s, t, o, sure); if (pr === 'ok') return false; if (pr === 'bad') o = { ...o, mult: (o.mult || 1) * 1.5 };
  let rea = pickRea(a, s, t, o, sure, true);
  if (rea) {
    if (Math.random() * 100 < rea.rea.v) { log(t.name, `reage com ${rea.name} e esquiva de ${s.name}!`, 'ok', { fx: { id: t.id, miss: 1, a: a.id, s: s.name, el: s.el } }); return false; }
    log(t.name, `tenta ${rea.name}, mas não escapa.`, 'bad');
  }
  if (t.st.evade && !s.area && !sure && !o.counter) { delete t.st.evade; log(a.name, `${s.name} → ${t.name}: esquivou!`, 'bad', { fx: { id: t.id, miss: 1, a: a.id, s: s.name, el: s.el, ...(s.limit ? { lim: 1 } : {}) } }); return false; }
  const chance = sure ? 95 : int(stat + R.hit - (t.st.root ? 0 : Math.floor(at(t, 'AGI') / 2)) - (a.st.fear ? 20 : 0) - (a.st.curse ? 10 : 0) - (a.st.blind ? 25 : 0) - (a.st.exaus ? 15 : 0) + (a.st.focus ? 15 : 0) + (a.st.stealth ? 25 : 0) + ma.hit + (climaOf()?.[1].hit || 0) + (t.st.marked ? 20 : 0) - (aim ? BODY[aim][2] : 0) + bonus, 5, 95), r = d100();
  if (r > chance) {
    if (r >= 96) addLimit(a, 20);
    log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${r >= 96 ? 'DESASTRE' : 'errou'}`, 'bad', { d: r, rr: { l: s.name, t: chance, res: r >= 96 ? 'DESASTRE' : 'Errou', c: a.id, atk: 1 }, fx: { id: t.id, miss: 1, a: a.id, s: s.name, el: s.el, ...(s.limit ? { lim: 1 } : {}) } });
    trig(a, 'miss', t);
    const rf = t.form && t.st.form && SK(t.form)?.form?.ret; if (rf && a.id in S.battle.ticks && t.enemy !== a.enemy) { bump(a.id, Math.round(delay(a) * rf / 100)); log(t.name, `${a.name} perde o ritmo e tem o turno adiado.`, 'ok'); }
    return false;
  }
  if (!rea) rea = pickRea(a, s, t, o, sure, false); // bloqueio, absorção e revide só quando o golpe acerta
  a.bt ??= {}; if (!a.bt.prey && t.enemy !== a.enemy) a.bt.prey = t.id; // Voto da Presa: o primeiro inimigo ferido
  const wk = !!aim && t.weakPart === aim; // ponto fraco do chefe: dano dobrado
  const crit = !!o.cx?.crit || r <= Math.max(1, Math.floor(chance / 10) * (a.st.stealth ? 2 : 1) + ma.crit), mental = s.kind === 'mental', w = t.weak.includes(s.el), rs = t.resist.includes(s.el) || t.vinc.includes(s.el) || eq(t, 'acess')?.el === s.el, down = w && !t.st.down, bf = !mental && s.bf > 0 && !!o.cx?.bf; // Black Flash: só no Perfeito do Golpe no tempo
  a.bt ??= {}; const wu = (s.basic || s.req || s.wpn) && a.up?.[a.equip?.arma], olho = !a.bt.olho && OF.hook(a, 'olho') && !mental0(s) ? OF.hook(a, 'olho') : 0;
  const mt = modsOf(t), pierce = Math.min(100, (s.fx?.find(f => f.t === 'pierce')?.p || 0) + (wu?.living && stageOf(wu.kills) >= 3 && s.basic ? 40 : 0) + olho), rx = reactOf(s, t);
  if (olho) a.bt.olho = 1;
  const blkP = !mental && !s.area && !o.counter && t.enemy !== a.enemy ? AR.prof(eq(t, 'arma')).block : 0, blk = blkP > 0 && Math.random() * 100 < blkP; // escudo: bloqueia golpe físico único de inimigo
  const mult = (blk ? .4 : 1) * (bf ? 2.5 : crit ? 2 : 1) * (a.clone ? .5 : 1) * (w ? 1.5 : 1) * (rs ? .5 : 1) * (a.st.atkUp ? 1.25 : 1) * (a.st.atkDn ? .75 : 1) * (a.st.disarm && (a.enemy || a.summon) && !mental ? .8 : 1) * (a.st.fury ? 1.25 : 1) * (t.st.defUp ? .75 : 1) * (t.st.defDn ? 1.25 : 1) * (t.st.down ? 1.25 : 1) * (t.st.frozen ? 1.25 : 1) * (wk ? 2 : 1)
    * (1 + ma.atk / 100) * Math.max(.3, 1 - mt.def / 100) * vowMult(a, s, t) * fxMult(a, s, t) * (o.mult || 1) * (o.cx?.mult || 1) * (mental && t.st.dread ? 1.25 : 1) * (a.st.exaus ? .85 : 1)
    * (t.st.broken ? 1.5 : 1) * (rx?.m || 1) * (climaOf()?.[1][s.el] || 1) * (o.noten ? 1 : TEN[a.ten || 0]) * (rea && (rea.rea.t === 'block' || rea.rea.t === 'absorb') ? 1 - rea.rea.v / 100 : 1);
  const armor = mental || t.st.exposed ? 0 : (t.armor + (eq(t, 'armadura')?.power || 0) + (t.up?.[t.equip?.armadura]?.p || 0)) * (1 - pierce / 100);
  const d = Math.max(1, Math.round((s.power + Math.floor(stat / R.dmgDiv / (s.hits || 1)) + (o.plus || 0) - armor) * mult)); // multi-golpe divide o bônus do atributo; a armadura conta em cada golpe
  a.marks[s.attr] = true; if (s.attr2) a.marks[s.attr2] = true; tally(a, 'dmg', mental ? Math.min(d, t.san) : Math.min(d, t.hp)); if (crit) tally(a, 'crit', 1);
  let extra = '', part = '';
  const was = t.hp > 0;
  if (mental) t.san = Math.max(0, t.san - d);
  else { // localiza o golpe: parte mirada ou sorteio ponderado
    let roll = Math.random() * 100;
    part = aim || PARTS.find(k => (roll -= BODY[k][3]) < 0) || 'torso';
    const lv = lvl(t, part);
    t.body[part] = (t.body[part] || 0) + d;
    extra = hurt(t, d, a);
    if (t.hp > 0 && lv < 2 && lvl(t, part) === 2) { applySt(t, BODY[part][1]); extra += ` ${PL[part]} em estado crítico!`; }
  }
  if (wk) extra = ' PONTO FRACO!' + extra;
  if (bf && a.hp > 0) { const v = Math.round(a.auraMax / 4); a.aura = Math.min(a.auraMax, a.aura + v); extra = ` BLACK FLASH! (+${v} Aura)` + extra; }
  if (rx) { rx.on.forEach(k => delete t.st[k]); if (t.hp > 0 && rx.a) applySt(t, rx.a[0], rx.a[1]); extra += ` [Reação: ${rx.n}]`; }
  if (blk) extra += ' [bloqueado]';
  if (t.hp > 0 && !blk) { if (s.st) applySt(t, s.st); if (down) t.st.down = 1; }
  if (wu && t.hp > 0 && !mental && !blk) { // engastes e segundo elemento da liga
    for (const rn of wu.g || []) { const Ru = OF.RUNAS[rn]; if (Ru?.st && Math.random() * 100 < Ru.st[2]) { applySt(t, Ru.st[0], Ru.st[1]); extra += ` [${STN[Ru.st[0]]}: ${rn}]`; } if (Ru?.drain && a.hp > 0) a.hp = Math.min(a.hpMax, a.hp + Math.max(1, Math.round(d * Ru.drain / 100))); }
    if (wu.el2 && Math.random() < .3) { const e2 = OF.ELST[wu.el2]; if (e2) applySt(t, e2[0], e2[1]); }
  }
  if (s.el === 'susanoo' && t.hp > 0 && !mental && !rx && (S.battle.wx?.k === 'chuva' || Math.random() < .35)) applySt(t, 'wet', 2); // a água molha
  if (t.hp > 0 && t.brk && !o.counter) { const n = (w ? 1 : 0) + (wk ? 1 : 0); if (n) extra += brkHit(t, n, a); }
  extra += hitFx(a, s, t, { d, stat, blk });
  if (!mental && t.st.reflect && t !== a && a.hp > 0) { const rd = Math.max(1, Math.round(d * .3)); extra += ` ${t.name} reflete ${rd}.${hurt(a, rd, t)}`; }
  log(a.name, `${s.name} → ${t.name} (${chance}%) → ${r}: ${crit ? 'CRÍTICO! ' : ''}${d} de dano${mental ? ' mental' : ` (${PL[part]})`}${w ? ' (fraqueza)' : rs ? ' (resistiu)' : ''}${stTxt}.${extra}`, 'ok', { d: r, rr: { l: s.name, t: chance, res: crit ? 'CRÍTICO' : 'Acertou', c: a.id, atk: 1 }, fx: { id: t.id, dmg: d, crit, el: s.el, a: a.id, s: s.name, w, ...(s.limit ? { lim: 1 } : {}), ...(o.cx?.g ? { cg: o.cx.g } : {}), ...(bf ? { bf: 1 } : {}) } });
  if (!o.nochain) addChain(a, w ? 15 : crit ? 10 : 4);
  if (w) a.bt.wkNow = true;
  if (crit) trig(a, 'crit', t);
  if (w) trig(a, 'weak', t);
  if (t.st.counter && t.hp > 0 && !mental && !s.area && !o.counter && !((s.basic || s.req || s.wpn) && AR.DIST(wtype(a))) /* arma de distância não sofre contra-ataque */ && a.hp > 0 && t !== a && t.enemy !== a.enemy && !skipping(t)) { log(t.name, 'contra-ataca!', 'ok'); strike(t, basicOf(t), a, null, 0, { counter: true }); }
  if (rea && rea.rea.t !== 'evade') {
    if (rea.rea.t === 'absorb' && t.hp > 0) { const v = Math.max(1, Math.round(d * rea.rea.v / (100 - rea.rea.v))); t.aura = Math.min(t.auraMax, t.aura + v); log(t.name, `reage com ${rea.name}: absorve o golpe (+${v} Aura).`, 'ok'); }
    else if (rea.rea.t === 'block') log(t.name, `reage com ${rea.name} e segura ${rea.rea.v}% do golpe.`, 'ok');
    else if (rea.rea.t === 'counter' && t.hp > 0 && a.hp > 0) { log(t.name, `reage com ${rea.name}!`, 'ok'); strike(t, { ...basicOf(t), name: rea.name, power: rea.rea.v, el: rea.el, attr: rea.attr }, a, null, 0, { counter: true, nochain: true }); }
  }
  return down && was;
}
// Defesa: janela S.battle.cmd (Aparar e Esquiva numa tecla só, medida no servidor). Golpe anunciado (tel) abre Esquiva para todo alvo;
// golpe físico de alvo único não anunciado abre só Aparar, para quem tem o nó e Aura. Chefes e elites também aparam golpes dos heróis por chance.
const parryable = (a, s, t, o, sure) => s.kind === 'dmg' && !s.area && !o.counter && t && t !== a && t.enemy !== a.enemy && t.hp > 0 && !sure;
const parNode = ch => (ch.skills || []).map(k => S.skills[k]).filter(x => x?.par).sort((x, y) => y.par - x.par)[0];
const canPar = p => { const n = parNode(p); return !!n && !p.parT && !p.st.silence && p.aura >= (n.cost || 0); };
// golpe anunciado: o nó (tel: 1) ou a lista da ficha do inimigo (telK). A lista nasce sozinha na primeira consulta (chefe: 2 mais fortes, elite: 1) e daí o mestre manda
const autoTel = ch => { const n = ch.boss ? 2 : ch.rank === 'elite' ? 1 : 0, pw = k => SK(k).power * (SK(k).hits || 1) * (SK(k).area ? 1.5 : 1);
  return (ch.skills || []).filter(k => SK(k) && ['dmg', 'mental'].includes(SK(k).kind) && !SK(k).limit).sort((x, y) => pw(y) - pw(x)).slice(0, n); };
const telOf = (a, k) => { if (k === 'atk') return false; if (a.enemy && a.telK === undefined) a.telK = autoTel(a); return SK(k)?.tel === 1 || a.telK?.includes(k); };
// Fintas: comum não tem; elite (~30% das batidas) atrasa ou faz anel falso; chefe tem combo irregular, fintas em 50% das batidas e direção no golpe anunciado.
// beats segue number[]; fin é paralelo: { ease?: 1, fake?: ms a partir de C.at, dir?: '←'|'→' }
function finPlan(a, hits, tel, beat) {
  const D = RU.CMD.DEF, boss = !!a.boss, elite = a.rank === 'elite', p = boss ? .5 : elite ? .3 : 0, gaps = [450, 450, 900], beats = [], fin = [];
  for (let i = 0; i < hits; i++) {
    const gap = i ? (boss ? gaps[i % 3] : D.gap) : beat; beats.push(i ? beats[i - 1] + gap : beat); const f = {};
    if (p && Math.random() < p) { if (Math.random() < .5 || gap < 900) f.ease = 1; else f.fake = beats[i] - 700; }
    if (boss && tel) f.dir = Math.random() < .5 ? '←' : '→';
    fin.push(f);
  }
  return { beats, fin };
}
function defWindow(a, plan) { // abre a janela para o plano do inimigo, ou devolve null se ninguém pode se defender
  const s = plan.skill === 'atk' ? basicOf(a) : SK(plan.skill), D = RU.CMD.DEF;
  if (!s || !plan.tgs.length || !['dmg', 'mental'].includes(s.kind) || s.fx?.some(f => f.t === 'sure')) return null;
  const tel = telOf(a, plan.skill), esq = tel || plan.skill === 'atk'; // Esquiva: golpe anunciado ou ataque básico; o resto (Choque, Perfeito, direção) segue só no anunciado
  const ts = plan.tgs.map(id => S.chars[id]).filter(t => t && !t.enemy && t.hp > 0 && !skipping(t) && (esq || (parryable(a, s, t, {}, false) && canPar(t))));
  if (!ts.length) return null;
  const perf = tel && !!a.boss && Math.random() < .2, beat = Math.round(D.beat * (perf ? .8 : 1)), hits = s.hits || 1, { beats, fin } = finPlan(a, hits, tel, beat);
  const z = Object.fromEntries(ts.map(t => { const n = parNode(t), mo = modsOf(t, null); return [t.id, { par: n ? n.par + mo.par : 0, esq: esq ? D.esq + mo.esq : 0, cost: n?.cost || 0, canP: canPar(t) }]; })); // zonas de cada alvo, para a tela desenhar
  const C = { foe: a.id, at: Date.now(), w: beats[beats.length - 1], beats, fin, tel, esq, perf, z, tgs: ts.map(t => t.id), p: Object.fromEntries(ts.map(t => [t.id, []])), paid: {}, done: {} };
  if (tel && !s.area && ts.length === 1 && chqSkill(ts[0])) C.chqOk = [ts[0].id]; // Choque de poderes: só golpe anunciado de alvo único
  return C;
}
const chqSkill = h => (h.chqT || h.enemy || skipping(h)) ? '' : (h.skills || []).find(k => SK(k)?.cmd === 'choque' && !cantUse(h, effSkill(h, k))) || '';
function chqMeta(a, plan, hero, key) { // meta de apertos: força do golpe do inimigo contra a da técnica (spec §4.5)
  const s = plan.skill === 'atk' ? basicOf(a) : SK(plan.skill), pw = (s.power || 1) * (s.hits || 1), mine = SK(key).power || 1;
  const m = Math.max(10, Math.min(40, Math.round(18 * pw / mine))) * (a.boss ? 1.2 : 1) * Math.max(.25, 1 - modsOf(hero, null).chq / 100);
  return Math.max(5, Math.round(m));
}
function chqResolve(a, plan, C) { // o cabo de guerra fechou: quem apertou mais decide o golpe
  const hero = S.chars[C.chq.id], key = C.chq.skill, won = C.chq.n >= C.chq.meta;
  if (!hero || hero.hp <= 0) return runPlan(a, plan);
  if (won) {
    log(hero.name, `CHOQUE! ${hero.name} vence o duelo de poderes e devolve o golpe de ${a.name}!`, 'ok', { fx: { id: hero.id, a: a.id, s: SK(key).name, el: SK(key).el, chq: 1 } });
    strike(hero, effSkill(hero, key), a, null, 0, { mult: 1.3 }); applySt(a, 'exposed', 2); endTurn(a.id, 100);
  } else { log(hero.name, `CHOQUE perdido: o golpe de ${a.name} passa por cima!`, 'bad', { fx: { id: hero.id, chq: 1 } }); C.xmult = 1.3; runPlan(a, plan); }
}
function parryCheck(a, s, t, o, sure) { // chamado a cada golpe; devolve 'ok' (golpe anulado), 'bad' (golpe sai +50%) ou ''
  const C = S.battle.cmd, inWin = C && C.foe === a.id && o.beat != null && C.p?.[t.id] && !o.counter && t !== a && t.enemy !== a.enemy && t.hp > 0 && !sure && ['dmg', 'mental'].includes(s.kind);
  if (inWin) {
    const v = C.p[t.id][o.beat], fx = { id: t.id, miss: 1, a: a.id, s: s.name, el: s.el, par: 1 };
    if (v === 'par') {
      if (!C.done[t.id]) { C.done[t.id] = 1; const g = parNode(t)?.power || 0; t.aura = Math.min(t.auraMax, t.aura + g); addLimit(t, 10); log(t.name, `APARA ${s.name} de ${a.name}!${g ? ` (+${g} Aura)` : ''}${a.brk ? brkHit(a, 1, t) : ''}`, 'ok', { fx }); }
      else log(t.name, `apara mais uma batida de ${s.name}!`, 'ok', { fx });
      applySt(a, 'exposed', 2); return 'ok'; // 2: o atacante gasta 1 no próprio fim de turno
    }
    if (v === 'esq') { log(t.name, `ESQUIVA ${s.name} de ${a.name}!`, 'ok', { fx: { ...fx, par: undefined, esq: 1 } }); return 'ok'; }
    if (v === 'cedo') { applySt(t, 'exposed', 1); if (!(C.esq ?? C.tel)) { log(t.name, `tenta aparar ${s.name} fora do tempo e fica exposto!`, 'bad'); return 'bad'; } log(t.name, `erra o tempo da esquiva e fica exposto!`, 'bad'); }
    return '';
  }
  if (!parryable(a, s, t, o, sure)) return '';
  if (t.enemy && !a.enemy && (t.boss || t.rank === 'elite') && !t.parT && !skipping(t) && Math.random() < (t.boss ? .15 : .1)) {
    t.parT = 1; applySt(a, 'exposed', 2); log(t.name, `apara ${s.name} de ${a.name}! ${a.name} fica exposto.`, 'bad', { fx: { id: t.id, miss: 1, a: a.id, s: s.name, el: s.el, par: 1 } }); return 'ok';
  }
  return '';
}
// clones: combatentes reais na fila; cada um leva uma fração do HP atual do dono e causa metade do dano
const CLONE_N = { tsukuyomi: 'Sombra', fuhaku: 'Imagem Residual', hiruko: 'Broto', aura: 'Clone de Aura' };
function cloneOf(a, s, f) {
  if (!S.battle.active || !(a.id in S.battle.ticks)) return '';
  const mine = () => battlers().filter(o => o.clone === a.id && !o.dead && o.hp > 0); let n = 0;
  for (let i = 0; i < f.n && mine().length < 3; i++) {
    const v = Math.floor(a.hp * f.p / 100); if (v < 1 || a.hp - v < 1) break;
    a.hp -= v; n++;
    const id = rid(), ch = S.chars[id] = { ...newChar(id, a.enemy, a.owner), name: `${CLONE_N[s.el] || 'Clone'} de ${a.name}`, color: a.color, img: a.img, x: a.x, y: a.y, scene: a.scene, clone: a.id, summon: { by: a.id, ttl: 3, k: 'clone' }, xpR: 0, goldR: 0 };
    ch.attrs = { ...a.attrs }; ch.vinc = [...(a.vinc || [])]; ch.arma = a.arma; ch.armor = 0; ch.bt = {};
    ch.skills = (a.skills || []).filter(k => { const x = S.skills[k]; return x && ['dmg', 'mental'].includes(x.kind) && !x.limit && !x.duo && !x.trio && !x.circ && !x.chg && !x.req && !x.fx?.some(g => g.t === 'clone'); }).slice(0, 4);
    derive(ch); ch.bon.hpMax = v - ch.hpMax; derive(ch); ch.hp = v; ch.aura = ch.auraMax; ch.san = ch.sanMax;
    S.battle.ticks[id] = S.battle.ticks[a.id] + Math.round(delay(ch) / 2) + i;
  }
  return n ? ` [${n} clone${n > 1 ? 's' : ''}]` : '';
}
// reação automática do alvo: a melhor que ele puder pagar, uma por rodada (esquiva > bloqueio > absorção > revide)
const REA_ORD = { evade: 0, block: 1, absorb: 2, counter: 3 };
function pickRea(a, s, t, o, sure, pre) {
  if (o.counter || s.area || !t || t === a || t.enemy === a.enemy || t.hp <= 0 || t.rxT || skipping(t) || t.st.silence || !S.battle.active) return null;
  const r = (t.skills || []).map(k => S.skills[k]).filter(x => x?.rea && (pre ? x.rea.t === 'evade' && !sure : x.rea.t !== 'evade' && !(x.rea.t === 'counter' && s.kind === 'mental')) && (t[x.res] ?? 0) >= x.cost && (!x.nf || t.form)).sort((x, y) => REA_ORD[x.rea.t] - REA_ORD[y.rea.t])[0];
  if (!r) return null;
  t[r.res] -= r.cost; t.rxT = 1; return r;
}
// ---------- ação de combate (jogador aprovado, mestre, IA, concentração liberada) ----------
function doAct(a, m, bonus = 0) {
  const s = m.skill === 'atk' ? basicOf(a) : hasSk(a, m.skill) && effSkill(a, m.skill);
  if (!s || (!m.release && cantUse(a, s))) return false;
  let t0 = s.tg === 'self' || s.kind === 'form' ? a : S.chars[m.target];
  if (!t0 || !(t0.id in S.battle.ticks)) return false;
  const cx = !m.release && !a.enemy && s.cmd && m.cmd ? RU.CMD.cmdEffect(s, RU.CMD.clampCmd(s, m.cmd, modsOf(a, s))) : null; // nota do comando de ataque (medida no navegador)
  if (!m.release && !['heal', 'util', 'form'].includes(s.kind) && !s.area && t0.hp <= 0) return false; // não se gasta o turno golpeando quem já caiu
  const prevSk = a.lastSk; a.bt ??= {};
  if (!m.release && s.fx?.some(f => f.t === 'every')) { a.bt.ev ??= {}; const n = a.bt.ev[s.name] = (a.bt.ev[s.name] || 0) + 1, ev = s.fx.find(f => f.t === 'every'); if (n % ev.n === 0) { a.bt.evNow = s.name; log(a.name, `${s.name}: ${n}º uso, golpe pleno!`, 'ok'); } }
  if (!m.release) {
    if (a[s.res] < s.cost && s.fx?.some(f => f.t === 'ovr')) { const miss = s.cost - a[s.res]; a[s.res] = s.cost; a.hp = Math.max(1, a.hp - miss * 2); a.bt.ovrNow = 1; log(a.name, `${s.name}: sacrifica ${miss * 2} HP pela técnica!`, 'bad'); }
    a[s.res] -= s.cost;
    if (s.limit) a.limit = 0;
    if (s.uses) { a.bt ??= {}; a.bt.wu ??= {}; a.bt.wu[m.skill] = (a.bt.wu[m.skill] || 0) + 1; } // golpe com usos por batalha
    for (const [r, v] of Object.entries(s.pay || {})) { if (r === 'san' && cx?.noSan) continue; if (r === 'hp') a.hp = Math.max(1, a.hp - Math.ceil(a.hpMax * v / 100)); else a[r] = Math.max(0, a[r] - v); }
    if (s.useComp) { const k = compOf(a); if (k && --a.inv[k] <= 0) delete a.inv[k]; }
    if (s.dom) { openDomain(a, s); endTurn(a.id, s.ct); return true; }
    if (s.chg) { a.chg = { s: m.skill, t: t0.id, aim: m.aim, n: s.chg }; a.st.charge = 99; log(a.name, `começa a concentrar ${s.name}…`, 'ok'); endTurn(a.id, 100); return true; }
  }
  const stat = statOf(a, s);
  if (s.kind === 'form') {
    if (a.form) endForm(a, false);
    a.form = m.skill; a.st.form = s.form.dur + 1;
    log(a.name, `assume a forma ${s.name}!`, 'ok', { fx: { id: a.id, a: a.id, s: s.name, el: s.el, heal: 0 } });
    const t = hitFx(a, s, a, { stat }); if (t) log(a.name, t.trim(), 'ok');
    onceFx(a, s, stat); a.lastSk = s.name;
    endTurn(a.id, s.ct); return true;
  }
  const inB = battlers(), heal = s.kind === 'heal', util = s.kind === 'util', off = !heal && !util;
  const mates = inB.filter(o => o.hp > 0 && o.enemy === a.enemy && o !== a);
  const ts = off && (a.st.possess || a.san <= 0) && mates.length ? [pick(mates)] // possuído, ou em colapso de Sanidade, ataca os próprios aliados
    : s.area ? inB.filter(o => o.enemy === t0.enemy && (o.hp > 0 || heal)) : [a.st.confuse ? pick(inB.filter(o => o.hp > 0)) : off ? redirect(a, t0) : t0];
  const prs = linksOf(s) ? partners(a, s) || [] : [], plus = prs.reduce((v, pr) => v + Math.floor(at(pr.p, pr.ps.attr) / R.dmgDiv) + (pr.p.enemy ? 0 : 2 * bondLv(a, pr.p)), 0);
  for (const pr of prs) { pr.p[pr.ps.res] -= pr.ps.cost; bump(pr.p.id, delay(pr.p)); }
  if (prs.length) log(a.name, `e ${prs.map(pr => pr.p.name).join(' e ')} executam juntos ${s.name}!`, 'ok');
  let more = false; a.bt ??= {}; a.bt.wkNow = false;
  if (cx?.g) log(a.name, `${s.name}: ${RU.CMD.GRADE_NAME[cx.g] || ''}!`, 'ok');
  const aim = !s.area && off && PARTS.includes(m.aim) ? m.aim : (cx?.crit && !s.area && off && ts.length === 1 && ts[0].weakPart) || null; // a Mira certa pega o ponto fraco do chefe
  if (cx?.brk) for (const t of ts) { const bt = brkHit(t, cx.brk, a); if (bt) log(a.name, bt.trim(), 'ok'); }
  const hitsN = s.hits || 1, total = hitsN + (cx?.extra || 0), withCx = (last) => { // turnos a mais nos efeitos bons e o efeito extra (pf) no último golpe
    let fx = s.fx; if (cx?.turns) fx = (fx || []).map(f => f.t === 'st' && RU.POS.includes(f.k) ? { ...f, n: (f.n || 3) + cx.turns } : f);
    if (last && cx?.pf && s.pf) fx = [...(fx || []), ...s.pf]; return fx === s.fx ? s : { ...s, fx }; };
  for (const t of ts) {
    for (let h = 0; h < total; h++) { if (t.dead || (off && h && t.hp <= 0)) break; more = strike(a, withCx(h === total - 1 && !cx?.fin), t, aim, bonus, { plus, cx, ...(h < hitsN ? { beat: h } : { mult: cx.extraMult }) }) || more; }
    if (cx?.fin && !t.dead && t.hp > 0) more = strike(a, { ...withCx(true), power: cx.fin, hits: 1, name: s.name + ' (final)' }, t, aim, bonus, { plus, cx }) || more; // sequência perfeita: golpe final
    if (s.dupla && off && !t.dead && t.hp > 0) more = strike(a, { ...s, name: s.name + ' (2ª mão)' }, t, aim, bonus, { plus, mult: .5 }) || more; // arma em par: segundo golpe a 50%
  }
  if (cx?.estouro) { applySt(a, 'exposed', 2); log(a.name, `${s.name}: a carga estoura! Fica exposto.`, 'bad'); }
  const CW = S.battle.cmd; // aparou todas as batidas de um golpe de vários golpes: contra-ataque automático (básico da arma ×1,5)
  if (CW && CW.foe === a.id && (s.hits || 1) > 1) for (const t of ts) {
    const nt = CW.p?.[t.id]; if (!nt || t.hp <= 0 || a.hp <= 0 || nt.length !== (s.hits || 1) || !nt.every(v => v === 'par')) continue;
    log(t.name, `CONTRA! Aparou tudo e devolve o golpe em ${a.name}.`, 'ok', { fx: { id: t.id, a: a.id, s: 'Contra-ataque', el: s.el, ctr: 1 } });
    strike(t, { ...basicOf(t), name: 'Contra-ataque' }, a, null, 0, { counter: true, nochain: true, mult: 1.5 + modsOf(t, null).ctr / 100 });
  }
  const ch = s.fx?.find(f => f.t === 'chain');
  if (ch && off && ts.length === 1) inB.filter(o => o.enemy === ts[0].enemy && o !== ts[0] && o.hp > 0).sort(() => Math.random() - .5).slice(0, ch.n).forEach((o, i) => strike(a, s, o, null, bonus, { mult: ch.m ** (i + 1), plus }));
  onceFx(a, s, stat);
  if (a.bt.combo) { delete a.bt.combo; log(a.name, `COMBO! ${s.name} logo depois de ${a.lastSk}.`, 'ok'); }
  if (a.bt.popNow) log(a.name, `DETONA a Marca de Caça com ${s.name}!`, 'ok');
  if (a.bt.rsNow) { log(a.name, `RESSONÂNCIA! ${s.name} vibra junto com o golpe de ${S.chars[S.battle.lastAct.id]?.name || 'um aliado'}.`, 'ok'); if (s.rx) for (const t of ts) if (a.bt.rsNow.has(t.id) && t.hp > 0) { const x = s.rx.map(f => fx1(a, s, t, f, { stat })).join(''); if (x) log(a.name, x.trim(), 'ok'); } }
  const ec = off && prevSk && prevSk !== s.name && s.fx?.find(f => f.t === 'echo'), pk = ec && (a.skills || []).find(k => S.skills[k]?.name === prevSk), ps = pk && effSkill(a, pk);
  if (ps && !['heal', 'util', 'form', 'passive'].includes(ps.kind) && !ps.limit) { const t = ts.find(x => x.hp > 0 && !x.dead); if (t) { log(a.name, `ECO: ${ps.name} se repete (${ec.p}%).`, 'ok'); more = strike(a, { ...ps, name: ps.name + ' (eco)', fx: (ps.fx || []).filter(f => f.t !== 'turn' && f.t !== 'echo') }, t, null, bonus, { plus, mult: ec.p / 100, nochain: true }) || more; } }
  delete a.bt.evNow; delete a.bt.ovrNow; delete a.bt.popNow; delete a.bt.rsNow;
  if (off) S.battle.lastAct = { id: a.id, enemy: a.enemy, el: s.el, t: ts.map(x => x.id) };
  a.lastSk = s.name;
  if (s.summon) summonOf(a, s);
  if (s.back && a.hp > 0) { a.st[s.back] = 3; log(a.name, `paga o preço do poder proibido [${STN[s.back]}]`, 'bad'); }
  if (off && a.st.stealth) delete a.st.stealth;
  if (s.fx?.some(f => f.t === 'turn') && a.hp > 0) more = true;
  const haste = s.fx?.find(f => f.t === 'haste' && f.to === 'self'), wkNow = a.bt.wkNow;
  if (off) a.ten = 0; // a Tensão acumulada vai toda neste golpe
  chainBurst(a);
  const al = S.chars[m.pass];
  if (wkNow && al && al.id !== a.id && al.enemy === a.enemy && al.hp > 0 && al.id in S.battle.ticks && !skipping(al) && a.hp > 0) { // Passar a Vez: depois de uma fraqueza, entrega o turno a um aliado com bônus
    S.battle.ticks[al.id] = S.battle.ticks[a.id] - .5; applySt(al, 'atkUp', 2); log(a.name, `passa a vez para ${al.name}!`, 'ok');
    endTurn(a.id, s.ct); return true;
  }
  if (!more && m.brave && a.hp > 0 && (a.brv || 0) > -2) { a.brv = (a.brv || 0) - 1; more = true; log(a.name, `gasta Coragem (${a.brv}) para agir de novo${a.brv < 0 ? ' — fica devendo tempo' : ''}.`, 'ok'); } // Coragem: ação extra, pagando com pontos ou com tempo
  if (more && a.hp > 0) log(a.name, 'MAIS UM turno!', 'ok'); else endTurn(a.id, Math.round((s.ct || 100) * (haste ? 1 - haste.v / 100 : 1) * (wkNow ? .75 : 1)));
  return true;
}
function summonOf(a, s) { // invocação: aliado temporário que age sozinho, com atributos tirados do invocador
  const d = SUMMONS[s.summon]; if (!d) return;
  for (const o of Object.values(S.chars)) if (o.summon?.by === a.id && o.summon.k === s.summon) { o.dead = true; delete S.battle.ticks[o.id]; }
  const id = rid(), base = at(a, s.attr), ch = S.chars[id] = { ...newChar(id, a.enemy, a.owner), name: s.summon, color: d.c, x: a.x, y: a.y, scene: a.scene, summon: { by: a.id, ttl: d.ttl, k: s.summon }, xpR: 0, goldR: 0 };
  for (const k of ATTRS) ch.attrs[k] = int(base * .6, 10, 95);
  for (const k of d.a) ch.attrs[k] = int(base * .9 + 5, 10, 95);
  ch.skills = d.sk.map(n => Object.keys(S.skills).find(k => S.skills[k].name === n)).filter(Boolean);
  Object.assign(ch, { resist: d.el ? [d.el] : [], arma: d.arma ?? 8, armor: d.armor || 0, bt: {} });
  derive(ch); ch.bon.hpMax = Math.round(a.hpMax * d.hp) - ch.hpMax; derive(ch); ch.hp = ch.hpMax; ch.aura = ch.auraMax; ch.san = ch.sanMax;
  S.battle.ticks[id] = S.battle.ticks[a.id] + Math.round(delay(ch) / 2);
  log(a.name, `invoca ${s.summon}!`, 'ok');
}
// IA opcional por modelo do bestiário (campo `ia`, desligado por padrão): { dom: 1 } abre a Expansão de Domínio uma vez por combate;
// { defend: p } defende com a vida baixa; { focus: p } concentra Tensão com a vida alta; p = chance por turno. Devolve true se gastou o turno.
function iaExtra(a, usable) {
  const ia = a.ia, dk = ia.dom && !a.domUsed && usable.find(k => SK(k)?.dom), D = S.battle.dom;
  if (dk && !(D && D.side === a.enemy) && (D ? D.side !== a.enemy : a.rage || a.hp < a.hpMax * .75) && Math.random() < .6 && doAct(a, { skill: dk, target: a.id })) { a.domUsed = 1; return true; } // contra um Domínio rival abre já, para o Choque
  if (a.icd > 0) { a.icd--; return false; }
  if (ia.defend && a.hp < a.hpMax * .4 && !a.st.defUp && Math.random() < ia.defend) { a.icd = 3; doDefend(a); return true; }
  if (ia.focus && !a.ten && !a.chg && a.hp > a.hpMax * .5 && Math.random() < ia.focus) { a.icd = 3; doFocus(a); return true; }
  return false;
}
// IA: Limite, transformação, reerguer caído, curar, purificar, invocar, buffs, dano; serve para inimigos e invocações
// IA do inimigo em duas fases: aiPlan decide (sem efeito visível) e aiRun age; a janela de defesa abre entre as duas
function aiPlan(a) {
  const all = battlers(), alive = all.filter(o => o.hp > 0), foesAll = alive.filter(o => o.enemy !== a.enemy), mates = alive.filter(o => o.enemy === a.enemy);
  if (!foesAll.length) return null;
  const foes = foesAll.filter(o => !o.st.stealth || a.st.focus).length ? foesAll.filter(o => !o.st.stealth || a.st.focus) : foesAll;
  const K = SK, has = (k, t) => K(k).fx?.some(f => f.t === t), pw = k => K(k).power * (K(k).hits || 1) * (K(k).area ? 1.5 : 1);
  const strong = l => { const o = [...l].sort((x, y) => pw(y) - pw(x)); return Math.random() < .6 ? pick(o.slice(0, 3)) : pick(o); }; // repertório grande: prefere os golpes mais fortes
  const usable = [...a.skills, ...wSk(a)].filter(k => K(k) && K(k).kind !== 'passive' && !((K(k).trio && !(R.iaExtra && a.ia?.trio)) || K(k).dom && !(R.iaExtra && a.ia?.dom)) && !cantUse(a, effSkill(a, k))); // Domínio e trio só com `ia` explícito
  const lim = usable.find(k => K(k).limit); // Limite carregado tem prioridade
  const hurt0 = [...mates].sort((x, y) => x.hp / x.hpMax - y.hp / y.hpMax)[0], fallen = all.filter(o => o.enemy === a.enemy && o.hp <= 0 && !o.dead);
  const heals = usable.filter(k => K(k).kind === 'heal' && K(k).power > 0), buffs = usable.filter(k => (K(k).kind === 'heal' && !K(k).power || K(k).kind === 'util') && !K(k).summon && !K(k).dom && !has(k, 'revive'));
  const hits = usable.filter(k => K(k).kind === 'dmg' && !K(k).limit), mental = usable.filter(k => K(k).kind === 'mental' && !K(k).limit);
  const forms = usable.filter(k => K(k).kind === 'form'), revs = usable.filter(k => has(k, 'revive')), sums = usable.filter(k => K(k).summon), cl = usable.filter(k => has(k, 'cleanse'));
  const sick = mates.find(o => RU.NEG.filter(k => o.st[k]).length >= 2);
  const tgt = Math.random() < R.aiFocus ? [...foes].sort((x, y) => x.hp - y.hp)[0] : pick(foes), mOk = mental.length && tgt && tgt.san > 0;
  if (a.hcd > 0) a.hcd--; // intervalo entre curas, para ninguém se curar sem parar
  const ia = !lim && R.iaExtra && a.ia ? usable : null;
  let skill = 'atk', t = tgt;
  if (lim) skill = lim;
  else if (forms.length && !a.form && (a.rage || Math.random() < .2)) { skill = pick(forms); t = a; }
  else if (revs.length && fallen.length && !a.hcd && Math.random() < .5) { skill = pick(revs); t = fallen[0]; a.hcd = 4; } // reerguer divide o intervalo das curas, senão dois curandeiros se revezam para sempre
  else if (heals.length && !a.hcd && hurt0.hp < hurt0.hpMax * .5 && Math.random() < .6) { skill = pick(heals); t = hurt0; a.hcd = 4; }
  else if (cl.length && sick && Math.random() < .5) { skill = pick(cl); t = sick; }
  else if (sums.length && !alive.some(o => o.summon?.by === a.id) && Math.random() < .25) { skill = pick(sums); t = a; }
  else if (buffs.length && Math.random() < .12) { skill = pick(buffs); t = pick(mates); }
  else if (hits.length && Math.random() < (mOk ? .45 : .7)) skill = strong(hits);
  else if (mOk && Math.random() < .6) skill = pick(mental); // dano mental continua sorteado: escolher sempre o mais forte leva o grupo ao colapso de Sanidade
  const ks = K(skill);
  if (ks && ['heal', 'util'].includes(ks.kind) && t?.enemy !== a.enemy) t = has(skill, 'revive') && fallen.length ? fallen[0] : ks.power ? hurt0 : pick(mates); // cura e suporte (inclusive o Limite) vão para o próprio lado
  if (ks && (ks.tg === 'self' || ks.kind === 'form')) t = a;
  if (!t) { skill = 'atk'; t = tgt; }
  const sk0 = skill === 'atk' ? basicOf(a) : K(skill), self = t === a || sk0?.tg === 'self' || sk0?.kind === 'form';
  const tgs = self || !sk0 || ['heal', 'util'].includes(sk0.kind) ? [] : sk0.area ? foesAll.map(o => o.id) : [t.id];
  return { skill, target: t.id, tgt: tgt.id, tgs, ia };
}
function aiRun(a, plan) {
  if (!plan) return endTurn(a.id);
  const T = S.battle.ticks, dead = id => !S.chars[id] || !(id in T) || (S.chars[id].hp <= 0 && S.chars[id].enemy !== a.enemy);
  if (plan.target !== a.id && dead(plan.target)) { plan = aiPlan(a); if (!plan) return endTurn(a.id); } // o alvo caiu durante a janela: escolhe de novo
  if (plan.ia && iaExtra(a, plan.ia)) return;
  if (!doAct(a, { skill: plan.skill, target: plan.target })) { if (!doAct(a, { skill: 'atk', target: plan.tgt })) endTurn(a.id); }
}
const aiAct = a => aiRun(a, aiPlan(a));
// golpe escolhido à mão pelo mestre: o mesmo formato de plano, para a janela de defesa abrir antes (null se não é golpe em alguém)
function manualPlan(a, m, mod) {
  const skill = m.skill || 'atk', s = skill === 'atk' ? basicOf(a) : SK(skill), t = S.chars[m.target];
  if (!s || !t || !['dmg', 'mental'].includes(s.kind) || s.tg === 'self' || (skill !== 'atk' && (!(a.skills || []).includes(skill) && !wSk(a).includes(skill) || cantUse(a, effSkill(a, skill))))) return null;
  const tgs = s.area ? battlers().filter(o => o.hp > 0 && o.enemy !== a.enemy).map(o => o.id) : [t.id];
  return { skill, target: t.id, tgt: t.id, tgs, ia: null, manual: { m, mod } };
}
const runPlan = (a, plan) => plan?.manual ? doAct(a, plan.manual.m, plan.manual.mod) : aiRun(a, plan);
const newChar = (id, enemy, owner) => ({ id, name: enemy ? 'Inimigo' : 'Herói', owner, enemy, scene: S.scene,
  color: enemy ? '#e60012' : '#00b7ff', img: '', attrs: Object.fromEntries(ATTRS.map(a => [a, enemy ? R.enemyAttr : 40])), marks: {}, hp: 999, aura: 999, san: 999,
  limit: 0, xp: 0, gold: 0, x: 0, y: 0, ...structuredClone(EXTRA), xpR: enemy ? R.enemyXp : 0, goldR: enemy ? 10 : 0, arma: 8, armor: 0, weak: [], resist: [], skills: [], st: {}, inv: {}, equip: {} });
// monta um modelo de inimigo a partir das tabelas de content.js (skills por nome ou por filtro)
const makeFoe = (name, color, attrs, weak, resist, skills, o = {}) => {
  const ids = typeof skills === 'function' ? Object.keys(S.skills).filter(k => skills(S.skills[k])) : skills.map(n => Object.keys(S.skills).find(k => S.skills[k].name === n)).filter(Boolean);
  const ch = { ...newChar('', true, ''), name, color, weak, resist, skills: ids, ...o }; Object.assign(ch.attrs, attrs); return ch;
};
const loadScenes = () => SCENES.forEach(sc => { S.scenes[rid()] = newScene(sc.name, { bg: sc.bg, note: sc.note, gather: sc.gather.map(n => Object.keys(S.items).find(k => S.items[k].name === n)).filter(Boolean), shop: { open: false, stock: sc.stock.map(n => Object.keys(S.items).find(k => S.items[k].name === n)).filter(Boolean) } }); });
const loadBestiary = () => { S.bestiary = Object.fromEntries(buildBestiary(makeFoe).map(ch => { const id = rid(); return [id, { ...ch, id }]; })); };
// o mestre também edita os modelos do bestiário com as mesmas ações de ficha
// passivas aplicam o bônus de forma permanente; sg = -1 desfaz (quando o mestre tira a skill)
const bonus = (ch, k, v) => { if (ATTRS.includes(k)) ch.attrs[k] = int(ch.attrs[k] + v, 1, 100); else if (Object.hasOwn(BASE, k)) { ch.bon[k] += v; ch[k.slice(0, -3)] = Math.max(0, ch[k.slice(0, -3)] + v); } };
const passive = (ch, s, sg) => {
  if (s.kind !== 'passive') return;
  const e = RU.nenEff(ch, s);
  if (s.bon) for (const [k, v] of Object.entries(s.bon)) bonus(ch, k, sg * Math.round(v * e));
  if (!['hpMax', 'auraMax', 'sanMax', 'res', ...ATTRS].includes(s.pas)) return; // voto, gatilho, modificador, amplificação: o motor lê na hora
  if (s.pas === 'res') { if (sg > 0) { if (!ch.resist.includes(s.el)) ch.resist.push(s.el); ch.weak = ch.weak.filter(e => e !== s.el); } else ch.resist = ch.resist.filter(e => e !== s.el); }
  else if (ATTRS.includes(s.pas)) ch.attrs[s.pas] = int(ch.attrs[s.pas] + sg * s.power, 1, 100);
  else { ch.bon[s.pas] += sg * s.power; ch[s.pas.slice(0, -3)] = Math.max(0, ch[s.pas.slice(0, -3)] + sg * s.power); }
};
const getCh = (c, id) => S.chars[id] || (c.role === 'gm' && Object.hasOwn(S.bestiary, id) ? S.bestiary[id] : undefined);
const spot = k => { const sc = scene(), C = Math.ceil(sc.cols), Rw = Math.ceil(sc.rows); return [Math.min(C - 1, Math.floor(C * .7) + k % 3), Math.min(Rw - 1, 1 + Math.floor(k / 3) % Math.max(1, Rw - 1))]; }; // espalha inimigos novos no lado direito
// referência do grupo: quantos heróis estão na cena e o "poder" deles (média dos três maiores atributos de cada um)
const partyRef = () => {
  const pcs = Object.values(S.chars).filter(c => !c.enemy && !c.dead && c.scene === S.scene), top3 = c => ATTRS.map(a => at0(c, a)).sort((x, y) => y - x).slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  return { n: pcs.length || 4, p: pcs.length ? Math.round(pcs.reduce((a, c) => a + top3(c), 0) / pcs.length) : 58 };
};
function genFoe(el, role, rank, ref = partyRef()) {
  const K = R.rank[rank], [m1, m2] = ROLES[role], ch = newChar('', true, ''), up = Math.max(0, ref.p - 58) * (rank === 'chefe' ? R.rank.chefe.g : 1), P = ref.p + up * R.grow.attr, pool = Object.entries(S.skills).filter(([, s]) => s.el === el && s.kind !== 'passive' && !s.req && !s.back && !s.duo && !s.circ && !s.aw && !s.summon && !s.form?.m?.heal && (+String(s.br).split('-')[1] < 6 || ['dmg', 'mental', 'form'].includes(s.kind)) && (!s.limit || rank === 'chefe'));
  const use = {}; pool.forEach(([, s]) => use[s.attr] = (use[s.attr] || 0) + 1);
  const elAttr = Object.keys(use).sort((a, b) => use[b] - use[a])[0]; // atributo que as skills do elemento mais usam
  for (const a of ATTRS) ch.attrs[a] = int(P + K.d - (a === m1 ? 0 : a === m2 ? 6 : a === elAttr ? (role === 'bruto' || role === 'agil' ? 10 : 2) : 18), 15, 95);
  ch.bon.hpMax = Math.round(rank === 'chefe' ? (K.hpPer + up * R.grow.hp * .5) * ref.n * (ref.n / 4) : K.hp + up * R.grow.hp);
  ch.arma = int(8 + (ref.p - 45) / 4 + up * R.grow.arma + ({ lacaio: -2, comum: 0, elite: 2, chefe: R.rank.chefe.arma - 8 })[rank] + (role === 'bruto' ? 2 : 0), 4, 40); ch.armor = Math.round((role === 'bruto' ? (rank === 'lacaio' ? 1 : 3) : rank === 'chefe' ? 2 : 0) + up * R.grow.armor);
  // skills conforme o papel: suporte prefere cura e buffs, ágil prefere as rápidas, os demais as de dano; sempre das mais simples para as mais caras
  const pri = ([, s]) => (role === 'suporte' ? (s.kind === 'heal' ? 0 : 2) : role === 'agil' ? ((s.ct || 100) < 100 ? 0 : 1) : s.kind === 'heal' ? 3 : 0) * 1000 + s.xp + (s.limit ? -500 : 0);
  ch.skills = pool.sort((a, b) => pri(a) - pri(b)).slice(0, K.sk).map(([k]) => k);
  if (role === 'bruto' || role === 'agil') { const basic = Object.keys(S.skills).find(k => S.skills[k].name === (role === 'bruto' ? 'Golpe Pesado' : 'Tiro Certeiro')); if (basic && !ch.skills.includes(basic)) ch.skills[Math.max(0, ch.skills.length - 1)] = basic; }
  Object.assign(ch, { name: el === 'fis' ? ({ bruto: 'Capanga', agil: 'Batedor', conjurador: 'Ocultista', suporte: 'Capelão' })[role] : `${ROLE_N[role]} de ${VN[el]}`, color: ELCOL[el], resist: el === 'fis' ? [] : [el], weak: FOIL[el] ? [FOIL[el]] : [],
    cat: rank === 'chefe' ? 'chefe' : el === 'fis' ? 'humano' : 'demonio', xpR: K.xp, goldR: K.xp * 2, rank, role });
  if (rank === 'chefe') Object.assign(ch, { boss: true, weakPart: pick(PARTS), name: `Senhor ${el === 'fis' ? 'da Guerra' : 'de ' + VN[el]}`, gmNote: 'Chefe gerado para o grupo. Age duas vezes por rodada, resiste a controle, invoca lacaios em fúria.' });
  else if (rank !== 'comum') ch.name += ` (${rank})`;
  if (ch.weakPart) ch.gmNote += ` Ponto fraco: ${PL[ch.weakPart]}.`;
  ch.tpl = ch.name;
  return ch;
}
// chefes do bestiário são reescalados para o grupo: atributos proporcionais e HP por herói
const fitBoss = (ch, ref = partyRef()) => { const up = Math.max(0, ref.p - 58) * R.rank.chefe.g, P = ref.p + up * R.grow.attr + R.rank.chefe.tpl, f = (P + R.rank.chefe.d) / Math.max(...ATTRS.map(a => ch.attrs[a])); for (const a of ATTRS) ch.attrs[a] = int(ch.attrs[a] * f, 15, 95); ch.attrs.FOR = Math.max(ch.attrs.FOR, int(P + R.rank.chefe.d - 6, 15, 95)); const T = ch.tune || {}; // ajuste fino por chefe, medido no simulador
  ch.bon.hpMax = Math.round((R.rank.chefe.hpPer + up * R.grow.hp * .5) * ref.n * (ref.n / 4) * (T.hp || 1)); ch.bon.sanMax = 60;
  ch.arma = int(R.rank.chefe.arma + (ref.p - 45) / 4 + up * R.grow.arma + (T.arma || 0), 4, 40); ch.armor = Math.round(2 + up * R.grow.armor);
  const cap = 20 + up * 2.5; ch.skills = ch.skills.filter(k => S.skills[k] && (S.skills[k].limit || S.skills[k].xp <= cap || R.iaExtra && ch.ia?.dom && S.skills[k].dom && cap >= R.domCap)); }; // o Domínio de chefe (opt-in) só entra para grupos veteranos (domCap) // só as skills do estágio do grupo
function spawn(tpl, tier = 'normal', x = 0, y = 0) { // cria um inimigo a partir de um modelo, no nível de ameaça pedido
  const id = rid(), ch = S.chars[id] = { ...structuredClone(tpl), id, x, y, scene: S.scene, tpl: tpl.tpl || tpl.name, known: S.known?.[tpl.tpl || tpl.name] || 0 }, [k, rw] = TIER[tier] || TIER.normal;
  if (k !== 1) { for (const a of ATTRS) ch.attrs[a] = int(ch.attrs[a] * k, 1, 100); ch.xpR = Math.round(ch.xpR * rw); ch.goldR = Math.round(ch.goldR * rw); ch.name += ` (${tier})`; }
  ch.hp = ch.aura = ch.san = 999;
  return ch;
}
const wtype = ch => eq(ch, 'arma')?.wt || 'punho'; // sem arma equipada luta com os punhos

// /r do chat: soma de dados e números, como 2d6+1d4+3 ou d20-1 (até 8 termos e 40 dados)
function rollExpr(expr) {
  const src = String(expr).replace(/\s+/g, '');
  if (!/^[+-]?(\d{0,2}d\d{1,3}|\d{1,4})([+-](\d{0,2}d\d{1,3}|\d{1,4})){0,7}$/i.test(src) || !/d/i.test(src)) return null;
  let total = 0, dice = 0; const parts = [], shown = [];
  for (const [, sg, n, f, k] of src.matchAll(/([+-]?)(?:(\d{0,2})d(\d{1,3})|(\d{1,4}))/gi)) {
    const neg = sg === '-' ? -1 : 1;
    if (f !== undefined) {
      const q = int(n || 1, 1, 20), faces = int(f, 2, 100), rs = Array.from({ length: q }, () => 1 + Math.floor(Math.random() * faces));
      if ((dice += q) > 40) return null;
      total += neg * rs.reduce((a, x) => a + x, 0); parts.push(`${shown.length ? (neg < 0 ? '-' : '+') : neg < 0 ? '-' : ''}${q}d${faces}`); shown.push(`${neg < 0 ? '−' : ''}[${rs.join(', ')}]`);
    } else { total += neg * +k; parts.push(`${neg < 0 ? '-' : shown.length || parts.length ? '+' : ''}${+k}`); }
  }
  return { text: parts.join(''), shown: shown.join(' '), total };
}

export { manualPlan, runPlan, cantUse, effSkill, chqMeta, chqResolve, iaExtra, defWindow, finPlan, telOf, autoTel, canPar, parNode, BASE, SK, addLimit, aiAct, aiPlan, aiRun, allDown, allOut, applySt, at, at0, basicOf, bondAdd, breakCheck, breakVow, can, current, d100, delay, derive, doAct, doDefend, doFocus, endTurn, eq, evolveCh, fitBoss, genFoe, getCh, healBody, hurt, int, loadBestiary, loadScenes, lvl, makeFoe, modsOf, newChar, nextOf, normSlots, ofiSync, okUrl, onMap, order, partyRef, passive, pick, prep, reseat, rid, rollExpr, sanPen, scene, skipping, slotMax, slotted, spawn, spot, strike, summonOf, tally, tickSt, trig, usable, vows, wtype };

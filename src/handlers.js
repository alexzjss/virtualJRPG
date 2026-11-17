import os from 'os';
import { buildSkills, buildItems, ITEMS_V, VEHICLES } from '../content.js';
import { GM } from './config.js';
import { R, ATTRS, EL, STK, VN, STN, PARTS, BBG, CAMP, GMF, sk, it, NEW, SCH, TIER, ROLES, NUM } from './consts.js';
import { S, newScene, log } from './state.js';
import { hash, okName } from './auth.js';
import { pick, d100, rid, int, okUrl, can, scene, eq, at0, lvl, at, healBody, BASE, evolveCh, sanPen, delay, current, onMap, applySt, addLimit, hurt, endTurn, strike, newChar, loadScenes, loadBestiary, passive, getCh, spot, partyRef, genFoe, fitBoss, spawn, wtype, rollExpr } from './rules.js';
import { tell, kick, start } from './net.js';

const undoStack = [], NOUNDO = new Set(['undo', 'chat', 'fog', 'move', 'roll', 'userAdd', 'userPass', 'userDel', 'reqNo', 'autoSet']);
const H = {
  addChar(c, m) {
    if (c.role !== 'gm') return; // personagens novos só pelo mestre; ele escolhe o dono
    const enemy = !!m.enemy, id = rid();
    S.chars[id] = newChar(id, enemy, enemy ? '' : String(m.owner || '').trim().slice(0, 30));
  },
  undo(c) { // desfaz a última ação do mestre (até 20)
    if (c.role !== 'gm' || !undoStack.length) return;
    const prev = JSON.parse(undoStack.pop()), keep = { log: S.log, users: S.users, seq: S.seq };
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, prev, keep);
    log('Mestre', 'desfez a última ação.');
  },
  delChar(c, m) { if (c.role === 'gm') { delete S.chars[m.id]; delete S.battle.ticks[m.id]; } },
  set(c, m) {
    const ch = getCh(c, m.id), f = String(m.f);
    if (!can(c, ch)) return;
    const g = c.role === 'gm';
    if (f.startsWith('attrs.')) { if (g && ATTRS.includes(f.slice(6))) ch.attrs[f.slice(6)] = int(m.v, 1, 100); } // o mestre define os atributos
    else if (f.startsWith('bon.')) { if (g && Object.hasOwn(BASE, f.slice(4))) ch.bon[f.slice(4)] = int(m.v, -999, 999); }
    else if ((GMF.has(f) || NUM[f] || f === 'limit') && !g) return; // recursos e posição só pelo mestre (o jogador move o token com 'move')
    else if (f === 'limit') ch.limit = int(m.v, 0, 100);
    else if (NUM[f]) { ch[f] = int(m.v); if (f === 'hp' && ch.hp > 0) { delete ch.dead; delete ch.dying; } }
    else if (f === 'name') ch.name = String(m.v).slice(0, 30) || '?';
    else if (f === 'color' && /^#[0-9a-f]{6}$/i.test(m.v)) ch.color = m.v;
    else if (f === 'img') ch.img = okUrl(m.v) ? m.v : '';
    else if (f === 'xp' && c.role === 'gm') ch.xp = int(m.v);
    else if (f === 'owner' && c.role === 'gm') ch.owner = String(m.v).trim().slice(0, 30);
    else if (f === 'bio') ch.bio = String(m.v).slice(0, 3000);
    else if (f === 'gmNote' && c.role === 'gm') ch.gmNote = String(m.v).slice(0, 3000);

  },
  move(c, m) { const ch = S.chars[m.id]; if (can(c, ch)) { ch.x = int(m.x, 0, Math.ceil(scene().cols) - 1); ch.y = int(m.y, 0, Math.ceil(scene().rows) - 1); } },
  place(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch) { ch.x = ch.y = onMap(ch) ? null : 0; ch.scene = S.scene; } },
  roll(c, m) {
    const ch = S.chars[m.id];
    if (!can(c, ch) || !ATTRS.includes(m.attr)) return;
    const target = int(at(ch, m.attr) + int(m.mod, -100, 100) - sanPen(ch), 1, 95), r = d100();
    const res = r <= Math.max(1, Math.floor(target / 10)) ? 'CRÍTICO' : r <= target ? 'Sucesso' : r >= 96 ? 'DESASTRE' : 'Falha';
    if (r <= target) ch.marks[m.attr] = true; // atributo usado com sucesso pode evoluir
    log(ch.name, `${m.attr} ${target}% → ${r}: ${res}`, r <= target ? 'ok' : 'bad', { d: r, rr: { l: m.attr, t: target, res, c: ch.id }, ...((c.role === 'gm' || c.appr) && m.secret ? { to: GM } : {}) });
  },
  evolve(c, m) {
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch) return;
    const up = evolveCh(ch);
    log(ch.name, up.length ? `evoluiu ${up.join(', ')} (+1)` : 'não evoluiu desta vez', 'ok');
  },
  horror(c, m) {
    const ch = S.chars[m.id];
    if (c.role !== 'gm' || !ch) return;
    const target = int(at(ch, 'SAB') - sanPen(ch), 1, 95), r = d100(), loss = int(m.loss, 1, 99);
    if (r > target) ch.san = Math.max(0, ch.san - loss);
    log(ch.name, `Teste de horror SAB ${target}% → ${r}: ${r > target ? `perdeu ${loss} de Sanidade` : 'resistiu'}`, r > target ? 'bad' : 'ok', { d: r, rr: { l: 'Horror · SAB', t: target, res: r > target ? 'Falha' : 'Sucesso', c: ch.id } });
  },
  vinc(c, m) { // mestre concede ou remove um Vínculo; ao ganhar, o personagem já aprende a skill raiz dele
    const ch = getCh(c, m.id);
    if (c.role !== 'gm' || !ch || !EL.includes(m.el) || m.el === 'fis') return;
    if (ch.vinc.includes(m.el)) { ch.vinc = ch.vinc.filter(e => e !== m.el); return; }
    ch.vinc.push(m.el);
    const root = Object.keys(S.skills).find(k => S.skills[k].el === m.el && S.skills[k].root);
    if (root && !ch.skills.includes(root)) ch.skills.push(root);
    log(ch.name, `firmou Vínculo com ${VN[m.el]}.`, 'ok');
  },
  // contas: só o mestre cria, troca a senha e apaga; o jogador pode trocar a própria senha
  userAdd(c, m) {
    if (c.role !== 'gm') return;
    const name = String(m.name || '').trim().slice(0, 30), err = msg => c.send(JSON.stringify({ t: 'err', msg }));
    if (!okName(name)) return err('Login inválido: sem espaços nem @, e não pode ser "mestre".');
    if (Object.hasOwn(S.users, name)) return err('Já existe uma conta com esse login.');
    if (String(m.pass || '').length < 4) return err('A senha precisa de pelo menos 4 caracteres.');
    S.users[name] = hash(m.pass);
    const ch = S.chars[m.char]; if (ch && !ch.enemy) ch.owner = name;
    log('Mestre', `criou a conta ${name}${ch && !ch.enemy ? ' para ' + ch.name : ''}.`, '', { to: GM });
  },
  userPass(c, m) {
    const name = c.role === 'gm' ? String(m.name || '') : c.role === 'player' ? c.name : '';
    if (!name || !Object.hasOwn(S.users, name)) return;
    if (String(m.pass || '').length < 4) return c.send(JSON.stringify({ t: 'err', msg: 'A senha precisa de pelo menos 4 caracteres.' }));
    S.users[name] = hash(m.pass);
    if (c.role === 'gm') kick(name, 'O mestre trocou a sua senha. Entre com a nova.');
    else { c.send(JSON.stringify({ t: 'passOk', pass: String(m.pass) })); kick(name, 'Sua senha foi trocada em outra janela. Entre com a nova.', c); }
  },
  userDel(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(S.users, m.name)) return;
    delete S.users[m.name];
    for (const ch of Object.values(S.chars)) if (ch.owner === m.name) ch.owner = '';
    kick(m.name, 'Sua conta foi removida pelo mestre.');
  },
  aff(c, m) { // cicla normal → fraqueza → resistência
    const ch = getCh(c, m.id);
    if (c.role !== 'gm' || !ch || !EL.includes(m.el)) return;
    if (ch.weak.includes(m.el)) { ch.weak = ch.weak.filter(e => e !== m.el); ch.resist.push(m.el); }
    else if (ch.resist.includes(m.el)) ch.resist = ch.resist.filter(e => e !== m.el);
    else ch.weak.push(m.el);
  },
  part(c, m) { const ch = getCh(c, m.id); if (c.role === 'gm' && ch && PARTS.includes(m.k)) ch.body[m.k] = lvl(ch, m.k) ? 0 : Math.ceil(ch.hpMax * .3); }, // mestre cura ou fere uma parte
  st(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch && STK.includes(m.k)) { if (ch.st[m.k]) delete ch.st[m.k]; else applySt(ch, m.k); } },
  // ----- cenas -----
  map(c, m) {
    const sc = scene();
    if (c.role !== 'gm') return;
    const fl = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round((+v || 0) * 1000) / 1000));
    if (m.f === 'cols') sc.cols = fl(m.v, 4, 80); // casas na largura do recorte; as linhas saem da proporção
    if (m.f === 'ar') sc.ar = fl(m.v, .2, 6);
    if (m.f === 'ox' || m.f === 'oy') sc[m.f] = fl(m.v, 0, .95);
    if (m.f === 'crop' && m.v && typeof m.v === 'object') { const x = fl(m.v.x, 0, .98), y = fl(m.v.y, 0, .98); sc.crop = { x, y, w: fl(m.v.w, .02, 1 - x), h: fl(m.v.h, .02, 1 - y) }; }
    if (m.f === 'cam') sc.cam = m.v && typeof m.v === 'object' ? { z: fl(m.v.z, .4, 4), fx: fl(m.v.fx, -5, 5), fy: fl(m.v.fy, -5, 5), n: ++S.seq } : null;
    sc.rows = Math.max(1, Math.round(sc.cols / sc.ar * 1000) / 1000);
    if (m.f === 'bg') sc.bg = okUrl(m.v) ? m.v : '';
    if (m.f === 'bbg') sc.bbg = BBG.includes(m.v) || okUrl(m.v) ? m.v : ''; // fundo da batalha: tema pronto, imagem própria ou '' (usa o mapa)
    if (m.f === 'name') sc.name = String(m.v).slice(0, 30) || '?';
    if (m.f === 'fogOn') sc.fogOn = !!m.v;
    if (m.f === 'note') sc.note = String(m.v).slice(0, 3000);
  },
  fog(c, m) { // pincel 3x3
    if (c.role !== 'gm') return;
    const sc = scene();
    for (let x = int(m.x) - 1; x <= int(m.x) + 1; x++) for (let y = int(m.y) - 1; y <= int(m.y) + 1; y++)
      if (x >= 0 && y >= 0 && x < Math.ceil(sc.cols) && y < Math.ceil(sc.rows)) { if (m.hide) delete sc.seen[x + ',' + y]; else sc.seen[x + ',' + y] = 1; }
  },
  sceneAdd(c) { if (c.role === 'gm') { const id = rid(); S.scenes[id] = newScene('Cena ' + (Object.keys(S.scenes).length + 1)); H.sceneGo(c, { id }); } },
  sceneGo(c, m) { if (c.role === 'gm' && Object.hasOwn(S.scenes, m.id)) { S.scene = m.id; Object.values(S.chars).filter(ch => !ch.enemy).forEach(ch => ch.scene = m.id); } }, // heróis acompanham a cena; inimigos ficam na deles
  sceneDel(c) { if (c.role === 'gm' && Object.keys(S.scenes).length > 1) { delete S.scenes[S.scene]; H.sceneGo(c, { id: Object.keys(S.scenes)[0] }); } },
  // ----- batalha -----
  battle(c, m) {
    if (c.role !== 'gm') return;
    const all = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(Boolean), dead = all.filter(o => o.enemy && o.hp <= 0), pcs = all.filter(o => !o.enemy);
    all.forEach(o => { o.st = {}; delete o.dying; });
    if (!m.on && m.win && pcs.length && dead.length) { // recompensas divididas entre os heróis
      const sum = f => Math.floor(dead.reduce((a, o) => a + o[f], 0) / pcs.length), xp = sum('xpR'), gold = sum('goldR'), drops = [];
      pcs.forEach(p => { p.xp += xp; p.gold += gold; });
      dead.forEach(d => {
        for (const [k, q] of Object.entries(d.inv)) if (S.items[k]) { const p = pick(pcs); p.inv[k] = (p.inv[k] || 0) + q; drops.push(`${S.items[k].name} → ${p.name}`); }
        d.inv = {}; d.equip = {}; d.x = d.y = null;
      });
      for (const d of dead) { // materiais: 60% de chance de essência do elemento do inimigo (ou garra)
        const el = d.resist.find(e => e !== 'fis') || '', k = Object.keys(S.items).find(i => S.items[i].type === 'mat' && S.items[i].el === el);
        if (k && Math.random() < .6) { const p = pick(pcs); p.inv[k] = (p.inv[k] || 0) + 1; drops.push(`${S.items[k].name} → ${p.name}`); }
      }
      const best = pcs.map(p => [p, S.battle.stats?.[p.id]]).filter(([, st]) => st?.dmg > 0).sort((x, y) => y[1].dmg - x[1].dmg)[0]; // quem mais causou dano
      const mvp = best ? ` Destaque: ${best[0].name} (${best[1].dmg} de dano${best[1].crit ? `, ${best[1].crit} crítico${best[1].crit > 1 ? 's' : ''}` : ''}).` : '';
      log('Mestre', `Vitória! +${xp} XP e +${gold} de ouro para cada herói.${drops.length ? ' Espólios: ' + drops.join(', ') + '.' : ''}${mvp}`, 'ok');
      for (const ct of Object.values(S.contracts)) if (!ct.done && dead.some(d => (d.tpl || d.name) === ct.target)) { // contratos de caça cumpridos
        ct.done = true; pcs.forEach(p => { p.gold += Math.floor(ct.gold / pcs.length); p.xp += ct.xp; });
        log('Mestre', `Contrato cumprido: ${ct.target}! +${Math.floor(ct.gold / pcs.length)} de ouro e +${ct.xp} XP para cada herói.`, 'ok');
      }
    }
    S.battle = { active: !!m.on, ticks: {}, n: 0, stats: {} };
    if (m.on) Object.values(S.chars).filter(ch => onMap(ch) && ch.hp > 0 && !ch.dead).forEach(ch => S.battle.ticks[ch.id] = delay(ch));
    log('Mestre', m.on ? 'Batalha iniciada!' : 'Batalha encerrada.');
  },
  ai(c) { // IA simples: 70% usa uma skill disponível; cura o aliado mais ferido, ataca um oponente aleatório
    const a = S.chars[current()];
    if (c.role !== 'gm' || !S.battle.active || !a?.enemy) return;
    const alive = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o?.hp > 0), foes = alive.filter(o => o.enemy !== a.enemy);
    const usable = a.st.silence || a.st.fury ? [] : a.skills.filter(k => { const s = S.skills[k]; return s && s.kind !== 'passive' && (!s.req || s.req === wtype(a)) && a[s.res] >= s.cost && (!s.limit || a.limit >= 100); });
    const lim = usable.find(k => S.skills[k].limit); // Limite carregado tem prioridade
    const mates = alive.filter(o => o.enemy === a.enemy), hurt = mates.sort((x, y) => x.hp / x.hpMax - y.hp / y.hpMax)[0], K = k => S.skills[k];
    // só cura quem está abaixo de metade; buffs puros são raros; dano mental não serve contra quem já está sem Sanidade
    const heals = usable.filter(k => K(k).kind === 'heal' && K(k).power > 0), buffs = usable.filter(k => K(k).kind === 'heal' && !K(k).power), hits = usable.filter(k => K(k).kind === 'dmg' && !K(k).limit), mental = usable.filter(k => K(k).kind === 'mental' && !K(k).limit);
    const tgt = Math.random() < R.aiFocus ? foes.sort((x, y) => x.hp - y.hp)[0] : pick(foes), mOk = mental.length && tgt && tgt.san > 0;
    if (a.hcd > 0) a.hcd--; // intervalo entre curas, para ninguém se curar sem parar
    const skill = lim || (heals.length && !a.hcd && hurt.hp < hurt.hpMax * .5 && Math.random() < .6 ? pick(heals) : buffs.length && Math.random() < .12 ? pick(buffs)
      : hits.length && Math.random() < (mOk ? .45 : .7) ? pick(hits) : mOk && Math.random() < .6 ? pick(mental) : 'atk'), heal = S.skills[skill]?.kind === 'heal';
    const t = heal ? (K(skill).power ? hurt : pick(mates)) : tgt;
    if (heal && K(skill).power) a.hcd = 4;
    if (t) H.act(c, { id: a.id, skill, target: t.id }); else endTurn(a.id);
  },
  ini(c, m) { // mestre ajusta a fila: adiantar, atrasar, tirar ou incluir na batalha
    const ch = S.chars[m.id], T = S.battle.ticks;
    if (c.role !== 'gm' || !S.battle.active || !ch) return;
    if (m.k === 'in') { if (!(ch.id in T) && ch.hp > 0) T[ch.id] = Math.max(0, ...Object.values(T)) + 1; }
    else if (!(ch.id in T)) return;
    else if (m.k === 'out') delete T[ch.id];
    else if (m.k === 'set') T[ch.id] = int(m.v, 0, 999999);
    else T[ch.id] = Math.max(0, T[ch.id] + (m.k === 'up' ? -1 : 1) * Math.ceil(delay(ch) / 2));
  },
  next(c) { const id = current(); if (S.battle.active && id && can(c, S.chars[id])) endTurn(id, 50); }, // passar custa metade do tempo
  act(c, m) {
    const a = S.chars[current()], t0 = S.chars[m.target];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || !t0 || !(t0.id in S.battle.ticks)) return;
    const basic = m.skill === 'atk';
    const wp = eq(a, 'arma');
    const s = basic ? { name: 'Ataque', kind: 'dmg', attr: wp?.wt === 'fogo' ? 'DES' : 'FOR', el: wp?.el || 'fis', power: wp?.power ?? a.arma, pierce: wp?.pierce || 0, cost: 0, res: 'aura' } : m.skill === 'wpn' ? wp?.grant : a.skills.includes(m.skill) && S.skills[m.skill];
    if (!s || s.kind === 'passive' || (s.req && s.req !== wtype(a)) || (s.reqFor && at0(a, 'FOR') < s.reqFor) || a[s.res] < s.cost || (s.limit && a.limit < 100) || (!basic && (a.st.silence || a.st.fury))) return;
    if (s.kind !== 'heal' && !s.area && t0.hp <= 0) return; // não se gasta o turno golpeando quem já caiu
    a[s.res] -= s.cost;
    if (s.limit) a.limit = 0;
    const inB = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && !o.dead), heal = s.kind === 'heal';
    const mates = inB.filter(o => o.hp > 0 && o.enemy === a.enemy && o !== a);
    const ts = !heal && (a.st.possess || a.san <= 0) && mates.length ? [pick(mates)] // possuído, ou em colapso de Sanidade, ataca os próprios aliados
      : s.area ? inB.filter(o => o.enemy === t0.enemy && (o.hp > 0 || heal)) : [a.st.confuse ? pick(inB.filter(o => o.hp > 0)) : t0];
    let more = false;
    const aim = !s.area && !heal && PARTS.includes(m.aim) ? m.aim : null;
    const bonus = c.role === 'gm' || c.appr ? int(m.mod, -100, 100) : 0; // bônus ou penalidade dado pelo mestre ao aprovar
    for (const t of ts) if (!t.dead) more = strike(a, s, t, aim, bonus) || more;
    if (s.back && a.hp > 0) { a.st[s.back] = 3; log(a.name, `paga o preço do poder proibido [${STN[s.back]}]`, 'bad'); }
    if (more && a.hp > 0) log(a.name, 'acertou a fraqueza — MAIS UM turno!', 'ok'); else endTurn(a.id, s.ct);
  },
  learn(c, m) {
    const ch = S.chars[m.id], s = S.skills[m.skill];
    if (!can(c, ch) || !s || ch.skills.includes(m.skill) || ch.xp < s.xp) return;
    if (s.el !== 'fis' && !ch.vinc.includes(s.el)) return; // só o tronco marcial e os próprios Vínculos
    if (s.ex && ch.skills.some(k => S.skills[k]?.ex === s.ex)) return; // escolha excludente já feita
    if (s.rq && Object.entries(s.rq).some(([a, v]) => at0(ch, a) < v)) return; // requisito de atributo
    if (ch.skills.length && !ch.skills.some(k => S.skills[k] && Math.max(Math.abs(S.skills[k].gx - s.gx), Math.abs(S.skills[k].gy - s.gy)) <= 1)) return;
    ch.xp -= s.xp; ch.skills.push(m.skill);
    passive(ch, s, 1);
    log(ch.name, `aprendeu ${s.name}`, 'ok');
  },
  // ----- itens -----
  give(c, m) { const ch = getCh(c, m.id); if (c.role === 'gm' && ch && Object.hasOwn(S.items, m.item)) ch.inv[m.item] = (ch.inv[m.item] || 0) + 1; },
  drop(c, m) {
    const ch = getCh(c, m.id);
    if (!can(c, ch) || !(ch.inv[m.item] > 0)) return;
    if (--ch.inv[m.item] <= 0) { delete ch.inv[m.item]; for (const k in ch.equip) if (ch.equip[k] === m.item) delete ch.equip[k]; }
  },
  equip(c, m) {
    const ch = getCh(c, m.id), i = S.items[m.item];
    if (!can(c, ch) || !i || i.type === 'cons' || !(ch.inv[m.item] > 0)) return;
    if (ch.equip[i.type] !== m.item && i.reqFor && at0(ch, 'FOR') < i.reqFor) return; // exige FOR mínima para equipar
    if (ch.equip[i.type] === m.item) delete ch.equip[i.type]; else ch.equip[i.type] = m.item;
  },
  use(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || i?.type !== 'cons' || !(ch.inv[m.item] > 0)) return;
    const inB = S.battle.active && ch.id in S.battle.ticks;
    if (inB && current() !== ch.id) return;
    const t = inB && S.chars[m.target] && m.target in S.battle.ticks ? S.chars[m.target] : ch;
    if (t.dead || (i.eff === 'bomb' && (!inB || t === ch)) || (i.eff === 'rev' && t.hp > 0) || (t.hp <= 0 && !['rev', 'hp'].includes(i.eff))) return;
    let txt = `+${i.power} ${i.eff.toUpperCase()}`, fx;
    if (i.eff === 'bomb') { // bomba: dano fixo do elemento, sem rolagem
      const d = Math.max(1, Math.round(i.power * (t.weak.includes(i.el) ? 1.5 : 1) * (t.resist.includes(i.el) ? .5 : 1)));
      txt = `${d} de dano${hurt(t, d)}`; fx = { fx: { id: t.id, dmg: d, el: i.el } };
    } else if (i.eff === 'cure') { for (const k of Object.keys(t.st)) if (!k.endsWith('Up')) delete t.st[k]; txt = 'condições removidas'; }
    else if (i.eff === 'body') { healBody(t, i.power); txt = 'ferimentos tratados'; }
    else if (i.eff === 'rev') { t.hp = Math.min(t.hpMax, i.power); delete t.dying; txt = 'de volta à luta'; }
    else { const v = Math.round(i.power * (i.eff === 'hp' && t.st.curse ? .5 : 1)); if (i.eff === 'hp') { delete t.dying; healBody(t, v); } t[i.eff] = Math.min(t[i.eff + 'Max'], t[i.eff] + v); }
    H.drop(c, m);
    log(ch.name, `usou ${i.name}${t === ch ? '' : ' em ' + t.name} (${txt})`, 'ok', fx);
    if (inB) endTurn(ch.id);
  },
  // ----- descanso e acampamento -----
  camp(c, m) { if (c.role === 'gm') S.camp = { open: !!m.on, acts: {} }; },
  campAct(c, m) { const ch = S.chars[m.id]; if (S.camp.open && can(c, ch) && !ch.enemy && CAMP.includes(m.k)) S.camp.acts[m.id] = m.k; },
  rest(c, m) { // Sanidade não volta com descanso: só itens, skills, "conversar" no acampamento ou o mestre
    if (c.role !== 'gm' || S.battle.active) return;
    const pcs = Object.values(S.chars).filter(o => !o.enemy && !o.dead), long = !!m.long, notes = [];
    for (const p of pcs) {
      p.aura = p.auraMax; p.hp = long ? p.hpMax : Math.min(p.hpMax, p.hp + Math.ceil(p.hpMax / 2)); delete p.dying;
      for (const k of PARTS) p.body[k] = long ? 0 : Math.floor((p.body[k] || 0) / 2);
      if (long) { p.st = {}; const up = evolveCh(p); if (up.length) notes.push(`${p.name} evoluiu ${up.join(', ')}`); }
    }
    if (long && S.camp.open) {
      for (const [id, k] of Object.entries(S.camp.acts)) {
        const p = S.chars[id];
        if (!p) continue;
        if (k === 'vigiar') p.st.agiUp = 3; else if (k === 'cozinhar') pcs.forEach(o => o.st.atkUp = 3); else if (k === 'conversar') p.san = Math.min(p.sanMax, p.san + 5);
        else if (k === 'treinar') p.xp += 5; else addLimit(p, 30);
        notes.push(`${p.name}: ${k}`);
      }
      S.camp = { open: false, acts: {} };
    }
    log('Mestre', `${long ? 'Descanso longo: HP e Aura restaurados, condições removidas.' : 'Descanso curto: metade do HP e toda a Aura.'} ${notes.join(' · ')}`, 'ok');
  },
  // ----- perseguição: fugitivo x perseguidor, cada condutor rola DES + manobra do veículo -----
  chase(c, m) {
    if (c.role !== 'gm') return;
    if (m.k === 'start') { if (S.chars[m.a] && S.chars[m.b] && VEHICLES[m.va] && VEHICLES[m.vb]) { S.chase = { gap: 5, round: 0, a: { id: m.a, veh: m.va }, b: { id: m.b, veh: m.vb } }; log('Mestre', `Perseguição! ${S.chars[m.a].name} (${VEHICLES[m.va][0]}) foge de ${S.chars[m.b].name} (${VEHICLES[m.vb][0]}).`); } return; }
    if (!S.chase) return;
    if (m.k === 'end') { S.chase = null; return log('Mestre', 'Perseguição encerrada.'); }
    const move = side => {
      const ch = S.chars[side.id], [vn, vel, man] = VEHICLES[side.veh];
      if (!ch) return 0;
      const target = int(at(ch, 'DES') + man - sanPen(ch), 1, 95), r = d100(), mv = r <= target ? vel : r >= 96 ? 0 : Math.floor(vel / 2);
      if (r <= target) ch.marks.DES = true;
      log(ch.name, `conduz ${vn}: DES ${target}% → ${r}: ${r <= target ? `avança ${mv}` : r >= 96 ? 'ACIDENTE! Fica parado' : `derrapa, avança ${mv}`}${r >= 96 ? hurt(ch, 10) : ''}`, r <= target ? 'ok' : 'bad', { d: r });
      return mv;
    };
    S.chase.round++; S.chase.gap = Math.max(0, Math.min(10, S.chase.gap + move(S.chase.a) - move(S.chase.b)));
    if (S.chase.gap >= 10 || S.chase.gap <= 0) { log('Mestre', S.chase.gap ? 'O fugitivo escapou!' : 'O perseguidor alcançou o alvo!', 'ok'); S.chase = null; }
  },
  // ----- loja -----
  shop(c, m) {
    if (c.role !== 'gm') return;
    const sh = scene().shop; // cada cena tem a sua loja
    if (m.f === 'open') sh.open = !!m.v;
    else if (Object.hasOwn(S.items, m.item)) sh.stock = sh.stock.includes(m.item) ? sh.stock.filter(k => k !== m.item) : [...sh.stock, m.item];
  },
  buy(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || !scene().shop.open || !i || !scene().shop.stock.includes(m.item) || ch.gold < i.price) return;
    ch.gold -= i.price; ch.inv[m.item] = (ch.inv[m.item] || 0) + 1;
    log(ch.name, `comprou ${i.name} por ${i.price}`, 'ok');
  },
  sell(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || !scene().shop.open || !i || !(ch.inv[m.item] > 0)) return;
    ch.gold += Math.floor(i.price / 2); H.drop(c, m);
    log(ch.name, `vendeu ${i.name} por ${Math.floor(i.price / 2)}`, 'ok');
  },
  forge(c, m) { // forja com essências do elemento: arma = 3, relíquia = 5, mais metade do preço em ouro
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || S.battle.active || !i?.el || !['arma', 'acess'].includes(i.type)) return;
    const ess = Object.keys(S.items).find(k => S.items[k].type === 'mat' && S.items[k].el === i.el), need = i.type === 'arma' ? 3 : 5, cost = Math.round(i.price / 2);
    if (!ess || !(ch.inv[ess] >= need) || ch.gold < cost) return;
    ch.gold -= cost; if ((ch.inv[ess] -= need) <= 0) delete ch.inv[ess];
    ch.inv[m.item] = (ch.inv[m.item] || 0) + 1;
    log(ch.name, `forjou ${i.name}`, 'ok');
  },
  ctAdd(c, m) { const b = S.bestiary[m.id]; if (c.role === 'gm' && b) S.contracts[rid()] = { target: b.tpl || b.name, gold: int(m.gold, 0, 99999), xp: int(m.xp, 0, 999), done: false }; },
  ctDel(c, m) { if (c.role === 'gm') delete S.contracts[m.id]; },
  // ----- bestiário -----
  bSave(c, m) { const ch = S.chars[m.id]; if (c.role === 'gm' && ch) S.bestiary[rid()] = structuredClone({ ...ch, st: {}, marks: {}, body: {}, rage: false, tpl: ch.name, cat: ch.cat || (ch.boss ? 'chefe' : 'demonio') }); },
  bSpawn(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(S.bestiary, m.id)) return;
    const base = Object.values(S.chars).filter(ch => ch.enemy && ch.scene === S.scene && ch.x != null).length, ref = partyRef();
    for (let i = 0; i < int(m.n || 1, 1, 12); i++) { const ch = spawn(S.bestiary[m.id], m.tier, ...spot(base + i)); if (ch.boss && m.fit !== false) fitBoss(ch, ref); }
  },
  foeGen(c, m) { // cria (ou salva no bestiário) um inimigo gerado para o grupo atual
    if (c.role !== 'gm' || !EL.includes(m.el) || !Object.hasOwn(ROLES, m.role) || !Object.hasOwn(R.rank, m.rank)) return;
    const ref = partyRef(), base = Object.values(S.chars).filter(ch => ch.enemy && ch.scene === S.scene && ch.x != null).length;
    if (m.save) { const id = rid(); S.bestiary[id] = { ...genFoe(m.el, m.role, m.rank, ref), id }; return; }
    for (let i = 0; i < int(m.n || 1, 1, 12); i++) spawn(genFoe(m.el, m.role, m.rank, ref), 'normal', ...spot(base + i));
  },
  foeEnc(c, m) { // encontro automático: gasta um orçamento proporcional ao grupo e à dificuldade
    if (c.role !== 'gm' || !Object.hasOwn(R.diff, m.diff)) return;
    const ref = partyRef(), el = () => EL.includes(m.el) ? m.el : pick(EL.filter(e => e !== 'fis')), main = el(), made = [];
    let budget = ref.n * R.diff[m.diff] * (4 / ref.n) ** .3; // grupos pequenos aguentam proporcionalmente mais
    while (budget >= .5 && made.length < 9) {
      const rank = budget >= 3 && !made.some(f => f.rank === 'elite') ? 'elite' : budget >= 1 && (made.length < ref.n + 1 || budget < 1.5) ? 'comum' : 'lacaio';
      made.push(genFoe(Math.random() < .75 ? main : el(), pick(Object.keys(ROLES)), rank, ref)); budget -= R.rank[rank].cost;
    }
    const base = Object.values(S.chars).filter(ch => ch.enemy && ch.scene === S.scene && ch.x != null).length;
    made.forEach((f, i) => spawn(f, 'normal', ...spot(base + i)));
    log('Mestre', `Encontro ${({ facil: 'fácil', normal: 'normal', dificil: 'difícil', mortal: 'mortal' })[m.diff]} gerado: ${made.length} inimigos para ${ref.n} heróis (poder ${ref.p}).`, '', { to: GM });
  },
  encSave(c, m) { // encontro: grupo de modelos com nível e quantidade
    if (c.role !== 'gm' || !Array.isArray(m.list)) return;
    const list = m.list.slice(0, 12).filter(e => e && Object.hasOwn(S.bestiary, e.b)).map(e => ({ b: e.b, tier: Object.hasOwn(TIER, e.tier) ? e.tier : 'normal', n: int(e.n || 1, 1, 12) }));
    if (list.length) S.encounters[rid()] = { name: String(m.name || 'Encontro').slice(0, 40), list };
  },
  encDel(c, m) { if (c.role === 'gm') delete S.encounters[m.id]; },
  encSpawn(c, m) { const e = S.encounters[m.id]; if (c.role === 'gm' && e) { for (const x of e.list) H.bSpawn(c, { id: x.b, tier: x.tier, n: x.n }); log('Mestre', `Encontro: ${e.name}.`); } },
  skTog(c, m) { // o mestre dá ou tira qualquer skill, sem custo; passivas aplicam ou desfazem o bônus
    const ch = getCh(c, m.id), s = S.skills[m.skill];
    if (c.role !== 'gm' || !ch || !s) return;
    const has = ch.skills.includes(m.skill);
    ch.skills = has ? ch.skills.filter(k => k !== m.skill) : [...ch.skills, m.skill];
    if (!ch.enemy) passive(ch, s, has ? -1 : 1);
  },
  // ----- pedidos: o jogador pede, o mestre aprova (com bônus, penalidade ou em segredo) ou nega -----
  reqOk(c, m) {
    const r = S.reqs[m.id];
    if (c.role !== 'gm' || !r) return;
    delete S.reqs[m.id];
    const mod = int(m.mod, -100, 100), n = S.seq;
    H[r.t]({ role: 'player', name: r.by, appr: true, send() {} }, { ...r.m, mod: int(r.m.mod, -100, 100) + mod, secret: !!m.secret && r.cat === 'roll' });
    tell(r.by, S.seq === n && r.cat !== 'item' && r.cat !== 'camp' ? { kind: 'no', text: `${r.text}: não foi possível agora.` } : { kind: 'ok', text: `Aprovado: ${r.text}${mod ? ` (${mod > 0 ? '+' : ''}${mod})` : ''}` });
  },
  reqNo(c, m) {
    const r = S.reqs[m.id];
    if (!r || !(c.role === 'gm' || (c.role === 'player' && r.by === c.name))) return;
    delete S.reqs[m.id];
    if (c.role === 'gm') tell(r.by, { kind: 'no', text: `Negado: ${r.text}`, why: String(m.why || '').slice(0, 120) });
  },
  autoSet(c, m) { if (c.role === 'gm' && Object.hasOwn(S.auto, m.k)) S.auto[m.k] = !!m.v; },
  // ----- atalhos do mestre: mexer em um ou vários personagens de uma vez -----
  bulk(c, m) {
    if (c.role !== 'gm' || !Array.isArray(m.ids)) return;
    const v = int(m.v, 0, 9999), done = [];
    for (const ch of m.ids.slice(0, 40).map(id => S.chars[id]).filter(Boolean)) {
      if (m.k === 'dmg') { if (ch.dead || v < 1) continue; hurt(ch, v); }
      else if (m.k === 'heal') { if (ch.dead) continue; ch.hp = Math.min(ch.hpMax, ch.hp + v); delete ch.dying; healBody(ch, v); }
      else if (m.k === 'aura' || m.k === 'san') ch[m.k] = Math.min(ch[m.k + 'Max'], ch[m.k] + v);
      else if (m.k === 'xp' || m.k === 'gold') ch[m.k] += v;
      else if (m.k === 'full') { ch.hp = ch.hpMax; ch.aura = ch.auraMax; ch.san = ch.sanMax; ch.body = {}; ch.st = {}; delete ch.dying; delete ch.dead; }
      else if (m.k === 'st' && STK.includes(m.st)) { if (ch.st[m.st]) delete ch.st[m.st]; else applySt(ch, m.st); }
      else if (m.k === 'item' && Object.hasOwn(S.items, m.item)) ch.inv[m.item] = (ch.inv[m.item] || 0) + 1;
      else continue;
      done.push(ch.name);
    }
    const T = { dmg: `${v} de dano`, heal: `cura de ${v} HP`, aura: `+${v} Aura`, san: `+${v} Sanidade`, xp: `+${v} XP`, gold: `+${v} ouro`, full: 'tudo restaurado', st: STN[m.st], item: S.items[m.item]?.name };
    if (done.length) log('Mestre', `${T[m.k]} → ${done.join(', ')}`, m.k === 'dmg' ? 'bad' : 'ok');
  },
  content(c, m) { // restaura o conteúdo padrão de uma coleção (skills aprendidas e itens dos personagens são limpos se a coleção mudar)
    if (c.role !== 'gm') return;
    if (m.coll === 'skills') { S.skills = buildSkills(sk); Object.values(S.chars).forEach(ch => ch.skills = []); }
    else if (m.coll === 'items') { S.items = buildItems(it); S.itemsV = ITEMS_V; Object.values(S.chars).forEach(ch => { ch.inv = {}; ch.equip = {}; }); Object.values(S.scenes).forEach(sc => sc.shop.stock = []); }
    else if (m.coll === 'bestiary') loadBestiary();
    else if (m.coll === 'scenes') loadScenes();
    else return;
    log('Mestre', `restaurou o conteúdo padrão (${m.coll}).`);
  },
  bDel(c, m) { if (c.role === 'gm') delete S.bestiary[m.id]; },
  // ----- chat: texto livre, /r 2d6+1d4+3, /w nome mensagem -----
  chat(c, m) {
    if (c.role === 'table') return;
    const who = c.role === 'gm' ? 'Mestre' : c.name, me = c.role === 'gm' ? GM : c.name, text = String(m.text || '').trim().slice(0, 300), priv = c.role === 'gm' && m.secret ? { to: GM } : {};
    let mm;
    if (!text) return;
    const dice = (mm = text.match(/^\/r(?:oll)?\s+(.+)$/i)) && rollExpr(mm[1]);
    if (dice) log(who, `rolou ${dice.text}: ${dice.shown} = ${dice.total}`, 'ok', priv);
    else if (mm) c.send?.(JSON.stringify({ t: 'note', kind: 'no', text: 'Rolagem não entendida.', why: 'Exemplos: /r 2d6+1 · /r d20 · /r 2d6+1d4+3' }));
    else if ((mm = text.match(/^\/w\s+(\S+)\s+(.+)/i))) log(who, `(sussurro → ${mm[1]}) ${mm[2]}`, 'chat', { to: /^mestre$/i.test(mm[1]) ? GM : mm[1], from: me });
    else log(who, text, 'chat');
  },
  // ----- editores do mestre (skills / itens) -----
  edAdd(c, m) { if (c.role === 'gm' && Object.hasOwn(NEW, m.coll)) S[m.coll][rid()] = NEW[m.coll](); },
  edDel(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(NEW, m.coll)) return;
    delete S[m.coll][m.id];
    for (const ch of Object.values(S.chars)) {
      if (m.coll === 'skills') ch.skills = ch.skills.filter(k => k !== m.id);
      else { delete ch.inv[m.id]; for (const k in ch.equip) if (ch.equip[k] === m.id) delete ch.equip[k]; }
    }
  },
  edSet(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(SCH, m.coll) || !Object.hasOwn(SCH[m.coll], m.f) || !Object.hasOwn(S[m.coll], m.id)) return;
    const o = S[m.coll][m.id], r = SCH[m.coll][m.f], v = m.v;
    o[m.f] = r === 't' ? String(v).slice(0, 160) : r === 's' ? String(v).slice(0, 40) || '?' : r === 'n' ? int(v, 0, 999) : r === 'g' ? int(v, 0, 16) : r === 'b' ? !!v : r.includes(v) ? v : o[m.f];
  },
};

export { undoStack, NOUNDO, H };

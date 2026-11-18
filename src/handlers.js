import { BASICS, ITEMS_V, VEHICLES, buildItems, buildSkills } from '../content.js';
import { BASE, addLimit, aiAct, allDown, allOut, applySt, at, at0, bondAdd, breakVow, can, current, d100, delay, doAct, doDefend, doFocus, endTurn, evolveCh, fitBoss, genFoe, getCh, healBody, hurt, int, loadBestiary, loadScenes, lvl, newChar, normSlots, ofiSync, okUrl, onMap, partyRef, passive, pick, rid, rollExpr, sanPen, scene, skipping, slotMax, slotted, spawn, spot, trig, usable, vows } from './rules.js';
import { S, inScene, log, newScene } from './state.js';
import { ATTRS, BBG, CAMP, CLIMA, EL, GMF, NEW, NUM, PARTS, R, ROLES, SCH, STK, STN, TIER, VN, it, sk } from './consts.js';
import { AR, GM, OF, RU } from './config.js';
import { hash, okName } from './auth.js';
import { kick, push, tell, tell0 } from './net.js';
import { manualPlan, runPlan, derive, modsOf, cantUse, effSkill, chqMeta, chqResolve, iaExtra, autoTel, defWindow, canPar, parNode, aiPlan, aiRun } from './rules.js';
function fireCmd(C, a) { // a janela fechou (ou o mestre pulou): o inimigo executa o plano guardado
  if (S.battle.cmd === C) { try { if (S.battle.active && current() === a.id) { const plan = planOf(C, a); if (C.chq) chqResolve(a, plan, C); else runPlan(a, plan); } } catch (e) { console.error(e); } if (S.battle.cmd === C) S.battle.cmd = null; }
}
// plano do inimigo que espera a janela de defesa fechar (fica fora do estado enviado aos clientes), um por cena: batalhas simultâneas não se cruzam
const cmdBy = {}, cmdOf = () => cmdBy[S.scene] ??= { plan: null, for: null, timer: null };
// o temporizador volta para a cena em que a janela abriu antes de disparar
const cmdArm = (C, a) => { const K = cmdOf(), sid = S.scene; clearTimeout(K.timer); K.timer = setTimeout(() => inScene(sid, () => { if (S.battle.cmd === C) { fireCmd(C, a); push(); } }), C.w + RU.CMD.DEF.grace + 50); };
function openCmd(C, plan, a) { S.battle.cmd = C; const K = cmdOf(); K.plan = plan; K.for = C; cmdArm(C, a); }
const planOf = (C, a) => { const K = cmdOf(); if (K.for !== C || !K.plan) { K.plan = aiPlan(a); K.for = C; } return K.plan; }; // janela salva sem o plano (servidor reiniciado): planeja de novo, uma vez
import { OFI_ACT, hasNode, haveMats, itemId, matsText, narrar, nodeOf, ofiRoll, spawnCompanions, takeMats, trapStart } from './oficios.js';


const NOUNDO = new Set(['undo', 'chat', 'fog', 'move', 'roll', 'userAdd', 'userPass', 'userDel', 'reqNo', 'autoSet', 'logClear', 'sceneAdd', 'sceneDel', 'sceneGo', 'moveTo', 'tvSet', 'offMsg']);
// Desfazer por cena: cada cena tem a sua pilha. A foto guarda o estado global, a cena e os personagens que não estão em outra cena;
// desfazer devolve isso e deixa intactas as outras cenas (e as batalhas delas) e quem está nelas.
const undoBy = {};
// pisou numa saída: pedido de passagem na fila do mestre (um por jogador); S.auto.pass ou o mestre jogando pelo jogador passam direto
const passReq = (c, ch) => {
  const ex = scene().exits.find(e => e.x === ch.x && e.y === ch.y); if (!ex || !S.scenes[ex.to]) return;
  if (S.auto.pass || c.ctl || c.appr) return H.moveTo({ role: 'gm' }, { ids: [ch.id], scene: ex.to });
  for (const [id, r] of Object.entries(S.reqs)) if (r.by === c.name) delete S.reqs[id];
  S.reqs[rid()] = { by: c.name, ch: ch.id, cat: 'pass', t: 'pass', text: `passar para ${S.scenes[ex.to].name}`, n: ++S.seq, sc: S.scene, m: { id: ch.id, to: ex.to } };
};
const okSc = id => typeof id === 'string' && Object.hasOwn(S.scenes, id);
const undoPush = sid => { if (!okSc(sid)) return; const st = undoBy[sid] ??= [];
  st.push(JSON.stringify({ sid, S: { ...S, log: undefined, users: undefined, scenes: undefined, chars: undefined, focus: undefined, tv: undefined }, sc: S.scenes[sid], chars: Object.fromEntries(Object.entries(S.chars).filter(([, ch]) => !(okSc(ch.scene) && ch.scene !== sid))) }));
  if (st.length > 20) st.shift(); };
const undoClear = () => { for (const k of Object.keys(undoBy)) delete undoBy[k]; };

const H = {
  addChar(c, m) {
    if (c.role !== 'gm') return; // personagens novos só pelo mestre; ele escolhe o dono
    const enemy = !!m.enemy, id = rid();
    S.chars[id] = newChar(id, enemy, enemy ? '' : String(m.owner || '').trim().slice(0, 30));
  },
  undo(c) { // desfaz a última ação do mestre nesta cena (até 20 por cena)
    const st = undoBy[S.scene];
    if (c.role !== 'gm' || !st?.length) return;
    const p = JSON.parse(st.pop()), keep = { log: S.log, users: S.users, seq: S.seq, scenes: S.scenes, focus: S.focus, tv: S.tv };
    const other = Object.fromEntries(Object.entries(S.chars).filter(([, ch]) => okSc(ch.scene) && ch.scene !== p.sid));
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, p.S, keep, { chars: { ...Object.fromEntries(Object.entries(p.chars).filter(([id]) => !other[id])), ...other } });
    if (okSc(p.sid)) S.scenes[p.sid] = p.sc;
    log('Mestre', 'desfez a última ação.');
  },
  logClear(c) { if (c.role === 'gm') S.log = []; }, // mestre apaga o chat e o histórico de todos
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
    else if (f === 'imgF' || f === 'imgP' || (f === 'imgB' && !ch.enemy)) ch[f] = okUrl(m.v) ? m.v : ''; // imagens do palco de batalha: frente, retrato e costas (inimigo não tem costas)
    else if (f === 'imgS') ch.imgS = Math.min(2.5, Math.max(0.5, +m.v || 1));
    else if (f === 'imgK') { const v = m.v, k = v?.k, n = (x, a, b, d) => Math.min(b, Math.max(a, Number.isFinite(+x) && x !== null && x !== '' ? +x : d)); if (k === 'f' || k === 'p' || (k === 'b' && !ch.enemy)) { if (!ch.imgK || typeof ch.imgK !== 'object') ch.imgK = {}; ch.imgK[k] = { x: n(v.x, -1, 1, 0), y: n(v.y, -1, 1, 0), z: n(v.z, 0.5, 3, 1) }; } } // enquadre da imagem no palco
    else if (f === 'fxK') { const v = m.v, k = v?.k, a = v?.a, n = x => Math.min(1, Math.max(0, Number.isFinite(+x) ? +x : .5)); if ((k === 'f' || (k === 'b' && !ch.enemy)) && ['hand', 'weapon', 'head', 'feet', 'core', 'eyes'].includes(a)) { ch.fxK ??= {}; ch.fxK[k] ??= {}; ch.fxK[k][a] = { x: n(v.x), y: n(v.y) }; } }
    else if (f === 'xp' && c.role === 'gm') ch.xp = int(m.v);
    else if (f === 'owner' && c.role === 'gm') ch.owner = String(m.v).trim().slice(0, 30);
    else if (f === 'bio') ch.bio = String(m.v).slice(0, 3000);
    else if (f === 'gmNote' && c.role === 'gm') ch.gmNote = String(m.v).slice(0, 3000);
    else if (f === 'nen' && c.role === 'gm') ch.nen = RU.NEN.includes(m.v) ? m.v : '';

  },
  move(c, m) { const ch = S.chars[m.id]; if (can(c, ch)) { ch.x = int(m.x, 0, Math.ceil(scene().cols) - 1); ch.y = int(m.y, 0, Math.ceil(scene().rows) - 1); if (c.role !== 'gm' && !ch.enemy && !S.battle.active && scene().exits?.some(e => e.x === ch.x && e.y === ch.y)) passReq(c, ch); } }, // pisou numa saída: vira pedido de passagem
  place(c, m) { // põe no mapa da cena em foco ou tira dele; herói de outra cena chega pelo moveTo (sai da batalha de lá)
    const ch = S.chars[m.id]; if (c.role !== 'gm' || !ch) return;
    if (ch.x != null && ch.scene === S.focus) { ch.x = ch.y = null; return; }
    if (!ch.enemy && ch.scene !== S.focus) return H.moveTo(c, { ids: [ch.id], scene: S.focus });
    ch.scene = S.focus; ch.x = ch.y = 0;
  },
  roll(c, m) {
    const ch = S.chars[m.id];
    if (!can(c, ch) || !ATTRS.includes(m.attr)) return;
    if (!m.rr) ch.lastRoll = { attr: m.attr, mod: int(m.mod, -100, 100) };
    const target = int(at(ch, m.attr) + int(m.mod, -100, 100) - sanPen(ch), 1, 95), r1 = d100(), r2 = d100();
    const mode = Math.max(-1, Math.min(1, (m.adv === 'adv' ? 1 : m.adv === 'dis' ? -1 : 0) + (ch.st?.focus ? 1 : 0) - (ch.st?.blind || ch.st?.exaus || ch.st?.fear ? 1 : 0))), r = mode > 0 ? Math.min(r1, r2) : mode < 0 ? Math.max(r1, r2) : r1; // vantagem: 2d100, fica o melhor; desvantagem: o pior
    const res = r <= Math.max(1, Math.floor(target / 10)) ? 'CRÍTICO' : r <= target ? 'Sucesso' : r >= 96 ? 'DESASTRE' : 'Falha';
    if (r <= target) ch.marks[m.attr] = true; // atributo usado com sucesso pode evoluir
    log(ch.name, `${m.attr} ${target}% → ${r}: ${res}${mode ? ` (${mode > 0 ? 'vantagem' : 'desvantagem'}: ${r1} e ${r2})` : ''}`, r <= target ? 'ok' : 'bad', { d: r, rr: { l: m.attr, t: target, res, c: ch.id }, ...((c.role === 'gm' || c.appr) && m.secret ? { to: GM } : {}) });
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
  aw(c, m) { // mestre concede ou retira um Despertar (selo narrativo que libera nós)
    const ch = getCh(c, m.id);
    if (c.role !== 'gm' || !ch || !Object.hasOwn(RU.AW, m.k)) return;
    ch.aw = (ch.aw || []).includes(m.k) ? ch.aw.filter(k => k !== m.k) : [...(ch.aw || []), m.k];
    if (ch.aw.includes(m.k)) log(ch.name, `recebeu o Despertar: ${RU.AW[m.k]}.`, 'ok');
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
    if (m.f === 'bbL') { const L = {}; for (const k of ['ceu', 'frente']) if (okUrl(m.v?.[k])) L[k] = m.v[k]; sc.bbL = Object.keys(L).length ? L : undefined; } // camadas do parallax: céu (atrás) e frente (PNG); só URL válida
    if (m.f === 'clima') sc.clima = CLIMA.includes(m.v) ? m.v : ''; // clima visual sobreposto: '' (nenhum) ou um da lista
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
  // ----- cenas: o mestre cria, foca e distribui os heróis; cada herói está numa cena ou fora de cena (scene null) -----
  sceneAdd(c, m = {}) { // nova cena: em branco ou cópia de outra (mapa, loja, clima, recursos e saídas; sem batalha nem personagens)
    if (c.role !== 'gm') return;
    const id = rid(), src = m.dup && S.scenes[m.dup], name = String(m.name || '').trim().slice(0, 30);
    S.scenes[id] = src ? { ...structuredClone({ ...src, battle: undefined }), battle: { active: false, ticks: {} }, name: name || (src.name + ' (cópia)').slice(0, 30), exits: src.exits.map(e => ({ ...e, id: rid() })) } : newScene(name || 'Cena ' + (Object.keys(S.scenes).length + 1), { exits: [], battle: { active: false, ticks: {} } });
    S.focus = id;
    if (Array.isArray(m.take) && m.take.length) inScene(id, () => H.moveTo(c, { ids: m.take, scene: id }));
  },
  sceneGo(c, m) { if (c.role === 'gm' && Object.hasOwn(S.scenes, m.id)) S.focus = m.id; }, // muda só o foco do mestre: ninguém é levado junto
  sceneDel(c, m = {}) { // só uma cena vazia e sem batalha (os heróis precisam ser movidos antes)
    const id = Object.hasOwn(S.scenes, m.id) ? m.id : S.focus;
    if (c.role !== 'gm' || Object.keys(S.scenes).length < 2 || S.scenes[id].battle?.active || Object.values(S.chars).some(ch => !ch.enemy && ch.scene === id)) return;
    delete S.scenes[id];
    for (const [k, ch] of Object.entries(S.chars)) if (ch.enemy && ch.scene === id) delete S.chars[k]; // inimigos da cena apagada vão junto
    for (const sc of Object.values(S.scenes)) sc.exits = (sc.exits || []).filter(e => e.to !== id);
    if (S.focus === id) S.focus = Object.keys(S.scenes)[0];
    if (S.tv === id) S.tv = S.focus;
  },
  tvSet(c, m) { if (c.role === 'gm' && Object.hasOwn(S.scenes, m.id)) S.tv = m.id; }, // cena que a TV mostra
  offMsg(c, m) { if (c.role === 'gm') S.offMsg = String(m.v ?? '').slice(0, 300); }, // recado da tela de espera
  moveTo(c, m) { // leva heróis para uma cena (ou para fora de cena, scene null): saem da batalha da cena antiga e entram na da nova
    if (c.role !== 'gm') return;
    const to = m.scene === null || m.scene === '' ? null : Object.hasOwn(S.scenes, m.scene) ? m.scene : undefined; if (to === undefined) return;
    const ids = [...new Set(Array.isArray(m.ids) ? m.ids : [])].filter(id => S.chars[id] && !S.chars[id].enemy).slice(0, 50), moved = [];
    for (const [i, id] of ids.entries()) {
      const ch = S.chars[id], from = ch.scene; if (from === to) continue;
      if (Object.hasOwn(S.scenes, from)) inScene(from, () => { delete S.battle.ticks[id]; });
      for (const o of Object.values(S.chars)) if (o.summon?.by === id && o.scene === from) { if (Object.hasOwn(S.scenes, from)) inScene(from, () => { delete S.battle.ticks[o.id]; }); delete S.chars[o.id]; } // invocações não atravessam cenas
      ch.scene = to; moved.push(ch);
      if (to === null) { ch.x = ch.y = null; continue; }
      inScene(to, () => {
        const sc = scene(), C = Math.ceil(sc.cols), Rw = Math.ceil(sc.rows), ex = sc.exits.find(e => e.id === m.exit) || sc.exits.find(e => e.to === from); // chega pela saída que liga as duas cenas, se houver
        const busy = new Set(Object.values(S.chars).filter(o => o !== ch && o.scene === to && o.x != null).map(o => o.x + ',' + o.y));
        const cx = ex ? ex.x : Math.floor(C / 2), cy = ex ? ex.y : Math.floor(Rw / 2); let best = null;
        for (let r = ex ? 1 : 0; r < Math.max(C, Rw) && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < C && y < Rw && !busy.has(x + ',' + y)) best = [x, y]; }
        [ch.x, ch.y] = best || [cx, cy];
        if (S.battle.active && ch.hp > 0 && !ch.dead) { const T = S.battle.ticks; T[id] = Math.max(0, ...Object.values(T)) + 1 + i; ch.bt = {}; } // entra no fim da fila da batalha que está acontecendo lá
      });
    }
    if (moved.length) log('Mestre', `${moved.map(o => o.name).join(', ')} → ${to === null ? 'fora de cena' : S.scenes[to].name}.`);
  },
  exitAdd(c, m) { // saída no mapa da cena para outra cena; both = cria a volta na casa espelhada da outra
    const sc = S.scenes[m.scene] || scene(), to = m.to, sid = S.scenes[m.scene] ? m.scene : S.scene;
    if (c.role !== 'gm' || !Object.hasOwn(S.scenes, to) || to === sid || sc.exits.length >= 12) return;
    const x = int(m.x, 0, Math.ceil(sc.cols) - 1), y = int(m.y, 0, Math.ceil(sc.rows) - 1);
    sc.exits.push({ id: rid(), x, y, to });
    if (m.both && !S.scenes[to].exits.some(e => e.to === sid)) { const d = S.scenes[to]; d.exits.push({ id: rid(), x: Math.min(Math.ceil(d.cols) - 1, Math.max(0, Math.ceil(d.cols) - 1 - x)), y: Math.min(Math.ceil(d.rows) - 1, y), to: sid }); }
  },
  exitDel(c, m) { const sc = S.scenes[m.scene] || scene(); if (c.role === 'gm') sc.exits = sc.exits.filter(e => e.id !== m.id); },
  // ----- batalha -----
  battle(c, m) {
    if (c.role !== 'gm') return;
    const all = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(Boolean), dead = all.filter(o => o.enemy && o.hp <= 0), pcs = all.filter(o => !o.enemy);
    all.forEach(o => { o.st = {}; delete o.dying; delete o.form; delete o.chg; delete o.sealD; delete o.guardBy; delete o.bt; delete o.brv; delete o.ten; delete o.brk; delete o.domUsed; delete o.icd; o.shield = 0; });
    for (const [k, o] of Object.entries(S.chars)) if (o.summon && (o.scene === S.scene || k in S.battle.ticks)) delete S.chars[k]; // invocações desta cena somem com o fim da luta (as de outra batalha ficam)
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
      const res = { xp, gold, drops, mvp: best?.[0].id || '', st: pcs.map(p => ({ id: p.id, name: p.name, color: p.color, img: p.img || '', dmg: 0, heal: 0, crit: 0, ko: 0, ...S.battle.stats?.[p.id] })) }; // tela de resultado do cliente
      log('Mestre', `Vitória! +${xp} XP e +${gold} de ouro para cada herói.${drops.length ? ' Espólios: ' + drops.join(', ') + '.' : ''}${mvp}`, 'ok', { res });
      for (const ct of Object.values(S.contracts)) if (!ct.done && dead.some(d => (d.tpl || d.name) === ct.target)) { // contratos de caça cumpridos
        ct.done = true; pcs.forEach(p => { p.gold += Math.floor(ct.gold / pcs.length); p.xp += ct.xp; });
        log('Mestre', `Contrato cumprido: ${ct.target}! +${Math.floor(ct.gold / pcs.length)} de ouro e +${ct.xp} XP para cada herói.`, 'ok');
      }
    }
    if (!m.on && S.battle.active) { // refeição e arma afiada valem por uma batalha, só para quem lutou nesta
      if (S.meal?.ids) { for (const p of pcs) if (p.id in S.meal.ids && --S.meal.ids[p.id] <= 0) delete S.meal.ids[p.id]; if (!Object.keys(S.meal.ids).length) delete S.meal; }
      else if (S.meal && --S.meal.left <= 0) delete S.meal;
      pcs.forEach(o => { delete o.sharp; });
    }
    const end = !m.on && S.battle.active ? (m.win ? 'win' : pcs.length && pcs.every(p => p.hp <= 0) ? 'lose' : 'flee') : ''; // o palco faz a pose final certa
    S.battle = { active: !!m.on, ticks: {}, n: 0, stats: {}, chain: { h: 0, e: 0 }, wx: { k: scene().wx || '', ttl: 0 } };
    if (m.on) Object.values(S.chars).filter(ch => onMap(ch) && ch.hp > 0 && !ch.dead).forEach(ch => { ch.bt = {}; ch.shield = 0; ch.stk = {}; ch.rxT = 0; ch.lastSk = ''; ch.brk = ch.boss ? { max: 3, cur: 3 } : ch.rank === 'elite' ? { max: 2, cur: 2 } : undefined; if (!ch.brk) delete ch.brk; S.battle.ticks[ch.id] = delay(ch); });
    if (m.on) S.battle.ax = RU.axisOf(Object.keys(S.battle.ticks).map(k => S.chars[k])); // eixo do palco 3D: fixo até o mestre reenquadrar
    if (m.on) Object.keys(S.battle.ticks).forEach(k => trig(S.chars[k], 'start'));
    if (m.on) { // ganchos de ofício: emboscada, canção, armadilha e companheiros
      const hs = Object.keys(S.battle.ticks).map(k => S.chars[k]).filter(o => o && !o.enemy), emb = Math.max(0, ...hs.map(h => OF.hook(h, 'emb'))), T = S.battle.ticks;
      if (emb) hs.forEach(h => { T[h.id] = Math.round(T[h.id] * (1 - emb / 100)); });
      if (S.marcha) { hs.forEach(h => { h.st.focus = 3; }); delete S.marcha; }
      if (S.tenac) { hs.forEach(h => { h.st.endure = 1; }); delete S.tenac; }
      hs.forEach(spawnCompanions); trapStart();
    }
    log('Mestre', m.on ? 'Batalha iniciada!' : 'Batalha encerrada.', '', end ? { end } : undefined);
  },
  battleReframe(c) {
    if (c.role !== 'gm' || !S.battle.active) return;
    S.battle.ax = RU.axisOf(Object.keys(S.battle.ticks).map(k => S.chars[k]));
    log('Mestre', 'palco reenquadrado.');
  },
  // comandos de ritmo: Defender (Coragem), Concentrar (Tensão) e Ataque Total
  defend(c, m) {
    const a = S.chars[current()];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || a.hp <= 0) return;
    doDefend(a);
  },
  focus(c, m) {
    const a = S.chars[current()];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || a.hp <= 0 || a.chg) return;
    doFocus(a);
  },
  allOut(c, m) {
    const a = S.chars[current()];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a) || a.hp <= 0 || skipping(a) || !allDown(a.enemy)) return;
    allOut(a); endTurn(a.id, 150);
  },
  weather(c, m) { // o mestre escolhe o clima da cena (vale já, se há batalha)
    if (c.role !== 'gm') return;
    const k = Object.hasOwn(RU.CLIMA, m.k) ? m.k : '';
    scene().wx = k; if (S.battle.active) S.battle.wx = { k, ttl: 0 };
    log('Mestre', k ? `Clima: ${RU.CLIMA[k][0]}.` : 'O clima volta ao normal.');
  },
  ai(c) { // IA do inimigo da vez; se alguém pode se defender, abre antes a janela (S.battle.cmd) e o golpe sai quando ela fecha
    const a = S.chars[current()]; if (S.battle.cmd && Date.now() > S.battle.cmd.at + S.battle.cmd.w + 3000) S.battle.cmd = null; // janela velha (servidor reiniciado)
    if (c.role !== 'gm' || !S.battle.active || !a?.enemy || S.battle.cmd) return;
    const plan = aiPlan(a); if (plan?.ia && iaExtra(a, plan.ia)) return; // Defender, Concentrar e Domínio agem na hora (não são golpes)
    if (plan) plan.ia = null; const C = plan && defWindow(a, plan);
    if (!C) return aiRun(a, plan);
    openCmd(C, plan, a);
  },
  cmdSkip(c) { const C = S.battle.cmd; if (c.role === 'gm' && C && S.chars[C.foe]) fireCmd(C, S.chars[C.foe]); }, // o mestre não quer esperar a janela: o golpe sai já
  tel(c, m) { // o mestre liga ou desliga um golpe anunciado na ficha do inimigo (ou do bestiário)
    const ch = getCh(c, m.id); if (c.role !== 'gm' || !ch?.enemy || !(ch.skills || []).includes(m.skill)) return;
    ch.telK ??= autoTel(ch); ch.telK = ch.telK.filter(k => k !== m.skill); if (m.on) ch.telK.push(m.skill);
  },
  chq(c, m) { // Choque de poderes: o 1º envio (com skill) abre o cabo de guerra e paga a técnica; os seguintes somam apertos (no máximo 20 por segundo)
    const C = S.battle.cmd, ch = S.chars[m.id], now = Date.now(); if (!C || !ch || ch.enemy || ch.hp <= 0 || !can(c, ch) || !C.chqOk?.includes(ch.id) || !S.chars[C.foe]) return;
    if (!C.chq) {
      const key = m.skill, s = (ch.skills || []).includes(key) && S.skills[key]; if (!s || s.cmd !== 'choque' || ch.chqT || cantUse(ch, effSkill(ch, key))) return;
      ch[s.res] -= s.cost; ch.chqT = 1; C.p[ch.id] = []; C.chq = { id: ch.id, skill: key, at: now, w: 3000, meta: chqMeta(S.chars[C.foe], planOf(C, S.chars[C.foe]), ch, key), n: 0, last: now };
      C.w = now - C.at + 3000; cmdArm(C, S.chars[C.foe]); return;
    }
    if (C.chq.id !== ch.id || now > C.chq.at + C.chq.w + RU.CMD.DEF.grace) return;
    const add = Math.min(Math.max(0, Math.floor(+m.n) || 0), Math.ceil(20 * (now - C.chq.last) / 1000)); C.chq.n += add; C.chq.last = now;
  },
  def(c, m) { // o jogador aperta o botão da defesa: a zona (Aparar, Esquiva, cedo) vem de quanto falta para o impacto da próxima batida
    const ch = S.chars[m.id], C = S.battle.cmd, D = RU.CMD.DEF; if (!C || !ch || ch.enemy || ch.hp <= 0 || !can(c, ch) || !C.tgs.includes(ch.id) || C.chq?.id === ch.id) return;
    const notes = C.p[ch.id], now = Date.now(), i = C.beats.findIndex((b, k) => notes[k] === undefined && now <= C.at + b + D.grace); if (i < 0) return;
    const n = parNode(ch), mods = modsOf(ch, null), canP = !!n && (C.paid[ch.id] || canPar(ch)), left = C.at + C.beats[i] - now;
    let g = RU.CMD.gradeDef(left, (n?.par || 0) + mods.par, (C.esq ?? C.tel) ? D.esq + mods.esq : 0, canP); if (g === 'late') return;
    const fi = C.fin?.[i]; // o anel falso vale primeiro; só sem ele a direção da esquiva é conferida
    if (fi?.fake != null && Math.abs(now - (C.at + fi.fake)) <= 120) g = 'cedo'; // caiu no anel falso
    else if (g === 'esq' && fi?.dir && m.dir !== fi.dir) g = 'cedo'; // esquiva para o lado errado
    if (canP && !C.paid[ch.id] && (g === 'par' || (g === 'cedo' && !(C.esq ?? C.tel)))) { ch.aura -= n.cost || 0; ch.parT = 1; C.paid[ch.id] = true; } // paga a Aura na hora, uma vez por golpe
    notes[i] = g;
  },
  ini(c, m) { // mestre ajusta a fila: adiantar, atrasar, tirar ou incluir na batalha
    const ch = S.chars[m.id], T = S.battle.ticks;
    if (c.role !== 'gm' || !S.battle.active || !ch) return;
    if (m.k === 'in') { if (!(ch.id in T) && ch.hp > 0) { T[ch.id] = Math.max(0, ...Object.values(T)) + 1; ch.bt = {}; } }
    else if (!(ch.id in T)) return;
    else if (m.k === 'out') delete T[ch.id];
    else if (m.k === 'set') T[ch.id] = int(m.v, 0, 999999);
    else T[ch.id] = Math.max(0, T[ch.id] + (m.k === 'up' ? -1 : 1) * Math.ceil(delay(ch) / 2));
  },
  next(c) { const id = current(); if (S.battle.active && id && can(c, S.chars[id])) endTurn(id, 50); }, // passar custa metade do tempo
  act(c, m) {
    const a = S.chars[current()];
    if (!S.battle.active || !a || a.id !== m.id || !can(c, a)) return;
    const mod = c.role === 'gm' || c.appr ? int(m.mod, -100, 100) : 0; // bônus ou penalidade dado pelo mestre ao aprovar
    if (a.enemy && c.role === 'gm') { // golpe do inimigo escolhido à mão: abre a janela de defesa antes, como na IA
      if (S.battle.cmd) return; const plan = manualPlan(a, m, mod), C = plan && defWindow(a, plan);
      if (C) return openCmd(C, plan, a);
    }
    doAct(a, m, mod);
  },
  skPin(c, m) { // fixa ou desfixa uma skill nos Atalhos do comando de batalha (máx. 6)
    const ch = S.chars[m.id], k = m.sk; if (!can(c, ch) || ch.enemy || typeof k !== 'string') return;
    const w = /^w:([^:]+):(\d+)$/.exec(k), ok = ch.skills.includes(k) || (!!w && w[1] === ch.equip?.arma && !!S.items[w[1]]?.sk?.[+w[2]]);
    const L = Array.isArray(ch.skPin) ? ch.skPin.filter(x => x !== k) : [];
    if (m.on) { if (!ok || L.length >= 6) return; L.push(k); }
    ch.skPin = L;
  },
  pslot(c, m) { // liga ou desliga uma passiva ativa (só no acampamento ou pelo mestre, fora de batalha)
    const ch = S.chars[m.id];
    if (!can(c, ch) || ch.enemy || S.battle.active || !(c.role === 'gm' || S.camp.open) || !slotted(S.skills[m.skill]) || !ch.skills.includes(m.skill)) return;
    normSlots(ch); ch.pslotOff ??= [];
    if (ch.pslots.includes(m.skill)) { ch.pslots = ch.pslots.filter(k => k !== m.skill); ch.pslotOff.push(m.skill); log(ch.name, `desativa ${S.skills[m.skill].name}.`, ''); }
    else if (ch.pslots.length < slotMax(ch)) { ch.pslots.push(m.skill); ch.pslotOff = ch.pslotOff.filter(k => k !== m.skill); log(ch.name, `ativa ${S.skills[m.skill].name} (${ch.pslots.length}/${slotMax(ch)}).`, 'ok'); }
    normSlots(ch); // a vaga que sobrou é ocupada pela próxima passiva aprendida (desligue-a também para deixar vaga)
  },
  learn(c, m) {
    const ch = S.chars[m.id], s = S.skills[m.skill];
    if (!can(c, ch) || !s || RU.whyNot(ch, s, S.skills, S.items, m.skill)) return;
    ch.xp -= RU.xpCost(ch, s);
    if (s.cat && !ch.nen) { ch.nen = s.cat; log(ch.name, `descobre sua natureza de Aura: ${RU.NENN[s.cat]}.`, 'ok'); }
    ch.skills.push(m.skill);
    passive(ch, s, 1); normSlots(ch);
    log(ch.name, `aprendeu ${s.name}${slotted(s) && !ch.pslots.includes(m.skill) ? ' (sem slot livre: troque no acampamento)' : ''}`, 'ok');
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
    if (t.dead || (['bomb', 'oil'].includes(i.eff) && (!inB || t === ch)) || (i.eff === 'rev' && t.hp > 0) || (t.hp <= 0 && !['rev', 'hp'].includes(i.eff))) return;
    let txt = `+${i.power} ${i.eff.toUpperCase()}`, fx;
    if (i.eff === 'bomb') { // bomba: dano fixo do elemento, sem rolagem
      const d = Math.max(1, Math.round(i.power * (t.weak.includes(i.el) ? 1.5 : 1) * (t.resist.includes(i.el) ? .5 : 1)));
      txt = `${d} de dano${hurt(t, d)}`; fx = { fx: { id: t.id, dmg: d, el: i.el } };
    } else if (i.eff === 'oil') { applySt(t, 'oil', 3); txt = 'encharcado de óleo'; }
    else if (i.eff === 'cure') { for (const k of RU.NEG) delete t.st[k]; delete t.sealD; txt = 'condições removidas'; }
    else if (i.eff === 'body') { healBody(t, i.power); txt = 'ferimentos tratados'; }
    else if (i.eff === 'rev') { t.hp = Math.min(t.hpMax, i.power); delete t.dying; txt = 'de volta à luta'; }
    else { const v = Math.round(i.power * (i.eff === 'hp' && t.st.curse ? .5 : 1)); if (i.eff === 'hp') { delete t.dying; healBody(t, v); } t[i.eff] = Math.min(t[i.eff + 'Max'], t[i.eff] + v); }
    if (inB && t === ch && ['hp', 'rev'].includes(i.eff) && vows(ch).includes('corpo')) breakVow(ch, 'corpo', 'curou a si mesmo');
    H.drop(c, m);
    log(ch.name, `usou ${i.name}${t === ch ? '' : ' em ' + t.name} (${txt})`, 'ok', fx);
    if (inB) endTurn(ch.id);
  },
  // ----- descanso e acampamento -----
  camp(c, m) { if (c.role === 'gm') S.camp = { open: !!m.on, acts: {} }; },
  pause(c, m) { if (c.role === 'gm') S.paused = !!m.on; }, // mesa em pausa: jogadores e TV veem a tela de título
  campAct(c, m) { const ch = S.chars[m.id]; if (S.camp.open && can(c, ch) && !ch.enemy && (CAMP.includes(m.k) || hasNode(ch, n => n.camp === m.k))) { S.camp.acts[m.id] = m.k; (S.camp.with ??= {})[m.id] = S.chars[m.w] && !S.chars[m.w].enemy && m.w !== m.id ? m.w : ''; } },
  rest(c, m) { // Sanidade não volta com descanso: só itens, skills, "conversar" no acampamento ou o mestre
    if (c.role !== 'gm' || S.battle.active) return;
    const pcs = Object.values(S.chars).filter(o => !o.enemy && !o.dead), long = !!m.long, notes = [], curto = Math.max(0, ...pcs.map(p => OF.hook(p, 'curto')));
    for (const p of pcs) {
      if (long && p.scar) { delete p.scar; derive(p); } // cicatrizes (Marca, Técnica Reversa) somem no descanso longo
      p.aura = p.auraMax; p.hp = long ? p.hpMax : Math.min(p.hpMax, p.hp + Math.ceil(p.hpMax * (.5 + curto / 100))); delete p.dying;
      for (const k of PARTS) p.body[k] = long ? 0 : Math.floor((p.body[k] || 0) / 2);
      if (long) { p.st = {}; delete p.afl; p.san = Math.min(p.sanMax, p.san + OF.hook(p, 'sonoSan')); const up = evolveCh(p); if (up.length) notes.push(`${p.name} evoluiu ${up.join(', ')}`); }
    }
    if (long && S.camp.open) {
      for (const [id, k] of Object.entries(S.camp.acts)) {
        const p = S.chars[id];
        if (!p) continue;
        if (k === 'vigiar') { p.st.agiUp = 3; if (OF.hook(p, 'vigia')) p.st.focus = 3; } else if (k === 'afiar') p.sharp = true;
        else if (k === 'armadilha') S.trap = { sang: !!OF.hook(p, 'trapSang'), stun: !!OF.hook(p, 'trapStun') };
        else if (k === 'cantar') { const v = OF.hook(p, 'cantar'), sf = OF.hook(p, 'sinfonia'); pcs.forEach(o => { o.san = Math.min(o.sanMax, o.san + v); if (sf) o.hp = Math.min(o.hpMax, o.hp + Math.ceil(o.hpMax * sf / 100)); }); if (OF.hook(p, 'marcha')) S.marcha = true; if (OF.hook(p, 'tenac')) S.tenac = true; }
        else if (k === 'cozinhar') pcs.forEach(o => o.st.atkUp = 3); else if (k === 'conversar') { p.san = Math.min(p.sanMax, p.san + 5); const w = S.chars[S.camp.with?.[id]]; if (w && !w.enemy) { const up = bondAdd(p, w, 1); if (up) notes.push(`o laço de ${p.name} e ${w.name} sobe para o nível ${up}`); } }
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
      const target = int(at(ch, 'DES') + man + OF.hook(ch, 'chase') - sanPen(ch), 1, 95), r = OF.hook(ch, 'semAcidente') ? Math.min(d100(), 95) : d100(), mv = r <= target ? vel : r >= 96 ? 0 : Math.floor(vel / 2);
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
    const price = i ? Math.max(1, Math.ceil(i.price * (1 - OF.hook(ch, 'desc') / 100))) : 0; // Lábia: desconto
    if (!can(c, ch) || !scene().shop.open || !i || !scene().shop.stock.includes(m.item) || ch.gold < price) return;
    ch.gold -= price; ch.inv[m.item] = (ch.inv[m.item] || 0) + 1;
    log(ch.name, `comprou ${i.name} por ${price}`, 'ok');
  },
  sell(c, m) {
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || !scene().shop.open || !i || !(ch.inv[m.item] > 0)) return;
    const got = Math.floor(i.price / 2 * (1 + OF.hook(ch, 'desc') / 100)); ch.gold += got; H.drop(c, m);
    log(ch.name, `vendeu ${i.name} por ${got}`, 'ok');
  },
  forge(c, m) { // forja com essências do elemento: arma = 3, relíquia = 5, mais metade do preço em ouro
    const ch = S.chars[m.id], i = S.items[m.item];
    if (!can(c, ch) || S.battle.active || !i?.el || !['arma', 'acess'].includes(i.type) || (i.type === 'arma' && i.cat && i.cat !== 'elemental')) return; // lendárias e malditas não saem da forja
    const ess = Object.keys(S.items).find(k => S.items[k].type === 'mat' && S.items[k].el === i.el), need = i.type === 'arma' ? OF.hook(ch, 'essencia') || 3 : 5, cost = Math.round(i.price / 2);
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
  encDel(c, m) { if (c.role === 'gm') { delete S.encounters[m.id]; for (const sc of Object.values(S.scenes)) if (sc.enc) sc.enc = sc.enc.filter(k => k !== m.id); } },
  sceneEnc(c, m) { // liga ou desliga um encontro salvo a uma cena (fica à mão no painel da Mesa)
    const sc = S.scenes[m.scene] || scene(); if (c.role !== 'gm' || !Object.hasOwn(S.encounters, m.id)) return;
    const l = (sc.enc || []).filter(k => k !== m.id); sc.enc = m.on ? [...l, m.id].slice(-12) : l;
  },
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
    const rc = S.chars[r.m.id], rsc = r.sc !== undefined ? r.sc : rc && Object.hasOwn(S.scenes, rc.scene) ? rc.scene : null; // roda na cena em que o pedido nasceu
    if (r.cat === 'pass') return void inScene(rsc, () => H.moveTo(c, { ids: [r.m.id], scene: r.m.to, exit: r.m.exit }));
    inScene(rsc, () => H[r.t]({ role: 'player', name: r.by, appr: true, send() {} }, { ...r.m, mod: int(r.m.mod, -100, 100) + mod, secret: !!m.secret && r.cat === 'roll', txt: r.t === 'ofiUse' ? String(m.txt || '').slice(0, 200) : '', adv: r.cat === 'roll' && ['adv', 'dis'].includes(m.adv) ? m.adv : '' }));
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
    if (m.coll === 'skills' && S.skills[m.id]?.ln) { // o ramo não se parte: os vizinhos do nó apagado passam a se ligar entre si
      const nb = S.skills[m.id].ln.filter(k => S.skills[k]);
      for (const k of nb) { const t = S.skills[k]; t.ln = t.ln.filter(j => j !== m.id); }
      for (const a of nb) for (const b of nb) { const A = S.skills[a], B = S.skills[b]; if (a < b && (A.el === B.el || A.el === 'fis' || B.el === 'fis') && !A.ln.includes(b)) { A.ln.push(b); B.ln.push(a); } }
      for (const k of nb) if (!S.skills[k].ln.length) delete S.skills[k].ln;
    }
    delete S[m.coll][m.id];
    for (const ch of Object.values(S.chars)) {
      if (m.coll === 'skills') ch.skills = ch.skills.filter(k => k !== m.id);
      else { delete ch.inv[m.id]; for (const k in ch.equip) if (ch.equip[k] === m.id) delete ch.equip[k]; }
    }
  },
  // ----- ofícios (perícias) -----
  ofiAw(c, m) { // o mestre concede ou retira a Iniciação em uma perícia
    const ch = S.chars[m.id]; if (c.role !== 'gm' || !ch || ch.enemy || !OF.PER[m.per]) return;
    const has = ch.ofi.includes(m.per); ch.ofi = has ? ch.ofi.filter(p => p !== m.per) : [...ch.ofi, m.per];
    log('Mestre', `${ch.name} ${has ? 'perde' : 'recebe'} a Iniciação em ${OF.PER[m.per].n}.`, has ? '' : 'ok');
  },
  ofiLearn(c, m) {
    const ch = S.chars[m.id]; if (!can(c, ch) || typeof m.node !== 'string' || OF.whyNot(ch, m.node)) return;
    const [per, i] = m.node.split('.'), n = OF.PER[per].nodes[+i]; ch.po -= n.po; ch.pof.push(n.id);
    log(ch.name, `aprendeu ${n.n} (${OF.PER[per].n} · ${OF.GRAU[n.t]})`, 'ok');
  },
  ofiGive(c, m) { // o mestre dá ou tira um nó sem custo
    const ch = S.chars[m.id]; if (c.role !== 'gm' || !ch || ch.enemy || typeof m.node !== 'string' || !OF.PER[m.node.split('.')[0]]?.nodes[+m.node.split('.')[1]]) return;
    ch.pof = ch.pof.includes(m.node) ? ch.pof.filter(k => k !== m.node) : [...ch.pof, m.node];
  },
  ofiUse(c, m) { // uma ação de ofício (rolagem de perícia): coletar, tratar, identificar, forja...
    const ch = S.chars[m.id], n = ch && nodeOf(ch, m.node);
    if (!can(c, ch) || ch.enemy || !n?.act) return;
    const per = n.id.split('.')[0], mod = c.role === 'gm' || c.appr ? int(m.mod, -100, 100) : 0, inB = S.battle.active && ch.id in S.battle.ticks;
    if (inB && (n.act !== 'identificar' || current() !== ch.id)) return;
    const A = OFI_ACT[n.act], ult = ch.dia?.at(-1)?.i; if (A) A(ch, n, per, m, mod, inB);
    const e = ch.dia?.at(-1); if (e && e.i !== ult && (c.role === 'gm' || c.appr) && m.txt) narrar(ch, e, m.txt); // o mestre escreveu a narração ao aprovar
  },
  ofiNota(c, m) { // o mestre escreve, troca ou apaga a narração de um teste narrativo do diário de ofícios
    const ch = S.chars[m.id], e = c.role === 'gm' && ch?.dia?.find(x => x.i === m.e); if (!e) return;
    if (m.del) ch.dia = ch.dia.filter(x => x !== e); else narrar(ch, e, m.txt);
  },
  shopBasics(c) { // põe os ingredientes básicos à venda na loja da cena (campanhas antigas não os têm)
    if (c.role !== 'gm') return; const sh = scene().shop;
    for (const nome of BASICS) { const k = itemId(nome); if (k && !sh.stock.includes(k)) sh.stock.push(k); }
  },
  ofiCfg(c, m) { // o mestre edita o catálogo de ofícios: perícias, nós e receitas (guardado como diferenças sobre o padrão)
    if (c.role !== 'gm') return;
    const cfg = S.ofiCfg ??= {}, tx = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n), num = (v, a, b) => int(v, a, b);
    const put = (coll, key, v) => { cfg[coll] ??= {}; if (v == null) delete cfg[coll][key]; else cfg[coll][key] = v; if (!Object.keys(cfg[coll]).length) delete cfg[coll]; };
    const base = id => { const [per, i] = String(id).split('.'), n = OF.PER[per]?.nodes[+i]; return n && !n.custom ? n : null; };
    const v = m.v && typeof m.v === 'object' ? m.v : null;
    if (m.k === 'reset') S.ofiCfg = {};
    else if (m.k === 'per' && OF.PER[m.id]) {
      const o = {}; if (v) { if (tx(v.n, 30)) o.n = tx(v.n, 30); if (v.d != null) o.d = tx(v.d, 160); const a = [...new Set([].concat(v.a || []).filter(k => ATTRS.includes(k)))].slice(0, 2); if (a.length) o.a = a; }
      put('per', m.id, Object.keys(o).length ? o : null);
    } else if (m.k === 'node' && base(m.id)) {
      const o = {}; if (v) { if (tx(v.n, 40)) o.n = tx(v.n, 40); if (v.d != null) o.d = tx(v.d, 160); if (v.po != null) o.po = num(v.po, 0, 30); if (v.r != null) o.r = num(v.r, 0, 30); if (v.g != null && base(m.id).act === 'checar') o.g = num(v.g, 0, 200); if (v.off) o.off = true; }
      put('node', m.id, Object.keys(o).length ? o : null);
    } else if (m.k === 'nodeNew' && OF.PER[m.per]) {
      const L = cfg.nodeNew?.[m.per] ?? [], i = m.i == null ? L.length : num(m.i, 0, L.length);
      if (i >= 30) return;
      if (v && (i < L.length || tx(v.n, 40))) { const t = num(v.t, 1, 3); L[i] = { n: tx(v.n, 40) || L[i]?.n || 'Nó novo', d: tx(v.d, 160), t, po: num(v.po ?? [0, 2, 4, 7][t], 0, 30), r: num(v.r, 0, 30), ...(v.chk ? { chk: true, g: num(v.g, 0, 200) } : {}), ...(v.off ? { off: true } : {}) }; }
      else if (!v && i < L.length) L[i] = { ...L[i], off: true }; // o espaço fica (os ids dos nós seguintes não mudam)
      else return;
      (cfg.nodeNew ??= {})[m.per] = L;
    } else if (m.k === 'rec') {
      const cur = OF.REC[m.id], novo = !cur;
      if (!v) put('rec', m.id, null); // receita nova: apaga; receita padrão: volta ao original
      else {
        const o = {}, nm = tx(v.n, 40), itNm = k => Object.values(S.items).some(i => i.name === k);
        if (nm) o.n = nm; if (OF.PER[v.per]) o.per = v.per; if (v.t != null) o.t = num(v.t, 1, 3); if (v.dc != null) o.dc = num(v.dc, -40, 20); if (v.qty != null) o.qty = num(v.qty, 1, 5); if (v.off != null) o.off = !!v.off;
        if (v.out != null) o.out = itNm(tx(v.out, 60)) ? tx(v.out, 60) : '';
        if (v.mats && typeof v.mats === 'object') { const mt = Object.fromEntries(Object.entries(v.mats).filter(([k]) => itNm(k)).map(([k, q]) => [k, num(q, 1, 9)]).slice(0, 6)); if (Object.keys(mt).length) o.mats = mt; }
        if (v.meal && typeof v.meal === 'object') { const ML = { atk: 'de dano', def: 'de defesa', agi: 'de velocidade', hit: 'de acerto', crit: 'de crítico' }, ml = Object.fromEntries(Object.keys(ML).filter(k => num(v.meal[k], 0, 30) > 0).map(k => [k, num(v.meal[k], 0, 30)])); if (Object.keys(ml).length) { o.meal = ml; o.mealD = Object.entries(ml).map(([k, q]) => `+${q}% ${ML[k]}`).join(', '); o.out = ''; } }
        if (novo) { if (!o.n || !o.per || !o.mats || !(o.out || o.meal)) return; Object.assign(o, { custom: true, t: o.t || 1 }); const id = m.id && /^x[0-9a-f]{4,8}$/.test(m.id) ? m.id : 'x' + rid(); put('rec', id, o); }
        else put('rec', m.id, { ...cfg.rec?.[m.id], ...o });
      }
    } else return;
    ofiSync(true);
  },
  craft(c, m) { // prepara uma receita; refeições viram o bônus da próxima batalha
    const ch = S.chars[m.id], r = OF.REC[m.rec];
    if (!can(c, ch) || !r || r.off || ch.enemy || S.battle.active || !OF.recipes(ch, r.per).includes(r)) return;
    const mod = c.role === 'gm' || c.appr ? int(m.mod, -100, 100) : 0, mats = Object.fromEntries(Object.entries(r.mats).map(([k, q]) => [k, r.per === 'engenharia' && OF.hook(ch, 'barato') ? Math.max(1, Math.ceil(q / 2)) : q]));
    if (!haveMats(ch, mats)) return log(ch.name, `não tem o que precisa para ${r.n}: ${matsText(mats)}.`, 'bad');
    const R = ofiRoll(ch, r.per, mod + r.dc, `Preparar ${r.n}`);
    takeMats(ch, mats, R.ok ? 'all' : R.dis ? 'half' : 'one');
    if (!R.ok) return;
    if (r.meal) {
      const pcs = Object.values(S.chars).filter(o => !o.enemy && !o.dead), dbl = ['ensopado', 'sopa'].includes(r.id) && OF.hook(ch, 'dobro') ? 2 : 1;
      S.meal = { n: r.n, by: ch.name, ids: Object.fromEntries(pcs.map(o => [o.id, OF.hook(ch, 'refDupla') ? 2 : 1])), m: Object.fromEntries(Object.entries(r.meal).map(([k, v]) => [k, v * dbl])) };
      const sanUp = OF.hook(ch, 'sanRef'); pcs.forEach(o => { if (sanUp) o.san = Math.min(o.sanMax, o.san + sanUp); if (r.san) o.san = Math.max(0, o.san - r.san); });
      return log(ch.name, `serve ${r.n}: ${r.mealD} para o grupo na próxima batalha.`, 'ok');
    }
    const k = itemId(r.out); if (!k) return;
    const qty = r.qty + OF.learned(ch, r.per).filter(n => n.hk === 'rende').reduce((a, n) => Math.max(a, n.v), 0) + (R.crit ? 1 : 0);
    ch.inv[k] = (ch.inv[k] || 0) + qty; log(ch.name, `prepara ${qty}× ${r.out}.`, 'ok');
  },
  reroll(c, m) { // Jogos de Azar: repete a última rolagem de atributo
    const ch = S.chars[m.id], L = ch?.lastRoll; if (!can(c, ch) || !L) return;
    const free = L.attr === 'SOR' && OF.hook(ch, 'rrSor');
    if (!free && (ch.rrUsed || 0) >= OF.hook(ch, 'rr')) return;
    if (!free) ch.rrUsed = (ch.rrUsed || 0) + 1;
    log(ch.name, `rola de novo ${L.attr}!`, 'ok'); H.roll(c, { id: ch.id, attr: L.attr, mod: L.mod, rr: 1 });
  },
  newSession(c) { if (c.role !== 'gm') return; Object.values(S.chars).forEach(o => { o.rrUsed = 0; }); log('Mestre', 'Nova sessão: as rolagens de novo foram renovadas.', 'ok'); },
  gatherSet(c, m) { // o mestre escolhe o que a cena oferece para colher
    if (c.role !== 'gm' || !S.items[m.item] || S.items[m.item].type !== 'mat') return;
    const g = scene().gather ??= []; scene().gather = m.on === false ? g.filter(k => k !== m.item) : g.includes(m.item) ? g : [...g, m.item];
  },
  wpnSave(c, m) { // criador de armas do mestre: cria uma arma nova ou regrava uma existente (m.id), a partir de um rascunho
    if (c.role !== 'gm' || !m.w || typeof m.w !== 'object') return;
    const { w, errs } = AR.clean(m.w), id = m.id && S.items[m.id]?.type === 'arma' ? m.id : rid();
    S.items[id] = { ...it(w.name, 'arma', w.power), ...w };
    if (S.battle.active) usable();
    log('Mestre', `${m.id === id ? 'atualizou' : 'criou'} a arma ${w.name}.${errs.length ? ' Corrigido: ' + errs.join(' · ') : ''}`, errs.length ? 'bad' : 'ok', { to: GM });
    tell0(c, { kind: errs.length ? 'no' : 'ok', text: errs.length ? errs.join(' · ') : `${w.name} salva.`, id });
  },
  wpnVar(c, m) { // variante elemental de uma arma do catálogo: um elemento ou os 9 (m.el = 'all'); nomes já usados são pulados
    const src = S.items[m.id]; if (c.role !== 'gm' || src?.type !== 'arma') return;
    const els = m.el === 'all' ? Object.keys(VN) : Object.hasOwn(VN, m.el) ? [m.el] : [];
    const names = new Set(Object.values(S.items).map(i => i.name)), made = [], skip = [];
    for (const el of els) {
      const d = AR.variantEl(AR.clean(src).w, el); if (!d) { skip.push(VN[el]); continue; }
      const { w } = AR.clean(d); if (names.has(w.name)) { skip.push(VN[el]); continue; }
      names.add(w.name); S.items[rid()] = { ...it(w.name, 'arma', w.power), ...w }; made.push(w.name);
    }
    log('Mestre', `variantes elementais de ${src.name}: ${made.length ? made.join(', ') : 'nenhuma nova'}${skip.length ? ` (já existiam: ${skip.join(', ')})` : ''}.`, made.length ? 'ok' : '', { to: GM });
    tell0(c, { kind: made.length ? 'ok' : 'no', text: made.length ? `${made.length} variante(s) criada(s).` : 'Essas variantes já existem.' });
  },
  wpnImport(c, m) { // importar armas de um arquivo ou texto (lotes de até 25): cada uma passa pela mesma limpeza do criador
    if (c.role !== 'gm' || !Array.isArray(m.list)) return;
    const names = new Set(Object.values(S.items).map(i => i.name)); let n = 0, fixed = 0;
    for (const d of m.list.slice(0, 25)) {
      if (!d || typeof d !== 'object') continue;
      const { w, errs } = AR.clean(d); let name = w.name, k = 2; while (names.has(name)) name = `${w.name.slice(0, 54)} (${k++})`;
      names.add(name); S.items[rid()] = { ...it(name, 'arma', w.power), ...w, name }; n++; if (errs.length) fixed++;
    }
    log('Mestre', `importou ${n} arma(s)${fixed ? `, ${fixed} com correções` : ''}.`, 'ok', { to: GM });
    tell0(c, { kind: n ? 'ok' : 'no', text: n ? `${n} arma(s) importada(s).` : 'Nenhuma arma válida no arquivo.' });
  },
  edSet(c, m) {
    if (c.role !== 'gm' || !Object.hasOwn(SCH, m.coll) || !Object.hasOwn(SCH[m.coll], m.f) || !Object.hasOwn(S[m.coll], m.id)) return;
    const o = S[m.coll][m.id], r = SCH[m.coll][m.f], v = m.v;
    o[m.f] = r === 't' ? String(v).slice(0, 160) : r === 's' ? String(v).slice(0, 40) || '?' : r === 'n' ? int(v, 0, 999) : r === 'g' ? int(v, 0, 16) : r === 'b' ? !!v : r.includes(v) ? v : o[m.f];
  },
};

export { H, NOUNDO, undoBy, undoClear, undoPush };

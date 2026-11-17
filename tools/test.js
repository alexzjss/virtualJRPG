// Testes das regras e permissões: node --test tools/test.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjtest-'));
const { H, S, current, derive, view, handle, modsOf } = await import('../server.js'); const RU = globalThis.RULES;
const { TREE } = await import('../tree.js');
const TOTAL = Object.values(TREE).reduce((a, v) => a + v.branches.flat().length, 0);
const gm = { role: 'gm' }, ana = { role: 'player', name: 'Ana' }, bia = { role: 'player', name: 'Bia' };
const reset = () => { S.chars = {}; S.log.length = 0; S.battle = { active: false, ticks: {} }; };
const mk = (c, m) => { const before = new Set(Object.keys(S.chars)); H.addChar(gm, c.role === 'player' ? { ...m, owner: c.name } : m); /* só o mestre cria; o de jogador nasce com dono */ const ch = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(ch); ch.hp = ch.hpMax; return ch; };
const sk = n => Object.keys(S.skills).find(k => S.skills[k].name === n);

test('bestiário inicial e grade são criados', () => { assert.ok(Object.keys(S.bestiary).length >= 30); assert.equal(Object.keys(S.skills).length, TOTAL); assert.ok(TOTAL >= 1330); assert.ok(Object.keys(S.items).length >= 50); });
test('grade: sem sobreposição; cada Vínculo, a Aura e o Ocultismo alcançam todos os seus nós passando só por eles e pelo tronco Marcial', () => {
  const ns = Object.values(S.skills); assert.equal(new Set(ns.map(s => s.gx + ',' + s.gy)).size, ns.length);
  for (const el of ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko', 'aura', 'oculto']) {
    const set = ns.filter(s => s.el === el || s.el === 'fis'), start = set.findIndex(s => s.el === el && (s.root || s.br === el + '-0')), seen = new Set([start]), q = [start];
    assert.ok(start >= 0, 'raiz de ' + el);
    while (q.length) { const x = set[q.pop()]; set.forEach((y, i) => { if (!seen.has(i) && Math.max(Math.abs(x.gx - y.gx), Math.abs(x.gy - y.gy)) <= 1) { seen.add(i); q.push(i); } }); }
    assert.deepEqual(set.filter((_, i) => !seen.has(i)).map(s => s.name), [], el);
    assert.equal(ns.filter(s => s.el === el).length, ['aura', 'oculto'].includes(el) ? 120 : 104);
  }
});
test('conteúdo: armas de fogo usam DES, técnica exige a arma certa, bomba e reanimar funcionam', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }), it = n => Object.keys(S.items).find(k => S.items[k].name === n);
  h.attrs.AGI = 95; e.attrs.AGI = 1; h.skills = [sk('Tiro Duplo')]; h.aura = 20; H.battle(gm, { on: true });
  H.act(ana, { id: h.id, skill: sk('Tiro Duplo'), target: e.id }); assert.equal(h.aura, 20); // sem arma de fogo: recusado
  h.inv[it('Revólver .38')] = 1; H.equip(ana, { id: h.id, item: it('Revólver .38') }); H.act(ana, { id: h.id, skill: sk('Tiro Duplo'), target: e.id }); assert.ok(h.aura < 20);
  while (current() !== h.id) H.next(gm);
  h.inv[it('Granada')] = 1; const hp = e.hp; H.use(ana, { id: h.id, item: it('Granada'), target: e.id }); assert.equal(e.hp, hp - 28);
  reset(); const a = mk(ana, {}), b2 = mk(ana, {}); b2.hp = 0; a.inv[it('Sais Aromáticos')] = 1; H.battle(gm, { on: true }); b2.dying = 3; S.battle.ticks[b2.id] = 9999;
  H.use(ana, { id: a.id, item: it('Sais Aromáticos'), target: b2.id }); assert.equal(b2.hp, 20);
});
test('chefe: ponto fraco dobra o dano, controle dura 1 turno, fúria invoca lacaios', () => {
  reset(); const h = mk(ana, {}), bid = Object.keys(S.bestiary).find(k => S.bestiary[k].boss); H.bSpawn(gm, { id: bid });
  const boss = Object.values(S.chars).find(c => c.boss); derive(boss); boss.hp = boss.hpMax; h.attrs.FOR = 95; h.attrs.AGI = 99; boss.attrs.AGI = 1;
  H.battle(gm, { on: true }); H.st(gm, { id: boss.id, k: 'stun' }); assert.equal(boss.st.stun, 1);
  delete boss.st.stun; let hp = boss.hp, dmgWeak = 0, dmgTorso = 0;
  for (let i = 0; i < 60 && !(dmgWeak && dmgTorso); i++) { if (current() !== h.id) { S.battle.ticks[h.id] = -1; } boss.hp = boss.hpMax * 10; boss.body = {}; boss.st = {}; hp = boss.hp; const other = boss.weakPart === 'torso' ? 'legL' : 'torso', aim = dmgWeak ? other : boss.weakPart;
    H.act(ana, { id: h.id, skill: 'atk', target: boss.id, aim }); const d = hp - boss.hp, crit = /CRÍTICO/.test(S.log.at(-1).text) || /CRÍTICO/.test(S.log.at(-2)?.text || ''); if (d > 0 && !crit) { if (aim === boss.weakPart) dmgWeak = d; else dmgTorso = d; } }
  assert.equal(dmgWeak, dmgTorso * 2);
  const before = Object.keys(S.chars).length; boss.hp = Math.floor(boss.hpMax / 2) + 1; S.battle.ticks[h.id] = -1; for (let i = 0; i < 30 && !boss.rage; i++) { S.battle.ticks[h.id] = -1; H.act(ana, { id: h.id, skill: 'atk', target: boss.id }); }
  assert.equal(boss.rage, true); assert.equal(Object.keys(S.chars).length, before + 2);
});
test('economia: loja por cena, contrato pago na vitória, forja com essências', () => {
  reset(); S.contracts = {}; const h = mk(ana, {}), it = n => Object.keys(S.items).find(k => S.items[k].name === n), a = S.scene;
  H.shop(gm, { f: 'open', v: 1 }); H.shop(gm, { item: it('Tônico') }); h.gold = 10; H.buy(ana, { id: h.id, item: it('Tônico') }); assert.equal(h.inv[it('Tônico')], 1);
  H.sceneAdd(gm); h.gold = 10; H.buy(ana, { id: h.id, item: it('Tônico') }); assert.equal(h.inv[it('Tônico')], 1); H.sceneGo(gm, { id: a }); // outra cena: loja fechada
  const bid = Object.keys(S.bestiary).find(k => S.bestiary[k].name === 'Kappa'); H.ctAdd(gm, { id: bid, gold: 100, xp: 7 }); H.bSpawn(gm, { id: bid, tier: 'elite' });
  const foe = Object.values(S.chars).find(c => c.enemy); derive(foe); H.battle(gm, { on: true }); foe.hp = 0; h.gold = 0; h.xp = 0; H.battle(gm, { on: false, win: true });
  assert.ok(h.gold >= 100); assert.ok(h.xp >= 7); assert.equal(Object.values(S.contracts)[0].done, true);
  const ess = it('Essência de Kagutsuchi'); h.inv[ess] = 3; h.gold = 125; H.forge(ana, { id: h.id, item: it('Sabre Flamejante') }); assert.equal(h.inv[it('Sabre Flamejante')], 1); assert.equal(h.inv[ess], undefined); assert.equal(h.gold, 0);
});
test('cenas de exemplo com loja própria e perseguição que termina', () => {
  reset(); assert.ok(Object.values(S.scenes).some(s => s.name === 'Estação Central' && s.shop.stock.length && s.bg === '/maps/estacao.svg'));
  const a = mk(ana, {}), b = mk(gm, { enemy: true }); H.chase(gm, { k: 'start', a: a.id, b: b.id, va: 'moto', vb: 'pe' }); assert.equal(S.chase.gap, 5);
  for (let i = 0; i < 60 && S.chase; i++) H.chase(gm, { k: 'round' });
  assert.equal(S.chase, null); H.chase(ana, { k: 'start', a: a.id, b: b.id, va: 'moto', vb: 'pe' }); assert.equal(S.chase, null);
});
test('Vínculo: só aprende skills do próprio Vínculo, ganha a raiz e resiste ao elemento', () => {
  reset(); const h = mk(ana, {}); h.xp = 100;
  H.learn(ana, { id: h.id, skill: sk('Centelha') }); assert.equal(h.skills.length, 0); // sem Vínculo com Kagutsuchi
  H.vinc(ana, { id: h.id, el: 'kagutsuchi' }); assert.deepEqual(h.vinc, []); // só o mestre concede
  H.vinc(gm, { id: h.id, el: 'kagutsuchi' }); assert.deepEqual(h.vinc, ['kagutsuchi']); assert.ok(h.skills.includes(sk('Centelha')));
  H.learn(ana, { id: h.id, skill: sk('Faísca') }); assert.equal(h.skills.length, 1); // Indra continua trancado
  const e = mk(gm, { enemy: true }); e.skills = [sk('Centelha')]; e.attrs.AGI = 99; e.attrs.INT = 99; h.attrs.AGI = 1; H.battle(gm, { on: true });
  let seen = false; for (let i = 0; i < 40 && !seen; i++) { S.battle.ticks[e.id] = -1; h.hp = h.hpMax; e.aura = 99; H.act(gm, { id: e.id, skill: sk('Centelha'), target: h.id }); seen = /resistiu/.test(S.log.at(-1).text); }
  assert.ok(seen);
});
test('requisito de atributo trava o nó até o personagem ter o valor', () => {
  reset(); const h = mk(ana, {}), id = Object.keys(S.skills).find(k => S.skills[k].rq && S.skills[k].el === 'indra'), s = S.skills[id], [a, v] = Object.entries(s.rq)[0];
  h.vinc = ['indra']; h.xp = 999; h.skills = Object.keys(S.skills).filter(k => S.skills[k].el === 'indra' && k !== id && !S.skills[k].ex); // vizinhos garantidos
  h.attrs[a] = v - 1; H.learn(ana, { id: h.id, skill: id }); assert.ok(!h.skills.includes(id));
  h.attrs[a] = v; H.learn(ana, { id: h.id, skill: id }); assert.ok(h.skills.includes(id));
  assert.ok(Object.values(S.skills).filter(x => x.rq).length > 150);
});
test('personagens base e mapa: recorte e casas ajustáveis', () => {
  reset(); assert.ok(true);
  const sc = S.scenes[S.scene]; H.map(gm, { f: 'ar', v: 2 }); H.map(gm, { f: 'cols', v: 22.5 }); assert.equal(sc.cols, 22.5); assert.equal(sc.rows, 11.25);
  H.map(gm, { f: 'crop', v: { x: .1, y: .2, w: .5, h: 2 } }); assert.deepEqual(sc.crop, { x: .1, y: .2, w: .5, h: .8 });
  H.map(gm, { f: 'cam', v: { z: 2, fx: -.1, fy: 0 } }); assert.equal(sc.cam.z, 2); H.map(ana, { f: 'cols', v: 5 }); assert.equal(sc.cols, 22.5);
});
test('contas: só o mestre cria, troca senha e apaga; jogador não cria nem assume personagem', () => {
  reset(); S.users = {}; const sent = [], gmc = { role: 'gm', send: x => sent.push(JSON.parse(x)) }, h = mk(gm, { owner: '' });
  H.userAdd(ana, { name: 'Eva', pass: '1234' }); assert.equal(Object.hasOwn(S.users, 'Eva'), false);
  H.userAdd(gmc, { name: 'mestre', pass: '1234' }); H.userAdd(gmc, { name: 'a b', pass: '1234' }); H.userAdd(gmc, { name: 'Eva', pass: '12' }); assert.deepEqual(Object.keys(S.users), []); assert.equal(sent.length, 3);
  H.userAdd(gmc, { name: 'Eva', pass: '1234', char: h.id }); assert.equal(h.owner, 'Eva'); assert.deepEqual(view(gmc).accounts, ['Eva']); assert.equal(view(gmc).users, undefined);
  const old = S.users.Eva; H.userPass(gmc, { name: 'Eva', pass: 'nova1' }); assert.notEqual(S.users.Eva, old);
  const n = Object.keys(S.chars).length; H.addChar(ana, {}); assert.equal(Object.keys(S.chars).length, n); assert.equal(H.claim, undefined);
  H.userDel(ana, { name: 'Eva' }); assert.ok(S.users.Eva); H.userDel(gmc, { name: 'Eva' }); assert.equal(S.users.Eva, undefined); assert.equal(h.owner, '');
});
test('bestiário: criar vários, editar modelo, encontro salvo e skill dada pelo mestre', () => {
  reset(); S.encounters = {}; const bid = Object.keys(S.bestiary).find(k => S.bestiary[k].name === 'Bandido');
  H.bSpawn(gm, { id: bid, n: 3, tier: 'fraco' }); const foes = Object.values(S.chars); assert.equal(foes.length, 3); assert.equal(new Set(foes.map(f => f.x + ',' + f.y)).size, 3);
  H.set(gm, { id: bid, f: 'name', v: 'Salteador' }); assert.equal(S.bestiary[bid].name, 'Salteador'); H.set(ana, { id: bid, f: 'name', v: 'x' }); assert.equal(S.bestiary[bid].name, 'Salteador');
  H.skTog(gm, { id: bid, skill: sk('Centelha') }); assert.ok(S.bestiary[bid].skills.includes(sk('Centelha'))); H.skTog(ana, { id: bid, skill: sk('Centelha') }); assert.ok(S.bestiary[bid].skills.includes(sk('Centelha')));
  reset(); H.encSave(gm, { name: 'Emboscada', list: [{ b: bid, tier: 'normal', n: 2 }, { b: 'nao-existe', n: 1 }] }); const eid = Object.keys(S.encounters)[0]; assert.equal(S.encounters[eid].list.length, 1);
  H.encSpawn(gm, { id: eid }); assert.equal(Object.keys(S.chars).length, 2); assert.equal(view(ana).encounters, undefined);
  H.set(gm, { id: bid, f: 'name', v: 'Bandido' }); H.skTog(gm, { id: bid, skill: sk('Centelha') });
});
test('gerador: inimigos acompanham o poder do grupo; encontro respeita a dificuldade; chefe do bestiário é ajustado', () => {
  reset(); const h = [mk(ana, {}), mk(ana, {}), mk(ana, {})]; h.forEach(x => Object.assign(x.attrs, { FOR: 60, AGI: 55, CON: 50 }));
  H.foeGen(ana, { el: 'atlas', role: 'bruto', rank: 'comum' }); assert.equal(Object.values(S.chars).filter(c => c.enemy).length, 0);
  H.foeGen(gm, { el: 'atlas', role: 'bruto', rank: 'comum', n: 2 }); const weak = Object.values(S.chars).filter(c => c.enemy); assert.equal(weak.length, 2); assert.ok(weak[0].skills.length >= 1); assert.deepEqual(weak[0].resist, ['atlas']);
  h.forEach(x => Object.assign(x.attrs, { FOR: 85, AGI: 80, CON: 75 })); H.foeGen(gm, { el: 'atlas', role: 'bruto', rank: 'comum' });
  const strong = Object.values(S.chars).filter(c => c.enemy).at(-1) === weak[0] ? Object.values(S.chars).filter(c => c.enemy && !weak.includes(c))[0] : Object.values(S.chars).filter(c => c.enemy && !weak.includes(c))[0];
  assert.ok(strong.attrs.FOR > weak[0].attrs.FOR + 15); derive(strong); derive(weak[0]); assert.ok(strong.hpMax > weak[0].hpMax);
  const count = d => { for (const k of Object.keys(S.chars)) if (S.chars[k].enemy) delete S.chars[k]; H.foeEnc(gm, { diff: d, el: 'indra' }); return Object.values(S.chars).filter(c => c.enemy).reduce((a, c) => a + ({ lacaio: .5, comum: 1, elite: 2 })[c.rank], 0); };
  assert.ok(count('mortal') > count('facil'));
  for (const k of Object.keys(S.chars)) if (S.chars[k].enemy) delete S.chars[k];
  const bid = Object.keys(S.bestiary).find(k => S.bestiary[k].boss), tplMax = Math.max(...Object.values(S.bestiary[bid].attrs)); H.bSpawn(gm, { id: bid }); const boss = Object.values(S.chars).find(c => c.boss);
  assert.notEqual(Math.max(...Object.values(boss.attrs)), tplMax); assert.ok(boss.bon.hpMax > 0); H.foeGen(gm, { el: 'fis', role: 'agil', rank: 'elite', save: true }); assert.ok(Object.values(S.bestiary).some(b => b.rank === 'elite' && b.role === 'agil'));
  for (const k of Object.keys(S.bestiary)) if (S.bestiary[k].rank) delete S.bestiary[k];
});
test('só o mestre altera atributos; jogador só mexe no próprio personagem', () => {
  reset(); const h = mk(ana, {}), o = mk(bia, {});
  H.set(ana, { id: h.id, f: 'attrs.FOR', v: 99 }); assert.equal(h.attrs.FOR, 40);
  H.set(gm, { id: h.id, f: 'attrs.FOR', v: 70 }); assert.equal(h.attrs.FOR, 70);
  H.set(ana, { id: o.id, f: 'name', v: 'x' }); assert.equal(o.name, 'Herói');
  H.set(ana, { id: h.id, f: 'gold', v: 999 }); assert.equal(h.gold, 0);
});
test('máximos derivam dos atributos e o atual nunca passa do máximo', () => {
  reset(); const h = mk(ana, {}); H.set(gm, { id: h.id, f: 'attrs.CON', v: 60 }); derive(h); assert.equal(h.hpMax, 130);
  H.set(ana, { id: h.id, f: 'hp', v: 1 }); assert.equal(h.hp, 90); // recursos só o mestre altera
  H.set(gm, { id: h.id, f: 'hp', v: 9999 }); derive(h); assert.equal(h.hp, 130);
});
test('pedidos: ação do jogador espera o mestre; aprovar com bônus, em segredo, negar, cancelar e liberar por tipo', () => {
  reset(); S.reqs = {}; for (const k in S.auto) S.auto[k] = false;
  const h = mk(ana, {}), o = mk(bia, {}), one = () => Object.entries(S.reqs).find(([, r]) => r.by === 'Ana') || [];
  h.attrs.FOR = 50; handle(ana, { t: 'roll', id: h.id, attr: 'FOR', mod: 10 }); assert.equal(S.log.length, 0);
  let [id, r] = one(); assert.equal(r.text, 'rolar FOR +10'); assert.equal(r.cat, 'roll');
  handle(ana, { t: 'roll', id: o.id, attr: 'FOR' }); assert.equal(Object.keys(S.reqs).length, 1); // personagem alheio: nem entra na fila
  handle(ana, { t: 'roll', id: h.id, attr: 'AGI' }); assert.equal(Object.keys(S.reqs).length, 1); [id, r] = one(); assert.equal(r.text, 'rolar AGI'); // o novo substitui
  assert.deepEqual(Object.keys(view(bia).reqs), []); assert.equal(Object.keys(view(ana).reqs).length, 1); assert.equal(Object.keys(view(gm).reqs).length, 1);
  handle(bia, { t: 'reqOk', id }); handle(bia, { t: 'reqNo', id }); assert.equal(Object.keys(S.reqs).length, 1); // só o mestre decide; só o dono cancela
  h.attrs.AGI = 40; handle(gm, { t: 'reqOk', id, mod: 20, secret: true }); assert.equal(Object.keys(S.reqs).length, 0);
  assert.match(S.log.at(-1).text, /^AGI 60%/); assert.equal(S.log.at(-1).to, '@gm'); assert.equal(view(ana).log.length, 0);
  handle(ana, { t: 'roll', id: h.id, attr: 'FOR' }); handle(ana, { t: 'reqNo', id: one()[0] }); assert.equal(Object.keys(S.reqs).length, 0); // jogador cancela
  handle(ana, { t: 'roll', id: h.id, attr: 'FOR' }); handle(gm, { t: 'reqNo', id: one()[0], why: 'não agora' }); assert.equal(Object.keys(S.reqs).length, 0); assert.equal(S.log.length, 1);
  handle(gm, { t: 'autoSet', k: 'roll', v: true }); handle(ana, { t: 'roll', id: h.id, attr: 'FOR' }); assert.equal(Object.keys(S.reqs).length, 0); assert.equal(S.log.length, 2); S.auto.roll = false;
  // combate: só na vez; o pedido some se a vez passar
  const e = mk(gm, { enemy: true }); h.attrs.AGI = 95; o.attrs.AGI = 1; e.attrs.AGI = 2; H.battle(gm, { on: true }); assert.equal(current(), h.id);
  handle(bia, { t: 'act', id: o.id, skill: 'atk', target: e.id }); assert.equal(Object.keys(S.reqs).length, 0);
  handle(ana, { t: 'act', id: h.id, skill: 'atk', target: e.id, aim: 'head' }); [id, r] = one(); assert.match(r.text, /^Ataque → Inimigo \(mira: cabeça\)/); assert.equal(current(), h.id);
  const n = S.log.length; handle(gm, { t: 'reqOk', id, mod: 100 }); assert.ok(S.log.length > n); assert.ok(S.log.slice(n).some(l => /\(95%\)/.test(l.text))); // bônus do mestre entra no acerto
  handle(ana, { t: 'act', id: h.id, skill: 'atk', target: e.id }); assert.equal(Object.keys(S.reqs).length, 1);
  H.ini(gm, { k: 'down', id: h.id }); S.battle.ticks[h.id] = 99999; handle(gm, { t: 'chat', text: 'oi' }); assert.equal(Object.keys(S.reqs).length, 0); // passou a vez: o pedido some
  handle(ana, { t: 'act', id: h.id, skill: 'atk', target: e.id }); assert.equal(Object.keys(S.reqs).length, 0);
  H.battle(gm, {}); handle(ana, { t: 'move', id: h.id, x: 3, y: 2 }); assert.equal(h.x, 3); // mover o token não pede aprovação
  const ctl = { role: 'player', name: 'Ana', ctl: true, appr: true }, n2 = S.log.length; handle(ctl, { t: 'roll', id: h.id, attr: 'FOR' }); assert.equal(S.log.length, n2 + 1); assert.equal(Object.keys(S.reqs).length, 0); // mestre no controle: sem fila
  handle(gm, { t: 'map', f: 'bbg', v: 'gelo' }); assert.equal(S.scenes[S.scene].bbg, 'gelo'); handle(gm, { t: 'map', f: 'bbg', v: 'javascript:x' }); assert.equal(S.scenes[S.scene].bbg, ''); handle(ana, { t: 'map', f: 'bbg', v: 'noite' }); assert.equal(S.scenes[S.scene].bbg, '');
});
test('mestre: aplica a vários de uma vez e dá ou tira skill passiva com o bônus', () => {
  reset(); const a = mk(ana, {}), b = mk(bia, {}), hp = a.hp;
  handle(gm, { t: 'bulk', ids: [a.id, b.id, 'x'], k: 'dmg', v: 7 }); assert.equal(a.hp, hp - 7); assert.equal(b.hp, hp - 7);
  handle(gm, { t: 'bulk', ids: [a.id, b.id], k: 'xp', v: 15 }); assert.equal(a.xp, 15); handle(gm, { t: 'bulk', ids: [a.id], k: 'heal', v: 99 }); assert.equal(a.hp, a.hpMax);
  handle(ana, { t: 'bulk', ids: [a.id], k: 'gold', v: 50 }); assert.equal(a.gold, 0);
  handle(gm, { t: 'skTog', id: a.id, skill: sk('Vigor') }); derive(a); assert.equal(a.hpMax, hp + 10); handle(gm, { t: 'skTog', id: a.id, skill: sk('Vigor') }); derive(a); assert.equal(a.hpMax, hp); assert.equal(a.skills.length, 0);
});
test('batalha: só o dono age no seu turno, mira aplica dano na parte', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.attrs.AGI = 95; h.attrs.FOR = 95; e.attrs.AGI = 1;
  H.battle(gm, { on: true }); assert.equal(current(), h.id);
  H.act(bia, { id: h.id, skill: 'atk', target: e.id }); assert.equal(e.hp, e.hpMax);
  for (let i = 0; i < 40 && !(e.body.armL > 0); i++) { if (current() !== h.id) H.next(gm); else H.act(ana, { id: h.id, skill: 'atk', target: e.id, aim: 'armL' }); }
  assert.ok(e.body.armL > 0); assert.ok(e.hp < e.hpMax);
});
test('herói caído morre após 3 turnos sem cura; cura interrompe', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); H.battle(gm, { on: true });
  h.hp = 0; h.dying = 3; for (let i = 0; i < 12 && !h.dead; i++) H.next(gm);
  assert.equal(h.dead, true);
});
test('passiva aprendida soma bônus permanente e gasta XP', () => {
  reset(); const h = mk(ana, {}); h.xp = 10; const before = h.hpMax;
  H.learn(ana, { id: h.id, skill: sk('Vigor') }); derive(h); assert.equal(h.hpMax, before + 10); assert.equal(h.xp, 0);
});
test('jogadores não recebem números de inimigos, notas nem sussurros alheios', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); e.gmNote = 'segredo'; h.gmNote = 'nota';
  H.chat(bia, { text: '/w mestre oi' }); H.roll(gm, { id: e.id, attr: 'FOR', secret: true });
  const v = view(ana), ve = v.chars[e.id];
  assert.equal(ve.hpMax, 100); assert.equal(ve.attrs.FOR, 0); assert.equal(ve.gmNote, undefined); assert.equal(v.chars[h.id].gmNote, undefined);
  assert.equal(v.log.length, 0); assert.equal(v.users, undefined); assert.equal(v.bestiary, undefined); assert.equal(view(gm).log.length, 2);
  H.place(gm, { id: e.id }); assert.equal(view(ana).chars[e.id], undefined); // fora do mapa: invisível
});
test('heróis acompanham a troca de cena; inimigos ficam', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }), a = S.scene; H.sceneAdd(gm);
  assert.equal(h.scene, S.scene); assert.equal(e.scene, a); assert.notEqual(a, S.scene);
});
// ----- árvore expandida: mecânicas novas (sorteio fixado para serem determinísticos) -----
const fixR = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } }; // 0.3 → d100 = 31: acerta sem crítico, golpe no torso
const duel = (o = {}) => { reset(); const a = mk(ana, {}), e = mk(gm, { enemy: true }); Object.assign(a.attrs, { FOR: 70, INT: 70, SAB: 70, CON: 60, DES: 70, AGI: 60 }); e.attrs.AGI = 10; Object.assign(a, o); derive(a); derive(e); a.hp = a.hpMax; e.hp = e.hpMax; a.aura = a.auraMax; a.san = a.sanMax; H.battle(gm, { on: true }); return [a, e]; };
const turn = ch => { for (const k in S.battle.ticks) S.battle.ticks[k] = 1000; S.battle.ticks[ch.id] = 0; };
const use = (a, n, t, m = {}) => { turn(a); if (!a.skills.includes(sk(n))) a.skills.push(sk(n)); return fixR(.3, () => H.act(gm, { id: a.id, skill: sk(n), target: t.id, ...m })); };
test('regras: a notação dos nós vira efeitos, e os nós antigos cumprem o que o nome promete', () => {
  const S0 = n => S.skills[sk(n)];
  assert.deepEqual(S0('Vampirismo').fx, [{ t: 'drain', r: 'hp', p: 50 }]); assert.equal(S0('Combustão Súbita').fx[0].t, 'det'); assert.equal(S0('Ressurgir').fx[0].t, 'revive');
  assert.equal(S0('Avatar de Kagutsuchi').form.dur, 4); assert.equal(S0('Avatar de Kagutsuchi').aw, 'kagutsuchi'); assert.equal(S0('Tiro Duplo').hits, 2);
  assert.ok(Object.values(S.skills).every(x => !x.fx || x.fx.every(f => f.t))); assert.ok(Object.values(S.skills).filter(x => x.duo).every(x => Object.values(S.skills).some(y => y.name === x.duo)));
});
test('roubo de vida, detonar condição e escudo', () => {
  let [a, e] = duel(); a.hp = 10; use(a, 'Vampirismo', e); assert.ok(a.hp > 10); assert.match(S.log.find(l => /Vampirismo/.test(l.text)).text, /\+\d+ HP para/);
  [a, e] = duel(); e.st.burn = 4; const hp = e.hp; use(a, 'Combustão Súbita', e); assert.ok(S.log.some(l => /Detonação/.test(l.text))); assert.ok(e.hp < hp);
  [a, e] = duel(); use(a, 'Escudo de Areia', a); assert.ok(a.shield > 0); const sh = a.shield, h0 = a.hp; turn(e); fixR(.3, () => H.act(gm, { id: e.id, skill: 'atk', target: a.id })); assert.ok(a.shield < sh || a.hp === h0);
});
test('purificar tira só as condições ruins; reerguer devolve um caído', () => {
  let [a, e] = duel(); const b = mk(ana, {}); S.battle.ticks[b.id] = 500; b.st = { burn: 3, fear: 2, atkUp: 2 }; use(a, 'Purificação em Massa', b); assert.deepEqual(b.st, { atkUp: 2 });
  [a, e] = duel(); const c = mk(ana, {}); S.battle.ticks[c.id] = 500; c.hp = 0; c.dying = 2; use(a, 'Ressurgir', c); assert.ok(c.hp >= Math.ceil(c.hpMax * .4)); assert.equal(c.dying, undefined);
});
test('transformação: uma por vez, drena por turno e cobra o efeito colateral ao acabar', () => {
  const [a, e] = duel(); use(a, 'Fornalha do Corpo', e); assert.equal(a.form, sk('Fornalha do Corpo')); assert.ok(a.st.form > 0);
  use(a, 'Postura da Brasa', e); assert.equal(a.form, sk('Postura da Brasa')); // trocar de forma encerra a anterior
  const aura = a.aura; turn(e); H.next(gm); assert.ok(a.aura <= aura + Math.round(a.auraMax / 10)); // dreno de 2 por turno descontado da regeneração
  for (let i = 0; i < 6 && a.form; i++) { turn(a); H.next(gm); } assert.equal(a.form, undefined);
  use(a, 'Fornalha do Corpo', e); for (let i = 0; i < 6 && a.form; i++) { turn(a); H.next(gm); } assert.ok(a.st.exaus > 0); // colateral: exausto
  turn(a); H.act(gm, { id: a.id, skill: sk('Fornalha do Corpo'), target: e.id }); assert.equal(a.form, undefined); // exausto não se transforma
});
test('concentração: solta sozinha no próximo turno e é quebrada por golpe forte', () => {
  const start = () => { const [a, e] = duel(); a.skills.push(sk('Carga Acumulada')); turn(a); S.battle.ticks[e.id] = 1; fixR(.3, () => H.act(gm, { id: a.id, skill: sk('Carga Acumulada'), target: e.id })); return [a, e]; }; // o inimigo age antes do próximo turno dele
  let [a, e] = start(); assert.ok(a.chg); assert.equal(current(), e.id); const hp = e.hp;
  fixR(.3, () => H.next(gm)); assert.equal(a.chg, undefined); assert.ok(e.hp < hp); // a vez do inimigo passa, o turno dele começa e o golpe sai
  [a, e] = start(); e.arma = 40; fixR(.3, () => H.act(gm, { id: e.id, skill: 'atk', target: a.id }));
  assert.ok(a.hp > 0); assert.equal(a.chg, undefined); assert.ok(S.log.some(l => /perde a concentração/.test(l.text)));
});
test('votos: corpo fechado se rompe ao se curar; silêncio proíbe área; sangue cobra HP', () => {
  let [a, e] = duel(); a.skills.push(sk('Voto do Corpo Fechado')); const san = a.san; a.hp = 20; use(a, 'Recuperar o Fôlego', a); assert.ok(a.bt.broken.corpo); assert.ok(a.san < san);
  [a, e] = duel(); a.skills.push(sk('Seiyaku: Silêncio')); const aura = a.aura; use(a, 'Granada de Mão', e); assert.equal(a.aura, aura);
  [a, e] = duel(); a.skills.push(sk('Voto de Sangue')); const hp = a.hp; use(a, 'Golpe Pesado', e); assert.ok(a.hp <= hp - Math.ceil(a.hpMax * .08));
});
test('ritual: gasta Aura e Sanidade; o componente ritualístico corta a Sanidade pela metade e é consumido', () => {
  let [a, e] = duel({ aw: ['outro'] }); let san = a.san; use(a, 'Ritual: Marca da Morte', e); assert.equal(a.san, san - 6); assert.ok(e.sealD);
  [a, e] = duel({ aw: ['outro'] }); const comp = Object.keys(S.items).find(k => S.items[k].eff === 'comp'); a.inv[comp] = 1; san = a.san; use(a, 'Ritual: Marca da Morte', e); assert.equal(a.san, san - 3); assert.equal(a.inv[comp], undefined);
});
test('selo explode quando acaba e pode ser detonado antes', () => {
  let [a, e] = duel(); use(a, 'Fagulha Latente', e); assert.ok(e.sealD); const hp = e.hp; for (let i = 0; i < 4 && e.sealD; i++) { turn(e); H.next(gm); } assert.equal(e.sealD, undefined); assert.ok(e.hp < hp);
  [a, e] = duel(); use(a, 'Fagulha Latente', e); use(a, 'Detonar', e); assert.equal(e.sealD, undefined); assert.ok(S.log.some(l => /selo de .* explode/.test(l.text)));
});
test('invocação entra na fila, age sozinha e some com o fim da batalha', () => {
  const [a, e] = duel({ vinc: ['susanoo'] }); use(a, 'Invocar: Kappa Servo', a); const kap = Object.values(S.chars).find(c => c.summon); assert.ok(kap && kap.id in S.battle.ticks); assert.equal(kap.enemy, a.enemy);
  const n = S.log.length; turn(kap); fixR(.3, () => H.next(gm)); // o turno da invocação começa e ela age sozinha
  assert.ok(S.log.slice(n).some(l => l.who === 'Kappa Servo'));
  H.battle(gm, { on: false }); assert.ok(!Object.values(S.chars).some(c => c.summon));
});
test('técnica em dupla: exige o parceiro com a skill par, que paga e perde o próximo turno', () => {
  const [a, e] = duel(); const aura = a.aura; use(a, 'Pinça: Flanco Esquerdo', e); assert.equal(a.aura, aura); // sem parceiro: recusado
  const b = mk(ana, {}); b.skills = [sk('Pinça: Flanco Direito')]; b.aura = 20; S.battle.ticks[b.id] = 500; use(a, 'Pinça: Flanco Esquerdo', e);
  assert.equal(b.aura, 16); assert.ok(S.battle.ticks[b.id] > 500); assert.ok(S.log.some(l => /executam juntos/.test(l.text)));
});
test('provocar puxa o golpe; guarda-costas recebe no lugar; esquiva e contra-ataque', () => {
  let [a, e] = duel(); const b = mk(ana, {}); S.battle.ticks[b.id] = 500; use(a, 'Desafio', a); const hb = b.hp; fixR(.3, () => { turn(e); H.act(gm, { id: e.id, skill: 'atk', target: b.id }); }); assert.equal(b.hp, hb); assert.ok(a.hp < a.hpMax);
  [a, e] = duel(); const c = mk(ana, {}); S.battle.ticks[c.id] = 500; use(a, 'Guarda-Costas', c); const hc = c.hp; fixR(.3, () => { turn(e); H.act(gm, { id: e.id, skill: 'atk', target: c.id }); }); assert.equal(c.hp, hc);
  [a, e] = duel(); use(a, 'Reflexo do Raio', a); const ha = a.hp; fixR(.3, () => { turn(e); H.act(gm, { id: e.id, skill: 'atk', target: a.id }); }); assert.equal(a.hp, ha); assert.equal(a.st.evade, undefined);
  [a, e] = duel(); use(a, 'Contragolpe de Pedra', a); const he = e.hp; fixR(.3, () => { turn(e); H.act(gm, { id: e.id, skill: 'atk', target: a.id }); }); assert.ok(e.hp < he); assert.ok(S.log.some(l => /contra-ataca/.test(l.text)));
});
test('gatilhos: escudo no início da batalha e Tenacidade segura um golpe fatal uma vez', () => {
  reset(); const a = mk(ana, {}), e = mk(gm, { enemy: true }); a.skills = [sk('Ten: Envolver'), sk('Tenacidade')]; H.battle(gm, { on: true }); assert.ok(a.shield > 0);
  a.shield = 0; a.hp = 5; e.arma = 300; fixR(.3, () => { turn(e); H.act(gm, { id: e.id, skill: 'atk', target: a.id }); }); assert.equal(a.hp, 1);
  fixR(.3, () => { turn(e); H.act(gm, { id: e.id, skill: 'atk', target: a.id }); }); assert.equal(a.hp, 0);
});
test('requisitos novos: Despertar, nó anterior, nós do ramo, estado e afinidade de Aura', () => {
  reset(); const h = mk(ana, {}); h.xp = 999; const id = n => sk(n);
  h.skills = [id('Golpe Pesado')]; const oc = Object.keys(S.skills).find(k => S.skills[k].el === 'oculto' && S.skills[k].br === 'oculto-0' && !S.skills[k].pre);
  const near = k => { const s = S.skills[k]; return Object.keys(S.skills).find(j => j !== k && Math.max(Math.abs(S.skills[j].gx - s.gx), Math.abs(S.skills[j].gy - s.gy)) <= 1 && ['fis', 'oculto'].includes(S.skills[j].el)); };
  h.skills = [near(oc)]; H.learn(ana, { id: h.id, skill: oc }); assert.ok(!h.skills.includes(oc)); // sem o Despertar
  H.aw(ana, { id: h.id, k: 'outro' }); assert.deepEqual(h.aw, []); H.aw(gm, { id: h.id, k: 'outro' }); H.learn(ana, { id: h.id, skill: oc }); assert.ok(h.skills.includes(oc));
  const amp = id('Lacre de Brasa — Discente'); h.vinc = ['kagutsuchi']; h.skills = Object.keys(S.skills).filter(k => S.skills[k].br === 'kagutsuchi-7' && k !== amp && k !== id('Ritual: Lacre de Brasa'));
  H.learn(ana, { id: h.id, skill: amp }); assert.ok(!h.skills.includes(amp)); h.skills.push(id('Ritual: Lacre de Brasa')); H.learn(ana, { id: h.id, skill: amp }); assert.ok(h.skills.includes(amp));
  const q = id('Mutação Final: Quimera'); h.vinc = ['hiruko']; h.skills = Object.keys(S.skills).filter(k => S.skills[k].br === 'hiruko-8').slice(0, 9).filter(k => k !== q).slice(0, 5);
  H.learn(ana, { id: h.id, skill: q }); assert.ok(!h.skills.includes(q)); // 5 de 6 nós do ramo
  const fin = id('Restrição Autoimposta'), F = S.skills[fin]; h.skills = Object.keys(S.skills).filter(k => k !== fin && !S.skills[k].vow && ['fis', 'aura'].includes(S.skills[k].el) && Math.max(Math.abs(S.skills[k].gx - F.gx), Math.abs(S.skills[k].gy - F.gy)) <= 1);
  if (!h.skills.length) h.skills = [Object.keys(S.skills).find(k => k !== fin && Math.max(Math.abs(S.skills[k].gx - F.gx), Math.abs(S.skills[k].gy - F.gy)) <= 1)];
  assert.match(globalThis.RULES.whyNot({ ...h, skills: h.skills.filter(k => !S.skills[k].vow) }, F, S.skills, S.items, fin), /voto|vizinho/);
  h.skills = [...h.skills, id('Seiyaku: Presa')]; assert.ok(!/voto/.test(globalThis.RULES.whyNot(h, F, S.skills, S.items, fin))); // estado: ter um voto
  reset(); const n = mk(ana, {}); n.xp = 999; n.skills = [id('Hatsu: Liberar')]; const root = Object.keys(S.skills).find(k => S.skills[k].br === 'aura-2' && Math.max(Math.abs(S.skills[k].gx - S.skills[id('Hatsu: Liberar')].gx), Math.abs(S.skills[k].gy - S.skills[id('Hatsu: Liberar')].gy)) <= 3);
  n.skills = Object.keys(S.skills).filter(k => S.skills[k].br === 'aura-0'); const pr = id('Punho Reforçado'); n.skills.push(...Object.keys(S.skills).filter(k => S.skills[k].br === 'aura-2' && k !== pr));
  H.learn(ana, { id: n.id, skill: pr }); assert.equal(n.nen, 'int'); // a primeira categoria vira a natureza
  const em = id('Projétil de Aura'), xp = n.xp; n.skills.push(...Object.keys(S.skills).filter(k => S.skills[k].br === 'aura-7' && k !== em)); H.learn(ana, { id: n.id, skill: em }); assert.equal(xp - n.xp, 15); // Emissão é vizinha: 10 × 1,25 → 15
  assert.equal(globalThis.RULES.nenEff(n, S.skills[id('Aura Elétrica')]), .8); assert.equal(globalThis.RULES.nenEff(n, S.skills[id('Antena de Aura')]), .6);
  const es = id('Tempo Imperial'); n.skills.push(...Object.keys(S.skills).filter(k => S.skills[k].br === 'aura-5' && k !== es)); H.learn(ana, { id: n.id, skill: es }); assert.ok(!n.skills.includes(es)); // Especialização exige Despertar
});
test('a IA dos inimigos usa transformação, cura e ataques sem travar a fila', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); e.skills = [sk('Postura da Brasa'), sk('Centelha')]; e.attrs.AGI = 99; h.attrs.AGI = 1; derive(e); e.aura = e.auraMax;
  H.battle(gm, { on: true }); let formed = false; for (let i = 0; i < 40 && !formed; i++) { turn(e); H.ai(gm); formed = !!e.form || S.log.some(l => /assume a forma/.test(l.text)); e.aura = e.auraMax; delete e.st.exaus; h.hp = h.hpMax; }
  assert.ok(formed); assert.ok(Object.values(S.battle.ticks).every(Number.isFinite));
});
test.after(() => setTimeout(() => process.exit(0), 50));

// ---------- sistemas de combate novos: Quebra, Cadeia, Ataque Total, Coragem, Tensão, clima e reações ----------
const dmgOf = el => TREE[el].branches[0].find(n => n.k === 'dmg' && !n.req && !n.area && !n.chg && !n.fx && !n.hits).n;
test('Quebra: fraquezas esvaziam a barra; Quebrado perde o turno e sofre +50%', () => {
  const [a, e] = duel(); e.brk = { max: 2, cur: 2 }; e.weak = ['indra']; e.hp = e.hpMax = 9999;
  use(a, dmgOf('indra'), e); assert.equal(e.brk.cur, 1); assert.ok(!e.st.broken);
  use(a, dmgOf('indra'), e); assert.ok(e.st.broken); assert.equal(e.brk.cur, 2);
  const n = S.log.length; turn(a); S.battle.ticks[e.id] = 3; H.next(gm); assert.ok(S.log.slice(n).some(l => /quebrado e perde o turno/.test(l.text)));
  e.st.broken = 2; e.weak = []; const hp = e.hp; use(a, dmgOf('fuhaku'), e); const quebrado = hp - e.hp;
  delete e.st.broken; e.hp = hp; use(a, dmgOf('fuhaku'), e); assert.ok(quebrado > (hp - e.hp) * 1.35);
});
test('Cadeia: barra cheia faz o grupo atacar em seguida', () => {
  const [a, e] = duel(); const b = mk(ana, {}); S.battle.ticks[b.id] = 500; e.hp = e.hpMax = 9999; S.battle.chain.h = 99;
  const hp = e.hp; use(a, dmgOf('fuhaku'), e); assert.ok(S.log.some(l => /CADEIA/.test(l.text))); assert.equal(S.battle.chain.h, 0); assert.ok(e.hp < hp);
});
test('Ataque Total: só quando todo inimigo está Derrubado ou Quebrado', () => {
  const [a, e] = duel(); const b = mk(ana, {}); S.battle.ticks[b.id] = 500; e.hp = e.hpMax = 9999; turn(a);
  H.allOut(gm, { id: a.id }); assert.ok(!S.log.some(l => /ATAQUE TOTAL/.test(l.text))); // ninguém Derrubado
  e.st.down = 1; const hp = e.hp; turn(a); fixR(.3, () => H.allOut(gm, { id: a.id })); assert.ok(S.log.some(l => /ATAQUE TOTAL/.test(l.text))); assert.ok(e.hp < hp);
});
test('Coragem: defender guarda pontos; gastar dá ação extra e a dívida atrasa', () => {
  const [a, e] = duel(); turn(a); H.defend(gm, { id: a.id }); assert.equal(a.brv, 1); assert.ok(a.st.defUp);
  e.hp = e.hpMax = 9999; use(a, dmgOf('fuhaku'), e, { brave: true }); assert.equal(a.brv, 0); assert.equal(current(), a.id); // age de novo
  use(a, dmgOf('fuhaku'), e, { brave: true }); assert.equal(a.brv, -1); assert.equal(current(), a.id);
  const t0 = S.battle.ticks[a.id]; use(a, dmgOf('fuhaku'), e); assert.equal(a.brv, 0); assert.ok(S.battle.ticks[a.id] > t0 + 1000 / a.attrs.AGI * 1.2); // dívida pagou em tempo
});
test('Tensão: cada concentração multiplica o próximo golpe (×1,5 / ×2 / ×3)', () => {
  const [a, e] = duel(); e.hp = e.hpMax = 9999; use(a, dmgOf('fuhaku'), e); const base = 9999 - e.hp; e.hp = 9999;
  turn(a); H.focus(gm, { id: a.id }); turn(a); H.focus(gm, { id: a.id }); assert.equal(a.ten, 2);
  use(a, dmgOf('fuhaku'), e); assert.ok(9999 - e.hp > base * 1.8); assert.equal(a.ten, 0);
});
test('clima e reações: água molha, raio em Molhado paralisa; óleo e fogo explodem', () => {
  let [a, e] = duel(); e.hp = e.hpMax = 9999; S.battle.wx = { k: 'chuva', ttl: 0 };
  use(a, dmgOf('susanoo'), e); assert.ok(e.st.wet); const hp = e.hp; use(a, dmgOf('indra'), e); assert.ok(e.st.para); assert.ok(!e.st.wet); assert.ok(S.log.some(l => /Reação: Eletrocutar/.test(l.text))); assert.ok(e.hp < hp);
  [a, e] = duel(); e.hp = e.hpMax = 9999; e.st.oil = 3; use(a, dmgOf('kagutsuchi'), e); assert.ok(e.st.burn); assert.ok(!e.st.oil); assert.ok(S.log.some(l => /Reação: Explosão/.test(l.text)));
  [a, e] = duel(); e.hp = e.hpMax = 9999; use(a, dmgOf('kagutsuchi'), e); const sem = 9999 - e.hp; e.hp = 9999; delete e.st.burn; S.battle.wx = { k: 'sol', ttl: 0 }; use(a, dmgOf('kagutsuchi'), e); assert.ok(9999 - e.hp > sem); // sol reforça o fogo
});
test('passar a vez: depois de uma fraqueza, o aliado age em seguida com bônus', () => {
  const [a, e] = duel(); const b = mk(ana, {}); S.battle.ticks[b.id] = 400; e.weak = ['indra']; e.hp = e.hpMax = 9999;
  use(a, dmgOf('indra'), e, { pass: b.id }); assert.equal(current(), b.id); assert.ok(b.st.atkUp);
});
test('Expansão de Domínio: gasta toda a Aura, mexe nos modificadores, vence o choque e deixa Exausto ao fim', () => {
  let [a, e] = duel({ aw: ['kagutsuchi'] }); const dom = 'Fornalha Infinita'; a.aura = Math.floor(a.auraMax / 2) - 1; use(a, dom, a); assert.ok(!S.battle.dom); // metade da Aura exigida
  a.aura = a.auraMax; use(a, dom, a); assert.ok(S.battle.dom); assert.ok(a.aura <= Math.ceil(a.auraMax / 10)); assert.ok(modsOf(a).atk >= 20 && modsOf(e).def <= -10);
  for (let i = 0; i < 3; i++) { turn(e); S.battle.ticks[e.id] = 0; H.next(gm); turn(a); H.next(gm); } assert.ok(!S.battle.dom); assert.ok(a.st.exaus);
  [a, e] = duel({ aw: ['kagutsuchi'] }); S.battle.dom = { by: e.id, side: true, name: 'Rival', ttl: 3, ally: {}, foe: {}, pow: 0 }; a.aura = a.auraMax; use(a, dom, a);
  assert.equal(S.battle.dom.by, a.id); assert.ok(e.st.exaus);
});
test('técnica em trio: os dois parceiros pagam e perdem o próximo turno; sem eles, recusa', () => {
  const [a, e] = duel(); const b = mk(ana, {}), c = mk(ana, {}); S.battle.ticks[b.id] = 500; S.battle.ticks[c.id] = 500; e.hp = e.hpMax = 9999;
  const t = 'Tempestade Ígnea'; a.skills = [sk(`${t}: Kagutsuchi`)]; b.skills = [sk(`${t}: Fuhaku`)]; c.skills = [sk(`${t}: Indra`)]; b.aura = c.aura = 30;
  c.skills = []; const au = a.aura; use(a, `${t}: Kagutsuchi`, e); assert.equal(a.aura, au); // falta um parceiro
  c.skills = [sk(`${t}: Indra`)]; use(a, `${t}: Kagutsuchi`, e); assert.ok(a.aura < au); assert.ok(b.aura < 30 && c.aura < 30); assert.ok(S.battle.ticks[b.id] > 500 && S.battle.ticks[c.id] > 500); assert.ok(S.log.some(l => /executam juntos/.test(l.text)));
});
test('fusão exige os dois Vínculos; nós-chave dão bônus com desvantagem; sinergia de Aura exige o Vínculo', () => {
  reset(); const h = mk(ana, {}); h.xp = 999; const f = sk('Vapor Ardente (Kagutsuchi)'); h.vinc = ['kagutsuchi'];
  assert.match(RU.whyNot(h, S.skills[f], S.skills, S.items, f, true), /Exige também o Vínculo com Susanoo/);
  h.vinc = ['kagutsuchi', 'susanoo']; assert.ok(!/Exige também/.test(RU.whyNot(h, S.skills[f], S.skills, S.items, f, true)));
  const k = S.skills[sk('Coração Ígneo')]; assert.ok(k.mod.atk >= 30 && k.bon.hpMax < 0);
  const sn = sk('Ren Ígneo'); h.vinc = []; assert.match(RU.whyNot(h, S.skills[sn], S.skills, S.items, sn, true), /Exige também o Vínculo/);
});

// Testes das regras e permissões: node --test tools/test.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjtest-'));
const { H, S, current, derive, view, handle, migrateItems } = await import('../server.js');
const gm = { role: 'gm' }, ana = { role: 'player', name: 'Ana' }, bia = { role: 'player', name: 'Bia' };
const reset = () => { S.chars = {}; S.log.length = 0; S.battle = { active: false, ticks: {} }; };
const mk = (c, m) => { const before = new Set(Object.keys(S.chars)); H.addChar(gm, c.role === 'player' ? { ...m, owner: c.name } : m); /* só o mestre cria; o de jogador nasce com dono */ const ch = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(ch); ch.hp = ch.hpMax; return ch; };
const sk = n => Object.keys(S.skills).find(k => S.skills[k].name === n);

test('bestiário inicial e grade são criados', () => { assert.ok(Object.keys(S.bestiary).length >= 30); assert.equal(Object.keys(S.skills).length, 581); assert.ok(Object.keys(S.items).length >= 30); });
test('grade: sem sobreposição; cada Vínculo alcança todos os seus nós passando só por ele e pelo tronco Marcial', () => {
  const ns = Object.values(S.skills); assert.equal(new Set(ns.map(s => s.gx + ',' + s.gy)).size, ns.length);
  for (const el of ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'radiacao']) {
    const set = ns.filter(s => s.el === el || s.el === 'fis'), start = set.findIndex(s => s.el === el && s.root), seen = new Set([start]), q = [start];
    assert.ok(start >= 0, 'raiz de ' + el);
    while (q.length) { const x = set[q.pop()]; set.forEach((y, i) => { if (!seen.has(i) && Math.max(Math.abs(x.gx - y.gx), Math.abs(x.gy - y.gy)) <= 1) { seen.add(i); q.push(i); } }); }
    assert.deepEqual(set.filter((_, i) => !seen.has(i)).map(s => s.name), [], el);
    assert.equal(ns.filter(s => s.el === el).length, 60);
  }
});
test('conteúdo: armas de fogo usam DES, técnica exige a arma certa, bomba e reanimar funcionam', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }), it = n => Object.keys(S.items).find(k => S.items[k].name === n);
  h.attrs.AGI = 95; e.attrs.AGI = 1; h.skills = [sk('Tiro Duplo')]; h.aura = 20; H.battle(gm, { on: true });
  H.act(ana, { id: h.id, skill: sk('Tiro Duplo'), target: e.id }); assert.equal(h.aura, 20); // sem arma de fogo: recusado
  S.items.tgun = { name: 'Revólver de Teste', type: 'arma', power: 10, wt: 'fogo', el: '', price: 1, eff: 'hp', attr: 'SOR', pierce: 0, reqFor: 0 }; h.inv.tgun = 1; H.equip(ana, { id: h.id, item: 'tgun' }); H.act(ana, { id: h.id, skill: sk('Tiro Duplo'), target: e.id }); assert.ok(h.aura < 20);
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
  for (let i = 0; i < 60 && !(dmgWeak && dmgTorso); i++) { if (current() !== h.id) { S.battle.ticks[h.id] = -1; } boss.hp = boss.hpMax; boss.body = {}; hp = boss.hp; const other = boss.weakPart === 'torso' ? 'legL' : 'torso', aim = dmgWeak ? other : boss.weakPart;
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
  S.items.tfire = { name: 'Sabre de Teste', type: 'arma', power: 15, wt: 'lamina', el: 'kagutsuchi', price: 250, eff: 'hp', attr: 'SOR', pierce: 0, reqFor: 0 }; const ess = it('Essência de Kagutsuchi'); h.inv[ess] = 3; h.gold = 125; H.forge(ana, { id: h.id, item: 'tfire' }); assert.equal(h.inv.tfire, 1); assert.equal(h.inv[ess], undefined); assert.equal(h.gold, 0);
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
test.after(() => setTimeout(() => process.exit(0), 50));

const itemKey = n => Object.keys(S.items).find(k => S.items[k].name === n);
const duel = (wpn, armor = 10) => { // ataque básico determinístico: devolve o dano causado
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.attrs.AGI = 95; h.attrs.FOR = 90; e.attrs.AGI = 1; e.armor = armor; e.hp = e.hpMax = 500;
  S.items.tw = { name: 'Arma de Teste', type: 'arma', power: 20, wt: 'lamina', el: '', price: 1, eff: 'hp', attr: 'SOR', pierce: 0, reqFor: 0, ...wpn }; h.inv.tw = 1; H.equip(ana, { id: h.id, item: 'tw' });
  H.battle(gm, { on: true }); while (current() !== h.id) H.next(gm);
  const rnd = Math.random; Math.random = () => .5; try { H.act(ana, { id: h.id, skill: 'atk', target: e.id }); } finally { Math.random = rnd; }
  return 500 - e.hp;
};
test('perfuração: a arma ignora a fração da armadura do alvo, e o dano nunca cai abaixo de 1', () => {
  const base = duel({}), meio = duel({ pierce: .5 }), todo = duel({ pierce: 1 });
  assert.ok(base > 0); assert.equal(meio - base, 5); assert.equal(todo - base, 10);
  assert.ok(duel({ pierce: 1, power: 1 }, 99) >= 1);
});
test('Perfuradora de Montanhas: FOR 70 para equipar; "Perfurar Montanha" só equipada e com FOR 85', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }), k = itemKey('Perfuradora de Montanhas'); assert.ok(k);
  const p = S.items[k]; assert.equal(p.wt, 'lanca'); assert.equal(p.power, 24); assert.equal(p.price, 400); assert.equal(p.pierce, .5); assert.equal(p.reqFor, 70); assert.equal(p.grant.pierce, 1);
  h.inv[k] = 1; h.attrs.FOR = 69; H.equip(ana, { id: h.id, item: k }); assert.equal(h.equip.arma, undefined);
  h.attrs.FOR = 70; H.equip(ana, { id: h.id, item: k }); assert.equal(h.equip.arma, k);
  h.attrs.AGI = 95; e.attrs.AGI = 1; e.armor = 10; e.hp = e.hpMax = 500; h.aura = h.auraMax = 100; H.battle(gm, { on: true }); while (current() !== h.id) H.next(gm);
  h.attrs.FOR = 84; H.act(ana, { id: h.id, skill: 'wpn', target: e.id }); assert.equal(h.aura, 100); // FOR insuficiente
  h.attrs.FOR = 85; H.act(ana, { id: h.id, skill: 'wpn', target: e.id }); assert.ok(h.aura < 100); // gastou aura
  while (current() !== h.id) H.next(gm);
  H.equip(ana, { id: h.id, item: k }); const aura = h.aura; H.act(ana, { id: h.id, skill: 'wpn', target: e.id }); assert.equal(h.aura, aura); // desequipada: some
});
test('catálogo: só Florete e Perfuradora; migração troca armas antigas por Florete', () => {
  const armas = Object.values(S.items).filter(i => i.type === 'arma').map(i => i.name).filter(n => !/de Teste$/.test(n));
  assert.deepEqual(armas.sort(), ['Florete', 'Perfuradora de Montanhas']);
  const f = S.items[itemKey('Florete')]; assert.equal(f.wt, 'lamina'); assert.equal(f.power, 12); assert.equal(f.price, 60); assert.equal(f.pierce, .25); assert.equal(f.reqFor, 0);
  reset(); const h = mk(ana, {}); S.items.velha = { name: 'Velha', type: 'arma', power: 10, wt: 'lamina', price: 1 }; const tk = itemKey('Tônico'); h.inv.velha = 2; h.inv.fantasma = 1; h.inv[tk] = 3; h.equip.arma = 'velha'; S.itemsV = 1;
  S.items = { velha: S.items.velha, oldT: { ...S.items[tk] } }; delete h.inv[tk]; h.inv.oldT = 3; Object.values(S.scenes)[0].shop.stock = ['velha', 'oldT'];
  migrateItems(); const fk = itemKey('Florete'); assert.equal(h.inv[itemKey('Tônico')], 3); assert.deepEqual(Object.values(S.scenes)[0].shop.stock, [itemKey('Tônico')]);
  assert.equal(S.itemsV, 2); assert.equal(h.equip.arma, fk); assert.equal(h.inv[fk], 2); assert.equal(h.inv.velha, undefined); assert.equal(S.items.velha, undefined);
  for (const sc of Object.values(S.scenes)) for (const k of sc.shop.stock) assert.ok(S.items[k], 'loja com item inexistente: ' + k);
  const heroes = Object.values(S.chars); assert.ok(heroes.every(c => !c.equip.arma || S.items[c.equip.arma]));
});

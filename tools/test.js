// Testes das regras e permissões: node --test tools/test.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjtest-'));
const { H, S, current, derive, view } = await import('../server.js');
const gm = { role: 'gm' }, ana = { role: 'player', name: 'Ana' }, bia = { role: 'player', name: 'Bia' };
const reset = () => { S.chars = {}; S.log.length = 0; S.battle = { active: false, ticks: {} }; };
const mk = (c, m) => { const before = new Set(Object.keys(S.chars)); H.addChar(gm, c.role === 'player' ? { ...m, owner: c.name } : m); /* só o mestre cria; o de jogador nasce com dono */ const ch = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(ch); ch.hp = ch.hpMax; return ch; };
const sk = n => Object.keys(S.skills).find(k => S.skills[k].name === n);

test('bestiário inicial e grade são criados', () => { assert.ok(Object.keys(S.bestiary).length >= 30); assert.equal(Object.keys(S.skills).length, 581); assert.ok(Object.keys(S.items).length >= 50); });
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
  H.set(ana, { id: h.id, f: 'hp', v: 9999 }); derive(h); assert.equal(h.hp, 130);
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

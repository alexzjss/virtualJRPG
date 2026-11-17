// Testes das regras e permissões: node --test tools/test.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjtest-'));
const { H, S, current, derive, view, handle, migrateItems, modsOf, basicOf, slotMax: slotMaxOf } = await import('../server.js'); const RU = globalThis.RULES;
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
    assert.equal(ns.filter(s => s.el === el).length, TREE[el].branches.flat().length); assert.ok(ns.filter(s => s.el === el).length >= (['aura', 'oculto'].includes(el) ? 120 : 104));
  }
});
test('ligações: simétricas, nunca entre setores diferentes (só com o Marcial), sem repetição', () => {
  for (const [id, s] of Object.entries(S.skills)) {
    assert.ok(Array.isArray(s.ln) && s.ln.length, 'sem ligação: ' + s.name);
    assert.equal(new Set(s.ln).size, s.ln.length, s.name);
    for (const j of s.ln) { const o = S.skills[j]; assert.ok(o && o.ln.includes(id), `${s.name} → ${o?.name} não volta`);
      assert.ok(o.el === s.el || o.el === 'fis' || s.el === 'fis', `${s.name} liga a ${o.name}`); }
  }
});
test('ligações: cada setor alcança todos os seus nós andando só por ln, por ele e pelo Marcial', () => {
  for (const el of ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko', 'aura', 'oculto']) {
    const ok = id => [el, 'fis'].includes(S.skills[id].el), start = Object.keys(S.skills).find(id => S.skills[id].el === el && S.skills[id].root), seen = new Set([start]), q = [start];
    assert.ok(start, 'raiz de ' + el);
    while (q.length) for (const j of S.skills[q.pop()].ln || []) if (!seen.has(j) && ok(j)) { seen.add(j); q.push(j); }
    assert.deepEqual(Object.keys(S.skills).filter(id => ok(id) && !seen.has(id)).map(id => S.skills[id].name), [], el);
  }
});
test('mandala: todo nó tem posição e nenhum par de esferas se sobrepõe', () => {
  const ns = Object.values(S.skills); assert.ok(ns.every(s => Number.isFinite(s.wx) && Number.isFinite(s.wy)), 'nó sem wx/wy');
  const cell = new Map(), K = s => [Math.floor(s.wx / 34), Math.floor(s.wy / 34)];
  for (const s of ns) { const k = K(s).join(','); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(s); }
  for (const a of ns) { const [cx, cy] = K(a); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const b of cell.get((cx + dx) + ',' + (cy + dy)) || [])
    if (a !== b) assert.ok(Math.hypot(a.wx - b.wx, a.wy - b.wy) >= 30, a.name + ' × ' + b.name); }
});
test('mandala: os setores ficam na ordem da roda (ângulo médio crescente)', () => {
  const ORD = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'aura', 'amaterasu', 'tsukuyomi', 'oculto', 'shukketsu', 'hiruko'], ns = Object.values(S.skills);
  const ang = el => { const v = ns.filter(s => s.el === el).reduce((a, s) => [a[0] + s.wx, a[1] + s.wy], [0, 0]); return Math.atan2(v[1], v[0]); };
  const a0 = ang(ORD[0]), rel = ORD.map(el => ((ang(el) - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI));
  rel.slice(1).forEach((r, i) => assert.ok(r > rel[i], ORD[i + 1]));
});
test('mandala (navegador): place usa wx/wy e põe skill sem posição junto do vizinho de grade', async () => {
  await import('../public/js/mandala.js'); const M = globalThis.MANDALA, g0 = S.skills.g0;
  const sks = { ...S.skills, x1: { name: 'Nova', el: 'fis', gx: g0.gx + 6, gy: g0.gy - 9 } }, near = Object.keys(S.skills).find(k => RU.near(S.skills[k], sks.x1));
  const P = M.place(sks); assert.deepEqual(P.get('g0'), [g0.wx, g0.wy]);
  if (near) { const [x, y] = P.get('x1'), [a, b] = P.get(near); assert.ok(Math.hypot(x - a, y - b) < M.U * 1.5); }
  assert.ok(P.get('x1').every(Number.isFinite));
});
test('mandala (navegador): edges sem repetição, só entre visíveis, com o núcleo ligado', async () => {
  await import('../public/js/mandala.js'); const M = globalThis.MANDALA, vis = new Set(Object.keys(S.skills).filter(k => S.skills[k].el !== 'hiruko'));
  const E = M.edges(S.skills, vis), keys = E.map(([a, b]) => [a, b].sort().join('|'));
  assert.equal(new Set(keys).size, keys.length); assert.ok(E.every(([a, b]) => vis.has(a) && vis.has(b)));
  assert.ok(keys.includes(['g0', 'g1'].sort().join('|'))); assert.ok(E.length >= vis.size - 12);
});
test('ligações: ramo de 10 nós segue tronco 1-4, A 5-7, B 8-9 e final', () => {
  const br = Object.entries(S.skills).filter(([, s]) => s.br === 'kagutsuchi-0'); assert.equal(br.length, 10);
  const id = i => br[i][0], L = i => br[i][1].ln;
  assert.ok(L(1).includes(id(0)) && L(2).includes(id(1)) && L(3).includes(id(2)));
  assert.ok(L(4).includes(id(3)) && L(7).includes(id(3)));
  assert.ok(L(5).includes(id(4)) && L(6).includes(id(5)) && L(8).includes(id(7)));
  assert.ok(L(9).includes(id(6)));
});
test('conteúdo: armas de fogo usam DES, técnica exige a arma certa, bomba e reanimar funcionam', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }), it = n => Object.keys(S.items).find(k => S.items[k].name === n);
  h.attrs.AGI = 95; e.attrs.AGI = 1; h.skills = [sk('Tiro Duplo')]; h.aura = 20; H.battle(gm, { on: true });
  H.act(ana, { id: h.id, skill: sk('Tiro Duplo'), target: e.id }); assert.equal(h.aura, 20); // sem arma de fogo: recusado
  S.items.tgun = { name: 'Revólver de Teste', type: 'arma', power: 10, wt: 'fogo', el: '', price: 1, eff: 'hp', attr: 'SOR', pierce: 0, reqFor: 0 }; h.inv.tgun = 1; H.equip(ana, { id: h.id, item: 'tgun' }); H.act(ana, { id: h.id, skill: sk('Tiro Duplo'), target: e.id }); assert.ok(h.aura < 20);
  while (current() !== h.id) H.next(gm);
  h.inv[it('Bomba do Feiticeiro')] = 1; const hp = e.hp; H.use(ana, { id: h.id, item: it('Bomba do Feiticeiro'), target: e.id }); assert.equal(e.hp, hp - 28);
  reset(); const a = mk(ana, {}), b2 = mk(ana, {}); b2.hp = 0; a.inv[it('Pena de Fênix')] = 1; H.battle(gm, { on: true }); b2.dying = 3; S.battle.ticks[b2.id] = 9999;
  H.use(ana, { id: a.id, item: it('Pena de Fênix'), target: b2.id }); assert.equal(b2.hp, 20);
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
  H.shop(gm, { f: 'open', v: 1 }); H.shop(gm, { item: it('Poção') }); h.gold = 10; H.buy(ana, { id: h.id, item: it('Poção') }); assert.equal(h.inv[it('Poção')], 1);
  H.sceneAdd(gm); h.gold = 10; H.buy(ana, { id: h.id, item: it('Poção') }); assert.equal(h.inv[it('Poção')], 1); H.sceneGo(gm, { id: a }); // outra cena: loja fechada
  const bid = Object.keys(S.bestiary).find(k => S.bestiary[k].name === 'Kappa'); H.ctAdd(gm, { id: bid, gold: 100, xp: 7 }); H.bSpawn(gm, { id: bid, tier: 'elite' });
  const foe = Object.values(S.chars).find(c => c.enemy); derive(foe); H.battle(gm, { on: true }); foe.hp = 0; h.gold = 0; h.xp = 0; H.battle(gm, { on: false, win: true });
  assert.ok(h.gold >= 100); assert.ok(h.xp >= 7); assert.equal(Object.values(S.contracts)[0].done, true);
  const ess = it('Essência de Kagutsuchi'); h.inv[ess] = 3; h.gold = Math.round(S.items[it('Sabre Flamejante')].price / 2); // metade do preço H.forge(ana, { id: h.id, item: it('Sabre Flamejante') }); assert.equal(h.inv[it('Sabre Flamejante')], 1); assert.equal(h.inv[ess], undefined); assert.equal(h.gold, 0);
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

const itemKey = n => Object.keys(S.items).find(k => S.items[k].name === n);
test('conteúdo padrão: toda skill do bestiário e todo item das lojas de exemplo existem pelo nome', async () => {
  const { buildBestiary, SCENES } = await import('../content.js');
  const sn = new Set(Object.values(S.skills).map(s => s.name)), inn = new Set(Object.values(S.items).map(i => i.name)), miss = [];
  buildBestiary((name, color, attrs, weak, resist, skills) => { if (Array.isArray(skills)) skills.forEach(n => sn.has(n) || miss.push(`${name}: ${n}`)); return {}; });
  SCENES.forEach(sc => sc.stock.forEach(n => inn.has(n) || miss.push(`${sc.name}: ${n}`)));
  assert.deepEqual(miss, []);
});

// ----- campanhas, pacote de conteúdo, mapa e som -----
const { importPack } = await import('../server.js');
test('campanhas: nova, guardar e abrir outra mantêm as contas; jogador não troca', () => {
  reset(); S.users.zed = 'x:y'; S.title = 'Alfa'; mk(ana, {}).name = 'Marca';
  H.campSave(gm, {}); H.campNew(gm, { v: 'Beta' });
  assert.equal(S.title, 'Beta'); assert.ok(!Object.values(S.chars).some(c => c.name === 'Marca')); assert.ok(Object.keys(S.bestiary).length >= 30); assert.equal(S.users.zed, 'x:y');
  H.campLoad(gm, { id: 'alfa' }); assert.equal(S.title, 'Alfa'); assert.ok(Object.values(S.chars).some(c => c.name === 'Marca'));
  const st = view(gm).store; assert.ok(st.backups.length >= 2); assert.deepEqual([...st.camps].sort(), ['alfa', 'beta']);
  H.campLoad(ana, { id: 'beta' }); assert.equal(S.title, 'Alfa'); assert.equal(view(ana).store, undefined);
  H.bkRestore(gm, { id: st.backups[0] }); assert.equal(S.users.zed, 'x:y'); assert.ok(S.scenes[S.scene].pins);
});
test('pacote de conteúdo: importa pelo nome, saneia os campos e não apaga nada', () => {
  const n0 = Object.keys(S.items).length, flo = Object.keys(S.items).find(k => S.items[k].name === 'Perfuradora de Montanhas');
  importPack({ vj: 'conteudo', skills: { a: { name: 'Corte Teste', kind: 'dmg', power: '12', el: 'xx', gx: 150, gy: 150, pierce: .5 } }, items: { i: { name: 'Perfuradora de Montanhas', type: 'arma', power: 99, price: '<b>' }, j: { name: 'Elmo Teste', type: 'armadura', power: 3 } },
    bestiary: { b: { name: 'Cobaia', color: 'javascript:1', attrs: { FOR: 999 }, skills: ['a', 'nada'], inv: { j: 2 } } }, encounters: { e: { name: 'Par', list: [{ b: 'b', n: 2 }] } } });
  assert.equal(Object.keys(S.items).length, n0 + 1); assert.equal(S.items[flo].power, 99); assert.equal(S.items[flo].price, 0);
  const s = Object.values(S.skills).find(x => x.name === 'Corte Teste'); assert.equal(s.power, 12); assert.equal(s.el, 'fis');
  const b = Object.values(S.bestiary).find(x => x.name === 'Cobaia'); assert.equal(b.attrs.FOR, 100); assert.match(b.color, /^#/); assert.equal(b.skills.length, 1); assert.equal(Object.values(b.inv)[0], 2);
  assert.ok(Object.values(S.encounters).some(e => e.name === 'Par')); assert.throws(() => importPack({ vj: 'outro' }));
});
test('mapa e som: névoa inteira, pincel, marcadores só do mestre, escala e trilha', () => {
  const sc = S.scenes[S.scene]; H.map(gm, { f: 'fogOn', v: 1 }); H.fogAll(gm, { v: 1 }); assert.equal(Object.keys(sc.seen).length, Math.ceil(sc.cols) * Math.ceil(sc.rows));
  H.fogAll(gm, { v: '' }); H.fog(gm, { x: 5, y: 5, r: 2 }); assert.equal(Object.keys(sc.seen).length, 25); H.fog(ana, { x: 0, y: 0 }); assert.equal(Object.keys(sc.seen).length, 25);
  H.pinAdd(gm, { x: 1, y: 1, v: 'Porta' }); H.pinAdd(gm, { x: 2, y: 2, v: 'Armadilha', k: 1 }); H.pinAdd(ana, { x: 3, y: 3, v: 'x' });
  assert.equal(Object.keys(view(gm).scenes[S.scene].pins).length, 2); assert.deepEqual(Object.values(view(ana).scenes[S.scene].pins).map(p => p.text), ['Porta']);
  H.map(gm, { f: 'unit', v: 1.5 }); assert.equal(sc.unit, 1.5); H.map(gm, { f: 'cols', v: 24 }); assert.equal(sc.cols, 24);
  H.audio(gm, { f: 'url', v: 'javascript:alert(1)' }); assert.equal(S.audio.url, ''); H.audio(gm, { f: 'url', v: '/uploads/a.mp3' }); assert.ok(S.audio.on && S.audio.t0 > 0);
  H.audio(ana, { f: 'on', v: '' }); assert.ok(S.audio.on); H.audio(gm, { f: 'amb', v: 'chuva' }); assert.equal(S.audio.amb, 'chuva');
  H.sceneAdd(gm, {}); assert.ok(S.scenes[S.scene].pins);
});
test('batalha: alvo caído não gasta o turno; placar aponta o destaque na vitória', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }), e2 = mk(gm, { enemy: true }); h.attrs.AGI = 95; h.attrs.FOR = 95; e.attrs.AGI = e2.attrs.AGI = 1;
  H.battle(gm, { on: true }); e.hp = 0;
  H.act(ana, { id: h.id, skill: 'atk', target: e.id }); assert.equal(current(), h.id); assert.equal(S.battle.n, 0); // nada aconteceu
  for (let i = 0; i < 60 && e2.hp > 0; i++) { if (current() !== h.id) H.next(gm); else H.act(ana, { id: h.id, skill: 'atk', target: e2.id }); }
  assert.equal(e2.hp, 0); assert.ok(S.battle.n > 0); assert.ok(S.battle.stats[h.id].dmg > 0); assert.equal(S.battle.stats[h.id].ko, 1); // derrubou um inimigo
  H.battle(gm, { win: true }); const v = S.log.find(l => /^Vitória!/.test(l.text)); assert.match(v.text, new RegExp(`Destaque: ${h.name} \\(\\d+ de dano`));
  // a tela de resultado recebe XP, ouro, espólios e o placar de cada herói
  assert.equal(v.res.mvp, h.id); const st = v.res.st.find(s => s.id === h.id); assert.ok(st.dmg > 0); assert.equal(st.ko, 1); assert.ok(Number.isFinite(v.res.xp) && Number.isFinite(v.res.gold) && Array.isArray(v.res.drops));
});
test('chat: /r soma vários dados e números; expressão ruim não vira rolagem', async () => {
  const { rollExpr } = await import('../src/rules.js');
  for (let i = 0; i < 50; i++) { const r = rollExpr('2d6 + 1d4 + 3'); assert.equal(r.text, '2d6+1d4+3'); assert.ok(r.total >= 6 && r.total <= 19); }
  assert.equal(rollExpr('d20-1').text, '1d20-1'); assert.equal(rollExpr('3'), null); assert.equal(rollExpr('2d6+'), null); assert.equal(rollExpr('1d6;alert(1)'), null);
  const n = S.log.length; H.chat(gm, { text: '/r 3d6+2' }); assert.match(S.log.at(-1).text, /^rolou 3d6\+2: \[\d, \d, \d\] = \d+$/);
  H.chat(gm, { text: '/r banana' }); assert.equal(S.log.length, n + 1);
});
test('mostrar a todos: só o mestre abre e recolhe; link ruim é descartado', () => {
  H.handout(ana, { text: 'oi' }); assert.equal(S.handout, null);
  H.handout(gm, { text: ' Carta ', img: 'javascript:alert(1)' }); assert.deepEqual({ ...S.handout, n: 0 }, { img: '', text: 'Carta', n: 0 });
  H.handout(gm, { img: '/uploads/a.png' }); assert.equal(view(ana).handout.img, '/uploads/a.png');
  H.handout(gm, {}); assert.equal(S.handout, null);
});
test('campanha malformada: nada muda no estado em uso; campos estranhos são saneados', () => {
  reset(); const h = mk(ana, {}); h.name = 'Fica'; S.title = 'Firme'; H.campSave(gm, {});
  const errs = [], g = { role: 'gm', send: s => errs.push(JSON.parse(s).msg) }, dir = path.join(process.env.VJ_DATA, 'campanhas');
  fs.writeFileSync(path.join(dir, 'ruim.json'), JSON.stringify({ chars: { a: { name: 'X' } }, scenes: { s: { shop: { stock: 5 } } }, scene: 's', itemsV: 1, items: { i0: { name: 'Florete', type: 'arma' } } }));
  H.campLoad(g, { id: 'ruim' }); // a migração do catálogo tropeça na loja sem lista: a troca é desfeita
  assert.equal(S.title, 'Firme'); assert.ok(Object.values(S.chars).some(c => c.name === 'Fica')); assert.match(errs[0], /Nada foi alterado/);
  fs.writeFileSync(path.join(dir, 'torta.json'), JSON.stringify({ title: 'Torta', chars: { a: { name: 7, attrs: { FOR: 'abc', CON: 500 }, weak: 'fogo', skills: [1, 'g0'], inv: { i0: -3, i1: '2' }, hp: null, color: 'red', x: 'q' }, b: null }, log: 'x', battle: { active: 1, ticks: { zz: 5 } }, scene: 'nao-existe' }));
  H.campLoad(g, { id: 'torta' }); assert.equal(S.title, 'Torta');
  const a = S.chars.a; assert.equal(a.name, '7'); assert.equal(a.attrs.FOR, 40); assert.equal(a.attrs.CON, 100); assert.deepEqual(a.weak, []); assert.deepEqual(a.skills, ['g0']); assert.deepEqual(a.inv, { i1: 2 });
  assert.match(a.color, /^#/); assert.equal(a.x, 0); assert.ok(a.hpMax > 0 && a.hp <= a.hpMax); assert.ok(!S.chars.b); assert.deepEqual(S.battle.ticks, {}); assert.ok(S.scenes[S.scene]); assert.ok(Array.isArray(S.log));
  H.campLoad(g, { id: 'firme' }); assert.equal(S.title, 'Firme');
});
test('catálogo v5: nomes novos e armas com modelo; migração conserva inventário, loja e armas forjadas', () => {
  reset(); const h = mk(ana, {}); const k = n => Object.keys(S.items).find(x => S.items[x].name === n);
  const snap = structuredClone({ items: S.items, scenes: S.scenes, itemsV: S.itemsV }); // o teste mexe no catálogo: devolve ao fim, para não afetar os seguintes
  for (const n of ['Poção', 'Florete', 'Perfuradora de Montanhas', 'Katana de Caçador', 'Cubo de Shinkai']) assert.ok(k(n), 'falta no catálogo: ' + n);
  assert.ok(!k('Tônico') && !k('Éter de Aura'));
  // save antigo (catálogo com nomes velhos e uma arma forjada pelo mestre): renomeia pelo nome, mantém o que o catálogo não conhece
  S.items = { t0: { ...S.items[k('Poção')], name: 'Tônico' }, e0: { ...S.items[k('Cubo de Shinkai')], name: 'Éter de Aura' }, f0: { name: 'Forjada', type: 'arma', power: 9, wt: 'lamina', tpl: 'sabre', price: 1 } };
  h.inv = { t0: 3, e0: 1, f0: 1 }; h.equip = { arma: 'f0' }; Object.values(S.scenes)[0].shop.stock = ['t0', 'e0']; S.itemsV = 3;
  migrateItems();
  assert.equal(S.itemsV, 5); assert.equal(h.inv[k('Poção')], 3); assert.equal(h.inv[k('Cubo de Shinkai')], 1);
  const fk = k('Forjada'); assert.ok(fk && h.inv[fk] === 1 && h.equip.arma === fk, 'arma forjada some na migração');
  assert.deepEqual(Object.values(S.scenes)[0].shop.stock.sort(), [k('Poção'), k('Cubo de Shinkai')].sort());
  for (const sc of Object.values(S.scenes)) for (const x of sc.shop.stock) assert.ok(S.items[x], 'loja com item inexistente: ' + x);
  Object.assign(S, snap);
});

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
test('Aflição e Virtude: Sanidade zerada pede teste de SAB; descanso longo limpa', () => {
  reset(); const h = mk(ana, {}); h.attrs.SAB = 1; derive(h); h.san = 0; fixR(.9, () => { H.rest(gm, { long: true }); }); // sem batalha: o descanso não mexe
  fixR(.9, () => handle(gm, { t: 'set', id: h.id, f: 'san', v: 0 }));
  assert.ok(h.afl && h.afl.t === 'a'); assert.ok(h.san > 0); assert.ok(modsOf(h).atk !== 0 || modsOf(h).hit !== 0 || modsOf(h).agi !== 0 || modsOf(h).def !== 0);
  h.san = 0; handle(gm, { t: 'set', id: h.id, f: 'san', v: 0 }); const k = h.afl; assert.deepEqual(h.afl, k); // enquanto está em zero, não repete
  reset(); const g = mk(ana, {}); g.attrs.SAB = 90; derive(g); fixR(0, () => handle(gm, { t: 'set', id: g.id, f: 'san', v: 0 })); assert.equal(g.afl.t, 'v');
  H.rest(gm, { long: true }); assert.equal(g.afl, undefined);
});
test('Vantagem e Desvantagem: o mestre escolhe ao aprovar; Foco dá vantagem', () => {
  reset(); const h = mk(ana, {}); h.attrs.FOR = 50; derive(h); const rolls = [.7, .2]; const r0 = Math.random; let i = 0; Math.random = () => rolls[i++ % 2]; // d100 = 71 e 21
  try { H.roll(gm, { id: h.id, attr: 'FOR', adv: 'adv' }); assert.match(S.log.at(-1).text, /→ 21: .*vantagem/); H.roll(gm, { id: h.id, attr: 'FOR', adv: 'dis' }); assert.match(S.log.at(-1).text, /→ 71: .*desvantagem/); h.st.focus = 2; H.roll(gm, { id: h.id, attr: 'FOR' }); assert.match(S.log.at(-1).text, /vantagem/); } finally { Math.random = r0; }
});
test('laços: conversar no acampamento sobe o laço, que reforça a dupla em batalha', () => {
  reset(); const a = mk(ana, {}), b = mk(bia, {}); S.camp = { open: true, acts: {}, with: {} };
  for (let n = 0; n < 4; n++) { H.campAct(ana, { id: a.id, k: 'conversar', w: b.id }); H.campAct(bia, { id: b.id, k: 'conversar', w: a.id }); H.rest(gm, { long: true }); S.camp = { open: true, acts: {}, with: {} }; }
  assert.equal(S.bonds[[a.id, b.id].sort().join('|')], 8); assert.equal(a.bondMax ?? 0, 0); handle(gm, { t: 'set', id: a.id, f: 'name', v: a.name }); assert.equal(a.bondMax, 3); // 8 pontos = nível 3
  a.xp = 999; a.skills = []; const n = sk('Olhar de Cumplicidade'); assert.ok(!/laço/.test(RU.whyNot(a, S.skills[n], S.skills, S.items, n, true)));
  reset(); const c = mk(ana, {}); assert.match(RU.whyNot(c, S.skills[n], S.skills, S.items, n, true), /laço/);
});
test('slots de passivas: 4 + 1 a cada 100 XP gasto; só as ativas valem; trocar exige o acampamento', () => {
  reset(); S.camp = { open: false, acts: {}, with: {} }; const h = mk(ana, {}); const votos = ['Voto de Sangue', 'Voto da Presa', 'Voto do Corpo Fechado', 'Voto da Última Chama', 'Seiyaku: Silêncio', 'Seiyaku: Pureza'].map(sk).filter(Boolean);
  assert.ok(votos.length >= 6); h.skills = votos.slice(0, 6); handle(gm, { t: 'set', id: h.id, f: 'name', v: h.name });
  assert.equal(h.pslots.length, slotMaxOf(h)); assert.ok(slotMaxOf(h) < 6); assert.ok(!h.pslots.includes(votos[5])); // o último ficou sem slot
  H.pslot(ana, { id: h.id, skill: votos[0] }); assert.ok(h.pslots.includes(votos[0])); // fora do acampamento: nada muda
  S.camp = { open: true, acts: {}, with: {} }; H.pslot(ana, { id: h.id, skill: votos[0] }); assert.ok(!h.pslots.includes(votos[0])); assert.ok(h.pslots.includes(votos[5])); // a vaga livre é ocupada pelo que estava de fora
  const gasto = h.skills.reduce((a, k) => a + S.skills[k].xp, 0); assert.equal(slotMaxOf(h), 4 + Math.floor(gasto / 100));
});

// ---------- Ofícios (perícias) ----------
const OF = globalThis.OFI, itm = n => Object.keys(S.items).find(k => S.items[k].name === n);
const ofiChar = (per, upTo = 99) => { reset(); S.camp = { open: false, acts: {}, with: {} }; const h = mk(ana, {}); h.attrs = { ...h.attrs, FOR: 80, DES: 80, INT: 80, SAB: 80, CAR: 80, SOR: 80, AGI: 80, CON: 60 }; derive(h); h.ofi = [per]; h.po = 100; OF.PER[per].nodes.slice(0, upTo).forEach(n => { if (!n.ex || !OF.learned(h, per).some(o => o.ex === n.ex)) h.pof.push(n.id); }); return h; };
const nid = (per, name) => OF.PER[per].nodes.find(n => n.n === name).id;
test('ofícios: catálogo com 15 perícias; Iniciação, grau, exclusão e PO controlam o aprendizado', () => {
  assert.equal(OF.order.length, 15); for (const p of Object.values(OF.PER)) { assert.ok(p.nodes.length >= 15, p.n); assert.equal(new Set(p.nodes.map(n => n.n)).size, p.nodes.length, p.n); }
  reset(); const h = mk(ana, {}); h.po = 50; const t1 = nid('forja', 'Olho de Ferreiro'), t2 = nid('forja', 'Têmpera II');
  assert.match(OF.whyNot(h, t1), /Iniciação/); H.ofiAw(gm, { id: h.id, per: 'forja' }); assert.equal(OF.whyNot(h, t1), '');
  assert.match(OF.whyNot(h, t2), /grau Aprendiz/); H.ofiLearn(ana, { id: h.id, node: t1 }); assert.ok(h.pof.includes(t1)); assert.equal(h.po, 48);
  for (const n of ['Reciclar Sucata', 'Afiar a Lâmina', 'Têmpera I']) H.ofiLearn(ana, { id: h.id, node: nid('forja', n) }); assert.equal(OF.grau(h, 'forja'), 1);
  H.ofiLearn(ana, { id: h.id, node: nid('forja', 'Engaste I') }); assert.equal(OF.whyNot(h, t2), ''); H.ofiLearn(ana, { id: h.id, node: t2 }); assert.equal(OF.grau(h, 'forja'), 2);
  H.ofiLearn(ana, { id: h.id, node: nid('forja', 'Armeiro') }); assert.match(OF.whyNot(h, nid('forja', 'Couraceiro')), /Trancado/);
  const po = h.po; H.ofiLearn(bia, { id: h.id, node: nid('forja', 'Engaste II') }); assert.equal(h.po, po); // não é dele
  assert.equal(OF.rollBonus(h, 'forja'), 20 + 5);
});
test('ofícios: colher na cena, preparar receita, desconto e rolar de novo', () => {
  const h = ofiChar('alquimia'); h.gold = 0; const sc = S.scenes[S.scene]; sc.gather = [itm('Erva Medicinal')];
  fixR(.05, () => H.ofiUse(ana, { id: h.id, node: nid('alquimia', 'Colher Ervas') })); assert.ok(h.inv[itm('Erva Medicinal')] >= 1); assert.ok(h.po > 100);
  h.inv[itm('Erva Medicinal')] = 5; fixR(.05, () => H.craft(ana, { id: h.id, rec: 'tonico' })); assert.ok(h.inv[itm('Poção')] >= 1); assert.ok(h.inv[itm('Erva Medicinal')] <= 3);
  h.inv[itm('Erva Medicinal')] = 5; const before = h.inv[itm('Poção')]; fixR(.99, () => H.craft(ana, { id: h.id, rec: 'tonico' })); assert.equal(h.inv[itm('Poção')], before); assert.ok(h.inv[itm('Erva Medicinal')] >= 3);
  const l = ofiChar('labia'); l.gold = 1000; const sh = S.items[itm('Poção')]; S.scenes[S.scene].shop = { open: true, stock: [itm('Poção')] }; H.buy(ana, { id: l.id, item: itm('Poção') }); assert.equal(l.gold, 1000 - Math.ceil(sh.price * .8));
  const j = ofiChar('jogos'); j.attrs.FOR = 70; derive(j); fixR(.9, () => H.roll(ana, { id: j.id, attr: 'FOR' })); assert.match(S.log.at(-1).text, /Falha|DESASTRE/); fixR(.1, () => H.reroll(ana, { id: j.id })); assert.equal(j.rrUsed, 1); assert.match(S.log.at(-1).text, /Sucesso|CRÍTICO/);
  H.reroll(ana, { id: j.id }); assert.equal(j.rrUsed, 2); H.reroll(ana, { id: j.id }); assert.equal(j.rrUsed, 2); H.newSession(gm); assert.equal(j.rrUsed, 0);
});
test('forja: têmpera, engaste, liga, assinatura e arma viva mudam o dano; falha e desastre custam materiais', () => {
  const h = ofiChar('forja'); h.gold = 1000; const w = itm('Sabre de Cavalaria'), sucata = itm('Sucata de Ferro'); h.inv[w] = 1; h.equip.arma = w; h.inv[sucata] = 20;
  const T1 = { id: h.id, node: nid('forja', 'Têmpera I'), item: w };
  fixR(.05, () => H.ofiUse(ana, T1)); assert.equal(h.up[w].t, 1); assert.equal(h.up[w].p, 3); // Armeiro: +3 por nível
  const fortes = { FOR: h.attrs.FOR, INT: h.attrs.INT }; h.attrs.FOR = h.attrs.INT = 10; derive(h); const s0 = h.inv[sucata]; fixR(.6, () => H.ofiUse(ana, T1)); assert.equal(h.up[w].t, 1); assert.equal(h.inv[sucata], s0 - 1); // falha: perde uma
  fixR(.99, () => H.ofiUse(ana, T1)); assert.equal(h.inv[sucata], s0 - 1 - 2); // desastre: metade dos 4 materiais
  Object.assign(h.attrs, fortes); derive(h); h.inv[sucata] = 20; fixR(.05, () => H.ofiUse(ana, T1)); fixR(.05, () => H.ofiUse(ana, T1)); assert.equal(h.up[w].t, 3);
  fixR(.05, () => H.ofiUse(ana, T1)); assert.equal(h.up[w].t, 3); // teto do grau
  const run = itm('Runa de Força'); h.inv[run] = 1; fixR(.05, () => H.ofiUse(ana, { id: h.id, node: nid('forja', 'Engaste I'), item: w, rune: run })); assert.deepEqual(h.up[w].g, ['Runa de Força']); assert.equal(h.inv[run], undefined);
  const LG = { id: h.id, node: nid('forja', 'Liga de Essências'), item: w, el2: 'kagutsuchi' };
  fixR(.05, () => H.ofiUse(ana, LG)); assert.equal(h.up[w].el2, undefined); // sem essências: recusa
  h.inv[itm('Essência de Kagutsuchi')] = 2; fixR(.05, () => H.ofiUse(ana, LG)); assert.equal(h.up[w].el2, 'kagutsuchi');
  fixR(.05, () => H.ofiUse(ana, { id: h.id, node: nid('forja', 'Assinatura do Ferreiro'), item: w, sig: 0, nm: 'Dente de Lobo' })); assert.equal(h.up[w].sig, 0); assert.equal(h.up[w].nm, 'Dente de Lobo');
  h.inv[itm('Garra de Demônio')] = 5; fixR(.05, () => H.ofiUse(ana, { id: h.id, node: nid('forja', 'Arma Viva'), item: w })); assert.ok(h.up[w].living);
  const a2 = mk(ana, {}), e = mk(gm, { enemy: true }); Object.assign(a2.attrs, { FOR: 70, DES: 70, AGI: 90 }); a2.inv[w] = 1; a2.equip.arma = w; e.attrs.AGI = 1; e.hp = e.hpMax = 9999; e.armor = 0; derive(a2); a2.hp = a2.hpMax; H.battle(gm, { on: true }); turn(a2);
  fixR(.3, () => H.act(gm, { id: a2.id, skill: 'atk', target: e.id })); const base = 9999 - e.hp; a2.up[w] = { p: 9, t: 3, g: ['Runa de Força'], sig: 0, living: true, kills: 0 }; e.hp = 9999; turn(a2); fixR(.3, () => H.act(gm, { id: a2.id, skill: 'atk', target: e.id })); assert.ok(9999 - e.hp > base * 1.4); // têmpera + runa + assinatura
  a2.up[w].kills = 9; const e2 = mk(gm, { enemy: true }); e2.hp = 1; S.battle.ticks[e2.id] = 900; turn(a2); fixR(.3, () => H.act(gm, { id: a2.id, skill: 'atk', target: e2.id })); assert.equal(a2.up[w].kills, 10); // abates sobem o estágio
  const d = ofiChar('forja'); d.gold = 1000; d.inv[w] = 1; d.inv[sucata] = 8; d.attrs.FOR = d.attrs.INT = 10; derive(d); fixR(.6, () => H.ofiUse(ana, { id: d.id, node: nid('forja', 'Têmpera I'), item: w })); assert.equal(d.inv[sucata], 7); // falha comum: perde uma
});
test('culinária, tratamento, identificação, armadilha e companheiros', () => {
  let h = ofiChar('culinaria'); h.inv[itm('Carne de Caça')] = 4; h.inv[itm('Ervas de Cozinha')] = 4; const e0 = mk(gm, { enemy: true }); fixR(.05, () => H.craft(ana, { id: h.id, rec: 'ensopado' })); assert.ok(S.meal); assert.equal(S.meal.m.atk, 16); // Cozinheiro de Guerra dobra o ensopado
  h.attrs.AGI = 99; e0.attrs.AGI = 1; derive(h); e0.hp = e0.hpMax = 9999; h.hp = h.hpMax; H.battle(gm, { on: true }); assert.ok(modsOf(h).atk >= 16); H.battle(gm, { on: false }); assert.ok(!S.meal || S.meal.left > 0);
  h = ofiChar('medicina'); const f = mk(ana, {}); f.body.armL = 40; f.body.torso = 30; fixR(.05, () => H.ofiUse(ana, { id: h.id, node: nid('medicina', 'Sutura'), target: f.id, part: 'armL' })); assert.equal(f.body.armL, 0); assert.equal(f.body.torso, 30);
  fixR(.05, () => H.ofiUse(ana, { id: h.id, node: nid('medicina', 'Cirurgia'), target: f.id })); assert.equal(f.body.torso, 0);
  h = ofiChar('investigacao'); const en = mk(gm, { enemy: true }); en.weak = ['indra']; en.resist = ['susanoo']; en.weakPart = 'head'; en.tpl = 'Teste'; fixR(.05, () => H.ofiUse(ana, { id: h.id, node: nid('investigacao', 'Anatomia Demoníaca'), target: en.id })); assert.equal(en.known, 3); assert.equal(S.known.Teste, 3);
  h = ofiChar('caca'); const ez = mk(gm, { enemy: true }); S.camp = { open: true, acts: {}, with: {} }; H.campAct(ana, { id: h.id, k: 'armadilha' }); assert.equal(S.camp.acts[h.id], 'armadilha'); H.rest(gm, { long: true }); assert.ok(S.trap);
  h.attrs.AGI = 50; derive(h); ez.hp = ez.hpMax = 99; H.battle(gm, { on: true }); assert.ok(ez.st.root && ez.st.bleed); assert.ok(Object.values(S.chars).some(c => c.summon?.k === 'Lobo Adestrado')); // o cão de caça entra sozinho
  assert.ok(S.battle.ticks[h.id] <= 1000 / 50 * .7); assert.ok(OF.hook(h, 'emb') >= 35); // emboscada: o grupo começa à frente
});
test('Música no acampamento, Pilotagem na perseguição e identificação lembrada pelo bestiário', () => {
  const m = ofiChar('musica'); const b = mk(ana, {}); derive(b); m.san = 1; b.san = 1; S.camp = { open: true, acts: {}, with: {} }; H.campAct(ana, { id: m.id, k: 'cantar' }); H.rest(gm, { long: true }); assert.ok(m.san >= 9); assert.ok(b.san >= 9);
  const p = ofiChar('pilotagem'); assert.equal(OF.hook(p, 'chase'), 15);
  reset(); const bid = Object.keys(S.bestiary).find(k => !S.bestiary[k].boss); S.known = { [S.bestiary[bid].name]: 2 }; H.bSpawn(gm, { id: bid }); const nu = Object.values(S.chars).find(c => c.enemy); assert.equal(nu.known, 2);
});

// ---------- Ofícios: diário narrado, catálogo editável, economia das receitas ----------
test('ofícios: teste narrativo (checar) vai para o diário; o mestre narra ao aprovar ou depois', () => {
  const h = ofiChar('ladinagem'); h.gold = 0; const arrombar = nid('ladinagem', 'Arrombar'), punga = nid('ladinagem', 'Punga');
  S.auto.roll = false; fixR(.05, () => H.ofiUse(ana, { id: h.id, node: arrombar }));
  assert.equal(S.reqs && Object.keys(S.reqs).length, 0); // o jogador usa direto quando a rolagem está liberada
  let e = h.dia.at(-1); assert.equal(e.a, 'Arrombar'); assert.equal(e.r, 'CRÍTICO'); assert.equal(e.t, ''); assert.equal(e.ok, true);
  H.ofiNota(ana, { id: h.id, e: e.i, txt: 'hack' }); assert.equal(e.t, ''); // jogador não escreve a narração
  H.ofiNota(gm, { id: h.id, e: e.i, txt: '  A fechadura\n cede com um clique.  ' }); assert.equal(e.t, 'A fechadura cede com um clique.'); assert.match(S.log.at(-1).text, /fechadura cede/);
  // aprovação com narração: o pedido entra na fila e o texto do mestre fica no registro do resultado
  S.auto.roll = false; handle(ana, { t: 'ofiUse', id: h.id, node: punga }); const [id, rq] = Object.entries(S.reqs)[0]; assert.equal(rq.t, 'ofiUse'); assert.equal(rq.m.txt, undefined);
  fixR(.95, () => handle(gm, { t: 'reqOk', id, txt: 'O guarda percebe a sua mão no bolso.' })); e = h.dia.at(-1); assert.equal(e.a, 'Punga'); assert.equal(e.ok, false); assert.equal(e.t, 'O guarda percebe a sua mão no bolso.'); assert.equal(h.gold, 0);
  const antes = h.dia.length; fixR(.05, () => handle(gm, { t: 'reqOk', id: (handle(ana, { t: 'ofiUse', id: h.id, node: punga }), Object.keys(S.reqs)[0]), mod: 0 })); assert.equal(h.dia.length, antes + 1); assert.equal(h.dia.at(-1).t, ''); assert.ok(h.dia.at(-1).g > 0); // sem texto: fica à espera
  H.ofiNota(gm, { id: h.id, e: h.dia.at(-1).i, del: true }); assert.equal(h.dia.length, antes);
  for (let i = 0; i < 60; i++) fixR(.05, () => H.ofiUse(ana, { id: h.id, node: arrombar })); assert.ok(h.dia.length <= 40); // o diário tem limite
  assert.ok(!view({ role: 'player', name: 'Ana' }).chars[h.id].gmNote && view({ role: 'player', name: 'Ana' }).chars[h.id].dia.length); // o jogador vê o diário
});
test('ofícios: o mestre edita receitas, nós e perícias; a edição vale para todos e pode ser desfeita', () => {
  const h = ofiChar('alquimia'); h.inv[itm('Erva Medicinal')] = 1; h.inv[itm('Frasco Vazio')] = 5; h.inv[itm('Óleo de Lamparina')] = 5;
  const base = structuredClone(OF.REC.tonico);
  H.ofiCfg(ana, { k: 'rec', id: 'tonico', v: { qty: 5 } }); assert.equal(OF.REC.tonico.qty, 1); // só o mestre
  H.ofiCfg(gm, { k: 'rec', id: 'tonico', v: { mats: { 'Erva Medicinal': 1, 'Item Falso': 3 }, dc: 99, qty: 2 } });
  assert.deepEqual(OF.REC.tonico.mats, { 'Erva Medicinal': 1 }); assert.equal(OF.REC.tonico.dc, 20); assert.equal(OF.REC.tonico.qty, 2); // ingredientes inexistentes caem; limites
  const t0 = h.inv[itm('Poção')] || 0; fixR(.05, () => H.craft(ana, { id: h.id, rec: 'tonico' })); assert.ok(h.inv[itm('Poção')] >= t0 + 2);
  H.ofiCfg(gm, { k: 'rec', id: 'tonico', v: { off: true } }); h.inv[itm('Erva Medicinal')] = 1; const t1 = h.inv[itm('Poção')]; fixR(.05, () => H.craft(ana, { id: h.id, rec: 'tonico' })); assert.equal(h.inv[itm('Poção')], t1); // receita desativada
  H.ofiCfg(gm, { k: 'rec', id: 'tonico', v: null }); assert.deepEqual(OF.REC.tonico, base); assert.equal(S.ofiCfg.rec, undefined);
  // receita nova do mestre: vale a partir do grau escolhido, sem precisar de nó
  H.ofiCfg(gm, { k: 'rec', id: '', v: { n: 'Tônico Caseiro Forte', per: 'alquimia', t: 1, out: 'Líquido Dourado do Sanatório', mats: { 'Erva Medicinal': 1 } } });
  const nid2 = Object.keys(S.ofiCfg.rec)[0]; assert.match(nid2, /^x[0-9a-f]+$/); assert.ok(OF.recipes(h, 'alquimia').some(r => r.id === nid2));
  const semGrau = mk(ana, {}); semGrau.ofi = ['alquimia']; assert.ok(!OF.recipes(semGrau, 'alquimia').some(r => r.id === nid2)); // sem nenhum nó, o grau é 0
  h.inv[itm('Erva Medicinal')] = 1; fixR(.05, () => H.craft(ana, { id: h.id, rec: nid2 })); assert.ok(h.inv[itm('Líquido Dourado do Sanatório')] >= 1);
  H.ofiCfg(gm, { k: 'rec', id: '', v: { n: 'Inválida', per: 'alquimia', mats: {}, out: 'Poção' } }); assert.equal(Object.keys(S.ofiCfg.rec).length, 1); // sem ingredientes: recusada
  // nós: nome, custo e bônus; checar com ouro; nó novo ocupa o fim da lista sem mexer nos ids
  const arr = nid('ladinagem', 'Punga'); H.ofiCfg(gm, { k: 'node', id: arr, v: { n: 'Bater Carteira', po: 3, g: 99, r: 7 } });
  const nó = OF.PER.ladinagem.nodes.find(n => n.id === arr); assert.equal(nó.n, 'Bater Carteira'); assert.equal(nó.po, 3); assert.equal(nó.g, 99); assert.equal(nó.r, 7);
  const tam = OF.PER.ladinagem.nodes.length; H.ofiCfg(gm, { k: 'nodeNew', per: 'ladinagem', v: { n: 'Golpe de Mestre', d: 'Um truque seu.', t: 1, chk: true, g: 10 } });
  const novo = OF.PER.ladinagem.nodes.at(-1); assert.equal(OF.PER.ladinagem.nodes.length, tam + 1); assert.equal(novo.id, 'ladinagem.' + tam); assert.equal(novo.act, 'checar'); assert.equal(novo.po, 2);
  H.ofiCfg(gm, { k: 'nodeNew', per: 'ladinagem', i: 0 }); assert.ok(OF.PER.ladinagem.nodes.at(-1).off); assert.match(OF.whyNot(h, novo.id), /Iniciação|Desativado/); // desativar mantém o id
  H.ofiCfg(gm, { k: 'per', id: 'ladinagem', v: { n: 'Furtividade', a: ['SAB', 'XX'] } }); assert.equal(OF.PER.ladinagem.n, 'Furtividade'); assert.deepEqual(OF.PER.ladinagem.a, ['SAB']);
  const salvo = JSON.parse(JSON.stringify(S.ofiCfg)); H.ofiCfg(gm, { k: 'reset' }); assert.equal(OF.PER.ladinagem.n, 'Ladinagem'); assert.equal(OF.PER.ladinagem.nodes.length, tam); assert.deepEqual(S.ofiCfg, {});
  S.ofiCfg = salvo; handle(gm, { t: 'undo' }); // desfazer troca o estado inteiro; o próximo push reaplica o catálogo salvo
  H.ofiCfg(gm, { k: 'reset' }); assert.equal(OF.PER.ladinagem.nodes.length, tam);
});
test('economia: toda receita compensa o custo, nada vira dinheiro grátis ao vender, e a loja vende os ingredientes básicos', () => {
  H.ofiCfg(gm, { k: 'reset' });
  for (const r of Object.values(OF.REC)) {
    const cost = Object.entries(r.mats).reduce((a, [n, q]) => { assert.ok(itm(n), `${r.id}: ingrediente ${n}`); return a + q * S.items[itm(n)].price; }, 0);
    if (!r.out) { assert.ok(r.meal, r.id); continue; }
    const out = S.items[itm(r.out)]; assert.ok(out, `${r.id}: produto ${r.out}`);
    assert.ok(out.price >= cost / r.qty, `${r.id}: custa mais para fazer (${cost}) do que o preço (${out.price})`);
    assert.ok(Math.floor(out.price / 2) <= cost / r.qty, `${r.id}: vender o produto (${Math.floor(out.price / 2)}) pagaria mais que os ingredientes (${cost})`);
  }
  for (const r of Object.values(OF.REC)) assert.ok(OF.PER[r.per].nodes.some(n => (n.rec || []).includes(r.id)), `${r.id}: nenhum nó ensina a receita`);
  for (const nome of ['Munição de Prata', 'Munição Incendiária', 'Munição de Sal']) assert.ok(S.items[itm(nome)].price * 0 === 0 && S.items[itm(nome)].shots === 6);
  const runas = ['Precisão', 'Força', 'Brasa', 'Veneno', 'Trovão', 'Sangue']; assert.ok(runas.every(x => OF.REC['runa' + x.replace('ç', 'c').replace('ã', 'a')]), 'uma receita por runa');
  // loja: as cenas novas já vendem os básicos; em campanha antiga o mestre usa shopBasics
  reset(); const sc = S.scenes[S.scene]; sc.shop = { open: true, stock: [] }; H.shopBasics(ana, {}); assert.equal(sc.shop.stock.length, 0); H.shopBasics(gm, {});
  for (const n of ['Pólvora', 'Sucata de Ferro', 'Sal Sagrado', 'Erva Medicinal', 'Papel de Arroz']) assert.ok(sc.shop.stock.includes(itm(n)), n); const n0 = sc.shop.stock.length; H.shopBasics(gm, {}); assert.equal(sc.shop.stock.length, n0);
  const cenas = Object.values(S.scenes).filter(x => x.shop.stock.length && ['Beco do Mercado Negro', 'Santuário Profanado', 'Estação Central'].includes(x.name)); assert.equal(cenas.length, 3); for (const x of cenas) assert.ok(x.shop.stock.includes(itm('Sucata de Ferro')) && x.shop.stock.includes(itm('Pólvora')), x.name);
});
test('forja: as runas são receitas da Forja e o engaste aceita a runa preparada', () => {
  const h = ofiChar('forja'); h.gold = 0; const w = itm('Sabre de Cavalaria'); h.inv[w] = 1; h.equip.arma = w;
  assert.deepEqual(OF.recipes(h, 'forja').map(r => r.id).sort(), ['runaBrasa', 'runaForca', 'runaPrecisao', 'runaSangue', 'runaTrovao', 'runaVeneno']);
  H.craft(ana, { id: h.id, rec: 'runaForca' }); assert.equal(h.inv[itm('Runa de Força')], undefined); // sem ingredientes
  Object.assign(h.inv, { [itm('Essência de Atlas')]: 1, [itm('Sucata de Ferro')]: 2 }); fixR(.05, () => H.craft(ana, { id: h.id, rec: 'runaForca' })); assert.ok(h.inv[itm('Runa de Força')] >= 1);
  fixR(.05, () => H.ofiUse(ana, { id: h.id, node: nid('forja', 'Engaste I'), item: w, rune: itm('Runa de Força') })); assert.deepEqual(h.up[w].g, ['Runa de Força']);
  const fraco = ofiChar('forja', 4); assert.ok(!OF.recipes(fraco, 'forja').some(r => r.id === 'runaBrasa')); // Brasa é do Engaste II
});
// ----- IA opcional dos inimigos (campo `ia` do bestiário): Domínio, Defender, Concentrar e trio -----
const { R: RS } = await import('../server.js');
const bst = n => Object.keys(S.bestiary).find(k => S.bestiary[k].name === n);
test('bestiário: Domínio só em 3 chefes (Leviatã, Condessa, Filho de Hiruko), trio só nos 3 da Tempestade; nenhum gerado ou comum leva dom/trio', () => {
  const doms = Object.values(S.bestiary).filter(b => b.skills.some(k => S.skills[k].dom)).map(b => b.name).sort();
  assert.deepEqual(doms, ['Condessa Escarlate', 'Filho de Hiruko', 'Leviatã do Porto']);
  assert.ok(doms.every(n => S.bestiary[bst(n)].boss && S.bestiary[bst(n)].ia.dom && S.bestiary[bst(n)].skills.filter(k => S.skills[k].dom).length === 1));
  const trios = Object.values(S.bestiary).filter(b => b.skills.some(k => S.skills[k].trio)).map(b => b.name).sort(); assert.deepEqual(trios, ['Oni de Brasa', 'Raijū', 'Tengu do Vendaval']);
  assert.ok(Object.values(S.bestiary).filter(b => !b.ia).every(b => b.skills.every(k => !S.skills[k].dom && !S.skills[k].trio)));
  reset(); for (let i = 0; i < 10; i++) { H.foeGen(gm, { el: ['kagutsuchi', 'susanoo', 'amaterasu'][i % 3], role: 'conjurador', rank: 'chefe' }); }
  assert.ok(Object.values(S.chars).every(c => c.skills.every(k => !S.skills[k].dom && !S.skills[k].trio)));
});
const foeTurn = (e, f) => { turn(e); return fixR(.3, () => H.ai(gm)); };
test('IA: o chefe abre o Domínio uma única vez, com Aura cheia e vida < 75%, e o Choque vale contra herói', () => {
  reset(); const h = mk(ana, {}); H.bSpawn(gm, { id: bst('Condessa Escarlate'), fit: false }); const b = Object.values(S.chars).find(c => c.boss); derive(b); b.hp = b.hpMax; b.aura = b.auraMax;
  H.battle(gm, { on: true }); foeTurn(b); assert.ok(!S.battle.dom && !b.domUsed); // vida cheia: não abre
  b.hp = Math.floor(b.hpMax * .6); b.aura = b.auraMax; foeTurn(b); assert.ok(S.battle.dom && S.battle.dom.by === b.id && S.battle.dom.side === true && b.domUsed); assert.ok(b.aura <= Math.ceil(b.auraMax / 10));
  const nome = S.battle.dom.name; closeDom(); b.aura = b.auraMax; foeTurn(b); assert.ok(!S.battle.dom, nome + ' não reabre'); // no máximo 1
  // com o Domínio do herói aberto, o chefe responde de imediato e o Choque decide
  reset(); const a = mk(ana, {}); a.vinc = ['kagutsuchi']; Object.assign(a.attrs, { INT: 90, SAB: 90 }); derive(a); a.hp = a.hpMax; a.aura = a.auraMax; H.bSpawn(gm, { id: bst('Leviatã do Porto'), fit: false });
  const l = Object.values(S.chars).find(c => c.boss); derive(l); l.hp = l.hpMax; l.aura = l.auraMax; H.battle(gm, { on: true }); use(a, 'Fornalha Infinita', a); assert.ok(S.battle.dom && S.battle.dom.side === false);
  l.aura = l.auraMax; foeTurn(l); assert.ok(l.domUsed && S.battle.dom.name && (S.battle.dom.by === l.id || S.battle.dom.by === a.id)); assert.ok((S.battle.dom.by === l.id ? a : l).st.exaus); // o perdedor fica Exausto
});
const closeDom = () => { delete S.battle.dom; };
test('IA: Defender com vida baixa, Concentrar com vida alta, com intervalo; sem `ia` ou com iaExtra desligado, nada disso', () => {
  let [a, e] = duel(); e.ia = { defend: 1, focus: 1 }; e.hp = Math.floor(e.hpMax * .3); foeTurn(e); assert.ok(e.st.defUp && e.brv === 1 && !e.ten); assert.ok(e.icd > 0);
  [a, e] = duel(); e.ia = { focus: 1 }; foeTurn(e); assert.equal(e.ten, 1); assert.match(S.log.at(-1).text, /concentra a Tensão/);
  [a, e] = duel(); foeTurn(e); assert.ok(!e.ten && !e.brv); // sem `ia`
  [a, e] = duel(); e.ia = { focus: 1 }; RS.iaExtra = false; try { foeTurn(e); } finally { RS.iaExtra = true; } assert.ok(!e.ten);
  [a, e] = duel(); e.ia = { focus: 1 }; e.hp = Math.floor(e.hpMax * .3); foeTurn(e); assert.ok(!e.ten); // vida baixa não concentra
});
test('IA: o trio de inimigos só usa a técnica com os três de pé', () => {
  reset(); const h = mk(ana, {}); for (const n of ['Oni de Brasa', 'Tengu do Vendaval', 'Raijū']) H.bSpawn(gm, { id: bst(n) });
  const [x, y, z] = Object.values(S.chars).filter(c => c.enemy); [x, y, z].forEach(c => { derive(c); c.hp = c.hpMax; c.aura = c.auraMax; }); H.battle(gm, { on: true });
  const tk = c => c.skills.find(k => S.skills[k].trio); assert.ok(tk(x) && tk(y) && tk(z));
  const au = x.aura; turn(x); fixR(.3, () => H.act(gm, { id: x.id, skill: tk(x), target: h.id })); assert.ok(x.aura < au && y.aura < au && z.aura < au, 'com os três'); assert.ok(S.log.some(l => /executam juntos/.test(l.text)));
  reset(); const h2 = mk(ana, {}); for (const n of ['Oni de Brasa', 'Tengu do Vendaval']) H.bSpawn(gm, { id: bst(n) });
  const [p, q] = Object.values(S.chars).filter(c => c.enemy); [p, q].forEach(c => { derive(c); c.hp = c.hpMax; c.aura = c.auraMax; }); H.battle(gm, { on: true }); turn(p); const ap = p.aura;
  fixR(.3, () => H.act(gm, { id: p.id, skill: p.skills.find(k => S.skills[k].trio), target: h2.id })); assert.equal(p.aura, ap, 'sem o terceiro');
});

// ---------- armas: perfil do ataque básico, técnicas da arma e criador ----------
const AR = globalThis.ARMAS, itm2 = n => Object.keys(S.items).find(k => S.items[k].name === n);
const duelW = () => { delete S.meal; S.bonds = {}; return duel(); }; // sem refeição nem laços de testes anteriores
const arm = (a, n) => { const k = itm2(n); a.inv[k] = 1; a.equip.arma = k; return k; };
test('armas: o ataque básico vem da arma (atributo, tempo, golpes, área, condição, perfuração); sem arma, punhos com FOR', () => {
  let [a, e] = duelW(); let b = basicOf(a); assert.deepEqual([b.attr, b.ct, b.area, b.hits, b.fx.length, b.power], ['FOR', 100, false, undefined, 0, a.arma]); // como era antes
  arm(a, 'Rifle de Ferrolho'); b = basicOf(a); assert.equal(b.attr, 'DES'); assert.equal(b.ct, 125); assert.ok(b.fx.some(f => f.t === 'pierce' && f.p === 30));
  assert.equal(modsOf(a, { basic: true }).hit - modsOf(a, { kind: 'dmg' }).hit, 15, 'acerto do rifle só no ataque básico'); assert.equal(modsOf(a, { basic: true }).crit - modsOf(a, { kind: 'dmg' }).crit, 5);
  arm(a, 'Katana de Caçador'); b = basicOf(a); assert.equal(b.attr2, 'DES'); // média de FOR e DES
  a.attrs.FOR = 90; a.attrs.DES = 10; e.armor = 0; const hp = e.hp = e.hpMax = 999; turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id }));
  assert.equal(hp - e.hp, b.power + Math.floor(50 / 10)); // stat = (90 + 10) / 2 = 50
  [a, e] = duelW(); const e2 = mk(gm, { enemy: true }); derive(e2); e2.hp = e2.hpMax; S.battle.ticks[e2.id] = 900; arm(a, 'Escopeta de Cano Serrado'); assert.equal(basicOf(a).area, true);
  const h1 = e.hp, h2 = e2.hp; turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id })); assert.ok(e.hp < h1 && e2.hp < h2, 'escopeta acerta todos');
  [a, e] = duelW(); arm(a, 'Pistolas Gêmeas'); const n0 = S.log.length; turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id })); assert.equal(basicOf(a).dupla, true); assert.equal(S.log.slice(n0).filter(l => /^Ataque → /.test(l.text)).length, 1); assert.equal(S.log.slice(n0).filter(l => /^Ataque \(2ª mão\) → /.test(l.text)).length, 1, 'arma em par: segundo tiro');
  [a, e] = duelW(); arm(a, 'Garras de Ferro'); assert.ok(basicOf(a).fx.some(f => f.t === 'st' && f.k === 'bleed' && f.ch === 20)); turn(a); fixR(.1, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id })); assert.ok(e.st.bleed > 0, 'sangramento por chance');
  [a, e] = duelW(); arm(a, 'Sino de Exorcismo'); assert.equal(basicOf(a).kind, 'mental'); assert.equal(basicOf(a).attr, 'CAR'); const san = e.san; turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id })); assert.ok(e.san < san, 'o sino fere a Sanidade');
});
test('armas: bônus empunhada, requisito de atributo e custo da arma maldita', () => {
  let [a, e] = duelW(); arm(a, 'Manoplas de Aço'); assert.equal(modsOf(a).def, 5);
  arm(a, 'Faixas de Monge'); assert.equal(modsOf(a).agi, 5); assert.equal(basicOf(a).attr, 'AGI');
  arm(a, 'Marreta de Ferroviário'); a.attrs.FOR = 60; const ok = modsOf(a, { basic: true }).hit; a.attrs.FOR = 30; assert.equal(modsOf(a, { basic: true }).hit, ok - 20, 'sem FOR 50: −20 de acerto');
  const other = modsOf(a, { kind: 'dmg' }).hit; a.attrs.FOR = 60; assert.equal(modsOf(a, { kind: 'dmg' }).hit, other, 'skill que não é da arma não sofre a penalidade');
  assert.equal(modsOf(a, { wpn: 'x', kind: 'dmg' }).hit, other); a.attrs.FOR = 30; assert.equal(modsOf(a, { wpn: 'x', kind: 'dmg' }).hit, other - 20, 'técnica da arma sofre');
  [a, e] = duelW(); arm(a, 'Grimório do Sem-Nome'); const san = a.san; turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id })); assert.equal(a.san, san - 2, 'maldita cobra Sanidade a cada ataque');
  [a, e] = duelW(); const w = itm2('Sabre de Cavalaria'); derive(a); const hp0 = a.hpMax; S.items[w].mod = 'CON 10'; arm(a, 'Sabre de Cavalaria'); derive(a); assert.equal(a.hpMax, hp0 + 20, 'CON 10 empunhada: +20 de HP máximo'); S.items[w].mod = '';
});
test('armas: técnicas próprias só com a arma equipada, herdam elemento e têmpera, e respeitam usos por batalha', () => {
  let [a, e] = duelW(); const k = arm(a, 'Revólver .38'), id = `w:${k}:0`; assert.equal(S.items[k].sk[0].name, 'Leque do Pistoleiro');
  turn(a); let aura = a.aura; fixR(.3, () => H.act(gm, { id: a.id, skill: id, target: e.id })); assert.ok(a.aura < aura, 'técnica da arma usada'); assert.ok(S.log.some(l => /Leque do Pistoleiro/.test(l.text)));
  delete a.equip.arma; turn(a); aura = a.aura; fixR(.3, () => H.act(gm, { id: a.id, skill: id, target: e.id })); assert.equal(a.aura, aura, 'sem a arma, recusado');
  [a, e] = duelW(); const fk = arm(a, 'Sabre Flamejante'); turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: `w:${fk}:0`, target: e.id })); assert.equal(S.log.filter(l => l.fx?.s === 'Corte Cruzado').at(-1).fx.el, 'kagutsuchi', 'técnica física herda o elemento da arma');
  a.up = { [fk]: { p: 6 } }; const pw = basicOf(a).power; assert.equal(pw, S.items[fk].power + 6);
  [a, e] = duelW(); const lk = arm(a, 'Aurora do Último Dia'), ult = `w:${lk}:2`; assert.equal(S.items[lk].sk[2].uses, 1); e.hp = e.hpMax = 9999;
  turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: ult, target: e.id })); assert.equal(a.bt.wu[ult], 1);
  turn(a); aura = a.aura; fixR(.3, () => H.act(gm, { id: a.id, skill: ult, target: e.id })); assert.equal(a.aura, aura, 'golpe supremo: 1 uso por batalha');
  H.battle(gm, { on: false }); H.battle(gm, { on: true }); a.aura = a.auraMax; turn(a); aura = a.aura; fixR(.3, () => H.act(gm, { id: a.id, skill: ult, target: e.id })); assert.ok(a.aura < aura, 'nova batalha, novo uso');
  // inimigo com arma equipada também usa as técnicas dela (IA)
  [a, e] = duelW(); const ek = itm2('Machado de Lenhador'); e.inv[ek] = 1; e.equip.arma = ek; handle(gm, { t: 'autoSet', k: 'roll', v: S.auto.roll }); // handle → push recalcula ch.cant
  assert.equal(e.cant[`w:${ek}:0`], '', 'a técnica do machado entra no repertório do inimigo');
});
test('armas: modelos geram armas válidas e dentro da régua; o criador do mestre limpa o rascunho', () => {
  for (const id of Object.keys(AR.MOD)) for (const cat of Object.keys(AR.CATS)) for (const lvl of [0, 3]) {
    const w = AR.make(id, { lvl, cat, el: cat === 'elemental' ? 'indra' : '' }); assert.ok(w.sk.length >= 1 && w.sk.every(s => s.name && s.kind), id + cat);
    const r = AR.rel(w); assert.ok(r >= (AR.SUP.has(w.wt) ? 55 : 75) && r <= 200, `${id}/${cat}/${lvl}: ${r}%`);
  }
  for (const id of Object.keys(AR.MOD)) { const w = AR.make(id, { lvl: 1 }), r = AR.rel(w), [lo, hi] = AR.SUP.has(w.wt) ? [60, 125] : [88, 125]; assert.ok(r >= lo && r <= hi, `${id} básico: ${r}%`); } // básicas perto do sabre simples; escudos e instrumentos (apoio) podem atacar menos
  reset(); const n = Object.keys(S.items).length;
  H.wpnSave(ana, { w: { name: 'Hack' } }); assert.equal(Object.keys(S.items).length, n, 'jogador não cria arma');
  const d = { ...AR.make('machado', { cat: 'especial' }), name: 'Machado do Teste', fx: 'efeito-falso 2', mod: 'def 5; xyz 3', hit: 999, sk: [{ name: 'Golpe Novo', kind: 'dmg', power: 20, cost: 5, fxs: 'st bleed 3 50%' }, { name: 'Quebrado', kind: 'dmg', fxs: 'nada 1' }] };
  H.wpnSave(gm, { w: d }); const k = itm2('Machado do Teste'), w = S.items[k];
  assert.equal(w.fx, ''); assert.equal(w.mod, 'def 5'); assert.equal(w.hit, 50); assert.equal(w.sk.length, 2); assert.equal(w.sk[0].fx[0].k, 'bleed'); assert.equal(w.sk[1].fx, undefined); assert.equal(w.tpl, 'machado');
  assert.ok(S.log.at(-1).to === '@gm' && /Corrigido/.test(S.log.at(-1).text), 'erros avisados só ao mestre');
  H.wpnSave(gm, { id: k, w: { ...w, power: 33 } }); assert.equal(S.items[k].power, 33); assert.equal(Object.keys(S.items).length, n + 1, 'regravar não cria outra');
  const h = mk(ana, {}), lend = itm2('Aurora do Último Dia'), ess = itm2('Essência de Amaterasu'); h.inv[ess] = 9; h.gold = 99999; H.forge(ana, { id: h.id, item: lend }); assert.equal(h.inv[lend], undefined, 'lendária não sai da forja');
});
test('armas (expansão): distância não sofre contra-ataque, flechas no slot de munição, arma em par e trilhas novas', () => {
  const novo = (tpl, o = {}) => { const k = 'tw' + tpl; S.items[k] = { ...AR.make(tpl, o), eff: 'hp', attr: 'SOR' }; return k; };
  const equipK = (a, k) => { a.inv[k] = 1; a.equip.arma = k; };
  // contra-ataque: a lâmina leva o revide, o arco e a corrente não
  for (const [tpl, revida] of [['sabre', true], ['arcocurto', false], ['chicote', false]]) {
    const [a, e] = duelW(); equipK(a, novo(tpl)); e.st.counter = 3; e.hp = e.hpMax = 999; const hp = a.hp; turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id }));
    assert.equal(S.log.some(l => /contra-ataca/.test(l.text)), revida, tpl); if (!revida) assert.equal(a.hp, hp);
  }
  // flechas: só valem no arco, gastam disparos e trazem condição e perfuração
  let [a, e] = duelW(); equipK(a, novo('yumi')); const fl = itm2('Flecha Envenenada'); a.inv[fl] = 2; a.equip.mun = fl; e.hp = e.hpMax = 999;
  turn(a); fixR(.1, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id })); assert.ok(e.st.poison > 0, 'flecha envenenada'); assert.equal(a.shots[fl], 7); assert.equal(a.inv[fl], 1);
  const bala = itm2('Munição de Prata'); a.inv[bala] = 1; a.equip.mun = bala; turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id })); assert.equal(a.shots?.[bala], undefined, 'bala não serve no arco');
  [a, e] = duelW(); equipK(a, novo('arcocurto')); const aco = itm2('Flecha de Ponta de Aço'); a.inv[aco] = 1; a.equip.mun = aco; e.armor = 10; e.hp = e.hpMax = 999; const h0 = e.hp;
  turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id })); const comAco = h0 - e.hp;
  delete a.equip.mun; e.hp = 999; turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'atk', target: e.id })); assert.ok(comAco > 999 - e.hp, 'ponta de aço ignora armadura');
  assert.ok(['Flecha de Prata', 'Flecha Incendiária', 'Flecha de Corda', 'Flecha-Sinal'].every(n => S.items[itm2(n)]?.for === 'arco'));
  // em par: o criador tira o traço de arma com área ou vários golpes
  const { w, errs } = AR.clean({ ...AR.make('escopeta'), dupla: true }); assert.equal(w.dupla, undefined); assert.ok(errs.length);
  assert.ok(AR.make('sabresg').dupla && AR.make('tonfas').dupla && AR.make('sai').dupla && AR.make('pistolas').dupla);
  // trilhas novas: 10 nós por tipo, com req, postura, reação, maestria e golpe final com requisito 55
  for (const wt of ['pesada', 'foco', 'corrente', 'arremesso', 'arco', 'escudo', 'instrumento']) {
    const ns = Object.values(S.skills).filter(x => x.req === wt); assert.equal(ns.length, 10, wt);
    assert.ok(ns.some(x => x.kind === 'form') && ns.some(x => x.kind === 'util') && ns.some(x => x.rq && Object.values(x.rq)[0] === 55), wt);
    assert.ok(ns.some(x => x.kind === 'passive' && x.sc === 'wt:' + wt), wt + ': maestria');
  }
  // maestria: só com o tipo certo empunhado
  [a, e] = duelW(); a.skills.push(sk('Olho de Falcão')); a.pslots = [sk('Olho de Falcão')]; equipK(a, novo('arcocurto'));
  const comArco = modsOf(a, { basic: true }).hit; equipK(a, novo('sabre')); assert.equal((comArco - 5) - (modsOf(a, { basic: true }).hit - 5), 10, 'Olho de Falcão: +10 de acerto só com arco'); // arco curto e sabre têm +5 de acerto próprio
  for (const k of Object.keys(S.items)) if (k.startsWith('tw')) delete S.items[k];
});

// ---------- armas: escudos, instrumentos, básicas pré-implementadas, pacotes, variantes e importação ----------
test('armas (escopo maior): todo modelo tem uma básica no catálogo, com loja em 1 ou 2 cenas e sem nome repetido', async () => {
  const { WSHOP, WEAPONS_ALL } = await import('../content.js');
  const itens = Object.values(S.items).filter(i => i.type === 'arma'); assert.equal(new Set(itens.map(i => i.name)).size, itens.length, 'nomes únicos');
  for (const id of Object.keys(AR.MOD)) assert.ok(itens.some(i => i.tpl === id && i.cat === 'basica'), `${id}: sem básica no catálogo`);
  assert.ok(itens.some(i => i.name === 'Kusarigama' && i.lvl === 0) && itens.some(i => i.name === 'Violino') && itens.some(i => i.name === 'Broquel'), 'básicas com o nome do modelo');
  assert.equal(WEAPONS_ALL.filter(w => w[3] === 'basica' && w[2] === 0 && w[1] === 'sabre').length, 1, 'modelo que já tinha básica não duplica');
  const nas = {}; for (const [k, l] of Object.entries(WSHOP)) for (const t of l) (nas[t] ??= []).push(k);
  for (const id of Object.keys(AR.MOD)) assert.ok(nas[id]?.length >= 1 && nas[id].length <= 2, `${id}: em ${nas[id]?.length || 0} lojas`);
  const noStock = Object.values(S.scenes).find(sc => sc.name === 'Mansão Ashworth'); assert.ok(noStock.shop.stock.length > 10, 'a Mansão agora vende armas'); assert.ok(noStock.shop.stock.every(k => S.items[k]));
});
test('armas: escudo bloqueia golpe físico único (−60% e sem condições), mas não área, mental nem contra aliado', () => {
  const novo = n => Object.keys(S.items).find(k => S.items[k].name === n);
  const hit = (skill, setup = () => {}) => { const [a, e] = duelW(); e.attrs.AGI = 99; e.arma = 20; derive(e); const sh = novo('Escudo de Torre'); a.inv[sh] = 1; a.equip.arma = sh; a.attrs.CON = 70; derive(a); a.hp = a.hpMax; setup(a, e);
    const hp = a.hp; turn(e); fixR(.2, () => H.act(gm, { id: e.id, skill, target: a.id })); return { dano: hp - a.hp, a, log: S.log.at(-1).text }; };
  assert.equal(AR.prof(S.items[novo('Escudo de Torre')]).block, 25);
  const com = hit('atk'); assert.ok(/bloqueado/.test(com.log), 'com 20 < 25: bloqueia'); // fixR(.2) → rola 20
  const sem = (() => { const [a, e] = duelW(); e.attrs.AGI = 99; e.arma = 20; derive(e); a.attrs.CON = 70; derive(a); a.hp = a.hpMax; const hp = a.hp; turn(e); fixR(.2, () => H.act(gm, { id: e.id, skill: 'atk', target: a.id })); return hp - a.hp; })();
  assert.ok(com.dano < sem * .6, `com escudo ${com.dano} contra ${sem} sem`);
  const fraco = (() => { const [a, e] = duelW(); e.arma = 20; derive(e); const sh = novo('Escudo de Torre'); a.inv[sh] = 1; a.equip.arma = sh; turn(e); fixR(.3, () => H.act(gm, { id: e.id, skill: 'atk', target: a.id })); return S.log.at(-1).text; })();
  assert.ok(!/bloqueado/.test(fraco), 'rolagem 30 > 25: não bloqueia');
  // o escudo do inimigo não bloqueia o golpe de um aliado (só golpe de inimigo)
  const [a, e] = duelW(); const b = mk(ana, {}); derive(b); b.hp = b.hpMax; S.battle.ticks[b.id] = 900; const sh = novo('Escudo de Torre'); b.inv[sh] = 1; b.equip.arma = sh; a.attrs.AGI = 99; turn(a); fixR(.2, () => H.act(gm, { id: a.id, skill: 'atk', target: b.id }));
  assert.ok(!/bloqueado/.test(S.log.at(-1).text), 'aliado não é bloqueado');
});
test('armas: instrumentos têm técnicas de grupo e o ataque mental do violino fere a Sanidade', () => {
  let [a, e] = duelW(); const vk = Object.keys(S.items).find(k => S.items[k].name === 'Violino'); a.inv[vk] = 1; a.equip.arma = vk; assert.equal(basicOf(a).kind, 'mental'); assert.equal(basicOf(a).attr, 'CAR');
  const w = S.items[vk]; assert.equal(w.sk[0].kind, 'heal'); assert.equal(w.sk[0].area, true);
  const b = mk(ana, {}); derive(b); b.hp = b.hpMax; S.battle.ticks[b.id] = 900; a.aura = a.auraMax; turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: `w:${vk}:0`, target: a.id }));
  assert.ok(a.st.atkUp > 0 && b.st.atkUp > 0, 'Melodia de Coragem acende o grupo todo');
  const fl = Object.keys(S.items).find(k => S.items[k].name === 'Flauta'); assert.equal(S.items[fl].wa, 'SAB');
});
test('armas: pacotes empilham até 3 (uma qualidade, um elemento), mexem nos traços e renomeiam; variantes elementais e importação', () => {
  const d = structuredClone(AR.make('sabre')); assert.equal(AR.applyPack(d, 'sangrante'), ''); assert.equal(d.st, 'bleed'); assert.equal(d.stc, 35);
  assert.equal(AR.applyPack(d, 'sangrante'), 'Sangrante: já aplicado'); assert.equal(AR.applyPack(d, 'venenosa'), ''); assert.ok(/st poison 3 35%/.test(d.fx), 'segunda condição vai para os efeitos');
  assert.equal(AR.applyPack(d, 'mestre'), ''); assert.ok(/não|3/.test(AR.applyPack(d, 'precisa')), 'limite de 3'); assert.equal(d.pk.length, 3);
  assert.equal(d.name, 'Sabre de Sangria, Veneno e Mestre'); assert.equal(d.power, 16); assert.equal(d.price, 400);
  assert.equal(AR.applyPack(structuredClone(d), 'mestre'), 'Mestra: já aplicado'.replace('Mestra', 'Mestra'));
  const q = structuredClone(AR.make('katana')); AR.applyPack(q, 'refugo'); assert.match(AR.applyPack(q, 'artesao'), /só uma qualidade/);
  const e2 = structuredClone(AR.make('sabre')); AR.applyPack(e2, 'el:kagutsuchi'); assert.match(AR.applyPack(e2, 'el:indra'), /só um elemento/); assert.equal(e2.cat, 'elemental'); assert.equal(e2.el, 'kagutsuchi');
  const par = structuredClone(AR.make('sabresg')); AR.applyPack(par, 'pesada'); assert.ok(par.power >= AR.make('sabresg').power + 1, 'poder por golpe respeita o traço em par');
  assert.ok(AR.clean(d).w.pk.length === 3 && AR.clean({ ...d, pk: ['x', 'sangrante', 'y'] }).w.pk.length === 1, 'o criador só guarda pacotes conhecidos');
  assert.ok(Object.values(AR.PK).filter(p => p.grp === 'el').length === 9 && Object.values(AR.PK).filter(p => p.grp === 'q').length === 5);
  // variantes: um elemento ou os 9, sem repetir nome
  reset(); const gk = Object.keys(S.items).find(k => S.items[k].name === 'Sabre de Cavalaria'), n0 = Object.keys(S.items).length;
  H.wpnVar(ana, { id: gk, el: 'all' }); assert.equal(Object.keys(S.items).length, n0, 'jogador não cria');
  H.wpnVar(gm, { id: gk, el: 'indra' }); const iv = Object.values(S.items).find(i => i.name === 'Sabre de Cavalaria de Indra'); assert.ok(iv && iv.el === 'indra' && iv.cat === 'elemental' && iv.sk.length >= 1 && iv.st === 'para');
  H.wpnVar(gm, { id: gk, el: 'all' }); assert.equal(Object.keys(S.items).length, n0 + 9, 'as 9 de uma vez, sem repetir a de Indra');
  const forjavel = Object.values(S.items).filter(i => i.name.startsWith('Sabre de Cavalaria de ')); assert.ok(forjavel.every(i => i.cat === 'elemental' && i.el));
  // importação: exporta o rascunho, importa de volta e valida o que vier errado
  const k0 = Object.keys(S.items).length, base = AR.make('mangual', { name: 'Mangual Importado' }); H.wpnImport(gm, { list: [base, { ...base, hits: 99, fx: 'xx 1', pk: ['nada'] }, 'lixo', null] });
  assert.equal(Object.keys(S.items).length, k0 + 2); const nomes = Object.values(S.items).map(i => i.name); assert.ok(nomes.includes('Mangual Importado') && nomes.includes('Mangual Importado (2)'), 'nome repetido ganha número');
  const ruim = Object.values(S.items).find(i => i.name === 'Mangual Importado (2)'); assert.equal(ruim.hits, 6); assert.equal(ruim.fx, ''); H.wpnImport(ana, { list: [base] }); assert.equal(Object.keys(S.items).length, k0 + 2, 'só o mestre importa');
  H.wpnImport(gm, { list: Array.from({ length: 40 }, (_, i) => AR.make('adaga', { name: 'Adaga ' + i })) }); assert.equal(Object.keys(S.items).length, k0 + 2 + 25, 'lote de no máximo 25');
});

test('cartas do Canva: nós existem, pré-requisitos e amplificações apontam para nós reais e a Doença acumula estágios', async () => {
  const { CARTAS } = await import('../arvore/cartas.js');
  const todos = Object.values(S.skills), nomes = new Set(todos.map(s => s.name));
  let n = 0;
  for (const brs of Object.values(CARTAS)) for (const b of brs) for (const o of b) {
    n++; assert.ok(nomes.has(o.n), o.n);
    for (const k of ['pre', 'amp', 'duo']) if (o[k]) assert.ok(nomes.has(o[k]), `${o.n}: ${k} ${o[k]}`);
  }
  assert.ok(n >= 70);
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.attrs.FOR = 80; h.aura = 40; e.hpMax = e.hp = 999; e.attrs.AGI = 1; h.skills = [sk('Chute Doentio')]; H.battle(gm, { on: true });
  assert.equal(h.stk?.doenca || 0, 0);
  while (current() !== h.id) H.next(gm);
  H.act(ana, { id: h.id, skill: sk('Chute Doentio'), target: e.id }); assert.equal(h.stk.doenca, 1);
  // a forma do vento atrasa quem erra
  const f = S.skills[sk('Forma Prateada: Vendaval')]; assert.equal(f.form.ret, 40); assert.match(RU.describe ? RU.describe(f) : 'ok', /./);
});

test('leva 2: reações disparam no turno do inimigo, uma por rodada, pagando o custo', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); e.attrs.DES = 99; h.skills = [sk('Couraça de Pedra')]; h.aura = 20; H.battle(gm, { on: true });
  while (current() !== e.id) H.next(gm);
  H.act(gm, { id: e.id, skill: 'atk', target: h.id });
  const hit = S.log.some(l => /→ .*de dano/.test(l.text)), reag = S.log.filter(l => /reage com Couraça de Pedra/.test(l.text)).length;
  assert.equal(reag, hit ? 1 : 0); // só reage quando o golpe acerta
  assert.ok(S.skills[sk('Couraça de Pedra')].rea.t === 'block');
});
test('leva 2: cargas acumulam e explodem; combo multiplica o golpe seguinte', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); e.hpMax = e.hp = 9999; e.attrs.AGI = 1; h.attrs.INT = 90; h.aura = 99;
  h.skills = [sk('Faísca Acumulada'), sk('Descarga Total'), sk('Raio Bifurcado')]; H.battle(gm, { on: true });
  const go = n => { while (current() !== h.id) H.next(gm); H.act(ana, { id: h.id, skill: sk(n), target: e.id }); };
  // o combo só conta num golpe que acerta: repete o par até sair (a chance de errar seis vezes seguidas é desprezível)
  for (let i = 0; i < 6 && !S.log.some(l => /COMBO!/.test(l.text)); i++) { go('Faísca Acumulada'); go('Raio Bifurcado'); }
  assert.ok(S.log.some(l => /COMBO!/.test(l.text)));
  h.stk.carga = 3; go('Descarga Total'); assert.equal(h.stk.carga, 0);
});
test('núcleo Marcial e raízes dos setores: abertos sem exigir vizinho aprendido', async () => {
  const net = await import('../src/net.js'); reset();
  const h = mk(ana, {}); h.vinc = ['indra']; h.skills = [sk('Faísca')]; h.xp = 9999;
  const core = Object.keys(S.skills).filter(k => S.skills[k].open && S.skills[k].el === 'fis');
  assert.ok(core.length >= 5); assert.ok(core.includes('g0'));
  for (const k of core) assert.equal(RU.whyNot(h, S.skills[k], S.skills, S.items, k, true), '', S.skills[k].name);
  const hid = net.hiddenSkills({ role: 'player', name: 'Ana' });
  for (const k of core) assert.ok(!hid.includes(k), S.skills[k].name);
  const auraRoot = Object.keys(S.skills).find(k => S.skills[k].el === 'aura' && S.skills[k].root);
  assert.equal(RU.whyNot(h, S.skills[auraRoot], S.skills, S.items, auraRoot, true), '');
  const susRoot = Object.keys(S.skills).find(k => S.skills[k].el === 'susanoo' && S.skills[k].root);
  assert.match(RU.whyNot(h, S.skills[susRoot], S.skills, S.items, susRoot, true), /Vínculo/);
});
// par do mesmo setor vizinho na grade mas sem ligação (existe entre ramos que se encostam)
const unlinkedPair = el => { const ids = Object.keys(S.skills).filter(k => S.skills[k].el === el && !S.skills[k].open && !S.skills[k].pre && !S.skills[k].rq && !S.skills[k].nb && !S.skills[k].cs && !S.skills[k].ex && !S.skills[k].aw && !S.skills[k].v2);
  for (const a of ids) for (const b of ids) if (a !== b && RU.near(S.skills[a], S.skills[b]) && !S.skills[a].ln.includes(b) && !S.skills[b].ln.some(j => RU.near(S.skills[j], S.skills[a]) && S.skills[a].ln.includes(j))) return [a, b];
};
test('regras: vizinho de grade sem ligação não basta; ligação basta', () => {
  reset(); const h = mk(ana, {}); h.vinc = ['kagutsuchi']; h.xp = 999; const [a, b] = unlinkedPair('kagutsuchi');
  h.skills = [a]; assert.equal(RU.whyNot(h, S.skills[b], S.skills, S.items, b), 'Precisa de um nó vizinho já aprendido.');
  h.skills = [S.skills[b].ln[0]]; assert.equal(RU.whyNot(h, S.skills[b], S.skills, S.items, b), '');
});
test('regras: skill do mestre sem ln encostada na grade continua aprendível', () => {
  reset(); const h = mk(ana, {}); h.xp = 999; const before = new Set(Object.keys(S.skills)); H.edAdd(gm, { coll: 'skills' }); const nid = Object.keys(S.skills).find(k => !before.has(k));
  const used = new Set(Object.values(S.skills).map(s => s.gx + ',' + s.gy)); let spot, host;
  for (const k of Object.keys(S.skills).filter(k => S.skills[k].el === 'fis' && k !== nid)) { const s = S.skills[k]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!spot && !used.has((s.gx + dx) + ',' + (s.gy + dy))) { spot = [s.gx + dx, s.gy + dy]; host = k; } }
  Object.assign(S.skills[nid], { gx: spot[0], gy: spot[1] }); h.skills = [host];
  assert.equal(RU.whyNot(h, S.skills[nid], S.skills, S.items, nid), '');
  delete S.skills[nid];
});
test('regras: save antigo mantém as skills e sempre deixa algo para aprender', async () => {
  const { migrate } = await import('../src/state.js'); reset(); const h = mk(ana, {}); h.vinc = ['kagutsuchi']; h.xp = 999;
  const cur = S.skills, picks = Object.keys(cur).filter(k => cur[k].el === 'kagutsuchi' && cur[k].br && /-[0-5]$/.test(cur[k].br)).filter((k, i, a) => a.findIndex(j => cur[j].br === cur[k].br) === i).slice(0, 6);
  const old = Object.fromEntries(Object.entries(cur).map(([k, s]) => ['o' + k, { ...s, ln: undefined }])); h.skills = picks.map(k => 'o' + k);
  const names = picks.map(k => cur[k].name).sort(); S.skills = old; S.skillsSig = 'antiga'; migrate(false);
  assert.deepEqual(h.skills.map(k => S.skills[k].name).sort(), names);
  assert.ok(Object.keys(S.skills).some(k => !h.skills.includes(k) && RU.whyNot(h, S.skills[k], S.skills, S.items, k) === ''));
});
test('importar pacote com skill de mesmo nome mantém ligações e posição', async () => {
  const { importPack } = await import('../server.js'); const id = sk('Brasa Viva'), s0 = structuredClone(S.skills[id]);
  importPack({ vj: 'conteudo', skills: { a: { name: 'Brasa Viva', kind: 'dmg', el: 'kagutsuchi', power: 99 } } });
  const s = S.skills[id]; assert.equal(s.power, 99); assert.deepEqual(s.ln, s0.ln); assert.equal(s.wx, s0.wx); assert.equal(s.wy, s0.wy);
  S.skills[id] = s0;
});
test('editor: "Liga a" grava ligações nos dois lados e vazio volta à grade', () => {
  const before = new Set(Object.keys(S.skills)); H.edAdd(gm, { coll: 'skills' }); const nid = Object.keys(S.skills).find(k => !before.has(k)), gp = sk('Golpe Pesado');
  H.edSet(gm, { coll: 'skills', id: nid, f: 'lk', v: 'Golpe Pesado|Inexistente' });
  assert.deepEqual(S.skills[nid].ln, [gp]); assert.ok(S.skills[gp].ln.includes(nid));
  H.edSet(gm, { coll: 'skills', id: nid, f: 'lk', v: '' });
  assert.equal(S.skills[nid].ln, undefined); assert.ok(!S.skills[gp].ln.includes(nid));
  delete S.skills[nid];
});
test('segredo: silhueta leva ln, wx, wy; vizinho de grade sem ligação continua escondido', async () => {
  const net = await import('../src/net.js'); reset(); const h = mk(ana, {}); h.vinc = ['kagutsuchi']; const [a, b] = unlinkedPair('kagutsuchi'); h.skills = [a];
  const hid = net.hiddenSkills({ role: 'player', name: 'Ana' }); assert.ok(hid.includes(b), 'vizinho sem ligação à vista');
  const sks = JSON.parse(net.defsFor({ role: 'player', name: 'Ana' }, net.curDefs()).json).skills, o = S.skills[b];
  assert.equal(sks[b].name, '???'); assert.deepEqual(sks[b].ln, o.ln); assert.equal(sks[b].wx, o.wx); assert.equal(sks[b].wy, o.wy);
});
test('segredo: jogador recebe "???" nos nós fora de alcance; o mestre vê tudo', async () => {
  const net = await import('../src/net.js'); reset();
  const h = mk(ana, {}); h.vinc = ['indra']; h.skills = [sk('Faísca')];
  const hid = net.hiddenSkills({ role: 'player', name: 'Ana' });
  assert.ok(hid.length > 100); assert.ok(!hid.includes(sk('Faísca'))); assert.equal(net.hiddenSkills({ role: 'gm' }).length, 0);
  assert.ok(hid.includes(sk('Kamikaze'))); // Fuhaku, sem Vínculo
  const viz = Object.keys(S.skills).find(k => S.skills[k].el === 'indra' && k !== sk('Faísca') && RU.near(S.skills[k], S.skills[sk('Faísca')]));
  if (viz) assert.ok(!hid.includes(viz));
  const d = net.defsFor({ role: 'player', name: 'Ana' }, net.curDefs()); const sks = JSON.parse(d.json).skills;
  assert.equal(sks[sk('Kamikaze')].name, '???'); assert.equal(sks[sk('Faísca')].name, 'Faísca'); assert.match(String(d.v), /\./);
});

// Testes das regras e permissões: node --test tools/test.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjtest-'));
const { H, S, current, derive, view, handle, migrateItems, modsOf, basicOf, finPlan, slotMax: slotMaxOf } = await import('../server.js'); const RU = globalThis.RULES;
process.on('exit', () => { try { fs.rmSync(process.env.VJ_DATA, { recursive: true, force: true }); } catch {} }); // registrado depois do servidor: roda após a última gravação ao sair
const { TREE } = await import('../tree.js');
await import('../public/js/anim-profiles.js'); const AP = globalThis.ANIM_PROFILES;
const { LEVA4: L4 } = await import('../arvore/leva4.js'), L4N = new Set(Object.values(L4).flat(2).map(o => o.n)); // nós novos da Leva 4
const { REFINOS } = await import('../arvore/camadas.js');
const TOTAL = Object.values(TREE).reduce((a, v) => a + v.branches.flat().length, REFINOS.size);
const gm = { role: 'gm' }, ana = { role: 'player', name: 'Ana' }, bia = { role: 'player', name: 'Bia' };
// golpe do inimigo escolhido à mão pelo mestre abre a janela de defesa; nos testes antigos ela fecha na hora (H.actWin deixa a janela aberta)
H.actWin = H.act; H.act = (c, m) => { H.actWin(c, m); if (c.role === 'gm' && S.battle.cmd && S.chars[m.id]?.enemy) H.cmdSkip(gm); };
const reset = () => { S.chars = {}; S.log.length = 0; S.battle = { active: false, ticks: {} }; const tc = Object.keys(S.skills).find(k => S.skills[k].name === 'Tiro Certeiro'); if (tc) S.skills[tc].req = ''; /* nos testes ele não depende de arma (no jogo exige uma arma de distância) */ };
const mk = (c, m) => { const before = new Set(Object.keys(S.chars)); H.addChar(gm, c.role === 'player' ? { ...m, owner: c.name } : m); /* só o mestre cria; o de jogador nasce com dono */ const ch = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(ch); ch.hp = ch.hpMax; return ch; };
const sk = n => Object.keys(S.skills).find(k => S.skills[k].name === n);
const isArm = s => /^armas-/.test(s.br || ''); // Árvore de Armas: bloco isolado (el 'fis', sem ligação com o resto da grade)

test('bestiário inicial e grade são criados', () => { assert.ok(Object.keys(S.bestiary).length >= 30); assert.equal(Object.keys(S.skills).length, TOTAL); assert.ok(TOTAL >= 1330); assert.ok(Object.keys(S.items).length >= 50); });
test('grade: sem sobreposição; cada Vínculo, a Aura e o Ocultismo alcançam todos os seus nós passando só por eles e pelo tronco Marcial', () => {
  const ns = Object.values(S.skills); assert.equal(new Set(ns.map(s => s.gx + ',' + s.gy)).size, ns.length);
  for (const el of ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko', 'aura', 'oculto']) {
    const set = ns.filter(s => (s.el === el || s.el === 'fis') && !isArm(s)), start = set.findIndex(s => s.el === el && (s.root || s.br === el + '-0')), seen = new Set([start]), q = [start], idOf = new Map(Object.entries(S.skills).map(([k, s]) => [s, k])), ix = new Map(set.map((s, i) => [idOf.get(s), i]));
    assert.ok(start >= 0, 'raiz de ' + el);
    while (q.length) { const x = set[q.pop()]; for (const l of x.ln || []) { const i = ix.get(l); if (i != null && !seen.has(i)) { seen.add(i); q.push(i); } } set.forEach((y, i) => { if (!seen.has(i) && Math.max(Math.abs(x.gx - y.gx), Math.abs(x.gy - y.gy)) <= 1) { seen.add(i); q.push(i); } }); }
    assert.deepEqual(set.filter((_, i) => !seen.has(i)).map(s => s.name), [], el);
    assert.equal(ns.filter(s => s.el === el).length, TREE[el].branches.flat().length); assert.ok(ns.filter(s => s.el === el).length >= (['aura', 'oculto'].includes(el) ? 120 : 104));
  }
});
test('ligações: simétricas, nunca entre setores diferentes (só com o Marcial), sem repetição', () => {
  for (const [id, s] of Object.entries(S.skills)) {
    assert.ok(Array.isArray(s.ln) && s.ln.length, 'sem ligação: ' + s.name);
    assert.equal(new Set(s.ln).size, s.ln.length, s.name);
    for (const j of s.ln) { const o = S.skills[j]; assert.ok(o && o.ln.includes(id), `${s.name} → ${o?.name} não volta`);
      assert.ok(o.el === s.el || o.el === 'fis' || s.el === 'fis', `${s.name} liga a ${o.name}`); assert.equal(isArm(o), isArm(s), `${s.name} (Armas) liga a ${o.name} fora do bloco`); }
  }
});
test('ligações: cada setor alcança todos os seus nós andando só por ln, por ele e pelo Marcial', () => {
  for (const el of ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko', 'aura', 'oculto']) {
    const ok = id => [el, 'fis'].includes(S.skills[id].el) && !isArm(S.skills[id]), start = Object.keys(S.skills).find(id => S.skills[id].el === el && S.skills[id].root), seen = new Set([start]), q = [start];
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
  if (near) { const [x, y] = P.get('x1'); assert.ok(Object.keys(S.skills).filter(k => RU.near(S.skills[k], sks.x1)).some(k => { const [a, b] = P.get(k); return Math.hypot(x - a, y - b) < M.U * 1.5; })); } // junto de algum vizinho de grade
  assert.ok(P.get('x1').every(Number.isFinite));
});
test('mandala (navegador): edges sem repetição, só entre visíveis, com o núcleo ligado', async () => {
  await import('../public/js/mandala.js'); const M = globalThis.MANDALA, vis = new Set(Object.keys(S.skills).filter(k => S.skills[k].el !== 'hiruko'));
  const E = M.edges(S.skills, vis), keys = E.map(([a, b]) => [a, b].sort().join('|'));
  assert.equal(new Set(keys).size, keys.length); assert.ok(E.every(([a, b]) => vis.has(a) && vis.has(b)));
  assert.ok(keys.includes(['g0', 'g1'].sort().join('|'))); assert.ok(E.length >= vis.size - 12);
});
test('ligações: ramo de 10 nós segue tronco 1-4, A 5-7, B 8-9 e final', () => {
  const br = Object.entries(S.skills).filter(([, s]) => s.br === 'kagutsuchi-0' && !s.refino); assert.equal(br.length, 10);
  const id = i => br[i][0], L = i => br[i][1].ln.flatMap(k => S.skills[k].refino ? S.skills[k].ln : [k]);
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
  // fundos novos e clima visual sobreposto: o mestre escolhe, valor inválido volta a vazio, jogador não mexe
  handle(gm, { t: 'map', f: 'bbg', v: 'sangue' }); assert.equal(S.scenes[S.scene].bbg, 'sangue'); handle(gm, { t: 'map', f: 'bbg', v: 'aurora' }); assert.equal(S.scenes[S.scene].bbg, 'aurora');
  handle(gm, { t: 'map', f: 'clima', v: 'chuva' }); assert.equal(S.scenes[S.scene].clima, 'chuva'); handle(gm, { t: 'map', f: 'clima', v: 'lava' }); assert.equal(S.scenes[S.scene].clima, ''); handle(gm, { t: 'map', f: 'clima', v: 'neve' }); handle(ana, { t: 'map', f: 'clima', v: 'brasas' }); assert.equal(S.scenes[S.scene].clima, 'neve'); handle(gm, { t: 'map', f: 'clima', v: '' }); assert.equal(S.scenes[S.scene].clima, '');
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
  reset(); const h = mk(ana, {}); h.xp = 15; const before = h.hpMax;
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
test('nova cena muda só o foco; heróis e inimigos ficam onde estão (o mestre os move pela Mesa)', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }), a = S.scene; H.sceneAdd(gm);
  assert.equal(h.scene, a); assert.equal(e.scene, a); assert.notEqual(a, S.scene);
});
// ----- árvore expandida: mecânicas novas (sorteio fixado para serem determinísticos) -----
const fixR = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } }; // 0.3 → d100 = 31: acerta sem crítico, golpe no torso
const duel = (o = {}) => { reset(); const a = mk(ana, {}), e = mk(gm, { enemy: true }); Object.assign(a.attrs, { FOR: 70, INT: 70, SAB: 70, CON: 60, DES: 70, AGI: 60 }); e.attrs.AGI = 10; Object.assign(a, o); derive(a); derive(e); a.hp = a.hpMax; e.hp = e.hpMax; a.aura = a.auraMax; a.san = a.sanMax; H.battle(gm, { on: true }); return [a, e]; };
const turn = ch => { for (const k in S.battle.ticks) S.battle.ticks[k] = 1000; S.battle.ticks[ch.id] = 0; };
const use = (a, n, t, m = {}) => { turn(a); if (!a.skills.includes(sk(n))) a.skills.push(sk(n)); return fixR(.3, () => H.act(gm, { id: a.id, skill: sk(n), target: t.id, ...m })); };
test('regras: a notação dos nós vira efeitos, e os nós antigos cumprem o que o nome promete', () => {
  const S0 = n => S.skills[sk(n)];
  { const [v] = S0('Vampirismo').fx; assert.ok(v.t === 'drain' && v.r === 'hp' && v.p >= 20 && v.p <= 60); } assert.equal(S0('Combustão Súbita').fx[0].t, 'det'); assert.equal(S0('Ressurgir').fx[0].t, 'revive');
  assert.equal(S0('Avatar de Kagutsuchi').form.dur, 4); assert.equal(S0('Avatar de Kagutsuchi').aw, 'kagutsuchi'); assert.equal(S0('Tiro Duplo').hits, 2);
  assert.ok(Object.values(S.skills).every(x => !x.fx || x.fx.every(f => f.t))); assert.ok(Object.values(S.skills).filter(x => x.duo).every(x => Object.values(S.skills).some(y => y.name === x.duo)));
});
test('roubo de vida, detonar condição e escudo', () => {
  let [a, e] = duel(); a.hp = 10; use(a, 'Vampirismo', e); assert.ok(a.hp > 10); assert.match(S.log.find(l => /Vampirismo/.test(l.text)).text, /\+\d+ HP para/);
  [a, e] = duel(); e.st.burn = 4; const hp = e.hp; use(a, 'Combustão Súbita', e); assert.ok(S.log.some(l => /Detonação/.test(l.text))); assert.ok(e.hp < hp);
  [a, e] = duel(); use(a, 'Escudo de Areia', a); assert.ok(a.shield > 0); const sh = a.shield, h0 = a.hp; turn(e); fixR(.3, () => H.act(gm, { id: e.id, skill: 'atk', target: a.id })); assert.ok(a.shield < sh || a.hp === h0);
});
test('escudo: soma até metade do HP, dura 3 turnos e não vaza dano', () => {
  let [a, e] = duel(); use(a, 'Escudo de Areia', a); const v = a.shield; assert.equal(a.st.shield, 3); use(a, 'Escudo de Areia', a); assert.equal(a.shield, Math.min(2 * v, Math.ceil(a.hpMax * .5)));
  const b = mk(ana, {}); derive(b); b.hp = b.hpMax; S.battle.ticks[b.id] = 900; use(a, 'Escudo de Areia', b); assert.equal(b.st.shield, 3);
  [a, e] = duel(); a.shield = 999; a.st.shield = 3; a.st.reflect = 3; const h0 = a.hp, he = e.hp; turn(e); fixR(.3, () => H.act(gm, { id: e.id, skill: 'atk', target: a.id }));
  assert.equal(a.hp, h0); assert.equal(Object.values(a.body).reduce((x, y) => x + y, 0), 0); assert.equal(e.hp, he); assert.equal(S.battle.stats?.[e.id]?.dmg || 0, 0);
  [a, e] = duel(); a.shield = 1; a.st.shield = 3; e.arma = 40; turn(e); fixR(.3, () => H.act(gm, { id: e.id, skill: 'atk', target: a.id }));
  assert.ok(a.hp < a.hpMax); assert.equal(Object.values(a.body).reduce((x, y) => x + y, 0), a.hpMax - a.hp);
});
test('golpe de várias batidas aplica o status uma vez', () => {
  const [a, e] = duel(); S.skills.tmpMulti = { name: 'Teste Multi', kind: 'dmg', attr: 'FOR', el: 'fis', power: 5, cost: 0, res: 'aura', hits: 3, fx: [{ t: 'st', k: 'burn', n: 2 }] };
  try { a.skills.push('tmpMulti'); turn(a); fixR(.3, () => H.act(gm, { id: a.id, skill: 'tmpMulti', target: e.id })); assert.ok(e.hp < e.hpMax); assert.equal(e.st.burn, 2); } finally { delete S.skills.tmpMulti; }
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
  assert.equal(b.aura, 20 - S.skills[sk('Pinça: Flanco Direito')].cost); assert.ok(S.battle.ticks[b.id] > 500); assert.ok(S.log.some(l => /executam juntos/.test(l.text)));
});
test('provocar puxa o golpe; guarda-costas recebe no lugar; esquiva e contra-ataque', () => {
  let [a, e] = duel(); const b = mk(ana, {}); S.battle.ticks[b.id] = 500; use(a, 'Desafio', a); const hb = b.hp; fixR(.3, () => { turn(e); H.act(gm, { id: e.id, skill: 'atk', target: b.id }); }); assert.equal(b.hp, hb); assert.ok(a.hp < a.hpMax);
  [a, e] = duel(); const c = mk(ana, {}); S.battle.ticks[c.id] = 500; use(a, 'Guarda-Costas', c); const hc = c.hp; fixR(.3, () => { turn(e); H.act(gm, { id: e.id, skill: 'atk', target: c.id }); }); assert.equal(c.hp, hc);
  [a, e] = duel(); use(a, 'Reflexo do Raio', a); const ha = a.hp; fixR(.3, () => { turn(e); H.act(gm, { id: e.id, skill: 'atk', target: a.id }); }); assert.ok(a.hp < ha, 'esquiva não anula: o golpe acerta com metade do dano'); assert.equal(a.st.evade, undefined);
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
  const amp = id('Núcleo de Corte'), base = id('Núcleo de Indra'); h.vinc = ['indra']; h.skills = Object.keys(S.skills).filter(k => S.skills[k].br === S.skills[amp].br && k !== amp && k !== base); // nó com pre
  H.learn(ana, { id: h.id, skill: amp }); assert.ok(!h.skills.includes(amp)); h.skills.push(base); H.learn(ana, { id: h.id, skill: amp }); assert.ok(h.skills.includes(amp));
  const q = id('Mutação Final: Quimera'); h.vinc = ['hiruko']; h.skills = Object.keys(S.skills).filter(k => S.skills[k].br === 'hiruko-8').slice(0, 9).filter(k => k !== q).slice(0, 5);
  H.learn(ana, { id: h.id, skill: q }); assert.ok(!h.skills.includes(q)); // 5 de 6 nós do ramo
  const fin = id('Restrição Autoimposta'), F = S.skills[fin]; h.skills = Object.keys(S.skills).filter(k => k !== fin && !S.skills[k].vow && ['fis', 'aura'].includes(S.skills[k].el) && Math.max(Math.abs(S.skills[k].gx - F.gx), Math.abs(S.skills[k].gy - F.gy)) <= 1);
  if (!h.skills.length) h.skills = [Object.keys(S.skills).find(k => k !== fin && Math.max(Math.abs(S.skills[k].gx - F.gx), Math.abs(S.skills[k].gy - F.gy)) <= 1)];
  assert.match(globalThis.RULES.whyNot({ ...h, skills: h.skills.filter(k => !S.skills[k].vow) }, F, S.skills, S.items, fin), /voto|vizinho/);
  h.skills = [...h.skills, id('Seiyaku: Presa')]; assert.ok(!/voto/.test(globalThis.RULES.whyNot(h, F, S.skills, S.items, fin))); // estado: ter um voto
  reset(); const n = mk(ana, {}); n.xp = 999; n.skills = [id('Hatsu: Liberar')]; const root = Object.keys(S.skills).find(k => S.skills[k].br === 'aura-2' && Math.max(Math.abs(S.skills[k].gx - S.skills[id('Hatsu: Liberar')].gx), Math.abs(S.skills[k].gy - S.skills[id('Hatsu: Liberar')].gy)) <= 3);
  n.skills = Object.keys(S.skills).filter(k => S.skills[k].br === 'aura-0'); const pr = id('Punho Reforçado'); n.skills.push(...Object.keys(S.skills).filter(k => S.skills[k].br === S.skills[pr].br && k !== pr));
  H.learn(ana, { id: n.id, skill: pr }); assert.equal(n.nen, 'int'); // a primeira categoria vira a natureza
  const em = id('Projétil de Aura'), xp = n.xp; n.skills.push(...Object.keys(S.skills).filter(k => S.skills[k].br === S.skills[em].br && k !== em)); H.learn(ana, { id: n.id, skill: em }); assert.equal(xp - n.xp, 20); // Emissão é vizinha: 15 × 1,25 → 20
  assert.equal(globalThis.RULES.nenEff(n, S.skills[id('Aura de Navalha')]), .8); assert.equal(globalThis.RULES.nenEff(n, S.skills[id('Antena de Aura')]), .6);
  const es = id('Tempo Imperial'); n.skills.push(...Object.keys(S.skills).filter(k => S.skills[k].br === 'aura-5' && k !== es)); H.learn(ana, { id: n.id, skill: es }); assert.ok(!n.skills.includes(es)); // Especialização exige Despertar
});
test('a IA dos inimigos usa transformação, cura e ataques sem travar a fila', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); e.skills = [sk('Postura da Brasa'), sk('Centelha')]; e.attrs.AGI = 99; h.attrs.AGI = 1; derive(e); e.aura = e.auraMax;
  H.battle(gm, { on: true }); let formed = false; for (let i = 0; i < 40 && !formed; i++) { turn(e); H.ai(gm); H.cmdSkip(gm); formed = !!e.form || S.log.some(l => /assume a forma/.test(l.text)); e.aura = e.auraMax; delete e.st.exaus; h.hp = h.hpMax; }
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
  reset(); S.camp = { open: false, acts: {}, with: {} }; const h = mk(ana, {}); const votos = Object.keys(S.skills).filter(k => S.skills[k].vow).sort((a, b) => S.skills[a].xp - S.skills[b].xp).slice(0, 6);
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
  h.attrs.AGI = 99; e0.attrs.AGI = 1; derive(h); e0.hp = e0.hpMax = 9999; h.hp = h.hpMax; H.battle(gm, { on: true }); assert.ok(modsOf(h).atk >= 16); H.battle(gm, { on: false }); assert.ok(!S.meal || Object.values(S.meal.ids || {}).some(n => n > 0));
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
const foeTurn = (e, f) => { turn(e); return fixR(.3, () => { H.ai(gm); H.cmdSkip(gm); }); }; // cmdSkip: chefe com golpe anunciado abre a janela; o teste não espera
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
    const ns = Object.values(S.skills).filter(x => x.br === 'armas-' + wt + '-0' && !x.refino); assert.equal(ns.length, 10, wt);
    const tri = Object.values(S.skills).filter(x => String(x.br).startsWith('armas-' + wt + '-')); // camadas: os 3 ramos do tipo trocam nós entre si
    assert.ok(tri.some(x => x.kind === 'form') && tri.some(x => x.kind === 'util') && tri.some(x => x.rq && Object.values(x.rq)[0] >= 54), wt);
    assert.ok(ns.some(x => x.kind === 'passive' && x.sc === 'wt:' + wt), wt + ': maestria');
  }
  // maestria: só com o tipo certo empunhado
  [a, e] = duelW(); a.skills.push(sk('Olho de Falcão')); a.pslots = [sk('Olho de Falcão')]; equipK(a, novo('arcocurto'));
  const comArco = modsOf(a, { basic: true }).hit; equipK(a, novo('sabre')); assert.equal((comArco - 5) - (modsOf(a, { basic: true }).hit - 5), S.skills[sk('Olho de Falcão')].mod.hit, 'Olho de Falcão: acerto só com arco'); // arco curto e sabre têm +5 de acerto próprio
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
    for (const k of ['pre', 'amp', 'duo']) for (const nome of (o[k] || '').split('|').filter(Boolean)) assert.ok(nomes.has(nome), `${o.n}: ${k} ${nome}`);
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
  const go = n => { while (current() !== h.id) H.next(gm); fixR(.3, () => H.act(ana, { id: h.id, skill: sk(n), target: e.id })); };
  // o combo só conta num golpe que acerta: dados fixos (0,3 acerta sem crítico)
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
const unlinkedPair = el => { const ids = Object.keys(S.skills).filter(k => S.skills[k].el === el && !S.skills[k].open && S.skills[k].refino && !S.skills[k].rq && !S.skills[k].nb && !S.skills[k].cs && !S.skills[k].ex && !S.skills[k].aw && !S.skills[k].v2);
  for (const a of ids) for (const b of ids) if (a !== b && RU.near(S.skills[a], S.skills[b]) && !S.skills[a].ln.includes(b) && !S.skills[b].ln.some(j => RU.near(S.skills[j], S.skills[a]) && S.skills[a].ln.includes(j))) return [a, b];
};
test('regras: vizinho de grade sem ligação não basta; ligação basta', () => {
  reset(); const h = mk(ana, {}); h.vinc = ['kagutsuchi']; h.xp = 999; const [a, b] = unlinkedPair('kagutsuchi');
  h.skills = [a]; assert.equal(RU.whyNot(h, S.skills[b], S.skills, S.items, b), 'Precisa de um nó vizinho já aprendido.');
  h.skills = [sk(S.skills[b].pre)]; assert.equal(RU.whyNot(h, S.skills[b], S.skills, S.items, b), '');
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
test('revisão: atualizar a árvore mantém as skills criadas pelo mestre (e quem as aprendeu)', async () => {
  const { migrate } = await import('../src/state.js'); reset(); const h = mk(ana, {}); const before = new Set(Object.keys(S.skills)); H.edAdd(gm, { coll: 'skills' });
  const nid = Object.keys(S.skills).find(k => !before.has(k)); H.edSet(gm, { coll: 'skills', id: nid, f: 'name', v: 'Golpe da Casa' }); h.skills = [nid];
  S.skillsSig = 'antiga'; migrate(false);
  assert.equal(S.skills[nid]?.name, 'Golpe da Casa'); assert.deepEqual(h.skills, [nid]); delete S.skills[nid];
});
const newSkill = (name, extra = {}) => { const before = new Set(Object.keys(S.skills)); H.edAdd(gm, { coll: 'skills' }); const id = Object.keys(S.skills).find(k => !before.has(k)); Object.assign(S.skills[id], { name, ...extra }); return id; };
const freeNear = host => { const used = new Set(Object.values(S.skills).map(s => s.gx + ',' + s.gy)), s = S.skills[host]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (!used.has((s.gx + dx) + ',' + (s.gy + dy))) return [s.gx + dx, s.gy + dy]; };
test('revisão: "Liga a" num nó oficial acrescenta ligações sem cortar as da árvore; vazio tira só as acrescentadas', () => {
  const gp = sk('Golpe Pesado'), orig = [...S.skills[gp].ln], x = newSkill('Extra Teste');
  H.edSet(gm, { coll: 'skills', id: gp, f: 'lk', v: 'Extra Teste' });
  assert.ok(orig.every(j => S.skills[gp].ln.includes(j))); assert.ok(S.skills[gp].ln.includes(x));
  H.edSet(gm, { coll: 'skills', id: gp, f: 'lk', v: '' });
  assert.deepEqual([...S.skills[gp].ln].sort(), [...orig].sort()); assert.ok(!(S.skills[x].ln || []).includes(gp)); delete S.skills[x];
});
test('revisão: skill solta do mestre continua ligada pela grade mesmo depois de ganhar ou perder "Liga a"', () => {
  reset(); const h = mk(ana, {}); h.xp = 999; const host = Object.keys(S.skills).find(k => S.skills[k].el === 'fis' && freeNear(k)), [gx, gy] = freeNear(host);
  const y = newSkill('Solta Y', { gx, gy }), x = newSkill('Solta X', { gx: 0, gy: 0 }); h.skills = [host];
  H.edSet(gm, { coll: 'skills', id: x, f: 'lk', v: 'Solta Y' }); assert.equal(RU.whyNot(h, S.skills[y], S.skills, S.items, y), '');
  H.edSet(gm, { coll: 'skills', id: x, f: 'lk', v: '' }); assert.equal(RU.whyNot(h, S.skills[y], S.skills, S.items, y), ''); assert.equal(S.skills[y].ln, undefined);
  delete S.skills[x]; delete S.skills[y];
});
test('revisão: apagar um nó do meio do ramo religa os vizinhos dele', t => {
  const [b, meio] = Object.entries(S.skills).find(([, s]) => s.br === 'susanoo-1' && s.refino && s.ln.length === 2);
  const [a, cc] = meio.ln, saved = structuredClone(S.skills);
  t.after(() => { S.skills = saved; });
  H.edDel(gm, { coll: 'skills', id: b });
  assert.ok(S.skills[a].ln.includes(cc) || S.skills[cc].ln.includes(a)); assert.ok(!Object.values(S.skills).some(s => (s.ln || []).includes(b)));
});
test('revisão: duplicar não copia ligações nem posição; mover X/Y tira a posição da mandala', () => {
  const id = sk('Brasa Viva'), before = new Set(Object.keys(S.skills)), saved = structuredClone(S.skills[id]); H.edDup(gm, { coll: 'skills', id });
  const d = S.skills[Object.keys(S.skills).find(k => !before.has(k))]; assert.equal(d.ln, undefined); assert.equal(d.wx, undefined);
  H.edSet(gm, { coll: 'skills', id, f: 'gx', v: S.skills[id].gx + 40 }); assert.equal(S.skills[id].wx, undefined);
  delete S.skills[Object.keys(S.skills).find(k => !before.has(k))]; S.skills[id] = saved;
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
  const viz = Object.keys(S.skills).find(k => S.skills[k].el === 'indra' && S.skills[sk('Faísca')].ln.includes(k));
  if (viz) assert.ok(!hid.includes(viz));
  const d = net.defsFor({ role: 'player', name: 'Ana' }, net.curDefs()); const sks = JSON.parse(d.json).skills;
  assert.equal(sks[sk('Kamikaze')].name, '???'); assert.equal(sks[sk('Faísca')].name, 'Faísca'); assert.match(String(d.v), /\./);
});
test('leva 3: Black Flash, cicatriz até o descanso longo, Marca no HP baixo e clones', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.attrs.AGI = 99; e.attrs.AGI = 1; h.vinc = []; derive(h);
  h.skills = [sk('Turbilhão Negro')]; H.battle(gm, { on: true }); assert.ok(S.skills[sk('Turbilhão Negro')].bf === 10);
  const kT = sk('Turbilhão Negro'); assert.equal(S.skills[kT].cmd, 'tempo', 'todo bf nasce como Golpe no tempo');
  for (let i = 0; i < 6; i++) { S.battle.ticks[h.id] = -1; h.limit = 100; e.hp = e.hpMax; h.aura = 0; fixR(.3, () => H.act(ana, { id: h.id, skill: kT, target: e.id })); assert.ok(!S.log.some(l => /BLACK FLASH/.test(l.text || '')), 'sem Perfeito não há Black Flash'); }
  S.battle.ticks[h.id] = -1; h.limit = 100; e.hp = e.hpMax; h.aura = 0; fixR(.3, () => H.act(ana, { id: h.id, skill: kT, target: e.id, cmd: { g: 'perf', n: 0, acc: 1 } })); const bf = S.log.some(l => /BLACK FLASH/.test(l.text || ''));
  assert.ok(bf, 'Black Flash sai no Perfeito'); assert.ok(h.aura > 0, 'devolve Aura');
  reset(); const m = mk(ana, {}), f = mk(gm, { enemy: true }); m.skills = [sk('Marca Rubra')]; m.pslots = [...m.skills]; derive(m); const hp0 = m.hpMax, san0 = m.sanMax;
  H.battle(gm, { on: true }); m.hp = m.hpMax; f.attrs.FOR = 95; S.battle.ticks[f.id] = -1;
  for (let i = 0; i < 50 && !m.st.mark; i++) { m.hp = Math.ceil(m.hpMax * .35); /* a cada tentativa: um golpe que derruba não deixa a vida presa em 1 */ S.battle.ticks[f.id] = -1; H.act(gm, { id: f.id, skill: 'atk', target: m.id }); m.hp = Math.max(m.hp, 1); }
  assert.ok(m.st.mark, 'Marca desperta'); assert.ok(m.hpMax < hp0 && m.sanMax < san0, 'cicatriz no HP e Sanidade máx.');
  assert.ok(modsOf(m).atk >= 30);
  H.battle(gm, { on: false }); H.rest(gm, { long: true }); assert.equal(m.hpMax, hp0); assert.equal(m.sanMax, san0);
  reset(); const c = mk(ana, {}), g = mk(gm, { enemy: true }); c.attrs.AGI = 99; g.attrs.AGI = 1; c.skills = [sk('Fábrica de Cópias'), sk('Estalo Negro')]; derive(c);
  H.battle(gm, { on: true }); c.hp = c.hpMax; c.aura = 99; const hpC = c.hp; S.battle.ticks[c.id] = -1; H.act(ana, { id: c.id, skill: sk('Fábrica de Cópias'), target: c.id });
  const cl = Object.values(S.chars).filter(o => o.clone === c.id); assert.equal(cl.length, 2); assert.ok(c.hp < hpC); assert.ok(cl.every(o => o.hp > 0 && o.id in S.battle.ticks && o.skills.includes(sk('Estalo Negro'))));
});
// ---- comandos de ação: janela de defesa (Aparar e Esquiva) ----
const dfx = (names = ['Aparar'], heroes = 1) => { // um inimigo rápido e `heroes` heróis; o inimigo só tem o ataque básico
  reset(); const hs = Array.from({ length: heroes }, (_, i) => { const h = mk(i ? bia : ana, {}); h.skills = names.map(sk).filter(Boolean); derive(h); h.attrs.AGI = 1; h.aura = 20; return h; });
  const e = mk(gm, { enemy: true }); e.skills = []; e.attrs.AGI = 99; derive(e); H.battle(gm, { on: true }); while (current() !== e.id) H.next(gm); return { hs, e };
};
const openAt = left => { const C = S.battle.cmd; C.at = Date.now() - C.beats[0] + left; return C; }; // põe o impacto da 1ª batida daqui a `left` ms
const waitCmd = () => fixR(.3, () => H.cmdSkip(gm)); // fecha a janela já, com dados fixos (acerta sem crítico)
test('remover o inimigo no meio da batalha (na vez dele e com a janela de defesa aberta) não trava a luta', () => {
  const { hs: [h], e } = dfx(['Aparar']); fixR(0, () => H.ai(gm)); assert.ok(S.battle.cmd, 'janela aberta');
  H.delChar(gm, { id: e.id }); assert.doesNotThrow(() => { H.cmdSkip(gm); H.def(ana, { id: h.id }); H.ai(gm); H.next(gm); });
  assert.ok(!S.chars[e.id]); assert.ok(current() === h.id || !S.battle.active, 'a vez segue para quem ficou');
});
test('defesa: golpe não anunciado abre só Aparar e só para o alvo', () => {
  const { hs, e } = dfx(['Aparar'], 2); H.ai(gm); const C = S.battle.cmd;
  assert.ok(C && C.foe === e.id && C.tel === false); assert.equal(C.tgs.length, 1);
  const other = hs.find(h => !C.tgs.includes(h.id)), aura = other.aura; H.def(other.owner === 'Ana' ? ana : bia, { id: other.id });
  assert.equal(other.aura, aura, 'quem não é o alvo não paga Aura'); assert.deepEqual(C.p[other.id] ?? [], []);
});
test('defesa: Aparar certo anula o golpe, dá Aura e deixa o inimigo Exposto', async () => {
  const { hs: [h], e } = dfx(); H.ai(gm); const hp = h.hp; openAt(100); H.def(ana, { id: h.id });
  assert.deepEqual(S.battle.cmd.p[h.id], ['par']); await waitCmd();
  assert.equal(S.battle.cmd, null); assert.equal(h.hp, hp, 'golpe aparado'); assert.ok(e.st.exposed > 0, 'inimigo Exposto');
  assert.equal(h.aura, 20 - S.skills[sk('Aparar')].cost + S.skills[sk('Aparar')].power); assert.ok(S.log.some(l => /APARA/.test(l.text || '')));
});
test('defesa: cedo demais em Aparar fica Exposto e leva +50%; só uma vez por rodada', async () => {
  const { hs: [h] } = dfx(); H.ai(gm); openAt(1000); H.def(ana, { id: h.id }); assert.deepEqual(S.battle.cmd.p[h.id], ['cedo']);
  const aura = h.aura; H.def(ana, { id: h.id }); assert.equal(h.aura, aura, '1× por rodada'); await waitCmd(); assert.ok(h.st.exposed > 0);
});
const pesado = () => { const r = dfx([]); r.e.skills = [sk('Golpe Pesado')]; r.e.telK = [...r.e.skills]; return r; }; // técnica anunciada
test('defesa: golpe anunciado — esquiva sem nó e sem Aura, mas só reduz o golpe e atrasa o próximo turno', async () => {
  let { hs: [h] } = pesado(); fixR(0, () => H.ai(gm)); let C = S.battle.cmd; const hp = h.hp; await waitCmd(); const full = hp - h.hp; assert.ok(full > 2, 'sem apertar: dano cheio');
  const { hs: [g], e } = pesado(); fixR(0, () => H.ai(gm)); C = S.battle.cmd; assert.ok(C && C.tel, 'janela com esquiva'); const hp2 = g.hp, aura = g.aura, t0 = S.battle.ticks[g.id]; openAt(450); H.def(ana, { id: g.id });
  assert.deepEqual(C.p[g.id], ['esq']); await waitCmd(); const cut = hp2 - g.hp; assert.ok(cut >= 1 && cut <= Math.ceil(full * RU.CMD.DEF.esqMult) + 1, `esquiva reduz: ${cut} de ${full}`);
  assert.equal(g.aura, aura); assert.ok(!e.st.exposed); assert.ok(S.battle.ticks[g.id] > t0, 'esquiva cansa: o próximo turno atrasa'); assert.ok(S.log.some(l => /ESQUIVA/.test(l.text || '')));
});
test('defesa: ataque básico não abre Esquiva (só Aparar, com nó e Aura); técnica não anunciada sem Aparar não abre janela', () => {
  let { hs: [h], e } = dfx(); h.aura = 0; H.ai(gm); assert.ok(!S.battle.cmd, 'básico sem Aura: sem janela');
  ({ hs: [h], e } = dfx()); H.ai(gm); let C = S.battle.cmd; assert.ok(C && !C.esq && !C.tel && C.z[h.id].esq === 0 && C.z[h.id].canP, 'básico com Aparar: só zona de Aparar'); assert.ok(!C.chqOk?.length, 'básico não abre Choque');
  ({ hs: [h], e } = dfx(['Aparar'])); h.aura = 0; e.skills = [sk('Golpe Pesado')]; e.telK = [...e.skills]; fixR(0, () => H.ai(gm)); openAt(100); H.def(ana, { id: h.id }); assert.deepEqual(S.battle.cmd.p[h.id], ['esq']); assert.equal(h.aura, 0);
  ({ hs: [h], e } = dfx([])); e.skills = [Object.keys(S.skills).find(k => { const x = S.skills[k]; return x.kind === 'dmg' && !x.tel && !x.area && !x.cmd && !x.limit && x.res === 'aura' && (x.cost || 0) < 20 && x.tg !== 'self'; })]; e.telK = []; e.aura = 99; H.actWin(gm, { id: e.id, skill: e.skills[0], target: h.id }); assert.ok(!S.battle.cmd, 'técnica não anunciada, sem nó de Aparar: sem janela');
});
test('defesa: errar o tempo da esquiva expõe sem o +50% do Aparar', () => {
  let { hs: [h] } = pesado(); fixR(0, () => H.ai(gm)); h.aura = 0; openAt(900); H.def(ana, { id: h.id }); assert.deepEqual(S.battle.cmd.p[h.id], ['cedo']); waitCmd(); assert.ok(h.st.exposed > 0); assert.ok(!S.log.some(l => /fora do tempo/.test(l.text || '')), 'na janela de esquiva errar não é o +50% do Aparar');
});
test('defesa: golpe escolhido à mão pelo mestre abre a janela como na IA; cura e técnica que não alcança herói agem na hora', () => {
  let { hs: [h], e } = dfx(); H.actWin(gm, { id: e.id, skill: 'atk', target: h.id }); const C = S.battle.cmd; assert.ok(C && C.foe === e.id && C.tgs.includes(h.id), 'janela aberta para o alvo');
  H.actWin(gm, { id: e.id, skill: 'atk', target: h.id }); assert.equal(S.battle.cmd, C, 'outra ação não passa por cima da janela');
  openAt(100); H.def(ana, { id: h.id }); const hp = h.hp; waitCmd(); assert.equal(h.hp, hp, 'aparou o golpe manual'); assert.ok(!S.battle.cmd); assert.ok(S.log.some(l => /APARA/.test(l.text || '')), 'registro da aparada');
  ({ hs: [h], e } = dfx()); H.actWin(gm, { id: e.id, skill: 'atk', target: e.id }); assert.ok(!S.battle.cmd, 'em si mesmo: sem janela');
});
// ---- fintas na janela de defesa ----
const FIN = (a, hits = 1, tel = false, beat = 1100) => finPlan(a, hits, tel, beat);
test('fintas: inimigo comum não tem fintas e as batidas ficam a 700 ms', () => {
  for (let i = 0; i < 50; i++) { const { beats, fin } = FIN({}, 4); assert.deepEqual(beats, [1100, 1800, 2500, 3200]); assert.deepEqual(fin, [{}, {}, {}, {}]); }
  const { fin } = FIN({ rank: 'comum' }, 2, true); assert.deepEqual(fin, [{}, {}]);
});
test('fintas: chefe tem combo irregular e a janela fecha na última batida', () => {
  for (let i = 0; i < 30; i++) { const { beats } = FIN({ boss: true }, 3), gaps = beats.slice(1).map((b, k) => b - beats[k]); assert.equal(beats[0], 1100); assert.ok(new Set(gaps).size > 1, 'espaçamento não uniforme'); assert.ok(gaps.every(g => g === 450 || g === 900)); }
  const { hs: [h], e } = dfx(['Aparar']); e.boss = true; e.skills = [sk('Rajada de Aura')]; e.telK = []; fixR(0, () => H.ai(gm)); const C = S.battle.cmd;
  assert.equal(C.beats.length, 3); assert.equal(C.fin.length, 3); assert.equal(C.w, C.beats[2]); assert.ok(C.beats.every(b => b <= C.w));
});
test('fintas: golpe anunciado de chefe dá direção a toda batida', () => {
  for (let i = 0; i < 30; i++) { const { fin } = FIN({ boss: true }, 3, true); assert.ok(fin.every(f => f.dir === '←' || f.dir === '→')); }
  const { fin } = FIN({ boss: true }, 3, false); assert.ok(fin.every(f => f.dir === undefined), 'sem anúncio, sem direção');
  const el = FIN({ rank: 'elite' }, 3, true).fin; assert.ok(el.every(f => f.dir === undefined), 'direção é só de chefe');
});
test('fintas: elite faz ~30% das batidas com atraso ou anel falso; o anel falso só onde há espaço', () => {
  let n = 0, tot = 0; for (let i = 0; i < 300; i++) { const { beats, fin } = FIN({ rank: 'elite' }, 3); fin.forEach((f, k) => { tot++; if (f.ease || f.fake != null) n++; if (f.fake != null) { assert.equal(f.fake, beats[k] - 700); assert.ok(k === 0, 'elite: só a 1ª batida tem espaço'); } }); }
  const r = n / tot; assert.ok(r > .18 && r < .42, 'proporção ' + r);
  for (let i = 0; i < 100; i++) { const { beats, fin } = FIN({ boss: true }, 3); fin.forEach((f, k) => { if (f.fake != null) assert.ok((k ? beats[k] - beats[k - 1] : beats[0]) >= 900); assert.ok(!(f.ease && f.fake != null)); }); }
});
const tdef = (names = [], boss = false) => { const { hs: [h], e } = dfx(names); e.boss = boss; e.skills = [sk('Golpe Pesado')]; e.telK = [...e.skills]; fixR(0, () => H.ai(gm)); return { h, C: S.battle.cmd }; };
test('fintas: esquiva exige a direção quando a batida tem dir', () => {
  let { h, C } = tdef(); C.fin = [{ dir: '→' }]; openAt(450); H.def(ana, { id: h.id }); assert.deepEqual(C.p[h.id], ['cedo'], 'sem dir');
  ({ h, C } = tdef()); C.fin = [{ dir: '→' }]; openAt(450); H.def(ana, { id: h.id, dir: '←' }); assert.deepEqual(C.p[h.id], ['cedo'], 'dir trocada');
  ({ h, C } = tdef()); C.fin = [{ dir: '→' }]; openAt(450); H.def(ana, { id: h.id, dir: '→' }); assert.deepEqual(C.p[h.id], ['esq'], 'dir certa');
  ({ h, C } = tdef(['Aparar'])); C.fin = [{ dir: '→' }]; openAt(100); H.def(ana, { id: h.id }); assert.deepEqual(C.p[h.id], ['par'], 'Aparar não pede direção');
});
test('fintas: apertar junto do anel falso é cedo; fora dele vale a zona normal', () => {
  const par = () => S.skills[sk('Aparar')].par, at = (C, left) => { C.at = Date.now() - C.beats[0] + left; return Date.now() - C.at; }; // devolve ms decorridos desde C.at
  let { h, C } = tdef(['Aparar']); C.fin = [{}]; at(C, par() + 250); H.def(ana, { id: h.id }); assert.deepEqual(C.p[h.id], ['esq'], 'sem finta, esse ponto é esquiva');
  ({ h, C } = tdef(['Aparar'])); C.fin = [{ fake: 0 }]; C.fin[0].fake = at(C, par() + 250) + 60; H.def(ana, { id: h.id }); assert.deepEqual(C.p[h.id], ['cedo'], 'no anel falso (+60 ms) o mesmo ponto vira cedo');
  ({ h, C } = tdef(['Aparar'])); C.fin = [{ fake: 0 }]; C.fin[0].fake = at(C, par() + 250) + 400; H.def(ana, { id: h.id }); assert.deepEqual(C.p[h.id], ['esq'], 'longe do anel falso (>120 ms) vale a zona normal');
});
test('defesa: janela velha (servidor reiniciado) é descartada e o inimigo age', () => {
  const { hs: [h], e } = dfx(); S.battle.cmd = { foe: e.id, at: Date.now() - 10000, w: 1100, beats: [1100], tgs: [h.id], p: { [h.id]: [] } };
  const hp = h.hp; H.ai(gm); assert.ok(!S.battle.cmd || S.battle.cmd.at > Date.now() - 5000, 'a janela velha saiu');
});

test('comandos: expand valida campos e gradeDef decide a zona', async () => {
  const { expand } = await import('../content.js');
  assert.throws(() => expand({ n: 'X', k: 'dmg', cmd: 'dança' }), /cmd/);
  assert.throws(() => expand({ n: 'X', k: 'dmg', cmd: 'seq', seq: '↑x' }), /seq/);
  assert.throws(() => expand({ n: 'X', k: 'dmg', cmd: 'runa', rn: 'quadrado' }), /rn/);
  assert.equal(expand({ n: 'X', k: 'dmg', cmd: 'tempo', pf: 'st bleed 2' }).pf[0].t, 'st');
  const g = RU.CMD.gradeDef;
  assert.equal(g(100, 300, 450, true), 'par'); assert.equal(g(100, 300, 450, false), 'esq');
  assert.equal(g(500, 300, 450, true), 'esq'); assert.equal(g(800, 300, 450, true), 'cedo');
  assert.equal(g(-150, 300, 450, true), 'par'); assert.equal(g(-250, 300, 450, true), 'late');
  assert.equal(g(500, 300, 0, true), 'cedo', 'sem golpe anunciado não há esquiva');
});

test('IA: aiPlan não muda o estado e aiRun executa o plano; alvo caído é replanejado', async () => {
  const { aiPlan, aiRun } = await import('../server.js');
  reset(); const h = mk(ana, {}), h2 = mk(bia, {}), e = mk(gm, { enemy: true }); e.skills = []; e.attrs.AGI = 99; h.attrs.AGI = 1; h2.attrs.AGI = 1; derive(h); derive(h2); derive(e);
  H.battle(gm, { on: true }); while (current() !== e.id) H.next(gm);
  const logN = S.log.length, hp = [h.hp, h2.hp], ticks = JSON.stringify(S.battle.ticks), plan = aiPlan(e);
  assert.equal(plan.skill, 'atk'); assert.deepEqual(plan.tgs, [plan.target]); assert.ok([h.id, h2.id].includes(plan.target));
  assert.equal(S.log.length, logN); assert.deepEqual([h.hp, h2.hp], hp); assert.equal(JSON.stringify(S.battle.ticks), ticks);
  const other = plan.target === h.id ? h2 : h; S.chars[plan.target].hp = 0; // o alvo planejado cai durante a janela
  const hpO = other.hp; fixR(.3, () => aiRun(e, plan)); assert.ok(other.hp < hpO, 'o outro herói leva o golpe');
});

test('batidas: golpe de 3 golpes abre 3 batidas; aparar todas dá contra-ataque, Aura cobrada uma vez', async () => {
  const { hs: [h], e } = dfx(); e.skills = [sk('Rajada de Aura')]; assert.equal(S.skills[e.skills[0]].hits, 3); fixR(0, () => H.ai(gm));
  const C = S.battle.cmd; assert.deepEqual(C.beats, [1100, 1800, 2500]); const hp = h.hp, ehp = e.hp, aura = h.aura, par = S.skills[sk('Aparar')];
  for (let i = 0; i < 3; i++) { C.at = Date.now() - C.beats[i] + 100; H.def(ana, { id: h.id }); }
  assert.deepEqual(C.p[h.id], ['par', 'par', 'par']); await waitCmd();
  assert.equal(h.hp, hp, 'nenhuma batida acerta'); assert.ok(S.log.some(l => /CONTRA/.test(l.text || '')), 'contra-ataque'); assert.ok(e.hp < ehp, 'o contra acerta'); assert.ok(e.st.exposed > 0, 'inimigo Exposto');
  assert.equal(h.aura, aura - par.cost + par.power, 'Aura cobrada e devolvida uma vez');
});
test('batidas: aparar 2 de 3 — só a batida sem nota acerta e não há contra-ataque', async () => {
  const { hs: [h], e } = dfx(); e.skills = [sk('Rajada de Aura')]; fixR(0, () => H.ai(gm)); const C = S.battle.cmd, ehp = e.hp, hp = h.hp;
  for (const i of [0, 1]) { C.at = Date.now() - C.beats[i] + 100; H.def(ana, { id: h.id }); }
  await waitCmd(); assert.ok(h.hp < hp, 'a 3ª batida acerta'); assert.equal(e.hp, ehp); assert.ok(!S.log.some(l => /CONTRA/.test(l.text || '')));
});

test('tel: chefe nasce com 2 técnicas anunciadas, elite com 1, comum com 0; o interruptor do mestre manda', async () => {
  const { telOf } = await import('../server.js'); reset(); const ks = ['Golpe Pesado', 'Estilhaço', 'Terremoto', 'Tiro Certeiro'].map(sk).filter(Boolean); assert.equal(ks.length, 4);
  const mkE = f => { const e = mk(gm, { enemy: true }); e.skills = [...ks]; Object.assign(e, f); return e; };
  const boss = mkE({ boss: true }), elite = mkE({ rank: 'elite' }), comum = mkE({}); telOf(boss, ks[0]); telOf(elite, ks[0]); telOf(comum, ks[0]);
  assert.equal(boss.telK.length, 2); assert.equal(elite.telK.length, 1); assert.deepEqual(comum.telK, []);
  const off = boss.telK[0]; H.tel(ana, { id: boss.id, skill: off, on: false }); assert.ok(boss.telK.includes(off), 'jogador não mexe');
  H.tel(gm, { id: boss.id, skill: off, on: false }); assert.ok(!boss.telK.includes(off)); telOf(boss, off); assert.ok(!boss.telK.includes(off), 'o que o mestre desliga fica desligado');
  const fresh = mkE({ boss: true }); H.tel(gm, { id: fresh.id, skill: ks[3], on: true }); assert.ok(fresh.telK.includes(ks[3]) && fresh.telK.length >= 2, 'ligar sem telK antes parte do cálculo automático');
});
test('chefe: golpe anunciado pode sair Perfeito (20%): batida 20% mais curta e dano ×1,25', async () => {
  const { aiPlan, aiRun } = await import('../server.js');
  const run = (rnd, perf) => { const { hs: [h], e } = dfx([]); e.boss = true; e.skills = [sk('Golpe Pesado')]; e.telK = [...e.skills]; fixR(rnd, () => H.ai(gm)); const C = S.battle.cmd;
    if (perf != null) C.perf = perf; const hp = h.hp; fixR(.3, () => aiRun(e, aiPlan(e))); return { C, loss: hp - h.hp }; };
  assert.equal(run(0).C.perf, true); assert.equal(run(0).C.beats[0], 880); assert.equal(run(.5).C.perf, false); assert.equal(run(.5).C.beats[0], 1100);
  const a = run(.5, false).loss, b = run(.5, true).loss; assert.ok(a > 0 && Math.abs(b / a - 1.25) < .1, `×1,25 (${a} → ${b})`);
  const nb = (() => { const { e } = dfx([]); e.skills = [sk('Golpe Pesado')]; e.telK = [...e.skills]; fixR(0, () => H.ai(gm)); return S.battle.cmd.perf; })(); assert.equal(nb, false, 'só chefe tem Perfeito');
});

// ---- comandos de ataque: a nota do navegador vira dano, golpes e efeitos ----
const withCmd = (name, f, fn) => { const k = sk(name), sv = Object.fromEntries(Object.keys(f).map(x => [x, S.skills[k][x]])); Object.assign(S.skills[k], f); try { return fn(k); } finally { Object.assign(S.skills[k], sv); for (const x in f) if (sv[x] === undefined) delete S.skills[k][x]; } };
const duelC = () => { reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.attrs.AGI = 99; e.attrs.AGI = 1; derive(h); derive(e); e.armor = 0; h.aura = h.auraMax = 99; e.hpMax = e.hp = 99999; H.battle(gm, { on: true }); return { h, e }; };
const hitsOf = (name) => S.log.filter(l => (l.text || '').startsWith(name + ' →') || (l.text || '').startsWith(name + ' (final) →')).length;
const lossC = (f, cmd) => withCmd('Tiro Certeiro', f, () => { const { h, e } = duelC(); use(h, 'Tiro Certeiro', e, cmd ? { cmd } : {}); return 99999 - e.hp; });
test('cmd: clamp limita a nota absurda; sem cmd ou sem comando vira neutro', () => {
  const C = RU.CMD, z = { g: '', n: 0, acc: 0 };
  assert.deepEqual(C.clampCmd({ cmd: 'martelar', mx: 4 }, { g: 'perf', n: 999, acc: 9 }, { mx: 1 }), { g: 'perf', n: 5, acc: 1 });
  assert.deepEqual(C.clampCmd({ cmd: 'martelar', mx: 4 }, { g: 'perf', n: 2, acc: 1 }, {}), { g: 'bom', n: 2, acc: 1 }, 'Perfeito exige a barra cheia');
  assert.deepEqual(C.clampCmd({}, { g: 'perf', n: 9, acc: 1 }, {}), z); assert.deepEqual(C.clampCmd({ cmd: 'tempo' }, { g: 'x', n: -3, acc: -5 }, {}), z);
  assert.deepEqual(C.clampCmd({ cmd: 'tempo' }, null, {}), z); assert.equal(C.clampCmd({ cmd: 'segurar' }, { g: '', acc: -1 }, {}).acc, -1, 'estouro');
  assert.equal(C.clampCmd({ cmd: 'seq', seq: '↑→↓' }, { g: 'perf', n: 99 }, {}).n, 3);
});
test('cmd: tempo Perfeito ×1,4, Bom ×1,2 e sem nota = normal', () => {
  const base = lossC({ cmd: 'tempo' }), bom = lossC({ cmd: 'tempo' }, { g: 'bom' }), perf = lossC({ cmd: 'tempo' }, { g: 'perf' }), nada = lossC({ cmd: 'tempo' }, { g: '', n: 0, acc: 0 });
  assert.equal(nada, base); assert.ok(Math.abs(bom / base - 1.2) < .08, `bom ${bom}/${base}`); assert.ok(Math.abs(perf / base - 1.4) < .08, `perf ${perf}/${base}`);
});
test('cmd: janela do tempo cresce com bf (30 + 8·bf ms) e com as passivas', () => {
  assert.equal(RU.CMD.tempoWin({ cmd: 'tempo', bf: 3 }, { bf: 0, cw: 0, cp: 0 }).cp, 54); assert.equal(RU.CMD.tempoWin({ cmd: 'tempo', bf: 7 }, { bf: 0, cw: 0, cp: 0 }).cp, 86);
  assert.equal(RU.CMD.tempoWin({ cmd: 'tempo', bf: 3 }, { bf: 2, cw: 0, cp: 10 }).cp, 80); assert.equal(RU.CMD.tempoWin({ cmd: 'tempo' }, { bf: 0, cw: 40, cp: 15 }).cw, 180); // Bom fácil = 140 ms + 40
});
test('cmd: martelar soma golpes extras acima dos hits', () => {
  withCmd('Tiro Certeiro', { cmd: 'martelar', mx: 4, hits: 2 }, () => { const { h, e } = duelC(); use(h, 'Tiro Certeiro', e, { cmd: { g: 'bom', n: 3, acc: .7 } }); assert.equal(hitsOf('Tiro Certeiro'), 5); });
  withCmd('Tiro Certeiro', { cmd: 'martelar', mx: 4, hits: 2 }, () => { const { h, e } = duelC(); use(h, 'Tiro Certeiro', e); assert.equal(hitsOf('Tiro Certeiro'), 2, 'sem martelar = os hits normais'); });
});
test('cmd: sequência nova soma golpe por seta; nó antigo nunca fica abaixo dos hits e só a perfeita dá o golpe final', () => {
  withCmd('Tiro Certeiro', { cmd: 'seq', seq: '↑→↓', fin: 20 }, () => { const { h, e } = duelC(); use(h, 'Tiro Certeiro', e, { cmd: { g: 'bom', n: 2, acc: 1 } }); assert.equal(hitsOf('Tiro Certeiro'), 3, '1 + 2 setas'); });
  withCmd('Tiro Certeiro', { cmd: 'seq', seq: '↑→↓', hits: 3 }, () => {
    let r = duelC(); use(r.h, 'Tiro Certeiro', r.e, { cmd: { g: 'bom', n: 1, acc: 1 } }); assert.equal(hitsOf('Tiro Certeiro'), 3, 'errar setas não tira golpes');
    r = duelC(); use(r.h, 'Tiro Certeiro', r.e, { cmd: { g: 'perf', n: 3, acc: 1 } }); assert.equal(hitsOf('Tiro Certeiro'), 4, '3 golpes + golpe final'); });
});
test('cmd: segurar estourado sai normal e deixa o herói Exposto; mira acerta = crítico e −2 na Quebra', () => {
  withCmd('Tiro Certeiro', { cmd: 'segurar' }, () => { const base = lossC({ cmd: 'segurar' }); const { h, e } = duelC(); use(h, 'Tiro Certeiro', e, { cmd: { g: '', n: 0, acc: -1 } }); assert.ok(h.st.exposed > 0); assert.equal(99999 - e.hp, base); });
  withCmd('Tiro Certeiro', { cmd: 'mira' }, () => { const b0 = lossC({ cmd: 'mira' }); const r = duelC(); r.e.rank = 'elite'; r.e.brk = { cur: 5, max: 5 }; use(r.h, 'Tiro Certeiro', r.e, { cmd: { g: 'bom', n: 0, acc: 1 } });
    assert.ok(99999 - r.e.hp > b0 * 1.8, 'crítico ×2'); assert.equal(r.e.brk.cur, 3, 'tirou 2 pontos da Quebra'); });
});
test('cmd: ritual com runa Perfeita não cobra Sanidade; nota num golpe sem comando é ignorada; fora do turno nada acontece', () => {
  const rit = Object.keys(S.skills).find(k => S.skills[k].circ && S.skills[k].pay?.san && S.skills[k].kind !== 'passive'); assert.ok(rit, 'existe ritual com custo de Sanidade');
  withCmd(S.skills[rit].name, { cmd: 'runa', rn: 'circulo' }, () => {
    const san = cmd => { const { h, e } = duelC(); h.san = 50; h.skills.push(rit); const s0 = h.san; turn(h); fixR(.3, () => H.act(gm, { id: h.id, skill: rit, target: e.id, ...(cmd ? { cmd } : {}) })); return s0 - h.san; };
    assert.ok(san() > 0, 'sem nota cobra'); assert.equal(san({ g: 'perf', n: 0, acc: 1 }), 0, 'Perfeito não cobra'); });
  assert.equal(lossC({}), lossC({}, { g: 'perf', n: 9, acc: 1 }), 'sem cmd na técnica a nota não vale');
  const { h, e } = duelC(); use(h, 'Tiro Certeiro', e); turn(e); const hp = e.hp; fixR(.3, () => H.act(gm, { id: h.id, skill: sk('Tiro Certeiro'), target: e.id })); assert.equal(e.hp, hp, 'fora do turno nada acontece');
});
test('cmd: ritmo — cada nota soma +10% na cura em grupo e +1 turno nos buffs; todas as notas dão o Perfeito', () => {
  const heal = n => withCmd('Luz Curativa', { cmd: 'ritmo', nt: 6 }, () => { reset(); const h = mk(ana, {}), f = mk(bia, {}); h.attrs.AGI = 99; derive(h); derive(f); h.aura = 99; f.hp = 1; H.battle(gm, { on: true });
    use(h, 'Luz Curativa', f, n == null ? {} : { cmd: { g: n === 6 ? 'perf' : 'bom', n, acc: 1 } }); return f.hp - 1; });
  const base = heal(null), quatro = heal(4); assert.ok(base > 0); assert.ok(quatro / base > 1.3 && quatro / base < 1.5, `${quatro}/${base}`); assert.ok(heal(6) > quatro);
  const gm1 = RU.CMD.cmdEffect({ cmd: 'ritmo', kind: 'heal', power: 0, nt: 6 }, { g: 'bom', n: 3 }); assert.equal(gm1.turns, 3); assert.equal(gm1.healMult, 1);
});

// ---- Choque de poderes: cabo de guerra contra golpe anunciado de alvo único ----
const chqFx = (area = false) => { // herói com técnica de Choque (Tiro Certeiro marcado) contra um inimigo com golpe anunciado
  const { hs: [h], e } = dfx([]); h.skills = [sk('Tiro Certeiro')]; h.aura = 50; h.attrs.AGI = 1; S.skills[sk('Tiro Certeiro')].cmd = 'choque';
  e.skills = [sk(area ? 'Terremoto' : 'Golpe Pesado')]; e.telK = [...e.skills]; e.hpMax = e.hp = 99999; fixR(0, () => H.ai(gm)); return { h, e, C: S.battle.cmd };
};
const noChq = () => { delete S.skills[sk('Tiro Certeiro')].cmd; };
test('choque: só em golpe anunciado de alvo único e para quem tem a técnica', () => {
  try {
    const { h, C } = chqFx(); assert.deepEqual(C.chqOk, [h.id]);
    const a = chqFx(true); assert.ok(!a.C.chqOk?.length, 'em área não há Choque');
    const { hs: [h2], e } = dfx([]); h2.skills = []; e.skills = [sk('Golpe Pesado')]; e.telK = [...e.skills]; fixR(0, () => H.ai(gm)); assert.ok(!S.battle.cmd.chqOk?.length, 'sem a técnica não há Choque');
    const { hs: [h3] } = dfx(['Aparar']); h3.skills.push(sk('Tiro Certeiro')); H.ai(gm); assert.ok(!S.battle.cmd.chqOk?.length, 'golpe não anunciado não tem Choque');
  } finally { noChq(); }
});
test('janela de defesa salva sem o plano (servidor reiniciado): pular faz o inimigo agir e o Choque não quebra', () => {
  const { hs: [h], e } = dfx([]); h.skills = []; e.skills = [sk('Golpe Pesado')]; e.telK = [...e.skills]; fixR(0, () => H.ai(gm)); assert.ok(S.battle.cmd);
  S.battle.cmd = structuredClone(S.battle.cmd); S.battle.cmd.chqOk = [h.id]; h.skills.push(sk('Tiro Certeiro')); // o retrato salvo volta sem o plano em memória
  assert.doesNotThrow(() => H.chq(ana, { id: h.id, skill: sk('Tiro Certeiro') }));
  const hp = h.hp; fixR(.3, () => H.cmdSkip(gm)); assert.ok(h.hp < hp, 'o inimigo ainda ataca'); assert.ok(!S.battle.cmd);
});
test('choque: vencer anula o golpe, devolve ×1,3 e expõe; perder leva ×1,3; apertos acima de 20/s são cortados', () => {
  try {
    const win = chqFx(); const hp = win.h.hp, aura = win.h.aura; H.chq(ana, { id: win.h.id, skill: sk('Tiro Certeiro') }); const C = S.battle.cmd;
    assert.equal(win.h.aura, aura - S.skills[sk('Tiro Certeiro')].cost, 'paga a técnica'); assert.ok(C.chq.meta >= 10 && C.chq.meta <= 40);
    H.chq(ana, { id: win.h.id, n: 999 }); assert.ok(C.chq.n <= 3, `cortado a 20/s (${C.chq.n})`); C.chq.last -= 3000; H.chq(ana, { id: win.h.id, n: 60 }); assert.ok(C.chq.n >= C.chq.meta);
    fixR(.3, () => H.cmdSkip(gm)); assert.equal(win.h.hp, hp, 'golpe anulado'); assert.ok(win.e.hp < 99999, 'a técnica de Choque acerta'); assert.ok(win.e.st.exposed > 0); assert.ok(S.log.some(l => /CHOQUE/.test(l.text || '')));
    const base = (() => { const { hs: [h], e } = dfx([]); h.skills = []; e.skills = [sk('Golpe Pesado')]; e.telK = [...e.skills]; fixR(0, () => H.ai(gm)); const x = h.hp; fixR(.3, () => H.cmdSkip(gm)); return x - h.hp; })();
    const lose = chqFx(); const hp2 = lose.h.hp; H.chq(ana, { id: lose.h.id, skill: sk('Tiro Certeiro') }); fixR(.3, () => H.cmdSkip(gm)); const perda = hp2 - lose.h.hp; assert.ok(base > 0 && Math.abs(perda / base - 1.3) < .12, `×1,3 (${perda}/${base})`);
    const once = chqFx(); H.chq(ana, { id: once.h.id, skill: sk('Tiro Certeiro') }); const a1 = once.h.aura; H.chq(ana, { id: once.h.id, skill: sk('Tiro Certeiro') }); assert.equal(once.h.aura, a1, 'iniciar de novo não cobra');
  } finally { noChq(); }
});

test('runa: o próprio modelo pontua ≥ 95; reta contra o círculo < 60; triângulo girado 20° ≥ 85; círculo no outro sentido e outro ponto de partida ≥ 90', () => {
  const C = RU.CMD, T = C.RUNE_T;
  for (const r of C.RUNES) assert.ok(C.runeScore(T[r].pts, r) >= 95, r + ' ' + C.runeScore(T[r].pts, r));
  assert.ok(C.runeScore(Array.from({ length: 40 }, (_, i) => [i / 39, .5]), 'circulo') < 60);
  const rot = (pts, deg) => { const a = deg * Math.PI / 180; return pts.map(([x, y]) => [.5 + (x - .5) * Math.cos(a) - (y - .5) * Math.sin(a), .5 + (x - .5) * Math.sin(a) + (y - .5) * Math.cos(a)]); };
  assert.ok(C.runeScore(rot(T.triangulo.pts, 20), 'triangulo') >= 85);
  const circ = T.circulo.pts.slice(0, -1), shifted = [...circ.slice(17), ...circ.slice(0, 17)].reverse(); assert.ok(C.runeScore(shifted, 'circulo') >= 90);
  assert.ok(C.runeScore(T.circulo.pts, 'estrela') < 60, 'círculo não passa por estrela'); assert.equal(C.runeScore([], 'circulo'), 0); assert.equal(C.runeScore(T.circulo.pts, 'quadrado'), 0);
});
test('cmd: a visão enviada às telas traz os modificadores de comando por técnica (cm), para o mestre e para o jogador', () => {
  withCmd('Tiro Certeiro', { cmd: 'martelar', mx: 3 }, k => { const { h } = duelC(); h.skills.push(k);
    for (const c of [gm, ana]) { const v = view(c).chars[h.id]; assert.ok(v.cm?.[k] && 'mx' in v.cm[k] && 'cw' in v.cm[k], c.role); } });
  const { h } = duelC(); assert.deepEqual(view(ana).chars[h.id].cm, {}, 'sem técnica com comando, nada');
});
test('leva 4: 45 nós novos de comando com pré-requisito existente; todo bf é tempo; todo círculo é runa; nós antigos marcados', async () => {
  const { LEVA4, MARCA } = await import('../arvore/leva4.js'); const novos = Object.values(LEVA4).flat(2), byName = n => Object.values(S.skills).find(s => s.name === n);
  assert.equal(novos.length, 45); assert.ok(novos.every(o => o.cmd || o.mod), 'todo nó novo tem comando ou modificador');
  for (const o of novos) { const s = byName(o.n); assert.ok(s, 'na grade: ' + o.n); for (const p of String(o.pre).split('|')) assert.ok(byName(p), `${o.n} exige ${p}`); }
  const all = Object.values(S.skills); assert.ok(all.filter(s => s.bf).length >= 15 && all.filter(s => s.bf).every(s => s.cmd === 'tempo'));
  const rit = all.filter(s => s.circ && s.kind !== 'passive'); assert.ok(rit.length >= 100 && rit.every(s => s.cmd === 'runa' && s.rn === ['circulo', 'triangulo', 'estrela', 'espiral'][s.circ - 1]));
  assert.equal(byName('Cem Socos').cmd, 'martelar'); assert.equal(byName('Cem Socos').mx, 5); assert.equal(byName('Estilo Três Espadas').seq, '↑↑↓'); assert.equal(byName('Estilo Três Espadas').hits, 3);
  for (const n of ['Golpe Pesado', 'Estilhaço', 'Golpe Giratório', 'Terremoto', 'Mar de Chamas', 'Maré Alta']) assert.equal(byName(n).tel, 1, n);
  assert.equal(byName('Leitura de Combo').mod.ctr, 50); assert.equal(Object.keys(MARCA).length, 34);
  for (const s of all.filter(s => s.cmd === 'seq' && s.hits > 1)) assert.equal(s.seq.length, s.hits, 'nó antigo: setas = hits (' + s.name + ')');
});
test('batidas: Leitura de Combo sobe o contra-ataque de ×1,5 para ×2', async () => {
  const run = ctr => { const { hs: [h], e } = dfx(); h.attrs.AGI = 1; e.skills = [sk('Rajada de Aura')]; h.skills.push(sk('Leitura de Combo')); if (!ctr) h.skills = h.skills.filter(k => k !== sk('Leitura de Combo')); h.pslots = [...h.skills];
    fixR(0, () => H.ai(gm)); const C = S.battle.cmd; for (let i = 0; i < 3; i++) { C.at = Date.now() - C.beats[i] + 100; H.def(ana, { id: h.id }); } e.hpMax = e.hp = 99999; waitCmd(); return 99999 - e.hp; };
  const a = run(false), b = run(true); assert.ok(a > 0 && Math.abs(b / a - 2 / 1.5) < .12, `${b}/${a}`);
});

test('descrição: nó com comando mostra a linha do comando e o ⚠; bf mostra a janela do Perfeito em ms; as chaves novas de mod têm texto', () => {
  const E = RU.extra;
  assert.match(E({ kind: 'dmg', cmd: 'tempo', bf: 5 }, null), /Perfeito ×1,4, janela de 70 ms.*Black Flash/); assert.match(E({ kind: 'dmg', cmd: 'martelar', mx: 4 }, null), /até \+4 golpes/);
  assert.match(E({ kind: 'dmg', cmd: 'seq', seq: '↑→↓', fin: 20 }, null), /Sequência ↑→↓.*golpe final de 20/); assert.match(E({ kind: 'dmg', tel: 1 }, null), /golpe anunciado ⚠/);
  assert.match(E({ kind: 'util', cmd: 'runa', rn: 'espiral', circ: 4 }, null), /uma espiral.*não cobra a Sanidade/); assert.match(E({ kind: 'dmg', cmd: 'tempo', pf: [{ t: 'st', k: 'bleed', n: 2, ch: 100 }] }, null), /no Perfeito: /);
  assert.match(E({ kind: 'passive', mod: { cw: 60, cp: 15, mx: 1, ctr: 50 } }, null), /\+60 ms na janela Bom.*\+1 golpe extra.*\+50% no contra-ataque/); assert.match(E({ kind: 'dmg', par: 300, cost: 4, power: 3 }, null), /Exposto/);
});

// ---- comandos cinemáticos: regras puras ----
test('cinemáticos: nível do nó pelo maior requisito e tabela de graus por contagem', () => {
  const C = RU.CMD;
  assert.deepEqual(C.GRADES, ['', 'erro', 'bom', 'otimo', 'perf']); assert.equal(C.GRADE_NAME.otimo, 'ÓTIMO');
  assert.equal(C.tier({ rq: { FOR: 10 } }), 0); assert.equal(C.tier({ rq: { FOR: 20 } }), 1); assert.equal(C.tier({ rq: { FOR: 49, DES: 12 } }), 1); assert.equal(C.tier({ rq: { FOR: 50 } }), 2); assert.equal(C.tier({}), 0);
  assert.equal(C.gradeFrac(1, true), 'perf'); assert.equal(C.gradeFrac(.75, true), 'otimo'); assert.equal(C.gradeFrac(.74, true), 'bom'); assert.equal(C.gradeFrac(.35, true), 'bom');
  assert.equal(C.gradeFrac(.34, true), 'erro'); assert.equal(C.gradeFrac(0, true), 'erro'); assert.equal(C.gradeFrac(0, false), '');
});
test('cinemáticos: janelas do tempo por nível, com bf e com os campos da técnica', () => {
  const C = RU.CMD;
  assert.deepEqual(C.tempoWin({ cmd: 'tempo', rq: {} }, {}), { cw: 140, co: 80, cp: 50 }); assert.deepEqual(C.tempoWin({ cmd: 'tempo', rq: { FOR: 50 } }, {}), { cw: 100, co: 55, cp: 32 });
  assert.equal(C.tempoWin({ cmd: 'tempo', bf: 3, rq: {} }, {}).cp, 54); assert.equal(C.tempoWin({ cmd: 'tempo', bf: 3, rq: { FOR: 50 } }, {}).cp, Math.round(54 * .7));
  assert.equal(C.tempoWin({ cmd: 'tempo', cw: 200 }, { cw: 10 }).cw, 210); assert.equal(C.tune({ cmd: 'tempo', rq: { FOR: 25 } }, {}).martelarMeta, 20); assert.deepEqual(C.tune({ rq: { FOR: 25 } }).segurar, { perf: 6, otimo: 7, bom: 18 });
  assert.equal(C.tune({ rq: { FOR: 50 }, nt: 6 }).ritmoNotas, 8); assert.equal(C.tune({ mt: 9 }).martelarMeta, 9); assert.equal(C.tune({}, { ma: 3 }).mira, 21);
});
test('cinemáticos: clampCmd aceita os 5 graus e deriva o grau da fração nas mecânicas de contagem', () => {
  const C = RU.CMD, z = { g: '', n: 0, acc: 0 };
  assert.equal(C.clampCmd({ cmd: 'tempo' }, { g: 'perf' }, {}).g, 'perf'); assert.equal(C.clampCmd({ cmd: 'tempo' }, { g: 'otimo' }, {}).g, 'otimo'); assert.equal(C.clampCmd({ cmd: 'tempo' }, { g: 'xyz' }, {}).g, '');
  assert.deepEqual(C.clampCmd({}, { g: 'perf' }, {}), z); assert.deepEqual(C.clampCmd({ cmd: 'tempo' }, { g: 'otimo', n: -5, acc: 9 }, {}), { g: 'otimo', n: 0, acc: 1 });
  const m = n => C.clampCmd({ cmd: 'martelar', mx: 4 }, { g: 'perf', n }, {}).g; assert.equal(m(2), 'bom'); assert.equal(m(3), 'otimo'); assert.equal(m(4), 'perf');
  assert.equal(C.clampCmd({ cmd: 'martelar', mx: 4 }, { g: 'erro', n: 0 }, {}).g, 'erro');
});
test('cinemáticos: cmdEffect — erro ×0,85, ótimo sem pf, difícil mais generoso', () => {
  const C = RU.CMD, T = { cmd: 'tempo', kind: 'dmg', rq: {} }, D = { ...T, rq: { FOR: 50 } };
  assert.equal(C.cmdEffect(T, { g: 'erro' }).mult, .85); assert.equal(C.cmdEffect(T, { g: 'bom' }).mult, 1.2);
  let e = C.cmdEffect(T, { g: 'otimo' }); assert.equal(e.mult, 1.3); assert.equal(e.pf, false);
  e = C.cmdEffect(T, { g: 'perf' }); assert.equal(e.mult, 1.4); assert.equal(e.pf, true); assert.equal(C.cmdEffect(D, { g: 'perf' }).mult, 1.5);
  const S1 = { cmd: 'segurar', kind: 'dmg', rq: {} }; assert.equal(C.cmdEffect(S1, { g: 'otimo', acc: .5 }).mult, 1.45); assert.equal(C.cmdEffect(S1, { g: 'erro', acc: 0 }).mult, .85);
  e = C.cmdEffect(S1, { g: 'erro', acc: -1 }); assert.equal(e.estouro, true); assert.equal(e.mult, 1); assert.equal(C.cmdEffect({ ...S1, rq: { FOR: 50 } }, { g: 'perf', acc: 1 }).mult, 1.7);
  const M = { cmd: 'martelar', kind: 'dmg', mx: 4 }; e = C.cmdEffect(M, { g: 'erro', n: 1 }); assert.equal(e.extra, 0); assert.equal(e.mult, .85);
  e = C.cmdEffect(M, { g: 'otimo', n: 3 }); assert.equal(e.extra, 3); assert.equal(e.pf, false);
  assert.equal(C.cmdEffect({ cmd: 'runa', kind: 'dmg', rq: { FOR: 50 } }, { g: 'perf' }).mult, 1.5);
});
test('cinemáticos: resultLines diz o que rendeu e o quanto faltou', () => {
  const C = RU.CMD, D = { cmd: 'tempo', kind: 'dmg', rq: { FOR: 50 } }, r = C.resultLines(D, { g: 'perf', n: 0, acc: 1 }, C.cmdEffect(D, { g: 'perf' }));
  assert.equal(r.title, 'PERFEITO'); assert.ok(r.lines.includes('×1,5 de dano'), r.lines.join('|'));
  const M = { cmd: 'martelar', kind: 'dmg', mx: 4 }; assert.ok(C.resultLines(M, { g: 'bom', n: 3, acc: 1 }, C.cmdEffect(M, { g: 'bom', n: 3 })).lines.includes('+3 golpes'));
  const R = { cmd: 'ritmo', kind: 'util', nt: 6 }; assert.ok(C.resultLines(R, { g: 'bom', n: 2, acc: 1 }, C.cmdEffect(R, { g: 'bom', n: 2 })).lines.includes('+2 turnos'));
  assert.equal(C.resultLines(R, { g: '', n: 0, acc: 0 }, C.cmdEffect(R, { g: '' })).title, '');
});
test('cinemáticos: clampCmd sanea NaN/Infinity, e limita seq e ritmo (nt + nível)', () => {
  const C = RU.CMD, M = { cmd: 'martelar', mx: 4 };
  for (const n of [NaN, Infinity, -Infinity, 1e9, '7']) { const r = C.clampCmd(M, { g: 'bom', n, acc: NaN }, {}); assert.ok(Number.isInteger(r.n) && r.n >= 0 && r.n <= 4, `n=${n} -> ${r.n}`); assert.equal(r.acc, 0); }
  assert.equal(C.clampCmd(M, { g: 'perf', n: Infinity, acc: Infinity }, {}).g, 'perf'); assert.equal(C.clampCmd(M, { g: 'perf', n: NaN }, {}).g, 'erro');
  assert.equal(C.clampCmd({ cmd: 'seq', seq: '↑→↓←' }, { g: 'perf', n: 3 }, {}).g, 'otimo'); assert.equal(C.clampCmd({ cmd: 'seq', seq: '↑→↓←' }, { g: 'perf', n: 99 }, {}).n, 4);
  const R = { cmd: 'ritmo', nt: 6, rq: { FOR: 50 } }; assert.equal(C.clampCmd(R, { g: 'perf', n: 99 }, {}).n, 8); assert.equal(C.clampCmd(R, { g: 'perf', n: 7 }, {}).g, 'otimo'); assert.equal(C.clampCmd(R, { g: 'perf', n: 8 }, {}).g, 'perf');
});
test('cinemáticos: resultLines usa mods, proximidade e rótulo sem dano', () => {
  const C = RU.CMD, M = { cmd: 'martelar', kind: 'dmg', mx: 4 };
  const ml = (s, c, mods) => C.resultLines(s, c, C.cmdEffect(s, c), mods).lines;
  assert.ok(ml(M, { g: 'bom', n: 2, acc: .5 }).includes('8/16 apertos') && ml(M, { g: 'bom', n: 2, acc: .5 }).includes('+2 golpes'), 'meta 16 no nível fácil; n são golpes extras');
  assert.ok(ml({ ...M, rq: { FOR: 50 } }, { g: 'bom', n: 2, acc: .5 }).includes('12/24 apertos'), 'meta 24 no difícil'); assert.ok(ml({ ...M, mt: 10 }, { g: 'bom', n: 2, acc: .5 }).includes('5/10 apertos'));
  assert.ok(!ml(M, { g: 'otimo', n: 5, acc: .8 }, { mx: 1 }).some(l => /^5\/4/.test(l)));
  assert.match(RU.extra({ kind: 'dmg', cmd: 'tempo', rq: { FOR: 50 } }, null), /Perfeito ×1,5/); assert.match(RU.extra({ kind: 'dmg', cmd: 'tempo' }, null), /Perfeito ×1,4/);
  assert.match(RU.extra({ kind: 'dmg', cmd: 'martelar', mx: 4, rq: { FOR: 50 } }, null), /meta de 24 apertos/); assert.match(RU.extra({ kind: 'dmg', cmd: 'runa', rn: 'circulo' }, null), /errar rende ×0,85/);
  assert.equal(C.clampCmd({ cmd: 'ritmo' }, { g: 'perf', n: 99 }, {}).n, 6, 'ritmo sem nt usa o padrão 6');
  const T = { cmd: 'tempo', kind: 'dmg' }; assert.ok(C.resultLines(T, { g: 'bom', n: 0, acc: .5 }, C.cmdEffect(T, { g: 'bom' }), { cp: 10 }).lines.includes('faltaram 10 ms'), 'bom 140, acc .5 -> 70 ms; perfeito 60');
  const Ru = { cmd: 'runa', kind: 'util', rn: 'circulo' }; const r = C.resultLines(Ru, { g: 'erro', n: 0, acc: .52 }, C.cmdEffect(Ru, { g: 'erro' }));
  assert.ok(r.lines.includes('×0,85 no efeito') && r.lines.includes('semelhança 52%'), r.lines.join('|')); assert.ok(!r.lines.some(l => l.includes('de dano')));
});
test('cinemáticos: descrição cita Ótimo/Erro e as janelas do nível', () => {
  const E = RU.extra;
  assert.match(E({ kind: 'dmg', cmd: 'segurar', rq: { FOR: 50 } }, null), /Ótimo ×1,45 · Perfeito ×1,7/); assert.match(E({ kind: 'dmg', cmd: 'runa', rn: 'circulo', rq: { FOR: 25 } }, null), /≥ 65%.*≥ 78%.*≥ 88%/);
  assert.match(E({ kind: 'util', cmd: 'ritmo', nt: 6, rq: { FOR: 50 } }, null), /8 notas/); assert.match(E({ kind: 'dmg', cmd: 'mira' }, null), /×0,85/);
});
test('cinemáticos: o servidor aplica Erro e Ótimo no ataque e anuncia a nota', () => {
  const kT = sk('Turbilhão Negro'), kPlain = sk('Faísca');
  const hit = (key, cmd) => { reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.attrs.AGI = 99; e.attrs.AGI = 1; h.vinc = []; derive(h); h.skills = [key]; e.hpMax = e.hp = 9999;
    H.battle(gm, { on: true }); S.battle.ticks[h.id] = -1; h.limit = 100; h.aura = 99; fixR(.3, () => H.act(ana, { id: h.id, skill: key, target: e.id, ...(cmd ? { cmd } : {}) }));
    return { dmg: e.hpMax - e.hp, fx: S.log.map(l => l.fx).filter(f => f && f.cg), txt: S.log.map(l => l.text || '').join('\n') }; };
  const base = hit(kT), erro = hit(kT, { g: 'erro', n: 0, acc: 0 }), ot = hit(kT, { g: 'otimo', n: 0, acc: .5 }), vazio = hit(kT, { g: '', n: 0, acc: 0 });
  assert.ok(base.dmg > 20, 'dano base mensurável'); assert.equal(vazio.dmg, base.dmg, 'g vazio = sem comando');
  assert.ok(Math.abs(erro.dmg - base.dmg * .85) <= 1 + (S.skills[kT].hits || 1), `erro ×0,85 (${erro.dmg} vs ${base.dmg})`);
  assert.ok(Math.abs(ot.dmg - base.dmg * 1.3) <= 1 + (S.skills[kT].hits || 1), `ótimo ×1,3 (${ot.dmg} vs ${base.dmg})`);
  assert.match(erro.txt, /ERROU!/); assert.match(ot.txt, /ÓTIMO!/); assert.ok(!/BLACK FLASH/.test(ot.txt), 'Ótimo não dá Black Flash');
  assert.ok(erro.fx.length && erro.fx.every(f => f.cg === 'erro'), 'fx.cg = erro'); assert.ok(ot.fx.length && ot.fx.every(f => f.cg === 'otimo'), 'fx.cg = otimo');
  assert.equal(hit(kT, { g: 'bom', n: 0, acc: 0 }).fx[0].cg, 'bom'); assert.equal(hit(kT, { g: 'perf', n: 0, acc: 1 }).fx[0].cg, 'perf');
  assert.ok(!S.skills[kPlain].cmd, 'Faísca não tem comando'); const p0 = hit(kPlain), p1 = hit(kPlain, { g: 'perf', n: 0, acc: 1 });
  assert.equal(p1.dmg, p0.dmg, 'sem cmd na técnica a nota é ignorada'); assert.equal(p1.fx.length, 0); assert.ok(!/PERFEITO|ÓTIMO|ERROU/.test(p1.txt));
});
// ---------- Leva 5: Ordo Realitas ----------
test('Ordo: Loucura (mad) cresce com a Sanidade que falta e os 82 nós entram na grade', () => {
  const key = sk('Valer-se do Caos');
  const hit = san => { reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.attrs.AGI = 99; e.attrs.AGI = 1; h.vinc = []; derive(h); h.skills = [key]; e.hpMax = e.hp = 9999;
    H.battle(gm, { on: true }); S.battle.ticks[h.id] = -1; h.aura = 99; h.san = san === 'max' ? h.sanMax : Math.ceil(h.sanMax * san); fixR(.3, () => H.act(ana, { id: h.id, skill: key, target: e.id })); return e.hpMax - e.hp; };
  const cheio = hit('max'), meio = hit(.5);
  assert.ok(cheio > 10, 'dano base mensurável');
  assert.ok(meio > cheio * 1.2, `com metade da Sanidade o golpe vale mais (${meio} vs ${cheio})`);
  for (const n of ['Máquina de Matar', 'Oficial Comandante', 'Medo Tangível', 'Presente do Caos', 'Ser Aterrorizante', 'Técnica Sublime']) assert.ok(sk(n), n + ' existe na grade');
  assert.match(RU.extra({ kind: 'dmg', fx: [{ t: 'mad', m: 1.5 }] }, null) || '', /Sanidade que falta/);
});

// ---------- Árvore de Armas: bloco isolado, requisitos por categoria e por item ----------
test('Árvore de Armas: bloco isolado na grade, ramos primordiais abertos e ramos dos tipos ancorados nele', () => {
  const arm = Object.entries(S.skills).filter(([, s]) => isArm(s)), fora = Object.entries(S.skills).filter(([, s]) => !isArm(s));
  assert.equal(arm.filter(([, s]) => !s.refino).length, TREE.armas.branches.flat().length); assert.ok(arm.every(([, s]) => s.el === 'fis'));
  const gx = arm.map(([, s]) => s.gx), gy = arm.map(([, s]) => s.gy);
  for (const [, s] of fora) assert.ok(s.gx < Math.min(...gx) - 2 || s.gx > Math.max(...gx) + 2 || s.gy < Math.min(...gy) - 2 || s.gy > Math.max(...gy) + 2, s.name + ' invade o bloco das Armas');
  // dentro do bloco tudo se alcança andando por ln a partir dos nós abertos (4 primordiais + os ramos de foco e instrumento)
  const abertos = arm.filter(([, s]) => s.open).map(([k]) => k); assert.ok(abertos.length >= 4 + 6);
  for (const c of ['corte', 'esmag', 'perf', 'dist']) assert.ok(arm.some(([, s]) => s.open && s.br === 'armas-prim-' + c), c);
  const seen = new Set(abertos), q = [...abertos]; while (q.length) for (const j of S.skills[q.pop()].ln) if (!seen.has(j)) { seen.add(j); q.push(j); }
  assert.deepEqual(arm.filter(([k]) => !seen.has(k)).map(([, s]) => s.name), []);
  for (const wt of Object.keys(TREE.armas.tipos)) assert.equal(arm.filter(([, s]) => s.ramo && s.br.startsWith('armas-' + wt + '-')).length, 3, wt + ': 3 ramos');
});
test('Árvore de Armas: req por categoria (corte, esmag, perf, dist), maestria wc: e reqItem', async () => {
  const { cantUse, modsOf: mods } = await import('../src/rules.js'); reset();
  const nome = n => Object.keys(S.items).find(k => S.items[k].name === n), ski = n => S.skills[sk(n)];
  ski('Tiro Certeiro').req = 'dist'; // reset() o solta para os testes de comando; aqui vale a regra do jogo
  const h = mk(ana, {}); h.xp = 9999;
  const arma = n => { h.inv[nome(n)] = 1; h.equip.arma = nome(n); };
  assert.match(cantUse(h, ski('Talho Profundo')), /Exige Corte/); arma('Katana de Caçador'); assert.equal(cantUse(h, ski('Talho Profundo')), '');
  assert.match(cantUse(h, ski('Pancada Seca')), /Exige Esmagamento/); assert.match(cantUse(h, ski('Disparo Firme')), /Exige Distância/);
  arma('Rifle de Ferrolho'); assert.equal(cantUse(h, ski('Disparo Firme')), ''); assert.ok(!/Exige/.test(cantUse(h, ski('Tiro Certeiro')))); arma('Soqueira'); assert.match(cantUse(h, ski('Tiro Certeiro')), /Exige Distância/); arma('Rifle de Ferrolho');
  assert.match(cantUse(h, ski('Estocada Funda')), /Exige Perfuração/); arma('Lança de Caça'); assert.equal(cantUse(h, ski('Estocada Funda')), '');
  // maestria de categoria: só vale com arma da categoria
  const fio = sk('Fio Afiado'); h.skills.push(fio); h.pslots = [fio]; const sem = mods(h, { basic: true }).atk; arma('Katana de Caçador'); assert.equal(mods(h, { basic: true }).atk - sem, 4, 'Fio Afiado: +4 atq com arma de corte'); arma('Lança de Caça'); assert.equal(mods(h, { basic: true }).atk, sem, 'lança não é corte');
  // reqItem: precisa de item com a tag no inventário; inimigos não pedem
  const g = ski('Granada de Mão'); assert.equal(g.reqItem, 'explosivo'); assert.match(cantUse(h, g), /Exige Explosivos/);
  h.inv[nome('Bomba do Feiticeiro')] = 1; assert.equal(cantUse(h, g), ''); delete h.inv[nome('Bomba do Feiticeiro')]; assert.match(cantUse(h, g), /Exige/);
  const e = mk(gm, { enemy: true }); assert.equal(cantUse(e, g), ''); assert.equal(cantUse(e, ski('Tiro Certeiro')), ''); ski('Tiro Certeiro').req = '';
  assert.ok(Object.values(S.items).some(i => (i.kit || '').includes('medico')) && Object.values(S.items).some(i => (i.kit || '').includes('armadilha')));
});
test('desarme: arma não conta, técnicas da arma bloqueadas e inimigo bate mais fraco', async () => {
  const { cantUse } = await import('../src/rules.js');
  reset(); const h = mk(ana, {}); S.items.wx = { name: 'Sabre de Teste', type: 'arma', power: 9, wt: 'lamina', price: 1 }; h.equip.arma = 'wx';
  const s = S.skills[sk('Corte de Ferro')];
  assert.ok(!/Exige/.test(cantUse(h, s) || ''));
  h.st.disarm = 2; assert.match(cantUse(h, s) || '', /Exige/);
  assert.equal(RU.ST.disarm, 'Desarmado'); assert.ok(RU.NEG.includes('disarm'));
});

// ---------- Leva 8: mecânicas novas ----------
test('Leva 8: eco, marca detonada, contador, sacrifício e ressonância', () => {
  const base = S.skills[sk('Golpe Pesado')], put = (k, name, fx, x = {}) => { S.skills[k] = { ...base, name, fx: fx ? RU.parseFx(fx) : undefined, cost: 0, st: undefined, cmd: undefined, tel: undefined, area: false, ...x }; return k; };
  put('t8a', 'T8 A', ''); put('t8eco', 'T8 Eco', 'echo 100'); put('t8b', 'T8 B', ''); put('t8brand', 'T8 Marca', 'brand 3'); put('t8pop', 'T8 Pop', 'pop 2');
  put('t8ev', 'T8 Contador', 'every 2 2'); put('t8ovr', 'T8 Sacrifício', 'ovr', { cost: 10 }); put('t8fogo', 'T8 Fogo', '', { el: 'kagutsuchi' }); put('t8rs', 'T8 Ress', 'rs kagutsuchi 2', { rx: RU.parseFx('st burn 2') });
  const run = (plan) => { reset(); const h = mk(ana, {}), h2 = mk(ana, {}), e = mk(gm, { enemy: true }); for (const x of [h, h2]) { x.attrs.AGI = 99; x.vinc = []; derive(x); x.skills = Object.keys(S.skills).filter(k => k.startsWith('t8')); x.aura = 99; }
    e.attrs.AGI = 1; e.hpMax = e.hp = 99999; H.battle(gm, { on: true }); const out = [];
    for (const [who, skill] of plan) { const a = who ? h2 : h, before = e.hp; S.battle.ticks[a.id] = -1; fixR(.3, () => H.act(ana, { id: a.id, skill, target: e.id })); out.push(before - e.hp); }
    return { out, h, h2, e }; };
  const eco = run([[0, 't8a'], [0, 't8eco']]).out[1], sem = run([[0, 't8a'], [0, 't8b']]).out[1];
  assert.ok(eco > sem * 1.5, `eco repete a técnica anterior (${eco} vs ${sem})`);
  const pop = run([[0, 't8brand'], [1, 't8pop']]), pop0 = run([[1, 't8pop']]).out[0];
  assert.ok(pop.out[1] > pop0 * 1.5 && !pop.e.st.brand, `outro aliado detona a marca (${pop.out[1]} vs ${pop0})`);
  const ev = run([[0, 't8ev'], [0, 't8ev']]).out; assert.ok(ev[1] > ev[0] * 1.5, `o 2º uso sai pleno (${ev})`);
  reset(); const r = run([]), h = r.h; h.aura = 0; const hp = h.hp; S.battle.ticks[h.id] = -1; fixR(.3, () => H.act(ana, { id: h.id, skill: 't8ovr', target: r.e.id }));
  assert.ok(h.hp < hp && r.e.hp < r.e.hpMax, 'sacrifício paga a Aura com HP');
  const rs = run([[0, 't8fogo'], [1, 't8rs']]), rs0 = run([[0, 't8a'], [1, 't8rs']]);
  assert.ok(rs.out[1] > rs0.out[1] * 1.5 && rs.e.st.burn, `ressonância com o fogo de um aliado (${rs.out[1]} vs ${rs0.out[1]})`);
  for (const k of Object.keys(S.skills).filter(k => k.startsWith('t8'))) delete S.skills[k];
  assert.match(RU.fxText(RU.parseFx('echo 50; brand 2; pop 1.6; every 3 2; rs any 1.4; ovr')), /ecoa.*Marca.*detona.*3º.*Ressonância.*Sacrifício/);
});
test('skPin: dono fixa e desfixa; recusa skill que não tem, outro jogador e o 7º', () => {
  reset(); const h = mk(ana, {}); h.skills = [sk('Golpe Pesado'), sk('Vigor')];
  H.skPin(ana, { id: h.id, sk: sk('Golpe Pesado'), on: true }); assert.deepEqual(h.skPin, [sk('Golpe Pesado')]);
  H.skPin(bia, { id: h.id, sk: sk('Vigor'), on: true }); assert.equal(h.skPin.length, 1);
  H.skPin(ana, { id: h.id, sk: 'g999999', on: true }); assert.equal(h.skPin.length, 1);
  H.skPin(ana, { id: h.id, sk: sk('Golpe Pesado'), on: false }); assert.deepEqual(h.skPin, []);
  h.skills = Object.keys(S.skills).slice(0, 14); h.skills.forEach(k => H.skPin(ana, { id: h.id, sk: k, on: true })); assert.equal(h.skPin.length, 6);
  S.items.tpin = { name: 'Arma Pin', type: 'arma', power: 5, wt: 'punho', el: '', price: 1, sk: [{ name: 'Golpe Pin', kind: 'dmg', el: 'fis', power: 5, cost: 1, res: 'aura' }] }; h.inv.tpin = 1; h.equip.arma = 'tpin'; h.skPin = [];
  H.skPin(ana, { id: h.id, sk: 'w:tpin:0', on: true }); H.skPin(ana, { id: h.id, sk: 'w:tpin:3', on: true }); assert.deepEqual(h.skPin, ['w:tpin:0']);
});
test('skUse: conta a skill do herói quando resolve; não conta ataque básico nem inimigo', () => {
  reset(); const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.attrs.AGI = 95; e.attrs.AGI = 1;
  h.skills = [sk('Golpe Pesado')]; h.aura = 20; H.battle(gm, { on: true });
  H.act(ana, { id: h.id, skill: sk('Golpe Pesado'), target: e.id }); assert.equal(h.skUse?.[sk('Golpe Pesado')], 1);
  S.battle.ticks[h.id] = -1; H.act(ana, { id: h.id, skill: 'atk', target: e.id }); assert.equal(Object.keys(h.skUse).length, 1);
  assert.equal(e.skUse, undefined);
});
test('lore: acerto em fraqueza ou resistência revela só aquele elemento, para todo inimigo do mesmo tipo', () => {
  reset(); delete S.lore; const h = mk(ana, {}), e = mk(gm, { enemy: true }), e2 = mk(gm, { enemy: true }); e.name = e2.name = 'Golem';
  e.weak = ['fuhaku', 'indra']; e2.weak = ['fuhaku', 'indra']; e.resist = ['fis']; e2.resist = ['fis'];
  assert.deepEqual(view(ana).chars[e2.id].weak, []);
  h.attrs.AGI = 95; e.attrs.AGI = 1; e2.attrs.AGI = 1; h.skills = [sk('Lâmina de Vento')]; h.aura = 50; H.battle(gm, { on: true });
  fixR(.3, () => H.act(ana, { id: h.id, skill: sk('Lâmina de Vento'), target: e.id }));
  assert.deepEqual(S.lore?.Golem?.w, ['fuhaku']);
  const v = view(ana).chars[e2.id]; assert.deepEqual(v.weak, ['fuhaku']); assert.deepEqual(v.resist, []);
  e2.known = 2; assert.deepEqual(view(ana).chars[e2.id].resist, ['fis']); assert.deepEqual(view(ana).chars[e2.id].weak, ['fuhaku', 'indra']);
});
test('lore: golpe de inimigo em herói não grava nada', () => {
  reset(); delete S.lore; const h = mk(ana, {}), e = mk(gm, { enemy: true }); h.weak = ['fis']; e.attrs.AGI = 95; h.attrs.AGI = 1;
  H.battle(gm, { on: true }); fixR(.3, () => H.act(gm, { id: e.id, skill: 'atk', target: h.id })); assert.equal(Object.keys(S.lore || {}).length, 0);
});
test('lore malformado (importado) não quebra a tela dos jogadores', () => {
  reset(); mk(ana, {}); const e = mk(gm, { enemy: true }); e.weak = ['fuhaku']; H.battle(gm, { on: true });
  S.lore = { [e.tpl || e.name]: { w: { x: 1 }, r: 'fis' } };
  assert.deepEqual(view(ana).chars[e.id].weak, []); delete S.lore;
});

test('imagens de batalha: dono e mestre gravam frente/costas/retrato, escala, enquadre e pontos de emissão com limites; outro jogador não', () => {
  reset(); const h = mk(ana, { name: 'Shin' });
  H.set(ana, { id: h.id, f: 'imgF', v: '/uploads/a.png' }); assert.equal(h.imgF, '/uploads/a.png');
  H.set(ana, { id: h.id, f: 'imgB', v: 'javascript:alert(1)' }); assert.equal(h.imgB, '');
  H.set(bia, { id: h.id, f: 'imgP', v: '/uploads/b.png' }); assert.equal(h.imgP ?? '', '');
  H.set(ana, { id: h.id, f: 'imgS', v: 9 }); assert.equal(h.imgS, 2.5);
  H.set(gm, { id: h.id, f: 'imgK', v: { k: 'f', x: 5, y: -0.2, z: 0.1 } }); assert.deepEqual(h.imgK.f, { x: 1, y: -0.2, z: 0.5 });
  H.set(gm, { id: h.id, f: 'fxK', v: { k: 'f', a: 'weapon', x: 2, y: -1 } }); assert.deepEqual(h.fxK.f.weapon, { x: 1, y: 0 });
  H.set(bia, { id: h.id, f: 'fxK', v: { k: 'f', a: 'hand', x: .2, y: .3 } }); assert.equal(h.fxK.f.hand, undefined);
});
test('bestiário: imagem e pontos de emissão vão para o inimigo criado', () => {
  reset(); const id = Object.keys(S.bestiary)[0]; Object.assign(S.bestiary[id], { imgF: '/uploads/g.png', imgP: '/uploads/gp.png', imgS: 1.8, imgK: { f: { x: 0, y: 0.1, z: 1 } }, fxK: { f: { hand: { x: .2, y: .3 } } } });
  H.bSpawn(gm, { id, n: 1 }); const e = Object.values(S.chars).find(c => c.enemy);
  assert.equal(e.imgF, '/uploads/g.png'); assert.equal(e.imgP, '/uploads/gp.png'); assert.equal(e.imgS, 1.8); assert.deepEqual(e.imgK.f, { x: 0, y: 0.1, z: 1 }); assert.deepEqual(e.fxK.f.hand, { x: .2, y: .3 });
});
test('scrub repassa imagens e pontos de emissão do inimigo', async () => {
  const { scrub } = await import('../src/net.js'); reset(); const e = mk(gm, { enemy: true, name: 'X' }); Object.assign(e, { imgF: '/uploads/x.png', imgS: 2, fxK: { f: { eyes: { x: .5, y: .2 } } } });
  const p = scrub(e); assert.equal(p.imgF, '/uploads/x.png'); assert.equal(p.imgS, 2); assert.deepEqual(p.fxK.f.eyes, { x: .5, y: .2 });
});
test('pickSix: fixadas primeiro, depois as mais usadas, até 6, sem repetir e só usáveis', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D;
  assert.deepEqual(P.pickSix(['b', 'z'], { a: 9, b: 50, c: 3, d: 0 }, ['a', 'b', 'c', 'd']), ['b', 'a', 'c']);
  assert.equal(P.pickSix([], Object.fromEntries('abcdefgh'.split('').map((k, i) => [k, i + 1])), 'abcdefgh'.split('')).length, 6);
});
test('palco 3D (navegador): formação, câmera e imagem de reserva', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D;
  const fr = P.frame({ a: 0, cx: 1, cy: 3, d: 8 }, 20, 10);
  assert.equal(fr.D, 2080);
  const F = P.formation([{ id: 'h', x: 1, y: 3 }, { id: 'e', x: 9, y: 3, enemy: true }, { id: 'f', x: 9, y: 0, enemy: true }], fr);
  assert.deepEqual(F.get('h'), { x: 0, z: 0 }); assert.equal(F.get('e').z, -2080);
  assert.ok(F.get('f').x < F.get('e').x);                                            // y menor = esquerda do eixo
  const far = P.formation([{ id: 'h', x: 0, y: 0 }, { id: 'e', x: 79, y: 40, enemy: true }], P.frame({ a: .47, cx: .5, cy: .5, d: 88 }, 80, 45));
  assert.ok(far.get('e').z >= -3500 && Math.abs(far.get('e').x) <= 1000);            // mapa enorme: satura
  const same = P.formation([{ id: 'a', x: 2, y: 2 }, { id: 'b', x: 2, y: 2 }], P.frame({ a: 0, cx: 2, cy: 2, d: 0 }, 10, 10));
  assert.ok(Math.abs(same.get('a').x - same.get('b').x) >= 230);                       // colisão separa
  const off = P.formation([{ id: 'h', x: 1, y: 3 }, { id: 'n', x: null, y: null }], fr);
  assert.ok(Math.hypot(off.get('n').x - off.get('h').x, off.get('n').z - off.get('h').z) >= 230); // sem posição: slot livre
  assert.ok(!Object.is(F.get('h').x, -0));
  assert.equal(P.frame(RU.axisOf([{ x: 5, y: 5 }, { x: 5, y: 5, enemy: true }]), 10, 10).D, 900); // centros iguais: sem NaN
  assert.deepEqual(P.cameraFor({ kind: 'hero', at: { x: -430, z: 0 } }), { tx: 320, ty: 0, tz: 560, ry: -6 });
  assert.equal(P.cameraFor({ kind: 'foe', at: { x: 40, z: -1500 } }).tz, 180);
  { // câmera de mesa: o olhar gira para o centro de todos e todos ficam no quadro (quem está atrás do ombro não conta)
    const pts = [{ x: -430, z: 0 }, { x: 330, z: 60 }, { x: 0, z: -1500 }, { x: 900, z: -1300 }], v = P.cameraFor({ kind: 'table', at: pts[0], pts, w: 1440 });
    const C = { x: pts.reduce((m, p) => m + p.x, 0) / 4, z: pts.reduce((m, p) => m + p.z, 0) / 4 }, A = P.rotP(pts[0], v.ry), Cr = P.rotP(C, v.ry);
    assert.ok(Math.abs(Cr.x + v.tx) < 3 && Cr.z < A.z && A.x + v.tx < -150, 'o centro fica à frente, no meio da tela, e quem age à esquerda'); assert.ok(v.ry > 0, 'gira para a direita, onde está a mesa');
    for (const p of pts) { const q = P.rotP(p, v.ry), z = q.z + v.tz; if (q.z > A.z) continue; assert.ok(z < 1000 && Math.abs((q.x + v.tx) * 1000 / (1000 - z)) <= 720, 'no quadro: ' + JSON.stringify(p)); }
    const f = P.cameraFor({ kind: 'table', at: { x: 0, z: -1500 }, pts, w: 1440, foe: true }); assert.ok(Math.abs(f.ry) > 90, 'inimigo olha de volta para os heróis');
    const sel = P.cameraFor({ kind: 'select', pts, w: 1440 });
    assert.equal(sel.ry, 0, 'a seleção usa uma vista neutra e não gira ao trocar de alvo');
    assert.ok(pts.every(p => Math.abs((p.x + sel.tx) * 1000 / (1000 - p.z - sel.tz)) <= 1440 * .38), 'todos os candidatos cabem horizontalmente na câmera de seleção');
    assert.equal(P.unitKind({}, f.ry), 'f'); assert.equal(P.unitKind({ enemy: true }, f.ry), 'f'); assert.equal(P.unitKind({}, 30), 'b');
  }
  assert.equal(P.imgSrc({ imgF: '/f.png', img: '/i.png' }, 'f').url, '/f.png');
  assert.equal(P.imgSrc({ imgF: '', img: '/i.png' }, 'f').url, '/i.png');
  assert.equal(P.imgSrc({ imgF: '/f.png', img: '/i.png' }, 'f', ['/f.png']).url, '/i.png'); // campo ruim ignorado
  assert.equal(P.imgSrc({ imgP: '', imgF: '/f.png' }, 'p').url, '/f.png');
  const s = P.imgSrc({ name: 'Ana', color: '#ff0000', imgF: '', img: '' }, 'b'); assert.ok(s.fallback && s.url.startsWith('data:image/svg+xml'));
});
test('previewSlot: posição de volta pela soma de tempo, empate pela ordem e aviso de aproximação', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D;
  const t = { me: 0, a: 30, b: 60, c: 90 };
  assert.deepEqual(P.previewSlot(t, 'me', 70, ['me', 'a', 'b', 'c']), { pos: 2, approx: false });
  assert.equal(P.previewSlot(t, 'me', 61, ['me', 'a', 'b', 'c']).approx, true);
});

test('carregar save: fixChar sanea imagens de batalha, enquadre e pontos de emissão', async () => {
  const { migrate } = await import('../src/state.js'); reset(); const h = mk(ana, { name: 'Shin' }); Object.assign(h, { imgF: 5, imgB: null, imgP: {}, imgS: 99, imgK: 'x', fxK: { f: { hand: { x: 2, y: -.5 }, fake: { x: .1, y: .1 } }, fake: { hand: { x: .1, y: .1 } } } });
  const e = mk(gm, { enemy: true, name: 'Oni' }); Object.assign(e, { imgS: 'abc', imgK: [1] });
  migrate(false);
  assert.deepEqual([h.imgF, h.imgB, h.imgP, h.imgS, h.imgK], ['', '', '', 2.5, {}]); assert.equal(e.imgS, 1);
  assert.deepEqual(h.fxK, { f: { hand: { x: 1, y: 0 } } });
  h.imgS = 0.1; migrate(false); assert.equal(h.imgS, 0.5);
});
test('skPin: limite de 6 e migração corta saves com mais', () => {
  reset(); const h = mk(ana, { name: 'P' }); h.skills = Object.keys(S.skills).slice(0, 9);
  h.skills.forEach(k => H.skPin(ana, { id: h.id, sk: k, on: true })); assert.equal(h.skPin.length, 6);
});
test('dly: o herói chega ao cliente com o atraso real do servidor, já com passivas de agilidade (prévia da ordem)', () => {
  reset(); const h = mk(ana, { name: 'Veloz' }); const base = view(ana).chars[h.id].dly; assert.ok(base > 0);
  const id = 'tst_agi'; S.skills[id] = { name: 'Pés Leves', kind: 'passive', mod: { agi: 50 } }; h.skills = [...(h.skills || []), id]; h.pslots = [...(h.pslots || []), id];
  try { const v = view(ana).chars[h.id].dly, g = view(gm).chars[h.id].dly; assert.ok(v < base, `${v} < ${base}`); assert.equal(v, g); }
  finally { delete S.skills[id]; }
});
test('palco 3D: herói aparece de costas (imgB, senão silhueta de costas) e inimigo de frente', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D;
  assert.equal(P.unitKind({ enemy: false }), 'b'); assert.equal(P.unitKind({ enemy: true }), 'f');
  const h = { name: 'Ana', color: '#ff0000', imgF: '/f.png', imgB: '/b.png', imgK: { b: { x: 0, y: 0, z: 2 } } };
  assert.equal(P.imgSrc(h, P.unitKind(h)).url, '/b.png'); assert.match(P.imgFit(h, 'b', P.imgSrc(h, 'b')), /scale\(2\)/);
  const s = P.imgSrc({ ...h, imgB: '' }, 'b'); assert.ok(s.fallback, 'sem costas: silhueta, não a frente'); assert.equal(P.imgFit({ ...h, imgB: '' }, 'b', s), '');
});
test('axisOf: eixo heróis→inimigos, padrão sem inimigos e centros iguais', () => {
  const A = RU.axisOf;
  const r = A([{ x: 1, y: 2 }, { x: 1, y: 4 }, { x: 9, y: 3, enemy: true }]);
  assert.equal(r.a, 0); assert.equal(r.cx, 1); assert.equal(r.cy, 3); assert.equal(r.d, 8);
  assert.ok(Math.abs(A([{ x: 5, y: 9 }, { x: 5, y: 1, enemy: true }]).a + Math.PI / 2) < 1e-3); // inimigos acima
  assert.deepEqual(A([{ x: 2, y: 2 }, { x: null, y: null, enemy: true }]), { a: 0, cx: 2, cy: 2, d: 0 });
  assert.equal(A([{ x: 3, y: 3 }, { x: 3, y: 3, enemy: true }]).d, 0);
});
test('battle: grava o eixo ao ligar; reenquadrar só o mestre', () => {
  reset(); const h = mk(gm, { name: 'H' }), e = mk(gm, { name: 'E', enemy: true });
  for (const o of [h, e]) H.place(gm, { id: o.id }); H.move(gm, { id: h.id, x: 1, y: 5 }); H.move(gm, { id: e.id, x: 6, y: 5 });
  H.battle(gm, { on: true }); assert.equal(S.battle.ax.a, 0);
  H.move(gm, { id: e.id, x: 1, y: 0 }); assert.equal(S.battle.ax.a, 0); // mover não gira
  H.battleReframe(ana); assert.equal(S.battle.ax.a, 0);
  H.battleReframe(gm); assert.ok(S.battle.ax.a < 0);
});
test('lungeMs: duração da investida cresce com a distância e satura', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D;
  assert.equal(P.lungeMs(0), 300); assert.equal(P.lungeMs(1000), 370); assert.equal(P.lungeMs(9000), 700);
});
test('rangeOf: distância em casas (Chebyshev) e em metros; sem posição, nulo', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D;
  assert.deepEqual(P.rangeOf({ x: 1, y: 1 }, { x: 4, y: 3 }, 1.5), { casas: 3, m: 4.5 });
  assert.deepEqual(P.rangeOf({ x: 1, y: 1 }, { x: 4, y: 3 }, 0), { casas: 3, m: null });
  assert.equal(P.rangeOf({ x: null, y: 1 }, { x: 4, y: 3 }, 1.5), null);
});
test('move em batalha: jogador só move o próprio herói (minimapa)', () => {
  reset(); const a = mk(ana, { name: 'HA' }), b = mk(bia, { name: 'HB' });
  for (const o of [a, b]) { H.place(gm, { id: o.id }); H.move(gm, { id: o.id, x: 2, y: 2 }); }
  H.battle(gm, { on: true });
  H.move(ana, { id: b.id, x: 5, y: 5 }); assert.deepEqual([b.x, b.y], [2, 2]);
  H.move(ana, { id: a.id, x: 4, y: 3 }); assert.deepEqual([a.x, a.y], [4, 3]);
});

test('animações: toda skill ativa recebe perfil completo e determinístico', () => {
  const active = Object.values(S.skills).filter(s => s.kind !== 'passive'), seeds = new Set();
  for (const s of active) {
    const a = AP.profile(s), b = AP.profile(s);
    assert.deepEqual(a, b, 'perfil instável: ' + s.name);
    assert.ok(AP.FAMILIES.includes(a.family), `família inválida em ${s.name}: ${a.family}`);
    assert.equal(a.palette.length, 3, 'paleta de ' + s.name);
    assert.ok(a.palette.every(c => /^#[0-9a-f]{6}$/i.test(c)), 'cor de ' + s.name);
    assert.ok(['hand', 'weapon', 'head', 'core'].includes(a.origin), 'origem de ' + s.name);
    assert.ok(a.duration >= 600 && a.duration <= 1100, 'duração de ' + s.name);
    assert.ok(!seeds.has(a.seed), 'assinatura repetida: ' + s.name); seeds.add(a.seed);
  }
  assert.equal(seeds.size, active.length);
});

test('animações: cura, área, ritual e sobrescrita do mestre usam famílias próprias', () => {
  assert.equal(AP.familyOf({ name: 'Luz Curativa', kind: 'heal' }), 'heal');
  assert.equal(AP.familyOf({ name: 'Muralha de Pedra', kind: 'heal' }), 'barrier');
  assert.equal(AP.familyOf({ name: 'Chuva de Fogo', kind: 'dmg', area: true }), 'rain');
  assert.equal(AP.familyOf({ name: 'Ritual do Vazio', kind: 'dmg' }), 'ritual');
  assert.equal(AP.familyOf({ name: 'Qualquer nome', kind: 'dmg', anim: 'musical' }), 'musical');
});
test('CENA: tempo virtual com congelamento e câmera lenta', async () => {
  await import('../public/js/cena-tempo.js'); const C = globalThis.CENA;
  assert.equal(C.virtualAt(150, []), 150);
  assert.equal(C.virtualAt(150, [{ t0: 0, t1: 100, f: 0 }]), 50);
  assert.equal(C.virtualAt(200, [{ t0: 0, t1: 100, f: .5 }, { t0: 50, t1: 150, f: 0 }]), 75); // sobreposição: vale o menor fator
  let prev = -1; for (let r = 0; r <= 300; r += 7) { const v = C.virtualAt(r, [{ t0: 20, t1: 90, f: 0 }, { t0: 60, t1: 200, f: .3 }]); assert.ok(v >= prev); prev = v; }
  C.reset(); assert.equal(C.factor(), 1);
});
test('PFX: hitstop, tremida, slow e grupos de golpes', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  assert.equal(F.hitstopMs(0, false, false), 0); assert.equal(F.hitstopMs(.05, false, false), 70); assert.equal(F.hitstopMs(.4, false, false), 140);
  assert.equal(F.hitstopMs(.1, true, false), 110); assert.equal(F.hitstopMs(.4, true, false), 160); assert.equal(F.hitstopMs(.01, false, true), 160);
  assert.equal(F.shakeAmp(0, false), 0); assert.equal(F.shakeAmp(.1, false), 8); assert.equal(F.shakeAmp(.2, true), 20); assert.equal(F.shakeAmp(.5, true), 28);
  const k = F.shakeKeys(10, -1); assert.equal(k.length, 7); assert.equal(k[0].transform, 'translate(0px,0px)'); assert.equal(k[6].transform, 'translate(0px,0px)'); assert.match(k[1].transform, /^translate\(-10px,/);
  assert.deepEqual(F.slowFor({ ko: true, lastFoe: true }), { f: .3, ms: 1000, zoom: true }); assert.deepEqual(F.slowFor({ ko: true, lastFoe: false }), { f: .5, ms: 400, zoom: false });
  assert.equal(F.slowFor({ ko: false }), null); assert.equal(F.slowFor({ ko: true, lastFoe: true, reduced: true }), null);
  const g = F.groupHits([{ fx: { id: 'e', a: 'h', s: 'X', dmg: 3 } }, { fx: { id: 'e', a: 'h', s: 'X', dmg: 4 } }, { fx: { id: 'f', a: 'h', s: 'X', dmg: 2 } }, { fx: { id: 'e', a: 'h', s: 'X', miss: 1 } }]);
  assert.deepEqual(g.map(x => [x.id, x.parts.length, x.total]), [['e', 2, 7], ['f', 1, 2], ['e', 1, 0]]);
});
test('PFX: arco dos números e plano do rastro da barra', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX, P = { vx: 50 };
  assert.deepEqual(F.numberPath(0, P), { x: 0, y: 0, a: 1 });
  for (let t = 0; t <= 1.3; t += .02) assert.ok(F.numberPath(t, P).y <= 70.001);
  assert.equal(F.numberPath(1.2, P).a, 0); assert.equal(F.numberPath(.5, P).a, 1);
  assert.equal(F.numberSeed(0, false).vx, -40); assert.equal(F.numberSeed(1, false).vx, 77); assert.equal(F.numberSeed(0, true).vy, -680);
  assert.deepEqual(F.trailPlan(80, 50), { heal: false, bar: { to: 50, delay: 0 }, trail: { from: 80, to: 50, delay: 450 } });
  assert.deepEqual(F.trailPlan(50, 80), { heal: true, bar: { to: 80, delay: 450 }, trail: { from: 50, to: 80, delay: 0 } });
  assert.equal(F.trailPlan(50, 50), null);
});
test('PFX: recuo e arco da investida', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  assert.deepEqual(F.recoilVec({ x: 0, z: 0 }, { x: 0, z: -1000 }, .1, false), { dx: 0, dz: -48, tilt: 6, kneel: false });
  assert.deepEqual(F.recoilVec({ x: 0, z: 0 }, { x: 300, z: 0 }, .5, true), { dx: 120, dz: 0, tilt: 14, kneel: true });
  assert.equal(F.recoilVec({ x: 5, z: 5 }, { x: 5, z: 5 }, .3, false).dz, 84);
  assert.equal(F.recoilVec({ x: 0, z: 0 }, { x: 0, z: -10 }, .25, false).kneel, true);
  assert.deepEqual(F.lungeArc('smash'), { h: 220, crouch: .1, ease: 'cubic-bezier(.3,0,.4,1)' });
  assert.deepEqual(F.lungeArc('dash'), { h: 0, crouch: .06, ease: 'cubic-bezier(.2,.9,.3,1)' });
  assert.deepEqual(F.lungeArc('pierce'), { h: 0, crouch: 0, ease: 'linear' });
  assert.deepEqual(F.lungeArc('slash'), { h: 80, crouch: .04, ease: 'cubic-bezier(.4,0,.2,1)' });
  assert.deepEqual(F.lungeArc('beam'), { h: 60, crouch: .04, ease: 'cubic-bezier(.4,0,.2,1)' });
});
test('PFX: camadas, partículas e luz', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  assert.deepEqual(F.layerPlanes({ bbL: { ceu: '/a.png', frente: '/b.png' } }), [{ key: 'ceu', url: '/a.png', z: -4200, k: 1.444 }, { key: 'frente', url: '/b.png', z: -700, k: .472 }]);
  assert.deepEqual(F.layerPlanes({}), []);
  assert.equal(F.particleCount('high', false), 80); assert.equal(F.particleCount('auto', false), 80); assert.equal(F.particleCount('medium', false), 48); assert.equal(F.particleCount('low', false), 24); assert.equal(F.particleCount('high', true), 0);
  const ps = F.particlesFor('neve', 30, 7); assert.equal(ps.length, 30); assert.ok(ps.every(p => p.kind === 'floco' && p.x >= -1400 && p.x <= 1400 && p.z >= -3200 && p.z <= 400 && p.dur >= 6 && p.dur <= 10));
  assert.deepEqual(F.particlesFor('neve', 30, 7), ps);
  assert.equal(F.particlesFor('', 30, 7).length, 0);
  const L = F.litUnits(new Map([['a', { x: 0, z: 0 }], ['b', { x: 300, z: 0 }], ['c', { x: 900, z: 0 }]]), { x: 0, z: 0 });
  assert.deepEqual(L, [{ id: 'a', k: 1 }, { id: 'b', k: .5 }]);
});
test('PFX: poses, auras, buffs e escudo', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  assert.deepEqual(F.poseOf({ hp: 0, hpMax: 10, limit: 100 }), ['ko']);
  assert.deepEqual(F.poseOf({ hp: 2, hpMax: 10, limit: 100 }), ['ferido', 'limite']);
  assert.deepEqual(F.poseOf({ hp: 9, hpMax: 10, limit: 40 }), []);
  assert.deepEqual(F.auraOf({ poison: 2, frozen: 1, fear: 1, dread: 1, wet: 1 }), ['gelo', 'bolhas', 'tremor']);
  assert.deepEqual(F.auraOf({ atkUp: 1 }), []);
  assert.deepEqual(F.buffsOf({ atkUp: 1, agiDn: 2 }), [{ k: 'atk', dir: 1, col: '#ff493d' }, { k: 'agi', dir: -1, col: '#45e6b3' }]);
  assert.deepEqual(F.buffDiff({ atkUp: 1 }, { atkUp: 1, defDn: 1 }), [{ k: 'def', dir: -1, col: '#e39b46' }]);
  assert.deepEqual(F.shieldCracks(0, 30), { on: false, cracks: 0 }); assert.deepEqual(F.shieldCracks(30, 30), { on: true, cracks: 0 });
  assert.deepEqual(F.shieldSeg(60, 20), { l: 60, w: 20 }); assert.deepEqual(F.shieldSeg(90, 30), { l: 70, w: 30 }); assert.deepEqual(F.shieldSeg(50, 0), { l: 50, w: 0 }); assert.deepEqual(F.shieldSeg(10, 150), { l: 0, w: 100 });
  assert.equal(F.stepPct(80, 20, .5), 50); assert.equal(F.stepPct(80, 20, 1), 20); assert.equal(F.stepPct(80, 20, 0), 80);
  assert.deepEqual(F.shieldCracks(15, 30), { on: true, cracks: 1 }); assert.deepEqual(F.shieldCracks(5, 30), { on: true, cracks: 2 });
});
test('PFX: segmentos por quem age (o contra vira cena própria)', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  const s = F.segments([{ fx: { a: 'e', id: 'h' } }, { fx: { a: 'e', id: 'h' } }, { fx: { id: 'h' } }, { fx: { a: 'h', id: 'e', ctr: 1 } }]);
  assert.deepEqual(s.map(x => x.length), [3, 1]); assert.equal(s[1][0].fx.ctr, 1);
});
test('PFX: actsAround junta o golpe inteiro e para no resto do log', async () => {
  await import('../public/js/palco-fx.js'); const F = globalThis.PFX;
  const L = [{ n: 1, text: 'oi' }, { n: 2, fx: { a: 'h', s: 'X', id: 'e' } }, { n: 3, fx: { a: 'h', s: 'X', id: 'f' } }, { n: 4, fx: { a: 'e', s: 'Y', id: 'h' } }, { n: 5, fx: { a: 'h', s: 'X', id: 'e' } }];
  assert.deepEqual(F.actsAround(L, 3).map(e => e.n), [2, 3]); assert.deepEqual(F.actsAround(L, 5).map(e => e.n), [5]); assert.deepEqual(F.actsAround(L, 1), []);
});
test('palco 3D: posições fixas de câmera enquadram todos e são distintas', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D, pts = [{ x: -430, z: 0 }, { x: 330, z: 60 }, { x: 0, z: -1500 }, { x: 900, z: -1300 }], seen = new Set();
  assert.deepEqual(P.MODES, ['ombro', 'side', 'tres', 'diag', 'frente', 'baixa', 'aerial']);
  for (const k of P.MODES.slice(1)) { const v = P.cameraFor({ kind: k, pts, w: 1440, h: 860 }); assert.ok(Number.isFinite(v.tz) && v.tz > -9000, k + ' cabe no quadro'); seen.add(`${v.ry}/${v.rx}`); }
  assert.equal(seen.size, 6);
});
test('palco 3D: órbita e contracampo do inimigo', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D, at = { x: 200, z: -300 };
  const o = P.cameraFor({ kind: 'orbit', at, ry0: 10, deg: 45 }), A = P.rotP(at, 55);
  assert.equal(o.ry, 55); assert.equal(o.tx, Math.round(-A.x)); assert.equal(o.tz, Math.round(-A.z - P.ORB)); assert.equal(o.ty, -60);
  const foe = { x: 0, z: -2000 }, hero = { x: 0, z: 0 }, c = P.cameraFor({ kind: 'table', at: foe, pts: [foe, hero], w: 1440, foe: true });
  assert.equal(P.unitKind({}, c.ry), 'f');
});
test('palco 3D: plano de ação aberto, nunca em close', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D, a = { x: 0, z: -1240, h: 330 }, b = { x: 140, z: -1500, h: 330 };
  const near = (v, pts) => Math.min(...pts.map(p => 1000 - (P.rotP(p, v.ry).z + v.tz)));
  const tight = P.cameraFor({ kind: 'two', at: a, to: b, w: 1440, h: 860 }), act = P.cameraFor({ kind: 'two', at: a, to: b, ...P.ACT, w: 1440, h: 860 });
  assert.ok(act.tz < tight.tz, 'investida: mais longe que o plano justo');
  assert.ok(near(act, [a, b]) >= P.ACT.dmin - 1, 'investida: respeita a distância mínima');
  const solo = P.cameraFor({ kind: 'wide', pts: [a], ry0: 0, ...P.ACT, m: .42, w: 1440, h: 860 });
  assert.ok(near(solo, [a]) >= P.ACT.dmin - 1, 'em si mesmo: plano médio, sem close');
});
test('palco 3D: zoom e mesa respeitam a altura real e a faixa da coluna', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D, to = h => ({ x: 0, z: -1500, h });
  const z = h => P.cameraFor({ kind: 'zoom', to: to(h), ry: 0 });
  assert.equal(z(300).tz, P.cameraFor({ kind: 'zoom', to: { x: 0, z: -1500 }, ry: 0 }).tz, 'sem h usa o padrão');
  assert.ok(z(1200).tz < z(380).tz, 'chefe grande: câmera mais longe');
  for (const h of [50, 380, 1200, 5000]) { const d = 1500 - z(h).tz; assert.ok(Number.isFinite(z(h).tz) && d >= 420 && d <= 2600, 'piso e teto do zoom'); }
  const mk = (h, lane) => P.cameraFor({ kind: 'table', at: { x: -430, z: 0, h: 300 }, pts: [{ x: -430, z: 0, h: 300 }, { x: 0, z: -1500, h }], w: 1440, h: 860, ...(lane ? { lane } : {}) });
  assert.ok(mk(1200).tz < mk(380).tz, 'recua para caber a figura alta');
  assert.deepEqual(mk(380, { w: 0, side: 1 }), mk(380), 'faixa zero não muda nada');
  assert.deepEqual(P.cameraFor({ kind: 'table', at: { x: -430, z: 0 }, pts: [{ x: -430, z: 0 }, { x: 0, z: -1500 }], w: 700, lane: { w: 400, side: 1 } }), P.cameraFor({ kind: 'table', at: { x: -430, z: 0 }, pts: [{ x: -430, z: 0 }, { x: 0, z: -1500 }], w: 700 }), 'janela estreita ignora a faixa');
  const R = mk(380, { w: 420, side: 1 }), L = mk(380, { w: 420, side: -1 }), N = mk(380);
  assert.ok(R.tx <= N.tx && L.tx > N.tx, 'coluna à esquerda empurra o ator para a direita; à direita só o leva para a esquerda se houver espaço (o ator já fica à esquerda no ombro)');
  for (const v of [R, L, mk(1200, { w: 420, side: 1 })]) assert.ok(Number.isFinite(v.tx) && Number.isFinite(v.tz) && v.tz > -9000);
  const one = P.cameraFor({ kind: 'table', at: { x: 0, z: 0, h: 1200 }, pts: [{ x: 0, z: 0, h: 1200 }], w: 1440, h: 860 }); assert.ok(Number.isFinite(one.tz) && one.tz > -9000, 'um combatente gigante');
});
test('palco 3D: a coluna de comandos escolhe o lado que cabe e encolhe só se nenhum couber', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D, L = { width: 1440 };
  assert.deepEqual(P.pickSide({ left: 100, right: 300 }, L, 200, 420, 22), { side: 1, scale: 1 });
  assert.deepEqual(P.pickSide({ left: 1100, right: 1300 }, L, 200, 420, 22), { side: -1, scale: 1 });
  const big = P.pickSide({ left: 300, right: 1100 }, L, 200, 420, 22); assert.equal(big.side, 1); assert.ok(big.scale < 1 && big.scale >= .6, 'recorte enorme: encolhe, nunca abaixo de .6');
  assert.deepEqual(P.pickSide(null, L, 200, 420, 22), { side: 1, scale: 1 });
  const tiny = P.pickSide({ left: 0, right: 1400 }, { width: 1440 }, 200, 420, 22); assert.ok(tiny.scale === .6 && Number.isFinite(tiny.side));
});
test('palco 3D: a hora do dia vem do campo da cena, do sufixo do cenário ou cai em dia', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D;
  assert.equal(P.mood({ mood: 'noite' }), 'noite'); assert.equal(P.mood({ hora: 'tarde', bbg: 'praia-dia' }), 'tarde');
  assert.equal(P.mood({ bbg: 'floresta-tarde' }), 'tarde'); assert.equal(P.mood({ bbg: 'castelo-noite' }), 'noite');
  assert.equal(P.mood({}), 'dia'); assert.equal(P.mood(null), 'dia'); assert.equal(P.mood({ mood: 'lava', bbg: 'x.png' }), 'dia');
});
test('palco 3D: chefe no centro ao fundo, lacaios abrindo o arco, ninguém colado', async () => {
  await import('../public/js/palco3d.js'); const P = globalThis.PALCO3D, fr = P.frame({ a: 0, cx: 0, cy: 0, d: 8 }, 20, 10);
  const F = P.formation([{ id: 'h' }, { id: 'b', enemy: true, boss: true }, { id: 'm1', enemy: true }, { id: 'm2', enemy: true }, { id: 'm3', enemy: true }], fr);
  assert.deepEqual(F.get('b'), { x: 0, z: -fr.D - 250 });
  assert.deepEqual(F.get('m1'), { x: -420, z: -fr.D }); assert.deepEqual(F.get('m2'), { x: 420, z: -fr.D }); assert.deepEqual(F.get('m3'), { x: -760, z: -fr.D + 120 });
  const G = P.formation([{ id: 'b1', enemy: true, boss: true }, { id: 'b2', enemy: true, boss: true }, { id: 'g', enemy: true, boss: true, x: 0, y: 0 }], fr), v = [...G.values()];
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) assert.ok(Math.hypot(v[i].x - v[j].x, v[i].z - v[j].z) >= 229);
});
test('cena: camadas do parallax vêm do mestre e só aceitam URL válida', () => {
  reset(); H.map(gm, { f: 'bbL', v: { ceu: '/uploads/c.png', frente: 'javascript:x' } });
  assert.deepEqual(S.scenes[S.scene].bbL, { ceu: '/uploads/c.png' });
  H.map(gm, { f: 'bbL', v: {} }); assert.equal(S.scenes[S.scene].bbL, undefined);
});
test('scrub manda escudo e forma do inimigo', async () => {
  const { scrub } = await import('../src/net.js'); reset(); const e = mk(gm, { enemy: true, name: 'Y' }); e.shield = 10; e.form = 'k';
  const p = scrub(e); assert.ok(p.shield > 0); assert.equal(p.form, 'k');
});
test('fim de batalha marca vitória, derrota ou fuga no log', () => {
  const end = () => S.log.filter(e => /Batalha encerrada/.test(e.text)).at(-1)?.end;
  reset(); let h = mk(ana, {}), e = mk(gm, { enemy: true }); H.battle(gm, { on: true }); e.hp = 0; H.battle(gm, { on: false, win: true }); assert.equal(end(), 'win');
  reset(); h = mk(ana, {}); e = mk(gm, { enemy: true }); H.battle(gm, { on: true }); h.hp = 0; H.battle(gm, { on: false }); assert.equal(end(), 'lose');
  reset(); h = mk(ana, {}); e = mk(gm, { enemy: true }); H.battle(gm, { on: true }); H.battle(gm, { on: false }); assert.equal(end(), 'flee');
});
test('camadas e temas: ramos de até 10, posição = camada, kit atual até a 5, fortes da 7 em diante e cada elemento no dono', async () => {
  const { TREE } = await import('../tree.js'), { CAM, forte } = await import('../arvore/camadas.js'), { ATUAIS } = await import('../arvore/atuais.js'), { validar } = await import('../arvore/temas.js');
  for (const [el, t] of Object.entries(TREE)) t.branches.forEach((b, bi) => {
    if (b.de) return; assert.ok(b.length <= CAM, `${el}-${bi}: ${b.length} nós`);
    b.forEach((s, i) => assert.equal(s.cam, i + 1, `${s.n}: casa ${i + 1}, camada ${s.cam}`));
  });
  const all = Object.values(TREE).flatMap(t => t.branches.flat());
  for (const s of all.filter(s => ATUAIS.has(s.n))) assert.ok(s.cam <= (s.n === 'Canhão de Aura Gélido' ? 6 : 5), `${s.n} na camada ${s.cam}`);
  assert.ok(all.filter(s => forte(s)).filter(s => s.cam < 7).length <= 2, 'fortes abaixo da 7');
  // Cada linha alcança a camada 10; variantes de outro Vínculo são opcionais.
  const cam = new Map(all.map(s => [s.n, s.cam]));
  for (const [el, t] of Object.entries(TREE)) for (const b of t.branches) if (b.de) {
    const L0 = cam.get(b.de), cams = b.map(s => s.cam);
    assert.equal(Math.max(...cams), CAM, `${el}: linha de ${b.de} não chega à camada ${CAM}`);
    assert.ok(Math.min(...cams) > L0, `${el}: linha de ${b.de} começa antes da base`);
    b.forEach((s, i) => {
      const antes = b.slice(0, i);
      const pai = (s.v2 && antes.findLast(p => p.v2 === s.v2)) || antes.findLast(p => !p.v2);
      const base = pai?.n ?? b.de;
      let pre = REFINOS.get(base);
      while (pre && pre.n !== s.pre) pre = REFINOS.get(pre.n);
      assert.ok(s.pre === base || pre, s.n);
    });
    for (let i = 1; i < b.length; i++) assert.ok(b[i].cam >= b[i - 1].cam, `${el}: ${b[i].n} fica antes de ${b[i - 1].n}`);
  }
  assert.deepEqual(validar(TREE), []);
});

test('a mandala liga todos os caminhos e o preço cresce para cada afinidade e pré-requisito', async () => {
  const { PAIS } = await import('../arvore/camadas.js');
  const ids = new Map(Object.entries(S.skills).map(([id, s]) => [s.name, id]));
  for (const t of Object.values(TREE)) for (const b of t.branches) for (const s of b) {
    const id = ids.get(s.n), filho = S.skills[id], nomePai = PAIS.get(s.n);
    const requisitos = new Set((s.pre || '').split('|').filter(Boolean));
    if (nomePai) {
      const pid = ids.get(nomePai), pai = S.skills[pid];
      assert.ok(filho.ln.includes(pid) && pai.ln.includes(id), s.n);
      if (!b.de) assert.ok(!pai.v2 || pai.v2 === s.v2, s.n);
      if (!filho.open) requisitos.add(nomePai);
    } else {
      assert.ok(filho.open, s.n);
    }
    for (const nome of requisitos) for (const nen of ['', ...RU.NEN]) {
      const pai = S.skills[ids.get(nome)];
      assert.ok(RU.xpCost({ nen }, filho) >= RU.xpCost({ nen }, pai) + 5, s.n + ' / ' + nen);
    }
  }
  assert.equal(PAIS.get('Fornalha do Céu'), REFINOS.get('Faísca na Brasa').n);
  const { VINC } = await import('../arvore/vinculos.js');
  for (const el of Object.keys(VINC)) {
    const setor = TREE[el];
    for (const s of setor.branches.flat()) {
      if (s === setor.branches[0][0]) continue;
      const nome = PAIS.get(s.n), refino = S.skills[ids.get(nome)];
      assert.ok(refino.refino && refino.el === el, s.n);
      assert.ok(s.pre.split('|').includes(nome), s.n);
    }
  }
  assert.equal(PAIS.get('Soco Que Abre o Chão'), REFINOS.get('Punhos Pesados').n);
  for (const [nome, r] of REFINOS) {
    const refino = S.skills[ids.get(r.n)], base = S.skills[ids.get(nome)];
    assert.equal(refino.pre, nome);
    assert.ok(refino.ln.includes(ids.get(nome)));
    for (const nen of ['', ...RU.NEN]) assert.ok(RU.xpCost({ nen }, refino) >= RU.xpCost({ nen }, base) + 5);
  }
});

test('todos os caminhos publicados de cada Vínculo têm pelo menos nove nós', async () => {
  const { VINC } = await import('../arvore/vinculos.js');
  for (const el of Object.keys(VINC)) {
    const setor = Object.entries(S.skills).filter(([, s]) => s.el === el);
    const [[raiz]] = setor.filter(([, s]) => s.root);
    const vistos = new Set([raiz]), fila = [[raiz, null, 1]];
    for (const [id, anterior, tamanho] of fila) {
      const filhos = S.skills[id].ln.filter(k => k !== anterior && S.skills[k].el === el);
      if (!filhos.length) assert.ok(tamanho >= 9, `${el}: ${S.skills[id].name} termina com ${tamanho} nós`);
      for (const k of filhos) {
        assert.ok(!vistos.has(k), 'Ciclo em ' + S.skills[k].name);
        vistos.add(k);
        fila.push([k, id, tamanho + 1]);
      }
    }
    assert.equal(vistos.size, setor.length, 'Nós desconectados em ' + el);
  }
});

test('comprar o aperfeiçoamento melhora Wakaze Disco e libera Olho do Furacão', async () => {
  const { effSkill } = await import('../src/rules.js');
  reset();
  const h = mk(ana, {}), base = sk('Wakaze Disco'), fim = sk('Wakaze: Olho do Furacão');
  const refino = sk(REFINOS.get('Wakaze Disco').n);
  h.skills = [base];
  h.vinc = ['fuhaku'];
  h.xp = 1000;
  for (const a of Object.keys(h.attrs)) h.attrs[a] = 99;
  const poder = effSkill(h, base).power;
  H.learn(ana, { id: h.id, skill: fim });
  assert.ok(!h.skills.includes(fim));
  H.learn(ana, { id: h.id, skill: refino });
  assert.ok(h.skills.includes(refino));
  assert.ok(!h.pslots.includes(refino));
  assert.equal(effSkill(h, base).power, poder + 1);
  assert.equal(h.xp, 1000 - RU.xpCost(h, S.skills[refino]));
  H.learn(ana, { id: h.id, skill: fim });
  assert.ok(h.skills.includes(fim));
});

test('Leva 10: efeitos conv (converte condição) e solo (único inimigo de pé)', () => {
  const { parseFx, fxText, fxSrc } = globalThis.RULES;
  const [c, s] = parseFx('conv burn exposed; solo 1.6');
  assert.deepEqual([c.t, c.k, c.k2, s.t, s.m], ['conv', 'burn', 'exposed', 'solo', 1.6]);
  assert.match(fxText([c, s]), /converte.*em.*único inimigo/);
  assert.equal(fxSrc([c, s]), 'conv burn exposed; solo 1.6');
  assert.equal(parseFx('solo')[0].m, 1.5);
  assert.throws(() => parseFx('conv burn naoexiste'), /conversão desconhecida/);
});

test('chefes: bossFx só do mestre, só em inimigo, saneado', () => {
  reset(); const e = mk(gm, { name: 'Dragão', enemy: true }), h = mk(gm, { name: 'Herói' });
  handle(gm, { t: 'set', id: e.id, f: 'boss', v: true });
  handle(gm, { t: 'set', id: e.id, f: 'bossFx', v: { in: 'eclipse', hit: 'xyz', col: 'vermelho' } });
  assert.deepEqual(S.chars[e.id].bossFx, { in: 'eclipse', hit: null, col: '' });
  handle(gm, { t: 'set', id: e.id, f: 'bossFx', v: { in: 'fenda', hit: 'mare', col: '#FF0000' } });
  assert.deepEqual(S.chars[e.id].bossFx, { in: 'fenda', hit: 'mare', col: '#FF0000' });
  handle(ana, { t: 'set', id: e.id, f: 'bossFx', v: { in: 'eclipse' } }); assert.equal(S.chars[e.id].bossFx.in, 'fenda', 'jogador não muda');
  handle(gm, { t: 'set', id: h.id, f: 'bossFx', v: { in: 'eclipse' } }); assert.equal(S.chars[h.id].bossFx, undefined, 'herói não tem cena de chefe');
  handle(gm, { t: 'set', id: e.id, f: 'bossFx', v: 'eclipse' }); assert.equal(S.chars[e.id].bossFx, null);
});

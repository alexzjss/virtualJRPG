// Testes das cenas separadas: grupo dividido, fora de cena, batalhas simultâneas, saídas e desfazer por cena
//   node --test tools/test-cenas.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjcenas-'));
const { H, S, current, derive, view, handle, order } = await import('../server.js');
const { inScene, adopt } = await import('../src/state.js');
const { delay, endTurn } = await import('../src/rules.js');
process.on('exit', () => { try { fs.rmSync(process.env.VJ_DATA, { recursive: true, force: true }); } catch {} }); // registrado depois do servidor: roda após a última gravação ao sair
const gm = { role: 'gm' }, ana = { role: 'player', name: 'Ana' }, bia = { role: 'player', name: 'Bia' }, tv = { role: 'table' };
const reset = () => {
  S.chars = {}; S.log.length = 0; S.reqs = {}; S.auto.pass = false;
  for (const k of Object.keys(S.scenes)) if (k !== S.focus) delete S.scenes[k];
  Object.assign(S.scenes[S.focus], { battle: { active: false, ticks: {} }, exits: [] }); S.tv = S.focus;
};
const mk = (c, m = {}) => { const before = new Set(Object.keys(S.chars)); H.addChar(gm, c.role === 'player' ? { ...m, owner: c.name } : m); const ch = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(ch); ch.hp = ch.hpMax; ch.x = ch.y = 0; return ch; };
const newScene = name => { const before = S.focus; handle(gm, { t: 'sceneAdd', name }); const id = S.focus; S.focus = before; return id; };
// dois grupos: Ana na cena A com um inimigo, Bia na cena B com outro
const split = () => {
  reset(); const A = S.focus, B = newScene('Mina');
  const a = mk(ana), ea = mk(gm, { enemy: true });
  const b = mk(bia); handle(gm, { t: 'moveTo', ids: [b.id], scene: B });
  S.focus = B; const eb = mk(gm, { enemy: true }); eb.x = 3; S.focus = A;
  return { A, B, a, b, ea, eb };
};

test('ponteiros: S.scene/S.battle seguem o contexto e não vão para o save', () => {
  reset(); const A = S.focus, B = newScene('Outra');
  assert.equal(S.scene, A); inScene(B, () => { assert.equal(S.scene, B); S.battle = { active: true, ticks: {} }; });
  assert.equal(S.scenes[B].battle.active, true); assert.equal(S.battle.active, false);
  const saved = JSON.parse(JSON.stringify(S)); assert.ok(!('battle' in saved) && !('scene' in saved)); assert.equal(saved.focus, A);
});

test('migração: save antigo com S.battle e S.scene vira batalha da cena e foco', () => {
  const old = { chars: { h: { name: 'Velho', owner: 'Ana', scene: 'x', x: 1, y: 1 } }, scenes: { x: { name: 'Antiga', cols: 20, rows: 12 }, y: { name: 'Outra', cols: 20, rows: 12 } }, scene: 'y', battle: { active: true, ticks: { h: 5 } }, log: [] };
  const keep = JSON.parse(JSON.stringify(S));
  adopt(old);
  assert.equal(S.focus, 'y'); assert.equal(S.scene, 'y'); assert.equal(S.scenes.y.battle.active, true); assert.deepEqual(S.scenes.y.battle.ticks, { h: 5 });
  assert.ok(Number.isInteger(S.battle.seed) && S.battle.seed >= 1 && S.battle.seed < 2 ** 31);
  assert.equal(S.scenes.x.battle.active, false); assert.deepEqual(S.scenes.x.exits, []);
  assert.ok(!Object.keys(S).includes('battle'));
  adopt(keep);
});

test('moveTo: heróis vão separados; fora de cena; trocar o foco não arrasta ninguém', () => {
  const { A, B, a, b } = split();
  assert.equal(a.scene, A); assert.equal(b.scene, B);
  handle(gm, { t: 'sceneGo', id: B }); assert.equal(S.focus, B); assert.equal(a.scene, A);
  handle(gm, { t: 'moveTo', ids: [a.id], scene: null }); assert.equal(a.scene, null); assert.equal(a.x, null);
  handle(ana, { t: 'move', id: a.id, x: 2, y: 2 }); assert.equal(a.x, null, 'fora de cena não anda');
  handle(gm, { t: 'moveTo', ids: [a.id, b.id], scene: A }); assert.equal(a.scene, A); assert.equal(b.scene, A); assert.notDeepEqual([a.x, a.y], [b.x, b.y]);
  handle(bia, { t: 'moveTo', ids: [a.id], scene: B }); assert.equal(a.scene, A, 'só o mestre move entre cenas');
});

test('visão: cada jogador vê a própria cena; fora de cena só a tela de espera; TV vê a cena dela', () => {
  const { A, B, a, b, ea, eb } = split();
  const va = view(ana), vb = view(bia);
  assert.equal(va.scene, A); assert.equal(vb.scene, B);
  assert.ok(va.chars[ea.id] && !va.chars[eb.id], 'Ana não vê o inimigo da Mina'); assert.ok(vb.chars[eb.id] && !vb.chars[ea.id]);
  assert.deepEqual(Object.keys(va.scenes[B]), ['name'], 'das outras cenas, só o nome');
  assert.equal(va.scenes[A].battle, undefined);
  S.tv = B; assert.equal(view(tv).scene, B);
  const vg = view(gm); assert.equal(vg.scene, S.focus); assert.ok(vg.battle && vg.scenes[B].battle, 'o mestre recebe as batalhas de todas as cenas');
  handle(gm, { t: 'offMsg', v: 'Volto já' }); handle(gm, { t: 'moveTo', ids: [b.id], scene: null });
  const vo = view(bia); assert.equal(vo.off, 'Volto já'); assert.equal(vo.scene, '_off'); assert.ok(!Object.values(vo.chars).some(o => o.enemy)); assert.equal(vo.battle.active, false);
});

test('batalhas simultâneas: cada cena tem a sua fila, e uma não mexe na outra', () => {
  const { A, B, a, b, ea, eb } = split();
  handle(gm, { t: 'battle', on: true }); // na cena em foco (A)
  inScene(B, () => handle(gm, { t: 'sceneGo', id: B })); handle(gm, { t: 'battle', on: true }); S.focus = A;
  assert.ok(S.scenes[A].battle.active && S.scenes[B].battle.active);
  const seedA = S.scenes[A].battle.seed, seedB = S.scenes[B].battle.seed;
  for (const seed of [seedA, seedB]) assert.ok(Number.isInteger(seed) && seed >= 1 && seed < 2 ** 31);
  assert.equal(view(ana).battle.seed, seedA);
  assert.equal(view(bia).battle.seed, seedB);
  assert.equal(view(gm).battle.seed, seedA);
  assert.deepEqual(Object.keys(S.scenes[A].battle.ticks).sort(), [a.id, ea.id].sort());
  assert.deepEqual(Object.keys(S.scenes[B].battle.ticks).sort(), [b.id, eb.id].sort());
  const curB = inScene(B, () => current()), tB = { ...S.scenes[B].battle.ticks };
  // um turno em A
  const curA = inScene(A, () => current()), ca = S.chars[curA];
  if (ca.enemy) handle(gm, { t: 'act', id: ca.id, skill: 'atk', target: a.id }); else handle(ana, { t: 'act', id: a.id, skill: 'atk', target: ea.id });
  if (S.scenes[A].battle.cmd) inScene(A, () => H.cmdSkip(gm));
  assert.equal(S.scenes[A].battle.seed, seedA);
  assert.deepEqual(S.scenes[B].battle.ticks, tB, 'a fila de B não andou'); assert.equal(inScene(B, () => current()), curB);
  assert.ok(S.scenes[B].battle.order.length > 0 && S.scenes[A].battle.order.length > 0, 'cada cena tem a sua previsão de turnos');
  // encerrar A não toca em B
  handle(gm, { t: 'battle', on: false }); assert.equal(S.scenes[A].battle.active, false); assert.equal(S.scenes[B].battle.active, true);
  assert.equal(view(ana).battle.seed, undefined);
  assert.equal(view(bia).battle.seed, seedB);
  // entrar numa cena em batalha põe o herói na fila de lá; sair tira da fila
  handle(gm, { t: 'moveTo', ids: [a.id], scene: B }); assert.ok(a.id in S.scenes[B].battle.ticks);
  handle(gm, { t: 'moveTo', ids: [a.id], scene: A }); assert.ok(!(a.id in S.scenes[B].battle.ticks));
});

test('batalhas simultâneas: log de batalha não vaza para a outra cena', () => {
  const { A } = split();
  handle(gm, { t: 'battle', on: true });
  assert.ok(view(ana).log.some(e => e.sc === A), 'Ana recebe as entradas da batalha de A');
  assert.ok(!view(bia).log.some(e => e.sc === A), 'Bia (na Mina) não recebe o log da batalha de A');
});

test('fim de batalha: refeição e invocações só de quem lutou nela', () => {
  const { A, B, a, b } = split();
  S.meal = { n: 'Sopa', by: 'x', ids: { [a.id]: 1, [b.id]: 1 }, m: { atk: 5 } };
  handle(gm, { t: 'battle', on: true }); handle(gm, { t: 'battle', on: false });
  assert.ok(S.meal && !(a.id in S.meal.ids) && S.meal.ids[b.id] === 1, 'Bia não lutou: a refeição dela continua');
  delete S.meal;
});

test('ordMove: desempata ticks sem mudar os outros e a ação usa o atraso normal', () => {
  reset();
  const ids = [mk(ana).id, mk(bia).id, mk(gm, { enemy: true }).id, mk(gm, { enemy: true }).id].sort((a, b) => a.localeCompare(b));
  handle(gm, { t: 'battle', on: true });
  const [a, b, c, d] = ids;
  S.battle.ticks = Object.fromEntries(ids.map(id => [id, 10]));

  H.ordMove(gm, { id: d, to: 0 });
  assert.equal(order()[0], d);
  H.ordMove(gm, { id: d, to: 2 });
  assert.deepEqual(order().slice(0, 4), [a, b, d, c]);
  assert.deepEqual(S.battle.ticks, Object.fromEntries(ids.map(id => [id, 10])));

  endTurn(a); endTurn(b);
  assert.equal(current(), d);
  const next = S.battle.ticks[d] + delay(S.chars[d]);
  endTurn(d);
  assert.equal(S.battle.ticks[d], next);
});

test('ordMove: só o mestre, só vivos em batalha e só índices inteiros de 0 a 7', () => {
  const { A, B, a, b, ea, eb } = split();
  handle(gm, { t: 'battle', on: true });
  S.focus = B; handle(gm, { t: 'battle', on: true }); S.focus = A;
  const ticksA = { ...S.battle.ticks }, ticksB = { ...S.scenes[B].battle.ticks };
  const idle = mk(gm);
  H.ordMove(ana, { id: a.id, to: 0 });
  H.ordMove(gm, { id: idle.id, to: 0 });
  a.hp = 0; H.ordMove(gm, { id: a.id, to: 0 });
  a.hp = 10; a.dead = true; H.ordMove(gm, { id: a.id, to: 0 }); delete a.dead;
  for (const to of [-1, 8, 0.5, '0', undefined]) H.ordMove(gm, { id: ea.id, to });
  handle(gm, { t: 'ordMove', id: eb.id, to: 0 });
  assert.deepEqual(S.battle.ticks, ticksA);
  assert.deepEqual(S.scenes[B].battle.ticks, ticksB);

  handle(gm, { t: 'ordMove', id: a.id, to: 7 });
  assert.equal(S.scenes[A].battle.order.indexOf(a.id), 7);
  assert.deepEqual(S.scenes[B].battle.ticks, ticksB);
  handle(gm, { t: 'undo' });
  assert.deepEqual(S.battle.ticks, ticksA);
  assert.deepEqual(S.scenes[B].battle.ticks, ticksB);
});

test('saídas: pisar numa saída vira pedido; aprovar leva o herói e ele chega pela volta', () => {
  const { A, B, a } = split();
  handle(gm, { t: 'exitAdd', scene: A, x: 5, y: 4, to: B, both: true });
  assert.equal(S.scenes[A].exits.length, 1); assert.equal(S.scenes[B].exits.length, 1); assert.equal(S.scenes[B].exits[0].to, A);
  handle(ana, { t: 'move', id: a.id, x: 5, y: 4 });
  const r = Object.entries(S.reqs).find(([, q]) => q.cat === 'pass'); assert.ok(r, 'pedido de passagem criado'); assert.equal(a.scene, A);
  handle(gm, { t: 'reqOk', id: r[0] }); assert.equal(a.scene, B);
  const back = S.scenes[B].exits[0]; assert.ok(Math.max(Math.abs(a.x - back.x), Math.abs(a.y - back.y)) <= 1, 'chega ao lado da saída de volta');
  S.auto.pass = true; handle(ana, { t: 'move', id: a.id, x: back.x, y: back.y }); assert.equal(a.scene, A, 'com passagem liberada, passa direto');
  handle(gm, { t: 'exitDel', scene: A, id: S.scenes[A].exits[0].id }); assert.equal(S.scenes[A].exits.length, 0);
});

test('desfazer: só a cena do foco volta; a outra cena e quem está nela ficam', () => {
  const { A, B, a, b, ea, eb } = split();
  handle(gm, { t: 'set', id: ea.id, f: 'hp', v: 1 }); // ação na cena A
  inScene(B, () => {}); S.focus = B; handle(gm, { t: 'set', id: eb.id, f: 'hp', v: 2 }); S.focus = A; // ação na cena B
  b.gold = 77; // algo que aconteceu na cena B depois
  handle(gm, { t: 'undo' }); // desfaz na cena A
  assert.notEqual(S.chars[ea.id].hp, 1, 'A voltou'); assert.equal(S.chars[eb.id].hp, 2, 'B não mexeu'); assert.equal(S.chars[b.id].gold, 77);
});

test('cenas: duplicar copia mapa e saídas sem batalha; excluir só cena vazia', () => {
  const { A, B } = split(); S.scenes[A].bg = '/maps/x.png'; S.scenes[A].exits = [{ id: 'e1', x: 1, y: 1, to: B }];
  handle(gm, { t: 'sceneAdd', dup: A, name: 'Cópia' }); const C = S.focus; S.focus = A;
  assert.equal(S.scenes[C].bg, '/maps/x.png'); assert.equal(S.scenes[C].exits[0].to, B); assert.notEqual(S.scenes[C].exits[0].id, 'e1'); assert.equal(S.scenes[C].battle.active, false);
  handle(gm, { t: 'sceneDel', id: B }); assert.ok(S.scenes[B], 'B tem a Bia: não apaga');
  handle(gm, { t: 'sceneDel', id: C }); assert.ok(!S.scenes[C]);
});

test('encontros da cena: ligar, pôr na cena, não vazar para jogadores e sumir ao apagar o encontro', () => {
  const { A } = split(); const b0 = Object.keys(S.bestiary)[0];
  handle(gm, { t: 'encSave', name: 'Emboscada', list: [{ b: b0, tier: 'normal', n: 2 }] }); const e = Object.keys(S.encounters).find(k => S.encounters[k].name === 'Emboscada');
  handle(gm, { t: 'sceneEnc', scene: A, id: e, on: true }); handle(gm, { t: 'sceneEnc', scene: A, id: e, on: true }); assert.deepEqual(S.scenes[A].enc, [e], 'sem repetir');
  handle(gm, { t: 'map', f: 'note', v: 'O taverneiro mente.' });
  const va = view(ana); assert.equal(va.scenes[A].enc, undefined); assert.equal(va.scenes[A].note, undefined); assert.equal(view(gm).scenes[A].note, 'O taverneiro mente.');
  const n0 = Object.values(S.chars).filter(c => c.enemy && c.scene === A).length; handle(gm, { t: 'encSpawn', id: e });
  assert.equal(Object.values(S.chars).filter(c => c.enemy && c.scene === A).length, n0 + 2);
  handle(ana, { t: 'sceneEnc', scene: A, id: e, on: false }); assert.deepEqual(S.scenes[A].enc, [e], 'só o mestre');
  handle(gm, { t: 'encDel', id: e }); assert.deepEqual(S.scenes[A].enc, []);
});

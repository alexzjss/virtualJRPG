// Testes das regras e permissões: node --test tools/test.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjtest-'));
const { H, S, current, derive, view } = await import('../server.js');
const gm = { role: 'gm' }, ana = { role: 'player', name: 'Ana' }, bia = { role: 'player', name: 'Bia' };
const reset = () => { S.chars = {}; S.log.length = 0; S.battle = { active: false, ticks: {} }; };
const mk = (c, m) => { const before = new Set(Object.keys(S.chars)); H.addChar(c, m); const ch = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(ch); ch.hp = ch.hpMax; return ch; };
const sk = n => Object.keys(S.skills).find(k => S.skills[k].name === n);

test('bestiário inicial e grade são criados', () => { assert.ok(Object.keys(S.bestiary).length >= 5); assert.ok(Object.keys(S.skills).length >= 55); });
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

// Testes do motor luminoso (regras puras de public/js/luz-perfis.js): node --test tools/test-luz.js
import test from 'node:test'; import assert from 'node:assert/strict';
await import('../public/js/anim-profiles.js'); await import('../public/js/luz-perfis.js');
const L = globalThis.LUZP, AP = globalThis.ANIM_PROFILES;

test('LUZP: orçamento, motor, duração e promessas', () => {
  assert.deepEqual(L.budget('high'), { particles: 6000, bloom: .5, post: true });
  assert.deepEqual(L.budget('medium'), { particles: 2500, bloom: .25, post: true });
  assert.deepEqual(L.budget('low'), { particles: 0, bloom: 0, post: false });
  assert.equal(L.engineFor({ style: 'luz', webgl2: true, level: 'high', lost: false }), 'luz');
  for (const o of [{ style: 'classico' }, { webgl2: false }, { level: 'low' }, { lost: true }]) assert.equal(L.engineFor({ style: 'luz', webgl2: true, level: 'medium', lost: false, ...o }), 'classico');
  const P = AP.profile({ name: 'Bola de Fogo', el: 'kagutsuchi', kind: 'dmg' });
  assert.equal(L.duration(P, { speed: 1, sig: 'none' }), 2500); assert.equal(L.duration(P, { speed: 2, sig: 'none' }), 1250);
  assert.equal(L.duration(P, { speed: 1, sig: 'line' }), 3000); assert.equal(L.duration(P, { speed: 1, sig: 'ult' }), 5000);
  assert.equal(L.duration(P, { speed: 1, reduced: true, sig: 'ult' }), 400);
  assert.deepEqual(L.promiseTimes(P, 2500), { impact: Math.round(2500 * P.impact), done: 2500 });
});

test('LUZP: malha só com imagem utilizável; curvas voltam ao repouso; idle só no topo', () => {
  assert.equal(L.meshable({ src: '/img/a.png', sameOrigin: true, loaded: true }), true);
  for (const o of [{ src: '' }, { sameOrigin: false }, { loaded: false }]) assert.equal(L.meshable({ src: '/img/a.png', sameOrigin: true, loaded: true, ...o }), false);
  for (const k of ['projectile', 'beam', 'slash', 'smash', 'pierce', 'dash', 'area', 'rain', 'ritual', 'summon', 'psychic', 'musical', 'heal', 'barrier', 'form', 'hit', 'dodge', 'parry', 'hurt', 'limit', 'vit', 'foge'])
    for (const t of [0, 1]) assert.deepEqual(L.bodyCurve(k, t), { bend: 0, squash: 0, twist: 0, dx: 0, dy: 0, shake: 0 }, k + '@' + t);
  assert.ok(Math.abs(L.bodyCurve('ko', 1).bend) >= 1.3);
  assert.ok(L.bodyCurve('smash', .3).squash !== 0, 'smash tem antecipação');
  assert.equal(L.idleSway(1.2, 1, .5), 0); assert.ok(Math.abs(L.idleSway(1.2, 1, 1)) <= 3); assert.equal(L.idleSway(1.2, 0, 1), 0);
});

test('LUZP: materiais, fases e partilha do orçamento', () => {
  for (const el of Object.keys(AP.PALETTES)) { const m = L.material(el); assert.ok(m.glyph && m.motion && m.residue, el); }
  assert.equal(L.material('kagutsuchi').motion, 'rise'); assert.equal(L.material('indra').motion, 'arc'); assert.deepEqual(L.material('???'), L.material('fis'));
  for (const fam of AP.FAMILIES) { const ph = L.phases(fam, 2500); assert.equal(ph.impact[0], Math.round(2500 * AP.IMPACT[fam]), fam);
    assert.equal(ph.charge[0], 0); assert.equal(ph.charge[1], ph.fire[0]); assert.equal(ph.fire[1], ph.travel[0]); assert.equal(ph.travel[1], ph.impact[0]); assert.equal(ph.impact[1], 2500, fam); }
  const s = L.share(2500, 8, 5); assert.ok(s.perHit * 8 * 5 <= 2500); assert.equal(s.impactFloor, 60);
  assert.equal(L.share(2500, 100, 1).impactFloor, 25);
});

test('LUZP: pulsos de pós nascem e somem na janela', () => {
  for (const [k, ms] of [['bloom', 220], ['shock', 450], ['invert', 34], ['chroma', 260], ['speed', 400]]) {
    assert.ok(L.pulse(k, 0, 1) > 0, k); assert.equal(L.pulse(k, ms + 1, 1), 0, k); assert.equal(L.pulse(k, -1, 1), 0, k); assert.ok(L.pulse(k, ms / 2, .5) <= .5, k); }
});

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

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

test('LUZP: estilo dos números', () => {
  const n = o => L.numberStyle({ crit: false, weak: false, total: false, heal: false, miss: false, ...o });
  assert.deepEqual(n({}), { scale: 1, star: false, tag: '', lifeMs: 900 });
  assert.deepEqual(n({ crit: true }), { scale: 1.45, star: true, tag: '', lifeMs: 1100 });
  assert.equal(n({ weak: true }).tag, 'Fraqueza'); assert.equal(n({ total: true }).scale, 1.6); assert.equal(n({ total: true }).lifeMs, 1200); assert.equal(n({ miss: true }).lifeMs, 700); assert.equal(n({ miss: true }).scale, .85);
  assert.deepEqual(n({ heal: true }), { scale: 1, star: false, tag: '', lifeMs: 900 });
});

test('LUZP: linha do tempo do Limite', () => {
  const T = L.ultTimeline(5000);
  assert.deepEqual(T.map(x => x.k), ['dim', 'bg', 'art', 'name', 'back', 'strike']);
  assert.deepEqual(T.map(x => [x.at, x.ms]), [[0, 300], [200, 1600], [300, 1500], [700, 1100], [1800, 400], [2200, 2800]]);
  const end = T.at(-1); assert.equal(end.at + end.ms, 5000); const back = T.find(x => x.k === 'back'); assert.equal(back.at + back.ms, end.at);
  const T2 = L.ultTimeline(2500); assert.equal(T2.at(-1).at + T2.at(-1).ms, 2500); assert.equal(T2.find(x => x.k === 'strike').at, 1100);
});

test('LUZP: assinaturas das camadas 8–10 por tema × grupo de família', () => {
  for (const [f, gk] of [['projectile', 'dist'], ['beam', 'dist'], ['psychic', 'dist'], ['musical', 'dist'], ['slash', 'corpo'], ['smash', 'corpo'], ['pierce', 'corpo'], ['dash', 'corpo'], ['area', 'area'], ['rain', 'area'], ['ritual', 'rito'], ['summon', 'rito'], ['heal', 'apoio'], ['barrier', 'apoio'], ['form', 'apoio']]) assert.equal(L.famGroup(f), gk, f);
  // tema como arvore/ordem.js temaNo, sobre o formato das skills no cliente
  assert.equal(L.temaOf({ kind: 'dmg', fx: [{ t: 'pierce', p: 60 }] }), 0);
  assert.equal(L.temaOf({ kind: 'dmg', fx: [{ t: 'st', k: 'stun', ch: 40 }] }), 1); assert.equal(L.temaOf({ kind: 'util', st: 'atkUp' }), 1); assert.equal(L.temaOf({ kind: 'dmg', st: 'burn' }), 1);
  assert.equal(L.temaOf({ kind: 'heal', st: 'atkUp' }), 2); assert.equal(L.temaOf({ kind: 'util', fx: [{ t: 'shield' }] }), 2); assert.equal(L.temaOf({ kind: 'dmg', rea: 1 }), 2); assert.equal(L.temaOf({ kind: 'passive', on: 'hurt' }), 2);
  assert.equal(L.temaOf({ kind: 'passive', on: 'turn' }), 3);
  for (const o of [{ kind: 'form' }, { circ: 1 }, { dom: 1 }, { duo: 'x' }, { summon: 1 }, { vow: 1 }, { aw: 1 }]) assert.equal(L.temaOf({ kind: 'dmg', ...o }), 4, JSON.stringify(o));
  assert.equal(L.temaOf({ kind: 'dmg', tm: 3 }), 3, 'tm gravado no servidor vence');
  const s10 = { name: 'Golpe Perfeito', el: 'fis', kind: 'dmg', cam: 10, fx: [{ t: 'pierce', p: 60 }, { t: 'st', k: 'stun', ch: 40, n: 1 }] };
  assert.deepEqual(L.sigOf({ name: 'A', el: 'fis', kind: 'dmg', cam: 7 }), { kind: 'none' }); assert.deepEqual(L.sigOf({ name: 'A', el: 'fis', kind: 'dmg' }), { kind: 'none' });
  const r = L.sigOf(s10); assert.equal(r.kind, 'line'); assert.equal(r.intensity, 1); assert.match(r.key, /^1-(dist|corpo|area|rito|apoio)$/);
  assert.equal(L.sigOf({ ...s10, cam: 8 }).intensity, 1 / 3);
  assert.deepEqual(L.sigOf({ ...s10, limit: true }), { kind: 'none' }); assert.deepEqual(L.sigOf({ ...s10, dom: true }), { kind: 'none' });
  assert.deepEqual(L.sigOf(null), { kind: 'none' });
});

test('LUZP: presets de chefe saneados e cena padrão pelo elemento', () => {
  assert.deepEqual(L.BOSS_PRESETS, ['ascensao', 'eclipse', 'tempestade', 'mare', 'erupcao', 'julgamento', 'enxame', 'fenda']);
  assert.deepEqual(L.sanBossFx({ in: 'eclipse', hit: 'xyz', col: 'vermelho' }), { in: 'eclipse', hit: null, col: '' });
  assert.deepEqual(L.sanBossFx({ in: 'fenda', hit: 'mare', col: '#FF0000', lixo: 1 }), { in: 'fenda', hit: 'mare', col: '#FF0000' });
  for (const v of [null, 'eclipse', 3, []]) assert.equal(L.sanBossFx(v), null, JSON.stringify(v));
  for (const [el, p] of [['kagutsuchi', 'erupcao'], ['susanoo', 'mare'], ['indra', 'tempestade'], ['tsukuyomi', 'eclipse'], ['amaterasu', 'julgamento'], ['hiruko', 'enxame'], ['oculto', 'fenda'], ['fis', 'ascensao'], ['atlas', 'ascensao']]) assert.equal(L.bossScene({ el }, 'in').preset, p, el);
  assert.equal(L.bossScene({ el: 'fis', bossFx: { in: 'eclipse', hit: null, col: '' } }, 'hit').preset, 'ascensao');
  assert.equal(L.bossScene({ el: 'fis', bossFx: { in: 'eclipse', hit: null, col: '#ff0000' } }, 'in').preset, 'eclipse');
  assert.equal(L.bossScene({ el: 'fis', bossFx: { in: 'eclipse', hit: null, col: '#ff0000' } }, 'in').col, '#ff0000');
  assert.equal(L.bossScene({ el: 'fis', bossFx: { in: 'bogus' } }, 'in').preset, 'ascensao', 'preset inválido salvo cai no elemento');
  assert.equal(L.bossScene({ el: 'kagutsuchi' }, 'in').col, '', 'sem cor: quem chama usa a cor do elemento');
});

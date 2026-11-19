// Testes dos cenários 3D (public/js/terreno3d.js): gradação do horário, ids e montagem pura
//   node --test tools/test-terreno.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA ??= fs.mkdtempSync(path.join(os.tmpdir(), 'vjterr-'));
await import('../public/js/terreno3d.js');
const T = globalThis.TERRENO3D;
const lum = h => { const v = h.replace('#', ''), f = v.length < 6 ? v.slice(0, 3).split('').map(c => c + c).join('') : v.slice(0, 6); const [r, g, b] = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255); return .2126 * r + .7152 * g + .0722 * b; };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

test('grade: dia intacto, tarde quente, noite escura mas legível, alfa preservado', () => {
  assert.equal(T.grade('#ffffff', 'dia'), '#ffffff');
  for (const c of ['#5fbd3c', '#3994f4']) { const k = lum(T.grade(c, 'noite')) / lum(c); assert.ok(k > .12 && k < .55, c + ' ' + k); }
  const [r0, , b0] = rgb('#3994f4'), [r1, , b1] = rgb(T.grade('#3994f4', 'tarde')); assert.ok(r1 > r0 && b1 < b0);
  assert.match(T.grade('#0000', 'noite'), /^#[0-9a-f]{3}0$/);
  assert.match(T.grade('#1d4a7a80', 'tarde'), /^#[0-9a-f]{6}80$/);
  const s = T.gradeAll('a #fff !#ff3000 b', 'noite'); assert.ok(s.includes('#ff3000') && !s.includes('!')); assert.ok(!s.includes('#fff '));
});

test('horaDe: sufixo válido ou dia', () => {
  assert.equal(T.horaDe('vulcao-noite'), 'noite'); assert.equal(T.horaDe('campo-tarde'), 'tarde');
  assert.equal(T.horaDe('praia-por-do-sol'), 'dia'); assert.equal(T.horaDe(''), 'dia'); assert.equal(T.horaDe(undefined), 'dia');
  assert.deepEqual(T.HORAS, ['dia', 'tarde', 'noite']);
});

test('construir: todos os temas, qualidades e horários montam sem DOM', () => {
  const nHigh = {};
  for (const tema of T.TEMAS) for (const Q of [0, 1, 2]) for (const hora of T.HORAS) {
    const r = T.construir(tema, Q, hora);
    assert.ok(r.n > 0 && r.html.length > 0, tema); assert.ok(r.faces['env-back'], tema + ' sem horizonte');
    if (hora !== 'dia') assert.ok(!r.html.includes('!#'), tema + ' marcador vazou');
    if (Q === 2 && hora === 'dia') nHigh[tema] = r.n;
    if (Q === 0 && hora === 'dia') nHigh[tema + '0'] = r.n;
    for (const G of r.groups) assert.ok(!(Math.abs(G.c[0]) < 1050 && G.c[2] > -2700 && G.c[2] < 550), `${tema}: grupo no meio da luta em ${G.c}`);
  }
  const ref = T.construir('floresta', 2, 'dia', 'simples').n; // teto: o Bosque antigo (o cel juntou as copas e ficou mais leve)
  for (const tema of T.TEMAS) { assert.ok(nHigh[tema] <= ref * 1.25 + 40, `${tema} pesado: ${nHigh[tema]} vs ${ref}`); assert.ok(nHigh[tema + '0'] <= nHigh[tema] * .75 + 10, tema + ' low'); }
});

test('ids do fundo: 10 temas × 3 horários e migração', async () => {
  const { BBG } = await import('../src/consts.js'); const { migrateBackdrop } = await import('../src/state.js');
  assert.equal(BBG.length, 30); assert.ok(BBG.includes('vulcao-noite') && BBG.includes('floresta-dia'));
  const m = bbg => { const sc = { bbg }; migrateBackdrop(sc); return sc.bbg; };
  assert.equal(m('praia-noite'), 'praia-noite'); assert.equal(m('praia-por-do-sol'), 'praia-dia'); assert.equal(m('cemiterio-luar'), 'floresta-dia');
  assert.equal(m('https://x/a.png'), 'https://x/a.png'); assert.equal(m(''), '');
});

test('estilo cel é o padrão: sem bolinhas e com contorno; "simples" volta ao antigo', () => {
  for (const tema of ['campo', 'castelo', 'pantano', 'neve']) { const h = T.construir(tema, 2, 'dia').html; assert.ok(!h.includes('class="tb"'), tema + ' ainda tem bolinha'); }
  assert.ok(T.construir('praia', 2, 'dia').html.includes('feMorphology'), 'recortes sem contorno');
  assert.ok(T.construir('floresta', 2, 'dia', 'simples').html.includes('class="tb"'));
  assert.ok(/(#|%23)ffffff/i.test(T.construir('campo', 2, 'dia').html), 'dia em cel escureceu como noite'); // branco segue branco de dia
  const nb = h => h.split('class="tb"').length - 1; // no Bosque só os cogumelos seguem redondos
  assert.ok(nb(T.construir('floresta', 2, 'dia').html) * 3 < nb(T.construir('floresta', 2, 'dia', 'simples').html));
});

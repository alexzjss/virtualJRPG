// Testes puros do mundo 3D (sem servidor): pisos, colisão, visão e gerador
//   node --test tools/test-mundo.js
// Os testes que sobem o servidor ficam em tools/test-mundo-srv.js
import test from 'node:test'; import assert from 'node:assert/strict';
await import('../public/js/mundo-pecas.js');
const P = globalThis.MPECAS;

test('pecas: código, decodificação e base64 ida e volta', () => {
  assert.equal(P.code('floresta', 'chao'), 1);
  assert.deepEqual(P.decode(P.code('campo', 'vazio')), { tema: 'campo', tipo: 'vazio' });
  assert.equal(P.decode(0), null);
  const u = new Uint8Array(4096); for (let i = 0; i < u.length; i++) u[i] = Math.floor(Math.random() * 256);
  assert.deepEqual(P.unpack(P.pack(u), u.length), u);
  const f = P.newFloor('f0', 'T', 40, 30, 'castelo');
  assert.equal(P.unpack(f.wallH, 40 * 31).length, 40 * 31); assert.equal(P.unpack(f.wallV, 41 * 30).length, 41 * 30);
  assert.equal(P.cell(f, 0, 0), P.code('castelo', 'chao')); assert.equal(P.cell(f, 40, 0), 0); assert.equal(P.cell(f, -1, 0), 0);
  assert.equal(P.blocksWalk(P.code('praia', 'agua')), false); assert.equal(P.blocksWalk(P.code('praia', 'denso')), true); assert.equal(P.blocksWalk(0), true);
  assert.equal(P.jumpable(P.code('praia', 'baixo')), true);
  assert.equal(P.edgeJumpable(4), false); assert.equal(P.edgeJumpable(5), true);
  assert.equal(P.edgeBlocksSight(4), false); assert.equal(P.edgeBlocksSight(2, true), false); assert.equal(P.edgeBlocksSight(2, false), true);
  assert.equal(P.edgeBlocksWalk(2, true), false); assert.equal(P.edgeBlocksWalk(5), true);
  assert.deepEqual(P.TEMAS, ['floresta', 'castelo', 'praia', 'neve', 'deserto', 'caverna', 'ruinas', 'pantano', 'vulcao', 'campo']);
  assert.ok(!JSON.stringify(f).includes('_c'));
});

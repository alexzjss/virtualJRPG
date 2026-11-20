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

// ----- colisão -----
await import('../public/js/mundo-colisao.js');
const C = globalThis.MCOL;
// andar 10×10 de campo; muda casas e arestas direto nos bytes decodificados e reempacota
const sala = (fn = () => {}) => { const f = P.newFloor('f0', 'T', 10, 10, 'campo'); const c = P.unpack(f.cell, 100), h = P.unpack(f.wallH, 110), v = P.unpack(f.wallV, 110);
  fn({ c: (x, y, t) => { c[y * 10 + x] = P.code('campo', t); }, h: (x, y, e) => { h[y * 10 + x] = e; }, v: (x, y, e) => { v[y * 11 + x] = e; } });
  f.cell = P.pack(c); f.wallH = P.pack(h); f.wallV = P.pack(v); return f; };

test('pecas: barreira aberta não bloqueia passagem nem visão', () => {
  assert.equal(P.edgeBlocksWalk(3, true), false); assert.equal(P.edgeBlocksWalk(3, false), true); assert.equal(P.edgeBlocksSight(3, true), false);
});

test('colisão: parede de aresta bloqueia, cerca só pulando, baixo só pulando, fundo nunca', () => {
  const f = sala(s => { s.v(5, 2, 1); s.v(5, 4, 5); s.c(5, 6, 'baixo'); s.c(5, 8, 'fundo'); });
  for (const [z, pulo, ok] of [[2.5, false, false], [2.5, true, false], [4.5, false, false], [4.5, true, true], [6.5, false, false], [6.5, true, true], [8.5, true, false]])
    assert.equal(C.segOk(f, {}, { x: 4.5, z }, { x: 6.5, z }, pulo), ok, `z=${z} pulo=${pulo}`);
  assert.equal(C.segOk(f, {}, { x: 1.5, z: 1.5 }, { x: 3.5, z: 1.5 }, false), true);
  assert.equal(C.segOk(f, {}, { x: 0.5, z: 0.5 }, { x: -1, z: 0.5 }, false), false); // borda do mapa
});

test('colisão: porta fechada bloqueia, aberta passa', () => {
  const f = sala(s => s.v(5, 2, 2)), porta = st => ({ p: { k: 'porta', f: 'f0', x: 5, y: 2, cfg: { e: 'v', estado: st } } });
  assert.equal(C.segOk(f, porta('fechada'), { x: 4.5, z: 2.5 }, { x: 5.5, z: 2.5 }, false), false);
  assert.equal(C.segOk(f, porta('aberta'), { x: 4.5, z: 2.5 }, { x: 5.5, z: 2.5 }, false), true);
});

test('colisão: slide desliza ao longo da parede em vez de parar', () => {
  const f = sala(s => { for (let y = 0; y < 10; y++) s.v(5, y, 1); });
  const p = C.slide(f, {}, { x: 4.5, z: 2.5 }, 1, 1);
  assert.ok(p.x < 5 - C.R + 1e-9, 'não atravessa'); assert.ok(p.z > 3.4, 'z avança');
});

test('colisão: quem está dentro de casa bloqueante consegue sair', () => {
  const f = sala(s => s.c(5, 5, 'baixo'));
  const p = C.slide(f, {}, { x: 5.5, z: 5.5 }, 0, 1); assert.ok(p.z > 6);
});

// recorte do ator: costas ao andar para longe da câmera, espelho ao andar para a esquerda da tela (guinada 45° = câmera em +x,+z)
test('atores: frente, costas e espelho seguem o rumo contra a câmera', async () => {
  const { facing } = await import('../public/js/mundo3d-atores.js');
  const yaw = Math.PI / 4, rumo = (x, z) => Math.atan2(x, z);
  assert.deepEqual(facing(rumo(-1, -1), yaw), { back: true, mirror: false }); // para longe da câmera
  assert.deepEqual(facing(rumo(1, 1), yaw), { back: false, mirror: false }); // vindo para a câmera
  assert.equal(facing(rumo(-1, 1), yaw).mirror, true); // esquerda da tela
  assert.equal(facing(rumo(1, -1), yaw).mirror, false); // direita da tela
  assert.equal(facing(rumo(1, -1), yaw + Math.PI).mirror, true); // girar a câmera 180° troca o lado
});

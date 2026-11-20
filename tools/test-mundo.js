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

// luzes do tema: lava a cada 3 casas de perigo do vulcão, braseiro a cada 6 arestas de parede do castelo
test('fx: pontos de luz da lava e dos braseiros', async () => {
  const { lightPoints } = await import('../public/js/mundo3d-fx.js');
  const f = P.newFloor('f0', 'T', 12, 12, 'castelo'), cell = P.unpack(f.cell, 144), wh = P.unpack(f.wallH, 12 * 13);
  for (let x = 0; x < 6; x++) cell[x] = P.code('vulcao', 'perigo'); // linha 0: 6 casas de lava
  for (let x = 0; x < 12; x++) wh[5 * 12 + x] = 1; // 12 arestas de parede no castelo
  f.cell = P.pack(cell); f.wallH = P.pack(wh);
  const pts = lightPoints(f);
  assert.equal(pts.filter(p => p.k === 'lava').length, 2); // (0,0) e (3,0)
  assert.equal(pts.filter(p => p.k === 'braseiro').length, 2); // 12 arestas / 6
});
test('fx: névoa por casa (0 escuro, 128 lembrado, 255 visível)', async () => {
  const { fogData } = await import('../public/js/mundo3d-fx.js');
  const seen = new Uint8Array(1); seen[0] = 0b0110; // casas 1 e 2 vistas, num andar 4×1
  const d = fogData(4, 1, P.pack(seen), new Set(['2,0']));
  assert.deepEqual([...d], [0, 128, 255, 0]);
  assert.deepEqual([...fogData(4, 1, P.pack(seen), null)], [0, 255, 255, 0]); // sem visão calculada, o visto vale como visível
});

// ----- visão -----
await import('../public/js/mundo-visao.js');
const V = globalThis.MVIS;
const ve = (bits, x, y) => bits[y * 10 + x] === 1;
test('visão: parede corta, porta fechada corta, porta aberta e grade não, denso corta atrás', () => {
  const pa = sala(s => { for (let y = 0; y < 10; y++) s.v(4, y, 1); });
  assert.ok(ve(V.fov(pa, {}, 1, 5, 8), 1, 5)); assert.ok(ve(V.fov(pa, {}, 1, 5, 8), 3, 5)); assert.ok(!ve(V.fov(pa, {}, 1, 5, 8), 5, 5)); assert.ok(!ve(V.fov(pa, {}, 1, 5, 8), 6, 2));
  const po = sala(s => { for (let y = 0; y < 10; y++) s.v(4, y, y === 5 ? 2 : 1); });
  const porta = estado => ({ d: { k: 'porta', f: 'f0', x: 4, y: 5, cfg: { e: 'v', estado } } });
  assert.ok(!ve(V.fov(po, porta('fechada'), 1, 5, 8), 5, 5));
  assert.ok(ve(V.fov(po, porta('aberta'), 1, 5, 8), 5, 5)); assert.ok(ve(V.fov(po, porta('aberta'), 1, 5, 8), 7, 5));
  const gr = sala(s => { for (let y = 0; y < 10; y++) s.v(4, y, 4); });
  assert.ok(ve(V.fov(gr, {}, 1, 5, 8), 6, 5));
  const de = sala(s => s.c(3, 5, 'denso'));
  const b = V.fov(de, {}, 1, 5, 8); assert.ok(ve(b, 3, 5)); assert.ok(!ve(b, 5, 5)); assert.ok(ve(b, 5, 2)); // a sombra do denso é um cone atrás dele, não a linha toda
  assert.ok(ve(V.fov(sala(s => s.c(1, 5, 'denso')), {}, 1, 5, 8), 1, 5)); // a origem sempre se vê
  assert.ok(!ve(V.fov(sala(), {}, 0, 0, 3), 9, 9)); // fora do raio
});
test('visão: raio 8 de dia, 4+2 à noite com tocha, caverna sempre noite', () => {
  assert.equal(V.radius('dia', 'campo', false), 8); assert.equal(V.radius('tarde', 'campo', false), 6); assert.equal(V.radius('noite', 'campo', false), 4);
  assert.equal(V.radius('noite', 'campo', true), 6); assert.equal(V.radius('dia', 'caverna', false), 4); assert.equal(V.radius('dia', 'caverna', true), 6);
  assert.equal(V.radius(undefined, 'campo', false), 8);
});
test('visão: simetria — se A vê B, B vê A', () => {
  let seed = 7; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const f = sala(s => { for (let i = 0; i < 14; i++) s.c(rnd(10), rnd(10), 'denso'); for (let i = 0; i < 18; i++) s.v(rnd(11), rnd(10), 1); for (let i = 0; i < 18; i++) s.h(rnd(10), rnd(11), 1); });
  let vistos = 0;
  for (let i = 0; i < 200; i++) {
    const ax = rnd(10), ay = rnd(10), bx = rnd(10), by = rnd(10);
    const ab = ve(V.fov(f, {}, ax, ay, 12), bx, by), ba = ve(V.fov(f, {}, bx, by, 12), ax, ay);
    assert.equal(ab, ba, `(${ax},${ay}) ↔ (${bx},${by})`); vistos += ab;
  }
  assert.ok(vistos > 20 && vistos < 190, 'mapa misto: ' + vistos);
});
test('visão: bits em base64 ida e volta e OU de duas visões', () => {
  const a = new Uint8Array(100), b = new Uint8Array(100); a[3] = 1; b[97] = 1; b[3] = 1;
  const o = V.orBits(a, b); assert.equal(o[3], 1); assert.equal(o[97], 1); assert.equal(o.reduce((s, x) => s + x, 0), 2);
  const r = new Uint8Array(4097); for (let i = 0; i < r.length; i += 3) r[i] = 1;
  assert.deepEqual(V.fromB64(V.toB64(r), r.length), r); assert.ok(V.toB64(r).length < 800);
});
test('fx: visão atual em base64 (vinda do servidor) vale como o Set', async () => {
  const { fogData } = await import('../public/js/mundo3d-fx.js');
  const seen = new Uint8Array(1), vis = new Uint8Array(1); seen[0] = 0b0110; vis[0] = 0b0100;
  assert.deepEqual([...fogData(4, 1, P.pack(seen), P.pack(vis))], [0, 128, 255, 0]);
});

test('estilhaço: 40 triângulos (12 na Baixa) cobrindo a tela inteira, com o meio deslocado', async () => {
  const { shards } = await import('../public/js/mundo3d-fx.js');
  const area = t => Math.abs((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])) / 2;
  for (const [q, n] of [['alta', 40], ['media', 40], ['baixa', 12]]) {
    const ts = shards(800, 500, q, () => .9);
    assert.equal(ts.length, n, q);
    assert.ok(Math.abs(ts.reduce((s, t) => s + area(t), 0) - 800 * 500) < 1e-6, 'sem buraco nem sobreposição');
    for (const t of ts) for (const [x, y] of t) assert.ok(x >= 0 && x <= 800 && y >= 0 && y <= 500, 'dentro da tela');
  }
  const pts = new Set(shards(800, 500, 'alta', () => .9).flat().map(p => p.join()));
  assert.ok(!pts.has('160,125'), 'os vértices de dentro saem da grade');
  assert.ok(pts.has('0,0') && pts.has('800,500'), 'os cantos ficam');
});

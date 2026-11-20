// Testes do mundo 3D que sobem o servidor: migração, walk, rede, rascunho, névoa, objetos, IA e batalha
//   node --test tools/test-mundo-srv.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjmundo-'));
const { H, S, derive, handle } = await import('../server.js');
const { adopt } = await import('../src/state.js');
const MW = await import('../src/mundo.js');
process.on('exit', () => { try { fs.rmSync(process.env.VJ_DATA, { recursive: true, force: true }); } catch {} });
const P = globalThis.MPECAS;
const gm = { role: 'gm' };
const bit = (b64, n, i) => (P.unpack(b64, Math.ceil(n / 8))[i >> 3] >> (i & 7)) & 1;

test('migração: cena 2D vira world com piso de imagem, portais e névoa', () => {
  const keep = JSON.parse(JSON.stringify(S));
  adopt({ chars: { h: { name: 'Ana', owner: 'Ana', scene: 'a', x: 20, y: 11 } }, focus: 'a', log: [],
    scenes: { a: { name: 'Vila', cols: 20, ar: 20 / 11.3, rows: 11.3, bg: 'https://x/x.png', bbg: 'castelo-noite', seen: { '2,2': 1 }, exits: [{ id: 'e1', x: 3, y: 4, to: 'b' }] }, b: { name: 'Mina', cols: 20, rows: 12 } } });
  const w = S.scenes.a.world, f = w.floors[0];
  assert.equal(f.w, 20); assert.equal(f.h, 12); assert.equal(f.img.url, 'https://x/x.png');
  assert.equal(w.tema, 'castelo'); assert.equal(w.hora, 'noite'); assert.equal(P.cell(f, 0, 0), P.code('castelo', 'chao'));
  const portal = Object.values(w.objs).find(o => o.k === 'portal'); assert.ok(portal); assert.equal(portal.x, 3); assert.equal(portal.y, 4); assert.equal(portal.cfg.to, 'b');
  assert.equal(bit(S.scenes.a.seenW.f0, 20 * 12, 2 * 20 + 2), 1); assert.equal(bit(S.scenes.a.seenW.f0, 20 * 12, 3 * 20 + 3), 0);
  const h = S.chars.h; assert.ok(h.pos.x < 20 && h.pos.z < 12); assert.equal(h.x, 19); assert.equal(h.pos.f, 'f0');
  assert.equal(S.scenes.b.world.tema, 'campo');
  adopt(keep);
});

test('migração: cena com 80 colunas fica com 80', () => {
  const keep = JSON.parse(JSON.stringify(S));
  adopt({ chars: {}, focus: 'a', log: [], scenes: { a: { name: 'Grande', cols: 80, rows: 40 } } });
  assert.equal(S.scenes.a.world.floors[0].w, 80); assert.equal(S.scenes.a.world.floors[0].h, 40);
  adopt(keep);
});

test('migração: 2D muda enquanto legacy, world acompanha; depois de editar no 3D, não', () => {
  const sc = S.scenes[S.focus];
  handle(gm, { t: 'map', f: 'bg', v: 'https://x/y.png' });
  assert.equal(sc.world.floors[0].img.url, 'https://x/y.png'); assert.equal(sc.world.legacy, true);
  const v = sc.world.v; sc.world.legacy = false;
  handle(gm, { t: 'map', f: 'bg', v: 'https://x/z.png' });
  assert.equal(sc.world.floors[0].img.url, 'https://x/y.png'); assert.equal(sc.world.v, v);
});

test('migração: mover token no 2D leva ch.pos para o centro da casa', () => {
  const sc = S.scenes[S.focus]; sc.world = null; MW.fixMundo();
  const before = new Set(Object.keys(S.chars)); H.addChar(gm, {}); const ch = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(ch);
  ch.scene = S.focus; handle(gm, { t: 'move', id: ch.id, x: 5, y: 3 });
  assert.equal(ch.x, 5); assert.deepEqual([ch.pos.x, ch.pos.z], [5.5, 3.5]);
});

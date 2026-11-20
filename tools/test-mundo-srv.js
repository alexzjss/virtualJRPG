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

// ----- walk -----
const net = await import('../src/net.js');
const cli = (name, sent = []) => ({ role: 'player', name, readyState: 1, sent, send: s => sent.push(JSON.parse(s)) });
let seq = 0, T = 1e6;
MW.clock.now = () => T;
const hero = (owner = 'Ana', x = 2, y = 2) => {
  const before = new Set(Object.keys(S.chars)); H.addChar(gm, { owner }); const ch = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(ch);
  ch.scene = S.focus; handle(gm, { t: 'move', id: ch.id, x, y }); return ch;
};
const freshWorld = () => { const sc = S.scenes[S.focus]; sc.world = null; delete sc.tatico; sc.battle = { active: false, ticks: {} }; MW.fixMundo(); return sc; };
const walk = (c, ch, x, z, o = {}) => handle(c, { t: 'walk', id: ch.id, sc: ch.scene, f: ch.pos.f, x, z, d: 0, m: 'a', s: ++seq, ...o });
const fixes = c => c.sent.filter(m => m.t === 'pos' && m.fix);

test('walk: aceita passo normal e lote atrasado de 300 ms; recusa salto de 5 casas com fix', () => {
  freshWorld(); const c = cli('Ana'), ch = hero();
  T += 100; walk(c, ch, 2.85, 2.5); assert.equal(ch.pos.x, 2.85);
  T += 300; walk(c, ch, 3.2, 2.5); walk(c, ch, 3.55, 2.5); walk(c, ch, 3.9, 2.5);
  assert.equal(ch.pos.x, 3.9); assert.equal(fixes(c).length, 0);
  T += 100; walk(c, ch, 8.9, 2.5); assert.equal(ch.pos.x, 3.9);
  assert.deepEqual(fixes(c).at(-1).fix, [ch.id, 'f0', 3.9, 2.5]);
});

test('walk: ignora mensagem de andar ou cena antigos e sequência repetida', () => {
  freshWorld(); const c = cli('Ana'), ch = hero();
  T += 100; walk(c, ch, 2.8, 2.5, { f: 'f9' }); assert.equal(ch.pos.x, 2.5);
  walk(c, ch, 2.8, 2.5, { sc: 'outra' }); assert.equal(ch.pos.x, 2.5);
  const s0 = ++seq; walk(c, ch, 2.7, 2.5, { s: s0 }); assert.equal(ch.pos.x, 2.7);
  walk(c, ch, 2.9, 2.5, { s: s0 }); assert.equal(ch.pos.x, 2.7);
  assert.equal(fixes(c).length, 0);
});

test('walk: jogador não move herói alheio; batalha ativa não anda', () => {
  freshWorld(); const ch = hero('Ana'); T += 100; walk(cli('Bia'), ch, 2.8, 2.5); assert.equal(ch.pos.x, 2.5);
  S.scenes[S.focus].battle = { active: true, ticks: {} }; walk(cli('Ana'), ch, 2.8, 2.5); assert.equal(ch.pos.x, 2.5);
  S.scenes[S.focus].battle = { active: false, ticks: {} };
});

test('walk: congelado não anda; tático recusa acima de n casas até tatNext', () => {
  freshWorld(); const c = cli('Ana'), ch = hero();
  handle(gm, { t: 'freeze', ids: [ch.id], on: true }); T += 100; walk(c, ch, 2.8, 2.5); assert.equal(ch.pos.x, 2.5);
  handle(gm, { t: 'freeze', ids: [ch.id], on: false }); handle(gm, { t: 'tatico', n: 1 });
  T += 300; walk(c, ch, 3.3, 2.5); assert.equal(ch.pos.x, 3.3);
  T += 300; walk(c, ch, 3.8, 2.5); assert.equal(ch.pos.x, 3.3);
  handle(gm, { t: 'tatNext' }); T += 300; walk(c, ch, 3.8, 2.5); assert.equal(ch.pos.x, 3.8);
  handle(gm, { t: 'tatico', n: null }); assert.equal(S.scenes[S.focus].tatico, undefined);
});

test('walk: troca de casa atualiza ch.x/ch.y', () => {
  freshWorld(); const c = cli('Ana'), ch = hero(); T += 200; walk(c, ch, 3.1, 2.5); assert.equal(ch.x, 3); assert.equal(ch.y, 2);
  T += 200; walk(c, ch, 3.1, 3.2); assert.equal(ch.y, 3);
});

test('walk: não chama push', () => {
  freshWorld(); const c = cli('Ana'), ch = hero(); const n = net.pushes();
  for (let i = 1; i <= 20; i++) { T += 100; walk(c, ch, 2.5 + i * .1, 2.5); }
  assert.equal(net.pushes(), n); assert.ok(ch.pos.x > 4);
});

test('walkGm teleporta sem validar e avisa o dono', () => {
  freshWorld(); const ch = hero(); handle(gm, { t: 'walkGm', id: ch.id, f: 'f0', x: 10.5, z: 7.5 });
  assert.deepEqual([ch.pos.x, ch.pos.z, ch.x, ch.y], [10.5, 7.5, 10, 7]);
});

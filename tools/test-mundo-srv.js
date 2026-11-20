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
const cli = (name, sent = []) => ({ role: 'player', name, readyState: 1, sent, send: s => sent.push(JSON.parse(s)), ping() {}, terminate() {}, close() {} });
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

// ----- canal pos e projeção -----
const sleep = ms => new Promise(r => setTimeout(r, ms));
const join = c => { net.wss.clients.add(c); return () => net.wss.clients.delete(c); };
const posMsgs = c => c.sent.filter(m => m.t === 'pos' && m.l);

test('pos: 10 clientes a 10 Hz geram um pos por cena a cada ~100 ms e nenhum push', async () => {
  freshWorld(); const cs = [], hs = [], off = [];
  for (let i = 0; i < 10; i++) { const c = cli('P' + i); cs.push(c); hs.push(hero('P' + i, 1 + i, 1)); off.push(join(c)); }
  const n = net.pushes(); let k = 0;
  const iv = setInterval(() => { T += 100; k++; hs.forEach((h, i) => walk(cs[i], h, h.pos.x, Math.min(10, h.pos.z + .3))); }, 100);
  await sleep(360); clearInterval(iv); await sleep(120);
  try {
    assert.equal(net.pushes(), n);
    for (const c of cs) { const p = posMsgs(c); assert.ok(p.length >= 2 && p.length <= 5, `recebeu ${p.length}`); assert.ok(p.every(m => m.sc === S.focus)); }
    const last = posMsgs(cs[0]).at(-1).l; assert.ok(last.length >= 2 && last.every(r => r.length === 6));
  } finally { off.forEach(f => f()); }
});

test('pos: cliente de outra cena não recebe', async () => {
  freshWorld(); const c = cli('Ana'), ch = hero('Ana'), fora = cli('Zed'), off = [join(c), join(fora)];
  H.addChar(gm, { owner: 'Zed' }); const z = Object.values(S.chars).find(o => o.owner === 'Zed'); z.scene = null; z.x = z.y = null;
  T += 100; walk(c, ch, 2.8, 2.5); await sleep(150);
  try { assert.equal(posMsgs(fora).length, 0); assert.ok(posMsgs(c).length >= 1); } finally { off.forEach(f => f()); }
});

test('view: ninguém recebe draft no state; jogador não recebe objeto oculto sem rev; mestre recebe', () => {
  const sc = freshWorld(); hero('Ana');
  sc.world.objs.o1 = { k: 'bau', f: 'f0', x: 1, y: 1, rot: 0, vis: 'oculto', auto: null, cfg: {} };
  sc.world.objs.o2 = { k: 'armadilha', f: 'f0', x: 2, y: 1, rot: 0, vis: 'visivel', auto: null, cfg: {} };
  sc.world.objs.o3 = { k: 'bau', f: 'f0', x: 3, y: 1, rot: 0, vis: 'oculto', auto: null, cfg: {}, rev: true };
  sc.draft = structuredClone(sc.world);
  const vp = net.view(cli('Ana')).scenes[S.focus], vg = net.view(gm).scenes[S.focus];
  assert.equal(vp.draft, undefined); assert.equal(vg.draft, undefined);
  assert.deepEqual(Object.keys(vp.world.objs).filter(k => k[0] === 'o').sort(), ['o3']);
  assert.deepEqual(Object.keys(vg.world.objs).filter(k => k[0] === 'o').sort(), ['o1', 'o2', 'o3']);
  assert.ok(sc.world.objs.o1, 'o filtro não mexe no estado');
  delete sc.draft;
});

// ----- rascunho do mestre -----
const gmc = () => ({ ...cli('Mestre'), role: 'gm' });
const draft = (c, ...ops) => handle(c, { t: 'wDraft', sc: S.focus, ops });

test('rascunho: jogador não recebe; publicar aplica, sobe v e tira legacy', () => {
  const sc = freshWorld(), g = gmc(), p = cli('Ana'), off = [join(g), join(p)], code = P.code('castelo', 'denso'), v0 = sc.world.v;
  try {
    handle(p, { t: 'wDraft', sc: S.focus, ops: [{ o: 'cells', f: 'f0', l: [[1, 1, code]] }] }); assert.equal(sc.draft, undefined);
    draft(g, { o: 'cells', f: 'f0', l: [[1, 1, code]] }, { o: 'goal', v: 'Achar a chave' });
    assert.equal(P.cell(sc.draft.floors[0], 1, 1), code); assert.notEqual(P.cell(sc.world.floors[0], 1, 1), code);
    assert.ok(g.sent.some(m => m.t === 'draft' && m.sc === S.focus && m.d.goal === 'Achar a chave'));
    assert.ok(!p.sent.some(m => m.t === 'draft')); assert.ok(!p.sent.some(m => m.t === 'state' && JSON.stringify(m).includes('Achar a chave')));
    handle(g, { t: 'wPub', sc: S.focus });
    assert.equal(P.cell(sc.world.floors[0], 1, 1), code); assert.equal(sc.world.v, v0 + 1); assert.equal(sc.world.legacy, false);
    assert.equal(sc.draft, undefined); assert.equal(sc.world.goal, 'Achar a chave');
    draft(g, { o: 'goal', v: 'outro' }); handle(g, { t: 'wDiscard', sc: S.focus });
    assert.equal(sc.draft, undefined); assert.equal(sc.world.goal, 'Achar a chave');
  } finally { off.forEach(f => f()); }
});

test('rascunho: limites recusam andar 65×65, código 99 e objeto de tipo desconhecido', () => {
  const sc = freshWorld(), g = gmc();
  draft(g, { o: 'floor', v: { id: 'f1', name: 'Grande', w: 65, h: 65 } });
  assert.ok(!sc.draft?.floors.some(f => f.id === 'f1'));
  draft(g, { o: 'floor', v: { id: 'f1', name: 'Porão', w: 64, h: 64 } });
  assert.equal(sc.draft.floors.find(f => f.id === 'f1').w, 64);
  const c0 = P.cell(sc.world.floors[0], 0, 0);
  draft(g, { o: 'cells', f: 'f0', l: [[0, 0, 99]] }, { o: 'edge', f: 'f0', k: 'h', l: [[0, 0, 6]] });
  assert.equal(P.cell(sc.draft.floors[0], 0, 0), c0); assert.equal(P.edgeH(sc.draft.floors[0], 0, 0), 0);
  draft(g, { o: 'obj', id: 'x1', v: { k: 'dragao', f: 'f0', x: 1, y: 1 } }, { o: 'obj', id: 'x2', v: { k: 'placa', f: 'f0', x: 2, y: 1, cfg: { texto: 'a'.repeat(900), lixo: 1 } } });
  assert.equal(sc.draft.objs.x1, undefined); assert.equal(sc.draft.objs.x2.cfg.texto.length, 800); assert.equal(sc.draft.objs.x2.cfg.lixo, undefined);
  const nos = Object.fromEntries(Array.from({ length: 80 }, (_, i) => ['n' + i, { fala: 'oi', escolhas: [{ txt: 'tchau', vai: 'n0', faz: 'fim' }] }]));
  draft(g, { o: 'obj', id: 'x3', v: { k: 'npc', f: 'f0', x: 3, y: 1, cfg: { nome: 'Velho', dialogo: { ini: 'n0', nos } } } });
  assert.equal(Object.keys(sc.draft.objs.x3.cfg.dialogo.nos).length, 60);
  delete sc.draft;
});

test('publicar mantém porta aberta por jogador no publicado', () => {
  const sc = freshWorld(), g = gmc();
  draft(g, { o: 'edge', f: 'f0', k: 'h', l: [[3, 3, 2]] }, { o: 'obj', id: 'd1', v: { k: 'porta', f: 'f0', x: 3, y: 3, cfg: { e: 'h', estado: 'fechada' } } },
    { o: 'obj', id: 'b1', v: { k: 'bau', f: 'f0', x: 5, y: 5, vis: 'oculto', cfg: { modo: 'uma', ouro: 10 } } });
  handle(g, { t: 'wPub', sc: S.focus }); assert.equal(sc.world.objs.d1.cfg.estado, 'fechada');
  draft(g, { o: 'cells', f: 'f0', l: [[1, 1, P.code('campo', 'baixo')]] }); // o rascunho nasce com a porta fechada
  sc.world.objs.d1.cfg.estado = 'aberta'; sc.world.objs.b1.cfg.aberto = true; sc.world.objs.b1.rev = true; // durante a sessão: abriu a porta, abriu e revelou o baú
  handle(g, { t: 'wPub', sc: S.focus });
  assert.equal(sc.world.objs.d1.cfg.estado, 'aberta'); assert.equal(sc.world.objs.b1.cfg.aberto, true); assert.equal(sc.world.objs.b1.rev, true);
  assert.equal(P.cell(sc.world.floors[0], 1, 1), P.code('campo', 'baixo'));
});

test('publicar com parede sobre herói o empurra para casa livre', () => {
  const sc = freshWorld(), g = gmc(), c = cli('Ana'), ch = hero('Ana', 2, 2), off = [join(g), join(c)];
  try {
    draft(g, { o: 'cells', f: 'f0', l: [[2, 2, P.code(sc.world.tema, 'denso')]] }); handle(g, { t: 'wPub', sc: S.focus });
    const f = sc.world.floors[0];
    assert.ok(!globalThis.MCOL.blockedAt(f, sc.world.objs, ch.pos.x, ch.pos.z, false), `preso em ${ch.pos.x},${ch.pos.z}`);
    assert.ok(Math.hypot(ch.pos.x - 2.5, ch.pos.z - 2.5) <= 1.01); assert.deepEqual([ch.x, ch.y], [Math.floor(ch.pos.x), Math.floor(ch.pos.z)]);
    assert.ok(c.sent.some(m => m.t === 'pos' && m.fix?.[0] === ch.id));
  } finally { off.forEach(f => f()); }
});

test('rascunho: mestre que conecta recebe o rascunho no canal draft', async () => {
  const sc = freshWorld(), g = gmc(); draft(g, { o: 'goal', v: 'Rascunho guardado' });
  const novo = gmc(), p = cli('Ana'); net.view(novo); net.view(p); await sleep(0);
  assert.ok(novo.sent.some(m => m.t === 'draft' && m.sc === S.focus && m.d?.goal === 'Rascunho guardado'));
  assert.ok(!p.sent.some(m => m.t === 'draft'));
  delete sc.draft;
});

// ----- condução do mestre -----
test('mestre move NPC com walk validado e herói congelado com walkGm', () => {
  freshWorld(); const g = gmc(), h = hero('Ana', 2, 2);
  const before = new Set(Object.keys(S.chars)); H.addChar(gm, { enemy: true }); const npc = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(npc);
  npc.scene = S.focus; handle(gm, { t: 'move', id: npc.id, x: 6, y: 6 });
  T += 100; walk(g, npc, 6.8, 6.5); assert.equal(npc.pos.x, 6.8); // o mestre anda com o NPC pelo mesmo walk
  T += 100; walk(g, npc, 12.8, 6.5); assert.equal(npc.pos.x, 6.8); // e o servidor confere igual (salto recusado)
  handle(gm, { t: 'freeze', ids: [h.id], on: true }); T += 100; walk(cli('Ana'), h, 2.8, 2.5); assert.equal(h.pos.x, 2.5);
  handle(gm, { t: 'walkGm', id: h.id, f: 'f0', x: 9.5, z: 4.5 }); assert.deepEqual([h.pos.x, h.pos.z], [9.5, 4.5]); // congelado, mas o mestre leva
  handle(gm, { t: 'freeze', ids: [h.id], on: false });
});

test('asView: o mestre recebe o world como o herói vê (sem oculto) e sem push', () => {
  const sc = freshWorld(), g = gmc(), h = hero('Ana', 2, 2), n = net.pushes();
  sc.world.objs.oc = { k: 'bau', f: 'f0', x: 1, y: 1, rot: 0, vis: 'oculto', auto: null, cfg: {} };
  sc.world.objs.vi = { k: 'bau', f: 'f0', x: 3, y: 1, rot: 0, vis: 'visivel', auto: null, cfg: {} };
  handle(g, { t: 'asView', id: h.id });
  const m = g.sent.find(x => x.t === 'asView'); assert.ok(m, 'resposta asView');
  assert.equal(m.id, h.id); assert.ok(m.w.objs.vi); assert.equal(m.w.objs.oc, undefined); assert.equal(net.pushes(), n);
  handle(cli('Ana'), { t: 'asView', id: h.id }); // jogador não pede isso
  delete sc.world.objs.oc; delete sc.world.objs.vi;
});

// ----- névoa e visão (Task 4.2) -----
// muro vertical inteiro na coluna X do andar 0 (porta na linha py, se houver); o world fica "do 3D" (sem legacy) e com névoa zerada
const muro = (sc, X, py = -1) => { const f = sc.world.floors[0], v = P.unpack(f.wallV, (f.w + 1) * f.h); for (let y = 0; y < f.h; y++) v[y * (f.w + 1) + X] = y === py ? 2 : 1; f.wallV = P.pack(v); sc.world.v++; };
const nevoa = sc => { for (const o of Object.values(S.chars)) if (o.scene === S.focus) o.scene = null; sc.world.legacy = false; sc.fogOn = true; sc.seenW = {}; MW.fixMundo(); };
const foe = (x, y) => { const before = new Set(Object.keys(S.chars)); H.addChar(gm, { enemy: true }); const e = S.chars[Object.keys(S.chars).find(k => !before.has(k))]; derive(e); e.scene = S.focus; handle(gm, { t: 'move', id: e.id, x, y }); return e; };
test('névoa: andar revela e lembra; inimigo atrás da parede não chega ao jogador nem ao pos', async () => {
  const sc = freshWorld(); muro(sc, 6); nevoa(sc);
  const g = gmc(), c = cli('Ana'), ch = hero('Ana', 2, 5), e = foe(9, 5), off = [join(g), join(c)], n = sc.world.floors[0].w * sc.world.floors[0].h, i = (x, y) => y * 20 + x;
  try {
    T += 100; walk(c, ch, 3.2, 5.5); assert.equal(ch.x, 3);
    assert.equal(bit(sc.seenW.f0, n, i(5, 5)), 1); assert.equal(bit(sc.seenW.f0, n, i(8, 5)), 0);
    T += 100; walk(c, ch, 2.5, 5.5); assert.equal(bit(sc.seenW.f0, n, i(5, 5)), 1, 'a casa vista fica lembrada');
    const vp = net.view(c); assert.ok(!vp.chars[e.id], 'inimigo atrás da parede não vai no state'); assert.ok(net.view(g).chars[e.id]);
    assert.equal(bit(vp.vis.f0, n, i(4, 5)), 1); assert.equal(bit(vp.vis.f0, n, i(9, 5)), 0); assert.equal(net.view(g).vis, undefined);
    c.sent.length = 0; g.sent.length = 0;
    handle(gm, { t: 'walkGm', id: e.id, f: 'f0', x: 9.6, z: 5.5 }); await sleep(150);
    assert.ok(!posMsgs(c).some(m => m.l.some(r => r[0] === e.id)), 'pos do inimigo escondido não vai ao jogador'); assert.ok(posMsgs(g).some(m => m.l.some(r => r[0] === e.id)));
    const p0 = net.pushes(); handle(gm, { t: 'walkGm', id: e.id, f: 'f0', x: 4.5, z: 5.5 }); await sleep(0);
    assert.ok(net.pushes() > p0, 'inimigo que entra na visão dispara push'); assert.ok(net.view(c).chars[e.id]);
    const p1 = net.pushes(); T += 100; walk(c, ch, 2.9, 5.5); await sleep(0); assert.equal(net.pushes(), p1, 'andar sem casa nova não dá push');
  } finally { off.forEach(f => f()); delete S.chars[e.id]; sc.fogOn = false; }
});
test('névoa: abrir porta revela a sala vista pela porta', async () => {
  const sc = freshWorld(); muro(sc, 6, 5); nevoa(sc);
  sc.world.objs.d1 = { k: 'porta', f: 'f0', x: 6, y: 5, rot: 0, vis: 'visivel', auto: null, cfg: { e: 'v', estado: 'fechada' } };
  const c = cli('Ana'), ch = hero('Ana', 2, 5), off = [join(c)], n = 240;
  try {
    T += 100; walk(c, ch, 3.2, 5.5); assert.equal(bit(sc.seenW.f0, n, 5 * 20 + 8), 0);
    sc.world.objs.d1.cfg.estado = 'aberta'; MW.MH.vision(S.focus); await sleep(0);
    assert.equal(bit(sc.seenW.f0, n, 5 * 20 + 8), 1); assert.equal(bit(sc.seenW.f0, n, 2 * 20 + 9), 0, 'só o que se vê pela porta');
    assert.equal(bit(net.view(c).vis.f0, n, 5 * 20 + 8), 1);
  } finally { off.forEach(f => f()); sc.fogOn = false; }
});
test('névoa: com fogOn desligado tudo fica visível, como hoje', () => {
  const sc = freshWorld(); muro(sc, 6); sc.world.legacy = false; sc.fogOn = false;
  const c = cli('Ana'), ch = hero('Ana', 2, 5), e = foe(9, 5);
  try { const v = net.view(c); assert.ok(v.chars[e.id]); assert.equal(v.vis, undefined); } finally { delete S.chars[e.id]; }
});
test('fog do mestre liga e desliga bits de seenW no andar certo', () => {
  const sc = freshWorld(), g = gmc(); draft(g, { o: 'floor', v: { id: 'f1', name: 'Porão', w: 8, h: 6 } }); handle(g, { t: 'wPub', sc: S.focus }); nevoa(sc);
  const f0 = sc.world.floors[0], n0 = f0.w * f0.h;
  handle(g, { t: 'wFog', sc: S.focus, f: 'f1', l: [[1, 1], [2, 1], [7, 5], [9, 9], [-1, 0]] });
  assert.equal(bit(sc.seenW.f1, 48, 1 * 8 + 1), 1); assert.equal(bit(sc.seenW.f1, 48, 1 * 8 + 2), 1); assert.equal(bit(sc.seenW.f1, 48, 5 * 8 + 7), 1);
  assert.equal(bit(sc.seenW.f0, n0, 1 * f0.w + 1), 0, 'o outro andar não muda');
  handle(g, { t: 'wFog', sc: S.focus, f: 'f1', l: [[2, 1]], hide: true });
  assert.equal(bit(sc.seenW.f1, 48, 1 * 8 + 2), 0); assert.equal(bit(sc.seenW.f1, 48, 1 * 8 + 1), 1);
  handle(cli('Ana'), { t: 'wFog', sc: S.focus, f: 'f1', l: [[3, 3]] }); assert.equal(bit(sc.seenW.f1, 48, 3 * 8 + 3), 0, 'jogador não pinta névoa');
  handle(g, { t: 'fogAll', v: true }); assert.equal(bit(sc.seenW.f0, n0, n0 - 1), 1); assert.equal(bit(sc.seenW.f1, 48, 47), 1);
  handle(g, { t: 'fogAll', v: false }); assert.equal(bit(sc.seenW.f1, 48, 1 * 8 + 1), 0);
  sc.fogOn = false;
});

// ----- interações (Task 5.1) -----
const put = (sc, id, o) => { sc.world.objs[id] = { f: 'f0', rot: 0, vis: 'visivel', auto: null, ...o, cfg: { ...o.cfg } }; return sc.world.objs[id]; };
const at = (ch, x, z) => handle(gm, { t: 'walkGm', id: ch.id, f: 'f0', x, z });
const inter = (c, ch, obj, o = {}) => handle(c, { t: 'interact', id: ch.id, obj, ...o });
const K = () => Object.keys(S.items).find(k => S.items[k].type !== 'arma') || Object.keys(S.items)[0];
test('interact: longe demais ou atrás da parede é recusado', () => {
  const sc = freshWorld(); muro(sc, 6); nevoa(sc); S.auto.inter = true;
  const c = cli('Ana'), ch = hero('Ana', 2, 5), k = K(); at(ch, 2.5, 5.5); const n0 = ch.inv[k] || 0;
  try {
    put(sc, 'i1', { k: 'item', x: 4, y: 5, cfg: { item: k, qtd: 2 } }); inter(c, ch, 'i1'); assert.ok(sc.world.objs.i1, 'longe (2 casas)');
    put(sc, 'i2', { k: 'item', x: 6, y: 5, cfg: { item: k, qtd: 1 } }); at(ch, 5.6, 5.5); inter(c, ch, 'i2'); assert.ok(sc.world.objs.i2, 'atrás da parede');
    put(sc, 'i3', { k: 'item', x: 4, y: 4, vis: 'oculto', cfg: { item: k, qtd: 1 } }); inter(c, ch, 'i3'); assert.ok(sc.world.objs.i3, 'oculto sem rev');
    put(sc, 'i4', { k: 'item', x: 5, y: 4, f: 'f9', cfg: { item: k, qtd: 1 } }); inter(c, ch, 'i4'); assert.ok(sc.world.objs.i4, 'outro andar');
    assert.equal(ch.inv[k] || 0, n0);
    inter(cli('Zed'), ch, 'i1'); at(ch, 3.6, 5.5); inter(cli('Zed'), ch, 'i1'); assert.ok(sc.world.objs.i1, 'herói alheio');
    inter(c, ch, 'i1'); assert.equal(sc.world.objs.i1, undefined); assert.equal(ch.inv[k], n0 + 2, 'pegou e sumiu');
    put(sc, 'p1', { k: 'placa', x: 3, y: 6, cfg: { texto: 'Cuidado com o lobo', imagem: '' } }); c.sent.length = 0; inter(c, ch, 'p1');
    assert.deepEqual(c.sent.filter(m => m.t === 'placa').map(m => m.text), ['Cuidado com o lobo']);
  } finally { S.auto.inter = false; sc.fogOn = false; }
});
test('porta trancada: chave abre e consome; teste falho não abre', () => {
  const sc = freshWorld(); muro(sc, 6, 5); nevoa(sc); S.auto.inter = true; const rnd = Math.random;
  const c = cli('Ana'), ch = hero('Ana', 5, 5), k = K(); at(ch, 5.5, 5.5); delete ch.inv[k];
  const d = put(sc, 'd1', { k: 'porta', x: 6, y: 5, cfg: { e: 'v', estado: 'trancada', chave: k, gasta: true } });
  try {
    inter(c, ch, 'd1'); assert.equal(d.cfg.estado, 'trancada', 'sem a chave');
    ch.inv[k] = 1; inter(c, ch, 'd1'); assert.equal(d.cfg.estado, 'aberta'); assert.equal(ch.inv[k] || 0, 0, 'gastou a chave');
    assert.equal(bit(sc.seenW.f0, 240, 5 * 20 + 8), 1, 'abrir recalcula a visão');
    inter(c, ch, 'd1'); assert.equal(d.cfg.estado, 'fechada'); inter(c, ch, 'd1'); assert.equal(d.cfg.estado, 'aberta');
    d.cfg = { e: 'v', estado: 'trancada', teste: { atr: 'FOR', dif: 10 } };
    Math.random = () => .999; const n = S.log.length; inter(c, ch, 'd1'); assert.equal(d.cfg.estado, 'trancada'); assert.ok(S.log.slice(n).some(e => e.rr?.l === 'FOR'), 'a rolagem vai para o log');
    Math.random = () => 0; inter(c, ch, 'd1'); assert.equal(d.cfg.estado, 'aberta');
    at(ch, 6.02, 5.5); // parado no vão da porta aberta
    d.cfg.estado = 'aberta'; inter(c, ch, 'd1'); assert.equal(d.cfg.estado, 'fechada'); assert.ok(!globalThis.MCOL.blockedAt(sc.world.floors[0], sc.world.objs, ch.pos.x, ch.pos.z, false), 'fechar a porta em cima tira o herói');
    const b = put(sc, 'r1', { k: 'barreira', x: 6, y: 4, cfg: { e: 'v', estado: 'fechada' } }); at(ch, 5.5, 4.5); inter(c, ch, 'r1'); assert.equal(b.cfg.estado, 'fechada', 'barreira não abre na mão');
  } finally { Math.random = rnd; S.auto.inter = false; sc.fogOn = false; }
});
test('baú uma vez para o grupo e uma por herói', () => {
  const sc = freshWorld(); nevoa(sc); S.auto.inter = true; const k = K();
  const ca = cli('Ana'), cb = cli('Bia'), a = hero('Ana', 2, 5), b = hero('Bia', 2, 6); at(a, 2.5, 5.5); at(b, 2.5, 6.5);
  const g0 = [a.gold, b.gold], i0 = a.inv[k] || 0;
  try {
    put(sc, 'b1', { k: 'bau', x: 3, y: 5, cfg: { modo: 'uma', ouro: 10, itens: [{ id: k, n: 2 }] } });
    inter(ca, a, 'b1'); assert.equal(a.gold, g0[0] + 10); assert.equal(a.inv[k], i0 + 2); assert.equal(sc.world.objs.b1.cfg.aberto, true);
    inter(cb, b, 'b1'); assert.equal(b.gold, g0[1], 'o grupo já abriu');
    put(sc, 'b2', { k: 'bau', x: 3, y: 6, cfg: { modo: 'cada', ouro: 5 } });
    inter(ca, a, 'b2'); inter(ca, a, 'b2'); inter(cb, b, 'b2');
    assert.equal(a.gold, g0[0] + 15); assert.equal(b.gold, g0[1] + 5); assert.deepEqual(Object.keys(sc.world.objs.b2.cfg.por).sort(), [a.id, b.id].sort());
  } finally { S.auto.inter = false; sc.fogOn = false; }
});
test('interact vira pedido com auto=false e passa com S.auto.inter', () => {
  const sc = freshWorld(); nevoa(sc); S.auto.inter = false; const k = K();
  const c = cli('Ana'), ch = hero('Ana', 2, 5); at(ch, 2.5, 5.5); const n0 = ch.inv[k] || 0;
  try {
    for (const id of Object.keys(S.reqs)) delete S.reqs[id];
    put(sc, 'i1', { k: 'item', x: 3, y: 5, cfg: { item: k, qtd: 1 } }); inter(c, ch, 'i1');
    const rq = Object.entries(S.reqs).find(([, r]) => r.t === 'interact'); assert.ok(rq, 'virou pedido'); assert.equal(rq[1].cat, 'inter'); assert.match(rq[1].text, /pegar/);
    assert.ok(sc.world.objs.i1); handle(gm, { t: 'reqOk', id: rq[0] }); assert.equal(sc.world.objs.i1, undefined, 'o mestre aprovou'); assert.equal(ch.inv[k], n0 + 1);
    S.auto.inter = true; put(sc, 'i2', { k: 'item', x: 3, y: 4, cfg: { item: k, qtd: 1 } }); inter(c, ch, 'i2'); assert.equal(sc.world.objs.i2, undefined, 'S.auto.inter libera');
    put(sc, 'i3', { k: 'item', x: 2, y: 4, auto: false, cfg: { item: k, qtd: 1 } }); inter(c, ch, 'i3'); assert.ok(sc.world.objs.i3, 'auto=false sempre pede');
    assert.ok(Object.values(S.reqs).some(r => r.m.obj === 'i3'));
    put(sc, 'i4', { k: 'item', x: 1, y: 5, auto: true, cfg: { item: k, qtd: 1 } }); S.auto.inter = false; inter(c, ch, 'i4'); assert.equal(sc.world.objs.i4, undefined, 'auto=true nunca pede');
  } finally { S.auto.inter = false; sc.fogOn = false; for (const id of Object.keys(S.reqs)) delete S.reqs[id]; }
});

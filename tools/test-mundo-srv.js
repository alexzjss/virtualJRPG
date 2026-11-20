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

// ----- NPC, alavanca e gatilho (Task 5.2) -----
const dlgs = c => c.sent.filter(m => m.t === 'dlg');
test('diálogo: escolha leva ao nó certo, faz item entrega, fim fecha; quem está a 4 casas não recebe', () => {
  const sc = freshWorld(); nevoa(sc); S.auto.inter = false; const k = K();
  const g = gmc(), ca = cli('Ana'), cb = cli('Bia'), cc = cli('Caio'), a = hero('Ana', 2, 5), b = hero('Bia', 4, 6), cx = hero('Caio', 7, 5), off = [join(g), join(ca), join(cb), join(cc)];
  at(a, 2.5, 5.5); at(b, 4.5, 6.5); at(cx, 7.5, 5.5); const i0 = a.inv[k] || 0;
  put(sc, 'n1', { k: 'npc', x: 3, y: 5, auto: true, cfg: { nome: 'Velho', dialogo: { ini: 'a', nos: { a: { fala: 'Olá', escolhas: [{ txt: 'Quero', vai: 'b', faz: 'item:' + k }, { txt: 'Tchau', vai: '', faz: 'fim' }] }, b: { fala: 'Toma', escolhas: [{ txt: 'Valeu', vai: '', faz: 'fim' }] } } } } });
  try {
    inter(ca, a, 'n1'); assert.equal(S.dlg[S.focus]?.no, 'a'); assert.ok(!Object.keys(S).includes('dlg'), 'o diálogo não vai no state');
    assert.equal(dlgs(ca).at(-1).fala, 'Olá'); assert.equal(dlgs(ca).at(-1).ro, false); assert.deepEqual(dlgs(ca).at(-1).escolhas, ['Quero', 'Tchau']);
    assert.equal(dlgs(cb).at(-1).ro, true, 'quem está perto vê só leitura'); assert.equal(dlgs(cc).length, 0, 'a 4 casas não recebe'); assert.ok(dlgs(g).length, 'o mestre acompanha');
    handle(g, { t: 'dlgSay', sc: S.focus, text: 'O velho tosse.' }); assert.deepEqual(dlgs(ca).at(-1).extra, ['O velho tosse.']);
    inter(cb, b, 'n1', { opt: 0 }); assert.equal(S.dlg[S.focus].no, 'a', 'só quem abriu escolhe');
    inter(ca, a, 'n1', { opt: 0 }); assert.equal(S.dlg[S.focus].no, 'b'); assert.equal(a.inv[k], i0 + 1); assert.equal(dlgs(ca).at(-1).fala, 'Toma');
    inter(ca, a, 'n1', { opt: 0 }); assert.equal(S.dlg[S.focus], undefined); assert.equal(dlgs(ca).at(-1).fim, true); assert.equal(dlgs(cb).at(-1).fim, true);
    S.auto.inter = false; sc.world.objs.n1.auto = null; inter(ca, a, 'n1'); const rq = Object.entries(S.reqs).find(([, r]) => r.m.obj === 'n1'); assert.ok(rq, 'puxar conversa vira pedido');
    handle(gm, { t: 'reqOk', id: rq[0] }); assert.equal(S.dlg[S.focus]?.no, 'a'); inter(ca, a, 'n1', { opt: 1 }); assert.equal(S.dlg[S.focus], undefined, 'escolher não vira pedido');
  } finally { off.forEach(f => f()); sc.fogOn = false; for (const id of Object.keys(S.reqs)) delete S.reqs[id]; }
});
test('alavanca alterna porta e mostra objeto oculto', () => {
  const sc = freshWorld(); muro(sc, 6, 5); nevoa(sc); S.auto.inter = true;
  const c = cli('Ana'), ch = hero('Ana', 2, 5); at(ch, 2.5, 5.5);
  const d = put(sc, 'd1', { k: 'porta', x: 6, y: 5, cfg: { e: 'v', estado: 'fechada' } }), bx = put(sc, 'b1', { k: 'bau', x: 4, y: 7, vis: 'oculto', cfg: { modo: 'uma' } });
  const l = put(sc, 'l1', { k: 'alavanca', x: 3, y: 5, cfg: { alvos: ['d1', 'b1'], acao: 'alternar', estado: 'desligada' } });
  try {
    inter(c, ch, 'l1'); assert.equal(d.cfg.estado, 'aberta'); assert.equal(bx.vis, 'visivel'); assert.equal(l.cfg.estado, 'ligada');
    assert.equal(bit(sc.seenW.f0, 240, 5 * 20 + 8), 1, 'a porta aberta pela alavanca abre a visão');
    inter(c, ch, 'l1'); assert.equal(d.cfg.estado, 'fechada'); assert.equal(bx.vis, 'oculto'); assert.equal(l.cfg.estado, 'desligada');
    l.cfg.acao = 'abrir'; inter(c, ch, 'l1'); inter(c, ch, 'l1'); assert.equal(d.cfg.estado, 'aberta', 'abrir não fecha'); assert.equal(bx.vis, 'visivel');
  } finally { S.auto.inter = false; sc.fogOn = false; }
});
test('gatilho uma vez; quem=todos só com todos dentro', () => {
  const sc = freshWorld(); nevoa(sc); const c = cli('Ana'), a = hero('Ana', 2, 2), b = hero('Bia', 2, 3); at(a, 2.5, 2.5); at(b, 2.5, 3.5);
  const d = put(sc, 'd1', { k: 'porta', x: 9, y: 9, cfg: { e: 'v', estado: 'fechada' } });
  const t1 = put(sc, 't1', { k: 'gatilho', x: 5, y: 5, cfg: { casas: [[5, 5], [5, 6]], quem: 'qualquer', vezes: 'uma', acoes: [{ k: 'objetivo', alvo: '', v: 'Ache a saída' }, { k: 'abrir', alvo: 'd1', v: '' }] } });
  try {
    T += 100; walk(c, a, 3.1, 2.5); assert.notEqual(sc.world.goal, 'Ache a saída');
    at(a, 5.5, 5.5); assert.equal(sc.world.goal, 'Ache a saída'); assert.equal(d.cfg.estado, 'aberta'); assert.equal(t1.cfg.usado, true);
    sc.world.goal = ''; d.cfg.estado = 'fechada'; at(a, 5.5, 6.5); at(a, 5.5, 5.5); assert.equal(sc.world.goal, '', 'uma vez só');
    const t2 = put(sc, 't2', { k: 'gatilho', x: 8, y: 2, cfg: { casas: [[8, 2], [8, 3]], quem: 'todos', vezes: 'sempre', acoes: [{ k: 'objetivo', alvo: '', v: 'Todos juntos' }] } });
    at(a, 8.5, 2.5); assert.notEqual(sc.world.goal, 'Todos juntos', 'falta a Bia');
    at(b, 8.5, 3.5); assert.equal(sc.world.goal, 'Todos juntos');
    sc.world.goal = ''; at(b, 7.5, 3.5); at(b, 8.5, 3.5); assert.equal(sc.world.goal, 'Todos juntos', 'sempre: dispara de novo'); void t2;
  } finally { sc.fogOn = false; }
});

// ----- armadilhas, perigos, escadas e portais (Task 5.3) -----
test('armadilha: percepção revela para o grupo uma vez por herói; pisar sem ver rola esquiva e aplica condição', () => {
  const sc = freshWorld(); nevoa(sc); const rnd = Math.random;
  const ca = cli('Ana'), cb = cli('Bia'), a = hero('Ana', 0, 5), b = hero('Bia', 0, 7); at(a, 0.5, 5.5); at(b, 0.5, 7.5);
  const t1 = put(sc, 't1', { k: 'armadilha', x: 4, y: 6, cfg: { perc: 10, esq: 10, dano: 20, elem: '', cond: '', rearma: true } });
  const sab = () => S.log.filter(e => e.to === '@gm' && /Percepção/.test(e.text)).length;
  try {
    Math.random = () => .999; const n0 = sab();
    at(b, 2.5, 7.5); assert.equal(sab(), n0 + 1, 'Bia rolou em segredo'); assert.ok(!t1.rev); assert.ok(t1.cfg.tent[b.id]);
    at(b, 1.5, 7.5); at(b, 2.5, 7.5); assert.equal(sab(), n0 + 1, 'uma vez por herói');
    Math.random = () => 0; at(a, 2.5, 5.5); assert.equal(t1.rev, true, 'Ana percebeu: revelada para o grupo');
    assert.ok(!('tent' in (net.view(ca).scenes[S.focus].world.objs.t1.cfg || {})), 'o jogador não vê quem tentou');
    const t2 = put(sc, 't2', { k: 'armadilha', x: 8, y: 2, cfg: { perc: 100, esq: 100, dano: 20, elem: 'fogo', cond: 'poison', rearma: false } });
    Math.random = () => .999; const hp0 = a.hp; at(a, 8.5, 2.5);
    assert.ok(a.hp < hp0 && hp0 - a.hp <= 20, 'dano cheio'); assert.ok(a.st.poison > 0, 'condição'); assert.equal(sc.world.objs.t2, undefined, 'sem rearmar, some');
    const t3 = put(sc, 't3', { k: 'armadilha', x: 9, y: 9, cfg: { perc: 100, esq: 0, dano: 20, elem: '', cond: 'poison', rearma: true } }); delete a.st.poison;
    Math.random = () => 0; const hp1 = a.hp; at(a, 9.5, 9.5);
    assert.equal(hp1 - a.hp, 10, 'esquivou: metade'); assert.ok(!a.st.poison, 'sem condição'); assert.ok(sc.world.objs.t3, 'rearma'); assert.equal(t3.rev, true);
  } finally { Math.random = rnd; sc.fogOn = false; }
});
test('perigo: lava tira 3% por segundo', () => {
  const sc = freshWorld(); nevoa(sc); const ch = hero('Ana', 2, 2); at(ch, 2.5, 2.5); ch.hp = ch.hpMax;
  const f = sc.world.floors[0], c = P.unpack(f.cell, f.w * f.h); c[2 * f.w + 2] = P.code('vulcao', 'perigo'); f.cell = P.pack(c); sc.world.v++;
  try {
    const p0 = net.pushes(); MW.perigoTick(); assert.equal(ch.hp, ch.hpMax - Math.max(1, Math.round(ch.hpMax * .03))); assert.ok(net.pushes() > p0);
    at(ch, 4.5, 2.5); const hp = ch.hp; MW.perigoTick(); assert.equal(ch.hp, hp, 'fora da lava não perde');
    at(ch, 2.5, 2.5); sc.battle = { active: true, ticks: {} }; MW.perigoTick(); assert.equal(ch.hp, hp, 'durante a batalha, não');
  } finally { sc.battle = { active: false, ticks: {} }; sc.fogOn = false; }
});
test('escada troca de andar; portal vira pedido de passagem e chega no destino', () => {
  const sc = freshWorld(), g = gmc(); draft(g, { o: 'floor', v: { id: 'f1', name: 'Porão', w: 8, h: 6 } }); handle(g, { t: 'wPub', sc: S.focus }); nevoa(sc); S.auto.inter = true;
  const home = S.focus, c = cli('Ana'), ch = hero('Ana', 2, 5); at(ch, 2.5, 5.5);
  put(sc, 'e1', { k: 'escada', x: 3, y: 5, cfg: { para: { f: 'f1', x: 2, y: 2 } } });
  const before = new Set(Object.keys(S.scenes)); H.sceneAdd(gm, { name: 'Torre' }); const sid2 = Object.keys(S.scenes).find(k => !before.has(k)); MW.fixMundo();
  const w2 = S.scenes[sid2].world; w2.objs.dst = { k: 'surgir', f: w2.floors[0].id, x: 4, y: 4, rot: 0, vis: 'visivel', auto: null, cfg: {} };
  try {
    inter(c, ch, 'e1'); assert.equal(ch.pos.f, 'f1'); assert.deepEqual([ch.x, ch.y], [2, 2]);
    at(ch, 2.5, 5.5); handle(gm, { t: 'walkGm', id: ch.id, f: 'f0', x: 2.5, z: 5.5 }); assert.equal(ch.pos.f, 'f0');
    put(sc, 'p1', { k: 'portal', x: 3, y: 5, cfg: { to: sid2, destino: 'dst' } }); S.auto.pass = false; for (const id of Object.keys(S.reqs)) delete S.reqs[id];
    inter(c, ch, 'p1'); const rq = Object.entries(S.reqs).find(([, r]) => r.cat === 'pass'); assert.ok(rq, 'vira pedido de passagem'); assert.equal(ch.scene, home);
    handle(gm, { t: 'reqOk', id: rq[0] }); assert.equal(ch.scene, sid2); assert.ok(Math.abs(ch.pos.x - 4.5) <= 1.01 && Math.abs(ch.pos.z - 4.5) <= 1.01, `chegou em ${ch.pos.x},${ch.pos.z}`);
  } finally { S.auto.inter = false; sc.fogOn = false; ch.scene = home; for (const id of Object.keys(S.reqs)) delete S.reqs[id]; }
});
// ----- IA dos inimigos (Task 6.1) -----
const IA = await import('../src/mundo-ia.js');
const inim = (sc, e, cfg = {}) => put(sc, 'i_' + e.id, { k: 'inimigo', x: e.x, y: e.y, cfg: { ch: e.id, rota: [], modo: 'patrulha', visao: { r: 6, a: 90 }, bando: '', ...cfg } });
const ia = n => { for (let i = 0; i < n; i++) IA.tickIA(S.focus, .2); };
const longe = (sc, h) => { const f = sc.world.floors[0]; at(h, f.w - .5, f.h - .5); };
test('IA: patrulha segue a rota em vaivém', () => {
  const sc = freshWorld(); nevoa(sc); const e = foe(2, 2), h = hero('Ana', 2, 2); at(e, 2.5, 2.5); longe(sc, h);
  const o = inim(sc, e, { rota: [[2, 2], [8, 2]] });
  ia(1); assert.ok(Math.abs(e.pos.x - (2.5 + 3.5 * .2)) < .05, `anda a 3,5 casas/s (${e.pos.x})`); assert.equal(o.ia.s, 'patrulha');
  let ida = false, volta = false;
  for (let i = 0; i < 30; i++) { ia(1); if (e.x === 8) ida = true; if (ida && e.x === 2) volta = true; assert.equal(e.y, 2, 'fica na rota'); }
  assert.ok(ida, 'chegou ao fim da rota'); assert.ok(volta, 'e voltou (vaivém)'); assert.equal(o.ia.s, 'patrulha');
});
test('IA: vê herói andando a 5 casas no cone; não vê agachado a 5; vê correndo a 10', () => {
  const sc = freshWorld(); nevoa(sc); const e = foe(2, 5), h = hero('Ana', 7, 5); at(e, 2.5, 5.5); e.pos.d = Math.PI / 2; at(h, 7.5, 5.5);
  const o = inim(sc, e, { modo: 'parado' });
  h._m = 'a'; assert.equal(IA.sees(o, h), true, 'andando a 5');
  h._m = 'g'; assert.equal(IA.sees(o, h), false, 'agachado a 5');
  at(h, 12.5, 5.5); h._m = 'c'; assert.equal(IA.sees(o, h), true, 'correndo a 10');
  h._m = 'a'; assert.equal(IA.sees(o, h), false, 'andando a 10, não');
  at(h, 2.5, 9.5); h._m = 'c'; assert.equal(IA.sees(o, h), false, 'fora do cone');
  muro(sc, 5); at(h, 7.5, 5.5); h._m = 'a'; assert.equal(IA.sees(o, h), false, 'parede no meio');
});
test('IA: perde de vista 6 s e volta à rota', () => {
  const sc = freshWorld(); nevoa(sc); const e = foe(2, 5), h = hero('Ana', 6, 5); at(e, 2.5, 5.5); e.pos.d = Math.PI / 2; at(h, 6.5, 5.5); h._m = 'a';
  const o = inim(sc, e, { rota: [[2, 5], [2, 8]] });
  ia(1); assert.equal(o.ia.s, 'alerta', 'viu: alerta'); assert.equal(o.ia.alvo, h.id);
  ia(5); assert.equal(o.ia.s, 'persegue', 'depois de 1 s, persegue');
  ia(2); assert.ok(e.pos.x > 3.5, 'corre atrás do herói');
  longe(sc, h); h._m = 'g';
  ia(27); assert.equal(o.ia.s, 'persegue', 'ainda procura antes de 6 s');
  ia(4); assert.equal(o.ia.s, 'volta', '6 s sem ver: volta');
  ia(40); assert.equal(o.ia.s, 'patrulha', 'de volta à patrulha'); assert.equal(e.x, 2, 'na rota');
});
test('IA: não roda com batalha ativa', () => {
  const sc = freshWorld(); nevoa(sc); const e = foe(2, 2), h = hero('Ana', 2, 2); at(e, 2.5, 2.5); longe(sc, h);
  inim(sc, e, { rota: [[2, 2], [8, 2]] }); sc.battle = { active: true, ticks: {} };
  try {
    const p = { ...e.pos }; IA.iaAll(.2); assert.deepEqual(e.pos, p, 'parado durante a batalha');
    sc.battle = { active: false, ticks: {} }; IA.iaAll(.2); assert.ok(e.pos.x > p.x, 'sem batalha, anda');
  } finally { sc.battle = { active: false, ticks: {} }; sc.fogOn = false; }
});
test('IA: ponto da rota sem passagem é pulado (não trava)', () => {
  const sc = freshWorld(); nevoa(sc); const e = foe(2, 2), h = hero('Ana', 2, 2); at(e, 2.5, 2.5); longe(sc, h);
  const f = sc.world.floors[0], c = P.unpack(f.cell, f.w * f.h); c[2 * f.w + 8] = P.code('campo', 'fundo'); f.cell = P.pack(c); sc.world.v++;
  assert.ok(P.blocksWalk(P.cell(f, 8, 2)), 'a casa 8,2 não dá passagem');
  const o = inim(sc, e, { rota: [[2, 2], [5, 2], [8, 2]] });
  let foi = false, voltou = false; for (let i = 0; i < 40; i++) { ia(1); if (e.x === 5) foi = true; if (foi && e.x === 2) voltou = true; }
  assert.ok(foi && voltou, 'vai até 5,2 e volta, pulando 8,2'); assert.equal(o.ia.s, 'patrulha');
});
test('IA: inimigo parado e visível chega com posição no state do jogador', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false; const ca = cli('Vera'), e = foe(6, 2), h = hero('Vera', 2, 2); // dono próprio: outros testes deixam heróis da Ana fora da cena at(e, 6.5, 2.5); at(h, 2.5, 2.5);
  const v = net.view(ca).chars[e.id]; assert.ok(v, 'o inimigo vai no state'); assert.deepEqual(v.pos, e.pos, 'com a posição no 3D');
});
// ----- começo da batalha no mundo (Task 6.2) -----
const T0 = () => S.scenes[S.focus].battle.ticks;
const fim = () => { if (S.scenes[S.focus].battle?.active) handle(gm, { t: 'battle', on: false }); };
const cara = (ch, d) => { ch.pos.d = d; }; // rumo: 0 = +z, π/2 = +x
test('batalha por toque: entram todos os heróis, o bando e quem vê a até 8; o resto não', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false;
  const a = hero('Ana', 5, 5), b = hero('Bia', 2, 9); at(a, 5.5, 5.5); at(b, 2.5, 9.5);
  const e1 = foe(6, 5), e2 = foe(18, 2), e3 = foe(9, 5), e4 = foe(10, 8), e5 = foe(12, 2);
  at(e1, 6.1, 5.5); at(e2, 18.5, 2.5); at(e3, 9.5, 5.5); cara(e3, -Math.PI / 2); at(e4, 10.5, 8.5); cara(e4, Math.PI / 2); at(e5, 12.5, 2.5);
  inim(sc, e1, { bando: 'lobos', modo: 'parado' }); inim(sc, e2, { bando: 'lobos', modo: 'parado' }); inim(sc, e3, { modo: 'parado' }); inim(sc, e4, { modo: 'parado' });
  try {
    ia(1); assert.equal(sc.battle.active, true, 'o toque começa a batalha');
    const T = T0(); for (const ch of [a, b, e1, e2, e3]) assert.ok(ch.id in T, ch.name + ' entra');
    for (const ch of [e4, e5]) assert.ok(!(ch.id in T), 'quem não vê e não é do bando fica fora');
    assert.ok(e4.x != null && e5.x != null, 'os de fora continuam no mapa');
  } finally { fim(); }
});
test('surpresa: todos os heróis antes do primeiro inimigo e inimigos Expostos', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false;
  const a = hero('Ana', 5, 5), e1 = foe(6, 5), e2 = foe(7, 5); at(a, 5.5, 5.5); at(e1, 6.1, 5.5); cara(e1, Math.PI / 2); at(e2, 7.5, 5.5); cara(e2, Math.PI / 2);
  inim(sc, e1, { bando: 'b', modo: 'parado' }); inim(sc, e2, { bando: 'b', modo: 'parado' });
  try {
    ia(1); const T = T0(); assert.ok(sc.battle.active);
    assert.ok(T[a.id] < Math.min(T[e1.id], T[e2.id]), 'o herói age antes'); assert.equal(e1.st.exposed, 1); assert.equal(e2.st.exposed, 1);
  } finally { fim(); }
});
test('emboscada: inimigos antes', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false;
  const a = hero('Ana', 5, 5), b = hero('Bia', 3, 3), e1 = foe(4, 5); at(a, 5.5, 5.5); cara(a, Math.PI / 2); at(b, 3.5, 3.5); at(e1, 4.9, 5.5); cara(e1, Math.PI / 2);
  const o = inim(sc, e1, { modo: 'parado' }); o.ia = { s: 'persegue', t: 0, i: 0, dir: 1, alvo: a.id, ult: [5, 5] };
  try {
    ia(1); const T = T0(); assert.ok(sc.battle.active);
    assert.ok(T[e1.id] < Math.min(T[a.id], T[b.id]), 'o inimigo age antes'); assert.ok(!e1.st.exposed);
  } finally { fim(); }
});
test('arena e clima vêm da casa do contato; mestre com fundo fixo mantém o dele', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false; sc.clima = ''; delete sc.bbgFixo; sc.world.hora = 'noite';
  const f = sc.world.floors[0], c = P.unpack(f.cell, f.w * f.h); c[5 * f.w + 5] = P.code('neve', 'chao'); f.cell = P.pack(c); sc.world.v++;
  const a = hero('Ana', 5, 5), e1 = foe(6, 5); at(a, 5.5, 5.5); at(e1, 6.1, 5.5); const o = inim(sc, e1, { modo: 'parado' });
  try {
    ia(1); assert.ok(sc.battle.active); assert.equal(sc.bbg, 'neve-noite'); assert.equal(sc.clima, 'neve'); assert.equal(sc.climaAuto, true);
    fim(); assert.equal(sc.clima, '', 'o clima automático sai no fim');
    handle(gm, { t: 'map', f: 'bbg', v: 'castelo-dia' }); assert.equal(sc.bbgFixo, true);
    o.ia = { s: 'parado', t: 0, i: 0, dir: 1 }; at(e1, 6.1, 5.5); ia(1); assert.ok(sc.battle.active); assert.equal(sc.bbg, 'castelo-dia', 'fundo do mestre fica');
  } finally { fim(); delete sc.bbgFixo; sc.bbg = ''; }
});
test('H.battle sem ids continua igual ao de hoje', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false; const rnd = Math.random; Math.random = () => .5;
  const a = hero('Ana', 2, 2), e1 = foe(9, 9), e2 = foe(12, 3); at(a, 2.5, 2.5); at(e1, 9.5, 9.5); at(e2, 12.5, 3.5); inim(sc, e1, { modo: 'parado' });
  try {
    handle(gm, { t: 'battle', on: true }); const T = T0();
    const want = Object.values(S.chars).filter(ch => ch.scene === S.focus && ch.x != null && ch.hp > 0 && !ch.dead).map(ch => ch.id).sort();
    assert.deepEqual(Object.keys(T).sort(), want, 'todos no mapa entram, como sempre'); assert.ok(!e1.st.exposed && !e2.st.exposed);
  } finally { Math.random = rnd; fim(); }
});
test('vitória apaga inimigos derrotados do mapa e devolve sobreviventes à rota', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false;
  const a = hero('Ana', 5, 5), e1 = foe(6, 5), e2 = foe(8, 5); at(a, 5.5, 5.5); at(e1, 6.1, 5.5); at(e2, 8.5, 5.5);
  inim(sc, e1, { bando: 'b', modo: 'parado' }); const o2 = inim(sc, e2, { bando: 'b', rota: [[8, 5], [8, 8]] });
  ia(1); assert.ok(sc.battle.active); e1.hp = 0;
  handle(gm, { t: 'battle', on: false, win: true });
  assert.equal(sc.world.objs['i_' + e1.id], undefined, 'derrotado some do mapa'); assert.equal(o2.ia.s, 'volta', 'sobrevivente volta à rota');
});
test('golpe F: acerta o inimigo à frente e começa com surpresa; sem alvo nada acontece', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false; const c = cli('Ana');
  const a = hero('Ana', 5, 5), e1 = foe(6, 5); at(a, 5.5, 5.5); cara(a, 0); at(e1, 6.5, 5.5); cara(e1, -Math.PI / 2); inim(sc, e1, { modo: 'parado' });
  try {
    handle(c, { t: 'strike', id: a.id }); assert.ok(!sc.battle.active, 'olhando para o lado: errou');
    cara(a, Math.PI / 2); handle(c, { t: 'strike', id: a.id }); assert.ok(sc.battle.active, 'acertou'); assert.equal(e1.st.exposed, 1, 'surpresa');
  } finally { fim(); }
});
test('emboscada do gatilho: o encontro aparece nas casas marcadas e age antes', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false; const b = Object.keys(S.bestiary)[0]; assert.ok(b, 'há bestiário');
  S.encounters.encT = { name: 'Teste', list: [{ b, tier: 'normal', n: 2 }] };
  const a = hero('Ana', 5, 5); at(a, 5.5, 5.5); const before = new Set(Object.keys(S.chars));
  try {
    MW.MH.ambush(S.focus, 'encT', [[8, 8], [9, 8]], 'f0'); const novos = Object.keys(S.chars).filter(k => !before.has(k)).map(k => S.chars[k]).filter(ch => ch.enemy);
    assert.equal(novos.length, 2); assert.deepEqual(novos.map(ch => [ch.x, ch.y]).sort(), [[8, 8], [9, 8]]); assert.ok(novos.every(ch => ch.pos?.f === 'f0'));
    const T = T0(); assert.ok(sc.battle.active); assert.ok(Math.max(...novos.map(ch => T[ch.id])) < T[a.id], 'emboscada: eles antes');
  } finally { fim(); delete S.encounters.encT; }
});
test('entrada tardia: quem persegue e alcança um combatente entra no fim da fila', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false;
  const a = hero('Ana', 5, 5), e1 = foe(6, 5), e2 = foe(12, 5); at(a, 5.5, 5.5); at(e1, 6.1, 5.5); at(e2, 12.5, 5.5); cara(e2, Math.PI / 2);
  inim(sc, e1, { modo: 'parado' }); const o2 = inim(sc, e2, { modo: 'parado' });
  try {
    ia(1); assert.ok(sc.battle.active); assert.ok(!(e2.id in T0()));
    o2.ia = { s: 'persegue', t: 0, i: 0, dir: 1, alvo: a.id, ult: [5, 5] }; const p = e2.pos.x; IA.iaAll(.2); assert.ok(e2.pos.x < p, 'corre até a luta');
    for (let i = 0; i < 20 && !(e2.id in T0()); i++) IA.iaAll(.2);
    const T = T0(); assert.ok(e2.id in T, 'entrou'); assert.ok(T[e2.id] > Math.max(...Object.entries(T).filter(([k]) => k !== e2.id).map(([, v]) => v)), 'no fim da fila');
  } finally { fim(); }
});
test('trégua: depois da luta, o sobrevivente colado no herói não recomeça na hora; passados 5 s, sim', () => {
  const sc = freshWorld(); nevoa(sc); sc.fogOn = false;
  const a = hero('Ana', 5, 5), e1 = foe(6, 5); at(a, 5.5, 5.5); at(e1, 6.1, 5.5); const o = inim(sc, e1, { modo: 'parado' });
  try {
    ia(1); assert.ok(sc.battle.active); fim(); at(e1, 6.1, 5.5);
    ia(20); assert.ok(!sc.battle.active, 'trégua de 5 s'); assert.ok(!['alerta', 'persegue'].includes(o.ia.s), 'não persegue: só volta ao lugar');
    at(a, e1.pos.x - .4, e1.pos.z); ia(6); assert.ok(sc.battle.active, 'depois da trégua, o toque vale de novo');
  } finally { fim(); }
});

test('gerador: wGen escreve no rascunho do andar, trocando os objetos dele, e o jogador não gera', async () => {
  await import('../public/js/mundo-gerar.js');
  const sc = freshWorld(), g = gmc(), p = cli('Ana'), off = [join(g), join(p)];
  try {
    draft(g, { o: 'floor', v: { id: 'f1', name: 'Porão', w: 20, h: 20 } }, { o: 'obj', id: 'velho', v: { k: 'bau', f: 'f1', x: 1, y: 1, cfg: {} } }, { o: 'obj', id: 'fica', v: { k: 'placa', f: 'f0', x: 1, y: 1, cfg: { texto: 'oi' } } });
    handle(p, { t: 'wGen', sc: S.focus, f: 'f1', tipo: 'masmorra', tema: 'castelo', w: 40, h: 36, seed: 7 });
    assert.equal(sc.draft.floors.find(f => f.id === 'f1').w, 20, 'jogador não gera');
    handle(g, { t: 'wGen', sc: S.focus, f: 'f1', tipo: 'masmorra', tema: 'castelo', w: 40, h: 36, seed: 7 });
    const f = sc.draft.floors.find(o => o.id === 'f1'), ref = globalThis.MGERAR.gerar('masmorra', 'castelo', 40, 36, 7);
    assert.deepEqual([f.w, f.h, f.cell, f.wallH, f.wallV], [40, 36, ref.floor.cell, ref.floor.wallH, ref.floor.wallV]);
    assert.equal(sc.draft.objs.velho, undefined, 'os objetos antigos do andar saem'); assert.equal(sc.draft.objs.fica.k, 'placa', 'os dos outros andares ficam');
    const novos = Object.entries(sc.draft.objs).filter(([, o]) => o.f === 'f1');
    assert.equal(novos.length, Object.keys(ref.objs).length); assert.ok(novos.every(([id]) => id.startsWith('f1-')));
    assert.ok(novos.some(([, o]) => o.k === 'surgir') && novos.some(([, o]) => o.k === 'porta' && o.cfg.estado === 'fechada'));
    assert.equal(sc.world.floors.length, 1, 'o publicado não muda');
    assert.ok(g.sent.some(m => m.t === 'draft' && m.d?.floors?.some(o => o.id === 'f1' && o.w === 40)));
    handle(g, { t: 'wGen', sc: S.focus, f: 'f1', tipo: 'nada', w: 40, h: 36, seed: 7 }); // tipo desconhecido: nada muda
    assert.equal(sc.draft.floors.find(o => o.id === 'f1').cell, ref.floor.cell);
  } finally { off.forEach(f => f()); delete sc.draft; }
});

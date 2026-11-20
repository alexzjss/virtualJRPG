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

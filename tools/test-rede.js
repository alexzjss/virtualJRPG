// Testes de rede e de arquivos: sobem o servidor de verdade (como o iniciar.bat) numa porta livre.  node --test tools/test-rede.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawn } from 'child_process'; import { fileURLToPath } from 'url';
import net from 'net';
import { WebSocket } from 'ws';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// porta livre de verdade, dada pelo sistema (um número sorteado às vezes caía numa porta ocupada e o teste falhava sem motivo)
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

async function boot(data, env = {}) {
  const p = await freePort(), child = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: p, VJ_DATA: data, VJ_TUNNEL: '0', GM_KEY: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
  for (let i = 0; i < 150; i++) { // espera subir (ou morrer)
    if (child.exitCode !== null) break;
    try { if ((await fetch(`http://127.0.0.1:${p}/api/hi`)).ok) return { p, child, out: () => out, stop: () => child.kill() }; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  child.kill(); return { p, child, failed: true, out: () => out, stop() {} };
}
const tmps = [], tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vjrede-')); tmps.push(d); return d; };
process.on('exit', () => { for (const d of tmps) try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }); // as pastas de dados dos servidores de teste não ficam para trás
const hello = (p, msg) => new Promise(res => { const ws = new WebSocket(`ws://127.0.0.1:${p}`); ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', ...msg }))); ws.on('message', d => { const m = JSON.parse(d); if (m.t === 'err' || m.t === 'state') { ws.close(); res(m); } }); });
const poke = (p, key) => new Promise(res => { const ws = new WebSocket(`ws://127.0.0.1:${p}`); ws.on('open', () => { ws.send(JSON.stringify({ t: 'hello', role: 'gm', key })); setTimeout(() => { ws.send(JSON.stringify({ t: 'offMsg', v: 'Volto já' })); setTimeout(() => { ws.close(); res(); }, 600); }, 200); }); }); // qualquer ação do mestre grava o estado
const up = (p, headers, body = PNG, type = 'image/png') => fetch(`http://127.0.0.1:${p}/upload`, { method: 'POST', headers: { 'Content-Type': type, ...headers }, body });

test('sem GM_KEY: a chave é sorteada e guardada, e "mestre" não abre o painel', async () => {
  const data = tmp(), s = await boot(data); assert.ok(!s.failed, s.out());
  try {
    const key = fs.readFileSync(path.join(data, 'gm-key.txt'), 'utf8').trim(); assert.match(key, /^[0-9a-f]{10}$/);
    assert.equal((await hello(s.p, { role: 'gm', key: 'mestre' })).t, 'err');
    assert.equal((await hello(s.p, { role: 'gm', key })).t, 'state');
  } finally { s.stop(); }
  const s2 = await boot(data); try { assert.ok(!s2.failed, s2.out()); assert.equal((await hello(s2.p, { role: 'gm', key: fs.readFileSync(path.join(data, 'gm-key.txt'), 'utf8').trim() })).t, 'state'); } finally { s2.stop(); } // a mesma chave volta a valer
});

test('upload: exige chave ou conta, confere o conteúdo da imagem', async () => {
  const data = tmp(), s = await boot(data); assert.ok(!s.failed, s.out());
  try {
    const key = fs.readFileSync(path.join(data, 'gm-key.txt'), 'utf8').trim();
    assert.equal((await up(s.p, {})).status, 401);
    assert.equal((await up(s.p, { 'X-VJ-Key': 'errada' })).status, 401);
    assert.equal((await up(s.p, { 'X-VJ-User': 'ninguem', 'X-VJ-Pass': 'x' })).status, 401);
    const ok = await up(s.p, { 'X-VJ-Key': key }); assert.equal(ok.status, 200); assert.match(await ok.text(), /^\/uploads\/[0-9a-f]{16}\.png$/);
    assert.equal((await up(s.p, { 'X-VJ-Key': key }, Buffer.from('<svg onload=alert(1)>'.repeat(3)))).status, 415); // não é PNG de verdade
    assert.equal((await up(s.p, { 'X-VJ-Key': key }, PNG, 'image/svg+xml')).status, 415);
  } finally { s.stop(); }
});

test('login: muitas tentativas erradas bloqueiam, até para a senha certa', async () => {
  const data = tmp(), s = await boot(data); assert.ok(!s.failed, s.out());
  try {
    const key = fs.readFileSync(path.join(data, 'gm-key.txt'), 'utf8').trim();
    for (let i = 0; i < 8; i++) assert.match((await hello(s.p, { role: 'gm', key: 'x' + i })).msg, /incorreta/);
    assert.match((await hello(s.p, { role: 'gm', key })).msg, /Muitas tentativas/);
  } finally { s.stop(); }
});

test('TV removida: login table é recusado e a página retorna 404', async () => {
  const s = await boot(tmp(), { GM_KEY: 'chave' }); assert.ok(!s.failed, s.out());
  try {
    const invalid = await hello(s.p, { role: 'inexistente' });
    assert.deepEqual(invalid, { t: 'err', bad: true, msg: 'Papel inválido.' });
    assert.deepEqual(await hello(s.p, { role: 'table', name: 'mestre', pass: 'chave' }), invalid);
    for (const page of ['/table', '/table.html']) assert.equal((await fetch(`http://127.0.0.1:${s.p}${page}`)).status, 404);
  } finally { s.stop(); }
});

test('state.json corrompido: restaura o backup mais recente; sem backup, recusa subir sem apagar nada', async () => {
  const data = tmp(), a = await boot(data); assert.ok(!a.failed, a.out());
  await poke(a.p, fs.readFileSync(path.join(data, 'gm-key.txt'), 'utf8').trim()); a.stop(); await new Promise(r => setTimeout(r, 400));
  const file = path.join(data, 'state.json'); assert.ok(fs.existsSync(file));
  const good = fs.readFileSync(file, 'utf8');
  const b = await boot(data); b.stop(); await new Promise(r => setTimeout(r, 400)); // segundo início cria o backup
  assert.ok(fs.readdirSync(path.join(data, 'backups')).length >= 1);
  fs.writeFileSync(file, '{"chars": {'); // queda no meio da gravação
  const c = await boot(data); try { assert.ok(!c.failed, c.out()); assert.ok(JSON.parse(fs.readFileSync(file, 'utf8')).scenes); assert.ok(fs.readdirSync(data).some(f => f.startsWith('state-corrompido'))); } finally { c.stop(); }
  assert.ok(good.length > 100);
  const d2 = tmp(); fs.writeFileSync(path.join(d2, 'state.json'), 'lixo');
  const d = await boot(d2); assert.ok(d.failed); assert.match(d.out(), /corrompido/); assert.ok(fs.readdirSync(d2).some(f => f.startsWith('state-corrompido'))); // guardado, não apagado
});

// todas as mensagens que chegam até o primeiro "state" (ou erro), mais as que vierem depois de enviar "extra"
const talk = (p, key, extra = []) => new Promise(res => { const ws = new WebSocket(`ws://127.0.0.1:${p}`), got = []; let sent = false;
  ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', role: 'gm', key })));
  ws.on('message', d => { const m = JSON.parse(d); got.push(m); if (m.t === 'state' && !sent) { sent = true; extra.forEach(x => ws.send(JSON.stringify(x))); setTimeout(() => { ws.close(); res(got); }, 500); } }); });

test('estado leve: skills e itens vão uma vez em "defs"; os estados seguintes não os repetem', async () => {
  const data = tmp(), s = await boot(data, { GM_KEY: 'chave' }); assert.ok(!s.failed, s.out());
  try {
    const got = await talk(s.p, 'chave', [{ t: 'offMsg', v: 'Volto já' }, { t: 'sync' }]), kinds = got.map(m => m.t);
    assert.deepEqual(kinds.slice(0, 2), ['defs', 'state']); assert.ok(Object.keys(got[0].d.skills).length > 500); assert.ok(Object.keys(got[0].d.items).length > 50);
    const st = got.filter(m => m.t === 'state'); assert.ok(st.length >= 3); for (const m of st) { assert.equal(m.s.skills, undefined); assert.equal(m.s.items, undefined); assert.equal(m.dv, got[0].v); }
    assert.equal(kinds.filter(k => k === 'defs').length, 2); // a 2ª só porque o cliente pediu ("sync")
    assert.ok(JSON.stringify(st[1]).length < JSON.stringify(got[0]).length / 3);
    const ed = await talk(s.p, 'chave', [{ t: 'edAdd', coll: 'items' }]), dv = ed.filter(m => m.t === 'defs').map(m => m.v);
    assert.equal(dv.length, 2); assert.ok(dv[1] > dv[0]); assert.equal(ed.at(-1).dv, dv[1]); // o catálogo mudou: versão nova para todos
  } finally { s.stop(); }
});

test('http: cabeçalhos de segurança, compressão, 304, pedaços de áudio e métodos recusados', async () => {
  const data = tmp(), s = await boot(data, { GM_KEY: 'chave' }); assert.ok(!s.failed, s.out());
  const u = `http://127.0.0.1:${s.p}`;
  try {
    const pg = await fetch(u + '/gm'); assert.equal(pg.status, 200); assert.match(pg.headers.get('content-security-policy'), /script-src 'self'/); assert.equal(pg.headers.get('x-content-type-options'), 'nosniff'); assert.equal(pg.headers.get('x-frame-options'), 'SAMEORIGIN');
    const js = await fetch(u + '/js/nucleo.js', { headers: { 'Accept-Encoding': 'gzip' } }); assert.equal(js.headers.get('content-encoding'), 'gzip'); assert.match(await js.text(), /const role/);
    const tag = js.headers.get('etag'); assert.ok(tag); assert.equal((await fetch(u + '/js/nucleo.js', { headers: { 'If-None-Match': tag } })).status, 304);
    assert.equal((await fetch(u + '/js/nucleo.js', { method: 'DELETE' })).status, 405); assert.equal((await fetch(u + '/nao-existe.js')).status, 404); assert.equal((await fetch(u + '/..%2f..%2fpackage.json')).status, 404);
    const head = await fetch(u + '/style.css', { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal((await head.text()).length, 0);
    const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(2000, 7)]), up = await fetch(u + '/upload', { method: 'POST', headers: { 'Content-Type': 'audio/ogg', 'X-VJ-Key': 'chave' }, body: ogg }); assert.equal(up.status, 200);
    const file = await up.text(), part = await fetch(u + file, { headers: { Range: 'bytes=0-3' } }); assert.equal(part.status, 206); assert.equal(part.headers.get('content-range'), 'bytes 0-3/2004'); assert.equal(Buffer.from(await part.arrayBuffer()).toString(), 'OggS');
    const all = await fetch(u + file); assert.equal((await all.arrayBuffer()).byteLength, 2004); assert.match(all.headers.get('cache-control'), /immutable/);
    assert.equal((await fetch(u + file, { headers: { Range: 'bytes=9999-' } })).status, 416);
  } finally { s.stop(); }
});

test('importar campanha: arquivo hostil é limpo; arquivo quebrado é recusado sem tocar na campanha aberta', async () => {
  const data = tmp(), s = await boot(data, { GM_KEY: 'chave' }); assert.ok(!s.failed, s.out());
  const imp = body => fetch(`http://127.0.0.1:${s.p}/api/import?what=campanha`, { method: 'POST', headers: { 'X-VJ-Key': 'chave' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  try {
    assert.equal((await imp('{"vj":"campanha"')).status, 400); assert.equal((await imp({ vj: 'outra' })).status, 400); assert.equal((await imp({ vj: 'campanha', chars: 5 })).status, 400);
    assert.equal((await fetch(`http://127.0.0.1:${s.p}/api/import?what=campanha`, { method: 'POST', body: '{}' })).status, 401);
    let st = (await talk(s.p, 'chave')).find(m => m.t === 'state').s; assert.equal(st.title, 'Campanha'); assert.equal(Object.values(st.chars).filter(c => !c.enemy).length, 3); // nada mudou
    const bad = '"><img src=x onerror=alert(1)>';
    const r = await imp({ vj: 'campanha', title: 'Hostil', users: { intruso: 'a:b' }, chars: { ok1: { name: bad, img: 'javascript:alert(1)', color: bad, st: { [bad]: 3, burn: 2 } }, [bad]: { name: 'chave ruim' } },
      items: { i9: { name: 'Coisa', type: bad, power: 5 } }, scenes: { s1: { name: 'Sala', bg: 'javascript:1', bbg: bad, pins: { p1: { x: 1, y: 1, text: 'ok' }, [bad]: { x: 1, y: 1 } } } }, scene: 's1', log: [{ who: 'A', text: 'oi', kind: bad, d: bad, rr: { l: bad } }] });
    assert.equal(r.status, 200, await r.text());
    const got = await talk(s.p, 'chave'); st = got.find(m => m.t === 'state').s; const defs = got.find(m => m.t === 'defs').d;
    assert.equal(st.title, 'Hostil'); assert.deepEqual(Object.keys(st.chars), ['ok1']); assert.equal(st.chars.ok1.img, ''); assert.match(st.chars.ok1.color, /^#[0-9a-f]{6}$/i); assert.deepEqual(Object.keys(st.chars.ok1.st), ['burn']);
    assert.equal(defs.items.i9.type, 'cons'); assert.equal(st.scenes.s1.bg, ''); assert.equal(st.scenes.s1.bbg, ''); assert.deepEqual(Object.keys(st.scenes.s1.pins), ['p1']);
    const l = st.log.find(e => e.text === 'oi'); assert.equal(l.kind, ''); assert.equal(l.d, undefined); assert.equal(l.rr, undefined); assert.ok(!st.accounts.includes('intruso'));
  } finally { s.stop(); }
});

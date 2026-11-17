// Testes de rede e de arquivos: sobem o servidor de verdade (como o iniciar.bat) numa porta livre.  node --test tools/test-rede.js
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawn } from 'child_process'; import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let port = 3300 + Math.floor(Math.random() * 500);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

async function boot(data, env = {}) {
  const p = ++port, child = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: p, VJ_DATA: data, VJ_TUNNEL: '0', GM_KEY: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
  for (let i = 0; i < 60; i++) { // espera subir (ou morrer)
    if (child.exitCode !== null) break;
    try { if ((await fetch(`http://127.0.0.1:${p}/api/hi`)).ok) return { p, child, out: () => out, stop: () => child.kill() }; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  child.kill(); return { p, child, failed: true, out: () => out, stop() {} };
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'vjrede-'));
const hello = (p, msg) => new Promise(res => { const ws = new WebSocket(`ws://127.0.0.1:${p}`); ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', ...msg }))); ws.on('message', d => { const m = JSON.parse(d); if (m.t === 'err' || m.t === 'state') { ws.close(); res(m); } }); });
const poke = (p, key) => new Promise(res => { const ws = new WebSocket(`ws://127.0.0.1:${p}`); ws.on('open', () => { ws.send(JSON.stringify({ t: 'hello', role: 'gm', key })); setTimeout(() => { ws.send(JSON.stringify({ t: 'chat', text: 'oi' })); setTimeout(() => { ws.close(); res(); }, 600); }, 200); }); }); // qualquer ação do mestre grava o estado
const up = (p, headers, body = PNG, type = 'image/png') => fetch(`http://127.0.0.1:${p}/upload`, { method: 'POST', headers: { 'Content-Type': type, ...headers }, body });

test('sem GM_KEY: a chave é sorteada e guardada, e "mestre" não abre o painel', async () => {
  const data = tmp(), s = await boot(data); assert.ok(!s.failed, s.out());
  try {
    const key = fs.readFileSync(path.join(data, 'gm-key.txt'), 'utf8').trim(); assert.match(key, /^[0-9a-f]{10}$/);
    assert.equal((await hello(s.p, { role: 'gm', key: 'mestre' })).t, 'err');
    assert.equal((await hello(s.p, { role: 'gm', key })).t, 'state');
  } finally { s.stop(); }
  const s2 = await boot(data); try { assert.ok(!s2.failed); assert.equal((await hello(s2.p, { role: 'gm', key: fs.readFileSync(path.join(data, 'gm-key.txt'), 'utf8').trim() })).t, 'state'); } finally { s2.stop(); } // a mesma chave volta a valer
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

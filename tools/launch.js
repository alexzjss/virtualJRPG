import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as wait } from 'node:timers/promises';
import { openGm } from '../src/browser.js';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT deve ser um número entre 1 e 65535.');
  process.exit(1);
}
const opensBrowser = process.env.VJ_OPEN === '1';
const panel = `http://localhost:${port}/gm`;

async function probe() {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/hi`, { redirect: 'error', signal: AbortSignal.timeout(1500) });
    return r.ok && (await r.json()).vj === 1 ? 'game' : 'busy';
  } catch (e) {
    return e.cause?.code === 'ECONNREFUSED' ? 'free' : 'busy';
  }
}

// O lançador continua dono da porta mesmo enquanto o processo monitorado reinicia.
const claim = () => process.platform !== 'win32' ? true : new Promise((resolve, reject) => {
  const guard = createServer(socket => socket.destroy());
  guard.once('error', e => { if (e.code === 'EADDRINUSE') resolve(false); else reject(e); });
  guard.listen(`\\\\.\\pipe\\virtualjrpg-${port}`, () => { guard.unref(); resolve(true); });
});

async function waitForGame(stopped = () => false) {
  const deadline = Date.now() + 60_000;
  while (!stopped() && Date.now() < deadline) {
    if (await probe() === 'game') return true;
    await wait(250);
  }
  return false;
}

const ownsLaunch = await claim();
const status = ownsLaunch ? await probe() : await waitForGame() ? 'game' : 'starting';
if (status === 'game') {
  console.log(`O virtualJRPG já está aberto. Painel do mestre: ${panel}`);
  if (opensBrowser) openGm(port);
} else if (status === 'busy') {
  console.error(`A porta ${port} está ocupada por outro serviço. Feche o serviço ou defina PORT com outra porta.`);
  process.exitCode = 1;
} else if (status === 'starting') {
  console.error(`O virtualJRPG está iniciando na porta ${port}. Abra ${panel} quando a mesa estiver pronta.`);
  process.exitCode = 1;
} else {
  const paths = ['server.js', 'content.js', 'tree.js', 'src', 'arvore', 'public/rules.js', 'public/oficios.js', 'public/armas.js', 'public/js/som-catalogo.js', 'tools/watch.js'];
  const child = spawn(process.execPath, ['--watch', ...paths.map(p => '--watch-path=' + p), 'tools/watch.js'], {
    stdio: 'inherit', env: { ...process.env, PORT: String(port), VJ_OPEN: '0' },
  });
  let stopped = false;
  child.on('exit', (code, signal) => { stopped = true; process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1); });
  child.on('error', e => { stopped = true; process.exitCode = 1; console.error('Falha ao iniciar o virtualJRPG:', e.message); });
  if (opensBrowser && await waitForGame(() => stopped)) {
    const { KEY } = await import('../src/config.js');
    openGm(port, KEY);
  }
}

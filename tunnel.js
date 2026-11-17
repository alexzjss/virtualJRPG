// Túnel gratuito do Cloudflare (trycloudflare.com): o programa baixa o cloudflared na primeira vez, abre o túnel e avisa o endereço.
// O código de convite é o nome do endereço (ex.: lago-verde-mesa-norte em https://lago-verde-mesa-norte.trycloudflare.com).
import fs from 'fs'; import path from 'path'; import { spawn, execFileSync } from 'child_process';

const BASE = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';
const ASSET = { 'win32-x64': 'cloudflared-windows-amd64.exe', 'win32-arm64': 'cloudflared-windows-amd64.exe', 'linux-x64': 'cloudflared-linux-amd64', 'linux-arm64': 'cloudflared-linux-arm64',
  'darwin-arm64': 'cloudflared-darwin-arm64.tgz', 'darwin-x64': 'cloudflared-darwin-amd64.tgz' };
const RETRY = 60e3; // tenta de novo a cada minuto quando falha ou cai

export const codeOf = url => (String(url).match(/^https:\/\/([a-z0-9-]+)\.trycloudflare\.com/) || [])[1] || '';

async function binary(dir, say) {
  const win = process.platform === 'win32', bin = path.join(dir, win ? 'cloudflared.exe' : 'cloudflared');
  if (fs.existsSync(bin)) return bin;
  const asset = ASSET[process.platform + '-' + process.arch];
  if (!asset) throw new Error(`não há cloudflared pronto para ${process.platform}-${process.arch}; instale-o à mão e coloque em ${bin}`);
  say('baixando', 'Baixando o cloudflared (só na primeira vez, ~30 MB)…');
  const r = await fetch(BASE + asset);
  if (!r.ok) throw new Error('download do cloudflared falhou (HTTP ' + r.status + ')');
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, asset + '.part');
  fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
  if (asset.endsWith('.tgz')) { execFileSync('tar', ['-xzf', tmp, '-C', dir]); fs.unlinkSync(tmp); } else fs.renameSync(tmp, bin);
  fs.chmodSync(bin, 0o755);
  return bin;
}

// onChange recebe { status: 'off'|'baixando'|'abrindo'|'ok'|'erro', url, code, msg }
export function startTunnel({ port, dir, onChange }) {
  let info = { status: 'abrindo', url: '', code: '', msg: 'Abrindo o túnel…' }, proc = null, stopped = false, timer = null;
  const say = (status, msg, url = '') => { info = { status, url, code: codeOf(url), msg }; onChange(info); };
  const again = msg => { proc = null; say('erro', msg + ' Tentando de novo em 1 minuto; na mesma rede Wi-Fi o jogo continua funcionando.'); if (!stopped) timer = setTimeout(run, RETRY); };
  async function run() {
    let bin;
    try { bin = await binary(dir, say); } catch (e) { return again('Não consegui preparar o túnel: ' + e.message + '.'); }
    say('abrindo', 'Abrindo o túnel…');
    const p = proc = spawn(bin, ['tunnel', '--no-autoupdate', '--url', 'http://localhost:' + port], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let buf = '', up = false, url = '';
    const read = d => { // o cloudflared escreve o endereço e o "Registered tunnel connection" no stderr
      buf = (buf + d).slice(-4000);
      url ||= (buf.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g) || []).find(u => codeOf(u) !== 'api') || '';
      if (url && !up && /Registered tunnel connection|Connection [a-f0-9-]+ registered/i.test(buf)) { up = true; say('ok', 'Túnel aberto.', url); }
    };
    p.stdout.on('data', read); p.stderr.on('data', read);
    p.on('error', e => { if (proc === p) again('O cloudflared não abriu: ' + e.message + '.'); });
    p.on('exit', code => { if (!stopped && proc === p) again(up ? 'O túnel caiu.' : `O cloudflared fechou (código ${code}). Sem internet?`); });
  }
  run();
  const stop = () => { stopped = true; clearTimeout(timer); proc?.kill(); };
  process.on('exit', stop);
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => { stop(); process.exit(0); });
  return { get: () => info, stop };
}

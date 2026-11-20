import { spawn } from 'node:child_process';

// A chave viaja no fragmento, que o navegador não envia ao servidor HTTP.
export function openGm(port, key = '') {
  const url = `http://localhost:${port}/gm${key ? '#k=' + encodeURIComponent(key) : ''}`;
  const [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true }).on('error', () => {}).unref();
}

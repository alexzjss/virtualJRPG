// Entrada do iniciar.bat: reinicia o servidor quando o código-fonte mudar.
// Mantém o túnel habilitado no modo normal; iniciar.bat offline define VJ_TUNNEL=0.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const keyFile = path.join(root, 'data', 'gm-key.txt');
process.env.VJ_OPEN = '0';
if (!process.env.GM_KEY && fs.existsSync(keyFile)) process.env.GM_KEY = fs.readFileSync(keyFile, 'utf8').trim();

const { boot } = await import('../server.js');
boot();

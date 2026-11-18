// Servidor da campanha de verdade (data/) que reinicia sozinho quando o código muda, sem abrir túnel:
//   npm run live      → terminal 1: servidor, reinicia ao salvar qualquer .js (public/ só pede F5)
//   npm run tunel     → terminal 2: túnel do Cloudflare que continua de pé enquanto o servidor reinicia
// Roda com `node --watch` (ver package.json). A campanha fica em data/state.json, então nada se perde a cada reinício.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), kf = path.join(root, 'data', 'gm-key.txt');
process.env.VJ_TUNNEL = '0'; process.env.VJ_OPEN = '0';
if (!process.env.GM_KEY && fs.existsSync(kf)) process.env.GM_KEY = fs.readFileSync(kf, 'utf8').trim();
const { boot } = await import('../server.js');
boot();

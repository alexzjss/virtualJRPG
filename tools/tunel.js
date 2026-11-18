// Túnel avulso do Cloudflare para o `npm run live`: o endereço (e o código de convite) não muda quando o servidor reinicia.
// Uso: npm run tunel [porta]   (porta padrão 3000, a mesma do servidor)
import path from 'path'; import { fileURLToPath } from 'url';
import { startTunnel } from '../tunnel.js';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), port = +process.argv[2] || +process.env.PORT || 3000;
startTunnel({ port, dir: path.join(root, 'data'), onChange: i => console.log(i.status === 'ok' ? `Túnel aberto: ${i.url}\nCódigo de convite: ${i.code}` : `[túnel] ${i.msg || i.status}`) });

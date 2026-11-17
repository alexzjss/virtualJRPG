// Ambiente de desenvolvimento: sobe o servidor com dados separados (data-dev/), sem túnel e sem abrir o navegador.
//   npm run dev            → http://localhost:3210/gm   (chave: dev)
// Nada aqui toca a pasta data/ da campanha de verdade.
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.VJ_DATA ||= path.join(root, 'data-dev');
process.env.VJ_TUNNEL = '0'; process.env.VJ_OPEN = '0';
process.env.GM_KEY ||= 'dev'; process.env.PORT ||= '3210';
const { boot } = await import('../server.js');
boot();

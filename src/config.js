import '../public/rules.js'; // regras compartilhadas com o navegador (globalThis.RULES)
import '../public/oficios.js'; // catálogo de ofícios (perícias), também usado pelo navegador (globalThis.OFI)
import '../public/armas.js'; // armas: modelos, perfil do ataque básico e criador (globalThis.ARMAS)
import '../public/js/mundo-pecas.js'; // pisos e arestas do mundo 3D (globalThis.MPECAS)
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const RU = globalThis.RULES, OF = globalThis.OFI, AR = globalThis.ARMAS;

// __SEA__ só existe no executável gerado por tools/build-exe.mjs: arquivos do jogo vêm embutidos e os dados ficam ao lado do .exe
const SEA = typeof __SEA__ !== 'undefined', seaMod = SEA ? process.getBuiltinModule('node:sea') : null;
const dir = SEA ? path.dirname(process.execPath) : path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(dir, 'public'), DATA = process.env.VJ_DATA || path.join(dir, 'data'), UP = path.join(DATA, 'uploads');
const PORT = process.env.PORT || 3000;
const PORTAL = process.env.VJ_PORTAL ? process.env.VJ_PORTAL.replace(/\/?$/, '/') : ''; // opcional: página fixa onde o jogador digita o código. Vazio = o convite leva direto ao link do túnel, sem depender de site nenhum
const keyFile = path.join(DATA, 'gm-key.txt');
const KEY = process.env.GM_KEY || (() => { // a chave do mestre é sorteada na primeira vez e guardada ao lado dos dados (nunca há uma chave padrão conhecida)
  try { const k = fs.readFileSync(keyFile, 'utf8').trim(); if (k) return k; } catch {}
  const k = crypto.randomBytes(5).toString('hex'); fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(keyFile, k + '\n'); return k;
})();
const FILE = path.join(DATA, 'state.json'), VEND = path.join(dir, 'node_modules', 'three', 'build');
const GM = '@gm'; // destinatário "mestre" em entradas privadas do log
const IMG = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
const AUD = { 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/ogg': '.ogg', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/wave': '.wav', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a' };
const MIME = { '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', ...Object.fromEntries(Object.entries(IMG).map(([m, e]) => [e, m])) };

const MUNDO = process.env.VJ_MUNDO === '1'; // mundo 3D explorável ligado para todos (até a troca final, só em desenvolvimento)
export { AR, AUD, DATA, FILE, GM, IMG, KEY, MIME, MUNDO, OF, PORT, PORTAL, PUB, RU, SEA, UP, VEND, dir, keyFile, seaMod };

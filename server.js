// Ponto de entrada. As regras e a rede ficam em src/:
//   config.js   caminhos, porta, chave do mestre        consts.js   tabelas de regras e esquemas
//   state.js    estado, migrações, gravação e backups    rules.js    cálculo de combate, inimigos, fila CTB
//   auth.js     contas, limites e bloqueios              seed.js     conteúdo inicial de uma campanha nova
//   handlers.js ações que chegam dos clientes (H)        net.js      HTTP, WebSocket, visão por papel
import { fileURLToPath } from 'url';
import { SEA } from './src/config.js';
import { R } from './src/consts.js';
import { S, fresh, migrateItems, backupOnStart } from './src/state.js';
import { genFoe, partyRef, fitBoss, spawn, current, derive, order, prep } from './src/rules.js';
import { seed } from './src/seed.js';
import { H } from './src/handlers.js';
import { view, handle, start } from './src/net.js';
import { fix, importPack, autoBackup } from './src/campaign.js';

if (fresh) { seed(); fix(); }
prep();
export { genFoe, partyRef, fitBoss, spawn, H, S, R, current, derive, view, order, handle, migrateItems, importPack };
if (process.argv.includes('--offline')) process.env.VJ_TUNNEL = '0'; // npm run offline: sem túnel
if (SEA || process.argv[1] === fileURLToPath(import.meta.url)) { backupOnStart(); autoBackup(); start(); }

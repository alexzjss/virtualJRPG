// Ponto de entrada. As regras e a rede ficam em src/:
//   config.js   caminhos, porta, chave do mestre        consts.js   tabelas de regras e esquemas
//   state.js    estado, migrações, gravação e backups    rules.js    cálculo de combate, inimigos, fila CTB
//   auth.js     contas, limites e bloqueios              seed.js     conteúdo inicial de uma campanha nova
//   handlers.js ações que chegam dos clientes (H)        net.js      HTTP, WebSocket, visão por papel
import { fileURLToPath } from 'url';
import { SEA } from './src/config.js';
import { R } from './src/consts.js';
import { S, fresh, migrateItems, backupOnStart } from './src/state.js';
import { genFoe, partyRef, fitBoss, spawn, current, derive, order, prep, modsOf, slotMax, basicOf, aiPlan, aiRun, telOf, finPlan } from './src/rules.js';
import { seed } from './src/seed.js';
import { H } from './src/handlers.js';
import { view, handle, start, server, push } from './src/net.js';
import { fix, importPack, autoBackup } from './src/campaign.js';
import './src/mundo.js'; // mundo 3D: world por cena, migração do 2D, movimento e editor
import './src/mundo-rede.js'; // mundo 3D: canal pos e projeção filtrada

if (fresh) { seed(); fix(); }
prep();
export { aiPlan, aiRun, telOf, finPlan, genFoe, partyRef, fitBoss, spawn, H, S, R, current, derive, view, order, handle, migrateItems, importPack, modsOf, slotMax, server, push, basicOf }; // server e push: o teste de interface (tools/ui-smoke.js) sobe o jogo no mesmo processo
if (process.argv.includes('--offline')) process.env.VJ_TUNNEL = '0'; // npm run offline: sem túnel
export const boot = () => { backupOnStart(); autoBackup(); start(); };
if (SEA || process.argv[1] === fileURLToPath(import.meta.url)) boot();

// Servidor de demonstração dos comandos de defesa: uma luta pronta com um inimigo que ataca em loop (anunciado e de várias batidas).
//   node tools/dev-cmd.js        → http://localhost:3213/player (login ana / 1234); mestre: chave "chave"
// Serve só para ver e testar a tela de defesa à mão; os testes automáticos ficam em tools/test.js.
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjcmd-')); process.env.GM_KEY = 'chave'; process.env.VJ_TUNNEL = '0'; process.env.PORT = process.env.PORT || '3213';
const { H, S, server, push, current, derive } = await import('../server.js');
const gm = { role: 'gm', send() {} };
const mk = m => { const b = new Set(Object.keys(S.chars)); H.addChar(gm, m); return S.chars[Object.keys(S.chars).find(k => !b.has(k))]; };
const sk = n => Object.keys(S.skills).find(k => S.skills[k].name === n);
const h = mk({ name: 'Shinkai', owner: 'ana' }); H.userAdd(gm, { name: 'ana', pass: '1234', char: h.id });
h.skills = ['Aparar', 'Tiro Certeiro'].map(sk); S.skills[sk('Tiro Certeiro')].cmd = 'choque'; derive(h); h.hp = h.hpMax; h.aura = h.auraMax = 40; h.attrs.AGI = 1;
const e = mk({ enemy: true, name: 'Oni de Teste' }); e.attrs.AGI = 99; e.skills = [sk('Golpe Pesado'), sk('Rajada de Aura')]; e.telK = [...e.skills]; derive(e); e.hpMax = e.hp = 9999;
for (const id of Object.keys(S.chars)) if (id !== h.id && id !== e.id) delete S.chars[id]; // só a nossa heroína e o inimigo na luta
H.battle(gm, { on: true });
const loop = () => { try { if (S.battle.active && !S.battle.cmd) { h.hp = h.hpMax; h.aura = h.auraMax; h.parT = h.chqT = 0; h.st = {}; while (current() !== e.id) H.next(gm); H.ai(gm); push(); } } catch (x) { console.error(x); } };
setInterval(loop, 3500); loop();
await new Promise(r => server.listen(+process.env.PORT, '127.0.0.1', r)); console.log('pronto: http://127.0.0.1:' + process.env.PORT + '/player  (ana / 1234)');

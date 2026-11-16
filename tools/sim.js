// Simulador de balanceamento: roda batalhas 4x4 usando as regras reais do servidor.
//   node tools/sim.js [batalhas]        VJ_RULES='{"hit":50}' node tools/sim.js
import fs from 'fs'; import os from 'os'; import path from 'path';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjsim-'));
const { H, S, R, current, derive } = await import('../server.js');
const gm = { role: 'gm' }, N = +process.argv[2] || 400, sk = n => Object.keys(S.skills).find(k => S.skills[k].name === n);
const potion = Object.keys(S.items).find(k => S.items[k].eff === 'hp');
const KITS = [['Golpe Pesado', 'Golpe Giratório'], ['Centelha', 'Mar de Chamas'], ['Luz Curativa', 'Aurora'], ['Tiro Certeiro', 'Lâmina de Vento']];
let wins = 0, rounds = 0, falls = 0, deaths = 0;
console.log = () => {};
for (let n = 0; n < N; n++) {
  S.chars = {}; S.log.length = 0; S.battle = { active: false, ticks: {} };
  for (let i = 0; i < 4; i++) { H.addChar(gm, { owner: 'p' }); H.addChar(gm, { enemy: true }); }
  const all = Object.values(S.chars), heroes = all.filter(c => !c.enemy), foes = all.filter(c => c.enemy), acts = {};
  heroes.forEach((h, i) => { h.skills = KITS[i].map(sk); h.inv[potion] = 1; });
  all.forEach(c => { derive(c); c.hp = c.hpMax; c.aura = c.auraMax; c.san = c.sanMax; });
  H.battle(gm, { on: true });
  for (let step = 0; step < 800; step++) {
    const a = S.chars[current()], liveF = foes.filter(f => f.hp > 0), liveH = heroes.filter(h => h.hp > 0);
    if (!liveF.length || !liveH.length || !a) break;
    acts[a.id] = (acts[a.id] || 0) + 1;
    if (a.enemy) { H.ai(gm); continue; }
    // heróis: curam quem está mal, usam poção em emergência, senão focam o inimigo mais ferido
    const hurt = heroes.filter(h => !h.dead && h.hp < h.hpMax * .4).sort((x, y) => x.hp - y.hp)[0], weak = liveF.sort((x, y) => x.hp - y.hp)[0];
    const can = k => S.skills[k] && a.aura >= S.skills[k].cost, heal = a.skills.find(k => can(k) && S.skills[k].kind === 'heal'), dmg = a.skills.filter(k => can(k) && S.skills[k].kind === 'dmg');
    if (hurt && heal) H.act(gm, { id: a.id, skill: heal, target: hurt.id });
    else if (a.hp < a.hpMax * .3 && a.inv[potion]) H.use(gm, { id: a.id, item: potion, target: a.id });
    else H.act(gm, { id: a.id, skill: dmg.length && Math.random() < .6 ? dmg[Math.floor(Math.random() * dmg.length)] : 'atk', target: weak.id });
  }
  if (foes.every(f => f.hp <= 0)) wins++;
  rounds += Math.max(...Object.values(acts)); falls += S.log.filter(e => / caiu!/.test(e.text) && heroes.some(h => e.text.includes(h.name + ' caiu'))).length; deaths += heroes.filter(h => h.dead).length;
}
process.stdout.write(`regras ${JSON.stringify(R)}\n${N} batalhas 4x4 · vitória dos heróis ${(100 * wins / N).toFixed(0)}% · rodadas ${(rounds / N).toFixed(1)} · quedas de herói/batalha ${(falls / N).toFixed(2)} · mortes/batalha ${(deaths / N).toFixed(2)}\n`);
process.exit(0);

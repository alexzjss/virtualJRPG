import { loadBestiary, loadScenes, newChar, rid } from './rules.js';
import { S } from './state.js';
import { measureImages } from './png-box.js';

const ART = {
  Shinkai: ['/personagens/shinkai/frente.png', '/personagens/shinkai/costas.png', '/personagens/shinkai/retrato.png'],
  Mikhail: ['/personagens/mikhail-artes-batalha/frente.png', '/personagens/mikhail-artes-batalha/costas.png', '/personagens/mikhail-artes-batalha/retrato.png'],
  Thomas: ['/characters/thomas-frente-sem-capa-v2.png', '/characters/thomas-costas-sem-capa-v2.png', '/characters/thomas-retrato-sem-capa-v2.png'],
};

function seed() {
loadScenes();
loadBestiary();
{ // personagens base, sem dono: o mestre atribui ou o jogador assume
  const item = n => Object.keys(S.items).find(k => S.items[k].name === n);
  [['Shinkai', 'indra', '#f5c518', { AGI: 65, DES: 60, FOR: 50, CON: 40, INT: 50, SAB: 35 }, 'Katana de Caçador', 'Veloz e ofensivo: age muitas vezes e pune com lâmina e raio.', [3, 5]],
    ['Mikhail', 'fuhaku', '#3ddc97', { AGI: 60, INT: 60, DES: 55, CAR: 50, FOR: 35, SAB: 45 }, 'Revólver .38', 'Ágil e estrategista: controla o campo e a ordem dos turnos.', [2, 6]],
    ['Thomas', 'hiruko', '#8fd400', { FOR: 65, CON: 65, AGI: 30, SAB: 45, INT: 45, CAR: 35 }, 'Manoplas de Aço', 'Pesado e ofensivo: aguenta o castigo e devolve em dobro.', [3, 7]]]
    .forEach(([name, el, color, attrs, weapon, bio, [x, y]]) => {
      const id = rid(), ch = S.chars[id] = { ...newChar(id, false, ''), name, color, bio, xp: 30, x, y, vinc: [el] };
      [ch.imgF, ch.imgB, ch.imgP] = ART[name];
      ch.img = ch.imgP;
      measureImages(ch);
      Object.assign(ch.attrs, attrs);
      const w = item(weapon), tonic = item('Poção'), root = Object.keys(S.skills).find(k => S.skills[k].el === el && S.skills[k].root);
      if (w) { ch.inv[w] = 1; ch.equip.arma = w; } if (tonic) ch.inv[tonic] = 2; if (root) ch.skills.push(root);
    });
}
}

export { seed };

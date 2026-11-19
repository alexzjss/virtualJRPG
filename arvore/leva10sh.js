// Leva 10: Shukketsu (sangue, dreno, hemorragia).
import { N } from './l8.js';

export const LEVA10SH = {
  'Sangria': [
    N('Sangria Acumulada', 'Cada ferida guarda sangue para a próxima.', 'd10/6', 'stack sangue 5; st bleed 2'),
    N('Sangria Que Rouba', 'O sangue que escorre volta ao caçador.', 'd12/7', 'drain hp 30; st bleed 2'),
    N('Sangria Detonadora', 'Todo o sangue guardado estoura nas feridas abertas.', 'd14/9', 'burst sangue .4; det bleed 6'),
    N('Sangria em Todas as Veias', 'Todas as veias do campo se abrem ao mesmo tempo.', 'd16/12 a', 'st bleed 3; drain hp 20'),
    N('Sangria Absoluta', 'Uma sangria sem remédio, feita para um alvo só.', 'd40/16', 'st bleed 3; solo 1.6; drain hp 30'),
  ],
  'Corte Venoso': [
    N('Corte Venoso Duplo Fundo', 'Dois cortes na mesma veia.', 'd8/7 x2', 'st bleed 2'),
    N('Corte Venoso Que Rouba', 'O corte abre a veia e o caçador bebe o que sai.', 'd14/9', 'drain hp 35; st bleed 2'),
    N('Corte Venoso Acumulado', 'Cada corte engorda a ferida seguinte.', 'd16/10', 'stack sangue 5; per bleed 15'),
    N('Corte Venoso do Abate', 'O corte que termina o que já estava quase terminado.', 'd38/16', 'exec 30 1.6; st bleed 3'),
  ],
  'Gota Carmesim': [
    N('Gota Carmesim Acumulada', 'Cada gota chama a próxima.', 'd14/9', 'stack sangue 5; st bleed 2'),
    N('Gota Carmesim Detonadora', 'Todas as gotas se juntam e explodem.', 'd18/11', 'burst sangue .4; det bleed 6'),
    N('Gota Carmesim Que Não Seca', 'A última gota cai e nunca seca.', 'd36/16 a', 'st bleed 3; drain hp 30'),
  ],
};

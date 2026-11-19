// Leva 10: Amaterasu (sol, luz, purificação, cura).
import { N } from './l8.js';

export const LEVA10AM = {
  'Luz Curativa': [
    N('Luz Curativa Acumulada', 'Cada cura deixa uma centelha de luz que alimenta a próxima.', 'h8/6', 'stack luz 5; st regen 2'),
    N('Luz Que Purifica', 'A luz entra nas feridas e leva o mal embora.', 'h10/7', 'cleanse'),
    N('Luz Curativa Detonadora', 'Toda a luz guardada se derrama de uma vez, cobrindo o ferido.', 'h12/8', 'burst luz .4; shield 20'),
    N('Luz Que Reergue', 'Uma luz tão forte que levanta quem já caiu.', 'h14/10', 'revive 30'),
    N('Aurora Curativa', 'A aurora nasce sobre todos e não deixa ferida aberta.', 'h20/14 a', 'st regen 3; cleanse; shield 24'),
  ],
  'Toque Sereno': [
    N('Toque Sereno Protetor', 'Um toque que deixa um escudo de luz sobre a pele.', 'h8/6', 'shield 18'),
    N('Toque Sereno Acumulado', 'Cada toque serena mais que o anterior.', 'h10/7', 'stack luz 5; st regen 2'),
    N('Toque Sereno Que Purifica', 'O toque limpa o que ficou de ruim.', 'h12/8', 'cleanse; st regen 2'),
    N('Toque Sereno da Alvorada', 'Uma alvorada inteira num só toque, sobre todos os aliados.', 'h18/14 a', 'shield 24; st regen 3; cleanse'),
  ],
};

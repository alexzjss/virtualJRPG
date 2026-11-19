// Leva 10: Indra (trovão, eletricidade, paralisia).
import { N } from './l8.js';

export const LEVA10I = {
  'Descarga': [
    N('Descarga Acumulada', 'Toda a carga guardada sai numa descarga só.', 'd24/10', 'burst carga .4; st para 1 40%'),
    N('Descarga do Trovão Primordial', 'O primeiro trovão do mundo, que ainda ecoa nas nuvens.', 'd40/16', 'st para 2; vs para 1.5'),
  ],
  'Fio de Raio': [
    N('Fio Condutor', 'Um fio de raio que guarda carga em quem o segura.', 'd12/8', 'stack carga 5; st para 1 30%'),
    N('Fio de Alta Tensão', 'Um fio tão tenso que atravessa qualquer couraça.', 'd22/10', 'pierce 70; st para 1'),
    N('Teia de Trovões', 'Fios de trovão cobrem o campo e saltam de alvo em alvo.', 'd32/14 a', 'chain 4 .7; st para 2'),
  ],
};

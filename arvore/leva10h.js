// Leva 10: Hiruko (doença, veneno, mutação, radiação).
import { N } from './l8.js';

export const LEVA10H = {
  'Evolução Forçada': [
    N('Evolução Acelerada', 'O corpo se refaz mais rápido do que deveria.', 'h8/5 s', 'st regen 2'),
    N('Evolução Dirigida', 'A mutação segue o que o caçador quer, e não o acaso.', 'h8/6 s', 'st atkUp 2'),
    N('Mutação Adaptativa', 'A carne muda para aguentar o que a machuca.', 'h10/7 s', 'st defUp 2; st agiUp 1'),
    N('Evolução Acumulada', 'Cada mutação deixa uma marca útil para a próxima.', 'u/8 s', 'stack mutacao 5; st agiUp 2'),
    N('Evolução em Grupo', 'A mutação se espalha entre os aliados.', 'h12/12 a', 'st atkUp 2; st agiUp 2'),
    N('Evolução Que Cura', 'O corpo cresce sobre a ferida e a fecha.', 'h20/12', 'res hp 30; st regen 2'),
    N('Mutação Defensiva Total', 'Uma carapaça cresce por todo o corpo em um instante.', 'u/12 s', 'shield 30; st defUp 3'),
    N('Evolução Final', 'A última evolução, que deixa o grupo irreconhecível e imbatível.', 'h24/18 a', 'st atkUp 3; st agiUp 3; st regen 3'),
  ],
  'Suplex': [
    N('Suplex Que Contagia', 'O arremesso passa a doença para o alvo.', 'd12/7', 'st poison 2; stack doenca 5'),
    N('Suplex Que Racha', 'O arremesso racha o chão e a postura do alvo.', 'd16/9', 'brk 2; st down 1'),
    N('Suplex em Cadeia', 'O alvo é jogado contra o próximo, e o próximo contra o outro.', 'd18/11', 'chain 2 .6; stack doenca 5'),
    N('Suplex da Febre', 'Quanto mais doente o alvo, mais forte o arremesso.', 'd22/12', 'vs poison 1.5; st poison 3'),
    N('Suplex Terminal', 'O último arremesso, o da fase terminal da doença.', 'd40/16', 'st down 2; vs poison 1.6; stack doenca 5'),
  ],
  'Esquiva Doentia': [
    N('Esquiva Mutante', 'O corpo se deforma para fugir do golpe e guarda a doença.', 'u/6 s', 'st evade 1; stack doenca 5'),
    N('Esquiva Que Contamina', 'Quem erra o golpe respira o que o caçador exala.', 'd12/7', 'st poison 2'),
    N('Esquiva em Espiral', 'O corpo gira em espiral e escapa de tudo.', 'u/8 s', 'st evade 2; haste 30'),
    N('Esquiva Febril', 'Uma esquiva que deixa uma onda de febre em volta.', 'd16/11 a', 'st poison 2; push 20'),
    N('Esquiva Sem Corpo', 'O corpo vira outra coisa por um instante, e nenhum golpe o encontra.', 'u/12 s', 'st evade 2; st counter 2; stack doenca 5'),
  ],
  'Força Doentia': [
    N('Força Doentia Dupla', 'Dois golpes de quem não sente mais a dor.', 'd8/6 x2', 'stack doenca 5'),
    N('Força Que Racha', 'Uma força errada, que quebra o que bate.', 'd14/8', 'brk 1; stack doenca 5'),
    N('Força de Muitos', 'A doença dá força para bater em todos.', 'd16/12 a', 'st poison 2; stack doenca 5'),
    N('Força Que Consome', 'A força vem do que o alvo perde.', 'd20/11', 'drain hp 25; stack doenca 5'),
    N('Força Febril', 'A febre sobe e o golpe sobe junto.', 'd24/12', 'vs poison 1.5; st poison 2'),
    N('Força Doentia Plena', 'O corpo doente em sua melhor forma: forte demais para ficar de pé por muito tempo.', 'd40/16', 'stack doenca 5; st poison 3; pierce 40'),
  ],
  'Chute Doentio': [
    N('Chute Doentio: Último Sintoma', 'O último sintoma é o chute que derruba o que está de pé.', 'd40/16', 'stack doenca 5; st poison 3; vs poison 1.5'),
  ],
  'Raio Gama': [
    N('Raio Gama Acumulado', 'Cada raio deixa o corpo mais carregado.', 'd10/6', 'stack mutacao 5; st rad 2'),
    N('Raio Gama Que Penetra', 'Um raio que atravessa qualquer couraça.', 'd14/8', 'pierce 70; st rad 1'),
    N('Raio Gama Detonador', 'A mutação guardada estoura num raio só.', 'd16/10', 'burst mutacao .4; det rad 6'),
    N('Raio Gama Que Transmuta', 'O veneno do alvo vira radiação.', 'd18/11', 'conv poison rad'),
    N('Raio Gama do Fim do Átomo', 'Um raio que parte o átomo e tudo o que ele sustenta.', 'd40/18 a', 'st rad 3; vs rad 1.6'),
  ],
  'Isótopo Instável': [
    N('Isótopo Acumulado', 'Cada isótopo deixa uma carga no caçador.', 'd10/6', 'stack mutacao 5; st rad 2'),
    N('Isótopos em Cadeia', 'Um isótopo desperta o vizinho, e o vizinho do vizinho.', 'd12/8', 'chain 2 .6; st rad 2'),
    N('Isótopo Detonador', 'Toda a radiação acumulada estoura no alvo.', 'd16/10', 'det rad 6; st rad 2'),
    N('Isótopo Que Contamina', 'A radiação passa de um inimigo para todos os outros.', 'd16/12 a', 'spread rad; st rad 2'),
    N('Isótopo do Núcleo Instável', 'Um núcleo instável que não aguenta ser núcleo.', 'd40/18 a', 'st rad 3; vs rad 1.5'),
  ],
  'Feixe Estreito': [
    N('Feixe Que Penetra', 'Um feixe fino, que fura qualquer couraça.', 'd16/9', 'pierce 80'),
    N('Feixe Acumulado', 'Cada feixe carrega o seguinte com mutação.', 'd18/10', 'stack mutacao 5; st rad 1'),
    N('Feixe Duplo Paralelo', 'Dois feixes em paralelo, e o segundo cobra a radiação do primeiro.', 'd10/12 x2', 'vs rad 1.4'),
    N('Feixe Primordial', 'O feixe mais antigo e mais fino que existe.', 'd38/16', 'pierce 90; st rad 3'),
  ],
};

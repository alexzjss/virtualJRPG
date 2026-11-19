// Leva 10: Atlas (terra, pedra, metal, peso, gravidade).
import { N } from './l8.js';

export const LEVA10A = {
  'Estilhaço': [
    N('Estilhaços Cravados', 'Cacos de pedra se cravam na armadura e a enfraquecem.', 'd10/6', 'st defDn 1; stack rocha 5'),
    N('Saraivada de Estilhaços', 'Quatro estilhaços afiados, um atrás do outro.', 'd10/9 x4', 'st defDn 1 40%'),
    N('Estilhaço Detonador', 'A rocha guardada estoura de uma vez dentro do alvo.', 'd14/10', 'burst rocha .4; st defDn 1'),
    N('Estilhaço Quebra-Couraça', 'Um estilhaço que racha a defesa de quem já está fraco.', 'd16/11', 'brk 2; vs defDn 1.4'),
    N('Estilhaço do Monte Partido', 'Uma montanha se parte, e cada caco acha um inimigo.', 'd40/16 a', 'brk 2; vs defDn 1.5'),
  ],
  'Pedrada': [
    N('Pedrada de Montanha', 'Uma pedra do tamanho de um homem, arremessada sem esforço.', 'd22/10', 'st down 1; vs defDn 1.5'),
    N('Pedrada do Colosso', 'O arremesso de um colosso, que racha o chão sob o alvo.', 'd40/16', 'brk 2; st defDn 3; pierce 40'),
  ],
  'Terremoto': [
    N('Tremor Que Cresce', 'Cada tremor é maior que o anterior.', 'd10/9 a', 'stack rocha 5; st down 1 30%'),
    N('Terremoto Que Racha', 'O chão se abre e a guarda de todos vai junto.', 'd12/11 a', 'brk 1; st defDn 2'),
    N('Terremoto Que Prende', 'As fendas se fecham sobre os pés dos inimigos.', 'd14/12 a', 'st root 2; push 30'),
    N('Réplica Final', 'A última réplica, a mais forte, cai sobre os que já caíram.', 'd16/13 a', 'burst rocha .3; vs down 1.5'),
    N('Terremoto do Fim do Mundo', 'O mundo todo balança, e só a montanha fica de pé.', 'd42/20 a', 'brk 2; st down 2; vs root 1.5'),
  ],
};

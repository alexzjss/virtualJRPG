// Leva 10: Kagutsuchi (fogo, brasa, cinza, forja). Linhas de variação completadas até a camada 10.
import { N } from './l8.js';

export const LEVA10K = {
  'Centelha': [
    N('Centelhas Acumuladas', 'Cada centelha deixa uma brasa viva em quem as lança.', 'd10/5', 'st burn 2; stack brasa 5'),
    N('Revoada de Fagulhas', 'Uma nuvem de fagulhas cai sobre todos os inimigos.', 'd10/8 a', 'st burn 2 50%'),
    N('Centelha Detonadora', 'Toda brasa guardada estoura numa centelha só.', 'd10/8', 'burst brasa .4; det burn 5'),
    N('Constelação de Brasas', 'Quatro centelhas desenham uma constelação que não apaga.', 'd10/10 x4', 'st burn 2'),
    N('Centelha Primordial', 'A primeira brasa do mundo, que ainda arde dentro do caçador.', 'd30/14 a', 'st burn 3; vs burn 1.5; pierce 40'),
  ],
  'Bola de Fogo': [
    N('Bola de Fogo Dividida', 'A esfera se parte em três antes do impacto.', 'd10/10 x3', 'st burn 2'),
    N('Bola de Fogo Calcinante', 'Calcina o que queima: a pele queimada vira carne exposta.', 'd20/12', 'conv burn exposed'),
    N('Bola de Fogo do Fim do Mundo', 'Uma esfera tão grande que o campo inteiro fica à sombra dela.', 'd40/20 a', 'st burn 3; vs burn 1.6'),
  ],
  'Mar de Chamas': [
    N('Chamas Que se Alastram', 'O fogo salta de inimigo em inimigo sem pedir licença.', 'd10/9 a', 'st burn 2; spread burn'),
    N('Avanço de Brasas', 'Uma parede de brasas avança e empurra quem não corre.', 'd12/11 a', 'st burn 2; push 20'),
    N('Chamas Que Cobram', 'Quanto mais tempo o alvo arde, mais a conta cresce.', 'd14/12 a', 'st burn 3; per burn 15'),
    N('Chamas Consumadas', 'Todas as queimaduras do campo se fecham numa só explosão.', 'd16/14 a', 'det burn 6'),
    N('Oceano de Chamas Sem Margem', 'O campo vira um oceano de fogo sem fundo e sem margem.', 'd40/20 a', 'st burn 3; vs burn 1.4'),
  ],
  'Labareda': [
    N('Labareda Rastejante', 'A chama corre rente ao chão e prende os pés de todos.', 'd10/10 a', 'st burn 2; st root 1'),
    N('Labareda Calcinante', 'A queimadura funda o suficiente para estourar.', 'd14/12 a', 'det burn 5'),
    N('Labareda Acumulada', 'Cada labareda acende a próxima: o fogo guardado volta em dobro.', 'd16/13 a', 'stack brasa 5; vs burn 1.4'),
    N('Labareda do Fim dos Tempos', 'A última labareda do mundo, que consome tudo o que já ardeu.', 'd40/20 a', 'st burn 3; burst brasa .3'),
  ],
};

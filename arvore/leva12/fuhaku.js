// Leva 12 (evolução lógica), setor fuhaku. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
import { N } from '../l8.js';
export const ESTENDER = {};
export const ABRIR = {
  // ---------- áreas: Vendaval, Rajada Ampla ----------
  'Vendaval': [
    N('Vendaval Duplo', 'Duas rajadas fortes, uma atrás da outra, varrendo o campo.', 'd8/6 a x2'),
    N('Vendaval Cortante', 'O vento traz poeira e navalha: todos saem arranhados.', 'd10/7 a', 'st bleed 1'),
    N('Vendaval Gélido', 'Um vendaval de altitude, que traz o frio do pico e gruda nas roupas.', 'd12/7 a', 'st frozen 1 40%'),
    N('Vendaval de Brasas', 'Com um aliado de Kagutsuchi, o vendaval carrega brasa e chamusca todos.', 'd14/8 a', 'st burn 1 60%', { v2: 'kagutsuchi' }),
    N('Vendaval Acumulado', 'Cada rajada deixa o ar mais denso para a próxima.', 'd12/8 a', 'stack vento 5; push 30'),
    N('Vendaval Detonador', 'Todo o vento guardado estoura de uma vez sobre o campo.', 'd16/10 a', 'burst vento 0.3; push 50'),
    N('Vendaval Que Derruba', 'O vendaval é forte o bastante para tirar todos do chão.', 'd17/10 a', 'st down 1 50%; push 55'),
    N('Vendaval Que Rasga a Guarda', 'O vento bate em todas as defesas até elas cederem.', 'd19/11 a', 'brk 1; push 60'),
    N('Vendaval do Fim do Céu', 'O vendaval de uma tormenta inteira, que varre o campo sem deixar ninguém de pé.', 'd24/13 a', 'pierce 100; push 80; st down 1'),
  ],
  'Rajada Ampla': [
    N('Rajada Ampla Dupla', 'A rajada larga vai e volta, empurrando todos duas vezes.', 'd10/7 a x2', 'push 20'),
    N('Rajada Ampla Cortante', 'A rajada leva lâminas finas e deixa talhos em quem empurra.', 'd12/8 a', 'st bleed 2; push 30'),
    N('Rajada Ampla Gélida', 'Uma rajada de ar frio de altitude, que enrijece quem ela toca.', 'd13/8 a', 'st frozen 1 50%; push 40'),
    N('Rajada Ampla Acumulada', 'Cada rajada larga carrega a seguinte com mais ar.', 'd13/9 a', 'stack vento 5; push 40'),
    N('Rajada Ampla Detonadora', 'O ar guardado se abre num só golpe que lança todos para longe.', 'd18/11 a', 'burst vento 0.3; push 70'),
    N('Rajada Ampla Que Derruba', 'A rajada larga passa por baixo e tira todos do chão.', 'd19/11 a', 'st down 1 55%; push 70'),
    N('Rajada Que Varre o Campo', 'Uma rajada do tamanho do campo, que nada segura.', 'd24/13 a', 'pierce 100; push 80'),
  ],
  // ---------- projéteis: Bala de Vento, Lança de Ar, Dedo de Vento ----------
  'Bala de Vento': [
    N('Bala de Vento Dupla', 'Duas balas de ar disparadas quase juntas.', 'd7/5 x2'),
    N('Bala de Vento Perfurante', 'A bala sai tão apertada que atravessa a armadura.', 'd11/6', 'pierce 60'),
    N('Bala de Vento Gélida', 'A bala viaja pelo ar frio das alturas e gruda no alvo.', 'd12/7', 'st frozen 1 45%'),
    N('Bala de Vento Elétrica', 'Com um aliado de Indra, a bala chia de carga e trava o alvo.', 'd14/8', 'st para 1 40%', { v2: 'indra' }),
    N('Bala de Vento Acumulada', 'Cada bala deixa o cano cheio de ar para a próxima.', 'd13/8', 'stack vento 5; pierce 40'),
    N('Bala de Vento Detonadora', 'O ar guardado sai numa única bala enorme.', 'd18/10', 'burst vento 0.3; pierce 60'),
    N('Bala de Vento Que Rasga o Céu', 'Uma só bala tão rápida que a nuvem atrás dela se parte.', 'd24/13', 'sure; pierce 100; push 60'),
  ],
  'Lança de Ar': [
    N('Lança de Ar Dupla', 'Duas lanças de ar, uma em cada mão.', 'd8/5 x2'),
    N('Lança de Ar Longa', 'A lança se alonga e atinge quem estava atrás do alvo.', 'd11/6', 'chain 1 0.7'),
    N('Lança de Ar Gélida', 'A ponta traz o frio do alto e deixa o alvo duro.', 'd12/7', 'st frozen 1 45%; push 20'),
    N('Lança de Ar Acumulada', 'Cada estocada deixa o ar mais denso e a ponta mais firme.', 'd13/8', 'stack vento 5; pierce 50'),
    N('Lança de Ar em Leque', 'Várias lanças de ar saem de uma só, abertas sobre a linha inimiga.', 'd14/9 a', 'pierce 60'),
    N('Lança de Ar Que Prende', 'A lança atravessa e fixa o alvo no lugar, preso pelo ar.', 'd15/9', 'st root 1 70%; pierce 60'),
    N('Lança de Ar Detonadora', 'O ar guardado sai pela ponta numa única estocada devastadora.', 'd20/11', 'burst vento 0.3; pierce 90'),
    N('Lança do Tufão Aberto', 'A lança gira como um tufão e abre um buraco na guarda.', 'd19/10', 'pierce 100; brk 1'),
  ],
  'Dedo de Vento': [
    N('Dedo de Vento Duplo', 'Dois disparos de ar na ponta de dois dedos.', 'd6/4 x2', 'pierce 30'),
    N('Dedo de Vento Certeiro', 'O ar encontra o alvo, esteja ele onde estiver.', 'd9/5', 'sure'),
    N('Dedo de Vento Perfurante', 'O disparo é fino como agulha e fura qualquer defesa.', 'd11/6', 'pierce 80'),
    N('Dedo de Vento Acumulado', 'Cada disparo deixa o dedo mais carregado.', 'd12/7', 'stack vento 5; pierce 50'),
    N('Dedo de Vento Gélido', 'O disparo vem do ar rarefeito do pico e congela onde bate.', 'd13/7', 'st frozen 1 45%; pierce 50'),
    N('Dedo de Vento em Leque', 'Cinco dedos, cinco disparos, abertos sobre os inimigos.', 'd14/9 a', 'pierce 40'),
    N('Dedo de Vento Detonador', 'Todo o ar guardado sai num só estampido seco.', 'd17/9', 'burst vento 0.3; pierce 70'),
    N('Dedo Que Fura o Céu', 'Um disparo único que abre um buraco nas nuvens e no alvo.', 'd23/12', 'sure; pierce 100'),
  ],
  // ---------- golpes de punho: Punho de Vendaval, Lufada ----------
  'Punho de Vendaval': [
    N('Punho de Vendaval Duplo', 'Dois socos de ar, um para cada lado.', 'd12/7 x2'),
    N('Punho de Vendaval Gélido', 'O soco traz o frio do pico e deixa o alvo duro.', 'd15/8', 'st frozen 1 50%; push 40'),
    N('Punho de Vendaval Acumulado', 'Cada soco deixa os nós dos dedos mais carregados.', 'd16/9', 'stack vento 5; push 40'),
    N('Punho de Vendaval Detonador', 'O vento guardado nos punhos sai num golpe que arremessa o alvo.', 'd22/11', 'burst vento 0.3; push 80'),
  ],
  'Lufada': [
    N('Lufada Dupla', 'Duas lufadas curtas, uma colada na outra.', 'd5/3 x2', 'push 15'),
    N('Lufada em Leque', 'A lufada se abre e empurra todos os inimigos.', 'd7/5 a', 'push 25'),
    N('Lufada Gélida', 'Uma lufada de ar frio, que arrepia e atrasa o alvo.', 'd9/5', 'st frozen 1 35%; push 20'),
    N('Lufada Acumulada', 'Cada lufada prende um pouco de ar para a seguinte.', 'd10/6', 'stack vento 5; push 30'),
    N('Lufada Que Derruba', 'A lufada vem forte o bastante para tirar o alvo do chão.', 'd12/7', 'st down 1 50%; push 50'),
    N('Lufada Cortante', 'A lufada traz fios de ar tão finos que abrem talhos rasos.', 'd11/6', 'st bleed 2; push 30'),
    N('Lufada Que Prende', 'A lufada se enrola nas pernas do alvo e não solta.', 'd12/7', 'st root 1 60%; push 20'),
    N('Lufada Detonadora', 'Todo o ar guardado sai num único sopro enorme.', 'd16/9', 'burst vento 0.3; push 60'),
    N('Lufada do Furacão', 'A lufada de um furacão inteiro, que arrasta todos para longe.', 'd22/12 a', 'push 80; st down 1 60%'),
  ],
  // ---------- marca e defesa: Marca do Vento, Escudo de Ar ----------
  'Marca do Vento': [
    N('Marca do Vento Dupla', 'Duas espirais no mesmo alvo, uma dentro da outra.', 'd8/5 x2', 'brand 2'),
    N('Marca do Vento em Leque', 'Espirais marcam todos os inimigos de uma só vez.', 'd9/6 a', 'brand 2'),
    N('Marca do Vento Funda', 'A espiral aprofunda e a marca dura até o fim da luta.', 'd10/6', 'brand 3'),
    N('Marca Que Sangra', 'A espiral corta devagar e a ferida não para de abrir.', 'd10/6', 'brand 2; st bleed 2'),
    N('Marca do Vento Acumulada', 'Cada marca guarda ar para a seguinte.', 'd12/7', 'brand 2; stack vento 5'),
    N('Marca do Vento Gélida', 'Uma espiral de ar frio de altitude que enrijece a marca.', 'd13/7', 'brand 2; st frozen 1 40%'),
    N('Marca do Vento Caçadora', 'Toda presa marcada leva o corte da tormenta.', 'd15/8', 'pop 1.6; st bleed 2'),
    N('Marca do Vento Detonadora', 'O ar guardado nas marcas estoura em quem está marcado.', 'd16/9', 'burst vento 0.3; pop 1.5'),
    N('Marca do Fim do Céu', 'Todas as marcas se acendem juntas e o vento cai de uma vez.', 'd22/12 a', 'brand 2; pop 2.2'),
  ],
  'Escudo de Ar': [
    N('Escudo de Ar Duplo', 'Duas camadas de ar endurecido na frente do aliado.', 'u/4', 'shield 14'),
    N('Escudo de Ar em Área', 'O ar endurece na frente de todo o grupo.', 'u/6 a', 'shield 10'),
    N('Escudo de Ar Veloz', 'O escudo também empurra o aliado para a frente na fila.', 'u/5', 'shield 10; haste 30'),
    N('Escudo de Ar Que Devolve', 'Quem bate no escudo leva a pancada de volta.', 'u/6', 'shield 12; st counter 1'),
    N('Escudo de Ar Acumulado', 'Cada golpe amortecido deixa o escudo mais denso.', 'u/7', 'shield 14; stack vento 5'),
    N('Escudo de Ar Revigorante', 'O ar que cerca o aliado também faz bem ao fôlego.', 'u/8', 'shield 14; st regen 2'),
    N('Escudo de Ar Esquivo', 'O escudo gira e o golpe escorrega para o lado.', 'u/8', 'shield 14; st evade 1'),
    N('Escudo de Ar Que Cobre o Grupo', 'Uma cúpula de ar segura o grupo inteiro por um instante.', 'u/10 a', 'shield 20; st evade 1'),
    N('Escudo do Furacão', 'No olho do furacão, nenhum golpe chega ao aliado.', 'u/11 a', 'shield 28; st evade 2; st counter 1'),
  ],
};

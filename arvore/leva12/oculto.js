// Leva 12 (evolução lógica), setor oculto. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
// Ocultismo é neutro: só medo, pavor, maldição e status físicos (sangramento, atordoar, raiz, armadura/ataque caindo).
import { N } from '../l8.js';
export const ESTENDER = {};
export const ABRIR = {
  'Ritual: Descarga Espiritual': [
    N('Descarga Espiritual Dupla', 'Dois arcos do além, um logo atrás do outro.', 'd10/8 x2', 'st fear 1'),
    N('Descarga Que Salta', 'O arco pula de alma em alma.', 'd14/10', 'chain 2 0.7; st fear 1'),
    N('Descarga Detonadora', 'O arco guarda tudo e solta de uma vez.', 'd20/12', 'st fear 2; st stun 1 40%'),
    N('Descarga Em Enxame', 'Arcos para todos os lados da sala.', 'd16/13 a', 'st fear 1 60%; chain 1 0.6'),
    N('Descarga Espiritual Suprema', 'O além inteiro descarrega num só golpe.', 'd26/14', 'st fear 3; st stun 1 60%'),
  ],
  'Ritual: Marca da Morte': [
    N('Marca da Morte Dupla', 'A marca é feita duas vezes, no mesmo lugar.', 'd14/10', 'seal 50 3; st dread 2; st curse 1'),
    N('Marca Que Se Alastra', 'A marca aparece em todos os que estão por perto.', 'd14/13 a', 'st dread 1; st curse 2'),
    N('Marca da Morte Detonadora', 'A marca se rompe e leva junto o que ainda restava.', 'd24/13', 'vs curse 1.6; st dread 2'),
    N('Marca da Morte Suprema', 'Quem foi marcado já estava morto, só faltava saber.', 'd32/15', 'seal 70 3; vs dread 1.6; st curse 3'),
  ],
  'Ritual: Mãos da Cova': [
    N('Mãos da Cova Duplas', 'Duas mãos de terra velha seguram e puxam.', 'd12/12 x2', 'st root 1'),
    N('Mãos Que Arrastam', 'As mãos arrastam o alvo para baixo e o derrubam.', 'd16/12', 'st root 2; st down 1 50%'),
    N('Mãos da Cova Detonadoras', 'A cova se fecha de uma vez com o que estava dentro.', 'd24/14', 'st root 2; st defDn 2'),
    N('Mãos da Cova Supremas', 'Uma cova inteira abre debaixo de todos.', 'd28/16 a', 'st root 3; st defDn 2; st curse 1'),
  ],
  'Ritual: Grande Exorcismo': [
    N('Grande Exorcismo Duplo', 'As palavras são ditas duas vezes, e a segunda dói mais.', 'd12/13 x2', 'st fear 1'),
    N('Exorcismo Que Arranca', 'A coisa é puxada para fora e o corpo larga o que a segurava.', 'd18/13', 'strip; st fear 2'),
    N('Exorcismo Detonador', 'A palavra final racha tudo o que estava preso ali.', 'd26/15', 'strip; st defDn 2; st stun 1 50%'),
    N('Grande Exorcismo Supremo', 'Nenhuma presença fica em pé depois da última oração.', 'd30/17 a', 'strip; st fear 3; st stun 1 55%'),
  ],
  'Ritual: Banimento': [
    N('Banimento Duplo', 'A porta é fechada duas vezes, para garantir.', 'd16/12 x2', 'strip; push 40'),
    N('Banimento Detonador', 'O que foi banido sai em pedaços.', 'd26/14', 'strip; push 80; st stun 1 70%'),
    N('Banimento Supremo', 'O além não aceita mais nem o nome do banido.', 'd34/16', 'strip; push 100; st stun 2 70%; st curse 2'),
  ],
  'Ritual: Estrela Caída': [
    N('Estrela Caída Dupla', 'Duas estrelas rasgam o céu do ritual.', 'd18/12 x2', 'st curse 2'),
    N('Estrela Caída Detonadora', 'A estrela bate e o chão ao redor vira cratera.', 'd28/14 a', 'st curse 2; brk 1'),
    N('Estrela Caída Suprema', 'O céu inteiro cai em cima de quem ousou olhar para cima.', 'd36/16', 'st curse 3; brk 2'),
  ],
  'Martelo de Bruxa': [
    N('Martelo de Bruxa Duplo', 'Uma martelada na cabeça, outra na maldição.', 'd18/11 x2', 'st curse 1'),
    N('Martelo Detonador', 'O martelo quebra o que a maldição ainda segurava de pé.', 'd26/13', 'vs curse 1.5; st defDn 2'),
    N('Martelo de Bruxa Supremo', 'A última martelada sela o caso.', 'd34/15', 'vs curse 1.9; brk 1; st stun 1 50%'),
  ],
  'Ritual: Paredes que Gritam': [
    N('Paredes Que Gritam Alto', 'O grito vem de todos os lados ao mesmo tempo.', 'd16/14 a', 'st fear 2 70%'),
    N('Paredes Que Sufocam', 'As paredes se fecham e o grito vira silêncio.', 'd22/15 a', 'st fear 2; st agiDn 2'),
    N('Paredes Que Desabam', 'O grito trinca a pedra e o teto cai.', 'd30/17 a', 'st fear 3 60%; st stun 1 50%'),
  ],
  'Visão do Abismo': [
    N('Visão do Abismo Longa', 'O alvo olha tempo demais e não consegue parar.', 'm18/14', 'st fear 2; st dread 1'),
    N('Visão do Abismo Coletiva', 'Todos veem a mesma coisa lá embaixo.', 'm20/16 a', 'st fear 2 70%; st dread 1'),
    N('Abismo Que Devolve o Olhar', 'Algo olha de volta, e todos sentem.', 'm30/18 a', 'st dread 3; vs fear 1.6'),
  ],
  'Ritual: Grito do Outro Lado': [
    N('Grito do Outro Lado Duplo', 'Duas vozes gritam com a mesma boca.', 'd20/17 a x2', 'st fear 2; st dread 1'),
    N('Grito Final do Outro Lado', 'O grito que ninguém consegue ouvir e continuar o mesmo.', 'd32/19 a', 'st fear 3; st dread 3'),
  ],
  'Ritual: Apodrecer': [
    N('Ritual: Apodrecer Duplo', 'A carne apodrece duas vezes, a segunda por dentro.', 'd14/10 x2', 'det dot 4; st exposed 1'),
    N('Ritual: Apodrecer em Roda', 'O mofo pula para quem estiver perto.', 'd18/12 a', 'st exposed 2; st curse 1'),
    N('Ritual: Apodrecer Por Dentro', 'O que ainda era firme cede de uma vez.', 'd24/12', 'det dot 8; st defDn 2'),
    N('Ritual: Apodrecer Detonador', 'Tudo o que já apodrecia estoura de uma vez.', 'd30/14', 'det dot 12; st exposed 2'),
    N('Ritual: Apodrecer Supremo', 'Nada fica inteiro, nem o que parecia são.', 'd36/16 a', 'det dot 14; st exposed 3; st defDn 2'),
  ],
  'Ritual: Espelho Negro': [
    N('Espelho Negro Duplo', 'Dois espelhos, e o alvo não sabe qual deles é ele.', 'd10/8 x2', 'st confuse 1 40%; st dread 1'),
    N('Espelho Negro Que Devolve', 'O reflexo bate de volta com a cara do alvo.', 'd18/11', 'st confuse 2 50%; vs dread 1.4'),
    N('Espelho Negro Supremo', 'Quem olha não volta a saber quem era.', 'd26/14 a', 'st confuse 2; st dread 2; st curse 1'),
  ],
  'Ritual: Reanimar': [
    N('Reanimar Sem Dor', 'O corpo se levanta e quase não lembra de ter caído.', 'h10/8', 'revive 60; st dread 1'),
    N('Reanimar Supremo', 'Quem caiu volta firme, e com o outro lado agarrado nas costas.', 'h14/12', 'revive 80; st dread 1; st endure 2'),
  ],
  'Ritual: Cicatrização': [
    N('Cicatrização Rápida', 'A ferida fecha antes de doer.', 'h10/4', 'cleanse'),
    N('Cicatrização em Grupo', 'Os cortes de todos se fecham juntos.', 'h12/10 a', 'cleanse; st regen 1'),
    N('Cicatrização Suprema', 'A carne se refaz e esquece onde foi aberta.', 'h18/14 a', 'cleanse; st regen 2; st endure 1'),
  ],
  'Ritual: Paranoia': [
    N('Paranoia Funda', 'O alvo vê alguém em cada canto, inclusive onde não tem.', 'm18/10', 'st dread 3; st confuse 1 40%'),
    N('Paranoia Suprema', 'A sala inteira passa a desconfiar da sala.', 'm28/14 a', 'st dread 3; st confuse 2 60%; vs dread 1.5'),
  ],
  'Ritual: Âncora Temporal': [
    N('Âncora Temporal Suprema', 'O instante é preso com um prego, e todos se movem dentro dele.', 'u/12 s', 'haste 90; st endure 3; st focus 2'),
  ],
  'Ritual: Fechar o Portal': [
    N('Fechar Todos os Portais', 'Cada fresta do além é lacrada ao mesmo tempo.', 'd40/20 a', 'strip; st stun 2 60%; vs possess 1.8'),
  ],
  'Ritual: Inverter a Sorte': [
    N('Inverter a Sorte Suprema', 'O azar muda de dono e o dono nem percebe.', 'd16/10', 'steal; st marked 3; st exposed 2'),
  ],
  'Ritual: Encarnar o Medo': [
    N('Encarnar o Medo Supremo', 'O ritualista vira aquilo de que todos fugiam.', 'f/12', 'dur 4; atk 40; def 30; dr san 3; end lose san 12', { a: 'INT', fx: 'st dread 3 foes' }),
  ],
  'Ritual: Possessão Voluntária': [
    N('Possessão Voluntária Suprema', 'A entidade dirige com as duas mãos e não quer devolver o volante.', 'f/12', 'dur 4; atk 80; hit 25; dr san 3; end st dread 3', { a: 'CAR' }),
  ],
  'Ritual: Envelhecer': [
    N('Envelhecer Até o Pó', 'O tempo cobra tudo de uma vez, com juros.', 'd34/18', 'st defDn 3; st agiDn 3; exec 35 1.7'),
  ],
  'Ritual: Sigilo Vivo': [
    N('Sigilo Vivo Supremo', 'O selo ganha vontade própria e escolhe onde ficar.', 'd44/18', 'seal 70 3; st stun 1 50%'),
  ],
  'Ritual: Barganha': [
    N('Barganha Dupla', 'Uma troca, e logo outra, antes que o outro lado conte.', 'u/0 s', 'gain aura 22', { pay: { san: 6 } }),
    N('Barganha Que Devolve', 'O que foi cobrado volta em parte, de má vontade.', 'u/0 s', 'gain aura 24; res san 4', { pay: { san: 6 } }),
    N('Barganha Fria', 'Sem rezar, sem tremer: só o preço e o troco.', 'u/0 s', 'gain aura 30; st focus 2', { pay: { san: 7 } }),
    N('Barganha com Quem Escuta', 'Alguém do outro lado resolve entrar na negociação.', 'u/0 s', 'gain aura 36; st atkUp 2', { pay: { san: 8 } }),
    N('Barganha de Carne', 'O que se oferece agora é o corpo, e o corpo aguenta mais.', 'u/0 s', 'gain aura 42; st endure 2', { pay: { hp: 6 } }),
    N('Barganha Sem Recibo', 'Nenhuma cláusula escrita, e é por isso que rende tanto.', 'u/0 s', 'gain aura 48; st atkUp 2; st focus 2', { pay: { san: 9 } }),
    N('Barganha de Corpo Emprestado', 'O preço é deixar alguém usar o corpo por um tempo.', 'u/0 s', 'gain aura 54; haste 70; st endure 2', { pay: { san: 10 } }),
    N('Barganha Suprema', 'O ritualista não paga mais: quem cobra é que fica devendo.', 'u/0 s', 'gain aura 62; st atkUp 3; st endure 2; haste 80', { pay: { san: 12 } }),
  ],
  'Ritual: Mau-Olhado': [
    N('Mau-Olhado Duplo', 'Um olhar, e logo outro, mais comprido.', 'd8/5 x2', 'st curse 2'),
    N('Mau-Olhado Que Pega', 'O olhar gruda e o alvo erra o golpe seguinte.', 'd10/6', 'st curse 3; st atkDn 1'),
    N('Mau-Olhado em Roda', 'O olhar passeia por todos, sem escolher.', 'd10/8 a', 'st curse 2'),
    N('Mau-Olhado Fundo', 'O olhar vai até o osso e fica por lá.', 'd14/9', 'st curse 3; vs curse 1.4'),
    N('Mau-Olhado Que Fica', 'Dias depois ainda arde, e o alvo trava.', 'd16/10', 'st curse 4; st agiDn 2'),
    N('Mau-Olhado Detonador', 'A maldição acumulada vira um golpe só.', 'd24/12', 'vs curse 1.8; st atkDn 2'),
    N('Mau-Olhado Supremo', 'Um olhar que decide o fim de quem o recebe.', 'd32/15 a', 'st curse 4; vs curse 1.9; st defDn 2'),
  ],
  'Ritual: Maldição Contagiosa': [
    N('Maldição Contagiosa Dupla', 'A praga pega duas vezes no mesmo corpo.', 'd8/8 a x2', 'st curse 2'),
    N('Maldição Que Atravessa', 'A praga passa de um para outro sem tocar.', 'd12/9 a', 'st curse 3; spread curse'),
    N('Maldição Febril', 'A praga esquenta o alvo por dentro e o deixa lento.', 'd14/10 a', 'st curse 3; st agiDn 2'),
    N('Maldição Contagiosa Detonadora', 'Todos os infectados rompem juntos.', 'd22/13 a', 'vs curse 1.6; st atkDn 2'),
    N('Maldição Sem Cura', 'Ninguém na sala sai são.', 'd24/14 a', 'st curse 4; spread curse; st defDn 2'),
    N('Maldição Contagiosa Suprema', 'A praga toma o campo e não tem mais dono.', 'd32/16 a', 'st curse 4; vs curse 1.8; st exposed 2'),
  ],
  'Ritual: Desespero': [
    N('Desespero Duplo', 'Duas ondas de desespero, uma sobre a outra.', 'm10/9 x2', 'st dread 1'),
    N('Desespero Que Cresce', 'Cada turno parece mais fundo que o anterior.', 'm14/8', 'vs dread 1.6; lose aura 10'),
    N('Desespero Coletivo', 'A sala inteira desiste ao mesmo tempo.', 'm14/11 a', 'st dread 2; lose aura 8'),
    N('Desespero Sem Saída', 'O alvo procura uma porta e não vê nenhuma.', 'm22/12', 'vs dread 1.8; st root 1'),
    N('Desespero Detonador', 'O medo acumulado explode no peito do alvo.', 'm28/14', 'vs dread 2; lose aura 14; st stun 1 40%'),
    N('Desespero Supremo', 'O fim de toda esperança, dito em voz baixa.', 'm34/16 a', 'vs dread 2; lose aura 18; st fear 2'),
  ],
  'Ritual: Chão Rachado': [
    N('Chão Rachado Duplo', 'O chão racha, e depois racha de novo.', 'd8/9 a x2', 'st down 1 70%'),
    N('Chão Rachado Fundo', 'A fenda desce além do que o olho alcança.', 'd14/10 a', 'st down 1; st agiDn 1'),
    N('Chão Que Prende', 'Quem cai na fenda não consegue sair.', 'd18/12 a', 'st down 1; st root 2'),
    N('Chão Rachado Detonador', 'A fenda se fecha de uma vez com tudo dentro.', 'd26/14 a', 'st down 1; st defDn 2'),
    N('Chão Rachado Supremo', 'O mundo se parte ao meio debaixo dos pés de todos.', 'd34/16 a', 'st down 2; st root 2; st defDn 2'),
  ],
  'Ritual: Lodo da Morte': [
    N('Lodo da Morte Espesso', 'O lodo sobe até os joelhos.', 'u/10 a', 'st root 2; st agiDn 3'),
    N('Lodo Que Puxa', 'O lodo arrasta quem tentar fugir.', 'u/12 a', 'st root 3; st agiDn 3'),
    N('Lodo Que Corrói', 'O lodo morde a armadura.', 'd14/12 a', 'st root 2; st defDn 2'),
    N('Lodo da Morte Detonador', 'O lodo estala e arrebenta o que segurava.', 'd24/14 a', 'st root 2; st defDn 3; st stun 1 40%'),
    N('Lodo da Morte Supremo', 'Ninguém sai do lodo da morte do mesmo jeito que entrou.', 'd32/16 a', 'st root 3; st agiDn 3; st defDn 3'),
  ],
  'Ritual: Sete Selos': [
    N('Sete Selos Duplos', 'Os selos se partem em pares.', 'd14/10 x2', 'seal 40 2; st fear 1'),
    N('Selos Que Prendem', 'Cada selo prende um pedaço do alvo.', 'd20/12', 'seal 60 3; st root 1'),
    N('Selos Detonadores', 'O último selo se parte e leva o resto.', 'd28/14', 'seal 80 3; st fear 2; st stun 1 50%'),
    N('Sete Selos Supremos', 'Todos abertos, e nada lá fora aguenta.', 'd38/17 a', 'seal 100 3; st fear 3; st curse 2'),
  ],
  'Ritual: Corrente Maldita': [
    N('Corrente Maldita Dupla', 'Duas voltas de corrente, uma em cada pulso.', 'd10/9 x2', 'st curse 2; st root 1'),
    N('Corrente Que Arrasta', 'A corrente puxa o alvo ao chão.', 'd16/11', 'st curse 3; st root 2; st down 1 40%'),
    N('Corrente Maldita Detonadora', 'Os elos explodem um a um.', 'd26/13', 'vs curse 1.6; st root 2'),
    N('Corrente Maldita Suprema', 'Uma corrente sem fim que prende tudo o que vive.', 'd34/16 a', 'st curse 4; st root 3; st defDn 2'),
  ],
  'Ritual: Hora Final': [
    N('Hora Final Dupla', 'O relógio bate duas vezes no mesmo instante.', 'd30/14 x2', 'exec 35 1.5; push 30'),
    N('Hora Final Detonadora', 'Ninguém consegue evitar o que a hora pede.', 'd46/16', 'exec 35 2; st agiDn 2'),
    N('Hora Final Suprema', 'O último sino, e já era.', 'd58/18', 'exec 40 2.2; push 60; st stun 1 60%'),
  ],
  'Ritual: Contrafeitiço': [
    N('Contrafeitiço Duplo', 'O feitiço é desfeito e o refluxo bate de volta.', 'd16/10 x2', 'strip; st silence 1'),
    N('Contrafeitiço Que Reflete', 'O alvo recebe de volta o que lançou.', 'd24/12', 'strip; st silence 2; st dread 1'),
    N('Contrafeitiço Supremo', 'Nenhum rito nesta sala se completa mais.', 'd32/15 a', 'strip; st silence 2; st stun 1 50%'),
  ],
  'Nó de Maldição': [
    N('Nó de Maldição Duplo', 'Um nó apertado sobre outro nó.', 'u/10 a', 'st curse 3; st exposed 2'),
    N('Nó de Maldição Supremo', 'Um nó que ninguém desata, nem quem o deu.', 'u/12 a', 'st curse 4; st exposed 3; st atkDn 2'),
  ],
};

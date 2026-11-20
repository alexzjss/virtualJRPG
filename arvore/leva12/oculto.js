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
};

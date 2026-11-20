// Leva 12 (evolução lógica), setor tsukuyomi. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
// As linhas existentes do setor (Sussurro, Voz, Eco, Loucura, Lâmina de Sombra, Mundo, Cão-de-Caça) já cobrem todas as camadas; aqui
// abrimos as bases ofensivas centrais que ficaram sem variação: Pesadelo, Eclipse, Lâmina Lunar, Lança de Sombra, Canção de Ninar,
// Terror Absoluto, Sono Profundo, Hipnose Lunar, Lua Negra e Marca da Noite (Dupla -> Detonador -> Supremo, com combinações v2).
import { N } from '../l8.js';
export const ESTENDER = {};
export const ABRIR = {
  'Pesadelo': [
    N('Pesadelo Duplo', 'Dois pesadelos, um em cima do outro.', 'm9/6 x2'),
    N('Pesadelo Que Assusta', 'O sonho ruim acorda com medo no peito.', 'm10/6', 'st fear 1 40%'),
    N('Pesadelo Recorrente', 'O mesmo sonho volta, e cada volta pesa mais.', 'm10/7', 'stack sombra 5; st fear 1'),
    N('Pesadelo Febril', 'O sonho vem com febre e suor frio.', 'm11/8', 'st poison 2 40%', { v2: 'hiruko' }),
    N('Pesadelo Congelante', 'Um sonho em que o chão vira lago parado e o corpo não responde.', 'm12/8', 'st frozen 1 40%', { v2: 'susanoo' }),
    N('Pesadelo Que Persegue', 'Ele acorda, e o sonho continua ali no canto do quarto.', 'm11/8', 'vs fear 1.3; st fear 1'),
    N('Pesadelo Que Contagia', 'O sonho ruim passa de cabeça em cabeça.', 'm12/11 a', 'st fear 1 35%'),
    N('Pesadelo Detonador', 'Todo o medo guardado acorda de uma vez.', 'm16/11', 'burst sombra .4; det fear 6'),
    N('Pesadelo Supremo', 'O pesadelo mais fundo, do qual ninguém lembra de acordar.', 'm34/16 a', 'st fear 3; st sleep 1 40%'),
  ],
  'Eclipse': [
    N('Meio Eclipse', 'A lua cobre só metade do céu.', 'm8/5 a'),
    N('Eclipse Duplo', 'Duas sombras cobrem o campo, uma depois da outra.', 'm9/7 a'),
    N('Eclipse Que Cega', 'A sombra cai tão rápido que os olhos não se ajustam.', 'm10/8 a', 'st blind 1 40%'),
    N('Eclipse Longo', 'A noite fica mais tempo do que devia.', 'm11/9 a', 'st atkDn 1; st fear 1 30%'),
    N('Eclipse Faminto', 'A sombra come as forças de quem estiver nela.', 'm12/10 a', 'st defDn 1', { v2: 'hiruko' }),
    N('Eclipse Que Confunde', 'No escuro, ninguém sabe quem é quem.', 'm12/10 a', 'st confuse 1 35%'),
    N('Eclipse Que Cobra', 'A sombra cobra o medo de quem já estava com medo.', 'm14/11 a', 'vs fear 1.4; st fear 1'),
    N('Eclipse Detonador', 'A escuridão acumulada se fecha sobre todos.', 'm16/12 a', 'burst sombra .4; det fear 6'),
    N('Eclipse Supremo', 'O disco da lua tapa o mundo inteiro.', 'm38/18 a', 'st blind 2; st fear 2'),
  ],
  'Lâmina Lunar': [
    N('Lâmina Lunar Rápida', 'Um corte curto, antes que o alvo veja a lua.', 'd7/4 t60'),
    N('Lâmina Lunar Dupla', 'Dois cortes em meia-lua, um de cada lado.', 'd8/6 x2'),
    N('Lâmina Lunar Cega', 'O corte vem por trás do reflexo e confunde a mira.', 'd9/6', 'st blind 1 30%'),
    N('Lâmina Lunar Rubra', 'A meia-lua sai tingida e rouba um pouco de vida.', 'd11/8', 'st bleed 2 40%; drain hp 20', { v2: 'shukketsu' }),
    N('Lâmina Lunar Crescente', 'O arco cresce a cada golpe seguido.', 'd12/8', 'stack sombra 5'),
    N('Lâmina Lunar Tripla', 'Três arcos de lua em sequência.', 'd8/9 x3'),
    N('Lâmina Lunar Que Assusta', 'O brilho da lâmina faz o alvo recuar.', 'd13/9', 'st fear 1 40%'),
    N('Lâmina Lunar Detonadora', 'As marcas de sombra no corpo se abrem de uma vez.', 'd18/11', 'burst sombra .4; det fear 6'),
    N('Lâmina Lunar Suprema', 'Um único arco de noite inteira, de ponta a ponta.', 'd42/17', 'pierce 60; st fear 2'),
  ],
  'Lança de Sombra': [
    N('Lanças de Sombra', 'Três lanças de breu, de uma só vez.', 'd8/8 x3'),
    N('Lança de Sombra Cega', 'A lança vem sem som e sem vulto.', 'd12/7', 'st blind 1 30%'),
    N('Lança de Sombra Que Prende', 'A ponta crava no chão e pega o pé do alvo.', 'd12/8', 'st root 1 45%'),
    N('Lança de Sombra Eletrizada', 'A lança leva um estalo que trava os músculos.', 'd13/9', 'st para 1 35%', { v2: 'indra' }),
    N('Lança de Sombra Que Assusta', 'A lança para a um palmo do rosto, e o susto fica.', 'd14/9', 'st fear 1 40%'),
    N('Lança de Sombra Detonadora', 'A sombra cravada no alvo explode para dentro.', 'd18/11', 'burst sombra .4; det fear 6'),
    N('Lança de Sombra Suprema', 'A lança que atravessa a noite e o que estiver nela.', 'd40/16', 'pierce 70; st fear 2'),
  ],
  'Canção de Ninar': [
    N('Canção de Ninar Dupla', 'Dois versos, dois bocejos.', 'm9/6', 'st sleep 1 35%'),
    N('Ninar em Coro', 'A canção se espalha pelo campo.', 'm10/9 a', 'st sleep 1 25%'),
    N('Ninar Profundo', 'A melodia desce até o fundo do sono.', 'm12/9', 'st sleep 1 55%'),
    N('Ninar de Mãos Pesadas', 'A cantiga vem com peso nos braços e cansaço no corpo.', 'm12/9', 'st sleep 1 40%; st atkDn 1', { v2: 'atlas' }),
    N('Canção de Ninar Que Assusta', 'A cantiga muda de tom e o sono vira pavor.', 'm12/9', 'st fear 1 40%; st sleep 1 25%'),
    N('Ninar Que Acumula', 'Cada verso empilha mais sono.', 'm13/10', 'stack sombra 5; st sleep 1'),
    N('Ninar Detonador', 'O sono acumulado desaba no mesmo instante.', 'm17/12', 'burst sombra .4; det sleep 6'),
    N('Ninar Supremo', 'A última cantiga, que ninguém consegue acabar de ouvir.', 'm32/16 a', 'st sleep 2 60%'),
  ],
  'Terror Absoluto': [
    N('Terror Duplo', 'O medo bate duas vezes na mesma porta.', 'm10/7 x2', 'st fear 1 30%'),
    N('Terror Que Acumula', 'Cada susto vira degrau para o próximo.', 'm12/8', 'stack sombra 5; st fear 1'),
    N('Terror Coletivo', 'O pânico passa de um para todos.', 'm14/12 a', 'st fear 2 40%'),
    N('Terror Detonador', 'O pavor guardado vem à tona de uma só vez.', 'm20/12', 'burst sombra .4; det fear 6'),
    N('Terror Supremo', 'O medo que não tem nome, em tudo ao mesmo tempo.', 'm36/18 a', 'st fear 3; st atkDn 2'),
    N('Terror Sem Fim', 'Um medo que se alimenta de si mesmo.', 'm40/20 a', 'st dread 3; vs fear 1.6'),
  ],
  'Sono Profundo': [
    N('Sono Pesado', 'O sono vem junto com um peso no corpo todo.', 'm13/9 a', 'st sleep 1 45%; st atkDn 1'),
    N('Sono Que Acumula', 'Cada onda de sono empilha o seguinte.', 'm14/10 a', 'stack sombra 5; st sleep 1'),
    N('Sono de Gelo', 'Um sono tão frio que o corpo congela dormindo.', 'm16/12 a', 'st frozen 1 40%; st sleep 1 30%', { v2: 'susanoo' }),
    N('Sono Detonador', 'Quem dorme acorda de uma vez, com todo o cansaço junto.', 'm22/13 a', 'burst sombra .4; det fear 6'),
    N('Sono Eterno', 'Dormir e nunca ter a sensação de acordar.', 'm44/20 a', 'st sleep 2 65%'),
  ],
  'Hipnose Lunar': [
    N('Hipnose Lunar Dupla', 'O pêndulo da lua balança duas vezes.', 'm14/11 a', 'st sleep 1 30%'),
    N('Hipnose Lunar Confusa', 'O alvo esquece em quem ele devia bater.', 'm16/12 a', 'st confuse 1 40%'),
    N('Hipnose Lunar Detonadora', 'A ordem cravada na cabeça explode de uma vez.', 'm22/13 a', 'burst sombra .4; det fear 6'),
    N('Hipnose Lunar Suprema', 'O olhar da lua cheia, que ninguém sustenta.', 'm46/20 a', 'st sleep 2 50%; st confuse 2 40%'),
  ],
  'Lua Negra': [
    N('Lua Negra Dupla', 'Duas luas negras no mesmo céu.', 'd18/12', 'det marked 5; st fear 1 40%'),
    N('Lua Negra Detonadora', 'As marcas todas gritam de uma vez.', 'd30/16', 'burst sombra .5; det marked 8'),
  ],
  'Marca da Noite': [
    N('Marca da Noite Dupla', 'Duas marcas, dois alvos na mira.', 'd8/6 x2', 'st marked 1'),
    N('Marca da Noite Cobradora', 'Quem leva a marca paga o dobro por cada golpe.', 'd10/7', 'vs marked 1.4; st marked 1'),
    N('Marca da Noite Rubra', 'A marca sangra e tinge o chão.', 'd11/8', 'st bleed 2 40%; st marked 1', { v2: 'shukketsu' }),
    N('Marca da Noite Veloz', 'A marca sai antes do alvo piscar.', 'd8/5 t60', 'st marked 1'),
    N('Marca da Noite Tripla', 'Três marcas em três pontos do corpo.', 'd8/9 x3', 'st marked 1'),
    N('Marca da Noite Que Cega', 'A marca acende nos olhos e tira a mira.', 'd12/8', 'st blind 1 35%; st marked 1'),
    N('Marca da Noite Que Assusta', 'O alvo sente a marca queimando e não sabe de onde veio.', 'd13/9', 'st fear 1 40%; st marked 1'),
    N('Marca da Noite Detonadora', 'A marca explode quando a noite chega ao fim.', 'd16/10', 'burst sombra .5; det marked 6'),
    N('Marca da Noite Suprema', 'A marca que persegue o alvo até o último golpe.', 'd36/15', 'vs marked 1.8; st fear 2'),
  ],
};

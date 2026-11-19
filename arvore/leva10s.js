// Leva 10: Susanoo (água, maré, chuva, gelo, tempestade).
import { N } from './l8.js';

export const LEVA10S = {
  "Jato d'Água": [
    N('Jatos Encadeados', 'Um jato puxa o próximo, e a água não para de correr.', 'd10/5', 'st wet 2; stack mare 5'),
    N('Jato Perfurante', 'A água sai tão fina e tão forte que fura a armadura.', 'd12/7', 'pierce 60; st wet 1'),
    N('Jato Congelante', 'O jato encontra o alvo molhado e o congela por dentro.', 'd16/9', 'conv wet frozen'),
    N('Jato Pressurizado', 'Toda a maré guardada sai de uma vez, num só jato.', 'd16/10', 'burst mare .4; st wet 2'),
    N('Jato do Dilúvio', 'Um jato do tamanho de um rio, que abre caminho pelo campo.', 'd40/14', 'st wet 3; pierce 70'),
  ],
  "Chicote d'Água": [
    N('Chicote Encharcante', 'O chicote estala e deixa todos encharcados.', 'd10/8 a', 'st wet 2'),
    N('Chicote de Duas Pontas', 'Duas pontas de água, e a segunda cobra o que a primeira molhou.', 'd10/9 x2', 'vs wet 1.4; st wet 1'),
    N('Chicote Que Estala no Gelo', 'O chicote estala no gelo e derruba quem estiver congelado.', 'd18/10', 'vs frozen 1.6; st down 1'),
    N('Chicote da Serpente do Mar', 'Uma serpente de água que cobra mais de quem já está molhado.', 'd30/14', 'st wet 3; vs wet 1.3'),
  ],
  'Maré Alta': [
    N('Maré Que Acumula', 'Cada onda deixa a água mais alta no campo.', 'd10/9 a', 'stack mare 5; st wet 1'),
    N('Maré de Arrasto', 'A água puxa todos pelos tornozelos e os joga para trás.', 'd12/11 a', 'push 40; st wet 2'),
    N('Contramaré', 'A água volta com tudo o que levou, e cobra juros.', 'd14/12 a', 'burst mare .3; st agiDn 2'),
    N('Maré de Sizígia', 'Quando a maré é a maior do ano, ninguém seca.', 'd16/13 a', 'vs wet 1.5; st wet 3'),
    N('Onda Que Cobre o Mundo', 'Uma onda que cobre o horizonte inteiro e afoga o que encontra.', 'd40/20 a', 'st wet 3; per wet 12'),
  ],
  'Garoa Gélida': [
    N('Garoa Persistente', 'Uma garoa fina que não passa e vai acumulando maré.', 'd10/5', 'st wet 2; stack mare 5'),
    N('Garoa Congelante', 'A garoa vira cristal na pele de quem está molhado.', 'd10/9 a', 'st frozen 1 35%'),
    N('Garoa Que Pesa', 'Cada gota de gelo pesa mais que a anterior.', 'd12/10', 'per wet 15; st agiDn 2'),
    N('Nevasca Curta', 'Uma nevasca breve e cortante que cobre o campo.', 'd14/12 a', 'st frozen 1 50%; st wet 2'),
    N('Garoa do Inverno Eterno', 'A garoa do inverno que não acaba e não deixa ninguém se mexer.', 'd38/18 a', 'st frozen 2 60%; vs wet 1.6'),
  ],
};

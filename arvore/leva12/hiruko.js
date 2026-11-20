// Leva 12 (evolução lógica), setor hiruko. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
// Hiruko: doença, veneno, mutação, radiação. Todas as linhas existentes já estão completas; aqui abrem as bases que ficaram sem linha.
import { N } from '../l8.js';
export const ESTENDER = {};
export const ABRIR = {
  'Lança Tóxica': [
    N('Lança Tóxica Dupla', 'Duas lanças, duas feridas pingando.', 'd8/6 x2', 'st poison 1'),
    N('Lança Tóxica Farpada', 'A farpa prende a ponta na carne.', 'd12/6', 'st poison 2; st defDn 1'),
    N('Lança Tóxica Irradiada', 'A ponta brilha em verde e a ferida não fecha.', 'd12/7', 'st rad 2; st poison 1'),
    N('Lança Tóxica Detonadora', 'A ponta racha por dentro e solta o veneno de uma vez.', 'd14/8', 'det poison 6; st poison 2'),
    N('Lança Tóxica Hemorrágica', 'O veneno afina o sangue e a ferida não estanca.', 'd14/8', 'st poison 2; st bleed 3', { v2: 'shukketsu' }),
    N('Lança Tóxica em Rajada', 'Uma rajada de lanças sobre toda a linha.', 'd14/12 a', 'st poison 2'),
    N('Lança Tóxica Suprema', 'A lança inteira é veneno e osso.', 'd18/12', 'st poison 3; pierce 60; st rad 1'),
  ],
  'Dose Letal': [
    N('Dose Letal Dupla', 'Duas doses, para quem resistiu à primeira.', 'd14/10 x2', 'st poison 2'),
    N('Dose Letal Retardada', 'A dose espera dentro do alvo e age de uma vez.', 'd16/10', 'det poison 6; st poison 2'),
    N('Dose Letal em Todos', 'Uma dose para cada inimigo da linha.', 'd14/12 a', 'st poison 3'),
    N('Dose Letal Certeira', 'Calculada ao miligrama: mata o que já está doente.', 'd22/12', 'vs poison 1.7; st poison 3'),
  ],
  'Decaimento': [
    N('Decaimento Duplo', 'O apodrecimento começa por dois lados.', 'd10/8 x2', 'st poison 1'),
    N('Decaimento Acelerado', 'O que levaria anos leva um turno.', 'd16/8', 'det poison 4; st poison 2'),
    N('Decaimento Contagioso', 'O alvo apodrece e passa adiante o que tem.', 'd14/9', 'spread poison; st poison 2'),
    N('Decaimento Radioativo', 'A podridão brilha: a carne decai em dois tempos.', 'd16/9', 'per rad 10; st rad 2'),
    N('Decaimento Total', 'Nada no alvo escapa da podridão.', 'd22/12', 'st poison 3; st defDn 2; vs poison 1.5'),
  ],
  'Soco Corrosivo': [
    N('Soco Corrosivo Duplo', 'Dois socos, duas queimaduras.', 'd8/7 x2', 'st defDn 1'),
    N('Soco Que Derrete a Guarda', 'A luva come o escudo antes do punho chegar.', 'd14/7', 'brk 1; st defDn 2'),
    N('Soco Corrosivo em Cadeia', 'O ácido pula do alvo para o vizinho.', 'd12/9', 'spread poison; st poison 2'),
    N('Soco Irradiado', 'A luva brilha em verde e fura o couro.', 'd14/9', 'st rad 2; pierce 40'),
    N('Soco Corrosivo Gélido', 'O ácido gela ao toque e racha a carne.', 'd16/10', 'st frozen 1 40%; st defDn 2', { v2: 'susanoo' }),
    N('Soco Corrosivo Final', 'Ácido até o osso.', 'd20/11', 'pierce 70; st defDn 3'),
  ],
  'Nuvem Tóxica': [
    N('Nuvem Tóxica Densa', 'A bruma fica tão grossa que não se vê o outro lado.', 'd12/10 a', 'st poison 2; st atkDn 1'),
    N('Nuvem Tóxica Rasteira', 'Rente ao chão, pega as pernas.', 'd12/10 a', 'st poison 2; st down 1 30%'),
    N('Nuvem Tóxica Ardente', 'A bruma pega fogo no meio do campo.', 'd14/12 a', 'st burn 2; st poison 2', { v2: 'kagutsuchi' }),
    N('Nuvem Tóxica Detonadora', 'O veneno plantado estoura de uma vez dentro da bruma.', 'd16/12 a', 'det poison 6; st poison 1'),
    N('Nuvem Tóxica Que Não Passa', 'A bruma se instala e não vai embora.', 'd18/13 a', 'st poison 3; st rad 1'),
  ],
  'Bala Radioativa': [
    N('Bala Radioativa Dupla', 'Duas balas verdes, dois rastros no escuro.', 'd10/10 x2', 'st rad 1'),
    N('Bala Radioativa Cravada', 'A bala fica dentro e continua brilhando.', 'd16/10', 'st rad 3'),
    N('Bala Radioativa Estilhaçada', 'A bala racha dentro do corpo e espalha o brilho.', 'd14/12 a', 'st rad 2; st poison 1'),
    N('Bala do Fim do Átomo', 'A última bala do pente: tudo o que ela tocou se parte.', 'd24/12', 'det rad 8; st rad 2'),
  ],
  'Cura Aberrante': [
    N('Cura Aberrante Rápida', 'A carne fecha antes de o aliado sentir a dor.', 'h10/5', 'st regen 1'),
    N('Cura Aberrante em Todos', 'Brotos de carne em cada ferido do grupo.', 'h8/8 a'),
    N('Cura Aberrante Que Purga', 'A carne nova empurra o veneno para fora.', 'h12/7', 'cleanse'),
    N('Cura Aberrante Blindada', 'A carne nova cresce em crosta grossa.', 'h12/7', 'st defUp 2'),
    N('Cura Aberrante Rubra', 'O sangue do aliado empurra a carne nova para dentro da ferida.', 'h14/9', 'st regen 2', { v2: 'shukketsu' }),
    N('Cura Aberrante Duradoura', 'A carne cresce por vários turnos.', 'h12/8', 'st regen 3'),
    N('Cura Aberrante Total', 'Nenhuma ferida fica aberta.', 'h20/12 a', 'cleanse; st regen 2'),
  ],
  'Punho Atômico': [
    N('Punho Atômico Duplo', 'Dois socos, duas fissões.', 'd12/11 x2', 'st rad 1'),
    N('Punho Atômico Fissionado', 'O punho se parte no impacto e o brilho entra no alvo.', 'd26/12', 'det rad 6; st rad 2'),
    N('Punho do Núcleo Aberto', 'O núcleo do punho fica exposto: o soco mais pesado do caçador.', 'd32/13', 'st rad 3; pierce 60; st exposed 1'),
  ],
};

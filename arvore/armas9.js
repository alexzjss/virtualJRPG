// Leva 9, Árvore de Armas: as 99 casas que faltavam (camadas 6–10 dos ramos primordiais e dos 2 ramos de estilo de cada tipo).
// Sem elemento: só status físicos. Cada lista completa o ramo dela; o XP sai da casa que o nó vai ocupar (o último é a camada 10).
// Importado por tree.js antes de montar TREE.armas: os nós entram no fim dos ramos de ARMAS_ARV.
import { N } from './l8.js';
import { XP, RQ } from './camadas.js';
import { ARMAS_ARV } from './armas.js';

const P = {
  corte: ['FOR',
    N('Fio Que Não Cega', 'Mil cortes depois, o fio está igual ao primeiro.', 'p', 'atk 10; crit 6'),
    N('Corte Que Separa', 'Um corte limpo que abre armadura e carne de uma vez.', 'd36/12', 'pierce 60; st bleed 2'),
    N('Cortes Sem Conta', 'Limite: o aço passa tantas vezes que ninguém conta.', 'L54', 'st bleed 3'),
  ],
  esmag: ['FOR',
    N('Martelo Descendo', 'O golpe desce do alto com todo o peso.', 'd30/10', 'st stun 1 40%'),
    N('Ombros de Ferreiro', 'Os ombros aguentam qualquer peso.', 'p', 'atk 8; def 5'),
    N('Rachar o Mundo', 'Um golpe no chão que derruba todos em volta.', 'd26/13 a', 'st down 1 50%'),
    N('Pancada do Fim', 'Limite: um golpe só, e o alvo não levanta.', 'L54', 'brk 3; st stun 1'),
  ],
  perf: ['DES',
    N('Agulha Final', 'A ponta procura o coração e acha.', 'd30/10', 'pierce 80'),
    N('Ponta Que Lê', 'A ponta sente a brecha antes do olho.', 'p', 'crit 10; hit 6'),
    N('Estocada Sem Volta', 'Entra até o fim e não sai.', 'd36/12', 'st bleed 3; pierce 60'),
    N('Atravessar Tudo', 'Limite: uma estocada que fura a fila inteira.', 'L54 a', 'pierce 100'),
  ],
  dist: ['DES',
    N('Dedo Leve', 'O gatilho e a corda obedecem antes do pensamento.', 'p', 'hit 8; crit 8'),
    N('Disparo Impossível', 'Um tiro que não tinha como acertar, e acerta.', 'd40/12', 'sure; pierce 50'),
    N('Céu Coberto de Disparos', 'Limite: tantos projéteis que o céu escurece sobre os inimigos.', 'L54 a', 'st exposed 2'),
  ],
};

const T = {
  lamina: ['DES', [ // Duas Lâminas
    N('Tesoura Dupla', 'As duas lâminas fecham no mesmo ponto.', 'd12/9 x2', 'st bleed 2'),
    N('Ambidestro', 'As duas mãos valem o mesmo.', 'p', 'hit 6; atk 6'),
    N('Roda de Aço Gêmeo', 'As duas lâminas giram como roda e não param.', 'd10/12 x3', 'st bleed 1'),
    N('Cruz Dupla', 'Dois X sobrepostos no peito do alvo.', 'd16/12 x2', 'brk 1; st bleed 2'),
    N('Dança das Doze Lâminas', 'Limite: as duas lâminas giram até o inimigo cair.', 'L54 a', 'st bleed 3'),
  ], [ // Bainha
    N('Saque do Fim', 'O saque mais rápido da vida do espadachim.', 'd34/11 t70', 'sure'),
    N('Bainha Viva', 'A lâmina quase sai sozinha.', 'p', 'agi 8; crit 8'),
    N('Corte Antes do Golpe', 'Corta a mão do inimigo antes de ela descer.', 'u/8 s', 'st counter 2 self', { rea: 'counter 45' }),
    N('Um Só Corte', 'Um corte, um inimigo, nenhuma segunda chance.', 'd44/15', 'exec 35 1.5'),
  ]],
  lanca: ['FOR', [ // Falange
    N('Ponta da Tropa', 'A fileira inteira avança junto.', 'd24/12 a', 'push 40'),
    N('Formação Fechada', 'Ombro com ombro, ninguém cai sozinho.', 'p', 'def 8; hit 5'),
    N('Floresta de Lanças', 'Lanças cravadas no chão em volta do grupo.', 'u/10 a', 'shield 16; st counter 1'),
    N('Carga Final', 'Limite: a tropa inteira numa carga só.', 'L54 a', 'st down 1; pierce 60'),
  ], [ // Bastão
    N('Moinho de Bastão', 'O bastão gira e acerta todos em volta.', 'd9/12 x3 a'),
    N('Haste Viva', 'O bastão é a extensão do braço.', 'p', 'agi 8; def 5'),
    N('Golpe do Rei Macaco', 'O bastão cresce no meio do golpe.', 'd36/12', 'st stun 1 40%; push 40'),
    N('Bastão Que Segura o Céu', 'Fincado no chão, o bastão segura o golpe de todos.', 'u/12 a', 'shield 20; st defUp 2'),
  ]],
  fogo: ['DES', [ // Pistola
    N('Seis Tiros', 'O tambor esvazia num piscar.', 'd7/12 x5'),
    N('Pistoleiro Lendário', 'Ninguém saca mais rápido nesta cidade.', 'p', 'agi 8; crit 8'),
    N('Tiro na Arma Dele', 'Acerta a arma na mão do inimigo.', 'd30/11', 'st disarm 2 60%'),
    N('Último Duelo', 'Limite: dois homens, um tiro, um fica de pé.', 'L54', 'exec 30 1.5'),
  ], [ // Fuzil
    N('Tiro de Dois Quilômetros', 'O alvo nem ouve o disparo.', 'd36/12 t140', 'sure'),
    N('Pulmão Parado', 'Entre uma batida e outra do coração, o tiro sai.', 'p', 'hit 10; crit 6'),
    N('Bala Que Atravessa Paredes', 'Nem a cobertura salva.', 'd34/13', 'pierce 100; vs stealth 1.5'),
    N('Tiro do Século', 'Limite: o tiro que vão contar por cem anos.', 'L54', 'pierce 100; sure'),
  ]],
  punho: ['FOR', [ // Manoplas
    N('Punhos de Bigorna', 'Cada soco pesa como uma bigorna caindo.', 'p', 'atk 10; atkP 5'),
    N('Soco Que Abre o Chão', 'Limite: o soco passa pelo alvo e racha o chão atrás.', 'L54', 'brk 3; st down 1'),
  ], [ // Monge
    N('Mente Vazia', 'Sem pensamento, sem atraso.', 'p', 'agi 8; crit 8'),
    N('Palma do Último Sopro', 'Uma palma leve; três passos depois, o inimigo cai.', 'd40/14', 'seal 40 2; st stun 1'),
  ]],
  pesada: ['FOR', [ // Martelo
    N('Martelo de Forja Viva', 'O martelo desce como na bigorna.', 'd30/11', 'brk 2'),
    N('Braço de Malho', 'O braço já nem sente o peso do martelo.', 'p', 'atk 10; def 4'),
    N('Abalo do Martelo', 'O martelo bate no chão e todos tropeçam.', 'd24/13 a', 'st down 1 50%'),
    N('Martelo do Juízo', 'Limite: o martelo cai e nada fica inteiro.', 'L54', 'brk 3; st stun 1'),
  ], [ // Machado
    N('Machado em Giro', 'Um giro inteiro com o machado aberto.', 'd22/12 a', 'st bleed 2'),
    N('Sede do Machado', 'O machado pede mais depois de cada queda.', 'p', 'atk 6', { on: 'kill', fx: 'st atkUp 2 self; gain limit 10' }),
    N('Cortar a Árvore', 'Um corte baixo que derruba o maior inimigo.', 'd34/12', 'st down 1; brk 1'),
    N('Lâmina do Cadafalso', 'Limite: o machado desce uma vez só, como no cadafalso.', 'L54', 'exec 35 1.6'),
  ]],
  foco: ['INT', [ // Livro
    N('Página Rasgada', 'Lê uma linha proibida e o alvo esquece o que ia dizer.', 'm28/11', 'st silence 2'),
    N('Marcador de Página', 'Sabe de cor onde está cada linha.', 'p', 'hit 8', { bon: 'sanMax 8' }),
    N('Errata', 'Risca do livro o último mal que o aliado sofreu.', 'h20/12', 'cleanse'),
    N('Último Capítulo', 'Limite: o livro termina, e o inimigo junto.', 'L54 a', 'st silence 2; st exposed 2'),
  ], [ // Sino e espelho
    N('Badalada Grave', 'Um sino que faz os ossos vibrarem.', 'm24/12 a', 'st stun 1 40%'),
    N('Superfície Polida', 'O espelho nunca embaça.', 'p', 'def 6; hit 6'),
    N('Espelho Que Devolve Tudo', 'O espelho pega o golpe e o manda de volta.', 'u/10 s', 'st reflect 3 self'),
    N('Sino do Fim do Mundo', 'Limite: o sino toca e todos param para ouvir.', 'L54 a', 'st stun 1; st silence 1'),
  ]],
  corrente: ['DES', [ // Chicote
    N('Chicote de Domador', 'Um estalo que faz a fera recuar.', 'd28/11', 'st atkDn 2; push 30'),
    N('Pulso de Chicote', 'O pulso já sabe o tempo do estalo.', 'p', 'hit 8; crit 6'),
    N('Laço no Pescoço', 'O chicote enrola e puxa.', 'd30/12', 'st root 2; st silence 1'),
    N('Mil Estalos', 'Limite: o ar inteiro estala em volta do inimigo.', 'L54 a', 'st bleed 3'),
  ], [ // Mangual
    N('Mangual em Órbita', 'A bola gira e acerta quem chega perto.', 'd22/12 a', 'st stun 1 30%'),
    N('Peso Bem Medido', 'Cada elo tem o peso certo.', 'p', 'atk 8; hit 5'),
    N('Maça-Estrela', 'A bola de espinhos desce no crânio.', 'd36/12', 'brk 2; st bleed 2'),
    N('Corrente Sem Fim', 'Limite: os elos não acabam, e o inimigo não escapa.', 'L54', 'st root 2; brk 2'),
  ]],
  arremesso: ['DES', [ // Ninja
    N('Kunai na Nuca', 'Uma kunai que chega antes do som.', 'd30/10 t70', 'sure'),
    N('Mão Sem Rastro', 'Ninguém vê de onde saiu.', 'p', 'agi 8; crit 6'),
    N('Nuvem de Shuriken', 'Estrelas de aço por todo o campo.', 'd9/12 x4 a'),
    N('Mil Lâminas no Escuro', 'Limite: mil lâminas, nenhum arremessador à vista.', 'L54 a', 'st bleed 3'),
  ], [ // Circo
    N('Faca na Maçã', 'Na cabeça do alvo, exatamente onde devia.', 'd32/11', 'st exposed 2; sure'),
    N('Respeitável Público', 'Com plateia, a mão fica mais firme.', 'p', 'hit 8', { on: 'start', fx: 'st focus 2 self' }),
    N('Roda da Morte', 'A roda gira e as facas saem em todas as direções.', 'd9/12 x4 a'),
    N('Número Final', 'Limite: o número que ninguém ensaiou duas vezes.', 'L54 a', 'st bleed 2; st stun 1'),
  ]],
  arco: ['DES', [ // Arco
    N('Flecha do Caçador Velho', 'Uma flecha só, como nos tempos de fome.', 'd34/11', 'exec 30 1.4'),
    N('Corda Viva', 'A corda vibra como parte do braço.', 'p', 'hit 8; crit 6'),
    N('Três Flechas na Corda', 'Três flechas na mesma corda, três alvos.', 'd26/12', 'chain 2 .8'),
    N('Flecha Que Desce Como Estrela', 'Limite: a flecha sobe até sumir e desce como estrela.', 'L54', 'pierce 100'),
  ], [ // Besta
    N('Virote de Cerco', 'Um virote feito para portões.', 'd34/12', 'brk 2'),
    N('Trava Perfeita', 'A manivela não falha nunca.', 'p', 'atk 8; hit 6'),
    N('Virote em Corrente', 'Dois virotes ligados por corrente prendem o alvo.', 'd28/12', 'st root 2'),
    N('Balista Viva', 'Limite: a besta dispara como uma balista de muralha.', 'L54', 'pierce 80; brk 2'),
  ]],
  escudo: ['CON', [ // Bastião
    N('Muralha Que Anda', 'O escudo avança e o grupo vai atrás.', 'u/10 a', 'shield 16; st guarded 1'),
    N('Braço de Muralha', 'O braço do escudo não cansa.', 'p', 'def 10', { bon: 'hpMax 10' }),
    N('Proteger a Todos', 'O escudo cobre o grupo inteiro por um instante.', 'u/12 a', 'shield 20; st defUp 2'),
    N('Portão Que Não Cai', 'Enquanto ele estiver de pé, ninguém passa.', 'u/14 s', 'st taunt 2 self; st defUp 4 self; shield 30 self'),
  ], [ // Escudo de ataque
    N('Borda em Ricochete', 'O escudo bate em três e volta.', 'd24/12', 'chain 2 .7', { a: 'FOR' }),
    N('Borda Cortante', 'A borda do escudo foi afiada como lâmina.', 'p', 'atk 8; crit 5'),
    N('Esmagar com o Escudo', 'Prensa o inimigo contra o chão.', 'd34/12', 'st stun 1 40%; brk 1', { a: 'FOR' }),
    N('Égide em Fúria', 'Limite: o escudo vira arma e muralha ao mesmo tempo.', 'L54 a', 'st stun 1; shield 20 self', { a: 'FOR' }),
  ]],
  instrumento: ['CAR', [ // Cordas e percussão
    N('Batida do Coração', 'Os tambores batem no ritmo do coração do inimigo, e ele para.', 'm26/12 a', 'st stun 1 30%'),
    N('Mãos de Músico', 'As mãos nunca erram a nota.', 'p', 'hit 8; heal 10'),
    N('Balada da Volta', 'Uma balada que chama de volta quem caiu.', 'h18/14 a', 'revive 30'),
    N('Último Acorde', 'Limite: um acorde tão alto que o campo inteiro para.', 'L54 a', 'st stun 1; st silence 1'),
  ], [ // Sopros
    N('Flauta Que Prende', 'A melodia prende os pés de quem ouve.', 'm24/12 a', 'st root 1 50%'),
    N('Pulmões de Fole', 'Sopra uma música inteira sem respirar.', 'p', 'heal 10; def 4'),
    N('Hino de Retorno', 'O clarim toca e o grupo levanta a cabeça.', 'h20/14 a', 'cleanse; st regen 3'),
    N('Trombeta do Fim', 'Limite: uma trombeta que derruba muralhas.', 'L54 a', 'brk 2; st down 1'),
  ]],
};

// a lista ocupa as últimas casas do ramo: o k-ésimo de n nós vai para a camada 11 − n + k
const fim = (ns, a, req, sc) => ns.map((o, k) => { const L = 11 - ns.length + k, s = { ...o, xp: XP[L] };
  if (s.k === 'passive') { s.sc = sc; delete s.a; } else { s.a = o.a || a; s.req = req; s.rq = { [s.a]: RQ[L] }; }
  return s; });
for (const [cat, [a, ...ns]] of Object.entries(P)) ARMAS_ARV.prim[cat].push(...fim(ns, a, cat, `wc:${cat}`));
for (const [wt, [a, ...brs]] of Object.entries(T)) brs.forEach((ns, j) => ARMAS_ARV.tipos[wt][j].push(...fim(ns, a, wt, `wt:${wt}`)));
export const ARMAS9 = { P, T };

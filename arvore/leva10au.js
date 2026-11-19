// Leva 10: Aura (Nen, sem elemento) e Ocultismo (rituais, medo, maldição).
import { N } from './l8.js';

export const LEVA10AU = {
  'Ten: Envolver': [
    N('Ten Assentado', 'A aura assenta no corpo e não sai do lugar.', 'p', '', { mod: 'def 4' }),
    N('Ten Reativo', 'A aura reage ao golpe e endurece no ponto certo.', 'p', '', { on: 'hurt', ch: 30, fx: 'shield 8 self' }),
    N('Ten Denso', 'A aura fica espessa como uma segunda pele.', 'p', '', { mod: 'def 7' }),
    N('Ten Que Absorve', 'Parte do golpe volta para o caçador como aura.', 'p', '', { on: 'hurt', ch: 35, fx: 'gain aura 4' }),
    N('Ten Coletivo', 'O Ten se abre e envolve todos os aliados.', 'u/8 a', 'shield 14 ally', { a: 'SAB' }),
    N('Ten Que Reflete', 'A aura devolve o golpe a quem o deu.', 'p', '', { on: 'hurt', ch: 30, fx: 'st reflect 1 self' }),
    N('Ten Perfeito', 'Nenhuma brecha na aura, nenhum golpe encontra a pele.', 'p', '', { mod: 'def 10; esq 40' }),
    N('Ten Absoluto', 'A aura cobre o corpo antes mesmo da luta começar.', 'p', '', { on: 'start', fx: 'shield 35 self; st defUp 3 self' }),
  ],
  'Zetsu: Ocultar': [
    N('Zetsu Silencioso', 'A aura some por completo, sem nem um sussurro.', 'u/4 s', 'st stealth 2', { a: 'SAB' }),
    N('Zetsu Que Recarrega', 'Sumir é descansar: a aura volta aos poucos.', 'u/5 s', 'gain aura 8; st stealth 1', { a: 'SAB' }),
    N('Zetsu Profundo', 'Tão fundo que nem o instinto do inimigo acha.', 'u/6 s', 'st stealth 3; st evade 1', { a: 'SAB' }),
    N('Zetsu Coletivo', 'O grupo inteiro some no mesmo instante.', 'u/9 a', 'st stealth 2 ally', { a: 'SAB' }),
    N('Zetsu Emboscada', 'O golpe que sai do nada, no único alvo desprevenido.', 'd22/9', 'solo 1.5; sure'),
    N('Zetsu Absoluto', 'A ausência perfeita, sem aura, sem sombra, sem pegada.', 'u/10 s', 'st stealth 3; st evade 2; gain aura 15', { a: 'SAB' }),
    N('Zetsu: Vazio Total', 'Todo o grupo vira vazio, e o inimigo nem lembra de ter visto.', 'u/14 a', 'st stealth 3 ally; shield 20 ally', { a: 'SAB' }),
  ],
  'Ren: Intensificar': [
    N('Ren Constante', 'A aura intensa que não oscila.', 'f/5', 'dur 3; atk 12'),
    N('Ren Que Acumula', 'Cada pulso do Ren deixa o próximo mais forte.', 'u/6 s', 'stack impeto 5; st atkUp 2', { a: 'SAB' }),
    N('Ren Denso', 'Uma aura tão densa que protege enquanto ataca.', 'f/8', 'dur 4; atk 18; def 8'),
    N('Ren Coletivo', 'A aura intensa se espalha entre os aliados.', 'u/10 a', 'st atkUp 2 ally; st defUp 2 ally', { a: 'SAB' }),
    N('Ren Explosivo Maior', 'Todo o ímpeto guardado explode numa onda de aura.', 'd16/11 a', 'burst impeto .4; st stun 1 25%'),
    N('Ren: Aura Transbordante', 'A aura transborda do corpo e vira a própria arma.', 'f/14', 'dur 4; atk 30; def 15; crit 10'),
  ],
  'Punho Reforçado': [
    N('Punho Reforçado Que Acumula', 'Cada soco guarda uma camada a mais de aura.', 'd14/7', 'stack impeto 5'),
    N('Punho Reforçado Detonador', 'Toda a aura guardada sai no mesmo punho.', 'd18/9', 'burst impeto .4; brk 1'),
    N('Punhos Reforçados Sem Pausa', 'Cinco socos, cada um com a aura do anterior.', 'd8/12 x5', 'st stun 1 20%'),
    N('Punho Reforçado Final', 'O punho que concentra tudo o que o caçador treinou.', 'd40/16', 'brk 2; pierce 50; st down 1'),
  ],
  'Corpo Reforçado': [
    N('Músculos Reforçados', 'A aura entra nos músculos e cada golpe pesa mais.', 'p', '', { mod: 'atk 5; def 5' }),
    N('Pele Reforçada', 'Uma pele de aura que aguenta o que a carne não aguentaria.', 'p', '', { bon: 'hpMax 20' }),
    N('Nervos Reforçados', 'Os nervos respondem antes do pensamento.', 'p', '', { mod: 'agi 8; esq 40' }),
    N('Corpo Reforçado Pleno', 'Músculos, ossos e pele, todos cobertos de aura.', 'p', '', { mod: 'atk 8; def 8' }),
    N('Aura Entranhada', 'A aura já mora no corpo, e a reserva é maior por isso.', 'p', '', { bon: 'auraMax 20' }),
    N('Corpo de Aura Pura', 'O corpo e a aura viraram a mesma coisa.', 'p', '', { mod: 'def 12', bon: 'hpMax 30' }),
  ],
  'Punho Meteoro': [
    N('Punho Meteoro Que Acumula', 'A queda acumula ímpeto antes de bater.', 'd14/8', 'stack impeto 5; brk 1'),
    N('Enxame de Meteoros', 'Três punhos caem do alto, um depois do outro.', 'd8/12 x3 a', 'st stun 1 25%'),
    N('Punho Meteoro Detonador', 'O ímpeto guardado explode junto com a queda.', 'd20/11', 'burst impeto .4; brk 1'),
    N('Punho Meteoro Primordial', 'O primeiro e o maior de todos os meteoros.', 'd42/18', 'brk 2; st down 2; pierce 50'),
  ],
  'Shukoudan': [
    N('Shukoudan Supremo', 'O disparo mais perfeito de todos: não erra, não para, não perdoa.', 'd40/16', 'sure; pierce 60; vs marked 1.4'),
  ],
  'Força de Aura': [
    N('Força de Aura Dupla', 'Dois pulsos de aura, um logo atrás do outro.', 'd8/5 x2', ''),
    N('Força de Aura Que Acumula', 'Cada pulso guarda um pouco de ímpeto.', 'd10/6', 'stack impeto 5'),
    N('Força de Aura Densa', 'A aura se comprime e fura a guarda.', 'd14/8', 'pierce 40'),
    N('Impacto de Aura Largo', 'O impacto se abre em todas as direções.', 'd14/10 a', 'push 20'),
    N('Força de Aura Detonadora', 'O ímpeto guardado vai num impacto só.', 'd18/11', 'burst impeto .4; brk 1'),
    N('Força de Aura Absoluta', 'Uma força que não precisa de arma nem de músculo.', 'd24/12', 'pierce 70; st stun 1 30%'),
    N('Força de Aura Sem Limite', 'Toda a aura do corpo, entregue ao inimigo de uma vez.', 'd40/16', 'brk 2; pierce 60; st down 1'),
  ],
  'Teia de Aura': [
    N('Teia Que Acumula', 'Cada fio deixa a teia mais densa.', 'd12/8', 'stack impeto 5; st root 1'),
    N('Teia Que Aperta', 'Quem se debate só fica mais preso.', 'd16/10', 'vs root 1.5; st root 1'),
    N('Teia de Aura Sem Fim', 'Uma teia tão grande que cobre o campo inteiro e puxa tudo para o centro.', 'd34/16 a', 'st root 2; push -30; vs root 1.5'),
  ],
  'Canhão de Aura': [
    N('Canhão de Aura Supremo', 'Todo o poder do canhão, no ponto exato, de uma só vez.', 'd44/18', 'pierce 70; brk 2'),
  ],
  'Canhão de Aura Gélido': [
    N('Canhão Frio Largo', 'Um canhão frio que se abre e alcança todos.', 'd14/10 a', 'st atkDn 2'),
    N('Canhão Frio Que Acumula', 'Cada disparo deixa o frio mais fundo.', 'd18/11', 'stack impeto 5; st atkDn 2'),
    N('Canhão Frio Detonador', 'O frio guardado estoura de uma vez no alvo.', 'd22/13', 'burst impeto .4; st agiDn 2'),
    N('Canhão Frio Que Prende', 'O frio tira o passo e a vontade de sair do lugar.', 'd26/14', 'st root 2; st agiDn 2'),
    N('Canhão Frio Absoluto', 'O canhão que para tudo o que ele toca, no campo inteiro.', 'd44/18 a', 'st atkDn 3; st agiDn 3; pierce 50'),
  ],
  'Projétil de Aura': [
    N('Projétil Que Acumula', 'Cada projétil deixa o seguinte mais pesado.', 'd10/5', 'stack impeto 5'),
    N('Projéteis em Leque', 'Os projéteis se abrem em leque e alcançam todos.', 'd10/9 a', 'push 10'),
    N('Projétil Detonador', 'Toda a aura guardada sai num projétil só.', 'd16/9', 'burst impeto .4'),
    N('Projéteis Teleguiados', 'Três projéteis que sempre acham o alvo.', 'd8/12 x3', 'sure'),
    N('Projétil Primordial', 'O primeiro projétil de aura, o mais puro e o mais forte.', 'd40/16', 'pierce 60; brk 1'),
  ],
  'Ritual: Perceber o Outro Lado': [
    N('Ritual: Perceber Fundo', 'O ritual vai fundo, e o outro lado devolve o olhar.', 'u/5 s', 'st focus 3', { a: 'INT' }),
    N('Ritual: Ver o Que Se Esconde', 'O que se esconde fica à mostra para o grupo todo.', 'u/8 a', 'st exposed 2 foes', { a: 'INT' }),
    N('Ritual: Perceber o Medo', 'O ritual lê o medo do alvo e o marca.', 'm14/9', 'st fear 2; st marked 2'),
    N('Ritual: Abrir o Terceiro Olho', 'Um olho que não é de ninguém se abre na testa do ocultista.', 'u/10 s', 'st focus 3; gain aura 10', { a: 'INT' }),
    N('Ritual: Ver Tudo', 'Nada fica escondido do ritual: nem o alvo, nem o que ele teme.', 'u/14 a', 'st exposed 3 foes; st marked 3 foes', { a: 'INT' }),
  ],
  'Ritual: Decadência': [
    N('Ritual: Decadência Que Se Alastra', 'A decadência pula de um corpo para o outro.', 'd18/12 a', 'st defDn 2; st curse 2'),
    N('Ritual: Decadência Final', 'Tudo o que é velho vira pó: armadura, osso e vontade.', 'd38/16 a', 'st defDn 3; st exposed 2; vs curse 1.5'),
  ],
  'Ritual: Amaldiçoar Arma': [
    N('Ritual: Arma Faminta', 'A arma amaldiçoada quer mais, e o grupo bate mais rápido.', 'u/8', 'st atkUp 3; haste 20'),
    N('Ritual: Armas Amaldiçoadas', 'Todas as armas do grupo ficam mais pesadas e mais cruéis.', 'u/12 a', 'st atkUp 3 ally; st defUp 2 ally'),
    N('Ritual: Arma do Pacto', 'A arma assina um pacto com cada aliado e cobra em golpes.', 'u/16 a', 'st atkUp 4 ally; st agiUp 3 ally; shield 20 ally'),
  ],
};

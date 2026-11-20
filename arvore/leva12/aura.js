// Leva 12 (evolução lógica), setor aura. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
// A Aura é Nen e não tem elemento: o elemento só entra por combinação (`v2` = Vínculo parceiro), cada um com a cara do tema dele.
import { N } from '../l8.js';
// V(linhas): [v2, nome, descrição, spec, fx]; sem v2 (null) é um passo neutro da linha
const V = rows => rows.map(([v2, n, d, spec, fx]) => N(n, d, spec, fx, v2 ? { v2 } : {}));

export const ESTENDER = {
  // o canhão ganha uma variação por Vínculo (Gélido, Rubro e Solar já existiam); Supremo continua como a ponta neutra
  'Canhão de Aura': V([
    ['kagutsuchi', 'Canhão Ígneo', 'A aura sai em brasa viva e deixa o alvo ardendo.', 'd20/10', 'st burn 3'],
    ['indra', 'Canhão Trovejante', 'O canhão estala ao sair e atravessa a guarda como se ela não existisse.', 'd20/10', 'st para 1 35%; pierce 60'],
    ['susanoo', 'Canhão de Maré', 'Uma onda de aura que encharca o alvo e o empurra para trás.', 'd19/10', 'st wet 3; push 35'],
    ['atlas', 'Canhão Rochoso', 'Um disparo pesado como uma montanha: derruba e racha a guarda.', 'd24/11', 'st down 1 50%; brk 2'],
    ['tsukuyomi', 'Canhão Lunar', 'O canhão chega sem som, e o alvo vê o que não existe.', 'd16/10', 'st fear 2; st sleep 1 30%'],
    ['hiruko', 'Canhão Peçonhento', 'A aura sai azeda e contamina a ferida, que não fecha direito.', 'd18/10', 'st poison 3; st atkDn 1'],
  ]),
  'Shukoudan': V([
    ['kagutsuchi', 'Shukoudan Ígneo', 'A bala de aura sai em brasa e queima onde bate.', 'd10/5', 'st burn 2'],
    ['indra', 'Shukoudan Trovejante', 'A bala estala e corre mais rápido do que o olho acompanha.', 'd10/5', 'st para 1 25%; sure'],
    ['susanoo', 'Shukoudan de Maré', 'Uma bala molhada que encharca e arrasta o alvo.', 'd10/5', 'st wet 2; push 20'],
    ['atlas', 'Shukoudan Rochoso', 'Uma bala densa como pedra: o alvo vai ao chão.', 'd14/6', 'st down 1 40%; brk 1'],
    ['tsukuyomi', 'Shukoudan Lunar', 'Uma bala que deixa o alvo vendo dobrado e errando o golpe.', 'd10/5', 'st confuse 1 40%; st blind 1 40%'],
    ['hiruko', 'Shukoudan Peçonhento', 'A bala deixa um gosto amargo na ferida.', 'd10/5', 'st poison 2'],
    ['shukketsu', 'Shukoudan Rubro', 'A bala volta pela ferida trazendo um pouco de vida.', 'd12/6', 'drain hp 20'],
  ]),
  'Projétil de Aura': V([
    ['kagutsuchi', 'Projétil Ígneo', 'Projéteis em brasa que deixam o alvo ardendo.', 'd10/5', 'st burn 2'],
    ['susanoo', 'Projétil de Maré', 'Gotas grossas de aura que molham e empurram.', 'd9/5', 'st wet 2; push 15'],
    ['atlas', 'Projétil Rochoso', 'Seixos de aura, duros e pesados.', 'd12/6', 'st down 1 35%'],
    ['amaterasu', 'Projétil Solar', 'O projétil brilha tanto que ofusca quem o vê chegar.', 'd10/5', 'st blind 2 50%'],
    ['tsukuyomi', 'Projétil Lunar', 'Projéteis que somem e reaparecem: o alvo nunca sabe de onde vêm.', 'd9/5', 'st fear 1 40%'],
    ['hiruko', 'Projétil Peçonhento', 'Cada projétil deixa um pouco de veneno.', 'd9/5', 'st poison 2'],
    ['shukketsu', 'Projétil Rubro', 'Um projétil que volta com um gole de vida.', 'd10/5', 'drain hp 18; st bleed 1 40%'],
  ]),
  'Força de Aura': V([
    ['kagutsuchi', 'Força de Aura Ígnea', 'O golpe de aura sai quente e deixa o corpo ardendo.', 'd18/9', 'st burn 2'],
    ['indra', 'Força de Aura Trovejante', 'Um soco que estala por dentro da guarda.', 'd18/9', 'st para 1 30%; pierce 30'],
    ['susanoo', 'Força de Aura de Maré', 'Uma pancada de onda: empurra e deixa o alvo encharcado.', 'd16/9', 'st wet 2; push 40'],
    ['atlas', 'Força de Aura Rochosa', 'Peso de montanha no punho: racha a guarda e derruba.', 'd22/11', 'brk 2; st down 1'],
    ['tsukuyomi', 'Força de Aura Lunar', 'A força vem de uma sombra que o alvo não vê, e ele hesita.', 'd16/9', 'st fear 2'],
    ['hiruko', 'Força de Aura Peçonhenta', 'O golpe contamina o que toca e enfraquece o braço.', 'd16/9', 'st poison 2; st atkDn 1'],
    ['shukketsu', 'Força de Aura Rubra', 'A pancada abre a pele e devolve vida a quem bateu.', 'd18/10', 'drain hp 20'],
    ['amaterasu', 'Força de Aura Solar', 'Um golpe limpo e brilhante, que castiga o que é impuro.', 'd18/10', 'st blind 1 50%; vs demon 1.4'],
  ]),
};

export const ABRIR = {
  'Bala de Dedo': V([
    [null, 'Bala de Dedo Dupla', 'Dois dedos, duas balas, quase juntas.', 'd7/4 x2', ''],
    [null, 'Bala de Dedo Teleguiada', 'A bala dobra a esquina até achar o alvo.', 'd9/6', 'sure'],
    ['kagutsuchi', 'Bala de Dedo Ígnea', 'A ponta do dedo brilha em brasa antes do tiro.', 'd9/5', 'st burn 2'],
    ['indra', 'Bala de Dedo Trovejante', 'Um estalo no dedo e a bala já está lá.', 'd9/5', 'st para 1 25%; sure'],
    ['susanoo', 'Bala de Dedo de Maré', 'A bala vem pesada de água e empurra.', 'd9/5', 'st wet 2; push 15'],
    ['atlas', 'Bala de Dedo Rochosa', 'Uma bala dura como seixo: derruba o desavisado.', 'd12/6', 'st down 1 35%'],
    ['tsukuyomi', 'Bala de Dedo Lunar', 'A bala não faz sombra, e o alvo duvida do que viu.', 'd9/5', 'st fear 1 40%'],
    ['hiruko', 'Bala de Dedo Peçonhenta', 'Uma picada à distância, com veneno de aura.', 'd9/5', 'st poison 2'],
    ['shukketsu', 'Bala de Dedo Rubra', 'A bala rasga e traz de volta um fio de vida.', 'd10/6', 'drain hp 18'],
  ]),
  'Rajada de Três Pontos': V([
    [null, 'Rajada de Três Pontos Larga', 'Os três pontos se abrem e alcançam todos.', 'd7/7 a', ''],
    ['kagutsuchi', 'Três Pontos Ígneos', 'Três brasas, uma em cada ponta do triângulo.', 'd7/6 x3', 'st burn 1'],
    ['indra', 'Três Pontos Trovejantes', 'Os três pontos se ligam por um fio que estala.', 'd7/6 x3', 'st para 1 20%'],
    ['susanoo', 'Três Pontos de Maré', 'Três jatos que molham e empurram para fora da linha.', 'd7/6 x3', 'st wet 2; push 10'],
    ['atlas', 'Três Pontos Rochosos', 'Três pedras de aura que caem no mesmo instante.', 'd8/7 x3', 'st down 1 25%'],
    ['tsukuyomi', 'Três Pontos Lunares', 'Três pontos, e o alvo só acompanha um.', 'd7/6 x3', 'st confuse 1 30%'],
    ['hiruko', 'Três Pontos Peçonhentos', 'Três agulhas finas com a mesma gota amarga.', 'd7/6 x3', 'st poison 1'],
    ['shukketsu', 'Três Pontos Rubros', 'Três furos pequenos que bebem um pouco de vida.', 'd7/7 x3', 'drain hp 15'],
  ]),
  'Aura Teleguiada': V([
    [null, 'Aura Teleguiada Dupla', 'Duas auras que perseguem o mesmo alvo.', 'd9/7 x2', 'sure'],
    ['kagutsuchi', 'Aura Teleguiada Ígnea', 'Uma brasa que não perde o rastro de ninguém.', 'd13/8', 'sure; st burn 2'],
    ['indra', 'Aura Teleguiada Trovejante', 'Atraída pelo alvo como um fio de estalo.', 'd13/8', 'sure; st para 1 25%'],
    ['susanoo', 'Aura Teleguiada de Maré', 'Uma gota que sempre acha o caminho e encharca.', 'd12/8', 'sure; st wet 2'],
    ['atlas', 'Aura Teleguiada Rochosa', 'Uma pedra que gira até cair em cima do alvo.', 'd15/9', 'sure; st down 1 30%'],
    ['tsukuyomi', 'Aura Teleguiada Lunar', 'Uma sombra de aura que persegue o medo do alvo.', 'd12/8', 'sure; st fear 2'],
    ['hiruko', 'Aura Teleguiada Peçonhenta', 'A aura segue o cheiro do sangue e contamina.', 'd12/8', 'sure; st poison 2'],
    ['shukketsu', 'Aura Teleguiada Rubra', 'Segue o pulso do alvo e bebe um pouco dele.', 'd13/9', 'sure; drain hp 15'],
  ]),
  'Chuva de Esferas': V([
    [null, 'Esferas Que Acumulam', 'Cada esfera deixa a seguinte mais pesada.', 'd14/10 a', 'stack impeto 5'],
    ['kagutsuchi', 'Esferas Ígneas', 'Esferas que caem em brasa e ardem no chão.', 'd16/11 a', 'st burn 2'],
    ['susanoo', 'Esferas de Maré', 'Esferas cheias de água que estouram e empurram.', 'd15/11 a', 'st wet 2; push 20'],
    ['atlas', 'Esferas Rochosas', 'Esferas duras que martelam o campo e derrubam.', 'd18/12 a', 'st down 1 35%; brk 1'],
    ['tsukuyomi', 'Esferas Lunares', 'Esferas pálidas que mudam de lugar: ninguém sabe qual vai cair.', 'd15/11 a', 'st fear 1 40%'],
    ['hiruko', 'Esferas Peçonhentas', 'Esferas moles que estouram em gotas amargas.', 'd15/11 a', 'st poison 2'],
  ]),
  'Disparo de Ricochete': V([
    [null, 'Ricochete Longo', 'O disparo bate mais uma vez antes de morrer.', 'd16/10', 'chain 4 0.7'],
    ['kagutsuchi', 'Ricochete Ígneo', 'Cada salto deixa uma brasa para trás.', 'd16/10', 'chain 2 0.7; st burn 2'],
    ['indra', 'Ricochete Trovejante', 'O disparo salta de alvo em alvo como um estalo.', 'd16/10', 'chain 3 0.75; st para 1 20%'],
    ['susanoo', 'Ricochete de Maré', 'O disparo quica como pedra na água e molha cada um.', 'd15/10', 'chain 2 0.7; st wet 2'],
    ['atlas', 'Ricochete Rochoso', 'Um disparo duro que racha onde bate.', 'd19/11', 'chain 2 0.65; brk 1'],
    ['tsukuyomi', 'Ricochete Lunar', 'O disparo some de um alvo e surge no outro, assustando os dois.', 'd15/10', 'chain 2 0.7; st fear 1 40%'],
    ['hiruko', 'Ricochete Peçonhento', 'O veneno vai de um corpo para o outro.', 'd15/10', 'chain 2 0.7; st poison 2'],
  ]),
  'Metralhadora de Aura': V([
    ['kagutsuchi', 'Metralhadora Ígnea', 'Uma saraivada de brasas que cobre o alvo de pontos ardentes.', 'd8/9 x3', 'st burn 1'],
    ['indra', 'Metralhadora Trovejante', 'Cada bala estala ao sair, e o alvo treme.', 'd8/9 x3', 'st para 1 20%'],
    ['tsukuyomi', 'Metralhadora Lunar', 'O ruído das balas é de mais gente do que existe.', 'd8/9 x3', 'st fear 1 30%'],
    ['hiruko', 'Metralhadora Peçonhenta', 'Balas que deixam um rastro de veneno.', 'd8/9 x3', 'st poison 1'],
    ['shukketsu', 'Metralhadora Rubra', 'Uma rajada que arranca vida a cada acerto.', 'd8/10 x3', 'drain hp 12'],
  ]),
  'Grande Canhão': V([
    ['kagutsuchi', 'Grande Canhão Ígneo', 'Um canhão enorme que explode em brasa no impacto.', 'd22/12', 'st burn 3'],
    ['indra', 'Grande Canhão Trovejante', 'O estrondo vem primeiro, e o corpo trava depois.', 'd22/12', 'st para 1 35%; pierce 40'],
    ['susanoo', 'Grande Canhão de Maré', 'Uma onda que sai do cano e leva tudo para trás.', 'd20/12 a', 'st wet 2; push 40'],
    ['atlas', 'Grande Canhão Rochoso', 'O tiro derruba muralhas e quem está atrás delas.', 'd26/13', 'st down 1 50%; brk 2'],
    ['tsukuyomi', 'Grande Canhão Lunar', 'O disparo chega em silêncio, depois do susto.', 'd20/12', 'st fear 2; st sleep 1 25%'],
    ['hiruko', 'Grande Canhão Peçonhento', 'O tiro explode em uma nuvem azeda e contamina o grupo inimigo.', 'd18/12 a', 'st poison 3'],
  ]),
  'Rajada de Aura': V([
    ['kagutsuchi', 'Rajada Ígnea', 'Uma rajada que sopra brasas no rosto do inimigo.', 'd5/5 x2', 'st burn 1'],
    ['indra', 'Rajada Trovejante', 'A rajada estala e trava o braço.', 'd5/5 x2', 'st para 1 20%'],
    ['susanoo', 'Rajada de Maré', 'Uma rajada molhada, que encharca e empurra.', 'd5/5 x2', 'st wet 2; push 10'],
    ['atlas', 'Rajada Rochosa', 'Cascalho de aura em alta velocidade.', 'd6/6 x2', 'st down 1 25%'],
    ['tsukuyomi', 'Rajada Lunar', 'Uma rajada de estalos sem fonte, que desnorteia.', 'd5/5 x2', 'st confuse 1 35%'],
    ['hiruko', 'Rajada Peçonhenta', 'Gotículas finas que entram pela pele.', 'd5/5 x2', 'st poison 1'],
    [null, 'Rajada de Aura Suprema', 'Todas as balas de uma vez, sem intervalo entre elas.', 'd8/8 x4', 'pierce 40'],
  ]),
  'Canhão do Horizonte': V([
    ['kagutsuchi', 'Horizonte Ígneo', 'O tiro cruza o campo deixando um traço de brasa.', 'd22/10', 'pierce 25; st burn 2'],
    ['indra', 'Horizonte Trovejante', 'O disparo cruza tudo em um estalo só.', 'd22/10', 'pierce 40; st para 1 25%'],
    ['susanoo', 'Horizonte de Maré', 'Uma onda longa e baixa que varre o chão.', 'd20/10', 'pierce 25; st wet 2; push 20'],
    ['atlas', 'Horizonte Rochoso', 'Uma bala pesada que não perde altura e racha tudo.', 'd24/11', 'pierce 25; st down 1 35%'],
    ['tsukuyomi', 'Horizonte Lunar', 'O alvo vê o tiro chegar de muito longe e não sai do lugar.', 'd20/10', 'pierce 25; st fear 2'],
    ['hiruko', 'Horizonte Peçonhento', 'O tiro vem de longe, e o veneno tem tempo de agir.', 'd20/10', 'pierce 25; st poison 3'],
  ]),
  'Disparo Remoto': V([
    ['kagutsuchi', 'Disparo Remoto Ígneo', 'Um disparo que só vira brasa quando chega.', 'd19/9', 'sure; st burn 2'],
    ['indra', 'Disparo Remoto Trovejante', 'O disparo atravessa a distância num estalo.', 'd19/9', 'sure; st para 1 25%'],
    ['susanoo', 'Disparo Remoto de Maré', 'Uma gota que pesa mais a cada metro e encharca no fim.', 'd18/9', 'sure; st wet 2'],
    ['tsukuyomi', 'Disparo Remoto Lunar', 'Ninguém viu quem atirou, e o medo pesa mais que a bala.', 'd18/9', 'sure; st fear 2'],
    ['hiruko', 'Disparo Remoto Peçonhento', 'O disparo leva um pouco de peçonha de longe.', 'd18/9', 'sure; st poison 2'],
  ]),
};

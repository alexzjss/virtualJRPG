// Leva 12 (evolução lógica), setor atlas. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
// Cadeias de evolução: X -> X Dupla -> X Que Prende/Racha -> X Detonador -> X Supremo, com as combinações de Vínculo no meio.
import { N } from '../l8.js';

export const ESTENDER = {
  // as linhas já têm só fogo (ou só um parceiro): entram os outros Vínculos que a regra de tema permite como combinação
  'Estilhaço': [
    N('Estilhaço Imantado', 'As lascas puxam o raio do aliado e estalam na pele.', 'd16/9', 'st para 1 40%', { v2: 'indra' }),
    N('Estilhaço Rubro', 'Lascas finas como agulhas que sangram o que furam.', 'd16/9', 'st bleed 2; brk 1', { v2: 'shukketsu' }),
  ],
  'Pedrada': [
    N('Pedrada em Brasa', 'A pedra sai da fornalha do aliado e queima ao bater.', 'd18/9', 'st burn 2; st down 1 40%', { v2: 'kagutsuchi' }),
    N('Pedrada Podre', 'Uma pedra coberta de bolor que adoece quem ela acerta.', 'd18/9', 'st poison 2', { v2: 'hiruko' }),
  ],
  'Terremoto': [
    N('Terremoto Vulcânico', 'A terra treme e a fenda cospe o fogo do aliado.', 'd22/12 a', 'st burn 2; st down 1 40%', { v2: 'kagutsuchi' }),
    N('Terremoto Elétrico', 'O abalo carrega o raio do aliado pelo chão inteiro.', 'd22/12 a', 'st para 1 40%; st down 1 30%', { v2: 'indra' }),
  ],
};

export const ABRIR = {
  'Lança de Pedra': [
    N('Lanças de Pedra Gêmeas', 'Duas lanças de pedra, uma ao lado da outra.', 'd7/5 x2'),
    N('Lança de Pedra Cravada', 'A lança fica fincada no chão e no pé do alvo.', 'd12/7', 'st root 2'),
    N('Lança de Pedra em Brasa', 'A ponta sai vermelha da fornalha do aliado.', 'd15/8', 'st burn 2; pierce 40', { v2: 'kagutsuchi' }),
    N('Lança de Pedra Detonadora', 'A rocha guardada estoura dentro da lança.', 'd20/9', 'burst rocha 0.2; st defDn 1'),
    N('Lança de Pedra Imantada', 'A lança puxa o raio do aliado e prende o alvo ao chão com um estalo.', 'd18/9', 'st para 1 35%', { v2: 'indra' }),
    N('Lança de Pedra Quebra-Muralha', 'Uma lança comprida que atravessa qualquer guarda.', 'd26/10', 'brk 2; pierce 70'),
    N('Lança de Pedra Venenosa', 'A ponta é lambuzada com o veneno do aliado.', 'd30/11', 'st poison 2; pierce 60', { v2: 'hiruko' }),
    N('Lança de Pedra Suprema', 'A lança do titã, lançada de uma vez só.', 'd36/12', 'vs defDn 1.8; brk 2; pierce 80'),
  ],
  'Martelo de Basalto': [
    N('Martelo de Basalto Duplo', 'Dois malhos de basalto, um depois do outro.', 'd10/8 x2', 'brk 1'),
    N('Martelo de Basalto Que Racha', 'O malho trinca a armadura do alvo.', 'd30/10', 'brk 2; st defDn 1'),
    N('Martelo de Basalto Rubro', 'O basalto bebe o sangue do alvo e pesa mais.', 'd30/11', 'st bleed 2; brk 1', { v2: 'shukketsu' }),
    N('Martelo de Basalto Detonador', 'O peso guardado estoura no meio da pancada.', 'd36/12', 'burst rocha 0.3; brk 2'),
    N('Martelo de Basalto Supremo', 'O malho do titã cai uma vez, e uma é bastante.', 'd48/14', 'vs defDn 1.9; brk 3; st stun 1 60%'),
  ],
  'Esmagar': [
    N('Esmagar Duplo', 'Duas descidas seguidas, a segunda pior.', 'd22/10 x2'),
    N('Esmagar Detonador', 'O peso guardado cai junto com o golpe.', 'd44/13', 'burst rocha 0.3; brk 2'),
    N('Esmagar Supremo', 'Um golpe de cima que não deixa nada de pé.', 'd60/16', 'vs down 1.7; brk 3; st down 1 80%'),
  ],
  'Marreta de Granito': [
    N('Marreta de Granito Detonadora', 'A marreta bate e a rocha guardada estoura por dentro.', 'd54/15', 'burst rocha 0.35; brk 2'),
    N('Marreta de Granito Suprema', 'O malho de uma montanha, no ponto onde ela é mais pesada.', 'd70/18', 'vs defDn 2; brk 3; st stun 1 70%'),
  ],
  'Gume de Pedra': [
    N('Gume de Pedra Duplo', 'Dois golpes de lâmina pesada.', 'd6/5 x2'),
    N('Gume de Pedra Serrilhado', 'O fio lascado rasga em vez de cortar.', 'd9/6', 'st bleed 1'),
    N('Gume de Pedra Cravado', 'A lâmina fica presa na armadura e a afrouxa.', 'd12/7', 'st defDn 1; brk 1'),
    N('Gume de Pedra em Brasa', 'O gume sai vermelho da fornalha do aliado.', 'd15/8', 'st burn 2', { v2: 'kagutsuchi' }),
    N('Gume de Pedra Imantado', 'O gume puxa o raio do aliado e estala na ferida.', 'd16/8', 'st para 1 35%', { v2: 'indra' }),
    N('Gume de Pedra Cristalino', 'Um cristal no fio junta a luz do aliado num risco só.', 'd17/9', 'pierce 60; st blind 1 35%', { v2: 'amaterasu' }),
    N('Gume de Pedra Detonador', 'A rocha guardada na lâmina estoura no corte.', 'd18/9', 'burst rocha 0.2; st bleed 2'),
    N('Gume de Pedra Rubro', 'O fio bebe o sangue que corre e pesa mais a cada corte.', 'd24/10', 'st bleed 3; brk 1', { v2: 'shukketsu' }),
    N('Gume de Pedra Supremo', 'A lâmina do colosso, num corte que parte a guarda.', 'd32/12', 'vs bleed 1.8; brk 2; pierce 60'),
  ],
  'Corte Sísmico': [
    N('Corte Sísmico Duplo', 'Dois cortes, dois tremores.', 'd7/6 x2'),
    N('Corte Sísmico Que Derruba', 'O corte trinca o chão e o alvo cai.', 'd12/8', 'st down 1 50%'),
    N('Corte Sísmico Ventoso', 'O vento do aliado leva o corte mais longe.', 'd14/9', 'chain 2 0.8; st exposed 1', { v2: 'fuhaku' }),
    N('Corte Sísmico em Brasa', 'O corte deixa um risco de fogo no chão.', 'd16/9', 'st burn 2; st down 1 40%', { v2: 'kagutsuchi' }),
    N('Corte Sísmico Detonador', 'O tremor guardado sai todo no mesmo corte.', 'd20/10', 'burst rocha 0.25; st down 1 60%'),
    N('Corte Sísmico Cravado', 'O corte deixa a lâmina presa na armadura e a abre.', 'd24/11', 'st defDn 1; brk 1'),
    N('Corte Sísmico Rubro', 'O tremor abre a pele junto com o chão.', 'd26/11', 'st bleed 2; st down 1 40%', { v2: 'shukketsu' }),
    N('Corte Sísmico Supremo', 'Um corte que abre uma fenda até o fim da linha.', 'd30/12 a', 'brk 2; st down 1 70%'),
  ],
  'Bala de Cascalho': [
    N('Balas de Cascalho Duplas', 'Dois cartuchos de cascalho, um atrás do outro.', 'd7/6 x2'),
    N('Bala de Cascalho Imantada', 'O cascalho puxa o raio do aliado até o alvo.', 'd13/8', 'st para 1 35%', { v2: 'indra' }),
    N('Bala de Cascalho Perfurante', 'Uma bala de pedra dura, que fura a armadura.', 'd15/9', 'pierce 70'),
    N('Rajada de Cascalho', 'O cartucho abre em leque sobre toda a linha.', 'd14/10 a', 'st exposed 1 40%'),
    N('Bala de Cascalho Venenosa', 'O cascalho vai coberto do veneno do aliado.', 'd20/10', 'st poison 2', { v2: 'hiruko' }),
    N('Bala de Cascalho em Brasa', 'O cascalho sai do cano em brasa.', 'd21/10', 'st burn 2', { v2: 'kagutsuchi' }),
    N('Bala de Cascalho Detonadora', 'O cascalho guardado estoura dentro do alvo.', 'd26/11', 'burst rocha 0.25; brk 1'),
  ],
  'Soco de Pedra': [
    N('Soco de Pedra Duplo', 'Dois socos de punho de rocha.', 'd9/7 x2'),
    N('Soco de Pedra Que Afunda', 'O soco bate tão fundo que o alvo vai ao chão.', 'd16/9', 'st down 1 50%'),
    N('Soco de Pedra Rubro', 'O punho de pedra abre a pele e o sangue corre.', 'd18/10', 'st bleed 2; brk 1', { v2: 'shukketsu' }),
    N('Soco de Pedra Detonador', 'A rocha guardada no punho estoura no impacto.', 'd26/11', 'burst rocha 0.3; brk 1'),
    N('Soco de Pedra Elétrico', 'O punho de pedra carrega o raio do aliado e o solta no alvo.', 'd30/12', 'st para 1 35%; brk 1', { v2: 'indra' }),
    N('Soco de Pedra Supremo', 'O punho do titã, sem pressa e sem volta.', 'd38/13', 'vs down 1.7; brk 2; st stun 1 50%'),
  ],
  'Lança de Granito': [
    N('Lanças de Granito Gêmeas', 'Duas pontas de granito, lado a lado.', 'd10/8 x2', 'pierce 60'),
    N('Lança de Granito Que Racha', 'A ponta abre a armadura de ponta a ponta.', 'd20/10', 'pierce 100; brk 2'),
    N('Lança de Granito Cristalina', 'Um cristal na ponta junta a luz do aliado num ponto.', 'd22/11', 'pierce 80; st blind 1 40%', { v2: 'amaterasu' }),
    N('Lança de Granito Detonadora', 'A rocha guardada estoura depois de a lança entrar.', 'd32/12', 'burst rocha 0.3; pierce 90'),
    N('Lança de Granito Suprema', 'Nenhuma armadura é maior que esta lança.', 'd44/14', 'vs defDn 1.8; pierce 100; brk 2'),
  ],
  'Estoque Tectônico': [
    N('Estoque Tectônico Duplo', 'Duas estocadas, dois tremores sob o alvo.', 'd13/9 x2'),
    N('Estoque Tectônico Que Prende', 'A ponta se crava no chão e o alvo não sai do lugar.', 'd24/11', 'st root 2; brk 1'),
    N('Estoque Tectônico Detonador', 'O peso guardado explode em volta da ponta.', 'd32/12', 'burst rocha 0.3; st down 1 50%'),
    N('Estoque Tectônico Supremo', 'A estocada de uma placa inteira do mundo.', 'd44/14', 'vs root 1.8; brk 3'),
  ],
  'Punho do Titã': [
    N('Punho do Titã Duplo', 'O titã soca duas vezes, e o chão responde duas vezes.', 'd18/11 x2'),
    N('Punho do Titã Detonador', 'O peso guardado cai de uma vez no soco.', 'd40/13', 'burst rocha 0.35; brk 2'),
    N('Punho do Titã Supremo', 'O soco que o titã guardou desde o começo do mundo.', 'd56/16', 'vs down 1.8; brk 3; st stun 1 70%'),
  ],
  'Rajada de Estilhaços': [
    N('Rajada de Estilhaços Cravados', 'Os estilhaços ficam na armadura de todos e a afrouxam.', 'd24/13 a', 'st defDn 1; brk 1'),
    N('Rajada de Estilhaços Detonadora', 'Cada estilhaço guarda um pedaço da rocha e estoura no fim.', 'd34/14 a', 'burst rocha 0.25; st defDn 1'),
  ],
  'Tiro do Rochedo': [
    N('Tiro do Rochedo Detonador', 'A bala pesada estoura de dentro para fora.', 'd56/16', 'burst rocha 0.35; brk 2'),
  ],
  'Avalanche': [
    N('Avalanche Dupla', 'Duas torrentes de pedra, uma atrás da outra.', 'd6/9 a x2'),
    N('Avalanche Que Soterra', 'As pedras ficam nos pés dos inimigos e os prendem.', 'd12/10 a', 'st root 2'),
    N('Avalanche Incandescente', 'As pedras rolam em brasa da fornalha do aliado.', 'd16/11 a', 'st burn 2', { v2: 'kagutsuchi' }),
    N('Avalanche Detonadora', 'A rocha guardada estoura no meio da queda.', 'd24/12 a', 'burst rocha 0.25; st down 1 50%'),
    N('Avalanche de Lama', 'A água do aliado vira lama sob as pedras e todos afundam.', 'd20/12 a', 'st root 2; st wet 1', { v2: 'susanoo' }),
    N('Avalanche Cravada', 'As pedras ficam presas nas armaduras e as afrouxam.', 'd28/13 a', 'st defDn 1; brk 1'),
    N('Avalanche Suprema', 'A encosta inteira, de uma vez, sobre a linha toda.', 'd36/14 a', 'vs root 1.6; brk 2'),
  ],
  'Cordilheira': [
    N('Cordilheira Cravada', 'Os picos se fecham sobre a armadura de todos.', 'd24/13 a', 'st defDn 1; brk 1'),
    N('Cordilheira Detonadora', 'Cada pico guarda peso e estoura quando termina de subir.', 'd34/14 a', 'burst rocha 0.3; st down 1 50%'),
    N('Cordilheira Incandescente', 'Os picos sobem em brasa da fornalha do aliado.', 'd38/15 a', 'st burn 2; st down 1 40%', { v2: 'kagutsuchi' }),
    N('Cordilheira Suprema', 'Uma cordilheira inteira nasce sob a linha inimiga.', 'd46/16 a', 'vs down 1.7; brk 2'),
  ],
  'Desabamento': [
    N('Desabamento Detonador', 'O teto do mundo cede e a rocha guardada vai junto.', 'd42/15 a', 'burst rocha 0.3; brk 2'),
    N('Desabamento Que Soterra', 'O que caiu fica sobre os inimigos e não os deixa levantar.', 'd48/16 a', 'st root 2; st down 1 60%'),
    N('Desabamento Supremo', 'Nada fica em pé onde o mundo desabou.', 'd56/18 a', 'vs down 1.8; brk 3; st down 1 80%'),
  ],
};

// Leva 12 (evolução lógica), setor marcial. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
// Marcial é neutro: só status físicos. O elemento de outro Vínculo entra apenas em combinação (v2 do dono), como Giro em Chamas.
import { N } from '../l8.js';
export const ESTENDER = {
  // Leva 12b: as linhas da Leva 11 (Ataque Furtivo, Varredura Ampla) ganham os caminhos de combinação com os outros Vínculos
  'Ataque Furtivo': [
    N('Ataque Furtivo Peçonhento', 'A lâmina vai untada com a peçonha do caçador de ninhos.', 'd12/7', 'st poison 2; vs neg 1.3', { v2: 'hiruko' }),
    N('Ataque Furtivo na Sombra', 'Sai do escuro, golpeia e o alvo ainda procura de onde veio.', 'd14/8', 'st blind 2; vs neg 1.4', { v2: 'tsukuyomi' }),
    N('Ataque Furtivo Rubro', 'O golpe escondido abre a veia e leva a vida embora.', 'd14/8', 'st bleed 2; drain hp 20; vs neg 1.3', { v2: 'shukketsu' }),
  ],
  'Varredura Ampla': [
    N('Varredura Que Acumula', 'Cada arco deixa o seguinte mais largo e mais pesado.', 'd12/10 a', 'stack impeto 5; st down 1 40%'),
    N('Varredura Detonadora', 'Todo o embalo guardado sai num arco só.', 'd18/12 a', 'burst impeto .4; st down 1 50%'),
    N('Varredura Gélida', 'O arco arrasta o frio da água e prende os pés ao chão.', 'd14/10 a', 'st frozen 1 40%; st down 1 30%', { v2: 'susanoo' }),
    N('Varredura Pétrea', 'O peso da rocha entra no arco e quebra a postura de todos.', 'd16/11 a', 'brk 1; st down 1 50%', { v2: 'atlas' }),
    N('Varredura de Vento', 'A varredura abre um vazio no ar e empurra a linha inteira.', 'd14/10 a', 'push 50; st down 1 30%', { v2: 'fuhaku' }),
    N('Varredura Rubra', 'O arco corta fundo e devolve a vida que arranca.', 'd14/10 a', 'st bleed 2; drain hp 20', { v2: 'shukketsu' }),
  ],
  // as bases ofensivas que só tinham uma variação elemental ganham as outras: cada Vínculo leva a lâmina para o seu lado
  'Golpe Giratório': [
    N('Giro Gélido', 'A volta arrasta o frio da água e deixa os pés presos.', 'd14/9 a', 'st frozen 1 40%', { v2: 'susanoo' }),
    N('Giro de Vento', 'O giro abre um vazio no ar e empurra todos para longe.', 'd14/9 a', 'push 40', { v2: 'fuhaku' }),
    N('Giro Rubro', 'A lâmina volta molhada: o giro arranca vida de quem atravessa.', 'd14/10 a', 'st bleed 2; drain hp 20', { v2: 'shukketsu' }),
    N('Giro Pétreo', 'O peso da rocha entra na volta e quebra a guarda.', 'd16/10 a', 'brk 1; st down 1 40%', { v2: 'atlas' }),
  ],
  'Tiro Certeiro': [
    N('Tiro de Brasa', 'A bala sai incandescente e queima onde para.', 'd18/7', 'st burn 2', { req: 'dist', v2: 'kagutsuchi' }),
    N('Tiro Gélido', 'Uma bala fria que trava o alvo no lugar.', 'd18/7', 'st frozen 1 40%', { req: 'dist', v2: 'susanoo' }),
    N('Tiro Ofuscante', 'O clarão da bala cega quem olha de frente.', 'd18/7', 'st blind 2', { req: 'dist', v2: 'amaterasu' }),
    N('Tiro Rubro', 'A bala abre a veia e leva a vida pelo buraco.', 'd18/8', 'st bleed 2; drain hp 20', { req: 'dist', v2: 'shukketsu' }),
  ],
  'Grito de Guerra': [
    N('Grito Ardente', 'O grito incendeia o sangue dos aliados e arde nos inimigos.', 'u/7 a', 'st atkUp 2; st burn 1 foes', { v2: 'kagutsuchi' }),
    N('Grito Solar', 'O grito vem com a luz do dia e ofusca quem estiver na frente.', 'u/7 a', 'st atkUp 2; st blind 1 foes', { v2: 'amaterasu' }),
  ],
  'Riposte': [
    N('Riposte Gélida', 'A resposta vem fria e trava o braço de quem atacou.', 'd16/7', 'st frozen 1 40%', { v2: 'susanoo' }),
    N('Riposte Rubra', 'A resposta corta fundo e leva a vida de volta.', 'd16/7', 'st bleed 2; drain hp 20', { v2: 'shukketsu' }),
    N('Riposte em Chamas', 'A lâmina responde em brasa.', 'd16/7', 'st burn 2', { v2: 'kagutsuchi' }),
  ],
  'Golpe do Caçador': [
    N('Golpe Rubro do Caçador', 'A estaca abre a veia da presa e a vida escorre para o caçador.', 'd20/8', 'st bleed 2; drain hp 20', { v2: 'shukketsu' }),
    N('Golpe Peçonhento do Caçador', 'A lâmina vai untada de veneno de caça.', 'd18/8', 'st poison 2', { v2: 'hiruko' }),
    N('Golpe Ardente do Caçador', 'Lâmina em brasa, para quem se esconde na sombra.', 'd20/8', 'vs demon 1.5; st burn 1', { v2: 'kagutsuchi' }),
  ],
  'Granada de Mão': [
    N('Granada Incendiária', 'Estoura em labaredas e deixa tudo em brasa.', 'd12/8 a', 'st burn 2', { v2: 'kagutsuchi' }),
    N('Granada de Choque', 'A explosão solta uma descarga que trava os músculos.', 'd12/8 a', 'st para 1 40%', { v2: 'indra' }),
    N('Granada de Gelo Seco', 'Rebenta numa nuvem gelada que prende quem está dentro.', 'd10/8 a', 'st frozen 1 40%', { v2: 'susanoo' }),
  ],
  'Golpe Limite': [
    N('Limite Trovejante', 'O Limite cai com um estrondo que trava o campo todo.', 'L46', 'st para 1 50%', { v2: 'indra' }),
    N('Limite Rubro', 'O Limite abre todas as feridas ao mesmo tempo.', 'L46', 'st bleed 3; drain hp 15', { v2: 'shukketsu' }),
  ],
  'Golpe Quebra-Guarda': [
    N('Quebra-Guarda Detonador', 'Toda a pressão guardada vai num único golpe.', 'd20/9', 'burst impeto .4; brk 2'),
  ],
  'Dedo-Pistola': [
    N('Dedo-Pistola Que Acumula', 'Cada disparo afina o próximo.', 'd14/7', 'stack impeto 5; sure'),
    N('Dedo-Pistola Detonador', 'Todo o ímpeto guardado sai num disparo só.', 'd22/9', 'burst impeto .4'),
    N('Dedo-Pistola Rubro', 'A bala de dedo abre a veia e leva a vida junto.', 'd20/8', 'st bleed 2; drain hp 20', { v2: 'shukketsu' }),
  ],
};
export const ABRIR = {
  // Dinamite com Pavio (camada 4) → 6 nós
  'Dinamite com Pavio': [
    N('Dinamite Dupla', 'Dois bastões acesos na mesma mão.', 'd9/8 a x2', 'st stun 1 20%'),
    N('Dinamite de Pavio Curto', 'O pavio é tão curto que explode antes de cair.', 'd14/9 a', 'sure'),
    N('Dinamite de Estilhaços', 'Cada bastão se parte em lascas que cortam.', 'd14/10 a', 'st bleed 2'),
    N('Dinamite Retardada', 'Fica plantada no chão até o momento certo.', 'd10/9 a', 'seal 40 2'),
    N('Dinamite em Cadeia', 'Uma explosão acende a seguinte, e a seguinte.', 'd16/11 a', 'echo 60'),
    N('Dinamite Demolidora', 'Um feixe inteiro, de uma vez, no lugar certo.', 'd22/13 a', 'brk 2; st stun 1 40%'),
  ],
  // Mata-Leão (camada 5) → 5 nós
  'Mata-Leão': [
    N('Mata-Leão Firme', 'O braço aperta e não solta mais.', 'd12/8', 'st root 1 50%'),
    N('Mata-Leão Sufocante', 'Sem ar, o alvo apaga por um instante.', 'd14/9', 'st stun 1 40%'),
    N('Mata-Leão Que Acumula', 'Cada segundo de aperto pesa no próximo.', 'd10/9', 'stack impeto 5; st root 1'),
    N('Mata-Leão Detonador', 'Todo o aperto guardado solta num estalo.', 'd20/11', 'burst impeto .4; st stun 1'),
    N('Mata-Leão Definitivo', 'Quando o corpo cede, a luta termina.', 'd24/12', 'st stun 2; vs exposed 1.5'),
  ],
  // Estocada Precisa (camada 6) → 4 nós
  'Estocada Precisa': [
    N('Estocada Dupla', 'Duas pontas no mesmo vão da armadura.', 'd10/9 x2', 'pierce 30'),
    N('Estocada Que Fura', 'A ponta passa pela guarda como se não houvesse.', 'd18/10', 'pierce 60'),
    N('Estocada Que Acumula', 'Cada ponta afina a mão do próximo golpe.', 'd12/10', 'stack impeto 5; sure'),
    N('Estocada Detonadora', 'Toda a precisão guardada sai numa estocada só.', 'd24/12', 'burst impeto .4; pierce 60'),
  ],
  // Malho no Tempo (camada 5) → 5 nós
  'Malho no Tempo': [
    N('Malho Duplo', 'Dois golpes de malho no compasso certo.', 'd9/9 x2', ''),
    N('Malho Que Abala', 'O compasso bate no osso e atordoa.', 'd16/10', 'st stun 1 30%'),
    N('Malho Que Acumula', 'Cada batida deixa o próximo malho mais pesado.', 'd12/10', 'stack impeto 5; brk 1'),
    N('Malho Detonador', 'Todo o tempo guardado cai numa pancada só.', 'd22/12', 'burst impeto .4; brk 1'),
    N('Malho Final', 'A última batida do compasso, a que não se levanta.', 'd26/13', 'brk 2; st down 1 50%'),
  ],

  // ---------- Leva 12b: linhas novas para bases ofensivas e de controle sem linha ----------
  // Disparo Impactante (camada 5) → 6 nós
  'Disparo Impactante': [
    N('Disparo Impactante Duplo', 'Dois estampidos, um no ombro e outro no joelho.', 'd8/9 x2', 'brk 1'),
    N('Disparo Que Arromba', 'O impacto abre a guarda como quem arromba uma porta.', 'd16/10', 'brk 1; st exposed 1'),
    N('Disparo Que Derruba o Gigante', 'Nem o maior fica de pé depois do tranco.', 'd16/11', 'st down 1 60%; push 40'),
    N('Disparo Impactante Que Acumula', 'Cada estampido deixa o tiro seguinte mais pesado.', 'd12/11', 'stack impeto 5; brk 1'),
    N('Disparo Impactante Detonador', 'Todo o tranco guardado sai num tiro só.', 'd24/13', 'burst impeto .4; brk 2'),
    N('Disparo Impactante Final', 'Um tiro só, e a parede inteira vem abaixo.', 'd26/14', 'brk 2; st down 1 70%'),
  ],
  // Desarmar (camada 5) → 6 nós
  'Desarmar': [
    N('Desarme Duplo', 'Duas mãos, duas armas, um só movimento.', 'd9/9 x2', 'st disarm 1'),
    N('Desarme Que Dói', 'A arma cai e a mão fica dormente.', 'd12/9', 'st disarm 2; st atkDn 2'),
    N('Desarme e Marca', 'Sem arma, o alvo vira presa fácil.', 'd14/10', 'st disarm 2; st marked 2'),
    N('Desarme em Leque', 'Uma volta de lâmina limpa as armas de todos à frente.', 'd12/11 a', 'st disarm 1 50%'),
    N('Desarme Detonador', 'Toda a pressão guardada solta num único estalo.', 'd22/12', 'burst impeto .4; st disarm 2'),
    N('Desarme Definitivo', 'Sem arma, sem guarda, sem luta.', 'd24/13', 'st disarm 2; st exposed 2; vs exposed 1.5'),
  ],
  // Manobra de Empurrão (camada 5) → 6 nós
  'Manobra de Empurrão': [
    N('Ombrada Dupla', 'Dois ombros seguidos, o segundo mais fundo.', 'd8/8 x2', 'push 30'),
    N('Empurrão de Ombro', 'O ombro entra na costela e o alvo voa.', 'd16/9', 'push 90'),
    N('Ombrada Que Derruba', 'O alvo sai do chão antes de sair do lugar.', 'd14/9', 'push 60; st down 1 50%'),
    N('Empurrão da Linha de Escudos', 'Uma linha de escudos empurrando de uma vez.', 'd12/11 a', 'push 60'),
    N('Empurrão Contra a Parede', 'Sem espaço para recuar, o impacto dobra.', 'd18/11', 'push 40; brk 1; st stun 1 40%'),
    N('Empurrão Definitivo', 'Quem recebe, atravessa a sala.', 'd24/13 a', 'push 100; st down 1 60%'),
  ],
  // Bainha Carregada (camada 5) → 6 nós
  'Bainha Carregada': [
    N('Bainha Dupla', 'Dois saques no mesmo estalo.', 'd9/9 x2', 'pierce 30'),
    N('Bainha Que Estala', 'O estalo da lâmina acorda a mão e não deixa errar.', 'd14/9', 'sure; pierce 40'),
    N('Bainha em Dois Tempos', 'Saca, finge, saca de novo.', 'd12/10', 'st marked 1; pierce 50'),
    N('Bainha Que Acumula', 'Cada saque afina o próximo.', 'd12/10', 'stack impeto 5; pierce 40'),
    N('Bainha Detonadora', 'Toda a tensão da mola sai de uma vez.', 'd24/12', 'burst impeto .4; pierce 80'),
    N('Bainha Final', 'A lâmina sai uma vez só, e já está de volta.', 'd26/13', 'pierce 100; vs exposed 1.5'),
  ],
  // Tiro no Joelho (camada 5) → 6 nós
  'Tiro no Joelho': [
    N('Tiro no Joelho Duplo', 'Um tiro em cada perna.', 'd8/8 x2', 'st agiDn 1'),
    N('Tiro no Tendão', 'A perna falha e o passo não vem.', 'd14/9', 'st root 1 60%; st agiDn 2'),
    N('Tiro Que Prende no Chão', 'O alvo cai e não consegue levantar.', 'd14/10', 'st root 2; st down 1 40%'),
    N('Tiro em Todos os Joelhos', 'Uma rajada baixa, rente ao chão.', 'd12/11 a', 'st root 1 40%; st agiDn 1'),
    N('Tiro no Joelho Que Acumula', 'Cada perna quebrada afina a mira do próximo.', 'd12/10', 'stack impeto 5; st root 1'),
    N('Tiro no Joelho Final', 'Quem corria não corre mais.', 'd22/13', 'st root 2; st agiDn 3; vs root 1.5'),
  ],
  // Armadilha de Urso (camada 5) → 6 nós
  'Armadilha de Urso': [
    N('Armadilha de Urso Dupla', 'Duas armadilhas armadas lado a lado.', 'd9/9 x2', 'st root 1'),
    N('Armadilha Serrilhada', 'Os dentes mordem fundo e não largam.', 'd14/10', 'st root 2; st bleed 3'),
    N('Armadilha de Fosso', 'Um buraco coberto de folhas e cheio de estacas.', 'd16/10', 'st down 1 60%; st bleed 2'),
    N('Armadilha Que Espera', 'Fica armada até alguém pisar.', 'd14/11', 'seal 40 2; st root 2'),
    N('Armadilha em Campo', 'O chão todo vira armadilha.', 'd12/12 a', 'st root 1 50%; st bleed 2'),
    N('Armadilha Final', 'Quem entra no campo não sai mais dele.', 'd24/14 a', 'st root 2; st bleed 3; vs root 1.5'),
  ],
  // Flanquear (camada 5) → 6 nós
  'Flanquear': [
    N('Flanquear Duplo', 'Dois lados, duas lâminas.', 'd8/8 x2', 'st marked 1'),
    N('Flanquear Pelas Costas', 'A volta termina onde o alvo não olha.', 'd16/9', 'vs marked 1.5; st exposed 1'),
    N('Flanqueio em Pinça', 'Dois lados ao mesmo tempo.', 'd12/11 a', 'st marked 2'),
    N('Flanquear Que Acumula', 'Cada giro em volta do alvo pesa no próximo golpe.', 'd12/10', 'stack impeto 5; vs marked 1.4'),
    N('Flanqueio Detonador', 'Todo o cerco guardado sai num golpe só.', 'd24/13', 'burst impeto .4; vs marked 1.5'),
    N('Flanqueio Final', 'Cercado de todos os lados, o alvo só espera o golpe.', 'd26/14', 'vs marked 2; st exposed 2; st down 1 40%'),
  ],
  // Cotovelada Giratória (camada 5) → 6 nós
  'Cotovelada Giratória': [
    N('Cotovelada Dupla', 'Uma para cada lado, sem aviso.', 'd8/8 x2', 'st bleed 1'),
    N('Cotovelada Que Abre a Guarda', 'O osso do cotovelo corta como lâmina.', 'd14/9', 'st bleed 2; st exposed 1'),
    N('Cotovelada em Roda', 'Uma volta inteira de cotovelos.', 'd12/11 a', 'st bleed 2'),
    N('Cotovelada Que Acumula', 'Cada giro pega embalo no anterior.', 'd12/10', 'stack impeto 5; st bleed 2'),
    N('Cotovelada Detonadora', 'Todo o embalo guardado vai na ponta do osso.', 'd22/12', 'burst impeto .4; st bleed 2'),
    N('Cotovelada Final', 'O giro termina onde o alvo menos esperava.', 'd24/13', 'st bleed 3; st stun 1 40%; brk 1'),
  ],
  // Arremesso de Ponte (camada 6) → 4 nós
  'Arremesso de Ponte': [
    N('Arremesso Duplo', 'Um arremesso e, sem soltar, outro.', 'd9/9 x2', 'st down 1 40%'),
    N('Arremesso Que Quebra', 'O alvo cai de costas e o ar vai embora.', 'd18/11', 'st stun 1 50%; brk 1'),
    N('Arremesso em Cima dos Outros', 'O corpo vira projétil contra a linha.', 'd16/12 a', 'st down 1 50%; push 40'),
    N('Arremesso Final', 'Uma ponte inteira desce de uma vez.', 'd26/14', 'st stun 2; brk 2; st down 1 60%'),
  ],
  // Armadilha Marcada (camada 6) → 4 nós
  'Armadilha Marcada': [
    N('Armadilha Marcada Dupla', 'Duas marcas no mesmo chão.', 'd10/9 x2', 'pop 1.3'),
    N('Armadilha em Cadeia', 'Uma estoura e dispara a vizinha.', 'd14/10 a', 'pop 1.5; st root 1'),
    N('Armadilha Marcada Que Acumula', 'Cada marca pisada deixa a seguinte mais pesada.', 'd12/11', 'stack impeto 5; pop 1.5'),
    N('Armadilha Marcada Final', 'A presa já estava marcada antes de pisar.', 'd24/13', 'pop 2.4; st root 2; st bleed 2'),
  ],
  // Aú Batido (camada 6) → 4 nós
  'Aú Batido': [
    N('Aú Duplo', 'Dois pés, duas batidas.', 'd9/9 x2', 'st stun 1 25%'),
    N('Aú Que Gira no Ar', 'Cai de cabeça para baixo e derruba quem estiver perto.', 'd14/10', 'st stun 1 45%; st down 1 30%'),
    N('Aú em Roda', 'Uma cambalhota que passa por todos.', 'd12/11 a', 'st stun 1 35%'),
    N('Aú Final', 'O pé que desce de cima, sem aviso.', 'd22/13', 'st stun 2; brk 1'),
  ],
  // Rabo de Arraia (camada 7) → 3 nós
  'Rabo de Arraia': [
    N('Rabo de Arraia Duplo', 'A perna varre e volta.', 'd8/8 x2', 'st down 1 30%'),
    N('Rabo de Arraia em Roda', 'A perna varre a roda inteira.', 'd12/10 a', 'st down 1 50%'),
    N('Rabo de Arraia Final', 'Ninguém fica de pé dentro do alcance.', 'd22/13 a', 'st down 2 60%; brk 1'),
  ],
  // Fio de Aço (camada 7) → 3 nós
  'Fio de Aço': [
    N('Fio de Aço Duplo', 'Dois fios, dois nós.', 'd8/8 x2', 'st root 1 50%'),
    N('Fio de Aço Que Corta', 'O fio aperta até abrir a carne.', 'd14/10', 'st root 1; st bleed 3'),
    N('Fio de Aço Final', 'Uma teia inteira de fios, e ninguém sai dela.', 'd20/13 a', 'st root 2; st bleed 2; st exposed 1'),
  ],
  // Esmagar a Postura (camada 7) → 3 nós
  'Esmagar a Postura': [
    N('Esmagada Dupla', 'Dois golpes no mesmo ponto da guarda.', 'd8/9 x2', 'brk 1'),
    N('Esmagar a Guarda Inteira', 'O golpe passa por todos à frente.', 'd14/11 a', 'brk 1; st exposed 1'),
    N('Esmagar a Postura Final', 'Depois dele, não há mais postura para esmagar.', 'd24/13', 'brk 3; st down 1 60%'),
  ],
  // Cem Pontos de Pressão, Baioneta Calada (camada 8) → 2 nós cada
  'Cem Pontos de Pressão': [
    N('Cem Pontos Que Travam', 'Cada ponto desliga um pedaço do corpo.', 'd14/10', 'st stun 1 60%; st silence 1'),
    N('Cem Pontos de Pressão Final', 'Todos os pontos, na ordem certa.', 'd22/12', 'st stun 2; st atkDn 2'),
  ],
  'Baioneta Calada': [
    N('Baioneta Dupla', 'Duas estocadas curtas.', 'd9/9 x2', 'pierce 50'),
    N('Baioneta Final', 'A ponta atravessa e a carga continua.', 'd24/12', 'pierce 100; st bleed 3'),
  ],
};

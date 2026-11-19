// Leva 11 (19/11/2026): técnicas desenhadas no lugar dos "Treino de X · n" genéricos (arvore/camadas.js, ligarRamos).
// Cada lista é a corrente entre a técnica-base e a ponta do caminho curto, em ordem de grau (1 = logo depois da base).
// O poder, o custo e o XP vêm da camada (aplicar); aqui só o desenho importa. Tema: sempre o do dono (ou o da combinação, se a base for v2).
// Notação: N() de arvore/l8.js.
import { N } from './l8.js';

export const MEIO = {
  // ---------- Kagutsuchi (fogo) ----------
  'Soco Flamejante': [
    N('Soco em Brasa', 'O punho chega já em brasa.', 'd10/5', 'st burn 1'),
    N('Soco Duplo em Brasa', 'Dois socos quentes, um em cima do outro.', 'd10/6 x2', 'st burn 1'),
    N('Punho de Carvão Vivo', 'O punho vira carvão aceso e racha a guarda.', 'd12/7', 'brk 1; st burn 1'),
    N('Soco de Magma', 'O soco escorre como magma e empurra o alvo.', 'd14/8', 'st burn 2; push 15'),
  ],
  'Lança Ardente': [
    N('Lança em Brasa', 'A ponta da lança fica vermelha antes do golpe.', 'd10/5', 'st burn 1'),
    N('Estocada Fumegante', 'A estocada passa pela fumaça e pela armadura.', 'd12/6', 'pierce 30'),
    N('Lança de Ferro Rubro', 'Ferro em brasa que fura e queima.', 'd12/7', 'pierce 40; st burn 1'),
    N('Estocada Que Cauteriza', 'Fere mais fundo quem já está queimando.', 'd14/8', 'vs burn 1.3'),
  ],
  'Corte Ígneo': [
    N('Corte Ígneo Cruzado', 'Dois cortes em chamas, em X.', 'd12/8 x2', 'st burn 2'),
    N('Corte da Forja Aberta', 'A lâmina sai da forja direto para o alvo.', 'd16/10', 'pierce 60; st burn 2'),
  ],
  'Rajada Incandescente': [
    N('Rajada de Fagulhas', 'Uma chuva de fagulhas sobre todos.', 'd10/8 a', 'st burn 1 40%'),
    N('Tiro de Brasa Concentrada', 'Toda a rajada num tiro só.', 'd14/8', 'pierce 30; st burn 1'),
  ],
  'Centelha': [
    N('Centelha Dupla', 'Duas centelhas seguidas.', 'd6/3 x2'),
    N('Brasa Lançada', 'A centelha cai e pega.', 'd8/3', 'st burn 1 40%'),
    N('Centelha Certeira', 'A centelha entra pela fresta.', 'd8/3', 'pierce 20'),
    N('Fagulha Que Pega', 'Arde mais em quem já arde.', 'd8/3', 'vs burn 1.3'),
    N('Chuvisco de Fagulhas', 'Fagulhas miúdas caem sobre todos.', 'd6/4 a'),
    N('Centelha Fervente', 'Uma centelha tão quente que ferve o ar.', 'd8/4', 'st burn 1 50%'),
  ],
  'Dragão de Brasa': [
    N('Dragão de Fagulhas', 'O dragão se desfaz em fagulhas sobre todos.', 'd10/8 a', 'st burn 1'),
    N('Dragão de Brasa Voraz', 'O dragão morde fundo e não solta o fogo.', 'd12/8', 'st burn 2; pierce 20'),
  ],
  'Golpe de Forja': [
    N('Golpe de Forja Rubro', 'O martelo da forja cai ainda em brasa.', 'd12/6', 'brk 1; st burn 1'),
    N('Martelada em Brasa', 'A martelada abre a guarda e deixa o fogo entrar.', 'd12/7', 'st burn 2; st exposed 1'),
  ],
  'Leque de Centelhas': [
    N('Leque Crepitante', 'O leque estala e as centelhas pegam.', 'd10/8 a', 'st burn 1 45%'),
    N('Leque de Centelhas Teimosas', 'Centelhas que não apagam por nada.', 'd10/9 a', 'st burn 2 45%'),
  ],

  // ---------- Susanoo (água, chuva, tempestade, gelo) ----------
  'Soco de Onda': [
    N('Soco de Ressaca', 'O soco puxa e empurra como a ressaca.', 'd12/6', 'push 20'),
    N('Soco Encharcado', 'O punho chega pingando e deixa o alvo encharcado.', 'd12/6', 'st wet 2'),
    N('Punho de Corrente', 'Uma corrente de água vai junto com o punho.', 'd12/7', 'st wet 1; push 25'),
    N('Soco da Onda Quebrando', 'O soco quebra como a onda na pedra.', 'd14/8', 'brk 1; push 30'),
  ],
  "Lança d'Água": [
    N("Lança d'Água Gelada", 'A lança de água congela no caminho.', 'd12/7', 'pierce 60; st frozen 1 20%'),
    N('Lança de Pressão', 'Água tão apertada que fura o aço.', 'd14/7', 'pierce 80'),
    N('Arpão Líquido', 'A água prende o alvo como um arpão.', 'd12/8', 'pierce 60; st root 1'),
    N('Lança de Maré', 'A lança vem com o peso da maré inteira.', 'd14/8', 'pierce 70; st wet 2'),
  ],
  'Gume Líquido': [
    N('Gume de Correnteza', 'O gume escorre e deixa o alvo molhado.', 'd10/5', 'st wet 1'),
    N('Gume Que Escorre', 'Dois cortes líquidos que não param.', 'd8/6 x2', 'st wet 1'),
  ],
  'Rajada Gélida': [
    N('Rajada de Granizo', 'Granizo fino sobre todos os inimigos.', 'd10/8 a', 'st frozen 1 25%'),
    N('Tiro de Água Pesada', 'Um tiro de água que pesa como chumbo.', 'd14/7', 'push 25; st wet 1'),
  ],
  "Jato d'Água": [
    N('Jato Duplo', 'Dois jatos seguidos.', 'd6/3 x2'),
    N('Jato Encharcante', 'O jato deixa o alvo encharcado.', 'd8/3', 'st wet 1'),
    N('Jato Forte', 'Um jato que empurra.', 'd8/3', 'push 15'),
    N('Jato Fino', 'Um jato fino que acha a fresta.', 'd8/3', 'pierce 20'),
    N('Jato em Esguicho', 'O jato se abre em esguicho sobre todos.', 'd6/4 a'),
    N('Jato Quente', 'Pesa mais em quem já está molhado.', 'd8/4', 'vs wet 1.3'),
  ],
  'Corte de Maré Baixa': [
    N('Corte da Maré Vazante', 'A maré recua e leva a força do alvo junto.', 'd12/7', 'st wet 2; st atkDn 1 30%'),
    N('Corte de Maré Cheia', 'A maré volta de uma vez, cheia.', 'd14/8', 'st wet 2; push 20'),
  ],
  'Jato em Leque': [
    N('Leque Encharcante', 'Todos ficam ensopados.', 'd10/8 a', 'st wet 2'),
    N('Leque de Água Pesada', 'Água pesada sobre quem já está molhado.', 'd10/9 a', 'st wet 1; vs wet 1.2'),
  ],

  // ---------- Atlas (terra, metal, peso) ----------
  'Lança de Granito': [
    N('Lança de Basalto', 'Basalto pesado que fura e derruba.', 'd12/7', 'pierce 100; st down 1 20%'),
    N('Lança Lascada', 'A ponta lascada abre a ferida.', 'd12/7', 'pierce 80; st bleed 1'),
    N('Lança de Ferro Fundido', 'Ferro fundido, sem fresta, sem pena.', 'd14/8', 'pierce 100; brk 1'),
    N('Lança da Falha Geológica', 'A lança abre uma falha no alvo.', 'd14/8', 'pierce 90; st exposed 1'),
  ],
  'Soco de Pedra': [
    N('Soco de Pedra Pesada', 'O peso da pedra derruba.', 'd12/6', 'st down 1 30%'),
    N('Soco de Ferro Batido', 'O punho de ferro amassa a guarda.', 'd12/6', 'brk 1'),
    N('Soco Que Racha', 'O soco racha a defesa do alvo.', 'd12/7', 'st defDn 1'),
    N('Punho de Rocha Negra', 'Basalto inteiro no punho.', 'd14/8', 'brk 1; st down 1 30%'),
  ],
  'Rajada de Estilhaços': [
    N('Rajada de Cascalho', 'Cascalho afiado sobre todos.', 'd12/10 a', 'st bleed 1 30%'),
    N('Tiro de Rocha Maciça', 'Uma rocha inteira, em linha reta.', 'd18/10', 'push 40; st down 1'),
  ],
  'Corte Sísmico': [
    N('Corte de Falha', 'O corte segue a falha do chão e derruba.', 'd10/6', 'st down 1 30%'),
    N('Corte de Pedra Partida', 'A pedra se parte junto com a guarda.', 'd12/6', 'brk 1'),
  ],
  'Estilhaço': [
    N('Estilhaço Duplo', 'Dois estilhaços de uma vez.', 'd6/3 x2'),
    N('Estilhaço Cortante', 'A lasca corta e abre ferida.', 'd8/3', 'st bleed 1 30%'),
    N('Estilhaço Pesado', 'Uma lasca pesada que derruba.', 'd8/3', 'st down 1 20%'),
    N('Estilhaço Perfurante', 'A lasca entra pela armadura.', 'd8/3', 'pierce 20'),
    N('Estilhaço em Leque', 'Lascas para todos os lados.', 'd6/4 a'),
    N('Estilhaço de Ferro', 'Uma lasca de ferro que amassa a guarda.', 'd8/4', 'brk 1'),
  ],
  'Tremor Profundo': [
    N('Tremor Que Abre Fendas', 'O chão se abre em fendas sob todos.', 'd10/8 a', 'st down 1 25%'),
    N('Tremor Arenoso', 'O chão vira areia e ninguém firma o pé.', 'd10/8 a', 'st exposed 1'),
  ],
  'Montanha em Erupção': [
    N('Montanha Que Desaba', 'A encosta inteira desce sobre os inimigos.', 'd18/14 a', 'st down 1; brk 1'),
    N('Erupção de Rocha Viva', 'Rocha derretida sobe do chão e cai de novo.', 'd18/15 a', 'st burn 2; st down 1'),
  ],
  'Chuva de Estilhaços': [
    N('Revoada de Lascas', 'Lascas finas voam sobre todos.', 'd10/8 a', 'st bleed 1 35%'),
    N('Queda de Ferro', 'Ferro pesado cai do alto.', 'd10/9 a', 'st bleed 1; brk 1'),
  ],

  // ---------- Indra (trovão, eletricidade, paralisia) ----------
  'Lança Condutora': [
    N('Lança Carregada', 'A lança zumbe antes de tocar.', 'd10/5', 'st para 1 20%'),
    N('Estocada Faiscante', 'A estocada solta faíscas pela armadura.', 'd12/6', 'pierce 30'),
    N('Lança de Cobre', 'O cobre leva o choque para o vizinho.', 'd12/7', 'chain 1 .6'),
    N('Lança Que Atrai o Raio', 'A lança chama o raio para dentro do alvo.', 'd14/8', 'pierce 40; st para 1 30%'),
  ],
  'Soco Estático': [
    N('Soco Eletrizado', 'O soco dá choque.', 'd10/5', 'st para 1 20%'),
    N('Soco de Dínamo', 'Dois socos girando como um dínamo.', 'd10/6 x2'),
    N('Punho de Bobina', 'O punho enrolado em bobina amassa e paralisa.', 'd12/7', 'st para 1 30%; brk 1'),
    N('Soco de Descarga', 'A descarga salta para quem estiver perto.', 'd14/8', 'chain 1 .6'),
  ],
  'Lâmina Elétrica': [
    N('Lâmina Zumbidora', 'Dois cortes que zumbem.', 'd8/6 x2', 'st para 1 15%'),
    N('Sabre Faiscante', 'O sabre fura e trava os músculos.', 'd12/7', 'pierce 30; st para 1 20%'),
  ],
  'Bala Tesla': [
    N('Bala Tesla Ricocheteante', 'A bala pula de alvo em alvo.', 'd14/9', 'chain 2 .7'),
    N('Bala de Arco Voltaico', 'Um arco voltaico sai da bala e prende o alvo.', 'd16/10', 'chain 1 .8; st para 1 30%'),
  ],
  'Pedra Imantada': [
    N('Rocha Imantada', 'A pedra puxa o raio e trava o alvo.', 'd10/6', 'rs atlas 1.5; st para 1 20%'),
    N('Ímã de Trovão', 'Um ímã tão forte que o trovão cai nele.', 'd12/7', 'rs atlas 1.6'),
  ],
  'Faísca': [
    N('Faísca Tripla', 'Três faíscas seguidas.', 'd6/3 x3'),
    N('Faísca Paralisante', 'A faísca trava o músculo.', 'd8/3', 'st para 1 25%'),
    N('Faísca Que Pula', 'A faísca pula para o vizinho.', 'd8/3', 'chain 1 .5'),
    N('Faísca Perfurante', 'A faísca entra pela armadura.', 'd8/3', 'pierce 20'),
    N('Chuvisco de Faíscas', 'Faíscas miúdas sobre todos.', 'd6/4 a'),
    N('Faísca Carregada', 'Pesa mais em quem já está paralisado.', 'd8/4', 'vs para 1.3'),
  ],
  'Estalos em Fila': [
    N('Estalos em Cadeia', 'Os estalos correm de alvo em alvo.', 'd8/7 x3', 'chain 1 .5'),
    N('Estalos Que Travam', 'Três estalos que travam os músculos.', 'd8/7 x3', 'st para 1 20%'),
  ],
  'Fio de Raio': [
    N('Fio de Raio Duplo', 'Dois fios de raio, lado a lado.', 'd8/6 x2'),
    N('Fio de Raio Que Trava', 'O fio se enrola e trava o corpo.', 'd12/6', 'st para 1 25%'),
  ],
  'Raio Molhado': [
    N('Raio na Chuva', 'O raio cai na chuva e acha o alvo molhado.', 'd10/6', 'st wet 1; st para 1 30%'),
    N('Raio Que Corre na Água', 'O raio corre pela água até o próximo.', 'd12/7', 'chain 1 .6; st wet 1'),
    N('Descarga Encharcada', 'A descarga pesa em quem está molhado.', 'd12/7', 'vs wet 1.4'),
    N('Raio da Tormenta', 'Uma tormenta de raios sobre todos.', 'd12/9 a', 'st para 1 30%'),
  ],

  // ---------- Fuhaku (vento; gelo só de ar frio de altitude) ----------
  'Golpe de Ar': [
    N('Golpe de Ar Comprimido', 'O ar apertado no punho estoura no alvo.', 'd12/6', 'push 25'),
    N('Golpe de Rajada', 'Dois golpes como duas rajadas.', 'd10/6 x2'),
    N('Golpe de Ar Cortante', 'O ar do golpe corta a pele.', 'd12/7', 'st bleed 1'),
    N('Golpe do Redemoinho', 'O golpe gira e leva todos junto.', 'd12/9 a', 'push 20'),
  ],
  'Lança de Ar': [
    N('Lança de Ar Afiada', 'Ar afiado como ponta de lança.', 'd10/5', 'pierce 30'),
    N('Estocada de Vento', 'A estocada empurra o alvo para trás.', 'd12/6', 'push 20'),
    N('Lança de Ar Rarefeito', 'O ar some em volta do alvo e tira o fôlego.', 'd12/7', 'pierce 40; st atkDn 1 25%'),
    N('Lança Espiral', 'O ar gira em espiral e abre a ferida.', 'd14/8', 'pierce 50; st bleed 1'),
  ],
  'Duelo de Ventos': [
    N('Duelo de Lâminas de Ar', 'Dois ventos se cruzam no alvo.', 'd12/9 x2', 'st bleed 1'),
    N('Duelo do Vento Alto', 'Três ventos de altitude, um atrás do outro.', 'd12/10 x3', 'st bleed 1; push 15'),
  ],
  'Leque de Balas': [
    N('Leque de Balas ao Vento', 'O vento abre o leque e empurra todos.', 'd10/8 a', 'push 15'),
    N('Tiro de Corrente de Ar', 'Uma corrente de ar leva a bala mais longe.', 'd14/8', 'pierce 40; push 20'),
  ],
  'Lâmina de Vento': [
    N('Lâmina de Brisa', 'Duas lâminas leves de brisa.', 'd6/3 x2'),
    N('Lâmina Que Empurra', 'A lâmina empurra mais do que corta.', 'd8/3', 'push 20'),
    N('Lâmina Sibilante', 'A lâmina assobia e abre ferida.', 'd8/3', 'st bleed 1 25%'),
    N('Lâmina de Ar Fino', 'Ar fino que acha a fresta.', 'd8/3', 'pierce 20'),
    N('Lâminas em Roda', 'As lâminas giram em volta de todos.', 'd6/4 a'),
    N('Lâmina de Vento Gelado', 'Uma lâmina de ar frio, de muito alto.', 'd8/4', 'st frozen 1 15%'),
  ],
  'Vento Quente': [
    N('Vento Quente Cortante', 'O vento quente corta e queima.', 'd10/6', 'st burn 1; st bleed 1 20%'),
    N('Rajada Escaldante', 'Uma rajada quente que empurra.', 'd12/7', 'st burn 1; push 20'),
    N('Redemoinho Quente', 'O ar quente gira sobre todos.', 'd10/8 a', 'st burn 1'),
    N('Coluna de Ar Quente', 'Uma coluna de ar quente que arrasta.', 'd12/9 a', 'st burn 2; push 25'),
  ],
  'Corte Desarmante': [
    N('Corte Que Arranca', 'O corte arranca a arma da mão.', 'd10/6', 'st disarm 1 30%'),
    N('Corte do Vento Que Desarma', 'O vento leva a arma e a guarda junto.', 'd12/7', 'brk 1; st disarm 1 40%'),
  ],
  'Lâmina de Vento Dupla': [
    N('Lâmina Dupla Cruzada', 'Duas lâminas em X.', 'd8/6 x2', 'st bleed 1'),
    N('Lâmina Dupla Veloz', 'As lâminas saem e o corpo já está longe.', 'd8/6 x2', 'haste 15 self'),
    N('Lâminas Gêmeas Afiadas', 'Duas lâminas que passam pela armadura.', 'd8/7 x2', 'pierce 30'),
    N('Lâminas Gêmeas Silenciosas', 'Duas lâminas sem barulho que marcam o alvo.', 'd8/7 x2', 'st marked 1'),
  ],
  'Lâmina de Vento Larga': [
    N('Lâmina Larga em Arco', 'A lâmina larga varre em arco.', 'd10/8 a', 'push 15'),
    N('Lâmina de Vento Calmo', 'Um corte largo e calmo que abre ferida em todos.', 'd10/8 a', 'st bleed 1 25%'),
  ],

  // ---------- Amaterasu (sol, luz, purificação) ----------
  'Lança de Luz': [
    N('Lança de Luz Pura', 'A luz pura fere o que é demônio.', 'd12/7', 'vs demon 1.3'),
    N('Lança Cegante', 'A lança brilha demais para olhar.', 'd12/7', 'st blind 1 30%'),
    N('Lança do Raio de Sol', 'Um raio de sol em forma de lança.', 'd14/8', 'pierce 50'),
    N('Estocada Solar', 'A estocada atravessa como o sol atravessa a névoa.', 'd14/8', 'pierce 40; vs demon 1.2'),
  ],
  'Punho Radiante': [
    N('Punho de Luz', 'Dois socos de luz.', 'd10/6 x2'),
    N('Punho Purificador', 'O soco limpa o que é profano.', 'd12/7', 'vs demon 1.3'),
    N('Punho Cegante', 'O clarão do soco cega.', 'd12/7', 'st blind 1 30%'),
    N('Punho do Sol Nascente', 'O soco nasce como o sol, racha a guarda e ofusca.', 'd14/8', 'brk 1; st blind 1 20%'),
  ],
  'Rajada Sagrada': [
    N('Rajada de Luz', 'Luz sagrada sobre todos.', 'd10/8 a', 'vs demon 1.2'),
    N('Tiro Sagrado', 'Um tiro de luz concentrada.', 'd14/8', 'pierce 40; vs demon 1.3'),
  ],
  'Corte de Luz': [
    N('Corte Ofuscante', 'O corte brilha e cega.', 'd10/5', 'st blind 1 25%'),
    N('Corte Que Purifica', 'O corte limpa o que é demônio.', 'd12/6', 'vs demon 1.3'),
  ],
  'Luz Curativa': [
    N('Luz Morna', 'Uma luz morna que sara.', 'h6/3'),
    N('Luz Que Acalma', 'A luz tira o mal do corpo.', 'h6/3', 'cleanse'),
    N('Luz Que Protege', 'A luz fica em volta do aliado como escudo.', 'h6/3', 'shield 4'),
    N('Luz Constante', 'A luz continua sarando depois.', 'h6/3', 'st regen 1'),
    N('Raio Morno', 'A mesma luz, virada contra o inimigo.', 'd8/3'),
    N('Clarão da Luz Morna', 'A luz morna aperta até ofuscar.', 'd8/4', 'st blind 1 30%'),
  ],
  'Aurora Plena': [
    N('Aurora Suave', 'A aurora sara todos devagar.', 'h8/8 a', 'st regen 1'),
    N('Manhã da Aurora', 'A luz da manhã limpa todos.', 'h8/8 a', 'cleanse'),
  ],
  'Luz Elétrica': [
    N('Clarão Elétrico', 'Um clarão que cega e dá choque.', 'd10/6', 'st blind 1 20%; st para 1 20%'),
    N('Luz Que Conduz', 'A luz leva o raio para o próximo.', 'd12/7', 'chain 1 .6'),
    N('Relâmpago Dourado', 'Um relâmpago da cor do sol.', 'd12/7', 'st para 1 35%'),
    N('Coroa de Faíscas', 'Faíscas douradas sobre todos.', 'd12/9 a', 'st para 1 25%'),
  ],
  'Luz Curativa Ampla': [
    N('Luz Ampla Purificante', 'A luz limpa todos os aliados.', 'h8/8 a', 'cleanse'),
    N('Luz Ampla Que Protege', 'A luz cobre todos os aliados como escudo.', 'h8/8 a', 'shield 4'),
  ],

  // ---------- Tsukuyomi (lua, trevas, ilusão, sono, medo) ----------
  'Soco Entorpecente': [
    N('Soco Sonolento', 'O soco pesa nas pálpebras.', 'd12/6', 'st sleep 1 20%'),
    N('Soco da Sombra', 'Dois socos que vêm da sombra.', 'd10/6 x2'),
    N('Soco Que Assusta', 'O soco vem com a cara do medo.', 'd12/7', 'st fear 1 30%'),
    N('Punho do Eclipse', 'O soco apaga a luz e o ânimo.', 'd14/8', 'st blind 1 30%; st fear 1 20%'),
  ],
  'Lança de Sombra': [
    N('Lança Silenciosa', 'A lança passa sem fazer barulho.', 'd10/5', 'pierce 30'),
    N('Lança do Pesadelo', 'A ferida traz o pesadelo junto.', 'd12/6', 'st fear 1 25%'),
    N('Estocada Ilusória', 'A estocada é real; o corpo que ficou, não.', 'd12/7', 'st evade 1 self'),
    N('Lança da Meia-Noite', 'A lança da hora mais escura.', 'd14/8', 'pierce 40; st blind 1 25%'),
  ],
  'Rajada Sombria': [
    N('Rajada de Breu', 'O breu cobre todos os inimigos.', 'd10/8 a', 'st blind 1 25%'),
    N('Tiro da Lua Minguante', 'Um tiro fino como a lua minguante.', 'd14/8', 'pierce 40; st fear 1 20%'),
  ],
  'Corte da Penumbra': [
    N('Corte Silencioso', 'O corte marca o alvo sem ele perceber.', 'd10/5', 'st marked 1'),
    N('Faca da Ilusão', 'A faca parece maior do que é.', 'd12/6', 'st fear 1 25%'),
  ],
  'Sussurro Sombrio': [
    N('Sussurro Duplo', 'Duas vozes na cabeça do alvo.', 'm6/3 x2'),
    N('Sussurro Que Assusta', 'O sussurro diz o que o alvo mais teme.', 'm8/3', 'st fear 1 25%'),
    N('Sussurro Que Adormece', 'Uma canção de ninar baixinha.', 'm8/3', 'st sleep 1 15%'),
    N('Sussurro Confuso', 'As palavras se embaralham.', 'm8/3', 'st confuse 1 15%'),
    N('Murmúrio Que Se Espalha', 'O murmúrio chega a todos.', 'm6/4 a'),
    N('Sussurro Que Gela', 'O sussurro tira a força dos braços.', 'm8/4', 'st atkDn 1 25%'),
  ],
  'Chama Fria': [
    N('Chama Fria Ilusória', 'A chama não esquenta, mas queima e assusta.', 'd10/6', 'st burn 1; st fear 1 20%'),
    N('Fogo-Fátuo', 'Uma luz fria que queima e ofusca.', 'd12/7', 'st burn 1; st blind 1 20%'),
    N('Chama do Pesadelo', 'O fogo arde dentro do sonho.', 'm12/7', 'st burn 1; st fear 1 30%'),
    N('Fogueira de Pesadelos', 'Uma fogueira fria que assusta todos.', 'd10/9 a', 'st burn 1; st fear 1 25%'),
  ],
  'Coro de Sussurros': [
    N('Coro Que Adormece', 'O coro canta todos para dormir.', 'm10/8 a', 'st sleep 1 20%'),
    N('Coro do Terror', 'O coro grita o medo de cada um.', 'm10/9 a', 'st fear 1 35%'),
  ],

  // ---------- Shukketsu (sangue, dreno) ----------
  'Soco Rubro': [
    N('Soco Que Sangra', 'O soco abre a pele.', 'd12/6', 'st bleed 1'),
    N('Soco Sedento', 'O soco bebe um pouco do alvo.', 'd12/6', 'drain hp 20'),
    N('Soco Rubro Duplo', 'Dois socos vermelhos.', 'd10/7 x2', 'st bleed 1'),
    N('Punho Coagulado', 'Sangue duro no punho, que racha a guarda.', 'd14/8', 'brk 1; st bleed 1'),
  ],
  'Lança Sangrenta': [
    N('Lança Que Sangra', 'A lança abre ferida.', 'd10/5', 'st bleed 1'),
    N('Lança Sedenta', 'A lança bebe pelo ferimento.', 'd12/6', 'drain hp 20'),
    N('Empalamento Raso', 'Fura pouco, mas fura a armadura.', 'd12/7', 'pierce 30; st bleed 1'),
    N('Lança Hemorrágica', 'Pesa mais em quem já sangra.', 'd14/8', 'vs bleed 1.3'),
  ],
  'Talho Venoso': [
    N('Talho Que Bebe', 'O talho bebe o que sai dele.', 'd16/10', 'drain hp 30; st bleed 1'),
    N('Talho Que Estoura', 'As feridas abertas estouram juntas.', 'd16/10', 'det bleed 4'),
  ],
  'Rajada Escarlate': [
    N('Rajada de Gotas Rubras', 'Gotas de sangue duras como chumbo.', 'd10/8 a', 'st bleed 1 35%'),
    N('Tiro Coagulado', 'Um tiro de sangue coagulado.', 'd14/8', 'pierce 40; st bleed 1'),
  ],
  'Sangria': [
    N('Sangria Dupla', 'Dois cortes pequenos.', 'd6/3 x2'),
    N('Sangria Funda', 'O corte vai mais fundo.', 'd8/3', 'st bleed 1'),
    N('Sangria Sedenta', 'O corte bebe um pouco.', 'd8/3', 'drain hp 15'),
    N('Sangria Certeira', 'O corte acha a fresta.', 'd8/3', 'pierce 20'),
    N('Sangria em Leque', 'Cortes pequenos em todos.', 'd6/4 a'),
    N('Sangria Que Esfria', 'O sangue sai e a força vai junto.', 'd8/4', 'st atkDn 1 20%'),
  ],
  'Gota Escaldante': [
    N('Gota Fervente', 'Uma gota fervendo que queima e corta.', 'd10/6', 'st burn 1; st bleed 1 20%'),
    N('Sangue Fervendo', 'O sangue sai em brasa.', 'd12/7', 'st bleed 1; st burn 1'),
    N('Respingo Quente', 'Respingos quentes sobre todos.', 'd10/8 a', 'st burn 1'),
    N('Rio Escaldante', 'Um rio de sangue quente sobre todos.', 'd12/9 a', 'st bleed 2; st burn 1'),
  ],
  'Sangria Coletiva': [
    N('Sangria Coletiva Sedenta', 'Todos sangram e um pouco volta para você.', 'd10/8 a', 'drain hp 15'),
    N('Sangria Coletiva Profunda', 'Todos sangram mais fundo.', 'd10/9 a', 'st bleed 2'),
  ],

  // ---------- Hiruko (doença, veneno, mutação, radiação) ----------
  'Soco Corrosivo': [
    N('Soco Tóxico', 'O soco deixa veneno na pele.', 'd10/5', 'st poison 1'),
    N('Soco Ácido', 'O ácido come a defesa.', 'd12/6', 'st defDn 1'),
    N('Soco Mutante', 'O braço cresce no meio do golpe, duas vezes.', 'd10/7 x2'),
    N('Punho Radioativo', 'O punho brilha e contamina.', 'd14/8', 'st rad 1'),
  ],
  'Lança Tóxica': [
    N('Lança Envenenada', 'A ponta é veneno puro.', 'd10/5', 'st poison 1'),
    N('Lança Corrosiva', 'O veneno come a armadura no caminho.', 'd12/6', 'pierce 30; st poison 1'),
    N('Lança Febril', 'A ferida arde de febre.', 'd12/7', 'st poison 2'),
    N('Lança Mutante', 'A lança cresce dentro do alvo.', 'd14/8', 'pierce 40; st defDn 1'),
  ],
  'Bala Radioativa': [
    N('Bala Contaminada', 'A bala deixa veneno e radiação.', 'd14/9', 'st rad 1; st poison 1'),
    N('Bala de Isótopo', 'Uma bala instável que atravessa tudo.', 'd16/10', 'pierce 50; st rad 1'),
  ],
  'Lâmina Corrosiva': [
    N('Lâmina Ácida', 'O ácido da lâmina come a guarda.', 'd10/5', 'st defDn 1'),
    N('Lâmina Instável', 'A lâmina brilha e contamina.', 'd12/6', 'st rad 1'),
  ],
  'Núcleo Estável': [
    N('Núcleo Endurecido', 'O núcleo endurece o corpo por dentro.', 'p', 'def 3'),
    N('Núcleo Pulsante', 'O núcleo pulsa e o golpe vem mais forte.', 'p', 'atk 3'),
  ],
  'Raio Gama': [
    N('Raio Gama Duplo', 'Dois raios invisíveis.', 'd6/3 x2'),
    N('Raio Gama Tóxico', 'O raio deixa o corpo envenenado.', 'd8/3', 'st poison 1 30%'),
    N('Raio Gama Fino', 'O raio atravessa a armadura.', 'd8/3', 'pierce 20'),
    N('Raio Gama Disperso', 'O raio se espalha sobre todos.', 'd6/4 a'),
    N('Raio Gama Persistente', 'A radiação fica no corpo.', 'd8/3', 'st rad 1 30%'),
    N('Raio Gama Febril', 'Pesa mais em quem já está envenenado.', 'd8/4', 'vs poison 1.3'),
  ],
  'Suplex Duplo': [
    N('Suplex Infeccioso', 'Cada queda espalha a doença.', 'd10/7 x2', 'st poison 1; stack doenca 5 self'),
    N('Suplex Esmagador', 'Duas quedas que deixam o alvo no chão.', 'd10/7 x2', 'st down 1; stack doenca 5 self'),
  ],
  'Explosão Gama': [
    N('Explosão Gama Febril', 'A explosão deixa febre e radiação.', 'd10/9 a', 'st rad 1; st poison 1 25%'),
    N('Explosão Gama Mutante', 'A explosão deforma a defesa de todos.', 'd10/9 a', 'st rad 1; st defDn 1 25%'),
  ],
};

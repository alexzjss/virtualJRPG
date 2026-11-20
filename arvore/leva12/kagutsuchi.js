// Leva 12 (evolução lógica), setor kagutsuchi. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
import { N } from '../l8.js';

// variações de combinação (v2) que faltavam nas bases mais famosas do fogo
export const ESTENDER = {
  'Bola de Fogo': [
    N('Bola de Fogo Elétrica', 'A bola crepita e prende o alvo no choque.', 'd12/7', 'st burn 1; st para 1 40%', { v2: 'indra' }),
    N('Bola de Fogo Ventosa', 'Um vento forte sopra a bola e a espalha.', 'd10/8 a', 'st burn 2; push 30', { v2: 'fuhaku' }),
    N('Bola de Fogo Solar', 'Uma bola branca de luz e calor, que castiga os profanos.', 'd13/8', 'vs demon 1.4; st burn 2', { v2: 'amaterasu' }),
    N('Bola de Fogo Venenosa', 'A bola solta um fogo esverdeado que envenena.', 'd12/8', 'st burn 2; st poison 2', { v2: 'hiruko' }),
    N('Bola de Fogo de Água Fervente', 'Fogo e água num estouro de calor úmido.', 'd12/8 a', 'st burn 2; st exposed 1', { v2: 'susanoo' }),
  ],
  'Lança de Fogo': [
    N('Lança de Fogo Solar', 'A lança arde branca como o meio-dia e fura o que é impuro.', 'd16/10', 'pierce 80; vs demon 1.4', { v2: 'amaterasu' }),
    N('Lança de Fogo Venenosa', 'A ponta traz um fogo verde que corrói por dentro.', 'd16/10', 'pierce 60; st burn 2; st poison 2', { v2: 'hiruko' }),
  ],
};

// linhas novas: cada base ganha a cadeia X -> X Dupla -> variações -> X Detonador -> X Supremo
export const ABRIR = {
  'Bala Incendiária': [
    N('Bala Incendiária Dupla', 'Dois tiros seguidos, cada um com sua chama.', 'd8/6 x2', 'st burn 1'),
    N('Bala Traçante', 'Deixa um rastro de brasa que marca por onde passou.', 'd10/6', 'st marked 1; st burn 1'),
    N('Bala Perfurante em Brasa', 'O núcleo de metal rompe a armadura antes do fogo pegar.', 'd11/7', 'pierce 70; st burn 1'),
    N('Bala de Fósforo', 'O fósforo gruda e queima mais onde já há óleo.', 'd12/7', 'vs oil 1.8; st burn 2'),
    N('Bala Explosiva', 'Estoura no alvo e joga brasa em quem está perto.', 'd12/9 a', 'st burn 2; push 30'),
    N('Bala Incendiária Detonadora', 'A bala fica cravada e explode quando a chama pega.', 'd14/9', 'det burn 6'),
    N('Bala Incendiária Suprema', 'O último tiro do pente, com tudo que a forja deu.', 'd18/12', 'st burn 3; vs burn 1.8'),
  ],
  'Rajada Incandescente': [
    N('Rajada Incandescente Dupla', 'A rajada vai e volta, queimando duas vezes.', 'd9/9 a x2', 'st burn 1'),
    N('Rajada Rasteira', 'A rajada corre rente ao chão e derruba quem está de pé.', 'd11/9 a', 'st burn 1; st down 1 40%'),
    N('Rajada Que Se Alastra', 'As brasas saltam de um inimigo ao outro.', 'd12/10 a', 'st burn 2; spread burn'),
    N('Rajada Cruzada', 'Duas rajadas se cruzam e ninguém sai da linha de fogo.', 'd13/10 a x2', 'st burn 2'),
    N('Rajada Incandescente Detonadora', 'As brasas ficam pregadas e estouram juntas.', 'd14/11 a', 'det burn 7'),
    N('Rajada Incandescente Suprema', 'Uma rajada sem fim, que só para quando nada resta de pé.', 'd18/14 a', 'st burn 3; vs burn 1.7'),
  ],
  'Soco Flamejante': [
    N('Soco Flamejante Duplo', 'Dois socos de punho em chama, um atrás do outro.', 'd9/7 x2', 'st burn 1'),
    N('Soco Flamejante Que Gruda', 'O punho deixa brasa grudada na guarda.', 'd13/8', 'st burn 2; brk 1'),
    N('Soco Flamejante em Cadeia', 'A chama salta do alvo para o vizinho.', 'd13/9', 'st burn 2; chain 2 0.9'),
    N('Soco Flamejante Detonador', 'O soco planta a brasa e ela explode depois.', 'd15/10', 'det burn 6'),
    N('Soco Flamejante Supremo', 'O soco do ferreiro, com a forja inteira atrás.', 'd20/12', 'burst brasa 0.3; st burn 3'),
  ],
  'Punho Vulcânico': [
    N('Punho Vulcânico Duplo', 'Dois punhos de rocha derretida.', 'd12/9 x2', 'st burn 1'),
    N('Punho Vulcânico Esmagador', 'O punho cai com o peso de uma cratera.', 'd16/10', 'brk 2; st down 1 40%'),
    N('Punho Vulcânico de Rocha', 'O fogo abre e a rocha fecha: o chão sobe com o punho.', 'd17/11', 'st burn 2; st exposed 2', { v2: 'atlas' }),
    N('Punho Vulcânico Supremo', 'O punho que acorda o vulcão inteiro.', 'd22/13', 'st burn 3; vs burn 1.6'),
  ],
  'Inferno Rubro': [
    N('Inferno Rubro Duplo', 'O inferno estoura duas vezes sobre o campo.', 'd10/10 a x2', 'st burn 1'),
    N('Inferno Rubro Ventoso', 'Um vento forte empurra o inferno para o fundo da linha.', 'd12/11 a', 'st burn 2; push 35', { v2: 'fuhaku' }),
    N('Inferno Rubro Persistente', 'As chamas se agarram a quem já queima.', 'd14/11 a', 'st burn 2; per burn 12'),
    N('Inferno Rubro Alastrado', 'O inferno corre de um inimigo ao outro como fogo em palha seca.', 'd15/11 a', 'st burn 2; spread burn'),
    N('Inferno Rubro Detonador', 'O fogo fica latente e estoura de uma vez.', 'd16/12 a', 'det burn 8'),
    N('Inferno Rubro Supremo', 'Um inferno de verdade, sem borda e sem saída.', 'd20/14 a', 'burst brasa 0.4; vs burn 2'),
  ],
  'Combustão Súbita': [
    N('Combustão Dupla', 'Duas combustões encadeadas, uma na outra.', 'd12/9 x2', 'st burn 1'),
    N('Combustão em Cadeia', 'O alvo pega e o fogo salta para os vizinhos.', 'd14/10 a', 'st burn 2; spread burn'),
    N('Combustão Retardada', 'A brasa dorme dentro do alvo até estourar.', 'd16/11', 'seal 30 2; st burn 1'),
    N('Combustão Total', 'Tudo o que queima no campo estoura ao mesmo tempo.', 'd18/12 a', 'det burn 9'),
    N('Combustão Final', 'A última combustão: nada que queime fica de pé.', 'd22/14', 'det burn 12; st burn 3'),
  ],
  'Cauterizar': [
    N('Cauterizar em Todos', 'Uma lufada de calor fecha as feridas do grupo.', 'h/9 a', 'cleanse'),
    N('Cauterizar Profundo', 'A brasa fecha o corte por dentro e dá fôlego.', 'h/8', 'cleanse; st regen 2'),
    N('Cauterizar Rápido', 'Um toque de ferro quente, curto e imediato.', 'h/6 t60', 'cleanse'),
    N('Cauterizar com Fôlego', 'Fecha a ferida e devolve o ar que faltava.', 'h/8', 'gain aura 6; st regen 2'),
    N('Cauterizar e Proteger', 'A ferida fecha e a pele esquenta como armadura.', 'h/9', 'shield 14; st regen 2'),
    N('Cauterização Suprema', 'Nenhuma ferida resiste ao ferro em brasa do deus.', 'h/12 a', 'cleanse; st regen 3; shield 16'),
  ],
  // rodada 2: as bases ofensivas que ainda não tinham linha
  'Dardo de Brasa': [
    N('Dardo de Brasa Duplo', 'Dois dardos lançados na mesma piscada.', 'd9/6 x2', 'st burn 1'),
    N('Dardo de Brasa Cravado', 'O dardo fica fincado e a brasa continua acesa.', 'd12/7', 'st burn 2; per burn 8'),
    N('Dardo de Brasa Envenenado', 'A ponta traz um fogo verde que corrói por dentro.', 'd12/8', 'st burn 2; st poison 2', { v2: 'hiruko' }),
    N('Dardo de Brasa Perfurante', 'A ponta em brasa branca fura a guarda.', 'd13/8', 'pierce 70; st burn 1'),
    N('Dardo de Brasa Detonador', 'O dardo cravado estoura quando a chama pega.', 'd15/9', 'det burn 6'),
    N('Dardo de Brasa Supremo', 'O último dardo da aljava, com o calor da forja inteira.', 'd19/12', 'st burn 3; vs burn 1.7'),
  ],
  'Flecha Incandescente': [
    N('Flecha Incandescente Dupla', 'Duas flechas no mesmo arco, uma atrás da outra.', 'd10/8 x2', 'st burn 1'),
    N('Flecha Incandescente Rasante', 'Voa baixo e pega o alvo antes da guarda subir.', 'd13/8 t70', 'st burn 1; st exposed 1'),
    N('Flecha Incandescente Elétrica', 'A flecha crepita e prende o alvo no choque.', 'd14/9', 'st burn 2; st para 1 40%', { v2: 'indra' }),
    N('Flecha Incandescente Detonadora', 'A flecha se crava e explode em seguida.', 'd16/10', 'det burn 7'),
    N('Flecha Incandescente Suprema', 'Uma flecha que cruza o campo e deixa só brasa por onde passa.', 'd21/13', 'pierce 80; st burn 3'),
  ],
  'Chama Repetida': [
    N('Chama Repetida Dupla', 'A chama volta duas vezes, cada uma mais quente.', 'd10/5', 'echo 80'),
    N('Chama Repetida Acesa', 'A repetição acende o alvo e deixa a brasa ardendo.', 'd12/6', 'echo 70; st burn 2'),
    N('Chama Repetida da Terceira Vez', 'Na terceira vez a chama não perdoa.', 'd13/7', 'every 3 2.4; st burn 1'),
    N('Chama Repetida em Cadeia', 'A chama que volta salta para o vizinho.', 'd14/8 a', 'echo 70; spread burn'),
    N('Chama Repetida Detonadora', 'Cada eco deixa brasa; a última explode tudo.', 'd16/9', 'det burn 7; echo 60'),
    N('Chama Repetida Final', 'A chama que não termina: volta, volta e volta.', 'd20/12', 'echo 100; st burn 3'),
  ],
  'Incêndio Florestal': [
    N('Incêndio Florestal Duplo', 'O fogo pula duas vezes e queima o bosque todo.', 'd11/11 a x2', 'st burn 1'),
    N('Incêndio Florestal Seco', 'Tudo está seco: quem já queima, arde em dobro.', 'd13/12 a', 'st burn 2; vs burn 1.5'),
    N('Incêndio Florestal Persistente', 'As brasas se agarram e não deixam o fogo morrer.', 'd14/12 a', 'st burn 2; per burn 12'),
    N('Incêndio Florestal Ventoso', 'Um vendaval alimenta o fogo e o empurra para a frente.', 'd14/13 a', 'st burn 2; push 35', { v2: 'fuhaku' }),
    N('Incêndio Florestal Cercado', 'O fogo fecha o círculo e ninguém foge da brasa.', 'd16/13 a', 'st burn 2; st root 1'),
    N('Incêndio Florestal Detonador', 'O fogo dorme nas raízes e acorda de uma vez.', 'd18/14 a', 'det burn 9'),
    N('Incêndio Florestal Supremo', 'Nada de verde fica de pé; o fogo escolhe o que resta.', 'd23/16 a', 'spread burn; st burn 3; vs burn 1.8'),
  ],
  'Explosão de Proximidade': [
    N('Explosão de Proximidade Dupla', 'Duas explosões coladas na pele do alvo.', 'd13/7 x2', 'st burn 1; st exposed 1 self', { a: 'FOR' }),
    N('Explosão de Proximidade Rente', 'Encosta e estoura de uma vez, sem tempo de reação.', 'd17/7 t70', 'st burn 2; st exposed 1 self', { a: 'FOR' }),
    N('Explosão de Proximidade Empurrada', 'O estouro joga o alvo para longe.', 'd17/8', 'st burn 2; push 40; st exposed 1 self', { a: 'FOR' }),
    N('Explosão de Proximidade Quebradora', 'O estouro racha a guarda no ponto de contato.', 'd18/8', 'st burn 2; brk 2; st exposed 1 self', { a: 'FOR' }),
    N('Explosão de Proximidade em Cadeia', 'A explosão pega o vizinho e o próximo.', 'd19/9', 'chain 3 0.9; st burn 2; st exposed 1 self', { a: 'FOR' }),
    N('Explosão de Proximidade Detonadora', 'A mão deixa a brasa e o estouro vem depois.', 'd20/9', 'det burn 8; st exposed 1 self', { a: 'FOR' }),
    N('Explosão de Proximidade Suprema', 'Tudo que a mão guarda sai de uma vez, e o caçador paga o preço.', 'd26/12', 'burst brasa 0.35; st burn 3; st exposed 1 self', { a: 'FOR' }),
  ],
  'Chama Branca': [
    N('Chama Branca Dupla', 'Duas chamas sem cor, uma depois da outra.', 'd14/10 x2', 'pierce 70'),
    N('Chama Branca Cortante', 'A chama fina como lâmina corta o metal.', 'd26/10', 'pierce 85; st exposed 1'),
    N('Chama Branca Quebradora', 'O calor sem cor derrete a guarda.', 'd27/11', 'pierce 70; brk 2'),
    N('Chama Branca Solar', 'Tão branca que castiga os profanos.', 'd27/11', 'pierce 70; vs demon 1.5', { v2: 'amaterasu' }),
    N('Chama Branca Detonadora', 'A chama fica dentro do alvo e estoura sem cor.', 'd28/12', 'det burn 9; pierce 60'),
    N('Chama Branca Suprema', 'Não sobra nem a cor do que foi tocado.', 'd34/15', 'pierce 100; st burn 3'),
  ],
  'Chuva de Fagulhas': [
    N('Revoada de Fagulhas Dupla', 'Duas levas de fagulhas, uma sobre a outra.', 'd12/14 a x2', 'st burn 1'),
    N('Revoada de Fagulhas Densa', 'Tantas fagulhas que não sobra um palmo livre.', 'd14/15 a', 'st burn 2'),
    N('Revoada de Fagulhas Marcada', 'Cada fagulha deixa uma marca no alvo.', 'd13/14 a', 'brand 2; st burn 1'),
    N('Revoada de Fagulhas Persistente', 'As fagulhas grudam e ficam queimando.', 'd16/15 a', 'st burn 2; per burn 10'),
    N('Revoada de Fagulhas Detonadora', 'As fagulhas grudadas estouram juntas.', 'd18/16 a', 'det burn 9'),
    N('Revoada de Fagulhas Suprema', 'O céu inteiro vira brasa e cai sobre todos.', 'd23/19 a', 'burst brasa 0.3; st burn 3'),
  ],
  'Muralha de Fogo': [
    N('Muralha de Fogo Dupla', 'Duas paredes de chamas, uma atrás da outra.', 'd12/12 a x2', 'st burn 1; st defUp 2 self'),
    N('Muralha de Fogo Que Avança', 'A parede caminha e empurra o que estiver na frente.', 'd14/13 a', 'st burn 2; push 35; st defUp 2 self'),
    N('Muralha de Fogo Rochosa', 'Fogo e rocha erguem uma parede que também segura o golpe.', 'd15/14 a', 'st burn 2; shield 14', { v2: 'atlas' }),
    N('Muralha de Fogo Detonadora', 'A parede guarda o calor e explode ao cair.', 'd17/14 a', 'det burn 8; st defUp 2 self'),
    N('Muralha de Fogo Suprema', 'Uma muralha sem fim que queima quem chega e protege quem fica.', 'd21/17 a', 'st burn 3; shield 18; st defUp 3 self'),
  ],
  'Rio de Lava': [
    N('Rio de Lava Supremo', 'A lava corre sem leito, derrete o chão e leva tudo.', 'd28/19 a', 'st burn 3; vs burn 1.8; det burn 8'),
  ],
};

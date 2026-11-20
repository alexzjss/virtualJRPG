// Leva 12 (evolução lógica), setor indra. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
// Indra: as linhas existentes (Faísca, Descarga, Fio de Raio, Rede Elétrica, Interferência, Trovão Gêmeo) já vão até a camada 10,
// então não há o que estender; aqui abrimos linhas para bases que ainda não tinham variação.
// Cada linha precisa de (10 - camada da base) nós para chegar à camada 10 (tools/test.js confere).
// Cadeia de cada linha: X -> X Dupla -> X que marca/em área -> combinação (v2) -> X Detonador -> X Supremo.
import { N } from '../l8.js';
export const ESTENDER = {};
export const ABRIR = {
  // base na camada 5: 5 nós
  'Cadeia Elétrica': [
    N('Cadeia Dupla', 'A corrente salta duas vezes mais longe.', 'd14/8', 'chain 2 0.8'),
    N('Cadeia Que Marca', 'Cada elo que a corrente toca fica marcado.', 'd14/9', 'chain 2 0.7; st marked 2'),
    N('Cadeia Lunar', 'A corrente salta de sombra em sombra e deixa quem toca com medo.', 'd16/10', 'chain 2 0.8; st fear 1 40%', { v2: 'tsukuyomi' }),
    N('Cadeia em Área', 'Todos os inimigos viram um elo.', 'd18/12 a', 'chain 2 0.8; st para 1 40%'),
    N('Cadeia Infinita', 'A corrente só para quando não sobra ninguém de pé para tocar.', 'd24/14', 'chain 5 0.85; st para 1'),
  ],
  // base na camada 6: 4 nós
  'Eco do Trovão': [
    N('Eco Duplo', 'O trovão volta duas vezes antes de sumir.', 'd14/8', 'echo 80'),
    N('Eco Que Paralisa', 'O estrondo que volta trava o corpo do alvo.', 'd14/9', 'echo 80; st para 1 50%'),
    N('Eco Ventoso', 'O trovão volta empurrado pelo vento e joga o alvo para trás.', 'd16/10', 'echo 90; push 45', { v2: 'fuhaku' }),
    N('Eco Profundo', 'Um estrondo que ainda ecoa muito depois do golpe.', 'd22/13', 'echo 100; st para 1 70%'),
  ],
  // base na camada 4: 6 nós
  'Choque': [
    N('Choque Duplo', 'Dois choques seguidos na mesma mão.', 'd10/6 x2', 'st para 1 20%'),
    N('Choque Que Marca', 'O choque deixa um ponto vermelho onde a corrente entrou.', 'd10/7', 'st marked 2'),
    N('Choque Terrestre', 'O choque desce pelo chão e derruba quem estiver de pé nele.', 'd14/9', 'st down 1 50%; st para 1', { v2: 'atlas' }),
    N('Choque em Cadeia', 'O choque passa de um corpo para o outro.', 'd14/10', 'chain 1 0.6; st para 1'),
    N('Choque Detonador', 'O choque guarda a carga e solta tudo no segundo toque.', 'd16/10', 'pop 1.8; st para 1'),
    N('Choque Supremo', 'O choque que para o coração e o coração volta sozinho.', 'd22/13', 'vs para 2; st para 1 80%'),
  ],
  // base na camada 4: 6 nós
  'Vajra': [
    N('Vajra Duplo', 'Duas pontas de vajra, uma em cada mão.', 'd12/8 x2', ''),
    N('Vajra Cortante', 'A ponta do vajra vira uma lâmina que atravessa a guarda.', 'd14/9', 'pierce 80'),
    N('Vajra Pétreo', 'O vajra cai com o peso de uma montanha e abre o alvo.', 'd16/10', 'st exposed 2; pierce 50', { v2: 'atlas' }),
    N('Vajra Cruzado', 'Dois vajras em X: a guarda abre e o corpo também.', 'd18/11', 'st exposed 1; pierce 70'),
    N('Vajra Detonador', 'O vajra explode com toda a carga guardada.', 'd22/13', 'burst carga 0.5; st para 1'),
    N('Vajra Supremo', 'O vajra do próprio rei dos deuses, que racha o céu.', 'd30/16 a', 'pierce 100; st para 2'),
  ],
  // base na camada 4: 6 nós
  'Soco Estático': [
    N('Soco Estático Duplo', 'Um soco, e o segundo antes do primeiro acabar.', 'd10/6 x2', 'st para 1 20%'),
    N('Soco Que Atordoa', 'O soco chega com a carga toda no queixo.', 'd12/8', 'st stun 1 40%'),
    N('Soco Estático Ardente', 'O punho chega em brasa e deixa a carga queimando.', 'd14/10', 'st burn 1; st para 1 30%', { v2: 'kagutsuchi' }),
    N('Soco Que Trava', 'Quem já está travado sente o soco duas vezes.', 'd14/10', 'vs para 1.5'),
    N('Soco Estático Detonador', 'A carga fica no golpe e explode quando o punho volta.', 'd18/11', 'pop 1.9; st para 1'),
    N('Soco Estático Supremo', 'O soco que desliga o alvo no ato.', 'd26/13', 'st stun 1 50%; st para 2'),
  ],
  // base na camada 5: 5 nós
  'Martelo Celeste': [
    N('Martelo Celeste Duplo', 'O martelo desce duas vezes no mesmo ponto.', 'd14/9 x2', 'st stun 1 35%'),
    N('Martelo Que Racha', 'O martelo racha a guarda antes de acertar o corpo.', 'd16/10', 'brk 1; st stun 1 40%'),
    N('Martelo Celeste Solar', 'O martelo desce em ouro e ofusca quem estiver perto.', 'd18/12', 'st blind 1 50%; st stun 1 40%', { v2: 'amaterasu' }),
    N('Martelo Celeste Detonador', 'O martelo deixa a carga no chão e o céu a cobra depois.', 'd24/14', 'pop 2; st stun 1'),
    N('Martelo Celeste Supremo', 'O martelo do rei dos deuses, que o céu responde com um trovão.', 'd30/16 a', 'st stun 1 70%; st para 1'),
  ],
  // base na camada 6: 4 nós
  'Gaiola de Faraday': [
    N('Gaiola Reforçada', 'A gaiola ganha mais uma camada de fios.', 'u/8', 'shield 22'),
    N('Gaiola Que Devolve', 'O que bate na gaiola volta com um estalo.', 'u/9', 'shield 18; st reflect 1'),
    N('Gaiola Viva', 'A gaiola responde a cada golpe com um revide.', 'u/10', 'shield 14; st counter 1 self'),
    N('Gaiola Coletiva', 'A gaiola se abre e cobre todos os aliados.', 'u/12 a', 'shield 16'),
  ],
  // ---------- Rodada 2: bases das camadas 1 e 2 (linhas de 8 e 9 nós) ----------
  // base na camada 1: 9 nós
  'Estalo': [
    N('Estalo Duplo', 'Dois estalos de dedo, um colado no outro.', 'd5/3 x2', 'st para 1 20%'),
    N('Estalo Que Marca', 'A pontinha do estalo deixa o alvo carregado.', 'd5/3', 'st marked 2'),
    N('Estalo Seco', 'Um estalo que não tem como errar.', 'd7/4', 'sure; st para 1 25%'),
    N('Estalo Que Pula', 'O estalo pula para o alvo do lado.', 'd7/4', 'chain 1 .6; st para 1 20%'),
    N('Estalo Molhado', 'Com a água de um aliado, o estalo corre pela pele inteira.', 'd9/6', 'st wet 2; st para 1 45%', { v2: 'susanoo' }),
    N('Estalo em Leque', 'Estalos em todas as direções, um por inimigo.', 'd9/7 a', 'st para 1 35%'),
    N('Estalo Que Trava', 'Quem já está travado sente o estalo dobrado.', 'd10/7', 'vs para 1.6; st marked 1'),
    N('Estalo Detonador', 'O estalo fica guardado no alvo e solta tudo no próximo.', 'd12/9', 'pop 1.9; st para 1'),
    N('Estalo Supremo', 'O estalo que o rei dos deuses dá com os dedos e o céu atende.', 'd18/12 a', 'chain 3 .8; st para 2 60%'),
  ],
  // base na camada 1: 9 nós
  'Fagulha Veloz': [
    N('Faísca Veloz Dupla', 'Duas faíscas tão rápidas que parecem uma.', 'd5/3 x2', 'st para 1 15%'),
    N('Faísca Veloz Que Fura', 'A faísca entra pela fresta da guarda.', 'd6/3', 'pierce 40'),
    N('Faísca Veloz Tripla', 'Três faíscas, cada uma antes da anterior acabar.', 'd5/4 x3', 'st para 1 15%'),
    N('Faísca Veloz Que Marca', 'A faísca deixa o alvo mais fácil para a próxima.', 'd7/4', 'st marked 2; haste 25 self'),
    N('Faísca Veloz em Rajada', 'Uma rajada de faíscas miúdas que acha todos.', 'd7/6 a', 'st para 1 25%'),
    N('Faísca Veloz Ventada', 'O vento de um aliado empurra as faíscas ainda mais rápido.', 'd9/6 a', 'haste 40 self; push 25', { v2: 'fuhaku' }),
    N('Faísca Veloz Contínua', 'Não para: cada faísca chama a seguinte.', 'd10/7 x3', 'echo 70; st para 1 30%'),
    N('Faísca Veloz Detonadora', 'As faíscas se acumulam no alvo e estouram juntas.', 'd12/9', 'pop 2; st para 1'),
    N('Faísca Veloz Suprema', 'Uma saraivada tão veloz que o raio chega antes do som.', 'd16/11 x4', 'sure; st para 1 60%'),
  ],
  // base na camada 1: 9 nós
  'Corte Voltaico': [
    N('Corte Voltaico Duplo', 'Dois cortes, e a lâmina estala nos dois.', 'd9/5 x2', 'st para 1 15%'),
    N('Corte Voltaico Fundo', 'A lâmina entra mais fundo e deixa a carga lá dentro.', 'd10/5', 'st bleed 1; st para 1 25%'),
    N('Corte Voltaico Que Quebra', 'A lâmina carregada racha a guarda do alvo.', 'd11/6', 'brk 1'),
    N('Corte Voltaico Que Marca', 'O corte deixa um risco que atrai o próximo raio.', 'd11/6', 'st marked 2; st para 1 25%'),
    N('Corte Voltaico Terrestre', 'A lâmina cai com o peso da terra de um aliado e racha o chão.', 'd13/8', 'st exposed 2; st down 1 40%', { v2: 'atlas' }),
    N('Corte Voltaico em Arco', 'Um arco largo da lâmina que passa por todos.', 'd13/9 a', 'st para 1 35%'),
    N('Corte Voltaico Cruzado', 'Dois cortes em X: um abre, o outro descarrega.', 'd15/9 x2', 'pierce 60; st exposed 1'),
    N('Corte Voltaico Detonador', 'A lâmina fica cravada e a carga explode na retirada.', 'd17/11', 'pop 2; st para 1'),
    N('Corte Voltaico Supremo', 'Um único corte que parte o ar e o que estava no caminho.', 'd24/13', 'pierce 100; st para 2 70%'),
  ],
  // base na camada 1: 9 nós
  'Tempestade': [
    N('Tempestade Dupla', 'A nuvem solta duas ondas de raios.', 'd7/5 a x2', 'st para 1 15%'),
    N('Tempestade Que Marca', 'Cada raio que cai deixa o alvo marcado.', 'd7/6 a', 'st marked 2'),
    N('Tempestade Carregada', 'As nuvens carregam mais antes de cair.', 'd9/7 a', 'stack carga 5 self; st para 1 25%'),
    N('Tempestade Que Prende', 'O ar fica tão carregado que os músculos travam.', 'd10/8 a', 'st para 1 45%; st root 1 30%'),
    N('Tempestade de Lâminas de Ar', 'Com o vento de um aliado, as nuvens cortam além de eletrizar.', 'd12/10 a', 'st bleed 1; st para 1 40%', { v2: 'fuhaku' }),
    N('Tempestade Em Cadeia', 'Os raios saltam de inimigo em inimigo.', 'd12/10 a', 'chain 2 .7; st para 1 30%'),
    N('Tempestade Que Repete', 'O trovão volta e a tempestade cai de novo.', 'd13/11 a', 'echo 80; st para 1 35%'),
    N('Tempestade Detonadora', 'A carga fica guardada em todos e explode de uma vez.', 'd16/13 a', 'pop 1.9; st para 1'),
    N('Tempestade Suprema', 'O céu todo vira um só raio sobre todos.', 'd24/16 a', 'burst carga .4; st para 2 70%'),
  ],
  // base na camada 2: 8 nós
  'Raio de Indra': [
    N('Raio de Indra Duplo', 'Dois raios do rei dos deuses, um atrás do outro.', 'd14/10 x2', 'st para 1 30%'),
    N('Raio de Indra Que Marca', 'O raio deixa o alvo marcado para o céu.', 'd16/10', 'st marked 2; st para 1'),
    N('Raio de Indra Certeiro', 'O relâmpago que nunca erra o alvo.', 'd18/11', 'sure; st para 1 60%'),
    N('Raio de Indra em Cadeia', 'O raio salta pelos inimigos como por degraus.', 'd18/12', 'chain 3 .75; st para 1'),
    N('Raio de Indra Solar', 'Com a luz de um aliado, o raio ofusca antes de acertar.', 'd20/13', 'st blind 2 60%; st para 1 70%', { v2: 'amaterasu' }),
    N('Raio de Indra Que Atravessa', 'O raio corta a guarda e o corpo atrás dela.', 'd24/14', 'pierce 90; st para 1'),
    N('Raio de Indra Detonador', 'O raio fica dentro do alvo e o céu o chama de volta.', 'd28/15', 'pop 2.2; st para 1'),
    N('Raio de Indra Supremo', 'O raio original: Indra desce em pessoa e o céu inteiro treme.', 'd38/18 a', 'chain 4 .85; st para 2'),
  ],
  // base na camada 2: 8 nós
  'Lança de Trovão': [
    N('Lança de Trovão Dupla', 'Duas lanças de trovão, uma em cada mão.', 'd14/8 x2', 'sure'),
    N('Lança de Trovão Que Fura', 'A lança atravessa a guarda como se não existisse.', 'd16/9', 'sure; pierce 60'),
    N('Lança de Trovão Que Prende', 'A lança crava o alvo no chão por um instante.', 'd16/10', 'sure; st root 1 50%; st para 1 30%'),
    N('Lança de Trovão Rasante', 'Uma lança só, que varre a fila inteira.', 'd18/11 a', 'sure; chain 2 .7'),
    N('Lança de Trovão Pétrea', 'A lança de pedra de um aliado desce com o raio e abre o alvo.', 'd20/12', 'st exposed 2; pierce 80', { v2: 'atlas' }),
    N('Lança de Trovão Que Repete', 'O trovão da lança volta e crava de novo.', 'd24/13', 'echo 90; sure'),
    N('Lança de Trovão Detonadora', 'A lança fica cravada e explode quando o céu quiser.', 'd28/15', 'pop 2.2; st para 1'),
    N('Lança de Trovão Suprema', 'A lança do rei dos deuses, arremessada de um horizonte a outro.', 'd36/18 a', 'sure; pierce 100; st para 2'),
  ],
  // base na camada 2: 8 nós
  'Raio Rompe-Guarda': [
    N('Rompe-Guarda Duplo', 'Dois raios na mesma guarda: o segundo já a encontra aberta.', 'd14/10 x2', 'brk 1'),
    N('Rompe-Guarda Que Marca', 'A guarda racha e o alvo fica marcado.', 'd16/10', 'brk 1; st marked 2'),
    N('Rompe-Guarda Que Expõe', 'Sem guarda, o corpo fica à mostra.', 'd16/11', 'brk 1; st exposed 2'),
    N('Rompe-Guarda Que Fura', 'O raio entra pela fresta que ele mesmo abriu.', 'd18/12', 'brk 1; pierce 70'),
    N('Rompe-Guarda Terrestre', 'O peso de um aliado de terra derruba a guarda e o dono dela.', 'd20/13', 'brk 2; st down 1 60%', { v2: 'atlas' }),
    N('Rompe-Guarda em Área', 'Um raio para cada guarda no campo.', 'd22/14 a', 'brk 1; st para 1 50%'),
    N('Rompe-Guarda Detonador', 'A guarda rachada guarda a carga e solta tudo depois.', 'd26/15', 'pop 2; brk 1; st para 1'),
    N('Rompe-Guarda Supremo', 'O raio que racha qualquer guarda, qualquer escudo, qualquer deus.', 'd34/18 a', 'brk 3; pierce 100; st para 2'),
  ],
};

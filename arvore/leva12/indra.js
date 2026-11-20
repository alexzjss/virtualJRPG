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
};

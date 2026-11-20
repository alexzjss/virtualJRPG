// Leva 12 (evolução lógica), setor amaterasu. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
// Aqui: as bases ofensivas e de controle do Amaterasu que ficaram sem linha (Bala, Rajada, Punho, Lança, Estocada, Raio Purificador, Clarão, Explosão).
import { N } from '../l8.js';
export const ESTENDER = {};
export const ABRIR = {
  'Bala Consagrada': [
    N('Bala Consagrada Dupla', 'Duas balas bentas, uma atrás da outra.', 'd12/7 x2'),
    N('Bala Que Fura a Couraça', 'A bênção abre caminho pelo metal.', 'd12/7', 'pierce 40'),
    N('Bala Que Ofusca', 'Ao bater, a bala explode num clarão pequeno.', 'd13/7', 'st blind 1 40%'),
    N('Bala Batizada', 'Molhada em água benta antes de entrar no pente.', 'd14/8', 'vs demon 1.5'),
    N('Bala Que Marca o Condenado', 'O furo fica brilhando na pele do alvo.', 'd14/8', 'brand 2'),
    N('Bala de Prata Solar', 'Prata forjada ao meio-dia, certeira e fria.', 'd16/9', 'sure; pierce 60'),
    N('Bala do Último Raio', 'A última bala do pente leva um raio inteiro.', 'd20/10', 'vs demon 1.9; pierce 70'),
  ],
  'Rajada Sagrada': [
    N('Rajada Sagrada Dupla', 'Duas varreduras de balas luminosas.', 'd12/9 a x2'),
    N('Rajada Que Ofusca', 'Cada bala solta um brilho branco nos olhos.', 'd13/9 a', 'st blind 1 40%'),
    N('Rajada de Balas Bentas', 'O pente inteiro foi abençoado antes.', 'd14/10 a', 'vs demon 1.4'),
    N('Rajada Rubra do Poente', 'As balas saem vermelhas, como o sol se pondo.', 'd15/10 a', 'st burn 2', { v2: 'kagutsuchi' }),
    N('Rajada Sem Fim', 'O gatilho não solta até o sol baixar.', 'd16/11 a x3', 'pierce 40'),
    N('Rajada do Juízo', 'Cada bala é uma sentença lida em voz alta.', 'd20/13 a', 'vs demon 1.8; st blind 2'),
  ],
  'Punho Radiante': [
    N('Punho Radiante Duplo', 'Dois socos de luz, esquerda e direita.', 'd20/8 x2'),
    N('Punho Que Cega', 'O brilho do soco queima os olhos de quem está perto.', 'd22/8', 'st blind 1 50%'),
    N('Punho Consagrado', 'O punho carrega uma oração e acerta mais forte no impuro.', 'd24/9', 'vs demon 1.5'),
    N('Punho da Aurora Radiante', 'Um soco que empurra o alvo para longe, como a luz expulsa a noite.', 'd26/10', 'push 30; st blind 1 40%'),
    N('Punho do Meio-Dia', 'Sem sombra nenhuma onde o alvo possa se esconder.', 'd30/12', 'vs exposed 1.6; brk 1'),
  ],
  'Lança de Luz': [
    N('Lança de Luz Dupla', 'Duas lanças, a segunda no buraco da primeira.', 'd24/10 x2'),
    N('Lança Que Atravessa', 'A ponta passa pelo alvo e segue até o fundo.', 'd26/10', 'pierce 60'),
    N('Lança Que Marca', 'A lança fica cravada e brilhando no alvo.', 'd28/11', 'brand 2; st exposed 1'),
    N('Lança do Sol Pleno', 'A lança mais clara que o dia, atirada com o corpo todo.', 'd34/13', 'vs demon 1.8; pierce 80'),
  ],
  'Estocada Radiante': [
    N('Estocada Radiante Dupla', 'Duas estocadas, a segunda mais fundo.', 'd27/11 x2', 'st blind 1 30%'),
    N('Estocada Que Abre a Guarda', 'A ponta de luz força o escudo para o lado.', 'd30/12', 'st defDn 2'),
    N('Estocada do Primeiro Sol', 'A estocada que atravessa a noite inteira de uma vez.', 'd36/13', 'pierce 70; vs demon 1.6'),
  ],
  'Raio Purificador': [
    N('Raio Purificador Largo', 'O feixe abre em leque e varre a linha inimiga.', 'd30/15 a', 'strip; vs demon 1.4'),
    N('Raio Purificador Pleno', 'Nada de impuro sobrevive ao feixe inteiro.', 'd36/16', 'strip; vs demon 2; brand 2'),
  ],
  'Clarão': [
    N('Clarão Duplo', 'Dois clarões seguidos, o segundo no mesmo ponto.', 'd15/7 x2', 'st blind 1 30%'),
    N('Clarão Largo', 'O clarão cobre todo o campo e enfraquece o ataque de todos.', 'd14/9 a', 'st atkDn 1'),
    N('Clarão Contra Demônios', 'Um brilho que arde só em quem é impuro.', 'd16/9', 'vs demon 1.7; st blind 1'),
    N('Clarão Cegante', 'Luz demais, e o alvo não vê mais nada.', 'd16/10', 'st blind 2'),
    N('Clarão Que Expõe', 'Quem foi iluminado não tem mais onde se esconder.', 'd18/10', 'st exposed 2; st blind 1'),
    N('Clarão do Amanhecer', 'O mundo todo acende de uma vez.', 'd20/12 a', 'st blind 2; st atkDn 2'),
  ],
  'Explosão Solar': [
    N('Explosão Solar Contida', 'A explosão se fecha em volta de um alvo só.', 'd20/11', 'strip; st blind 2'),
    N('Explosão Solar em Cadeia', 'Uma explosão acende a seguinte.', 'd17/12 a x2', 'st blind 1 40%'),
    N('Explosão Que Marca', 'A cicatriz de luz continua queimando.', 'd20/12 a', 'brand 2; vs demon 1.5'),
    N('Explosão do Sol a Pino', 'O ponto mais alto do dia caindo sobre o campo.', 'd26/14 a', 'st blind 2; vs exposed 1.8'),
  ],
};

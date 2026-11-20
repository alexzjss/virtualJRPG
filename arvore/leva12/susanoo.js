// Leva 12 (evolução lógica), setor susanoo. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
import { N } from '../l8.js';
export const ESTENDER = {};
export const ABRIR = {
  // base na camada 3: sete nós (4-10)
  'Onda Quebrante': [
    N('Onda Quebrante Dupla', 'Duas ondas, uma atrás da outra.', 'd10/7 x2', 'st wet 1'),
    N('Onda Quebrante Larga', 'A muralha abre e cobre toda a linha.', 'd12/9 a', 'st wet 1'),
    N('Onda Quebrante Pesada', 'A água cai com o peso de uma rocha.', 'd16/9', 'st down 1 40%; st wet 1'),
    N('Onda Quebrante Fervente', 'A onda bate quente e arranca vapor da pele.', 'd18/10', 'st burn 2; st wet 1', { v2: 'kagutsuchi' }),
    N('Onda Quebrante Arrastadora', 'Ao recuar, a onda leva o alvo junto.', 'd20/11', 'push 40; vs wet 1.4'),
    N('Onda Quebrante Cortante', 'A crista da onda corta como lâmina.', 'd24/12', 'pierce 60; st wet 2'),
    N('Muralha Que Desaba', 'Uma parede de mar inteira desaba sobre os inimigos.', 'd32/15 a', 'st down 1 60%; st wet 3'),
  ],
  // base na camada 4: seis nós (5-10)
  'Agulha de Gelo': [
    N('Agulhas Gêmeas', 'Duas agulhas de gelo pela mesma brecha.', 'd9/6 x2', 'st frozen 1 20%'),
    N('Agulha de Gelo Certeira', 'A agulha acha a falha da guarda e não erra.', 'd14/7', 'sure; pierce 60'),
    N('Agulha Que Entorpece', 'A ponta fria gruda no músculo e atrasa o alvo.', 'd16/8', 'st agiDn 2; st frozen 1 30%'),
    N('Chuva de Agulhas', 'Dezenas de agulhas de gelo caem sobre a linha inimiga.', 'd16/11 a', 'st frozen 1 30%; st bleed 1'),
    N('Agulha no Ponto Fraco', 'Entra onde o alvo já está exposto e congela por dentro.', 'd26/12', 'vs exposed 1.5; st frozen 1 50%'),
    N('Agulha do Inverno Profundo', 'A agulha mais fina do deus, fria como o fundo do mar.', 'd34/15', 'pierce 100; st frozen 2 60%'),
  ],
  // base na camada 5: cinco nós (6-10)
  'Golpe de Maré': [
    N('Golpe de Maré Duplo', 'Duas pancadas d\'água seguidas, secas como chibatadas.', 'd12/8 x2', 'st wet 1'),
    N('Golpe de Maré Que Derruba', 'A pancada acerta os pés e o alvo cai.', 'd18/9', 'st down 1 50%; st wet 1'),
    N('Golpe de Maré Elétrico', 'A corrente do aliado corre pela água e trava o alvo.', 'd20/10', 'st para 1 40%; st wet 1', { v2: 'indra' }),
    N('Golpe de Maré Que Arrasta', 'A pancada leva consigo quem está molhado.', 'd24/11', 'push 40; vs wet 1.5'),
    N('Golpe da Maré Cheia', 'Toda a força do mar numa pancada só.', 'd34/14', 'brk 1; st wet 3'),
  ],
  // base na camada 5: cinco nós (6-10)
  'Vórtice': [
    N('Vórtice Duplo', 'Dois redemoinhos giram lado a lado.', 'd14/10 a x2', 'st wet 1'),
    N('Vórtice Que Prende', 'O redemoinho enrosca as pernas dos inimigos.', 'd16/11 a', 'st root 1 40%; st agiDn 1'),
    N('Vórtice Trovejante', 'O raio gira dentro do redemoinho e estala em todos.', 'd20/12 a', 'st para 1 35%; st wet 1', { v2: 'indra' }),
    N('Vórtice Gélido', 'A água do redemoinho vira um carrossel de gelo.', 'd22/13 a', 'st frozen 1 45%; vs wet 1.4'),
    N('Grande Vórtice do Abismo', 'O mar abre um buraco no meio do campo e puxa tudo.', 'd36/17 a', 'push 50; st down 1 60%; st wet 3'),
  ],
  // base na camada 5: cinco nós (6-10)
  "Lança d'Água": [
    N("Lança d'Água Dupla", 'Duas lanças vibram e saem juntas.', 'd14/9 x2', 'pierce 70'),
    N("Lança d'Água Fervente", 'A ponta da lança ferve e cozinha a ferida.', 'd20/9', 'pierce 60; st burn 2', { v2: 'kagutsuchi' }),
    N("Lança d'Água Congelada", 'A lança vira gelo no instante em que fura.', 'd22/10', 'pierce 80; st frozen 1 40%'),
    N("Lança d'Água em Leque", 'Várias lanças curtas abrem em leque sobre a linha.', 'd20/12 a', 'pierce 60; st wet 1'),
    N("Lança d'Água do Dilúvio", 'A lança que atravessa armadura, escudo e o que vier atrás.', 'd36/15', 'pierce 100; st wet 2'),
  ],
  // base na camada 6: quatro nós (7-10)
  'Lança de Susanoo': [
    N('Lança de Susanoo Dupla', 'Duas lanças do deus, atiradas sem pausa.', 'd18/10 x2', 'pierce 60'),
    N('Lança de Susanoo da Tormenta', 'A lança carrega a tormenta e trava quem toca.', 'd26/12', 'st para 1 40%; st wet 2'),
    N('Lança de Susanoo Que Desce do Céu', 'Cai do alto, anunciada pelo céu escurecendo.', 'd34/14 v', 'pierce 90; vs wet 1.5'),
    N('Lança de Susanoo, Fúria do Deus', 'A lança do deus das tempestades, sem freio.', 'd46/18', 'pierce 100; st wet 3; brk 2'),
  ],
  // base na camada 4: seis nós (5-10)
  'Chuva Reparadora': [
    N('Chuva Reparadora Rápida', 'Uma chuva curta que fecha os cortes depressa.', 'h10/6 a', 'st regen 1'),
    N('Chuva Reparadora Limpa', 'A água lava o veneno e a sujeira da ferida.', 'h12/8 a', 'cleanse; st regen 1'),
    N('Chuva Reparadora Morna', 'Cai quente e demorada; cada gota cura mais um pouco.', 'h14/9 a', 'st regen 3'),
    N('Chuva Reparadora Protetora', 'A chuva fecha a ferida e deixa uma película de água na pele.', 'h14/10 a', 'shield 12; st regen 2'),
    N('Chuva Abençoada de Susanoo', 'A chuva do deus: cura a todos e acalma o coração.', 'h18/12 a', 'st regen 3; cleanse'),
    N('Dilúvio Restaurador', 'Um aguaceiro que devolve a vida e leva as marcas da luta.', 'h26/15 a', 'st regen 4; cleanse; shield 20'),
  ],
};

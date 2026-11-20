// Leva 11, parte 2 (19/11/2026): linhas de variação novas (ramo com `de`) saindo de técnicas que ainda não tinham linha.
// Bases nas camadas 3, 6 e 7: a linha sobe uma camada por nó até a 10 (7, 4 e 3 nós), então engrossa as camadas altas,
// as mais magras da árvore. Cada nó é a mesma técnica levada mais longe; o poder vem da camada (arvore/camadas.js).
import { N } from './l8.js';
import { RENOMES } from './temas.js';
import { ABRIR12 } from './leva12/index.js';

export const LINHAS11 = {
  // ---------- Marcial (só status físicos) ----------
  'Ataque Furtivo': [
    N('Ataque Furtivo Duplo', 'Dois golpes antes do alvo virar.', 'd8/6 x2'),
    N('Golpe no Rastro do Alvo', 'O golpe marca onde o próximo vai entrar.', 'd10/6', 'st marked 1'),
    N('Ataque Furtivo Certeiro', 'Pelas costas não há como errar.', 'd12/6', 'sure'),
    N('Ataque Furtivo Sangrento', 'O golpe escondido deixa a ferida aberta.', 'd12/7', 'st bleed 2'),
    N('Golpe no Ângulo Morto', 'Entra onde o alvo não olha e não protege.', 'd14/8', 'vs neg 1.5; pierce 40'),
    N('Ataque Que Ninguém Viu', 'Quando o alvo percebe, já caiu.', 'd16/9', 'st stun 1 40%; vs neg 1.4'),
    N('Golpe do Assassino Perfeito', 'Um só golpe, no único lugar que importa.', 'd20/10', 'vs neg 1.8; pierce 60'),
  ],
  'Varredura Ampla': [
    N('Varredura Dupla', 'Duas varreduras, ida e volta.', 'd10/9 a x2', 'st down 1 30%'),
    N('Varredura Que Prende as Pernas', 'A perna fica onde caiu.', 'd12/10 a', 'st down 1 45%; st root 1 30%'),
    N('Varredura do Giro Completo', 'O giro é tão largo que levanta vento.', 'd14/11 a', 'st down 1 40%; push 30'),
    N('Varredura Final', 'Ninguém fica de pé depois dela.', 'd16/12 a', 'st down 1 60%; brk 1'),
  ],
  'Ler a Manobra': [
    N('Ler o Próximo Passo', 'Vê o passo antes dele acontecer e sai da frente.', 'u/4', 'st marked 2; st evade 1 self'),
    N('Ler a Respiração', 'Pela respiração se sabe onde dói.', 'u/5', 'st marked 3; st exposed 2'),
    N('Ler o Combate Inteiro', 'Cada inimigo vira um livro aberto.', 'u/7 a', 'st marked 2; st exposed 1'),
  ],

  // ---------- Kagutsuchi ----------
  'Pavio Curto': [
    N('Pavio Duplo', 'Dois pavios acesos ao mesmo tempo.', 'd8/6 x2', 'st burn 1'),
    N('Pavio Que Queima Rápido', 'O pavio encurta e explode mais vezes.', 'd10/6', 'every 2 2'),
    N('Pavio Molhado de Óleo', 'O fogo pega fundo.', 'd10/6', 'st burn 2'),
    N('Pavio em Leque', 'Vários pavios curtos jogados em todos.', 'd10/8 a', 'st burn 1'),
    N('Pavio Longo', 'Demora, mas quando chega, chega forte.', 'd12/8', 'every 3 3; st burn 1'),
    N('Barril de Pólvora', 'Um barril inteiro com o pavio aceso.', 'd14/11 a', 'st burn 2; push 30'),
    N('Pavio do Fim do Mundo', 'O último pavio da forja, ligado a tudo.', 'd18/14 a', 'every 3 3.5; st burn 3'),
  ],
  'Marca Ardente': [
    N('Marca Ardente Dupla', 'Duas marcas em brasa.', 'd10/7 x2', 'brand 2'),
    N('Marca Que Arde', 'A marca continua queimando.', 'd12/8', 'brand 2; st burn 2'),
    N('Marca Ardente em Todos', 'Cada inimigo leva a sua marca.', 'd12/10 a', 'brand 2'),
    N('Marca do Ferro em Brasa', 'O ferro da forja marca para sempre.', 'd16/11', 'brand 3; vs burn 1.5'),
  ],
  'Escória Ardente': [
    N('Escória Que Gruda', 'A escória gruda e não deixa andar.', 'd12/10 a', 'st burn 2; st root 1 30%'),
    N('Rio de Escória', 'Um rio de escória que derrete armadura.', 'd14/11 a', 'st burn 3; brk 1'),
    N('Chão de Escória', 'O chão inteiro vira escória fervendo.', 'd16/13 a', 'st burn 3; st down 1 40%'),
  ],

  // ---------- Susanoo ----------
  'Resposta da Maré': [
    N('Resposta Dupla', 'A maré responde duas vezes.', 'd8/6 x2', 'st wet 1'),
    N('Maré de Revide', 'Pesa em quem se abriu.', 'd10/6', 'vs exposed 1.4'),
    N('Maré Que Desequilibra', 'A água puxa o chão do alvo.', 'd10/6', 'st down 1 30%; st wet 1'),
    N('Resposta em Onda', 'A resposta vem como onda sobre todos.', 'd10/8 a', 'st wet 2'),
    N('Maré Que Volta', 'A maré volta e pesa em quem está molhado.', 'd12/8', 'vs wet 1.4; push 25'),
    N('Resposta da Grande Maré', 'A maior maré do ano vem cobrar.', 'd14/9', 'vs exposed 1.6; st wet 3'),
    N('Maré do Fim', 'A maré que não volta para o mar.', 'd18/11', 'vs exposed 1.8; push 50'),
  ],
  'Onda Negra': [
    N('Onda Negra Dupla', 'Duas ondas escuras.', 'd10/7 x2', 'push 20'),
    N('Onda Negra Que Afoga', 'A onda cobre e não larga.', 'd12/8', 'push 30; st wet 3'),
    N('Onda Negra em Muralha', 'Uma muralha de água negra sobre todos.', 'd12/10 a', 'push 35'),
    N('Onda Negra do Abismo', 'A água vem do fundo do mar.', 'd16/11', 'push 60; st down 1'),
  ],
  'Gume de Gelo': [
    N('Gume de Gelo Cruzado', 'Dois cortes de gelo em X.', 'd12/9 x2', 'st frozen 1 25%'),
    N('Gume Que Congela por Dentro', 'O corte gela por dentro.', 'd14/10', 'st frozen 1 45%; st bleed 1'),
    N('Gume do Inverno Eterno', 'Um gume do gelo que nunca derrete.', 'd18/12', 'st frozen 2 55%; pierce 60'),
  ],

  // ---------- Atlas ----------
  'Punho de Atlas': [
    N('Punho de Atlas Duplo', 'Dois punhos de pedra.', 'd8/6 x2'),
    N('Punho Que Afunda', 'O alvo afunda no chão.', 'd10/6', 'st down 1 30%'),
    N('Punho de Chumbo', 'O braço do alvo pesa depois do golpe.', 'd10/6', 'st atkDn 1'),
    N('Punho Que Abre o Chão', 'O soco no chão derruba todos em volta.', 'd10/8 a', 'st down 1 30%'),
    N('Punho de Atlas Blindado', 'Um punho de ferro que esmaga a guarda.', 'd12/8', 'brk 2'),
    N('Punho do Peso do Mundo', 'Todo o peso do mundo num soco.', 'd14/9', 'st down 1 50%; brk 1'),
    N('Punho Que Carrega o Céu', 'O punho que segura o céu desce no alvo.', 'd18/11', 'st stun 1 40%; brk 2'),
  ],
  'Rochedo Cadente': [
    N('Rochedos Gêmeos', 'Dois rochedos caindo juntos.', 'd10/7 x2'),
    N('Rochedo Que Esmaga', 'O rochedo esmaga e derruba.', 'd12/8', 'st down 1 40%'),
    N('Queda de Rochedos', 'Rochedos caem sobre todos.', 'd12/10 a', 'st down 1 30%'),
    N('Rochedo do Fim da Montanha', 'O pico inteiro desce.', 'd16/11', 'st stun 1 50%; brk 2'),
  ],
  'Cabeçada de Pedra': [
    N('Cabeçada Dupla', 'Duas cabeçadas de pedra.', 'd12/9 x2', 'st stun 1 35%'),
    N('Cabeçada de Ferro', 'Uma testa de ferro que amassa a guarda.', 'd14/10', 'st stun 1 60%; brk 1'),
    N('Cabeçada do Titã', 'A cabeçada de quem segura montanhas.', 'd18/12', 'st stun 2 70%; brk 2'),
  ],

  // ---------- Indra ----------
  'Rede Elétrica': [
    N('Rede Dupla', 'Duas redes de choque.', 'd8/8 a x2', 'st para 1 20%'),
    N('Rede de Fios Grossos', 'Fios mais grossos, choque mais firme.', 'd10/8 a', 'st para 1 40%'),
    N('Rede Saltitante', 'O choque pula de nó em nó da rede.', 'd10/8 a', 'chain 1 .5'),
    N('Rede de Alta Tensão', 'A rede zumbe antes de cair.', 'd10/9 a', 'st para 1 45%'),
    N('Rede Carregada', 'Pesa em quem já está travado.', 'd12/9 a', 'vs para 1.4'),
    N('Rede do Céu Inteiro', 'Uma rede de raios cobrindo o céu.', 'd14/11 a', 'st para 1 50%; chain 1 .5'),
    N('Rede de Trovões', 'Cada nó da rede é um trovão.', 'd16/13 a', 'st para 2 55%'),
  ],
  'Interferência': [
    N('Interferência Dupla', 'Dois pulsos de estática sobre todos.', 'd10/9 a x2'),
    N('Interferência Que Enfraquece', 'A estática tira a força dos braços.', 'd12/10 a', 'st atkDn 1 40%'),
    N('Estática Pesada', 'A estática trava os músculos.', 'd12/10 a', 'st para 1 35%'),
    N('Interferência Total', 'Nenhum músculo obedece.', 'd16/12 a', 'st para 1 45%; st atkDn 1'),
  ],
  'Trovão Gêmeo': [
    N('Trovões Trigêmeos', 'Três trovões no mesmo lugar.', 'd10/9 x3'),
    N('Trovão Gêmeo Que Ecoa', 'O eco do trovão acha o vizinho.', 'd12/10 x2', 'chain 1 .7'),
    N('Trovão das Duas Nuvens', 'Duas nuvens descarregam juntas.', 'd16/12 x2', 'st para 1 50%; pierce 50'),
  ],

  // ---------- Fuhaku ----------
  'Terceira Rajada': [
    N('Terceira Rajada Dupla', 'Duas rajadas no compasso.', 'd8/6 x2'),
    N('Rajada no Compasso', 'O compasso encurta e a rajada vem mais vezes.', 'd10/6', 'every 2 1.8'),
    N('Terceira Rajada Cortante', 'A terceira rajada corta.', 'd10/6', 'every 3 2.5; st bleed 1'),
    N('Rajada em Três Tempos', 'Três tempos, todos os inimigos.', 'd10/8 a', 'every 3 2.2'),
    N('Rajada Que Conta', 'Conta até três e empurra.', 'd12/8', 'every 3 2.8; push 20'),
    N('Quarta Rajada', 'Espera mais um tempo, e vem mais forte.', 'd14/9', 'every 4 3.5'),
    N('Rajada do Ciclo Completo', 'O ciclo inteiro do vento numa rajada.', 'd16/13 a', 'every 3 3; push 30'),
  ],
  'Rajada Cortante': [
    N('Rajada Cortante Dupla', 'Duas rajadas que cortam.', 'd10/7 x2', 'st bleed 1'),
    N('Rajada Que Esfola', 'O vento arranca a pele.', 'd12/8', 'st bleed 2'),
    N('Rajada Cortante Ampla', 'O corte do vento pega todos.', 'd12/10 a', 'st bleed 1'),
    N('Rajada Que Corta o Céu', 'Uma rajada que rasga até as nuvens.', 'd16/11', 'pierce 70; st bleed 2'),
  ],
  'Dardo de Tempestade': [
    N('Dardos de Tempestade', 'Três dardos de vento.', 'd10/9 x3'),
    N('Dardo do Olho do Furacão', 'Um dardo do centro calmo do furacão.', 'd14/10', 'pierce 70; push 30'),
    N('Dardo do Céu Gelado', 'Um dardo de ar frio de muito alto.', 'd18/12', 'pierce 80; st frozen 1 40%'),
  ],

  // ---------- Amaterasu ----------
  'Toque Morno': [
    N('Toque Morno Profundo', 'O calor da mão chega mais fundo.', 'h8/4'),
    N('Toque Que Limpa', 'A mão tira o mal do corpo.', 'h8/4', 'cleanse'),
    N('Toque Que Fortalece', 'O calor da mão volta como força.', 'h8/4', 'st atkUp 1'),
    N('Toque Que Protege', 'A luz fica em volta do aliado.', 'h8/5', 'shield 6'),
    N('Toque Morno Constante', 'O calor continua sarando.', 'h10/5', 'st regen 2'),
    N('Toque do Sol Alto', 'O sol a pino na palma da mão.', 'h12/6', 'cleanse; shield 8'),
    N('Toque do Meio-Dia', 'A luz do meio-dia sara todos.', 'h12/9 a', 'st regen 2'),
  ],
  'Raio de Revide': [
    N('Raio de Revide Duplo', 'Dois raios de luz de volta.', 'd10/7 x2', 'st blind 1 20%'),
    N('Revide Ofuscante', 'O revide cega por mais tempo.', 'd12/8', 'st blind 2'),
    N('Revide Solar', 'A luz do revide cai sobre todos os que se abriram.', 'd12/10 a', 'vs exposed 1.4'),
    N('Revide do Sol a Pino', 'O sol inteiro responde.', 'd16/11', 'vs exposed 2; st blind 1'),
  ],
  'Lâmina de Luz': [
    N('Lâminas de Luz Gêmeas', 'Duas lâminas de luz pura.', 'd12/9 x2', 'vs demon 1.3'),
    N('Lâmina do Sol Poente', 'A lâmina ofusca como o fim da tarde.', 'd14/10', 'st blind 2; vs demon 1.4'),
    N('Lâmina do Primeiro Raio', 'A primeira luz do mundo, afiada.', 'd18/12', 'pierce 80; vs demon 1.6'),
  ],

  // ---------- Tsukuyomi ----------
  'Loucura Súbita': [
    N('Loucura Dupla', 'Duas ideias erradas ao mesmo tempo.', 'm8/6 x2'),
    N('Loucura Que Assusta', 'A loucura vem com medo.', 'm10/6', 'st fear 1 30%'),
    N('Loucura Confusa', 'O alvo esquece de que lado está.', 'm10/6', 'st confuse 1 25%'),
    N('Loucura Contagiosa', 'A loucura passa de um para o outro.', 'm10/8 a'),
    N('Loucura Que Paralisa de Medo', 'O medo trava os braços.', 'm12/8', 'st fear 1 40%; st atkDn 1'),
    N('Loucura Lunar', 'A lua cheia na cabeça do alvo.', 'm14/9', 'st confuse 1 40%'),
    N('Loucura da Lua Cheia', 'Todos enlouquecem sob a mesma lua.', 'm16/13 a', 'st confuse 1 35%; st fear 1 30%'),
  ],
  'Voz Hipnótica': [
    N('Voz Que Adormece', 'A voz pede, e o alvo dorme.', 'm10/7', 'st sleep 1 35%'),
    N('Voz em Coro', 'A voz se divide e chega a todos.', 'm10/9 a', 'st sleep 1 25%'),
    N('Voz Que Manda Dormir', 'Não é mais pedido, é ordem.', 'm12/9', 'st sleep 1 45%'),
    N('Voz da Lua Nova', 'A voz da noite sem lua, que ninguém desobedece.', 'm16/11', 'st sleep 2 50%'),
  ],
  'Lâmina de Sombra': [
    N('Lâminas de Sombra Gêmeas', 'Duas lâminas de breu.', 'd12/9 x2', 'st blind 1 25%'),
    N('Lâmina Que Sai da Sombra', 'A lâmina sai da sombra do próprio alvo.', 'd14/10', 'pierce 60; st fear 1 30%'),
    N('Lâmina da Noite Sem Fim', 'Um corte da noite que não acaba.', 'd18/12', 'pierce 80; st blind 2'),
  ],

  // ---------- Shukketsu ----------
  'Pele de Sangue': [
    N('Pele de Sangue Grossa', 'O sangue engrossa sobre a pele.', 'h8/4', 'shield 5'),
    N('Pele Que Coagula', 'O sangue endurece e protege.', 'h8/4', 'st defUp 1'),
    N('Pele de Sangue Viva', 'A pele de sangue continua fechando as feridas.', 'h8/4', 'st regen 1'),
    N('Pele Rubra Compartilhada', 'O sangue cobre os aliados também.', 'h8/7 a'),
    N('Pele de Sangue Endurecida', 'Uma crosta de sangue duro.', 'h10/6', 'shield 8'),
    N('Pele de Sangue Eterna', 'A pele de sangue não seca mais.', 'h12/6', 'st regen 2'),
    N('Couraça Rubra', 'Uma armadura inteira de sangue.', 'h14/8', 'shield 10; st defUp 1'),
  ],
  'Maldição de Sangue': [
    N('Maldição Dupla', 'Duas maldições na mesma veia.', 'd10/7 x2', 'st bleed 1'),
    N('Maldição Que Seca', 'A maldição bebe o alvo.', 'd12/8', 'drain hp 30'),
    N('Maldição de Sangue em Todos', 'Todos sangram pela mesma maldição.', 'd12/10 a', 'st bleed 2'),
    N('Maldição do Sangue Ruim', 'O sangue estoura e volta para quem amaldiçoou.', 'd16/11', 'det bleed 5; drain hp 30'),
  ],
  'Punhalada Rubra': [
    N('Punhaladas Rubras', 'Três punhaladas rápidas.', 'd10/9 x3', 'st bleed 1'),
    N('Punhalada Que Bebe', 'A punhalada bebe pela ferida.', 'd14/10', 'drain hp 45; st bleed 1'),
    N('Punhalada no Coração', 'Direto no coração, e tudo estoura.', 'd18/12', 'pierce 70; det bleed 6'),
  ],

  // ---------- Hiruko ----------
  'Corrosão': [
    N('Corrosão Dupla', 'Duas gotas corrosivas.', 'd8/6 x2'),
    N('Corrosão Lenta', 'A corrosão continua comendo.', 'd10/6', 'st poison 1'),
    N('Corrosão Que Abre', 'A corrosão abre a defesa.', 'd10/6', 'st defDn 1'),
    N('Nuvem Corrosiva', 'Uma nuvem que corrói todos.', 'd10/8 a', 'st poison 1 30%'),
    N('Corrosão Profunda', 'A corrosão chega no osso.', 'd12/8', 'st poison 2; st defDn 1'),
    N('Corrosão Mutante', 'A corrosão muda o corpo e amassa a guarda.', 'd14/9', 'brk 1; st poison 2'),
    N('Corrosão Total', 'Nada fica inteiro.', 'd16/13 a', 'st poison 2; st defDn 1'),
  ],
  'Espora Venenosa': [
    N('Esporas Duplas', 'Duas esporas de veneno.', 'd10/7 x2', 'st poison 1'),
    N('Espora Que Prende', 'A espora crava e não sai.', 'd12/8', 'st poison 2; st root 1 30%'),
    N('Nuvem de Esporas', 'Esporas sobre todos.', 'd12/10 a', 'st poison 2'),
    N('Espora do Predador', 'A espora do bicho que caça sozinho.', 'd16/11', 'pierce 60; st poison 3'),
  ],
  'Febre Atômica': [
    N('Febre Atômica Dupla', 'Duas ondas de febre.', 'd12/9 x2', 'st rad 1'),
    N('Febre Que Derrete', 'A febre derrete a defesa.', 'd14/10', 'st rad 2; st defDn 1'),
    N('Febre do Núcleo Aberto', 'O núcleo abre e a febre toma todos.', 'd16/13 a', 'st rad 2; st poison 2'),
  ],

  // ---------- Aura (Nen, sem elemento) ----------
  'Aura Formigante': [
    N('Aura Formigante Dupla', 'Dois toques formigantes.', 'd8/6 x2', 'st stun 1 20%'),
    N('Aura Que Adormece o Braço', 'O braço formiga e perde a força.', 'd10/6', 'st atkDn 1'),
    N('Aura Formigante Ampla', 'O formigamento chega a todos.', 'd10/8 a', 'st stun 1 25%'),
    N('Aura Que Trava', 'O formigamento vira trava.', 'd10/7', 'st stun 1 50%'),
    N('Aura Que Corre nos Nervos', 'A aura corre pelos nervos e abre a guarda.', 'd12/8', 'st stun 1 40%; st exposed 1'),
    N('Aura Que Desliga', 'O corpo desliga por um instante.', 'd14/9', 'st stun 2 60%'),
    N('Aura do Toque Final', 'Um toque, e o corpo esquece como lutar.', 'd18/11', 'st stun 2 70%; brk 1'),
  ],
  'Aura de Navalha': [
    N('Navalhas de Aura', 'Três navalhas de aura.', 'd10/8 x3', 'st bleed 1'),
    N('Navalha Que Trava', 'A navalha corta e trava.', 'd12/8', 'st stun 1 50%; st bleed 1'),
    N('Leque de Navalhas', 'Navalhas de aura em todos.', 'd12/10 a', 'st bleed 1'),
    N('Navalha de Aura Perfeita', 'A aura afiada até não sobrar espessura.', 'd16/11', 'pierce 70; st stun 1 55%'),
  ],
  'Raio Contínuo': [
    N('Raio Contínuo Duplo', 'Dois raios de aura sem pausa.', 'd12/9 x2', 'pierce 60'),
    N('Raio Que Não Para', 'O raio continua, e a cada duas vezes pesa mais.', 'd14/10', 'pierce 80; every 2 1.5'),
    N('Raio Contínuo Absoluto', 'Nada no caminho segura o raio.', 'd18/12', 'pierce 100'),
  ],

  // ---------- Ocultismo (sem elemento) ----------
  'Fome da Maldição': [
    N('Fome Dupla', 'A maldição morde duas vezes.', 'd8/6 x2', 'st bleed 1'),
    N('Fome Que Morde', 'A mordida abre ferida funda.', 'd10/6', 'st bleed 2'),
    N('Fome Que Cura', 'O que a maldição come volta para você.', 'd10/6', 'st regen 1 self'),
    N('Fome Coletiva', 'A maldição tem fome de todos.', 'd10/8 a', 'st bleed 1'),
    N('Fome Que Não Passa', 'Quanto mais sangra, mais ela come.', 'd12/8', 'vs bleed 1.4; st regen 1 self'),
    N('Fome Antiga', 'Uma fome mais velha que o nome de quem a carrega.', 'd14/9', 'st bleed 3; st regen 2 self'),
    N('Fome do Sem-Nome', 'A maldição come até o que não tem nome.', 'd18/11', 'vs bleed 1.7; st regen 2 self'),
  ],
  'Sigilo de Banimento': [
    N('Sigilos Gêmeos', 'Dois sigilos de banimento.', 'd10/7 x2', 'vs demon 1.3'),
    N('Sigilo Que Prende', 'O sigilo prende o demônio no lugar.', 'd12/8', 'vs demon 1.4; st root 1'),
    N('Círculo de Banimento', 'Um círculo que pega todos.', 'd12/10 a', 'vs demon 1.3'),
    N('Sigilo do Banimento Final', 'O sigilo que manda de volta para sempre.', 'd16/11', 'vs demon 1.9; pierce 60'),
  ],
  'Teoria Maluca': [
    N('Teoria Comprovada', 'A teoria maluca funcionou de novo.', 'd14/10', 'every 2 3.3'),
    N('Teoria do Caos', 'A teoria agora vale para todos.', 'd14/12 a', 'every 2 2.8'),
    N('Teoria Final', 'A última página do caderno.', 'd18/12', 'every 2 3.8; brk 1'),
  ],
};

// abre as linhas: cada base ganha um ramo com `de` no setor dela (antes de arvore/temas.js e arvore/camadas.js)
export function abrir(TREE) {
  const nomes = new Set(Object.values(TREE).flatMap(t => (t.branches || []).flat()).map(s => s.n));
  const antigo = Object.fromEntries(Object.entries(RENOMES).map(([o, v]) => [v[0], o])); // a base pode ainda ter o nome de antes de arvore/temas.js
  for (const [nome, ns] of Object.entries({ ...LINHAS11, ...ABRIR12 })) {
    const acha = n => Object.values(TREE).find(t => t.branches?.some(b => !b.de && b.some(s => s.n === n)));
    const base = acha(nome) ? nome : antigo[nome], t = base && acha(base);
    if (!t) throw new Error(`Leva 11: técnica-base "${nome}" não encontrada`);
    if (t.branches.some(b => b.de === base)) throw new Error(`Leva 11: "${base}" já tem linha de variação`);
    const ref = t.branches.flat().find(s => s.n === base);
    const L = ns.map(o => {
      if (nomes.has(o.n)) throw new Error(`Leva 11: nome repetido "${o.n}"`); nomes.add(o.n);
      const s = { ...o, xp: 50 };
      if (s.k !== 'passive') s.a = ref.a || 'FOR';
      for (const k of ['cat', 'ob']) if (ref[k] != null && s[k] == null) s[k] = ref[k];
      return s;
    });
    L.de = base; t.branches.push(L);
  }
}

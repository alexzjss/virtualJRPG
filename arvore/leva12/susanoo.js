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
  // ---------- Rodada 2 ----------
  // base na camada 3: sete nós (4-10)
  'Bala de Gelo': [
    N('Bala de Gelo Dupla', 'Duas balas frias, uma em cima da outra.', 'd10/6 x2', 'st agiDn 1'),
    N('Bala de Gelo Perfurante', 'A ponta fina atravessa o colete e congela por dentro.', 'd14/7', 'pierce 60; st frozen 1 20%'),
    N('Bala de Gelo Estilhaçante', 'A bala racha ao entrar e espalha cacos gelados.', 'd14/9 a', 'st frozen 1 25%; st bleed 1'),
    N('Bala de Gelo Que Prende', 'O gelo cola o alvo ao chão onde ele estava.', 'd18/10', 'st frozen 1 40%; st root 1'),
    N('Bala de Gelo Carregada', 'A corrente do aliado corre pelo gelo e trava o alvo.', 'd20/11', 'st para 1 40%; st frozen 1 20%', { v2: 'indra' }),
    N('Bala de Gelo no Ponto Fraco', 'Entra onde o alvo está exposto e gela de dentro para fora.', 'd26/12', 'vs exposed 1.5; st frozen 1 50%'),
    N('Bala do Zero Absoluto', 'A bala mais fria já disparada: nada se mexe depois dela.', 'd34/15', 'pierce 100; st frozen 2 60%'),
  ],
  // base na camada 4: seis nós (5-10)
  'Rajada Gélida': [
    N('Rajada Gélida Dupla', 'Duas rajadas frias sobre a mesma linha.', 'd10/9 a x2', 'st agiDn 1'),
    N('Rajada Gélida Longa', 'Não para: segue varrendo a linha inimiga.', 'd14/10 a', 'st frozen 1 25%'),
    N('Rajada de Estilhaços Gelados', 'Cada bala racha em cacos que cortam.', 'd16/11 a', 'st bleed 1; st frozen 1 30%'),
    N('Rajada Gélida Encharcante', 'A rajada vem molhada e o gelo pega na pele.', 'd18/12 a', 'st wet 2; st frozen 1 40%'),
    N('Rajada Gélida Cerrada', 'Tantas balas que não sobra espaço para desviar.', 'd24/13 a', 'pierce 60; st frozen 1 45%'),
    N('Nevasca de Balas', 'Uma tempestade de gelo em forma de chumbo.', 'd34/17 a', 'st frozen 2 60%; st bleed 2'),
  ],
  // base na camada 6: quatro nós (7-10)
  'Soco de Onda': [
    N('Soco de Onda Duplo', 'Duas ondas de impacto, a segunda mais pesada.', 'd14/9 x2', 'st wet 1'),
    N('Soco de Onda Que Derruba', 'O peso vem depois e o alvo vai ao chão.', 'd20/10', 'st down 1 50%; st wet 1'),
    N('Soco de Onda Gelado', 'O punho chega frio e congela o que empurra.', 'd24/12', 'st frozen 1 40%; push 25'),
    N('Soco da Onda Gigante', 'Toda a ressaca do mar num punho só.', 'd38/15', 'brk 2; push 40; st wet 3'),
  ],
  // base na camada 3: sete nós (4-10)
  'Névoa Fria': [
    N('Névoa Fria Densa', 'A bruma engrossa e o frio entra nos ossos.', 'd10/9 a', 'st frozen 1 30%'),
    N('Névoa Fria Rasteira', 'Rente ao chão, prende os pés de todos.', 'd12/9 a', 'st agiDn 2; st frozen 1 25%'),
    N('Névoa Que Molha', 'A bruma pesa e deixa todos ensopados.', 'd14/10 a', 'st wet 2; st frozen 1 30%'),
    N('Névoa Cortante', 'O gelo miúdo no ar corta a pele.', 'd16/11 a', 'st bleed 1; st frozen 1 35%'),
    N('Névoa Fria Silenciosa', 'Ninguém ouve, ninguém vê, e o braço pesa.', 'd20/12 a', 'st atkDn 1; st frozen 1 40%'),
    N('Névoa Fria Marinha', 'A névoa do mar aberto, salgada e gelada.', 'd24/13 a', 'vs wet 1.5; st frozen 1 50%'),
    N('Inverno de Névoa', 'O mundo some na bruma e tudo o que está nela congela.', 'd34/16 a', 'st frozen 2 60%; st down 1 40%'),
  ],
  // base na camada 2: oito nós (3-10)
  'Gume Líquido': [
    N('Gume Líquido Duplo', 'Dois gumes de água, um logo depois do outro.', 'd8/6 x2', 'st wet 1'),
    N('Gume Líquido Veloz', 'A lâmina escorre e chega antes da guarda.', 'd10/6', 'sure'),
    N('Gume Líquido Largo', 'O corte abre em arco e molha a linha toda.', 'd12/8 a', 'st wet 1'),
    N('Gume Líquido Gelado', 'A água da lâmina vira gelo no instante do corte.', 'd14/8', 'st frozen 1 30%'),
    N('Gume Líquido Cortante', 'Tão fina que passa pela armadura.', 'd18/9', 'pierce 60; st bleed 1'),
    N('Gume Líquido Ressonante', 'A água ressoa e abre a guarda de quem já está molhado.', 'd22/11', 'vs wet 1.5; st exposed 1'),
    N('Gume das Mil Correntes', 'Três cortes, cada um por uma corrente diferente.', 'd10/10 x3', 'st wet 1'),
    N('Gume do Oceano Inteiro', 'Uma lâmina com o peso do mar atrás dela.', 'd40/15', 'pierce 100; st wet 3; brk 1'),
  ],
  // base na camada 2: oito nós (3-10)
  'Afogar': [
    N('Afogar Lento', 'O ar escapa devagar e o alvo arrasta os pés.', 'd10/6', 'st agiDn 2'),
    N('Afogar em Duas Golfadas', 'Duas golfadas de água, uma atrás da outra.', 'd9/7 x2', 'st wet 1'),
    N('Afogar Sem Ar', 'Sem fôlego, o braço perde a força.', 'd12/8', 'st atkDn 1 40%; st wet 1'),
    N('Afogar em Poça', 'A água sobe do chão e engole os pés de todos.', 'd12/8 a', 'st wet 2'),
    N('Afogar Que Prende', 'A água se enrosca nas pernas e segura.', 'd16/9', 'st root 1 50%; st wet 1'),
    N('Afogar no Fundo', 'Puxa o alvo para baixo, onde ninguém alcança.', 'd20/11', 'st down 1 50%; vs wet 1.5'),
    N('Afogar Gelado', 'A água nos pulmões vira gelo.', 'd22/12', 'st frozen 1 50%; st wet 1'),
    N('Afogamento Absoluto', 'O mar inteiro se fecha sobre o alvo.', 'd36/15', 'st frozen 2 60%; st wet 3'),
  ],
  // base na camada 1: nove nós (2-10)
  'Corte de Maré': [
    N('Corte de Maré Duplo', 'Dois cortes na mesma vazante.', 'd8/5 x2', 'st wet 1'),
    N('Corte de Maré Rasteiro', 'O sabre varre os tornozelos.', 'd10/5', 'st down 1 30%'),
    N('Corte de Maré Largo', 'O corte abre em leque e atinge todos.', 'd10/6 a', 'st agiDn 1'),
    N('Corte de Maré Pesado', 'A lâmina vem com o peso da onda.', 'd12/7', 'st wet 1; push 15'),
    N('Corte de Maré Gélido', 'A maré fria deixa o alvo duro e lento.', 'd14/8', 'st frozen 1 25%; st agiDn 1'),
    N('Corte de Maré Afiado', 'O fio é tão fino que passa direto.', 'd16/9', 'pierce 60; st wet 1'),
    N('Corte de Maré Que Arrasta', 'A lâmina leva consigo quem está molhado.', 'd20/10', 'push 35; vs wet 1.5'),
    N('Corte da Maré Viva', 'Dois cortes fundos na maré mais forte do mês.', 'd20/12 x2', 'pierce 60; st wet 2'),
    N('Corte do Mar Inteiro', 'O sabre abre o mar ao meio e o mar fecha em cima.', 'd40/15', 'pierce 100; brk 2; st wet 3'),
  ],
  // base na camada 1: nove nós (2-10)
  'Marca de Sal': [
    N('Marca de Sal Funda', 'O sal entra mais fundo e a marca não sai.', 'd8/4', 'brand 4; st wet 1'),
    N('Marca de Sal Dupla', 'Duas marcas de sal, uma em cada ombro.', 'd6/4 x2', 'brand 3'),
    N('Marca de Sal Larga', 'Sal jogado ao vento marca toda a linha.', 'd8/6 a', 'brand 3; st wet 1'),
    N('Marca de Sal Cortante', 'O sal na ferida abre mais o corte.', 'd10/6', 'brand 4; st bleed 1'),
    N('Marca de Sal Que Gruda', 'A crosta de sal pesa e prende o movimento.', 'd12/7', 'brand 5; st agiDn 2'),
    N('Marca de Sal Gelada', 'Sal e gelo na mesma marca.', 'd14/8', 'brand 4; st frozen 1 30%'),
    N('Marca de Sal do Mar', 'A marca mais antiga: a do mar aberto.', 'd18/10', 'brand 6; vs wet 1.5'),
    N('Marca da Maré Alta', 'A maré sobe e a marca cobre todos.', 'd22/11 a', 'brand 5; st wet 2'),
    N('Marca do Sal Eterno', 'Uma marca que o mar nunca lava.', 'd34/14', 'brand 8; st exposed 2; st wet 3'),
  ],
  // base na camada 1: nove nós (2-10)
  'Gota Restauradora': [
    N('Gota Restauradora Constante', 'A gota cai e continua caindo.', 'h10/4', 'st regen 1'),
    N('Gota Restauradora Funda', 'A gota entra mais fundo e leva o que faz mal.', 'h12/5', 'cleanse'),
    N('Gota Cristalina', 'Uma gota tão limpa que fecha a ferida sozinha.', 'h14/6', 'st regen 2'),
    N('Gotas em Roda', 'Gotas caem em roda sobre todos os aliados.', 'h12/7 a', 'st regen 1'),
    N('Gota de Nascente Pura', 'Água da primeira nascente, cura e lava.', 'h18/8', 'cleanse; st regen 2'),
    N('Gota Que Protege', 'A gota fecha o corte e deixa uma película na pele.', 'h18/9', 'shield 12; st regen 1'),
    N('Gotas Restauradoras da Maré', 'A maré mansa pinga sobre o grupo e cura devagar.', 'h22/10 a', 'st regen 2; cleanse'),
    N('Gota de Orvalho Vivo', 'A gota que chama de volta quem já tinha caído.', 'h28/12', 'revive 40; st regen 2'),
    N('Gota do Mar Inteiro', 'Uma gota que carrega o mar: cura, lava e protege todos.', 'h40/15 a', 'st regen 4; cleanse; shield 20'),
  ],
};

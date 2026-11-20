// Leva 12 (evolução lógica), setor shukketsu. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
import { N } from '../l8.js';
export const ESTENDER = {};
export const ABRIR = {
  // base na camada 4: linha de 6 (camadas 5 a 10)
  'Lança de Sangue': [
    N('Lanças Gêmeas', 'Duas lanças de sangue, uma atrás da outra.', 'd8/9 x2', 'st bleed 1'),
    N('Lança Que Prende', 'A lança crava no chão e segura o alvo pela própria ferida.', 'd14/8', 'st root 1 40%; st bleed 1'),
    N('Lança de Sangue Acumulada', 'Cada lança guarda o sangue da anterior.', 'd16/9', 'stack sangue 5; st bleed 1'),
    N('Lança de Sangue Flamejante', 'O sangue da lança ferve e queima por dentro.', 'd16/9', 'st burn 2; st bleed 1', { v2: 'kagutsuchi' }),
    N('Lança de Sangue Que Rouba', 'A lança volta pelo mesmo buraco e traz a vida junto.', 'd20/11', 'drain hp 45; st bleed 2'),
    N('Lança de Sangue Detonadora', 'O sangue guardado estoura na ponta da lança.', 'd28/13', 'burst sangue 0.11; det bleed 8.45'),
  ],
  'Rajada Escarlate': [
    N('Rajada Concentrada', 'As balas vermelhas vão todas no mesmo ponto.', 'd14/9', 'pierce 60; st bleed 1'),
    N('Rajada Escarlate Dupla', 'Duas rajadas seguidas varrem a linha.', 'd7/11 a x2', 'st bleed 1'),
    N('Rajada Acumulada', 'Cada bala que acerta guarda sangue para a próxima.', 'd14/10', 'stack sangue 5; st bleed 1'),
    N('Rajada Escarlate Elétrica', 'O sangue das balas corre num pulso que trava o músculo.', 'd16/10 a', 'st para 1 35%; st bleed 1', { v2: 'indra' }),
    N('Rajada Que Rouba', 'As balas voltam pelo ferimento e trazem a vida.', 'd18/11 a', 'drain hp 30; st bleed 1'),
    N('Rajada Detonadora', 'Todo o sangue guardado estoura nas feridas abertas.', 'd30/13', 'burst sangue 0.11; det bleed 9'),
  ],
  // base na camada 5: linha de 5 (camadas 6 a 10)
  'Soco Rubro': [
    N('Soco Rubro em Dobro', 'Dois socos no mesmo rosto.', 'd9/10 x2', 'st bleed 1'),
    N('Soco de Guarda Rachada', 'O punho de sangue endurecido racha a guarda.', 'd22/10', 'brk 1; st bleed 1'),
    N('Soco Rubro Sísmico', 'O impacto treme o chão e derruba o alvo.', 'd24/11', 'st down 1 40%; brk 1', { v2: 'atlas' }),
    N('Soco Rubro Que Rouba', 'O punho bebe do corte que abriu.', 'd26/12', 'drain hp 45; st bleed 2'),
    N('Soco Final de Sangue', 'O último soco abre tudo de uma vez e deixa o alvo tonto.', 'd36/14', 'det bleed 10; st stun 1 40%'),
  ],
  'Veia Aberta': [
    N('Veias Abertas', 'Todas as veias da linha se abrem de uma vez.', 'd14/12 a', 'st bleed 1 40%'),
    N('Veia Que Reabre', 'A ferida fecha e reabre no golpe seguinte.', 'd20/11', 'echo 54'),
    N('Veia Aberta Ventosa', 'O vento abre a ferida e espalha o sangue em navalhas.', 'd20/11 a', 'st bleed 2; push 24', { v2: 'fuhaku' }),
    N('Veia Aberta Acumulada', 'Cada jato guarda sangue para a veia seguinte.', 'd28/13', 'stack sangue 5; per bleed 15'),
    N('Veia Aberta Absoluta', 'Uma veia só, sem remédio, e o alvo é o único que sobra.', 'd38/20', 'st bleed 3; solo 2.2; drain hp 60'),
  ],
  // base na camada 8: linha de 2 (camadas 9 e 10)
  'Estripar': [
    N('Estripar Que Rouba', 'Abre de ponta a ponta e bebe o que cai.', 'd34/16', 'drain hp 60; st bleed 2'),
    N('Estripar Sem Volta', 'O golpe que termina o que já estava aberto.', 'd44/20', 'exec 35 1.6; st bleed 3'),
  ],
  // cura: base na camada 2, linha de 8 (camadas 3 a 10)
  'Transfusão': [
    N('Transfusão Rápida', 'O sangue passa antes que a ferida acabe de abrir.', 'h10/4 t60', 'st regen 1'),
    N('Transfusão Coletiva', 'O sangue corre pelo grupo inteiro, um pouco para cada.', 'h8/7 a'),
    N('Transfusão Que Limpa', 'O sangue novo leva o ruim embora.', 'h14/7', 'cleanse'),
    N('Transfusão Sagrada', 'Um sangue limpo e abençoado entra na veia do aliado.', 'h16/9', 'cleanse; st regen 2', { v2: 'amaterasu' }),
    N('Transfusão Que Fortalece', 'O sangue que passa vem cheio de fúria.', 'h16/9', 'st atkUp 2'),
    N('Transfusão de Fôlego', 'Junto com o sangue vai um pouco de fôlego.', 'h20/11', 'res aura 7'),
    N('Transfusão Que Protege', 'O sangue novo endurece em crosta sobre a ferida.', 'h24/12', 'shield 12'),
    N('Transfusão Total', 'O corpo inteiro do aliado é refeito com o sangue de outro.', 'h40/20 t150', 'st regen 3; shield 15'),
  ],
  // --- rodada 2 ---
  // base na camada 4: linha de 6
  'Garras de Sangue': [
    N('Garras de Sangue Duplas', 'As duas mãos rasgam ao mesmo tempo e bebem o que cai.', 'd7/8 x2', 'drain hp 45; st bleed 1'),
    N('Garras Que Rasgam a Guarda', 'As unhas endurecidas encontram a fresta da armadura.', 'd16/9', 'brk 1; drain hp 45'),
    N('Garras de Sangue Acumuladas', 'Cada rasgo guarda sangue para o seguinte.', 'd18/10', 'stack sangue 5; st bleed 1'),
    N('Garras de Sangue Ventosas', 'O vento abre a ferida e a garra puxa o sangue pelo rasgo.', 'd20/11 a', 'push 30; st bleed 2; drain hp 45', { v2: 'fuhaku' }),
    N('Garras de Sangue Detonadoras', 'O sangue guardado estoura de uma vez na carne rasgada.', 'd28/13', 'burst sangue 0.11; det bleed 8'),
    N('Garras de Sangue Primordiais', 'As garras da primeira fome, que não largam o que prenderam.', 'd36/16', 'drain hp 70; st bleed 3; brk 2'),
  ],
  'Marca de Sangue': [
    N('Marca de Sangue Dupla', 'Duas marcas no mesmo corpo, uma por cima da outra.', 'd10/8', 'st marked 1; st exposed 1'),
    N('Marca Que Corta', 'A marca arde e abre uma ferida por baixo.', 'd14/9', 'st marked 1; st bleed 1'),
    N('Marca de Sangue Coletiva', 'Todos os inimigos recebem a marca ao mesmo tempo.', 'd12/11 a', 'st marked 1'),
    N('Marca de Sangue Sombria', 'A marca escurece e enche o alvo de pavor.', 'd16/11', 'st marked 1; st fear 1 40%', { v2: 'tsukuyomi' }),
    N('Marca de Sangue Detonadora', 'Quem leva a marca sente o golpe seguinte como três.', 'd24/13', 'vs marked 1.5; det bleed 8'),
    N('Marca de Sangue Final', 'A última marca, a que fecha a conta do caçador.', 'd34/16 a', 'st marked 2; st bleed 2; drain hp 40'),
  ],
  'Lança Arterial': [
    N('Lança Arterial Dupla', 'Duas lanças saem pelo mesmo buraco, uma atrás da outra.', 'd8/12 x3', 'drain hp 20'),
    N('Lança Arterial Que Prende', 'A lança crava e segura o alvo pela artéria aberta.', 'd20/11', 'st root 1 40%; drain hp 30'),
    N('Lança Arterial Acumulada', 'Cada lança deixa um pouco de sangue na seguinte.', 'd24/12', 'stack sangue 5; drain hp 30'),
    N('Lança Arterial Detonadora', 'O sangue guardado estoura de dentro da ferida.', 'd30/14', 'burst sangue 0.11; det bleed 8'),
    N('Lança Arterial Suprema', 'A lança que atravessa, volta e leva a vida inteira consigo.', 'd40/18', 'drain hp 80; st bleed 3'),
  ],
  'Feixe Perfurante': [
    N('Feixe Perfurante Duplo', 'Dois feixes comprimidos atravessam o mesmo ponto.', 'd12/10 x2', 'pierce 100'),
    N('Feixe Perfurante Acumulado', 'Cada feixe carrega o sangue do anterior.', 'd20/11 c1', 'pierce 100; stack sangue 5'),
    N('Feixe Perfurante Elétrico', 'O feixe corre em pulsos e trava o músculo do alvo.', 'd24/12', 'pierce 100; st para 1 35%', { v2: 'indra' }),
    N('Feixe Perfurante Detonador', 'O sangue guardado estoura depois que o feixe passou.', 'd32/14 c1', 'pierce 100; burst sangue 0.11; det bleed 8'),
    N('Feixe Perfurante Supremo', 'Um único feixe que não encontra armadura nenhuma.', 'd44/20 c1', 'pierce 100; st bleed 3; brk 2'),
  ],
  'Chicote de Veias': [
    N('Chicote de Veias Duplo', 'Duas voltas de veia estalam seguidas.', 'd6/12 x5', 'drain hp 25', { cmd: 'martelar', mx: 5 }),
    N('Chicote Que Amarra', 'A veia enrola no braço do alvo e o segura.', 'd20/12', 'st root 1 40%; drain hp 30'),
    N('Chicote de Veias Detonador', 'O sangue que o chicote bebeu volta num estalo só.', 'd28/14', 'burst sangue 0.11; det bleed 8; drain hp 30'),
    N('Chicote de Veias Supremo', 'As veias do caçador viram um chicote sem fim.', 'd8/18 x6', 'drain hp 40; st bleed 2', { cmd: 'martelar', mx: 6 }),
  ],
  'Punho de Sangue': [
    N('Punho de Sangue Duplo', 'Dois socos no mesmo corte.', 'd11/10 x2', 'st bleed 1'),
    N('Punho de Sangue Acumulado', 'Cada soco guarda sangue para o próximo.', 'd24/11', 'stack sangue 5; st bleed 1'),
    N('Punho de Sangue Detonador', 'O sangue guardado explode no nó dos dedos.', 'd32/13', 'burst sangue 0.11; det bleed 8'),
    N('Punho de Sangue Supremo', 'O punho que abre o peito e deixa tudo à mostra.', 'd42/17', 'brk 2; st bleed 3; st stun 1 40%'),
  ],
  // base na camada 5
  'Sangue Limpo': [
    N('Sangue Limpo Rápido', 'O sangue novo passa antes de o ruim assentar.', 'h14/6 t60', 'cleanse'),
    N('Sangue Limpo Coletivo', 'O sangue corre limpo por todos os aliados.', 'h12/10 a', 'cleanse'),
    N('Sangue Limpo Que Cura', 'Limpa e deixa o corpo se refazendo.', 'h24/10', 'cleanse; st regen 2'),
    N('Sangue Limpo Sagrado', 'O sangue filtrado sai puro e abençoado.', 'h28/12', 'cleanse; st regen 2; shield 10', { v2: 'amaterasu' }),
    N('Sangue Limpo Primordial', 'O sangue de antes de qualquer doença, devolvido ao grupo.', 'h38/20 a', 'cleanse; st regen 3; shield 15'),
  ],
  // base na camada 4, cura
  'Transfusão de Campo': [
    N('Transfusão de Campo Rápida', 'O sangue passa de um para o outro sem pausa.', 'h12/5 t60', 'st regen 1'),
    N('Transfusão de Campo em Dupla', 'Dois aliados recebem o sangue ao mesmo tempo.', 'h10/9 a'),
    N('Transfusão de Campo Que Protege', 'O sangue novo endurece em crosta sobre a ferida.', 'h20/10', 'shield 10'),
    N('Transfusão de Campo Que Fortalece', 'O sangue que passa vem cheio de fúria.', 'h22/11', 'st atkUp 2'),
    N('Transfusão de Campo Vital', 'O sangue leva fôlego junto com a vida.', 'h30/14', 'st regen 2; res aura 6'),
    N('Transfusão de Campo Suprema', 'Todo o grupo recebe sangue novo, a tempo de aguentar mais um turno.', 'h42/20 a', 'st regen 3; shield 15'),
  ],
  // base na camada 7
  'Empalamento Rubro': [
    N('Empalamento Duplo', 'Duas estocadas, a segunda no buraco da primeira.', 'd16/12 x2', 'st bleed 1'),
    N('Empalamento Que Bebe', 'A estocada fica cravada o tempo de beber.', 'd34/15', 'drain hp 60; st bleed 2'),
    N('Empalamento Rubro Supremo', 'A estocada final atravessa e deixa o alvo preso à própria ferida.', 'd44/20', 'st root 1 50%; st bleed 3; det bleed 10'),
  ],
  'Vampirismo': [
    N('Vampirismo Ávido', 'Bebe mais depressa do que o alvo consegue sangrar.', 'd30/11', 'drain hp 75'),
    N('Vampirismo em Todos', 'A sede se espalha e o caçador bebe de cada inimigo.', 'd18/14 a', 'drain hp 40'),
    N('Vampirismo Supremo', 'Nada sobra no corpo do alvo, e tudo vai para o caçador.', 'd44/20', 'drain hp 100; st bleed 2'),
  ],
  'Lâmina de Sacrifício': [
    N('Lâmina de Sacrifício Dupla', 'Dois cortes lentos, duas oferendas.', 'd18/12 x2 t130', 'st bleed 1'),
    N('Lâmina de Sacrifício Detonadora', 'A oferenda guardada estoura quando a lâmina sai.', 'd34/15 t130', 'det bleed 9; st bleed 2'),
    N('Lâmina de Sacrifício Suprema', 'O deus carmesim cobra o que falta e leva o que sobrou.', 'd46/20 t130', 'exec 35 1.6; st bleed 3'),
  ],
  // base na camada 8
  'Talho Venoso': [
    N('Talho Venoso em Cruz', 'Dois talhos em cruz que nunca mais se fecham.', 'd16/13 x2', 'st bleed 1; vs bleed 1.3'),
    N('Talho Venoso Final', 'O talho que termina o que já estava aberto.', 'd44/20', 'det bleed 10; st bleed 3'),
  ],
  'Gládio de Sangue': [
    N('Gládio de Sangue Duplo', 'Duas lâminas de sangue, cada uma mais afiada que a outra.', 'd16/13 x2', 'drain hp 45; vs bleed 1.55'),
    N('Gládio de Sangue Supremo', 'A espada que só cresce com a ferida do inimigo.', 'd44/20', 'drain hp 70; vs bleed 1.8'),
  ],
  'Elo de Sangue': [
    N('Elo de Sangue Duplo', 'O elo vai e volta, e os dois corpos se sustentam.', 'h30/14', 'res aura 10; cleanse'),
    N('Elo de Sangue Primordial', 'Todo o grupo preso ao mesmo sangue, sem ninguém sozinho.', 'h32/22 a', 'res aura 8; shield 15; st regen 2'),
  ],
};

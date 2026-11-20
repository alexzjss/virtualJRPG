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
};

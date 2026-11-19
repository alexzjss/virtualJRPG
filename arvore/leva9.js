// Leva 9 (18/11/2026): ~370 nós para preencher a árvore em camadas (ver VAGAS-ARVORE.md).
//   leva9a.js: 2 ramos novos por Vínculo, na coluna mais magra de cada setor (maestria, defesa, especial, ofensiva)
//   leva9b.js: Marcial, Aura e Ocultismo (ramos novos nas colunas magras)
//   leva9c.js: 1 ramo de combinações (`v2`) por Vínculo, um nó com cada outro kami
//   CASAS (aqui): as casas livres dos ramos que não chegavam a 10 nós (achados por um nó âncora, depois da reorganização)
// Notação dos nós: arvore/l8.js. Os números finais vêm da camada (arvore/camadas.js): aqui só a ideia e a escala aproximada.
import { N } from './l8.js';
import { XP, RQ } from './camadas.js';
export { R9 } from './l8.js';
import { LEVA9A } from './leva9a.js';
import { LEVA9B } from './leva9b.js';
import { LEVA9C } from './leva9c.js';

export const LEVA9 = {};
for (const P of [LEVA9A, LEVA9B, LEVA9C]) for (const [el, brs] of Object.entries(P)) (LEVA9[el] ??= []).push(...brs);

// casas livres: [setor, nó âncora do ramo, atributo, ...nós]; cada nó entra na casa seguinte do ramo (camada = posição)
const C = (el, ancora, a, ...ns) => ({ el, ancora, a, ns });
const CASAS = [
  C('marcial', 'Força', 'FOR',
    N('Cotovelo no Queixo', 'Um cotovelo curto no queixo.', 'd13/5', 'st stun 1 25%'),
    N('Chute Lateral', 'A sola no flanco do inimigo.', 'd15/5', 'push 30'),
    N('Soco Martelo', 'O punho fechado desce como martelo.', 'd18/6', 'brk 1'),
    N('Combinação de Quatro', 'Quatro golpes que não deixam respirar.', 'd6/7 x4', '', { cmd: 'martelar', mx: 4 }),
    N('Joelho Voador', 'Um salto e o joelho no queixo.', 'd26/9', 'st stun 1 40%'),
    N('Chute Giratório Alto', 'Um giro inteiro e o calcanhar na têmpora.', 'd30/10', 'st down 1'),
    N('Golpe dos Cem Dias', 'Cem dias treinando um golpe só, para usá-lo uma vez.', 'd36/12', 'sure; pierce 40'),
    N('Punho Final', 'Limite: tudo o que o corpo aprendeu num soco só.', 'L54', 'brk 2'),
  ),
  C('susanoo', 'Aparar da Correnteza', 'SAB', N('Maré Que Responde', 'A maré inteira devolve cada golpe recebido.', 'u/12 s', 'st counter 2 self; shield 20 self', { rea: 'counter 40' })),
  C('susanoo', 'Gota Cortante', 'INT', N('Corte do Oceano Partido', 'Um corte que abre o mar em dois.', 'd40/14', 'pierce 80; st wet 2')),
  C('atlas', 'Aparar de Pedra', 'CON', N('Montanha Que Revida', 'Quem bate na montanha quebra a mão.', 'u/12 s', 'st counter 2 self; st defUp 3 self', { rea: 'block 45' })),
  C('atlas', 'Pedra Lascada', 'FOR', N('Queda do Monte', 'O monte inteiro desaba sobre o alvo.', 'd40/14', 'brk 2; st down 1')),
  C('fuhaku', 'Pulso de Fuhaku', 'AGI', N('Sopro do Fim do Céu', 'Um sopro que joga os inimigos para longe do campo.', 'd30/14 a', 'push 70')),
  C('fuhaku', 'Passo do Vendaval', 'AGI', N('Mil Rastros', 'Mil imagens atacam ao mesmo tempo.', 'd8/14 x5', 'sure')),
  C('fuhaku', 'Salto de Ventania', 'SAB', N('Forma do Céu Sem Fim', 'O corpo vira o céu aberto: está em todo lugar.', 'f/12', 'dur 4; agi 40; atk 25; crit 10')),
  C('fuhaku', 'Rajada Curta', 'AGI', N('Corte do Céu Partido', 'Um corte de vento que parte as nuvens ao meio.', 'd40/14', 'pierce 70')),
  C('amaterasu', 'Aparar Solar', 'SAB', N('Sol Que Responde', 'Cada golpe recebido volta como clarão.', 'u/12 s', 'st reflect 2 self; st counter 1 self', { rea: 'counter 40' })),
  C('amaterasu', 'Véu Dourado', 'SAB', N('Santuário Eterno', 'Um santuário de luz que não cai enquanto houver alguém de pé.', 'u/14 a', 'shield 24; cleanse; st regen 3')),
  C('tsukuyomi', 'Eclipse Carmesim: Tsukuyomi', 'INT',
    N('Véu da Lua Nova', 'Sem lua no céu, ninguém vê o caçador chegar.', 'f/4', 'dur 3; agi 10; crit 5'),
    N('Forma do Sonâmbulo', 'Luta de olhos fechados, como quem sonha.', 'f/5', 'dur 3; def 14; agi 8'),
    N('Máscara de Nô', 'Uma máscara branca que mostra o rosto que o inimigo mais teme.', 'f/6', 'dur 3; atk 16; crit 6'),
    N('Olhos da Lua Cheia', 'Os olhos brilham pálidos e não perdem nada.', 'f/6', 'dur 3; hit 18; crit 8'),
    N('Corpo de Breu', 'O corpo vira sombra e os golpes passam por ele.', 'f/7', 'dur 3; agi 20; def 10'),
    N('Duplos da Lua', 'Dois reflexos pálidos saem do caçador e lutam junto.', 'u/9 s', 'clone 2 20 self'),
    N('Forma do Sonho Profundo', 'O caçador luta dentro do próprio sonho, onde manda.', 'f/9', 'dur 3; atk 26; def 16'),
    N('Céu de Lua Eterna', 'A lua não se põe mais: o grupo enxerga tudo, o inimigo, nada.', 'u/14', '', { dom: 'dur 3; ally hit 15; ally agi 10; foe hit -20; tick fear' }),
  ),
  C('shukketsu', 'Aparar Sangrento', 'CON', N('Sangue Que Revida', 'Cada gota que cai volta como espinho.', 'u/12 s', 'st counter 2 self; st regen 2 self', { rea: 'counter 40' })),
  C('shukketsu', 'Frenesi', 'CON', N('Frenesi do Clã', 'O clã inteiro entra em frenesi de uma vez.', 'u/14 a', 'st atkUp 3; st regen 3')),
  C('shukketsu', 'Provar o Sangue', 'INT', N('Hemorragia Total', 'Todas as veias do alvo se abrem juntas.', 'd40/14', 'det bleed 8')),
  C('shukketsu', 'Gota de Sangue', 'INT', N('Última Gota', 'A última gota do inimigo é a que o derruba.', 'd40/14', 'exec 35 1.5')),
  C('hiruko', 'Isótopo Instável', 'INT', N('Colmeia de Carne', 'Um ninho vivo que pare crias sem parar.', 'u/14', '', { summon: 'Enxame Mutante' })),
  C('hiruko', 'Raio Mutagênico', 'INT', N('Fim da Espécie', 'Uma praga feita para uma criatura só, e que não erra.', 'd40/14', 'det poison 8')),
  C('aura', 'Goma e Chiclete', 'SAB', N('Canhão Definitivo', 'Toda a aura do corpo num disparo só.', 'd44/15', 'pierce 60')),
  C('oculto', 'Ampliar Ritual', 'INT', N('Flagelo Final', 'Todos os flagelos dos rituais de uma vez.', 'm36/14 a', 'st fear 2; st curse 2')),
  C('oculto', 'Ritual: Sal nos Olhos', 'SAB', N('Ritual: Exorcismo Absoluto', 'O ritual que expulsa qualquer coisa de qualquer corpo.', 'd40/16 a', 'vs demon 1.8; cleanse')),
  C('oculto', 'Espreitar da Besta', 'INT', N('Tomar a Cena', 'O ocultista reescreve a cena a seu favor.', 'u/12 a', 'st confuse 1 50%; st exposed 2')),
  C('oculto', 'Ritual: Amuleto', 'SAB', N('Ritual: Cerca de Sal', 'Um círculo de sal grosso em volta de todo o grupo.', 'u/14 a', 'shield 24; st guarded 1')),
  C('oculto', 'Sal Grosso Benzido', 'INT', N('A Última Palavra', 'A palavra final de qualquer exorcismo.', 'm40/14', 'st fear 2; exec 30 1.4')),
  C('oculto', 'Poder Não Desejado', 'INT',
    N('Presente da Loucura', 'A coisa dá ao portador o que ele pediu, com juros.', 'u/10 s', 'gain aura 20; st atkUp 3 self'),
    N('A Coisa Sou Eu', 'Não há mais diferença entre o portador e o que mora nele.', 'f/14', 'dur 4; atk 40; def 20; crit 10'),
  ),
  C('oculto', 'Ritual: Definhar', 'INT', N('Ritual: Condenação Eterna', 'Uma maldição que atravessa gerações.', 'd40/16', 'st curse 3; seal 40 3')),
];
// chamado por arvore/camadas.js depois de redistribuir o excesso (caber) e antes de ordenar: os ramos já estão como no mapa de vagas;
// cada nó entra no fim do ramo do âncora, com o XP da casa (a camada) que vai ocupar
export function preencher(el, bs) {
  for (const { el: e, ancora, a, ns } of CASAS) {
    if (e !== el) continue;
    const b = bs.find(b => b.some(s => s.n === ancora));
    if (!b) throw new Error(`Leva 9: âncora "${ancora}" não está em ${el}`);
    for (const o of ns) {
      const L = b.length + 1; if (L > 10) throw new Error(`Leva 9: ramo de "${ancora}" já tem 10 nós (${o.n})`);
      const s = { ...o, xp: XP[L], ob: b[0].ob }; if (s.k !== 'passive') s.a = o.a || a; if (RQ[L]) s.rq = { [s.a || a]: RQ[L] };
      b.push(s);
    }
  }
}

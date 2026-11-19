// Sistemas novos da árvore: clima e reações, Quebra, fusões entre Vínculos vizinhos, técnicas em trio, nós-chave,
// Expansão de Domínio, sinergias Aura × Vínculo e a ponte Aura ↔ Ocultismo. Dados puros, na mesma notação de vinculos.js.
// Cada Vínculo ganha o ramo 10 ("Campo e Domínio", 10 nós) e o ramo 11 ("Trios", 4 nós).

const V = {
  kagutsuchi: { N: 'Kagutsuchi', a: 'INT', tf: 'st burn 3' },
  susanoo: { N: 'Susanoo', a: 'INT', tf: 'st wet 3' },
  atlas: { N: 'Atlas', a: 'FOR', tf: 'st root 2; push 20' },
  indra: { N: 'Indra', a: 'INT', tf: 'st para 1' },
  fuhaku: { N: 'Fuhaku', a: 'DES', tf: 'push 30; st bleed 2' },
  amaterasu: { N: 'Amaterasu', a: 'SAB', tf: 'vs neg 1.3' },
  tsukuyomi: { N: 'Tsukuyomi', a: 'INT', tf: 'st fear 2' },
  shukketsu: { N: 'Shukketsu', a: 'INT', tf: 'drain hp 35' },
  hiruko: { N: 'Hiruko', a: 'INT', tf: 'st rad 3' },
};

// por Vínculo: clima, golpe de Quebra, preparo de reação, chamado do patrono, Domínio e nó-chave
const D = {
  kagutsuchi: {
    clima: ['Meio-Dia Escaldante', 'O ar vira forno: o sol sobe a pino e o fogo ganha força.', 'sol'],
    quebra: ['Golpe de Forja', 'Um golpe de martelo em brasa que racha a postura do inimigo.'],
    prep: ['Faísca no Óleo', 'Uma centelha sobre o que está oleado: o fogo se alastra com fúria.', 'dmg', 'vs oil 1.4; st burn 3'],
    chamado: ['Chamado de Kagutsuchi', 'O deus do fogo sopra nas brasas do caçador, que ferve de fôlego e vontade.'],
    dom: ['Fornalha Infinita', 'O mundo vira uma fornalha: o fogo do caçador queima mais forte e o inimigo derrete por dentro.', 'dur 3; ally atk 20; foe def -10; tick burn'],
    key: ['Coração Ígneo', 'Um coração que é só brasa: o dano dispara, mas a carne não aguenta o próprio fogo.', 'atk 35', 'hpMax -30'],
  },
  susanoo: {
    clima: ['Chamar a Chuva', 'Nuvens se fecham e a chuva cai: a água cresce e o fogo recua.', 'chuva'],
    quebra: ['Onda Arrebentadora', 'Uma onda que quebra a guarda inteira de uma vez.'],
    prep: ['Maré Encharcante', 'A água sobe pelos tornozelos de todos os inimigos e não sai mais.', 'util', 'st wet 3 foes'],
    chamado: ['Chamado de Susanoo', 'O deus das tempestades enche o peito do caçador de maré viva.'],
    dom: ['Mar Sem Fim', 'O chão desaparece sob um oceano: os aliados nadam e os inimigos afundam devagar.', 'dur 3; ally agi 20; ally hit 10; foe agi -20; tick wet'],
    key: ['Maré Sem Retorno', 'Quem segue a maré vai rápido, mas deixa a guarda no cais.', 'agi 25; def -15', 'hpMax -10'],
  },
  atlas: {
    clima: ['Cortina de Poeira', 'A terra levanta uma cortina de pó e névoa: ninguém mira direito.', 'neblina'],
    quebra: ['Terremoto Quebra-Escudo', 'O chão racha sob os pés do alvo e leva a defesa junto.'],
    prep: ['Terra Arada', 'A terra se abre e se fecha nos pés dos inimigos, prendendo-os.', 'util', 'st root 2 foes'],
    chamado: ['Chamado de Atlas', 'O titã que sustenta o mundo empresta um pouco de peso aos ombros do caçador.'],
    dom: ['Fortaleza do Mundo', 'Muralhas de pedra se erguem em volta do campo: o grupo é inabalável, o inimigo pesa e demora.', 'dur 3; ally def 25; foe atk -15; foe agi -15'],
    key: ['Montanha Imóvel', 'Uma montanha não corre, e quem a carrega também não.', 'def 30', 'AGI -15'],
  },
  indra: {
    clima: ['Chamar a Tempestade', 'O céu escurece e relâmpagos riscam as nuvens.', 'tempestade'],
    quebra: ['Raio Rompe-Guarda', 'Um raio direto que racha a guarda como um machado racha lenha.'],
    prep: ['Choque Condutivo', 'Raio contra o que está molhado: o corpo inteiro conduz e trava.', 'dmg', 'vs wet 1.5; st para 1'],
    chamado: ['Chamado de Indra', 'O rei dos trovões deixa o sangue do caçador estalar de faíscas.'],
    dom: ['Céu da Tempestade', 'Um céu sem fim de nuvens e raios: os aliados são relâmpagos, os inimigos erram no escuro.', 'dur 3; ally agi 25; ally crit 10; foe hit -15; tick wet'],
    key: ['Raio Eterno', 'O raio nunca para de correr, e o corpo de quem o carrega paga a conta.', 'agi 30; crit 15', 'hpMax -20; CON -10'],
  },
  fuhaku: {
    clima: ['Furacão ao Redor', 'O vento se enrola em volta do campo e a tempestade chega sem pedir licença.', 'tempestade'],
    quebra: ['Corte Desarmante', 'Um corte do vento que arranca a postura do inimigo.'],
    prep: ['Brisa Gélida', 'Um vento gelado em quem está molhado: a água vira gelo na pele.', 'dmg', 'vs wet 1.4; st frozen 1'],
    chamado: ['Chamado de Fuhaku', 'O vento sopra nas costas do caçador e leva embora o cansaço.'],
    dom: ['Jardim de Lâminas', 'Lâminas de vento florescem em todo canto: os aliados cortam fundo e os inimigos sangram parados.', 'dur 3; ally atk 15; ally crit 15; foe def -15; tick bleed'],
    key: ['Lâmina Sem Bainha', 'Uma lâmina sempre desembainhada fere quem a guarda.', 'crit 25; atk 15', 'CON -8'],
  },
  amaterasu: {
    clima: ['Manhã Eterna', 'O sol nasce sobre o campo e não pretende se pôr.', 'sol'],
    quebra: ['Luz Reveladora', 'Uma luz que revela a fraqueza e a quebra no mesmo instante.'],
    prep: ['Luz que Consome o Veneno', 'A luz aberta sobre o que está envenenado: o mal se desfaz em fumaça.', 'dmg', 'vs poison 1.5'],
    chamado: ['Chamado de Amaterasu', 'A deusa do sol põe a mão na testa do caçador e o cansaço evapora.'],
    dom: ['Aurora Eterna', 'Uma aurora que não passa: o grupo é protegido e os inimigos cegam de tanta luz.', 'dur 3; ally def 20; ally atk 10; foe atk -20'],
    key: ['Sol Sobre a Cabeça', 'Cura que ofusca, mas a mão que cura já não sabe golpear.', 'heal 35; atk -20', 'sanMax 10'],
  },
  tsukuyomi: {
    clima: ['Lua em Pleno Dia', 'A lua sobe em plena luz do dia e o céu escurece: é eclipse.', 'eclipse'],
    quebra: ['Pesadelo que Racha a Mente', 'Um pesadelo tão real que a postura do alvo desaba.'],
    prep: ['Sombra Líquida', 'A sombra escorre pelo chão e molha o medo dos inimigos.', 'util', 'st wet 2 foes; st blind 1 foes'],
    chamado: ['Chamado de Tsukuyomi', 'O deus da lua cochicha ao ouvido do caçador e o escuro vira aliado.'],
    dom: ['Noite Sem Fim', 'Uma noite sem fim cai sobre o campo: os aliados enxergam bem, os inimigos nada.', 'dur 3; ally hit 20; foe hit -25; foe atk -10; tick blind'],
    key: ['Meia-Noite Eterna', 'Quem vive em plena noite enxerga tudo, mas perde a si mesmo.', 'hit 25; atk 15', 'sanMax -15'],
  },
  shukketsu: {
    clima: ['Lua de Sangue', 'A lua fica vermelha e o ar cheira a ferro: é eclipse de sangue.', 'eclipse'],
    quebra: ['Corte da Guarda', 'Um corte que abre a guarda e o sangue de uma vez só.'],
    prep: ['Banho Rubro', 'Quem já sangra paga mais caro; o caçador bebe o que jorra.', 'dmg', 'vs bleed 1.5; drain hp 30'],
    chamado: ['Chamado de Shukketsu', 'O deus do sangue sobe pelas veias do caçador e as faz ferver.'],
    dom: ['Banquete Rubro', 'Uma sala posta para o banquete: os aliados rugem de fome e os inimigos já pingam.', 'dur 3; ally atk 25; foe def -10; tick bleed'],
    key: ['Sede Sem Fundo', 'Uma sede que pede mais dano e cobra em carne.', 'atk 30', 'hpMax -25'],
  },
  hiruko: {
    clima: ['Chuva Radiante', 'Uma chuva suja e brilhante, que queima onde cai.', 'chuva'],
    quebra: ['Mutação Corrosiva', 'Uma mutação que corrói a armadura do alvo até a postura ruir.'],
    prep: ['Secreção Oleosa', 'Uma secreção escura e viscosa cobre os inimigos e pega fogo ao menor sinal.', 'util', 'st poison 3 foes; st exposed 3 foes'],
    chamado: ['Chamado de Hiruko', 'O deus sem osso abre o corpo do caçador e deixa a vida entrar sem regra.'],
    dom: ['Reator Aberrante', 'O campo vira um reator vivo: os aliados mutam para o ataque e os inimigos adoecem em pé.', 'dur 3; ally atk 15; foe def -15; foe atk -10; tick rad'],
    key: ['Mutação Descontrolada', 'O corpo cresce além do que a mente suporta.', 'atk 25; def 10', 'sanMax -20'],
  },
};

// fusões entre Vínculos vizinhos: cada um dos dois ganha a sua metade (exige ter também o Vínculo do outro)
const PARES = [
  ['kagutsuchi', 'susanoo', 'Vapor Ardente', 'O fogo encontra a água e vira uma nuvem escaldante que queima e cega.', { kagutsuchi: 'st burn 2; st blind 2', susanoo: 'st wet 2; st blind 2' }],
  ['susanoo', 'atlas', 'Lamaçal Vivo', 'A água amolece a terra e a terra segura quem pisar nela.', { susanoo: 'st wet 3; st root 2', atlas: 'st root 3; st down 1' }],
  ['atlas', 'indra', 'Pedra do Raio', 'O raio cai na pedra e o estrondo parte o chão em dois.', { atlas: 'st para 2', indra: 'st para 2; pierce 50' }],
  ['indra', 'fuhaku', 'Tormenta Cortante', 'Vento e raio dançam juntos e cortam o que passa.', { indra: 'st bleed 2; st para 1', fuhaku: 'st bleed 3; push 20' }],
  ['fuhaku', 'amaterasu', 'Vento Sagrado', 'Um vento limpo que leva o mal e deixa só luz.', { fuhaku: 'vs neg 1.3', amaterasu: 'vs neg 1.3; push 20' }],
  ['amaterasu', 'tsukuyomi', 'Crepúsculo', 'A luz e a sombra se encontram no meio do dia e desorientam tudo.', { amaterasu: 'st blind 2', tsukuyomi: 'st blind 2; st fear 1' }],
  ['tsukuyomi', 'shukketsu', 'Pesadelo de Sangue', 'Um pesadelo que sangra de verdade.', { tsukuyomi: 'st fear 2; st bleed 2', shukketsu: 'st bleed 3; drain hp 25' }],
  ['shukketsu', 'hiruko', 'Sangue Irradiado', 'O sangue brilha e adoece quem o toca.', { shukketsu: 'st rad 2; drain hp 25', hiruko: 'st rad 3; st bleed 2' }],
  ['hiruko', 'kagutsuchi', 'Fissão Ardente', 'O núcleo racha em brasa e queima o campo todo.', { hiruko: 'st burn 3; st rad 2', kagutsuchi: 'st burn 3; st rad 2' }],
];

// trios temáticos: cada integrante tem a sua parte e precisa dos outros dois no campo
const TRIOS = [
  ['Eclipse Carmesim', 'O sol, a lua e o sangue se alinham num único golpe.', ['amaterasu', 'tsukuyomi', 'shukketsu']],
  ['Tempestade Ígnea', 'Fogo, vento e raio num só furacão incandescente.', ['kagutsuchi', 'fuhaku', 'indra']],
  ['Ciclo da Natureza', 'A água, a terra e o vento fecham o ciclo do mundo.', ['susanoo', 'atlas', 'fuhaku']],
  ['Forja do Mundo', 'Fogo, água e terra moldam um golpe como se molda uma lâmina.', ['kagutsuchi', 'susanoo', 'atlas']],
  ['Arco-Íris Trovejante', 'Raio, água e sol num arco que atravessa tudo.', ['indra', 'susanoo', 'amaterasu']],
  ['Carne e Pedra', 'A pedra segura, o sangue corre e a carne muda.', ['atlas', 'shukketsu', 'hiruko']],
  ['Pesadelo Radioativo', 'A noite, o raio e o átomo viram o pior sonho.', ['tsukuyomi', 'hiruko', 'indra']],
  ['Sol Atômico', 'O sol e o fogo dão a centelha que o átomo pedia.', ['amaterasu', 'kagutsuchi', 'hiruko']],
  ['Dança das Sombras', 'Vento, lua e sangue giram juntos numa dança que ninguém vê.', ['fuhaku', 'tsukuyomi', 'shukketsu']],
  ['Maré Rubra', 'A água carrega o sangue e o sangue carrega a doença.', ['susanoo', 'shukketsu', 'hiruko']],
  ['Martelo do Trovão Solar', 'A terra, o raio e o sol caem juntos como um martelo.', ['atlas', 'indra', 'amaterasu']],
  ['Pira Silenciosa', 'Fogo, vento e lua queimam sem fazer barulho.', ['kagutsuchi', 'fuhaku', 'tsukuyomi']],
];

const nomeTrio = (t, el) => `${t[0]}: ${V[el].N}`;
const ramo10 = el => {
  const d = D[el], v = V[el], i = PARES.findIndex(p => p[0] === el || p[1] === el);
  const prev = PARES.find(p => p[1] === el), next = PARES.find(p => p[0] === el);
  const fusao = (p, ordem) => { const outro = p[0] === el ? p[1] : p[0]; return { n: `${p[2]} (${v.N})`, k: 'dmg', d: `${p[3]} (Exige também o Vínculo com ${V[outro].N}.)`, xp: 45, a: v.a, p: 30, c: 12, ct: 120, fx: p[4][el], v2: outro, rq: { [v.a]: 50 } }; };
  return [
    { n: d.clima[0], k: 'util', d: d.clima[1], xp: 20, a: v.a, c: 8, tg: 'self', fx: `clima ${d.clima[2]} 3 self` },
    { n: d.quebra[0], k: 'dmg', d: d.quebra[1], xp: 25, a: v.a, p: 20, c: 8, fx: 'brk 1' },
    { n: `Reações de ${v.N}`, k: 'passive', d: `O elemento de ${v.N} aprende a conversar com o dos outros: as reações elementais ficam mais fortes.`, xp: 30, mod: 'atk 10', sc: el },
    fusao(prev, 0),
    { n: d.prep[0], k: d.prep[2], d: d.prep[1], xp: 35, a: v.a, p: d.prep[2] === 'dmg' ? 24 : 0, c: 9, fx: d.prep[3], ...(d.prep[2] === 'util' ? { tg: 'self' } : {}) },
    fusao(next, 1),
    { n: `Fôlego de ${v.N}`, k: 'passive', d: 'Todo combate começa com o sangue já fervendo: o Limite sobe sozinho.', xp: 45, on: 'start', fx: 'gain limit 15' },
    { n: d.key[0], k: 'passive', d: d.key[1], xp: 90, mod: d.key[2], bon: d.key[3], nb: 7 },
    { n: d.chamado[0], k: 'util', d: d.chamado[1], xp: 60, a: v.a, c: 12, tg: 'self', fx: 'st atkUp 3 self; gain aura 8; st regen 3 self', nb: 5 },
    { n: d.dom[0], k: 'util', d: `${d.dom[1]} Gasta toda a Aura e deixa o usuário Exausto ao fim. Exige o Despertar de ${v.N}.`, xp: 100, a: v.a, c: 0, ct: 150, tg: 'self', dom: d.dom[2], aw: el, nb: 8 },
  ];
};
const ramo11 = el => TRIOS.filter(t => t[2].includes(el)).map(t => {
  const out = t[2].filter(e => e !== el);
  return { n: nomeTrio(t, el), k: 'dmg', d: `${t[1]} Técnica em trio: os dois parceiros, ${out.map(e => V[e].N).join(' e ')}, gastam o próximo turno junto.`, xp: 70, a: V[el].a, p: 32, c: 14, ct: 150, fx: V[el].tf, trio: out.map(e => nomeTrio(t, e)).join('|') };
});

export const SISTEMAS = Object.fromEntries(Object.keys(V).map(el => [el, [ramo10(el), ramo11(el)]]));

// Aura × Vínculo: um golpe de Aura por Vínculo, que só quem tem o Vínculo aprende, mais o nó-chave da Aura
const SIN = [['kagutsuchi', 'tra', 'Ren Ígneo', 'A aura se transforma em calor puro e queima o que toca.', 'st burn 3'], ['susanoo', 'con', 'Correnteza de Aura', 'A aura vira uma correnteza conjurada que arrasta o alvo.', 'st wet 3; push 20'],
  ['atlas', 'int', 'Punho de Pedra Viva', 'A aura endurece os punhos até o peso de uma montanha.', 'st down 1'], ['indra', 'emi', 'Disparo Trovejante', 'Um disparo de aura que estala como raio.', 'st para 1'],
  ['fuhaku', 'man', 'Fios de Vento', 'Fios de aura levados pelo vento manipulam o alvo à distância.', 'push 30; st bleed 2'], ['amaterasu', 'int', 'Ren Solar', 'A aura se intensifica em luz e limpa o que está podre.', 'vs neg 1.3'],
  ['tsukuyomi', 'man', 'Marionete da Lua', 'Fios de aura prendem a vontade do alvo sob a luz da lua.', 'st fear 2; st blind 1'], ['shukketsu', 'con', 'Sangue Conjurado', 'Aura conjurada em sangue que bebe do alvo.', 'drain hp 35'],
  ['hiruko', 'tra', 'Aura Mutante', 'A aura muda de natureza no meio do golpe e adoece o alvo.', 'st rad 3']];
export const AURA_SIN = [
  ...SIN.map(([el, cat, n, d, fx]) => ({ n, k: 'dmg', d: `${d} (Exige o Vínculo com ${V[el].N}.)`, xp: 40, a: V[el].a === 'FOR' ? 'FOR' : 'SAB', p: 26, c: 10, cat, fx, v2: el })),
  { n: 'Aura Sem Limites', k: 'passive', d: 'A aura transborda do corpo e sustenta golpes enormes, mas o corpo paga o transbordo.', xp: 90, mod: 'atk 30', bon: 'auraMax 20; hpMax -25', nb: 6 },
];

// ponte Aura ↔ Ocultismo: técnicas que misturam o Nen com os rituais (exigem o Despertar do Outro Lado)
export const OCULTO_PONTE = [
  { n: 'Gyo Amaldiçoado', k: 'dmg', d: 'A aura concentrada nos olhos enxerga o que a maldição esconde e ataca ali.', xp: 25, a: 'SAB', p: 18, c: 6, cat: 'int', pay: { san: 1 }, fx: 'vs curse 1.4' },
  { n: 'Selo de Aura', k: 'util', d: 'A aura sela uma porta, uma janela ou um golpe: o selo segura o que o ritual chamou.', xp: 30, a: 'SAB', c: 8, cat: 'con', tg: 'self', fx: 'shield 14 self; cleanse self' },
  { n: 'Ritual: Ren Profano', k: 'dmg', d: 'Um ritual que pede ao Outro Lado que empurre a aura além do limite.', xp: 35, a: 'INT', p: 28, c: 9, cat: 'int', circ: 2, pay: { san: 3 } },
  { n: 'Ritual: Fio da Marionete', k: 'util', d: 'Um fio de aura enrolado em uma maldição: o alvo dança sem querer.', xp: 40, a: 'INT', c: 9, cat: 'man', circ: 2, pay: { san: 3 }, fx: 'st confuse 2' },
  { n: 'Ritual: Corrente Maldita', k: 'dmg', d: 'Uma corrente conjurada de aura e ossos, que prende e envenena.', xp: 45, a: 'INT', p: 24, c: 10, cat: 'con', circ: 2, pay: { san: 3 }, fx: 'st curse 3; st root 2' },
  { n: 'Ritual: Zetsu Ritualístico', k: 'util', d: 'Apagar a aura para que o Outro Lado nem repare que você está ali.', xp: 45, a: 'SAB', c: 8, cat: 'esp', circ: 2, pay: { san: 2 }, tg: 'self', fx: 'st stealth 3 self' },
  { n: 'Ritual: Hatsu Condenado', k: 'dmg', d: 'A técnica da vida inteira, feita com a ajuda de quem não devia ajudar.', xp: 60, a: 'INT', p: 40, c: 14, cat: 'tra', circ: 3, pay: { san: 5 }, ct: 130 },
  { n: 'Ritual: Emissão do Abismo', k: 'dmg', d: 'A aura sai do corpo e cai no abismo; o abismo devolve em dobro.', xp: 65, a: 'INT', p: 36, c: 14, cat: 'emi', circ: 3, pay: { san: 5 }, area: true, ct: 130 },
  { n: 'Ritual: Voto Sombrio', k: 'passive', d: 'Prometer ao Outro Lado o que não se deve prometer, e receber em troca o que não se devia receber.', xp: 70, mod: 'atk 15', bon: 'INT 3; sanMax -8', circ: 3 },
  { n: 'Pacto Sem Retorno', k: 'passive', d: 'A última porta que se abre só para dentro. O ocultista ganha poder demais e fica com a cabeça de menos.', xp: 90, mod: 'atk 25', bon: 'INT 5; sanMax -25', nb: 6 },
];

// Marcial: Quebra, Tensão e o nó-chave do tronco
export const MARCIAL_SIST = [
  { n: 'Golpe Quebra-Guarda', k: 'dmg', d: 'Um golpe feito para abrir a guarda, não para ferir: rói a postura do alvo.', xp: 20, a: 'FOR', p: 14, c: 5, fx: 'brk 1' },
  { n: 'Foco da Tensão', k: 'passive', d: 'Quem sabe esperar bate melhor: o primeiro golpe depois de concentrar acerta mais.', xp: 25, mod: 'hit 8' },
  { n: 'Esmagar a Postura', k: 'dmg', d: 'Um golpe pesado e lento que quebra a postura de uma vez.', xp: 45, a: 'FOR', p: 28, c: 9, ct: 130, chg: 1, fx: 'brk 2' },
  { n: 'Pacto de Guerra', k: 'passive', d: 'Jurar nunca sair do campo: dano, defesa e pontaria sobem, e a aura vai embora.', xp: 90, mod: 'atk 20; def 15; hit 10', bon: 'auraMax -20', nb: 3 },
];

// Marcial: laços entre personagens (exigem um laço de nível 3 com alguém; os laços sobem ao "conversar" no acampamento)
export const MARCIAL_LACOS = [
  { n: 'Olhar de Cumplicidade', k: 'passive', d: 'Um olhar basta para dois caçadores que se conhecem de verdade.', xp: 20, cs: 'laco', mod: 'atk 6; hit 4' },
  { n: 'Escudo de Confiança', k: 'util', d: 'Confiar o suficiente para receber o golpe no lugar do outro.', xp: 30, a: 'CON', c: 5, cs: 'laco', fx: 'guard 3' },
  { n: 'Promessa Entre Amigos', k: 'passive', d: 'Quando um aliado cai, o caçador cerra os dentes: mais força e algum fôlego.', xp: 45, cs: 'laco', on: 'ally', fx: 'st atkUp 3 self; res hp 12 self' },
  { n: 'Laço Inquebrável', k: 'passive', d: 'Um golpe que derrubaria o caçador encontra a lembrança de quem espera por ele: um escudo se forma.', xp: 70, cs: 'laco', on: 'fall', fx: 'shield 24 self; st regen 2 self', pre: 'Promessa Entre Amigos' },
];

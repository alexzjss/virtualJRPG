// Leva 4: comandos de ação (spec: docs/superpowers/specs/2026-11-17-comandos-de-acao-design.md).
// Campos novos dos nós: `cmd` (tempo, martelar, segurar, seq, ritmo, mira, runa, choque), `pf` (efeito extra do Perfeito, mesma notação de fx),
// `mx` (golpes extras do martelar), `mt` (apertos para encher a barra), `seq` (setas) e `fin` (poder do golpe final), `nt` (notas do ritmo),
// `rn` (símbolo da runa), `cw`/`cp`/`cz`/`ma` (janelas), `tel: 1` (golpe anunciado: abre a janela de Esquiva).
// Chaves novas de `mod`: cw cp (janela do tempo) · mx (golpes) · cz (faixa do segurar) · ma (ponto da mira) · esq par (zonas de defesa) · chq (Choque) · rit (tolerância de setas e notas) · ctr (contra-ataque) · rn (runa).
// Cada ramo novo entra no fim do setor; `pre` aponta o primeiro nó do ramo temático (porta de entrada), e as passivas dependem da técnica do mesmo comando.
const P = (n, d, xp, mod, x = {}) => ({ n, k: 'passive', d, xp, mod, ...x });
export const LEVA4 = {
  marcial: [
    [ // Golpe no tempo e Martelar
      { n: 'Corte no Compasso', k: 'dmg', d: 'O corte sai na batida certa do inimigo: perfeito, abre a carne.', xp: 20, a: 'DES', p: 16, c: 4, req: 'lamina', pre: 'Corte Rápido', cmd: 'tempo', pf: 'st bleed 2' },
      { n: 'Malho no Tempo', k: 'dmg', d: 'O martelo cai no instante em que a guarda do inimigo abre.', xp: 20, a: 'FOR', p: 22, c: 6, req: 'pesada', pre: 'Golpe de Malho', cmd: 'tempo', pf: 'st down 1; brk 1' },
      { n: 'Jab Cronometrado', k: 'dmg', d: 'Um soco curto contado no relógio: no tempo exato, o punho já volta.', xp: 15, a: 'FOR', p: 12, c: 3, req: 'punho', pre: 'Jab', cmd: 'tempo', pf: 'turn' },
      P('Olho do Impacto', 'Ver o instante do golpe antes dele existir: as janelas do tempo ficam maiores.', 15, 'cw 60; cp 15', { pre: 'Corte no Compasso' }),
      { n: 'Mil Punhos', k: 'dmg', d: 'Quanto mais rápido o jogador bater, mais socos saem.', xp: 25, a: 'FOR', p: 6, c: 7, hits: 2, req: 'punho', pre: 'Jab', cmd: 'martelar', mx: 6, pf: 'st defDn 2' },
      { n: 'Chicote Frenético', k: 'dmg', d: 'A corrente estala sem parar: cada estalo é mais um golpe.', xp: 20, a: 'DES', p: 12, c: 6, req: 'corrente', pre: 'Chicotada', cmd: 'martelar', mx: 4, pf: 'st para 1' },
      { n: 'Saraivada de Lâminas', k: 'dmg', d: 'Lâminas atiradas sem pausa, uma atrás da outra.', xp: 20, a: 'DES', p: 6, c: 6, hits: 2, req: 'arremesso', pre: 'Lançamento Duplo', cmd: 'martelar', mx: 4 },
      P('Punhos Incansáveis', 'O braço não cansa: um golpe a mais em todo martelar.', 25, 'mx 1', { pre: 'Mil Punhos' }),
    ],
    [ // Segurar e soltar e Mira
      { n: 'Disparo Tenso', k: 'dmg', d: 'Segura a corda até tremer e solta na hora certa.', xp: 20, a: 'DES', p: 20, c: 6, req: 'arco', pre: 'Flechada Rápida', cmd: 'segurar', pf: 'pierce 60' },
      { n: 'Tiro Carregado', k: 'dmg', d: 'O cão armado, a mira firme e o dedo esperando.', xp: 20, a: 'DES', p: 22, c: 7, req: 'fogo', pre: 'Tiro Duplo', cmd: 'segurar', pf: 'st down 1' },
      { n: 'Golpe do Titã Carregado', k: 'dmg', d: 'A arma pesada sobe devagar e desce de uma vez.', xp: 25, a: 'FOR', p: 26, c: 9, req: 'pesada', pre: 'Golpe de Malho', cmd: 'segurar', pf: 'brk 2' },
      P('Fôlego Longo', 'Segurar sem tremer: a faixa do ponto certo fica maior.', 20, 'cz 4', { pre: 'Disparo Tenso' }),
      { n: 'Flecha no Ponto Fraco', k: 'dmg', d: 'A mira passeia pelo corpo do inimigo até achar a fresta.', xp: 20, a: 'DES', p: 18, c: 6, req: 'arco', pre: 'Flechada Rápida', cmd: 'mira', pf: 'st bleed 2' },
      { n: 'Tiro de Precisão', k: 'dmg', d: 'Um único tiro, onde a armadura não chega.', xp: 25, a: 'DES', p: 20, c: 6, req: 'fogo', pre: 'Tiro Duplo', cmd: 'mira', pf: 'pierce 100' },
      { n: 'Lâmina no Olho', k: 'dmg', d: 'A lâmina vai direto onde dói e cega.', xp: 20, a: 'DES', p: 14, c: 5, req: 'arremesso', pre: 'Lançamento Duplo', cmd: 'mira', pf: 'st blind 2' },
      P('Olhar de Atirador', 'O ponto fraco aparece maior para quem já mirou mil vezes.', 20, 'ma 6', { pre: 'Flecha no Ponto Fraco' }),
    ],
    [ // Sequência e Ritmo
      { n: 'Kata das Cinco Formas', k: 'dmg', d: 'Cinco movimentos decorados: errou um, perdeu o fio.', xp: 25, a: 'DES', p: 16, c: 8, req: 'lamina', pre: 'Corte Rápido', cmd: 'seq', seq: '↑→↓←↑', fin: 20 },
      { n: 'Dança da Lança Serpente', k: 'dmg', d: 'A lança rasteja e dá o bote na quarta batida.', xp: 20, a: 'DES', p: 15, c: 7, req: 'lanca', pre: 'Investida', cmd: 'seq', seq: '→→↓→', fin: 16, pf: 'push 30' },
      { n: 'Combo do Duelista', k: 'dmg', d: 'Uma troca ensaiada com tantos dias que parece improviso.', xp: 20, a: 'DES', p: 14, c: 6, pre: 'Saudação do Duelista', cmd: 'seq', seq: '←→←↑', fin: 18, pf: 'vs exposed 1.5' },
      { n: 'Forma Contínua', k: 'dmg', d: 'Os golpes se encadeiam na respiração, um empurrando o outro.', xp: 25, a: 'FOR', p: 16, c: 8, pre: 'Fôlego Controlado', cmd: 'seq', seq: '↓↓→↑↑', fin: 22 },
      P('Memória Muscular', 'O corpo lembra a sequência melhor que a cabeça: as batidas perdoam um pouco mais.', 20, 'rit 80', { pre: 'Kata das Cinco Formas' }),
      { n: 'Balada de Coragem', k: 'heal', d: 'Uma canção que o grupo canta junto: cada nota certa estica a coragem.', xp: 20, a: 'CAR', p: 0, c: 6, area: true, req: 'instrumento', pre: 'Nota Perfurante', cmd: 'ritmo', nt: 6, fx: 'st atkUp 1', pf: 'st focus 2' },
      { n: 'Marcha do Batalhão', k: 'heal', d: 'O compasso do passo marcado põe o grupo na mesma pressa.', xp: 25, a: 'CAR', p: 0, c: 7, area: true, req: 'instrumento', pre: 'Nota Perfurante', cmd: 'ritmo', nt: 6, fx: 'st defUp 1; haste 10', pf: 'haste 30' },
      { n: 'Réquiem Sereno', k: 'heal', d: 'Uma melodia lenta que fecha feridas, nota por nota.', xp: 25, a: 'CAR', p: 12, c: 8, area: true, req: 'instrumento', pre: 'Nota Perfurante', cmd: 'ritmo', nt: 8, pf: 'cleanse' },
      { n: 'Solo Virtuoso', k: 'mental', d: 'O solo fica mais cruel a cada nota que acerta.', xp: 25, a: 'CAR', p: 14, c: 7, req: 'instrumento', pre: 'Nota Perfurante', cmd: 'ritmo', nt: 8, pf: 'st silence 1' },
      P('Metrônomo Interno', 'O ritmo mora na cabeça: as notas perdoam mais.', 20, 'rit 80', { pre: 'Balada de Coragem', sc: 'wt:instrumento' }),
    ],
    [ // Runa, Choque e Defesa
      { n: 'Runa da Chama', k: 'dmg', d: 'Um triângulo riscado no ar acende a brasa no meio dele.', xp: 20, a: 'INT', p: 18, c: 6, req: 'foco', pre: 'Faísca Canalizada', cmd: 'runa', rn: 'triangulo', pf: 'st burn 2' },
      { n: 'Selo Espiral', k: 'util', d: 'Uma espiral desenhada devagar enrola a voz do inimigo.', xp: 20, a: 'INT', c: 6, req: 'foco', pre: 'Faísca Canalizada', cmd: 'runa', rn: 'espiral', fx: 'st silence 1', pf: 'st silence 2' },
      P('Vontade Inabalável', 'A vontade que não cede no cabo de guerra: o Choque exige menos apertos.', 25, 'chq 15', { pre: 'Vontade da Observação' }),
      P('Passo Leve', 'O corpo sai da frente um pouco antes: a zona de esquiva fica maior.', 20, 'esq 150', { pre: 'Recuperar o Fôlego' }),
      P('Leitura de Combo', 'Quem apara todas as batidas devolve o golpe com mais força.', 25, 'ctr 50', { pre: 'Aparar' }),
    ],
  ],
  aura: [[
    { n: 'Golpe Divino', k: 'dmg', d: 'A aura explode no instante do impacto, preta nas bordas.', xp: 30, a: 'INT', p: 20, c: 8, pre: 'Ten: Envolver', cmd: 'tempo', bf: 5 },
    P('Instinto Negro', 'O corpo aprende o instante do Black Flash: a janela do Perfeito cresce.', 40, 'bf 2', { pre: 'Golpe Divino' }),
    { n: 'Metralhadora de Aura', k: 'dmg', d: 'Esferas de aura disparadas sem pausa, no ritmo dos dedos.', xp: 30, a: 'DES', p: 5, c: 8, hits: 2, pre: 'Projétil de Aura', cmd: 'martelar', mx: 6, pf: 'strip' },
    { n: 'Esfera Concentrada', k: 'dmg', d: 'A aura se junta na palma até quase estourar.', xp: 35, a: 'INT', p: 28, c: 10, pre: 'Projétil de Aura', cmd: 'segurar', pf: 'gain aura 6' },
    { n: 'Onda Contra Onda', k: 'dmg', d: 'Duas ondas se chocam no meio, e vence a que tiver mais vontade.', xp: 40, a: 'INT', p: 26, c: 10, pre: 'Projétil de Aura', cmd: 'choque' },
  ]],
  oculto: [[
    { n: 'Sigilo de Banimento', k: 'dmg', d: 'Uma estrela riscada com a mão firme expulsa o que não é daqui.', xp: 30, a: 'SAB', p: 20, c: 8, pre: 'Ritual: Sal nos Olhos', cmd: 'runa', rn: 'estrela', fx: 'vs demon 1.3', pf: 'strip' },
    { n: 'Glifo do Pavor', k: 'mental', d: 'Um raio escrito no ar que o olho inimigo não consegue deixar de ler.', xp: 25, a: 'INT', p: 14, c: 7, pre: 'Ritual: Pavor', cmd: 'runa', rn: 'raio', pf: 'st fear 2' },
    P('Traço Firme', 'A mão não treme ao desenhar: toda runa fica mais fiel.', 25, 'rn 8', { pre: 'Sigilo de Banimento' }),
  ]],
  kagutsuchi: [[
    { n: 'Sol em Miniatura', k: 'dmg', d: 'A brasa é segurada na palma até virar sol.', xp: 40, a: 'INT', p: 30, c: 12, area: true, pre: 'Centelha', cmd: 'segurar', pf: 'st burn 3' },
    { n: 'Chama Contra Chama', k: 'dmg', d: 'Duas chamas se encontram no ar, e a mais teimosa queima o outro lado.', xp: 40, a: 'INT', p: 28, c: 10, pre: 'Centelha', cmd: 'choque', fx: 'st burn 2' },
  ]],
  indra: [[
    { n: 'Trovão em Rajada', k: 'dmg', d: 'Relâmpagos seguidos, quanto mais rápido o dedo, mais caem.', xp: 35, a: 'DES', p: 7, c: 8, hits: 2, pre: 'Faísca', cmd: 'martelar', mx: 5, pf: 'stack carga 3 self' },
    { n: 'Raio Contra Raio', k: 'dmg', d: 'O raio responde ao raio e a descarga vai para onde há mais vontade.', xp: 40, a: 'DES', p: 28, c: 10, pre: 'Faísca', cmd: 'choque', fx: 'st para 1' },
  ]],
  fuhaku: [[
    { n: 'Sete Rastros', k: 'dmg', d: 'Sete cortes de vento em sete lugares, um instante depois do outro.', xp: 40, a: 'AGI', p: 8, c: 10, pre: 'Lâmina de Vento', cmd: 'seq', seq: '→↑→↓→↑→', fin: 24, pf: 'st evade 1 self' },
  ]],
  amaterasu: [[
    { n: 'Raio Focalizado', k: 'dmg', d: 'A luz do sol reunida num ponto fino como agulha.', xp: 30, a: 'SAB', p: 22, c: 8, pre: 'Luz Curativa', cmd: 'mira', pf: 'st blind 1; strip' },
  ]],
};

// Comandos dos nós que já existiam (spec §9). Nomes que não existirem fazem a montagem falhar de propósito.
export const MARCA = {
  'Cem Socos': { cmd: 'martelar', mx: 5 }, 'Sequência de Boxe': { cmd: 'martelar', mx: 3 }, 'Rajada de Aura': { cmd: 'martelar', mx: 3 }, 'Nuvem de Lâminas': { cmd: 'martelar', mx: 3 },
  'Tempestade de Elos': { cmd: 'martelar', mx: 3 }, 'Vento Que Não Para': { cmd: 'martelar', mx: 3 }, 'Rajada de Mil Cortes': { cmd: 'martelar', mx: 4 }, 'Leque de Aço': { cmd: 'martelar', mx: 3 },
  'Estilo Três Espadas': { cmd: 'seq', seq: '↑↑↓' }, 'Dança do Dragão': { cmd: 'seq', seq: '→↓←' }, 'Respiração: Terceira Forma': { cmd: 'seq', seq: '↓→↓' }, 'Kagura do Deus-Fogo': { cmd: 'seq', seq: '↑→↓' },
  'Dança dos Rastros': { cmd: 'seq', seq: '→↑→' }, 'Rastro Cortante': { cmd: 'seq', seq: '←→↑' }, 'Tempestade de Lâminas Infinitas': { cmd: 'seq', seq: '↑→↓←↑→' }, 'Dança do Sol Poente': { cmd: 'seq', seq: '↑↓←→↑↓', fin: 30 },
  'Onda do Eremita': { cmd: 'segurar' }, 'Flecha Atravessadora': { cmd: 'segurar' }, 'Golpe do Carrasco': { cmd: 'segurar' },
  'Refrão Curativo': { cmd: 'ritmo', nt: 6 }, 'Hino de Guerra': { cmd: 'ritmo', nt: 6 }, 'Cantiga de Ninar': { cmd: 'ritmo', nt: 6 },
  'Tiro na Cabeça': { cmd: 'mira' }, 'Flecha no Joelho': { cmd: 'mira' }, 'Bala Perfurante': { cmd: 'mira' }, 'Ponto Cego': { cmd: 'mira' },
  'Faísca Canalizada': { cmd: 'runa', rn: 'raio' }, 'Selo Rápido': { cmd: 'runa', rn: 'circulo' },
  'Golpe Pesado': { tel: 1 }, 'Estilhaço': { tel: 1 }, 'Golpe Giratório': { tel: 1 }, 'Terremoto': { tel: 1 }, 'Mar de Chamas': { tel: 1 }, 'Maré Alta': { tel: 1 },
};
const RUNA_CIRC = ['circulo', 'triangulo', 'estrela', 'espiral'];
// aplica a Leva 4 sobre a árvore já montada: marca os nós antigos e dá o comando automático (todo bf é Golpe no tempo; todo ritual com círculo é Runa)
export function marcarComandos(TREE) {
  const byName = new Map(); for (const v of Object.values(TREE)) for (const br of v.branches) for (const o of br) byName.set(o.n, o);
  for (const [n, f] of Object.entries(MARCA)) { const o = byName.get(n); if (!o) throw new Error(`Leva 4: nó "${n}" não existe`); Object.assign(o, f); }
  for (const o of byName.values()) {
    if (o.bf && !o.cmd) o.cmd = 'tempo';
    if (o.circ && !o.cmd && o.k !== 'passive') { o.cmd = 'runa'; o.rn = RUNA_CIRC[Math.max(0, Math.min(3, o.circ - 1))]; }
  }
  for (const v of Object.values(LEVA4)) for (const br of v) for (const o of br) if (o.pre) for (const n of String(o.pre).split('|')) if (!byName.has(n)) throw new Error(`Leva 4: "${o.n}" exige "${n}", que não existe`);
}

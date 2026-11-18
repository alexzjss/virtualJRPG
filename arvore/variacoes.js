// Leva 7: comandos de ação nas técnicas dos jogadores e 3 variações por família (formato/alcance, ou elemento de outro Vínculo com `v2`).
// Roda no fim de tree.js (depois de marcarComandos). As técnicas que já existem só ganham o comando (mesmo poder e custo);
// as variações entram logo depois da base no mesmo ramo, com `pre` apontando para ela.
const CMD = {
  'Wakaze': { cmd: 'runa', rn: 'espiral', pf: 'push 60' }, 'Canhão de Aura': { cmd: 'segurar', pf: 'pierce 50' }, 'Canhão de Aura Gélido': { cmd: 'segurar', pf: 'st frozen 1' },
  'Shukoudan': { cmd: 'segurar', pf: 'pierce 40' }, 'Chute Doentio': { cmd: 'tempo', pf: 'st poison 2' },
  'Suplex': { cmd: 'martelar', mx: 3 }, 'Tentáculo de Vento': { cmd: 'martelar', mx: 3 }, 'Lâmina de Vento': { cmd: 'martelar', mx: 3 }, 'Corte Fino': { cmd: 'martelar', mx: 3 },
  'Pulso de Fuhaku': { cmd: 'martelar', mx: 3 }, 'Punho Reforçado': { cmd: 'martelar', mx: 3 }, 'Punho Meteoro': { cmd: 'martelar', mx: 4 },
  'Selo de Fuhaku': { cmd: 'runa', rn: 'circulo', pf: 'seal 24 1' }, 'Corte de Fuhaku': { cmd: 'tempo', pf: 'st bleed 2' },
  // as variações dos jogadores já criadas na rodada anterior
  'Wakaze: Rajada Tripla': { cmd: 'martelar', mx: 4 }, 'Canhão Disperso': { cmd: 'segurar' }, 'Shukoudan Duplo': { cmd: 'martelar', mx: 3 }, 'Faísca Dupla': { cmd: 'martelar', mx: 3 },
  'Canhão de Aura: Zero Absoluto': { cmd: 'segurar', pf: 'st frozen 2' }, 'Suplex Duplo': { cmd: 'martelar', mx: 4 }, 'Lâmina de Vento Dupla': { cmd: 'martelar', mx: 3 },
};
const D = (n, d, xp, a, p, c, x = {}) => ({ n, k: 'dmg', d, xp, a, p, c, ...x });
const VAR = {
  'Wakaze': [
    D('Wakaze Ígneo', 'O vento é aquecido pela brasa de Kagutsuchi: a esfera explode em chamas.', 60, 'DES', 34, 13, { v2: 'kagutsuchi', st: 'burn', fx: 'push 30', cmd: 'runa', rn: 'espiral', pf: 'det burn 4', rq: { DES: 56 }, pre: 'Wakaze' }),
    D('Wakaze Elétrico', 'Indra corre dentro do vento: a esfera salta de um inimigo para outro.', 60, 'DES', 30, 13, { v2: 'indra', st: 'para', fx: 'chain 2 .6', cmd: 'runa', rn: 'raio', pf: 'chain 4 .7', rq: { DES: 56 }, pre: 'Wakaze' }),
    D('Wakaze Disco', 'O vento é achatado num disco que corta a linha inteira à frente.', 45, 'DES', 22, 9, { hits: 2, ct: 90, fx: 'pierce 60', cmd: 'martelar', mx: 3, rq: { DES: 52 }, pre: 'Wakaze' }),
  ],
  'Canhão de Aura': [
    D('Canhão Rubro', 'A aura é tingida de sangue: o canhão arranca vida de quem atravessa.', 60, 'SAB', 32, 14, { v2: 'shukketsu', ct: 130, cat: 'emi', st: 'bleed', fx: 'drain hp 25', cmd: 'segurar', rq: { SAB: 56 }, pre: 'Canhão de Aura' }),
    D('Canhão Solar', 'Um canhão de luz de Amaterasu que ofusca e queima o profano.', 60, 'SAB', 32, 14, { v2: 'amaterasu', ct: 130, cat: 'emi', fx: 'st blind 1 50%; vs demon 1.4', cmd: 'segurar', rq: { SAB: 56 }, pre: 'Canhão de Aura' }),
    D('Raio Fino', 'A aura é afinada num fio de luz que atravessa a guarda.', 45, 'SAB', 26, 8, { ct: 80, cat: 'emi', fx: 'pierce 100', cmd: 'segurar', rq: { SAB: 52 }, pre: 'Canhão de Aura' }),
  ],
  'Shukoudan': [
    D('Shukoudan em Leque', 'Vários disparos curtos abertos em leque, sem mirar.', 20, 'SAB', 6, 5, { area: true, ct: 100, cat: 'emi', pre: 'Shukoudan' }),
    D('Shukoudan Pesado', 'Um disparo lento, grande e que empurra.', 30, 'SAB', 22, 8, { ct: 100, cat: 'emi', fx: 'push 40', cmd: 'segurar', pre: 'Shukoudan' }),
    D('Shukoudan Teleguiado', 'O disparo faz a curva até achar o alvo marcado.', 40, 'SAB', 16, 7, { cat: 'emi', fx: 'sure; vs marked 1.4', pre: 'Shukoudan' }),
  ],
  'Faísca': [
    D('Faísca em Cadeia', 'A faísca salta pelos condutores do campo.', 25, 'INT', 10, 6, { fx: 'chain 3 .6', pre: 'Faísca' }),
    D('Faísca Venenosa', 'Uma faísca com o veneno de Hiruko: a corrente apodrece a carne.', 35, 'INT', 12, 5, { v2: 'hiruko', st: 'poison', fx: 'st rad 1', pre: 'Faísca' }),
    D('Faísca Úmida', 'A água de Susanoo conduz a faísca por todo o corpo molhado.', 35, 'INT', 14, 6, { v2: 'susanoo', fx: 'st wet 2; vs wet 1.6', pre: 'Faísca' }),
  ],
  'Chute Doentio': [
    D('Chute Doentio: Giro', 'O corpo gira inteiro e o chute atinge todos em volta.', 60, 'FOR', 22, 11, { area: true, ct: 130, st: 'poison', fx: 'stack doenca 5 self', cmd: 'tempo', rq: { FOR: 56 }, pre: 'Chute Doentio' }),
    D('Chute Doentio: Rajada', 'Chutes sem fim, cada um mais doente.', 55, 'FOR', 9, 8, { hits: 3, fx: 'stack doenca 5 self', cmd: 'martelar', mx: 4, rq: { FOR: 56 }, pre: 'Chute Doentio' }),
    D('Chute Doentio: Chama', 'A doença febril de Hiruko pega fogo de Kagutsuchi.', 65, 'FOR', 30, 10, { v2: 'kagutsuchi', st: 'burn', fx: 'stack doenca 5 self; st poison 2', rq: { FOR: 58 }, pre: 'Chute Doentio' }),
  ],
  'Selo de Fuhaku': [
    D('Selo de Vento Triplo', 'Três selos de vento, cada um estourando em seu tempo.', 25, 'DES', 5, 4, { fx: 'seal 12 3', pre: 'Selo de Fuhaku' }),
    D('Selo de Brasa', 'Um selo de vento cheio de brasa: estoura em chamas.', 35, 'DES', 8, 4, { v2: 'kagutsuchi', st: 'burn', fx: 'seal 18 2', pre: 'Selo de Fuhaku' }),
    D('Selo Gravitacional', 'O selo puxa tudo em volta para o centro antes de estourar.', 45, 'DES', 10, 6, { area: true, ct: 120, fx: 'seal 16 2; push -40', cmd: 'runa', rn: 'espiral', pre: 'Selo de Fuhaku' }),
  ],
  'Corte de Fuhaku': [
    D('Corte de Fuhaku: Longo', 'O corte alonga-se no ar e acerta quem está atrás do alvo.', 30, 'DES', 16, 7, { area: true, ct: 100, st: 'bleed', pre: 'Corte de Fuhaku' }),
    D('Corte de Fuhaku: Raio', 'Indra corre pelo fio do corte e paralisa quem foi tocado.', 40, 'DES', 18, 8, { v2: 'indra', st: 'para', fx: 'chain 1 .6', pre: 'Corte de Fuhaku' }),
    D('Corte de Fuhaku: Fantasma', 'O corte vem de uma sombra de Tsukuyomi e ignora a defesa.', 45, 'DES', 20, 8, { v2: 'tsukuyomi', fx: 'pierce 80; st exposed 1', pre: 'Corte de Fuhaku' }),
  ],
  'Suplex': [
    D('Suplex Tectônico', 'Atlas empurra o chão junto: o arremesso racha a terra.', 35, 'FOR', 20, 7, { v2: 'atlas', area: true, ct: 120, fx: 'st down 1; stack doenca 5 self', pre: 'Suplex' }),
    D('Suplex Rubro', 'Agarra e arranca: o sangue de Shukketsu volta ao caçador.', 40, 'FOR', 18, 6, { v2: 'shukketsu', fx: 'drain hp 30; stack doenca 5 self', pre: 'Suplex' }),
    D('Suplex em Série', 'Uma chave atrás da outra, sem soltar.', 40, 'FOR', 8, 7, { hits: 3, fx: 'stack doenca 5 self', cmd: 'martelar', mx: 4, pre: 'Suplex' }),
  ],
  'Punho Meteoro': [
    D('Punho Meteoro: Cometa', 'O punho cai de cima com uma cauda de fogo.', 40, 'FOR', 28, 10, { cat: 'int', st: 'burn', fx: 'st stun 1 40%', cmd: 'segurar', pre: 'Punho Meteoro' }),
    D('Punho Meteoro: Estilhaço', 'Ao tocar, o punho explode em pedaços que atingem todos.', 45, 'FOR', 20, 11, { area: true, ct: 130, cat: 'int', pre: 'Punho Meteoro' }),
    D('Punho Meteoro: Trovão', 'Um punho que traz o raio junto da queda.', 45, 'FOR', 26, 10, { v2: 'indra', cat: 'int', st: 'para', fx: 'chain 2 .6', pre: 'Punho Meteoro' }),
  ],
  'Teia de Aura': [
    D('Teia de Aura: Armadilha', 'A teia fica armada no chão e prende o primeiro que pisar.', 25, 'DES', 6, 5, { cat: 'tra', fx: 'st root 3; seal 10 2', pre: 'Teia de Aura' }),
    D('Teia de Aura: Ácida', 'A teia corrói a pele e a armadura de quem fica preso.', 35, 'DES', 8, 6, { v2: 'hiruko', cat: 'tra', st: 'poison', fx: 'st root 1; strip', pre: 'Teia de Aura' }),
    D('Teia de Aura: Rede', 'A teia vira uma rede larga que puxa os inimigos para o centro.', 40, 'DES', 8, 8, { area: true, ct: 120, cat: 'tra', fx: 'st root 1; push -30', cmd: 'runa', rn: 'estrela', pre: 'Teia de Aura' }),
  ],
  'Corrente de Vento': [
    D('Corrente Gélida', 'O vento corre por dentro de uma corrente de Susanoo: molha e congela.', 35, 'DES', 14, 6, { v2: 'susanoo', fx: 'st wet 2; st frozen 1 30%', pre: 'Corrente de Vento' }),
    D('Corrente Ardente', 'A corrente leva brasa de Kagutsuchi na ponta.', 35, 'DES', 15, 6, { v2: 'kagutsuchi', st: 'burn', fx: 'push 20', pre: 'Corrente de Vento' }),
    D('Corrente em Espiral', 'Uma corrente que gira sobre si e abre a guarda do alvo.', 30, 'DES', 12, 6, { fx: 'push 25; brk 1', cmd: 'runa', rn: 'espiral', pre: 'Corrente de Vento' }),
  ],
  'Lâmina de Vento': [
    D('Lâmina de Vento Sombria', 'A lâmina passa pela sombra do alvo e corta de dentro.', 25, 'DES', 14, 5, { v2: 'tsukuyomi', fx: 'pierce 60', pre: 'Lâmina de Vento' }),
    D('Lâmina de Vento Larga', 'A lâmina se alarga e acerta o grupo todo.', 25, 'DES', 10, 6, { area: true, ct: 110, pre: 'Lâmina de Vento' }),
    D('Lâmina de Vento Curativa', 'Um vento de Amaterasu que corta o mal e fecha a ferida do aliado.', 35, 'SAB', 12, 5, { v2: 'amaterasu', k: 'heal', pre: 'Lâmina de Vento' }),
  ],
};

export function variar(TREE) {
  const all = Object.values(TREE).flatMap(t => t.branches), byName = new Map(all.flat().map(s => [s.n, s]));
  for (const [n, f] of Object.entries(CMD)) { const s = byName.get(n); if (!s) throw new Error(`Leva 7: nó "${n}" não existe`); Object.assign(s, f); }
  for (const [base, vs] of Object.entries(VAR)) {
    const br = all.find(b => b.some(s => s.n === base)); if (!br) throw new Error(`Leva 7: base "${base}" não existe`);
    br.splice(br.findIndex(s => s.n === base) + 1, 0, ...vs);
  }
}

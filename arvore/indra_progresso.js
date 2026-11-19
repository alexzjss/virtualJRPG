// Continuação do ramo de Faísca Dupla: domínio elétrico em seis etapas.
export const INDRA_PROGRESSO = [
  { n: 'Faísca em Arco', k: 'dmg', d: 'A descarga salta entre dois alvos próximos.', xp: 20, a: 'INT', p: 12, c: 4, fx: 'chain 1 .5', pre: 'Faísca Dupla' },
  { n: 'Fulgor Condutor', k: 'dmg', d: 'Um pulso percorre o alvo e deixa a guarda aberta.', xp: 25, a: 'INT', p: 16, c: 5, st: 'para', pre: 'Faísca em Arco' },
  { n: 'Círculo de Raios', k: 'dmg', d: 'Raios curtos cercam e atingem todos os inimigos.', xp: 30, a: 'INT', p: 16, c: 8, area: true, pre: 'Fulgor Condutor' },
  { n: 'Lâmina de Plasma', k: 'dmg', d: 'A corrente se comprime num fio que atravessa a armadura.', xp: 40, a: 'INT', p: 25, c: 7, fx: 'pierce 50', pre: 'Círculo de Raios' },
  { n: 'Tempestade Guiada', k: 'dmg', d: 'Uma descarga precisa percorre a linha inimiga e paralisa quem alcança.', xp: 50, a: 'INT', p: 24, c: 12, area: true, st: 'para', pre: 'Lâmina de Plasma' },
  { n: 'Coração do Trovão', k: 'dmg', d: 'O corpo vira um condutor e libera toda a energia num único raio.', xp: 65, a: 'INT', p: 38, c: 12, ct: 130, pre: 'Tempestade Guiada' },
];

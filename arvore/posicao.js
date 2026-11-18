// Posição das técnicas que os jogadores já usam (passa antes de arvore/nivel.js, em tree.js).
// Subir/descer de nível = mudar de lugar no ramo: o começo do ramo fica perto do centro da mandala, o fim fica longe.
// FORTES vão para o fim do ramo; as outras de JA (já aprendidas por alguém) vão para o começo, puxando junto o `pre` delas.
// Cada técnica de JA ganha uma vizinha nova (VIZ), posta logo depois dela no mesmo ramo; depois das fortes a vizinha é mais forte ainda.
const D = (n, d, xp, a, p, c, x = {}) => ({ n, k: 'dmg', d, xp, a, p, c, ...x });
const U = (n, d, xp, a, c, x = {}) => ({ n, k: 'util', d, xp, a, c, ...x });
const P = (n, d, xp, x = {}) => ({ n, k: 'passive', d, xp, ...x });
const F = (n, d, xp, a, c, fm, x = {}) => ({ n, k: 'form', d, xp, a, c, fm, ...x });
const DOM = (n, d, a, aw, dom, x = {}) => ({ n, k: 'util', d, xp: 180, a, c: 0, ct: 150, tg: 'self', aw, dom, ...x });

export const FORTES = ['Mundo do Tsukuyomi', 'Dente-de-leão', 'Cólera', 'Kai', 'Inconsciência', 'Canhão de Aura Gélido', 'Wakaze', 'Chute Doentio', 'Evolução Forçada', 'Soco da Dualidade', 'Lâmina da Irmandade', 'Ataque de Trio'];

export const VIZ = {
  // Marcial
  'Golpe Pesado': D('Golpe Pesado Giratório', 'O peso do golpe vira um giro que acerta todos em volta.', 15, 'FOR', 12, 6, { area: true, ct: 120, fx: 'st down 1 30%' }),
  'Carregar': P('Carga Contínua', 'O corpo aprende a puxar a energia do lugar mesmo lutando.', 25, { on: 'turn', fx: 'gain aura 2' }),
  'Intuição': P('Arrepio na Nuca', 'Um arrepio na nuca avisa antes do golpe chegar.', 20, { on: 'hurt', ch: 25, fx: 'st evade 1 self' }),
  'Clareza': U('Clareza Compartilhada', 'A leitura do combate passa para os aliados em poucas palavras.', 30, 'INT', 4, { area: true, fx: 'st focus 2' }),
  'Cólera': F('Cólera Sem Fim', 'A cólera não para no fim do fôlego: o corpo continua até cair.', 70, 'FOR', 4, 'dur 4; atk 60; dr hp 14; end st exaus 3', { pre: 'Cólera', rq: { FOR: 60 } }),
  'Kai': F('Kai Absoluto', 'Toda a reserva espiritual queima de uma vez, sem guardar nada.', 70, 'SAB', 4, 'dur 3; atkP 16; dr aura 6; end lose aura 99', { pre: 'Kai', rq: { SAB: 60 } }),
  'Inconsciência': F('Instinto Animal', 'Abaixo da Inconsciência só resta o bicho: rápido, faminto e sem medo.', 70, 'FOR', 5, 'dur 5; atk 25; agi 25; hit 10; end st exaus 3', { pre: 'Inconsciência', rq: { FOR: 60 } }),
  'Soco da Dualidade': D('Eco da Dualidade', 'O segundo impacto da dupla volta pela mesma corrente e derruba.', 80, 'FOR', 30, 10, { duo: 'Eco da Dualidade', pre: 'Soco da Dualidade', fx: 'st down 1', rq: { FOR: 57 } }),
  'Lâmina da Irmandade': D('Cruz da Irmandade', 'Duas lâminas em cruz sobre o mesmo alvo, cada uma abrindo a outra.', 70, 'DES', 22, 9, { duo: 'Cruz da Irmandade', hits: 2, st: 'bleed', pre: 'Lâmina da Irmandade', rq: { DES: 57 } }),
  'Aparar': P('Contragolpe Firme', 'Depois de aparar, a mão já está no caminho da resposta.', 15, { on: 'hurt', ch: 25, fx: 'st counter 1' }),
  // Armas
  'Fio Afiado': P('Fio Cortante', 'O fio bem cuidado acha a fresta da armadura.', 15, { mod: 'crit 3', sc: 'wc:corte' }),
  'Alvo na Mira': P('Olho Firme', 'A mão não treme e o tiro acha o ponto fraco.', 15, { mod: 'crit 3', sc: 'wc:dist' }),
  // Indra
  'Faísca': D('Faísca Dupla', 'Duas faíscas seguidas, a segunda entra pela trilha da primeira.', 15, 'INT', 8, 4, { hits: 2, ct: 70, fx: 'st para 1 20%' }),
  // Fuhaku
  'Lâmina de Vento': D('Lâmina de Vento Dupla', 'Duas lâminas de vento cruzando o ar juntas.', 15, 'DES', 8, 4, { hits: 2, ct: 70 }),
  'Corte Fino': D('Corte Capilar', 'Um corte tão fino que reabre as feridas que já estavam lá.', 15, 'DES', 10, 4, { st: 'bleed', fx: 'vs bleed 1.3' }),
  'Sopro Cortante': D('Sopro em Leque', 'O sopro se abre em leque e corta quem estiver na frente.', 20, 'DES', 12, 7, { area: true, ct: 120 }),
  'Corte de Fuhaku': D('Corte de Fuhaku: Cruzado', 'Dois cortes de Fuhaku em X.', 25, 'DES', 14, 8, { hits: 2, ct: 90, st: 'bleed' }),
  'Passo do Vento': U('Rastro de Vento', 'O passo deixa um rastro de ar que empurra o corpo adiante.', 15, 'AGI', 2, { ct: 40, tg: 'self', fx: 'st evade 1 self; haste 30 self' }),
  'Pulso de Fuhaku': D('Pulso Duplo', 'Dois pulsos curtos, um em cada mão.', 10, 'DES', 5, 3, { hits: 2, ct: 50, fx: 'push 15' }),
  'Selo de Fuhaku': D('Selo Estourado', 'O selo é comprimido de mais e estoura mais cedo, e mais forte.', 15, 'DES', 8, 4, { fx: 'seal 20 1' }),
  'Corrente de Vento': D('Correntes em X', 'Duas correntes de vento se cruzam no meio dos inimigos.', 20, 'DES', 10, 5, { area: true, ct: 110, fx: 'push 20' }),
  'Empurrão': U('Parede de Vento', 'Uma parede de vento na frente do corpo segura e empurra quem vem.', 20, 'DES', 3, { tg: 'self', fx: 'shield 8 self; push 30 foes' }),
  'Tentáculo de Vento': D('Tentáculo Agarrador', 'O tentáculo de vento se enrola no alvo e não solta.', 25, 'DES', 6, 5, { hits: 2, fx: 'st root 2' }),
  'Atirar Vento': D('Chuva de Detritos', 'Tudo o que está solto no chão sobe e cai sobre os inimigos.', 25, 'DES', 8, 6, { area: true, ct: 120, fx: 'push 15' }),
  'Wakaze': D('Wakaze: Rajada Tripla', 'Três esferas de Wakaze, uma atrás da outra.', 70, 'DES', 16, 14, { hits: 3, fx: 'push 20', pre: 'Wakaze', rq: { DES: 58 } }),
  'Salto de Ventania': D('Queda do Vento', 'Do alto do salto, o corpo cai sobre o inimigo com o peso do vento.', 15, 'AGI', 14, 4, { fx: 'st down 1 30%' }),
  'Asa-Branca': D('Voo Rasante', 'Planando baixo, o corpo passa pelo inimigo e deixa a guarda dele aberta.', 25, 'AGI', 16, 5, { fx: 'st exposed 1' }),
  'Dente-de-leão': DOM('Dente-de-leão: Semeadura', 'As sementes do vento se espalham por todo o campo e o domínio cresce.', 'DES', 'fuhaku', 'dur 4; ally agi 25; ally hit 15; foe hit -15', { pre: 'Dente-de-leão', rq: { DES: 64 } }),
  // Tsukuyomi
  'Passo do Cão-de-Caça': U('Faro do Cão-de-Caça', 'O cão sente o cheiro do medo e marca a presa.', 15, 'INT', 2, { fx: 'st marked 2' }),
  'Mundo do Tsukuyomi': DOM('Mundo do Tsukuyomi: Lua Rubra', 'A lua do Reino das Trevas fica vermelha: o domínio fica mais fundo e cobra da mente.', 'INT', 'tsukuyomi', 'dur 4; ally hit 15; ally agi 10; foe hit -20; tick fear', { pre: 'Mundo do Tsukuyomi', pay: { san: 6 }, rq: { INT: 64 } }),
  // Hiruko
  'Evolução Forçada': { n: 'Evolução Descontrolada', k: 'heal', d: 'A evolução passa do ponto: o corpo se refaz maior e mais forte, e cobra o preço.', xp: 70, a: 'CON', p: 34, c: 12, st: 'atkUp', pay: { hp: 6 }, pre: 'Evolução Forçada', rq: { CON: 58 } },
  'Suplex': D('Suplex Duplo', 'Agarra, arremessa e agarra de novo antes do alvo levantar.', 20, 'FOR', 9, 4, { hits: 2, fx: 'stack doenca 5 self' }),
  'Esquiva Doentia': U('Recuo Doentio', 'Um salto para trás que endurece a pele no caminho.', 20, 'AGI', 2, { ct: 40, tg: 'self', fx: 'st evade 1 self; st defUp 1 self; stack doenca 5 self' }),
  'Força Doentia': D('Agarrão Doentio', 'Mãos que apertam com força de doença e não soltam.', 25, 'FOR', 18, 5, { fx: 'st root 1; stack doenca 5 self' }),
  'Chute Doentio': D('Chute Doentio: Contágio', 'O chute espalha a doença de quem foi atingido para quem está perto.', 70, 'FOR', 36, 9, { st: 'poison', fx: 'spread poison; stack doenca 5 self', pre: 'Chute Doentio', rq: { FOR: 58 } }),
  // Aura
  'Ten: Envolver': P('Ten Atento', 'O Ten já começa a luta firme como couro curtido.', 15, { on: 'start', fx: 'st defUp 1 self' }),
  'Zetsu: Ocultar': U('Zetsu Respirado', 'No silêncio do Zetsu a respiração fecha as feridas.', 15, 'SAB', 0, { ct: 80, tg: 'self', fx: 'gain aura 6; res hp 4' }),
  'Ren: Intensificar': D('Ren Explosivo', 'O Ren sai de uma vez e a pressão da aura abala quem está perto.', 20, 'SAB', 8, 6, { area: true, ct: 120, fx: 'st atkDn 1 50%' }),
  'Punho Reforçado': D('Punho Reforçado Duplo', 'Os dois punhos reforçados, um depois do outro.', 15, 'FOR', 10, 5, { hits: 2, cat: 'int' }),
  'Corpo Reforçado': P('Ossos Reforçados', 'A aura entra até os ossos.', 15, { cat: 'int', mod: 'def 4' }),
  'Punho Meteoro': D('Chuva de Meteoros', 'Socos que caem como uma chuva de pedras.', 35, 'FOR', 14, 10, { area: true, ct: 130, cat: 'int', fx: 'st stun 1 25%' }),
  'Shukoudan': D('Shukoudan Duplo', 'Dois disparos de energia pura, um de cada mão.', 15, 'SAB', 7, 4, { hits: 2, ct: 70, cat: 'emi' }),
  'Força de Aura': D('Impacto de Aura', 'A pancada reforçada empurra o alvo para longe.', 15, 'FOR', 14, 4, { cat: 'int', fx: 'push 25' }),
  'Teia de Aura': D('Teia Grudenta', 'A teia se abre numa rede e prende todos que tocar.', 20, 'DES', 4, 4, { area: true, ct: 120, cat: 'tra', fx: 'st root 1' }),
  'Canhão de Aura': D('Canhão Disperso', 'O canhão se abre antes de chegar e atinge todos os inimigos.', 40, 'SAB', 14, 9, { area: true, ct: 120, cat: 'emi' }),
  'Canhão de Aura Gélido': D('Canhão de Aura: Zero Absoluto', 'O frio do canhão chega ao zero: o que ele toca para de se mexer.', 80, 'SAB', 40, 18, { area: true, ct: 150, cat: 'emi', v2: 'fuhaku', fx: 'st frozen 1 60%; st wet 2', pre: 'Canhão de Aura Gélido', rq: { SAB: 60 } }),
};

export function posicionar(TREE) {
  const forte = new Set(FORTES), ja = new Set(Object.keys(VIZ)), novas = [];
  const M = TREE.marcial.branches; // o ramo 0 do Marcial é o centro fixo (1 nó + 8 em volta): a vizinha do Golpe Pesado vai para os treinos, postos junto ao centro
  M[1].unshift(VIZ['Golpe Pesado']);
  for (const t of Object.values(TREE)) for (const b of t.branches) {
    if (b === M[0] || !b.some(s => ja.has(s.n))) continue;
    const nm = new Map(b.map(s => [s.n, s])), rank = new Map(b.map(s => [s, forte.has(s.n) ? 2 : ja.has(s.n) ? 0 : 1]));
    const pres = s => (s.pre || '').split('|').map(n => nm.get(n)).filter(Boolean);
    for (let k = 0; k < b.length; k++) for (const s of b) for (const p of pres(s)) // quem desce puxa o pre junto; nada fica antes do próprio pre
      if (rank.get(p) > rank.get(s)) { if (rank.get(s) === 0) rank.set(p, 0); else rank.set(s, rank.get(p)); }
    const keep = b[0].ramo ? b[0] : null; // 1º nó dos ramos de arma leva o nome do ramo
    const ord = [...b].sort((x, y) => (x === keep ? -1 : y === keep ? 1 : 0) || rank.get(x) - rank.get(y) || b.indexOf(x) - b.indexOf(y));
    const out = [], done = new Set(), put = s => { if (done.has(s)) return; for (const p of pres(s)) if (ord.includes(p)) put(p); done.add(s); out.push(s); };
    ord.forEach(put);
    b.length = 0; for (const s of out) { b.push(s); if (VIZ[s.n] && t === TREE.armas) b.push(VIZ[s.n]); } // armas: a vizinha fica no ramo; nos demais ela vai para a linha da técnica
    if (t !== TREE.armas) for (const s of out) if (VIZ[s.n] && s.n !== 'Golpe Pesado') novas.push([t, s.n]);
  }
  // cada técnica ganha uma linha própria (ramo com `de`): sai da técnica base e vai para fora do centro, só com as variações dela
  for (const [t, base] of novas) { const L = [VIZ[base]]; L.de = base; t.branches.push(L); }
}

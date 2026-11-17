// Armas: tipos, categorias, níveis, perfil do ataque básico, técnicas próprias, modelos (templates) e o criador de armas.
// Script comum (sem import/export): no navegador vira window.ARMAS; no servidor é importado pelo efeito e lido em globalThis.ARMAS.
// Depende de RULES (rules.js) para ler a notação de efeitos; carregue rules.js antes.
//
// Campos de uma arma (item com type 'arma'); todos opcionais, o padrão vem do tipo:
//   wt tipo · cat categoria · lvl nível (0-3) · tpl modelo de origem · power poder · el elemento do ataque básico
//   wa / wa2 atributo do ataque (com dois, usa a média) · hit acerto · crit chance de crítico · ct tempo da ação (%)
//   hits golpes por ataque · area ataque em área · pierce % da armadura ignorada · mental ataque fere a Sanidade
//   st / stc / stn condição que o ataque causa, chance (%) e turnos · fx efeitos extras na notação de rules.js
//   mod 'def 5; agi -5; FOR 3' bônus enquanto empunhada (modificadores e atributos) · rq 'FOR 50' requisito (abaixo: −20 de acerto)
//   atkN nome do ataque básico · d descrição · sk técnicas da arma (skills que só existem com ela equipada)
(g => {
  const ATTRS = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'];
  const EL = ['fis', 'kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'amaterasu', 'tsukuyomi', 'shukketsu', 'hiruko', 'aura', 'oculto'];
  const MODK = ['atk', 'def', 'agi', 'hit', 'crit', 'atkP', 'heal'];
  const KINDS = ['dmg', 'mental', 'heal', 'util', 'form'];
  const RU = () => g.RULES;

  const TIPOS = {
    lamina: { n: 'Lâmina', wa: 'FOR', d: 'Sabres, katanas, adagas e floretes: equilibradas. Liberam as técnicas de lâmina da árvore.' },
    lanca: { n: 'Haste', wa: 'FOR', d: 'Lanças, baionetas, alabardas e arpões: alcance e perfuração. Liberam as técnicas de lança.' },
    fogo: { n: 'Arma de fogo', wa: 'DES', d: 'Revólveres, rifles e escopetas: usam DES e a munição equipada. Liberam as técnicas de tiro.' },
    punho: { n: 'Punhos', wa: 'FOR', d: 'Soqueiras, manoplas e garras: rápidas. Liberam as técnicas de luta; sem arma, o personagem luta com os punhos.' },
    pesada: { n: 'Arma pesada', wa: 'FOR', d: 'Marretas, machados e montantes: lentas, derrubam e racham armaduras. Costumam pedir FOR mínima.' },
    foco: { n: 'Foco místico', wa: 'INT', d: 'Grimórios, cajados, sinos e leques de ofuda: o ataque é canalizado pela mente (INT, SAB ou CAR).' },
  };
  // categoria: nome, descrição, multiplicador de preço
  const CATS = {
    basica: ['Básica', 'Arma comum de loja: um traço simples e uma técnica própria.', 1],
    especial: ['Especial', 'Traço marcante e duas técnicas próprias.', 1.6],
    elemental: ['Elemental', 'O ataque e as técnicas físicas ganham o elemento da arma, com chance da condição dele. Forjada com essências.', 2],
    lendaria: ['Lendária', 'Peça única: +3 de poder, +5% de crítico, duas técnicas e um golpe supremo com 1 uso por batalha.', 4],
    maldita: ['Maldita', '+5 de poder e +5% de crítico, mas cada ataque custa 2 de Sanidade e cada técnica 4% do HP.', 2.5],
  };
  // nível: poder somado ao modelo e multiplicador de preço; as técnicas ganham 60% do poder extra
  const NIVEIS = [{ n: 'Comum', p: 0, $: 1 }, { n: 'Refinada', p: 4, $: 3 }, { n: 'Obra-prima', p: 9, $: 8 }, { n: 'Mítica', p: 14, $: 16 }];
  // condição que a categoria Elemental dá ao ataque (15% de chance), por elemento
  const ELST = { kagutsuchi: ['burn', 2], susanoo: ['wet', 2], atlas: ['root', 1], indra: ['para', 1], fuhaku: ['bleed', 2], amaterasu: ['blind', 1], tsukuyomi: ['fear', 2], shukketsu: ['bleed', 2], hiruko: ['rad', 2], aura: ['marked', 2], oculto: ['curse', 2] };

  // ----- leitura dos campos -----
  const memo = new Map(), once = (k, f) => { if (!memo.has(k)) { if (memo.size > 500) memo.clear(); memo.set(k, f()); } return memo.get(k); };
  // 'def 5; agi -5; FOR 3' → { m: modificadores, a: atributos, bad: entradas inválidas }
  const kv = str => once('kv|' + (str || ''), () => {
    const o = { m: {}, a: {}, bad: [] };
    for (const x of String(str || '').split(';').map(x => x.trim()).filter(Boolean)) {
      const [k, v] = x.split(/\s+/);
      if (v == null || Number.isNaN(+v)) o.bad.push(x); else if (MODK.includes(k)) o.m[k] = +v; else if (ATTRS.includes(k)) o.a[k] = +v; else o.bad.push(x);
    }
    return o;
  });
  const fxOf = str => once('fx|' + (str || ''), () => { try { return RU().parseFx(str, 'arma') || []; } catch { return []; } });
  // perfil completo do ataque básico, com os padrões do tipo (sem arma = punhos com FOR)
  function prof(i) {
    const T = TIPOS[i?.wt] || TIPOS.punho, n = (v, d = 0) => Number.isFinite(+v) && v !== '' && v != null ? +v : d;
    return {
      wt: TIPOS[i?.wt] ? i.wt : 'punho', wa: ATTRS.includes(i?.wa) ? i.wa : T.wa, wa2: ATTRS.includes(i?.wa2) && i.wa2 !== i?.wa ? i.wa2 : '',
      hit: n(i?.hit), crit: n(i?.crit), ct: n(i?.ct, 100) || 100, hits: Math.max(1, n(i?.hits, 1)), area: !!i?.area, pierce: n(i?.pierce), mental: !!i?.mental,
      st: i?.st || '', stc: i?.st ? n(i?.stc, 100) : 0, stn: n(i?.stn, 3) || 3, fx: i?.fx || '', mod: kv(i?.mod), rq: kv(i?.rq).a, atkN: i?.atkN || '',
    };
  }
  // efeitos do ataque básico já lidos: fx + condição com chance + perfuração
  const basicFx = i => { const P = prof(i); return [...fxOf(P.fx), ...(P.st && P.stc > 0 ? [{ t: 'st', k: P.st, n: P.stn, ch: P.stc }] : []), ...(P.pierce > 0 ? [{ t: 'pierce', p: Math.min(100, P.pierce) }] : [])]; };
  // falta atributo para empunhar direito? (a função at recebe o atributo e devolve o valor do personagem)
  const short = (i, at) => Object.entries(prof(i).rq).filter(([a, v]) => at(a) < v);

  // ----- estimativa de dano por tempo (orçamento), para o mestre comparar armas -----
  // Referência: atacante com 55 no atributo, alvo com AGI 70 e armadura 2. Não é o motor: é uma régua.
  const SW = { bleed: 7, burn: 7, poison: 7, rad: 7, stun: 14, sleep: 9, para: 9, frozen: 12, confuse: 9, possess: 14, defDn: 6, atkDn: 5, agiDn: 4, down: 4, marked: 5, fear: 4, blind: 5, wet: 2, oil: 2, exposed: 6, root: 3, curse: 4, silence: 6, dread: 4 };
  function score(i) {
    const P = prof(i), stat = 55, arm = 2 * (1 - Math.min(100, P.pierce) / 100), M = P.mod.m;
    const fx = fxOf(P.fx), sure = fx.some(f => f.t === 'sure');
    const ch = sure ? .95 : Math.min(95, Math.max(5, stat + 60 - 35 + P.hit + (M.hit || 0))) / 100, crit = Math.min(.6, (Math.floor(ch * 10) + P.crit + (M.crit || 0)) / 100);
    let d = Math.max(1, (+i.power || 0) + Math.floor(stat / 10 / P.hits) - arm) * P.hits * ch * (1 + crit) * (1 + (M.atk || 0) / 100);
    if (P.st) d += (SW[P.st] || 3) * P.stc / 100 * ch;
    for (const f of fx) {
      if (f.to === 'self') continue;
      if (f.t === 'exec') d *= 1 + (f.m - 1) * .25; else if (f.t === 'vs') d *= 1 + (f.m - 1) * .35; else if (f.t === 'per') d *= 1 + f.p / 100; else if (f.t === 'rage') d *= 1 + f.m * .3;
      else if (f.t === 'drain') d *= 1 + f.p / 300; else if (f.t === 'push') d += f.v / 10; else if (f.t === 'st') d += (SW[f.k] || 3) * (f.ch ?? 100) / 100 * ch; else if (f.t === 'pierce') d += 2 * f.p / 100; else if (f.t !== 'sure') d += 2;
    }
    if (P.area) d *= 1.8;
    if (P.mental) d *= .9;
    return d / (P.ct / 100) * (1 + (M.agi || 0) / 100);
  }
  const lvlOf = i => Number.isInteger(+i?.lvl) && NIVEIS[+i.lvl] ? +i.lvl : [...NIVEIS.keys()].reverse().find(k => (+i?.power || 0) >= 10 + NIVEIS[k].p) ?? 0;
  const refScore = lvl => score({ wt: 'lamina', power: 10 + NIVEIS[lvl].p });
  const rel = i => Math.round(100 * score(i) / refScore(lvlOf(i))); // % do sabre simples do mesmo nível
  // faixa recomendada de orçamento por categoria (o resto do valor vem das técnicas e do elemento)
  const FAIXA = { basica: [90, 115], especial: [95, 125], elemental: [90, 120], lendaria: [115, 150], maldita: [120, 160] };

  // ----- modelos -----
  // p poder no nível Comum · $ preço base · traços do perfil · sk: [técnica principal, segunda técnica] na notação dos nós
  // (n nome, k tipo, a atributo — vazio usa o da arma —, p poder, c custo em Aura, ct, hits, area, st, fx, fm, tg 'self', uses, d)
  const M = {};
  const T = (id, n, wt, p, $, o, sk, d) => { M[id] = { id, n, wt, p, $, d, ...o, sk }; };
  // lâminas
  T('sabre', 'Sabre', 'lamina', 10, 40, { hit: 5 }, [
    { n: 'Corte Cruzado', k: 'dmg', p: 13, c: 4, ct: 90, d: 'Dois talhos em X, rápidos e firmes.' },
    { n: 'Guarda de Sabre', k: 'util', c: 3, tg: 'self', fx: 'st counter 2 self; st defUp 2 self', d: 'A lâmina na frente do corpo: apara e revida.' }], 'Equilibrado: um pouco mais certeiro que as outras lâminas.');
  T('katana', 'Katana', 'lamina', 10, 45, { wa2: 'DES', crit: 5 }, [
    { n: 'Iaijutsu', k: 'dmg', p: 16, c: 5, ct: 110, fx: 'sure', d: 'O corte sai da bainha num piscar: não há como esquivar.' },
    { n: 'Corte da Garça', k: 'dmg', p: 12, c: 6, fx: 'st bleed 3 60%', d: 'Um corte longo que abre a guarda e faz sangrar.' }], 'Usa a média de FOR e DES e acerta críticos com mais facilidade.');
  T('adaga', 'Adaga', 'lamina', 6, 30, { wa: 'DES', ct: 75, crit: 5, st: 'bleed', stc: 25 }, [
    { n: 'Golpe Traiçoeiro', k: 'dmg', p: 12, c: 4, fx: 'vs bleed 1.5', d: 'Uma estocada na ferida aberta: muito mais forte em quem já sangra.' },
    { n: 'Sumir na Sombra', k: 'util', c: 4, ct: 60, tg: 'self', fx: 'st stealth 1 self', d: 'Some do campo de visão e prepara o próximo golpe.' }], 'Rápida (tempo 75%), usa DES e às vezes faz sangrar.');
  T('florete', 'Florete', 'lamina', 8, 40, { wa: 'DES', hit: 15, pierce: 25, ct: 90 }, [
    { n: 'Estocada de Esgrima', k: 'dmg', p: 13, c: 4, fx: 'pierce 60', d: 'A ponta acha a fresta entre as placas.' },
    { n: 'Finta', k: 'dmg', p: 8, c: 3, ct: 70, fx: 'st marked 2', d: 'Um ataque falso que deixa o alvo aberto para o grupo.' }], 'Precisa e perfurante, com DES; dano por golpe menor.');
  T('foice', 'Foice', 'lamina', 11, 60, { ct: 110, st: 'bleed', stc: 20, fx: 'exec 25 1.3' }, [
    { n: 'Colheita', k: 'dmg', p: 10, c: 7, area: true, d: 'A foice varre a linha toda num arco largo.' },
    { n: 'Ceifar', k: 'dmg', p: 16, c: 6, fx: 'exec 30 1.8', d: 'Um golpe que termina o que já estava no fim.' }], 'Lenta; mais forte contra quem está com pouca vida.');
  // hastes
  T('baioneta', 'Baioneta', 'lanca', 10, 40, { wa2: 'DES', hit: 5 }, [
    { n: 'Carga de Baioneta', k: 'dmg', p: 15, c: 5, fx: 'push 20', d: 'Avança com a ponta baixa e empurra o alvo para trás na fila.' },
    { n: 'Formação de Quadrado', k: 'util', c: 4, tg: 'self', fx: 'st counter 2 self; st defUp 2 self', d: 'Ponta para fora, pés firmes: quem chega se espeta.' }], 'Haste curta de soldado: média de FOR e DES.');
  T('lanca', 'Lança', 'lanca', 11, 45, { pierce: 30, ct: 105 }, [
    { n: 'Estocada Longa', k: 'dmg', p: 15, c: 5, fx: 'pierce 60', d: 'O alcance todo da haste num golpe só.' },
    { n: 'Molinete', k: 'dmg', p: 9, c: 6, area: true, fx: 'st down 1 40%', d: 'A haste gira e derruba quem está na frente.' }], 'Ignora parte da armadura.');
  T('alabarda', 'Alabarda', 'lanca', 13, 60, { ct: 120, st: 'defDn', stc: 20, fx: 'push 15' }, [
    { n: 'Golpe de Gancho', k: 'dmg', p: 14, c: 5, fx: 'st down 1; strip', d: 'O gancho puxa a guarda, tira as defesas e derruba.' },
    { n: 'Machadada de Haste', k: 'dmg', p: 20, c: 7, ct: 125, fx: 'pierce 40', d: 'A lâmina larga desce com o peso da haste.' }], 'Lenta; abala a defesa e atrasa o alvo.');
  T('arpao', 'Arpão', 'lanca', 10, 45, { wa: 'DES', st: 'agiDn', stc: 30 }, [
    { n: 'Fisgar', k: 'dmg', p: 13, c: 4, fx: 'st root 2; push 25', d: 'O arpão crava e a corda puxa: o alvo não sai do lugar.' },
    { n: 'Arremesso de Arpão', k: 'dmg', p: 16, c: 5, fx: 'sure', d: 'Arremessado de longe, com a corda guiando.' }], 'Usa DES; às vezes deixa o alvo lento.');
  // armas de fogo
  T('revolver', 'Revólver', 'fogo', 10, 40, { ct: 90 }, [
    { n: 'Leque do Pistoleiro', k: 'dmg', p: 6, c: 5, hits: 3, ct: 110, d: 'O cão puxado com a palma: três tiros num fôlego.' },
    { n: 'Tiro de Advertência', k: 'dmg', p: 8, c: 3, ct: 70, fx: 'push 30', d: 'Um tiro no chão que faz o alvo hesitar.' }], 'Rápido de sacar (tempo 90%).');
  T('pistolas', 'Pistolas Gêmeas', 'fogo', 6, 50, { hits: 2, ct: 90 }, [
    { n: 'Fogo Cruzado', k: 'dmg', p: 6, c: 6, hits: 2, area: true, d: 'Uma pistola para cada lado: ninguém fica de fora.' },
    { n: 'Dança das Balas', k: 'dmg', p: 5, c: 6, hits: 4, ct: 120, d: 'Gira e atira sem parar.' }], 'Dois tiros por ataque.');
  T('rifle', 'Rifle', 'fogo', 12, 50, { ct: 125, hit: 15, pierce: 30, crit: 5 }, [
    { n: 'Tiro de Precisão', k: 'dmg', p: 22, c: 6, ct: 140, fx: 'sure; pierce 100', d: 'Respira, mira, dispara: atravessa qualquer couraça.' },
    { n: 'Mira Assentada', k: 'form', c: 4, fm: 'dur 3; hit 15; crit 15', d: 'Apoia o cano e espera: cada tiro vai onde deve.' }], 'Lento, certeiro e perfurante.');
  T('escopeta', 'Escopeta', 'fogo', 8, 50, { area: true, ct: 120, hit: -10 }, [
    { n: 'Cano Duplo', k: 'dmg', p: 20, c: 5, ct: 120, fx: 'st down 1', d: 'Os dois canos de uma vez, à queima-roupa.' },
    { n: 'Chumbo Grosso', k: 'dmg', p: 10, c: 6, area: true, fx: 'st defDn 2 50%', d: 'Chumbo pesado que amassa a proteção de todos.' }], 'O ataque básico acerta todos os inimigos; erra mais.');
  T('metralhadora', 'Submetralhadora', 'fogo', 7, 70, { hits: 3, ct: 120, hit: -10 }, [
    { n: 'Rajada Contínua', k: 'dmg', p: 5, c: 7, hits: 2, area: true, ct: 130, d: 'O tambor inteiro varrendo o salão.' },
    { n: 'Fogo de Supressão', k: 'dmg', p: 4, c: 5, area: true, fx: 'push 25; st atkDn 2', d: 'Ninguém levanta a cabeça.' }], 'Três tiros por ataque; lenta e imprecisa.');
  T('sinalizador', 'Pistola Sinalizadora', 'fogo', 8, 35, { st: 'burn', stc: 35 }, [
    { n: 'Sinal Rubro', k: 'dmg', p: 12, c: 4, fx: 'st burn 3; st marked 2', d: 'Um clarão vermelho que queima e marca o alvo para o grupo.' },
    { n: 'Clarão', k: 'dmg', p: 6, c: 5, area: true, fx: 'st blind 2 60%', d: 'A luz cega todos por um instante.' }], 'Fraca, mas incendeia.');
  // punhos
  T('soqueira', 'Soqueira', 'punho', 9, 30, { ct: 80 }, [
    { n: 'Direto de Ferro', k: 'dmg', p: 12, c: 3, ct: 70, d: 'Um soco curto com o aço no nó dos dedos.' },
    { n: 'Gancho no Fígado', k: 'dmg', p: 14, c: 5, fx: 'st atkDn 2', d: 'Dobra o adversário ao meio e tira a força dele.' }], 'Rápida (tempo 80%).');
  T('manoplas', 'Manoplas', 'punho', 10, 45, { mod: 'def 5' }, [
    { n: 'Bloqueio de Aço', k: 'util', c: 3, ct: 60, tg: 'self', fx: 'shield 10 self; st counter 1 self', d: 'Os antebraços de aço viram escudo.' },
    { n: 'Martelo de Punho', k: 'dmg', p: 16, c: 6, ct: 115, fx: 'st stun 1 40%', d: 'Os dois punhos juntos descendo como marreta.' }], 'Protegem: −5% de dano recebido.');
  T('garras', 'Garras', 'punho', 6, 45, { wa: 'DES', hits: 2, st: 'bleed', stc: 20, ct: 90 }, [
    { n: 'Rasgar', k: 'dmg', p: 6, c: 5, hits: 3, fx: 'st bleed 3 40%', d: 'Três rasgos rápidos que deixam o alvo em tiras.' },
    { n: 'Salto Felino', k: 'dmg', p: 12, c: 4, ct: 70, fx: 'haste 20 self', d: 'Salta, golpeia e já está pronto de novo.' }], 'Dois golpes com DES; fazem sangrar.');
  T('faixas', 'Faixas de Monge', 'punho', 8, 35, { wa: 'AGI', ct: 75, mod: 'agi 5' }, [
    { n: 'Palma Vazia', k: 'dmg', p: 12, c: 4, fx: 'pierce 100', d: 'Uma palma que atravessa a armadura e acerta por dentro.' },
    { n: 'Respiração Marcial', k: 'heal', p: 8, c: 4, tg: 'self', fx: 'st focus 2 self', d: 'Respira fundo, recupera o fôlego e o foco.' }], 'Usa AGI; muito rápidas e deixam o lutador mais veloz.');
  // armas pesadas
  T('marreta', 'Marreta', 'pesada', 15, 45, { ct: 135, hit: -10, st: 'stun', stc: 15, rq: 'FOR 50' }, [
    { n: 'Golpe Sísmico', k: 'dmg', p: 12, c: 7, area: true, ct: 130, fx: 'st down 1 50%', d: 'A marreta no chão faz todos perderem o equilíbrio.' },
    { n: 'Quebra-Couraça', k: 'dmg', p: 20, c: 6, ct: 130, fx: 'st exposed 2; brk 1', d: 'Um golpe que racha a couraça e a guarda do alvo.' }], 'Lentíssima; às vezes atordoa. Pede FOR 50.');
  T('machado', 'Machado', 'pesada', 13, 45, { ct: 120, crit: 5, st: 'bleed', stc: 25 }, [
    { n: 'Talho Profundo', k: 'dmg', p: 18, c: 6, ct: 120, fx: 'per bleed 10', d: 'Quanto mais o alvo sangra, mais fundo entra.' },
    { n: 'Arremessar Machado', k: 'dmg', p: 14, c: 4, fx: 'sure', d: 'O machado voa girando direto no alvo.' }], 'Lento; crítico fácil e sangramento.');
  T('montante', 'Montante', 'pesada', 9, 60, { area: true, ct: 135, hit: -5, rq: 'FOR 50' }, [
    { n: 'Corte Giratório', k: 'dmg', p: 13, c: 7, area: true, ct: 130, d: 'A lâmina enorme gira em volta do corpo.' },
    { n: 'Golpe Descendente', k: 'dmg', p: 24, c: 7, ct: 140, fx: 'pierce 50', d: 'Levanta o montante e o deixa cair com tudo.' }], 'O ataque básico acerta todos os inimigos. Pede FOR 50.');
  T('ancora', 'Âncora de Corrente', 'pesada', 14, 60, { ct: 140, hit: -10, fx: 'push 30', rq: 'FOR 55' }, [
    { n: 'Arrastar', k: 'dmg', p: 14, c: 5, fx: 'push 50; st root 2', d: 'A corrente enrola e arrasta o alvo pelo chão.' },
    { n: 'Furacão de Ferro', k: 'dmg', p: 12, c: 8, area: true, ct: 140, fx: 'push 30', d: 'A âncora gira presa à corrente e varre o campo.' }], 'Atrasa o alvo na fila. Pede FOR 55.');
  // focos místicos
  T('grimorio', 'Grimório', 'foco', 9, 45, { wa: 'INT', el: 'oculto' }, [
    { n: 'Página Ardente', k: 'dmg', p: 14, c: 5, fx: 'st curse 2 50%', d: 'Uma página arrancada queima no ar e amaldiçoa o alvo.' },
    { n: 'Selo Escrito', k: 'dmg', p: 6, c: 6, fx: 'seal 25 2', d: 'Escreve no alvo um selo que explode depois.' }], 'Ataque de Ocultismo com INT.');
  T('cajado', 'Cajado de Peregrino', 'foco', 9, 45, { wa: 'SAB', mod: 'heal 10' }, [
    { n: 'Bênção do Caminho', k: 'heal', p: 14, c: 5, d: 'Toca o aliado com o cajado e fecha as feridas.' },
    { n: 'Bastão Consagrado', k: 'dmg', p: 12, c: 4, fx: 'vs demon 1.3', d: 'Uma pancada abençoada que queima o que é profano.' }], 'Usa SAB; as curas de quem o empunha rendem 10% a mais.');
  T('sino', 'Sino de Exorcismo', 'foco', 9, 50, { wa: 'CAR', mental: true, ct: 90 }, [
    { n: 'Badalada', k: 'mental', p: 10, c: 5, area: true, d: 'O som atravessa a mente de todos os inimigos.' },
    { n: 'Toque de Silêncio', k: 'mental', p: 6, c: 5, fx: 'st silence 2', d: 'Uma nota que cala a voz e a magia.' }], 'Usa CAR; o ataque fere a Sanidade e ignora armadura.');
  T('leque', 'Leque de Ofudas', 'foco', 7, 40, { wa: 'SAB', st: 'marked', stc: 30, ct: 90 }, [
    { n: 'Chuva de Ofudas', k: 'dmg', p: 8, c: 6, area: true, fx: 'st marked 2 50%', d: 'Ofudas lançadas em leque grudam em todos.' },
    { n: 'Barreira de Papel', k: 'util', c: 5, fx: 'shield 12', d: 'As ofudas formam um escudo em volta do aliado.' }], 'Usa SAB; marca o alvo para o grupo.');
  // golpe supremo das lendárias, por tipo
  const ULT = {
    lamina: { n: 'Corte do Horizonte', k: 'dmg', p: 28, c: 10, area: true, ct: 130, uses: 1, d: 'Um único corte que risca o campo inteiro.' },
    lanca: { n: 'Lança do Céu', k: 'dmg', p: 40, c: 10, ct: 140, uses: 1, fx: 'pierce 100; st down 1', d: 'Salta e cai com a ponta primeiro, atravessando tudo.' },
    fogo: { n: 'Última Bala', k: 'dmg', p: 45, c: 10, ct: 150, uses: 1, fx: 'sure; exec 40 1.5', d: 'A bala guardada para o fim: não erra e não perdoa.' },
    punho: { n: 'Mil Punhos', k: 'dmg', p: 6, c: 10, hits: 8, ct: 140, uses: 1, d: 'Uma tempestade de socos que não termina.' },
    pesada: { n: 'Terremoto de Aço', k: 'dmg', p: 26, c: 12, area: true, ct: 150, uses: 1, fx: 'st stun 1 60%', d: 'O chão se abre sob o golpe.' },
    foco: { n: 'Palavra Proibida', k: 'mental', p: 30, c: 12, area: true, uses: 1, fx: 'st fear 2', d: 'Uma palavra que a mente não deveria ouvir.' },
  };
  const PERFIL = ['wa', 'wa2', 'hit', 'crit', 'ct', 'hits', 'area', 'pierce', 'mental', 'st', 'stc', 'stn', 'fx', 'mod', 'rq', 'el'];
  // monta uma arma a partir de um modelo: o = { lvl, cat, el, name, ...campos que sobrescrevem }
  function make(tid, o = {}) {
    const t = M[tid]; if (!t) return null;
    const lvl = NIVEIS[o.lvl] ? +o.lvl : 0, N = NIVEIS[lvl], cat = CATS[o.cat] ? o.cat : 'basica', el = o.el ?? t.el ?? '';
    const w = { name: o.name || (lvl ? `${t.n} (${N.n})` : t.n), type: 'arma', wt: t.wt, tpl: tid, lvl, cat, power: t.p + Math.round(N.p * (t.ct || 100) / 100 / (t.hits || 1) / (t.area ? 1.8 : 1)), // o nível sobe o dano por tempo por igual: multi-golpe e área dividem, arma lenta ganha mais por golpe
      price: Math.round(t.$ * N.$ * CATS[cat][2] / 5) * 5, el, d: t.d, atkN: '' };
    for (const k of PERFIL) if (t[k] != null && k !== 'el') w[k] = t[k];
    const up = Math.round(N.p * .6), sk = (cat === 'basica' ? t.sk.slice(0, 1) : t.sk.slice(0, 2)).map(s => ({ ...s, p: s.p ? s.p + up : s.p }));
    const per = v => Math.max(1, Math.round(v / (w.hits || 1))); // bônus de poder por golpe
    if (cat === 'lendaria') { w.power += per(3); w.crit = (w.crit || 0) + 5; sk.push({ ...ULT[t.wt], p: ULT[t.wt].p + up }); }
    if (cat === 'maldita') { w.power += per(5); w.crit = (w.crit || 0) + 5; w.fx = [w.fx, 'lose san 2 self'].filter(Boolean).join('; '); sk.forEach(s => { s.pay = { hp: 4 }; }); }
    if (cat === 'elemental' && el && !w.st && ELST[el]) Object.assign(w, { st: ELST[el][0], stc: 15, stn: ELST[el][1] + 1 });
    w.sk = sk.map(s => skill(s, w));
    const { name, lvl: _l, cat: _c, el: _e, ...rest } = o; Object.assign(w, rest);
    return w;
  }
  // técnica da arma: da notação compacta (ou de um rascunho do criador) para a skill que o motor usa
  function skill(s, w = {}) {
    const P = prof(w), kind = KINDS.includes(s.k ?? s.kind) ? (s.k ?? s.kind) : 'dmg', fxs = String(s.fxs ?? s.fx ?? '').trim(), fms = String(s.fms ?? s.fm ?? '').trim();
    const o = { name: String(s.n ?? s.name ?? 'Técnica').slice(0, 40), kind, attr: ATTRS.includes(s.a ?? s.attr) ? (s.a ?? s.attr) : P.wa, el: EL.includes(s.el) ? s.el : 'fis', power: num(s.p ?? s.power, 0, 99), cost: num(s.c ?? s.cost, 0, 99),
      res: s.res === 'san' ? 'san' : 'aura', st: '', xp: 0, limit: false, area: !!s.area, ct: num(s.ct ?? 100, 40, 200), pas: 'hpMax', req: '', back: '', ex: '', d: String(s.d ?? '').slice(0, 200), rq: null,
      hits: num(s.hits ?? 1, 1, 8), uses: num(s.uses ?? 0, 0, 9), fxs, fms };
    if (s.tg === 'self' || kind === 'form') o.tg = 'self';
    if (fxs) o.fx = RU().parseFx(fxs, o.name); // erro de notação sobe para quem chamou
    if (kind === 'form') o.form = RU().parseForm(fms || 'dur 3', o.name);
    const pay = num(s.pay?.hp ?? s.payHp ?? 0, 0, 30); if (pay) o.pay = { hp: pay };
    if (o.hits <= 1) delete o.hits; if (!o.uses) delete o.uses;
    return o;
  }
  const num = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v) || 0));
  // limpa um rascunho do criador (vindo do navegador): devolve a arma pronta e os erros encontrados
  function clean(d = {}) {
    const errs = [], s40 = (v, n = 40) => String(v ?? '').trim().slice(0, n), ST = RU().ST;
    const w = { name: s40(d.name) || 'Arma sem nome', type: 'arma', wt: TIPOS[d.wt] ? d.wt : 'lamina', cat: CATS[d.cat] ? d.cat : 'basica', lvl: num(d.lvl, 0, 3), tpl: M[d.tpl] ? d.tpl : '',
      power: num(d.power, 0, 99), price: num(d.price, 0, 99999), el: EL.includes(d.el) && d.el !== 'fis' ? d.el : '', wa: ATTRS.includes(d.wa) ? d.wa : '', wa2: ATTRS.includes(d.wa2) && d.wa2 !== d.wa ? d.wa2 : '',
      hit: num(d.hit, -50, 50), crit: num(d.crit, 0, 50), ct: num(d.ct || 100, 40, 200), hits: num(d.hits || 1, 1, 6), area: !!d.area, pierce: num(d.pierce, 0, 100), mental: !!d.mental,
      st: ST[d.st] ? d.st : '', stc: num(d.stc ?? 100, 0, 100), stn: num(d.stn || 3, 1, 6), fx: s40(d.fx, 160), mod: s40(d.mod, 80), rq: s40(d.rq, 40), atkN: s40(d.atkN, 30), d: s40(d.d, 200), sk: [] };
    try { RU().parseFx(w.fx, 'ataque'); } catch (e) { errs.push('Efeitos do ataque: ' + e.message); w.fx = ''; }
    const mk = kv(w.mod); if (mk.bad.length) { errs.push(`Bônus inválidos: ${mk.bad.join(', ')} (use ${MODK.join(', ')} ou um atributo)`); w.mod = Object.entries({ ...mk.m, ...mk.a }).map(([k, v]) => `${k} ${v}`).join('; '); }
    const rk = kv(w.rq); if (rk.bad.length || Object.keys(rk.m).length) { errs.push('Requisito: use atributos, por exemplo "FOR 50".'); w.rq = Object.entries(rk.a).map(([k, v]) => `${k} ${v}`).join('; '); }
    for (const s of (Array.isArray(d.sk) ? d.sk : []).slice(0, 4)) {
      try { w.sk.push(skill(s, w)); } catch (e) { errs.push(`Técnica "${s?.name || s?.n || '?'}": ${e.message}`); try { w.sk.push(skill({ ...s, fxs: '', fms: '' }, w)); } catch {} }
    }
    return { w, errs };
  }
  // texto curto dos traços de uma arma (cartões, ficha e menu de batalha)
  function traits(i) {
    const P = prof(i), R = RU(), o = [], A = P.wa2 ? `${P.wa}/${P.wa2}` : P.wa;
    o.push(`${A}`);
    if (P.ct !== 100) o.push(`tempo ${P.ct}%`);
    if (P.hits > 1) o.push(`${P.hits} golpes`);
    if (P.area) o.push('em área');
    if (P.mental) o.push('fere a Sanidade');
    if (P.hit) o.push(`${P.hit > 0 ? '+' : ''}${P.hit}% acerto`);
    if (P.crit) o.push(`+${P.crit}% crítico`);
    if (P.pierce) o.push(`ignora ${P.pierce}% da armadura`);
    if (P.st && P.stc) o.push(`${P.stc < 100 ? P.stc + '% de ' : ''}${R.ST[P.st] || P.st}`);
    const fx = fxOf(P.fx), cost = fx.filter(f => f.t === 'lose' && f.to === 'self'), rest = fx.filter(f => !cost.includes(f));
    if (rest.length) o.push(R.fxText(rest));
    for (const f of cost) o.push(`cada ataque custa ${f.p} de ${({ hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' })[f.r] || f.r}`);
    const m = Object.entries(P.mod.m).length ? R.modText(P.mod.m) : '', a = Object.entries(P.mod.a).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');
    if (m || a) o.push('empunhada: ' + [m, a].filter(Boolean).join(', '));
    const rq = Object.entries(P.rq).map(([k, v]) => `${k} ${v}`).join(', '); if (rq) o.push('pede ' + rq);
    return o;
  }
  g.ARMAS = { TIPOS, CATS, NIVEIS, ELST, MOD: M, ULT, FAIXA, ATTRS, MODK, prof, basicFx, short, kv, fxOf, score, rel, lvlOf, make, skill, clean, traits };
})(globalThis);

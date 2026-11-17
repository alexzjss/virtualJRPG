// Regras compartilhadas entre o servidor e o navegador: nomes de condições, votos, Despertares, afinidade de Aura,
// requisitos para aprender um nó e a descrição mecânica gerada a partir dos efeitos. Script comum (sem import/export):
// no navegador vira window.RULES; no servidor é importado só pelo efeito e lido em globalThis.RULES.
(g => {
  const DOT = ['burn', 'bleed', 'poison', 'rad'];
  const CTRL = ['stun', 'sleep', 'para', 'frozen', 'possess', 'confuse'];
  const ST = { possess: 'Possessão', curse: 'Maldição', frozen: 'Congelado', marked: 'Marcado', down: 'Derrubado', burn: 'Queimadura', bleed: 'Sangramento', poison: 'Veneno', rad: 'Radiação', stun: 'Atordoado', sleep: 'Sono', para: 'Paralisia', silence: 'Silêncio', atkUp: 'ATQ↑', atkDn: 'ATQ↓', defUp: 'DEF↑', defDn: 'DEF↓', agiUp: 'AGI↑', agiDn: 'AGI↓', fear: 'Medo', fury: 'Fúria', confuse: 'Confusão',
    shield: 'Escudo', wet: 'Molhado', oil: 'Oleado', broken: 'Quebrado', regen: 'Regeneração', taunt: 'Provocando', guarded: 'Protegido', counter: 'Contra-ataque', reflect: 'Reflexo', evade: 'Esquiva', stealth: 'Furtivo', focus: 'Foco', exposed: 'Exposto', exaus: 'Exausto', seal: 'Selo', blind: 'Cego', root: 'Enraizado', charge: 'Concentrando', form: 'Transformado', endure: 'Tenacidade', dread: 'Pavor', mark: 'Marca' };
  // o que cada condição nova faz (as antigas já são conhecidas na mesa)
  const STD = { shield: 'absorve dano antes do HP', regen: 'recupera HP no início do turno', taunt: 'inimigos só conseguem mirar nele', guarded: 'um guarda-costas recebe os golpes no lugar', counter: 'revida golpes corpo a corpo com um ataque', reflect: 'devolve 30% do dano recebido',
    wet: 'conduz raio e vento (reações elementais)', oil: 'queima e explode com fogo e raio', broken: 'perdeu o turno, sofre +50% de dano e não age até se recompor',
    evade: 'o próximo golpe erra', stealth: 'não pode ser alvo direto; o próximo ataque tem +25% e crítico dobrado', focus: '+15% de acerto e enxerga quem está Furtivo', exposed: 'armadura não conta', exaus: '−15% de acerto, −15% de dano e não pode se transformar', seal: 'explode quando acaba ou ao ser detonado',
    blind: '−25% de acerto', root: 'a Agilidade não ajuda a esquivar', charge: 'concentrando um golpe; dano forte ou controle interrompe', form: 'transformação ativa', endure: 'o próximo golpe fatal deixa com 1 HP', dread: 'perde Sanidade no início do turno e sofre +25% de dano mental', mark: 'Marca do Caçador desperta: +30% de dano, +20% de velocidade e +10% de crítico' };
  // cargas que se acumulam no próprio personagem durante a batalha (efeitos stack/burst): nome e bônus de dano por carga
  const STK = { doenca: ['Doença', 8], carga: ['Carga Elétrica', 6], brasa: ['Brasa', 6], mare: ['Maré', 6], rocha: ['Rocha', 6], vento: ['Vento', 6], luz: ['Luz', 6], sombra: ['Sombra', 6], sangue: ['Sangue', 6], mutacao: ['Mutação', 6], ressonancia: ['Ressonância', 6], impeto: ['Ímpeto', 6], pavor: ['Pavor', 6] };
  // reações: disparam sozinhas no turno do inimigo (1 por rodada, pagando o custo da técnica)
  const REA = { evade: 'esquiva', block: 'bloqueia', absorb: 'absorve', counter: 'revida' };
  const reaText = s => { const r = s.rea; return `reação automática (1×/rodada, paga o custo): ${r.t === 'evade' ? `${r.v}% de esquivar do golpe` : r.t === 'block' ? `bloqueia ${r.v}% do dano` : r.t === 'absorb' ? `absorve ${r.v}% do dano como Aura` : `revida com poder ${r.v}`}`; };
  const NEG = ['wet', 'oil', ...DOT, ...CTRL, 'curse', 'marked', 'down', 'silence', 'atkDn', 'defDn', 'agiDn', 'fear', 'fury', 'blind', 'root', 'exposed', 'exaus', 'dread', 'seal'];
  const POS = ['atkUp', 'defUp', 'agiUp', 'regen', 'counter', 'reflect', 'evade', 'stealth', 'focus', 'endure', 'taunt', 'mark'];
  // Aflições (Sanidade zerada e teste de SAB falho) e Virtudes (crítico): valem até o descanso longo
  const AFL = {
    paranoia: ['Paranoia', 'Desconfia de todos: −10% de acerto e −10% de defesa.', { hit: -10, def: -10 }],
    egoismo: ['Egoísmo', 'Só pensa em si: +10% de dano, mas as suas curas valem metade.', { atk: 10, heal: -50 }],
    desespero: ['Desespero', 'Perde as forças: −15% de dano e −10% de velocidade.', { atk: -15, agi: -10 }],
    masoquismo: ['Masoquismo', 'Procura a dor: +15% de dano e −20% de defesa.', { atk: 15, def: -20 }],
    abulia: ['Abulia', 'Nada importa: −10% de acerto e −20% de velocidade.', { hit: -10, agi: -20 }],
  };
  const VIR = {
    vigor: ['Vigor', 'O corpo responde: +20% de dano.', { atk: 20 }],
    foco: ['Foco', 'A mente clareia: +15% de acerto e +10% de crítico.', { hit: 15, crit: 10 }],
    resolucao: ['Resolução', 'Nada derruba: +20% de defesa.', { def: 20 }],
    inspiracao: ['Inspiração', 'Uma ideia que acende o grupo: +15% de velocidade e +20% de cura.', { agi: 15, heal: 20 }],
    bravura: ['Bravura', 'Coragem de sobra: +10% de dano e de defesa.', { atk: 10, def: 10 }],
  };
  // laços entre personagens: pontos → nível 0-5
  const BOND = [0, 2, 4, 7, 10, 14], bondLv = p => BOND.filter(v => p >= v).length - 1;
  // clima da batalha: a cena define o inicial e algumas skills trocam; reforça ou enfraquece elementos e mexe no acerto
  const CLIMA = {
    sol: ['Sol Forte', { kagutsuchi: 1.2, amaterasu: 1.2, susanoo: .85, tsukuyomi: .85 }],
    chuva: ['Chuva', { susanoo: 1.2, indra: 1.15, kagutsuchi: .8 }],
    neblina: ['Névoa', { tsukuyomi: 1.2, hit: -10 }],
    tempestade: ['Tempestade', { indra: 1.25, fuhaku: 1.15, hit: -5 }],
    eclipse: ['Eclipse', { tsukuyomi: 1.25, shukketsu: 1.15, amaterasu: .8 }],
  };
  // reações elementais: um golpe do elemento em alvo com a condição consome a condição, multiplica o dano e pode aplicar outra
  const REACT = [
    { n: 'Eletrocutar', el: ['indra'], on: ['wet'], m: 1.3, a: ['para', 2], d: 'raio em Molhado: ×1,3 e Paralisia' },
    { n: 'Explosão', el: ['kagutsuchi'], on: ['oil'], m: 1.5, a: ['burn', 3], d: 'fogo em Oleado: ×1,5 e Queimadura' },
    { n: 'Vapor', el: ['kagutsuchi'], on: ['wet'], m: .9, a: ['blind', 2], d: 'fogo em Molhado: Cego' },
    { n: 'Faíscas', el: ['indra'], on: ['oil'], m: 1.2, a: ['burn', 2], d: 'raio em Oleado: ×1,2 e Queimadura' },
    { n: 'Estilhaçar', el: ['atlas', 'fis'], on: ['frozen'], m: 1.6, d: 'impacto em Congelado: ×1,6' },
    { n: 'Vento Gélido', el: ['fuhaku'], on: ['wet'], m: 1.1, a: ['frozen', 1], d: 'vento em Molhado: Congelado' },
    { n: 'Lama', el: ['atlas'], on: ['wet'], m: 1, a: ['root', 2], d: 'terra em Molhado: Enraizado' },
    { n: 'Purgar', el: ['amaterasu'], on: ['poison', 'rad'], m: 1.4, d: 'luz em Veneno ou Radiação: ×1,4 e remove' },
  ];
  const RESN = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
  // votos e restrições (Seiyaku): nó passivo sempre ativo, com bônus e o preço cobrado pelo motor
  const VOW = {
    presa: ['Voto da Presa', 'O primeiro inimigo que você ferir na batalha vira a presa: +50% de dano nela, −25% nos outros.'],
    corpo: ['Voto do Corpo Fechado', '+30% de dano. Curar a si mesmo (skill ou item) rompe o voto até o fim da batalha e custa 20% da Sanidade máxima.'],
    pureza: ['Voto da Pureza', 'Skills do seu Vínculo causam +30%; ataque básico e skills marciais causam −40%.'],
    sangue: ['Voto de Sangue', '+40% de dano, mas toda skill custa também 8% do HP máximo.'],
    chama: ['Voto da Última Chama', '+60% de dano com HP até 40%; −15% acima disso.'],
    silencio: ['Voto do Silêncio', 'Não pode usar skills em área; skills de alvo único causam +35%.'],
    cacador: ['Voto do Caçador de Demônios', '+40% de dano contra demônios e chefes; −50% contra humanos.'],
    arma: ['Voto da Arma Única', 'Ataque básico e técnicas de arma causam +35%; outras skills ativas ficam proibidas.'],
    tempo: ['Voto do Tempo Contado', '+25% de dano e +15% de acerto, mas perde 4% do HP máximo no início de cada turno.'],
    preco: ['Voto do Preço', 'Rituais não gastam Aura; cada ritual custa +4 de Sanidade.'],
  };
  // Despertares: selos narrativos que só o mestre concede na ficha
  const AW = { outro: 'Tocado pelo Outro Lado', esp: 'Aura Singular', eremita: 'Comunhão Eremita', kagutsuchi: 'Despertar de Kagutsuchi', susanoo: 'Despertar de Susanoo', atlas: 'Despertar de Atlas', indra: 'Despertar de Indra', fuhaku: 'Despertar de Fuhaku', amaterasu: 'Despertar de Amaterasu', tsukuyomi: 'Despertar de Tsukuyomi', shukketsu: 'Despertar de Shukketsu', hiruko: 'Despertar de Hiruko' };
  // estados do personagem exigidos por alguns nós
  const CS = {
    duplo: ['ter dois Vínculos', ch => (ch.vinc || []).length >= 2],
    livre: ['não ter Vínculo', ch => !(ch.vinc || []).length],
    voto: ['ter um voto', (ch, sk) => ch.skills.some(k => sk[k]?.vow)],
    marcado: ['ter perdido 10+ de Sanidade máxima para o Outro Lado', ch => (ch.bon?.sanMax || 0) <= -10],
    laco: ['ter um laço de nível 3 ou mais com alguém', ch => (ch.bondMax || 0) >= 3],
    forma: ['conhecer uma transformação', (ch, sk) => ch.skills.some(k => sk[k]?.kind === 'form')],
  };
  // hexágono das categorias de Aura: vizinhas a 80%, a duas casas 60%, opostas 40% (e mais caras)
  const NEN = ['int', 'tra', 'con', 'esp', 'man', 'emi'], NENN = { int: 'Intensificação', tra: 'Transformação', con: 'Conjuração', esp: 'Especialização', man: 'Manipulação', emi: 'Emissão' };
  const nenD = (a, b) => { const d = Math.abs(NEN.indexOf(a) - NEN.indexOf(b)); return Math.min(d, 6 - d); };
  const nenEff = (ch, s) => !s.cat || !ch.nen ? 1 : [1, .8, .6, .4][nenD(ch.nen, s.cat)];
  const xpCost = (ch, s) => !s.cat || !ch.nen ? s.xp : Math.ceil(s.xp * [1, 1.25, 1.5, 2][nenD(ch.nen, s.cat)] / 5) * 5;
  const near = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy)) <= 1;
  // ligados: um está no ln do outro; skill solta (sem posição na mandala: criada, movida ou importada pelo mestre) também liga pela vizinhança de grade
  const loose = s => !Number.isFinite(s.wx);
  const linked = (a, b, ida, idb) => !!(a && b) && (!!a.ln?.includes(idb) || !!b.ln?.includes(ida) || ((loose(a) || loose(b)) && near(a, b)));
  const att = (ch, a, items) => ch.attrs[a] + (items && ch.equip?.acess && items[ch.equip.acess]?.attr === a ? items[ch.equip.acess].power : 0);
  // motivo pelo qual o personagem não pode aprender o nó agora ('' = pode). Inimigos não têm restrição.
  function whyNot(ch, s, sk, items, id, soft) { // soft: ignora XP e atributo mínimo (para pintar a grade)
    if (ch.enemy) return '';
    const own = ch.skills.map(k => sk[k]).filter(Boolean), byName = n => own.some(o => o.name === n), PN = g.RULES.PATRON;
    if (ch.skills.includes(id)) return 'Já aprendida.';
    if (!['fis', 'aura', 'oculto'].includes(s.el) && !(ch.vinc || []).includes(s.el)) return `Exige Vínculo com ${PN[s.el] || s.el}.`;
    if (s.el === 'oculto' && !(ch.aw || []).includes('outro')) return `Exige o Despertar "${AW.outro}" (dado pelo mestre).`;
    if (s.aw && !(ch.aw || []).includes(s.aw)) return `Exige o Despertar "${AW[s.aw] || s.aw}" (dado pelo mestre).`;
    if (s.cat === 'esp' && !(ch.aw || []).includes('esp') && ch.nen !== 'esp') return `Especialização exige o Despertar "${AW.esp}".`;
    if (s.v2 && !(ch.vinc || []).includes(s.v2)) return `Exige também o Vínculo com ${PN[s.v2] || s.v2}.`;
    if (s.ex && own.some(o => o.ex === s.ex && o !== s)) return 'Trancada: você escolheu o outro caminho.';
    if (own.length && !s.open && !ch.skills.some(k => linked(sk[k], s, k, id))) return 'Precisa de um nó vizinho já aprendido.';
    const pre = (s.pre || '').split('|').filter(Boolean).filter(n => !byName(n));
    if (pre.length) return `Precisa aprender antes: ${pre.join(', ')}.`;
    if (s.nb && own.filter(o => o.br === s.br).length < s.nb) return `Precisa de ${s.nb} nós deste ramo (tem ${own.filter(o => o.br === s.br).length}).`;
    if (s.cs && CS[s.cs] && !CS[s.cs][1](ch, sk)) return `Exige ${CS[s.cs][0]}.`;
    if (soft) return '';
    const rq = s.rq ? Object.entries(s.rq).filter(([a, v]) => att(ch, a, items) < v) : [];
    if (rq.length) return rq.map(([a, v]) => `Requer ${a} ${v} (você tem ${att(ch, a, items)}).`).join(' ');
    if (ch.xp < xpCost(ch, s)) return `Faltam ${xpCost(ch, s) - ch.xp} XP.`;
    return '';
  }
  // ----- notação compacta dos efeitos (a mesma de tree.js e arvore/*.js; também usada nas armas) -----
  // fx: 'st burn 3 60%; drain hp 30; shield 12 self' → lista de efeitos. Alvo opcional: self | ally | foes | tgt (padrão: o alvo da skill).
  // fm: 'dur 3; atk 25; def 10; agi 20; hit 10; crit 5; atkP 6; heal 20; dr aura 3; end st exaus 2' → transformação.
  const FXTO = new Set(['self', 'ally', 'foes', 'tgt']);
  const FXARGS = { st: ['k', 'n'], det: ['k', 'm'], drain: ['r', 'p'], res: ['r', 'p'], gain: ['r', 'p'], lose: ['r', 'p'], exec: ['p', 'm'], vs: ['k', 'm'], per: ['k', 'p'], rage: ['m'], pierce: ['p'], chain: ['n', 'm'], stack: ['k', 'n'], burst: ['k', 'm'],
    push: ['v'], haste: ['v'], seal: ['p', 'n'], shield: ['p'], revive: ['p'], spread: ['k'], guard: ['n'], clima: ['k', 'n'], brk: ['n'], scar: ['r', 'p'], clone: ['n', 'p'], sure: [], strip: [], steal: [], cleanse: [], turn: [] };
  const FXDEF = { stack: { n: 5 }, burst: { m: .25 }, st: { n: 3 }, det: { m: 6 }, pierce: { p: 100 }, chain: { m: .6 }, seal: { n: 3 }, guard: { n: 3 }, clone: { n: 1, p: 20 } };
  const FXTXT = new Set(['k', 'r']);
  function parseFx(str, where = '') {
    if (!str) return undefined;
    return String(str).split(';').map(x => x.trim()).filter(Boolean).map(item => {
      const w = item.split(/\s+/), t = w.shift(), keys = FXARGS[t];
      if (!keys) throw new Error(`efeito desconhecido "${item}" em ${where}`);
      const o = { t, ...FXDEF[t] }, pos = w.filter(x => !FXTO.has(x) && !x.endsWith('%'));
      keys.forEach((k, i) => { if (pos[i] == null) return; o[k] = FXTXT.has(k) ? pos[i] : +pos[i]; if (!FXTXT.has(k) && Number.isNaN(o[k])) throw new Error(`número inválido em "${item}" (${where})`); });
      if (keys.some(k => o[k] == null)) throw new Error(`faltam argumentos em "${item}" (${where})`);
      const ch = w.find(x => x.endsWith('%')), to = w.find(x => FXTO.has(x));
      if ((t === 'stack' || t === 'burst') && !STK[o.k]) throw new Error(`carga desconhecida "${o.k}" em ${where}`);
      if (t === 'st') { o.ch = ch ? parseInt(ch) : 100; if (!ST[o.k]) throw new Error(`condição desconhecida "${o.k}" em ${where}`); }
      if (to) o.to = to;
      return o;
    });
  }
  function parseForm(str, where = '') {
    const f = { dur: 3, m: {}, dr: {}, end: [] };
    for (const item of String(str).split(';').map(x => x.trim()).filter(Boolean)) {
      const [k, ...r] = item.split(/\s+/);
      if (k === 'end') f.end.push(...parseFx(r.join(' '), where));
      else if (k === 'dr') f.dr[r[0]] = +r[1];
      else if (k === 'dur') f.dur = +r[0];
      else if (k === 'ret') f.ret = +r[0];
      else if (['atk', 'def', 'agi', 'hit', 'crit', 'atkP', 'heal'].includes(k)) f.m[k] = +r[0];
      else throw new Error(`campo de forma desconhecido "${item}" em ${where}`);
    }
    return f;
  }
  // caminho inverso: efeitos lidos → texto na notação (o criador de armas copia técnicas da árvore assim)
  const fxSrc = l => (l || []).map(f => [f.t, ...FXARGS[f.t].map(k => f[k]), ...(f.t === 'st' && f.ch != null && f.ch < 100 ? [f.ch + '%'] : []), ...(f.to ? [f.to] : [])].join(' ')).join('; ');
  const formSrc = f => !f ? '' : [`dur ${f.dur}`, ...Object.entries(f.m || {}).map(([k, v]) => `${k} ${v}`), ...Object.entries(f.dr || {}).map(([k, v]) => `dr ${k} ${v}`), ...(f.ret ? [`ret ${f.ret}`] : []), ...(f.end || []).map(e => 'end ' + fxSrc([e]))].join('; ');
  // ----- descrição mecânica gerada dos campos da skill -----
  const TO = { self: 'em si', ally: 'nos aliados', foes: 'nos inimigos', tgt: '' };
  const pct = v => (v > 0 ? '+' : '') + v + '%';
  function fxOne(f) {
    const to = f.to && f.to !== 'tgt' ? ' ' + TO[f.to] : '';
    switch (f.t) {
      case 'st': return `${f.ch < 100 ? f.ch + '% de ' : ''}${ST[f.k] || f.k} ${f.n}t${to}`;
      case 'det': return `detona ${f.k === 'dot' ? 'todo dano contínuo' : f.k === 'neg' ? 'as condições ruins' : ST[f.k] || f.k} do alvo (+${f.m} por turno restante)`;
      case 'drain': return `rouba ${f.p}% do dano como ${RESN[f.r]}`;
      case 'exec': return `×${f.m} se o alvo tiver até ${f.p}% de HP`;
      case 'vs': return f.k === 'demon' ? `×${f.m} contra demônios` : `×${f.m} se o alvo tiver ${f.k === 'neg' ? 'condição ruim' : ST[f.k] || f.k}`;
      case 'per': return `${pct(f.p)} de dano por turno de ${ST[f.k] || f.k} no alvo`;
      case 'stack': return f.k === 'doenca' ? `acumula 1 estágio da Doença em você (máx. ${f.n}): +8% de dano por estágio e, do 3º em diante, o corpo definha a cada turno` : `acumula 1 ${STK[f.k][0]} em você (máx. ${f.n}): +${STK[f.k][1]}% de dano por carga nas técnicas que a usam`;
      case 'burst': return `consome todas as cargas de ${STK[f.k][0]}: ×(1 + ${f.m} por carga)`;
      case 'rage': return `dano cresce com o HP que falta (até ×${1 + f.m})`;
      case 'pierce': return `ignora ${f.p}% da armadura`;
      case 'sure': return 'não pode ser esquivado';
      case 'chain': return `ricocheteia em mais ${f.n} (×${f.m} a cada salto)`;
      case 'strip': return `remove os bônus${to || ' do alvo'}`;
      case 'steal': return 'rouba os bônus do alvo para si';
      case 'push': return `atrasa o próximo turno do alvo em ${f.v}%`;
      case 'haste': return `adianta o próximo turno${to || ' do alvo'} em ${f.v}%`;
      case 'seal': return `planta um selo de ${f.p} que explode em ${f.n} turnos`;
      case 'shield': return `escudo de ${f.p}${to}`;
      case 'cleanse': return `purifica as condições ruins${to}`;
      case 'revive': return `reergue um caído com ${f.p}% do HP`;
      case 'res': return `restaura ${f.p} de ${RESN[f.r]}${to}`;
      case 'gain': return `você recupera ${f.p} de ${RESN[f.r]}`;
      case 'lose': return `o alvo perde ${f.p} de ${RESN[f.r]}`;
      case 'spread': return `espalha ${ST[f.k] || f.k} do alvo para os aliados dele`;
      case 'guard': return `protege o alvo por ${f.n}t (recebe os golpes dele)`;
      case 'turn': return 'você age de novo';
      case 'clima': return `muda o clima para ${CLIMA[f.k]?.[0] || f.k} por ${f.n} rodadas`;
      case 'brk': return `abala a barra de Quebra do alvo em ${f.n}`;
      case 'scar': return `cicatriz: −${f.p}% de ${RESN[f.r]} máx.${to} até o descanso longo`;
      case 'clone': return `cria ${f.n} clone${f.n > 1 ? 's' : ''} (cada um leva ${f.p}% do seu HP atual e causa metade do dano)`;
      default: return f.t;
    }
  }
  const fxText = l => (l || []).map(fxOne).join(' · ');
  const FM = { atk: 'dano', def: 'redução de dano', agi: 'velocidade', hit: 'acerto', crit: 'crítico', bf: 'chance de Black Flash', atkP: 'poder do ataque básico', heal: 'cura' };
  const modText = m => Object.entries(m || {}).map(([k, v]) => k === 'atkP' ? `+${v} ${FM[k]}` : `${pct(v)} ${FM[k] || k}`).join(', ');
  const formText = f => `por ${f.dur} turnos: ${modText(f.m)}${Object.keys(f.dr || {}).length ? ' · drena ' + Object.entries(f.dr).map(([r, v]) => `${v}${r === 'hp' ? '% ' : ' '}${RESN[r]}`).join(' e ') + ' por turno' : ''}${f.ret ? ` · quem erra você perde ${f.ret}% do tempo` : ''}${f.end?.length ? ' · ao acabar: ' + fxText(f.end).replace(/o alvo perde/g, 'perde') : ''}`;
  const ON = { start: 'No início da batalha', turn: 'No início do seu turno', low: 'Ao cair para 30% de HP (1× por batalha)', kill: 'Ao derrubar um inimigo', crit: 'Ao acertar um crítico', weak: 'Ao acertar uma fraqueza', hurt: 'Ao ser ferido', fall: 'Ao receber um golpe fatal (1× por batalha)', heal: 'Ao curar alguém', miss: 'Ao errar', ally: 'Quando um aliado cai' };
  const SCN = { atk: 'no ataque básico', mental: 'em dano mental', heal: 'em curas', area: 'em área', req: 'nas técnicas de arma', form: 'transformado', circ: 'em rituais' };
  // linhas extras da descrição (o resto — poder, custo, elemento — a interface já mostra)
  function extra(s, sk) {
    const o = [];
    if (s.wpn) o.push('técnica da arma equipada');
    if (s.uses) o.push(`${s.uses} uso${s.uses > 1 ? 's' : ''} por batalha`);
    if (s.hits > 1) o.push(`${s.hits} golpes`);
    if (s.chg) o.push(`concentra ${s.chg} turno${s.chg > 1 ? 's' : ''} antes de soltar`);
    if (s.tg === 'self') o.push('em si mesmo');
    if (s.nf) o.push('só transformado');
    if (s.circ) o.push(`Ritual de ${s.circ}º círculo`);
    if (s.pay) o.push('custa também ' + Object.entries(s.pay).map(([r, v]) => `${v}${r === 'hp' ? '% do' : ''} ${RESN[r]}`).join(' e '));
    if (s.kind === 'form' && s.form) o.push(formText(s.form));
    if (s.fx?.length && s.kind !== 'passive') o.push((s.kind === 'form' ? 'ao assumir: ' : '') + fxText(s.fx));
    if (s.summon) o.push(`invoca ${s.summon}`);
    if (s.rea) o.push(reaText(s));
    if (s.bf) o.push(`Black Flash: 01-${s.bf} no d100 (+bônus de Black Flash) vira ×2,5 e devolve 25% da Aura`);
    if (s.par) o.push(`Aparar: no turno do inimigo aparece o botão; aperte nos últimos ${s.par} ms. Só golpe de alvo único e não mental; custa ${s.cost ?? s.c ?? 0} de Aura por tentativa, 1×/rodada. Certo: anula o golpe, +${s.power || 0} Aura, +10 de Limite e abala a Quebra do atacante. Fora do tempo: +50% de dano e Exposto`);
    if (s.combo) o.push(`combo: ×${s.cm || 1.4} logo depois de ${s.combo.split('|').join(' ou ')}`);
    if (s.trio) o.push(`técnica em trio: dois aliados com "${s.trio.join('" e "')}" gastam o próximo turno junto`);
    if (s.dom) o.push(`Expansão de Domínio por ${s.dom.dur} turnos (gasta toda a Aura, exige metade dela; Exausto ao fim): aliados ${modText(s.dom.ally) || '—'} · inimigos ${modText(s.dom.foe) || '—'}${s.dom.tick ? ' · inimigos ganham ' + (ST[s.dom.tick] || s.dom.tick) + ' a cada turno' : ''}`);
    if (s.duo) o.push(`técnica em dupla: um aliado com "${s.duo}" gasta o próximo turno junto`);
    if (s.vow) o.push(`${VOW[s.vow][0]}: ${VOW[s.vow][1]}`);
    if (s.on) o.push(`${ON[s.on]}${s.ch && s.ch < 100 ? ` (${s.ch}%)` : ''}: ${fxText(s.fx)}`);
    if (s.mod) o.push(modText(s.mod) + (s.sc ? ' ' + (SCN[s.sc] || (String(s.sc).startsWith('wt:') ? 'com ' + (g.ARMAS?.TIPOS[s.sc.slice(3)]?.n || s.sc.slice(3)).toLowerCase() + ' (básico e técnicas)' : 'com ' + (g.RULES.PATRON[s.sc] || s.sc))) : ''));
    if (s.bon) o.push(Object.entries(s.bon).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${({ hpMax: 'HP máx', auraMax: 'Aura máx', sanMax: 'Sanidade máx' })[k] || k}`).join(', '));
    if (s.amp) o.push(`amplia "${s.amp}": ${[s.up?.p && `+${s.up.p} poder`, s.up?.c && `+${s.up.c} custo`, s.up?.san && `+${s.up.san} Sanidade`, s.up?.area && 'passa a ser em área', s.up?.hits && `${s.up.hits} golpes`, s.up?.fx && fxText(s.up.fx)].filter(Boolean).join(', ')}`);
    if (s.cat) o.push(`Aura · ${NENN[s.cat]}`);
    return o.join(' · ');
  }
  // ----- comandos de ação (Aparar, Esquiva e minigames de ataque): regras puras usadas pelo servidor e pela tela -----
  const CMD = {
    KINDS: ['tempo', 'martelar', 'segurar', 'seq', 'ritmo', 'mira', 'runa', 'choque'],
    RUNES: ['circulo', 'triangulo', 'raio', 'espiral', 'estrela', 'onda'],
    DEF: { beat: 1100, esq: 450, grace: 200, gap: 700 },
    // zona do aperto na janela de defesa; left = ms até o impacto (negativo = depois dele)
    gradeDef(left, par, esq, canParry) {
      if (left < -CMD.DEF.grace) return 'late';
      if (left <= par) return canParry ? 'par' : esq > 0 ? 'esq' : 'late';
      return esq > 0 && left <= par + esq ? 'esq' : 'cedo';
    },
  };
  g.RULES = { CMD, STK, REA, reaText, parseFx, parseForm, fxSrc, formSrc, AFL, VIR, BOND, bondLv, CLIMA, REACT, DOT, CTRL, ST, STD, NEG, POS, VOW, AW, CS, NEN, NENN, nenD, nenEff, xpCost, whyNot, fxText, formText, modText, extra, near, linked, ON, PATRON: { fis: 'Marcial', kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', hiruko: 'Hiruko', aura: 'Aura', oculto: 'Ocultismo' } };
})(globalThis);

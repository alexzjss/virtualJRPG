// Regras compartilhadas entre o servidor e o navegador: nomes de condições, votos, Despertares, afinidade de Aura,
// requisitos para aprender um nó e a descrição mecânica gerada a partir dos efeitos. Script comum (sem import/export):
// no navegador vira window.RULES; no servidor é importado só pelo efeito e lido em globalThis.RULES.
(g => {
  const DOT = ['burn', 'bleed', 'poison', 'rad'];
  const CTRL = ['stun', 'sleep', 'para', 'frozen', 'possess', 'confuse'];
  const ST = { possess: 'Possessão', curse: 'Maldição', frozen: 'Congelado', marked: 'Marcado', down: 'Derrubado', burn: 'Queimadura', bleed: 'Sangramento', poison: 'Veneno', rad: 'Radiação', stun: 'Atordoado', sleep: 'Sono', para: 'Paralisia', silence: 'Silêncio', atkUp: 'ATQ↑', atkDn: 'ATQ↓', defUp: 'DEF↑', defDn: 'DEF↓', agiUp: 'AGI↑', agiDn: 'AGI↓', fear: 'Medo', fury: 'Fúria', confuse: 'Confusão',
    shield: 'Escudo', regen: 'Regeneração', taunt: 'Provocando', guarded: 'Protegido', counter: 'Contra-ataque', reflect: 'Reflexo', evade: 'Esquiva', stealth: 'Furtivo', focus: 'Foco', exposed: 'Exposto', exaus: 'Exausto', seal: 'Selo', blind: 'Cego', root: 'Enraizado', charge: 'Concentrando', form: 'Transformado', endure: 'Tenacidade', dread: 'Pavor' };
  // o que cada condição nova faz (as antigas já são conhecidas na mesa)
  const STD = { shield: 'absorve dano antes do HP', regen: 'recupera HP no início do turno', taunt: 'inimigos só conseguem mirar nele', guarded: 'um guarda-costas recebe os golpes no lugar', counter: 'revida golpes corpo a corpo com um ataque', reflect: 'devolve 30% do dano recebido',
    evade: 'o próximo golpe erra', stealth: 'não pode ser alvo direto; o próximo ataque tem +25% e crítico dobrado', focus: '+15% de acerto e enxerga quem está Furtivo', exposed: 'armadura não conta', exaus: '−15% de acerto, −15% de dano e não pode se transformar', seal: 'explode quando acaba ou ao ser detonado',
    blind: '−25% de acerto', root: 'a Agilidade não ajuda a esquivar', charge: 'concentrando um golpe; dano forte ou controle interrompe', form: 'transformação ativa', endure: 'o próximo golpe fatal deixa com 1 HP', dread: 'perde Sanidade no início do turno e sofre +25% de dano mental' };
  const NEG = [...DOT, ...CTRL, 'curse', 'marked', 'down', 'silence', 'atkDn', 'defDn', 'agiDn', 'fear', 'fury', 'blind', 'root', 'exposed', 'exaus', 'dread', 'seal'];
  const POS = ['atkUp', 'defUp', 'agiUp', 'regen', 'counter', 'reflect', 'evade', 'stealth', 'focus', 'endure', 'taunt'];
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
    forma: ['conhecer uma transformação', (ch, sk) => ch.skills.some(k => sk[k]?.kind === 'form')],
  };
  // hexágono das categorias de Aura: vizinhas a 80%, a duas casas 60%, opostas 40% (e mais caras)
  const NEN = ['int', 'tra', 'con', 'esp', 'man', 'emi'], NENN = { int: 'Intensificação', tra: 'Transformação', con: 'Conjuração', esp: 'Especialização', man: 'Manipulação', emi: 'Emissão' };
  const nenD = (a, b) => { const d = Math.abs(NEN.indexOf(a) - NEN.indexOf(b)); return Math.min(d, 6 - d); };
  const nenEff = (ch, s) => !s.cat || !ch.nen ? 1 : [1, .8, .6, .4][nenD(ch.nen, s.cat)];
  const xpCost = (ch, s) => !s.cat || !ch.nen ? s.xp : Math.ceil(s.xp * [1, 1.25, 1.5, 2][nenD(ch.nen, s.cat)] / 5) * 5;
  const near = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy)) <= 1;
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
    if (s.ex && own.some(o => o.ex === s.ex && o !== s)) return 'Trancada: você escolheu o outro caminho.';
    if (own.length && !own.some(o => near(o, s))) return 'Precisa de um nó vizinho já aprendido.';
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
      default: return f.t;
    }
  }
  const fxText = l => (l || []).map(fxOne).join(' · ');
  const FM = { atk: 'dano', def: 'redução de dano', agi: 'velocidade', hit: 'acerto', crit: 'crítico', atkP: 'poder do ataque básico', heal: 'cura' };
  const modText = m => Object.entries(m || {}).map(([k, v]) => k === 'atkP' ? `+${v} ${FM[k]}` : `${pct(v)} ${FM[k] || k}`).join(', ');
  const formText = f => `por ${f.dur} turnos: ${modText(f.m)}${Object.keys(f.dr || {}).length ? ' · drena ' + Object.entries(f.dr).map(([r, v]) => `${v}${r === 'hp' ? '% ' : ' '}${RESN[r]}`).join(' e ') + ' por turno' : ''}${f.end?.length ? ' · ao acabar: ' + fxText(f.end).replace(/o alvo perde/g, 'perde') : ''}`;
  const ON = { start: 'No início da batalha', turn: 'No início do seu turno', low: 'Ao cair para 30% de HP (1× por batalha)', kill: 'Ao derrubar um inimigo', crit: 'Ao acertar um crítico', weak: 'Ao acertar uma fraqueza', hurt: 'Ao ser ferido', fall: 'Ao receber um golpe fatal (1× por batalha)', heal: 'Ao curar alguém', miss: 'Ao errar', ally: 'Quando um aliado cai' };
  const SCN = { atk: 'no ataque básico', mental: 'em dano mental', heal: 'em curas', area: 'em área', req: 'nas técnicas de arma', form: 'transformado', circ: 'em rituais' };
  // linhas extras da descrição (o resto — poder, custo, elemento — a interface já mostra)
  function extra(s, sk) {
    const o = [];
    if (s.hits > 1) o.push(`${s.hits} golpes`);
    if (s.chg) o.push(`concentra ${s.chg} turno${s.chg > 1 ? 's' : ''} antes de soltar`);
    if (s.tg === 'self') o.push('em si mesmo');
    if (s.nf) o.push('só transformado');
    if (s.circ) o.push(`Ritual de ${s.circ}º círculo`);
    if (s.pay) o.push('custa também ' + Object.entries(s.pay).map(([r, v]) => `${v}${r === 'hp' ? '% do' : ''} ${RESN[r]}`).join(' e '));
    if (s.kind === 'form' && s.form) o.push(formText(s.form));
    if (s.fx?.length && s.kind !== 'passive') o.push((s.kind === 'form' ? 'ao assumir: ' : '') + fxText(s.fx));
    if (s.summon) o.push(`invoca ${s.summon}`);
    if (s.duo) o.push(`técnica em dupla: um aliado com "${s.duo}" gasta o próximo turno junto`);
    if (s.vow) o.push(`${VOW[s.vow][0]}: ${VOW[s.vow][1]}`);
    if (s.on) o.push(`${ON[s.on]}${s.ch && s.ch < 100 ? ` (${s.ch}%)` : ''}: ${fxText(s.fx)}`);
    if (s.mod) o.push(modText(s.mod) + (s.sc ? ' ' + (SCN[s.sc] || 'com ' + (g.RULES.PATRON[s.sc] || s.sc)) : ''));
    if (s.bon) o.push(Object.entries(s.bon).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${({ hpMax: 'HP máx', auraMax: 'Aura máx', sanMax: 'Sanidade máx' })[k] || k}`).join(', '));
    if (s.amp) o.push(`amplia "${s.amp}": ${[s.up?.p && `+${s.up.p} poder`, s.up?.c && `+${s.up.c} custo`, s.up?.san && `+${s.up.san} Sanidade`, s.up?.area && 'passa a ser em área', s.up?.hits && `${s.up.hits} golpes`, s.up?.fx && fxText(s.up.fx)].filter(Boolean).join(', ')}`);
    if (s.cat) o.push(`Aura · ${NENN[s.cat]}`);
    return o.join(' · ');
  }
  g.RULES = { DOT, CTRL, ST, STD, NEG, POS, VOW, AW, CS, NEN, NENN, nenD, nenEff, xpCost, whyNot, fxText, formText, modText, extra, near, ON, PATRON: { fis: 'Marcial', kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', hiruko: 'Hiruko', aura: 'Aura', oculto: 'Ocultismo' } };
})(globalThis);

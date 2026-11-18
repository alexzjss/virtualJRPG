// ===== HUD da batalha no PC (jogador e mesa): ordem, topo direito, grupo e dicas por cima do palco 3D =====
// Desenhado para 1440×860 e escalado pelo --hk (palco3d.js mede o retângulo do palco). Tudo aqui é HTML dentro de #app (redesenhado a cada estado).
// O leque de comandos (pinceladas) mora em leque.js; as dicas de baixo mostram o que o teclado faz agora.
let navOpen = false; // menu ☰ aberto (páginas do jogador, escondidas na barra de cima durante a batalha)
const HUD = (() => {
  const photo = (c, k) => `<img src="${esc(PALCO3D.imgSrc(c, k).url)}" alt="" draggable="false">`;
  const pct = (a, b) => Math.round(Math.max(0, Math.min(100, 100 * a / (b || 1))));
  const hint = (k, label, attrs = '', cls = '') => `<div class="hk ${cls}" ${attrs}>${k === '' ? '' : `<span class="key">${k}</span>`}${label}</div>`;
  let hlO = null; // retrato/recorte destacado pelo mouse (o #app é redesenhado, o recorte não)
  // prévia ao vivo: onde o herói da vez volta na fila com a ação destacada (retrato fantasma "VOCÊ" e linha de motivo)
  const ordem = (tl) => { const pv = LEQUE.timeCost(), sl = pv && PALCO3D.previewSlot(S.battle.ticks, pv.actor.id, pv.cost, tl), gAt = sl ? Math.min(sl.pos + 1, tl.length) : -1;
    const ghost = sl ? `<div class="ot ghost ${pv.actor.enemy ? 'foe' : 'hero'}" aria-hidden="true">${photo(pv.actor, 'p')}<b>VOCÊ</b></div>` : '';
    const rows = tl.map((id, i) => { const c = S.chars[id];
      return `${i === gAt ? ghost : ''}<div class="ot ${c.enemy ? 'foe' : 'hero'} ${i ? '' : 'now'} ${id === hlO ? 'hl' : ''}" data-o="${id}" title="${esc(c.name)}">${photo(c, 'p')}</div>`; }).join('') + (gAt >= tl.length ? ghost : '');
    return `<div class="hud-order" aria-label="Ordem dos turnos">${rows}${sl ? `<div class="ot-why">◆ ${esc(pv.name)}: ${sl.approx ? '≈' : 'você volta em'} ${sl.pos + 1}º</div>` : ''}</div>`; };
  // passar o mouse num retrato acende o recorte no palco e vice-versa (classe hl)
  const hl = id => { hlO = id; document.querySelectorAll('.ot.hl,.bb.hl').forEach(e => e.classList.remove('hl')); if (!id) return; document.querySelectorAll(`.ot[data-o="${id}"],.bb[data-tgt="${id}"]`).forEach(e => e.classList.add('hl')); };
  document.addEventListener('mouseover', e => { const u = e.target.closest?.('.ot[data-o],.bb[data-tgt]'); hl(u ? u.dataset.o || u.dataset.tgt : null); });
  const topo = (o) => { const lines = S.log.filter(l => !l.to).slice(-3);
    const icons = o.table ? '' : `<div class="icons"><button type="button" class="ib" data-a="navT" aria-label="Menu" aria-expanded="${navOpen}">☰</button><button type="button" class="ib ${chatOpen ? 'on' : ''}" data-a="chatT" aria-label="Chat" aria-pressed="${chatOpen}">${ico('chat')}${o.unread ? `<i class="n">${o.unread > 9 ? '9+' : o.unread}</i>` : ''}</button></div>`;
    const menu = navOpen && !o.table ? `<nav class="hud-menu" aria-label="Páginas">${chips(PAGES, (k, l) => `<button type="button" data-pg="${k}" class="${pg === k ? 'on' : ''}">${ico(k)}<span>${k === 'mesa' ? 'Batalha' : l}</span></button>`)}</nav>` : '';
    return `<div class="hud-tr">${icons}${menu}${fieldBar()}<div class="hlog" aria-live="polite">${lines.map(l => `<div><b>${esc(l.who)}</b> ${esc(l.text)}</div>`).join('')}</div></div>`; };
  const grupo = (inB, cur) => `<div class="hud-party" aria-label="Grupo">${inB.filter(c => !c.enemy).map(c => {
    const hp = pct(c.hp, c.hpMax), au = Math.round(10 * Math.max(0, c.aura) / (c.auraMax || 1)), form = c.st.form && c.form && SK(c.form);
    return `<div class="pm ${c === cur ? 'now' : ''} ${c.id === tgt ? 'tg' : ''} ${c.hp > 0 ? '' : 'ko'}" data-tgt="${c.id}" style="--c:${esc(c.color)}" title="${esc(c.name)}">
      <i class="ink"></i><div class="por">${photo(c, 'p')}</div>
      <div class="hlim ${c.limit >= 100 ? 'full' : ''}" title="Limite ${c.limit}%"><i style="height:${pct(c.limit, 100)}%"></i></div>
      <div class="pst">${c.hp > 0 ? stIcons(c) : `<i class="dead">${c.dead ? 'Morto' : 'Caído' + (c.dying ? ' · ' + c.dying : '')}</i>`}${c.st.defUp ? '<span>Defendendo</span>' : ''}${form ? `<span>Forma: ${esc(form.name)}</span>` : ''}</div>
      <div class="in"><b class="pnm">${esc(c.name)}</b><div class="hpn2"><b>${c.hp}</b><small>/${c.hpMax}</small><em>HP</em></div>
        <div class="hpbar"><i data-bid="${c.id}:hp" data-p="${hp}" style="width:${hp}%"></i></div>
        <div class="au" title="Aura ${c.aura}/${c.auraMax}"><span class="dia2"><b>${c.aura}</b></span><span class="segs">${Array.from({ length: 10 }, (_, i) => `<i class="${i < au ? 'f' : ''}"></i>`).join('')}</span></div>
        <div class="sanr" title="Sanidade ${c.san}/${c.sanMax}"><small>SAN ${c.san}</small><div class="sanl"><i style="width:${pct(c.san, c.sanMax)}%"></i></div></div></div></div>`; }).join('')}</div>`;
  const dicas = (o, inB, cur) => {
    const a = S.chars[o.actorId]; if (o.table || !a) return '';
    const [rqId, rq] = myReq() || [], wait = rq && rq.ch === a.id, my = cur === a, mode = LEQUE.state.mode, brv = a.brv || 0;
    if (wait) return `<div class="hud-bl"><div class="pend">Aguardando o mestre · ${esc(rq.text)}</div>${hint('Esc', 'Cancelar', `data-a="reqNo" data-id="${rqId}"`)}</div>`;
    if (!my) return `<div class="hud-bl">${hint('', `Vez de ${esc(cur?.name || '—')}`, '', 'off')}</div>`;
    const foes = inB.filter(x => x.enemy && x.hp > 0), downAll = foes.length > 0 && foes.every(x => x.st.down || x.st.broken);
    return `<div class="hud-bl">${hint(4, `Defender${brv > 0 ? ' · ' + a.brv : ''}`, `data-a="defend" data-id="${a.id}" title="Defende (−25% de dano) e guarda 1 ponto de Coragem (máx. 3)"`)}`
      + hint(5, `Concentrar${a.ten ? ' ×' + [1, 1.5, 2, 3][a.ten] : ''}`, `data-a="focus" data-id="${a.id}" title="Gasta o turno acumulando: o próximo golpe causa ×1,5 / ×2 / ×3"`)
      + hint(6, `Coragem ${brv}`, brv > -2 ? `data-a="braveT" data-id="${a.id}" aria-pressed="${braveOn}" title="Gasta 1 ponto de Coragem para agir de novo; sem pontos, fica devendo tempo"` : '', `${braveOn ? 'on' : ''} ${brv < 0 ? 'debt' : ''} ${brv > -2 ? '' : 'off'}`)
      + (downAll ? hint(8, 'Ataque Total', `data-a="allOut" data-id="${a.id}" title="Todo inimigo Derrubado ou Quebrado: o grupo inteiro ataca"`, 'allout') : '')
      + hint(7, 'Passar', `data-a="next" data-id="${a.id}" title="Passa a vez gastando metade do tempo"`)
      + (mode !== 'menu' ? hint('Esc', 'Voltar', 'data-lq="back"') : '') + '</div>'; };
  // ficha do inimigo: HP (em % para o jogador, números para o mestre), escudo da Quebra, fraquezas só do que foi descoberto e condições; full (zoom) acrescenta golpes e o efeito da Quebra
  const MAIN5 = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku'];
  const sheet = (id, { full = false, preview = '' } = {}) => {
    const c = S.chars[id]; if (!c || !c.enemy) return '';
    const weak = c.weak || [], res = c.resist || [], els = [...MAIN5, ...new Set([...weak, ...res].filter(e => !MAIN5.includes(e)))];
    const wk = els.map(e => { const k = weak.includes(e) ? 'w' : res.includes(e) ? 'r' : !gm && (c.known || 0) < 2 && MAIN5.includes(e) ? 'q' : '', nm = EL[e] || e;
      return `<span class="${k}" title="${esc(nm + (k === 'w' ? ': fraqueza' : k === 'r' ? ': resiste' : k === 'q' ? ': não testado' : ''))}">${k === 'q' ? '?' : esc((typeof KANJI !== 'undefined' && KANJI[e]) || e.slice(0, 1).toUpperCase())}</span>`; }).join('');
    const st = c.hp > 0 ? stIcons(c) : '', golpes = (c.telK || []).map(k => SK(k)?.name).filter(Boolean);
    return `<div class="sheet ${full ? 'full' : ''}"><h5>${esc(c.name)}<small>${c.boss ? 'Chefe' : 'Inimigo'}</small></h5>
      <div class="row"><span>HP ${gm ? `${c.hp}/${c.hpMax}` : pct(c.hp, c.hpMax) + '%'}</span><span class="esc">ESCUDO ${c.brk ? c.brk.cur : 0}</span></div>
      <div class="hpbar"><i style="width:${pct(c.hp, c.hpMax)}%"></i></div>
      <div class="row">FRAQUEZAS <div class="wk">${wk}</div></div>${st ? `<div class="row">CONDIÇÕES <div class="cond">${st}</div></div>` : ''}
      ${full ? `<div class="more">${gm ? `<p>Golpes conhecidos: ${golpes.length ? esc(golpes.join(', ')) : 'nenhum'}.</p>` : ''}${c.brk ? '<p>Quebra: perde 2 turnos e sofre +50% de dano.</p>' : ''}</div>` : ''}${preview ? `<div class="pv">${esc(preview)}</div>` : ''}</div>`;
  };
  // inimigo em destaque: o do zoom ou o da mira
  const alvoId = () => { const id = PALCO3D.local.zoom || LEQUE.aimTarget(), c = id && S.chars[id]; return c && c.enemy && c.hp > 0 && id in S.battle.ticks ? id : null; };
  let pos = { id: '', l: 0, t: 0 }; // última posição da ficha (o desenho refaz o HTML a cada estado: sem isso ela piscaria)
  const alvo = () => { const id = alvoId(); if (!id) return ''; const c = S.chars[id], zoom = !!PALCO3D.local.zoom, hp = pct(c.hp, c.hpMax), ok = pos.id === id;
    return `<div class="hud-top" aria-label="Alvo"><div class="hpbar"><i style="width:${hp}%"></i></div><h4><span class="sh2" title="Escudo (Quebra)">◆${c.brk ? c.brk.cur : 0}</span>${esc(c.name)}</h4></div>`
      + `<div class="hud-sheet" data-sid="${id}" style="${ok ? `left:${pos.l}px;top:${pos.t}px` : 'opacity:0'}">${sheet(id, { full: zoom, preview: LEQUE.preview(c) })}</div>`; };
  return {
    sheet,
    // mestre: só a barra do topo e a ficha do alvo (o leque dele vem separado)
    gm() { const a = alvo(); return a ? `<div class="hudw table">${a}</div>` : ''; },
    // coloca a ficha ao lado do recorte (à direita; à esquerda se não couber; presa entre top 110 e 560); a câmera leva ~1,1 s, então é chamada de novo depois
    place() {
      const w = app.querySelector('.hud-sheet'), h = w?.closest('.hudw'), r = w && PALCO3D.rectOf(w.dataset.sid); if (!r) return;
      const hr = h.getBoundingClientRect(), hk = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hk')) || .85, W = 270 * hk;
      let l = r.right - hr.left + 20 * hk; if (l + W + 10 > hr.width) l = r.left - hr.left - 20 * hk - W;
      l = Math.round(Math.max(10, l)); const t = Math.round(Math.max(110 * hk, Math.min(560 * hk, r.top - hr.top + r.height * .15)));
      Object.assign(w.style, { left: l + 'px', top: t + 'px', opacity: '' }); pos = { id: w.dataset.sid, l, t };
    },
    // actorId: herói do jogador que está no leque (a vez dele ou o que o jogador escolheu); dim: não é a vez dele; unread: mensagens novas do chat; table: versão da mesa (sem ícones nem dicas)
    html({ actorId = null, dim = false, unread = 0, table = false } = {}) {
      const inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks), cur = S.chars[timeline(1)[0]], o = { actorId, unread, table };
      return `<div class="hudw ${dim ? 'dim' : ''} ${table ? 'table' : ''}">${ordem(timeline(8))}${topo(o)}${grupo(inB, cur)}${dicas(o, inB, cur)}${alvo()}</div>`;
    },
  };
})();

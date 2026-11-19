// ===== HUD da batalha no PC (jogador e mesa): ordem, topo direito, grupo e dicas por cima do palco 3D =====
// Desenhado para 1440×860 e escalado pelo --hk (palco3d.js mede o retângulo do palco). Tudo aqui é HTML dentro de #app (redesenhado a cada estado).
// O leque de comandos (pinceladas) mora em leque.js; as dicas de baixo mostram o que o teclado faz agora.
let navOpen = false; // menu ☰ aberto (páginas do jogador, escondidas na barra de cima durante a batalha)
const HUD = (() => {
  const photo = (c, k) => { const s = PALCO3D.imgSrc(c, k), t = PALCO3D.imgFit(c, k, s); return `<img src="${esc(s.url)}" alt="" draggable="false"${t ? ` style="transform:${esc(t)}"` : ''}>`; };
  const pct = (a, b) => Math.round(Math.max(0, Math.min(100, 100 * a / (b || 1))));
  const hint = (k, label, attrs = '', cls = '') => `<div class="hk ${cls}" ${attrs}>${k === '' ? '' : `<span class="key">${k}</span>`}${label}</div>`;
  let hlO = null; // retrato/recorte destacado pelo mouse (o #app é redesenhado, o recorte não)
  // prévia ao vivo: onde o herói da vez volta na fila com a ação destacada (retrato fantasma "VOCÊ" e linha de motivo)
  const ordem = (tl, table) => { const pv = LEQUE.timeCost(), sl = pv && PALCO3D.previewSlot(S.battle.ticks, pv.actor.id, pv.cost, tl), gAt = sl ? Math.min(sl.pos + 1, tl.length) : -1;
    // estilo FFX: plaqueta com retrato pequeno e nome; a da vez fica maior, no topo, com o selo AGORA
    const ghost = sl ? `<div class="ot ghost ${pv.actor.enemy ? 'foe' : 'hero'}" aria-hidden="true"><span class="otp">${photo(pv.actor, 'p')}</span><b class="otn">VOCÊ</b></div>` : '';
    const rows = tl.map((id, i) => { const c = S.chars[id];
      return `${i === gAt ? ghost : ''}<div class="ot ${c.enemy ? 'foe' : 'hero'} ${i ? '' : 'now'} ${id === hlO ? 'hl' : ''}" data-o="${id}" title="${esc(c.name)}"><span class="otp">${photo(c, 'p')}</span><b class="otn">${esc(c.name)}</b></div>`; }).join('') + (gAt >= tl.length ? ghost : '');
    return `<div class="hud-order" aria-label="Ordem dos turnos">${rows}${sl ? `<div class="ot-why">◆ ${esc(pv.name)}: ${sl.approx ? '≈' : 'você volta em'} ${sl.pos + 1}º</div>` : ''}${miniMapa(table)}</div>`; };
  // passar o mouse num retrato acende o recorte no palco e vice-versa (classe hl)
  const hl = id => { hlO = id; document.querySelectorAll('.ot.hl,.bb.hl').forEach(e => e.classList.remove('hl')); if (!id) return; document.querySelectorAll(`.ot[data-o="${id}"],.bb[data-tgt="${id}"]`).forEach(e => e.classList.add('hl')); };
  // mão ☞ estilo JRPG: o único marcador de alvo. Na mira ela fica no alvo atual (passar o mouse num candidato troca o alvo);
  // fora da mira, passar o mouse num inimigo só mostra a mão e o nome. Vive fora do #app (o render não a recria) e segue o recorte a cada quadro.
  const HAND = '<svg viewBox="0 0 64 40" aria-hidden="true"><rect x="2" y="13" width="9" height="22" rx="2" fill="#ffc93c" stroke="#000" stroke-width="2.5"/><path d="M10 14Q10 9 16 9L24 9Q26 4 31 6L33 11L58 11Q62 11 62 15Q62 19 58 19L36 19L36 34Q36 37 32 37L14 37Q10 37 10 33Z" fill="#fff" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><path d="M19 24H35M19 30H34" stroke="#000" stroke-width="2" fill="none"/></svg>';
  let hovBB = null; // recorte sob o mouse (só o corpo: a sombra, a mini barra e as condições não contam)
  const hand = (() => {
    let el = null, id = null, raf = 0;
    const pos = () => {
      raf = 0; const c = S?.chars?.[id], r = id && S.battle?.active && PALCO3D.rectOf(id);
      if (!c || !r || !r.width || !r.height) { if (el) el.style.opacity = '0'; return; }
      const flip = r.left - 110 < 8, x = flip ? r.right + 4 : r.left - 4, y = r.top + r.height * .38;
      el.classList.toggle('flip', flip); el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.style.opacity = '';
      raf = requestAnimationFrame(pos); // a câmera anda por ~1,1 s: a mão acompanha
    };
    return id2 => {
      document.querySelectorAll('.p3d .bb.handed').forEach(e => e.dataset.tgt !== id2 && e.classList.remove('handed'));
      if (id2) document.querySelector(`.p3d .bb[data-tgt="${id2}"]`)?.classList.add('handed');
      if (!el && id2) { el = document.createElement('div'); el.className = 'hand'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = HAND + '<b></b>'; document.body.append(el); }
      if (!el) return;
      if (id2 !== id) { id = id2; el.querySelector('b').textContent = S.chars[id]?.name || ''; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
      if (!raf) pos();
    };
  })();
  const handNow = () => { const a = LEQUE.aimTarget(), h = hovBB && S.chars[hovBB];
    hand(a || (h && h.enemy && h.hp > 0 && hovBB in (S.battle?.ticks || {}) ? hovBB : null)); };
  document.addEventListener('mouseover', e => { const u = e.target.closest?.('.ot[data-o],.bb[data-tgt]'); hl(u ? u.dataset.o || u.dataset.tgt : null);
    const b = e.target.closest?.('.p3d .bb[data-tgt]'), body = b && !e.target.closest('.mini,.shadow,.sts') ? b.dataset.tgt : null;
    if (body === hovBB) return; hovBB = body;
    if (!(body && LEQUE.hover(body))) handNow(); }); // na mira, passar o mouse troca o alvo (o render chama handNow)
  const topo = (o) => { const lines = S.log.filter(l => !l.to).slice(-3);
    const icons = o.table || o.gm ? '' : `<div class="icons"><button type="button" class="ib" data-a="navT" aria-label="Menu" aria-expanded="${navOpen}">☰</button><button type="button" class="ib ${chatOpen ? 'on' : ''}" data-a="chatT" aria-label="Chat" aria-pressed="${chatOpen}">${ico('chat')}${o.unread ? `<i class="n">${o.unread > 9 ? '9+' : o.unread}</i>` : ''}</button></div>`;
    const menu = navOpen && !o.table && !o.gm ? `<nav class="hud-menu" aria-label="Páginas">${chips(PAGES, (k, l) => `<button type="button" data-pg="${k}" class="${pg === k ? 'on' : ''}">${ico(k)}<span>${k === 'mesa' ? 'Batalha' : l}</span></button>`)}</nav>` : '';
    return `<div class="hud-tr">${icons}${menu}${fieldBar()}<div class="hlog" aria-live="polite">${lines.map(l => `<div><b>${esc(l.who)}</b> ${esc(l.text)}</div>`).join('')}</div></div>`; };
  // minimapa: o mapa da cena em ponto pequeno, logo abaixo da ordem dos turnos; arrastar o próprio ponto move o token (o servidor confere o dono)
  // recolhe pelo título "Mapa" ou pela tecla M (para o mestre, M já abre a visão do mapa: só o título)
  let miniOpen = true; try { miniOpen = localStorage.getItem('p3d.mini') !== '0'; } catch {}
  const miniT = () => { miniOpen = !miniOpen; try { localStorage.setItem('p3d.mini', miniOpen ? '1' : '0'); } catch {} if (typeof render === 'function') render(); };
  const miniMapa = (table = false) => {
    const m = S.scenes[S.scene]; if (!m || !(m.cols > 0) || !(m.rows > 0)) return '';
    const cr = m.crop || { x: 0, y: 0, w: 1, h: 1 }, hid = (x, y) => m.fogOn && !m.seen?.[x + ',' + y], cur = timeline(1)[0];
    const bg = m.bg ? `background-image:url('${esc(m.bg)}');background-size:${100 / cr.w}% ${100 / cr.h}%;background-position:${cr.w < 1 ? cr.x / (1 - cr.w) * 100 : 0}% ${cr.h < 1 ? cr.y / (1 - cr.h) * 100 : 0}%;` : '';
    const dots = Object.values(S.chars).filter(c => c.x != null && c.y != null && c.scene === S.scene && (mine(c) || !hid(c.x, c.y))).map(c => {
      const drag = !table && mine(c);
      return `<i class="mk ${c.enemy ? 'foe' : 'hero'} ${c.id === cur ? 'now' : ''} ${c.hp > 0 ? '' : 'ko'} ${drag ? 'drag' : ''}" data-mk="${c.id}" style="--x:${(c.x + m.ox + .5) / m.cols * 100}%;--y:${(c.y + m.oy + .5) / m.rows * 100}%;--c:${esc(c.color)}" title="${esc(c.name)}"></i>`; }).join('');
    return `<div class="hud-mini ${miniOpen ? '' : 'off'}" data-mini><button type="button" class="mt" data-a="miniT" aria-expanded="${miniOpen}">Mapa${gm ? '' : ' <span class="key">M</span>'}</button><div class="mm" style="aspect-ratio:${m.ar || m.cols / m.rows};${bg}">${m.grid === false ? '' : `<span class="mg" style="background-size:${100 / m.cols}% ${100 / m.rows}%"></span>`}${dots}</div></div>`; };
  let mkDrag = null;
  document.addEventListener('pointerdown', e => { const d = e.target.closest?.('.hud-mini .mk.drag'); if (!d || e.button) return; e.preventDefault(); mkDrag = { id: d.dataset.mk, box: d.parentElement, x: e.clientX, y: e.clientY }; });
  // clique (sem arrastar) num ponto do minimapa durante a mira escolhe o alvo
  document.addEventListener('click', e => { const d = e.target.closest?.('.hud-mini .mk:not(.drag)'); if (d) LEQUE.pickTgt(d.dataset.mk); });
  document.addEventListener('pointermove', e => { if (!mkDrag) return; const b = document.querySelector(`.hud-mini .mk[data-mk="${mkDrag.id}"]`)?.parentElement || mkDrag.box, r = b.getBoundingClientRect(), d = b.querySelector(`.mk[data-mk="${mkDrag.id}"]`);
    if (d) { d.style.setProperty('--x', Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)) + '%'); d.style.setProperty('--y', Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100)) + '%'); } });
  const mkEnd = e => { if (!mkDrag) return; const k = mkDrag; mkDrag = null;
    if (e.type === 'pointerup' && Math.hypot(e.clientX - k.x, e.clientY - k.y) < 5) { if (!LEQUE.pickTgt(k.id) && typeof render === 'function') render(); return; } const m = S.scenes[S.scene], b = document.querySelector(`.hud-mini .mk[data-mk="${k.id}"]`)?.parentElement || k.box;
    if (e.type === 'pointerup' && m && b?.isConnected) { const r = b.getBoundingClientRect();
      const x = Math.max(0, Math.floor((e.clientX - r.left) / r.width * m.cols - m.ox)), y = Math.max(0, Math.floor((e.clientY - r.top) / r.height * m.rows - m.oy));
      send({ t: 'move', id: k.id, x: Math.min(x, Math.ceil(m.cols) - 1), y: Math.min(y, Math.ceil(m.rows) - 1) }); }
    if (typeof render === 'function') render(); };
  document.addEventListener('pointerup', mkEnd); document.addEventListener('pointercancel', mkEnd);
  document.addEventListener('keydown', e => { if (gm || e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || e.target.matches?.('input,textarea,select,[contenteditable]') || !S?.battle?.active || innerWidth <= 700 || !document.querySelector('.hud-mini')) return; miniT(); });
  // vez do inimigo: faixa "{INIMIGO} · {GOLPE}" e "ALVO: {HERÓI}" por 1,6 s quando a janela de defesa abre (o relógio é o deste navegador)
  let bandK = '', bandT = 0;
  const faixa = () => { const C = S.battle.cmd; if (!C) { bandK = ''; return ''; }
    const k = C.foe + ':' + C.at; if (k !== bandK) { bandK = k; bandT = performance.now(); setTimeout(() => typeof render === 'function' && render(), 1650); }
    if (performance.now() - bandT > 1600) return ''; const f = S.chars[C.foe], alvos = (C.tgs || []).map(id => S.chars[id]?.name).filter(Boolean);
    return `<div class="band" role="status" style="--c:${esc(f?.color || '#e4002b')}"><b>${esc(f?.name || 'Inimigo')} · ${esc(C.nm || 'Ataque')}</b>${alvos.length ? `<small>ALVO: ${esc(alvos.join(', '))}</small>` : ''}</div>`; };
  const grupo = (inB, cur) => `<div class="hud-party" aria-label="Grupo">${inB.filter(c => !c.enemy).map(c => {
    const hp = pct(c.hp, c.hpMax), au = Math.round(10 * Math.max(0, c.aura) / (c.auraMax || 1)), form = c.st.form && c.form && SK(c.form);
    return `<div class="pm ${c === cur ? 'now' : ''} ${c.id === tgt || S.battle.cmd?.tgs?.includes(c.id) ? 'tg' : ''} ${S.battle.cmd?.tgs?.includes(c.id) ? 'dtg' : ''} ${c.hp > 0 ? '' : 'ko'}" data-tgt="${c.id}" style="--c:${esc(c.color)}" title="${esc(c.name)}">
      <i class="ink"></i><div class="por">${photo(c, 'p')}</div>
      <div class="hlim ${c.limit >= 100 ? 'full' : ''}" title="Limite ${c.limit}%"><i style="height:${pct(c.limit, 100)}%"></i></div>
      <div class="pst">${c.hp > 0 ? stIcons(c) : `<i class="dead">${c.dead ? 'Morto' : 'Caído' + (c.dying ? ' · ' + c.dying : '')}</i>`}${c.st.defUp ? '<span>Defendendo</span>' : ''}${form ? `<span>Forma: ${esc(form.name)}</span>` : ''}</div>
      <div class="in"><b class="pnm">${esc(c.name)}</b><div class="p5n" aria-hidden="true"><span class="h"><small>HP</small><b>${c.hp}</b></span><span class="a"><small>AU</small><b>${c.aura}</b></span></div><div class="hpn2"><b>${c.hp}</b><small>/${c.hpMax}</small><em>HP</em></div>
        <div class="hpbar"><i data-bid="${c.id}:hp" data-p="${hp}" style="width:${hp}%"></i>${shBar(c)}</div>
        <div class="au" title="Aura ${c.aura}/${c.auraMax}"><span class="dia2"><b>${c.aura}</b></span><span class="segs">${Array.from({ length: 10 }, (_, i) => `<i class="${i < au ? 'f' : ''}"></i>`).join('')}</span></div>
        <div class="sanr" title="Sanidade ${c.san}/${c.sanMax}"><small>SAN ${c.san}</small><div class="sanl"><i style="width:${pct(c.san, c.sanMax)}%"></i></div></div></div></div>`; }).join('')}</div>`;
  // fileira de comandos de turno, logo acima do grupo (canto inferior direito); gmO: o mestre agindo pelo ator do leque dele
  const cmds = (a, cur, inB, gmO = false) => {
    if (!a) return '';
    const [rqId, rq] = (gmO ? null : myReq()) || [], wait = rq && rq.ch === a.id, my = cur === a, mode = LEQUE.state.mode, brv = a.brv || 0;
    if (wait) return `<div class="hud-cmd"><div class="pend">Aguardando o mestre · ${esc(rq.text)}</div>${hint('Esc', 'Cancelar', `data-a="reqNo" data-id="${rqId}"`)}</div>`;
    if (!my) return `<div class="hud-cmd">${hint('', `Vez de ${esc(cur?.name || '—')}`, '', 'off')}</div>`;
    const lq = typeof LEQUE !== 'undefined' && LEQUE.ctx(); if (lq?.shown && lq.actor === a) return ''; // na vez: os comandos de turno estão na coluna presa ao herói (leque.js)
    return `<div class="hud-cmd">${turn(a, inB)}${mode !== 'menu' ? hint('Esc', 'Voltar', 'data-lq="back"') : ''}</div>`; };
  // comandos de turno (Defender, Concentrar, Coragem, Ataque Total, Passar): a coluna do lado oposto do recorte usa esta lista
  // turnSplit: Defender à parte (fica na coluna principal do leque); o resto vai para a Tática
  const turnSplit = (a, inB) => { const brv = a.brv || 0, foes = inB.filter(x => x.enemy !== a.enemy && x.hp > 0), downAll = foes.length > 0 && foes.every(x => x.st.down || x.st.broken);
    return { def: hint(4, `Defender${brv > 0 ? ' · ' + a.brv : ''}`, `data-a="defend" data-id="${a.id}" title="Defende (−25% de dano) e guarda 1 ponto de Coragem (máx. 3)"`), tac: hint(5, `Concentrar${a.ten ? ' ×' + [1, 1.5, 2, 3][a.ten] : ''}`, `data-a="focus" data-id="${a.id}" title="Gasta o turno acumulando: o próximo golpe causa ×1,5 / ×2 / ×3"`)
      + hint(6, `Coragem ${brv}`, brv > -2 ? `data-a="braveT" data-id="${a.id}" aria-pressed="${braveOn}" title="Gasta 1 ponto de Coragem para agir de novo; sem pontos, fica devendo tempo"` : '', `${braveOn ? 'on' : ''} ${brv < 0 ? 'debt' : ''} ${brv > -2 ? '' : 'off'}`)
      + (downAll ? hint(8, 'Ataque Total', `data-a="allOut" data-id="${a.id}" title="Todo inimigo Derrubado ou Quebrado: o grupo inteiro ataca"`, 'allout') : '')
      + hint(7, 'Passar', `data-a="next" data-id="${a.id}" title="Passa a vez gastando metade do tempo"`) }; };
  const turn = (a, inB) => { const t = turnSplit(a, inB); return t.def + t.tac; };
  // lista de alvos, só durante a mira: os candidatos do leque (da esquerda para a direita, como no palco); a mão marca o atual
  const alvos = () => { const L = LEQUE.aimList(); if (!L.length) return '';
    return `<div class="hud-tgts" role="listbox" aria-label="Alvos"><span class="key" aria-hidden="true">←</span>${L.map(c => { const on = c.id === tgt, p = pct(c.hp, c.hpMax);
      return `<button type="button" class="ta ${c.enemy ? 'foe' : 'hero'} ${on ? 'on' : ''} ${c.hp > 0 ? '' : 'ko'}" data-tgt="${c.id}" role="option" aria-selected="${on}" style="--c:${esc(c.color)}">${on ? `<span class="tah">${HAND}</span>` : ''}<b>${esc(c.name)}</b><small>${c.enemy && !gm ? p + '%' : `${c.hp}/${c.hpMax}`}</small><i class="tahp"><i style="width:${p}%"></i></i></button>`; }).join('')}<span class="key" aria-hidden="true">→</span></div>`; };
  // pedidos dos jogadores no palco do mestre: aprovar (Enter) ou negar (Del) sem abrir a barra lateral
  const pedidos = () => { const rs = Object.entries(S.reqs || {}).sort((a, b) => a[1].n - b[1].n); if (!rs.length) return '';
    return `<div class="hud-req" aria-label="Pedidos">${rs.slice(0, 4).map(([id, r], i) => { const c = S.chars[r.ch];
      return `<div class="hrq" style="--c:${esc(c?.color || '#888')}"><small>${esc(r.by)}</small><b>${esc(c?.name || '?')}</b><span>${esc(r.text)}</span><div><button type="button" class="ok" data-a="rqOk" data-id="${id}">Aprovar${i ? '' : ' <kbd>Enter</kbd>'}</button><button type="button" class="no" data-a="rqNo" data-id="${id}">Negar${i ? '' : ' <kbd>Del</kbd>'}</button></div></div>`; }).join('')}${rs.length > 4 ? `<small class="more">+${rs.length - 4} na barra lateral</small>` : ''}</div>`; };
  // ficha do inimigo: HP (em % para o jogador, números para o mestre), escudo da Quebra, fraquezas só do que foi descoberto e condições; full (zoom) acrescenta golpes e o efeito da Quebra
  const MAIN5 = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku'];
  const sheet = (id, { full = false, preview = '' } = {}) => {
    const c = S.chars[id]; if (!c || !c.enemy) return '';
    const weak = c.weak || [], res = c.resist || [], els = [...MAIN5, ...new Set([...weak, ...res].filter(e => !MAIN5.includes(e)))];
    const wk = els.map(e => { const k = weak.includes(e) ? 'w' : res.includes(e) ? 'r' : !gm && (c.known || 0) < 2 && MAIN5.includes(e) ? 'q' : '', nm = EL[e] || e;
      return `<span class="${k}" title="${esc(nm + (k === 'w' ? ': fraqueza' : k === 'r' ? ': resiste' : k === 'q' ? ': não testado' : ''))}">${k === 'q' ? '?' : esc((typeof KANJI !== 'undefined' && KANJI[e]) || e.slice(0, 1).toUpperCase())}</span>`; }).join('');
    const st = c.hp > 0 ? stIcons(c) : '', golpes = (c.telK || []).map(k => SK(k)?.name).filter(Boolean);
    return `<div class="sheet ${full ? 'full' : ''}"><h5>${esc(c.name)}<small>${c.boss ? 'Chefe' : 'Inimigo'}</small></h5>
      <div class="row"><span>HP ${gm ? `${c.hp}/${c.hpMax}` : pct(c.hp, c.hpMax) + '%'}</span><span class="esc">QUEBRA ${c.brk ? c.brk.cur : 0}</span></div>
      <div class="hpbar"><i style="width:${pct(c.hp, c.hpMax)}%"></i>${shBar(c).replace(/ data-bid="[^"]*"/, '')}</div>
      <div class="row">FRAQUEZAS <div class="wk">${wk}</div></div>${st ? `<div class="row">CONDIÇÕES <div class="cond">${st}</div></div>` : ''}
      ${full ? `<div class="more">${gm ? `<p>Golpes conhecidos: ${golpes.length ? esc(golpes.join(', ')) : 'nenhum'}.</p>` : ''}${c.brk ? '<p>Quebra: perde 2 turnos e sofre +50% de dano.</p>' : ''}</div>` : ''}${preview ? `<div class="pv">${esc(preview)}</div>` : ''}</div>`;
  };
  // inimigo em destaque: o do zoom ou o da mira
  const alvoId = () => { const id = PALCO3D.local.zoom || LEQUE.aimTarget(), c = id && S.chars[id]; return c && c.enemy && c.hp > 0 && id in S.battle.ticks ? id : null; };
  let pos = { id: '', l: 0, t: 0 }; // última posição da ficha (o desenho refaz o HTML a cada estado: sem isso ela piscaria)
  const alvo = () => { const id = alvoId(); if (!id) return ''; const c = S.chars[id], zoom = !!PALCO3D.local.zoom, hp = pct(c.hp, c.hpMax), ok = pos.id === id;
    return `<div class="hud-top" aria-label="Alvo"><div class="hpbar"><i style="width:${hp}%"></i>${shBar(c).replace(/ data-bid="[^"]*"/, '')}</div><h4><span class="sh2" title="Quebra">◆${c.brk ? c.brk.cur : 0}</span>${esc(c.name)}</h4></div>`
      + `<div class="hud-sheet" data-sid="${id}" style="${ok ? `left:${pos.l}px;top:${pos.t}px` : 'opacity:0'}">${sheet(id, { full: zoom, preview: LEQUE.preview(c) })}</div>`; };
  return {
    sheet, miniT, turn, turnSplit,
    // mestre: a mesma HUD do jogador (html com gm), com o ator vindo do leque dele e a fila de pedidos no canto inferior esquerdo
    gm() { return this.html({ gm: true }); },
    // coloca a ficha ao lado do recorte (à direita; à esquerda se não couber; presa entre top 110 e 560); a câmera leva ~1,1 s, então é chamada de novo depois
    place() {
      handNow();
      const w = app.querySelector('.hud-sheet'), h = w?.closest('.hudw'), r = w && PALCO3D.rectOf(w.dataset.sid); if (!r) return;
      const hr = h.getBoundingClientRect(), hk = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hk')) || .85, W = 270 * hk;
      let l = r.right - hr.left + 20 * hk; if (l + W + 10 > hr.width) l = r.left - hr.left - 20 * hk - W;
      l = Math.round(Math.max(10, l)); const t = Math.round(Math.max(110 * hk, Math.min(560 * hk, r.top - hr.top + r.height * .15)));
      Object.assign(w.style, { left: l + 'px', top: t + 'px', opacity: '' }); pos = { id: w.dataset.sid, l, t };
    },
    // actorId: herói do jogador que está no leque (a vez dele ou o que o jogador escolheu); dim: não é a vez dele; unread: mensagens novas do chat; table: versão da mesa (sem ícones nem dicas)
    html({ actorId = null, dim = false, unread = 0, table = false, gm: gmO = false } = {}) {
      const inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks), cur = S.chars[timeline(1)[0]], o = { actorId, unread, table, gm: gmO }, x = gmO ? LEQUE.ctx() : null;
      const cm = table ? '' : gmO ? (x?.shown ? alvos() + cmds(x.actor, x.cur, inB, true) : '') : alvos() + cmds(S.chars[actorId], cur, inB);
      return `<div class="hudw ${dim ? 'dim' : ''} ${table ? 'table' : ''} ${gmO ? 'gmh' : ''}">${ordem(timeline(8), table)}${topo(o)}<div class="hud-br">${cm}${grupo(inB, cur)}</div>${alvo()}${faixa()}${gmO ? pedidos() : ''}</div>`;
    },
  };
})();

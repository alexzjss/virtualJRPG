// ===== mundo 3D: HUD da exploração — prompt do E, diálogo do NPC, placa, fichas, minimapa, objetivo, nomes, pings, registro e menu =====
// Mora fora do #app (fixo no body), então o render() não apaga. O nucleo.js entrega { t:'dlg' } e { t:'placa' } em MHUD.on(m);
// o mundo-input.js chama MHUD.prompt(obj) com o objeto que o E usaria (ou null).
// Diálogo: quem abriu escolhe (1 a 6 ou clique) e encerra; quem está perto só lê (ro); o mestre lê, fala como o NPC e encerra.
(g => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const isGm = () => typeof role !== 'undefined' && role === 'gm';
  const typing = () => document.activeElement?.matches?.('input,textarea,select,[contenteditable],[contenteditable] *');
  function send(o) { if (typeof ws !== 'undefined' && ws?.readyState === 1) ws.send(JSON.stringify(o)); }
  let root = null, alvo = null, pKey = '', dlg = null, placa = null;
  // a HUD fica sobre a área do 3D ([data-mundo]), não sobre a coluna ao lado
  const caixa = () => { const r = document.querySelector('[data-mundo]')?.getBoundingClientRect(); if (!root || !r?.width) return; const st = root.style; st.setProperty('--mc', r.left + r.width / 2 + 'px'); st.setProperty('--mw', r.width + 'px'); st.setProperty('--mb', Math.max(0, innerHeight - r.bottom) + 'px'); st.setProperty('--ml', r.left + 'px'); st.setProperty('--mt', r.top + 'px'); st.setProperty('--mh', r.height + 'px'); };
  const el = cls => { if (!root) { root = document.createElement('div'); root.className = 'mhud'; document.body.appendChild(root); wire(); } let e = root.querySelector(':scope > .' + cls); if (!e) { e = document.createElement('div'); e.className = cls; root.appendChild(e); } return e; };

  // ----- prompt: "E · Abrir o baú" -----
  const ROT = {
    porta: o => o.cfg?.estado === 'aberta' ? 'Fechar a porta' : 'Abrir a porta', bau: () => 'Abrir o baú',
    item: o => 'Pegar ' + ((typeof S !== 'undefined' && S?.items?.[o.cfg?.item]?.name) || 'o item'), npc: o => 'Falar com ' + (o.cfg?.nome || 'NPC'),
    placa: () => 'Ler a placa', alavanca: () => 'Puxar a alavanca', escada: () => 'Usar a escada', portal: () => 'Atravessar o portal',
  };
  const rotulo = o => (ROT[o.k] || (() => 'Interagir'))(o);
  function prompt(o) {
    const k = o && !dlg && !placa ? o.id + '|' + rotulo(o) : ''; alvo = o?.id || null; if (k === pKey) return; pKey = k;
    const e = el('mhud-prompt'); caixa(); e.innerHTML = k ?`<button type="button" data-mh="usar"><kbd>E</kbd><span>${esc(rotulo(o))}</span></button>` : '';
  }

  // ----- diálogo no estilo Persona: retrato à esquerda, nome em faixa, fala e escolhas numeradas -----
  function drawDlg() {
    const e = el('mhud-dlg'); if (!dlg) { e.innerHTML = ''; return; } caixa();
    const m = dlg, ret = m.retrato ? `<img src="${esc(m.retrato)}" alt="">` : `<span aria-hidden="true">${esc((m.nome || '?').slice(0, 1))}</span>`;
    const ops = !m.ro && m.escolhas.length ? `<ol class="mhud-esc">${m.escolhas.map((t, i) => `<li><button type="button" data-mh="op" data-i="${i}"><kbd>${i + 1}</kbd><span>${esc(t)}</span></button></li>`).join('')}</ol>` : '';
    const fim = !m.ro && !m.escolhas.length ? '<button type="button" class="mhud-seg" data-mh="fim">Encerrar a conversa</button>' : '';
    const say = isGm() ? `<form class="mhud-say" data-mh="say"><input maxlength="300" placeholder="Falar como ${esc(m.nome)}" aria-label="Fala extra do NPC"><button type="submit">Falar</button></form>` : '';
    e.innerHTML = `<section role="dialog" aria-label="Conversa com ${esc(m.nome)}" aria-live="polite"><div class="mhud-ret">${ret}</div>
      <div class="mhud-fala"><b class="mhud-nome">${esc(m.nome)}</b><p>${esc(m.fala)}</p>${(m.extra || []).map(t => `<p class="mhud-extra">${esc(t)}</p>`).join('')}
      ${ops}${fim}${m.ro && !isGm() ? '<small>Você acompanha a conversa.</small>' : ''}${say}
      <button type="button" class="mhud-x" data-mh="${m.ro && !isGm() ? 'esconde' : 'fim'}" aria-label="${m.ro && !isGm() ? 'Fechar' : 'Encerrar a conversa'}">×</button></div></section>`;
  }
  function escolher(i) { const m = dlg; if (!m || m.ro || !(i >= 0 && i < m.escolhas.length)) return; send({ t: 'interact', id: m.by, obj: m.obj, opt: i }); }
  function encerrar() { const m = dlg; if (!m) return; if (m.ro && !isGm()) { dlg = null; drawDlg(); return; } send({ t: 'dlgEnd', sc: m.sc }); }

  // ----- placa: o mesmo visual do "Mostrar a todos" -----
  function drawPlaca() {
    const e = el('mhud-placa'); if (!placa) { e.innerHTML = ''; return; }
    e.innerHTML = `<div class="handout" role="dialog" aria-label="Placa"><figure><small>Placa</small>${placa.img ? `<img src="${esc(placa.img)}" alt="">` : ''}${placa.text ? `<figcaption>${esc(placa.text)}</figcaption>` : ''}<button type="button" class="own" data-mh="placaX">Fechar</button></figure></div>`;
    e.querySelector('[data-mh=placaX]')?.focus();
  }

  function on(m) {
    if (m.t === 'placa') { placa = { text: String(m.text || ''), img: String(m.img || '') }; drawPlaca(); prompt(null); return; }
    if (m.t !== 'dlg') return;
    if (m.fim) { if (!dlg || dlg.sc === m.sc) dlg = null; } else dlg = { ...m, escolhas: Array.isArray(m.escolhas) ? m.escolhas : [] };
    drawDlg(); pKey = '-'; prompt(null);
  }

  function wire() {
    root.addEventListener('click', e => {
      const b = e.target.closest?.('[data-mh]'); if (!b || b.tagName === 'FORM') return; const k = b.dataset.mh;
      if (k === 'usar') g.MINPUT?.use?.(); else if (k === 'op') escolher(+b.dataset.i); else if (k === 'fim') encerrar();
      else if (k === 'esconde') { dlg = null; drawDlg(); } else if (k === 'placaX') { placa = null; drawPlaca(); }
    });
    root.addEventListener('submit', e => {
      const f = e.target.closest?.('[data-mh=say]'); if (!f) return; e.preventDefault(); const i = f.querySelector('input'), t = i.value.trim();
      if (t && dlg) send({ t: 'dlgSay', sc: dlg.sc, text: t }); i.value = '';
    });
    // por cima do WASD e do 1–4 de trocar herói: com a placa ou as escolhas abertas, essas teclas são da HUD
    addEventListener('keydown', e => {
      if (typing() || e.ctrlKey || e.metaKey || e.altKey) return;
      const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      if (placa && (e.key === 'Escape' || e.key.toLowerCase() === 'e')) { stop(); placa = null; drawPlaca(); return; }
      if (!dlg) return;
      if (e.key === 'Escape') { stop(); encerrar(); return; }
      if (/^[1-6]$/.test(e.key) && !dlg.ro && dlg.escolhas.length) { stop(); if (!e.repeat) escolher(+e.key - 1); }
    }, true);
  }


  // ===== HUD da exploração =====
  // Dentro do [data-mundo] (no #app, refeito pelo render): fichas P5 em miniatura (HUD.html mini) e as 3 últimas linhas do registro.
  // Fora do #app, numa camada fixa que acompanha o retângulo do [data-mundo]: minimapa (5 Hz), faixa de objetivo, nomes com mini
  // barra de HP (por quadro, em MHUD.tick), marcas e setas de pings e a borda vermelha de quem pisa em perigo.
  const st = () => (typeof S !== 'undefined' ? S : null);
  const meId = () => (typeof lastHero !== 'undefined' ? lastHero : null);
  const P = () => g.MPECAS;
  function html(S0) {
    const s = S0 || st(); if (!s) return '';
    const fichas = typeof HUD !== 'undefined' ? HUD.html({ mini: true }) : '';
    if (typeof role === 'undefined') return fichas;
    const ls = (s.log || []).slice(-3).map(l => `<div><b>${esc(l.who)}</b> ${esc(l.text)}</div>`).join('');
    return fichas + `<div class="mh-reg"><div class="mh-log" aria-live="polite">${ls}</div></div>` + (menuOn && isPlayer() ? menuHtml(s) : '');
  }

  // ===== menu de pausa (Tab ou Esc): as páginas do jogador por cima do mundo, que continua rodando por baixo =====
  // Mora no #app (os botões das páginas são tratados pelo eventos.js); a rolagem da página volta no quadro seguinte ao render.
  const ABAS = { pers: 'Ficha', itens: 'Itens', hab: 'Skills', forja: 'Forja', ofi: 'Ofícios', camp: 'Acampamento', hist: 'Diário' };
  let menuOn = false, aba = 'pers', mScroll = 0;
  const isPlayer = () => typeof role !== 'undefined' && role === 'player';
  function menuHtml(s) {
    const meus = Object.values(s.chars).filter(c => typeof mine === 'function' && mine(c) && !c.enemy), c = s.chars[meId()] || meus[0];
    const body = typeof pageHtml === 'function' ? pageHtml(aba, c) : '';
    return `<div class="mh-menu" role="dialog" aria-modal="true" aria-label="Menu"><i class="mh-mfx" aria-hidden="true"></i>
      <nav class="mh-mtabs" aria-label="Páginas"><b class="mh-mtit">Menu</b>${Object.entries(ABAS).map(([k, l], i) => `<button type="button" data-mhm="${k}" class="${aba === k ? 'on' : ''}" aria-current="${aba === k ? 'page' : 'false'}" style="--i:${i}">${l}</button>`).join('')}
        <button type="button" class="mh-mvolta" data-mhm="x">Voltar <kbd>Tab</kbd></button></nav>
      <section class="mh-mpage"><header class="mh-mwho">${meus.map(x => `<button type="button" class="chb ${x === c ? 'on' : ''}" data-sel="${x.id}" style="--c:${esc(x.color)}" aria-pressed="${x === c}"><b>${esc(x.name)}</b></button>`).join('')}</header>${body}</section></div>`;
  }
  const menuSet = v => {
    if (v === menuOn) return; menuOn = v; if (v) { mScroll = 0; g.MINPUT?.clear?.(); g.MHUD?.prompt?.(null); }
    if (typeof render === 'function') render();
    if (v) document.querySelector('.mh-menu [data-mhm].on')?.focus();
  };
  document.addEventListener('click', e => {
    const b = e.target.closest?.('[data-mhm]'); if (!b) return; const k = b.dataset.mhm;
    if (k === 'x') return menuSet(false); if (ABAS[k] && k !== aba) { aba = k; mScroll = 0; if (typeof render === 'function') render(); }
  });
  document.addEventListener('scroll', e => { if (e.target.classList?.contains('mh-mpage')) mScroll = e.target.scrollTop; }, true);
  const tampa = () => (typeof meOpen !== 'undefined' && meOpen) || (typeof navOpen !== 'undefined' && navOpen) || (typeof rollDlg !== 'undefined' && rollDlg) || (typeof gridFull !== 'undefined' && gridFull);
  addEventListener('keydown', e => {
    if (!isPlayer() || e.ctrlKey || e.metaKey || e.altKey || dlg || placa) return; // diálogo e placa fecham primeiro (wire)
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (menuOn && (e.key === 'Tab' || e.key === 'Escape') && !(e.key === 'Tab' && typing())) { if (e.key === 'Escape' && typing()) return; stop(); menuSet(false); return; }
    if (menuOn || typing() || tampa() || st()?.battle?.active || !document.querySelector('[data-mundo]')) return;
    if (e.key === 'Tab' || e.key === 'Escape') { stop(); menuSet(true); }
  }, true);
  const menuTick = () => { const p = document.querySelector('.mh-mpage'); if (p && !p._vj) { p._vj = 1; p.scrollTop = mScroll; } };
  // duplo clique no chão do mundo marca um ping (a mesma mensagem do mapa 2D: casa x, y)
  document.addEventListener('dblclick', e => {
    const slot = e.target.closest?.('[data-mundo]'); if (!slot || e.target.closest('button,input,a,.hudw>*') || typeof role === 'undefined') return;
    const p = g.MUNDO?.pick?.(e.clientX, e.clientY); if (p && p.x >= 0 && p.z >= 0) send({ t: 'ping', x: Math.floor(p.x), y: Math.floor(p.z) });
  });

  let lay = null, rect = null, rectT = 0;
  const layer = () => {
    if (!lay) { lay = el('mhud-mundo'); lay.innerHTML = '<div class="mh-perigo" aria-hidden="true"></div><div class="mh-goal" role="status" hidden></div><canvas class="mmap" width="180" height="180" role="img" aria-label="Minimapa"></canvas><div class="mh-tags" aria-hidden="true"></div><div class="mh-pings" aria-hidden="true"></div>'; }
    return lay;
  };
  function off() { if (lay) lay.hidden = true; menuOn = false; }

  // ----- objetivo: pulsa por 2 s quando muda (não na primeira vez) -----
  let goalTxt = null;
  function goal(w) {
    const t = w?.goal || ''; if (t === goalTxt) return; const first = goalTxt === null; goalTxt = t;
    const e = lay.querySelector('.mh-goal'); e.innerHTML = t ? `<small>Objetivo</small><b>${esc(t)}</b>` : ''; e.hidden = !t;
    if (!first && t) { e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse'); }
  }

  // ----- nomes e mini barra de HP sobre os atores (um div por ator, movido por transform) -----
  const tags = new Map();
  function drawTags(s, f, r, now) {
    const box = lay.querySelector('.mh-tags'), seen = new Set();
    if (f) for (const c of Object.values(s.chars)) {
      if (!c.pos || c.pos.f !== f.id || c.scene !== s.scene || (c.enemy && !(c.hp > 0))) continue;
      const p = g.MUNDO.screen(c.id); if (!p?.vis || p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom) continue;
      seen.add(c.id); let e = tags.get(c.id);
      if (!e) { e = document.createElement('div'); e.className = 'mh-tag'; e.innerHTML = '<div class="in"><b></b><i><i></i></i></div>'; box.appendChild(e); tags.set(c.id, e); }
      const hp = Math.round(Math.max(0, Math.min(100, 100 * c.hp / (c.hpMax || 1))));
      if (e._n !== c.name) { e._n = c.name; e.querySelector('b').textContent = c.name; }
      if (e._hp !== hp) { e._hp = hp; e.querySelector('i>i').style.width = hp + '%'; e.classList.toggle('low', hp < 25); }
      if (e._c !== c.color) { e._c = c.color; e.style.setProperty('--c', c.color || '#fff'); e.classList.toggle('foe', !!c.enemy); }
      e.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px)`;
    }
    for (const [id, e] of tags) if (!seen.has(id)) { e.remove(); tags.delete(id); }
  }

  // ----- pings: anel no lugar; fora da tela, seta na borda apontando para ele -----
  const pEl = new Map();
  function drawPings(f, r) {
    const box = lay.querySelector('.mh-pings'), ps = f && typeof pings !== 'undefined' ? pings : [];
    for (const p of ps) {
      const q = g.MUNDO.project(p.x + .5, .1, p.y + .5); if (!q) continue;
      let e = pEl.get(p); if (!e) { e = document.createElement('i'); box.appendChild(e); pEl.set(p, e); }
      const dentro = q.vis && q.x >= r.left + 8 && q.x <= r.right - 8 && q.y >= r.top + 8 && q.y <= r.bottom - 8;
      if (dentro) { if (e.className !== 'mh-ping') e.className = 'mh-ping'; e.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px)`; continue; }
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = q.x - cx, dy = q.y - cy; if (!q.vis) { dx = -dx; dy = -dy; }
      const k = Math.min((r.width / 2 - 26) / Math.max(1e-6, Math.abs(dx)), (r.height / 2 - 26) / Math.max(1e-6, Math.abs(dy)));
      if (e.className !== 'mh-seta') e.className = 'mh-seta'; e.style.transform = `translate(${Math.round(cx + dx * k)}px,${Math.round(cy + dy * k)}px) rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;
    }
    for (const [p, e] of pEl) if (!ps.includes(p)) { e.remove(); pEl.delete(p); }
  }

  // ----- minimapa: casas (por tema e tipo), paredes, névoa (lembrado mais escuro), objetos vistos, aliados, inimigos à vista,
  // pings e a câmera como um losango (com a ponta para o "cima" da tela). A base fica em cache até o andar ou a névoa mudar.
  const TEMA = { floresta: [63, 122, 58], castelo: [122, 122, 134], praia: [216, 196, 138], neve: [226, 234, 242], deserto: [216, 168, 96], caverna: [90, 80, 96], ruinas: [138, 130, 112], pantano: [74, 90, 58], vulcao: [96, 58, 50], campo: [122, 160, 74] };
  const OBJ = { porta: '#c08040', bau: '#f0c040', item: '#f0e070', npc: '#60d0ff', placa: '#ffffff', alavanca: '#d0a0ff', escada: '#b070ff', portal: '#b070ff' };
  let base = null, baseK = '';
  function cor(d) {
    if (!d || d.tipo === 'vazio') return [6, 6, 10]; if (d.tipo === 'agua') return [58, 122, 208]; if (d.tipo === 'fundo') return [14, 14, 22]; if (d.tipo === 'perigo') return [224, 80, 32];
    const c = TEMA[d.tema] || [120, 120, 120], k = d.tipo === 'denso' ? .6 : d.tipo === 'baixo' ? .8 : d.tipo === 'trilha' ? 1.18 : 1; return c.map(v => Math.min(255, v * k));
  }
  function drawMap() {
    const s = st(), cur = g.MUNDO?.cur?.(), w = cur?.w, f = cur?.f, cv = lay.querySelector('.mmap'), x = cv.getContext('2d'); if (!s || !f) { x.clearRect(0, 0, 180, 180); return; }
    const sc = s.scenes?.[s.scene], fogOn = !!sc?.fogOn && !(typeof role !== 'undefined' && role === 'gm'), vis = s.vis?.[f.id];
    const k = 172 / Math.max(f.w, f.h), ox = (180 - f.w * k) / 2, oy = (180 - f.h * k) / 2;
    const fk = [f.id, f.w, f.h, f.cell, f.wallH, f.wallV, fogOn ? (sc.seenW?.[f.id] || '') + '|' + (typeof vis === 'string' ? vis : vis ? [...vis].join(';') : '') : 'semnevoa'].join('|');
    const fog = fogOn ? (g.MHUD._fog = g.MHUD._fog?.k === fk ? g.MHUD._fog : { k: fk, d: g.MUNDO.fogData(f.w, f.h, sc.seenW?.[f.id], typeof vis === 'string' ? vis : vis ? new Set(vis) : null) }).d : null;
    if (fk !== baseK) {
      baseK = fk; const px = document.createElement('canvas'); px.width = f.w; px.height = f.h; const pc = px.getContext('2d'), im = pc.createImageData(f.w, f.h), cs = P().cells(f);
      for (let i = 0; i < f.w * f.h; i++) { const v = fog ? fog[i] : 255, c = v ? cor(P().decode(cs[i])) : [0, 0, 0], m = v === 255 ? 1 : .42; im.data.set([c[0] * m, c[1] * m, c[2] * m, 255], i * 4); }
      pc.putImageData(im, 0, 0);
      base = document.createElement('canvas'); base.width = base.height = 180; const b = base.getContext('2d'); b.fillStyle = '#05050a'; b.fillRect(0, 0, 180, 180); b.imageSmoothingEnabled = false; b.drawImage(px, ox, oy, f.w * k, f.h * k);
      const lit = (cx, cy) => !fog || (cx >= 0 && cy >= 0 && cx < f.w && cy < f.h && fog[cy * f.w + cx] > 0);
      b.strokeStyle = '#f2ecd8'; b.lineWidth = Math.max(1, k * .28); b.beginPath();
      for (let yy = 0; yy <= f.h; yy++) for (let xx = 0; xx < f.w; xx++) { const e = P().edgeH(f, xx, yy); if (e && yy > 0 && yy < f.h && (lit(xx, yy) || lit(xx, yy - 1))) { b.moveTo(ox + xx * k, oy + yy * k); b.lineTo(ox + (xx + 1) * k, oy + yy * k); } }
      for (let yy = 0; yy < f.h; yy++) for (let xx = 0; xx <= f.w; xx++) { const e = P().edgeV(f, xx, yy); if (e && xx > 0 && xx < f.w && (lit(xx, yy) || lit(xx - 1, yy))) { b.moveTo(ox + xx * k, oy + yy * k); b.lineTo(ox + xx * k, oy + (yy + 1) * k); } }
      b.stroke();
    }
    x.clearRect(0, 0, 180, 180); x.drawImage(base, 0, 0);
    const seenAt = (cx, cy) => !fog || fog[Math.min(f.h - 1, Math.max(0, cy)) * f.w + Math.min(f.w - 1, Math.max(0, cx))] > 0;
    for (const o of Object.values(w?.objs || {})) {
      if (o?.f !== f.id || !OBJ[o.k] || (o.vis === 'oculto' && !o.rev) || !seenAt(o.x, o.y)) continue;
      x.fillStyle = OBJ[o.k]; const r2 = Math.max(2, k * .5); x.fillRect(ox + (o.x + .5) * k - r2 / 2, oy + (o.y + .5) * k - r2 / 2, r2, r2);
    }
    for (const c of Object.values(s.chars)) {
      if (!c.pos || c.pos.f !== f.id || c.scene !== s.scene || (c.enemy && !(c.hp > 0))) continue;
      const p = g.MINPUT?.poseOf?.(c.id) || c.pos, me = c.id === meId();
      x.beginPath(); x.arc(ox + p.x * k, oy + p.z * k, me ? 4 : 3, 0, Math.PI * 2); x.fillStyle = c.enemy ? '#ff3030' : c.color || '#fff'; x.fill();
      if (me) { x.lineWidth = 1.5; x.strokeStyle = '#fff'; x.stroke(); }
    }
    for (const p of typeof pings !== 'undefined' ? pings : []) { x.beginPath(); x.arc(ox + (p.x + .5) * k, oy + (p.y + .5) * k, 5, 0, Math.PI * 2); x.strokeStyle = '#ffd23c'; x.lineWidth = 2; x.stroke(); }
    const v = g.MUNDO.view, a = g.MUNDO.axes(), cx = ox + v.tx * k, cy = oy + v.tz * k;
    x.save(); x.translate(cx, cy); x.rotate(Math.atan2(a.fwd.z, a.fwd.x) + Math.PI / 2);
    x.beginPath(); x.moveTo(0, -8); x.lineTo(5, 0); x.lineTo(0, 6); x.lineTo(-5, 0); x.closePath(); x.lineWidth = 1.5; x.strokeStyle = '#fff'; x.stroke(); x.fillStyle = '#ffffff40'; x.fill(); x.restore();
  }
  setInterval(() => { if (lay && !lay.hidden && !lay.classList.contains('gm')) try { drawMap(); } catch (e) { console.warn('Minimapa:', e); } }, 200);

  // ----- por quadro (mundo3d.js chama dentro do laço) -----
  function tick(now = performance.now()) {
    const s = st(), slot = document.querySelector('[data-mundo]'); if (!s || !slot || s.battle?.active || !g.MUNDO?.el) { off(); return; }
    layer(); if (lay.hidden) { lay.hidden = false; rectT = 0; lay.classList.toggle('gm', typeof role !== 'undefined' && role === 'gm'); } // o mestre tem o editor: sem minimapa nem faixa
    if (now - rectT > 250) { rectT = now; caixa(); rect = slot.getBoundingClientRect(); }
    const cur = g.MUNDO.cur?.(), f = cur?.f;
    menuTick(); lay.classList.toggle('menu', menuOn); goal(cur?.w); drawTags(s, f, rect, now); drawPings(f, rect);
    const me = s.chars[meId()], d = me?.pos && f && me.pos.f === f.id && P().decode(P().cell(f, Math.floor(me.pos.x), Math.floor(me.pos.z)));
    lay.classList.toggle('perigo', d?.tipo === 'perigo');
  }

  g.MHUD = { on, prompt, html, tick, off, menuSet, get menu() { return menuOn; }, get alvo() { return alvo; }, get aberto() { return !!(dlg || placa); }, get dlg() { return dlg; }, get chat() { return chatOn; }, rotulo };
})(globalThis);

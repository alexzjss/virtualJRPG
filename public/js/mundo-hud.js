// ===== mundo 3D: HUD da exploração — prompt do E, caixa de diálogo do NPC e placa =====
// Mora fora do #app (fixo no body), então o render() não apaga. O nucleo.js entrega { t:'dlg' } e { t:'placa' } em MHUD.on(m);
// o mundo-input.js chama MHUD.prompt(obj) com o objeto que o E usaria (ou null).
// Diálogo: quem abriu escolhe (1 a 6 ou clique) e encerra; quem está perto só lê (ro); o mestre lê, fala como o NPC e encerra.
(g => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const isGm = () => typeof role !== 'undefined' && role === 'gm';
  const typing = () => document.activeElement?.matches?.('input,textarea,select,[contenteditable],[contenteditable] *');
  function send(o) { if (typeof ws !== 'undefined' && ws?.readyState === 1) ws.send(JSON.stringify(o)); }
  let root = null, alvo = null, pKey = '', dlg = null, placa = null;
  // a HUD fica sobre a área do 3D ([data-mundo]), não sobre o chat ao lado
  const caixa = () => { const r = document.querySelector('[data-mundo]')?.getBoundingClientRect(); if (!root || !r?.width) return; const st = root.style; st.setProperty('--mc', r.left + r.width / 2 + 'px'); st.setProperty('--mw', r.width + 'px'); st.setProperty('--mb', Math.max(0, innerHeight - r.bottom) + 'px'); };
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

  g.MHUD = { on, prompt, get alvo() { return alvo; }, get aberto() { return !!(dlg || placa); }, get dlg() { return dlg; }, rotulo };
})(globalThis);

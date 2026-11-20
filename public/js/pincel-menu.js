// ===== Menu de pausa do jogador na UI Pincelada (só com body.ui-pincel) =====
// Tab ou Esc fora da batalha abrem o menu: o mundo fica borrado atrás, a arte do herói grande à esquerda, abas Ficha, Skills, Itens,
// Ofícios e Diário no alto e um painel com recursos e atributos à direita. O conteúdo de cada aba é a página que o jogo já tem
// (pageHtml de paginas.js), repintada em pincel.css; fica dentro do #app para os cliques, campos e a mandala continuarem funcionando.
// Vale no mapa 2D e no mundo 3D (no mundo, entra antes do menu de mundo-hud.js).
(g => {
  const on = () => typeof PC !== 'undefined' && PC.on() && typeof role !== 'undefined' && role === 'player';
  const E = s => PC.esc(s);
  const ABAS = [['pers', 'Ficha'], ['hab', 'Skills'], ['itens', 'Itens'], ['ofi', 'Ofícios'], ['hist', 'Diário']];
  let aberto = false, aba = 'pers', rolagem = 0, ultimo = '', entra = 0;
  const meus = () => Object.values(S.chars).filter(c => !c.enemy && mine(c));
  const heroi = () => { const L = meus(); return L.find(c => c.id === selCh) || L[0]; };
  const arte = c => { try { const s = PALCO3D.imgSrc(c, 'f'); return s?.fallback ? '' : s?.url || ''; } catch { return c.imgF || c.img || ''; } };
  const rosto = c => { try { const s = PALCO3D.imgSrc(c, 'p'); if (!s.fallback) return `<img src="${E(s.url)}" alt="" draggable="false">`; } catch {} return `<i>${E((c.name || '?')[0])}</i>`; };
  const pct = (a, b) => Math.round(Math.max(0, Math.min(100, 100 * a / (b || 1))));
  const painel = c => {
    const R = [['Vida', c.hp, c.hpMax, 'hp'], ['Aura', c.aura, c.auraMax, 'aura'], ['Sanidade', c.san, c.sanMax, 'san']];
    return `<aside class="pcm-stats" aria-label="Estado de ${E(c.name)}"><h2>${E(c.name)}</h2>
      <h4>Recursos</h4><dl>${R.map(([k, v, m, cls]) => `<dt>${k}</dt><dd><span class="pc-num">${v}<small> / ${m}</small></span><i class="b ${cls}"><i style="width:${pct(v, m)}%"></i></i></dd>`).join('')}<dt>Limite</dt><dd><span class="pc-num">${c.limit}%</span></dd></dl>
      <h4>Atributos</h4><dl class="at">${A.map(k => `<dt title="${E(ATN[k])}">${k}</dt><dd class="pc-num">${at(c, k)}</dd>`).join('')}</dl>
      <h4>Condições</h4><div class="conds">${(c.hp > 0 && stIcons(c)) || '<i class="vazio">Nenhuma</i>'}</div>
      <p class="bolsa"><span>Ouro <b class="pc-num">${c.gold ?? 0}</b></span><span>XP para gastar <b class="pc-num">${c.xp ?? 0}</b></span></p></aside>`; };
  const html = () => { const c = heroi(); if (!c) return '';
    const fig = arte(c), L = meus();
    return `<div class="pcm-menu${Date.now() - entra < 200 ? ' entra' : ''}" role="dialog" aria-modal="true" aria-label="Menu de ${E(c.name)}"><div class="veu" aria-hidden="true"></div>
      ${fig ? `<img class="arte" src="${E(fig)}" alt="" draggable="false">` : `<b class="arte vazia" aria-hidden="true">${E((c.name || '?')[0])}</b>`}
      <header class="topo">${L.length > 1 ? `<div class="grupo" aria-label="Heróis">${L.map(x => `<button type="button" class="${x === c ? 'on' : ''}" data-pmn="h" data-id="${x.id}" style="--c:${E(x.color)}" title="${E(x.name)}" aria-pressed="${x === c}">${rosto(x)}</button>`).join('')}</div>` : ''}
        <nav class="abas" aria-label="Menu">${ABAS.map(([k, l]) => `<button type="button" class="${aba === k ? 'on' : ''}" data-pmn="aba" data-k="${k}" aria-current="${aba === k ? 'page' : 'false'}">${l}</button>`).join('<span aria-hidden="true">◆</span>')}</nav>
        <button type="button" class="fecha" data-pmn="x" aria-label="Fechar o menu">Voltar <kbd class="pc-k">Tab</kbd></button></header>
      <div class="pagina pg-${aba}">${pageHtml(aba, c)}</div>${painel(c)}</div>`; };
  // monta no fim do #app depois de cada render (o app refaz o HTML quando muda; aí o menu volta junto)
  const monta = () => {
    const velho = app.querySelector(':scope > .pcm-menu');
    if (!aberto || !on() || S?.battle?.active) { velho?.remove(); if (aberto && S?.battle?.active) aberto = false; document.body.classList.remove('pcm-menu-on'); return; }
    const h = html(); if (velho && h === ultimo) return;
    if (velho) rolagem = velho.querySelector('.pagina')?.scrollTop || rolagem;
    velho?.remove(); ultimo = h; app.insertAdjacentHTML('beforeend', h); document.body.classList.add('pcm-menu-on');
    const p = app.querySelector(':scope > .pcm-menu .pagina'); if (p) p.scrollTop = rolagem;
    // mandala (aba Skills): a mesma montagem do fim do render de tela.js, agora no canvas do menu
    if (aba === 'hab' && typeof skMount !== 'undefined' && skMount && typeof MANDALA !== 'undefined') { const m = app.querySelector(`:scope > .pcm-menu .skmap[data-cid="${skMount.key}"]`); if (m) { MANDALA.mount(m, skMount); skMount.fresh.forEach(id => MANDALA.learned(id)); } }
  };
  const abre = v => { if (v === aberto) return; aberto = v; ultimo = ''; rolagem = 0; if (v) { entra = Date.now(); g.MINPUT?.clear?.(); g.MHUD?.menuSet?.(false); } render(); if (v) app.querySelector('.pcm-menu .abas .on')?.focus({ preventScroll: true }); };
  g.PCMENU = { on, get aberto() { return aberto; }, abre };
  if (typeof document === 'undefined') return;
  const r0 = render; render = function () { r0(); try { monta(); } catch (e) { console.error(e); } };
  document.addEventListener('scroll', e => { if (e.target.classList?.contains('pagina') && e.target.closest('.pcm-menu')) rolagem = e.target.scrollTop; }, true);
  document.addEventListener('click', e => { const b = e.target.closest('[data-pmn]'); if (!b || !on()) return; e.preventDefault();
    const k = b.dataset.pmn;
    if (k === 'x') return abre(false);
    if (k === 'aba' && b.dataset.k !== aba) { aba = b.dataset.k; rolagem = 0; ultimo = ''; return render(); }
    if (k === 'h') { selCh = b.dataset.id; ultimo = ''; return render(); } });
  const digitando = t => t?.matches?.('input,textarea,select,[contenteditable]');
  const tampa = () => document.querySelector('.dlg-bg,.regras,.modal,.pal,.mz-modal,.mh-dlg,.mh-placa') || (typeof meOpen !== 'undefined' && meOpen) || (typeof rollDlg !== 'undefined' && rollDlg);
  addEventListener('keydown', e => {
    if (!on() || e.ctrlKey || e.metaKey || e.altKey || S?.battle?.active) return;
    if (e.key !== 'Tab' && e.key !== 'Escape') return;
    if (aberto) { if (e.key === 'Tab' && digitando(e.target)) return; if (e.key === 'Escape' && digitando(e.target)) { e.target.blur(); e.preventDefault(); return; }
      e.preventDefault(); e.stopImmediatePropagation(); return abre(false); }
    if (digitando(e.target) || tampa() || g.MHUD?.aberto) return;
    e.preventDefault(); e.stopImmediatePropagation(); abre(true);
  }, true);
  // ←/→ trocam de aba com o menu aberto (fora de campos)
  addEventListener('keydown', e => { if (!aberto || !on() || digitando(e.target) || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.target.closest?.('.skmap')) return;
    const i = ABAS.findIndex(([k]) => k === aba), n = ABAS.length; aba = ABAS[(i + (e.key === 'ArrowLeft' ? n - 1 : 1)) % n][0]; rolagem = 0; ultimo = ''; e.preventDefault(); render(); app.querySelector('.pcm-menu .abas .on')?.focus({ preventScroll: true }); });
})(globalThis);

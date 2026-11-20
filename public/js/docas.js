// As ferramentas ficam no menu; a lateral direita acompanha a sessão.
const GTOOLS = {
  'Durante a sessão': ['cena', 'som', 'chase'],
  'Catálogo': ['best', 'items', 'skills', 'ofcat', 'armas'],
  'Gestão': ['sessao', 'camp'],
};
const LTABS = Object.values(GTOOLS).flat(), FOLLOW_TABS = ['fichas', 'ini', 'chat'], RTABS = [...FOLLOW_TABS, 'pedidos'];
const WIDE = new Set(['best', 'skills', 'items', 'ofcat', 'armas']); // painéis largos: abrem por cima do centro (o botão ⇥ encolhe)
const GUI0 = { L: 'cena', R: 'fichas', follow: 'fichas', lo: null, ro: null, lastSide: 'L', view: 'mapa', w: { L: 340, R: 380 }, nar: {}, sheet: null, battleSides: null };
let gui = (() => { try { const d = JSON.parse(localStorage.vj_gui || 'null'); if (d && typeof d === 'object') return { ...structuredClone(GUI0), ...d, w: { ...GUI0.w, ...d.w }, sheet: null }; } catch {} return structuredClone(GUI0); })();
let gres = null;
const saveGui = () => { try { localStorage.vj_gui = JSON.stringify({ ...gui, sheet: null }); } catch {} };
const GNARROW = 1100;
function sideOpen(s) {
  if (innerWidth < GNARROW && gui.lo && gui.ro) return s === gui.lastSide;
  return !!gui[s === 'L' ? 'lo' : 'ro'];
}
function setSide(s, on) {
  gui[s === 'L' ? 'lo' : 'ro'] = !!on;
  if (on) gui.lastSide = s;
  if (on && innerWidth < GNARROW) gui[s === 'L' ? 'ro' : 'lo'] = false;
  saveGui();
}
const TITLES = { pedidos: 'Pedidos' };
const tabTitle = k => k.startsWith('f_') ? (ent(k.slice(2))?.name || '?') + (S.chars[k.slice(2)] ? '' : ' · modelo') : TITLES[k] || WIN[k]?.[0] || k;
// abre um painel (mostra a lateral certa) ou uma ficha (janela por cima de tudo)
function gOpen(k) {
  if (k.startsWith('f_')) gui.sheet = k;
  else if (RTABS.includes(k)) { gui.R = k; if (FOLLOW_TABS.includes(k)) gui.follow = k; setSide('R', true); }
  else { gui.L = k; delete gui.nar[k]; setSide('L', true); }
  saveGui();
}
function gClose(k) { if (gui.sheet === k) gui.sheet = null; }
// Esc: fecha a ficha; depois encolhe o painel largo da frente
function gEsc() {
  if (gui.sheet) { gui.sheet = null; return true; }
  if (sideOpen('L') && WIDE.has(gui.L) && !gui.nar[gui.L]) { gui.nar[gui.L] = 1; saveGui(); return true; }
  return false;
}
// arruma o estado antes de desenhar: o que está à mostra é o que se calcula
function dockFix() {
  if (!LTABS.includes(gui.L)) gui.L = 'cena';
  if (!RTABS.includes(gui.R)) gui.R = 'fichas';
  if (FOLLOW_TABS.includes(gui.R)) gui.follow = gui.R;
  else if (!FOLLOW_TABS.includes(gui.follow)) gui.follow = 'fichas';
  if (gui.sheet && !ent(gui.sheet.slice(2))) gui.sheet = null;
  const lo = sideOpen('L'), ro = sideOpen('R');
  for (const k of Object.keys(WIN)) if (wins[k]) wins[k].open = (gui.L === k && lo) || (gui.R === k && ro);
}
// body = { idDoPainel: html }; center = { parts: { stage, bar } | null, map }
function gmLayout(body, center) {
  const W = innerWidth, lo = sideOpen('L'), ro = sideOpen('R'), wide = lo && WIDE.has(gui.L) && !gui.nar[gui.L], inB = !!center.parts;
  const wl = lo ? dockWidth('L', gui.w.L) : 0, wr = ro ? dockWidth('R', gui.w.R) : 0;
  const nReq = Object.keys(S.reqs).length, view = gui.view, scene = S.scenes[S.scene];
  const tools = `<details class="gtools"><summary>Ferramentas</summary><div class="gtools-menu">
    ${Object.entries(GTOOLS).map(([label, keys]) => `<section aria-label="${label}"><h2>${label}</h2>${keys.map(k => `<button data-g="panel" data-id="${k}" aria-pressed="${lo && gui.L === k}">${esc(tabTitle(k))}</button>`).join('')}</section>`).join('')}
    <section aria-label="Painéis da sessão"><h2>Painéis da sessão</h2><button data-g="panel" data-id="${gui.follow}" aria-pressed="${ro && gui.R === gui.follow}">Fichas, iniciativa e registro</button></section>
    <div class="gutilities"></div>
  </div></details>`;
  const battleElsewhere = !inB && Object.values(S.scenes).some(o => o.battle?.active);
  const views = [['mesa', 'Mesa', 'Q', battleElsewhere && 'Batalha em outra cena'], ['mapa', (typeof mundoOn === 'function' && mundoOn() ? 'Mundo' : 'Mapa'), 'M'], ['palco', 'Palco', 'P', inB && 'Batalha em andamento']];
  const top = `<header class="gtop">
    <div class="gscene"><small>${S.paused ? 'Mesa pausada' : 'Cena em foco'}</small><strong title="${esc(scene.name)}">${esc(scene.name)}</strong></div>
    <nav class="gviews" aria-label="Área de trabalho">${views.map(([id, label, key, status]) => `<button class="gv ${view === id ? 'on' : ''}" aria-pressed="${view === id}" data-g="view" data-v="${id}" title="${label} (${key})${status ? ' · ' + status : ''}">${label}${status ? ` <i class="live" role="img" aria-label="${status}"></i>` : ''}</button>`).join('')}</nav>
    <div class="gactions"><button class="grequests ${nReq ? 'alert' : ''}" data-g="rtab" data-id="pedidos" aria-pressed="${ro && gui.R === 'pedidos'}">Pedidos${nReq ? `<em class="gbdg">${nReq}</em>` : ''}</button>
      <button type="button" data-regras aria-haspopup="dialog" title="Guia de regras (?)">Regras</button>${tools}</div></header>`;
  const lp = lo ? `<section class="gpanel" data-win="${gui.L}"><header class="gph"><b>${esc(tabTitle(gui.L))}</b>${WIDE.has(gui.L) ? `<button class="gwide" data-g="wide" data-id="${gui.L}" title="${wide ? 'Encolher para a largura do painel' : 'Abrir por cima do centro'}" aria-label="Alternar largura">${wide ? '⇤' : '⇥'}</button>` : ''}<button class="gwide" data-g="side" data-side="L" title="Recolher ( [ )" aria-label="Recolher painel">‹</button></header><div class="win-body gbody" data-win="${gui.L}">${body[gui.L] ?? ''}</div></section>` : '';
  const pendingRequests = gui.R === 'pedidos';
  const rp = ro ? `<div class="${pendingRequests ? 'gph' : 'gtabs'}">${pendingRequests ? '<b>Pedidos</b>' : `<nav aria-label="Acompanhamento da sessão">${FOLLOW_TABS.map(k => `<button class="gtab ${k === gui.R ? 'on' : ''}" aria-pressed="${k === gui.R}" data-g="rtab" data-id="${k}">${esc(tabTitle(k))}</button>`).join('')}</nav>`}<button class="gwide" data-g="side" data-side="R" title="Recolher ( ] )" aria-label="Recolher barra lateral">›</button></div>
      <div class="win-body gbody" data-win="${gui.R}">${body[gui.R] ?? ''}</div>` : '';
  const stage = center.parts ? `<div class="gstage">${center.parts.stage}</div>` : `<div class="gempty"><b>Nenhuma batalha em andamento</b><button class="own" data-a="battle" data-on="1">Iniciar batalha</button></div>`;
  const sh = gui.sheet && ent(gui.sheet.slice(2));
  const sheet = sh ? `<div class="gsheet-bg" data-g="sheetbg"><section class="gsheet" role="dialog" aria-modal="true" aria-label="Ficha de ${esc(sh.name)}"><header><b>${esc(tabTitle(gui.sheet))}</b><small>Esc fecha</small><button class="gs-x" data-g="x" data-id="${gui.sheet}" title="Fechar a ficha (Esc)" aria-label="Fechar ficha">✕ Fechar</button></header><div class="gs-body">${body[gui.sheet] ?? ''}</div></section></div>` : '';
  const combatFocus = inB && view === 'palco';
  return `<div class="gms ${combatFocus ? 'combat-focus' : ''} ${wide ? 'lwide' : ''} ${lo ? '' : 'lnone'} ${ro ? '' : 'rnone'}" style="--wl:${wl}px;--wr:${wr}px" ${sh ? 'inert' : ''}>${top}<aside class="gside L" aria-label="Painel esquerdo">${lp}${lo && !wide && W >= GNARROW ? '<i class="gres" data-g="res" data-side="L" title="Arraste para mudar a largura"></i>' : ''}</aside>
    <main class="gcenter">${center.parts?.bar || ''}<div class="gview" data-view="${view}">${view === 'mesa' ? center.mesa : view === 'palco' ? stage : `<div class="gmap">${center.map}</div>`}</div></main>
    <aside class="gside R" aria-label="Barra lateral">${rp}${ro && W >= GNARROW ? '<i class="gres" data-g="res" data-side="R" title="Arraste para mudar a largura"></i>' : ''}</aside></div>${sheet}`;
}
const dockWidth = (side, width) => Math.round(Math.max(side === 'L' ? 240 : 260, Math.min(innerWidth * .3, width)));
const gView = v => { gui.view = v; saveGui(); render(); };
// Mantém o foco na navegação durante os redesenhos e leva o foco para a ficha ao abrir.
let lastSheet = null;
function closeGTools(focus = false) {
  const tools = app.querySelector('.gtools[open]');
  if (!tools) return false;
  tools.open = false;
  if (focus) tools.querySelector('summary').focus();
  return true;
}
{
  const r1 = render;
  render = function () {
    const active = gm && document.activeElement;
    const nav = active && active.closest('.gtop');
    const tools = gm && app.querySelector('.gtools');
    r1();
    if (!gm) return;
    const currentTools = app.querySelector('.gtools');
    if (tools && currentTools && !tools.isConnected && !gui.sheet) currentTools.open = tools.open;
    if (gui.sheet && gui.sheet !== lastSheet) app.querySelector('.gs-x')?.focus();
    else if (nav && !active.isConnected && active.dataset.g) {
      const selector = Object.entries(active.dataset).map(([key, value]) => `[data-${key}="${CSS.escape(value)}"]`).join('');
      app.querySelector(`.gtop button${selector}`)?.focus({ preventScroll: true });
    } else if (active === tools?.firstElementChild && !active.isConnected) currentTools?.querySelector('summary').focus();
    lastSheet = gui.sheet;
  };
}

// ===== interações =====
if (gm) document.addEventListener('click', e => { if (!e.target.closest('.gtools')) closeGTools(); }, true);
app.addEventListener('click', e => {
  const g = e.target.closest('[data-g]'); if (!g || !gm) return;
  const k = g.dataset.id, a = g.dataset.g;
  if (a === 'sheetbg') { if (e.target === g) { gui.sheet = null; render(); } return; }
  if (a === 'x') { e.stopPropagation(); gClose(k); return render(); }
  if (a === 'more') { e.stopPropagation(); const r = g.getBoundingClientRect(); ctx = ctx?.id === k ? null : { id: k, x: r.left, y: r.bottom + 4 }; return render(); } // ⋯ do cartão: o mesmo menu do botão direito
  if (a === 'panel') { closeGTools(true); gOpen(k); return render(); }
  if (a === 'rtab') { if (k === 'pedidos' && sideOpen('R') && gui.R === k) setSide('R', false); else gOpen(k); return render(); }
  if (a === 'side') { setSide(g.dataset.side, !sideOpen(g.dataset.side)); return render(); }
  if (a === 'view') return gView(g.dataset.v);
  if (a === 'wide') { if (gui.nar[k]) delete gui.nar[k]; else gui.nar[k] = 1; saveGui(); return render(); }
}, true);
app.addEventListener('contextmenu', e => { const c = gm && e.target.closest('.scard'); if (!c || e.target.closest('input,textarea')) return; e.preventDefault(); ctx = { id: c.dataset.id, x: e.clientX, y: e.clientY }; render(); });
// Atalhos da área de trabalho e dos painéis.
document.addEventListener('keydown', e => {
  if (!gm || !S || ((e.ctrlKey || e.metaKey || e.altKey) && !e.getModifierState?.('AltGraph')) || e.defaultPrevented || e.target.matches?.('input,textarea,select,[contenteditable]') || document.querySelector('.dlg-bg')) return;
  if (gui.sheet) return;
  const k = e.key.toLowerCase(), br = k === '[' || e.code === 'BracketLeft' ? 'L' : k === ']' || e.code === 'BracketRight' ? 'R' : ''; // no teclado ABNT2 o [ e o ] saem com AltGr: vale também a tecla física
  if (k === 'escape' && closeGTools(true)) { e.preventDefault(); return; }
  if (br) { e.preventDefault(); setSide(br, !sideOpen(br)); return render(); }
  if (k === 'p' || k === 'm' || k === 'q') { e.preventDefault(); return gView(k === 'p' ? 'palco' : k === 'q' ? 'mesa' : 'mapa'); }
});
// larguras das laterais: arrasta direto no DOM e só salva e redesenha ao soltar
app.addEventListener('pointerdown', e => {
  const h = e.target.closest('[data-g=res]'); if (!h || !gm) return;
  e.preventDefault(); h.setPointerCapture?.(e.pointerId);
  gres = { side: h.dataset.side, el: h.closest('.gms'), x: e.clientX, width: h.closest('.gside').offsetWidth }; document.body.classList.add('gresizing');
});
addEventListener('pointermove', e => {
  if (!gres) return;
  const w = dockWidth(gres.side, gres.width + (e.clientX - gres.x) * (gres.side === 'L' ? 1 : -1));
  gui.w[gres.side] = w; gres.el.style.setProperty(gres.side === 'L' ? '--wl' : '--wr', w + 'px');
});
function finishDockResize() { if (!gres) return; gres = null; document.body.classList.remove('gresizing'); saveGui(); render(); }
addEventListener('pointerup', finishDockResize);
addEventListener('pointercancel', finishDockResize);

// ===== seções "Mais…": o que fica aberto sobrevive aos redesenhos e ao recarregar =====
const maisOpen = new Set((() => { try { return JSON.parse(localStorage.vj_mais || '[]'); } catch { return []; } })());
const maisO = k => maisOpen.has(k) ? 'open' : '';
app.addEventListener('toggle', e => { const d = e.target; if (!d.matches?.('details[data-mais]')) return; d.open ? maisOpen.add(d.dataset.mais) : maisOpen.delete(d.dataset.mais); try { localStorage.vj_mais = JSON.stringify([...maisOpen]); } catch {} }, true);

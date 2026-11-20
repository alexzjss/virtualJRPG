// ===== layout do mestre: trilho de ícones + painel à esquerda, centro com Palco/Mapa, barra lateral com abas à direita =====
// Esquerda: um botão por painel no trilho (estilo Discord); clicar abre o painel e clicar no ativo recolhe.
// Direita: uma barra lateral só, com abas (estilo Foundry): Fichas, Iniciativa, Chat e Pedidos.
// Centro: Palco ou Mapa, um por vez (Tab, P, M); a barra de ações da batalha fica sempre acima. Fichas abrem em janela própria, por cima de tudo.
// O arranjo fica no navegador; abaixo de 1100px as laterais começam recolhidas.
const LTABS = ['cena', 'sessao', 'best', 'items', 'skills', 'ofcat', 'armas', 'chase', 'camp', 'som'], RTABS = ['fichas', 'ini', 'chat', 'pedidos'];
const WIDE = new Set(['best', 'skills', 'items', 'ofcat', 'armas']); // painéis largos: abrem por cima do centro (o botão ⇥ encolhe)
const RICO = { cena: ['🎬', 'Cena'], sessao: ['📜', 'Sessão'], best: ['👹', 'Bestiário'], items: ['🎒', 'Itens'], skills: ['✨', 'Skills'], ofcat: ['🛠', 'Ofícios'], armas: ['⚔', 'Forja'], chase: ['🏃', 'Fuga'], camp: ['⛺', 'Campanha'], som: ['🎵', 'Som'] };
const GUI0 = { L: 'cena', R: 'fichas', lo: null, ro: null, view: 'mapa', w: { L: 340, R: 380 }, nar: {}, sheet: null, battleSides: null }; // lo/ro: null = automático (aberto só a partir de 1100px)
let gui = (() => { try { const d = JSON.parse(localStorage.vj_gui || 'null'); if (d && typeof d === 'object') return { ...structuredClone(GUI0), ...d, w: { ...GUI0.w, ...d.w }, sheet: null }; } catch {} return structuredClone(GUI0); })();
let gdragTab = null, gres = null; // gdragTab fica só porque render() consulta (não há mais abas arrastáveis)
const saveGui = () => { try { localStorage.vj_gui = JSON.stringify({ ...gui, sheet: null }); } catch {} };
const sideOpen = s => gui[s === 'L' ? 'lo' : 'ro'] ?? innerWidth >= 1100;
function setSide(s, on) {
  gui[s === 'L' ? 'lo' : 'ro'] = !!on;
  if (on && innerWidth < 1100) gui[s === 'L' ? 'ro' : 'lo'] = false; // em tela estreita só uma lateral por vez
  saveGui();
}
const TITLES = { pedidos: 'Pedidos' };
const tabTitle = k => k.startsWith('f_') ? (ent(k.slice(2))?.name || '?') + (S.chars[k.slice(2)] ? '' : ' · modelo') : TITLES[k] || WIN[k]?.[0] || k;
// abre um painel (mostra a lateral certa) ou uma ficha (janela por cima de tudo)
function gOpen(k) {
  if (k.startsWith('f_')) gui.sheet = k;
  else if (RTABS.includes(k)) { gui.R = k; setSide('R', true); }
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
  if (gui.sheet && !ent(gui.sheet.slice(2))) gui.sheet = null;
  const lo = sideOpen('L'), ro = sideOpen('R');
  for (const k of Object.keys(WIN)) if (wins[k]) wins[k].open = (gui.L === k && lo) || (gui.R === k && ro);
}
// body = { idDoPainel: html }; center = { parts: { stage, bar } | null, map }
function gmLayout(body, center) {
  const W = innerWidth, lo = sideOpen('L'), ro = sideOpen('R'), wide = lo && WIDE.has(gui.L) && !gui.nar[gui.L], inB = !!center.parts;
  const wl = lo ? Math.round(Math.min(gui.w.L, Math.max(240, W * .3))) : 0, wr = ro ? Math.round(Math.min(gui.w.R, Math.max(260, W * .3))) : 0;
  document.documentElement.style.setProperty('--gwl', wl + 'px'); document.documentElement.style.setProperty('--gwr', wr + 'px');
  const nReq = Object.keys(S.reqs).length, view = gui.view === 'mesa' ? 'mesa' : inB || gui.view === 'mapa' ? gui.view : 'mapa';
  const rail = `<nav class="grail" aria-label="Painéis do mestre">${LTABS.map(k => `<button class="gr ${lo && gui.L === k ? 'on' : ''}" data-g="rail" data-id="${k}" title="${esc(tabTitle(k))}" aria-label="${esc(tabTitle(k))}" aria-pressed="${lo && gui.L === k}"><span class="gi">${RICO[k]?.[0] || '•'}</span><span class="gl">${esc(RICO[k]?.[1] || tabTitle(k))}</span></button>`).join('')}</nav>`;
  const top = `<header class="gtop"><button class="gt-b ${lo ? 'on' : ''}" data-g="side" data-side="L" title="Mostrar ou recolher o painel esquerdo ( [ )" aria-label="Painel esquerdo" aria-pressed="${lo}">◧</button><span class="gt-title">Mestre</span>
    <div class="gviews" role="tablist" aria-label="Centro"><button role="tab" class="gv ${view === 'mesa' ? 'on' : ''}" aria-selected="${view === 'mesa'}" data-g="view" data-v="mesa" title="Mesa: cenas e quem está em cada uma (Q)">Mesa${Object.values(S.scenes).some(o => o.battle?.active) && !inB ? ' <i class="live" title="Batalha em outra cena"></i>' : ''}</button><button role="tab" class="gv ${view === 'palco' ? 'on' : ''}" aria-selected="${view === 'palco'}" data-g="view" data-v="palco" title="Palco (P)">Palco${inB ? ' <i class="live" title="Batalha em andamento"></i>' : ''}</button><button role="tab" class="gv ${view === 'mapa' ? 'on' : ''}" aria-selected="${view === 'mapa'}" data-g="view" data-v="mapa" title="${(typeof mundoOn === 'function' && mundoOn() ? 'Mundo' : 'Mapa')} (M)">${(typeof mundoOn === 'function' && mundoOn() ? 'Mundo' : 'Mapa')}</button></div>
    <span class="gt-sp"></span><button class="gt-b ${ro ? 'on' : ''}" data-g="side" data-side="R" title="Mostrar ou recolher a barra lateral ( ] )" aria-label="Barra lateral" aria-pressed="${ro}">◨${!ro && nReq ? `<em class="gbdg">${nReq}</em>` : ''}</button></header>`;
  const lp = lo ? `<section class="gpanel" data-win="${gui.L}"><header class="gph"><b>${esc(tabTitle(gui.L))}</b>${WIDE.has(gui.L) ? `<button class="gwide" data-g="wide" data-id="${gui.L}" title="${wide ? 'Encolher para a largura do painel' : 'Abrir por cima do centro'}" aria-label="Alternar largura">${wide ? '⇤' : '⇥'}</button>` : ''}<button class="gwide" data-g="side" data-side="L" title="Recolher ( [ )" aria-label="Recolher painel">‹</button></header><div class="win-body gbody" data-win="${gui.L}">${body[gui.L] ?? ''}</div></section>` : '';
  const rp = ro ? `<nav class="gtabs" role="tablist" aria-label="Barra lateral">${RTABS.map(k => `<button class="gtab ${k === gui.R ? 'on' : ''} ${k === 'pedidos' && nReq ? 'alert' : ''}" role="tab" aria-selected="${k === gui.R}" data-g="rtab" data-id="${k}">${esc(tabTitle(k))}${k === 'pedidos' && nReq ? `<em class="gbdg">${nReq}</em>` : ''}</button>`).join('')}<button class="gwide" data-g="side" data-side="R" title="Recolher ( ] )" aria-label="Recolher barra lateral">›</button></nav>
      <div class="win-body gbody" data-win="${gui.R}">${body[gui.R] ?? ''}</div>` : '';
  const stage = center.parts ? `<div class="gstage">${center.parts.stage}</div>` : `<div class="gempty"><b>Nenhuma batalha em andamento</b><span>O palco mostra a batalha quando ela começa.</span><button class="own" data-a="battle" data-on="1">Iniciar batalha</button></div>`;
  const sh = gui.sheet && ent(gui.sheet.slice(2));
  const sheet = sh ? `<div class="gsheet-bg" data-g="sheetbg"><section class="gsheet" role="dialog" aria-modal="true" aria-label="Ficha de ${esc(sh.name)}"><header><b>${esc(tabTitle(gui.sheet))}</b><small>Esc fecha</small><button class="gs-x" data-g="x" data-id="${gui.sheet}" title="Fechar a ficha (Esc)" aria-label="Fechar ficha">✕ Fechar</button></header><div class="gs-body">${body[gui.sheet] ?? ''}</div></section></div>` : '';
  const combatFocus = inB && view === 'palco';
  return `<div class="gms ${combatFocus ? 'combat-focus' : ''} ${wide ? 'lwide' : ''} ${lo ? '' : 'lnone'} ${ro ? '' : 'rnone'}" style="--wl:${wl}px;--wr:${wr}px" ${sh ? 'inert' : ''}>${top}${rail}<aside class="gside L" aria-label="Painel esquerdo">${lp}${lo && !wide ? '<i class="gres" data-g="res" data-side="L" title="Arraste para mudar a largura"></i>' : ''}</aside>
    <main class="gcenter">${center.parts?.bar || ''}<div class="gview" data-view="${view}">${view === 'mesa' ? center.mesa : view === 'palco' ? stage : `<div class="gmap">${center.map}</div>`}</div></main>
    <aside class="gside R" aria-label="Barra lateral">${rp}${ro ? '<i class="gres" data-g="res" data-side="R" title="Arraste para mudar a largura"></i>' : ''}</aside></div>${sheet}`;
}
const gView = v => { gui.view = v; saveGui(); render(); };
// foca o botão de fechar quando uma ficha acaba de abrir
let lastSheet = null;
{ const r1 = render; render = function () { r1(); if (gm) { if (gui.sheet && gui.sheet !== lastSheet) app.querySelector('.gs-x')?.focus(); lastSheet = gui.sheet; } }; }

// ===== interações =====
app.addEventListener('click', e => {
  const g = e.target.closest('[data-g]'); if (!g || !gm) return;
  const k = g.dataset.id, a = g.dataset.g;
  if (a === 'sheetbg') { if (e.target === g) { gui.sheet = null; render(); } return; }
  if (a === 'x') { e.stopPropagation(); gClose(k); return render(); }
  if (a === 'more') { e.stopPropagation(); const r = g.getBoundingClientRect(); ctx = ctx?.id === k ? null : { id: k, x: r.left, y: r.bottom + 4 }; return render(); } // ⋯ do cartão: o mesmo menu do botão direito
  if (a === 'rail') { if (sideOpen('L') && gui.L === k) setSide('L', false); else { gui.L = k; delete gui.nar[k]; setSide('L', true); } return render(); }
  if (a === 'rtab') { gui.R = k; setSide('R', true); return render(); }
  if (a === 'side') { setSide(g.dataset.side, !sideOpen(g.dataset.side)); return render(); }
  if (a === 'view') return gView(g.dataset.v);
  if (a === 'wide') { if (gui.nar[k]) delete gui.nar[k]; else gui.nar[k] = 1; saveGui(); return render(); }
}, true);
app.addEventListener('contextmenu', e => { const c = gm && e.target.closest('.scard'); if (!c || e.target.closest('input,textarea')) return; e.preventDefault(); ctx = { id: c.dataset.id, x: e.clientX, y: e.clientY }; render(); });
// atalhos: [ e ] recolhem as laterais; P, M e Tab trocam o centro (Tab em batalha continua escolhendo o alvo)
document.addEventListener('keydown', e => {
  if (!gm || !S || ((e.ctrlKey || e.metaKey || e.altKey) && !e.getModifierState?.('AltGraph')) || e.defaultPrevented || e.target.matches?.('input,textarea,select,[contenteditable]') || document.querySelector('.dlg-bg')) return;
  if (gui.sheet) return;
  const k = e.key.toLowerCase(), br = k === '[' || e.code === 'BracketLeft' ? 'L' : k === ']' || e.code === 'BracketRight' ? 'R' : ''; // no teclado ABNT2 o [ e o ] saem com AltGr: vale também a tecla física
  if (br) { e.preventDefault(); setSide(br, !sideOpen(br)); return render(); }
  if (k === 'p' || k === 'm' || k === 'q') { e.preventDefault(); return gView(k === 'p' ? 'palco' : k === 'q' ? 'mesa' : 'mapa'); }
  if (e.key === 'Tab' && !e.shiftKey && !S.battle.active && (e.target === document.body || e.target === app || e.target.closest?.('.gmap'))) { e.preventDefault(); gView(gui.view === 'mapa' ? 'palco' : 'mapa'); }
});
// larguras das laterais: arrasta direto no DOM e só salva e redesenha ao soltar
app.addEventListener('pointerdown', e => {
  const h = e.target.closest('[data-g=res]'); if (!h || !gm) return;
  e.preventDefault(); h.setPointerCapture?.(e.pointerId);
  gres = { side: h.dataset.side, el: h.closest('.gms') }; document.body.classList.add('gresizing');
});
addEventListener('pointermove', e => {
  if (!gres) return;
  const w = Math.round(gres.side === 'L' ? Math.max(240, Math.min(innerWidth * .4, e.clientX - 52)) : Math.max(260, Math.min(innerWidth * .4, innerWidth - e.clientX)));
  gui.w[gres.side] = w; gres.el.style.setProperty(gres.side === 'L' ? '--wl' : '--wr', w + 'px');
});
addEventListener('pointerup', () => { if (!gres) return; gres = null; document.body.classList.remove('gresizing'); saveGui(); render(); });

// ===== seções "Mais…": o que fica aberto sobrevive aos redesenhos e ao recarregar =====
const maisOpen = new Set((() => { try { return JSON.parse(localStorage.vj_mais || '[]'); } catch { return []; } })());
const maisO = k => maisOpen.has(k) ? 'open' : '';
app.addEventListener('toggle', e => { const d = e.target; if (!d.matches?.('details[data-mais]')) return; d.open ? maisOpen.add(d.dataset.mais) : maisOpen.delete(d.dataset.mais); try { localStorage.vj_mais = JSON.stringify([...maisOpen]); } catch {} }, true);

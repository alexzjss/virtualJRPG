// ===== painéis fixos do mestre =====
// As janelas viraram abas presas em quatro docas: duas à esquerda (L0 em cima, L1 embaixo) e duas à direita.
// O mestre arrasta as abas de uma doca para outra; o arranjo, as larguras e a divisão palco/mapa ficam no navegador.
// No centro: o mapa; em batalha, o palco em cima, a barra de ações do inimigo logo abaixo e o mapa embaixo.
const DOCK0 = { L0: ['cena', 'sessao', 'best', 'items', 'skills', 'ofcat', 'armas', 'chase', 'camp', 'som'], L1: [], R0: ['fichas', 'ini'], R1: ['chat'], act: {}, w: { L: 340, R: 380 }, split: .56, nar: {} };
const DOCKS = ['L0', 'L1', 'R0', 'R1'];
const WIDE = new Set(['best', 'skills', 'items', 'ofcat', 'armas']); // abas largas: abrem por cima do centro
let dock = (() => { try { const d = JSON.parse(localStorage.vj_dock || 'null'); if (d && DOCKS.every(k => Array.isArray(d[k]))) return { ...structuredClone(DOCK0), ...d }; } catch {} return structuredClone(DOCK0); })();
let gdragTab = null, gres = null;
const saveDock = () => { try { localStorage.vj_dock = JSON.stringify(dock); } catch {} };
const isWide = k => (WIDE.has(k) || k.startsWith('f_')) && !dock.nar[k];
const dockOf = k => DOCKS.find(d => dock[d].includes(k));
const tabTitle = k => k.startsWith('f_') ? (ent(k.slice(2))?.name || '?') + (S.chars[k.slice(2)] ? '' : ' · modelo') : WIN[k]?.[0] || k;
// abre uma aba (janela ou ficha): se ainda não está em nenhuma doca, entra na da direita de cima (fichas) ou na da esquerda
function gOpen(k) {
  let d = dockOf(k);
  if (!d) { d = k.startsWith('f_') ? (dockOf('fichas') || 'R0') : 'L0'; dock[d].push(k); }
  dock.act[d] = k; saveDock();
}
function gClose(k) { const d = dockOf(k); if (!d) return; dock[d] = dock[d].filter(x => x !== k); if (dock.act[d] === k) dock.act[d] = dock[d][0]; saveDock(); }
// arruma as docas antes de desenhar: toda janela conhecida tem lugar, fichas apagadas somem, cada doca tem uma aba ativa
function dockFix() {
  const known = k => k.startsWith('f_') ? !!ent(k.slice(2)) : k in WIN && k !== 'batalha';
  for (const d of DOCKS) dock[d] = [...new Set(dock[d].filter(known))];
  for (const k of Object.keys(WIN)) if (k !== 'batalha' && !dockOf(k)) dock.L0.push(k);
  for (const d of DOCKS) if (!dock[d].includes(dock.act[d])) dock.act[d] = dock[d][0];
  for (const k of Object.keys(WIN)) if (wins[k]) wins[k].open = DOCKS.some(d => dock.act[d] === k); // o que está à mostra é o que se calcula
}
// desenha as docas e o centro; body = { idDaAba: html }
function gmLayout(body, center) {
  const W = innerWidth, side = s => DOCKS.filter(d => d[0] === s && dock[d].length);
  const wl = side('L').length ? Math.round(Math.min(dock.w.L, W * .23)) : 0, wr = side('R').length ? Math.round(Math.min(dock.w.R, W * .26)) : 0;
  document.documentElement.style.setProperty('--gwl', wl + 'px'); document.documentElement.style.setProperty('--gwr', wr + 'px');
  const one = d => { const a = dock.act[d], wide = isWide(a);
    return `<section class="gdock ${wide ? 'wide' : ''}" data-dock="${d}"><nav class="gtabs" role="tablist" aria-label="Painéis">${dock[d].map(k => `<button class="gtab ${k === a ? 'on' : ''} ${k.startsWith('f_') ? 'sheet' : ''}" role="tab" aria-selected="${k === a}" draggable="true" data-g="tab" data-id="${k}" title="Clique para abrir · arraste para outra doca">${esc(tabTitle(k))}${k.startsWith('f_') ? `<i data-g="x" data-id="${k}" title="Fechar ficha" aria-label="Fechar">×</i>` : ''}</button>`).join('')}
      ${WIDE.has(a) || a.startsWith('f_') ? `<button class="gwide" data-g="wide" data-id="${a}" title="${wide ? 'Encolher para a largura da doca' : 'Abrir por cima do centro'}" aria-label="Alternar largura">${wide ? '⇤' : '⇥'}</button>` : ''}</nav>
      <div class="win-body gbody" data-win="${a}">${body[a] ?? ''}</div></section>`; };
  const aside = s => `<aside class="gside ${s}" aria-label="Painel ${s === 'L' ? 'esquerdo' : 'direito'}">${DOCKS.filter(d => d[0] === s).map(d => dock[d].length ? one(d) : `<section class="gdock empty" data-dock="${d}"><small>Solte uma aba aqui</small></section>`).join('')}<i class="gres" data-g="res" data-side="${s}" title="Arraste para mudar a largura"></i></aside>`;
  return `<div class="gms" style="--wl:${wl}px;--wr:${wr}px">${aside('L')}<main class="gcenter ${center.stage ? 'split' : ''}" style="--sp:${dock.split}">${center.stage ? `<div class="gstage">${center.stage}</div><i class="gsplit" data-g="split" title="Arraste para dividir palco e mapa"></i>` : ''}<div class="gmap">${center.map}</div></main>${aside('R')}</div>`;
}

// ===== interações: abas, arrastar abas, larguras e divisão =====
app.addEventListener('click', e => {
  const g = e.target.closest('[data-g]'); if (!g || !gm) return;
  const k = g.dataset.id;
  if (g.dataset.g === 'x') { e.stopPropagation(); gClose(k); return render(); }
  if (g.dataset.g === 'tab') { dock.act[dockOf(k)] = k; saveDock(); return render(); }
  if (g.dataset.g === 'wide') { if (isWide(k)) dock.nar[k] = 1; else delete dock.nar[k]; saveDock(); return render(); }
}, true);
app.addEventListener('auxclick', e => { const t = e.target.closest('.gtab.sheet'); if (t && e.button === 1) { gClose(t.dataset.id); render(); } }); // botão do meio fecha a ficha
app.addEventListener('dragstart', e => { const t = e.target.closest?.('.gtab'); if (!t) return; gdragTab = t.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', gdragTab); document.body.classList.add('gdragging'); });
app.addEventListener('dragover', e => { if (!gdragTab) return; const d = e.target.closest('.gdock'); if (!d) return; e.preventDefault(); app.querySelectorAll('.gdock.over').forEach(x => x !== d && x.classList.remove('over')); d.classList.add('over'); });
app.addEventListener('drop', e => {
  if (!gdragTab) return; const d = e.target.closest('.gdock'); if (!d) return; e.preventDefault();
  const to = d.dataset.dock, from = dockOf(gdragTab), before = e.target.closest('.gtab')?.dataset.id;
  if (from) dock[from] = dock[from].filter(x => x !== gdragTab);
  const i = before && before !== gdragTab ? dock[to].indexOf(before) : -1;
  i < 0 ? dock[to].push(gdragTab) : dock[to].splice(i, 0, gdragTab);
  dock.act[to] = gdragTab; if (from && dock.act[from] === gdragTab) dock.act[from] = dock[from][0];
  saveDock();
});
app.addEventListener('dragend', () => { gdragTab = null; document.body.classList.remove('gdragging'); render(); });
// larguras das laterais e divisão palco/mapa: arrasta direto no DOM e só salva e redesenha ao soltar
app.addEventListener('pointerdown', e => {
  const h = e.target.closest('[data-g=res],[data-g=split]'); if (!h || !gm) return;
  e.preventDefault(); h.setPointerCapture?.(e.pointerId);
  gres = { k: h.dataset.g, side: h.dataset.side, el: h.closest(h.dataset.g === 'split' ? '.gcenter' : '.gms') }; document.body.classList.add('gresizing');
});
addEventListener('pointermove', e => {
  if (!gres) return;
  if (gres.k === 'split') { const r = gres.el.getBoundingClientRect(); dock.split = Math.max(.25, Math.min(.8, (e.clientY - r.top) / r.height)); gres.el.style.setProperty('--sp', dock.split); }
  else { const w = Math.round(Math.max(260, Math.min(innerWidth * .4, gres.side === 'L' ? e.clientX : innerWidth - e.clientX))); dock.w[gres.side] = w; gres.el.style.setProperty(gres.side === 'L' ? '--wl' : '--wr', w + 'px'); }
});
addEventListener('pointerup', () => { if (!gres) return; gres = null; document.body.classList.remove('gresizing'); saveDock(); render(); });

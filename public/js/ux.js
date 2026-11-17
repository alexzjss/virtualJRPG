// Experiência de uso: diálogos próprios (no lugar dos do navegador), ferramentas do mapa à vista, busca rápida do mestre,
// ajuda de atalhos, filtro do histórico, aviso de turno, cartão de cena, janelas recolhíveis e arrastar arquivos para a tela.
let mapTool = ''; // ferramenta ativa no mapa: '' | ruler | area | ping | pin

// ===== diálogos =====
// overlay genérico: fecha com Esc ou clicando fora; segura os atalhos globais enquanto está aberto
function overlay(html, cls = '') {
  const prev = document.activeElement, bg = document.createElement('div'); bg.className = 'dlg-bg ' + cls; bg.innerHTML = html;
  let onClose = null;
  const close = v => { if (!bg.isConnected) return; bg.remove(); removeEventListener('keydown', key, true); prev?.focus?.(); onClose?.(v); };
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); close(null); } if (!e.target.closest?.('.dlg-bg')) e.preventDefault(); e.stopPropagation(); bg.onkey?.(e); };
  addEventListener('keydown', key, true);
  bg.addEventListener('click', e => { e.stopPropagation(); if (e.target === bg || e.target.closest('[data-cancel]')) close(null); });
  document.body.append(bg);
  return { bg, close, then: fn => { onClose = fn; } };
}
function dialog({ title = '', text = '', input = null, choices = null, ok = 'Confirmar', cancel = 'Cancelar', danger = false }) {
  return new Promise(res => {
    const o = overlay(`<form class="dlg card" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}
      ${choices ? `<div class="dlg-ch">${choices.map(([v, l]) => `<button type="button" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>` : ''}
      ${input !== null ? `<input class="dlg-in" value="${esc(input)}" aria-label="${esc(title)}">` : ''}
      <div class="row dlg-bt"><button type="button" data-cancel="1">${esc(cancel)}</button>${choices ? '' : `<button class="${danger ? 'go' : 'own'}">${esc(ok)}</button>`}</div></form>`);
    o.then(res);
    o.bg.querySelector('form').onsubmit = e => { e.preventDefault(); o.close(input !== null ? o.bg.querySelector('.dlg-in').value : true); };
    o.bg.querySelectorAll('.dlg-ch button').forEach(b => b.onclick = () => o.close(b.dataset.v));
    const f = o.bg.querySelector('.dlg-in') || o.bg.querySelector('.dlg-bt .own,.dlg-bt .go,.dlg-ch button'); f?.focus(); f?.select?.();
  });
}
// O código antigo chama prompt() e confirm() e espera a resposta na hora. Aqui a chamada é interrompida, a pergunta aparece
// num diálogo nosso e, com a resposta em mãos, o mesmo clique é repetido: desta vez as respostas já estão na fila.
class NeedDialog extends Error {}
let replay = null, clickCtx = null;
const nativeQ = (type, q, def) => { if (replay?.queue.length) return replay.queue.shift(); const e = new NeedDialog('diálogo'); e.spec = { type, q: String(q ?? ''), def }; throw e; };
window.prompt = (q, def = '') => nativeQ('prompt', q, def);
window.confirm = q => nativeQ('confirm', q);
window.alert = m => toast(String(m), /falha|não |incorret|inválid|erro/i.test(m) ? 'no' : 'ok');
function redo(c) { // repete o clique num elemento provisório com os mesmos dados
  const el = document.createElement('i'); el.hidden = true; c.attrs.forEach(([k, v]) => el.setAttribute(k, v)); app.append(el);
  replay = { queue: [...c.answers] }; clickCtx = c;
  try { el.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: c.shift })); } finally { replay = null; el.remove(); }
}
function onNeed(err, ev, again = true) {
  if (!(err instanceof NeedDialog)) return;
  ev.preventDefault(); const c = clickCtx, s = err.spec, lines = s.q.replace(/\s*Digite o número:/i, '').split('\n'), opts = lines.filter(l => /^\d+\. /.test(l)), risky = /apagar|excluir|perdid/i.test(s.q);
  const p = s.type === 'confirm' ? dialog({ title: risky ? 'Tem certeza?' : 'Confirmar', text: s.q, ok: risky ? 'Sim, continuar' : 'Confirmar', danger: risky }).then(v => v ? true : null)
    : opts.length ? dialog({ title: lines[0], choices: opts.map(l => [l.match(/^\d+/)[0], l.replace(/^\d+\. /, '')]) })
    : dialog({ title: lines[0], text: lines.slice(1).join('\n'), input: String(s.def ?? '') });
  p.then(v => { if (v === null || !c || !again) return; c.answers.push(v); redo(c); });
}
addEventListener('error', ev => onNeed(ev.error, ev));
addEventListener('unhandledrejection', ev => onNeed(ev.reason, ev, false));
// exclusões que o código antigo fazia sem perguntar
const DANGER = { edDel: 'Excluir esta linha do editor? Quem tinha essa skill ou item fica sem.', ctDel: 'Apagar este contrato de caça?' };
document.addEventListener('click', e => {
  if (!e.isTrusted || e.target.closest?.('.dlg-bg')) return;
  const el = e.target.closest?.('[data-a],[data-x]');
  clickCtx = el ? { attrs: [...el.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value]), shift: e.shiftKey, answers: [] } : null;
  if (el && DANGER[el.dataset.a]) { e.stopPropagation(); e.preventDefault(); const c = clickCtx; dialog({ title: 'Tem certeza?', text: DANGER[el.dataset.a], ok: 'Excluir', danger: true }).then(v => v && redo(c)); }
}, true);
const addPin = (c, onlyGm) => dialog({ title: 'Novo marcador', text: onlyGm ? 'Só você vê este marcador.' : 'Todos veem este marcador.', input: '', ok: 'Fixar' }).then(v => { if (v?.trim()) send({ t: 'pinAdd', ...c, v: v.trim(), k: onlyGm ? 1 : '' }); });

// ===== ferramentas do mapa =====
const TOOLS = { ruler: ['Régua', 'Medir distância: arraste no mapa (atalho: Alt+arrastar)'], area: ['Área', 'Medir uma área: arraste a partir do centro (atalho: Alt+Shift+arrastar)'],
  ping: ['Sinal', 'Chamar a atenção de todos para um ponto: clique no mapa (atalho: duplo clique)'], pin: ['Marcador', 'Fixar um marcador: clique no mapa. Com Shift, só você vê (atalho: Ctrl+clique)'] };
function mapTools() {
  const w = app.querySelector('.mapwrap'); if (!w || role === 'table') return;
  w.classList.toggle('tooling', !!mapTool);
  const b = (attrs, label, title, on) => `<button ${attrs} class="${on ? 'own' : ''}" title="${title}" aria-label="${title}" ${on === undefined ? '' : `aria-pressed="${!!on}"`}>${label}</button>`;
  w.insertAdjacentHTML('beforeend', `<div class="maptools" role="toolbar" aria-label="Ferramentas do mapa">${b('data-u="zin"', '+', 'Aproximar')}${b('data-u="zout"', '−', 'Afastar')}${b('data-u="zfit"', '⌂', 'Enquadrar o mapa (tecla 0)')}<i></i>
    ${Object.entries(TOOLS).filter(([k]) => k !== 'pin' || gm).map(([k, [l, t]]) => b(`data-u="tool" data-k="${k}"`, l, t, mapTool === k)).join('')}
    ${gm && S.scenes[S.scene].fogOn ? b('data-a="fogMode"', 'Névoa', 'Pincel de névoa: arraste para revelar, com Shift para esconder', fogMode) : ''}</div>`);
}
const zoomBy = k => { const w = app.querySelector('.mapwrap'); if (!w) return; const r = w.getBoundingClientRect(), z = Math.min(4, Math.max(.4, view.z * k)), px = r.width / 2, py = r.height / 2;
  Object.assign(view, { x: px - (px - view.x) * z / view.z, y: py - (py - view.y) * z / view.z, z }); applyView(); };

// ===== histórico: filtro e hora =====
let logF = ls('vj_logf');
const LOGF = { '': 'Tudo', chat: 'Conversa', roll: 'Rolagens' };
function logTools() {
  app.querySelectorAll('.log').forEach(lg => {
    lg.dataset.lf = logF;
    lg.insertAdjacentHTML('beforebegin', `<div class="logf" role="group" aria-label="Filtrar histórico">${Object.entries(LOGF).map(([k, l]) => `<button data-u="logf" data-k="${k}" class="${logF === k ? 'on' : ''}" aria-pressed="${logF === k}">${l}</button>`).join('')}</div>`);
    const L = S.log; lg.querySelectorAll('p:not(.none)').forEach((p, i) => { const e = L[L.length - 1 - i]; if (e?.ts) p.title = new Date(e.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); });
  });
}

// ===== avisos: turno, cena nova, título da aba =====
let lastTurn = null, lastScene = null; const baseTitle = document.title;
function watch() {
  const cur = S.battle.active ? S.battle.order?.[0] : null, c = S.chars[cur], myTurn = role === 'player' && !asWho && !!c && c.owner === name;
  if (cur !== lastTurn) { lastTurn = cur; if (myTurn) { toast(`Sua vez: ${c.name}`, 'ok', 'Escolha o alvo e a ação.'); playSfx('sino'); navigator.vibrate?.([80, 60, 80]); } }
  const nreq = gm ? Object.keys(S.reqs || {}).length : 0;
  document.title = (myTurn ? '▶ Sua vez · ' : nreq ? `(${nreq}) ` : '') + baseTitle;
  if (lastScene !== null && lastScene !== S.scene && !gm) { const d = document.createElement('div'); d.className = 'scenecard'; d.innerHTML = `<small>Nova cena</small><b>${esc(S.scenes[S.scene].name)}</b>`; document.body.append(d); setTimeout(() => d.remove(), 3200); }
  lastScene = S.scene;
}

// ===== janelas do mestre: duplo clique no título recolhe =====
const saveWins = () => { try { localStorage.vj_wins = JSON.stringify(wins); } catch {} };
const winState = () => app.querySelectorAll('.win').forEach(w => { const m = !!wins[w.dataset.win]?.min; w.classList.toggle('min', m); const h = w.querySelector('header'); if (h) h.title = m ? 'Duplo clique para abrir' : 'Arraste para mover · duplo clique para recolher'; });
app.addEventListener('dblclick', e => { const h = e.target.closest('.win header'); if (!h || e.target.closest('button')) return; const id = h.dataset.drag; if (wins[id]) { wins[id].min = !wins[id].min; saveWins(); render(); } });

{ const render1 = render; render = function () { render1(); try { if (fogMode) mapTool = ''; mapTools(); logTools(); winState(); watch(); } catch (e) { console.error(e); } }; }

// ===== ajuda de atalhos =====
const HELP = [
  ['Mapa', [['Roda do mouse', 'aproximar e afastar'], ['Espaço + arrastar', 'mover o mapa (ou botão do meio)'], ['0', 'enquadrar o mapa'], ['Alt + arrastar', 'régua; com Shift mede área'], ['Duplo clique', 'sinalizar um ponto para todos'], ['Duplo clique no token', 'abrir a ficha'], ['Botão direito no token', 'menu de ações']]],
  ['Batalha', [['Tab', 'próximo alvo (Shift volta)'], ['1 a 9', 'escolher a ação'], ['Esc', 'cancelar mira ou menu']]],
  ['Geral', [['Enter', 'escrever no chat'], ['/r 2d6+1', 'rolar dados no chat'], ['/w nome texto', 'sussurrar'], ['Esc', 'fechar o que estiver aberto'], ['?', 'esta ajuda']]],
  ['Mestre', [['Ctrl + K', 'busca rápida: painéis, cenas, fichas, ações'], ['Enter / Delete', 'aprovar / negar o primeiro pedido'], ['Ctrl + clique no mapa', 'marcador (com Shift, só seu)'], ['Clique num número da ficha', 'editar; aceita +5 ou -12'], ['Arrastar uma aba', 'levar o painel para outra doca'], ['Botão do meio na aba', 'fechar a ficha'], ['Shift + clique num arranjo', 'salvar o arranjo atual'], ['Arrastar um arquivo', 'imagem vira mapa ou retrato; áudio vira trilha']]],
];
const showHelp = () => overlay(`<div class="dlg card help" role="dialog" aria-modal="true" aria-label="Atalhos"><h3>Atalhos e gestos</h3><div class="helpg">${HELP.filter(([t]) => t !== 'Mestre' || gm).map(([t, rows]) =>
  `<section><h4>${t}</h4>${rows.map(([k, d]) => `<p><kbd>${esc(k)}</kbd><span>${esc(d)}</span></p>`).join('')}</section>`).join('')}</div><div class="row dlg-bt"><button class="own" data-cancel="1">Fechar</button></div></div>`);

// ===== busca rápida do mestre (Ctrl+K) =====
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function palette() {
  if (!gm || !S || document.querySelector('.pal')) return;
  const items = [], add = (label, hint, run) => items.push({ label, hint, run, k: norm(label + ' ' + hint) });
  const openWin = id => { gOpen(id); render(); };
  for (const [id, [t]] of Object.entries(WIN)) if (id !== 'batalha') add(t, 'painel', () => openWin(id));
  add(S.battle.active ? 'Encerrar batalha' : 'Iniciar batalha', 'ação', () => send({ t: 'battle', on: !S.battle.active }));
  add('Descanso curto', 'ação', () => send({ t: 'rest' })); add('Descanso longo', 'ação', () => send({ t: 'rest', long: true })); add('Desfazer a última ação', 'ação', () => send({ t: 'undo' }));
  add('Cópia de segurança agora', 'ação', () => send({ t: 'bkNow' })); add('Atalhos e gestos', 'ajuda', showHelp);
  for (const [id, s] of Object.entries(S.scenes)) if (id !== S.scene) add(s.name, 'ir para a cena', () => send({ t: 'sceneGo', id }));
  for (const c of Object.values(S.chars)) add(c.name, c.enemy ? 'ficha de inimigo' : 'ficha', () => openWin('f_' + c.id));
  add('Restaurar os painéis', 'arranjo', () => { dock = structuredClone(DOCK0); saveDock(); render(); });
  for (const [k, l] of Object.entries(SFXL)) add(l, 'efeito sonoro', () => send({ t: 'sfx', k }));
  for (const [k, l] of Object.entries(AMBL)) add(l, S.audio?.amb === k ? 'parar ambiência' : 'ambiência', () => send({ t: 'audio', f: 'amb', v: S.audio?.amb === k ? '' : k }));
  for (const [id, t] of Object.entries(S.tracks || {})) add(t.name, 'tocar faixa', () => send({ t: 'audio', f: 'url', v: t.url }));
  for (const [id, b] of Object.entries(S.bestiary || {})) add(b.name, 'criar inimigo no mapa', () => send({ t: 'bSpawn', id, n: 1, tier: 'normal' }));
  const o = overlay(`<div class="dlg card" role="dialog" aria-modal="true" aria-label="Busca rápida"><input class="dlg-in" placeholder="Buscar janela, cena, ficha, ação, som…" aria-label="Buscar" autocomplete="off"><div class="pal-list" role="listbox"></div><small>↑ ↓ escolhem · Enter executa · Esc fecha</small></div>`, 'pal');
  const inp = o.bg.querySelector('input'), list = o.bg.querySelector('.pal-list'); let found = [], sel = 0;
  const draw = () => { const q = norm(inp.value).split(/\s+/).filter(Boolean); found = items.filter(i => q.every(w => i.k.includes(w))).slice(0, 12); sel = Math.min(sel, Math.max(0, found.length - 1));
    list.innerHTML = found.map((i, n) => `<button type="button" role="option" data-n="${n}" class="${n === sel ? 'on' : ''}" aria-selected="${n === sel}"><b>${esc(i.label)}</b><small>${esc(i.hint)}</small></button>`).join('') || '<p class="none">Nada encontrado.</p>'; };
  const run = n => { const i = found[n]; if (!i) return; o.close(); i.run(); };
  inp.oninput = () => { sel = 0; draw(); };
  o.bg.onkey = e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : found.length - 1)) % (found.length || 1); draw(); list.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); } else if (e.key === 'Enter') { e.preventDefault(); run(sel); } };
  list.onclick = e => { const b = e.target.closest('button'); if (b) run(+b.dataset.n); };
  draw(); inp.focus();
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && gm) { e.preventDefault(); return palette(); }
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.target.matches('input,textarea,select') && S) { e.preventDefault(); showHelp(); }
});

// ===== cantinho de preferências: som (extras.js) + ajuda e busca =====
{ const draw0 = drawSnd; drawSnd = function () { draw0(); sndBox.insertAdjacentHTML('beforeend', `${gm ? '<button data-s="pal" title="Busca rápida (Ctrl+K)">Buscar</button>' : ''}<button data-s="help" title="Atalhos e gestos (tecla ?)" aria-label="Atalhos e gestos">?</button>`); }; drawSnd(); }
sndBox.addEventListener('click', e => { const k = e.target.dataset.s; if (k === 'help') showHelp(); else if (k === 'pal') palette(); });

// ===== cliques das ferramentas =====
document.addEventListener('click', e => {
  const u = e.target.closest('[data-u]')?.dataset;
  if (u) {
    if (u.u === 'zin' || u.u === 'zout') zoomBy(u.u === 'zin' ? 1.25 : .8);
    else if (u.u === 'zfit') { Object.assign(view, { z: 1, x: 0, y: 0 }); applyView(); }
    else if (u.u === 'tool') { mapTool = mapTool === u.k ? '' : u.k; fogMode = false; render(); }
    else if (u.u === 'logf') { ls('vj_logf', (logF = u.k) || null); render(); }
    return;
  }
  const mp = e.target.closest?.('.map'); if (!mp || !S || !e.isTrusted || e.ctrlKey) return;
  if (mapTool === 'ping') send({ t: 'ping', ...cell(e, mp) });
  else if (mapTool === 'pin' && gm) { addPin(cell(e, mp), e.shiftKey); mapTool = ''; render(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && mapTool && !document.querySelector('.dlg-bg')) { mapTool = ''; } }, true);

// ===== arrastar arquivos para a tela (mestre): imagem vira mapa ou retrato, áudio vira trilha =====
if (gm) {
  const hasFile = e => [...(e.dataTransfer?.types || [])].includes('Files');
  addEventListener('dragover', e => { if (hasFile(e)) { e.preventDefault(); document.body.classList.add('dropping'); } });
  addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
  addEventListener('drop', e => {
    document.body.classList.remove('dropping'); const f = e.dataTransfer?.files?.[0]; if (!f || !S) return; e.preventDefault();
    const tok = e.target.closest?.('.tok,.scard,[data-win^="f_"]'), id = tok?.dataset.id || tok?.dataset.win?.slice(2), audio = f.type.startsWith('audio/');
    fetch('/upload', { method: 'POST', headers: { 'Content-Type': f.type, ...apiH() }, body: f }).then(r => r.ok ? r.text() : Promise.reject()).then(u => {
      if (audio) { send({ t: 'trackAdd', v: u, k: f.name.replace(/\.\w+$/, '') }); send({ t: 'audio', f: 'url', v: u }); toast('Trilha enviada e tocando', 'ok', f.name); }
      else if (id && ent(id)) { send({ t: 'set', id, f: 'img', v: u }); toast(`Retrato de ${ent(id).name} trocado`, 'ok'); }
      else dialog({ title: 'Usar como mapa?', text: `"${f.name}" vira a imagem do mapa da cena ${S.scenes[S.scene].name}.`, ok: 'Usar como mapa' }).then(v => v && setBg(u));
    }).catch(() => toast('Não consegui enviar o arquivo', 'no', 'Imagens até 5 MB (PNG, JPG, WEBP, GIF); áudio até 40 MB (MP3, OGG, WAV, M4A).'));
  });
}

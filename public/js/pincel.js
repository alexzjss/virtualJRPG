// ===== UI Pincelada: chave da mesa e peças comuns (pincelada, losango, pintar) =====
// A chave é S.ui === 'pincel' (o mestre liga para todos com uiSet). Enquanto o servidor não tiver a chave, localStorage.vj_ui = 'pincel' liga só nesta tela.
// Liga e desliga só a classe body.ui-pincel: o palco 3D e a escolha em andamento no leque não são recriados por isso.
(g => {
  const lsUi = () => { try { return localStorage.vj_ui || ''; } catch { return ''; } };
  const state = () => typeof S === 'undefined' ? g.S : S;
  const on = () => (state()?.ui ?? lsUi()) === 'pincel';
  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // pincelada com rótulo: o = { x, y, w, rot, k (tecla), cls, esq (cresce para a esquerda), extra (html à direita), i (ordem na cascata), attrs (atributos extras) }
  const traco = (txt, o = {}) => `<button type="button" class="pc-traco ${o.cls || ''} ${o.esq ? 'esq' : ''}" style="${o.x != null ? `left:${o.x}px;` : ''}${o.y != null ? `top:${o.y}px;` : ''}width:${o.w || 320}px;--rot:${o.rot || 0}deg;--i:${o.i || 0}" ${o.attrs || ''}>`
    + `<span class="pc-tinta"></span><span class="pc-ouro"></span>${o.k ? `<kbd class="pc-k">${escH(o.k)}</kbd>` : ''}<b>${escH(txt)}</b>${o.extra || ''}</button>`;
  const losango = (n, cls = '') => `<span class="pc-los ${cls}"><i>${escH(n)}</i></span>`;
  // pinta as pinceladas de um bloco (só as que acabaram de aparecer); com movimento reduzido o CSS tira a animação
  const pintar = root => { root?.querySelectorAll?.('.pc-traco:not(.pc-pinta)').forEach((t, i) => { if (!t.style.getPropertyValue('--i')) t.style.setProperty('--i', i); t.classList.add('pc-pinta'); }); };
  const sync = () => { const v = on(); if (document.body.classList.contains('ui-pincel') !== v) document.body.classList.toggle('ui-pincel', v); };
  // opção na janela Sessão do mestre
  const opcao = () => `<h4>Interface</h4><div class="pc-chave"><button data-pc="ui" class="${on() ? 'on own' : ''}" title="Troca a interface de todos na mesa; dá para voltar">${on() ? 'Pincelada ligada' : 'Ligar a Pincelada'}</button><small>${on() ? 'Clique para voltar à interface antiga.' : 'Vale para o mestre e todos os jogadores.'}</small></div>`;
  g.PC = { on, traco, losango, pintar, opcao, esc: escH };
  if (typeof document === 'undefined') return;
  if (typeof sessWin === 'function') { const s0 = sessWin; g.sessWin = sessWin = function () { return s0() + opcao(); }; }
  const r0 = render; render = function () { sync(); r0(); };
  sync();
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pc="ui"]'); if (!b || !gm) return;
    const v = on() ? '' : 'pincel';
    const s = state();
    if (s && 'ui' in s) { try { localStorage.removeItem('vj_ui'); } catch {} send({ t: 'uiSet', v }); } // servidor com a chave (B1): vale para a mesa toda
    else { try { if (v) localStorage.vj_ui = v; else localStorage.removeItem('vj_ui'); } catch {} render(); } // servidor antigo: só nesta tela
  });
})(globalThis);

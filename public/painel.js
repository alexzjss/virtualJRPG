// Guarda o acesso nas mesmas chaves das telas do mestre e do jogador.
const ls = {
  get: k => { try { return localStorage[k] || ''; } catch { return ''; } },
  set: (k, v) => { try { localStorage[k] = v; } catch {} },
  del: k => { try { delete localStorage[k]; } catch {} },
  keys: () => { try { return Object.keys(localStorage); } catch { return []; } },
};
const SRC = { gm: '/gm', player: '/player' };
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let mode = 'all';

function show(on) {
  $('#setup').classList.toggle('show', !on);
  $('#grid').classList.toggle('show', on);
  $('#tools').hidden = !on;
}

function start() {
  for (const p of Object.keys(SRC)) { const f = $(`iframe[data-f="${p}"]`); if (f.getAttribute('src') !== SRC[p]) f.src = SRC[p]; }
  show(true);
  apply();
}

function focusPane(p) { mode = p === 'all' || p === mode ? 'all' : p; apply(); }
function apply() {
  const grid = $('#grid');
  grid.classList.toggle('solo', mode !== 'all');
  $$('.pane').forEach(el => el.classList.toggle('hide', mode !== 'all' && el.dataset.p !== mode));
  $$('[data-focus]').forEach(b => b.classList.toggle('on', b.dataset.focus === mode));
}

// o quadro muda a bolinha quando a tela conecta (a tela avisa com a classe "off" no body)
function watchDots() {
  for (const p of Object.keys(SRC)) {
    const f = $(`iframe[data-f="${p}"]`), dot = $(`[data-dot="${p}"]`);
    const check = () => { try { const b = f.contentDocument?.body; dot.classList.toggle('live', !!b && !b.classList.contains('off') && !!f.contentDocument.querySelector('#app main')); } catch { dot.classList.remove('live'); } };
    setInterval(check, 800);
  }
}

$('#setup').addEventListener('submit', e => {
  e.preventDefault();
  const k = $('#k').value, n = $('#n').value.trim(), p = $('#p').value;
  if (!k) return $('#err').textContent = 'Informe a chave do mestre.';
  if (!n || /\s|@/.test(n)) return $('#err').textContent = 'Nome sem espaços nem @.';
  if (p.length < 4) return $('#err').textContent = 'Senha com pelo menos 4 caracteres.';
  ls.set('vj_key', k); ls.set('vj_name', n); ls.set('vj_pass', p); ls.del('vj_pass_' + n);
  $('#err').textContent = '';
  start();
});

$('#tools').addEventListener('click', e => {
  const b = e.target.closest('[data-focus]');
  if (b) return focusPane(b.dataset.focus);
  if (e.target.id === 'reset') { // esquece o acesso salvo e volta ao formulário
    ls.keys().filter(k => ['vj_key', 'vj_name', 'vj_pass'].includes(k) || k.startsWith('vj_pass_')).forEach(ls.del);
    $$('iframe').forEach(f => f.removeAttribute('src'));
    mode = 'all'; apply(); show(false); fillForm();
  }
});
$('#grid').addEventListener('click', e => { const b = e.target.closest('[data-focus]'); if (b) focusPane(b.dataset.focus); });

function fillForm() {
  const n = ls.get('vj_name');
  $('#k').value = ls.get('vj_key'); $('#n').value = n; $('#p').value = n ? ls.get('vj_pass') : '';
}

const oldPassKey = 'vj_pass_' + ls.get('vj_name');
if (!ls.get('vj_pass') && ls.get(oldPassKey)) { ls.set('vj_pass', ls.get(oldPassKey)); ls.del(oldPassKey); }
fillForm();
const saved = ls.get('vj_key') && ls.get('vj_name') && ls.get('vj_pass');
if (saved) start(); else show(false);
watchDots();

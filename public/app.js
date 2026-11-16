const role = document.body.dataset.role, app = document.getElementById('app');
const A = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'];
const L = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
let S, ws, pending = false, drag = null;
const mods = {};
let name = localStorage.vj_name, key = localStorage.vj_key;
if (role === 'player' && !name) localStorage.vj_name = name = prompt('Seu nome de jogador?') || 'Jogador';
if (role === 'gm' && !key) localStorage.vj_key = key = prompt('Chave do mestre?') || '';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const send = o => ws.readyState === 1 && ws.send(JSON.stringify(o));
const mine = c => role === 'gm' || (role === 'player' && c.owner === name);
const delay = c => Math.round(1000 / Math.max(1, c.attrs.AGI));

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => send({ t: 'hello', role, name, key });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === 'state') { S = m.s; render(); }
    if (m.t === 'err') { if (m.badKey) delete localStorage.vj_key; alert(m.msg); }
  };
  ws.onclose = () => setTimeout(connect, 1500);
}

function timeline(n = 8) {
  const t = { ...S.battle.ticks }, out = [];
  for (let i = 0; i < n; i++) {
    const id = Object.keys(t).filter(k => S.chars[k]).sort((a, b) => t[a] - t[b] || a.localeCompare(b))[0];
    if (!id) break;
    out.push(id); t[id] += delay(S.chars[id]);
  }
  return out;
}

function bar(k, c, hideNum) {
  const max = k === 'limit' ? 100 : c[k + 'Max'], pct = Math.max(0, Math.min(100, 100 * c[k] / (max || 1)));
  return `<div class="bar ${k}"><i style="width:${pct}%"></i><span>${L[k]}${hideNum ? '' : ` ${c[k]}/${max}`}</span></div>`;
}

function battle() {
  const tl = timeline(), cur = S.chars[tl[0]];
  const side = e => Object.values(S.chars).filter(c => !!c.enemy === e && c.id in S.battle.ticks).map(c =>
    `<div class="unit ${c === cur ? 'cur' : ''}" style="--c:${esc(c.color)}"><b>${esc(c.name)}</b>${bar('hp', c, e && role !== 'gm')}${e ? '' : bar('aura', c) + bar('san', c) + bar('limit', c)}</div>`).join('');
  return `<section class="battle"><div class="tl">${tl.map((id, i) => `<span class="${i ? '' : 'cur'}" style="--c:${esc(S.chars[id].color)}">${esc(S.chars[id].name)}</span>`).join('')}</div>
    <div class="sides"><div>${side(true)}</div><i>VS</i><div>${side(false)}</div></div>
    ${cur && mine(cur) ? `<div class="row"><button data-a="next">Encerrar turno de ${esc(cur.name)}</button></div>` : ''}</section>`;
}

function map() {
  const m = S.map;
  return `<section class="map" style="--cols:${m.cols};--rows:${m.rows};${m.bg ? `background-image:url('${esc(m.bg)}')` : ''}">${Object.values(S.chars).filter(c => c.x != null).map(c =>
    `<div class="tok ${mine(c) ? 'mine' : ''}" data-id="${c.id}" style="--x:${c.x};--y:${c.y};--c:${esc(c.color)}" title="${esc(c.name)}">${esc(c.name.slice(0, 2))}</div>`).join('')}</section>`;
}

function sheet(c) {
  const ed = mine(c) ? '' : 'disabled', gm = role === 'gm';
  const inp = (f, v, type = 'number') => `<input type="${type}" data-id="${c.id}" data-f="${f}" value="${esc(v)}" ${ed}>`;
  return `<div class="sheet" style="--c:${esc(c.color)}"><h3>${esc(c.name)} <small>${c.enemy ? 'NPC' : esc(c.owner)} · XP ${c.xp}</small></h3>
    <div class="row">${inp('name', c.name, 'text')}${inp('color', c.color, 'color')}</div>
    ${['hp', 'aura', 'san'].map(k => `${bar(k, c)}<div class="row">${inp(k, c[k])}/ ${inp(k + 'Max', c[k + 'Max'])}</div>`).join('')}
    ${bar('limit', c)}<div class="row">${inp('limit', c.limit)}% · Mod. da rolagem <input type="number" class="mod" data-mid="${c.id}" value="${mods[c.id] || 0}" ${ed}></div>
    <div class="attrs">${A.map(a => `<div class="${c.marks[a] ? 'mk' : ''}"><button data-a="roll" data-id="${c.id}" data-attr="${a}" ${ed}>${a}</button>${inp('attrs.' + a, c.attrs[a])}</div>`).join('')}</div>
    ${gm ? `<div class="row">XP ${inp('xp', c.xp)}<button data-a="evolve" data-id="${c.id}">Evoluir</button><button data-a="place" data-id="${c.id}">${c.x == null ? 'Pôr no mapa' : 'Tirar do mapa'}</button><button data-a="delChar" data-id="${c.id}">Excluir</button></div>` : ''}</div>`;
}

function render() {
  if (document.activeElement?.matches?.('#app input')) { pending = true; return; }
  pending = false;
  const b = S.battle.active, gm = role === 'gm', chars = Object.values(S.chars);
  const stage = (b ? battle() : '') + (!b || gm ? map() : '');
  const controls = gm ? `<div class="panel"><div class="row"><button data-a="addChar">+ Personagem</button><button data-a="addChar" data-enemy="1">+ Inimigo</button>
      <button data-a="battle" data-on="${b ? '' : 1}">${b ? 'Encerrar batalha' : 'Iniciar batalha'}</button></div>
      <div class="row">Mapa <input type="number" data-map="cols" value="${S.map.cols}">×<input type="number" data-map="rows" value="${S.map.rows}"><input data-map="bg" placeholder="URL da imagem" value="${esc(S.map.bg)}"></div></div>`
    : role === 'player' ? `<div class="panel"><div class="row"><b>${esc(name)}</b><button data-a="addChar">+ Novo personagem</button></div></div>` : '';
  const sheets = role === 'table' ? '' : chars.filter(mine).map(sheet).join('');
  const log = `<div class="panel log">${S.log.slice().reverse().map(l => `<p class="${l.kind}"><b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('') || 'Sem rolagens ainda.'}</div>`;
  app.innerHTML = `<main>${stage}</main><aside>${controls}${log}${sheets}</aside>`;
}

app.addEventListener('change', e => {
  const d = e.target.dataset, v = e.target.type === 'number' ? +e.target.value : e.target.value;
  if (d.f) send({ t: 'set', id: d.id, f: d.f, v });
  else if (d.map) send({ t: 'map', f: d.map, v });
  else if (d.mid) mods[d.mid] = v;
});
app.addEventListener('focusout', () => setTimeout(() => pending && render()));
app.addEventListener('click', e => {
  const d = e.target.closest('[data-a]')?.dataset;
  if (!d) return;
  if (d.a === 'delChar' && !confirm('Excluir personagem?')) return;
  const m = { t: d.a, id: d.id, attr: d.attr, mod: mods[d.id] || 0, enemy: !!d.enemy, on: !!d.on };
  if (d.a === 'addChar' && role === 'gm' && !d.enemy) m.owner = prompt('Nome do jogador dono?') || '';
  send(m);
});
// arrastar tokens
app.addEventListener('pointerdown', e => { const t = e.target.closest('.tok.mine'); if (t) { drag = t; t.setPointerCapture(e.pointerId); } });
app.addEventListener('pointermove', e => {
  if (!drag) return;
  const r = drag.parentElement.getBoundingClientRect();
  drag.style.left = e.clientX - r.left - drag.offsetWidth / 2 + 'px'; drag.style.top = e.clientY - r.top - drag.offsetHeight / 2 + 'px';
});
app.addEventListener('pointerup', e => {
  if (!drag) return;
  const r = drag.parentElement.getBoundingClientRect();
  send({ t: 'move', id: drag.dataset.id, x: Math.floor((e.clientX - r.left) / r.width * S.map.cols), y: Math.floor((e.clientY - r.top) / r.height * S.map.rows) });
  drag = null;
});
if (role) connect();

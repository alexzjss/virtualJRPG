const role = document.body.dataset.role, app = document.getElementById('app'), gm = role === 'gm';
const A = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'], AO = Object.fromEntries(A.map(a => [a, a]));
const L = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
const EL = { fis: 'Físico', kagutsuchi: 'Kagutsuchi·Fogo', susanoo: 'Susanoo·Água', atlas: 'Atlas·Terra', indra: 'Indra·Raio', fuhaku: 'Fuhaku·Vento', amaterasu: 'Amaterasu·Luz', tsukuyomi: 'Tsukuyomi·Escuridão', shukketsu: 'Shukketsu·Sangue', radiacao: 'Hiruko·Radiação' };
const KIND = { dmg: 'Dano', mental: 'Dano mental', heal: 'Cura' }, RES = { aura: 'Aura', san: 'Sanidade' };
const ST = { burn: 'Queimadura', bleed: 'Sangramento', poison: 'Veneno', rad: 'Radiação', stun: 'Atordoado', sleep: 'Sono', para: 'Paralisia', silence: 'Silêncio', atkUp: 'ATQ↑', atkDn: 'ATQ↓', defUp: 'DEF↑', defDn: 'DEF↓', agiUp: 'AGI↑', agiDn: 'AGI↓', fear: 'Medo', fury: 'Fúria', confuse: 'Confusão' };
const IT = { cons: 'Consumível', arma: 'Arma', armadura: 'Armadura', acess: 'Acessório' };
const ED = {
  skills: [['Skill', 'name', 'text'], ['Tipo', 'kind', KIND], ['Elemento', 'el', EL], ['Atr.', 'attr', AO], ['Poder', 'power'], ['Custo', 'cost'], ['Recurso', 'res', RES], ['Status', 'st', { '': '—', ...ST }], ['XP', 'xp'], ['X', 'gx'], ['Y', 'gy'], ['Lim.', 'limit', 'checkbox']],
  items: [['Item', 'name', 'text'], ['Tipo', 'type', IT], ['Poder', 'power'], ['Restaura', 'eff', { hp: 'HP', aura: 'Aura', san: 'Sanidade' }], ['Atr. (acess.)', 'attr', AO], ['Preço', 'price']],
};
let S, ws, pending = false, drag = null, tgt = null, showEd = null, fogMode = false, lastFog = '';
const mods = {};
let name = localStorage.vj_name, key = localStorage.vj_key;
if (role === 'player' && !name) localStorage.vj_name = name = prompt('Seu nome de jogador?') || 'Jogador';
if (gm && !key) localStorage.vj_key = key = prompt('Chave do mestre?') || '';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const send = o => ws.readyState === 1 && ws.send(JSON.stringify(o));
const mine = c => gm || (role === 'player' && c.owner === name);
const eq = (c, slot) => S.items[c.equip[slot]];
const at = (c, a) => c.attrs[a] + (eq(c, 'acess')?.attr === a ? eq(c, 'acess').power : 0);
const delay = c => Math.round(1000 / Math.max(1, at(c, 'AGI') * (c.st.agiUp ? 1.25 : 1) * (c.st.agiDn ? .75 : 1)));
const sanSt = c => { const p = c.san / (c.sanMax || 1); return p <= 0 ? 'Colapso −30' : p <= .25 ? 'Surto −20' : p <= .5 ? 'Abalado −10' : ''; };
const stList = c => [sanSt(c), ...Object.entries(c.st).map(([k, n]) => `${ST[k]} ${n}`)].filter(Boolean).join(' · ');
const desc = s => `${KIND[s.kind]} · ${EL[s.el]} · ${s.attr} · poder ${s.power} · ${s.limit ? 'Limite 100%' : s.cost + ' ' + RES[s.res]}${s.st ? ' · causa ' + ST[s.st] : ''}`;
const bgImg = u => u ? `background-image:url('${esc(u)}');` : '';

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
    const id = Object.keys(t).filter(k => S.chars[k]?.hp > 0).sort((a, b) => t[a] - t[b] || a.localeCompare(b))[0];
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
    `<div class="unit ${c === cur ? 'cur' : ''} ${c.id === tgt ? 'tgt' : ''} ${c.hp > 0 ? '' : 'ko'}" data-tgt="${c.id}" style="--c:${esc(c.color)}">${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}<div><b>${esc(c.name)}</b> <em>${c.hp > 0 ? stList(c) : 'Caído'}</em>${bar('hp', c, e && !gm)}${e ? '' : bar('aura', c) + bar('san', c) + bar('limit', c)}</div></div>`).join('');
  const acts = c => `<div class="row"><b>${esc(c.name)}:</b><button data-a="act" data-id="${c.id}" data-skill="atk">Ataque</button>${c.skills.filter(k => S.skills[k]).map(k => { const s = S.skills[k];
      return `<button data-a="act" data-id="${c.id}" data-skill="${k}" title="${esc(desc(s))}" ${c[s.res] < s.cost || (s.limit && c.limit < 100) || c.st.silence || c.st.fury ? 'disabled' : ''}>${esc(s.name)}</button>`; }).join('')}
      ${Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons').map(([k, q]) => `<button class="item" data-a="use" data-id="${c.id}" data-item="${k}">${esc(S.items[k].name)} ×${q}</button>`).join('')}
      <button data-a="next">Passar</button></div><small>Clique em uma unidade para escolher o alvo.</small>`;
  return `<section class="battle"><div class="tl">${tl.map((id, i) => `<span class="${i ? '' : 'cur'}" style="--c:${esc(S.chars[id].color)}">${esc(S.chars[id].name)}</span>`).join('')}</div>
    <div class="sides"><div>${side(true)}</div><i>VS</i><div>${side(false)}</div></div>${cur && mine(cur) ? acts(cur) : ''}</section>`;
}

function map() {
  const m = S.scenes[S.scene], hid = (x, y) => m.fogOn && !m.seen[x + ',' + y];
  let fog = '';
  if (m.fogOn) for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) if (hid(x, y)) fog += `<i class="fog" style="--x:${x};--y:${y}"></i>`;
  return `<section class="map ${fogMode ? 'fogging' : ''}" style="--cols:${m.cols};--rows:${m.rows};${bgImg(m.bg)}">${Object.values(S.chars).filter(c => c.x != null && (mine(c) || !hid(c.x, c.y))).map(c =>
    `<div class="tok ${mine(c) ? 'mine' : ''}" data-id="${c.id}" style="--x:${c.x};--y:${c.y};--c:${esc(c.color)};${bgImg(c.img)}" title="${esc(c.name)}">${c.img ? '' : esc(c.name.slice(0, 2))}</div>`).join('')}${fog}</section>`;
}

function grid(c) {
  const adjTo = s => !c.skills.length || c.skills.some(k => S.skills[k] && Math.max(Math.abs(S.skills[k].gx - s.gx), Math.abs(S.skills[k].gy - s.gy)) <= 1);
  return `<div class="grid">${Object.entries(S.skills).map(([id, s]) => {
    const own = c.skills.includes(id), ok = !own && mine(c) && adjTo(s) && c.xp >= s.xp;
    return `<button class="${own ? 'own' : ok ? '' : 'lock'}" style="grid-column:${s.gx + 1};grid-row:${s.gy + 1}" ${ok ? `data-a="learn" data-id="${c.id}" data-skill="${id}"` : ''} title="${esc(desc(s))}">${esc(s.name)}<small>${own ? '✓' : s.xp + ' XP'}</small></button>`;
  }).join('')}</div>`;
}

function editor(coll) {
  const cell = (id, o, [, f, t = 'number']) => { const a = `data-ed="${coll}" data-id="${id}" data-f="${f}"`;
    return typeof t === 'object' ? `<select ${a}>${Object.entries(t).map(([k, l]) => `<option value="${k}" ${k === o[f] ? 'selected' : ''}>${l}</option>`).join('')}</select>`
      : `<input type="${t}" ${a} ${t === 'checkbox' ? (o[f] ? 'checked' : '') : `value="${esc(o[f])}"`}>`; };
  return `<section class="panel editor"><table><tr>${ED[coll].map(c => `<th>${c[0]}`).join('')}<th></tr>${Object.entries(S[coll]).map(([id, o]) =>
    `<tr>${ED[coll].map(c => `<td>${cell(id, o, c)}`).join('')}<td><button data-a="edDel" data-coll="${coll}" data-id="${id}">×</button></tr>`).join('')}</table><button data-a="edAdd" data-coll="${coll}">+ Novo</button></section>`;
}

function sheet(c) {
  const own = mine(c), ed = own ? '' : 'disabled';
  const inp = (f, v, type = 'number') => `<input type="${type}" data-id="${c.id}" data-f="${f}" value="${esc(v)}" ${ed}>`;
  const btn = (a, label, x = '') => `<button data-a="${a}" data-id="${c.id}" ${x}>${label}</button>`;
  const inv = Object.entries(c.inv).filter(([k]) => S.items[k]).map(([k, q]) => { const i = S.items[k], on = c.equip[i.type] === k;
    return `<div class="row inv"><span>${esc(i.name)} ×${q} <small>${IT[i.type]} ${i.type === 'acess' ? i.attr + ' +' : i.type === 'cons' ? '+' : ''}${i.power}${i.type === 'cons' ? ' ' + L[i.eff] : ''}</small></span>
      ${own ? (i.type === 'cons' ? btn('use', 'Usar', `data-item="${k}"`) : btn('equip', on ? 'Desequipar' : 'Equipar', `data-item="${k}" ${on ? 'class="own"' : ''}`)) + btn('drop', '−', `data-item="${k}"`) : ''}</div>`; }).join('');
  return `<div class="sheet" style="--c:${esc(c.color)}"><h3>${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}${esc(c.name)} <small>${c.enemy ? 'NPC' : esc(c.owner)} · XP ${c.xp} ${stList(c)}</small></h3>
    <div class="row">${inp('name', c.name, 'text')}${inp('color', c.color, 'color')}${own ? `<label class="up">Retrato<input type="file" accept="image/*" data-up="img" data-id="${c.id}"></label>` : ''}</div>
    ${['hp', 'aura', 'san'].map(k => `${bar(k, c)}<div class="row">${inp(k, c[k])}/ ${inp(k + 'Max', c[k + 'Max'])}</div>`).join('')}
    ${bar('limit', c)}<div class="row">${inp('limit', c.limit)}% · Mod. da rolagem <input type="number" class="mod" data-mid="${c.id}" value="${mods[c.id] || 0}" ${ed}></div>
    <div class="attrs">${A.map(a => `<div class="${c.marks[a] ? 'mk' : ''}"><button data-a="roll" data-id="${c.id}" data-attr="${a}" ${ed}>${a}</button>${inp('attrs.' + a, c.attrs[a])}</div>`).join('')}</div>
    <div class="row">Arma ${inp('arma', c.arma)} Armadura ${inp('armor', c.armor)} Ouro ${inp('gold', c.gold)}</div>
    <div class="row chips">${Object.entries(EL).map(([k, l]) => `<span class="${c.weak.includes(k) ? 'weak' : c.resist.includes(k) ? 'res' : ''}" ${gm ? `data-a="aff" data-id="${c.id}" data-el="${k}"` : ''} title="${c.weak.includes(k) ? 'Fraqueza' : c.resist.includes(k) ? 'Resistência' : 'Normal'}">${l}</span>`).join('')}</div>
    ${gm ? `<div class="row chips">${Object.entries(ST).map(([k, l]) => `<span class="${c.st[k] ? 'weak' : ''}" data-a="st" data-id="${c.id}" data-k="${k}">${l}</span>`).join('')}</div>` : ''}
    ${grid(c)}<b>Inventário</b>${inv || '<div class="row"><small>vazio</small></div>'}
    ${gm ? `<div class="row chips">Dar: ${Object.entries(S.items).map(([k, i]) => `<span data-a="give" data-id="${c.id}" data-item="${k}">+ ${esc(i.name)}</span>`).join('')}</div>
    <div class="row">XP ${inp('xp', c.xp)}${btn('horror', 'Horror')}${btn('evolve', 'Evoluir')}${btn('place', c.x == null ? 'Pôr no mapa' : 'Tirar do mapa')}${btn('delChar', 'Excluir')}</div>` : ''}</div>`;
}

function render() {
  if (document.activeElement?.matches?.('#app input,#app select')) { pending = true; return; }
  pending = false;
  const b = S.battle.active, sc = S.scenes[S.scene], chars = Object.values(S.chars), on = v => v ? 'class="own"' : '';
  const stage = (b ? battle() : '') + (!b || gm ? map() : '') + (gm && showEd ? editor(showEd) : '');
  const controls = gm ? `<div class="panel"><div class="row"><button data-a="addChar">+ Personagem</button><button data-a="addChar" data-enemy="1">+ Inimigo</button>
      <button data-a="battle" data-on="${b ? '' : 1}">${b ? 'Encerrar batalha' : 'Iniciar batalha'}</button><button data-a="toggleEd" data-coll="skills" ${on(showEd === 'skills')}>Skills</button><button data-a="toggleEd" data-coll="items" ${on(showEd === 'items')}>Itens</button></div>
      <div class="row chips">Cenas: ${Object.entries(S.scenes).map(([id, s]) => `<span class="${id === S.scene ? 'weak' : ''}" data-a="sceneGo" data-id="${id}">${esc(s.name)}</span>`).join('')}<span data-a="sceneAdd">+</span><span data-a="sceneDel">excluir atual</span></div>
      <div class="row"><input data-map="name" value="${esc(sc.name)}"><input type="number" data-map="cols" value="${sc.cols}">×<input type="number" data-map="rows" value="${sc.rows}"></div>
      <div class="row"><input data-map="bg" placeholder="URL da imagem do mapa" value="${esc(sc.bg)}"><label class="up">Enviar mapa<input type="file" accept="image/*" data-up="bg"></label></div>
      <div class="row"><button data-a="map" data-f="fogOn" data-v="${sc.fogOn ? '' : 1}" ${on(sc.fogOn)}>Névoa</button>${sc.fogOn ? `<button data-a="fogMode" ${on(fogMode)}>Pincel de névoa</button><small>Arraste para revelar; Shift para esconder.</small>` : ''}</div></div>`
    : role === 'player' ? `<div class="panel"><div class="row"><b>${esc(name)}</b><button data-a="addChar">+ Novo personagem</button></div></div>` : '';
  const sheets = role === 'table' ? '' : chars.filter(mine).map(sheet).join('');
  const log = `<div class="panel log">${S.log.slice().reverse().map(l => `<p class="${l.kind}"><b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('') || 'Sem rolagens ainda.'}</div>`;
  app.innerHTML = `<main>${stage}</main><aside>${controls}${log}${sheets}</aside>`;
}

app.addEventListener('change', e => {
  const el = e.target, d = el.dataset, v = el.type === 'number' ? +el.value : el.type === 'checkbox' ? el.checked : el.value;
  if (el.tagName === 'SELECT' || el.type === 'file') el.blur();
  if (d.up) {
    const f = el.files[0];
    if (f) fetch('/upload', { method: 'POST', headers: { 'Content-Type': f.type }, body: f }).then(r => r.ok ? r.text() : Promise.reject())
      .then(u => send(d.up === 'bg' ? { t: 'map', f: 'bg', v: u } : { t: 'set', id: d.id, f: 'img', v: u })).catch(() => alert('Falha no upload (PNG/JPG/WEBP/GIF até 5 MB).'));
  } else if (d.ed) send({ t: 'edSet', coll: d.ed, id: d.id, f: d.f, v });
  else if (d.f) send({ t: 'set', id: d.id, f: d.f, v });
  else if (d.map) send({ t: 'map', f: d.map, v });
  else if (d.mid) mods[d.mid] = v;
});
app.addEventListener('focusout', () => setTimeout(() => pending && render()));
app.addEventListener('click', e => {
  const d = e.target.closest('[data-a]')?.dataset, u = e.target.closest('[data-tgt]');
  if (!d && u) { tgt = u.dataset.tgt; return render(); }
  if (!d) return;
  if (d.a === 'toggleEd') { showEd = showEd === d.coll ? null : d.coll; return render(); }
  if (d.a === 'fogMode') { fogMode = !fogMode; return render(); }
  if (d.a === 'act' && !(tgt in S.battle.ticks)) return alert('Escolha um alvo clicando em uma unidade.');
  if ((d.a === 'delChar' || d.a === 'sceneDel') && !confirm('Excluir?')) return;
  const m = { t: d.a, id: d.id, attr: d.attr, mod: mods[d.id] || 0, enemy: !!d.enemy, on: !!d.on, skill: d.skill, el: d.el, target: tgt, item: d.item, coll: d.coll, k: d.k, f: d.f, v: d.v };
  if (d.a === 'addChar' && gm && !d.enemy) m.owner = prompt('Nome do jogador dono?') || '';
  if (d.a === 'horror') m.loss = +prompt('Perda de Sanidade se falhar?', 5) || 5;
  send(m);
});
// mapa: pincel de névoa (mestre) e arrastar tokens
const cell = (e, el) => { const r = el.getBoundingClientRect(), m = S.scenes[S.scene]; return { x: Math.floor((e.clientX - r.left) / r.width * m.cols), y: Math.floor((e.clientY - r.top) / r.height * m.rows) }; };
const paint = e => { const mp = e.target.closest?.('.map'); if (!mp) return; const c = cell(e, mp), k = c.x + ',' + c.y + e.shiftKey; if (k !== lastFog) { lastFog = k; send({ t: 'fog', ...c, hide: e.shiftKey }); } };
app.addEventListener('pointerdown', e => {
  if (gm && fogMode && S.scenes[S.scene].fogOn) { lastFog = ''; return paint(e); }
  const t = e.target.closest('.tok.mine');
  if (t) { drag = t; t.setPointerCapture(e.pointerId); }
});
app.addEventListener('pointermove', e => {
  if (gm && fogMode && e.buttons) return paint(e);
  if (!drag) return;
  const r = drag.parentElement.getBoundingClientRect();
  drag.style.left = e.clientX - r.left - drag.offsetWidth / 2 + 'px'; drag.style.top = e.clientY - r.top - drag.offsetHeight / 2 + 'px';
});
app.addEventListener('pointerup', e => {
  if (!drag) return;
  send({ t: 'move', id: drag.dataset.id, ...cell(e, drag.parentElement) });
  drag = null;
});
if (role) connect();

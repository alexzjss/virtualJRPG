const role = document.body.dataset.role, app = document.getElementById('app'), gm = role === 'gm';
const A = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'], AO = Object.fromEntries(A.map(a => [a, a]));
const L = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
const EL = { fis: 'Físico', kagutsuchi: 'Kagutsuchi·Fogo', susanoo: 'Susanoo·Água', atlas: 'Atlas·Terra', indra: 'Indra·Raio', fuhaku: 'Fuhaku·Vento', amaterasu: 'Amaterasu·Luz', tsukuyomi: 'Tsukuyomi·Escuridão', shukketsu: 'Shukketsu·Sangue', radiacao: 'Hiruko·Radiação' };
const ELC = { fis: '#ffffff', kagutsuchi: '#ff5a1f', susanoo: '#2e8bff', atlas: '#b9853c', indra: '#ffe600', fuhaku: '#7dffb0', amaterasu: '#fff3a0', tsukuyomi: '#8a4dff', shukketsu: '#c10020', radiacao: '#9dff00' };
const KIND = { dmg: 'Dano', mental: 'Dano mental', heal: 'Cura', passive: 'Passiva' }, PASL = { hpMax: 'HP máx', auraMax: 'Aura máx', sanMax: 'Sanidade máx', res: 'Resistência', ...AO }, RES = { aura: 'Aura', san: 'Sanidade' };
const ST = { down: 'Derrubado', burn: 'Queimadura', bleed: 'Sangramento', poison: 'Veneno', rad: 'Radiação', stun: 'Atordoado', sleep: 'Sono', para: 'Paralisia', silence: 'Silêncio', atkUp: 'ATQ↑', atkDn: 'ATQ↓', defUp: 'DEF↑', defDn: 'DEF↓', agiUp: 'AGI↑', agiDn: 'AGI↓', fear: 'Medo', fury: 'Fúria', confuse: 'Confusão' };
const IT = { cons: 'Consumível', arma: 'Arma', armadura: 'Armadura', acess: 'Acessório' };
const PER = { Atletismo: ['FOR', 'CON'], Furtividade: ['DES', 'AGI'], Ladinagem: ['DES', 'INT'], Percepção: ['SAB', 'INT'], Sobrevivência: ['SAB', 'CON'], Medicina: ['INT', 'SAB'], Conhecimento: ['INT', 'INT'], Persuasão: ['CAR', 'SAB'], Intimidação: ['CAR', 'FOR'], Sorte: ['SOR', 'SOR'] };
const TABS = { st: 'Status', per: 'Perícias', sk: 'Skills', inv: 'Itens', bio: 'História' };
const ED = {
  skills: [['Skill', 'name', 'text'], ['Tipo', 'kind', KIND], ['Elemento', 'el', EL], ['Atr.', 'attr', AO], ['Poder', 'power'], ['Custo', 'cost'], ['Recurso', 'res', RES], ['Status', 'st', { '': '—', ...ST }], ['Área', 'area', 'checkbox'], ['Tempo%', 'ct'], ['Passiva', 'pas', PASL], ['XP', 'xp'], ['X', 'gx'], ['Y', 'gy'], ['Lim.', 'limit', 'checkbox']],
  items: [['Item', 'name', 'text'], ['Tipo', 'type', IT], ['Poder', 'power'], ['Restaura', 'eff', { hp: 'HP', aura: 'Aura', san: 'Sanidade' }], ['Atr. (acess.)', 'attr', AO], ['Preço', 'price']],
};
let S, ws, pending = false, drag = null, tgt = null, showEd = null, fogMode = false, lastFog = '', secret = false, seen = null, lastCur = null;
const mods = {}, tabs = {}, selNode = {};
const ask = (k, q) => localStorage[k] || (localStorage[k] = prompt(q) || '');
const name = role === 'player' ? ask('vj_name', 'Seu nome de jogador? (sem espaços)') : '';
const pass = role === 'player' ? ask('vj_pass_' + name, `Senha de ${name}? (no primeiro acesso, você está criando a senha)`) : '';
const key = gm ? ask('vj_key', 'Chave do mestre?') : '';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const send = o => ws.readyState === 1 && ws.send(JSON.stringify(o));
const mine = c => gm || (role === 'player' && c.owner === name);
const eq = (c, slot) => S.items[c.equip[slot]];
const at = (c, a) => c.attrs[a] + (eq(c, 'acess')?.attr === a ? eq(c, 'acess').power : 0);
const delay = c => Math.round(1000 / Math.max(1, at(c, 'AGI') * (c.st.agiUp ? 1.25 : 1) * (c.st.agiDn ? .75 : 1)));
const sanSt = c => { const p = c.san / (c.sanMax || 1); return p <= 0 ? 'Colapso −30' : p <= .25 ? 'Surto −20' : p <= .5 ? 'Abalado −10' : ''; };
const stList = c => [sanSt(c), ...Object.entries(c.st).map(([k, n]) => `${ST[k]} ${n}`)].filter(Boolean).join(' · ');
const desc = s => s.kind === 'passive' ? `Passiva · ${s.pas === 'res' ? 'Resistência a ' + EL[s.el] : '+' + s.power + ' ' + PASL[s.pas]}` : `${KIND[s.kind]}${s.area ? ' em área' : ''}${(s.ct || 100) !== 100 ? ` · tempo ${s.ct}%` : ''} · ${EL[s.el]} · ${s.attr} · poder ${s.power} · ${s.limit ? 'Limite 100%' : s.cost + ' ' + RES[s.res]}${s.st ? ' · causa ' + ST[s.st] : ''}`;
const bgImg = u => u ? `background-image:url('${esc(u)}');` : '';
const chips = (obj, fn) => Object.entries(obj).map(([k, v]) => fn(k, v)).join('');

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => send({ t: 'hello', role, name, pass, key });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === 'state') { S = m.s; render(); }
    if (m.t === 'err') { alert(m.msg); if (m.bad) { ws.onclose = null; ['vj_key', 'vj_name', 'vj_pass_' + name].forEach(k => delete localStorage[k]); location.reload(); } }
  };
  ws.onclose = () => setTimeout(connect, 1500);
}

function timeline(n = 8) {
  const t = { ...S.battle.ticks }, out = [];
  for (let i = 0; i < n; i++) {
    const id = Object.keys(t).filter(k => { const c = S.chars[k]; return c && !c.dead && (c.hp > 0 || !c.enemy); }).sort((a, b) => t[a] - t[b] || a.localeCompare(b))[0];
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
    `<div class="unit ${c === cur ? 'cur' : ''} ${c.id === tgt ? 'tgt' : ''} ${c.hp > 0 ? '' : 'ko'}" data-tgt="${c.id}" style="--c:${esc(c.color)}">${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}<div><b>${esc(c.name)}</b> <em>${c.hp > 0 ? stList(c) : c.dead ? 'Morto' : c.dying ? `Caído ☠ ${c.dying}` : 'Caído'}</em>${bar('hp', c, e && !gm)}${e ? '' : bar('aura', c) + bar('san', c) + bar('limit', c)}</div></div>`).join('');
  const acts = c => `<div class="row"><b>${esc(c.name)}:</b>${gm && c.enemy ? '<button class="own" data-a="ai">IA decide</button>' : ''}<button data-a="act" data-id="${c.id}" data-skill="atk">Ataque</button>${c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive').map(k => { const s = S.skills[k];
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
  const sel = selNode[c.id], ss = S.skills[sel];
  return `<div class="grid">${chips(S.skills, (id, s) => `<i class="${c.skills.includes(id) ? 'own' : adjTo(s) ? 'av' : ''} ${id === sel ? 'sel' : ''} ${s.kind === 'passive' ? 'pas' : ''}" style="grid-column:${s.gx + 1};grid-row:${s.gy + 1};--e:${ELC[s.el]}" data-node="${id}" data-id="${c.id}" title="${esc(s.name)}"></i>`)}</div>
    ${ss ? `<div class="node"><b>${esc(ss.name)}</b> <small>${esc(desc(ss))}</small><div class="row">${c.skills.includes(sel) ? '<em>Aprendida ✓</em>'
      : `<button data-a="learn" data-id="${c.id}" data-skill="${sel}" ${mine(c) && adjTo(ss) && c.xp >= ss.xp ? '' : 'disabled'}>Aprender · ${ss.xp} XP</button>${adjTo(ss) ? '' : '<small>Precisa de um nó vizinho aprendido.</small>'}`}</div></div>`
      : '<small>Toque em um nó para ver detalhes (círculo = skill, quadrado = passiva). O primeiro nó pode ser qualquer um.</small>'}`;
}

function editor(coll) {
  const cell = (id, o, [, f, t = 'number']) => { const a = `data-ed="${coll}" data-id="${id}" data-f="${f}"`;
    return typeof t === 'object' ? `<select ${a}>${chips(t, (k, l) => `<option value="${k}" ${k === o[f] ? 'selected' : ''}>${l}</option>`)}</select>`
      : `<input type="${t}" ${a} ${t === 'checkbox' ? (o[f] ? 'checked' : '') : `value="${esc(o[f])}"`}>`; };
  return `<section class="panel editor"><table><tr>${ED[coll].map(c => `<th>${c[0]}`).join('')}<th></tr>${chips(S[coll], (id, o) =>
    `<tr>${ED[coll].map(c => `<td>${cell(id, o, c)}`).join('')}<td><button data-a="edDel" data-coll="${coll}" data-id="${id}">×</button></tr>`)}</table><button data-a="edAdd" data-coll="${coll}">+ Novo</button>
    ${coll === 'items' ? `<div class="row chips"><button data-a="shop" data-f="open" data-v="${S.shop.open ? '' : 1}" class="${S.shop.open ? 'own' : ''}">Loja ${S.shop.open ? 'aberta' : 'fechada'}</button>À venda: ${chips(S.items, (k, i) => `<span class="${S.shop.stock.includes(k) ? 'weak' : ''}" data-a="shop" data-item="${k}">${esc(i.name)}</span>`)}</div>` : ''}</section>`;
}

function sheet(c) {
  const own = mine(c), ed = own ? '' : 'disabled', tab = tabs[c.id] || 'st';
  const inp = (f, v, type = 'number') => `<input type="${type}" data-id="${c.id}" data-f="${f}" value="${esc(v)}" ${ed}>`;
  const btn = (a, label, x = '') => `<button data-a="${a}" data-id="${c.id}" ${x}>${label}</button>`;
  const body = {
    st: () => `<div class="row">${inp('name', c.name, 'text')}${inp('color', c.color, 'color')}${own ? `<label class="up">Retrato<input type="file" accept="image/*" data-up="img" data-id="${c.id}"></label>` : ''}</div>
      ${['hp', 'aura', 'san'].map(k => `${bar(k, c)}<div class="row">${inp(k, c[k])}/ ${inp(k + 'Max', c[k + 'Max'])}</div>`).join('')}
      ${bar('limit', c)}<div class="row">${inp('limit', c.limit)}% · Mod. da rolagem <input type="number" class="mod" data-mid="${c.id}" value="${mods[c.id] || 0}" ${ed}></div>
      <div class="attrs">${A.map(a => `<div class="${c.marks[a] ? 'mk' : ''}"><button data-a="roll" data-id="${c.id}" data-attr="${a}" ${ed}>${a}</button>${inp('attrs.' + a, c.attrs[a])}</div>`).join('')}</div>
      <div class="row">Arma ${inp('arma', c.arma)} Armadura ${inp('armor', c.armor)} Ouro ${inp('gold', c.gold)}</div>
      <div class="row chips">${chips(EL, (k, l) => `<span class="${c.weak.includes(k) ? 'weak' : c.resist.includes(k) ? 'res' : ''}" ${gm ? `data-a="aff" data-id="${c.id}" data-el="${k}"` : ''} title="${c.weak.includes(k) ? 'Fraqueza' : c.resist.includes(k) ? 'Resistência' : 'Normal'}">${l}</span>`)}</div>
      ${gm ? `<div class="row chips">${chips(ST, (k, l) => `<span class="${c.st[k] ? 'weak' : ''}" data-a="st" data-id="${c.id}" data-k="${k}">${l}</span>`)}</div>
      <div class="row">XP ${inp('xp', c.xp)}${c.enemy ? `Recompensa: XP ${inp('xpR', c.xpR)} Ouro ${inp('goldR', c.goldR)}` : ''}</div>
      <div class="row">${btn('horror', 'Horror')}${btn('evolve', 'Evoluir')}${btn('place', c.x == null ? 'Pôr no mapa' : 'Tirar do mapa')}${btn('bSave', '→ Bestiário')}${btn('delChar', 'Excluir')}</div>` : ''}`,
    per: () => `<div class="pers">${chips(PER, (k, [a, b]) => `<div class="row">${btn('roll', `${k} ${Math.round((at(c, a) + at(c, b)) / 2) + (c.per[k] || 0)}%`, `data-per="${k}" ${ed}`)}<small>${a}${a === b ? '' : '+' + b}</small> treino ${inp('per.' + k, c.per[k] || 0)}</div>`)}</div>`,
    sk: () => `${grid(c)}${c.skills.filter(k => S.skills[k]).map(k => `<p><b>${esc(S.skills[k].name)}</b> <small>${esc(desc(S.skills[k]))}</small></p>`).join('')}`,
    inv: () => `<div class="row">Ouro: <b>${c.gold}</b></div>${Object.entries(c.inv).filter(([k]) => S.items[k]).map(([k, q]) => { const i = S.items[k], on = c.equip[i.type] === k, x = `data-item="${k}"`;
        return `<div class="row inv"><span>${esc(i.name)} ×${q} <small>${IT[i.type]} ${i.type === 'acess' ? i.attr + ' +' : i.type === 'cons' ? '+' : ''}${i.power}${i.type === 'cons' ? ' ' + L[i.eff] : ''}</small></span>
        ${own ? (i.type === 'cons' ? btn('use', 'Usar', x) : btn('equip', on ? 'Desequipar' : 'Equipar', `${x} ${on ? 'class="own"' : ''}`)) + (S.shop.open ? btn('sell', `Vender ${Math.floor(i.price / 2)}`, x) : '') + btn('drop', '−', x) : ''}</div>`; }).join('') || '<div class="row"><small>vazio</small></div>'}
      ${S.shop.open && own ? `<b>Loja</b>${S.shop.stock.filter(k => S.items[k]).map(k => `<div class="row inv"><span>${esc(S.items[k].name)} <small>${IT[S.items[k].type]} ${S.items[k].power}</small></span>${btn('buy', `Comprar ${S.items[k].price}`, `data-item="${k}" ${c.gold < S.items[k].price ? 'disabled' : ''}`)}</div>`).join('')}` : ''}
      ${gm ? `<div class="row chips">Dar: ${chips(S.items, (k, i) => `<span data-a="give" data-id="${c.id}" data-item="${k}">+ ${esc(i.name)}</span>`)}</div>` : ''}`,
    bio: () => `<textarea data-id="${c.id}" data-f="bio" placeholder="História, aparência, anotações…" ${ed}>${esc(c.bio)}</textarea>${gm ? `<textarea data-id="${c.id}" data-f="gmNote" placeholder="Notas secretas do mestre">${esc(c.gmNote)}</textarea>` : ''}`,
  };
  return `<div class="sheet" style="--c:${esc(c.color)}"><h3>${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}${esc(c.name)} <small>${c.enemy ? 'NPC' : esc(c.owner)} · XP ${c.xp} ${stList(c)}</small></h3>
    <div class="tabs">${chips(TABS, (k, l) => `<span class="${k === tab ? 'on' : ''}" data-tab="${k}" data-id="${c.id}">${l}</span>`)}</div>${body[tab]()}</div>`;
}

function render() {
  const ae = document.activeElement;
  if (drag || ae?.matches?.('#app select')) { pending = true; return; }
  pending = false;
  // guarda o campo em edição para devolver foco e texto depois de redesenhar
  const keep = ae && app.contains(ae) && ae.matches('input:not([type=file]),textarea') ? { v: ae.value, s: ae.selectionStart,
    sel: ae.tagName + Object.entries(ae.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, x => '-' + x.toLowerCase())}="${CSS.escape(v)}"]`).join('') } : null;
  const b = S.battle.active, sc = S.scenes[S.scene], chars = Object.values(S.chars), on = v => v ? 'class="own"' : '';
  const stage = (b ? battle() : '') + (!b || gm ? map() : '') + (gm && showEd ? editor(showEd) : '');
  const controls = gm ? `<div class="panel"><div class="row"><button data-a="addChar">+ Personagem</button><button data-a="addChar" data-enemy="1">+ Inimigo</button>
      ${b ? '<button data-a="battle" data-win="1" class="own">Vitória</button><button data-a="battle">Encerrar batalha</button>' : '<button data-a="battle" data-on="1">Iniciar batalha</button>'}
      <button data-a="toggleEd" data-coll="skills" ${on(showEd === 'skills')}>Skills</button><button data-a="toggleEd" data-coll="items" ${on(showEd === 'items')}>Itens/Loja</button><button data-a="secret" ${on(secret)}>Rolagem secreta</button></div>
      <div class="row chips">Bestiário: ${chips(S.bestiary, (id, m) => `<span data-a="bSpawn" data-id="${id}" title="Clique: criar cópia · Shift+clique: apagar modelo">+ ${esc(m.name)}</span>`) || '<small>salve um inimigo pela ficha</small>'}</div>
      <div class="row chips">Cenas: ${chips(S.scenes, (id, s) => `<span class="${id === S.scene ? 'weak' : ''}" data-a="sceneGo" data-id="${id}">${esc(s.name)}</span>`)}<span data-a="sceneAdd">+</span><span data-a="sceneDel">excluir atual</span></div>
      <div class="row"><input data-map="name" value="${esc(sc.name)}"><input type="number" data-map="cols" value="${sc.cols}">×<input type="number" data-map="rows" value="${sc.rows}"></div>
      <div class="row"><input data-map="bg" placeholder="URL da imagem do mapa" value="${esc(sc.bg)}"><label class="up">Enviar mapa<input type="file" accept="image/*" data-up="bg"></label></div>
      <div class="row"><button data-a="map" data-f="fogOn" data-v="${sc.fogOn ? '' : 1}" ${on(sc.fogOn)}>Névoa</button>${sc.fogOn ? `<button data-a="fogMode" ${on(fogMode)}>Pincel de névoa</button><small>Arraste para revelar; Shift para esconder.</small>` : ''}</div>
      <textarea data-map="note" placeholder="Notas secretas desta cena">${esc(sc.note)}</textarea></div>`
    : role === 'player' ? `<div class="panel"><div class="row"><b>${esc(name)}</b><button data-a="addChar">+ Novo personagem</button><button data-a="logout">Sair</button></div></div>` : '';
  const sheets = role === 'table' ? '' : chars.filter(mine).map(sheet).join('');
  const log = `<div class="panel">${role === 'table' ? '' : '<input class="chat" data-chat="1" placeholder="Mensagem · /r 2d6+1 · /w nome texto (Enter)">'}<div class="log">${S.log.slice().reverse().map(l => `<p class="${l.kind} ${l.to ? 'priv' : ''}"><b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('') || 'Sem rolagens ainda.'}</div></div>`;
  app.innerHTML = `<main>${stage}</main><aside>${controls}${log}${sheets}</aside>`;
  if (keep) { const el = app.querySelector(keep.sel); if (el) { el._dirty = el.value !== keep.v; el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch {} } }
  fx();
}

// efeitos: dados 3D, números flutuantes, flash elemental e faixa de turno
function fx() {
  const news = seen == null ? [] : S.log.filter(e => e.n > seen), cur = S.battle.active ? S.chars[timeline(1)[0]] : null;
  seen = S.seq;
  for (const e of news.slice(-4)) {
    if (e.d) import('/dice.js').then(m => m.roll(e.d)).catch(() => {});
    const el = e.fx && (app.querySelector(`.unit[data-tgt="${e.fx.id}"]`) || app.querySelector(`.tok[data-id="${e.fx.id}"]`));
    if (!el) continue;
    const s = document.createElement('span');
    s.className = 'float ' + (e.fx.heal ? 'heal' : e.fx.miss ? 'miss' : e.fx.crit ? 'crit' : '');
    s.textContent = e.fx.heal ? '+' + e.fx.heal : e.fx.miss ? 'ERROU' : (e.fx.crit ? 'CRÍTICO ' : '') + '−' + e.fx.dmg;
    el.style.setProperty('--fx', ELC[e.fx.el] || '#fff'); el.append(s);
    if (e.fx.dmg) el.classList.add('hit');
  }
  if (cur && cur.id !== lastCur) { const bn = document.createElement('div'); bn.className = 'banner'; bn.textContent = 'Turno de ' + cur.name; bn.style.setProperty('--c', cur.color); document.body.append(bn); setTimeout(() => bn.remove(), 1400); }
  lastCur = cur?.id;
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
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.chat && e.target.value.trim()) { send({ t: 'chat', text: e.target.value, secret }); e.target.value = ''; } });
app.addEventListener('focusout', e => {
  // campo restaurado após redesenho não dispara "change" sozinho: dispara aqui para não perder a edição
  if (e.target._dirty) { e.target._dirty = false; e.target.dispatchEvent(new Event('change', { bubbles: true })); }
  setTimeout(() => pending && render());
});
app.addEventListener('click', e => {
  const d = e.target.closest('[data-a]')?.dataset, u = e.target.closest('[data-tgt]'), tb = e.target.closest('[data-tab]');
  if (tb) { tabs[tb.dataset.id] = tb.dataset.tab; return render(); }
  const nd = e.target.closest('[data-node]');
  if (nd) { selNode[nd.dataset.id] = nd.dataset.node; return render(); }
  if (!d && u) { tgt = u.dataset.tgt; return render(); }
  if (!d) return;
  if (d.a === 'toggleEd') { showEd = showEd === d.coll ? null : d.coll; return render(); }
  if (d.a === 'fogMode') { fogMode = !fogMode; return render(); }
  if (d.a === 'secret') { secret = !secret; return render(); }
  if (d.a === 'logout') { ['vj_name', 'vj_pass_' + name].forEach(k => delete localStorage[k]); return location.reload(); }
  if (d.a === 'act' && !(tgt in S.battle.ticks)) return alert('Escolha um alvo clicando em uma unidade.');
  if ((d.a === 'delChar' || d.a === 'sceneDel') && !confirm('Excluir?')) return;
  const m = { t: d.a, id: d.id, attr: d.attr, per: d.per, mod: mods[d.id] || 0, secret, enemy: !!d.enemy, on: !!d.on, win: !!d.win, skill: d.skill, el: d.el, target: tgt, item: d.item, coll: d.coll, k: d.k, f: d.f, v: d.v };
  if (d.a === 'bSpawn' && e.shiftKey) m.t = 'bDel';
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
const drop = e => { if (!drag) return; if (e.type === 'pointerup') send({ t: 'move', id: drag.dataset.id, ...cell(e, drag.parentElement) }); drag = null; if (pending) render(); };
app.addEventListener('pointerup', drop); app.addEventListener('pointercancel', drop);
if (role) connect();

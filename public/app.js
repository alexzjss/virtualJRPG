const role = document.body.dataset.role, app = document.getElementById('app'), gm = role === 'gm';
const A = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'], AO = Object.fromEntries(A.map(a => [a, a]));
const L = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
const EL = { fis: 'Físico', kagutsuchi: 'Kagutsuchi·Fogo', susanoo: 'Susanoo·Água', atlas: 'Atlas·Terra', indra: 'Indra·Raio', fuhaku: 'Fuhaku·Vento', amaterasu: 'Amaterasu·Luz', tsukuyomi: 'Tsukuyomi·Escuridão', shukketsu: 'Shukketsu·Sangue', radiacao: 'Hiruko·Radiação' };
const ELC = { fis: '#ffffff', kagutsuchi: '#ff5a1f', susanoo: '#2e8bff', atlas: '#b9853c', indra: '#ffe600', fuhaku: '#7dffb0', amaterasu: '#fff3a0', tsukuyomi: '#8a4dff', shukketsu: '#c10020', radiacao: '#9dff00' };
const KIND = { dmg: 'Dano', mental: 'Dano mental', heal: 'Cura', passive: 'Passiva' }, PASL = { hpMax: 'HP máx', auraMax: 'Aura máx', sanMax: 'Sanidade máx', res: 'Resistência', ...AO }, RES = { aura: 'Aura', san: 'Sanidade' };
const ST = { down: 'Derrubado', burn: 'Queimadura', bleed: 'Sangramento', poison: 'Veneno', rad: 'Radiação', stun: 'Atordoado', sleep: 'Sono', para: 'Paralisia', silence: 'Silêncio', atkUp: 'ATQ↑', atkDn: 'ATQ↓', defUp: 'DEF↑', defDn: 'DEF↓', agiUp: 'AGI↑', agiDn: 'AGI↓', fear: 'Medo', fury: 'Fúria', confuse: 'Confusão' };
const IT = { cons: 'Consumível', arma: 'Arma', armadura: 'Armadura', acess: 'Acessório' };
const PER = { Atletismo: ['FOR', 'CON'], Furtividade: ['DES', 'AGI'], Ladinagem: ['DES', 'INT'], Percepção: ['SAB', 'INT'], Sobrevivência: ['SAB', 'CON'], Medicina: ['INT', 'SAB'], Conhecimento: ['INT', 'INT'], Persuasão: ['CAR', 'SAB'], Intimidação: ['CAR', 'FOR'], Sorte: ['SOR', 'SOR'] };
const BODY = { head: ['INT', 'SAB'], torso: ['CON'], armL: ['FOR', 'DES'], armR: ['FOR', 'DES'], legL: ['AGI'], legR: ['AGI'] }, PARTS = Object.keys(BODY), AIMP = { head: 30, torso: 0, armL: 15, armR: 15, legL: 15, legR: 15 };
const PL = { head: 'Cabeça', torso: 'Torso', armL: 'Braço esq.', armR: 'Braço dir.', legL: 'Perna esq.', legR: 'Perna dir.' }, LV = ['ileso', 'ferido', 'crítico'];
const SHAPE = { head: ['circle', 'cx="60" cy="28" r="20"'], torso: ['rect', 'x="38" y="52" width="44" height="82"'], armL: ['rect', 'x="14" y="54" width="20" height="80"'], armR: ['rect', 'x="86" y="54" width="20" height="80"'], legL: ['rect', 'x="38" y="138" width="20" height="108"'], legR: ['rect', 'x="62" y="138" width="20" height="108"'] };
const WIN = { cena: ['Cena', 330], batalha: ['Batalha', 600], fichas: ['Fichas', 400], chat: ['Chat', 340], skills: ['Skills', 1000], items: ['Itens e loja', 720] };
const CAMPL = { vigiar: 'Vigiar (AGI↑)', cozinhar: 'Cozinhar (grupo ATQ↑)', conversar: 'Conversar (+5 Sanidade)', treinar: 'Treinar (+5 XP)', meditar: 'Meditar (+30 Limite)' };
const TABS = { st: 'Status', per: 'Perícias', sk: 'Skills', inv: 'Itens', bio: 'História' };
const ED = {
  skills: [['Skill', 'name', 'text'], ['Tipo', 'kind', KIND], ['Elemento', 'el', EL], ['Atr.', 'attr', AO], ['Poder', 'power'], ['Custo', 'cost'], ['Recurso', 'res', RES], ['Status', 'st', { '': '—', ...ST }], ['Área', 'area', 'checkbox'], ['Tempo%', 'ct'], ['Passiva', 'pas', PASL], ['XP', 'xp'], ['X', 'gx'], ['Y', 'gy'], ['Lim.', 'limit', 'checkbox']],
  items: [['Item', 'name', 'text'], ['Tipo', 'type', IT], ['Poder', 'power'], ['Restaura', 'eff', { hp: 'HP', aura: 'Aura', san: 'Sanidade' }], ['Atr. (acess.)', 'attr', AO], ['Preço', 'price']],
};
let aim = null, sub = null, pv = 'cena', wdrag = null, capT;
let wins = { cena: { x: 16, y: 64, open: true }, batalha: { x: 360, y: 64, open: true }, fichas: { x: Math.max(380, innerWidth - 420), y: 64, open: true }, chat: { x: 16, y: Math.max(300, innerHeight - 330), open: true }, skills: { x: 60, y: 110, open: false }, items: { x: 90, y: 140, open: false } };
try { wins = { ...wins, ...JSON.parse(localStorage.vj_wins) }; } catch {}
let S, ws, pending = false, drag = null, tgt = null, showEd = null, fogMode = false, lastFog = '', secret = false, seen = null, lastCur = null;
const mods = {}, tabs = {}, selNode = {}, open = {};
const ask = (k, q) => localStorage[k] || (localStorage[k] = prompt(q) || '');
const name = role === 'player' ? ask('vj_name', 'Seu nome de jogador? (sem espaços)') : '';
const pass = role === 'player' ? ask('vj_pass_' + name, `Senha de ${name}? (no primeiro acesso, você está criando a senha)`) : '';
const key = gm ? ask('vj_key', 'Chave do mestre?') : '';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const send = o => ws.readyState === 1 && ws.send(JSON.stringify(o));
const mine = c => gm || (role === 'player' && c.owner === name);
const eq = (c, slot) => S.items[c.equip[slot]];
const lvl = (c, k) => { const d = c.body[k] || 0; return d >= c.hpMax * .3 ? 2 : d >= c.hpMax * .15 ? 1 : 0; };
const at = (c, a) => c.attrs[a] + (eq(c, 'acess')?.attr === a ? eq(c, 'acess').power : 0) - 10 * PARTS.filter(k => BODY[k].includes(a) && lvl(c, k) === 2).length;
// figura de corpo: mode 'aim' deixa mirar numa parte; 'gm' deixa o mestre ferir/curar a parte
function bodyFig(c, mode) {
  const hurt = PARTS.filter(k => lvl(c, k)).map(k => `${PL[k]}: ${LV[lvl(c, k)]}`);
  return `<div class="body"><svg viewBox="0 0 120 260" role="img" aria-label="Corpo de ${esc(c.name)}: ${hurt.join(', ') || 'ileso'}">${PARTS.map(k => `<${SHAPE[k][0]} ${SHAPE[k][1]} class="l${lvl(c, k)} ${mode === 'aim' && aim === k ? 'aim' : ''}" ${mode === 'aim' ? `data-aim="${k}"` : mode === 'gm' ? `data-a="part" data-id="${c.id}" data-k="${k}"` : ''}><title>${PL[k]} · ${LV[lvl(c, k)]}</title></${SHAPE[k][0]}>`).join('')}</svg><small>${hurt.join('<br>') || 'Ileso'}</small></div>`;
}
const aimBox = () => { const t = S.chars[tgt]; return t && t.id in S.battle.ticks ? `<div class="aimrow">${bodyFig(t, 'aim')}<div>Mira em <b>${esc(t.name)}</b>: <b>${aim ? `${PL[aim]} (−${AIMP[aim]}% de acerto)` : 'sem mira'}</b><br><small>Toque numa parte do corpo para mirar; parte crítica causa penalidade e status.</small></div></div>` : ''; };
const delay = c => Math.round(1000 / Math.max(1, at(c, 'AGI') * (c.st.agiUp ? 1.25 : 1) * (c.st.agiDn ? .75 : 1)));
const sanSt = c => { const p = c.san / (c.sanMax || 1); return p <= 0 ? 'Colapso −30' : p <= .25 ? 'Surto −20' : p <= .5 ? 'Abalado −10' : ''; };
const stList = c => [sanSt(c), ...Object.entries(c.st).map(([k, n]) => `${ST[k]} ${n}`)].filter(Boolean).join(' · ');
const desc = s => s.kind === 'passive' ? `Passiva · ${s.pas === 'res' ? 'Resistência a ' + EL[s.el] : '+' + s.power + ' ' + PASL[s.pas]}` : `${KIND[s.kind]}${s.area ? ' em área' : ''}${(s.ct || 100) !== 100 ? ` · tempo ${s.ct}%` : ''} · ${EL[s.el]} · ${s.attr} · poder ${s.power} · ${s.limit ? 'Limite 100%' : s.cost + ' ' + RES[s.res]}${s.st ? ' · causa ' + ST[s.st] : ''}`;
const bgImg = u => u ? `background-image:url('${esc(u)}');` : '';
const chips = (obj, fn) => Object.entries(obj).map(([k, v]) => fn(k, v)).join('');

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => document.body.classList.remove('off') || send({ t: 'hello', role, name, pass, key });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === 'state') { S = m.s; render(); }
    if (m.t === 'err') { alert(m.msg); if (m.bad) { ws.onclose = null; ['vj_key', 'vj_name', 'vj_pass_' + name].forEach(k => delete localStorage[k]); location.reload(); } }
  };
  ws.onclose = () => { document.body.classList.add('off'); setTimeout(connect, 1500); };
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
      <button data-a="next">Passar</button></div><small>Clique em uma unidade para escolher o alvo.</small>${aimBox()}`;
  return `<section class="battle"><div class="tl">${tl.map((id, i) => `<span class="${i ? '' : 'cur'}" style="--c:${esc(S.chars[id].color)}">${esc(S.chars[id].name)}</span>`).join('')}</div>
    <div class="sides"><div>${side(true)}</div><i>VS</i><div>${side(false)}</div></div>${gm && cur ? acts(cur) : ''}</section>`;
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
  const inp = (f, v, type = 'number') => `<input type="${type}" aria-label="${f}" data-id="${c.id}" data-f="${f}" value="${esc(v)}" ${ed}>`;
  const gin = (f, v) => gm ? inp(f, v) : `<b class="val">${v}</b>`; // campos que só o mestre edita
  const isOpen = open[c.id] ?? !gm, head = `<h3 data-open="${c.id}" role="button" tabindex="0" aria-expanded="${isOpen}">${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}${esc(c.name)} <small>${c.enemy ? 'NPC' : esc(c.owner)} · XP ${c.xp} ${stList(c)}</small><span class="caret">${isOpen ? '▾' : '▸'}</span></h3>`;
  if (!isOpen) return `<div class="sheet shut" style="--c:${esc(c.color)}">${head}${bar('hp', c)}</div>`;
  const btn = (a, label, x = '') => `<button data-a="${a}" data-id="${c.id}" ${x}>${label}</button>`;
  const body = {
    st: () => `<div class="row">${inp('name', c.name, 'text')}${inp('color', c.color, 'color')}${own ? `<label class="up">Retrato<input type="file" accept="image/*" data-up="img" data-id="${c.id}"></label>` : ''}</div>
      ${['hp', 'aura', 'san'].map(k => `${bar(k, c)}<div class="row">${inp(k, c[k])}/ <b class="val">${c[k + 'Max']}</b>${gm ? `<small>bônus</small>${inp('bon.' + k + 'Max', c.bon[k + 'Max'])}` : ''}</div>`).join('')}
      ${S.camp.open && !c.enemy ? `<div class="row chips"><b>Acampamento:</b>${chips(CAMPL, (k, l) => `<span class="${S.camp.acts[c.id] === k ? 'weak' : ''}" ${own ? `data-a="campAct" data-id="${c.id}" data-k="${k}"` : ''}>${l}</span>`)}</div>` : ''}
      ${bodyFig(c, gm ? 'gm' : '')}
      ${bar('limit', c)}<div class="row">${inp('limit', c.limit)}% · Mod. da rolagem <input type="number" class="mod" data-mid="${c.id}" value="${mods[c.id] || 0}" ${ed}></div>
      <div class="attrs">${A.map(a => `<div class="${c.marks[a] ? 'mk' : ''}"><button data-a="roll" data-id="${c.id}" data-attr="${a}" ${ed}>${a}</button>${gin('attrs.' + a, c.attrs[a])}</div>`).join('')}</div>
      <div class="row">Arma ${gin('arma', eq(c, 'arma')?.power ?? c.arma)} Armadura ${gin('armor', c.armor)}${eq(c, 'armadura') ? `<small>+${eq(c, 'armadura').power}</small>` : ''} Ouro ${gin('gold', c.gold)}</div>
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
  return `<div class="sheet" style="--c:${esc(c.color)}">${head}
    <div class="tabs">${chips(TABS, (k, l) => `<span class="${k === tab ? 'on' : ''}" data-tab="${k}" data-id="${c.id}">${l}</span>`)}</div>${body[tab]()}</div>`;
}

// tela do jogador em batalha: barras, figura de corpo e menu de comando
function command(c, cur) {
  const my = cur === c, inB = Object.values(S.chars).filter(o => o.id in S.battle.ticks && !o.dead), tl = timeline(5).slice(1).map(id => esc(S.chars[id].name)).join(' › ');
  const skb = k => { const s = S.skills[k]; return `<button data-a="act" data-id="${c.id}" data-skill="${k}" ${c[s.res] < s.cost || (s.limit && c.limit < 100) || c.st.silence || c.st.fury ? 'disabled' : ''}>${esc(s.name)}<small>${esc(desc(s))}</small></button>`; };
  const menu = sub === 'sk' ? c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive').map(skb).join('') + '<button class="back" data-sub="">Voltar</button>'
    : sub === 'it' ? Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons').map(([k, q]) => `<button data-a="use" data-id="${c.id}" data-item="${k}">${esc(S.items[k].name)} ×${q}<small>+${S.items[k].power} ${L[S.items[k].eff]}</small></button>`).join('') + '<button class="back" data-sub="">Voltar</button>'
    : `<button class="atk" data-a="act" data-id="${c.id}" data-skill="atk">Atacar</button><button data-sub="sk">Skills</button><button data-sub="it">Itens</button><button class="back" data-a="next">Passar</button>`;
  return `<section class="cmd" style="--c:${esc(c.color)}"><div class="turn ${my ? 'me' : ''}">${my ? 'Seu turno' : 'Turno de ' + esc(cur?.name || '—')}</div><small class="nextup">Próximos: ${tl}</small>
    <div class="cmd-top" data-tgt="${c.id}"><div class="cmd-bars"><h2>${esc(c.name)}</h2>${bar('hp', c)}${bar('aura', c)}${bar('san', c)}${bar('limit', c)}<em>${c.hp > 0 ? stList(c) : c.dead ? 'Morto' : `Caído ☠ ${c.dying || ''}`}</em></div>${bodyFig(c)}</div>
    <div class="row chips"><b>Alvo:</b>${inB.sort((x, y) => y.enemy - x.enemy).map(o => `<span class="${o.id === tgt ? 'weak' : ''} ${o.hp > 0 ? '' : 'ko'}" data-tgt="${o.id}">${esc(o.name)}</span>`).join('')}</div>
    ${aimBox()}${my ? `<div class="menu">${menu}</div>` : ''}</section>`;
}

function render() {
  const ae = document.activeElement;
  if (drag || wdrag || ae?.matches?.('#app select')) { pending = true; return; }
  pending = false;
  // guarda o campo em edição e a rolagem das janelas para devolver depois de redesenhar
  const keep = ae && app.contains(ae) && ae.matches('input:not([type=file]),textarea') ? { v: ae.value, s: ae.selectionStart,
    sel: ae.tagName + Object.entries(ae.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, x => '-' + x.toLowerCase())}="${CSS.escape(v)}"]`).join('') } : null;
  const scr = {}; app.querySelectorAll('.win').forEach(w => scr[w.dataset.win] = w.querySelector('.win-body').scrollTop);
  const b = S.battle.active, sc = S.scenes[S.scene], chars = Object.values(S.chars), on = v => v ? 'class="own"' : '';
  const sheets = chars.filter(mine).map(sheet).join('');
  const log = `${role === 'table' ? '' : '<input class="chat" data-chat="1" placeholder="Mensagem · /r 2d6+1 · /w nome texto (Enter)">'}<div class="log" aria-live="polite">${S.log.slice().reverse().map(l => `<p class="${l.kind} ${l.to ? 'priv' : ''}"><b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('') || 'Sem rolagens ainda.'}</div>`;
  if (gm) {
    const cena = `<div class="row"><button data-a="addChar">+ Personagem</button><button data-a="addChar" data-enemy="1">+ Inimigo</button><button data-a="secret" ${on(secret)}>Rolagem secreta</button></div>
      <div class="row">${b ? '<button data-a="battle" data-win="1" class="own">Vitória</button><button data-a="battle">Encerrar batalha</button>' : '<button data-a="battle" data-on="1">Iniciar batalha</button>'}</div>
      <div class="row"><button data-a="rest">Descanso curto</button><button data-a="rest" data-long="1">Descanso longo</button><button data-a="camp" data-on="${S.camp.open ? '' : 1}" ${on(S.camp.open)}>Acampamento</button></div>
      <div class="row chips">Bestiário: ${chips(S.bestiary, (id, m) => `<span data-a="bSpawn" data-id="${id}" title="Clique: criar cópia · Shift+clique: apagar modelo">+ ${esc(m.name)}</span>`) || '<small>salve um inimigo pela ficha</small>'}</div>
      <div class="row chips">Cenas: ${chips(S.scenes, (id, s) => `<span class="${id === S.scene ? 'weak' : ''}" data-a="sceneGo" data-id="${id}">${esc(s.name)}</span>`)}<span data-a="sceneAdd">+</span><span data-a="sceneDel">excluir atual</span></div>
      <div class="row"><input aria-label="Nome da cena" data-map="name" value="${esc(sc.name)}"><input aria-label="Colunas" type="number" data-map="cols" value="${sc.cols}">×<input aria-label="Linhas" type="number" data-map="rows" value="${sc.rows}"></div>
      <div class="row"><input aria-label="Imagem do mapa" data-map="bg" placeholder="URL da imagem do mapa" value="${esc(sc.bg)}"><label class="up">Enviar mapa<input type="file" accept="image/*" data-up="bg"></label></div>
      <div class="row"><button data-a="map" data-f="fogOn" data-v="${sc.fogOn ? '' : 1}" ${on(sc.fogOn)}>Névoa</button>${sc.fogOn ? `<button data-a="fogMode" ${on(fogMode)}>Pincel de névoa</button><small>Arraste para revelar; Shift esconde.</small>` : ''}</div>
      <textarea aria-label="Notas secretas da cena" data-map="note" placeholder="Notas secretas desta cena">${esc(sc.note)}</textarea>`;
    const body = { cena, batalha: b ? battle() : '<small>Nenhuma batalha em andamento.</small>', fichas: sheets || '<small>Crie personagens na janela Cena.</small>', chat: log, skills: wins.skills.open ? editor('skills') : '', items: wins.items.open ? editor('items') : '' };
    app.innerHTML = `<main>${map()}</main>${chips(WIN, (id, [title, w]) => wins[id].open ? `<section class="win" data-win="${id}" style="left:${wins[id].x}px;top:${wins[id].y}px;width:${w}px"><header data-drag="${id}"><span>${title}</span><button data-a="winX" data-id="${id}" aria-label="Fechar ${title}">×</button></header><div class="win-body">${body[id]}</div></section>` : '')}
      <nav class="dock">${chips(WIN, (id, [title]) => `<button data-a="winT" data-id="${id}" ${on(wins[id].open)}>${title}</button>`)}</nav>`;
  } else if (role === 'player') {
    const my = chars.filter(mine), cur = b ? S.chars[timeline(1)[0]] : null, inB = b ? my.filter(c => c.id in S.battle.ticks) : [], actor = inB.includes(cur) ? cur : inB[0];
    const hud = my.map(c => `<div class="hud" data-pv="ficha" style="--c:${esc(c.color)}"><b>${esc(c.name)}</b>${bar('hp', c)}${bar('aura', c)}${bar('san', c)}</div>`).join('');
    const view = pv === 'ficha' ? `<div class="panel"><div class="row"><b>${esc(name)}</b><button data-a="addChar">+ Novo personagem</button><button data-a="logout">Sair</button></div></div>${sheets}`
      : pv === 'chat' ? `<div class="panel">${log}</div>` : actor ? command(actor, cur) : (b ? battle() : map()) + `<div class="huds">${hud}</div>`;
    app.innerHTML = `<main class="pv">${view}</main><nav class="dock">${chips({ cena: b ? 'Batalha' : 'Mesa', ficha: 'Ficha', chat: 'Chat' }, (k, l) => `<button data-pv="${k}" ${on(pv === k)}>${l}</button>`)}</nav>`;
  } else app.innerHTML = `<main>${b ? battle() : map()}</main>`;
  if (keep) { const el = app.querySelector(keep.sel); if (el) { el._dirty = el.value !== keep.v; el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch {} } }
  app.querySelectorAll('.win').forEach(w => w.querySelector('.win-body').scrollTop = scr[w.dataset.win] || 0);
  app.querySelectorAll('span[data-a],[data-tab],[data-node],[data-tgt],[data-aim],.hud').forEach(el => { el.tabIndex = 0; el.setAttribute('role', 'button'); if (el.title) el.setAttribute('aria-label', el.title); });
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
  if (role === 'table' && news.length) { // legenda cinemática temporária no lugar do log
    document.querySelector('.caption')?.remove(); clearTimeout(capT);
    const e = news.at(-1), cp = document.createElement('div'); cp.className = 'caption'; cp.innerHTML = `<b>${esc(e.who)}</b> ${esc(e.text)}`; document.body.append(cp); capT = setTimeout(() => cp.remove(), 6000);
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
app.addEventListener('keydown', e => { // elementos clicáveis que não são <button> também respondem ao teclado
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('span[data-a],[data-tab],[data-node],[data-tgt],[data-open],[data-aim]')) { e.preventDefault(); e.target.click(); }
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
  const op = e.target.closest('[data-open]');
  if (op) { open[op.dataset.open] = !(open[op.dataset.open] ?? !gm); return render(); }
  const nd = e.target.closest('[data-node]');
  if (nd) { selNode[nd.dataset.id] = nd.dataset.node; return render(); }
  const am = e.target.closest('[data-aim]'), sb = e.target.closest('[data-sub]'), pvb = e.target.closest('[data-pv]');
  if (am) { aim = aim === am.dataset.aim ? null : am.dataset.aim; return render(); }
  if (sb) { sub = sb.dataset.sub || null; return render(); }
  if (pvb) { pv = pvb.dataset.pv; return render(); }
  if (!d && u) { if (tgt !== u.dataset.tgt) aim = null; tgt = u.dataset.tgt; return render(); }
  if (!d) return;
  if (d.a === 'winT' || d.a === 'winX') { wins[d.id].open = d.a === 'winT' && !wins[d.id].open; localStorage.vj_wins = JSON.stringify(wins); return render(); }
  if (d.a === 'fogMode') { fogMode = !fogMode; return render(); }
  if (d.a === 'secret') { secret = !secret; return render(); }
  if (d.a === 'logout') { ['vj_name', 'vj_pass_' + name].forEach(k => delete localStorage[k]); return location.reload(); }
  if (d.a === 'act' && !(tgt in S.battle.ticks)) return alert('Escolha um alvo clicando em uma unidade.');
  if ((d.a === 'delChar' || d.a === 'sceneDel') && !confirm('Excluir?')) return;
  const m = { t: d.a, id: d.id, attr: d.attr, per: d.per, mod: mods[d.id] || 0, secret, enemy: !!d.enemy, on: !!d.on, win: !!d.win, long: !!d.long, skill: d.skill, el: d.el, target: tgt, aim, item: d.item, coll: d.coll, k: d.k, f: d.f, v: d.v };
  if (d.a === 'bSpawn' && e.shiftKey) m.t = 'bDel';
  if (d.a === 'addChar' && gm && !d.enemy) m.owner = prompt('Nome do jogador dono?') || '';
  if (d.a === 'horror') m.loss = +prompt('Perda de Sanidade se falhar?', 5) || 5;
  send(m);
  if (d.a === 'act' || d.a === 'use' || d.a === 'next') { aim = null; sub = null; }
});
// mapa: pincel de névoa (mestre) e arrastar tokens
const cell = (e, el) => { const r = el.getBoundingClientRect(), m = S.scenes[S.scene]; return { x: Math.floor((e.clientX - r.left) / r.width * m.cols), y: Math.floor((e.clientY - r.top) / r.height * m.rows) }; };
const paint = e => { const mp = e.target.closest?.('.map'); if (!mp) return; const c = cell(e, mp), k = c.x + ',' + c.y + e.shiftKey; if (k !== lastFog) { lastFog = k; send({ t: 'fog', ...c, hide: e.shiftKey }); } };
app.addEventListener('pointerdown', e => { // arrastar janelas do mestre pela barra de título
  const h = e.target.closest('[data-drag]');
  if (!h || e.target.closest('button')) return;
  const el = h.parentElement, r = el.getBoundingClientRect();
  wdrag = { id: h.dataset.drag, el, dx: e.clientX - r.left, dy: e.clientY - r.top }; h.setPointerCapture(e.pointerId);
});
app.addEventListener('pointermove', e => { if (wdrag) { wdrag.el.style.left = Math.max(0, e.clientX - wdrag.dx) + 'px'; wdrag.el.style.top = Math.max(0, e.clientY - wdrag.dy) + 'px'; } });
const wdrop = () => { if (!wdrag) return; Object.assign(wins[wdrag.id], { x: parseInt(wdrag.el.style.left), y: parseInt(wdrag.el.style.top) }); localStorage.vj_wins = JSON.stringify(wins); wdrag = null; if (pending) render(); };
app.addEventListener('pointerup', wdrop); app.addEventListener('pointercancel', wdrop);
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

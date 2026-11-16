const role = document.body.dataset.role, app = document.getElementById('app'), gm = role === 'gm';
const A = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'], AO = Object.fromEntries(A.map(a => [a, a]));
const L = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
const EL = { fis: 'Físico', kagutsuchi: 'Kagutsuchi·Fogo', susanoo: 'Susanoo·Água', atlas: 'Atlas·Terra', indra: 'Indra·Raio', fuhaku: 'Fuhaku·Vento', amaterasu: 'Amaterasu·Luz', tsukuyomi: 'Tsukuyomi·Escuridão', shukketsu: 'Shukketsu·Sangue', radiacao: 'Hiruko·Radiação' };
const ELC = { fis: '#ffffff', kagutsuchi: '#ff5a1f', susanoo: '#2e8bff', atlas: '#b9853c', indra: '#ffe600', fuhaku: '#7dffb0', amaterasu: '#fff3a0', tsukuyomi: '#8a4dff', shukketsu: '#c10020', radiacao: '#9dff00' };
const KIND = { dmg: 'Dano', mental: 'Dano mental', heal: 'Cura', passive: 'Passiva' }, PASL = { hpMax: 'HP máx', auraMax: 'Aura máx', sanMax: 'Sanidade máx', res: 'Resistência', ...AO }, RES = { aura: 'Aura', san: 'Sanidade' };
const ST = { possess: 'Possessão', curse: 'Maldição', frozen: 'Congelado', marked: 'Marcado', down: 'Derrubado', burn: 'Queimadura', bleed: 'Sangramento', poison: 'Veneno', rad: 'Radiação', stun: 'Atordoado', sleep: 'Sono', para: 'Paralisia', silence: 'Silêncio', atkUp: 'ATQ↑', atkDn: 'ATQ↓', defUp: 'DEF↑', defDn: 'DEF↓', agiUp: 'AGI↑', agiDn: 'AGI↓', fear: 'Medo', fury: 'Fúria', confuse: 'Confusão' };
const IT = { cons: 'Consumível', arma: 'Arma', armadura: 'Armadura', acess: 'Acessório', mat: 'Material' }, WT = { '': '—', lamina: 'Lâmina', lanca: 'Lança', fogo: 'Arma de fogo', punho: 'Punhos' };
const EFF = { hp: 'HP', aura: 'Aura', san: 'Sanidade', cure: 'Cura condições', body: 'Trata ferimentos', rev: 'Reanima caído', bomb: 'Bomba' };
const idesc = i => i.type === 'cons' ? (['hp', 'aura', 'san'].includes(i.eff) ? `+${i.power} ${EFF[i.eff]}` : EFF[i.eff] + (i.eff === 'bomb' ? ` ${i.power} ${EL[i.el] || EL.fis}` : i.power ? ' ' + i.power : ''))
  : i.type === 'arma' ? `${WT[i.wt] || 'Arma'} ${i.power}${i.el ? ' · ' + EL[i.el] : ''}` : i.type === 'acess' ? `${i.attr} +${i.power}${i.el ? ' · resiste ' + EL[i.el] : ''}` : i.type === 'mat' ? 'Material' + (i.el ? ' · ' + EL[i.el] : '') : `Armadura ${i.power}`;
const shop = () => S.scenes[S.scene].shop; // cada cena tem a sua loja
let ctMode = false;
let tier = 'normal';
const BODY = { head: ['INT', 'SAB'], torso: ['CON'], armL: ['FOR', 'DES'], armR: ['FOR', 'DES'], legL: ['AGI'], legR: ['AGI'] }, PARTS = Object.keys(BODY), AIMP = { head: 30, torso: 0, armL: 15, armR: 15, legL: 15, legR: 15 };
const PL = { head: 'Cabeça', torso: 'Torso', armL: 'Braço esq.', armR: 'Braço dir.', legL: 'Perna esq.', legR: 'Perna dir.' }, LV = ['ileso', 'ferido', 'crítico'];
const SHAPE = { head: ['circle', 'cx="60" cy="28" r="20"'], torso: ['rect', 'x="38" y="52" width="44" height="82"'], armL: ['rect', 'x="14" y="54" width="20" height="80"'], armR: ['rect', 'x="86" y="54" width="20" height="80"'], legL: ['rect', 'x="38" y="138" width="20" height="108"'], legR: ['rect', 'x="62" y="138" width="20" height="108"'] };
const VEH = { pe: 'A pé', cavalo: 'Cavalo', moto: 'Motocicleta', auto: 'Automóvel', caminhao: 'Caminhão' }, cz = { a: null, b: null, va: 'auto', vb: 'moto' };
const CAT = { demonio: 'Demônio', humano: 'Humano', chefe: 'Chefe' }, bf = { q: '', el: '', cat: '', n: 1, enc: '' }; let encDraft = [];
const ent = id => S.chars[id] || S.bestiary?.[id]; // personagem em jogo ou modelo do bestiário
const WIN = { best: ['Bestiário', 820], chase: ['Perseguição', 380], cena: ['Cena', 330], batalha: ['Batalha', 600], ini: ['Iniciativa', 300], fichas: ['Fichas', 400], chat: ['Chat', 340], skills: ['Skills', 1000], items: ['Itens e loja', 720] };
const LAYD = { Exploração: ['cena', 'chat'], Batalha: ['batalha', 'ini', 'chat', 'fichas'], Preparo: ['cena', 'best', 'items'] }; // arranjos de janelas
const view = { z: 1, x: 0, y: 0 }; // zoom e deslocamento do mapa (local de cada tela)
let ctx = null, pan = null, ruler = null, spaceDown = false, zc = 1, pings = [];
const CAMPL = { vigiar: 'Vigiar (AGI↑)', cozinhar: 'Cozinhar (grupo ATQ↑)', conversar: 'Conversar (+5 Sanidade)', treinar: 'Treinar (+5 XP)', meditar: 'Meditar (+30 Limite)' };
const TABS = { st: 'Status', sk: 'Skills', inv: 'Itens', bio: 'História' };
const ED = {
  skills: [['Skill', 'name', 'text'], ['Tipo', 'kind', KIND], ['Elemento', 'el', EL], ['Atr.', 'attr', AO], ['Poder', 'power'], ['Custo', 'cost'], ['Recurso', 'res', RES], ['Status', 'st', { '': '—', ...ST }], ['Área', 'area', 'checkbox'], ['Tempo%', 'ct'], ['Passiva', 'pas', PASL], ['Arma', 'req', WT], ['Sequela', 'back', { '': '—', ...ST }], ['XP', 'xp'], ['X', 'gx'], ['Y', 'gy'], ['Lim.', 'limit', 'checkbox']],
  items: [['Item', 'name', 'text'], ['Tipo', 'type', IT], ['Poder', 'power'], ['Efeito', 'eff', EFF], ['Atr. (acess.)', 'attr', AO], ['Tipo de arma', 'wt', WT], ['Elemento', 'el', { '': '—', ...EL }], ['Preço', 'price']],
};
let aim = null, sub = null, pv = 'cena', wdrag = null, capT;
let wins = { best: { x: 360, y: 56, open: false }, chase: { x: 420, y: 200, open: false }, cena: { x: 16, y: 64, open: true }, batalha: { x: 360, y: 64, open: true }, ini: { x: 360, y: 420, open: false }, fichas: { x: Math.max(380, innerWidth - 420), y: 64, open: true }, chat: { x: 16, y: Math.max(300, innerHeight - 330), open: true }, skills: { x: 60, y: 110, open: false }, items: { x: 90, y: 140, open: false } };
try { wins = { ...wins, ...JSON.parse(localStorage.vj_wins) }; } catch {}
let S, ws, pending = false, drag = null, tgt = null, showEd = null, fogMode = false, lastFog = '', secret = false, seen = null, lastCur;
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
const desc = s => s.kind === 'passive' ? `Passiva · ${s.pas === 'res' ? 'Resistência a ' + EL[s.el] : '+' + s.power + ' ' + PASL[s.pas]}` : `${KIND[s.kind]}${s.area ? ' em área' : ''}${(s.ct || 100) !== 100 ? ` · tempo ${s.ct}%` : ''} · ${EL[s.el]} · ${s.attr} · poder ${s.power} · ${s.limit ? 'Limite 100%' : s.cost + ' ' + RES[s.res]}${s.st ? ' · causa ' + ST[s.st] : ''}${s.req ? ' · exige ' + WT[s.req] : ''}${s.back ? ' · sequela: ' + ST[s.back] : ''}`;
const wtype = c => eq(c, 'arma')?.wt || 'punho', blocked = (c, s) => c[s.res] < s.cost || (s.limit && c.limit < 100) || c.st.silence || c.st.fury || (s.req && s.req !== wtype(c));
const bgImg = u => u ? `background-image:url('${esc(u)}');` : '';
const chips = (obj, fn) => Object.entries(obj).map(([k, v]) => fn(k, v)).join('');

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => document.body.classList.remove('off') || send({ t: 'hello', role, name, pass, key });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === 'state') { S = m.s; render(); }
    if (m.t === 'ping') { const p = { x: m.x, y: m.y }; pings.push(p); render(); setTimeout(() => { pings = pings.filter(o => o !== p); render(); }, 2500); }
    if (m.t === 'err') { alert(m.msg); if (m.bad) { ws.onclose = null; ['vj_key', 'vj_name', 'vj_pass_' + name].forEach(k => delete localStorage[k]); location.reload(); } }
  };
  ws.onclose = () => { document.body.classList.add('off'); setTimeout(connect, 1500); };
}

function timeline(n = 8) { return (S.battle.order || []).filter(id => S.chars[id]).slice(0, n); } // fila calculada pelo servidor
function bar(k, c, hideNum) {
  const max = k === 'limit' ? 100 : c[k + 'Max'], pct = Math.round(Math.max(0, Math.min(100, 100 * c[k] / (max || 1))));
  return `<div class="bar ${k}"><i data-bid="${c.id}:${k}" data-p="${pct}" style="width:${pct}%"></i><span>${L[k]}${hideNum ? '' : ` ${c[k]}/${max}`}</span></div>`;
}

// ===== palco de batalha =====
const KANJI = { fis: '武', kagutsuchi: '火', susanoo: '水', atlas: '土', indra: '雷', fuhaku: '風', amaterasu: '光', tsukuyomi: '闇', shukketsu: '血', radiacao: '核' };
const mainEl = c => c.el || c.resist?.find(e => e !== 'fis') || 'fis';
const bodyMini = c => `<svg class="mini" viewBox="0 0 120 260" aria-hidden="true">${PARTS.map(k => `<${SHAPE[k][0]} ${SHAPE[k][1]} class="l${lvl(c, k)}"/>`).join('')}</svg>`;
function unit(c, cur) {
  const foe = !!c.enemy, el = mainEl(c), low = c.hp > 0 && c.hp <= c.hpMax * .25;
  const sts = c.hp > 0 ? [sanSt(c), ...Object.entries(c.st).map(([k, n]) => ST[k] + (n < 90 ? ' ' + n : ''))].filter(Boolean).map(s => `<i>${s}</i>`).join('') : `<i class="dead">${c.dead ? 'Morto' : c.dying ? 'Caído · ' + c.dying : 'Caído'}</i>`;
  const vb = !foe && c.vinc?.[0] ? `<em class="vb" style="--e:${ELC[c.vinc[0]]}" title="Vínculo: ${PATRON[c.vinc[0]]}">${KANJI[c.vinc[0]]}</em>` : '';
  const fig = `<div class="figw">${vb}<div class="fig" style="--e:${ELC[el]}">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<span class="glyph">${foe ? KANJI[el] : esc(c.name.slice(0, 1).toUpperCase())}</span>`}</div></div>`;
  const stats = foe ? bar('hp', c, true) + (gm ? `<div class="duo"><small>${c.hp}/${c.hpMax}</small></div>` : '')
    : `<div class="hpn"><span>${c.hp}</span><small>/${c.hpMax}</small><em>HP</em></div>${bar('hp', c, true)}<div class="duo"><div>${bar('aura', c, true)}<small>Aura ${c.aura}/${c.auraMax}</small></div><div>${bar('san', c, true)}<small>Sanidade ${c.san}/${c.sanMax}</small></div></div>
      <div class="lim ${c.limit >= 100 ? 'full' : ''}">${bar('limit', c, true)}<small>${c.limit >= 100 ? 'Limite!' : 'Limite ' + c.limit + '%'}</small></div>`;
  return `<div class="unit ${foe ? 'foe' : 'hero'} ${c === cur ? 'cur' : ''} ${c.id === tgt ? 'tgt' : ''} ${c.hp > 0 ? '' : 'ko'} ${low ? 'low' : ''}" data-tgt="${c.id}" style="--c:${esc(c.color)}">${fig}${foe ? '' : bodyMini(c)}<div class="plate"><b class="nm">${esc(c.name)}</b><div class="sts">${sts}</div>${stats}</div></div>`;
}
function battle() {
  const tl = timeline(), cur = S.chars[tl[0]], sc = S.scenes[S.scene], inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks);
  const side = e => { const l = inB.filter(c => !!c.enemy === e), n = l.length, cols = n > 4 ? Math.ceil(n / 2) : Math.max(1, n), w = Math.min(14.5, 43 / cols - 1.3);
    return `<div class="side ${e ? 'foes' : 'heroes'} ${n > 4 ? 'two' : ''}" style="--w:${w.toFixed(2)}cqw">${l.map(c => unit(c, cur)).join('')}</div>`; };
  const acts = c => `<div class="row"><b>${esc(c.name)}:</b>${gm && c.enemy ? '<button class="own" data-a="ai">IA decide</button>' : ''}<button data-a="act" data-id="${c.id}" data-skill="atk">Ataque</button>${c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive').map(k => { const s = S.skills[k];
      return `<button data-a="act" data-id="${c.id}" data-skill="${k}" title="${esc(desc(s))}" ${blocked(c, s) ? 'disabled' : ''}>${esc(s.name)}</button>`; }).join('')}
      ${Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons').map(([k, q]) => `<button class="item" data-a="use" data-id="${c.id}" data-item="${k}">${esc(S.items[k].name)} ×${q}</button>`).join('')}
      <button data-a="next">Passar</button></div>${aimBox()}`;
  return `<section class="stage battle" style="${sc.bg ? `--bg:url('${esc(sc.bg)}')` : ''}"><div class="tl"><em>Ordem</em>${tl.map((id, i) => `<span class="${i ? '' : 'cur'} ${S.chars[id].enemy ? 'foe' : ''}" style="--c:${esc(S.chars[id].color)}">${i ? '' : '<small>Agora</small>'}${esc(S.chars[id].name)}</span>`).join('')}</div>
    <div class="field">${side(true)}<div class="mid"><small>${esc(sc.name)}</small></div>${side(false)}</div>${gm && cur ? acts(cur) : ''}</section>`;
}

function map() {
  const m = S.scenes[S.scene], C = Math.ceil(m.cols), Rw = Math.ceil(m.rows), cr = m.crop, hid = (x, y) => m.fogOn && !m.seen[x + ',' + y];
  let fog = '';
  if (m.fogOn) for (let y = 0; y < Rw; y++) for (let x = 0; x < C; x++) if (hid(x, y)) fog += `<i class="fog" style="--x:${x + m.ox};--y:${y + m.oy}"></i>`;
  // a imagem inteira é ampliada e deslocada para mostrar só a área recortada pelo mestre
  const bg = m.bg ? `background-image:url('${esc(m.bg)}');background-size:${100 / cr.w}% ${100 / cr.h}%;background-position:${cr.w < 1 ? cr.x / (1 - cr.w) * 100 : 0}% ${cr.h < 1 ? cr.y / (1 - cr.h) * 100 : 0}%;` : '';
  let gl = '';
  for (let x = m.ox; x <= m.cols; x++) gl += `M${x} 0V${m.rows}`;
  for (let y = m.oy; y <= m.rows; y++) gl += `M0 ${y}H${m.cols}`;
  const grid = `<svg class="gridl" viewBox="0 0 ${m.cols} ${m.rows}" preserveAspectRatio="none" aria-hidden="true"><path d="${gl}" vector-effect="non-scaling-stroke"/></svg>`;
  const tok = c => { const el = mainEl(c), hp = Math.max(0, Math.min(100, 100 * c.hp / (c.hpMax || 1)));
    return `<div class="tok ${mine(c) ? 'mine' : ''} ${c.enemy ? 'foe' : ''} ${c.hp > 0 ? '' : 'ko'}" data-id="${c.id}" style="--x:${c.x + m.ox};--y:${c.y + m.oy};--c:${esc(c.color)};--e:${ELC[el]}" title="${esc(c.name)}"><span class="tface" style="${bgImg(c.img)}">${c.img ? '' : c.enemy ? KANJI[el] : esc(c.name.slice(0, 1).toUpperCase())}</span><b>${esc(c.name)}</b><i class="thp"><i style="width:${hp}%"></i></i></div>`; };
  return `<div class="mapwrap"><section class="map ${fogMode ? 'fogging' : ''}" style="--cols:${m.cols};--rows:${m.rows};aspect-ratio:${m.ar};${bg}transform:translate(${view.x}px,${view.y}px) scale(${view.z})">${grid}${Object.values(S.chars).filter(c => c.x != null && c.scene === S.scene && (mine(c) || !hid(c.x, c.y))).map(tok).join('')}${fog}${pings.map(p => `<i class="ping" style="--x:${p.x + m.ox};--y:${p.y + m.oy}"></i>`).join('')}</section></div>`;
}
// troca a imagem do mapa: mede a proporção real e zera o recorte
function setBg(u) {
  send({ t: 'map', f: 'bg', v: u });
  if (!u) return;
  const im = new Image(); im.onload = () => { send({ t: 'map', f: 'crop', v: { x: 0, y: 0, w: 1, h: 1 } }); send({ t: 'map', f: 'ar', v: im.naturalWidth / im.naturalHeight }); }; im.src = u;
}
let cropMode = false, cropSel = null, cdrag = null, lastCam = null;
const cropper = () => { const sc = S.scenes[S.scene], c = cropSel || sc.crop; return cropMode && sc.bg ? `<div class="cropper"><header><b>Recortar mapa</b><small>Arraste sobre a imagem para marcar a área que vira o mapa.</small><button class="own" data-a="cropOk">Aplicar recorte</button><button data-a="cropAll">Usar imagem inteira</button><button data-a="cropX">Cancelar</button></header>
  <div class="cropbox"><img src="${esc(sc.bg)}" draggable="false" alt=""><i class="csel" style="left:${c.x * 100}%;top:${c.y * 100}%;width:${c.w * 100}%;height:${c.h * 100}%"></i></div></div>` : ''; };

function editor(coll) {
  const cell = (id, o, [, f, t = 'number']) => { const a = `data-ed="${coll}" data-id="${id}" data-f="${f}"`;
    return typeof t === 'object' ? `<select ${a}>${chips(t, (k, l) => `<option value="${k}" ${k === o[f] ? 'selected' : ''}>${l}</option>`)}</select>`
      : `<input type="${t}" ${a} ${t === 'checkbox' ? (o[f] ? 'checked' : '') : `value="${esc(o[f])}"`}>`; };
  return `<section class="panel editor"><table><tr>${ED[coll].map(c => `<th>${c[0]}`).join('')}<th></tr>${chips(S[coll], (id, o) =>
    `<tr>${ED[coll].map(c => `<td>${cell(id, o, c)}`).join('')}<td><button data-a="edDel" data-coll="${coll}" data-id="${id}">×</button></tr>`)}</table><div class="row"><button data-a="edAdd" data-coll="${coll}">+ Novo</button><button data-a="content" data-coll="${coll}">Restaurar padrão</button></div>
    ${coll === 'items' ? `<div class="row chips"><button data-a="shop" data-f="open" data-v="${shop().open ? '' : 1}" class="${shop().open ? 'own' : ''}">Loja de ${esc(S.scenes[S.scene].name)}: ${shop().open ? 'aberta' : 'fechada'}</button>À venda: ${chips(S.items, (k, i) => `<span class="${shop().stock.includes(k) ? 'weak' : ''}" data-a="shop" data-item="${k}">${esc(i.name)}</span>`)}</div>` : ''}</section>`;
}

// menu de contexto do token (clique direito)
function ctxMenu() {
  const c = ctx && S.chars[ctx.id];
  if (!c) return '';
  return `<div class="ctx" style="left:${Math.min(ctx.x, innerWidth - 250)}px;top:${Math.min(ctx.y, innerHeight - (gm ? 330 : 130))}px"><b>${esc(c.name)}</b>${mine(c) ? `<button data-a="openSheet" data-id="${c.id}">Abrir ficha</button>` : ''}<button data-tgt="${c.id}">Marcar como alvo</button>
    ${gm ? `<button data-a="place" data-id="${c.id}">Tirar do mapa</button><button data-a="bSave" data-id="${c.id}">Salvar no bestiário</button><div class="row chips">${chips(ST, (k, l) => `<span class="${c.st[k] ? 'weak' : ''}" data-a="st" data-id="${c.id}" data-k="${k}">${l}</span>`)}</div>` : ''}</div>`;
}
const party = () => `<div class="party">${Object.values(S.chars).filter(c => !c.enemy && !c.dead).map(c => `<div style="--c:${esc(c.color)}">${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}<span><b>${esc(c.name)}</b>${bar('hp', c)}${bar('aura', c)}${bar('san', c)}</span></div>`).join('')}</div>`;
// perseguição: faixa visível a todos e janela de controle do mestre
const chaseBar = () => { const q = S.chase; if (!q) return ''; const n = k => `${esc(S.chars[q[k].id]?.name || '?')} · ${VEH[q[k].veh]}`;
  return `<div class="chase"><b>Perseguição</b><span>${n('b')}</span><div class="track">${Array.from({ length: 10 }, (_, i) => `<i class="${i < q.gap ? 'on' : ''}"></i>`).join('')}</div><span>${n('a')}</span><small>distância ${q.gap}/10 · rodada ${q.round}</small></div>`; };
function chaseWin() {
  if (S.chase) return chaseBar() + '<div class="row"><button class="own" data-a="chase" data-k="round">Rolar rodada</button><button data-a="chase" data-k="end">Encerrar</button></div><small>Distância 10: o fugitivo escapa. Distância 0: é alcançado.</small>';
  const who = k => `<div class="row chips">${Object.values(S.chars).filter(c => c.x != null && c.scene === S.scene).map(c => `<span class="${cz[k] === c.id ? 'weak' : ''}" data-cz="${k}" data-v="${c.id}">${esc(c.name)}</span>`).join('') || '<small>ponha personagens no mapa</small>'}</div><div class="row chips">${chips(VEH, (v, l) => `<span class="${cz['v' + k] === v ? 'weak' : ''}" data-cz="v${k}" data-v="${v}">${l}</span>`)}</div>`;
  return `<b>Fugitivo</b>${who('a')}<b>Perseguidor</b>${who('b')}<div class="row"><button data-a="chaseStart" ${cz.a && cz.b && cz.a !== cz.b ? '' : 'disabled'}>Iniciar perseguição</button></div>`;
}
// janela do bestiário: cartões filtráveis, criação em quantidade, encontros salvos, contratos e edição de modelos
function bestWin() {
  const q = bf.q.trim().toLowerCase(), catOf = b => b.cat || (b.boss ? 'chefe' : 'demonio');
  const list = Object.entries(S.bestiary).filter(([, b]) => (!q || b.name.toLowerCase().includes(q)) && (!bf.el || mainEl(b) === bf.el) && (!bf.cat || catOf(b) === bf.cat)).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const chip = (k, v, l, st = '') => `<span class="${bf[k] === v ? 'weak' : ''}" data-a="bfSet" data-k="${k}" data-v="${v}" ${st}>${l}</span>`, nm = e => S.bestiary[e.b]?.name || '?';
  const card = ([id, b]) => { const el = mainEl(b), sks = b.skills.map(k => S.skills[k]?.name).filter(Boolean);
    return `<div class="bcard" style="--e:${ELC[el]}"><div class="bhead"><i>${KANJI[el]}</i><div><b>${esc(b.name)}</b><small>${CAT[catOf(b)]} · ${EL[el]}</small></div></div>
      <div class="bstats"><span>HP <b>${b.hpMax}</b></span><span>XP <b>${b.xpR}</b></span><span>Ouro <b>${b.goldR}</b></span><span>Armadura <b>${b.armor}</b></span></div>
      <small>${b.weak.length ? 'Fraco: ' + b.weak.map(e => EL[e]).join(', ') : 'Sem fraqueza'}${b.resist.length ? ' · Resiste: ' + b.resist.map(e => EL[e]).join(', ') : ''}</small>
      <small class="bsk">${sks.slice(0, 4).map(esc).join(' · ')}${sks.length > 4 ? ` +${sks.length - 4}` : ''}</small>
      <div class="row"><button class="own" data-a="bSpawn" data-id="${id}">Criar ×${+bf.n || 1}</button><button data-a="encAdd" data-id="${id}">+ Encontro</button><button class="ghost" data-a="openSheet" data-id="${id}">Editar</button><button class="ghost" data-a="bContract" data-id="${id}">Contrato</button><button class="ghost" data-a="bDel" data-id="${id}" aria-label="Apagar modelo">×</button></div></div>`; };
  return `<div class="row"><input class="bq" data-bf="q" placeholder="Buscar inimigo…" aria-label="Buscar inimigo" value="${esc(bf.q)}"><label>Quantidade <input type="number" min="1" max="12" data-bf="n" value="${+bf.n || 1}"></label><button data-a="tier">Nível: ${tier}</button><button class="ghost" data-a="content" data-coll="bestiary">Restaurar padrão</button></div>
    <div class="row chips">${chips(CAT, (k, l) => chip('cat', k, l))}<i class="sep"></i>${Object.keys(KANJI).map(e => chip('el', e, KANJI[e], `title="${EL[e]}" style="color:${ELC[e]}"`)).join('')}</div>
    <div class="bgrid">${list.map(card).join('') || '<small>Nenhum inimigo com esse filtro.</small>'}</div>
    <div class="benc"><div class="card"><h3>Montar encontro</h3>${encDraft.map((e, i) => `<div class="row inv"><span>${e.n}× ${esc(nm(e))} <small>${e.tier}</small></span><button class="ghost" data-a="encRm" data-k="${i}" aria-label="Tirar">×</button></div>`).join('') || '<small>Use "+ Encontro" nos cartões; vale a quantidade e o nível escolhidos acima.</small>'}
        ${encDraft.length ? `<div class="row"><input data-bf="enc" placeholder="Nome do encontro" aria-label="Nome do encontro" value="${esc(bf.enc)}"><button class="own" data-a="encSave">Salvar encontro</button></div>` : ''}</div>
      <div class="card"><h3>Encontros salvos</h3>${chips(S.encounters || {}, (id, e) => `<div class="row inv"><span><b>${esc(e.name)}</b> <small>${e.list.map(x => `${x.n}× ${esc(nm(x))}${x.tier === 'normal' ? '' : ' (' + x.tier + ')'}`).join(', ')}</small></span><button class="own" data-a="encSpawn" data-id="${id}">Colocar na cena</button><button class="ghost" data-a="encDel" data-id="${id}" aria-label="Apagar encontro">×</button></div>`) || '<small>Nenhum encontro salvo.</small>'}</div>
      <div class="card"><h3>Contratos de caça</h3>${chips(S.contracts, (id, c) => `<div class="row inv"><span>${c.done ? '✓ ' : ''}${esc(c.target)} <small>${c.gold} ouro · ${c.xp} XP</small></span><button class="ghost" data-a="ctDel" data-id="${id}" aria-label="Remover contrato">×</button></div>`) || '<small>Use "Contrato" no cartão do alvo.</small>'}</div></div>`;
}
function iniWin() {
  const T = S.battle.ticks, ids = Object.keys(T).filter(k => S.chars[k]).sort((a, b) => T[a] - T[b] || a.localeCompare(b)), b = (k, id, l, t) => `<button data-a="ini" data-k="${k}" data-id="${id}" aria-label="${t}" title="${t}">${l}</button>`;
  if (!S.battle.active) return '<small>Nenhuma batalha em andamento.</small>';
  return ids.map((id, i) => `<div class="row inv"><span>${i + 1}. ${esc(S.chars[id].name)} <small>${S.chars[id].hp > 0 ? 'tempo ' + T[id] : 'caído'}</small></span>${b('up', id, '▲', 'Adiantar')}${b('down', id, '▼', 'Atrasar')}${b('out', id, '×', 'Tirar da batalha')}</div>`).join('')
    + `<div class="row chips">Incluir: ${Object.values(S.chars).filter(c => !(c.id in T) && c.x != null && c.scene === S.scene && c.hp > 0).map(c => `<span data-a="ini" data-k="in" data-id="${c.id}">+ ${esc(c.name)}</span>`).join('') || '<small>todos já estão na fila</small>'}</div>`;
}

// ===== fichas na tela do mestre: cartão resumido na lista e, na janela própria, as mesmas páginas do jogador mais a aba Mestre =====
const FT = { pers: 'Personagem', hab: 'Habilidades', itens: 'Itens', hist: 'Diário', gm: 'Mestre' }, ftab = {};
const sheetCard = c => `<div class="scard" data-a="openSheet" data-id="${c.id}" style="--c:${esc(c.color)}"><b>${esc(c.name)}</b><small>${c.enemy ? 'Inimigo' : esc(c.owner || 'sem dono')}${(c.vinc || []).map(e => ' · ' + PATRON[e]).join('')}</small>${bar('hp', c)}<em>${c.hp > 0 ? stList(c) : 'Caído'}</em></div>`;
function gmPanel(c) {
  const inp = (f, v, type = 'number') => `<input type="${type}" aria-label="${f}" data-id="${c.id}" data-f="${f}" value="${esc(v)}">`, btn = (a, l) => `<button data-a="${a}" data-id="${c.id}">${l}</button>`, lab = (l, x) => `<label>${l}${x}</label>`;
  return `<section class="gmp"><div class="card"><h3>Atributos</h3><div class="attrs">${A.map(a => lab(a, inp('attrs.' + a, c.attrs[a]))).join('')}</div>
      <h3>Recursos <small>máximo = atributos + bônus</small></h3><div class="fgrid">${['hp', 'aura', 'san'].map(k => lab(L[k], inp(k, c[k])) + lab('bônus máx.', inp('bon.' + k + 'Max', c.bon[k + 'Max']))).join('')}${lab('Limite %', inp('limit', c.limit))}${lab('XP', inp('xp', c.xp))}${lab('Ouro', inp('gold', c.gold))}${lab('Arma base', inp('arma', c.arma))}${lab('Armadura base', inp('armor', c.armor))}
        ${c.enemy ? lab('Recompensa XP', inp('xpR', c.xpR)) + lab('Recompensa ouro', inp('goldR', c.goldR)) : lab('Jogador dono', inp('owner', c.owner, 'text'))}</div></div>
    <div class="card"><h3>Vínculos <small>conceder dá a skill raiz e resistência</small></h3><div class="row chips">${Object.keys(PATRON).filter(e => e !== 'fis').map(e => `<span class="${c.vinc.includes(e) ? 'weak' : ''}" data-a="vinc" data-id="${c.id}" data-el="${e}">${PATRON[e]}</span>`).join('')}</div>
      <h3>Fraquezas e resistências <small>clique alterna normal → fraco → resiste</small></h3><div class="row chips">${chips(EL, (k, l) => `<span class="${c.weak.includes(k) ? 'weak' : c.resist.includes(k) ? 'res' : ''}" data-a="aff" data-id="${c.id}" data-el="${k}">${l}</span>`)}</div>
      <h3>Condições</h3><div class="row chips">${chips(ST, (k, l) => `<span class="${c.st[k] ? 'weak' : ''}" data-a="st" data-id="${c.id}" data-k="${k}">${l}</span>`)}</div></div>
    <div class="card"><h3>Ferimentos <small>clique numa parte para ferir ou curar</small></h3>${bodyFig(c, 'gm')}
      <h3>Ações</h3><div class="row">${btn('horror', 'Teste de horror')}${btn('evolve', 'Evoluir atributos')}${btn('place', c.x == null || c.scene !== S.scene ? 'Pôr no mapa' : 'Tirar do mapa')}${btn('bSave', 'Salvar no bestiário')}${btn('delChar', 'Excluir')}</div></div></section>`;
}
function gmSheet(c) {
  const t = ftab[c.id] || 'pers';
  const page = t === 'pers' ? persPage(c) : t === 'hab' ? skillPage(c) : t === 'itens' ? itemsPage(c) : t === 'gm' ? gmPanel(c)
    : `<section class="card hist"><h3>Diário</h3><textarea aria-label="Diário" data-id="${c.id}" data-f="bio">${esc(c.bio)}</textarea><h3>Notas secretas do mestre</h3><textarea aria-label="Notas do mestre" data-id="${c.id}" data-f="gmNote">${esc(c.gmNote)}</textarea></section>`;
  return `<div class="ftabs">${chips(FT, (k, l) => `<button data-ftab="${k}" data-id="${c.id}" class="${k === t ? 'on' : ''}">${l}</button>`)}</div><div class="fbody">${page}</div>`;
}

// ===== páginas fora de combate (jogador; o mestre abre a grade em tela cheia pela ficha) =====
const PAGES = { mesa: 'Mesa', pers: 'Personagem', hab: 'Habilidades', itens: 'Itens', hist: 'Diário' };
const PATRON = { fis: 'Marcial', kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', radiacao: 'Hiruko' };
let pg = 'mesa', selCh = null, chatOpen = true, gridFull = null, wasBattle = false;
const near = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy)) <= 1;
const figCard = (c, w) => `<div class="unit hero cur static" style="--c:${esc(c.color)};--w:${w}"><div class="figw"><div class="fig">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<span class="glyph">${esc(c.name.slice(0, 1).toUpperCase())}</span>`}</div></div></div>`;

// grade de habilidades como constelação: círculo = ativa, losango = passiva; brilho = aprendida, tracejado = disponível
const lab2 = n => { const w = n.split(' '), a = []; let l = ''; for (const x of w) { if (l && (l + ' ' + x).length > 14) { a.push(l); l = x; } else l = l ? l + ' ' + x : x; } a.push(l); return a.slice(0, 2).map((t, i) => `<tspan x="0" dy="${i ? 11 : 0}">${esc(i === 1 && a.length > 2 ? t + '…' : t)}</tspan>`).join(''); };
const gv = { z: 1, x: 0, y: 0 }; let skd = null, skMoved = false;
function skillPage(c) {
  const N = Object.entries(S.skills), own = new Set(c.skills), ownL = c.skills.map(k => S.skills[k]).filter(Boolean), U = 86, G = Math.max(17, ...N.map(([, s]) => Math.max(s.gx, s.gy) + 1)), mid = (G - 1) / 2, P = s => [s.gx * U + U / 2, s.gy * U + U / 2];
  const mineV = s => c.enemy || s.el === 'fis' || (c.vinc || []).includes(s.el), exTaken = s => s.ex && ownL.some(o => o.ex === s.ex && o !== s);
  const avail = s => mineV(s) && !exTaken(s) && (!ownL.length || ownL.some(o => near(o, s))), sel = selNode[c.id] && S.skills[selNode[c.id]] ? selNode[c.id] : null, ss = S.skills[sel];
  let lines = '';
  for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) { const a = N[i][1], b = N[j][1];
    if (near(a, b) && (a.el === b.el || a.el === 'fis' || b.el === 'fis')) { const [x1, y1] = P(a), [x2, y2] = P(b), on = own.has(N[i][0]) && own.has(N[j][0]); lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${on ? 'on' : ''} ${mineV(a) && mineV(b) ? '' : 'out'}" style="--e:${ELC[a.el === 'fis' ? b.el : a.el]}"/>`; } }
  const cen = {}; for (const [, s] of N) { const o = cen[s.el] ||= [0, 0, 0]; o[0] += s.gx; o[1] += s.gy; o[2]++; }
  const halos = Object.entries(cen).filter(([el]) => el !== 'fis').map(([el, [x, y, n]]) => { const dx = x / n - mid, dy = y / n - mid, d = Math.hypot(dx, dy) || 1, px = (mid + dx / d * G * .46) * U + U / 2, py = (mid + dy / d * G * .46) * U + U / 2, mineS = (c.vinc || []).includes(el);
    return `<g class="${mineS ? 'vmine' : 'vout'}"><text class="halo" x="${px}" y="${py}" style="--e:${ELC[el]};font-size:${G * 12}px">${KANJI[el]}</text><text class="hname" x="${px}" y="${py + G * 4}" style="--e:${ELC[el]};font-size:${G * 1.9}px">${PATRON[el]}${mineS ? ' · seu Vínculo' : ''}</text></g>`; }).join('');
  const nodes = N.map(([id, s]) => { const [x, y] = P(s), st = own.has(id) ? 'own' : !mineV(s) ? 'out' : avail(s) ? 'av' : 'lock', pas = s.kind === 'passive', mark = s.back ? '禁' : s.limit ? '極' : pas ? '+' : KANJI[s.el];
    return `<g class="nd ${st} ${id === sel ? 'sel' : ''} ${c.xp >= s.xp ? '' : 'poor'}" data-node="${id}" data-id="${c.id}" transform="translate(${x} ${y})" style="--e:${ELC[s.el]}"><title>${esc(s.name)} · ${s.xp} XP</title>${pas ? '<rect x="-12" y="-12" width="24" height="24" transform="rotate(45)"/>' : `<circle r="${s.limit || s.back ? 19 : 15}"/>`}<text class="mk" y="6">${mark}</text><text class="lb" y="30">${lab2(s.name)}</text></g>`; }).join('');
  const tag = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
  const why = !ss || own.has(sel) ? '' : !mineV(ss) ? `Exige Vínculo com ${PATRON[ss.el]}.` : exTaken(ss) ? 'Trancada: você escolheu o outro caminho.' : !avail(ss) ? 'Precisa de um nó vizinho já aprendido.' : c.xp < ss.xp ? `Faltam ${ss.xp - c.xp} XP.` : '';
  const exOther = ss?.ex ? N.filter(([k, s]) => s.ex === ss.ex && k !== sel).map(([, s]) => s.name).join(', ') : '';
  const detail = ss ? `<div class="ndcard" style="--e:${ELC[ss.el]}"><small>${PATRON[ss.el]} · ${KIND[ss.kind]}${ss.limit ? ' · Limite' : ''}${ss.back ? ' · Proibida' : ''}</small><h2>${esc(ss.name)}</h2>${ss.d ? `<p class="flav">${esc(ss.d)}</p>` : ''}
      <div class="tags">${ss.kind === 'passive' ? tag('Efeito', ss.pas === 'res' ? 'Resistência a ' + EL[ss.el] : '+' + ss.power + ' ' + PASL[ss.pas])
        : tag('Poder', ss.power) + tag('Atributo', ss.attr) + tag('Custo', ss.limit ? 'Limite 100%' : ss.cost + ' ' + RES[ss.res]) + tag('Alvo', ss.area ? 'Área' : 'Único') + ((ss.ct || 100) !== 100 ? tag('Tempo', ss.ct + '%') : '') + (ss.st ? tag('Causa', ST[ss.st]) : '') + (ss.req ? tag('Exige', WT[ss.req]) : '') + (ss.back ? tag('Sequela', ST[ss.back]) : '')}</div>
      ${exOther ? `<small class="exw">Escolha excludente: aprender esta tranca ${esc(exOther)}.</small>` : ''}
      ${gm && c.enemy ? `<button class="learn" data-a="skTog" data-id="${c.id}" data-skill="${sel}">${own.has(sel) ? 'Remover do inimigo' : 'Dar ao inimigo'}</button>` : own.has(sel) ? '<div class="learned">Aprendida</div>' : `<button class="learn" data-a="learn" data-id="${c.id}" data-skill="${sel}" ${mine(c) && !why ? '' : 'disabled'}>Aprender · ${ss.xp} XP</button>${why ? `<small class="why">${why}</small>` : ''}`}</div>`
    : '<div class="ndcard empty"><h2>Escolha um nó</h2><small>Clique em um nó para ver o que ele faz. Você aprende o tronco Marcial e as skills do seu Vínculo, sempre a partir de um nó vizinho de um que já tem.</small></div>';
  const mineL = c.skills.filter(k => S.skills[k]).map(k => `<li style="--e:${ELC[S.skills[k].el]}" data-node="${k}" data-id="${c.id}"><b>${esc(S.skills[k].name)}</b><small>${esc(desc(S.skills[k]))}</small></li>`).join('');
  return `<section class="skp"><div class="skmap ${gv.z < 1.7 ? 'far' : 'near'}"><svg viewBox="0 0 ${G * U} ${G * U}" role="group" aria-label="Grade de habilidades" style="transform:translate(${gv.x}px,${gv.y}px) scale(${gv.z})">${halos}<g class="ln">${lines}</g>${nodes}</svg>
      <div class="skhint"><button data-a="skReset">Recentrar</button><small>Roda do mouse: zoom · arrastar: mover · de perto aparecem todos os nomes</small></div></div>
    <aside class="skside"><div class="xp"><small>XP disponível de ${esc(c.name)}</small><b>${c.xp}</b></div>${detail}
      <div class="legend"><span><i class="lc"></i>Ativa</span><span><i class="lp"></i>Passiva</span><span><i class="lo"></i>Aprendida</span><span><i class="la"></i>Disponível</span><span><i class="lx"></i>Outro Vínculo</span></div>
      <h3>Aprendidas (${c.skills.length})</h3><ul class="mine">${mineL || '<li class="none"><small>Nenhuma ainda.</small></li>'}</ul></aside></section>`;
}

function persPage(c) {
  const eqn = slot => eq(c, slot) ? `<b>${esc(eq(c, slot).name)}</b><small>${esc(idesc(eq(c, slot)))}</small>` : '<b class="none">—</b><small>nada equipado</small>';
  const res = k => `<div class="resrow">${bar(k, c)}${k === 'limit' ? '' : `<input type="number" aria-label="${L[k]} atual" data-id="${c.id}" data-f="${k}" value="${c[k]}">`}</div>`;
  const cts = Object.values(S.contracts).filter(ct => !ct.done).map(ct => `<li><b>${esc(ct.target)}</b><small>${ct.gold} ouro · ${ct.xp} XP</small></li>`).join('');
  return `<section class="pp" style="--c:${esc(c.color)}"><div class="pp-hero">${figCard(c, '200px')}
      <div class="pp-id"><input class="pname" aria-label="Nome" data-id="${c.id}" data-f="name" value="${esc(c.name)}"><div class="row"><input type="color" aria-label="Cor" data-id="${c.id}" data-f="color" value="${esc(c.color)}"><label class="up">Enviar retrato<input type="file" accept="image/*" data-up="img" data-id="${c.id}"></label>${(c.vinc || []).map(e => `<span class="pill vp" style="--e:${ELC[e]}">Vínculo <b>${PATRON[e]}</b></span>`).join('')}<span class="pill">XP <b>${c.xp}</b></span><span class="pill">Ouro <b>${c.gold}</b></span></div>
        ${res('hp')}${res('aura')}${res('san')}${res('limit')}<div class="sts big">${[sanSt(c), ...Object.entries(c.st).map(([k, n]) => ST[k] + ' ' + n)].filter(Boolean).map(s => `<i>${s}</i>`).join('') || '<small>Sem condições ativas.</small>'}</div></div></div>
    <div class="pp-grid"><div class="card"><h3>Atributos <small>clique para rolar d100</small></h3><div class="tiles">${A.map(a => `<button class="tile ${c.marks[a] ? 'mk' : ''}" data-a="roll" data-id="${c.id}" data-attr="${a}"><b>${at(c, a)}</b><span>${a}</span>${at(c, a) !== c.attrs[a] ? `<small>base ${c.attrs[a]}</small>` : ''}</button>`).join('')}</div>
        <div class="row"><label>Modificador da rolagem <input type="number" class="mod" data-mid="${c.id}" value="${mods[c.id] || 0}"></label><small>▲ dourado = atributo usado com sucesso, pode evoluir no descanso longo.</small></div></div>
      <div class="card"><h3>Ferimentos</h3>${bodyFig(c)}</div>
      <div class="card"><h3>Equipamento</h3><div class="slots"><div><em>Arma</em>${eqn('arma')}</div><div><em>Armadura</em>${eqn('armadura')}</div><div><em>Acessório</em>${eqn('acess')}</div></div>
        <h3>Afinidades</h3><div class="row chips">${[...c.weak.map(k => `<span class="weak">Fraco: ${EL[k]}</span>`), ...c.resist.map(k => `<span class="res">Resiste: ${EL[k]}</span>`), eq(c, 'acess')?.el ? `<span class="res">Resiste: ${EL[eq(c, 'acess').el]}</span>` : ''].join('') || '<small>Nenhuma fraqueza ou resistência.</small>'}</div>
        ${S.camp.open ? `<h3>Acampamento</h3><div class="row chips">${chips(CAMPL, (k, l) => `<span class="${S.camp.acts[c.id] === k ? 'weak' : ''}" data-a="campAct" data-id="${c.id}" data-k="${k}">${l}</span>`)}</div>` : ''}</div>
      <div class="card"><h3>Contratos de caça</h3><ul class="plain">${cts || '<li><small>Nenhum contrato aberto.</small></li>'}</ul></div></div></section>`;
}

function itemsPage(c) {
  const sh = shop(), card = (k, i, foot, q) => `<div class="icard t-${i.type}" style="--e:${ELC[i.el] || 'var(--line)'}"><em>${IT[i.type]}</em><b>${esc(i.name)}${q > 1 ? ` <i>×${q}</i>` : ''}</b><small>${esc(idesc(i))}</small><div class="row">${foot}</div></div>`;
  const btn = (a, l, k, x = '') => `<button data-a="${a}" data-id="${c.id}" data-item="${k}" ${x}>${l}</button>`;
  const slot = (s, l) => { const i = eq(c, s); return `<div class="slot ${i ? 'on' : ''}"><em>${l}</em>${i ? `<b>${esc(i.name)}</b><small>${esc(idesc(i))}</small>${btn('equip', 'Tirar', c.equip[s])}` : '<b class="none">Vazio</b><small>equipe um item do inventário</small>'}</div>`; };
  const inv = Object.entries(c.inv).filter(([k]) => S.items[k]).sort((a, b) => ITO.indexOf(S.items[a[0]].type) - ITO.indexOf(S.items[b[0]].type)).map(([k, q]) => { const i = S.items[k], on = c.equip[i.type] === k;
    return card(k, i, (i.type === 'cons' ? btn('use', 'Usar', k, i.eff === 'bomb' ? 'disabled title="Só em batalha"' : '') : i.type === 'mat' ? '' : btn('equip', on ? 'Equipado' : 'Equipar', k, on ? 'class="own"' : '')) + (sh.open ? btn('sell', `Vender ${Math.floor(i.price / 2)}`, k) : '') + btn('drop', 'Descartar', k, 'class="ghost"'), q); }).join('');
  const forge = Object.entries(S.items).filter(([, i]) => i.el && ['arma', 'acess'].includes(i.type)).map(([k, i]) => { const ess = Object.keys(S.items).find(e => S.items[e].type === 'mat' && S.items[e].el === i.el), have = c.inv[ess] || 0, need = i.type === 'arma' ? 3 : 5, cost = Math.round(i.price / 2);
    return have ? card(k, i, `<small>${have}/${need} essências · ${cost} ouro</small>` + btn('forge', 'Forjar', k, have < need || c.gold < cost ? 'disabled' : '')) : ''; }).join('');
  return `<section class="ip"><div class="ip-top"><div class="gold"><small>Ouro</small><b>${c.gold}</b></div>${slot('arma', 'Arma')}${slot('armadura', 'Armadura')}${slot('acess', 'Acessório')}</div>
    <h3>Inventário</h3><div class="icards">${inv || '<p class="none">Inventário vazio.</p>'}</div>
    ${sh.open ? `<h3>Loja · ${esc(S.scenes[S.scene].name)}</h3><div class="icards">${sh.stock.filter(k => S.items[k]).map(k => card(k, S.items[k], btn('buy', `Comprar · ${S.items[k].price}`, k, c.gold < S.items[k].price ? 'disabled' : ''))).join('') || '<p class="none">Nada à venda.</p>'}</div>` : '<h3>Loja</h3><p class="none">Não há loja aberta nesta cena.</p>'}
    ${forge ? `<h3>Forja <small>3 essências para arma, 5 para relíquia</small></h3><div class="icards">${forge}</div>` : ''}
    ${gm ? `<h3>Entregar item <small>só o mestre</small></h3><div class="row chips">${chips(S.items, (k, i) => `<span data-a="give" data-id="${c.id}" data-item="${k}">+ ${esc(i.name)}</span>`)}</div>` : ''}</section>`;
}
const ITO = ['arma', 'armadura', 'acess', 'cons', 'mat'];

// tela do jogador em batalha: barras, figura de corpo e menu de comando
function command(c, cur) {
  const my = cur === c, inB = Object.values(S.chars).filter(o => o.id in S.battle.ticks && !o.dead), tl = timeline(5).slice(1).map(id => esc(S.chars[id].name)).join(' › ');
  const skb = k => { const s = S.skills[k]; return `<button data-a="act" data-id="${c.id}" data-skill="${k}" ${blocked(c, s) ? 'disabled' : ''}>${esc(s.name)}<small>${esc(desc(s))}</small></button>`; };
  const menu = sub === 'sk' ? c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive').map(skb).join('') + '<button class="back" data-sub="">Voltar</button>'
    : sub === 'it' ? Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons').map(([k, q]) => `<button data-a="use" data-id="${c.id}" data-item="${k}">${esc(S.items[k].name)} ×${q}<small>${esc(idesc(S.items[k]))}</small></button>`).join('') + '<button class="back" data-sub="">Voltar</button>'
    : `<button class="atk" data-a="act" data-id="${c.id}" data-skill="atk">Atacar</button><button data-sub="sk">Skills</button><button data-sub="it">Itens</button><button class="back" data-a="next">Passar</button>`;
  return `<section class="cmd" style="--c:${esc(c.color)}"><div class="turn ${my ? 'me' : ''}">${my ? 'Seu turno' : 'Turno de ' + esc(cur?.name || '—')}</div><small class="nextup">Próximos: ${tl}</small>
    <div class="cmd-top" data-tgt="${c.id}"><div class="cmd-bars"><h2>${esc(c.name)}</h2>${bar('hp', c)}${bar('aura', c)}${bar('san', c)}${bar('limit', c)}<em>${c.hp > 0 ? stList(c) : c.dead ? 'Morto' : `Caído ☠ ${c.dying || ''}`}</em></div>${bodyFig(c)}</div>
    <div class="row chips"><b>Alvo:</b>${inB.sort((x, y) => y.enemy - x.enemy).map(o => `<span class="${o.id === tgt ? 'weak' : ''} ${o.hp > 0 ? '' : 'ko'}" data-tgt="${o.id}">${esc(o.name)}</span>`).join('')}</div>
    ${aimBox()}${my ? `<div class="menu">${menu}</div>` : ''}</section>`;
}

function render() {
  const ae = document.activeElement;
  if (drag || wdrag || cdrag || ae?.matches?.('#app select')) { pending = true; return; }
  pending = false;
  // guarda o campo em edição e a rolagem das janelas para devolver depois de redesenhar
  const keep = ae && app.contains(ae) && ae.matches('input:not([type=file]),textarea') ? { v: ae.value, s: ae.selectionStart,
    sel: ae.tagName + Object.entries(ae.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, x => '-' + x.toLowerCase())}="${CSS.escape(v)}"]`).join('') } : null;
  const scr = [...app.querySelectorAll('.win-body,.chatcol,.skside,.pl>main,.fbody')].map(el => el.scrollTop);
  const b = S.battle.active, sc = S.scenes[S.scene], chars = Object.values(S.chars), on = v => v ? 'class="own"' : '';
  const sheets = gm ? chars.map(sheetCard).join('') : '';
  const log = `${role === 'table' ? '' : '<input class="chat" data-chat="1" placeholder="Mensagem · /r 2d6+1 · /w nome texto (Enter)">'}<div class="log" aria-live="polite">${S.log.slice().reverse().map(l => `<p class="${l.kind} ${l.to ? 'priv' : ''}"><b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('') || 'Sem rolagens ainda.'}</div>`;
  if (gm) {
    const cena = `<div class="row"><button data-a="addChar">+ Personagem</button><button data-a="addChar" data-enemy="1">+ Inimigo</button><button data-a="secret" ${on(secret)}>Rolagem secreta</button><button data-a="undo" title="Desfaz a última ação do mestre (até 20)">Desfazer</button></div>
      <div class="row">${b ? '<button data-a="battle" data-win="1" class="own">Vitória</button><button data-a="battle">Encerrar batalha</button>' : '<button data-a="battle" data-on="1">Iniciar batalha</button>'}</div>
      <div class="row"><button data-a="rest">Descanso curto</button><button data-a="rest" data-long="1">Descanso longo</button><button data-a="camp" data-on="${S.camp.open ? '' : 1}" ${on(S.camp.open)}>Acampamento</button></div>
      <div class="row chips">Cenas: ${chips(S.scenes, (id, s) => `<span class="${id === S.scene ? 'weak' : ''}" data-a="sceneGo" data-id="${id}">${esc(s.name)}</span>`)}<span data-a="sceneAdd">+</span><span data-a="sceneDel">excluir atual</span><span data-a="content" data-coll="scenes">+ cenas de exemplo</span></div>
      <div class="row"><input aria-label="Nome da cena" data-map="name" value="${esc(sc.name)}"></div>
      <div class="row"><input aria-label="Imagem do mapa" data-map="bg" placeholder="Link da imagem do mapa" value="${esc(sc.bg)}"><label class="up">Enviar imagem<input type="file" accept="image/*" data-up="bg"></label><button data-a="cropOn" ${sc.bg ? '' : 'disabled'}>Recortar área</button></div>
      <div class="row"><label>Casas na largura <input type="number" step="0.25" min="4" max="80" data-map="cols" value="${sc.cols}"></label><small>${Math.round(sc.rows * 10) / 10} de altura</small></div>
      <div class="row"><label>Grade → <input type="range" min="0" max="0.95" step="0.05" data-map="ox" value="${sc.ox}" aria-label="Deslocar grade na horizontal"></label><label>↓ <input type="range" min="0" max="0.95" step="0.05" data-map="oy" value="${sc.oy}" aria-label="Deslocar grade na vertical"></label></div>
      <div class="row"><button data-a="camFix" title="Todos passam a ver o mapa com o seu zoom e posição atuais">Fixar minha vista para todos</button>${sc.cam ? '<button data-a="camFree" class="own">Liberar vista</button>' : ''}</div>

      <div class="row"><button data-a="map" data-f="fogOn" data-v="${sc.fogOn ? '' : 1}" ${on(sc.fogOn)}>Névoa</button>${sc.fogOn ? `<button data-a="fogMode" ${on(fogMode)}>Pincel de névoa</button><small>Arraste para revelar; Shift esconde.</small>` : ''}</div>
      <textarea aria-label="Notas secretas da cena" data-map="note" placeholder="Notas secretas desta cena">${esc(sc.note)}</textarea>`;
    const fw = Object.keys(wins).filter(k => k.startsWith('f_') && wins[k].open && ent(k.slice(2))), ALL = { ...WIN, ...Object.fromEntries(fw.map(k => [k, [ent(k.slice(2)).name + (S.chars[k.slice(2)] ? '' : ' · modelo do bestiário'), 1080]])) };
    const rank = Object.keys(ALL).sort((x, y) => (wins[x].z || 0) - (wins[y].z || 0));
    const lays = chips(LAYD, k => `<button class="lay" data-a="lay" data-k="${k}" title="Clique: aplicar arranjo · Shift+clique: salvar o arranjo atual">${k}</button>`);
    const body = { ...Object.fromEntries(fw.map(k => [k, gmSheet(ent(k.slice(2)))])), best: wins.best.open ? bestWin() : '', ini: wins.ini.open ? iniWin() : '', chase: wins.chase.open ? chaseWin() : '', cena, batalha: b ? battle() : '<small>Nenhuma batalha em andamento.</small>', fichas: sheets || '<small>Crie personagens na janela Cena.</small>', chat: log, skills: wins.skills.open ? editor('skills') : '', items: wins.items.open ? editor('items') : '' };
    app.innerHTML = `<main>${map()}</main>${chips(ALL, (id, [title, w]) => wins[id].open ? `<section class="win" data-win="${id}" style="left:${wins[id].x}px;top:${wins[id].y}px;width:${id === 'batalha' ? Math.max(640, innerWidth - 780) : Math.min(w, innerWidth - 24)}px;z-index:${20 + rank.indexOf(id)}"><header data-drag="${id}"><span>${esc(title)}</span><button data-a="winX" data-id="${id}" aria-label="Fechar ${esc(title)}">×</button></header><div class="win-body">${body[id]}</div></section>` : '')}
      ${cropper()}<nav class="dock">${chips(WIN, (id, [title]) => `<button data-a="winT" data-id="${id}" ${on(wins[id].open)}>${title}</button>`)}<i></i>${lays}</nav>${ctxMenu()}`;
  } else if (role === 'player') {
    const my = chars.filter(mine), c = my.find(x => x.id === selCh) || my[0], cur = b ? S.chars[timeline(1)[0]] : null, inB = b ? my.filter(x => x.id in S.battle.ticks) : [], actor = inB.includes(cur) ? cur : inB.includes(c) ? c : inB[0];
    if (b && !wasBattle) pg = 'mesa'; // a batalha começou: leva o jogador para a mesa
    wasBattle = b;
    const free = chars.filter(x => !x.enemy && !x.owner);
    const page = !c ? `<section class="card"><h3>Escolha seu caçador</h3><p>Assuma um personagem livre ou crie um novo; o mestre define os atributos.</p><div class="icards">${free.map(x => `<div class="icard" style="--e:${esc(x.color)}"><em>${(x.vinc || []).map(e => 'Vínculo: ' + PATRON[e]).join(' · ') || 'Sem Vínculo'}</em><b>${esc(x.name)}</b><small>${esc(x.bio || '')}</small><div class="row"><button class="own" data-a="claim" data-id="${x.id}">Assumir</button></div></div>`).join('')}</div><div class="row"><button data-a="addChar">Criar personagem novo</button></div></section>`
      : pg === 'pers' ? persPage(c) : pg === 'hab' ? skillPage(c) : pg === 'itens' ? itemsPage(c)
      : pg === 'hist' ? `<section class="card hist"><h3>Diário de ${esc(c.name)}</h3><textarea aria-label="Diário" data-id="${c.id}" data-f="bio" placeholder="História, aparência, objetivos, anotações da campanha…">${esc(c.bio)}</textarea></section>`
      : chaseBar() + (actor ? battle() + command(actor, cur) : b ? battle() : map());
    app.innerHTML = `<header class="top"><div class="who">${my.map(x => `<button class="chb ${x === c ? 'on' : ''}" data-sel="${x.id}" style="--c:${esc(x.color)}">${esc(x.name)}<small>${x.hp}/${x.hpMax}</small></button>`).join('')}<button class="ghost" data-a="addChar" title="Novo personagem" aria-label="Novo personagem">+</button></div>
      <nav>${chips(PAGES, (k, l) => `<button data-pg="${k}" class="${pg === k ? 'on' : ''} ${k === 'mesa' && b ? 'alert' : ''}">${k === 'mesa' && b ? 'Batalha' : l}</button>`)}</nav>
      <div class="me"><span>${esc(name)}</span><button class="ghost" data-a="chatT" ${on(chatOpen)}>Chat</button><button class="ghost" data-a="logout">Sair</button></div></header>
      <div class="pl ${chatOpen ? '' : 'nochat'} pg-${pg}"><main>${page}</main>${chatOpen ? `<aside class="chatcol"><div class="panel">${log}</div></aside>` : ''}</div>${ctxMenu()}`;
  } else app.innerHTML = `<main>${chaseBar()}${b ? battle() : map() + party()}</main>`;
  if (gridFull && S.chars[gridFull]) app.insertAdjacentHTML('beforeend', `<div class="modal"><header><b>Habilidades · ${esc(S.chars[gridFull].name)}</b><button data-a="gridFull" data-id="">Fechar</button></header>${skillPage(S.chars[gridFull])}</div>`);
  if (keep) { const el = app.querySelector(keep.sel); if (el) { el._dirty = el.value !== keep.v; el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch {} } }
  app.querySelectorAll('.win-body,.chatcol,.skside,.pl>main,.fbody').forEach((el, i) => el.scrollTop = scr[i] || 0);
  { const sc2 = S.scenes[S.scene]; if (sc2.cam && sc2.cam.n !== lastCam) { const w = mapEl()?.offsetWidth; if (w) { lastCam = sc2.cam.n; Object.assign(view, { z: sc2.cam.z, x: sc2.cam.fx * w, y: sc2.cam.fy * w }); applyView(); } } } // vista fixada pelo mestre
  app.querySelectorAll('span[data-a],[data-tab],[data-node],[data-tgt],[data-aim],[data-cz],.hud,.scard').forEach(el => { el.tabIndex = 0; el.setAttribute('role', 'button'); if (el.title) el.setAttribute('aria-label', el.title); });
  fx();
}

// efeitos: barras que escoam, investida do atacante, impacto no alvo, faixa da skill, dados, legenda e vitória
const lastPct = new Map();
function fx() {
  app.querySelectorAll('[data-bid]').forEach(el => { // anima a barra do valor anterior até o novo
    const k = el.dataset.bid, p = el.dataset.p, old = lastPct.get(k);
    if (old != null && old !== p) { el.style.transition = 'none'; el.style.width = old + '%'; el.offsetWidth; el.style.transition = ''; el.style.width = p + '%'; }
    lastPct.set(k, p);
  });
  const news = seen == null ? [] : S.log.filter(e => e.n > seen), cur = S.battle.active ? S.chars[timeline(1)[0]] : null, stage = app.querySelector('.stage');
  seen = S.seq;
  let called = false;
  for (const e of news.slice(-6)) {
    if (e.d) import('/dice.js').then(m => m.roll(e.d)).catch(() => {});
    const f = e.fx;
    if (!f) continue;
    const el = app.querySelector(`.unit[data-tgt="${f.id}"]`) || app.querySelector(`[data-tgt="${f.id}"]`) || app.querySelector(`.tok[data-id="${f.id}"]`);
    if (f.a) app.querySelector(`.unit[data-tgt="${f.a}"]`)?.classList.add('lunge');
    if (f.s && stage && !called) { // faixa com o nome da skill (uma por ação, mesmo em área)
      called = true; document.querySelector('.callout')?.remove();
      const co = document.createElement('div'); co.className = 'callout'; co.style.setProperty('--fx', ELC[f.el] || '#e4002b');
      co.innerHTML = `<div><small>${esc(S.chars[f.a]?.name || '')}</small><b>${esc(f.s)}</b></div>`; document.body.append(co); setTimeout(() => co.remove(), 1900);
    }
    if (!el) continue;
    const add = (cls, txt) => { const s = document.createElement('span'); s.className = cls; s.textContent = txt; el.append(s); };
    el.style.setProperty('--fx', ELC[f.el] || '#fff');
    add('float ' + (f.heal ? 'heal' : f.miss ? 'miss' : f.crit ? 'crit' : ''), f.heal ? '+' + f.heal : f.miss ? 'ERROU' : '−' + f.dmg);
    if (f.dmg) el.classList.add('hit');
    if (f.w) add('stamp weak', 'Fraqueza!'); else if (f.crit) add('stamp', 'Crítico!');
  }
  const plain = news.filter(e => !e.fx).at(-1), win = news.find(e => /^Vitória!/.test(e.text));
  if (role === 'table' && plain && !win) { // legenda discreta para o que não é golpe
    document.querySelector('.caption')?.remove(); clearTimeout(capT);
    const cp = document.createElement('div'); cp.className = 'caption'; cp.innerHTML = `<b>${esc(plain.who)}</b>${esc(plain.text)}`; document.body.append(cp); capT = setTimeout(() => cp.remove(), 6000);
  }
  if (win) { const v = document.createElement('div'); v.className = 'victory'; v.innerHTML = `<b>Vitória</b><span>${esc(win.text.replace(/^Vitória!\s*/, ''))}</span>`; document.body.append(v); setTimeout(() => v.remove(), 6500); }
  if (cur && cur.id !== lastCur && lastCur !== undefined) { const bn = document.createElement('div'); bn.className = 'banner'; bn.textContent = 'Turno de ' + cur.name; bn.style.setProperty('--c', cur.enemy ? '#e4002b' : cur.color); document.body.append(bn); setTimeout(() => bn.remove(), 1200); }
  lastCur = cur?.id ?? null;
}

app.addEventListener('change', e => {
  const el = e.target, d = el.dataset, v = el.type === 'number' || el.type === 'range' ? +el.value : el.type === 'checkbox' ? el.checked : el.value;
  if (el.tagName === 'SELECT' || el.type === 'file') el.blur();
  if (d.up) {
    const f = el.files[0];
    if (f) fetch('/upload', { method: 'POST', headers: { 'Content-Type': f.type }, body: f }).then(r => r.ok ? r.text() : Promise.reject())
      .then(u => d.up === 'bg' ? setBg(u) : send({ t: 'set', id: d.id, f: 'img', v: u })).catch(() => alert('Falha no upload (PNG/JPG/WEBP/GIF até 5 MB).'));
  } else if (d.ed) send({ t: 'edSet', coll: d.ed, id: d.id, f: d.f, v });
  else if (d.f) send({ t: 'set', id: d.id, f: d.f, v });
  else if (d.map === 'bg') setBg(v);
  else if (d.map) send({ t: 'map', f: d.map, v });
  else if (d.mid) mods[d.mid] = v;
});
app.addEventListener('input', e => { const k = e.target.dataset.bf; if (!k) return; bf[k] = e.target.value; if (k === 'q') render(); }); // filtros do bestiário
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
  if (ctx) { ctx = null; setTimeout(render); }
  const d = e.target.closest('[data-a]')?.dataset, u = e.target.closest('[data-tgt]'), tb = e.target.closest('[data-tab]');
  if (tb) { tabs[tb.dataset.id] = tb.dataset.tab; return render(); }
  const op = e.target.closest('[data-open]');
  if (op) { open[op.dataset.open] = !(open[op.dataset.open] ?? !gm); return render(); }
  const nd = e.target.closest('[data-node]');
  if (nd) { selNode[nd.dataset.id] = nd.dataset.node; return render(); }
  const am = e.target.closest('[data-aim]'), sb = e.target.closest('[data-sub]'), pvb = e.target.closest('[data-pv]');
  const czb = e.target.closest('[data-cz]');
  if (czb) { cz[czb.dataset.cz] = czb.dataset.v; return render(); }
  if (am) { aim = aim === am.dataset.aim ? null : am.dataset.aim; return render(); }
  if (sb) { sub = sb.dataset.sub || null; return render(); }
  if (pvb) { pv = pvb.dataset.pv; return render(); }
  const ftb = e.target.closest('[data-ftab]');
  if (ftb) { ftab[ftb.dataset.id] = ftb.dataset.ftab; return render(); }
  if (skMoved) { skMoved = false; return; } // foi um arrasto na grade, não um clique
  const pgb = e.target.closest('[data-pg]'), sl = e.target.closest('[data-sel]');
  if (pgb) { pg = pgb.dataset.pg; return render(); }
  if (sl) { selCh = sl.dataset.sel; return render(); }
  if (!d && u) { if (tgt !== u.dataset.tgt) aim = null; tgt = u.dataset.tgt; return render(); }
  if (!d) return;
  if (d.a === 'openSheet') { if (gm) wins['f_' + d.id] = { x: Math.max(8, Math.min(innerWidth - 1090, 200 + 24 * (zc % 8))), y: 50 + 20 * (zc % 6), open: true, z: ++zc }; else { pg = 'pers'; selCh = d.id; } return render(); }
  if (d.a === 'lay') { // arranjos de janelas: aplica o salvo (ou o padrão); Shift salva o atual
    const saved = JSON.parse(localStorage.vj_lay || '{}');
    if (e.shiftKey) { saved[d.k] = wins; localStorage.vj_lay = JSON.stringify(saved); return alert(`Arranjo "${d.k}" salvo.`); }
    if (saved[d.k]) wins = { ...wins, ...structuredClone(saved[d.k]) };
    else { for (const k in wins) wins[k].open = LAYD[d.k].includes(k);
      const W = innerWidth, H = innerHeight, at = (k, x, y) => Object.assign(wins[k], { x, y });
      at('cena', 16, 56); at('ini', 16, 56); at('chat', 16, Math.max(330, H - 360)); at('batalha', 360, 56); at('fichas', W - 416, 56); at('skills', 360, 56); at('items', 360, 420); at('best', 360, 56); }
    localStorage.vj_wins = JSON.stringify(wins); return render();
  }
  if (d.a === 'winT' || d.a === 'winX') { wins[d.id].open = d.a === 'winT' && !wins[d.id].open; localStorage.vj_wins = JSON.stringify(wins); return render(); }
  if (d.a === 'fogMode') { fogMode = !fogMode; return render(); }
  if (d.a === 'secret') { secret = !secret; return render(); }
  if (d.a === 'cropOn') { cropMode = true; cropSel = { ...S.scenes[S.scene].crop }; return render(); }
  if (d.a === 'cropX') { cropMode = false; return render(); }
  if (d.a === 'cropOk' || d.a === 'cropAll') { // a proporção do mapa vem do recorte sobre o tamanho real da imagem
    const im = app.querySelector('.cropbox img'), c = d.a === 'cropAll' || !cropSel || cropSel.w < .03 ? { x: 0, y: 0, w: 1, h: 1 } : cropSel;
    send({ t: 'map', f: 'crop', v: c }); send({ t: 'map', f: 'ar', v: (c.w * im.naturalWidth) / (c.h * im.naturalHeight) }); cropMode = false; Object.assign(view, { z: 1, x: 0, y: 0 }); return render();
  }
  if (d.a === 'camFix') { const w = mapEl().offsetWidth; return send({ t: 'map', f: 'cam', v: { z: view.z, fx: view.x / w, fy: view.y / w } }); }
  if (d.a === 'camFree') return send({ t: 'map', f: 'cam', v: null });
  if (d.a === 'skReset') { Object.assign(gv, { z: 1, x: 0, y: 0 }); return render(); }
  if (d.a === 'chatT') { chatOpen = !chatOpen; return render(); }
  if (d.a === 'gridFull') { gridFull = d.id || null; return render(); }
  if (d.a === 'chaseStart') return send({ t: 'chase', k: 'start', ...cz });
  if (d.a === 'bfSet') { bf[d.k] = bf[d.k] === d.v ? '' : d.v; return render(); }
  if (d.a === 'encAdd') { const e = encDraft.find(x => x.b === d.id && x.tier === tier); if (e) e.n = Math.min(12, e.n + (+bf.n || 1)); else encDraft.push({ b: d.id, tier, n: +bf.n || 1 }); return render(); }
  if (d.a === 'encRm') { encDraft.splice(+d.k, 1); return render(); }
  if (d.a === 'encSave') { send({ t: 'encSave', name: bf.enc || 'Encontro', list: encDraft }); encDraft = []; bf.enc = ''; return; }
  if (d.a === 'bContract') { const b = S.bestiary[d.id], gold = prompt(`Recompensa em ouro por caçar ${b.name}?`, b.goldR * 5); return gold === null ? null : send({ t: 'ctAdd', id: d.id, gold: +gold || 0, xp: b.xpR }); }
  if (d.a === 'bDel' && !confirm('Apagar este modelo do bestiário?')) return;
  if (d.a === 'ctMode') { ctMode = !ctMode; return render(); }
  if (d.a === 'tier') { tier = { fraco: 'normal', normal: 'elite', elite: 'fraco' }[tier]; return render(); }
  if (d.a === 'content' && d.coll !== 'scenes' && !confirm('Restaurar o conteúdo padrão? Edições nessa coleção serão perdidas' + (d.coll === 'bestiary' ? '.' : ' e os personagens perdem o que tinham dela.'))) return;
  if (d.a === 'logout') { ['vj_name', 'vj_pass_' + name].forEach(k => delete localStorage[k]); return location.reload(); }
  if (d.a === 'act' && !(tgt in S.battle.ticks)) return alert('Escolha um alvo clicando em uma unidade.');
  if ((d.a === 'delChar' || d.a === 'sceneDel') && !confirm('Excluir?')) return;
  const m = { t: d.a, id: d.id, attr: d.attr, per: d.per, mod: mods[d.id] || 0, secret, enemy: !!d.enemy, on: !!d.on, win: !!d.win, long: !!d.long, skill: d.skill, el: d.el, target: tgt, aim, tier, n: +bf.n || 1, item: d.item, coll: d.coll, k: d.k, f: d.f, v: d.v };
  if (d.a === 'bSpawn' && e.shiftKey) m.t = 'bDel';
  if (d.a === 'addChar' && gm && !d.enemy) m.owner = prompt('Nome do jogador dono?') || '';
  if (d.a === 'horror') m.loss = +prompt('Perda de Sanidade se falhar?', 5) || 5;
  send(m);
  if (d.a === 'act' || d.a === 'use' || d.a === 'next') { aim = null; sub = null; }
});
// mapa: pincel de névoa (mestre) e arrastar tokens
const cell = (e, el) => { const r = el.getBoundingClientRect(), m = S.scenes[S.scene]; return { x: Math.floor((e.clientX - r.left) / r.width * m.cols - m.ox), y: Math.floor((e.clientY - r.top) / r.height * m.rows - m.oy) }; };
const paint = e => { const mp = e.target.closest?.('.map'); if (!mp) return; const c = cell(e, mp), k = c.x + ',' + c.y + e.shiftKey; if (k !== lastFog) { lastFog = k; send({ t: 'fog', ...c, hide: e.shiftKey }); } };
app.addEventListener('pointerdown', e => { // arrastar janelas do mestre pela barra de título
  const wn = e.target.closest('.win'), h = e.target.closest('[data-drag]');
  if (wn && wins[wn.dataset.win].z !== zc) { wins[wn.dataset.win].z = ++zc; wn.style.zIndex = 99; } // janela clicada vem para a frente
  if (!h || e.target.closest('button')) return;
  const el = h.parentElement, r = el.getBoundingClientRect();
  wdrag = { id: h.dataset.drag, el, dx: e.clientX - r.left, dy: e.clientY - r.top }; h.setPointerCapture(e.pointerId);
});
app.addEventListener('pointermove', e => { if (wdrag) { wdrag.el.style.left = Math.max(0, e.clientX - wdrag.dx) + 'px'; wdrag.el.style.top = Math.max(0, e.clientY - wdrag.dy) + 'px'; } });
const wdrop = () => { if (!wdrag) return; Object.assign(wins[wdrag.id], { x: parseInt(wdrag.el.style.left), y: parseInt(wdrag.el.style.top) }); localStorage.vj_wins = JSON.stringify(wins); wdrag = null; if (pending) render(); };
app.addEventListener('pointerup', wdrop); app.addEventListener('pointercancel', wdrop);
// mapa: zoom (roda), mover (botão do meio ou Espaço+arrastar), régua (Alt+arrastar), ping (duplo clique), menu (botão direito)
const mapEl = () => app.querySelector('.map'), applyView = () => { const m = mapEl(); if (m) m.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.z})`; };
app.addEventListener('wheel', e => {
  const m = e.target.closest?.('.mapwrap') && mapEl();
  if (!m) return;
  e.preventDefault();
  const r = m.getBoundingClientRect(), z = Math.min(4, Math.max(.4, view.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  view.x += (e.clientX - r.left) / view.z * (view.z - z); view.y += (e.clientY - r.top) / view.z * (view.z - z); view.z = z; applyView();
}, { passive: false });
const applyGv = () => { const s = app.querySelector('.skmap svg'); if (s) { s.style.transform = `translate(${gv.x}px,${gv.y}px) scale(${gv.z})`; s.parentElement.classList.toggle('far', gv.z < 1.7); s.parentElement.classList.toggle('near', gv.z >= 1.7); } };
app.addEventListener('wheel', e => {
  const sv = e.target.closest?.('.skmap')?.querySelector('svg');
  if (!sv) return;
  e.preventDefault();
  const r = sv.getBoundingClientRect(), z = Math.min(5, Math.max(1, gv.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
  gv.x += (e.clientX - r.left) / gv.z * (gv.z - z); gv.y += (e.clientY - r.top) / gv.z * (gv.z - z); gv.z = z; if (z === 1) gv.x = gv.y = 0; applyGv();
}, { passive: false });
app.addEventListener('pointerdown', e => { if (e.button === 0 && e.target.closest('.skmap') && !e.target.closest('button')) skd = { sx: e.clientX, sy: e.clientY, x: gv.x, y: gv.y }; const cb = e.target.closest('.cropbox');
  if (cb && e.button === 0) { const r = cb.querySelector('img').getBoundingClientRect(); cdrag = { r, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; cb.setPointerCapture(e.pointerId); e.preventDefault(); } });
app.addEventListener('pointermove', e => {
  if (skd && (Math.abs(e.clientX - skd.sx) + Math.abs(e.clientY - skd.sy) > 5)) { skMoved = true; gv.x = skd.x + e.clientX - skd.sx; gv.y = skd.y + e.clientY - skd.sy; applyGv(); }
  if (cdrag) { const cl = v => Math.min(1, Math.max(0, v)), x = cl((e.clientX - cdrag.r.left) / cdrag.r.width), y = cl((e.clientY - cdrag.r.top) / cdrag.r.height);
    cropSel = { x: Math.min(x, cdrag.x), y: Math.min(y, cdrag.y), w: Math.abs(x - cdrag.x), h: Math.abs(y - cdrag.y) }; const s = app.querySelector('.csel'); if (s) Object.assign(s.style, { left: cropSel.x * 100 + '%', top: cropSel.y * 100 + '%', width: cropSel.w * 100 + '%', height: cropSel.h * 100 + '%' }); }
});
addEventListener('pointerup', () => { skd = null; cdrag = null; setTimeout(() => skMoved = false, 50); });
app.addEventListener('mousedown', e => { if (e.button === 1 && e.target.closest('.mapwrap')) e.preventDefault(); });
app.addEventListener('contextmenu', e => { const t = e.target.closest('.tok'); if (t) { e.preventDefault(); ctx = { id: t.dataset.id, x: e.clientX, y: e.clientY }; render(); } });
app.addEventListener('dblclick', e => {
  const t = e.target.closest('.tok'), m = e.target.closest('.map');
  if (t && mine(S.chars[t.dataset.id])) { if (gm) wins['f_' + t.dataset.id] = { x: Math.max(8, Math.min(innerWidth - 1090, 200)), y: 50, open: true, z: ++zc }; else { pg = 'pers'; selCh = t.dataset.id; } return render(); }
  if (m && role !== 'table' && !fogMode) send({ t: 'ping', ...cell(e, m) });
});
const drawRuler = e => {
  const m = mapEl(), b = cell(e, m), a = ruler.a, sc = S.scenes[S.scene], n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  m.querySelector('.rul')?.remove();
  m.insertAdjacentHTML('beforeend', `<div class="rul"><svg viewBox="0 0 ${sc.cols} ${sc.rows}" preserveAspectRatio="none"><line x1="${a.x + sc.ox + .5}" y1="${a.y + sc.oy + .5}" x2="${b.x + sc.ox + .5}" y2="${b.y + sc.oy + .5}" vector-effect="non-scaling-stroke"/></svg><b style="--x:${b.x + sc.ox};--y:${b.y + sc.oy}">${n} ${n === 1 ? 'casa' : 'casas'}</b></div>`);
};
app.addEventListener('pointerdown', e => {
  const wrap = e.target.closest('.mapwrap');
  if (wrap && (e.button === 1 || (e.button === 0 && spaceDown))) { pan = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; wrap.setPointerCapture(e.pointerId); return; }
  if (wrap && e.altKey && e.button === 0) { ruler = { a: cell(e, mapEl()) }; wrap.setPointerCapture(e.pointerId); return drawRuler(e); }
  if (e.button !== 0) return;
  if (gm && fogMode && S.scenes[S.scene].fogOn) { lastFog = ''; return paint(e); }
  const t = e.target.closest('.tok.mine');
  if (t) { drag = t; t.setPointerCapture(e.pointerId); }
});
app.addEventListener('pointermove', e => {
  if (pan) { view.x = pan.vx + e.clientX - pan.sx; view.y = pan.vy + e.clientY - pan.sy; return applyView(); }
  if (ruler) return drawRuler(e);
  if (gm && fogMode && e.buttons === 1 && !spaceDown) return paint(e);
  if (!drag) return;
  const r = drag.parentElement.getBoundingClientRect();
  drag.style.left = (e.clientX - r.left) / view.z - drag.offsetWidth / 2 + 'px'; drag.style.top = (e.clientY - r.top) / view.z - drag.offsetHeight / 2 + 'px';
});
const drop = e => { pan = null; if (ruler) { ruler = null; mapEl()?.querySelector('.rul')?.remove(); } if (!drag) return; if (e.type === 'pointerup') send({ t: 'move', id: drag.dataset.id, ...cell(e, drag.parentElement) }); drag = null; if (pending) render(); };
app.addEventListener('pointerup', drop); app.addEventListener('pointercancel', drop);
// atalhos de teclado (PC)
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.target.matches('input,textarea,select,button')) { spaceDown = true; e.preventDefault(); return; }
  if (!S || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape') { // fecha, nesta ordem: menu de contexto, submenu, mira, janela da frente
    if (e.target.matches('input,textarea')) e.target.blur();
    else if (gridFull) gridFull = null; else if (ctx) ctx = null; else if (sub) sub = null; else if (aim) aim = null;
    else if (gm) { const top = Object.keys(wins).filter(k => wins[k].open).sort((x, y) => (wins[y].z || 0) - (wins[x].z || 0))[0]; if (top) { wins[top].open = false; localStorage.vj_wins = JSON.stringify(wins); } }
    return render();
  }
  if (e.target.matches('input,textarea,select')) return;
  if (e.key === 'Enter') { const c = app.querySelector('.chat'); if (c) { e.preventDefault(); c.focus(); } return; }
  if (e.key === '0') { Object.assign(view, { z: 1, x: 0, y: 0 }); return applyView(); }
  if (!S.battle.active) return;
  if (e.key === 'Tab') { // percorre os alvos vivos
    const ids = Object.values(S.chars).filter(c => c.id in S.battle.ticks && c.hp > 0).sort((x, y) => y.enemy - x.enemy).map(c => c.id);
    e.preventDefault(); tgt = ids[(ids.indexOf(tgt) + (e.shiftKey ? ids.length - 1 : 1)) % ids.length]; aim = null; return render();
  }
  if (e.key >= '1' && e.key <= '9') app.querySelectorAll(gm ? '.battle .row button' : '.menu button')[e.key - 1]?.click();
});
document.addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
let rsT; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => S && render(), 150); });
if (role) connect();

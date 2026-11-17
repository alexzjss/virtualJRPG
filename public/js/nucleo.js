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
  : i.type === 'arma' ? `${WT[i.wt] || 'Arma'} ${i.power}${i.el ? ' · ' + EL[i.el] : ''}${i.pierce ? ' · perfura ' + Math.round(i.pierce * 100) + '%' : ''}${i.reqFor ? ' · exige FOR ' + i.reqFor : ''}` : i.type === 'acess' ? `${i.attr} +${i.power}${i.el ? ' · resiste ' + EL[i.el] : ''}` : i.type === 'mat' ? 'Material' + (i.el ? ' · ' + EL[i.el] : '') : `Armadura ${i.power}`;
const shop = () => S.scenes[S.scene].shop; // cada cena tem a sua loja
let ctMode = false;
let tier = 'normal';
const BODY = { head: ['INT', 'SAB'], torso: ['CON'], armL: ['FOR', 'DES'], armR: ['FOR', 'DES'], legL: ['AGI'], legR: ['AGI'] }, PARTS = Object.keys(BODY), AIMP = { head: 30, torso: 0, armL: 15, armR: 15, legL: 15, legR: 15 };
const PL = { head: 'Cabeça', torso: 'Torso', armL: 'Braço esq.', armR: 'Braço dir.', legL: 'Perna esq.', legR: 'Perna dir.' }, LV = ['ileso', 'ferido', 'crítico'];
const SHAPE = { head: ['circle', 'cx="60" cy="28" r="20"'], torso: ['rect', 'x="38" y="52" width="44" height="82"'], armL: ['rect', 'x="14" y="54" width="20" height="80"'], armR: ['rect', 'x="86" y="54" width="20" height="80"'], legL: ['rect', 'x="38" y="138" width="20" height="108"'], legR: ['rect', 'x="62" y="138" width="20" height="108"'] };
const VEH = { pe: 'A pé', cavalo: 'Cavalo', moto: 'Motocicleta', auto: 'Automóvel', caminhao: 'Caminhão' }, cz = { a: null, b: null, va: 'auto', vb: 'moto' };
const CAT = { demonio: 'Demônio', humano: 'Humano', chefe: 'Chefe' }, bf = { q: '', el: '', cat: '', n: 1, enc: '' }; let encDraft = [];
const gen = { el: 'kagutsuchi', role: 'bruto', rank: 'comum' }, ROLEN = { bruto: 'Bruto', agil: 'Ágil', conjurador: 'Conjurador', suporte: 'Suporte' }, RANKN = { lacaio: 'Lacaio', comum: 'Comum', elite: 'Elite', chefe: 'Chefe' }, DIFFN = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil', mortal: 'Mortal' };
// mesma referência do servidor: heróis na cena e poder do grupo (média dos três maiores atributos)
const partyRef = () => { const pcs = Object.values(S.chars).filter(c => !c.enemy && !c.dead && c.scene === S.scene), top3 = c => A.map(a => c.attrs[a]).sort((x, y) => y - x).slice(0, 3).reduce((a, b) => a + b, 0) / 3; return { n: pcs.length || 4, p: pcs.length ? Math.round(pcs.reduce((a, c) => a + top3(c), 0) / pcs.length) : 58 }; };
const ent = id => S.chars[id] || S.bestiary?.[id]; // personagem em jogo ou modelo do bestiário
const WIN = { sessao: ['Sessão', 440], best: ['Bestiário', 820], chase: ['Perseguição', 380], cena: ['Cena', 330], batalha: ['Batalha', 600], ini: ['Iniciativa', 300], fichas: ['Fichas', 400], chat: ['Chat', 340], skills: ['Skills', 1000], items: ['Itens e loja', 720] };
const LAYD = { Exploração: ['cena', 'chat'], Batalha: ['batalha', 'ini', 'chat', 'fichas'], Preparo: ['cena', 'best', 'items'] }; // arranjos de janelas
const view = { z: 1, x: 0, y: 0 }; // zoom e deslocamento do mapa (local de cada tela)
let ctx = null, pan = null, ruler = null, spaceDown = false, zc = 1, pings = [];
const CAMPL = { vigiar: 'Vigiar (AGI↑)', cozinhar: 'Cozinhar (grupo ATQ↑)', conversar: 'Conversar (+5 Sanidade)', treinar: 'Treinar (+5 XP)', meditar: 'Meditar (+30 Limite)' };
const TABS = { st: 'Status', sk: 'Skills', inv: 'Itens', bio: 'História' };
const ED = {
  skills: [['Skill', 'name', 'text'], ['Tipo', 'kind', KIND], ['Elemento', 'el', EL], ['Atr.', 'attr', AO], ['Poder', 'power'], ['Perfuração (0-1)', 'pierce'], ['Custo', 'cost'], ['Recurso', 'res', RES], ['Status', 'st', { '': '—', ...ST }], ['Área', 'area', 'checkbox'], ['Tempo%', 'ct'], ['Passiva', 'pas', PASL], ['Arma', 'req', WT], ['Sequela', 'back', { '': '—', ...ST }], ['XP', 'xp'], ['X', 'gx'], ['Y', 'gy'], ['Lim.', 'limit', 'checkbox']],
  items: [['Item', 'name', 'text'], ['Tipo', 'type', IT], ['Poder', 'power'], ['Efeito', 'eff', EFF], ['Atr. (acess.)', 'attr', AO], ['Tipo de arma', 'wt', WT], ['Elemento', 'el', { '': '—', ...EL }], ['Preço', 'price'], ['Perfuração (0-1)', 'pierce'], ['FOR mín.', 'reqFor']],
};
let aim = null, sub = null, pv = 'cena', wdrag = null, capT;
let wins = { sessao: { x: 360, y: 64, open: true }, best: { x: 360, y: 56, open: false }, chase: { x: 420, y: 200, open: false }, cena: { x: 16, y: 64, open: true }, batalha: { x: 360, y: 64, open: true }, ini: { x: 360, y: 420, open: false }, fichas: { x: Math.max(380, innerWidth - 420), y: 64, open: true }, chat: { x: 16, y: Math.max(300, innerHeight - 330), open: true }, skills: { x: 60, y: 110, open: false }, items: { x: 90, y: 140, open: false } };
try { wins = { ...wins, ...JSON.parse(localStorage.vj_wins) }; } catch {}
let S, ws, pending = false, drag = null, tgt = null, showEd = null, fogMode = false, lastFog = '', secret = false, seen = null, lastCur;
const mods = {}, tabs = {}, selNode = {}, open = {};
// login: a página de entrada (GitHub Pages) manda login e senha no fim do link (#vj=…), que nunca vai ao servidor e é apagado da barra
const ls = (k, v) => { try { if (v === undefined) return localStorage[k] || ''; if (v === null) delete localStorage[k]; else localStorage[k] = v; } catch { return ''; } };
try { const h = new URLSearchParams(location.hash.slice(1)).get('vj'); if (h) { const o = JSON.parse(decodeURIComponent(escape(atob(h.replace(/-/g, '+').replace(/_/g, '/'))))); ls('vj_name', o.n || ''); ls('vj_pass', o.p || ''); history.replaceState(null, '', location.pathname); } } catch {}
const asWho = role === 'player' ? new URLSearchParams(location.search).get('as') : null, ctl = !!asWho && new URLSearchParams(location.search).has('ctl'); // o mestre olhando a tela de um jogador, ou jogando por ele (ctl)
let name = asWho || (role === 'gm' ? '' : ls('vj_name')), pass = role === 'gm' || asWho ? '' : ls('vj_pass'), key = gm || asWho ? ls('vj_key') : '';
const loginForm = msg => { // gm: só a chave; jogador: login e senha; mesa: conta de jogador ou "mestre" + chave
  document.body.classList.remove('off');
  app.innerHTML = `<form class="card login" id="login"><h3>${gm ? 'Chave do mestre' : role === 'table' ? 'Mesa (TV)' : 'Entrar na campanha'}</h3>${msg ? `<p class="msg">${esc(msg)}</p>` : ''}
    ${gm ? '' : `<label>Login<input name="n" autocomplete="username" required value="${esc(name)}"></label>`}
    <label>${gm ? 'Chave (aparece na janela do programa e em data/gm-key.txt)' : 'Senha'}<input name="p" type="password" autocomplete="current-password" required></label>
    <small>${gm ? '' : role === 'table' ? 'Use a conta de um jogador, ou o login <b>mestre</b> com a chave do mestre.' : 'O login e a senha são criados pelo mestre. Esqueceu? Peça a ele uma senha nova.'}</small>
    <button class="own">Entrar</button></form>`;
  const f = app.querySelector('#login'); f.querySelector('input:not([value]),input[value=""],input[type=password]')?.focus();
  f.onsubmit = e => { e.preventDefault(); const d = new FormData(f); if (gm) ls('vj_key', key = d.get('p')); else { ls('vj_name', name = d.get('n').trim()); ls('vj_pass', pass = d.get('p')); } app.textContent = 'Conectando…'; connect(); };
};

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
const sanSt = c => { const p = c.san / (c.sanMax || 1); return p <= 0 ? 'Colapso: ataca aliados' : p <= .25 ? 'Surto −20' : p <= .5 ? 'Abalado −10' : ''; };
const stList = c => [sanSt(c), ...Object.entries(c.st).map(([k, n]) => `${ST[k]} ${n}`)].filter(Boolean).join(' · ');
const desc = s => s.kind === 'passive' ? `Passiva · ${s.pas === 'res' ? 'Resistência a ' + EL[s.el] : '+' + s.power + ' ' + PASL[s.pas]}` : `${KIND[s.kind]}${s.area ? ' em área' : ''}${(s.ct || 100) !== 100 ? ` · tempo ${s.ct}%` : ''} · ${EL[s.el]} · ${s.attr} · poder ${s.power} · ${s.limit ? 'Limite 100%' : s.cost + ' ' + RES[s.res]}${s.st ? ' · causa ' + ST[s.st] : ''}${s.pierce ? ' · perfura ' + Math.round(s.pierce * 100) + '%' : ''}${s.reqFor ? ' · exige FOR ' + s.reqFor : ''}${s.req ? ' · exige ' + WT[s.req] : ''}${s.back ? ' · sequela: ' + ST[s.back] : ''}`;
const wtype = c => eq(c, 'arma')?.wt || 'punho', skOf = (c, k) => k === 'wpn' ? eq(c, 'arma')?.grant : S.skills[k], blocked = (c, s) => (s.reqFor && c.attrs.FOR < s.reqFor) || c[s.res] < s.cost || (s.limit && c.limit < 100) || c.st.silence || c.st.fury || (s.req && s.req !== wtype(c));
const bgImg = u => u ? `background-image:url('${esc(u)}');` : '';
const chips = (obj, fn) => Object.entries(obj).map(([k, v]) => fn(k, v)).join('');

// ícones da navegação (traço simples, herdam a cor do texto)
const IC = { mesa: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>', pers: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/>', hab: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M11 7l-5 9M13 7l5 9M7 18h10"/>',
  itens: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/>', hist: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M9 9h6M9 13h6"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>' };
const ico = k => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
const ATN = { FOR: 'Força', CON: 'Constituição', DES: 'Destreza', AGI: 'Agilidade', INT: 'Inteligência', SAB: 'Sabedoria', CAR: 'Carisma', SOR: 'Sorte' };
const toast = (text, kind = '', why = '') => { // aviso curto no canto (aprovado, negado, lembretes)
  const box = document.querySelector('.toasts') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toasts' })), t = document.createElement('div');
  t.className = 'toast ' + kind; t.setAttribute('role', 'status'); t.innerHTML = `<b>${esc(text)}</b>${why ? `<span>${esc(why)}</span>` : ''}`; box.append(t);
  setTimeout(() => t.classList.add('out'), 4600); setTimeout(() => t.remove(), 5000);
};
// pedidos: o que o jogador faz e precisa da aprovação do mestre (S.auto[tipo] dispensa)
const gated = cat => role === 'player' && !ctl && !S.auto[cat], askL = (cat, direct, asked = 'Pedir ao mestre') => gated(cat) ? asked : direct;
const myReq = () => role === 'player' ? Object.entries(S.reqs || {})[0] : null;
const sanPen = c => { const p = c.san / (c.sanMax || 1); return p <= 0 ? 30 : p <= .25 ? 20 : p <= .5 ? 10 : 0; };
let rollDlg = null, lastReq = null, editing = null, editFocus = false;
function rollSheet() { // folha de rolagem: mostra a chance e deixa sugerir um modificador antes de pedir
  const c = rollDlg && S.chars[rollDlg.id];
  if (!c) return '';
  const a = rollDlg.attr, mod = mods[c.id] || 0, sp = sanPen(c), tg = Math.min(95, Math.max(1, at(c, a) + mod - sp));
  return `<div class="sheetbg" data-a="rollX"></div><div class="bsheet" role="dialog" aria-label="Rolar ${ATN[a]}" style="--c:${esc(c.color)}"><small>${esc(c.name)} · teste de atributo</small><h2>${ATN[a]} <em>${a}</em></h2>
    <div class="chance"><b>${tg}%</b><span>de chance no d100${sp ? ` · −${sp} pela Sanidade` : ''}${mod ? ` · ${mod > 0 ? '+' : ''}${mod} de modificador` : ''}</span></div>
    <div class="stepper" role="group" aria-label="Modificador sugerido">${[-20, -10, 0, 10, 20].map(v => `<button data-a="rollMod" data-v="${v}" class="${mod === v ? 'on' : ''}" aria-pressed="${mod === v}">${v > 0 ? '+' + v : v}</button>`).join('')}</div>
    <small>O modificador é a sua sugestão (vantagem ou dificuldade).${gated('roll') ? ' O mestre pode ajustar antes de aprovar.' : ''}</small>
    <div class="row end"><button class="ghost" data-a="rollX">Cancelar</button><button class="go" data-a="rollGo">${askL('roll', 'Rolar d100')}</button></div></div>`;
}
const reqBar = () => { const [id, r] = myReq() || []; return r ? `<div class="reqbar ${lastReq !== id ? 'in' : ''}" role="status"><i class="spin" aria-hidden="true"></i><div><small>Aguardando o mestre</small><b>${esc(S.chars[r.ch]?.name || '')}: ${esc(r.text)}</b></div><button data-a="reqNo" data-id="${id}">Cancelar</button></div>` : ''; };
// valor editável pelo mestre: clique vira campo; aceita número, +5 ou -12
const edv = (c, f, v, cls = '') => !gm ? `<span class="${cls}">${v}</span>` : editing && editing.id === c.id && editing.f === f ? `<input class="edin ${cls}" data-edin="${f}" data-id="${c.id}" data-cur="${v}" value="${v}" inputmode="text" aria-label="${esc(c.name)}: ${f}">`
  : `<span class="ed ${cls}" data-edit="${f}" data-id="${c.id}" title="Clique para editar (aceita +5 ou -12)">${v}</span>`;
const commitEd = el => { const cur = +el.dataset.cur, raw = el.value.trim().replace(',', '.'), v = /^[+-]\d+$/.test(raw) ? cur + +raw : +raw; editing = null; if (raw !== '' && Number.isFinite(v) && v !== cur) send({ t: 'set', id: el.dataset.id, f: el.dataset.edin, v: Math.max(0, Math.round(v)) }); render(); };
let actx; const beep = () => { try { actx ||= new AudioContext(); const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime; o.type = 'triangle'; o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(880, t + .09); g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g).connect(actx.destination); o.start(); o.stop(t + .32); } catch {} };

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => document.body.classList.remove('off') || send({ t: 'hello', role, name, pass, key, as: asWho || undefined, ctl: ctl || undefined });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === 'state') { S = m.s; render(); }
    if (m.t === 'ping') { const p = { x: m.x, y: m.y }; pings.push(p); render(); setTimeout(() => { pings = pings.filter(o => o !== p); render(); }, 2500); }
    if (m.t === 'sfx') playSfx(m.k);
    if (m.t === 'note') { toast(m.text, m.kind, m.why); if (m.kind === 'no') navigator.vibrate?.(120); }
    if (m.t === 'passOk') { ls('vj_pass', pass = m.pass); alert('Senha trocada. Na próxima sessão, digite a nova na página de entrada.'); }
    if (m.t === 'err') { if (!m.bad) return alert(m.msg); ws.onclose = null; ws.close(); S = null; ls(gm ? 'vj_key' : 'vj_pass', null); loginForm(m.msg); }
  };
  ws.onclose = () => { document.body.classList.add('off'); setTimeout(connect, 1500); };
}


const role = document.body.dataset.role, app = document.getElementById('app'), gm = role === 'gm';
const A = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'], AO = Object.fromEntries(A.map(a => [a, a]));
const L = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
const EL = { fis: 'Físico', kagutsuchi: 'Kagutsuchi·Fogo', susanoo: 'Susanoo·Água', atlas: 'Atlas·Terra', indra: 'Indra·Raio', fuhaku: 'Fuhaku·Vento', amaterasu: 'Amaterasu·Luz', tsukuyomi: 'Tsukuyomi·Escuridão', shukketsu: 'Shukketsu·Sangue', hiruko: 'Hiruko·Radiação', aura: 'Aura', oculto: 'Ocultismo' };
const ELC = { fis: '#ffffff', kagutsuchi: '#ff5a1f', susanoo: '#2e8bff', atlas: '#b9853c', indra: '#ffe600', fuhaku: '#7dffb0', amaterasu: '#fff3a0', tsukuyomi: '#8a4dff', shukketsu: '#c10020', hiruko: '#9dff00', aura: '#40e0d0', oculto: '#ff2bd6' };
const KIND = { dmg: 'Dano', mental: 'Dano mental', heal: 'Cura', passive: 'Passiva', form: 'Transformação', util: 'Suporte' }, PASL = { hpMax: 'HP máx', auraMax: 'Aura máx', sanMax: 'Sanidade máx', res: 'Resistência', ...AO }, RES = { aura: 'Aura', san: 'Sanidade' };
const ST = RULES.ST, STD = RULES.STD; // nomes das condições vêm das regras compartilhadas com o servidor
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
  skills: [['Skill', 'name', 'text'], ['Tipo', 'kind', KIND], ['Elemento', 'el', EL], ['Atr.', 'attr', AO], ['Poder', 'power'], ['Custo', 'cost'], ['Recurso', 'res', RES], ['Status', 'st', { '': '—', ...ST }], ['Área', 'area', 'checkbox'], ['Tempo%', 'ct'], ['Passiva', 'pas', PASL], ['Arma', 'req', WT], ['Sequela', 'back', { '': '—', ...ST }], ['XP', 'xp'], ['X', 'gx'], ['Y', 'gy'], ['Lim.', 'limit', 'checkbox']],
  items: [['Item', 'name', 'text'], ['Tipo', 'type', IT], ['Poder', 'power'], ['Efeito', 'eff', EFF], ['Atr. (acess.)', 'attr', AO], ['Tipo de arma', 'wt', WT], ['Elemento', 'el', { '': '—', ...EL }], ['Preço', 'price']],
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
const pasTxt = s => s.pas === 'res' ? 'Resistência a ' + EL[s.el] : PASL[s.pas] && s.power ? '+' + s.power + ' ' + PASL[s.pas] : '';
const desc = s => [descBase(s), RULES.extra(s)].filter(Boolean).join(' · ');
const descBase = s => s.kind === 'passive' ? `Passiva${pasTxt(s) ? ' · ' + pasTxt(s) : ''}` : `${KIND[s.kind]}${s.area ? ' em área' : ''}${(s.ct || 100) !== 100 ? ` · tempo ${s.ct}%` : ''} · ${EL[s.el]} · ${s.attr} · poder ${s.power} · ${s.limit ? 'Limite 100%' : s.cost + ' ' + RES[s.res]}${s.st ? ' · causa ' + ST[s.st] : ''}${s.req ? ' · exige ' + WT[s.req] : ''}${s.back ? ' · sequela: ' + ST[s.back] : ''}`;
const wtype = c => eq(c, 'arma')?.wt || 'punho', blocked = (c, s, k) => k && c.cant && k in c.cant ? !!c.cant[k] : c[s.res] < s.cost || (s.limit && c.limit < 100) || c.st.silence || c.st.fury || (s.req && s.req !== wtype(c));
const selfSk = s => s && (s.tg === 'self' || s.kind === 'form'); // técnica que só mira o próprio usuário
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
    if (m.t === 'note') { toast(m.text, m.kind, m.why); if (m.kind === 'no') navigator.vibrate?.(120); }
    if (m.t === 'passOk') { ls('vj_pass', pass = m.pass); alert('Senha trocada. Na próxima sessão, digite a nova na página de entrada.'); }
    if (m.t === 'err') { if (!m.bad) return alert(m.msg); ws.onclose = null; ws.close(); S = null; ls(gm ? 'vj_key' : 'vj_pass', null); loginForm(m.msg); }
  };
  ws.onclose = () => { document.body.classList.add('off'); setTimeout(connect, 1500); };
}

// ===== janela Sessão (mestre): internet, convite, contas e passo a passo =====
const sess = { n: '', p: '', ch: '', last: null };
const heroes = () => Object.values(S.chars).filter(c => !c.enemy);
const genPass = () => Array.from(crypto.getRandomValues(new Uint32Array(6)), x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
const inviteUrl = () => S.net.code ? S.net.portal + '?c=' + S.net.code : '';
const inviteText = () => `Mesa aberta! Para entrar na sessão de hoje:\n1. Abra ${inviteUrl()}\n2. Digite seu login e sua senha e clique em Entrar.\n(Se pedir o código da sessão: ${S.net.code})\nO código muda a cada sessão; o login e a senha continuam os mesmos.`;
const accessText = a => `Seu acesso ao virtualJRPG\nLogin: ${a.n}\nSenha: ${a.p}\nNo dia da sessão eu mando o link de entrada. Você pode trocar a senha depois, no botão Senha, no alto da tela.`;
const copy = (t, ok) => navigator.clipboard?.writeText(t).then(() => alert(ok), () => prompt('Copie o texto:', t)) ?? prompt('Copie o texto:', t);
function sessWin() {
  const n = S.net, st = { ok: 'Aberta', abrindo: 'Abrindo…', baixando: 'Preparando…', erro: 'Com problema', off: 'Desligada' }[n.status] || n.status;
  const net = `<h4>Internet <span class="net ${esc(n.status)}">${st}</span></h4>
    ${n.status === 'ok' ? `<div class="invite"><small>Código da sessão</small><b>${esc(n.code)}</b><small>${esc(inviteUrl())}</small></div><div class="row"><button class="own" data-a="copy" data-k="invite">Copiar convite</button></div>`
      : `<p><small>${esc(n.msg)}</small></p>`}
    ${n.lan.length ? `<p><small>Mesma rede Wi-Fi (sem internet): ${n.lan.map(u => esc(u) + '/player').join(' · ')}</small></p>` : ''}`;
  const acc = S.accounts.map(a => { const own = heroes().filter(c => c.owner === a);
    return `<div class="acct"><b>${esc(a)}</b><span class="chips">${own.map(c => `<span data-a="freeChar" data-id="${c.id}" title="Tirar este personagem da conta">${esc(c.name)} ×</span>`).join('') || '<small>sem personagem</small>'}</span>
      <span class="row"><button data-a="peek" data-k="${esc(a)}" title="Abre a tela deste jogador em outra aba, só para olhar">Ver como</button><button data-a="peek" data-v="1" data-k="${esc(a)}" title="Abre a tela deste jogador em outra aba para você jogar por ele">Assumir</button><button data-a="giveChar" data-k="${esc(a)}">+ Personagem</button><button data-a="userPass" data-k="${esc(a)}">Nova senha</button><button data-a="userDel" data-k="${esc(a)}">Apagar</button></span></div>`; }).join('') || '<p><small>Nenhuma conta ainda. Crie uma para cada jogador.</small></p>';
  const opts = heroes().map(c => `<option value="${c.id}" ${sess.ch === c.id ? 'selected' : ''}>${esc(c.name)}${c.owner ? ' (de ' + esc(c.owner) + ')' : ''}</option>`).join('');
  const form = `<div class="row"><input data-sess="n" aria-label="Login do jogador" placeholder="Login (sem espaços)" value="${esc(sess.n)}"><input data-sess="p" aria-label="Senha" placeholder="Senha (vazio = gerar)" value="${esc(sess.p)}"></div>
    <div class="row"><select data-sess="ch" aria-label="Personagem da conta"><option value="">Sem personagem por enquanto</option>${opts}</select><button class="own" data-a="userAdd">Criar conta</button></div>
    ${sess.last ? `<div class="invite"><small>Passe só para esse jogador</small><b>${esc(sess.last.n)} · ${esc(sess.last.p)}</b></div><div class="row"><button data-a="copy" data-k="acc">Copiar acesso</button></div>` : ''}`;
  const guide = `<details><summary>Passo a passo do mestre</summary><ol>
    <li><b>Antes da 1ª sessão:</b> crie aqui uma conta para cada jogador e escolha o personagem dela. Copie o acesso e mande para cada um em particular.</li>
    <li><b>No dia:</b> abra o programa e espere "Internet: Aberta" (na 1ª vez ele baixa o cloudflared, leva um minuto).</li>
    <li>Clique em <b>Copiar convite</b> e cole no grupo. O código muda a cada vez que você abre o programa.</li>
    <li>Durante o jogo, os pedidos dos jogadores aparecem na faixa <b>Pedidos</b>, no alto: Enter aprova, Delete nega. Em "Aprovar sozinho" você libera um tipo de ação sem passar por você.</li>
    <li>Na TV, abra <b>/table</b> e entre com o login <b>mestre</b> e a sua chave.</li>
    <li>Ao fim, feche a janela do programa: o link para de funcionar e tudo fica salvo na pasta <b>data</b>. Faça cópia dessa pasta de vez em quando.</li>
    <li>Jogador esqueceu a senha: <b>Nova senha</b>. Quem estiver conectado com a senha antiga é desconectado.</li></ol></details>`;
  return net + `<h4>Contas dos jogadores</h4>${acc}<h4>Nova conta</h4>${form}${guide}`;
}

function timeline(n = 8) { return (S.battle.order || []).filter(id => S.chars[id]).slice(0, n); } // fila calculada pelo servidor
function bar(k, c, hideNum) {
  const max = k === 'limit' ? 100 : c[k + 'Max'], pct = Math.round(Math.max(0, Math.min(100, 100 * c[k] / (max || 1))));
  return `<div class="bar ${k}"><i data-bid="${c.id}:${k}" data-p="${pct}" style="width:${pct}%"></i><span>${L[k]}${hideNum ? '' : ` ${c[k]}/${max}`}</span></div>`;
}

// ===== palco de batalha =====
const KANJI = { fis: '武', kagutsuchi: '火', susanoo: '水', atlas: '土', indra: '雷', fuhaku: '風', amaterasu: '光', tsukuyomi: '闇', shukketsu: '血', hiruko: '核', aura: '気', oculto: '呪' };
const mainEl = c => c.el || c.resist?.find(e => e !== 'fis') || 'fis';
const bodyMini = c => `<svg class="mini" viewBox="0 0 120 260" aria-hidden="true">${PARTS.map(k => `<${SHAPE[k][0]} ${SHAPE[k][1]} class="l${lvl(c, k)}"/>`).join('')}</svg>`;
function unit(c, cur) {
  const foe = !!c.enemy, el = mainEl(c), low = c.hp > 0 && c.hp <= c.hpMax * .25;
  const sts = c.hp > 0 ? [[sanSt(c)], ...(c.afl ? [[`${c.afl.t === 'v' ? 'Virtude' : 'Aflição'}: ${(c.afl.t === 'v' ? RULES.VIR : RULES.AFL)[c.afl.k][0]}`, (c.afl.t === 'v' ? RULES.VIR : RULES.AFL)[c.afl.k][1]]] : []), ...Object.entries(c.st).map(([k, n]) => [k === 'shield' && c.shield ? `${ST[k]} ${c.shield}` : ST[k] + (n < 90 ? ' ' + n : ''), STD[k]])].filter(x => x[0]).map(([s, t]) => `<i${t ? ` title="${esc(t)}"` : ''}>${s}</i>`).join('') : `<i class="dead">${c.dead ? 'Morto' : c.dying ? 'Caído · ' + c.dying : 'Caído'}</i>`;
  const vb = !foe && c.vinc?.[0] ? `<em class="vb" style="--e:${ELC[c.vinc[0]]}" title="Vínculo: ${PATRON[c.vinc[0]]}">${KANJI[c.vinc[0]]}</em>` : '';
  const fig = `<div class="figw">${vb}<div class="fig" style="--e:${ELC[el]}">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<span class="glyph">${foe ? KANJI[el] : esc(c.name.slice(0, 1).toUpperCase())}</span>`}</div></div>`;
  const stats = foe ? bar('hp', c, true) + (gm ? `<div class="duo"><small>${c.hp}/${c.hpMax}</small></div>` : '')
    : `<div class="hpn"><span>${c.hp}</span><small>/${c.hpMax}</small><em>HP</em></div>${bar('hp', c, true)}<div class="duo"><div>${bar('aura', c, true)}<small>Aura ${c.aura}/${c.auraMax}</small></div><div>${bar('san', c, true)}<small>Sanidade ${c.san}/${c.sanMax}</small></div></div>
      <div class="lim ${c.limit >= 100 ? 'full' : ''}">${bar('limit', c, true)}<small>${c.limit >= 100 ? 'Limite!' : 'Limite ' + c.limit + '%'}</small></div>`;
  const brk = c.brk && c.hp > 0 ? `<div class="brk" title="Barra de Quebra: fraquezas e pontos fracos a esvaziam">Quebra ${'◆'.repeat(c.brk.cur)}${'◇'.repeat(c.brk.max - c.brk.cur)}</div>` : '', rit = !foe && (c.brv || c.ten) ? `<div class="rit">${c.brv ? `Coragem ${c.brv}` : ''}${c.brv && c.ten ? ' · ' : ''}${c.ten ? `Tensão ×${[1, 1.5, 2, 3][c.ten]}` : ''}</div>` : '';
  return `<div class="unit ${foe ? 'foe' : 'hero'} ${c === cur ? 'cur' : ''} ${c.id === tgt ? 'tgt' : ''} ${c.hp > 0 ? '' : 'ko'} ${low ? 'low' : ''}" data-tgt="${c.id}" style="--c:${esc(c.color)}">${fig}${foe ? '' : bodyMini(c)}<div class="plate"><b class="nm">${esc(c.name)}</b><div class="sts">${sts}</div>${brk}${rit}${stats}</div></div>`;
}
const BBG = { rubro: 'Rubro', noite: 'Noite', floresta: 'Floresta', brasa: 'Brasa', gelo: 'Gelo', vazio: 'Vazio', santuario: 'Santuário', tempestade: 'Tempestade' }; // fundos prontos da batalha
function battle() {
  const tl = timeline(), cur = S.chars[tl[0]], sc = S.scenes[S.scene], inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks);
  const side = e => { const l = inB.filter(c => !!c.enemy === e), n = l.length, cols = n > 4 ? Math.ceil(n / 2) : Math.max(1, n), w = Math.min(14.5, 43 / cols - 1.3);
    return `<div class="side ${e ? 'foes' : 'heroes'} ${n > 4 ? 'two' : ''}" style="--w:${w.toFixed(2)}cqw">${l.map(c => unit(c, cur)).join('')}</div>`; };
  const acts = c => `<div class="row"><b>${esc(c.name)}:</b>${gm && c.enemy ? '<button class="own" data-a="ai">IA decide</button>' : ''}<button data-a="act" data-id="${c.id}" data-skill="atk">Ataque</button>${c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive').map(k => { const s = S.skills[k];
      return `<button data-a="act" data-id="${c.id}" data-skill="${k}" title="${esc(c.cant?.[k] || desc(s))}" ${blocked(c, s, k) ? 'disabled' : ''}>${esc(s.name)}</button>`; }).join('')}
      ${Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons').map(([k, q]) => `<button class="item" data-a="use" data-id="${c.id}" data-item="${k}">${esc(S.items[k].name)} ×${q}</button>`).join('')}
      <button data-a="next">Passar</button></div>${aimBox()}`;
  const hs = inB.filter(c => !c.enemy && !c.dead), danger = hs.length ? 1 - hs.reduce((a, c) => a + Math.max(0, c.hp) / (c.hpMax || 1), 0) / hs.length + (hs.some(c => c.hp <= 0) ? .25 : 0) + (inB.some(c => c.boss && c.hp > 0) ? .15 : 0) : 0, heat = danger >= .6 ? 2 : danger >= .3 ? 1 : 0;
  const img = sc.bbg && !BBG[sc.bbg] ? sc.bbg : !sc.bbg ? sc.bg : '';
  return `<section class="stage battle heat-${heat} ${BBG[sc.bbg] ? 'bb-' + sc.bbg : sc.bbg ? 'bb-img' : ''}" style="${img ? `--bg:url('${esc(img)}')` : ''}"><div class="tl"><em>Ordem</em>${tl.map((id, i) => `<span class="${i ? '' : 'cur'} ${S.chars[id].enemy ? 'foe' : ''}" style="--c:${esc(S.chars[id].color)}">${i ? '' : '<small>Agora</small>'}${esc(S.chars[id].name)}</span>`).join('')}</div>
    <div class="field">${side(true)}<div class="mid"><small>${esc(sc.name)}${heat ? ` · ${heat > 1 ? 'perigo' : 'tensão'}` : ''}</small></div>${side(false)}</div>${gm && cur ? acts(cur) : ''}</section>`;
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
    return `<div class="tok ${mine(c) ? 'mine' : ''} ${c.enemy ? 'foe' : ''} ${c.hp > 0 ? '' : 'ko'} ${asking.has(c.id) ? 'asking' : ''}" data-id="${c.id}" style="--x:${c.x + m.ox};--y:${c.y + m.oy};--c:${esc(c.color)};--e:${ELC[el]}" title="${esc(c.name)}"><span class="tface" style="${bgImg(c.img)}">${c.img ? '' : c.enemy ? KANJI[el] : esc(c.name.slice(0, 1).toUpperCase())}</span><b>${esc(c.name)}</b><i class="thp"><i style="width:${hp}%"></i></i></div>`; };
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
    <div class="card gen"><h3>Criar sob medida <small>para o grupo na cena: ${partyRef().n} heróis · poder ${partyRef().p}</small></h3>
      <div class="row chips">${Object.keys(KANJI).map(e => `<span class="${gen.el === e ? 'weak' : ''}" data-a="genSet" data-k="el" data-v="${e}" title="${EL[e]}" style="color:${gen.el === e ? '#fff' : ELC[e]}">${KANJI[e]}</span>`).join('')}<i class="sep"></i>${chips(ROLEN, (k, l) => `<span class="${gen.role === k ? 'weak' : ''}" data-a="genSet" data-k="role" data-v="${k}">${l}</span>`)}<i class="sep"></i>${chips(RANKN, (k, l) => `<span class="${gen.rank === k ? 'weak' : ''}" data-a="genSet" data-k="rank" data-v="${k}">${l}</span>`)}</div>
      <div class="row"><button class="own" data-a="foeGen">Criar ${RANKN[gen.rank].toLowerCase()} ×${gen.rank === 'chefe' ? 1 : +bf.n || 1}</button><button class="ghost" data-a="foeGen" data-save="1">Salvar no bestiário</button><i class="sep"></i><b>Encontro automático:</b>${chips(DIFFN, (k, l) => `<button data-a="foeEnc" data-diff="${k}" title="Gera um grupo de inimigos do elemento escolhido, na medida do grupo">${l}</button>`)}</div>
      <small>Atributos, HP, arma e skills saem do poder do grupo. Normal ≈ 2 em 3 vitórias; difícil ≈ metade; mortal ≈ 1 em 5. Chefes do bestiário também são ajustados ao grupo ao serem criados.</small></div>
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
  return ids.map((id, i) => `<div class="row inv"><span>${i + 1}. ${esc(S.chars[id].name)} <small>${S.chars[id].hp > 0 ? '' : 'caído · '}tempo <input type="number" class="tin" min="0" aria-label="Tempo de ${esc(S.chars[id].name)}" data-ini="${id}" value="${T[id]}"></small></span>${b('up', id, '▲', 'Adiantar')}${b('down', id, '▼', 'Atrasar')}${b('out', id, '×', 'Tirar da batalha')}</div>`).join('')
    + `<div class="row chips">Incluir: ${Object.values(S.chars).filter(c => !(c.id in T) && c.x != null && c.scene === S.scene && c.hp > 0).map(c => `<span data-a="ini" data-k="in" data-id="${c.id}">+ ${esc(c.name)}</span>`).join('') || '<small>todos já estão na fila</small>'}</div>`;
}

// ===== fichas na tela do mestre: cartão resumido na lista e, na janela própria, as mesmas páginas do jogador mais a aba Mestre =====
const FT = { pers: 'Personagem', hab: 'Habilidades', itens: 'Itens', hist: 'Diário', gm: 'Mestre' }, ftab = {};
const selC = new Set(), qa = { v: 5, st: 'burn', item: '' }; let asking = new Set();
const sheetCard = c => `<div class="scard ${selC.has(c.id) ? 'sel' : ''} ${asking.has(c.id) ? 'asking' : ''}" data-a="selCard" data-id="${c.id}" style="--c:${esc(c.color)}" aria-pressed="${selC.has(c.id)}">
    <div class="sc-h"><i class="chk" aria-hidden="true"></i><b>${esc(c.name)}</b><small>${c.enemy ? 'Inimigo' : esc(c.owner || 'sem dono')}${(c.vinc || []).map(e => ' · ' + PATRON[e]).join('')}</small></div>
    <div class="sc-r">${['hp', 'aura', 'san'].map(k => `<span class="rv ${k}"><em>${L[k]}</em>${edv(c, k, c[k])}<small>/${c[k + 'Max']}</small></span>`).join('')}${c.enemy ? '' : `<span class="rv"><em>XP</em>${edv(c, 'xp', c.xp)}</span><span class="rv"><em>Ouro</em>${edv(c, 'gold', c.gold)}</span>`}</div>
    ${bar('hp', c, true)}<div class="sc-f"><em>${c.hp > 0 ? stList(c) || 'Sem condições' : c.dead ? 'Morto' : 'Caído'}</em><button class="ghost" data-a="openSheet" data-id="${c.id}">Abrir ficha</button>${!c.enemy && c.owner ? `<button class="ghost" data-a="peek" data-k="${esc(c.owner)}" title="Abre a tela de ${esc(c.owner)} em outra aba, só para olhar">Ver como</button><button class="ghost" data-a="peek" data-v="1" data-k="${esc(c.owner)}" title="Abre a tela de ${esc(c.owner)} em outra aba para você jogar por ele">Assumir</button>` : ''}</div></div>`;
// barra de ações rápidas: vale para as fichas selecionadas (uma ou várias)
function fichasWin() {
  const cs = Object.values(S.chars), n = [...selC].filter(id => S.chars[id]).length, dis = n ? '' : 'disabled', grp = (l, list) => list.length ? `<h4>${l}</h4>${list.map(sheetCard).join('')}` : '';
  for (const id of selC) if (!S.chars[id]) selC.delete(id);
  const its = Object.entries(S.items).sort((a, b) => a[1].name.localeCompare(b[1].name));
  return `<div class="bulk"><div class="row"><b>${n ? `${n} selecionada${n > 1 ? 's' : ''}` : 'Clique nas fichas para selecionar'}</b><i class="sep"></i><button class="ghost" data-a="selAll" data-k="h">Heróis</button><button class="ghost" data-a="selAll" data-k="e">Inimigos</button>${n ? '<button class="ghost" data-a="selAll" data-k="">Limpar</button>' : ''}</div>
      <div class="row"><input type="number" min="0" data-qa="v" value="${qa.v}" aria-label="Valor para as ações rápidas">${[['dmg', 'Dano'], ['heal', 'Cura'], ['aura', '+ Aura'], ['san', '+ Sanidade'], ['xp', '+ XP'], ['gold', '+ Ouro']].map(([k, l]) => `<button data-a="bulk" data-k="${k}" ${dis}>${l}</button>`).join('')}<button data-a="bulk" data-k="full" ${dis} title="HP, Aura e Sanidade no máximo; tira ferimentos e condições">Restaurar</button></div>
      <div class="row"><select data-qa="st" aria-label="Condição">${chips(ST, (k, l) => `<option value="${k}" ${qa.st === k ? 'selected' : ''}>${l}</option>`)}</select><button data-a="bulk" data-k="st" ${dis} title="Põe ou tira a condição">Condição</button>
        <select data-qa="item" aria-label="Item">${its.map(([k, i]) => `<option value="${k}" ${qa.item === k ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select><button data-a="bulk" data-k="item" ${dis}>Dar item</button></div>
      <small>Clique em qualquer número de uma ficha para editar; aceita <b>+5</b> ou <b>-12</b>.</small></div>
    ${grp('Heróis', cs.filter(c => !c.enemy)) + grp('Inimigos', cs.filter(c => c.enemy)) || '<small>Crie personagens na janela Cena.</small>'}`;
}
// faixa fixa de pedidos dos jogadores (Enter aprova o primeiro, Delete nega)
const reqUi = {}, AUTOL = { roll: 'Rolagens', act: 'Combate', learn: 'Skills', item: 'Itens', camp: 'Acampamento' }; let lastReqN = 0, mute = ls('vj_mute') === '1';
function reqStrip() {
  const rs = Object.entries(S.reqs).sort((a, b) => a[1].n - b[1].n);
  for (const k in reqUi) if (!S.reqs[k]) delete reqUi[k];
  const card = ([id, r], i) => { const u = reqUi[id] ||= { mod: 0, secret: false }, c = S.chars[r.ch], canMod = r.t === 'roll' || r.t === 'act';
    return `<div class="rq ${id === reqIn ? 'in' : ''}" style="--c:${esc(c?.color || '#888')}"><div class="rq-t"><small>${esc(r.by)} · ${AUTOL[r.cat]}</small><b>${esc(c?.name || '?')}</b><span>${esc(r.text)}</span></div>
      ${canMod ? `<div class="stepper sm" role="group" aria-label="Bônus ou penalidade">${[-20, -10, 0, 10, 20].map(v => `<button data-a="rqMod" data-id="${id}" data-v="${v}" class="${u.mod === v ? 'on' : ''}" aria-pressed="${u.mod === v}">${v > 0 ? '+' + v : v}</button>`).join('')}</div>` : ''}
      ${r.cat === 'roll' ? `<div class="stepper sm" role="group" aria-label="Vantagem ou desvantagem">${[['adv', 'Vantagem'], ['dis', 'Desvantagem']].map(([v, l]) => `<button data-a="rqAdv" data-id="${id}" data-v="${v}" class="${u.adv === v ? 'on' : ''}" aria-pressed="${u.adv === v}" title="Rola 2d100 e fica com o ${v === 'adv' ? 'melhor' : 'pior'}">${l}</button>`).join('')}</div>` : ''}
      ${r.cat === 'roll' ? `<button class="tog ${u.secret ? 'on' : ''}" data-a="rqSecret" data-id="${id}" aria-pressed="${u.secret}" title="Só você vê o resultado">Secreta</button>` : ''}
      <div class="rq-b"><button class="ok" data-a="rqOk" data-id="${id}">Aprovar${i ? '' : ' <kbd>Enter</kbd>'}</button><button class="no" data-a="rqNo" data-id="${id}">Negar${i ? '' : ' <kbd>Del</kbd>'}</button><button class="ghost" data-a="rqWhy" data-id="${id}" title="Negar e dizer o motivo ao jogador">Negar com motivo</button></div></div>`; };
  return `<div class="reqs ${rs.length ? 'has' : ''}"><div class="rq-bar"><b>Pedidos${rs.length ? ` <i>${rs.length}</i>` : ''}</b><span>Aprovar sozinho:</span>${chips(AUTOL, (k, l) => `<button class="tog ${S.auto[k] ? 'on' : ''}" data-a="autoSet" data-k="${k}" data-v="${S.auto[k] ? '' : 1}" aria-pressed="${!!S.auto[k]}" title="${S.auto[k] ? 'Acontece na hora, sem passar por você' : 'Espera a sua aprovação'}">${l}</button>`)}<button class="ghost" data-a="mute" aria-pressed="${mute}">${mute ? 'Som desligado' : 'Som ligado'}</button></div>${rs.map(card).join('')}</div>`;
}
let reqIn = null;
function gmPanel(c) {
  const inp = (f, v, type = 'number') => `<input type="${type}" aria-label="${f}" data-id="${c.id}" data-f="${f}" value="${esc(v)}">`, btn = (a, l) => `<button data-a="${a}" data-id="${c.id}">${l}</button>`, lab = (l, x) => `<label>${l}${x}</label>`;
  return `<section class="gmp"><div class="card"><h3>Atributos</h3><div class="attrs">${A.map(a => lab(a, inp('attrs.' + a, c.attrs[a]))).join('')}</div>
      <h3>Recursos <small>máximo = atributos + bônus</small></h3><div class="fgrid">${['hp', 'aura', 'san'].map(k => lab(L[k], inp(k, c[k])) + lab('bônus máx.', inp('bon.' + k + 'Max', c.bon[k + 'Max']))).join('')}${lab('Limite %', inp('limit', c.limit))}${lab('XP', inp('xp', c.xp))}${lab('Ouro', inp('gold', c.gold))}${lab('Arma base', inp('arma', c.arma))}${lab('Armadura base', inp('armor', c.armor))}
        ${c.enemy ? lab('Recompensa XP', inp('xpR', c.xpR)) + lab('Recompensa ouro', inp('goldR', c.goldR)) : lab('Jogador dono', inp('owner', c.owner, 'text'))}</div></div>
    <div class="card"><h3>Despertares <small>selos narrativos que liberam nós</small></h3><div class="row chips">${Object.entries(RULES.AW).map(([k, n]) => `<span class="${(c.aw || []).includes(k) ? 'weak' : ''}" data-a="aw" data-id="${c.id}" data-k="${k}">${esc(n)}</span>`).join('')}</div>
      <label>Natureza de Aura <select data-id="${c.id}" data-f="nen"><option value="">— (a primeira categoria aprendida)</option>${RULES.NEN.map(k => `<option value="${k}" ${c.nen === k ? 'selected' : ''}>${RULES.NENN[k]}</option>`).join('')}</select></label></div>
    <div class="card"><h3>Vínculos <small>conceder dá a skill raiz e resistência</small></h3><div class="row chips">${Object.keys(PATRON).filter(e => !['fis', 'aura', 'oculto'].includes(e)).map(e => `<span class="${c.vinc.includes(e) ? 'weak' : ''}" data-a="vinc" data-id="${c.id}" data-el="${e}">${PATRON[e]}</span>`).join('')}</div>
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
const PAGES = { mesa: 'Mesa', pers: 'Ficha', hab: 'Habilidades', itens: 'Itens', hist: 'Diário' };
const PATRON = { fis: 'Marcial', kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', hiruko: 'Hiruko', aura: 'Aura', oculto: 'Ocultismo' };
let pg = 'mesa', selCh = null, chatOpen = innerWidth >= 1000, gridFull = null, wasBattle = false;
const near = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy)) <= 1;
const figCard = (c, w) => `<div class="unit hero cur static" style="--c:${esc(c.color)};--w:${w}"><div class="figw"><div class="fig">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<span class="glyph">${esc(c.name.slice(0, 1).toUpperCase())}</span>`}</div></div></div>`;

// grade de habilidades como constelação: círculo = ativa, losango = passiva; brilho = aprendida, tracejado = disponível
const lab2 = n => { const w = n.split(' '), a = []; let l = ''; for (const x of w) { if (l && (l + ' ' + x).length > 14) { a.push(l); l = x; } else l = l ? l + ' ' + x : x; } a.push(l); return a.slice(0, 2).map((t, i) => `<tspan x="0" dy="${i ? 11 : 0}">${esc(i === 1 && a.length > 2 ? t + '…' : t)}</tspan>`).join(''); };
let skOnly = false, gvFor = null; // personagem para o qual a grade já foi enquadrada
const gv = { z: 1, x: 0, y: 0 }; let skd = null, skMoved = false;
function skillPage(c) {
  const N = Object.entries(S.skills), own = new Set(c.skills), ownL = c.skills.map(k => S.skills[k]).filter(Boolean), U = 86, G = Math.max(17, ...N.map(([, s]) => Math.max(s.gx, s.gy) + 1)), mid = (G - 1) / 2, P = s => [s.gx * U + U / 2, s.gy * U + U / 2];
  const rqMiss = s => c.enemy || !s.rq ? [] : Object.entries(s.rq).filter(([a, v]) => c.attrs[a] + (eq(c, 'acess')?.attr === a ? eq(c, 'acess').power : 0) < v);
  const mineV = s => c.enemy || s.el === 'fis' || s.el === 'aura' || (s.el === 'oculto' ? (c.aw || []).includes('outro') : (c.vinc || []).includes(s.el)), exTaken = s => s.ex && ownL.some(o => o.ex === s.ex && o !== s);
  const xpOf = s => RULES.xpCost(c, s), whyF = (s, id, soft) => RULES.whyNot(c, s, S.skills, S.items, id, soft);
  const avail = s => mineV(s) && !whyF(s, null, true), sel = selNode[c.id] && S.skills[selNode[c.id]] ? selNode[c.id] : null, ss = S.skills[sel];
  let lines = '';
  for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) { const a = N[i][1], b = N[j][1];
    if (near(a, b) && (a.el === b.el || a.el === 'fis' || b.el === 'fis')) { const [x1, y1] = P(a), [x2, y2] = P(b), on = own.has(N[i][0]) && own.has(N[j][0]); lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${on ? 'on' : ''} ${mineV(a) && mineV(b) ? '' : 'out'}" style="--e:${ELC[a.el === 'fis' ? b.el : a.el]}"/>`; } }
  const cen = {}; for (const [, s] of N) { const o = cen[s.el] ||= [0, 0, 0]; o[0] += s.gx; o[1] += s.gy; o[2]++; }
  const halos = Object.entries(cen).filter(([el]) => el !== 'fis').map(([el, [x, y, n]]) => { const dx = x / n - mid, dy = y / n - mid, d = Math.hypot(dx, dy) || 1, px = (mid + dx / d * G * .46) * U + U / 2, py = (mid + dy / d * G * .46) * U + U / 2, mineS = (c.vinc || []).includes(el);
    return `<g class="${mineS ? 'vmine' : 'vout'}"><text class="halo" x="${px}" y="${py}" style="--e:${ELC[el]};font-size:${G * 12}px">${KANJI[el]}</text><text class="hname" x="${px}" y="${py + G * 4}" style="--e:${ELC[el]};font-size:${G * 1.9}px">${PATRON[el]}${mineS ? ' · seu Vínculo' : ''}</text></g>`; }).join('');
  const nodes = N.map(([id, s]) => { const [x, y] = P(s), st = own.has(id) ? 'own' : !mineV(s) ? 'out' : avail(s) ? 'av' : 'lock', pas = s.kind === 'passive', mark = s.back ? '禁' : s.limit ? '極' : s.kind === 'form' ? '変' : s.circ ? '儀' : s.duo ? '双' : s.vow ? '誓' : s.summon ? '召' : pas ? '+' : KANJI[s.el];
    return `<g class="nd ${st} ${id === sel ? 'sel' : ''} ${c.xp >= xpOf(s) ? '' : 'poor'} ${s.rq ? (rqMiss(s).length ? 'rqno' : 'rqok') : ''}" data-node="${id}" data-id="${c.id}" transform="translate(${x} ${y})" style="--e:${ELC[s.el]}"><title>${esc(s.name)} · ${xpOf(s)} XP</title>${pas ? '<rect x="-12" y="-12" width="24" height="24" transform="rotate(45)"/>' : `<circle r="${s.limit || s.back ? 19 : 15}"/>`}<text class="mk" y="6">${mark}</text>${s.rq ? `<text class="rq" x="17" y="-13">${Object.entries(s.rq).map(([a, v]) => a + v).join(' ')}</text>` : ''}<text class="lb" y="30">${lab2(s.name)}</text></g>`; }).join('');
  const tag = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
  const why = !ss || own.has(sel) ? '' : whyF(ss, sel);
  const exOther = ss?.ex ? N.filter(([k, s]) => s.ex === ss.ex && k !== sel).map(([, s]) => s.name).join(', ') : '';
  const detail = ss ? `<div class="ndcard" style="--e:${ELC[ss.el]}"><small>${PATRON[ss.el]} · ${KIND[ss.kind]}${ss.limit ? ' · Limite' : ''}${ss.back ? ' · Proibida' : ''}</small><h2>${esc(ss.name)}</h2>${ss.d ? `<p class="flav">${esc(ss.d)}</p>` : ''}
      <div class="tags">${ss.kind === 'passive' ? (pasTxt(ss) ? tag('Efeito', pasTxt(ss)) : '')
        : ss.kind === 'form' || ss.kind === 'util' ? tag('Atributo', ss.attr) + tag('Custo', ss.cost + ' ' + RES[ss.res]) + tag('Alvo', selfSk(ss) ? 'Em si' : ss.area ? 'Área' : 'Único') + ((ss.ct || 100) !== 100 ? tag('Tempo', ss.ct + '%') : '')
        : tag('Poder', ss.power) + tag('Atributo', ss.attr) + tag('Custo', ss.limit ? 'Limite 100%' : ss.cost + ' ' + RES[ss.res]) + tag('Alvo', ss.area ? 'Área' : 'Único') + ((ss.ct || 100) !== 100 ? tag('Tempo', ss.ct + '%') : '') + (ss.st ? tag('Causa', ST[ss.st]) : '') + (ss.req ? tag('Exige', WT[ss.req]) : '') + (ss.back ? tag('Sequela', ST[ss.back]) : '')}${ss.rq ? Object.entries(ss.rq).map(([a, v]) => tag('Requisito', a + ' ' + v)).join('') : ''}${ss.pre ? tag('Antes', esc(ss.pre.split('|').join(', '))) : ''}${ss.nb ? tag('Ramo', ss.nb + ' nós') : ''}${ss.aw ? tag('Despertar', RULES.AW[ss.aw]) : ''}${ss.cs ? tag('Estado', RULES.CS[ss.cs][0]) : ''}${ss.cat ? tag('Aura', RULES.NENN[ss.cat] + (c.nen && c.nen !== ss.cat ? ` · ${Math.round(RULES.nenEff(c, ss) * 100)}%` : '')) : ''}</div>
      ${RULES.extra(ss) ? `<p class="mech">${esc(RULES.extra(ss))}</p>` : ''}
      ${exOther ? `<small class="exw">Escolha excludente: aprender esta tranca ${esc(exOther)}.</small>` : ''}
      ${gm && c.enemy ? `<button class="learn" data-a="skTog" data-id="${c.id}" data-skill="${sel}">${own.has(sel) ? 'Remover do inimigo' : 'Dar ao inimigo'}</button>` : (own.has(sel) ? '<div class="learned">Aprendida</div>' : `<button class="learn" data-a="learn" data-id="${c.id}" data-skill="${sel}" ${mine(c) && !why ? '' : 'disabled'}>${askL('learn', 'Aprender', 'Pedir ao mestre')} · ${xpOf(ss)} XP</button>${why ? `<small class="why">${why}</small>` : ''}`)
        + (gm ? `<button class="ghost" data-a="skTog" data-id="${c.id}" data-skill="${sel}" title="Sem gastar XP nem conferir requisitos">${own.has(sel) ? 'Tirar a skill (mestre)' : 'Dar sem custo (mestre)'}</button>` : '')}</div>`
    : '<div class="ndcard empty"><h2>Escolha um nó</h2><small>Clique em um nó para ver o que ele faz. Você aprende o tronco Marcial, a Aura e as skills do seu Vínculo (o Ocultismo pede um Despertar), sempre a partir de um nó vizinho de um que já tem.</small></div>';
  const mineL = c.skills.filter(k => S.skills[k]).map(k => `<li style="--e:${ELC[S.skills[k].el]}" data-node="${k}" data-id="${c.id}"><b>${esc(S.skills[k].name)}</b><small>${esc(desc(S.skills[k]))}</small></li>`).join('');
  const canNow = N.filter(([id, s]) => !own.has(id) && mineV(s) && !whyF(s, id)).length, sq = (bf.skq || '').trim().toLowerCase();
  const found = gm && sq ? N.filter(([, s]) => s.name.toLowerCase().includes(sq)).slice(0, 10).map(([id, s]) => `<span class="${own.has(id) ? 'weak' : ''}" data-node="${id}" data-id="${c.id}" style="border-color:${ELC[s.el]}">${esc(s.name)}</span>`).join('') || '<small>Nenhuma skill com esse nome.</small>' : '';
  return `<section class="skp"><div class="skmap ${gv.z < 1.7 ? 'far' : 'near'} ${skOnly ? 'only' : ''}" data-cid="${c.id}"><svg viewBox="0 0 ${G * U} ${G * U}" role="group" aria-label="Grade de habilidades" style="transform:translate(${gv.x}px,${gv.y}px) scale(${gv.z})">${halos}<g class="ln">${lines}</g>${nodes}</svg>
      <div class="skzoom"><button data-a="skZoom" data-v="1.5" aria-label="Aproximar">+</button><button data-a="skZoom" data-v="0.667" aria-label="Afastar">−</button></div>
      <div class="skhint"><button data-a="skReset">Minha árvore</button><button data-a="skAll">Ver tudo</button><button class="tog ${skOnly ? 'on' : ''}" data-a="skOnly" aria-pressed="${skOnly}">Só o que posso aprender</button><small>Arraste para mover · roda do mouse, pinça ou + − para o zoom</small></div></div>
    <aside class="skside"><div class="xp"><small>XP disponível de ${esc(c.name)}<br>${c.enemy ? '' : canNow ? `<i class="can">${canNow} ${canNow > 1 ? 'habilidades' : 'habilidade'} ao seu alcance</i>` : 'nada ao alcance com esse XP'}</small><b>${edv(c, 'xp', c.xp)}</b></div>${detail}
      ${gm ? `<div class="card skfind"><h3>Dar skill <small>só o mestre</small></h3><input class="bq" data-bf="skq" placeholder="Buscar skill pelo nome…" aria-label="Buscar skill" value="${esc(bf.skq || '')}"><div class="row chips">${found}</div></div>` : ''}
      <div class="legend"><span><i class="lc"></i>Ativa</span><span><i class="lp"></i>Passiva</span><span><i class="lo"></i>Aprendida</span><span><i class="la"></i>Dá para aprender</span><span><i class="lx"></i>Outro Vínculo</span><span>変 Transformação</span><span>儀 Ritual</span><span>双 Dupla</span><span>誓 Voto</span><span>召 Invocação</span></div>
      <h3>Aprendidas (${c.skills.length})</h3><ul class="mine">${mineL || '<li class="none"><small>Nenhuma ainda.</small></li>'}</ul></aside></section>`;
}

function persPage(c) {
  const eqn = slot => eq(c, slot) ? `<b>${esc(eq(c, slot).name)}</b><small>${esc(idesc(eq(c, slot)))}</small>` : '<b class="none">Vazio</b><small>equipe na página Itens</small>';
  const res = k => `<div class="resrow ${k}"><em>${L[k]}</em>${bar(k, c, true)}<span class="rn">${edv(c, k, c[k])}<small>/${k === 'limit' ? 100 : c[k + 'Max']}</small></span></div>`;
  const cts = Object.values(S.contracts).filter(ct => !ct.done).map(ct => `<li><b>${esc(ct.target)}</b><small>${ct.gold} ouro · ${ct.xp} XP</small></li>`).join('');
  const sts = [sanSt(c), ...Object.entries(c.st).map(([k, n]) => ST[k] + ' ' + n)].filter(Boolean).map(x => `<i>${x}</i>`).join('');
  const tile = a => { const v = at(c, a), base = v !== c.attrs[a] ? `<small>base ${c.attrs[a]}</small>` : '';
    return gm ? `<div class="tile gmt ${c.marks[a] ? 'mk' : ''}">${edv(c, 'attrs.' + a, c.attrs[a], 'tv')}<button data-a="roll" data-id="${c.id}" data-attr="${a}" title="Rolar ${ATN[a]}${v !== c.attrs[a] ? ` (vale ${v} com equipamento e ferimentos)` : ''}">${a}</button></div>`
      : `<button class="tile ${c.marks[a] ? 'mk' : ''}" data-a="rollAsk" data-id="${c.id}" data-attr="${a}" aria-label="Rolar ${ATN[a]}, ${v}%"><b>${v}</b><span>${a}</span><em>${ATN[a]}</em>${base}</button>`; };
  return `<section class="pp" style="--c:${esc(c.color)}"><div class="pp-hero">${figCard(c, '170px')}
      <div class="pp-id"><input class="pname" aria-label="Nome" data-id="${c.id}" data-f="name" value="${esc(c.name)}"><div class="row pills">${gm ? Object.keys(PATRON).filter(e => !['fis', 'aura', 'oculto'].includes(e)).map(e => `<span class="pill vp ${(c.vinc || []).includes(e) ? '' : 'off'}" style="--e:${ELC[e]};${(c.vinc || []).includes(e) ? '' : 'opacity:.4'}" role="button" tabindex="0" data-a="vinc" data-id="${c.id}" data-el="${e}" title="Clique para ${(c.vinc || []).includes(e) ? 'remover' : 'conceder'} o Vínculo">Vínculo <b>${PATRON[e]}</b></span>`).join('') : (c.vinc || []).map(e => `<span class="pill vp" style="--e:${ELC[e]}">Vínculo <b>${PATRON[e]}</b></span>`).join('')}${(c.aw || []).map(k => `<span class="pill" title="Despertar">✦ <b>${esc(RULES.AW[k] || k)}</b></span>`).join('')}${c.nen ? `<span class="pill" style="--e:${ELC.aura}">Aura <b>${RULES.NENN[c.nen]}</b></span>` : ''}<span class="pill">XP <b>${edv(c, 'xp', c.xp)}</b></span><span class="pill">Ouro <b>${edv(c, 'gold', c.gold)}</b></span>
          <input type="color" aria-label="Cor do personagem" data-id="${c.id}" data-f="color" value="${esc(c.color)}"><label class="up">Trocar retrato<input type="file" accept="image/*" data-up="img" data-id="${c.id}"></label></div>
        <div class="resg">${res('hp')}${res('aura')}${res('san')}${res('limit')}</div><div class="sts big">${sts || '<small>Sem condições ativas.</small>'}</div></div></div>
    <div class="pp-grid"><div class="card wide"><h3>Atributos <small>${gm ? 'clique no número para editar, na sigla para rolar' : `toque para rolar o d100${gated('roll') ? ' (o mestre aprova)' : ''}`}</small></h3><div class="tiles">${A.map(tile).join('')}</div>
        <p class="hint">${gm ? `<label>Modificador da rolagem <input type="number" class="mod" data-mid="${c.id}" value="${mods[c.id] || 0}"></label> ` : ''}<span><i class="mkd"></i> marca os atributos usados com sucesso: eles podem evoluir no descanso longo.</span></p></div>
      <div class="card"><h3>Ferimentos</h3>${bodyFig(c)}</div>
      <div class="card"><h3>Equipamento</h3><div class="slots"><div><em>Arma</em>${eqn('arma')}</div><div><em>Armadura</em>${eqn('armadura')}</div><div><em>Acessório</em>${eqn('acess')}</div></div>
        <h3>Afinidades</h3><div class="row chips">${[...c.weak.map(k => `<span class="weak">Fraco: ${EL[k]}</span>`), ...c.resist.map(k => `<span class="res">Resiste: ${EL[k]}</span>`), eq(c, 'acess')?.el ? `<span class="res">Resiste: ${EL[eq(c, 'acess').el]}</span>` : ''].join('') || '<small>Nenhuma fraqueza ou resistência.</small>'}</div></div>
      ${S.camp.open ? `<div class="card"><h3>Acampamento <small>escolha o que fazer nesta noite${gated('camp') ? ' (o mestre aprova)' : ''}</small></h3><div class="row chips big">${chips(CAMPL, (k, l) => `<span class="${S.camp.acts[c.id] === k ? 'weak' : ''}" data-a="campAct" data-id="${c.id}" data-k="${k}" data-w="${campWith[c.id] || S.camp.with?.[c.id] || ''}">${l}</span>`)}</div><div class="row"><label>Conversar com <select data-a="campWith" data-id="${c.id}"><option value="">ninguém em especial</option>${Object.values(S.chars).filter(o => !o.enemy && o.id !== c.id && !o.summon).map(o => `<option value="${o.id}" ${(campWith[c.id] || S.camp.with?.[c.id]) === o.id ? 'selected' : ''}>${esc(o.name)} · laço ${RULES.bondLv(S.bonds?.[[c.id, o.id].sort().join('|')] || 0)}</option>`).join('')}</select></label></div></div>` : ''}
      <div class="card"><h3>Contratos de caça</h3><ul class="plain">${cts || '<li><small>Nenhum contrato aberto.</small></li>'}</ul></div></div></section>`;
}

let itab = 'inv';
function itemsPage(c) {
  const sh = shop(), card = (k, i, foot, q) => `<div class="icard t-${i.type}" style="--e:${ELC[i.el] || 'var(--line)'}"><em>${IT[i.type]}</em><b>${esc(i.name)}${q > 1 ? ` <i>×${q}</i>` : ''}</b><small>${esc(idesc(i))}</small><div class="row">${foot}</div></div>`;
  const btn = (a, l, k, x = '') => `<button data-a="${a}" data-id="${c.id}" data-item="${k}" ${x}>${l}</button>`;
  const slot = (s, l) => { const i = eq(c, s); return `<div class="slot ${i ? 'on' : ''}"><em>${l}</em>${i ? `<b>${esc(i.name)}</b><small>${esc(idesc(i))}</small>${btn('equip', 'Tirar', c.equip[s], 'class="ghost"')}` : '<b class="none">Vazio</b><small>equipe um item do inventário</small>'}</div>`; };
  const invL = Object.entries(c.inv).filter(([k]) => S.items[k]).sort((a, b) => ITO.indexOf(S.items[a[0]].type) - ITO.indexOf(S.items[b[0]].type));
  const inv = invL.map(([k, q]) => { const i = S.items[k], on = c.equip[i.type] === k;
    return card(k, i, (i.type === 'cons' ? btn('use', 'Usar', k, i.eff === 'bomb' ? 'disabled title="Só em batalha"' : 'class="own"') : i.type === 'mat' ? '' : btn('equip', on ? 'Equipado' : 'Equipar', k, on ? 'class="own"' : '')) + (sh.open ? btn('sell', `Vender · ${Math.floor(i.price / 2)}`, k) : '') + btn('drop', 'Descartar', k, 'class="ghost"'), q); }).join('');
  const forge = Object.entries(S.items).filter(([, i]) => i.el && ['arma', 'acess'].includes(i.type)).map(([k, i]) => { const ess = Object.keys(S.items).find(e => S.items[e].type === 'mat' && S.items[e].el === i.el), have = c.inv[ess] || 0, need = i.type === 'arma' ? 3 : 5, cost = Math.round(i.price / 2);
    return have ? card(k, i, `<small>${have}/${need} essências · ${cost} ouro</small>` + btn('forge', 'Forjar', k, have < need || c.gold < cost ? 'disabled' : '')) : ''; }).join('');
  const stock = sh.open ? sh.stock.filter(k => S.items[k]) : [], T = { inv: `Inventário <i>${invL.reduce((n, [, q]) => n + q, 0)}</i>`, loja: `Loja${sh.open ? ` <i>${stock.length}</i>` : ''}`, forja: 'Forja' }, tab = T[itab] ? itab : 'inv';
  const gq = (bf.giveq || '').trim().toLowerCase(), giveL = Object.entries(S.items).filter(([, i]) => !gq || i.name.toLowerCase().includes(gq)).sort((a, b) => a[1].name.localeCompare(b[1].name)).slice(0, gq ? 30 : 12);
  const body = tab === 'loja' ? (sh.open ? `<div class="icards">${stock.map(k => card(k, S.items[k], btn('buy', `Comprar · ${S.items[k].price}`, k, c.gold < S.items[k].price ? 'disabled title="Ouro insuficiente"' : 'class="own"'))).join('') || '<p class="none">Nada à venda.</p>'}</div>` : '<p class="none">Não há loja aberta nesta cena.</p>')
    : tab === 'forja' ? `<p class="hint">3 essências do elemento para uma arma, 5 para uma relíquia, mais metade do preço em ouro.</p><div class="icards">${forge || '<p class="none">Você ainda não tem essências para forjar.</p>'}</div>`
    : `<div class="icards">${inv || '<p class="none">Inventário vazio.</p>'}</div>`;
  return `<section class="ip"><div class="ip-top"><div class="gold"><small>Ouro</small><b>${edv(c, 'gold', c.gold)}</b></div>${slot('arma', 'Arma')}${slot('armadura', 'Armadura')}${slot('acess', 'Acessório')}</div>
    ${gated('item') ? '<p class="gate">Usar, equipar, comprar, vender e descartar pedem a aprovação do mestre.</p>' : ''}
    <div class="seg" role="tablist">${chips(T, (k, l) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-a="itab" data-k="${k}">${l}</button>`)}</div>${body}
    ${gm ? `<h3>Entregar item <small>só o mestre</small></h3><div class="row"><input class="bq" data-bf="giveq" placeholder="Buscar item pelo nome…" aria-label="Buscar item para entregar" value="${esc(bf.giveq || '')}"></div><div class="row chips">${giveL.map(([k, i]) => `<span data-a="give" data-id="${c.id}" data-item="${k}">+ ${esc(i.name)}</span>`).join('') || '<small>Nenhum item com esse nome.</small>'}${!gq && Object.keys(S.items).length > 12 ? '<small>Digite para achar os outros.</small>' : ''}</div>` : ''}</section>`;
}
const ITO = ['arma', 'armadura', 'acess', 'cons', 'mat'];

// tela do jogador em batalha: 1) alvo, 2) ação, 3) pedir ao mestre
let pick = { k: 'atk', id: 'atk' }, aimOpen = false, braveOn = false, passTo = '', campWith = {};
// faixa do campo de batalha: clima, barra de Cadeia, Domínio aberto
const fieldBar = () => { const B = S.battle, wx = RULES.CLIMA[B.wx?.k], ch = B.chain || { h: 0, e: 0 }, D = B.dom;
  return `<div class="fbar">${wx ? `<span class="wx" title="${esc(Object.entries(wx[1]).map(([k, v]) => k === 'hit' ? `acerto ${v}` : `${PATRON[k] || k} ×${v}`).join(' · '))}">${wx[0]}</span>` : ''}<span class="chain" title="Fraquezas, críticos e golpes enchem a barra; cheia, o grupo ataca em sequência">Cadeia <b style="--p:${ch.h}%"></b>${ch.h}%</span>${D ? `<span class="dom">Domínio: ${esc(D.name)} (${D.ttl})</span>` : ''}</div>`; };
const blockWhy = (c, s, k) => k && c.cant?.[k] ? c.cant[k] : c.st.silence ? 'Silenciado' : c.st.fury ? 'Em fúria: só ataca' : s.limit && c.limit < 100 ? 'Limite incompleto' : c[s.res] < s.cost ? `Falta ${RES[s.res]}` : s.req && s.req !== wtype(c) ? `Exige ${WT[s.req]}` : '';
function command(c, cur) {
  const my = cur === c, inB = Object.values(S.chars).filter(o => o.id in S.battle.ticks && !o.dead).sort((x, y) => y.enemy - x.enemy), t = inB.find(o => o.id === tgt), [rqId, rq] = myReq() || [], wait = rq && rq.ch === c.id;
  const sks = c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive'), cons = Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons');
  if ((pick.k === 'sk' && !sks.includes(pick.id)) || (pick.k === 'it' && !(c.inv[pick.id] > 0))) pick = { k: 'atk', id: 'atk' };
  const tab = sub === 'sk' || sub === 'it' ? sub : 'atk', s = pick.k === 'sk' ? S.skills[pick.id] : null, it = pick.k === 'it' ? S.items[pick.id] : null, wp = eq(c, 'arma');
  const label = it ? it.name : s ? s.name : 'Ataque', canAim = !it && !(s && (s.area || ['heal', 'util', 'form'].includes(s.kind) || selfSk(s))) && t;
  const why = !my ? 'Aguarde a sua vez' : !t && !selfSk(s) ? 'Escolha um alvo' : s && blocked(c, s, pick.id) ? blockWhy(c, s, pick.id) : '';
  const tg = o => `<button class="tg ${o.enemy ? 'foe' : 'ally'} ${o.id === tgt ? 'on' : ''} ${o.hp > 0 ? '' : 'ko'}" data-tgt="${o.id}" style="--c:${esc(o.enemy ? '#e4002b' : o.color)}" aria-pressed="${o.id === tgt}"><b>${esc(o.name)}</b>${bar('hp', o, true)}<small>${o.hp > 0 ? (o.enemy ? Math.round(100 * o.hp / (o.hpMax || 1)) + '%' : `${o.hp}/${o.hpMax}`) : 'caído'}</small></button>`;
  const opt = (k, id, name, meta, d, off) => `<button class="opt ${pick.k === k && pick.id === id ? 'on' : ''}" data-a="pick" data-k="${k}" data-v="${id}" ${off ? 'disabled' : ''} aria-pressed="${pick.k === k && pick.id === id}"><b>${esc(name)}</b><i>${meta}</i><small>${esc(off || d)}</small></button>`;
  const list = tab === 'sk' ? sks.map(k => { const x = S.skills[k]; return opt('sk', k, x.name, x.limit ? 'Limite' : `${x.cost} ${RES[x.res]}${x.pay ? ' +' : ''}`, desc(x), blocked(c, x, k) ? blockWhy(c, x, k) : ''); }).join('') || '<p class="none">Nenhuma skill ativa ainda. Aprenda na página Habilidades.</p>'
    : tab === 'it' ? cons.map(([k, q]) => opt('it', k, S.items[k].name, '×' + q, idesc(S.items[k]))).join('') || '<p class="none">Nenhum consumível no inventário.</p>'
    : opt('atk', 'atk', 'Ataque', 'sem custo', `${wp ? wp.name : 'Punhos'} · poder ${wp?.power ?? c.arma} · ${wp?.wt === 'fogo' ? 'DES' : 'FOR'}`);
  const tl = timeline(6).slice(1).map(id => `<i class="${S.chars[id].enemy ? 'foe' : ''}">${esc(S.chars[id].name)}</i>`).join('');
  const allies = inB.filter(o => !o.enemy && o.id !== c.id && o.hp > 0), downAll = inB.filter(o => o.enemy && o.hp > 0).length > 0 && inB.filter(o => o.enemy && o.hp > 0).every(o => o.st.down || o.st.broken);
  const rhythm = `<div class="rhythm"><button class="ghost" data-a="defend" data-id="${c.id}" ${my && !wait ? '' : 'disabled'} title="Defende (−25% de dano) e guarda 1 ponto de Coragem (máx. 3)">Defender${c.brv > 0 ? ' ' + c.brv : ''}</button><button class="ghost" data-a="focus" data-id="${c.id}" ${my && !wait ? '' : 'disabled'} title="Gasta o turno acumulando: o próximo golpe causa ×1,5 / ×2 / ×3">Concentrar${c.ten ? ' ×' + [1, 1.5, 2, 3][c.ten] : ''}</button><button class="ghost ${braveOn ? 'on' : ''}" data-a="braveT" ${c.brv > -2 ? '' : 'disabled'} aria-pressed="${braveOn}" title="Gasta 1 ponto de Coragem para agir de novo; sem pontos, fica devendo tempo">Coragem ${c.brv || 0}</button><select data-a="passSel" aria-label="Passar a vez depois de acertar uma fraqueza"><option value="">Passar a vez: ninguém</option>${allies.map(o => `<option value="${o.id}" ${passTo === o.id ? 'selected' : ''}>Passar a vez: ${esc(o.name)}</option>`).join('')}</select><button class="ghost allout" data-a="allOut" data-id="${c.id}" ${my && !wait && downAll ? '' : 'disabled'} title="Todo inimigo Derrubado ou Quebrado: o grupo inteiro ataca">Ataque Total</button></div>`;
  return `<section class="cmd ${my ? 'mine' : ''}" style="--c:${esc(c.color)}"><div class="cmd-h"><div class="turn ${my ? 'me' : ''}">${my ? 'Seu turno' : 'Turno de ' + esc(cur?.name || '—')}</div><div class="nextup"><small>Depois:</small>${tl}</div></div>
    <div class="cmd-g"><div class="cmd-me"><h2>${esc(c.name)}</h2>${['hp', 'aura', 'san', 'limit'].map(k => `<div class="resrow ${k}"><em>${L[k]}</em>${bar(k, c, true)}<span class="rn">${c[k]}<small>/${k === 'limit' ? 100 : c[k + 'Max']}</small></span></div>`).join('')}
        <div class="sts">${c.hp > 0 ? [sanSt(c), ...Object.entries(c.st).map(([k, n]) => ST[k] + ' ' + n)].filter(Boolean).map(x => `<i>${x}</i>`).join('') || '<small>Sem condições.</small>' : `<i class="dead">${c.dead ? 'Morto' : 'Caído' + (c.dying ? ' · ' + c.dying : '')}</i>`}</div></div>
      <div class="cmd-step"><h4><i>1</i>Alvo</h4><div class="tgs">${inB.map(tg).join('')}</div></div>
      <div class="cmd-step"><h4><i>2</i>Ação</h4><div class="seg" role="tablist">${[['atk', 'Atacar'], ['sk', `Skills <i>${sks.length}</i>`], ['it', `Itens <i>${cons.length}</i>`]].map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-sub="${k}">${l}</button>`).join('')}</div><div class="alist">${list}</div>
        ${canAim ? `<button class="ghost aimb ${aim ? 'on' : ''}" data-a="aimT" aria-expanded="${aimOpen}">${aim ? `Mira: ${PL[aim]} (−${AIMP[aim]}%)` : 'Mirar numa parte do corpo'}</button>${aimOpen ? aimBox() : ''}` : ''}</div></div>
    ${fieldBar()}${rhythm}
    <div class="cmd-go ${wait ? 'wait' : ''}"><div class="sum"><small>${wait ? 'Aguardando o mestre' : 'Sua ação'}</small><b>${wait ? esc(rq.text) : `${esc(label)} <span>→</span> ${selfSk(s) ? 'em si' : t ? esc(t.name) : '<u>sem alvo</u>'}${canAim && aim ? ` · ${PL[aim]}` : ''}`}</b></div>
      ${wait ? `<button data-a="reqNo" data-id="${rqId}">Cancelar pedido</button>` : `<button class="ghost" data-a="next" ${my ? '' : 'disabled'} title="Passa a vez gastando metade do tempo">Passar</button><button class="go" data-a="go" data-id="${c.id}" ${why ? 'disabled' : ''}>${why || askL('act', 'Agir')}</button>`}</div></section>`;
}
// conversa e histórico: rolagens mostram o dado; mensagens privadas ficam marcadas
const logHtml = () => `${role === 'table' ? '' : '<div class="chatin"><input class="chat" data-chat="1" placeholder="Mensagem · /r 2d6+1 · /w nome texto" aria-label="Mensagem"><button data-a="chatSend">Enviar</button></div>'}<div class="log" aria-live="polite">${S.log.slice().reverse().map(l => `<p class="${l.kind} ${l.to ? 'priv' : ''}">${l.d ? `<i class="d">${l.d}</i>` : ''}<b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('') || '<p class="none">Nada aconteceu ainda. As rolagens e mensagens aparecem aqui.</p>'}</div>`;
let chatSeen = 0, lastPg = null, meOpen = false;

// exploração: rolagem rápida de atributo e o estado do grupo, logo abaixo do mapa
const mesaTools = c => `<section class="card qroll" style="--c:${esc(c.color)}"><h3>Rolar atributo <small>${esc(c.name)}${gated('roll') ? ' · o mestre aprova' : ''}</small></h3><div class="qr">${A.map(a => `<button data-a="rollAsk" data-id="${c.id}" data-attr="${a}" aria-label="Rolar ${ATN[a]}, ${at(c, a)}%"><b>${at(c, a)}</b><span>${a}</span></button>`).join('')}</div></section>
  <section class="card"><h3>Grupo</h3><div class="pgroup">${Object.values(S.chars).filter(x => !x.enemy && !x.dead).map(x => `<div style="--c:${esc(x.color)}"><b>${esc(x.name)}</b><small>${x.hp > 0 ? stList(x) || 'bem' : 'caído'}</small>${bar('hp', x)}${bar('aura', x)}${bar('san', x)}</div>`).join('')}</div></section>`;
function render() {
  const ae = document.activeElement;
  if (drag || wdrag || cdrag || ae?.matches?.('#app select')) { pending = true; return; }
  pending = false;
  // guarda o campo em edição e a rolagem das janelas para devolver depois de redesenhar
  const keep = ae && app.contains(ae) && ae.matches('input:not([type=file]),textarea') ? { v: ae.value, s: ae.selectionStart,
    sel: ae.tagName + Object.entries(ae.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, x => '-' + x.toLowerCase())}="${CSS.escape(v)}"]`).join('') } : null;
  const scr = [...app.querySelectorAll('.win-body,.chatcol,.skside,.pl>main,.fbody')].map(el => el.scrollTop);
  const b = S.battle.active, sc = S.scenes[S.scene], chars = Object.values(S.chars), on = v => v ? 'class="own"' : '';
  asking = new Set(gm ? Object.values(S.reqs).map(r => r.ch) : []);
  const log = logHtml();
  if (gm) { // pedido novo: toca o aviso e anima o cartão
    const newest = Object.entries(S.reqs).sort((a, b) => b[1].n - a[1].n)[0];
    reqIn = newest && newest[1].n > lastReqN ? newest[0] : null;
    if (reqIn) { lastReqN = newest[1].n; if (!mute) beep(); }
  }
  if (gm) {
    const cena = `<div class="row"><button data-a="addChar">+ Personagem</button><button data-a="addChar" data-enemy="1">+ Inimigo</button><button data-a="secret" ${on(secret)}>Rolagem secreta</button><button data-a="undo" title="Desfaz a última ação do mestre (até 20)">Desfazer</button></div>
      <div class="row">${b ? '<button data-a="battle" data-win="1" class="own">Vitória</button><button data-a="battle">Encerrar batalha</button>' : '<button data-a="battle" data-on="1">Iniciar batalha</button>'}</div>
      <div class="row"><button data-a="rest">Descanso curto</button><button data-a="rest" data-long="1">Descanso longo</button><button data-a="camp" data-on="${S.camp.open ? '' : 1}" ${on(S.camp.open)}>Acampamento</button></div>
      <div class="row chips">Cenas: ${chips(S.scenes, (id, s) => `<span class="${id === S.scene ? 'weak' : ''}" data-a="sceneGo" data-id="${id}">${esc(s.name)}</span>`)}<span data-a="sceneAdd">+</span><span data-a="sceneDel">excluir atual</span><span data-a="content" data-coll="scenes">+ cenas de exemplo</span></div>
      <div class="row"><input aria-label="Nome da cena" data-map="name" value="${esc(sc.name)}"></div>
      <div class="row"><input aria-label="Imagem do mapa" data-map="bg" placeholder="Link da imagem do mapa" value="${esc(sc.bg)}"><label class="up">Enviar imagem<input type="file" accept="image/*" data-up="bg"></label><button data-a="cropOn" ${sc.bg ? '' : 'disabled'}>Recortar área</button></div>
      <div class="row"><label>Casas na largura <input type="number" step="0.25" min="4" max="80" data-map="cols" value="${sc.cols}"></label><small>${Math.round(sc.rows * 10) / 10} de altura</small></div>
      <div class="row"><label>Grade → <input type="range" min="0" max="0.95" step="0.05" data-map="ox" value="${sc.ox}" aria-label="Deslocar grade na horizontal"></label><label>↓ <input type="range" min="0" max="0.95" step="0.05" data-map="oy" value="${sc.oy}" aria-label="Deslocar grade na vertical"></label></div>
      <div class="row chips">Clima: <span class="${sc.wx ? '' : 'weak'}" data-a="weather" data-k="">Limpo</span>${Object.entries(RULES.CLIMA).map(([k, v]) => `<span class="${sc.wx === k ? 'weak' : ''}" data-a="weather" data-k="${k}">${v[0]}</span>`).join('')}</div>
      <div class="row chips">Fundo da batalha: <span class="${sc.bbg ? '' : 'weak'}" data-a="map" data-f="bbg" data-v="" title="Usa a imagem do mapa desta cena">Mapa da cena</span>${chips(BBG, (k, l) => `<span class="${sc.bbg === k ? 'weak' : ''}" data-a="map" data-f="bbg" data-v="${k}">${l}</span>`)}</div>
      <div class="row"><input aria-label="Imagem própria para o fundo da batalha" data-map="bbg" placeholder="Ou cole o link de uma imagem" value="${esc(sc.bbg && !BBG[sc.bbg] ? sc.bbg : '')}"><label class="up">Enviar fundo<input type="file" accept="image/*" data-up="bbg"></label></div>
      <div class="row"><button data-a="camFix" title="Todos passam a ver o mapa com o seu zoom e posição atuais">Fixar minha vista para todos</button>${sc.cam ? '<button data-a="camFree" class="own">Liberar vista</button>' : ''}</div>

      <div class="row"><button data-a="map" data-f="fogOn" data-v="${sc.fogOn ? '' : 1}" ${on(sc.fogOn)}>Névoa</button>${sc.fogOn ? `<button data-a="fogMode" ${on(fogMode)}>Pincel de névoa</button><small>Arraste para revelar; Shift esconde.</small>` : ''}</div>
      <textarea aria-label="Notas secretas da cena" data-map="note" placeholder="Notas secretas desta cena">${esc(sc.note)}</textarea>`;
    const fw = Object.keys(wins).filter(k => k.startsWith('f_') && wins[k].open && ent(k.slice(2))), ALL = { ...WIN, ...Object.fromEntries(fw.map(k => [k, [ent(k.slice(2)).name + (S.chars[k.slice(2)] ? '' : ' · modelo do bestiário'), 1080]])) };
    const rank = Object.keys(ALL).sort((x, y) => (wins[x].z || 0) - (wins[y].z || 0));
    const lays = chips(LAYD, k => `<button class="lay" data-a="lay" data-k="${k}" title="Clique: aplicar arranjo · Shift+clique: salvar o arranjo atual">${k}</button>`);
    const body = { ...Object.fromEntries(fw.map(k => [k, gmSheet(ent(k.slice(2)))])), sessao: wins.sessao.open ? sessWin() : '', best: wins.best.open ? bestWin() : '', ini: wins.ini.open ? iniWin() : '', chase: wins.chase.open ? chaseWin() : '', cena, batalha: b ? battle() : '<small>Nenhuma batalha em andamento.</small>', fichas: wins.fichas.open ? fichasWin() : '', chat: log, skills: wins.skills.open ? editor('skills') : '', items: wins.items.open ? editor('items') : '' };
    app.innerHTML = `<main>${map()}</main>${chips(ALL, (id, [title, w]) => wins[id].open ? `<section class="win" data-win="${id}" style="left:${wins[id].x}px;top:${wins[id].y}px;width:${id === 'batalha' ? Math.max(640, innerWidth - 780) : Math.min(w, innerWidth - 24)}px;z-index:${20 + rank.indexOf(id)}"><header data-drag="${id}"><span>${esc(title)}</span><button data-a="winX" data-id="${id}" aria-label="Fechar ${esc(title)}">×</button></header><div class="win-body">${body[id]}</div></section>` : '')}
      ${reqStrip()}${cropper()}<nav class="dock">${chips(WIN, (id, [title]) => `<button data-a="winT" data-id="${id}" ${on(wins[id].open)}>${title}</button>`)}<i></i>${lays}</nav>${ctxMenu()}`;
  } else if (role === 'player') {
    const my = chars.filter(mine), c = my.find(x => x.id === selCh) || my[0], cur = b ? S.chars[timeline(1)[0]] : null, inB = b ? my.filter(x => x.id in S.battle.ticks) : [], actor = inB.includes(cur) ? cur : inB.includes(c) ? c : inB[0];
    if (b && !wasBattle) pg = 'mesa'; // a batalha começou: leva o jogador para a mesa
    wasBattle = b;
    const page = !c ? `<section class="card"><h3>Bem-vindo, ${esc(name)}</h3><p>Você entrou na campanha. O mestre ainda não ligou um personagem à sua conta: assim que ele fizer isso, a ficha aparece aqui sozinha.</p></section>`
      : pg === 'pers' ? persPage(c) : pg === 'hab' ? skillPage(c) : pg === 'itens' ? itemsPage(c)
      : pg === 'hist' ? `<section class="card hist"><h3>Diário de ${esc(c.name)}</h3><textarea aria-label="Diário" data-id="${c.id}" data-f="bio" placeholder="História, aparência, objetivos, anotações da campanha…">${esc(c.bio)}</textarea></section>`
      : chaseBar() + (actor ? battle() + command(actor, cur) : b ? battle() + '<p class="card none">Seu personagem não está nesta batalha.</p>' : map() + mesaTools(c));
    const unread = chatOpen ? 0 : S.log.filter(l => l.n > chatSeen).length, pgIn = lastPg !== pg + (c?.id || '') ? 'enter' : '';
    if (chatOpen) chatSeen = S.seq;
    lastPg = pg + (c?.id || '');
    app.innerHTML = `<header class="top"><div class="who">${my.map(x => `<button class="chb ${x === c ? 'on' : ''}" data-sel="${x.id}" style="--c:${esc(x.color)}" aria-pressed="${x === c}"><b>${esc(x.name)}</b><i class="mhp"><i style="width:${Math.max(0, Math.min(100, 100 * x.hp / (x.hpMax || 1)))}%"></i></i><small>${x.hp}/${x.hpMax} HP</small></button>`).join('')}</div>
      <nav class="tnav" aria-label="Páginas">${chips(PAGES, (k, l) => `<button data-pg="${k}" class="${pg === k ? 'on' : ''} ${k === 'mesa' && b ? 'alert' : ''}" ${pg === k ? 'aria-current="page"' : ''}>${ico(k)}<span>${k === 'mesa' && b ? 'Batalha' : l}</span></button>`)}<button class="tchat ${chatOpen ? 'on' : ''}" data-a="chatT" aria-pressed="${chatOpen}">${ico('chat')}<span>Chat</span>${unread ? `<i class="bdg">${unread > 9 ? '9+' : unread}</i>` : ''}</button></nav>
      <div class="me"><button class="ghost" data-a="meT" aria-expanded="${meOpen}">${esc(name)}</button>${meOpen ? '<div class="pop"><button data-a="myPass">Trocar senha</button><button data-a="logout">Sair</button></div>' : ''}</div></header>
      ${ctl ? `<div class="peek ctl">Você está <b>jogando por ${esc(asWho)}</b>: o que fizer aqui acontece na hora, sem passar pela fila de pedidos.</div>` : asWho ? `<div class="peek">Você está vendo a tela de <b>${esc(asWho)}</b>. Só para olhar: nada do que clicar aqui acontece.</div>` : ''}
      <div class="pl ${chatOpen ? '' : 'nochat'} pg-${pg}"><main class="${pgIn}">${page}</main><aside class="chatcol ${chatOpen ? '' : 'shut'}"><div class="panel"><header><b>Chat e histórico</b><button class="ghost" data-a="chatT" aria-label="Fechar chat">Fechar</button></header>${log}</div></aside></div>${pg === 'mesa' && actor ? '' : reqBar()}${rollSheet()}${ctxMenu()}`;
    lastReq = (myReq() || [])[0] || null;
  } else app.innerHTML = `<main>${chaseBar()}${b ? battle() : map() + party()}</main>`;
  if (gridFull && S.chars[gridFull]) app.insertAdjacentHTML('beforeend', `<div class="modal"><header><b>Habilidades · ${esc(S.chars[gridFull].name)}</b><button data-a="gridFull" data-id="">Fechar</button></header>${skillPage(S.chars[gridFull])}</div>`);
  { const skm = app.querySelector(".skmap"); // a grade abre já aproximada na árvore do personagem, não no mapa inteiro
    if (skm && gvFor !== skm.dataset.cid) { gvFor = skm.dataset.cid; Object.assign(gv, { z: 1, x: 0, y: 0 }); applyGv(); const o = skm.querySelector(".nd.own");
      if (o) { const q = o.getBoundingClientRect(), m = skm.getBoundingClientRect(), z = 4; Object.assign(gv, { z, x: m.width / 2 - (q.left + q.width / 2 - m.left) * z, y: m.height / 2 - (q.top + q.height / 2 - m.top) * z }); applyGv(); } } }
  if (editFocus) { editFocus = false; const el = app.querySelector('.edin'); if (el) { el.focus(); el.select(); } }
  if (keep) { const el = app.querySelector(keep.sel); if (el) { el._dirty = el.value !== keep.v; el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch {} } }
  app.querySelectorAll('.win-body,.chatcol,.skside,.pl>main,.fbody').forEach((el, i) => el.scrollTop = scr[i] || 0);
  { const sc2 = S.scenes[S.scene]; if (sc2.cam && sc2.cam.n !== lastCam) { const w = mapEl()?.offsetWidth; if (w) { lastCam = sc2.cam.n; Object.assign(view, { z: sc2.cam.z, x: sc2.cam.fx * w, y: sc2.cam.fy * w }); applyView(); } } } // vista fixada pelo mestre
  app.querySelectorAll('span[data-a],span[data-edit],[data-tab],[data-node],.unit[data-tgt],span[data-tgt],[data-aim],[data-cz],.hud,.scard').forEach(el => { el.tabIndex = 0; el.setAttribute('role', 'button'); if (el.title) el.setAttribute('aria-label', el.title); });
  fx();
}

// efeitos: barras que escoam, investida do atacante, impacto no alvo, faixa da skill, dados, legenda e vitória
const lastPct = new Map(), DICE_MS = 950;
let cine = null; // cena em foco: quem age e quem é alvo ficam em destaque e o palco aproxima neles
function applyCine(fresh) {
  const st = app.querySelector('.stage'), fld = st?.querySelector('.field');
  if (!fld) return;
  if (!cine || performance.now() > cine.until) { cine = null; st.classList.remove('cine'); fld.style.transform = ''; return; }
  const us = cine.ids.map(id => st.querySelector(`.unit[data-tgt="${id}"]`)).filter(Boolean);
  if (!us.length) return;
  us.forEach(u => u.classList.add('inv'));
  const x0 = Math.min(...us.map(u => u.offsetLeft)), x1 = Math.max(...us.map(u => u.offsetLeft + u.offsetWidth)), y0 = Math.min(...us.map(u => u.offsetTop)), y1 = Math.max(...us.map(u => u.offsetTop + u.offsetHeight));
  const z = Math.max(1, Math.min(1.55, fld.offsetWidth / ((x1 - x0) * 1.35), st.offsetHeight / ((y1 - y0) * 1.3))), cx = fld.offsetLeft + fld.offsetWidth / 2, cy = st.offsetHeight / 2;
  fld.style.transition = fresh ? '' : 'none'; st.classList.add('cine');
  fld.style.transform = `translate(${(cx - (x0 + x1) / 2) * z}px,${(cy - (y0 + y1) / 2) * z}px) scale(${z})`;
  if (!fresh) { fld.offsetWidth; fld.style.transition = ''; }
}
function dicePanel(e, n) { // dados 3D dentro de um painel com o que era preciso tirar e o veredito
  document.querySelector('.rollfx')?.remove();
  const rf = document.createElement('div'), ok = e.kind === 'ok', atk = e.rr.atk;
  rf.className = `rollfx ${ok ? 'ok' : 'bad'} ${/CRÍTICO|DESASTRE/.test(e.rr.res) ? 'big' : ''} ${atk ? 'atk' : ''}`; rf.style.setProperty('--c', S.chars[e.rr.c]?.color || '#fff'); rf.setAttribute('role', 'status');
  rf.innerHTML = `<small>${esc(e.who)}${e.to ? ' · rolagem secreta' : ''}</small><span>${esc(e.rr.l)} · precisa de <u>${e.rr.t}</u> ou menos${n > 1 ? ` · ${n} alvos` : ''}</span><div class="dice"></div><div class="res"><b>${e.d}</b><em>${esc(e.rr.res)}</em></div>`;
  document.body.append(rf); import('/dice.js').then(m => m.roll(e.d, rf.querySelector('.dice'))).catch(() => {});
  setTimeout(() => rf.remove(), atk ? 2700 : 3400);
}
function impact(acts) { // reação à ação: faixa com o nome, foco em quem age e nos alvos, golpe, número e carimbo
  const stage = app.querySelector('.stage'), f0 = acts[0].fx, a = S.chars[f0.a];
  if (f0.s && stage) { document.querySelector('.callout')?.remove();
    const co = document.createElement('div'); co.className = 'callout'; co.style.setProperty('--fx', ELC[f0.el] || '#e4002b');
    co.innerHTML = `<div><small>${esc(a?.name || '')}</small><b>${esc(f0.s)}</b></div>`; document.body.append(co); setTimeout(() => co.remove(), 1900); }
  if (stage) { cine = { ids: [...new Set([f0.a, ...acts.map(e => e.fx.id)].filter(Boolean))], until: performance.now() + 2100 }; applyCine(true); setTimeout(() => applyCine(true), 2150); }
  const au = f0.a && app.querySelector(`.unit[data-tgt="${f0.a}"]`);
  if (au) { au.style.setProperty('--fx', ELC[f0.el] || '#fff'); au.classList.add(f0.el && f0.el !== 'fis' || f0.heal ? 'cast' : 'lunge'); }
  if (acts.some(e => e.fx.crit) && stage) stage.classList.add('shake');
  acts.forEach((e, i) => setTimeout(() => { const f = e.fx, el = app.querySelector(`.unit[data-tgt="${f.id}"]`) || app.querySelector(`.tok[data-id="${f.id}"]`);
    if (!el) return;
    const add = (cls, txt = '') => { const s = document.createElement('span'); s.className = cls; s.textContent = txt; el.append(s); return s; };
    el.style.setProperty('--fx', ELC[f.el] || '#fff');
    if (f.dmg) { el.classList.add('hit'); add('slash'); } else if (f.heal) add('mend'); else if (f.miss) el.classList.add('dodge');
    add('float ' + (f.heal ? 'heal' : f.miss ? 'miss' : f.crit ? 'crit' : ''), f.heal ? '+' + f.heal : f.miss ? 'ERROU' : '−' + f.dmg);
    if (f.w) add('stamp weak', 'Fraqueza!'); else if (f.crit) add('stamp', 'Crítico!');
  }, 260 + i * 140));
}
function fx() {
  const wait = seen != null && S.log.some(e => e.n > seen && e.d && e.fx) ? DICE_MS + 150 : 0;
  app.querySelectorAll('[data-bid]').forEach(el => { // anima a barra do valor anterior até o novo (depois do dado, quando há rolagem)
    const k = el.dataset.bid, p = el.dataset.p, old = lastPct.get(k);
    if (old != null && old !== p) { el.style.transition = 'none'; el.style.width = old + '%'; el.offsetWidth; el.style.transition = ''; el.style.transitionDelay = wait + 'ms'; el.style.width = p + '%'; }
    lastPct.set(k, p);
  });
  const news = seen == null ? [] : S.log.filter(e => e.n > seen), cur = S.battle.active ? S.chars[timeline(1)[0]] : null;
  seen = S.seq;
  applyCine(false); // um redesenho no meio da cena mantém o enquadramento
  const rolls = news.filter(e => e.rr), acts = news.filter(e => e.fx).slice(-8);
  if (rolls.length) dicePanel(rolls.at(-1), rolls.filter(e => e.rr.atk).length);
  if (acts.length) setTimeout(() => impact(acts), acts.some(e => e.d) ? DICE_MS : 0); // o golpe só acontece depois que o dado para
  const plain = news.filter(e => !e.fx).at(-1), win = news.find(e => /^Vitória!/.test(e.text));
  if (role === 'table' && plain && !win) { // legenda discreta para o que não é golpe
    document.querySelector('.caption')?.remove(); clearTimeout(capT);
    const cp = document.createElement('div'); cp.className = 'caption'; cp.innerHTML = `<b>${esc(plain.who)}</b>${esc(plain.text)}`; document.body.append(cp); capT = setTimeout(() => cp.remove(), 6000);
  }
  if (win) { const v = document.createElement('div'); v.className = 'victory'; v.innerHTML = `<b>Vitória</b><span>${esc(win.text.replace(/^Vitória!\s*/, ''))}</span>`; document.body.append(v); setTimeout(() => v.remove(), 6500); }
  if (cur && cur.id !== lastCur && lastCur !== undefined) { const bn = document.createElement('div'); bn.className = 'banner'; const mineT = role === 'player' && mine(cur); bn.textContent = mineT ? 'Seu turno' : 'Turno de ' + cur.name; if (mineT) { bn.classList.add('me'); navigator.vibrate?.([60, 40, 60]); } bn.style.setProperty('--c', cur.enemy ? '#e4002b' : cur.color); document.body.append(bn); setTimeout(() => bn.remove(), 1200); }
  lastCur = cur?.id ?? null;
}

app.addEventListener('change', e => {
  const el = e.target, d = el.dataset, v = el.type === 'number' || el.type === 'range' ? +el.value : el.type === 'checkbox' ? el.checked : el.value;
  if (el.tagName === 'SELECT' || el.type === 'file') el.blur();
  if (d.a === 'passSel') { passTo = v; return; }
  if (d.a === 'campWith') { campWith[d.id] = v; if (S.camp.acts[d.id] === 'conversar') send({ t: 'campAct', id: d.id, k: 'conversar', w: v }); return render(); }
  if (d.up) {
    const f = el.files[0];
    if (f) fetch('/upload', { method: 'POST', headers: { 'Content-Type': f.type }, body: f }).then(r => r.ok ? r.text() : Promise.reject())
      .then(u => d.up === 'bg' ? setBg(u) : d.up === 'bbg' ? send({ t: 'map', f: 'bbg', v: u }) : send({ t: 'set', id: d.id, f: 'img', v: u })).catch(() => alert('Falha no upload (PNG/JPG/WEBP/GIF até 5 MB).'));
  } else if (d.ed) send({ t: 'edSet', coll: d.ed, id: d.id, f: d.f, v });
  else if (d.ini) send({ t: 'ini', k: 'set', id: d.ini, v });
  else if (d.f) send({ t: 'set', id: d.id, f: d.f, v });
  else if (d.map === 'bg') setBg(v);
  else if (d.map) send({ t: 'map', f: d.map, v });
  else if (d.mid) mods[d.mid] = v;
  else if (d.sess) sess[d.sess] = v;
  else if (d.qa) qa[d.qa] = v;
});
app.addEventListener('input', e => { const ds = e.target.dataset; if (ds.sess) sess[ds.sess] = e.target.value; if (ds.qa) qa[ds.qa] = e.target.type === 'number' ? +e.target.value : e.target.value; const k = ds.bf; if (!k) return; bf[k] = e.target.value; if (k === 'q' || k === 'giveq' || k === 'skq') render(); }); // filtros e buscas
app.addEventListener('keydown', e => { const el = e.target; if (!el.dataset?.edin) return; if (e.key === 'Enter') { e.preventDefault(); el.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); el.value = ''; el.blur(); } }, true);
app.addEventListener('keydown', e => { // elementos clicáveis que não são <button> também respondem ao teclado
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('span[data-a],[data-tab],[data-node],[data-tgt],[data-open],[data-aim]')) { e.preventDefault(); e.target.click(); }
});
const sayChat = el => { if (el?.value.trim()) { send({ t: 'chat', text: el.value, secret }); el.value = ''; } };
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.chat) sayChat(e.target); });
app.addEventListener('focusout', e => {
  if (e.target.dataset?.edin && editing) return commitEd(e.target);
  // campo restaurado após redesenho não dispara "change" sozinho: dispara aqui para não perder a edição
  if (e.target._dirty) { e.target._dirty = false; e.target.dispatchEvent(new Event('change', { bubbles: true })); }
  setTimeout(() => pending && render());
});
app.addEventListener('click', e => {
  if (ctx) { ctx = null; setTimeout(render); }
  if (e.target.closest('.edin')) return;
  const edt = e.target.closest('[data-edit]');
  if (edt && gm) { editing = { id: edt.dataset.id, f: edt.dataset.edit }; editFocus = true; return render(); }
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
  if (sb) { sub = sb.dataset.sub || null; if (sub !== 'sk' && sub !== 'it') pick = { k: 'atk', id: 'atk' }; return render(); }
  if (pvb) { pv = pvb.dataset.pv; return render(); }
  const ftb = e.target.closest('[data-ftab]');
  if (ftb) { ftab[ftb.dataset.id] = ftb.dataset.ftab; return render(); }
  if (skMoved) { skMoved = false; return; } // foi um arrasto na grade, não um clique
  const pgb = e.target.closest('[data-pg]'), sl = e.target.closest('[data-sel]');
  if (pgb) { pg = pgb.dataset.pg; if (innerWidth < 1000) chatOpen = false; scrollTo(0, 0); return render(); }
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
  if (d.a === 'skReset') { gvFor = null; return render(); }
  if (d.a === 'skAll') { Object.assign(gv, { z: 1, x: 0, y: 0 }); return render(); }
  if (d.a === 'chatT') { chatOpen = !chatOpen; return render(); }
  if (d.a === 'chatSend') return sayChat(e.target.closest('.chatin').querySelector('input'));
  if (d.a === 'meT') { meOpen = !meOpen; return render(); }
  if (d.a === 'itab') { itab = d.k; return render(); }
  if (d.a === 'aimT') { aimOpen = !aimOpen; return render(); }
  if (d.a === 'pick') { pick = { k: d.k, id: d.v }; return render(); }
  if (d.a === 'braveT') { braveOn = !braveOn; return render(); }
  if (d.a === 'go') { if (pick.k === 'sk' && selfSk(S.skills[pick.id])) tgt = d.id; if (!(tgt in S.battle.ticks)) return toast('Escolha um alvo primeiro.'); send(pick.k === 'it' ? { t: 'use', id: d.id, item: pick.id, target: tgt } : { t: 'act', id: d.id, skill: pick.id, target: tgt, aim, brave: braveOn, pass: passTo }); aim = null; aimOpen = false; braveOn = false; passTo = ''; return; }
  if (d.a === 'rollAsk') { rollDlg = { id: d.id, attr: d.attr }; return render(); }
  if (d.a === 'rollX') { rollDlg = null; return render(); }
  if (d.a === 'rollMod') { mods[rollDlg.id] = +d.v; return render(); }
  if (d.a === 'rollGo') { send({ t: 'roll', id: rollDlg.id, attr: rollDlg.attr, mod: mods[rollDlg.id] || 0 }); mods[rollDlg.id] = 0; rollDlg = null; return render(); }
  if (d.a === 'reqNo') return send({ t: 'reqNo', id: d.id });
  if (d.a === 'rqMod') { reqUi[d.id].mod = +d.v; return render(); }
  if (d.a === 'rqAdv') { const u = reqUi[d.id]; u.adv = u.adv === d.v ? '' : d.v; return render(); }
  if (d.a === 'rqSecret') { reqUi[d.id].secret = !reqUi[d.id].secret; return render(); }
  if (d.a === 'rqOk') return send({ t: 'reqOk', id: d.id, ...reqUi[d.id] });
  if (d.a === 'rqNo') return send({ t: 'reqNo', id: d.id });
  if (d.a === 'rqWhy') { const why = prompt('Motivo (o jogador vê esta frase):'); return why === null ? null : send({ t: 'reqNo', id: d.id, why }); }
  if (d.a === 'mute') { mute = !mute; ls('vj_mute', mute ? '1' : null); if (!mute) beep(); return render(); }
  if (d.a === 'selCard') { if (selC.has(d.id)) selC.delete(d.id); else selC.add(d.id); return render(); }
  if (d.a === 'selAll') { selC.clear(); if (d.k) Object.values(S.chars).filter(c => !!c.enemy === (d.k === 'e')).forEach(c => selC.add(c.id)); return render(); }
  if (d.a === 'bulk') return send({ t: 'bulk', ids: [...selC], k: d.k, v: qa.v, st: qa.st, item: qa.item || Object.entries(S.items).sort((a, b) => a[1].name.localeCompare(b[1].name))[0]?.[0] });
  if (d.a === 'peek') return void window.open(`/player?as=${encodeURIComponent(d.k)}${d.v ? '&ctl=1' : ''}`, '_blank', 'noopener');
  if (d.a === 'skOnly') { skOnly = !skOnly; return render(); }
  if (d.a === 'skZoom') { const m = app.querySelector('.skmap').getBoundingClientRect(); zoomGv(m.width / 2, m.height / 2, gv.z * +d.v); return; }
  if (d.a === 'gridFull') { gridFull = d.id || null; return render(); }
  if (d.a === 'chaseStart') return send({ t: 'chase', k: 'start', ...cz });
  if (d.a === 'genSet') { gen[d.k] = d.v; return render(); }
  if (d.a === 'foeGen') return send({ t: 'foeGen', ...gen, n: gen.rank === 'chefe' ? 1 : +bf.n || 1, save: !!d.save });
  if (d.a === 'foeEnc') return send({ t: 'foeEnc', el: gen.el, diff: d.diff });
  if (d.a === 'bfSet') { bf[d.k] = bf[d.k] === d.v ? '' : d.v; return render(); }
  if (d.a === 'encAdd') { const e = encDraft.find(x => x.b === d.id && x.tier === tier); if (e) e.n = Math.min(12, e.n + (+bf.n || 1)); else encDraft.push({ b: d.id, tier, n: +bf.n || 1 }); return render(); }
  if (d.a === 'encRm') { encDraft.splice(+d.k, 1); return render(); }
  if (d.a === 'encSave') { send({ t: 'encSave', name: bf.enc || 'Encontro', list: encDraft }); encDraft = []; bf.enc = ''; return; }
  if (d.a === 'bContract') { const b = S.bestiary[d.id], gold = prompt(`Recompensa em ouro por caçar ${b.name}?`, b.goldR * 5); return gold === null ? null : send({ t: 'ctAdd', id: d.id, gold: +gold || 0, xp: b.xpR }); }
  if (d.a === 'bDel' && !confirm('Apagar este modelo do bestiário?')) return;
  if (d.a === 'ctMode') { ctMode = !ctMode; return render(); }
  if (d.a === 'tier') { tier = { fraco: 'normal', normal: 'elite', elite: 'fraco' }[tier]; return render(); }
  if (d.a === 'content' && d.coll !== 'scenes' && !confirm('Restaurar o conteúdo padrão? Edições nessa coleção serão perdidas' + (d.coll === 'bestiary' ? '.' : ' e os personagens perdem o que tinham dela.'))) return;
  if (d.a === 'logout') { ls('vj_pass', null); return location.reload(); }
  if (d.a === 'myPass') { const p = prompt('Senha nova (pelo menos 4 caracteres):'); if (!p) return; if (prompt('Digite a senha nova de novo:') !== p) return alert('As duas senhas não batem.'); return send({ t: 'userPass', pass: p }); }
  if (d.a === 'userAdd') { const n = sess.n.trim(), p = sess.p || genPass(); if (!n) return alert('Escreva o login.'); send({ t: 'userAdd', name: n, pass: p, char: sess.ch }); sess.last = { n, p }; sess.n = ''; sess.p = ''; sess.ch = ''; return render(); }
  if (d.a === 'userPass') { const p = prompt(`Senha nova para ${d.k}:`, genPass()); if (!p) return; send({ t: 'userPass', name: d.k, pass: p }); sess.last = { n: d.k, p }; return render(); }
  if (d.a === 'userDel') { if (confirm(`Apagar a conta ${d.k}? Os personagens dela ficam sem dono.`)) send({ t: 'userDel', name: d.k }); return; }
  if (d.a === 'giveChar') { const id = prompt('Qual personagem? Digite o número:\n' + heroes().map((c, i) => `${i + 1}. ${c.name}${c.owner ? ' (de ' + c.owner + ')' : ''}`).join('\n')); const c = heroes()[+id - 1]; if (c) send({ t: 'set', id: c.id, f: 'owner', v: d.k }); return; }
  if (d.a === 'freeChar') return send({ t: 'set', id: d.id, f: 'owner', v: '' });
  if (d.a === 'copy') return copy(d.k === 'invite' ? inviteText() : accessText(sess.last), d.k === 'invite' ? 'Convite copiado. Cole no grupo dos jogadores.' : 'Acesso copiado. Mande só para esse jogador.');
  if (d.a === 'act' && !(tgt in S.battle.ticks)) return toast('Escolha um alvo clicando em uma unidade.');
  if ((d.a === 'delChar' || d.a === 'sceneDel') && !confirm('Excluir?')) return;
  const m = { t: d.a, id: d.id, attr: d.attr, per: d.per, mod: mods[d.id] || 0, secret, enemy: !!d.enemy, on: !!d.on, win: !!d.win, long: !!d.long, skill: d.skill, el: d.el, target: tgt, aim, tier, n: +bf.n || 1, item: d.item, coll: d.coll, k: d.k, w: d.w, f: d.f, v: d.v };
  if (d.a === 'bSpawn' && e.shiftKey) m.t = 'bDel';
  if (d.a === 'addChar' && gm && !d.enemy) { const o = prompt(`Login do jogador dono? (deixe vazio para escolher depois na janela Sessão)${S.accounts.length ? '\nContas: ' + S.accounts.join(', ') : ''}`); if (o === null) return; m.owner = o.trim(); }
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
// zoom da grade em torno de um ponto (px, py) da própria área; usado pela roda, pelos botões e pela pinça
const zoomGv = (px, py, z0) => { const z = Math.min(8, Math.max(1, z0)); gv.x = px - (px - gv.x) * z / gv.z; gv.y = py - (py - gv.y) * z / gv.z; gv.z = z; if (z === 1) gv.x = gv.y = 0; applyGv(); };
app.addEventListener('wheel', e => {
  const m = e.target.closest?.('.skmap');
  if (!m) return;
  e.preventDefault();
  const r = m.getBoundingClientRect(); zoomGv(e.clientX - r.left, e.clientY - r.top, gv.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
}, { passive: false });
// toque: um dedo move, dois dedos dão zoom, na grade de habilidades e no mapa
const pts = new Map(); let pinch = null, tpan = null;
app.addEventListener('pointerdown', e => {
  const zone = e.target.closest('.skmap,.mapwrap');
  if (e.pointerType !== 'touch' || !zone) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const sk = zone.classList.contains('skmap'), o = sk ? gv : view;
  if (pts.size === 2) { const [a, b] = [...pts.values()], r = (sk ? zone : mapEl().parentElement).getBoundingClientRect(); pinch = { sk, d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: o.z, x: o.x, y: o.y, px: (a.x + b.x) / 2 - r.left, py: (a.y + b.y) / 2 - r.top }; skd = null; tpan = null; drag = null; }
  else if (!sk && !e.target.closest('.tok.mine') && !fogMode) tpan = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
});
app.addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId)) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], k = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d; skMoved = true;
    if (pinch.sk) { Object.assign(gv, { z: pinch.z, x: pinch.x, y: pinch.y }); zoomGv(pinch.px, pinch.py, pinch.z * k); }
    else { const z = Math.min(4, Math.max(.4, pinch.z * k)); Object.assign(view, { z, x: pinch.px - (pinch.px - pinch.x) * z / pinch.z, y: pinch.py - (pinch.py - pinch.y) * z / pinch.z }); applyView(); } }
  else if (tpan) { view.x = tpan.vx + e.clientX - tpan.sx; view.y = tpan.vy + e.clientY - tpan.sy; applyView(); }
});
const tEnd = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) tpan = null; };
addEventListener('pointerup', tEnd); addEventListener('pointercancel', tEnd);
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
    else if (rollDlg) rollDlg = null; else if (meOpen) meOpen = false; else if (gridFull) gridFull = null; else if (ctx) ctx = null; else if (aim) aim = null;
    else if (gm) { const top = Object.keys(wins).filter(k => wins[k].open).sort((x, y) => (wins[y].z || 0) - (wins[x].z || 0))[0]; if (top) { wins[top].open = false; localStorage.vj_wins = JSON.stringify(wins); } }
    return render();
  }
  if (e.target.matches('input,textarea,select')) return;
  if (gm && (e.key === 'Enter' || e.key === 'Delete')) { const first = Object.entries(S.reqs).sort((a, b) => a[1].n - b[1].n)[0]; if (first) { e.preventDefault(); return send(e.key === 'Enter' ? { t: 'reqOk', id: first[0], ...reqUi[first[0]] } : { t: 'reqNo', id: first[0] }); } }
  if (e.key === 'Enter') { const c = app.querySelector('.chat'); if (c) { e.preventDefault(); c.focus(); } return; }
  if (e.key === '0') { Object.assign(view, { z: 1, x: 0, y: 0 }); return applyView(); }
  if (!S.battle.active) return;
  if (e.key === 'Tab') { // percorre os alvos vivos
    const ids = Object.values(S.chars).filter(c => c.id in S.battle.ticks && c.hp > 0).sort((x, y) => y.enemy - x.enemy).map(c => c.id);
    e.preventDefault(); tgt = ids[(ids.indexOf(tgt) + (e.shiftKey ? ids.length - 1 : 1)) % ids.length]; aim = null; return render();
  }
  if (e.key >= '1' && e.key <= '9') app.querySelectorAll(gm ? '.battle .row button' : '.cmd .alist button')[e.key - 1]?.click();
});
document.addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
let rsT; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => S && render(), 150); });
if (gm || asWho ? key : name && pass) connect(); else loginForm();

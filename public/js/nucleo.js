const role = document.body.dataset.role, app = document.getElementById('app'), gm = role === 'gm';
const A = ['FOR', 'CON', 'DES', 'AGI', 'INT', 'SAB', 'CAR', 'SOR'], AO = Object.fromEntries(A.map(a => [a, a]));
const L = { hp: 'HP', aura: 'Aura', san: 'Sanidade', limit: 'Limite' };
const EL = { fis: 'Físico', kagutsuchi: 'Kagutsuchi·Fogo', susanoo: 'Susanoo·Água', atlas: 'Atlas·Terra', indra: 'Indra·Raio', fuhaku: 'Fuhaku·Vento', amaterasu: 'Amaterasu·Luz', tsukuyomi: 'Tsukuyomi·Escuridão', shukketsu: 'Shukketsu·Sangue', hiruko: 'Hiruko·Radiação', aura: 'Aura', oculto: 'Ocultismo' };
const ELC = { fis: '#ffffff', kagutsuchi: '#ff5a1f', susanoo: '#2e8bff', atlas: '#b9853c', indra: '#ffe600', fuhaku: '#7dffb0', amaterasu: '#fff3a0', tsukuyomi: '#8a4dff', shukketsu: '#c10020', hiruko: '#9dff00', aura: '#40e0d0', oculto: '#ff2bd6' };
const KIND = { dmg: 'Dano', mental: 'Dano mental', heal: 'Cura', passive: 'Passiva', form: 'Transformação', util: 'Suporte' }, PASL = { hpMax: 'HP máx', auraMax: 'Aura máx', sanMax: 'Sanidade máx', res: 'Resistência', ...AO }, RES = { aura: 'Aura', san: 'Sanidade' };
const ST = RULES.ST, STD = RULES.STD; // nomes das condições vêm das regras compartilhadas com o servidor
const IT = { cons: 'Consumível', arma: 'Arma', armadura: 'Armadura', acess: 'Acessório', mat: 'Material', mun: 'Munição' }, WT = { '': '—', ...Object.fromEntries(Object.entries(ARMAS.TIPOS).map(([k, t]) => [k, t.n])) }, CATN = Object.fromEntries(Object.entries(ARMAS.CATS).map(([k, c]) => [k, c[0]]));
const EFF = { hp: 'HP', aura: 'Aura', san: 'Sanidade', cure: 'Cura condições', body: 'Trata ferimentos', rev: 'Reanima caído', bomb: 'Bomba' };
const idesc = i => i.type === 'mun' ? `${i.for === 'arco' ? 'Flechas' : 'Balas'} · ${i.shots} disparos${i.el ? ' · ' + EL[i.el] : ''}${i.st ? ` · ${i.stc < 100 ? i.stc + '% de ' : ''}${ST[i.st]}` : ''}${i.pierce ? ` · ignora ${i.pierce}% da armadura` : ''}${i.salt ? ' · purifica' : ''}` : i.type === 'cons' ? (['hp', 'aura', 'san'].includes(i.eff) ? `+${i.power} ${EFF[i.eff]}` : EFF[i.eff] + (i.eff === 'bomb' ? ` ${i.power} ${EL[i.el] || EL.fis}` : i.power ? ' ' + i.power : ''))
  : i.type === 'arma' ? `${WT[i.wt] || 'Arma'}${i.cat && i.cat !== 'basica' ? ' ' + (CATN[i.cat] || '').toLowerCase() : ''} · poder ${i.power}${i.el ? ' · ' + EL[i.el] : ''}` : i.type === 'acess' ? `${i.attr} +${i.power}${i.el ? ' · resiste ' + EL[i.el] : ''}` : i.type === 'mat' ? 'Material' + (i.el ? ' · ' + EL[i.el] : '') : `Armadura ${i.power}`;
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
const WIN = { sessao: ['Sessão', 440], best: ['Bestiário', 820], chase: ['Perseguição', 380], cena: ['Cena', 330], batalha: ['Batalha', 600], ini: ['Iniciativa', 300], fichas: ['Fichas', 400], chat: ['Chat', 340], skills: ['Skills', 1000], items: ['Itens e loja', 720], ofcat: ['Catálogo de ofícios', 780], armas: ['Forja de armas', 1120] };
const LAYD = { Exploração: ['cena', 'chat'], Batalha: ['batalha', 'ini', 'chat', 'fichas'], Preparo: ['cena', 'best', 'items'], Armas: ['armas'] }; // arranjos de janelas
const view = { z: 1, x: 0, y: 0 }; // zoom e deslocamento do mapa (local de cada tela)
let ctx = null, pan = null, ruler = null, spaceDown = false, zc = 1, pings = [];
const CAMPL = { vigiar: 'Vigiar (AGI↑)', cozinhar: 'Cozinhar (grupo ATQ↑)', conversar: 'Conversar (+5 Sanidade)', treinar: 'Treinar (+5 XP)', meditar: 'Meditar (+30 Limite)' };
const TABS = { st: 'Status', sk: 'Skills', inv: 'Itens', bio: 'História' };
const ED = {
  skills: [['Skill', 'name', 'text'], ['Tipo', 'kind', KIND], ['Elemento', 'el', EL], ['Atr.', 'attr', AO], ['Poder', 'power'], ['Perfuração (0-1)', 'pierce'], ['Custo', 'cost'], ['Recurso', 'res', RES], ['Status', 'st', { '': '—', ...ST }], ['Área', 'area', 'checkbox'], ['Animação', 'anim', { '': 'Automática', projectile: 'Projétil', beam: 'Feixe', slash: 'Corte', smash: 'Pancada', pierce: 'Perfuração', dash: 'Investida', area: 'Área', rain: 'Chuva', ritual: 'Ritual', summon: 'Invocação', psychic: 'Psíquica', musical: 'Musical', heal: 'Cura', barrier: 'Barreira', form: 'Transformação' }], ['Tempo%', 'ct'], ['Passiva', 'pas', PASL], ['Arma / categoria', 'req', { ...WT, ...ARMAS.CAT_N }], ['Item exigido (tag)', 'reqItem', 'text'], ['Sequela', 'back', { '': '—', ...ST }], ['XP', 'xp'], ['X', 'gx'], ['Y', 'gy'], ['Liga a (nomes com |)', 'lk'], ['Lim.', 'limit', 'checkbox']],
  items: [['Item', 'name', 'text'], ['Tipo', 'type', IT], ['Poder', 'power'], ['Efeito', 'eff', EFF], ['Atr. (acess.)', 'attr', AO], ['Tipo de arma', 'wt', WT], ['Kit (tags)', 'kit', 'text'], ['Elemento', 'el', { '': '—', ...EL }], ['Preço', 'price'], ['Perfuração (0-1)', 'pierce'], ['FOR mín.', 'reqFor']],
};
let aim = null, sub = null, pv = 'cena', wdrag = null, capT;
let wins = { sessao: { x: 360, y: 64, open: true }, best: { x: 360, y: 56, open: false }, chase: { x: 420, y: 200, open: false }, cena: { x: 16, y: 64, open: true }, batalha: { x: 360, y: 64, open: false }, ini: { x: 360, y: 420, open: false }, fichas: { x: Math.max(380, innerWidth - 420), y: 64, open: true }, chat: { x: 16, y: Math.max(300, innerHeight - 330), open: true }, skills: { x: 60, y: 110, open: false }, items: { x: 90, y: 140, open: false }, ofcat: { x: 120, y: 90, open: false }, armas: { x: 70, y: 60, open: false } };
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
const eq = (c, slot) => slot === 'arma' && c.st?.disarm ? undefined : S.items[c.equip[slot]];
const lvl = (c, k) => { const d = c.body[k] || 0; return d >= c.hpMax * .3 ? 2 : d >= c.hpMax * .15 ? 1 : 0; };
const at = (c, a) => c.attrs[a] + (eq(c, 'acess')?.attr === a ? eq(c, 'acess').power : 0) + (eq(c, 'arma')?.mod ? ARMAS.kv(eq(c, 'arma').mod).a[a] || 0 : 0) - 10 * PARTS.filter(k => BODY[k].includes(a) && lvl(c, k) === 2).length;
// técnicas da arma: 'w:<item>:<n>' (mesmo esquema do servidor)
const SK = id => { if (typeof id !== 'string' || !id.startsWith('w:')) return S.skills[id]; const [, k, n] = id.split(':'), s = S.items[k]?.sk?.[+n]; return s ? { ...s, wpn: k } : undefined; };
const wSk = c => { const k = c.equip?.arma, l = S.items[k]?.type === 'arma' && S.items[k].sk; return Array.isArray(l) ? l.map((_, n) => `w:${k}:${n}`) : []; };
// resumo de uma arma: traços do ataque básico e técnicas (cartões, ficha e menu de batalha)
const wpnLine = (i, c) => { const P = ARMAS.prof(i), base = i ? i.power : c?.arma ?? 8, falta = c && i ? ARMAS.short(i, a => at(c, a)) : [];
  return `${P.atkN || 'Ataque'} · poder ${base}${i?.el ? ' · ' + EL[i.el] : ''} · ${ARMAS.traits(i).join(' · ')}${falta.length ? ` · falta ${falta.map(([a, v]) => a + ' ' + v).join(', ')} (−20% de acerto)` : ''}`; };
const wpnInfo = (i, c) => i?.type !== 'arma' ? '' : `<div class="wpinfo"><small class="wtr">${esc(wpnLine(i, c))}</small>${(i.sk || []).map(s => `<small class="wsk" title="${esc(desc(s))}"><b>${esc(s.name)}</b> ${esc(KIND[s.kind])} · ${s.power ? 'poder ' + s.power + ' · ' : ''}${s.cost} ${RES[s.res]}${s.uses ? ` · ${s.uses}×/batalha` : ''}${s.d ? ' — ' + esc(s.d) : ''}</small>`).join('')}${i.d ? `<small class="wd">${esc(i.d)}</small>` : ''}</div>`;
// figura de corpo: mode 'aim' deixa mirar numa parte; 'gm' deixa o mestre ferir/curar a parte
function bodyFig(c, mode) {
  const hurt = PARTS.filter(k => lvl(c, k)).map(k => `${PL[k]}: ${LV[lvl(c, k)]}`);
  return `<div class="body"><svg viewBox="0 0 120 260" role="img" aria-label="Corpo de ${esc(c.name)}: ${hurt.join(', ') || 'ileso'}">${PARTS.map(k => `<${SHAPE[k][0]} ${SHAPE[k][1]} class="l${lvl(c, k)} ${mode === 'aim' && aim === k ? 'aim' : ''}" ${mode === 'aim' ? `data-aim="${k}"` : mode === 'gm' ? `data-a="part" data-id="${c.id}" data-k="${k}"` : ''}><title>${PL[k]} · ${LV[lvl(c, k)]}</title></${SHAPE[k][0]}>`).join('')}</svg><small>${hurt.join('<br>') || 'Ileso'}</small></div>`;
}
const aimBox = () => { const t = S.chars[tgt]; return t && t.id in S.battle.ticks ? `<div class="aimrow">${bodyFig(t, 'aim')}<div>Mira em <b>${esc(t.name)}</b>: <b>${aim ? `${PL[aim]} (−${AIMP[aim]}% de acerto)` : 'sem mira'}</b><br><small>Toque numa parte do corpo para mirar; parte crítica causa penalidade e status.</small></div></div>` : ''; };
const delay = c => Math.round(1000 / Math.max(1, at(c, 'AGI') * (c.st.agiUp ? 1.25 : 1) * (c.st.agiDn ? .75 : 1)));
const sanSt = c => { const p = c.san / (c.sanMax || 1); return p <= 0 ? 'Colapso: ataca aliados' : p <= .25 ? 'Surto −20' : p <= .5 ? 'Abalado −10' : ''; };
const stChips = c => [sanSt(c) && `<i title="Sanidade baixa pesa em todas as rolagens; em 0, o personagem ataca os aliados">${sanSt(c)}</i>`, c.afl && `<i title="${esc((c.afl.t === 'v' ? RULES.VIR : RULES.AFL)[c.afl.k][1])}">${c.afl.t === 'v' ? 'Virtude' : 'Aflição'}: ${(c.afl.t === 'v' ? RULES.VIR : RULES.AFL)[c.afl.k][0]}</i>`, ...Object.entries(c.st).map(([k, n]) => `<i title="${STD[k] || ''}">${k === 'shield' && c.shield ? ST[k] + ' ' + c.shield : (ST[k] || esc(k)) + (n < 90 ? ' ' + n : '')}</i>`)].filter(Boolean).join('');
const stList = c => [sanSt(c), ...Object.entries(c.st).map(([k, n]) => `${ST[k]} ${n}`)].filter(Boolean).join(' · ');
const pasTxt = s => s.pas === 'res' ? 'Resistência a ' + EL[s.el] : PASL[s.pas] && s.power ? '+' + s.power + ' ' + PASL[s.pas] : '';
const desc = s => [descBase(s), RULES.extra(s)].filter(Boolean).join(' · ');
const descBase = s => s.kind === 'passive' ? `Passiva${pasTxt(s) ? ' · ' + pasTxt(s) : ''}` : `${KIND[s.kind]}${s.area ? ' em área' : ''}${(s.ct || 100) !== 100 ? ` · tempo ${s.ct}%` : ''} · ${EL[s.el]} · ${s.attr} · poder ${s.power} · ${s.limit ? 'Limite 100%' : s.cost + ' ' + RES[s.res]}${s.st ? ' · causa ' + ST[s.st] : ''}${s.req ? ' · exige ' + ARMAS.reqName(s.req) : ''}${s.back ? ' · sequela: ' + ST[s.back] : ''}`;
const wtype = c => eq(c, 'arma')?.wt || 'punho', blocked = (c, s, k) => k && c.cant && k in c.cant ? !!c.cant[k] : c[s.res] < s.cost || (s.limit && c.limit < 100) || c.st.silence || c.st.fury || (s.req && !ARMAS.reqOk(s.req, wtype(c))) || (s.reqItem && !c.enemy && !c.summon && !RULES.hasKit(c, S.items, s.reqItem));
const selfSk = s => s && (s.tg === 'self' || s.kind === 'form'); // técnica que só mira o próprio usuário
const bgImg = u => u ? `background-image:url('${esc(u)}');` : '';
const chips = (obj, fn) => Object.entries(obj).map(([k, v]) => fn(k, v)).join('');

// ícones da navegação (traço simples, herdam a cor do texto)
const IC = { mesa: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>', pers: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/>', hab: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M11 7l-5 9M13 7l5 9M7 18h10"/>',
  itens: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/>', hist: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M9 9h6M9 13h6"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', ofi: '<path d="M13 4l7 7-3 3-7-7z"/><path d="M11 9l-7 7 4 4 7-7"/>' };
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

// skills e itens chegam à parte ("defs") e só quando mudam; cada estado diz de qual versão delas depende
let DEFS = { skills: {}, items: {} }, DEFV = -1, retry = 0;
// o catálogo de ofícios editado pelo mestre (S.ofiCfg) é mesclado sobre o padrão de oficios.js sempre que muda
let ofiSig = '';
const syncOfi = () => { const sg = JSON.stringify(S.ofiCfg || {}); if (sg !== ofiSig) { ofiSig = sg; globalThis.OFI.apply(S.ofiCfg); } };
// ===== som dos sistemas de ritmo: Tensão, Dívida de Coragem, Cadeia e Domínio (Web Audio sintetizado; respeita o botão de som) =====
// as animações são por estado (classes ten1-3, debt, chain.full, dom-on): sobrevivem ao redesenho; o som toca só na mudança
const toneSeq = (seq, { type = 'triangle', vol = .08 } = {}) => {
  if (snd.mute) return;
  try { actx ||= new AudioContext(); actx.resume?.(); const t0 = actx.currentTime; for (const [f, at, d, f2] of seq) { const o = actx.createOscillator(), g = actx.createGain(), t = t0 + at; o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + .03); } } catch {}
};
const SFXR = {
  tensao: n => toneSeq([[330 * 1.26 ** n, 0, .12], [495 * 1.26 ** n, .08, .18]]), // sobe a cada nível acumulado
  divida: () => toneSeq([[240, 0, .32, 80]], { type: 'sawtooth', vol: .06 }), // grave que cai: ficou devendo tempo
  cadeia: h => toneSeq([[500 + h * 4, 0, .07]], { vol: .04 }),
  cadeiaCheia: () => toneSeq([[523, 0, .1], [659, .09, .1], [784, .18, .1], [1047, .27, .32]], { type: 'square', vol: .045 }),
  dominio: () => toneSeq([[110, 0, 1, 260], [165, .08, 1, 390]], { type: 'sawtooth', vol: .055 }),
  dominioFim: () => toneSeq([[330, 0, .6, 70]], { vol: .07 }),
};
let fxPrev = null;
function fxWatch() {
  const B = S.battle;
  if (!B.active) { fxPrev = null; return; }
  const now = { u: {}, h: B.chain?.h || 0, dom: B.dom?.name || '' };
  for (const c of Object.values(S.chars)) if (!c.enemy && c.id in B.ticks) now.u[c.id] = { brv: c.brv || 0, ten: c.ten || 0 };
  const was = fxPrev; fxPrev = now;
  if (!was) return;
  for (const [id, n] of Object.entries(now.u)) { const o = was.u[id]; if (!o) continue; if (n.ten > o.ten) SFXR.tensao(n.ten); if (n.brv < 0 && n.brv < o.brv) SFXR.divida(); }
  if (now.h > was.h) now.h >= 100 ? SFXR.cadeiaCheia() : SFXR.cadeia(now.h);
  if (now.dom && !was.dom) SFXR.dominio(); else if (!now.dom && was.dom) SFXR.dominioFim();
}

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => { retry = 0; document.body.classList.remove('off'); send({ t: 'hello', role, name, pass, key, as: asWho || undefined, ctl: ctl || undefined }); };
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m.t === 'defs') { DEFS = m.d; DEFV = m.v; return; }
    if (m.t === 'state') { if (m.dv !== undefined && m.dv !== DEFV) return send({ t: 'sync' }); S = m.s; S.skills = DEFS.skills; S.items = DEFS.items; syncOfi(); render(); }
    if (m.t === 'ping') { const p = { x: m.x, y: m.y }; pings.push(p); render(); setTimeout(() => { pings = pings.filter(o => o !== p); render(); }, 2500); }
    if (m.t === 'sfx') playSfx(m.k);
    if (m.t === 'note') { if (m.id && gm && wf.d) wf.id = m.id; /* arma salva na Forja: continua editando ela */ toast(m.text, m.kind, m.why); if (m.kind === 'no') navigator.vibrate?.(120); }
    if (m.t === 'passOk') { ls('vj_pass', pass = m.pass); toast('Senha trocada.', 'ok', 'Na próxima sessão, entre com a nova.'); }
    if (m.t === 'err') { if (!m.bad) return toast(m.msg, 'no'); ws.onclose = null; ws.close(); S = null; ls(gm ? 'vj_key' : 'vj_pass', null); loginForm(m.msg); }
  };
  ws.onclose = () => { document.body.classList.add('off'); setTimeout(connect, Math.min(8000, 1000 * 1.5 ** retry++)); }; // tenta de novo, espaçando até 8 s
}

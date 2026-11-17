// ===== coreografia do combate, estilo Persona: cada ação cabe em ~1,5 s =====
// Os efeitos grandes vivem numa camada fixa fora do #app (o redesenho a cada estado não os corta no meio).
// Ordem de uma ação: número do dado (só em combate; o dado 3D fica para os testes fora dele) → faixa da skill e foco
// → investida → impacto, número e carimbo. Crítico e Fraqueza ganham um corte de tela; Limite e Domínio, uma cutscene
// antes do golpe; Quebra estilhaça; nocaute derruba o cartão. Turno inimigo escurece o palco; início e fim têm abertura e resultado.
const fxl = document.createElement('div'); fxl.className = 'fxl'; fxl.setAttribute('aria-hidden', 'true'); document.body.append(fxl);
const lastPct = new Map(), DICE_MS = 950, NUM_MS = 460;
let cine = null, wasActive = null;
const koHold = new Map(), hpPrev = new Map(), stPrev = new Map(), fxMarks = []; // marcas reaplicadas a cada redesenho até expirarem
let threatUntil = 0, enterUntil = 0;
const skByName = n => Object.values(S.skills || {}).find(s => s.name === n);
const fxAdd = (cls, html, ms, style = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; if (style) d.style.cssText = style; fxl.append(d); setTimeout(() => d.remove(), ms); return d; };
const unitEl = id => app.querySelector(`.unit[data-tgt="${id}"]`) || app.querySelector(`.tok[data-id="${id}"]`);
const fxPos = (el, y = .32) => { const r = el.getBoundingClientRect(); return `left:${r.left + r.width / 2}px;top:${r.top + r.height * y}px;--uw:${r.width}px`; };
const mark = (sel, cls, ms) => fxMarks.push({ sel, cls, until: performance.now() + ms });
const face = c => c?.img ? `<img src="${esc(c.img)}" alt="">` : `<span>${c ? esc(c.enemy ? KANJI[mainEl(c)] : c.name.slice(0, 1).toUpperCase()) : ''}</span>`;

// sons novos (Web Audio sintetizado, sem arquivos; respeitam o botão de som)
const SFXC = {
  cut: () => { thud(.22, 3800, .35, 'highpass'); tone(700, .2, { type: 'square', to: 1900, g: .07 }); },
  weak: () => { tone(1175, .1, { type: 'square', g: .11 }); tone(1568, .28, { type: 'square', g: .11, delay: .09 }); },
  limit: () => { [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 1, { type: 'sawtooth', g: .05, delay: i * .08 })); thud(.6, 160, .7, 'lowpass', .95); },
  brk: () => { for (let i = 0; i < 6; i++) thud(.07, 4200 + i * 800, .28, 'highpass', i * .03); tone(1900, .45, { type: 'triangle', to: 500, g: .1 }); },
  ko: () => { thud(.4, 260, .6); tone(320, .7, { type: 'sawtooth', to: 55, g: .11 }); },
  start: () => { thud(.18, 170, .9); thud(.18, 170, .9, 'lowpass', .16); thud(.12, 2600, .25, 'highpass', .32); [392, 523, 659, 784].forEach((f, i) => tone(f, .8, { type: 'sawtooth', g: .05, delay: .34 + i * .02 })); },
  threat: () => { tone(82, 1, { type: 'sawtooth', g: .11 }); tone(87, 1, { type: 'sawtooth', g: .09 }); thud(.35, 130, .55); },
  perfect: () => [1319, 1568, 2093].forEach((f, i) => tone(f, .2, { type: 'triangle', g: .1, delay: i * .06 })),
  bf: () => { thud(.3, 90, .85); thud(.16, 3200, .4, 'highpass'); tone(120, .45, { type: 'sawtooth', to: 38, g: .12 }); },
  chq: () => { thud(.25, 140, .7); tone(220, .35, { type: 'square', to: 880, g: .07 }); },
  tick: () => tone(1800, .03, { type: 'triangle', g: .12 }),
  hit: () => { thud(.12, 900, .6); tone(220, .14, { type: 'square', to: 90, g: .1 }); },
  miss: () => tone(180, .3, { type: 'sawtooth', to: 60, g: .09 }),
  whoosh: () => { const c = actxGet(), s = noise(c), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; fl.type = 'highpass'; fl.Q.value = .8; fl.frequency.setValueAtTime(500, t); fl.frequency.exponentialRampToValueAtTime(5500, t + .24); g.gain.setValueAtTime(.0002, t); g.gain.linearRampToValueAtTime(Math.max(.0002, .3 * level()), t + .07); g.gain.exponentialRampToValueAtTime(.0001, t + .28); s.connect(fl).connect(g).connect(c.destination); s.start(t); s.stop(t + .32); },
  charge: v => tone(180 + 720 * Math.min(1, Math.max(0, v || 0)), .12, { type: 'sawtooth', g: .06 }),
  boom: () => { thud(.5, 120, .9); tone(70, .5, { to: 35, g: .3 }); },
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i > 4 ? .7 : .16, { type: 'square', g: .07, delay: i * .11 })),
};
const sfxc = (k, v) => { if (snd.mute || !SFXC[k]) return; try { SFXC[k](v); } catch {} };
const hitSfx = f => { if (typeof playSfx === 'function') playSfx(f.miss ? 'miss' : f.heal ? 'heal' : f.crit ? 'crit' : 'hit'); };

function applyCine(fresh) { // foco da ação: o palco aproxima em quem age e nos alvos; o resto escurece
  const st = app.querySelector('.stage'), fld = st?.querySelector('.field');
  if (!fld) return;
  if (!cine || performance.now() > cine.until) { cine = null; st.classList.remove('cine'); fld.style.transform = ''; return; }
  const us = cine.ids.map(id => st.querySelector(`.unit[data-tgt="${id}"]`)).filter(Boolean);
  if (!us.length) return;
  us.forEach(u => u.classList.add('inv'));
  const x0 = Math.min(...us.map(u => u.offsetLeft)), x1 = Math.max(...us.map(u => u.offsetLeft + u.offsetWidth)), y0 = Math.min(...us.map(u => u.offsetTop)), y1 = Math.max(...us.map(u => u.offsetTop + u.offsetHeight));
  const z = Math.max(1, Math.min(1.45, fld.offsetWidth / ((x1 - x0) * 1.35), st.offsetHeight / ((y1 - y0) * 1.3))), cx = fld.offsetLeft + fld.offsetWidth / 2, cy = st.offsetHeight / 2;
  fld.style.transition = fresh ? '' : 'none'; st.classList.add('cine');
  fld.style.transform = `translate(${(cx - (x0 + x1) / 2) * z}px,${(cy - (y0 + y1) / 2) * z}px) scale(${z})`;
  if (!fresh) { fld.offsetWidth; fld.style.transition = ''; }
}
function dicePanel(e, n) { // fora do combate: dados 3D num painel com o que era preciso tirar e o veredito
  document.querySelector('.rollfx')?.remove();
  const rf = document.createElement('div'), ok = e.kind === 'ok', atk = e.rr.atk;
  rf.className = `rollfx ${ok ? 'ok' : 'bad'} ${/CRÍTICO|DESASTRE/.test(e.rr.res) ? 'big' : ''} ${atk ? 'atk' : ''}`; rf.style.setProperty('--c', S.chars[e.rr.c]?.color || '#fff'); rf.setAttribute('role', 'status');
  rf.innerHTML = `<small>${esc(e.who)}${e.to ? ' · rolagem secreta' : ''}</small><span>${esc(e.rr.l)} · precisa de <u>${e.rr.t}</u> ou menos${n > 1 ? ` · ${n} alvos` : ''}</span><div class="dice"></div><div class="res"><b>${e.d}</b><em>${esc(e.rr.res)}</em></div>`;
  document.body.append(rf); import('/dice.js').then(m => m.roll(e.d, rf.querySelector('.dice'))).catch(() => {});
  setTimeout(() => rf.remove(), atk ? 2700 : 3400);
}
function numRoll(e, n) { // em combate: só o número, que gira e trava no resultado
  fxl.querySelector('.nroll')?.remove();
  const ok = e.kind === 'ok', big = /CRÍTICO|DESASTRE/.test(e.rr.res);
  const d = fxAdd(`nroll ${ok ? 'ok' : 'bad'} ${big ? 'big' : ''}`, `<small>${esc(e.who)}${e.to ? ' · secreta' : ''}</small><div class="nr"><b>00</b><span>precisa de <u>${e.rr.t}</u>${n > 1 ? ` · ${n} alvos` : ''}</span></div><em>${esc(e.rr.res)}</em>`, 1700, `--c:${S.chars[e.rr.c]?.color || '#fff'}`);
  d.setAttribute('role', 'status');
  const b = d.querySelector('b'); let i = 0;
  const iv = setInterval(() => { b.textContent = String(1 + Math.floor(Math.random() * 100)).padStart(2, '0'); if (++i >= 9) { clearInterval(iv); b.textContent = String(e.d).padStart(2, '0'); d.classList.add('done'); } }, 45);
}
function cutscene(a, f) { // Limite e Domínio: retrato (ou a inicial gigante) atravessa a tela com o kanji do Vínculo
  const el = f.el || mainEl(a), kj = KANJI[!a.enemy && a.vinc?.[0] || el] || KANJI.fis;
  fxAdd(`cuts ${f.dom ? 'dom' : 'lim'} ${a.enemy ? 'foe' : ''}`, `<i class="cs-bg"></i><i class="cs-band b1"></i><i class="cs-band b2"></i><em class="cs-kj">${kj}</em><div class="cs-por">${face(a)}</div>
    <div class="cs-name"><small>${f.dom ? 'Domínio' : 'Limite'} · ${esc(a.name)}</small><b>${esc(f.s || '')}</b></div>`, 1250, `--c:${esc(a.color || '#e4002b')};--fx:${ELC[el] || '#e4002b'}`);
  sfxc('limit');
}
function cutIn(kind, a, t) { // Crítico e Fraqueza: corte de tela com o olhar de quem golpeou
  fxl.querySelector('.cutin')?.remove();
  fxAdd(`cutin ${kind} ${a?.enemy ? 'foe' : ''}`, `<div class="ci-strip">${face(a)}</div><div class="ci-txt"><b>${kind === 'crit' ? 'Crítico!' : 'Fraqueza!'}</b><small>${esc(a?.name || '')}${t ? ' → ' + esc(t.name) : ''}</small></div>`, 900, `--c:${esc(a?.color || '#e4002b')}`);
  sfxc(kind === 'crit' ? 'cut' : 'weak');
}
function shatter(el) { // Quebra: o cartão estilhaça e a etiqueta entra
  const sh = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36 + Math.random() * 20}deg;--d:${3 + Math.random() * 4}"></i>`).join('');
  fxAdd('shatter', `${sh}<b>Quebra!</b>`, 1100, fxPos(el, .4)); sfxc('brk');
}
function knockout(id) { // nocaute: corte em diagonal, o cartão cai e apaga
  koHold.delete(id);
  const el = unitEl(id), c = S.chars[id]; if (!el || !c) return;
  el.classList.add('ko'); mark(`.unit[data-tgt="${id}"]`, 'kofall', 900);
  el.classList.add('kofall');
  fxAdd('kofx', `<i></i><b>${c.enemy ? 'Abatido' : 'Caído'}</b>`, 1000, fxPos(el, .45)); sfxc('ko');
}
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function seal(kind, txt) { // selo grande no palco: PERFEITO!, BOM!, CONTRA!, CHOQUE!, BLACK FLASH!
  fxl.querySelector('.seal')?.remove();
  if (kind !== 'bom' && kind !== 'erro') fxAdd('flash' + (kind === 'bf' ? ' dark' : ''), '', 260);
  fxAdd(`seal ${kind}`, `<b>${esc(txt)}</b>`, 1100); sfxc(kind === 'perf' || kind === 'otimo' ? 'perfect' : kind === 'bf' ? 'bf' : kind === 'chq' ? 'chq' : 'weak');
}
function comandoFx(acts, stage) { // o que os comandos de ação rendem: nota do ataque, contra-ataque, Choque e Black Flash
  const grade = acts.find(e => e.fx.cg), bf = acts.find(e => e.fx.bf), ctr = acts.find(e => e.fx.ctr), chq = acts.find(e => e.fx.chq);
  if (bf) { if (stage && !calm()) stage.classList.add('shake'); seal('bf', 'BLACK FLASH!'); }
  else if (grade) seal(grade.fx.cg, (RULES.CMD.GRADE_NAME[grade.fx.cg] || '') + '!');
  if (ctr) setTimeout(() => seal('ctr', 'CONTRA!'), 250);
  if (chq) { if (stage && !calm()) { stage.classList.add('shake'); setTimeout(() => stage.classList.remove('shake'), 400); } seal('chq', 'CHOQUE!'); }
}
function impact(acts) {
  const f0 = acts[0].fx, a = S.chars[f0.a], big = (f0.lim || f0.dom) && a;
  if (big) { cutscene(a, f0); setTimeout(() => strikeFx(acts, f0, a), 1050); } else strikeFx(acts, f0, a);
}
function strikeFx(acts, f0, a) {
  const stage = app.querySelector('.stage');
  if (f0.s && stage && !f0.dom) { fxl.querySelector('.callout')?.remove(); // faixa com o nome da ação
    fxAdd(`callout ${a?.enemy ? 'foe' : ''}`, `<div><small>${esc(a?.name || '')}</small><b>${esc(f0.s)}</b></div>`, 1150, `--fx:${ELC[f0.el] || '#e4002b'}`); }
  if (stage && !f0.dom) { cine = { ids: [...new Set([f0.a, ...acts.map(e => e.fx.id)].filter(Boolean))], until: performance.now() + 1300 }; applyCine(true); setTimeout(() => applyCine(true), 1350); }
  const au = f0.a && unitEl(f0.a);
  if (au && !f0.dom) { au.style.setProperty('--fx', ELC[f0.el] || '#fff'); au.classList.add(f0.el && f0.el !== 'fis' || f0.heal ? 'cast' : 'lunge'); }
  const crit = acts.find(e => e.fx.crit), weak = acts.find(e => e.fx.w);
  if (crit && stage) stage.classList.add('shake');
  comandoFx(acts, stage);
  if (crit || weak) setTimeout(() => cutIn(crit ? 'crit' : 'weak', a, S.chars[(crit || weak).fx.id]), 180);
  if (f0.dom) return;
  acts.forEach((e, i) => setTimeout(() => {
    const f = e.fx, el = unitEl(f.id);
    hitSfx(f);
    if (!el) return;
    el.style.setProperty('--fx', ELC[f.el] || '#fff');
    if (f.dmg) { el.classList.add('hit'); fxAdd('slash', '', 420, fxPos(el, .38) + `;--fx:${ELC[f.el] || '#fff'}`); } else if (f.heal) el.classList.add('mendfx'); else if (f.miss) el.classList.add('dodge');
    const num = f.heal ? (f.a && f.heal === 1 ? 'Cura' : '+' + f.heal) : f.miss ? (f.par ? 'Aparou!' : f.esq ? 'Esquivou!' : 'Errou') : f.dmg ? '−' + f.dmg : ''; // golpe de apoio sem número não ganha legenda
    if (num) fxAdd(`float ${f.heal ? 'heal' : f.miss ? 'miss' : f.crit ? 'crit' : f.w ? 'weak' : ''}`, num, 1250, fxPos(el, .22) + `;--fx:${ELC[f.el] || '#e4002b'}`);
    if (/QUEBROU!/.test(e.text)) setTimeout(() => shatter(el), 120);
    if (koHold.has(f.id)) setTimeout(() => knockout(f.id), 260);
  }, 220 + i * 90));
}
function threat(c) { // turno inimigo: o palco escurece, faixa vermelha e o inimigo dá um passo à frente
  threatUntil = performance.now() + 1300; fxState();
  fxAdd('threat', `<div><small>Turno inimigo</small><b>${esc(c.name)}</b></div>`, 1300); sfxc('threat');
}
function intro() { // abertura: os dois lados entram e a faixa "Batalha!" corta a tela
  enterUntil = performance.now() + 1400; fxState();
  const fs = Object.values(S.chars).filter(c => c.id in S.battle.ticks && c.enemy).map(c => esc(c.name));
  fxAdd('intro', `<i class="in-l"></i><i class="in-r"></i><div><b>Batalha!</b><small>${fs.slice(0, 4).join(' · ')}${fs.length > 4 ? ` e mais ${fs.length - 4}` : ''}</small></div>`, 1700); sfxc('start');
}
function results(e) { // fim da batalha: XP, ouro, espólios e o que cada herói fez
  document.querySelector('.result')?.remove();
  const r = e.res, top = Math.max(1, ...r.st.map(s => s.dmg)), d = document.createElement('div');
  d.className = 'result'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Resultado da batalha');
  d.innerHTML = `<div class="rs-in"><header><b>Vitória</b><span><em>+${r.xp}</em> XP · <em>+${r.gold}</em> ouro <small>para cada herói</small></span></header>
    <div class="rs-st">${r.st.map((s, i) => `<div class="rs-h ${s.id === r.mvp ? 'mvp' : ''}" style="--c:${esc(s.color)};--i:${i};--p:${Math.round(100 * s.dmg / top)}%"><div class="rs-f">${face({ ...s, enemy: false })}</div><div><b>${esc(s.name)}${s.id === r.mvp ? '<i>Destaque</i>' : ''}</b><i class="rs-bar"></i>
      <small><u>${s.dmg}</u> dano · <u>${s.heal}</u> cura · <u>${s.crit}</u> crít. · <u>${s.ko}</u> abates</small></div></div>`).join('')}</div>
    ${r.drops.length ? `<div class="rs-dr"><small>Espólios</small>${r.drops.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}<button class="own" data-rs="x">Continuar</button></div>`;
  d.addEventListener('click', ev => { if (ev.target === d || ev.target.dataset.rs) d.remove(); });
  document.body.append(d); sfxc('win'); setTimeout(() => d.remove(), 14000);
}
function fxState() { // reaplica o que um redesenho apagaria: KO adiado, palco ameaçador, abertura e marcas temporárias
  const now = performance.now(), st = app.querySelector('.stage');
  st?.classList.toggle('threat', now < threatUntil); st?.classList.toggle('enter', now < enterUntil);
  for (const [id, until] of koHold) { if (now > until) { koHold.delete(id); continue; } app.querySelector(`.unit[data-tgt="${id}"]`)?.classList.remove('ko'); }
  for (let i = fxMarks.length - 1; i >= 0; i--) { const m = fxMarks[i]; if (now > m.until) { fxMarks.splice(i, 1); continue; } app.querySelectorAll(m.sel).forEach(el => el.classList.add(m.cls)); }
}
function fx() {
  const news = seen == null ? [] : S.log.filter(e => e.n > seen), B = S.battle, cur = B.active ? S.chars[timeline(1)[0]] : null;
  const rolls = news.filter(e => e.rr), acts = news.filter(e => e.fx).slice(-8), quick = B.active, wait = acts.some(e => e.d) ? (quick ? NUM_MS : DICE_MS) : 0;
  app.querySelectorAll('[data-bid]').forEach(el => { // a barra escoa do valor anterior até o novo, depois do dado
    const k = el.dataset.bid, p = el.dataset.p, old = lastPct.get(k);
    if (old != null && old !== p) { el.style.transition = 'none'; el.style.width = old + '%'; el.offsetWidth; el.style.transition = ''; el.style.transitionDelay = (wait + (acts.some(e => e.fx.lim || e.fx.dom) ? 1100 : 0)) + 'ms'; el.style.width = p + '%'; }
    lastPct.set(k, p);
  });
  // quem caiu nesta leva só "cai" quando o golpe chega
  if (B.active) for (const c of Object.values(S.chars)) { if (!(c.id in B.ticks) && !c.dead) continue; const was = hpPrev.get(c.id); if (was > 0 && c.hp <= 0 && seen != null) koHold.set(c.id, performance.now() + wait + 2600); hpPrev.set(c.id, c.hp); }
  else hpPrev.clear();
  // condições novas entram com um pulo; dano contínuo e regeneração fazem o ícone pulsar
  for (const c of Object.values(S.chars)) { const ks = Object.keys(c.st || {}), was = stPrev.get(c.id); if (was && seen != null) ks.filter(k => !was.includes(k)).forEach(k => mark(`.unit[data-tgt="${c.id}"] .sti[data-st="${k}"]`, 'new', 700)); stPrev.set(c.id, ks); }
  news.filter(e => e.fx && !e.fx.a).forEach(e => mark(`.unit[data-tgt="${e.fx.id}"] .sti`, 'tick', 800));
  seen = S.seq;
  fxState(); applyCine(false); // um redesenho no meio da cena mantém o enquadramento
  if (B.active && wasActive === false) intro();
  wasActive = !!B.active;
  if (rolls.length) (quick ? numRoll : dicePanel)(rolls.at(-1), rolls.filter(e => e.rr.atk).length);
  if (acts.length) setTimeout(() => impact(acts), wait);
  const plain = news.filter(e => !e.fx).at(-1), win = news.find(e => /^Vitória!/.test(e.text));
  if (role === 'table' && plain && !win) { // legenda discreta para o que não é golpe
    document.querySelector('.caption')?.remove(); clearTimeout(capT);
    const cp = document.createElement('div'); cp.className = 'caption'; cp.innerHTML = `<b>${esc(plain.who)}</b>${esc(plain.text)}`; document.body.append(cp); capT = setTimeout(() => cp.remove(), 6000);
  }
  if (win?.res) setTimeout(() => results(win), 400);
  else if (win) { const v = document.createElement('div'); v.className = 'victory'; v.innerHTML = `<b>Vitória</b><span>${esc(win.text.replace(/^Vitória!\s*/, ''))}</span>`; document.body.append(v); setTimeout(() => v.remove(), 6500); }
  if (cur && cur.id !== lastCur && lastCur !== undefined) {
    const later = wait + (acts.length ? 900 : 0); // a vez troca depois que o golpe anterior terminou
    if (cur.enemy) setTimeout(() => threat(cur), later);
    else setTimeout(() => { const mineT = role === 'player' && mine(cur); fxAdd(`banner ${mineT ? 'me' : ''}`, mineT ? 'Seu turno' : 'Turno de ' + esc(cur.name), 1100, `--c:${esc(cur.color)}`); if (mineT) navigator.vibrate?.([60, 40, 60]); }, later);
  }
  lastCur = cur?.id ?? null;
  fxWatch(); gainWatch();
}

// ===== ganhos do jogador fora do combate: XP, ouro, skill nova e item novo viram um selo animado no topo =====
// (no fim da batalha a tela de resultado já mostra tudo isso, então ali fica quieto)
let gainPrev = null;
function gainWatch() {
  if (role !== 'player' || !S) return;
  const my = Object.values(S.chars).filter(c => !c.enemy && mine(c)), now = {};
  for (const c of my) now[c.id] = { xp: c.xp, gold: c.gold, sk: [...(c.skills || [])], inv: { ...c.inv } };
  const quiet = !!document.querySelector('.result'), prev = gainPrev; gainPrev = now;
  if (!prev || quiet) return;
  let n = 0;
  for (const c of my) { const p = prev[c.id]; if (!p) continue;
    const out = [];
    for (const k of c.skills || []) if (!p.sk.includes(k)) out.push(['sk', 'Nova skill', SK(k)?.name || k]);
    if (c.xp > p.xp) out.push(['xp', 'Experiência', `+${c.xp - p.xp} XP`]);
    if (c.gold !== p.gold) out.push(['gold', 'Ouro', `${c.gold > p.gold ? '+' : '−'}${Math.abs(c.gold - p.gold)}`]);
    for (const [k, q] of Object.entries(c.inv)) if (q > (p.inv[k] || 0)) out.push(['it', 'Item', `${S.items[k]?.name || k}${q - (p.inv[k] || 0) > 1 ? ' ×' + (q - (p.inv[k] || 0)) : ''}`]);
    for (const [k, l, v] of out.slice(0, 4)) { const i = n++;
      setTimeout(() => { fxAdd('gain g-' + k, `<small>${esc(c.name)} · ${l}</small><b>${esc(v)}</b>`, 2800, `--i:${i % 4}`); if (!snd.mute) tone(k === 'sk' ? 880 : 660, .14, { type: 'triangle', g: .08, to: k === 'sk' ? 1320 : 990 }); }, i * 320); }
  }
}

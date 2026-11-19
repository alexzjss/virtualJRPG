// ===== coreografia do combate, estilo Persona: cada ação cabe em ~1,5 s =====
// Os efeitos grandes vivem numa camada fixa fora do #app (o redesenho a cada estado não os corta no meio).
// Ordem de uma ação: número do dado (só em combate; o dado 3D fica para os testes fora dele) → faixa da skill e foco
// → investida → impacto, número e carimbo. Crítico e Fraqueza ganham um corte de tela; Limite e Domínio, uma cutscene
// antes do golpe; Quebra estilhaça; nocaute derruba o cartão. Turno inimigo escurece o palco; início e fim têm abertura e resultado.
const fxl = document.createElement('div'); fxl.className = 'fxl'; fxl.setAttribute('aria-hidden', 'true'); document.body.append(fxl);
const lastPct = new Map(), DICE_MS = 950, NUM_MS = 460;
let cine = null, wasActive = null;
const koHold = new Map(), hpPrev = new Map(), stPrev = new Map(), fxMarks = []; // marcas reaplicadas a cada redesenho até expirarem
let threatUntil = 0, enterUntil = 0, busyUntil = 0;
const dropPct = new Map(), lastEl = new Map(); // quanto do HP cada alvo perdeu neste lote (peso do golpe) e o elemento do último dano (cor da tinta do KO)
const P3 = () => !!stage3d() && !app.querySelector('.stage') && typeof PALCO3D !== 'undefined' && typeof PFX !== 'undefined';
const skByName = n => Object.values(S.skills || {}).find(s => s.name === n);
const fxAdd = (cls, html, ms, style = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; if (style) d.style.cssText = style; fxl.append(d); setTimeout(() => d.remove(), ms); return d; };
const stage3d = () => { const r = document.querySelector('.p3d'); return r && r.style.display !== 'none' ? r : null; }; // o palco 3D do PC (fora do #app), quando visível
const unitEl = id => (stage3d() && document.querySelector(`.p3d .bb[data-tgt="${id}"]`)) || app.querySelector(`.unit[data-tgt="${id}"]`) || app.querySelector(`.tok[data-id="${id}"]`);
const fxPos = (el, y = .32) => { const r = el.getBoundingClientRect(); return `left:${r.left + r.width / 2}px;top:${r.top + r.height * y}px;--uw:${r.width}px`; };
// os recortes do palco 3D não são redesenhados: a classe de animação sai sozinha e reinicia a cada golpe (no 2D o redesenho já a tira)
const pulse = (el, cls, ms = 900) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
const mark = (sel, cls, ms) => fxMarks.push({ sel, cls, until: performance.now() + ms });
// retrato do recorte (imgP, ou o topo da frente) para o corte de turno e a faixa do inimigo
const portrait = c => { if (typeof PALCO3D === 'undefined') return face(c); const s = PALCO3D.imgSrc(c, 'p'), t = PALCO3D.imgFit(c, 'p', s); return `<img src="${esc(s.url)}" alt=""${t ? ` style="transform:${t}"` : ''}${s.crop ? ' class="crop"' : ''}>`; };
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
function cutIn(kind, a, t) { // Crítico e Fraqueza: corte de tela com o olhar de quem golpeou (no modo luminoso ficam no mundo: clarão + estrela/etiqueta no número)
  if (luzOn()) { posFx('bloom'); sfxc(kind === 'crit' ? 'cut' : 'weak'); return; }
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
  if (c.enemy && stage3d() && luzOn() && typeof LUZFX !== 'undefined') LUZFX.dissolve(id, ELC[lastEl.get(id)] || '#e4002b');
  else if (c.enemy && stage3d() && typeof PVIDA !== 'undefined') PVIDA.inkOut(id, ELC[lastEl.get(id)] || '#e4002b'); else fxAdd('kofx', `<i></i><b>${c.enemy ? 'Abatido' : 'Caído'}</b>`, 1000, fxPos(el, .45));
  sfxc('ko');
}
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const luzOn = () => document.documentElement.classList.contains('luz') && typeof LUZP !== 'undefined';
const posFx = (k, id, o = {}) => { const P = globalThis.LUZ?.pos; if (!P) return; const r = id && document.querySelector(`.p3d .bb[data-tgt="${CSS.escape(id)}"] > .bbi > img`)?.getBoundingClientRect(); P.fire(k, r?.width ? { x: r.left + r.width / 2, y: r.top + r.height * .45, ...o } : o); }; // pós de tela do motor luminoso (aberração, velocidade, choque, inversão)
function seal(kind, txt) { // selo grande no palco: PERFEITO!, BOM!, CONTRA!, CHOQUE!, BLACK FLASH!
  fxl.querySelector('.seal')?.remove();
  if (kind !== 'bom' && kind !== 'erro') fxAdd('flash' + (kind === 'bf' ? ' dark' : ''), '', 260);
  fxAdd(`seal ${kind}`, `<b>${esc(txt)}</b>`, 1100); sfxc(kind === 'perf' || kind === 'otimo' ? 'perfect' : kind === 'bf' ? 'bf' : kind === 'chq' ? 'chq' : 'weak');
}
function comandoFx(acts, stage) { // o que os comandos de ação rendem: nota do ataque, contra-ataque, Choque e Black Flash
  const grade = acts.find(e => e.fx.cg), bf = acts.find(e => e.fx.bf), ctr = acts.find(e => e.fx.ctr), chq = acts.find(e => e.fx.chq);
  if (bf) { if (stage && !calm()) { stage.classList.add('shake'); setTimeout(() => stage.classList.remove('shake'), 450); } seal('bf', 'BLACK FLASH!'); posFx('invert'); }
  else if (grade) seal(grade.fx.cg, (RULES.CMD.GRADE_NAME[grade.fx.cg] || '') + '!');
  if (ctr) setTimeout(() => seal('ctr', 'CONTRA!'), 250);
  if (chq) { if (stage && !calm()) { stage.classList.add('shake'); setTimeout(() => stage.classList.remove('shake'), 400); } seal('chq', 'CHOQUE!'); }
}
// cada quem-age é uma cena (o contra-ataque ganha a sua, com a câmera virando para o ombro de quem defende)
async function impact(acts, o = {}) {
  busyUntil = performance.now() + 8000;
  try { for (const seg of (typeof PFX !== 'undefined' ? PFX.segments(acts) : [acts])) {
    const f0 = seg[0].fx, a = S.chars[f0.a], big = (f0.lim || f0.dom) && a;
    if (f0.ctr && P3()) await PALCO3D.focus(f0.a, [f0.id], 260);
    if (big) { cutscene(a, f0); if (P3()) PALCO3D.orbitShot(a.id, 45, 1000); await new Promise(r => setTimeout(r, 1050)); }
    await strikeFx(seg, f0, a, o);
  } } finally { busyUntil = 0; }
}
// números com física: arco, quique e cor do elemento (no 3D); no 2D e com movimento reduzido ficam como antes
function floatNum(el, txt, cls, i, f) {
  const col = f.dmg ? (typeof ANIM_PROFILES !== 'undefined' && ANIM_PROFILES.PALETTES[f.el]?.[1]) || ELC[f.el] || '#e4002b' : ELC[f.el] || '#e4002b';
  if (luzOn()) { // números luminosos: sobem e somem sem quique; crítico com estrela, fraqueza com etiqueta
    const ns = LUZP.numberStyle({ crit: !!f.crit, weak: !!f.w, total: /total/.test(cls), heal: !!f.heal, miss: !!f.miss });
    const d = fxAdd(`float lz ${cls}`, `${ns.star ? '<i class="lz-star">✦</i>' : ''}<span>${txt}</span>${ns.tag && !f.miss ? `<em>${ns.tag}</em>` : ''}`, ns.lifeMs + 100, fxPos(el, .22) + `;--fx:${col}`);
    if (d.animate && !calm()) { const dx = (i % 3 - 1) * 18; d.animate([{ transform: `translate(-50%,-50%) translate(${dx}px,6px) scale(${ns.scale * .7})`, opacity: 0 }, { transform: `translate(-50%,-50%) translate(${dx}px,-10px) scale(${ns.scale * 1.08})`, opacity: 1, offset: .12 },
      { transform: `translate(-50%,-50%) translate(${dx}px,-22px) scale(${ns.scale})`, opacity: 1, offset: .7 }, { transform: `translate(-50%,-50%) translate(${dx}px,-46px) scale(${ns.scale})`, opacity: 0 }], { duration: ns.lifeMs, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }); }
    return d; }
  const d = fxAdd(`float ${cls}`, txt, 1250, fxPos(el, .22) + `;--fx:${col}`);
  if (!P3() || calm() || !d.animate) return d;
  const sd = PFX.numberSeed(i, f.crit), sc = /total/.test(cls) ? 1.35 : f.crit ? 1.25 : 1; d.classList.add('phys');
  d.animate(Array.from({ length: 13 }, (_, k) => { const p = PFX.numberPath(k * .1, sd); return { transform: `translate(-50%,-50%) translate(${p.x}px,${p.y}px) scale(${sc})`, opacity: p.a }; }), { duration: 1200, fill: 'forwards' });
  return d;
}
function strikeFx(acts, f0, a, o = {}) {
  let done; const fin = new Promise(r => { done = r; });
  const old = app.querySelector('.stage'), stage = old || stage3d();
  if (f0.s && stage && !f0.dom) { fxl.querySelector('.callout')?.remove(); // faixa com o nome da ação
    fxAdd(`callout ${a?.enemy ? 'foe' : ''}`, `<div><small>${esc(a?.name || '')}</small><b>${esc(f0.s)}</b></div>`, 1150, `--fx:${ELC[f0.el] || '#e4002b'}`); }
  if (old && !f0.dom) { cine = { ids: [...new Set([f0.a, ...acts.map(e => e.fx.id)].filter(Boolean))], until: performance.now() + 1300 }; applyCine(true); setTimeout(() => applyCine(true), 1350); }
  const au = f0.a && unitEl(f0.a);
  const casts = f0.el && f0.el !== 'fis' || f0.heal, t0 = acts.map(e => e.fx.id).find(id => id && id !== f0.a);
  if (au && !f0.dom) { au.style.setProperty('--fx', ELC[f0.el] || '#fff'); pulse(au, casts ? 'cast' : 'lunge'); }
  // no palco 3D a investida física leva a câmera e o recorte até o alvo; os golpes caem quando ela chega
  const go = stage3d() && !old && !casts && !f0.dom && t0 && typeof PALCO3D !== 'undefined' ? PALCO3D.lunge(f0.a, t0, typeof ANIM_PROFILES !== 'undefined' ? ANIM_PROFILES.familyOf(skByName(f0.s), f0) : '') : null;
  if (go) posFx('speed', t0, { strength: .8 });
  const crit = acts.find(e => e.fx.crit), weak = acts.find(e => e.fx.w);
  if (crit && stage && !P3()) { stage.classList.add('shake'); if (!old) setTimeout(() => stage.classList.remove('shake'), 450); }
  comandoFx(acts, stage);
  if (crit || weak) setTimeout(() => cutIn(crit ? 'crit' : 'weak', a, S.chars[(crit || weak).fx.id]), 180);
  const sk = skByName(f0.s), engine = typeof ANIMFX !== 'undefined';
  if (crit && engine) ANIMFX.flash(ELC[f0.el] || '#fff', 90);
  if (f0.dom) { if (engine) ANIMFX.play({ actorId: f0.a, targetIds: [f0.id], skill: sk, fx: f0 }); setTimeout(done, 1200); return fin; }
  // peso do golpe (3D): hitstop, tremida na direção do golpe, recuo e luz; parry solta faíscas, esquiva deixa fantasmas; o golpe final desacelera
  const p3 = P3(), sumD = {}; acts.forEach(e => { if (e.fx.dmg) sumD[e.fx.id] = (sumD[e.fx.id] || 0) + e.fx.dmg; });
  const pctOf = f => f.dmg ? (dropPct.get(f.id) || 0) * f.dmg / (sumD[f.id] || f.dmg) : 0, dirOf = (x, y) => { const A = PALCO3D.posOf(x), B = PALCO3D.posOf(y); return A && B ? Math.sign(B.x - A.x) || 1 : 1; };
  const foeLeft = id => Object.values(S.chars).some(c => c.enemy && c.id !== id && c.id in S.battle.ticks && c.hp > 0);
  const hit1 = (e, i, j, n, G) => {
    const f = e.fx, el = unitEl(f.id);
    hitSfx(f);
    if (!el) return;
    el.style.setProperty('--fx', ELC[f.el] || '#fff');
    const pct = pctOf(f), koNow = !o.replay && j === n - 1 && koHold.has(f.id);
    if (f.dmg) { lastEl.set(f.id, f.el);
      if (p3) { PALCO3D.recoil(f.id, f0.a, pct, f.crit); if (typeof CENA !== 'undefined') CENA.hitstop(PFX.hitstopMs(pct, f.crit, koNow)); PALCO3D.quake(PFX.shakeAmp(pct, f.crit), dirOf(f0.a, f.id)); PALCO3D.light(f.id, ELC[f.el] || '#fff'); }
      else if (stage3d() && typeof PALCO3D !== 'undefined') PALCO3D.shake(f.id);
      pulse(el, 'hit', 600); if (!engine) fxAdd('slash', '', 420, fxPos(el, .38) + `;--fx:${ELC[f.el] || '#fff'}`); }
    else if (f.heal) pulse(el, 'mendfx');
    else if (f.miss) { pulse(el, 'dodge', 600);
      if (p3 && f.par) { const ra = PALCO3D.rectOf(f.a || f0.a), rb = PALCO3D.rectOf(f.id); if (ra && rb && engine && ANIMFX.sparks) ANIMFX.sparks((ra.left + ra.right + rb.left + rb.right) / 4, (ra.top + ra.bottom + rb.top + rb.bottom) / 4 - 20, '#ffd36a');
        if (typeof CENA !== 'undefined') CENA.slow(.4, 350); PALCO3D.recoil(f.a || f0.a, f.id, .3, false); const au2 = unitEl(f.a || f0.a); if (au2) pulse(au2, 'stagger', 600); }
      if (p3 && f.esq && typeof PVIDA !== 'undefined') PVIDA.ghosts(f.id, dirOf(f0.a, f.id)); }
    const num = f.heal ? (f.a && f.heal === 1 ? 'Cura' : '+' + f.heal) : f.miss ? (f.par ? 'Aparou!' : f.esq ? 'Esquivou!' : 'Errou') : f.dmg ? '−' + f.dmg : ''; // golpe de apoio sem número não ganha legenda
    const rp = o.replay ? ' replay' : '';
    if (f.crit && !f.miss) posFx('chroma', f.id);
    if (num) floatNum(el, num, (f.heal ? 'heal' : f.miss ? 'miss' : f.crit ? 'crit' : f.w ? 'weak' : '') + rp, i, f);
    if (G) setTimeout(() => floatNum(el, '= −' + G.total, 'total' + rp, i + 1, f), 200); // multi-hit: o total depois do último
    if (/QUEBROU!/.test(e.text)) setTimeout(() => shatter(el), 120);
    if (koNow) { setTimeout(() => knockout(f.id), 260);
      const sl = p3 && PFX.slowFor({ ko: true, lastFoe: !!S.chars[f.id]?.enemy && !foeLeft(f.id), reduced: calm() });
      if (sl && typeof CENA !== 'undefined') { CENA.slow(sl.f, sl.ms); if (sl.zoom) { PALCO3D.focus(f.id, [], 300); PALCO3D.vignette(sl.ms); posFx('invert'); posFx('shock', f.id, { strength: 1 }); } } }
  };
  // golpes do mesmo grupo (multi-hit) caem a 140 ms um do outro; devolve quando o último cai
  const hits = d0 => { let k = 0, last = d0; for (const G of (typeof PFX !== 'undefined' ? PFX.groupHits(acts) : acts.map(e => ({ parts: [e], total: 0 }))))
    G.parts.forEach((e, j) => { const i = k++, at = d0 + i * 140; last = at; setTimeout(() => hit1(e, i, j, G.parts.length, G.parts.length > 1 && j === G.parts.length - 1 ? G : null), at); });
    setTimeout(done, last + 500); };
  const animate = () => {
    if (!engine) return void hits(220);
    const run = ANIMFX.play({ actorId: f0.a, targetIds: acts.map(e => e.fx.id), skill: sk, fx: f0 });
    run.impact.then(() => hits(0));
    if (cam && !go && PALCO3D.follow) PALCO3D.follow(f0.a, [...new Set(acts.map(e => e.fx.id))], Math.round(run.profile.duration * run.profile.impact)); // à distância: a câmera viaja com o efeito até o alvo
    if (cam) run.done.then(() => PALCO3D.hold(acts.length * 90 + 650)); // os números nascem antes da câmera seguir para o próximo turno
  };
  const cam = stage3d() && !old && typeof PALCO3D !== 'undefined' && PALCO3D.focus;
  const aim = cam && !go ? PALCO3D.focus(f0.a, acts.map(e => e.fx.id)) : null;
  if (go) go.then(animate); else if (aim) aim.then(animate); else animate();
  return fin;
}
function threat(c) { // turno inimigo: o palco escurece, faixa vermelha e o inimigo dá um passo à frente
  threatUntil = performance.now() + 1300; fxState();
  fxAdd('threat', `${stage3d() ? `<i class="th-por">${portrait(c)}</i>` : ''}<div><small>Turno inimigo</small><b>${esc(c.name)}</b></div>`, 1300); sfxc('threat');
}
function intro() { // abertura: os dois lados entram e a faixa "Batalha!" corta a tela
  enterUntil = performance.now() + 1400; fxState();
  const fs = Object.values(S.chars).filter(c => c.id in S.battle.ticks && c.enemy).map(c => esc(c.name));
  const inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks && c.hp > 0), boss = inB.find(c => c.enemy && c.boss);
  if (stage3d() && typeof PVIDA !== 'undefined') PVIDA.enter(inB.filter(c => !c.enemy).map(c => c.id), inB.filter(c => c.enemy).map(c => c.id));
  if (boss) setTimeout(() => fxAdd('bossband', `${stage3d() ? `<i class="th-por">${portrait(boss)}</i>` : ''}<div><small>Chefe</small><b>${esc(boss.name)}</b></div>`, 1600), 900);
  fxAdd('intro', `<i class="in-l"></i><i class="in-r"></i><div><b>Batalha!</b><small>${fs.slice(0, 4).join(' · ')}${fs.length > 4 ? ` e mais ${fs.length - 4}` : ''}</small></div>`, 1700); sfxc('start');
  if (typeof ANIMFX !== 'undefined') setTimeout(() => Object.values(S.chars).filter(c => c.id in S.battle.ticks && c.hp > 0).forEach((c, i) => {
    const p = (c.skills || []).map(SK).find(s => s?.kind === 'passive'); if (p) setTimeout(() => ANIMFX.play({ actorId: c.id, targetIds: [c.id], skill: { ...p, anim: 'form' }, fx: { a: c.id, id: c.id, s: p.name, el: p.el, passive: 1 } }), i * 80);
  }), 900);
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
// fim da batalha no 3D: o palco fica mais um pouco para a pose final (vitória, derrota ou retirada)
function endFx(k) {
  const hs = Object.values(S.chars).filter(c => !c.enemy && PALCO3D.unitOf(c.id)).map(c => c.id), up = hs.filter(id => S.chars[id].hp > 0), V = typeof PVIDA !== 'undefined' ? PVIDA : null;
  if (k === 'win') { PALCO3D.linger(2600); V?.pose(up, 'vit', 150); PALCO3D.orbitGroup(up, 60, 1800); }
  else if (k === 'lose') { PALCO3D.linger(3000); document.querySelector('.p3d')?.classList.add('derrota'); V?.pose(hs, 'cai', 250); fxAdd('endband lose', '<b>Derrota</b>', 2800); }
  else { PALCO3D.linger(2200); V?.pose(up, 'foge', 120); fxAdd('endband flee', '<b>Retirada</b>', 2000); }
}
// replay só nesta tela: refaz a coreografia de um golpe do log sem tocar em KO, barras ou turno
function replayAct(n) {
  if (!S.battle?.active || !stage3d()) return toast('Só dá para rever durante a batalha.');
  if (busyUntil > performance.now()) return toast('Espere o golpe atual terminar.');
  const acts = typeof PFX !== 'undefined' ? PFX.actsAround(S.log, n) : []; if (!acts.length) return;
  const tag = fxAdd('rpltag', 'Replay', 6000); impact(acts.map(e => ({ ...e })), { replay: true }).then(() => tag.remove());
}
function fxState() { // reaplica o que um redesenho apagaria: KO adiado, palco ameaçador, abertura e marcas temporárias
  const now = performance.now(), st = app.querySelector('.stage') || stage3d();
  st?.classList.toggle('threat', now < threatUntil); st?.classList.toggle('enter', now < enterUntil);
  for (const [id, until] of koHold) { if (now > until) { koHold.delete(id); if (S.chars[id]?.hp <= 0) document.querySelector(`.unit[data-tgt="${id}"]`)?.classList.add('ko'); continue; } document.querySelector(`.unit[data-tgt="${id}"]`)?.classList.remove('ko'); }
  for (let i = fxMarks.length - 1; i >= 0; i--) { const m = fxMarks[i]; if (now > m.until) { fxMarks.splice(i, 1); continue; } document.querySelectorAll(m.sel).forEach(el => el.classList.add(m.cls)); }
  if (typeof ANIMFX !== 'undefined') ANIMFX.sync();
}
function fx() {
  const news = seen == null ? [] : S.log.filter(e => e.n > seen), B = S.battle, cur = B.active ? S.chars[timeline(1)[0]] : null;
  const rolls = news.filter(e => e.rr), acts = news.filter(e => e.fx).slice(-8), quick = B.active, wait = acts.some(e => e.d) ? (quick ? NUM_MS : DICE_MS) : 0;
  app.querySelectorAll('[data-bid]').forEach(el => { // a barra escoa do valor anterior até o novo, depois do dado
    const k = el.dataset.bid, p = el.dataset.p, old = lastPct.get(k);
    if (old != null && old !== p) { el.style.transition = 'none'; el.style.width = old + '%'; el.offsetWidth; el.style.transition = ''; const d0 = wait + (acts.some(e => e.fx.lim || e.fx.dom) ? 1100 : 0), T = typeof PFX !== 'undefined' ? PFX.trailPlan(+old, +p) : null;
      el.style.transitionDelay = (d0 + (T ? T.bar.delay : 0)) + 'ms'; el.style.width = p + '%';
      if (T && el.parentElement) { const par = el.parentElement; let t = par.querySelector(':scope > .trail'); if (!t) { t = document.createElement('i'); t.className = 'trail'; par.insertBefore(t, el); if (getComputedStyle(par).position === 'static') par.style.position = 'relative'; }
        t.classList.toggle('heal', T.heal); t.style.transition = 'none'; t.style.width = old + '%'; t.offsetWidth; t.style.transition = ''; t.style.transitionDelay = (d0 + T.trail.delay) + 'ms'; t.style.width = p + '%'; } }
    lastPct.set(k, p);
  });
  // quem caiu nesta leva só "cai" quando o golpe chega
  if (B.active) for (const c of Object.values(S.chars)) { if (!(c.id in B.ticks) && !c.dead) continue; const was = hpPrev.get(c.id); if (was > 0 && c.hp <= 0 && seen != null) koHold.set(c.id, performance.now() + wait + 2600); if (was != null && seen != null && c.hp < was) dropPct.set(c.id, (was - c.hp) / (c.hpMax || 1)); hpPrev.set(c.id, c.hp); }
  else hpPrev.clear();
  // condições novas entram com um pulo; dano contínuo e regeneração fazem o ícone pulsar
  for (const c of Object.values(S.chars)) { const ks = Object.keys(c.st || {}), was = stPrev.get(c.id); if (was && seen != null) ks.filter(k => !was.includes(k)).forEach(k => mark(`.unit[data-tgt="${c.id}"] .sti[data-st="${k}"],.pm[data-tgt="${c.id}"] .sti[data-st="${k}"]`, 'new', 700)); stPrev.set(c.id, ks); }
  news.filter(e => e.fx && !e.fx.a).forEach(e => mark(`.unit[data-tgt="${e.fx.id}"] .sti,.pm[data-tgt="${e.fx.id}"] .sti`, 'tick', 800));
  seen = S.seq;
  fxState(); applyCine(false); // um redesenho no meio da cena mantém o enquadramento
  if (B.active && wasActive === false) intro();
  wasActive = !!B.active;
  if (rolls.length) (quick ? numRoll : dicePanel)(rolls.at(-1), rolls.filter(e => e.rr.atk).length);
  if (acts.length) { busyUntil = performance.now() + wait + 8000; setTimeout(() => impact(acts), wait); }
  const plain = news.filter(e => !e.fx).at(-1), win = news.find(e => /^Vitória!/.test(e.text));
  if (role === 'table' && plain && !win) { // legenda discreta para o que não é golpe
    document.querySelector('.caption')?.remove(); clearTimeout(capT);
    const cp = document.createElement('div'); cp.className = 'caption'; cp.innerHTML = `<b>${esc(plain.who)}</b>${esc(plain.text)}`; document.body.append(cp); capT = setTimeout(() => cp.remove(), 6000);
  }
  const endE = news.find(e => e.end); if (endE && stage3d() && typeof PALCO3D !== 'undefined') endFx(endE.end);
  if (win?.res) setTimeout(() => results(win), endE?.end === 'win' && stage3d() ? 2000 : 400);
  else if (win) { const v = document.createElement('div'); v.className = 'victory'; v.innerHTML = `<b>Vitória</b><span>${esc(win.text.replace(/^Vitória!\s*/, ''))}</span>`; document.body.append(v); setTimeout(() => v.remove(), 6500); }
  if (cur && cur.id !== lastCur && lastCur !== undefined) {
    const later = wait + (acts.length ? 900 : 0); // a vez troca depois que o golpe anterior terminou
    if (cur.enemy) setTimeout(() => threat(cur), later);
    else setTimeout(() => { const mineT = role === 'player' && mine(cur), txt = mineT ? 'Seu turno' : 'Turno de ' + esc(cur.name); if (stage3d()) fxAdd(`turncut ${mineT ? 'me' : ''}`, `<i class="tc-por">${portrait(cur)}</i><b>${txt}</b>`, 900, `--c:${esc(cur.color)}`); else fxAdd(`banner ${mineT ? 'me' : ''}`, txt, 1100, `--c:${esc(cur.color)}`); if (mineT) navigator.vibrate?.([60, 40, 60]); }, later);
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
    for (const k of c.skills || []) if (!p.sk.includes(k)) out.push(['sk', 'Nova skill', SK(k)?.name || k, k]);
    if (c.xp > p.xp) out.push(['xp', 'Experiência', `+${c.xp - p.xp} XP`]);
    if (c.gold !== p.gold) out.push(['gold', 'Ouro', `${c.gold > p.gold ? '+' : '−'}${Math.abs(c.gold - p.gold)}`]);
    for (const [k, q] of Object.entries(c.inv)) if (q > (p.inv[k] || 0)) out.push(['it', 'Item', `${S.items[k]?.name || k}${q - (p.inv[k] || 0) > 1 ? ' ×' + (q - (p.inv[k] || 0)) : ''}`]);
    for (const [k, l, v, id] of out.slice(0, 4)) { const i = n++;
      setTimeout(() => { fxAdd('gain g-' + k, `<small>${esc(c.name)} · ${l}</small><b>${esc(v)}</b>`, 2800, `--i:${i % 4}`); if (k === 'sk' && typeof ANIMFX !== 'undefined') { const s = SK(id); ANIMFX.play({ actorId: c.id, targetIds: [c.id], skill: { ...s, anim: 'form' }, fx: { a: c.id, id: c.id, s: s?.name, el: s?.el, passive: s?.kind === 'passive' } }); } if (!snd.mute) tone(k === 'sk' ? 880 : 660, .14, { type: 'triangle', g: .08, to: k === 'sk' ? 1320 : 990 }); }, i * 320); }
  }
}

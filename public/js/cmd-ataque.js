// ===== Comandos de ataque no palco cinemático: antes de mandar o golpe, a técnica com `cmd` abre um minigame; a nota vai junto no `act`. =====
// Ignorar, pular (Esc/botão) ou deixar o prazo (6 s) passar manda g:'' (golpe normal, sem punição). Só tentar e errar feio manda g:'erro' (×0,85).
// runCmd(skillKey, hero, target, done): done({ g, n, acc }) é chamado uma vez. Devolve false se já há um palco aberto.
// Janelas, metas e fintas vêm de RULES.CMD.tune (nível do nó pelo requisito); o resultado na tela vem de RULES.CMD.resultLines.
{
  const css = document.createElement('style');
  css.textContent = `.cm{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:Barlow,sans-serif}
.cm-ring{position:relative;width:100%;aspect-ratio:1/1}.cm-ring i,.cm-ring u,.cm-ring em{position:absolute;inset:0;border-radius:50%;pointer-events:none;will-change:transform}
.cm-ring i{border:7px solid var(--ac);box-shadow:0 0 24px var(--ac),inset 0 0 24px var(--ac)}.cm-ring i.fk{border-color:#b266ff;box-shadow:0 0 24px #b266ff}
.cm-ring u{border:3px dashed rgba(255,255,255,.55)}.cm-ring u.o{border-color:#7dffb0}.cm-ring u.p{border-color:#ffd24a;border-style:solid}
.cm-ring b{position:absolute;left:35%;top:35%;width:30%;height:30%;border-radius:50%;background:#fff;box-shadow:0 0 30px #fff,0 0 70px var(--ac)}
.cm-bar{position:relative;width:92%;height:15%;border-radius:999px;background:#150d20;border:4px solid #000;box-shadow:0 0 0 3px var(--ac);overflow:hidden}
.cm-bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,var(--ac2),var(--ac))}
.cm-bar em{position:absolute;top:0;bottom:0}.cm-bar em.b{background:rgba(255,255,255,.28)}.cm-bar em.o{background:rgba(125,255,176,.5)}.cm-bar em.p{background:rgba(255,210,74,.85)}
.cm-big{font:900 italic clamp(70px,24vmin,200px)/1 Barlow,sans-serif;-webkit-text-stroke:.07em #000;paint-order:stroke fill;text-shadow:.05em .05em 0 #000;margin-bottom:4%}
.cm-orb{position:absolute;border-radius:50%;background:radial-gradient(#fff,var(--ac) 60%,transparent 72%);left:50%;top:34%;transform:translate(-50%,-50%);pointer-events:none}
.cm-keys{display:flex;gap:2.4%;width:96%;justify-content:center}.cm-keys span{position:relative;flex:1;max-width:96px;aspect-ratio:1/1;border-radius:14px;background:#1a1226;border:4px solid #000;box-shadow:0 0 0 3px #4a3a66;display:flex;align-items:center;justify-content:center;font:900 clamp(30px,9vmin,64px)/1 Barlow,sans-serif}
.cm-keys span i{position:absolute;inset:-6px;border:5px solid var(--ac);border-radius:18px;pointer-events:none}
.cm-keys span.now{background:var(--ac);box-shadow:0 0 0 3px #fff,0 0 26px var(--ac)}.cm-keys span.ok{background:#1fb86a}.cm-keys span.miss{background:#7a1020}
.cm-pad{display:flex;gap:10px;margin-top:5%}.cm-pad button{width:64px;height:64px;border-radius:14px;border:3px solid #000;background:#2a1f3a;color:#fff;font:900 30px/1 Barlow,sans-serif;box-shadow:0 0 0 2px var(--ac)}
.cm-lane{position:relative;width:34%;height:100%;border-radius:14px;background:rgba(10,6,16,.7);border:4px solid #000;box-shadow:0 0 0 3px var(--ac);overflow:hidden}
.cm-lane .line{position:absolute;left:0;right:0;top:80%;height:8px;background:var(--ac);box-shadow:0 0 18px var(--ac)}
.cm-lane i{position:absolute;left:50%;width:44%;aspect-ratio:1/1;border-radius:50%;background:#fff;border:5px solid var(--ac);transform:translate(-50%,-50%)}.cm-lane i.ok{background:#1fb86a;border-color:#fff}.cm-lane i.miss{background:#555;border-color:#333}
.cm-aim{position:relative;width:min(78%,58vmin);aspect-ratio:220/260;border-radius:12px;background:#0d0814;border:4px solid #000;box-shadow:0 0 0 3px var(--ac);overflow:hidden;cursor:crosshair;touch-action:none}
.cm-aim .sil{position:absolute;inset:6%;opacity:.5;background:center/contain no-repeat}.cm-aim .pt{position:absolute;border-radius:50%;border:3px solid #ffd24a;background:rgba(255,210,74,.2);transform:translate(-50%,-50%);animation:cmpt .9s infinite alternate}
.cm-aim .xh{position:absolute;width:46px;height:46px;border-radius:50%;border:3px solid #ff2b3d;transform:translate(-50%,-50%);box-shadow:0 0 14px #ff2b3d}
.cm-aim .xh:before,.cm-aim .xh:after{content:'';position:absolute;background:#ff2b3d;left:50%;top:50%}.cm-aim .xh:before{width:3px;height:92px;margin:-46px 0 0 -1.5px}.cm-aim .xh:after{height:3px;width:92px;margin:-1.5px 0 0 -46px}
@keyframes cmpt{to{box-shadow:0 0 18px #ffd24a;transform:translate(-50%,-50%) scale(1.12)}}
.cm canvas{width:min(100%,100%);aspect-ratio:1/1;border-radius:14px;background:rgba(10,6,16,.75);border:4px solid #000;box-shadow:0 0 0 3px var(--ac);touch-action:none}
.cm-skip{position:absolute;right:12px;bottom:calc(11vh + 64px);z-index:11;font:800 14px/1 Barlow,sans-serif;letter-spacing:2px;padding:12px 18px;min-height:44px;border-radius:8px;border:2px solid #fff;background:rgba(0,0,0,.6);color:#fff;pointer-events:auto}
@media (max-width:599px){.cm-skip{bottom:calc(8vh + 72px)}}`;
  document.head.append(css);
  const ARROW = { ArrowUp: '↑', KeyW: '↑', ArrowRight: '→', KeyD: '→', ArrowDown: '↓', KeyS: '↓', ArrowLeft: '←', KeyA: '←' };
  const PART_POS = { head: [.5, .14], torso: [.5, .42], armL: [.22, .42], armR: [.78, .42], legL: [.38, .8], legR: [.62, .8] };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const hashN = str => { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  const pressSound = { tempo: 'cmdPress', martelar: 'cmdMash', segurar: 'cmdPress', seq: 'cmdCut',
    ritmo: 'cmdNote', mira: 'cmdShot', runa: 'cmdRune' };
  let busy = false;

  window.runCmd = (key, hero, tgt, done) => {
    const s = S.skills[key]; if (busy || !s?.cmd || !['tempo', 'martelar', 'segurar', 'seq', 'ritmo', 'mira', 'runa'].includes(s.cmd)) return false;
    const stage = openStage({ title: s.name, tone: 'atk', el: s.el, hero, foe: tgt }); if (!stage) return false;
    busy = true;
    const CM = RULES.CMD, mods = hero?.cm?.[key] || {}, T = CM.tune(s, mods), tier = CM.tier(s), k = s.cmd, ui = stage.ui;
    if (typeof sampleAudio !== 'undefined') sampleAudio.warm([
      pressSound[k], 'cmdGood', 'cmdPerfect', 'cmdMiss',
      ...(k === 'segurar' ? ['cmdCharge', 'cmdOver'] : k === 'tempo' ? ['cmdBeat'] : []),
    ]);
    stage.sfx('cmdReady');
    const sub = tier ? (tier === 2 ? ' · difícil' : ' · médio') : ''; let over = false, rafId = 0; const timers = [], loops = [];
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    const T0 = performance.now() + 380; // o tempo do minigame começa depois da abertura do palco
    let cc = null; const centre = () => { if (!cc) { const b = ui.getBoundingClientRect(); cc = [b.left + b.width / 2, b.top + b.height / 2]; } return cc; }; addEventListener('resize', () => { cc = null; });
    const tap = (x, y, col, n = 10) => { stage.fx.burst(x ?? centre()[0], y ?? centre()[1], n, col); stage.sfx(pressSound[k]); stage.buzz(10); };
    let onPress = () => {}, onRelease = () => {}, onArrow = () => {};
    const cleanup = () => { removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKeyUp, true); cancelAnimationFrame(rafId); timers.forEach(clearTimeout); skip.remove(); busy = false; };
    const finish = (g = '', n = 0, acc = 0) => { // devolve a nota uma vez, mostra o resultado e fecha o palco
      if (over) return; over = true; cleanup(); const c = { g, n, acc }; done(c);
      if (!g && acc >= 0) { stage.close(160); return; }
      const e = CM.cmdEffect(s, c), r = CM.resultLines(s, c, e, mods); if (acc < 0 && !g) r.title = 'ESTOUROU!';
      const f = stage.fx; if (g === 'perf') { f.flash('#ffd24a', 200); f.shake(16, 320); f.hitstop(90); f.word('PERFEITO!', { color: '#ffd24a' }); stage.sfx('cmdPerfect'); stage.buzz([30, 40, 60]); }
      else if (g === 'otimo') { f.flash('#7dffb0', 150); f.shake(9, 240); f.hitstop(60); stage.sfx('cmdGood'); } else if (g === 'bom') { f.shake(5, 200); stage.sfx('cmdGood'); } else { f.flash('#ff2b3d', 120); if (acc >= 0) stage.sfx('cmdMiss'); stage.buzz(80); }
      stage.result(g || 'erro', r, 900).then(() => stage.close());
    };
    const evT = e => { const n = performance.now(); return e.timeStamp > 0 && e.timeStamp <= n ? e.timeStamp : n; }; // o instante em que a tecla/toque chegou, não o em que o navegador achou tempo de tratá-lo
    function onKey(e) { if (e.repeat) { if (e.code === 'Space') e.preventDefault(); return; }
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); return finish(); }
      if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); onPress(evT(e)); }
      else if (ARROW[e.code]) { e.preventDefault(); e.stopPropagation(); onArrow(ARROW[e.code], evT(e)); } }
    function onKeyUp(e) { if (e.code === 'Space') { e.preventDefault(); onRelease(evT(e)); } }
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKeyUp, true);
    const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'cm-skip'; skip.textContent = 'PULAR (Esc)'; skip.onclick = () => finish(); stage.root.append(skip);
    const loop = () => { if (over) return; const now = performance.now(); loops.forEach(f => f(now)); rafId = requestAnimationFrame(loop); }; rafId = requestAnimationFrame(loop);
    ui.innerHTML = '<div class="cm"></div>'; const body = ui.firstChild;
    if (k !== 'mira' && k !== 'runa' && k !== 'seq') stage.root.addEventListener('pointerdown', e => { if (e.target.closest('.cm-skip,.sc-res')) return; e.preventDefault(); onPress(evT(e)); }); // a tela toda vale, não só o quadrado do minigame
    ui.style.touchAction = 'none'; stage.root.style.touchAction = 'none'; stage.root.addEventListener('pointerup', e => onRelease(evT(e))); stage.root.addEventListener('pointercancel', e => onRelease(evT(e)));
    later(() => finish(), k === 'ritmo' ? 12000 : 6400); // prazo: sem nota, o golpe sai normal

    if (k === 'tempo') { // anel que fecha sobre o alvo: aperte no impacto (nível médio acelera e freia; difícil tem anel falso)
      const { bom, otimo, perf } = T.tempo, dur = [900, 850, 800][tier], hit = T0 + dur, a = [0, .5, .7][tier], f2 = f => f + a * Math.sin(2 * Math.PI * f) / (2 * Math.PI), sc = (ms, t0 = T0, d = dur) => .3 + .7 * (1 - f2(clamp((ms - t0) / d)));
      const fakeT = tier === 2 ? T0 + dur * .55 : 0; stage.setHint('Aperte (Espaço ou toque) quando o anel encostar no centro!' + sub);
      body.innerHTML = `<div class="cm-ring"><u style="transform:scale(${sc(hit - bom)})"></u><u class="o" style="transform:scale(${sc(hit - otimo)})"></u><u class="p" style="transform:scale(${sc(hit - perf)})"></u>${fakeT ? '<i class="fk"></i>' : ''}<i class="r"></i><b></b></div>`;
      const ring = body.querySelector('i.r'), fk = body.querySelector('i.fk'); let lastTick = 0; stage.fx.speed(true);
      loops.push(now => { ring.style.transform = `scale(${sc(now)})`; if (fk) { fk.style.transform = `scale(${sc(now, T0, fakeT - T0)})`; fk.style.opacity = now > fakeT ? Math.max(0, 1 - (now - fakeT) / 160) : 1; } if (now - lastTick > 220 - 150 * clamp((now - T0) / dur)) { lastTick = now; if (now > T0) stage.sfx('cmdBeat'); } });
      onPress = now => { if (now < T0 - 200) return; if (fakeT && Math.abs(now - fakeT) <= 120) { tap(null, null, '#b266ff', 14); return finish('erro', 0, 0); }
        const d = Math.abs(now - hit); tap(null, null, '#fff', 22); stage.fx.word(d <= perf ? 'ZAN!' : d <= bom ? 'ZAN' : 'ZAN…', { color: d <= bom ? '#fff' : '#9aa' });
        finish(d <= perf ? 'perf' : d <= otimo ? 'otimo' : d <= bom ? 'bom' : 'erro', 0, Math.max(0, 1 - d / bom)); };
      later(() => finish(), dur + 380 + bom + 250);
    } else if (k === 'martelar') { // aperte o máximo de vezes em 2 s
      const mx = (s.mx || 0) + (mods.mx || 0), meta = T.martelarMeta, dur = 2000; let taps = 0; stage.setHint('MARTELE Espaço (ou toque) o mais rápido que puder!' + sub);
      body.innerHTML = `<div style="width:100%;text-align:center"><div class="cm-big">0<small style="font-size:.35em">/${meta}</small></div><div class="cm-bar"><i></i></div></div>`;
      const big = body.querySelector('.cm-big'), bar = body.querySelector('i'); let t1 = 0; stage.fx.speed(true);
      const end = () => { const f = Math.min(1, taps / meta); finish(CM.gradeFrac(f, taps > 0), Math.round(f * mx), f); };
      loops.push(now => { if (t1 && now - t1 > dur) end(); });
      onPress = now => { if (now < T0 - 200) return; if (!t1) t1 = now; taps++; const f = Math.min(1, taps / meta); big.firstChild.nodeValue = taps; bar.style.width = f * 100 + '%'; big.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], 90);
        tap(null, null, undefined, 6); stage.fx.shake(2 + 8 * f, 120); if (taps >= meta) { stage.fx.word('DON!'); end(); } };
    } else if (k === 'segurar') { // segure e solte na faixa; passar do topo estoura
      const dur = 1600, B = T.segurar, pTop = 1 - B.perf, oTop = pTop - B.otimo, bTop = oTop - B.bom; let t1 = 0, lastCh = 0; stage.setHint('SEGURE Espaço (ou o toque) e solte na faixa dourada. Passou do topo, estoura!' + sub);
      body.innerHTML = `<div class="cm-orb" style="width:26%;height:26%"></div><div class="cm-bar" style="margin-top:34%"><em class="b" style="left:${bTop * 100}%;width:${(oTop - bTop) * 100}%"></em><em class="o" style="left:${oTop * 100}%;width:${B.otimo * 100}%"></em><em class="p" style="left:${pTop * 100}%;width:${B.perf * 100}%"></em><i></i></div>`;
      const bar = body.querySelector('.cm-bar i'), orb = body.querySelector('.cm-orb'), vOf = u => tier === 0 ? u : tier === 1 ? Math.pow(u, 1.4) : u + .08 * Math.sin(4 * Math.PI * u);
      onPress = now => { if (!t1 && now >= T0 - 200) { t1 = now; stage.buzz(15); } };
      onRelease = now => { if (!t1) return; const v = vOf((now - t1) / dur); tap(null, null, '#ffd24a', 24); finish(v >= pTop ? 'perf' : v >= oTop ? 'otimo' : v >= bTop ? 'bom' : 'erro', 0, clamp(v)); };
      loops.push(now => { if (!t1) return; const v = vOf((now - t1) / dur); bar.style.width = clamp(v) * 100 + '%'; orb.style.width = orb.style.height = 26 + 56 * clamp(v) + '%'; if (now - lastCh > 110) { lastCh = now; stage.sfx('cmdCharge', clamp(v)); }
        if (v > 1.02) { stage.fx.flash('#ff2b3d', 260); stage.fx.shake(18, 300); stage.sfx('cmdOver'); finish('', 0, -1); } });
      stage.fx.speed(false);
    } else if (k === 'seq') { // setas na batida, cada uma na sua hora
      const seq = [...s.seq], gaps = tier === 2 ? [400, 600, 400, 700] : [500], lead = 700, tol = T.seqTol, at = []; let acc = T0 + lead; seq.forEach((_, i) => { at.push(acc); acc += gaps[i % gaps.length]; });
      const st = seq.map(() => ''); let tried = false; stage.setHint('Aperte as setas (ou WASD) quando cada anel fechar!' + sub);
      body.innerHTML = `<div style="width:100%;display:flex;flex-direction:column;align-items:center"><div class="cm-keys">${seq.map(a => `<span><i></i>${a}</span>`).join('')}</div><div class="cm-pad">${['←', '↑', '↓', '→'].map(a => `<button type="button" data-a="${a}">${a}</button>`).join('')}</div></div>`;
      const spans = [...body.querySelectorAll('.cm-keys span')]; body.querySelectorAll('.cm-pad button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); onArrow(b.dataset.a, evT(e)); }));
      onArrow = (a, now) => { tried = true; const i = seq.findIndex((_, j) => !st[j] && Math.abs(now - at[j]) <= tol); if (i < 0) { stage.sfx('cmdMiss'); stage.buzz(40); return; }
        if (seq[i] === a) { st[i] = 'ok'; spans[i].className = 'ok'; const r = spans[i].getBoundingClientRect(); tap(r.left + r.width / 2, r.top + r.height / 2, '#fff', 16); stage.fx.word('ZAN!', { x: r.left + r.width / 2, y: r.top - 20 }); } else { st[i] = 'miss'; spans[i].className = 'miss'; stage.sfx('cmdMiss'); stage.buzz(60); } };
      loops.push(now => seq.forEach((_, i) => { const ring = spans[i].firstChild; ring.style.transform = `scale(${1 + clamp((at[i] - now) / 600) * 1.6})`; ring.style.opacity = st[i] ? 0 : clamp(1 - (at[i] - now) / 900);
        if (st[i]) return; if (now > at[i] + tol) { st[i] = 'miss'; spans[i].className = 'miss'; } else if (now >= at[i] - tol) spans[i].className = 'now'; }));
      later(() => { const n = st.filter(x => x === 'ok').length; finish(CM.gradeFrac(n / seq.length, tried), n, n / seq.length); }, at[seq.length - 1] - performance.now() + tol + 200);
    } else if (k === 'ritmo') { // notas descendo numa pista (nível difícil tem notas coladas)
      const nt = T.ritmoNotas, lead = 1000, tol = T.ritmoTol, at = []; let acc = T0 + lead; for (let i = 0; i < nt; i++) { at.push(acc); acc += tier === 2 && i % 3 === 1 ? 230 : 560; }
      const st = Array(nt).fill(''); let tried = false; stage.setHint('Aperte Espaço (ou toque) quando cada nota passar pela linha!' + sub);
      body.innerHTML = `<div class="cm-lane"><div class="line"></div>${Array.from({ length: nt }, () => '<i></i>').join('')}</div>`; const lane = body.firstChild, notes = [...lane.querySelectorAll('i')];
      onPress = now => { tried = true; const i = st.findIndex((x, j) => !x && Math.abs(now - at[j]) <= tol); if (i >= 0) { st[i] = 'ok'; notes[i].className = 'ok'; const r = notes[i].getBoundingClientRect(); tap(r.left + r.width / 2, r.top + r.height / 2, '#7dffb0', 12); } else { stage.sfx('cmdMiss'); stage.buzz(40); } };
      loops.push(now => { const H = lane.clientHeight; notes.forEach((nEl, i) => { nEl.style.top = H * .8 - (at[i] - now) / 1000 * H * .55 + 'px'; if (!st[i] && now > at[i] + tol) { st[i] = 'miss'; nEl.className = 'miss'; } }); });
      later(() => { const n = st.filter(x => x === 'ok').length; finish(CM.gradeFrac(n / nt, tried), n, n / nt); }, at[nt - 1] - performance.now() + tol + 250);
    } else if (k === 'mira') { // mira oscilando: clique no ponto fraco (nível médio muda de direção; difícil move o ponto)
      const dur = 2600; stage.setHint('Clique (ou Espaço) quando a mira passar sobre o ponto fraco!' + sub);
      const pos = PART_POS[tgt?.weakPart]; let sx = (hashN(tgt?.id || 'x') % 60 + 20) / 100, sy = (hashN((tgt?.id || 'x') + 'y') % 60 + 20) / 100; if (pos) { sx = pos[0]; sy = pos[1]; }
      body.innerHTML = `<div class="cm-aim"><div class="sil" ${tgt?.img ? `style="background-image:url('${esc(tgt.img)}')"` : ''}></div><div class="pt"></div><div class="xh"></div></div>`;
      const box = body.firstChild, pt = box.querySelector('.pt'), xh = box.querySelector('.xh'); let cx = 0, cy = 0, W = 1, Hh = 1, px = sx, py = sy, rr = 1;
      loops.push(now => { const b = box.getBoundingClientRect(); W = b.width; Hh = b.height; rr = T.mira / 100 * W / 2; const t = (now - T0) / 1000, sw = tier ? Math.floor(t / .8) % 2 ? -1 : 1 : 1;
        px = tier === 2 ? sx + Math.sin(t * 1.6) * .08 : sx; py = tier === 2 ? sy + Math.cos(t * 1.3) * .06 : sy; pt.style.left = px * W + 'px'; pt.style.top = py * Hh + 'px'; pt.style.width = pt.style.height = rr * 2 + 'px';
        cx = W / 2 + Math.sin(t * 2.6 * sw + 1) * W * .46; cy = Hh / 2 + Math.sin(t * 3.7 + 1) * Hh * .44; xh.style.left = cx + 'px'; xh.style.top = cy + 'px'; });
      const shoot = () => { const d = Math.hypot(cx - px * W, cy - py * Hh), g = d <= rr * .4 ? 'perf' : d <= rr * .7 ? 'otimo' : d <= rr ? 'bom' : 'erro'; const b = box.getBoundingClientRect(); tap(b.left + cx, b.top + cy, '#ffd24a', 22); stage.fx.word(g === 'erro' ? 'MISS' : 'BANG!', { color: g === 'erro' ? '#999' : '#ffd24a' }); finish(g, 0, Math.max(0, 1 - d / W)); };
      onPress = now => { if (now >= T0 - 200) shoot(); }; box.addEventListener('pointerdown', e => { e.preventDefault(); if (evT(e) >= T0 - 200) shoot(); }); later(() => finish(), dur + 380 + 250);
    } else if (k === 'runa') { // desenhar o símbolo com o mouse ou o dedo
      const rune = s.rn || ['circulo', 'triangulo', 'estrela', 'espiral'][Math.max(0, Math.min(3, (s.circ || 1) - 1))], NAMES = { circulo: 'um círculo', triangulo: 'um triângulo', estrela: 'uma estrela', espiral: 'uma espiral', raio: 'um raio', onda: 'uma onda' }, R = T.runa;
      stage.setHint(`Desenhe ${NAMES[rune]} (4 s). Solte para conjurar!` + sub); body.innerHTML = '<canvas width="480" height="480"></canvas>';
      const cv = body.firstChild, g = cv.getContext('2d'), pts = []; let down = false;
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([2, 18]); g.beginPath(); CM.RUNE_T[rune].pts.forEach(([x, y], i) => { const X = 60 + x * 360, Y = 60 + y * 360; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); g.setLineDash([]);
      const at = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * 480, (e.clientY - b.top) / b.height * 480]; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); down = true; const p = at(e); pts.push(p); g.strokeStyle = '#ffd24a'; g.shadowColor = '#ff7a1a'; g.shadowBlur = 18; g.lineWidth = 10; g.beginPath(); g.moveTo(...p); });
      cv.addEventListener('pointermove', e => { if (!down) return; const p = at(e); pts.push(p); g.lineTo(...p); g.stroke(); if (pts.length % 4 === 0) stage.fx.burst(e.clientX, e.clientY, 2, '#ffb84a'); });
      const end = () => { if (over) return; const sc = Math.min(100, CM.runeScore(pts, rune)); // as passivas `rn` já baixaram os limites em tune()
        if (pts.length >= 4) tap(null, null, '#ffd24a', 30);
        if (sc >= R.perf) stage.fx.word('✦', { color: '#ffd24a' });
        finish(pts.length < 4 ? '' : sc >= R.perf ? 'perf' : sc >= R.otimo ? 'otimo' : sc >= R.bom ? 'bom' : 'erro', 0, sc / 100); };
      cv.addEventListener('pointerup', () => { if (down) { down = false; end(); } }); later(end, 4000 + 380);
    }
    return true;
  };
}

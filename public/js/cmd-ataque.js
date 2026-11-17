// ===== Comandos de ataque: antes de mandar o golpe, a técnica com `cmd` abre um minigame; a nota (Bom/Perfeito) vai junto no `act`. =====
// Ignorar, errar ou deixar o prazo (6 s) passar manda o golpe normal: o comando só soma bônus. Esc pula. Tempo e nota são medidos aqui e o servidor limita os valores.
// runCmd(skillKey, hero, target, done): done({ g: ''|'bom'|'perf', n, acc }) é chamado uma vez. Devolve false se já há um minigame aberto.
{
  const css = document.createElement('style');
  css.textContent = `.cmdo{position:fixed;inset:0;z-index:56;display:flex;align-items:center;justify-content:center;background:rgba(6,4,12,.55)}
.cmdo-box{display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 22px;border-radius:14px;background:rgba(12,8,20,.92);border:1px solid #e0a020;box-shadow:0 0 40px rgba(224,160,32,.4);color:#fff4d8;font:600 15px/1.3 Barlow,sans-serif;max-width:calc(100vw - 32px);text-align:center;touch-action:none;user-select:none}
.cmdo-box b.t{font:800 18px/1.2 Barlow,sans-serif;letter-spacing:2px}
.cmdo-stage{position:relative;width:240px;height:240px}
.cmdo-ring{position:absolute;inset:0}.cmdo-ring i{position:absolute;inset:0;border-radius:50%;border:4px solid #ffb84a}
.cmdo-ring b{position:absolute;inset:92px;border-radius:50%;background:#fff1c9;box-shadow:0 0 16px #ffb84a}
.cmdo-ring u{position:absolute;border-radius:50%;border:2px dashed #fff1c9;opacity:.8}.cmdo-ring u.p{border-color:#7dffa3}
.cmdo-bar{width:240px;height:22px;border-radius:11px;background:#2a2036;position:relative;overflow:hidden}
.cmdo-bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#ffb84a,#ff7a4a)}
.cmdo-bar em{position:absolute;top:0;bottom:0;background:rgba(125,255,163,.35)}.cmdo-bar em.g{background:rgba(255,241,201,.25)}
.cmdo-keys{display:flex;gap:8px;font:800 34px/1 Barlow,sans-serif}
.cmdo-keys span{width:48px;height:48px;border-radius:10px;background:#2a2036;display:flex;align-items:center;justify-content:center;transition:background .1s}
.cmdo-keys span.now{background:#e0a020;color:#1a1020}.cmdo-keys span.ok{background:#2d9d5a}.cmdo-keys span.miss{background:#7a2a2a}
.cmdo-lane{position:relative;width:70px;height:240px;border-radius:8px;background:#1a1426;overflow:hidden}
.cmdo-lane .line{position:absolute;left:0;right:0;bottom:30px;height:4px;background:#ffb84a}
.cmdo-lane i{position:absolute;left:19px;width:32px;height:32px;border-radius:50%;background:#ff7a4a;margin-top:-16px}.cmdo-lane i.ok{background:#2d9d5a}.cmdo-lane i.miss{background:#555}
.cmdo-aim{position:relative;width:220px;height:260px;border-radius:10px;background:#1a1426;overflow:hidden;cursor:crosshair}
.cmdo-aim .sil{position:absolute;inset:8%;opacity:.35;background:center/contain no-repeat}
.cmdo-aim .pt{position:absolute;border-radius:50%;border:2px solid #7dffa3;background:rgba(125,255,163,.18);transform:translate(-50%,-50%)}
.cmdo-aim .xh{position:absolute;width:26px;height:26px;border-radius:50%;border:2px solid #ff5a5a;transform:translate(-50%,-50%)}
.cmdo-aim .xh:before,.cmdo-aim .xh:after{content:'';position:absolute;background:#ff5a5a;left:50%;top:50%}
.cmdo-aim .xh:before{width:2px;height:40px;margin:-20px 0 0 -1px}.cmdo-aim .xh:after{height:2px;width:40px;margin:-1px 0 0 -20px}
.cmdo canvas{width:240px;height:240px;border-radius:10px;background:#1a1426;touch-action:none}
.cmdo-res{font:800 26px/1 Barlow,sans-serif;letter-spacing:3px;min-height:26px}
.cmdo-res.perf{color:#ffd24a;text-shadow:0 0 16px #ffb84a}.cmdo-res.bom{color:#7dffa3}
.cmdo small{opacity:.8;max-width:290px}.cmdo button{font:700 14px/1 Barlow,sans-serif;letter-spacing:2px;padding:10px 18px;border-radius:8px;border:0;background:#3a2f4d;color:#fff;cursor:pointer;min-height:40px}`;
  document.head.append(css);
  const ARROW = { ArrowUp: '↑', KeyW: '↑', ArrowRight: '→', KeyD: '→', ArrowDown: '↓', KeyS: '↓', ArrowLeft: '←', KeyA: '←' };
  const inset = (ms, dur, size) => Math.round(size / 2 * (1 - (.38 + .62 * Math.min(1, ms / dur)))); // faixa de acerto num anel que fecha em `dur` ms
  const PART_POS = { head: [.5, .14], torso: [.5, .42], armL: [.22, .42], armR: [.78, .42], legL: [.38, .8], legR: [.62, .8] };
  let busy = false;

  window.runCmd = (key, hero, tgt, done) => {
    const s = S.skills[key]; if (busy || !s?.cmd) return false;
    busy = true;
    const mods = hero?.cm?.[key] || {}, C = RULES.CMD;
    let over = false, rafId = 0, timers = [];
    const el = document.createElement('div'); el.className = 'cmdo'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Comando de ataque');
    el.innerHTML = `<div class="cmdo-box"><b class="t"></b><div class="cmdo-body"></div><div class="cmdo-res"></div><small class="cmdo-hint"></small><button type="button" class="sk">Pular (Esc)</button></div>`;
    const $ = q => el.querySelector(q), body = $('.cmdo-body');
    $('.t').textContent = s.name;
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    const cleanup = () => { removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKeyUp, true); cancelAnimationFrame(rafId); timers.forEach(clearTimeout); busy = false; };
    const finish = (g = '', n = 0, acc = 0) => { // devolve a nota uma vez, mostra o resultado um instante e fecha
      if (over) return; over = true; cleanup(); done({ g, n, acc });
      const r = $('.cmdo-res'); r.className = 'cmdo-res ' + g; r.textContent = g === 'perf' ? 'PERFEITO!' : g === 'bom' ? 'BOM!' : acc < 0 ? 'ESTOUROU!' : '';
      setTimeout(() => el.remove(), g ? 650 : 150);
    };
    const T0 = performance.now(), loops = []; const loop = () => { if (over) return; const now = performance.now(); loops.forEach(f => f(now)); rafId = requestAnimationFrame(loop); };
    let onPress = () => {}, onRelease = () => {}, onArrow = () => {};
    function onKey(e) { if (e.repeat) { if (e.code === 'Space') e.preventDefault(); return; }
      if (e.code === 'Escape') { e.preventDefault(); return finish(); }
      if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); onPress(performance.now()); }
      else if (ARROW[e.code]) { e.preventDefault(); e.stopPropagation(); onArrow(ARROW[e.code], performance.now()); } }
    function onKeyUp(e) { if (e.code === 'Space') { e.preventDefault(); onRelease(performance.now()); } }
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKeyUp, true);
    $('.sk').onclick = () => finish();
    body.addEventListener('pointerdown', e => { if (s.cmd !== 'mira' && s.cmd !== 'runa') { e.preventDefault(); onPress(performance.now()); } });
    body.addEventListener('pointerup', () => onRelease(performance.now()));
    const hint = t => { $('.cmdo-hint').textContent = t; };
    later(() => finish(), 6000); // prazo: sem nota, o golpe sai normal

    const k = s.cmd;
    if (k === 'tempo') { // anel que fecha: aperte no impacto
      const { cw, cp } = C.tempoWin(s, mods), dur = 900, hit = T0 + dur; hint('Aperte (Espaço ou toque) quando o anel encostar no centro.');
      body.innerHTML = `<div class="cmdo-stage"><div class="cmdo-ring"><u style="inset:${inset(cw, dur, 240)}px"></u><u class="p" style="inset:${inset(cp, dur, 240)}px"></u><i></i><b></b></div></div>`;
      const ring = body.querySelector('i'); loops.push(now => { ring.style.transform = `scale(${1 - .62 * Math.min(1, (now - T0) / dur)})`; });
      onPress = now => { const d = Math.abs(now - hit); finish(d <= cp ? 'perf' : d <= cw ? 'bom' : '', 0, Math.max(0, 1 - d / dur)); };
      later(() => finish(), dur + cw + 250);
    } else if (k === 'martelar') { // aperte o máximo de vezes em 2 s
      const mx = (s.mx || 0) + (mods.mx || 0), mt = s.mt || 16, dur = 2000; let taps = 0; hint('Martele Espaço (ou toque) o mais rápido que puder!');
      body.innerHTML = `<div class="cmdo-bar"><i></i></div>`; const bar = body.querySelector('i');
      onPress = () => { taps++; bar.style.width = Math.min(100, taps / mt * 100) + '%'; if (taps >= mt) end(); };
      const end = () => { const f = Math.min(1, taps / mt), n = Math.round(f * mx); finish(f >= 1 ? 'perf' : n > 0 ? 'bom' : '', n, f); };
      later(end, dur);
    } else if (k === 'segurar') { // segure e solte na faixa; passar do topo estoura
      const dur = 1600, z = ((s.cz || 8) + (mods.cz || 0)) / 100; let t1 = 0; hint('Segure Espaço (ou o toque) e solte na faixa verde. Passou do topo, estoura!');
      body.innerHTML = `<div class="cmdo-bar"><em class="g" style="left:60%;width:${(1 - z - .6) * 100}%"></em><em style="left:${(1 - z) * 100}%;width:${z * 100}%"></em><i></i></div>`; const bar = body.querySelector('i');
      onPress = now => { if (!t1) t1 = now; }; body.addEventListener('pointerleave', () => onRelease(performance.now()));
      onRelease = now => { if (!t1) return; const v = (now - t1) / dur; finish(v >= 1 - z ? 'perf' : v >= .6 ? 'bom' : '', 0, v); };
      loops.push(now => { if (!t1) return; const v = (now - t1) / dur; bar.style.width = Math.min(100, v * 100) + '%'; if (v > 1.02) finish('', 0, -1); });
    } else if (k === 'seq') { // setas na batida
      const seq = [...s.seq], gap = 500, lead = 700, tol = 120 + (mods.rit || 0), at = i => T0 + lead + i * gap, st = seq.map(() => ''); hint('Aperte as setas (ou WASD) no ritmo: cada uma acende na sua batida.');
      body.innerHTML = `<div class="cmdo-keys">${seq.map(a => `<span>${a}</span>`).join('')}</div>`; const spans = [...body.querySelectorAll('span')];
      onArrow = (a, now) => { const i = seq.findIndex((x, j) => !st[j] && Math.abs(now - at(j)) <= tol); if (i >= 0 && seq[i] === a) { st[i] = 'ok'; spans[i].className = 'ok'; } };
      loops.push(now => seq.forEach((_, i) => { if (st[i]) return; if (now > at(i) + tol) { st[i] = 'miss'; spans[i].className = 'miss'; } else if (now >= at(i) - tol) spans[i].className = 'now'; }));
      later(() => { const n = st.filter(x => x === 'ok').length; finish(n === seq.length ? 'perf' : n > 0 ? 'bom' : '', n, n / seq.length); }, lead + (seq.length - 1) * gap + tol + 150);
    } else if (k === 'ritmo') { // notas descendo numa pista
      const nt = s.nt || 6, gap = 560, lead = 1000, tol = 150 + (mods.rit || 0), at = i => T0 + lead + i * gap, st = Array(nt).fill(''); hint('Aperte Espaço (ou toque) quando cada nota passar pela linha.');
      body.innerHTML = `<div class="cmdo-lane"><div class="line"></div>${Array.from({ length: nt }, () => '<i></i>').join('')}</div>`; const notes = [...body.querySelectorAll('i')], H = 240, line = H - 30;
      onPress = now => { const i = st.findIndex((x, j) => !x && Math.abs(now - at(j)) <= tol); if (i >= 0) { st[i] = 'ok'; notes[i].className = 'ok'; } };
      loops.push(now => notes.forEach((nEl, i) => { const y = line - (at(i) - now) / 1000 * 160; nEl.style.top = y + 'px'; if (!st[i] && now > at(i) + tol) { st[i] = 'miss'; nEl.className = 'miss'; } }));
      later(() => { const n = st.filter(x => x === 'ok').length; finish(n === nt ? 'perf' : n > 0 ? 'bom' : '', n, n / nt); }, lead + (nt - 1) * gap + tol + 150);
    } else if (k === 'mira') { // mira oscilando: clique no ponto fraco
      const W = 220, Hh = 260, r = ((s.ma || 18) + (mods.ma || 0)) / 100 * W / 2, dur = 2500; hint('Clique (ou Espaço) quando a mira passar sobre o ponto fraco.');
      const pos = PART_POS[tgt?.weakPart]; let sx = (hashN(tgt?.id || 'x') % 60 + 20) / 100, sy = (hashN((tgt?.id || 'x') + 'y') % 60 + 20) / 100; if (pos) { sx = pos[0]; sy = pos[1]; }
      body.innerHTML = `<div class="cmdo-aim"><div class="sil" ${tgt?.img ? `style="background-image:url('${esc(tgt.img)}')"` : ''}></div><div class="pt" style="left:${sx * W}px;top:${sy * Hh}px;width:${r * 2}px;height:${r * 2}px"></div><div class="xh"></div></div>`;
      const xh = body.querySelector('.xh'); let cx = 0, cy = 0; loops.push(now => { const t = (now - T0) / 1000; cx = W / 2 + Math.sin(t * 2.6) * W * .46; cy = Hh / 2 + Math.sin(t * 3.7 + 1) * Hh * .44; xh.style.left = cx + 'px'; xh.style.top = cy + 'px'; });
      const shoot = () => { const d = Math.hypot(cx - sx * W, cy - sy * Hh); finish(d <= r * .4 ? 'perf' : d <= r ? 'bom' : '', 0, Math.max(0, 1 - d / W)); };
      onPress = shoot; body.querySelector('.cmdo-aim').addEventListener('pointerdown', e => { e.preventDefault(); shoot(); }); later(() => finish(), dur + 300);
    } else if (k === 'runa') { // desenhar o símbolo com o mouse ou o dedo
      const rune = s.rn || ['circulo', 'triangulo', 'estrela', 'espiral'][Math.max(0, Math.min(3, (s.circ || 1) - 1))], NAMES = { circulo: 'um círculo', triangulo: 'um triângulo', estrela: 'uma estrela', espiral: 'uma espiral', raio: 'um raio', onda: 'uma onda' };
      hint(`Desenhe ${NAMES[rune]} (4 s). Solte para conjurar.`); body.innerHTML = `<canvas width="480" height="480"></canvas>`;
      const cv = body.querySelector('canvas'), g = cv.getContext('2d'), pts = []; let down = false;
      g.strokeStyle = 'rgba(255,241,201,.22)'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); C.RUNE_T[rune].pts.forEach(([x, y], i) => { const X = 60 + x * 360, Y = 60 + y * 360; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke();
      const at = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * 480, (e.clientY - b.top) / b.height * 480]; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); down = true; const p = at(e); pts.push(p); g.strokeStyle = '#ffb84a'; g.lineWidth = 8; g.beginPath(); g.moveTo(...p); });
      cv.addEventListener('pointermove', e => { if (!down) return; const p = at(e); pts.push(p); g.lineTo(...p); g.stroke(); });
      const end = () => { if (over) return; const sc = Math.min(100, C.runeScore(pts, rune) + (mods.rn || 0)); finish(pts.length < 4 ? '' : sc >= 85 ? 'perf' : sc >= 60 ? 'bom' : '', 0, sc / 100); };
      cv.addEventListener('pointerup', () => { if (down) { down = false; end(); } }); later(end, 4000);
    } else { busy = false; return false; }
    document.body.append(el); rafId = requestAnimationFrame(loop);
    return true;
  };
  function hashN(str) { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
}

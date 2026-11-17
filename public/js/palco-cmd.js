// ===== Palco de comando comum: tela cheia estilo QTE de anime, onde os minigames de defesa e de ataque rodam =====
// openStage({ title, tone: 'atk'|'def'|'chq', el?, hero?, foe?, onClose? }) -> Stage | null (null se já houver um palco).
// O palco só desenha: faixas de cinema, retratos, canvas de efeitos (faíscas, linhas de velocidade), letreiro, dica e resultado.
// O minigame monta o que quiser em `stage.ui` e mede o próprio tempo; o hit-stop congela só as animações visuais. Esc é de quem chama.
{
  const TONE = { atk: '#ff2b3d', def: '#3aa0ff', chq: '#ffb020' };
  const ELCOL = { kagutsuchi: '#ff7a1a', indra: '#ffe600', susanoo: '#2e8bff', tsukuyomi: '#9a5bff', amaterasu: '#fff3a0', fuhaku: '#7dffb0', shukketsu: '#e4002b' };
  const GRADE = { perf: ['#ffd24a', '#ff7a00'], otimo: ['#7dffb0', '#1fb86a'], bom: ['#ffffff', '#8fa0c0'], erro: ['#ff5a5a', '#7a0014'], '': ['#e8e8f0', '#6a6a80'] };
  const css = document.createElement('style');
  css.textContent = `.stage-cmd{position:fixed;inset:0;z-index:60;overflow:hidden;font-family:Barlow,sans-serif;color:#fff;--ac:#ff2b3d;--ac2:#5a0010;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.stage-cmd *{box-sizing:border-box}
.stage-cmd.out{opacity:0;pointer-events:none;transition:opacity var(--out,.28s)}
.sc-bg{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(24,10,30,.55),rgba(4,2,8,.92));backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .35s}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.sc-bg{background:rgba(4,2,8,.93)}}
.sc-bar{position:absolute;left:0;right:0;height:11vh;background:#000;z-index:2;transition:transform .35s cubic-bezier(.2,.9,.2,1)}
.sc-bar::after{content:'';position:absolute;left:0;right:0;height:3px;background:var(--ac);box-shadow:0 0 14px var(--ac)}
.sc-bar.t{top:0;transform:translateY(-101%)}.sc-bar.t::after{bottom:0}
.sc-bar.b{bottom:0;transform:translateY(101%)}.sc-bar.b::after{top:0}
.stage-cmd.in .sc-bg{opacity:1}.stage-cmd.in .sc-bar{transform:none}
.sc-wrap{position:absolute;inset:0;z-index:3}
.sc-por{position:absolute;bottom:11vh;width:min(24vw,300px);height:min(60vh,500px);opacity:0;pointer-events:none;transition:transform .4s cubic-bezier(.2,.9,.2,1) .05s,opacity .3s}
.sc-por.l{left:0;transform:translateX(-110%)}.sc-por.r{right:0;transform:translateX(110%)}
.stage-cmd.in .sc-por{transform:none;opacity:.92}
.sc-por .pf{position:absolute;inset:0;overflow:hidden;background:linear-gradient(160deg,var(--ac2),#120a1c 70%);display:flex;align-items:center;justify-content:center}
.sc-por.l .pf{clip-path:polygon(0 0,88% 0,100% 100%,0 100%)}.sc-por.r .pf{clip-path:polygon(12% 0,100% 0,100% 100%,0 100%)}
.sc-por .sh{position:absolute;inset:0;filter:drop-shadow(0 0 16px var(--ac))}
.sc-por img{width:100%;height:100%;object-fit:cover;object-position:top}
.sc-por .ini{font:900 italic min(22vw,200px)/1 Barlow,sans-serif;color:rgba(255,255,255,.85);text-shadow:4px 4px 0 #000}
.sc-por .nm{position:absolute;bottom:0;left:0;right:0;padding:18px 12px 8px;background:linear-gradient(transparent,rgba(0,0,0,.85));font:800 italic 16px/1 Barlow,sans-serif;letter-spacing:1px;text-transform:uppercase;text-align:center}
.sc-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.sc-main{position:absolute;inset:11vh 0;display:flex;align-items:center;justify-content:center;pointer-events:none;transition:opacity .2s}
.sc-ui{position:relative;pointer-events:auto;width:min(70vmin,560px);aspect-ratio:1/1;max-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation}
.sc-title{position:absolute;top:calc(11vh + 10px);left:50%;transform:translateX(-50%) skewX(-10deg);padding:6px 34px;background:var(--ac);color:#fff;border:3px solid #000;box-shadow:6px 6px 0 #000;max-width:calc(100vw - 24px);pointer-events:none;opacity:0}
.sc-title b{display:block;font:900 italic clamp(20px,4.4vmin,40px)/1.1 Barlow,sans-serif;letter-spacing:2px;text-transform:uppercase;transform:skewX(10deg);text-shadow:2px 2px 0 #000;text-align:center}
.stage-cmd.in .sc-title{animation:sctit .35s .08s cubic-bezier(.2,1.5,.4,1) both}
.sc-hint{position:absolute;bottom:calc(11vh + 12px);left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 24px);text-align:center;font:700 clamp(14px,2.4vmin,20px)/1.3 Barlow,sans-serif;text-shadow:0 2px 0 #000,0 0 8px #000;pointer-events:none}
.sc-hint:empty{display:none}
.sc-words{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.sc-word{position:absolute;transform:translate(-50%,-50%);font:900 italic clamp(44px,12vmin,120px)/1 Barlow,sans-serif;letter-spacing:2px;color:var(--wc,#fff);-webkit-text-stroke:.09em #000;paint-order:stroke fill;text-shadow:.05em .05em 0 #000;white-space:nowrap;animation:scw .75s cubic-bezier(.2,1.4,.4,1) both}
.sc-flash{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:0}
.sc-res{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:0 16px;text-align:center;background:linear-gradient(100deg,transparent 0,rgba(0,0,0,.74) 22%,rgba(0,0,0,.74) 78%,transparent 100%);animation:scfade .2s both}
.sc-res .g{font:900 italic clamp(44px,15vmin,150px)/1 Barlow,sans-serif;letter-spacing:2px;color:var(--g1);-webkit-text-stroke:.08em #000;paint-order:stroke fill;text-shadow:.05em .05em 0 #000,0 0 .3em var(--g2);transform:skewX(-8deg);animation:scgrade .45s cubic-bezier(.2,1.6,.4,1) both;max-width:100%;overflow-wrap:anywhere}
.sc-res ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;align-items:center}
.sc-res li{background:#000;border-left:6px solid var(--g1);padding:5px 18px;font:800 clamp(16px,3.4vmin,26px)/1.2 Barlow,sans-serif;transform:skewX(-10deg);animation:scli .3s both;animation-delay:calc(.14s * var(--i))}
.sc-res small{opacity:.7;font:600 13px/1 Barlow,sans-serif;letter-spacing:1px;margin-top:6px}
.stage-cmd.res .sc-main{opacity:.12;pointer-events:none}.stage-cmd.res .sc-ui{pointer-events:none}
.stage-cmd.hs *{animation-play-state:paused!important}
@keyframes sctit{from{opacity:0;transform:translateX(-50%) skewX(-10deg) scale(2.2)}to{opacity:1;transform:translateX(-50%) skewX(-10deg) scale(1)}}
@keyframes scw{0%{opacity:0;transform:translate(-50%,-50%) scale(2.4) rotate(-9deg)}18%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-5deg)}75%{opacity:1;transform:translate(-50%,-62%) scale(1.04) rotate(-5deg)}100%{opacity:0;transform:translate(-50%,-80%) scale(1.1) rotate(-5deg)}}
@keyframes scwrm{0%{opacity:0}15%,75%{opacity:1}100%{opacity:0}}
@keyframes scfade{from{opacity:0}to{opacity:1}}
@keyframes scgrade{from{opacity:0;transform:skewX(-8deg) scale(2.6)}to{opacity:1;transform:skewX(-8deg) scale(1)}}
@keyframes scli{from{opacity:0;transform:skewX(-10deg) translateX(-40px)}to{opacity:1;transform:skewX(-10deg)}}
.stage-cmd.rm .sc-bar,.stage-cmd.rm .sc-por{transition:opacity .2s}
.stage-cmd.rm .sc-bar{opacity:0;transform:none!important}.stage-cmd.rm .sc-por{transform:none!important}.stage-cmd.in.rm .sc-bar{opacity:1}
.stage-cmd.rm .sc-title{animation:scfade .25s both!important}.stage-cmd.rm .sc-word{animation:scwrm .8s both}.stage-cmd.rm .sc-res .g,.stage-cmd.rm .sc-res li{animation:scfade .25s both}
@media (max-width:599px){.sc-bar{height:8vh}.sc-main{inset:8vh 0;padding-top:120px}.sc-ui{width:calc(100vw - 16px);max-height:100%}
.sc-por{bottom:auto;top:calc(8vh + 56px);width:34vw;max-width:150px;height:110px}.sc-por .ini{font-size:70px}.sc-por .nm{font-size:12px;padding:10px 6px 4px}
.sc-title{top:calc(8vh + 8px);padding:4px 20px}.sc-hint{bottom:calc(8vh + 8px)}}`;
  document.head.append(css);
  let cur = null;

  const mkPortrait = (side, c) => {
    const d = document.createElement('div'), sh = document.createElement('div'), pf = document.createElement('div');
    d.className = 'sc-por ' + side; sh.className = 'sh'; pf.className = 'pf';
    if (c?.img) { const im = new Image(); im.src = c.img; im.alt = ''; pf.append(im); }
    else { const s = document.createElement('span'); s.className = 'ini'; let t = (c?.name || '?').slice(0, 1).toUpperCase(); try { if (c?.enemy) t = KANJI[mainEl(c)] || t; } catch {} s.textContent = t; pf.append(s); }
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = c?.name || ''; pf.append(nm);
    sh.append(pf); d.append(sh); return d;
  };

  window.openStage = (opts = {}) => {
    if (cur) return null;
    const rm = matchMedia('(prefers-reduced-motion: reduce)').matches, ac = ELCOL[opts.el] || TONE[opts.tone] || TONE.atk;
    const root = document.createElement('div'); root.className = 'stage-cmd' + (rm ? ' rm' : ''); root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', opts.title || 'Comando');
    root.style.setProperty('--ac', ac); root.style.setProperty('--ac2', `color-mix(in srgb, ${ac} 28%, #0a0510)`);
    root.innerHTML = '<div class="sc-bg"></div><div class="sc-bar t"></div><div class="sc-bar b"></div><div class="sc-wrap"><canvas class="sc-cv"></canvas><div class="sc-main"><div class="sc-ui"></div></div><div class="sc-title"><b></b></div><div class="sc-hint" aria-live="polite"></div><div class="sc-words"></div></div><div class="sc-flash"></div>';
    const $ = s => root.querySelector(s), wrap = $('.sc-wrap'), cv = $('.sc-cv'), ui = $('.sc-ui'), words = $('.sc-words'), flashEl = $('.sc-flash'), g2 = cv.getContext('2d');
    $('.sc-title b').textContent = opts.title || '';
    if (opts.hero) wrap.prepend(mkPortrait('l', opts.hero)); if (opts.foe) wrap.prepend(mkPortrait('r', opts.foe));
    root.addEventListener('contextmenu', e => e.preventDefault());
    document.body.append(root);

    let closed = false, frozen = false, speedOn = false, intro = !rm, raf = 0, last = performance.now(), slT = 0, lines = [], dirty = false, resEl = null, resAt = 0, resDone = null, hsT = 0;
    const parts = [], timers = new Set(), paused = new Set(), later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    const fit = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d); g2.setTransform(d, 0, 0, d, 0, 0); dirty = true; };
    fit(); addEventListener('resize', fit);

    const draw = now => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (frozen) return; // hit-stop: o desenho congela; os timers do minigame seguem
      const w = innerWidth, h = innerHeight, sp = !rm && (speedOn || intro);
      if (!sp && !parts.length && !dirty) return;
      g2.clearRect(0, 0, w, h); dirty = false;
      if (sp) {
        if (now - slT > 70) { slT = now; lines = Array.from({ length: 36 }, () => ({ a: Math.random() * 6.2832, d: .012 + Math.random() * .03, r: .16 + Math.random() * .26, al: .1 + Math.random() * .3 })); }
        const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2 + 40, m = Math.min(w, h);
        lines.forEach((l, i) => { g2.fillStyle = i % 3 ? '#fff' : ac; g2.globalAlpha = l.al; g2.beginPath(); g2.moveTo(cx + Math.cos(l.a) * m * l.r, cy + Math.sin(l.a) * m * l.r); g2.lineTo(cx + Math.cos(l.a - l.d) * R, cy + Math.sin(l.a - l.d) * R); g2.lineTo(cx + Math.cos(l.a + l.d) * R, cy + Math.sin(l.a + l.d) * R); g2.fill(); });
        dirty = true;
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t -= dt; if (p.t <= 0) { parts.splice(i, 1); continue; }
        p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g2.globalAlpha = Math.min(1, p.t / p.m * 1.6); g2.strokeStyle = p.c; g2.lineWidth = p.s; g2.lineCap = 'round';
        g2.beginPath(); g2.moveTo(p.x, p.y); g2.lineTo(p.x - p.vx * .035, p.y - p.vy * .035); g2.stroke();
      }
      g2.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);

    const fx = {
      burst(x, y, n = 12, color) { if (closed) return; n = Math.min(80, Math.round(rm ? n / 2 : n)); for (let i = 0; i < n && parts.length < 400; i++) { const a = Math.random() * 6.2832, v = 120 + Math.random() * 420, m = .35 + Math.random() * .4; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: m, m, s: 1.5 + Math.random() * 3, c: color || (i % 2 ? '#fff' : ac) }); } },
      flash(color = '#fff', ms = 160) { if (closed) return; flashEl.style.background = color; flashEl.animate([{ opacity: rm ? .3 : .85 }, { opacity: 0 }], { duration: rm ? Math.max(240, ms * 1.6) : ms, easing: 'ease-out' }); },
      shake(amp, ms = 240) { if (closed || rm) return; const k = []; for (let i = 0; i <= 8; i++) { const f = 1 - i / 8; k.push({ transform: `translate(${(Math.random() * 2 - 1) * amp * f}px,${(Math.random() * 2 - 1) * amp * f}px) scale(${1 + Math.min(.04, amp / 400) * f})` }); } wrap.animate(k, { duration: ms, easing: 'linear' }); },
      hitstop(ms) { // congela só o visual (animações CSS/WAAPI e o canvas); nada aqui toca nos timers do minigame
        if (closed) return; frozen = true; root.classList.add('hs');
        root.getAnimations({ subtree: true }).forEach(a => { if (a.playState === 'running') { a.pause(); paused.add(a); } });
        clearTimeout(hsT); hsT = setTimeout(() => { frozen = false; root.classList.remove('hs'); paused.forEach(a => { try { a.play(); } catch {} }); paused.clear(); }, ms);
      },
      word(text, o = {}) { if (closed) return; const d = document.createElement('div'); d.className = 'sc-word'; d.textContent = text; d.style.left = (o.x ?? innerWidth / 2 + (Math.random() - .5) * innerWidth * .2) + 'px'; d.style.top = (o.y ?? innerHeight * .4) + 'px'; d.style.setProperty('--wc', o.color || '#fff'); words.append(d); later(() => d.remove(), 800); },
      speed(on) { speedOn = !!on; if (!on) dirty = true; },
    };
    const api = {
      ui, root, fx,
      sfx(k, v) { try { if (typeof sfxc === 'function') sfxc(k, v); } catch {} },
      buzz(p) { try { navigator.vibrate?.(p); } catch {} },
      setHint(t) { $('.sc-hint').textContent = t || ''; },
      result(g, r = {}, ms = 700) {
        if (closed) return Promise.resolve();
        resEl?.remove(); resDone?.();
        const [g1, g2c] = GRADE[g] || GRADE[''], d = document.createElement('div'); d.className = 'sc-res'; d.style.setProperty('--g1', g1); d.style.setProperty('--g2', g2c);
        const t = document.createElement('div'); t.className = 'g'; t.textContent = r.title || ''; d.append(t);
        const ul = document.createElement('ul'); (r.lines || []).forEach((s, i) => { const li = document.createElement('li'); li.textContent = s; li.style.setProperty('--i', i + 1); ul.append(li); }); d.append(ul);
        const sm = document.createElement('small'); sm.textContent = 'toque para continuar'; d.append(sm);
        root.append(d); root.classList.add('res'); resEl = d; resAt = performance.now();
        return new Promise(ok => { let fin = false; const done = () => { if (fin) return; fin = true; resDone = null; d.removeEventListener('pointerdown', skip); ok(); }; const skip = () => { if (performance.now() - resAt > 200) done(); }; resDone = done; d.addEventListener('pointerdown', skip); later(done, ms); });
      },
      close(ms = 280) {
        if (closed) return; closed = true; cur = null; cancelAnimationFrame(raf); removeEventListener('resize', fit); clearTimeout(hsT); timers.forEach(clearTimeout); timers.clear(); resDone?.();
        root.style.setProperty('--out', ms + 'ms'); root.classList.add('out');
        setTimeout(() => root.remove(), ms + 40);
        try { opts.onClose?.(); } catch (e) { console.error(e); }
      },
    };
    cur = api;
    root.offsetWidth; root.classList.add('in'); // força o layout inicial para as transições de entrada rodarem
    api.sfx('whoosh'); later(() => fx.shake(7, 220), 130); later(() => { intro = false; dirty = true; }, 380);
    return api;
  };
}

// ===== Comandos de defesa no palco cinemático: quando um inimigo vai agir e a janela (S.battle.cmd) inclui um herói deste jogador, o palco abre com o anel que fecha. =====
// Uma tecla só (botão, Espaço ou toque): no fim exato do anel APARA (custa Aura, exige o nó de Aparar); um pouco antes ESQUIVA (de graça, só em golpe anunciado);
// cedo demais pune. Golpes de várias batidas ganham um anel por batida. Chefes usam fintas (C.fin): batida atrasada, anel falso e direção da esquiva (←/→).
// Se o herói tem uma técnica de Choque, o botão CHOQUE (C) troca o anel por um cabo de guerra. O tempo é o do servidor; aqui só se desenha e se manda `def`/`chq`.
{
  const css = document.createElement('style');
  css.textContent = `.df{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5%;color:#fff;font-family:Barlow,sans-serif}
.df .cm-ring{width:min(100%,64vmin);flex:0 0 auto}.df .cm-ring u.p{border-color:#ff5a5a;border-style:solid}.df .cm-ring u.o{border-color:#3aa0ff}
.df-warn{position:absolute;top:-2%;left:50%;transform:translateX(-50%);font:900 italic clamp(60px,20vmin,170px)/1 Barlow,sans-serif;color:#ff2b3d;-webkit-text-stroke:.08em #000;paint-order:stroke fill;text-shadow:.05em .05em 0 #000;animation:dfwarn .5s both;pointer-events:none}
@keyframes dfwarn{0%{opacity:0;transform:translateX(-50%) scale(3)}30%{opacity:1;transform:translateX(-50%) scale(1)}100%{opacity:0;transform:translateX(-50%) scale(1.2)}}
.df-dir{position:absolute;top:38%;font:900 clamp(60px,18vmin,150px)/1 Barlow,sans-serif;color:#3aa0ff;-webkit-text-stroke:.07em #000;paint-order:stroke fill;text-shadow:.05em .05em 0 #000;pointer-events:none;animation:dfpul .35s infinite alternate}
@keyframes dfpul{to{transform:scale(1.18)}}
.df-chips{display:flex;gap:8px;justify-content:center;min-height:30px;flex-wrap:wrap}
.df-chips span{padding:3px 14px;background:#000;border-left:5px solid #555;font:800 italic clamp(13px,2.6vmin,20px)/1.3 Barlow,sans-serif;letter-spacing:1px;transform:skewX(-10deg)}
.df-chips span.par{border-color:#ff2b3d;background:#6b0a18}.df-chips span.esq{border-color:#3aa0ff;background:#0d3a66}.df-chips span.cedo,.df-chips span.late{border-color:#e0a020;background:#4a3a10}
.df-tug{position:relative;width:min(100%,70vmin);height:clamp(40px,9vmin,70px);border-radius:999px;background:#150d20;border:4px solid #000;box-shadow:0 0 0 3px #ffb020;overflow:hidden}
.df-tug i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#ffb020,#ff2b3d);transition:width .08s}
.df-count{font:900 italic clamp(50px,16vmin,130px)/1 Barlow,sans-serif;-webkit-text-stroke:.07em #000;paint-order:stroke fill;text-shadow:.05em .05em 0 #000;color:#ffb020}
.df-row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.df-row button{font:900 italic clamp(18px,4vmin,26px)/1 Barlow,sans-serif;letter-spacing:3px;padding:14px 30px;min-height:56px;border-radius:10px;border:3px solid #000;box-shadow:0 0 0 3px #fff,6px 6px 0 #000;background:#d63b3b;color:#fff;transform:skewX(-8deg)}
.df-row button.chq{background:#e0a020;color:#1a1020}.df-row button.dr{background:#2d7fb8;min-width:64px;padding:14px 18px}
.qte3d{--ac:#3aa0ff;position:fixed;z-index:430;width:var(--rs,240px);transform:translate(-50%,calc(var(--rs,240px) / -2));pointer-events:none;color:#fff;font-family:Barlow,sans-serif;animation:q3in .25s both}
.qte3d .df{height:auto;justify-content:flex-start;gap:10px}.qte3d .cm-ring{width:var(--rs,240px)}.qte3d .df-row,.qte3d .df-tug{pointer-events:auto}
.qte3d .df-warn{font-size:calc(var(--rs) * .5);top:calc(var(--rs) * -.55)}.qte3d .df-dir{top:calc(var(--rs) * .3);font-size:calc(var(--rs) * .35)}.qte3d .df-dir[style*="left: 2%"]{left:-40%!important}.qte3d .df-dir[style*="right: 2%"]{right:-40%!important}
.qte3d .df-row button{font-size:18px;padding:10px 20px;min-height:46px}.qte3d .df-chips span{font-size:14px}.qte3d .df-count{font-size:calc(var(--rs) * .3)}.qte3d .df-tug{width:calc(var(--rs) * 1.2)}
.qte3d .q3h{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:8px;width:max-content;max-width:60vw;text-align:center;font:700 15px/1.3 Barlow,sans-serif;text-shadow:0 2px 0 #000,0 0 8px #000}.qte3d .q3h:empty{display:none}
.qte3d .q3w{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font:900 italic calc(var(--rs) * .32)/1 Barlow,sans-serif;color:var(--wc,#fff);-webkit-text-stroke:.08em #000;paint-order:stroke fill;white-space:nowrap;animation:q3w .7s both}
.qte3d.fl{animation:q3fl .18s}.qte3d.out{opacity:0;transition:opacity var(--out,.2s)}
@keyframes q3in{from{opacity:0;scale:1.4}}@keyframes q3w{0%{opacity:0;scale:2}20%{opacity:1;scale:1}80%{opacity:1}100%{opacity:0;translate:0 -40%}}@keyframes q3fl{50%{filter:brightness(2.5) drop-shadow(0 0 20px var(--fc,#fff))}}
@media(prefers-reduced-motion:reduce){.qte3d,.qte3d .q3w{animation-duration:.01s}}`;
  document.head.append(css);
  let qr = null, qi = -1, st = null, key = '', t0 = 0, raf = 0, hid = '', pend = 0, tugT = 0, seen = [], lastTick = 0, chqOn = false;
  // no PC (palco 3D visível) o anel abre sobre o recorte do herói alvo, com a mesma interface do openStage (ui, fx, sfx, buzz, setHint, close)
  const p3dOn = () => { const r = document.querySelector('.p3d'); return !!r && r.style.display !== 'none' && typeof PALCO3D !== 'undefined'; };
  const openQte3d = h => {
    const root = document.createElement('div'); root.className = 'qte3d'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Defesa de ' + h.name);
    root.innerHTML = '<div class="q3ui"></div><div class="q3h" aria-live="polite"></div>'; document.body.append(root);
    const ui = root.querySelector('.q3ui'), place = () => { const r = PALCO3D.rectOf(h.id); if (!r) return; const rs = Math.round(Math.max(130, Math.min(r.width * 1.15, r.height * .55, 300) * .8));
      // preso dentro da tela (com folga para os botões embaixo)
      root.style.setProperty('--rs', rs + 'px'); root.style.left = Math.max(rs / 2, Math.min(innerWidth - rs / 2, r.left + r.width / 2)) + 'px'; root.style.top = Math.max(rs / 2 + 60, Math.min(innerHeight - rs / 2 - 120, r.top + r.height * .4)) + 'px'; };
    place();
    const word = (t, o = {}) => { const d = document.createElement('div'); d.className = 'q3w'; d.textContent = t; d.style.setProperty('--wc', o.color || '#fff'); root.append(d); setTimeout(() => d.remove(), 750); };
    const flash = (c = '#fff') => { root.style.setProperty('--fc', c); root.classList.remove('fl'); void root.offsetWidth; root.classList.add('fl'); };
    return { ui, root, place,
      fx: { burst() {}, speed() {}, hitstop() {}, word, flash, shake() { PALCO3D.shake(h.id); } },
      sfx(k, v) { try { if (typeof sfxc === 'function') sfxc(k, v); } catch {} }, buzz(p) { try { navigator.vibrate?.(p); } catch {} },
      setHint(t) { root.querySelector('.q3h').textContent = t || ''; },
      close(ms = 200) { root.style.setProperty('--out', ms + 'ms'); root.classList.add('out'); setTimeout(() => root.remove(), ms + 40); } };
  };
  const D = () => RULES.CMD.DEF, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const heroes = () => { const C = S?.battle?.cmd; if (gm || !S?.battle?.active || !C) return []; return Object.values(S.chars).filter(c => !c.enemy && c.owner === name && c.hp > 0 && C.tgs?.includes(c.id)); };
  const chqKey = h => (h.skills || []).find(k => S.skills[k]?.cmd === 'choque') || '';
  const kill = ms => { qr?.close(); qr = null; qi = -1; if (st) { st.close(ms ?? 200); st = null; } cancelAnimationFrame(raf); clearInterval(tugT); tugT = 0; pend = 0; seen = []; chqOn = false; };
  const impact = (C, i) => t0 + C.beats[i] - 150; // o anel fecha um pouco antes do impacto no servidor (ida e volta da rede)
  const press = dir => {
    const C = S?.battle?.cmd; if (!st || !C) return;
    if (C.chq?.id === hid) { pend++; st.sfx('hit'); st.buzz(10); st.fx.burst(innerWidth / 2, innerHeight / 2, 6, '#ffb020'); st.fx.shake(6, 120); return; }
    st.sfx('tick'); st.buzz(10); send({ t: 'def', id: hid, ...(dir ? { dir } : {}) });
  };
  const startChq = () => { const C = S?.battle?.cmd, h = S.chars[hid]; if (!st || !C || !h || C.chq) return; send({ t: 'chq', id: hid, skill: chqKey(h) }); };
  const DIR = { ArrowLeft: '←', KeyA: '←', ArrowRight: '→', KeyD: '→' };
  addEventListener('keydown', e => {
    if (!st || e.repeat) { if (st && e.code === 'Space') e.preventDefault(); return; }
    if (e.code === 'Space') { e.preventDefault(); press(); }
    else if (DIR[e.code]) { e.preventDefault(); press(DIR[e.code]); }
    else if (e.code === 'KeyC') { const C = S?.battle?.cmd; if (C?.chq?.id === hid) press(); else startChq(); }
  });
  // progresso do anel (0..1) com a finta de batida atrasada: para um instante no meio e acelera, sem mudar o instante do impacto
  const f2 = (f, ease) => ease ? f + .85 * Math.sin(2 * Math.PI * f) / (2 * Math.PI) : f;
  const sc = f => .3 + .7 * (1 - f);
  const frame = () => {
    const C = S?.battle?.cmd; if (!st || !C) return;
    st.place?.(); // o anel 3D acompanha o recorte (a câmera pode estar andando)
    const now = performance.now(), ring = st.ui.querySelector('i.r'); let i = C.beats.findIndex((_, k) => now <= impact(C, k)); if (i < 0) i = C.beats.length - 1;
    if (p3dOn() && typeof PVIDA !== 'undefined' && i !== qi && now <= impact(C, i)) { qi = i; qr = PVIDA.qteRing(hid, impact(C, i)); } // o anel também no chão do herói, em 3D
    const stt = i === 0 ? t0 : impact(C, i - 1), dur = impact(C, i) - stt, fin = C.fin?.[i] || {}, ease = !!fin.ease, p = ms => sc(f2(clamp((ms - stt) / dur), ease));
    if (ring) { ring.style.transform = `scale(${p(now)})`;
      st.ui.querySelectorAll('u').forEach(u => { u.style.transform = `scale(${p(impact(C, i) - +u.dataset.ms)})`; });
      const fk = st.ui.querySelector('i.fk'); if (fk) { const fa = t0 + fin.fake - 150, vis = fin.fake != null && now < fa + 160; fk.style.display = vis ? '' : 'none'; if (vis) { fk.style.transform = `scale(${sc(clamp((now - stt) / Math.max(1, fa - stt)))})`; fk.style.opacity = now > fa ? Math.max(0, 1 - (now - fa) / 160) : 1; } }
      const dr = st.ui.querySelector('.df-dir'); if (dr) { dr.textContent = fin.dir || ''; dr.style.left = fin.dir === '←' ? '2%' : 'auto'; dr.style.right = fin.dir === '→' ? '2%' : 'auto'; }
      if (now - lastTick > 240 - 160 * clamp((now - stt) / dur) && now > stt) { lastTick = now; st.sfx('tick'); } }
    const bar = st.ui.querySelector('.df-tug i'); if (bar && C.chq) { const p2 = Math.min(1, (C.chq.n + pend) / C.chq.meta); bar.style.width = (p2 * 100) + '%'; const ct = st.ui.querySelector('.df-count'); if (ct) ct.textContent = `${C.chq.n + pend}/${C.chq.meta}`; }
    if (now > impact(C, C.beats.length - 1) + 900 + (C.chq ? 3000 : 0)) { kill(); return; }
    raf = requestAnimationFrame(frame);
  };
  const react = (notes, tel) => { // uma batida nova foi respondida: o palco reage na hora
    for (let i = seen.length; i < notes.length; i++) { const v = notes[i]; if (v === undefined) break; seen[i] = v; const f = st.fx, mid = [innerWidth / 2, innerHeight / 2];
      if (v === 'par') { f.burst(mid[0], mid[1], 36, '#fff'); f.word('KIN!', { color: '#ff5a5a' }); f.flash('#fff', 140); f.shake(14, 260); f.hitstop(80); st.sfx('hit'); st.buzz([20, 30, 40]); }
      else if (v === 'esq') { f.word('WHOOSH', { color: '#7dc4ff' }); f.burst(mid[0], mid[1], 18, '#3aa0ff'); st.sfx('whoosh'); st.buzz(25); }
      else if (v === 'cedo' || v === 'late') { f.flash('#ff2b3d', 160); f.shake(8, 200); st.sfx('miss'); st.buzz(80); }
      qr?.grade(v === 'par' ? 'perf' : v === 'esq' ? 'otimo' : 'erro'); }
  };
  const paint = () => { // o que muda a cada estado: notas, botões e o cabo de guerra
    const C = S.battle.cmd, h = S.chars[hid], z = C.z?.[hid] || {}, notes = C.p?.[hid] || [], foe = S.chars[C.foe], mine = C.chq?.id === hid;
    if (mine && !chqOn) { chqOn = true; st.ui.innerHTML = `<div class="df"><div class="df-count">0/${C.chq.meta}</div><div class="df-tug" aria-label="Choque de poderes"><i></i></div><div class="df-row"><button type="button" class="def">MARTELE!</button></div></div>`; st.fx.speed(true); st.fx.flash('#ffb020', 200); st.fx.word('CHOQUE!', { color: '#ffb020' }); st.sfx('chq'); st.root.style.setProperty('--ac', '#ffb020'); st.setHint('Martele Espaço, C ou o botão!'); st.ui.querySelector('.def').addEventListener('pointerdown', e => { e.preventDefault(); press(); }); }
    const chips = st.ui.querySelector('.df-chips'); if (chips) chips.innerHTML = C.beats.map((_, i) => { const v = notes[i]; return `<span class="${v || ''}">${v === 'par' ? 'APAROU' : v === 'esq' ? 'ESQUIVOU' : v === 'cedo' ? 'CEDO' : '•'}</span>`; }).join('');
    const canChq = C.chqOk?.includes(hid) && !C.chq && chqKey(h), hasDir = (C.fin || []).some(f => f.dir), row = st.ui.querySelector('.df-row');
    if (row && !mine) { const html = (hasDir ? '<button type="button" class="dr" data-d="←">←</button>' : '') + `<button type="button" class="def">${(C.esq ?? C.tel) ? (z.canP ? 'ESQUIVAR / APARAR' : 'ESQUIVAR') : 'APARAR'}</button>` + (hasDir ? '<button type="button" class="dr" data-d="→">→</button>' : '') + (canChq ? '<button type="button" class="chq">CHOQUE (C)</button>' : '');
      if (row.dataset.h !== html) { row.dataset.h = html; row.innerHTML = html; row.querySelector('.def')?.addEventListener('pointerdown', e => { e.preventDefault(); press(); }); row.querySelectorAll('.dr').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); press(b.dataset.d); })); row.querySelector('.chq')?.addEventListener('pointerdown', e => { e.preventDefault(); startChq(); }); } }
    if (!mine) st.setHint((C.esq ?? C.tel) ? `${h.name}${hasDir ? ' · ←/→ esquiva para o lado indicado' : ''}${z.canP ? ` · Espaço no fim do anel apara (${z.cost || 0} Aura)` : ' · Espaço um pouco antes do fim do anel esquiva'}` : `${h.name} · ${z.cost || 0} Aura · aperte quando o anel fechar (Espaço)`);
    react(notes, C.esq ?? C.tel);
    if (!tugT && mine) tugT = setInterval(() => { if (pend) { send({ t: 'chq', id: hid, n: pend }); pend = 0; } }, 250);
  };
  const sync = () => {
    const C = S?.battle?.cmd, l = C ? heroes() : [], k = C ? C.foe + ':' + C.at : '';
    if ((!l.length || k !== key) && st) kill(l.length ? 80 : 250);
    if (!l.length) return;
    if (!st) {
      const h = l[0], z = C.z?.[h.id] || {}, parMs = z.par || 0, esqMs = z.esq || 0, foe = S.chars[C.foe];
      st = p3dOn() ? openQte3d(h) : openStage({ title: `${foe?.name || 'O inimigo'} vai atacar!${C.perf ? ' PERFEITO!' : ''}`, tone: 'def', hero: h, foe }); if (!st) return; // ainda há um palco fechando: tenta no próximo render
      key = k; t0 = performance.now(); hid = h.id; seen = []; chqOn = false;
      st.fx.speed(true); st.fx.word('!', { color: '#ff2b3d', y: innerHeight * .32 }); st.sfx('threat');
      const zones = (parMs ? `<u class="p" data-ms="${parMs}"></u>` : '') + (esqMs ? `<u class="o" data-ms="${parMs + esqMs}"></u>` : '');
      st.ui.innerHTML = `<div class="df"><div class="df-warn">!</div><div class="cm-ring">${zones}<i class="fk" style="display:none"></i><i class="r"></i><b></b></div><span class="df-dir"></span><div class="df-chips"></div><div class="df-mid"></div><div class="df-row"></div></div>`;
      raf = requestAnimationFrame(frame);
    }
    paint();
  };
  const render3 = render; render = function () { render3(); try { sync(); } catch (e) { console.error(e); } };
}

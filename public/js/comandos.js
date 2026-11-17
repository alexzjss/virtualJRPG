// ===== Comandos de defesa: quando um inimigo vai agir e a janela (S.battle.cmd) inclui um herói deste jogador, aparece um anel que fecha. =====
// Uma tecla só (botão, Espaço ou toque): no fim exato do anel APARA (custa Aura, exige o nó de Aparar); um pouco antes ESQUIVA (de graça, só em golpe anunciado);
// cedo demais pune. Golpes de várias batidas ganham um anel por batida. Se o herói tem uma técnica de Choque, o botão CHOQUE (C) troca o anel por um cabo de guerra.
{
  const css = document.createElement('style');
  css.textContent = `.apr{position:fixed;inset:0;z-index:55;display:flex;align-items:center;justify-content:center;pointer-events:none}
.apr-box{pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 22px;border-radius:14px;background:rgba(12,8,20,.82);border:1px solid #b42b2b;box-shadow:0 0 40px rgba(180,40,40,.45);color:#fde8e8;font:600 15px/1.3 Barlow,sans-serif;max-width:calc(100vw - 32px);text-align:center}
.apr-box.perf{border-color:#ffd24a;box-shadow:0 0 50px rgba(255,210,74,.6)}
.apr-ring{position:relative;width:150px;height:150px}
.apr-ring i{position:absolute;inset:0;border-radius:50%;border:4px solid #ff5a5a;transform-origin:center}
.apr-ring b{position:absolute;inset:58px;border-radius:50%;background:#ffd2d2;box-shadow:0 0 16px #ff5a5a}
.apr-ring u{position:absolute;border-radius:50%;border:2px dashed #ffd2d2;opacity:.8}
.apr-ring u.esq{border-color:#8fd3ff}
.apr-chips{display:flex;gap:6px;justify-content:center;min-height:22px}
.apr-chips span{padding:2px 8px;border-radius:999px;background:#2a2036;font:700 12px/1.5 Barlow,sans-serif;letter-spacing:1px}
.apr-chips span.par{background:#d63b3b}.apr-chips span.esq{background:#2d7fb8}.apr-chips span.cedo,.apr-chips span.late{background:#6b5a2a}
.apr-tug{width:240px;height:18px;border-radius:9px;background:#2a2036;overflow:hidden;position:relative}
.apr-tug i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ffb84a,#ff5a5a);width:0}
.apr-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.apr button{font:700 18px/1 Barlow,sans-serif;letter-spacing:3px;padding:12px 28px;border-radius:10px;border:0;background:#d63b3b;color:#fff;cursor:pointer;min-height:44px}
.apr button.chq{background:#e0a020;color:#1a1020}
.apr button:disabled{opacity:.5;cursor:default}
.apr small{opacity:.85;max-width:300px}`;
  document.head.append(css);
  let el = null, key = '', t0 = 0, raf = 0, hid = '', pend = 0, tugT = 0;
  const D = () => RULES.CMD.DEF;
  const heroes = () => { const C = S?.battle?.cmd; if (gm || !S?.battle?.active || !C) return []; return Object.values(S.chars).filter(c => !c.enemy && c.owner === name && c.hp > 0 && C.tgs?.includes(c.id)); };
  const chqKey = h => (h.skills || []).find(k => S.skills[k]?.cmd === 'choque') || '';
  const kill = () => { if (el) { el.remove(); el = null; } cancelAnimationFrame(raf); clearInterval(tugT); pend = 0; };
  const impact = (C, i) => t0 + C.beats[i] - 150; // o anel fecha um pouco antes do impacto no servidor (ida e volta da rede)
  const press = () => {
    const C = S?.battle?.cmd; if (!el || !C) return;
    if (C.chq?.id === hid) { pend++; return; }
    send({ t: 'def', id: hid });
  };
  const startChq = () => { const C = S?.battle?.cmd, h = S.chars[hid]; if (!el || !C || !h || C.chq) return; send({ t: 'chq', id: hid, skill: chqKey(h) }); };
  addEventListener('keydown', e => {
    if (!el) return;
    if (e.code === 'Space') { e.preventDefault(); press(); }
    else if (e.code === 'KeyC') { const C = S?.battle?.cmd; if (C?.chq?.id === hid) pend++; else startChq(); }
  });
  const frame = () => {
    const C = S?.battle?.cmd; if (!el || !C) return;
    const now = performance.now(), ring = el.querySelector('.apr-ring i'); let i = C.beats.findIndex((_, k) => now <= impact(C, k)); if (i < 0) i = C.beats.length - 1;
    const st = i === 0 ? t0 : impact(C, i - 1), dur = impact(C, i) - st, f = Math.min(1, Math.max(0, (now - st) / dur));
    ring.style.transform = `scale(${1 - .61 * f})`; el.querySelectorAll('.apr-ring u').forEach(u => { u.style.inset = inset(+u.dataset.ms, dur) + 'px'; }); // a faixa de Aparar/Esquiva acompanha a duração do anel da vez
    const bar = el.querySelector('.apr-tug i'); if (bar && C.chq) { const ch = C.chq, p = Math.min(1, (ch.n + pend) / ch.meta); bar.style.width = (p * 100) + '%'; }
    if (now > impact(C, C.beats.length - 1) + 900 + (C.chq ? 3000 : 0)) { kill(); return; }
    raf = requestAnimationFrame(frame);
  };
  const inset = (ms, dur) => Math.round((150 - (58.5 + 91.5 * Math.min(1, ms / dur))) / 2);
  const paint = () => { // o que muda a cada estado: notas, botões e o cabo de guerra
    const C = S.battle.cmd, h = S.chars[hid], z = C.z?.[hid] || {}, notes = C.p?.[hid] || [], foe = S.chars[C.foe];
    const chips = C.beats.map((_, i) => { const v = notes[i]; return `<span class="${v || ''}">${v === 'par' ? 'APAROU' : v === 'esq' ? 'ESQUIVOU' : v === 'cedo' ? 'CEDO' : '•'}</span>`; }).join('');
    const mine = C.chq?.id === hid, tug = mine ? `<div class="apr-tug" aria-label="Choque de poderes"><i></i></div><small>Martele Espaço ou C! Meta: ${C.chq.meta} apertos</small>` : '';
    const canChq = C.chqOk?.includes(hid) && !C.chq && chqKey(h);
    el.querySelector('.apr-title').textContent = `${foe?.name || 'O inimigo'} vai atacar!${C.perf ? ' PERFEITO!' : ''}`;
    el.querySelector('.apr-box').classList.toggle('perf', !!C.perf);
    el.querySelector('.apr-chips').innerHTML = chips; el.querySelector('.apr-mid').innerHTML = tug;
    el.querySelector('.apr-row').innerHTML = (mine ? '' : `<button type="button" class="def">${C.tel ? (z.canP ? 'ESQUIVAR / APARAR' : 'ESQUIVAR') : 'APARAR'}</button>`) + (canChq ? `<button type="button" class="chq">CHOQUE (C)</button>` : '');
    el.querySelector('.apr-hint').textContent = mine ? '' : C.tel ? `${h.name}${z.canP ? ` · Espaço no fim do anel apara (${z.cost || 0} Aura); um pouco antes esquiva` : ' · Espaço um pouco antes do fim do anel esquiva'}` : `${h.name} · ${z.cost || 0} Aura · aperte quando o anel fechar (Espaço)`;
    el.querySelector('.def')?.addEventListener('click', press); el.querySelector('.chq')?.addEventListener('click', startChq);
    if (mine && !tugT) tugT = setInterval(() => { if (pend) { send({ t: 'chq', id: hid, n: pend }); pend = 0; } }, 250);
  };
  const sync = () => {
    const C = S?.battle?.cmd, l = C ? heroes() : [], k = C ? C.foe + ':' + C.at : '';
    if ((!l.length || k !== key) && el) kill();
    if (!l.length) return;
    if (!el) {
      key = k; t0 = performance.now(); hid = l[0].id; const h = l[0], z = C.z?.[hid] || {}, parMs = z.par || 0, esqMs = z.esq || 0;
      el = document.createElement('div'); el.className = 'apr'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'Defender do golpe');
      const zones = (parMs ? `<u class="par" data-ms="${parMs}"></u>` : '') + (esqMs ? `<u class="esq" data-ms="${parMs + esqMs}"></u>` : '');
      el.innerHTML = `<div class="apr-box"><div class="apr-title"></div><div class="apr-ring">${zones}<i></i><b></b></div><div class="apr-chips"></div><div class="apr-mid"></div><div class="apr-row"></div><small class="apr-hint"></small></div>`;
      document.body.append(el); raf = requestAnimationFrame(frame);
    }
    paint();
  };
  const render3 = render; render = function () { render3(); try { sync(); } catch (e) { console.error(e); } };
}

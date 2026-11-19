// ===== cenas do motor luminoso: splash de Limite/Domínio (estilo Star Rail) =====
// Camada DOM por cima de tudo (o canvas WebGL fica sob a HUD, então o fundo da splash é CSS: gradiente do material, faixas de luz
// em transform e, no Domínio, o glifo do elemento girando em tela cheia). Sem filter; só transform e opacity animados.
// LUZCENAS.ult(a, f) resolve no início do golpe (fase 'strike' de LUZP.ultTimeline); quem chama solta o strikeFx em seguida.
(g => {
  const LP = g.LUZP; if (!LP) return;
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const elOf = (a, f) => f.el || (typeof mainEl === 'function' ? mainEl(a) : 'fis');
  const artOf = a => { try { if (typeof PALCO3D !== 'undefined') { const s = PALCO3D.imgSrc(a, 'f'); if (s && !s.fallback) return s.url; } } catch {} return a.imgF || a.img || ''; };
  const glyphOf = (a, el) => (typeof KANJI !== 'undefined' && (KANJI[!a.enemy && a.vinc?.[0] || el] || KANJI.fis)) || '';
  const anim = (el, kf, at, ms, easing = 'cubic-bezier(.2,.8,.2,1)') => el?.animate?.(kf, { delay: at, duration: Math.max(1, ms), easing, fill: 'both' });

  function ult(a, f = {}) {
    if (!a) return Promise.resolve();
    const speed = g.ANIMFX?.settings?.speed || 1, total = LP.duration(null, { speed, reduced: reduced(), sig: 'ult' });
    const T = Object.fromEntries(LP.ultTimeline(total).map(x => [x.k, x])), el = elOf(a, f), M = LP.material(el), dom = !!f.dom;
    const art = artOf(a), streaks = reduced() ? '' : Array.from({ length: 18 }, (_, i) => `<i style="top:${(i * 37) % 100}%;--w:${30 + (i * 53) % 60}%;--d:${(i * 71) % 400}ms"></i>`).join('');
    const d = document.createElement('div'); d.className = `ultsplash ${dom ? 'dom' : 'lim'} ${a.enemy ? 'foe' : ''}`; d.setAttribute('aria-hidden', 'true');
    d.style.cssText = `--c:${esc(a.color || M.rim)};--rim:${M.rim};--core:${M.core}`;
    d.innerHTML = `<i class="us-dim"></i><div class="us-bg"><i class="us-grad"></i><div class="us-streaks">${streaks}</div>${dom ? `<b class="us-glyph">${esc(glyphOf(a, el))}</b>` : ''}</div>
      <div class="us-art">${art ? `<img src="${esc(art)}" alt="">` : `<span>${esc((a.name || '?').slice(0, 1))}</span>`}</div>
      <div class="us-name"><small>${dom ? 'Domínio' : 'Limite'} · ${esc(a.name || '')}</small><b>${esc(f.s || '')}</b><i class="us-line"></i></div>`;
    document.body.append(d);
    const q = s => d.querySelector(s), out = T.back.at, bm = T.back.ms;
    if (reduced()) { anim(d, [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0 }], 0, T.strike.at, 'linear'); }
    else {
      anim(q('.us-dim'), [{ opacity: 0 }, { opacity: 1 }], T.dim.at, T.dim.ms);
      anim(q('.us-bg'), [{ transform: 'translateX(-110%) skewX(-14deg)' }, { transform: 'translateX(0) skewX(-14deg)' }], T.bg.at, Math.min(360, T.bg.ms * .25));
      anim(q('.us-art'), [{ transform: 'translateX(30%) scale(1.04)', opacity: 0 }, { transform: 'translateX(0) scale(1.08)', opacity: 1, offset: .18 }, { transform: 'translateX(-2%) scale(1.16)', opacity: 1 }], T.art.at, T.art.ms, 'cubic-bezier(.1,.7,.3,1)');
      anim(q('.us-name'), [{ transform: 'translateX(-40px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1, offset: .25 }, { transform: 'translateX(12px)', opacity: 1 }], T.name.at, T.name.ms);
      anim(q('.us-line'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], T.name.at + 120, T.name.ms * .5);
      if (dom) anim(q('.us-glyph'), [{ transform: 'translate(-50%,-50%) rotate(0deg) scale(.8)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(40deg) scale(1)', opacity: .32, offset: .2 }, { transform: 'translate(-50%,-50%) rotate(140deg) scale(1.1)', opacity: .32 }], T.bg.at, T.bg.ms, 'linear');
      // volta ao palco: a splash corre para a esquerda e o véu se desfaz enquanto a câmera orbita quem age
      anim(d, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(-18%)', opacity: 0 }], out, bm, 'cubic-bezier(.6,0,.8,.4)');
    }
    return new Promise(res => {
      setTimeout(() => { try { if (typeof PALCO3D !== 'undefined' && document.querySelector('.p3d')) PALCO3D.orbitShot?.(a.id, 45, bm + 600); } catch {} }, out);
      setTimeout(() => { g.LUZ?.pos?.fire?.('speed', { strength: .7 }); res(); }, T.strike.at);
      setTimeout(() => d.remove(), T.strike.at + 60);
    });
  }
  g.LUZCENAS = { ult };
})(globalThis);

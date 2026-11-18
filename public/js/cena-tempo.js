// ===== relógio de cena: hitstop (congela) e câmera lenta para o palco 3D, a coreografia e o motor de efeitos =====
// As animações CSS desaceleram via playbackRate (Web Animations); o canvas lê CENA.now(), que é tempo virtual.
// virtualAt é puro (testado no Node); o que usa document fica sob guarda.
(g => {
  // tempo virtual = real − o que cada trecho [t0,t1) perdeu: (1 − menor fator ativo) por ms
  const virtualAt = (real, segs) => {
    const cut = [...new Set(segs.flatMap(s => [s.t0, s.t1]).filter(t => t < real))].sort((a, b) => a - b);
    let lost = 0;
    for (let i = 0; i < cut.length; i++) {
      const p = cut[i], q = Math.min(real, i + 1 < cut.length ? cut[i + 1] : real); if (q <= p) continue;
      const on = segs.filter(s => s.t0 <= p && s.t1 > p); if (!on.length) continue;
      lost += (q - p) * (1 - Math.min(...on.map(s => s.f)));
    }
    return real - lost;
  };
  const DOM = typeof document !== 'undefined', rnow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let segs = [], base = 0; // base: tempo já perdido por trechos que expiraram (assim a lista não cresce)
  const reduced = () => DOM && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prune = () => { const t = rnow(), old = segs.filter(s => s.t1 <= t); if (!old.length) return; const keep = segs.filter(s => s.t1 > t); base += virtualAt(t, keep) - virtualAt(t, segs); segs = keep; }; // contínuo no instante t
  const now = () => { prune(); const t = rnow(); return virtualAt(t, segs) - base; };
  const factor = () => { const t = rnow(), on = segs.filter(s => s.t0 <= t && s.t1 > t); return on.length ? Math.min(...on.map(s => s.f)) : 1; };
  const inScene = a => { const t = a.effect?.target; return !!t?.closest?.('.p3d,.fxl,.qte3d'); };
  const apply = () => { if (!DOM || !document.getAnimations) return; const f = factor(); for (const a of document.getAnimations()) if (inScene(a) && a.playbackRate !== f) a.playbackRate = f; };
  if (DOM) { const late = () => { if (factor() !== 1) apply(); }; document.addEventListener('animationstart', late, true); document.addEventListener('transitionrun', late, true); }
  const push = (f, ms) => {
    if (reduced() || !(ms > 0)) return Promise.resolve();
    const t = rnow(); segs.push({ t0: t, t1: t + ms, f }); apply();
    return new Promise(res => setTimeout(() => { apply(); res(); }, ms + 5)); // ao expirar, volta ao fator do que ainda está ativo
  };
  const hitstop = ms => push(0, Math.min(160, ms));
  const slow = (f, ms) => push(Math.max(0, Math.min(1, f)), ms);
  const wait = ms => new Promise(res => { const end = now() + ms, tick = () => now() >= end ? res() : DOM && typeof requestAnimationFrame !== 'undefined' && !document.hidden ? requestAnimationFrame(tick) : setTimeout(tick, 50); tick(); });
  const reset = () => { segs = []; base = 0; apply(); };
  g.CENA = { virtualAt, now, factor, hitstop, slow, wait, reset };
})(globalThis);

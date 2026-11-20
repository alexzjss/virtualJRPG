// ===== vida em cada recorte do palco 3D: pose, aura de condição, bolha de escudo, setas de buff, forma, fantasmas, anel do QTE, tinta do KO, entrada e pose final =====
// Tudo por diferença (o render() roda a cada estado e não pode recriar nada que não mudou); as regras puras vêm do PFX.
(g => {
  if (typeof document === 'undefined') return;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mk = (tag, cls, p) => { const e = document.createElement(tag); e.className = cls; p.appendChild(e); return e; };
  const U = id => typeof PALCO3D !== 'undefined' ? PALCO3D.unitOf(id) : null;
  const elCol = c => { try { return ELC[mainEl(c)] || '#fff'; } catch { return '#fff'; } };
  const swap = (u, key, cur, pre) => { for (const k of (u[key] || '').split(' ').filter(Boolean)) u.el.classList.remove(pre + k); for (const k of cur.split(' ').filter(Boolean)) u.el.classList.add(pre + k); u[key] = cur; };
  const passo = u => {
    if (reduced()) return;
    u.passoAt = g.CENA?.now() ?? performance.now();
    u.el.classList.remove('passo'); void u.inner.offsetWidth; u.el.classList.add('passo');
    clearTimeout(u.passoT); u.passoT = setTimeout(() => u.el.classList.remove('passo'), 260);
  };
  const unit = (u, c) => {
    const pose = PFX.poseOf(c).join(' '); if (u.pose !== pose) swap(u, 'pose', pose, 'pose-');
    if (c.hp > 0) u.el.classList.remove('inked');
    const au = c.hp > 0 ? PFX.auraOf(c.st).join(' ') : '';
    if (u.auraK !== au) { u.auraK = au;
      if (!au) { u.aura?.remove(); u.aura = null; }
      else { if (!u.aura) u.aura = mk('i', 'aura', u.inner); u.aura.dataset.a = au; u.aura.innerHTML = au.split(' ').map(a => `<b class="a-${a}">${'<i></i>'.repeat(5)}</b>`).join(''); } }
    // escudo: o máximo é o maior valor visto desde que a bolha abriu; zera quando ela estoura
    const sh = c.hp > 0 ? +c.shield || 0 : 0; u.shMax = sh > 0 ? Math.max(u.shMax || 0, sh) : 0;
    const SC = PFX.shieldCracks(sh, u.shMax), sk = SC.on ? String(SC.cracks) : '';
    if (u.shK !== sk) { u.shK = sk;
      if (sk) { if (!u.bolha) u.bolha = mk('i', 'bolha', u.el); u.bolha.dataset.k = sk; }
      else if (u.bolha) { const b = u.bolha; u.bolha = null; b.classList.add('estoura'); setTimeout(() => b.remove(), 500); } }
    // buffs novos sobem (ou descem) como setas; os que duram ficam como ícones no pé
    const st = c.st || {};
    if (u.stPrev && c.hp > 0) for (const b of PFX.buffDiff(u.stPrev, st)) { const e = mk('b', 'seta ' + (b.dir > 0 ? 'up' : 'dn'), u.el), k = b.k + (b.dir > 0 ? 'Up' : 'Dn');
      e.textContent = (typeof RULES !== 'undefined' && RULES.ST[k]) || k; e.style.setProperty('--sc', b.col); setTimeout(() => e.remove(), 900); }
    u.stPrev = { ...st };
    const bl = c.hp > 0 ? PFX.buffsOf(st) : [], bk = bl.map(b => b.k + b.dir).join(' ');
    if (u.bufK !== bk) { u.bufK = bk; if (!u.bufs) u.bufs = mk('i', 'bufs', u.el); u.bufs.innerHTML = bl.map(b => `<b style="--sc:${b.col}">${b.dir > 0 ? '▲' : '▼'}</b>`).join(''); }
    // forma: flash na entrada e aura contínua na cor do elemento
    const fm = !!c.form && c.hp > 0;
    if (u.formPrev === false && fm && !reduced()) { u.el.classList.add('formfx'); if (typeof ANIMFX === 'undefined' || ANIMFX.settings.flashes) u.el.classList.add('formflash'); setTimeout(() => u.el.classList.remove('formfx', 'formflash'), 700); }
    if (u.formPrev !== fm) { u.formPrev = fm; u.el.classList.toggle('forma', fm); if (fm) u.el.style.setProperty('--fe', elCol(c)); }
  };
  // esquiva: o recorte desliza para o lado e deixa três cópias que somem
  const ghosts = (id, dir = 1) => { const u = U(id); if (!u?.img || reduced()) return; u.el.style.setProperty('--gd', dir);
    [.45, .3, .15].forEach((a, i) => { const gh = u.img.cloneNode(); gh.className = 'ghost'; gh.style.opacity = a; gh.style.setProperty('--gi', i + 1); u.inner.appendChild(gh); setTimeout(() => gh.remove(), 520); });
    u.el.classList.remove('esquiva'); void u.el.offsetWidth; u.el.classList.add('esquiva'); setTimeout(() => u.el.classList.remove('esquiva'), 520); };
  // Cada família ganha uma preparação corporal legível; o recorte inteiro continua preso ao seu ponto no mundo.
  const action = (id, family, tier = 1, seed = 0) => { const u = U(id); if (!u?.img || reduced()) return;
    const known = ['projectile', 'beam', 'slash', 'smash', 'pierce', 'dash', 'area', 'rain', 'ritual', 'summon', 'psychic', 'musical', 'heal', 'barrier', 'form'];
    if (!known.includes(family)) return;
    u.el.classList.remove(...known.map(k => 'act-' + k));
    u.el.style.setProperty('--act-tier', Math.max(1, Math.min(3, tier))); u.el.style.setProperty('--act-seed', (seed % 2) ? '-1' : '1');
    void u.el.offsetWidth; u.el.classList.add('act-' + family); clearTimeout(u.actT);
    u.actT = setTimeout(() => { u.el.classList.remove('act-' + family); u.el.style.removeProperty('--act-tier'); u.el.style.removeProperty('--act-seed'); }, 860);
  };
  // anel do QTE deitado no chão do herói: o de fora encolhe até o alvo no instante do golpe
  const qteRing = (id, closeAt) => { const u = U(id); if (!u) return { grade() {}, close() {} };
    u.el.querySelector(':scope > .qring')?.remove();
    const r = mk('i', 'qring', u.el), o = mk('i', 'qo', r); mk('i', 'qt', r); const ms = Math.max(120, closeAt - performance.now());
    if (!reduced() && o.animate) o.animate([{ transform: 'scale(2.2)', opacity: .4 }, { transform: 'scale(1)', opacity: 1 }], { duration: ms, fill: 'forwards' });
    let shut = false; const close = () => { if (shut) return; shut = true; r.classList.add('out'); setTimeout(() => r.remove(), 260); };
    setTimeout(close, ms + 1600);
    return { grade(gr) { r.dataset.g = gr; r.classList.add('graded'); setTimeout(close, 400); }, close }; };
  // KO do inimigo: pinceladas no canvas e o recorte some
  const inkOut = (id, color) => { const u = U(id); if (!u) return; if (typeof ANIMFX !== 'undefined' && ANIMFX.ink) ANIMFX.ink(u.el.getBoundingClientRect(), color); u.el.classList.add('inked'); };
  // abertura: heróis entram pelo lado, um a um; inimigos sobem do chão numa nuvem de tinta
  const enter = (hs, fs) => { if (reduced()) return; const go = (ids, cls) => ids.forEach((id, i) => { const u = U(id); if (!u) return; u.el.style.setProperty('--i', i); u.el.classList.add(cls);
    if (cls === 'in-f') { const p = mk('i', 'puff', u.el); setTimeout(() => p.remove(), 800); } setTimeout(() => u.el.classList.remove(cls), 1300 + i * 120); });
    go(hs, 'in-h'); go(fs, 'in-f'); };
  // pose final: vit (pulo e brilho), cai (deitam um a um), foge (correm para a câmera com poeira)
  const pose = (ids, cls, step = 150) => ids.forEach((id, i) => setTimeout(() => { const u = U(id); if (!u) return; u.el.classList.add('end-' + cls);
    if (cls === 'foge') { const p = mk('i', 'puff', u.el); setTimeout(() => p.remove(), 900); } }, reduced() ? 0 : i * step));
  g.PVIDA = { unit, passo, ghosts, action, qteRing, inkOut, enter, pose };
})(globalThis);

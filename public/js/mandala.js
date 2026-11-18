// ===== árvore de habilidades como mandala de esferas (Canvas 2D) =====
// Marcial no centro, os setores (9 Vínculos, Aura, Ocultismo) como pétalas; cada linha é uma ligação de verdade (RULES.linked).
// place/edges são puros (testados no Node); mount/focus/zoom/learned desenham e cuidam da câmera, que sobrevive às renderizações da página.
(g => {
  const U = 96, C = 55, R = 24, LOD = 0.25, TAU = Math.PI * 2;
  // posição de cada nó: wx, wy do servidor; skill sem posição (do mestre ou importada) segue a mesma escala da grade
  const place = skills => { const P = new Map(); for (const [id, s] of Object.entries(skills)) P.set(id, Number.isFinite(s.wx) && Number.isFinite(s.wy) ? [s.wx, s.wy] : [((s.gx ?? 0) - C) * U, ((s.gy ?? 0) - C) * U]); return P; };
  // pares ligados, cada um uma vez, só entre nós visíveis. Os que têm ln saem dele; os sem ln procuram vizinhos de grade.
  const edges = (skills, visible) => {
    const out = [], seen = new Set(), add = (a, b) => { const k = a < b ? a + '|' + b : b + '|' + a; if (!seen.has(k) && visible.has(a) && visible.has(b)) { seen.add(k); out.push([a, b]); } };
    const loose = [], cell = new Map();
    for (const id of visible) { const s = skills[id]; if (!s) continue; for (const j of s.ln || []) if (skills[j]) add(id, j); if (!Number.isFinite(s.wx)) loose.push(id); }
    if (loose.length) { for (const id of visible) { const s = skills[id]; if (s?.gx != null) cell.set(s.gx + ',' + s.gy, id); }
      for (const id of loose) { const s = skills[id]; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const j = cell.get((s.gx + dx) + ',' + (s.gy + dy)); if (j && j !== id && g.RULES?.linked(s, skills[j], id, j)) add(id, j); } } }
    return out;
  };
  const M = { U, R, LOD, place, edges };
  g.MANDALA = M;
  if (typeof document === 'undefined') return;

  // ---------- desenho ----------
  const cam = M.cam = { x: 0, y: 0, z: 0.7 }, anim = new Map(); // id → instante em que foi aprendido
  let ro, cv, cx, host, o = null, P = new Map(), E = [], seals = [], stars = [], motes = [], bound = 2000, key = null, hover = null, dirty = true, last = 0, raf = 0, W = 0, H = 0, DPR = 1;
  const hexA = (h, a) => { const v = parseInt((h || '#ffffff').slice(1), 16); return `rgba(${v >> 16},${v >> 8 & 255},${v & 255},${a})`; };
  const col = el => (typeof ELC !== 'undefined' && ELC[el === 'armas' ? 'fis' : el]) || '#ffffff';
  const grp = s => s.br?.startsWith('armas') ? 'armas' : s.el; // a Árvore de Armas é um bloco à parte (el 'fis', sem ligação com o Marcial): ganha o próprio selo
  // IN: largura coberta pela gaveta à direita; o centro da câmera e o minimapa ficam na parte visível
  const VW = () => W - (o?.inset || 0);
  const w2s = (x, y) => [(x - cam.x) * cam.z + VW() / 2, (y - cam.y) * cam.z + H / 2], s2w = (x, y) => [(x - VW() / 2) / cam.z + cam.x, (y - H / 2) / cam.z + cam.y];
  const MINI = 150, miniRect = () => [12, 12, MINI, MINI]; // canto de cima à esquerda: embaixo ficam os botões, à direita o zoom
  const ICON = { dmg: '⚔', mental: '⚔', heal: '✚', passive: '◆', util: '✦', form: '変' };
  // nome em até duas linhas de ~13 letras
  const wrap = n => { const out = []; let l = ''; for (const w of n.split(' ')) { if (l && (l + ' ' + w).length > 13) { out.push(l); l = w; } else l = l ? l + ' ' + w : w; } out.push(l); return out.length > 2 ? [out[0], out.slice(1).join(' ').slice(0, 14) + '…'] : out; };
  const mark = s => s.secret ? '?' : s.back ? '禁' : s.limit ? '極' : s.kind === 'form' ? '変' : s.circ ? '儀' : s.duo ? '双' : s.vow ? '誓' : s.summon ? '召' : ICON[s.kind] || (typeof KANJI !== 'undefined' ? KANJI[s.el] : '•');

  function build() { // posições, ligações e selos dos setores; refeito quando as definições ou a lista visível mudam
    P = place(o.skills); E = edges(o.skills, new Set(o.ids));
    const cen = {}; for (const id of o.ids) { const s = o.skills[id], p = P.get(id), c = cen[grp(s)] ||= { x: 0, y: 0, n: 0, ids: [] }; c.x += p[0]; c.y += p[1]; c.n++; c.ids.push(id); }
    bound = 400; seals = Object.entries(cen).map(([el, c]) => { const x = c.x / c.n, y = c.y / c.n; let r = 0; for (const id of c.ids) { const p = P.get(id); r += Math.hypot(p[0] - x, p[1] - y); bound = Math.max(bound, Math.abs(p[0]), Math.abs(p[1])); } return { el, x, y, r: Math.max(180, r / c.n * 1.3) }; });
    if (!stars.length) for (let i = 0; i < 600; i++) stars.push([(Math.random() * 2 - 1) * 3200, (Math.random() * 2 - 1) * 3200, Math.random() * 1.5 + .3, Math.random() * TAU]);
    motes = seals.filter(s => s.el !== 'fis').flatMap(s => Array.from({ length: 14 }, () => [s, Math.random() * TAU, Math.random() * s.r, Math.random() * TAU]));
  }
  const resize = () => { if (!host) return; const r = host.getBoundingClientRect(); DPR = devicePixelRatio || 1; W = Math.max(200, r.width); H = Math.max(200, r.height); cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px'; dirty = true; };
  let lively = true; // o último quadro tinha algo pulsando na tela (nó disponível, rota ou animação)
  const busy = () => anim.size || o?.route?.length > 1 || lively;

  function draw(now) {
    raf = 0; if (!cv?.isConnected || !o) return;
    if (document.hidden) { raf = requestAnimationFrame(draw); return; }
    if (!dirty && now - last < (busy() ? 33 : 100)) { raf = requestAnimationFrame(draw); return; }
    last = now; dirty = false; const T = now / 1000, far = cam.z < LOD;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const bg = cx.createRadialGradient(...w2s(0, 0), 0, ...w2s(0, 0), Math.max(W, H) * .9); bg.addColorStop(0, '#15101c'); bg.addColorStop(1, '#07070d'); cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
    for (const [sx, sy, r, ph] of stars) { const [x, y] = w2s(sx, sy); if (x < 0 || y < 0 || x > W || y > H) continue; cx.fillStyle = `rgba(210,200,255,${.12 + .2 * Math.sin(T * 1.3 + ph)})`; cx.fillRect(x, y, r, r); }
    // fundo de cada setor: halo na cor do patrono, partículas lentas e o kanji grande (selo quando afastado)
    for (const s of seals) { const [x, y] = w2s(s.x, s.y), r = s.r * cam.z * 1.3, c = col(s.el), mine = s.el === 'fis' || s.el === 'armas' || o.mineEls?.has(s.el);
      const gr = cx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(c, mine ? .17 : .08)); gr.addColorStop(1, hexA(c, 0)); cx.fillStyle = gr; cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill();
      cx.save(); cx.globalAlpha = far ? .9 : .1; cx.fillStyle = c; cx.font = `${Math.max(22, r * .75)}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(s.el === 'armas' ? '武' : typeof KANJI !== 'undefined' ? KANJI[s.el] || '' : '', x, y); cx.restore();
      if (far) { cx.strokeStyle = hexA(c, .55); cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, y, Math.max(26, r * .5), 0, TAU); cx.stroke();
        cx.fillStyle = hexA(c, .95); cx.font = '600 13px system-ui,sans-serif'; cx.textAlign = 'center'; cx.fillText((s.el === 'armas' ? 'Armas' : typeof PATRON !== 'undefined' ? PATRON[s.el] : s.el) + (mine && s.el !== 'fis' && s.el !== 'armas' ? ' · seu Vínculo' : ''), x, y + Math.max(26, r * .5) + 16); } }
    for (const [s, a, d, ph] of motes) { const t = T * .15 + ph, [x, y] = w2s(s.x + Math.cos(a + t) * d, s.y + Math.sin(a + t) * d); if (x < 0 || y < 0 || x > W || y > H) continue; cx.fillStyle = hexA(col(s.el), .25 + .2 * Math.sin(T + ph)); cx.beginPath(); cx.arc(x, y, Math.max(1, 2.5 * cam.z), 0, TAU); cx.fill(); }
    // trilhas
    cx.lineCap = 'round';
    for (const [a, b] of E) { const pa = P.get(a), pb = P.get(b), [x1, y1] = w2s(...pa), [x2, y2] = w2s(...pb);
      if (Math.max(x1, x2) < -40 || Math.min(x1, x2) > W + 40 || Math.max(y1, y2) < -40 || Math.min(y1, y2) > H + 40) continue;
      const sa = o.state(a), sb = o.state(b), on = sa === 'own' && sb === 'own', out = sa === 'out' || sb === 'out', sec = sa === 'secret' || sb === 'secret';
      const el = o.skills[a].el === 'fis' ? o.skills[b].el : o.skills[a].el, c = col(el), mx = (x1 + x2) / 2 + (y2 - y1) * .16, my = (y1 + y2) / 2 - (x2 - x1) * .16;
      const lit = [a, b].some(id => anim.has(id) && now - anim.get(id) < 900);
      cx.strokeStyle = lit ? '#ffffff' : on ? hexA(c, .95) : out ? hexA(c, .08) : sec ? hexA(c, .16) : hexA(c, .38); cx.lineWidth = on || lit ? Math.max(1.5, 4 * cam.z) : Math.max(.6, 2 * cam.z);
      cx.beginPath(); cx.moveTo(x1, y1); cx.quadraticCurveTo(mx, my, x2, y2); cx.stroke();
      if (on && !far) { const k = (T * .5 + (a.length * 7 + b.length) * .13) % 1, qx = (1 - k) ** 2 * x1 + 2 * (1 - k) * k * mx + k * k * x2, qy = (1 - k) ** 2 * y1 + 2 * (1 - k) * k * my + k * k * y2; cx.fillStyle = hexA(c, .9); cx.beginPath(); cx.arc(qx, qy, Math.max(1.5, 3 * cam.z), 0, TAU); cx.fill(); }
      // portão: na trilha que chega a um nó travado (requisito, Despertar, escolha trancada) vindo de um aprendido
      const gate = sa === 'own' && sb !== 'own' && o.marks(b).gate ? b : sb === 'own' && sa !== 'own' && o.marks(a).gate ? a : null;
      if (gate && !far && cam.z > .45) { const gx = (x1 + 2 * mx + x2) / 4, gy = (y1 + 2 * my + y2) / 4, z = Math.max(7, 9 * cam.z); cx.fillStyle = '#0b0b14'; cx.strokeStyle = hexA(c, .95); cx.lineWidth = 1.5; cx.fillRect(gx - z, gy - z, 2 * z, 2 * z); cx.strokeRect(gx - z, gy - z, 2 * z, 2 * z); cx.fillStyle = hexA(c, .95); cx.font = `${Math.round(z * 1.3)}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('⛩', gx, gy + 1); } }
    // rota até o nó escolhido
    if (o.route?.length > 1) { cx.strokeStyle = '#ffffff'; cx.lineWidth = 3; cx.setLineDash([10, 8]); cx.lineDashOffset = -T * 30; cx.beginPath(); o.route.forEach((id, i) => { const [x, y] = w2s(...P.get(id)); i ? cx.lineTo(x, y) : cx.moveTo(x, y); }); cx.stroke(); cx.setLineDash([]); }
    // esferas
    const r0 = Math.max(1.5, R * cam.z); let pulse = false;
    for (const id of o.ids) { const s = o.skills[id], [x, y] = w2s(...P.get(id)); if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      const st = o.state(id), mk = o.marks(id), c = col(s.el), r = r0 * (s.limit || s.back ? 1.25 : 1);
      if (far) { cx.fillStyle = st === 'own' ? c : hexA(c, st === 'out' || st === 'secret' ? .14 : .45); cx.beginPath(); cx.arc(x, y, Math.max(1.2, r * .7), 0, TAU); cx.fill(); continue; }
      const gr = cx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
      if (st === 'own') { gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, c); gr.addColorStop(1, hexA(c, .35)); } else { gr.addColorStop(0, hexA(c, st === 'out' ? .1 : .32)); gr.addColorStop(1, 'rgba(10,10,18,.95)'); }
      cx.globalAlpha = mk.dim ? .25 : 1; cx.fillStyle = gr; cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill(); cx.strokeStyle = hexA(c, st === 'out' ? .2 : .85); cx.lineWidth = Math.max(1, 1.6 * cam.z); cx.stroke();
      if (s.kind === 'passive') { cx.strokeStyle = hexA(c, .5); cx.beginPath(); cx.arc(x, y, r * 1.25, 0, TAU); cx.stroke(); }
      if (st === 'av') { pulse = true; cx.strokeStyle = hexA(c, .5 + .4 * Math.sin(T * 3 + x * .01)); cx.lineWidth = Math.max(1.5, 3 * cam.z); cx.beginPath(); cx.arc(x, y, r * 1.55, 0, TAU); cx.stroke(); }
      if (mk.hit) { cx.strokeStyle = 'rgba(255,240,150,.95)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, r * 1.9 + Math.sin(T * 4) * 2, 0, TAU); cx.stroke(); }
      if (mk.plan) { cx.fillStyle = '#ffd34d'; cx.font = `${Math.round(r * .8)}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('★', x + r, y - r); }
      if (id === hover || mk.sel) { cx.strokeStyle = '#ffffff'; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, r * 1.8, 0, TAU); cx.stroke(); }
      const t = anim.get(id); if (t != null) { const k = (now - t) / 700; if (k >= 1.3) anim.delete(id); else { cx.fillStyle = hexA(c, Math.max(0, .8 * (1 - k))); cx.beginPath(); cx.arc(x, y, r * (1 + k * 2.5), 0, TAU); cx.fill(); } }
      if (st === 'secret') { const f = cx.createRadialGradient(x, y, 0, x, y, r * 2.6); f.addColorStop(0, 'rgba(40,36,60,.92)'); f.addColorStop(1, 'rgba(40,36,60,0)'); cx.fillStyle = f; cx.beginPath(); cx.arc(x, y, r * 2.6, 0, TAU); cx.fill(); }
      if (s.ramo && cam.z > .4 && st !== 'secret') { cx.fillStyle = hexA(c, .95); cx.font = `700 ${Math.round(Math.min(15, 9 + 5 * cam.z))}px system-ui,sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.fillText(s.ramo.toUpperCase(), x, y - r - 7); } // nome do ramo (Árvore de Armas)
      const full = cam.z >= .8, named = full || st === 'own' || st === 'av' || id === hover || mk.sel; // com zoom médio, só os nomes que importam
      if (cam.z > .5) { cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = st === 'own' ? '#111' : hexA(c, .95); cx.font = `${Math.round(r * .95)}px serif`;
        cx.fillText(st === 'secret' ? '?' : mk.rq && st !== 'own' ? '鎖' : mark(s), x, y + 1);
        const fs = Math.round(Math.min(14, 9 + 4 * cam.z)), lines = st === 'secret' ? ['???'] : wrap(s.name); cx.fillStyle = st === 'secret' ? '#7a7799' : st === 'out' ? '#77738f' : '#ece8ff'; cx.font = `600 ${fs}px system-ui,sans-serif`;
        if (named) lines.forEach((l, i) => cx.fillText(l, x, y + r + fs * (i + .9)));
        if (named && st !== 'own' && st !== 'secret' && mk.xp != null) { cx.fillStyle = mk.poor ? 'rgba(255,120,120,.9)' : hexA(c, .85); cx.font = `${Math.round(Math.min(12, r * .5))}px system-ui,sans-serif`; cx.fillText(mk.xp + ' XP', x, y + r + fs * (lines.length + .9)); } }
      cx.globalAlpha = 1; }
    lively = pulse;
    // minimapa
    const [mx0, my0, mw] = miniRect(), k = mw / (bound * 2.2); cx.fillStyle = 'rgba(11,11,20,.88)'; cx.fillRect(mx0, my0, mw, mw); cx.strokeStyle = 'rgba(255,255,255,.18)'; cx.strokeRect(mx0, my0, mw, mw);
    for (const id of o.ids) { const [x, y] = P.get(id), st = o.state(id); cx.fillStyle = st === 'own' ? '#ffffff' : hexA(col(o.skills[id].el), st === 'out' || st === 'secret' ? .25 : .6); cx.fillRect(mx0 + mw / 2 + x * k, my0 + mw / 2 + y * k, 1.3, 1.3); }
    const [a1, b1] = s2w(0, 0), [a2, b2] = s2w(W, H); cx.strokeStyle = '#ffffff'; cx.strokeRect(mx0 + mw / 2 + a1 * k, my0 + mw / 2 + b1 * k, (a2 - a1) * k, (b2 - b1) * k);
    raf = requestAnimationFrame(draw);
  }
  const kick = () => { dirty = true; if (!raf) raf = requestAnimationFrame(draw); };

  // ---------- câmera e entrada ----------
  const clampZ = z => Math.min(3, Math.max(.06, z));
  let flying = 0;
  const fly = (x, y, z) => { const a = { ...cam }, t0 = performance.now(), id = ++flying; (function step() { if (id !== flying) return; const k = Math.min(1, (performance.now() - t0) / 550), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; cam.x = a.x + (x - a.x) * e; cam.y = a.y + (y - a.y) * e; cam.z = a.z * Math.pow(clampZ(z) / a.z, e); kick(); if (k < 1) requestAnimationFrame(step); })(); };
  const zoomAt = (px, py, z) => { const [wx, wy] = s2w(px, py); cam.z = clampZ(z); const [nx, ny] = s2w(px, py); cam.x += wx - nx; cam.y += wy - ny; kick(); };
  const pick = (px, py) => { if (cam.z < LOD) return null; let best = null, bd = Math.max(8, R * 1.3 * cam.z) ** 2; for (const id of o.ids) { const [x, y] = w2s(...P.get(id)), d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = id; } } return best; };
  const fitAll = () => { const ps = o.ids.map(id => P.get(id)); if (!ps.length) return fly(0, 0, Math.min(VW(), H) / (bound * 2.2)); const x0 = Math.min(...ps.map(p => p[0])), x1 = Math.max(...ps.map(p => p[0])), y0 = Math.min(...ps.map(p => p[1])), y1 = Math.max(...ps.map(p => p[1]));
    fly((x0 + x1) / 2, (y0 + y1) / 2, Math.min(VW() / Math.max(400, (x1 - x0) * 1.15), H / Math.max(400, (y1 - y0) * 1.15))); }; // enquadra mandala e Árvore de Armas
  M.focus = t => { if (!o) return; if (t === 'all') return fitAll();
    if (t === 'armas') { const s = seals.find(s => s.el === 'armas'); if (s) fly(s.x, s.y, Math.max(.6, Math.min(cam.z, .9))); return; }
    if (t === 'core') { const p = P.get('g0') || [0, 0]; return fly(p[0], p[1], Math.max(cam.z, .9)); }
    if (t === 'mine') { const own = o.ids.filter(id => o.state(id) === 'own'); if (!own.length) return M.focus('core'); const xs = own.map(id => P.get(id)); return fly(xs.reduce((a, p) => a + p[0], 0) / xs.length, xs.reduce((a, p) => a + p[1], 0) / xs.length, .9); }
    const p = P.get(t); if (p) fly(p[0], p[1], Math.max(cam.z, .9)); };
  M.zoom = f => zoomAt(VW() / 2, H / 2, cam.z * f);
  M.learned = id => { anim.set(id, performance.now()); kick(); };

  const ptr = new Map(); let drag = null, pinch = null, wantFocus = false;
  function wire() {
    cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; wantFocus = true; cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.offsetX, e.offsetY]); flying++;
      if (ptr.size === 2) { const [p, q] = [...ptr.values()]; pinch = { d: Math.hypot(p[0] - q[0], p[1] - q[1]), z: cam.z }; drag = null; } else drag = { x: e.offsetX, y: e.offsetY, cx: cam.x, cy: cam.y, moved: 0 }; });
    cv.addEventListener('pointermove', e => {
      if (drag && e.pointerType === 'mouse' && !e.buttons) { drag = null; ptr.clear(); } // o botão foi solto fora (o render tirou a captura)
      if (ptr.has(e.pointerId)) ptr.set(e.pointerId, [e.offsetX, e.offsetY]);
      if (pinch && ptr.size === 2) { const [p, q] = [...ptr.values()]; zoomAt((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, pinch.z * Math.hypot(p[0] - q[0], p[1] - q[1]) / pinch.d); return; }
      if (drag) { const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy)); if (drag.moved > 4) { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; kick(); } }
      const h = drag?.moved > 4 ? null : pick(e.offsetX, e.offsetY); if (h !== hover) { hover = h; kick(); } o?.onHover?.(h, e.clientX, e.clientY); cv.style.cursor = h ? 'pointer' : drag ? 'grabbing' : 'grab'; });
    const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null;
      if (drag && drag.moved <= 4 && e.type === 'pointerup') { const [mx0, my0, mw] = miniRect();
        if (e.offsetX >= mx0 && e.offsetY >= my0 && e.offsetX <= mx0 + mw && e.offsetY <= my0 + mw) { const k = (bound * 2.2) / mw; fly((e.offsetX - mx0 - mw / 2) * k, (e.offsetY - my0 - mw / 2) * k, cam.z); }
        else { const id = pick(e.offsetX, e.offsetY); if (id) o?.onPick?.(id); else if (cam.z < LOD) { const [wx, wy] = s2w(e.offsetX, e.offsetY), s = seals.find(s => Math.hypot(s.x - wx, s.y - wy) < s.r); if (s) fly(s.x, s.y, .6); } } }
      drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    addEventListener('pointerup', e => { if (e.target !== cv && ptr.has(e.pointerId)) { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (!ptr.size) drag = null; } });
    // 8. foco do teclado: o canvas volta a ter foco depois de cada render se o jogador estava nele
    cv.addEventListener('keydown', () => wantFocus = true);
    document.addEventListener('pointerdown', e => { if (e.target !== cv) wantFocus = false; }, true);
    cv.addEventListener('pointerleave', () => { if (hover) { hover = null; kick(); } o?.onHover?.(null); });
    cv.addEventListener('wheel', e => { e.preventDefault(); flying++; zoomAt(e.offsetX, e.offsetY, cam.z * Math.exp(-Math.max(-120, Math.min(120, e.deltaY * (e.deltaMode ? 33 : 1))) / 400)); }, { passive: false });
    cv.addEventListener('keydown', e => { const s = 80 / cam.z, mv = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
      if (mv) { e.preventDefault(); cam.x += mv[0]; cam.y += mv[1]; kick(); } else if (e.key === '+' || e.key === '=') M.zoom(1.3); else if (e.key === '-') M.zoom(1 / 1.3); });
    document.addEventListener('visibilitychange', kick);
  }

  // monta (ou reencaixa) o canvas em host. opts: { skills, ids, state(id), marks(id), route, mineEls, key, inset, onPick(id), onHover(id, x, y) }
  M.mount = (h, opts) => {
    if (!cv) { cv = document.createElement('canvas'); cv.tabIndex = 0; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Mandala de habilidades: arraste para mover, roda ou + − para o zoom, setas para andar'); cx = cv.getContext('2d'); }
    const rebuild = !o || o.skills !== opts.skills || o.ids.length !== opts.ids.length || o.ids.some((id, i) => id !== opts.ids[i]);
    if (host !== h) { host = h; h.prepend(cv); if (!ro) { ro = new ResizeObserver(resize); wire(); } ro.disconnect(); ro.observe(h); }
    else if (!h.contains(cv)) h.prepend(cv);
    o = opts; resize(); if (rebuild) build(); if (wantFocus && document.activeElement !== cv) cv.focus({ preventScroll: true });
    if (opts.key !== key) { key = opts.key; const own = o.ids.filter(id => o.state(id) === 'own'); if (own.length) { const xs = own.map(id => P.get(id)); Object.assign(cam, { x: xs.reduce((a, p) => a + p[0], 0) / xs.length, y: xs.reduce((a, p) => a + p[1], 0) / xs.length, z: .9 }); } else { const p = P.get('g0') || [0, 0]; Object.assign(cam, { x: p[0], y: p[1], z: .9 }); } }
    kick();
  };
})(globalThis);

// ===== palco 3D da batalha (CSS 3D): cenário, chão, recortes e câmera por turno =====
// O mundo mora fora do #app (fixo no body) e é atualizado por diferença; o #app só guarda um retângulo vazio ([data-p3d]).
// formation/cameraFor/imgSrc são puros (testados no Node); o que usa document fica dentro de sync e das funções que ele chama.
(g => {
  const POS_H = [[-430, 0], [330, 60], [610, -120], [90, -200]], COLS_F = 5; // heróis: 4 por fileira; inimigos: arco de 5
  const n0 = v => v + 0; // evita -0
  // ----- grid → mundo -----
  const MIN_SEP = 230, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // fr: eixo da batalha (ax) + escala; a profundidade entre os grupos fica entre 900 e 2600 px
  const frame = (ax, cols, rows) => { const d = ax?.d || 0, D = clamp(d * 260, 900, 2600); return { a: ax?.a || 0, cx: ax?.cx || 0, cy: ax?.cy || 0, k: d > 0 ? D / d : 260, D, cols, rows }; };
  // origem no centro dos heróis; z = -along * k (inimigos ao fundo), x = perp * k (a direita do eixo vai para +x)
  const toWorld = (gx, gy, fr, raw) => {
    const dx = gx - fr.cx, dy = gy - fr.cy, c = Math.cos(fr.a), s = Math.sin(fr.a), along = dx * c + dy * s, perp = -dx * s + dy * c;
    if (raw) return { x: perp * fr.k, z: -along * fr.k };
    return { x: n0(Math.round(clamp(perp * fr.k, -1000, 1000))), z: n0(Math.round(clamp(-along * fr.k, -fr.D - 900, 400))) };
  };
  // distância entre dois tokens: casas (Chebyshev, como RULES) e metros quando a cena tem escala
  const rangeOf = (a, b, unit) => { if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null; const casas = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); return { casas, m: unit > 0 ? +(casas * unit).toFixed(2) : null }; };
  // posição (x, z) de cada combatente: do grid; sem posição, slot de reserva do seu lado; depois separa quem ficou colado
  const formation = (chars, fr) => {
    const M = new Map(), ids = [];
    let ih = 0, ie = 0;
    const placed = c => c.x != null && c.y != null;
    for (const c of chars) { if (placed(c)) M.set(c.id, toWorld(c.x, c.y, fr)); ids.push(c.id); }
    const bossId = chars.find(c => c.enemy && c.boss && !placed(c))?.id, nFoe = chars.filter(c => c.enemy && !placed(c)).length, C = Math.min(COLS_F, nFoe), mid = (C - 1) / 2;
    for (const c of chars) {
      if (placed(c)) continue;
      if (c.id === bossId) { M.set(c.id, { x: 0, z: n0(-fr.D - 250) }); continue; } // chefe: centro, mais ao fundo
      if (!c.enemy) { const i = ih++, [x, z] = POS_H[i % 4]; M.set(c.id, { x, z: n0(z - 260 * Math.floor(i / 4)) }); }
      else if (bossId) { const i = ie++, sd = i % 2 ? 1 : -1, rw = Math.floor(i / 2); M.set(c.id, { x: n0(sd * (420 + 340 * rw)), z: n0(-fr.D + 120 * rw) }); } // lacaios abrem o arco nas laterais
      else { const i = ie++, col = i % COLS_F, row = Math.floor(i / COLS_F), d = mid ? Math.abs(col - mid) / mid : 0;
        M.set(c.id, { x: n0(Math.round((col - mid) * 370 + 185 * row)), z: n0(Math.round(-fr.D - 200 * d - 300 * row)) }); }
    }
    for (let pass = 0; pass < 8; pass++) { let moved = false;
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const a = M.get(ids[i]), b = M.get(ids[j]), dz = a.z - b.z; if (Math.hypot(a.x - b.x, dz) >= MIN_SEP) continue;
        const need = Math.sqrt(MIN_SEP * MIN_SEP - dz * dz), gap = Math.ceil((need - Math.abs(a.x - b.x)) / 2), dir = a.x <= b.x ? -1 : 1; // a para a esquerda, a menos que já esteja à direita
        a.x = n0(a.x + dir * gap); b.x = n0(b.x - dir * gap); moved = true;
      }
      if (!moved) break; }
    return M;
  };
  // câmera: translate3d(tx,ty,tz) rotateY(ry) aplicado ao mundo (o giro é em volta da origem do mundo, depois vem a translação)
  // CSS rotateY(θ): x' = x·cosθ + z·sinθ, z' = −x·sinθ + z·cosθ
  const PERSP = 1000, rotP = (p, ry) => { const r = ry * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return { x: p.x * c + p.z * s, z: -p.x * s + p.z * c }; };
  const cameraFor = v => {
    const a = v.at || { x: 0, z: 0 }, t = v.to || a; let r;
    if (v.kind === 'select') { // mira: vista neutra e estável, com todos os candidatos dentro da área útil
      const pts = (v.pts && v.pts.length ? v.pts : [a]), xs = pts.map(p => p.x), zs = pts.map(p => p.z), C = { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
      const w = v.w || 1440, safe = w * .36, k = safe / PERSP, sx = w > 900 ? 50 : 0; // deixa respiro para a ordem à esquerda
      const tx = sx - C.x, maxZ = Math.max(...zs); let tz = 560 - maxZ;
      for (const p of pts) tz = Math.min(tz, PERSP - Math.abs(p.x + tx) / Math.max(k, .2) - p.z);
      tz = clamp(Math.floor(tz / 10) * 10, -1800, 320);
      r = { tx, ty: Math.round(Math.max(0, -tz) * .035), tz, ry: 0 };
    } else if (v.kind === 'table') { // ombro de quem age, olhando o centro de todos; recua até caber a mesa (quem fica atrás do ombro não conta)
      const pts = (v.pts && v.pts.length ? v.pts : [a]), C = pts.reduce((m, p) => ({ x: m.x + p.x / pts.length, z: m.z + p.z / pts.length }), { x: 0, z: 0 });
      let dx = C.x - a.x, dz = C.z - a.z; if (Math.hypot(dx, dz) < 60) { dx = 0; dz = v.foe ? 1 : -1; }
      const SX = -200, ZF = 420, k = ((v.w || 1440) / 2 * .82) / PERSP, L = Math.hypot(dx, dz); // ombro: quem age fica à esquerda (SX) e o centro da mesa no meio da tela
      const ry = Math.round((Math.atan2(dx, -dz) + Math.asin(clamp(SX / Math.max(L, 1), -.6, .6))) * 1800 / Math.PI) / 10, A = rotP(a, ry);
      const tx = SX - A.x, tz0 = ZF - A.z; let b = 0;
      for (const p of pts) { const q = rotP(p, ry); if (q.z > A.z + 300) continue; b = Math.max(b, q.z + tz0 - PERSP + Math.abs(q.x + tx) / k); }
      b = clamp(Math.ceil(b / 10) * 10, 0, 1400);
      r = { tx, ty: Math.round(b * .08), tz: tz0 - b, ry };
    } else if (v.kind === 'zoom') { const ry = v.ry || 0, T = rotP(t, ry); r = { tx: -T.x, ty: -40, tz: -T.z - 420, ry }; }
    else if (v.kind === 'orbit') { const ry = (v.ry0 || 0) + (v.deg || 0), A = rotP(a, ry); r = { tx: -A.x, ty: -60, tz: -A.z - 620 - (v.back || 0), ry }; } // arco cinematográfico em volta de quem age
    else if (v.kind === 'aim') r = { tx: -(a.x * .55 + t.x * .45) - 120, ty: 0, tz: -a.z + 380, ry: a.x < 0 ? -4 : 4 };
    else if (v.kind === 'foe') r = { tx: -a.x * .3, ty: 0, tz: 180, ry: 0 };
    else r = { tx: -a.x - 110, ty: 0, tz: -a.z + 560, ry: a.x < 0 ? -6 : 6 };
    return { tx: n0(Math.round(r.tx)), ty: n0(r.ty), tz: n0(Math.round(r.tz)), ry: n0(r.ry) };
  };
  // ----- figura padrão (silhueta) e ordem de reserva das imagens -----
  const svgUrl = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s), xesc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const kanjiOf = c => { try { return KANJI[mainEl(c)] || '武'; } catch { return '武'; } }; // KANJI e mainEl vêm do palco.js (no Node não existem)
  const silhouette = (c, back) => {
    const col = /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : c.enemy ? '#e60012' : '#00b7ff';
    if (c.enemy) return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><path d="M30 395 L45 150 Q150 20 255 150 L270 395Z" fill="#26262b" stroke="${col}" stroke-width="6"/><text x="150" y="300" font-family="Shippori Mincho B1,serif" font-weight="800" font-size="150" text-anchor="middle" fill="#e8e2d6">${xesc(kanjiOf(c))}</text></svg>`);
    const L = xesc(String(c.name || '?').slice(0, 1).toUpperCase());
    return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity=".35"/></linearGradient></defs>
 <circle cx="100" cy="62" r="42" fill="${back ? '#15151a' : col}" stroke="${col}" stroke-width="6"/><path d="M30 395 L38 160 Q100 110 162 160 L170 395Z" fill="${back ? '#15151a' : 'url(#g)'}" stroke="${col}" stroke-width="6"/>
 <text x="100" y="${back ? 300 : 290}" font-family="Anton,Impact" font-size="120" text-anchor="middle" fill="${back ? col : '#000'}" opacity="${back ? .9 : .75}">${L}</text></svg>`);
  };
  // kind: f frente (imgF → img → silhueta), b costas (imgB → silhueta de costas), p retrato (imgP → frente com recorte do topo → silhueta); bad: URLs que falharam, ignoradas
  const imgSrc = (c, kind, bad = []) => {
    const ok = u => typeof u === 'string' && u && !bad.includes(u);
    if (kind === 'b') return ok(c.imgB) ? { url: c.imgB, fallback: false } : { url: silhouette(c, true), fallback: true };
    if (kind === 'p' && ok(c.imgP)) return { url: c.imgP, fallback: false };
    const u = [c.imgF, c.img].find(ok);
    if (u) return kind === 'p' ? { url: u, fallback: false, crop: 'top' } : { url: u, fallback: false };
    return { url: silhouette(c, false), fallback: true };
  };

  // herói olha para os inimigos (−z): de costas se a câmera olha para o mesmo lado (|ry| ≤ 90), senão de frente; inimigo só tem frente
  const unitKind = (c, ry = 0) => c?.enemy ? 'f' : Math.abs(((ry % 360) + 540) % 360 - 180) <= 90 ? 'b' : 'f';

  // enquadre (imgK) da imagem própria: x, y em fração da altura da figura (−1..1) e z de 0,5 a 3; nunca na silhueta de reserva
  // frente/costas: a figura tem altura var(--h) e gira pelos pés; retrato: deslocamento em % do próprio quadro, a partir do centro
  const imgFit = (c, kind, src) => {
    const k = c?.imgK?.[kind]; if (!k || typeof k !== 'object' || !src || src.fallback) return '';
    const n = (v, a, b, d) => Math.min(b, Math.max(a, Number.isFinite(+v) && v !== null && v !== '' ? +v : d)), x = n(k.x, -1, 1, 0), y = n(k.y, -1, 1, 0), z = n(k.z, .5, 3, 1);
    return kind === 'p' ? `translate(${+(x * 100).toFixed(1)}%,${+(y * 100).toFixed(1)}%) scale(${z})` : `translate(calc(${x} * var(--h)),calc(${y} * var(--h))) scale(${z})`;
  };

  // as 6 skills do leque: fixadas (na ordem de pins), depois as mais usadas (contagem > 0, decrescente, empate pelo id); só as usáveis, sem repetir
  const pickSix = (pins, use, usable) => {
    const ok = new Set(usable), fix = [...new Set(pins || [])].filter(k => ok.has(k));
    const top = usable.filter(k => !fix.includes(k) && (use?.[k] || 0) > 0).sort((a, b) => use[b] - use[a] || (a < b ? -1 : a > b ? 1 : 0));
    return [...fix, ...top].slice(0, 6);
  };

  // onde o ator volta na fila se gastar `cost` de tempo: tick de volta = ticks[ator] + cost; pos = quantos dos outros agem antes dele (1 = logo depois do atual); empate pela ordem de `order`
  // approx: o vizinho mais próximo está a menos de 5% do custo (a previsão pode errar por pouco)
  const previewSlot = (ticks, actorId, cost, order) => {
    const T = (ticks[actorId] ?? 0) + cost, ix = id => { const i = order.indexOf(id); return i < 0 ? 1e9 : i; }, me = ix(actorId);
    const others = Object.keys(ticks).filter(id => id !== actorId);
    const pos = others.filter(id => ticks[id] < T || (ticks[id] === T && ix(id) < me)).length;
    const near = others.length ? Math.min(...others.map(id => Math.abs(ticks[id] - T))) : Infinity;
    return { pos, approx: near < cost * .05 };
  };

  const local = { aim: null, zoom: null, orbit: 0, px: 0, pz: 0 }; // estado só deste navegador, lido por cameraFor via view()
  const frameNow = inB => { const sc = S.scenes[S.scene] || {}; return frame(S.battle.ax || RULES.axisOf(inB), sc.cols, sc.rows); }; // enquadre atual (batalha sem eixo gravado calcula na hora)
  const lungeMs = dist => clamp(Math.round(250 + dist * .12), 300, 700); // ida e volta da investida, pela distância percorrida (px)
  const P = { rotP, rangeOf, lungeMs, frameNow, frame, toWorld, formation, lastFrame: () => lastFr, cameraFor, imgSrc, imgFit, unitKind, pickSix, previewSlot, local, lunge: () => Promise.resolve(), shake() {}, sync() {}, rectOf: () => null };

  // ----- montagem no navegador -----
  let floor = null, rl = null, rb = null, floorKey = '', root = null, atw = null, world = null, scn = null, grp = null, host = null, ro = null, camKey = '', scnKey = '', settle = 0, hs1 = 0, hs2 = 0;
  const els = new Map(); // id -> { el, img, mini, sh, hpb, bad: [], key... }
  let shk = null, pcl = null, lingerUntil = 0, tearT = 0, lastF = null, lastFr = null, camLock = null, fastT = 0, camRy = 0; // camLock: a investida segura a câmera no alvo (o sync não a devolve no meio do golpe)
  let rst = null; const el = (tag, cls, p) => { const e = document.createElement(tag); if (cls) e.className = cls; (p || null)?.appendChild(e); return e; };
  const ensure = () => {
    if (root) return;
    root = el('div', 'p3d'); root.setAttribute('aria-hidden', 'false');
    const cam = el('div', 'cam', root); shk = el('div', 'shk', cam); world = el('div', 'world', el('div', 'drift', shk)); atw = el('div', 'atw', world); // shk: tremida; drift: deriva idle
    scn = el('div', 'p3d-scn', atw); el('div', 'ground', atw); floor = el('div', 'floorgrid', atw); el('div', 'fog', atw); grp = el('div', 'units', atw); pcl = el('div', 'pcl', atw);
    rl = el('div', 'rangeln', atw); rb = el('div', 'rangelb', atw); rl.hidden = rb.hidden = true;
    // recentralizar: aparece quando o jogador girou, aproximou ou moveu a câmera
    rst = el('button', 'p3d-reset', root); rst.type = 'button'; rst.textContent = '⌖ Recentralizar'; rst.title = 'Volta a câmera ao enquadre do turno (ou duplo clique no fundo)'; rst.hidden = true;
    rst.addEventListener('click', e => { e.stopPropagation(); local.orbit = local.px = local.pz = 0; world.style.transition = ''; if (lastF) camera(lastF); });
    document.body.appendChild(root);
    // clique num recorte vale como clique no alvo dentro do #app (os atalhos estão delegados em #app)
    root.addEventListener('click', e => { const u = e.target.closest('[data-tgt]'); if (!u || !host?.isConnected) return; const i = el('i', '', host); i.dataset.tgt = u.dataset.tgt; i.hidden = true; i.click(); i.remove(); });
    root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-tgt]')) { e.preventDefault(); e.target.click(); } });
    // roda para cima sobre um inimigo dá zoom nele; para baixo sai
    // botão direito + arrastar gira a câmera livremente (o palco tem pointer-events:none, então escuta a janela); só sem comando em cena
    let drag = null; const inStage = e => { if (!root || root.style.display === 'none') return false; const r = root.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && !e.target.closest?.('button,input,select,textarea,.result'); };
    addEventListener('pointerdown', e => { if (e.button !== 2 || camLock || !inStage(e)) return; drag = { x: e.clientX, o: local.orbit }; world.style.transition = 'none'; e.preventDefault(); });
    addEventListener('pointermove', e => { if (!drag) return; if (camLock) { drag = null; world.style.transition = ''; return; } local.orbit = clamp(drag.o + (e.clientX - drag.x) * .3, -180, 180); if (lastF) camera(lastF); });
    addEventListener('pointerup', e => { if (!drag) return; drag = null; world.style.transition = ''; if (typeof HUD !== 'undefined') HUD.place(); });
    addEventListener('contextmenu', e => { if (inStage(e)) e.preventDefault(); });
    addEventListener('dblclick', e => { if (camLock || !inStage(e) || e.target.closest('[data-tgt]')) return; local.orbit = local.px = local.pz = 0; if (lastF) camera(lastF); });
    // roda fora de um inimigo: aproxima/afasta a câmera; WASD/setas: desliza pela cena (setas não, com a mira aberta). Tudo some quando um comando entra em cena
    addEventListener('wheel', e => { if (camLock || !inStage(e) || e.target.closest?.('.bb.foe:not(.ko)')) return; e.preventDefault(); local.pz = clamp(local.pz - e.deltaY * .5, -1400, 320); world.style.transition = 'transform .12s ease-out'; if (lastF) camera(lastF); }, { passive: false });
    const keys = new Set(), DIR = { w: [0, 1], s: [0, -1], a: [1, 0], d: [-1, 0], arrowup: [0, 1], arrowdown: [0, -1], arrowleft: [1, 0], arrowright: [-1, 0] }; let mvT = 0, mvLast = 0;
    const mv = now => { mvT = 0; if (camLock || !keys.size || !root || root.style.display === 'none') { keys.clear(); world.style.transition = ''; return; } const dt = Math.min(50, now - (mvLast || now)); mvLast = now; let x = 0, z = 0; for (const k of keys) { x += DIR[k][0]; z += DIR[k][1]; } local.px = clamp(local.px + x * dt * .7, -1100, 1100); local.pz = clamp(local.pz + z * dt * .7, -1400, 320); if (lastF) camera(lastF); mvT = requestAnimationFrame(mv); };
    addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (!DIR[k] || camLock || e.ctrlKey || e.metaKey || e.altKey || !root || root.style.display === 'none' || e.target.closest?.('input,textarea,select,[contenteditable]')) return; if (k.startsWith('arrow') && (e.defaultPrevented || local.aim || document.querySelector('.lq,.hud-tgt.on,.skl'))) return; keys.add(k); world.style.transition = 'none'; if (!mvT) { mvLast = 0; mvT = requestAnimationFrame(mv); } });
    addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (!keys.size) world.style.transition = ''; });
    addEventListener('blur', () => keys.clear());
    root.addEventListener('wheel', e => { const u = e.target.closest?.('.bb.foe:not(.ko)'); if (!u || !host?.isConnected) return; e.preventDefault();
      const want = e.deltaY < 0 ? u.dataset.tgt : null; if ((local.zoom || null) === want || (!want && !local.zoom)) return; local.zoom = want; if (typeof render === 'function') render(); }, { passive: false });
    addEventListener('scroll', place, true); addEventListener('resize', place);
  };
  const place = () => {
    if (!root || !host || !host.isConnected) return;
    const r = host.getBoundingClientRect(); document.documentElement.style.setProperty('--hk', Math.max(.45, Math.min(r.width / 1440, r.height / 860, 1.6)).toFixed(3)); // escala do HUD e do leque (desenhados para 1440×860)
    Object.assign(root.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  };
  const mount = h => {
    if (host !== h) { ro?.disconnect(); host = h; if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(place); ro.observe(h); } }
    root.style.display = ''; place();
  };

  // cenário: só refaz quando muda o fundo, o clima ou a cena
  const scene = () => {
    const sc = S.scenes[S.scene] || {}, key = [S.scene, sc.bbg, sc.bg, sc.clima, JSON.stringify(sc.bbL || {}), typeof ANIMFX !== 'undefined' ? ANIMFX.settings.quality : ''].join('|'); if (key === scnKey) return; scnKey = key;
    const ps = typeof PFX !== 'undefined' ? PFX.particlesFor(sc.clima, PFX.particleCount(typeof ANIMFX !== 'undefined' ? ANIMFX.settings.quality : 'auto', matchMedia('(prefers-reduced-motion: reduce)').matches), 7) : [];
    const pre = BBG[sc.bbg], img = !pre ? (sc.bbg || sc.bg || '') : '', clima = CLIMAV[sc.clima] ? `<i class="clima cl-${sc.clima}" aria-hidden="true"></i>` : '';
    scn.innerHTML = `<div class="bbplane ${pre ? 'stage bb-' + sc.bbg : img ? 'img' : ''}" ${img ? `style="background-image:url('${esc(img)}')"` : ''}>${pre ? bbfx : ''}${ps.length ? '' : clima}</div>` + (typeof PFX !== 'undefined' ? PFX.layerPlanes(sc).map(L => `<div class="bbplane layer ly-${L.key}" style="background-image:url('${esc(L.url)}');transform:translateZ(${L.z}px) scale(${L.k})"></div>`).join('') : '');
    pcl.innerHTML = ps.map(p => `<i class="pt pt-${p.kind}" style="--x:${p.x};--z:${p.z};--y:${p.y0};--s:${p.s};animation-duration:${p.dur}s;animation-delay:-${p.delay}s"></i>`).join(''); // clima em 3D: entre os recortes, com profundidade
  };

  const view = F => {
    const cur = S.chars[timeline(1)[0]], at = id => F.get(id) || { x: 0, z: 0 }, pts = [...F.values()], w = root?.clientWidth || 1440;
    const tbl = id => ({ kind: 'table', at: at(id), pts, w, foe: !!S.chars[id]?.enemy });
    const dt = cur?.enemy && S.battle.cmd?.foe === cur.id && (S.battle.cmd.tgs || []).find(id => F.has(id)); // janela de defesa: a câmera fica no ombro do herói alvo (o anel abre sobre ele)
    const base = local.aim ? { kind: 'select', pts, w } : !cur ? { kind: 'table', at: { x: -430, z: 0 }, pts, w } : dt ? { ...tbl(dt), fast: true } : tbl(cur.id);
    if (local.zoom && F.has(local.zoom)) return { kind: 'zoom', to: F.get(local.zoom), ry: cameraFor(base).ry };
    return base;
  };
  const setCls = (u, k, on) => { if (u.cls[k] !== on) { u.cls[k] = on; u.el.classList.toggle(k, on); } };
  const setImg = u => { const k = unitKind(u.c, camRy), s = imgSrc(u.c, k, u.bad), t = imgFit(u.c, k, s); u.el.dataset.kind = k; u.url = s.url; u.fb = s.fallback; if (u.src !== s.url) { u.src = s.url; u.img.src = s.url; } if (u.fit !== t) { u.fit = t; u.img.style.transform = t; } };
  const mkUnit = c => {
    const e = el('div', 'bb unit ' + (c.enemy ? 'foe' : 'hero')), u = { el: e, cls: {}, bad: [], src: '', pos: '', h: '', mini: '' };
    e.dataset.tgt = c.id; e.tabIndex = 0; e.setAttribute('role', 'button'); el('i', 'shadow', e); el('i', 'ring', e);
    u.picktag = el('b', 'picktag', e); // na mira, identifica cada candidato sem depender do tamanho ou da imagem do recorte
    u.sts = el('div', 'sts', e); // âncora das condições (.sti): as marcas de condição nova e de efeito contínuo do coreo.js caem aqui
    if (c.enemy) { u.miniEl = el('div', 'mini', e); u.sh = el('b', 'sh', u.miniEl); u.hpb = el('i', 'hp', u.miniEl); u.hpt = el('i', 'trail', u.hpb); u.hpi = el('i', '', u.hpb); }
    u.inner = el('div', 'bbi', e); u.img = el('img', '', u.inner); u.img.alt = ''; // o .bbi é quem anima (cast, hit, dodge, kofall): o .bb só posiciona
    u.img.draggable = false;
    u.img.addEventListener('error', () => { if (u.url && !u.fb) { u.bad.push(u.url); setImg(u); } }); // imagem quebrada: cai para a próxima reserva
    grp.appendChild(e); return u;
  };
  // chão: grade alinhada ao mapa, cor do anel de cada recorte e a linha de alcance da mira
  const colorOf = c => /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : c.enemy ? '#e60012' : '#00b7ff';
  const fmt = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const chao = (fr, F, cur) => {
    const sc = S.scenes[S.scene] || {}, piso = sc.bbL?.piso || '', grid = sc.grid !== false, show = (grid || piso) && sc.cols > 0 && sc.rows > 0, key = show ? [S.scene, sc.cols, sc.rows, fr.a, fr.cx, fr.cy, fr.k, piso, grid].join('|') : '';
    if (key !== floorKey) { floorKey = key; floor.hidden = !show;
      if (show) { const o = toWorld(-.5, -.5, fr, true), c = Math.cos(fr.a), s = Math.sin(fr.a); // x local = coluna do grid, y local = linha; ambos deitados no chão
        const gl = 'linear-gradient(#fff1 1.5px,transparent 1.5px),linear-gradient(90deg,#fff1 1.5px,transparent 1.5px)', cell = fr.k + 'px ' + fr.k + 'px'; // piso: imagem esticada no tabuleiro, grade por cima se visível
        Object.assign(floor.style, { width: sc.cols * fr.k + 'px', height: sc.rows * fr.k + 'px', backgroundImage: [grid ? gl : '', piso ? `url("${piso.replace(/["\\]/g, encodeURIComponent)}")` : ''].filter(Boolean).join(','), backgroundSize: [grid ? cell + ',' + cell : '', piso ? '100% 100%' : ''].filter(Boolean).join(','), boxShadow: grid ? '' : 'none', transform: `matrix3d(${-s},0,${-c},0,${c},0,${-s},0,0,-1,0,0,${o.x.toFixed(1)},-2,${o.z.toFixed(1)},1)` }); } }
    const t = local.aim && S.chars[local.aim], r = cur && t && F.has(cur.id) && F.has(t.id) ? rangeOf(cur, t, sc.unit) : null;
    rl.hidden = rb.hidden = !r;
    if (r) { const a = F.get(cur.id), b = F.get(t.id), dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
      rl.style.width = L.toFixed(0) + 'px'; rl.style.transform = `translate3d(${a.x}px,-3px,${a.z}px) rotateY(${(Math.atan2(-dz, dx) * 180 / Math.PI).toFixed(2)}deg) rotateX(90deg)`;
      rb.style.transform = `translate3d(${(a.x + dx / 2).toFixed(0)}px,-40px,${(a.z + dz / 2).toFixed(0)}px) translate(-50%,-100%)`;
      rb.textContent = `${r.casas} ${r.casas === 1 ? 'casa' : 'casas'}${r.m != null ? ' · ' + fmt(r.m) + ' m' : ''}`; }
  };
  // mini barra: dano cai já e o rastro desce depois; cura sobe o rastro verde e a barra vem depois
  const trailBar = (u, w) => { const n = parseFloat(w), o = u.hpw ?? n, p = typeof PFX !== 'undefined' ? PFX.trailPlan(o, n) : null; u.hpw = n;
    if (!p) { u.hpi.style.width = u.hpt.style.width = w; return; } u.hpt.classList.toggle('heal', p.heal); u.hpi.style.transitionDelay = p.bar.delay + 'ms'; u.hpt.style.transitionDelay = p.trail.delay + 'ms'; u.hpi.style.width = u.hpt.style.width = w; };
  const units = () => {
    const inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks), cur = S.chars[timeline(1)[0]];
    const fr = frameNow(inB), F = formation(inB, fr), V = new Map(); // V: onde cada um aparece agora (o inimigo da vez já avançou)
    const picking = typeof LEQUE !== 'undefined' && !!LEQUE.aimTarget(), pickable = new Set(picking ? LEQUE.aimList().map(c => c.id) : []);
    root.classList.toggle('selecting', picking); root.dataset.pick = picking ? '1' : '';
    for (const [id, u] of els) if (!inB.some(c => c.id === id)) { u.el.remove(); els.delete(id); }
    for (const c of inB) {
      let u = els.get(c.id); if (!u) { u = mkUnit(c); els.set(c.id, u); }
      const p = F.get(c.id), adv = c === cur && c.enemy, x = adv ? Math.round(p.x / 2) : p.x, z = adv ? Math.round(p.z / 2) : p.z, pos = x + ',' + z; V.set(c.id, { x, z }); // inimigo na vez anda metade do caminho até os heróis
      if (u.pos !== pos && !u.lunging) { u.pos = pos; u.el.style.setProperty('--x', x); u.el.style.setProperty('--z', z); }
      const h = Math.round((c.enemy ? 380 : 300) * (Math.min(2.5, (c.boss ? 1.6 : 1) * Math.max(0.5, Number.isFinite(+c.imgS) && c.imgS !== null && c.imgS !== '' ? +c.imgS : 1)))) + 'px'; if (u.h !== h) { u.h = h; u.el.style.setProperty('--h', h); }
      u.c = c; setImg(u); { const col = colorOf(c); if (u.col !== col) { u.col = col; u.el.style.setProperty('--c', col); } }
      { const tag = c.name + (c.hp <= 0 ? ' · CAÍDO' : ''); if (u.tag !== tag) { u.tag = tag; u.picktag.textContent = tag; } }
      setCls(u, 'pickable', pickable.has(c.id));
      u.el.classList.toggle('ko', c.hp <= 0); if (c.hp > 0) u.el.classList.remove('kofall'); setCls(u, 'cur', c === cur); // ko direto (sem cache): o coreo adia o ko e o próximo desenho o repõe
      { const k = c.hp > 0 ? stIcons(c) : ''; if (u.stk !== k) { u.stk = k; u.sts.innerHTML = k; } } setCls(u, 'tgt', c.id === tgt); if (typeof PVIDA !== 'undefined') PVIDA.unit(u, c);
      if (c.enemy) { const m = c.brk && c.hp > 0 ? '◆' + c.brk.cur : '', w = Math.max(0, Math.min(100, 100 * c.hp / (c.hpMax || 1))) + '%';
        if (u.mini !== m + w) { u.mini = m + w; u.sh.textContent = m; u.sh.hidden = !m; trailBar(u, w); } }
    }
    lastF = F; lastFr = fr; chao(fr, F, cur); return V;
  };
  // alvo que some (removido, caído ou oculto): a mira vai para o próximo inimigo de pé e o zoom fecha; devolve se algo mudou
  const vivo = id => { const c = S.chars[id]; return !!c && id in S.battle.ticks && c.hp > 0 && !c.dead; };
  const sumiu = id => { const c = S.chars[id]; return !c || !(id in S.battle.ticks) || c.dead || (c.enemy && c.hp <= 0); }; // aliado caído continua mirável (reviver, item)
  const heal = () => {
    let ch = false;
    if (local.zoom && sumiu(local.zoom)) { local.zoom = null; ch = true; }
    if (tgt && (!S.chars[tgt] || !(tgt in S.battle.ticks) || (S.chars[tgt].enemy && S.chars[tgt].hp <= 0 && !(typeof LEQUE !== 'undefined' && LEQUE.aimTarget() === tgt)))) { /* caído só sai do alvo fora da mira */ const f = Object.values(S.chars).find(c => c.enemy && vivo(c.id)); if (f) { tgt = f.id; aim = null; ch = true; } }
    if (local.aim && sumiu(local.aim)) local.aim = S.chars[tgt] && !sumiu(tgt) ? tgt : null; // a mira local é refeita a cada desenho: não pede outro
    return ch;
  };
  const camera = F => {
    root.classList.toggle('locked', !!camLock); // a deriva idle para enquanto um comando segura a câmera
    const v0 = view(F), vb = camLock || cameraFor(v0), v = !camLock && (local.orbit || local.px || local.pz) ? { ...vb, tx: n0(Math.round(vb.tx + local.px)), tz: n0(Math.round(vb.tz + local.pz)), ry: n0(Math.round((vb.ry + local.orbit) * 10) / 10) } : vb, k = `${v.tx},${v.ty},${v.tz},${v.ry}`, tr = `translate3d(${v.tx}px,${v.ty}px,${v.tz}px) rotateY(${v.ry}deg)`;
    if (!camLock) world.dataset.cam = tr; // o enquadramento do turno (a fumaça confere a volta depois da investida)
    if (rst) rst.hidden = !!camLock || !(local.orbit || local.px || local.pz);
    if (k === camKey) return; camKey = k; world.style.transform = tr; world.style.setProperty('--bry', v.ry + 'deg'); // os recortes giram de volta: sempre de frente para a câmera
    if (unitKind({}, v.ry) !== unitKind({}, camRy)) { camRy = v.ry; for (const u of els.values()) if (u.c) setImg(u); } else camRy = v.ry;
    if (!camLock && v0.fast) { world.classList.add('fast'); clearTimeout(fastT); fastT = setTimeout(() => !camLock && world.classList.remove('fast'), 500); } // o anel de defesa dura ~1,3 s: a câmera não pode levar 1,1 s para chegar
  };

  const tear = () => { tearT = 0; const w = lingerUntil - performance.now(); if (w > 0) { tearT = setTimeout(tear, w); return; } if (!root) return;
    root.style.display = 'none'; root.classList.remove('derrota', 'vinheta'); for (const u of els.values()) u.el.remove(); els.clear(); camKey = ''; camLock = null; if (typeof CENA !== 'undefined') CENA.reset(); };
  P.sync = h => {
    if (typeof document === 'undefined') return;
    if (!h) { if (root && root.style.display !== 'none' && !tearT) tearT = setTimeout(tear, Math.max(120, lingerUntil - performance.now())); local.zoom = null; return; } // fim da batalha: some com os recortes depois da pose final (P.linger)
    if (tearT) { clearTimeout(tearT); tearT = 0; }
    ensure(); mount(h); scene();
    if (heal() && typeof render === 'function') setTimeout(render); // redesenha o HUD sem a ficha do alvo que sumiu
    camera(units());
    if (typeof HUD !== 'undefined') { HUD.place(); clearTimeout(hs1); clearTimeout(hs2); hs1 = setTimeout(HUD.place, 650); hs2 = setTimeout(HUD.place, 1250); } // a câmera leva ~1,1 s para chegar
    requestAnimationFrame(place); clearTimeout(settle); settle = setTimeout(place, 400); // a página ainda anima a entrada (a posição final só vem depois)
  };
  // investida: a câmera corre até o alvo (0,45 s) e o recorte de quem age avança até a frente dele; resolve no impacto e volta sozinho
  const LG_HOLD = 500; // pausa no alvo (o número nasce aqui); ida e volta duram lungeMs(distância)
  P.lunge = (fromId, toId, family) => new Promise(res => {
    const a = els.get(fromId), F = lastF, to = F?.get(toId), from = F?.get(fromId);
    if (!a || !to || !from || fromId === toId || !root || root.style.display === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return res();
    const z0 = +a.el.style.getPropertyValue('--z') || from.z, dz = Math.sign(z0 - to.z) || 1, dx = Math.sign(from.x - to.x) || -1;
    const tx = to.x + 140 * dx, tz = to.z + 260 * dz, ms = lungeMs(Math.hypot(tx - (+a.el.style.getPropertyValue('--x') || from.x), tz - z0));
    camLock = cameraFor(S.chars[toId]?.enemy ? { kind: 'zoom', to, ry: camRy } : S.chars[fromId]?.enemy ? { kind: 'table', at: from, pts: [from, to], w: root.clientWidth, foe: true } : { kind: 'table', at: to, pts: [...F.values()], w: root.clientWidth }); /* inimigo: contracampo, do ombro dele */ world.classList.add('fast'); world.style.setProperty('--lg', ms + 'ms'); camera(F);
    holdEnd = performance.now() + 4000; local.orbit = local.px = local.pz = 0; a.lunging = true; a.el.classList.add('lunging'); a.el.style.setProperty('--lg', ms + 'ms'); { const A = typeof PFX !== 'undefined' ? PFX.lungeArc(family) : null; if (A) { a.el.style.setProperty('--arc-h', A.h); a.el.style.setProperty('--crouch', A.crouch); a.el.style.setProperty('--lg-ease', A.ease); a.el.classList.remove('arc'); void a.el.offsetWidth; a.el.classList.add('arc'); } } a.el.style.setProperty('--x', tx); a.el.style.setProperty('--z', tz);
    setTimeout(res, ms);
    setTimeout(() => { a.lunging = false; a.el.classList.remove('lunging', 'arc'); a.pos = ''; unlock(ms); }, ms + LG_HOLD);
  });
  // a câmera segura a cena do comando até P.hold expirar; só então volta ao enquadre do turno seguinte
  let holdEnd = 0, unT = 0;
  const unlock = (ms = 450) => { clearTimeout(unT); const w = holdEnd - performance.now(); if (w > 0) { unT = setTimeout(() => unlock(ms), w + 10); return; } if (!camLock) return; camLock = null; if (lastF && root?.style.display !== 'none' && S.battle?.active) camera(units()); /* depois do fim, units() apagaria a pose final */ setTimeout(() => { if (camLock) return; world.classList.remove('fast'); world.style.removeProperty('--lg'); }, ms); };
  P.hold = ms => { holdEnd = performance.now() + ms; unlock(); };
  // técnica à distância: câmera de ombro de quem age, enquadrando quem age e os alvos; resolve quando ela chega
  P.focus = (fromId, toIds = [], ms = 420) => new Promise(res => {
    const F = lastF, from = F?.get(fromId), pts = [from, ...toIds.map(id => F?.get(id))].filter(Boolean);
    if (!from || !root || root.style.display === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return res();
    const only = pts.length < 2; camLock = cameraFor(only ? { kind: 'zoom', to: from, ry: camRy } : { kind: 'table', at: from, pts, w: root.clientWidth, foe: S.chars[fromId]?.enemy }); holdEnd = performance.now() + 4000; local.orbit = local.px = local.pz = 0;
    world.classList.add('fast'); world.style.setProperty('--lg', ms + 'ms'); camera(F); setTimeout(res, Math.max(0, ms - 40));
  });
  // impacto no recorte: tremida curta (classe hurt por 450 ms)
  P.shake = id => { const u = els.get(id); if (!u) return; u.el.classList.remove('hurt'); void u.el.offsetWidth; u.el.classList.add('hurt'); clearTimeout(u.hurtT); u.hurtT = setTimeout(() => u.el.classList.remove('hurt'), 450); };
  const reducedM = () => matchMedia('(prefers-reduced-motion: reduce)').matches, live = () => !!root && root.style.display !== 'none';
  P.quake = (amp, dir = 1) => { if (!shk || !amp || reducedM() || typeof PFX === 'undefined') return; shk.animate(PFX.shakeKeys(amp, dir), { duration: 320, easing: 'ease-out' }); }; // o mundo treme na direção do golpe
  let vigT = 0; P.vignette = ms => { if (!root) return; root.classList.add('vinheta'); clearTimeout(vigT); vigT = setTimeout(() => root.classList.remove('vinheta'), ms); };
  // recuo: empurrão para longe de quem bateu, inclinação e, no golpe forte, joelho no chão
  P.recoil = (id, fromId, pct, crit) => { const u = els.get(id), a = lastF?.get(fromId), b = lastF?.get(id); P.shake(id); if (!u || !b || reducedM() || typeof PFX === 'undefined') return;
    const v = PFX.recoilVec(a && fromId !== id ? a : b, b, pct, crit), st = u.el.style; u.el.classList.add('rc'); st.transition = 'none'; st.setProperty('--rx', v.dx); st.setProperty('--rz', v.dz); st.setProperty('--tilt', v.tilt + 'deg'); void u.el.offsetWidth; st.transition = '';
    clearTimeout(u.rcT); u.rcT = setTimeout(() => { st.setProperty('--rx', 0); st.setProperty('--rz', 0); st.setProperty('--tilt', '0deg'); setTimeout(() => u.el.classList.remove('rc'), 320); }, 140);
    if (v.kneel) { u.el.classList.add('kneel'); clearTimeout(u.knT); u.knT = setTimeout(() => u.el.classList.remove('kneel'), 400); } };
  const orbitTo = (at, deg, ms, back = 0) => new Promise(res => { if (!live() || !at || reducedM()) return res(); camLock = cameraFor({ kind: 'orbit', at, ry0: camRy, deg, back }); holdEnd = performance.now() + ms + 200;
    world.classList.add('fast'); world.style.setProperty('--lg', ms + 'ms'); camera(lastF); setTimeout(() => { res(); unlock(400); }, ms); });
  P.orbitShot = (id, deg = 45, ms = 1000) => orbitTo(lastF?.get(id), deg, ms);
  P.orbitGroup = (ids, deg, ms) => { const ps = ids.map(id => lastF?.get(id)).filter(Boolean); return ps.length ? orbitTo({ x: ps.reduce((t, p) => t + p.x, 0) / ps.length, z: ps.reduce((t, p) => t + p.z, 0) / ps.length }, deg, ms, 400) : Promise.resolve(); };
  // luz do elemento: quem está perto do impacto se tinge, e um clarão pinta o chão
  P.light = (id, color) => { const c = lastF?.get(id); if (!c || !live() || typeof PFX === 'undefined') return;
    for (const { id: j, k } of PFX.litUnits(lastF, c)) { const u = els.get(j); if (!u) continue; u.el.style.setProperty('--lit', color); u.el.style.setProperty('--litk', k); u.el.classList.add('lit'); clearTimeout(u.litT); u.litT = setTimeout(() => u.el.classList.remove('lit'), 500); }
    const f = el('i', 'flare', atw); f.style.cssText = `--lit:${color};transform:translate3d(${c.x}px,-2px,${c.z}px) translate(-50%,-50%) rotateX(90deg)`; setTimeout(() => f.remove(), 520); };
  P.linger = ms => { lingerUntil = Math.max(lingerUntil, performance.now() + ms); };
  P.unitOf = id => els.get(id) || null;
  P.posOf = id => lastF?.get(id) || null;
  P.rectOf = id => els.get(id)?.el.getBoundingClientRect() || null;
  g.PALCO3D = P;
})(globalThis);

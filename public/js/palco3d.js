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
  const toWorld = (gx, gy, fr) => {
    const dx = gx - fr.cx, dy = gy - fr.cy, c = Math.cos(fr.a), s = Math.sin(fr.a), along = dx * c + dy * s, perp = -dx * s + dy * c;
    return { x: n0(Math.round(clamp(perp * fr.k, -1000, 1000))), z: n0(Math.round(clamp(-along * fr.k, -fr.D - 900, 400))) };
  };
  // posição (x, z) de cada combatente: do grid; sem posição, slot de reserva do seu lado; depois separa quem ficou colado
  const formation = (chars, fr) => {
    const M = new Map(), ids = [];
    let ih = 0, ie = 0;
    const placed = c => c.x != null && c.y != null;
    for (const c of chars) { if (placed(c)) M.set(c.id, toWorld(c.x, c.y, fr)); ids.push(c.id); }
    const nFoe = chars.filter(c => c.enemy && !placed(c)).length, C = Math.min(COLS_F, nFoe), mid = (C - 1) / 2;
    for (const c of chars) {
      if (placed(c)) continue;
      if (!c.enemy) { const i = ih++, [x, z] = POS_H[i % 4]; M.set(c.id, { x, z: n0(z - 260 * Math.floor(i / 4)) }); }
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
  // câmera: translate3d(tx,ty,tz) rotateY(ry) aplicado ao mundo
  const cameraFor = v => {
    const a = v.at || { x: 0, z: 0 }, t = v.to || a; let r;
    if (v.kind === 'zoom') r = { tx: -t.x, ty: -40, tz: -t.z - 420, ry: 0 };
    else if (v.kind === 'aim') r = { tx: -(a.x * .55 + t.x * .45) - 120, ty: 0, tz: -a.z + 380, ry: a.x < 0 ? -4 : 4 };
    else if (v.kind === 'foe') r = { tx: -a.x * .3, ty: 0, tz: 180, ry: 0 };
    else r = { tx: -a.x - 110, ty: 0, tz: -a.z + 560, ry: a.x < 0 ? -6 : 6 };
    return { tx: n0(r.tx), ty: n0(r.ty), tz: n0(r.tz), ry: n0(r.ry) };
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

  // no palco a câmera fica atrás do grupo: herói aparece de costas, inimigo de frente
  const unitKind = c => c?.enemy ? 'f' : 'b';

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

  const local = { aim: null, zoom: null }; // estado só deste navegador, lido por cameraFor via view()
  const frameNow = inB => { const sc = S.scenes[S.scene] || {}; return frame(S.battle.ax || RULES.axisOf(inB), sc.cols, sc.rows); }; // enquadre atual (batalha sem eixo gravado calcula na hora)
  const P = { frameNow, frame, toWorld, formation, lastFrame: () => lastFr, cameraFor, imgSrc, imgFit, unitKind, pickSix, previewSlot, local, lunge: () => Promise.resolve(), shake() {}, sync() {}, rectOf: () => null };

  // ----- montagem no navegador -----
  let root = null, atw = null, world = null, scn = null, grp = null, host = null, ro = null, camKey = '', scnKey = '', settle = 0, hs1 = 0, hs2 = 0;
  const els = new Map(); // id -> { el, img, mini, sh, hpb, bad: [], key... }
  let lastF = null, lastFr = null, camLock = null, fastT = 0; // camLock: a investida segura a câmera no alvo (o sync não a devolve no meio do golpe)
  const el = (tag, cls, p) => { const e = document.createElement(tag); if (cls) e.className = cls; (p || null)?.appendChild(e); return e; };
  const ensure = () => {
    if (root) return;
    root = el('div', 'p3d'); root.setAttribute('aria-hidden', 'false');
    const cam = el('div', 'cam', root); world = el('div', 'world', cam); atw = el('div', 'atw', world);
    scn = el('div', 'p3d-scn', atw); el('div', 'ground', atw); el('div', 'fog', atw); grp = el('div', 'units', atw);
    document.body.appendChild(root);
    // clique num recorte vale como clique no alvo dentro do #app (os atalhos estão delegados em #app)
    root.addEventListener('click', e => { const u = e.target.closest('[data-tgt]'); if (!u || !host?.isConnected) return; const i = el('i', '', host); i.dataset.tgt = u.dataset.tgt; i.hidden = true; i.click(); i.remove(); });
    root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-tgt]')) { e.preventDefault(); e.target.click(); } });
    // roda para cima sobre um inimigo dá zoom nele; para baixo sai
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
    const sc = S.scenes[S.scene] || {}, key = [S.scene, sc.bbg, sc.bg, sc.clima].join('|'); if (key === scnKey) return; scnKey = key;
    const pre = BBG[sc.bbg], img = !pre ? (sc.bbg || sc.bg || '') : '', clima = CLIMAV[sc.clima] ? `<i class="clima cl-${sc.clima}" aria-hidden="true"></i>` : '';
    scn.innerHTML = `<div class="bbplane ${pre ? 'stage bb-' + sc.bbg : img ? 'img' : ''}" ${img ? `style="background-image:url('${esc(img)}')"` : ''}>${pre ? bbfx : ''}${clima}</div>`;
  };

  const view = F => {
    const cur = S.chars[timeline(1)[0]], at = id => F.get(id) || { x: 0, z: 0 };
    if (local.zoom && F.has(local.zoom)) return { kind: 'zoom', at: cur ? at(cur.id) : undefined, to: F.get(local.zoom) };
    if (!cur) return { kind: 'hero', at: { x: -430, z: 0 } };
    const dt = cur.enemy && S.battle.cmd?.foe === cur.id && (S.battle.cmd.tgs || []).find(id => F.has(id)); // janela de defesa: a câmera fica no ombro do herói alvo (o anel abre sobre ele)
    if (dt) return { kind: 'hero', at: at(dt), fast: true };
    if (cur.enemy) return { kind: 'foe', at: at(cur.id) };
    if (local.aim && F.has(local.aim)) return { kind: 'aim', at: at(cur.id), to: F.get(local.aim) };
    return { kind: 'hero', at: at(cur.id) };
  };

  const setCls = (u, k, on) => { if (u.cls[k] !== on) { u.cls[k] = on; u.el.classList.toggle(k, on); } };
  const setImg = u => { const k = unitKind(u.c), s = imgSrc(u.c, k, u.bad), t = imgFit(u.c, k, s); u.url = s.url; u.fb = s.fallback; if (u.src !== s.url) { u.src = s.url; u.img.src = s.url; } if (u.fit !== t) { u.fit = t; u.img.style.transform = t; } };
  const mkUnit = c => {
    const e = el('div', 'bb unit ' + (c.enemy ? 'foe' : 'hero')), u = { el: e, cls: {}, bad: [], src: '', pos: '', h: '', mini: '' };
    e.dataset.tgt = c.id; e.tabIndex = 0; e.setAttribute('role', 'button'); el('i', 'shadow', e);
    u.sts = el('div', 'sts', e); // âncora das condições (.sti): as marcas de condição nova e de efeito contínuo do coreo.js caem aqui
    if (c.enemy) { u.miniEl = el('div', 'mini', e); u.sh = el('b', 'sh', u.miniEl); u.hpb = el('i', 'hp', u.miniEl); u.hpi = el('i', '', u.hpb); }
    u.inner = el('div', 'bbi', e); u.img = el('img', '', u.inner); u.img.alt = ''; // o .bbi é quem anima (cast, hit, dodge, kofall): o .bb só posiciona
    u.img.draggable = false;
    u.img.addEventListener('error', () => { if (u.url && !u.fb) { u.bad.push(u.url); setImg(u); } }); // imagem quebrada: cai para a próxima reserva
    grp.appendChild(e); return u;
  };
  const units = () => {
    const inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks), cur = S.chars[timeline(1)[0]];
    const fr = frameNow(inB), F = formation(inB, fr);
    for (const [id, u] of els) if (!inB.some(c => c.id === id)) { u.el.remove(); els.delete(id); }
    for (const c of inB) {
      let u = els.get(c.id); if (!u) { u = mkUnit(c); els.set(c.id, u); }
      const p = F.get(c.id), adv = c === cur && c.enemy, x = adv ? Math.round(p.x / 2) : p.x, z = adv ? Math.round(p.z / 2) : p.z, pos = x + ',' + z; // inimigo na vez anda metade do caminho até os heróis
      if (u.pos !== pos && !u.lunging) { u.pos = pos; u.el.style.setProperty('--x', x); u.el.style.setProperty('--z', z); }
      const h = Math.round((c.enemy ? 380 : 300) * (Math.min(2.5, Math.max(0.5, Number.isFinite(+c.imgS) && c.imgS !== null && c.imgS !== '' ? +c.imgS : 1)))) + 'px'; if (u.h !== h) { u.h = h; u.el.style.setProperty('--h', h); }
      u.c = c; setImg(u);
      u.el.classList.toggle('ko', c.hp <= 0); if (c.hp > 0) u.el.classList.remove('kofall'); setCls(u, 'cur', c === cur); // ko direto (sem cache): o coreo adia o ko e o próximo desenho o repõe
      { const k = c.hp > 0 ? stIcons(c) : ''; if (u.stk !== k) { u.stk = k; u.sts.innerHTML = k; } } setCls(u, 'tgt', c.id === tgt);
      if (c.enemy) { const m = c.brk && c.hp > 0 ? '◆' + c.brk.cur : '', w = Math.max(0, Math.min(100, 100 * c.hp / (c.hpMax || 1))) + '%';
        if (u.mini !== m + w) { u.mini = m + w; u.sh.textContent = m; u.sh.hidden = !m; u.hpi.style.width = w; } }
    }
    lastF = F; lastFr = fr; return F;
  };
  // alvo que some (removido, caído ou oculto): a mira vai para o próximo inimigo de pé e o zoom fecha; devolve se algo mudou
  const vivo = id => { const c = S.chars[id]; return !!c && id in S.battle.ticks && c.hp > 0 && !c.dead; };
  const sumiu = id => { const c = S.chars[id]; return !c || !(id in S.battle.ticks) || c.dead || (c.enemy && c.hp <= 0); }; // aliado caído continua mirável (reviver, item)
  const heal = () => {
    let ch = false;
    if (local.zoom && sumiu(local.zoom)) { local.zoom = null; ch = true; }
    if (tgt && (!S.chars[tgt] || !(tgt in S.battle.ticks) || (S.chars[tgt].enemy && S.chars[tgt].hp <= 0))) { const f = Object.values(S.chars).find(c => c.enemy && vivo(c.id)); if (f) { tgt = f.id; aim = null; ch = true; } }
    if (local.aim && sumiu(local.aim)) local.aim = S.chars[tgt] && !sumiu(tgt) ? tgt : null; // a mira local é refeita a cada desenho: não pede outro
    return ch;
  };
  const camera = F => {
    const v0 = view(F), v = camLock || cameraFor(v0), k = `${v.tx},${v.ty},${v.tz},${v.ry}`, tr = `translate3d(${v.tx}px,${v.ty}px,${v.tz}px) rotateY(${v.ry}deg)`;
    if (!camLock) world.dataset.cam = tr; // o enquadramento do turno (a fumaça confere a volta depois da investida)
    if (k === camKey) return; camKey = k; world.style.transform = tr;
    if (!camLock && v0.fast) { world.classList.add('fast'); clearTimeout(fastT); fastT = setTimeout(() => !camLock && world.classList.remove('fast'), 500); } // o anel de defesa dura ~1,3 s: a câmera não pode levar 1,1 s para chegar
  };

  P.sync = h => {
    if (typeof document === 'undefined') return;
    if (!h) { if (root) { root.style.display = 'none'; for (const u of els.values()) u.el.remove(); els.clear(); camKey = ''; } local.zoom = null; return; } // fim da batalha: some com os recortes (nada de alvo velho para os efeitos)
    ensure(); mount(h); scene();
    if (heal() && typeof render === 'function') setTimeout(render); // redesenha o HUD sem a ficha do alvo que sumiu
    camera(units());
    if (typeof HUD !== 'undefined') { HUD.place(); clearTimeout(hs1); clearTimeout(hs2); hs1 = setTimeout(HUD.place, 650); hs2 = setTimeout(HUD.place, 1250); } // a câmera leva ~1,1 s para chegar
    requestAnimationFrame(place); clearTimeout(settle); settle = setTimeout(place, 400); // a página ainda anima a entrada (a posição final só vem depois)
  };
  // investida: a câmera corre até o alvo (0,45 s) e o recorte de quem age avança até a frente dele; resolve no impacto e volta sozinho
  const LG_MS = 450, LG_HOLD = 500; // ida, pausa no alvo (o número nasce aqui), volta de 0,45 s: ~1,4 s no total
  P.lunge = (fromId, toId) => new Promise(res => {
    const a = els.get(fromId), F = lastF, to = F?.get(toId), from = F?.get(fromId);
    if (!a || !to || !from || fromId === toId || !root || root.style.display === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return res();
    const z0 = +a.el.style.getPropertyValue('--z') || from.z, dz = Math.sign(z0 - to.z) || 1, dx = Math.sign(from.x - to.x) || -1;
    camLock = cameraFor(S.chars[toId]?.enemy ? { kind: 'zoom', to } : { kind: 'hero', at: to }); world.classList.add('fast'); camera(F);
    a.lunging = true; a.el.classList.add('lunging'); a.el.style.setProperty('--x', to.x + 140 * dx); a.el.style.setProperty('--z', to.z + 260 * dz);
    setTimeout(res, LG_MS);
    setTimeout(() => { a.lunging = false; a.el.classList.remove('lunging'); a.pos = ''; camLock = null; if (lastF && root.style.display !== 'none') { units(); camera(lastF); } setTimeout(() => world.classList.remove('fast'), LG_MS); }, LG_MS + LG_HOLD);
  });
  // impacto no recorte: tremida curta (classe hurt por 450 ms)
  P.shake = id => { const u = els.get(id); if (!u) return; u.el.classList.remove('hurt'); void u.el.offsetWidth; u.el.classList.add('hurt'); clearTimeout(u.hurtT); u.hurtT = setTimeout(() => u.el.classList.remove('hurt'), 450); };
  P.rectOf = id => els.get(id)?.el.getBoundingClientRect() || null;
  g.PALCO3D = P;
})(globalThis);

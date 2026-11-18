// ===== palco 3D da batalha (CSS 3D): cenário, chão, recortes e câmera por turno =====
// O mundo mora fora do #app (fixo no body) e é atualizado por diferença; o #app só guarda um retângulo vazio ([data-p3d]).
// formation/cameraFor/imgSrc são puros (testados no Node); o que usa document fica dentro de sync e das funções que ele chama.
(g => {
  const POS_H = [[-430, 0], [330, 60], [610, -120], [90, -200]], COLS_F = 5; // heróis: 4 por fileira; inimigos: arco de 5
  const n0 = v => v + 0; // evita -0
  // posição (x, z) de cada combatente; a 2ª fileira fica atrás da 1ª
  const formation = (heroIds, foeIds) => {
    const M = new Map();
    heroIds.forEach((id, i) => { const [x, z] = POS_H[i % 4]; M.set(id, { x, z: z - 260 * Math.floor(i / 4) }); });
    const C = Math.min(COLS_F, foeIds.length), mid = (C - 1) / 2;
    foeIds.forEach((id, i) => { const col = i % COLS_F, row = Math.floor(i / COLS_F), d = mid ? Math.abs(col - mid) / mid : 0; // d: 0 no centro, 1 nas pontas
      M.set(id, { x: n0(Math.round((col - mid) * 370 + 185 * row)), z: n0(Math.round(-1450 - 200 * d - 300 * row)) }); });
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

  const local = { aim: null, zoom: null }; // estado só deste navegador, lido por cameraFor via view()
  const P = { formation, cameraFor, imgSrc, local, lunge: () => Promise.resolve(), shake() {}, sync() {}, rectOf: () => null };

  // ----- montagem no navegador -----
  let root = null, atw = null, world = null, scn = null, grp = null, host = null, ro = null, camKey = '', scnKey = '', settle = 0;
  const els = new Map(); // id -> { el, img, mini, sh, hpb, bad: [], key... }
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
    if (cur.enemy) return { kind: 'foe', at: at(cur.id) };
    if (local.aim && F.has(local.aim)) return { kind: 'aim', at: at(cur.id), to: F.get(local.aim) };
    return { kind: 'hero', at: at(cur.id) };
  };

  const setCls = (u, k, on) => { if (u.cls[k] !== on) { u.cls[k] = on; u.el.classList.toggle(k, on); } };
  const setImg = u => { const s = imgSrc(u.c, 'f', u.bad); u.url = s.url; u.fb = s.fallback; if (u.src !== s.url) { u.src = s.url; u.img.src = s.url; } };
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
    const F = formation(inB.filter(c => !c.enemy).map(c => c.id), inB.filter(c => c.enemy).map(c => c.id));
    for (const [id, u] of els) if (!inB.some(c => c.id === id)) { u.el.remove(); els.delete(id); }
    for (const c of inB) {
      let u = els.get(c.id); if (!u) { u = mkUnit(c); els.set(c.id, u); }
      const p = F.get(c.id), z = p.z + (c === cur && c.enemy ? 900 : 0), pos = p.x + ',' + z;
      if (u.pos !== pos) { u.pos = pos; u.el.style.setProperty('--x', p.x); u.el.style.setProperty('--z', z); }
      const h = Math.round((c.enemy ? 380 : 300) * (Math.min(2.5, Math.max(0.5, Number.isFinite(+c.imgS) && c.imgS !== null && c.imgS !== '' ? +c.imgS : 1)))) + 'px'; if (u.h !== h) { u.h = h; u.el.style.setProperty('--h', h); }
      u.c = c; setImg(u);
      u.el.classList.toggle('ko', c.hp <= 0); setCls(u, 'cur', c === cur); // ko direto (sem cache): o coreo adia o ko e o próximo desenho o repõe
      { const k = c.hp > 0 ? stIcons(c) : ''; if (u.stk !== k) { u.stk = k; u.sts.innerHTML = k; } } setCls(u, 'tgt', c.id === tgt);
      if (c.enemy) { const m = c.brk && c.hp > 0 ? '◆' + c.brk.cur : '', w = Math.max(0, Math.min(100, 100 * c.hp / (c.hpMax || 1))) + '%';
        if (u.mini !== m + w) { u.mini = m + w; u.sh.textContent = m; u.sh.hidden = !m; u.hpi.style.width = w; } }
    }
    return F;
  };
  const camera = F => {
    const v = cameraFor(view(F)), k = `${v.tx},${v.ty},${v.tz},${v.ry}`; if (k === camKey) return; camKey = k;
    world.style.transform = `translate3d(${v.tx}px,${v.ty}px,${v.tz}px) rotateY(${v.ry}deg)`;
  };

  P.sync = h => {
    if (typeof document === 'undefined') return;
    if (!h) { if (root) { root.style.display = 'none'; for (const u of els.values()) u.el.remove(); els.clear(); camKey = ''; } return; } // fim da batalha: some com os recortes (nada de alvo velho para os efeitos)
    ensure(); mount(h); scene(); camera(units());
    requestAnimationFrame(place); clearTimeout(settle); settle = setTimeout(place, 400); // a página ainda anima a entrada (a posição final só vem depois)
  };
  P.rectOf = id => els.get(id)?.el.getBoundingClientRect() || null;
  g.PALCO3D = P;
})(globalThis);

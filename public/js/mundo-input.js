// ===== mundo 3D: entrada do jogador (WASD com previsão local) e interpolação dos outros =====
// O herói selecionado anda já no cliente (MCOL.slide, o mesmo código que o servidor confere) e manda `walk` a cada 100 ms
// enquanto se move, e uma vez ao parar. O servidor corrige com { t:'pos', fix:[id, f, x, z] } quando discorda.
// Os outros chegam pelo canal pos agregado (10 Hz) e são desenhados 100 ms atrás, interpolando entre as duas amostras vizinhas.
// Teclas: WASD (girado pela câmera), Shift corre, Ctrl (toque) ou C agacha e levanta, Espaço pula, 1 a 4 trocam o herói, E interage, F golpeia.
(g => {
  const C = g.MCOL, DELAY = 100, SEND_MS = 100, JUMP_MS = 400, KEEP_MS = 1500;
  const st = () => (typeof S !== 'undefined' ? S : null);
  const keys = new Set(); let on = false, raf = 0, lastT = 0, local = null, moving = false, lastSend = 0, lastS = 0, jT = -1e9, crouch = false, ctrlSolo = false;
  const samples = new Map(); // id → [[t, f, x, z, d, m], …] em ordem de chegada
  const typing = () => document.activeElement?.matches?.('input,textarea,select,[contenteditable],[contenteditable] *');
  const worldOk = () => { const s = st(); return !!(s && !s.battle?.active && g.MUNDO?.el && g.MUNDO.el.style.display !== 'none'); };
  // heróis que este jogador move: os seus, com posição, na cena dele (na ordem da ficha)
  const can = () => { const s = st(); if (!s) return []; return Object.values(s.chars).filter(c => !c.enemy && !c.npc && c.pos && c.scene === s.scene && (typeof mine === 'function' ? mine(c) : false)); };
  let forced = null; // o mestre assumiu um NPC ou inimigo: o WASD move esse (walk, validado como o de qualquer um)
  const selId = () => { if (forced) return st()?.chars[forced]?.pos ? forced : null; const s = st(), id = typeof lastHero !== 'undefined' ? lastHero : null; return id && s?.chars[id]?.pos ? id : can()[0]?.id || null; };
  const floorOf = (s, ch) => { const w = s?.scenes?.[ch?.scene]?.world; return w?.floors.find(f => f.id === ch.pos?.f) || null; };
  const fromServer = ch => ({ id: ch.id, f: ch.pos.f, x: ch.pos.x, z: ch.pos.z, d: ch.pos.d || 0, m: 'a' });

  function send(o) { if (typeof ws !== 'undefined' && ws?.readyState === 1) ws.send(JSON.stringify(o)); }
  function sendWalk(now, s) {
    lastSend = now; lastS = Math.max(lastS + 1, Date.now());
    send({ t: 'walk', id: local.id, sc: s.scene, f: local.f, x: local.x, z: local.z, d: local.d, m: local.m, j: now - jT < JUMP_MS, s: lastS });
  }
  function tick(now = performance.now()) {
    const dt = Math.max(0, Math.min(.1, (now - (lastT || now)) / 1000)); lastT = Math.max(lastT, now);
    const s = st(), id = selId(), ch = id && s?.chars[id];
    if (!s || !ch?.pos || !worldOk()) { if (moving && local && s) { moving = false; sendWalk(now, s); } return; }
    if (!local || local.id !== id || local.f !== ch.pos.f) local = fromServer(ch); // trocou de herói ou de andar: parte do servidor
    if (g.MUNDO.view.follow !== id && !g.MUNDO.view.free) g.MUNDO.follow(id); // a câmera do jogador segue quem ele move
    const f = floorOf(s, ch); if (!f) return;
    const k = c => keys.has(c) ? 1 : 0, ax = g.MUNDO.axes(), fw = k('w') - k('s'), rt = k('d') - k('a');
    let vx = ax.fwd.x * fw + ax.right.x * rt, vz = ax.fwd.z * fw + ax.right.z * rt; const n = Math.hypot(vx, vz);
    local.m = keys.has('shift') ? 'c' : crouch ? 'g' : 'a';
    const jump = now - jT < JUMP_MS, want = n > 0 && !ch.frozen;
    if (want) {
      vx /= n; vz /= n; const sp = C.SPEED[local.m] * dt, p = C.slide(f, s.scenes[ch.scene].world.objs, local, vx * sp, vz * sp, jump);
      local.x = p.x; local.z = p.z; local.d = Math.atan2(vx, vz); moving = true;
      if (now - lastSend >= SEND_MS) sendWalk(now, s);
    } else if (moving) { moving = false; sendWalk(now, s); } // parou: uma última posição
  }
  function loop(t) { tick(t); aim(t); raf = on ? requestAnimationFrame(loop) : 0; }

  // ----- E: o objeto interativo visível mais próximo a até 1,5 casa, à frente (cone de 60°) ou colado ao lado -----
  const USA = new Set(['porta', 'bau', 'item', 'npc', 'placa', 'alavanca', 'escada', 'portal']), PERTO = 1.5, CONE = Math.cos(Math.PI / 3);
  const ptOf = o => o.k === 'porta' ? (o.cfg?.e === 'h' ? [o.x + .5, o.y] : [o.x, o.y + .5]) : [o.x + .5, o.y + .5]; // porta: meio da aresta, como no servidor
  function alvo() {
    const s = st(), id = selId(), ch = id && s?.chars[id]; if (!ch?.pos || !worldOk()) return null;
    const p = local?.id === id ? local : ch.pos, w = s.scenes?.[ch.scene]?.world; if (!w) return null;
    const hx = Math.sin(p.d || 0), hz = Math.cos(p.d || 0); let best = null, bs = Infinity;
    for (const [oid, o] of Object.entries(w.objs || {})) {
      if (o?.f !== p.f || !USA.has(o.k) || (o.vis === 'oculto' && !o.rev)) continue;
      if (o.k === 'bau' && (o.cfg?.modo === 'cada' ? o.cfg.por?.[id] : o.cfg?.aberto)) continue; // baú já aberto (por este herói, no modo cada)
      const [ox, oz] = ptOf(o), dx = ox - p.x, dz = oz - p.z, dd = Math.hypot(dx, dz); if (dd > PERTO) continue;
      const fr = dd < 1e-6 ? 1 : (dx * hx + dz * hz) / dd; if (fr < CONE && dd > 1) continue; // fora do cone só vale colado
      const sc = dd - fr * .5; if (sc < bs) { bs = sc; best = { ...o, id: oid }; }
    }
    return best;
  }
  let aimT = 0;
  function aim(now = performance.now()) { if (now - aimT < 120) return; aimT = now; g.MHUD?.prompt(on ? alvo() : null); }
  function use() { const a = alvo(), id = selId(); if (a && id) send({ t: 'interact', id, obj: a.id }); }

  // ----- rede -----
  function onPos(m) {
    const s = st(), now = performance.now();
    if (m.vis && s && m.sc === s.scene) s.vis = m.vis; // visão atual do grupo (base64 por andar), sem esperar o próximo state
    if (m.fix) {
      const [id, f, x, z] = m.fix; console.info('Mundo: posição corrigida pelo servidor', id, f, x, z);
      if (local?.id === id) Object.assign(local, { f, x, z });
      const ch = s?.chars[id]; if (ch) ch.pos = { ...(ch.pos || {}), f, x, z };
      samples.delete(id); return;
    }
    for (const [id, f, x, z, d, mo] of m.l || []) {
      const ch = s?.chars[id]; if (ch) { ch.pos = { f, x, z, d }; ch._m = mo; }
      if (local?.id === id) continue; // o próprio herói é previsto aqui
      let a = samples.get(id); if (!a) samples.set(id, a = []);
      // pacotes que chegam juntos (aba travada, rede em rajada) ganham carimbos espaçados de ~90 ms, até 100 ms à frente
      const t = a.length ? Math.min(now + DELAY, Math.max(now, a[a.length - 1][0] + 90)) : now;
      a.push([t, f, x, z, d, mo]); while (a.length > 2 && now - a[0][0] > KEEP_MS) a.shift();
    }
  }
  // posição para desenhar: o próprio herói previsto; os outros 100 ms atrás, entre duas amostras (sem extrapolar)
  function poseOf(id, now = performance.now()) {
    if (local && local.id === id && on) return local;
    const a = samples.get(id); if (!a?.length) return null;
    const t = now - DELAY; let i = a.length - 1; while (i > 0 && a[i - 1][0] > t) i--;
    const b = a[i], p = i > 0 ? a[i - 1] : b;
    if (b === p || t >= b[0] || p[1] !== b[1]) { const q = t >= b[0] || p[1] !== b[1] ? b : p; return { f: q[1], x: q[2], z: q[3], d: q[4], m: q[5] }; }
    const k = Math.max(0, Math.min(1, (t - p[0]) / (b[0] - p[0])));
    return { f: b[1], x: p[2] + (b[2] - p[2]) * k, z: p[3] + (b[3] - p[3]) * k, d: b[4], m: b[5] };
  }

  // ----- teclas -----
  const KEYMAP = { w: 'w', a: 'a', s: 's', d: 'd' };
  function down(e) {
    if (!on || typing() || !worldOk()) return;
    const k = e.key.toLowerCase();
    if (e.key === 'Control') { ctrlSolo = true; return; }
    ctrlSolo = false;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (KEYMAP[k]) { keys.add(KEYMAP[k]); e.preventDefault(); return; }
    if (e.key === 'Shift') { keys.add('shift'); return; }
    if (k === 'c' && !e.repeat) { crouch = !crouch; return; }
    if (k === 'e') { e.preventDefault(); if (!e.repeat) use(); return; }
    if (k === 'f') { e.preventDefault(); const id = selId(); if (!e.repeat && id) send({ t: 'strike', id }); return; } // golpe no mapa: acertar um inimigo começa com surpresa
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (e.repeat || !local) return; jT = performance.now(); g.MUNDO.jump?.(local.id); const s = st(); if (s) sendWalk(jT, s); return; }
    if (/^[1-4]$/.test(e.key) && !e.repeat && !forced && typeof role !== 'undefined' && role === 'player') { const h = can()[+e.key - 1]; if (h && typeof selCh !== 'undefined') { selCh = h.id; if (typeof render === 'function') render(); } }
  }
  function up(e) {
    const k = e.key.toLowerCase();
    if (e.key === 'Control') { if (ctrlSolo && on && !typing() && worldOk()) crouch = !crouch; ctrlSolo = false; return; } // só o toque no Ctrl, sem outra tecla (Ctrl+W fecha a aba)
    if (KEYMAP[k]) keys.delete(KEYMAP[k]); if (e.key === 'Shift') keys.delete('shift');
  }
  const clear = () => { keys.clear(); ctrlSolo = false; };
  let wired = false;
  function start() {
    if (!wired) { wired = true; addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', clear); document.addEventListener('focusin', () => { if (typing()) clear(); }); }
    if (on) return; on = true; lastT = 0; raf = requestAnimationFrame(loop);
  }
  function stop() { on = false; clear(); if (raf) cancelAnimationFrame(raf); raf = 0; local = null; moving = false; g.MHUD?.prompt(null); }

  function take(id) { forced = id || null; local = null; moving = false; if (forced) { g.MUNDO?.free?.(null); start(); } else if (!(typeof role !== 'undefined' && role === 'player')) stop(); }
  g.MINPUT = { start, stop, take, get forced() { return forced; }, onPos, poseOf, tick, alvo, aim, use, get sel() { return selId(); }, get local() { return local; }, get crouch() { return crouch; } };
  if (typeof role !== 'undefined' && role === 'player') start();
})(globalThis);

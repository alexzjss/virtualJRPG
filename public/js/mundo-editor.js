// ===== mundo 3D: editor do mestre (vista Mundo) =====
// A vista Mundo divide o centro: o grid 2D (canvas) à esquerda e o 3D ao vivo à direita (MUNDO em ctx.edit, desenhando o rascunho).
// O grid desenha o rascunho da cena (S.draft[sc], que mora só no cliente e chega pelo canal draft) ou o world publicado.
// ops(list) aplica as operações no rascunho local, manda wDraft e empilha o inverso para desfazer (50 passos).
(g => {
  const P = g.MPECAS, UNDO_MAX = 50;
  const TEMA_COR = { floresta: '#4f7a3a', castelo: '#7d7a74', praia: '#d9c48f', neve: '#dfe8ee', deserto: '#d6a65f', caverna: '#5b5160', ruinas: '#8f8a6e', pantano: '#5d6b45', vulcao: '#5a3a32', campo: '#7fa65a' };
  const TIPO_COR = { agua: '#3d78b8', fundo: '#1d3a66', perigo: '#d2552a', vazio: '#05070c' }, TIPO_LUZ = { chao: 0, trilha: .18, denso: -.4, baixo: -.2 };
  const ARESTA = { 1: ['#16161c', 4], 2: ['#b0702c', 5], 3: ['#7ae0ff', 4], 4: ['#9aa0a8', 3], 5: ['#c9a66b', 2] };
  const ICONE = { porta: 'P', barreira: 'B', bau: '$', item: 'i', npc: '☺', placa: '¶', alavanca: '/', gatilho: '!', armadilha: '×', escada: '≡', portal: '◎', inimigo: '☠', surgir: '★' };
  const ICONE_COR = { inimigo: '#e4002b', armadilha: '#ff9d2e', portal: '#b48cff', surgir: '#ffc93c', npc: '#7ae0ff' };
  const st = () => (typeof S !== 'undefined' ? S : null);
  const DR = g.VJ_DRAFT || (g.VJ_DRAFT = {}); // rascunhos por cena (canal draft); o state não traz e não apaga
  const E = { tool: 'sel', floor: null, brush: 1, tema: null, tipo: 'chao', und: [], red: [], cv: null, view: null };

  // mundo em edição: o rascunho, ou o publicado se não houver
  const sid = () => st()?.scene;
  const world = () => { const s = st(), id = sid(); return id ? DR[id] || s?.scenes?.[id]?.world || null : null; };
  const floor = () => { const w = world(); if (!w) return null; return w.floors.find(f => f.id === E.floor) || w.floors[0]; };
  const width = () => { const w = +(typeof gui !== 'undefined' && gui.medW); return w >= 20 && w <= 80 ? w : 50; };

  function html() {
    const s = st(); if (s) s.draft = DR; // o state troca o S inteiro: o rascunho volta a ficar à mão do MUNDO
    const w = world(), f = floor(); if (f) E.floor = f.id; if (w && !E.tema) E.tema = w.tema;
    queueMicrotask(mount);
    const dr = !!DR[sid()];
    return `<div class="medit" style="--medw:${width()}%">
      <section class="medit-2d" aria-label="Grid do mapa (vista de cima)"><canvas class="medit-cv"></canvas>
        <div class="medit-info"><b>${esc(f?.name || 'Sem andar')}</b> <small>${f ? f.w + '×' + f.h : ''}${dr ? ' · rascunho' : ' · publicado'}</small></div></section>
      <i class="medit-div" role="separator" aria-orientation="vertical" aria-label="Divisor entre o grid e o 3D" title="Arraste para mudar a largura"></i>
      <section class="medit-3d mundo-slot" data-mundo aria-label="Mapa em 3D ao vivo"></section>
    </div>`;
  }

  // ----- desenho do grid -----
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))); return `rgb(${c.join(',')})`; };
  function cellColor(code) { const d = P.decode(code); if (!d) return '#05070c'; return TIPO_COR[d.tipo] || shade(TEMA_COR[d.tema] || '#7fa65a', TIPO_LUZ[d.tipo] ?? 0); }
  function layout(cv, f) { const r = cv.getBoundingClientRect(), pad = 10, cs = Math.max(2, Math.min((r.width - pad * 2) / f.w, (r.height - pad * 2) / f.h)); return { cs, ox: (r.width - cs * f.w) / 2, oy: (r.height - cs * f.h) / 2, W: r.width, H: r.height }; }
  function draw() {
    const cv = E.cv, s = st(), f = floor(), w = world(); if (!cv?.isConnected || !f || !s) return;
    const dpr = devicePixelRatio || 1, r = cv.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const x = cv.getContext('2d'), L = E.view = layout(cv, f), { cs, ox, oy } = L;
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, L.W, L.H);
    const cell = P.unpack(f.cell, f.w * f.h);
    for (let y = 0; y < f.h; y++) for (let i = 0; i < f.w; i++) { x.fillStyle = cellColor(cell[y * f.w + i]); x.fillRect(ox + i * cs, oy + y * cs, Math.ceil(cs), Math.ceil(cs)); }
    if (cs >= 8) { x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i <= f.w; i++) { x.moveTo(ox + i * cs + .5, oy); x.lineTo(ox + i * cs + .5, oy + f.h * cs); } for (let y = 0; y <= f.h; y++) { x.moveTo(ox, oy + y * cs + .5); x.lineTo(ox + f.w * cs, oy + y * cs + .5); } x.stroke(); }
    // névoa: casas ainda não vistas pelo grupo ficam sombreadas
    const seen = s.scenes[sid()]?.seenW?.[f.id];
    if (seen) { const b = P.unpack(seen, Math.ceil(f.w * f.h / 8)); x.fillStyle = 'rgba(5,7,12,.45)'; for (let k = 0; k < f.w * f.h; k++) if (!(b[k >> 3] >> (k & 7) & 1)) x.fillRect(ox + (k % f.w) * cs, oy + Math.floor(k / f.w) * cs, Math.ceil(cs), Math.ceil(cs)); }
    // arestas: linhas grossas por tipo (porta com vão no meio)
    const open = g.MCOL?.openIdx(w.objs, f.id) || new Set(), wh = P.unpack(f.wallH, f.w * (f.h + 1)), wv = P.unpack(f.wallV, (f.w + 1) * f.h);
    const seg = (e, x0, y0, x1, y1, op) => { const [c, lw] = ARESTA[e] || []; if (!c) return; x.strokeStyle = c; x.lineWidth = Math.max(1.5, Math.min(lw, cs / 3)); x.setLineDash(e === 4 ? [3, 3] : []); x.globalAlpha = op ? .45 : 1; x.beginPath();
      if (e === 2) { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, gx = (x1 - x0) * .18, gy = (y1 - y0) * .18; x.moveTo(x0, y0); x.lineTo(mx - gx, my - gy); x.moveTo(mx + gx, my + gy); x.lineTo(x1, y1); } else { x.moveTo(x0, y0); x.lineTo(x1, y1); }
      x.stroke(); x.globalAlpha = 1; };
    x.lineCap = 'round';
    for (let y = 0; y <= f.h; y++) for (let i = 0; i < f.w; i++) { const e = wh[y * f.w + i]; if (e) seg(e, ox + i * cs, oy + y * cs, ox + (i + 1) * cs, oy + y * cs, open.has('h' + i + ',' + y)); }
    for (let y = 0; y < f.h; y++) for (let i = 0; i <= f.w; i++) { const e = wv[y * (f.w + 1) + i]; if (e) seg(e, ox + i * cs, oy + y * cs, ox + i * cs, oy + (y + 1) * cs, open.has('v' + i + ',' + y)); }
    x.setLineDash([]);
    // objetos como ícones; gatilhos pintam as casas da zona
    const fs = Math.max(8, Math.min(16, cs * .7)); x.font = `700 ${fs}px "Barlow Condensed", system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const o of Object.values(w.objs || {})) {
      if (o.f !== f.id) continue;
      if (o.k === 'gatilho') { x.fillStyle = 'rgba(255,201,60,.22)'; for (const [cx, cy] of o.cfg?.casas || []) x.fillRect(ox + cx * cs, oy + cy * cs, cs, cs); }
      const edge = o.k === 'porta' || o.k === 'barreira', h = o.cfg?.e === 'h';
      const px = ox + (o.x + (edge ? (h ? .5 : 0) : .5)) * cs, py = oy + (o.y + (edge ? (h ? 0 : .5) : .5)) * cs, rr = Math.max(4, Math.min(9, cs * .42));
      x.globalAlpha = o.vis === 'oculto' ? .55 : 1; x.fillStyle = '#0b0b10'; x.beginPath(); x.arc(px, py, rr, 0, Math.PI * 2); x.fill();
      x.strokeStyle = ICONE_COR[o.k] || '#f4efe4'; x.lineWidth = 1.5; x.stroke(); x.fillStyle = ICONE_COR[o.k] || '#f4efe4'; if (cs >= 7) x.fillText(ICONE[o.k] || '?', px, py + .5); x.globalAlpha = 1;
    }
    // heróis e inimigos como pontos
    for (const ch of Object.values(s.chars)) {
      const p = g.MINPUT?.poseOf?.(ch.id) || ch.pos; if (ch.scene !== sid() || !p || p.f !== f.id) continue;
      x.fillStyle = ch.enemy ? '#e4002b' : ch.color || '#ffc93c'; x.strokeStyle = '#0b0b10'; x.lineWidth = 2; x.beginPath(); x.arc(ox + p.x * cs, oy + p.z * cs, Math.max(3, cs * .32), 0, Math.PI * 2); x.fill(); x.stroke();
    }
  }

  // ----- montagem: canvas, divisor, câmera livre do 3D -----
  let ro = null, drag = null;
  function mount() {
    const root = document.querySelector('.medit'); if (!root) return;
    const cv = root.querySelector('.medit-cv'); E.cv = cv;
    if (!ro && g.ResizeObserver) ro = new ResizeObserver(() => draw());
    if (ro && cv && !cv._ro) { cv._ro = true; ro.observe(cv); }
    draw();
  }
  // divisor: arrasta e guarda a largura em gui.medW (persistida com o resto da doca)
  addEventListener('pointerdown', e => {
    const d = e.target.closest?.('.medit-div'); if (d) { e.preventDefault(); drag = { root: d.closest('.medit') }; d.setPointerCapture?.(e.pointerId); return; }
    const m3 = e.target.closest?.('.medit-3d'); if (m3 && e.button === 2 && g.MUNDO) { e.preventDefault(); drag = { pan: true, x: e.clientX, y: e.clientY }; }
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (drag.pan) { g.MUNDO.pan(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; return; }
    const r = drag.root?.getBoundingClientRect(); if (!r) return;
    const p = Math.round(Math.max(20, Math.min(80, (e.clientX - r.left) / r.width * 100))); drag.root.style.setProperty('--medw', p + '%'); drag.p = p;
  });
  addEventListener('pointerup', () => {
    if (!drag) return; const d = drag; drag = null;
    if (d.pan) { const v = g.MUNDO.view; v.tx += v.pan?.dx || 0; v.tz += v.pan?.dz || 0; g.MUNDO.free(v.tx, v.tz); g.MUNDO.panEnd(); return; } // a câmera do mestre fica onde parou
    if (d.p && typeof gui !== 'undefined') { gui.medW = d.p; if (typeof saveGui === 'function') saveGui(); draw(); }
  });
  addEventListener('contextmenu', e => { if (e.target.closest?.('.medit-3d')) e.preventDefault(); });

  // ----- operações e desfazer -----
  const cellsOf = f => P.unpack(f.cell, f.w * f.h);
  const edgeArr = (f, k) => k === 'h' ? [P.unpack(f.wallH, f.w * (f.h + 1)), f.w] : [P.unpack(f.wallV, (f.w + 1) * f.h), f.w + 1];
  // aplica uma operação no world local e devolve o inverso (ou null se não mudou nada)
  function apply1(w, op) {
    if (op.o === 'cells' || op.o === 'edge') {
      const f = w.floors.find(o => o.id === op.f); if (!f) return null;
      const [a, rw] = op.o === 'cells' ? [cellsOf(f), f.w] : edgeArr(f, op.k), inv = [];
      for (const [x, y, v] of op.l) { const i = y * rw + x; if (i < 0 || i >= a.length || a[i] === v) continue; inv.push([x, y, a[i]]); a[i] = v; }
      if (!inv.length) return null;
      if (op.o === 'cells') f.cell = P.pack(a); else f[op.k === 'h' ? 'wallH' : 'wallV'] = P.pack(a);
      return { ...op, l: inv };
    }
    if (op.o === 'obj') { const was = w.objs[op.id] ?? null; if (op.v === null) delete w.objs[op.id]; else w.objs[op.id] = structuredClone(op.v); return { o: 'obj', id: op.id, v: was && structuredClone(was) }; }
    if (op.o === 'goal' || op.o === 'tema') { const was = w[op.o]; w[op.o] = op.v; return { o: op.o, v: was }; }
    if (op.o === 'floor') { const was = w.floors.find(f => f.id === op.v.id); if (op.v.del) { if (!was) return null; w.floors = w.floors.filter(f => f !== was); return { o: 'floor', v: { id: was.id, name: was.name, w: was.w, h: was.h } }; } if (!was) { w.floors.push(P.newFloor(op.v.id, op.v.name || 'Andar', op.v.w, op.v.h, w.tema)); return { o: 'floor', v: { id: op.v.id, del: true } }; } const inv = { o: 'floor', v: { id: was.id, name: was.name, w: was.w, h: was.h } }; was.name = op.v.name ?? was.name; return inv; }
    return null;
  }
  function run(list, stack) {
    const s = st(), id = sid(); if (!s || !id || !list.length) return [];
    if (!DR[id]) DR[id] = structuredClone(s.scenes[id].world);
    const inv = []; for (const op of list) { const r = apply1(DR[id], op); if (r) inv.unshift(r); }
    if (typeof send === 'function') send({ t: 'wDraft', sc: id, ops: list });
    if (stack && inv.length) { stack.push(inv); if (stack.length > UNDO_MAX) stack.shift(); }
    s.draft = DR; draw(); g.MUNDO?.sync?.(s, { role: 'gm', edit: true, floor: E.floor }); return inv;
  }
  function ops(list) { const inv = run(list, E.und); if (inv.length) E.red.length = 0; return inv; }
  function undo() { const l = E.und.pop(); if (l) run(l, E.red); }
  function redo() { const l = E.red.pop(); if (l) run(l, E.und); }

  g.MEDIT = {
    html, mount, draw, ops, undo, redo, world, floor: null,
    get tool() { return E.tool; }, set tool(v) { E.tool = v; },
    get brush() { return E.brush; }, set brush(v) { E.brush = Math.max(1, Math.min(7, +v || 1)); },
    get tema() { return E.tema; }, set tema(v) { E.tema = v; }, get tipo() { return E.tipo; }, set tipo(v) { E.tipo = v; },
    get view() { return E.view; }, get stacks() { return { undo: E.und.length, redo: E.red.length }; },
  };
  Object.defineProperty(g.MEDIT, 'floor', { get: () => E.floor, set: v => { E.floor = v; draw(); }, enumerable: true });
  // rascunho que chega do servidor (canal draft): substitui o local; null = publicado ou descartado
  g.MEDIT.onDraft = m => { if (m.d) DR[m.sc] = m.d; else delete DR[m.sc]; const s = st(); if (s) s.draft = DR; };
})(globalThis);

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
  const E = { tool: 'sel', floor: null, brush: 1, tema: null, tipo: 'chao', objK: 'bau', und: [], red: [], cv: null, view: null, pubN: 0, sel: null, hot: false, hover: null, rect: null };
  const TOOLS = [['sel', 'Selecionar', 'Esc'], ['pincel', 'Pincel', 'B'], ['balde', 'Balde', 'G'], ['ret', 'Retângulo'], ['parede', 'Parede', 'W'], ['porta', 'Porta'], ['barreira', 'Barreira'], ['grade', 'Grade'], ['cerca', 'Cerca'], ['objeto', 'Objeto'], ['nevoa', 'Névoa'], ['mover', 'Mover herói']];
  const EDGE_TOOL = { parede: 1, porta: 2, barreira: 3, grade: 4, cerca: 5 };
  const TEMA_NOME = { floresta: 'Floresta', castelo: 'Castelo', praia: 'Praia', neve: 'Neve', deserto: 'Deserto', caverna: 'Caverna', ruinas: 'Ruínas', pantano: 'Pântano', vulcao: 'Vulcão', campo: 'Campo' };
  const TIPO_NOME = { chao: 'Chão', trilha: 'Trilha', denso: 'Denso (bloqueia)', baixo: 'Baixo (pula)', agua: 'Água', fundo: 'Fundo (bloqueia)', perigo: 'Perigo', vazio: 'Vazio (abismo)' };
  const OBJ_NOMES = [['bau', 'Baú'], ['item', 'Item'], ['npc', 'NPC'], ['placa', 'Placa'], ['alavanca', 'Alavanca'], ['gatilho', 'Gatilho'], ['armadilha', 'Armadilha'], ['escada', 'Escada'], ['portal', 'Portal'], ['inimigo', 'Inimigo'], ['surgir', 'Surgir (chegada)']];

  // mundo em edição: o rascunho, ou o publicado se não houver
  const sid = () => st()?.scene;
  const world = () => { const s = st(), id = sid(); return id ? DR[id] || s?.scenes?.[id]?.world || null : null; };
  const floor = () => { const w = world(); if (!w) return null; return w.floors.find(f => f.id === E.floor) || w.floors[0]; };
  const width = () => { const w = +(typeof gui !== 'undefined' && gui.medW); return w >= 20 && w <= 80 ? w : 50; };

  function html() {
    const s = st(); if (s) s.draft = DR; // o state troca o S inteiro: o rascunho volta a ficar à mão do MUNDO
    const w = world(), f = floor(); if (f) E.floor = f.id; if (w && !E.tema) E.tema = w.tema;
    queueMicrotask(mount);
    const dr = !!DR[sid()], T = E.tool, opt = (v, l, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`;
    const tb = TOOLS.map(([k, l, key]) => `<button type="button" data-mt="${k}" aria-pressed="${T === k}" class="${T === k ? 'on' : ''}" title="${l}${key ? ' (' + key + ')' : ''}">${l}</button>`).join('');
    const tabs = (w?.floors || []).map(o => `<button type="button" data-mf="${esc(o.id)}" aria-pressed="${o.id === f?.id}" class="${o.id === f?.id ? 'on' : ''}">${esc(o.name)}</button>`).join('');
    const bar = `<div class="medit-bar" role="toolbar" aria-label="Ferramentas do editor">
      <div class="medit-tools">${tb}</div>
      <div class="medit-opts">
        ${T === 'pincel' || T === 'balde' || T === 'ret' ? `<label>Tema <select data-mo="tema">${P.TEMAS.map(t => opt(t, TEMA_NOME[t] || t, E.tema)).join('')}</select></label><label>Tipo <select data-mo="tipo">${P.TIPOS.map(t => opt(t, TIPO_NOME[t] || t, E.tipo)).join('')}</select></label>` : ''}
        ${T === 'pincel' || T === 'nevoa' ? `<label>Tamanho <input type="range" min="1" max="7" value="${E.brush}" data-mo="brush" aria-label="Tamanho do pincel"> <b>${E.brush}×${E.brush}</b></label>` : ''}
        ${T === 'objeto' ? `<label>Objeto <select data-mo="obj">${OBJ_NOMES.map(([k, l]) => opt(k, l, E.objK)).join('')}</select></label>` : ''}
        ${EDGE_TOOL[T] ? '<small>Arraste pelas bordas das casas. Shift apaga.</small>' : T === 'nevoa' ? '<small>Revela; com Shift esconde. Vale na hora.</small>' : T === 'mover' ? '<small>Arraste um herói: ele vai na hora.</small>' : T === 'objeto' ? '<small>Clique numa casa. Shift+clique apaga.</small>' : ''}
      </div>
      <div class="medit-floors" aria-label="Andares">${tabs}<button type="button" data-mfa="add" title="Novo andar">+</button><button type="button" data-mfa="ren" title="Renomear o andar">Renomear</button><button type="button" data-mfa="size" title="Mudar o tamanho do andar">Tamanho</button><button type="button" data-mfa="del" title="Apagar o andar">Apagar</button></div>
      <div class="medit-pub"><button type="button" data-mdis ${dr ? '' : 'disabled'}>Descartar</button><button type="button" class="own" data-mpub ${dr ? '' : 'disabled'}>Publicar${E.pubN ? ` <em class="gbdg">${E.pubN}</em>` : ''}</button></div>
    </div>`;
    return `<div class="medit" style="--medw:${width()}%">${bar}
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
    // sobreposições: objeto selecionado, retângulo em curso, aresta sob o cursor, herói arrastado
    const so = E.sel && w.objs?.[E.sel]; if (so && so.f === f.id) { x.strokeStyle = '#ffc93c'; x.lineWidth = 2; x.setLineDash([4, 3]); x.strokeRect(ox + so.x * cs - 2, oy + so.y * cs - 2, cs + 4, cs + 4); x.setLineDash([]); }
    if (E.rect) { const [a, b] = E.rect, x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]); x.fillStyle = 'rgba(255,201,60,.25)'; x.strokeStyle = '#ffc93c'; x.lineWidth = 1.5; x.fillRect(ox + x0 * cs, oy + y0 * cs, (Math.abs(a[0] - b[0]) + 1) * cs, (Math.abs(a[1] - b[1]) + 1) * cs); x.strokeRect(ox + x0 * cs, oy + y0 * cs, (Math.abs(a[0] - b[0]) + 1) * cs, (Math.abs(a[1] - b[1]) + 1) * cs); }
    if (E.hover?.e) { const [k, hx, hy] = E.hover.e; x.strokeStyle = 'rgba(255,201,60,.9)'; x.lineWidth = 3; x.beginPath(); if (k === 'h') { x.moveTo(ox + hx * cs, oy + hy * cs); x.lineTo(ox + (hx + 1) * cs, oy + hy * cs); } else { x.moveTo(ox + hx * cs, oy + hy * cs); x.lineTo(ox + hx * cs, oy + (hy + 1) * cs); } x.stroke(); }
    else if (E.hover?.c && (E.tool === 'pincel' || E.tool === 'nevoa')) { const [cx, cy] = E.hover.c, n = E.brush, h0 = Math.floor((n - 1) / 2); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1; x.strokeRect(ox + (cx - h0) * cs, oy + (cy - h0) * cs, n * cs, n * cs); }
    if (E.drag?.hero) { const d = E.drag; x.strokeStyle = '#ffc93c'; x.lineWidth = 2; x.beginPath(); x.arc(ox + d.x * cs, oy + d.z * cs, Math.max(4, cs * .4), 0, Math.PI * 2); x.stroke(); }
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
  function ops(list) { const inv = run(list, E.und); if (inv.length) { E.red.length = 0; E.pubN++; } return inv; }
  function undo() { const l = E.und.pop(); if (l) run(l, E.red); }
  function redo() { const l = E.red.pop(); if (l) run(l, E.und); }

  // ----- ferramentas no grid -----
  const typing = () => document.activeElement?.matches?.('input,textarea,select,[contenteditable]');
  const rid = () => 'o' + Math.random().toString(36).slice(2, 9);
  const at = e => { const v = E.view, r = E.cv?.getBoundingClientRect(); if (!v || !r) return null; return { fx: (e.clientX - r.left - v.ox) / v.cs, fy: (e.clientY - r.top - v.oy) / v.cs }; };
  const inF = (f, x, y) => x >= 0 && y >= 0 && x < f.w && y < f.h;
  // aresta mais próxima do cursor (menos de 0,25 casa até a linha): ['h', x, y] ou ['v', x, y]
  function edgeAt(fx, fy, f) {
    const dx = Math.abs(fx - Math.round(fx)), dy = Math.abs(fy - Math.round(fy)); if (Math.min(dx, dy) >= .25) return null;
    if (dy <= dx) { const x = Math.floor(fx), y = Math.round(fy); return x >= 0 && x < f.w && y >= 0 && y <= f.h ? ['h', x, y] : null; }
    const x = Math.round(fx), y = Math.floor(fy); return x >= 0 && x <= f.w && y >= 0 && y < f.h ? ['v', x, y] : null;
  }
  const brushCells = (f, cx, cy, n) => { const h0 = Math.floor((n - 1) / 2), out = []; for (let y = cy - h0; y < cy - h0 + n; y++) for (let x = cx - h0; x < cx - h0 + n; x++) if (inF(f, x, y)) out.push([x, y]); return out; };
  const ownerAt = (w, fid, k, x, y) => Object.entries(w.objs || {}).filter(([, o]) => (o.k === 'porta' || o.k === 'barreira') && o.f === fid && o.cfg?.e === k && o.x === x && o.y === y).map(([id]) => id);
  const objAt = (w, fid, x, y) => Object.entries(w.objs || {}).find(([, o]) => o.f === fid && o.x === x && o.y === y && o.k !== 'porta' && o.k !== 'barreira')?.[0]
    || Object.entries(w.objs || {}).find(([, o]) => o.f === fid && o.k === 'gatilho' && o.cfg?.casas?.some(c => c[0] === x && c[1] === y))?.[0];

  // pincelada (casas ou arestas): aplica já no rascunho local, manda o que mudou a cada 100 ms e vira um passo só de desfazer no fim
  let flushT = 0;
  const groupOps = (kind, f, l) => kind === 'cells' ? [{ o: 'cells', f, l: l.map(([, x, y, v]) => [x, y, v]) }] : ['h', 'v'].map(k => ({ o: 'edge', f, k, l: l.filter(e => e[0] === k).map(([, x, y, v]) => [x, y, v]) })).filter(o => o.l.length);
  function strokeStart(kind) { const s = st(), id = sid(); if (!DR[id]) DR[id] = structuredClone(s.scenes[id].world); E.st = { kind, f: floor().id, inv: new Map(), unsent: [], objOps: [], t: 0 }; }
  function flush() { const Z = E.st; clearTimeout(flushT); flushT = 0; if (!Z?.unsent.length) return; const l = Z.unsent; Z.unsent = []; Z.t = performance.now(); if (typeof send === 'function') send({ t: 'wDraft', sc: sid(), ops: groupOps(Z.kind, Z.f, l) }); }
  function strokePut(k, x, y, v) {
    const Z = E.st, w = DR[sid()], f = w?.floors.find(o => o.id === Z.f); if (!f) return;
    const [a, rw, field] = Z.kind === 'cells' ? [cellsOf(f), f.w, 'cell'] : k === 'h' ? [P.unpack(f.wallH, f.w * (f.h + 1)), f.w, 'wallH'] : [P.unpack(f.wallV, (f.w + 1) * f.h), f.w + 1, 'wallV'];
    const i = y * rw + x, key = k + x + ',' + y; if (a[i] === v) return;
    if (!Z.inv.has(key)) Z.inv.set(key, [k, x, y, a[i]]);
    a[i] = v; f[field] = P.pack(a); Z.unsent.push([k, x, y, v]);
    if (Z.kind === 'edge') { // porta e barreira têm um objeto dono da aresta; outra aresta por cima (ou apagar) tira o dono
      const own = ownerAt(w, f.id, k, x, y), want = v === 2 ? 'porta' : v === 3 ? 'barreira' : null;
      for (const id of own) if (w.objs[id].k !== want) Z.objOps.push({ o: 'obj', id, v: null });
      if (want && !own.some(id => w.objs[id].k === want)) Z.objOps.push({ o: 'obj', id: rid(), v: { k: want, f: f.id, x, y, rot: 0, vis: 'visivel', auto: null, cfg: { e: k, estado: 'fechada' } } });
    }
    if (performance.now() - Z.t >= 100) flush(); else if (!flushT) flushT = setTimeout(flush, 100);
    draw();
  }
  function strokeEnd() {
    const Z = E.st; if (!Z) return; flush(); E.st = null;
    let inv = groupOps(Z.kind, Z.f, [...Z.inv.values()]);
    if (Z.objOps.length) inv = [...run(Z.objOps, null), ...inv];
    if (E.late) { const m = E.late; E.late = null; g.MEDIT.onDraft(m); }
    if (inv.length) { E.und.push(inv); if (E.und.length > UNDO_MAX) E.und.shift(); E.red.length = 0; E.pubN++; }
    if (typeof render === 'function') render();
  }
  function flood(f, cx, cy, code) {
    const a = cellsOf(f), c0 = a[cy * f.w + cx]; if (c0 === code) return [];
    const out = [], seen = new Uint8Array(f.w * f.h), q = [[cx, cy]];
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i], k = y * f.w + x; if (seen[k] || a[k] !== c0) continue; seen[k] = 1; out.push([x, y, code]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inF(f, x + dx, y + dy) && !seen[(y + dy) * f.w + x + dx]) q.push([x + dx, y + dy]); }
    return out;
  }
  let fogBuf = [], fogHide = false;
  const fogFlush = () => { if (!fogBuf.length) return; if (typeof send === 'function') send({ t: 'wFog', sc: sid(), f: floor()?.id, l: fogBuf, hide: fogHide }); fogBuf = []; }; // a névoa vale no publicado (Task 4.3)
  function down(e) {
    const cv = e.target.closest?.('.medit-cv'); if (!cv || e.button !== 0) return;
    const p = at(e), f = floor(), w = world(); if (!p || !f || !w) return;
    e.preventDefault(); cv.setPointerCapture?.(e.pointerId);
    const cx = Math.floor(p.fx), cy = Math.floor(p.fy), T = E.tool, code = P.code(E.tema || w.tema, E.tipo);
    E.drag = { tool: T };
    if (T === 'pincel') { strokeStart('cells'); for (const [x, y] of brushCells(f, cx, cy, E.brush)) strokePut('c', x, y, code); }
    else if (EDGE_TOOL[T]) { strokeStart('edge'); const ed = edgeAt(p.fx, p.fy, f); E.drag.shift = e.shiftKey; if (ed) strokePut(ed[0], ed[1], ed[2], e.shiftKey ? 0 : EDGE_TOOL[T]); }
    else if (T === 'balde') { E.drag = null; if (inF(f, cx, cy)) ops([{ o: 'cells', f: f.id, l: flood(f, cx, cy, code) }]); }
    else if (T === 'ret') { if (inF(f, cx, cy)) E.rect = [[cx, cy], [cx, cy]]; }
    else if (T === 'objeto') {
      E.drag = null; if (!inF(f, cx, cy)) return;
      const cur = objAt(w, f.id, cx, cy);
      if (e.shiftKey) { if (cur) ops([{ o: 'obj', id: cur, v: null }]); return; }
      const id = rid(), o = { k: E.objK, f: f.id, x: cx, y: cy, rot: 0, vis: 'visivel', auto: null, cfg: E.objK === 'gatilho' ? { casas: [[cx, cy]] } : {} };
      ops([{ o: 'obj', id, v: o }]); E.sel = id; render();
    }
    else if (T === 'nevoa') { fogHide = e.shiftKey; fogBuf.push(...brushCells(f, cx, cy, E.brush)); }
    else if (T === 'mover') {
      const s = st(), hit = Object.values(s.chars).filter(c => c.scene === sid() && c.pos?.f === f.id).map(c => [c, Math.hypot(c.pos.x - p.fx, c.pos.z - p.fy)]).sort((a, b) => a[1] - b[1])[0];
      if (hit && hit[1] < .8) Object.assign(E.drag, { hero: hit[0].id, x: hit[0].pos.x, z: hit[0].pos.z }); else E.drag = null;
    }
    else { E.drag = null; const ed = edgeAt(p.fx, p.fy, f), ow = ed && ownerAt(w, f.id, ...ed)[0]; E.sel = ow || (inF(f, cx, cy) ? objAt(w, f.id, cx, cy) : null) || null; render(); } // sel
    draw();
  }
  function move(e) {
    const onCv = !!e.target.closest?.('.medit-cv'); if (!E.drag && !onCv) { if (E.hover) { E.hover = null; draw(); } return; }
    const p = at(e), f = floor(); if (!p || !f) return;
    const cx = Math.floor(p.fx), cy = Math.floor(p.fy), T = E.tool;
    E.hover = { c: [cx, cy], e: EDGE_TOOL[T] ? edgeAt(p.fx, p.fy, f) : null };
    const d = E.drag; if (!d) return draw();
    if (T === 'pincel' && E.st) { const code = P.code(E.tema || world().tema, E.tipo); for (const [x, y] of brushCells(f, cx, cy, E.brush)) strokePut('c', x, y, code); }
    else if (EDGE_TOOL[T] && E.st) { const ed = edgeAt(p.fx, p.fy, f); if (ed) strokePut(ed[0], ed[1], ed[2], d.shift ? 0 : EDGE_TOOL[T]); }
    else if (T === 'ret' && E.rect) E.rect[1] = [Math.max(0, Math.min(f.w - 1, cx)), Math.max(0, Math.min(f.h - 1, cy))];
    else if (T === 'nevoa') { fogBuf.push(...brushCells(f, cx, cy, E.brush)); if (fogBuf.length > 200) fogFlush(); }
    else if (T === 'mover' && d.hero) { d.x = Math.max(.05, Math.min(f.w - .05, p.fx)); d.z = Math.max(.05, Math.min(f.h - .05, p.fy)); }
    draw();
  }
  function up() {
    const d = E.drag; if (!d) return; E.drag = null;
    if (E.st) return strokeEnd();
    const f = floor(), w = world(); if (!f || !w) return;
    if (d.tool === 'ret' && E.rect) { const [a, b] = E.rect, code = P.code(E.tema || w.tema, E.tipo), l = []; E.rect = null; for (let y = Math.min(a[1], b[1]); y <= Math.max(a[1], b[1]); y++) for (let x = Math.min(a[0], b[0]); x <= Math.max(a[0], b[0]); x++) l.push([x, y, code]); ops([{ o: 'cells', f: f.id, l }]); render(); }
    else if (d.tool === 'nevoa') fogFlush();
    else if (d.tool === 'mover' && d.hero && typeof send === 'function') send({ t: 'walkGm', id: d.hero, f: f.id, x: Math.round(d.x * 100) / 100, z: Math.round(d.z * 100) / 100 });
    draw();
  }
  addEventListener('pointerdown', down); addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  document.addEventListener('pointerover', e => { E.hot = !!e.target.closest?.('.medit'); });

  // ----- barra: ferramentas, opções, andares, publicar e descartar -----
  const ask = o => typeof dialog === 'function' ? dialog(o) : Promise.resolve(null);
  const resetStacks = () => { E.und.length = 0; E.red.length = 0; E.pubN = 0; };
  document.addEventListener('click', async e => {
    const b = e.target.closest?.('.medit [data-mt], .medit [data-mf], .medit [data-mfa], .medit [data-mpub], .medit [data-mdis]'); if (!b) return;
    const f = floor(), w = world(), id = sid();
    if (b.dataset.mt) { E.tool = b.dataset.mt; E.rect = null; E.hover = null; return render(); }
    if (b.dataset.mf) { E.floor = b.dataset.mf; return render(); }
    if (b.hasAttribute('data-mpub')) { if (typeof send === 'function') send({ t: 'wPub', sc: id }); resetStacks(); return; }
    if (b.hasAttribute('data-mdis')) { if (await ask({ title: 'Descartar o rascunho?', text: 'Todas as mudanças desde o último Publicar vão sumir.', ok: 'Descartar', danger: true }) !== true) return; if (typeof send === 'function') send({ t: 'wDiscard', sc: id }); delete DR[id]; resetStacks(); return render(); }
    const a = b.dataset.mfa; if (!a || !w || !f) return;
    if (a === 'add') { let n = w.floors.length, nid; do nid = 'f' + n++; while (w.floors.some(o => o.id === nid)); ops([{ o: 'floor', v: { id: nid, name: 'Andar ' + (w.floors.length + 1), w: Math.min(64, f.w), h: Math.min(64, f.h) } }]); E.floor = nid; return render(); }
    if (a === 'ren') { const v = await ask({ title: 'Renomear andar', input: f.name, ok: 'Renomear' }); if (typeof v === 'string' && v.trim()) { ops([{ o: 'floor', v: { id: f.id, name: v.trim().slice(0, 30), w: f.w, h: f.h } }]); render(); } return; }
    if (a === 'size') { const v = await ask({ title: 'Tamanho do andar', text: 'Largura × altura, até 64×64. O que ficar de fora some.', input: `${f.w}x${f.h}`, ok: 'Mudar' }); const m = typeof v === 'string' && v.match(/(\d+)\s*[x×*]\s*(\d+)/); if (m) { ops([{ o: 'floor', v: { id: f.id, name: f.name, w: Math.min(64, Math.max(4, +m[1])), h: Math.min(64, Math.max(4, +m[2])) } }]); render(); } return; }
    if (a === 'del') { if (w.floors.length < 2) return typeof toast === 'function' && toast('O mapa precisa de pelo menos um andar.', 'no'); if (await ask({ title: `Apagar "${f.name}"?`, text: 'O andar e os objetos dele somem. Dá para desfazer antes de publicar.', ok: 'Apagar', danger: true }) !== true) return; ops([{ o: 'floor', v: { id: f.id, del: true } }]); E.floor = w.floors.find(o => o.id !== f.id)?.id; return render(); }
  });
  document.addEventListener('change', e => {
    const el = e.target.closest?.('.medit [data-mo]'); if (!el) return; const k = el.dataset.mo;
    if (k === 'brush') E.brush = Math.max(1, Math.min(7, +el.value || 1)); else if (k === 'obj') E.objK = el.value; else E[k] = el.value;
    render();
  });
  // teclas do editor (só com o ponteiro ou o foco na vista Mundo): Ctrl+Z/Ctrl+Y, B pincel, G balde, W parede, Esc volta a Selecionar
  addEventListener('keydown', e => {
    if (!document.querySelector('.medit') || typing() || document.querySelector('.dlg-bg') || !(E.hot || document.activeElement?.closest?.('.medit'))) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey) { if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); } return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = { b: 'pincel', g: 'balde', w: 'parede' }[k]; if (t && !e.repeat) { e.preventDefault(); E.tool = t; return render(); }
    if (e.key === 'Escape' && (E.tool !== 'sel' || E.rect)) { e.preventDefault(); E.tool = 'sel'; E.rect = null; if (E.st) strokeEnd(); return render(); }
    if (k === 'q' || k === 'r') e.preventDefault(); // Q/R giram o 3D (mundo3d.js) sem trocar a vista da doca
  }, true);

  g.MEDIT = {
    html, mount, draw, ops, undo, redo, world, floor: null,
    get tool() { return E.tool; }, set tool(v) { E.tool = v; },
    get brush() { return E.brush; }, set brush(v) { E.brush = Math.max(1, Math.min(7, +v || 1)); },
    get tema() { return E.tema; }, set tema(v) { E.tema = v; }, get tipo() { return E.tipo; }, set tipo(v) { E.tipo = v; },
    get view() { return E.view; }, get stacks() { return { undo: E.und.length, redo: E.red.length }; },
  };
  Object.defineProperty(g.MEDIT, 'floor', { get: () => E.floor, set: v => { E.floor = v; draw(); }, enumerable: true });
  // rascunho que chega do servidor (canal draft): substitui o local; null = publicado ou descartado
  g.MEDIT.onDraft = m => { if (E.st && m.sc === sid()) { E.late = m; return; } // no meio de uma pincelada o eco espera o fim (o local já tem tudo)
    if (m.d) DR[m.sc] = m.d; else delete DR[m.sc]; const s = st(); if (s) s.draft = DR; };
})(globalThis);

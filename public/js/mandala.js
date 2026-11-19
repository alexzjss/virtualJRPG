// ===== árvore de habilidades como mandala de esferas (Canvas 2D) =====
// Marcial no centro, os setores (9 Vínculos, Aura, Ocultismo) como pétalas; cada linha é uma ligação de verdade (RULES.linked).
// place/edges são puros (testados no Node); mount/focus/zoom/learned desenham e cuidam da câmera, que sobrevive às renderizações da página.
(g => {
  const ORDER = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku', 'aura', 'amaterasu', 'tsukuyomi', 'oculto', 'shukketsu', 'hiruko'], DASH = [[2, 7], [12, 6], [1, 9], [14, 4, 2, 4], [6, 6], [3, 3], [12, 8], [2, 11], [8, 3], [4, 8], [16, 6]], SECN = 11, U = 96, C = 55, R = 24, LOD = 0.25, TAU = Math.PI * 2;
  // posição de cada nó: wx, wy do servidor; skill sem posição (do mestre ou importada) segue a mesma escala da grade
  const place = skills => { const P = new Map(), cell = new Map();
    for (const [id, s] of Object.entries(skills)) if (Number.isFinite(s.wx) && Number.isFinite(s.wy)) { P.set(id, [s.wx, s.wy]); if (s.gx != null) cell.set(s.gx + ',' + s.gy, s); }
    for (const [id, s] of Object.entries(skills)) if (!P.has(id)) { // sem posição (do mestre ou importada): pendura-se no vizinho de grade mais próximo, senão fica no centro
      let near = null; for (let r = 1; r <= 3 && !near; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const n = cell.get((s.gx + dx) + ',' + (s.gy + dy)); if (n && (!near || Math.hypot(dx, dy) < near[1])) near = [n, Math.hypot(dx, dy), dx, dy]; }
      P.set(id, near ? [near[0].wx + near[2] * U * .8, near[0].wy + near[3] * U * .8] : [0, 0]); }
    return P; };
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
  const lod = () => view === 'all' ? LOD : LOD * .3; // na aba do setor há menos nós: as esferas aparecem já de longe
  const cam = M.cam = { x: 0, y: 0, z: 0.7 }, anim = new Map(); // id → instante em que foi aprendido
  let disp = 'system-ui,sans-serif', cx0, pv = null, ac, rot = 0, hg = null, rings = [],  tiersS = { sep: [], mid: [] }, tiersC = { sep: [], mid: [] }, core = 0, ro, cv, cx, host, o = null, P = new Map(), E = [], seals = [], stars = [], motes = [], bound = 2000, key = null, hover = null, dirty = true, last = 0, raf = 0, W = 0, H = 0, DPR = 1;
  const hexA = (h, a) => { const v = parseInt((h || '#ffffff').slice(1), 16); return `rgba(${v >> 16},${v >> 8 & 255},${v & 255},${a})`; };
  const col = el => (typeof ELC !== 'undefined' && ELC[el === 'armas' ? 'fis' : el]) || '#ffffff';
  const grp = s => s.br?.startsWith('armas') ? 'armas' : s.el; // a Árvore de Armas é um bloco à parte (el 'fis', sem ligação com o Marcial): ganha o próprio selo
  // IN: largura coberta pela gaveta à direita; o centro da câmera e o minimapa ficam na parte visível
  const VW = () => W - (o?.inset || 0);
  const w2s = (x, y) => [(x - cam.x) * cam.z + VW() / 2, (y - cam.y) * cam.z + H / 2], s2w = (x, y) => [(x - VW() / 2) / cam.z + cam.x, (y - H / 2) / cam.z + cam.y];
  const MINI = 150, miniRect = () => [12, 12, MINI, MINI]; // canto de cima à esquerda: embaixo ficam os botões, à direita o zoom
  const poly = (x, y, r, n, rt = -Math.PI / 2, inner = 0) => { cx.beginPath(); const m = inner ? n * 2 : n; for (let i = 0; i < m; i++) { const rr = inner && i % 2 ? r * inner : r, a = rt + i * TAU / m; i ? cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : cx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } cx.closePath(); };
  // forma da esfera por tipo: ativa = esfera, passiva = hexágono, forma = losango, limite/proibida = estrela
  const body = (x, y, r, s) => s.limit || s.back ? poly(x, y, r * 1.1, 8, -Math.PI / 2, .64) : s.kind === 'form' ? poly(x, y, r * 1.15, 4) : s.kind === 'passive' ? poly(x, y, r * 1.08, 6, 0) : (cx.beginPath(), cx.arc(x, y, r, 0, TAU));
  const chime = () => { try { ac ||= new AudioContext(); ac.resume?.(); const t = ac.currentTime; [660, 990, 1320].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), t0 = t + i * .07; o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.045, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + .5); o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + .55); }); } catch {} };
  const ICON = { dmg: '⚔', mental: '⚔', heal: '✚', passive: '◆', util: '✦', form: '変' };
  // nome em até duas linhas de ~13 letras
  const wrap = n => { const out = []; let l = ''; for (const w of n.split(' ')) { if (l && (l + ' ' + w).length > 13) { out.push(l); l = w; } else l = l ? l + ' ' + w : w; } out.push(l); return out.length > 2 ? [out[0], out.slice(1).join(' ').slice(0, 14) + '…'] : out; };
  const mark = s => s.secret ? '?' : s.back ? '禁' : s.limit ? '極' : s.kind === 'form' ? '変' : s.circ ? '儀' : s.duo ? '双' : s.vow ? '誓' : s.summon ? '召' : ICON[s.kind] || (typeof KANJI !== 'undefined' ? KANJI[s.el] : '•');

  // esfera pronta (degradê + contorno) guardada como imagem: um drawImage por nó em vez de criar um degradê por nó a cada quadro
  const orbs = new Map();
  const orb = (x, y, r, s, c, st) => { const rr = Math.max(2, Math.round(r * 2) / 2), shape = s.limit || s.back ? 'l' : s.kind === 'form' ? 'f' : s.kind === 'passive' ? 'p' : 'a', k = c + st + shape + rr + '|' + DPR;
    let im = orbs.get(k);
    if (!im) { if (orbs.size > 800) orbs.clear(); const pad = Math.ceil(rr * 1.3 + 3), sz = pad * 2; im = document.createElement('canvas'); im.width = im.height = Math.ceil(sz * DPR); const q = im.getContext('2d'); q.scale(DPR, DPR);
      const gr = q.createRadialGradient(pad - rr * .35, pad - rr * .35, rr * .1, pad, pad, rr);
      if (st === 'own') { gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, c); gr.addColorStop(1, hexA(c, .35)); } else { gr.addColorStop(0, hexA(c, st === 'out' ? .1 : .32)); gr.addColorStop(1, 'rgba(10,10,18,.95)'); }
      const keep = cx; cx = q; body(pad, pad, rr, s); cx = keep; q.fillStyle = gr; q.fill(); q.strokeStyle = hexA(c, st === 'out' ? .2 : .85); q.lineWidth = Math.max(1, 1.6 * rr / R); q.stroke(); im.pad = pad; orbs.set(k, im); }
    cx.drawImage(im, x - im.pad, y - im.pad, im.pad * 2, im.pad * 2); };
  // ---------- constelações ----------
  // cada linha (ramo br) desenha uma figura do tema do setor: x(t) é o desvio lateral ao longo da linha (t = 0 na camada 1, 1 na ponta), em −1…1.
  // s espelha a figura nas linhas ímpares e f muda a fase, para linhas vizinhas não ficarem iguais. Na mandala inteira o desvio é pequeno (zigue-zague
  // dentro da faixa da linha); na aba do setor, com espaço, a figura aparece inteira.
  const fr = u => u - Math.floor(u), tri = u => 1 - 4 * Math.abs(fr(u) - .5), sn = u => Math.sin(TAU * u);
  const SHAPE = {
    kagutsuchi: (t, s, f) => s * sn(2 * t + f) * Math.sin(Math.PI * t) * 1.2,          // chama: tremula, abre e fecha na ponta
    susanoo: (t, s, f) => s * sn(2.5 * t + f),                                         // onda
    atlas: (t, s, f) => s * Math.round(sn(1.2 * t + f) * 2) / 2,                       // montanha em degraus
    indra: (t, s, f) => s * tri(3 * t + f),                                            // raio em zigue-zague seco
    fuhaku: (t, s, f) => s * sn(3 * t + f) * (1 - .6 * t),                             // vento que se desfaz
    amaterasu: (t, s, f) => s * (.35 * sn(5 * t + f) + .25 * (t - .5)),                // raio de luz quase reto
    tsukuyomi: (t, s) => s * (Math.sin(Math.PI * t) * 1.7 - .85),                      // crescente
    shukketsu: (t, s, f) => s * (2 * fr(2.5 * t + f) - 1) * .9,                        // espinhos, gotas que escorrem
    hiruko: (t, s, f) => s * sn(4 * t + f) * Math.cos(Math.PI * t),                    // núcleo: hélice que pulsa
    aura: (t, s, f) => s * sn(1.3 * t + f) * (.35 + .65 * t),                          // ki que sobe em espiral
    oculto: (t, s, f) => s * (.7 * sn(2 * t + f) + .3 * sn(5 * t)),                    // serpente do selo
    armas: (t, s) => s * (.5 - t) * .8,                                                // lâmina inclinada
  };
  const shapeX = (g, k, t) => (SHAPE[g] || SHAPE.oculto)(t, k % 2 ? -1 : 1, fr(k * .37));
  const CAMC = ['#5ad1ff', '#5affc8', '#8dff6a', '#e6ff5a', '#ffd84d', '#ffab3d', '#ff7a45', '#ff4d6d', '#e04dff', '#a77bff']; // tom de cada camada (1–10)
  const FAN = 2.6, FAN0 = -Math.PI / 2 - FAN / 2; // aba de setor: o leque ocupa 149°, aberto para cima
  let view = (() => { try { return localStorage.getItem('vj.skView') || 'all'; } catch { return 'all'; } })(), vis = [], laneOf = new Map(), lines = new Map(), nebs = [], tiersV = { sep: [], mid: [], rng: [] };
  // faixas das camadas (1–10): cada camada ocupa uma faixa concêntrica; guarda a divisória entre faixas, o meio de cada uma (onde vai o número) e o alcance
  const bandsOf = ids => { const b = []; for (const id of ids) { const c = o.skills[id].cam, r = Math.hypot(...P.get(id)); if (!c || r < 1) continue; const x = b[c] ||= [r, r]; x[0] = Math.min(x[0], r); x[1] = Math.max(x[1], r); }
    const cs = b.map((x, c) => x && c).filter(Boolean); return { sep: cs.slice(1).map((c, i) => (b[cs[i]][1] + b[c][0]) / 2), mid: cs.map(c => [c, (b[c][0] + b[c][1]) / 2]), rng: cs.map(c => [c, b[c][0], b[c][1]]) }; };
  // nebulosa pronta (uma por cor), esticada com drawImage: barata a cada quadro
  const nebImg = new Map(), neb = c => { let im = nebImg.get(c); if (!im) { im = document.createElement('canvas'); im.width = im.height = 128; const q = im.getContext('2d'), gr = q.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, hexA(c, .55)); gr.addColorStop(.45, hexA(c, .18)); gr.addColorStop(1, hexA(c, 0)); q.fillStyle = gr; q.fillRect(0, 0, 128, 128); nebImg.set(c, im); } return im; };
  const views = () => { const have = new Set(o.ids.map(id => grp(o.skills[id]))); return ['all', 'fis', 'armas', ...ORDER].filter(v => v === 'all' || have.has(v)); };
  function build() { // posições, ligações e selos dos setores; refeito quando as definições, a lista visível ou a aba mudam
    const base = place(o.skills); if (!views().includes(view)) view = 'all';
    // linhas: cada ramo br de um setor (ou das Armas) é um raio da mandala; a ordem dos raios vem do ângulo deles
    laneOf = new Map(); lines = new Map(); const info = {}, by = {};
    for (const id of o.ids) { const s = o.skills[id], g = grp(s); if (g === 'fis' || !s.br || !base.has(id)) continue; const m = by[g] ||= new Map(); (m.get(s.br) || m.set(s.br, []).get(s.br)).push(id); }
    for (const [g, m] of Object.entries(by)) { let sx = 0, sy = 0; for (const l of m.values()) for (const id of l) { const p = base.get(id); sx += p[0]; sy += p[1]; }
      const mid = Math.atan2(sy, sx), rel = a => { let d = a - mid; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
      const L = [...m].map(([br, ids]) => { ids.sort((a, b) => Math.hypot(...base.get(a)) - Math.hypot(...base.get(b))); const as = ids.map(id => rel(Math.atan2(base.get(id)[1], base.get(id)[0]))).sort((a, b) => a - b); return { br, ids, a: as[as.length >> 1] }; }).sort((p, q) => p.a - q.a);
      info[g] = { mid, L, da: L.length > 1 ? (L[L.length - 1].a - L[0].a) / (L.length - 1) : .3 };
      L.forEach((l, k) => { lines.set(l.br, l.ids); l.ids.forEach((id, i) => laneOf.set(id, { g, k, br: l.br, t: l.ids.length > 1 ? i / (l.ids.length - 1) : 0 })); }); }
    vis = view === 'all' ? o.ids : o.ids.filter(id => grp(o.skills[id]) === view); P = new Map();
    if (view === 'all' || view === 'fis' || !info[view]) { // mandala inteira (ou o núcleo Marcial): posição do servidor, com o zigue-zague discreto da figura dentro da faixa
      for (const id of vis) { const p = base.get(id), L = laneOf.get(id); if (!p) continue; if (!L) { P.set(id, p); continue; } const I = info[L.g], r = Math.hypot(...p), a = I.mid + I.L[L.k].a + shapeX(L.g, L.k, L.t) * .25 * I.da; P.set(id, [r * Math.cos(a), r * Math.sin(a)]); }
      const rr = view === 'all' ? rot : 0; if (rr) { const c = Math.cos(rr), n = Math.sin(rr); for (const [id, [x, y]] of P) P.set(id, [x * c - y * n, x * n + y * c]); }
    } else { // aba do setor: as linhas abertas num leque largo, base embaixo e camada 10 em cima; com espaço, cada linha desenha a figura inteira
      const I = info[view], n = I.L.length, d = FAN / n, rs = vis.map(id => Math.hypot(...(base.get(id) || [0, 0]))), r0 = Math.min(...rs), R1 = Math.max(700, 230 / d);
      for (const id of vis) { const p = base.get(id), L = laneOf.get(id); if (!p) continue; const r = R1 + (Math.hypot(...p) - r0) * .7, a = L ? FAN0 + (L.k + .5) * d + shapeX(view, L.k, L.t) * .42 * d : FAN0 + FAN / 2; P.set(id, [r * Math.cos(a), r * Math.sin(a)]); } }
    E = edges(o.skills, new Set(vis));
    const cen = {}; for (const id of vis) { const s = o.skills[id], p = P.get(id), c = cen[grp(s)] ||= { x: 0, y: 0, n: 0, ids: [] }; c.x += p[0]; c.y += p[1]; c.n++; c.ids.push(id); }
    bound = 400; rings = [...new Set(vis.map(id => Math.round(Math.hypot(...P.get(id)) / 4) * 4))].filter(r => r > 0).sort((a, b) => a - b);
    tiersS = bandsOf(vis.filter(id => o.skills[id].el !== 'fis')); tiersC = bandsOf(vis.filter(id => o.skills[id].el === 'fis')); tiersV = bandsOf(vis);
    const sr = vis.filter(id => o.skills[id].el !== 'fis').map(id => Math.hypot(...P.get(id))); core = sr.length && view === 'all' ? Math.min(...sr) - 60 : 0; seals = Object.entries(cen).map(([el, c]) => { const x = c.x / c.n, y = c.y / c.n; let r = 0; for (const id of c.ids) { const p = P.get(id); r += Math.hypot(p[0] - x, p[1] - y); bound = Math.max(bound, Math.abs(p[0]), Math.abs(p[1])); } return { el, x, y, r: Math.max(180, r / c.n * 1.3) }; });
    stars = []; for (let i = 0; i < 900; i++) stars.push([(Math.random() * 2 - 1) * bound * 1.25, (Math.random() * 2 - 1) * bound * 1.25, Math.random() * 1.5 + .3, Math.random() * TAU]);
    motes = seals.filter(s => s.el !== 'fis').flatMap(s => Array.from({ length: 14 }, () => [s, Math.random() * TAU, Math.random() * s.r, Math.random() * TAU]));
    // céu de cada setor: nuvens de nebulosa na cor do patrono (e um toque do tom das camadas) espalhadas pela área dos nós
    nebs = []; for (const s of seals) { if (s.el === 'fis') continue; const ids = cen[s.el].ids, k = view === 'all' ? 5 : 16;
      for (let i = 0; i < k; i++) { const p = P.get(ids[Math.floor(Math.random() * ids.length)]); nebs.push({ x: p[0] + (Math.random() - .5) * 300, y: p[1] + (Math.random() - .5) * 300, r: (view === 'all' ? 500 : 700) + Math.random() * 900, c: i % 3 === 2 ? CAMC[Math.floor(Math.random() * 10)] : col(s.el), a: .35 + Math.random() * .4 }); } }
  }
  // aba atual da árvore: 'all' (mandala inteira), 'fis' (Marcial), 'armas' ou um setor
  M.view = v => { if (!o) return; view = v; try { localStorage.setItem('vj.skView', v); } catch {} build(); fitAll(); };
  M.views = () => o ? views() : ['all'];
  M.current = () => view;
  const resize = () => { if (!host) return; const r = host.getBoundingClientRect(); DPR = Math.min(1.5, devicePixelRatio || 1); /* acima de 1.5 a nitidez não paga o custo: celulares têm 3× */ W = Math.max(200, r.width); H = Math.max(200, r.height); if (cv.width === Math.round(W * DPR) && cv.height === Math.round(H * DPR)) return; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px'; dirty = true; };
  let lively = true; // o último quadro tinha algo pulsando na tela (nó disponível, rota ou animação)
  let touched = 0; // última interação (arrastar, zoom, voo): até 1,5 s depois desenha a ~30 fps; parado, a pulsação ambiente vai a ~12 fps
  const busy = () => anim.size || performance.now() - touched < 1500;

  function draw(now) {
    raf = 0; if (!cv?.isConnected || !o) return;
    if (document.hidden) { raf = requestAnimationFrame(draw); return; }
    if (!dirty && now - last < (busy() ? 33 : lively || o.route?.length > 1 ? 80 : 250)) { raf = requestAnimationFrame(draw); return; }
    last = now; dirty = false; const T = now / 1000, far = cam.z < lod(); hg = hover && o.skills[hover] && view === 'all' ? grp(o.skills[hover]) : null;
    const hl = hover && laneOf.get(hover)?.br, inL = id => laneOf.get(id)?.br === hl; // linha sob o cursor: ela acende inteira, as outras do setor apagam
    cx = cx0; cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const bg = cx.createRadialGradient(...w2s(0, 0), 0, ...w2s(0, 0), Math.max(W, H) * .9); bg.addColorStop(0, '#15101c'); bg.addColorStop(1, '#07070d'); cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
    for (const nb of nebs) { const [x, y] = w2s(nb.x, nb.y), r = nb.r * cam.z; if (x + r < 0 || y + r < 0 || x - r > W || y - r > H) continue; cx.globalAlpha = nb.a * (.85 + .15 * Math.sin(T * .3 + nb.x)); cx.drawImage(neb(nb.c), x - r, y - r, r * 2, r * 2); } cx.globalAlpha = 1;
    cx.fillStyle = 'rgb(210,200,255)'; for (const [sx, sy, r, ph] of stars) { const x = (sx - cam.x) * cam.z + VW() / 2, y = (sy - cam.y) * cam.z + H / 2; if (x < 0 || y < 0 || x > W || y > H) continue; cx.globalAlpha = .12 + .2 * Math.sin(T * 1.3 + ph); cx.fillRect(x, y, r, r); } cx.globalAlpha = 1;
    // aba de setor: faixas das camadas no leque, com o tom de cada camada e o número na borda
    if (view !== 'all') { const [ox, oy] = w2s(0, 0), z = cam.z, fan = view !== 'fis', a0 = fan ? FAN0 - .03 : 0, a1 = fan ? FAN0 + FAN + .03 : TAU;
      for (const [c, lo, hi] of tiersV.rng) { const r0 = Math.max(0, lo - 46) * z, r1 = (hi + 46) * z; cx.fillStyle = hexA(CAMC[c - 1], c % 2 ? .07 : .045); cx.beginPath(); cx.arc(ox, oy, r1, a0, a1); cx.arc(ox, oy, r0, a1, a0, true); cx.closePath(); cx.fill();
        cx.strokeStyle = hexA(CAMC[c - 1], .3); cx.lineWidth = 1; cx.beginPath(); cx.arc(ox, oy, r1, a0, a1); cx.stroke();
        if (z > .03 && fan) { const rm = (lo + hi) / 2 * z, fs = Math.round(Math.min(16, 10 + 8 * z)); for (const a of [a0 - .02, a1 + .02]) { const x = ox + Math.cos(a) * rm, y = oy + Math.sin(a) * rm; cx.fillStyle = 'rgba(10,8,20,.85)'; cx.beginPath(); cx.arc(x, y, fs, 0, TAU); cx.fill(); cx.strokeStyle = hexA(CAMC[c - 1], .8); cx.stroke(); cx.fillStyle = CAMC[c - 1]; cx.font = `700 ${fs}px ${disp}`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(c, x, y + .5); } } } }
    // guias do sphere grid: um anel por nível, a divisória Marcial | Armas no centro e as 11 fatias dos setores em volta
    if (view === 'all') { const [ox, oy] = w2s(0, 0), n = SECN, z = cam.z, rb = (Math.max(...rings, 0) + 70) * z, cr = Math.max(0, core) * z;
      for (const [c, lo, hi] of tiersS.rng) { const r0 = Math.max(cr, (lo - 46) * z), r1 = (hi + 46) * z; if (r1 <= r0) continue; cx.fillStyle = hexA(CAMC[c - 1], c % 2 ? .05 : .03); cx.beginPath(); cx.arc(ox, oy, r1, 0, TAU); cx.arc(ox, oy, r0, TAU, 0, true); cx.fill(); } // faixas coloridas das camadas
      cx.lineWidth = 1; cx.strokeStyle = 'rgba(170,160,230,.08)'; // núcleo: anéis cinza; fora dele cada fatia tem a cor e o padrão do seu patrono
      for (const r of tiersC.sep) { if (r * z < 6 || r * z > cr) continue; cx.beginPath(); cx.arc(ox, oy, r * z, 0, TAU); cx.stroke(); } // divisórias entre as camadas do núcleo
      ORDER.forEach((el, i) => { const c = col(el), a0 = (i - .5) * TAU / n + rot, a1 = (i + .5) * TAU / n + rot, gr = cx.createRadialGradient(ox, oy, cr, ox, oy, rb);
        gr.addColorStop(0, hexA(c, o.mineEls?.has(el) ? .16 : .09)); gr.addColorStop(1, hexA(c, .015)); cx.fillStyle = gr; cx.beginPath(); cx.arc(ox, oy, rb, a0, a1); cx.arc(ox, oy, cr, a1, a0, true); cx.closePath(); cx.fill();
        cx.strokeStyle = hexA(c, far ? .1 : .2); cx.setLineDash(DASH[i].map(v => v * Math.max(.6, z * 2.2)));
        for (const r of tiersS.sep) { if (r * z <= cr + 2) continue; cx.beginPath(); cx.arc(ox, oy, r * z, a0, a1); cx.stroke(); } cx.setLineDash([]); }); 
      cx.strokeStyle = 'rgba(170,160,230,.3)'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(ox, oy, cr, 0, TAU); cx.stroke();
      const vx = Math.cos(rot + Math.PI / 2) * cr, vy = Math.sin(rot + Math.PI / 2) * cr; cx.beginPath(); cx.moveTo(ox - vx, oy - vy); cx.lineTo(ox + vx, oy + vy);
      for (let i = 0; i < n; i++) { const a = (i + .5) * TAU / n + rot; cx.moveTo(ox + Math.cos(a) * cr, oy + Math.sin(a) * cr); cx.lineTo(ox + Math.cos(a) * rb, oy + Math.sin(a) * rb); } cx.stroke();
      // runas: losango onde cada divisória de setor cruza o núcleo e as divisórias de camada; número da camada no meio de cada faixa, ao longo das divisórias
      cx.fillStyle = 'rgba(200,190,255,.55)';
      for (let i = 0; i < n; i++) { const bb = (i + .5) * TAU / n + rot; poly(ox + Math.cos(bb) * cr, oy + Math.sin(bb) * cr, 6, 4); cx.fill(); if (z > .12) for (const r of tiersS.sep) { poly(ox + Math.cos(bb) * r * z, oy + Math.sin(bb) * r * z, 4, 4); cx.fill(); } }
      if (z > .04) { const fs = Math.round(Math.min(14, 9 + 8 * z)), rr = Math.max(8, fs * .75); cx.font = `700 ${fs}px ${disp}`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        for (let i = 0; i < n; i++) { if (z < .12 && i) break; const bb = (i + .5) * TAU / n + rot; for (const [c, r] of tiersS.mid) { const x = ox + Math.cos(bb) * r * z, y = oy + Math.sin(bb) * r * z; if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
          cx.fillStyle = 'rgba(10,8,20,.85)'; cx.beginPath(); cx.arc(x, y, rr, 0, TAU); cx.fill(); cx.strokeStyle = 'rgba(210,200,255,.35)'; cx.lineWidth = 1; cx.stroke(); cx.fillStyle = 'rgba(225,215,255,.9)'; cx.fillText(c, x, y + .5); } } }
      if (z < .5) { cx.fillStyle = 'rgba(200,190,255,.5)'; cx.font = `600 13px ${disp}`; cx.textAlign = 'center'; cx.fillText('Marcial', ox + Math.cos(Math.PI + rot) * cr * .5, oy + Math.sin(Math.PI + rot) * cr * .5 + 44); cx.fillText('Armas', ox + Math.cos(rot) * cr * .5, oy + Math.sin(rot) * cr * .5 + 44); } }
    // fundo de cada setor: halo na cor do patrono, partículas lentas e o kanji grande (selo quando afastado)
    if (view !== 'all') { const s = seals.find(q => q.el === view) || seals[0]; if (s) { const kj = s.el === 'armas' ? '武' : s.el === 'fis' ? '拳' : (typeof KANJI !== 'undefined' && KANJI[s.el]) || '', [x, y] = w2s(0, -(bound * .55)); cx.save(); cx.globalAlpha = .07; cx.fillStyle = col(s.el); cx.font = `${Math.round(Math.min(H * .7, bound * cam.z * .8))}px 'Noto Serif JP','Yu Mincho','MS Mincho',serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(kj, view === 'fis' ? w2s(0, 0)[0] : x, view === 'fis' ? w2s(0, 0)[1] : y); cx.restore(); } } // aba: o kanji do setor bem apagado, atrás das constelações
    else for (const s of seals) { const [x, y] = w2s(s.x, s.y), r = s.r * cam.z * 1.3, c = col(s.el), mine = s.el === 'fis' || s.el === 'armas' || o.mineEls?.has(s.el);
      const gr = cx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(c, mine ? .17 : .08)); gr.addColorStop(1, hexA(c, 0)); cx.fillStyle = gr; cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill();
      cx.save(); const kj = s.el === 'armas' ? '武' : s.el === 'fis' ? '拳' : (typeof KANJI !== 'undefined' && KANJI[s.el]) || ''; cx.globalAlpha = far ? .85 : .11; cx.fillStyle = c; cx.shadowColor = c; cx.shadowBlur = far ? 0 : 24 * cam.z; cx.font = `${Math.max(40, far ? r * .9 : Math.min(r * .9, 170))}px 'Noto Serif JP','Yu Mincho','MS Mincho',serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(kj, x, y); cx.restore();
      if (hg && s.el === hg) { cx.strokeStyle = hexA(c, .6); cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, r * .62, 0, TAU); cx.stroke(); }
      if (far) { cx.strokeStyle = hexA(c, .55); cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, y, Math.max(26, r * .5), 0, TAU); cx.stroke();
        cx.fillStyle = hexA(c, .95); cx.font = `600 14px ${disp}`; cx.textAlign = 'center'; cx.fillText((s.el === 'armas' ? 'Armas' : typeof PATRON !== 'undefined' ? PATRON[s.el] : s.el) + (mine && s.el !== 'fis' && s.el !== 'armas' ? ' · seu Vínculo' : ''), x, y + Math.max(26, r * .5) + 16); } }
    
    if (view === 'all') for (const [s, a, d, ph] of motes) { const t = T * .15 + ph, [x, y] = w2s(s.x + Math.cos(a + t) * d, s.y + Math.sin(a + t) * d); if (x < 0 || y < 0 || x > W || y > H) continue; cx.fillStyle = hexA(col(s.el), .25 + .2 * Math.sin(T + ph)); cx.beginPath(); cx.arc(x, y, Math.max(1, 2.5 * cam.z), 0, TAU); cx.fill(); }
    // trilhas
    cx.lineCap = 'round';
    for (const [a, b] of E) { const pa = P.get(a), pb = P.get(b), [x1, y1] = w2s(...pa), [x2, y2] = w2s(...pb);
      if (Math.max(x1, x2) < -40 || Math.min(x1, x2) > W + 40 || Math.max(y1, y2) < -40 || Math.min(y1, y2) > H + 40) continue;
      if (view === 'all' && cam.z < .1 && !(o.state(a) === 'own' && o.state(b) === 'own')) continue;
      const both = hl && inL(a) && inL(b); cx.globalAlpha = hg && grp(o.skills[a]) !== hg ? .22 : hl && !both ? .25 : 1;
      const sa = o.state(a), sb = o.state(b), on = sa === 'own' && sb === 'own', out = sa === 'out' || sb === 'out', sec = sa === 'secret' || sb === 'secret';
      const el = o.skills[a].el === 'fis' ? o.skills[b].el : o.skills[a].el, c = col(el), st8 = laneOf.has(a) && laneOf.get(a).br === laneOf.get(b)?.br; // dentro de uma linha: traço reto de constelação
      const mx = st8 ? (x1 + x2) / 2 : (x1 + x2) / 2 + (y2 - y1) * .16, my = st8 ? (y1 + y2) / 2 : (y1 + y2) / 2 - (x2 - x1) * .16;
      const lit = [a, b].some(id => anim.has(id) && now - anim.get(id) < 900);
      // traços finos de estrela; a trilha aprendida ganha um halo largo e suave por baixo (acesa de ponta a ponta)
      cx.strokeStyle = lit ? '#ffffff' : on ? hexA(c, .95) : both ? hexA(c, .8) : out ? hexA(c, .08) : sec ? hexA(c, .16) : hexA(c, .34); cx.lineWidth = on || lit ? Math.max(1.2, 2.2 * cam.z) : both ? Math.max(1, 1.8 * cam.z) : Math.max(.5, 1.1 * cam.z);
      const [ox, oy] = w2s(0, 0), r1 = Math.hypot(pa[0], pa[1]), r2 = Math.hypot(pb[0], pb[1]), same = !st8 && r1 > 1 && Math.abs(r1 - r2) < 2; // no mesmo anel a trilha segue o arco; entre anéis, uma curva leve
      cx.beginPath(); if (same) { let a1 = Math.atan2(y1 - oy, x1 - ox), a2 = Math.atan2(y2 - oy, x2 - ox), d = a2 - a1; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; cx.arc(ox, oy, r1 * cam.z, a1, a1 + d, d < 0); } else { cx.moveTo(x1, y1); cx.quadraticCurveTo(mx, my, x2, y2); }
      if (on && !far) { const w = cx.lineWidth, s = cx.strokeStyle; cx.strokeStyle = hexA(c, .2); cx.lineWidth = Math.max(4, 9 * cam.z); cx.stroke(); cx.strokeStyle = s; cx.lineWidth = w; }
      cx.stroke();
      if (lit && !far) { const t = anim.get(b) ?? anim.get(a), k = Math.min(1, (now - t) / 700), u = anim.has(b) ? k : 1 - k, qx = (1 - u) ** 2 * x1 + 2 * (1 - u) * u * mx + u * u * x2, qy = (1 - u) ** 2 * y1 + 2 * (1 - u) * u * my + u * u * y2; cx.fillStyle = '#fff'; cx.shadowColor = c; cx.shadowBlur = 12; cx.beginPath(); cx.arc(qx, qy, Math.max(2.5, 5 * cam.z), 0, TAU); cx.fill(); cx.shadowBlur = 0; }
      if (on && !far) { const k = (T * .5 + (a.length * 7 + b.length) * .13) % 1, qx = (1 - k) ** 2 * x1 + 2 * (1 - k) * k * mx + k * k * x2, qy = (1 - k) ** 2 * y1 + 2 * (1 - k) * k * my + k * k * y2; cx.fillStyle = hexA(c, .9); cx.beginPath(); cx.arc(qx, qy, Math.max(1.5, 3 * cam.z), 0, TAU); cx.fill(); }
      // portão: na trilha que chega a um nó travado (requisito, Despertar, escolha trancada) vindo de um aprendido
      const gate = sa === 'own' && sb !== 'own' && o.marks(b).gate ? b : sb === 'own' && sa !== 'own' && o.marks(a).gate ? a : null;
      if (gate && !far && cam.z > .45) { const gx = (x1 + 2 * mx + x2) / 4, gy = (y1 + 2 * my + y2) / 4, z = Math.max(7, 9 * cam.z); cx.fillStyle = '#0b0b14'; cx.strokeStyle = hexA(c, .95); cx.lineWidth = 1.5; cx.fillRect(gx - z, gy - z, 2 * z, 2 * z); cx.strokeRect(gx - z, gy - z, 2 * z, 2 * z); cx.fillStyle = hexA(c, .95); cx.font = `${Math.round(z * 1.3)}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('⛩', gx, gy + 1); } }
    cx.globalAlpha = 1; 
    // rota até o nó escolhido
    if (o.route?.length > 1) { cx.strokeStyle = '#ffffff'; cx.lineWidth = 3; cx.setLineDash([10, 8]); cx.lineDashOffset = -T * 30; cx.beginPath(); o.route.forEach((id, i) => { const [x, y] = w2s(...P.get(id)); i ? cx.lineTo(x, y) : cx.moveTo(x, y); }); cx.stroke(); cx.setLineDash([]); }
    if (pv && hover && pv.ids.length > 1) { cx.strokeStyle = 'rgba(255,211,77,.85)'; cx.lineWidth = 2.5; cx.setLineDash([6, 7]); cx.lineDashOffset = -T * 24; cx.beginPath(); pv.ids.forEach((id, i) => { const p = P.get(id); if (!p) return; const [x, y] = w2s(...p); i ? cx.lineTo(x, y) : cx.moveTo(x, y); }); cx.stroke(); cx.setLineDash([]); }
    // esferas
    const r0 = Math.max(1.5, R * cam.z); let pulse = false;
    for (const id of vis) { const s = o.skills[id], [x, y] = w2s(...P.get(id)); if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      const st = o.state(id), mk = o.marks(id), c = col(s.el), r = r0 * (s.limit || s.back ? 1.25 : 1);
      if (far) { const own = st === 'own', av = st === 'av', rr = own ? Math.max(2.6, r * 1.15) : av ? Math.max(2, r * .9) : Math.max(1.2, r * .65);
        cx.fillStyle = own ? '#ffffff' : hexA(c, st === 'out' || st === 'secret' ? .1 : av ? .95 : .38); cx.beginPath(); cx.arc(x, y, rr, 0, TAU); cx.fill();
        if (own || av) { cx.strokeStyle = hexA(c, own ? .9 : .6 + .3 * Math.sin(T * 3 + x * .01)); cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x, y, rr + 2.5, 0, TAU); cx.stroke(); if (av) pulse = true; }
        if (mk.hit) { cx.strokeStyle = 'rgba(255,240,150,.95)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, rr + 6 + Math.sin(T * 4) * 1.5, 0, TAU); cx.stroke(); }
        continue; }
      cx.globalAlpha = (mk.dim ? .25 : 1) * (hg && grp(s) !== hg ? .3 : 1) * (hl && !inL(id) ? .4 : 1); orb(x, y, r, s, c, st);
      if (st === 'own') { const k = r * (1.7 + .15 * Math.sin(T * 2 + x * .02)), q = r * .22; cx.fillStyle = 'rgba(255,255,255,.75)'; cx.beginPath(); cx.moveTo(x - k, y); cx.lineTo(x, y - q); cx.lineTo(x + k, y); cx.lineTo(x, y + q); cx.closePath(); cx.moveTo(x, y - k); cx.lineTo(x + q, y); cx.lineTo(x, y + k); cx.lineTo(x - q, y); cx.closePath(); cx.fill(); } // brilho em cruz de estrela
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
    
    if (pv && hover && pv.ids.length > 1 && P.get(hover)) { const [x, y] = w2s(...P.get(hover)), t = `${pv.ids.length - 1} ${pv.ids.length > 2 ? 'nós' : 'nó'} · ${pv.cost} XP`; cx.font = `600 13px ${disp}`; const w = cx.measureText(t).width + 16; cx.fillStyle = 'rgba(10,8,20,.92)'; cx.strokeStyle = 'rgba(255,211,77,.9)'; cx.lineWidth = 1; cx.fillRect(x - w / 2, y - R * cam.z - 34, w, 22); cx.strokeRect(x - w / 2, y - R * cam.z - 34, w, 22); cx.fillStyle = '#ffd34d'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, x, y - R * cam.z - 22); }
    // nome da linha sob o cursor (o da sua primeira técnica) e quanto dela já foi aprendido, logo acima da esfera
    if (hl && !far) { const ids = lines.get(hl) || [], tip = P.get(hover), first = o.skills[ids[0]]; if (tip && first) { const [x, y] = w2s(...tip), own = ids.filter(id => o.state(id) === 'own').length, c = col(o.skills[ids[0]].el);
      const t = `✦ ${o.state(ids[0]) === 'secret' ? '???' : first.name} · ${own}/${ids.length}`; cx.font = `600 13px ${disp}`; const w = cx.measureText(t).width + 18, yy = y - R * cam.z - 40; cx.fillStyle = 'rgba(10,8,20,.92)'; cx.strokeStyle = hexA(c, .9); cx.lineWidth = 1; cx.fillRect(x - w / 2, yy, w, 22); cx.strokeRect(x - w / 2, yy, w, 22); cx.fillStyle = hexA(c, 1); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, x, yy + 11); } }
    lively = pulse;
    // minimapa
    const [mx0, my0, mw] = miniRect(), k = mw / (bound * 2.2); cx.fillStyle = 'rgba(11,11,20,.88)'; cx.fillRect(mx0, my0, mw, mw); cx.strokeStyle = 'rgba(255,255,255,.18)'; cx.strokeRect(mx0, my0, mw, mw);
    for (const id of vis) { const [x, y] = P.get(id), st = o.state(id); cx.fillStyle = st === 'own' ? '#ffffff' : hexA(col(o.skills[id].el), st === 'out' || st === 'secret' ? .25 : .6); cx.fillRect(mx0 + mw / 2 + x * k, my0 + mw / 2 + y * k, 1.3, 1.3); }
    const [a1, b1] = s2w(0, 0), [a2, b2] = s2w(W, H); cx.strokeStyle = '#ffffff'; cx.strokeRect(mx0 + mw / 2 + a1 * k, my0 + mw / 2 + b1 * k, (a2 - a1) * k, (b2 - b1) * k);
    raf = requestAnimationFrame(draw);
  }
  const kick = () => { dirty = true; touched = performance.now(); if (!raf) raf = requestAnimationFrame(draw); };

  // ---------- câmera e entrada ----------
  const clampZ = z => Math.min(3, Math.max(.025, z));
  let flying = 0;
  const fly = (x, y, z) => { const a = { ...cam }, t0 = performance.now(), id = ++flying; (function step() { if (id !== flying) return; const k = Math.min(1, (performance.now() - t0) / 550), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; cam.x = a.x + (x - a.x) * e; cam.y = a.y + (y - a.y) * e; cam.z = a.z * Math.pow(clampZ(z) / a.z, e); kick(); if (k < 1) requestAnimationFrame(step); })(); };
  const zoomAt = (px, py, z) => { const [wx, wy] = s2w(px, py); cam.z = clampZ(z); const [nx, ny] = s2w(px, py); cam.x += wx - nx; cam.y += wy - ny; kick(); };
  const pick = (px, py) => { if (cam.z < lod()) return null; let best = null, bd = Math.max(8, R * 1.3 * cam.z) ** 2; for (const id of vis) { const [x, y] = w2s(...P.get(id)), d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = id; } } return best; };
  const fitAll = () => { const ps = vis.map(id => P.get(id)); if (!ps.length) return fly(0, 0, Math.min(VW(), H) / (bound * 2.2)); const x0 = Math.min(...ps.map(p => p[0])), x1 = Math.max(...ps.map(p => p[0])), y0 = Math.min(...ps.map(p => p[1])), y1 = Math.max(...ps.map(p => p[1]));
    fly((x0 + x1) / 2, (y0 + y1) / 2, Math.min(VW() / Math.max(400, (x1 - x0) * 1.15), H / Math.max(400, (y1 - y0) * 1.15))); }; // enquadra mandala e Árvore de Armas
  M.focus = t => { if (!o) return; if (t === 'all') return view === 'all' ? fitAll() : M.view('all');
    if (t === 'core') t = 'fis';
    if (views().includes(t)) return M.view(t); // um setor, o Marcial ou as Armas: abre a aba dele
    if (o.skills[t] && !P.has(t)) { view = grp(o.skills[t]); try { localStorage.setItem('vj.skView', view); } catch {} build(); } // nó de outra aba: troca para a aba dele
    if (t === 'mine') { const own = vis.filter(id => o.state(id) === 'own'); if (!own.length) return M.focus('core'); const xs = own.map(id => P.get(id)); return fly(xs.reduce((a, p) => a + p[0], 0) / xs.length, xs.reduce((a, p) => a + p[1], 0) / xs.length, .9); }
    const sl = seals.find(q => q.el === t); if (sl) return fly(sl.x, sl.y, .5);
    const p = P.get(t); if (p) fly(p[0], p[1], Math.max(cam.z, .9)); };
  M.rotate = k => { if (!o || view !== 'all') return; const d = k * TAU / SECN, c = Math.cos(d), n = Math.sin(d); rot += d; build(); [cam.x, cam.y] = [cam.x * c - cam.y * n, cam.x * n + cam.y * c]; kick(); };
  M.rotateTo = el => { if (!o || view !== 'all') return; const ids = o.ids.filter(id => grp(o.skills[id]) === el); if (!ids.length) return; let x = 0, y = 0; for (const id of ids) { x += P.get(id)[0]; y += P.get(id)[1]; } const d = -Math.PI / 2 - Math.atan2(y, x), c = Math.cos(d), n = Math.sin(d); rot += d; build(); [cam.x, cam.y] = [cam.x * c - cam.y * n, cam.x * n + cam.y * c]; kick(); };
  M.zoom = f => zoomAt(VW() / 2, H / 2, cam.z * f);
  M.learned = id => { anim.set(id, performance.now()); chime(); kick(); };

  const ptr = new Map(); let drag = null, pinch = null, wantFocus = false;
  function wire() {
    cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; wantFocus = true; cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.offsetX, e.offsetY]); flying++;
      if (ptr.size === 2) { const [p, q] = [...ptr.values()]; pinch = { d: Math.hypot(p[0] - q[0], p[1] - q[1]), z: cam.z }; drag = null; } else drag = { x: e.offsetX, y: e.offsetY, cx: cam.x, cy: cam.y, moved: 0 }; });
    cv.addEventListener('pointermove', e => {
      if (drag && e.pointerType === 'mouse' && !e.buttons) { drag = null; ptr.clear(); } // o botão foi solto fora (o render tirou a captura)
      if (ptr.has(e.pointerId)) ptr.set(e.pointerId, [e.offsetX, e.offsetY]);
      if (pinch && ptr.size === 2) { const [p, q] = [...ptr.values()]; zoomAt((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, pinch.z * Math.hypot(p[0] - q[0], p[1] - q[1]) / pinch.d); return; }
      if (drag) { const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy)); if (drag.moved > 4) { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; kick(); } }
      const h = drag?.moved > 4 ? null : pick(e.offsetX, e.offsetY); if (h !== hover) { hover = h; pv = h && o?.preview ? o.preview(h) : null; kick(); } o?.onHover?.(h, e.clientX, e.clientY); cv.style.cursor = h ? 'pointer' : drag ? 'grabbing' : 'grab'; });
    const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null;
      if (drag && drag.moved <= 4 && e.type === 'pointerup') { const [mx0, my0, mw] = miniRect();
        if (e.offsetX >= mx0 && e.offsetY >= my0 && e.offsetX <= mx0 + mw && e.offsetY <= my0 + mw) { const k = (bound * 2.2) / mw; fly((e.offsetX - mx0 - mw / 2) * k, (e.offsetY - my0 - mw / 2) * k, cam.z); }
        else { const id = pick(e.offsetX, e.offsetY); if (id) o?.onPick?.(id); else if (cam.z < lod()) { const [wx, wy] = s2w(e.offsetX, e.offsetY), s = seals.find(s => Math.hypot(s.x - wx, s.y - wy) < s.r); if (s) fly(s.x, s.y, .6); } } }
      drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    addEventListener('pointerup', e => { if (e.target !== cv && ptr.has(e.pointerId)) { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (!ptr.size) drag = null; } });
    // 8. foco do teclado: o canvas volta a ter foco depois de cada render se o jogador estava nele
    cv.addEventListener('keydown', () => wantFocus = true);
    document.addEventListener('pointerdown', e => { if (e.target !== cv) wantFocus = false; }, true);
    cv.addEventListener('pointerleave', () => { if (hover) { hover = null; pv = null; kick(); } o?.onHover?.(null); });
    cv.addEventListener('wheel', e => { e.preventDefault(); flying++; zoomAt(e.offsetX, e.offsetY, cam.z * Math.exp(-Math.max(-120, Math.min(120, e.deltaY * (e.deltaMode ? 33 : 1))) / 400)); }, { passive: false });
    cv.addEventListener('keydown', e => { const s = 80 / cam.z, mv = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
      if (mv) { e.preventDefault(); cam.x += mv[0]; cam.y += mv[1]; kick(); } else if (e.key === '+' || e.key === '=') M.zoom(1.3); else if (e.key === '-') M.zoom(1 / 1.3); else if (e.key === 'q' || e.key === 'Q') M.rotate(-1); else if (e.key === 'e' || e.key === 'E') M.rotate(1); });
    document.addEventListener('visibilitychange', kick);
  }

  // monta (ou reencaixa) o canvas em host. opts: { skills, ids, state(id), marks(id), route, mineEls, key, inset, onPick(id), onHover(id, x, y) }
  M.mount = (h, opts) => {
    if (!cv) { disp = getComputedStyle(document.documentElement).getPropertyValue('--disp').trim() || disp; cv = document.createElement('canvas'); cv.tabIndex = 0; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Mandala de habilidades: arraste para mover, roda ou + − para o zoom, setas para andar'); cx = cx0 = cv.getContext('2d'); lv = document.createElement('canvas'); lx = lv.getContext('2d'); }
    const rebuild = !o || o.skills !== opts.skills || o.ids.length !== opts.ids.length || o.ids.some((id, i) => id !== opts.ids[i]);
    if (host !== h) { host = h; h.prepend(cv); if (!ro) { ro = new ResizeObserver(resize); wire(); } ro.disconnect(); ro.observe(h); }
    else if (!h.contains(cv)) h.prepend(cv);
    o = opts; resize(); if (rebuild) build(); if (wantFocus && document.activeElement !== cv) cv.focus({ preventScroll: true });
    if (opts.key !== key) { key = opts.key; const own = vis.filter(id => o.state(id) === 'own'); if (own.length) { const xs = own.map(id => P.get(id)); Object.assign(cam, { x: xs.reduce((a, p) => a + p[0], 0) / xs.length, y: xs.reduce((a, p) => a + p[1], 0) / xs.length, z: .9 }); } else if (view !== 'all' && view !== 'fis') fitAll(); else { const p = P.get('g0') || [0, 0]; Object.assign(cam, { x: p[0], y: p[1], z: .9 }); } }
    kick();
  };
})(globalThis);

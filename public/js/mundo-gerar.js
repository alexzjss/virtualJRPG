// ===== mundo 3D: geradores de andar — masmorra, área aberta, vila e caverna =====
// gerar(tipo, tema, w, h, seed) → { floor: { w, h, cell, wallH, wallV }, objs: { id: obj sem f } }, determinístico pela semente
// (mulberry32). Script comum como o mundo-pecas.js: o servidor importa (H.wGen escreve no rascunho) e o editor do mestre carrega
// na janela Gerar para a prévia, que sai igual ao que o servidor grava. Invariante: toda casa andável alcança o surgir
// (BFS pelas arestas: porta conta como passagem; parede, grade e cerca fecham). O que sobra preso vira bloqueio no fim.
(g => {
  const P = g.MPECAS;
  const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const BLOQ = new Set(['denso', 'baixo', 'fundo', 'vazio']);
  // o mesmo sorteio de variante das peças (mundo3d-pecas.js): na caverna, a variante 1 do denso é o cristal
  const rndPeca = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };

  // ----- grade de trabalho: tipo por casa e arestas (wallH: borda de cima de cada casa; wallV: a da esquerda) -----
  function Grade(w, h, r, fill) {
    const G = { w, h, r, t: new Array(w * h).fill(fill), H: new Uint8Array(w * (h + 1)), V: new Uint8Array((w + 1) * h), objs: {}, n: 0 };
    G.at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 'vazio' : G.t[y * w + x];
    G.set = (x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) G.t[y * w + x] = v; };
    G.anda = (x, y) => !BLOQ.has(G.at(x, y));
    G.int = (a, b) => a + Math.floor(r() * (b - a + 1)); // inteiro em [a, b]
    // aresta entre (x, y) e o vizinho (dx, dy): [vetor, índice, 'h'|'v', ax, ay] (ax, ay = coordenada da aresta)
    G.aresta = (x, y, dx, dy) => dx ? (X => [G.V, y * (w + 1) + X, 'v', X, y])(dx > 0 ? x + 1 : x) : (Y => [G.H, Y * w + x, 'h', x, Y])(dy > 0 ? y + 1 : y);
    G.edge = (x, y, dx, dy, v) => { const [a, i] = G.aresta(x, y, dx, dy); a[i] = v; };
    G.obj = (k, x, y, cfg = {}, extra = {}) => { const id = 'g' + (++G.n); G.objs[id] = { k, x, y, rot: 0, vis: 'visivel', auto: null, cfg, ...extra }; return id; };
    G.porta = (x, y, dx, dy) => { const [a, i, e, ax, ay] = G.aresta(x, y, dx, dy); a[i] = 2; G.obj('porta', ax, ay, { e, estado: 'fechada' }); };
    return G;
  }
  const PASSA = new Set([0, 2]); // nada e porta
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // distâncias andando de (x0, y0), respeitando as arestas (−1 = não alcança)
  function bfs(G, x0, y0) {
    const d = new Int32Array(G.w * G.h).fill(-1), q = [x0 + y0 * G.w]; d[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const x = q[i] % G.w, y = (q[i] - x) / G.w;
      for (const [dx, dy] of D4) {
        const nx = x + dx, ny = y + dy, k = ny * G.w + nx; if (!G.anda(nx, ny) || d[k] >= 0) continue;
        const [a, j] = G.aresta(x, y, dx, dy); if (!PASSA.has(a[j])) continue;
        d[k] = d[q[i]] + 1; q.push(k);
      }
    }
    return d;
  }
  // o que ficou preso vira bloqueio (e perde objetos); devolve as distâncias do surgir
  function prende(G, sx, sy, bloq) {
    const d = bfs(G, sx, sy);
    for (let k = 0; k < d.length; k++) if (d[k] < 0 && !BLOQ.has(G.t[k])) G.t[k] = bloq;
    for (const [id, o] of Object.entries(G.objs)) if (o.k !== 'porta' && d[o.y * G.w + o.x] < 0) delete G.objs[id];
    return d;
  }
  // parede entre casa andável e vazio (ou a borda); com sala[], também entre salas diferentes (corredor = −1), salvo as portas
  function paredes(G, sala) {
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      if (!G.anda(x, y)) continue;
      for (const [dx, dy] of D4) {
        const nx = x + dx, ny = y + dy, [a, i] = G.aresta(x, y, dx, dy); if (a[i]) continue;
        const fora = G.at(nx, ny) === 'vazio', outra = sala && G.anda(nx, ny) && sala[y * G.w + x] !== sala[ny * G.w + nx];
        if (fora || outra) a[i] = 1;
      }
    }
  }
  // caminho mais barato (A* em 4 direções) de a até b; custo(x, y) por casa
  function aStar(G, a, b, custo) {
    const n = G.w * G.h, g0 = new Float64Array(n).fill(Infinity), de = new Int32Array(n).fill(-1), fechado = new Uint8Array(n), heap = [];
    const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const s = a.y * G.w + a.x, t = b.y * G.w + b.x; g0[s] = 0; push(s, 0);
    while (heap.length) {
      const [, k] = pop(); if (fechado[k]) continue; fechado[k] = 1; if (k === t) break;
      const x = k % G.w, y = (k - x) / G.w;
      for (const [dx, dy] of D4) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= G.w || ny >= G.h) continue;
        const j = ny * G.w + nx, c = g0[k] + custo(nx, ny); if (c >= g0[j]) continue;
        g0[j] = c; de[j] = k; push(j, c + Math.abs(nx - b.x) + Math.abs(ny - b.y));
      }
    }
    const path = []; for (let k = t; k >= 0; k = de[k]) { path.push({ x: k % G.w, y: Math.floor(k / G.w) }); if (k === s) break; }
    return path.reverse();
  }

  // ----- masmorra: BSP (profundidade 4), salas de 4 a 10, corredores em L, porta onde o corredor entra na sala -----
  function masmorra(G) {
    const { w, h } = G, sala = new Int32Array(w * h).fill(-1), salas = [], portas = new Map(); // aresta → [x, y, dx, dy]
    const parte = (n, d) => {
      const MIN = 6, podeV = n.w >= MIN * 2, podeH = n.h >= MIN * 2;
      if (d === 4 || (!podeV && !podeH)) { n.folha = true; return n; }
      const vert = podeV && (!podeH || n.w > n.h * 1.25 || (n.h <= n.w * 1.25 && G.r() < .5));
      if (vert) { const c = G.int(MIN, n.w - MIN); n.a = parte({ x: n.x, y: n.y, w: c, h: n.h }, d + 1); n.b = parte({ x: n.x + c, y: n.y, w: n.w - c, h: n.h }, d + 1); }
      else { const c = G.int(MIN, n.h - MIN); n.a = parte({ x: n.x, y: n.y, w: n.w, h: c }, d + 1); n.b = parte({ x: n.x, y: n.y + c, w: n.w, h: n.h - c }, d + 1); }
      return n;
    };
    const raiz = parte({ x: 0, y: 0, w, h }, 0);
    const salasDe = n => n.folha ? [n.sala] : [...salasDe(n.a), ...salasDe(n.b)];
    const monta = n => {
      if (!n.folha) { monta(n.a); monta(n.b); return; }
      const rw = G.int(4, Math.min(10, n.w - 2)), rh = G.int(4, Math.min(10, n.h - 2)), rx = n.x + 1 + G.int(0, n.w - 2 - rw), ry = n.y + 1 + G.int(0, n.h - 2 - rh);
      n.sala = { i: salas.length, x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) }; salas.push(n.sala);
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) { G.set(x, y, 'chao'); sala[y * w + x] = n.sala.i; }
    };
    monta(raiz);
    // corredor em L entre uma sala de cada lado; cada passo de corredor para sala (ou de sala para corredor) é uma porta
    const passo = (x, y, nx, ny) => { const a = sala[y * w + x], b = sala[ny * w + nx]; if (a !== b && (a < 0 || b < 0)) { const [, i, e] = G.aresta(x, y, nx - x, ny - y); if (!portas.has(e + i)) portas.set(e + i, [x, y, nx - x, ny - y]); } };
    const cava = (x, y) => { if (G.at(x, y) === 'vazio') G.set(x, y, 'trilha'); };
    const liga = n => {
      if (n.folha) return; liga(n.a); liga(n.b);
      const A = salasDe(n.a), B = salasDe(n.b), a = A[G.int(0, A.length - 1)], b = B[G.int(0, B.length - 1)];
      let x = a.cx, y = a.cy; const hFirst = G.r() < .5, anda = (tx, ty) => { while (x !== tx || y !== ty) { const nx = x + Math.sign(tx - x), ny = y + (nx === x ? Math.sign(ty - y) : 0); cava(nx, ny); passo(x, y, nx, ny); x = nx; y = ny; } };
      if (hFirst) { anda(b.cx, y); anda(x, b.cy); } else { anda(x, b.cy); anda(b.cx, y); }
    };
    liga(raiz);
    for (const [x, y, dx, dy] of portas.values()) G.porta(x, y, dx, dy);
    paredes(G, sala);
    const s0 = salas[0], d = prende(G, s0.cx, s0.cy, 'vazio');
    G.obj('surgir', s0.cx, s0.cy);
    // baús e armadilhas em casas livres; a sala mais distante (andando) guarda o baú maior
    const livre = (x, y) => G.anda(x, y) && d[y * w + x] >= 0 && !Object.values(G.objs).some(o => o.k !== 'porta' && o.x === x && o.y === y);
    const casaEm = (s, tenta = 30) => { for (let i = 0; i < tenta; i++) { const x = G.int(s.x, s.x + s.w - 1), y = G.int(s.y, s.y + s.h - 1); if (livre(x, y)) return { x, y }; } return null; };
    const longe = salas.slice(1).filter(s => d[s.cy * w + s.cx] >= 0).sort((a, b) => d[b.cy * w + b.cx] - d[a.cy * w + a.cx])[0] || s0;
    const p0 = casaEm(longe) || { x: s0.cx + 1 < s0.x + s0.w ? s0.cx + 1 : s0.cx - 1, y: s0.cy };
    G.obj('bau', p0.x, p0.y, { itens: [], ouro: G.int(150, 300), modo: 'uma' }, { rot: G.int(0, 3) });
    const outras = salas.filter(s => s !== longe && s !== s0 && d[s.cy * w + s.cx] >= 0);
    for (let i = 0, n = G.int(1, 3); i < n; i++) { const s = outras.length ? outras[G.int(0, outras.length - 1)] : s0, p = casaEm(s); if (p) G.obj('bau', p.x, p.y, { itens: [], ouro: G.int(10, 60), modo: 'uma' }, { rot: G.int(0, 3) }); }
    const corredor = []; for (let k = 0; k < w * h; k++) if (G.t[k] === 'trilha' && d[k] >= 0) corredor.push(k);
    for (let i = 0, n = G.int(1, 3), tenta = 0; i < n && tenta < 60; tenta++) {
      const k = corredor.length && G.r() < .7 ? corredor[G.int(0, corredor.length - 1)] : null, p = k != null ? { x: k % w, y: Math.floor(k / w) } : casaEm(salas[G.int(0, salas.length - 1)], 1);
      if (p && livre(p.x, p.y)) { G.obj('armadilha', p.x, p.y, { perc: 12, esq: 12, dano: G.int(6, 16), elem: '', cond: '', rearma: false }, { vis: 'oculto' }); i++; }
    }
  }

  // ----- área aberta: ruído de valor (2 oitavas) com denso acima de 0,58, clareiras ligadas por trilhas, rio opcional -----
  function aberto(G) {
    const { w, h } = G, rede = cel => { const gw = Math.ceil(w / cel) + 2, gh = Math.ceil(h / cel) + 2, v = Array.from({ length: gw * gh }, () => G.r()), s = t => t * t * (3 - 2 * t);
      return (x, y) => { const fx = x / cel, fy = y / cel, ix = Math.floor(fx), iy = Math.floor(fy), tx = s(fx - ix), ty = s(fy - iy), at = (a, b) => v[b * gw + a];
        return (at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty; }; };
    const o1 = rede(8), o2 = rede(4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) G.set(x, y, (o1(x, y) * 2 + o2(x, y)) / 3 > .58 ? 'denso' : 'chao');
    let rio = null;
    if (G.r() < .5) { // rio de cima a baixo: 2 casas de fundo com uma faixa de água de cada lado
      rio = []; let x = G.int(Math.floor(w * .35), Math.floor(w * .6));
      for (let y = 0; y < h; y++) { x = Math.max(3, Math.min(w - 5, x + G.int(-1, 1))); rio.push(x); G.set(x - 1, y, 'agua'); G.set(x, y, 'fundo'); G.set(x + 1, y, 'fundo'); G.set(x + 2, y, 'agua'); }
    }
    const lado = c => rio && c.x < rio[c.y];
    const cl = []; for (let i = 0, n = G.int(3, 5); i < n; i++) cl.push({ x: G.int(3, w - 4), y: G.int(3, h - 4), r: G.int(2, 3) });
    if (rio && cl.every(c => lado(c) === lado(cl[0]))) { const c = cl[cl.length - 1]; c.x = lado(c) ? Math.min(w - 4, rio[c.y] + 4) : Math.max(3, rio[c.y] - 4); } // uma clareira de cada lado do rio
    for (const c of cl) for (let y = c.y - c.r; y <= c.y + c.r; y++) for (let x = c.x - c.r; x <= c.x + c.r; x++) if ((x - c.x) ** 2 + (y - c.y) ** 2 <= c.r * c.r + 1 && G.at(x, y) === 'denso') G.set(x, y, 'chao');
    const custo = (x, y) => ({ denso: 4, fundo: 6, agua: 2 })[G.at(x, y)] || 1;
    for (let i = 1; i < cl.length; i++) for (const p of aStar(G, cl[i - 1], cl[i], custo)) { const t = G.at(p.x, p.y); G.set(p.x, p.y, t === 'fundo' || t === 'agua' ? 'chao' : t === 'chao' && G.r() < .2 ? 'chao' : 'trilha'); } // pontes de chão
    for (let k = 0; k < w * h; k++) if (G.t[k] === 'chao' && G.r() < .03) G.t[k] = 'baixo';
    const s = cl[0]; G.set(s.x, s.y, 'chao'); prende(G, s.x, s.y, 'denso'); G.obj('surgir', s.x, s.y);
  }

  // ----- vila: ruas em grade (8 a 12 casas, ±2), casas com porta para a rua, quintais cercados, praça com um NPC de loja -----
  function vila(G) {
    const { w, h } = G, linhas = n => { const a = []; let p = G.int(1, 4); while (p <= n - 3) { a.push(p); p += G.int(8, 12); } return a; };
    const xs = linhas(w), ys = linhas(h);
    for (const x of xs) for (let y = 0; y < h; y++) { G.set(x, y, 'trilha'); G.set(x + 1, y, 'trilha'); }
    for (const y of ys) for (let x = 0; x < w; x++) { G.set(x, y, 'trilha'); G.set(x, y + 1, 'trilha'); }
    const faixas = (ls, n) => { const f = []; let a = 0; for (const l of ls) { if (l - 1 >= a) f.push([a, l - 1, a > 0, true]); a = l + 2; } if (a <= n - 1) f.push([a, n - 1, a > 0, false]); return f; }; // [ini, fim, rua antes, rua depois]
    const quadras = []; for (const [x0, x1, rl, rr] of faixas(xs, w)) for (const [y0, y1, rt, rb] of faixas(ys, h)) quadras.push({ x0, x1, y0, y1, rua: { l: rl, r: rr, t: rt, b: rb } });
    const cx = w / 2, cy = h / 2, praca = quadras.slice().sort((a, b) => Math.hypot((a.x0 + a.x1) / 2 - cx, (a.y0 + a.y1) / 2 - cy) - Math.hypot((b.x0 + b.x1) / 2 - cx, (b.y0 + b.y1) / 2 - cy))[0];
    for (let y = praca.y0; y <= praca.y1; y++) for (let x = praca.x0; x <= praca.x1; x++) G.set(x, y, 'trilha');
    const px = (praca.x0 + praca.x1) >> 1, py = (praca.y0 + praca.y1) >> 1;
    G.obj('npc', px, py, { nome: 'Mercador', retrato: '', imgF: '', ch: '', dialogo: { ini: 'a', nos: { a: { fala: 'Bem-vindo! Quer dar uma olhada no que eu tenho?', escolhas: [{ txt: 'Ver a loja', vai: '', faz: 'loja' }, { txt: 'Até mais', vai: '', faz: '' }] } } } });
    const sx = px + 1 <= praca.x1 ? px + 1 : px - 1 >= praca.x0 ? px - 1 : px, sy = sx === px ? (py + 1 <= praca.y1 ? py + 1 : py - 1) : py;
    for (const q of quadras) {
      if (q === praca) continue;
      const bw = q.x1 - q.x0 + 1, bh = q.y1 - q.y0 + 1; if (bw < 6 || bh < 6) continue; // sem lugar para casa e quintal: fica o gramado
      const hw = G.int(4, Math.min(7, bw - 2)), hh = G.int(4, Math.min(6, bh - 2)), hx = q.x0 + 1 + G.int(0, bw - 2 - hw), hy = q.y0 + 1 + G.int(0, bh - 2 - hh);
      // a porta vai para o lado com rua mais perto da casa
      const lados = [['t', hy - q.y0], ['b', q.y1 - (hy + hh - 1)], ['l', hx - q.x0], ['r', q.x1 - (hx + hw - 1)]].filter(([k]) => q.rua[k]).sort((a, b) => a[1] - b[1]);
      const ld = (lados[0] || ['b'])[0], dx = ld === 'l' ? -1 : ld === 'r' ? 1 : 0, dy = ld === 't' ? -1 : ld === 'b' ? 1 : 0;
      const ox = dx ? (dx > 0 ? hx + hw - 1 : hx) : hx + (hw >> 1), oy = dy ? (dy > 0 ? hy + hh - 1 : hy) : hy + (hh >> 1);
      for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) for (const [ex, ey] of D4) { const nx = x + ex, ny = y + ey; if (nx < hx || ny < hy || nx >= hx + hw || ny >= hy + hh) G.edge(x, y, ex, ey, 1); }
      G.porta(ox, oy, dx, dy);
      // cerca na borda do quintal, com o portão na frente da porta
      const gx = dx ? (dx > 0 ? q.x1 : q.x0) : ox, gy = dy ? (dy > 0 ? q.y1 : q.y0) : oy;
      for (let x = q.x0; x <= q.x1; x++) { G.edge(x, q.y0, 0, -1, 5); G.edge(x, q.y1, 0, 1, 5); }
      for (let y = q.y0; y <= q.y1; y++) { G.edge(q.x0, y, -1, 0, 5); G.edge(q.x1, y, 1, 0, 5); }
      G.edge(gx, gy, dx, dy, 0);
      if (dx) for (let x = Math.min(ox, gx) + (dx > 0 ? 1 : 0); x <= Math.max(ox, gx) - (dx < 0 ? 1 : 0); x++) G.set(x, oy, 'trilha'); // caminho da porta ao portão
      else for (let y = Math.min(oy, gy) + (dy > 0 ? 1 : 0); y <= Math.max(oy, gy) - (dy < 0 ? 1 : 0); y++) G.set(ox, y, 'trilha');
    }
    prende(G, sx, sy, 'denso'); G.obj('surgir', sx, sy);
  }

  // ----- caverna: 45% de parede, 5 passos de autômato (B5678/S45678), só a maior região, 3 lagos e cristais -----
  function caverna(G) {
    const { w, h } = G; let pa = Array.from({ length: w * h }, (_, k) => { const x = k % w, y = (k - x) / w; return x === 0 || y === 0 || x === w - 1 || y === h - 1 || G.r() < .45; });
    for (let i = 0; i < 5; i++) pa = pa.map((p, k) => { const x = k % w, y = (k - x) / w; let n = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { if (!a && !b) continue; const X = x + a, Y = y + b; if (X < 0 || Y < 0 || X >= w || Y >= h || pa[Y * w + X]) n++; } return p ? n >= 4 : n >= 5; });
    for (let k = 0; k < w * h; k++) G.t[k] = pa[k] ? 'vazio' : 'chao';
    // só a maior região
    const reg = new Int32Array(w * h).fill(-1), tam = []; for (let k = 0; k < w * h; k++) { if (G.t[k] !== 'chao' || reg[k] >= 0) continue; const id = tam.length, q = [k]; reg[k] = id; for (let i = 0; i < q.length; i++) { const x = q[i] % w, y = (q[i] - x) / w; for (const [dx, dy] of D4) { const j = (y + dy) * w + x + dx; if (G.at(x + dx, y + dy) === 'chao' && reg[j] < 0) { reg[j] = id; q.push(j); } } } tam.push(q.length); }
    if (!tam.length) { for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) G.set(x, y, 'chao'); tam.push(1); reg.fill(0); } // sorte ruim: uma câmara só
    const maior = tam.indexOf(Math.max(...tam)); for (let k = 0; k < w * h; k++) if (reg[k] !== maior) G.t[k] = 'vazio';
    const chao = []; for (let k = 0; k < w * h; k++) if (G.t[k] === 'chao') chao.push(k);
    for (let i = 0; i < 3 && chao.length; i++) { // lagos rasos em 3 câmaras
      const k0 = chao[G.int(0, chao.length - 1)], q = [k0], n = G.int(4, 10); const vis = new Set(q);
      for (let j = 0; j < q.length && j < n; j++) { const k = q[j], x = k % w, y = (k - x) / w; G.t[k] = 'agua'; for (const [dx, dy] of D4) { const m = (y + dy) * w + x + dx; if (G.at(x + dx, y + dy) === 'chao' && !vis.has(m)) { vis.add(m); q.push(m); } } }
    }
    const meio = chao.filter(k => G.t[k] === 'chao').sort((a, b) => Math.hypot(a % w - w / 2, Math.floor(a / w) - h / 2) - Math.hypot(b % w - w / 2, Math.floor(b / w) - h / 2))[0] ?? chao[0];
    const sx = meio % w, sy = Math.floor(meio / w);
    for (const k of chao) { // cristais: denso de caverna encostado na rocha, só onde a peça sai na variante cristal
      const x = k % w, y = (k - x) / w; if (G.t[k] !== 'chao' || Math.abs(x - sx) + Math.abs(y - sy) < 3) continue;
      if (D4.some(([dx, dy]) => G.at(x + dx, y + dy) === 'vazio') && G.r() < .08 && rndPeca(x, y, 4) * 2 >= 1) G.t[k] = 'denso';
    }
    prende(G, sx, sy, 'vazio'); paredes(G, null); G.obj('surgir', sx, sy);
  }

  const GERA = { masmorra, aberto, vila, caverna };
  const TIPOS = Object.keys(GERA);
  function gerar(tipo, tema, w, h, seed) {
    if (!GERA[tipo]) throw new Error('gerador desconhecido: ' + tipo);
    tema = P.TEMAS.includes(tema) ? tema : 'campo'; w = Math.max(16, Math.min(64, w | 0)); h = Math.max(16, Math.min(64, h | 0));
    const G = Grade(w, h, mulberry32(seed >>> 0), tipo === 'aberto' || tipo === 'vila' ? 'chao' : 'vazio');
    GERA[tipo](G);
    const cell = new Uint8Array(w * h); for (let k = 0; k < w * h; k++) cell[k] = P.code(tema, G.t[k]);
    return { floor: { w, h, cell: P.pack(cell), wallH: P.pack(G.H), wallV: P.pack(G.V) }, objs: G.objs };
  }
  g.MGERAR = { gerar, mulberry32, TIPOS };
})(globalThis);

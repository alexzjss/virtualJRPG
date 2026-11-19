/* ===== cenários 3D da batalha: Bosque, Pátio do castelo e Praia (CSS 3D, sem imagens) =====
   - Malhas low-poly: cada polígono plano vira UM elemento (o clip-path recorta o contorno). O tom é cel shading:
     luz, meio ou sombra, conforme a normal da face contra o sol da manhã (esquerda, alto, um pouco do lado da câmera).
   - Copas, arbustos e cocos: discos sempre de frente para a câmera, com o brilho do lado do sol (--hx, que a câmera atualiza).
   - Chão, horizonte, sombras e mar: SVG pintado uma vez em poucas camadas grandes (1/4 do tamanho, ampliadas ×4 como o resto do palco).
   - A câmera do palco anda até perto das paredes: TERRENO3D.cam esconde o grupo que ficar entre ela e a luta.
   - A quantidade de peças segue a qualidade do palco (low | medium | high). Tudo nasce de uma semente fixa: todos veem o mesmo cenário. */
(g => {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]), nrm = a => mul(a, 1 / (len(a) || 1));
  const SUN = nrm([-0.68, -0.58, 0.45]); // aponta para o sol (y negativo é para cima no CSS)
  const SHD = [0.834, -0.552], SHK = 1.4; // sombra no chão: direção (x, z) e comprimento por unidade de altura
  const f1 = v => Math.round(v * 10) / 10, f4 = v => Math.round(v * 1e4) / 1e4;
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const svgUrl = (w, h, body, pa = 'none') => `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="${pa}">${body}</svg>`).replace(/'/g, '%27')}')`;
  // chão: 1800×1500 no plano local ↔ x ±3600, z ±3000 no mundo
  const GX = x => f1(x / 4 + 900), GZ = z => f1(z / 4 + 750), GR = r => f1(r / 4);

  // ----- materiais (luz, meio, sombra): saturados, sombra puxada para o azul -----
  const M = {
    tronco: ['#c98a52', '#8f5a34', '#5a3a52'], musgo: ['#b8f070', '#6cc246', '#2f7a5a'], pedra: ['#e4e8f0', '#a9b2c6', '#6a6f9a'],
    muro: ['#fbf1d8', '#e0d1b0', '#a49cc2'], muroTopo: ['#fff8e6', '#ece0c2', '#b8afd0'], telhado: ['#6f9dff', '#3566e0', '#26348f'],
    madeira: ['#e8a868', '#b47440', '#6e4660'], barril: ['#d99a5c', '#a5653a', '#634060'], agua: ['#9ff4ff', '#4fd2f0', '#2a8fd0'],
    casco: ['#ff8a52', '#e8552e', '#99305e'], cascoIn: ['#c88a5a', '#8a5a3a', '#5a3a4a'], palha: ['#f6c36a', '#c98d44', '#7a5a5a'],
    palmTronco: ['#f0bb7a', '#c38750', '#80586a'], fronde: ['#a8ec50', '#52b83a', '#277a52'], vaso: ['#f2b48a', '#c97a58', '#7e4a62'], terra: ['#9a6a44', '#7a5034', '#4a3040'],
  };
  const COPAS = [['#c6f060', '#6cc93e', '#2d8a52'], ['#b2ea5a', '#4fb54a', '#1f7656'], ['#d6f26a', '#86cf3c', '#3c8a4a']];
  const tone = (n, mat, ds) => { let d = dot(n, SUN); if (ds) d = Math.max(d, -d * .8); return d > .36 ? mat[0] : d > -.14 ? mat[1] : mat[2]; };

  // ----- montador: grupos (para sumir na frente da câmera) e primitivas -----
  // Custo: cada elemento é uma camada 3D ordenada a cada quadro, e clip-path/máscara custam caro nessas camadas.
  // Por isso: retângulos e paralelogramos sem recorte; triângulos pintados por degradê (sem clip-path); círculos por border-radius;
  // árvores, coqueiros, torres e pedras são recortes em SVG que giram para a câmera (como os personagens).
  function Builder() {
    const root = [], groups = []; let cur = root;
    // um elemento 100×100 levado ao mundo: canto a, eixos u e v, normal n (a frente do elemento é u × v)
    const emit = (a, u, v, n, bg, extra = '') => {
      const m = [...mul(u, .01), 0, ...mul(v, .01), 0, ...n, 0].map(f4).concat(a.map(f1), 1);
      cur.push(`<i class="tf" style="background:${bg};transform:matrix3d(${m.join(',')})${extra}"></i>`);
    };
    const orient = (u, v, n) => dot(cross(u, v), n) >= 0;
    const B = {
      groups,
      html: () => root.join('') + groups.map((G, i) => `<div class="tg" data-tg="${i}">${G.h.join('')}</div>`).join(''),
      group(c, r, fn) { const G = { c, r, h: [] }, prev = cur; cur = G.h; fn(); cur = prev; if (G.h.length) groups.push(G); },
      // polígono plano. inside: ponto dentro do sólido (a frente olha para fora); face: direção que a frente deve encarar; ds: aparece dos dois lados
      poly(pts, mat, inside, o = {}) {
        if (pts.length < 3) return;
        let n = [0, 0, 0]; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; n = add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]); } // Newell
        if (len(n) < 1e-6) return; n = nrm(n);
        const c = mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);
        if (inside && dot(n, sub(c, inside)) < 0) n = mul(n, -1);
        if (o.up && n[1] > 0) n = mul(n, -1);
        if (o.face && dot(n, o.face) < 0) n = mul(n, -1);
        const rad = pts.reduce((s, p) => s + len(sub(p, c)), 0) / pts.length, k = 1 + (o.grow ?? 1.6) / (rad || 1);
        const P = pts.map(p => add(c, mul(sub(p, c), k))); // cresce um pouco por igual: sem frestas entre faces vizinhas
        const col = o.color || tone(n, mat, o.ds), ex = o.ds ? ';backface-visibility:visible' : '';
        if (P.length === 4 && len(sub(add(P[0], P[2]), add(P[1], P[3]))) < 4) { // paralelogramo: elemento inteiro, sem recorte
          let u = sub(P[1], P[0]), v = sub(P[3], P[0]); if (!orient(u, v, n)) [u, v] = [v, u];
          return emit(P[0], u, v, n, o.bg ? `${o.bg},${col}` : col, ex);
        }
        for (let i = 1; i < P.length - 1; i++) { // leque de triângulos, cada um pintado pela metade do quadrado
          let u = sub(P[i], P[0]), v = sub(P[i + 1], P[0]); if (!orient(u, v, n)) [u, v] = [v, u];
          emit(P[0], u, v, n, `linear-gradient(to bottom right,${col} 49.4%,#0000 50.6%)`, ex);
        }
      },
      // disco (tampa de tora, água): quadrado com border-radius; e1, e2 são os semieixos
      disc(c, e1, e2, n, color) { let u = mul(e1, 2), v = mul(e2, 2); if (!orient(u, v, n)) [u, v] = [v, u]; emit(sub(sub(c, mul(u, .5)), mul(v, .5)), u, v, n, color, ';border-radius:50%'); },
      // tubo reto de raio constante (faces viram retângulos): toras, talos
      tube(p0, p1, r, sides, mat, o = {}) {
        const d = nrm(sub(p1, p0)), ref = Math.abs(d[1]) > .9 ? [1, 0, 0] : [0, -1, 0], e1 = nrm(cross(d, ref)), e2 = cross(d, e1), ang = o.ang || 0;
        const ring = p => Array.from({ length: sides }, (_, k) => { const t = ang + k * 2 * Math.PI / sides; return add(p, add(mul(e1, Math.cos(t) * r), mul(e2, Math.sin(t) * r))); });
        const lo = ring(p0), hi = ring(p1), mid = mul(add(p0, p1), .5);
        for (let k = 0; k < sides; k++) { const q = (k + 1) % sides; B.poly([lo[k], lo[q], hi[q], hi[k]], mat, mid, { bg: o.bg }); }
        const rr = r / Math.cos(Math.PI / sides) * .97;
        if (o.cap1) B.disc(p1, mul(e1, rr), mul(e2, rr), d, o.cap1);
        if (o.cap0) B.disc(p0, mul(e1, rr), mul(e2, rr), mul(d, -1), o.cap0);
      },
      box(x, z, w, d, h, mat, o = {}) { const y0 = -(o.y || 0), a = o.ang || 0, c = Math.cos(a), s = Math.sin(a), P = (u, v, y) => [x + u * c - v * s, y, z + u * s + v * c];
        const b = [P(-w / 2, -d / 2, y0), P(w / 2, -d / 2, y0), P(w / 2, d / 2, y0), P(-w / 2, d / 2, y0)], t = b.map(p => [p[0], y0 - h, p[2]]), mid = [x, y0 - h / 2, z];
        for (let k = 0; k < 4; k++) B.poly([b[k], b[(k + 1) % 4], t[(k + 1) % 4], t[k]], mat, mid, { bg: o.bg });
        B.poly(t, o.top || mat, mid, { bg: o.topBg }); },
      blob(x, y, z, r, pal) { cur.push(`<b class="tb" style="--x:${f1(x)};--y:${f1(y)};--z:${f1(z)};--k:${f4(r / 128)};--a:${pal[0]};--b:${pal[1]};--c:${pal[2]}"></b>`); },
      // recorte em pé que gira para a câmera. k: desenhado a 1/k e ampliado (menos memória); sh: espelha quando o sol troca de lado na tela
      card(x, z, w, h, bg, o = {}) { const k = o.k || 1, W = w / k, H = h / k;
        cur.push(`<s class="tc${o.sh ? ' sh' : ''}" style="left:${f1(-W / 2)}px;top:${f1(-H)}px;width:${f1(W)}px;height:${f1(H)}px;--x:${f1(x)};--y:${f1(-(o.y || 0))};--z:${f1(z)};--ck:${k}${o.flip ? ';--cf:-1' : ''};background-image:${bg}"></s>`); },
      raw: s => cur.push(s),
    };
    return B;
  }

  // ----- espalhar sem sobrepor -----
  const scatter = (R, n, gap, ok, X = [-3250, 3250], Z = [-2750, 2750], prev = []) => { const out = [], all = [...prev];
    for (let tries = 0; out.length < n && tries < n * 60; tries++) { const x = X[0] + R() * (X[1] - X[0]), z = Z[0] + R() * (Z[1] - Z[0]);
      if (!ok(x, z) || all.some(p => Math.hypot(p[0] - x, p[1] - z) < gap)) continue; out.push([x, z]); all.push([x, z]); }
    return out; };
  // a luta: heróis na frente (z ≈ 0), inimigos ao fundo (até z ≈ -2900), x entre ±1100
  const inArena = (x, z, m = 0) => Math.abs(x) < 1150 + m && z > -3050 && z < 650 + m;

  // ----- arte em SVG -----
  const cloudSvg = (cx, cy, s, R, lite = '#ffffff', shade = '#c4d8f5') => { const pf = Array.from({ length: 5 }, (_, i) => [cx + (i - 2) * 26 * s + (R() - .5) * 10 * s, cy - (i === 2 ? 22 : i % 2 ? 14 : 4) * s, (16 + R() * 12 + (i === 2 ? 10 : 0)) * s]);
    const c = (dy, col) => pf.map(([x, y, r]) => `<circle cx="${f1(x)}" cy="${f1(y + dy)}" r="${f1(r)}" fill="${col}"/>`).join('');
    return `<g>${c(7 * s, shade)}<rect x="${f1(cx - 66 * s)}" y="${f1(cy - 4 * s)}" width="${f1(132 * s)}" height="${f1(13 * s)}" rx="${f1(6 * s)}" fill="${shade}"/>${c(0, lite)}<rect x="${f1(cx - 62 * s)}" y="${f1(cy - 10 * s)}" width="${f1(124 * s)}" height="${f1(12 * s)}" rx="${f1(6 * s)}" fill="${lite}"/></g>`; };
  const ridge = (W, base, amp, R, col, step = 24) => { const ph = [R() * 6, R() * 6, R() * 6], fq = [.004 + R() * .003, .011 + R() * .006, .03 + R() * .01]; let d = `M0 650 L0 ${base}`;
    for (let x = 0; x <= W + step; x += step) d += ` L${x} ${f1(base - amp * (.55 * Math.sin(x * fq[0] + ph[0]) + .3 * Math.sin(x * fq[1] + ph[1]) + .15 * Math.sin(x * fq[2] + ph[2]) + .6))}`;
    return `<path d="${d} L${W + step} 650 Z" fill="${col}"/>`; };
  const bumps = (W, base, r0, r1, R, col, from = 0, to = W) => { let s = `<rect x="${from}" y="${base}" width="${to - from}" height="${650 - base}" fill="${col}"/>`;
    for (let x = from - r1 * .3; x < to + r1 * .3; x += r0 * 1.1 + R() * r0) { const r = r0 + R() * (r1 - r0); s += `<circle cx="${f1(x)}" cy="${f1(base + r * .35)}" r="${f1(r)}" fill="${col}"/>`; }
    return s; };
  const skyDefs = `<defs><linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a5fe0"/><stop offset=".36" stop-color="#3994f4"/><stop offset=".62" stop-color="#86ccff"/><stop offset=".77" stop-color="#e2f7ff"/></linearGradient></defs>`;
  // horizonte de cada parede: céu, sol (na esquerda), nuvens paradas e camadas de silhueta que clareiam com a distância
  const FACE = { 'env-back': [1800, lx => [(lx - 900) * 4, -3000]], 'env-left': [1500, lx => [-3600, -(lx - 750) * 4]], 'env-right': [1500, lx => [3600, (lx - 750) * 4]], 'env-front': [1800, lx => [(lx - 900) * 4, 3000]], 'env-ceiling': [1800] };
  function horizonte(tema, face, seed) {
    const R = rng(seed), [W, wc] = FACE[face];
    if (face === 'env-ceiling') { let s = `<defs><radialGradient id="z" cx=".2" cy=".7" r=".9"><stop offset="0" stop-color="#4aa2f6"/><stop offset="1" stop-color="#1a5fe0"/></radialGradient></defs><rect width="1800" height="1500" fill="url(#z)"/>`;
      for (let i = 0; i < 7; i++) s += cloudSvg(150 + R() * 1500, 150 + R() * 1200, 1.6 + R() * 1.4, R, '#ffffffd9', '#cfe2fbcc');
      return svgUrl(1800, 1500, s); }
    let s = skyDefs + `<rect width="${W}" height="650" fill="url(#ceu)"/>`;
    if (face === 'env-left') s += `<circle cx="425" cy="120" r="210" fill="#fff6c8" opacity=".18"/><circle cx="425" cy="120" r="110" fill="#fff6c8" opacity=".35"/><circle cx="425" cy="120" r="46" fill="#fffdf0"/>`;
    for (let i = 0, n = 2 + Math.floor(R() * 2); i < n; i++) s += cloudSvg(120 + R() * (W - 240), 120 + R() * 170, 1 + R() * .9, R);
    if (tema === 'floresta') {
      s += ridge(W, 395, 85, R, '#9ccbf0') + ridge(W, 440, 45, R, '#6fb4a8') + bumps(W, 452, 16, 30, R, '#4ca066') + bumps(W, 474, 22, 40, R, '#348550') + bumps(W, 492, 26, 44, R, '#24693f');
    } else if (tema === 'castelo') {
      s += ridge(W, 385, 110, R, '#a6cdf2') + ridge(W, 450, 40, R, '#7fbfa8') + bumps(W, 478, 14, 26, R, '#5aa86a');
      if (face === 'env-back') { // o castelo ao fundo, acima da muralha do pátio
        const st = '#f3ead6', sd = '#cbc3d6', rf = '#4f7ff0', rs = '#2f4fb8', win = '#3a4a8a';
        const tw = (x, y, w, h, rh) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${st}"/><rect x="${x + w * .62}" y="${y}" width="${w * .38}" height="${h}" fill="${sd}"/><polygon points="${x - w * .12},${y} ${x + w / 2},${y - rh} ${x + w * 1.12},${y}" fill="${rf}"/><polygon points="${x + w / 2},${y - rh} ${x + w * 1.12},${y} ${x + w / 2},${y}" fill="${rs}"/><rect x="${x + w * .4}" y="${y + h * .18}" width="${w * .2}" height="${h * .14}" rx="${w * .1}" fill="${win}"/><path d="M${x + w / 2} ${y - rh} v-26 l22 8 -22 8" fill="#ff3048" stroke="#7a4a3a" stroke-width="2"/>`;
        s += `<rect x="700" y="230" width="400" height="300" fill="${st}"/><rect x="960" y="230" width="140" height="300" fill="${sd}"/>` + [720, 790, 860, 930, 1000, 1070].map(x => `<rect x="${x}" y="212" width="34" height="22" fill="${st}"/>`).join('')
          + tw(612, 170, 92, 360, 120) + tw(1096, 180, 92, 350, 110) + tw(845, 70, 110, 200, 150) + [760, 1010].map(x => `<rect x="${x}" y="300" width="22" height="40" rx="11" fill="${win}"/>`).join('');
      }
    } else { // praia: mar onde o mundo é mar (direita e fundo); terra com morros de mata do outro lado
      const sea = lx => { const [x, z] = wc(lx); return face === 'env-right' || (face === 'env-back' && x > -1500) || (face === 'env-front' && x > 1300); };
      let a = null; const spans = []; for (let lx = 0; lx <= W; lx += 10) { const v = sea(lx); if (v && a == null) a = lx; if ((!v || lx >= W) && a != null) { spans.push([a, v ? W : lx]); a = null; } }
      const land = []; { let p = 0; for (const [x0, x1] of spans) { if (x0 > p) land.push([p, x0]); p = x1; } if (p < W) land.push([p, W]); }
      land.forEach(([x0, x1], i) => { s += `<clipPath id="t${i}"><rect x="${x0}" width="${x1 - x0}" height="650"/></clipPath><g clip-path="url(#t${i})">${ridge(W, 410, 70, R, '#7cc6b0')}</g>`;
        s += bumps(W, 458, 18, 34, R, '#3fa860', x0, x1) + bumps(W, 480, 20, 36, R, '#2c8a52', x0, x1) + `<rect x="${x0}" y="492" width="${x1 - x0}" height="158" fill="#f0d293"/>`; });
      for (const [x0, x1] of spans) { s += `<rect x="${x0}" y="468" width="${x1 - x0}" height="182" fill="#1f84dc"/><rect x="${x0}" y="468" width="${x1 - x0}" height="5" fill="#bfeaff"/><rect x="${x0}" y="520" width="${x1 - x0}" height="130" fill="#1a74d0"/>`;
        for (let i = 0; i < (x1 - x0) / 420; i++) { const ix = x0 + 60 + R() * Math.max(10, x1 - x0 - 120), iw = 40 + R() * 90; s += `<ellipse cx="${f1(ix)}" cy="470" rx="${f1(iw)}" ry="${f1(14 + R() * 16)}" fill="#5aa88a"/><rect x="${f1(ix - iw)}" y="470" width="${f1(iw * 2)}" height="6" fill="#1f84dc"/>`; }
        if (x1 - x0 > 500) { const bx = x0 + 200 + R() * (x1 - x0 - 400); s += `<polygon points="${f1(bx)},466 ${f1(bx + 36)},466 ${f1(bx + 30)},474 ${f1(bx + 6)},474" fill="#8a4a3a"/><polygon points="${f1(bx + 16)},466 ${f1(bx + 16)},428 ${f1(bx + 34)},462" fill="#fff"/>`; } }
    }
    if (tema !== 'praia') s += `<rect y="${tema === 'castelo' ? 492 : 498}" width="${W}" height="160" fill="${tema === 'castelo' ? '#b9d58a' : '#3f9a3a'}"/>`;
    return svgUrl(W, 650, s);
  }

  // ----- chão de cada tema (1 SVG) -----
  const shadowOf = (x, z, h, r, k = 1) => { const ox = x + SHD[0] * h * SHK * .8, oz = z + SHD[1] * h * SHK * .8; return `<ellipse cx="${GX(ox)}" cy="${GZ(oz)}" rx="${GR(r * 1.25 * k)}" ry="${GR(r * .85 * k)}" fill="#1d4a7a" opacity=".28"/>`; };
  const contact = (x, z, r) => `<ellipse cx="${GX(x + 10)}" cy="${GZ(z - 6)}" rx="${GR(r)}" ry="${GR(r * .8)}" fill="#14305a" opacity=".3"/>`;

  // ----- recortes em SVG (luz pintada à esquerda; o palco espelha quando o sol aparece à direita) -----
  const memo = new Map(), once = (k, fn) => memo.get(k) || (memo.set(k, fn()), memo.get(k));
  const trunkSvg = (m = M.tronco) => once('tr' + m, () => svgUrl(40, 200, `<polygon points="9,0 31,0 33,182 40,200 0,200 7,182" fill="${m[1]}"/><polygon points="9,0 16,0 14,200 0,200 7,182" fill="${m[0]}"/><polygon points="25,0 31,0 33,182 40,200 27,200" fill="${m[2]}"/>`));
  const rockSvg = (R, top) => { const L = [3, 66], Ls = [12 + R() * 8, 26 + R() * 10], P = [40 + R() * 20, 3 + R() * 8], Rs = [80 + R() * 10, 20 + R() * 12], Rr = [97, 66], Mb = [54 + R() * 8, 66], C = [50 + R() * 8, 30 + R() * 8], pt = a => a.map(p => p.map(f1).join(',')).join(' ');
    return svgUrl(100, 66, `<polygon points="${pt([L, Ls, P, C, Mb])}" fill="${M.pedra[0]}"/><polygon points="${pt([Mb, C, P, Rs, Rr])}" fill="${M.pedra[2]}"/><polygon points="${pt([P, Rs, C])}" fill="${M.pedra[1]}"/>${top ? `<polygon points="${pt([Ls, P, C])}" fill="${top}"/>` : ''}`); };
  const palmSvg = R => { const T = [185 + R() * 40, 105], B0 = [118, 520], C = [100 + R() * 20, 300], pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8, x = (1 - t) ** 2 * B0[0] + 2 * (1 - t) * t * C[0] + t * t * T[0], y = (1 - t) ** 2 * B0[1] + 2 * (1 - t) * t * C[1] + t * t * T[1]; pts.push([x, y, 15 - 6 * t]); }
    const side = (k, f) => pts.map(([x, y, w], i) => { const q = pts[Math.min(8, i + 1)], p = pts[Math.max(0, i - 1)], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return [x - dy / L * w * k, y + dx / L * w * k]; });
    const poly = (a, b, col) => `<polygon points="${[...a, ...b.slice().reverse()].map(p => p.map(f1).join(',')).join(' ')}" fill="${col}"/>`;
    let s = poly(side(-1), side(1), M.palmTronco[1]) + poly(side(-1), side(-.25), M.palmTronco[0]) + poly(side(.45), side(1), M.palmTronco[2]);
    s += pts.slice(1, 8).map(([x, y, w]) => `<path d="M${f1(x - w)} ${f1(y)} q${f1(w)} 5 ${f1(w * 2)} 0" stroke="#6a4050" stroke-width="2.5" fill="none" opacity=".45"/>`).join('');
    const tips = [[-165, 30], [-150, -45], [-80, -120], [10, -140], [100, -105], [160, -35], [150, 60], [70, 120], [-90, 110]];
    const leaf = ([tx, ty]) => { const c = [T[0] + tx * .5, T[1] + ty * .5 - 42], tip = [T[0] + tx, T[1] + ty + 30], L = Math.hypot(tx, ty), p = [-ty / L, tx / L], w = 30, hang = ty > 20;
      const half = (k, col) => `<path d="M${f1(T[0])} ${f1(T[1])} Q${f1(c[0] + p[0] * w * k)} ${f1(c[1] + p[1] * w * k)} ${f1(tip[0])} ${f1(tip[1])} Q${f1(c[0])} ${f1(c[1])} ${f1(T[0])} ${f1(T[1])}Z" fill="${col}"/>`;
      return half(1, hang ? M.fronde[1] : M.fronde[0]) + half(-1, hang ? M.fronde[2] : M.fronde[1]); };
    s += tips.filter(t => t[1] > 20).map(leaf).join('') + tips.filter(t => t[1] <= 20).map(leaf).join('');
    s += [[-9, 16], [8, 18], [0, 27]].map(([dx, dy]) => `<circle cx="${f1(T[0] + dx)}" cy="${f1(T[1] + dy)}" r="10" fill="#8a5a32"/><circle cx="${f1(T[0] + dx - 3)}" cy="${f1(T[1] + dy - 3)}" r="4" fill="#c08a4a"/>`).join('');
    return svgUrl(300, 520, s); };
  // torre redonda: corpo em três faixas de luz, cinta de mísulas, telhado cônico azul e bandeirola
  const towerSvg = () => once('torre', () => { const [h, m, s] = M.muro, [rh, rm, rs] = M.telhado, band = (y0, y1, x0, x1) => { const w = x1 - x0; return `<rect x="${x0}" y="${y0}" width="${w}" height="${y1 - y0}" fill="${m}"/><rect x="${x0}" y="${y0}" width="${w * .32}" height="${y1 - y0}" fill="${h}"/><rect x="${x0 + w * .74}" y="${y0}" width="${w * .26}" height="${y1 - y0}" fill="${s}"/>`; };
    let t = band(730, 1780, 80, 740) + Array.from({ length: 14 }, (_, i) => `<rect x="80" y="${770 + i * 72}" width="660" height="5" fill="#6a5a8a" opacity=".13"/>`).join('');
    t += band(610, 730, 40, 780) + Array.from({ length: 9 }, (_, i) => `<rect x="${70 + i * 80}" y="730" width="36" height="26" fill="${s}"/>`).join('');
    t += `<polygon points="0,612 410,0 300,612" fill="${rh}"/><polygon points="300,612 410,0 590,612" fill="${rm}"/><polygon points="590,612 410,0 820,612" fill="${rs}"/><rect x="0" y="596" width="820" height="20" fill="${rs}"/>`;
    t += [930, 1290].map(y => `<path d="M370 ${y + 120}V${y + 30}Q370 ${y} 410 ${y}Q450 ${y} 450 ${y + 30}V${y + 120}Z" fill="#33407a"/><path d="M382 ${y + 120}V${y + 34}Q382 ${y + 12} 410 ${y + 12}Q438 ${y + 12} 438 ${y + 34}V${y + 120}Z" fill="#1f2a5a"/>`).join('');
    t += `<rect x="404" y="-1" width="8" height="10" fill="#7a4a3a"/>`;
    return svgUrl(820, 1780, t, 'none'); });
  const flagSvg = svgUrl(60, 30, `<path d="M0 0H60L44 15L60 30H0Z" fill="#ff3048"/>`);
  const fountainSvg = () => once('fonte', () => { const [h, m, s] = M.muro, [ah, am, as] = M.agua;
    return svgUrl(640, 440, `<path d="M20 320V400Q320 450 620 400V320Z" fill="${m}"/><path d="M20 320V400Q90 424 200 432V330Z" fill="${h}"/><path d="M470 330V432Q560 424 620 400V320Z" fill="${s}"/><ellipse cx="320" cy="320" rx="300" ry="52" fill="${h}"/><ellipse cx="320" cy="322" rx="262" ry="40" fill="${am}"/><ellipse cx="300" cy="316" rx="150" ry="18" fill="${ah}" opacity=".7"/>`
      + `<rect x="290" y="130" width="60" height="192" fill="${m}"/><rect x="290" y="130" width="20" height="192" fill="${h}"/><rect x="334" y="130" width="16" height="192" fill="${s}"/><path d="M200 128Q320 190 440 128Z" fill="${s}"/><ellipse cx="320" cy="126" rx="122" ry="24" fill="${h}"/><ellipse cx="320" cy="127" rx="100" ry="16" fill="${am}"/>`
      + `<path d="M320 120Q320 40 300 30Q340 40 330 120Z" fill="${ah}"/><path d="M230 132Q190 200 176 312" stroke="${ah}" stroke-width="10" fill="none" opacity=".85"/><path d="M410 132Q450 200 464 312" stroke="${ah}" stroke-width="10" fill="none" opacity=".85"/><circle cx="318" cy="28" r="14" fill="#ffffff"/>`); });
  const barrelSvg = () => once('barril', () => { const [h, m, s] = M.barril; return svgUrl(160, 180, `<path d="M14 24Q4 90 14 160Q80 186 146 160Q156 90 146 24Z" fill="${m}"/><path d="M14 24Q4 90 14 160Q34 168 52 172Q44 90 52 30Z" fill="${h}"/><path d="M112 30Q120 90 112 172Q130 168 146 160Q156 90 146 24Z" fill="${s}"/><path d="M8 62Q80 76 152 62M8 124Q80 138 152 124" stroke="#4a3a5a" stroke-width="7" fill="none"/><ellipse cx="80" cy="24" rx="66" ry="16" fill="${M.madeira[0]}"/><ellipse cx="80" cy="24" rx="52" ry="10" fill="${M.madeira[1]}"/>`); });
  const crenelSvg = n => once('cr' + n, () => svgUrl(n * 100, 100, Array.from({ length: n }, (_, i) => `<rect x="${i * 100}" y="0" width="56" height="100" fill="${M.muro[1]}"/><rect x="${i * 100}" y="0" width="56" height="14" fill="${M.muroTopo[0]}"/>`).join('')));
  const tuftSvg = (c1, c2) => once('tu' + c1, () => svgUrl(100, 80, `<path d="M8 80 Q14 40 4 14 Q24 40 28 80Z M30 80 Q34 30 50 4 Q44 40 50 80Z" fill="${c2}"/><path d="M44 80 Q60 34 92 18 Q66 46 70 80Z M20 80 Q24 50 34 30 Q32 56 40 80Z" fill="${c1}"/>`));
  const tufts = (B, R, n, ok, c1, c2, prev) => { if (!n) return; const bg = tuftSvg(c1, c2); for (const [x, z] of scatter(R, n, 140, ok, [-2900, 2900], [-3000, 2500], prev)) { const s = .8 + R() * .8; B.card(x, z, 100 * s, 80 * s, bg); } };

  // ----- BOSQUE DENSO -----
  function floresta(B, Q, R, gnd) {
    const nT = [10, 18, 21][Q], nB = [5, 10, 13][Q], nR = [2, 4, 5][Q], nTuft = [0, 14, 22][Q];
    const okT = (x, z) => !inArena(x, z, 260) && !(Math.abs(x) < 1500 && z < -2500) && !(Math.abs(x + 430) < 700 && z > 600 && z < 1700); // longe do caminho da câmera de ombro
    const trees = scatter(R, nT, 520, okT, [-3250, 3250], [-2750, 2750]);
    // trilha de terra que atravessa o bosque por baixo da luta
    let path = ''; for (let z = 3000; z >= -3000; z -= 150) { const x = Math.sin(z / 900) * 260 + Math.sin(z / 370) * 60; path += `<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(470 + Math.sin(z / 500) * 90)}" ry="${GR(220)}" fill="#d9ae6a"/>`; }
    gnd.push(`<rect width="1800" height="1500" fill="#5fbd3c"/>`);
    for (let i = 0; i < 26; i++) gnd.push(`<ellipse cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" rx="${f1(40 + R() * 90)}" ry="${f1(25 + R() * 50)}" fill="${R() < .5 ? '#7fd24a' : '#4ea838'}"/>`);
    gnd.push(path.replace(/#d9ae6a/g, '#b98c52').replace(/rx="([\d.]+)"/g, (m, v) => `rx="${f1(+v + 8)}"`), path);
    for (let i = 0; i < 18; i++) { const x = (R() - .5) * 900, z = -3000 + R() * 6000; gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${f1(6 + R() * 10)}" ry="${f1(4 + R() * 6)}" fill="#c49352"/>`); }
    const flowers = ['#fff6a0', '#ffffff', '#ff9ec8', '#ffd24a'];
    for (let i = 0; i < 70; i++) { const x = (R() - .5) * 7000, z = (R() - .5) * 5800; if (Math.abs(x) < 700) continue; gnd.push(`<circle cx="${GX(x)}" cy="${GZ(z)}" r="${f1(2.5 + R() * 2)}" fill="${flowers[i % 4]}"/>`); }
    const shadows = [];
    for (const [x, z] of trees) {
      const s = .8 + R() * .55, h = (560 + R() * 240) * s, pal = COPAS[Math.floor(R() * 3)], top = -h - 40 * s, n = Q === 0 ? 3 : 4;
      B.group([x, -h * .7, z], 330 * s, () => {
        B.card(x, z, 90 * s, h + 40 * s, trunkSvg(), { sh: true });
        B.blob(x, top, z, 235 * s, pal);
        for (let k = 0; k < n; k++) { const a = k * 2 * Math.PI / n + R() * .6, d = 175 * s; B.blob(x + Math.cos(a) * d, top + (70 + R() * 70) * s, z + Math.sin(a) * d * .9, (150 + R() * 50) * s, pal); }
      });
      shadows.push(shadowOf(x, z, h, 300 * s), contact(x, z, 90 * s));
    }
    gnd.push(...shadows);
    // arbustos na borda da luta, pedras com musgo, toras e cogumelos
    const okB = (x, z) => !inArena(x, z, 40) && inArena(x, z, 1200);
    for (const [x, z] of scatter(R, nB, 280, okB, [-2600, 2600], [-3000, 1900], trees)) { const s = .7 + R() * .6, pal = COPAS[Math.floor(R() * 3)];
      B.group([x, -80, z], 200 * s, () => { B.blob(x, -95 * s, z, 120 * s, pal); B.blob(x + 90 * s, -70 * s, z + 30 * s, 90 * s, pal); if (Q) B.blob(x - 80 * s, -65 * s, z - 20 * s, 85 * s, pal); });
      gnd.push(contact(x, z, 160 * s)); }
    for (const [x, z] of scatter(R, nR, 400, okB, [-2800, 2800], [-3000, 2200], trees)) { const r = 110 + R() * 90; B.group([x, -r * .5, z], r * 1.2, () => B.card(x, z, r * 2.2, r * 1.45, rockSvg(R, M.musgo[0]), { sh: true })); gnd.push(shadowOf(x, z, r * .4, r * 1.1), contact(x, z, r)); }
    for (let i = 0, n = [1, 2, 3][Q]; i < n; i++) { const [x, z] = scatter(R, 1, 600, okB, [-2600, 2600], [-2900, 2000], trees)[0] || [-1700, 300], a = R() * Math.PI, L = 260 + R() * 160, dx = Math.cos(a) * L / 2, dz = Math.sin(a) * L / 2;
      B.group([x, -40, z], L / 2 + 60, () => B.tube([x - dx, -44, z - dz], [x + dx, -44, z + dz], 44, Q ? 6 : 5, M.tronco, { cap0: '#e9c07c', cap1: '#f3d39a' })); gnd.push(contact(x, z, L * .55)); }
    if (Q === 2) for (const [x, z] of scatter(R, 6, 160, okB, [-2400, 2400], [-3000, 1500], trees)) { const s = .7 + R() * .5; B.group([x, -40, z], 60, () => { B.tube([x, 0, z], [x, -38 * s, z], 10 * s, 4, ['#ffffff', '#efe6d8', '#a7a0c0']); B.blob(x, -44 * s, z, 30 * s, ['#ff8a8a', '#ff3b4e', '#a3204e']); }); }
    tufts(B, R, nTuft, okB, '#8fe04a', '#4aa83a', trees);
  }

  // ----- PÁTIO ENTRE MURALHAS -----
  function castelo(B, Q, R, gnd) {
    const X0 = 2950, ZB = -2900, ZF = 2450, H = 640, T = 150;
    const cours = `repeating-linear-gradient(0deg,#0000 0 10.5px,#6a5a8a22 10.5px 12.5px)`;
    // chão: lajes, grama junto aos muros, mosaico azul e dourado sob a luta, sombras compridas dos muros
    gnd.push(`<defs><pattern id="laje" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#eadfc4"/><rect x="1" y="1" width="28" height="13" rx="2" fill="#f3e9d0"/><rect x="1" y="16" width="13" height="13" rx="2" fill="#e2d4b4"/><rect x="16" y="16" width="13" height="13" rx="2" fill="#efe3c8"/></pattern></defs>`,
      `<rect width="1800" height="1500" fill="#8fd25a"/><rect x="${GX(-X0 + 260)}" y="${GZ(ZB + 230)}" width="${f1((2 * X0 - 520) / 4)}" height="${f1((ZF - ZB - 460) / 4)}" rx="18" fill="url(#laje)"/>`);
    for (let i = 0; i < 40; i++) { const side = Math.floor(R() * 4), t = R(); const [x, z] = side === 0 ? [-X0 + 200, ZB + t * (ZF - ZB)] : side === 1 ? [X0 - 200, ZB + t * (ZF - ZB)] : side === 2 ? [-X0 + t * 2 * X0, ZB + 200] : [-X0 + t * 2 * X0, ZF - 200]; gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${f1(14 + R() * 30)}" ry="${f1(10 + R() * 20)}" fill="#8fd25a"/>`); }
    const cx = GX(0), cz = GZ(-1300);
    gnd.push(`<circle cx="${cx}" cy="${cz}" r="300" fill="none" stroke="#3d6fe0" stroke-width="16"/><circle cx="${cx}" cy="${cz}" r="278" fill="none" stroke="#f2c24a" stroke-width="5"/><circle cx="${cx}" cy="${cz}" r="120" fill="none" stroke="#f2c24a" stroke-width="5"/><circle cx="${cx}" cy="${cz}" r="100" fill="#3d6fe022"/>`
      + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${f1(cx + Math.cos(a) * 120)}" y1="${f1(cz + Math.sin(a) * 120)}" x2="${f1(cx + Math.cos(a) * 278)}" y2="${f1(cz + Math.sin(a) * 278)}" stroke="#3d6fe0" stroke-width="5"/>`; }).join(''));
    const L = H * SHK; // sombras: muro esquerdo cai sobre o pátio (para +x); muro da frente cai para -z
    gnd.push(`<polygon points="${GX(-X0)},${GZ(ZB)} ${GX(-X0 + L * SHD[0])},${GZ(ZB + L * SHD[1])} ${GX(-X0 + L * SHD[0])},${GZ(ZF + L * SHD[1])} ${GX(-X0)},${GZ(ZF)}" fill="#2a3f8a" opacity=".22"/>`,
      `<polygon points="${GX(-X0)},${GZ(ZF)} ${GX(X0)},${GZ(ZF)} ${GX(X0 + L * SHD[0])},${GZ(ZF + L * SHD[1])} ${GX(-X0 + L * SHD[0])},${GZ(ZF + L * SHD[1])}" fill="#2a3f8a" opacity=".22"/>`);
    // muralhas em trechos (cada trecho some sozinho quando a câmera fica atrás dele): face de dentro, passadiço e uma faixa de ameias
    const wall = (a, b, out) => {
      const segs = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1400));
      for (let i = 0; i < segs; i++) { const p = [a[0] + (b[0] - a[0]) * i / segs, a[1] + (b[1] - a[1]) * i / segs], q = [a[0] + (b[0] - a[0]) * (i + 1) / segs, a[1] + (b[1] - a[1]) * (i + 1) / segs];
        const po = [p[0] + out[0] * T, p[1] + out[1] * T], qo = [q[0] + out[0] * T, q[1] + out[1] * T], inside = [(p[0] + q[0]) / 2 + out[0] * T / 2, -H / 2, (p[1] + q[1]) / 2 + out[1] * T / 2], segL = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const pm = [p[0] + out[0] * T * .5, p[1] + out[1] * T * .5], qm = [q[0] + out[0] * T * .5, q[1] + out[1] * T * .5];
        B.group([inside[0], -H / 2, inside[2]], Math.max(segL / 2, H / 2) + 60, () => {
          B.poly([[p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], -H, q[1]], [p[0], -H, p[1]]], M.muro, inside, { bg: cours });
          B.poly([[p[0], -H, p[1]], [q[0], -H, q[1]], [qo[0], -H, qo[1]], [po[0], -H, po[1]]], M.muroTopo, [inside[0], 0, inside[2]]);
          B.poly([[pm[0], -H, pm[1]], [qm[0], -H, qm[1]], [qm[0], -H - 95, qm[1]], [pm[0], -H - 95, pm[1]]], M.muro, null, { ds: true, face: [-out[0], 0, -out[1]], color: '#0000', bg: crenelSvg(Math.max(3, Math.round(segL / 160))) });
        });
      }
    };
    wall([-X0, ZB], [X0, ZB], [0, -1]); wall([-X0, ZF], [X0, ZF], [0, 1]); wall([-X0, ZB], [-X0, ZF], [-1, 0]); wall([X0, ZB], [X0, ZF], [1, 0]);
    // portão no muro do fundo, estandartes vermelhos
    const gate = svgUrl(100, 100, `<path d="M0 100V40Q0 0 50 0Q100 0 100 40V100Z" fill="#8a8ab0"/><path d="M8 100V42Q8 9 50 9Q92 9 92 42V100Z" fill="#7a4a34"/>` + [24, 42, 58, 76].map(x => `<rect x="${x - 2}" y="12" width="4" height="88" fill="#5a3426"/>`).join('') + `<rect x="8" y="46" width="84" height="5" fill="#4a4a6a"/><rect x="8" y="74" width="84" height="5" fill="#4a4a6a"/><circle cx="62" cy="62" r="3" fill="#f2c24a"/>`);
    B.group([0, -260, ZB + 10], 340, () => B.poly([[-270, 0, ZB + 4], [270, 0, ZB + 4], [270, -520, ZB + 4], [-270, -520, ZB + 4]], M.muro, null, { face: [0, 0, 1], color: '#0000', bg: gate }));
    const banner = svgUrl(60, 140, `<path d="M0 0H60V140L30 116L0 140Z" fill="#c8102e"/><path d="M0 0H60V10H0Z" fill="#f2c24a"/><path d="M5 10H55V128L30 108L5 128Z" fill="none" stroke="#f2c24a" stroke-width="3"/><circle cx="30" cy="50" r="13" fill="#f2c24a"/><path d="M30 28L34 42L48 42L37 50L41 64L30 56L19 64L23 50L12 42L26 42Z" fill="#c8102e"/>`);
    const bannerAt = (x, z, nx, nz) => { const w = 150, h = 360, px = -nz, pz = nx, o = 4, y0 = -H + 30; B.group([x, -H + 200, z], 220, () => B.poly([[x - px * w / 2 + nx * o, y0, z - pz * w / 2 + nz * o], [x + px * w / 2 + nx * o, y0, z + pz * w / 2 + nz * o], [x + px * w / 2 + nx * o, y0 + h, z + pz * w / 2 + nz * o], [x - px * w / 2 + nx * o, y0 + h, z - pz * w / 2 + nz * o]], M.muro, null, { face: [nx, 0, nz], color: '#0000', bg: banner })); };
    for (const x of [-620, 620, ...(Q ? [-1800, 1800] : [])]) bannerAt(x, ZB, 0, 1);
    if (Q) for (const z of [-1800, 400]) { bannerAt(-X0, z, 1, 0); bannerAt(X0, z, -1, 0); }
    // torres redondas (recorte: o cilindro é igual de qualquer ângulo) com bandeirola no topo
    const tower = (x, z, r) => { const w = r * 2.48, h = w * 1780 / 820; B.group([x, -h / 2, z], Math.max(r, h / 2) + 60, () => { B.card(x, z, w, h, towerSvg(), { k: 2, sh: true }); B.card(x + 60, z, 120, 60, flagSvg, { y: h + 50 }); }); return h; };
    const TR = 330;
    for (const [x, z] of [[-X0 + TR + 8, ZB + TR + 8], [X0 - TR - 8, ZB + TR + 8], [-X0 + TR + 8, ZF - TR - 8], [X0 - TR - 8, ZF - TR - 8]]) { const h = tower(x, z, TR); gnd.push(shadowOf(x, z, h * .55, TR * 1.6, 1.3)); }
    if (Q) for (const s of [-1, 1]) { const x = s * (X0 - 250 - 8), z = -700, h = tower(x, z, 250); gnd.push(shadowOf(x, z, h * .55, 380, 1.2)); }
    // chafariz (lado esquerdo, no sol), vasos com árvores redondas, caixotes e barris junto aos muros
    { const x = -2000, z = -650; B.group([x, -200, z], 360, () => B.card(x, z, 640, 440, fountainSvg(), { k: 2, sh: true, y: -30 })); gnd.push(shadowOf(x, z, 140, 300), contact(x, z, 315)); }
    const planter = (x, z) => B.group([x, -300, z], 260, () => { B.box(x, z, 200, 200, 120, M.vaso, { top: M.terra }); B.card(x, z, 40, 300, trunkSvg(), { sh: true, y: 110 }); const pal = COPAS[Math.floor(R() * 3)]; B.blob(x, -400, z, 150, pal); B.blob(x - 90, -330, z + 30, 100, pal); B.blob(x + 90, -340, z - 20, 105, pal); });
    if (Q) for (const [x, z] of [[-2620, 1400], [2620, 1400], [-2620, -1900], [2620, -1900]]) { planter(x, z); gnd.push(shadowOf(x, z, 380, 200)); }
    const props = [[2300, -2550], [2050, -2600], [-2350, 1950], [2400, 1500], [-1650, -2550], [2600, 300], [-2600, 250], [1500, 2150], [-1300, 2150], [2250, -1200]].slice(0, [3, 7, 10][Q]);
    props.forEach(([x, z], i) => { const a = R() * .6 - .3; B.group([x, -80, z], 180, () => {
      if (i % 2) B.card(x, z, 160, 180, barrelSvg(), { sh: true });
      else { B.box(x, z, 160, 160, 150, M.madeira, { ang: a, bg: 'linear-gradient(45deg,#0000 47%,#6e466099 47% 53%,#0000 53%)', topBg: 'repeating-linear-gradient(90deg,#0000 0 30px,#6e466055 30px 33px)' }); if (Q === 2) B.box(x + 30, z - 20, 110, 110, 100, M.madeira, { ang: a + .5, y: 150 }); }
    }); gnd.push(contact(x, z, 120)); });
    tufts(B, R, [0, 12, 26][Q], (x, z) => (Math.abs(x) > X0 - 300 || z < ZB + 300 || z > ZF - 300) && Math.abs(x) < X0 - 40 && z > ZB + 40 && z < ZF - 40, '#a6ea5a', '#5ab840', []);
  }

  // ----- PRAIA ABERTA COM MAR -----
  const shore = z => 1350 + 140 * Math.sin(z / 650 + 1) - (z < -1800 ? ((-1800 - z) / 1200) ** 2 * 420 : 0);
  function praia(B, Q, R, gnd, extra) {
    const line = dx => { const p = []; for (let z = -3000; z <= 3000; z += 100) p.push([GX(shore(z) + dx), GZ(z)]); return p; };
    const pts = p => p.map(q => q.join(',')).join(' ');
    gnd.push(`<rect width="1800" height="1500" fill="#f8dfa2"/>`);
    for (let i = 0; i < 14; i++) { const x = -3400 + R() * 3600, z = -3000 + R() * 6000; gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${f1(80 + R() * 140)}" ry="${f1(40 + R() * 70)}" fill="${R() < .5 ? '#fff0c6' : '#ecc985'}"/>`); }
    const seaShape = (dx, col) => { const p = line(dx); return `<polygon points="${pts(p)} 1800,${p.at(-1)[1]} 1800,${p[0][1]}" fill="${col}"/>`; };
    gnd.push(seaShape(-220, '#e4bd78'), seaShape(-120, '#d9b06c'), seaShape(0, '#5ae6d8'), seaShape(240, '#2cc0ea'), seaShape(900, '#1f8fe0'), seaShape(1700, '#1a76d2'));
    // conchas e estrelas-do-mar pintadas
    for (let i = 0; i < 26; i++) { const z = -2900 + R() * 5800, x = shore(z) - 200 - R() * 2600; if (inArena(x, z, -200) && R() < .7) continue; const c = ['#ff8a6a', '#ffb0c8', '#fff4dc', '#ffa64a'][i % 4];
      gnd.push(i % 3 ? `<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="4" ry="3" fill="${c}"/>` : `<path d="M${GX(x)} ${f1(GZ(z) - 7)} l2 5 6 1 -5 3 2 6 -5 -4 -5 4 2 -6 -5 -3 6 -1z" fill="${c}"/>`); }
    // espuma e brilho do mar: planos próprios, animados só pelo compositor
    const x0 = 700, w = 3600 - x0, gx = v => f1(v / 4 - x0 / 4), foam = dx => { let d = ''; for (let z = -3000; z <= 3000; z += 100) d += `${d ? 'L' : 'M'}${gx(shore(z) + dx)} ${GZ(z)} `; return d; };
    const plane = (cls, body) => extra.push(`<div class="twa ${cls}" style="left:${f1(x0 / 4 - 900)}px;width:${f1(w / 4)}px;transform-origin:${f1(900 - x0 / 4)}px 750px;background-image:${svgUrl(w / 4, 1500, body)}"></div>`);
    plane('tw1', `<path d="${foam(8)}" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round"/><path d="${foam(70)}" fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="40 26" opacity=".85"/>`);
    if (Q) { plane('tw2', `<path d="${foam(150)}" fill="none" stroke="#e9fbff" stroke-width="5" stroke-dasharray="70 40" opacity=".8"/>`);
      let sp = ''; for (let i = 0; i < 70; i++) { const z = -2900 + R() * 5800, x = shore(z) + 200 + R() * 2400; sp += `<path d="M${gx(x)} ${f1(GZ(z) - 5)} l2 5 5 0 -5 2 -2 5 -2 -5 -5 -2 5 0z" fill="#ffffff"/>`; }
      plane('tw3', sp); }
    // coqueiros (recortes): na areia da esquerda, na frente e um inclinado sobre o mar
    const spots = [[-2300, -2300], [-2850, -1150], [-2150, -150], [-2950, 650], [-2350, 1700], [-900, 2350], [700, 2600], [1050, 1950], [-1750, 2500], [-3050, -2500]].slice(0, [5, 8, 10][Q]);
    const palms = [palmSvg(R), palmSvg(R), palmSvg(R)];
    spots.forEach(([x, z], i) => { const k = 1.9 + R() * .5, w = 300 * k, h = 520 * k;
      B.group([x, -h * .55, z], h * .55, () => B.card(x, z, w, h, palms[i % 3], { k: 2, sh: true }));
      gnd.push(shadowOf(x + 120, z, h * .9, 220), contact(x, z, 70)); });
    // rochedos no mar (com espuma em volta) e na ponta do fundo
    const rocks = [[2150, -2200, 260], [2650, -1450, 180], [2950, -2650, 330], [-2650, -2700, 230], [2400, 900, 150], [3100, 300, 240]].slice(0, [3, 5, 6][Q]);
    for (const [x, z, r] of rocks) { const sea = x > shore(z); B.group([x, -r * .5, z], r * 1.2, () => B.card(x, z, r * 2.2, r * 1.45, rockSvg(R, sea ? '#e9fbff' : null), { sh: true, y: sea ? -r * .12 : 0 }));
      gnd.push(sea ? `<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(r * 1.3)}" ry="${GR(r * 1.05)}" fill="#e9fbff" opacity=".9"/><ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(r * 1.05)}" ry="${GR(r * .85)}" fill="#46d8e0"/>` : shadowOf(x, z, r * .4, r * 1.1) + contact(x, z, r)); }
    // barco encalhado na beira d'água
    { const bx = 1500, bz = 650, a = .55, c = Math.cos(a), s = Math.sin(a), L = 560, W = 180, Hh = 120, P = (u, y, v) => [bx + u * c - v * s, y, bz + u * s + v * c];
      B.group([bx, -60, bz], 360, () => {
        for (const v of [1, -1]) B.poly([P(-L / 2, -Hh, v * W), P(L / 2, -Hh * 1.2, 0), P(L / 2 * .9, -10, 0), P(-L / 2 * .9, -10, v * W * .5)], M.casco, P(0, -60, 0));
        B.poly([P(-L / 2, -Hh, W), P(-L / 2, -Hh, -W), P(-L / 2 * .9, -10, -W * .5), P(-L / 2 * .9, -10, W * .5)], M.casco, P(0, -60, 0));
        B.poly([P(-L / 2 + 14, -Hh * .7, W * .85), P(L / 2 - 50, -Hh * .9, 0), P(-L / 2 + 14, -Hh * .7, -W * .85)], M.cascoIn, null, { up: true });
        const sb = P(-60, 0, 0); B.box(sb[0], sb[2], 40, W * 1.6, 16, M.madeira, { ang: a + Math.PI / 2, y: Hh * .8 });
      }); gnd.push(contact(bx, bz, 330)); }
    // tora trazida pelo mar e capim nas dunas
    if (Q) B.group([-1700, -40, -1500], 260, () => B.tube([-1900, -34, -1600], [-1500, -34, -1420], 34, 6, ['#efe2c8', '#c9b494', '#8a7a8a'], { cap0: '#f6ead2', cap1: '#f6ead2' }));
    tufts(B, R, [0, 14, 28][Q], (x, z) => x < -1600 && !inArena(x, z, 200), '#b6e85a', '#6cbc44', spots);
  }

  // ----- nuvens que andam, partículas e gaivotas -----
  // Poucas: cada camada animada obriga o navegador a reordenar todo o palco 3D a cada quadro.
  const cloudCard = R => svgUrl(300, 130, cloudSvg(150, 92, 2, R, '#ffffff', '#bcd3f5'));
  function ceuVivo(B, Q, R, tema) {
    for (let i = 0, n = [0, 3, 4][Q]; i < n; i++) { const a = (i / n) * 2 * Math.PI + R() * .6, r = 2700, x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r * .95, k = 2.6 + R() * 1.6, ry = Math.atan2(-x, -z) * 180 / Math.PI;
      B.raw(`<s class="tcl" style="background-image:${cloudCard(R)};transform:translate3d(${f1(x)}px,${f1(-1450 - R() * 350)}px,${f1(z)}px) rotateY(${f1(ry + 180)}deg) scale(${f1(k)});animation-duration:${f1(70 + R() * 60)}s;animation-delay:-${f1(R() * 60)}s"></s>`); }
    const kinds = { floresta: [['folha', [0, 8, 9][Q]], ['luz', [0, 6, 7][Q]]], castelo: [['poeira', [0, 10, 12][Q]], ['folha', [0, 3, 4][Q]]], praia: [['brilho', [0, 8, 10][Q]]] }[tema] || [];
    for (const [kind, n] of kinds) for (let i = 0; i < n; i++) {
      const x = (R() - .5) * 4400, z = -3000 + R() * 4600, y = kind === 'folha' ? -900 - R() * 400 : kind === 'brilho' ? -30 - R() * 80 : -120 - R() * 520;
      const bx = kind === 'brilho' ? shore(z) + (R() - .3) * 300 : x, hue = kind === 'folha' ? ['#9be04a', '#e8d84a', '#6cc846'][i % 3] : '';
      B.raw(`<i class="tpa tp-${kind}" style="transform:translate3d(${f1(bx)}px,${f1(y)}px,${f1(z)}px) rotateY(calc(var(--bry,0deg) * -1)) rotateX(calc(var(--brx,0deg) * -1));animation-duration:${f1(kind === 'folha' ? 9 + R() * 7 : 3 + R() * 4)}s;animation-delay:-${f1(R() * 12)}s${hue ? ';background:' + hue : ''}"></i>`);
    }
    const gulls = tema === 'praia' ? [0, 2, 3][Q] : tema === 'castelo' ? [0, 1, 2][Q] : 0, gsv = svgUrl(40, 16, `<path d="M0 6Q10 0 20 10Q30 0 40 6Q30 4 20 14Q10 4 0 6Z" fill="#ffffff" stroke="#3a4a6a" stroke-width="1.2"/>`);
    for (let i = 0; i < gulls; i++) { const cx = tema === 'praia' ? 1800 + R() * 900 : (R() - .5) * 2000, cz = -1200 - R() * 1400;
      B.raw(`<i class="tgu" style="--gx:${f1(cx)}px;--gy:${f1(-1100 - R() * 400)}px;--gz:${f1(cz)}px;animation-duration:${f1(18 + R() * 10)}s;animation-delay:-${f1(R() * 20)}s"><b style="background-image:${gsv};translate:${f1(500 + R() * 400)}px 0"></b></i>`); }
  }

  // ----- montar -----
  let live = []; // grupos do cenário atual: { el, c, r }
  function montar(parent, tema, q = 'medium') {
    const Q = q === 'low' ? 0 : q === 'high' ? 2 : 1, R = rng({ floresta: 11, castelo: 23, praia: 37 }[tema] || 5), B = Builder(), gnd = [], extra = [];
    if (tema === 'floresta') floresta(B, Q, R, gnd); else if (tema === 'castelo') castelo(B, Q, R, gnd); else if (tema === 'praia') praia(B, Q, R, gnd, extra); else return;
    ceuVivo(B, Q, rng(99), tema);
    const terr = document.createElement('div'); terr.className = 'terr t-' + tema;
    terr.innerHTML = `<div class="tgnd" style="background-image:${svgUrl(1800, 1500, gnd.join(''))}"></div>${extra.join('')}` + B.html();
    parent.appendChild(terr);
    for (const el of parent.querySelectorAll(':scope > .envface')) { const f = Object.keys(FACE).find(k => el.classList.contains(k)); if (f) { el.style.backgroundImage = horizonte(tema, f, f.length * 7 + tema.length); el.style.backgroundSize = '100% 100%'; } }
    ceil = parent.querySelector(':scope > .env-ceiling');
    live = B.groups.map((G, i) => ({ el: terr.querySelector(`[data-tg="${i}"]`), c: G.c, r: G.r }));
    if (lastCam) cam(...lastCam);
  }
  // câmera → olho no mundo (inverso de translate3d(tx,ty,tz) rotateX(rx) rotateY(ry), perspectiva de 1000 px nascendo 22% acima da origem)
  const unrot = (p, rx, ry) => { const a = -rx * Math.PI / 180, b = -ry * Math.PI / 180; const y = p[1] * Math.cos(a) - p[2] * Math.sin(a), z1 = p[1] * Math.sin(a) + p[2] * Math.cos(a); return [p[0] * Math.cos(b) + z1 * Math.sin(b), y, -p[0] * Math.sin(b) + z1 * Math.cos(b)]; };
  let lastCam = null, ceil = null;
  let prevEye = null, camT = 0;
  const segDist = (p, a, b) => { const ab = sub(b, a), L2 = dot(ab, ab) || 1, k = Math.max(0, Math.min(1, dot(sub(p, a), ab) / L2)); return len(sub(p, add(a, mul(ab, k)))); };
  function cam(v, h = 860) {
    lastCam = [v, h]; if (!live.length) return;
    const rx = v.rx || 0, ry = v.ry || 0, eye = unrot([-v.tx, -h * .22 - (v.ty || 0), 1000 - v.tz], rx, ry), fw = unrot([0, 0, -1], rx, ry);
    let t = fw[1] > .05 ? (-150 - eye[1]) / fw[1] : 2200; t = Math.min(4200, Math.max(700, t)); const T = add(eye, mul(fw, t)), seg = sub(T, eye), sl = dot(seg, seg);
    if (ceil?.isConnected) ceil.style.visibility = eye[1] < -1900 && (!prevEye || prevEye[1] < -1900) ? 'hidden' : ''; // vista aérea: a câmera passa do teto do céu
    // no quadro final: some o que está perto da câmera ou na frente dela (até 1700 px) a menos de um raio da linha de visão
    const blocks = G => { const ce = sub(G.c, eye), k = Math.max(0, Math.min(1, dot(ce, seg) / sl)), d = len(sub(ce, mul(seg, k))), ahead = k * Math.sqrt(sl); return len(ce) < G.r + 300 || (ahead > 0 && ahead < 1700 && d < G.r + 70); };
    const set = hide => { for (const G of live) { const h1 = hide(G); if (G.hide !== h1) { G.hide = h1; G.el?.classList.toggle('tfade', h1); } } };
    // durante a viagem (~1,1 s) também some o que fica no caminho entre a posição antiga e a nova
    const from = prevEye; prevEye = eye; clearTimeout(camT);
    if (from && len(sub(from, eye)) > 50) { set(G => blocks(G) || segDist(G.c, from, eye) < G.r + 260); camT = setTimeout(() => { set(blocks); if (ceil?.isConnected) ceil.style.visibility = eye[1] < -1900 ? 'hidden' : ''; }, 1250); }
    else set(blocks);
  }

  // brilho das copas: do lado em que o sol aparece para a câmera
  const hx = ry => { const r = ry * Math.PI / 180; return f1(50 + 30 * (SUN[0] * Math.cos(r) + SUN[2] * Math.sin(r))) + '%'; };
  // miniaturas do seletor do mestre (mesmas cores do 3D)
  function thumbs() {
    if (typeof document === 'undefined' || document.getElementById('terr-thumbs')) return;
    const sky = `<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a5fe0"/><stop offset=".7" stop-color="#9fd8ff"/></linearGradient></defs><rect width="64" height="36" fill="url(#c)"/><circle cx="10" cy="8" r="4" fill="#fffdf0"/>`;
    const art = {
      floresta: `<path d="M0 22Q16 14 32 20T64 18V36H0Z" fill="#9ccbf0"/><rect y="27" width="64" height="9" fill="#5fbd3c"/><path d="M26 36L30 28H36L40 36Z" fill="#d9ae6a"/>` + [[6, 22, 8], [17, 18, 9], [48, 19, 9], [58, 23, 7], [3, 29, 5], [61, 29, 5]].map(([x, y, r]) => `<rect x="${x - 1.5}" y="${y}" width="3" height="${30 - y}" fill="#8f5a34"/><circle cx="${x}" cy="${y}" r="${r}" fill="#4fb54a"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .55}" fill="#b2ea5a"/>`).join(''),
      castelo: `<rect y="27" width="64" height="9" fill="#eadfc4"/><rect x="0" y="17" width="64" height="11" fill="#e0d1b0"/>` + [4, 12, 20, 28, 36, 44, 52, 60].map(x => `<rect x="${x - 2}" y="14" width="4" height="3" fill="#e0d1b0"/>`).join('') + [[8, 9], [56, 9], [32, 4]].map(([x, y]) => `<rect x="${x - 4}" y="${y + 4}" width="8" height="${24 - y}" fill="#fbf1d8"/><path d="M${x - 5} ${y + 4}L${x} ${y - 4}L${x + 5} ${y + 4}Z" fill="#3566e0"/>`).join('') + `<path d="M28 28V22Q32 18 36 22V28Z" fill="#7a4a34"/><rect x="18" y="18" width="4" height="7" fill="#c8102e"/><rect x="42" y="18" width="4" height="7" fill="#c8102e"/>`,
      praia: `<rect y="20" width="64" height="16" fill="#1f84dc"/><path d="M0 36V26Q20 24 34 30T64 33V36Z" fill="#f8dfa2"/><path d="M30 29Q40 31 64 31" stroke="#fff" stroke-width="1.2" fill="none"/><path d="M10 30Q12 20 16 12" stroke="#c38750" stroke-width="2" fill="none"/><path d="M16 12l-8 3M16 12l8 2M16 12l-5 -5M16 12l6 -4M16 12l1 8" stroke="#52b83a" stroke-width="2.4" stroke-linecap="round"/>`,
    };
    const st = document.createElement('style'); st.id = 'terr-thumbs';
    st.textContent = Object.entries(art).map(([k, a]) => `.bbthumb.bb-${k}-dia{background:${svgUrl(64, 36, sky + a, 'xMidYMid slice')} center/cover}.bbthumb.bb-${k}-dia .bbfx,.bbthumb.bb-${k}-dia::before{display:none}`).join('');
    document.head.appendChild(st);
  }
  if (typeof document !== 'undefined') { if (document.head) thumbs(); else addEventListener('DOMContentLoaded', thumbs); }
  const sd = ry => { const r = ry * Math.PI / 180; return SUN[0] * Math.cos(r) + SUN[2] * Math.sin(r) > 0 ? -1 : 1; }; // recortes: espelha quando o sol fica à direita na tela
  g.TERRENO3D = { montar, cam, hx, sd, shore };
  g.montarTerreno3D = montar;
})(globalThis);

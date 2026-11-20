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
  // recorte com contorno de silhueta: dilata o alfa e pinta de INK por trás (rasterizado uma vez, sem custo por quadro)
  const olSvg = (w, h, body, r = Math.max(1.2, w / 90), pa = 'none') => !CEL ? svgUrl(w, h, body, pa) : svgUrl(w, h, `<defs><filter id="ol" x="-4%" y="-4%" width="108%" height="108%"><feMorphology in="SourceAlpha" operator="dilate" radius="${f1(r)}" result="d"/><feFlood flood-color="${INK}"/><feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#ol)">${body}</g>`, pa);
  function svgUrl(w, h, body, pa = 'none') { return `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="${pa}">${body}</svg>`).replace(/'/g, '%27')}')`; }
  // ----- horário: toda cor gerada passa por grade() ao montar (custo zero na luta). "!#hex" marca cor que não grada (céu, lava, cristal) -----
  const HORAS = ['dia', 'tarde', 'noite'];
  let CEL = false; // estilo cel shading (padrão ao montar; "simples" volta ao antigo)
  const INK = '#1c3038'; // contorno: azul-petróleo escuro, não preto
  const mixHex = (a, b, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const horaDe = id => { const p = String(id || '').split('-'); return p.length === 2 && HORAS.includes(p[1]) ? p[1] : 'dia'; };
  function grade(hex, hora) {
    const ds = CEL ? .9 : 1; // cel: tira 10% da saturação (menos berrante), em qualquer horário
    if (hora !== 'tarde' && hora !== 'noite' && ds === 1) return hex;
    const v = hex.replace(/^#/, ''), short = v.length <= 4, s = short ? [...v.slice(0, 3)].map(ch => ch + ch).join('') : v.slice(0, 6);
    let c = [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
    const gray = () => .2126 * c[0] + .7152 * c[1] + .0722 * c[2], l = gray();
    const mix = (t, k) => { c = c.map((x, i) => x + (t[i] - x) * k); }, sat = k => { const y = gray(); c = c.map(x => y + (x - y) * k); };
    sat(ds);
    if (hora === 'tarde') { mix([1, .6, .29], .24 * l + .06); mix([.54, .23, .48], .2 * (1 - l)); sat(1.1); } // luz dourada, sombra puxando para o magenta
    else if (hora === 'noite') { sat(.7); mix([.16, .23, .54], .35); c = c.map(x => x * .42 + .04); } // noite azulada, com piso de luminância
    c = c.map(x => Math.max(0, Math.min(1, x)));
    return '#' + (short ? c.map(x => Math.round(x * 15).toString(16)).join('') + v.slice(3) : c.map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('') + v.slice(6));
  }
  // também dentro dos SVG já codificados (%23 = #, %21 = !)
  const HEX = /(!|%21)?(#|%23)([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z])/g;
  const gradeAll = (str, hora) => str.replace(HEX, (m, keep, h, v) => h + (keep ? v : grade('#' + v, hora).slice(1)));
  const SKY = { dia: ['#1a5fe0', '#3994f4', '#86ccff', '#e2f7ff'], tarde: ['#3a2a7a', '#c0508a', '#ff9a5a', '#ffd89a'], noite: ['#060a26', '#121e4a', '#24366e', '#3a4a80'] };
  const SKYT = { vulcao: { dia: ['#4a1a3a', '#9a3a4a', '#e8704a', '#ffb070'], tarde: ['#2a0a2a', '#7a1a3a', '#d84a3a', '#ff9a50'], noite: ['#0e0614', '#2a0a1e', '#5a1a28', '#8a2a20'] } }; // céu próprio do tema
  const CEILT = { vulcao: { dia: ['#9a3a4a', '#4a1a3a'], tarde: ['#7a1a3a', '#2a0a2a'], noite: ['#2a0a1e', '#0e0614'] } };
  const CEIL = { dia: ['#4aa2f6', '#1a5fe0'], tarde: ['#8a4a9a', '#3a2a7a'], noite: ['#16224e', '#060a26'] };
  const FREST = { dia: '#2a7be8', tarde: '#9a4a8a', noite: '#0e1840' }; // fundo atrás das frestas entre céu e paredes
  const stars = (W, H, n, R) => Array.from({ length: n }, () => `<circle cx="${f1(R() * W)}" cy="${f1(R() * H)}" r="${f1(.8 + R() * 1.8)}" fill="!#ffffff" opacity="${f1(.4 + R() * .6)}"/>`).join('');
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
        const col = o.color || tone(n, mat, o.ds), ex = (o.ds ? ';backface-visibility:visible' : '') + (CEL && !o.color ? `;box-shadow:inset 0 0 0 2px ${INK}` : '');
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
      blob(x, y, z, r, pal, o = {}) { if (CEL && !o.round) return B.card(x, z, r * 2.5, r * 2.33, blobSvg(pal, Math.abs(Math.round((x + z) / 97)) % 3), { sh: true, y: -(y + r * 1.083) });
        cur.push(`<b class="tb" style="--x:${f1(x)};--y:${f1(y)};--z:${f1(z)};--k:${f4(r / 128)};--a:${pal[0]};--b:${pal[1]};--c:${pal[2]}"></b>`); },
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
    return `<path d="${d} L${W + step} 650 Z" fill="${col}"/>` + (CEL ? `<rect y="${f1(base - amp * .5)}" width="${W + step}" height="${f1(amp * .5 + 50)}" fill="url(#hz)"/>` : ''); }; // cel: névoa de distância na base
  const bumps = (W, base, r0, r1, R, col, from = 0, to = W) => { const C = []; for (let x = from - r1 * .3; x < to + r1 * .3; x += r0 * 1.1 + R() * r0) C.push([x, r0 + R() * (r1 - r0)]);
    const draw = (k, c) => `<rect x="${from}" y="${base}" width="${to - from}" height="${650 - base}" fill="${c}"/>` + C.map(([x, r]) => `<circle cx="${f1(x)}" cy="${f1(base + r * .35)}" r="${f1(r + k)}" fill="${c}"/>`).join('');
    return (CEL ? draw(3, mixHex(col, INK, .55)) : '') + draw(0, col); }; // cel: contorno escuro na silhueta
  const skyDefs = (hora, tema) => { const k = (SKYT[tema] || SKY)[hora] || SKY.dia; return `<defs><linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="!${k[0]}"/><stop offset=".36" stop-color="!${k[1]}"/><stop offset=".62" stop-color="!${k[2]}"/><stop offset=".77" stop-color="!${k[3]}"/></linearGradient></defs>`; };
  // sol da manhã, sol baixo da tarde ou lua: sempre no mesmo lado (a luz do cenário não muda de direção)
  const astro = hora => hora === 'tarde' ? `<circle cx="425" cy="300" r="240" fill="!#ffb060" opacity=".22"/><circle cx="425" cy="300" r="130" fill="!#ffc070" opacity=".35"/><circle cx="425" cy="300" r="70" fill="!#ffe0a0"/>`
    : hora === 'noite' ? `<circle cx="425" cy="140" r="180" fill="!#c8d6ff" opacity=".1"/><circle cx="425" cy="140" r="52" fill="!#eef2ff"/><circle cx="410" cy="128" r="9" fill="!#d6deff"/><circle cx="440" cy="156" r="6" fill="!#d6deff"/>`
    : `<circle cx="425" cy="120" r="210" fill="#fff6c8" opacity=".18"/><circle cx="425" cy="120" r="110" fill="#fff6c8" opacity=".35"/><circle cx="425" cy="120" r="46" fill="#fffdf0"/>`;
  // horizonte de cada parede: céu, sol (na esquerda), nuvens paradas e camadas de silhueta que clareiam com a distância
  const FACE = { 'env-back': [1800, lx => [(lx - 900) * 4, -3000]], 'env-left': [1500, lx => [-3600, -(lx - 750) * 4]], 'env-right': [1500, lx => [3600, (lx - 750) * 4]], 'env-front': [1800, lx => [(lx - 900) * 4, 3000]], 'env-ceiling': [1800] };
  function horizonte(tema, face, seed, hora = 'dia') {
    const R = rng(seed), [W, wc] = FACE[face], night = hora === 'noite', smoke = tema === 'vulcao';
    if (tema === 'caverna') return cavHz(face, R, hora);
    if (face === 'env-ceiling') { const k = (CEILT[tema] || CEIL)[hora] || CEIL.dia; let s = `<defs><radialGradient id="z" cx=".2" cy=".7" r=".9"><stop offset="0" stop-color="!${k[0]}"/><stop offset="1" stop-color="!${k[1]}"/></radialGradient></defs><rect width="1800" height="1500" fill="url(#z)"/>` + (night ? stars(1800, 1500, 60, R) : '');
      for (let i = 0; i < 7; i++) s += CEL ? celCloud(150 + R() * 1500, 150 + R() * 1200, 1.4 + R() * 1.2, R, smoke ? '#6a5a6a' : '#ffffff', smoke ? '#4a3c4a' : '#cfdcf5', smoke ? '#2a2030' : '#8aa2d0') : cloudSvg(150 + R() * 1500, 150 + R() * 1200, 1.6 + R() * 1.4, R, smoke ? '#6a5a6ad9' : '#ffffffd9', smoke ? '#4a3c4acc' : '#cfe2fbcc');
      return svgUrl(1800, 1500, s); }
    let s = skyDefs(hora, tema) + `<rect width="${W}" height="650" fill="url(#ceu)"/>` + (night ? stars(W, 380, 40, R) : '');
    if (face === 'env-left') s += astro(hora);
    if (CEL) s += `<defs><linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf6ff" stop-opacity="0"/><stop offset="1" stop-color="#eaf6ff" stop-opacity=".6"/></linearGradient></defs>`;
    if (CEL && face === 'env-left' && !night) s += [[-.15, 34], [.1, 22], [.35, 30], [.62, 18]].map(([a, w]) => { const L = 900, x = 425 + Math.cos(.55 + a) * L, y = 120 + Math.sin(.55 + a) * L; return `<polygon points="425,120 ${f1(x - w)},${f1(y + w)} ${f1(x + w)},${f1(y - w)}" fill="#fff6c8" opacity=".13"/>`; }).join('');
    if (CEL) for (let i = 0, n = 2 + Math.floor(R() * 2); i < n; i++) s += smoke ? celCloud(160 + R() * (W - 320), 150 + R() * 130, 1.1 + R() * .9, R, '#7a6470', '#4a3c4a', '#2a2030') : celCloud(160 + R() * (W - 320), 150 + R() * 130, 1.1 + R() * .9, R);
    else for (let i = 0, n = 2 + Math.floor(R() * 2); i < n; i++) s += smoke ? cloudSvg(120 + R() * (W - 240), 120 + R() * 170, 1 + R() * .9, R, '#7a6470', '#4a3c4a') : cloudSvg(120 + R() * (W - 240), 120 + R() * 170, 1 + R() * .9, R);
    if (tema === 'neve') {
      s += ridge(W, 330, 170, R, '#f4f8ff', 16) + ridge(W, 345, 140, R, '#d8e0f8', 16) + ridge(W, 420, 80, R, '#b8c6ec') + ridge(W, 460, 36, R, '#9fb0e0') + bumps(W, 470, 12, 24, R, '#2f6a5a') + bumps(W, 488, 16, 30, R, '#24564a');
    } else if (tema === 'deserto') {
      s += ridge(W, 400, 60, R, '#eab4a4') + ridge(W, 450, 34, R, '#f2c27a') + ridge(W, 482, 18, R, '#f6cf86');
      if (face === 'env-back') s += pg([[1050, 470], [1210, 280], [1370, 470]], '#e0a868') + pg([[1210, 280], [1370, 470], [1260, 470]], '#b8805a') + pg([[560, 476], [640, 380], [720, 476]], '#e6b47a');
    } else if (tema === 'ruinas') {
      s += ridge(W, 395, 80, R, '#a6cdf2') + ridge(W, 445, 40, R, '#7fbfa8');
      for (let i = 0, n = 3 + Math.floor(R() * 3); i < n; i++) { const x = 100 + R() * (W - 200), h = 40 + R() * 90; s += `<rect x="${f1(x)}" y="${f1(470 - h)}" width="16" height="${f1(h)}" fill="#b8c8d8"/><rect x="${f1(x - 4)}" y="${f1(470 - h)}" width="24" height="6" fill="#c8d6e2"/>`; }
      s += bumps(W, 466, 16, 30, R, '#4ca066') + bumps(W, 486, 22, 38, R, '#348550');
    } else if (tema === 'pantano') {
      s += ridge(W, 420, 50, R, '#8ab0a0') + bumps(W, 452, 18, 34, R, '#4a6a4a');
      for (let i = 0; i < 5; i++) { const x = f1(80 + R() * (W - 160)); s += `<path d="M${x} 470V${f1(390 - R() * 40)}l-24 -30M${x} 420l20 -24" stroke="#3a4a3a" stroke-width="7" fill="none"/>`; }
      s += bumps(W, 478, 22, 40, R, '#3a5a3a') + `<rect y="440" width="${W}" height="60" fill="#e8f4e0" opacity=".28"/>`;
    } else if (tema === 'vulcao') {
      s += ridge(W, 420, 70, R, '#5a3a4a') + ridge(W, 470, 34, R, '#3a2a3a');
      if (face === 'env-back') s += pg([[560, 500], [830, 160], [970, 160], [1240, 500]], '#2a1e2a') + pg([[900, 160], [970, 160], [1240, 500], [1000, 500]], '#1a121e') + `<ellipse cx="900" cy="162" rx="70" ry="14" fill="!#ff7a2a"/><ellipse cx="900" cy="150" rx="150" ry="60" fill="!#ff5a1a" opacity=".22"/><path d="M880 166q-30 120 -110 330M920 166q20 140 80 330" stroke="!#ff5a1a" stroke-width="10" fill="none"/><path d="M880 166q-30 120 -110 330" stroke="!#ffc040" stroke-width="3" fill="none"/>` + cloudSvg(900, 110, 1.8, R, '#6a5a6a', '#4a3c4a');
    } else if (tema === 'campo') {
      s += ridge(W, 410, 60, R, '#b8e0a0') + ridge(W, 450, 36, R, '#9ad070');
      if (face === 'env-back') s += `<polygon points="1290,470 1302,360 1330,360 1342,470" fill="#f0e0c8"/><polygon points="1320,360 1330,360 1342,470 1326,470" fill="#cbb8a8"/><polygon points="1294,362 1316,336 1338,362" fill="#c85a3a"/><g transform="translate(1316 352)" stroke="#8a6a5a" stroke-width="3">${[20, 110, 200, 290].map(a => `<rect x="-6" y="-70" width="12" height="62" fill="#fff8ec" transform="rotate(${a})"/>`).join('')}</g>`;
      s += bumps(W, 470, 18, 32, R, '#7ac850') + bumps(W, 490, 24, 40, R, '#68b844');
    } else if (tema === 'floresta' && CEL) {
      s += ridge(W, 380, 95, R, '#a9c8ea') + haze(380, 60, W) + ridge(W, 430, 50, R, '#7aa8b0') + haze(430, 40, W) + bumpsO(W, 450, 16, 30, R, '#4c8a5c', '#2f5a4a') + bumpsO(W, 472, 22, 40, R, '#3a7650', '#1f4438') + bumpsO(W, 490, 26, 44, R, '#2c6044', INK);
    } else if (tema === 'floresta') {
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
    const gl = { floresta: [498, '#3f9a3a'], castelo: [492, '#b9d58a'], neve: [496, '#e2ecff'], deserto: [494, '#f6cf86'], ruinas: [496, '#6ab848'], pantano: [496, '#5a7a34'], vulcao: [494, '#3a2e3a'], campo: [498, '#7ac850'] }[tema];
    if (gl) s += `<rect y="${gl[0]}" width="${W}" height="160" fill="${gl[1]}"/>`;
    return svgUrl(W, 650, s);
  }

  // caverna: paredes de rocha com estalactites e cristais; no fundo, a boca de luz mostra o céu do horário
  function cavHz(face, R, hora) {
    if (face === 'env-ceiling') { let s = `<rect width="1800" height="1500" fill="#1e1834"/>`;
      for (let i = 0; i < 40; i++) s += `<circle cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" r="${f1(20 + R() * 60)}" fill="${R() < .5 ? '#2a2244' : '#161028'}"/>`;
      for (let i = 0; i < 26; i++) s += `<circle cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" r="${f1(3 + R() * 4)}" fill="!${CRIST[i % 3][0]}" opacity=".85"/>`;
      return svgUrl(1800, 1500, s); }
    const W = FACE[face][0], k = SKY[hora] || SKY.dia;
    let s = `<defs><linearGradient id="rk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#161028"/><stop offset=".6" stop-color="#2a2244"/><stop offset="1" stop-color="#3a3058"/></linearGradient><linearGradient id="bo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="!${k[1]}"/><stop offset="1" stop-color="!${k[3]}"/></linearGradient></defs><rect width="${W}" height="650" fill="url(#rk)"/>`;
    if (face === 'env-back') s += `<polygon points="760,140 1040,140 1300,650 500,650" fill="!${k[3]}" opacity=".12"/><ellipse cx="900" cy="330" rx="230" ry="190" fill="url(#bo)"/>`;
    s += ridge(W, 520, 50, R, '#4a3e64') + ridge(W, 560, 30, R, '#5a4c74');
    for (let x = 0; x < W; x += 40 + R() * 60) { const w = 30 + R() * 50, h = 50 + R() * 190, c = R() < .5 ? '#2a2244' : '#3a3058'; s += pg([[x, 0], [x + w, 0], [x + w * .5, h]], c) + pg([[x, 0], [x + w * .22, 0], [x + w * .5, h]], '#4a3e64'); }
    for (let i = 0; i < 6; i++) { const x = 60 + R() * (W - 120), y = 540 + R() * 40, c = CRIST[i % 3]; s += pg([[x - 10, y], [x - 4, y - 40 - R() * 30], [x + 6, y]], '!' + c[0]) + pg([[x + 2, y], [x + 12, y - 30 - R() * 20], [x + 18, y]], '!' + c[1]) + `<ellipse cx="${f1(x + 4)}" cy="${f1(y)}" rx="34" ry="8" fill="!${c[1]}" opacity=".3"/>`; }
    return svgUrl(W, 650, s);
  }

  // ----- chão de cada tema (1 SVG) -----
  const shadowOf = (x, z, h, r, k = 1) => { const ox = x + SHD[0] * h * SHK * .8, oz = z + SHD[1] * h * SHK * .8; return `<ellipse cx="${GX(ox)}" cy="${GZ(oz)}" rx="${GR(r * 1.25 * k)}" ry="${GR(r * .85 * k)}" fill="${CEL ? '#2a3a78' : '#1d4a7a'}" opacity="${CEL ? .36 : .28}"/>`; };
  const contact = (x, z, r) => `<ellipse cx="${GX(x + 10)}" cy="${GZ(z - 6)}" rx="${GR(r)}" ry="${GR(r * .8)}" fill="#14305a" opacity=".3"/>`;

  // ----- recortes em SVG (luz pintada à esquerda; o palco espelha quando o sol aparece à direita) -----
  const memo = new Map(), once = (k, fn) => { k += CEL ? '|c' : ''; return memo.get(k) || (memo.set(k, fn()), memo.get(k)); };
  const trunkSvg = (m = M.tronco) => once('tr' + m, () => olSvg(40, 200, `<polygon points="9,0 31,0 33,182 40,200 0,200 7,182" fill="${m[1]}"/><polygon points="9,0 16,0 14,200 0,200 7,182" fill="${m[0]}"/><polygon points="25,0 31,0 33,182 40,200 27,200" fill="${m[2]}"/>`));
  const rockSvg = (R, top) => { const L = [3, 66], Ls = [12 + R() * 8, 26 + R() * 10], P = [40 + R() * 20, 3 + R() * 8], Rs = [80 + R() * 10, 20 + R() * 12], Rr = [97, 66], Mb = [54 + R() * 8, 66], C = [50 + R() * 8, 30 + R() * 8], pt = a => a.map(p => p.map(f1).join(',')).join(' ');
    const m = M.pedra; return olSvg(100, 66, `<polygon points="${pt([L, Ls, P, C, Mb])}" fill="${m[0]}"/><polygon points="${pt([Mb, C, P, Rs, Rr])}" fill="${m[2]}"/><polygon points="${pt([P, Rs, C])}" fill="${m[1]}"/>${top ? `<polygon points="${pt([Ls, P, C])}" fill="${top}"/>` : ''}`, 1.6); };
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
    return olSvg(300, 520, s, 3.4); };
  // torre redonda: corpo em três faixas de luz, cinta de mísulas, telhado cônico azul e bandeirola
  const towerSvg = () => once('torre', () => { const [h, m, s] = M.muro, [rh, rm, rs] = M.telhado, band = (y0, y1, x0, x1) => { const w = x1 - x0; return `<rect x="${x0}" y="${y0}" width="${w}" height="${y1 - y0}" fill="${m}"/><rect x="${x0}" y="${y0}" width="${w * .32}" height="${y1 - y0}" fill="${h}"/><rect x="${x0 + w * .74}" y="${y0}" width="${w * .26}" height="${y1 - y0}" fill="${s}"/>`; };
    let t = band(730, 1780, 80, 740) + Array.from({ length: 14 }, (_, i) => `<rect x="80" y="${770 + i * 72}" width="660" height="5" fill="#6a5a8a" opacity=".13"/>`).join('');
    t += band(610, 730, 40, 780) + Array.from({ length: 9 }, (_, i) => `<rect x="${70 + i * 80}" y="730" width="36" height="26" fill="${s}"/>`).join('');
    t += `<polygon points="0,612 410,0 300,612" fill="${rh}"/><polygon points="300,612 410,0 590,612" fill="${rm}"/><polygon points="590,612 410,0 820,612" fill="${rs}"/><rect x="0" y="596" width="820" height="20" fill="${rs}"/>`;
    t += [930, 1290].map(y => `<path d="M370 ${y + 120}V${y + 30}Q370 ${y} 410 ${y}Q450 ${y} 450 ${y + 30}V${y + 120}Z" fill="#33407a"/><path d="M382 ${y + 120}V${y + 34}Q382 ${y + 12} 410 ${y + 12}Q438 ${y + 12} 438 ${y + 34}V${y + 120}Z" fill="#1f2a5a"/>`).join('');
    t += `<rect x="404" y="-1" width="8" height="10" fill="#7a4a3a"/>`;
    return olSvg(820, 1780, t, 9); });
  const flagSvg = svgUrl(60, 30, `<path d="M0 0H60L44 15L60 30H0Z" fill="#ff3048"/>`);
  const fountainSvg = () => once('fonte', () => { const [h, m, s] = M.muro, [ah, am, as] = M.agua;
    return olSvg(640, 440, `<path d="M20 320V400Q320 450 620 400V320Z" fill="${m}"/><path d="M20 320V400Q90 424 200 432V330Z" fill="${h}"/><path d="M470 330V432Q560 424 620 400V320Z" fill="${s}"/><ellipse cx="320" cy="320" rx="300" ry="52" fill="${h}"/><ellipse cx="320" cy="322" rx="262" ry="40" fill="${am}"/><ellipse cx="300" cy="316" rx="150" ry="18" fill="${ah}" opacity=".7"/>`
      + `<rect x="290" y="130" width="60" height="192" fill="${m}"/><rect x="290" y="130" width="20" height="192" fill="${h}"/><rect x="334" y="130" width="16" height="192" fill="${s}"/><path d="M200 128Q320 190 440 128Z" fill="${s}"/><ellipse cx="320" cy="126" rx="122" ry="24" fill="${h}"/><ellipse cx="320" cy="127" rx="100" ry="16" fill="${am}"/>`
      + `<path d="M320 120Q320 40 300 30Q340 40 330 120Z" fill="${ah}"/><path d="M230 132Q190 200 176 312" stroke="${ah}" stroke-width="10" fill="none" opacity=".85"/><path d="M410 132Q450 200 464 312" stroke="${ah}" stroke-width="10" fill="none" opacity=".85"/><circle cx="318" cy="28" r="14" fill="#ffffff"/>`); });
  const barrelSvg = () => once('barril', () => { const [h, m, s] = M.barril; return olSvg(160, 180, `<path d="M14 24Q4 90 14 160Q80 186 146 160Q156 90 146 24Z" fill="${m}"/><path d="M14 24Q4 90 14 160Q34 168 52 172Q44 90 52 30Z" fill="${h}"/><path d="M112 30Q120 90 112 172Q130 168 146 160Q156 90 146 24Z" fill="${s}"/><path d="M8 62Q80 76 152 62M8 124Q80 138 152 124" stroke="#4a3a5a" stroke-width="7" fill="none"/><ellipse cx="80" cy="24" rx="66" ry="16" fill="${M.madeira[0]}"/><ellipse cx="80" cy="24" rx="52" ry="10" fill="${M.madeira[1]}"/>`); });
  const crenelSvg = n => once('cr' + n, () => svgUrl(n * 100, 100, Array.from({ length: n }, (_, i) => `<rect x="${i * 100}" y="0" width="56" height="100" fill="${M.muro[1]}"/><rect x="${i * 100}" y="0" width="56" height="14" fill="${M.muroTopo[0]}"/>`).join('')));
  const tuftSvg = (c1, c2) => once('tu' + c1, () => olSvg(100, 80, `<path d="M8 80 Q14 40 4 14 Q24 40 28 80Z M30 80 Q34 30 50 4 Q44 40 50 80Z" fill="${c2}"/><path d="M44 80 Q60 34 92 18 Q66 46 70 80Z M20 80 Q24 50 34 30 Q32 56 40 80Z" fill="${c1}"/>`));
  const tufts = (B, R, n, ok, c1, c2, prev) => { if (!n) return; const bg = tuftSvg(c1, c2); for (const [x, z] of scatter(R, n, 140, ok, [-2900, 2900], [-3000, 2500], prev)) { const s = .8 + R() * .8; B.card(x, z, 100 * s, 80 * s, bg); } };

  // ===== estilo cel (DEMO atrás da chave vj_terr_estilo=cel; só o Bosque): contorno, 2 tons duros e rim light pintados na arte =====
  const COPAS_CEL = [{ lt: '#8fcc4e', sh: '#2f6a4c', rim: '#c8f08a', ac: '#3e7e4e' }, { lt: '#7cbf54', sh: '#2a5f50', rim: '#bfeea0', ac: '#36704e' }, { lt: '#a2cf52', sh: '#3a7046', rim: '#dcf28e', ac: '#4a8048' }];
  // contorno de folhagem: lóbulos que terminam em ponta (sem bolinha perfeita)
  const crownD = (cx, cy, r, R, n, sq = .86) => { const a0 = R() * 6.283, P = [];
    for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283, ro = r * (.92 + R() * .14), ri = r * (.74 + R() * .08), a2 = a + Math.PI / n;
      P.push([cx + Math.cos(a) * ro, cy + Math.sin(a) * ro * sq], [cx + Math.cos(a2) * ri, cy + Math.sin(a2) * ri * sq]); }
    const out = (q, k) => [cx + (q[0] - cx) * k, cy + (q[1] - cy) * k];
    let d = `M${P.at(-1).map(f1).join(' ')}`;
    for (let i = 0; i < P.length; i += 2) { const v0 = P[(i - 1 + P.length) % P.length], t = P[i], v1 = P[i + 1];
      const c1 = out([(v0[0] + t[0]) / 2, (v0[1] + t[1]) / 2], 1.2), c2 = out([(t[0] + v1[0]) / 2, (t[1] + v1[1]) / 2], 1.1);
      d += `Q${c1.map(f1).join(' ')} ${t.map(f1).join(' ')}Q${c2.map(f1).join(' ')} ${v1.map(f1).join(' ')}`; }
    return d + 'Z'; };
  let celId = 0;
  // um tufo de copa em cel: base na sombra, faixa de rim light do lado oposto ao sol, área de luz com corte seco do lado do sol, contorno por fora
  const crownCel = (cx, cy, r, R, pal, n = 8) => { const d = crownD(cx, cy, r, R, n), id = 'q' + (celId++).toString(36), k = r * .5;
    let s = `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${pal.sh}" stroke="${INK}" stroke-width="${f1(Math.max(5, r * .055))}" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id})"><path d="${d}" fill="${pal.rim}"/><path d="${d}" fill="${pal.sh}" transform="translate(-${f1(r * .07)} -${f1(r * .03)})"/><path d="${crownD(cx - k * .8, cy - k, r * .95, R, n)}" fill="${pal.lt}"/>`;
    for (let i = 0; i < 2; i++) { const a = .3 + R() * 1.2, dd = r * (.5 + R() * .2); s += `<path d="${crownD(cx + Math.cos(a) * dd * .7, cy + Math.sin(a) * dd * .5, r * (.22 + R() * .08), R, 6)}" fill="${pal.lt}"/>`; } // tufos de luz que escapam para a sombra
    s += `<path d="${crownD(cx - r * .2, cy + r * .05, r * .2, R, 6)}" fill="${pal.ac}"/>`; // um bolsão de sombra dentro da luz
    return s + '</g>'; };
  // árvore inteira num recorte só (tronco + 3 a 4 tufos): pesa menos que tronco + 5 bolas
  const celTreeSvg = (R, pal) => { celId = 0; const W = 400, H = 640, [tl, ts] = ['#b9845a', '#6a4a52'];
    let s = `<path d="M178 640C186 520 182 420 196 300L214 300C218 420 214 520 226 640Z" fill="${ts}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M178 640C186 520 182 420 196 300L203 300C196 420 198 520 196 640Z" fill="${tl}"/>`;
    s += `<path d="M200 420Q150 380 120 330M206 380Q250 350 286 318" stroke="${INK}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M200 420Q150 380 120 330M206 380Q250 350 286 318" stroke="${ts}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    for (const [x, y, r] of [[200, 175, 150], [118, 290, 108], [292, 278, 112], [205, 315, 118]]) s += crownCel(x + (R() - .5) * 20, y + (R() - .5) * 16, r * (.92 + R() * .16), R, pal);
    return svgUrl(W, H, s); };
  // tufo de copa no lugar de cada bolinha (paleta antiga luz/meio/sombra → luz, sombra, rim e acento)
  const blobSvg = (pal, v) => once('bl' + pal.join() + v, () => { celId = 80; const R = rng(v * 7 + 3); return svgUrl(300, 280, crownCel(150, 150, 120, R, { lt: mixHex(pal[0], pal[1], .55), sh: mixHex(pal[2], INK, .12), rim: pal[0], ac: mixHex(pal[1], pal[2], .5) }, 8)); });
  const celBushSvg = (R, pal) => { celId = 50; let s = ''; for (const [x, y, r] of [[150, 120, 92], [80, 150, 66], [222, 152, 70]]) s += crownCel(x, y, r * (.9 + R() * .2), R, pal, 9); return svgUrl(300, 220, s); };
  // feixe de luz (só no high): trapézio inclinado em degradê, sem contorno
  const beamSvg = once('feixe', () => svgUrl(160, 640, `<defs><linearGradient id="fx" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8" stop-opacity=".55"/><stop offset=".7" stop-color="#fff6c8" stop-opacity=".18"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient></defs><polygon points="62,0 98,0 160,640 40,640" fill="url(#fx)"/>`));
  // nuvem de cúmulo em cel: contorno suave, base na sombra e topo iluminado com corte seco
  const celCloud = (cx, cy, s, R, lite = '#ffffff', shade = '#bccbec', ol = '#7f97c8') => { const pf = [];
    for (let i = 0; i < 7; i++) { const t = (i - 3) / 3; pf.push([cx + t * 92 * s + (R() - .5) * 14 * s, cy - (1 - t * t) * 46 * s - R() * 14 * s, (24 + (1 - Math.abs(t)) * 26 + R() * 10) * s]); }
    const c = (dx, dy, k, col) => pf.map(([x, y, r]) => `<circle cx="${f1(x + dx)}" cy="${f1(y + dy)}" r="${f1(r * k)}" fill="${col}"/>`).join('') + `<rect x="${f1(cx - 104 * s + dx)}" y="${f1(cy - 14 * s + dy)}" width="${f1(208 * s)}" height="${f1(22 * s * k)}" rx="${f1(10 * s)}" fill="${col}"/>`;
    return c(0, 0, 1.06, ol) + c(0, 0, 1, shade) + c(-5 * s, -9 * s, .9, lite); };
  const bumpsO = (W, base, r0, r1, R, col, ol) => { const C = []; for (let x = -r1 * .3; x < W + r1 * .3; x += r0 * 1.1 + R() * r0) C.push([x, r0 + R() * (r1 - r0)]);
    const draw = (k, col) => `<rect x="0" y="${base}" width="${W}" height="${650 - base}" fill="${col}"/>` + C.map(([x, r]) => `<circle cx="${f1(x)}" cy="${f1(base + r * .35)}" r="${f1(r + k)}" fill="${col}"/>`).join('');
    return draw(3, ol) + draw(0, col); };
  const haze = (base, h, W) => `<rect y="${f1(base - h)}" width="${W}" height="${f1(h + 40)}" fill="url(#hz)"/>`;

  const beams = (B, Q, spots) => { if (CEL && Q === 2) for (const [x, z] of spots) B.group([x, -900, z], 700, () => B.card(x, z, 520, 2100, beamSvg, { k: 4, y: -40 })); };

  // ----- BOSQUE DENSO -----
  function floresta(B, Q, R, gnd) {
    const nT = [10, 18, 21][Q], nB = [5, 10, 13][Q], nR = [2, 4, 5][Q], nTuft = [0, 14, 22][Q];
    const okT = (x, z) => !inArena(x, z, 260) && !(Math.abs(x) < 1500 && z < -2500) && !(Math.abs(x + 430) < 700 && z > 600 && z < 1700); // longe do caminho da câmera de ombro
    const trees = scatter(R, nT, 520, okT, [-3250, 3250], [-2750, 2750]);
    // trilha de terra que atravessa o bosque por baixo da luta
    let path = ''; for (let z = 3000; z >= -3000; z -= 150) { const x = Math.sin(z / 900) * 260 + Math.sin(z / 370) * 60; path += `<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(470 + Math.sin(z / 500) * 90)}" ry="${GR(220)}" fill="#d9ae6a"/>`; }
    gnd.push(CEL ? `<defs><pattern id="gr" width="24" height="18" patternUnits="userSpaceOnUse"><path d="M3 15l2 -6 2 6M14 8l2 -6 2 6" stroke="#3a7a3e" stroke-width="1.2" fill="none" opacity=".55"/></pattern></defs><rect width="1800" height="1500" fill="#5aa84a"/>` : `<rect width="1800" height="1500" fill="#5fbd3c"/>`);
    for (let i = 0; i < 26; i++) gnd.push(`<ellipse cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" rx="${f1(40 + R() * 90)}" ry="${f1(25 + R() * 50)}" fill="${CEL ? (R() < .5 ? '#6cb650' : '#4c9644') : R() < .5 ? '#7fd24a' : '#4ea838'}"/>`);
    if (CEL) gnd.push(`<rect width="1800" height="1500" fill="url(#gr)"/>`);
    gnd.push(path.replace(/#d9ae6a/g, CEL ? '#7a5a3e' : '#b98c52').replace(/rx="([\d.]+)"/g, (m, v) => `rx="${f1(+v + (CEL ? 5 : 8))}"`), CEL ? path.replace(/#d9ae6a/g, '#cfa46a') : path);
    for (let i = 0; i < 18; i++) { const x = (R() - .5) * 900, z = -3000 + R() * 6000; gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${f1(6 + R() * 10)}" ry="${f1(4 + R() * 6)}" fill="#c49352"/>`); }
    const flowers = ['#fff6a0', '#ffffff', '#ff9ec8', '#ffd24a'];
    for (let i = 0; i < 70; i++) { const x = (R() - .5) * 7000, z = (R() - .5) * 5800; if (Math.abs(x) < 700) continue; gnd.push(`<circle cx="${GX(x)}" cy="${GZ(z)}" r="${f1(2.5 + R() * 2)}" fill="${flowers[i % 4]}"/>`); }
    const shadows = [];
    for (const [x, z] of trees) {
      const s = .8 + R() * .55, h = (560 + R() * 240) * s, pal = COPAS[Math.floor(R() * 3)], top = -h - 40 * s, n = Q === 0 ? 3 : 4;
      if (CEL) { const H = h * 1.32, W = H * 400 / 640; B.group([x, -H * .55, z], Math.max(W * .55, H * .5), () => B.card(x, z, W, H, celTreeSvg(R, COPAS_CEL[Math.floor(R() * 3)]), { k: 2, sh: true })); shadows.push(shadowOf(x, z, h, 300 * s), contact(x, z, 90 * s)); continue; }
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
      if (CEL) { B.group([x, -90 * s, z], 200 * s, () => B.card(x, z, 360 * s, 264 * s, celBushSvg(R, COPAS_CEL[Math.floor(R() * 3)]), { sh: true, y: -20 * s })); gnd.push(contact(x, z, 160 * s)); continue; }
      B.group([x, -80, z], 200 * s, () => { B.blob(x, -95 * s, z, 120 * s, pal); B.blob(x + 90 * s, -70 * s, z + 30 * s, 90 * s, pal); if (Q) B.blob(x - 80 * s, -65 * s, z - 20 * s, 85 * s, pal); });
      gnd.push(contact(x, z, 160 * s)); }
    for (const [x, z] of scatter(R, nR, 400, okB, [-2800, 2800], [-3000, 2200], trees)) { const r = 110 + R() * 90; B.group([x, -r * .5, z], r * 1.2, () => B.card(x, z, r * 2.2, r * 1.45, rockSvg(R, M.musgo[0]), { sh: true })); gnd.push(shadowOf(x, z, r * .4, r * 1.1), contact(x, z, r)); }
    for (let i = 0, n = [1, 2, 3][Q]; i < n; i++) { const [x, z] = scatter(R, 1, 600, okB, [-2600, 2600], [-2900, 2000], trees)[0] || [-1700, 300], a = R() * Math.PI, L = 260 + R() * 160, dx = Math.cos(a) * L / 2, dz = Math.sin(a) * L / 2;
      B.group([x, -40, z], L / 2 + 60, () => B.tube([x - dx, -44, z - dz], [x + dx, -44, z + dz], 44, Q ? 6 : 5, M.tronco, { cap0: '#e9c07c', cap1: '#f3d39a' })); gnd.push(contact(x, z, L * .55)); }
    if (Q === 2) for (const [x, z] of scatter(R, 6, 160, okB, [-2400, 2400], [-3000, 1500], trees)) { const s = .7 + R() * .5; B.group([x, -40, z], 60, () => { B.tube([x, 0, z], [x, -38 * s, z], 10 * s, 4, ['#ffffff', '#efe6d8', '#a7a0c0']); B.blob(x, -44 * s, z, 30 * s, ['#ff8a8a', '#ff3b4e', '#a3204e'], { round: true }); }); }
    tufts(B, R, nTuft, okB, '#8fe04a', '#4aa83a', trees);
    beams(B, Q, [[-1900, -1700], [1750, -2300], [-2300, 900], [2100, 400]]);
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
    const gate = olSvg(100, 100, `<path d="M0 100V40Q0 0 50 0Q100 0 100 40V100Z" fill="#8a8ab0"/><path d="M8 100V42Q8 9 50 9Q92 9 92 42V100Z" fill="#7a4a34"/>` + [24, 42, 58, 76].map(x => `<rect x="${x - 2}" y="12" width="4" height="88" fill="#5a3426"/>`).join('') + `<rect x="8" y="46" width="84" height="5" fill="#4a4a6a"/><rect x="8" y="74" width="84" height="5" fill="#4a4a6a"/><circle cx="62" cy="62" r="3" fill="#f2c24a"/>`);
    B.group([0, -260, ZB + 10], 340, () => B.poly([[-270, 0, ZB + 4], [270, 0, ZB + 4], [270, -520, ZB + 4], [-270, -520, ZB + 4]], M.muro, null, { face: [0, 0, 1], color: '#0000', bg: gate }));
    const banner = olSvg(60, 140, `<path d="M0 0H60V140L30 116L0 140Z" fill="#c8102e"/><path d="M0 0H60V10H0Z" fill="#f2c24a"/><path d="M5 10H55V128L30 108L5 128Z" fill="none" stroke="#f2c24a" stroke-width="3"/><circle cx="30" cy="50" r="13" fill="#f2c24a"/><path d="M30 28L34 42L48 42L37 50L41 64L30 56L19 64L23 50L12 42L26 42Z" fill="#c8102e"/>`);
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

  // ----- recortes dos temas novos (luz pintada à esquerda, como os demais) -----
  const MN = {
    pinho: ['#5ac87a', '#2f9a6a', '#1f5a5a'], arenito: ['#ffd8a0', '#e0a868', '#a86a5a'], marmore: ['#fbf4e6', '#d8ccb8', '#9a90b0'],
    cav: ['#8a7ab0', '#54467a', '#2a2244'], basalto: ['#7a6a7a', '#43364a', '#1e1626'], lodo: ['#a8b060', '#6a7a3a', '#3a4a34'],
  };
  const pt = a => a.map(p => p.map(f1).join(',')).join(' '), pg = (a, col) => `<polygon points="${pt(a)}" fill="${col}"/>`;
  const pineSvg = snow => once('pin' + snow, () => { const P = MN.pinho; let s = `<rect x="88" y="330" width="24" height="90" fill="${M.tronco[1]}"/><rect x="88" y="330" width="9" height="90" fill="${M.tronco[0]}"/>`;
    for (const [t, w, b] of [[160, 100, 345], [80, 85, 250], [10, 60, 150]]) { const hh = b - t;
      s += pg([[100, t], [100 - w, b], [100 + w, b]], P[1]) + pg([[100, t], [100 - w, b], [100 - w * .35, b]], P[0]) + pg([[100, t], [100 + w * .45, b], [100 + w, b]], P[2]);
      if (snow) s += pg([[100, t], [100 - w * .34, t + hh * .34], [100 - w * .12, t + hh * .27], [100 + w * .06, t + hh * .36], [100 + w * .34, t + hh * .33]], '#ffffff') + `<path d="M${100 - w} ${b} q${f1(w * .25)} -16 ${f1(w * .5)} 0 t${f1(w * .5)} 0 t${f1(w * .5)} 0 t${f1(w * .5)} 0 v7 h${-2 * w}z" fill="#eef4ff"/>`; }
    return olSvg(200, 420, s, 2.4); });
  // cristais: cor própria (não escurece à noite)
  const CRIST = [['#9ff8ff', '#3ad0f0', '#1a6ab0'], ['#ffb0f0', '#e050c8', '#7a2a9a'], ['#d8b8ff', '#9a6af0', '#4a2aa0']];
  const crystalSvg = (R, pal) => { let s = `<ellipse cx="60" cy="192" rx="60" ry="10" fill="!${pal[1]}" opacity=".4"/>`;
    for (const i of [0, 3, 1, 2]) { const cx = 60 + (i - 1.5) * 20 + (R() - .5) * 8, h = (70 + R() * 80) * (i === 1 || i === 2 ? 1.3 : 1), w = 11 + R() * 7, ln = (i - 1.5) * 12, top = [cx + ln, 196 - h], mid = [cx + ln * .4, 196];
      s += pg([[cx - w, 196], [cx - w + ln * .8, 196 - h * .8], top, mid], '!' + pal[0]) + pg([mid, top, [cx + w + ln * .8, 196 - h * .8], [cx + w, 196]], '!' + pal[1]) + pg([[cx + w * .2 + ln * .9, 196 - h * .8], top, [cx + w + ln * .8, 196 - h * .8]], '!' + pal[2]); }
    return olSvg(120, 200, s, 1.6); };
  const pillarSvg = (R, m) => { const w0 = 40 + R() * 14, w1 = 10 + R() * 10, top = [60 + (R() - .5) * 14, 6], L = [60 - w0, 300], Rr = [60 + w0, 300];
    return olSvg(120, 300, pg([L, [60 - w1, 40], top, [60 + w1 * .2, 300]], m[0]) + pg([[60 + w1 * .2, 300], top, [60 + w1, 40], Rr], m[1]) + pg([[60 + w0 * .45, 300], [60 + w1 * .7, 60], [60 + w1, 40], Rr], m[2])); };
  const archSvg = () => once('arco', () => { const [h, m, s] = MN.marmore, ivy = ['#8ad84a', '#4aa83a', '#2a6a3a'];
    let t = `<path d="M20 360V150A130 130 0 0 1 280 150V360H220V160A70 70 0 0 0 80 160V360Z" fill="${m}"/><rect x="20" y="150" width="22" height="210" fill="${h}"/><rect x="220" y="160" width="20" height="200" fill="${h}"/><rect x="258" y="150" width="22" height="210" fill="${s}"/><rect x="60" y="160" width="20" height="200" fill="${s}"/>`;
    t += `<rect x="6" y="330" width="88" height="30" fill="${h}"/><rect x="206" y="330" width="88" height="30" fill="${m}"/><path d="M150 20l-10 20h20z" fill="${s}"/>`;
    t += [[40, 60, 34], [90, 30, 28], [150, 22, 30], [215, 40, 30], [262, 90, 24], [30, 130, 22], [268, 170, 18], [32, 210, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${ivy[1]}"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .55}" fill="${ivy[0]}"/>`).join('');
    t += `<path d="M262 110q10 60 -2 120M36 150q-8 50 4 110" stroke="${ivy[2]}" stroke-width="5" fill="none"/>`;
    return olSvg(300, 360, t, 3); });
  const twistSvg = R => { const [h, m, s] = ['#a89a7a', '#6a5a4a', '#3a3040'], b = 50 + R() * 30;
    let t = `<path d="M70 400C${70 + b} 320 ${30 - b * .4} 230 ${100} 120C130 80 120 40 ${150 + R() * 20} 10L162 20C140 60 150 100 122 140C${80 - b * .3} 220 ${110 + b} 300 112 400Z" fill="${m}"/><path d="M70 400C${70 + b} 320 ${30 - b * .4} 230 100 120L108 126C${50 - b * .3} 230 ${86 + b} 320 86 400Z" fill="${h}"/>`;
    t += `<path d="M104 200C70 180 40 186 14 160" stroke="${m}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M112 150C150 140 170 120 190 92" stroke="${s}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    t += `<path d="M14 160q-4 30 2 60M60 176q-2 26 4 48M190 92q4 30 -2 54" stroke="#6a8a4a" stroke-width="4" fill="none" opacity=".8"/>`;
    return olSvg(200, 400, t, 2.6); };
  const fogSvg = once('nevoa', () => svgUrl(400, 120, `<defs><radialGradient id="nv"><stop offset="0" stop-color="#f4fff0" stop-opacity=".55"/><stop offset="1" stop-color="#f4fff0" stop-opacity="0"/></radialGradient></defs><ellipse cx="200" cy="70" rx="200" ry="50" fill="url(#nv)"/>`));
  const spikeSvg = R => { const [h, m, s] = MN.basalto, x1 = 40 + R() * 20, x2 = 90 + R() * 20;
    return olSvg(160, 220, pg([[4, 220], [x1, 20 + R() * 40], [70, 220]], h) + pg([[70, 220], [x1, 30], [x2, 4 + R() * 30], [156, 220]], m) + pg([[110, 220], [x2, 10], [156, 220]], s)
      + `<path d="M${f1(x1)} 80l8 40 -10 30 12 40" stroke="!#ff7a2a" stroke-width="4" fill="none"/><path d="M${f1(x2)} 60l-6 50 10 40" stroke="!#ffb040" stroke-width="3" fill="none"/>`); };
  const rockOf = (R, top, mat) => { const keep = M.pedra; M.pedra = mat; const u = rockSvg(R, top); M.pedra = keep; return u; };
  const posts = (B, R, pts, h, mat) => pts.forEach(([x, z]) => B.box(x, z, 34, 34, h * (.9 + R() * .2), mat));

  // ----- MONTANHA NEVADA -----
  function neve(B, Q, R, gnd) {
    const okT = (x, z) => !inArena(x, z, 240) && !(Math.abs(x) < 1500 && z < -2500) && !(Math.abs(x + 430) < 700 && z > 600 && z < 1700);
    const trees = scatter(R, [10, 18, 22][Q], 470, okT);
    gnd.push(`<rect width="1800" height="1500" fill="#e8f0ff"/>`);
    for (let i = 0; i < 30; i++) gnd.push(`<ellipse cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" rx="${f1(40 + R() * 110)}" ry="${f1(25 + R() * 50)}" fill="${R() < .5 ? '#ffffff' : '#d4def6'}"/>`);
    let path = ''; for (let z = 3000; z >= -3000; z -= 150) { const x = Math.sin(z / 800) * 220 + Math.sin(z / 330) * 50; path += `<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(430 + Math.sin(z / 520) * 80)}" ry="${GR(210)}" fill="#c6d2ee"/>`; }
    gnd.push(path); for (let i = 0; i < 40; i++) { const z = -2900 + i * 145, x = Math.sin(z / 800) * 220 + (i % 2 ? 40 : -40); gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="3.5" ry="5" fill="#a8b6da"/>`); }
    { const x = -2300, z = -1100; gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(560)}" ry="${GR(380)}" fill="#bfe6ff"/><ellipse cx="${GX(x - 80)}" cy="${GZ(z - 60)}" rx="${GR(300)}" ry="${GR(90)}" fill="#e8f8ff"/>`); }
    const shadows = [];
    for (const [x, z] of trees) { const s = .8 + R() * .6, h = (640 + R() * 220) * s, w = h * 200 / 420;
      B.group([x, -h * .5, z], Math.max(w, h) * .55, () => B.card(x, z, w, h, pineSvg(1), { sh: true })); shadows.push(shadowOf(x, z, h * .8, w * .55), contact(x, z, 70 * s)); }
    gnd.push(...shadows);
    const okB = (x, z) => !inArena(x, z, 40) && inArena(x, z, 1200);
    for (const [x, z] of scatter(R, [4, 8, 10][Q], 300, okB, [-2600, 2600], [-3000, 1900], trees)) { const s = .7 + R() * .6, pal = ['#ffffff', '#e2eaff', '#a9b6e0'];
      B.group([x, -70, z], 190 * s, () => { B.blob(x, -80 * s, z, 120 * s, pal); B.blob(x + 90 * s, -55 * s, z + 30 * s, 85 * s, pal); }); gnd.push(contact(x, z, 150 * s)); }
    for (const [x, z] of scatter(R, [2, 4, 5][Q], 400, okB, [-2800, 2800], [-3000, 2200], trees)) { const r = 110 + R() * 90; B.group([x, -r * .5, z], r * 1.2, () => B.card(x, z, r * 2.2, r * 1.45, rockSvg(R, '#ffffff'), { sh: true })); gnd.push(shadowOf(x, z, r * .4, r * 1.1), contact(x, z, r)); }
  }

  // ----- DESERTO COM OÁSIS -----
  function deserto(B, Q, R, gnd) {
    gnd.push(`<rect width="1800" height="1500" fill="#f6cf86"/>`);
    for (let i = 0; i < 22; i++) gnd.push(`<ellipse cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" rx="${f1(90 + R() * 160)}" ry="${f1(30 + R() * 50)}" fill="${R() < .5 ? '#ecb86c' : '#fbe0a4'}"/>`);
    for (let i = 0; i < 9; i++) { const y = f1(80 + i * 160 + R() * 40); gnd.push(`<path d="M0 ${y}Q450 ${f1(y - 30)} 900 ${y}T1800 ${y}" stroke="#e8b268" stroke-width="3" fill="none" opacity=".6"/>`); }
    const ox = -2250, oz = -900; // o oásis, do lado do sol
    gnd.push(`<ellipse cx="${GX(ox)}" cy="${GZ(oz)}" rx="${GR(900)}" ry="${GR(700)}" fill="#86cf4a"/><ellipse cx="${GX(ox)}" cy="${GZ(oz)}" rx="${GR(640)}" ry="${GR(460)}" fill="#f0d090"/><ellipse cx="${GX(ox)}" cy="${GZ(oz)}" rx="${GR(560)}" ry="${GR(390)}" fill="#2cc0ea"/><ellipse cx="${GX(ox + 60)}" cy="${GZ(oz + 40)}" rx="${GR(380)}" ry="${GR(240)}" fill="#5ae6d8"/><ellipse cx="${GX(ox - 120)}" cy="${GZ(oz - 80)}" rx="${GR(180)}" ry="${GR(50)}" fill="#bff8ff"/>`);
    const palms = [palmSvg(R), palmSvg(R)], spots = [[ox - 650, oz - 420], [ox + 560, oz - 380], [ox - 500, oz + 520], [ox + 620, oz + 430], [ox - 820, oz + 60]].slice(0, [2, 4, 5][Q]);
    spots.forEach(([x, z], i) => { const k = 1.7 + R() * .5, w = 300 * k, h = 520 * k; B.group([x, -h * .55, z], h * .55, () => B.card(x, z, w, h, palms[i % 2], { k: 2, sh: true })); gnd.push(shadowOf(x + 120, z, h * .9, 200), contact(x, z, 70)); });
    tufts(B, R, [0, 8, 14][Q], (x, z) => Math.hypot(x - ox, (z - oz) * 1.3) < 900 && Math.hypot(x - ox, (z - oz) * 1.3) > 640, '#b6e85a', '#6cbc44', spots);
    // ruínas de arenito: colunas e um portal ao fundo à direita
    const cols = [[1900, -2500, 620], [2500, -2350, 420], [2300, -1700, 260], [2800, -900, 520], [1700, 1900, 340], [2500, 1300, 200]].slice(0, [3, 5, 6][Q]);
    for (const [x, z, h] of cols) { B.group([x, -h / 2, z], Math.max(h / 2, 120) + 40, () => B.tube([x, 0, z], [x, -h, z], 70, Q ? 6 : 5, MN.arenito, { cap1: MN.arenito[0] })); gnd.push(shadowOf(x, z, h, 110), contact(x, z, 80)); }
    if (Q) B.group([2650, -380, -2500], 420, () => { B.box(2350, -2500, 120, 120, 640, MN.arenito); B.box(2950, -2500, 120, 120, 640, MN.arenito); B.box(2650, -2500, 760, 140, 110, MN.arenito, { y: 640 }); });
    const okR = (x, z) => !inArena(x, z, 200) && Math.hypot(x - ox, z - oz) > 1000;
    for (const [x, z] of scatter(R, [2, 4, 6][Q], 420, okR, [-3000, 3000], [-3000, 2500], cols)) { const r = 100 + R() * 110; B.group([x, -r * .5, z], r * 1.2, () => B.card(x, z, r * 2.2, r * 1.45, rockOf(R, null, MN.arenito), { sh: true })); gnd.push(shadowOf(x, z, r * .4, r * 1.1), contact(x, z, r)); }
  }

  // ----- CAVERNA DE CRISTAIS -----
  function caverna(B, Q, R, gnd) {
    gnd.push(`<rect width="1800" height="1500" fill="#4a3e64"/>`);
    for (let i = 0; i < 28; i++) gnd.push(`<ellipse cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" rx="${f1(40 + R() * 120)}" ry="${f1(25 + R() * 60)}" fill="${R() < .5 ? '#3a3054' : '#5a4c74'}"/>`);
    for (let i = 0; i < 5; i++) { const x = (R() < .5 ? -1 : 1) * (1500 + R() * 1500), z = -2800 + R() * 5200; gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(260 + R() * 200)}" ry="${GR(160 + R() * 100)}" fill="!#7af0ff" opacity=".35"/><ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(220 + R() * 160)}" ry="${GR(130 + R() * 80)}" fill="#2a4a7a"/>`); }
    const okE = (x, z) => !inArena(x, z, 150);
    const cols = scatter(R, [4, 7, 9][Q], 600, okE);
    for (const [x, z] of cols) { const s = .9 + R() * .7, w = 240 * s, h = 760 * s; B.group([x, -h / 2, z], h / 2, () => B.card(x, z, w, h, pillarSvg(R, MN.cav), { sh: true })); gnd.push(contact(x, z, w * .5)); }
    const cr = scatter(R, [5, 9, 12][Q], 300, (x, z) => okE(x, z) && inArena(x, z, 1500), [-3000, 3000], [-3000, 2500], cols);
    cr.forEach(([x, z], i) => { const pal = CRIST[i % 3], s = 1.2 + R() * 1.3, w = 120 * s, h = 200 * s;
      B.group([x, -h / 2, z], h * .6, () => B.card(x, z, w, h, crystalSvg(R, pal), { sh: true })); gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(w * 1.4)}" ry="${GR(w)}" fill="!${pal[1]}" opacity=".22"/>`); });
    for (const [x, z] of scatter(R, [2, 4, 6][Q], 300, (x, z) => okE(x, z) && inArena(x, z, 1300), [-2800, 2800], [-3000, 2200], [...cols, ...cr])) { const r = 90 + R() * 80; B.group([x, -r * .5, z], r * 1.2, () => B.card(x, z, r * 2.2, r * 1.45, rockOf(R, null, MN.cav), { sh: true })); gnd.push(contact(x, z, r)); }
    beams(B, Q, [[-1300, -2600], [1300, -2600]]); // luz que desce da boca da caverna
  }

  // ----- RUÍNAS ANTIGAS -----
  function ruinas(B, Q, R, gnd) {
    gnd.push(`<rect width="1800" height="1500" fill="#78c850"/>`);
    for (let i = 0; i < 26; i++) gnd.push(`<ellipse cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" rx="${f1(40 + R() * 90)}" ry="${f1(25 + R() * 50)}" fill="${R() < .5 ? '#8ed65a' : '#62b044'}"/>`);
    for (let z = -2900; z < 2900; z += 120) for (let k = -3; k <= 3; k++) { if (R() < .45 + Math.abs(k) * .12) continue; /* lajes soltas, mais raras longe do meio */ const x = k * 130 + (R() - .5) * 30; gnd.push(`<rect x="${f1(GX(x) - 14)}" y="${f1(GZ(z) - 12)}" width="${f1(26 + R() * 6)}" height="${f1(22 + R() * 4)}" rx="3" fill="${R() < .5 ? '#e8dcc4' : '#d6c8ae'}"/>`); }
    const okC = (x, z) => !inArena(x, z, 200) && !(Math.abs(x + 430) < 700 && z > 600 && z < 1700);
    const cols = scatter(R, [6, 10, 13][Q], 480, okC);
    for (const [x, z] of cols) { const h = R() < .35 ? 700 + R() * 80 : 200 + R() * 400;
      B.group([x, -h / 2, z], Math.max(h / 2, 110) + 40, () => { B.tube([x, 0, z], [x, -h, z], 64, Q ? 8 : 6, MN.marmore, { cap1: '#f4ecdc' }); B.box(x, z, 170, 170, 50, MN.marmore); if (h > 650) B.box(x, z, 170, 170, 46, MN.marmore, { y: h }); });
      gnd.push(shadowOf(x, z, h, 100), contact(x, z, 90)); }
    for (let i = 0, n = [1, 2, 3][Q]; i < n; i++) { const [x, z] = scatter(R, 1, 500, okC, [-2600, 2600], [-2900, 2200], cols)[0] || [-1800, 900], a = R() * Math.PI, dx = Math.cos(a) * 110, dz = Math.sin(a) * 110;
      B.group([x, -60, z], 200, () => B.tube([x - dx, -62, z - dz], [x + dx, -62, z + dz], 62, 6, MN.marmore, { cap0: '#f4ecdc', cap1: '#efe4d0' })); gnd.push(contact(x, z, 160)); }
    const arches = [[-2500, -2200, .5], [2600, -1500, -.6], [2400, 1700, .9]].slice(0, [1, 2, 3][Q]);
    for (const [x, z] of arches) { B.group([x, -300, z], 380, () => B.card(x, z, 600, 720, archSvg(), { k: 2, sh: true })); gnd.push(shadowOf(x, z, 500, 300), contact(x, z, 280)); }
    if (Q) B.group([-2100, -150, -2650], 520, () => { for (let k = 0; k < 4; k++) B.box(-2100, -2450 - k * 120, 900 - k * 120, 120, 70 * (k + 1), MN.marmore); });
    tufts(B, R, [0, 16, 26][Q], (x, z) => !inArena(x, z, 120), '#a6ea5a', '#4aa83a', cols);
    beams(B, Q, [[-1800, -1300], [1700, -2200], [2000, 900]]);
  }

  // ----- PÂNTANO -----
  function pantano(B, Q, R, gnd) {
    gnd.push(`<rect width="1800" height="1500" fill="#6a8a3a"/>`);
    for (let i = 0; i < 26; i++) gnd.push(`<ellipse cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" rx="${f1(40 + R() * 100)}" ry="${f1(25 + R() * 60)}" fill="${R() < .5 ? '#7a9a44' : '#566e30'}"/>`);
    const pools = [[-2200, -1500, 700], [2100, -2100, 600], [-1900, 1500, 520], [2400, 700, 560], [0, -2850, 520], [-2900, -200, 380]];
    for (const [x, z, r] of pools) { gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(r * 1.1)}" ry="${GR(r * .8)}" fill="#4a6a3a"/><ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(r)}" ry="${GR(r * .7)}" fill="#2a4a42"/><ellipse cx="${GX(x - r * .2)}" cy="${GZ(z - r * .15)}" rx="${GR(r * .5)}" ry="${GR(r * .12)}" fill="#4a7a6a" opacity=".7"/>`);
      for (let k = 0; k < 6; k++) { const a = R() * 6.3, d = R() * r * .8, lx = GX(x + Math.cos(a) * d), lz = GZ(z + Math.sin(a) * d * .7), lr = f1(5 + R() * 6); gnd.push(`<circle cx="${lx}" cy="${lz}" r="${lr}" fill="#5ab040"/><path d="M${lx} ${lz}l${lr} -2 0 4z" fill="#2a4a42"/>${k % 3 ? '' : `<circle cx="${f1(lx + 2)}" cy="${f1(lz - 2)}" r="2.4" fill="#ffb0d8"/>`}`); } }
    const okT = (x, z) => !inArena(x, z, 240) && !(Math.abs(x + 430) < 700 && z > 600 && z < 1700) && !pools.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r * .8);
    const trees = scatter(R, [6, 11, 14][Q], 520, okT), pal = ['#9ab84a', '#5a7a34', '#2a4a3a'];
    for (const [x, z] of trees) { const s = .9 + R() * .5, h = 760 * s, w = 380 * s, fl = R() < .5;
      B.group([x, -h * .6, z], h * .55, () => { B.card(x, z, w, h, twistSvg(R), { sh: true, flip: fl }); B.blob(x + (fl ? -1 : 1) * 60 * s, -h * .96, z, 150 * s, pal); if (Q) B.blob(x + (fl ? 1 : -1) * 150 * s, -h * .62, z + 20, 95 * s, pal); });
      gnd.push(shadowOf(x, z, h * .7, 220 * s), contact(x, z, 80 * s)); }
    if (Q) for (const [x, z] of scatter(R, [0, 2, 3][Q], 600, okT, [-2600, 2600], [-2900, 2000], trees)) { const a = R() * 3, dx = Math.cos(a) * 180, dz = Math.sin(a) * 180; B.group([x, -40, z], 260, () => B.tube([x - dx, -38, z - dz], [x + dx, -38, z + dz], 38, 6, MN.lodo, { cap0: '#c8b27a', cap1: '#d6c08a' })); gnd.push(contact(x, z, 200)); }
    for (let i = 0, n = [2, 4, 6][Q]; i < n; i++) { const a = i / n * 6.3 + R() * .5, x = Math.cos(a) * 2500, z = Math.sin(a) * 2300 - 300; B.card(x, z, 1400, 260, fogSvg, { k: 2, y: -40 }); }
    tufts(B, R, [0, 16, 26][Q], (x, z) => !inArena(x, z, 150), '#a8c050', '#5a7a30', trees);
    beams(B, Q, [[-1600, -2000], [1500, -1600]]);
  }

  // ----- VULCÃO -----
  function vulcao(B, Q, R, gnd) {
    gnd.push(`<rect width="1800" height="1500" fill="#3a2e3a"/>`);
    for (let i = 0; i < 26; i++) gnd.push(`<ellipse cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" rx="${f1(40 + R() * 110)}" ry="${f1(25 + R() * 60)}" fill="${R() < .5 ? '#4a3c48' : '#2a2030'}"/>`);
    // rios de lava que contornam a luta (cor própria: brilha igual à noite)
    const river = (x0, k, ph) => { let a = '', b = '', c = ''; for (let z = 3000; z >= -3000; z -= 120) { const x = x0 + Math.sin(z / k + ph) * 320, w = 150 + Math.sin(z / 400 + ph) * 40;
      a += `<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(w * 1.8)}" ry="${GR(110)}" fill="!#ff5a1a" opacity=".22"/>`; b += `<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(w)}" ry="${GR(80)}" fill="!#ff6a1a"/>`; c += `<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(w * .45)}" ry="${GR(50)}" fill="!#ffc040"/>`; } return a + b + c; };
    gnd.push(river(-2050, 700, 0), river(2250, 900, 2));
    { const x = 1900, z = -2300; gnd.push(`<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(700)}" ry="${GR(420)}" fill="!#ff5a1a" opacity=".3"/><ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(520)}" ry="${GR(300)}" fill="!#ff7a20"/><ellipse cx="${GX(x - 60)}" cy="${GZ(z - 30)}" rx="${GR(300)}" ry="${GR(140)}" fill="!#ffe080"/>`); }
    const okS = (x, z) => !inArena(x, z, 200);
    const sp = scatter(R, [6, 10, 13][Q], 450, okS);
    for (const [x, z] of sp) { const s = 1.2 + R() * 1.6, w = 160 * s, h = 220 * s; B.group([x, -h / 2, z], h * .6, () => B.card(x, z, w, h, spikeSvg(R), { sh: true })); gnd.push(shadowOf(x, z, h * .6, w * .5), contact(x, z, w * .4)); }
    for (const [x, z] of scatter(R, [2, 4, 6][Q], 380, (x, z) => okS(x, z) && inArena(x, z, 1300), [-2800, 2800], [-3000, 2200], sp)) { const r = 100 + R() * 90; B.group([x, -r * .5, z], r * 1.2, () => B.card(x, z, r * 2.2, r * 1.45, rockOf(R, null, MN.basalto), { sh: true })); gnd.push(shadowOf(x, z, r * .4, r * 1.1), contact(x, z, r)); }
  }

  // ----- CAMPO FLORIDO -----
  function campo(B, Q, R, gnd) {
    gnd.push(`<rect width="1800" height="1500" fill="#8ad850"/>`);
    for (let i = 0; i < 24; i++) gnd.push(`<ellipse cx="${f1(R() * 1800)}" cy="${f1(R() * 1500)}" rx="${f1(60 + R() * 120)}" ry="${f1(30 + R() * 60)}" fill="${R() < .5 ? '#a6e86a' : '#74c444'}"/>`);
    let path = ''; for (let z = 3000; z >= -3000; z -= 150) { const x = Math.sin(z / 1000) * 300; path += `<ellipse cx="${GX(x)}" cy="${GZ(z)}" rx="${GR(380)}" ry="${GR(200)}" fill="#e0c088"/>`; } gnd.push(path);
    const fl = ['#ffe04a', '#ffffff', '#ff8ac0', '#b08aff', '#ff6a5a'];
    for (let i = 0; i < 22; i++) { const x = (R() < .5 ? -1 : 1) * (1300 + R() * 2200), z = -2900 + R() * 5600, c = fl[i % 5], r = 120 + R() * 220;
      for (let k = 0; k < 24; k++) { const a = R() * 6.3, d = Math.sqrt(R()) * r; gnd.push(`<circle cx="${GX(x + Math.cos(a) * d)}" cy="${GZ(z + Math.sin(a) * d)}" r="${f1(2.6 + R() * 2.4)}" fill="${c}"/>`); } }
    const okT = (x, z) => !inArena(x, z, 300) && !(Math.abs(x) < 1500 && z < -2500) && !(Math.abs(x + 430) < 700 && z > 600 && z < 1700);
    const trees = scatter(R, [4, 6, 8][Q], 900, okT);
    for (const [x, z] of trees) { const s = .9 + R() * .5, h = (560 + R() * 200) * s, pal = COPAS[Math.floor(R() * 3)], top = -h - 40 * s;
      if (CEL) { const H = h * 1.32, W = H * 400 / 640; B.group([x, -H * .55, z], Math.max(W * .55, H * .5), () => B.card(x, z, W, H, celTreeSvg(R, COPAS_CEL[Math.floor(R() * 3)]), { k: 2, sh: true })); gnd.push(shadowOf(x, z, h, 290 * s), contact(x, z, 90 * s)); continue; }
      B.group([x, -h * .7, z], 330 * s, () => { B.card(x, z, 90 * s, h + 40 * s, trunkSvg(), { sh: true }); B.blob(x, top, z, 230 * s, pal); for (let k = 0; k < (Q ? 3 : 2); k++) { const a = k * 2.1 + R() * .5; B.blob(x + Math.cos(a) * 170 * s, top + 90 * s, z + Math.sin(a) * 150 * s, 150 * s, pal); } });
      gnd.push(shadowOf(x, z, h, 290 * s), contact(x, z, 90 * s)); }
    // cerca de madeira num arco à esquerda e atrás (postes + duas tábuas de cada vão)
    const fence = []; for (let a = 2.3; a < 4.4; a += [.34, .22, .17][Q]) fence.push([Math.cos(a) * 2900, Math.sin(a) * 2500 - 200]);
    B.group([-2500, -80, -900], 1600, () => { posts(B, R, fence, 150, M.madeira);
      for (let i = 0; i + 1 < fence.length; i++) { const [x0, z0] = fence[i], [x1, z1] = fence[i + 1]; for (const y of [55, 115]) B.poly([[x0, -y, z0], [x1, -y, z1], [x1, -y - 22, z1], [x0, -y - 22, z0]], M.madeira, null, { ds: true, face: [x0 + x1, 0, z0 + z1] }); } });
    for (const [x, z] of fence) gnd.push(contact(x, z, 30));
    tufts(B, R, [0, 14, 24][Q], (x, z) => !inArena(x, z, 150), '#b6f06a', '#5ab840', trees);
    beams(B, Q, [[-2000, -1800], [1900, -1400], [-1700, 1300]]);
  }

  // ----- nuvens que andam, partículas e gaivotas -----
  // Poucas: cada camada animada obriga o navegador a reordenar todo o palco 3D a cada quadro.
  const cloudCard = R => svgUrl(300, 130, CEL ? celCloud(150, 100, 1.2, R) : cloudSvg(150, 92, 2, R, '#ffffff', '#bcd3f5'));
  function ceuVivo(B, Q, R, tema) {
    for (let i = 0, n = tema === 'caverna' ? 0 : [0, 3, 4][Q]; i < n; i++) { const a = (i / n) * 2 * Math.PI + R() * .6, r = 2700, x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r * .95, k = 2.6 + R() * 1.6, ry = Math.atan2(-x, -z) * 180 / Math.PI;
      B.raw(`<s class="tcl" style="background-image:${cloudCard(R)};transform:translate3d(${f1(x)}px,${f1(-1450 - R() * 350)}px,${f1(z)}px) rotateY(${f1(ry + 180)}deg) scale(${f1(k)});animation-duration:${f1(70 + R() * 60)}s;animation-delay:-${f1(R() * 60)}s"></s>`); }
    const kinds = { floresta: [['folha', [0, 8, 9][Q]], ['luz', [0, 6, 7][Q]]], castelo: [['poeira', [0, 10, 12][Q]], ['folha', [0, 3, 4][Q]]], praia: [['brilho', [0, 8, 10][Q]]],
      neve: [['neve', [0, 10, 14][Q]]], deserto: [['poeira', [0, 8, 10][Q]]], caverna: [['brilho', [0, 8, 10][Q]]], ruinas: [['poeira', [0, 6, 8][Q]], ['folha', [0, 3, 4][Q]]],
      pantano: [['bolha', [0, 8, 10][Q]]], vulcao: [['brasa', [0, 10, 14][Q]]], campo: [['petala', [0, 9, 12][Q]]] }[tema] || [];
    for (const [kind, n] of kinds) for (let i = 0; i < n; i++) {
      const fall = kind === 'folha' || kind === 'neve' || kind === 'petala', low = kind === 'brasa' || kind === 'bolha';
      const x = (R() - .5) * 4400, z = -3000 + R() * 4600, y = fall ? -900 - R() * 400 : low ? -10 - R() * 40 : kind === 'brilho' && tema === 'praia' ? -30 - R() * 80 : -120 - R() * 520;
      const bx = kind === 'brilho' && tema === 'praia' ? shore(z) + (R() - .3) * 300 : x, hue = kind === 'folha' ? ['#9be04a', '#e8d84a', '#6cc846'][i % 3] : kind === 'petala' ? ['#ffb0d0', '#fff0f6', '#ffd0e0'][i % 3] : '';
      B.raw(`<i class="tpa tp-${kind}" style="transform:translate3d(${f1(bx)}px,${f1(y)}px,${f1(z)}px) rotateY(calc(var(--bry,0deg) * -1)) rotateX(calc(var(--brx,0deg) * -1));animation-duration:${f1(fall ? 9 + R() * 7 : kind === 'brasa' ? 4 + R() * 3 : 3 + R() * 4)}s;animation-delay:-${f1(R() * 12)}s${hue ? ';background:' + hue : ''}"></i>`);
    }
    const gulls = tema === 'praia' ? [0, 2, 3][Q] : tema === 'castelo' ? [0, 1, 2][Q] : 0, gsv = svgUrl(40, 16, `<path d="M0 6Q10 0 20 10Q30 0 40 6Q30 4 20 14Q10 4 0 6Z" fill="#ffffff" stroke="#3a4a6a" stroke-width="1.2"/>`);
    for (let i = 0; i < gulls; i++) { const cx = tema === 'praia' ? 1800 + R() * 900 : (R() - .5) * 2000, cz = -1200 - R() * 1400;
      B.raw(`<i class="tgu" style="--gx:${f1(cx)}px;--gy:${f1(-1100 - R() * 400)}px;--gz:${f1(cz)}px;animation-duration:${f1(18 + R() * 10)}s;animation-delay:-${f1(R() * 20)}s"><b style="background-image:${gsv};translate:${f1(500 + R() * 400)}px 0"></b></i>`); }
  }

  // ----- montar -----
  let live = []; // grupos do cenário atual: { el, c, r }
  // cada tema: função que monta as peças, semente fixa e as frestas (null = usa a do céu do horário)
  const FRC = { dia: '#1e1834', tarde: '#1e1834', noite: '#1e1834' }, FRV = { dia: '#7a2a3a', tarde: '#5a1a30', noite: '#1e0a14' };
  const BUILD = { floresta: [(B, Q, R, gnd) => floresta(B, Q, R, gnd), 11], castelo: [(B, Q, R, gnd) => castelo(B, Q, R, gnd), 23], praia: [praia, 37],
    neve: [neve, 41], deserto: [deserto, 53], caverna: [caverna, 67, FRC], ruinas: [ruinas, 71], pantano: [pantano, 83], vulcao: [vulcao, 97, FRV], campo: [campo, 103] };
  const TEMAS = Object.keys(BUILD);
  // monta o cenário sem tocar no DOM: html do terreno, horizonte de cada face e grupos (para sumir na frente da câmera), já no horário
  function construir(tema, Q, hora = 'dia', estilo = 'cel') {
    const b = BUILD[tema]; if (!b) return null;
    CEL = estilo !== 'simples'; try { return construir0(tema, Q, hora, b); } finally { CEL = false; }
  }
  function construir0(tema, Q, hora, b) {
    const R = rng(b[1]), B = Builder(), gnd = [], extra = [];
    b[0](B, Q, R, gnd, extra);
    ceuVivo(B, Q, rng(99), tema);
    const raw = `<div class="tgnd" style="background-image:${svgUrl(1800, 1500, gnd.join(''))}"></div>${extra.join('')}` + B.html();
    const gh = tema === 'caverna' ? 'dia' : hora; // a caverna não tem céu: o horário só aparece na boca de luz
    const faces = Object.fromEntries(Object.keys(FACE).map(f => [f, gradeAll(horizonte(tema, f, f.length * 7 + tema.length, hora), gh)]));
    return { html: gradeAll(raw, gh), faces, groups: B.groups.map(G => ({ c: G.c, r: G.r })), n: (raw.match(/<(?:i class="tf|b class="tb|s class="tc)/g) || []).length, frest: (b[2] || FREST)[hora] || FREST.dia };
  }
  function montar(parent, tema, q = 'medium', hora) {
    const Q = q === 'low' ? 0 : q === 'high' ? 2 : 1, host = parent.closest?.('[data-biome]');
    hora = HORAS.includes(hora) ? hora : horaDe(host?.dataset.biome);
    let estilo = 'cel'; try { estilo = localStorage.getItem('vj_terr_estilo') || 'cel'; } catch {} // "simples" volta ao estilo antigo
    const r = construir(tema, Q, hora, estilo); if (!r) return;
    const terr = document.createElement('div'); terr.className = `terr t-${tema} h-${hora}${estilo === 'cel' ? ' cel' : ''}`;
    terr.innerHTML = r.html;
    parent.appendChild(terr);
    host?.style.setProperty('--frest', r.frest);
    for (const el of parent.querySelectorAll(':scope > .envface')) { const f = Object.keys(FACE).find(k => el.classList.contains(k)); if (f) { el.style.backgroundImage = r.faces[f]; el.style.backgroundSize = '100% 100%'; } }
    ceil = parent.querySelector(':scope > .env-ceiling');
    live = r.groups.map((G, i) => ({ el: terr.querySelector(`[data-tg="${i}"]`), c: G.c, r: G.r }));
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
    const sky = h => `<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="!${SKY[h][0]}"/><stop offset=".7" stop-color="!${SKY[h][2]}"/></linearGradient></defs><rect width="64" height="36" fill="url(#c)"/>`
      + (h === 'noite' ? `<circle cx="10" cy="8" r="3.4" fill="!#eef2ff"/><circle cx="30" cy="5" r=".6" fill="!#fff"/><circle cx="48" cy="9" r=".6" fill="!#fff"/><circle cx="56" cy="4" r=".5" fill="!#fff"/>` : h === 'tarde' ? `<circle cx="10" cy="15" r="5" fill="!#ffd090"/>` : `<circle cx="10" cy="8" r="4" fill="#fffdf0"/>`);
    const art = {
      floresta: `<path d="M0 22Q16 14 32 20T64 18V36H0Z" fill="#9ccbf0"/><rect y="27" width="64" height="9" fill="#5fbd3c"/><path d="M26 36L30 28H36L40 36Z" fill="#d9ae6a"/>` + [[6, 22, 8], [17, 18, 9], [48, 19, 9], [58, 23, 7], [3, 29, 5], [61, 29, 5]].map(([x, y, r]) => `<rect x="${x - 1.5}" y="${y}" width="3" height="${30 - y}" fill="#8f5a34"/><circle cx="${x}" cy="${y}" r="${r}" fill="#4fb54a"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .55}" fill="#b2ea5a"/>`).join(''),
      castelo: `<rect y="27" width="64" height="9" fill="#eadfc4"/><rect x="0" y="17" width="64" height="11" fill="#e0d1b0"/>` + [4, 12, 20, 28, 36, 44, 52, 60].map(x => `<rect x="${x - 2}" y="14" width="4" height="3" fill="#e0d1b0"/>`).join('') + [[8, 9], [56, 9], [32, 4]].map(([x, y]) => `<rect x="${x - 4}" y="${y + 4}" width="8" height="${24 - y}" fill="#fbf1d8"/><path d="M${x - 5} ${y + 4}L${x} ${y - 4}L${x + 5} ${y + 4}Z" fill="#3566e0"/>`).join('') + `<path d="M28 28V22Q32 18 36 22V28Z" fill="#7a4a34"/><rect x="18" y="18" width="4" height="7" fill="#c8102e"/><rect x="42" y="18" width="4" height="7" fill="#c8102e"/>`,
      praia: `<rect y="20" width="64" height="16" fill="#1f84dc"/><path d="M0 36V26Q20 24 34 30T64 33V36Z" fill="#f8dfa2"/><path d="M30 29Q40 31 64 31" stroke="#fff" stroke-width="1.2" fill="none"/><path d="M10 30Q12 20 16 12" stroke="#c38750" stroke-width="2" fill="none"/><path d="M16 12l-8 3M16 12l8 2M16 12l-5 -5M16 12l6 -4M16 12l1 8" stroke="#52b83a" stroke-width="2.4" stroke-linecap="round"/>`,
      neve: `<path d="M0 26L12 10L20 18L32 4L44 16L52 10L64 22V36H0Z" fill="#d8e0f8"/><path d="M12 10L16 15L10 16ZM32 4L37 11L28 10Z" fill="#fff"/><rect y="27" width="64" height="9" fill="#eaf2ff"/>` + [[6, 18], [18, 22], [50, 20], [60, 24]].map(([x, y]) => `<path d="M${x} ${y - 8}L${x - 5} ${y + 4}H${x + 5}Z" fill="#2f9a6a"/><path d="M${x} ${y - 8}L${x - 2} ${y - 4}H${x + 2}Z" fill="#fff"/>`).join(''),
      deserto: `<path d="M0 28Q16 20 34 26T64 24V36H0Z" fill="#f2c27a"/><path d="M40 24L48 12L56 24Z" fill="#e0a868"/><rect y="30" width="64" height="6" fill="#f6cf86"/><ellipse cx="14" cy="31" rx="10" ry="3" fill="#2cc0ea"/><path d="M8 30Q9 22 12 16" stroke="#c38750" stroke-width="1.6" fill="none"/><path d="M12 16l-6 2M12 16l6 1M12 16l-3 -4M12 16l4 -3" stroke="#52b83a" stroke-width="2" stroke-linecap="round"/>`,
      caverna: `<rect width="64" height="36" fill="#2a2244"/><ellipse cx="32" cy="14" rx="9" ry="8" fill="!${'#86ccff'}"/>` + [4, 14, 22, 40, 50, 58].map((x, i) => `<path d="M${x - 4} 0H${x + 4}L${x} ${8 + (i % 3) * 4}Z" fill="#3a3058"/>`).join('') + `<rect y="28" width="64" height="8" fill="#4a3e64"/><path d="M10 30L13 18L16 30ZM48 30L52 20L55 30Z" fill="!#3ad0f0"/><path d="M28 31L31 23L34 31Z" fill="!#e050c8"/>`,
      ruinas: `<path d="M0 22Q16 16 32 21T64 19V36H0Z" fill="#a6cdf2"/><rect y="27" width="64" height="9" fill="#78c850"/>` + [[10, 12], [22, 18], [44, 10], [56, 20]].map(([x, y]) => `<rect x="${x - 2.5}" y="${y}" width="5" height="${28 - y}" fill="#f4ecdc"/><rect x="${x - 3.5}" y="${y}" width="7" height="2" fill="#d8ccb8"/>`).join('') + `<path d="M28 28V20A5 5 0 0 1 38 20V28H35V21A2 2 0 0 0 31 21V28Z" fill="#d8ccb8"/>`,
      pantano: `<path d="M0 24Q20 20 36 24T64 22V36H0Z" fill="#8ab0a0"/><rect y="27" width="64" height="9" fill="#6a8a3a"/><ellipse cx="34" cy="31" rx="14" ry="3" fill="#2a4a42"/><path d="M12 30C14 24 8 20 12 12L14 13C11 20 17 24 15 30Z" fill="#6a5a4a"/><circle cx="12" cy="12" r="5" fill="#5a7a34"/><path d="M52 30C50 24 56 20 52 14L54 13C58 20 52 24 55 30Z" fill="#6a5a4a"/><circle cx="54" cy="13" r="4.5" fill="#5a7a34"/><rect y="22" width="64" height="5" fill="#e8f4e0" opacity=".35"/>`,
      vulcao: `<path d="M18 28L29 8H35L46 28Z" fill="#2a1e2a"/><ellipse cx="32" cy="8" rx="3.4" ry="1" fill="!#ff7a2a"/><path d="M31 9Q29 18 24 28" stroke="!#ff5a1a" stroke-width="1.6" fill="none"/><circle cx="34" cy="4" r="3" fill="#6a5a6a"/><circle cx="38" cy="2" r="2.4" fill="#6a5a6a"/><rect y="28" width="64" height="8" fill="#3a2e3a"/><path d="M0 33Q16 30 30 34T64 32" stroke="!#ff6a1a" stroke-width="1.6" fill="none"/>`,
      campo: `<path d="M0 24Q16 18 32 23T64 21V36H0Z" fill="#b8e0a0"/><rect y="27" width="64" height="9" fill="#8ad850"/><rect x="45" y="14" width="4" height="10" fill="#f0e0c8"/><path d="M47 15l-6 -5M47 15l6 -5M47 15l-6 5M47 15l6 5" stroke="#fff8ec" stroke-width="1.6"/>` + [[8, 31, '#ffe04a'], [14, 33, '#ff8ac0'], [22, 31, '#fff'], [52, 32, '#b08aff'], [58, 30, '#ffe04a'], [36, 33, '#ff8ac0']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${c}"/>`).join('') + `<rect x="10" y="17" width="2" height="11" fill="#8f5a34"/><circle cx="11" cy="16" r="5" fill="#4fb54a"/>`,
    };
    const st = document.createElement('style'); st.id = 'terr-thumbs';
    st.textContent = Object.entries(art).flatMap(([k, a]) => HORAS.map(h => `.bbthumb.bb-${k}-${h}{background:${gradeAll(svgUrl(64, 36, sky(h) + a, 'xMidYMid slice'), h)} center/cover}.bbthumb.bb-${k}-${h} .bbfx,.bbthumb.bb-${k}-${h}::before{display:none}`)).join('');
    document.head.appendChild(st);
  }
  if (typeof document !== 'undefined') { if (document.head) thumbs(); else addEventListener('DOMContentLoaded', thumbs); }
  const sd = ry => { const r = ry * Math.PI / 180; return SUN[0] * Math.cos(r) + SUN[2] * Math.sin(r) > 0 ? -1 : 1; }; // recortes: espelha quando o sol fica à direita na tela
  g.TERRENO3D = { montar, construir, cam, hx, sd, shore, grade, gradeAll, horaDe, HORAS, TEMAS, paleta: { SKY, SKYT, CEIL, INK, SUN, COPAS_CEL, CRIST, grade: gradeAll } };
  g.montarTerreno3D = montar;
})(globalThis);

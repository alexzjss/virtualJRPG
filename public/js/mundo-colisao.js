// ===== mundo 3D: colisão compartilhada (o cliente prevê e o servidor confere com o mesmo código) =====
// Posições em casas (contínuas): o herói é um círculo de raio R. Bloqueiam casas (denso, baixo, fundo, vazio, fora do mapa)
// e arestas (parede, grade, cerca, porta e barreira fechadas). O pulo atravessa casa "baixo" e aresta "cerca".
// Portas e barreiras são objetos { k:'porta'|'barreira', f, x, y, cfg:{ e:'h'|'v', estado } } donos da aresta (x, y).
(g => {
  const P = g.MPECAS;
  const SPEED = { a: 3.5, c: 6.3, g: 1.75 }; // casas por segundo: andar, correr (1,8×) e agachado (0,5×)
  const R = 0.3, RS = 0.15; // raio do corpo; o servidor confere com um raio menor para tolerar a diferença de arredondamento
  // portas e barreiras abertas do andar, por aresta
  const openIdx = (objs, fid) => { const s = new Set(); for (const o of Object.values(objs || {})) if (o && (o.k === 'porta' || o.k === 'barreira') && o.f === fid && o.cfg?.estado === 'aberta') s.add(o.cfg.e + o.x + ',' + o.y); return s; };
  const doorOpen = (objs, f, kind, x, y) => openIdx(objs, f.id).has(kind + x + ',' + y);
  const segDist = (px, pz, ax, az, bx, bz) => { const vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz, t = L ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / L)) : 0; return Math.hypot(px - ax - t * vx, pz - az - t * vz); };
  function blockedAt(f, open, x, z, jump, r = R) {
    for (let cz = Math.floor(z - r); cz <= Math.floor(z + r); cz++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
      const c = P.cell(f, cx, cz); if (!P.blocksWalk(c) || (jump && P.jumpable(c))) continue;
      const nx = Math.max(cx, Math.min(cx + 1, x)), nz = Math.max(cz, Math.min(cz + 1, z));
      if (Math.hypot(x - nx, z - nz) < r - 1e-9) return true;
    }
    const edge = (e, o) => P.edgeBlocksWalk(e, o) && !(jump && P.edgeJumpable(e));
    for (let X = Math.ceil(x - r); X <= Math.floor(x + r); X++) for (let cz = Math.floor(z - r); cz <= Math.floor(z + r); cz++)
      if (edge(P.edgeV(f, X, cz), open.has('v' + X + ',' + cz)) && segDist(x, z, X, cz, X, cz + 1) < r - 1e-9) return true;
    for (let Z = Math.ceil(z - r); Z <= Math.floor(z + r); Z++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++)
      if (edge(P.edgeH(f, cx, Z), open.has('h' + cx + ',' + Z)) && segDist(x, z, cx, Z, cx + 1, Z) < r - 1e-9) return true;
    return false;
  }
  // move p por (dx, dz) em passos curtos, eixo por eixo: o que bate desliza pela parede. Quem já está dentro de algo sai livre.
  function slide(f, objs, p, dx, dz, jump = false) {
    const open = openIdx(objs, f.id), n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.2)), sx = dx / n, sz = dz / n;
    let x = p.x, z = p.z;
    for (let i = 0; i < n; i++) {
      const stuck = blockedAt(f, open, x, z, jump), free = stuck && blockedAt(f, open, x, z, true), j = jump || stuck;
      if (free || !blockedAt(f, open, x + sx, z, j)) x += sx;
      if (free || !blockedAt(f, open, x, z + sz, j)) z += sz;
    }
    return { x: Math.min(f.w - 1e-3, Math.max(1e-3, x)), z: Math.min(f.h - 1e-3, Math.max(1e-3, z)) };
  }
  // o segmento a→b é andável? (servidor) Amostras a cada 0,1 casa; o trecho inicial ainda dentro de algo é tolerado (saindo de lá)
  function segOk(f, objs, a, b, jump = false) {
    if (b.x < 0 || b.z < 0 || b.x >= f.w || b.z >= f.h) return false;
    const open = openIdx(objs, f.id), n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1));
    let leaving = blockedAt(f, open, a.x, a.z, jump, RS);
    for (let i = 1; i <= n; i++) {
      const t = i / n, hit = blockedAt(f, open, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, jump, RS);
      if (hit && !leaving) return false; if (!hit) leaving = false;
    }
    return true;
  }
  g.MCOL = { SPEED, R, RS, blockedAt: (f, objs, x, z, jump, r) => blockedAt(f, openIdx(objs, f.id), x, z, jump, r), doorOpen, openIdx, slide, segOk };
})(globalThis);

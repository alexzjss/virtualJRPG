// ===== mundo 3D: linha de visão (compartilhada entre o navegador e o servidor) =====
// Uma casa é visível quando a reta do centro da origem até o centro dela não cruza aresta que corta a visão
// (parede, porta ou barreira fechadas) nem atravessa casa 'denso' (a casa densa em si aparece; a de trás não).
// A reta é a mesma nos dois sentidos, então a visão é simétrica: se A vê B, B vê A. Quando a reta passa
// exatamente por um canto, ela enxerga se um dos dois caminhos em volta do canto estiver livre.
// Script comum (sem import/export): no navegador vira window.MVIS; no servidor é importado pela config.
(g => {
  const P = g.MPECAS;
  const radius = (hora, tema, torch) => (tema === 'caverna' || hora === 'noite' ? 4 : hora === 'tarde' ? 6 : 8) + (torch ? 2 : 0);
  // portas e barreiras abertas do andar: 'v4,5' / 'h2,3' (a mesma chave da colisão)
  const openIdx = (objs, fid) => { const s = new Set(); for (const o of Object.values(objs || {})) if (o && (o.k === 'porta' || o.k === 'barreira') && o.f === fid && o.cfg?.estado === 'aberta') s.add(o.cfg.e + o.x + ',' + o.y); return s; };
  function ray(f, open, x0, z0, x1, z1) {
    const vB = (X, z) => P.edgeBlocksSight(P.edgeV(f, X, z), open.has('v' + X + ',' + z)); // aresta vertical na coluna X, linha z
    const hB = (x, Z) => P.edgeBlocksSight(P.edgeH(f, x, Z), open.has('h' + x + ',' + Z)); // aresta horizontal na linha Z, coluna x
    const dense = (x, z) => P.blocksSight(P.cell(f, x, z));
    const sx = Math.sign(x1 - x0), sz = Math.sign(z1 - z0), ax = Math.abs(x1 - x0), az = Math.abs(z1 - z0);
    let cx = x0, cz = z0, k = 1, m = 1;
    while (cx !== x1 || cz !== z1) {
      // próxima travessia: linha vertical k em t=(2k-1)/(2ax), horizontal m em t=(2m-1)/(2az); compara em inteiros
      const tv = k <= ax ? (2 * k - 1) * az : Infinity, th = m <= az ? (2 * m - 1) * ax : Infinity;
      const X = sx > 0 ? cx + 1 : cx, Z = sz > 0 ? cz + 1 : cz;
      if (tv < th) { if (vB(X, cz)) return false; cx += sx; k++; }
      else if (th < tv) { if (hB(cx, Z)) return false; cz += sz; m++; }
      else { // canto: passa por (cx+sx, cz) ou por (cx, cz+sz)
        const a = vB(X, cz) || dense(cx + sx, cz) || hB(cx + sx, Z), b = hB(cx, Z) || dense(cx, cz + sz) || vB(X, cz + sz);
        if (a && b) return false; cx += sx; cz += sz; k++; m++;
      }
      if ((cx !== x1 || cz !== z1) && dense(cx, cz)) return false;
    }
    return true;
  }
  function fov(f, objs, cx, cy, r) {
    const out = new Uint8Array(f.w * f.h); if (cx < 0 || cy < 0 || cx >= f.w || cy >= f.h) return out;
    const open = openIdx(objs, f.id), R = Math.ceil(r), r2 = r * r;
    for (let y = Math.max(0, cy - R); y <= Math.min(f.h - 1, cy + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(f.w - 1, cx + R); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2 && ray(f, open, cx, cy, x, y)) out[y * f.w + x] = 1;
    out[cy * f.w + cx] = 1;
    return out;
  }
  const orBits = (a, b) => { for (let i = 0; i < a.length; i++) a[i] |= b[i]; return a; };
  // 8 casas por byte (a névoa de um andar 64×64 viaja em ~700 caracteres)
  const toB64 = bits => { const u = new Uint8Array(Math.ceil(bits.length / 8)); for (let i = 0; i < bits.length; i++) if (bits[i]) u[i >> 3] |= 1 << (i & 7); return P.pack(u); };
  const fromB64 = (s, n) => { const u = P.unpack(s, Math.ceil(n / 8)), out = new Uint8Array(n); for (let i = 0; i < n; i++) out[i] = (u[i >> 3] >> (i & 7)) & 1; return out; };
  g.MVIS = { radius, fov, ray, orBits, toB64, fromB64 };
})(typeof window !== 'undefined' ? window : globalThis);

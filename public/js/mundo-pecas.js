// ===== mundo 3D: tabela de pisos e arestas (compartilhada entre o navegador e o servidor) =====
// Cada casa guarda um byte: 0 = abismo; 1 + tema*8 + tipo. As paredes ficam nas arestas entre as casas:
// wallH (w × (h+1)) é a borda de cima de cada casa e wallV ((w+1) × h) a da esquerda. Tudo viaja em base64.
// Script comum (sem import/export): no navegador vira window.MPECAS; no servidor é importado pelo efeito.
(g => {
  const TEMAS = ['floresta', 'castelo', 'praia', 'neve', 'deserto', 'caverna', 'ruinas', 'pantano', 'vulcao', 'campo'];
  const TIPOS = ['chao', 'trilha', 'denso', 'baixo', 'agua', 'fundo', 'perigo', 'vazio'];
  const ARESTA = { nada: 0, parede: 1, porta: 2, barreira: 3, grade: 4, cerca: 5 };
  const code = (tema, tipo) => { const a = TEMAS.indexOf(tema), b = TIPOS.indexOf(tipo); return a < 0 || b < 0 ? 0 : 1 + a * 8 + b; };
  const decode = c => !c || c > TEMAS.length * 8 ? null : { tema: TEMAS[Math.floor((c - 1) / 8)], tipo: TIPOS[(c - 1) % 8] };
  const tipoOf = c => decode(c)?.tipo || 'vazio';
  const pack = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const unpack = (s, len) => { const u = new Uint8Array(len); let b = ''; try { b = atob(String(s || '')); } catch {} for (let i = 0; i < len && i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  // arrays decodificados em cache no próprio andar (não enumeráveis: ficam fora do JSON); a chave confere a string atual
  const cache = (f, k, src, len) => { const c = f['_' + k]; if (c && c.src === f[src]) return c.u; const u = unpack(f[src], len); Object.defineProperty(f, '_' + k, { value: { src: f[src], u }, configurable: true, enumerable: false, writable: true }); return u; };
  const cells = f => cache(f, 'c', 'cell', f.w * f.h);
  const hEdges = f => cache(f, 'h', 'wallH', f.w * (f.h + 1));
  const vEdges = f => cache(f, 'v', 'wallV', (f.w + 1) * f.h);
  const newFloor = (id, name, w, h, tema) => ({ id, name, w, h, cell: pack(new Uint8Array(w * h).fill(code(tema, 'chao'))), wallH: pack(new Uint8Array(w * (h + 1))), wallV: pack(new Uint8Array((w + 1) * h)), img: null });
  const cell = (f, x, y) => x < 0 || y < 0 || x >= f.w || y >= f.h ? 0 : cells(f)[y * f.w + x];
  const edgeH = (f, x, y) => x < 0 || y < 0 || x >= f.w || y > f.h ? 1 : hEdges(f)[y * f.w + x]; // fora do mapa conta como parede
  const edgeV = (f, x, y) => x < 0 || y < 0 || x > f.w || y >= f.h ? 1 : vEdges(f)[y * (f.w + 1) + x];
  const BLOCK = new Set(['denso', 'baixo', 'fundo', 'vazio']);
  const blocksWalk = c => !c || BLOCK.has(tipoOf(c));
  const jumpable = c => tipoOf(c) === 'baixo';
  const blocksSight = c => tipoOf(c) === 'denso';
  const edgeBlocksWalk = (e, open) => e === 1 || e === 4 || e === 5 || ((e === 2 || e === 3) && !open); // porta e barreira abertas deixam passar
  const edgeBlocksSight = (e, open) => e === 1 || ((e === 2 || e === 3) && !open);
  const edgeJumpable = e => e === 5;
  g.MPECAS = { TEMAS, TIPOS, ARESTA, code, decode, tipoOf, pack, unpack, cells, hEdges, vEdges, newFloor, cell, edgeH, edgeV, blocksWalk, jumpable, blocksSight, edgeBlocksWalk, edgeBlocksSight, edgeJumpable };
})(globalThis);

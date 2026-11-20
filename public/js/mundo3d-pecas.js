// ===== mundo 3D: peças do andar (chão, blocos, paredes) =====
// Esqueleto (Task 2.1): chão plano por andar, com a imagem do mapa migrado (img + crop) ou uma cor, e cubos de teste nas casas
// que bloqueiam o passo. As peças por tema, os blocos de 16×16 e o cutaway chegam na Task 2.2.
const P = () => globalThis.MPECAS;
const IMG = new Map(); // url → Promise<canvas>: a imagem rasterizada uma vez (SVG só com viewBox não sobe direto para a GPU)
const MAXPX = 2048;
function raster(url) {
  if (!IMG.has(url)) IMG.set(url, new Promise((ok, no) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => { const k = MAXPX / Math.max(im.naturalWidth || 1, im.naturalHeight || 1), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round((im.naturalWidth || 1) * k)); cv.height = Math.max(1, Math.round((im.naturalHeight || 1) * k)); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ok(cv); };
    im.onerror = no; im.src = url;
  }));
  return IMG.get(url);
}
// o chão começa na cor do tema e ganha a imagem (recortada pelo crop) quando ela chega
function paintImg(T, mat, img) {
  raster(img.url).then(cv => {
    const t = new T.CanvasTexture(cv), c = img.crop || { x: 0, y: 0, w: 1, h: 1 };
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.repeat.set(c.w, c.h); t.offset.set(c.x, 1 - c.y - c.h);
    mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true;
  }).catch(() => console.warn('Mundo 3D: imagem do mapa não carregou', img.url));
}
export function buildFloor(T, f, w, pal) {
  const g = new T.Group(); g.name = 'andar:' + f.id;
  const geo = new T.PlaneGeometry(f.w, f.h); geo.rotateX(-Math.PI / 2); geo.translate(f.w / 2, 0, f.h / 2);
  const mat = new T.MeshBasicMaterial({ color: 0x5a7a4a });
  if (f.img?.url) paintImg(T, mat, f.img);
  const chao = new T.Mesh(geo, mat); chao.name = 'chao'; g.add(chao);
  // cubos de teste: um InstancedMesh com todas as casas que bloqueiam o passo
  const cells = [], p = P();
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (p.blocksWalk(p.cell(f, x, y)) && p.cell(f, x, y)) cells.push([x, y]);
  if (cells.length) {
    const box = new T.BoxGeometry(1, 1, 1); box.translate(.5, .5, .5);
    const im = new T.InstancedMesh(box, new T.MeshLambertMaterial({ color: 0x8a8070 }), cells.length), m = new T.Matrix4();
    cells.forEach(([x, y], i) => { m.makeTranslation(x, 0, y); im.setMatrixAt(i, m); });
    im.name = 'blocos'; g.add(im);
  }
  return g;
}
export function setCutaway() {} // Task 2.2

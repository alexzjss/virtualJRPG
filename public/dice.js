// Dois d10 em 3D (dezena + unidade) que caem mostrando o resultado do d100.
import * as T from '/vendor/three.module.js';
let R, scene, cam, dice, raf, t0;

function d10(color, ink, labels) {
  const h = .105, up = [], lo = [], pos = [], uv = [], g = new T.BufferGeometry(), mats = [], normals = [];
  for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5, b = a + Math.PI / 5; up.push([Math.cos(a), Math.sin(a), h]); lo.push([Math.cos(b), Math.sin(b), -h]); }
  const kite = (ap, a, far, b) => {
    const i = mats.length, c = document.createElement('canvas'), x = c.getContext('2d');
    pos.push(...ap, ...a, ...far, ...ap, ...far, ...b); uv.push(.5, 1, 0, .4, .5, 0, .5, 1, .5, 0, 1, .4); g.addGroup(i * 6, 6, i);
    const V = p => new T.Vector3(...p), n = V(far).sub(V(ap)).cross(V(b).sub(V(a))).normalize(); // normal real da face
    normals.push(n.dot(V(far)) < 0 ? n.negate() : n);
    c.width = c.height = 128; x.fillStyle = color; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = ink; x.lineWidth = 5; x.beginPath(); x.moveTo(64, 0); x.lineTo(0, 77); x.lineTo(64, 128); x.lineTo(128, 77); x.closePath(); x.stroke();
    x.fillStyle = ink; x.font = '900 44px Impact,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(labels[i], 64, 72);
    mats.push(new T.MeshLambertMaterial({ map: new T.CanvasTexture(c), side: T.DoubleSide }));
  };
  for (let k = 0; k < 5; k++) { kite([0, 0, 1], up[k], lo[k], up[(k + 1) % 5]); kite([0, 0, -1], lo[k], up[(k + 1) % 5], lo[(k + 1) % 5]); }
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  const m = new T.Mesh(g, mats); m.userData.normals = normals;
  return m;
}

function init() {
  R = new T.WebGLRenderer({ alpha: true, antialias: true });
  Object.assign(R.domElement.style, { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 });
  document.body.append(R.domElement);
  scene = new T.Scene(); cam = new T.PerspectiveCamera(40, 1, .1, 50); cam.position.z = 8;
  scene.add(new T.AmbientLight(0xffffff, 1.6)); const l = new T.DirectionalLight(0xffffff, 2); l.position.set(2, 4, 6); scene.add(l);
  dice = [d10('#e60012', '#fff', ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']), d10('#f4f4f4', '#0b0b0d', [...'0123456789'])];
  dice.forEach((d, i) => { d.position.x = i ? 1.3 : -1.3; scene.add(d); });
}

export function roll(n) {
  if (!R) init();
  const faces = [Math.floor(n % 100 / 10), n % 10], Z = new T.Vector3(0, 0, 1);
  R.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  R.domElement.style.display = '';
  dice.forEach((d, i) => { d.userData.end = new T.Quaternion().setFromUnitVectors(d.userData.normals[faces[i]], Z); d.userData.axis = new T.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(); });
  cancelAnimationFrame(raf); t0 = performance.now();
  const frame = now => {
    const t = Math.min(1, (now - t0) / 900), e = 1 - (1 - t) ** 3;
    dice.forEach(d => { d.quaternion.copy(d.userData.end).premultiply(new T.Quaternion().setFromAxisAngle(d.userData.axis, (1 - e) * 14)); d.position.y = (1 - e) * 4 + Math.abs(Math.sin(e * Math.PI * 2)) * (1 - e) * 1.5; });
    R.render(scene, cam);
    if (now - t0 < 2000) raf = requestAnimationFrame(frame); else R.domElement.style.display = 'none';
  };
  raf = requestAnimationFrame(frame);
}

// ===== mundo 3D: luz, céu e efeitos =====
// Esqueleto (Task 2.1): luz ambiente, um sol e a cor do céu pela hora. Clima, névoa, tocha e estilhaço chegam nas Tasks 2.4 e 6.3.
const CEU = { dia: 0x86ccff, tarde: 0xff9a5a, noite: 0x121e4a };
export class Fx {
  constructor(T, scene, renderer) {
    this.T = T; this.scene = scene; this.renderer = renderer;
    this.amb = new T.HemisphereLight(0xffffff, 0x445544, 1.6); scene.add(this.amb);
    this.sol = new T.DirectionalLight(0xffffff, 1.4); this.sol.position.set(-8, 14, 6); scene.add(this.sol, this.sol.target);
  }
  setWorld(w) { this.renderer.setClearColor(CEU[w?.hora] ?? CEU.dia); }
  sync() {}
  update(now, dt, cam, f) { if (f) { this.sol.target.position.set(f.w / 2, 0, f.h / 2); this.sol.position.set(f.w / 2 - 8, 14, f.h / 2 + 6); } }
}

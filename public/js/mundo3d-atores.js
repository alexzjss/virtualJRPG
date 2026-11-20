// ===== mundo 3D: atores (heróis, inimigos e NPCs no mapa) =====
// Esqueleto (Task 2.1): um marcador simples por personagem da cena. Os recortes 2D (billboards), a sombra e o balanço chegam na Task 2.3.
export class Actors {
  constructor(T, root) { this.T = T; this.root = root; this.g = new T.Group(); this.g.name = 'atores'; root.add(this.g); this.m = new Map(); this.f = null; }
  setFloor(f) { this.f = f; }
  sync(S, f) {
    const T = this.T, ids = new Set();
    for (const ch of Object.values(S.chars || {})) {
      if (ch.scene !== S.scene || !ch.pos || ch.pos.f !== f?.id) continue;
      ids.add(ch.id);
      if (!this.m.has(ch.id)) { const o = new T.Mesh(new T.CylinderGeometry(.28, .28, 1.4, 12), new T.MeshLambertMaterial({ color: ch.enemy ? 0xd04040 : 0x40a0e0 })); o.position.y = .7; this.g.add(o); this.m.set(ch.id, o); }
    }
    for (const [id, o] of this.m) if (!ids.has(id)) { this.g.remove(o); o.geometry.dispose(); o.material.dispose(); this.m.delete(id); }
  }
  update(S, f, now) {
    for (const [id, o] of this.m) { const p = globalThis.MINPUT?.poseOf?.(id, now) || S.chars[id]?.pos; if (p) o.position.set(p.x, .7, p.z); }
  }
  height() { return 1.6; }
}

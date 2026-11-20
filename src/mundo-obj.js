// ===== mundo 3D: interagir com objetos do mapa (portas, baús, itens, placas…) =====
// interact {id, obj, opt}: o herói precisa estar no mesmo andar, a até 1,5 casa do objeto, vendo a casa dele (névoa) e o objeto não pode
// estar oculto. Quem decide se vira pedido é o net.js (gateOf → hooks.interGate): auto=false sempre pede; null segue S.auto.inter.
import { S, log } from './state.js';
import { H } from './handlers.js';
import { can } from './rules.js';
import { GM } from './config.js';
import { hooks, wss } from './net.js';
import { MH, unstuck } from './mundo.js';

const EDGE = new Set(['porta', 'barreira']);
const objOf = m => { const ch = S.chars[m?.id], sc = S.scenes[ch?.scene]; return { ch, sc, o: sc?.world?.objs?.[m?.obj] }; };
// ponto do objeto: o meio da aresta (porta e barreira) ou o centro da casa
const pointOf = o => EDGE.has(o.k) ? (o.cfg?.e === 'h' ? [o.x + .5, o.y] : [o.x, o.y + .5]) : [o.x + .5, o.y + .5];
// casas de onde o objeto aparece: os dois lados da aresta, ou a própria casa
const cellsOf = o => EDGE.has(o.k) ? (o.cfg?.e === 'h' ? [[o.x, o.y], [o.x, o.y - 1]] : [[o.x, o.y], [o.x - 1, o.y]]) : [[o.x, o.y]];
function reach(ch, sc, o) {
  if (!ch?.pos || !o || o.f !== ch.pos.f || ((o.vis === 'oculto' || o.k === 'armadilha') && !o.rev)) return false;
  const [px, pz] = pointOf(o); if (Math.hypot(ch.pos.x - px, ch.pos.z - pz) > 1.5 + 1e-9) return false;
  const vis = MH.visNow(ch.scene), b = vis?.[o.f], f = sc.world.floors.find(x => x.id === o.f); if (!vis) return true;
  return !!b && !!f && cellsOf(o).some(([x, y]) => x >= 0 && y >= 0 && x < f.w && y < f.h && b[y * f.w + x] === 1);
}
// teste de atributo pelo mesmo caminho da rolagem comum (vai para o log); a dificuldade é o que se tira do atributo
function teste(c, ch, t, mod) {
  if (!t?.atr) return true;
  const n = S.log.length; H.roll(c, { id: ch.id, attr: t.atr, mod: (Number(mod) || 0) - (t.dif || 0) });
  const e = S.log.slice(n).find(x => x.rr?.c === ch.id); return !!e && /Sucesso|CRÍTICO/.test(e.rr.res);
}
const ganho = (ch, itens, ouro) => {
  const got = []; for (const { id, n } of itens || []) if (Object.hasOwn(S.items, id)) { ch.inv[id] = (ch.inv[id] || 0) + n; got.push(`${S.items[id].name}${n > 1 ? ' ×' + n : ''}`); }
  if (ouro > 0) { ch.gold += ouro; got.unshift(`${ouro} de ouro`); }
  return got;
};
// placa: só quem leu recebe (o cliente que mandou ou, num pedido aprovado, as telas do dono)
function soPara(c, msg) {
  const out = JSON.stringify(msg);
  if (typeof c.send === 'function' && c.readyState === 1) return c.send(out);
  wss.clients.forEach(x => x.role === 'player' && x.name === c.name && x.readyState === 1 && x.send(out));
}
const portaMuda = (sc, sid) => { unstuck(sc); MH.vision(sid); };
const objActs = {
  porta(c, ch, o, m, sc) {
    const cf = o.cfg;
    if (cf.estado === 'trancada') {
      if (cf.chave && ch.inv[cf.chave] > 0) { if (cf.gasta && --ch.inv[cf.chave] <= 0) delete ch.inv[cf.chave]; cf.estado = 'aberta'; log(ch.name, `destrancou a porta com ${S.items[cf.chave]?.name || 'a chave'}.`, 'ok'); }
      else if (cf.teste?.atr) { if (teste(c, ch, cf.teste, m.mod)) { cf.estado = 'aberta'; log(ch.name, 'forçou a porta trancada.', 'ok'); } else return; }
      else return void log(ch.name, 'a porta está trancada.', 'bad');
    } else cf.estado = cf.estado === 'aberta' ? 'fechada' : 'aberta';
    portaMuda(sc, ch.scene);
  },
  barreira(c, ch, o, m, sc) { if (c.role !== 'gm') return; o.cfg.estado = o.cfg.estado === 'aberta' ? 'fechada' : 'aberta'; portaMuda(sc, ch.scene); }, // só alavanca, gatilho ou mestre
  bau(c, ch, o, m) {
    const cf = o.cfg; if (cf.modo === 'cada' ? cf.por?.[ch.id] : cf.aberto) return;
    if (!teste(c, ch, cf.teste, m.mod)) return;
    if (cf.modo === 'cada') cf.por = { ...cf.por, [ch.id]: 1 }; else cf.aberto = true;
    const got = ganho(ch, cf.itens, cf.ouro || 0); log(ch.name, got.length ? `abriu o baú: ${got.join(', ')}.` : 'abriu o baú: vazio.', 'ok');
  },
  item(c, ch, o, m, sc) {
    const got = ganho(ch, [{ id: o.cfg.item, n: Math.max(1, o.cfg.qtd || 1) }], 0); delete sc.world.objs[m.obj]; if (sc.draft?.objs) delete sc.draft.objs[m.obj]; // some também do rascunho, senão volta ao publicar
    if (got.length) log(ch.name, `pegou ${got.join(', ')}.`, 'ok');
  },
  placa(c, ch, o) {
    const text = String(o.cfg.texto || ''), img = String(o.cfg.imagem || '');
    soPara(c, { t: 'placa', text, img }); log(ch.name, `leu a placa: "${text.slice(0, 80)}"`, '', { to: GM });
  },
};
H.interact = (c, m) => {
  const { ch, sc, o } = objOf(m); if (!can(c, ch) || !sc?.world || !objActs[o?.k] || S.scenes[ch.scene]?.battle?.active) return;
  if (!reach(ch, sc, o)) return;
  objActs[o.k](c, ch, o, m, sc);
};
// pedido: auto=true nunca pede; false sempre; null segue S.auto.inter
hooks.interGate = m => { const { o } = objOf(m); return !o || o.auto === true || (o.auto == null && S.auto.inter) ? null : 'inter'; };
const VERBO = { porta: 'abrir a porta', barreira: 'mexer na barreira', bau: 'abrir o baú', item: 'pegar', placa: 'ler a placa', npc: 'falar com', alavanca: 'puxar a alavanca', escada: 'usar a escada', portal: 'atravessar o portal' };
hooks.interText = m => { const { o } = objOf(m); if (!o) return 'interagir'; const v = VERBO[o.k] || 'interagir'; return o.k === 'item' ? `${v} ${S.items[o.cfg?.item]?.name || 'o item'}` : o.k === 'npc' ? `${v} ${o.cfg?.nome || 'o NPC'}` : v; };

export { objActs, reach };

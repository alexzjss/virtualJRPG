// ===== mundo 3D: interagir com objetos do mapa (portas, baús, itens, placas…) =====
// interact {id, obj, opt}: o herói precisa estar no mesmo andar, a até 1,5 casa do objeto, vendo a casa dele (névoa) e o objeto não pode
// estar oculto. Quem decide se vira pedido é o net.js (gateOf → hooks.interGate): auto=false sempre pede; null segue S.auto.inter.
import { S, inScene, log } from './state.js';
import { H, passReq } from './handlers.js';
import { applySt, at, can, d100, hurt } from './rules.js';
import { GM, MUNDO, RU } from './config.js';
import { hooks, push, wss } from './net.js';
import { MH, floorOf, place, unstuck } from './mundo.js';

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
let pend = false; const later = () => { if (pend) return; pend = true; queueMicrotask(() => { pend = false; push(false); }); }; // andar é QUIET: o que muda o state pede push
// casa livre mais perto de (x, y): sem peça/aresta bloqueando e sem outro personagem em cima (anéis crescentes)
function livre(sc, f, x0, y0, ch) {
  const C = globalThis.MCOL, busy = new Set(Object.values(S.chars).filter(o => o !== ch && o.scene === ch.scene && o.pos?.f === f.id).map(o => o.x + ',' + o.y));
  const ok = (x, y) => x >= 0 && y >= 0 && x < f.w && y < f.h && !busy.has(x + ',' + y) && !C.blockedAt(f, sc.world.objs, x + .5, y + .5, false);
  for (let r = 0; r < Math.max(f.w, f.h); r++) for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) if (Math.max(Math.abs(x - x0), Math.abs(y - y0)) === r && ok(x, y)) return [x, y];
  return [Math.min(f.w - 1, Math.max(0, x0)), Math.min(f.h - 1, Math.max(0, y0))];
}
// chegada numa cena do 3D: objeto de destino, senão o "surgir" da cena, senão o centro do primeiro andar
function arrive(ch, sc, dest) {
  const w = sc.world, o = (dest && w.objs[dest]) || Object.values(w.objs).find(v => v?.k === 'surgir'), f = (o && floorOf(sc, o.f)) || w.floors[0]; if (!f) return;
  const [x, y] = livre(sc, f, o ? o.x : Math.floor(f.w / 2), o ? o.y : Math.floor(f.h / 2), ch); place(ch, sc, f, x + .5, y + .5, ch.pos?.d);
}
const moveTo0 = H.moveTo;
H.moveTo = (c, m) => { // a passagem de cena (saída 2D, portal ou mestre) põe o herói no lugar certo do 3D
  moveTo0(c, m); if (c.role !== 'gm' || !m?.scene) return;
  const sc = S.scenes[m.scene]; if (!sc?.world || !(m.dest || MUNDO || !sc.world.legacy)) return;
  for (const id of Array.isArray(m.ids) ? m.ids : []) { const ch = S.chars[id]; if (ch?.scene === m.scene && !ch.enemy) inScene(m.scene, () => arrive(ch, sc, m.dest)); }
};
// ----- armadilhas: percepção passiva (SAB, uma vez por herói) a até 2 casas e esquiva (AGI) ao pisar -----
const alvo = (ch, a, dif) => Math.min(95, Math.max(1, at(ch, a) - (dif || 0))); // dificuldade sai do atributo, como nos testes de porta e baú
function pisou(ch, sc) {
  if (!sc?.world || ch.enemy || ch.npc || ch.summon || !ch.pos || sc.battle?.active) return;
  const sid = ch.scene;
  for (const [id, t] of Object.entries(sc.world.objs)) {
    if (t?.k !== 'armadilha' || t.f !== ch.pos.f) continue;
    if (!t.rev && !t.cfg.tent?.[ch.id] && Math.max(Math.abs(t.x - ch.x), Math.abs(t.y - ch.y)) <= 2) {
      const tg = alvo(ch, 'SAB', t.cfg.perc), r = d100(); t.cfg.tent = { ...t.cfg.tent, [ch.id]: 1 };
      log(ch.name, `Percepção SAB ${tg}% → ${r}: ${r <= tg ? 'percebeu uma armadilha' : 'não percebeu nada'}`, r <= tg ? 'ok' : '', { to: GM });
      if (r <= tg) { t.rev = true; log(ch.name, 'percebeu uma armadilha!', 'ok'); later(); }
    }
    if (t.x !== ch.x || t.y !== ch.y) continue;
    const tg = alvo(ch, 'AGI', t.cfg.esq), r = d100(), ok = r <= tg, res = r <= Math.max(1, Math.floor(tg / 10)) ? 'CRÍTICO' : ok ? 'Sucesso' : r >= 96 ? 'DESASTRE' : 'Falha';
    const dano = ok ? Math.floor((t.cfg.dano || 0) / 2) : t.cfg.dano || 0, cond = !ok && t.cfg.cond && Object.hasOwn(RU.ST, t.cfg.cond) ? t.cfg.cond : '';
    const note = inScene(sid, () => { const n = dano > 0 ? hurt(ch, dano) || '' : ''; if (cond) applySt(ch, cond); return n; });
    log(ch.name, `Armadilha! Esquiva AGI ${tg}% → ${r}: ${res}. ${dano} de dano${cond ? ' e ' + (RU.ST[cond]?.n || RU.ST[cond] || cond) : ''}.${note || ''}`, ok ? 'ok' : 'bad', { d: r, rr: { l: 'Esquiva · AGI', t: tg, res, c: ch.id } });
    if (t.cfg.rearma) t.rev = true; else { delete sc.world.objs[id]; if (sc.draft?.objs) delete sc.draft.objs[id]; }
    later();
  }
}
// pisos 'perigo' (lava, veneno): 3% do HP máximo por segundo, no mínimo 1, fora da batalha
function perigoTick() {
  let hit = false; const P = globalThis.MPECAS;
  for (const [sid, sc] of Object.entries(S.scenes)) {
    if (!sc?.world || sc.battle?.active) continue;
    for (const ch of Object.values(S.chars)) {
      if (ch.scene !== sid || ch.enemy || ch.summon || !ch.pos || ch.x == null || !(ch.hp > 0)) continue;
      const f = floorOf(sc, ch.pos.f); if (!f || P.tipoOf(P.cell(f, ch.x, ch.y)) !== 'perigo') continue;
      inScene(sid, () => hurt(ch, Math.max(1, Math.round(ch.hpMax * .03)))); hit = true;
    }
  }
  if (hit) push(false);
}
const tick = setInterval(() => { try { perigoTick(); } catch (e) { console.error('Falha no dano de perigo:', e); } }, 1000); tick.unref?.();
const heroesIn = sid => Object.values(S.chars).filter(o => o.scene === sid && !o.enemy && !o.npc && !o.summon && o.pos && o.x != null);
const toAll = (sid, msg) => { const out = JSON.stringify(msg); wss.clients.forEach(x => x.readyState === 1 && (x.role === 'gm' || x.role === 'table' || (x.role === 'player' && heroesIn(sid).some(h => h.owner === x.name))) && x.send(out)); };
// abrir, fechar ou alternar portas e barreiras; mostrar, ocultar ou alternar os outros objetos. Devolve true se mexeu em porta/barreira
function aplicar(sc, sid, id, acao) {
  const o = sc.world.objs[id]; if (!o) return false;
  if (EDGE.has(o.k)) { const ab = acao === 'abrir' || (acao === 'alternar' && o.cfg.estado !== 'aberta'); o.cfg.estado = ab ? 'aberta' : 'fechada'; return true; }
  const mostra = acao === 'abrir' || (acao === 'alternar' && o.vis === 'oculto'); o.vis = mostra ? 'visivel' : 'oculto'; if (mostra) o.rev = true; else delete o.rev; return false;
}
// ----- diálogo de NPC: quem abriu escolhe; heróis a até 3 casas do NPC veem só leitura; o mestre acompanha -----
const DLG = () => S.dlg || Object.defineProperty(S, 'dlg', { value: {}, enumerable: false, writable: true, configurable: true }).dlg; // fora do state e do save
function dlgSend(sid, d, extra = {}) {
  const sc = S.scenes[sid], o = sc?.world?.objs?.[d.obj], no = o?.cfg?.dialogo?.nos?.[d.no], by = S.chars[d.by]; if (!o) return;
  const [px, pz] = pointOf(o), perto = new Set(heroesIn(sid).filter(h => h.pos.f === o.f && Math.hypot(h.pos.x - px, h.pos.z - pz) <= 3 + 1e-9).map(h => h.owner));
  const base = { t: 'dlg', sc: sid, obj: d.obj, nome: o.cfg.nome || 'NPC', retrato: o.cfg.retrato || '', by: d.by, fala: no?.fala || '', escolhas: (no?.escolhas || []).map(e => e.txt), extra: d.extra || [], ...extra };
  wss.clients.forEach(x => {
    if (x.readyState !== 1) return; const dono = x.role === 'player' && x.name === by?.owner;
    if (x.role === 'gm' || dono || (x.role === 'player' && perto.has(x.name))) x.send(JSON.stringify({ ...base, ro: !dono }));
  });
}
function dlgEnd(sid) { const d = DLG()[sid]; if (!d) return; dlgSend(sid, d, { fim: true }); delete DLG()[sid]; }
// o que uma escolha faz: loja, item:<id>, gatilho:<id>, objetivo:<texto>, fim (devolve true para encerrar)
function faz(sc, sid, ch, f) {
  const [k, ...r] = String(f || '').split(':'), v = r.join(':');
  if (k === 'loja') { sc.shop.open = true; log(ch.name, 'abriu a loja.', 'ok'); }
  else if (k === 'item') { const got = ganho(ch, [{ id: v, n: 1 }], 0); if (got.length) log(ch.name, 'recebeu ' + got.join(', ') + '.', 'ok'); }
  else if (k === 'gatilho') { const t = sc.world.objs[v]; if (t?.k === 'gatilho') disparar(sc, sid, t); }
  else if (k === 'objetivo') sc.world.goal = v.slice(0, 120);
  return k === 'fim';
}
// ----- gatilho: ações ao pisar na zona -----
const revela = (sc, fid, casas) => {
  const f = sc.world.floors.find(x => x.id === fid), V = globalThis.MVIS; if (!f) return;
  const b = V.fromB64(sc.seenW?.[fid] || '', f.w * f.h); for (const [x, y] of casas || []) if (x < f.w && y < f.h) b[y * f.w + x] = 1;
  sc.seenW = { ...sc.seenW, [fid]: V.toB64(b) };
};
function disparar(sc, sid, t) {
  if (t.cfg.vezes === 'uma') { if (t.cfg.usado) return; t.cfg.usado = true; }
  let portas = false;
  for (const a of t.cfg.acoes || []) {
    if (a.k === 'abrir' || a.k === 'fechar') portas = aplicar(sc, sid, a.alvo, a.k) || portas;
    else if (a.k === 'revelar') { const o = sc.world.objs[a.alvo]; if (o) { o.rev = true; if (o.vis === 'oculto') o.vis = 'visivel'; } else revela(sc, t.f, t.cfg.casas); }
    else if (a.k === 'texto' && a.v) log('Narração', a.v, '', { sc: sid });
    else if (a.k === 'som' && a.v) toAll(sid, { t: 'sfx', k: String(a.v).slice(0, 40) });
    else if (a.k === 'objetivo') sc.world.goal = String(a.v || '').slice(0, 120);
    else if (a.k === 'batalha') MH.ambush?.(sid, a.v, t.cfg.casas, t.f);
  }
  if (portas) portaMuda(sc, sid);
}
// o herói trocou de casa: gatilhos da casa nova (quem=todos espera todos os heróis da cena dentro da zona)
function zoneEnter(ch, sc) {
  if (!sc?.world || ch.enemy || ch.npc || ch.summon || !ch.pos) return;
  const sid = ch.scene, dentro = (t, h) => h.pos?.f === t.f && t.cfg.casas.some(([x, y]) => x === h.x && y === h.y);
  for (const t of Object.values(sc.world.objs)) {
    if (t?.k !== 'gatilho' || !dentro(t, ch) || (t.cfg.vezes === 'uma' && t.cfg.usado)) continue;
    if (t.cfg.quem === 'todos' && !heroesIn(sid).every(h => dentro(t, h))) continue;
    disparar(sc, sid, t);
  }
}
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
  npc(c, ch, o, m, sc) {
    const sid = ch.scene, D = DLG(), d = D[sid], dg = o.cfg.dialogo;
    if (!d || d.obj !== m.obj) { if (d) dlgEnd(sid); if (!dg?.nos?.[dg.ini]) return; D[sid] = { obj: m.obj, by: ch.id, no: dg.ini, extra: [] }; return dlgSend(sid, D[sid]); }
    if (d.by !== ch.id) return;
    const e = Number.isInteger(m.opt) ? dg.nos[d.no]?.escolhas?.[m.opt] : null; if (!e) return dlgSend(sid, d);
    const fim = faz(sc, sid, ch, e.faz);
    if (fim || !e.vai || !dg.nos[e.vai]) return dlgEnd(sid);
    d.no = e.vai; d.extra = []; dlgSend(sid, d);
  },
  alavanca(c, ch, o, m, sc) {
    let portas = false; for (const id of o.cfg.alvos || []) portas = aplicar(sc, ch.scene, id, o.cfg.acao) || portas;
    o.cfg.estado = o.cfg.estado === 'ligada' ? 'desligada' : 'ligada'; log(ch.name, 'puxou a alavanca.', '');
    if (portas) portaMuda(sc, ch.scene);
  },
  escada(c, ch, o, m, sc) {
    const p = o.cfg.para, f = p && floorOf(sc, p.f); if (!f) return;
    const [x, y] = livre(sc, f, Math.min(p.x, f.w - 1), Math.min(p.y, f.h - 1), ch); place(ch, sc, f, x + .5, y + .5, ch.pos.d); ch._b = undefined;
    log(ch.name, `foi para ${f.name}.`, '');
  },
  portal(c, ch, o) { if (o.cfg.to && o.cfg.to !== ch.scene && S.scenes[o.cfg.to]) passReq(c, ch, o.cfg.to, o.cfg.destino || ''); },
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
hooks.interGate = m => {
  const { ch, o } = objOf(m), d = ch && S.dlg?.[ch.scene]; if (o?.k === 'npc' && d?.obj === m.obj && d.by === ch.id) return null; // escolher dentro da conversa já aprovada não pede de novo
  return !o || o.auto === true || (o.auto == null && S.auto.inter) ? null : 'inter';
};
// o mestre põe uma fala extra na caixa do diálogo aberto (fala como o NPC); o dono ou o mestre encerram
H.dlgSay = (c, m) => { const d = S.dlg?.[m.sc]; if (c.role !== 'gm' || !d) return; d.extra = [...(d.extra || []), String(m.text || '').slice(0, 300)].slice(-6); dlgSend(m.sc, d); };
H.dlgEnd = (c, m) => { const d = S.dlg?.[m.sc], ch = S.chars[d?.by]; if (d && (c.role === 'gm' || can(c, ch))) dlgEnd(m.sc); };
const VERBO = { porta: 'abrir a porta', barreira: 'mexer na barreira', bau: 'abrir o baú', item: 'pegar', placa: 'ler a placa', npc: 'falar com', alavanca: 'puxar a alavanca', escada: 'usar a escada', portal: 'atravessar o portal' };
hooks.interText = m => { const { o } = objOf(m); if (!o) return 'interagir'; const v = VERBO[o.k] || 'interagir'; return o.k === 'item' ? `${v} ${S.items[o.cfg?.item]?.name || 'o item'}` : o.k === 'npc' ? `${v} ${o.cfg?.nome || 'o NPC'}` : v; };

export { aplicar, disparar, objActs, perigoTick, pisou, reach, zoneEnter };

// Som (trilha, ambiência e efeitos sincronizados pelo mestre) e extras do mapa (névoa inteira, pincel, marcadores, escala).
import { S } from './state.js';
import { rid, int, okUrl, scene } from './rules.js';
import { H, NOUNDO } from './handlers.js';
import { wss } from './net.js';

export const AMB = ['chuva', 'vento', 'fogueira', 'caverna', 'mar', 'multidao'], SFX = ['sino', 'trovao', 'porta', 'grito', 'fanfarra', 'tensao', 'moeda', 'passos'];
// valores padrão no estado (campanhas antigas, cenas novas, campanha recém-aberta)
export const fixMedia = () => {
  S.audio = { url: '', on: false, vol: .6, loop: true, amb: '', t0: 0, n: 0, ...S.audio }; S.tracks ??= {}; S.handout ??= null;
  for (const sc of Object.values(S.scenes)) { sc.pins ??= {}; sc.unit ??= 0; sc.grid ??= true; sc.music ??= ''; }
};
const gm = fn => (c, m) => { if (c.role === 'gm') fn(c, m); };
const cast = o => { const p = JSON.stringify(o); wss.clients.forEach(x => x.role && x.readyState === 1 && x.send(p)); };
// toda troca de faixa ou play/pause ganha um carimbo: os clientes usam t0 para entrar no mesmo ponto da música
const play = o => Object.assign(S.audio, o, { t0: Date.now(), n: ++S.seq });

['audio', 'sfx', 'trackAdd', 'trackDel', 'fogAll', 'pinAdd', 'pinDel', 'handout'].forEach(k => NOUNDO.add(k));
const map0 = H.map, go0 = H.sceneGo, add0 = H.sceneAdd;
Object.assign(H, {
  audio: gm((c, m) => {
    const A = S.audio;
    if (m.f === 'url') { const u = String(m.v || ''); if (u && !okUrl(u)) return; play({ url: u, on: !!u }); }
    else if (m.f === 'on') play({ on: !!m.v && !!A.url });
    else if (m.f === 'vol') A.vol = Math.min(1, Math.max(0, +m.v || 0));
    else if (m.f === 'loop') A.loop = !!m.v;
    else if (m.f === 'amb') A.amb = AMB.includes(m.v) ? m.v : '';
  }),
  trackAdd: gm((c, m) => { const u = String(m.v || ''); if (okUrl(u) && Object.keys(S.tracks).length < 100) S.tracks[rid()] = { name: String(m.k || 'Faixa').slice(0, 40), url: u }; }),
  trackDel: gm((c, m) => { delete S.tracks[m.id]; }),
  // "mostrar a todos": uma imagem e/ou um texto (carta, retrato, pista) que abre na tela de cada jogador e na mesa até o mestre recolher
  handout: gm((c, m) => { const img = okUrl(m.img) ? m.img : '', text = String(m.text || '').trim().slice(0, 800); S.handout = img || text ? { img, text, n: ++S.seq } : null; }),
  sfx: gm((c, m) => { if (SFX.includes(m.k)) cast({ t: 'sfx', k: m.k }); }), // efeito pontual: só retransmite
  // ----- mapa -----
  fogAll: gm((c, m) => { const sc = scene(); sc.seen = {}; if (m.v) for (let x = 0; x < Math.ceil(sc.cols); x++) for (let y = 0; y < Math.ceil(sc.rows); y++) sc.seen[x + ',' + y] = 1; }),
  fog: gm((c, m) => { // pincel de raio r (0 = uma casa, 1 = 3x3, 2 = 5x5…)
    const sc = scene(), r = int(m.r ?? 1, 0, 4);
    for (let x = int(m.x) - r; x <= int(m.x) + r; x++) for (let y = int(m.y) - r; y <= int(m.y) + r; y++)
      if (x >= 0 && y >= 0 && x < Math.ceil(sc.cols) && y < Math.ceil(sc.rows)) { if (m.hide) delete sc.seen[x + ',' + y]; else sc.seen[x + ',' + y] = 1; }
  }),
  pinAdd: gm((c, m) => { const sc = scene(); if (Object.keys(sc.pins).length < 60) sc.pins[rid()] = { x: int(m.x, 0, 99), y: int(m.y, 0, 99), text: String(m.v || '').slice(0, 60), gm: !!m.k }; }), // marcador no mapa; gm = só o mestre vê
  pinDel: gm((c, m) => { delete scene().pins[m.id]; }),
  map(c, m) {
    if (c.role !== 'gm') return;
    const sc = scene();
    if (m.f === 'unit') sc.unit = Math.min(1000, Math.max(0, Math.round((+m.v || 0) * 100) / 100)); // metros por casa (0 = mede só em casas)
    else if (m.f === 'grid') sc.grid = !!m.v;
    else if (m.f === 'music') sc.music = okUrl(m.v) ? m.v : '';
    else map0(c, m);
  },
  sceneAdd(c, m) { add0(c, m); fixMedia(); },
  sceneGo(c, m) { go0(c, m); const mu = c.role === 'gm' && scene().music; if (mu && mu !== S.audio.url) play({ url: mu, on: true }); }, // cena com trilha própria troca a música ao entrar
});

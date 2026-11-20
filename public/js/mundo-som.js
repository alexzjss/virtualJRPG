// ===== mundo 3D: som da exploração — passos por piso, ambiência por tema e efeitos de interação =====
// Tudo sintetizado no WebAudio (ruído filtrado e osciladores, como a ambiência e os efeitos sintetizados do extras.js): sem arquivos.
// MSOM.passo(tipo, dist): grama, pedra, areia, neve ou agua; volume 1 − dist/12 (agachado conta como mais longe).
// MSOM.amb(tema): a ambiência do tema (floresta, caverna, neve → vento, vulcão → caldeira, pântano, praia → mar, o resto → vento),
//   trocada com fade de 1,5 s. A ambiência que o mestre põe para tocar (S.audio.amb) tem a vez: com ela, esta fica calada.
// MSOM.fx(k, dist): bau, alavanca, pegar, armadilha, alerta.
// MSOM.tick(now), por quadro (mundo3d.js): passos dos heróis que andam (0,45 s andando, 0,28 s correndo), ambiência da casa de quem
//   ouve (o herói selecionado; na TV e no mestre, o centro da câmera) e efeitos vindos do histórico e do alerta dos inimigos à vista.
// Respeita o botão de som e o volume de cada pessoa (level() do extras.js).
const P = () => globalThis.MPECAS;
let ac = null, bus = null, nbuf = null;
const vol = () => { try { return typeof level === 'function' ? level() : .8; } catch { return .8; } };
function ctxOk() {
  if (!ac) { const C = globalThis.AudioContext || globalThis.webkitAudioContext; if (!C) return null; try { ac = new C(); } catch { return null; } bus = ac.createGain(); bus.connect(ac.destination); }
  bus.gain.value = vol();
  if (ac.state !== 'running') { ac.resume?.().catch(() => {}); return null; } // o navegador só libera o som depois de um clique ou tecla
  return ac;
}
for (const ev of ['pointerdown', 'keydown']) globalThis.addEventListener?.(ev, () => { if (ac && ac.state !== 'running') ac.resume?.().catch(() => {}); }, { capture: true, passive: true });
const noise = c => {
  if (!nbuf) { nbuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = c.createBufferSource(); s.buffer = nbuf; s.loop = true; return s;
};
// estalo de ruído filtrado e tom curto, ligados ao bus (ou a out, na ambiência)
function burst(dur, f, g, { type = 'lowpass', q = .8, delay = 0, to = 0, out = null } = {}) {
  const c = ctxOk(); if (!c || !(g > 0)) return; const s = noise(c), fl = c.createBiquadFilter(), gg = c.createGain(), t = c.currentTime + delay;
  fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
  gg.gain.setValueAtTime(g, t); gg.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(fl).connect(gg).connect(out || bus); s.start(t, Math.random()); s.stop(t + dur + .05);
}
function tom(f, dur, g, { type = 'sine', to = 0, delay = 0, out = null } = {}) {
  const c = ctxOk(); if (!c || !(g > 0)) return; const o = c.createOscillator(), gg = c.createGain(), t = c.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  gg.gain.setValueAtTime(g, t); gg.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(gg).connect(out || bus); o.start(t); o.stop(t + dur + .05);
}

// ----- passos -----
const PASSO = {
  grama: k => { burst(.09, 1800, .2 * k, { type: 'bandpass', q: .7 }); burst(.05, 600, .14 * k); },
  pedra: k => { burst(.05, 950, .32 * k, { type: 'bandpass', q: 1.4 }); tom(140, .06, .1 * k, { type: 'triangle', to: 90 }); },
  areia: k => burst(.13, 2600, .15 * k, { type: 'highpass', q: .5 }),
  neve: k => { burst(.15, 1200, .2 * k, { to: 480 }); burst(.06, 3500, .05 * k, { type: 'highpass' }); },
  agua: k => { burst(.18, 900, .2 * k, { type: 'bandpass', q: 2, to: 2400 }); tom(420, .08, .045 * k, { to: 900, delay: .03 }); },
};
function passo(tipo, dist = 0) { const k = 1 - dist / 12; if (k > 0 && PASSO[tipo]) PASSO[tipo](k * (.85 + Math.random() * .3)); }
const GRAMA = new Set(['floresta', 'campo', 'pantano']), PEDRA = new Set(['castelo', 'caverna', 'ruinas', 'vulcao']), AREIA = new Set(['praia', 'deserto']);
const pisoDe = d => !d ? 'pedra' : d.tipo === 'agua' ? 'agua' : d.tema === 'neve' ? 'neve' : AREIA.has(d.tema) ? 'areia' : GRAMA.has(d.tema) ? 'grama' : PEDRA.has(d.tema) ? 'pedra' : 'pedra';

// ----- ambiência: ruído filtrado com LFO, mais um detalhe ocasional por tema -----
const AMB = {
  floresta: { type: 'bandpass', f: 2400, q: .5, g: .09, lfo: .21, depth: 800, extra: o => { if (Math.random() < .25) [0, .09, .18].forEach(d => tom(2600 + Math.random() * 900, .07, .05, { type: 'sine', to: 3400, delay: d, out: o })); } }, // passarinhos
  caverna: { type: 'lowpass', f: 160, g: .32, drone: 55, extra: o => { if (Math.random() < .2) tom(1400 + Math.random() * 600, .25, .06, { to: 700, out: o }); } }, // gota
  vento: { type: 'bandpass', f: 420, q: .6, g: .28, lfo: .13, depth: 240 },
  caldeira: { type: 'lowpass', f: 220, g: .38, lfo: .4, depth: 60, drone: 41, extra: o => { if (Math.random() < .35) burst(.04, 2500 + Math.random() * 2000, .08, { type: 'highpass', out: o }); } }, // estalos
  pantano: { type: 'lowpass', f: 700, g: .15, lfo: .07, depth: 200, extra: o => { if (Math.random() < .12) tom(180, .12, .08, { type: 'square', to: 120, out: o }); } }, // sapo
  mar: { type: 'lowpass', f: 520, g: .3, swell: .09 },
};
const AMB_TEMA = { floresta: 'floresta', caverna: 'caverna', neve: 'vento', vulcao: 'caldeira', pantano: 'pantano', praia: 'mar' };
const ambOf = tema => tema ? AMB_TEMA[tema] || 'vento' : '';
function makeAmb(p) {
  const c = ac, src = noise(c), f = c.createBiquadFilter(), g = c.createGain(), out = c.createGain(), nodes = [src];
  f.type = p.type; f.frequency.value = p.f; f.Q.value = p.q || .7; g.gain.value = p.g; out.gain.value = 0;
  src.connect(f).connect(g).connect(out).connect(bus);
  const lfo = (rate, param, depth) => { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = rate; og.gain.value = depth; o.connect(og).connect(param); o.start(); nodes.push(o); };
  if (p.lfo) lfo(p.lfo, f.frequency, p.depth); if (p.swell) lfo(p.swell, g.gain, p.g * .6);
  if (p.drone) { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = p.drone; og.gain.value = .1; o.connect(og).connect(out); o.start(); nodes.push(o); }
  const t = p.extra ? setInterval(() => p.extra(out), 400) : null;
  src.start(); out.gain.setTargetAtTime(1, c.currentTime, .5); // entra em ~1,5 s
  return { out, stop() { clearInterval(t); nodes.forEach(n => { try { n.stop(); } catch {} }); try { out.disconnect(); } catch {} } };
}
let ambK = '', ambN = null;
function amb(tema) { ambSet(ambOf(tema)); }
function ambSet(k) {
  if (k === ambK && (ambN || !k)) return;
  if (ambN) { const o = ambN; ambN = null; o.out.gain.setTargetAtTime(0, ac.currentTime, .5); setTimeout(() => o.stop(), 1700); } // sai em ~1,5 s
  ambK = k; if (!k || !AMB[k] || !ctxOk()) return; // sem som liberado ainda: tenta de novo no próximo tick
  ambN = makeAmb(AMB[k]);
}

// ----- efeitos de interação -----
const FX = {
  bau: k => { tom(196, .12, .16 * k, { type: 'square', to: 150 }); burst(.25, 700, .18 * k, { to: 300 }); [784, 988, 1175, 1568].forEach((f, i) => tom(f, .25, .08 * k, { type: 'triangle', delay: .18 + i * .07 })); },
  alavanca: k => { burst(.06, 1400, .28 * k, { type: 'bandpass', q: 3 }); tom(220, .18, .12 * k, { type: 'square', to: 110, delay: .05 }); burst(.05, 800, .28 * k, { type: 'bandpass', q: 3, delay: .22 }); },
  pegar: k => { tom(988, .08, .11 * k, { type: 'triangle' }); tom(1319, .2, .11 * k, { type: 'triangle', delay: .07 }); },
  armadilha: k => { burst(.05, 3000, .32 * k, { type: 'highpass' }); tom(300, .25, .18 * k, { type: 'sawtooth', to: 60, delay: .03 }); burst(.3, 400, .28 * k, { delay: .05 }); },
  alerta: k => { tom(1046, .09, .14 * k, { type: 'square' }); tom(1568, .22, .14 * k, { type: 'square', delay: .09 }); },
};
function fx(k, dist = 0) { if (FX[k]) FX[k](Math.max(.3, 1 - dist / 16)); }
const FX_LOG = [[/^abriu o baú/, 'bau'], [/^puxou a alavanca/, 'alavanca'], [/^pegou /, 'pegar'], [/^Armadilha!/, 'armadilha']];

// ----- por quadro -----
const anda = new Map(); let seen = null, lastT = 0, ambT = 0; const iaS = new Map();
function off() { ambSet(''); seen = null; anda.clear(); iaS.clear(); }
function tick(now = performance.now()) {
  const s = typeof S !== 'undefined' ? S : null, M = globalThis.MUNDO; if (!s || !M || s.battle?.active) { off(); return; }
  const cur = M.cur?.(), f = cur?.f, w = cur?.w; if (!f) return;
  const dt = Math.max(0, Math.min(.1, (now - (lastT || now)) / 1000)); lastT = now; if (bus) bus.gain.value = vol();
  const pose = id => globalThis.MINPUT?.poseOf?.(id, now) || s.chars[id]?.pos;
  const me = typeof lastHero !== 'undefined' && typeof role !== 'undefined' && role === 'player' && s.chars[lastHero]?.pos?.f === f.id ? lastHero : null;
  const L = me ? pose(me) : { x: M.view.tx, z: M.view.tz }; if (!L) return;
  const casa = p => P().decode(P().cell(f, Math.floor(p.x), Math.floor(p.z)));
  for (const c of Object.values(s.chars)) { // passos: quem andou mais de meia casa por segundo neste quadro
    if (c.enemy || !c.pos || c.scene !== s.scene || c.pos.f !== f.id) continue;
    const p = pose(c.id); if (!p) continue; let a = anda.get(c.id);
    if (!a) { anda.set(c.id, { x: p.x, z: p.z, acc: 0 }); continue; }
    const v = dt > 0 ? Math.hypot(p.x - a.x, p.z - a.z) / dt : 0, passoT = p.m === 'c' ? .28 : .45; a.x = p.x; a.z = p.z;
    if (v < .5) { a.acc = passoT * .6; continue; } // parado: o primeiro passo sai logo que voltar a andar
    if ((a.acc += dt) < passoT) continue; a.acc -= passoT;
    passo(pisoDe(casa(p)), Math.hypot(p.x - L.x, p.z - L.z) * (p.m === 'g' ? 1.6 : 1));
  }
  if (now - ambT > 300) { ambT = now; const doMestre = s.audio?.on !== false && s.audio?.amb; ambSet(doMestre ? '' : ambOf(casa(L)?.tema || w?.tema || '')); }
  if (seen === null) seen = s.seq || 0; // efeitos pelo histórico: só os novos, no máximo 4 de uma vez
  else if ((s.seq || 0) > seen) {
    for (const l of (s.log || []).filter(l => l.n > seen).slice(-4)) {
      const k = FX_LOG.find(([re]) => re.test(l.text || ''))?.[1]; if (!k) continue;
      const h = Object.values(s.chars).find(c => c.name === l.who && c.pos?.f === f.id && c.scene === s.scene);
      fx(k, h ? Math.hypot(h.pos.x - L.x, h.pos.z - L.z) : 0);
    }
    seen = s.seq || 0;
  }
  for (const [id, o] of Object.entries(w?.objs || {})) { // inimigo à vista que acabou de entrar em alerta
    if (o?.k !== 'inimigo') continue; const st = o.ia?.s || '', was = iaS.get(id); iaS.set(id, st);
    const e = s.chars[o.cfg?.ch]; if (st === 'alerta' && was !== undefined && was !== 'alerta' && e?.pos?.f === f.id) fx('alerta', Math.hypot(e.pos.x - L.x, e.pos.z - L.z));
  }
}
globalThis.MSOM = { passo, amb, fx, tick, off, pisoDe, ambOf, get amb_() { return ambK; } };

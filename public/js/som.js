// Volumes relativos e amostras locais. Os eventos da mesa mantêm os mesmos nomes.
const { ambiencias: AUDIO_AMB, efeitos: AUDIO_FX } = globalThis.VJ_AUDIO;
const SAMPLES = {
  sino: [.55, 'sino'], trovao: [.8, 'trovao', 'trovao-2'], porta: [.65, 'porta'],
  grito: [.55, 'grito'], fanfarra: [.52, 'fanfarra'], tensao: [.52, 'tensao'],
  moeda: [.48, 'moeda'], passos: [.58, 'passos', 'passos-2', 'passos-3'],
  hit: [.65, 'hit', 'hit-2', 'hit-3'], crit: [.72, 'impacto'],
  heal: [.33, 'luz'],
  limit: [.48, 'tensao'], brk: [.57, 'brk'], ko: [.58, 'hit-3'],
  start: [.55, 'metal'],
  bf: [.72, 'choque'], chq: [.61, 'choque'], tick: [.27, 'tick'],
  win: [.56, 'fanfarra'],
  turno: [.38, 'turno'], seuTurno: [.56, 'seu-turno'], turnoInimigo: [.43, 'turno-inimigo'],
  turnoExtra: [.45, 'turno-extra'], derrota: [.51, 'derrota'], retirada: [.43, 'retirada'],
  aviso: [.36, 'chime'], aprendeu: [.36, 'chime'],
  ritmoTensao: [.40, 'carga'], divida: [.46, 'hit-3'], cadeia: [.28, 'tick'],
  cadeiaCheia: [.45, 'chime'], dominio: [.55, 'tensao'], dominioFim: [.42, 'whoosh'],
  vidro: [.62, 'brk'], agua: [.64, 'agua', 'agua-2'], faiscas: [.61, 'faiscas', 'faiscas-2'],
  pedra: [.64, 'pedra'], corrente: [.63, 'corrente'], vapor: [.60, 'vapor'],
  madeira: [.56, 'madeira'], pulso: [.57, 'pulso'], gong: [.56, 'gong'], latido: [.57, 'latido'],
  ventoCorte: [.53, 'lamina-movimento', 'lamina-movimento-2'], lamina: [.64, 'lamina-golpe', 'lamina-golpe-2'],
  laminaCritica: [.72, 'lamina-critico'],
  armadura: [.66, 'armadura', 'armadura-2'], movimento: [.48, 'movimento', 'movimento-2'],
  energia: [.52, 'carga-combate'], barreira: [.59, 'barreira'], aparar: [.64, 'aparar', 'armadura-2'],
  esquiva: [.44, 'movimento', 'movimento-2'], impacto: [.71, 'impacto'], musical: [.41, 'campainha'],
  arco: [.53, 'arco'], tiro: [.68, 'disparo', 'disparo-2'], rajada: [.45, 'rajada'],
  fogo: [.58, 'golpe-fogo'], aguaCombate: [.56, 'golpe-agua'], raio: [.58, 'golpe-raio'],
  sombra: [.47, 'golpe-sombra'], ataqueTotal: [.56, 'impacto'],
  cmdReady: [.27, 'movimento'], cmdPress: [.20, 'clique'], cmdBeat: [.16, 'tick'],
  cmdMash: [.29, 'hit', 'hit-2', 'hit-3'], cmdCharge: [.22, 'carga-curta'], cmdOver: [.47, 'choque'],
  cmdCut: [.33, 'lamina-movimento'], cmdNote: [.21, 'madeira'], cmdShot: [.25, 'clique'],
  cmdRune: [.27, 'golpe-sombra'], cmdGood: [.23, 'clique'], cmdPerfect: [.35, 'armadura-2'],
  cmdMiss: [.28, 'erro'], cmdThreat: [.34, 'pulso'], cmdClash: [.42, 'barreira'],
};

const sampleAudio = (() => {
  const Context = window.AudioContext || window.webkitAudioContext;
  const buffers = new Map(), lastSample = new Map(), voices = new Set();
  let ctx, bus, volume = 0, ambKey = '', ambient, pendingAmb;

  async function load(name, signal) {
    const response = await fetch('/audio/' + name + '.mp3', { signal });
    if (!response.ok) throw new Error('Áudio indisponível: ' + name);
    return ctx.decodeAudioData(await response.arrayBuffer());
  }

  function sample(name) {
    if (!buffers.has(name)) {
      buffers.set(name, load('fx/' + name).catch(error => {
        buffers.delete(name);
        throw error;
      }));
    }
    return buffers.get(name);
  }

  function voice(buffer, gain, rate, loop = false) {
    const source = ctx.createBufferSource(), out = ctx.createGain();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    out.gain.value = gain;
    source.connect(out).connect(bus);
    const node = { source, out };
    source.onended = () => {
      source.disconnect();
      out.disconnect();
      voices.delete(node);
    };
    return node;
  }

  function syncAmb(key) {
    if (!volume || !Object.hasOwn(AUDIO_AMB, key)) key = '';
    if (ctx?.state !== 'running' || key === ambKey) return;
    ambKey = key;
    pendingAmb?.abort();
    if (ambient) {
      const now = ctx.currentTime;
      ambient.out.gain.setTargetAtTime(0, now, .12);
      ambient.source.stop(now + .65);
      ambient = null;
    }
    if (!key) return;
    const request = pendingAmb = new AbortController();
    load('amb/' + key, request.signal).then(buffer => {
      if (request.signal.aborted) return;
      ambient = voice(buffer, 0, 1, true);
      ambient.source.start();
      ambient.out.gain.setTargetAtTime(AUDIO_AMB[key][1], ctx.currentTime, .18);
    }).catch(() => {
      // Uma troca de ambiência inicia uma nova tentativa.
    });
  }

  return {
    get locked() { return !!Context && ctx?.state !== 'running'; },
    unlock() {
      if (!this.locked) return Promise.resolve();
      try {
        if (!ctx) {
          ctx = new Context();
          bus = ctx.createGain();
          bus.gain.value = volume;
          const limiter = ctx.createDynamicsCompressor();
          limiter.threshold.value = -6;
          limiter.knee.value = 3;
          limiter.ratio.value = 12;
          limiter.release.value = .12;
          bus.connect(limiter).connect(ctx.destination);
        }
        return ctx.resume().then(() => {
          // Pré-carrega os sons mais frequentes. Os demais entram no cache ao tocar.
          for (const name of ['hit', 'hit-2', 'hit-3', 'whoosh', 'chime', 'tick', 'metal', 'tensao', 'turno', 'seu-turno', 'turno-inimigo']) sample(name).catch(() => {});
        });
      } catch (error) { return Promise.reject(error); }
    },
    sync(nextVolume, key) {
      if (nextVolume !== volume) {
        volume = nextVolume;
        if (bus) bus.gain.setTargetAtTime(volume, ctx.currentTime, .015);
      }
      syncAmb(key);
    },
    warm(cues) {
      if (this.locked || !ctx || !volume) return;
      const files = new Set();
      for (const key of cues) {
        if (Object.hasOwn(SAMPLES, key)) for (const name of SAMPLES[key].slice(1)) files.add(name);
      }
      for (const name of files) sample(name).catch(() => {});
    },
    async play(key, { gain = 1, rate = 1, delay = 0, maxAge = .6 } = {}) {
      if (!Object.hasOwn(SAMPLES, key) || this.locked || !ctx || !volume) return;
      const [level, ...names] = SAMPLES[key];
      const choices = names.length > 1 ? names.filter(name => name !== lastSample.get(key)) : names;
      const name = choices[Math.floor(Math.random() * choices.length)];
      if (names.length > 1) lastSample.set(key, name);
      const when = ctx.currentTime + delay;
      try {
        const buffer = await sample(name);
        if (!volume || this.locked || ctx.currentTime - when > maxAge) return;
        if (voices.size >= 12) return;
        const node = voice(buffer, level * gain, rate);
        node.source.start(Math.max(ctx.currentTime, when));
        voices.add(node);
      } catch {
        // Uma nova chamada pode tentar carregar o arquivo novamente.
      }
    },
  };
})();

// A animação marca a preparação e a chegada. A coreografia toca a batida de cada alvo ao resolver o golpe.
const FAMILY_SOUNDS = {
  projectile: ['rajada', 'hit'], beam: ['energia', 'impacto'], slash: ['ventoCorte', 'lamina'],
  smash: ['movimento', 'hit'], pierce: ['ventoCorte', 'lamina'], dash: ['movimento', 'hit'],
  area: ['energia', 'impacto'], rain: ['rajada', 'impacto'], ritual: ['sombra', 'energia'],
  summon: ['sombra', 'impacto'], psychic: ['energia', 'sombra'], musical: ['musical', 'heal'],
  heal: ['energia', 'heal'], barrier: ['energia', 'barreira'], form: ['movimento', 'energia'],
};
const ELEMENT_SOUNDS = {
  kagutsuchi: ['vapor', 'fogo'], susanoo: ['rajada', 'aguaCombate'], atlas: ['energia', 'pedra'],
  indra: ['energia', 'raio'], fuhaku: ['ventoCorte', 'rajada'], amaterasu: ['energia', 'fogo'],
  tsukuyomi: ['energia', 'sombra'], shukketsu: ['movimento', 'aguaCombate'], hiruko: ['vapor', 'aguaCombate'],
  aura: ['energia', 'energia'], oculto: ['sombra', 'corrente'],
};
const WEAPON_SOUNDS = {
  lamina: ['ventoCorte', 'lamina'], lanca: ['ventoCorte', 'lamina'], fogo: ['tiro', 'hit'],
  punho: ['movimento', 'hit'], pesada: ['movimento', 'impacto'], foco: ['energia', 'impacto'],
  corrente: ['corrente', 'armadura'], arremesso: ['rajada', 'lamina'], escudo: ['movimento', 'armadura'],
  instrumento: ['musical', 'hit'], arco: ['arco', 'hit'],
};
const SUPPORT_SOUNDS = new Set(['heal', 'barrier', 'form', 'summon', 'musical', 'psychic', 'ritual']);
const MELEE_WEAPONS = new Set(['lamina', 'lanca', 'punho', 'pesada', 'corrente', 'escudo']);
const MELEE_FAMILIES = new Set(['slash', 'smash', 'pierce', 'dash']);
const BATTLE_COMMAND_SOUNDS = { guarda: 'barreira', ataqueTotal: 'ataqueTotal', cadeia: 'movimento', turnoExtra: 'turnoExtra' };

function combatSounds(profile, fx, skill) {
  const family = Object.hasOwn(FAMILY_SOUNDS, profile.family) ? FAMILY_SOUNDS[profile.family] : FAMILY_SOUNDS.smash;
  const el = fx.el || profile.el;
  const element = Object.hasOwn(ELEMENT_SOUNDS, el) ? ELEMENT_SOUNDS[el] : null;
  const wt = fx.wt || skill?.req;
  const weapon = Object.hasOwn(WEAPON_SOUNDS, wt) ? WEAPON_SOUNDS[wt] : null;
  const support = SUPPORT_SOUNDS.has(profile.family) && !fx.dmg && !fx.miss;
  const release = support ? family[0] : (weapon || element || family)[0];
  const contact = support ? family[1] : (weapon || family)[1];
  const close = !support && (weapon ? MELEE_WEAPONS.has(wt) : MELEE_FAMILIES.has(profile.family));
  const impact = element?.[1];
  const texture = impact === contact || impact === release ? null : impact;
  return { release, contact, close, texture, support };
}

function skillSfx(profile, impactMs, delay, fx, skill) {
  if (!fx.a && !skill) return;
  const { release, close, support } = combatSounds(profile, fx, skill);
  const tier = fx.lim || fx.dom ? 3 : profile.tier || 1;
  const start = close ? Math.max(0, impactMs - 115) : Math.min(100, impactMs * .23);
  playSfx(release, { gain: (support ? .34 : .46) + .08 * tier, delay: (delay + start) / 1000 });
}

function impactSounds(profile, fx, skill) {
  const { contact, texture, support } = combatSounds(profile, fx, skill);
  if (fx.par) return [['aparar', 1]];
  if (fx.miss) return fx.esq ? [['esquiva', .76]] : [];
  if (fx.heal) return [[profile.family === 'barrier' ? 'barreira' : 'heal', .66]];
  if (!fx.dmg) return support && fx.a && !fx.dom ? [[contact, .46]] : [];
  if (fx.bf) return [['bf', 1]];
  if (fx.block) return [['armadura', .90]];
  if (fx.esq) return [['esquiva', .43], [contact, .58]];
  const primary = fx.crit ? ({ hit: 'crit', lamina: 'laminaCritica' })[contact] || contact : contact;
  const cues = [[primary, fx.crit ? 1 : .86]];
  if (texture) cues.push([texture, fx.w || fx.crit ? .53 : .36]);
  return cues;
}

// Catálogo puro de perfis visuais. Não depende do DOM: pode ser auditado no Node e usado no navegador.
(() => {
  const PALETTES = {
    kagutsuchi: ['#ff351f', '#ff8a24', '#ffd36a'], susanoo: ['#1a8cff', '#55d8ff', '#d7f8ff'], atlas: ['#a86b32', '#e1b96a', '#b9f26c'],
    indra: ['#7d55ff', '#32d9ff', '#f6fbff'], fuhaku: ['#47e0bb', '#b8fff0', '#f3ffff'], amaterasu: ['#ffb61f', '#fff09a', '#ffffff'],
    tsukuyomi: ['#3b176f', '#9d5cff', '#e4c8ff'], shukketsu: ['#8d001c', '#ef1746', '#ff9faf'], hiruko: ['#63c91f', '#d1ff36', '#b34dff'],
    aura: ['#15bfff', '#7fe7ff', '#ffffff'], oculto: ['#6820a5', '#db35ff', '#151020'], fis: ['#d7d9df', '#ffffff', '#ffc93c']
  };
  const ATTRS = { FOR: '#ff493d', CON: '#e39b46', AGI: '#45e6b3', DES: '#4fb6ff', INT: '#b46cff', SAB: '#ffe36c', CAR: '#ff72b6', SOR: '#ffffff' };
  const FAMILIES = ['projectile', 'beam', 'slash', 'smash', 'pierce', 'dash', 'area', 'rain', 'ritual', 'summon', 'psychic', 'musical', 'heal', 'barrier', 'form'];
  // fração da duração em que o golpe acerta (o motor antigo e o luminoso usam a mesma)
  const IMPACT = Object.fromEntries(FAMILIES.map(f => [f, f === 'rain' ? .62 : f === 'ritual' || f === 'summon' ? .7 : .58]));
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const random = n => { n |= 0; n = Math.imul(n ^ n >>> 16, 0x21f0aaad); n = Math.imul(n ^ n >>> 15, 0x735a2d97); return ((n ^ n >>> 15) >>> 0) / 4294967296; };
  const has = (s, re) => re.test(`${s?.name || ''} ${s?.d || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
  function familyOf(s, f = {}) {
    if (FAMILIES.includes(s?.anim)) return s.anim;
    if (f.passive) return 'form';
    const fxHas = (...types) => (s?.fx || []).some(x => types.includes(x.t) || x.t === 'st' && types.includes(x.k));
    if (f.heal || s?.kind === 'heal') return fxHas('shield', 'guard', 'reflect') || has(s, /escudo|barreira|muralha|armadura|protec/) ? 'barrier' : 'heal';
    if (s?.kind === 'form' || s?.form || s?.aw) return 'form';
    if (s?.summon || has(s, /invoca|legiao|familiar|servo|clone/)) return 'summon';
    if (s?.kind === 'mental' || has(s, /mente|medo|pesadelo|ilusao|hipno|psiqu/)) return 'psychic';
    if (s?.req === 'instrumento' || has(s, /musica|cancao|nota|acorde|tambor|violino|flauta/)) return 'musical';
    if (s?.kind === 'util') {
      if (fxHas('shield', 'guard', 'reflect', 'counter') || has(s, /defesa|guarda|aparar|protec|barreira|escudo/)) return 'barrier';
      if (has(s, /teleport|passo|investida|avanco|avanço/)) return 'dash';
      return 'form';
    }
    if (s?.dom || s?.circ || has(s, /ritual|selo|dominio|circulo|oracao|maldicao/)) return 'ritual';
    if (s?.area && has(s, /chuva|meteoro|cair|ceu|tempestade/)) return 'rain';
    if (s?.area) return 'area';
    if (has(s, /laser|raio|feixe|canhao|sopro|onda de luz|corrente/)) return 'beam';
    if (has(s, /tiro|flecha|dardo|bala|arremess|esfera|bola|orbe|lanca.*(fogo|gelo|agua|vento)/)) return 'projectile';
    if (has(s, /estoc|perfur|agulha|presa|lança|lanca|chifre/)) return 'pierce';
    if (has(s, /corte|lamina|sabre|espada|foice|decapit|rasgar/)) return 'slash';
    if (has(s, /teleport|passo|fugaz|sombra|veloz|investida/)) return 'dash';
    if (has(s, /soco|punho|palma|chute|pancada|martelo|esmag|impact|golpe|escudada/)) return 'smash';
    return ['projectile', 'beam', 'slash', 'smash', 'pierce'][hash(s?.name || f.s || '') % 5];
  }
  function profile(s, f = {}, options = {}) {
    s ||= { name: f.s || 'Ataque', el: f.el || 'fis', kind: f.heal ? 'heal' : 'dmg' };
    const seed = hash(`${s.name}|${s.el}|${s.kind}`), family = familyOf(s, f), tier = s.limit || s.dom ? 3 : s.rq ? Math.max(...Object.values(s.rq), 0) >= 55 ? 2 : 1 : s.power >= 28 || s.cost >= 10 ? 2 : 1;
    const el = s.el || f.el || 'fis', base = PALETTES[el] || PALETTES.fis, accent = ATTRS[s.attr] || base[2], palette = [base[0], base[1], accent];
    const origin = ['dash', 'smash', 'slash', 'pierce'].includes(family) ? 'weapon' : ['rain', 'ritual', 'psychic'].includes(family) ? 'head' : family === 'form' ? 'core' : 'hand';
    const speed = Math.max(.5, Math.min(2, +options.speed || 1)), duration = options.reduced ? 260 : Math.round((620 + tier * 80 + random(seed) * 90) / speed);
    return { name: s.name, family, el, attr: s.attr, seed, tier, palette, origin, duration, impact: IMPACT[family] ?? .58, area: !!s.area, hits: s.hits || 1, limit: !!s.limit, dom: !!s.dom };
  }
  globalThis.ANIM_PROFILES = { PALETTES, ATTRS, FAMILIES, IMPACT, hash, random, familyOf, profile };
})();

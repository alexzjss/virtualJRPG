// Mira do palco. Roda no navegador e nos testes do Node.
(() => {
  const encoder = new TextEncoder();
  function hash(seed, id, opponent) {
    let h = 0x811c9dc5;
    for (const byte of encoder.encode(`${seed}|${id}|${opponent}`)) h = Math.imul(h ^ byte, 0x01000193);
    return h >>> 0;
  }

  const alive = ch => ch.hp > 0 && !ch.dead;
  function targets(chars, { seed, locks = {} }) {
    const living = chars.filter(alive);
    return Object.fromEntries(chars.map(ch => {
      if (!alive(ch)) return [ch.id, null];
      const opponents = living.filter(o => !!o.enemy !== !!ch.enemy);
      if (Object.hasOwn(locks, ch.id) && opponents.some(o => o.id === locks[ch.id])) return [ch.id, locks[ch.id]];
      let target = null, score = Infinity;
      for (const o of opponents) {
        const rank = hash(seed, ch.id, o.id);
        if (rank < score || (rank === score && o.id < target)) {
          target = o.id;
          score = rank;
        }
      }
      return [ch.id, target];
    }));
  }

  function faceLeft(selfX, targetX, imgL) {
    const delta = targetX - selfX;
    if (Math.abs(delta) < 1) return null;
    return (delta < 0) !== !!imgL;
  }

  globalThis.MIRA_R = { targets, faceLeft };
})();

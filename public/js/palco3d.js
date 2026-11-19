// ===== palco 3D da batalha (CSS 3D): cenário, chão, recortes e câmera por turno =====
// O mundo mora fora do #app (fixo no body) e é atualizado por diferença; o #app só guarda um retângulo vazio ([data-p3d]).
// formation/cameraFor/imgSrc são puros (testados no Node); o que usa document fica dentro de sync e das funções que ele chama.
(g => {
  const POS_H = [[-430, 0], [330, 60], [610, -120], [90, -200]], COLS_F = 5; // heróis: 4 por fileira; inimigos: arco de 5
  const n0 = v => v + 0; // evita -0
  // ----- grid → mundo -----
  const MIN_SEP = 230, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // fr: eixo da batalha (ax) + escala; a profundidade entre os grupos fica entre 900 e 2600 px
  const frame = (ax, cols, rows) => { const d = ax?.d || 0, D = clamp(d * 260, 900, 2600); return { a: ax?.a || 0, cx: ax?.cx || 0, cy: ax?.cy || 0, k: d > 0 ? D / d : 260, D, cols, rows }; };
  // origem no centro dos heróis; z = -along * k (inimigos ao fundo), x = perp * k (a direita do eixo vai para +x)
  const toWorld = (gx, gy, fr, raw) => {
    const dx = gx - fr.cx, dy = gy - fr.cy, c = Math.cos(fr.a), s = Math.sin(fr.a), along = dx * c + dy * s, perp = -dx * s + dy * c;
    if (raw) return { x: perp * fr.k, z: -along * fr.k };
    return { x: n0(Math.round(clamp(perp * fr.k, -1000, 1000))), z: n0(Math.round(clamp(-along * fr.k, -fr.D - 900, 400))) };
  };
  // distância entre dois tokens: casas (Chebyshev, como RULES) e metros quando a cena tem escala
  const rangeOf = (a, b, unit) => { if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return null; const casas = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); return { casas, m: unit > 0 ? +(casas * unit).toFixed(2) : null }; };
  // posição (x, z) de cada combatente: do grid; sem posição, slot de reserva do seu lado; depois separa quem ficou colado
  const formation = (chars, fr) => {
    const M = new Map(), ids = [];
    let ih = 0, ie = 0;
    const placed = c => c.x != null && c.y != null;
    for (const c of chars) { if (placed(c)) M.set(c.id, toWorld(c.x, c.y, fr)); ids.push(c.id); }
    const bossId = chars.find(c => c.enemy && c.boss && !placed(c))?.id, nFoe = chars.filter(c => c.enemy && !placed(c)).length, C = Math.min(COLS_F, nFoe), mid = (C - 1) / 2;
    for (const c of chars) {
      if (placed(c)) continue;
      if (c.id === bossId) { M.set(c.id, { x: 0, z: n0(-fr.D - 250) }); continue; } // chefe: centro, mais ao fundo
      if (!c.enemy) { const i = ih++, [x, z] = POS_H[i % 4]; M.set(c.id, { x, z: n0(z - 260 * Math.floor(i / 4)) }); }
      else if (bossId) { const i = ie++, sd = i % 2 ? 1 : -1, rw = Math.floor(i / 2); M.set(c.id, { x: n0(sd * (420 + 340 * rw)), z: n0(-fr.D + 120 * rw) }); } // lacaios abrem o arco nas laterais
      else { const i = ie++, col = i % COLS_F, row = Math.floor(i / COLS_F), d = mid ? Math.abs(col - mid) / mid : 0;
        M.set(c.id, { x: n0(Math.round((col - mid) * 370 + 185 * row)), z: n0(Math.round(-fr.D - 200 * d - 300 * row)) }); }
    }
    for (let pass = 0; pass < 8; pass++) { let moved = false;
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const a = M.get(ids[i]), b = M.get(ids[j]), dz = a.z - b.z; if (Math.hypot(a.x - b.x, dz) >= MIN_SEP) continue;
        const need = Math.sqrt(MIN_SEP * MIN_SEP - dz * dz), gap = Math.ceil((need - Math.abs(a.x - b.x)) / 2), dir = a.x <= b.x ? -1 : 1; // a para a esquerda, a menos que já esteja à direita
        a.x = n0(a.x + dir * gap); b.x = n0(b.x - dir * gap); moved = true;
      }
      if (!moved) break; }
    return M;
  };
  // câmera: translate3d(tx,ty,tz) rotateY(ry) aplicado ao mundo (o giro é em volta da origem do mundo, depois vem a translação)
  // CSS rotateY(θ): x' = x·cosθ + z·sinθ, z' = −x·sinθ + z·cosθ
  const PERSP = 1000, rotP = (p, ry) => { const r = ry * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return { x: p.x * c + p.z * s, z: -p.x * s + p.z * c }; };
  // CSS rotateX(θ) (o mundo inclina: θ < 0 olha de cima): y' = y·cosθ − z·sinθ, z' = y·sinθ + z·cosθ
  const rotX = (p, rx) => { const r = rx * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c }; };
  // enquadre genérico: gira (ry, rx), centra e aproxima o máximo possível com todos os pontos (pés e cabeça) dentro da fração m da tela.
  // A perspectiva nasce em 50% 40% da tela e a origem do mundo fica em 62%: um ponto do mundo aparece 22% da altura abaixo do centro da perspectiva.
  // dmin: distância mínima da câmera a qualquer ponto (nunca fecha em close); hk: folga acima da cabeça (o efeito da habilidade sobe além do corpo)
  const OY = .22, fitCam = ({ pts, ry = 0, rx = 0, w = 1440, h = 860, m = .8, up = 330, dmin = 160, hk = 1 }) => {
    const Q = []; for (const p of pts) for (const y of [0, -(p.h || up) * hk]) { const a = rotP(p, ry), b = rotX({ x: a.x, y, z: a.z }, rx); Q.push(b); }
    const xs = Q.map(q => q.x), ys = Q.map(q => q.y), tx = -(Math.min(...xs) + Math.max(...xs)) / 2, ty = h * .05 - (Math.min(...ys) + Math.max(...ys)) / 2 - h * OY; // centro do quadro um pouco abaixo do meio (o topo tem a ordem e os ícones)
    const W2 = w / 2 * m, top = h * .4 * m, bot = h * .5 * m; // embaixo fica a HUD do grupo
    const ok = tz => Q.every(q => { const d = PERSP - (q.z + tz); if (d < dmin) return false; const k = PERSP / d, sx = (q.x + tx) * k, sy = (q.y + ty + h * OY) * k; return Math.abs(sx) <= W2 && sy >= -top && sy <= bot; });
    let lo = -9000, hi = 900; if (!ok(lo)) return { tx, ty, tz: lo, ry, rx };
    for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
    return { tx, ty, tz: lo, ry, rx };
  };
  const angNear = (a, ref) => { let d = ((a - ref) % 360 + 540) % 360 - 180; return ref + d; }; // o mesmo ângulo, o mais perto de ref (sem dar a volta)
  // posições fixas de câmera, no estilo dos JRPGs: ry gira em volta da cena, rx inclina (negativo olha de cima), m é a folga do quadro
  const PRESET = {
    side: { ry: -96, rx: -12, m: .84 },   // lateral clássica (FF antigos): heróis à esquerda, inimigos à direita
    aerial: { ry: 0, rx: -56, m: .84 },   // aérea tática (Tactics, Fire Emblem)
    tres: { ry: -48, rx: -24, m: .84 },   // três-quartos alto (FFX, Tales)
    diag: { ry: 48, rx: -20, m: .84 },    // diagonal oposta, por cima do outro ombro (FFVII, Xenoblade)
    frente: { ry: 180, rx: -12, m: .84 }, // frontal, do lado dos inimigos: vê o rosto do grupo (Dragon Quest, Persona)
    baixa: { ry: -62, rx: 5, m: .82 }     // heroica, rente ao chão, olhando para cima (Persona 5, Xenoblade)
  };
  // lado da coluna de comandos: o primeiro em que ela (com a lista aberta, largura wr) cabe sem tocar o recorte; sem nenhum, o de mais folga e encolhida (scale .6 a 1)
  const pickSide = (rect, L, w, wr, gap) => {
    if (!rect) return { side: 1, scale: 1 };
    const R = L.width - rect.right - gap - 8, Lf = rect.left - gap - 8;
    if (R >= wr) return { side: 1, scale: 1 }; if (Lf >= wr) return { side: -1, scale: 1 };
    const side = R >= Lf ? 1 : -1; return { side, scale: Math.round(clamp(Math.max(R, Lf) / wr, .6, 1) * 100) / 100 };
  };
  const mood = sc => { const t = [sc?.mood, sc?.hora, /-(dia|tarde|noite)$/.exec(String(sc?.bbg || ''))?.[1]].find(v => v === 'dia' || v === 'tarde' || v === 'noite'); return t || 'dia'; }; // hora do dia da cena: campo mood/hora, ou o sufixo do cenário pronto (tema-hora)
  const ZMIN = 420, ZMAX = 2600; // zoom: distância extra mínima e máxima do alvo
  // plano de ação (golpes, técnicas, contra-ataque): aberto, com folga para o efeito e distância mínima; um plano só por golpe
  const ACT = { m: .52, dmin: 1350, hk: 1.45, rx: -12 }, ORB = 1400; // ORB: distância da órbita do Limite/Domínio
  const cameraFor = v => {
    const a = v.at || { x: 0, z: 0 }, t = v.to || a; let r;
    if (PRESET[v.kind] || v.kind === 'wide') { // vistas de fora travadas (ver PRESET) e plano aberto de área
      const pts = v.pts && v.pts.length ? v.pts : [a], p = PRESET[v.kind] || { ry: v.ry0 || 0, rx: v.rx ?? -22, m: v.m || .78 };
      r = fitCam({ pts, ry: p.ry, rx: p.rx, w: v.w, h: v.h, m: p.m, dmin: v.dmin, hk: v.hk });
    } else if (v.kind === 'two') { // plano a dois, visto de fora e de lado: a linha atacante→alvo fica deitada na tela, atacante à esquerda (ou o lado mais perto da câmera atual)
      const b = v.to || a, base = Math.atan2(b.z - a.z, b.x - a.x) * 180 / Math.PI, ref = v.ry0 || 0, c1 = angNear(base, ref), c2 = angNear(base + 180, ref);
      const ry = Math.abs(c1 - ref) <= 110 ? c1 : c2, pts = [a, b, ...(v.pts || [])];
      r = fitCam({ pts, ry: Math.round(ry * 10) / 10, rx: v.rx ?? -9, w: v.w, h: v.h, m: v.m || .66, dmin: v.dmin, hk: v.hk });
    } else if (v.kind === 'select') { // mira: vista neutra e estável, com todos os candidatos dentro da área útil
      const pts = (v.pts && v.pts.length ? v.pts : [a]), xs = pts.map(p => p.x), zs = pts.map(p => p.z), C = { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
      const w = v.w || 1440, safe = w * .36, k = safe / PERSP, sx = w > 900 ? 50 : 0; // deixa respiro para a ordem à esquerda
      const tx = sx - C.x, maxZ = Math.max(...zs); let tz = 560 - maxZ;
      for (const p of pts) tz = Math.min(tz, PERSP - Math.abs(p.x + tx) / Math.max(k, .2) - p.z);
      tz = clamp(Math.floor(tz / 10) * 10, -1800, 320);
      r = { tx, ty: Math.round(Math.max(0, -tz) * .035), tz, ry: 0 };
    } else if (v.kind === 'table') { // ombro de quem age, olhando o centro de todos; recua até caber a mesa (quem fica atrás do ombro não conta)
      const pts = (v.pts && v.pts.length ? v.pts : [a]), C = pts.reduce((m, p) => ({ x: m.x + p.x / pts.length, z: m.z + p.z / pts.length }), { x: 0, z: 0 });
      let dx = C.x - a.x, dz = C.z - a.z; if (Math.hypot(dx, dz) < 60) { dx = 0; dz = v.foe ? 1 : -1; }
      const ln = v.lane && v.lane.w > 0 && (v.w || 1440) >= 900 ? v.lane : null, SX = -200, ZF = 420, k = ((v.w || 1440) / 2 * .82) / PERSP, L = Math.hypot(dx, dz); // ombro: quem age fica à esquerda (SX) e o centro da mesa no meio da tela; a faixa da coluna de comandos empurra o ator para o lado oposto
      const ry = Math.round((Math.atan2(dx, -dz) + Math.asin(clamp(SX / Math.max(L, 1), -.6, .6))) * 1800 / Math.PI) / 10, A = rotP(a, ry);
      const tx = SX - A.x, tz0 = ZF - A.z; let b = 0;
      for (const p of pts) { const q = rotP(p, ry); if (q.z > A.z + 300) continue; b = Math.max(b, q.z + tz0 - PERSP + Math.abs(q.x + tx) / k); if (p.h > 380) b = Math.max(b, p.h * PERSP / ((v.h || 860) * .5) - PERSP + q.z + tz0); } // figura alta: a cabeça projetada cabe na metade de cima do quadro (recua a câmera)
      b = clamp(Math.ceil(b / 10) * 10, 0, 1400);
      r = { tx, ty: Math.round(b * .08), tz: tz0 - b, ry };
      if (ln) { const ka = PERSP / Math.max(160, PERSP - (A.z + r.tz)); const W = v.w || 1440, mx = ln.side > 0 ? W / 2 + SX * ka - W * .3 : W * .7 - (W / 2 + SX * ka); r.tx = tx - ln.side * Math.max(0, Math.min(ln.w * .55, W * .25, mx)) / ka; } // a faixa da coluna: o ator sai da frente dela, em pixels de tela (ka: escala do ator depois do recuo)
    } else if (v.kind === 'zoom') { const ry = v.ry || 0, T = rotP(t, ry), th = t.h || 330; r = { tx: -T.x, ty: -clamp(Math.round(th * .1), 40, 140), tz: -T.z - clamp(Math.round(420 + Math.max(0, th - 380) * 2.8), ZMIN, ZMAX), ry }; } // distância cresce com a altura da figura (corpo inteiro), com piso e teto
    else if (v.kind === 'orbit') { const ry = (v.ry0 || 0) + (v.deg || 0), A = rotP(a, ry); r = { tx: -A.x, ty: -60, tz: -A.z - ORB - (v.back || 0), ry }; } // arco cinematográfico em volta de quem age (de longe: a figura e a aura cabem)
    else if (v.kind === 'aim') r = { tx: -(a.x * .55 + t.x * .45) - 120, ty: 0, tz: -a.z + 380, ry: a.x < 0 ? -4 : 4 };
    else if (v.kind === 'foe') r = { tx: -a.x * .3, ty: 0, tz: 180, ry: 0 };
    else r = { tx: -a.x - 110, ty: 0, tz: -a.z + 560, ry: a.x < 0 ? -6 : 6 };
    const o = { tx: n0(Math.round(r.tx)), ty: n0(Math.round(r.ty)), tz: n0(Math.round(r.tz)), ry: n0(r.ry) }; if (r.rx) o.rx = n0(Math.round(r.rx * 10) / 10); return o;
  };
  // ----- figura padrão (silhueta) e ordem de reserva das imagens -----
  const svgUrl = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s), xesc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const kanjiOf = c => { try { return KANJI[mainEl(c)] || '武'; } catch { return '武'; } }; // KANJI e mainEl vêm do palco.js (no Node não existem)
  const silhouette = (c, back) => {
    const col = /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : c.enemy ? '#e60012' : '#00b7ff';
    if (c.enemy) return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><path d="M30 395 L45 150 Q150 20 255 150 L270 395Z" fill="#26262b" stroke="${col}" stroke-width="6"/><text x="150" y="300" font-family="Shippori Mincho B1,serif" font-weight="800" font-size="150" text-anchor="middle" fill="#e8e2d6">${xesc(kanjiOf(c))}</text></svg>`);
    const L = xesc(String(c.name || '?').slice(0, 1).toUpperCase());
    return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity=".35"/></linearGradient></defs>
 <circle cx="100" cy="62" r="42" fill="${back ? '#15151a' : col}" stroke="${col}" stroke-width="6"/><path d="M30 395 L38 160 Q100 110 162 160 L170 395Z" fill="${back ? '#15151a' : 'url(#g)'}" stroke="${col}" stroke-width="6"/>
 <text x="100" y="${back ? 300 : 290}" font-family="Anton,Impact" font-size="120" text-anchor="middle" fill="${back ? col : '#000'}" opacity="${back ? .9 : .75}">${L}</text></svg>`);
  };
  // kind: f frente (imgF → img → silhueta), b costas (imgB → silhueta de costas), p retrato (imgP → frente com recorte do topo → silhueta); bad: URLs que falharam, ignoradas
  const imgSrc = (c, kind, bad = []) => {
    const ok = u => typeof u === 'string' && u && !bad.includes(u);
    if (kind === 'b') return ok(c.imgB) ? { url: c.imgB, fallback: false } : { url: silhouette(c, true), fallback: true };
    if (kind === 'p' && ok(c.imgP)) return { url: c.imgP, fallback: false };
    const u = [c.imgF, c.img].find(ok);
    if (u) return kind === 'p' ? { url: u, fallback: false, crop: 'top' } : { url: u, fallback: false };
    return { url: silhouette(c, false), fallback: true };
  };

  // Heróis e inimigos mostram frente ou costas conforme o lado da câmera; sem imgB, o inimigo mantém a frente.
  const unitKind = (c, ry = 0) => { const backView = Math.abs(((ry % 360) + 540) % 360 - 180) <= 90; return c?.enemy ? (!backView && c.imgB ? 'b' : 'f') : backView ? 'b' : 'f'; };

  // enquadre (imgK) da imagem própria: x, y em fração da altura da figura (−1..1) e z de 0,5 a 3; nunca na silhueta de reserva
  // frente/costas: a figura tem altura var(--h) e gira pelos pés; retrato: deslocamento em % do próprio quadro, a partir do centro
  const imgFit = (c, kind, src) => {
    const k = c?.imgK?.[kind]; if (!k || typeof k !== 'object' || !src || src.fallback) return '';
    const n = (v, a, b, d) => Math.min(b, Math.max(a, Number.isFinite(+v) && v !== null && v !== '' ? +v : d)), x = n(k.x, -1, 1, 0), y = n(k.y, -1, 1, 0), z = n(k.z, .5, 3, 1);
    return kind === 'p' ? `translate(${+(x * 100).toFixed(1)}%,${+(y * 100).toFixed(1)}%) scale(${z})` : `translate(calc(${x} * var(--h)),calc(${y} * var(--h))) scale(${z})`;
  };

  // as 6 skills do leque: fixadas (na ordem de pins), depois as mais usadas (contagem > 0, decrescente, empate pelo id); só as usáveis, sem repetir
  const pickSix = (pins, use, usable) => {
    const ok = new Set(usable), fix = [...new Set(pins || [])].filter(k => ok.has(k));
    const top = usable.filter(k => !fix.includes(k) && (use?.[k] || 0) > 0).sort((a, b) => use[b] - use[a] || (a < b ? -1 : a > b ? 1 : 0));
    return [...fix, ...top].slice(0, 6);
  };

  // onde o ator volta na fila se gastar `cost` de tempo: tick de volta = ticks[ator] + cost; pos = quantos dos outros agem antes dele (1 = logo depois do atual); empate pela ordem de `order`
  // approx: o vizinho mais próximo está a menos de 5% do custo (a previsão pode errar por pouco)
  const previewSlot = (ticks, actorId, cost, order) => {
    const T = (ticks[actorId] ?? 0) + cost, ix = id => { const i = order.indexOf(id); return i < 0 ? 1e9 : i; }, me = ix(actorId);
    const others = Object.keys(ticks).filter(id => id !== actorId);
    const pos = others.filter(id => ticks[id] < T || (ticks[id] === T && ix(id) < me)).length;
    const near = others.length ? Math.min(...others.map(id => Math.abs(ticks[id] - T))) : Infinity;
    return { pos, approx: near < cost * .05 };
  };

  // estado só deste navegador, lido por cameraFor via view(); mode: vista escolhida (ombro, lateral, aérea), pitch: inclinação manual
  const MODES = ['ombro', 'side', 'tres', 'diag', 'frente', 'baixa', 'aerial'], MODE_NAME = { ombro: 'Ombro', side: 'Lateral', tres: 'Três-quartos', diag: 'Diagonal', frente: 'Frontal', baixa: 'Heroica', aerial: 'Aérea' };
  const FREE = false; // câmera travada: só as posições fixas (V / botão); gire, incline e deslize à mão ligando FREE
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const local = { aim: null, zoom: null, orbit: 0, px: 0, pz: 0, pitch: 0, mode: MODES.includes(lsGet('vj_cam_mode')) ? lsGet('vj_cam_mode') : 'ombro' };
  const PK = 4; // planos grandes (cenário, chão, névoa, grade) têm 1/PK do tamanho e são ampliados ×PK: menos memória de vídeo
  const qNow = () => typeof ANIMFX !== 'undefined' && ANIMFX.level ? ANIMFX.level() : 'medium'; // qualidade efetiva: low | medium | high
  const QCYCLE = ['auto', 'high', 'medium', 'low'], QNAME = { auto: 'Auto', high: 'Alta', medium: 'Média', low: 'Baixa' };
  const frameNow = inB => { const sc = S.scenes[S.scene] || {}; return frame(S.battle.ax || RULES.axisOf(inB), sc.cols, sc.rows); }; // enquadre atual (batalha sem eixo gravado calcula na hora)
  const lungeMs = dist => clamp(Math.round(250 + dist * .12), 300, 700); // ida e volta da investida, pela distância percorrida (px)
  const P = { lane: { w: 0, side: 1 }, ACT, ORB, pickSide, mood, rotP, rotX, fitCam, MODES, rangeOf, lungeMs, frameNow, frame, toWorld, formation, lastFrame: () => lastFr, cameraFor, imgSrc, imgFit, unitKind, pickSix, previewSlot, local, lunge: () => Promise.resolve(), shake() {}, sync() {}, rectOf: () => null };

  // ----- montagem no navegador -----
  let floor = null, rl = null, rb = null, floorKey = '', root = null, atw = null, world = null, scn = null, grp = null, host = null, ro = null, camKey = '', scnKey = '', biomeClass = '', settle = 0, hs1 = 0, hs2 = 0;
  const els = new Map(); // id -> { el, img, mini, sh, hpb, bad: [], key... }
  let shk = null, pcl = null, lingerUntil = 0, tearT = 0, lastF = null, lastFr = null, camLock = null, fastT = 0, camRy = 0; // camLock: a investida segura a câmera no alvo (o sync não a devolve no meio do golpe)
  let rst = null, mbtn = null, qbtn = null;
  const resetLocal = () => { local.orbit = local.px = local.pz = local.pitch = 0; };
  const labels = () => { if (mbtn) mbtn.textContent = `🎥 ${MODE_NAME[local.mode]} · V`; if (qbtn && typeof ANIMFX !== 'undefined') { const s = ANIMFX.settings.quality; qbtn.textContent = `◐ ${QNAME[s] || s}${s === 'auto' ? ` (${QNAME[qNow()]})` : ''}`; } };
  const cycleMode = (d = 1) => { local.mode = MODES[(MODES.indexOf(local.mode) + d + MODES.length) % MODES.length]; lsSet('vj_cam_mode', local.mode); resetLocal(); labels(); if (world) world.style.transition = ''; if (lastF && root) camera(lastF); if (typeof HUD !== 'undefined') setTimeout(HUD.place, 1150); };
  const el =(tag, cls, p) => { const e = document.createElement(tag); if (cls) e.className = cls; (p || null)?.appendChild(e); return e; };
  const ensure = () => {
    if (root) return;
    root = el('div', 'p3d'); root.setAttribute('aria-hidden', 'false');
    const cam = el('div', 'cam', root); shk = el('div', 'shk', cam); world = el('div', 'world', el('div', 'drift', shk)); atw = el('div', 'atw', world); // shk: tremida; drift: deriva idle
    scn = el('div', 'p3d-scn', atw); el('div', 'ground', atw); floor = el('div', 'floorgrid', atw); el('div', 'fog', atw); grp = el('div', 'units', atw); pcl = el('div', 'pcl', atw);
    rl = el('div', 'rangeln', atw); rb = el('div', 'rangelb', atw); rl.hidden = rb.hidden = true;
    // recentralizar: aparece quando o jogador girou, aproximou ou moveu a câmera
    const ui = el('div', 'p3d-ui', root);
    mbtn = el('button', 'p3d-btn', ui); mbtn.type = 'button'; mbtn.title = 'Troca a posição da câmera: ombro, lateral, três-quartos, diagonal, frontal, heroica ou aérea (tecla V; Shift+V volta)';
    mbtn.addEventListener('click', e => { e.stopPropagation(); cycleMode(e.shiftKey ? -1 : 1); });
    qbtn = el('button', 'p3d-btn', ui); qbtn.type = 'button'; qbtn.title = 'Qualidade do palco: Auto ajusta sozinho; Baixa ajuda PCs fracos (menos efeitos de cenário)';
    qbtn.addEventListener('click', e => { e.stopPropagation(); if (typeof ANIMFX === 'undefined') return; const cur = ANIMFX.settings.quality, nx = QCYCLE[(QCYCLE.indexOf(cur) + 1) % QCYCLE.length]; ANIMFX.setQuality(nx); });
    rst = el('button', 'p3d-reset', ui); rst.type = 'button'; rst.textContent = '⌖ Recentralizar'; rst.title = 'Volta a câmera ao enquadre do turno (ou duplo clique no fundo)'; rst.hidden = true;
    rst.addEventListener('click', e => { e.stopPropagation(); resetLocal(); world.style.transition = ''; if (lastF) camera(lastF); });
    labels();
    addEventListener('vj-quality', () => { if (!root) return; root.dataset.q = qNow(); labels(); scnKey = ''; if (root.style.display !== 'none' && S?.battle?.active) scene(); });
    document.body.appendChild(root);
    // clique num recorte vale como clique no alvo dentro do #app (os atalhos estão delegados em #app)
    root.addEventListener('click', e => { const u = e.target.closest('[data-tgt]'); if (!u || !host?.isConnected) return; const i = el('i', '', host); i.dataset.tgt = u.dataset.tgt; i.hidden = true; i.click(); i.remove(); });
    root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-tgt]')) { e.preventDefault(); e.target.click(); } });
    // roda para cima sobre um inimigo dá zoom nele; para baixo sai
    // botão direito + arrastar gira a câmera livremente (o palco tem pointer-events:none, então escuta a janela); só sem comando em cena
    // botão esquerdo (no fundo, fora de botões e recortes) ou direito: arrastar na horizontal gira, na vertical inclina; o esquerdo só vale depois de 6 px (clique simples continua clique)
    let drag = null; const inStage = e => { if (!root || root.style.display === 'none') return false; const r = root.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && !e.target.closest?.('button,input,select,textarea,.result'); };
    const UIQ = 'a,label,[data-tgt],[data-lq],[data-a],[data-g],[role=button],.hud-mini,.chatcol,.lq,.hrq,.dlg-bg,.modal,header,.top,.qte3d,.cmdq,.skl,.ot,.ta,.stroke';
    addEventListener('pointerdown', e => { if (!FREE || camLock || !inStage(e) || (e.button !== 2 && e.button !== 0) || (e.button === 0 && e.target.closest?.(UIQ))) return; drag = { x: e.clientX, y: e.clientY, o: local.orbit, p: local.pitch, live: e.button === 2, b: e.button }; if (drag.live) { world.style.transition = 'none'; e.preventDefault(); } });
    addEventListener('pointermove', e => { if (!drag) return; if (camLock) { drag = null; world.style.transition = ''; return; } const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.live) { if (Math.hypot(dx, dy) < 6) return; drag.live = true; world.style.transition = 'none'; }
      local.orbit = clamp(drag.o + dx * .3, -180, 180); local.pitch = clamp(drag.p - dy * .15, -70, 18); if (lastF) camera(lastF); });
    addEventListener('pointerup', e => { if (!drag) return; const moved = drag.live && drag.b === 0; drag = null; world.style.transition = ''; if (moved) { const kill = ev => { ev.stopPropagation(); ev.preventDefault(); }; addEventListener('click', kill, { capture: true, once: true }); setTimeout(() => removeEventListener('click', kill, true), 0); } /* o clique que fecha o arrasto não vira clique */ if (typeof HUD !== 'undefined') HUD.place(); });
    addEventListener('contextmenu', e => { if (FREE && inStage(e)) e.preventDefault(); });
    addEventListener('dblclick', e => { if (camLock || !inStage(e) || e.target.closest('[data-tgt]')) return; resetLocal(); if (lastF) camera(lastF); });
    // roda fora de um inimigo: aproxima/afasta a câmera; WASD/setas: desliza pela cena (setas não, com a mira aberta). Tudo some quando um comando entra em cena
    addEventListener('wheel', e => { if (!FREE || camLock || !inStage(e) || e.target.closest?.('.bb.foe:not(.ko)')) return; e.preventDefault(); local.pz = clamp(local.pz - e.deltaY * .5, -1400, 320); world.style.transition = 'transform .12s ease-out'; if (lastF) camera(lastF); }, { passive: false });
    // WASD/setas deslizam; Q/E giram em volta da cena; V troca a vista (ombro → lateral → aérea)
    const keys = new Set(), DIR = { w: [0, 1, 0], s: [0, -1, 0], a: [1, 0, 0], d: [-1, 0, 0], arrowup: [0, 1, 0], arrowdown: [0, -1, 0], arrowleft: [1, 0, 0], arrowright: [-1, 0, 0], q: [0, 0, -1], e: [0, 0, 1] }; let mvT = 0, mvLast = 0;
    const mv = now => { mvT = 0; if (camLock || !keys.size || !root || root.style.display === 'none') { keys.clear(); world.style.transition = ''; return; } const dt = Math.min(50, now - (mvLast || now)); mvLast = now; let x = 0, z = 0, o = 0; for (const k of keys) { x += DIR[k][0]; z += DIR[k][1]; o += DIR[k][2]; } local.px = clamp(local.px + x * dt * .7, -1100, 1100); local.pz = clamp(local.pz + z * dt * .7, -1400, 320); local.orbit = clamp(local.orbit + o * dt * .09, -180, 180); if (lastF) camera(lastF); mvT = requestAnimationFrame(mv); };
    const typing = e => e.target.closest?.('input,textarea,select,[contenteditable]');
    addEventListener('keydown', e => { if (e.key.toLowerCase() !== 'v' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !root || root.style.display === 'none' || typing(e) || document.querySelector('.dlg-bg')) return; e.preventDefault(); cycleMode(e.shiftKey ? -1 : 1); });
    addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (!FREE || !DIR[k] || camLock || e.ctrlKey || e.metaKey || e.altKey || !root || root.style.display === 'none' || e.target.closest?.('input,textarea,select,[contenteditable]')) return; if (k.startsWith('arrow') && (e.defaultPrevented || local.aim || document.querySelector('.lq,.hud-tgt.on,.skl'))) return; keys.add(k); world.style.transition = 'none'; if (!mvT) { mvLast = 0; mvT = requestAnimationFrame(mv); } });
    addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (!keys.size) world.style.transition = ''; });
    addEventListener('blur', () => keys.clear());
    root.addEventListener('wheel', e => { const u = e.target.closest?.('.bb.foe:not(.ko)'); if (!u || !host?.isConnected) return; e.preventDefault();
      const want = e.deltaY < 0 ? u.dataset.tgt : null; if ((local.zoom || null) === want || (!want && !local.zoom)) return; local.zoom = want; if (typeof render === 'function') render(); }, { passive: false });
    addEventListener('scroll', place, true); addEventListener('resize', place);
  };
  const place = () => {
    if (!root || !host || !host.isConnected) return;
    const r = host.getBoundingClientRect(); document.documentElement.style.setProperty('--hk', Math.max(.36, .75 * Math.min(r.width / 1440, r.height / 860, 1.6)).toFixed(3)); // escala do HUD e do leque (desenhados para 1440×860, mostrados a 75%)
    Object.assign(root.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  };
  const mount = h => {
    if (host !== h) { ro?.disconnect(); host = h; if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(place); ro.observe(h); } }
    root.style.display = ''; place();
  };

  // cenário: só refaz quando muda o fundo, o clima ou a cena
  const scene = () => {
    const q = qNow(), sc = S.scenes[S.scene] || {}, key = [S.scene, sc.bbg, sc.bg, sc.mood, sc.hora, sc.clima, JSON.stringify(sc.bbL || {}), q].join('|'); if (key === scnKey) return; scnKey = key;
    const pre = BBG[sc.bbg], img = !pre ? (sc.bbg || sc.bg || '') : '', biome = pre ? sc.bbg : 'custom';
    root.dataset.mood = mood(sc); // luz da hora do dia (véu em style.css)
    root.dataset.biome = biome; // o piso e as paredes acompanham a mesma seleção
    if (biomeClass) root.classList.remove(biomeClass); biomeClass = pre ? 'bb-' + sc.bbg : ''; if (biomeClass) root.classList.add(biomeClass); // as cores do tema também chegam ao piso e ao teto
    const ps = typeof PFX !== 'undefined' ? PFX.particlesFor(sc.clima, PFX.particleCount(q, matchMedia('(prefers-reduced-motion: reduce)').matches), 7) : [];
    const faceTheme = pre ? 'bb-' + sc.bbg : img ? 'img' : '', faceStyle = img && !pre ? `background-image:url('${esc(img)}')` : '', art = pre ? bbfx : '', clima = CLIMAV[sc.clima] ? `<i class="clima cl-${sc.clima}" aria-hidden="true"></i>` : '';
    const face = (pos, transform) => `<div class="bbplane stage envface ${pos} ${faceTheme}" ${faceStyle ? `style="${faceStyle};transform:${transform}"` : `style="transform:${transform}"`}>${art}${pos === 'env-back' && !ps.length ? clima : ''}</div>`;
    // O campo fica dentro de um skybox 3D; a mesma arte envolve fundo, quatro paredes e teto.
    // Cada face tem 1/4 do tamanho e é ampliada ×4 (PK): o Chromium rasteriza camadas 3D no tamanho CSS delas, e as faces que cruzam a câmera
    // são rasterizadas inteiras; em tamanho cheio (7200 px) isso estourava a memória de vídeo de PCs fracos e o palco ficava preto nos golpes.
    const faces = face('env-back', `translateZ(-3000px) scale(${PK})`) + face('env-left', `translate3d(-3600px,0,0) rotateY(90deg) scale(${PK})`) + face('env-right', `translate3d(3600px,0,0) rotateY(-90deg) scale(${PK})`) + (q === 'low' && !pre ? '' : face('env-front', `translateZ(3000px) scale(${PK})`) + face('env-ceiling', `translate3d(0,-2000px,0) rotateX(-90deg) scale(${PK})`));
    scn.innerHTML = faces + (typeof PFX !== 'undefined' ? PFX.layerPlanes(sc).map(L => `<div class="bbplane layer ly-${L.key}" style="background-image:url('${esc(L.url)}');transform:translateZ(${L.z}px) scale(${+(L.k * PK).toFixed(3)})"></div>`).join('') : '');
    if (pre && typeof TERRENO3D !== 'undefined') TERRENO3D.montar(scn, biome.split('-')[0], q); // bosque, pátio ou praia em 3D (a quantidade de peças segue a qualidade)
    pcl.innerHTML = ps.map(p => `<i class="pt pt-${p.kind}" style="--x:${p.x};--z:${p.z};--y:${p.y0};--s:${p.s};animation-duration:${p.dur}s;animation-delay:-${p.delay}s"></i>`).join(''); // clima em 3D: entre os recortes, com profundidade
  };

  const view = F => {
    const cur = S.chars[timeline(1)[0]], at = id => F.get(id) || { x: 0, z: 0 }, pts = [...F].map(([id, p]) => ({ x: p.x, z: p.z, h: parseFloat(els.get(id)?.h) || 330 })), w = root?.clientWidth || 1440; // pontos com a altura real da figura
    const tbl = id => ({ kind: 'table', at: at(id), pts, w, h: root?.clientHeight || 860, foe: !!S.chars[id]?.enemy, lane: P.lane });
    const dt = cur?.enemy && S.battle.cmd?.foe === cur.id && (S.battle.cmd.tgs || []).find(id => F.has(id)); // janela de defesa: a câmera fica no ombro do herói alvo (o anel abre sobre ele)
    const out = local.mode !== 'ombro' && !local.aim ? { kind: local.mode, pts, w, h: root?.clientHeight || 860, fast: !!dt } : null; // vista de fora escolhida: lateral ou aérea, com todos no quadro
    const hp = id => ({ ...at(id), h: parseFloat(els.get(id)?.h) || 330 }); // janela de defesa: plano aberto do inimigo com o alvo (o mesmo da investida que vem depois: sem corte)
    const base = local.aim ? { kind: 'aerial', pts, w, h: root?.clientHeight || 860 } : out ? out : !cur ? { kind: 'table', at: { x: -430, z: 0 }, pts, w } : dt ? { kind: 'two', at: hp(cur.id), to: hp(dt), ry0: camRy, ...ACT, w, h: root?.clientHeight || 860, fast: true } : tbl(cur.id);
    if (local.zoom && F.has(local.zoom)) return { kind: 'zoom', to: { ...F.get(local.zoom), h: parseFloat(els.get(local.zoom)?.h) || 330 }, ry: cameraFor(base).ry };
    return base;
  };
  const setCls = (u, k, on) => { if (u.cls[k] !== on) { u.cls[k] = on; u.el.classList.toggle(k, on); } };
  const setImg = u => { const k = unitKind(u.c, camRy), s = imgSrc(u.c, k, u.bad), t = imgFit(u.c, k, s); u.el.dataset.kind = k; u.url = s.url; u.fb = s.fallback; if (u.src !== s.url) { u.src = s.url; u.img.src = s.url; } if (u.fit !== t) { u.fit = t; u.img.style.transform = t; } };
  const mkUnit = c => {
    const e = el('div', 'bb unit ' + (c.enemy ? 'foe' : 'hero')), u = { el: e, cls: {}, bad: [], src: '', pos: '', h: '', mini: '' };
    e.dataset.tgt = c.id; e.tabIndex = 0; e.setAttribute('role', 'button'); el('i', 'shadow', e); el('i', 'ring', e);
    u.picktag = el('b', 'picktag', e); // na mira, identifica cada candidato sem depender do tamanho ou da imagem do recorte
    u.sts = el('div', 'sts', e); // âncora das condições (.sti): as marcas de condição nova e de efeito contínuo do coreo.js caem aqui
    if (c.enemy) { u.miniEl = el('div', 'mini', e); u.sh = el('b', 'sh', u.miniEl); u.hpb = el('i', 'hp', u.miniEl); u.hpt = el('i', 'trail', u.hpb); u.hpi = el('i', '', u.hpb); u.shb = el('b', 'shbar', u.hpb); }
    u.inner = el('div', 'bbi', e); u.img = el('img', '', u.inner); u.img.alt = ''; // o .bbi é quem anima (cast, hit, dodge, kofall): o .bb só posiciona
    u.img.draggable = false;
    u.img.addEventListener('error', () => { if (u.url && !u.fb) { u.bad.push(u.url); setImg(u); } }); // imagem quebrada: cai para a próxima reserva
    grp.appendChild(e); return u;
  };
  // chão: grade alinhada ao mapa, cor do anel de cada recorte e a linha de alcance da mira
  const colorOf = c => /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : c.enemy ? '#e60012' : '#00b7ff';
  const fmt = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const chao = (fr, F, cur) => {
    const sc = S.scenes[S.scene] || {}, piso = sc.bbL?.piso || '', grid = sc.grid !== false, show = (grid || piso) && sc.cols > 0 && sc.rows > 0, key = show ? [S.scene, sc.cols, sc.rows, fr.a, fr.cx, fr.cy, fr.k, piso, grid].join('|') : '';
    if (key !== floorKey) { floorKey = key; floor.hidden = !show;
      if (show) { const o = toWorld(-.5, -.5, fr, true), c = Math.cos(fr.a), s = Math.sin(fr.a); // x local = coluna do grid, y local = linha; ambos deitados no chão
        const k4 = fr.k / PK, gl = 'linear-gradient(#fff1 .5px,transparent .5px),linear-gradient(90deg,#fff1 .5px,transparent .5px)', cell = k4 + 'px ' + k4 + 'px'; // piso: imagem esticada no tabuleiro, grade por cima se visível (1/4 do tamanho, ampliado ×4 na matriz)
        Object.assign(floor.style, { width: sc.cols * k4 + 'px', height: sc.rows * k4 + 'px', backgroundImage: [grid ? gl : '', piso ? `url("${piso.replace(/["\\]/g, encodeURIComponent)}")` : ''].filter(Boolean).join(','), backgroundSize: [grid ? cell + ',' + cell : '', piso ? '100% 100%' : ''].filter(Boolean).join(','), boxShadow: grid ? '' : 'none', transform: `matrix3d(${-s * PK},0,${-c * PK},0,${c * PK},0,${-s * PK},0,0,-1,0,0,${o.x.toFixed(1)},-2,${o.z.toFixed(1)},1)` }); } }
    const t = local.aim && S.chars[local.aim], r = cur && t && F.has(cur.id) && F.has(t.id) ? rangeOf(cur, t, sc.unit) : null;
    rl.hidden = rb.hidden = !r;
    if (r) { const a = F.get(cur.id), b = F.get(t.id), dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
      rl.style.width = L.toFixed(0) + 'px'; rl.style.transform = `translate3d(${a.x}px,-3px,${a.z}px) rotateY(${(Math.atan2(-dz, dx) * 180 / Math.PI).toFixed(2)}deg) rotateX(90deg)`;
      rb.style.transform = `translate3d(${(a.x + dx / 2).toFixed(0)}px,-40px,${(a.z + dz / 2).toFixed(0)}px) translate(-50%,-100%)`;
      rb.textContent = `${r.casas} ${r.casas === 1 ? 'casa' : 'casas'}${r.m != null ? ' · ' + fmt(r.m) + ' m' : ''}`; }
  };
  // mini barra: dano cai já e o rastro desce depois; cura sobe o rastro verde e a barra vem depois
  const trailBar = (u, w) => { const n = parseFloat(w), o = u.hpw ?? n, p = typeof PFX !== 'undefined' ? PFX.trailPlan(o, n) : null; u.hpw = n;
    if (!p) { u.hpi.style.width = u.hpt.style.width = w; return; } u.hpt.classList.toggle('heal', p.heal); u.hpi.style.transitionDelay = p.bar.delay + 'ms'; u.hpt.style.transitionDelay = p.trail.delay + 'ms'; u.hpi.style.width = u.hpt.style.width = w; };
  const miniSh = (u, hp, sp) => { if (!u.shb || typeof PFX === 'undefined') return; const g2 = PFX.shieldSeg(hp, sp); u.shb.style.left = g2.l + '%'; u.shb.style.width = g2.w + '%'; };
  const units = () => {
    const inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks), cur = S.chars[timeline(1)[0]];
    const fr = frameNow(inB), F = formation(inB, fr), V = new Map(); // V: onde cada um aparece agora (o inimigo da vez já avançou)
    const picking = typeof LEQUE !== 'undefined' && !!LEQUE.aimTarget(), pickable = new Set(picking ? LEQUE.aimList().map(c => c.id) : []);
    root.classList.toggle('selecting', picking); root.dataset.pick = picking ? '1' : '';
    for (const [id, u] of els) if (!inB.some(c => c.id === id)) { u.el.remove(); els.delete(id); }
    for (const c of inB) {
      let u = els.get(c.id); if (!u) { u = mkUnit(c); els.set(c.id, u); }
      const p = F.get(c.id), adv = c === cur && c.enemy, x = adv ? Math.round(p.x / 2) : p.x, z = adv ? Math.round(p.z / 2) : p.z, pos = x + ',' + z; V.set(c.id, { x, z }); // inimigo na vez anda metade do caminho até os heróis
      u.home = { x, z };
      if (u.pos !== pos && !u.lunging) { const was = u.xy; u.pos = pos; u.xy = { x, z }; // mudou de lugar: anda até lá (passo com balanço), no tempo da distância
        if (was && !reducedM()) { const d = Math.hypot(x - was.x, z - was.z); if (d > 40) { const ms = Math.round(clamp(d / .9, 450, 1500)); u.el.style.setProperty('--mvd', ms + 'ms'); u.el.classList.add('walk'); clearTimeout(u.walkT); u.walkT = setTimeout(() => { u.el.classList.remove('walk'); u.el.style.removeProperty('--mvd'); }, ms); } }
        u.el.style.setProperty('--x', x); u.el.style.setProperty('--z', z); }
      const h = Math.round((c.enemy ? 380 : 300) * (Math.min(2.5, (c.boss ? 1.6 : 1) * Math.max(0.5, Number.isFinite(+c.imgS) && c.imgS !== null && c.imgS !== '' ? +c.imgS : 1)))) + 'px'; if (u.h !== h) { u.h = h; u.el.style.setProperty('--h', h); }
      u.c = c; setImg(u); { const col = colorOf(c); if (u.col !== col) { u.col = col; u.el.style.setProperty('--c', col); } }
      { const tag = c.name + (c.hp <= 0 ? ' · CAÍDO' : ''); if (u.tag !== tag) { u.tag = tag; u.picktag.textContent = tag; } }
      setCls(u, 'pickable', pickable.has(c.id));
      u.el.classList.toggle('ko', c.hp <= 0); if (c.hp > 0) u.el.classList.remove('kofall'); setCls(u, 'cur', c === cur); // ko direto (sem cache): o coreo adia o ko e o próximo desenho o repõe
      { const k = c.hp > 0 ? stIcons(c) : ''; if (u.stk !== k) { u.stk = k; u.sts.innerHTML = k; } } setCls(u, 'tgt', c.id === tgt); if (typeof PVIDA !== 'undefined') PVIDA.unit(u, c);
      if (c.enemy && !(typeof BARHOLD !== 'undefined' && BARHOLD.has(c.id))) { const m = c.brk && c.hp > 0 ? '◆' + c.brk.cur : '', hp = Math.max(0, Math.min(100, 100 * c.hp / (c.hpMax || 1))), sp = c.hp > 0 ? 100 * (c.shield || 0) / (c.hpMax || 1) : 0, w = hp + '%';
        if (u.mini !== m + w + sp) { u.mini = m + w + sp; u.sh.textContent = m; u.sh.hidden = !m; trailBar(u, w); miniSh(u, hp, sp); } } // barra presa: o coreo a solta no impacto
    }
    lastF = F; lastFr = fr; chao(fr, F, cur); return V;
  };
  // alvo que some (removido, caído ou oculto): a mira vai para o próximo inimigo de pé e o zoom fecha; devolve se algo mudou
  const vivo = id => { const c = S.chars[id]; return !!c && id in S.battle.ticks && c.hp > 0 && !c.dead; };
  const sumiu = id => { const c = S.chars[id]; return !c || !(id in S.battle.ticks) || c.dead || (c.enemy && c.hp <= 0); }; // aliado caído continua mirável (reviver, item)
  const heal = () => {
    let ch = false;
    if (local.zoom && sumiu(local.zoom)) { local.zoom = null; ch = true; }
    if (tgt && (!S.chars[tgt] || !(tgt in S.battle.ticks) || (S.chars[tgt].enemy && S.chars[tgt].hp <= 0 && !(typeof LEQUE !== 'undefined' && LEQUE.aimTarget() === tgt)))) { /* caído só sai do alvo fora da mira */ const f = Object.values(S.chars).find(c => c.enemy && vivo(c.id)); if (f) { tgt = f.id; aim = null; ch = true; } }
    if (local.aim && sumiu(local.aim)) local.aim = S.chars[tgt] && !sumiu(tgt) ? tgt : null; // a mira local é refeita a cada desenho: não pede outro
    return ch;
  };
  const camera = F => {
    root.classList.toggle('locked', !!camLock); // a deriva idle para enquanto um comando segura a câmera
    const v0 = view(F), vb = camLock || cameraFor(v0), mine = local.orbit || local.px || local.pz || local.pitch, v = !camLock && mine ? { ...vb, tx: n0(Math.round(vb.tx + local.px)), tz: n0(Math.round(vb.tz + local.pz)), ry: n0(Math.round((vb.ry + local.orbit) * 10) / 10), rx: n0(clamp((vb.rx || 0) + local.pitch, -75, 20)) } : vb;
    const rx = v.rx || 0, k = `${v.tx},${v.ty},${v.tz},${v.ry},${rx}`, tr = `translate3d(${v.tx}px,${v.ty}px,${v.tz}px) rotateX(${rx}deg) rotateY(${v.ry}deg)`; // rotateX sempre presente: a transição interpola função a função
    if (!camLock) world.dataset.cam = tr; // o enquadramento do turno (a fumaça confere a volta depois da investida)
    if (rst) rst.hidden = !!camLock || !mine;
    if (k === camKey) return; camKey = k; world.style.transform = tr; world.style.setProperty('--bry', v.ry + 'deg'); world.style.setProperty('--brx', rx + 'deg'); if (typeof TERRENO3D !== 'undefined') { world.style.setProperty('--hx', TERRENO3D.hx(v.ry)); world.style.setProperty('--sd', TERRENO3D.sd(v.ry)); TERRENO3D.cam(v, root.clientHeight || 860); } // copas com o brilho do lado do sol; some o que tapar a luta // os recortes giram de volta: sempre de frente para a câmera (a figura também inclina para ela)
    if (unitKind({}, v.ry) !== unitKind({}, camRy)) { camRy = v.ry; for (const u of els.values()) if (u.c) setImg(u); } else camRy = v.ry;
    if (!camLock && v0.fast) { world.classList.add('fast'); clearTimeout(fastT); fastT = setTimeout(() => !camLock && world.classList.remove('fast'), 500); } // o anel de defesa dura ~1,3 s: a câmera não pode levar 1,1 s para chegar
  };

  const tear = () => { tearT = 0; const w = lingerUntil - performance.now(); if (w > 0) { tearT = setTimeout(tear, w); return; } if (!root) return;
    root.style.display = 'none'; root.classList.remove('derrota', 'vinheta'); for (const u of els.values()) u.el.remove(); els.clear(); camKey = ''; camLock = null; if (typeof CENA !== 'undefined') CENA.reset(); };
  P.sync = h => {
    if (typeof document === 'undefined') return;
    if (!h) { if (root && root.style.display !== 'none' && !tearT) tearT = setTimeout(tear, Math.max(120, lingerUntil - performance.now())); local.zoom = null; return; } // fim da batalha: some com os recortes depois da pose final (P.linger)
    if (tearT) { clearTimeout(tearT); tearT = 0; }
    ensure(); mount(h); { const q = qNow(); if (root.dataset.q !== q) { root.dataset.q = q; labels(); } } scene();
    if (heal() && typeof render === 'function') setTimeout(render); // redesenha o HUD sem a ficha do alvo que sumiu
    camera(units());
    if (typeof HUD !== 'undefined') { HUD.place(); clearTimeout(hs1); clearTimeout(hs2); hs1 = setTimeout(HUD.place, 650); hs2 = setTimeout(HUD.place, 1250); } // a câmera leva ~1,1 s para chegar
    requestAnimationFrame(place); clearTimeout(settle); settle = setTimeout(place, 400); // a página ainda anima a entrada (a posição final só vem depois)
  };
  // investida: a câmera corre até o alvo (0,45 s) e o recorte de quem age avança até a frente dele; resolve no impacto e volta sozinho
  const LG_HOLD = 500; // pausa no alvo (o número nasce aqui); ida e volta duram lungeMs(distância)
  let lungeN = 0;
  // ponto com altura (a câmera enquadra pés e cabeça)
  const ptOf = (id, p = lastF?.get(id)) => p ? { x: p.x, z: p.z, h: parseFloat(els.get(id)?.h) || 330 } : null;
  const hw = () => ({ w: root.clientWidth || 1440, h: root.clientHeight || 860 });
  const WU = 130; // antecipação: o recorte recua e agacha antes de avançar
  P.lunge = (fromId, toId, family) => new Promise(res => {
    const a = els.get(fromId), F = lastF, to = F?.get(toId), from = F?.get(fromId);
    if (!a || !to || !from || fromId === toId || !root || root.style.display === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return res();
    const z0 = +a.el.style.getPropertyValue('--z') || from.z, x0 = +a.el.style.getPropertyValue('--x') || from.x, dz = Math.sign(z0 - to.z) || 1, dx = Math.sign(from.x - to.x) || -1;
    const tx = to.x + 140 * dx, tz = to.z + 260 * dz, ms = lungeMs(Math.hypot(tx - x0, tz - z0));
    // câmera de fora: plano a dois, de lado, com atacante e alvo inteiros no quadro (volta à vista escolhida depois)
    camLock = cameraFor({ kind: 'two', at: ptOf(fromId, { x: tx, z: tz }), to: ptOf(toId), pts: [ptOf(fromId, { x: x0, z: z0 })], ry0: camRy, ...ACT, ...hw() }); /* de lado para o ponto de chegada, aberto: a ida, o impacto e o efeito cabem num plano só */ world.classList.add('fast'); world.style.setProperty('--lg', Math.max(CAM_MS, ms + WU) + 'ms'); camera(F);
    holdEnd = performance.now() + 4000; a.lunging = true; lungeN++; document.documentElement.classList.add('p3-golpe');
    const st = a.el.style, L = Math.hypot(tx - x0, tz - z0) || 1; st.setProperty('--wx', Math.round(-(tx - x0) / L * 40)); st.setProperty('--wz', Math.round(-(tz - z0) / L * 40)); // recuo curto no sentido contrário
    a.el.classList.remove('hopb', 'walk'); a.el.classList.add('windup');
    setTimeout(() => {
      a.el.classList.remove('windup'); a.el.classList.add('lunging'); st.setProperty('--lg', ms + 'ms');
      { const A = typeof PFX !== 'undefined' ? PFX.lungeArc(family) : null; if (A) { st.setProperty('--arc-h', A.h); st.setProperty('--crouch', A.crouch); st.setProperty('--lg-ease', A.ease); a.el.classList.remove('arc'); void a.el.offsetWidth; a.el.classList.add('arc'); } }
      st.setProperty('--x', tx); st.setProperty('--z', tz);
      setTimeout(() => { a.el.classList.remove('impact'); void a.el.offsetWidth; a.el.classList.add('impact'); setTimeout(() => a.el.classList.remove('impact'), 260); res(); }, ms);
    }, WU);
    setTimeout(() => { // volta: pulo curto para trás até a casa (não desliza)
      a.lunging = false; a.el.classList.remove('lunging', 'arc'); const h = a.home || from; a.pos = h.x + ',' + h.z; a.xy = { ...h };
      a.el.classList.add('hopb'); st.setProperty('--mvd', '460ms'); st.setProperty('--x', h.x); st.setProperty('--z', h.z); clearTimeout(a.walkT); a.walkT = setTimeout(() => { a.el.classList.remove('hopb'); st.removeProperty('--mvd'); }, 480);
      unlock(ms); if (--lungeN <= 0) { lungeN = 0; document.documentElement.classList.remove('p3-golpe'); } }, WU + ms + LG_HOLD); // p3-golpe: a coluna de comandos some durante a investida
  });
  // a câmera segura a cena do comando até P.hold expirar; só então volta ao enquadre do turno seguinte
  let holdEnd = 0, unT = 0;
  const unlock = (ms = 450) => { clearTimeout(unT); const w = holdEnd - performance.now(); if (w > 0) { unT = setTimeout(() => unlock(ms), w + 10); return; } if (!camLock) return; camLock = null; if (lastF && root?.style.display !== 'none' && S.battle?.active) camera(units()); /* depois do fim, units() apagaria a pose final */ setTimeout(() => { if (camLock) return; world.classList.remove('fast'); world.style.removeProperty('--lg'); }, ms); };
  P.hold = ms => { holdEnd = performance.now() + ms; unlock(); };
  // técnica: um plano aberto e parado com quem age e todos os alvos desde o começo; o efeito atravessa a tela sem a câmera andar.
  // Um alvo: de lado, a dois. Vários: plano de área. Em si mesmo: plano médio de quem age (nunca close).
  const CAM_MS = 650; // a câmera nunca chega em menos que isso (corte brusco parece bug)
  const shotOf = (fromId, toIds) => { const from = ptOf(fromId), tg = toIds.map(id => ptOf(id)).filter(Boolean).filter(p => Math.hypot(p.x - from.x, p.z - from.z) > 1);
    if (!tg.length) return cameraFor({ kind: 'wide', pts: [from], ry0: camRy, ...ACT, m: .42, ...hw() });
    if (tg.length > 1) return cameraFor({ kind: 'wide', pts: [from, ...tg], ry0: camRy, ...ACT, m: .7, ...hw() });
    return cameraFor({ kind: 'two', at: from, to: tg[0], ry0: camRy, ...ACT, ...hw() }); };
  P.focus = (fromId, toIds = [], ms = CAM_MS) => new Promise(res => {
    const F = lastF, from = F?.get(fromId);
    if (!from || !root || root.style.display === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return res();
    camLock = shotOf(fromId, toIds); holdEnd = performance.now() + 4000;
    world.classList.add('fast'); world.style.setProperty('--lg', Math.max(CAM_MS, ms) + 'ms'); camera(F); setTimeout(res, Math.max(0, Math.min(ms, 420) - 40)); // o efeito já sai enquanto a câmera assenta
  });
  // o efeito voa até o alvo: a câmera fica parada no plano do focus; só segura a cena até o impacto
  P.follow = (fromId, toIds = [], ms = 500) => { if (!live() || !camLock) return; holdEnd = Math.max(holdEnd, performance.now() + ms + 400); };
  // impacto no recorte: tremida curta (classe hurt por 450 ms)
  P.shake = id => { const u = els.get(id); if (!u) return; if (g.LUZ?.corpo?.has(id)) g.LUZ.corpo.flash(id); u.el.classList.remove('hurt'); void u.el.offsetWidth; u.el.classList.add('hurt'); clearTimeout(u.hurtT); u.hurtT = setTimeout(() => u.el.classList.remove('hurt'), 450); };
  const reducedM = () => matchMedia('(prefers-reduced-motion: reduce)').matches, live = () => !!root && root.style.display !== 'none';
  P.quake = (amp, dir = 1) => { if (!shk || !amp || reducedM() || typeof PFX === 'undefined') return; shk.animate(PFX.shakeKeys(amp, dir), { duration: 320, easing: 'ease-out' }); }; // o mundo treme na direção do golpe
  let vigT = 0; P.vignette = ms => { if (!root) return; root.classList.add('vinheta'); clearTimeout(vigT); vigT = setTimeout(() => root.classList.remove('vinheta'), ms); };
  // recuo: empurrão para longe de quem bateu, inclinação e, no golpe forte, joelho no chão
  P.recoil = (id, fromId, pct, crit) => { const u = els.get(id), a = lastF?.get(fromId), b = lastF?.get(id); P.shake(id); if (!u || !b || reducedM() || typeof PFX === 'undefined') return;
    const v = PFX.recoilVec(a && fromId !== id ? a : b, b, pct, crit), st = u.el.style; u.el.classList.add('rc'); st.transition = 'none'; st.setProperty('--rx', v.dx); st.setProperty('--rz', v.dz); st.setProperty('--tilt', v.tilt + 'deg'); void u.el.offsetWidth; st.transition = '';
    clearTimeout(u.rcT); u.rcT = setTimeout(() => { st.setProperty('--rx', 0); st.setProperty('--rz', 0); st.setProperty('--tilt', '0deg'); setTimeout(() => u.el.classList.remove('rc'), 320); }, 140);
    if (g.LUZ?.corpo?.has(id)) { const sa = rectOfU(fromId), sb = u.el.getBoundingClientRect(); g.LUZ.corpo.play(id, v.kneel ? 'hurt' : 'hit', { dir: sa ? Math.sign(sa.left + sa.width / 2 - sb.left - sb.width / 2) || 1 : 1 }); }
    if (v.kneel) { u.el.classList.add('kneel'); clearTimeout(u.knT); u.knT = setTimeout(() => u.el.classList.remove('kneel'), 400); } };
  const orbitTo = (at, deg, ms, back = 0) => new Promise(res => { if (!live() || !at || reducedM()) return res(); camLock = cameraFor({ kind: 'orbit', at, ry0: camRy, deg, back }); holdEnd = performance.now() + ms + 200;
    world.classList.add('fast'); world.style.setProperty('--lg', ms + 'ms'); camera(lastF); setTimeout(() => { res(); unlock(400); }, ms); });
  P.orbitShot = (id, deg = 45, ms = 1000) => orbitTo(lastF?.get(id), deg, ms);
  P.orbitGroup = (ids, deg, ms) => { const ps = ids.map(id => lastF?.get(id)).filter(Boolean); return ps.length ? orbitTo({ x: ps.reduce((t, p) => t + p.x, 0) / ps.length, z: ps.reduce((t, p) => t + p.z, 0) / ps.length }, deg, ms, 400) : Promise.resolve(); };
  // luz do elemento: quem está perto do impacto se tinge, e um clarão pinta o chão
  P.light = (id, color) => { const c = lastF?.get(id); if (!c || !live() || typeof PFX === 'undefined') return;
    for (const { id: j, k } of PFX.litUnits(lastF, c)) { const u = els.get(j); if (!u) continue; if (g.LUZ?.corpo?.has(j)) { g.LUZ.corpo.tint(j, color, k, 500); continue; } u.el.style.setProperty('--lit', color); u.el.style.setProperty('--litk', k); u.el.classList.add('lit'); clearTimeout(u.litT); u.litT = setTimeout(() => u.el.classList.remove('lit'), 500); }
    if (qNow() !== 'low' && !reducedM()) { root.style.setProperty('--tint', color); root.classList.add('tinted'); clearTimeout(P.tintT); P.tintT = setTimeout(() => root.classList.remove('tinted'), 450); } // o cenário se tinge por um instante
    const f = el('i', 'flare', atw); f.style.cssText = `--lit:${color};transform:translate3d(${c.x}px,-2px,${c.z}px) translate(-50%,-50%) rotateX(90deg)`; setTimeout(() => f.remove(), 520); };
  const rectOfU = id => els.get(id)?.el.getBoundingClientRect() || null;
  P.linger = ms => { lingerUntil = Math.max(lingerUntil, performance.now() + ms); };
  P.miniHp = (id, hp, sp) => { const u = els.get(id); if (!u?.hpi) return; u.mini = null; trailBar(u, hp + '%'); if (sp != null) miniSh(u, hp, sp); }; // o coreo desce a mini barra a cada batida
  P.unitOf = id => els.get(id) || null;
  P.posOf = id => lastF?.get(id) || null;
  P.rectOf = id => els.get(id)?.el.getBoundingClientRect() || null;
  g.PALCO3D = P;
})(globalThis);

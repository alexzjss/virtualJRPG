// ===== leque de comandos do jogador no PC: coluna de pinceladas presa ao ombro do herói da vez, no lugar do painel command() =====
// Menu (1 Atacar, 2 Skills, 3 Itens, Q Mirar parte) → lista (skills ou itens) → mira (escolher o alvo no palco) → Enter age.
// O estado da escolha continua nos globais do painel antigo (pick, tgt, aim, aimOpen, braveOn, passTo); aqui só vive o passo em que o leque está.
// A coluna segue o recorte na tela (follow) e escala pelo --hk; os comandos de turno (hud.js HUD.turn) ficam do lado oposto do recorte.
const LEQUE = (() => {
  const state = { mode: 'menu', sel: 0 }; // mode: menu | skills (as 6 fixadas, tarefa 5) | all (lista inteira) | items | aim
  let from = 'menu', listFrom = 'menu', turnKey = '', cx = null, gmOpen = '', hovTgt = null, camId = null; // hovTgt: alvo escolhido pelo mouse; camId: âncora da linha de alcance na vista tática // from: de onde a mira veio (Esc volta para lá); listFrom: de onde a lista completa veio (as 6 ou o menu); cx: quem está no leque agora; gmOpen: vez em que o mestre abriu o leque de um herói com dono conectado
  const donoOn = c => !c.enemy && !!c.owner && (S.online || []).includes(String(c.owner).toLowerCase()); // o jogador dono do herói está conectado (o mestre só age por ele se quiser)
  const ATK = { k: 'atk', id: 'atk' };
  const battlers = () => Object.values(S.chars).filter(o => o.id in S.battle.ticks && !o.dead);
  const esq = (a, b) => a - b;
  const skSel = () => pick.k === 'sk' ? SK(pick.id) : null;
  const bothSides = () => skSel()?.kind === 'util'; // utilidade pode mirar aliado (buff, limpeza) ou inimigo (debuff): ←/→ alcançam os dois lados
  const allySide = () => pick.k === 'it' || selfSk(skSel()) || skSel()?.kind === 'heal';
  // lado natural do que está escolhido: dano no inimigo de pé, cura e item no próprio lado, utilidade em qualquer um de pé
  const natural = o => !!cx && (selfSk(skSel()) ? o.id === cx.actor.id : bothSides() ? o.hp > 0 : allySide() ? o.enemy === cx.actor.enemy : o.enemy !== cx.actor.enemy && o.hp > 0);
  // alvos possíveis: todos na mesa (os dois lados, caídos e invocações; o jogador não vê o inimigo furtivo), da esquerda para a direita na tela (←/→ andam por eles)
  const cands = () => {
    if (!cx) return [];
    const inB = Object.values(S.chars).filter(o => o.id in S.battle.ticks), F = PALCO3D.formation(inB, PALCO3D.frameNow(inB));
    const l = selfSk(skSel()) ? [cx.actor] : battlers().filter(o => gm || o.enemy === cx.actor.enemy || !o.st?.stealth);
    return l.sort((a, b) => esq(F.get(a.id)?.x ?? 0, F.get(b.id)?.x ?? 0));
  };
  const fit = () => { // a mira abre num alvo do lado natural (inimigo ou aliado)
    const l = cands(); if (!l.length) return; const nat = l.filter(natural);
    if (!nat.some(o => o.id === tgt)) { const n = allySide() ? nat.find(o => o.id === cx.actor.id) || nat[0] : nat[0]; tgt = (n || l[0]).id; aim = null; }
  };
  let armed = null; // alvo fora do lado natural já avisado: o segundo Enter (ou clique) confirma
  const offSide = () => { const t = S.chars[tgt]; return !!t && !natural(t); };
  const sideStep = () => { const l = cands(), t = S.chars[tgt]; if (!l.length) return; const o = l.find(x => x.enemy !== !!t?.enemy); if (o) { tgt = o.id; aim = null; render(); } }; // Tab: pula para o outro lado
  const canAim = () => { const s = skSel(), t = S.chars[tgt]; return !!t && pick.k !== 'it' && !(s && (s.area || ['heal', 'util', 'form'].includes(s.kind) || selfSk(s))); };
  const why = () => { const c = cx.actor, s = skSel(), t = S.chars[tgt]; return !t && !selfSk(s) ? 'Escolha um alvo' : s && blocked(c, s, pick.id) ? blockWhy(c, s, pick.id) : ''; };
  const confirm = () => { const w = why(); if (w) return toast(w, 'no'); if (offSide() && armed !== tgt) { armed = tgt; return render(); } armed = null; goAct(cx.actor.id); };
  const go = (mode, f) => { if (f) from = f; state.mode = mode; state.sel = 0; if (mode === 'aim') fit(); render(); };
  const back = () => {
    if (state.mode === 'aim') { if (aimOpen) { aimOpen = false; aim = null; } else state.mode = from; }
    else if (skQ) skQ = ''; else state.mode = state.mode === 'all' ? listFrom : 'menu';
    if (state.mode === 'menu') pick = { ...ATK }; // de volta ao menu, nada de escolha velha para o Q e o "Mirar parte"
    render();
  };
  const usables = c => [...new Set([...wSk(c), ...c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive')])].filter(k => SK(k));
  const six = c => PALCO3D.pickSix(c.skPin || [], c.skUse || {}, usables(c));
  const flat = () => skGroups(cx.actor, S.chars[tgt], skQ).flatMap(g => g.items);
  const toAim = () => { aimOpen = true; go('aim', state.mode === 'aim' ? from : state.mode); };
  // inimigos de pé, da esquerda para a direita na tela
  const foes = () => { const inB = Object.values(S.chars).filter(o => o.id in S.battle.ticks), F = PALCO3D.formation(inB, PALCO3D.frameNow(inB));
    return inB.filter(o => o.enemy && o.hp > 0 && !o.dead).sort((a, b) => esq(F.get(a.id)?.x ?? 0, F.get(b.id)?.x ?? 0)); };
  const setZoom = id => { if ((PALCO3D.local.zoom || null) === (id || null)) return; PALCO3D.local.zoom = id || null; render(); };
  const zoomStep = d => { const l = foes(); if (!l.length) return; const i = l.findIndex(o => o.id === PALCO3D.local.zoom), n = l[(i + d + l.length) % l.length].id;
    if (state.mode === 'aim' && cands().some(o => o.id === n)) { tgt = n; aim = null; } setZoom(n); };
  const hint = n => { const b = app.querySelector(`.hk[data-a=${n}]`); if (b) b.click(); return !!b; }; // as dicas de baixo são botões: o clique passa pelo mesmo caminho do mouse

  // pincelada da coluna: o atalho é uma marca discreta no canto (sem a faixa de dicas)
  const stroke = (lq, key, label, small, o = {}) => `<div class="stroke ${o.on ? 'on' : ''} ${o.blk ? 'blk' : ''} ${o.cls || ''}" role="button" data-lq="${lq}" ${o.v != null ? `data-v="${esc(o.v)}"` : ''} ${o.a ? `data-a="${o.a}"` : ''} ${o.title ? `title="${esc(o.title)}"` : ''}>${key === '' ? '' : `<span class="key">${key}</span>`}${label}${small ? `<small>${small}</small>` : ''}</div>`;

  // ===== coluna presa ao herói: segue o recorte da vez (suave), espelha na borda e some durante a investida =====
  // .lqm (comandos + lista aberta ao lado) fica no ombro; .lqt (comandos de turno) do lado oposto do recorte
  const fol = { x: null, y: null, tx: null, ty: null, side: 1, raf: 0, tmo: 0, id: null, last: 0 };
  const GAP = 22, DEAD = 40; // DEAD: px que o herói anda antes da coluna ir atrás
  // step(snap): mede e posiciona; snap pula a suavização (aba em segundo plano, onde o requestAnimationFrame não roda)
  const step = (snap = false) => {
    const lq = app.querySelector('.lq'), m = lq?.querySelector('.lqm'); if (!lq || !m || !cx) { fol.id = null; PALCO3D.lane.w = 0; return false; }
    const r = PALCO3D.rectOf(cx.actor.id), L = lq.getBoundingClientRect(), mi = m.firstElementChild.getBoundingClientRect();
    if (!L.width) return true;
    // sem recorte na tela (câmera de longe, fora do quadro): fica no meio, um pouco à direita
    const rl = r && r.width ? r.left - L.left : L.width * .45, rr = r && r.width ? r.right - L.left : L.width * .45, rt = r && r.height ? r.top - L.top : L.height * .4, rh = r && r.height ? r.height : 0;
    // o lado escolhe pela largura com a lista aberta (reserva), para abrir Skills não trocar de lado
    // largura/altura SEM a escala de encolher (fol.s): o lado e a escala saem do recorte, sem realimentar a medida
    const s0 = fol.s || 1, hk = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hk')) || .64, w0 = mi.width / s0, wr = Math.max(w0, 560 * hk), gap = GAP + rh * .04; // o espaço entre coluna e corpo cresce com o recorte
    const pk = PALCO3D.pickSide({ left: rl, right: rr }, { width: L.width }, w0, wr, gap), side = pk.side, s = pk.scale;
    if (s !== fol.s) { fol.s = s; lq.style.setProperty('--hk', s < 1 ? (hk * s).toFixed(3) : ''); }
    const w = w0 * s, h = mi.height / s0 * s;
    { const ln = PALCO3D.lane, lw = Math.round(wr * s); if (ln.w !== lw || ln.side !== side) { ln.w = lw; ln.side = side; if (typeof render === 'function' && !state.busy) { state.busy = true; setTimeout(() => { state.busy = false; render(); }, 0); } } } // a câmera reserva a faixa: só re-enquadra quando muda
    if (fol.id !== cx.actor.id || side !== fol.side) { fol.id = cx.actor.id; fol.x = fol.tx = null; } fol.side = side;
    // fol.x guarda a borda voltada para o herói (esquerda à direita do ombro; direita no lado espelhado): abrir a lista muda a largura sem deslizar a coluna
    const sx = side > 0 ? 0 : w, x = Math.max(8, Math.min(L.width - w - 8, side > 0 ? rr + gap : rl - gap - w)) + sx;
    const y = Math.max(8, Math.min(L.height - h - 8, rt + rh * .22));
    const hold = ['skills', 'items', 'all'].includes(state.mode); // navegando numa lista: a coluna fica parada para o clique não errar
    // suave e com zona morta: a deriva da câmera parada e a tremida do impacto não mexem a coluna (fica fácil de clicar)
    const ease = (k, v) => { if (fol[k] == null) return v; if (hold) return fol[k]; const d = v - fol[k]; if (snap) return Math.abs(d) > DEAD ? v : fol[k]; if (Math.abs(d) < 3) return fol[k]; return fol.mv?.[k] || Math.abs(d) > DEAD ? fol[k] + d * .22 : fol[k]; }; // perto o bastante: para (a deriva não arrasta a coluna 1px por vez)
    const nx = ease('x', x), ny = ease('y', y); fol.mv = { ...fol.mv, x: Math.abs(x - nx) >= 3, y: Math.abs(y - ny) >= 3 }; fol.x = nx; fol.y = ny;
    lq.classList.toggle('l', fol.side < 0);
    fol.l = fol.x - sx; m.style.transform = `translate(${Math.round(fol.l)}px,${Math.round(fol.y)}px)`; m.style.visibility = '';
    const t = lq.querySelector('.lqt');
    if (t) { const ti = t.firstElementChild.getBoundingClientRect(), tw = ti.width;
      let tx = fol.side > 0 ? rl - GAP - tw : rr + GAP, ty = rt + rh * .3;
      // herói colado na borda (câmera de ombro): sem espaço do outro lado, desce para baixo da coluna em vez de cobrir o recorte
      if (fol.side > 0 ? tx < 8 : tx + tw > L.width - 8) { const ci = m.querySelector('.lqc').getBoundingClientRect(); tx = fol.side > 0 ? x : x - tw; ty = y + (ci.bottom - mi.top) + 12; }
      const stx = side > 0 ? tw : 0; tx = Math.max(8, Math.min(L.width - tw - 8, tx)) + stx; ty = Math.max(8, Math.min(L.height - ti.height - 8, ty)); // também pela borda voltada ao herói
      const ntx = ease('tx', tx), nty = ease('ty', ty); fol.mv = { ...fol.mv, tx: Math.abs(tx - ntx) >= 3, ty: Math.abs(ty - nty) >= 3 }; fol.tx = ntx; fol.ty = nty;
      fol.tl = fol.tx - stx; t.style.transform = `translate(${Math.round(fol.tl)}px,${Math.round(fol.ty)}px)`; t.style.visibility = ''; }
    return true;
  };
  // a câmera anda por ~1,1 s e a investida mexe o recorte: acompanha a cada quadro
  const follow = () => { fol.raf = 0; fol.last = performance.now(); if (step()) fol.raf = requestAnimationFrame(follow); };
  const pos = (a, b) => a == null ? 'visibility:hidden' : `transform:translate(${Math.round(a)}px,${Math.round(b)}px)`; // o desenho refaz o HTML: nasce onde estava
  const wrap = (main, sub = '', turn = '', row = 0) => {
    if (!fol.raf) fol.raf = requestAnimationFrame(follow);
    queueMicrotask(() => step(performance.now() - fol.last > 250)); // logo depois do desenho entrar na página, sem esperar o próximo quadro
    if (!fol.tmo) fol.tmo = setTimeout(function reserva() { fol.tmo = 0; const idle = performance.now() - fol.last > 250; if (step(idle) !== false && idle) fol.tmo = setTimeout(reserva, 300); }, 300); // reserva enquanto o requestAnimationFrame está parado
    return `<div class="lq ${fol.side < 0 ? 'l' : ''}" ${fol.s < 1 ? `style="--hk:${(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hk')) * fol.s).toFixed(3)}"` : ''} aria-label="Comandos de ${esc(cx.actor.name)}"><div class="lqa lqm" style="${pos(fol.x == null ? null : fol.l, fol.y)}"><div class="lqin"><div class="lqc">${main}</div>${sub ? `<div class="lqsub" style="--row:${row}">${sub}</div>` : ''}</div></div>`
      + (turn ? `<div class="lqa lqt" style="${pos(fol.tx == null ? null : fol.tl, fol.ty)}"><div class="lqin">${turn}</div></div>` : '') + '</div>';
  };

  return {
    state,
    // limpa tudo (a ação saiu ou a vez mudou)
    reset() { state.mode = 'menu'; state.sel = 0; from = 'menu'; aimOpen = false; },
    off() { cx = null; },
    // âncora da vista tática/linha de alcance (palco3d.js): só enquanto o leque está na mira
    // linha de efeito previsto sobre o alvo (ficha): "nome · P12 · ▲ FRACO · −1 escudo"; só na mira, de golpe que dá dano
    preview(t) {
      if (!cx || !cx.my || cx.wait || state.mode !== 'aim' || !t?.enemy || pick.k === 'it') return '';
      const c = cx.actor, wp = eq(c, 'arma'), P = ARMAS.prof(wp), sk = skSel(), s = sk || { name: P.atkN || 'Ataque', kind: P.mental ? 'mental' : 'dmg', el: wp?.el || 'fis', power: wp?.power ?? c.arma };
      if (!(s.power > 0) || !['dmg', 'mental'].includes(s.kind)) return '';
      const af = skAff(s, t);
      return `${s.name} · P${s.power} · ${af === 'w' ? '▲ FRACO · −1 escudo' : af === 'r' ? '▼ resiste' : af === '?' ? '? não testado' : 'neutro'}`;
    },
    // custo de tempo (mesma conta de endTurn em src/rules.js:369/695) da skill/item destacado ou escolhido, para a prévia da ordem; só para quem age agora
    timeCost() {
      if (!cx || !cx.my || cx.wait || cx.gm || !(cx.actor.id in S.battle.ticks)) return null;
      const c = cx.actor, mode = state.mode, wp = eq(c, 'arma'), t = S.chars[tgt];
      let s = null, name = ARMAS.prof(wp).atkN || 'Ataque', ct = ARMAS.prof(wp).ct || 100;
      const id = mode === 'skills' && state.sel < 6 ? six(c)[state.sel] : (mode === 'all' || mode === 'aim') && pick.k === 'sk' ? pick.id : null;
      if (id && SK(id)) { s = SK(id); name = s.name; ct = s.ct || 100; }
      else if (mode === 'items' || (mode === 'aim' && pick.k === 'it')) { const k = mode === 'items' ? Object.entries(c.inv).filter(([i]) => S.items[i]?.type === 'cons')[state.sel]?.[0] : pick.id; if (!S.items[k]) return null; name = S.items[k].name; ct = 100; }
      else if (mode === 'menu' && state.sel > 0) return null; // Skills/Itens no menu ainda não escolheram nada
      const haste = s?.fx?.find(f => f.t === 'haste' && f.to === 'self');
      const fraco = !!(s && s.power > 0 && ['dmg', 'mental'].includes(s.kind) && t?.enemy !== c.enemy && t?.weak?.includes(s.el)); // só a fraqueza que o jogador já vê
      const dly = c.dly ?? Math.round(delay(c) / (c.boss ? 2 : 1)); // dly: delay() do servidor (src/net.js, com passivas); a conta local é só reserva
      const debt = (c.brv || 0) < 0 ? Math.round(dly * -c.brv * .5) : 0; // dívida de Coragem atrasa mais (endTurn)
      return { actor: c, name, cost: Math.round(dly * Math.round(ct * (haste ? 1 - haste.v / 100 : 1) * (fraco ? .75 : 1)) / 100) + debt };
    },
    // clicar num inimigo fora da mira dá zoom nele (de novo, sai)
    zoomClick(id) { const c = S.chars[id]; if (!cx || state.mode === 'aim' || !c?.enemy || c.hp <= 0 || !(id in S.battle.ticks)) return false; if (cx.my) { tgt = id; aim = null; } setZoom(PALCO3D.local.zoom === id ? null : id); return true; },
    aimTarget() { return cx && cx.my && !cx.wait && state.mode === 'aim' ? tgt : null; },
    // quem está no leque agora (shown: as pinceladas estão na tela, não recolhidas nem escondidas)
    ctx() { return cx; },
    // candidatos da lista de alvos do canto: só com a mira aberta
    aimList() { return cx && cx.shown && this.aimTarget() && !S.battle.cmd ? cands() : []; },
    // passar o mouse num candidato durante a mira troca o alvo (a mão vai junto; o clique confirma)
    hover(id) { if (!cx || !cx.shown || !this.aimTarget() || id === tgt || !cands().some(o => o.id === id)) return false; tgt = id; aim = null; hovTgt = id; render(); return true; },
    // mantém uma âncora estável no hover: evita a linha de alcance correr sob o mouse; teclado e clique atualizam
    camTarget() { const a = this.aimTarget(); if (!a) { camId = null; return null; }
      if (tgt !== hovTgt || !camId || !cands().some(o => o.id === camId)) camId = a; return camId; },
    // opts.gm: leque do mestre para quem está na vez (herói ou inimigo), no lugar da barra .gcmd
    html(c, cur, opts = {}) {
      const [, rq] = myReq() || [], my = cur === c, wait = !!(rq && rq.ch === c.id), gmO = !!opts.gm;
      cx = { actor: c, cur, my, wait, gm: gmO, shown: false };
      const tk = `${cur?.id}:${S.battle.n}:${c.id}`; if (tk !== turnKey) { turnKey = tk; this.reset(); pick = { ...ATK }; aim = null; braveOn = false; gmOpen = ''; PALCO3D.local.zoom = null; if (gmO) { const f = battlers().find(o => o.enemy !== c.enemy && o.hp > 0); if (f) tgt = f.id; } }
      if (!my || wait || S.battle.cmd) return '';
      if (gmO && donoOn(c) && gmOpen !== tk) return wrap(`<button type="button" class="lq-gm-open" data-lq="gmopen" title="${esc(c.owner)} está conectado: o leque fica recolhido até você pedir">Agir por ${esc(c.name)}</button>`);
      const inB = battlers();
      if (!inB.some(o => o.id === tgt) || (state.mode !== 'aim' && S.chars[tgt].enemy && S.chars[tgt].hp <= 0)) { const f = inB.find(o => o.enemy !== c.enemy && o.hp > 0); if (f) { tgt = f.id; aim = null; } } // na sua vez já vem mirado no primeiro inimigo de pé
      const sks = c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive'), wsks = wSk(c), cons = Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons');
      if ((pick.k === 'sk' && !sks.includes(pick.id) && !wsks.includes(pick.id)) || (pick.k === 'it' && !(c.inv[pick.id] > 0))) pick = { ...ATK };
      const t = S.chars[tgt], s = skSel(), it = pick.k === 'it' ? S.items[pick.id] : null, wp = eq(c, 'arma'), mode = state.mode;
      const sel = Math.max(0, Math.min(state.sel, mode === 'items' ? cons.length - 1 : mode === 'skills' ? 6 : 2));
      const back1 = mode !== 'menu' ? stroke('back', 'Esc', 'Voltar', '', { cls: 'mini' }) : '';
      const turn = typeof HUD !== 'undefined' && HUD.turn ? HUD.turn(c, inB) : ''; // Coragem vale também na mira
      let main = '', sub = '', row = 0;
      if (mode !== 'aim') {
        // coluna principal: Atacar, Skills, Itens (de cima para baixo); a lista aberta sai ao lado da pincelada escolhida
        const M = [['atk', 1, 'Atacar', esc(ARMAS.prof(wp).atkN || 'Ataque'), wpnLine(wp, c)], ['sk', 2, 'Skills', sks.length + wsks.length], ['it', 3, 'Itens', cons.length]];
        const onK = mode === 'menu' ? sel : mode === 'items' ? 2 : 1;
        main += M.map((m, k) => stroke(m[0], m[1], m[2], m[3], { on: onK === k, title: m[4], cls: mode !== 'menu' && onK !== k ? 'dim' : '' })).join('');
        if (canAim() && mode === 'menu') main += stroke('aim', 'Q', 'Mirar parte', aim ? esc(PL[aim]) : '', { cls: 'mini' });
        if (gmO && c.enemy && mode === 'menu') main += stroke('ai', 'I', 'IA decide', '', { a: 'ai', cls: 'mini' });
        main += back1;
      }
      if (mode === 'items') {
        row = 2;
        sub = cons.map(([k, q], j) => stroke('item', '', esc(S.items[k].name), `×${q} · ${esc(String(idesc(S.items[k])).slice(0, 46))}`, { v: k, on: sel === j })).join('') || '<div class="lq-sum"><b>Nenhum consumível no inventário.</b></div>';
      } else if (mode === 'skills') {
        row = 1;
        const S6 = six(c), AF = { w: '▲', r: '▼', '?': '?' }, dia = s2 => `<span class="cost"><span class="lqd"><b>${s2.limit ? '∞' : s2.cost}</b></span>${s2.limit ? '' : s2.res === 'san' ? 'SAN' : 'AU'}</span>`;
        // as 6 numa coluna só; a destacada abre com tipo, elemento e descrição
        const one = i => { const id = S6[i], s2 = SK(id), big = sel === i, off = blocked(c, s2, id) ? blockWhy(c, s2, id) : '', af = skAff(s2, t), a = af ? `<span class="af ${af === 'r' ? 'r' : af === '?' ? 'q' : ''}">${AF[af]}</span>` : '', e = `<span class="el" style="--e:${ELC[s2.el] || '#888'}"></span>`;
          return `<div class="stroke ${big ? 'big on' : ''} ${off ? 'blk' : ''}" role="button" data-lq="skp" data-sk="${esc(id)}" data-v="${esc(id)}" ${off ? `title="${esc(off)}"` : ''}><div class="sk6n">${c.skPin?.includes(id) ? '<span class="star">★</span>' : ''}${e}${esc(s2.name)} ${a}${dia(s2)}</div>${big ? `<div class="t">${esc(KIND[s2.kind] || s2.kind)} · ${esc(EL[s2.el] || s2.el)}${s2.power ? ` · Poder ${s2.power}` : ''}${af === 'w' ? ' · <span class="w">▲ alvo fraco</span>' : ''}</div><p>${esc(desc(s2))}</p>${off ? `<div class="why">Bloqueada: ${esc(off)}</div>` : ''}` : ''}</div>`; };
        sub = `<div class="sk6">${S6.map((_, i) => one(i)).join('')}</div>` + stroke('all', 'T', 'Todas as skills…', String(usables(c).length), { on: sel === 6, cls: 'mini' });
      } else if (mode === 'all') {
        row = 1;
        sub = `<div class="lq-all">${skPane(c, t, { bare: true })}</div>`;
        const cur2 = pick.k === 'sk' && s, w = cur2 && blocked(c, s, pick.id) ? blockWhy(c, s, pick.id) : '';
        if (cur2) sub += `<div class="lq-sum"><b>${esc(s.name)}</b><small>${esc(desc(s))}</small>${w ? `<small class="why">${esc(w)}</small>` : ''}</div>`;
      } else if (mode === 'aim') {
        const label = it ? it.name : s ? s.name : ARMAS.prof(wp).atkN || 'Ataque', w = why(); if (armed !== tgt) armed = null;
        const off = offSide() && !w ? (t.enemy === c.enemy ? (t.id === c.id ? 'em si mesmo' : 'fogo amigo') : 'ajuda o inimigo') : '';
        main += stroke('go', '⏎', armed ? 'Confirmar mesmo assim' : esc(askL('act', 'Agir')), '', { on: !w, blk: !!w });
        if (canAim()) main += stroke('aim', 'Q', 'Mirar parte', aim ? esc(PL[aim]) : '', { on: aimOpen, cls: 'mini' });
        const allies = battlers().filter(o => !o.enemy && o.id !== c.id && o.hp > 0);
        if (allies.length && !allySide() && cands().some(o => o.enemy)) main += stroke('pass', 'P', 'Fraqueza passa', esc(passTo ? S.chars[passTo]?.name || '' : 'ninguém'), { cls: 'mini', title: 'Se acertar uma fraqueza, passa a vez para este aliado' });
        main += back1;
        main += `<div class="lq-sum"><small>Sua ação${braveOn ? ' · com Coragem' : ''}</small><b>${esc(label)} <span>→</span> ${selfSk(s) ? 'em si' : t ? esc(t.name) : '<u>sem alvo</u>'}${canAim() && aim ? ` · ${esc(PL[aim])}` : ''}</b>${off ? `<small class="offside">⚠ ${off}${armed ? ': Enter de novo confirma' : ''}</small>` : ''}${w ? `<small class="why">${esc(w)}</small>` : ''}</div>`;
        if (canAim() && aimOpen) { row = 1; sub = `<div class="lq-aim">${aimBox()}</div>`; }
      }
      cx.shown = true;
      return wrap(main, sub, turn, row);
    },
    // clique numa pincelada
    click(name, v) {
      if (!cx || !cx.my || cx.wait) { if (name === 'back') return back(); return; }
      const c = cx.actor;
      if (name === 'gmopen') { gmOpen = turnKey; return render(); }
      if (cx.gm && name === 'ai') { this.reset(); return send({ t: 'ai' }); }
      if (cx.gm && name === 'next') { this.reset(); aim = null; return send({ t: 'next' }); }
      if (name === 'atk') { pick = { ...ATK }; return go('aim', 'menu'); }
      if (name === 'sk' && six(c).length) return go('skills', 'menu');
      if (name === 'sk' || name === 'all') { if (pick.k !== 'sk') { const f = flat()[0]; if (f) pick = { k: 'sk', id: f.id }; } if (state.mode === 'all') return; listFrom = state.mode === 'skills' ? 'skills' : 'menu'; return go('all'); }
      if (name === 'skp') { const s2 = SK(v); if (!s2 || blocked(c, s2, v)) return; pick = { k: 'sk', id: v }; if (selfSk(s2)) { tgt = c.id; return goAct(c.id); } return go('aim', 'skills'); }
      if (name === 'it') return go('items', 'menu');
      if (name === 'item') { pick = { k: 'it', id: v }; return go('aim', 'items'); }
      if (name === 'aim') return state.mode === 'aim' ? (aimOpen = !aimOpen, aimOpen || (aim = null), render()) : toAim();
      if (name === 'pass') { const l = ['', ...battlers().filter(o => !o.enemy && o.id !== c.id && o.hp > 0).map(o => o.id)]; passTo = l[(l.indexOf(passTo) + 1) % l.length]; return render(); }
      if (name === 'go') return confirm();
      if (name === 'back') return back();
    },
    // clicar numa skill da lista abre a mira (as setas ↑↓ só andam pela lista, sem avançar)
    picked() { if (!cx || state.mode !== 'all') return false; go('aim', 'all'); return true; },
    // clique num ponto do minimapa: na mira, escolhe o alvo (de novo, confirma)
    pickTgt(id) { if (!cx || !cx.my || cx.wait || state.mode !== 'aim' || !cands().some(o => o.id === id)) return false; if (id === tgt) confirm(); else { tgt = id; aim = null; render(); } return true; },
    // clicar num recorte já mirado confirma a ação
    clickTgt(id) { if (!cx || !cx.my || cx.wait || state.mode !== 'aim' || id !== tgt || !cands().some(o => o.id === id)) return false; confirm(); return true; },
    // teclado da batalha no PC; devolve true se tratou a tecla
    key(e) {
      if (!cx || (gm ? !cx.gm : role !== 'player') || innerWidth <= 700 || !S.battle?.active || S.battle.cmd) return false;
      if (e.target.matches?.('input,textarea,select') || rollDlg || meOpen || navOpen || gridFull || ctx || document.querySelector('.stage-cmd,.result,.dlg-in')) return false;
      const k = e.key, mode = state.mode, c = cx.actor;
      if (gm && (gui.sheet || (k === 'Enter' && Object.keys(S.reqs).length))) return false; // ficha aberta, ou Enter que aprova o pedido da fila
      if (k === 'Escape' && PALCO3D.local.zoom) { setZoom(null); return true; } // o zoom fecha antes de qualquer outro passo
      if (/^[zZ]$/.test(k) && mode !== 'all') { const a = S.chars[this.aimTarget()] || S.chars[tgt], z = a?.enemy && a.hp > 0 ? a : foes()[0]; setZoom(PALCO3D.local.zoom ? null : z?.id); return true; }
      if (PALCO3D.local.zoom && (k === 'ArrowLeft' || k === 'ArrowRight') && mode !== 'all') { zoomStep(k === 'ArrowLeft' ? -1 : 1); return true; }
      if (k === 'Escape') {
        if (cx.wait) { const [id] = myReq() || []; if (id) send({ t: 'reqNo', id }); return true; }
        if (!cx.my || mode === 'menu') return false;
        back(); return true;
      }
      if (!cx.my || cx.wait) return false;
      if (mode === 'all' && skKey(e)) return true; // letras filtram a lista; Shift+F fixa
      if (/^[1-3]$/.test(k) && mode === 'menu') { click(['atk', 'sk', 'it'][k - 1]); return true; }
      if (e.target.matches?.('button') && (k === 'Enter' || k === ' ')) return false; // o botão focado já age no clique
      if (cx.gm && /^[iI]$/.test(k) && mode === 'menu' && c.enemy) { click('ai'); return true; }
      // 4–8: a fileira do canto (jogador e mestre)
      if (/^[4-8]$/.test(k)) { hint({ 4: 'defend', 5: 'focus', 6: 'braveT', 7: 'next', 8: 'allOut' }[k]); return true; }
      if (/^[qQ]$/.test(k) && canAim() && mode !== 'all' && mode !== 'items' && mode !== 'skills') { click('aim'); return true; }
      if (/^[tT]$/.test(k) && mode !== 'aim') { click('all'); return true; }
      if (/^[pP]$/.test(k) && mode === 'aim' && app.querySelector('[data-lq=pass]')) { click('pass'); return true; }
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        const d = k === 'ArrowUp' ? 1 : -1; // ↑ sobe na coluna
        if (mode === 'menu') state.sel = (state.sel - d + 3) % 3; // a coluna desce: ↓ vai para o próximo
        else if (mode === 'items') { const n = Object.entries(c.inv).filter(([i]) => S.items[i]?.type === 'cons').length; if (!n) return true; state.sel = (state.sel - d + n) % n; }
        else if (mode === 'skills') { const n = six(c).length, L = [...Array(n).keys(), 6], i = Math.max(0, L.indexOf(state.sel)); state.sel = L[(i - d + L.length) % L.length]; } // as 6 e, no fim, "Todas"
        else if (mode === 'all') { const l = flat(); if (!l.length) return true; const i = l.findIndex(x => pick.k === 'sk' && x.id === pick.id); pick = { k: 'sk', id: l[(i + (d > 0 ? l.length - 1 : 1) + (i < 0 ? 1 : 0)) % l.length].id }; }
        else return false;
        render(); app.querySelector('.skr.on')?.scrollIntoView({ block: 'nearest' }); return true;
      }
      if (k === 'Tab' && mode === 'aim') { sideStep(); return true; }
      if ((k === 'ArrowLeft' || k === 'ArrowRight') && mode === 'aim') {
        const l = cands(); if (!l.length) return true;
        const i = l.findIndex(o => o.id === tgt); tgt = l[(i + (k === 'ArrowLeft' ? l.length - 1 : 1) + (i < 0 ? 1 : 0)) % l.length].id; aim = null; render(); return true;
      }
      if (k === 'Enter') {
        if (mode === 'menu') click(['atk', 'sk', 'it'][state.sel]);
        else if (mode === 'skills') { const id = six(c)[state.sel]; if (state.sel === 6) click('all'); else if (id) click('skp', id); }
        else if (mode === 'items') { const e2 = Object.entries(c.inv).filter(([i]) => S.items[i]?.type === 'cons')[state.sel]; if (e2) click('item', e2[0]); }
        else if (mode === 'all') { if (pick.k === 'sk') go('aim', 'all'); }
        else if (mode === 'aim') confirm();
        return true;
      }
      return false;
    },
  };
  function click(n, v) { return LEQUE.click(n, v); }
})();

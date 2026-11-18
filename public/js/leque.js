// ===== leque de comandos do jogador no PC: pinceladas à direita do herói da vez, no lugar do painel command() =====
// Menu (1 Atacar, 2 Skills, 3 Itens, Q Mirar parte) → lista (skills ou itens) → mira (escolher o alvo no palco) → Enter age.
// O estado da escolha continua nos globais do painel antigo (pick, tgt, aim, aimOpen, braveOn, passTo); aqui só vive o passo em que o leque está.
// Posições em coordenadas de 1440×860 (a câmera sempre põe o herói no mesmo lugar); o CSS escala tudo pelo --hk.
const LEQUE = (() => {
  const state = { mode: 'menu', sel: 0 }; // mode: menu | skills (as 6 fixadas, tarefa 5) | all (lista inteira) | items | aim
  let from = 'menu', listFrom = 'menu', turnKey = '', cx = null, gmOpen = '', hovTgt = null, camId = null; // hovTgt: alvo escolhido pelo mouse (não move a câmera); camId: alvo que a câmera enquadra // from: de onde a mira veio (Esc volta para lá); listFrom: de onde a lista completa veio (as 6 ou o menu); cx: quem está no leque agora; gmOpen: vez em que o mestre abriu o leque de um herói com dono conectado
  const donoOn = c => !c.enemy && !!c.owner && (S.online || []).includes(String(c.owner).toLowerCase()); // o jogador dono do herói está conectado (o mestre só age por ele se quiser)
  const ATK = { k: 'atk', id: 'atk' };
  const battlers = () => Object.values(S.chars).filter(o => o.id in S.battle.ticks && !o.dead);
  const esq = (a, b) => a - b;
  const skSel = () => pick.k === 'sk' ? SK(pick.id) : null;
  const bothSides = () => skSel()?.kind === 'util'; // utilidade pode mirar aliado (buff, limpeza) ou inimigo (debuff): ←/→ alcançam os dois lados
  const allySide = () => pick.k === 'it' || selfSk(skSel()) || skSel()?.kind === 'heal';
  // alvos possíveis do que está escolhido, da esquerda para a direita na tela (←/→ andam por eles)
  const cands = () => {
    if (!cx) return [];
    const inB = Object.values(S.chars).filter(o => o.id in S.battle.ticks), F = PALCO3D.formation(inB, PALCO3D.frameNow(inB));
    const l = selfSk(skSel()) ? [cx.actor] : battlers().filter(o => bothSides() ? o.hp > 0 : allySide() ? o.enemy === cx.actor.enemy : o.enemy !== cx.actor.enemy && o.hp > 0);
    return l.sort((a, b) => esq(F.get(a.id)?.x ?? 0, F.get(b.id)?.x ?? 0));
  };
  const fit = () => { // a mira abre num alvo do lado certo (inimigo ou aliado)
    const l = cands(); if (!l.length) return;
    if (!l.some(o => o.id === tgt)) { tgt = (allySide() ? l.find(o => o.id === cx.actor.id) || l[0] : l[0]).id; aim = null; }
  };
  const canAim = () => { const s = skSel(), t = S.chars[tgt]; return !!t && pick.k !== 'it' && !(s && (s.area || ['heal', 'util', 'form'].includes(s.kind) || selfSk(s))); };
  const why = () => { const c = cx.actor, s = skSel(), t = S.chars[tgt]; return !t && !selfSk(s) ? 'Escolha um alvo' : s && blocked(c, s, pick.id) ? blockWhy(c, s, pick.id) : ''; };
  const confirm = () => { const w = why(); if (w) return toast(w, 'no'); goAct(cx.actor.id); };
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

  const stroke = (lq, key, label, small, x, y, o = {}) => `<div class="stroke ${o.on ? 'on' : ''} ${o.blk ? 'blk' : ''}" role="button" data-lq="${lq}" ${o.v != null ? `data-v="${esc(o.v)}"` : ''} ${o.a ? `data-a="${o.a}"` : ''} style="left:${x}px;top:${y}px;${o.r != null ? `--r:${o.r}deg;` : ''}${o.fs ? `font-size:${o.fs}px` : ''}" ${o.title ? `title="${esc(o.title)}"` : ''}>${key === '' ? '' : `<span class="key">${key}</span>`}${label}${small ? `<small>${small}</small>` : ''}</div>`;

  return {
    state,
    // limpa tudo (a ação saiu ou a vez mudou)
    reset() { state.mode = 'menu'; state.sel = 0; from = 'menu'; aimOpen = false; },
    off() { cx = null; },
    // alvo da câmera de mira (palco3d.js): só enquanto o leque está na mira
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
    // alvo que a câmera enquadra: a troca pelo mouse não move a câmera (senão o palco andaria sob o mouse e trocaria de novo); teclado e clique movem
    camTarget() { const a = this.aimTarget(); if (!a) { camId = null; return null; }
      if (tgt !== hovTgt || !camId || !cands().some(o => o.id === camId)) camId = a; return camId; },
    // opts.gm: leque do mestre para quem está na vez (herói ou inimigo), no lugar da barra .gcmd
    html(c, cur, opts = {}) {
      const [, rq] = myReq() || [], my = cur === c, wait = !!(rq && rq.ch === c.id), gmO = !!opts.gm;
      cx = { actor: c, cur, my, wait, gm: gmO, shown: false };
      const tk = `${cur?.id}:${S.battle.n}:${c.id}`; if (tk !== turnKey) { turnKey = tk; this.reset(); pick = { ...ATK }; aim = null; braveOn = false; gmOpen = ''; PALCO3D.local.zoom = null; if (gmO) { const f = battlers().find(o => o.enemy !== c.enemy && o.hp > 0); if (f) tgt = f.id; } }
      if (!my || wait || S.battle.cmd) return '';
      if (gmO && donoOn(c) && gmOpen !== tk) return `<div class="lq" aria-label="Comandos de ${esc(c.name)}"><div class="lqbox"><button type="button" class="lq-gm-open" data-lq="gmopen" title="${esc(c.owner)} está conectado: o leque fica recolhido até você pedir">Agir por ${esc(c.name)}</button></div></div>`;
      const inB = battlers();
      if (!inB.some(o => o.id === tgt) || (S.chars[tgt].enemy && S.chars[tgt].hp <= 0)) { const f = inB.find(o => o.enemy !== c.enemy && o.hp > 0); if (f) { tgt = f.id; aim = null; } } // na sua vez já vem mirado no primeiro inimigo de pé
      const sks = c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive'), wsks = wSk(c), cons = Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons');
      if ((pick.k === 'sk' && !sks.includes(pick.id) && !wsks.includes(pick.id)) || (pick.k === 'it' && !(c.inv[pick.id] > 0))) pick = { ...ATK };
      const t = S.chars[tgt], s = skSel(), it = pick.k === 'it' ? S.items[pick.id] : null, wp = eq(c, 'arma'), mode = state.mode;
      const sel = Math.max(0, Math.min(state.sel, mode === 'items' ? cons.length - 1 : mode === 'skills' ? 6 : 2));
      let h = '';
      if (mode === 'menu') {
        const M = [['atk', 1, 'Atacar', esc(ARMAS.prof(wp).atkN || 'Ataque'), wpnLine(wp, c)], ['sk', 2, 'Skills', sks.length + wsks.length], ['it', 3, 'Itens', cons.length]];
        h += [2, 1, 0].map((k, j) => stroke(M[k][0], M[k][1], M[k][2], M[k][3], 650 + j * 40, 340 + j * 78, { on: sel === k, title: M[k][4] })).join('');
        if (canAim()) h += stroke('aim', 'Q', 'Mirar parte', aim ? esc(PL[aim]) : '', 150, 350, { r: 4, fs: 24 });
        if (gmO && c.enemy) h += stroke('ai', 'I', 'IA decide', '', 610, 262, { a: 'ai' }); // Passar e os outros comandos de turno estão na fileira do canto (hud.js)
      } else if (mode === 'items') {
        h += cons.map(([k, q], j) => stroke('item', '', esc(S.items[k].name), `×${q} · ${esc(String(idesc(S.items[k])).slice(0, 46))}`, 600 + j * 36, 400 + j * 76, { v: k, on: sel === j, fs: 24 })).join('') || '<div class="lq-sum"><b>Nenhum consumível no inventário.</b></div>';
      } else if (mode === 'skills') {
        const S6 = six(c), AF = { w: '▲', r: '▼', '?': '?' }, dia = s2 => `<span class="cost"><span class="lqd"><b>${s2.limit ? '∞' : s2.cost}</b></span>${s2.limit ? '' : s2.res === 'san' ? 'SAN' : 'AU'}</span>`;
        const one = (i, big) => { const id = S6[i], s2 = SK(id), off = blocked(c, s2, id) ? blockWhy(c, s2, id) : '', af = skAff(s2, t), a = af ? `<span class="af ${af === 'r' ? 'r' : af === '?' ? 'q' : ''}">${AF[af]}</span>` : '', e = `<span class="el" style="--e:${ELC[s2.el] || '#888'}"></span>`;
          return `<div class="stroke ${big ? 'big' : ''} ${sel === i ? 'on' : ''} ${off ? 'blk' : ''}" role="button" data-lq="skp" data-sk="${esc(id)}" data-v="${esc(id)}" ${off ? `title="${esc(off)}"` : ''}>${big ? `${dia(s2)}<div class="sk6n">${c.skPin?.includes(id) ? '<span class="star">★</span>' : ''}${e}${esc(s2.name)} ${a}</div><div class="t">${esc(KIND[s2.kind] || s2.kind)} · ${esc(EL[s2.el] || s2.el)}${s2.power ? ` · Poder ${s2.power}` : ''}${af === 'w' ? ' · <span class="w">▲ alvo fraco</span>' : ''}</div><p>${esc(desc(s2))}</p>${off ? `<div class="why">Bloqueada: ${esc(off)}</div>` : ''}` : `${e}${esc(s2.name)} ${a}${dia(s2)}`}</div>`; };
        h += `<div class="sk6">${[3, 4, 5].filter(i => i < S6.length).map((i, j) => `<div class="sk6p" style="left:${560 + j * 14}px;top:${330 + j * 66}px">${one(i, 0)}</div>`).join('')}${[0, 1, 2].filter(i => i < S6.length).map((i, j) => `<div class="sk6p" style="left:${920 + j * 14}px;top:${230 + j * 128}px">${one(i, 1)}</div>`).join('')}</div>`;
        h += stroke('all', 'T', 'Todas as skills…', String(usables(c).length), 600, 505, { on: sel === 6, r: -6, fs: 20 });
      } else if (mode === 'all') {
        h += `<div class="lq-all">${skPane(c, t, { bare: true })}</div>`;
        const cur2 = pick.k === 'sk' && s, w = cur2 && blocked(c, s, pick.id) ? blockWhy(c, s, pick.id) : '';
        if (cur2) h += `<div class="lq-sum"><b>${esc(s.name)}</b><small>${esc(desc(s))}</small>${w ? `<small class="why">${esc(w)}</small>` : ''}</div>`;
      } else if (mode === 'aim') {
        const label = it ? it.name : s ? s.name : ARMAS.prof(wp).atkN || 'Ataque', w = why();
        h += `<div class="lq-sum"><small>Sua ação${braveOn ? ' · com Coragem' : ''}</small><b>${esc(label)} <span>→</span> ${selfSk(s) ? 'em si' : t ? esc(t.name) : '<u>sem alvo</u>'}${canAim() && aim ? ` · ${esc(PL[aim])}` : ''}</b><small>${w ? `<span class="why">${esc(w)}</span> · ` : ''}← → escolhem o alvo · clique de novo no alvo confirma · Esc volta</small></div>`;
        h += stroke('go', '⏎', esc(askL('act', 'Agir')), '', 430, 600, { on: !w, blk: !!w });
        if (canAim()) h += stroke('aim', 'Q', 'Mirar parte', aim ? esc(PL[aim]) : '', 150, 350, { r: 4, fs: 24, on: aimOpen });
        if (canAim() && aimOpen) h += `<div class="lq-aim">${aimBox()}</div>`;
        const allies = battlers().filter(o => !o.enemy && o.id !== c.id && o.hp > 0);
        if (allies.length && !allySide() && cands().some(o => o.enemy)) h += stroke('pass', 'P', 'Fraqueza passa a vez', esc(passTo ? S.chars[passTo]?.name || '' : 'ninguém'), 150, 430, { r: 4, fs: 20 });
      }
      cx.shown = true;
      return `<div class="lq" aria-label="Comandos de ${esc(c.name)}"><div class="lqbox mode-${mode}">${h}</div></div>`;
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
        const d = k === 'ArrowUp' ? 1 : -1; // o leque sobe para os itens: ↑ vai para cima na tela
        if (mode === 'menu') state.sel = (state.sel + d + 3) % 3;
        else if (mode === 'items') { const n = Object.entries(c.inv).filter(([i]) => S.items[i]?.type === 'cons').length; if (!n) return true; state.sel = (state.sel - d + n) % n; }
        else if (mode === 'skills') { const n = six(c).length; if (!n) return true; const col = (state.sel >= 3 && state.sel < 6 ? [3, 4, 5] : [0, 1, 2]).filter(i => i < n), i = col.indexOf(state.sel); // ↓ no fim da coluna chega à pincelada "Todas"
          state.sel = state.sel === 6 ? (d > 0 ? col.at(-1) ?? 0 : 6) : d > 0 ? col[Math.max(0, i - 1)] : i < col.length - 1 ? col[i + 1] : 6; }
        else if (mode === 'all') { const l = flat(); if (!l.length) return true; const i = l.findIndex(x => pick.k === 'sk' && x.id === pick.id); pick = { k: 'sk', id: l[(i + (d > 0 ? l.length - 1 : 1) + (i < 0 ? 1 : 0)) % l.length].id }; }
        else return false;
        render(); app.querySelector('.skr.on')?.scrollIntoView({ block: 'nearest' }); return true;
      }
      if ((k === 'ArrowLeft' || k === 'ArrowRight') && mode === 'skills') {
        const n = six(c).length, s0 = state.sel; if (s0 === 6 || !n) return true; const to = k === 'ArrowRight' ? (s0 >= 3 ? s0 - 3 : s0) : (s0 < 3 ? s0 + 3 : s0);
        state.sel = to < n ? to : n > 3 ? n - 1 : s0; render(); return true; // sem a mesma linha na outra coluna: vai para o último dela
      }
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

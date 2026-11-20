// ===== HUD de combate do jogador na UI Pincelada (só com body.ui-pincel; hud.js desvia para cá) =====
// Ordem enxuta (quem age e os 3 próximos), barra do chefe no topo (nome, vida, escudo e quebra; fraquezas e condições ao sobrevoar),
// grupo completo no canto, registro (☰) por cima do palco e, fora da vez, Tab abre a própria ficha só para leitura.
// Inimigo comum: nome e vida aparecem em cima do recorte só ao sobrevoar ou mirar (CSS em pincel.css, classes hl/handed/tgt do palco).
(g => {
  const on = () => typeof PC !== 'undefined' && PC.on();
  const pips = (n, m, cls) => Array.from({ length: m }, (_, i) => `<i class="${cls} ${i < n ? 'on' : ''}"></i>`).join('');
  let logOpen = false, fichaOpen = false, actor = null;
  const ordem = (photo) => `<ol class="pc-ordem" aria-label="Ordem dos turnos">${timeline(4).map((id, i) => { const c = S.chars[id];
    return `<li class="${i ? '' : 'agora'} ${c.enemy ? 'foe' : 'hero'}" data-o="${id}" title="${esc(c.name)}"><span class="rt">${photo(c, 'p')}</span>${i ? '' : `<span class="nm">${esc(c.name)}</span>`}</li>`; }).join('')}</ol>`;
  // fraquezas: o que o grupo já descobriu (o resto vira ?), como na ficha antiga
  const MAIN5 = ['kagutsuchi', 'susanoo', 'atlas', 'indra', 'fuhaku'];
  const fraquezas = c => { const w = c.weak || [], r = c.resist || [], els = [...MAIN5, ...new Set([...w, ...r].filter(e => !MAIN5.includes(e)))];
    return els.map(e => { const k = w.includes(e) ? 'w' : r.includes(e) ? 'r' : (c.known || 0) < 2 && MAIN5.includes(e) ? 'q' : '';
      return k ? `<span class="el ${k}" title="${esc((EL[e] || e) + (k === 'w' ? ': fraqueza' : k === 'r' ? ': resiste' : ': não testado'))}">${k === 'q' ? '?' : esc((typeof KANJI !== 'undefined' && KANJI[e]) || e.slice(0, 1).toUpperCase())}</span>` : ''; }).join(''); };
  const chefe = (inB, pct) => { const c = inB.find(x => x.enemy && x.boss && x.hp > 0); if (!c) return '';
    const b = c.brk || { cur: 0, max: 0 }, st = stIcons(c), fq = fraquezas(c);
    return `<div class="pc-chefe" data-o="${c.id}" data-tgt="${c.id}" aria-label="Chefe"><span class="lavagem"></span><small>Chefe</small><b class="nome">${esc(c.name)}</b>
      <div class="vida"><span class="barra"><i data-bid="${c.id}:hp" data-p="${pct(c.hp, c.hpMax)}" style="width:${pct(c.hp, c.hpMax)}%"></i>${shBar(c)}</span><span class="pc-num">${pct(c.hp, c.hpMax)}%</span></div>
      ${b.max ? `<div class="quebra" title="Quebra ${b.cur} de ${b.max}">${pips(b.cur, b.max, 'q')}</div>` : ''}
      <div class="mais">${fq ? `<span class="fq">fraco e resiste ${fq}</span>` : ''}${st ? `<span class="st">${st}</span>` : ''}</div></div>`; };
  const heroi = (c, cur, pct) => { const hp = pct(c.hp, c.hpMax), am = c.auraMax || 0, form = c.st.form && c.form && SK(c.form);
    return `<div class="pc-heroi ${c === cur ? 'vez' : ''} ${c.hp > 0 ? '' : 'ko'} ${S.battle.cmd?.tgs?.includes(c.id) ? 'alvo' : ''} ${c.id === tgt ? 'tgt' : ''}" data-tgt="${c.id}" style="--c:${esc(c.color)}" title="${esc(c.name)}">
      <span class="rt">${HUD_PHOTO(c)}</span><div class="dados"><b class="nm">${esc(c.name)}</b>
      <div class="vida"><span class="barra"><i data-bid="${c.id}:hp" data-p="${hp}" style="width:${hp}%"></i>${shBar(c)}</span><span class="pc-num">${c.hp}<small>/${c.hpMax}</small></span></div>
      <div class="aura" title="Aura ${c.aura}/${c.auraMax}">${am && am <= 8 ? pips(Math.max(0, c.aura), am, 'a') : `<span class="barra au"><i style="width:${pct(Math.max(0, c.aura), c.auraMax)}%"></i></span>`}<span class="pc-num">${c.aura}</span></div>
      <div class="extra"><span class="barra san" title="Sanidade ${c.san}/${c.sanMax}"><i style="width:${pct(Math.max(0, c.san), c.sanMax)}%"></i></span><span class="lim ${c.limit >= 100 ? 'cheio' : ''}" title="Limite">${c.limit >= 100 ? 'Limite pronto' : `<span class="pc-num">${c.limit}%</span>`}</span></div>
      <div class="conds">${c.hp > 0 ? stIcons(c) : `<i class="caido">${c.dead ? 'Morto' : 'Caído' + (c.dying ? ' · ' + c.dying : '')}</i>`}${c.st.defUp ? '<span class="cond">Defendendo</span>' : ''}${form ? `<span class="cond forma">${esc(form.name)}</span>` : ''}</div></div></div>`; };
  let HUD_PHOTO = () => '';
  const registro = () => { if (!logOpen) return ''; const L = S.log.filter(l => !l.to && l.kind !== 'chat').slice(-40);
    return `<div class="pc-log" role="log" aria-label="Registro do combate"><header><b>Registro</b><button type="button" data-pch="log" aria-label="Fechar">✕</button></header><div class="ls">${L.map(l => `<p class="${esc(l.kind || '')}"><b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('') || '<p class="vazio">Nada aconteceu ainda.</p>'}</div></div>`; };
  // ficha só de leitura (fora da vez): recursos, atributos e condições do próprio herói
  const ficha = (c, pct) => { if (!fichaOpen || !c) return '';
    const R = [['Vida', c.hp, c.hpMax], ['Aura', c.aura, c.auraMax], ['Sanidade', c.san, c.sanMax], ['Limite', c.limit + '%', '']];
    return `<div class="pc-ficha" role="dialog" aria-label="Ficha de ${esc(c.name)}"><span class="rt">${HUD_PHOTO(c)}</span><div class="col"><h2>${esc(c.name)}</h2><small class="dica">Só leitura · Tab fecha</small>
      <h4>Recursos</h4><dl>${R.map(([k, v, m]) => `<dt>${k}</dt><dd class="pc-num">${v}${m !== '' ? `<small> / ${m}</small>` : ''}</dd>`).join('')}</dl>
      <h4>Atributos</h4><dl class="at">${A.map(k => `<dt>${k}</dt><dd class="pc-num">${typeof at === 'function' ? at(c, k) : c.attrs?.[k] ?? '—'}</dd>`).join('')}</dl>
      <h4>Condições</h4><div class="conds">${(c.hp > 0 && stIcons(c)) || '<i>Nenhuma</i>'}</div></div></div>`; };
  const html = ({ actorId, dim, inB, cur, cm, parts }) => {
    actor = actorId; HUD_PHOTO = c => parts.photo(c, 'p'); const pct = parts.pct, a = S.chars[actorId];
    const icos = `<div class="pc-icos"><button type="button" class="${logOpen ? 'on' : ''}" data-pch="log" aria-label="Registro do combate" aria-pressed="${logOpen}" title="Registro do combate e rolagens">☰</button><button type="button" data-a="navT" aria-label="Páginas" aria-expanded="${navOpen}" title="Páginas">◇</button></div>`;
    const menu = navOpen ? `<nav class="pc-paginas" aria-label="Páginas">${Object.entries(PAGES).map(([k, l]) => `<button type="button" data-pg="${k}" class="${pg === k ? 'on' : ''}">${k === 'mesa' ? 'Batalha' : esc(l)}</button>`).join('')}</nav>` : '';
    return `<div class="hudw pc-hud ${dim ? 'dim' : ''}">${ordem(parts.photo)}${chefe(inB, pct)}${icos}${menu}<div class="pc-campo">${fieldBar()}</div>`
      + `<div class="pc-canto">${cm ? `<div class="pc-cmd">${cm}</div>` : ''}<div class="pc-grupo">${inB.filter(c => !c.enemy).map(c => heroi(c, cur, pct)).join('')}</div></div>`
      + `${parts.faixa()}${parts.miniMapa(false)}</div>`; };
  // registro e ficha moram numa camada fixa acima do canvas dos corpos (luz-canvas, z 11), fora do #app
  let sobre = null, sobreH = '';
  const camada = () => { const h = on() && S?.battle?.active && actor ? registro() + ficha(S.chars[actor], (a, b) => Math.round(Math.max(0, Math.min(100, 100 * a / (b || 1))))) : '';
    if (h === sobreH) return; sobreH = h; if (!sobre) { sobre = document.createElement('div'); sobre.className = 'pc-sobre'; document.body.append(sobre); } sobre.innerHTML = h; };
  g.PCHUD = { on, html };
  if (typeof document === 'undefined') return;
  // chefe: marca o recorte para a barra de vida dele sair de cima do palco (ela já está no topo)
  const marca = () => { if (!on() || !S?.battle?.active) return; for (const c of Object.values(S.chars)) if (c.id in S.battle.ticks) document.querySelector(`.p3d .bb[data-tgt="${c.id}"]`)?.classList.toggle('pc-boss', !!c.boss); };
  const r0 = render; render = function () { r0(); try { marca(); camada(); } catch (e) { console.error(e); } };
  document.addEventListener('click', e => { const b = e.target.closest('[data-pch]'); if (!b) return; if (b.dataset.pch === 'log') logOpen = !logOpen; render(); });
  const typing = t => t?.matches?.('input,textarea,select,[contenteditable]');
  // Tab fora da vez: abre e fecha a própria ficha (antes do Tab antigo, que percorria os alvos); Esc fecha
  addEventListener('keydown', e => {
    if (!on() || gm || !S?.battle?.active || typing(e.target) || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Escape' && (fichaOpen || logOpen)) { fichaOpen = logOpen = false; e.preventDefault(); e.stopImmediatePropagation(); return render(); }
    if (e.key !== 'Tab') return; const x = typeof LEQUE !== 'undefined' && LEQUE.ctx(); if (x?.shown && !fichaOpen) return; // na vez, Tab é do leque
    if (!actor) return; e.preventDefault(); e.stopImmediatePropagation(); fichaOpen = !fichaOpen; render();
  }, true);
})(globalThis);

// Mesa: tela principal do mestre. Uma coluna por cena e uma coluna "Fora de cena"; arrastar retratos move os heróis
// (Ctrl+clique seleciona vários). O painel lateral mostra a cena em foco: mini mapa com as saídas, pedidos de passagem e "ver como".
let mzDrag = false; // arrastando um retrato: o redesenho espera (tela.js)
const MZ = { sel: new Set(), modal: null, pov: null, nk: 'blank', nn: '', take: false, ex: null, exTo: '', exBoth: true };
const MESA = (() => {
  const heroes = () => Object.values(S.chars).filter(c => !c.enemy && !c.summon);
  const okSc = id => typeof id === 'string' && Object.hasOwn(S.scenes, id);
  const bgOf = sc => sc.bg ? `background-image:url('${esc(sc.bg)}')` : ''; // o servidor só aceita links sem aspas nem parênteses (okUrl)
  const on = c => (S.online || []).includes(String(c.owner || '').toLowerCase());
  const face = c => (c.imgP || c.img) ? `<i class="mz-face" style="--c:${esc(c.color)};background-image:url('${esc(c.imgP || c.img)}')"></i>` : `<i class="mz-face" style="--c:${esc(c.color)}">${esc((c.name || '?')[0])}</i>`;
  const hero = c => `<div class="mz-hero ${MZ.sel.has(c.id) ? 'sel' : ''}" draggable="true" data-mz="h" data-id="${c.id}" title="${esc(c.name)}${c.owner ? ' · ' + esc(c.owner) + (on(c) ? ' (conectado)' : ' (desconectado)') : ' · sem dono'}">${face(c)}${c.owner ? `<em class="mz-on ${on(c) ? '' : 'off'}"></em>` : ''}<i class="mz-hp"><i style="width:${Math.max(0, Math.min(100, 100 * c.hp / (c.hpMax || 1)))}%"></i></i><small>${esc(c.name)}</small></div>`;
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  // selo de batalha: rodada, de quem é a vez e se ela espera o mestre (vez de inimigo ou pedido de jogador daquela cena)
  const badge = (id, sc) => {
    const B = sc.battle; if (!B?.active) return '';
    const cur = S.chars[B.order?.[0]], wait = (cur && cur.enemy) || Object.values(S.reqs || {}).some(r => r.sc === id);
    return `<button class="mz-bat ${wait ? 'wait' : ''}" data-mz="palco" data-id="${id}" title="Abrir o palco desta batalha">⚔ ${B.n ? 'R' + B.n + ' · ' : ''}${cur ? 'vez de ' + esc(cur.name) : 'em batalha'}${wait ? ' · espera você' : ''}</button>`;
  };
  const col = (id, sc) => {
    const hs = heroes().filter(c => c.scene === id), foes = Object.values(S.chars).filter(c => c.enemy && c.scene === id && c.x != null && c.hp > 0).length;
    return `<section class="mz-col ${id === S.focus ? 'focus' : ''}" data-mzdrop="${id}">
      <button class="mz-thumb" data-mz="focus" data-id="${id}" style="${bgOf(sc)}" title="Pôr o foco nesta cena"><span class="mz-tags">${id === S.tv ? '<em class="tv">TV</em>' : ''}${sc.clima ? `<em>${esc(sc.clima)}</em>` : ''}${sc.shop?.open ? '<em>Loja</em>' : ''}${sc.fogOn ? '<em>Névoa</em>' : ''}${(sc.enc || []).length ? `<em title="Encontros preparados">⚔ ${sc.enc.length}</em>` : ''}${sc.note ? '<em title="Tem notas">✎</em>' : ''}</span><b>${esc(sc.name)}</b></button>
      ${badge(id, sc)}
      <div class="mz-meta"><span>${pl(hs.length, 'herói', 'heróis')}</span><span>${pl(foes, 'inimigo', 'inimigos')}</span><span>${pl((sc.exits || []).length, 'saída', 'saídas')}</span></div>
      <div class="mz-drop">${hs.map(hero).join('') || '<small class="mz-empty">arraste heróis para cá</small>'}</div></section>`;
  };
  const offCol = () => { const hs = heroes().filter(c => !okSc(c.scene)); return `<section class="mz-col off" data-mzdrop="">
      <div class="mz-thumb"><b>Fora de cena</b></div><div class="mz-meta"><span>veem só a tela de espera</span></div>
      <div class="mz-drop">${hs.map(hero).join('') || '<small class="mz-empty">ninguém nos bastidores</small>'}</div>
      <textarea class="mz-msg" data-mzf="offMsg" aria-label="Recado para quem está fora de cena" placeholder="Recado para quem está fora de cena (opcional)">${esc(S.offMsg || '')}</textarea></section>`; };
  const mini = (id, sc) => {
    const C = Math.ceil(sc.cols), R = Math.ceil(sc.rows), pos = (x, y) => `left:${(x + .5) / C * 100}%;top:${(y + .5) / R * 100}%`;
    const toks = Object.values(S.chars).filter(c => c.scene === id && c.x != null && (!c.enemy || c.hp > 0)).map(c => `<i class="mz-tk ${c.enemy ? 'foe' : ''}" style="${pos(c.x, c.y)};--c:${esc(c.color)}" title="${esc(c.name)}"></i>`).join('');
    const exs = (sc.exits || []).map(e => `<button class="mz-ex" data-mz="exDel" data-id="${e.id}" style="${pos(e.x, e.y)}" title="Remover esta saída">⇲ ${esc(S.scenes[e.to]?.name || '?')}</button>`).join('');
    const pick = MZ.ex ? `<i class="mz-pick" style="${pos(MZ.ex.x, MZ.ex.y)}"></i>` : '';
    return `<div class="mz-mini" data-mz="mini" style="aspect-ratio:${sc.ar};${bgOf(sc)}"><i class="mz-grid" style="--c:${C};--r:${R}"></i>${toks}${exs}${pick}</div>`;
  };
  const side = () => {
    const id = S.focus, sc = S.scenes[id], hs = heroes().filter(c => c.scene === id), others = Object.entries(S.scenes).filter(([k]) => k !== id);
    const rq = Object.entries(S.reqs || {}).filter(([, r]) => r.cat === 'pass');
    return `<aside class="mz-side"><div><small class="mz-h">Cena em foco</small><h2>${esc(sc.name)}</h2><button data-mz="rename" title="Editar o nome desta cena">Renomear</button></div>
      <div class="row"><button data-mz="go" data-v="mapa">Editar mapa</button>${sc.battle?.active ? `<button class="own" data-mz="palco" data-id="${id}">Abrir palco</button>` : '<button class="own" data-mz="fight">Iniciar batalha aqui</button>'}${S.tv === id ? '' : `<button data-mz="tv" data-id="${id}">Mostrar na TV</button>`}<button data-mz="dup">Duplicar</button><button data-mz="del" ${sc.battle?.active || others.length < 1 ? 'disabled' : ''} title="${sc.battle?.active ? 'Encerre a batalha antes de excluir' : others.length < 1 ? 'Não é possível excluir a única cena' : hs.length ? `Os heróis serão transferidos para ${esc(others[0][1].name)}` : 'Excluir esta cena'}">Excluir</button></div>
      <div><small class="mz-h">Mapa e saídas</small>${mini(id, sc)}<small class="mz-note">${others.length ? 'Clique numa casa para pôr uma saída; clique numa saída para removê-la.' : 'Crie outra cena para poder ligar as duas por uma saída.'}</small></div>
      <div><small class="mz-h">Notas e encontros (só você vê)</small>
        <textarea class="mz-msg mz-note-in" data-map="note" aria-label="Notas secretas desta cena" placeholder="Ganchos, segredos, o que os NPCs sabem…">${esc(sc.note || '')}</textarea>
        <div class="mz-list">${(sc.enc || []).filter(k => S.encounters?.[k]).map(k => { const e = S.encounters[k]; return `<div class="mz-li enc"><span title="${esc(e.list.map(x => `${x.n}× ${S.bestiary?.[x.b]?.name || '?'}`).join(', '))}">${esc(e.name)} · ${e.list.reduce((a, x) => a + x.n, 0)}</span><button class="own" data-mz="encGo" data-id="${k}" title="Põe os inimigos deste encontro no mapa da cena">Pôr na cena</button><button data-mz="encOff" data-id="${k}" title="Desligar da cena (o encontro continua salvo)">✕</button></div>`; }).join('')}</div>
        ${Object.keys(S.encounters || {}).some(k => !(sc.enc || []).includes(k)) ? `<label class="mz-note">Preparar encontro <select data-mzf="enc" aria-label="Ligar um encontro salvo a esta cena"><option value="">— escolher —</option>${Object.entries(S.encounters).filter(([k]) => !(sc.enc || []).includes(k)).map(([k, e]) => `<option value="${k}">${esc(e.name)}</option>`).join('')}</select></label>` : Object.keys(S.encounters || {}).length ? '' : '<small class="mz-note">Monte encontros no Bestiário para deixá-los prontos aqui.</small>'}</div>
      <div><small class="mz-h">Pedidos de passagem</small><div class="mz-list">${rq.length ? rq.map(([k, r]) => `<div class="mz-li req"><span>${esc(S.chars[r.ch]?.name || r.by)}: ${esc(r.text)}</span><button class="own" data-a="rqOk" data-id="${k}">Deixar</button><button data-a="rqNo" data-id="${k}">Não</button></div>`).join('') : '<small class="mz-note">Nenhum pedido agora.</small>'}</div>
        <label class="mz-note"><input type="checkbox" data-mz="auto" ${S.auto?.pass ? 'checked' : ''}> Deixar passar sem pedir</label></div>
      <div><small class="mz-h">Quem está aqui</small><div class="mz-list">${hs.map(c => `<div class="mz-li"><span>${esc(c.name)}</span>${c.owner ? `<button data-mz="pov" data-k="${esc(c.owner)}">Ver como</button>` : ''}<button data-mz="out" data-id="${c.id}">Tirar de cena</button></div>`).join('') || '<small class="mz-note">Ninguém. Arraste heróis para a coluna da cena.</small>'}</div></div>
      <div><small class="mz-h">Outras cenas</small><div class="mz-list">${others.map(([k, o]) => `<div class="mz-li"><span>${esc(o.name)}${o.battle?.active ? ' · ⚔' : ''}</span><button data-mz="focus" data-id="${k}">Focar</button></div>`).join('') || '<small class="mz-note">Só existe esta cena.</small>'}</div></div></aside>`;
  };
  const selbar = () => MZ.sel.size ? `<div class="mz-selbar">${MZ.sel.size} selecionado${MZ.sel.size > 1 ? 's' : ''} · mover para: ${Object.entries(S.scenes).map(([k, o]) => `<button data-mz="mv" data-id="${k}">${esc(o.name)}</button>`).join('')}<button data-mz="mv" data-id="">Fora de cena</button><button class="ghost" data-mz="unsel" title="Limpar a seleção (Esc)">✕</button></div>` : '';
  const modal = () => {
    if (MZ.modal === 'new') return `<div class="mz-modal"><div class="mz-box"><h2>Nova cena</h2><input data-mzf="nn" aria-label="Nome da cena" placeholder="Nome da cena" value="${esc(MZ.nn)}">
      <div class="mz-opts">${[['blank', 'Em branco', 'Mapa vazio 20×12'], ['dup', 'Duplicar o foco', 'Copia mapa, loja, clima e saídas'], ['ex', 'De exemplo', 'Taverna, mina, cripta…']].map(([k, t, d]) => `<button class="mz-opt ${MZ.nk === k ? 'on' : ''}" data-mz="nk" data-k="${k}">${t}<small>${d}</small></button>`).join('')}</div>
      ${MZ.sel.size && MZ.nk !== 'ex' ? `<label class="mz-note"><input type="checkbox" data-mz="take" ${MZ.take ? 'checked' : ''}> Já levar os ${MZ.sel.size} selecionados para ela</label>` : ''}
      <div class="row end"><button class="ghost" data-mz="x">Cancelar</button><button class="own" data-mz="mk">Criar</button></div></div></div>`;
    if (MZ.modal === 'exit') return `<div class="mz-modal"><div class="mz-box"><h2>Nova saída</h2><small class="mz-note">Leva para qual cena? O jogador que pisar nesta casa pede para passar, e você aprova.</small>
      <div class="mz-opts">${Object.entries(S.scenes).filter(([k]) => k !== S.focus).map(([k, o]) => `<button class="mz-opt ${MZ.exTo === k ? 'on' : ''}" data-mz="exTo" data-id="${k}">${esc(o.name)}</button>`).join('')}</div>
      <label class="mz-note"><input type="checkbox" data-mz="exBoth" ${MZ.exBoth ? 'checked' : ''}> Criar a volta do outro lado</label>
      <div class="row end"><button class="ghost" data-mz="x">Cancelar</button><button class="own" data-mz="exOk" ${MZ.exTo ? '' : 'disabled'}>Criar saída</button></div></div></div>`;
    return '';
  };
  const pov = () => MZ.pov ? `<div class="mz-pov"><header>Vendo como <b>${esc(MZ.pov)}</b> · só você vê isto<span></span><button data-mz="povX">Voltar à mesa</button></header><iframe title="Tela de ${esc(MZ.pov)}" src="/player?as=${encodeURIComponent(MZ.pov)}"></iframe></div>` : '';
  const html = () => {
    for (const id of MZ.sel) if (!S.chars[id]) MZ.sel.delete(id);
    const tv = S.scenes[S.tv] || S.scenes[S.focus], owners = [...new Set(heroes().map(c => c.owner).filter(Boolean))].sort();
    return `<div class="mesa"><header class="mz-top"><button class="own" data-mz="new">+ Nova cena</button><button data-mz="all" title="Leva todos os heróis para a cena em foco">Reunir todos no foco</button><span class="mz-sp"></span>
      <label class="mz-note">Ver como <select data-mzf="pov" aria-label="Ver a tela de um jogador"><option value="">— jogador —</option>${owners.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></label>
      <button data-mz="tv" data-id="${S.focus}" title="A TV mostra a cena em foco">TV: ${esc(tv?.name || '?')}</button></header>
      <div class="mz-main"><div class="mz-board">${Object.entries(S.scenes).map(([k, o]) => col(k, o)).join('')}${offCol()}<button class="mz-col add" data-mz="new">+<small>Nova cena</small></button></div>${side()}</div>
      ${selbar()}${modal()}${pov()}</div>`;
  };
  const moveSel = to => { const ids = [...MZ.sel]; MZ.sel.clear(); if (ids.length) send({ t: 'moveTo', ids, scene: to || null }); render(); };
  const cellOf = (e, el) => { const r = el.getBoundingClientRect(), sc = S.scenes[S.focus]; return { x: Math.max(0, Math.min(Math.ceil(sc.cols) - 1, Math.floor((e.clientX - r.left) / r.width * Math.ceil(sc.cols)))), y: Math.max(0, Math.min(Math.ceil(sc.rows) - 1, Math.floor((e.clientY - r.top) / r.height * Math.ceil(sc.rows)))) }; };
  const click = e => {
    const t = e.target.closest('[data-mz]'); if (!t || !gm) return; const d = t.dataset;
    if (d.mz === 'mini') { if (Object.keys(S.scenes).length < 2) return; MZ.ex = cellOf(e, t); MZ.exTo = ''; MZ.modal = 'exit'; return render(); }
    if (d.mz === 'auto' || d.mz === 'take' || d.mz === 'exBoth') return; // caixas: tratadas no change
    e.preventDefault();
    if (d.mz === 'h') { if (e.ctrlKey || e.metaKey || e.shiftKey || MZ.sel.size) { MZ.sel.has(d.id) ? MZ.sel.delete(d.id) : MZ.sel.add(d.id); } else MZ.sel = new Set([d.id]); return render(); }
    if (d.mz === 'focus') return send({ t: 'sceneGo', id: d.id });
    if (d.mz === 'palco') { send({ t: 'sceneGo', id: d.id }); return gView('palco'); }
    if (d.mz === 'go') return gView(d.v);
    if (d.mz === 'fight') { send({ t: 'battle', on: true }); return gView('palco'); }
    if (d.mz === 'tv') return send({ t: 'tvSet', id: d.id });
    if (d.mz === 'rename') { const name = prompt('Nome da cena:', S.scenes[S.focus].name); if (name !== null && name.trim()) send({ t: 'map', f: 'name', v: name.trim() }); return; }
    if (d.mz === 'mv') return moveSel(d.id);
    if (d.mz === 'unsel') { MZ.sel.clear(); return render(); }
    if (d.mz === 'out') return send({ t: 'moveTo', ids: [d.id], scene: null });
    if (d.mz === 'all') return send({ t: 'moveTo', ids: heroes().map(c => c.id), scene: S.focus });
    if (d.mz === 'del') { const hs = heroes().filter(c => c.scene === S.focus), target = Object.entries(S.scenes).find(([id]) => id !== S.focus); if (!target || S.scenes[S.focus].battle?.active) return; const transfer = hs.length ? ` ${hs.map(c => c.name).join(', ')} serão transferidos para ${target[1].name}.` : ''; if (confirm(`Excluir a cena ${S.scenes[S.focus].name}? Os inimigos dela vão junto.${transfer}`)) send({ t: 'sceneDel', id: S.focus, to: target[0] }); return; }
    if (d.mz === 'dup') return send({ t: 'sceneAdd', dup: S.focus });
    if (d.mz === 'new') { MZ.modal = 'new'; MZ.nn = ''; MZ.nk = 'blank'; MZ.take = MZ.sel.size > 0; render(); return app.querySelector('[data-mzf="nn"]')?.focus(); }
    if (d.mz === 'nk') { MZ.nk = d.k; return render(); }
    if (d.mz === 'x') { MZ.modal = null; MZ.ex = null; return render(); }
    if (d.mz === 'mk') {
      if (MZ.nk === 'ex') send({ t: 'content', coll: 'scenes' });
      else send({ t: 'sceneAdd', name: MZ.nn, dup: MZ.nk === 'dup' ? S.focus : undefined, take: MZ.take ? [...MZ.sel] : [] });
      if (MZ.take) MZ.sel.clear(); MZ.modal = null; return render();
    }
    if (d.mz === 'exTo') { MZ.exTo = d.id; return render(); }
    if (d.mz === 'exOk') { send({ t: 'exitAdd', scene: S.focus, ...MZ.ex, to: MZ.exTo, both: MZ.exBoth }); MZ.modal = null; MZ.ex = null; return render(); }
    if (d.mz === 'exDel') return send({ t: 'exitDel', scene: S.focus, id: d.id });
    if (d.mz === 'encGo') return send({ t: 'encSpawn', id: d.id });
    if (d.mz === 'encOff') return send({ t: 'sceneEnc', scene: S.focus, id: d.id, on: false });
    if (d.mz === 'pov') { MZ.pov = d.k; return render(); }
    if (d.mz === 'povX') { MZ.pov = null; return render(); }
  };
  app.addEventListener('click', click);
  app.addEventListener('change', e => {
    const t = e.target; if (!gm || !t.closest?.('.mesa')) return;
    if (t.dataset.mz === 'auto') return send({ t: 'autoSet', k: 'pass', v: t.checked });
    if (t.dataset.mz === 'take') { MZ.take = t.checked; return; }
    if (t.dataset.mz === 'exBoth') { MZ.exBoth = t.checked; return; }
    if (t.dataset.mzf === 'pov') { if (t.value) { MZ.pov = t.value; render(); } return; }
    if (t.dataset.mzf === 'offMsg') return send({ t: 'offMsg', v: t.value });
    if (t.dataset.mzf === 'enc') { if (t.value) send({ t: 'sceneEnc', scene: S.focus, id: t.value, on: true }); return; }
  });
  app.addEventListener('input', e => { if (e.target.dataset?.mzf === 'nn') MZ.nn = e.target.value; });
  app.addEventListener('keydown', e => {
    if (!gm || !app.querySelector('.mesa')) return;
    if (e.key === 'Enter' && e.target.dataset?.mzf === 'nn') { e.preventDefault(); app.querySelector('[data-mz="mk"]')?.click(); }
    if (e.key === 'Escape' && (MZ.modal || MZ.pov || MZ.sel.size)) { MZ.modal = null; MZ.pov = null; MZ.ex = null; MZ.sel.clear(); render(); }
  });
  // arrastar retratos entre as colunas (leva a seleção inteira se o retrato arrastado fizer parte dela)
  app.addEventListener('dragstart', e => {
    const h = e.target.closest?.('.mz-hero'); if (!h || !gm) return;
    if (!MZ.sel.has(h.dataset.id)) MZ.sel = new Set([h.dataset.id]);
    mzDrag = true; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', [...MZ.sel].join(','));
    app.querySelectorAll('.mz-hero').forEach(x => MZ.sel.has(x.dataset.id) && x.classList.add('drag'));
  });
  app.addEventListener('dragover', e => { const c = e.target.closest?.('[data-mzdrop]'); if (!mzDrag) return; app.querySelectorAll('.mz-col.over').forEach(x => x !== c && x.classList.remove('over')); if (c) { e.preventDefault(); c.classList.add('over'); } });
  app.addEventListener('drop', e => { const c = e.target.closest?.('[data-mzdrop]'); if (!c || !mzDrag) return; e.preventDefault(); mzDrag = false; moveSel(c.dataset.mzdrop); });
  app.addEventListener('dragend', () => { if (!mzDrag && !app.querySelector('.mz-col.over')) return; mzDrag = false; app.querySelectorAll('.over,.drag').forEach(x => x.classList.remove('over', 'drag')); if (pending) render(); });
  return { html };
})();

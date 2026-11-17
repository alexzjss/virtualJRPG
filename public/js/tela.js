let gmWasB = false;
function render() {
  const ae = document.activeElement;
  if (drag || wdrag || cdrag || ae?.matches?.('#app select')) { pending = true; return; }
  pending = false;
  // guarda o campo em edição e a rolagem das janelas para devolver depois de redesenhar
  const keep = ae && app.contains(ae) && ae.matches('input:not([type=file]),textarea') ? { v: ae.value, s: ae.selectionStart,
    sel: ae.tagName + Object.entries(ae.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, x => '-' + x.toLowerCase())}="${CSS.escape(v)}"]`).join('') } : null;
  const scr = [...app.querySelectorAll('.win-body,.chatcol,.skside,.pl>main,.fbody')].map(el => el.scrollTop);
  const b = S.battle.active, sc = S.scenes[S.scene], chars = Object.values(S.chars), on = v => v ? 'class="own"' : '';
  asking = new Set(gm ? Object.values(S.reqs).map(r => r.ch) : []);
  const log = logHtml();
  if (gm) { // pedido novo: toca o aviso e anima o cartão
    const newest = Object.entries(S.reqs).sort((a, b) => b[1].n - a[1].n)[0];
    reqIn = newest && newest[1].n > lastReqN ? newest[0] : null;
    if (reqIn) { lastReqN = newest[1].n; if (!snd.mute) beep(); }
  }
  if (gm) {
    if (b && !gmWasB) { wins.batalha.open = true; wins.batalha.z = ++zc; } // a batalha começou: a janela dela vem para a frente
    gmWasB = b;
    const cena = `<div class="row"><button data-a="addChar">+ Personagem</button><button data-a="addChar" data-enemy="1">+ Inimigo</button><button data-a="secret" ${on(secret)}>Rolagem secreta</button><button data-a="undo" title="Desfaz a última ação do mestre (até 20)">Desfazer</button></div>
      <div class="row">${b ? `<button data-a="battle" data-win="1" class="own ${S.battle.end === 'won' ? 'pulse' : ''}">Vitória</button>` + '<button data-a="battle">Encerrar batalha</button>' : '<button data-a="battle" data-on="1">Iniciar batalha</button>'}</div>
      <div class="row"><button data-a="rest">Descanso curto</button><button data-a="rest" data-long="1">Descanso longo</button><button data-a="camp" data-on="${S.camp.open ? '' : 1}" ${on(S.camp.open)}>Acampamento</button></div>
      <div class="row chips">Cenas: ${chips(S.scenes, (id, s) => `<span class="${id === S.scene ? 'weak' : ''}" data-a="sceneGo" data-id="${id}">${esc(s.name)}</span>`)}<span data-a="sceneAdd">+</span><span data-a="sceneDel">excluir atual</span><span data-a="content" data-coll="scenes">+ cenas de exemplo</span></div>
      <div class="row"><input aria-label="Nome da cena" data-map="name" value="${esc(sc.name)}"></div>
      <div class="row"><input aria-label="Imagem do mapa" data-map="bg" placeholder="Link da imagem do mapa" value="${esc(sc.bg)}"><label class="up">Enviar imagem<input type="file" accept="image/*" data-up="bg"></label><button data-a="cropOn" ${sc.bg ? '' : 'disabled'}>Recortar área</button></div>
      <div class="row"><label>Casas na largura <input type="number" step="0.25" min="4" max="80" data-map="cols" value="${sc.cols}"></label><small>${Math.round(sc.rows * 10) / 10} de altura</small></div>
      <div class="row"><label>Grade → <input type="range" min="0" max="0.95" step="0.05" data-map="ox" value="${sc.ox}" aria-label="Deslocar grade na horizontal"></label><label>↓ <input type="range" min="0" max="0.95" step="0.05" data-map="oy" value="${sc.oy}" aria-label="Deslocar grade na vertical"></label></div>
      <div class="row chips">Recursos da cena: ${Object.entries(S.items).filter(([, i]) => i.type === 'mat' && i.tag).map(([k, i]) => `<span class="${(sc.gather || []).includes(k) ? 'weak' : ''}" data-a="gatherSet" data-item="${k}" data-on="${(sc.gather || []).includes(k) ? '' : '1'}" title="O que os ofícios de coleta acham aqui">${esc(i.name)}</span>`).join('')}</div>
      <div class="row chips">Clima: <span class="${sc.wx ? '' : 'weak'}" data-a="weather" data-k="">Limpo</span>${Object.entries(RULES.CLIMA).map(([k, v]) => `<span class="${sc.wx === k ? 'weak' : ''}" data-a="weather" data-k="${k}">${v[0]}</span>`).join('')}</div>
      <div class="row chips">Fundo da batalha: <span class="${sc.bbg ? '' : 'weak'}" data-a="map" data-f="bbg" data-v="" title="Usa a imagem do mapa desta cena">Mapa da cena</span>${chips(BBG, (k, l) => `<span class="${sc.bbg === k ? 'weak' : ''}" data-a="map" data-f="bbg" data-v="${k}">${l}</span>`)}</div>
      <div class="row"><input aria-label="Imagem própria para o fundo da batalha" data-map="bbg" placeholder="Ou cole o link de uma imagem" value="${esc(sc.bbg && !BBG[sc.bbg] ? sc.bbg : '')}"><label class="up">Enviar fundo<input type="file" accept="image/*" data-up="bbg"></label></div>
      <div class="row"><button data-a="camFix" title="Todos passam a ver o mapa com o seu zoom e posição atuais">Fixar minha vista para todos</button>${sc.cam ? '<button data-a="camFree" class="own">Liberar vista</button>' : ''}</div>

      <div class="row"><button data-a="map" data-f="fogOn" data-v="${sc.fogOn ? '' : 1}" ${on(sc.fogOn)}>Névoa</button>${sc.fogOn ? `<button data-a="fogMode" ${on(fogMode)}>Pincel de névoa</button><small>Arraste para revelar; Shift esconde.</small>` : ''}</div>
      ${xCena(sc)}
      <textarea aria-label="Notas secretas da cena" data-map="note" placeholder="Notas secretas desta cena">${esc(sc.note)}</textarea>`;
    const fw = Object.keys(wins).filter(k => k.startsWith('f_') && wins[k].open && ent(k.slice(2))), ALL = { ...WIN, ...Object.fromEntries(fw.map(k => [k, [ent(k.slice(2)).name + (S.chars[k.slice(2)] ? '' : ' · modelo do bestiário'), 1080]])) };
    const rank = Object.keys(ALL).sort((x, y) => (wins[x].z || 0) - (wins[y].z || 0));
    const lays = chips(LAYD, k => `<button class="lay" data-a="lay" data-k="${k}" title="Clique: aplicar arranjo · Shift+clique: salvar o arranjo atual">${k}</button>`);
    const body = { ...xWins(), ...Object.fromEntries(fw.map(k => [k, gmSheet(ent(k.slice(2)))])), sessao: wins.sessao.open ? sessWin() : '', best: wins.best.open ? bestWin() : '', ini: wins.ini.open ? iniWin() : '', chase: wins.chase.open ? chaseWin() : '', cena, batalha: b ? battle() : '<small>Nenhuma batalha em andamento.</small>', fichas: wins.fichas.open ? fichasWin() : '', chat: log, skills: wins.skills.open ? editor('skills') : '', items: wins.items.open ? editor('items') : '', ofcat: wins.ofcat.open ? ofcatWin() : '', armas: wins.armas.open ? armasWin() : '' };
    app.innerHTML = `<main>${map()}</main>${chips(ALL, (id, [title, w]) => wins[id].open ? `<section class="win" data-win="${id}" style="left:${wins[id].x}px;top:${wins[id].y}px;width:${id === 'batalha' ? Math.max(640, innerWidth - 780) : Math.min(w, innerWidth - 24)}px;z-index:${20 + rank.indexOf(id)}"><header data-drag="${id}"><span>${esc(title)}</span><button data-a="winX" data-id="${id}" aria-label="Fechar ${esc(title)}">×</button></header><div class="win-body">${body[id]}</div></section>` : '')}
      ${reqStrip()}${cropper()}<nav class="dock">${chips(WIN, (id, [title]) => `<button data-a="winT" data-id="${id}" ${on(wins[id].open)}>${title}</button>`)}<i></i>${lays}</nav>${ctxMenu()}`;
  } else if (role === 'player') {
    const my = chars.filter(mine), c = my.find(x => x.id === selCh) || my[0], cur = b ? S.chars[timeline(1)[0]] : null, inB = b ? my.filter(x => x.id in S.battle.ticks) : [], actor = inB.includes(cur) ? cur : inB.includes(c) ? c : inB[0];
    if (b && !wasBattle) pg = 'mesa'; // a batalha começou: leva o jogador para a mesa
    wasBattle = b;
    const page = !c ? `<section class="card"><h3>Bem-vindo, ${esc(name)}</h3><p>Você entrou na campanha. O mestre ainda não ligou um personagem à sua conta: assim que ele fizer isso, a ficha aparece aqui sozinha.</p></section>`
      : pg === 'pers' ? persPage(c) : pg === 'hab' ? skillPage(c) : pg === 'ofi' ? oficiosPage(c) : pg === 'itens' ? itemsPage(c)
      : pg === 'hist' ? `<section class="card hist"><h3>Diário de ${esc(c.name)}</h3><textarea aria-label="Diário" data-id="${c.id}" data-f="bio" placeholder="História, aparência, objetivos, anotações da campanha…">${esc(c.bio)}</textarea></section>`
      : chaseBar() + (actor ? battle() + command(actor, cur) : b ? battle() + '<p class="card none">Seu personagem não está nesta batalha.</p>' : map() + mesaTools(c));
    const unread = chatOpen ? 0 : S.log.filter(l => l.n > chatSeen).length, pgIn = lastPg !== pg + (c?.id || '') ? 'enter' : '';
    if (chatOpen) chatSeen = S.seq;
    lastPg = pg + (c?.id || '');
    app.innerHTML = `<header class="top"><div class="who">${my.map(x => `<button class="chb ${x === c ? 'on' : ''}" data-sel="${x.id}" style="--c:${esc(x.color)}" aria-pressed="${x === c}"><b>${esc(x.name)}</b><i class="mhp"><i style="width:${Math.max(0, Math.min(100, 100 * x.hp / (x.hpMax || 1)))}%"></i></i><small>${x.hp}/${x.hpMax} HP</small></button>`).join('')}</div>
      <nav class="tnav" aria-label="Páginas">${chips(PAGES, (k, l) => `<button data-pg="${k}" class="${pg === k ? 'on' : ''} ${k === 'mesa' && b ? 'alert' : ''}" ${pg === k ? 'aria-current="page"' : ''}>${ico(k)}<span>${k === 'mesa' && b ? 'Batalha' : l}</span></button>`)}<button class="tchat ${chatOpen ? 'on' : ''}" data-a="chatT" aria-pressed="${chatOpen}">${ico('chat')}<span>Chat</span>${unread ? `<i class="bdg">${unread > 9 ? '9+' : unread}</i>` : ''}</button></nav>
      <div class="me"><button class="ghost" data-a="meT" aria-expanded="${meOpen}">${esc(name)}</button>${meOpen ? `<div class="pop"><button data-a="mute">${snd.mute ? 'Ligar som' : 'Desligar som'}</button><button data-a="myPass">Trocar senha</button><button data-a="logout">Sair</button></div>` : ''}</div></header>
      ${ctl ? `<div class="peek ctl">Você está <b>jogando por ${esc(asWho)}</b>: o que fizer aqui acontece na hora, sem passar pela fila de pedidos.</div>` : asWho ? `<div class="peek">Você está vendo a tela de <b>${esc(asWho)}</b>. Só para olhar: nada do que clicar aqui acontece.</div>` : ''}
      <div class="pl ${chatOpen ? '' : 'nochat'} pg-${pg}"><main class="${pgIn}">${page}</main><aside class="chatcol ${chatOpen ? '' : 'shut'}"><div class="panel"><header><b>Chat e histórico</b><button class="ghost" data-a="chatT" aria-label="Fechar chat">Fechar</button></header>${log}</div></aside></div>${pg === 'mesa' && actor ? '' : reqBar()}${rollSheet()}${ctxMenu()}`;
    lastReq = (myReq() || [])[0] || null;
  } else app.innerHTML = `<main>${chaseBar()}${b ? battle() : map() + party()}</main>`;
  if (gridFull && S.chars[gridFull]) app.insertAdjacentHTML('beforeend', `<div class="modal"><header><b>Habilidades · ${esc(S.chars[gridFull].name)}</b><button data-a="gridFull" data-id="">Fechar</button></header>${skillPage(S.chars[gridFull])}</div>`);
  { const skm = app.querySelector(".skmap"); // a grade abre já aproximada na árvore do personagem, não no mapa inteiro
    if (skm && gvFor !== skm.dataset.cid) { gvFor = skm.dataset.cid; Object.assign(gv, { z: 1, x: 0, y: 0 }); applyGv(); const o = skm.querySelector(".nd.own");
      if (o) { const q = o.getBoundingClientRect(), m = skm.getBoundingClientRect(), z = 4; Object.assign(gv, { z, x: m.width / 2 - (q.left + q.width / 2 - m.left) * z, y: m.height / 2 - (q.top + q.height / 2 - m.top) * z }); applyGv(); } } }
  if (editFocus) { editFocus = false; const el = app.querySelector('.edin'); if (el) { el.focus(); el.select(); } }
  if (keep) { const el = app.querySelector(keep.sel); if (el) { el._dirty = el.value !== keep.v; el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch {} } }
  app.querySelectorAll('.win-body,.chatcol,.skside,.pl>main,.fbody').forEach((el, i) => el.scrollTop = scr[i] || 0);
  { const sc2 = S.scenes[S.scene]; if (sc2.cam && sc2.cam.n !== lastCam) { const w = mapEl()?.offsetWidth; if (w) { lastCam = sc2.cam.n; Object.assign(view, { z: sc2.cam.z, x: sc2.cam.fx * w, y: sc2.cam.fy * w }); applyView(); } } } // vista fixada pelo mestre
  app.querySelectorAll('span[data-a],span[data-edit],[data-tab],[data-node],.unit[data-tgt],span[data-tgt],[data-aim],[data-cz],.hud,.scard').forEach(el => { el.tabIndex = 0; el.setAttribute('role', 'button'); if (el.title) el.setAttribute('aria-label', el.title); });
  fx();
}

// os efeitos (fx, impacto, dados, abertura e resultado) estão em coreo.js

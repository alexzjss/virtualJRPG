// ===== Cockpit do mestre na UI Pincelada (só com body.ui-pincel; docas.js e hud.js desviam para cá) =====
// Barra de cima: modos (Mesa, Mundo, Combate, Catálogo), faixa dos heróis da cena e selo de pedidos com contador.
// Em combate: a mesma HUD do jogador (pincel-hud.js) com a ordem em 4 + "+N" (abre a fila inteira para arrastar, manda ordMove),
// a fila de pedidos fixa à esquerda, a barra de ferramentas (inimigo novo, desfazer, clima, câmera, encerrar)
// e o anel do recorte (botão direito num recorte, num herói do canto ou no ⋯ da fila): −10/+10 vida, condição, escudo, mover, remover e ficha.
(g => {
  const on = () => typeof PC !== 'undefined' && PC.on() && typeof gm !== 'undefined' && gm;
  const E = s => PC.esc(s);
  const foto = c => { try { const s = PALCO3D.imgSrc(c, 'p'); if (s?.url) return `<img src="${E(s.url)}" alt="" draggable="false">`; } catch {} return `<i>${E((c.name || '?').slice(0, 1))}</i>`; };
  const pct = (a, b) => Math.round(Math.max(0, Math.min(100, 100 * a / (b || 1))));
  // estado só desta tela
  let ordOpen = false, ordSel = null, ring = null, sub = '', pop = '', spawnQ = '';
  const fecha = () => { ordOpen = false; ordSel = null; ring = null; sub = ''; pop = ''; };

  // ---------- barra de cima (troca o <header class="gtop"> de gmLayout) ----------
  const topo = (velho, inB) => {
    const v = gui.view, cat = sideOpen('L') && WIDE.has(gui.L), sc = S.scenes[S.scene], nReq = Object.keys(S.reqs || {}).length;
    const tools = velho.match(/<details class="gtools">[\s\S]*<\/details>/)?.[0] || '', regras = velho.match(/<button type="button" data-regras[\s\S]*?<\/button>/)?.[0] || '';
    const fora = !inB && Object.values(S.scenes).some(o => o.battle?.active);
    const modos = [['mesa', 'Mesa', 'Q', fora], ['mapa', 'Mundo', 'M'], ['palco', 'Combate', 'P', inB]];
    const btn = ([k, l, t, vivo]) => `<button type="button" class="pcm-modo ${v === k && !cat ? 'on' : ''}" data-g="view" data-v="${k}" aria-pressed="${v === k && !cat}" title="${l} (${t})">${l}${vivo ? '<i class="vivo" role="img" aria-label="Batalha em andamento"></i>' : ''}</button>`;
    const herois = Object.values(S.chars).filter(c => !c.enemy && !c.npc && !c.summon && !c.dead && c.scene === S.scene);
    return `<header class="gtop pcm-top"><div class="pcm-cena"><small>${S.paused ? 'Mesa pausada' : 'Cena em foco'}</small><b title="${E(sc?.name)}">${E(sc?.name)}</b></div>
      <nav class="pcm-modos" aria-label="Modos">${modos.map(btn).join('')}<button type="button" class="pcm-modo ${cat ? 'on' : ''}" data-g="panel" data-id="best" aria-pressed="${cat}" title="Bestiário, itens, skills e armas">Catálogo</button></nav>
      <div class="pcm-herois" aria-label="Heróis da cena">${herois.map(c => `<button type="button" class="pcm-h ${c.hp > 0 ? '' : 'ko'}" data-g="panel" data-id="f_${c.id}" style="--c:${E(c.color)}" title="${E(c.name)} · Vida ${c.hp}/${c.hpMax} · abre a ficha"><span class="rt">${foto(c)}</span><span class="vd"><i style="width:${pct(c.hp, c.hpMax)}%"></i></span></button>`).join('')}</div>
      <div class="pcm-acoes"><button type="button" class="pcm-selo ${nReq ? 'tem' : ''}" data-g="rtab" data-id="pedidos" aria-label="Pedidos: ${nReq}" title="Pedidos dos jogadores">Pedidos<em class="pc-num">${nReq}</em></button>${regras}${tools}</div></header>`;
  };
  if (typeof gmLayout === 'function') { const L0 = gmLayout; g.gmLayout = gmLayout = function (body, center) { const h = L0(body, center); if (!on()) return h; return h.replace(/<header class="gtop">[\s\S]*?<\/header>/, m => topo(m, !!center.parts)).replace('<div class="gms ', '<div class="gms pcm '); }; }

  // ---------- HUD de combate do mestre ----------
  const ferramentas = () => {
    const b = (k, ic, l) => `<button type="button" class="${pop === k ? 'on' : ''}" data-pcm="${k}" aria-label="${l}" aria-expanded="${pop === k}" title="${l}"><span aria-hidden="true">${ic}</span><small>${l}</small></button>`;
    return `<div class="pcm-ferr" role="toolbar" aria-label="Ferramentas da batalha">${b('novo', '✚', 'Inimigo novo')}<button type="button" data-pcm="undo" aria-label="Desfazer" title="Desfazer a última ação do mestre"><span aria-hidden="true">↶</span><small>Desfazer</small></button>${b('clima', '☁', 'Clima')}<button type="button" data-pcm="cam" aria-label="Trocar a câmera" title="Trocar a vista (V)"><span aria-hidden="true">◎</span><small>Câmera</small></button>${b('fim', '✕', 'Encerrar')}</div>`;
  };
  const hud = ({ actorId, inB, cur, cm, parts }) => {
    const vivos = (S.battle.order || []).filter((id, i, a) => S.chars[id] && a.indexOf(id) === i).length, n = Math.max(0, vivos - 4);
    let h = PCHUD.html({ actorId: actorId || cur?.id, dim: false, inB, cur, cm, parts });
    h = h.replace('</ol>', `<li class="pcm-mais"><button type="button" data-pcm="ord" aria-expanded="${ordOpen}" title="Fila inteira: arraste para mudar a ordem">${n ? '+' + n : '⇅'}</button></li></ol>`);
    const fila = parts.pedidos();
    return h.replace(/<\/div>$/, `${fila ? `<div class="pcm-fila">${fila}</div>` : ''}${ferramentas()}<p class="pcm-dica">Botão direito num recorte abre o anel</p></div>`).replace('class="hudw pc-hud', 'class="hudw pc-hud pcm-hud');
  };

  // ---------- camada por cima do palco (fila inteira, anel, inimigo novo, clima, encerrar) ----------
  const ordemLista = () => { const L = timeline(8);
    return `<div class="pcm-ordem" role="dialog" aria-label="Ordem dos turnos"><header><b>Ordem</b><small>Arraste ou use as setas. Vale até a pessoa agir.</small><button type="button" data-pcm="ord" aria-label="Fechar">✕</button></header>
      <ol>${L.map((id, i) => { const c = S.chars[id];
        return `<li class="${i ? '' : 'agora'} ${c.enemy ? 'foe' : 'hero'} ${ordSel === id ? 'sel' : ''}" ${i ? `draggable="true" data-pcm-id="${id}"` : ''} data-i="${i}"><span class="n pc-num">${i ? i + 1 : 'agora'}</span><span class="rt">${foto(c)}</span><b>${E(c.name)}</b>
          ${i ? `<span class="mv"><button type="button" data-pcm="up" data-id="${id}" aria-label="Subir ${E(c.name)}" ${i <= 1 ? 'disabled' : ''}>↑</button><button type="button" data-pcm="dn" data-id="${id}" aria-label="Descer ${E(c.name)}" ${i >= L.length - 1 ? 'disabled' : ''}>↓</button></span>` : ''}<button type="button" class="anel" data-pcm="anel" data-id="${id}" aria-label="Ações de ${E(c.name)}">⋯</button></li>`; }).join('')}</ol></div>`; };
  const ACOES = [['m10', '−10', 'Tirar 10 de vida'], ['p10', '+10', 'Dar 10 de vida'], ['cond', 'Condição', 'Pôr ou tirar condição'], ['esc', 'Escudo', 'Escudo'], ['mover', 'Mover', 'Mudar a vez na fila'], ['rem', 'Remover', 'Remover'], ['ficha', 'Ficha', 'Abrir a ficha']];
  const anel = () => { const c = ring && S.chars[ring.id]; if (!c) return '';
    const r = PALCO3D.rectOf?.(c.id), x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height * .42 : innerHeight / 2, R = 132;
    const cx = Math.max(R + 70, Math.min(innerWidth - R - 70, x)), cy = Math.max(R + 70, Math.min(innerHeight - R - 120, y));
    const it = ACOES.map(([k, l, t], i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / ACOES.length;
      return `<button type="button" class="pcm-ac ${sub === k ? 'on' : ''} ${k === 'rem' ? 'perigo' : ''}" data-pcm="ac" data-k="${k}" style="left:${Math.round(R * Math.cos(a))}px;top:${Math.round(R * Math.sin(a))}px;--i:${i}" title="${t}">${l}</button>`; }).join('');
    const sh = c.shield || 0;
    const subs = sub === 'cond' ? `<div class="pcm-sub" aria-label="Condições">${chips(ST, (k, l) => `<button type="button" class="${c.st?.[k] ? 'on' : ''}" data-pcm="st" data-k="${k}" aria-pressed="${!!c.st?.[k]}">${E(Array.isArray(l) ? l[0] : l)}</button>`)}</div>`
      : sub === 'esc' ? `<div class="pcm-sub"><span>Escudo <b class="pc-num">${sh}</b></span><button type="button" data-pcm="sh" data-v="10">+10</button><button type="button" data-pcm="sh" data-v="25">+25</button><button type="button" data-pcm="sh" data-v="0" ${sh ? '' : 'disabled'}>Tirar</button></div>`
      : sub === 'rem' ? `<div class="pcm-sub"><span>Remover ${E(c.name)}?</span>${c.x != null ? '<button type="button" data-pcm="tira">Só tirar da cena</button>' : ''}<button type="button" class="perigo" data-pcm="del">Apagar de vez</button></div>` : '';
    return `<div class="pcm-anel ${performance.now() - (ring.t || 0) < 400 ? 'entra' : ''}" role="dialog" aria-label="Ações de ${E(c.name)}" style="left:${Math.round(cx)}px;top:${Math.round(cy)}px"><div class="miolo"><b>${E(c.name)}</b><span class="pc-num">${c.hp}/${c.hpMax}</span></div>${it}${subs}</div>`; };
  const popNovo = () => `<div class="pcm-pop pcm-novo" role="dialog" aria-label="Inimigo novo"><header><b>Inimigo novo</b><button type="button" data-pcm="novo" aria-label="Fechar">✕</button></header><input type="search" class="pcm-busca" placeholder="Buscar no bestiário" aria-label="Buscar no bestiário" value="${E(spawnQ)}"><div class="pcm-lista">${listaNovo()}</div></div>`;
  const listaNovo = () => { const q = spawnQ.trim().toLowerCase(), L = Object.entries(S.bestiary || {}).filter(([, b]) => !q || String(b.name).toLowerCase().includes(q)).sort((a, b) => String(a[1].name).localeCompare(b[1].name)).slice(0, 40);
    return L.map(([id, b]) => `<button type="button" data-pcm="spawn" data-id="${id}"><b>${E(b.name)}</b><small>${b.boss ? 'Chefe' : E(b.rank || b.cat || '')}</small></button>`).join('') || '<p class="vazio">Nada no bestiário com esse nome.</p>'; };
  const popClima = () => { const cur = S.battle.wx?.k ?? S.scenes[S.scene]?.wx ?? '';
    return `<div class="pcm-pop pcm-clima" role="dialog" aria-label="Clima"><header><b>Clima</b><button type="button" data-pcm="clima" aria-label="Fechar">✕</button></header>${[['', 'Normal'], ...Object.entries(RULES.CLIMA).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<button type="button" class="${cur === k ? 'on' : ''}" data-pcm="wx" data-k="${k}" aria-pressed="${cur === k}">${E(l)}</button>`).join('')}</div>`; };
  const popFim = () => `<div class="pcm-pop pcm-fim" role="dialog" aria-label="Encerrar a batalha"><b>Encerrar a batalha?</b><p>Todos saem do combate. Dá para desfazer.</p><div><button type="button" class="perigo" data-pcm="fimSim">Encerrar</button><button type="button" data-pcm="fim">Continuar lutando</button></div></div>`;
  let sobre = null, sobreH = '';
  const camada = () => {
    const ativo = on() && S?.battle?.active && gui.view === 'palco'; if (!ativo) fecha();
    const h = ativo ? (ordOpen ? ordemLista() : '') + anel() + (pop === 'novo' ? popNovo() : pop === 'clima' ? popClima() : pop === 'fim' ? popFim() : '') : '';
    if (h === sobreH) return; const foco = document.activeElement?.classList?.contains('pcm-busca');
    sobreH = h; if (!sobre) { sobre = document.createElement('div'); sobre.className = 'pc-sobre pcm-sobre'; document.body.append(sobre); } sobre.innerHTML = h;
    if (foco || pop === 'novo') sobre.querySelector('.pcm-busca')?.focus({ preventScroll: true });
  };
  g.PCM = { on, hud };
  if (typeof document === 'undefined') return;
  const r0 = render; render = function () { r0(); try { camada(); } catch (e) { console.error(e); } };

  // ---------- ações ----------
  const mexe = (id, to) => { to = Math.max(1, Math.min(7, to)); send({ t: 'ordMove', id, to }); };
  const posDe = id => timeline(8).indexOf(id);
  const acao = (k, c) => {
    if (k === 'm10' || k === 'p10') return send({ t: 'set', id: c.id, f: 'hp', v: Math.max(0, Math.min(c.hpMax, c.hp + (k === 'm10' ? -10 : 10))) });
    if (k === 'ficha') { const id = c.id; fecha(); gOpen('f_' + id); return render(); }
    if (k === 'mover') { const id = c.id; ring = null; sub = ''; ordOpen = true; ordSel = id; return render(); }
    sub = sub === k ? '' : k; render();
  };
  document.addEventListener('click', e => {
    if (!on()) return; const b = e.target.closest('[data-pcm]');
    if (!b) { if ((ring || pop) && !e.target.closest('.pcm-sobre,.pcm-ferr')) { ring = null; sub = ''; pop = ''; render(); } return; }
    const k = b.dataset.pcm, c = ring && S.chars[ring.id]; e.preventDefault();
    if (k === 'ord') { ordOpen = !ordOpen; ordSel = null; return render(); }
    if (k === 'up' || k === 'dn') { const p = posDe(b.dataset.id); if (p > 0) mexe(b.dataset.id, p + (k === 'up' ? -1 : 1)); ordSel = b.dataset.id; return; }
    if (k === 'anel') { ring = { id: b.dataset.id, t: performance.now() }; sub = ''; pop = ''; return render(); }
    if (k === 'ac' && c) return acao(b.dataset.k, c);
    if (k === 'st' && c) return send({ t: 'st', id: c.id, k: b.dataset.k });
    if (k === 'sh' && c) { const v = +b.dataset.v; return send({ t: 'set', id: c.id, f: 'shield', v: v ? Math.min(c.hpMax, (c.shield || 0) + v) : 0 }); }
    if (k === 'tira' && c) { send({ t: 'place', id: c.id }); ring = null; sub = ''; return render(); }
    if (k === 'del' && c) { send({ t: 'delChar', id: c.id }); ring = null; sub = ''; return render(); }
    if (k === 'novo' || k === 'clima' || k === 'fim') { pop = pop === k ? '' : k; ring = null; if (k === 'novo') spawnQ = ''; return render(); }
    if (k === 'spawn') return send({ t: 'bSpawn', id: b.dataset.id, n: 1 });
    if (k === 'wx') { send({ t: 'weather', k: b.dataset.k }); pop = ''; return render(); }
    if (k === 'fimSim') { send({ t: 'battle', on: false }); pop = ''; return render(); }
    if (k === 'undo') return send({ t: 'undo' });
    if (k === 'cam') return dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));
  }, true);
  // busca do bestiário: só troca a lista, para o campo não perder o foco
  document.addEventListener('input', e => { if (!e.target.classList?.contains('pcm-busca')) return; spawnQ = e.target.value; const L = sobre?.querySelector('.pcm-lista'); if (L) L.innerHTML = listaNovo(); });
  // anel: botão direito num recorte (sem ter arrastado a câmera), num herói do canto ou na barra do chefe
  let down = null;
  addEventListener('pointerdown', e => { down = e.button === 2 ? { x: e.clientX, y: e.clientY } : null; }, true);
  document.addEventListener('contextmenu', e => {
    if (!on() || !S?.battle?.active) return; const t = e.target.closest?.('.p3d .bb[data-tgt],.pc-heroi[data-tgt],.pc-chefe[data-tgt]'); if (!t) return;
    const d0 = down; down = null; if (d0 && Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 8) return; // foi giro de câmera
    e.preventDefault(); e.stopImmediatePropagation(); ring = { id: t.dataset.tgt, t: performance.now() }; sub = ''; pop = ''; render();
  }, true);
  // fila inteira: arrastar e soltar (antes ou depois da linha, pela metade de cima ou de baixo)
  let arr = null;
  document.addEventListener('dragstart', e => { const li = e.target.closest?.('.pcm-ordem li[data-pcm-id]'); if (!li) return; arr = li.dataset.pcmId; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', arr); } catch {} li.classList.add('arrastando'); });
  document.addEventListener('dragover', e => { const li = arr && e.target.closest?.('.pcm-ordem li'); if (!li) return; e.preventDefault(); const r = li.getBoundingClientRect(), baixo = e.clientY > r.top + r.height / 2;
    sobre.querySelectorAll('.pcm-ordem li').forEach(x => x.classList.remove('antes', 'depois')); li.classList.add(baixo ? 'depois' : 'antes'); });
  document.addEventListener('drop', e => { const li = arr && e.target.closest?.('.pcm-ordem li'); if (!li) return; e.preventDefault();
    const r = li.getBoundingClientRect(), i = +li.dataset.i + (e.clientY > r.top + r.height / 2 ? 1 : 0), L = timeline(8), to = L.slice(0, i).filter(x => x !== arr).length;
    mexe(arr, to); ordSel = arr; arr = null; });
  document.addEventListener('dragend', () => { arr = null; sobre?.querySelectorAll('.pcm-ordem li').forEach(x => x.classList.remove('antes', 'depois', 'arrastando')); });
  // Esc fecha o que estiver aberto (antes do Esc do leque)
  addEventListener('keydown', e => { if (!on() || e.key !== 'Escape' || !(ordOpen || ring || pop)) return; if (e.target.matches?.('.pcm-busca') && spawnQ) return; e.preventDefault(); e.stopImmediatePropagation(); fecha(); render(); }, true);
})(globalThis);

// ===== páginas fora de combate (jogador; o mestre abre a grade em tela cheia pela ficha) =====
const PAGES = { mesa: 'Mesa', pers: 'Ficha', hab: 'Habilidades', itens: 'Itens', hist: 'Diário' };
const PATRON = { fis: 'Marcial', kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', radiacao: 'Hiruko' };
let pg = 'mesa', selCh = null, chatOpen = innerWidth >= 1000, gridFull = null, wasBattle = false;
const near = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy)) <= 1;
const figCard = (c, w) => `<div class="unit hero cur static" style="--c:${esc(c.color)};--w:${w}"><div class="figw"><div class="fig">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<span class="glyph">${esc(c.name.slice(0, 1).toUpperCase())}</span>`}</div></div></div>`;

// grade de habilidades como constelação: círculo = ativa, losango = passiva; brilho = aprendida, tracejado = disponível
const lab2 = n => { const w = n.split(' '), a = []; let l = ''; for (const x of w) { if (l && (l + ' ' + x).length > 14) { a.push(l); l = x; } else l = l ? l + ' ' + x : x; } a.push(l); return a.slice(0, 2).map((t, i) => `<tspan x="0" dy="${i ? 11 : 0}">${esc(i === 1 && a.length > 2 ? t + '…' : t)}</tspan>`).join(''); };
let skOnly = false, gvFor = null; // personagem para o qual a grade já foi enquadrada
const gv = { z: 1, x: 0, y: 0 }; let skd = null, skMoved = false;
function skillPage(c) {
  const N = Object.entries(S.skills), own = new Set(c.skills), ownL = c.skills.map(k => S.skills[k]).filter(Boolean), U = 86, G = Math.max(17, ...N.map(([, s]) => Math.max(s.gx, s.gy) + 1)), mid = (G - 1) / 2, P = s => [s.gx * U + U / 2, s.gy * U + U / 2];
  const rqMiss = s => c.enemy || !s.rq ? [] : Object.entries(s.rq).filter(([a, v]) => c.attrs[a] + (eq(c, 'acess')?.attr === a ? eq(c, 'acess').power : 0) < v);
  const mineV = s => c.enemy || s.el === 'fis' || (c.vinc || []).includes(s.el), exTaken = s => s.ex && ownL.some(o => o.ex === s.ex && o !== s);
  const avail = s => mineV(s) && !exTaken(s) && (!ownL.length || ownL.some(o => near(o, s))), sel = selNode[c.id] && S.skills[selNode[c.id]] ? selNode[c.id] : null, ss = S.skills[sel];
  let lines = '';
  const cells = new Map(); N.forEach(([, s], i) => { const k = s.gx + ',' + s.gy; if (!cells.has(k)) cells.set(k, []); cells.get(k).push(i); });
  for (let p = 0; p < N.length; p++) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [1, -1]]) for (const q of cells.get((N[p][1].gx + dx) + ',' + (N[p][1].gy + dy)) || []) { if (!dx && !dy && q <= p) continue; const i = Math.min(p, q), j = Math.max(p, q), a = N[i][1], b = N[j][1];
    if (a.el === b.el || a.el === 'fis' || b.el === 'fis') { const [x1, y1] = P(a), [x2, y2] = P(b), on = own.has(N[i][0]) && own.has(N[j][0]); lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${on ? 'on' : ''} ${mineV(a) && mineV(b) ? '' : 'out'}" style="--e:${ELC[a.el === 'fis' ? b.el : a.el]}"/>`; } }
  const cen = {}; for (const [, s] of N) { const o = cen[s.el] ||= [0, 0, 0]; o[0] += s.gx; o[1] += s.gy; o[2]++; }
  const halos = Object.entries(cen).filter(([el]) => el !== 'fis').map(([el, [x, y, n]]) => { const dx = x / n - mid, dy = y / n - mid, d = Math.hypot(dx, dy) || 1, px = (mid + dx / d * G * .46) * U + U / 2, py = (mid + dy / d * G * .46) * U + U / 2, mineS = (c.vinc || []).includes(el);
    return `<g class="${mineS ? 'vmine' : 'vout'}"><text class="halo" x="${px}" y="${py}" style="--e:${ELC[el]};font-size:${G * 12}px">${KANJI[el]}</text><text class="hname" x="${px}" y="${py + G * 4}" style="--e:${ELC[el]};font-size:${G * 1.9}px">${PATRON[el]}${mineS ? ' · seu Vínculo' : ''}</text></g>`; }).join('');
  const nodes = N.map(([id, s]) => { const [x, y] = P(s), st = own.has(id) ? 'own' : !mineV(s) ? 'out' : avail(s) ? 'av' : 'lock', pas = s.kind === 'passive', mark = s.back ? '禁' : s.limit ? '極' : pas ? '+' : KANJI[s.el];
    return `<g class="nd ${st} ${id === sel ? 'sel' : ''} ${c.xp >= s.xp ? '' : 'poor'} ${s.rq ? (rqMiss(s).length ? 'rqno' : 'rqok') : ''}" data-node="${id}" data-id="${c.id}" transform="translate(${x} ${y})" style="--e:${ELC[s.el]}"><title>${esc(s.name)} · ${s.xp} XP</title>${pas ? '<rect x="-12" y="-12" width="24" height="24" transform="rotate(45)"/>' : `<circle r="${s.limit || s.back ? 19 : 15}"/>`}<text class="mk" y="6">${mark}</text>${s.rq ? `<text class="rq" x="17" y="-13">${Object.entries(s.rq).map(([a, v]) => a + v).join(' ')}</text>` : ''}<text class="lb" y="30">${lab2(s.name)}</text></g>`; }).join('');
  const tag = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
  const why = !ss || own.has(sel) ? '' : !mineV(ss) ? `Exige Vínculo com ${PATRON[ss.el]}.` : exTaken(ss) ? 'Trancada: você escolheu o outro caminho.' : !avail(ss) ? 'Precisa de um nó vizinho já aprendido.' : rqMiss(ss).length ? rqMiss(ss).map(([a, v]) => `Requer ${a} ${v} (você tem ${c.attrs[a]}).`).join(' ') : c.xp < ss.xp ? `Faltam ${ss.xp - c.xp} XP.` : '';
  const exOther = ss?.ex ? N.filter(([k, s]) => s.ex === ss.ex && k !== sel).map(([, s]) => s.name).join(', ') : '';
  const detail = ss ? `<div class="ndcard" style="--e:${ELC[ss.el]}"><small>${PATRON[ss.el]} · ${KIND[ss.kind]}${ss.limit ? ' · Limite' : ''}${ss.back ? ' · Proibida' : ''}</small><h2>${esc(ss.name)}</h2>${ss.d ? `<p class="flav">${esc(ss.d)}</p>` : ''}
      <div class="tags">${ss.kind === 'passive' ? tag('Efeito', ss.pas === 'res' ? 'Resistência a ' + EL[ss.el] : '+' + ss.power + ' ' + PASL[ss.pas])
        : tag('Poder', ss.power) + tag('Atributo', ss.attr) + tag('Custo', ss.limit ? 'Limite 100%' : ss.cost + ' ' + RES[ss.res]) + tag('Alvo', ss.area ? 'Área' : 'Único') + ((ss.ct || 100) !== 100 ? tag('Tempo', ss.ct + '%') : '') + (ss.st ? tag('Causa', ST[ss.st]) : '') + (ss.req ? tag('Exige', WT[ss.req]) : '') + (ss.back ? tag('Sequela', ST[ss.back]) : '')}${ss.rq ? Object.entries(ss.rq).map(([a, v]) => tag('Requisito', a + ' ' + v)).join('') : ''}</div>
      ${exOther ? `<small class="exw">Escolha excludente: aprender esta tranca ${esc(exOther)}.</small>` : ''}
      ${gm && c.enemy ? `<button class="learn" data-a="skTog" data-id="${c.id}" data-skill="${sel}">${own.has(sel) ? 'Remover do inimigo' : 'Dar ao inimigo'}</button>` : (own.has(sel) ? '<div class="learned">Aprendida</div>' : `<button class="learn" data-a="learn" data-id="${c.id}" data-skill="${sel}" ${mine(c) && !why ? '' : 'disabled'}>${askL('learn', 'Aprender', 'Pedir ao mestre')} · ${ss.xp} XP</button>${why ? `<small class="why">${why}</small>` : ''}`)
        + (gm ? `<button class="ghost" data-a="skTog" data-id="${c.id}" data-skill="${sel}" title="Sem gastar XP nem conferir requisitos">${own.has(sel) ? 'Tirar a skill (mestre)' : 'Dar sem custo (mestre)'}</button>` : '')}</div>`
    : '<div class="ndcard empty"><h2>Escolha um nó</h2><small>Clique em um nó para ver o que ele faz. Você aprende o tronco Marcial e as skills do seu Vínculo, sempre a partir de um nó vizinho de um que já tem.</small></div>';
  const mineL = c.skills.filter(k => S.skills[k]).map(k => `<li style="--e:${ELC[S.skills[k].el]}" data-node="${k}" data-id="${c.id}"><b>${esc(S.skills[k].name)}</b><small>${esc(desc(S.skills[k]))}</small></li>`).join('');
  const canNow = N.filter(([id, s]) => !own.has(id) && avail(s) && !rqMiss(s).length && c.xp >= s.xp).length, sq = (bf.skq || '').trim().toLowerCase();
  const found = gm && sq ? N.filter(([, s]) => s.name.toLowerCase().includes(sq)).slice(0, 10).map(([id, s]) => `<span class="${own.has(id) ? 'weak' : ''}" data-node="${id}" data-id="${c.id}" style="border-color:${ELC[s.el]}">${esc(s.name)}</span>`).join('') || '<small>Nenhuma skill com esse nome.</small>' : '';
  return `<section class="skp"><div class="skmap ${gv.z < 1.7 ? 'far' : 'near'} ${skOnly ? 'only' : ''}" data-cid="${c.id}"><svg viewBox="0 0 ${G * U} ${G * U}" role="group" aria-label="Grade de habilidades" style="transform:translate(${gv.x}px,${gv.y}px) scale(${gv.z})">${halos}<g class="ln">${lines}</g>${nodes}</svg>
      <div class="skzoom"><button data-a="skZoom" data-v="1.5" aria-label="Aproximar">+</button><button data-a="skZoom" data-v="0.667" aria-label="Afastar">−</button></div>
      <div class="skhint"><button data-a="skReset">Minha árvore</button><button data-a="skAll">Ver tudo</button><button class="tog ${skOnly ? 'on' : ''}" data-a="skOnly" aria-pressed="${skOnly}">Só o que posso aprender</button><small>Arraste para mover · roda do mouse, pinça ou + − para o zoom</small></div></div>
    <aside class="skside"><div class="xp"><small>XP disponível de ${esc(c.name)}<br>${c.enemy ? '' : canNow ? `<i class="can">${canNow} ${canNow > 1 ? 'habilidades' : 'habilidade'} ao seu alcance</i>` : 'nada ao alcance com esse XP'}</small><b>${edv(c, 'xp', c.xp)}</b></div>${detail}
      ${gm ? `<div class="card skfind"><h3>Dar skill <small>só o mestre</small></h3><input class="bq" data-bf="skq" placeholder="Buscar skill pelo nome…" aria-label="Buscar skill" value="${esc(bf.skq || '')}"><div class="row chips">${found}</div></div>` : ''}
      <div class="legend"><span><i class="lc"></i>Ativa</span><span><i class="lp"></i>Passiva</span><span><i class="lo"></i>Aprendida</span><span><i class="la"></i>Dá para aprender</span><span><i class="lx"></i>Outro Vínculo</span></div>
      <h3>Aprendidas (${c.skills.length})</h3><ul class="mine">${mineL || '<li class="none"><small>Nenhuma ainda.</small></li>'}</ul></aside></section>`;
}

function persPage(c) {
  const eqn = slot => eq(c, slot) ? `<b>${esc(eq(c, slot).name)}</b><small>${esc(idesc(eq(c, slot)))}</small>` : '<b class="none">Vazio</b><small>equipe na página Itens</small>';
  const res = k => `<div class="resrow ${k}"><em>${L[k]}</em>${bar(k, c, true)}<span class="rn">${edv(c, k, c[k])}<small>/${k === 'limit' ? 100 : c[k + 'Max']}</small></span></div>`;
  const cts = Object.values(S.contracts).filter(ct => !ct.done).map(ct => `<li><b>${esc(ct.target)}</b><small>${ct.gold} ouro · ${ct.xp} XP</small></li>`).join('');
  const sts = stChips(c);
  const tile = a => { const v = at(c, a), base = v !== c.attrs[a] ? `<small>base ${c.attrs[a]}</small>` : '';
    return gm ? `<div class="tile gmt ${c.marks[a] ? 'mk' : ''}">${edv(c, 'attrs.' + a, c.attrs[a], 'tv')}<button data-a="roll" data-id="${c.id}" data-attr="${a}" title="Rolar ${ATN[a]}${v !== c.attrs[a] ? ` (vale ${v} com equipamento e ferimentos)` : ''}">${a}</button></div>`
      : `<button class="tile ${c.marks[a] ? 'mk' : ''}" data-a="rollAsk" data-id="${c.id}" data-attr="${a}" aria-label="Rolar ${ATN[a]}, ${v}%"><b>${v}</b><span>${a}</span><em>${ATN[a]}</em>${base}</button>`; };
  return `<section class="pp" style="--c:${esc(c.color)}"><div class="pp-hero">${figCard(c, '170px')}
      <div class="pp-id"><input class="pname" aria-label="Nome" data-id="${c.id}" data-f="name" value="${esc(c.name)}"><div class="row pills">${gm ? Object.keys(PATRON).filter(e => e !== 'fis').map(e => `<span class="pill vp ${(c.vinc || []).includes(e) ? '' : 'off'}" style="--e:${ELC[e]};${(c.vinc || []).includes(e) ? '' : 'opacity:.4'}" role="button" tabindex="0" data-a="vinc" data-id="${c.id}" data-el="${e}" title="Clique para ${(c.vinc || []).includes(e) ? 'remover' : 'conceder'} o Vínculo">Vínculo <b>${PATRON[e]}</b></span>`).join('') : (c.vinc || []).map(e => `<span class="pill vp" style="--e:${ELC[e]}">Vínculo <b>${PATRON[e]}</b></span>`).join('')}<span class="pill">XP <b>${edv(c, 'xp', c.xp)}</b></span><span class="pill">Ouro <b>${edv(c, 'gold', c.gold)}</b></span>
          <input type="color" aria-label="Cor do personagem" data-id="${c.id}" data-f="color" value="${esc(c.color)}"><label class="up">Trocar retrato<input type="file" accept="image/*" data-up="img" data-id="${c.id}"></label></div>
        <div class="resg">${res('hp')}${res('aura')}${res('san')}${res('limit')}</div><div class="sts big">${sts || '<small>Sem condições ativas.</small>'}</div></div></div>
    <div class="pp-grid"><div class="card wide"><h3>Atributos <small>${gm ? 'clique no número para editar, na sigla para rolar' : `toque para rolar o d100${gated('roll') ? ' (o mestre aprova)' : ''}`}</small></h3><div class="tiles">${A.map(tile).join('')}</div>
        <p class="hint">${gm ? `<label>Modificador da rolagem <input type="number" class="mod" data-mid="${c.id}" value="${mods[c.id] || 0}"></label> ` : ''}<span><i class="mkd"></i> marca os atributos usados com sucesso: eles podem evoluir no descanso longo.</span></p></div>
      <div class="card"><h3>Ferimentos</h3>${bodyFig(c)}</div>
      <div class="card"><h3>Equipamento</h3><div class="slots"><div><em>Arma</em>${eqn('arma')}</div><div><em>Armadura</em>${eqn('armadura')}</div><div><em>Acessório</em>${eqn('acess')}</div></div>
        <h3>Afinidades</h3><div class="row chips">${[...c.weak.map(k => `<span class="weak">Fraco: ${EL[k]}</span>`), ...c.resist.map(k => `<span class="res">Resiste: ${EL[k]}</span>`), eq(c, 'acess')?.el ? `<span class="res">Resiste: ${EL[eq(c, 'acess').el]}</span>` : ''].join('') || '<small>Nenhuma fraqueza ou resistência.</small>'}</div></div>
      ${S.camp.open ? `<div class="card"><h3>Acampamento <small>escolha o que fazer nesta noite${gated('camp') ? ' (o mestre aprova)' : ''}</small></h3><div class="row chips big">${chips(CAMPL, (k, l) => `<span class="${S.camp.acts[c.id] === k ? 'weak' : ''}" data-a="campAct" data-id="${c.id}" data-k="${k}">${l}</span>`)}</div></div>` : ''}
      <div class="card"><h3>Contratos de caça</h3><ul class="plain">${cts || '<li><small>Nenhum contrato aberto.</small></li>'}</ul></div></div></section>`;
}

let itab = 'inv';
function itemsPage(c) {
  const sh = shop(), card = (k, i, foot, q) => `<div class="icard t-${i.type}" style="--e:${ELC[i.el] || 'var(--line)'}"><em>${IT[i.type]}</em><b>${esc(i.name)}${q > 1 ? ` <i>×${q}</i>` : ''}</b><small>${esc(idesc(i))}</small><div class="row">${foot}</div></div>`;
  const btn = (a, l, k, x = '') => `<button data-a="${a}" data-id="${c.id}" data-item="${k}" ${x}>${l}</button>`;
  const slot = (s, l) => { const i = eq(c, s); return `<div class="slot ${i ? 'on' : ''}"><em>${l}</em>${i ? `<b>${esc(i.name)}</b><small>${esc(idesc(i))}</small>${btn('equip', 'Tirar', c.equip[s], 'class="ghost"')}` : '<b class="none">Vazio</b><small>equipe um item do inventário</small>'}</div>`; };
  const invL = Object.entries(c.inv).filter(([k]) => S.items[k]).sort((a, b) => ITO.indexOf(S.items[a[0]].type) - ITO.indexOf(S.items[b[0]].type));
  const inv = invL.map(([k, q]) => { const i = S.items[k], on = c.equip[i.type] === k;
    return card(k, i, (i.type === 'cons' ? btn('use', 'Usar', k, i.eff === 'bomb' ? 'disabled title="Só em batalha"' : 'class="own"') : i.type === 'mat' ? '' : btn('equip', on ? 'Equipado' : 'Equipar', k, on ? 'class="own"' : i.reqFor && c.attrs.FOR < i.reqFor ? `disabled title="Exige FOR ${i.reqFor}"` : '')) + (sh.open ? btn('sell', `Vender · ${Math.floor(i.price / 2)}`, k) : '') + btn('drop', 'Descartar', k, 'class="ghost"'), q); }).join('');
  const forge = Object.entries(S.items).filter(([, i]) => i.el && ['arma', 'acess'].includes(i.type)).map(([k, i]) => { const ess = Object.keys(S.items).find(e => S.items[e].type === 'mat' && S.items[e].el === i.el), have = c.inv[ess] || 0, need = i.type === 'arma' ? 3 : 5, cost = Math.round(i.price / 2);
    return have ? card(k, i, `<small>${have}/${need} essências · ${cost} ouro</small>` + btn('forge', 'Forjar', k, have < need || c.gold < cost ? 'disabled' : '')) : ''; }).join('');
  const stock = sh.open ? sh.stock.filter(k => S.items[k]) : [], T = { inv: `Inventário <i>${invL.reduce((n, [, q]) => n + q, 0)}</i>`, loja: `Loja${sh.open ? ` <i>${stock.length}</i>` : ''}`, forja: 'Forja' }, tab = T[itab] ? itab : 'inv';
  const gq = (bf.giveq || '').trim().toLowerCase(), giveL = Object.entries(S.items).filter(([, i]) => !gq || i.name.toLowerCase().includes(gq)).sort((a, b) => a[1].name.localeCompare(b[1].name)).slice(0, gq ? 30 : 12);
  const body = tab === 'loja' ? (sh.open ? `<div class="icards">${stock.map(k => card(k, S.items[k], btn('buy', `Comprar · ${S.items[k].price}`, k, c.gold < S.items[k].price ? 'disabled title="Ouro insuficiente"' : 'class="own"'))).join('') || '<p class="none">Nada à venda.</p>'}</div>` : '<p class="none">Não há loja aberta nesta cena.</p>')
    : tab === 'forja' ? `<p class="hint">3 essências do elemento para uma arma, 5 para uma relíquia, mais metade do preço em ouro.</p><div class="icards">${forge || '<p class="none">Você ainda não tem essências para forjar.</p>'}</div>`
    : `<div class="icards">${inv || '<p class="none">Inventário vazio.</p>'}</div>`;
  return `<section class="ip"><div class="ip-top"><div class="gold"><small>Ouro</small><b>${edv(c, 'gold', c.gold)}</b></div>${slot('arma', 'Arma')}${slot('armadura', 'Armadura')}${slot('acess', 'Acessório')}</div>
    ${gated('item') ? '<p class="gate">Usar, equipar, comprar, vender e descartar pedem a aprovação do mestre.</p>' : ''}
    <div class="seg" role="tablist">${chips(T, (k, l) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-a="itab" data-k="${k}">${l}</button>`)}</div>${body}
    ${gm ? `<h3>Entregar item <small>só o mestre</small></h3><div class="row"><input class="bq" data-bf="giveq" placeholder="Buscar item pelo nome…" aria-label="Buscar item para entregar" value="${esc(bf.giveq || '')}"></div><div class="row chips">${giveL.map(([k, i]) => `<span data-a="give" data-id="${c.id}" data-item="${k}">+ ${esc(i.name)}</span>`).join('') || '<small>Nenhum item com esse nome.</small>'}${!gq && Object.keys(S.items).length > 12 ? '<small>Digite para achar os outros.</small>' : ''}</div>` : ''}</section>`;
}
const ITO = ['arma', 'armadura', 'acess', 'cons', 'mat'];

// tela do jogador em batalha: 1) alvo, 2) ação, 3) pedir ao mestre
let pick = { k: 'atk', id: 'atk' }, aimOpen = false;
const blockWhy = (c, s) => c.st.silence ? 'Silenciado' : c.st.fury ? 'Em fúria: só ataca' : s.limit && c.limit < 100 ? 'Limite incompleto' : c[s.res] < s.cost ? `Falta ${RES[s.res]}` : s.req && s.req !== wtype(c) ? `Exige ${WT[s.req]}` : s.reqFor && c.attrs.FOR < s.reqFor ? `Exige FOR ${s.reqFor}` : '';
function command(c, cur) {
  const my = cur === c, inB = Object.values(S.chars).filter(o => o.id in S.battle.ticks && !o.dead).sort((x, y) => y.enemy - x.enemy);
  if (my) { const t0 = inB.find(o => o.id === tgt); if (!t0 || (t0.enemy && t0.hp <= 0)) { const f = inB.find(o => o.enemy !== c.enemy && o.hp > 0); if (f) { tgt = f.id; aim = null; } } } // na sua vez, já vem mirado no primeiro inimigo de pé
  const t = inB.find(o => o.id === tgt), [rqId, rq] = myReq() || [], wait = rq && rq.ch === c.id;
  const sks = [...(eq(c, 'arma')?.grant ? ['wpn'] : []), ...c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive')], cons = Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons');
  if ((pick.k === 'sk' && !sks.includes(pick.id)) || (pick.k === 'it' && !(c.inv[pick.id] > 0))) pick = { k: 'atk', id: 'atk' };
  const tab = sub === 'sk' || sub === 'it' ? sub : 'atk', s = pick.k === 'sk' ? skOf(c, pick.id) : null, it = pick.k === 'it' ? S.items[pick.id] : null, wp = eq(c, 'arma');
  const label = it ? it.name : s ? s.name : 'Ataque', canAim = !it && !(s && (s.area || s.kind === 'heal')) && t;
  const why = !my ? 'Aguarde a sua vez' : !t ? 'Escolha um alvo' : s && blocked(c, s) ? blockWhy(c, s) : '';
  const tg = o => `<button class="tg ${o.enemy ? 'foe' : 'ally'} ${o.id === tgt ? 'on' : ''} ${o.hp > 0 ? '' : 'ko'}" data-tgt="${o.id}" style="--c:${esc(o.enemy ? '#e4002b' : o.color)}" aria-pressed="${o.id === tgt}"><b>${esc(o.name)}</b>${bar('hp', o, true)}<small>${o.hp > 0 ? (o.enemy ? Math.round(100 * o.hp / (o.hpMax || 1)) + '%' : `${o.hp}/${o.hpMax}`) : 'caído'}</small></button>`;
  const opt = (k, id, name, meta, d, off) => `<button class="opt ${pick.k === k && pick.id === id ? 'on' : ''}" data-a="pick" data-k="${k}" data-v="${id}" ${off ? 'disabled' : ''} aria-pressed="${pick.k === k && pick.id === id}"><b>${esc(name)}</b><i>${meta}</i><small>${esc(off || d)}</small></button>`;
  const list = tab === 'sk' ? sks.map(k => { const x = skOf(c, k); return opt('sk', k, x.name, x.limit ? 'Limite' : `${x.cost} ${RES[x.res]}`, desc(x), blocked(c, x) ? blockWhy(c, x) : ''); }).join('') || '<p class="none">Nenhuma skill ativa ainda. Aprenda na página Habilidades.</p>'
    : tab === 'it' ? cons.map(([k, q]) => opt('it', k, S.items[k].name, '×' + q, idesc(S.items[k]))).join('') || '<p class="none">Nenhum consumível no inventário.</p>'
    : opt('atk', 'atk', 'Ataque', 'sem custo', `${wp ? wp.name : 'Punhos'} · poder ${wp?.power ?? c.arma} · ${wp?.wt === 'fogo' ? 'DES' : 'FOR'}${wp?.pierce ? ' · perfura ' + Math.round(wp.pierce * 100) + '%' : ''}`);
  const tl = timeline(6).slice(1).map(id => `<i class="${S.chars[id].enemy ? 'foe' : ''}">${esc(S.chars[id].name)}</i>`).join('');
  return `<section class="cmd ${my ? 'mine' : ''}" style="--c:${esc(c.color)}"><div class="cmd-h"><div class="turn ${my ? 'me' : ''}">${my ? 'Seu turno' : 'Turno de ' + esc(cur?.name || '—')}</div><div class="nextup"><small>Depois:</small>${tl}</div></div>
    <div class="cmd-g"><div class="cmd-me"><h2>${esc(c.name)}</h2>${['hp', 'aura', 'san', 'limit'].map(k => `<div class="resrow ${k}"><em>${L[k]}</em>${bar(k, c, true)}<span class="rn">${c[k]}<small>/${k === 'limit' ? 100 : c[k + 'Max']}</small></span></div>`).join('')}
        <div class="sts">${c.hp > 0 ? stChips(c) || '<small>Sem condições.</small>' : `<i class="dead">${c.dead ? 'Morto' : 'Caído' + (c.dying ? ' · ' + c.dying : '')}</i>`}</div></div>
      <div class="cmd-step"><h4><i>1</i>Alvo</h4><div class="tgs">${inB.map(tg).join('')}</div></div>
      <div class="cmd-step"><h4><i>2</i>Ação</h4><div class="seg" role="tablist">${[['atk', 'Atacar'], ['sk', `Skills <i>${sks.length}</i>`], ['it', `Itens <i>${cons.length}</i>`]].map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-sub="${k}">${l}</button>`).join('')}</div><div class="alist">${list}</div>
        ${canAim ? `<button class="ghost aimb ${aim ? 'on' : ''}" data-a="aimT" aria-expanded="${aimOpen}">${aim ? `Mira: ${PL[aim]} (−${AIMP[aim]}%)` : 'Mirar numa parte do corpo'}</button>${aimOpen ? aimBox() : ''}` : ''}</div></div>
    <div class="cmd-go ${wait ? 'wait' : ''}"><div class="sum"><small>${wait ? 'Aguardando o mestre' : 'Sua ação'}</small><b>${wait ? esc(rq.text) : `${esc(label)} <span>→</span> ${t ? esc(t.name) : '<u>sem alvo</u>'}${canAim && aim ? ` · ${PL[aim]}` : ''}`}</b></div>
      ${wait ? `<button data-a="reqNo" data-id="${rqId}">Cancelar pedido</button>` : `<button class="ghost" data-a="next" ${my ? '' : 'disabled'} title="Passa a vez gastando metade do tempo">Passar</button><button class="go" data-a="go" data-id="${c.id}" ${why ? 'disabled' : ''}>${why || askL('act', 'Agir')}</button>`}</div></section>`;
}
// conversa e histórico: rolagens mostram o dado; mensagens privadas ficam marcadas
const logHtml = () => `${role === 'table' ? '' : '<div class="chatin"><input class="chat" data-chat="1" placeholder="Mensagem · /r 2d6+1 · /w nome texto" aria-label="Mensagem"><button data-a="chatSend">Enviar</button></div>'}<div class="log" aria-live="polite">${S.log.slice().reverse().map(l => `<p class="${l.kind} ${l.to ? 'priv' : ''}">${l.d ? `<i class="d">${l.d}</i>` : ''}<b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('') || '<p class="none">Nada aconteceu ainda. As rolagens e mensagens aparecem aqui.</p>'}</div>`;
let chatSeen = 0, lastPg = null, meOpen = false;

// exploração: rolagem rápida de atributo e o estado do grupo, logo abaixo do mapa
const mesaTools = c => `<section class="card qroll" style="--c:${esc(c.color)}"><h3>Rolar atributo <small>${esc(c.name)}${gated('roll') ? ' · o mestre aprova' : ''}</small></h3><div class="qr">${A.map(a => `<button data-a="rollAsk" data-id="${c.id}" data-attr="${a}" aria-label="Rolar ${ATN[a]}, ${at(c, a)}%"><b>${at(c, a)}</b><span>${a}</span></button>`).join('')}</div></section>
  <section class="card"><h3>Grupo</h3><div class="pgroup">${Object.values(S.chars).filter(x => !x.enemy && !x.dead).map(x => `<div style="--c:${esc(x.color)}"><b>${esc(x.name)}</b><small>${x.hp > 0 ? stList(x) || 'bem' : 'caído'}</small>${bar('hp', x)}${bar('aura', x)}${bar('san', x)}</div>`).join('')}</div></section>`;

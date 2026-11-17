// ===== páginas fora de combate (jogador; o mestre abre a grade em tela cheia pela ficha) =====
const PAGES = { mesa: 'Mesa', pers: 'Ficha', hab: 'Skills', ofi: 'Ofícios', itens: 'Itens', hist: 'Diário' };
const PATRON = { fis: 'Marcial', kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', hiruko: 'Hiruko', aura: 'Aura', oculto: 'Ocultismo' };
let pg = 'mesa', selCh = null, chatOpen = innerWidth >= 1000, gridFull = null, wasBattle = false;
const figCard = (c, w) => `<div class="unit hero cur static" style="--c:${esc(c.color)};--w:${w}"><div class="figw"><div class="fig">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<span class="glyph">${esc(c.name.slice(0, 1).toUpperCase())}</span>`}</div></div></div>`;

// grade de habilidades como constelação: círculo = ativa, losango = passiva; brilho = aprendida, tracejado = disponível
let skOnly = false; // só o que posso aprender
// plano e builds salvas ficam só neste navegador (por nome do nó, para sobreviverem a mudanças na grade)
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
// aba da gaveta e gaveta aberta; skMount = o que a mandala desenha na próxima renderização; skSeen = skills já vistas por personagem (para acender as novas)
let skTab = lsGet('vj.skTab', 'no'), skDrawer = true, skMount = null; const skSeen = {};
const slotted = s => s && s.kind === 'passive' && ['mod', 'trig', 'vow', 'amp'].includes(s.pas);
const FUNC = { dmg: ['Dano', s => ['dmg', 'mental'].includes(s.kind)], ctrl: ['Controle', s => s.kind !== 'passive' && (RULES.CTRL.includes(s.st) || (s.fx || []).some(f => (f.t === 'st' && RULES.CTRL.includes(f.k)) || f.t === 'push' || f.t === 'seal'))],
  supp: ['Suporte', s => s.kind === 'heal' || (s.kind === 'util' && !(s.fx || []).some(f => f.t === 'shield' || f.t === 'guard'))], tank: ['Defesa', s => (s.fx || []).some(f => ['shield', 'guard', 'cleanse'].includes(f.t) || (f.t === 'st' && ['taunt', 'defUp', 'reflect', 'counter', 'evade'].includes(f.k))) || s.mod?.def > 0], pas: ['Passiva', s => s.kind === 'passive'], form: ['Forma', s => s.kind === 'form'] };
let skAdj = null, skAdjS = null; // ligações da árvore em índices, para achar o caminho mais barato
function skPath(N, own, mineV, xpOf, target) {
  if (!own.size) return null;
  if (skAdjS !== S.skills || skAdj.length !== N.length) { const ix = new Map(N.map(([id], i) => [id, i])), loose = N.map(([, a]) => !Number.isFinite(a.wx));
    skAdj = N.map(([id, a], i) => [...new Set([...(a.ln || []).map(j => ix.get(j)).filter(j => j != null), ...N.flatMap(([jd, b], j) => j !== i && (loose[i] || loose[j]) && RULES.linked(a, b, id, jd) && (a.el === b.el || a.el === 'fis' || b.el === 'fis') ? [j] : [])])]);
    skAdjS = S.skills; }
  const idx = new Map(N.map(([id], i) => [id, i])), dist = N.map(() => Infinity), prev = N.map(() => -1), q = [];
  N.forEach(([id], i) => { if (own.has(id)) { dist[i] = 0; q.push(i); } });
  while (q.length) { // Dijkstra simples (custo = XP dos nós ainda não aprendidos)
    q.sort((a, b) => dist[b] - dist[a]); const u = q.pop();
    for (const v of skAdj[u]) { const [vid, vs] = N[v]; if (!mineV(vs)) continue; const nd = dist[u] + (own.has(vid) ? 0 : xpOf(vs)); if (nd < dist[v]) { dist[v] = nd; prev[v] = u; q.push(v); } }
  }
  const t = idx.get(target); if (t == null || !isFinite(dist[t])) return null;
  const path = []; let i = t; for (; i >= 0 && dist[i] > 0; i = prev[i]) path.unshift(N[i]);
  return { path, cost: dist[t], from: i >= 0 ? N[i][0] : null };
}
function skillPage(c) {
  const N = Object.entries(S.skills), own = new Set(c.skills), ownL = c.skills.map(k => S.skills[k]).filter(Boolean);
  const rqMiss = s => c.enemy || !s.rq ? [] : Object.entries(s.rq).filter(([a, v]) => c.attrs[a] + (eq(c, 'acess')?.attr === a ? eq(c, 'acess').power : 0) < v);
  const mineV = s => c.enemy || s.el === 'fis' || s.el === 'aura' || (s.el === 'oculto' ? (c.aw || []).includes('outro') : (c.vinc || []).includes(s.el)), exTaken = s => s.ex && ownL.some(o => o.ex === s.ex && o !== s);
  const xpOf = s => RULES.xpCost(c, s), whyF = (s, id, soft) => RULES.whyNot(c, s, S.skills, S.items, id, soft);
  const avail = (s, id) => mineV(s) && !whyF(s, id, true), sel = selNode[c.id] && S.skills[selNode[c.id]] ? selNode[c.id] : null, ss = S.skills[sel];
  const canNow = N.filter(([id, s]) => !own.has(id) && mineV(s) && !whyF(s, id)).length, sq = (bf.skq || '').trim().toLowerCase();
  const planKey = 'vj.plan.' + c.id, planN = lsGet(planKey, []).filter(n => N.some(([, s]) => s.name === n)), inPlan = s => planN.includes(s.name);
  const planLeft = planN.map(n => N.find(([, s]) => s.name === n)).filter(([id]) => !own.has(id)), planXp = planLeft.reduce((a, [, s]) => a + xpOf(s), 0);
  const builds = lsGet('vj.builds', []), fkey = bf.skf || '';
  const hits = N.filter(([id, s]) => (sq || fkey) && !c.enemy && (!sq || `${s.name} ${s.d || ''} ${RULES.extra(s) || ''}`.toLowerCase().includes(sq)) && (!fkey || FUNC[fkey][1](s)));
  const hitSet = new Set(hits.map(([id]) => id));
  const reach = N.filter(([id, s]) => !own.has(id) && mineV(s) && !whyF(s, id)).sort((a, b) => xpOf(a[1]) - xpOf(b[1])).slice(0, 8);
  const almost = N.filter(([id, s]) => !own.has(id) && mineV(s) && /^Faltam \d+ XP/.test(whyF(s, id))).map(([id, s]) => [id, s, xpOf(s) - c.xp]).sort((a, b) => a[2] - b[2]).slice(0, 5);
  const route = sel && !own.has(sel) && mineV(ss) ? skPath(N, own, mineV, xpOf, sel) : null;
  const sMax = 4 + Math.floor(c.skills.reduce((a, k) => a + (S.skills[k]?.xp || 0), 0) / 100), sOwn = c.skills.filter(k => slotted(S.skills[k])), sOn = new Set(c.pslots || sOwn.slice(0, sMax)), canSwap = !S.battle.active && (gm || S.camp.open) && mine(c);
  // estado e marcas de cada nó (memorizados: a mandala consulta a cada quadro)
  const stC = new Map(), mkC = new Map(), awOk = s => !s.aw || (c.aw || []).includes(s.aw);
  const stOf = id => { if (!stC.has(id)) { const s = S.skills[id]; stC.set(id, own.has(id) ? 'own' : s.secret ? 'secret' : !mineV(s) ? 'out' : avail(s, id) ? 'av' : 'lock'); } return stC.get(id); };
  const marks = id => { if (!mkC.has(id)) { const s = S.skills[id], st = stOf(id), rqn = !!s.rq && rqMiss(s).length > 0;
    mkC.set(id, { sel: id === sel, plan: inPlan(s), hit: hitSet.has(id), poor: c.xp < xpOf(s), xp: xpOf(s), rq: rqn, gate: st !== 'own' && st !== 'out' && (rqn || !awOk(s) || exTaken(s)), dim: skOnly && st !== 'own' && st !== 'av' }); } return mkC.get(id); };
  const seen = skSeen[c.id]; skSeen[c.id] = new Set(c.skills);
  skMount = { skills: S.skills, ids: N.map(([id]) => id), key: c.id, inset: skDrawer && innerWidth >= 1000 ? 370 : 0, state: stOf, marks, fresh: seen ? c.skills.filter(k => !seen.has(k)) : [],
    mineEls: new Set(['aura', ...(c.vinc || []), ...((c.aw || []).includes('outro') ? ['oculto'] : [])]),
    route: route && route.from && route.path.length ? [route.from, ...route.path.map(([id]) => id)] : null,
    onPick: id => { selNode[c.id] = id; skTab = 'no'; lsSet('vj.skTab', 'no'); render(); }, onHover: (id, x, y) => skTip(id, x, y, c) };
  const tag = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
  const why = !ss || own.has(sel) ? '' : whyF(ss, sel);
  const exOther = ss?.ex ? N.filter(([k, s]) => s.ex === ss.ex && k !== sel).map(([, s]) => s.name).join(', ') : '';
  const detail = ss?.secret ? `<div class="ndcard secret" style="--e:${ELC[ss.el]}"><small>${PATRON[ss.el] || ''}</small><h2>???</h2><p class="flav">Uma técnica que ainda está fora do seu alcance. Aprenda um nó vizinho (ou receba o Vínculo ou Despertar certo) para descobrir o que ela é.</p></div>`
    : ss ? `<div class="ndcard" style="--e:${ELC[ss.el]}"><small>${PATRON[ss.el]} · ${KIND[ss.kind]}${ss.limit ? ' · Limite' : ''}${ss.back ? ' · Proibida' : ''}</small><h2>${esc(ss.name)}</h2>${ss.d ? `<p class="flav">${esc(ss.d)}</p>` : ''}
      <div class="tags">${ss.kind === 'passive' ? (pasTxt(ss) ? tag('Efeito', pasTxt(ss)) : '')
        : ss.kind === 'form' || ss.kind === 'util' ? tag('Atributo', ss.attr) + tag('Custo', ss.cost + ' ' + RES[ss.res]) + tag('Alvo', selfSk(ss) ? 'Em si' : ss.area ? 'Área' : 'Único') + ((ss.ct || 100) !== 100 ? tag('Tempo', ss.ct + '%') : '')
        : tag('Poder', ss.power) + tag('Atributo', ss.attr) + tag('Custo', ss.limit ? 'Limite 100%' : ss.cost + ' ' + RES[ss.res]) + tag('Alvo', ss.area ? 'Área' : 'Único') + ((ss.ct || 100) !== 100 ? tag('Tempo', ss.ct + '%') : '') + (ss.st ? tag('Causa', ST[ss.st]) : '') + (ss.req ? tag('Exige', WT[ss.req]) : '') + (ss.back ? tag('Sequela', ST[ss.back]) : '')}${ss.rq ? Object.entries(ss.rq).map(([a, v]) => tag('Requisito', a + ' ' + v)).join('') : ''}${ss.pre ? tag('Antes', esc(ss.pre.split('|').join(', '))) : ''}${ss.nb ? tag('Ramo', ss.nb + ' nós') : ''}${ss.aw ? tag('Despertar', RULES.AW[ss.aw]) : ''}${ss.cs ? tag('Estado', RULES.CS[ss.cs][0]) : ''}${ss.cat ? tag('Aura', RULES.NENN[ss.cat] + (c.nen && c.nen !== ss.cat ? ` · ${Math.round(RULES.nenEff(c, ss) * 100)}%` : '')) : ''}</div>
      ${RULES.extra(ss) ? `<p class="mech">${esc(RULES.extra(ss))}</p>` : ''}
      ${route && route.path.length > 1 ? `<small class="route">Caminho: ${route.path.map(([, s]) => esc(s.name)).join(' → ')} · ${route.cost} XP no total</small>` : ''}
      ${!c.enemy && !own.has(sel) ? `<button class="ghost" data-a="planT" data-id="${c.id}" data-node="" data-name="${esc(ss.name)}">${inPlan(ss) ? '★ Tirar do plano' : '☆ Pôr no plano'}</button>` : ''}
      ${exOther ? `<small class="exw">Escolha excludente: aprender esta tranca ${esc(exOther)}.</small>` : ''}
      ${gm && c.enemy ? `<button class="learn" data-a="skTog" data-id="${c.id}" data-skill="${sel}">${own.has(sel) ? 'Remover do inimigo' : 'Dar ao inimigo'}</button>` : (own.has(sel) ? '<div class="learned">Aprendida</div>' : `<button class="learn" data-a="learn" data-id="${c.id}" data-skill="${sel}" ${mine(c) && !why ? '' : 'disabled'}>${askL('learn', 'Aprender', 'Pedir ao mestre')} · ${xpOf(ss)} XP</button>${why ? `<small class="why">${why}</small>` : ''}`)
        + (gm ? `<button class="ghost" data-a="skTog" data-id="${c.id}" data-skill="${sel}" title="Sem gastar XP nem conferir requisitos">${own.has(sel) ? 'Tirar a skill (mestre)' : 'Dar sem custo (mestre)'}</button>` : '')}</div>`
    : '<div class="ndcard empty"><h2>Escolha um nó</h2><small>Clique em um nó para ver o que ele faz. Você aprende o tronco Marcial, a Aura e as skills do seu Vínculo (o Ocultismo pede um Despertar), sempre a partir de um nó vizinho de um que já tem.</small></div>';
  const mineL = c.skills.filter(k => S.skills[k]).map(k => `<li style="--e:${ELC[S.skills[k].el]}" data-node="${k}" data-id="${c.id}"><b>${esc(S.skills[k].name)}</b><small>${esc(desc(S.skills[k]))}</small></li>`).join('');
  const found = gm && sq ? N.filter(([, s]) => s.name.toLowerCase().includes(sq)).slice(0, 10).map(([id, s]) => `<span class="${own.has(id) ? 'weak' : ''}" data-node="${id}" data-id="${c.id}" style="border-color:${ELC[s.el]}">${esc(s.name)}</span>`).join('') || '<small>Nenhuma skill com esse nome.</small>' : '';
  const TABS = (c.enemy ? [['no', 'Nó'], ['apr', 'Aprendidas']] : [['no', 'Nó'], ['plano', 'Plano'], ['busca', 'Procurar'], ['alc', 'Alcance'], ['pas', 'Passivas'], ['apr', 'Aprendidas']]).concat(c.enemy && gm ? [['busca', 'Dar skill']] : []);
  const tab = TABS.some(([k]) => k === skTab) ? skTab : 'no', hid = k => tab === k ? '' : 'hidden';
  const legend = '<div class="legend"><span><i class="lc"></i>Ativa</span><span><i class="lp"></i>Passiva</span><span><i class="lo"></i>Aprendida</span><span><i class="la"></i>Dá para aprender</span><span><i class="lx"></i>Outro Vínculo</span><span>鎖 Requisito</span><span>⛩ Trava no caminho</span><span>??? Segredo</span><span>変 Transformação</span><span>儀 Ritual</span><span>双 Dupla</span><span>誓 Voto</span><span>召 Invocação</span></div>';
  return `<section class="skp ${skDrawer ? '' : 'closed'}"><div class="skmap" data-cid="${c.id}"><div class="sktip" hidden></div>
      <div class="skzoom"><button data-a="skZoom" data-v="1.5" aria-label="Aproximar">+</button><button data-a="skZoom" data-v="0.667" aria-label="Afastar">−</button></div>
      <div class="skhint"><button data-a="skReset">Minha árvore</button><button data-a="skCore">Marcial</button><button data-a="skAll">Ver tudo</button><button class="tog ${skOnly ? 'on' : ''}" data-a="skOnly" aria-pressed="${skOnly}">Só o que posso aprender</button><button data-a="skDrawer" aria-expanded="${skDrawer}">${skDrawer ? 'Fechar painel' : 'Abrir painel'}</button><small>Arraste para mover · roda do mouse, pinça ou + − para o zoom</small></div></div>
    <aside class="skside"><nav class="sktabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-a="skTab" data-v="${k}" class="${tab === k ? 'on' : ''}" aria-selected="${tab === k}">${l}</button>`).join('')}</nav><div class="xp"><small>XP disponível de ${esc(c.name)}<br>${c.enemy ? '' : canNow ? `<i class="can">${canNow} ${canNow > 1 ? 'habilidades' : 'habilidade'} ao seu alcance</i>` : 'nada ao alcance com esse XP'}</small><b>${edv(c, 'xp', c.xp)}</b></div><div class="skpane" ${hid('no')}>${detail}${legend}</div>
      ${c.enemy ? '' : `<div class="card skslots skpane" ${hid('pas')}><h3>Passivas ativas <small>${Math.min(sOn.size, sMax)}/${sMax} slots · +1 a cada 100 XP gasto${canSwap ? '' : ' · troque no acampamento'}</small></h3><div class="row chips">${sOwn.map(k => `<button class="tog ${sOn.has(k) ? 'on' : ''}" data-a="pslot" data-id="${c.id}" data-skill="${k}" aria-pressed="${sOn.has(k)}" ${canSwap ? '' : 'disabled'} title="${esc(desc(S.skills[k]))}">${esc(S.skills[k].name)}</button>`).join('') || '<small>Nenhuma passiva de efeito ainda.</small>'}</div></div>
      <div class="card skq skpane" ${hid('busca')}><h3>Procurar na árvore <small>nome, efeito ou função</small></h3><input class="bq" data-bf="skq" placeholder="Ex.: reerguer, escudo, ricochete…" aria-label="Procurar na árvore" value="${esc(bf.skq || '')}"><div class="row chips">${Object.entries(FUNC).map(([k, [l]]) => `<button class="tog ${fkey === k ? 'on' : ''}" data-a="skF" data-v="${k}" aria-pressed="${fkey === k}">${l}</button>`).join('')}</div>${sq || fkey ? `<div class="row chips">${hits.slice(0, 14).map(([id, s]) => `<span class="${own.has(id) ? 'weak' : ''} ${mineV(s) ? '' : 'out'}" data-node="${id}" data-id="${c.id}" style="border-color:${ELC[s.el]}">${esc(s.name)}</span>`).join('') || '<small>Nada encontrado.</small>'}${hits.length > 14 ? `<small>+${hits.length - 14} no mapa (brilham)</small>` : ''}</div>` : ''}</div>
      <div class="card skplan skpane" ${hid('plano')}><h3>Plano <small>${planLeft.length ? `${planLeft.length} nós · ${planXp} XP${planXp > c.xp ? ` (faltam ${planXp - c.xp})` : ''}` : 'marque nós que quer aprender'}</small></h3><div class="row chips">${planLeft.map(([id, s]) => `<span data-node="${id}" data-id="${c.id}" style="border-color:${ELC[s.el]}">${esc(s.name)} · ${xpOf(s)}</span>`).join('')}</div>
        <div class="row"><button class="ghost" data-a="planSave" data-id="${c.id}" ${planN.length ? '' : 'disabled'}>Salvar build</button><select data-a="planLoad" data-id="${c.id}" aria-label="Carregar build"><option value="">Carregar build…</option>${builds.map((b, i) => `<option value="${i}">${esc(b.name)} (${b.nodes.length})</option>`).join('')}</select><button class="ghost" data-a="planClear" data-id="${c.id}" ${planN.length ? '' : 'disabled'}>Limpar</button></div></div>
      <div class="card skreach skpane" ${hid('alc')}><h3>Ao seu alcance <small>${c.xp} XP</small></h3><div class="row chips">${reach.map(([id, s]) => `<span data-node="${id}" data-id="${c.id}" style="border-color:${ELC[s.el]}">${esc(s.name)} · ${xpOf(s)}</span>`).join('') || '<small>Nada com esse XP.</small>'}</div>${almost.length ? `<small>Quase lá: ${almost.map(([id, s, f]) => `<a data-node="${id}" data-id="${c.id}">${esc(s.name)} (faltam ${f})</a>`).join(' · ')}</small>` : ''}</div>`}
      ${gm ? `<div class="card skfind skpane" ${hid('busca')}><h3>Dar skill <small>só o mestre</small></h3><input class="bq" data-bf="skq" placeholder="Buscar skill pelo nome…" aria-label="Buscar skill" value="${esc(bf.skq || '')}"><div class="row chips">${found}</div></div>` : ''}
      <div class="skpane" ${hid('apr')}><h3>Aprendidas (${c.skills.length})</h3><ul class="mine">${mineL || '<li class="none"><small>Nenhuma ainda.</small></li>'}</ul></div></aside></section>`;
}

// resumo do nó sob o cursor (a mandala avisa; não passa pelo render)
function skTip(id, x, y, c) {
  const t = app.querySelector('.sktip'); if (!t) return; if (!id || !S.skills[id]) { t.hidden = true; return; }
  const s = S.skills[id], has = c.skills.includes(id); t.hidden = false; t.style.left = Math.min(innerWidth - 300, x + 16) + 'px'; t.style.top = Math.min(innerHeight - 160, y + 16) + 'px'; t.style.setProperty('--e', ELC[s.el]);
  t.innerHTML = s.secret ? `<small>${PATRON[s.el] || ''}</small><b>???</b><small>Fora do alcance. Aprenda um nó ligado a ele para revelar.</small>`
    : `<small>${PATRON[s.el] || ''} · ${KIND[s.kind] || s.kind}${s.limit ? ' · Limite' : ''}</small><b>${esc(s.name)}</b><small>${esc(desc(s))}</small><em>${has ? 'Aprendida' : RULES.xpCost(c, s) + ' XP'}</em>`;
}

function persPage(c) {
  const eqn = slot => eq(c, slot) ? `<b>${esc(eq(c, slot).name)}</b><small>${esc(idesc(eq(c, slot)))}</small>${wpnInfo(eq(c, slot), c)}${upInfo(c, c.equip[slot], eq(c, slot))}` : slot === 'arma' ? `<b class="none">Punhos</b><small>${esc(wpnLine(null, c))} · equipe uma arma na página Itens</small>` : '<b class="none">Vazio</b><small>equipe na página Itens</small>';
  const res = k => `<div class="resrow ${k}"><em>${L[k]}</em>${bar(k, c, true)}<span class="rn">${edv(c, k, c[k])}<small>/${k === 'limit' ? 100 : c[k + 'Max']}</small></span></div>`;
  const cts = Object.values(S.contracts).filter(ct => !ct.done).map(ct => `<li><b>${esc(ct.target)}</b><small>${ct.gold} ouro · ${ct.xp} XP</small></li>`).join('');
  const sts = stChips(c);
  const tile = a => { const v = at(c, a), base = v !== c.attrs[a] ? `<small>base ${c.attrs[a]}</small>` : '';
    return gm ? `<div class="tile gmt ${c.marks[a] ? 'mk' : ''}">${edv(c, 'attrs.' + a, c.attrs[a], 'tv')}<button data-a="roll" data-id="${c.id}" data-attr="${a}" title="Rolar ${ATN[a]}${v !== c.attrs[a] ? ` (vale ${v} com equipamento e ferimentos)` : ''}">${a}</button></div>`
      : `<button class="tile ${c.marks[a] ? 'mk' : ''}" data-a="rollAsk" data-id="${c.id}" data-attr="${a}" aria-label="Rolar ${ATN[a]}, ${v}%"><b>${v}</b><span>${a}</span><em>${ATN[a]}</em>${base}</button>`; };
  return `<section class="pp" style="--c:${esc(c.color)}"><div class="pp-hero">${figCard(c, '170px')}
      <div class="pp-id"><input class="pname" aria-label="Nome" data-id="${c.id}" data-f="name" value="${esc(c.name)}"><div class="row pills">${gm ? Object.keys(PATRON).filter(e => !['fis', 'aura', 'oculto'].includes(e)).map(e => `<span class="pill vp ${(c.vinc || []).includes(e) ? '' : 'off'}" style="--e:${ELC[e]};${(c.vinc || []).includes(e) ? '' : 'opacity:.4'}" role="button" tabindex="0" data-a="vinc" data-id="${c.id}" data-el="${e}" title="Clique para ${(c.vinc || []).includes(e) ? 'remover' : 'conceder'} o Vínculo">Vínculo <b>${PATRON[e]}</b></span>`).join('') : (c.vinc || []).map(e => `<span class="pill vp" style="--e:${ELC[e]}">Vínculo <b>${PATRON[e]}</b></span>`).join('')}${(c.aw || []).map(k => `<span class="pill" title="Despertar">✦ <b>${esc(RULES.AW[k] || k)}</b></span>`).join('')}${c.nen ? `<span class="pill" style="--e:${ELC.aura}">Aura <b>${RULES.NENN[c.nen]}</b></span>` : ''}<span class="pill">XP <b>${edv(c, 'xp', c.xp)}</b></span><span class="pill">Ouro <b>${edv(c, 'gold', c.gold)}</b></span>
          <input type="color" aria-label="Cor do personagem" data-id="${c.id}" data-f="color" value="${esc(c.color)}"><label class="up">Trocar retrato<input type="file" accept="image/*" data-up="img" data-id="${c.id}"></label></div>
        <div class="resg">${res('hp')}${res('aura')}${res('san')}${res('limit')}</div><div class="sts big">${sts || '<small>Sem condições ativas.</small>'}</div></div></div>
    <div class="pp-grid"><div class="card wide"><h3>Atributos <small>${gm ? 'clique no número para editar, na sigla para rolar' : `toque para rolar o d100${gated('roll') ? ' (o mestre aprova)' : ''}`}</small></h3><div class="tiles">${A.map(tile).join('')}</div>
        <p class="hint">${gm ? `<label>Modificador da rolagem <input type="number" class="mod" data-mid="${c.id}" value="${mods[c.id] || 0}"></label> ` : ''}<span><i class="mkd"></i> marca os atributos usados com sucesso: eles podem evoluir no descanso longo.</span></p></div>
      <div class="card"><h3>Ferimentos</h3>${bodyFig(c)}</div>
      <div class="card"><h3>Equipamento</h3><div class="slots"><div><em>Arma</em>${eqn('arma')}</div><div><em>Armadura</em>${eqn('armadura')}</div><div><em>Acessório</em>${eqn('acess')}</div><div><em>Munição</em>${munLine(c)}</div></div>
        <h3>Afinidades</h3><div class="row chips">${[...c.weak.map(k => `<span class="weak">Fraco: ${EL[k]}</span>`), ...c.resist.map(k => `<span class="res">Resiste: ${EL[k]}</span>`), eq(c, 'acess')?.el ? `<span class="res">Resiste: ${EL[eq(c, 'acess').el]}</span>` : ''].join('') || '<small>Nenhuma fraqueza ou resistência.</small>'}</div></div>
      ${S.camp.open ? `<div class="card"><h3>Acampamento <small>escolha o que fazer nesta noite${gated('camp') ? ' (o mestre aprova)' : ''}</small></h3><div class="row chips big">${chips({ ...CAMPL, ...campExtra(c) }, (k, l) => `<span class="${S.camp.acts[c.id] === k ? 'weak' : ''}" data-a="campAct" data-id="${c.id}" data-k="${k}" data-w="${campWith[c.id] || S.camp.with?.[c.id] || ''}">${l}</span>`)}</div><div class="row"><label>Conversar com <select data-a="campWith" data-id="${c.id}"><option value="">ninguém em especial</option>${Object.values(S.chars).filter(o => !o.enemy && o.id !== c.id && !o.summon).map(o => `<option value="${o.id}" ${(campWith[c.id] || S.camp.with?.[c.id]) === o.id ? 'selected' : ''}>${esc(o.name)} · laço ${RULES.bondLv(S.bonds?.[[c.id, o.id].sort().join('|')] || 0)}</option>`).join('')}</select></label></div></div>` : ''}
      <div class="card"><h3>Contratos de caça</h3><ul class="plain">${cts || '<li><small>Nenhum contrato aberto.</small></li>'}</ul></div></div></section>`;
}

// resumo da munição equipada na página Personagem
const munLine = c => { const i = S.items[c.equip.mun]; return i ? `<b>${esc(i.name)}</b><small>${c.shots?.[c.equip.mun] || 0} tiro(s) no pente · ${c.inv[c.equip.mun] || 0} pacote(s)</small>` : '<b class="none">Vazio</b><small>balas para armas de fogo, flechas para arcos e bestas</small>'; };
let itab = 'inv';
// peças modificadas pelos ofícios: têmpera, engastes, segundo elemento, assinatura e arma viva (c.up[id])
const ESTAGIOS = [10, 25, 50];
function upInfo(c, k, i) {
  const u = c.up?.[k]; if (!u || !['arma', 'armadura', 'acess'].includes(i.type)) return '';
  const st = u.living ? ESTAGIOS.filter(v => (u.kills || 0) >= v).length : 0, prox = ESTAGIOS[st], slots = i.type === 'arma' ? OFI.slots(c) : 0, g = u.g || [];
  const what = i.type === 'arma' ? 'de poder' : i.type === 'armadura' ? 'de armadura' : 'no atributo', tag = (cls, txt, tip = '') => `<span class="ut ${cls}" ${tip ? `title="${esc(tip)}"` : ''}>${txt}</span>`;
  const L = [u.t || u.p ? tag('t', `Têmpera +${u.t || 0} · +${u.p || 0} ${what}`, 'Bônus da têmpera (e da obra-prima), já somado ao item') : '',
    ...g.map(n => tag('g', `⬡ ${esc(n.replace('Runa de ', ''))}`, OFI.RUNAS[n]?.d || n)), slots > g.length && i.type === 'arma' ? tag('e', `${slots - g.length} engaste(s) livre(s)`, 'Engastes abertos pela Forja') : '',
    u.el2 ? tag('l', `Liga: ${esc(PATRON[u.el2] || u.el2)}`, 'Segundo elemento da liga de essências') : '',
    u.sig != null ? tag('s', `✦ ${u.nm ? `“${esc(u.nm)}” · ` : ''}${esc(OFI.SIG[u.sig]?.n || '')} (${RULES.modText(OFI.SIG[u.sig]?.m || {})})`, 'Assinatura do Ferreiro') : '',
    u.living ? tag('v', `Arma viva · estágio ${st}/3 · ${u.kills || 0} abates${prox ? ` (próximo em ${prox})` : ''}${st >= 1 ? ` · +${st} de poder` : ''}${st >= 3 ? ' · ignora 40% da armadura, +10 de crítico' : ''}`, 'Evolui com os abates') : ''].filter(Boolean);
  return L.length ? `<div class="upinfo">${L.join('')}</div>` : '';
}
// munição: o slot "mun" vale só para armas de fogo; guarda os tiros restantes do pente aberto (c.shots) e os pacotes no inventário
function munSlot(c, btn) {
  const k = c.equip.mun, i = S.items[k], fogo = !!i && (i.for || 'fogo') === (eq(c, 'arma')?.wt || 'punho'), per = i ? i.shots + OFI.hook(c, 'tiros') : 0;
  if (!i) { const tem = Object.entries(c.inv).filter(([id]) => S.items[id]?.type === 'mun'); return `<div class="slot"><em>Munição</em><b class="none">Vazio</b><small>${tem.length ? 'balas para armas de fogo, flechas para arcos e bestas' : 'balas na Engenharia, flechas na Caça, ou compre na loja'}</small>${tem.map(([id, q]) => btn('equip', `Equipar ${esc(S.items[id].name.replace('Munição de ', '').replace('Munição ', ''))} ×${q}`, id, 'class="ghost"')).join('')}</div>`; }
  const pente = c.shots?.[k] || 0, pac = c.inv[k] || 0;
  return `<div class="slot on"><em>Munição</em><b>${esc(i.name)}</b><small>${pente} tiro(s) no pente${pac ? ` · ${pac} pacote(s) de ${per}` : ' · sem pacotes de reserva'}${i.el ? ` · ${EL[i.el]}` : ''}</small>${fogo ? '' : `<small class="warn">A arma equipada não usa ${i.for === 'arco' ? 'flechas' : 'balas'}: a munição não é gasta.</small>`}${btn('equip', 'Tirar', k, 'class="ghost"')}</div>`;
}
function itemsPage(c) {
  const sh = shop(), card = (k, i, foot, q) => `<div class="icard t-${i.type}" style="--e:${ELC[i.el] || 'var(--line)'}"><em>${IT[i.type]}${i.type === 'arma' && i.cat ? ` · ${CATN[i.cat]}` : ''}</em><b>${esc(i.name)}${q > 1 ? ` <i>×${q}</i>` : ''}</b><small>${esc(idesc(i))}</small>${wpnInfo(i, c)}${upInfo(c, k, i)}<div class="row">${foot}</div></div>`;
  const btn = (a, l, k, x = '') => `<button data-a="${a}" data-id="${c.id}" data-item="${k}" ${x}>${l}</button>`;
  const slot = (s, l) => { const i = eq(c, s); return `<div class="slot ${i ? 'on' : ''}"><em>${l}</em>${i ? `<b>${esc(i.name)}</b><small>${esc(idesc(i))}</small>${s === 'arma' ? `<small class="wtr">${esc(wpnLine(i, c))}</small>` : ''}${upInfo(c, c.equip[s], i)}${btn('equip', 'Tirar', c.equip[s], 'class="ghost"')}` : '<b class="none">Vazio</b><small>equipe um item do inventário</small>'}</div>`; };
  const invL = Object.entries(c.inv).filter(([k]) => S.items[k]).sort((a, b) => ITO.indexOf(S.items[a[0]].type) - ITO.indexOf(S.items[b[0]].type));
  const inv = invL.map(([k, q]) => { const i = S.items[k], on = c.equip[i.type] === k;
    return card(k, i, (i.type === 'cons' ? btn('use', 'Usar', k, i.eff === 'bomb' ? 'disabled title="Só em batalha"' : 'class="own"') : i.type === 'mat' ? '' : btn('equip', on ? 'Equipado' : 'Equipar', k, on ? 'class="own"' : i.reqFor && c.attrs.FOR < i.reqFor ? `disabled title="Exige FOR ${i.reqFor}"` : '')) + (sh.open ? btn('sell', `Vender · ${Math.floor(i.price / 2)}`, k) : '') + btn('drop', 'Descartar', k, 'class="ghost"'), q); }).join('');
  const forge = Object.entries(S.items).filter(([, i]) => i.el && ['arma', 'acess'].includes(i.type) && !(i.type === 'arma' && i.cat && i.cat !== 'elemental')).map(([k, i]) => { const ess = Object.keys(S.items).find(e => S.items[e].type === 'mat' && S.items[e].el === i.el), have = c.inv[ess] || 0, need = i.type === 'arma' ? 3 : 5, cost = Math.round(i.price / 2);
    return have ? card(k, i, `<small>${have}/${need} essências · ${cost} ouro</small>` + btn('forge', 'Forjar', k, have < need || c.gold < cost ? 'disabled' : '')) : ''; }).join('');
  const stock = sh.open ? sh.stock.filter(k => S.items[k]) : [], T = { inv: `Inventário <i>${invL.reduce((n, [, q]) => n + q, 0)}</i>`, loja: `Loja${sh.open ? ` <i>${stock.length}</i>` : ''}`, forja: 'Forja' }, tab = T[itab] ? itab : 'inv';
  const gq = (bf.giveq || '').trim().toLowerCase(), giveL = Object.entries(S.items).filter(([, i]) => !gq || i.name.toLowerCase().includes(gq)).sort((a, b) => a[1].name.localeCompare(b[1].name)).slice(0, gq ? 30 : 12);
  const body = tab === 'loja' ? (sh.open ? `<div class="icards">${stock.map(k => card(k, S.items[k], btn('buy', `Comprar · ${S.items[k].price}`, k, c.gold < S.items[k].price ? 'disabled title="Ouro insuficiente"' : 'class="own"'))).join('') || '<p class="none">Nada à venda.</p>'}</div>` : '<p class="none">Não há loja aberta nesta cena.</p>')
    : tab === 'forja' ? `<p class="hint">3 essências do elemento para uma arma, 5 para uma relíquia, mais metade do preço em ouro.</p><div class="icards">${forge || '<p class="none">Você ainda não tem essências para forjar.</p>'}</div>`
    : `<div class="icards">${inv || '<p class="none">Inventário vazio.</p>'}</div>`;
  return `<section class="ip"><div class="ip-top m4"><div class="gold"><small>Ouro</small><b>${edv(c, 'gold', c.gold)}</b></div>${slot('arma', 'Arma')}${slot('armadura', 'Armadura')}${slot('acess', 'Acessório')}${munSlot(c, btn)}</div>
    ${gated('item') ? '<p class="gate">Usar, equipar, comprar, vender e descartar pedem a aprovação do mestre.</p>' : ''}
    <div class="seg" role="tablist">${chips(T, (k, l) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-a="itab" data-k="${k}">${l}</button>`)}</div>${body}
    ${gm ? `<h3>Entregar item <small>só o mestre</small></h3><div class="row"><input class="bq" data-bf="giveq" placeholder="Buscar item pelo nome…" aria-label="Buscar item para entregar" value="${esc(bf.giveq || '')}"></div><div class="row chips">${giveL.map(([k, i]) => `<span data-a="give" data-id="${c.id}" data-item="${k}">+ ${esc(i.name)}</span>`).join('') || '<small>Nenhum item com esse nome.</small>'}${!gq && Object.keys(S.items).length > 12 ? '<small>Digite para achar os outros.</small>' : ''}</div>` : ''}</section>`;
}
const ITO = ['arma', 'armadura', 'acess', 'cons', 'mat', 'mun'];

// tela do jogador em batalha: 1) alvo, 2) ação, 3) pedir ao mestre
let pick = { k: 'atk', id: 'atk' }, aimOpen = false, braveOn = false, passTo = '', campWith = {};
// faixa do campo de batalha: clima, barra de Cadeia, Domínio aberto
const fieldBar = () => { const B = S.battle, wx = RULES.CLIMA[B.wx?.k], ch = B.chain || { h: 0, e: 0 }, D = B.dom;
  return `<div class="fbar">${wx ? `<span class="wx" title="${esc(Object.entries(wx[1]).map(([k, v]) => k === 'hit' ? `acerto ${v}` : `${PATRON[k] || k} ×${v}`).join(' · '))}">${wx[0]}</span>` : ''}<span class="chain ${ch.h >= 100 ? 'full' : ''}" title="Fraquezas, críticos e golpes enchem a barra; cheia, o grupo ataca em sequência">Cadeia <b style="--p:${ch.h}%"></b>${ch.h}%</span>${D ? `<span class="dom">Domínio: ${esc(D.name)} (${D.ttl})</span>` : ''}</div>`; };
const blockWhy = (c, s, k) => k && c.cant?.[k] ? c.cant[k] : c.st.silence ? 'Silenciado' : c.st.fury ? 'Em fúria: só ataca' : s.limit && c.limit < 100 ? 'Limite incompleto' : c[s.res] < s.cost ? `Falta ${RES[s.res]}` : s.req && s.req !== wtype(c) ? `Exige ${WT[s.req]}` : '';
function command(c, cur) {
  const my = cur === c, inB = Object.values(S.chars).filter(o => o.id in S.battle.ticks && !o.dead).sort((x, y) => y.enemy - x.enemy);
  if (my) { const t0 = inB.find(o => o.id === tgt); if (!t0 || (t0.enemy && t0.hp <= 0)) { const f = inB.find(o => o.enemy !== c.enemy && o.hp > 0); if (f) { tgt = f.id; aim = null; } } } // na sua vez, já vem mirado no primeiro inimigo de pé
  const t = inB.find(o => o.id === tgt), [rqId, rq] = myReq() || [], wait = rq && rq.ch === c.id;
  const sks = c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive'), wsks = wSk(c), cons = Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons');
  if ((pick.k === 'sk' && !sks.includes(pick.id) && !wsks.includes(pick.id)) || (pick.k === 'it' && !(c.inv[pick.id] > 0))) pick = { k: 'atk', id: 'atk' };
  const tab = ['sk', 'it', 'wp'].includes(sub) ? sub : 'atk', s = pick.k === 'sk' ? SK(pick.id) : null, it = pick.k === 'it' ? S.items[pick.id] : null, wp = eq(c, 'arma');
  const label = it ? it.name : s ? s.name : 'Ataque', canAim = !it && !(s && (s.area || ['heal', 'util', 'form'].includes(s.kind) || selfSk(s))) && t;
  const why = !my ? 'Aguarde a sua vez' : !t && !selfSk(s) ? 'Escolha um alvo' : s && blocked(c, s, pick.id) ? blockWhy(c, s, pick.id) : '';
  const tg = o => `<button class="tg ${o.enemy ? 'foe' : 'ally'} ${o.id === tgt ? 'on' : ''} ${o.hp > 0 ? '' : 'ko'}" data-tgt="${o.id}" style="--c:${esc(o.enemy ? '#e4002b' : o.color)}" aria-pressed="${o.id === tgt}"><b>${esc(o.name)}</b>${bar('hp', o, true)}<small>${o.hp > 0 ? (o.enemy ? Math.round(100 * o.hp / (o.hpMax || 1)) + '%' : `${o.hp}/${o.hpMax}`) : 'caído'}</small></button>`;
  const opt = (k, id, name, meta, d, off) => `<button class="opt ${pick.k === k && pick.id === id ? 'on' : ''}" data-a="pick" data-k="${k}" data-v="${id}" ${off ? 'disabled' : ''} aria-pressed="${pick.k === k && pick.id === id}"><b>${esc(name)}</b><i>${meta}</i><small>${esc(off || d)}</small></button>`;
  const skOpt = k => { const x = SK(k); return opt('sk', k, x.name, x.limit ? 'Limite' : `${x.cost} ${RES[x.res]}${x.pay ? ' +' : ''}${x.uses ? ` · ${x.uses}×` : ''}`, desc(x), blocked(c, x, k) ? blockWhy(c, x, k) : ''); };
  const list = tab === 'sk' ? sks.map(skOpt).join('') || '<p class="none">Nenhuma skill ativa ainda. Aprenda na página Habilidades.</p>'
    : tab === 'wp' ? wsks.map(skOpt).join('') || `<p class="none">${wp ? 'Esta arma não tem técnicas próprias.' : 'Sem arma equipada: equipe uma na página Itens para usar as técnicas dela.'}</p>`
    : tab === 'it' ? cons.map(([k, q]) => opt('it', k, S.items[k].name, '×' + q, idesc(S.items[k]))).join('') || '<p class="none">Nenhum consumível no inventário.</p>'
    : opt('atk', 'atk', ARMAS.prof(wp).atkN || 'Ataque', 'sem custo', `${wp ? wp.name : 'Punhos'} · ${wpnLine(wp, c)}`);
  const tl = timeline(6).slice(1).map(id => `<i class="${S.chars[id].enemy ? 'foe' : ''}">${esc(S.chars[id].name)}</i>`).join('');
  const allies = inB.filter(o => !o.enemy && o.id !== c.id && o.hp > 0), downAll = inB.filter(o => o.enemy && o.hp > 0).length > 0 && inB.filter(o => o.enemy && o.hp > 0).every(o => o.st.down || o.st.broken);
  // menu estilo Persona: teclas 1–9; Atacar/Arma/Skills/Itens abrem a lista ao lado, o resto age direto
  const free = my && !wait, n = { wp: wsks.length, sk: sks.length, it: cons.length };
  const M = [['atk', 'Atacar'], ['wp', 'Arma'], ['sk', 'Skills'], ['it', 'Itens'],
    ['defend', `Defender${c.brv > 0 ? ' · ' + c.brv : ''}`, 'Defende (−25% de dano) e guarda 1 ponto de Coragem (máx. 3)'],
    ['focus', `Concentrar${c.ten ? ' ×' + [1, 1.5, 2, 3][c.ten] : ''}`, 'Gasta o turno acumulando: o próximo golpe causa ×1,5 / ×2 / ×3'],
    ['braveT', `Coragem ${c.brv || 0}`, 'Gasta 1 ponto de Coragem para agir de novo; sem pontos, fica devendo tempo (dívida: o próximo turno demora mais)'],
    ...(downAll ? [['allOut', 'Ataque Total', 'Todo inimigo Derrubado ou Quebrado: o grupo inteiro ataca']] : []), ['next', 'Passar', 'Passa a vez gastando metade do tempo']];
  const mi = ([k, l, tip], i) => ['atk', 'wp', 'sk', 'it'].includes(k)
    ? `<li><button class="p5i ${tab === k ? 'on' : ''}" data-sub="${k}" aria-pressed="${tab === k}"><kbd>${i + 1}</kbd><span>${l}</span>${k === 'atk' ? '' : `<i>${n[k]}</i>`}</button></li>`
    : `<li><button class="p5i act ${k === 'braveT' && braveOn ? 'on' : ''} ${k === 'braveT' && c.brv < 0 ? 'debt' : ''} ${k === 'allOut' ? 'allout' : ''}" data-a="${k}" data-id="${c.id}" title="${tip}" ${k === 'braveT' ? (c.brv > -2 ? '' : 'disabled') + ` aria-pressed="${braveOn}"` : free ? '' : 'disabled'}><kbd>${i + 1}</kbd><span>${l}</span></button></li>`;

  return `<section class="cmd p5 ${my ? 'mine' : ''}" style="--c:${esc(c.color)}"><div class="cmd-h"><div class="turn ${my ? 'me' : ''}">${my ? 'Seu turno' : 'Turno de ' + esc(cur?.name || '—')}</div><div class="nextup"><small>Depois:</small>${tl}</div>${fieldBar()}</div>
    <div class="cmd-g"><div class="cmd-me"><h2>${esc(c.name)}</h2>${['hp', 'aura', 'san', 'limit'].map(k => `<div class="resrow ${k}"><em>${L[k]}</em>${bar(k, c, true)}<span class="rn">${c[k]}<small>/${k === 'limit' ? 100 : c[k + 'Max']}</small></span></div>`).join('')}
        <div class="sts">${c.hp > 0 ? stChips(c) || '<small>Sem condições.</small>' : `<i class="dead">${c.dead ? 'Morto' : 'Caído' + (c.dying ? ' · ' + c.dying : '')}</i>`}</div></div>
      <ul class="p5m" role="menu" aria-label="Comandos">${M.map(mi).join('')}</ul>
      <div class="cmd-step p5s"><div class="alist" role="listbox" aria-label="${{ atk: 'Ataque', wp: 'Técnicas da arma', sk: 'Skills', it: 'Itens' }[tab]}">${list}</div>
        <div class="p5t"><small>Alvo <kbd>←</kbd><kbd>→</kbd></small><div class="tgs">${inB.map(tg).join('')}</div></div>
        <div class="p5x">${canAim ? `<button class="ghost aimb ${aim ? 'on' : ''}" data-a="aimT" aria-expanded="${aimOpen}">${aim ? `Mira: ${PL[aim]} (−${AIMP[aim]}%)` : 'Mirar numa parte do corpo'}</button>` : ''}${allies.length ? `<select data-a="passSel" aria-label="Passar a vez depois de acertar uma fraqueza"><option value="">Fraqueza passa a vez: ninguém</option>${allies.map(o => `<option value="${o.id}" ${passTo === o.id ? 'selected' : ''}>Fraqueza passa a vez: ${esc(o.name)}</option>`).join('')}</select>` : ''}</div>
        ${canAim && aimOpen ? aimBox() : ''}</div></div>
    <div class="cmd-go ${wait ? 'wait' : ''}"><div class="sum"><small>${wait ? 'Aguardando o mestre' : 'Sua ação'}${braveOn ? ' · com Coragem' : ''}</small><b>${wait ? esc(rq.text) : `${esc(label)} <span>→</span> ${selfSk(s) ? 'em si' : t ? esc(t.name) : '<u>sem alvo</u>'}${canAim && aim ? ` · ${PL[aim]}` : ''}`}</b></div>
      ${wait ? `<button data-a="reqNo" data-id="${rqId}">Cancelar pedido</button>` : `<button class="go" data-a="go" data-id="${c.id}" ${why ? 'disabled' : ''}>${why || askL('act', 'Agir')}<kbd>Enter</kbd></button>`}</div></section>`;
}
// conversa e histórico: rolagens mostram o dado; mensagens privadas ficam marcadas
const logHtml = () => `${role === 'table' ? '' : '<div class="chatin"><input class="chat" data-chat="1" placeholder="Mensagem · /r 2d6+1 · /w nome texto" aria-label="Mensagem"><button data-a="chatSend">Enviar</button></div>'}<div class="log" aria-live="polite">${S.log.slice().reverse().map(l => `<p class="${l.kind} ${l.to ? 'priv' : ''}">${l.d ? `<i class="d">${l.d}</i>` : ''}<b>${esc(l.who)}</b> ${esc(l.text)}</p>`).join('') || '<p class="none">Nada aconteceu ainda. As rolagens e mensagens aparecem aqui.</p>'}</div>`;
let chatSeen = 0, lastPg = null, meOpen = false;

// exploração: rolagem rápida de atributo e o estado do grupo, logo abaixo do mapa
const mesaTools = c => `<section class="card qroll" style="--c:${esc(c.color)}"><h3>Rolar atributo <small>${esc(c.name)}${gated('roll') ? ' · o mestre aprova' : ''}</small></h3><div class="qr">${A.map(a => `<button data-a="rollAsk" data-id="${c.id}" data-attr="${a}" aria-label="Rolar ${ATN[a]}, ${at(c, a)}%"><b>${at(c, a)}</b><span>${a}</span></button>`).join('')}</div></section>
  <section class="card"><h3>Grupo</h3><div class="pgroup">${Object.values(S.chars).filter(x => !x.enemy && !x.dead).map(x => `<div style="--c:${esc(x.color)}"><b>${esc(x.name)}</b><small>${x.hp > 0 ? stList(x) || 'bem' : 'caído'}</small>${bar('hp', x)}${bar('aura', x)}${bar('san', x)}</div>`).join('')}</div></section>`;

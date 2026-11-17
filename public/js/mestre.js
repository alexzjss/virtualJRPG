function editor(coll) {
  const cell = (id, o, [, f, t = 'number']) => { const a = `data-ed="${coll}" data-id="${id}" data-f="${f}"`;
    return typeof t === 'object' ? `<select ${a}>${chips(t, (k, l) => `<option value="${k}" ${k === o[f] ? 'selected' : ''}>${l}</option>`)}</select>`
      : `<input type="${t}" ${t === 'number' ? 'step="any"' : ''} ${a} ${t === 'checkbox' ? (o[f] ? 'checked' : '') : `value="${esc(o[f])}"`}>`; };
  return `<section class="panel editor"><table><tr>${ED[coll].map(c => `<th>${c[0]}`).join('')}<th></tr>${chips(S[coll], (id, o) =>
    `<tr>${ED[coll].map(c => `<td>${cell(id, o, c)}`).join('')}<td><button data-a="edDup" data-coll="${coll}" data-id="${id}" title="Duplicar">⧉</button><button data-a="edDel" data-coll="${coll}" data-id="${id}" title="Excluir">×</button></tr>`)}</table><div class="row"><button data-a="edAdd" data-coll="${coll}">+ Novo</button><button data-a="content" data-coll="${coll}">Restaurar padrão</button></div>
    ${coll === 'items' ? `<div class="row chips"><button data-a="shop" data-f="open" data-v="${shop().open ? '' : 1}" class="${shop().open ? 'own' : ''}">Loja de ${esc(S.scenes[S.scene].name)}: ${shop().open ? 'aberta' : 'fechada'}</button>À venda: ${chips(S.items, (k, i) => `<span class="${shop().stock.includes(k) ? 'weak' : ''}" data-a="shop" data-item="${k}">${esc(i.name)}</span>`)}</div>` : ''}</section>`;
}

// menu de contexto do token (clique direito)
function ctxMenu() {
  const c = ctx && S.chars[ctx.id];
  if (!c) return '';
  return `<div class="ctx" style="left:${Math.min(ctx.x, innerWidth - 250)}px;top:${Math.min(ctx.y, innerHeight - (gm ? 330 : 130))}px"><b>${esc(c.name)}</b>${mine(c) ? `<button data-a="openSheet" data-id="${c.id}">Abrir ficha</button>` : ''}<button data-tgt="${c.id}">Marcar como alvo</button>
    ${gm ? `<button data-a="place" data-id="${c.id}">Tirar do mapa</button><button data-a="bSave" data-id="${c.id}">Salvar no bestiário</button><div class="row chips">${chips(ST, (k, l) => `<span class="${c.st[k] ? 'weak' : ''}" data-a="st" data-id="${c.id}" data-k="${k}">${l}</span>`)}</div>` : ''}</div>`;
}
const party = () => `<div class="party">${Object.values(S.chars).filter(c => !c.enemy && !c.dead).map(c => `<div style="--c:${esc(c.color)}">${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}<span><b>${esc(c.name)}</b>${bar('hp', c)}${bar('aura', c)}${bar('san', c)}</span></div>`).join('')}</div>`;
// perseguição: faixa visível a todos e janela de controle do mestre
const chaseBar = () => { const q = S.chase; if (!q) return ''; const n = k => `${esc(S.chars[q[k].id]?.name || '?')} · ${VEH[q[k].veh]}`;
  return `<div class="chase"><b>Perseguição</b><span>${n('b')}</span><div class="track">${Array.from({ length: 10 }, (_, i) => `<i class="${i < q.gap ? 'on' : ''}"></i>`).join('')}</div><span>${n('a')}</span><small>distância ${q.gap}/10 · rodada ${q.round}</small></div>`; };
function chaseWin() {
  if (S.chase) return chaseBar() + '<div class="row"><button class="own" data-a="chase" data-k="round">Rolar rodada</button><button data-a="chase" data-k="end">Encerrar</button></div><small>Distância 10: o fugitivo escapa. Distância 0: é alcançado.</small>';
  const who = k => `<div class="row chips">${Object.values(S.chars).filter(c => c.x != null && c.scene === S.scene).map(c => `<span class="${cz[k] === c.id ? 'weak' : ''}" data-cz="${k}" data-v="${c.id}">${esc(c.name)}</span>`).join('') || '<small>ponha personagens no mapa</small>'}</div><div class="row chips">${chips(VEH, (v, l) => `<span class="${cz['v' + k] === v ? 'weak' : ''}" data-cz="v${k}" data-v="${v}">${l}</span>`)}</div>`;
  return `<b>Fugitivo</b>${who('a')}<b>Perseguidor</b>${who('b')}<div class="row"><button data-a="chaseStart" ${cz.a && cz.b && cz.a !== cz.b ? '' : 'disabled'}>Iniciar perseguição</button></div>`;
}
// janela do bestiário: cartões filtráveis, criação em quantidade, encontros salvos, contratos e edição de modelos
function bestWin() {
  const q = bf.q.trim().toLowerCase(), catOf = b => b.cat || (b.boss ? 'chefe' : 'demonio');
  const list = Object.entries(S.bestiary).filter(([, b]) => (!q || b.name.toLowerCase().includes(q)) && (!bf.el || mainEl(b) === bf.el) && (!bf.cat || catOf(b) === bf.cat)).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const chip = (k, v, l, st = '') => `<span class="${bf[k] === v ? 'weak' : ''}" data-a="bfSet" data-k="${k}" data-v="${v}" ${st}>${l}</span>`, nm = e => S.bestiary[e.b]?.name || '?';
  const card = ([id, b]) => { const el = mainEl(b), sks = b.skills.map(k => S.skills[k]?.name).filter(Boolean);
    return `<div class="bcard" style="--e:${ELC[el]}"><div class="bhead"><i>${KANJI[el]}</i><div><b>${esc(b.name)}</b><small>${CAT[catOf(b)]} · ${EL[el]}</small></div></div>
      <div class="bstats"><span>HP <b>${b.hpMax}</b></span><span>XP <b>${b.xpR}</b></span><span>Ouro <b>${b.goldR}</b></span><span>Armadura <b>${b.armor}</b></span></div>
      <small>${b.weak.length ? 'Fraco: ' + b.weak.map(e => EL[e]).join(', ') : 'Sem fraqueza'}${b.resist.length ? ' · Resiste: ' + b.resist.map(e => EL[e]).join(', ') : ''}</small>
      <small class="bsk">${sks.slice(0, 4).map(esc).join(' · ')}${sks.length > 4 ? ` +${sks.length - 4}` : ''}</small>
      <div class="row"><button class="own" data-a="bSpawn" data-id="${id}">Criar ×${+bf.n || 1}</button><button data-a="encAdd" data-id="${id}">+ Encontro</button><button class="ghost" data-a="openSheet" data-id="${id}">Editar</button><button class="ghost" data-a="bContract" data-id="${id}">Contrato</button><button class="ghost" data-a="bDel" data-id="${id}" aria-label="Apagar modelo">×</button></div></div>`; };
  return `<div class="row"><input class="bq" data-bf="q" placeholder="Buscar inimigo…" aria-label="Buscar inimigo" value="${esc(bf.q)}"><label>Quantidade <input type="number" min="1" max="12" data-bf="n" value="${+bf.n || 1}"></label><button data-a="tier">Nível: ${tier}</button><button class="ghost" data-a="content" data-coll="bestiary">Restaurar padrão</button></div>
    <div class="card gen"><h3>Criar sob medida <small>para o grupo na cena: ${partyRef().n} heróis · poder ${partyRef().p}</small></h3>
      <div class="row chips">${Object.keys(KANJI).map(e => `<span class="${gen.el === e ? 'weak' : ''}" data-a="genSet" data-k="el" data-v="${e}" title="${EL[e]}" style="color:${gen.el === e ? '#fff' : ELC[e]}">${KANJI[e]}</span>`).join('')}<i class="sep"></i>${chips(ROLEN, (k, l) => `<span class="${gen.role === k ? 'weak' : ''}" data-a="genSet" data-k="role" data-v="${k}">${l}</span>`)}<i class="sep"></i>${chips(RANKN, (k, l) => `<span class="${gen.rank === k ? 'weak' : ''}" data-a="genSet" data-k="rank" data-v="${k}">${l}</span>`)}</div>
      <div class="row"><button class="own" data-a="foeGen">Criar ${RANKN[gen.rank].toLowerCase()} ×${gen.rank === 'chefe' ? 1 : +bf.n || 1}</button><button class="ghost" data-a="foeGen" data-save="1">Salvar no bestiário</button><i class="sep"></i><b>Encontro automático:</b>${chips(DIFFN, (k, l) => `<button data-a="foeEnc" data-diff="${k}" title="Gera um grupo de inimigos do elemento escolhido, na medida do grupo">${l}</button>`)}</div>
      <small>Atributos, HP, arma e skills saem do poder do grupo. Normal ≈ 2 em 3 vitórias; difícil ≈ metade; mortal ≈ 1 em 5. Chefes do bestiário também são ajustados ao grupo ao serem criados.</small></div>
    <div class="row chips">${chips(CAT, (k, l) => chip('cat', k, l))}<i class="sep"></i>${Object.keys(KANJI).map(e => chip('el', e, KANJI[e], `title="${EL[e]}" style="color:${ELC[e]}"`)).join('')}</div>
    <div class="bgrid">${list.map(card).join('') || '<small>Nenhum inimigo com esse filtro.</small>'}</div>
    <div class="benc"><div class="card"><h3>Montar encontro</h3>${encDraft.map((e, i) => `<div class="row inv"><span>${e.n}× ${esc(nm(e))} <small>${e.tier}</small></span><button class="ghost" data-a="encRm" data-k="${i}" aria-label="Tirar">×</button></div>`).join('') || '<small>Use "+ Encontro" nos cartões; vale a quantidade e o nível escolhidos acima.</small>'}
        ${encDraft.length ? `<div class="row"><input data-bf="enc" placeholder="Nome do encontro" aria-label="Nome do encontro" value="${esc(bf.enc)}"><button class="own" data-a="encSave">Salvar encontro</button></div>` : ''}</div>
      <div class="card"><h3>Encontros salvos</h3>${chips(S.encounters || {}, (id, e) => `<div class="row inv"><span><b>${esc(e.name)}</b> <small>${e.list.map(x => `${x.n}× ${esc(nm(x))}${x.tier === 'normal' ? '' : ' (' + x.tier + ')'}`).join(', ')}</small></span><button class="own" data-a="encSpawn" data-id="${id}">Colocar na cena</button><button class="ghost" data-a="encDel" data-id="${id}" aria-label="Apagar encontro">×</button></div>`) || '<small>Nenhum encontro salvo.</small>'}</div>
      <div class="card"><h3>Contratos de caça</h3>${chips(S.contracts, (id, c) => `<div class="row inv"><span>${c.done ? '✓ ' : ''}${esc(c.target)} <small>${c.gold} ouro · ${c.xp} XP</small></span><button class="ghost" data-a="ctDel" data-id="${id}" aria-label="Remover contrato">×</button></div>`) || '<small>Use "Contrato" no cartão do alvo.</small>'}</div></div>`;
}
function iniWin() {
  const T = S.battle.ticks, ids = Object.keys(T).filter(k => S.chars[k]).sort((a, b) => T[a] - T[b] || a.localeCompare(b)), b = (k, id, l, t) => `<button data-a="ini" data-k="${k}" data-id="${id}" aria-label="${t}" title="${t}">${l}</button>`;
  if (!S.battle.active) return '<small>Nenhuma batalha em andamento.</small>';
  return ids.map((id, i) => `<div class="row inv"><span>${i + 1}. ${esc(S.chars[id].name)} <small>${S.chars[id].hp > 0 ? '' : 'caído · '}tempo <input type="number" class="tin" min="0" aria-label="Tempo de ${esc(S.chars[id].name)}" data-ini="${id}" value="${T[id]}"></small></span>${b('up', id, '▲', 'Adiantar')}${b('down', id, '▼', 'Atrasar')}${b('out', id, '×', 'Tirar da batalha')}</div>`).join('')
    + `<div class="row chips">Incluir: ${Object.values(S.chars).filter(c => !(c.id in T) && c.x != null && c.scene === S.scene && c.hp > 0).map(c => `<span data-a="ini" data-k="in" data-id="${c.id}">+ ${esc(c.name)}</span>`).join('') || '<small>todos já estão na fila</small>'}</div>`;
}

// ===== fichas na tela do mestre: cartão resumido na lista e, na janela própria, as mesmas páginas do jogador mais a aba Mestre =====
const FT = { pers: 'Personagem', hab: 'Habilidades', itens: 'Itens', hist: 'Diário', gm: 'Mestre' }, ftab = {};
const selC = new Set(), qa = { v: 5, st: 'burn', item: '' }; let asking = new Set();
const sheetCard = c => `<div class="scard ${selC.has(c.id) ? 'sel' : ''} ${asking.has(c.id) ? 'asking' : ''}" data-a="selCard" data-id="${c.id}" style="--c:${esc(c.color)}" aria-pressed="${selC.has(c.id)}">
    <div class="sc-h"><i class="chk" aria-hidden="true"></i><b>${esc(c.name)}</b><small>${c.enemy ? 'Inimigo' : esc(c.owner || 'sem dono')}${(c.vinc || []).map(e => ' · ' + PATRON[e]).join('')}</small></div>
    <div class="sc-r">${['hp', 'aura', 'san'].map(k => `<span class="rv ${k}"><em>${L[k]}</em>${edv(c, k, c[k])}<small>/${c[k + 'Max']}</small></span>`).join('')}${c.enemy ? '' : `<span class="rv"><em>XP</em>${edv(c, 'xp', c.xp)}</span><span class="rv"><em>Ouro</em>${edv(c, 'gold', c.gold)}</span>`}</div>
    ${bar('hp', c, true)}<div class="sc-f"><em>${c.hp > 0 ? stList(c) || 'Sem condições' : c.dead ? 'Morto' : 'Caído'}</em><button class="ghost" data-a="openSheet" data-id="${c.id}">Abrir ficha</button>${!c.enemy && c.owner ? `<button class="ghost" data-a="peek" data-k="${esc(c.owner)}" title="Abre a tela de ${esc(c.owner)} em outra aba, só para olhar">Ver como</button><button class="ghost" data-a="peek" data-v="1" data-k="${esc(c.owner)}" title="Abre a tela de ${esc(c.owner)} em outra aba para você jogar por ele">Assumir</button>` : ''}</div></div>`;
// barra de ações rápidas: vale para as fichas selecionadas (uma ou várias)
function fichasWin() {
  const cs = Object.values(S.chars), n = [...selC].filter(id => S.chars[id]).length, dis = n ? '' : 'disabled', grp = (l, list) => list.length ? `<h4>${l}</h4>${list.map(sheetCard).join('')}` : '';
  for (const id of selC) if (!S.chars[id]) selC.delete(id);
  const its = Object.entries(S.items).sort((a, b) => a[1].name.localeCompare(b[1].name));
  return `<div class="bulk"><div class="row"><b>${n ? `${n} selecionada${n > 1 ? 's' : ''}` : 'Clique nas fichas para selecionar'}</b><i class="sep"></i><button class="ghost" data-a="selAll" data-k="h">Heróis</button><button class="ghost" data-a="selAll" data-k="e">Inimigos</button>${n ? '<button class="ghost" data-a="selAll" data-k="">Limpar</button>' : ''}</div>
      <div class="row"><input type="number" min="0" data-qa="v" value="${qa.v}" aria-label="Valor para as ações rápidas">${[['dmg', 'Dano'], ['heal', 'Cura'], ['aura', '+ Aura'], ['san', '+ Sanidade'], ['xp', '+ XP'], ['gold', '+ Ouro']].map(([k, l]) => `<button data-a="bulk" data-k="${k}" ${dis}>${l}</button>`).join('')}<button data-a="bulk" data-k="full" ${dis} title="HP, Aura e Sanidade no máximo; tira ferimentos e condições">Restaurar</button></div>
      <div class="row"><select data-qa="st" aria-label="Condição">${chips(ST, (k, l) => `<option value="${k}" ${qa.st === k ? 'selected' : ''}>${l}</option>`)}</select><button data-a="bulk" data-k="st" ${dis} title="Põe ou tira a condição">Condição</button>
        <select data-qa="item" aria-label="Item">${its.map(([k, i]) => `<option value="${k}" ${qa.item === k ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select><button data-a="bulk" data-k="item" ${dis}>Dar item</button></div>
      <small>Clique em qualquer número de uma ficha para editar; aceita <b>+5</b> ou <b>-12</b>.</small></div>
    ${grp('Heróis', cs.filter(c => !c.enemy)) + grp('Inimigos', cs.filter(c => c.enemy)) || '<small>Crie personagens na janela Cena.</small>'}`;
}
// faixa fixa de pedidos dos jogadores (Enter aprova o primeiro, Delete nega)
const reqUi = {}, AUTOL = { roll: 'Rolagens', act: 'Combate', learn: 'Skills', item: 'Itens', camp: 'Acampamento' }; let lastReqN = 0, mute = ls('vj_mute') === '1';
function reqStrip() {
  const rs = Object.entries(S.reqs).sort((a, b) => a[1].n - b[1].n);
  for (const k in reqUi) if (!S.reqs[k]) delete reqUi[k];
  const card = ([id, r], i) => { const u = reqUi[id] ||= { mod: 0, secret: false }, c = S.chars[r.ch], canMod = r.t === 'roll' || r.t === 'act';
    return `<div class="rq ${id === reqIn ? 'in' : ''}" style="--c:${esc(c?.color || '#888')}"><div class="rq-t"><small>${esc(r.by)} · ${AUTOL[r.cat]}</small><b>${esc(c?.name || '?')}</b><span>${esc(r.text)}</span></div>
      ${canMod ? `<div class="stepper sm" role="group" aria-label="Bônus ou penalidade">${[-20, -10, 0, 10, 20].map(v => `<button data-a="rqMod" data-id="${id}" data-v="${v}" class="${u.mod === v ? 'on' : ''}" aria-pressed="${u.mod === v}">${v > 0 ? '+' + v : v}</button>`).join('')}</div>` : ''}
      ${r.cat === 'roll' ? `<button class="tog ${u.secret ? 'on' : ''}" data-a="rqSecret" data-id="${id}" aria-pressed="${u.secret}" title="Só você vê o resultado">Secreta</button>` : ''}
      <div class="rq-b"><button class="ok" data-a="rqOk" data-id="${id}">Aprovar${i ? '' : ' <kbd>Enter</kbd>'}</button><button class="no" data-a="rqNo" data-id="${id}">Negar${i ? '' : ' <kbd>Del</kbd>'}</button><button class="ghost" data-a="rqWhy" data-id="${id}" title="Negar e dizer o motivo ao jogador">Negar com motivo</button></div></div>`; };
  return `<div class="reqs ${rs.length ? 'has' : ''}"><div class="rq-bar"><b>Pedidos${rs.length ? ` <i>${rs.length}</i>` : ''}</b><span>Aprovar sozinho:</span>${chips(AUTOL, (k, l) => `<button class="tog ${S.auto[k] ? 'on' : ''}" data-a="autoSet" data-k="${k}" data-v="${S.auto[k] ? '' : 1}" aria-pressed="${!!S.auto[k]}" title="${S.auto[k] ? 'Acontece na hora, sem passar por você' : 'Espera a sua aprovação'}">${l}</button>`)}<button class="ghost" data-a="mute" aria-pressed="${mute}">${mute ? 'Som desligado' : 'Som ligado'}</button></div>${rs.map(card).join('')}</div>`;
}
let reqIn = null;
function gmPanel(c) {
  const inp = (f, v, type = 'number') => `<input type="${type}" aria-label="${f}" data-id="${c.id}" data-f="${f}" value="${esc(v)}">`, btn = (a, l) => `<button data-a="${a}" data-id="${c.id}">${l}</button>`, lab = (l, x) => `<label>${l}${x}</label>`;
  return `<section class="gmp"><div class="card"><h3>Atributos</h3><div class="attrs">${A.map(a => lab(a, inp('attrs.' + a, c.attrs[a]))).join('')}</div>
      <h3>Recursos <small>máximo = atributos + bônus</small></h3><div class="fgrid">${['hp', 'aura', 'san'].map(k => lab(L[k], inp(k, c[k])) + lab('bônus máx.', inp('bon.' + k + 'Max', c.bon[k + 'Max']))).join('')}${lab('Limite %', inp('limit', c.limit))}${lab('XP', inp('xp', c.xp))}${lab('Ouro', inp('gold', c.gold))}${lab('Arma base', inp('arma', c.arma))}${lab('Armadura base', inp('armor', c.armor))}
        ${c.enemy ? lab('Recompensa XP', inp('xpR', c.xpR)) + lab('Recompensa ouro', inp('goldR', c.goldR)) : lab('Jogador dono', inp('owner', c.owner, 'text'))}</div></div>
    <div class="card"><h3>Vínculos <small>conceder dá a skill raiz e resistência</small></h3><div class="row chips">${Object.keys(PATRON).filter(e => e !== 'fis').map(e => `<span class="${c.vinc.includes(e) ? 'weak' : ''}" data-a="vinc" data-id="${c.id}" data-el="${e}">${PATRON[e]}</span>`).join('')}</div>
      <h3>Fraquezas e resistências <small>clique alterna normal → fraco → resiste</small></h3><div class="row chips">${chips(EL, (k, l) => `<span class="${c.weak.includes(k) ? 'weak' : c.resist.includes(k) ? 'res' : ''}" data-a="aff" data-id="${c.id}" data-el="${k}">${l}</span>`)}</div>
      <h3>Condições</h3><div class="row chips">${chips(ST, (k, l) => `<span class="${c.st[k] ? 'weak' : ''}" data-a="st" data-id="${c.id}" data-k="${k}">${l}</span>`)}</div></div>
    <div class="card"><h3>Ferimentos <small>clique numa parte para ferir ou curar</small></h3>${bodyFig(c, 'gm')}
      <h3>Ações</h3><div class="row">${btn('horror', 'Teste de horror')}${btn('evolve', 'Evoluir atributos')}${btn('place', c.x == null || c.scene !== S.scene ? 'Pôr no mapa' : 'Tirar do mapa')}${btn('bSave', 'Salvar no bestiário')}${btn('delChar', 'Excluir')}</div></div></section>`;
}
function gmSheet(c) {
  const t = ftab[c.id] || 'pers';
  const page = t === 'pers' ? persPage(c) : t === 'hab' ? skillPage(c) : t === 'itens' ? itemsPage(c) : t === 'gm' ? gmPanel(c)
    : `<section class="card hist"><h3>Diário</h3><textarea aria-label="Diário" data-id="${c.id}" data-f="bio">${esc(c.bio)}</textarea><h3>Notas secretas do mestre</h3><textarea aria-label="Notas do mestre" data-id="${c.id}" data-f="gmNote">${esc(c.gmNote)}</textarea></section>`;
  return `<div class="ftabs">${chips(FT, (k, l) => `<button data-ftab="${k}" data-id="${c.id}" class="${k === t ? 'on' : ''}">${l}</button>`)}</div><div class="fbody">${page}</div>`;
}


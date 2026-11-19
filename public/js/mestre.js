const BOSS_NOMES = { ascensao: 'Ascensão', eclipse: 'Eclipse', tempestade: 'Tempestade', mare: 'Maré', erupcao: 'Erupção', julgamento: 'Julgamento', enxame: 'Enxame', fenda: 'Fenda' };
const bossFxUI = c => { const b = c.bossFx || {}, sel = k => `<select data-id="${c.id}" data-bfx="${k}"><option value="">Pelo elemento</option>${Object.entries(BOSS_NOMES).map(([v, n]) => `<option value="${v}" ${b[k] === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  return `<div class="bossfx"><label>Entrada ${sel('in')}</label><label>Golpe forte ${sel('hit')}</label><label>Cor <input type="color" data-id="${c.id}" data-bfx="col" value="${/^#[0-9a-f]{6}$/i.test(b.col || '') ? b.col : (ELC[mainEl(c)] || '#e4002b')}"></label></div>`; }; // cenas de chefe do motor luminoso
function editor(coll) {
  const cell = (id, o, [, f, t = 'number']) => { const a = `data-ed="${coll}" data-id="${id}" data-f="${f}"`;
    return typeof t === 'object' ? `<select ${a}>${chips(t, (k, l) => `<option value="${k}" ${k === o[f] ? 'selected' : ''}>${l}</option>`)}</select>`
      : `<input type="${t}" ${t === 'number' ? 'step="any"' : ''} ${a} ${t === 'checkbox' ? (o[f] ? 'checked' : '') : `value="${esc(o[f])}"`}>`; };
  return `<section class="panel editor"><table><tr>${ED[coll].map(c => `<th>${c[0]}`).join('')}<th></tr>${chips(S[coll], (id, o) =>
    `<tr>${ED[coll].map(c => `<td>${cell(id, o, c)}`).join('')}<td><button data-a="edDup" data-coll="${coll}" data-id="${id}" title="Duplicar">⧉</button><button data-a="edDel" data-coll="${coll}" data-id="${id}" title="Excluir">×</button></tr>`)}</table><div class="row"><button data-a="edAdd" data-coll="${coll}">+ Novo</button><button data-a="content" data-coll="${coll}">Restaurar padrão</button></div>
    ${coll === 'items' ? `<div class="row chips"><button data-a="shop" data-f="open" data-v="${shop().open ? '' : 1}" class="${shop().open ? 'own' : ''}">Loja de ${esc(S.scenes[S.scene].name)}: ${shop().open ? 'aberta' : 'fechada'}</button><button data-a="shopBasics" title="Põe Pólvora, Sucata, Sal, ervas, papel e outros ingredientes básicos à venda nesta cena">Estocar ingredientes básicos</button>À venda: ${chips(S.items, (k, i) => `<span class="${shop().stock.includes(k) ? 'weak' : ''}" data-a="shop" data-item="${k}">${esc(i.name)}</span>`)}</div>` : ''}</section>`;
}

// menu de contexto do token (clique direito)
function ctxMenu() {
  const c = ctx && S.chars[ctx.id];
  if (!c) return '';
  return `<div class="ctx" style="left:${Math.min(ctx.x, innerWidth - 250)}px;top:${Math.min(ctx.y, innerHeight - (gm ? 330 : 130))}px"><b>${esc(c.name)}</b>${mine(c) ? `<button data-a="openSheet" data-id="${c.id}">Abrir ficha</button>` : ''}<button data-tgt="${c.id}">Marcar como alvo</button>
    ${gm && !c.enemy && c.owner ? `<button data-a="peek" data-k="${esc(c.owner)}" title="Abre a tela de ${esc(c.owner)} em outra aba, só para olhar">Ver como ${esc(c.owner)}</button><button data-a="peek" data-v="1" data-k="${esc(c.owner)}" title="Abre a tela de ${esc(c.owner)} em outra aba para você jogar por ele">Assumir o jogador</button>` : ''}
    ${gm ? `${c.x != null ? `<button data-a="place" data-id="${c.id}">Tirar do mapa</button>` : ''}<button data-a="bSave" data-id="${c.id}">Salvar no bestiário</button><div class="row chips">${chips(ST, (k, l) => `<span class="${c.st[k] ? 'weak' : ''}" data-a="st" data-id="${c.id}" data-k="${k}">${l}</span>`)}</div>` : ''}</div>`;
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
      <div class="row"><button class="own" data-a="bSpawn" data-id="${id}">Criar ×${+bf.n || 1}</button><button data-a="encAdd" data-id="${id}">+ Encontro</button><button class="ghost" data-a="openSheet" data-id="${id}">Editar ficha</button><button class="ghost" data-a="bDup" data-id="${id}" title="Criar uma variante sem alterar este preset">Duplicar preset</button><button class="ghost" data-a="bContract" data-id="${id}">Contrato</button><button class="ghost" data-a="bDel" data-id="${id}" aria-label="Apagar modelo">×</button></div></div>`; };
  return `<div class="row"><input class="bq" data-bf="q" placeholder="Buscar inimigo…" aria-label="Buscar inimigo" value="${esc(bf.q)}"><label>Quantidade <input type="number" min="1" max="12" data-bf="n" value="${+bf.n || 1}"></label><button data-a="tier">Nível: ${tier}</button><button class="own" data-a="bNew" title="Abre uma ficha de inimigo em branco para configurar e salvar como preset">+ Inimigo customizado</button><button class="ghost" data-a="content" data-coll="bestiary">Restaurar padrão</button></div>
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
const FT = { pers: 'Personagem', hab: 'Skills', ofi: 'Ofícios', itens: 'Itens', hist: 'Diário', gm: 'Mestre' }, ftab = {};
const selC = new Set(), qa = { v: 5, st: 'burn', item: '' }; let asking = new Set();
const sheetCard = c => `<div class="scard ${selC.has(c.id) ? 'sel' : ''} ${asking.has(c.id) ? 'asking' : ''}" data-a="selCard" data-id="${c.id}" style="--c:${esc(c.color)}" aria-pressed="${selC.has(c.id)}">
    <div class="sc-h"><i class="chk" aria-hidden="true"></i><b>${esc(c.name)}</b><small>${c.enemy ? 'Inimigo' : esc(c.owner || 'sem dono')}${(c.vinc || []).map(e => ' · ' + PATRON[e]).join('')}</small></div>
    <div class="sc-r">${['hp', 'aura', 'san'].map(k => `<span class="rv ${k}"><em>${L[k]}</em>${edv(c, k, c[k])}<small>/${c[k + 'Max']}</small></span>`).join('')}${c.enemy ? '' : `<span class="rv"><em>XP</em>${edv(c, 'xp', c.xp)}</span><span class="rv"><em>Ouro</em>${edv(c, 'gold', c.gold)}</span>`}</div>
    ${bar('hp', c, true)}<div class="sc-f"><em>${c.hp > 0 ? stList(c) || 'Sem condições' : c.dead ? 'Morto' : 'Caído'}</em><button class="ghost" data-a="openSheet" data-id="${c.id}">Ficha</button><button class="ghost more" data-g="more" data-id="${c.id}" title="Mais ações (ou botão direito no cartão)" aria-label="Mais ações de ${esc(c.name)}">⋯</button>${c.enemy ? `<button class="ghost" data-a="delChar" data-id="${c.id}" title="Remover inimigo" aria-label="Remover ${esc(c.name)}">✕</button>` : ''}</div></div>`;
// barra de ações rápidas: vale para as fichas selecionadas (uma ou várias)
function fichasWin() {
  const cs = Object.values(S.chars), n = [...selC].filter(id => S.chars[id]).length, dis = n ? '' : 'disabled', grp = (l, list) => list.length ? `<h4>${l}${l === 'Inimigos' ? ' <button class="ghost" data-a="delEnemies" data-k="down">Remover caídos</button><button class="ghost" data-a="delEnemies">Remover todos</button>' : ''}</h4>${list.map(sheetCard).join('')}` : '';
  for (const id of selC) if (!S.chars[id]) selC.delete(id);
  const its = Object.entries(S.items).sort((a, b) => a[1].name.localeCompare(b[1].name));
  // as ações em lote só aparecem com alguma ficha selecionada
  return `<div class="bulk ${n ? 'on' : ''}"><div class="row"><b>${n ? `${n} selecionada${n > 1 ? 's' : ''}` : 'Clique nas fichas para agir em lote'}</b><i class="sep"></i><button class="ghost" data-a="selAll" data-k="h">Heróis</button><button class="ghost" data-a="selAll" data-k="e">Inimigos</button>${n ? '<button class="ghost" data-a="selAll" data-k="">Limpar</button>' : ''}</div>
      ${n ? `<div class="row"><input type="number" min="0" data-qa="v" value="${qa.v}" aria-label="Valor para as ações rápidas">${[['dmg', 'Dano'], ['heal', 'Cura'], ['aura', '+ Aura'], ['san', '+ Sanidade'], ['xp', '+ XP'], ['gold', '+ Ouro']].map(([k, l]) => `<button data-a="bulk" data-k="${k}" ${dis}>${l}</button>`).join('')}<button data-a="bulk" data-k="full" ${dis} title="HP, Aura e Sanidade no máximo; tira ferimentos e condições">Restaurar</button></div>
      <div class="row"><select data-qa="st" aria-label="Condição">${chips(ST, (k, l) => `<option value="${k}" ${qa.st === k ? 'selected' : ''}>${l}</option>`)}</select><button data-a="bulk" data-k="st" ${dis} title="Põe ou tira a condição">Condição</button>
        <select data-qa="item" aria-label="Item">${its.map(([k, i]) => `<option value="${k}" ${qa.item === k ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select><button data-a="bulk" data-k="item" ${dis}>Dar item</button></div>` : ''}
      <small>Clique em qualquer número de uma ficha para editar; aceita <b>+5</b> ou <b>-12</b>.</small></div>
    ${grp('Heróis', cs.filter(c => !c.enemy)) + grp('Inimigos', cs.filter(c => c.enemy)) || '<small>Crie personagens na janela Cena.</small>'}`;
}
// faixa fixa de pedidos dos jogadores (Enter aprova o primeiro, Delete nega)
const narrável = r => r.t === 'ofiUse' && globalThis.OFI.PER[String(r.m.node).split('.')[0]]?.nodes.find(n => n.id === r.m.node)?.act === 'checar'; // teste narrativo: o mestre pode escrever o que acontece
const reqUi = {}, AUTOL = { roll: 'Rolagens', act: 'Combate', learn: 'Skills', item: 'Itens', camp: 'Acampamento' }; let lastReqN = 0;
function reqStrip() {
  const rs = Object.entries(S.reqs).sort((a, b) => a[1].n - b[1].n);
  for (const k in reqUi) if (!S.reqs[k]) delete reqUi[k];
  const card = ([id, r], i) => { const u = reqUi[id] ||= { mod: 0, secret: false }, c = S.chars[r.ch], canMod = r.t === 'roll' || r.t === 'act';
    return `<div class="rq ${id === reqIn ? 'in' : ''}" style="--c:${esc(c?.color || '#888')}"><div class="rq-t"><small>${esc(r.by)} · ${AUTOL[r.cat]}</small><b>${esc(c?.name || '?')}</b><span>${esc(r.text)}</span></div>
      ${canMod ? `<div class="stepper sm" role="group" aria-label="Bônus ou penalidade">${[-20, -10, 0, 10, 20].map(v => `<button data-a="rqMod" data-id="${id}" data-v="${v}" class="${u.mod === v ? 'on' : ''}" aria-pressed="${u.mod === v}">${v > 0 ? '+' + v : v}</button>`).join('')}</div>` : ''}
      ${r.cat === 'roll' ? `<div class="stepper sm" role="group" aria-label="Vantagem ou desvantagem">${[['adv', 'Vantagem'], ['dis', 'Desvantagem']].map(([v, l]) => `<button data-a="rqAdv" data-id="${id}" data-v="${v}" class="${u.adv === v ? 'on' : ''}" aria-pressed="${u.adv === v}" title="Rola 2d100 e fica com o ${v === 'adv' ? 'melhor' : 'pior'}">${l}</button>`).join('')}</div>` : ''}
      ${narrável(r) ? `<input class="rq-txt" data-rqtxt="${id}" maxlength="200" placeholder="Narração do resultado (opcional, o jogador lê)" aria-label="Narração do resultado" value="${esc(u.txt || '')}">` : ''}
      ${r.cat === 'roll' ? `<button class="tog ${u.secret ? 'on' : ''}" data-a="rqSecret" data-id="${id}" aria-pressed="${u.secret}" title="Só você vê o resultado">Secreta</button>` : ''}
      <div class="rq-b"><button class="ok" data-a="rqOk" data-id="${id}">Aprovar${i ? '' : ' <kbd>Enter</kbd>'}</button><button class="no" data-a="rqNo" data-id="${id}">Negar${i ? '' : ' <kbd>Del</kbd>'}</button><button class="ghost" data-a="rqWhy" data-id="${id}" title="Negar e dizer o motivo ao jogador">Negar com motivo</button></div></div>`; };
  return `<div class="reqs ${rs.length ? 'has' : ''}"><div class="rq-bar"><b>Pedidos${rs.length ? ` <i>${rs.length}</i>` : ''}</b><span>Aprovar sozinho:</span>${chips(AUTOL, (k, l) => `<button class="tog ${S.auto[k] ? 'on' : ''}" data-a="autoSet" data-k="${k}" data-v="${S.auto[k] ? '' : 1}" aria-pressed="${!!S.auto[k]}" title="${S.auto[k] ? 'Acontece na hora, sem passar por você' : 'Espera a sua aprovação'}">${l}</button>`)}<button class="ghost" data-a="mute" aria-pressed="${snd.mute}">${snd.mute ? 'Som desligado' : 'Som ligado'}</button></div>${rs.map(card).join('')}</div>`;
}
let reqIn = null;
function gmPanel(c) {
  const inp = (f, v, type = 'number') => `<input type="${type}" aria-label="${f}" data-id="${c.id}" data-f="${f}" value="${esc(v)}">`, btn = (a, l) => `<button data-a="${a}" data-id="${c.id}">${l}</button>`, lab = (l, x) => `<label>${l}${x}</label>`;
  return `<section class="gmp"><div class="card"><h3>Atributos</h3><div class="attrs">${A.map(a => lab(a, inp('attrs.' + a, c.attrs[a]))).join('')}</div>
      <h3>Recursos <small>máximo = atributos + bônus</small></h3><div class="fgrid">${['hp', 'aura', 'san'].map(k => lab(L[k], inp(k, c[k])) + lab('bônus máx.', inp('bon.' + k + 'Max', c.bon[k + 'Max']))).join('')}${lab('Limite %', inp('limit', c.limit))}${lab('XP', inp('xp', c.xp))}${lab('Ouro', inp('gold', c.gold))}${lab('Arma base', inp('arma', c.arma))}${lab('Armadura base', inp('armor', c.armor))}
        ${c.enemy ? lab('Recompensa XP', inp('xpR', c.xpR)) + lab('Recompensa ouro', inp('goldR', c.goldR)) + `<label class="check"><input type="checkbox" data-id="${c.id}" data-f="boss" ${c.boss ? 'checked' : ''}> Chefe (escala com o grupo)</label>` + (c.boss ? bossFxUI(c) : '') : lab('Jogador dono', inp('owner', c.owner, 'text'))}</div></div>
    <div class="card"><h3>Despertares <small>selos narrativos que liberam nós</small></h3><div class="row chips">${Object.entries(RULES.AW).map(([k, n]) => `<span class="${(c.aw || []).includes(k) ? 'weak' : ''}" data-a="aw" data-id="${c.id}" data-k="${k}">${esc(n)}</span>`).join('')}</div>
      <label>Natureza de Aura <select data-id="${c.id}" data-f="nen"><option value="">— (a primeira categoria aprendida)</option>${RULES.NEN.map(k => `<option value="${k}" ${c.nen === k ? 'selected' : ''}>${RULES.NENN[k]}</option>`).join('')}</select></label></div>
    <div class="card"><h3>Vínculos <small>conceder dá a skill raiz e resistência</small></h3><div class="row chips">${Object.keys(PATRON).filter(e => !['fis', 'aura', 'oculto'].includes(e)).map(e => `<span class="${c.vinc.includes(e) ? 'weak' : ''}" data-a="vinc" data-id="${c.id}" data-el="${e}">${PATRON[e]}</span>`).join('')}</div>
      <h3>Fraquezas e resistências <small>clique alterna normal → fraco → resiste</small></h3><div class="row chips">${chips(EL, (k, l) => `<span class="${c.weak.includes(k) ? 'weak' : c.resist.includes(k) ? 'res' : ''}" data-a="aff" data-id="${c.id}" data-el="${k}">${l}</span>`)}</div>
      <h3>Condições</h3><div class="row chips">${chips(ST, (k, l) => `<span class="${c.st[k] ? 'weak' : ''}" data-a="st" data-id="${c.id}" data-k="${k}">${l}</span>`)}</div></div>
    <div class="card"><h3>Ferimentos <small>clique numa parte para ferir ou curar</small></h3>${bodyFig(c, 'gm')}
      <h3>Ações</h3><div class="row">${btn('horror', 'Teste de horror')}${btn('evolve', 'Evoluir atributos')}${btn('place', c.x == null || c.scene !== S.scene ? 'Pôr no mapa' : 'Tirar do mapa')}${btn('bSave', 'Salvar no bestiário')}${btn('delChar', 'Excluir')}</div></div></section>`;
}

// ===== Ofícios (perícias): aba própria, pontos de ofício e ações de exploração =====
const OFI = globalThis.OFI, oUi = {}, oOpen = {};
const CAMPX = { afiar: 'Afiar a arma (+3 no ataque básico)', armadilha: 'Preparar armadilha', cantar: 'Cantar (Sanidade do grupo)' };
const campExtra = c => Object.fromEntries((c.pof || []).map(id => OFI.PER[id.split('.')[0]]?.nodes.find(n => n.id === id)).filter(n => n?.camp && CAMPX[n.camp]).map(n => [n.camp, CAMPX[n.camp]]));
function oficiosPage(c) {
  const ini = c.ofi || [], mineC = !c.enemy && (gm || mine(c)), inv = Object.entries(c.inv).filter(([k]) => S.items[k]);
  const ally = Object.values(S.chars).filter(o => !o.enemy && !o.dead), foes = Object.values(S.chars).filter(o => o.enemy);
  const sel = (nid, f, opts, ph) => `<select data-ou="${nid}:${f}" aria-label="${ph}"><option value="">${ph}</option>${opts.map(([v, l]) => `<option value="${v}" ${oUi[nid]?.[f] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const itemsOf = pred => inv.filter(([k]) => pred(S.items[k])).map(([k]) => [k, S.items[k].name + (c.up?.[k]?.t ? ` +${c.up[k].t}` : '')]);
  const form = n => { // parâmetros de cada ação
    const A = n.act, W = i => i.type === 'arma', ALL = i => ['arma', 'armadura', 'acess'].includes(i.type);
    if (A === 'avaliar') return sel(n.id, 'item', itemsOf(i => ['arma', 'armadura', 'acess', 'cons'].includes(i.type)), 'Item');
    if (A === 'reciclar') return sel(n.id, 'item', itemsOf(i => ['arma', 'armadura', 'acess', 'cons'].includes(i.type)), 'Item a desmontar');
    if (A === 'temperar') return sel(n.id, 'item', itemsOf(ALL), 'Peça');
    if (A === 'engastar') return sel(n.id, 'item', itemsOf(W), 'Arma') + sel(n.id, 'rune', inv.filter(([k]) => S.items[k].rune).map(([k]) => [k, S.items[k].name]), 'Runa');
    if (A === 'ligar') return sel(n.id, 'item', itemsOf(W), 'Arma') + sel(n.id, 'el2', Object.keys(OFI.ELST).map(e => [e, PATRON[e]]), 'Segundo elemento');
    if (A === 'assinar') return sel(n.id, 'item', itemsOf(W), 'Arma') + sel(n.id, 'sig', OFI.SIG.map((s, i) => [String(i), `${s.n} (${RULES.modText(s.m)})`]), 'Bônus') + `<input data-ou="${n.id}:nm" placeholder="Nome da peça" value="${esc(oUi[n.id]?.nm || '')}" aria-label="Nome da peça">`;
    if (A === 'vivo') return sel(n.id, 'item', itemsOf(W), 'Arma');
    if (A === 'tratar') return sel(n.id, 'target', ally.map(o => [o.id, o.name]), 'Paciente') + (n.v < 3 ? sel(n.id, 'part', Object.entries(PL).map(([k, l]) => [k, l]), 'Parte do corpo') : '');
    if (A === 'estabilizar') return sel(n.id, 'target', ally.filter(o => o.hp <= 0).map(o => [o.id, o.name]), 'Caído');
    if (A === 'identificar') return sel(n.id, 'target', foes.map(o => [o.id, o.name]), 'Inimigo');
    if (A === 'esfolar') return sel(n.id, 'target', foes.filter(o => o.dead && !o.skinned).map(o => [o.id, o.name]), 'Abatido');
    return '';
  };
  const nodeBtn = (p, n) => { const own = (c.pof || []).includes(n.id), why = own ? '' : OFI.whyNot(c, n.id);
    const info = [n.po + ' PO', n.act && 'ação', n.rec && 'receita', n.camp && 'acampamento', n.comp && 'companheiro', n.hk && 'passivo', n.r && `+${n.r} rolagens`, n.ex && 'escolha excludente'].filter(Boolean).join(' · ');
    return `<div class="onode ${own ? 'own' : why ? 'lock' : 'av'}" title="${esc(own ? n.d : why || n.d)}"><b>${esc(n.n)}</b><small>${esc(n.d)}</small><i>${own ? 'Aprendido' : info}</i>${own || !mineC ? '' : `<button data-a="ofiLearn" data-id="${c.id}" data-node="${n.id}" ${why ? 'disabled' : ''}>${why ? esc(why) : 'Aprender'}</button>`}${gm ? `<button class="ghost" data-a="ofiGive" data-id="${c.id}" data-node="${n.id}" title="Sem custo (mestre)">${own ? '−' : '+'}</button>` : ''}</div>`; };
  const perCard = id => {
    const p = OFI.PER[id], g = OFI.grau(c, id), learnedN = OFI.learned(c, id), acts = learnedN.filter(n => n.act), recs = OFI.recipes(c, id);
    const have = (k, q) => (c.inv[Object.keys(S.items).find(i => S.items[i].name === k)] || 0) >= q;
    return `<details class="card oper" data-oper="${id}" ${oOpen[id] !== false ? 'open' : ''}><summary><b>${esc(p.n)}</b> <small>${g ? OFI.GRAU[g] : 'Iniciado'} · rolagem ${p.a.join('/')} +${OFI.rollBonus(c, id)}%</small></summary><p class="hint">${esc(p.d)}</p>
      ${[1, 2, 3].map(t => `<h4>${OFI.GRAU[t]}</h4><div class="onodes">${p.nodes.filter(n => n.t === t && (!n.off || gm || (c.pof || []).includes(n.id))).map(n => nodeBtn(p, n)).join('')}</div>`).join('')}
      ${acts.length && mineC ? `<h4>Ações <small>${S.battle.active ? 'fora de combate' : 'rola a perícia; o mestre pode aprovar'}</small></h4>${acts.map(n => `<div class="oact"><b>${esc(n.n)}</b>${form(n)}<button data-a="ofiUse" data-id="${c.id}" data-node="${n.id}" ${S.battle.active && n.act !== 'identificar' ? 'disabled' : ''}>Usar</button></div>`).join('')}` : ''}
      ${recs.length && mineC ? `<h4>Receitas</h4><div class="orec">${recs.map(r => `<div class="oact"><b>${esc(r.n)}</b><small>${Object.entries(r.mats).map(([k, q]) => `<span class="${have(k, q) ? 'ok' : 'no'}">${q}× ${esc(k)}</span>`).join(' · ')}${r.mealD ? ' → ' + esc(r.mealD) : ''}</small><button data-a="craft" data-id="${c.id}" data-rec="${r.id}" ${S.battle.active ? 'disabled' : ''}>Preparar</button></div>`).join('')}</div>` : ''}</details>`;
  };
  const dia = (c.dia || []).slice().reverse(), semNarr = dia.filter(e => !e.t).length;
  const diario = dia.length ? `<details class="card odia" ${oOpen.dia !== false ? 'open' : ''} data-oper="dia"><summary><b>Diário de testes</b> <small>${dia.length} registro(s)${gm && semNarr ? ` · ${semNarr} sem narração` : ''}</small></summary><p class="hint">O resultado dos testes narrativos (Arrombar, Intimidar, Invenção…). O mestre escreve o que aconteceu.</p><ul class="dia">${dia.slice(0, 20).map(e => `<li class="${e.ok ? 'ok' : 'no'}"><b>${esc(e.a)}</b> <i>${esc(OFI.PER[e.p]?.n || '')} · ${e.r}${e.g ? ` · ${e.g > 0 ? '+' : ''}${e.g} ouro` : ''}</i>${gm ? `<input data-nota="${e.i}" data-id="${c.id}" maxlength="200" placeholder="Narração do resultado" aria-label="Narração de ${esc(e.a)}" value="${esc(e.t)}"><button class="ghost" data-a="ofiNota" data-id="${c.id}" data-k="${e.i}" title="Apagar o registro">×</button>` : e.t ? `<p>${esc(e.t)}</p>` : '<small>O mestre ainda não narrou o resultado.</small>'}</li>`).join('')}</ul></details>` : '';
  const rr = OFI.hook(c, 'rr'), left = Math.max(0, rr - (c.rrUsed || 0));
  return `<section class="ofi"><div class="card"><h3>Ofícios <small>perícias de exploração e passivas; o mestre concede a Iniciação</small></h3>
    <div class="row"><span class="rv"><em>PO</em>${edv(c, 'po', c.po || 0)}</span><small>Pontos de Ofício: ganhos com sucessos nas rolagens de perícia ou dados pelo mestre.</small>${rr ? `<button data-a="reroll" data-id="${c.id}" ${left || OFI.hook(c, 'rrSor') ? '' : 'disabled'} title="Repete a última rolagem de atributo">Rolar de novo (${left}/${rr})</button>` : ''}</div>
    ${gm ? `<h4>Iniciações <small>(mestre)</small></h4><div class="row chips">${chips(Object.fromEntries(OFI.order.map(k => [k, OFI.PER[k].n])), (k, l) => `<span class="${ini.includes(k) ? 'weak' : ''}" data-a="ofiAw" data-id="${c.id}" data-per="${k}">${l}</span>`)}</div>` : ''}</div>
    ${diario}${ini.length ? ini.map(perCard).join('') : '<p class="card none">Nenhuma Iniciação ainda. O mestre concede a Iniciação em cada perícia quando fizer sentido na história.</p>'}</section>`;
}
// ===== janela do mestre: catálogo de ofícios (receitas, perícias e nós), guardado como diferenças sobre o padrão =====
const oc = { tab: 'rec', per: '', rec: '', d: null, nn: { n: '', d: '', t: 1, po: 2, r: 0, chk: false, g: 0 }, pp: 'alquimia' };
const ocMods = { atk: 'dano', def: 'defesa', agi: 'velocidade', hit: 'acerto', crit: 'crítico' };
const ocDraft = r => ({ id: r.id, n: r.n, per: r.per, t: r.t, out: r.out || '', mats: Object.entries(r.mats), dc: r.dc, qty: r.qty, meal: r.meal ? { ...r.meal } : null, off: !!r.off, custom: !!r.custom });
const ocCusto = d => d.mats.reduce((a, [n, q]) => a + q * (Object.values(S.items).find(i => i.name === n)?.price || 0), 0);
// ----- Forja de armas (mestre): modelos, ajuste fino do ataque básico, técnicas próprias e orçamento -----
const wf = { tpl: 'sabre', lvl: 0, cat: 'basica', el: '', id: '', d: null, imp: null };
// exportar: arquivo .json com os rascunhos das armas; importar: arquivo ou texto colado, com prévia antes de confirmar
const wfOut = i => { const d = wDraft(i); delete d.id; delete d.eff; delete d.attr; delete d.base; delete d.sfxFrom; return d; };
function wfDownload(file, arr) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ formato: 'virtualJRPG-armas', v: 1, armas: arr }, null, 1)], { type: 'application/json' })); a.download = file; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
function wfImpParse(text) {
  let list = [], err = '';
  try { const j = JSON.parse(text); list = Array.isArray(j) ? j : Array.isArray(j?.armas) ? j.armas : j && typeof j === 'object' ? [j] : []; } catch (e) { err = 'Texto não é um JSON válido: ' + e.message; }
  wf.imp = { text, err: err || (list.length ? '' : 'Nenhuma arma encontrada.'), list: list.filter(x => x && typeof x === 'object').slice(0, 200).map(d => { try { const { w, errs } = ARMAS.clean(d); return { d, w, errs }; } catch (e) { return { d, w: { name: String(d.name || '?'), wt: 'lamina', cat: 'basica', power: 0, sk: [] }, errs: [e.message] }; } }) };
}
const SKD = s => ({ name: s.name, kind: s.kind, attr: s.attr || '', el: s.el || 'fis', power: s.power || 0, cost: s.cost || 0, res: s.res || 'aura', ct: s.ct || 100, hits: s.hits || 1, area: !!s.area, tg: s.tg || '', uses: s.uses || 0,
  fxs: s.fxs ?? RULES.fxSrc(s.fx), fms: s.fms ?? RULES.formSrc(s.form), d: s.d || '', payHp: s.pay?.hp || 0 }); // técnica → rascunho editável
const wDraft = w => ({ ...structuredClone(w), sk: (w.sk || []).map(SKD) });
const wfNew = () => { wf.d = wDraft(ARMAS.make(wf.tpl, { lvl: wf.lvl, cat: wf.cat, el: wf.el })); wf.id = ''; };
function armasWin() {
  if (!wf.d) wfNew();
  const D = wf.d; let w, errs; try { ({ w, errs } = ARMAS.clean(D)); } catch (e) { w = { ...D, sk: [] }; errs = [e.message]; }
  const sel = (f, v, opts, lab = '') => `<select data-wf="${f}" ${lab ? `aria-label="${esc(lab)}"` : ''}>${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const num = (f, v, mn, mx) => `<input type="number" class="sm" data-wf="${f}" min="${mn}" max="${mx}" value="${v ?? 0}">`;
  const txt = (f, v, ph = '', cls = 'w', mx = 160) => `<input class="${cls}" data-wf="${f}" maxlength="${mx}" value="${esc(v ?? '')}" placeholder="${esc(ph)}">`;
  const chk = (f, v, l) => `<label class="wchk"><input type="checkbox" data-wf="${f}" ${v ? 'checked' : ''}> ${l}</label>`;
  const AT = ARMAS.ATTRS.map(a => [a, a]), ELO = [['', '— físico'], ...Object.entries(EL).filter(([k]) => k !== 'fis')], STO = [['', '— nenhuma'], ...Object.entries(ST)], M0 = ARMAS.MOD[wf.tpl], T0 = ARMAS.TIPOS[D.wt];
  const gal = Object.entries(ARMAS.TIPOS).map(([t, T]) => `<div class="wgal"><em title="${esc(T.d)}">${esc(T.n)}</em>${Object.values(ARMAS.MOD).filter(m => m.wt === t).map(m => `<button class="${wf.tpl === m.id ? 'on' : ''}" data-a="wfTpl" data-k="${m.id}" title="${esc(m.d)}">${esc(m.n)}</button>`).join('')}</div>`).join('');
  const r = ARMAS.rel(w), [lo, hi] = ARMAS.faixaOf(w), cls = r < lo ? 'low' : r > hi ? 'high' : 'ok';
  const skRow = (x, n) => `<div class="wskr"><div class="row">${txt(`sk.${n}.name`, x.name, 'Nome', '', 40)}${sel(`sk.${n}.kind`, x.kind, [['dmg', 'Dano'], ['mental', 'Dano mental'], ['heal', 'Cura'], ['util', 'Suporte'], ['form', 'Transformação']], 'Tipo')}${sel(`sk.${n}.attr`, x.attr, [['', 'atributo da arma'], ...AT], 'Atributo')}${sel(`sk.${n}.el`, x.el, [['fis', 'Físico (herda o da arma)'], ...ELO.slice(1)], 'Elemento')}<button class="ghost" data-a="wfSkDel" data-k="${n}" aria-label="Tirar técnica">×</button></div>
    <div class="row"><label>Poder ${num(`sk.${n}.power`, x.power, 0, 99)}</label><label>Custo ${num(`sk.${n}.cost`, x.cost, 0, 99)}</label>${sel(`sk.${n}.res`, x.res, [['aura', 'Aura'], ['san', 'Sanidade']], 'Recurso')}<label>Tempo % ${num(`sk.${n}.ct`, x.ct, 40, 200)}</label><label>Golpes ${num(`sk.${n}.hits`, x.hits, 1, 8)}</label><label>Usos/batalha ${num(`sk.${n}.uses`, x.uses, 0, 9)}</label><label>% HP ${num(`sk.${n}.payHp`, x.payHp, 0, 30)}</label>${chk(`sk.${n}.area`, x.area, 'área')}${chk(`sk.${n}.tg`, x.tg === 'self', 'em si')}</div>
    <div class="row"><label class="g">Efeitos ${txt(`sk.${n}.fxs`, x.fxs, 'st bleed 3 50%; pierce 50; exec 30 1.5')}</label>${x.kind === 'form' ? `<label class="g">Forma ${txt(`sk.${n}.fms`, x.fms, 'dur 3; hit 15; crit 10')}</label>` : ''}</div><div class="row"><label class="g">Descrição ${txt(`sk.${n}.d`, x.d, 'O que a técnica faz, na voz do mundo', 'w', 200)}</label></div></div>`;
  const q = (bf.wsq || '').trim().toLowerCase(), found = q.length >= 2 ? Object.entries(S.skills).filter(([, s]) => ['dmg', 'mental', 'heal', 'util', 'form'].includes(s.kind) && !s.dom && !s.trio && !s.duo && !s.summon && s.name.toLowerCase().includes(q)).slice(0, 12) : [];
  const wq = (bf.wq || '').trim().toLowerCase(), list = Object.entries(S.items).filter(([, i]) => i.type === 'arma' && (!wq || i.name.toLowerCase().includes(wq) || (WT[i.wt] || '').toLowerCase().includes(wq))).sort((a, b) => (a[1].wt || '').localeCompare(b[1].wt || '') || a[1].power - b[1].power);
  return `<div class="wforge"><div class="wf-ed">
    <h4>1. Modelo <small>clique para começar uma arma nova a partir dele</small></h4><div class="wgals">${gal}</div>
    <div class="row"><label>Nível ${sel('_lvl', wf.lvl, ARMAS.NIVEIS.map((n, i) => [i, `${n.n} (+${n.p} de poder)`]))}</label><label>Categoria ${sel('_cat', wf.cat, Object.entries(ARMAS.CATS).map(([k, c]) => [k, c[0]]))}</label><label>Elemento ${sel('_el', wf.el, ELO)}</label><button class="ghost" data-a="wfApply" title="Refaz o rascunho com o modelo, o nível, a categoria e o elemento escolhidos">Refazer do modelo</button></div>
    <small class="hint">${esc(M0 ? M0.n + ': ' + M0.d : '')} ${esc(ARMAS.CATS[wf.cat][1])}</small>
    <h4>2. Arma ${wf.id ? `<small>editando <b>${esc(S.items[wf.id]?.name || '')}</b></small>` : '<small>rascunho novo</small>'}</h4>
    <div class="row"><label class="g">Nome ${txt('name', D.name, 'Nome da arma', 'w', 60)}</label><label>Tipo ${sel('wt', D.wt, Object.entries(ARMAS.TIPOS).map(([k, t]) => [k, t.n]))}</label><label>Categoria ${sel('cat', D.cat, Object.entries(ARMAS.CATS).map(([k, c]) => [k, c[0]]))}</label></div>
    <div class="row"><label>Poder ${num('power', D.power, 0, 99)}</label><label>Preço ${num('price', D.price, 0, 99999)}</label><label>Elemento ${sel('el', D.el, ELO)}</label><label>Nível ${sel('lvl', D.lvl, ARMAS.NIVEIS.map((n, i) => [i, n.n]))}</label></div>
    <h4>3. Ataque básico <small>${esc(T0?.d || '')}</small></h4>
    <div class="row"><label>Nome ${txt('atkN', D.atkN, 'Ataque', '', 30)}</label><label>Atributo ${sel('wa', D.wa, [['', `do tipo (${T0?.wa || 'FOR'})`], ...AT])}</label><label>2º atributo ${sel('wa2', D.wa2, [['', '— nenhum'], ...AT])}</label></div>
    <div class="row"><label>Acerto ${num('hit', D.hit, -50, 50)}</label><label>Crítico ${num('crit', D.crit, 0, 50)}</label><label>Tempo % ${num('ct', D.ct || 100, 40, 200)}</label><label>Golpes ${num('hits', D.hits || 1, 1, 6)}</label><label>Perfura % ${num('pierce', D.pierce, 0, 100)}</label><label title="Chance de bloquear um golpe físico único de inimigo: −60% de dano e sem condições">Bloqueio % ${num('block', D.block, 0, 60)}</label>${chk('area', D.area, 'em área')}${chk('dupla', D.dupla, 'em par (2º golpe a 50%)')}${chk('mental', D.mental, 'fere a Sanidade')}</div>
    <div class="row"><label>Condição ${sel('st', D.st, STO)}</label><label>Chance % ${num('stc', D.st ? D.stc ?? 100 : 0, 0, 100)}</label><label>Turnos ${num('stn', D.stn || 3, 1, 6)}</label></div>
    <div class="row"><label class="g">Efeitos ${txt('fx', D.fx, 'exec 30 1.5; vs bleed 1.3; push 20; drain hp 20; st marked 2 30%')}</label></div>
    <div class="row"><label class="g">Bônus empunhada ${txt('mod', D.mod, 'def 5; agi -5; FOR 3', 'w', 80)}</label><label>Requisito ${txt('rq', D.rq, 'FOR 50', '', 40)}</label></div>
    <div class="row"><label class="g">Descrição ${txt('d', D.d, 'De onde veio, como é', 'w', 200)}</label></div>
    <h4>4. Técnicas da arma <small>${D.sk.length}/4 · só existem com ela equipada; elemento Físico herda o da arma e a têmpera soma no poder</small></h4>
    ${D.sk.map(skRow).join('') || '<small>Nenhuma técnica: a arma só melhora o ataque básico.</small>'}
    <div class="row"><button class="ghost" data-a="wfSkAdd" ${D.sk.length >= 4 ? 'disabled' : ''}>+ Técnica nova</button><input class="bq" data-bf="wsq" placeholder="Copiar da árvore: digite o nome…" aria-label="Copiar técnica da árvore" value="${esc(bf.wsq || '')}"></div>
    ${found.length ? `<div class="row chips">${found.map(([k, s]) => `<span data-a="wfSkCopy" data-id="${k}" title="${esc(desc(s))}">+ ${esc(s.name)}</span>`).join('')}</div>` : ''}
    <h4>5. Pacotes de traços <small>${(D.pk || []).length}/3 · empilham em cima desta arma (uma qualidade e um elemento no máximo); "Refazer do modelo" desfaz</small></h4>
    ${Object.entries(ARMAS.PKG).map(([g, l]) => `<div class="wgal"><em>${esc(l)}</em>${Object.values(ARMAS.PK).filter(p => p.grp === g).map(p => `<button class="${(D.pk || []).includes(p.id) ? 'on' : ''}" data-a="wfPk" data-k="${p.id}" title="${esc(p.d)}">${esc(p.n)}</button>`).join('')}</div>`).join('')}
    ${wf.id ? `<h4>6. Variantes elementais <small>cria cópias elementais da arma <b>salva</b> (nome “${esc(S.items[wf.id]?.name || '')} de …”); as que já existem são puladas</small></h4><div class="row chips">${Object.keys(ARMAS.ELST).slice(0, 9).map(e => `<span data-a="wfVar" data-k="${e}" style="border-color:${ELC[e]}">${esc((EL[e] || e).split('·')[0])}</span>`).join('')}<span class="weak" data-a="wfVar" data-k="all">As 9 de uma vez</span></div>` : ''}
    <div class="row wsave">${wf.id ? '<button class="own" data-a="wfSave">Salvar alterações</button><button data-a="wfSaveNew">Salvar como arma nova</button>' : '<button class="own" data-a="wfSaveNew">Criar arma</button>'}<button class="ghost" data-a="wfApply">Descartar e voltar ao modelo</button></div>
  </div><div class="wf-side">
    <div class="wprev"><em>Prévia</em><b>${esc(w.name)}</b><small>${esc(idesc(w))}</small><small class="wtr">${esc(wpnLine(w))}</small>
      <div class="wbar ${cls}"><i style="width:${Math.min(100, r / 1.8)}%"></i><span>Orçamento do ataque: <b>${r}%</b> do sabre simples do mesmo nível · faixa ${esc(CATN[w.cat] || '')}${ARMAS.SUP.has(w.wt) ? ' (arma de apoio)' : ''}: ${lo}–${hi}%</span></div>
      ${w.sk.map(x => `<small class="wsk"><b>${esc(x.name)}</b> ${esc(desc(x))}</small>`).join('')}${errs.length ? `<p class="warn">${errs.map(esc).join('<br>')}</p>` : ''}</div>
    <h4>Armas da campanha <small>${list.length}</small></h4><input class="bq" data-bf="wq" placeholder="Buscar por nome ou tipo…" aria-label="Buscar arma" value="${esc(bf.wq || '')}">
    <div class="row"><button class="ghost" data-a="wfExpAll" title="Baixa um .json com as armas da lista (respeita a busca)">⬇ Exportar ${list.length}</button><button class="ghost ${wf.imp ? 'on' : ''}" data-a="wfImpT">⬆ Importar</button></div>
    ${wf.imp ? wfImpPanel() : ''}
    <div class="orows">${list.map(([k, i]) => `<div class="wrow ${wf.id === k ? 'on' : ''}"><button class="orow ${wf.id === k ? 'on' : ''}" data-a="wfEdit" data-id="${k}"><b>${esc(i.name)}</b><small>${esc(WT[i.wt] || '—')} · ${esc(CATN[i.cat] || 'sem modelo')} · poder ${i.power} · ${ARMAS.rel(i)}%${(i.sk || []).length ? ` · ${i.sk.length} técnica(s)` : ''}</small></button><span class="wact"><button class="ghost" data-a="wfDup" data-id="${k}" title="Duplicar e editar: abre uma cópia no editor" aria-label="Duplicar ${esc(i.name)}">⧉</button><button class="ghost" data-a="wfExp" data-id="${k}" title="Baixar esta arma (.json)" aria-label="Exportar ${esc(i.name)}">⬇</button></span></div>`).join('')}</div>
  </div></div>`;
}
function wfImpPanel() {
  const I = wf.imp, ok = I.list.length;
  return `<div class="wimp"><small>Cole o texto de um arquivo exportado (ou de uma só arma) ou carregue o .json. Nada é criado antes de você confirmar.</small>
    <textarea data-wf="_imptxt" rows="4" placeholder='{"formato":"virtualJRPG-armas","armas":[…]}' aria-label="Texto das armas a importar">${esc(I.text)}</textarea>
    <div class="row"><label class="up">Carregar .json<input type="file" accept=".json,application/json" data-wfup="1"></label><button class="ghost" data-a="wfImpX">Fechar</button></div>
    ${I.err ? `<p class="warn">${esc(I.err)}</p>` : ''}
    ${ok ? `<div class="wimpl">${I.list.map(x => `<div class="${x.errs.length ? 'bad' : ''}" title="${esc(x.errs.join(' · '))}"><b>${esc(x.w.name)}</b><small>${esc(WT[x.w.wt] || '—')} · ${esc(CATN[x.w.cat] || '')} · poder ${x.w.power} · ${ARMAS.rel(x.w)}%${x.errs.length ? ` · ${x.errs.length} correção(ões)` : ''}</small></div>`).join('')}</div>
    <button class="own" data-a="wfImpGo">Importar ${ok} arma(s)${I.list.some(x => x.errs.length) ? ' (com as correções)' : ''}</button>` : ''}</div>`;
}
function wfChange(f, v) {
  if (f === '_imptxt') { wfImpParse(v); return render(); }
  if (['_lvl', '_cat', '_el'].includes(f)) { wf[f.slice(1)] = f === '_lvl' ? +v : v; if (!wf.id) wfNew(); return render(); }
  const m = f.match(/^sk\.(\d+)\.(\w+)$/);
  if (m) { const x = wf.d.sk[+m[1]]; if (x) x[m[2]] = m[2] === 'tg' ? (v ? 'self' : '') : v; return render(); }
  wf.d[f] = v; if (f === 'name') { wf.d.base = v; wf.d.sfxFrom = (wf.d.pk || []).length; } // renomear à mão recomeça o sufixo dos pacotes
  return render();
}
function wfClick(d) {
  if (d.a === 'wfTpl') { wf.tpl = d.k; wfNew(); }
  else if (d.a === 'wfApply') wfNew();
  else if (d.a === 'wfEdit') { const i = S.items[d.id]; if (!i) return; wf.id = d.id; wf.d = wDraft(i); if (ARMAS.MOD[i.tpl]) wf.tpl = i.tpl; }
  else if (d.a === 'wfPk') { const e = ARMAS.applyPack(wf.d, d.k); if (e) toast(e, 'no'); }
  else if (d.a === 'wfDup') { const i = S.items[d.id]; if (!i) return; wf.d = wDraft(i); wf.id = ''; wf.d.name = (i.name + ' (cópia)').slice(0, 60); wf.d.base = wf.d.name; wf.d.sfxFrom = (wf.d.pk || []).length; if (ARMAS.MOD[i.tpl]) wf.tpl = i.tpl; setTimeout(() => document.querySelector('.win[data-win=armas] .win-body')?.scrollTo(0, 0)); toast(`Cópia de ${i.name} aberta no editor.`, 'ok'); }
  else if (d.a === 'wfVar') return send({ t: 'wpnVar', id: wf.id, el: d.k });
  else if (d.a === 'wfExp') { const i = S.items[d.id]; if (i) wfDownload(`arma-${i.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.json`, [wfOut(i)]); return; }
  else if (d.a === 'wfExpAll') { const q = (bf.wq || '').trim().toLowerCase(), l = Object.values(S.items).filter(i => i.type === 'arma' && (!q || i.name.toLowerCase().includes(q) || (WT[i.wt] || '').toLowerCase().includes(q))); wfDownload(`armas-${l.length}.json`, l.map(wfOut)); return; }
  else if (d.a === 'wfImpT') wf.imp = wf.imp ? null : { text: '', err: '', list: [] };
  else if (d.a === 'wfImpX') wf.imp = null;
  else if (d.a === 'wfImpGo') { const l = (wf.imp?.list || []).map(x => x.d); for (let i = 0; i < l.length; i += 10) send({ t: 'wpnImport', list: l.slice(i, i + 10) }); wf.imp = null; } // lotes pequenos: o limite de uma mensagem é 64 KB
  else if (d.a === 'wfSkAdd') { if (wf.d.sk.length < 4) wf.d.sk.push(SKD({ name: 'Técnica nova', kind: 'dmg', power: 12, cost: 4 })); }
  else if (d.a === 'wfSkDel') wf.d.sk.splice(+d.k, 1);
  else if (d.a === 'wfSkCopy') { const s = S.skills[d.id]; if (s && wf.d.sk.length < 4) { wf.d.sk.push(SKD({ ...s, attr: s.attr })); bf.wsq = ''; } }
  else if (d.a === 'wfSave') return send({ t: 'wpnSave', id: wf.id, w: wf.d });
  else if (d.a === 'wfSaveNew') return send({ t: 'wpnSave', w: wf.d });
  return render();
}
function ofcatWin() {
  const O = OFI, tab = (k, l) => `<button class="${oc.tab === k ? 'on' : ''}" data-a="ocTab" data-k="${k}" aria-pressed="${oc.tab === k}">${l}</button>`;
  const changed = Object.keys(S.ofiCfg || {}).length;
  const head = `<div class="seg ocseg">${tab('rec', 'Receitas')}${tab('per', 'Perícias e nós')}</div><div class="ocnote">Edições valem para todos os jogadores na hora e ficam salvas na campanha. O catálogo padrão (<code>public/oficios.js</code>) não é alterado: restaurar volta ao original.${changed ? ` <button class="ghost" data-a="ocReset">Restaurar tudo (${Object.keys(S.ofiCfg).length} grupo(s) editados)</button>` : ''}</div>`;
  const sel = (f, v, opts) => `<select data-oc="${f}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const num = (f, v, mn, mx, cls = '') => `<input type="number" class="${cls}" data-oc="${f}" min="${mn}" max="${mx}" value="${v}">`;
  if (oc.tab === 'rec') {
    const perOpts = [['', 'Todas as perícias'], ...O.order.map(k => [k, O.PER[k].n])], L = Object.values(O.REC).filter(r => !oc.per || r.per === oc.per);
    const row = r => { const b = O.base.REC[r.id], ed = !b ? 'nova' : S.ofiCfg?.rec?.[r.id] ? 'editada' : '';
      return `<button class="orow ${oc.rec === r.id ? 'on' : ''} ${r.off ? 'off' : ''}" data-a="ocRec" data-id="${r.id}"><b>${esc(r.n)}</b><small>${esc(O.PER[r.per]?.n || r.per)} · ${O.GRAU[r.t]}${r.off ? ' · desativada' : ''}</small>${ed ? `<i>${ed}</i>` : ''}</button>`; };
    const D = oc.d, itemOpts = [['', '— escolha —'], ...Object.values(S.items).filter(i => ['cons', 'mat', 'mun'].includes(i.type)).map(i => [i.name, i.name]).sort((a, b) => a[0].localeCompare(b[0]))];
    const out = D && !D.meal ? Object.values(S.items).find(i => i.name === D.out) : null, custo = D ? ocCusto(D) : 0;
    const eco = D && out ? `<small class="${out.price < custo / D.qty || Math.floor(out.price / 2) > custo / D.qty ? 'warn' : ''}">Ingredientes: ${custo} de ouro · produto: ${out.price} (vende por ${Math.floor(out.price / 2)})${out.price < custo / D.qty ? ' — mais caro fazer do que comprar' : Math.floor(out.price / 2) > custo / D.qty ? ' — vender rende mais que os ingredientes' : ''}</small>` : D?.meal ? `<small>Ingredientes: ${custo} de ouro</small>` : '';
    const ed = D ? `<div class="oced"><h4>${D.id ? esc(D.n || 'Receita') : 'Receita nova'}</h4>
      <div class="row"><label>Nome <input data-oc="rec:n" value="${esc(D.n)}" maxlength="40"></label><label>Perícia ${sel('rec:per', D.per, O.order.map(k => [k, O.PER[k].n]))}</label><label>Grau ${sel('rec:t', D.t, [1, 2, 3].map(t => [t, O.GRAU[t]]))}</label></div>
      <div class="row"><label>Produz ${D.meal ? '<em>(refeição: bônus do grupo na próxima batalha)</em>' : sel('rec:out', D.out, itemOpts)}</label>${D.custom && !D.id ? `<button class="ghost" data-a="ocMeal">${D.meal ? 'Produzir item' : 'Virar refeição'}</button>` : ''}<label>Dificuldade ${num('rec:dc', D.dc, -40, 20, 'sm')}</label><label>Quantidade ${num('rec:qty', D.qty, 1, 5, 'sm')}</label></div>
      ${D.meal ? `<div class="row">${Object.entries(ocMods).map(([k, l]) => `<label>+% ${l} ${num('rec:meal:' + k, D.meal[k] || 0, 0, 30, 'sm')}</label>`).join('')}</div>` : ''}
      <h4>Ingredientes</h4>${D.mats.map(([n, q], i) => `<div class="row"><label>${sel('rec:mat:' + i, n, itemOpts)}</label>${num('rec:matq:' + i, q, 1, 9, 'sm')}<button class="ghost" data-a="ocMatDel" data-k="${i}" aria-label="Tirar ingrediente">×</button></div>`).join('')}
      <div class="row"><button class="ghost" data-a="ocMatAdd" ${D.mats.length >= 6 ? 'disabled' : ''}>+ Ingrediente</button>${eco}</div>
      <div class="row"><label class="chk"><input type="checkbox" data-oc="rec:off" ${D.off ? 'checked' : ''}> Desativada (ninguém prepara)</label></div>
      <div class="row"><button class="own" data-a="ocSave">${D.id ? 'Salvar receita' : 'Criar receita'}</button>${D.id ? `<button class="ghost" data-a="ocRecDel">${D.custom ? 'Excluir' : 'Restaurar padrão'}</button>` : ''}<button class="ghost" data-a="ocRec" data-id="">Fechar</button></div>
      ${D.custom ? '<small>Receita criada pelo mestre: vale para quem tem a perícia no grau escolhido ou maior, sem precisar de um nó específico.</small>' : ''}</div>` : '';
    return `${head}<div class="row">${sel('rec:filtro', oc.per, perOpts)}<button data-a="ocRec" data-id="new">+ Receita nova</button></div>${ed}<div class="orows">${L.map(row).join('') || '<small>Nenhuma receita.</small>'}</div>`;
  }
  const P = O.PER[oc.pp] || O.PER.alquimia, bp = O.base.P[P.id], bl = bp.nodes.length;
  const f = (id, k, v, w = '') => `<input class="${w}" data-oc="${id}:${k}" value="${esc(v ?? '')}">`, fn = (id, k, v, mx = 30) => `<input type="number" class="sm" data-oc="${id}:${k}" min="0" max="${mx}" value="${v ?? 0}">`;
  const node = (n, base) => { const b = base ? bp.nodes[+n.id.split('.')[1]] : null, ed = base ? ['n', 'd', 'po', 'r', 'g', 'off'].some(k => (n[k] ?? (k === 'off' ? false : undefined)) !== (b[k] ?? (k === 'off' ? false : undefined))) : false, id = base ? 'node:' + n.id : 'new:' + P.id + ':' + (+n.id.split('.')[1] - bl);
    return `<div class="onode-ed ${n.off ? 'off' : ''} ${ed ? 'ed' : ''}"><div class="nr1"><b class="gr" title="${O.GRAU[n.t]}">${O.GRAU[n.t][0]}</b>${f(id, 'n', n.n, 'w')}</div><div class="nr2"><label>PO ${fn(id, 'po', n.po)}</label><label>+% ${fn(id, 'r', n.r || 0)}</label>${n.act === 'checar' ? `<label>ouro ${fn(id, 'g', n.g || 0, 200)}</label>` : ''}<label><input type="checkbox" data-oc="${id}:off" ${n.off ? 'checked' : ''}> off</label>${ed ? `<button class="ghost" data-a="ocNodeRs" data-id="${n.id}">Restaurar</button>` : ''}</div><div class="nr3">${f(id, 'd', n.d, 'w')}</div></div>`; };
  const nn = oc.nn;
  return `${head}<div class="row">${sel('pp', P.id, O.order.map(k => [k, O.PER[k].n]))}</div>
    <div class="oced"><h4>Perícia</h4><div class="row"><label>Nome ${f('per:' + P.id, 'n', P.n)}</label><label>Atributos ${sel('per:' + P.id + ':a0', P.a[0], ATTR_OPT)}${sel('per:' + P.id + ':a1', P.a[1] || '', [['', '—'], ...ATTR_OPT])}</label></div><div class="row"><label>Descrição ${f('per:' + P.id, 'd', P.d, 'w')}</label></div></div>
    <h4>Nós <small>PO = custo · % = bônus nas rolagens · “off” impede aprender (quem já tem, mantém)</small></h4>${P.nodes.filter(n => !n.custom).map(n => node(n, true)).join('')}
    ${P.nodes.some(n => n.custom) ? `<h4>Nós criados pelo mestre</h4>${P.nodes.filter(n => n.custom).map(n => node(n, false)).join('')}` : ''}
    <div class="oced"><h4>Novo nó em ${esc(P.n)}</h4><div class="row"><label>Nome <input data-oc="nn:n" value="${esc(nn.n)}" maxlength="40"></label><label>Grau ${sel('nn:t', nn.t, [1, 2, 3].map(t => [t, O.GRAU[t]]))}</label><label>PO ${num('nn:po', nn.po, 0, 30, 'sm')}</label><label>+% rolagem ${num('nn:r', nn.r, 0, 30, 'sm')}</label></div>
      <div class="row"><label>Descrição <input class="w" data-oc="nn:d" value="${esc(nn.d)}" maxlength="160"></label></div>
      <div class="row"><label class="chk"><input type="checkbox" data-oc="nn:chk" ${nn.chk ? 'checked' : ''}> Ação de teste narrativo (rola e vai para o diário)</label>${nn.chk ? `<label>Ouro ao acertar ${num('nn:g', nn.g, 0, 200, 'sm')}</label>` : ''}<button class="own" data-a="ocNnAdd">Adicionar nó</button></div></div>`;
}
const ATTR_OPT = A.map(a => [a, a]);
function ocChange(el, v) {
  const [k, a, b, c] = el.dataset.oc.split(':'), O = OFI;
  if (k === 'pp') { oc.pp = v; return render(); }
  if (k === 'rec' && a === 'filtro') { oc.per = v; return render(); }
  if (k === 'nn') { oc.nn[a] = ['t', 'po', 'r', 'g'].includes(a) ? +v : a === 'chk' ? !!v : v; return render(); }
  if (k === 'rec') { const D = oc.d; if (!D) return; if (a === 'mat') D.mats[+b][0] = v; else if (a === 'matq') D.mats[+b][1] = Math.max(1, Math.min(9, +v || 1)); else if (a === 'meal') D.meal[b] = Math.max(0, Math.min(30, +v || 0)); else D[a] = ['t', 'dc', 'qty'].includes(a) ? +v : a === 'off' ? !!v : v; return render(); }
  if (k === 'per') { const P = O.PER[a], bp = O.base.P[a], f = b; // a edição manda só o que difere do padrão
    const cur = { n: P.n, d: P.d, a: P.a }; if (f === 'a0') cur.a = [v, P.a[1]].filter(Boolean); else if (f === 'a1') cur.a = [P.a[0], v].filter(Boolean); else cur[f] = v;
    const d = {}; if (cur.n !== bp.n) d.n = cur.n; if (cur.d !== bp.d) d.d = cur.d; if (cur.a.join() !== bp.a.join()) d.a = cur.a; return send({ t: 'ofiCfg', k: 'per', id: a, v: d }); }
  if (k === 'node') { const id = a, f = b, [per, i] = id.split('.'), n = O.PER[per].nodes[+i], bn = O.base.P[per].nodes[+i], cur = { n: n.n, d: n.d, po: n.po, r: n.r || 0, g: n.g, off: !!n.off };
    cur[f] = f === 'n' || f === 'd' ? v : f === 'off' ? !!v : Math.max(0, +v || 0);
    const d = {}; for (const q of ['n', 'd', 'po', 'r', 'g']) if (cur[q] !== (bn[q] ?? (q === 'r' ? 0 : undefined)) && !(q === 'g' && n.act !== 'checar')) d[q] = cur[q]; if (cur.off) d.off = true; return send({ t: 'ofiCfg', k: 'node', id, v: d }); }
  if (k === 'new') { const per = a, i = +b, f = c, n = O.PER[per].nodes.find(x => x.id === per + '.' + (O.base.P[per].nodes.length + i)); if (!n) return;
    const cur = { n: n.n, d: n.d, t: n.t, po: n.po, r: n.r || 0, chk: n.act === 'checar', g: n.g || 0, off: !!n.off }; cur[f] = f === 'n' || f === 'd' ? v : f === 'off' ? !!v : Math.max(0, +v || 0);
    return send({ t: 'ofiCfg', k: 'nodeNew', per, i, v: cur }); }
}
function ocClick(d) {
  const O = OFI;
  if (d.a === 'ocTab') { oc.tab = d.k; return render(); }
  if (d.a === 'ocReset') { if (confirm('Restaurar todo o catálogo de ofícios ao padrão? As edições e as receitas e nós criados serão apagados.')) send({ t: 'ofiCfg', k: 'reset' }); return; }
  if (d.a === 'ocRec') { oc.rec = d.id === oc.rec ? '' : d.id; oc.d = !oc.rec ? null : oc.rec === 'new' ? { id: '', n: '', per: oc.per || 'alquimia', t: 1, out: '', mats: [['', 1]], dc: 0, qty: 1, meal: null, off: false, custom: true } : ocDraft(O.REC[oc.rec]); return render(); }
  if (!oc.d && !['ocNodeRs', 'ocNnAdd'].includes(d.a)) return;
  if (d.a === 'ocMatAdd') { oc.d.mats.push(['', 1]); return render(); }
  if (d.a === 'ocMatDel') { oc.d.mats.splice(+d.k, 1); return render(); }
  if (d.a === 'ocMeal') { oc.d.meal = oc.d.meal ? null : { atk: 8 }; if (oc.d.meal) oc.d.out = ''; return render(); }
  if (d.a === 'ocSave') {
    const D = oc.d, v = { n: D.n, per: D.per, t: D.t, dc: D.dc, qty: D.qty, off: D.off, mats: Object.fromEntries(D.mats.filter(([n]) => n)) };
    if (D.meal) v.meal = D.meal; else v.out = D.out;
    if (!v.n.trim() || !Object.keys(v.mats).length || (!D.meal && !D.out)) return toast('Dê um nome, ao menos um ingrediente e um produto.');
    send({ t: 'ofiCfg', k: 'rec', id: D.id, v }); oc.rec = ''; oc.d = null; return;
  }
  if (d.a === 'ocRecDel') { if (!oc.d.custom || confirm('Excluir esta receita?')) send({ t: 'ofiCfg', k: 'rec', id: oc.d.id, v: null }); oc.rec = ''; oc.d = null; return; }
  if (d.a === 'ocNodeRs') return send({ t: 'ofiCfg', k: 'node', id: d.id, v: null });
  if (d.a === 'ocNnAdd') { const n = oc.nn; if (!n.n.trim()) return toast('Dê um nome ao nó.'); send({ t: 'ofiCfg', k: 'nodeNew', per: oc.pp, v: n }); oc.nn = { n: '', d: '', t: 1, po: 2, r: 0, chk: false, g: 0 }; return; }
}
function gmSheet(c) {
  const t = ftab[c.id] || 'pers';
  const page = t === 'pers' ? persPage(c) : t === 'hab' ? skillPage(c) : t === 'ofi' ? oficiosPage(c) : t === 'itens' ? itemsPage(c) : t === 'gm' ? gmPanel(c)
    : `<section class="card hist"><h3>Diário</h3><textarea aria-label="Diário" data-id="${c.id}" data-f="bio">${esc(c.bio)}</textarea><h3>Notas secretas do mestre</h3><textarea aria-label="Notas do mestre" data-id="${c.id}" data-f="gmNote">${esc(c.gmNote)}</textarea></section>`;
  return `<div class="ftabs">${chips(FT, (k, l) => `<button data-ftab="${k}" data-id="${c.id}" class="${k === t ? 'on' : ''}">${l}</button>`)}</div><div class="fbody">${page}</div>`;
}

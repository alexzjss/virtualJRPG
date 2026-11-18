function timeline(n = 8) { return (S.battle.order || []).filter(id => S.chars[id]).slice(0, n); } // fila calculada pelo servidor
function bar(k, c, hideNum) {
  const max = k === 'limit' ? 100 : c[k + 'Max'], pct = Math.round(Math.max(0, Math.min(100, 100 * c[k] / (max || 1))));
  return `<div class="bar ${k}"><i data-bid="${c.id}:${k}" data-p="${pct}" style="width:${pct}%"></i><span>${L[k]}${hideNum ? '' : ` ${c[k]}/${max}`}</span></div>`;
}

// ===== palco de batalha =====
const KANJI = { fis: '武', kagutsuchi: '火', susanoo: '水', atlas: '土', indra: '雷', fuhaku: '風', amaterasu: '光', tsukuyomi: '闇', shukketsu: '血', hiruko: '核', aura: '気', oculto: '呪' };
const mainEl = c => c.el || c.resist?.find(e => e !== 'fis') || 'fis';
const bodyMini = c => `<svg class="mini" viewBox="0 0 120 260" aria-hidden="true">${PARTS.map(k => `<${SHAPE[k][0]} ${SHAPE[k][1]} class="l${lvl(c, k)}"/>`).join('')}</svg>`;
function unit(c, cur) {
  const foe = !!c.enemy, el = mainEl(c), low = c.hp > 0 && c.hp <= c.hpMax * .25;
  const sts = c.hp > 0 ? stIcons(c) : `<i class="dead">${c.dead ? 'Morto' : c.dying ? 'Caído · ' + c.dying : 'Caído'}</i>`;
  const vb = !foe && c.vinc?.[0] ? `<em class="vb" style="--e:${ELC[c.vinc[0]]}" title="Vínculo: ${PATRON[c.vinc[0]]}">${KANJI[c.vinc[0]]}</em>` : '';
  const fig = `<div class="figw">${vb}<div class="fig" style="--e:${ELC[el]}">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<span class="glyph">${foe ? KANJI[el] : esc(c.name.slice(0, 1).toUpperCase())}</span>`}</div></div>`;
  const stats = foe ? bar('hp', c, true) + (gm ? `<div class="duo"><small>${c.hp}/${c.hpMax}</small></div>` : '')
    : `<div class="hpn"><span>${c.hp}</span><small>/${c.hpMax}</small><em>HP</em></div>${bar('hp', c, true)}<div class="duo"><div>${bar('aura', c, true)}<small>Aura ${c.aura}/${c.auraMax}</small></div><div>${bar('san', c, true)}<small>Sanidade ${c.san}/${c.sanMax}</small></div></div>
      <div class="lim ${c.limit >= 100 ? 'full' : ''}">${bar('limit', c, true)}<small>${c.limit >= 100 ? 'Limite!' : 'Limite ' + c.limit + '%'}</small></div>`;
  const dz = c.hp > 0 ? Object.entries(c.stk || {}).filter(([, n]) => n > 0).map(([k, n]) => `<div class="brk" title="${k === 'doenca' ? 'Doença: +8% de dano por estágio; do 3º em diante o corpo definha a cada turno' : 'Cargas: aumentam o dano das técnicas que as usam'}">${RULES.STK[k]?.[0] || k} ${'●'.repeat(n)}</div>`).join('') : '',
  brk = c.brk && c.hp > 0 ? `<div class="brk" title="Barra de Quebra: fraquezas e pontos fracos a esvaziam">Quebra ${'◆'.repeat(c.brk.cur)}${'◇'.repeat(c.brk.max - c.brk.cur)}</div>` : '', rit = !foe && (c.brv || c.ten) ? `<div class="rit">${c.brv ? `Coragem ${c.brv}` : ''}${c.brv && c.ten ? ' · ' : ''}${c.ten ? `Tensão ×${[1, 1.5, 2, 3][c.ten]}` : ''}</div>` : '';
  return `<div class="unit ${foe ? 'foe' : 'hero'} ${c.ten ? 'ten' + c.ten : ''} ${(c.brv || 0) < 0 ? 'debt' : ''} ${c === cur ? 'cur' : ''} ${c.id === tgt ? 'tgt' : ''} ${c.hp > 0 ? '' : 'ko'} ${low ? 'low' : ''}" data-tgt="${c.id}" style="--c:${esc(c.color)}">${fig}${foe ? '' : bodyMini(c)}<div class="plate"><b class="nm">${esc(c.name)}</b><div class="sts">${sts}</div>${brk}${dz}${rit}${stats}</div></div>`;
}
// condições no palco: ícone (kanji) que pulsa quando a condição age; o nome completo fica na dica
const STK = { possess: '憑', curse: '呪', frozen: '氷', marked: '印', brand: '狩', down: '倒', burn: '炎', bleed: '血', poison: '毒', rad: '核', stun: '眩', sleep: '眠', para: '痺', silence: '黙', atkUp: '攻', atkDn: '攻', defUp: '守', defDn: '守', agiUp: '速', agiDn: '速', fear: '恐', fury: '怒', confuse: '乱',
  shield: '盾', wet: '濡', oil: '油', broken: '砕', regen: '癒', taunt: '挑', guarded: '護', counter: '返', reflect: '鏡', evade: '避', stealth: '隠', focus: '集', exposed: '露', exaus: '疲', seal: '封', blind: '盲', root: '根', charge: '溜', form: '変', endure: '耐', dread: '畏', disarm: '掠' };
const STGOOD = new Set(['atkUp', 'defUp', 'agiUp', 'shield', 'regen', 'taunt', 'guarded', 'counter', 'reflect', 'evade', 'stealth', 'focus', 'charge', 'form', 'endure']);
const stIcons = c => [sanSt(c) && `<i class="sti bad" title="${esc(sanSt(c))}: sanidade baixa pesa em todas as rolagens">狂</i>`, ...Object.entries(c.st).map(([k, n]) => { const nm = k === 'shield' && c.shield ? ST[k] + ' ' + c.shield : (ST[k] || k) + (n < 90 ? ' · ' + n : '');
  return `<i class="sti ${STGOOD.has(k) ? 'good' : /Dn$/.test(k) ? 'bad dn' : /Up$/.test(k) ? '' : 'bad'} ${/Up$/.test(k) ? 'up' : ''}" data-st="${esc(k)}" title="${esc(nm + (STD[k] ? ': ' + STD[k] : ''))}" aria-label="${esc(nm)}">${STK[k] || esc((ST[k] || k).slice(0, 1))}${n < 90 ? `<sub>${n}</sub>` : ''}</i>`; })].filter(Boolean).join('');
const BBG = { rubro: 'Rubro', noite: 'Noite', floresta: 'Floresta', brasa: 'Brasa', gelo: 'Gelo', vazio: 'Vazio', santuario: 'Santuário', tempestade: 'Tempestade', sangue: 'Sangue', morte: 'Morte', conhecimento: 'Conhecimento', energia: 'Energia', medo: 'Medo', estrelas: 'Estrelas', ruinas: 'Ruínas', abismo: 'Abismo', entardecer: 'Entardecer', nuvens: 'Nuvens', sombrio: 'Sombrio', aurora: 'Aurora' }; // fundos prontos da batalha (os de baixo têm camadas animadas .bbfx)
const BBGRP = [['Clássicos', ['rubro', 'noite', 'floresta', 'brasa', 'gelo', 'vazio', 'santuario', 'tempestade']], ['Paranormal', ['sangue', 'morte', 'conhecimento', 'energia', 'medo']], ['JRPG', ['estrelas', 'ruinas', 'abismo', 'entardecer']], ['Cósmico', ['nuvens', 'sombrio', 'aurora']]], CLIMAV = { chuva: 'Chuva', neblina: 'Neblina', cinzas: 'Cinzas', neve: 'Neve', brasas: 'Brasas' }; // grupos do seletor e climas visuais sobrepostos
const bbfx = '<i class="bbfx" aria-hidden="true"><b></b><s></s></i>'; // camadas do fundo animado: ::before, ::after, b (terceira) e s (flash do golpe crítico)
function battle(split, over = '') { // split (só o mestre): devolve { stage, bar }; over (PC): HUD e leque desenhados por cima do palco 3D (no mestre, só o leque)
  const tl = timeline(), cur = S.chars[tl[0]], sc = S.scenes[S.scene], inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks);
  const side = e => { const l = inB.filter(c => !!c.enemy === e), n = l.length, cols = n > 4 ? Math.ceil(n / 2) : Math.max(1, n), w = Math.min(14.5, 43 / cols - 1.3);
    return `<div class="side ${e ? 'foes' : 'heroes'} ${n > 4 ? 'two' : ''}" style="--w:${w.toFixed(2)}cqw">${l.map(c => unit(c, cur)).join('')}</div>`; };
  const hs = inB.filter(c => !c.enemy && !c.dead), danger = hs.length ? 1 - hs.reduce((a, c) => a + Math.max(0, c.hp) / (c.hpMax || 1), 0) / hs.length + (hs.some(c => c.hp <= 0) ? .25 : 0) + (inB.some(c => c.boss && c.hp > 0) ? .15 : 0) : 0, heat = danger >= .6 ? 2 : danger >= .3 ? 1 : 0;
  const img = sc.bbg && !BBG[sc.bbg] ? sc.bbg : !sc.bbg ? sc.bg : '';
  const p3 = gm || innerWidth > 700; // no PC o palco é o mundo 3D (palco3d.js) e aqui fica só o retângulo de montagem; no celular segue o palco antigo
  const html = p3 ? `<section class="stage3d ${role === 'table' || (over && !gm) ? 'full' : ''} ${over && !gm ? 'hudp' : ''} ${S.battle.dom ? 'dom-on' : ''}" data-p3d>${S.battle.dom ? '<i class="domfx" aria-hidden="true"></i>' : ''}${gm ? fieldBar() + over : over}</section>` : `<section class="stage battle heat-${heat} ${S.battle.dom ? 'dom-on' : ''} ${cur && cur.enemy && cur.boss ? 'boss-turn' : ''} ${BBG[sc.bbg] ? 'bb-' + sc.bbg : sc.bbg ? 'bb-img' : ''}" style="${img ? `--bg:url('${esc(img)}')` : ''}">${BBG[sc.bbg] ? bbfx : ''}${CLIMAV[sc.clima] ? `<i class="clima cl-${sc.clima}" aria-hidden="true"></i>` : ''}<div class="tl"><em>Ordem${S.battle.n ? `<small>ação ${S.battle.n + 1}</small>` : ''}</em>${tl.map((id, i) => `<span class="${i ? '' : 'cur'} ${S.chars[id].enemy ? 'foe' : ''}" style="--c:${esc(S.chars[id].color)};--e:${ELC[mainEl(S.chars[id])]}">${i ? '' : '<small>Agora</small>'}<i class="tlp">${S.chars[id].img ? `<img src="${esc(S.chars[id].img)}" alt="">` : S.chars[id].enemy ? KANJI[mainEl(S.chars[id])] : esc(S.chars[id].name.slice(0, 1).toUpperCase())}</i>${esc(S.chars[id].name)}</span>`).join('')}</div>
    ${S.battle.dom ? '<i class="domfx" aria-hidden="true"></i>' : ''}<div class="field">${side(true)}<div class="mid"><small>${esc(sc.name)}${S.battle.end === 'won' ? ' · inimigos derrotados' : heat ? ` · ${heat > 1 ? 'perigo' : 'tensão'}` : ''}</small></div>${side(false)}</div>${role === 'player' ? '' : fieldBar()}</section>`;
  return split ? { stage: html, bar: '' } : html;
}

function map() {
  const m = S.scenes[S.scene], C = Math.ceil(m.cols), Rw = Math.ceil(m.rows), cr = m.crop, hid = (x, y) => m.fogOn && !m.seen[x + ',' + y];
  let fog = '';
  if (m.fogOn) for (let y = 0; y < Rw; y++) for (let x = 0; x < C; x++) if (hid(x, y)) fog += `<i class="fog" style="--x:${x + m.ox};--y:${y + m.oy}"></i>`;
  // a imagem inteira é ampliada e deslocada para mostrar só a área recortada pelo mestre
  const bg = m.bg ? `background-image:url('${esc(m.bg)}');background-size:${100 / cr.w}% ${100 / cr.h}%;background-position:${cr.w < 1 ? cr.x / (1 - cr.w) * 100 : 0}% ${cr.h < 1 ? cr.y / (1 - cr.h) * 100 : 0}%;` : '';
  let gl = '';
  for (let x = m.ox; x <= m.cols; x++) gl += `M${x} 0V${m.rows}`;
  for (let y = m.oy; y <= m.rows; y++) gl += `M0 ${y}H${m.cols}`;
  const grid = `<svg class="gridl" viewBox="0 0 ${m.cols} ${m.rows}" preserveAspectRatio="none" aria-hidden="true"><path d="${gl}" vector-effect="non-scaling-stroke"/></svg>`;
  const tok = c => { const el = mainEl(c), hp = Math.max(0, Math.min(100, 100 * c.hp / (c.hpMax || 1)));
    return `<div class="tok ${mine(c) ? 'mine' : ''} ${c.enemy ? 'foe' : ''} ${c.hp > 0 ? '' : 'ko'} ${asking.has(c.id) ? 'asking' : ''}" data-id="${c.id}" style="--x:${c.x + m.ox};--y:${c.y + m.oy};--c:${esc(c.color)};--e:${ELC[el]}" title="${esc(c.name)}"><span class="tface" style="${bgImg(c.img)}">${c.img ? '' : c.enemy ? KANJI[el] : esc(c.name.slice(0, 1).toUpperCase())}</span><b>${esc(c.name)}</b><i class="thp"><i style="width:${hp}%"></i></i></div>`; };
  return `<div class="mapwrap"><section class="map ${fogMode ? 'fogging' : ''}" style="--cols:${m.cols};--rows:${m.rows};aspect-ratio:${m.ar};${bg}transform:translate(${view.x}px,${view.y}px) scale(${view.z})">${m.grid === false ? '' : grid}${xPins(m)}${(m.exits || []).filter(e => gm || !hid(e.x, e.y)).map(e => `<i class="mexit" style="--x:${e.x + m.ox};--y:${e.y + m.oy}" title="Saída para ${esc(S.scenes[e.to]?.name || '?')}${gm ? '' : ': pare o seu token aqui para pedir passagem'}"><b>⇲ ${esc(S.scenes[e.to]?.name || '?')}</b></i>`).join('')}${Object.values(S.chars).filter(c => c.x != null && c.scene === S.scene && (mine(c) || !hid(c.x, c.y))).map(tok).join('')}${fog}${pings.map(p => `<i class="ping" style="--x:${p.x + m.ox};--y:${p.y + m.oy}"></i>`).join('')}</section></div>`;
}
// troca a imagem do mapa: mede a proporção real e zera o recorte
function setBg(u) {
  send({ t: 'map', f: 'bg', v: u });
  if (!u) return;
  const im = new Image(); im.onload = () => { send({ t: 'map', f: 'crop', v: { x: 0, y: 0, w: 1, h: 1 } }); send({ t: 'map', f: 'ar', v: im.naturalWidth / im.naturalHeight }); }; im.src = u;
}
let cropMode = false, cropSel = null, cdrag = null, lastCam = null;
const cropper = () => { const sc = S.scenes[S.scene], c = cropSel || sc.crop; return cropMode && sc.bg ? `<div class="cropper"><header><b>Recortar mapa</b><small>Arraste sobre a imagem para marcar a área que vira o mapa.</small><button class="own" data-a="cropOk">Aplicar recorte</button><button data-a="cropAll">Usar imagem inteira</button><button data-a="cropX">Cancelar</button></header>
  <div class="cropbox"><img src="${esc(sc.bg)}" draggable="false" alt=""><i class="csel" style="left:${c.x * 100}%;top:${c.y * 100}%;width:${c.w * 100}%;height:${c.h * 100}%"></i></div></div>` : ''; };

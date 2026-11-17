function timeline(n = 8) { return (S.battle.order || []).filter(id => S.chars[id]).slice(0, n); } // fila calculada pelo servidor
function bar(k, c, hideNum) {
  const max = k === 'limit' ? 100 : c[k + 'Max'], pct = Math.round(Math.max(0, Math.min(100, 100 * c[k] / (max || 1))));
  return `<div class="bar ${k}"><i data-bid="${c.id}:${k}" data-p="${pct}" style="width:${pct}%"></i><span>${L[k]}${hideNum ? '' : ` ${c[k]}/${max}`}</span></div>`;
}

// ===== palco de batalha =====
const KANJI = { fis: '武', kagutsuchi: '火', susanoo: '水', atlas: '土', indra: '雷', fuhaku: '風', amaterasu: '光', tsukuyomi: '闇', shukketsu: '血', radiacao: '核' };
const mainEl = c => c.el || c.resist?.find(e => e !== 'fis') || 'fis';
const bodyMini = c => `<svg class="mini" viewBox="0 0 120 260" aria-hidden="true">${PARTS.map(k => `<${SHAPE[k][0]} ${SHAPE[k][1]} class="l${lvl(c, k)}"/>`).join('')}</svg>`;
function unit(c, cur) {
  const foe = !!c.enemy, el = mainEl(c), low = c.hp > 0 && c.hp <= c.hpMax * .25;
  const sts = c.hp > 0 ? [sanSt(c), ...Object.entries(c.st).map(([k, n]) => ST[k] + (n < 90 ? ' ' + n : ''))].filter(Boolean).map(s => `<i>${s}</i>`).join('') : `<i class="dead">${c.dead ? 'Morto' : c.dying ? 'Caído · ' + c.dying : 'Caído'}</i>`;
  const vb = !foe && c.vinc?.[0] ? `<em class="vb" style="--e:${ELC[c.vinc[0]]}" title="Vínculo: ${PATRON[c.vinc[0]]}">${KANJI[c.vinc[0]]}</em>` : '';
  const fig = `<div class="figw">${vb}<div class="fig" style="--e:${ELC[el]}">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<span class="glyph">${foe ? KANJI[el] : esc(c.name.slice(0, 1).toUpperCase())}</span>`}</div></div>`;
  const stats = foe ? bar('hp', c, true) + (gm ? `<div class="duo"><small>${c.hp}/${c.hpMax}</small></div>` : '')
    : `<div class="hpn"><span>${c.hp}</span><small>/${c.hpMax}</small><em>HP</em></div>${bar('hp', c, true)}<div class="duo"><div>${bar('aura', c, true)}<small>Aura ${c.aura}/${c.auraMax}</small></div><div>${bar('san', c, true)}<small>Sanidade ${c.san}/${c.sanMax}</small></div></div>
      <div class="lim ${c.limit >= 100 ? 'full' : ''}">${bar('limit', c, true)}<small>${c.limit >= 100 ? 'Limite!' : 'Limite ' + c.limit + '%'}</small></div>`;
  return `<div class="unit ${foe ? 'foe' : 'hero'} ${c === cur ? 'cur' : ''} ${c.id === tgt ? 'tgt' : ''} ${c.hp > 0 ? '' : 'ko'} ${low ? 'low' : ''}" data-tgt="${c.id}" style="--c:${esc(c.color)}">${fig}${foe ? '' : bodyMini(c)}<div class="plate"><b class="nm">${esc(c.name)}</b><div class="sts">${sts}</div>${stats}</div></div>`;
}
const BBG = { rubro: 'Rubro', noite: 'Noite', floresta: 'Floresta', brasa: 'Brasa', gelo: 'Gelo', vazio: 'Vazio', santuario: 'Santuário', tempestade: 'Tempestade' }; // fundos prontos da batalha
function battle() {
  const tl = timeline(), cur = S.chars[tl[0]], sc = S.scenes[S.scene], inB = Object.values(S.chars).filter(c => c.id in S.battle.ticks);
  const side = e => { const l = inB.filter(c => !!c.enemy === e), n = l.length, cols = n > 4 ? Math.ceil(n / 2) : Math.max(1, n), w = Math.min(14.5, 43 / cols - 1.3);
    return `<div class="side ${e ? 'foes' : 'heroes'} ${n > 4 ? 'two' : ''}" style="--w:${w.toFixed(2)}cqw">${l.map(c => unit(c, cur)).join('')}</div>`; };
  const acts = c => `<div class="row"><b>${esc(c.name)}:</b>${gm && c.enemy ? '<button class="own" data-a="ai">IA decide</button>' : ''}<button data-a="act" data-id="${c.id}" data-skill="atk">Ataque</button>${c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive').map(k => { const s = S.skills[k];
      return `<button data-a="act" data-id="${c.id}" data-skill="${k}" title="${esc(desc(s))}" ${blocked(c, s) ? 'disabled' : ''}>${esc(s.name)}</button>`; }).join('')}
      ${Object.entries(c.inv).filter(([k]) => S.items[k]?.type === 'cons').map(([k, q]) => `<button class="item" data-a="use" data-id="${c.id}" data-item="${k}">${esc(S.items[k].name)} ×${q}</button>`).join('')}
      <button data-a="next">Passar</button></div>${aimBox()}`;
  const hs = inB.filter(c => !c.enemy && !c.dead), danger = hs.length ? 1 - hs.reduce((a, c) => a + Math.max(0, c.hp) / (c.hpMax || 1), 0) / hs.length + (hs.some(c => c.hp <= 0) ? .25 : 0) + (inB.some(c => c.boss && c.hp > 0) ? .15 : 0) : 0, heat = danger >= .6 ? 2 : danger >= .3 ? 1 : 0;
  const img = sc.bbg && !BBG[sc.bbg] ? sc.bbg : !sc.bbg ? sc.bg : '';
  return `<section class="stage battle heat-${heat} ${BBG[sc.bbg] ? 'bb-' + sc.bbg : sc.bbg ? 'bb-img' : ''}" style="${img ? `--bg:url('${esc(img)}')` : ''}"><div class="tl"><em>Ordem</em>${tl.map((id, i) => `<span class="${i ? '' : 'cur'} ${S.chars[id].enemy ? 'foe' : ''}" style="--c:${esc(S.chars[id].color)}">${i ? '' : '<small>Agora</small>'}${esc(S.chars[id].name)}</span>`).join('')}</div>
    <div class="field">${side(true)}<div class="mid"><small>${esc(sc.name)}${heat ? ` · ${heat > 1 ? 'perigo' : 'tensão'}` : ''}</small></div>${side(false)}</div>${gm && cur ? acts(cur) : ''}</section>`;
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
  return `<div class="mapwrap"><section class="map ${fogMode ? 'fogging' : ''}" style="--cols:${m.cols};--rows:${m.rows};aspect-ratio:${m.ar};${bg}transform:translate(${view.x}px,${view.y}px) scale(${view.z})">${m.grid === false ? '' : grid}${xPins(m)}${Object.values(S.chars).filter(c => c.x != null && c.scene === S.scene && (mine(c) || !hid(c.x, c.y))).map(tok).join('')}${fog}${pings.map(p => `<i class="ping" style="--x:${p.x + m.ox};--y:${p.y + m.oy}"></i>`).join('')}</section></div>`;
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


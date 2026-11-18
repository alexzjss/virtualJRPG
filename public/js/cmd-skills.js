// ===== Seletor de skills do comando de batalha: lista agrupada + painel fixo da skill escolhida =====
// Grupos: Atalhos (★ fixadas e até 3 mais usadas), Arma, Dano, Mental, Cura, Formas, Utilidade; cada um por custo.
// Cada linha mostra a afinidade com o alvo (▲ fraco, ▼ resiste, ? ainda não descoberto), o poder e o custo.
// Bloqueadas ficam no lugar, apagadas, com o motivo. Teclado: ↑↓ (eventos.js), letras filtram, Shift+F fixa.
const SKG = [['wp', ''], ['dmg', 'Dano'], ['mental', 'Mental'], ['heal', 'Cura'], ['form', 'Formas'], ['util', 'Utilidade']];
let skQ = '', skCur = null;
const skNorm = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const skCost = s => s.limit ? 'Limite' : `${s.cost} ${s.res === 'san' ? 'SAN' : 'AU'}`;
const skAff = (s, t) => { // afinidade com o alvo, só para golpes com dano em inimigo
  if (!t || !t.enemy || !(s.power > 0) || !['dmg', 'mental'].includes(s.kind)) return '';
  return t.weak?.includes(s.el) ? 'w' : t.resist?.includes(s.el) ? 'r' : !gm && (t.known || 0) < 2 ? '?' : '';
};
function skGroups(c, t, q = '') {
  const ids = [...new Set([...wSk(c), ...c.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive')])].filter(k => SK(k));
  const it = id => { const s = SK(id), off = !!blocked(c, s, id); return { id, s, off, why: off ? blockWhy(c, s, id) : '', pin: !!c.skPin?.includes(id), used: c.skUse?.[id] || 0, aff: skAff(s, t) }; };
  const byCost = (a, b) => (a.s.limit ? 999 : a.s.cost) - (b.s.limit ? 999 : b.s.cost) || a.s.name.localeCompare(b.s.name, 'pt');
  const nq = skNorm(q), all = ids.map(it).filter(x => !nq || skNorm(x.s.name).includes(nq));
  const pins = all.filter(x => x.pin).sort(byCost), top = all.filter(x => !x.pin && x.used > 0).sort((a, b) => b.used - a.used).slice(0, 3), atl = new Set([...pins, ...top]);
  const kindOf = x => x.s.wpn ? 'wp' : SKG.some(([k]) => k === x.s.kind) ? x.s.kind : 'util';
  const G = [{ k: 'atl', label: 'Atalhos', items: [...pins, ...top] }, ...SKG.map(([k, label]) => ({ k, label: k === 'wp' ? `Arma · ${eq(c, 'arma')?.name || ''}` : label, items: all.filter(x => !atl.has(x) && kindOf(x) === k).sort(byCost) }))];
  return G.filter(g => g.items.length);
}
function skPane(c, t) {
  skCur = c;
  const G = skGroups(c, t, skQ), flat = G.flatMap(g => g.items), any = skGroups(c, t).length;
  if (!any) return '<p class="none">Nenhuma skill ativa ainda. Aprenda na página Habilidades.</p>';
  const cur = (pick.k === 'sk' && flat.find(x => x.id === pick.id)) || flat[0];
  const AFF = { w: ['▲', 'wk', 'fraco'], r: ['▼', 'rs', 'resiste'], '?': ['?', 'uk', 'ainda não se sabe'] };
  const row = x => { const on = pick.k === 'sk' && pick.id === x.id, a = AFF[x.aff];
    return `<button class="opt skr ${on ? 'on' : ''} ${x.off ? 'off' : ''}" data-a="pick" data-k="sk" data-v="${esc(x.id)}" style="--e:${ELC[x.s.el] || '#888'}" aria-pressed="${on}" ${x.off ? `aria-disabled="true" title="${esc(x.why)}"` : ''}>
      <i class="mk">${x.pin ? '★' : x.used && !x.pin && G[0]?.k === 'atl' && G[0].items.includes(x) ? '↺' : ''}</i><i class="dot"></i><b>${esc(x.s.name)}</b>${a ? `<i class="af ${a[1]}" title="${a[2]}">${a[0]}</i>` : '<i class="af"></i>'}<i class="pw">${x.off ? `<span class="why">${esc(x.why)}</span>` : x.s.power > 0 ? 'P ' + x.s.power : ''}</i><i class="ct">${skCost(x.s)}</i></button>`; };
  const list = G.map(g => `<div class="skg"><em>${esc(g.label)}</em><small>${g.items.length}</small></div>${g.items.map(row).join('')}`).join('') || `<p class="none">Nada com “${esc(skQ)}”.</p>`;
  const s = cur?.s, a = cur && AFF[cur.aff];
  const panel = s ? `<div class="skpn" style="--e:${ELC[s.el] || '#888'}"><b>${esc(s.name)}</b><small>${esc(KIND[s.kind] || s.kind)} · ${esc(EL[s.el] || s.el)}${a ? ` · <span class="af ${a[1]}">${a[0]} ${a[2]}</span>` : ''}</small><p>${esc(desc(s))}</p>
    <div class="skst"><div><em>Custo</em>${skCost(s)}</div><div><em>Poder</em>${s.power || '—'}</div><div><em>Alcance</em>${s.area ? 'Área' : selfSk(s) ? 'Em si' : 'Único'}</div><div><em>Usos</em>${cur.used ? cur.used + '× usada' : '—'}${s.uses ? ` · ${s.uses}/batalha` : ''}</div></div>
    ${cur.why ? `<p class="why">${esc(cur.why)}</p>` : ''}<button class="ghost skpin" data-a="skPinT" data-id="${c.id}" data-v="${esc(cur.id)}">${cur.pin ? '★ Desfixar' : '☆ Fixar nos Atalhos'} <kbd>Shift F</kbd></button></div>` : '<div class="skpn"></div>';
  const fl = skQ ? `<div class="skf">Filtro: <b>${esc(skQ)}</b><button class="ghost" data-a="skQx" aria-label="Limpar filtro">✕</button></div>` : '<div class="skf dim">Digite para filtrar · <kbd>↑</kbd><kbd>↓</kbd> escolhe · <kbd>Shift F</kbd> fixa</div>';
  return `<div class="skw"><div class="skc">${fl}<div class="alist skl" role="listbox" aria-label="Skills">${list}</div></div>${panel}</div>`;
}
// teclas do seletor (só com Skills aberto e o foco fora de campos de texto): devolve true se tratou
function skKey(e) {
  const c = skCur; if (!c || e.ctrlKey || e.metaKey || e.altKey || e.target.matches?.('input,textarea,select')) return false;
  if (e.shiftKey && e.key.toLowerCase() === 'f') { if (pick.k === 'sk') send({ t: 'skPin', id: c.id, sk: pick.id, on: !c.skPin?.includes(pick.id) }); return true; }
  let q = skQ;
  if (e.key === 'Backspace' && q) q = q.slice(0, -1);
  else if (/^\p{L}$/u.test(e.key)) q += e.key;
  else return false;
  skQ = q;
  const t = S.chars[tgt], flat = skGroups(c, t, q).flatMap(g => g.items);
  if (flat.length && !(pick.k === 'sk' && flat.some(x => x.id === pick.id))) pick = { k: 'sk', id: flat[0].id };
  render(); app.querySelector('.skr.on')?.scrollIntoView({ block: 'nearest' }); return true;
}
{
  const css = document.createElement('style');
  css.textContent = `@media(min-width:1501px){.cmd.p5 .cmd-g:has(.skw){grid-template-columns:minmax(170px,.5fr) 160px minmax(0,2.2fr)}}
@media(min-width:701px) and (max-width:1500px){.cmd.p5 .cmd-g:has(.skw){grid-template-columns:150px minmax(0,1fr)}.cmd.p5 .cmd-g:has(.skw) .cmd-me{grid-column:1/-1}}
.cmd.p5 .skw{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:10px;align-items:start;min-width:0}
.cmd.p5 .skc{min-width:0;display:flex;flex-direction:column;gap:4px}
.cmd.p5 .alist.skl{display:block;max-height:min(52vh,520px);overflow:auto;padding:0 6px 4px 0}
.skf{font:500 12px var(--body);color:var(--paper);display:flex;align-items:center;gap:6px;min-height:22px}.skf.dim{color:var(--dim)}.skf b{color:var(--gold)}.skf button{padding:0 8px;min-height:20px}
.skf kbd,.skpin kbd{font:500 10px var(--body);border:1px solid var(--line);padding:0 3px;margin:0 1px;color:var(--dim)}
.skg{display:flex;align-items:baseline;gap:6px;margin:8px 0 2px;font:400 12px var(--cond);letter-spacing:1.5px;text-transform:uppercase;color:var(--dim)}.skg em{font-style:normal;color:var(--paper)}.skg:first-child{margin-top:0}
.cmd.p5 .opt.skr{display:grid;grid-template-columns:12px 8px minmax(0,1fr) 14px 60px 46px;align-items:center;gap:5px;width:100%;min-height:0;padding:3px 8px;margin:0;border:0;border-bottom:1px solid var(--ink3);background:transparent;text-align:left;clip-path:none;transform:none;font:500 13px var(--body);color:var(--paper)}
.cmd.p5 .opt.skr:hover{background:var(--ink3)}.cmd.p5 .opt.skr.on{background:var(--red);color:#fff}
.opt.skr i{font-style:normal}.opt.skr .mk{color:var(--gold);font-size:11px}.opt.skr .dot{width:8px;height:8px;border-radius:50%;background:var(--e)}
.cmd.p5 .cmd-g:has(.skw) .p5m{grid-template-columns:1fr}.cmd.p5 .cmd-g:has(.skw) .p5m li{grid-column:auto}
.cmd.p5 .opt.skr{animation:none}.cmd.p5 .opt.skr>*{transform:none}.cmd.p5 .opt.skr b{font:600 13px/1.3 var(--body);text-transform:none;letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.opt.skr .pw,.opt.skr .ct{color:var(--dim);font-size:12px;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.opt.skr.on .pw,.opt.skr.on .ct,.opt.skr.on .mk{color:#fff}.opt.skr.off{opacity:.45}.opt.skr.off.on{opacity:.75}
.af{font-size:11px;text-align:center}.af.wk{color:#7dffb0}.af.rs{color:#ff7a7a}.af.uk{color:var(--dim)}.opt.skr.on .af{color:#fff}
.skw .why{color:#ff8a8a}.opt.skr.on .why{color:#fff}
.skpn{background:var(--ink3);border-top:3px solid var(--e,var(--line));padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0}
.skpn>b{font:400 20px var(--disp);letter-spacing:.5px;text-transform:uppercase;line-height:1.1}.skpn>small{color:var(--dim);font-size:12px}.skpn>p{margin:2px 0;font-size:12.5px;line-height:1.4}
.skst{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:2px}.skst div{background:var(--ink2);padding:3px 6px;font-size:12.5px}.skst em{display:block;font-style:normal;font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:1px}
.skpin{margin-top:4px;align-self:flex-start;color:var(--gold)}
.cmd.p5 .p5t.thin .tgs{gap:4px}.cmd.p5 .p5t.thin .tg{flex:0 1 auto;min-height:0;padding:3px 10px;flex-direction:row;align-items:center;gap:8px}.cmd.p5 .p5t.thin .tg b{font-size:13px;white-space:nowrap}.cmd.p5 .p5t.thin .tg .bar{width:44px;flex:none}
.pl.pg-mesa .cmd.p5 .alist.skl{max-height:min(40vh,360px)}
@media(max-width:1100px){.cmd.p5 .skw{grid-template-columns:minmax(0,1fr) 200px}}`;
  document.head.appendChild(css);
}

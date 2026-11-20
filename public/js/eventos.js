app.addEventListener('change', e => {
  const el = e.target, d = el.dataset, v = el.type === 'number' || el.type === 'range' ? +el.value : el.type === 'checkbox' ? el.checked : el.value;
  if (el.tagName === 'SELECT' || el.type === 'file') el.blur();
  if (d.a === 'passSel') { passTo = v; return; }
  if (d.ou) { const [nd, f] = d.ou.split(':'); (oUi[nd] ||= {})[f] = v; return; }
  if (d.nota) return send({ t: 'ofiNota', id: d.id, e: d.nota, txt: v });
  if (d.oc) return ocChange(el, v);
  if (d.wfup) { const f = el.files[0]; if (f) f.text().then(t => { wfImpParse(t); render(); }); return; }
  if (d.wf) return wfChange(d.wf, v);
  if (d.a === 'planLoad') { const b = lsGet('vj.builds', [])[+v]; if (b) lsSet('vj.plan.' + d.id, b.nodes); return render(); }
  if (d.a === 'campWith') { campWith[d.id] = v; const pr = myReq()?.[1]; if (S.camp.acts[d.id] === 'conversar' || (pr?.t === 'campAct' && pr.m.k === 'conversar' && pr.m.id === d.id)) send({ t: 'campAct', id: d.id, k: 'conversar', w: v }); return render(); } // com o pedido ainda na fila, reenvia: o novo substitui o anterior e leva a escolha
  if (d.up) {
    const f = el.files[0];
    if (f) fetch('/upload', { method: 'POST', headers: { 'Content-Type': f.type, ...(key ? { 'X-VJ-Key': encodeURIComponent(key) } : { 'X-VJ-User': encodeURIComponent(name), 'X-VJ-Pass': encodeURIComponent(pass) }) }, body: f }).then(r => r.ok ? r.text() : Promise.reject())
      .then(u => d.up === 'bg' ? setBg(u) : d.up === 'bbg' ? send({ t: 'map', f: 'bbg', v: u }) : /^bbL:/.test(d.up) ? send({ t: 'map', f: 'bbL', v: ({ ...(S.scenes[S.scene]?.bbL || {}), [d.up.slice(4)]: u }) }) : d.up === 'hand' ? (hand.img = u, render()) : send({ t: 'set', id: d.id, f: /^img[FBP]$/.test(d.up) ? d.up : 'img', v: u })).catch(() => toast('Falha no envio da imagem.', 'no', 'Aceita PNG, JPG, WEBP ou GIF de até 5 MB.'));
  } else if (d.ed) send({ t: 'edSet', coll: d.ed, id: d.id, f: d.f, v });
  else if (d.ini) send({ t: 'ini', k: 'set', id: d.ini, v });
  else if (d.bfx) { const b = { in: null, hit: null, col: '', ...(S.chars[d.id]?.bossFx || {}) }; b[d.bfx] = v || (d.bfx === 'col' ? '' : null); send({ t: 'set', id: d.id, f: 'bossFx', v: b }); } // cenas de chefe
  else if (d.f) send({ t: 'set', id: d.id, f: d.f, v });
  else if (d.map === 'bg') setBg(v);
  else if (/^bbL:/.test(d.map)) send({ t: 'map', f: 'bbL', v: ({ ...(S.scenes[S.scene]?.bbL || {}), [d.map.slice(4)]: v }) }); // camadas do parallax
  else if (d.map) send({ t: 'map', f: d.map, v });
  else if (d.mid) mods[d.mid] = v;
  else if (d.sess) sess[d.sess] = v;
  else if (d.qa) qa[d.qa] = v;
});
app.addEventListener('input', e => { const ds = e.target.dataset; if (ds.rqtxt && reqUi[ds.rqtxt]) reqUi[ds.rqtxt].txt = e.target.value; if (ds.sess) sess[ds.sess] = e.target.value; if (ds.qa) qa[ds.qa] = e.target.type === 'number' ? +e.target.value : e.target.value; const k = ds.bf; if (!k) return; bf[k] = e.target.value; if (['q', 'giveq', 'skq', 'wq', 'wsq'].includes(k)) render(); }); // filtros e buscas
// busca da árvore: Enter (ou ↵) leva a câmera ao próximo resultado, trocando de aba se ele estiver em outra
function skNextHit() { if (!skHits.length) return toast('Nada encontrado com essa busca.'); const id = skHits[skHitI++ % skHits.length]; const v = skView(); MANDALA.focus(id); if (skView() !== v) render(); }
app.addEventListener('toggle', e => { const k = e.target.dataset?.oper; if (k) oOpen[k] = e.target.open; }, true); // lembra as perícias abertas e fechadas
app.addEventListener('keydown', e => { const el = e.target; if (!el.dataset?.edin) return; if (e.key === 'Enter') { e.preventDefault(); el.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); el.value = ''; el.blur(); } }, true);
app.addEventListener('keydown', e => { // elementos clicáveis que não são <button> também respondem ao teclado
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('span[data-a],[data-tab],[data-node],[data-tgt],[data-open],[data-aim]')) { e.preventDefault(); e.target.click(); }
});
// confirma a ação escolhida (botão Agir do celular, Enter e clique no alvo do PC): o minigame de ataque, se houver, abre antes de mandar
function goAct(id) { skQ = ''; if (pick.k === 'sk' && selfSk(SK(pick.id))) tgt = id; if (!(tgt in S.battle.ticks)) return toast('Escolha um alvo primeiro.');
  const msg = pick.k === 'it' ? { t: 'use', id: id, item: pick.id, target: tgt } : { t: 'act', id: id, skill: pick.id, target: tgt, aim, brave: braveOn, pass: passTo }; aim = null; aimOpen = false; braveOn = false; passTo = ''; if (typeof LEQUE !== 'undefined') LEQUE.reset();
  const who = S.chars[id], s1 = msg.t === 'act' ? SK(msg.skill) : null;
  if (s1?.cmd && s1.cmd !== 'choque' && who && !who.enemy && !gm && typeof runCmd === 'function') { runCmd(msg.skill, who, S.chars[tgt], cmd => send({ ...msg, cmd })); return; } // minigame de ataque: a nota vai junto no `act`
  send(msg);
}
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest?.('.skfind2')) { e.preventDefault(); e.stopPropagation(); return skNextHit(); } if (e.key === 'Enter' && e.target.dataset.rqtxt) { e.preventDefault(); send({ t: 'reqOk', id: e.target.dataset.rqtxt, ...reqUi[e.target.dataset.rqtxt] }); } });
app.addEventListener('focusout', e => {
  if (e.target.dataset?.edin && editing) return commitEd(e.target);
  // campo restaurado após redesenho não dispara "change" sozinho: dispara aqui para não perder a edição
  if (e.target._dirty) { e.target._dirty = false; e.target.dispatchEvent(new Event('change', { bubbles: true })); }
  setTimeout(() => pending && render());
});
app.addEventListener('click', e => {
  if (ctx) { ctx = null; setTimeout(render); }
  if (e.target.closest('.edin')) return;
  const edt = e.target.closest('[data-edit]');
  if (edt && gm) { editing = { id: edt.dataset.id, f: edt.dataset.edit }; editFocus = true; return render(); }
  const lq = e.target.closest('.stroke[data-lq],.hk[data-lq],.lq-gm-open[data-lq]'); if (lq) return LEQUE.click(lq.dataset.lq, lq.dataset.v); // pincelada do leque (PC)
  const d = e.target.closest('[data-a]')?.dataset, u = e.target.closest('[data-tgt]'), tb = e.target.closest('[data-tab]');
  if (tb) { tabs[tb.dataset.id] = tb.dataset.tab; return render(); }
  const op = e.target.closest('[data-open]');
  if (op) { open[op.dataset.open] = !(open[op.dataset.open] ?? !gm); return render(); }
  const nd = e.target.closest('[data-node]:not([data-a])'); // os botões dos Ofícios também têm data-node, mas são ações (data-a)
  if (nd) { selNode[nd.dataset.id] = nd.dataset.node; const inSk = nd.closest('.skside'); if (inSk) skTab = 'no'; render(); if (inSk) MANDALA.focus(nd.dataset.node); return; }
  const am = e.target.closest('[data-aim]'), sb = e.target.closest('[data-sub]'), pvb = e.target.closest('[data-pv]');
  const czb = e.target.closest('[data-cz]');
  if (czb) { cz[czb.dataset.cz] = czb.dataset.v; return render(); }
  if (am) { aim = aim === am.dataset.aim ? null : am.dataset.aim; return render(); }
  if (sb) { sub = sb.dataset.sub || null; if (!['sk', 'it', 'wp'].includes(sub)) pick = { k: 'atk', id: 'atk' }; return render(); }
  if (pvb) { pv = pvb.dataset.pv; return render(); }
  const ftb = e.target.closest('[data-ftab]');
  if (ftb) { ftab[ftb.dataset.id] = ftb.dataset.ftab; return render(); }
  const pgb = e.target.closest('[data-pg]'), sl = e.target.closest('[data-sel]');
  if (pgb) { pg = pgb.dataset.pg; navOpen = false; if (innerWidth < 1000) chatOpen = false; scrollTo(0, 0); return render(); }
  if (sl) { selCh = sl.dataset.sel; return render(); }
  if (!d && u) { if (LEQUE.clickTgt(u.dataset.tgt) || LEQUE.zoomClick(u.dataset.tgt)) return; if (tgt !== u.dataset.tgt) aim = null; tgt = u.dataset.tgt; return render(); }
  if (!d) return;
  if (d.a === 'imgRm') return send({ t: 'set', id: d.id, f: d.k, v: '' }); // imagens de batalha: tira a frente, as costas ou o retrato
  if (d.a === 'openSheet') { if (gm) gOpen('f_' + d.id); else { pg = 'pers'; selCh = d.id; } return render(); }
  if (d.a === 'lay') { // arranjos de janelas: aplica o salvo (ou o padrão); Shift salva o atual
    const saved = JSON.parse(localStorage.vj_lay || '{}');
    if (e.shiftKey) { saved[d.k] = wins; localStorage.vj_lay = JSON.stringify(saved); return toast(`Arranjo "${d.k}" salvo.`, 'ok'); }
    if (saved[d.k]) wins = { ...wins, ...structuredClone(saved[d.k]) };
    else { for (const k in wins) wins[k].open = LAYD[d.k].includes(k);
      const W = innerWidth, H = innerHeight, at = (k, x, y) => Object.assign(wins[k], { x, y });
      at('cena', 16, 56); at('ini', 16, 56); at('chat', 16, Math.max(330, H - 360)); at('batalha', 360, 56); at('fichas', W - 416, 56); at('skills', 360, 56); at('items', 360, 420); at('best', 360, 56); at('armas', 16, 56); }
    localStorage.vj_wins = JSON.stringify(wins); return render();
  }
  if (d.a === 'winT' || d.a === 'winX') { wins[d.id].open = d.a === 'winT' && !wins[d.id].open; localStorage.vj_wins = JSON.stringify(wins); return render(); }
  if (d.a === 'fogMode') { fogMode = !fogMode; return render(); }
  if (d.a === 'secret') { secret = !secret; return render(); }
  if (d.a === 'cropOn') { cropMode = true; cropSel = { ...S.scenes[S.scene].crop }; return render(); }
  if (d.a === 'cropX') { cropMode = false; return render(); }
  if (d.a === 'cropOk' || d.a === 'cropAll') { // a proporção do mapa vem do recorte sobre o tamanho real da imagem
    const im = app.querySelector('.cropbox img'), c = d.a === 'cropAll' || !cropSel || cropSel.w < .03 ? { x: 0, y: 0, w: 1, h: 1 } : cropSel;
    send({ t: 'map', f: 'crop', v: c }); send({ t: 'map', f: 'ar', v: (c.w * im.naturalWidth) / (c.h * im.naturalHeight) }); cropMode = false; Object.assign(view, { z: 1, x: 0, y: 0 }); return render();
  }
  if (d.a === 'camFix') { const w = mapEl().offsetWidth; return send({ t: 'map', f: 'cam', v: { z: view.z, fx: view.x / w, fy: view.y / w } }); }
  if (d.a === 'camFree') return send({ t: 'map', f: 'cam', v: null });
  if (d.a === 'skReset') return MANDALA.focus('mine');
  if (d.a === 'skCore') return MANDALA.focus('core'); // centraliza no núcleo Marcial
  if (d.a === 'skArmas') return MANDALA.focus('armas'); // Árvore de Armas (bloco à parte)
  if (d.a === 'skAll') return MANDALA.focus('all');
  if (d.a === 'skFocus') return MANDALA.focus(d.el);
  if (d.a === 'skView') { MANDALA.view(d.el); return render(); } // abas da árvore: Tudo, Marcial, Armas e cada setor
  if (d.a === 'skHit') return skNextHit();
  if (d.a === 'skQclr') { bf.skq = ''; bf.skf = ''; bf.skc = ''; return render(); }
  if (d.a === 'skRotL') return MANDALA.rotate(-1);
  if (d.a === 'skRotR') return MANDALA.rotate(1);
  if (d.a === 'skTab') { skTab = d.v; lsSet('vj.skTab', d.v); return render(); }
  if (d.a === 'skDrawer') { skDrawer = !skDrawer; return render(); }
  if (d.a === 'miniT') return HUD.miniT();
  if (d.a === 'reframe') return send({ t: 'battleReframe' });
  if (d.a === 'navT') { navOpen = !navOpen; return render(); }
  if (d.a === 'chatT') { chatOpen = !chatOpen; return render(); }
  if (d.a === 'meT') { meOpen = !meOpen; return render(); }
  if (d.a === 'itab') { itab = d.k; return render(); }
  if (d.a === 'aimT') { aimOpen = !aimOpen; return render(); }
  if (d.a === 'pick') { pick = { k: d.k, id: d.v }; if (LEQUE.picked()) skQ = ''; return render(); }
  if (d.a === 'skPinT') { const ch = S.chars[d.id]; return send({ t: 'skPin', id: d.id, sk: d.v, on: !ch?.skPin?.includes(d.v) }); }
  if (d.a === 'skQx') { skQ = ''; return render(); }
  if (d.a === 'ofiUse') { const u = oUi[d.node] || {}; return send({ t: 'ofiUse', id: d.id, node: d.node, item: u.item, rune: u.rune, el2: u.el2, sig: u.sig, nm: u.nm, target: u.target, part: u.part }); }
  if (d.a?.startsWith('oc') && gm) return ocClick(d);
  if (d.a?.startsWith('wf') && gm) return wfClick(d);
  if (d.a === 'ofiNota') return send({ t: 'ofiNota', id: d.id, e: d.k, del: true });
  if (d.a === 'skF') { bf.skf = bf.skf === d.v ? '' : d.v; return render(); }
  if (d.a === 'skC') { bf.skc = String(bf.skc) === d.v ? '' : d.v; return render(); } // filtro por camada
  if (d.a === 'planT') { const k = 'vj.plan.' + d.id, p = lsGet(k, []); lsSet(k, p.includes(d.name) ? p.filter(n => n !== d.name) : [...p, d.name]); return render(); }
  if (d.a === 'planClear') { lsSet('vj.plan.' + d.id, []); return render(); }
  if (d.a === 'planSave') { const n = prompt('Nome da build?'); if (!n) return; lsSet('vj.builds', [...lsGet('vj.builds', []).filter(b => b.name !== n), { name: n.slice(0, 40), nodes: lsGet('vj.plan.' + d.id, []) }].slice(-12)); return render(); }
  if (d.a === 'braveT') { braveOn = !braveOn; return render(); }
  if (d.a === 'go') return goAct(d.id);
  if (d.a === 'rollAsk') { rollDlg = { id: d.id, attr: d.attr }; return render(); }
  if (d.a === 'rollX') { rollDlg = null; return render(); }
  if (d.a === 'rollMod') { mods[rollDlg.id] = +d.v; return render(); }
  if (d.a === 'rollGo') { send({ t: 'roll', id: rollDlg.id, attr: rollDlg.attr, mod: mods[rollDlg.id] || 0 }); mods[rollDlg.id] = 0; rollDlg = null; return render(); }
  if (d.a === 'reqNo') return send({ t: 'reqNo', id: d.id });
  if (d.a === 'rqMod') { reqUi[d.id].mod = +d.v; return render(); }
  if (d.a === 'rqAdv') { const u = reqUi[d.id]; u.adv = u.adv === d.v ? '' : d.v; return render(); }
  if (d.a === 'rqSecret') { reqUi[d.id].secret = !reqUi[d.id].secret; return render(); }
  if (d.a === 'rqOk') return send({ t: 'reqOk', id: d.id, ...reqUi[d.id] });
  if (d.a === 'rqNo') return send({ t: 'reqNo', id: d.id });
  if (d.a === 'rqWhy') { const why = prompt('Motivo (o jogador vê esta frase):'); return why === null ? null : send({ t: 'reqNo', id: d.id, why }); }
  if (d.a === 'mute') { snd.mute = !snd.mute; ls('vj_mute', snd.mute ? '1' : null); unlock(); drawSnd(); render(); if (!snd.mute) beep(); return; }
  if (d.a === 'selCard') { if (selC.has(d.id)) selC.delete(d.id); else selC.add(d.id); return render(); }
  if (d.a === 'selAll') { selC.clear(); if (d.k) Object.values(S.chars).filter(c => !!c.enemy === (d.k === 'e')).forEach(c => selC.add(c.id)); return render(); }
  if (d.a === 'bulk') return send({ t: 'bulk', ids: [...selC], k: d.k, v: qa.v, st: qa.st, item: qa.item || Object.entries(S.items).sort((a, b) => a[1].name.localeCompare(b[1].name))[0]?.[0] });
  if (d.a === 'peek') return void window.open(`/player?as=${encodeURIComponent(d.k)}${d.v ? '&ctl=1' : ''}`, '_blank', 'noopener');
  if (d.a === 'skOnly') { skOnly = !skOnly; return render(); }
  if (d.a === 'skZoom') return MANDALA.zoom(+d.v);
  if (d.a === 'gridFull') { gridFull = d.id || null; return render(); }
  if (d.a === 'chaseStart') return send({ t: 'chase', k: 'start', ...cz });
  if (d.a === 'genSet') { gen[d.k] = d.v; return render(); }
  if (d.a === 'foeGen') return send({ t: 'foeGen', ...gen, n: gen.rank === 'chefe' ? 1 : +bf.n || 1, save: !!d.save });
  if (d.a === 'foeEnc') return send({ t: 'foeEnc', el: gen.el, diff: d.diff });
  if (d.a === 'bNew') { const id = Array.from(crypto.getRandomValues(new Uint8Array(4)), n => n.toString(16).padStart(2, '0')).join(''); window.vjOpenAfterState = id; send({ t: 'bNew', id }); return; }
  if (d.a === 'bDup') { window.vjOpenAfterState = { before: Object.keys(S.bestiary), source: d.id }; send({ t: 'bDup', id: d.id }); return; }
  if (d.a === 'bfSet') { bf[d.k] = bf[d.k] === d.v ? '' : d.v; return render(); }
  if (d.a === 'encAdd') { const e = encDraft.find(x => x.b === d.id && x.tier === tier); if (e) e.n = Math.min(12, e.n + (+bf.n || 1)); else encDraft.push({ b: d.id, tier, n: +bf.n || 1 }); return render(); }
  if (d.a === 'encRm') { encDraft.splice(+d.k, 1); return render(); }
  if (d.a === 'encSave') { send({ t: 'encSave', name: bf.enc || 'Encontro', list: encDraft }); encDraft = []; bf.enc = ''; return; }
  if (d.a === 'bContract') { const b = S.bestiary[d.id], gold = prompt(`Recompensa em ouro por caçar ${b.name}?`, b.goldR * 5); return gold === null ? null : send({ t: 'ctAdd', id: d.id, gold: +gold || 0, xp: b.xpR }); }
  if (d.a === 'bDel' && !confirm('Apagar este modelo do bestiário?')) return;
  if (d.a === 'ctMode') { ctMode = !ctMode; return render(); }
  if (d.a === 'tier') { tier = { fraco: 'normal', normal: 'elite', elite: 'fraco' }[tier]; return render(); }
  if (d.a === 'content' && d.coll !== 'scenes' && !confirm('Restaurar o conteúdo padrão? Edições nessa coleção serão perdidas' + (d.coll === 'bestiary' ? '.' : ' e os personagens perdem o que tinham dela.'))) return;
  if (d.a === 'logout') { ls('vj_pass', null); return location.reload(); }
  if (d.a === 'myPass') { const p = prompt('Senha nova (pelo menos 4 caracteres):'); if (!p) return; if (prompt('Digite a senha nova de novo:') !== p) return toast('As duas senhas não batem.', 'no'); return send({ t: 'userPass', pass: p }); }
  if (d.a === 'userAdd') { const n = sess.n.trim(), p = sess.p || genPass(); if (!n) return toast('Escreva o login.', 'no'); send({ t: 'userAdd', name: n, pass: p, char: sess.ch }); sess.last = { n, p }; sess.n = ''; sess.p = ''; sess.ch = ''; return render(); }
  if (d.a === 'userPass') { const p = prompt(`Senha nova para ${d.k}:`, genPass()); if (!p) return; send({ t: 'userPass', name: d.k, pass: p }); sess.last = { n: d.k, p }; return render(); }
  if (d.a === 'replay') { replayAct(+d.n); return; } // rever o golpe, só nesta tela
  if (d.a === 'logClear') { if (confirm('Apagar o registro para todos? Não dá para desfazer.')) send({ t: 'logClear' }); return; }
  if (d.a === 'userDel') { if (confirm(`Apagar a conta ${d.k}? Os personagens dela ficam sem dono.`)) send({ t: 'userDel', name: d.k }); return; }
  if (d.a === 'giveChar') { const id = prompt('Qual personagem? Digite o número:\n' + heroes().map((c, i) => `${i + 1}. ${c.name}${c.owner ? ' (de ' + c.owner + ')' : ''}`).join('\n')); const c = heroes()[+id - 1]; if (c) send({ t: 'set', id: c.id, f: 'owner', v: d.k }); return; }
  if (d.a === 'freeChar') return send({ t: 'set', id: d.id, f: 'owner', v: '' });
  if (d.a === 'copy') return copy(d.k === 'invite' ? inviteText() : accessText(sess.last), d.k === 'invite' ? 'Convite copiado. Cole no grupo dos jogadores.' : 'Acesso copiado. Mande só para esse jogador.');
  if (d.a === 'act' && !(tgt in S.battle.ticks)) return toast('Escolha um alvo clicando em uma unidade.');
  if (d.a === 'act') { const s0 = S.skills[d.skill]; if (S.chars[tgt].hp <= 0 && !(s0 && (s0.kind === 'heal' || s0.area))) return toast('Esse alvo já caiu.', 'no', 'Escolha outro alvo.'); }
  if (d.a === 'delEnemies') { const ids = Object.values(S.chars).filter(c => c.enemy && (d.k !== 'down' || c.hp <= 0)).map(c => c.id); if (!ids.length) return toast('Nenhum inimigo para remover.'); if (confirm(`Remover ${ids.length} inimigo${ids.length > 1 ? 's' : ''}?`)) ids.forEach(id => send({ t: 'delChar', id })); return; }
  if ((d.a === 'delChar' || d.a === 'sceneDel') && !confirm('Excluir?')) return;
  const m = { t: d.a, id: d.id, attr: d.attr, per: d.per, mod: mods[d.id] || 0, secret, enemy: !!d.enemy, on: !!d.on, win: !!d.win, long: !!d.long, skill: d.skill, el: d.el, target: tgt, aim, tier, n: +bf.n || 1, item: d.item, coll: d.coll, k: d.k, w: d.w, f: d.f, v: d.v, node: d.node, rec: d.rec };
  if (d.a === 'bSpawn' && e.shiftKey) m.t = 'bDel';
  if (d.a === 'addChar' && gm && !d.enemy) { const o = prompt(`Login do jogador dono? (deixe vazio para escolher depois na janela Sessão)${S.accounts.length ? '\nContas: ' + S.accounts.join(', ') : ''}`); if (o === null) return; m.owner = o.trim(); }
  if (d.a === 'horror') m.loss = +prompt('Perda de Sanidade se falhar?', 5) || 5;
  send(m);
  if (d.a === 'act' || d.a === 'use' || d.a === 'next') { aim = null; sub = null; }
});
// mapa: pincel de névoa (mestre) e arrastar tokens
const cell = (e, el) => { const r = el.getBoundingClientRect(), m = S.scenes[S.scene]; return { x: Math.floor((e.clientX - r.left) / r.width * m.cols - m.ox), y: Math.floor((e.clientY - r.top) / r.height * m.rows - m.oy) }; };
const paint = e => { const mp = e.target.closest?.('.map'); if (!mp) return; const c = cell(e, mp), k = c.x + ',' + c.y + e.shiftKey; if (k !== lastFog) { lastFog = k; send({ t: 'fog', ...c, hide: e.shiftKey, r: fogR }); } };
app.addEventListener('pointerdown', e => { // arrastar janelas do mestre pela barra de título
  const wn = e.target.closest('.win'), h = e.target.closest('[data-drag]');
  if (wn && wins[wn.dataset.win].z !== zc) { wins[wn.dataset.win].z = ++zc; wn.style.zIndex = 99; } // janela clicada vem para a frente
  if (!h || e.target.closest('button')) return;
  const el = h.parentElement, r = el.getBoundingClientRect();
  wdrag = { id: h.dataset.drag, el, dx: e.clientX - r.left, dy: e.clientY - r.top }; h.setPointerCapture(e.pointerId);
});
app.addEventListener('pointermove', e => { if (wdrag) { wdrag.el.style.left = Math.max(0, e.clientX - wdrag.dx) + 'px'; wdrag.el.style.top = Math.max(0, e.clientY - wdrag.dy) + 'px'; } });
const wdrop = () => { if (!wdrag) return; Object.assign(wins[wdrag.id], { x: parseInt(wdrag.el.style.left), y: parseInt(wdrag.el.style.top) }); localStorage.vj_wins = JSON.stringify(wins); wdrag = null; if (pending) render(); };
app.addEventListener('pointerup', wdrop); app.addEventListener('pointercancel', wdrop);
// mapa: zoom (roda), mover (botão do meio ou Espaço+arrastar), régua (Alt+arrastar), ping (duplo clique), menu (botão direito)
const mapEl = () => app.querySelector('.map'), applyView = () => { const m = mapEl(); if (m) m.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.z})`; };
app.addEventListener('wheel', e => {
  const m = e.target.closest?.('.mapwrap') && mapEl();
  if (!m) return;
  e.preventDefault();
  const r = m.getBoundingClientRect(), z = Math.min(4, Math.max(.4, view.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  view.x += (e.clientX - r.left) / view.z * (view.z - z); view.y += (e.clientY - r.top) / view.z * (view.z - z); view.z = z; applyView();
}, { passive: false });
// toque: um dedo move, dois dedos dão zoom, no mapa (a mandala das habilidades cuida dos próprios gestos)
const pts = new Map(); let pinch = null, tpan = null;
app.addEventListener('pointerdown', e => {
  const zone = e.target.closest('.mapwrap');
  if (e.pointerType !== 'touch' || !zone) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const o = view;
  if (pts.size === 2) { const [a, b] = [...pts.values()], r = mapEl().parentElement.getBoundingClientRect(); pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: o.z, x: o.x, y: o.y, px: (a.x + b.x) / 2 - r.left, py: (a.y + b.y) / 2 - r.top }; tpan = null; drag = null; }
  else if (!e.target.closest('.tok.mine') && !fogMode && !mapTool && !e.target.closest('.maptools')) tpan = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
});
app.addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId)) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], k = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d;
    const z = Math.min(4, Math.max(.4, pinch.z * k)); Object.assign(view, { z, x: pinch.px - (pinch.px - pinch.x) * z / pinch.z, y: pinch.py - (pinch.py - pinch.y) * z / pinch.z }); applyView(); }
  else if (tpan) { view.x = tpan.vx + e.clientX - tpan.sx; view.y = tpan.vy + e.clientY - tpan.sy; applyView(); }
});
const tEnd = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) tpan = null; };
addEventListener('pointerup', tEnd); addEventListener('pointercancel', tEnd);
app.addEventListener('pointerdown', e => { const cb = e.target.closest('.cropbox');
  if (cb && e.button === 0) { const r = cb.querySelector('img').getBoundingClientRect(); cdrag = { r, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; cb.setPointerCapture(e.pointerId); e.preventDefault(); } });
app.addEventListener('pointermove', e => {
  if (cdrag) { const cl = v => Math.min(1, Math.max(0, v)), x = cl((e.clientX - cdrag.r.left) / cdrag.r.width), y = cl((e.clientY - cdrag.r.top) / cdrag.r.height);
    cropSel = { x: Math.min(x, cdrag.x), y: Math.min(y, cdrag.y), w: Math.abs(x - cdrag.x), h: Math.abs(y - cdrag.y) }; const s = app.querySelector('.csel'); if (s) Object.assign(s.style, { left: cropSel.x * 100 + '%', top: cropSel.y * 100 + '%', width: cropSel.w * 100 + '%', height: cropSel.h * 100 + '%' }); }
});
addEventListener('pointerup', () => { cdrag = null; });
app.addEventListener('mousedown', e => { if (e.button === 1 && e.target.closest('.mapwrap')) e.preventDefault(); });
app.addEventListener('contextmenu', e => { const t = e.target.closest('.tok'); if (t) { e.preventDefault(); ctx = { id: t.dataset.id, x: e.clientX, y: e.clientY }; render(); } });
app.addEventListener('dblclick', e => {
  const t = e.target.closest('.tok'), m = e.target.closest('.map');
  if (t && mine(S.chars[t.dataset.id])) { if (gm) gOpen('f_' + t.dataset.id); else { pg = 'pers'; selCh = t.dataset.id; } return render(); }
  if (m && !fogMode) send({ t: 'ping', ...cell(e, m) });
});
const drawRuler = e => {
  const m = mapEl(), b = cell(e, m), a = ruler.a, sc = S.scenes[S.scene], n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  m.querySelector('.rul')?.remove();
  m.insertAdjacentHTML('beforeend', `<div class="rul"><svg viewBox="0 0 ${sc.cols} ${sc.rows}" preserveAspectRatio="none"><line x1="${a.x + sc.ox + .5}" y1="${a.y + sc.oy + .5}" x2="${b.x + sc.ox + .5}" y2="${b.y + sc.oy + .5}" vector-effect="non-scaling-stroke"/>${e.shiftKey || mapTool === 'area' ? `<rect x="${a.x + sc.ox - n}" y="${a.y + sc.oy - n}" width="${2 * n + 1}" height="${2 * n + 1}" vector-effect="non-scaling-stroke"/>` : ''}</svg><b style="--x:${b.x + sc.ox};--y:${b.y + sc.oy}">${e.shiftKey || mapTool === 'area' ? 'raio ' : ''}${dist(n, sc)}</b></div>`);
};
app.addEventListener('pointerdown', e => {
  const wrap = e.target.closest('.mapwrap');
  if (wrap && (e.button === 1 || (e.button === 0 && spaceDown))) { pan = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; wrap.setPointerCapture(e.pointerId); return; }
  if (wrap && (e.altKey || mapTool === 'ruler' || mapTool === 'area') && e.button === 0 && !e.target.closest('.maptools')) { ruler = { a: cell(e, mapEl()) }; wrap.setPointerCapture(e.pointerId); return drawRuler(e); }
  if (e.button !== 0) return;
  if (gm && fogMode && S.scenes[S.scene].fogOn) { lastFog = ''; return paint(e); }
  const t = e.target.closest('.tok.mine');
  if (t) { drag = t; t.setPointerCapture(e.pointerId); }
});
app.addEventListener('pointermove', e => {
  if (pan) { view.x = pan.vx + e.clientX - pan.sx; view.y = pan.vy + e.clientY - pan.sy; return applyView(); }
  if (ruler) return drawRuler(e);
  if (gm && fogMode && e.buttons === 1 && !spaceDown) return paint(e);
  if (!drag) return;
  const r = drag.parentElement.getBoundingClientRect();
  drag.style.left = (e.clientX - r.left) / view.z - drag.offsetWidth / 2 + 'px'; drag.style.top = (e.clientY - r.top) / view.z - drag.offsetHeight / 2 + 'px';
});
const drop = e => { pan = null; if (ruler) { ruler = null; mapEl()?.querySelector('.rul')?.remove(); } if (!drag) return; if (e.type === 'pointerup') send({ t: 'move', id: drag.dataset.id, ...cell(e, drag.parentElement) }); drag = null; if (pending) render(); };
app.addEventListener('pointerup', drop); app.addEventListener('pointercancel', drop);
// atalhos de teclado (PC)
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.target.matches('input,textarea,select,button')) { spaceDown = true; e.preventDefault(); return; }
  if (!S || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Enter' && e.target.matches('[data-regras]')) return;
  if (gm && e.target.closest('.gtop,.gside,.mz-top,.maptools') && (e.key === 'Tab' || (e.key === 'Enter' && e.target.matches('button,summary')))) return;
  if (LEQUE.key(e)) { e.preventDefault(); return; } // batalha no PC: leque, dicas e mira (leque.js)
  if (e.key === 'Escape') { // fecha, nesta ordem: menu de contexto, submenu, mira, janela da frente
    if (e.target.matches('input,textarea')) e.target.blur();
    else if (gm && gui.sheet) gEsc(); // a ficha aberta (janela por cima de tudo) fecha primeiro
    else if (rollDlg) rollDlg = null; else if (meOpen) meOpen = false; else if (navOpen) navOpen = false; else if (gridFull) gridFull = null; else if (ctx) ctx = null; else if (skQ && sub === 'sk') skQ = ''; else if (aim) aim = null;
    else if (gm) gEsc(); // fecha a ficha aberta ou encolhe o painel largo
    return render();
  }
  if (e.target.matches('input,textarea,select')) return;
  if (!gm && S.battle.active && !S.battle.cmd && app.querySelector('.cmd.mine .skw') && skKey(e)) { e.preventDefault(); return; } // seletor de skills: filtro por letras e Shift+F fixa
  if (gm && (e.key === 'Enter' || e.key === 'Delete')) { const first = Object.entries(S.reqs).sort((a, b) => a[1].n - b[1].n)[0]; if (first) { e.preventDefault(); return send(e.key === 'Enter' ? { t: 'reqOk', id: first[0], ...reqUi[first[0]] } : { t: 'reqNo', id: first[0] }); } }
  if (e.key === 'Enter' && !gm && S.battle.active) { const go = app.querySelector('.cmd.mine .cmd-go .go:not(:disabled)'); if (go && !e.target.matches('button')) { e.preventDefault(); go.click(); return; } } // na sua vez, Enter age
  if (e.key === '0') { Object.assign(view, { z: 1, x: 0, y: 0 }); return applyView(); }
  if (!S.battle.active) return;
  if (e.key === 'Tab') { // percorre os alvos vivos
    const ids = Object.values(S.chars).filter(c => c.id in S.battle.ticks && c.hp > 0).sort((x, y) => y.enemy - x.enemy).map(c => c.id);
    e.preventDefault(); tgt = ids[(ids.indexOf(tgt) + (e.shiftKey ? ids.length - 1 : 1)) % ids.length]; aim = null; return render();
  }
  if (!gm && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { // seta do alvo: pula entre os cartões
    const ids = [...app.querySelectorAll('.cmd .tgs .tg:not(.ko)')].map(b => b.dataset.tgt); if (!ids.length) return;
    e.preventDefault(); tgt = ids[(Math.max(0, ids.indexOf(tgt)) + (e.key === 'ArrowLeft' ? ids.length - 1 : ids.indexOf(tgt) < 0 ? 0 : 1)) % ids.length]; aim = null; return render();
  }
  if (!gm && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { // anda na lista de skills/itens
    const os = [...app.querySelectorAll('.cmd .alist .opt:not(:disabled)')]; if (!os.length) return;
    e.preventDefault(); const i = os.findIndex(o => o.classList.contains('on')); os[(i + (e.key === 'ArrowUp' ? os.length - 1 : 1) + (i < 0 && e.key === 'ArrowDown' ? os.length - 1 : 0)) % os.length].click(); app.querySelector('.skr.on')?.scrollIntoView({ block: 'nearest' }); return;
  }
  if (e.key >= '1' && e.key <= '9') app.querySelectorAll('.cmd .p5m .p5i')[e.key - 1]?.click();
});
document.addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
let rsT; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => S && render(), 150); });
if (gm || asWho ? key : name && pass) connect(); else loginForm();

// ===== editor de enquadre das imagens de batalha (Ficha): arrastar move a figura, a roda aproxima, soltar envia imgK =====
{
  const chOf = id => S?.chars?.[id] || S?.bestiary?.[id];
  const base = (el) => { const c = chOf(el.dataset.id), k = el.dataset.k, v = c?.imgK?.[k] || {}; return { id: el.dataset.id, k, x: +v.x || 0, y: +v.y || 0, z: +v.z || 1 }; };
  const show = (el, v) => { const i = el.querySelector('img'); if (i) i.style.transform = PALCO3D.imgFit({ imgK: { [v.k]: v } }, v.k, { fallback: false }); };
  const unit = el => el.classList.contains('por') ? [el.clientWidth, el.clientHeight] : [150, 150]; // retrato: % do quadro; figura: fração da altura (--h 150px)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r2 = v => Math.round(v * 100) / 100;
  const fire = v => { send({ t: 'set', id: v.id, f: 'imgK', v: { k: v.k, x: r2(v.x), y: r2(v.y), z: r2(v.z) } }); setTimeout(() => { if (imgkLive === v) imgkLive = null; }, 800); };
  let dr = null, wT = 0;
  addEventListener('pointerdown', e => { const el = e.target.closest?.('.imgk'); if (!el || el.classList.contains('fb') || e.button !== 0) return; e.preventDefault();
    const v = base(el); dr = { el, v, sx: e.clientX, sy: e.clientY, x0: v.x, y0: v.y, u: unit(el) }; imgkLive = v; el.setPointerCapture?.(e.pointerId); });
  addEventListener('pointermove', e => { if (!dr) return; const v = dr.v; v.x = clamp(dr.x0 + (e.clientX - dr.sx) / dr.u[0], -1, 1); v.y = clamp(dr.y0 + (e.clientY - dr.sy) / dr.u[1], -1, 1);
    const el = dr.el.isConnected ? dr.el : document.querySelector(`.imgk[data-id="${v.id}"][data-k="${v.k}"]`); if (el) show(el, v); });
  addEventListener('pointerup', () => { if (!dr) return; const { v, x0, y0 } = dr; dr = null; if (v.x !== x0 || v.y !== y0) fire(v); else imgkLive = null; });
  addEventListener('wheel', e => { const el = e.target.closest?.('.imgk'); if (!el || el.classList.contains('fb')) return; e.preventDefault();
    const v = imgkLive && imgkLive.id === el.dataset.id && imgkLive.k === el.dataset.k ? imgkLive : (imgkLive = base(el)); v.z = clamp(v.z * Math.exp(-e.deltaY * .0015), .5, 3); show(el, v);
    clearTimeout(wT); wT = setTimeout(() => fire(v), 350); }, { passive: false });
  addEventListener('input', e => { const r = e.target; if (r.matches?.('.imgs input[type=range]')) { const o = r.parentElement.querySelector('output'); if (o) o.textContent = (+r.value).toFixed(1).replace('.', ',') + '×'; } });
  let fxT = 0;
  addEventListener('input', e => { const r = e.target; if (!r.matches?.('[data-fxk]')) return; const box = r.closest('.fxanchors'), a = r.dataset.fxk, pair = [...box.querySelectorAll(`[data-fxk="${a}"]`)], x = +(pair.find(i => i.dataset.axis === 'x')?.value || .5), y = +(pair.find(i => i.dataset.axis === 'y')?.value || .5); clearTimeout(fxT); fxT = setTimeout(() => send({ t: 'set', id: r.dataset.id, f: 'fxK', v: { k: r.dataset.kind, a, x, y } }), 180); });
}

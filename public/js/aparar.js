// ===== Aparar: quando um inimigo vai agir e um herói do jogador conhece um nó de Aparar, aparece um anel que fecha. =====
// Apertar (botão, Espaço ou toque) nos últimos instantes, quando o anel encosta no centro, apara o golpe. Cedo demais pune.
{
  const css = document.createElement('style');
  css.textContent = `.apr{position:fixed;inset:0;z-index:55;display:flex;align-items:center;justify-content:center;pointer-events:none}
.apr-box{pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 22px;border-radius:14px;background:rgba(12,8,20,.82);border:1px solid #b42b2b;box-shadow:0 0 40px rgba(180,40,40,.45);color:#fde8e8;font:600 15px/1.3 Barlow,sans-serif;max-width:calc(100vw - 32px)}
.apr-ring{position:relative;width:150px;height:150px}
.apr-ring i{position:absolute;inset:0;border-radius:50%;border:4px solid #ff5a5a;animation:aprShrink var(--w) linear forwards}
.apr-ring b{position:absolute;inset:58px;border-radius:50%;background:#ffd2d2;box-shadow:0 0 16px #ff5a5a}
.apr-ring u{position:absolute;inset:calc(58px - var(--z));border-radius:50%;border:2px dashed #ffd2d2;opacity:.7}
.apr button{font:700 18px/1 Barlow,sans-serif;letter-spacing:3px;padding:12px 28px;border-radius:10px;border:0;background:#d63b3b;color:#fff;cursor:pointer;min-height:44px}
.apr button:disabled{opacity:.5;cursor:default}
@keyframes aprShrink{from{transform:scale(1)}to{transform:scale(.39)}}
@media (prefers-reduced-motion:reduce){.apr-ring i{animation-timing-function:steps(8)}}`;
  document.head.append(css);
  let el = null, key = '', t0 = 0;
  const mine = () => !gm && S?.battle?.active && S.battle.parry && Object.values(S.chars).filter(c => !c.enemy && c.owner === name && c.hp > 0 && c.id in (S.battle.ticks || {}) && !c.parT)
    .map(c => ({ c, n: (c.skills || []).map(k => S.skills[k]).filter(x => x?.par).sort((x, y) => y.par - x.par)[0] })).filter(o => o.n && c0(o));
  const c0 = o => o.c.aura >= (o.n.cost || 0);
  const press = () => { if (!el || el.dataset.done) return; el.dataset.done = 1; el.querySelectorAll('button').forEach(b => b.disabled = true); send({ t: 'parry', id: el.dataset.id }); };
  addEventListener('keydown', e => { if (el && e.code === 'Space') { e.preventDefault(); press(); } });
  const sync = () => {
    const P = S?.battle?.parry, l = P ? mine() : [], k = P ? P.foe + ':' + P.at : '';
    if ((!l.length || k !== key) && el) { el.remove(); el = null; }
    if (!l.length || el) return;
    key = k; t0 = performance.now();
    const { c, n } = l[0], foe = S.chars[P.foe], w = Math.max(300, P.w - 150), z = Math.round(n.par / P.w * 92 / 2);
    el = document.createElement('div'); el.className = 'apr'; el.dataset.id = c.id; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'Aparar o golpe');
    el.innerHTML = `<div class="apr-box"><div>${esc(foe?.name || 'O inimigo')} vai atacar!</div><div class="apr-ring" style="--w:${w}ms;--z:${z}px"><u></u><i></i><b></b></div>
      <button type="button">APARAR</button><small>${esc(c.name)} · ${n.cost || 0} Aura · aperte quando o anel fechar (Espaço)</small></div>`;
    el.querySelector('button').onclick = press; document.body.append(el);
    setTimeout(() => { if (el && key === k) { el.remove(); el = null; } }, P.w + 400);
  };
  const render3 = render; render = function () { render3(); try { sync(); } catch (e) { console.error(e); } };
}

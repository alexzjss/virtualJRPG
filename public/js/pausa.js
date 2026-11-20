// ===== mesa em pausa: o mestre liga e jogadores veem a tela de título "Vínculos Além do Tempo" =====
// (variação "Rachado · Éter + selo" do canvas de title cards). O mestre vê só uma faixa discreta.
{
  const AC = '#9b6fe0', AC2 = '#5b3a96', AC3 = '#d9c2ff', CRACK = '#ffffff';
  const GRAD = 'linear-gradient(180deg,#fbf3ff 0%,#d7b8ff 28%,#8a4fe0 49%,#2c0d5c 52%,#b98af5 70%,#f4e9ff 100%)';
  const rot = (from, to, dur) => `<animateTransform attributeName="transform" type="rotate" additive="sum" from="${from}" to="${to}" dur="${dur}" repeatCount="indefinite"/>`;
  const gear = (x, y, r, w, dash, op, dur, rev) => `<g transform="translate(${x} ${y})" opacity="${op}"><circle r="${r}" fill="none" stroke="${AC2}" stroke-width="${w}" stroke-dasharray="${dash}"/><circle r="${r - w}" fill="none" stroke="${AC2}" stroke-width="6"/><circle r="${r / 4}" fill="none" stroke="${AC2}" stroke-width="8"/><path d="M${-(r - w)} 0H${r - w}M0 ${-(r - w)}V${r - w}" stroke="${AC2}" stroke-width="7"/>${rev ? rot(360, 0, dur) : rot(0, 360, dur)}</g>`;
  const NUM = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].map((t, i) => { const a = i * Math.PI / 6; return `<text x="${Math.round(Math.sin(a) * 410)}" y="${Math.round(-Math.cos(a) * 410)}">${t}</text>`; }).join('');
  const shard = (pts, a, b, dur, op) => `<polygon points="${pts}" opacity="${op}"><animateTransform attributeName="transform" type="translate" values="${a};${b};${a}" dur="${dur}s" repeatCount="indefinite"/></polygon>`;
  const CRACKS = ['8,-2 14,22 11,40 18,58 15,102', '14,22 30,30 38,26', '33,-2 36,18 30,30 34,52 28,74 31,102', '34,52 50,48 58,60', '52,-2 55,20 50,48 54,70 49,102', '54,70 66,74 74,66', '71,-2 68,24 74,44 70,102', '68,24 82,30 92,22', '88,-2 86,40 92,62 89,102', '74,44 86,40'];
  const line = (pts, col, w, op) => `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${op}" vector-effect="non-scaling-stroke" stroke-linejoin="bevel"/>`;
  const txt = (t, size, ls) => `<div style="font-size:${size}px;line-height:1.05;letter-spacing:${ls}px;background:${GRAD};-webkit-background-clip:text;background-clip:text;color:transparent">${t}</div>`;

  const CARD = `<div class="pz-card">
  <svg aria-hidden="true" viewBox="0 0 1920 1080" class="pz-full">
    ${gear(260, 900, 230, 44, '22 18', .35, '80s')}${gear(1690, 170, 170, 36, '18 15', .3, '60s', 1)}${gear(1560, 930, 120, 28, '14 12', .22, '45s')}
    <g transform="translate(960 540)">
      <circle r="500" fill="none" stroke="${AC}" stroke-width="2" opacity=".55"/>
      <circle r="482" fill="none" stroke="${AC}" stroke-width="10" stroke-dasharray="2 23.2" opacity=".55"/>
      <circle r="470" fill="none" stroke="${AC}" stroke-width="1" opacity=".4"/>
      <circle r="330" fill="none" stroke="${AC}" stroke-width="1" stroke-dasharray="6 10" opacity=".35"/>
      <g fill="${AC}" opacity=".5" font-family="Cinzel,serif" font-size="46" text-anchor="middle" dominant-baseline="middle">${NUM}</g>
      <g opacity=".4"><path d="M0 40 L-10 0 L0 -300 L10 0 Z" fill="${AC}"/>${rot(0, 360, '120s')}</g>
      <g opacity=".4"><path d="M0 30 L-14 0 L0 -200 L14 0 Z" fill="${AC}"/>${rot(140, 500, '900s')}</g>
      <circle r="16" fill="${AC}" opacity=".5"/>
    </g>
  </svg>
  <div class="pz-full" style="background:radial-gradient(ellipse at 50% 50%,rgba(180,130,255,.10) 0%,transparent 35%,rgba(0,0,0,.82) 100%)"></div>
  <svg aria-hidden="true" viewBox="0 0 1920 1080" class="pz-full"><g fill="${AC3}">
    ${shard('0,0 22,6 10,20', '520 600', '470 520', 11, 1)}${shard('0,0 14,10 4,18', '1420 470', '1490 410', 9, .8)}${shard('0,0 30,4 18,26', '1480 640', '1560 690', 13, .9)}
    ${shard('0,0 10,3 6,12', '420 420', '360 380', 10, .7)}${shard('0,0 18,8 2,16', '900 230', '930 170', 12, 1)}${shard('0,0 12,2 8,14', '1100 820', '1150 880', 8, .75)}
    ${shard('0,0 24,10 6,22', '640 800', '580 860', 14, .85)}${shard('0,0 8,4 3,9', '1300 300', '1340 250', 9, .6)}
  </g></svg>
  <div class="pz-full pz-center">
    <svg aria-hidden="true" viewBox="-100 -100 200 200" style="width:190px;height:190px;margin-bottom:18px;filter:drop-shadow(0 0 16px rgba(170,110,255,.5))">
      <g fill="none" stroke="${AC3}" stroke-width="2"><circle r="92"/><circle r="84" stroke-width="1" stroke-dasharray="2 5"/><circle r="62"/>
        <path d="M-30 -42 L30 -42 L0 0 L30 42 L-30 42 L0 0 Z"/><path d="M-36 -42 L36 -42 M-36 42 L36 42"/>
        <ellipse cx="-62" cy="0" rx="14" ry="8"/><ellipse cx="62" cy="0" rx="14" ry="8"/>
        <path d="M0 -92 L0 -62 M0 62 L0 92 M-65 -65 L-44 -44 M65 65 L44 44 M65 -65 L44 -44 M-65 65 L-44 44"/></g>
      <path d="M-14 -34 L14 -34 L0 -14 Z M-4 30 L4 30 L18 36 L-18 36 Z" fill="${AC3}"/>
      <g><circle r="96" fill="none" stroke="${AC3}" stroke-width="1" stroke-dasharray="1 14"/>${rot(0, 360, '40s')}</g>
    </svg>
    <div class="pz-title">
      ${txt('VÍNCULOS', 200, 6)}${txt('ALÉM DO TEMPO', 104, 10)}
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" class="pz-cracks">${CRACKS.map(p => line(p, '#000', 4, .85)).join('')}${CRACKS.map(p => line(p, CRACK, 1, .8)).join('')}</svg>
    </div>
    <div class="pz-rule"><span></span><i></i><b>RPG</b><i></i><span></span></div>
    <div class="pz-paused">SESSÃO EM PAUSA</div>
  </div>
</div>`;

  const css = document.createElement('style');
  css.textContent = `
.pz{position:fixed;inset:0;z-index:9999;overflow:hidden;background:radial-gradient(ellipse at 50% 48%,#22123a 0%,#0d0718 42%,#040208 100%);animation:pzIn .8s ease both;cursor:default}
@keyframes pzIn{from{opacity:0}to{opacity:1}}
.pz-card{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform:translate(-50%,-50%) scale(var(--pz,1));font-family:'Cinzel',serif}
.pz-full{position:absolute;left:0;top:0;width:1920px;height:1080px}
.pz-center{display:flex;flex-direction:column;align-items:center;justify-content:center}
.pz-title{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;font-family:'Cinzel Decorative',serif;font-weight:900;filter:drop-shadow(0 0 28px rgba(170,110,255,.5)) drop-shadow(0 10px 8px rgba(0,0,0,.9))}
.pz-cracks{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.pz-rule{display:flex;align-items:center;gap:26px;margin-top:44px}
.pz-rule span{width:180px;height:1px;background:linear-gradient(90deg,transparent,${AC})}.pz-rule span:last-child{background:linear-gradient(90deg,${AC},transparent)}
.pz-rule i{width:12px;height:12px;border:1px solid ${AC3};transform:rotate(45deg)}
.pz-rule b{font-weight:600;font-size:28px;letter-spacing:16px;color:${AC3};margin-right:-16px}
.pz-paused{position:absolute;left:0;right:0;bottom:56px;text-align:center;font-weight:600;font-size:22px;letter-spacing:12px;color:${AC};animation:pzBreath 4s ease-in-out infinite}
@keyframes pzBreath{0%,100%{opacity:.5}50%{opacity:1}}
.pzgm{position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:60;padding:6px 18px;background:#2c0d5c;color:#f4e9ff;border:1px solid ${AC};border-top:0;font:600 13px/1.4 Barlow,sans-serif;letter-spacing:2px}
@media (prefers-reduced-motion:reduce){.pz,.pz-paused{animation:none}}`;
  document.head.append(css);
  const font = document.createElement('link');
  font.rel = 'stylesheet'; font.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@900&family=Cinzel:wght@600&display=swap';
  document.head.append(font);

  let el = null, gmEl = null;
  const fit = () => el && el.style.setProperty('--pz', Math.min(innerWidth / 1920, innerHeight / 1080));
  addEventListener('resize', fit);
  // a camada vive fora do #app: o redesenho da mesa não a recria, então as animações não reiniciam
  const syncPause = () => {
    const on = !!S?.paused;
    if (on && !gm && !el) { el = document.createElement('div'); el.className = 'pz'; el.setAttribute('role', 'status'); el.setAttribute('aria-label', 'Mesa em pausa'); el.innerHTML = CARD; document.body.append(el); fit(); }
    if ((!on || gm) && el) { el.remove(); el = null; }
    if (on && gm && !gmEl) { gmEl = document.createElement('div'); gmEl.className = 'pzgm'; gmEl.textContent = 'MESA EM PAUSA · os jogadores veem a tela de título'; document.body.append(gmEl); }
    if ((!on || !gm) && gmEl) { gmEl.remove(); gmEl = null; }
  };
  const render2 = render; render = function () { render2(); try { syncPause(); } catch (e) { console.error(e); } };
}

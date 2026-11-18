// ===== anúncios de tela cheia: transição "estilhaço" na entrada da batalha e faixa diagonal (chefe, Domínio, Vitória, Caído) =====
// Mesma linguagem visual da tela de pausa (Cinzel, gradiente em background-clip, régua com losango). As camadas vivem fora do #app
// (o redesenho não as recria), ficam entre o palco e a pausa (z 9000 < 9999) e nunca capturam cliques. Os disparos vêm de comparar
// o estado anterior com o atual a cada render(); a primeira leitura só grava o estado, e com a mesa em pausa nada aparece.
{
  const PURPLE = '#9b6fe0';
  // fundos prontos da batalha → tema paranormal (cor principal, cor do relâmpago); nomes soltos (URL com "sangue" etc.) também casam
  const TEMA = { sangue: ['#e4263a', '#ff8a8a'], morte: ['#a3a9b4', '#e8ebf0'], conhecimento: ['#f0c04a', '#fff1b8'], energia: ['#8a5cff', '#35e0ff'], medo: ['#f4f4f4', '#6a6a6a'] };
  const DE = { rubro: 'sangue', noite: 'morte', santuario: 'conhecimento', tempestade: 'energia', vazio: 'medo' };
  const tema = () => {
    const b = String(S?.scenes?.[S.scene]?.bbg || '').toLowerCase(), k = DE[b] || Object.keys(TEMA).find(t => b.includes(t));
    return k ? { k, c: TEMA[k][0], c2: TEMA[k][1], para: true } : { k: '', c: PURPLE, c2: '#d9c2ff', para: false };
  };
  // gradiente no padrão da pausa (claro → cor → escuro no meio → cor → claro), derivado de uma cor base
  const grad = c => c === PURPLE ? 'linear-gradient(180deg,#fbf3ff 0%,#d7b8ff 28%,#8a4fe0 49%,#2c0d5c 52%,#b98af5 70%,#f4e9ff 100%)'
    : `linear-gradient(180deg,color-mix(in srgb,${c} 25%,#fff) 0%,color-mix(in srgb,${c} 70%,#fff) 28%,${c} 49%,color-mix(in srgb,${c} 25%,#000) 52%,color-mix(in srgb,${c} 80%,#000) 70%,color-mix(in srgb,${c} 25%,#fff) 100%)`;
  const calmo = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = document.createElement('style');
  css.textContent = `
.an-tr,.an-bn{position:fixed;inset:0;z-index:9000;overflow:hidden;pointer-events:none;font-family:'Cinzel',serif}
.an-tr *,.an-bn *{pointer-events:none}
.an-tr{animation:anTrOut .25s ease 1.15s both}
@keyframes anTrOut{to{opacity:0}}
.an-sh{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,color-mix(in srgb,var(--c) 22%,#0a0612) 0%,#050208 85%);opacity:0;animation:anSh 1.4s cubic-bezier(.6,0,.9,.4) both}
.an-sh::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--c2) 70%,transparent)}
@keyframes anSh{0%{opacity:0;transform:none}12%{opacity:1;transform:none}48%{opacity:1;transform:none}100%{opacity:1;transform:translate(var(--tx),var(--ty)) rotate(var(--r));filter:brightness(.6)}}
.an-sig{position:absolute;left:50%;top:50%;width:min(70vmin,620px);height:min(70vmin,620px);margin:calc(min(70vmin,620px)/-2) 0 0 calc(min(70vmin,620px)/-2);animation:anSig 1.1s ease-out .05s both;filter:drop-shadow(0 0 18px var(--c))}
@keyframes anSig{0%{opacity:0;transform:scale(.2) rotate(-40deg)}25%{opacity:1}100%{opacity:0;transform:scale(1.6) rotate(25deg)}}
.an-fl{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#fff 0%,var(--c2) 18%,transparent 55%);opacity:0;animation:anFl .45s ease-out .08s both}
@keyframes anFl{0%{opacity:0}25%{opacity:.95}100%{opacity:0}}
.an-tx{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-family:'Cinzel Decorative','Cinzel',serif;font-weight:900;font-size:min(17vw,170px);letter-spacing:.06em;line-height:1;color:transparent;background:var(--g);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 24px var(--c)) drop-shadow(0 8px 6px rgba(0,0,0,.9));animation:anTx 1.2s cubic-bezier(.2,.8,.2,1) .1s both}
@keyframes anTx{0%{opacity:0;transform:translateY(-50%) scale(1.8);letter-spacing:.4em}25%{opacity:1;transform:translateY(-50%) scale(1);letter-spacing:.06em}70%{opacity:1;transform:translateY(-50%) scale(1.04)}100%{opacity:0;transform:translateY(-50%) scale(1.15)}}
.an-bn .an-band{position:absolute;left:-25vw;width:150vw;top:50%;height:min(30vh,230px);margin-top:calc(min(30vh,230px)/-2);transform:rotate(-5deg);display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--c) 28%,#050208) 18%,color-mix(in srgb,var(--c) 14%,#050208) 82%,transparent);border-top:2px solid var(--c);border-bottom:2px solid var(--c);box-shadow:0 0 40px color-mix(in srgb,var(--c) 45%,transparent);animation:anBn 1.6s cubic-bezier(.2,.9,.25,1) both}
@keyframes anBn{0%{transform:translateX(-110%) rotate(-5deg);opacity:0}8%{opacity:1}28%{transform:translateX(0) rotate(-5deg)}72%{transform:translateX(2%) rotate(-5deg);opacity:1}100%{transform:translateX(110%) rotate(-5deg);opacity:0}}
.an-bt{font-family:'Cinzel Decorative','Cinzel',serif;font-weight:900;font-size:min(11vw,118px);line-height:1.05;letter-spacing:.05em;white-space:nowrap;color:transparent;background:var(--g);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 18px var(--c)) drop-shadow(0 6px 5px rgba(0,0,0,.9))}
.an-rule{display:flex;align-items:center;gap:18px;margin-top:6px;color:var(--c2)}
.an-rule span{width:min(18vw,200px);height:1px;background:linear-gradient(90deg,transparent,var(--c))}.an-rule span:last-child{background:linear-gradient(90deg,var(--c),transparent)}
.an-rule i{width:10px;height:10px;border:1px solid var(--c2);transform:rotate(45deg)}
.an-rule b{font-weight:600;font-size:clamp(14px,2.2vw,26px);letter-spacing:.4em;margin-right:-.4em;text-transform:uppercase;white-space:nowrap}
@media (prefers-reduced-motion:reduce){
  .an-sh,.an-sig,.an-fl{display:none}
  .an-tr{animation:anFade 1.2s ease both}.an-tx{animation:none;opacity:1}
  .an-bn .an-band{animation:anFade 1.6s ease both;transform:rotate(-5deg)}
}
@keyframes anFade{0%{opacity:0}18%{opacity:1}80%{opacity:1}100%{opacity:0}}`;
  document.head.append(css);

  const SIGILO = c => `<svg class="an-sig" viewBox="-100 -100 200 200" aria-hidden="true"><g fill="none" stroke="${c}" stroke-width="1.6"><circle r="92"/><circle r="84" stroke-width="1" stroke-dasharray="2 5"/><circle r="62"/><path d="M-30 -42H30L0 0 30 42H-30L0 0Z"/><path d="M0 -92V-62M0 62V92M-65 -65L-44 -44M65 65L44 44M65 -65L44 -44M-65 65L-44 44"/></g></svg>`;
  const mk = (cls, html, vars) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); d.innerHTML = html; for (const [k, v] of Object.entries(vars)) d.style.setProperty(k, v); document.body.append(d); return d; };
  const J = n => (Math.random() - .5) * n;

  let tomado = 0; // até quando a transição de entrada ocupa a tela; faixas esperam
  function transicao(chefe) { // estilhaço: o palco "racha" em cunhas que se afastam, relâmpago de sigilo e o título no meio
    const t = tema(), ms = 1450;
    // cunhas a partir de um centro levemente deslocado até 8 pontos do perímetro (cantos inclusos), cada uma voa para fora
    const cx = 50 + J(8), cy = 50 + J(8), per = [[0, 0], [50 + J(20), 0], [100, 0], [100, 50 + J(20)], [100, 100], [50 + J(20), 100], [0, 100], [0, 50 + J(20)]];
    const cunhas = calmo() ? '' : per.map((p, i) => {
      const q = per[(i + 1) % per.length], mx = (p[0] + q[0]) / 2 - 50, my = (p[1] + q[1]) / 2 - 50, n = Math.hypot(mx, my) || 1, d = 55 + Math.random() * 40;
      return `<i class="an-sh" style="clip-path:polygon(${cx}% ${cy}%,${p[0]}% ${p[1]}%,${q[0]}% ${q[1]}%);--tx:${(mx / n * d).toFixed(1)}vw;--ty:${(my / n * d).toFixed(1)}vh;--r:${(J(26)).toFixed(1)}deg;animation-delay:${(i % 3) * 25}ms"></i>`;
    }).join('');
    const el = mk('an-tr', `${cunhas}<div class="an-fl"></div>${SIGILO(t.c2)}<div class="an-tx">${chefe ? 'CHEFE' : 'BATALHA'}</div>`, { '--c': t.c, '--c2': t.c2, '--g': grad(t.c) });
    tomado = performance.now() + ms; setTimeout(() => el.remove(), ms + 100);
  }

  // fila de faixas: uma de cada vez, esperando a transição de entrada acabar
  const fila = []; let rodando = false;
  function proximo() {
    if (rodando) return;
    const espera = tomado - performance.now(); if (espera > 0) return void setTimeout(proximo, espera);
    const it = fila.shift(); if (!it) return;
    rodando = true;
    const c = it.cor || tema().c, c2 = `color-mix(in srgb,${c} 45%,#fff)`;
    const el = mk(`an-bn an-t-${it.tipo || 'info'}`, `<div class="an-band"><div class="an-bt"></div><div class="an-rule"><span></span><i></i><b></b><i></i><span></span></div></div>`, { '--c': c, '--c2': c2, '--g': grad(c) });
    el.querySelector('.an-bt').textContent = it.texto;
    const sub = el.querySelector('.an-rule'); if (it.sub) sub.querySelector('b').textContent = it.sub; else sub.style.display = 'none';
    setTimeout(() => { el.remove(); rodando = false; proximo(); }, 1650);
  }
  // anuncio(texto, { sub, cor, tipo }): enfileira uma faixa diagonal; global para o resto do código poder usar
  window.anuncio = (texto, o = {}) => { if (!texto) return; fila.push({ texto: String(texto), ...o }); proximo(); };

  // ---- detecção por diferença de estado (a cada render; o redesenho da mesa passa por aqui) ----
  let ant = null;
  const quieto = () => !!S?.paused;
  function olha() {
    const B = S?.battle; if (!B || !S.chars) return;
    const ativa = !!B.active, atual = ativa ? S.chars[timeline(1)[0]] : null;
    const hp = {}; if (ativa) for (const c of Object.values(S.chars)) if (!c.enemy && c.id in (B.ticks || {})) hp[c.id] = c.hp;
    const agora = { ativa, dom: !!B.dom, fim: B.end || '', cur: atual?.id ?? null, hp };
    const antes = ant; ant = agora;
    if (!antes || quieto()) return; // primeira leitura e pausa: só registra
    if (ativa && !antes.ativa) {
      const chefe = Object.values(S.chars).some(c => c.enemy && c.boss && c.id in B.ticks && c.hp > 0);
      transicao(chefe);
    }
    if (agora.dom && !antes.dom) anuncio(tema().para ? 'Ritual!' : 'Domínio!', { sub: B.dom.name, tipo: 'dom' });
    if (agora.fim === 'won' && antes.fim !== 'won') anuncio('Vitória', { tipo: 'win' });
    for (const [id, v] of Object.entries(hp)) if (antes.hp[id] > 0 && v <= 0) anuncio('Caído', { sub: S.chars[id].name, cor: '#e4263a', tipo: 'ko' });
    if (atual && atual.id !== antes.cur && atual.enemy && atual.boss && ativa && antes.ativa) setTimeout(() => { if (!quieto()) anuncio('Turno do Chefe', { sub: atual.name, tipo: 'boss' }); }, 900);
  }
  const render4 = render; render = function () { render4(); try { olha(); } catch (e) { console.error(e); } };
}

// Extras: janelas Campanha e Som (mestre), ferramentas do mapa e o som em todas as telas (trilha, ambiência, efeitos).
WIN.camp = ['Campanha', 460]; WIN.som = ['Som', 420];
wins.camp ??= { x: 380, y: 90, open: false }; wins.som ??= { x: 420, y: 120, open: false };
// o programa abre o painel do mestre com a chave depois do # (não vai ao servidor); guarda e limpa a barra
if (gm) { const k = new URLSearchParams(location.hash.slice(1)).get('k'); if (k) { ls('vj_key', key = k); history.replaceState(null, '', location.pathname); } }

// ===== arquivos: exportar, importar e diário (só o mestre, com a chave) =====
const apiH = () => ({ 'X-VJ-Key': encodeURIComponent(key) });
const fname = s => String(s || 'campanha').normalize('NFD').replace(/[^\w -]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'campanha';
const download = (url, file) => fetch(url, { headers: apiH() }).then(r => r.ok ? r.blob() : Promise.reject()).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = file; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }).catch(() => toast('Não consegui baixar o arquivo.', 'no'));
const bkLabel = f => { const m = /^state-(\d{4})-(\d\d)-(\d\d)T(\d\d)-(\d\d)-\d\d-\d+Z-?(.*)\.json$/.exec(f); if (!m) return f;
  return new Date(Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5])).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (m[6] ? ' · ' + m[6].replace(/-/g, ' ') : ''); };

function campWin() {
  const st = S.store || { camps: [], backups: [] };
  return `<h4>Campanha atual</h4><div class="row"><input data-x="campName" value="${esc(S.title)}" aria-label="Nome da campanha"><button data-a="campSave" title="Grava a campanha atual na lista abaixo">Guardar</button></div>
    <div class="row"><button data-x="campNew">Nova campanha</button><button data-x="export" data-k="campanha">Exportar arquivo</button><label class="up">Importar arquivo<input type="file" accept=".json,application/json" data-x="import" data-k="campanha"></label></div>
    <h4>Campanhas guardadas</h4>${st.camps.map(n => `<div class="row xrow"><b>${esc(n)}</b><button data-x="campLoad" data-id="${esc(n)}">Abrir</button><button data-x="campDel" data-id="${esc(n)}" aria-label="Apagar ${esc(n)}">×</button></div>`).join('') || '<small>Nenhuma ainda. "Guardar" grava a campanha atual aqui; as contas dos jogadores valem para todas.</small>'}
    <h4>Diário</h4><div class="row"><button data-x="sessMark">Marcar início de sessão</button><button data-x="diario">Abrir diário</button><button data-x="diario" data-k="baixar">Baixar</button></div><small>Tudo o que aparece no histórico público fica guardado, sem limite de linhas.</small>
    <h4>Conteúdo</h4><div class="row"><button data-x="export" data-k="conteudo">Exportar pacote</button><label class="up">Importar pacote<input type="file" accept=".json,application/json" data-x="import" data-k="conteudo"></label></div><small>Skills, itens, bestiário e encontros num arquivo. Ao importar, o que tem o mesmo nome é atualizado e o resto é somado.</small>
    <h4>Cópias de segurança</h4><div class="row"><button data-a="bkNow">Copiar agora</button><small>Automática a cada 10 min e antes de trocar de campanha.</small></div>
    <div class="bklist">${st.backups.slice(0, 15).map(f => `<div class="row xrow"><small>${esc(bkLabel(f))}</small><button data-x="bkRestore" data-id="${esc(f)}">Restaurar</button></div>`).join('') || '<small>Nenhuma cópia ainda.</small>'}</div>`;
}

// ===== som: janela do mestre =====
const AMBL = { chuva: 'Chuva', vento: 'Vento', fogueira: 'Fogueira', caverna: 'Caverna', mar: 'Mar', multidao: 'Multidão' };
const SFXL = { sino: 'Sino', trovao: 'Trovão', porta: 'Porta', grito: 'Grito', fanfarra: 'Fanfarra', tensao: 'Tensão', moeda: 'Moedas', passos: 'Passos' };
function somWin() {
  const A = S.audio || {}, sc = S.scenes[S.scene], on = v => v ? 'class="own"' : '';
  return `<h4>Trilha</h4><div class="row"><input data-x="audUrl" placeholder="Link de um áudio (MP3, OGG…)" value="${esc(A.url)}" aria-label="Link da trilha"><label class="up">Enviar áudio<input type="file" accept="audio/*" data-x="audUp"></label></div>
    <div class="row"><button data-a="audio" data-f="on" data-v="${A.on ? '' : 1}" ${on(A.on)} ${A.url ? '' : 'disabled'}>${A.on ? 'Pausar' : 'Tocar'}</button><button data-a="audio" data-f="loop" data-v="${A.loop ? '' : 1}" ${on(A.loop)}>Repetir</button><label>Volume da mesa <input type="range" min="0" max="1" step="0.05" data-x="audVol" value="${+A.vol || 0}"></label></div>
    <div class="row">${A.url ? `<button data-x="trackAdd">Guardar na lista</button><button data-a="map" data-f="music" data-v="${esc(A.url)}" ${on(sc.music === A.url)} title="Esta música começa sozinha quando você entra nesta cena">Trilha desta cena</button>` : ''}${sc.music ? '<button data-a="map" data-f="music" data-v="">Cena sem trilha</button>' : ''}</div>
    <div class="row chips">${chips(S.tracks || {}, (id, t) => `<span class="${t.url === A.url ? 'weak' : ''}" data-a="audio" data-f="url" data-v="${esc(t.url)}">${esc(t.name)}</span><span data-a="trackDel" data-id="${id}" title="Tirar ${esc(t.name)} da lista">×</span>`) || '<small>Lista vazia: envie um arquivo ou cole um link e clique em "Guardar na lista".</small>'}</div>
    <h4>Ambiência</h4><div class="row chips"><span class="${A.amb ? '' : 'weak'}" data-a="audio" data-f="amb" data-v="">Nenhuma</span>${chips(AMBL, (k, l) => `<span class="${A.amb === k ? 'weak' : ''}" data-a="audio" data-f="amb" data-v="${k}">${l}</span>`)}</div>
    <h4>Efeitos</h4><div class="row">${chips(SFXL, (k, l) => `<button data-a="sfx" data-k="${k}">${l}</button>`)}</div><small>Todos ouvem ao mesmo tempo. Cada pessoa ajusta ou silencia o próprio volume no canto da tela.</small>`;
}
const xWins = () => ({ camp: wins.camp.open ? campWin() : '', som: wins.som.open ? somWin() : '' });

// ===== mapa: linhas extras da janela Cena e marcadores =====
let fogR = 1;
const hand = { text: '', img: '' }; let handSeen = 0;
const xCena = sc => `<h4>Mostrar a todos</h4><div class="row"><input data-hand="text" placeholder="Texto: carta, pista, legenda…" aria-label="Texto para mostrar a todos" value="${esc(hand.text)}"></div>
  <div class="row"><input data-hand="img" placeholder="Link de uma imagem (opcional)" aria-label="Imagem para mostrar a todos" value="${esc(hand.img)}"><label class="up">Enviar imagem<input type="file" accept="image/*" data-up="hand"></label></div>
  <div class="row"><button class="own" data-x="handGo" title="Abre a imagem e o texto na tela de cada jogador e na mesa">Mostrar</button>${S.handout ? '<button data-x="handOff">Recolher</button><small>Aberto nas telas dos jogadores.</small>' : ''}</div>
  <h4>Névoa e grade</h4><div class="row">${sc.fogOn ? `<button data-a="fogAll" data-v="1">Revelar tudo</button><button data-a="fogAll" data-v="">Esconder tudo</button><label>Pincel <select data-x="fogR">${[0, 1, 2, 3].map(r => `<option value="${r}" ${r === fogR ? 'selected' : ''}>${2 * r + 1}×${2 * r + 1}</option>`).join('')}</select></label>` : ''}</div>
  <div class="row"><button data-a="map" data-f="grid" data-v="${sc.grid === false ? 1 : ''}" class="${sc.grid === false ? '' : 'own'}">Grade visível</button><label>Metros por casa <input type="number" min="0" max="1000" step="0.5" data-map="unit" value="${+sc.unit || 0}"></label></div>
  <small>Régua: Alt+arrastar (segure Shift para medir área). Marcador: Ctrl+clique no mapa (Ctrl+Shift+clique: só você vê).</small>`;
const handoutHtml = () => { const h = S.handout; if (!h || gm) return '';
  if (role === 'player' && handSeen === h.n) return '<button class="handchip" data-x="handShow">Ver o que o mestre mostrou</button>';
  return `<div class="handout" role="dialog" aria-label="O mestre mostra"><figure><small>O mestre mostra</small>${h.img ? `<img src="${esc(h.img)}" alt="">` : ''}${h.text ? `<figcaption>${esc(h.text)}</figcaption>` : ''}${role === 'player' ? '<button class="own" data-x="handX">Fechar</button>' : ''}</figure></div>`; };
const xPins = m => Object.entries(m.pins || {}).map(([id, p]) => `<i class="pin ${p.gm ? 'gmo' : ''}" style="--x:${+p.x + m.ox};--y:${+p.y + m.oy}" ${gm ? `data-x="pinDel" data-id="${id}" title="Clique para apagar"` : ''}><b>${esc(p.text)}</b></i>`).join('');
const dist = (n, sc) => `${n} ${n === 1 ? 'casa' : 'casas'}${sc.unit ? ` · ${Math.round(n * sc.unit * 10) / 10} m` : ''}`;

// ===== motor de som (todas as telas) =====
const snd = { vol: ls('vj_vol') === '' ? .8 : +ls('vj_vol'), mute: ls('vj_mute') === '1', n: -1, ctx: null, amb: null, ambK: '', blocked: false, seen: -1 };
const music = new Audio(); music.preload = 'auto';
const actxGet = () => snd.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
const level = () => snd.mute ? 0 : snd.vol * (S?.audio?.vol ?? 1);
const tone = (f, dur, { type = 'sine', g = .3, to = 0, delay = 0 } = {}) => {
  const c = actxGet(), o = c.createOscillator(), gg = c.createGain(), t = c.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  gg.gain.setValueAtTime(Math.max(.0002, g * level()), t); gg.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(gg).connect(c.destination); o.start(t); o.stop(t + dur + .05);
};
let noiseBuf = null;
const noise = c => { if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
const thud = (dur, f, g = .4, type = 'lowpass', delay = 0) => { // estalo de ruído filtrado
  const c = actxGet(), s = noise(c), fl = c.createBiquadFilter(), gg = c.createGain(), t = c.currentTime + delay;
  fl.type = type; fl.frequency.value = f; gg.gain.setValueAtTime(Math.max(.0002, g * level()), t); gg.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(fl).connect(gg).connect(c.destination); s.start(t); s.stop(t + dur + .05);
};
const SFXP = {
  sino: () => { tone(880, 1.8, { g: .25 }); tone(1320, 1.3, { g: .12 }); tone(2640, .8, { g: .05 }); },
  trovao: () => { thud(2.4, 170, .9); thud(.35, 2400, .3); },
  porta: () => { thud(.12, 320, .8); tone(90, .25, { type: 'square', g: .15 }); thud(.1, 300, .6, 'lowpass', .38); },
  grito: () => { tone(720, .9, { type: 'sawtooth', to: 280, g: .18 }); tone(735, .9, { type: 'sawtooth', to: 300, g: .12 }); },
  fanfarra: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? .7 : .3, { type: 'triangle', delay: i * .14, g: .25 })),
  tensao: () => { tone(110, 2.6, { type: 'sawtooth', g: .1 }); tone(116.5, 2.6, { type: 'sawtooth', g: .1 }); },
  moeda: () => { tone(1568, .08, { type: 'square', g: .12 }); tone(2093, .35, { type: 'square', g: .12, delay: .08 }); },
  passos: () => [0, .28, .56, .84].forEach(d => thud(.07, 480, .5, 'lowpass', d)),
  hit: () => { thud(.12, 900, .45); tone(160, .12, { type: 'square', to: 60, g: .15 }); },
  crit: () => { thud(.28, 1700, .7); tone(220, .32, { type: 'sawtooth', to: 50, g: .25 }); },
  miss: () => thud(.16, 3000, .14, 'highpass'),
  heal: () => [660, 880, 1320].forEach((f, i) => tone(f, .32, { delay: i * .09, g: .12 })),
};
const playSfx = k => { if (snd.mute || !SFXP[k]) return; try { SFXP[k](); } catch {} };
// ambiência sintetizada (ruído filtrado), sem arquivos
const AMBP = { chuva: { type: 'highpass', f: 1300, g: .2 }, vento: { type: 'bandpass', f: 420, q: .6, g: .4, lfo: .13, depth: 240 }, fogueira: { type: 'lowpass', f: 650, g: .3, crack: 1 },
  caverna: { type: 'lowpass', f: 150, g: .5, drone: 55 }, mar: { type: 'lowpass', f: 520, g: .4, swell: .09 }, multidao: { type: 'bandpass', f: 900, q: .8, g: .2, swell: .31 } };
function makeAmb(p) {
  const c = actxGet(), src = noise(c), f = c.createBiquadFilter(), g = c.createGain(), out = c.createGain(), nodes = [src];
  f.type = p.type; f.frequency.value = p.f; f.Q.value = p.q || .7; g.gain.value = p.g; out.gain.value = 0;
  src.connect(f).connect(g).connect(out).connect(c.destination);
  const lfo = (rate, param, depth) => { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = rate; og.gain.value = depth; o.connect(og).connect(param); o.start(); nodes.push(o); };
  if (p.lfo) lfo(p.lfo, f.frequency, p.depth); if (p.swell) lfo(p.swell, g.gain, p.g * .6);
  if (p.drone) { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = p.drone; og.gain.value = .12; o.connect(og).connect(out); o.start(); nodes.push(o); }
  const t = p.crack ? setInterval(() => { if (!snd.mute && Math.random() < .45) thud(.03, 2500 + Math.random() * 2500, .12, 'highpass'); }, 170) : null;
  src.start();
  return { out, stop() { clearInterval(t); nodes.forEach(n => { try { n.stop(); } catch {} }); out.disconnect(); } };
}
function syncAudio() { // acompanha o que o mestre pôs para tocar; quem entra depois cai no mesmo ponto da música
  const A = S?.audio; if (!A) return;
  const v = level(); music.volume = Math.min(1, v); music.loop = !!A.loop;
  if (A.n !== snd.n) {
    snd.n = A.n;
    if (!A.on || !A.url) music.pause();
    else {
      if (music.dataset.u !== A.url) { music.src = A.url; music.dataset.u = A.url; }
      const go = () => { const el = Math.max(0, (Date.now() - A.t0) / 1000), d = music.duration;
        if (isFinite(d) && d > 0) { if (!A.loop && el >= d) return; music.currentTime = A.loop ? el % d : el; }
        music.play().catch(() => { snd.blocked = true; drawSnd(); }); };
      if (music.readyState >= 1) go(); else music.addEventListener('loadedmetadata', go, { once: true });
    }
  }
  if ((A.amb || '') !== snd.ambK) { snd.amb?.stop(); snd.amb = null; snd.ambK = A.amb || ''; if (AMBP[snd.ambK]) { try { snd.amb = makeAmb(AMBP[snd.ambK]); if (actxGet().state !== 'running') { snd.blocked = true; drawSnd(); } } catch {} } }
  if (snd.amb) snd.amb.out.gain.value = v;
}
function sfxFromLog() { // golpes, críticos, erros e curas do histórico viram som (só os novos)
  if (snd.seen < 0) { snd.seen = S.seq; return; }
  const fresh = S.log.filter(l => l.n > snd.seen && l.fx).slice(-3); snd.seen = S.seq;
  void fresh; // o som de cada golpe toca no impacto, junto da animação (coreo.js)
}
// controle de volume de cada pessoa, fora da área redesenhada
const sndBox = document.createElement('div'); sndBox.className = 'sndbox'; document.body.append(sndBox);
function drawSnd() { const A = typeof ANIMFX !== 'undefined' ? ANIMFX.settings : { quality: 'auto', speed: 1, flashes: true }; sndBox.innerHTML = `<button data-s="mute" class="${snd.mute ? '' : 'own'}" title="Liga ou silencia o som só neste aparelho">${snd.mute ? 'Mudo' : 'Som'}</button><input type="range" min="0" max="1" step="0.05" value="${snd.vol}" aria-label="Volume neste aparelho"><select data-s="style" aria-label="Estilo dos efeitos de combate" title="Estilo dos efeitos de combate"><option value="luz" ${A.style !== 'classico' ? 'selected' : ''}>Efeitos: Luminoso</option><option value="classico" ${A.style === 'classico' ? 'selected' : ''}>Efeitos: Clássico</option></select><select data-s="quality" aria-label="Qualidade das animações" title="Qualidade das animações"><option value="auto" ${A.quality === 'auto' ? 'selected' : ''}>FX auto</option><option value="low" ${A.quality === 'low' ? 'selected' : ''}>FX baixo</option><option value="medium" ${A.quality === 'medium' ? 'selected' : ''}>FX médio</option><option value="high" ${A.quality === 'high' ? 'selected' : ''}>FX alto</option></select><select data-s="speed" aria-label="Velocidade das animações" title="Velocidade das animações">${[.5, 1, 1.5, 2].map(v => `<option value="${v}" ${A.speed === v ? 'selected' : ''}>${v}×</option>`).join('')}</select><button data-s="flash" class="${A.flashes ? 'own' : ''}" title="Liga ou reduz flashes">Flash</button>${snd.blocked && !snd.mute ? '<button data-s="go" class="own">Ativar som</button>' : ''}`; }
const unlock = () => { snd.ctx?.resume?.(); if (!snd.blocked) return; snd.blocked = false; if (S?.audio?.on && S.audio.url) music.play().catch(() => {}); drawSnd(); };
sndBox.addEventListener('click', e => { const k = e.target.dataset.s; if (k === 'mute') { snd.mute = !snd.mute; ls('vj_mute', snd.mute ? '1' : null); } else if (k === 'flash' && typeof ANIMFX !== 'undefined') ANIMFX.setFlashes(!ANIMFX.settings.flashes); unlock(); drawSnd(); if (S) syncAudio(); });
sndBox.addEventListener('input', e => { if (e.target.type === 'range') { snd.vol = +e.target.value; ls('vj_vol', String(snd.vol)); if (S) syncAudio(); } });
sndBox.addEventListener('change', e => { const k = e.target.dataset.s; if (typeof ANIMFX === 'undefined') return; if (k === 'quality') ANIMFX.setQuality(e.target.value); if (k === 'style' && ANIMFX.setStyle) ANIMFX.setStyle(e.target.value); if (k === 'speed') ANIMFX.setSpeed(e.target.value); drawSnd(); });
addEventListener('pointerdown', unlock, true);
drawSnd();
{ const render0 = render; render = function () { render0();
  app.querySelectorAll(':scope > .handout, :scope > .handchip').forEach(el => el.remove()); // um redesenho adiado não pode empilhar cópias
  app.insertAdjacentHTML('beforeend', handoutHtml());
  try { syncAudio(); sfxFromLog(); } catch (e) { console.error(e); } }; }
document.addEventListener('input', e => { const k = e.target.dataset?.hand; if (k) hand[k] = e.target.value; });

// ===== cliques e campos próprios destes extras =====
document.addEventListener('change', e => {
  const el = e.target, x = el.dataset?.x; if (!x) return;
  if (x === 'campName') send({ t: 'campName', v: el.value });
  else if (x === 'audUrl') send({ t: 'audio', f: 'url', v: el.value.trim() });
  else if (x === 'audVol') send({ t: 'audio', f: 'vol', v: +el.value });
  else if (x === 'fogR') { fogR = +el.value; el.blur(); }
  else if (x === 'audUp') { const f = el.files[0];
    if (f) fetch('/upload', { method: 'POST', headers: { 'Content-Type': f.type, ...apiH() }, body: f }).then(r => r.ok ? r.text() : Promise.reject())
      .then(u => { send({ t: 'trackAdd', v: u, k: f.name.replace(/\.\w+$/, '') }); send({ t: 'audio', f: 'url', v: u }); }).catch(() => toast('Falha no envio do áudio.', 'no', 'Aceita MP3, OGG, WAV ou M4A de até 40 MB.')); }
  else if (x === 'import') { const f = el.files[0], k = el.dataset.k; el.value = '';
    if (!f) return;
    (k === 'campanha' ? dialog({ title: 'Importar campanha', text: `Abrir a campanha de "${f.name}"? A atual é guardada antes e continua na lista.`, ok: 'Importar' }) : Promise.resolve(true)).then(yes => yes ? f.text() : Promise.reject(new Error('cancelado'))).then(t => fetch('/api/import?what=' + k, { method: 'POST', headers: apiH(), body: t })).then(async r => { if (!r.ok) throw new Error(await r.text()); alert(k === 'campanha' ? 'Campanha importada.' : 'Pacote importado.'); })
      .catch(err => { if (err.message !== 'cancelado') toast('Não foi possível importar', 'no', err.message || ''); }); }
});
document.addEventListener('click', e => {
  if (gm && e.ctrlKey && S && !fogMode) { const mp = e.target.closest('.map'); // marcador novo
    if (mp && !e.target.closest('.tok,.pin')) { addPin(cell(e, mp), e.shiftKey); return; } }
  const el = e.target.closest('[data-x]'), d = el?.dataset; if (!d || el.matches('input,select')) return;
  const ask = (q, def = '') => { const v = prompt(q, def); return v === null ? null : v.trim(); };
  if (d.x === 'campNew') { const v = ask('Nome da nova campanha? (a atual é guardada antes)', 'Nova campanha'); if (v) send({ t: 'campNew', v }); }
  else if (d.x === 'campLoad') { if (confirm(`Abrir "${d.id}"? A campanha atual é guardada antes.`)) send({ t: 'campLoad', id: d.id }); }
  else if (d.x === 'campDel') { if (confirm(`Apagar a campanha guardada "${d.id}"? Não dá para desfazer.`)) send({ t: 'campDel', id: d.id }); }
  else if (d.x === 'bkRestore') { if (confirm('Voltar para esta cópia? O estado atual vira outra cópia antes, então dá para voltar atrás.')) send({ t: 'bkRestore', id: d.id }); }
  else if (d.x === 'sessMark') { const v = ask('Título desta sessão?', 'Sessão de ' + new Date().toLocaleDateString('pt-BR')); if (v) send({ t: 'sessMark', v }); }
  else if (d.x === 'export') download('/api/export?what=' + d.k, `${fname(S.title)}-${d.k}.json`);
  else if (d.x === 'diario') { if (d.k) download('/api/diario', `diario-${fname(S.title)}.txt`); else { const w = window.open('', '_blank'); /* "open" sozinho é a tabela de painéis abertos (nucleo.js), não a função do navegador */ fetch('/api/diario', { headers: apiH() }).then(r => r.ok ? r.text() : Promise.reject()).then(t => { if (w) { w.document.title = 'Diário'; const pre = w.document.createElement('pre'); pre.style.cssText = 'white-space:pre-wrap;font:15px/1.5 Georgia,serif;max-width:820px;margin:24px auto;padding:0 16px'; pre.textContent = t; w.document.body.append(pre); } }).catch(() => { w?.close(); alert('Não consegui abrir o diário.'); }); } }
  else if (d.x === 'trackAdd') { const v = ask('Nome da faixa?', 'Faixa'); if (v) send({ t: 'trackAdd', v: S.audio.url, k: v }); }
  else if (d.x === 'handGo') { if (!hand.text.trim() && !hand.img.trim()) return toast('Escreva um texto ou escolha uma imagem.', 'no'); send({ t: 'handout', text: hand.text, img: hand.img.trim() }); }
  else if (d.x === 'handOff') send({ t: 'handout' });
  else if (d.x === 'handX') { handSeen = S.handout?.n || 0; render(); }
  else if (d.x === 'handShow') { handSeen = 0; render(); }
  else if (d.x === 'pinDel') { if (!e.ctrlKey && confirm('Apagar este marcador?')) send({ t: 'pinDel', id: d.id }); }
});
